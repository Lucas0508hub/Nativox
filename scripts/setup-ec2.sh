#!/bin/bash

# AudioSeg EC2 Setup Script
# Run this script on a fresh EC2 instance to set up AudioSeg

set -e

echo "🚀 AudioSeg EC2 Setup Script"
echo "============================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if running on Amazon Linux
if ! grep -q "Amazon Linux" /etc/os-release; then
    print_warning "This script is optimized for Amazon Linux. Proceeding anyway..."
fi

# Update system
print_status "Updating system packages..."
sudo yum update -y

# Install required packages
print_status "Installing required packages..."
sudo yum install -y \
    git \
    curl \
    wget \
    unzip \
    htop \
    tree \
    jq \
    bc \
    openssl

# Install Docker
print_status "Installing Docker..."
if ! command -v docker &> /dev/null; then
    sudo yum install -y docker
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -a -G docker $USER
    print_success "Docker installed successfully"
else
    print_success "Docker is already installed"
fi

# Install Docker Compose
print_status "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | jq -r .tag_name)
    sudo curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose installed successfully"
else
    print_success "Docker Compose is already installed"
fi

# Install AWS CLI v2
print_status "Installing AWS CLI v2..."
if ! command -v aws &> /dev/null; then
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    sudo ./aws/install
    rm -rf aws awscliv2.zip
    print_success "AWS CLI v2 installed successfully"
else
    print_success "AWS CLI is already installed"
fi

# Install Node.js (for development tools)
print_status "Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
    sudo yum install -y nodejs
    print_success "Node.js installed successfully"
else
    print_success "Node.js is already installed"
fi

# Install Certbot for SSL certificates
print_status "Installing Certbot..."
if ! command -v certbot &> /dev/null; then
    sudo yum install -y python3-pip
    sudo pip3 install certbot certbot-nginx
    print_success "Certbot installed successfully"
else
    print_success "Certbot is already installed"
fi

# Install CloudWatch agent
print_status "Installing CloudWatch agent..."
if ! command -v amazon-cloudwatch-agent-ctl &> /dev/null; then
    wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
    sudo rpm -U ./amazon-cloudwatch-agent.rpm
    rm amazon-cloudwatch-agent.rpm
    print_success "CloudWatch agent installed successfully"
else
    print_success "CloudWatch agent is already installed"
fi

# Configure firewall
print_status "Configuring firewall..."
sudo systemctl start firewalld
sudo systemctl enable firewalld
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
print_success "Firewall configured"

# Create application directory
APP_DIR="/opt/audioseg"
print_status "Creating application directory: $APP_DIR"
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Create SSL certificates directory
print_status "Creating SSL certificates directory..."
sudo mkdir -p /etc/nginx/ssl
sudo chown $USER:$USER /etc/nginx/ssl

# Create log directories
print_status "Creating log directories..."
sudo mkdir -p /var/log/audioseg
sudo chown $USER:$USER /var/log/audioseg

# Create backup directory
print_status "Creating backup directory..."
sudo mkdir -p /opt/backups/audioseg
sudo chown $USER:$USER /opt/backups/audioseg

# Set up log rotation
print_status "Setting up log rotation..."
sudo tee /etc/logrotate.d/audioseg > /dev/null << 'EOF'
/var/log/audioseg/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 ec2-user ec2-user
    postrotate
        /usr/local/bin/docker-compose -f /opt/audioseg/docker-compose.prod.yml restart app
    endscript
}
EOF

print_success "Log rotation configured"

# Create system monitoring script
print_status "Creating system monitoring script..."
cat > /tmp/monitor-system.sh << 'EOF'
#!/bin/bash
# System monitoring script for AudioSeg

LOG_FILE="/var/log/audioseg/system-monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "[$DATE] WARNING: Disk usage is ${DISK_USAGE}%" >> $LOG_FILE
fi

# Check memory usage
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEMORY_USAGE -gt 80 ]; then
    echo "[$DATE] WARNING: Memory usage is ${MEMORY_USAGE}%" >> $LOG_FILE
fi

# Check Docker containers
if ! docker ps | grep -q "audioseg"; then
    echo "[$DATE] ERROR: AudioSeg containers are not running" >> $LOG_FILE
fi

# Check application health
if ! curl -f http://localhost/api/health > /dev/null 2>&1; then
    echo "[$DATE] ERROR: Application health check failed" >> $LOG_FILE
fi

echo "[$DATE] System check completed" >> $LOG_FILE
EOF

sudo mv /tmp/monitor-system.sh /usr/local/bin/monitor-system.sh
sudo chmod +x /usr/local/bin/monitor-system.sh

# Schedule system monitoring
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/monitor-system.sh") | crontab -

print_success "System monitoring configured"

# Create cleanup script
print_status "Creating cleanup script..."
cat > /tmp/cleanup.sh << 'EOF'
#!/bin/bash
# Cleanup script for AudioSeg

# Clean Docker system
docker system prune -f

# Clean old logs
find /var/log/audioseg -name "*.log" -mtime +30 -delete

# Clean old backups
find /opt/backups/audioseg -name "*.sql" -mtime +7 -delete
find /opt/backups/audioseg -name "*.tar.gz" -mtime +7 -delete

# Clean temporary files
find /tmp -name "*.tmp" -mtime +1 -delete

echo "Cleanup completed: $(date)"
EOF

sudo mv /tmp/cleanup.sh /usr/local/bin/cleanup.sh
sudo chmod +x /usr/local/bin/cleanup.sh

# Schedule cleanup
(crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/cleanup.sh") | crontab -

print_success "Cleanup script configured"

# Create environment template
print_status "Creating environment template..."
cat > $APP_DIR/.env.template << 'EOF'
# Database Configuration
POSTGRES_DB=nativox
POSTGRES_USER=nativox
POSTGRES_PASSWORD=your-secure-password-here

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-here

# Application Configuration
NODE_ENV=production
PORT=5000

# Storage Configuration
STORAGE_PROVIDER=aws-s3
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-s3-bucket-name
AWS_S3_REGION=us-east-1

# File Upload Configuration
MAX_FILE_SIZE=500MB
UPLOAD_DIR=/app/uploads
TEMP_UPLOAD_DIR=/app/temp-uploads

# Logging
LOG_LEVEL=info
LOG_DIR=/app/logs

# Domain Configuration (optional)
DOMAIN=your-domain.com
EMAIL=admin@your-domain.com

# Monitoring
GRAFANA_PASSWORD=your-grafana-password
EOF

print_success "Environment template created"

# Create deployment instructions
print_status "Creating deployment instructions..."
cat > $APP_DIR/DEPLOYMENT_INSTRUCTIONS.md << 'EOF'
# AudioSeg EC2 Deployment Instructions

## Prerequisites
- EC2 instance with at least 2GB RAM
- Security group allowing ports 22, 80, 443
- AWS credentials configured
- S3 bucket for audio storage

## Quick Start

1. **Clone the repository:**
   ```bash
   cd /opt/audioseg
   git clone https://github.com/your-repo/audioseg.git .
   ```

2. **Configure environment:**
   ```bash
   cp .env.template .env
   nano .env  # Edit with your configuration
   ```

3. **Deploy the application:**
   ```bash
   ./scripts/deploy-ec2.sh
   ```

## Configuration

### Required Environment Variables:
- `POSTGRES_PASSWORD`: Secure database password
- `SESSION_SECRET`: Secure session encryption key
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `AWS_S3_BUCKET`: S3 bucket name for audio storage

### Optional Environment Variables:
- `DOMAIN`: Your domain name (for SSL)
- `EMAIL`: Email for SSL certificate notifications
- `GRAFANA_PASSWORD`: Password for Grafana monitoring

## Management Commands

- **View logs:** `docker-compose -f docker-compose.prod.yml logs -f`
- **Restart services:** `sudo systemctl restart audioseg`
- **Update application:** `./update.sh`
- **Backup data:** `./backup.sh`
- **Monitor system:** `./monitor.sh`

## Monitoring

- **Application:** https://your-domain.com
- **Grafana:** https://your-domain.com:3000
- **System logs:** `/var/log/audioseg/`

## Troubleshooting

1. **Check container status:**
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

2. **Check application logs:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs app
   ```

3. **Check system resources:**
   ```bash
   htop
   df -h
   ```

4. **Restart all services:**
   ```bash
   sudo systemctl restart audioseg
   ```
EOF

print_success "Deployment instructions created"

# Set up CloudWatch monitoring
print_status "Setting up CloudWatch monitoring..."
sudo tee /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json > /dev/null << 'EOF'
{
    "metrics": {
        "namespace": "AudioSeg/EC2",
        "metrics_collected": {
            "cpu": {
                "measurement": ["cpu_usage_idle", "cpu_usage_iowait", "cpu_usage_user", "cpu_usage_system"],
                "metrics_collection_interval": 60
            },
            "disk": {
                "measurement": ["used_percent"],
                "metrics_collection_interval": 60,
                "resources": ["*"]
            },
            "diskio": {
                "measurement": ["io_time"],
                "metrics_collection_interval": 60,
                "resources": ["*"]
            },
            "mem": {
                "measurement": ["mem_used_percent"],
                "metrics_collection_interval": 60
            }
        }
    },
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/var/log/audioseg/*.log",
                        "log_group_name": "/aws/ec2/audioseg",
                        "log_stream_name": "{instance_id}/application"
                    }
                ]
            }
        }
    }
}
EOF

print_success "CloudWatch monitoring configured"

# Final instructions
echo ""
print_success "EC2 setup completed successfully! 🎉"
echo ""
echo "📋 Next Steps:"
echo "1. Clone your AudioSeg repository to $APP_DIR"
echo "2. Copy .env.template to .env and configure it"
echo "3. Run the deployment script: ./scripts/deploy-ec2.sh"
echo ""
echo "📁 Important directories:"
echo "   Application: $APP_DIR"
echo "   Logs: /var/log/audioseg"
echo "   Backups: /opt/backups/audioseg"
echo "   SSL certificates: /etc/nginx/ssl"
echo ""
echo "🔧 Management commands:"
echo "   Monitor system: /usr/local/bin/monitor-system.sh"
echo "   Cleanup: /usr/local/bin/cleanup.sh"
echo "   View logs: tail -f /var/log/audioseg/system-monitor.log"
echo ""
print_warning "Please log out and log back in for Docker group changes to take effect"
