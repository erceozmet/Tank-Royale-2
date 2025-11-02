#!/bin/bash

# Script to start databases using Podman (works with Podman Desktop)

# Load credentials from .env.local
if [ -f .env.local ]; then
  echo "📝 Loading credentials from .env.local..."
  export $(cat .env.local | grep -v '^#' | xargs)
else
  echo "⚠️  Warning: .env.local not found. Using default credentials."
  POSTGRES_USER=tank_user
  POSTGRES_PASSWORD=tank_pass_dev_only
  POSTGRES_DB=tank_royale
  PGADMIN_EMAIL=admin@tank.local
  PGADMIN_PASSWORD=admin123
fi

echo "🚀 Starting Tank Royale 2 databases..."

# Create network
podman network create tank-network 2>/dev/null || true

# Start PostgreSQL
echo "📦 Starting PostgreSQL..."
podman run -d \
  --name tank-postgres \
  --network tank-network \
  -e POSTGRES_USER=${POSTGRES_USER} \
  -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} \
  -e POSTGRES_DB=${POSTGRES_DB} \
  -p ${POSTGRES_PORT:-5432}:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  docker.io/library/postgres:15

# Start Redis
echo "📦 Starting Redis..."
podman run -d \
  --name tank-redis \
  --network tank-network \
  -p 6379:6379 \
  -v redis_data:/data \
  docker.io/library/redis:7 redis-server --appendonly yes

# Start Cassandra
echo "📦 Starting Cassandra..."
podman run -d \
  --name tank-cassandra \
  --network tank-network \
  -e MAX_HEAP_SIZE=512M \
  -e HEAP_NEWSIZE=128M \
  -p 9042:9042 \
  -v cassandra_data:/var/lib/cassandra \
  docker.io/library/cassandra:4.1

# Start pgAdmin (optional)
echo "📦 Starting pgAdmin..."
podman run -d \
  --name tank-pgadmin \
  --network tank-network \
  -e PGADMIN_DEFAULT_EMAIL=${PGADMIN_EMAIL} \
  -e PGADMIN_DEFAULT_PASSWORD=${PGADMIN_PASSWORD} \
  -p 8080:80 \
  docker.io/dpage/pgadmin4:latest

# Start Redis Commander (optional)
echo "📦 Starting Redis Commander..."
podman run -d \
  --name tank-redis-commander \
  --network tank-network \
  -e REDIS_HOSTS=local:tank-redis:6379 \
  -p 8081:8081 \
  docker.io/rediscommander/redis-commander:latest

echo ""
echo "✅ All containers started!"
echo ""
echo "📊 Services:"
echo "   PostgreSQL: localhost:5432"
echo "   Redis: localhost:6379"
echo "   Cassandra: localhost:9042"
echo "   pgAdmin: http://localhost:8080"
echo "   Redis Commander: http://localhost:8081"
echo ""
echo "To check status: podman ps"
echo "To stop all: podman stop tank-postgres tank-redis tank-cassandra tank-pgadmin tank-redis-commander"
echo "To remove all: podman rm -f tank-postgres tank-redis tank-cassandra tank-pgadmin tank-redis-commander"
