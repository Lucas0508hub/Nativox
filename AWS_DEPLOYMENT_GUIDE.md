# 🚀 AudioSeg AWS EC2 Deployment Guide

Complete guide for deploying AudioSeg on AWS EC2 with Docker containers, S3 storage, and production-ready configuration.

## 📋 Prerequisites

- AWS Account with appropriate permissions
- Domain name (optional, but recommended)
- Basic knowledge of AWS services
- SSH key pair for EC2 access

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CloudFront    │    │   EC2 Instance  │    │   S3 Bucket     │
│   (CDN)         │◄──►│   (Docker)      │◄──►│   (Audio Files) │
│                 │    │                 │    │                 │
│ - Global CDN    │    │ - Nginx Proxy   │    │ - File Storage  │
│ - SSL/TLS       │    │ - AudioSeg App  │    │ - Backup        │
│ - Caching       │    │ - PostgreSQL    │    │ - Versioning    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start (Automated)

### Option 1: CloudFormation Stack (Recommended)

1. **Create S3 Bucket:**
   ```bash
   aws s3 mb s3://your-audioseg-bucket-name
   ```

2. **Deploy Infrastructure:**
   ```bash
   aws cloudformation create-stack \
     --stack-name audioseg-production \
     --template-body file://aws/cloudformation.yml \
     --parameters \
       ParameterKey=KeyPairName,ParameterValue=your-key-pair \
       ParameterKey=InstanceType,ParameterValue=t3.medium \
       ParameterKey=DomainName,ParameterValue=your-domain.com \
       ParameterKey=Email,ParameterValue=admin@your-domain.com \
       ParameterKey=S3BucketName,ParameterValue=your-audioseg-bucket-name \
     --capabilities CAPABILITY_IAM
   ```

3. **Wait for Stack Creation:**
   ```bash
   aws cloudformation wait stack-create-complete \
     --stack-name audioseg-production
   ```

4. **Get Instance Information:**
   ```bash
   aws cloudformation describe-stacks \
     --stack-name audioseg-production \
     --query 'Stacks[0].Outputs'
   ```

### Option 2: Manual EC2 Setup

1. **Launch EC2 Instance:**
   - AMI: Amazon Linux 2
   - Instance Type: t3.medium (minimum)
   - Security Group: Allow ports 22, 80, 443
   - Storage: 20GB+ EBS volume

2. **Connect to Instance:**
   ```bash
   ssh -i your-key.pem ec2-user@your-instance-ip
   ```

3. **Run Setup Script:**
   ```bash
   curl -fsSL https://raw.githubusercontent.com/your-repo/audioseg/main/scripts/setup-ec2.sh | bash
   ```

## 🔧 Configuration

### 1. Environment Variables

Create `.env` file with your configuration:

```bash
# Database Configuration
POSTGRES_DB=nativox
POSTGRES_USER=nativox
POSTGRES_PASSWORD=your-secure-password

# Session Configuration
SESSION_SECRET=your-super-secret-session-key

# Application Configuration
NODE_ENV=production
PORT=5000

# Storage Configuration
STORAGE_PROVIDER=aws-s3
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-audioseg-bucket-name
AWS_S3_REGION=us-east-1

# Domain Configuration
DOMAIN=your-domain.com
EMAIL=admin@your-domain.com

# Monitoring
GRAFANA_PASSWORD=your-grafana-password
```

### 2. AWS IAM Permissions

Create IAM user with these permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::your-audioseg-bucket-name",
                "arn:aws:s3:::your-audioseg-bucket-name/*"
            ]
        }
    ]
}
```

### 3. S3 Bucket Configuration

```bash
# Create bucket
aws s3 mb s3://your-audioseg-bucket-name

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket your-audioseg-bucket-name \
  --versioning-configuration Status=Enabled

# Configure CORS
aws s3api put-bucket-cors \
  --bucket your-audioseg-bucket-name \
  --cors-configuration file://cors-config.json
```

CORS Configuration (`cors-config.json`):
```json
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
            "AllowedOrigins": ["*"],
            "MaxAgeSeconds": 3000
        }
    ]
}
```

## 🚀 Deployment

### 1. Clone Repository

```bash
cd /opt/audioseg
git clone https://github.com/your-repo/audioseg.git .
```

### 2. Configure Environment

```bash
cp .env.template .env
nano .env  # Edit with your configuration
```

### 3. Deploy Application

```bash
./scripts/deploy-ec2.sh
```

### 4. Verify Deployment

```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# Check application health
curl -f http://localhost/api/health

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

## 🔒 SSL Certificate Setup

### Automatic (with domain)

If you have a domain name, SSL certificates are automatically configured:

```bash
# The deployment script will:
# 1. Install Certbot
# 2. Obtain Let's Encrypt certificate
# 3. Configure Nginx
# 4. Set up auto-renewal
```

### Manual (without domain)

For testing without a domain:

```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/key.pem \
  -out /etc/nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

## 📊 Monitoring & Logging

### 1. Application Monitoring

- **Grafana Dashboard**: https://your-domain.com:3000
- **Health Check**: https://your-domain.com/api/health
- **System Logs**: `/var/log/audioseg/`

### 2. CloudWatch Integration

```bash
# Start CloudWatch agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
  -s
```

### 3. Log Management

```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs -f app

# View system logs
tail -f /var/log/audioseg/system-monitor.log

# View Nginx logs
docker-compose -f docker-compose.prod.yml logs -f nginx
```

## 🔄 Backup & Recovery

### 1. Automated Backups

Backups run daily at 2 AM:

```bash
# Manual backup
./backup.sh

# Backup includes:
# - Database dump
# - Uploaded files
# - Configuration files
```

### 2. Restore from Backup

```bash
# Restore database
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U nativox -d nativox < backup.sql

# Restore files
tar -xzf uploads_backup.tar.gz -C /opt/audioseg/
```

## 🔧 Management Commands

### Application Management

```bash
# Start services
sudo systemctl start audioseg

# Stop services
sudo systemctl stop audioseg

# Restart services
sudo systemctl restart audioseg

# View status
sudo systemctl status audioseg
```

### Container Management

```bash
# View running containers
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart specific service
docker-compose -f docker-compose.prod.yml restart app

# Update application
./update.sh
```

### System Management

```bash
# Monitor system resources
htop

# Check disk usage
df -h

# Check memory usage
free -h

# View system logs
journalctl -u audioseg -f
```

## 🚨 Troubleshooting

### Common Issues

1. **Containers not starting:**
   ```bash
   # Check logs
   docker-compose -f docker-compose.prod.yml logs
   
   # Check disk space
   df -h
   
   # Check memory
   free -h
   ```

2. **Database connection issues:**
   ```bash
   # Check database container
   docker-compose -f docker-compose.prod.yml logs postgres
   
   # Test connection
   docker-compose -f docker-compose.prod.yml exec postgres psql -U nativox -d nativox
   ```

3. **SSL certificate issues:**
   ```bash
   # Check certificate
   openssl x509 -in /etc/nginx/ssl/cert.pem -text -noout
   
   # Renew certificate
   sudo certbot renew
   ```

4. **File upload issues:**
   ```bash
   # Check S3 permissions
   aws s3 ls s3://your-bucket-name
   
   # Check upload directory
   ls -la /opt/audioseg/uploads/
   ```

### Performance Optimization

1. **Increase instance size** for better performance
2. **Enable CloudFront** for global CDN
3. **Use RDS** for database scaling
4. **Implement Redis** for session storage

## 💰 Cost Optimization

### EC2 Instance Types

| Instance Type | vCPUs | RAM | Cost/Month | Use Case |
|---------------|-------|-----|------------|----------|
| t3.small      | 2     | 2GB | ~$15       | Development |
| t3.medium     | 2     | 4GB | ~$30       | Small Production |
| t3.large      | 2     | 8GB | ~$60       | Medium Production |
| m5.large      | 2     | 8GB | ~$70       | High Performance |

### S3 Storage Costs

- **Standard Storage**: $0.023/GB/month
- **Infrequent Access**: $0.0125/GB/month
- **Glacier**: $0.004/GB/month

### CloudFront Costs

- **Data Transfer**: $0.085/GB
- **Requests**: $0.0075/10,000 requests

## 🔐 Security Best Practices

1. **Use IAM roles** instead of access keys
2. **Enable VPC** for network isolation
3. **Use security groups** to restrict access
4. **Enable CloudTrail** for audit logging
5. **Regular security updates**
6. **Backup encryption**
7. **SSL/TLS everywhere**

## 📈 Scaling

### Horizontal Scaling

1. **Load Balancer**: Use Application Load Balancer
2. **Auto Scaling**: Configure Auto Scaling Groups
3. **Database**: Use RDS with read replicas
4. **Storage**: Use S3 with CloudFront

### Vertical Scaling

1. **Increase instance size**
2. **Add more storage**
3. **Optimize application code**
4. **Use caching layers**

## 🆘 Support

### Getting Help

1. **Check logs**: `/var/log/audioseg/`
2. **Monitor resources**: `htop`, `df -h`
3. **Test connectivity**: `curl -f http://localhost/api/health`
4. **Restart services**: `sudo systemctl restart audioseg`

### Emergency Procedures

1. **Stop all services**: `sudo systemctl stop audioseg`
2. **Backup data**: `./backup.sh`
3. **Check system resources**: `htop`, `df -h`
4. **Restart from backup**: Follow restore procedures

---

**Your AudioSeg application is now running on AWS EC2 with production-ready configuration! 🎉**
