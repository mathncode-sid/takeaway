function parseCookies(cookieHeader) {
  const out = {}
  if (!cookieHeader) return out
  cookieHeader.split(";").forEach((pair) => {
    const [k, v] = pair.split("=")
    if (!k) return
    out[k.trim()] = decodeURIComponent((v || "").trim())
  })
  return out
}

export default function handler(req, res) {
  // CORS headers
  const origin = req.headers.origin || "*"
  res.setHeader("Access-Control-Allow-Origin", origin)
  res.setHeader("Access-Control-Allow-Credentials", "true")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") {
    res.statusCode = 204
    return res.end()
  }

  if (req.method !== "GET") {
    res.statusCode = 405
    res.setHeader("Allow", "GET")
    return res.end(JSON.stringify({ error: "Method not allowed" }))
  }

  try {
    const cookies = parseCookies(req.headers.cookie || "")
    const raw = cookies.takeaway_session
    if (!raw) {
      res.statusCode = 401
      res.setHeader("Content-Type", "application/json")
      return res.end(JSON.stringify({ error: "Not authenticated" }))
    }

    let user
    try {
      user = JSON.parse(raw)
    } catch (err) {
      res.statusCode = 400
      res.setHeader("Content-Type", "application/json")
      return res.end(JSON.stringify({ error: "Bad session cookie" }))
    }

    res.statusCode = 200
    res.setHeader("Content-Type", "application/json")
    return res.end(JSON.stringify({ success: true, user }))
  } catch (err) {
    res.statusCode = 500
    res.setHeader("Content-Type", "application/json")
    return res.end(JSON.stringify({ error: "Verify failed", detail: err.message }))
  }
}
