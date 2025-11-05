# Database Metrics Quick Reference

## 🎯 Quick Start

### Test Database Metrics
```bash
# Generate some database activity
curl http://localhost:8080/api/test/db

# View metrics
curl http://localhost:8080/metrics | grep db_
```

## 📊 Key Metrics

### Query Performance
```bash
# See all query types and counts
curl -s http://localhost:8080/metrics | grep db_query_duration_seconds_count

# See total query time by operation
curl -s http://localhost:8080/metrics | grep db_query_duration_seconds_sum

# Calculate average query time (manually)
# Average = sum / count
```

### Connection Pools
```bash
# Active connections
curl -s http://localhost:8080/metrics | grep db_connections_active
```

## 🔍 Prometheus Queries

Access: `http://localhost:9090`

### Query Rate (Queries Per Second)
```promql
rate(db_query_duration_seconds_count[5m])
```

### Average Query Duration
```promql
rate(db_query_duration_seconds_sum[5m]) / rate(db_query_duration_seconds_count[5m])
```

### 95th Percentile Latency
```promql
histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m]))
```

### 99th Percentile Latency
```promql
histogram_quantile(0.99, rate(db_query_duration_seconds_bucket[5m]))
```

### Slow Queries Alert (>50ms at p95)
```promql
histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m])) > 0.05
```

### Query Breakdown by Type
```promql
sum by (query_type) (rate(db_query_duration_seconds_count[5m]))
```

## 💻 Code Pattern

### Add Metrics to Any Database Operation

```go
func (r *YourRepository) YourMethod(ctx context.Context) error {
    // Start timer
    start := time.Now()
    
    // Record metric when function exits
    defer func() {
        r.pgDB.RecordQuery("your_operation_name", time.Since(start))
    }()
    
    // Your database code
    result, err := r.pgDB.Pool.Query(ctx, "SELECT ...")
    return err
}
```

### Naming Convention
Use snake_case for operation names:
- `user_get_by_id`
- `user_create`
- `session_cache`
- `leaderboard_get_top`

## 📈 Grafana Dashboard

**URL:** `http://localhost:3001`  
**Login:** admin/admin  
**Dashboard:** "Tank Royale 2 - Go Servers"

### Key Panels
1. **Database Query Rate** - Queries per second
2. **Database Query Duration (Avg)** - Average latency
3. **Database Query Duration (p95/p99)** - Tail latency

## 🧪 Load Testing

### Light Load (10 requests)
```bash
for i in {1..10}; do curl -s http://localhost:8080/api/test/db > /dev/null; done
```

### Medium Load (100 requests)
```bash
for i in {1..100}; do curl -s http://localhost:8080/api/test/db > /dev/null; done
```

### Check Results
```bash
curl -s http://localhost:8080/metrics | grep -A 3 "db_query_duration_seconds_count"
```

## 🎓 Understanding the Metrics

### Histogram Buckets
Our metrics use these latency buckets:
- 5ms, 10ms, 25ms, 50ms (fast queries)
- 100ms, 250ms, 500ms (medium queries)
- 1s, 2.5s, 5s, 10s (slow queries)

### What to Monitor
- **p50 (median)**: Typical query performance
- **p95**: 95% of queries are faster than this
- **p99**: 99% of queries are faster than this (catches outliers)

### Good Targets
- PostgreSQL: p95 < 50ms
- Redis: p95 < 5ms
- Simple queries: < 10ms
- Complex queries: < 100ms

## 🚨 Common Issues

### Metrics Not Showing Up
```bash
# Check if servers are running
lsof -i :8080
lsof -i :8081

# Check metrics endpoint
curl http://localhost:8080/metrics

# Generate some traffic
curl http://localhost:8080/api/test/db
```

### Connection Pool at 0
This is normal when idle. The metric shows *active* connections, not total pool size.

### Prometheus Not Scraping
```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.scrapePool | contains("tank"))'

# Restart Prometheus
podman restart tank-prometheus
```

## 📝 Query Examples

### PostgreSQL Operations (Future)
```
user_get_by_id
user_get_by_username
user_get_by_email
user_create
user_update
user_delete
user_get_stats
leaderboard_get_top
leaderboard_get_around_player
match_create
match_update_result
match_get_history
```

### Redis Operations (Future)
```
session_cache
session_get
session_delete
session_refresh
matchmaking_queue_add
matchmaking_queue_remove
game_state_cache
player_status_set
```

## 🔗 Related Endpoints

- **Health Check:** `GET /health`
- **Metrics:** `GET /metrics`
- **Database Test:** `GET /api/test/db`
- **Prometheus UI:** `http://localhost:9090`
- **Grafana Dashboards:** `http://localhost:3001`

## 📚 Documentation

- Full Guide: `DATABASE_METRICS_SUMMARY.md`
- Monitoring Setup: `MONITORING_INTEGRATION_SUMMARY.md`
- Quick Commands: `GO_SERVER_QUICK_REFERENCE.md`
- Migration Progress: `GO_MIGRATION_PROGRESS.md`

---

**TIP:** Bookmark this file for quick reference during development! 🚀
