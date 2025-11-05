# Tank Royale 2: Migration to Go Strategy

## Executive Summary

Migrating Tank Royale 2 from Node.js/TypeScript to Go to leverage:
- **Goroutines** for massive concurrent WebSocket connections (10,000+)
- **Better performance** for real-time game server
- **Lower latency** and more predictable behavior
- **Simpler deployment** (single binary)
- **Learning Go** as a personal development goal

---

## Migration Phases

### Phase 1: Foundation & Setup ✅ (Week 1)
**Goal:** Set up Go project structure and core dependencies

**Tasks:**
1. ✅ Initialize Go module structure
2. ✅ Set up database connections (PostgreSQL, Redis, Cassandra)
3. ✅ Implement shared types/models
4. ✅ Create configuration management
5. ✅ Set up logging infrastructure

**Deliverables:**
- Go project structure in `/go-server`
- Database connectivity working
- Basic logging and config

---

### Phase 2: Authentication & REST API (Week 2)
**Goal:** Migrate REST API endpoints to Go

**Tasks:**
1. Implement JWT authentication middleware
2. Migrate user management endpoints
   - POST /api/auth/register
   - POST /api/auth/login
   - GET /api/auth/me
3. Migrate leaderboard endpoints
   - GET /api/leaderboard
4. Migrate statistics endpoints
   - GET /api/stats/:playerId

**Deliverables:**
- Working REST API in Go
- All endpoints from Node.js migrated
- Postman tests passing

**Testing Strategy:**
- Run both Node and Go servers simultaneously (different ports)
- Compare API responses
- Load test both to validate performance improvements

---

### Phase 3: WebSocket Infrastructure (Week 3)
**Goal:** Build WebSocket game server foundation

**Tasks:**
1. Implement WebSocket connection handler
2. Create connection pool management
3. Implement message routing system
4. Create room/lobby system
5. Build player session management

**Deliverables:**
- WebSocket server accepting connections
- Players can join/leave rooms
- Basic message broadcasting

**Testing Strategy:**
- Use existing WebSocket load tests
- Validate 1000+ concurrent connections
- Measure latency improvements

---

### Phase 4: Game Logic Migration (Week 4)
**Goal:** Port core game mechanics to Go

**Tasks:**
1. Migrate game state structures
2. Implement game loop (60 FPS tick)
3. Port physics engine
   - Tank movement
   - Collision detection
   - Bullet trajectories
4. Implement game rules
   - Damage calculation
   - Scoring system
   - Win conditions

**Deliverables:**
- Full game playable in Go server
- Physics matching Node.js behavior
- Game loop running at 60 FPS

**Testing Strategy:**
- Unit tests for physics calculations
- Integration tests for full games
- Side-by-side comparison with Node.js

---

### Phase 5: Matchmaking System (Week 5)
**Goal:** Implement concurrent matchmaking

**Tasks:**
1. Build matchmaking queue
2. Implement skill-based matching
3. Create room lifecycle management
4. Handle disconnections/reconnections

**Deliverables:**
- Matchmaking working with multiple queues
- Players matched by skill level
- Graceful handling of disconnects

---

### Phase 6: Performance Optimization (Week 6)
**Goal:** Optimize for production scale

**Tasks:**
1. Profile CPU and memory usage
2. Optimize hot paths (game loop, collision detection)
3. Implement connection pooling for databases
4. Add caching layers (Redis)
5. Tune goroutine management

**Deliverables:**
- Server handles 10,000+ concurrent players
- <16ms game loop latency
- <50ms WebSocket message latency

---

### Phase 7: Monitoring & Deployment (Week 7)
**Goal:** Production-ready deployment

**Tasks:**
1. Integrate with Prometheus metrics
2. Set up Grafana dashboards
3. Implement health checks
4. Create Docker container
5. Update docker-compose.yml
6. Create deployment scripts

**Deliverables:**
- Dockerized Go server
- Monitoring dashboards
- Deployment automation

---

### Phase 8: Parallel Testing & Cutover (Week 8)
**Goal:** Safe production migration

**Tasks:**
1. Run both servers in production (canary deployment)
2. Route 10% traffic to Go server
3. Monitor metrics and errors
4. Gradually increase traffic
5. Full cutover when stable

**Deliverables:**
- 100% traffic on Go server
- Node.js server deprecated
- Documentation updated

---

## Technical Architecture

### Go Project Structure
```
go-server/
├── cmd/
│   ├── api/                 # REST API server
│   │   └── main.go
│   └── game/                # WebSocket game server
│       └── main.go
├── internal/
│   ├── auth/                # Authentication & JWT
│   ├── config/              # Configuration management
│   ├── db/                  # Database connections
│   │   ├── postgres/
│   │   ├── redis/
│   │   └── cassandra/
│   ├── game/                # Game logic
│   │   ├── engine/          # Physics & game loop
│   │   ├── entities/        # Tank, Bullet, PowerUp
│   │   ├── room/            # Game room management
│   │   └── state/           # Game state management
│   ├── matchmaking/         # Matchmaking system
│   ├── middleware/          # HTTP middleware
│   ├── models/              # Shared data models
│   ├── repositories/        # Data access layer
│   ├── services/            # Business logic
│   └── websocket/           # WebSocket infrastructure
├── pkg/                     # Public packages
│   ├── logger/
│   └── utils/
├── tests/
│   ├── integration/
│   └── unit/
├── go.mod
├── go.sum
└── README.md
```

---

## Key Technologies & Libraries

### Core
- **Go 1.23+** (latest stable)
- **Gorilla WebSocket** or **nhooyr.io/websocket**
- **Chi Router** or **Gin** for REST API

### Databases
- **pgx** - PostgreSQL driver
- **go-redis** - Redis client
- **gocql** - Cassandra driver

### Authentication
- **golang-jwt/jwt** - JWT handling
- **bcrypt** - Password hashing

### Monitoring
- **prometheus/client_golang** - Metrics
- **zerolog** or **zap** - Structured logging

### Testing
- **testify** - Assertions and mocking
- **gomock** - Mock generation

---

## Risk Mitigation

### Risk 1: Feature Parity
**Mitigation:** 
- Comprehensive API test suite
- Side-by-side comparison testing
- Gradual rollout

### Risk 2: Performance Regressions
**Mitigation:**
- Load testing at each phase
- Continuous benchmarking
- Prometheus monitoring from day 1

### Risk 3: Data Consistency
**Mitigation:**
- Same database schemas
- Validate repository layer thoroughly
- Run both servers against same DB in testing

### Risk 4: Learning Curve
**Mitigation:**
- Start with simple components (REST API)
- Build proof-of-concepts for complex parts
- Code reviews and pair programming

---

## Success Metrics

### Performance
- ✅ Support 10,000+ concurrent WebSocket connections
- ✅ Game loop latency < 16ms (60 FPS)
- ✅ WebSocket message latency < 50ms p99
- ✅ Memory usage < 2GB for 10,000 players

### Reliability
- ✅ 99.9% uptime
- ✅ Graceful handling of disconnections
- ✅ No data loss during failures

### Code Quality
- ✅ >80% test coverage
- ✅ All critical paths tested
- ✅ Documentation for all public APIs

---

## Migration Checklist

### Pre-Migration
- [ ] Review and document all Node.js APIs
- [ ] Create comprehensive test suite
- [ ] Benchmark current performance
- [ ] Set up Go development environment

### During Migration
- [ ] Maintain Node.js server (bug fixes only)
- [ ] Update documentation as Go features complete
- [ ] Weekly progress reviews
- [ ] Performance comparisons at each phase

### Post-Migration
- [ ] Archive Node.js codebase
- [ ] Update all documentation
- [ ] Team training on Go codebase
- [ ] Post-mortem and lessons learned

---

## Timeline Summary

| Week | Phase | Focus |
|------|-------|-------|
| 1 | Foundation | Setup, DB, Config |
| 2 | REST API | Auth, Endpoints |
| 3 | WebSocket | Connection handling |
| 4 | Game Logic | Physics, Game loop |
| 5 | Matchmaking | Queue system |
| 6 | Optimization | Performance tuning |
| 7 | Deployment | Docker, Monitoring |
| 8 | Cutover | Production migration |

**Total Duration:** 8 weeks (full-time) or 12-16 weeks (part-time)

---

## Decision Points

### Architecture Decisions

#### 1. Monolith vs Microservices
**Decision:** Start with monolith, separate binaries for API and Game server
**Rationale:** 
- Simpler to develop and deploy
- Can split later if needed
- Share code easily

#### 2. REST API and Game Server Separation
**Decision:** Two separate binaries, shared internal packages
**Rationale:**
- Independent scaling
- REST API can restart without affecting games
- Clear separation of concerns

#### 3. Database Access Pattern
**Decision:** Repository pattern with interface abstraction
**Rationale:**
- Easy to test (mock repositories)
- Database-agnostic business logic
- Matches current Node.js pattern

#### 4. WebSocket Library
**Decision:** gorilla/websocket
**Rationale:**
- Battle-tested, widely used
- Good documentation
- Familiar API

---

## Rollback Plan

If critical issues arise:

1. **Immediate:** Route traffic back to Node.js (load balancer)
2. **Database:** Both servers use same DB (no migration needed)
3. **Sessions:** Redis-backed sessions work with both servers
4. **Monitoring:** Keep both servers monitored during transition

---

## Next Steps

1. ✅ Create Go project structure
2. ✅ Set up database connections
3. ✅ Implement basic HTTP server
4. Migrate first API endpoint (health check)
5. Continue with Phase 2...

---

**Document Version:** 1.0  
**Last Updated:** November 5, 2025  
**Owner:** Development Team  
**Status:** In Progress - Phase 1
