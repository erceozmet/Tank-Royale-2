# Load Testing Suite

Comprehensive load tests for Tank Royale 2 backend services.

## 📋 Test Scenarios

1. **API Endpoints** - REST API load testing
2. **WebSocket Connections** - Real-time connection stress test
3. **Matchmaking Queue** - Queue system performance
4. **Database Performance** - PostgreSQL and Redis stress

## Prerequisites

Before running load tests:

1. **Start the database services**:
   ```bash
   cd ..
   podman compose up -d postgres redis
   # OR use the startup script
   ./start-databases.sh
   ```

2. **Start the API server**:
   ```bash
   cd ../server
   npm run dev
   ```

3. **Verify server is running**:
   ```bash
   curl http://localhost:3000/health
   # Should return: {"status":"healthy",...}
   ```

4. **Create test users** (first time only):
   ```bash
   cd ../load-tests
   npm run setup
   ```

## Quick Start

```bash
# Start the server first
cd ../server
npm run dev

# In another terminal, run load tests
cd load-tests
npm run load-test:api         # Test REST endpoints
npm run load-test:websocket   # Test WebSocket connections
npm run load-test:matchmaking # Test matchmaking queue
npm run load-test:all         # Run all tests
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

### 4. Full System Test (`full-system-test.yml`)

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

Based on your architecture goals:

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Concurrent connections | 500+ | TBD | ⏳ |
| HTTP p95 latency | < 200ms | TBD | ⏳ |
| WebSocket connect time | < 100ms | TBD | ⏳ |
| Matchmaking throughput | 100 players/sec | TBD | ⏳ |
| Database queries/sec | 1000+ | TBD | ⏳ |
| Memory per connection | < 1MB | TBD | ⏳ |

## 🐛 Troubleshooting

### "ECONNREFUSED" Error
Server not running. Start with `npm run dev` in server directory.

### "Authentication failed" in WebSocket test
Make sure Redis is running: `docker-compose up -d redis`

### "Too many open files"
Increase system limits:
```bash
ulimit -n 10000
```

### Artillery not found
Install globally:
```bash
npm install -g artillery
```

## 📚 Additional Resources

- [Artillery Documentation](https://www.artillery.io/docs)
- [Socket.IO Load Testing](https://socket.io/docs/v4/load-testing/)
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)

## 🎉 Success Criteria

You're ready to move forward when:
- ✅ All tests pass at target load
- ✅ No memory leaks detected
- ✅ Response times within targets
- ✅ System recovers after stress
- ✅ Monitoring shows healthy metrics

Good luck! 🚀
