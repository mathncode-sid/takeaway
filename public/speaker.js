class SpeakerUpload {
  constructor() {
    this.apiUrl = "http://localhost:3001/api"
    this.selectedFile = null
    this.initializeElements()
    this.attachEventListeners()
  }

  initializeElements() {
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

  showSuccess() {
    this.hideNotifications()
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
