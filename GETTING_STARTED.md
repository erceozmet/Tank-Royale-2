# 🚀 Quick Start Guide - Tank Royale 2

## 🎯 Fastest Start (Recommended)

### First Time Setup
```bash
# One-time setup: Create all containers and start everything
./tank.sh setup
```

This script will:
- Create all necessary Docker volumes and networks
- Pull and start all containers (databases, monitoring, admin tools)
- Wait for services to initialize
- Display all service URLs and credentials

### Regular Start (After Setup)
```bash
# Start all existing containers
./tank.sh start
```

This quickly starts all previously created containers with proper health checks.

## 🛑 Stop Everything
```bash
# Stop all containers (keeps data)
./tank.sh stop
```

## ❓ Need Help?
```bash
# Show all available commands
./tank.sh help
```

---

## 📦 Manual Start (Alternative)

If you prefer step-by-step control:

### 1. Start Databases
```bash
# Start core databases
podman compose up -d postgres redis cassandra

# Verify they're running
podman ps
```

### 2. Start API Server
```bash
cd server
npm run dev
```

Wait for:
```
✅ Server running on http://localhost:3000
📊 Health check: http://localhost:3000/health
🔌 WebSocket server ready
```

### 3. Test It Works
In a new terminal:
```bash
# Check health
curl http://localhost:3000/health

# Should see: {"status":"healthy",...}
```

## 🔧 Optional: Start Monitoring

Monitoring is included in `./tank.sh start`.

To start monitoring separately:
```bash
# Start monitoring services
./tank.sh monitoring

# Or manually:
podman compose up -d prometheus grafana redis-exporter postgres-exporter

# Access dashboards
# Grafana: http://localhost:3001 (admin/admin123)
# Prometheus: http://localhost:9090
```

## Run Load Tests

### First Time Setup
```bash
cd load-tests
npm install
npm run setup  # Creates 5 test users
```

### Run Tests
```bash
# Quick test (5 clients, 10 seconds)
NUM_CLIENTS=5 TEST_DURATION=10 npm run test:websocket

# Full API test
npm run test:api

# All tests
npm run test:all
```

## 🔴 Stop Everything

```bash
# Interactive stop (prompts for confirmation)
./tank.sh stop

# Or manually stop specific services
podman compose stop

# Stop and remove everything (including data)
podman compose down -v
```

## 📜 Available Commands

```bash
./tank.sh setup       # First-time setup
./tank.sh start       # Start all containers
./tank.sh stop        # Stop all containers
./tank.sh databases   # Start databases only
./tank.sh monitoring  # Start monitoring only
./tank.sh help        # Show all commands
```

All scripts are located in the `./scripts/` folder.

## Troubleshooting

### Port already in use
```bash
# Check what's using port 3000
lsof -i:3000

# Kill it if needed
kill -9 <PID>
```

### Database connection failed
```bash
# Check if containers are running
podman ps

# Restart databases
podman compose restart postgres redis

# Check logs
podman logs tank-postgres
podman logs tank-redis
```

### Load tests failing
```bash
# Make sure server is running
curl http://localhost:3000/health

# Re-create test users
cd load-tests
npm run setup
```

## Common Workflows

### Development
```bash
# Terminal 1: Databases
podman compose up -d postgres redis

# Terminal 2: Server with auto-reload
cd server
npm run dev

# Make changes, server auto-restarts
```

### Testing
```bash
# Terminal 1: Server running
cd server && npm run dev

# Terminal 2: Run tests
cd server && npm test

# Terminal 3: Load tests
cd load-tests && npm run test:quick
```

### Monitoring
```bash
# Start everything including monitoring
podman compose up -d

# Start server
cd server && npm run dev

# Run load tests and watch Grafana
# Open: http://localhost:3001
cd load-tests && npm run test:all
```

## Services & Ports

| Service | Port | Command to Start |
|---------|------|------------------|
| API Server | 3000 | `cd server && npm run dev` |
| PostgreSQL | 5432 | `podman compose up -d postgres` |
| Redis | 6379 | `podman compose up -d redis` |
| Grafana | 3001 | `podman compose up -d grafana` |
| Prometheus | 9090 | `podman compose up -d prometheus` |
| pgAdmin | 8080 | `podman compose up -d pgadmin` |

## Next Steps

1. ✅ Start databases → Start server → Test health endpoint
2. 📊 (Optional) Start monitoring → Open Grafana
3. 🧪 Create test users → Run load tests
4. 📈 Watch metrics → Optimize performance
5. 🚀 Ready for Phase 3!

---

**Need help?** Check:
- [Full Documentation](./LOAD_TESTING_SETUP.md)
- [Command Reference](./QUICK_COMMANDS.md)
- [Architecture Docs](./docs/ARCHITECTURE.md)
