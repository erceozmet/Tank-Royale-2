# Game Logic Metrics - Quick Reference

## 🎯 Quick Start

### View Metrics in Grafana
```bash
# Open in browser
http://localhost:3001

# Navigate to: Tank Royale - Game Logic Performance
# Default credentials: admin/admin
```

### View Raw Metrics
```bash
# Game server metrics
curl http://localhost:8081/metrics | grep "game_"

# API server metrics
curl http://localhost:8080/metrics | grep "http_"
```

## 📊 Available Metrics

### Loot System
```promql
# Total loot spawned by type
game_loot_spawned_total

# Total loot collected by type
game_loot_collected_total

# Active loot items in world
game_active_loot_items

# Loot spawn performance
game_loot_spawn_duration_seconds

# Weapon pickups by type (rifle, shotgun, sniper)
game_weapon_pickups_total
```

### Movement & Physics
```promql
# Player movement events
game_player_movements_total{movement_type="walk"}

# Movement validation latency
game_movement_validation_duration_seconds

# Physics calculation time
game_physics_update_duration_seconds

# Game tick duration (target: <33ms for 30 TPS)
game_tick_duration_seconds
```

### Collision Detection
```promql
# Total collision checks
game_collision_checks_total

# Detected collisions by type
game_collisions_detected_total{collision_type="player_obstacle"}
game_collisions_detected_total{collision_type="player_boundary"}
game_collisions_detected_total{collision_type="player_player"}
game_collisions_detected_total{collision_type="player_projectile"}
```

### Combat & Hitbox
```promql
# Hitbox checks performed
game_hitbox_checks_total

# Successful hits by type
game_hitbox_hits_total{hit_type="projectile"}
game_hitbox_hits_total{hit_type="obstacle"}

# Projectiles fired by weapon
game_projectiles_fired_total{weapon_type="rifle"}

# Currently active projectiles
game_projectiles_active

# Damage distribution
game_damage_dealt

# Player deaths by cause
game_player_deaths_total{death_cause="rifle"}
```

## 🔍 Useful Queries

### Performance Metrics
```promql
# Average movement validation time (ms)
rate(game_movement_validation_duration_seconds_sum[1m]) / rate(game_movement_validation_duration_seconds_count[1m]) * 1000

# Average physics update time (ms)
rate(game_physics_update_duration_seconds_sum[1m]) / rate(game_physics_update_duration_seconds_count[1m]) * 1000

# Average loot spawn time (ms)
rate(game_loot_spawn_duration_seconds_sum[1m]) / rate(game_loot_spawn_duration_seconds_count[1m]) * 1000

# 95th percentile movement validation
histogram_quantile(0.95, rate(game_movement_validation_duration_seconds_bucket[1m]))
```

### Gameplay Analytics
```promql
# Weapon pickup rate (pickups per second)
rate(game_weapon_pickups_total[1m])

# Most popular weapon
topk(1, sum by (weapon_type) (game_weapon_pickups_total))

# Hitbox accuracy (hit rate %)
rate(game_hitbox_hits_total[1m]) / rate(game_hitbox_checks_total[1m]) * 100

# Collision efficiency (detections per check %)
rate(game_collisions_detected_total[1m]) / rate(game_collision_checks_total[1m]) * 100

# Average damage per weapon
rate(game_damage_dealt_sum[1m]) / rate(game_damage_dealt_count[1m])

# Total projectiles fired per minute
increase(game_projectiles_fired_total[1m])
```

### Resource Monitoring
```promql
# Total active game objects
game_active_loot_items + game_projectiles_active

# Movement updates per second
rate(game_player_movements_total[1m])

# Collision checks per second
rate(game_collision_checks_total[1m])

# Hitbox checks per second
rate(game_hitbox_checks_total[1m])
```

### Combat Statistics
```promql
# Deaths per weapon (last 5 minutes)
increase(game_player_deaths_total[5m])

# Most deadly weapon
topk(1, sum by (death_cause) (game_player_deaths_total))

# Loot collection efficiency (collected vs spawned)
sum(rate(game_loot_collected_total[5m])) / sum(rate(game_loot_spawned_total[5m])) * 100
```

## 🚨 Performance Alerts

### Recommended Thresholds
```promql
# CRITICAL: Physics updates taking too long (>20ms average)
rate(game_physics_update_duration_seconds_sum[1m]) / rate(game_physics_update_duration_seconds_count[1m]) > 0.020

# WARNING: High collision check rate (>1000/s)
rate(game_collision_checks_total[1m]) > 1000

# WARNING: Movement validation slow (>5ms)
rate(game_movement_validation_duration_seconds_sum[1m]) / rate(game_movement_validation_duration_seconds_count[1m]) > 0.005

# INFO: Many active projectiles (>100)
game_projectiles_active > 100

# INFO: Many active loot items (>50)
game_active_loot_items > 50
```

## 🧪 Testing Metrics

### Generate Test Data
```bash
# Run matchmaking load test (generates game activity)
make load-test-matchmaking

# Run websocket load test (generates player activity)  
make load-test-websocket

# Heavy load test (stress test all systems)
make load-test-heavy
```

### Verify Metrics Collection
```bash
# Check if metrics are increasing
watch -n 1 'curl -s http://localhost:8081/metrics | grep -E "(game_collision_checks_total|game_player_movements_total|game_projectiles_active)"'

# Query specific metric in Prometheus
curl -s "http://localhost:9090/api/v1/query?query=game_active_loot_items" | jq '.data.result'

# Check metric scrape status
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.scrapeUrl | contains("8081"))'
```

## 📈 Dashboard Panels

### Panel IDs in 07-game-logic.json
1. Weapon Pickups Rate
2. Loot Spawn & Collection Rate
3. Player Movement Rate
4. Collision Detection Performance
5. Hitbox Checks & Hits
6. Projectile Activity
7. Movement Validation Latency (Heatmap)
8. Physics Update Latency (Heatmap)
9. Damage Dealt Distribution
10. Player Deaths by Cause
11. Active Loot Items
12. Total Weapon Pickups (Stat)
13. Collision Check Rate (Stat)
14. Hitbox Accuracy (Stat)
15. Avg Loot Spawn Time (Stat)

## 🔧 Troubleshooting

### Metrics Not Showing Up
```bash
# 1. Check if game server is exporting metrics
curl http://localhost:8081/metrics | grep "game_"

# 2. Check if Prometheus is scraping
curl http://localhost:9090/api/v1/targets

# 3. Restart Prometheus to reload config
podman restart tank-prometheus

# 4. Check Prometheus logs
podman logs tank-prometheus
```

### Dashboard Not Loading
```bash
# 1. Verify dashboard file exists
ls -la monitoring/dashboards/07-game-logic.json

# 2. Restart Grafana
podman restart tank-grafana

# 3. Check Grafana logs
podman logs tank-grafana

# 4. Manually import dashboard
# Go to Grafana → Dashboards → Import → Upload JSON
```

### No Data in Graphs
```bash
# 1. Generate some game activity (metrics are event-based)
make load-test-matchmaking

# 2. Check if metrics have values
curl http://localhost:8081/metrics | grep "game_player_movements_total"

# 3. Query Prometheus directly
curl "http://localhost:9090/api/v1/query?query=game_player_movements_total"

# 4. Adjust dashboard time range (use "Last 5 minutes")
```

## 📝 Example Workflow

### Monitor Game Performance During Load Test
```bash
# Terminal 1: Start load test
make load-test-heavy

# Terminal 2: Watch collision metrics
watch -n 1 'curl -s http://localhost:8081/metrics | grep collision_checks_total'

# Browser: Open Grafana
http://localhost:3001
# Navigate to: Tank Royale - Game Logic Performance
# Watch real-time metrics during load test
```

### Analyze Weapon Balance
```bash
# Query weapon pickup distribution
curl -s "http://localhost:9090/api/v1/query?query=sum by (weapon_type) (game_weapon_pickups_total)" | jq '.data.result'

# Query damage dealt by weapon
curl -s "http://localhost:9090/api/v1/query?query=sum by (weapon_type) (rate(game_damage_dealt_sum[5m]))" | jq '.data.result'

# Query deaths by weapon
curl -s "http://localhost:9090/api/v1/query?query=sum by (death_cause) (game_player_deaths_total)" | jq '.data.result'
```

## 🎮 Integration with Game Server

All metrics are automatically instrumented in:
- Loot system: `go-server/internal/game/loot/`
- Physics engine: `go-server/internal/game/combat/physics.go`
- Projectile system: `go-server/internal/game/combat/projectiles.go`

No additional configuration needed - metrics are collected automatically during gameplay!

---
For full documentation see: GAME_LOGIC_METRICS.md
