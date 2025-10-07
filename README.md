# AudioSeg - Manual Audio Transcription & Translation Tool

AudioSeg is a web-based system for manual audio transcription and translation. The application allows users to upload pre-segmented audio files, manually enter transcriptions and translations side-by-side, and organize their work within projects and folders.

## 🚀 Current Status

**PROTOTYPE MODE ACTIVE** - Authentication temporarily disabled for public demonstration. Anyone can explore all features without registration.

## ✨ Key Features

### 🎯 Manual Transcription & Translation
- **Pre-segmented Audio**: Upload individual audio segments for manual processing
- **Dual Input System**: Transcribe and translate audio segments side-by-side
- **Batch Upload**: Process multiple audio files efficiently

### 👥 User-Friendly Interface
- **Interactive Audio Player**: HTML5 audio player with waveform visualization
- **Real-time Editing**: Simultaneous transcription and translation input
- **Progress Tracking**: Monitor completion status across projects

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

### Environment Variables
```bash
DATABASE_URL=your_postgresql_connection_string
SESSION_SECRET=your_session_secret
REPL_ID=your_replit_id
REPLIT_DOMAINS=your_domain
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
- **Audio Upload** - Upload pre-segmented audio files to projects
- **Transcription Interface** - Manual transcription and translation input
- **Real-time Editing** - Enter transcription and translation side-by-side
- **Progress Tracking** - Monitor your assigned projects and completion rates

### Advanced Features
- **Batch Upload** - Upload multiple audio segments simultaneously
- **Language Assignment** - Editors assigned to specific languages
- **Folder Organization** - Organize segments within projects
- **Export Options** - ZIP export with metadata for completed segments

## 🔄 Prototype Mode

This version runs in prototype mode for demonstration purposes:
- **No Authentication Required** - Direct access to all features
- **Demo User** - Automatic manager-level access
- **Full Functionality** - All features available for testing
- **Data Persistence** - Projects and segments saved in database

## 🔧 Architecture Overview

### Audio Processing Pipeline
1. **Upload** - WAV, MP3, M4A pre-segmented audio files up to 500MB
2. **Manual Transcription** - Users enter transcription and translation manually
3. **Human Review** - Expert transcription and translation entry
4. **Progress Tracking** - Monitor completion across projects
5. **Export** - Completed segments with transcription and translation

### Data Flow
1. **Project Creation** - Users create projects and select target language
2. **Folder Organization** - Organize segments into folders within projects
3. **Batch Upload** - Upload pre-segmented audio files to folders
4. **Manual Processing** - Editors enter transcriptions and translations
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