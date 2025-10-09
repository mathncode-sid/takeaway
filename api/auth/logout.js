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

  if (req.method !== "POST") {
    res.statusCode = 405
    res.setHeader("Allow", "POST")
    return res.end(JSON.stringify({ error: "Method not allowed" }))
  }

  // Clear the cookie by setting Max-Age=0
  res.setHeader("Set-Cookie", `takeaway_session=deleted; HttpOnly; Path=/; Max-Age=0; Secure; SameSite=None`)
  res.statusCode = 200
  res.setHeader("Content-Type", "application/json")
  return res.end(JSON.stringify({ success: true, message: "Logged out" }))
}
