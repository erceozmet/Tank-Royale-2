#!/bin/bash

# Tank Royale 2 - Stop All Services Script

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         🛑 Stopping All Tank Royale Services 🛑             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Stop Go servers
echo "🛑 Stopping Go servers..."
lsof -ti :8080 | xargs kill -9 2>/dev/null && echo "  ✅ API server stopped" || echo "  ℹ️  API server not running"
lsof -ti :8081 | xargs kill -9 2>/dev/null && echo "  ✅ Game server stopped" || echo "  ℹ️  Game server not running"

echo ""
echo "🛑 Stopping containers..."

# Stop all containers
podman stop tank-postgres 2>/dev/null && echo "  ✅ PostgreSQL stopped" || echo "  ℹ️  PostgreSQL not running"
podman stop tank-redis 2>/dev/null && echo "  ✅ Redis stopped" || echo "  ℹ️  Redis not running"
podman stop tank-cassandra 2>/dev/null && echo "  ✅ Cassandra stopped" || echo "  ℹ️  Cassandra not running"
podman stop tank-prometheus 2>/dev/null && echo "  ✅ Prometheus stopped" || echo "  ℹ️  Prometheus not running"
podman stop tank-grafana 2>/dev/null && echo "  ✅ Grafana stopped" || echo "  ℹ️  Grafana not running"
podman stop tank-pgadmin 2>/dev/null && echo "  ✅ pgAdmin stopped" || echo "  ℹ️  pgAdmin not running"

echo ""
echo "✅ All services stopped!"
echo ""
echo "💡 To start again, run: ./scripts/start-go-servers.sh"
echo ""
