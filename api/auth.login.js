export default function handler(req, res) {
  if (req.method !== "POST") {
    const { username, password } = req.body || {}
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" })
    }
    // TODO: Replace with persistent user store
    if (username === "speaker" && password === "password123") {
      return res.status(200).json({
        success: true,
        user: { id: "speaker1", username: "speaker", name: "Event Speaker" },
      })
    }
    return res.status(401).json({ error: "Invalid credentials" })
  }
  res.status(405).json({ error: "Method not allowed" })
}
