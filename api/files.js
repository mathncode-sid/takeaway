import { listBlobs } from "./lib/blobClient.js"

export default async function handler(req, res) {
  const origin = req.headers.origin || "*"
  res.setHeader("Access-Control-Allow-Origin", origin)
  res.setHeader("Access-Control-Allow-Credentials", "true")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") {
    res.status(204).end()
    return
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }
  try {
    const { blobs } = await listBlobs()
    // Filter and sort as needed
    const files = blobs.map(blob => ({
      filename: blob.pathname,
      url: blob.url,
      size: blob.size,
      uploadDate: blob.uploadedAt,
    }))
    res.status(200).json(files)
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch files" })
  }
}
