# Nativox - Audio Transcription Platform

A modern audio transcription and translation application with separated frontend and backend architecture.

## Architecture

- **Frontend**: React with TypeScript, Tailwind CSS (frontend/)
- **Backend**: Python with FastAPI, SQLAlchemy, and Alembic (backend/)
- **Infrastructure**: Docker Compose setup (infra/)
- **Database**: PostgreSQL with proper migrations
- **File Storage**: Local file system

## Quick Start

### Prerequisites
- Docker and Docker Compose

### Setup with Docker (Recommended)

1. **Start all services:**
   ```bash
   cd infra
   docker-compose up -d
   ```

2. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - API Documentation: http://localhost:3000/docs

### Manual Setup (Alternative)

1. **Setup Python backend:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure environment:**
   ```bash
   # Copy and edit backend/.env
   cp backend/env.example backend/.env
   # Edit with your database settings
   ```

3. **Apply database migrations:**
   ```bash
   cd backend
   alembic upgrade head
   ```

4. **Start the backend:**
   ```bash
   cd backend
   python run.py
   ```

5. **Start the frontend (in another terminal):**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Features

- Audio file upload and segmentation
- Transcription and translation workflow
- User authentication and role management
- Project and folder organization
- CSV export functionality

## Development

### Backend (Python/FastAPI)
- **Location**: `backend/`
- **Framework**: FastAPI with SQLAlchemy
- **Migrations**: Alembic
- **Documentation**: Auto-generated at `/docs`

### Frontend (React/TypeScript)
- **Location**: `frontend/`
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite

## Docker Commands

Run these commands from the `infra/` directory:

- `docker-compose up -d` - Start all services
- `docker-compose down` - Stop all services
- `docker-compose logs -f` - View logs
- `docker-compose restart` - Restart all services
- `docker-compose build` - Build all images
- `docker-compose exec backend bash` - Open backend shell
- `docker-compose exec frontend sh` - Open frontend shell
- `docker-compose exec postgres psql -U nativox -d nativox` - Open database shell

### Manual Scripts

#### Backend
- `cd backend && python run.py` - Start development server
- `cd backend && alembic upgrade head` - Apply database migrations
- `cd backend && alembic revision --autogenerate -m "message"` - Create new migration

#### Frontend
- `cd frontend && npm run dev` - Start development server
- `cd frontend && npm run build` - Build for production
- `cd frontend && npm run preview` - Preview production build

## Environment Variables

### Docker Environment
The Docker setup uses default environment variables. For production, create a `.env` file in the root directory:

```bash
# Database
POSTGRES_DB=nativox
POSTGRES_USER=nativox
POSTGRES_PASSWORD=nativox123

# Backend
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440
BACKEND_CORS_ORIGINS=["https://yourdomain.com"]
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=104857600

# Frontend
VITE_API_BASE_URL=http://localhost:5000
FRONTEND_API_URL=https://yourdomain.com
```

### Manual Setup Environment Variables

#### Backend (`backend/.env`)
```
DATABASE_URL=postgresql://user:password@localhost:5432/nativox
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440
BACKEND_CORS_ORIGINS=["http://localhost:3000", "http://localhost:5173"]
UPLOAD_DIR=uploads
MAX_FILE_SIZE=104857600
```

#### Frontend (`frontend/.env`)
```
VITE_API_BASE_URL=http://localhost:3000
```