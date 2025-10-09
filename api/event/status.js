import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const eventConfigPath = join(process.cwd(), 'event-config.json')
const DEFAULT_EVENT = {
  id: 'default-event',
  name: 'Default Event',
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  isActive: true,
  shareableLink: null,
}

function loadEvent() {
  if (existsSync(eventConfigPath)) {
    try {
      return JSON.parse(readFileSync(eventConfigPath, 'utf8'))
    } catch (err) {
      return DEFAULT_EVENT
    }
  }
  return DEFAULT_EVENT
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

  const currentEvent = loadEvent()
  const now = new Date()
  const eventStart = new Date(currentEvent.startDate)
  const eventEnd = new Date(currentEvent.endDate)

  let status = 'active'
  if (!currentEvent.isActive) status = 'inactive'
  else if (now < eventStart) status = 'not-started'
  else if (now > eventEnd) status = 'ended'

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  return res.end(JSON.stringify({ event: { ...currentEvent, status }, currentTime: now.toISOString() }))
}
