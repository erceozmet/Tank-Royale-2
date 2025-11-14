#!/bin/bash

# Tank Royale 2 - Complete Podman Startup Script
# This script starts all necessary containers for the Tank Royale 2 project

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Tank Royale 2 - Starting All Containers${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Function to check if a container is running
is_container_running() {
    podman ps --format "{{.Names}}" | grep -q "^$1$"
}

# Function to check if a container exists (running or stopped)
container_exists() {
    podman ps -a --format "{{.Names}}" | grep -q "^$1$"
}

# Function to wait for container health using direct commands
wait_for_health() {
    local container=$1
    local max_wait=${2:-60}
    local elapsed=0
    
    echo -e "${YELLOW}Waiting for $container to be healthy...${NC}"
    
    # Use direct health checks instead of container health status
    while [ $elapsed -lt $max_wait ]; do
        case "$container" in
            "tank-postgres")
                if podman exec "$container" pg_isready -U tank_user -d tank_royale >/dev/null 2>&1; then
                    echo -e "${GREEN}✓ $container is healthy${NC}"
                    return 0
                fi
                ;;
            "tank-redis")
                if podman exec "$container" redis-cli ping >/dev/null 2>&1; then
                    echo -e "${GREEN}✓ $container is healthy${NC}"
                    return 0
                fi
                ;;
            "tank-cassandra")
                if podman exec "$container" cqlsh -e "describe keyspaces" >/dev/null 2>&1; then
                    echo -e "${GREEN}✓ $container is healthy${NC}"
                    return 0
                fi
                ;;
            *)
                # For other containers, just check if they're running
                if is_container_running "$container"; then
                    echo -e "${GREEN}✓ $container is running${NC}"
                    return 0
                fi
                ;;
        esac
        sleep 2
        elapsed=$((elapsed + 2))
        echo -n "."
    done
    
    echo -e "\n${YELLOW}⚠ $container health check timed out (may still be starting)${NC}"
    return 1
}

# Function to start or restart a container
start_container() {
    local name=$1
    local optional=${2:-false}
    
    if is_container_running "$name"; then
        echo -e "${GREEN}✓ $name is already running${NC}"
        return 0
    elif container_exists "$name"; then
        echo -e "${YELLOW}→ Starting existing container: $name${NC}"
        podman start "$name"
    else
        if [ "$optional" = "true" ]; then
            echo -e "${YELLOW}⊘ $name doesn't exist (optional, skipping)${NC}"
            return 0
        else
            echo -e "${RED}✗ Container $name doesn't exist. Run 'podman compose up -d' first.${NC}"
            return 1
        fi
    fi
}

echo -e "${BLUE}Step 1: Starting Core Databases${NC}"
echo "================================\n"

# Start PostgreSQL
echo "Starting PostgreSQL..."
start_container "tank-postgres"

# Start Redis
echo "Starting Redis..."
start_container "tank-redis"

# Start Cassandra
echo "Starting Cassandra..."
start_container "tank-cassandra"

echo ""
echo -e "${BLUE}Step 2: Waiting for Databases to Initialize${NC}"
echo "============================================\n"

# Wait for databases to be healthy
wait_for_health "tank-postgres" 30
wait_for_health "tank-redis" 30
wait_for_health "tank-cassandra" 90  # Cassandra takes longer

echo ""
echo -e "${BLUE}Step 3: Starting Monitoring Stack${NC}"
echo "==================================\n"

# Start Prometheus
echo "Starting Prometheus..."
start_container "tank-prometheus"
sleep 3  # Give Prometheus time to start scraping

# Start Grafana
echo "Starting Grafana..."
start_container "tank-grafana"
sleep 5  # Give Grafana time to provision dashboards

echo ""
echo -e "${BLUE}Step 4: Starting Admin Tools${NC}"
echo "============================\n"

# Start pgAdmin
echo "Starting pgAdmin..."
start_container "tank-pgadmin"

# Start Redis Commander
echo "Starting Redis Commander..."
start_container "tank-redis-commander"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All Containers Started Successfully!${NC}"
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
echo ""
echo "  Prometheus:       http://localhost:9090"
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Next Steps:${NC}"
echo -e "${BLUE}========================================${NC}"
echo "1. Start the Go servers:"
echo "   make go-start"
echo ""
echo "2. Check server status:"
echo "   make status"
echo ""
echo "3. View server logs:"
echo "   make logs SERVICE=api"
echo ""
echo "4. Run load tests:"
echo "   make load-test-quick"
echo ""
echo -e "${YELLOW}To stop all containers:${NC}"
echo "  ./stop-all.sh"
echo ""
