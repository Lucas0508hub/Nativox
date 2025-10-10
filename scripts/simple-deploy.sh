#!/bin/bash

################################################################################
# Nativox EC2 Deployment Script
# 
# Purpose: Automated deployment script for Nativox application
# Usage: ./simple-deploy.sh
################################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

################################################################################
# CONSTANTS
################################################################################

readonly APP_NAME="Nativox"
readonly COMPOSE_FILE="docker-compose.dev-simple.yml"
readonly APP_PORT=3000
readonly STARTUP_WAIT_SECONDS=30
readonly DATABASE_USER="nativox"
readonly DATABASE_NAME="nativox"

# Terminal colors
readonly COLOR_GREEN='\033[0;32m'
readonly COLOR_BLUE='\033[0;34m'
readonly COLOR_RED='\033[0;31m'
readonly COLOR_YELLOW='\033[1;33m'
readonly COLOR_RESET='\033[0m'

# Docker installation URLs
readonly DOCKER_INSTALL_URL="https://get.docker.com"
readonly DOCKER_COMPOSE_BASE_URL="https://github.com/docker/compose/releases/latest/download"

################################################################################
# UTILITY FUNCTIONS
################################################################################

print_header() {
    echo ""
    echo "🚀 ${APP_NAME} Deployment"
    echo "============================="
    echo ""
}

print_status() {
    echo -e "${COLOR_BLUE}[INFO]${COLOR_RESET} $1"
}

print_success() {
    echo -e "${COLOR_GREEN}[SUCCESS]${COLOR_RESET} $1"
}

print_error() {
    echo -e "${COLOR_RED}[ERROR]${COLOR_RESET} $1" >&2
}

print_warning() {
    echo -e "${COLOR_YELLOW}[WARNING]${COLOR_RESET} $1"
}

################################################################################
# DEPENDENCY MANAGEMENT
################################################################################

install_docker() {
    print_status "Installing Docker..."
    
    local install_script="get-docker.sh"
    
    if ! curl -fsSL "${DOCKER_INSTALL_URL}" -o "${install_script}"; then
        print_error "Failed to download Docker installation script"
        return 1
    fi
    
    sudo sh "${install_script}"
    sudo usermod -aG docker "${USER}"
    rm -f "${install_script}"
    
    print_success "Docker installed successfully"
    print_warning "You may need to log out and back in for Docker group changes to take effect"
}

install_docker_compose() {
    print_status "Installing Docker Compose..."
    
    local compose_url="${DOCKER_COMPOSE_BASE_URL}/docker-compose-$(uname -s)-$(uname -m)"
    local install_path="/usr/local/bin/docker-compose"
    
    if ! sudo curl -L "${compose_url}" -o "${install_path}"; then
        print_error "Failed to download Docker Compose"
        return 1
    fi
    
    sudo chmod +x "${install_path}"
    print_success "Docker Compose installed successfully"
}

check_and_install_dependencies() {
    if ! command -v docker &> /dev/null; then
        install_docker || exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        install_docker_compose || exit 1
    fi
}

################################################################################
# CONFIGURATION MANAGEMENT
################################################################################

create_environment_file() {
    local env_file=".env"
    
    if [[ -f "${env_file}" ]]; then
        print_warning "Environment file already exists. Skipping creation."
        return 0
    fi
    
    print_status "Creating environment file..."
    
    cat > "${env_file}" << 'EOF'
# AWS Configuration (REQUIRED)
# Replace these placeholder values with your actual AWS credentials
AWS_ACCESS_KEY_ID=your-aws-access-key-here
AWS_SECRET_ACCESS_KEY=your-aws-secret-key-here
AWS_S3_BUCKET=your-s3-bucket-name-here
EOF
    
    print_success "Environment file created at ${env_file}"
    print_warning "Please edit ${env_file} with your actual AWS credentials before proceeding"
}

################################################################################
# APPLICATION DEPLOYMENT
################################################################################

run_docker_compose() {
    docker-compose -f "${COMPOSE_FILE}" "$@"
}

start_application() {
    print_status "Starting ${APP_NAME} containers..."
    
    if ! run_docker_compose up -d; then
        print_error "Failed to start application containers"
        return 1
    fi
    
    print_success "Application containers started"
}

wait_for_services() {
    print_status "Waiting ${STARTUP_WAIT_SECONDS} seconds for services to initialize..."
    sleep "${STARTUP_WAIT_SECONDS}"
}

setup_database() {
    print_status "Initializing database schema..."
    
    if ! run_docker_compose exec -T app npm run db:push; then
        print_error "Failed to push database schema"
        return 1
    fi
    
    print_status "Seeding default languages..."
    
    local sql_command="INSERT INTO languages (code, name, is_active) VALUES \
        ('en', 'English', true), \
        ('pt', 'Portuguese', true), \
        ('es', 'Spanish', true), \
        ('fr', 'French', true), \
        ('de', 'German', true) \
        ON CONFLICT (code) DO NOTHING;"
    
    if ! run_docker_compose exec -T postgres \
        psql -U "${DATABASE_USER}" -d "${DATABASE_NAME}" -c "${sql_command}"; then
        print_error "Failed to seed default languages"
        return 1
    fi
    
    print_success "Database setup completed"
}

################################################################################
# HEALTH CHECK
################################################################################

verify_deployment() {
    local api_endpoint="http://localhost:${APP_PORT}/api/languages"
    
    print_status "Verifying deployment..."
    
    if curl -f "${api_endpoint}" > /dev/null 2>&1; then
        display_success_message
        return 0
    else
        display_failure_message
        return 1
    fi
}

display_success_message() {
    print_success "${APP_NAME} is running! 🎉"
    echo ""
    echo "🌐 Your application is available at:"
    echo "   Local:  http://localhost:${APP_PORT}"
    
    local public_ip
    if public_ip=$(curl -s --connect-timeout 3 ifconfig.me 2>/dev/null); then
        echo "   Public: http://${public_ip}:${APP_PORT}"
    fi
    
    echo ""
    echo "🔧 Management Commands:"
    echo "   View logs:  docker-compose -f ${COMPOSE_FILE} logs -f"
    echo "   Stop:       docker-compose -f ${COMPOSE_FILE} down"
    echo "   Restart:    docker-compose -f ${COMPOSE_FILE} restart"
    echo "   Status:     docker-compose -f ${COMPOSE_FILE} ps"
    echo ""
    echo "📝 Note: Application is running in development mode with hot-reloading"
    echo ""
}

display_failure_message() {
    print_error "Deployment verification failed. Something went wrong."
    echo ""
    echo "Displaying recent logs:"
    run_docker_compose logs --tail=50
    echo ""
    echo "For full logs, run:"
    echo "   docker-compose -f ${COMPOSE_FILE} logs"
}

################################################################################
# MAIN EXECUTION
################################################################################

main() {
    print_header
    
    check_and_install_dependencies
    create_environment_file
    start_application
    wait_for_services
    setup_database
    verify_deployment
}

# Execute main function
main "$@"
