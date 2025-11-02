#!/bin/bash

# Tank Royale 2 - Initial Setup Script for Podman
# This script creates and starts all containers for the first time

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Tank Royale 2 - Initial Setup${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if podman is installed
if ! command -v podman &> /dev/null; then
    echo -e "${RED}✗ Podman is not installed!${NC}"
    echo "Please install Podman first: https://podman.io/getting-started/installation"
    exit 1
fi

echo -e "${GREEN}✓ Podman is installed${NC}"
echo ""

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}✗ docker-compose.yml not found!${NC}"
    echo "Please run this script from the project root directory."
    exit 1
fi

echo -e "${GREEN}✓ docker-compose.yml found${NC}"
echo ""

# Check if monitoring config files exist
if [ ! -f "monitoring/prometheus.yml" ]; then
    echo -e "${RED}✗ monitoring/prometheus.yml not found!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Monitoring configuration files found${NC}"
echo ""

# Stop any existing containers
echo -e "${BLUE}Step 1: Cleaning up existing containers${NC}"
echo "========================================\n"

EXISTING=$(podman ps -a --format "{{.Names}}" | grep "^tank-" || true)
if [ ! -z "$EXISTING" ]; then
    echo -e "${YELLOW}Found existing Tank Royale containers:${NC}"
    echo "$EXISTING"
    echo ""
    read -p "Do you want to remove them? (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Stopping and removing existing containers..."
        podman compose down -v
        echo -e "${GREEN}✓ Cleanup complete${NC}"
    fi
else
    echo -e "${GREEN}✓ No existing containers found${NC}"
fi

echo ""
echo -e "${BLUE}Step 2: Creating volumes${NC}"
echo "========================\n"

# Create volumes if they don't exist
for volume in postgres_data redis_data cassandra_data pgadmin_data prometheus_data grafana_data; do
    if podman volume exists "$volume" 2>/dev/null; then
        echo -e "${GREEN}✓ Volume $volume already exists${NC}"
    else
        echo -e "${YELLOW}→ Creating volume $volume${NC}"
        podman volume create "$volume"
    fi
done

echo ""
echo -e "${BLUE}Step 3: Creating network${NC}"
echo "========================\n"

if podman network exists tank-royale-network 2>/dev/null; then
    echo -e "${GREEN}✓ Network tank-royale-network already exists${NC}"
else
    echo -e "${YELLOW}→ Creating network tank-royale-network${NC}"
    podman network create tank-royale-network
fi

echo ""
echo -e "${BLUE}Step 4: Starting all containers${NC}"
echo "================================\n"

echo "This will start all containers defined in docker-compose.yml"
echo "This may take several minutes on first run (downloading images)..."
echo ""

# Use podman-compose or podman compose
if command -v podman-compose &> /dev/null; then
    podman-compose up -d
else
    podman compose up -d
fi

echo ""
echo -e "${GREEN}✓ All containers created${NC}"

echo ""
echo -e "${BLUE}Step 5: Waiting for services to initialize${NC}"
echo "==========================================\n"

echo -e "${YELLOW}Waiting for PostgreSQL...${NC}"
sleep 5
until podman exec tank-postgres pg_isready -U tank_user -d tank_royale &>/dev/null; do
    echo -n "."
    sleep 2
done
echo -e "\n${GREEN}✓ PostgreSQL is ready${NC}"

echo -e "${YELLOW}Waiting for Redis...${NC}"
sleep 2
until podman exec tank-redis redis-cli ping &>/dev/null; do
    echo -n "."
    sleep 2
done
echo -e "\n${GREEN}✓ Redis is ready${NC}"

echo -e "${YELLOW}Waiting for Cassandra (this takes longer)...${NC}"
sleep 10
CASSANDRA_WAIT=0
until podman exec tank-cassandra cqlsh -e "describe keyspaces" &>/dev/null; do
    echo -n "."
    sleep 5
    CASSANDRA_WAIT=$((CASSANDRA_WAIT + 5))
    if [ $CASSANDRA_WAIT -gt 120 ]; then
        echo -e "\n${YELLOW}⚠ Cassandra is still starting (may take a few more minutes)${NC}"
        break
    fi
done
if [ $CASSANDRA_WAIT -le 120 ]; then
    echo -e "\n${GREEN}✓ Cassandra is ready${NC}"
fi

echo -e "${YELLOW}Waiting for Grafana to provision dashboards...${NC}"
sleep 10
echo -e "${GREEN}✓ Grafana provisioning complete${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}\n"

# Display status
echo -e "${BLUE}Container Status:${NC}"
podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep "tank-"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Service URLs:${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Databases:${NC}"
echo "  PostgreSQL:       localhost:5432"
echo "  Redis:            localhost:6379"
echo "  Cassandra:        localhost:9042"
echo ""
echo -e "${GREEN}Admin Interfaces:${NC}"
echo "  pgAdmin:          http://localhost:8080"
echo "    Email:          admin@tankroyale.com"
echo "    Password:       admin123"
echo ""
echo "  Redis Commander:  http://localhost:8081"
echo ""
echo -e "${GREEN}Monitoring:${NC}"
echo "  Grafana:          http://localhost:3001"
echo "    Username:       admin"
echo "    Password:       admin123"
echo "    Dashboard:      Tank Royale 2 - System Overview"
echo ""
echo "  Prometheus:       http://localhost:9090"
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Next Steps:${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "1. Install dependencies:"
echo "   cd server && npm install"
echo "   cd ../load-tests && npm install"
echo ""
echo "2. Initialize database schema:"
echo "   cd server && npm run db:init"
echo ""
echo "3. Start the API server:"
echo "   cd server && npm run dev"
echo ""
echo "4. Create test users for load testing:"
echo "   cd load-tests && node setup-test-users.js"
echo ""
echo "5. Run load tests:"
echo "   cd load-tests && npm run test:quick"
echo ""
echo "6. View metrics in Grafana:"
echo "   Open http://localhost:3001 and explore the dashboard"
echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Useful Commands:${NC}"
echo -e "${YELLOW}========================================${NC}"
echo "Start all containers:    ./start-all.sh"
echo "Stop all containers:     ./stop-all.sh"
echo "View container logs:     podman logs tank-<service>"
echo "View all containers:     podman ps -a"
echo "Remove everything:       podman compose down -v"
echo ""
