import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const eventConfigPath = join(process.cwd(), 'event-config.json')

function loadEvent() {
  if (existsSync(eventConfigPath)) {
    try {
      return JSON.parse(readFileSync(eventConfigPath, 'utf8'))
    } catch (err) {
      return null
    }
  }
  return null
}

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

export default function handler(req, res) {
  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    return res.end()
  }

  if (req.method !== 'GET') {
    res.statusCode = 405
    res.setHeader('Allow', 'GET')
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

  if (!isAuthenticated(req)) {
    res.statusCode = 401
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ error: 'Authentication required' }))
  }

  const event = loadEvent() || { shareableLink: null }

  if (!event.shareableLink) {
    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ error: 'No shareable link generated yet' }))
  }

  const baseUrl = `https://${req.headers.host}`
  const shareableUrl = `${baseUrl}/event/${event.shareableLink}`

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  return res.end(JSON.stringify({ success: true, shareableLink: event.shareableLink, shareableUrl, event: { name: event.name, startDate: event.startDate, endDate: event.endDate } }))
}
