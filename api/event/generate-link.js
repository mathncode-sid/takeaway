import { randomBytes } from 'crypto'
import { loadEventConfig, saveEventConfig } from '../lib/eventConfig.js'

function parseCookies(cookieHeader) {
  const out = {}
  if (!cookieHeader) return out
  cookieHeader.split(';').forEach((pair) => {
    const [k, v] = pair.split('=')
    if (!k) return
    out[k.trim()] = decodeURIComponent((v || '').trim())
  })
  return out
}

function isAuthenticated(req) {
  const cookies = parseCookies(req.headers.cookie || '')
  return !!cookies.takeaway_session
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    return res.end()
  }

  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Allow', 'POST')
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

  if (!isAuthenticated(req)) {
    res.statusCode = 401
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ error: 'Authentication required' }))
  }

  try {
    const event = await loadEventConfig()

    const linkToken = randomBytes(32).toString('hex')
    event.shareableLink = linkToken
    await saveEventConfig(event)

    // Build a safe base URL. If host is missing (serverless/platform differences), fall back to VERCEL_URL or https://localhost
    const host = req.headers.host || process.env.VERCEL_URL || 'localhost:3000'
    const scheme = req.headers['x-forwarded-proto'] || 'https'
    const baseUrl = host.startsWith('http') ? host : `${scheme}://${host}`
    const shareableUrl = `${baseUrl}/event/${linkToken}`

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ success: true, shareableLink: linkToken, shareableUrl, event: { name: event.name, startDate: event.startDate, endDate: event.endDate } }))
  } catch (error) {
    console.error('Generate link error:', error)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ error: 'Failed to generate shareable link', detail: error.message }))
  }
}
