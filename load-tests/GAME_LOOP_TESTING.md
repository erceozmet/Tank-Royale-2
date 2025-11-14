# Load Testing Quick Reference

## 🚀 Quick Commands

```bash
# Install dependencies (first time only)
cd load-tests
npm install

# Quick tests (recommended for development)
npm run test:game-quick          # 16 players, 60s game simulation
npm run test:quick               # 50 websocket clients, 100 matchmaking

# Individual tests
npm run test:api                 # REST API load test
npm run test:websocket           # WebSocket connection test
npm run test:matchmaking         # Matchmaking queue test
npm run test:gameloop            # Full game loop simulation

# Full test suite
npm run test:all                 # Run all tests (takes ~15 minutes)
```

## 🎮 Game Loop Test (NEW!)

The new game loop test simulates real gameplay on the Go server:

### Features Tested
- ✅ Player movement (20 updates/sec per player)
- ✅ Weapon firing (Pistol, Rifle, Shotgun, Sniper)
- ✅ Loot collection (shields, damage boosts, fire rate boosts)
- ✅ Combat damage calculation
- ✅ 30 TPS game server tick rate
- ✅ Goroutine-based concurrency
- ✅ WebSocket message throughput

### Configuration

**Default:**
```bash
npm run test:gameloop
# 32 players (2 matches), 180 seconds
```

**Custom:**
```bash
API_URL=http://localhost:8080 \
GAME_URL=ws://localhost:8081 \
NUM_PLAYERS=64 \
TEST_DURATION=300 \
npm run test:gameloop
```

**Quick test:**
```bash
npm run test:game-quick
# 16 players (1 match), 60 seconds
```

### Success Criteria
- ✅ Tick rate: 28-32 TPS (30 TPS target)
- ✅ p95 latency: < 100ms
- ✅ Error rate: < 5%
- ✅ All weapon types fire
- ✅ Loot collection works
- ✅ Movement synchronized

## 📊 Interpreting Results

### Game Loop Metrics

```
🎮 Game Loop Load Test Results
======================================================================

⏱️  Duration: 60.2s

👥 Players:
   Connected: 16
   Matches Joined: 1
   Deaths: 3

🎯 Game Actions:
   Movement Updates: 18,432        # ~20/sec per player ✅
   Shots Fired: 5,529             # ~30% of updates ✅
   Loot Collected: 947            # ~10% chance ✅
   Damage Dealt: 12,350

📊 Server Performance:
   Game State Updates Received: 1,806
   Updates/sec: 30.0              # Perfect 30 TPS! ✅
   Average Tick Rate: 30.12 TPS
   Tick Interval: 33.2ms          # Target: 33.33ms ✅

⚡ Network Latency:
   Average: 12.5ms                # Excellent ✅
   p95: 45.3ms                    # Under 100ms ✅
   p99: 78.9ms

📈 Throughput:
   Movement Updates/sec: 306.15
   Shots/sec: 91.88
   Total Messages/sec: 398.03     # High throughput ✅
```

### What to Look For

**Good Performance:**
- ✅ Tick rate: 28-32 TPS (stable)
- ✅ Latency p95: < 100ms
- ✅ Error rate: 0%
- ✅ Movement updates: ~20/sec per player
- ✅ No disconnects

**Warning Signs:**
- ⚠️ Tick rate: < 25 TPS or > 35 TPS (unstable)
- ⚠️ Latency increasing over time
- ⚠️ Error rate: 1-5%
- ⚠️ Memory continuously growing

**Critical Issues:**
- 🔴 Tick rate: < 20 TPS (server overloaded)
- 🔴 Latency p95: > 200ms
- 🔴 Error rate: > 5%
- 🔴 Players disconnecting
- 🔴 Server crashes

## 🔧 Performance Tuning

### If Tick Rate Is Low (< 25 TPS)

1. **Check CPU usage:**
   ```bash
   top -p $(pgrep game)
   ```

2. **Profile the Go server:**
   ```bash
   curl http://localhost:8081/debug/pprof/profile?seconds=30 > cpu.prof
   go tool pprof cpu.prof
   ```

3. **Reduce player count:**
   ```bash
   NUM_PLAYERS=16 npm run test:gameloop
   ```

### If Latency Is High (p95 > 100ms)

1. **Check network latency:**
   ```bash
   ping localhost
   ```

2. **Verify Redis performance:**
   ```bash
   redis-cli --latency
   ```

3. **Check database connections:**
   ```bash
   curl http://localhost:8080/metrics | grep db_connections
   ```

### If Memory Is Growing

1. **Check for goroutine leaks:**
   ```bash
   curl http://localhost:8081/debug/pprof/goroutine > goroutine.prof
   go tool pprof goroutine.prof
   ```

2. **Monitor memory over time:**
   ```bash
   watch -n 1 'curl -s http://localhost:8081/metrics | grep go_memstats'
   ```

3. **Run longer tests to confirm leak:**
   ```bash
   TEST_DURATION=600 npm run test:gameloop  # 10 minutes
   ```

## 📈 Load Test Progression

Run tests in this order to validate:

### Level 1: Basic Functionality (5 minutes)
```bash
# 1 match, short duration
npm run test:game-quick
```

### Level 2: Single Match Load (10 minutes)
```bash
# 16 players, longer duration
NUM_PLAYERS=16 TEST_DURATION=300 npm run test:gameloop
```

### Level 3: Multiple Matches (15 minutes)
```bash
# 2 matches simultaneously
NUM_PLAYERS=32 TEST_DURATION=300 npm run test:gameloop
```

### Level 4: High Load (20 minutes)
```bash
# 4 matches simultaneously
NUM_PLAYERS=64 TEST_DURATION=600 npm run test:gameloop
```

### Level 5: Stress Test (30 minutes)
```bash
# Max capacity test
NUM_PLAYERS=128 TEST_DURATION=1200 npm run test:gameloop
```

## 🎯 Target Metrics by Load Level

| Level | Players | Matches | Expected TPS | p95 Latency | Error Rate |
|-------|---------|---------|--------------|-------------|------------|
| 1     | 16      | 1       | 30 TPS       | < 50ms      | 0%         |
| 2     | 16      | 1       | 30 TPS       | < 75ms      | 0%         |
| 3     | 32      | 2       | 30 TPS       | < 100ms     | < 1%       |
| 4     | 64      | 4       | 28-30 TPS    | < 150ms     | < 3%       |
| 5     | 128     | 8       | 25-30 TPS    | < 200ms     | < 5%       |

## 🔍 Monitoring During Tests

### Watch Metrics in Real-Time

**Terminal 1: Run test**
```bash
npm run test:gameloop
```

**Terminal 2: Watch Prometheus metrics**
```bash
watch -n 1 'curl -s http://localhost:8081/metrics | grep -E "(game_active_players|game_tick_duration|http_requests_total)"'
```

**Terminal 3: Watch logs**
```bash
cd ../go-server
tail -f bin/game.log
```

**Terminal 4: Grafana dashboard**
```bash
# Open in browser: http://localhost:3001
# Navigate to "Game Server Performance" dashboard
```

### Key Metrics to Monitor

1. **game_active_players** - Should match NUM_PLAYERS
2. **game_tick_duration_seconds** - Should be ~0.033 (33ms)
3. **game_active_matches** - Number of running matches
4. **http_requests_total** - API request rate
5. **go_goroutines** - Should be stable (watch for leaks)
6. **go_memstats_heap_inuse_bytes** - Memory usage

## 🎉 Success Checklist

Before considering load testing complete:

- [ ] Level 1 test passes (16 players)
- [ ] Level 2 test passes (16 players, 5 min)
- [ ] Level 3 test passes (32 players, 2 matches)
- [ ] No memory leaks detected
- [ ] Tick rate stable at 30 TPS
- [ ] All weapon types work correctly
- [ ] Loot collection works
- [ ] Combat damage accurate
- [ ] Players can connect/disconnect gracefully
- [ ] Error rate < 1% under normal load
- [ ] Grafana dashboards showing healthy metrics
- [ ] System recovers after stress test

## 🚨 Common Issues

### Issue: Players not joining matches
**Solution:**
```bash
# Check matchmaking queue in Redis
redis-cli ZRANGE matchmaking:queue 0 -1 WITHSCORES

# Manually trigger matchmaking
curl -X POST http://localhost:8080/api/matchmaking/join \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Issue: Game state updates not received
**Solution:**
```bash
# Check WebSocket connection
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  http://localhost:8081/ws
```

### Issue: High error rate
**Solution:**
```bash
# Check game server logs
tail -100 bin/game.log | grep ERROR

# Check for database issues
curl http://localhost:8080/health
```

## 📚 Additional Resources

- [Go pprof profiling](https://go.dev/blog/pprof)
- [WebSocket load testing best practices](https://www.nginx.com/blog/websocket-nginx/)
- [Prometheus Go client](https://prometheus.io/docs/guides/go-application/)
- [Artillery documentation](https://www.artillery.io/docs)

---

**Last Updated:** November 14, 2025
**Migration Status:** ✅ Complete - All tests updated for Go server
