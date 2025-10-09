#!/bin/bash

# Shemasts Container Startup Script
echo "🚀 Starting Shemasts Application..."

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
until pg_isready -h postgres -p 5432 -U nativox -d nativox; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "✅ Database is ready!"

# Run database migrations
echo "🔄 Running database migrations..."
npm run db:push

# Create necessary directories
mkdir -p /app/uploads
mkdir -p /app/logs

# Set proper permissions
chown -R node:node /app/uploads /app/logs

echo "🎵 Starting Shemasts server..."

# Start the application
exec npm start
