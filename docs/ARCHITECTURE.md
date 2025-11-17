# Tank Royale 2 - System Architecture

## Overview

Tank Royale 2 is a real-time multiplayer battle royale game designed to showcase advanced system design concepts including multi-threading, distributed databases, caching strategies, and real-time networking.

---

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Browser (Phaser.js + TypeScript)                        │  │
│  │  - 60 FPS rendering with interpolation                   │  │
│  │  - Client-side prediction                                │  │
│  │  - Interest management (only render nearby)              │  │
│  │  - WebSocket connection (Socket.io-client)               │  │
│  └────────────────────────┬─────────────────────────────────┘  │
└────────────────────────────┼────────────────────────────────────┘
                             │ WebSocket (Socket.io)
                             │ HTTPS/WSS
┌────────────────────────────▼────────────────────────────────────┐
│                       API/GATEWAY LAYER                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Go + Chi Router + Gorilla WebSocket                     │  │
│  │  - Authentication (JWT)                                  │  │
│  │  - WebSocket connection management                       │  │
│  │  - Matchmaking queue management                          │  │
│  │  - Lobby assignment                                      │  │
│  │  - Load balancing to goroutines                          │  │
│  └──┬────────────────────┬──────────────────┬───────────────┘  │
└─────┼────────────────────┼──────────────────┼──────────────────┘
      │                    │                  │
      │ Goroutine Pool     │                  │
      │ (Game Loops)       │                  │
      │                    │                  │
┌─────▼────────┐  ┌────────▼──────┐  ┌───────▼────────┐
│  Goroutine 1 │  │  Goroutine 2  │  │  Goroutine N   │
│  (Lobby 1-3) │  │  (Lobby 4-6)  │  │  (Lobby N-M)   │
├──────────────┤  ├───────────────┤  ├────────────────┤
│ Game Loop    │  │  Game Loop    │  │  Game Loop     │
│ 30 TPS       │  │  30 TPS       │  │  30 TPS        │
│              │  │               │  │                │
│ - Physics    │  │  - Physics    │  │  - Physics     │
│ - Collision  │  │  - Collision  │  │  - Collision   │
│ - Validation │  │  - Validation │  │  - Validation  │
│ - Lag Comp   │  │  - Lag Comp   │  │  - Lag Comp    │
└──────┬───────┘  └───────┬───────┘  └────────┬───────┘
       │                  │                    │
       └──────────────────┼────────────────────┘
                          │
                          │ Read/Write
┌─────────────────────────▼──────────────────────────────┐
│                    DATA LAYER                           │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │  PostgreSQL  │  │  Cassandra   │  │    Redis    │  │
│  │   (RDS)      │  │  (Keyspaces) │  │ (ElastiCache│  │
│  ├──────────────┤  ├──────────────┤  ├─────────────┤  │
│  │ Users        │  │ Game Events  │  │ Leaderboard │  │
│  │ Matches      │  │ Telemetry    │  │ Active      │  │
│  │ Match        │  │ Combat Logs  │  │ Lobbies     │  │
│  │ Results      │  │ Analytics    │  │ Matchmaking │  │
│  │              │  │              │  │ Queue       │  │
│  └──────────────┘  └──────────────┘  │ Sessions    │  │
│                                       │ Cache       │  │
│                                       └─────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Key Components

### 1. Client (Frontend)

**Technology**: TypeScript + Phaser.js + WebSocket client

**Responsibilities**:
- Render game at 60 FPS
- Client-side prediction for responsive feel
- Interpolation between server updates
- Send player input to server
- Interest management (only render nearby entities)

**Key Files**:
```
client/
├── src/
│   ├── scenes/
│   │   ├── MenuScene.ts          # Main menu
│   │   ├── GameScene.ts          # Main gameplay
│   │   └── LobbyScene.ts         # Waiting room
│   ├── entities/
│   │   ├── Player.ts             # Player entity with prediction
│   │   ├── Projectile.ts         # Bullet rendering
│   │   └── Loot.ts               # Loot items
│   ├── network/
│   │   ├── SocketClient.ts       # WebSocket wrapper
│   │   ├── Interpolation.ts      # Smooth movement
│   │   └── Prediction.ts         # Client-side prediction
│   └── utils/
│       └── Camera.ts             # Follow player camera
```

**Client-Server Communication Flow**:
```
1. Player moves mouse → Client predicts position immediately
2. Client sends input to server: {timestamp, velocity, rotation}
3. Server validates and processes
4. Server sends state update (30 TPS)
5. Client interpolates between server updates (60 FPS)
6. Client reconciles if prediction was wrong
```

---

### 2. API/Gateway Server

**Technology**: Go + Chi Router + Gorilla WebSocket

**Responsibilities**:
- HTTP REST API for auth, leaderboards, match history
- WebSocket gateway for real-time communication
- Matchmaking queue management (via Redis)
- Route players to appropriate goroutines
- JWT authentication and session management

**Key Endpoints**:

**REST API**:
```
POST   /api/auth/register        # Create account
POST   /api/auth/login           # Login, get JWT
GET    /api/leaderboard          # Get top players
GET    /api/user/:id             # Get user profile
GET    /api/matches/:userId      # Match history
POST   /api/matchmaking/join     # Join queue
DELETE /api/matchmaking/leave    # Leave queue
```

**WebSocket Events**:
```
Client → Server:
- connect                        # Initial connection
- authenticate                   # Send JWT
- player_input                   # Movement, rotation
- player_shoot                   # Fire weapon
- player_use_item                # Use consumable

Server → Client:
- authenticated                  # Auth success
- match_found                    # Matchmaking complete
- game_state                     # Full state (30/sec)
- state_delta                    # Incremental updates
- player_hit                     # Damage notification
- player_died                    # Death notification
- game_over                      # Match ended
```

---

### 3. Game Server (Goroutines)

**Technology**: Go goroutines with channels

**Responsibilities**:
- Run game loop at 30 TPS (33.33ms intervals)
- Physics simulation and collision detection
- Server-side validation (anti-cheat)
- Lag compensation (350ms state history)
- Interest management (only send nearby entities)
- Broadcast state updates to clients

**Architecture**:
```
Main Goroutine (API Server)
    │
    ├─> Goroutine 1 (manages Lobbies 1-3)
    ├─> Goroutine 2 (manages Lobbies 4-6)
    └─> Goroutine N (manages Lobbies N-M)

Each Goroutine:
    - Runs independent game loops
    - Lightweight (~2KB per goroutine)
    - Communicates via channels
    - Can handle 3-5 lobbies per goroutine
```

**Game Loop (30 TPS)**:
```go
func gameLoop(lobby *Lobby) {
  ticker := time.NewTicker(33 * time.Millisecond)
  defer ticker.Stop()
  
  for range ticker.C {
    startTime := time.Now()
    
    // 1. Process player inputs (with lag compensation)
    g.processInputs()
    
    // 2. Update physics (movement, projectiles)
    g.updatePhysics()
    
    // 3. Collision detection
    g.checkCollisions()
    
    // 4. Update game state (safe zone, loot spawns)
    g.updateGameState()
    
    // 5. Save state to history buffer (for lag compensation)
    g.saveStateSnapshot()
    
    // 6. Broadcast updates to clients (with interest management)
    g.broadcastState()
    
    // 7. Log events to Cassandra (async, non-blocking)
    g.logGameEvents()
    
    elapsed := time.Since(startTime)
    if elapsed > 33*time.Millisecond {
      log.Warn("Tick took too long: %v", elapsed)
    }
  }
}
```

**Lag Compensation**:
```go
// When player shoots:
// 1. Client timestamp: T_client = 1000ms
// 2. Server receives at: T_server = 1050ms (50ms lag)
// 3. Server rewinds state to T_client (50ms ago)
// 4. Check if hit would have occurred at that time
// 5. If hit, apply damage in current state
```

**Interest Management**:
```go
// Only send entities within 800 units of player
func getInterestArea(player *Player) GameStateMessage {
  return GameStateMessage{
    NearbyPlayers: filterByDistance(players, player, 800),
    Projectiles: filterByDistance(projectiles, player, 800),
    NearbyLoot: filterByDistance(loot, player, 800),
    SafeZone: safeZone, // Always send
  }
}
```

---

### 4. Database Layer

#### PostgreSQL (Relational)

**Purpose**: Store structured, relational data requiring ACID transactions

**Tables**:
- `users`: User accounts, credentials, stats
- `matches`: Match metadata (start time, duration, map)
- `match_results`: Player results per match (many-to-many)

**Queries**:
```sql
-- User login
SELECT user_id, username, password_hash, mmr 
FROM users 
WHERE email = ?;

-- Match history
SELECT m.match_id, m.start_time, mr.placement, mr.kills
FROM matches m
JOIN match_results mr ON m.match_id = mr.match_id
WHERE mr.user_id = ?
ORDER BY m.start_time DESC
LIMIT 10;

-- Leaderboard (cached in Redis, refreshed from here)
SELECT username, total_wins, mmr
FROM users
ORDER BY total_wins DESC
LIMIT 100;
```

#### Cassandra (Wide-Column Store)

**Purpose**: Store high-volume time-series data (event logs, telemetry)

**Tables**:
- `game_events`: All game events (movement, shooting, pickups)
- `player_telemetry`: Player position/health over time
- `combat_log`: Damage events, kills
- `loot_collection_log`: Loot pickup events

**Queries**:
```cql
-- Get all events for a match (for replay/analysis)
SELECT * FROM game_events 
WHERE match_id = ? 
ORDER BY event_timestamp DESC;

-- Get player's telemetry for a match
SELECT timestamp, position_x, position_y, health
FROM player_telemetry
WHERE player_id = ? AND match_id = ?
ORDER BY timestamp DESC;

-- Combat analytics
SELECT attacker_id, COUNT(*) as kills
FROM combat_log
WHERE match_id = ? AND event_type = 'KILL'
GROUP BY attacker_id;
```

#### Redis (In-Memory Cache)

**Purpose**: Fast access to frequently read data, session management, queues

**Data Structures**:
1. **Sorted Sets**: Leaderboards (O(log N) operations)
2. **Hashes**: Active lobby state, cached user data
3. **Lists**: Matchmaking queues (FIFO)
4. **Strings**: JWT sessions, rate limiting

**Usage**:
```go
// Leaderboard
redis.ZAdd(ctx, "leaderboard:wins", &redis.Z{
  Score: float64(user.TotalWins),
  Member: user.UserID,
})
topPlayers := redis.ZRevRange(ctx, "leaderboard:wins", 0, 99)

// Matchmaking queue
redis.LPush(ctx, "queue:mmr:1000-1200", playerJSON)
players := redis.LRange(ctx, "queue:mmr:1000-1200", 0, 15)

// Active lobby
redis.HSet(ctx, fmt.Sprintf("lobby:%s", lobbyID), "status", "playing")
redis.HSet(ctx, fmt.Sprintf("lobby:%s", lobbyID), "player_count", 16)
```

---

## Data Flow Examples

### Example 1: Player Joins Queue

```
1. Client: POST /api/matchmaking/join
2. API Server: Verify JWT, get user MMR
3. API Server: Calculate MMR range (1000 ± 200)
4. API Server → Redis: LPUSH queue:mmr:1000-1200 {user data}
5. API Server → Redis: SET player:queue:<userId> "queue:mmr:1000-1200"
6. API Server: Return 200 OK

Background Matchmaker (runs every 2 seconds in goroutine):
7. Matchmaker → Redis: LLEN queue:mmr:1000-1200  # Check count
8. If >= 16 players:
   - Redis: RPOP 16 players from queue
   - Create Lobby object
   - Assign to Goroutine
   - Redis: HSET lobby:<id> ...
   - Notify players via WebSocket: "match_found"
```

### Example 2: Player Movement

```
1. Client: Player moves mouse to (500, 300)
2. Client: Predict new position immediately (renders at 60 FPS)
3. Client → Server: WebSocket message {
     type: "player_input",
     timestamp: 1050,
     velocity: {x: 3, y: 2},
     rotation: 1.5
   }
4. Server (Goroutine): Receives input in game loop
5. Server: Validate speed (anti-cheat)
6. Server: Check collision with walls
7. Server: Update player position
8. Server: Save snapshot to history buffer
9. Server: Broadcast to nearby players (interest management)
10. Clients: Receive state update, interpolate smoothly
```

### Example 3: Player Shoots

```
1. Client: Player clicks mouse
2. Client: Predict bullet immediately (instant feedback)
3. Client → Server: {
     type: "player_shoot",
     timestamp: 1100,  # Client timestamp
     direction: {x: 1, y: 0}
   }
4. Server: Receives at timestamp 1150 (50ms lag)
5. Server: Rewind state to 1100 (lag compensation)
6. Server: Check if bullet hit anyone at that time
7. Server: If hit:
   - Apply damage
   - Broadcast "player_hit" event
   - Log to Cassandra (async)
8. Server: Fast-forward to current state
9. Clients: Receive hit notification, play effects
```

### Example 4: Match Ends

```
1. Server: Detect only 1 player alive
2. Server: Set gamePhase = "FINISHED"
3. Server → Clients: WebSocket "game_over" {winner, placements}
4. Server: Calculate MMR changes
5. Server → PostgreSQL: 
   - INSERT INTO matches (...)
   - INSERT INTO match_results (...) for each player
   - Trigger updates user stats
6. Server → Redis:
   - Update leaderboards (ZADD)
   - Delete lobby (DEL lobby:<id>)
7. Server → Cassandra (async):
   - Bulk insert game events
   - Insert combat logs
8. Server: Close WebSocket connections
9. Goroutine: Destroy lobby object
```

---

## Scaling Strategy

### Vertical Scaling (Single Server)
```
AWS EC2 c5.2xlarge (8 vCPUs, 16 GB RAM)
├─ API Server (2 vCPUs)
├─ Goroutines (6 vCPUs, ~100-200 lobbies)
└─ Can handle: ~1,500-3,000 concurrent players
```

### Horizontal Scaling (Multiple Servers)
```
Load Balancer (ALB)
    │
    ├─> Game Server 1 (EC2)
    │   └─> Handles Lobbies 1-30
    │
    ├─> Game Server 2 (EC2)
    │   └─> Handles Lobbies 31-60
    │
    └─> Game Server N (EC2)

Shared:
├─ PostgreSQL (RDS Multi-AZ)
├─ Cassandra (Keyspaces)
└─ Redis (ElastiCache Cluster)

Challenge: Lobby affinity (player must reconnect to same server)
Solution: Store lobby-to-server mapping in Redis
```

---

## Security & Anti-Cheat

### Server-Side Validation

**Movement Validation**:
```go
distance := math.Sqrt(dx*dx + dy*dy)
maxDistance := PLAYER_BASE_SPEED * deltaTime
if distance > maxDistance * 1.1 { // 10% tolerance
  // REJECT: Speed hack attempt
  log.Warn("Speed hack detected: %s", player.Username)
  return
}
```

**Fire Rate Validation**:
```go
timeSinceLastShot := now.Sub(player.LastShotTime)
if timeSinceLastShot < time.Duration(WEAPON_FIRE_RATE * 0.9) {
  // REJECT: Rapid fire hack
  return
}
```

**Collision Validation**:
```go
pathBlocked := checkLineCollision(oldPos, newPos, obstacles)
if pathBlocked {
  // REJECT: Wall hack attempt
  player.Position = oldPos // Reset
  return
}
```

### JWT Authentication
```go
// Login: Generate token
token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
  "userId": userId,
  "username": username,
  "exp": time.Now().Add(7 * 24 * time.Hour).Unix(),
})
tokenString, _ := token.SignedString([]byte(os.Getenv("JWT_SECRET")))

// Each request: Verify token
token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
  return []byte(os.Getenv("JWT_SECRET")), nil
})
```

### Rate Limiting
```go
// Redis-based rate limiting
key := fmt.Sprintf("ratelimit:%s:shoot", userId)
count, _ := redis.Incr(ctx, key).Result()
if count == 1 {
  redis.Expire(ctx, key, 1*time.Second) // 1 second window
}
if count > MAX_SHOTS_PER_SECOND {
  // REJECT: Rate limit exceeded
}
```

---

## Performance Optimizations

1. **Interest Management**: Only send nearby entities (saves 70% bandwidth)
2. **Delta Compression**: Only send changed values (saves 60% bandwidth)
3. **Object Pooling**: Reuse projectile/loot objects (reduces GC)
4. **Spatial Partitioning**: Grid-based collision detection (O(n) → O(1))
5. **Redis Caching**: Cache leaderboards, user profiles (99% faster reads)
6. **Cassandra Writes**: Async, batched event logging (non-blocking)
7. **WebSocket Compression**: Enable permessage-deflate

---

## Monitoring & Observability

**Metrics to Track**:
- Active players
- Active lobbies
- Average latency (ping)
- Server CPU/memory usage
- Database query times
- Redis hit rate
- Cassandra write throughput

**Tools**:
- Prometheus + Grafana for metrics
- CloudWatch for AWS infrastructure
- Application logs (Winston + CloudWatch Logs)

---

## Deployment (AWS)

```
VPC
├─ Public Subnets
│  ├─ ALB (Load Balancer)
│  └─ NAT Gateway
│
├─ Private Subnets
│  ├─ EC2 Auto Scaling Group (Game Servers)
│  ├─ RDS PostgreSQL (Multi-AZ)
│  └─ ElastiCache Redis (Cluster Mode)
│
└─ Cassandra (AWS Keyspaces, managed)

Additional:
├─ Route 53 (DNS)
├─ CloudFront (CDN for static assets)
├─ S3 (Client build artifacts)
└─ CloudWatch (Monitoring)
```

---

## Development Workflow

1. **Local Development**:
   - Docker/Podman Compose for databases
   - Run all services locally
   - Hot reload with Air (Go)

2. **Testing**:
   - Unit tests (Go testing package)
   - Integration tests (testify)
   - Load testing (Artillery + custom scripts)

3. **CI/CD**:
   - GitHub Actions
   - Build → Test → Deploy to staging → Deploy to prod

4. **Branching Strategy**:
   - `main`: Production
   - `develop`: Integration
   - `feature/*`: Feature branches

---

This architecture provides a solid foundation for a scalable, real-time multiplayer game while showcasing system design skills for recruiters.
