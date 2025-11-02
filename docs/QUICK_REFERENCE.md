# Tank Royale 2 - Quick Reference

Quick reference for common commands, patterns, and concepts.

---

## 🚀 Quick Start Commands

```bash
# Initial setup
npm install
npm run install:all
cp .env.example .env

# Start databases
docker-compose up -d

# Start all services
npm run dev

# Individual services
npm run dev:client    # Frontend (port 5173)
npm run dev:server    # API server (port 3000)
npm run dev:game      # Game server (port 3001)

# Build for production
npm run build

# Run tests
npm test

# Lint and format
npm run lint
npm run format
```

---

## 📊 Project Structure

```
tank-royale-2/
├── client/          → Phaser.js game client (60 FPS)
├── server/          → Express API + Socket.io (auth, matchmaking)
├── game-server/     → Worker threads (game loops at 30 TPS)
├── shared/          → Common types, constants, utils
├── database/        → SQL/CQL schemas
└── docs/            → Documentation
```

---

## 🎮 Game Architecture

### Client (Browser)
- **Rendering**: 60 FPS with Phaser.js
- **Prediction**: Local movement immediately
- **Interpolation**: Smooth between server updates
- **Input**: Mouse aim + WASD movement

### API Server (Main Thread)
- **Auth**: JWT authentication
- **Matchmaking**: Redis queue management
- **WebSocket**: Socket.io gateway
- **Routing**: Assigns players to worker threads

### Game Server (Worker Threads)
- **Game Loop**: 30 ticks per second (33.33ms)
- **Physics**: Movement, collision, projectiles
- **Validation**: Anti-cheat checks
- **Lag Compensation**: 200ms state history

---

## 💾 Database Usage

### PostgreSQL (Structured Data)
```sql
-- Users, matches, results
SELECT * FROM users WHERE email = ?;
SELECT * FROM matches WHERE user_id = ? ORDER BY start_time DESC;
```

**When to use**:
- ✅ User accounts
- ✅ Match results
- ✅ Relationships (friends)
- ✅ Anything needing ACID transactions

### Cassandra (Event Logs)
```cql
-- High-volume time-series data
SELECT * FROM game_events WHERE match_id = ? ORDER BY event_timestamp DESC;
SELECT * FROM combat_log WHERE match_id = ?;
```

**When to use**:
- ✅ Game events
- ✅ Player telemetry
- ✅ Analytics data
- ✅ High-write throughput

### Redis (Cache & Queues)
```javascript
// Leaderboards
await redis.zadd('leaderboard:wins', wins, userId);
await redis.zrevrange('leaderboard:wins', 0, 99);

// Matchmaking queue
await redis.lpush('queue:mmr:1000-1200', playerData);

// Active lobbies
await redis.hset(`lobby:${id}`, 'status', 'playing');
```

**When to use**:
- ✅ Leaderboards (sorted sets)
- ✅ Matchmaking queues (lists)
- ✅ Session storage (strings)
- ✅ Caching (with TTL)

---

## 🌐 API Endpoints

### Authentication
```
POST   /api/auth/register    → Create account
POST   /api/auth/login       → Login, get JWT
POST   /api/auth/logout      → Invalidate token
GET    /api/auth/me          → Get current user
```

### User
```
GET    /api/user/:id         → User profile
GET    /api/user/:id/matches → Match history
GET    /api/user/:id/stats   → Aggregated stats
```

### Matchmaking
```
POST   /api/matchmaking/join  → Join queue
DELETE /api/matchmaking/leave → Leave queue
GET    /api/matchmaking/status → Queue position
```

### Leaderboard
```
GET    /api/leaderboard/wins  → Top 100 by wins
GET    /api/leaderboard/mmr   → Top 100 by MMR
```

---

## 🔌 WebSocket Events

### Client → Server
```javascript
socket.emit('player_input', {
  timestamp: Date.now(),
  velocity: {x: 3, y: 2},
  rotation: 1.5
});

socket.emit('player_shoot', {
  timestamp: Date.now(),
  direction: {x: 1, y: 0}
});
```

### Server → Client
```javascript
socket.on('game_state', (state) => {
  // Full state (every 10th tick)
  // nearbyPlayers, projectiles, loot, safeZone
});

socket.on('state_delta', (delta) => {
  // Incremental updates
  // changedPlayers, newProjectiles, removedProjectiles
});

socket.on('player_hit', (data) => {
  // Damage notification
});

socket.on('game_over', (results) => {
  // Match ended, show results
});
```

---

## 🎯 Key Constants

```typescript
// Game Loop
SERVER_TICK_RATE = 30        // 30 ticks per second
CLIENT_FPS = 60              // 60 frames per second

// Players
MAX_PLAYERS = 16             // Per lobby
PLAYER_MAX_HEALTH = 100
PLAYER_BASE_SPEED = 5        // units per tick

// Weapons
WEAPON_FIRE_RATE = 500       // ms between shots
WEAPON_BASE_DAMAGE = 15
PROJECTILE_SPEED = 10

// Map
MAP_WIDTH = 4000
MAP_HEIGHT = 4000
SAFE_ZONE_DAMAGE = 2         // per tick outside

// Networking
INTEREST_RADIUS = 800        // units
LAG_COMPENSATION_BUFFER = 200 // ms
DISCONNECT_GRACE_PERIOD = 10000 // ms

// Matchmaking
MMR_STARTING = 1000
MMR_RANGE = 200              // ± for matching
MMR_GAIN_WIN = 25
```

---

## 🔧 Common Patterns

### Adding a New API Endpoint

1. **Define route**:
```typescript
// server/src/routes/example.ts
import { Router } from 'express';
import { authenticate } from '../auth/middleware';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    // Implementation
    res.json({ data: 'example' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

2. **Register in server**:
```typescript
// server/src/index.ts
import exampleRoutes from './routes/example';
app.use('/api/example', exampleRoutes);
```

### Adding a WebSocket Event

1. **Define message type** (shared):
```typescript
// shared/src/types.ts
export enum MessageType {
  NEW_EVENT = 'NEW_EVENT',
}
```

2. **Handle in game server**:
```typescript
// game-server/src/handlers/example.ts
socket.on(MessageType.NEW_EVENT, (data) => {
  // Validate
  // Process
  // Broadcast
});
```

### Querying Database

**PostgreSQL**:
```typescript
import { pool } from '../db/postgres';

const result = await pool.query(
  'SELECT * FROM users WHERE user_id = $1',
  [userId]
);
const user = result.rows[0];
```

**Cassandra**:
```typescript
import { client } from '../db/cassandra';

const query = 'SELECT * FROM game_events WHERE match_id = ?';
const result = await client.execute(query, [matchId]);
const events = result.rows;
```

**Redis**:
```typescript
import { redis } from '../db/redis';

// String
await redis.set('key', 'value', 'EX', 60);
const value = await redis.get('key');

// Sorted Set
await redis.zadd('leaderboard', score, member);
const top = await redis.zrevrange('leaderboard', 0, 99);

// Hash
await redis.hset('lobby:123', 'status', 'playing');
const status = await redis.hget('lobby:123', 'status');
```

---

## 🐛 Debugging

### View Logs
```bash
# Docker container logs
docker logs tank-postgres
docker logs tank-cassandra
docker logs tank-redis

# Application logs (in dev mode)
# Check terminal running npm run dev
```

### Database Connections
```bash
# PostgreSQL
docker exec -it tank-postgres psql -U tank_user -d tank_royale

# Cassandra
docker exec -it tank-cassandra cqlsh

# Redis
docker exec -it tank-redis redis-cli
```

### Common Issues

**"Cannot connect to database"**:
```bash
# Check if running
docker ps

# Restart
docker-compose restart
```

**"Port already in use"**:
```bash
# Find process
lsof -i :3000

# Kill
kill -9 <PID>
```

**"TypeScript errors"**:
```bash
# Rebuild shared package
cd shared && npm run build
```

---

## 📈 Performance Metrics

Monitor these in production:

```javascript
// Server metrics
- active_lobbies: 25
- active_players: 400
- avg_tick_time: 8ms (target: <20ms)
- avg_latency: 45ms (target: <100ms)

// Database metrics
- postgres_query_time: <10ms
- cassandra_write_latency: <5ms
- redis_hit_rate: >95%

// Game metrics
- avg_match_duration: 5min
- avg_kills_per_match: 3.2
- player_retention: 60%
```

---

## 🚀 Deployment Checklist

- [ ] Environment variables set
- [ ] Databases provisioned
- [ ] Docker images built
- [ ] SSL certificates configured
- [ ] Load balancer set up
- [ ] Monitoring enabled
- [ ] Backups configured
- [ ] CI/CD pipeline working
- [ ] Health checks passing
- [ ] Load testing completed

---

## 📚 Documentation

- **Architecture**: `docs/ARCHITECTURE.md` - Full system design
- **Getting Started**: `docs/GETTING_STARTED.md` - Setup guide
- **Roadmap**: `docs/ROADMAP.md` - Development phases
- **Decisions**: `docs/DECISIONS.md` - Why we chose what

---

## 🎓 Learning Resources

### System Design
- [System Design Primer](https://github.com/donnemartin/system-design-primer)
- [AWS Well-Architected](https://aws.amazon.com/architecture/well-architected/)

### Game Networking
- [Valve's Networking Guide](https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking)
- [Gabriel Gambetta's Fast-Paced Multiplayer](https://www.gabrielgambetta.com/client-server-game-architecture.html)

### Databases
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Cassandra University](https://www.datastax.com/learn/cassandra-fundamentals)
- [Redis University](https://university.redis.com/)

---

## 💡 Tips

1. **Start simple**: Get basic features working before optimizing
2. **Test early**: Write tests as you go
3. **Profile first**: Measure before optimizing
4. **Document decisions**: Future you will thank present you
5. **Commit often**: Small, focused commits
6. **Use TypeScript**: Type safety saves debugging time
7. **Log everything**: Helps with debugging production issues
8. **Monitor metrics**: Know your system's behavior

---

Good luck! 🎮
