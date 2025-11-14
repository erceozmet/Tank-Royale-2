# Load Testing Updates - Summary

## 🎉 What We've Added

We've completely updated the load testing suite to test the new Go game server features, including:

### New Test: Game Loop Load Test (`game-loop-load-test.js`)

A comprehensive test that simulates real gameplay with all the features from Phase 4:

**What it tests:**
- ✅ Player movement and physics (20 updates/sec per player)
- ✅ All 4 weapon types (Pistol, Rifle, Shotgun, Sniper)
- ✅ Weapon firing with proper cooldowns and boosts
- ✅ Loot collection system (shields, damage boosts, fire rate boosts, weapons)
- ✅ Combat damage calculation with stackable boosts
- ✅ 30 TPS game server tick rate
- ✅ Goroutine-based concurrency performance
- ✅ WebSocket message throughput
- ✅ Game state synchronization

**Key metrics tracked:**
- Game state updates received
- Server tick rate (30 TPS target)
- Movement updates per second
- Shots fired with different weapons
- Loot collected (3 types of boosts + 3 weapon types)
- Damage dealt
- Player deaths
- Network latency (p50, p95, p99)
- Message throughput

### New Documentation

1. **GAME_LOOP_TESTING.md** - Comprehensive guide covering:
   - Quick commands and configuration
   - Success criteria for each load level
   - Performance tuning recommendations
   - Monitoring during tests
   - Common issues and solutions
   - Load test progression (5 levels)
   - Target metrics by load level

2. **Updated README.md** - Refreshed with:
   - Go server endpoints (8080, 8081)
   - New game loop test section
   - Updated performance targets (10,000+ connections, <2KB per goroutine)
   - New troubleshooting section
   - Updated success criteria

3. **preflight-check.js** - Pre-flight validation script:
   - Checks API server health
   - Checks Game server health
   - Verifies Redis connection
   - Verifies PostgreSQL connection
   - Validates endpoints are available
   - Confirms dependencies are installed
   - Shows system information (CPUs, memory)

### Updated Files

1. **package.json** - Added:
   - `ws` dependency for WebSocket testing
   - `test:gameloop` script
   - `test:game-quick` script (16 players, 60s)
   - `preflight` script to check system readiness

2. **All test scripts made executable** with proper permissions

## 🚀 How to Use

### Quick Start
```bash
cd load-tests
npm install

# Run pre-flight checks
npm run preflight

# Quick game test (recommended first run)
npm run test:game-quick

# Full game loop test
npm run test:gameloop

# All tests
npm run test:all
```

### Custom Configuration
```bash
# Test with different player counts
NUM_PLAYERS=64 npm run test:gameloop

# Test for longer duration
TEST_DURATION=300 npm run test:gameloop

# Test different servers
API_URL=http://localhost:8080 GAME_URL=ws://localhost:8081 npm run test:gameloop
```

## 📊 Test Progression

We recommend running tests in this order:

1. **Level 1**: `npm run test:game-quick` - 16 players, 60s
2. **Level 2**: `NUM_PLAYERS=16 TEST_DURATION=300 npm run test:gameloop` - 5 min
3. **Level 3**: `NUM_PLAYERS=32 TEST_DURATION=300 npm run test:gameloop` - 2 matches
4. **Level 4**: `NUM_PLAYERS=64 TEST_DURATION=600 npm run test:gameloop` - 4 matches
5. **Level 5**: `NUM_PLAYERS=128 TEST_DURATION=1200 npm run test:gameloop` - Stress test

## 🎯 Expected Results

### Level 1 (16 players, 60s)
```
✅ All checks passed!
   ✅ All players connected
   ✅ At least 1 match joined
   ✅ Game state updates received
   ✅ Server tick rate ~30 TPS (29.8-30.2 TPS)
   ✅ p95 latency < 100ms (typically 20-50ms)
   ✅ Error rate < 5% (typically 0%)
   ✅ Player actions processed
```

### What Success Looks Like
```
🎮 Game Loop Load Test Results
======================================================================
⏱️  Duration: 60.1s

👥 Players:
   Connected: 16
   Matches Joined: 1
   Deaths: 2

🎯 Game Actions:
   Movement Updates: 19,216        (320/sec) ✅
   Shots Fired: 5,764             (96/sec) ✅
   Loot Collected: 962            (16/sec) ✅
   Damage Dealt: 14,410

📊 Server Performance:
   Game State Updates Received: 1,803
   Updates/sec: 30.0              Perfect! ✅
   Average Tick Rate: 30.05 TPS
   Tick Interval: 33.3ms

⚡ Network Latency:
   Average: 15.2ms
   p95: 42.8ms                    Excellent! ✅
   p99: 68.1ms

🎉 ALL TESTS PASSED!
```

## 🔍 Monitoring

### Real-time Monitoring During Tests

**Terminal 1**: Run the test
```bash
cd load-tests
npm run test:gameloop
```

**Terminal 2**: Watch metrics
```bash
watch -n 1 'curl -s http://localhost:8081/metrics | grep -E "(game_active|game_tick|http_requests)"'
```

**Terminal 3**: Watch logs
```bash
cd ../go-server
tail -f bin/game.log
```

**Terminal 4**: Open Grafana
```bash
# Browser: http://localhost:3001
# Dashboard: "Game Server Performance"
```

### Key Metrics to Watch

1. **game_active_players** - Should match NUM_PLAYERS
2. **game_tick_duration_seconds** - Should be ~0.033 (33ms)
3. **game_active_matches** - Number of running matches
4. **go_goroutines** - Should be stable (no leaks)
5. **go_memstats_heap_inuse_bytes** - Memory usage (should be stable)

## 🎮 What Gets Tested

### Weapon System
- ✅ Pistol: 500ms fire rate, 15 damage
- ✅ Rifle: 400ms fire rate, 20 damage
- ✅ Shotgun: 800ms fire rate, 35 damage
- ✅ Sniper: 1200ms fire rate, 50 damage
- ✅ Fire rate reduces by 20% per boost stack (3 max)
- ✅ Damage increases by 15% per boost stack (3 max)

### Loot System
- ✅ Shield pickups: +50 shield (max 150)
- ✅ Damage boost: +15% damage (stackable 3x)
- ✅ Fire rate boost: -20% fire cooldown (stackable 3x)
- ✅ Weapon upgrades: Rifle, Shotgun, Sniper
- ✅ Random weighted generation (Shield 25%, Rifle 20%, etc.)

### Game Loop
- ✅ 30 TPS (33.33ms per tick)
- ✅ Physics simulation with Vector2D math
- ✅ Collision detection
- ✅ Player movement synchronization
- ✅ Combat damage calculation
- ✅ Match lifecycle (waiting, active, finished)

## 🐛 Troubleshooting

### If tests fail with "ECONNREFUSED"
```bash
cd ..
make start           # Start all services
make status          # Verify they're running
npm run preflight    # Check system readiness
```

### If tick rate is unstable
```bash
# Check CPU usage
top -p $(pgrep game)

# Profile the server
curl http://localhost:8081/debug/pprof/profile?seconds=30 > cpu.prof
go tool pprof cpu.prof
```

### If latency is high
```bash
# Check Redis latency
redis-cli --latency

# Check database connections
curl http://localhost:8080/metrics | grep db_connections
```

## 📚 Files Created/Updated

### New Files
- ✅ `load-tests/game-loop-load-test.js` - Main game loop test (500+ lines)
- ✅ `load-tests/GAME_LOOP_TESTING.md` - Comprehensive testing guide
- ✅ `load-tests/preflight-check.js` - Pre-flight validation script
- ✅ `load-tests/LOAD_TESTING_UPDATES.md` - This summary

### Updated Files
- ✅ `load-tests/package.json` - Added scripts and ws dependency
- ✅ `load-tests/README.md` - Updated for Go servers
- ✅ All `.js` files - Made executable with chmod +x

## 🎉 Success Criteria

The load tests are successful when:

- ✅ All 4 weapon types fire correctly
- ✅ All 6 loot types collected successfully
- ✅ Server maintains 30 TPS (±2 TPS acceptable)
- ✅ p95 latency < 100ms under normal load
- ✅ Error rate < 1%
- ✅ No memory leaks (stable over 10+ minutes)
- ✅ Players can join, move, shoot, collect loot without issues
- ✅ Combat damage calculated correctly with boosts
- ✅ System recovers gracefully after stress

## 🔗 Related Documentation

- **Main README**: `/README.md` - Project overview
- **Migration Complete**: `/MIGRATION_COMPLETE.md` - Full migration summary
- **Go Server README**: `/go-server/README.md` - Server documentation
- **Phase 4 Complete**: `/go-server/PHASE_4_COMPLETE.md` - Game logic details

## 🚀 Next Steps

After successful load testing:

1. ✅ Validate all tests pass at Level 1-3
2. ✅ Run extended tests (Level 4-5) to find limits
3. ✅ Monitor for memory leaks over extended periods
4. ✅ Profile hotspots if performance degrades
5. ✅ Document max capacity (players per server)
6. → Move to Phase 5: Frontend development!

---

**Created**: November 14, 2025
**Status**: ✅ Ready for testing
**Migration Phase**: Phase 4 Complete, Phase 5 Starting
