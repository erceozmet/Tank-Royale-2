# Tank Royale 2 - Boot Commands Quick Reference

## 🎯 Unified Task Runner (Make)

All commands are consolidated into a Makefile, similar to Gradle in Java!

```bash
# See all available commands
make help

# Start everything
make start

# Stop everything
make stop

# Check status
make status
```

### Essential Commands

```bash
# Setup & Start
make setup                # First-time setup
make start                # Start everything
make stop                 # Stop everything
make restart              # Restart everything
make status               # Show service status

# Development
make dev                  # Build + start (useful after code changes)
make health               # Check all health endpoints
make urls                 # Show all service URLs

# Go Servers
make go-build             # Build Go servers
make go-start             # Start Go servers
make go-stop              # Stop Go servers
make go-logs-api          # View API logs
make go-logs-game         # View Game logs
make go-test              # Run tests
make go-test-coverage     # Run tests with coverage

# Containers
make containers-start     # Start containers only
make containers-stop      # Stop containers only
make containers-status    # Check container status
make containers-logs SERVICE=postgres  # View specific container logs

# Databases
make db-start             # Start all databases
make db-status            # Check database status
make db-shell-postgres    # Open PostgreSQL shell
make db-shell-redis       # Open Redis CLI
make db-shell-cassandra   # Open Cassandra CQL shell

# Monitoring
make monitoring-start            # Start Prometheus + Grafana
make monitoring-open-grafana     # Open Grafana in browser
make monitoring-open-prometheus  # Open Prometheus in browser

# Testing
make test                 # Run all tests
make test-coverage        # Run tests with coverage
make load-test-quick      # Quick load test
make load-test-all        # All load tests

# Utilities
make clean                # Clean build artifacts
make logs SERVICE=api     # View logs (api|game|postgres|redis|cassandra|grafana)
make ports                # Show ports in use
make quickstart           # Show quick reference
```

## 📋 All Commands by Category

Run `make help` to see all 60+ commands organized into these categories:

- **Setup & Installation** - First-time setup, install dependencies
- **Container Management** - Start, stop, restart, clean containers
- **Database Management** - Access shells, check status, reset databases
- **Go Server Management** - Build, test, run, monitor Go servers
- **Monitoring** - Grafana, Prometheus management
- **Development Workflows** - Common development tasks
- **Testing & Quality** - Tests, coverage, linting, formatting
- **Load Testing** - API, WebSocket, matchmaking tests
- **Utilities** - Logs, cleanup, process management
- **Documentation** - Access guides and references

## 🔍 Discover Commands

```bash
make help               # See all commands organized
make help | grep db     # Find database-related commands
make help | grep go     # Find Go-related commands
make help | grep test   # Find testing commands
```

## 📊 Common Workflows

### Morning Startup
```bash
make start     # Start everything
make status    # Verify all services
make urls      # See all service URLs
```

### Development
```bash
make dev       # Build and start
make test      # Run tests
make logs SERVICE=api  # Watch logs
```

### Debugging
```bash
make status           # Check overall health
make db-status        # Check databases
make health           # Test endpoints
make ports            # Check port conflicts
```

### Testing
```bash
make load-test-setup  # Setup test users (once)
make load-test-quick  # Quick test
make test-coverage    # Run with coverage
```

## 🔧 Services & Ports

Run `make urls` to see all service URLs, or see table below:

| Service | Port | Command to Access |
|---------|------|-------------------|
| API Server | 8080 | `curl http://localhost:8080/health` |
| Game Server | 8081 | `curl http://localhost:8081/health` |
| Grafana | 3001 | `make monitoring-open-grafana` |
| Prometheus | 9090 | `make monitoring-open-prometheus` |
| pgAdmin | 5050 | Open http://localhost:5050 |
| Redis Commander | 8082 | Open http://localhost:8082 |
| PostgreSQL | 5432 | `make db-shell-postgres` |
| Redis | 6379 | `make db-shell-redis` |
| Cassandra | 9042 | `make db-shell-cassandra` |

## 📝 Viewing Logs

```bash
# Go servers
make logs SERVICE=api
make logs SERVICE=game

# Containers
make logs SERVICE=postgres
make logs SERVICE=redis
make logs SERVICE=cassandra
make logs SERVICE=grafana

# Or use dedicated commands
make go-logs-api
make go-logs-game
make containers-logs SERVICE=postgres
```

## 🧹 Cleanup

```bash
make clean                # Clean build artifacts and logs
make containers-clean     # Remove all containers (CAUTION: deletes data!)
```

## 💡 Tips

1. **Tab completion works-la | grep -E "^-.*\.sh$|^d.*scripts"* Type `make s<TAB>` to see commands starting with 's'
2. **Always check status first**: `make status` before debugging
3. **Use help to discover**: `make help | grep <keyword>`
4. **Logs are your friend**: `make logs SERVICE=<name>` for any service
5. **Quick reference**: `make quickstart` shows essential commands

## 🚀 Next Time You Boot

Just remember:
```bash
make start    # Start everything
make stop     # Stop everything
make status   # Check what's running
```

Everything else is discoverable via `make help`!

## 📖 More Documentation

- `README.md` - Project overview and quick start
- `START_HERE.md` - Complete setup guide
- `QUICK_COMMANDS.md` - Command reference
- `COMMAND_MIGRATION.md` - Migrating from old scripts
- `make help` - Full command list with descriptions
- `make quickstart` - Quick reference card

## 🔄 Legacy Scripts

Old shell scripts have been moved to `.legacy-scripts/` folder. All functionality is now available through the Makefile. See `COMMAND_MIGRATION.md` for the migration guide.
