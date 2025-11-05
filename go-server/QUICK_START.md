# Tank Royale 2 - Go Quick Start Guide

## ✅ Phase 1 Complete!

Your Go server foundation is ready. Here's what we've built and how to use it.

---

## 🎯 What's Been Created

### 1. Two Server Applications
- **API Server** (`cmd/api/main.go`) - REST API for auth, leaderboard, stats
- **Game Server** (`cmd/game/main.go`) - WebSocket game server

### 2. Core Infrastructure
- **Configuration** - Environment-based config with sensible defaults
- **Logging** - Structured JSON logging with zerolog
- **Database** - PostgreSQL and Redis connections ready
- **Models** - User, Game, Tank, Bullet entities defined
- **Health Checks** - Both servers expose `/health` endpoints

---

## 🚀 Quick Start

### 1. Start Databases (Using Your Existing Setup)
```bash
cd /home/erceozmetin/Documents/GitHub/Tank-Royale-2
./scripts/start-databases.sh
```

### 2. Navigate to Go Server
```bash
cd go-server
```

### 3. Run API Server
```bash
# Terminal 1
make run-api

# Or directly with go
go run cmd/api/main.go
```

You should see:
```
{"level":"info","time":"...","message":"Starting Tank Royale API Server"}
{"level":"info","time":"...","message":"Connected to PostgreSQL"}
{"level":"info","time":"...","message":"Connected to Redis"}
{"level":"info","address":":8080","message":"API server listening"}
```

### 4. Run Game Server (In Another Terminal)
```bash
# Terminal 2
cd go-server
make run-game

# Or directly
go run cmd/game/main.go
```

### 5. Test the Servers

**API Server Health Check:**
```bash
curl http://localhost:8080/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-05T...",
  "services": {
    "postgres": true,
    "redis": true
  }
}
```

**API Version:**
```bash
curl http://localhost:8080/api/
```

Response:
```json
{
  "name": "Tank Royale API",
  "version": "2.0.0-go",
  "language": "Go",
  "status": "migrating"
}
```

**Game Server Health Check:**
```bash
curl http://localhost:8081/health
```

---

## 📁 Project Structure Explained

```
go-server/
├── cmd/                    # Entry points (main.go files)
│   ├── api/               # API server binary
│   └── game/              # Game server binary
│
├── internal/              # Private application code
│   ├── config/           # Configuration management
│   ├── db/               # Database connections
│   │   ├── postgres/
│   │   └── redis/
│   └── models/           # Data models (User, Tank, etc.)
│
├── pkg/                   # Public packages (reusable)
│   └── logger/           # Logging utilities
│
├── bin/                   # Compiled binaries (gitignored)
├── .env                   # Your environment variables
├── go.mod                 # Go module definition
└── Makefile              # Build commands
```

---

## 🛠️ Available Commands

### Build
```bash
make build          # Build both servers
make clean          # Remove build artifacts
```

### Run
```bash
make run-api        # Run API server
make run-game       # Run game server
```

### Test (Phase 2+)
```bash
make test           # Run all tests
make test-coverage  # Run tests with coverage report
make bench          # Run benchmarks
```

### Development
```bash
make fmt            # Format code (gofmt)
make deps           # Download dependencies
```

---

## 🔧 Configuration

Edit `go-server/.env`:

```env
# Change ports if needed
API_PORT=8080
GAME_PORT=8081

# Database settings (should match your docker-compose)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=tankroyale
POSTGRES_PASSWORD=tankroyale
POSTGRES_DB=tankroyale

REDIS_HOST=localhost
REDIS_PORT=6379

# JWT secret (will be important in Phase 2)
JWT_SECRET=your-secret-key-change-in-production

# Game settings
GAME_TICK_RATE=60
MAX_PLAYERS_PER_ROOM=10
```

---

## 📊 Current API Endpoints

### ✅ Implemented
- `GET /health` - Health check (both servers)
- `GET /api/` - API version info

### 🔄 Placeholders (Phase 2)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `GET /api/leaderboard` - Get leaderboard
- `GET /api/stats/:playerID` - Get player stats
- `GET /ws` - WebSocket connection (Phase 3)

---

## 🎓 Learning Go Alongside

### Key Files to Study

1. **Configuration:** `internal/config/config.go`
   - Environment variable loading
   - Struct composition
   - Helper functions

2. **Database:** `internal/db/postgres/postgres.go`
   - Connection pooling
   - Context usage
   - Error handling

3. **Models:** `internal/models/*.go`
   - Struct definitions
   - JSON tags
   - Composition over inheritance

4. **Main Servers:** `cmd/*/main.go`
   - Goroutines (`go func()`)
   - Channels (`signal.Notify`)
   - Graceful shutdown

### Go Concepts in Action

**Struct Embedding (internal/models/game.go):**
```go
type Vector2D struct {
    X float64
    Y float64
}

type Tank struct {
    Position Vector2D  // Has-a relationship
    Health   int
}
```

**Interfaces (internal/db/postgres/postgres.go):**
```go
// Health() method makes DB implement a HealthChecker interface
func (db *DB) Health() error {
    return db.Pool.Ping(ctx)
}
```

**Goroutines (cmd/api/main.go):**
```go
// Server runs in background
go func() {
    server.ListenAndServe()
}()

// Main goroutine waits for shutdown signal
<-quit
```

---

## 🎯 Next: Phase 2 - Authentication

When you're ready, we'll implement:

1. **JWT Authentication**
   - Token generation
   - Token validation middleware
   - Password hashing

2. **User Management**
   - Repository pattern
   - CRUD operations
   - Database queries

3. **REST API Endpoints**
   - Register user
   - Login user
   - Get user profile
   - Leaderboard
   - Statistics

This will show you:
- Middleware in Go
- Database operations with pgx
- JSON request/response handling
- Error handling patterns
- Repository pattern

---

## 🐛 Troubleshooting

### Server Won't Start
```bash
# Check if databases are running
docker ps

# Check if ports are available
lsof -i :8080
lsof -i :8081

# Check logs (they're JSON formatted)
go run cmd/api/main.go 2>&1 | jq
```

### Database Connection Failed
```bash
# Test PostgreSQL connection
psql -h localhost -U tankroyale -d tankroyale

# Test Redis connection
redis-cli ping
```

### Build Errors
```bash
# Clean and rebuild
make clean
go mod tidy
make build
```

---

## 📚 Resources

### Go Learning
- [Tour of Go](https://go.dev/tour/) - Interactive introduction
- [Effective Go](https://go.dev/doc/effective_go) - Best practices
- [Go by Example](https://gobyexample.com/) - Code examples

### Libraries We're Using
- [Chi Router](https://github.com/go-chi/chi) - HTTP routing
- [pgx](https://github.com/jackc/pgx) - PostgreSQL driver
- [go-redis](https://github.com/redis/go-redis) - Redis client
- [zerolog](https://github.com/rs/zerolog) - Logging

---

## ✅ Success! What's Working

- ✅ Go 1.23+ installed
- ✅ Both servers compile
- ✅ Configuration loaded
- ✅ Database connections working
- ✅ Structured logging
- ✅ Health checks
- ✅ Graceful shutdown
- ✅ Project structure following Go conventions

---

## 🎉 You're Ready!

You now have a solid foundation for the Go migration. The servers are running, databases are connected, and the structure is in place.

**To continue:**
1. Explore the code in the files listed above
2. Try modifying configuration in `.env`
3. Read through the migration strategy in `GO_MIGRATION_STRATEGY.md`
4. When ready, we'll tackle Phase 2: Authentication & REST API

**Questions to explore:**
- How does graceful shutdown work with channels?
- How do defer statements ensure cleanup?
- How does struct embedding differ from inheritance?
- How do goroutines make the server concurrent?

Let me know when you're ready for Phase 2! 🚀
