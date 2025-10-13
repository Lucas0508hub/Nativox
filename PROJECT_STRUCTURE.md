# Project Structure

The Nativox project is organized into three main folders for better separation of concerns:

## 📁 Folder Organization

### `backend/` - Python FastAPI Backend
- **Purpose**: Server-side application logic
- **Technology**: Python, FastAPI, SQLAlchemy, Alembic
- **Structure**:
  - `app/` - Main application code
  - `alembic/` - Database migrations
  - `requirements.txt` - Python dependencies
  - `run.py` - Application runner
  - `Dockerfile` - Container configuration
  - `env.example` - Environment variables template

### `frontend/` - React TypeScript Frontend
- **Purpose**: Client-side user interface
- **Technology**: React, TypeScript, Tailwind CSS, Vite
- **Structure**:
  - `src/` - Source code
  - `public/` - Static assets
  - `package.json` - Dependencies and scripts
  - `Dockerfile` - Container configuration
  - `env.example` - Environment variables template
  - Configuration files (tsconfig.json, tailwind.config.ts, etc.)

### `infra/` - Infrastructure & DevOps
- **Purpose**: Deployment and infrastructure configuration
- **Technology**: Docker, Docker Compose
- **Structure**:
  - `docker-compose.yml` - Main compose file
  - `init-db.sql` - Database initialization
  - `uploads/` - File storage directory
  - `.dockerignore` - Docker ignore file

## 🚀 Quick Start

### Using Docker (Recommended)
```bash
cd infra
docker-compose up -d
```

### Manual Development
```bash
# Backend
cd backend
pip install -r requirements.txt
python run.py

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

## 📋 Benefits of This Structure

1. **Clear Separation**: Each folder has a specific purpose
2. **Independent Development**: Teams can work on different parts independently
3. **Easy Deployment**: Infrastructure is separated from application code
4. **Scalability**: Each component can be scaled independently
5. **Maintainability**: Easier to understand and maintain the codebase

## 🔧 Development Workflow

1. **Backend Development**: Work in `backend/` folder
2. **Frontend Development**: Work in `frontend/` folder
3. **Infrastructure Changes**: Work in `infra/` folder
4. **Deployment**: Use `infra/docker-compose.yml`

## 📝 Documentation

Each folder contains its own README.md with specific instructions:
- `backend/README.md` - Backend development guide
- `frontend/README.md` - Frontend development guide
- `infra/README.md` - Infrastructure and deployment guide
- `README.md` - Main project documentation
