# Tank Royale 2 - Container Management Scripts

This folder contains all Podman/Docker container management scripts.

## 🚀 Quick Access

From the project root, use the `tank.sh` launcher:

```bash
./tank.sh setup       # First-time setup
./tank.sh start       # Start all containers
./tank.sh stop        # Stop all containers
./tank.sh databases   # Start databases only
./tank.sh monitoring  # Start monitoring only
./tank.sh help        # Show all commands
```

## 📜 Available Scripts

### `setup-podman.sh`
**First-time setup script**
- Creates volumes and networks
- Pulls and starts all containers
- Waits for health checks
- Displays service URLs

**Usage:**
```bash
cd scripts && ./setup-podman.sh
# OR from root:
./tank.sh setup
```

### `start-all.sh`
**Daily development startup**
- Starts all existing containers
- Performs health checks
- Shows container status

**Usage:**
```bash
cd scripts && ./start-all.sh
# OR from root:
./tank.sh start
```

### `stop-all.sh`
**Clean shutdown**
- Stops all Tank containers
- Prompts for confirmation
- Preserves all data

**Usage:**
```bash
cd scripts && ./stop-all.sh
# OR from root:
./tank.sh stop
```

### `start-databases.sh`
**Database-only startup**
- Starts PostgreSQL, Redis, Cassandra
- Skips monitoring and admin tools

**Usage:**
```bash
cd scripts && ./start-databases.sh
# OR from root:
./tank.sh databases
```

### `start-monitoring.sh`
**Monitoring-only startup**
- Starts Prometheus, Grafana, exporters
- Requires databases to be running

**Usage:**
```bash
cd scripts && ./start-monitoring.sh
# OR from root:
./tank.sh monitoring
```

### `commands.sh`
**Quick reference display**
- Shows all available commands
- Displays service URLs
- Lists documentation

**Usage:**
```bash
cd scripts && ./commands.sh
# OR from root:
./tank.sh help
```

## 📊 What Gets Managed

These scripts control **10 containers**:

**Databases (3):**
- `tank-postgres` - PostgreSQL database
- `tank-redis` - Redis cache/queue
- `tank-cassandra` - Cassandra time-series DB

**Admin Tools (2):**
- `tank-pgadmin` - PostgreSQL GUI
- `tank-redis-commander` - Redis GUI

**Monitoring (2):**
- `tank-prometheus` - Metrics collection
- `tank-grafana` - Metrics visualization

**Exporters (3):**
- `tank-redis-exporter` - Redis metrics
- `tank-postgres-exporter` - PostgreSQL metrics
- `tank-node-exporter` - System metrics

## 🌐 Service URLs

After starting containers:

- **Grafana**: http://localhost:3001 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **pgAdmin**: http://localhost:8080 (admin@tankroyale.com/admin123)
- **Redis Commander**: http://localhost:8081

## 📚 Documentation

See parent directory for complete documentation:
- `../CONTAINER_SCRIPTS.md` - Detailed script documentation
- `../GETTING_STARTED.md` - Quick start guide
- `../LOAD_TESTING_SETUP.md` - Load testing guide

## 🔧 Direct Script Usage

You can also run scripts directly from this folder:

```bash
cd scripts

# First time
./setup-podman.sh

# Daily usage
./start-all.sh
./stop-all.sh

# Selective startup
./start-databases.sh
./start-monitoring.sh

# Help
./commands.sh
```

## 💡 Tips

- Use `./tank.sh` from project root for convenience
- All scripts have colored output and progress indicators
- Scripts preserve data when stopping containers
- Use `podman ps` to check container status
- Use `podman logs tank-<service>` to view logs

---

**Parent Launcher:** `../tank.sh`
