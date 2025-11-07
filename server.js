import express, { json } from "express"
import multer, { memoryStorage, MulterError } from "multer"
import { join } from "path"
import cors from "cors"
import session from "express-session"
import { randomBytes, createHmac } from "crypto"
import { generateDetailedSummary } from "./lib/aiSummaryGenerator.js"
import { listBlobs, putBlob, isUsingVercel } from './lib/blobClient.js'
import { loadEventConfig, saveEventConfig } from './lib/eventConfig.js'
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express()
const PORT = process.env.PORT || 3001
const SESSION_SECRET = process.env.SESSION_SECRET || "takeaway-session-secret"

const SPEAKERS = [
  {
    id: "speaker1",
    username: "speaker",
    password: "password123",
    name: "Event Speaker",
  },
]

let filesMetadata = []
let currentEvent = null

// Load event config on startup
async function initializeEventConfig() {
  currentEvent = await loadEventConfig()
  console.log('Event config loaded:', currentEvent.name)
}

initializeEventConfig().catch(err => {
  console.error('Failed to initialize event config:', err)
})

// Helper functions for signed cookie authentication (works on serverless)
function signData(data) {
  // Sort keys for consistent JSON stringification
  const sortedData = JSON.stringify(data, Object.keys(data).sort())
  const signature = createHmac('sha256', SESSION_SECRET)
    .update(sortedData)
    .digest('hex')
  console.log('Signing data:', sortedData, '-> signature:', signature.substring(0, 10) + '...')
  return `${Buffer.from(sortedData).toString('base64')}.${signature}`
}

function verifySignedData(signedData) {
  if (!signedData) return null
  const [dataB64, signature] = signedData.split('.')
  if (!dataB64 || !signature) {
    console.log('Verify failed: missing dataB64 or signature')
    return null
  }
  
  try {
    const dataStr = Buffer.from(dataB64, 'base64').toString()
    const data = JSON.parse(dataStr)
    
    console.log('Verifying data string:', dataStr)
    
    // Verify signature using the exact string from the cookie
    const expectedSignature = createHmac('sha256', SESSION_SECRET)
      .update(dataStr)
      .digest('hex')
    
    console.log('Expected signature:', expectedSignature.substring(0, 10) + '...')
    console.log('Received signature:', signature.substring(0, 10) + '...')
    console.log('Signatures match:', signature === expectedSignature)
    
    if (signature === expectedSignature) {
      return data
    }
  } catch (err) {
    console.error('Cookie verification failed:', err.message)
  }
  return null
}

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
)
app.use(json())
app.use(express.static(join(__dirname, "public")))

const authenticateSession = (req, res, next) => {
  const cookieHeader = req.headers.cookie
  console.log('Auth check - Cookie header:', cookieHeader)
  
  let authCookie = cookieHeader?.split('; ')
    .find(c => c.startsWith('takeaway_auth='))
    ?.split('=')[1]
  
  // URL decode the cookie value
  if (authCookie) {
    authCookie = decodeURIComponent(authCookie)
  }
  
  console.log('Auth check - Extracted cookie:', authCookie ? 'present' : 'missing')
  
  const userData = verifySignedData(authCookie)
  console.log('Auth check - Verified user:', userData ? userData.username : 'failed')
  
  if (!userData) {
    return res.status(401).json({ error: "Authentication required" })
  }
  
  req.user = userData
  next()
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

const storage = memoryStorage()

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
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

app.post("/api/auth/login", (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" })
    }

    const speaker = SPEAKERS.find((s) => s.username === username && s.password === password)

    if (!speaker) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    const userData = {
      id: speaker.id,
      username: speaker.username,
      name: speaker.name,
    }

    const signedCookie = signData(userData)
    console.log('Login successful - Setting cookie for:', userData.username)
    
    res.setHeader('Set-Cookie', `takeaway_auth=${signedCookie}; HttpOnly; Path=/; Max-Age=${24 * 60 * 60}; SameSite=Lax`)
    
    res.json({
      success: true,
      user: userData,
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ error: "Login failed" })
  }
})

app.post("/api/auth/register", (req, res) => {
  try {
    const { username, password, name } = req.body

    if (!username || !password || !name) {
      return res.status(400).json({ error: "Username, password, and name required" })
    }

    if (SPEAKERS.find((s) => s.username === username)) {
      return res.status(400).json({ error: "Username already exists" })
    }

    const newSpeaker = {
      id: `speaker${SPEAKERS.length + 1}`,
      username,
      password,
      name,
    }

    SPEAKERS.push(newSpeaker)

    const userData = {
      id: newSpeaker.id,
      username: newSpeaker.username,
      name: newSpeaker.name,
    }

    const signedCookie = signData(userData)
    
    res.setHeader('Set-Cookie', `takeaway_auth=${signedCookie}; HttpOnly; Path=/; Max-Age=${24 * 60 * 60}; SameSite=Lax`)

    res.json({
      success: true,
      message: "Registration successful",
      user: userData,
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({ error: "Registration failed" })
  }
})

app.get("/api/auth/verify", authenticateSession, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  })
})

app.post("/api/auth/logout", (req, res) => {
  res.setHeader('Set-Cookie', 'takeaway_auth=; HttpOnly; Path=/; Max-Age=0')
  res.json({ success: true })
})

function getBaseUrl(req) {
  // In production on Vercel, use VERCEL_URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  // In development, use the request host
  return `${req.protocol}://${req.get("host")}`
}

async function loadMetadataFromBlob() {
  try {
    const { blobs } = await listBlobs()
    const metadataBlob = blobs.find((blob) => (blob.pathname || '').includes("metadata.json"))

    if (metadataBlob) {
      const url = metadataBlob.url && metadataBlob.url.startsWith('/') ? `http://localhost:${PORT}${metadataBlob.url}` : metadataBlob.url
      const response = await fetch(url)
      const data = await response.json()
      filesMetadata = data
    }
  } catch (error) {
    console.warn("Could not load metadata from Blob:", error.message)
  }
}

async function saveMetadataToBlob() {
  try {
    const metadataJson = JSON.stringify(filesMetadata, null, 2)
    const blob = new Blob([metadataJson], { type: "application/json" })
    await putBlob("takeaway-metadata.json", blob, { access: "public" })
  } catch (error) {
    console.error("Error saving metadata to Blob:", error)
  }
}

loadMetadataFromBlob()

app.post("/api/event/generate-link", authenticateSession, async (req, res) => {
  try {
    const linkToken = randomBytes(32).toString("hex")
    currentEvent.shareableLink = linkToken
    await saveEventConfig(currentEvent)

    const baseUrl = getBaseUrl(req)
    const shareableUrl = `${baseUrl}/event/${linkToken}`

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
    res.status(500).json({ error: "Failed to generate shareable link", detail: error.message })
  }
})

app.get("/api/event/shareable-link", authenticateSession, (req, res) => {
  if (!currentEvent.shareableLink) {
    return res.status(404).json({ error: "No shareable link generated yet" })
  }

  const baseUrl = getBaseUrl(req)
  const shareableUrl = `${baseUrl}/event/${currentEvent.shareableLink}`

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

app.post("/api/event/configure", authenticateSession, async (req, res) => {
  try {
    const { name, startDate, endDate, isActive } = req.body

    if (name) currentEvent.name = name
    if (startDate) currentEvent.startDate = startDate
    if (endDate) currentEvent.endDate = endDate
    if (typeof isActive === "boolean") currentEvent.isActive = isActive

    if (new Date(currentEvent.startDate) >= new Date(currentEvent.endDate)) {
      return res.status(400).json({ error: "Start date must be before end date" })
    }

    await saveEventConfig(currentEvent)

    res.json({
      success: true,
      message: "Event configuration updated",
      event: currentEvent,
    })
  } catch (error) {
    console.error("Event configuration error:", error)
    res.status(500).json({ error: "Failed to update event configuration", detail: error.message })
  }
})

app.post("/api/upload", authenticateSession, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" })
    }

    // Upload file to Vercel Blob
    const timestamp = Date.now()
    const filename = `${timestamp}-${req.file.originalname}`

    const blob = await putBlob(filename, req.file.buffer, {
      access: "public",
      contentType: req.file.mimetype,
    })

    const summaryData = generateDetailedSummary(
      req.file.originalname,
      req.file.mimetype,
      req.file.size,
    )

    const fileInfo = {
      id: timestamp.toString(),
      originalName: req.file.originalname,
      filename: filename,
      blobUrl: blob.url,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadDate: new Date().toISOString(),
      uploadedBy: req.user.id,
      summary: summaryData.summary,
      readingTime: summaryData.readingTime,
      fileType: summaryData.fileType,
      topic: summaryData.topic,
    }

    filesMetadata.push(fileInfo)
    await saveMetadataToBlob()

    res.json({
      success: true,
      message: "File uploaded successfully",
      file: fileInfo,
    })
  } catch (error) {
    console.error("Upload error:", error)
    res.status(500).json({ error: "Upload failed: " + error.message })
  }
})

app.get(
  "/api/files",
  (req, res, next) => {
    if (req.query.link) {
      return validateShareableLink(req, res, next)
    }
    return checkEventAccess(req, res, next)
  },
  async (req, res) => {
    try {
      // Reload metadata from Blob to get latest
      await loadMetadataFromBlob()

      const sortedFiles = [...filesMetadata].sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate))

      res.json(sortedFiles)
    } catch (error) {
      console.error("Error fetching files:", error)
      res.status(500).json({ error: "Failed to fetch files" })
    }
  },
)

app.get(
  "/api/files/:filename",
  (req, res, next) => {
    if (req.query.link) {
      return validateShareableLink(req, res, next)
    }
    return checkEventAccess(req, res, next)
  },
  async (req, res) => {
    try {
      const filename = req.params.filename

      if (!filename || filename.includes("..")) {
        return res.status(400).json({ error: "Invalid filename" })
      }

      // Find file in metadata
      const fileInfo = filesMetadata.find((f) => f.filename === filename)

      if (!fileInfo) {
        return res.status(404).json({ error: "File not found" })
      }

      // Redirect to Blob URL
      res.redirect(fileInfo.blobUrl)
    } catch (error) {
      console.error("Error serving file:", error)
      res.status(500).json({ error: "Failed to serve file" })
    }
  },
)

app.get(
  "/api/files/:filename/info",
  (req, res, next) => {
    if (req.query.link) {
      return validateShareableLink(req, res, next)
    }
    return checkEventAccess(req, res, next)
  },
  (req, res) => {
    try {
      const filename = req.params.filename

      if (!filename || filename.includes("..")) {
        return res.status(400).json({ error: "Invalid filename" })
      }

      const fileInfo = filesMetadata.find((f) => f.filename === filename)

      if (!fileInfo) {
        return res.status(404).json({ error: "File not found" })
      }

      res.json(fileInfo)
    } catch (error) {
      console.error("Error fetching file info:", error)
      res.status(500).json({ error: "Failed to fetch file info" })
    }
  },
)

app.post(
  "/api/files/bulk-download",
  (req, res, next) => {
    if (req.query.link) {
      return validateShareableLink(req, res, next)
    }
    return checkEventAccess(req, res, next)
  },
  (req, res) => {
    try {
      const { filenames } = req.body

      if (!Array.isArray(filenames) || filenames.length === 0) {
        return res.status(400).json({ error: "Invalid filenames array" })
      }

      const downloadUrls = filenames
        .map((filename) => {
          const fileInfo = filesMetadata.find((f) => f.filename === filename)
          if (!fileInfo) return null

          return {
            filename: fileInfo.originalName,
            url: fileInfo.blobUrl,
          }
        })
        .filter(Boolean)

      res.json({
        success: true,
        downloads: downloadUrls,
        message: "Use the provided URLs to download files",
      })
    } catch (error) {
      console.error("Error processing bulk download:", error)
      res.status(500).json({ error: "Failed to process bulk download" })
    }
  },
)

app.use((error, req, res, next) => {
  if (error instanceof MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large. Maximum size is 50MB." })
    }
  }

  res.status(500).json({ error: error.message || "Internal server error" })
})

// Serve index.html for root route
app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"))
})

// For Vercel serverless deployment
export default app

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Takeaway server running on http://localhost:${PORT}`)
    try {
      console.log(isUsingVercel() ? `Using Vercel Blob for file storage` : `Using local_blob for file storage (no BLOB_READ_WRITE_TOKEN)`)
    } catch (err) {
      console.log(`Using local_blob for file storage (detection failed)`) 
    }
    console.log(`Default speaker credentials: username="speaker", password="password123"`)
  })
}
