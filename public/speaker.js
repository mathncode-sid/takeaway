class SpeakerUpload {
  constructor() {
    this.apiUrl = "http://localhost:3001/api"
    this.selectedFile = null
    this.authToken = localStorage.getItem("speakerToken")
    this.currentUser = null
    this.initializeElements()
    this.attachEventListeners()
    this.checkAuthStatus()
  }

  initializeElements() {
    // Login elements
    this.loginCard = document.getElementById("loginCard")
    this.loginForm = document.getElementById("loginForm")
    this.loginBtn = document.getElementById("loginBtn")
    this.loginBtnText = document.getElementById("loginBtnText")
    this.loginSpinner = document.getElementById("loginSpinner")
    this.loginErrorNotification = document.getElementById("loginErrorNotification")
    this.loginErrorMessage = document.getElementById("loginErrorMessage")

    // Main interface elements
    this.uploadInterface = document.getElementById("uploadInterface")
    this.userDisplayName = document.getElementById("userDisplayName")
    this.logoutBtn = document.getElementById("logoutBtn")

    // Event configuration elements
    this.eventName = document.getElementById("eventName")
    this.eventStatus = document.getElementById("eventStatus")
    this.startDate = document.getElementById("startDate")
    this.endDate = document.getElementById("endDate")
    this.updateEventBtn = document.getElementById("updateEventBtn")

    // Shareable link elements
    this.generateLinkBtn = document.getElementById("generateLinkBtn")
    this.shareableLinkCard = document.getElementById("shareableLinkCard")
    this.shareableLinkUrl = document.getElementById("shareableLinkUrl")
    this.copyLinkBtn = document.getElementById("copyLinkBtn")

    // Upload elements
    this.uploadArea = document.getElementById("uploadArea")
    this.fileInput = document.getElementById("fileInput")
    this.uploadBtn = document.getElementById("uploadBtn")
    this.uploadBtnText = document.getElementById("uploadBtnText")
    this.uploadSpinner = document.getElementById("uploadSpinner")
    this.progressContainer = document.getElementById("progressContainer")
    this.progressBar = document.getElementById("progressBar")
    this.successNotification = document.getElementById("successNotification")
    this.errorNotification = document.getElementById("errorNotification")
    this.errorMessage = document.getElementById("errorMessage")
    this.fileInfo = document.getElementById("fileInfo")
    this.fileName = document.getElementById("fileName")
    this.fileMeta = document.getElementById("fileMeta")
    this.fileSummary = document.getElementById("fileSummary")
  }

  attachEventListeners() {
    // Login form
    this.loginForm.addEventListener("submit", (e) => {
      e.preventDefault()
      this.handleLogin()
    })

    // Logout button
    this.logoutBtn.addEventListener("click", () => {
      this.handleLogout()
    })

    // Event configuration
    this.updateEventBtn.addEventListener("click", () => {
      this.updateEventConfiguration()
    })

    // Shareable link generation
    this.generateLinkBtn.addEventListener("click", () => {
      this.generateShareableLink()
    })

    // Copy link button
    this.copyLinkBtn.addEventListener("click", () => {
      this.copyShareableLink()
    })

    // Upload area click
    this.uploadArea.addEventListener("click", () => {
      this.fileInput.click()
    })

    // File input change
    this.fileInput.addEventListener("change", (e) => {
      this.handleFileSelect(e.target.files[0])
    })

    // Drag and drop
    this.uploadArea.addEventListener("dragover", (e) => {
      e.preventDefault()
      this.uploadArea.classList.add("drag-over")
    })

    this.uploadArea.addEventListener("dragleave", (e) => {
      e.preventDefault()
      this.uploadArea.classList.remove("drag-over")
    })

    this.uploadArea.addEventListener("drop", (e) => {
      e.preventDefault()
      this.uploadArea.classList.remove("drag-over")
      const files = e.dataTransfer.files
      if (files.length > 0) {
        this.handleFileSelect(files[0])
      }
    })

    // Upload button
    this.uploadBtn.addEventListener("click", () => {
      if (this.selectedFile) {
        this.uploadFile()
      }
    })

    // Keyboard accessibility
    this.uploadArea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        this.fileInput.click()
      }
    })
  }

  async checkAuthStatus() {
    if (!this.authToken) {
      this.showLoginForm()
      return
    }

    try {
      const response = await fetch(`${this.apiUrl}/auth/verify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()

      if (response.ok && result.success) {
        this.currentUser = result.user
        this.showUploadInterface()
        this.loadEventConfiguration()
        this.loadShareableLink()
      } else {
        localStorage.removeItem("speakerToken")
        this.authToken = null
        this.showLoginForm()
      }
    } catch (error) {
      console.error("Auth verification error:", error)
      this.showLoginForm()
    }
  }

  async handleLogin() {
    const username = document.getElementById("username").value
    const password = document.getElementById("password").value

    if (!username || !password) {
      this.showLoginError("Please enter both username and password")
      return
    }

    try {
      this.setLoginState(true)

      const response = await fetch(`${this.apiUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        this.authToken = result.token
        this.currentUser = result.user
        localStorage.setItem("speakerToken", this.authToken)
        this.showUploadInterface()
        this.loadEventConfiguration()
        this.loadShareableLink()
      } else {
        this.showLoginError(result.error || "Login failed")
      }
    } catch (error) {
      console.error("Login error:", error)
      this.showLoginError("Login failed. Please try again.")
    } finally {
      this.setLoginState(false)
    }
  }

  handleLogout() {
    localStorage.removeItem("speakerToken")
    this.authToken = null
    this.currentUser = null
    this.showLoginForm()
  }

  setLoginState(isLogging) {
    this.loginBtn.disabled = isLogging
    this.loginSpinner.style.display = isLogging ? "block" : "none"
    this.loginBtnText.textContent = isLogging ? "Logging in..." : "Login"
  }

  showLoginForm() {
    this.loginCard.style.display = "block"
    this.uploadInterface.style.display = "none"
    this.hideLoginError()
  }

  showUploadInterface() {
    this.loginCard.style.display = "none"
    this.uploadInterface.style.display = "block"
    this.userDisplayName.textContent = this.currentUser?.name || "Speaker"
  }

  showLoginError(message) {
    this.loginErrorMessage.textContent = message
    this.loginErrorNotification.style.display = "block"
    setTimeout(() => {
      this.loginErrorNotification.style.display = "none"
    }, 5000)
  }

  hideLoginError() {
    this.loginErrorNotification.style.display = "none"
  }

  async loadEventConfiguration() {
    try {
      const response = await fetch(`${this.apiUrl}/event/status`)
      const result = await response.json()

      if (response.ok && result.event) {
        const event = result.event
        this.eventName.value = event.name || ""
        this.eventStatus.value = event.isActive.toString()

        // Convert ISO dates to datetime-local format
        if (event.startDate) {
          this.startDate.value = new Date(event.startDate).toISOString().slice(0, 16)
        }
        if (event.endDate) {
          this.endDate.value = new Date(event.endDate).toISOString().slice(0, 16)
        }
      }
    } catch (error) {
      console.error("Error loading event configuration:", error)
    }
  }

  async updateEventConfiguration() {
    try {
      const eventData = {
        name: this.eventName.value,
        startDate: new Date(this.startDate.value).toISOString(),
        endDate: new Date(this.endDate.value).toISOString(),
        isActive: this.eventStatus.value === "true",
      }

      const response = await fetch(`${this.apiUrl}/event/configure`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        this.showSuccess("Event configuration updated successfully")
      } else {
        this.showError(result.error || "Failed to update event configuration")
      }
    } catch (error) {
      console.error("Error updating event configuration:", error)
      this.showError("Failed to update event configuration")
    }
  }

  async generateShareableLink() {
    try {
      const response = await fetch(`${this.apiUrl}/event/generate-link`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()

      if (response.ok && result.success) {
        this.shareableLinkUrl.value = result.shareableUrl
        this.shareableLinkCard.style.display = "block"
        this.showSuccess("Shareable link generated successfully")
      } else {
        this.showError(result.error || "Failed to generate shareable link")
      }
    } catch (error) {
      console.error("Error generating shareable link:", error)
      this.showError("Failed to generate shareable link")
    }
  }

  async loadShareableLink() {
    try {
      const response = await fetch(`${this.apiUrl}/event/shareable-link`, {
        headers: {
          Authorization: `Bearer ${this.authToken}`,
        },
      })

      const result = await response.json()

      if (response.ok && result.success) {
        this.shareableLinkUrl.value = result.shareableUrl
        this.shareableLinkCard.style.display = "block"
      }
    } catch (error) {
      // Link doesn't exist yet, that's okay
    }
  }

  copyShareableLink() {
    this.shareableLinkUrl.select()
    document.execCommand("copy")
    this.showSuccess("Link copied to clipboard")
  }

  handleFileSelect(file) {
    if (!file) return

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "video/mp4",
      "video/avi",
      "video/mov",
      "video/wmv",
    ]

    if (!allowedTypes.includes(file.type)) {
      this.showError("Invalid file type. Please select a PDF, PowerPoint, or video file.")
      return
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      this.showError("File too large. Maximum size is 50MB.")
      return
    }

    this.selectedFile = file
    this.updateUploadButton()
    this.hideNotifications()
  }

  updateUploadButton() {
    if (this.selectedFile) {
      this.uploadBtn.disabled = false
      this.uploadBtnText.textContent = `Upload "${this.selectedFile.name}"`
    } else {
      this.uploadBtn.disabled = true
      this.uploadBtnText.textContent = "Select a file to upload"
    }
  }

  async uploadFile() {
    if (!this.selectedFile) return

    const formData = new FormData()
    formData.append("file", this.selectedFile)

    try {
      this.setUploadingState(true)
      this.showProgress()

      const response = await fetch(`${this.apiUrl}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
        },
        body: formData,
      })

      const result = await response.json()

      if (response.ok && result.success) {
        this.showSuccess()
        this.displayFileInfo(result.file)
        this.resetForm()
      } else {
        throw new Error(result.error || "Upload failed")
      }
    } catch (error) {
      console.error("Upload error:", error)
      this.showError(error.message || "Upload failed. Please try again.")
    } finally {
      this.setUploadingState(false)
      this.hideProgress()
    }
  }

  setUploadingState(isUploading) {
    this.uploadBtn.disabled = isUploading
    this.uploadSpinner.style.display = isUploading ? "block" : "none"
    this.uploadBtnText.textContent = isUploading ? "Uploading..." : "Upload File"
  }

  showProgress() {
    this.progressContainer.style.display = "block"
    // Simulate progress for demo purposes
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 30
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
      }
      this.progressBar.style.width = `${progress}%`
    }, 200)
  }

  hideProgress() {
    setTimeout(() => {
      this.progressContainer.style.display = "none"
      this.progressBar.style.width = "0%"
    }, 500)
  }

  showSuccess(message = "Your file has been uploaded successfully.") {
    this.hideNotifications()
    this.successNotification.querySelector("strong").nextSibling.textContent = ` ${message}`
    this.successNotification.style.display = "block"
    setTimeout(() => {
      this.successNotification.style.display = "none"
    }, 5000)
  }

  showError(message) {
    this.hideNotifications()
    this.errorMessage.textContent = message
    this.errorNotification.style.display = "block"
    setTimeout(() => {
      this.errorNotification.style.display = "none"
    }, 5000)
  }

  hideNotifications() {
    this.successNotification.style.display = "none"
    this.errorNotification.style.display = "none"
  }

  displayFileInfo(fileData) {
    this.fileName.textContent = fileData.originalName

    const fileSize = this.formatFileSize(fileData.size)
    const uploadDate = new Date(fileData.uploadDate).toLocaleString()
    this.fileMeta.textContent = `${fileSize} • ${fileData.fileType.toUpperCase()} • ${uploadDate}`

    this.fileSummary.textContent = fileData.summary

    this.fileInfo.style.display = "block"
  }

  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  resetForm() {
    this.selectedFile = null
    this.fileInput.value = ""
    this.updateUploadButton()
  }
}

// Initialize the upload interface when the page loads
document.addEventListener("DOMContentLoaded", () => {
  new SpeakerUpload()
})
