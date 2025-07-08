#!/bin/bash

# Canvas LMS MCP Server - Google Cloud Deployment Script
# This script automates the deployment process to Google Cloud Run

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID=""
REGION="us-central1"
SERVICE_NAME="canvas-mcp-server"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
MEMORY="512Mi"
CPU="1"
MIN_INSTANCES="0"
MAX_INSTANCES="10"

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if gcloud is installed
    if ! command_exists gcloud; then
        print_error "Google Cloud CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if docker is installed
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    # Check if user is authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        print_error "Not authenticated with Google Cloud. Run 'gcloud auth login' first."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to get project ID
get_project_id() {
    if [ -z "$PROJECT_ID" ]; then
        PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
        if [ -z "$PROJECT_ID" ]; then
            print_error "No project ID set. Please set it with 'gcloud config set project PROJECT_ID'"
            exit 1
        fi
    fi
    print_status "Using project: $PROJECT_ID"
    IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
}

# Function to enable required APIs
enable_apis() {
    print_status "Enabling required Google Cloud APIs..."
    
    gcloud services enable cloudbuild.googleapis.com --project=$PROJECT_ID
    gcloud services enable run.googleapis.com --project=$PROJECT_ID
    gcloud services enable containerregistry.googleapis.com --project=$PROJECT_ID
    
    print_success "APIs enabled"
}

# Function to build Docker image
build_image() {
    print_status "Building Docker image..."
    
    # Build the image
    docker build -t $IMAGE_NAME:latest .
    
    print_success "Docker image built: $IMAGE_NAME:latest"
}

# Function to push image to registry
push_image() {
    print_status "Pushing image to Google Container Registry..."
    
    # Configure Docker to use gcloud as credential helper
    gcloud auth configure-docker --quiet
    
    # Push the image
    docker push $IMAGE_NAME:latest
    
    print_success "Image pushed to registry"
}

# Function to deploy to Cloud Run
deploy_service() {
    print_status "Deploying to Cloud Run..."
    
    # Get environment variables
    read -p "Enter your Canvas LMS base URL (e.g., https://your-instance.instructure.com): " CANVAS_BASE_URL
    read -s -p "Enter a secure JWT secret: " JWT_SECRET
    echo
    
    # Deploy the service
    gcloud run deploy $SERVICE_NAME \
        --image $IMAGE_NAME:latest \
        --platform managed \
        --region $REGION \
        --allow-unauthenticated \
        --port 3000 \
        --memory $MEMORY \
        --cpu $CPU \
        --min-instances $MIN_INSTANCES \
        --max-instances $MAX_INSTANCES \
        --set-env-vars NODE_ENV=production \
        --set-env-vars JWT_SECRET="$JWT_SECRET" \
        --set-env-vars CANVAS_BASE_URL="$CANVAS_BASE_URL" \
        --set-env-vars LOG_LEVEL=info \
        --project=$PROJECT_ID
    
    print_success "Service deployed to Cloud Run"
}

# Function to get service URL
get_service_url() {
    print_status "Getting service URL..."
    
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
        --region $REGION \
        --project=$PROJECT_ID \
        --format 'value(status.url)')
    
    print_success "Service URL: $SERVICE_URL"
}

# Function to test deployment
test_deployment() {
    print_status "Testing deployment..."
    
    # Test health endpoint
    if curl -s -f "$SERVICE_URL/health" > /dev/null; then
        print_success "Health check passed"
    else
        print_error "Health check failed"
        return 1
    fi
    
    # Test info endpoint
    if curl -s -f "$SERVICE_URL/info" > /dev/null; then
        print_success "Info endpoint working"
    else
        print_error "Info endpoint failed"
        return 1
    fi
    
    print_success "Deployment test passed"
}

# Function to show deployment summary
show_summary() {
    echo
    echo "=================================="
    echo "   DEPLOYMENT SUMMARY"
    echo "=================================="
    echo "Project ID: $PROJECT_ID"
    echo "Service Name: $SERVICE_NAME"
    echo "Region: $REGION"
    echo "Service URL: $SERVICE_URL"
    echo
    echo "Endpoints:"
    echo "  Health Check: $SERVICE_URL/health"
    echo "  Server Info: $SERVICE_URL/info"
    echo "  MCP Endpoint: $SERVICE_URL/mcp"
    echo "  Canvas Token Validation: $SERVICE_URL/canvas/validate-token"
    echo
    echo "Next Steps:"
    echo "1. Test the endpoints above"
    echo "2. Configure your n8n workflows to use: $SERVICE_URL/mcp"
    echo "3. Set up monitoring and alerts in Google Cloud Console"
    echo "4. Configure custom domain if needed"
    echo
    echo "For production use, consider:"
    echo "- Setting up Cloud SQL for persistent storage"
    echo "- Adding Memorystore Redis for caching"
    echo "- Using Secret Manager for sensitive data"
    echo "- Setting up proper monitoring and logging"
    echo
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  -p, --project PROJECT_ID    Set Google Cloud project ID"
    echo "  -r, --region REGION         Set deployment region (default: us-central1)"
    echo "  -s, --service SERVICE_NAME  Set service name (default: canvas-mcp-server)"
    echo "  -m, --memory MEMORY         Set memory allocation (default: 512Mi)"
    echo "  -c, --cpu CPU               Set CPU allocation (default: 1)"
    echo "  --min-instances MIN         Set minimum instances (default: 0)"
    echo "  --max-instances MAX         Set maximum instances (default: 10)"
    echo "  -h, --help                  Show this help message"
    echo
    echo "Examples:"
    echo "  $0                          Deploy with default settings"
    echo "  $0 -p my-project -r us-east1"
    echo "  $0 --memory 1Gi --cpu 2 --max-instances 20"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--project)
            PROJECT_ID="$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        -s|--service)
            SERVICE_NAME="$2"
            shift 2
            ;;
        -m|--memory)
            MEMORY="$2"
            shift 2
            ;;
        -c|--cpu)
            CPU="$2"
            shift 2
            ;;
        --min-instances)
            MIN_INSTANCES="$2"
            shift 2
            ;;
        --max-instances)
            MAX_INSTANCES="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Main deployment process
main() {
    echo "=================================="
    echo "Canvas LMS MCP Server Deployment"
    echo "=================================="
    echo
    
    check_prerequisites
    get_project_id
    enable_apis
    build_image
    push_image
    deploy_service
    get_service_url
    test_deployment
    show_summary
    
    print_success "Deployment completed successfully!"
}

# Run main function
main

