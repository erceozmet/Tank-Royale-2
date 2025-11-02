# 🚀 Tank Royale 2 - Quick Command Reference

## Start Services

```bash
# Start monitoring stack (databases + monitoring)
./start-monitoring.sh

# Start API server (development mode)
cd server && npm run dev

# Start all databases only
./start-databases.sh
```

## Load Testing

```bash
cd load-tests

# Setup test users (run once)
npm run setup

# Run individual tests
npm run test:api          # HTTP API load test
npm run test:websocket    # WebSocket stress test  
npm run test:matchmaking  # Matchmaking queue test

# Run all tests
npm run test:all

# Quick test (reduced load)
npm run test:quick
```

## Testing

```bash
cd server

# Run all tests with coverage
npm test

# Watch mode
npm run test:watch

# Unit tests only
npm run test:unit
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
./start-monitoring.sh
cd server && npm run dev &

# 2. Wait 10 seconds for startup
sleep 10

# 3. Run load tests
cd ../load-tests
npm run setup
npm run test:all

# 4. Check Grafana
open http://localhost:3001
```

### Debug Performance Issue
```bash
# 1. Open Grafana dashboard
open http://localhost:3001

# 2. Run load test
cd load-tests && npm run test:api

# 3. Watch metrics in real-time
# - HTTP latency panel
# - Database connections
# - Memory usage
# - CPU usage

# 4. Check Prometheus for detailed queries
open http://localhost:9090
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
├── server/          # API server (Node.js + Express + Socket.IO)
├── game-server/     # Game server (future Phase 4)
├── client/          # Frontend (future Phase 5)
├── shared/          # Shared types and utilities
├── load-tests/      # Load testing suite
├── monitoring/      # Prometheus + Grafana configs
├── database/        # Database schemas
├── docs/            # Documentation
└── postman/         # API testing collections
```

## Port Reference

| Service | Port | Description |
|---------|------|-------------|
| API Server | 3000 | Main backend API |
| Grafana | 3001 | Monitoring dashboards |
| PostgreSQL | 5432 | User/match database |
| Redis | 6379 | Sessions/cache |
| pgAdmin | 8080 | PostgreSQL GUI |
| Redis Commander | 8081 | Redis GUI |
| Prometheus | 9090 | Metrics storage |
| Redis Exporter | 9121 | Redis metrics |
| Node Exporter | 9100 | System metrics |
| Postgres Exporter | 9187 | PostgreSQL metrics |
| Cassandra | 9042 | Telemetry (Phase 6) |

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 3000
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)
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

# Check test users exist
cd load-tests && npm run setup

# Run with reduced load
npm run test:quick
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

**Ready to test?** Run `./start-monitoring.sh` and `cd load-tests && npm run test:all` 🚀
