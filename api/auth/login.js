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
  // CORS headers - allow the requesting origin and credentials
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
    const { username, password } = body || {}

    if (!username || !password) {
      res.statusCode = 400
      return res.end(JSON.stringify({ error: "Username and password required" }))
    }

    // Temporary in-memory auth matching the original app
    if (username === "speaker" && password === "password123") {
      const user = { id: "speaker1", username: "speaker", name: "Event Speaker" }

      // Set a simple session cookie (not signed). For production, replace with secure session store or JWT.
      const cookieValue = encodeURIComponent(JSON.stringify(user))
      res.setHeader("Set-Cookie", `takeaway_session=${cookieValue}; HttpOnly; Path=/; Max-Age=86400; Secure; SameSite=None`)

      res.statusCode = 200
      res.setHeader("Content-Type", "application/json")
      return res.end(JSON.stringify({ success: true, user }))
    }

    res.statusCode = 401
    res.setHeader("Content-Type", "application/json")
    return res.end(JSON.stringify({ error: "Invalid credentials" }))
  } catch (err) {
    res.statusCode = 500
    res.setHeader("Content-Type", "application/json")
    return res.end(JSON.stringify({ error: "Login failed", detail: err.message }))
  }
}
