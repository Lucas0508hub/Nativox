# Infrastructure

Docker Compose setup for the Nativox application.

## Structure

- `docker-compose.yml` - Main compose file
- `init-db.sql` - Database initialization
- `uploads/` - File storage
- `.dockerignore` - Docker ignore file

## Usage

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Build images
docker-compose build
```

## Services

- **PostgreSQL** - Database (port 5432)
- **Backend** - FastAPI application (port 5000)
- **Frontend** - React application (port 5173)
