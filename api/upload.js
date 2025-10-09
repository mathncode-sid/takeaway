import multer from "multer"
import { put } from "@vercel/blob"
import { generateDetailedSummary } from "../lib/aiSummaryGenerator.js"

const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  upload.single("file")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message })
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" })
    }
    try {
      const timestamp = Date.now()
      const filename = `${timestamp}-${req.file.originalname}`
      const blob = await put(filename, req.file.buffer, {
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
        filename,
        blobUrl: blob.url,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadDate: new Date().toISOString(),
        summary: summaryData.summary,
        readingTime: summaryData.readingTime,
        fileType: summaryData.fileType,
        topic: summaryData.topic,
      }
      // TODO: Save metadata to Blob or DB
      res.status(200).json({ success: true, file: fileInfo })
    } catch (error) {
      res.status(500).json({ error: "Upload failed: " + error.message })
    }
  })
}
