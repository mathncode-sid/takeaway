function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body) return resolve(req.body)
    let data = ""
    req.on("data", (chunk) => {
      data += chunk
    })
    req.on("end", () => {
      try {
        if (!data) return resolve({})
        resolve(JSON.parse(data))
      } catch (err) {
        reject(err)
      }
    })
    req.on("error", reject)
  })
}

export default async function handler(req, res) {
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

  try {
    const body = await parseJsonBody(req)
    const { username, password, name } = body || {}

    if (!username || !password || !name) {
      res.statusCode = 400
      return res.end(JSON.stringify({ error: "Username, password, and name required" }))
    }

    // NOTE: This is an in-memory stub for registration.
    // For production, persist users and hash passwords.
    const user = { id: `speaker-${Date.now()}`, username, name }
    const cookieValue = encodeURIComponent(JSON.stringify(user))
    res.setHeader("Set-Cookie", `takeaway_session=${cookieValue}; HttpOnly; Path=/; Max-Age=86400; Secure; SameSite=None`)

    res.statusCode = 200
    res.setHeader("Content-Type", "application/json")
    return res.end(JSON.stringify({ success: true, user }))
  } catch (err) {
    res.statusCode = 500
    res.setHeader("Content-Type", "application/json")
    return res.end(JSON.stringify({ error: "Registration failed", detail: err.message }))
  }
}
