# Getting Started with Tank Royale 2

This guide will help you set up the development environment and start building the game.

## Prerequisites

### Required Software
- **Node.js**: v18+ ([Download](https://nodejs.org/))
- **npm**: v9+ (comes with Node.js)
- **Docker**: For running databases locally ([Download](https://www.docker.com/))
- **Git**: For version control

### Recommended Tools
- **VS Code**: With TypeScript, ESLint, Prettier extensions
- **Postman** or **Insomnia**: For testing API endpoints
- **Redis Commander**: GUI for Redis (optional)
- **pgAdmin**: GUI for PostgreSQL (optional)

---

## Step 1: Clone and Install

```bash
# Clone the repository
cd /home/erceozmetin/Documents/GitHub/Tank-Royale-2

# Copy environment variables
cp .env.example .env

# Install root dependencies
npm install

# Install all workspace dependencies
npm run install:all
```

---

## Step 2: Set Up Databases with Docker

Create a `docker-compose.yml` file for local development:

```bash
# Start all databases
docker-compose up -d

# Check if running
docker ps
```

You should see:
- PostgreSQL on port 5432
- Cassandra on port 9042
- Redis on port 6379

---

## Step 3: Initialize Databases

### PostgreSQL Setup
```bash
# Connect to PostgreSQL
docker exec -it tank-postgres psql -U tank_user -d tank_royale

# Run schema
\i database/postgres/schema.sql

# Verify tables
\dt
```

### Cassandra Setup
```bash
# Connect to Cassandra
docker exec -it tank-cassandra cqlsh

# Run schema
SOURCE 'database/cassandra/schema.cql';

# Verify keyspace
DESCRIBE tank_royale;
```

### Redis (No setup needed)
Redis runs without schema. We'll create data structures programmatically.

---

## Step 4: Configure Environment Variables

Edit `.env` file:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
GAME_SERVER_PORT=3001

# Database - PostgreSQL (from docker-compose)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=tank_royale
POSTGRES_USER=tank_user
POSTGRES_PASSWORD=dev_password_123

# Database - Cassandra
CASSANDRA_HOSTS=localhost
CASSANDRA_PORT=9042
CASSANDRA_KEYSPACE=tank_royale
CASSANDRA_USER=cassandra
CASSANDRA_PASSWORD=cassandra

# Database - Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Authentication
JWT_SECRET=super_secret_dev_key_change_in_prod
JWT_EXPIRES_IN=7d

# Game Configuration
MAX_LOBBIES=5
PLAYERS_PER_LOBBY=16
SERVER_TICK_RATE=30
MATCHMAKING_TIMEOUT=30000
```

---

## Step 5: Build Shared Package

The `shared` package contains types and constants used by all services.

```bash
cd shared
npm run build
cd ..
```

---

## Step 6: Start Development Servers

### Option A: Start All Services (Recommended)
```bash
# From root directory
npm run dev
```

This starts:
- Client dev server (Vite) on `http://localhost:5173`
- API server on `http://localhost:3000`
- Game server workers on `http://localhost:3001`

### Option B: Start Services Individually

**Terminal 1 - API Server**:
```bash
npm run dev:server
```

**Terminal 2 - Game Server**:
```bash
npm run dev:game
```

**Terminal 3 - Client**:
```bash
npm run dev:client
```

---

## Step 7: Verify Installation

### Test API Server
```bash
# Health check
curl http://localhost:3000/health

# Expected response:
{"status":"ok","timestamp":"2025-11-02T10:00:00.000Z"}
```

### Test Database Connections
```bash
# PostgreSQL
curl http://localhost:3000/api/debug/postgres

# Cassandra
curl http://localhost:3000/api/debug/cassandra

# Redis
curl http://localhost:3000/api/debug/redis
```

### Test Frontend
Open browser to `http://localhost:5173`. You should see the main menu.

---

## Development Workflow

### 1. Making Changes

**Shared Types** (used by all services):
```bash
cd shared
# Edit src/types.ts or src/constants.ts
npm run build  # Rebuild
```

**Server**:
```bash
cd server
# Edit files in src/
# nodemon will auto-restart
```

**Game Server**:
```bash
cd game-server
# Edit files in src/
# nodemon will auto-restart
```

**Client**:
```bash
cd client
# Edit files in src/
# Vite will hot-reload
```

### 2. Running Tests

```bash
# Run all tests
npm test

# Test specific package
cd server && npm test
cd game-server && npm test
```

### 3. Linting and Formatting

```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint -- --fix

# Format code
npm run format
```

---

## Project Structure Overview

```
tank-royale-2/
├── client/              # Frontend (Phaser.js)
│   ├── src/
│   │   ├── scenes/     # Game scenes
│   │   ├── entities/   # Player, projectile classes
│   │   ├── network/    # WebSocket client
│   │   └── main.ts     # Entry point
│   └── public/         # Static assets
│
├── server/             # Backend API
│   ├── src/
│   │   ├── routes/     # Express routes
│   │   ├── auth/       # Authentication
│   │   ├── db/         # Database clients
│   │   └── index.ts    # Server entry
│   └── tests/
│
├── game-server/        # Game loop workers
│   ├── src/
│   │   ├── lobby/      # Lobby management
│   │   ├── physics/    # Game physics
│   │   ├── worker.ts   # Worker thread code
│   │   └── index.ts    # Main process
│   └── tests/
│
├── shared/             # Shared code
│   └── src/
│       ├── types.ts    # TypeScript interfaces
│       ├── constants.ts # Game constants
│       └── utils.ts    # Utility functions
│
└── database/           # Database schemas
    ├── postgres/
    ├── cassandra/
    └── redis/
```

---

## Common Tasks

### Create a New API Endpoint

1. Add route in `server/src/routes/`:
```typescript
// server/src/routes/leaderboard.ts
import { Router } from 'express';
const router = Router();

router.get('/', async (req, res) => {
  // Implementation
});

export default router;
```

2. Register route in `server/src/index.ts`:
```typescript
import leaderboardRoutes from './routes/leaderboard';
app.use('/api/leaderboard', leaderboardRoutes);
```

### Add a New WebSocket Event

1. Add message type in `shared/src/types.ts`:
```typescript
export enum MessageType {
  // ...existing
  PLAYER_EMOTE = 'PLAYER_EMOTE',
}
```

2. Handle in game server:
```typescript
// game-server/src/handlers/emote.ts
socket.on(MessageType.PLAYER_EMOTE, (data) => {
  // Handle emote
});
```

### Add a New Database Table

1. Add migration in `database/postgres/migrations/`:
```sql
-- 002_add_friends_table.sql
CREATE TABLE friends (
  user_id UUID REFERENCES users(user_id),
  friend_id UUID REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_id)
);
```

2. Run migration:
```bash
docker exec -it tank-postgres psql -U tank_user -d tank_royale
\i database/postgres/migrations/002_add_friends_table.sql
```

---

## Troubleshooting

### "Cannot connect to PostgreSQL"
```bash
# Check if container is running
docker ps | grep postgres

# Check logs
docker logs tank-postgres

# Restart container
docker-compose restart postgres
```

### "Redis connection refused"
```bash
# Check Redis
docker ps | grep redis
docker logs tank-redis

# Test connection
redis-cli ping  # Should return PONG
```

### "Port already in use"
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### "TypeScript errors"
```bash
# Rebuild shared package
cd shared && npm run build

# Clear TypeScript cache
rm -rf */dist */tsconfig.tsbuildinfo
```

---

## Next Steps

Now that your environment is set up, follow the development roadmap:

### Phase 1: Core Infrastructure ✅ (Current)
- [x] Project structure
- [x] Database schemas
- [x] Shared types

### Phase 2: Basic API (Next)
- [ ] Implement authentication endpoints
- [ ] Database connection managers
- [ ] Basic WebSocket connection

### Phase 3: Game Server
- [ ] Worker thread setup
- [ ] Basic game loop (30 TPS)
- [ ] Player movement

### Phase 4: Frontend
- [ ] Phaser.js setup
- [ ] Main menu scene
- [ ] Basic rendering

See `docs/ROADMAP.md` for detailed tasks.

---

## Getting Help

- **Documentation**: Check `docs/` folder
- **Architecture**: See `docs/ARCHITECTURE.md`
- **Issues**: Open GitHub issue
- **Discord**: [Join our Discord](#) (if applicable)

---

Happy coding! 🚀
