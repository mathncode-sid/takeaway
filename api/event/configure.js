import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const eventConfigPath = join(process.cwd(), 'event-config.json')

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body) return resolve(req.body)
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => {
      try {
        if (!data) return resolve({})
        resolve(JSON.parse(data))
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

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
    const body = await parseJsonBody(req)
    const { name, startDate, endDate, isActive } = body || {}

    const event = loadEvent() || {
      id: 'default-event',
      name: 'Default Event',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      shareableLink: null,
    }

    if (name) event.name = name
    if (startDate) event.startDate = startDate
    if (endDate) event.endDate = endDate
    if (typeof isActive === 'boolean') event.isActive = isActive

    if (new Date(event.startDate) >= new Date(event.endDate)) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      return res.end(JSON.stringify({ error: 'Start date must be before end date' }))
    }

    saveEvent(event)
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ success: true, event }))
  } catch (err) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ error: 'Failed to update event configuration', detail: err.message }))
  }
}
