#!/bin/bash

# Tank Royale 2 - Go Servers Startup Script
# This script starts all database containers, monitoring tools, and Go servers

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GO_SERVER_DIR="$PROJECT_ROOT/go-server"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║        🚀 Tank Royale 2 - Go Servers Startup 🚀             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Function to check if a container is running
is_container_running() {
    podman ps --format "{{.Names}}" | grep -q "^$1$"
}

# Function to wait for a service to be ready
wait_for_service() {
    local host=$1
    local port=$2
    local service=$3
    local max_attempts=30
    local attempt=0

    echo "⏳ Waiting for $service to be ready..."
    while [ $attempt -lt $max_attempts ]; do
        if nc -z $host $port 2>/dev/null; then
            echo "✅ $service is ready!"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    echo "❌ $service failed to start"
    return 1
}

# Step 1: Start Database Containers
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Step 1: Starting Database Containers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# PostgreSQL
if is_container_running "tank-postgres"; then
    echo "✅ PostgreSQL already running"
else
    echo "🔄 Starting PostgreSQL..."
    podman start tank-postgres || {
        echo "⚠️  PostgreSQL container not found, creating new one..."
        podman run -d \
            --name tank-postgres \
            -e POSTGRES_USER=tank_user \
            -e POSTGRES_PASSWORD=tank_pass_dev_only \
            -e POSTGRES_DB=tank_royale \
            -p 5432:5432 \
            postgres:15-alpine
    }
    wait_for_service localhost 5432 "PostgreSQL"
fi

# Redis
if is_container_running "tank-redis"; then
    echo "✅ Redis already running"
else
    echo "🔄 Starting Redis..."
    podman start tank-redis || {
        echo "⚠️  Redis container not found, creating new one..."
        podman run -d \
            --name tank-redis \
            -p 6379:6379 \
            redis:7-alpine \
            redis-server \
            --appendonly yes \
            --maxmemory 512mb \
            --maxmemory-policy allkeys-lru
    }
    wait_for_service localhost 6379 "Redis"
fi

# Cassandra
if is_container_running "tank-cassandra"; then
    echo "✅ Cassandra already running"
else
    echo "🔄 Starting Cassandra..."
    podman start tank-cassandra || {
        echo "⚠️  Cassandra container not found, creating new one..."
        podman run -d \
            --name tank-cassandra \
            -p 9042:9042 \
            cassandra:4
    }
    wait_for_service localhost 9042 "Cassandra"
fi

echo ""

# Step 2: Start Monitoring Containers
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Step 2: Starting Monitoring Tools"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Prometheus
if is_container_running "tank-prometheus"; then
    echo "✅ Prometheus already running"
else
    echo "🔄 Starting Prometheus..."
    podman start tank-prometheus || {
        echo "⚠️  Prometheus container not found, creating new one..."
        podman run -d \
            --name tank-prometheus \
            --network host \
            -v "$PROJECT_ROOT/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:Z" \
            prom/prometheus:latest \
            --config.file=/etc/prometheus/prometheus.yml \
            --storage.tsdb.path=/prometheus \
            --web.console.libraries=/usr/share/prometheus/console_libraries \
            --web.console.templates=/usr/share/prometheus/consoles
    }
    wait_for_service localhost 9090 "Prometheus"
fi

# Grafana
if is_container_running "tank-grafana"; then
    echo "✅ Grafana already running"
else
    echo "🔄 Starting Grafana..."
    podman start tank-grafana || {
        echo "⚠️  Grafana container not found, creating new one..."
        podman run -d \
            --name tank-grafana \
            --network host \
            -v "$PROJECT_ROOT/monitoring/grafana-datasources.yml:/etc/grafana/provisioning/datasources/datasource.yml:Z" \
            -v "$PROJECT_ROOT/monitoring/dashboards:/etc/grafana/provisioning/dashboards:Z" \
            -v "$PROJECT_ROOT/monitoring/grafana-dashboards.yml:/etc/grafana/provisioning/dashboards/dashboards.yml:Z" \
            -e GF_SERVER_HTTP_PORT=3001 \
            -e GF_SECURITY_ADMIN_PASSWORD=admin \
            -e GF_SECURITY_ADMIN_USER=admin \
            grafana/grafana:latest
    }
    wait_for_service localhost 3001 "Grafana"
fi

# pgAdmin
if is_container_running "tank-pgadmin"; then
    echo "✅ pgAdmin already running"
else
    echo "🔄 Starting pgAdmin..."
    podman start tank-pgadmin || {
        echo "⚠️  pgAdmin container not found, creating new one..."
        podman run -d \
            --name tank-pgadmin \
            -e PGADMIN_DEFAULT_EMAIL=admin@tankroyale.com \
            -e PGADMIN_DEFAULT_PASSWORD=admin \
            -e PGADMIN_CONFIG_SERVER_MODE=False \
            -e PGADMIN_CONFIG_MASTER_PASSWORD_REQUIRED=False \
            -p 5050:80 \
            dpage/pgadmin4:latest
    }
    wait_for_service localhost 5050 "pgAdmin"
fi

echo ""

# Step 3: Build and Start Go Servers
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔨 Step 3: Building Go Servers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$GO_SERVER_DIR"

# Build API server
echo "🔨 Building API server..."
go build -o /tmp/api-server ./cmd/api/main.go
echo "✅ API server built"

# Build Game server
echo "🔨 Building Game server..."
go build -o /tmp/game-server ./cmd/game/main.go
echo "✅ Game server built"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Step 4: Starting Go Servers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Stop any existing servers
lsof -ti :8080 | xargs kill -9 2>/dev/null || true
lsof -ti :8081 | xargs kill -9 2>/dev/null || true
sleep 1

# Start API server
echo "🚀 Starting API server..."
/tmp/api-server > /tmp/api-server.log 2>&1 &
API_PID=$!
echo "✅ API server started (PID: $API_PID)"

# Start Game server
echo "🚀 Starting Game server..."
/tmp/game-server > /tmp/game-server.log 2>&1 &
GAME_PID=$!
echo "✅ Game server started (PID: $GAME_PID)"

# Wait for servers to start
sleep 3

# Verify servers are running
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Verifying Services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_service() {
    local url=$1
    local name=$2
    if curl -s "$url" > /dev/null 2>&1; then
        echo "✅ $name is responding"
        return 0
    else
        echo "❌ $name is not responding"
        return 1
    fi
}

check_service "http://localhost:8080/health" "API Server (8080)"
check_service "http://localhost:8081/health" "Game Server (8081)"
check_service "http://localhost:9090/-/healthy" "Prometheus (9090)"
check_service "http://localhost:3001/api/health" "Grafana (3001)"
check_service "http://localhost:5050" "pgAdmin (5050)"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                  ✅ ALL SERVICES STARTED ✅                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📍 Service URLs:"
echo "   • API Server:     http://localhost:8080"
echo "   • Game Server:    http://localhost:8081"
echo "   • Prometheus:     http://localhost:9090"
echo "   • Grafana:        http://localhost:3001  (admin/admin)"
echo "   • pgAdmin:        http://localhost:5050  (admin@admin.com/admin)"
echo ""
echo "📊 Quick Test Commands:"
echo "   • Health Check:   curl http://localhost:8080/health"
echo "   • Database Test:  curl http://localhost:8080/api/test/db"
echo "   • View Metrics:   curl http://localhost:8080/metrics"
echo ""
echo "📝 Logs:"
echo "   • API Server:     tail -f /tmp/api-server.log"
echo "   • Game Server:    tail -f /tmp/game-server.log"
echo ""
echo "🛑 To stop all services:"
echo "   ./scripts/stop-all.sh"
echo ""
