import { loadEventConfig } from '../lib/eventConfig.js'

export default async function handler(req, res) {
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

  try {
    const currentEvent = await loadEventConfig()
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
  } catch (error) {
    console.error('Event status error:', error)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ error: 'Failed to get event status', detail: error.message }))
  }
}
