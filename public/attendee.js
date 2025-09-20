class AttendeeView {
  constructor() {
    this.apiUrl = "http://localhost:3001/api"
    this.files = []
    this.filteredFiles = []
    this.shareableLinkToken = window.SHAREABLE_LINK_TOKEN || this.getShareableLinkFromUrl()
    this.isShareableLinkAccess = !!this.shareableLinkToken
    this.initializeElements()
    this.attachEventListeners()
    this.checkEventAccess()
  }

  getShareableLinkFromUrl() {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get("link")
  }

  initializeElements() {
    // Event status elements
    this.eventStatus = document.getElementById("eventStatus")
    this.eventStatusText = document.getElementById("eventStatusText")

    // Access error elements
    this.accessErrorState = document.getElementById("accessErrorState")
    this.accessErrorTitle = document.getElementById("accessErrorTitle")
    this.accessErrorMessage = document.getElementById("accessErrorMessage")
    this.accessErrorActions = document.getElementById("accessErrorActions")

    // Main interface elements
    this.searchFilterCard = document.getElementById("searchFilterCard")
    this.searchInput = document.getElementById("searchInput")
    this.filterSelect = document.getElementById("filterSelect")
    this.refreshBtn = document.getElementById("refreshBtn")
    this.loadingState = document.getElementById("loadingState")
    this.emptyState = document.getElementById("emptyState")
    this.filesGrid = document.getElementById("filesGrid")

    // Navigation elements
    this.speakerLinkContainer = document.getElementById("speakerLinkContainer")
    this.speakerNavContainer = document.getElementById("speakerNavContainer")

    // Modal elements
    this.previewModal = document.getElementById("previewModal")
    this.previewTitle = document.getElementById("previewTitle")
    this.previewContent = document.getElementById("previewContent")
    this.closePreview = document.getElementById("closePreview")

    if (this.isShareableLinkAccess) {
      if (this.speakerLinkContainer) this.speakerLinkContainer.style.display = "none"
      if (this.speakerNavContainer) this.speakerNavContainer.style.display = "none"
    }
  }

  attachEventListeners() {
    // Search functionality
    this.searchInput.addEventListener("input", () => {
      this.filterFiles()
    })

    // Filter functionality
    this.filterSelect.addEventListener("change", () => {
      this.filterFiles()
    })

    // Refresh button
    this.refreshBtn.addEventListener("click", () => {
      this.loadFiles()
    })

    // Modal close
    this.closePreview.addEventListener("click", () => {
      this.closeModal()
    })

    // Close modal on background click
    this.previewModal.addEventListener("click", (e) => {
      if (e.target === this.previewModal) {
        this.closeModal()
      }
    })

    // Close modal on escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.previewModal.style.display !== "none") {
        this.closeModal()
      }
    })
  }

  async checkEventAccess() {
    try {
      // First check event status
      const statusResponse = await fetch(`${this.apiUrl}/event/status`)
      const statusResult = await statusResponse.json()

      if (statusResponse.ok && statusResult.event) {
        this.displayEventStatus(statusResult.event)

        // If event is accessible, load files
        if (statusResult.event.status === "active") {
          this.loadFiles()
        } else {
          this.showAccessError(statusResult.event)
        }
      } else {
        this.showAccessError({ status: "error" })
      }
    } catch (error) {
      console.error("Error checking event access:", error)
      this.showAccessError({ status: "error" })
    }
  }

  displayEventStatus(event) {
    let statusClass = ""
    let statusText = ""

    switch (event.status) {
      case "active":
        statusClass = "background: var(--primary); color: var(--primary-foreground);"
        statusText = `${event.name} - Event Active`
        break
      case "not-started":
        statusClass = "background: var(--muted); color: var(--muted-foreground);"
        statusText = `${event.name} - Starts ${new Date(event.startDate).toLocaleString()}`
        break
      case "ended":
        statusClass = "background: var(--destructive); color: var(--destructive-foreground);"
        statusText = `${event.name} - Event Ended`
        break
      case "inactive":
        statusClass = "background: var(--muted); color: var(--muted-foreground);"
        statusText = `${event.name} - Event Inactive`
        break
    }

    this.eventStatus.style.cssText += statusClass
    this.eventStatusText.textContent = statusText
    this.eventStatus.style.display = "block"
  }

  showAccessError(event) {
    this.hideMainInterface()
    this.accessErrorState.style.display = "block"

    switch (event.status) {
      case "not-started":
        this.accessErrorTitle.textContent = "Event Not Started"
        this.accessErrorMessage.textContent = `This event will begin on ${new Date(event.startDate).toLocaleString()}.`
        this.accessErrorActions.innerHTML = `
          <button type="button" class="btn btn-secondary" onclick="location.reload()">
            Check Again
          </button>
        `
        break
      case "ended":
        this.accessErrorTitle.textContent = "Event Ended"
        this.accessErrorMessage.textContent = `This event ended on ${new Date(event.endDate).toLocaleString()}.`
        this.accessErrorActions.innerHTML = ""
        break
      case "inactive":
        this.accessErrorTitle.textContent = "Event Inactive"
        this.accessErrorMessage.textContent = "This event is currently inactive."
        this.accessErrorActions.innerHTML = ""
        break
      default:
        this.accessErrorTitle.textContent = "Access Error"
        this.accessErrorMessage.textContent = "Unable to access event content at this time."
        this.accessErrorActions.innerHTML = `
          <button type="button" class="btn btn-secondary" onclick="location.reload()">
            Try Again
          </button>
        `
    }
  }

  hideMainInterface() {
    this.searchFilterCard.style.display = "none"
    this.loadingState.style.display = "none"
    this.emptyState.style.display = "none"
    this.filesGrid.style.display = "none"
    document.getElementById("navigationContainer").style.display = "none"
  }

  showMainInterface() {
    this.searchFilterCard.style.display = "block"
    document.getElementById("navigationContainer").style.display = "block"
    this.accessErrorState.style.display = "none"
  }

  async loadFiles() {
    try {
      this.showLoading()
      this.showMainInterface()

      const url = this.shareableLinkToken
        ? `${this.apiUrl}/files?link=${this.shareableLinkToken}`
        : `${this.apiUrl}/files`

      const response = await fetch(url)
      const result = await response.json()

      if (response.ok) {
        this.files = result
        this.filteredFiles = [...result]
        this.renderFiles()
      } else {
        // Handle specific error cases
        if (result.eventStatus) {
          this.showAccessError({ status: result.eventStatus, startDate: result.startDate, endDate: result.endDate })
        } else {
          throw new Error(result.error || "Failed to load files")
        }
      }
    } catch (error) {
      console.error("Error loading files:", error)
      this.showEmpty()
    }
  }

  filterFiles() {
    const searchTerm = this.searchInput.value.toLowerCase()
    const filterType = this.filterSelect.value

    this.filteredFiles = this.files.filter((file) => {
      const matchesSearch =
        file.originalName.toLowerCase().includes(searchTerm) ||
        file.summary.toLowerCase().includes(searchTerm) ||
        file.topic.toLowerCase().includes(searchTerm)

      const matchesFilter = filterType === "all" || file.fileType === filterType

      return matchesSearch && matchesFilter
    })

    this.renderFiles()
  }

  showLoading() {
    this.loadingState.style.display = "block"
    this.emptyState.style.display = "none"
    this.filesGrid.style.display = "none"
  }

  showEmpty() {
    this.loadingState.style.display = "none"
    this.emptyState.style.display = "block"
    this.filesGrid.style.display = "none"
  }

  renderFiles() {
    this.loadingState.style.display = "none"

    if (this.filteredFiles.length === 0) {
      this.showEmpty()
      return
    }

    this.emptyState.style.display = "none"
    this.filesGrid.style.display = "grid"

    this.filesGrid.innerHTML = this.filteredFiles.map((file) => this.createFileCard(file)).join("")

    // Attach event listeners to file cards
    this.attachFileCardListeners()
  }

  createFileCard(file) {
    const uploadDate = new Date(file.uploadDate).toLocaleDateString()
    const fileSize = this.formatFileSize(file.size)
    const fileIcon = this.getFileIcon(file.fileType)

    return `
      <div class="card" style="cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease;" 
           data-file-id="${file.id}" 
           onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'"
           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 1px 3px rgba(0,0,0,0.1)'">
        
        <div style="display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1rem;">
          <div style="width: 48px; height: 48px; background-color: var(--primary); color: var(--primary-foreground); border-radius: var(--radius); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            ${fileIcon}
          </div>
          <div style="flex: 1; min-width: 0;">
            <h3 style="margin: 0 0 0.25rem 0; font-size: 1.125rem; word-break: break-word;">${file.originalName}</h3>
            <div style="font-size: 0.875rem; color: var(--muted-foreground);">
              ${fileSize} • ${file.fileType.toUpperCase()} • ${uploadDate}
            </div>
            ${file.readingTime ? `<div style="font-size: 0.875rem; color: var(--accent); font-weight: 500; margin-top: 0.25rem;">${file.readingTime}</div>` : ""}
          </div>
        </div>

        <div style="background-color: var(--muted); padding: 1rem; border-radius: calc(var(--radius) - 2px); margin-bottom: 1rem;">
          <h4 style="margin: 0 0 0.5rem 0; font-size: 0.875rem; font-weight: 600; color: var(--foreground);">AI Summary</h4>
          <p style="margin: 0; font-size: 0.875rem; line-height: 1.5; color: var(--card-foreground);">${file.summary}</p>
        </div>

        <div style="display: flex; gap: 0.75rem;">
          <button type="button" class="btn btn-primary" style="flex: 1; font-size: 0.875rem; padding: 0.5rem 1rem;" onclick="attendeeView.viewFile('${file.filename}', '${file.originalName}', '${file.fileType}')">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
            View
          </button>
          <button type="button" class="btn btn-secondary" style="font-size: 0.875rem; padding: 0.5rem 1rem;" onclick="attendeeView.downloadFile('${file.filename}', '${file.originalName}')">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Download
          </button>
        </div>
      </div>
    `
  }

  getFileIcon(fileType) {
    const icons = {
      pdf: `<svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
      </svg>`,
      presentation: `<svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
        <path d="M2,3H22C23.05,3 24,3.95 24,5V17C24,18.05 23.05,19 22,19H14L16,21V22H8V21L10,19H2C0.95,19 0,18.05 0,17V5C0,3.95 0.95,3 2,3Z" />
      </svg>`,
      video: `<svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17,10.5V7A1,1 0 0,0 16,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V13.5L21,17.5V6.5L17,10.5Z" />
      </svg>`,
    }
    return icons[fileType] || icons.pdf
  }

  attachFileCardListeners() {
    // Add click listeners for file cards (for accessibility)
    const fileCards = this.filesGrid.querySelectorAll("[data-file-id]")
    fileCards.forEach((card) => {
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          const viewBtn = card.querySelector(".btn-primary")
          if (viewBtn) viewBtn.click()
        }
      })
      card.setAttribute("tabindex", "0")
    })
  }

  async viewFile(filename, originalName, fileType) {
    try {
      this.previewTitle.textContent = originalName

      const linkParam = this.shareableLinkToken ? `?link=${this.shareableLinkToken}` : ""

      if (fileType === "pdf") {
        this.previewContent.innerHTML = `
          <iframe 
            src="${this.apiUrl}/files/${filename}${linkParam}" 
            style="width: 100%; height: 600px; border: none; border-radius: var(--radius);"
            title="PDF Preview">
          </iframe>
        `
      } else if (fileType === "video") {
        this.previewContent.innerHTML = `
          <video 
            controls 
            style="width: 100%; max-height: 600px; border-radius: var(--radius);"
            preload="metadata">
            <source src="${this.apiUrl}/files/${filename}${linkParam}" type="video/mp4">
            Your browser does not support the video tag.
          </video>
        `
      } else {
        // For presentations, show download option
        this.previewContent.innerHTML = `
          <div style="text-align: center; padding: 2rem;">
            <div style="width: 64px; height: 64px; margin: 0 auto 1rem; color: var(--muted-foreground);">
              ${this.getFileIcon(fileType)}
            </div>
            <h3 style="margin-bottom: 1rem;">Preview not available</h3>
            <p style="color: var(--muted-foreground); margin-bottom: 2rem;">
              This file type cannot be previewed in the browser. Click download to view the file.
            </p>
            <button type="button" class="btn btn-primary" onclick="attendeeView.downloadFile('${filename}', '${originalName}')">
              Download ${originalName}
            </button>
          </div>
        `
      }

      this.previewModal.style.display = "block"
      document.body.style.overflow = "hidden"
    } catch (error) {
      console.error("Error viewing file:", error)
    }
  }

  downloadFile(filename, originalName) {
    const linkParam = this.shareableLinkToken ? `&link=${this.shareableLinkToken}` : ""

    const link = document.createElement("a")
    link.href = `${this.apiUrl}/files/${filename}?download=true${linkParam}`
    link.download = originalName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  closeModal() {
    this.previewModal.style.display = "none"
    document.body.style.overflow = "auto"
  }

  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }
}

// Initialize the attendee view when the page loads
let attendeeView
document.addEventListener("DOMContentLoaded", () => {
  attendeeView = new AttendeeView()
})
