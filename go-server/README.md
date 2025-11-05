# Tank Royale 2 - Go Server

High-performance game server written in Go, leveraging goroutines for massive concurrent player support.

## Architecture

- **cmd/api**: REST API server (authentication, leaderboard, stats)
- **cmd/game**: WebSocket game server (real-time gameplay)
- **internal**: Private application code
  - **auth**: JWT authentication & authorization
  - **config**: Configuration management
  - **db**: Database connections (PostgreSQL, Redis, Cassandra)
  - **game**: Game logic, physics, entities
  - **matchmaking**: Player matchmaking system
  - **models**: Shared data models
  - **repositories**: Data access layer
  - **services**: Business logic
  - **websocket**: WebSocket infrastructure
- **pkg**: Public reusable packages
- **tests**: Integration and unit tests

## Prerequisites

- Go 1.22+
- PostgreSQL 14+
- Redis 7+
- Cassandra 4+ (optional)

## Quick Start

### Install Dependencies
```bash
go mod download
```

### Run REST API Server
```bash
go run cmd/api/main.go
```

### Run Game Server
```bash
go run cmd/game/main.go
```

### Run Tests
```bash
go test ./...
```

### Build
```bash
# Build both servers
make build

# Or build individually
go build -o bin/api cmd/api/main.go
go build -o bin/game cmd/game/main.go
```

## Environment Variables

Create a `.env` file:
```env
# Server
API_PORT=8080
GAME_PORT=8081
ENV=development

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=tankroyale
POSTGRES_PASSWORD=tankroyale
POSTGRES_DB=tankroyale

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=24h

# Game
GAME_TICK_RATE=60
MAX_PLAYERS_PER_ROOM=10
```

## Performance

- **10,000+** concurrent WebSocket connections
- **<16ms** game loop latency (60 FPS)
- **<50ms** p99 message latency
- **~2KB** per goroutine (vs 1MB per thread)

## Development

### Project Layout
Following standard Go project layout: https://github.com/golang-standards/project-layout

### Code Style
- Use `gofmt` for formatting
- Follow effective Go guidelines
- Write tests for all new features

### Testing
```bash
# Unit tests
go test ./internal/...

# Integration tests
go test ./tests/integration/...

# With coverage
go test -cover ./...

# Benchmark
go test -bench=. ./...
```

## Monitoring

- Prometheus metrics exposed on `/metrics`
- Health check on `/health`
- Grafana dashboards in `/monitoring`

## Migration from Node.js

See [GO_MIGRATION_STRATEGY.md](../GO_MIGRATION_STRATEGY.md) for full migration plan.

## License

MIT
