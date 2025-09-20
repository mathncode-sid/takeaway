const express = require("express")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const crypto = require("crypto")
const aiSummaryGenerator = require("./lib/aiSummaryGenerator")

const app = express()
const PORT = process.env.PORT || 3001

const JWT_SECRET = process.env.JWT_SECRET || "takeaway-secret-key-change-in-production"

const EVENT_CONFIG = {
  id: "default-event",
  name: "Default Event",
  startDate: new Date().toISOString(), // Event starts now by default
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Event ends in 7 days
  isActive: true,
  shareableLink: null, // Will be generated when needed
}

// Load event config from file if it exists
const eventConfigPath = path.join(__dirname, "event-config.json")
let currentEvent = EVENT_CONFIG
if (fs.existsSync(eventConfigPath)) {
  try {
    currentEvent = JSON.parse(fs.readFileSync(eventConfigPath, "utf8"))
  } catch (error) {
    console.warn("Could not load event config, using defaults")
  }
}

const SPEAKERS = [
  {
    id: "speaker1",
    username: "speaker",
    password: "$2b$10$8K1p/a0drtIzwqh4Nq8.6.tgdXvKDqRr8p8VGy9Rvx8rQqGhU8jW2", // "password123"
    name: "Event Speaker",
  },
]

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static("public"))

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: "Access token required" })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" })
    }
    req.user = user
    next()
  })
}

const checkEventAccess = (req, res, next) => {
  const now = new Date()
  const eventStart = new Date(currentEvent.startDate)
  const eventEnd = new Date(currentEvent.endDate)

  if (!currentEvent.isActive) {
    return res.status(403).json({
      error: "Event is not active",
      eventStatus: "inactive",
    })
  }

  if (now < eventStart) {
    return res.status(403).json({
      error: "Event has not started yet",
      eventStatus: "not-started",
      startDate: currentEvent.startDate,
    })
  }

  if (now > eventEnd) {
    return res.status(403).json({
      error: "Event has ended",
      eventStatus: "ended",
      endDate: currentEvent.endDate,
    })
  }

  next()
}

const validateShareableLink = (req, res, next) => {
  const linkToken = req.query.link || req.params.linkToken

  if (!linkToken) {
    return res.status(400).json({ error: "Shareable link token required" })
  }

  if (!currentEvent.shareableLink || currentEvent.shareableLink !== linkToken) {
    return res.status(403).json({ error: "Invalid or expired shareable link" })
  }

  // Check event timing for shareable link access
  const now = new Date()
  const eventStart = new Date(currentEvent.startDate)
  const eventEnd = new Date(currentEvent.endDate)

  if (!currentEvent.isActive) {
    return res.status(403).json({
      error: "Event is not active",
      eventStatus: "inactive",
    })
  }

  if (now < eventStart) {
    return res.status(403).json({
      error: "Event has not started yet",
      eventStatus: "not-started",
      startDate: currentEvent.startDate,
    })
  }

  if (now > eventEnd) {
    return res.status(403).json({
      error: "Event has ended",
      eventStatus: "ended",
      endDate: currentEvent.endDate,
    })
  }

  next()
}

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/")
  },
  filename: (req, file, cb) => {
    // Keep original filename with timestamp prefix
    const timestamp = Date.now()
    cb(null, `${timestamp}-${file.originalname}`)
  },
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept PDF, PPT, PPTX, and video files
    const allowedTypes = [
      "application/pdf",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "video/mp4",
      "video/avi",
      "video/mov",
      "video/wmv",
    ]

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error("Invalid file type. Only PDF, PPT, and video files are allowed."))
    }
  },
})

// API Routes

app.get("/api/event/status", (req, res) => {
  const now = new Date()
  const eventStart = new Date(currentEvent.startDate)
  const eventEnd = new Date(currentEvent.endDate)

  let status = "active"
  if (!currentEvent.isActive) {
    status = "inactive"
  } else if (now < eventStart) {
    status = "not-started"
  } else if (now > eventEnd) {
    status = "ended"
  }

  res.json({
    event: {
      id: currentEvent.id,
      name: currentEvent.name,
      startDate: currentEvent.startDate,
      endDate: currentEvent.endDate,
      isActive: currentEvent.isActive,
      status,
    },
    currentTime: now.toISOString(),
  })
})

app.post("/api/event/generate-link", authenticateToken, (req, res) => {
  try {
    // Generate a secure random token for the shareable link
    const linkToken = crypto.randomBytes(32).toString("hex")

    currentEvent.shareableLink = linkToken

    // Save updated event config
    fs.writeFileSync(eventConfigPath, JSON.stringify(currentEvent, null, 2))

    const shareableUrl = `${req.protocol}://${req.get("host")}/event/${linkToken}`

    res.json({
      success: true,
      message: "Shareable link generated successfully",
      shareableLink: linkToken,
      shareableUrl: shareableUrl,
      event: {
        name: currentEvent.name,
        startDate: currentEvent.startDate,
        endDate: currentEvent.endDate,
      },
    })
  } catch (error) {
    console.error("Link generation error:", error)
    res.status(500).json({ error: "Failed to generate shareable link" })
  }
})

app.get("/api/event/shareable-link", authenticateToken, (req, res) => {
  if (!currentEvent.shareableLink) {
    return res.status(404).json({ error: "No shareable link generated yet" })
  }

  const shareableUrl = `${req.protocol}://${req.get("host")}/event/${currentEvent.shareableLink}`

  res.json({
    success: true,
    shareableLink: currentEvent.shareableLink,
    shareableUrl: shareableUrl,
    event: {
      name: currentEvent.name,
      startDate: currentEvent.startDate,
      endDate: currentEvent.endDate,
    },
  })
})

app.get("/event/:linkToken", validateShareableLink, (req, res) => {
  // Serve the attendee page with the link token embedded
  const attendeePage = fs.readFileSync(path.join(__dirname, "public", "attendee.html"), "utf8")

  // Inject the link token into the page for API calls
  const modifiedPage = attendeePage.replace(
    '<script src="attendee.js"></script>',
    `<script>window.SHAREABLE_LINK_TOKEN = "${req.params.linkToken}";</script><script src="attendee.js"></script>`,
  )

  res.send(modifiedPage)
})

app.post("/api/event/configure", authenticateToken, (req, res) => {
  try {
    const { name, startDate, endDate, isActive } = req.body

    if (name) currentEvent.name = name
    if (startDate) currentEvent.startDate = startDate
    if (endDate) currentEvent.endDate = endDate
    if (typeof isActive === "boolean") currentEvent.isActive = isActive

    // Validate dates
    if (new Date(currentEvent.startDate) >= new Date(currentEvent.endDate)) {
      return res.status(400).json({ error: "Start date must be before end date" })
    }

    // Save event config
    fs.writeFileSync(eventConfigPath, JSON.stringify(currentEvent, null, 2))

    res.json({
      success: true,
      message: "Event configuration updated",
      event: currentEvent,
    })
  } catch (error) {
    console.error("Event configuration error:", error)
    res.status(500).json({ error: "Failed to update event configuration" })
  }
})

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" })
    }

    const speaker = SPEAKERS.find((s) => s.username === username)
    if (!speaker) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    const validPassword = await bcrypt.compare(password, speaker.password)
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    const token = jwt.sign({ id: speaker.id, username: speaker.username, name: speaker.name }, JWT_SECRET, {
      expiresIn: "24h",
    })

    res.json({
      success: true,
      token,
      user: {
        id: speaker.id,
        username: speaker.username,
        name: speaker.name,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ error: "Login failed" })
  }
})

app.post("/api/auth/verify", authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  })
})

app.post("/api/upload", authenticateToken, upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" })
    }

    const summaryData = aiSummaryGenerator.generateDetailedSummary(req.file.filename, req.file.mimetype, req.file.size)

    const fileInfo = {
      id: Date.now().toString(),
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadDate: new Date().toISOString(),
      uploadedBy: req.user.id, // Track who uploaded the file
      summary: summaryData.summary,
      readingTime: summaryData.readingTime,
      fileType: summaryData.fileType,
      topic: summaryData.topic,
    }

    // Save file metadata (in a real app, this would go to a database)
    const metadataPath = path.join(__dirname, "uploads", `${req.file.filename}.json`)
    fs.writeFileSync(metadataPath, JSON.stringify(fileInfo, null, 2))

    res.json({
      success: true,
      message: "File uploaded successfully",
      file: fileInfo,
    })
  } catch (error) {
    console.error("Upload error:", error)
    res.status(500).json({ error: "Upload failed" })
  }
})

app.get(
  "/api/files",
  (req, res, next) => {
    // Check if this is a shareable link request
    if (req.query.link) {
      return validateShareableLink(req, res, next)
    }
    // Otherwise use normal event access check
    return checkEventAccess(req, res, next)
  },
  (req, res) => {
    try {
      const files = []
      const uploadFiles = fs.readdirSync(uploadsDir)

      uploadFiles.forEach((file) => {
        if (file.endsWith(".json")) {
          const metadataPath = path.join(uploadsDir, file)
          const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"))
          files.push(metadata)
        }
      })

      // Sort by upload date (newest first)
      files.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate))

      res.json(files)
    } catch (error) {
      console.error("Error fetching files:", error)
      res.status(500).json({ error: "Failed to fetch files" })
    }
  },
)

app.get(
  "/api/files/:filename",
  (req, res, next) => {
    // Check if this is a shareable link request
    if (req.query.link) {
      return validateShareableLink(req, res, next)
    }
    // Otherwise use normal event access check
    return checkEventAccess(req, res, next)
  },
  (req, res) => {
    try {
      const filename = req.params.filename

      // Security: Validate filename to prevent directory traversal
      if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
        return res.status(400).json({ error: "Invalid filename" })
      }

      const filePath = path.join(uploadsDir, filename)
      const metadataPath = path.join(uploadsDir, `${filename}.json`)

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" })
      }

      // Get file stats
      const stats = fs.statSync(filePath)
      const fileSize = stats.size

      // Get file metadata if available
      let metadata = null
      if (fs.existsSync(metadataPath)) {
        try {
          metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"))
        } catch (error) {
          console.warn("Could not read metadata for file:", filename)
        }
      }

      // Determine content type
      const ext = path.extname(filename).toLowerCase()
      let contentType = "application/octet-stream"

      const mimeTypes = {
        ".pdf": "application/pdf",
        ".ppt": "application/vnd.ms-powerpoint",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".mp4": "video/mp4",
        ".avi": "video/x-msvideo",
        ".mov": "video/quicktime",
        ".wmv": "video/x-ms-wmv",
      }

      if (mimeTypes[ext]) {
        contentType = mimeTypes[ext]
      } else if (metadata && metadata.mimetype) {
        contentType = metadata.mimetype
      }

      // Set appropriate headers
      const originalName = metadata ? metadata.originalName : filename
      const isDownload = req.query.download === "true"

      if (isDownload) {
        // Force download
        res.setHeader("Content-Disposition", `attachment; filename="${originalName}"`)
      } else {
        // Inline viewing (for PDFs and videos)
        if (contentType.startsWith("video/") || contentType === "application/pdf") {
          res.setHeader("Content-Disposition", `inline; filename="${originalName}"`)
        } else {
          res.setHeader("Content-Disposition", `attachment; filename="${originalName}"`)
        }
      }

      res.setHeader("Content-Type", contentType)
      res.setHeader("Content-Length", fileSize)
      res.setHeader("Accept-Ranges", "bytes")
      res.setHeader("Cache-Control", "public, max-age=31536000") // Cache for 1 year

      // Handle range requests (important for video streaming)
      const range = req.headers.range
      if (range && contentType.startsWith("video/")) {
        const parts = range.replace(/bytes=/, "").split("-")
        const start = Number.parseInt(parts[0], 10)
        const end = parts[1] ? Number.parseInt(parts[1], 10) : fileSize - 1
        const chunksize = end - start + 1

        if (start >= fileSize || end >= fileSize) {
          res.status(416).json({ error: "Range not satisfiable" })
          return
        }

        res.status(206) // Partial Content
        res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`)
        res.setHeader("Content-Length", chunksize)

        const stream = fs.createReadStream(filePath, { start, end })
        stream.pipe(res)
      } else {
        // Send entire file
        res.sendFile(path.resolve(filePath))
      }
    } catch (error) {
      console.error("Error serving file:", error)
      res.status(500).json({ error: "Failed to serve file" })
    }
  },
)

app.get(
  "/api/files/:filename/info",
  (req, res, next) => {
    // Check if this is a shareable link request
    if (req.query.link) {
      return validateShareableLink(req, res, next)
    }
    // Otherwise use normal event access check
    return checkEventAccess(req, res, next)
  },
  (req, res) => {
    try {
      const filename = req.params.filename

      // Security: Validate filename
      if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
        return res.status(400).json({ error: "Invalid filename" })
      }

      const filePath = path.join(uploadsDir, filename)
      const metadataPath = path.join(uploadsDir, `${filename}.json`)

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" })
      }

      if (!fs.existsSync(metadataPath)) {
        return res.status(404).json({ error: "File metadata not found" })
      }

      const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"))
      res.json(metadata)
    } catch (error) {
      console.error("Error fetching file info:", error)
      res.status(500).json({ error: "Failed to fetch file info" })
    }
  },
)

app.post(
  "/api/files/bulk-download",
  (req, res, next) => {
    // Check if this is a shareable link request
    if (req.query.link) {
      return validateShareableLink(req, res, next)
    }
    // Otherwise use normal event access check
    return checkEventAccess(req, res, next)
  },
  (req, res) => {
    try {
      const { filenames } = req.body

      if (!Array.isArray(filenames) || filenames.length === 0) {
        return res.status(400).json({ error: "Invalid filenames array" })
      }

      // Validate all filenames
      for (const filename of filenames) {
        if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
          return res.status(400).json({ error: `Invalid filename: ${filename}` })
        }
      }

      // Include link token in download URLs if present
      const linkParam = req.query.link ? `&link=${req.query.link}` : ""

      const downloadUrls = filenames.map((filename) => ({
        filename,
        url: `/api/files/${filename}?download=true${linkParam}`,
      }))

      res.json({
        success: true,
        downloads: downloadUrls,
        message: "Use the provided URLs to download individual files",
      })
    } catch (error) {
      console.error("Error processing bulk download:", error)
      res.status(500).json({ error: "Failed to process bulk download" })
    }
  },
)

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large. Maximum size is 50MB." })
    }
  }

  res.status(500).json({ error: error.message || "Internal server error" })
})

app.listen(PORT, () => {
  console.log(`Takeaway server running on http://localhost:${PORT}`)
  console.log(`Upload directory: ${uploadsDir}`)
})
