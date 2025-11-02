# Load Testing & Monitoring Setup Complete! 🎉

## What We've Built

### 1. **Load Testing Suite** 📊
Complete load testing infrastructure for validating system performance:

- **API Load Tests** (`/load-tests/api-load-test.yml`)
  - Artillery configuration with 4 load phases
  - Tests: registration, login, profile, leaderboard
  - Targets: 50 concurrent users ramping to 200
  
- **WebSocket Stress Test** (`/load-tests/websocket-load-test.js`)
  - 500 concurrent Socket.IO connections
  - JWT authentication testing
  - Latency measurement and pass/fail criteria
  
- **Matchmaking Load Test** (`/load-tests/matchmaking-load-test.js`)
  - 1000 player simulation
  - Queue join/leave operations
  - MMR-based matching validation
  
- **Test Setup Script** (`/load-tests/setup.js`)
  - Creates 5 test users
  - Health check verification
  - Ready-to-use test accounts

### 2. **Monitoring Stack** 📈
Enterprise-grade monitoring with Prometheus + Grafana:

#### Services Added to Docker Compose:
- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization dashboards (port 3001)
- **Redis Exporter**: Redis metrics
- **PostgreSQL Exporter**: Database metrics
- **Node Exporter**: System metrics

#### Application Metrics:
- HTTP request rate and duration
- WebSocket connection tracking
- Matchmaking queue size
- Active matches count
- Authentication success/failure
- System resources (CPU, memory, event loop lag)

#### Pre-built Dashboard:
- "Tank Royale 2 - System Overview"
- 15 panels covering all aspects of the system
- Auto-provisioned on Grafana startup

## How to Use

### Start Everything

```bash
# 1. Start monitoring stack (includes databases)
./start-monitoring.sh

# 2. Start your application server
cd server
npm run dev

# 3. Run load tests (in another terminal)
cd load-tests
npm run setup           # Create test users
npm run test:api        # Test HTTP endpoints
npm run test:websocket  # Test WebSocket connections
npm run test:matchmaking # Test matchmaking queue
npm run test:all        # Run all tests
```

### Quick Test (Reduced Load)
```bash
cd load-tests
npm run test:quick  # 50 clients, 100 players, 30s duration
```

### Access Dashboards

| Service | URL | Login |
|---------|-----|-------|
| **Grafana** | http://localhost:3001 | admin / admin123 |
| **Prometheus** | http://localhost:9090 | - |
| **pgAdmin** | http://localhost:8080 | admin@tankroyale.com / admin123 |
| **Redis Commander** | http://localhost:8081 | - |

## Metrics You Can Track

### Application Performance
- **HTTP**: Request rate, latency (p50, p95, p99), error rates
- **WebSocket**: Active connections, connection rate, disconnection rate
- **Matchmaking**: Queue size, match creation rate, time in queue

### Database Performance
- **PostgreSQL**: Active connections, transactions/sec, query duration
- **Redis**: Memory usage, commands/sec, key space, cache hit rate

### System Health
- **Node.js**: CPU usage, memory, event loop lag, garbage collection
- **System**: CPU, memory, disk I/O, network

## Load Test Targets

### Current Goals
- **HTTP Requests**: 
  - 200 concurrent users
  - p95 latency < 200ms
  - Success rate > 99%

- **WebSocket Connections**:
  - 500 concurrent connections
  - Connection time p95 < 100ms
  - Message latency < 100ms

- **Matchmaking**:
  - 1000 players in queue
  - Match creation < 5s
  - Queue processing consistent

## Monitoring Features

### Real-time Metrics
All metrics update every 10 seconds in Grafana. You can:
- See live request rates
- Track WebSocket connections
- Monitor queue sizes
- Watch resource usage

### Historical Data
Prometheus retains 15 days of metrics by default:
- Compare performance over time
- Identify trends
- Analyze incidents

### Custom Queries
Use PromQL in Prometheus or Grafana:

```promql
# HTTP error rate
rate(tank_royale_http_requests_total{status_code=~"5.."}[5m])

# WebSocket connections over time
tank_royale_websocket_connections

# Average matchmaking queue size (5m)
avg_over_time(tank_royale_matchmaking_queue_size[5m])
```

## Files Created

### Load Tests
```
load-tests/
├── README.md                    # Complete testing guide
├── package.json                 # NPM scripts
├── setup.js                     # Test user creation
├── api-load-test.yml           # Artillery HTTP tests
├── websocket-load-test.js      # Socket.IO stress test
├── matchmaking-load-test.js    # Queue stress test
└── processors/
    └── auth-processor.js       # Artillery auth helper
```

### Monitoring
```
monitoring/
├── README.md                    # Monitoring documentation
├── prometheus.yml              # Prometheus config
├── grafana-datasources.yml     # Auto-provisioned datasource
├── grafana-dashboards.yml      # Dashboard provisioning
└── dashboards/
    └── tank-royale-overview.json  # Main dashboard
```

### Server Updates
```
server/src/
├── middleware/
│   └── metrics.ts              # Prometheus metrics middleware
├── index.ts                    # Added metrics endpoint
├── websocket/index.ts          # Added connection tracking
├── services/MatchmakingService.ts  # Added queue metrics
└── routes/auth.ts              # Added auth metrics
```

### Scripts
```
start-monitoring.sh             # One-command monitoring startup
```

## Next Steps

### 1. Run Baseline Load Tests
```bash
cd load-tests
npm run setup
npm run test:all
```

Document results to establish baseline performance.

### 2. Identify Bottlenecks
Watch Grafana dashboard during load tests:
- High latency? Check database query times
- Memory growing? Check for leaks
- High CPU? Profile the code
- Redis slow? Check key space size

### 3. Optimize Based on Data
Example optimizations:
- Add database indexes for slow queries
- Implement connection pooling
- Add caching for frequently accessed data
- Optimize matchmaking algorithm

### 4. Re-test After Changes
Run load tests again to validate improvements.

### 5. Set Up Alerts (Optional)
Configure Prometheus alerts for:
- High error rates (>1%)
- High latency (p95 > 500ms)
- Memory leaks (continuous growth)
- Queue overflow (>1000 players)

## Tips for Load Testing

### Gradual Increase
Don't jump straight to max load:
1. Run with 10% of target (50 users, 100 players)
2. Check metrics and fix issues
3. Increase to 50% (100 users, 500 players)
4. Check again
5. Full load (200 users, 1000 players)

### Monitor Everything
During tests, watch:
- CPU usage (should stay < 80%)
- Memory (should be stable, not growing)
- Database connections (should be < max)
- Redis memory (should fit in RAM)
- Event loop lag (should be < 50ms)

### Realistic Scenarios
- Use different MMR values (500-2000)
- Simulate player disconnections
- Mix HTTP and WebSocket traffic
- Test edge cases (rapid join/leave)

## Troubleshooting

### Load Tests Failing
```bash
# Check if server is running
curl http://localhost:3000/health

# Check test users exist
psql -U tank_user -d tank_royale -c "SELECT * FROM users WHERE email LIKE 'loadtest%';"

# Run with debug output
DEBUG=socket.io-client:* node websocket-load-test.js
```

### Metrics Not Showing
```bash
# Test metrics endpoint
curl http://localhost:3000/metrics

# Check Prometheus targets
open http://localhost:9090/targets

# Check Grafana data source
# Go to Configuration → Data Sources → Test
```

### Docker Issues
```bash
# Restart everything
docker-compose down
docker-compose up -d

# Check logs
docker-compose logs prometheus
docker-compose logs grafana
```

## Documentation

- **Load Testing Guide**: `/load-tests/README.md`
- **Monitoring Guide**: `/monitoring/README.md`
- **Architecture**: `/docs/ARCHITECTURE.md`
- **API Testing**: `/docs/API_TESTING.md`

## Success Criteria

Before proceeding to Phase 3 (Lobby System):

- [ ] All load tests pass
- [ ] p95 latency < 200ms under load
- [ ] WebSocket connections stable at 500+
- [ ] Matchmaking handles 1000 players
- [ ] No memory leaks during 5min test
- [ ] Database connections stable
- [ ] Redis memory < 100MB

## Summary

You now have:
✅ Comprehensive load testing suite  
✅ Production-ready monitoring stack  
✅ Real-time metrics dashboards  
✅ Performance baseline capability  
✅ Bottleneck identification tools  
✅ Optimization validation framework  

**Your system is ready for serious testing and optimization!** 🚀

Run the tests, watch the metrics, and optimize based on data. You'll have a solid foundation before adding game server complexity in Phase 4.
