# 🚀 Simple Shemasts Deployment on EC2

**No complex stuff - just the basics!**

## 📋 What You Need

1. **EC2 Instance** (t3.medium or larger)
2. **AWS S3 Bucket** for audio files
3. **AWS Access Keys** with S3 permissions
4. **Domain name** (optional)

## 🚀 Super Simple Setup

### Step 1: Launch EC2 Instance

1. Go to AWS Console → EC2
2. Launch Instance:
   - **AMI**: Amazon Linux 2
   - **Instance Type**: t3.medium (2 vCPU, 4GB RAM)
   - **Security Group**: Allow ports 22 (SSH) and 3000 (App)
   - **Storage**: 20GB EBS volume

### Step 2: Connect to Your Instance

```bash
ssh -i your-key.pem ec2-user@your-instance-ip
```

### Step 3: Deploy Shemasts

```bash
# Clone your repository
git clone https://github.com/your-repo/audioseg.git
cd audioseg

# Make script executable
chmod +x scripts/simple-deploy.sh

# Run deployment
./scripts/simple-deploy.sh
```

### Step 4: Configure AWS

Edit the `.env` file with your AWS credentials:

```bash
nano .env
```

```env
# AWS Configuration (REQUIRED)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-audioseg-bucket
```

### Step 5: Restart with AWS Config

```bash
docker-compose -f docker-compose.dev-simple.yml down
docker-compose -f docker-compose.dev-simple.yml up -d

# Add default languages (if needed)
docker-compose -f docker-compose.dev-simple.yml exec -T postgres psql -U nativox -d nativox -c "INSERT INTO languages (code, name, is_active) VALUES ('en', 'English', true), ('pt', 'Portuguese', true), ('es', 'Spanish', true), ('fr', 'French', true), ('de', 'German', true) ON CONFLICT (code) DO NOTHING;"
```

## 🎉 That's It!

Your app is now running at: `http://your-instance-ip:3000`

## 🔧 Simple Management

```bash
# View logs
docker-compose -f docker-compose.dev-simple.yml logs -f

# Stop app
docker-compose -f docker-compose.dev-simple.yml down

# Start app
docker-compose -f docker-compose.dev-simple.yml up -d

# Restart app
docker-compose -f docker-compose.dev-simple.yml restart
```

## 💰 Cost

- **EC2 t3.medium**: ~$30/month
- **S3 Storage**: ~$0.023/GB/month
- **Total**: ~$35-50/month for small usage

## 🔒 Security (Optional)

If you want HTTPS later, you can add it:

```bash
# Install nginx (optional)
sudo yum install -y nginx

# Configure nginx to proxy to your app
# (This is optional - HTTP works fine for testing)
```

## 🆘 Troubleshooting

### App won't start?
```bash
# Check logs
docker-compose -f docker-compose.dev-simple.yml logs

# Check if ports are free
netstat -tulpn | grep :5000
```

### Can't access from browser?
```bash
# Check security group allows port 3000
# Check if app is running
curl http://localhost:3000/api/languages
```

### Database issues?
```bash
# Check database container
docker-compose -f docker-compose.dev-simple.yml logs postgres

# Connect to database
docker-compose -f docker-compose.dev-simple.yml exec postgres psql -U nativox -d nativox
```

## 🎯 Why This is Better

✅ **Simple**: Just 2 containers, no complex setup  
✅ **Fast**: Deploy in 5 minutes  
✅ **Cheap**: ~$35/month total cost  
✅ **Reliable**: Docker handles everything  
✅ **Scalable**: Easy to upgrade later  

## 🚀 Next Steps (Optional)

Once you have this working, you can add:
- Custom domain with SSL
- Load balancer for multiple instances
- Monitoring and logging
- Auto-scaling

But for now, this simple setup will work perfectly! 🎉
