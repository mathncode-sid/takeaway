const express = require("express")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const cors = require("cors")
const aiSummaryGenerator = require("./lib/aiSummaryGenerator")

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static("public"))

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

// Upload file endpoint
app.post("/api/upload", upload.single("file"), (req, res) => {
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

// Get all uploaded files
app.get("/api/files", (req, res) => {
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
})

app.get("/api/files/:filename", (req, res) => {
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
})

app.get("/api/files/:filename/info", (req, res) => {
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
})

app.post("/api/files/bulk-download", (req, res) => {
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

    // For now, return the list of download URLs
    // In a production app, you might create a ZIP file
    const downloadUrls = filenames.map((filename) => ({
      filename,
      url: `/api/files/${filename}?download=true`,
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
})

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
