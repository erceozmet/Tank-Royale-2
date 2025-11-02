# Development Roadmap

This roadmap breaks down the Tank Royale 2 project into manageable phases with specific tasks. Each phase builds on the previous one.

---

## Phase 1: Foundation & Infrastructure ✅ (Completed)

**Goal**: Set up project structure, databases, and shared code

### Tasks Completed:
- [x] Initialize Git repository
- [x] Create monorepo structure (client, server, game-server, shared)
- [x] Set up TypeScript configuration
- [x] Define shared types and constants
- [x] Create database schemas (PostgreSQL, Cassandra, Redis)
- [x] Write docker-compose for local development
- [x] Document architecture

**Deliverables**:
- ✅ Project structure
- ✅ Database schemas
- ✅ Shared type definitions
- ✅ Documentation

---

## Phase 2: Backend API & Authentication (Current Phase)

**Goal**: Build REST API with authentication, database connections, and basic endpoints

**Estimated Time**: 1-2 weeks

### 2.1 Database Connections
- [ ] Create PostgreSQL connection manager
  - [ ] Connection pooling
  - [ ] Query helpers
  - [ ] Error handling
- [ ] Create Cassandra connection manager
  - [ ] Session management
  - [ ] Prepared statements
  - [ ] Batch inserts
- [ ] Create Redis connection manager
  - [ ] Client initialization
  - [ ] Pub/Sub setup
  - [ ] Helper functions

**Files to create**:
```
server/src/db/
├── postgres.ts
├── cassandra.ts
└── redis.ts
```

### 2.2 Authentication System
- [ ] Implement user registration
  - [ ] Input validation
  - [ ] Password hashing (bcrypt)
  - [ ] Insert user into PostgreSQL
  - [ ] Return JWT token
- [ ] Implement user login
  - [ ] Verify credentials
  - [ ] Generate JWT token
  - [ ] Store session in Redis
- [ ] Create JWT middleware
  - [ ] Verify token on protected routes
  - [ ] Extract user info
  - [ ] Handle expired tokens
- [ ] Implement logout
  - [ ] Invalidate token
  - [ ] Remove from Redis

**Endpoints**:
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
```

### 2.3 Basic User Endpoints
- [ ] Get user profile
- [ ] Get user match history
- [ ] Update user profile
- [ ] Get user stats

**Endpoints**:
```
GET    /api/user/:userId
GET    /api/user/:userId/matches
PUT    /api/user/:userId
GET    /api/user/:userId/stats
```

### 2.4 Testing
- [ ] Unit tests for auth functions
- [ ] Integration tests for API endpoints
- [ ] Test database connections

**Deliverables**:
- ✅ Working REST API
- ✅ Authentication system
- ✅ Database integration
- ✅ API tests

---

## Phase 3: WebSocket & Matchmaking

**Goal**: Implement real-time communication and matchmaking system

**Estimated Time**: 1-2 weeks

### 3.1 WebSocket Setup
- [ ] Set up Socket.io server
- [ ] Implement connection handling
  - [ ] Authentication on connect
  - [ ] Session management
  - [ ] Heartbeat/ping-pong
- [ ] Create WebSocket middleware
  - [ ] JWT verification
  - [ ] Rate limiting
- [ ] Implement disconnect handling
  - [ ] Grace period logic
  - [ ] Cleanup

**Events**:
```
Client → Server:
- connect (authenticate with JWT)
- disconnect

Server → Client:
- authenticated
- error
```

### 3.2 Matchmaking System
- [ ] Create matchmaking queue manager
  - [ ] Add player to queue (Redis)
  - [ ] Remove player from queue
  - [ ] Calculate MMR range
- [ ] Implement matchmaker service
  - [ ] Poll queues every 2 seconds
  - [ ] Group players by MMR
  - [ ] Create lobbies when enough players
- [ ] Notify players when match found
- [ ] Handle queue timeouts

**Endpoints**:
```
POST   /api/matchmaking/join
DELETE /api/matchmaking/leave
GET    /api/matchmaking/status
```

### 3.3 Lobby Management
- [ ] Create Lobby class
  - [ ] Store in Redis
  - [ ] Track players
  - [ ] Track status (waiting, starting, playing)
- [ ] Implement lobby lifecycle
  - [ ] Waiting phase
  - [ ] Starting countdown
  - [ ] Game start
  - [ ] Game end

**Deliverables**:
- ✅ WebSocket communication
- ✅ Matchmaking system
- ✅ Basic lobby management

---

## Phase 4: Game Server Core

**Goal**: Implement game loop with worker threads, basic physics, and validation

**Estimated Time**: 2-3 weeks

### 4.1 Worker Thread Setup
- [ ] Create worker thread pool
  - [ ] Main thread manages workers
  - [ ] Each worker handles 3-5 lobbies
  - [ ] Message passing between threads
- [ ] Implement worker lifecycle
  - [ ] Start worker
  - [ ] Assign lobby to worker
  - [ ] Stop worker

**Files**:
```
game-server/src/
├── index.ts           # Main thread
├── worker.ts          # Worker thread code
└── WorkerPool.ts      # Pool manager
```

### 4.2 Game Loop (30 TPS)
- [ ] Implement fixed-timestep game loop
  - [ ] 33.33ms tick interval
  - [ ] Handle catch-up for slow frames
- [ ] Process player inputs
  - [ ] Queue inputs
  - [ ] Apply to player state
- [ ] Update game state
  - [ ] Player movement
  - [ ] Projectile movement
  - [ ] Collision detection
- [ ] Broadcast updates to clients
  - [ ] Full state every 10th tick
  - [ ] Delta updates otherwise

### 4.3 Player Movement & Physics
- [ ] Implement player movement
  - [ ] Velocity-based movement
  - [ ] Rotation
  - [ ] Speed limits
- [ ] Add collision detection
  - [ ] Player-player collision
  - [ ] Player-obstacle collision
  - [ ] Spatial partitioning (grid)
- [ ] Validate movement (anti-cheat)
  - [ ] Speed validation
  - [ ] Position validation
  - [ ] Collision validation

### 4.4 Shooting Mechanics
- [ ] Implement shooting
  - [ ] Create projectile
  - [ ] Validate fire rate
  - [ ] Send to clients
- [ ] Projectile physics
  - [ ] Movement
  - [ ] Lifetime
  - [ ] Collision with players
- [ ] Damage system
  - [ ] Apply damage
  - [ ] Health tracking
  - [ ] Death handling

### 4.5 State History (Lag Compensation)
- [ ] Create state snapshot system
  - [ ] Save state every tick
  - [ ] Keep 200ms of history (6 snapshots)
  - [ ] Circular buffer
- [ ] Implement lag compensation
  - [ ] Rewind state to player's timestamp
  - [ ] Check hit detection
  - [ ] Apply damage in current state

**Deliverables**:
- ✅ Worker thread architecture
- ✅ 30 TPS game loop
- ✅ Player movement with validation
- ✅ Shooting and damage
- ✅ Lag compensation

---

## Phase 5: Game Features

**Goal**: Add loot system, safe zone, and game progression

**Estimated Time**: 2 weeks

### 5.1 Loot System
- [ ] Spawn loot at game start
  - [ ] Random positions
  - [ ] Random types
  - [ ] 50 items per map
- [ ] Implement loot collection
  - [ ] Collision detection
  - [ ] Apply effects to player
  - [ ] Remove from map
- [ ] Loot types
  - [ ] Weapon upgrades
  - [ ] Armor/shield
  - [ ] Health packs
  - [ ] Temporary boosts (speed, damage)
- [ ] Loot respawning
  - [ ] 30 second cooldown
  - [ ] Same locations

### 5.2 Safe Zone (Map Shrinking)
- [ ] Implement safe zone
  - [ ] Initial zone (covers whole map)
  - [ ] Random center for next zone
  - [ ] Shrink over time
- [ ] Damage outside safe zone
  - [ ] 2 damage per tick
  - [ ] Visual indicator
- [ ] Shrinking phases
  - [ ] Start after 2 minutes
  - [ ] Shrink over 3 minutes
  - [ ] Final zone very small

### 5.3 Game Phases
- [ ] Waiting phase
  - [ ] Wait for players
  - [ ] Countdown
- [ ] Playing phase
  - [ ] Normal gameplay
  - [ ] Track kills, placements
- [ ] Shrinking phase
  - [ ] Safe zone active
  - [ ] Increased tension
- [ ] Ending phase
  - [ ] One player left
  - [ ] Victory screen
  - [ ] Calculate MMR changes

### 5.4 Match Completion
- [ ] Save match results to PostgreSQL
  - [ ] Match metadata
  - [ ] Player results
  - [ ] Update user stats
- [ ] Log events to Cassandra (async)
  - [ ] Combat log
  - [ ] Loot collection
  - [ ] Player telemetry
- [ ] Update leaderboards in Redis
  - [ ] Add/update player scores
  - [ ] Recalculate rankings

**Deliverables**:
- ✅ Loot system
- ✅ Safe zone mechanics
- ✅ Full game loop (start to finish)
- ✅ Match persistence

---

## Phase 6: Frontend Game Client

**Goal**: Build playable game client with Phaser.js

**Estimated Time**: 2-3 weeks

### 6.1 Phaser.js Setup
- [ ] Initialize Phaser game
- [ ] Create scenes
  - [ ] MenuScene (main menu)
  - [ ] LobbyScene (waiting room)
  - [ ] GameScene (gameplay)
  - [ ] GameOverScene (results)
- [ ] Set up scene transitions

### 6.2 Main Menu
- [ ] Login/Register UI
- [ ] Play button
- [ ] Leaderboard view
- [ ] Match history
- [ ] Settings

### 6.3 Game Rendering (60 FPS)
- [ ] Player rendering
  - [ ] Sprite/shape
  - [ ] Username label
  - [ ] Health bar
  - [ ] Direction indicator
- [ ] Projectile rendering
  - [ ] Bullet sprites
  - [ ] Trail effects
- [ ] Loot rendering
  - [ ] Item sprites
  - [ ] Glow effects
- [ ] Map rendering
  - [ ] Background
  - [ ] Obstacles
  - [ ] Safe zone overlay
- [ ] Camera
  - [ ] Follow player
  - [ ] Smooth movement
  - [ ] Zoom controls

### 6.4 Client-Side Prediction
- [ ] Predict player movement locally
- [ ] Apply input immediately
- [ ] Reconcile with server
  - [ ] Compare timestamps
  - [ ] Correct if mismatch

### 6.5 Interpolation
- [ ] Smooth other players' movement
  - [ ] Interpolate between server updates
  - [ ] Extrapolate if delayed
- [ ] Smooth projectile movement
- [ ] Smooth camera

### 6.6 UI/HUD
- [ ] Health display
- [ ] Weapon info
- [ ] Ammo count
- [ ] Kill feed
- [ ] Minimap
- [ ] Player count
- [ ] Safe zone timer
- [ ] Placement indicator

### 6.7 Input Handling
- [ ] Mouse movement (aim)
- [ ] WASD movement
- [ ] Mouse click (shoot)
- [ ] Number keys (items)
- [ ] ESC (menu)

**Deliverables**:
- ✅ Playable game client
- ✅ Smooth 60 FPS rendering
- ✅ Client-side prediction
- ✅ Complete UI

---

## Phase 7: Leaderboards & Progression

**Goal**: Implement ranking system, leaderboards, and player progression

**Estimated Time**: 1 week

### 7.1 MMR System
- [ ] Calculate MMR changes
  - [ ] Win: +25 MMR
  - [ ] Loss: -10 MMR
  - [ ] Top 3: small gain
- [ ] Update after each match
- [ ] Store in PostgreSQL
- [ ] Cache in Redis

### 7.2 Leaderboards
- [ ] Global leaderboard by wins
  - [ ] Top 100 players
  - [ ] Real-time updates
- [ ] Global leaderboard by MMR
- [ ] Seasonal leaderboards
- [ ] Friends leaderboard (optional)
- [ ] Cache in Redis sorted sets
- [ ] Refresh every 30 seconds

**Endpoints**:
```
GET /api/leaderboard/wins
GET /api/leaderboard/mmr
GET /api/leaderboard/friends
```

### 7.3 Match History
- [ ] Display past matches
  - [ ] Placement, kills, damage
  - [ ] MMR change
  - [ ] Timestamp
- [ ] Pagination
- [ ] Filters (time range, placement)

### 7.4 Player Stats
- [ ] Calculate aggregated stats
  - [ ] Total wins/losses
  - [ ] Kill/death ratio
  - [ ] Average placement
  - [ ] Win rate
- [ ] Display on profile
- [ ] Compare with friends

**Deliverables**:
- ✅ MMR system
- ✅ Leaderboards
- ✅ Match history
- ✅ Player stats

---

## Phase 8: Polish & Optimization

**Goal**: Improve performance, add polish, fix bugs

**Estimated Time**: 1-2 weeks

### 8.1 Performance Optimization
- [ ] Profile server performance
  - [ ] Identify bottlenecks
  - [ ] Optimize hot paths
- [ ] Optimize collision detection
  - [ ] Spatial partitioning
  - [ ] Broad phase / narrow phase
- [ ] Object pooling
  - [ ] Reuse projectiles
  - [ ] Reuse loot objects
- [ ] Optimize network traffic
  - [ ] Delta compression
  - [ ] Interest management
  - [ ] WebSocket compression

### 8.2 Game Balance
- [ ] Tune game values
  - [ ] Player speed
  - [ ] Weapon damage
  - [ ] Fire rate
  - [ ] Loot spawn rates
- [ ] Safe zone timing
- [ ] Map size

### 8.3 Visual Polish
- [ ] Add particle effects
  - [ ] Muzzle flash
  - [ ] Hit effects
  - [ ] Explosion effects
- [ ] Add sound effects
  - [ ] Shooting
  - [ ] Hit
  - [ ] Loot pickup
  - [ ] Background music
- [ ] Add animations
  - [ ] Player movement
  - [ ] Death animation
  - [ ] UI transitions

### 8.4 Bug Fixes
- [ ] Fix synchronization issues
- [ ] Handle edge cases
  - [ ] Player disconnect
  - [ ] Server crash recovery
  - [ ] Database connection loss
- [ ] Improve error handling

### 8.5 Testing
- [ ] Load testing
  - [ ] Simulate 500 concurrent players
  - [ ] Measure latency
  - [ ] Find breaking point
- [ ] Integration tests
- [ ] End-to-end tests

**Deliverables**:
- ✅ Optimized performance
- ✅ Polished gameplay
- ✅ Stable, bug-free experience

---

## Phase 9: Deployment & Infrastructure

**Goal**: Deploy to AWS, set up monitoring, CI/CD

**Estimated Time**: 1 week

### 9.1 AWS Setup
- [ ] Create VPC and subnets
- [ ] Set up RDS PostgreSQL
  - [ ] Multi-AZ for high availability
  - [ ] Automated backups
- [ ] Set up ElastiCache Redis
  - [ ] Cluster mode
  - [ ] Replication
- [ ] Set up AWS Keyspaces (Cassandra)
- [ ] Create EC2 instances
  - [ ] Auto Scaling Group
  - [ ] Load Balancer
- [ ] Set up S3 for static assets
- [ ] Configure CloudFront CDN

### 9.2 Docker & Orchestration
- [ ] Create Dockerfiles
  - [ ] Client build
  - [ ] Server
  - [ ] Game server
- [ ] Push to ECR (Elastic Container Registry)
- [ ] (Optional) Set up Kubernetes/ECS

### 9.3 CI/CD Pipeline
- [ ] GitHub Actions workflow
  - [ ] Lint and test on PR
  - [ ] Build on merge to main
  - [ ] Deploy to staging
  - [ ] Manual approval for production
- [ ] Automated tests in pipeline
- [ ] Blue-green deployment

### 9.4 Monitoring & Logging
- [ ] Set up CloudWatch
  - [ ] Application logs
  - [ ] Error tracking
  - [ ] Alarms
- [ ] Set up Prometheus + Grafana
  - [ ] Custom metrics
  - [ ] Dashboards
- [ ] Track key metrics
  - [ ] Active players
  - [ ] Server latency
  - [ ] Database performance

### 9.5 Domain & SSL
- [ ] Register domain
- [ ] Set up Route 53
- [ ] Configure SSL certificates
- [ ] HTTPS/WSS

**Deliverables**:
- ✅ Live production deployment
- ✅ CI/CD pipeline
- ✅ Monitoring and alerts
- ✅ Custom domain with SSL

---

## Phase 10: Advanced Features (Optional)

**Goal**: Add advanced features to stand out

**Estimated Time**: Variable

### 10.1 Match Replay System
- [ ] Record match events
- [ ] Store in Cassandra
- [ ] Playback UI
- [ ] Speed controls

### 10.2 Friends System
- [ ] Add friends
- [ ] Friends list
- [ ] Play with friends
- [ ] Private lobbies

### 10.3 Cosmetics & Customization
- [ ] Player skins
- [ ] Weapon skins
- [ ] Emotes
- [ ] Victory poses

### 10.4 Achievements & Challenges
- [ ] Daily challenges
- [ ] Achievement system
- [ ] Rewards

### 10.5 Admin Dashboard
- [ ] View live stats
- [ ] Manage users
- [ ] Ban system
- [ ] Server controls

### 10.6 Mobile Support
- [ ] Responsive UI
- [ ] Touch controls
- [ ] Performance optimization

**Deliverables**:
- ✅ Advanced features
- ✅ Enhanced player experience
- ✅ Stand-out portfolio piece

---

## Timeline Summary

| Phase | Duration | Status |
|-------|----------|--------|
| 1. Foundation | 1 week | ✅ Complete |
| 2. Backend API | 1-2 weeks | 🔄 Current |
| 3. WebSocket & Matchmaking | 1-2 weeks | ⏳ Planned |
| 4. Game Server Core | 2-3 weeks | ⏳ Planned |
| 5. Game Features | 2 weeks | ⏳ Planned |
| 6. Frontend Client | 2-3 weeks | ⏳ Planned |
| 7. Leaderboards | 1 week | ⏳ Planned |
| 8. Polish | 1-2 weeks | ⏳ Planned |
| 9. Deployment | 1 week | ⏳ Planned |
| 10. Advanced Features | Variable | 🔮 Optional |

**Total Estimated Time**: 12-18 weeks for core features

---

## Success Metrics

By the end of this project, you will have:

✅ **System Design Skills**:
- Multi-threaded game server
- Distributed database architecture (PostgreSQL + Cassandra + Redis)
- Real-time networking with WebSockets
- Horizontal scaling strategy

✅ **Technical Implementation**:
- Full-stack TypeScript application
- 30 TPS authoritative server
- 60 FPS client with prediction
- Lag compensation
- Anti-cheat validation

✅ **Portfolio Value**:
- Live, playable game
- Clean, documented code
- Architecture diagrams
- Performance metrics
- AWS deployment

✅ **Recruiter Appeal**:
- Complex system design
- Scalability considerations
- Security best practices
- Modern tech stack
- Real-world problem solving

---

Good luck with development! 🚀
