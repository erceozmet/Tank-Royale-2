# 🚀 Tank Royale 2 - Quick Command Reference

## 🎯 Unified Task Runner (Make)

All tasks consolidated into one Makefile - similar to Gradle!

```bash
make help    # Show all available commands
```

## Start/Stop Services

```bash
# Unified commands
make start               # 🚀 Start everything
make stop                # 🛑 Stop everything
make restart             # 🔄 Restart everything
make status              # 📊 Show service status

# Individual components
make containers-start    # Start containers only
make containers-stop     # Stop containers only
make go-start           # Start Go servers only
make go-stop            # Stop Go servers only
make db-start           # Start databases only
make monitoring-start   # Start monitoring only
```

## Development

```bash
make dev                 # Build + start (perfect after code changes)
make health              # Check all health endpoints
make urls                # Show all service URLs
make test                # Run all tests
make test-coverage       # Run tests with coverage
make fmt                 # Format code
make lint                # Run linters
```

## Go Server Management

```bash
make go-build            # Build Go servers
make go-start            # Start Go servers
make go-stop             # Stop Go servers
make go-restart          # Restart Go servers
make go-logs-api         # View API server logs
make go-logs-game        # View Game server logs
make go-test             # Run Go tests
make go-test-coverage    # Run tests with coverage
make go-fmt              # Format Go code
```

## Database Management

```bash
make db-start            # Start all databases
make db-status           # Check database connection status
make db-shell-postgres   # Open PostgreSQL shell
make db-shell-redis      # Open Redis CLI
make db-shell-cassandra  # Open Cassandra CQL shell
make db-reset-postgres   # Reset PostgreSQL (CAUTION!)
```

## Container Management

```bash
make containers-start    # Start all containers
make containers-stop     # Stop all containers
make containers-restart  # Restart all containers
make containers-status   # Check container status
make containers-logs SERVICE=postgres  # View specific logs
make containers-clean    # Remove all (CAUTION: deletes data!)
```

## Load Testing

```bash
make load-test-setup     # Setup test users (run once)
make load-test-quick     # Quick load test
make load-test-api       # API load test
make load-test-websocket # WebSocket load test
make load-test-all       # Run all load tests
```

## Utilities

```bash
make clean               # Clean build artifacts and logs
make logs SERVICE=api    # View logs (api|game|postgres|redis|etc)
make ps                  # Show running processes
make ports               # Show ports in use
make quickstart          # Show quick reference
make version             # Show version info
```

## Monitoring

```bash
make monitoring-start            # Start Prometheus + Grafana
make monitoring-open-grafana     # Open Grafana in browser
make monitoring-open-prometheus  # Open Prometheus in browser
```

## Monitoring Dashboards

| Dashboard | URL | Credentials |
|-----------|-----|-------------|
| Grafana | http://localhost:3001 | admin / admin123 |
| Prometheus | http://localhost:9090 | - |
| pgAdmin | http://localhost:8080 | admin@tankroyale.com / admin123 |
| Redis Commander | http://localhost:8081 | - |

## Metrics Endpoints

```bash
# Application metrics
curl http://localhost:3000/metrics

# Health check
curl http://localhost:3000/health

# Redis metrics
curl http://localhost:9121/metrics

# PostgreSQL metrics
curl http://localhost:9187/metrics
```

## Useful Docker Commands

```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f [service]
docker-compose logs -f server
docker-compose logs -f redis
docker-compose logs -f postgres

# Restart services
docker-compose restart

# Stop all
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# Check resource usage
docker stats
```

## Database Access

```bash
# PostgreSQL
psql -U tank_user -d tank_royale -h localhost

# Redis CLI
redis-cli

# Common Redis commands
redis-cli KEYS "session:*"     # List sessions
redis-cli GET "session:userId" # Get session
redis-cli FLUSHALL             # Clear all (careful!)
```

## Common Workflows

### Full System Test
```bash
# 1. Start everything
make start

# 2. Wait for startup
sleep 10

# 3. Run load tests
make load-test-all

# 4. Check Grafana
make monitoring-open-grafana
```

### Debug Performance Issue
```bash
# 1. Open Grafana dashboard
make monitoring-open-grafana

# 2. Run load test
make load-test-api

# 3. Watch metrics in real-time
# - HTTP latency panel
# - Database connections
# - Memory usage
# - CPU usage

# 4. Check Prometheus for detailed queries
make monitoring-open-prometheus
```

### Clean Restart
```bash
# Stop everything
docker-compose down -v

# Start fresh
./start-monitoring.sh

# Re-initialize database
cd server
npm run dev  # Will run migrations

# Create test users
cd ../load-tests
npm run setup
```

## Environment Variables

Create `/server/.env.local`:
```bash
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://tank_user:dev_password_123@localhost:5432/tank_royale
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Client
CLIENT_URL=http://localhost:3000
```

## Project Structure

```
Tank-Royale-2/
├── go-server/       # Go API + Game servers
├── client/          # Frontend (future development)
├── load-tests/      # Load testing suite
├── monitoring/      # Prometheus + Grafana configs
├── database/        # Database schemas
├── docs/            # Documentation
└── postman/         # API testing collections
```

## Port Reference

| Service | Port | Description |
|---------|------|-------------|
| API Server | 8080 | Main backend API |
| Game Server | 8081 | WebSocket game server |
| Grafana | 3001 | Monitoring dashboards |
| PostgreSQL | 5432 | User/match database |
| Redis | 6379 | Sessions/cache |
| pgAdmin | 5050 | PostgreSQL GUI |
| Redis Commander | 8082 | Redis GUI |
| Prometheus | 9090 | Metrics storage |
| Cassandra | 9042 | Telemetry storage |

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 8080
lsof -ti:8080

# Kill process
kill -9 $(lsof -ti:8080)
```

### Database Connection Failed
```bash
# Check if containers are running
docker-compose ps

# Restart database
docker-compose restart postgres redis

# Check logs
docker-compose logs postgres
```

### Metrics Not Showing
```bash
# Test metrics endpoint
curl http://localhost:3000/metrics | head

# Check Prometheus targets
open http://localhost:9090/targets

# All should show "UP"
```

### Load Tests Failing
```bash
# Ensure server is running
curl http://localhost:3000/health

```bash
# Check test users exist
make load-test-setup

# Run with reduced load
make load-test-quick
```
```

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| HTTP p95 latency | < 200ms | TBD |
| WebSocket connections | 500+ | TBD |
| Matchmaking capacity | 1000 players | TBD |
| Memory usage | < 512MB | TBD |
| CPU usage | < 80% | TBD |

Run load tests to establish baseline!

## Next Phase

After load testing and optimization:
- **Phase 3**: Lobby System (pre-game chat, ready checks)
- **Phase 4**: Game Server Core (physics, combat)
- **Phase 5**: Client Application (React + Phaser)

## Resources

- [Architecture](docs/ARCHITECTURE.md)
- [Load Testing Guide](load-tests/README.md)
- [Monitoring Guide](monitoring/README.md)
- [API Documentation](docs/API_TESTING.md)
- [WebSocket Events](docs/WEBSOCKET_MATCHMAKING.md)

---

**Ready to test?** Run `make start` and `make load-test-all` 🚀
