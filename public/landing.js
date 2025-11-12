// Landing page JavaScript functionality
const API_URL = "/api"

// Modal management
function openSpeakerModal() {
  // Navigate to the public speaker upload page
  window.location.href = '/speaker.html'
}

function closeSpeakerModal() {
  // no-op
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
// Login/register UI removed (speaker flows are public)

// Close modals when clicking outside
window.onclick = (event) => {
  const attendeeModal = document.getElementById("attendeeModal")

  if (event.target === attendeeModal) {
    closeAttendeeModal()
  }
}
// Removed login/register handlers

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
