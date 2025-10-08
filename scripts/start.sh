#!/bin/bash

# AudioSeg Container Management Script

echo "🐳 AudioSeg Container Management"
echo "================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install docker-compose first."
    exit 1
fi

# Function to start production environment
start_production() {
    echo "🚀 Starting AudioSeg in production mode..."
    docker-compose up -d
    echo "✅ AudioSeg is starting up..."
    echo "🌐 Application will be available at: http://localhost:5000"
    echo "📊 Database will be available at: localhost:5432"
    echo ""
    echo "📋 Useful commands:"
    echo "  View logs: docker-compose logs -f"
    echo "  Stop: docker-compose down"
    echo "  Restart: docker-compose restart"
}

# Function to start development environment
start_development() {
    echo "🔧 Starting AudioSeg in development mode..."
    docker-compose -f docker-compose.dev.yml up -d
    echo "✅ AudioSeg development environment is starting up..."
    echo "🌐 Application will be available at: http://localhost:3000"
    echo "📊 Database will be available at: localhost:5432"
    echo ""
    echo "📋 Useful commands:"
    echo "  View logs: docker-compose -f docker-compose.dev.yml logs -f"
    echo "  Stop: docker-compose -f docker-compose.dev.yml down"
    echo "  Restart: docker-compose -f docker-compose.dev.yml restart"
}

# Function to stop all containers
stop_all() {
    echo "🛑 Stopping all AudioSeg containers..."
    docker-compose down
    docker-compose -f docker-compose.dev.yml down
    echo "✅ All containers stopped."
}

# Function to show status
show_status() {
    echo "📊 AudioSeg Container Status:"
    echo "============================="
    docker-compose ps
    echo ""
    echo "Development containers:"
    docker-compose -f docker-compose.dev.yml ps
}

# Function to show logs
show_logs() {
    if [ "$1" = "dev" ]; then
        docker-compose -f docker-compose.dev.yml logs -f
    else
        docker-compose logs -f
    fi
}

# Function to clean up
cleanup() {
    echo "🧹 Cleaning up AudioSeg containers and volumes..."
    docker-compose down -v
    docker-compose -f docker-compose.dev.yml down -v
    docker system prune -f
    echo "✅ Cleanup complete."
}

# Main script logic
case "$1" in
    "prod"|"production")
        start_production
        ;;
    "dev"|"development")
        start_development
        ;;
    "stop")
        stop_all
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs "$2"
        ;;
    "cleanup")
        cleanup
        ;;
    *)
        echo "Usage: $0 {prod|dev|stop|status|logs|cleanup}"
        echo ""
        echo "Commands:"
        echo "  prod, production  - Start production environment"
        echo "  dev, development  - Start development environment"
        echo "  stop              - Stop all containers"
        echo "  status            - Show container status"
        echo "  logs [dev]        - Show logs (add 'dev' for development)"
        echo "  cleanup           - Clean up containers and volumes"
        echo ""
        echo "Examples:"
        echo "  $0 prod           # Start production"
        echo "  $0 dev            # Start development"
        echo "  $0 logs dev       # Show development logs"
        echo "  $0 stop           # Stop everything"
        ;;
esac
