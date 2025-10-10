#!/bin/bash

# Simple local development setup for Nativox

echo "Starting Nativox locally..."

# Check if PostgreSQL is running
if ! docker ps | grep -q nativox-postgres; then
    echo "Starting PostgreSQL database..."
    docker-compose -f docker-compose.simple.yml up -d postgres
    
    # Wait for database to be ready
    echo "Waiting for database to be ready..."
    sleep 5
fi

# Set environment variables for local development
export NODE_ENV=development
export DATABASE_URL=postgresql://nativox:nativox123@localhost:5432/nativox
export SESSION_SECRET=dev-session-secret-key
export PORT=3001

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the development server
echo "Starting development server..."
npm run dev
