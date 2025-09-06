const path = require("path")

class AISummaryGenerator {
  constructor() {
    // Template summaries based on file types
    this.summaryTemplates = {
      pdf: [
        "This PDF document provides comprehensive insights into {topic}. The material covers essential concepts and practical applications that will benefit attendees. Key findings include actionable strategies and detailed methodologies for implementation.",
        "The document presents a thorough analysis of {topic} with supporting data and case studies. Readers will gain valuable knowledge about industry best practices and emerging trends. The content is structured to facilitate easy understanding and practical application.",
        "This PDF contains detailed information about {topic}, including theoretical frameworks and real-world examples. The material offers strategic insights and proven methodologies. Attendees will find practical tools and techniques they can immediately apply.",
      ],
      presentation: [
        "This presentation delivers key insights about {topic} through engaging visual content and clear explanations. The slides cover fundamental concepts and advanced strategies. Participants will learn practical approaches and implementation techniques.",
        "The presentation provides a comprehensive overview of {topic} with interactive elements and detailed examples. Key takeaways include actionable frameworks and best practices. The content is designed for immediate practical application.",
        "This slide deck explores {topic} through structured learning modules and case studies. The presentation offers strategic insights and proven methodologies. Attendees will gain valuable knowledge and practical tools.",
      ],
      video: [
        "This video presentation covers essential aspects of {topic} through dynamic visual storytelling and expert commentary. The content includes practical demonstrations and real-world applications. Viewers will learn actionable strategies and implementation techniques.",
        "The video provides an engaging exploration of {topic} with comprehensive explanations and visual examples. Key insights include industry best practices and innovative approaches. The content is designed for both learning and practical application.",
        "This video content delivers valuable insights about {topic} through expert presentations and case study analysis. Participants will gain practical knowledge and strategic frameworks. The material includes actionable takeaways and implementation guides.",
      ],
    }

    // Common business and presentation topics for more relevant summaries
    this.topicKeywords = [
      "digital transformation",
      "leadership strategies",
      "market analysis",
      "innovation frameworks",
      "customer experience",
      "data analytics",
      "project management",
      "business development",
      "strategic planning",
      "team collaboration",
    ]
  }

  /**
   * Generate a mock AI summary based on filename and file type
   * @param {string} filename - The uploaded file name
   * @param {string} mimetype - The file MIME type
   * @returns {string} Generated summary
   */
  generateSummary(filename, mimetype) {
    const fileType = this.getFileType(mimetype)
    const topic = this.extractTopic(filename)
    const templates = this.summaryTemplates[fileType]

    // Select a random template
    const template = templates[Math.floor(Math.random() * templates.length)]

    // Replace {topic} placeholder with extracted or generated topic
    return template.replace("{topic}", topic)
  }

  /**
   * Determine file type category from MIME type
   * @param {string} mimetype - The file MIME type
   * @returns {string} File type category
   */
  getFileType(mimetype) {
    if (mimetype === "application/pdf") {
      return "pdf"
    } else if (
      mimetype === "application/vnd.ms-powerpoint" ||
      mimetype === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ) {
      return "presentation"
    } else if (mimetype.startsWith("video/")) {
      return "video"
    }
    return "pdf" // Default fallback
  }

  /**
   * Extract or generate a relevant topic from filename
   * @param {string} filename - The uploaded file name
   * @returns {string} Extracted or generated topic
   */
  extractTopic(filename) {
    // Remove timestamp prefix and file extension
    const cleanName = filename
      .replace(/^\d+-/, "") // Remove timestamp prefix
      .replace(/\.[^/.]+$/, "") // Remove file extension
      .replace(/[_-]/g, " ") // Replace underscores and hyphens with spaces
      .toLowerCase()

    // Check if filename contains recognizable business terms
    const businessTerms = [
      "strategy",
      "marketing",
      "sales",
      "leadership",
      "management",
      "analytics",
      "innovation",
      "digital",
      "transformation",
      "customer",
      "project",
      "team",
      "business",
      "growth",
      "development",
    ]

    const foundTerm = businessTerms.find((term) => cleanName.includes(term))

    if (foundTerm) {
      return `${foundTerm} and business excellence`
    }

    // If no specific terms found, use the cleaned filename or a random topic
    if (cleanName.length > 3 && cleanName.length < 50) {
      return cleanName
    }

    // Fallback to random business topic
    return this.topicKeywords[Math.floor(Math.random() * this.topicKeywords.length)]
  }

  /**
   * Generate summary with additional metadata
   * @param {string} filename - The uploaded file name
   * @param {string} mimetype - The file MIME type
   * @param {number} fileSize - File size in bytes
   * @returns {Object} Summary with metadata
   */
  generateDetailedSummary(filename, mimetype, fileSize) {
    const summary = this.generateSummary(filename, mimetype)
    const readingTime = this.estimateReadingTime(fileSize, mimetype)

    return {
      summary,
      readingTime,
      fileType: this.getFileType(mimetype),
      topic: this.extractTopic(filename),
      generatedAt: new Date().toISOString(),
    }
  }

  /**
   * Estimate reading/viewing time based on file size and type
   * @param {number} fileSize - File size in bytes
   * @param {string} mimetype - The file MIME type
   * @returns {string} Estimated time
   */
  estimateReadingTime(fileSize, mimetype) {
    const fileSizeMB = fileSize / (1024 * 1024)

    if (mimetype.startsWith("video/")) {
      // Rough estimate: 1MB ≈ 1 minute for video
      const minutes = Math.ceil(fileSizeMB)
      return `${minutes} min${minutes > 1 ? "s" : ""}`
    } else if (mimetype === "application/pdf") {
      // Rough estimate: 1MB ≈ 10 pages, 2 minutes per page
      const estimatedPages = Math.ceil(fileSizeMB * 10)
      const minutes = Math.ceil(estimatedPages * 2)
      return `${minutes} min${minutes > 1 ? "s" : ""} read`
    } else {
      // Presentations
      const estimatedSlides = Math.ceil(fileSizeMB * 5)
      const minutes = Math.ceil(estimatedSlides * 0.5)
      return `${minutes} min${minutes > 1 ? "s" : ""} presentation`
    }
  }
}

module.exports = new AISummaryGenerator()
