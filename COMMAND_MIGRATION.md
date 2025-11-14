# Tank Royale 2 - Command Migration Guide

## 🎯 Why Makefile?

We've consolidated all scripts into a unified Makefile (similar to Gradle in Java) for:
- **Consistency** - One interface for all tasks
- **Discoverability** - `make help` shows everything
- **Simplicity** - Shorter, memorable commands
- **Cross-platform** - Works the same everywhere
- **Dependencies** - Automatic task orchestration

## 📊 Command Comparison

### Old Way → New Way

#### Starting Services
```bash
# Old
./start-everything.sh
./tank.sh start
./start-go-servers.sh
./scripts/start-databases.sh

# New - ONE COMMAND
make start
make containers-start    # If you just want containers
make go-start           # If you just want Go servers
make db-start           # If you just want databases
```

#### Stopping Services
```bash
# Old
./stop-everything.sh
./tank.sh stop
./stop-go-servers.sh

# New
make stop
make go-stop
```

#### Checking Status
```bash
# Old
podman ps
curl http://localhost:8080/health
curl http://localhost:8081/health

# New - ONE COMMAND
make status    # Shows everything at once
make health    # Just health checks
```

#### Viewing Logs
```bash
# Old
tail -f /tmp/tank-api.log
tail -f /tmp/tank-game.log
podman logs -f tank-postgres

# New - CONSISTENT INTERFACE
make logs SERVICE=api
make logs SERVICE=game
make logs SERVICE=postgres
```

#### Database Access
```bash
# Old
podman exec -it tank-postgres psql -U tank_user -d tank_royale
podman exec -it tank-redis redis-cli
podman exec -it tank-cassandra cqlsh

# New - SHORTER & MEMORABLE
make db-shell-postgres
make db-shell-redis
make db-shell-cassandra
```

#### Building & Testing
```bash
# Old
cd go-server
go build -o bin/api cmd/api/main.go
go build -o bin/game cmd/game/main.go
go test ./...
go test -coverprofile=coverage.out ./...

# New - FROM ANYWHERE
make go-build
make go-test
make go-test-coverage
```

#### Development Workflow
```bash
# Old - Multiple steps
./stop-go-servers.sh
cd go-server && make build && cd ..
./start-go-servers.sh

# New - ONE COMMAND
make dev    # Rebuilds and restarts everything
```

## 🚀 Common Workflows

### Morning Startup
```bash
# Old
./start-everything.sh
# Wait...
curl http://localhost:8080/health
curl http://localhost:8081/health
podman ps

# New
make start     # Starts everything
make status    # Shows full status with health checks
```

### Making Changes & Testing
```bash
# Old
./stop-go-servers.sh
cd go-server && make build
./start-go-servers.sh
cd go-server && go test ./...

# New
make dev       # Rebuilds and restarts
make test      # Runs tests
```

### Debugging
```bash
# Old
tail -f /tmp/tank-api.log &
tail -f /tmp/tank-game.log &
podman logs -f tank-postgres &
# Multiple terminal windows...

# New
make logs SERVICE=api      # In terminal 1
make logs SERVICE=game     # In terminal 2
make logs SERVICE=postgres # In terminal 3
```

### Checking Service URLs
```bash
# Old
cat BOOT_COMMANDS.md | grep "http://"
# Or remember them...

# New
make urls    # Shows all URLs instantly
```

## 🎓 Learning the New Commands

### Essential Commands (Learn These First)
```bash
make help      # Shows all available commands
make start     # Start everything
make stop      # Stop everything
make status    # Check what's running
make urls      # Show all service URLs
```

### Development Commands
```bash
make dev       # Build and start (after code changes)
make test      # Run tests
make logs      # View logs
make health    # Check health
```

### Database Commands
```bash
make db-status        # Check databases
make db-shell-postgres  # Open PostgreSQL
make db-shell-redis    # Open Redis
```

### Discovery
```bash
make help             # See all commands organized by category
make help | grep go   # Find Go-related commands
make help | grep db   # Find database commands
```

## ✅ Migration Checklist

- [x] ✅ All scripts still work (backwards compatible)
- [x] ✅ New Makefile provides unified interface
- [x] ✅ Documentation updated with Make commands
- [x] ✅ Quick start guide emphasizes Make
- [x] ✅ Colored output for better readability
- [x] ✅ Smart error messages
- [x] ✅ Organized by categories (Setup, Development, Testing, etc.)

## 🔄 Transition Period

**Both approaches work!** Use whichever you prefer:

```bash
# Traditional scripts (still work)
./start-everything.sh
./tank.sh start
./stop-go-servers.sh

# New unified Makefile (recommended)
make start
make status
make stop
```

Over time, you'll naturally prefer the shorter Make commands!

## 💡 Pro Tips

1. **Tab completion works!** Type `make s<TAB>` to see all commands starting with 's'

2. **Help is always available**: `make help` shows everything

3. **Chain commands**: `make clean && make dev`

4. **Check before acting**: `make status` before `make start`

5. **Logs are easy**: `make logs SERVICE=<name>` works for everything

## 🎯 Next Time You Boot

Just remember TWO commands:
```bash
make start    # Start everything
make stop     # Stop everything
```

Everything else is discoverable via `make help`!
