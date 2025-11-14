# Load Testing Suite

Comprehensive load tests for Tank Royale 2 backend services.

## 📋 Test Scenarios

1. **API Endpoints** - REST API load testing (Go API server)
2. **WebSocket Connections** - Real-time connection stress test
3. **Matchmaking Queue** - Queue system performance
4. **Physics & Movement Simulation** - Realistic player movement with vectors, collisions, and powerups (NEW!)
5. **Game Loop Simulation** - Full gameplay with movement, combat, and loot
6. **Database Performance** - PostgreSQL and Redis stress

## Prerequisites

Before running load tests:

1. **Start the database services**:
   ```bash
   cd ..
   make containers-start
   # OR individually
   podman compose up -d postgres redis
   ```

2. **Start the Go servers**:
   ```bash
   cd ..
   make go-start-api    # API server on port 8080
   make go-start-game   # Game server on port 8081
   # OR start both
   make start
   ```

3. **Verify servers are running**:
   ```bash
   curl http://localhost:8080/health
   # Should return: {"status":"healthy",...}
   curl http://localhost:8081/health
   # Should return: {"status":"healthy",...}
   ```

4. **Install load test dependencies**:
   ```bash
   cd load-tests
   npm install
   ```

## Quick Start

```bash
# Start the servers first
cd ..
make start

# In another terminal, run load tests
cd load-tests
npm install                      # First time only
npm run preflight                # Verify system readiness
npm run test:ws-simple           # Basic WebSocket connectivity (16 players)
npm run test:physics-quick       # Physics simulation (8 players, 30s)
npm run test:physics             # Full physics test (16 players, 60s)
npm run test:physics-stress      # Stress test (32 players, 120s)
npm run test:api                 # Test REST endpoints
npm run test:websocket           # Test WebSocket connections
npm run test:matchmaking         # Test matchmaking queue
```

## 📊 Test Scenarios Explained

### 1. API Load Test (`api-load-test.yml`)

Tests authentication and user endpoints:
- **Warm-up**: 10 users over 30 seconds
- **Ramp-up**: 50 users over 60 seconds
- **Peak load**: 100 users over 120 seconds
- **Sustained**: 200 users over 180 seconds

**Endpoints tested:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User authentication
- `GET /api/users/:id` - Profile retrieval
- `GET /api/leaderboard/wins` - Leaderboard queries

**Expected metrics:**
- Response time p95: < 500ms
- Response time p99: < 1000ms
- Success rate: > 99%

### 2. WebSocket Load Test (`websocket-load-test.js`)

Simulates concurrent WebSocket connections:
- Connects 500 clients simultaneously
- Each client authenticates with JWT
- Sends periodic ping/pong
- Measures connection time and memory

**What it tests:**
- Socket.IO server capacity
- Authentication middleware performance
- Connection pooling
- Memory usage under load

### 3. Matchmaking Load Test (`matchmaking-load-test.js`)

Stress tests the matchmaking queue:
- 1000 players join queue rapidly
- Random MMR values (1000-2000)
- Measures queue processing time
- Tests Redis queue performance
- Validates match creation

**What it tests:**
- Redis sorted set performance
- Background matchmaking service
- Lobby creation under load
- Player notification delivery

### 4. Game Loop Load Test (`game-loop-load-test.js`) 🆕

**NEW!** Simulates complete gameplay on the Go game server:
- 32 players (2 full 16-player matches)
- Real player movement and physics
- Weapon firing (Pistol, Rifle, Shotgun, Sniper)
- Loot collection (shields, damage boosts, fire rate boosts)
- Combat simulation with damage
- 30 TPS game state updates
- 20 movement updates per second per player

**What it tests:**
- Go game server performance
- 30 TPS game loop stability
- Goroutine-based concurrency
- Physics and collision detection
- Weapon systems (all 4 types)
- Loot system with stackable upgrades
- Combat mechanics
- Game state synchronization
- WebSocket message throughput

**Expected metrics:**
- Tick rate: 30 TPS (±5 TPS)
- p95 latency: < 100ms
- Movement updates: 20/sec per player
- Shots fired: ~30% of updates
- Error rate: < 5%

**Environment variables:**
```bash
API_URL=http://localhost:8080       # Go API server
GAME_URL=ws://localhost:8081        # Go game server WebSocket
NUM_PLAYERS=32                      # Number of players (default: 2 matches)
TEST_DURATION=180                   # Test duration in seconds
```

**Quick test:**
```bash
npm run test:game-quick  # 16 players, 60 seconds
```

### 5. Full System Test (`full-system-test.yml`)

End-to-end realistic simulation:
- Users register and login
- Join matchmaking
- Stay connected
- Simulate real user behavior

## 📈 Interpreting Results

### Good Performance Indicators:
- ✅ HTTP p95 < 200ms, p99 < 500ms
- ✅ WebSocket connections: < 100ms
- ✅ 0% error rate
- ✅ Memory stable (no leaks)
- ✅ CPU < 80%

### Warning Signs:
- ⚠️ Response times increasing over time
- ⚠️ Error rate > 1%
- ⚠️ Memory continuously growing
- ⚠️ CPU sustained at 100%

### Critical Issues:
- 🔴 Connections timing out
- 🔴 Database connection pool exhausted
- 🔴 Redis memory maxed out
- 🔴 Server crashes

## 🔧 Tuning Recommendations

### If Response Times Are High:
1. Check database connection pool size
2. Add database indexes
3. Enable Redis caching
4. Optimize queries (use EXPLAIN)

### If Memory Is Growing:
1. Check for WebSocket memory leaks
2. Verify disconnect handlers cleanup
3. Review event listener removal
4. Monitor Redis memory usage

### If CPU Is Maxed:
1. Reduce logging in production
2. Optimize hot code paths
3. Consider horizontal scaling
4. Profile with Node.js profiler

## 📊 Monitoring During Tests

### Watch Server Metrics:
```bash
# Monitor in real-time
docker stats

# Check PostgreSQL connections
docker exec -it tank-royale-postgres psql -U tank_user -d tank_royale -c "SELECT count(*) FROM pg_stat_activity;"

# Check Redis memory
docker exec -it tank-royale-redis redis-cli INFO memory
```

### Check Logs:
```bash
# Server logs
cd ../server && npm run dev

# Database logs
docker logs -f tank-royale-postgres

# Redis logs
docker logs -f tank-royale-redis
```

## 🎯 Performance Targets

Based on Go migration and architecture goals:

| Metric | Target | Go Implementation | Status |
|--------|--------|-------------------|--------|
| Concurrent connections | 10,000+ | Yes | ⏳ |
| HTTP p95 latency | < 100ms | Yes | ⏳ |
| WebSocket connect time | < 50ms | Yes | ⏳ |
| Game loop tick rate | 30 TPS | Yes (goroutines) | ⏳ |
| Movement updates/sec | 20 per player | Yes | ⏳ |
| Matchmaking throughput | 100 players/sec | Yes | ⏳ |
| Database queries/sec | 10,000+ | Yes (pgx) | ⏳ |
| Memory per connection | < 2KB | Yes (goroutines) | ⏳ |

## 🐛 Troubleshooting

### "ECONNREFUSED" Error
Go servers not running. Start with:
```bash
cd .. && make start
```

### "Authentication failed" 
Make sure Redis is running:
```bash
cd .. && make db-status
```

### "Connection timeout" in game loop test
Game server might not be ready. Check:
```bash
curl http://localhost:8081/health
podman logs tank-royale-game-server  # If running in container
```

### "Too many open files"
Increase system limits:
```bash
ulimit -n 10000
```

### WebSocket library not found
Install dependencies:
```bash
npm install
```

## 🎮 Physics & Movement Simulation Test

NEW! Comprehensive physics simulation validating realistic player movement with vectors, collisions, and powerups.

**Features tested:**
- ✅ Vector-based movement (velocity, acceleration, friction)
- ✅ 5 movement patterns (circular, zigzag, random walk, patrol, aggressive)
- ✅ Boundary collision detection with bounce physics
- ✅ Player-to-player collision with impulse response
- ✅ Powerup collection (shields, damage/fire rate boosts)
- ✅ Weapon switching and firing with cooldowns
- ✅ 30 TPS simulation matching server tick rate

**Quick Commands:**
```bash
npm run test:physics-quick       # 8 players, 30 seconds
npm run test:physics             # 16 players, 60 seconds
npm run test:physics-stress      # 32 players, 120 seconds
```

**Expected Results (16 players, 60s):**
- Movement Updates: ~28,800 (468/sec)
- Collisions: 1-10
- Powerups Collected: 200-300
- Shots Fired: 1,200-2,000
- Messages/sec: 350-400

**See [PHYSICS_TESTING.md](./PHYSICS_TESTING.md) for complete documentation.**

## 📚 Additional Resources

- [Artillery Documentation](https://www.artillery.io/docs)
- [Socket.IO Load Testing](https://socket.io/docs/v4/load-testing/)
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)
- [Physics Testing Guide](./PHYSICS_TESTING.md) (NEW!)
- [Game Loop Testing Guide](./GAME_LOOP_TESTING.md)

## 🎉 Success Criteria

You're ready to move forward when:
- ✅ All tests pass at target load
- ✅ No memory leaks detected (stable over time)
- ✅ Response times within targets
- ✅ Game loop maintains 30 TPS under load
- ✅ Physics simulation shows realistic movement and collisions
- ✅ Powerup collection and combat mechanics work correctly
- ✅ System recovers after stress
- ✅ Monitoring shows healthy metrics
- ✅ Players can connect, move, collide, collect powerups, and fire weapons without errors

**New Game Loop Test Success Indicators:**
- ✅ 30 TPS maintained (±5 TPS acceptable)
- ✅ All 4 weapon types fire correctly
- ✅ Loot collection works (shields, boosts, weapons)
- ✅ Player movement synchronized across clients
- ✅ Combat damage calculated correctly
- ✅ No goroutine leaks (check with `pprof`)

Good luck! 🚀
