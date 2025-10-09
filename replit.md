# Shemasts - Manual Audio Transcription & Translation Tool

## Overview

Shemasts is a web-based system for manual audio transcription and translation. The application allows users to upload pre-segmented audio files, manually enter transcriptions and translations side-by-side, and organize their work within projects and folders.

**Current Status (October 7, 2025):** **PROTOTYPE MODE ACTIVE** - Authentication temporarily disabled for public demonstration. Original authentication system backed up in `replitAuth.backup.ts`. System now allows unrestricted access with demo user to showcase all features. Application compiles and runs successfully on port 5000. 

**Major Update (October 7, 2025):** Complete removal of all AI/Whisper functionality. The system is now fully manual - users upload pre-segmented audio files and manually enter transcriptions and translations. No automatic segmentation or AI-assisted transcription.

## User Preferences

Preferred communication style: Simple, everyday language.
Custom domain: nativox.org (user wants this configured as primary domain)
Manual workflow: System transformed to manual-only transcription and translation tool (October 7, 2025)
User management: Complete system where managers can see all users, assign languages per user, and control roles (manager/editor) - July 20, 2025
Language switcher: Must be positioned at top of site on all pages (not sidebar) - implemented July 21, 2025

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **UI Components**: Radix UI primitives with shadcn/ui styling
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack React Query for server state
- **Build Tool**: Vite with hot module replacement

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Authentication**: Replit Auth with OpenID Connect
- **Session Storage**: PostgreSQL-backed sessions
- **File Upload**: Multer for audio file handling

### Database Design
- **Primary Database**: PostgreSQL (via Neon serverless)
- **Schema Management**: Drizzle migrations
- **Key Tables**:
  - `users` - User profiles and roles (manager/editor)
  - `languages` - Supported languages for projects
  - `projects` - Audio processing projects with contextual metadata
  - `segments` - Individual audio segments with timestamps, transcription, and translation fields
  - `user_languages` - Editor language assignments
  - `processing_queue` - Background job queue
  - `transcription_examples` - Domain-specific examples for in-context learning
  - `transcription_corrections` - Learning database from user corrections
  - `sessions` - Authentication session storage

## Key Components

### Audio Processing Pipeline
The system implements a manual workflow for transcription and translation:

1. **Pre-segmented Upload**: Users upload individual audio segment files
2. **Folder Organization**: Segments organized into folders within projects
3. **Manual Transcription**: Users enter transcription and translation manually in dual input boxes
4. **Data Export**: Completed segments with transcription and translation

### Recent Achievements
- **Audio Playback**: HTML5 native player with controls, volume, and seeking
- **Dual Input System**: Side-by-side transcription and translation input boxes (October 2025)
- **Translation Support**: Database schema updated with translation field (October 2025)
- **Batch Upload**: Upload multiple pre-segmented audio files to folders (October 2025)
- **Manual Workflow**: Complete removal of AI/Whisper - fully manual transcription (October 2025)
- **Navigation System**: Previous/next segment controls and segment list
- **Project Management**: Upload, delete, and status tracking for audio projects
- **Audio Export**: ZIP export functionality for individual audio segments with metadata
- **User Management System**: Complete management interface for managers to control users, roles, and language assignments (July 2025)
- **Global Language Switcher**: Bilingual interface (English/Portuguese) with language switcher positioned in fixed header at top of all pages (July 2025)
- **Complete Translation System**: Comprehensive bilingual support across all pages, forms, messages, and interface elements with dynamic translation functions (July 2025)
- **Prototype Mode Implementation**: Authentication temporarily disabled for public demonstration - system allows unrestricted access with demo user (July 2025)

### Authentication System
- **Provider**: Replit Auth integration
- **Session Management**: PostgreSQL-stored sessions with configurable TTL
- **Role-based Access**: Manager and Editor roles with different permissions
- **Security**: HTTP-only cookies with CSRF protection

### File Management
- **Upload Handling**: Multer-based file processing with size limits (500MB)
- **Supported Formats**: WAV, MP3, M4A audio files
- **Storage**: Local filesystem with configurable upload directory

### User Interface
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Audio Player**: HTML5 audio player for segment playback
- **Dual Input Interface**: Side-by-side transcription and translation input boxes
- **Admin Panel**: User and language management for managers

## Data Flow

1. **Project Creation**: Users create projects and select target language
2. **Folder Organization**: Create folders within projects to organize segments
3. **Batch Upload**: Upload pre-segmented audio files to folders
4. **Manual Processing**: Editors enter transcriptions and translations manually
5. **Export**: Completed projects generate downloadable datasets

## External Dependencies

### Core Infrastructure
- **Database**: Neon PostgreSQL serverless database
- **Authentication**: Replit OpenID Connect provider
- **File Storage**: Local filesystem (expandable to cloud storage)

### Key Libraries
- **Backend**: Express.js, Drizzle ORM, Passport.js, Multer
- **Frontend**: React, TanStack Query, Radix UI, Tailwind CSS
- **Development**: Vite, TypeScript, ESLint

### Audio Processing
The system provides manual audio transcription and translation:
- **Pre-segmented Audio**: Users upload individual audio segment files
- **Manual Transcription**: Dual input boxes for transcription and translation entry
- **Batch Upload**: Upload multiple audio files simultaneously to folders
- **Audio Playback**: HTML5 audio player for segment playback
- **Audio Format Support**: WAV, MP3, M4A audio files up to 500MB

## Deployment Strategy

### Development Environment
- **Hot Reloading**: Vite development server with Express middleware
- **Type Checking**: TypeScript compilation and checking
- **Database**: Direct connection to Neon PostgreSQL

### Production Build
- **Client Build**: Vite builds optimized React bundle
- **Server Build**: ESBuild bundles Express server with external packages
- **Static Serving**: Express serves built client assets
- **Process Management**: Single Node.js process with integrated server

### Environment Configuration
- **Database**: PostgreSQL connection via `DATABASE_URL`
- **Session Security**: `SESSION_SECRET` for session signing
- **Replit Integration**: `REPL_ID` and domain configuration
- **Custom Domain**: nativox.org (requires Replit domain configuration and DNS setup)
- **File Storage**: Configurable upload directory

### Scaling Considerations
The architecture supports horizontal scaling through:
- Stateless Express servers
- External PostgreSQL database
- Shared file storage solutions
- Background job processing queues

The system is designed for educational and research environments with moderate concurrent users, but can be extended for larger deployments with additional infrastructure components.

## Automatic Contextual Learning System (Added July 20, 2025)

### Key Features
- **Automatic Learning**: System learns from transcription corrections made during validation
- **Silent Operation**: No separate interface needed - learning happens in background
- **User-Driven**: Learning is based on actual user corrections of Whisper transcriptions
- **Domain Awareness**: Corrections are tagged with project domain and language
- **Contextual Integration**: Future transcriptions improve based on correction patterns

### Implementation Details
- **Integration**: Built into validation interface at segment approval/correction
- **API**: Automatic correction tracking when users modify Whisper transcriptions
- **Database**: Transcription corrections stored with segment, project, and language context
- **Learning Process**: When user corrects transcription during validation, system saves as learning data
- **Background Processing**: All learning happens silently without interrupting workflow

### User Workflow
1. **User validates segments** and corrects transcriptions as needed
2. **System detects corrections** automatically when original differs from corrected text
3. **Learning data saved** with context (domain, language, audio timing)
4. **Future improvements** based on accumulated correction patterns

This approach provides natural, user-driven learning without additional interfaces or manual data entry.

## User Management System (Added July 20, 2025)

### Key Features
- **Manager-Only Access**: Comprehensive user management interface available only to users with manager role
- **User Overview**: Visual table showing all registered users with profiles, emails, roles, and status
- **Role Management**: Dropdown controls to change user roles between Editor and Manager
- **Status Control**: Toggle user active/inactive status to control system access
- **Language Assignment**: Assign specific languages to editors for targeted project work
- **Language Removal**: Remove language assignments when user responsibilities change
- **Visual Interface**: Professional design with user avatars, badges, and intuitive controls

### Implementation Details
- **Frontend**: React-based management interface at `/users` with comprehensive CRUD operations
- **API Endpoints**: RESTful APIs for user role updates, status changes, and language assignments
- **Database Schema**: Enhanced user table with role and status fields, user_languages junction table
- **Access Control**: Role-based middleware ensuring only managers can access user management features
- **Real-time Updates**: Automatic cache invalidation and UI updates after any changes
- **Error Handling**: Comprehensive error handling with user-friendly toast notifications

### User Flow
1. **Manager Access**: Only users with 'manager' role can access `/users` page
2. **User Discovery**: View all users who have signed up to the system automatically
3. **Role Assignment**: Change any user's role from Editor to Manager or vice versa
4. **Language Assignment**: Assign specific languages to editors for focused work
5. **Status Management**: Activate or deactivate users to control system access
6. **Real-time Feedback**: Toast notifications confirm all changes immediately

This system provides complete user administration capabilities while maintaining security through role-based access control.

## Prototype Mode Configuration (July 23, 2025)

### Current Setup
- **Authentication Bypass**: All authentication requirements removed for public demonstration
- **Demo User**: Automatic demo user (demo@nativox.org) with manager role for full feature access
- **Backup System**: Original Replit authentication system preserved in `replitAuth.backup.ts`
- **Landing Page**: Updated to allow direct system access without login flow
- **Public Access**: Anyone can now explore all features without registration or authentication

### Restoration Process
To restore full authentication functionality:
1. Replace `server/replitAuth.ts` with contents from `server/replitAuth.backup.ts`
2. Update `client/src/hooks/useAuth.ts` to restore original authentication logic
3. Modify landing page to redirect to authentication flow
4. Deploy to Replit for full authentication functionality

### Security Considerations
- Current setup is for demonstration purposes only
- No actual user data protection in prototype mode
- Production deployment should restore authentication system
- Database still maintains user structure for seamless transition