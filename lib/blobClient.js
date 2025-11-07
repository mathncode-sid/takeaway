import fs from 'fs'
import { join } from 'path'

let usingVercel = false
let vercelBlob = null

// Detect if running on Vercel
const isVercelEnvironment = process.env.VERCEL || process.env.VERCEL_URL

// Try to detect token and load @vercel/blob lazily
if (process.env.BLOB_READ_WRITE_TOKEN) {
  try {
    // dynamic import inside try - no top-level await
    // We'll load when needed via loadVercel
  } catch (err) {
    console.warn('Could not prepare @vercel/blob import:', err.message)
  }
}

const LOCAL_DIR = join(process.cwd(), 'local_blob')
// Only create local directory if NOT on Vercel (filesystem is read-only on Vercel)
if (!isVercelEnvironment && !fs.existsSync(LOCAL_DIR)) {
  fs.mkdirSync(LOCAL_DIR, { recursive: true })
}

async function ensureVercelLoaded() {
  if (vercelBlob || !process.env.BLOB_READ_WRITE_TOKEN) return
  try {
    vercelBlob = await import('@vercel/blob')
    usingVercel = true
  } catch (err) {
    console.warn('Could not load @vercel/blob, falling back to local storage:', err.message)
    usingVercel = false
  }
}

export async function listBlobs() {
  await ensureVercelLoaded()
  if (usingVercel && vercelBlob && vercelBlob.list) {
    return vercelBlob.list()
  }

  // On Vercel without token? Fail
  if (isVercelEnvironment) {
    throw new Error('BLOB_READ_WRITE_TOKEN not configured for Vercel deployment')
  }

  // Local fallback: list files under local_blob
  const files = fs.readdirSync(LOCAL_DIR, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => {
      const full = join(LOCAL_DIR, d.name)
      const stat = fs.statSync(full)
      return {
        pathname: d.name,
        url: `/local_blob/${d.name}`,
        size: stat.size,
        uploadedAt: stat.mtime.toISOString(),
      }
    })

  return { blobs: files }
}

export async function putBlob(name, data, opts = {}) {
  await ensureVercelLoaded()
  if (usingVercel && vercelBlob && vercelBlob.put) {
    // Piping options through; the SDK will use env token
    return vercelBlob.put(name, data, opts)
  }

  // On Vercel without token? Fail
  if (isVercelEnvironment) {
    throw new Error('BLOB_READ_WRITE_TOKEN not configured for Vercel deployment')
  }

  // Local fallback: write buffer/string to local_blob
  const outPath = join(LOCAL_DIR, name)

  let buffer
  if (Buffer.isBuffer(data)) buffer = data
  else if (typeof data === 'string') buffer = Buffer.from(data)
  else if (data instanceof Blob) {
    // Convert Blob to Buffer
    const arr = await data.arrayBuffer()
    buffer = Buffer.from(arr)
  } else if (data && data.buffer) {
    buffer = Buffer.from(data.buffer)
  } else {
    buffer = Buffer.from(JSON.stringify(data))
  }

  // ensure parent dir
  const dir = join(outPath, '..')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(outPath, buffer)

  return {
    url: `/local_blob/${name}`,
    size: buffer.length,
    pathname: name,
  }
}

export function isUsingVercel() {
  return usingVercel && process.env.BLOB_READ_WRITE_TOKEN
}
