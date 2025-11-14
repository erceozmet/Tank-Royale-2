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

**🚀 ONE COMMAND - Start Everything:**
```bash
# Start all containers AND Go servers
./start-everything.sh
```

This script:
- Starts all containers (databases, monitoring, admin tools)
- Waits for databases to be ready
- Builds Go servers if needed
- Starts API server (port 8080)
- Starts Game server (port 8081)
- Tests all health endpoints

**Alternative - Start individually:**
```bash
# Just containers
./tank.sh start

# Just Go servers (after containers are running)
./start-go-servers.sh
```

## 🛑 Stop Everything
```bash
# Stop all containers AND Go servers
./stop-everything.sh

# Or stop individually:
./tank.sh stop              # Containers only
./stop-go-servers.sh        # Go servers only
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

### 2. Start Go Servers
```bash
./start-go-servers.sh
```

Wait for:
```
✅ API Server started on http://localhost:8080
✅ Game Server started on http://localhost:8081
```

### 3. Test It Works
In a new terminal:
```bash
# Check API health
curl http://localhost:8080/health

# Check Game server health
curl http://localhost:8081/health

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
make load-test-setup  # Creates test users
```

### Run Tests
```bash
# Quick test (5 clients, 10 seconds)
make load-test-quick

# Full API test
make load-test-api

# All tests
make load-test-all
```

## 🔴 Stop Everything

```bash
# Stop everything (containers + Go servers)
make stop

# Or manually stop specific services
make containers-stop
make go-stop
```

## 📜 Available Commands

```bash
make help           # Show all available commands
make start          # Start everything
make stop           # Stop everything
make status         # Show service status
make dev            # Build + start (development)
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

```bash
# Re-create test users
make load-test-setup
```
```

## Common Workflows

### Development
```bash
# Start everything
make start

# Make changes to Go code
cd go-server/cmd/api
# Edit files...

# Rebuild and restart
make go-build
make go-restart
```

### Testing
```bash
# Make sure everything is running
make status

# Run Go tests
make go-test

# Run load tests
make load-test-quick
```

### Monitoring
```bash
# Start everything including monitoring
make start

# Run load tests and watch Grafana
make monitoring-open-grafana
make load-test-all
```

## Services & Ports

| Service | Port | Command to Start |
|---------|------|------------------|
| API Server | 8080 | `make go-start` |
| Game Server | 8081 | `make go-start` |
| PostgreSQL | 5432 | `make containers-start` |
| Redis | 6379 | `make containers-start` |
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
