# Redis Cache Verification Guide

Complete guide for verifying Redis cache hits vs misses and performance monitoring.

## 📊 Three Ways to Verify Redis Cache Performance

### 1. **Prometheus Metrics** (Real-time, Production-Ready)

The Go server now tracks cache metrics automatically via Prometheus.

#### Available Metrics

```promql
# Cache Hits (by cache type)
cache_hits_total{cache_type="session"}
cache_hits_total{cache_type="user"}
cache_hits_total{cache_type="leaderboard"}

# Cache Misses (by cache type)  
cache_misses_total{cache_type="session"}
cache_misses_total{cache_type="user"}

# Cache Operation Duration
cache_operation_duration_seconds{operation="get",cache_type="session"}
cache_operation_duration_seconds{operation="set",cache_type="session"}
cache_operation_duration_seconds{operation="delete",cache_type="session"}
```

#### Query Prometheus

**1. Via Web UI:**
```bash
# Open Prometheus
open http://localhost:9090

# Try these queries:
cache_hits_total
cache_misses_total
rate(cache_hits_total[5m])
rate(cache_misses_total[5m])

# Calculate cache hit ratio
sum(rate(cache_hits_total[5m])) / (sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m])))
```

**2. Via curl:**
```bash
# Get current cache hits
curl -s "http://localhost:9090/api/v1/query?query=cache_hits_total" | jq '.data.result'

# Get current cache misses
curl -s "http://localhost:9090/api/v1/query?query=cache_misses_total" | jq '.data.result'

# Get cache hit rate (last 5 minutes)
curl -s "http://localhost:9090/api/v1/query?query=rate(cache_hits_total[5m])" | jq '.data.result'

# Calculate hit ratio
curl -s 'http://localhost:9090/api/v1/query?query=sum(cache_hits_total)/(sum(cache_hits_total)%2Bsum(cache_misses_total))' | jq '.data.result[0].value[1]'
```

**3. Via Grafana Dashboard:**
```bash
# Open Grafana
open http://localhost:3000

# Import dashboard or create panels with:
# - Cache Hit/Miss Rates (line chart)
# - Cache Hit Ratio (gauge, target >90%)
# - Operation Latency (histogram)
# - Cache Type Breakdown (pie chart)
```

#### Example Prometheus Queries

```promql
# Overall cache hit ratio (%)
100 * sum(cache_hits_total) / (sum(cache_hits_total) + sum(cache_misses_total))

# Cache hit rate per second (last 5m)
sum(rate(cache_hits_total[5m])) by (cache_type)

# Cache miss rate per second (last 5m)  
sum(rate(cache_misses_total[5m])) by (cache_type)

# Average cache operation latency
histogram_quantile(0.95, rate(cache_operation_duration_seconds_bucket[5m]))

# Cache operations per second by type
sum(rate(cache_operation_duration_seconds_count[5m])) by (operation, cache_type)
```

---

### 2. **Redis CLI Commands** (Direct Redis Inspection)

Connect to Redis and inspect cache performance directly.

#### Connect to Redis

```bash
# Via Docker/Podman
podman exec -it tank-royale-redis redis-cli

# Or via local redis-cli
redis-cli -h localhost -p 6379
```

#### Basic Cache Inspection

```redis
# See all session keys
KEYS session:*

# Count sessions
EVAL "return #redis.call('keys', 'session:*')" 0

# Get a specific session
GET session:USER_ID_HERE

# Check TTL on a session (in seconds)
TTL session:USER_ID_HERE

# See all keys matching pattern
SCAN 0 MATCH session:* COUNT 100
```

#### Redis INFO Command (Performance Stats)

```redis
# Overall Redis stats
INFO stats

# Key metrics:
# - keyspace_hits: successful lookups
# - keyspace_misses: failed lookups  
# - instantaneous_ops_per_sec: current throughput
# - used_memory_human: memory usage
```

**Example Output:**
```
# Stats
total_connections_received:1234
total_commands_processed:56789
instantaneous_ops_per_sec:42
total_net_input_bytes:12345678
total_net_output_bytes:98765432
instantaneous_input_kbps:1.23
instantaneous_output_kbps:4.56
rejected_connections:0
sync_full:0
sync_partial_ok:0
sync_partial_err:0
expired_keys:0
evicted_keys:0
keyspace_hits:5432        # <-- CACHE HITS
keyspace_misses:123       # <-- CACHE MISSES
pubsub_channels:0
pubsub_patterns:0
```

**Calculate Hit Ratio:**
```bash
# Get stats
podman exec -it tank-royale-redis redis-cli INFO stats | grep keyspace

# Calculate ratio
echo "scale=4; 5432 / (5432 + 123) * 100" | bc  # = 97.79%
```

#### Monitor Redis in Real-time

```redis
# Watch commands as they execute
MONITOR

# See slow queries (>10ms)
SLOWLOG GET 10

# Reset stats (for testing)
CONFIG RESETSTAT
```

---

### 3. **Load Test Metrics** (Application-Level Testing)

Use the provided load tests to verify cache behavior under realistic load.

#### Run Redis Cache Load Test

```bash
cd load-tests

# Quick test (100 sessions, 20 concurrent ops)
npm run test:redis-quick

# Standard test (500 sessions, 50 concurrent ops)  
npm run test:redis

# Stress test (1000 sessions, 100 concurrent ops)
npm run test:redis-stress

# Custom configuration
NUM_SESSIONS=200 CONCURRENT_OPS=30 node redis-cache-load-test.js
```

#### What the Test Measures

1. **Session Creation** - Write performance
2. **Session Retrieval** - Read performance & cache hits
3. **Concurrent Operations** - Race conditions & consistency
4. **TTL Expiration** - Automatic cleanup
5. **Cache Performance** - Operation latency

#### Expected Results

**Normal Load (100 sessions, 20 concurrent):**
```
✅ Session Storage:
   Created: 100
   Write Time: 1.2s
   Avg Write Time: 12ms

✅ Session Retrieval:
   Retrieved: 100
   Cache Hits: 100 (100%)
   Read Time: 0.8s
   Avg Read Time: 8ms

✅ Concurrent Operations:
   Successful: 20
   Failed: 0
   Avg Time: 15ms
```

**Heavy Load (1000 sessions, 100 concurrent):**
```
✅ Session Storage:
   Created: 1000
   Write Time: 8.5s
   Avg Write Time: 8.5ms

✅ Session Retrieval:
   Retrieved: 1000  
   Cache Hits: 1000 (100%)
   Read Time: 5.2s
   Avg Read Time: 5.2ms
```

---

## 🎯 Performance Targets

### Cache Hit Ratio
- **Target**: >95%
- **Good**: 90-95%
- **Warning**: 80-90%
- **Critical**: <80%

### Operation Latency (p95)
- **GET**: <5ms
- **SET**: <10ms
- **DELETE**: <5ms

### Throughput
- **Reads**: >10,000 ops/sec
- **Writes**: >5,000 ops/sec
- **Concurrent connections**: >1,000

---

## 📈 Monitoring Best Practices

### 1. Set Up Grafana Dashboard

Create panels for:
- Cache hit/miss rates (line chart)
- Cache hit ratio percentage (gauge)
- Operation latency by type (histogram)
- Redis memory usage (area chart)
- Active sessions count (stat)
- Operations per second (line chart)

### 2. Configure Alerts

```yaml
# Grafana Alert: Low Cache Hit Ratio
- alert: LowCacheHitRatio
  expr: |
    100 * sum(cache_hits_total) / 
    (sum(cache_hits_total) + sum(cache_misses_total)) < 80
  for: 5m
  annotations:
    summary: "Cache hit ratio below 80%"
    
# Grafana Alert: High Cache Latency
- alert: HighCacheLatency
  expr: |
    histogram_quantile(0.95, 
      rate(cache_operation_duration_seconds_bucket[5m])
    ) > 0.05
  for: 5m
  annotations:
    summary: "Cache p95 latency >50ms"
```

### 3. Regular Health Checks

```bash
# Daily cache health check script
#!/bin/bash

echo "=== Redis Cache Health Check ==="

# 1. Check Redis connection
redis-cli ping

# 2. Get cache stats
redis-cli INFO stats | grep -E 'keyspace_hits|keyspace_misses|used_memory'

# 3. Calculate hit ratio
HITS=$(redis-cli INFO stats | grep keyspace_hits | cut -d: -f2)
MISSES=$(redis-cli INFO stats | grep keyspace_misses | cut -d: -f2)
RATIO=$(echo "scale=2; $HITS / ($HITS + $MISSES) * 100" | bc)
echo "Cache Hit Ratio: $RATIO%"

# 4. Check session count
SESSIONS=$(redis-cli EVAL "return #redis.call('keys', 'session:*')" 0)
echo "Active Sessions: $SESSIONS"

# 5. Check memory usage
redis-cli INFO memory | grep used_memory_human
```

---

## 🔍 Troubleshooting

### Low Cache Hit Ratio (<80%)

**Possible causes:**
1. Sessions expiring too quickly (TTL too short)
2. Cache getting evicted due to memory pressure
3. Users not reusing sessions (too many new registrations)
4. Cache keys not matching lookup patterns

**Solutions:**
```bash
# Check TTL configuration
redis-cli CONFIG GET maxmemory-policy

# Should be: allkeys-lru or volatile-lru

# Check memory usage
redis-cli INFO memory | grep maxmemory

# Increase memory if needed
redis-cli CONFIG SET maxmemory 512mb

# Check session TTL
redis-cli TTL session:USER_ID
# Should return ~604800 (7 days)
```

### High Cache Latency (>50ms p95)

**Possible causes:**
1. Redis running on slow disk (swap)
2. Network latency to Redis
3. Large payload sizes
4. Redis CPU maxed out

**Solutions:**
```bash
# Check Redis CPU usage
podman stats tank-royale-redis

# Check slow queries
redis-cli SLOWLOG GET 10

# Enable latency monitoring
redis-cli CONFIG SET latency-monitor-threshold 50

# Check latency
redis-cli LATENCY DOCTOR
```

### Cache Memory Growing Unbounded

**Possible causes:**
1. TTL not being set correctly
2. Leaking keys without expiration
3. No eviction policy configured

**Solutions:**
```bash
# Check keys without TTL
redis-cli SCAN 0 MATCH session:* | while read key; do
  redis-cli TTL $key
done

# Set eviction policy
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Manual cleanup (if needed)
redis-cli --scan --pattern 'session:*' | xargs redis-cli DEL
```

---

## 📚 Additional Resources

### Redis Commands Reference
```bash
# Session operations
SET session:123 '{"userId":"123"}' EX 604800    # Set with 7-day TTL
GET session:123                                  # Get session
DEL session:123                                  # Delete session
TTL session:123                                  # Check remaining TTL
EXISTS session:123                               # Check if exists

# Bulk operations
MGET session:1 session:2 session:3              # Get multiple
SCAN 0 MATCH session:* COUNT 100                # Iterate keys

# Performance
INFO stats                                       # Get stats
CONFIG GET maxmemory                            # Get config
SLOWLOG GET 10                                  # Get slow queries
CLIENT LIST                                      # List connections
```

### Prometheus Query Examples
```promql
# Top 10 slowest cache operations (p99)
topk(10, histogram_quantile(0.99, 
  rate(cache_operation_duration_seconds_bucket[5m])
)) by (operation, cache_type)

# Cache operations breakdown by type
sum(rate(cache_operation_duration_seconds_count[5m])) by (cache_type)

# Predict cache memory growth (next hour)
predict_linear(redis_memory_used_bytes[1h], 3600)
```

---

## ✅ Quick Verification Checklist

Before going to production:

- [ ] Cache hit ratio >95%
- [ ] p95 latency <10ms for GET operations
- [ ] p95 latency <20ms for SET operations
- [ ] Redis memory usage <70% of allocated
- [ ] All sessions have TTL set (7 days)
- [ ] No slow queries (>100ms)
- [ ] Prometheus metrics collecting correctly
- [ ] Grafana dashboard showing cache metrics
- [ ] Alerts configured for low hit ratio
- [ ] Load test passes with 1000+ sessions
- [ ] Concurrent operations work without errors
- [ ] Cache survives server restart (persistence enabled)

---

## 🚀 Example Workflow

### During Development
```bash
# 1. Start services
make start

# 2. Run load test to generate cache activity
cd load-tests && npm run test:redis-quick

# 3. Check Prometheus metrics
curl -s "http://localhost:9090/api/v1/query?query=cache_hits_total" | jq

# 4. Inspect Redis directly
podman exec -it tank-royale-redis redis-cli INFO stats | grep keyspace
```

### In Production
```bash
# 1. Monitor Grafana dashboard
open http://grafana.yourdomain.com

# 2. Set up alerts for:
#    - Cache hit ratio <90%
#    - Cache latency >50ms
#    - Redis memory >80%

# 3. Run daily health checks
./scripts/cache-health-check.sh

# 4. Review slow queries weekly
redis-cli SLOWLOG GET 100
```
