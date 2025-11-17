#!/bin/bash
set -e

# Tank Royale 2 - Production Deployment Script
# This script deploys the application to a production server

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        Tank Royale 2 - Production Deployment               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}Error: .env.production file not found!${NC}"
    echo ""
    echo "Create .env.production with the following variables:"
    echo "  POSTGRES_DB=tank_royale_prod"
    echo "  POSTGRES_USER=tank_user"
    echo "  POSTGRES_PASSWORD=<secure-password>"
    echo "  REDIS_PASSWORD=<secure-password>"
    echo "  JWT_SECRET=<secure-secret>"
    echo "  GRAFANA_PASSWORD=<secure-password>"
    exit 1
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

echo -e "${BLUE}[1/6] Checking prerequisites...${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed!${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites check passed${NC}"
echo ""

echo -e "${BLUE}[2/6] Building Docker images...${NC}"
docker compose -f docker-compose.prod.yml build
echo -e "${GREEN}✓ Docker images built successfully${NC}"
echo ""

echo -e "${BLUE}[3/6] Stopping old containers...${NC}"
docker compose -f docker-compose.prod.yml down
echo -e "${GREEN}✓ Old containers stopped${NC}"
echo ""

echo -e "${BLUE}[4/6] Starting services...${NC}"
docker compose -f docker-compose.prod.yml up -d
echo -e "${GREEN}✓ Services started${NC}"
echo ""

echo -e "${BLUE}[5/6] Waiting for services to be healthy...${NC}"
sleep 10

# Check if services are running
if ! docker compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo -e "${RED}Error: Some services failed to start!${NC}"
    docker compose -f docker-compose.prod.yml ps
    exit 1
fi

echo -e "${GREEN}✓ All services are running${NC}"
echo ""

echo -e "${BLUE}[6/6] Running health checks...${NC}"

# Wait for services to be fully ready
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    api_health=$(docker compose -f docker-compose.prod.yml exec -T api wget -q -O- http://localhost:8080/health 2>/dev/null || echo "")
    game_health=$(docker compose -f docker-compose.prod.yml exec -T game wget -q -O- http://localhost:8081/health 2>/dev/null || echo "")
    
    if echo "$api_health" | grep -q "healthy" && echo "$game_health" | grep -q "healthy"; then
        echo -e "${GREEN}✓ Health checks passed${NC}"
        break
    fi
    
    attempt=$((attempt + 1))
    echo -e "${YELLOW}Waiting for services... (${attempt}/${max_attempts})${NC}"
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo -e "${RED}Error: Services did not become healthy in time${NC}"
    echo ""
    echo "Check logs with:"
    echo "  docker compose -f docker-compose.prod.yml logs api"
    echo "  docker compose -f docker-compose.prod.yml logs game"
    exit 1
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Deployment Completed Successfully!               ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Service URLs:${NC}"
echo "  Website:    https://your-domain.com"
echo "  API:        https://your-domain.com/api"
echo "  WebSocket:  wss://your-domain.com/ws"
echo "  Grafana:    http://your-server-ip:3001"
echo ""
echo -e "${BLUE}Check status:${NC}"
echo "  docker compose -f docker-compose.prod.yml ps"
echo ""
echo -e "${BLUE}View logs:${NC}"
echo "  docker compose -f docker-compose.prod.yml logs -f"
echo ""
echo -e "${BLUE}Monitor:${NC}"
echo "  Open Grafana at http://your-server-ip:3001"
echo "  Login: admin / (check .env.production for password)"
echo ""
