import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { randomBytes } from 'crypto'

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

function saveEvent(event) {
  writeFileSync(eventConfigPath, JSON.stringify(event, null, 2))
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

  const event = loadEvent() || {
    id: 'default-event',
    name: 'Default Event',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
    shareableLink: null,
  }

  const linkToken = randomBytes(32).toString('hex')
  event.shareableLink = linkToken
  saveEvent(event)

  const baseUrl = `https://${req.headers.host}`
  const shareableUrl = `${baseUrl}/event/${linkToken}`

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  return res.end(JSON.stringify({ success: true, shareableLink: linkToken, shareableUrl, event: { name: event.name, startDate: event.startDate, endDate: event.endDate } }))
}
