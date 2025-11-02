# Tank Royale 2

A real-time multiplayer .io-style battle royale game built to showcase system design, multi-threading, caching, and distributed databases.

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
- **Backend**: Node.js, TypeScript, Express, Socket.io
- **Game Server**: Worker Threads (30 TPS per lobby)
- **Databases**: 
  - PostgreSQL (user accounts, match results)
  - Cassandra (game events, telemetry)
  - Redis (leaderboards, matchmaking queue, cache)
- **Deployment**: AWS (EC2, RDS, ElastiCache, Keyspaces)

### Key Design Patterns
- **Client-side prediction** with server reconciliation
- **Lag compensation** (200ms state history buffer)
- **Interest management** (only send nearby entities)
- **Delta compression** for efficient networking
- **Authoritative server** for cheat prevention

## 📁 Project Structure

```
tank-royale-2/
├── client/                 # Frontend (Phaser.js)
│   ├── src/
│   │   ├── scenes/        # Game scenes
│   │   ├── entities/      # Player, projectile classes
│   │   ├── network/       # WebSocket client
│   │   └── utils/         # Interpolation, prediction
│   └── assets/            # Sprites, sounds
│
├── server/                # Backend API
│   ├── src/
│   │   ├── api/          # Express routes
│   │   ├── auth/         # Authentication
│   │   ├── matchmaking/  # Queue management
│   │   └── websocket/    # Socket.io handlers
│   └── tests/
│
├── game-server/           # Game loop workers
│   ├── src/
│   │   ├── lobby/        # Lobby manager
│   │   ├── physics/      # Collision detection
│   │   ├── validation/   # Anti-cheat
│   │   └── lag-comp/     # Lag compensation
│   └── tests/
│
├── shared/                # Shared types/constants
│   ├── types/            # TypeScript interfaces
│   └── constants/        # Game constants
│
├── database/
│   ├── postgres/         # PostgreSQL schemas
│   ├── cassandra/        # Cassandra schemas
│   └── migrations/       # Database migrations
│
└── infrastructure/        # DevOps
    ├── docker/           # Docker configs
    ├── aws/              # Terraform/CloudFormation
    └── monitoring/       # Prometheus configs
```

## 🚀 Development Roadmap

### Phase 1: Core Infrastructure
- [ ] Project setup with TypeScript
- [ ] Database schemas (PostgreSQL, Cassandra, Redis)
- [ ] Basic Express API server
- [ ] WebSocket connection handling
- [ ] Worker thread pool for game loops

### Phase 2: Game Mechanics
- [ ] Basic player movement (client-side)
- [ ] Server-side physics and collision
- [ ] Shooting mechanics with validation
- [ ] Lag compensation system
- [ ] Interest management networking

### Phase 3: Game Features
- [ ] Loot system (spawning, collection, effects)
- [ ] Map shrinking mechanic
- [ ] Health and damage system
- [ ] Player elimination and respawn

### Phase 4: Progression Systems
- [ ] User authentication (JWT)
- [ ] Match history tracking
- [ ] MMR/ELO system
- [ ] Leaderboards (Redis sorted sets)
- [ ] Matchmaking queue

### Phase 5: Polish & Deployment
- [ ] Frontend UI/UX
- [ ] Game balancing
- [ ] Docker containerization
- [ ] AWS deployment
- [ ] Monitoring and analytics

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

# Install dependencies
cd server && npm install
cd ../load-tests && npm install
cd ..

# Start all containers with one command
./tank.sh setup
```

### Regular Development
```bash
# Start all containers (databases, monitoring, admin tools)
./tank.sh start

# Start the API server
cd server && npm run dev

# In another terminal: Run load tests
cd load-tests && npm run test:quick
```

### Stop Everything
```bash
# Stop all containers
./tank.sh stop
```

### Quick Help
```bash
# See all available commands
./tank.sh help
```

Visit:
- **Grafana Dashboard**: http://localhost:3001 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **pgAdmin**: http://localhost:8080
- **Redis Commander**: http://localhost:8081

📚 See [GETTING_STARTED.md](./GETTING_STARTED.md) for detailed setup instructions.

## 🏗️ Current Status

**Phase 1**: ✅ Complete - Foundation and infrastructure
**Phase 2**: 🔄 In Progress - Backend API and authentication
**Phase 3-10**: ⏳ Planned - See [Roadmap](docs/ROADMAP.md)

## 📊 Tech Stack Rationale

| Technology | Purpose | Why Chosen |
|------------|---------|------------|
| **TypeScript** | Full-stack language | Type safety, easier refactoring |
| **Node.js** | Backend runtime | Real-time friendly, event-driven |
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