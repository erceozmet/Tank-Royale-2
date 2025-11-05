# Go Server Quick Reference

## Running Servers

### Development Mode (with hot reload)
```bash
# API Server
cd go-server && go run ./cmd/api/main.go

# Game Server  
cd go-server && go run ./cmd/game/main.go
```

### Production Build
```bash
cd go-server
go build -o bin/api ./cmd/api/main.go
go build -o bin/game ./cmd/game/main.go

# Run
./bin/api &
./bin/game &
```

## Ports
- **API Server:** 8080
- **Game Server:** 8081
- **PostgreSQL:** 5432
- **Redis:** 6379
- **Cassandra:** 9042
- **Prometheus:** 9090
- **Grafana:** 3001
- **pgAdmin:** 5050

## Key Endpoints

### API Server (localhost:8080)
- `GET /health` - Health check
- `GET /api/` - API version info
- `GET /metrics` - Prometheus metrics

### Game Server (localhost:8081)
- `GET /health` - Health check
- `GET /ws` - WebSocket (not implemented)
- `GET /metrics` - Prometheus metrics

## Container Management

### Start All Containers
```bash
./scripts/start-databases.sh
```

### Individual Containers
```bash
# PostgreSQL
podman start tank-postgres

# Redis
podman start tank-redis

# Cassandra
podman start tank-cassandra

# Monitoring Stack
podman start tank-prometheus tank-grafana tank-pgadmin
```

### Stop All
```bash
podman stop tank-postgres tank-redis tank-cassandra tank-prometheus tank-grafana tank-pgadmin
```

### Check Status
```bash
podman ps
```

## Database Access

### PostgreSQL (pgAdmin)
1. Open http://localhost:5050
2. Login: admin@admin.com / admin
3. Add Server:
   - Name: Tank Royale
   - Host: host.containers.internal
   - Port: 5432
   - Database: tank_royale
   - Username: tank_user
   - Password: tank_pass_dev_only

### PostgreSQL (CLI)
```bash
podman exec -it tank-postgres psql -U tank_user -d tank_royale
```

### Redis (CLI)
```bash
podman exec -it tank-redis redis-cli
```

## Monitoring

### Prometheus
- URL: http://localhost:9090
- Targets: http://localhost:9090/targets
- Query examples:
  ```promql
  rate(http_requests_total[5m])
  game_players_active
  go_goroutines{job="tank-royale-api"}
  ```

### Grafana
- URL: http://localhost:3001
- Login: admin / admin
- Import dashboard: `monitoring/dashboards/go-servers-dashboard.json`

### View Metrics
```bash
# API metrics
curl http://localhost:8080/metrics

# Game metrics
curl http://localhost:8081/metrics
```

## Testing

### Health Checks
```bash
curl http://localhost:8080/health
curl http://localhost:8081/health
```

### Load Test
```bash
# Simple load test
for i in {1..100}; do curl -s http://localhost:8080/health > /dev/null; done

# Check metrics after
curl -s http://localhost:8080/metrics | grep http_requests_total
```

## Common Tasks

### Kill Server on Port
```bash
# Kill process on port 8080
lsof -ti :8080 | xargs kill -9

# Kill process on port 8081
lsof -ti :8081 | xargs kill -9
```

### View Logs
```bash
# API server (if running with nohup)
tail -f /tmp/api-server.log

# Game server
tail -f /tmp/game-server.log
```

### Rebuild After Changes
```bash
cd go-server

# Format code
go fmt ./...

# Check for issues
go vet ./...

# Build
go build ./cmd/api/main.go
go build ./cmd/game/main.go
```

## Environment Variables

Located in `go-server/.env`:
```bash
# Server Configuration
API_PORT=8080
GAME_PORT=8081

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=tank_user
POSTGRES_PASSWORD=tank_pass_dev_only
POSTGRES_DB=tank_royale

REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Game Settings
GAME_TICK_RATE=60
MAX_PLAYERS_PER_ROOM=4
```

## Project Structure

```
go-server/
├── cmd/
│   ├── api/          # API server binary
│   └── game/         # Game server binary
├── internal/
│   ├── config/       # Configuration
│   ├── db/           # Database connections
│   ├── metrics/      # Prometheus metrics
│   ├── middleware/   # HTTP middleware
│   └── models/       # Data models
├── pkg/
│   └── logger/       # Logging utilities
└── .env              # Environment variables
```

## Next Phase

Ready for **Phase 2: Authentication & REST API**
- JWT authentication
- User registration/login
- Leaderboard endpoints
- Stats endpoints
- Repository pattern

See `GO_MIGRATION_STRATEGY.md` for full roadmap.

---

**Current Status:** Phase 1 Complete ✅  
**Servers Running:** API (8080), Game (8081)  
**Monitoring:** Prometheus + Grafana configured  
**Databases:** PostgreSQL, Redis, Cassandra connected
