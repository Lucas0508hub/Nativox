#!/bin/bash

# AudioSeg EC2 Deployment Script
# This script sets up and deploys AudioSeg on an AWS EC2 instance

set -e

echo "🚀 AudioSeg EC2 Deployment Script"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN=${DOMAIN:-"your-domain.com"}
EMAIL=${EMAIL:-"admin@your-domain.com"}
AWS_REGION=${AWS_REGION:-"us-east-1"}

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_status "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    print_success "Docker installed successfully"
    print_warning "Please log out and log back in for Docker group changes to take effect"
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_status "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose installed successfully"
fi

# Create application directory
APP_DIR="/opt/audioseg"
print_status "Creating application directory: $APP_DIR"
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Copy application files
print_status "Copying application files..."
cp -r . $APP_DIR/
cd $APP_DIR

# Create environment file
print_status "Creating environment configuration..."
cat > .env << EOF
# Database Configuration
POSTGRES_DB=nativox
POSTGRES_USER=nativox
POSTGRES_PASSWORD=$(openssl rand -base64 32)

# Session Configuration
SESSION_SECRET=$(openssl rand -base64 64)

# Application Configuration
NODE_ENV=production
PORT=5000

# Storage Configuration
STORAGE_PROVIDER=aws-s3
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
AWS_S3_BUCKET=${AWS_S3_BUCKET}
AWS_S3_REGION=${AWS_REGION}

# File Upload Configuration
MAX_FILE_SIZE=500MB
UPLOAD_DIR=/app/uploads
TEMP_UPLOAD_DIR=/app/temp-uploads

# Logging
LOG_LEVEL=info
LOG_DIR=/app/logs

# Domain Configuration
DOMAIN=${DOMAIN}
EMAIL=${EMAIL}

# Monitoring
GRAFANA_PASSWORD=$(openssl rand -base64 16)
EOF

print_success "Environment configuration created"

# Create SSL certificates directory
print_status "Setting up SSL certificates..."
sudo mkdir -p /etc/nginx/ssl
sudo chown $USER:$USER /etc/nginx/ssl

# Install Certbot for SSL certificates
if ! command -v certbot &> /dev/null; then
    print_status "Installing Certbot..."
    sudo apt-get update
    sudo apt-get install -y certbot python3-certbot-nginx
    print_success "Certbot installed successfully"
fi

# Create systemd service for the application
print_status "Creating systemd service..."
sudo tee /etc/systemd/system/audioseg.service > /dev/null << EOF
[Unit]
Description=AudioSeg Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
TimeoutStartSec=0
User=$USER
Group=$USER

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
sudo systemctl daemon-reload
sudo systemctl enable audioseg.service

print_success "Systemd service created and enabled"

# Create log rotation configuration
print_status "Setting up log rotation..."
sudo tee /etc/logrotate.d/audioseg > /dev/null << EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        docker-compose -f $APP_DIR/docker-compose.prod.yml restart app
    endscript
}
EOF

print_success "Log rotation configured"

# Create backup script
print_status "Creating backup script..."
cat > backup.sh << 'EOF'
#!/bin/bash
# AudioSeg Backup Script

BACKUP_DIR="/opt/backups/audioseg"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U nativox nativox > $BACKUP_DIR/database_$DATE.sql

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz -C /opt/audioseg uploads/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x backup.sh

# Create cron job for backups
(crontab -l 2>/dev/null; echo "0 2 * * * $APP_DIR/backup.sh") | crontab -

print_success "Backup script created and scheduled"

# Create monitoring script
print_status "Creating monitoring script..."
cat > monitor.sh << 'EOF'
#!/bin/bash
# AudioSeg Monitoring Script

# Check if containers are running
if ! docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo "ERROR: Some containers are not running"
    docker-compose -f docker-compose.prod.yml ps
    exit 1
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "WARNING: Disk usage is ${DISK_USAGE}%"
fi

# Check memory usage
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.2f", $3*100/$2}')
if (( $(echo "$MEMORY_USAGE > 80" | bc -l) )); then
    echo "WARNING: Memory usage is ${MEMORY_USAGE}%"
fi

echo "System health check passed"
EOF

chmod +x monitor.sh

print_success "Monitoring script created"

# Create update script
print_status "Creating update script..."
cat > update.sh << 'EOF'
#!/bin/bash
# AudioSeg Update Script

set -e

echo "🔄 Updating AudioSeg..."

# Pull latest changes
git pull origin main

# Rebuild and restart containers
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 30

# Check if services are running
if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo "✅ Update completed successfully"
else
    echo "❌ Update failed - some services are not running"
    docker-compose -f docker-compose.prod.yml logs
    exit 1
fi
EOF

chmod +x update.sh

print_success "Update script created"

# Set up firewall
print_status "Configuring firewall..."
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw --force enable

print_success "Firewall configured"

# Create SSL certificate (if domain is provided)
if [ "$DOMAIN" != "your-domain.com" ]; then
    print_status "Setting up SSL certificate for $DOMAIN..."
    
    # Stop nginx temporarily
    docker-compose -f docker-compose.prod.yml stop nginx
    
    # Get SSL certificate
    sudo certbot certonly --standalone -d $DOMAIN --email $EMAIL --agree-tos --non-interactive
    
    # Copy certificates to nginx directory
    sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /etc/nginx/ssl/cert.pem
    sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /etc/nginx/ssl/key.pem
    sudo chown $USER:$USER /etc/nginx/ssl/*
    
    # Create certificate renewal script
    cat > renew-ssl.sh << EOF
#!/bin/bash
sudo certbot renew --quiet
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /etc/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /etc/nginx/ssl/key.pem
sudo chown $USER:$USER /etc/nginx/ssl/*
docker-compose -f docker-compose.prod.yml restart nginx
EOF
    
    chmod +x renew-ssl.sh
    
    # Schedule certificate renewal
    (crontab -l 2>/dev/null; echo "0 3 * * 0 $APP_DIR/renew-ssl.sh") | crontab -
    
    print_success "SSL certificate configured"
else
    print_warning "No domain provided - using self-signed certificate"
    
    # Generate self-signed certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/key.pem \
        -out /etc/nginx/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    
    print_success "Self-signed certificate generated"
fi

# Start the application
print_status "Starting AudioSeg application..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
print_status "Waiting for services to start..."
sleep 30

# Check service status
if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    print_success "AudioSeg is running successfully!"
    echo ""
    echo "🌐 Application URLs:"
    if [ "$DOMAIN" != "your-domain.com" ]; then
        echo "   HTTPS: https://$DOMAIN"
    else
        echo "   HTTP:  http://$(curl -s ifconfig.me)"
        echo "   HTTPS: https://$(curl -s ifconfig.me) (self-signed)"
    fi
    echo ""
    echo "📊 Monitoring:"
    echo "   Grafana: https://$DOMAIN:3000 (admin / $GRAFANA_PASSWORD)"
    echo ""
    echo "🔧 Management Commands:"
    echo "   View logs:    docker-compose -f docker-compose.prod.yml logs -f"
    echo "   Restart:      sudo systemctl restart audioseg"
    echo "   Update:       ./update.sh"
    echo "   Backup:       ./backup.sh"
    echo "   Monitor:      ./monitor.sh"
    echo ""
    print_success "Deployment completed successfully! 🎉"
else
    print_error "Deployment failed - some services are not running"
    docker-compose -f docker-compose.prod.yml logs
    exit 1
fi
