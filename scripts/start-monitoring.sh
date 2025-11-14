#!/bin/bash

# Tank Royale 2 - Monitoring Setup Script
# This script starts all monitoring services and verifies they're working

set -e

echo "🚀 Starting Tank Royale 2 Monitoring Stack..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Change to project root
cd "$(dirname "$0")/.."

# Start Docker services
echo "📦 Starting Docker containers..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check if services are running
check_service() {
    local service=$1
    local port=$2
    local name=$3
    
    if curl -s "http://localhost:$port" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name is running at http://localhost:$port"
    else
        echo -e "${RED}✗${NC} $name failed to start at http://localhost:$port"
        return 1
    fi
}

echo ""
echo "🔍 Checking service health..."

check_service "postgres" 5432 "PostgreSQL" || true
check_service "redis" 6379 "Redis" || true
check_service "prometheus" 9090 "Prometheus"
check_service "grafana" 3001 "Grafana"
check_service "pgadmin" 8080 "pgAdmin"
check_service "redis-commander" 8081 "Redis Commander"

echo ""
echo -e "${GREEN}✅ Monitoring stack is ready!${NC}"
echo ""
echo "📊 Access your dashboards:"
echo ""
echo "  Grafana:         http://localhost:3001"
echo "    Username: admin"
echo "    Password: admin123"
echo ""
echo "  Prometheus:      http://localhost:9090"
echo "  pgAdmin:         http://localhost:8080"
echo "    Email:    admin@tankroyale.com"
echo "    Password: admin123"
echo ""
echo "  Redis Commander: http://localhost:8081"
echo ""
echo "📈 Metrics endpoints:"
echo ""
echo "  Application:     http://localhost:3000/metrics"
echo "  Redis:           http://localhost:9121/metrics"
echo "  PostgreSQL:      http://localhost:9187/metrics"

echo ""
echo -e "${YELLOW}💡 Tip:${NC} The 'Tank Royale 2 - System Overview' dashboard is pre-loaded in Grafana"
echo ""
