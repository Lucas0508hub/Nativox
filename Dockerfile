# Use Node.js 20 LTS as base image
FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache \
    ffmpeg \
    postgresql-client \
    python3 \
    make \
    g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Copy startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Create uploads directory with proper permissions
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

# Switch to non-root user
USER node

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/languages || exit 1

# Start the application
CMD ["/app/start.sh"]
