# AudioSeg - Intelligent Audio Segmentation System

AudioSeg is a web-based system for intelligent audio segmentation using prosodic analysis and human validation. The application automatically detects sentence boundaries in audio files using acoustic cues like pauses, syllable lengthening, and pitch changes, then allows human experts to validate and correct these segments while providing transcriptions.

## 🚀 Current Status

**PROTOTYPE MODE ACTIVE** - Authentication temporarily disabled for public demonstration. Anyone can explore all features without registration.

## ✨ Key Features

### 🎯 Automatic Segmentation
- **AI-Powered Detection**: OpenAI Whisper integration with contextual learning
- **Prosodic Analysis**: Advanced algorithms using pauses, pitch changes, and syllable lengthening
- **Hybrid Processing**: Automatic fallback for large files with basic segmentation

### 👥 Human Validation
- **Interactive Interface**: Drag-and-drop segment boundary adjustment
- **Real-time Playback**: HTML5 audio player with waveform visualization
- **Smart Corrections**: System learns from user corrections automatically

### 🎨 User Experience
- **Bilingual Support**: Complete English/Portuguese interface
- **Mobile Responsive**: Works on all devices
- **Real-time Updates**: Live validation with immediate feedback

### 🔧 Management Tools
- **User Management**: Role-based access (Manager/Editor)
- **Language Assignment**: Assign specific languages to editors
- **Project Tracking**: Complete upload, processing, and validation workflow

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Radix UI** components
- **TanStack React Query** for state management
- **Vite** for development and building

### Backend
- **Node.js** with Express.js
- **TypeScript** with ESM modules
- **Drizzle ORM** with PostgreSQL
- **Replit Auth** (OpenID Connect)
- **Multer** for file uploads

### Database
- **PostgreSQL** (Neon serverless)
- **Session storage** with PostgreSQL
- **Automatic migrations** with Drizzle

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database
- OpenAI API key (optional, for Whisper integration)

### Environment Variables
```bash
DATABASE_URL=your_postgresql_connection_string
SESSION_SECRET=your_session_secret
REPL_ID=your_replit_id
REPLIT_DOMAINS=your_domain
OPENAI_API_KEY=your_openai_key (optional)
```

### Installation
```bash
# Install dependencies
npm install

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

### Production Build
```bash
# Build for production
npm run build

# Start production server
npm start
```

## 📖 User Guide

### For Managers
- **User Management** - Add editors, assign languages, manage permissions
- **Project Oversight** - Monitor progress across all projects
- **Language Configuration** - Set up supported languages and contexts
- **Export Management** - Download completed datasets and reports

### For Editors  
- **Audio Upload** - Process new audio files with customizable settings
- **Validation Interface** - Review AI-generated segments with precision tools
- **Transcription Editing** - Correct transcriptions with real-time validation
- **Progress Tracking** - Monitor your assigned projects and completion rates

### Advanced Features
- **Segmentation Controls** - Adjust sensitivity and boundary detection parameters
- **Context Learning** - System improves from corrections automatically
- **Batch Processing** - Handle multiple files simultaneously
- **Export Options** - ZIP export with metadata for completed segments

## 🔄 Prototype Mode

This version runs in prototype mode for demonstration purposes:
- **No Authentication Required** - Direct access to all features
- **Demo User** - Automatic manager-level access
- **Full Functionality** - All features available for testing
- **Data Persistence** - Projects and segments saved in database

## 🔧 Architecture Overview

### Audio Processing Pipeline
1. **Upload** - WAV, MP3, M4A files up to 500MB
2. **AI Processing** - Whisper transcription with context
3. **Boundary Detection** - Prosodic analysis for sentence boundaries
4. **Human Validation** - Expert review and correction interface
5. **Export** - Validated segments with audio-text mapping

### Data Flow
1. **Project Creation** - Users upload audio files and select target language
2. **Automatic Processing** - Background jobs process audio to detect segments
3. **Validation Queue** - Segments appear in validation interface for editors
4. **Human Review** - Editors adjust boundaries and add transcriptions
5. **Export** - Completed projects generate downloadable datasets

## 🔐 Authentication (Production)

In production mode, the system uses:
- **Replit Auth** integration with OpenID Connect
- **Role-based access** (Manager/Editor permissions)
- **PostgreSQL sessions** with secure cookie storage
- **Language-based assignments** for editors

To restore authentication:
1. Replace `server/replitAuth.ts` with `server/replitAuth.backup.ts`
2. Update authentication hooks in the frontend
3. Deploy to Replit for full functionality

## 📝 Development Notes

### Project Structure
```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Route pages
│   │   ├── hooks/         # Custom hooks
│   │   └── lib/           # Utilities
├── server/                # Express backend
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Database layer
│   └── replitAuth.ts      # Authentication
├── shared/                # Shared types
│   └── schema.ts          # Database schema
└── uploads/               # File storage
```

### Key Commands
```bash
npm run dev          # Development server
npm run build        # Production build
npm run db:push      # Database migrations
npm run db:studio    # Database GUI
```

## 🌐 Deployment

The application is designed for deployment on Replit with:
- **Custom domain support** (nativox.org configured)
- **Automatic HTTPS** with TLS certificates
- **Horizontal scaling** capability
- **Environment variable** management

## 🤝 Contributing

This is a research and development project focused on audio segmentation technology. For access to the full authentication system and production deployment, contact the development team.

## 📄 License

This project is proprietary software developed for audio research and linguistic analysis applications.

---

**Built with ❤️ for audio research and linguistic analysis**