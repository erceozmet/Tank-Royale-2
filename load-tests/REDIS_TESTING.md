# Redis Cache Load Testing

## Overview

Comprehensive load test that validates Redis caching works correctly under load for the Tank Royale 2 game server. Tests all major caching patterns including sessions, queues, leaderboards, rate limiting, and cache invalidation.

## Test Coverage

### ✅ Session Management
- Session creation and storage (7-day TTL)
- Session validation and retrieval
- Cache hit rate measurement
- Concurrent session access
- Session TTL verification

### ✅ Matchmaking Queue
- Queue operations (LPUSH/RPOP)
- MMR-based queue buckets
- Queue size monitoring
- Player lookup optimization

### ✅ Leaderboard Caching  
- Sorted set operations (ZADD/ZRANGE)
- Cache TTL (5 minutes)
- Top player retrieval
- Score-based ranking

### ✅ Rate Limiting
- Sliding window counter
- 60-second TTL
- Concurrent increment operations
- Request throttling simulation

### ✅ Cache Invalidation
- Hash-based user profiles
- Invalidation patterns
- TTL expiration
- Cache consistency

### ✅ Performance Metrics
- Read/write latency (avg, p50, p95, p99)
- Operations per second
- Concurrent access patterns
- Error rates

## Quick Start

### Basic Test
```bash
npm run test:redis-quick
# Or: NUM_SESSIONS=50 CONCURRENT_OPS=10 node redis-cache-load-test.js
```

### Standard Test
```bash
npm run test:redis
# Or: NUM_SESSIONS=100 CONCURRENT_OPS=20 node redis-cache-load-test.js
```

### Stress Test
```bash
npm run test:redis-stress
# Or: NUM_SESSIONS=500 CONCURRENT_OPS=100 node redis-cache-load-test.js
```

## Test Configurations

### Environment Variables
- `NUM_SESSIONS` - Number of sessions to create (default: 100)
- `CONCURRENT_OPS` - Concurrent operations in stress test (default: 20)
- `API_URL` - API server URL (default: http://localhost:8080)
- `REDIS_URL` - Redis connection URL (default: redis://localhost:6379)

### Example Commands
```bash
# Quick test with 50 sessions
NUM_SESSIONS=50 CONCURRENT_OPS=10 node redis-cache-load-test.js

# Medium load with 100 sessions
NUM_SESSIONS=100 CONCURRENT_OPS=20 node redis-cache-load-test.js

# Heavy load with 500 sessions
NUM_SESSIONS=500 CONCURRENT_OPS=100 node redis-cache-load-test.js

# Custom Redis server
REDIS_URL=redis://192.168.1.100:6379 NUM_SESSIONS=100 node redis-cache-load-test.js
```

## Test Results

### What Gets Measured

#### Session Metrics
- Sessions created/validated
- Cache hit rate
- Cache misses
- Session errors

#### Redis Operations
- Total reads/writes/deletes
- Operations per second
- Error counts by type

#### Performance
- Read latency (avg, p50, p95, p99)
- Write latency (avg, p50, p95, p99)
- Concurrent operation latency

#### Specialized Tests
- Queue operations count
- Rate limit tests/blocks
- TTL validations
- Concurrent read/write operations

### Success Criteria
✅ Sessions created successfully  
✅ Cache hit rate >= 95%  
✅ Average read latency < 10ms  
✅ p95 read latency < 20ms  
✅ Error rate < 1%  
✅ Queue operations working  
✅ Rate limiting working  

## Expected Results

### Normal Load (100 sessions, 20 concurrent ops)
```
⏱️  Duration: ~6s

📊 Session Management:
   Sessions created: 100
   Sessions validated: 100
   Cache hits: 100
   Hit rate: 100.0%

🔄 Redis Operations:
   Total reads: ~103
   Total writes: ~61
   Operations/sec: ~27/sec

⚡ Performance:
   Read latency avg: 0.43ms
   Read p50: 0ms
   Read p95: 1ms
   Read p99: 2ms
   
   Write latency avg: 0.47ms
   Write p50: 0ms
   Write p95: 1ms
   Write p99: 2ms

🎯 Specialized Tests:
   Queue operations: 50
   Rate limit tests: 15 (10 allowed, 5 blocked)
   TTL validations: 1
   Concurrent reads: 40
   Concurrent writes: 20

❌ Errors: 0
```

### Heavy Load (500 sessions, 100 concurrent ops)
```
⏱️  Duration: ~15-20s

📊 Session Management:
   Sessions created: 500
   Sessions validated: 500
   Cache hits: 500
   Hit rate: 100.0%

🔄 Redis Operations:
   Total reads: ~503
   Total writes: ~561
   Operations/sec: ~50-60/sec

⚡ Performance:
   Read latency avg: < 2ms
   Read p95: < 5ms
   Read p99: < 10ms
   
   Write latency avg: < 2ms
   Write p95: < 5ms
   Write p99: < 10ms

🎯 Specialized Tests:
   Queue operations: 250
   Rate limit tests: 15
   Concurrent reads: 200
   Concurrent writes: 100

❌ Errors: < 5 (< 1% error rate)
```

## Redis Data Structures Used

### 1. Session Tokens (String)
```
Key: session:{userId}
Value: JSON {userId, username, email, token, createdAt, lastSeen}
TTL: 604800s (7 days)
```

### 2. Matchmaking Queue (List)
```
Key: queue:mmr:{range} (e.g., queue:mmr:1000-1200)
Value: JSON {userId, username, mmr, joinedAt}
Operation: LPUSH (enqueue), RPOP (dequeue)
TTL: 60s (player lookup)
```

### 3. Leaderboard (Sorted Set)
```
Key: leaderboard:{type} (e.g., leaderboard:wins)
Member: userId
Score: wins/kills/mmr
TTL: 300s (5 minutes)
Operations: ZADD, ZRANGE, ZREVRANGE
```

### 4. Rate Limiting (String/Counter)
```
Key: ratelimit:{userId}:{endpoint}
Value: request count
TTL: 60s (sliding window)
Operation: INCR
```

### 5. User Cache (Hash)
```
Key: user:cache:{userId}
Fields: username, wins, losses, mmr, etc.
TTL: 300s (5 minutes)
Operations: HSET, HGETALL, HDEL
```

## Redis Performance Characteristics

### Latency Targets
- **Read operations**: < 1ms avg, < 5ms p95
- **Write operations**: < 2ms avg, < 10ms p95
- **Network round-trip**: < 1ms (local), < 10ms (remote)

### Throughput Targets
- **Reads**: 10,000+ ops/sec per instance
- **Writes**: 5,000+ ops/sec per instance
- **Concurrent connections**: 10,000+ clients

### Memory Usage
- **Per session**: ~200-500 bytes (JSON string)
- **Per queue entry**: ~150-300 bytes
- **Per leaderboard entry**: ~50-100 bytes
- **100 sessions**: ~50KB total

## Troubleshooting

### High Cache Miss Rate
- Check if sessions are being created correctly
- Verify Redis is running: `podman ps | grep redis`
- Check Redis logs: `podman logs tank-redis`
- Verify TTL not expiring too quickly

### High Latency
- Check network connection to Redis
- Monitor Redis memory usage: `redis-cli INFO memory`
- Check for slow commands: `redis-cli SLOWLOG GET 10`
- Consider Redis persistence settings (AOF/RDB)

### Connection Errors
- Verify Redis is accessible: `redis-cli PING`
- Check connection string: `redis://localhost:6379`
- Verify firewall rules
- Check Redis maxclients setting

### Memory Issues
- Monitor memory usage: `redis-cli INFO memory`
- Check eviction policy: `redis-cli CONFIG GET maxmemory-policy`
- Review TTL settings (too long = memory growth)
- Consider setting `maxmemory` limit

### Queue Backup
- Monitor queue lengths: `redis-cli LLEN queue:mmr:{range}`
- Check for stuck workers
- Verify queue consumers are running
- Consider queue expiration (EXPIRE)

## Redis CLI Commands

### Check Session Count
```bash
redis-cli KEYS "session:*" | wc -l
```

### View Session Data
```bash
redis-cli GET "session:{userId}"
```

### Check Session TTL
```bash
redis-cli TTL "session:{userId}"
```

### List All Queues
```bash
redis-cli KEYS "queue:*"
```

### Check Queue Size
```bash
redis-cli LLEN "queue:mmr:1000-1200"
```

### View Leaderboard
```bash
redis-cli ZREVRANGE "leaderboard:wins" 0 9 WITHSCORES
```

### Monitor Real-Time Commands
```bash
redis-cli MONITOR
```

### Get Redis Stats
```bash
redis-cli INFO
redis-cli INFO stats
redis-cli INFO memory
redis-cli INFO keyspace
```

## Integration with Game Server

### Session Flow
1. User registers → API creates user in PostgreSQL
2. API generates JWT token
3. SessionManager stores token in Redis (7-day TTL)
4. User connects to WebSocket → validates token from Redis
5. On activity → refresh session TTL

### Matchmaking Flow
1. Player joins queue → enqueue in Redis list
2. Matchmaker polls queues every second
3. Forms match when threshold met
4. Removes players from queue
5. Creates match lobby

### Leaderboard Flow
1. Match ends → update PostgreSQL (source of truth)
2. Invalidate leaderboard cache (DEL)
3. Next GET request → rebuild from PostgreSQL
4. Cache for 5 minutes
5. Subsequent requests served from cache

## Related Tests

- **preflight-check.js** - Verify Redis connectivity before tests
- **websocket-go-test.js** - Test WebSocket connections (uses Redis sessions)
- **physics-simulation-test.js** - Game loop simulation (uses Redis for player state)

## Future Enhancements

- [ ] Game state caching (match snapshots)
- [ ] Real-time metrics aggregation
- [ ] Distributed locking tests (for match creation)
- [ ] Redis Cluster/Sentinel testing
- [ ] Cache warming strategies
- [ ] Redis pub/sub for game events
- [ ] Geo-distributed caching tests
- [ ] Cache stampede prevention (thundering herd)

## Performance Tuning

### Redis Configuration
```bash
# Increase max clients
redis-cli CONFIG SET maxclients 10000

# Set memory eviction policy
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Disable persistence for caching (if acceptable)
redis-cli CONFIG SET save ""

# Enable pipelining for batch operations
# (application-level optimization)
```

### Application-Level Optimizations
1. **Connection pooling** - Reuse connections (redis client handles this)
2. **Pipelining** - Batch multiple commands
3. **Compression** - Compress large values (JSON)
4. **TTL optimization** - Balance memory vs freshness
5. **Read-through cache** - Automatic cache population
6. **Cache aside** - Explicit cache management

## Monitoring Integration

### Prometheus Metrics (from game server)
- `redis_commands_total` - Total commands executed
- `redis_command_duration_seconds` - Command latency histogram
- `redis_pool_hits_total` - Connection pool hits
- `redis_pool_misses_total` - Connection pool misses
- `redis_errors_total` - Redis operation errors

### Grafana Dashboards
- Redis memory usage over time
- Command throughput (ops/sec)
- Latency percentiles (p50, p95, p99)
- Cache hit rate by type
- Error rate tracking

See `/monitoring/dashboards/02-database.json` for Redis dashboard configuration.
