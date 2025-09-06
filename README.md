# Takeaway MVP

A minimal file upload and sharing application for speakers to upload presentation materials and attendees to access them with AI-generated summaries.

## Features

### For Speakers
- Upload PDF, PowerPoint, and video files (up to 50MB)
- Drag-and-drop file upload interface
- Real-time upload progress indication
- Automatic AI summary generation

### For Attendees
- Browse uploaded presentations in a clean grid layout
- Search and filter files by type and content
- View AI-generated summaries
- Preview PDFs and videos in-browser
- Download files with proper filenames

### Technical Features
- Express.js backend with file upload handling
- Pure HTML/CSS/JavaScript frontend (no frameworks)
- Mock AI summary generation (easily replaceable with real AI)
- Secure file serving with range request support for video streaming
- Responsive design with accessibility features

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Install dependencies:**
   ```
   npm install
   ```

2. **Start the server:**
   ```
   npm start
   ```
   
   For development with auto-restart:
   ```
   npm run dev
   ```

3. **Access the application:**
   - Speaker upload page: `http://localhost:3001/speaker.html`
   - Attendee view page: `http://localhost:3001/attendee.html`
   - API endpoints: `http://localhost:3001/api/`

### Project Structure

```
takeaway-mvp/
├── server.js                 # Express server with API endpoints
├── lib/
│   └── aiSummaryGenerator.js # Mock AI summary generation
├── public/
│   ├── speaker.html          # Speaker upload interface
│   ├── attendee.html         # Attendee viewing interface
│   ├── styles.css            # Shared CSS styles
│   ├── speaker.js            # Speaker page JavaScript
│   └── attendee.js           # Attendee page JavaScript
├── uploads/                  # File storage directory (created automatically)
├── package.json
└── README.md
```

## API Endpoints

### File Upload
- `POST /api/upload` - Upload a new file
- Accepts: PDF, PPT, PPTX, MP4, AVI, MOV, WMV files
- Returns: File metadata with AI-generated summary

### File Management
- `GET /api/files` - Get list of all uploaded files
- `GET /api/files/:filename` - Download or view a specific file
- `GET /api/files/:filename/info` - Get file metadata without downloading
- `POST /api/files/bulk-download` - Get download URLs for multiple files

### Query Parameters
- `?download=true` - Force file download instead of inline viewing

## File Storage

Files are stored in the `uploads/` directory with the following structure:
- `{timestamp}-{originalname}` - The actual file
- `{timestamp}-{originalname}.json` - File metadata and AI summary

## Security Features

- Filename validation to prevent directory traversal attacks
- File type validation on upload
- File size limits (50MB maximum)
- Secure file serving with proper headers

## Customization

### Replacing Mock AI with Real AI
The AI summary generation is modular and can be easily replaced:

1. Edit `lib/aiSummaryGenerator.js`
2. Replace the `generateSummary` method with real AI integration
3. The existing interface will automatically use the new implementation

### Styling and Branding
- Edit `public/styles.css` to customize colors and typography
- CSS uses semantic design tokens for easy theming
- Responsive design works on mobile and desktop

## Production Considerations

For production deployment, consider:
- Using a proper database instead of JSON files
- Implementing user authentication and authorization
- Adding file encryption and virus scanning
- Using cloud storage (AWS S3, etc.) instead of local files
- Adding rate limiting and request validation
- Implementing proper logging and monitoring
- Using HTTPS and security headers

## Browser Support

- Modern browsers with ES6+ support
- File drag-and-drop requires modern browser
- Video preview requires HTML5 video support
- PDF preview requires browser PDF support or plugin
