# Tank Royale 2 - AI Context Document

> **Purpose**: This document provides comprehensive context for AI assistants to quickly understand the Tank Royale 2 project architecture, current state, and development processes.

## Project Overview

**Tank Royale 2** is a real-time multiplayer battle royale game (.io-style) built with Go backend and TypeScript/Phaser.js frontend. The project showcases distributed systems, real-time networking, and high-performance game server architecture.

### Current Status
- ✅ **Migration Complete**: Fully migrated from Node.js/TypeScript to Go (completed November 2025)
- ✅ **Production Ready**: All core systems implemented and tested
- ✅ **Infrastructure**: Containerized with Podman/Docker, monitored with Prometheus/Grafana
- 🚧 **Frontend**: Client application planned (Phase 5)

## Technology Stack

### Backend (Go)
- **API Server** (port 8080): REST API, authentication, user management
- **Game Server** (port 8081): WebSocket connections, real-time game logic, 30 TPS
- **Go Version**: 1.23+
- **Key Libraries**: gorilla/websocket, lib/pq, go-redis, gocql

### Databases
- **PostgreSQL 15** (port 5432): Users, matches, leaderboards, persistent data
- **Redis 7** (port 6379): Caching, sessions, matchmaking queue, real-time leaderboards
- **Cassandra 4.1** (port 9042): Game events, telemetry (optional)

### Infrastructure
- **Container Runtime**: Podman (compatible with Docker)
- **Monitoring**: Prometheus (9090) + Grafana (3001)
- **Admin Tools**: pgAdmin (5050), Redis Commander (8082)
- **Build System**: Makefile (60+ commands, like Gradle)

### Load Testing
- **Framework**: Artillery.io + custom Node.js scripts
- **Test Scenarios**: API load, WebSocket connections, matchmaking stress

## Architecture Patterns

### Real-Time Game Server
- **Tick Rate**: 30 TPS (33.33ms per tick)
- **Network**: Client-side prediction with server reconciliation
- **Lag Compensation**: 200ms state history buffer
- **Interest Management**: Players only receive updates for nearby entities

### Matchmaking System
- **Queue**: Redis sorted sets by MMR
- **Algorithm**: Skill-based matching with expanding search range
- **Lobby**: 16-player max per match
- **Timeout**: 60s queue timeout, auto-match with bots if needed

### Authentication & Security
- **Auth Method**: JWT tokens (access + refresh)
- **Password**: bcrypt hashing
- **Session Management**: Redis with TTL
- **Rate Limiting**: Implemented in middleware

### Caching Strategy
- **User Data**: Redis with 5-min TTL
- **Leaderboards**: Redis sorted sets (real-time)
- **Match Results**: Write-through to PostgreSQL
- **Cache Invalidation**: Event-driven on updates

## File Structure

```
Tank-Royale-2/
├── go-server/                    # Go backend
│   ├── cmd/
│   │   ├── api/main.go          # API server entry
│   │   └── game/main.go         # Game server entry
│   ├── internal/
│   │   ├── auth/                # JWT, bcrypt, middleware
│   │   ├── cache/               # Redis caching layer
│   │   ├── config/              # Environment configuration
│   │   ├── db/                  # PostgreSQL connection pool
│   │   ├── handlers/            # HTTP & WebSocket handlers
│   │   ├── metrics/             # Prometheus metrics
│   │   ├── middleware/          # Auth, CORS, logging
│   │   ├── models/              # Data structures
│   │   ├── repositories/        # Data access layer
│   │   └── websocket/           # Game server logic
│   ├── pkg/
│   │   ├── logger/              # Structured logging
│   │   └── utils/               # Helper functions
│   ├── bin/                     # Compiled binaries
│   ├── .env                     # Environment variables
│   ├── go.mod                   # Go dependencies
│   └── Makefile                 # Go-specific builds
│
├── database/
│   ├── postgres/schema.sql      # PostgreSQL schema
│   ├── redis/structures.md      # Redis data structures
│   └── cassandra/schema.cql     # Cassandra schema (optional)
│
├── load-tests/                   # Load testing suite
│   ├── websocket-go-test.js     # WebSocket game server test
│   ├── matchmaking-load-test.js # Matchmaking stress test
│   └── setup.js                 # Test user creation
│
├── monitoring/
│   ├── prometheus.yml           # Prometheus config
│   ├── grafana-dashboards.yml   # Dashboard provisioning
│   └── dashboards/              # Pre-built Grafana dashboards
│       ├── 01-http-api.json
│       ├── 02-database.json
│       ├── 03-game-server.json
│       └── 04-system-resources.json
│
├── scripts/
│   ├── start-all.sh             # Start all containers
│   ├── stop-all.sh              # Stop all containers
│   ├── start-go-servers.sh      # Start Go servers
│   ├── stop-go-servers.sh       # Stop Go servers
│   ├── start-databases.sh       # Start databases only
│   └── start-monitoring.sh      # Start monitoring stack
│
├── docs/                         # Technical documentation
├── client/                       # Frontend (future)
├── shared/                       # Shared TypeScript types
├── postman/                      # API testing collections
│
├── docker-compose.yml            # Container orchestration
├── Makefile                      # Main task runner (60+ commands)
├── README.md                     # Project overview
├── GETTING_STARTED.md            # Setup & usage guide
└── AI_CONTEXT.md                 # This file

Legacy/Archive:
├── .legacy-scripts/              # Old startup scripts (pre-Makefile)
└── server/                       # Old Node.js server (removed)
```

## Environment Configuration

### Critical Environment Variables (go-server/.env)
```bash
# Server Ports
API_PORT=8080
GAME_PORT=8081

# PostgreSQL
POSTGRES_HOST=127.0.0.1        # Must be 127.0.0.1 (not localhost - IPv6 issue)
POSTGRES_PORT=5432
POSTGRES_USER=tank_user
POSTGRES_PASSWORD=dev_password_123
POSTGRES_DB=tank_royale

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=                 # No password in dev

# Cassandra (optional)
CASSANDRA_HOSTS=localhost
CASSANDRA_KEYSPACE=tank_royale

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Environment
ENVIRONMENT=development
LOG_LEVEL=debug
```

## Common Development Operations

### Daily Workflow
```bash
make start           # Start everything (containers + Go servers)
make status          # Check service status
make logs SERVICE=api         # View API logs
make logs SERVICE=game        # View Game logs
make stop            # Stop everything
```

### Development Cycle
```bash
# After code changes
make go-build        # Build Go servers
make go-restart      # Restart Go servers
make go-test         # Run tests

# Or combined
make dev             # Build + start everything
```

### Database Operations
```bash
make db-status              # Check all databases
make db-shell-postgres      # Open PostgreSQL shell
make db-shell-redis         # Open Redis CLI
make db-shell-cassandra     # Open Cassandra CQL shell
```

### Testing
```bash
make go-test                # Go unit tests
make go-test-coverage       # Tests with coverage report
make load-test-setup        # Create test users (first time)
make load-test-quick        # Quick load test
make load-test-all          # All load tests
```

### Monitoring
```bash
make monitoring-start              # Start Prometheus + Grafana
make monitoring-open-grafana       # Open Grafana in browser
make monitoring-open-prometheus    # Open Prometheus in browser
```

### Troubleshooting
```bash
make status          # Overview of all services
make health          # Check health endpoints
make ports           # Show port usage
make ps              # Show running processes
make clean           # Clean build artifacts and logs
```

## Key Database Schemas

### PostgreSQL Tables
- **users**: id, username, email, password_hash, mmr, total_matches, wins, created_at
- **matches**: id, winner_id, duration, player_count, shrink_zones, created_at
- **match_participants**: match_id, user_id, placement, kills, damage_dealt, items_collected
- **leaderboards**: rank, user_id, username, mmr, wins, matches (view)

### Redis Structures
- **user:cache:{id}**: User data cache (5-min TTL)
- **session:{token}**: JWT sessions
- **leaderboard:global**: Sorted set by MMR
- **matchmaking:queue**: Sorted set by timestamp
- **match:{id}:state**: Match state (JSON)

### Cassandra Tables (Optional)
- **game_events**: match_id, timestamp, event_type, player_id, data
- **player_positions**: match_id, player_id, timestamp, x, y, velocity

## Known Issues & Gotchas

### PostgreSQL Connection
- **Issue**: Localhost resolves to IPv6 [::1] causing connection failures
- **Solution**: Use `POSTGRES_HOST=127.0.0.1` (not `localhost`)

### Container Health Checks
- **Issue**: pgAdmin takes ~30s to fully start, health checks may warn
- **Solution**: Health checks return warnings (not errors) for slow-starting containers

### PID File Tracking
- **Issue**: Go servers use `/tmp/api-server` and `/tmp/game-server` paths, PID files may be out of sync
- **Solution**: Rely on health checks (`curl localhost:8080/health`) not PID files

### Port Conflicts
- Common conflict: Port 8080 (API) or 8081 (Game)
- Check with: `make ports` or `lsof -i :8080`
- Kill with: `kill -9 $(lsof -ti:8080)`

## Migration History

### Node.js → Go Migration (Completed November 2025)
**Phases**:
1. ✅ Project setup, authentication, basic API
2. ✅ User management, database connections
3. ✅ Matchmaking system, Redis integration
4. ✅ Game server, WebSocket, real-time game loop

**Key Achievements**:
- 100% feature parity with old Node.js server
- Better performance (Go's concurrency)
- Simplified deployment (single binary)
- Better resource usage (lower memory, faster startup)

**Removed**:
- `/server/` directory (Node.js/Express/TypeScript)
- `/game-server/` directory (Node.js WebSocket server)
- npm dependencies for backend
- Exporter containers (redis-exporter, postgres-exporter, node-exporter)

## API Endpoints Reference

### Authentication
- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - Login (returns JWT)
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout

### Users
- `GET /api/users/me` - Get current user
- `PUT /api/users/me` - Update current user
- `GET /api/users/:id` - Get user by ID

### Matches
- `GET /api/matches` - List recent matches
- `GET /api/matches/:id` - Get match details
- `GET /api/matches/user/:userId` - Get user's match history

### Leaderboards
- `GET /api/leaderboard` - Global leaderboard (top 100)
- `GET /api/leaderboard/user/:userId` - User's rank

### Matchmaking
- `POST /api/matchmaking/join` - Join matchmaking queue
- `DELETE /api/matchmaking/leave` - Leave queue
- `GET /api/matchmaking/status` - Get queue status

### Health & Metrics
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

### WebSocket (Game Server - port 8081)
- Connection: `ws://localhost:8081/ws`
- Events: `player_join`, `player_move`, `player_shoot`, `player_hit`, `game_state`, etc.

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| API p95 latency | < 200ms | ✅ ~150ms |
| Game tick rate | 30 TPS | ✅ Stable 30 TPS |
| Concurrent players | 500+ | ✅ Tested 100+ |
| WebSocket connections | 1000+ | 🚧 Not tested |
| Memory per server | < 512MB | ✅ ~200MB |
| CPU usage | < 80% | ✅ ~30-40% |

## Next Development Phases

### Phase 5: Frontend Client (Planned)
- React + Phaser.js game client
- Socket.io-client for WebSocket
- Client-side prediction
- Sprite animations and effects

### Phase 6: Deployment (Planned)
- AWS infrastructure (EC2, RDS, ElastiCache)
- CI/CD pipeline
- Blue-green deployment
- Auto-scaling configuration

### Phase 7: Advanced Features (Planned)
- Spectator mode
- Replay system
- Tournament brackets
- Social features (friends, clans)
- In-game shop with cosmetics

## Testing & Quality

### Test Coverage
- Go unit tests: `make go-test`
- Integration tests: Manual via Postman
- Load tests: Artillery + custom scripts
- Coverage reports: `make go-test-coverage`

### Load Testing Scenarios
1. **API Load**: 100 users, 1000 req/s for 60s
2. **WebSocket**: 16 players, 30s match simulation
3. **Matchmaking**: 100 concurrent queue joins
4. **Heavy Load**: Sustained load for stress testing

## Monitoring & Observability

### Grafana Dashboards
1. **HTTP API Dashboard**: Request rates, latencies, error rates
2. **Database Dashboard**: Connection pools, query performance
3. **Game Server Dashboard**: Player counts, tick rates, WebSocket metrics
4. **System Resources**: CPU, memory, network I/O

### Prometheus Metrics
- HTTP metrics: `http_request_duration_seconds`, `http_requests_total`
- Game metrics: `game_players_connected`, `game_tick_duration_seconds`
- DB metrics: `db_connections_open`, `db_query_duration_seconds`

### Log Locations
- API Server: `/tmp/api-server.log`
- Game Server: `/tmp/game-server.log`
- Container logs: `make logs SERVICE=postgres` (or redis, cassandra, etc.)

## Build & Deployment

### Building Binaries
```bash
cd go-server
make build                    # Builds both servers
# Creates: bin/api and bin/game
```

### Manual Binary Execution
```bash
cd go-server
./bin/api                     # Run API server directly
./bin/game                    # Run Game server directly
```

### Container Management
```bash
# Via Makefile
make containers-start         # Start all containers
make containers-stop          # Stop all containers
make containers-clean         # Remove all containers (deletes data!)

# Via Podman directly
podman compose up -d          # Start all
podman compose down           # Stop all
podman compose down -v        # Stop and remove volumes
```

## Quick Reference Commands

```bash
# Most Common Commands
make start                    # Start everything
make stop                     # Stop everything
make status                   # Check status
make logs SERVICE=api         # View logs
make go-restart               # Restart Go servers
make load-test-quick          # Quick load test

# Development
make dev                      # Build and start
make go-build                 # Build Go servers
make go-test                  # Run Go tests

# Database
make db-status                # Check all databases
make db-shell-postgres        # PostgreSQL shell
make db-shell-redis           # Redis CLI

# Monitoring
make monitoring-open-grafana  # Open Grafana
make urls                     # Show all service URLs

# Troubleshooting
make health                   # Health check all services
make ports                    # Show port usage
make clean                    # Clean artifacts
```

## Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| API Server | http://localhost:8080 | - |
| Game Server | http://localhost:8081 | - |
| Grafana | http://localhost:3001 | admin/admin123 |
| Prometheus | http://localhost:9090 | - |
| pgAdmin | http://localhost:5050 | admin@tankroyale.com/admin123 |
| Redis Commander | http://localhost:8082 | - |

## Additional Resources

- **Makefile**: Run `make help` for complete command list
- **GETTING_STARTED.md**: Setup and daily usage guide
- **docs/ARCHITECTURE.md**: Detailed technical architecture
- **docs/API_TESTING.md**: Complete API endpoint documentation
- **postman/**: API testing collection for Postman
- **monitoring/dashboards/**: Grafana dashboard JSON exports

---

**Last Updated**: November 14, 2025  
**Migration Status**: Complete ✅  
**Production Ready**: Yes ✅
