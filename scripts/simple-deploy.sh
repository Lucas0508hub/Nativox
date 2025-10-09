#!/bin/bash

# Simple Shemasts EC2 Deployment Script
# No complex stuff - just the basics!

set -e

echo "🚀 Simple Shemasts Deployment"
echo "============================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_status "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    print_success "Docker installed"
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_status "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose installed"
fi

# Create environment file
print_status "Creating environment file..."
cat > .env << EOF
# AWS Configuration (REQUIRED)
AWS_ACCESS_KEY_ID=your-aws-access-key-here
AWS_SECRET_ACCESS_KEY=your-aws-secret-key-here
AWS_S3_BUCKET=your-s3-bucket-name-here
EOF

print_success "Environment file created"
print_status "Please edit .env file with your AWS credentials and S3 bucket name"

# Start the application
print_status "Starting Shemasts..."
docker-compose -f docker-compose.dev-simple.yml up -d

# Wait a bit for services to start
print_status "Waiting for services to start..."
sleep 30

# Setup database schema and add default languages
print_status "Setting up database..."
docker-compose -f docker-compose.dev-simple.yml exec -T app npm run db:push
docker-compose -f docker-compose.dev-simple.yml exec -T postgres psql -U nativox -d nativox -c "INSERT INTO languages (code, name, is_active) VALUES ('en', 'English', true), ('pt', 'Portuguese', true), ('es', 'Spanish', true), ('fr', 'French', true), ('de', 'German', true) ON CONFLICT (code) DO NOTHING;"
print_success "Database setup completed"

# Check if it's working
if curl -f http://localhost:3000/api/languages > /dev/null 2>&1; then
    print_success "Shemasts is running! 🎉"
    echo ""
    echo "🌐 Your app is available at:"
    echo "   http://localhost:3000"
    echo "   http://$(curl -s ifconfig.me):3000"
    echo ""
    echo "🔧 Management commands:"
    echo "   View logs: docker-compose -f docker-compose.dev-simple.yml logs -f"
    echo "   Stop:      docker-compose -f docker-compose.dev-simple.yml down"
    echo "   Restart:   docker-compose -f docker-compose.dev-simple.yml restart"
    echo ""
    echo "📝 Note: The app is running in development mode with hot-reloading"
else
    echo "❌ Something went wrong. Check logs:"
    docker-compose -f docker-compose.dev-simple.yml logs
fi
