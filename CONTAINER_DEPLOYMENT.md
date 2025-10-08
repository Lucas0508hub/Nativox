# 🐳 AudioSeg Container Deployment Guide

This guide explains how to run AudioSeg in a containerized environment with persistent storage and proper configuration.

## 📋 Prerequisites

- Docker (20.10+)
- Docker Compose (2.0+)
- At least 4GB RAM available
- At least 10GB disk space

## 🚀 Quick Start

### Production Deployment

```bash
# Start the application in production mode
./scripts/start.sh prod

# Or manually:
docker-compose up -d
```

The application will be available at: **http://localhost:5000**

### Development Deployment

```bash
# Start the application in development mode
./scripts/start.sh dev

# Or manually:
docker-compose -f docker-compose.dev.yml up -d
```

The application will be available at: **http://localhost:3000**

## 🛠 Management Commands

```bash
# View container status
./scripts/start.sh status

# View logs
./scripts/start.sh logs          # Production logs
./scripts/start.sh logs dev      # Development logs

# Stop all containers
./scripts/start.sh stop

# Clean up everything (containers, volumes, images)
./scripts/start.sh cleanup
```

## 📁 Persistent Storage

The containerized setup includes persistent storage for:

- **Database**: PostgreSQL data is stored in `postgres_data` volume
- **Audio Files**: Uploaded files are stored in `uploads_data` volume
- **Logs**: Application logs are stored in `./logs` directory

## 🔧 Configuration

### Environment Variables

Copy `env.example` to `.env` and modify as needed:

```bash
cp env.example .env
```

Key variables:
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key
- `NODE_ENV`: Environment (production/development)
- `PORT`: Application port

### Database

The PostgreSQL container automatically:
- Creates the database
- Runs migrations
- Inserts default languages
- Creates admin user

Default database credentials:
- **Database**: `nativox`
- **User**: `nativox`
- **Password**: `nativox_password`
- **Port**: `5432`

## 🏗 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AudioSeg App  │    │   PostgreSQL    │    │  Persistent     │
│   (Port 5000)   │◄──►│   (Port 5432)   │    │  Volumes        │
│                 │    │                 │    │                 │
│ - Web Server    │    │ - Database      │    │ - Audio Files   │
│ - API Routes    │    │ - Migrations    │    │ - Database Data │
│ - File Upload   │    │ - Default Data  │    │ - Logs          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔍 Troubleshooting

### Container Won't Start

```bash
# Check container logs
docker-compose logs

# Check if ports are available
netstat -tulpn | grep :5000
netstat -tulpn | grep :5432
```

### Database Connection Issues

```bash
# Check database container
docker-compose ps postgres

# Connect to database directly
docker-compose exec postgres psql -U nativox -d nativox
```

### File Upload Issues

```bash
# Check uploads volume
docker volume inspect nativox_uploads_data

# Check file permissions
docker-compose exec app ls -la /app/uploads
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Increase memory limits in docker-compose.yml
```

## 🔒 Security Considerations

### Production Deployment

1. **Change default passwords**:
   ```bash
   # Update in docker-compose.yml
   POSTGRES_PASSWORD=your-secure-password
   ```

2. **Use strong session secret**:
   ```bash
   SESSION_SECRET=your-very-long-random-session-secret
   ```

3. **Enable HTTPS** (use reverse proxy like nginx)

4. **Restrict database access** (don't expose port 5432)

### Network Security

```yaml
# In docker-compose.yml, remove port exposure for production
postgres:
  # ports:
  #   - "5432:5432"  # Remove this line for production
```

## 📊 Monitoring

### Health Checks

The containers include health checks:
- **App**: HTTP endpoint `/api/languages`
- **Database**: `pg_isready` command

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f app
docker-compose logs -f postgres
```

### Backup

```bash
# Backup database
docker-compose exec postgres pg_dump -U nativox nativox > backup.sql

# Backup uploads
docker run --rm -v nativox_uploads_data:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz -C /data .
```

## 🚀 Scaling

### Horizontal Scaling

For multiple app instances:

```yaml
# In docker-compose.yml
app:
  # ... existing config
  deploy:
    replicas: 3
```

### Load Balancer

Use nginx or traefik for load balancing:

```yaml
nginx:
  image: nginx:alpine
  ports:
    - "80:80"
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf
  depends_on:
    - app
```

## 📝 Development Workflow

1. **Start development environment**:
   ```bash
   ./scripts/start.sh dev
   ```

2. **Make code changes** (hot reload enabled)

3. **View logs**:
   ```bash
   ./scripts/start.sh logs dev
   ```

4. **Stop when done**:
   ```bash
   ./scripts/start.sh stop
   ```

## 🆘 Support

If you encounter issues:

1. Check the logs: `./scripts/start.sh logs`
2. Verify Docker is running: `docker info`
3. Check port availability: `netstat -tulpn | grep :5000`
4. Restart containers: `./scripts/start.sh stop && ./scripts/start.sh prod`

---

**Happy containerizing! 🐳🎵**
