# Tank Royale 2

A real-time multiplayer .io-style battle royale game built to showcase system design, multi-threading, caching, and distributed databases.

Design Architecture
<img width="1184" height="1170" alt="Screenshot_2026-04-09_17-46-13" src="https://github.com/user-attachments/assets/97bb51b9-fc27-4ec8-8a63-de98d0741ee4" />


📖 Full docs: [START_HERE.md](START_HERE.md) | [BOOT_COMMANDS.md](BOOT_COMMANDS.md)

## 🎮 Game Features

- **16-player lobbies** with real-time combat
- **Battle royale mechanics** with shrinking map
- **Loot system** with permanent upgrades and temporary boosts
- **Skill-based matchmaking** (MMR system)
- **Global leaderboards** with ranking system
- **Optimized networking** with interest management

## 🏗️ Architecture

### Tech Stack
- **Frontend**: TypeScript, Phaser.js, Socket.io-client
- **Backend**: Go (REST API + Game Server with 30 TPS)
- **Databases**: 
  - PostgreSQL (user accounts, match results)
  - Cassandra (game events, telemetry - optional)
  - Redis (leaderboards, matchmaking queue, cache)
- **Deployment**: AWS (EC2, RDS, ElastiCache, Keyspaces)
- **Monitoring**: Prometheus + Grafana

### Key Design Patterns
- **Client-side prediction** with server reconciliation
- **Lag compensation** (200ms state history buffer)
- **Interest management** (only send nearby entities)
- **Delta compression** for efficient networking
- **Authoritative server** for cheat prevention

## 📁 Project Structure

```
tank-royale-2/
├── client/                 # Frontend (Phaser.js) [Future]
│   └── src/
│
├── go-server/             # Go Backend (API + Game Server) ✅
│   ├── cmd/
│   │   ├── api/          # REST API server (port 8080)
│   │   └── game/         # Game server with WebSockets (port 8081)
│   ├── internal/
│   │   ├── auth/         # JWT authentication
│   │   ├── game/         # Game logic, physics, matchmaking
│   │   ├── handlers/     # HTTP handlers
│   │   ├── middleware/   # Auth, metrics middleware
│   │   ├── models/       # Data models
│   │   ├── repositories/ # Database layer
│   │   └── websocket/    # WebSocket infrastructure
│   └── tests/
│
├── shared/                # Shared types/constants [Future]
│   └── src/
│
├── database/
│   ├── postgres/         # PostgreSQL schemas
│   ├── cassandra/        # Cassandra schemas (optional)
│   └── redis/            # Redis structures
│
├── monitoring/           # Prometheus + Grafana configs
├── load-tests/           # Performance testing
├── scripts/              # Automation scripts
└── docs/                 # Documentation
```

## 🚀 Development Roadmap

### Phase 1: Core Infrastructure ✅
- [x] Go project setup with TypeScript
- [x] Database schemas (PostgreSQL, Cassandra, Redis)
- [x] Go REST API server
- [x] WebSocket connection handling
- [x] Prometheus metrics integration

### Phase 2: Authentication & REST API ✅
- [x] JWT authentication (129 passing tests)
- [x] User registration and login
- [x] Session management (Redis)
- [x] Leaderboards and stats endpoints

### Phase 3: WebSocket Infrastructure ✅
- [x] WebSocket connection manager
- [x] Room/lobby system
- [x] Message routing
- [x] Player session management

### Phase 4: Game Mechanics ✅
- [x] Game entities (Player, Projectiles, Obstacles, Loot)
- [x] Server-side physics and collision (30 TPS)
- [x] Combat system with 4 weapons
- [x] Procedural map generation
- [x] Match lifecycle management
- [x] MMR-based matchmaking system
- [x] Safe zone shrinking mechanic

### Phase 5: Frontend & Polish (Next)
- [ ] Phaser.js game client
- [ ] Client-side prediction and interpolation
- [ ] UI/UX design
- [ ] Sound and visual effects

### Phase 6: Production Deployment
- [ ] Docker optimization
- [ ] AWS deployment (EC2, RDS)
- [ ] CI/CD pipeline
- [ ] Load testing at scale
- [ ] Monitoring and alerting

## 🎯 System Design Learning Goals

- ✅ Multi-threading with Worker Threads
- ✅ Distributed databases (PostgreSQL + Cassandra)
- ✅ Caching strategies (Redis)
- ✅ Real-time networking (WebSockets)
- ✅ Horizontal scalability
- ✅ Anti-cheat and validation
- ✅ Performance optimization

## 📊 Performance Targets

- Server tick rate: 30 TPS
- Client render rate: 60 FPS
- Network latency: <100ms
- Lobbies per server: 20-30 concurrent
- Players per lobby: 16

## 🔒 Security Features

- Authoritative server architecture
- Server-side validation (movement, shooting, collision)
- Rate limiting on API endpoints
- JWT authentication
- Input sanitization

## � Documentation

- **[Getting Started](docs/GETTING_STARTED.md)** - Setup and installation guide
- **[Architecture](docs/ARCHITECTURE.md)** - Detailed system design and technical decisions
- **[Roadmap](docs/ROADMAP.md)** - Development phases and task breakdown
- **[Decisions](docs/DECISIONS.md)** - Summary of key architectural choices
- **[Quick Reference](docs/QUICK_REFERENCE.md)** - Commands, patterns, and tips

## 🎯 What Makes This Project Unique

This project showcases advanced system design concepts:

1. **Real-Time Networking**
   - 30 TPS server with 60 FPS client rendering
   - Client-side prediction and server reconciliation
   - Lag compensation (200ms state history)
   - Interest management (only send nearby entities)

2. **Multi-Threading**
   - Worker thread pool for parallel game loops
   - Each worker handles 3-5 lobbies independently
   - True parallelism utilizing all CPU cores

3. **Distributed Databases**
   - PostgreSQL for relational data (ACID transactions)
   - Cassandra for high-volume event logs (time-series)
   - Redis for caching, queues, and leaderboards

4. **Scalability**
   - Designed for horizontal scaling
   - Stateless game servers
   - Redis-based coordination

5. **Security**
   - Server-authoritative architecture
   - Anti-cheat validation (speed, collisions, fire rate)
   - JWT authentication

## 🚀 Quick Start

### First Time Setup
```bash
# Clone the repository
git clone <repository-url>
cd tank-royale-2

# Start all containers with one command
make setup
```

### Regular Development
```bash
# Start everything (containers + Go servers)
make start

# Check status
make status

# Run load tests
cd load-tests
npm run preflight              # Check system readiness
npm run test:game-quick        # Quick game loop test (16 players, 60s)
npm run test:gameloop          # Full game loop test (32 players, 3 min)
```

**New!** 🎮 **Game Loop Load Test** - Simulates real gameplay:
- Player movement and physics
- All 4 weapon types (Pistol, Rifle, Shotgun, Sniper)
- Loot collection (shields, damage/fire rate boosts)
- Combat damage calculation
- 30 TPS server tick rate validation

See [load-tests/LOAD_TESTING_UPDATES.md](load-tests/LOAD_TESTING_UPDATES.md) for details.

### Stop Everything
```bash
# Stop everything
make stop
```

### Quick Help
```bash
# See all available commands
make help
```

Visit:
- **Grafana Dashboard**: http://localhost:3001 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **pgAdmin**: http://localhost:8080
- **Redis Commander**: http://localhost:8081

📚 See [GETTING_STARTED.md](./GETTING_STARTED.md) for detailed setup instructions.

## 🏗️ Current Status

**Migration Complete**: 🎉 All backend functionality has been successfully migrated from Node.js to Go!

**Phase 1-4**: ✅ Complete - Backend infrastructure, authentication, game logic, and matchmaking
**Phase 5**: ⏳ Next - Frontend client with Phaser.js
**Phase 6**: ⏳ Planned - Production deployment

### What's Working Now
- ✅ **Go REST API** - Authentication, leaderboards, stats (port 8080)
- ✅ **Go Game Server** - Real-time gameplay with WebSockets (port 8081)
- ✅ **30 TPS Game Loop** - Physics, collision, combat system
- ✅ **MMR Matchmaking** - Skill-based player matching
- ✅ **Match Persistence** - Full game results stored in PostgreSQL
- ✅ **Test Coverage** - 129+ tests with 100% coverage on core game logic
- ✅ **Monitoring** - Prometheus metrics + Grafana dashboards

## 📊 Tech Stack Rationale

| Technology | Purpose | Why Chosen |
|------------|---------|------------|
| **TypeScript** | Full-stack language | Type safety, easier refactoring |
| **Go** | Backend runtime | High-performance, concurrent, efficient |
| **Phaser.js** | Game engine | Mature 2D framework, large community |
| **Socket.io** | WebSocket library | Easy real-time communication |
| **PostgreSQL** | Relational DB | ACID compliance, complex queries |
| **Cassandra** | NoSQL DB | High-volume writes, time-series data |
| **Redis** | In-memory cache | Fast reads, leaderboards, queues |
| **AWS** | Cloud provider | Industry standard, scalable |

## 🎓 Learning Outcomes

By building this project, you'll gain hands-on experience with:

- ✅ System design and architecture
- ✅ Real-time networking and WebSockets
- ✅ Multi-threading and concurrency
- ✅ Distributed databases and caching strategies
- ✅ Client-server game architecture
- ✅ Performance optimization
- ✅ Security and anti-cheat mechanisms
- ✅ AWS deployment and infrastructure

## 👤 Author

Erce Ozmetin
