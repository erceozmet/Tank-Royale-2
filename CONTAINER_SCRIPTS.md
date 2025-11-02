# 🎯 Container Management Scripts

Quick reference for all Podman/Docker management scripts in Tank Royale 2.

## � Quick Access

All scripts are in the `./scripts/` folder, but you can use the **main launcher** from the project root:

```bash
./tank.sh setup       # First-time setup
./tank.sh start       # Start all containers
./tank.sh stop        # Stop all containers
./tank.sh databases   # Start databases only
./tank.sh monitoring  # Start monitoring only
./tank.sh help        # Show all commands
```

## 📂 Script Organization

```
Tank-Royale-2/
├── tank.sh                      # Main launcher (use this!)
└── scripts/
    ├── README.md                # Scripts documentation
    ├── setup-podman.sh          # First-time setup
    ├── start-all.sh             # Daily startup
    ├── stop-all.sh              # Clean shutdown
    ├── start-databases.sh       # Databases only
    ├── start-monitoring.sh      # Monitoring only
    └── commands.sh              # Quick reference
```

## �📜 Available Scripts

### 🚀 `./tank.sh setup` or `scripts/setup-podman.sh` - First Time Setup
**Use Case**: First time you're setting up the project or starting fresh

**What it does**:
- Creates all Docker volumes and networks
- Pulls and starts all containers from docker-compose.yml
- Waits for all services to initialize (especially slow Cassandra)
- Verifies health checks pass
- Displays all service URLs and credentials

**Run time**: ~3-5 minutes (first run, downloading images)

```bash
./tank.sh setup
# OR
cd scripts && ./setup-podman.sh
```

**When to use**:
- ✅ First time setup
- ✅ After running `podman compose down -v` (deleted volumes)
- ✅ Want to start completely fresh
- ✅ Just cloned the repository

---

### ▶️ `./tank.sh start` or `scripts/start-all.sh` - Start Existing Containers
**Use Case**: Daily development - start all previously created containers

**What it does**:
- Starts all tank-related containers (databases, monitoring, admin tools)
- Performs health checks for critical services
- Displays container status
- Shows all service URLs

**Run time**: ~20-30 seconds

```bash
./tank.sh start
# OR
cd scripts && ./start-all.sh
```

**When to use**:
- ✅ Daily development (after stopping containers yesterday)
- ✅ After running `./tank.sh stop`
- ✅ After system reboot
- ✅ Containers exist but are stopped

**Note**: This won't create containers if they don't exist. Use `./tank.sh setup` instead.

---

### ⏹️ `./tank.sh stop` or `scripts/stop-all.sh` - Stop All Containers
**Use Case**: End of work day, free up system resources

**What it does**:
- Finds all tank-related containers
- Prompts for confirmation
- Stops all containers (keeps data)
- Shows final status

**Run time**: ~5-10 seconds

```bash
./tank.sh stop
# OR
cd scripts && ./stop-all.sh
```

**When to use**:
- ✅ End of work session
- ✅ Need to free up RAM/CPU
- ✅ Before system shutdown
- ✅ Want to stop everything but keep data

**Data safety**: ✅ All data is preserved in volumes

---

### 📊 `./tank.sh monitoring` or `scripts/start-monitoring.sh` - Start Monitoring Only
**Use Case**: Start just the monitoring stack (Prometheus, Grafana, exporters)

**What it does**:
- Starts Prometheus, Grafana, and all exporters
- Waits for services to initialize
- Displays monitoring service URLs

**Run time**: ~10-15 seconds

```bash
./tank.sh monitoring
# OR
cd scripts && ./start-monitoring.sh
```

**When to use**:
- ✅ Databases already running, only need monitoring
- ✅ Want to add monitoring to existing setup
- ✅ Testing monitoring configuration changes

---

### 🗄️ `./tank.sh databases` or `scripts/start-databases.sh` - Start Databases Only
**Use Case**: Start just the core databases

**What it does**:
- Starts PostgreSQL, Redis, and Cassandra
- Waits for health checks
- Does not start monitoring or admin tools

**Run time**: ~60-90 seconds (Cassandra is slow)

```bash
./tank.sh databases
# OR
cd scripts && ./start-databases.sh
```

**When to use**:
- ✅ Only need databases for development
- ✅ Don't need monitoring overhead
- ✅ Running on limited resources

---

### ❓ `./tank.sh help` or `scripts/commands.sh` - Quick Reference
**Use Case**: Display all available commands and service URLs

```bash
./tank.sh help
# OR
cd scripts && ./commands.sh
```

## 🎮 Common Workflows

### 🆕 First Time Setup
```bash
# 1. Clone and install dependencies
git clone <repo>
cd tank-royale-2
cd server && npm install
cd ../load-tests && npm install
cd ..

# 2. Create and start all containers
./tank.sh setup

# 3. Start the API server
cd server && npm run dev

# 4. Create test users and run load tests
cd load-tests
node setup-test-users.js
npm run test:quick
```

---

### 💻 Daily Development
```bash
# Morning: Start everything
./tank.sh start

# Start API server
cd server && npm run dev

# Do your work...

# Evening: Stop everything
./tank.sh stop
```

---

### 🧪 Testing & Monitoring
```bash
# 1. Start all containers including monitoring
./tank.sh start

# 2. Start API server
cd server && npm run dev

# 3. Open Grafana dashboard
# http://localhost:3001

# 4. Run load tests and watch metrics
cd load-tests && npm run test:all
```

---

### 🐛 Troubleshooting / Fresh Start
```bash
# 1. Stop and remove everything
podman compose down -v

# 2. Start fresh
./tank.sh setup

# 3. Recreate test users
cd load-tests && node setup-test-users.js
```

---

### 💾 Database Work Only
```bash
# Start just databases
./tank.sh databases

# Do database migrations/queries
cd server && npm run db:migrate

# Stop when done
./tank.sh stop
```

---

## 📊 Container Status Commands

### Check What's Running
```bash
# All tank containers
podman ps | grep tank-

# Just names and status
podman ps --format "{{.Names}}\t{{.Status}}" | grep tank-

# All containers (including stopped)
podman ps -a | grep tank-
```

### Check Container Logs
```bash
# Real-time logs
podman logs -f tank-postgres
podman logs -f tank-grafana

# Last 50 lines
podman logs --tail 50 tank-prometheus

# Search logs for errors
podman logs tank-postgres 2>&1 | grep -i error
```

### Check Container Health
```bash
# Specific container health
podman inspect --format='{{.State.Health.Status}}' tank-postgres

# All container health status
for container in $(podman ps --format "{{.Names}}" | grep "^tank-"); do
  echo -n "$container: "
  podman inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no healthcheck"
done
```

### Resource Usage
```bash
# Real-time stats
podman stats

# One-time snapshot
podman stats --no-stream
```

---

## 🗑️ Cleanup Commands

### Stop Everything (Keep Data)
```bash
./stop-all.sh
# OR
podman compose stop
```

### Remove Containers (Keep Data)
```bash
podman compose down
```

### Remove Everything Including Data
```bash
# ⚠️ WARNING: This deletes all data!
podman compose down -v
```

### Remove Specific Container
```bash
podman stop tank-postgres
podman rm tank-postgres
```

### Cleanup Unused Resources
```bash
# Remove stopped containers
podman container prune

# Remove unused volumes
podman volume prune

# Remove unused images
podman image prune

# Clean everything
podman system prune -a --volumes
```

---

## 🌐 Service URLs & Credentials

### Databases
- **PostgreSQL**: `localhost:5432`
  - Database: `tank_royale`
  - User: `tank_user`
  - Password: `dev_password_123`

- **Redis**: `localhost:6379`
  - No auth in dev

- **Cassandra**: `localhost:9042`
  - Keyspace: `tank_royale`

### Admin Tools
- **pgAdmin**: http://localhost:8080
  - Email: `admin@tankroyale.com`
  - Password: `admin123`

- **Redis Commander**: http://localhost:8081
  - No auth

### Monitoring
- **Grafana**: http://localhost:3001
  - Username: `admin`
  - Password: `admin123`
  - Dashboard: "Tank Royale 2 - System Overview"

- **Prometheus**: http://localhost:9090
  - No auth

### Metrics Endpoints
- **Server Metrics**: http://localhost:3000/metrics (when server running)
- **Redis Exporter**: http://localhost:9121/metrics
- **Postgres Exporter**: http://localhost:9187/metrics
- **Node Exporter**: http://localhost:9100/metrics

---

## ❓ FAQ

### Q: Which script should I use daily?
**A**: `./tank.sh start` in the morning, `./tank.sh stop` in the evening

### Q: Do I need to run setup every time?
**A**: No, only the first time or when starting completely fresh

### Q: Will stopping containers delete my data?
**A**: No, data is stored in Docker volumes and persists

### Q: How do I delete all data?
**A**: `podman compose down -v` (deletes volumes)

### Q: Can I start just databases without monitoring?
**A**: Yes, use `./tank.sh databases`

### Q: What if a container won't start?
**A**: Check logs with `podman logs tank-<service>`, try restarting with `podman restart tank-<service>`

### Q: How do I know if everything is working?
**A**: Run `podman ps` - you should see 10-11 containers with status "Up"

### Q: Can I use Docker instead of Podman?
**A**: Yes, just replace `podman` with `docker` in all commands

### Q: Where are the actual scripts located?
**A**: All scripts are in the `./scripts/` folder, but you can use `./tank.sh` launcher from the root

### Q: How much disk space do volumes use?
**A**: Check with `podman volume ls` and `podman system df -v`

---

## 🚨 Troubleshooting

### Containers Won't Start
```bash
# Check for port conflicts
lsof -i :3000  # Server
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis

# Check container logs
podman logs tank-<service>

# Try restarting
podman restart tank-<service>
```

### Out of Disk Space
```bash
# Check usage
podman system df

# Clean up
podman system prune -a --volumes
```

### Slow Cassandra Startup
```bash
# Cassandra takes 1-2 minutes to fully start
# Check logs to see progress
podman logs -f tank-cassandra

# Wait for this message:
# "Created default superuser role 'cassandra'"
```

### Permission Denied Errors
```bash
# Make sure scripts are executable
chmod +x *.sh

# Check volume permissions
podman volume inspect <volume-name>
```

---

**Need more help?** Check:
- [GETTING_STARTED.md](./GETTING_STARTED.md) - Full setup guide
- [LOAD_TESTING_SETUP.md](./LOAD_TESTING_SETUP.md) - Load testing details
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System architecture
