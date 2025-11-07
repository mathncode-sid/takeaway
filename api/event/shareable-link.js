import { loadEventConfig } from '../lib/eventConfig.js'

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

  try {
    const event = await loadEventConfig()

    if (!event.shareableLink) {
      res.statusCode = 404
      res.setHeader('Content-Type', 'application/json')
      return res.end(JSON.stringify({ error: 'No shareable link generated yet' }))
    }

    const host = req.headers.host || process.env.VERCEL_URL || 'localhost:3000'
    const scheme = req.headers['x-forwarded-proto'] || 'https'
    const baseUrl = host.startsWith('http') ? host : `${scheme}://${host}`
    const shareableUrl = `${baseUrl}/event/${event.shareableLink}`

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ success: true, shareableLink: event.shareableLink, shareableUrl, event: { name: event.name, startDate: event.startDate, endDate: event.endDate } }))
  } catch (error) {
    console.error('Shareable link fetch error:', error)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ error: 'Failed to fetch shareable link', detail: error.message }))
  }
}
