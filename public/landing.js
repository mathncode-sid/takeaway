// Landing page JavaScript functionality
const API_URL = "/api"

// Modal management
function openSpeakerModal() {
  document.getElementById("speakerModal").style.display = "block"
  document.body.style.overflow = "hidden"
}

function closeSpeakerModal() {
  document.getElementById("speakerModal").style.display = "none"
  document.body.style.overflow = "auto"
}

function openAttendeeModal() {
  document.getElementById("attendeeModal").style.display = "block"
  document.body.style.overflow = "hidden"
}

function closeAttendeeModal() {
  document.getElementById("attendeeModal").style.display = "none"
  document.body.style.overflow = "auto"
}

// Tab switching
function showLogin() {
  document.getElementById("loginForm").style.display = "block"
  document.getElementById("registerForm").style.display = "none"

  // Update tab buttons
  document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"))
  event.target.classList.add("active")
}

function showRegister() {
  document.getElementById("loginForm").style.display = "none"
  document.getElementById("registerForm").style.display = "block"

  // Update tab buttons
  document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"))
  event.target.classList.add("active")
}

// Close modals when clicking outside
window.onclick = (event) => {
  const speakerModal = document.getElementById("speakerModal")
  const attendeeModal = document.getElementById("attendeeModal")

  if (event.target === speakerModal) {
    closeSpeakerModal()
  }
  if (event.target === attendeeModal) {
    closeAttendeeModal()
  }
}

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const username = document.getElementById("loginUsername").value
  const password = document.getElementById("loginPassword").value

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    })

    const result = await response.json()

    if (response.ok && result.success) {
      window.location.href = "/speaker.html"
    } else {
      alert("Login failed: " + (result.error || "Invalid credentials"))
    }
  } catch (error) {
    alert("Login failed: " + error.message)
  }
})

document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const name = document.getElementById("registerName").value
  const username = document.getElementById("registerUsername").value
  const password = document.getElementById("registerPassword").value

  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ name, username, password }),
    })

    const result = await response.json()

    if (response.ok && result.success) {
      // Automatically redirect to speaker page after registration
      window.location.href = "/speaker.html"
    } else {
      alert("Registration failed: " + (result.error || "Unknown error"))
    }
  } catch (error) {
    alert("Registration failed: " + error.message)
  }
})

document.getElementById("attendeeForm").addEventListener("submit", (e) => {
  e.preventDefault()

  const link = document.getElementById("presentationLink").value

  // Extract link token from the URL
  const match = link.match(/\/event\/([a-zA-Z0-9]+)/)
  if (match) {
    const linkToken = match[1]
    window.location.href = `/event/${linkToken}`
  } else {
    alert("Please enter a valid presentation link (e.g., http://localhost:3001/event/abc123...)")
  }
})

// Intersection Observer for feature card animations
document.addEventListener("DOMContentLoaded", () => {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("animate")
      }
    })
  }, observerOptions)

  // Observe all feature cards
  document.querySelectorAll("[data-animate]").forEach((card) => {
    observer.observe(card)
  })
})

// Keyboard navigation for modals
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeSpeakerModal()
    closeAttendeeModal()
  }
})
