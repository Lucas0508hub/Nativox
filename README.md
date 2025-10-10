# Nativox - Local Development

A simplified audio transcription and translation application for local development.

## Quick Start

### Prerequisites
- Node.js (v18 or higher)
- Docker and Docker Compose
- PostgreSQL (via Docker)

### Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Start the database:**
   ```bash
   docker-compose -f docker-compose.simple.yml up -d postgres
   ```

3. **Run the application:**
   ```bash
   ./start-local.sh
   ```
   
   Or manually:
   ```bash
   export DATABASE_URL=postgresql://nativox:nativox123@localhost:5432/nativox
   export SESSION_SECRET=dev-session-secret-key
   export PORT=3001
   npm run dev
   ```

4. **Access the application:**
   - Frontend: http://localhost:3001
   - API: http://localhost:3001/api

## Features

- Audio file upload and segmentation
- Transcription and translation workflow
- User authentication and role management
- Project and folder organization
- CSV export functionality

## Database

The application uses PostgreSQL with the following default credentials:
- Database: `nativox`
- User: `nativox`
- Password: `nativox123`
- Port: `5432`

## Development

- **Frontend**: React with TypeScript, Tailwind CSS
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **File Storage**: Local file system

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:push` - Push database schema changes

## Environment Variables

Create a `.env` file with:
```
DATABASE_URL=postgresql://nativox:nativox123@localhost:5432/nativox
SESSION_SECRET=your-secret-key
PORT=3001
```

## Stopping the Application

To stop the database:
```bash
docker-compose -f docker-compose.simple.yml down
```