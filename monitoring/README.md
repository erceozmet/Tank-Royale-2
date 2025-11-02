# Tank Royale 2 - Monitoring Setup

Comprehensive monitoring stack with Prometheus, Grafana, and exporters for all services.

## 🎯 What's Monitored

### Application Metrics
- **HTTP Requests**: Rate, duration (percentiles), status codes
- **WebSocket Connections**: Active connections, connection/disconnection rate
- **Matchmaking**: Queue size, active matches, match creation rate
- **Authentication**: Success/failure rates
- **System**: CPU, memory, event loop lag

### Database Metrics
- **PostgreSQL**: Connections, transactions, query performance
- **Redis**: Memory usage, operations, connected clients, key space

### Infrastructure
- **System**: CPU, memory, disk, network I/O
- **Docker**: Container stats (optional)

## 🚀 Quick Start

### 1. Start Monitoring Stack

```bash
# Start all services including monitoring
docker-compose up -d

# Check service health
docker-compose ps
```

### 2. Access Dashboards

| Service | URL | Credentials |
|---------|-----|-------------|
| **Grafana** | http://localhost:3001 | admin / admin123 |
| **Prometheus** | http://localhost:9090 | - |
| **pgAdmin** | http://localhost:8080 | admin@tankroyale.com / admin123 |
| **Redis Commander** | http://localhost:8081 | - |

### 3. View Metrics

The main dashboard "Tank Royale 2 - System Overview" is automatically provisioned and available in Grafana.

## 📊 Dashboards

### Tank Royale 2 - System Overview
Pre-configured dashboard showing:
- HTTP request rate and latency
- WebSocket connections
- Matchmaking queue metrics
- Authentication success/failure
- System resource usage
- Database performance

## 🔧 Metrics Endpoints

### Application Metrics
```bash
# Get Prometheus metrics from the server
curl http://localhost:3000/metrics
```

### Exporter Endpoints
- **Redis**: http://localhost:9121/metrics
- **PostgreSQL**: http://localhost:9187/metrics
- **Node**: http://localhost:9100/metrics

## 📈 Custom Metrics

Add custom metrics in your code:

```typescript
import { Counter, Gauge, Histogram } from '../middleware/metrics';

// Counter example
const myCounter = new Counter({
  name: 'tank_royale_my_metric_total',
  help: 'Description of my metric',
  labelNames: ['label1', 'label2'],
});

myCounter.labels('value1', 'value2').inc();

// Gauge example
const myGauge = new Gauge({
  name: 'tank_royale_my_gauge',
  help: 'Current value of something',
});

myGauge.set(42);

// Histogram example
const myHistogram = new Histogram({
  name: 'tank_royale_my_duration_seconds',
  help: 'Duration of something',
  buckets: [0.001, 0.01, 0.1, 1, 5],
});

const start = Date.now();
// ... do work ...
myHistogram.observe((Date.now() - start) / 1000);
```

## 🎨 Creating Custom Dashboards

### In Grafana UI
1. Go to http://localhost:3001
2. Click "+" → "Dashboard"
3. Add panels with PromQL queries
4. Save dashboard

### Example Queries

**HTTP Request Rate by Status Code:**
```promql
rate(tank_royale_http_requests_total[5m])
```

**95th Percentile Response Time:**
```promql
histogram_quantile(0.95, rate(tank_royale_http_request_duration_seconds_bucket[5m]))
```

**WebSocket Connections:**
```promql
tank_royale_websocket_connections
```

**Matchmaking Queue Size:**
```promql
tank_royale_matchmaking_queue_size
```

**Redis Memory:**
```promql
redis_memory_used_bytes / 1024 / 1024
```

**PostgreSQL Active Connections:**
```promql
pg_stat_database_numbackends{datname="tank_royale"}
```

## 🔔 Alerting (Future)

Prometheus alerting rules can be added to `prometheus.yml`:

```yaml
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - 'alerts/*.yml'
```

Example alert:
```yaml
groups:
  - name: tank_royale
    rules:
      - alert: HighErrorRate
        expr: rate(tank_royale_http_requests_total{status_code=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
```

## 🐛 Troubleshooting

### Metrics not showing up

1. **Check if Prometheus is scraping:**
   ```bash
   # Open Prometheus
   open http://localhost:9090
   
   # Go to Status → Targets
   # All targets should be "UP"
   ```

2. **Check server metrics endpoint:**
   ```bash
   curl http://localhost:3000/metrics
   ```

3. **Check exporter logs:**
   ```bash
   docker logs tank-redis-exporter
   docker logs tank-postgres-exporter
   ```

### Grafana not showing data

1. **Check data source connection:**
   - Go to Configuration → Data Sources
   - Test Prometheus connection

2. **Check time range:**
   - Make sure time range in top-right matches when data exists

3. **Verify query syntax:**
   - Use Prometheus UI to test queries first

### High memory usage

Monitor with:
```bash
docker stats tank-prometheus tank-grafana
```

Reduce retention period in `prometheus.yml`:
```yaml
command:
  - '--storage.tsdb.retention.time=15d'
```

## 📚 Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [prom-client (Node.js)](https://github.com/siimon/prom-client)
- [Redis Exporter](https://github.com/oliver006/redis_exporter)
- [PostgreSQL Exporter](https://github.com/prometheus-community/postgres_exporter)

## 🔐 Production Considerations

For production deployment:

1. **Secure Grafana:**
   ```yaml
   environment:
     GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
     GF_SERVER_ROOT_URL: https://monitoring.yourdomain.com
   ```

2. **Enable HTTPS:**
   - Use reverse proxy (nginx, Traefik)
   - Obtain SSL certificates

3. **Authentication:**
   - Configure OAuth or LDAP for Grafana
   - Restrict Prometheus access

4. **Data Retention:**
   - Set appropriate retention periods
   - Consider remote storage (e.g., Thanos, Cortex)

5. **Backups:**
   - Backup Grafana dashboards and config
   - Export important dashboards as JSON

6. **Resource Limits:**
   ```yaml
   deploy:
     resources:
       limits:
         memory: 2G
         cpus: '1.0'
   ```
