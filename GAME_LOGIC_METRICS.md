# Game Logic Metrics Implementation

## Overview
Added comprehensive Prometheus metrics tracking for core game logic components including weapon pickups, character movement, hitbox detection, and combat performance.

## New Metrics Added

### Loot System Metrics
- **game_loot_spawned_total** (Counter) - Total loot items spawned by type
- **game_loot_collected_total** (Counter) - Total loot items collected by type  
- **game_active_loot_items** (Gauge) - Current number of active loot items
- **game_loot_spawn_duration_seconds** (Histogram) - Time taken to spawn loot
- **game_weapon_pickups_total** (Counter) - Weapon pickups by weapon type (rifle, shotgun, sniper)

### Movement & Physics Metrics
- **game_player_movements_total** (Counter) - Player movement updates by type (walk, sprint, dash)
- **game_movement_validation_duration_seconds** (Histogram) - Movement validation latency
- **game_physics_update_duration_seconds** (Histogram) - Physics calculation time
- **game_tick_duration_seconds** (Histogram) - Game tick processing time (30 TPS target = 33ms)

### Collision Detection Metrics
- **game_collision_checks_total** (Counter) - Total collision checks performed
- **game_collisions_detected_total** (Counter) - Collisions by type:
  - player_obstacle - Player hitting static/dynamic obstacles
  - player_boundary - Player hitting map boundaries
  - player_player - Player-to-player collisions
  - player_projectile - Projectile hitting player

### Hitbox & Combat Metrics
- **game_hitbox_checks_total** (Counter) - Total hitbox checks performed
- **game_hitbox_hits_total** (Counter) - Successful hits by type (projectile, melee, explosion)
- **game_projectiles_fired_total** (Counter) - Projectiles fired by weapon type
- **game_projectiles_active** (Gauge) - Currently active projectiles
- **game_damage_dealt** (Histogram) - Damage amount distribution by weapon
- **game_player_deaths_total** (Counter) - Player deaths by cause (weapon type, safezone, fall)

## Instrumentation Locations

### Loot Manager (`go-server/internal/game/loot/manager.go`)
- `SpawnCrate()` - Tracks loot spawn events and duration
- `CollectLoot()` - Tracks loot collection and decrements active loot gauge
- `RemoveCrate()` - Decrements active loot if not collected

### Loot Application (`go-server/internal/game/loot/loot.go`)
- `ApplyLootToPlayer()` - Tracks weapon pickups by type (rifle, shotgun, sniper)

### Physics Engine (`go-server/internal/game/combat/physics.go`)
- `UpdatePlayerMovement()` - Tracks movement updates, boundary collisions, validation duration
- `checkObstacleCollision()` - Tracks collision checks and obstacle hits
- `CheckPlayerCollisions()` - Tracks player-to-player collisions and physics update time

### Projectile Manager (`go-server/internal/game/combat/projectiles.go`)
- `FireWeapon()` - Tracks projectile creation and weapon firing
- `Update()` - Tracks projectile expiration
- `RemoveProjectile()` - Decrements active projectile gauge
- `CheckProjectileCollisions()` - Tracks hitbox checks, hits, damage, and player deaths

## Grafana Dashboard

Created new dashboard: **Tank Royale - Game Logic Performance** (`07-game-logic.json`)

### Key Dashboard Panels

#### Performance Monitoring
1. **Movement Validation Latency** (Heatmap) - Shows distribution of collision detection time
2. **Physics Update Latency** (Heatmap) - Shows distribution of physics calculation time
3. **Collision Check Rate** (Stat) - Real-time collision checks per second with thresholds

#### Gameplay Metrics
4. **Weapon Pickups Rate** (Timeseries) - Pickup rate by weapon type
5. **Loot Spawn & Collection Rate** (Timeseries) - Spawn vs collection comparison
6. **Player Movement Rate** (Timeseries) - Movement updates per second
7. **Active Loot Items** (Timeseries) - Current loot items in world

#### Combat Analytics
8. **Projectile Activity** (Timeseries) - Active projectiles and fire rate by weapon
9. **Damage Dealt Distribution** (Bar Chart) - Damage per second by weapon
10. **Player Deaths by Cause** (Stacked Bar) - Death attribution tracking
11. **Hitbox Checks & Hits** (Timeseries) - Hitbox performance and accuracy

#### Stats Panel
12. **Total Weapon Pickups** (Stat) - Cumulative pickups with color thresholds
13. **Hitbox Accuracy** (Stat) - Hit rate percentage (hits/checks)
14. **Avg Loot Spawn Time** (Stat) - Average spawn latency in milliseconds

## Performance Targets

### Target Benchmarks (per game tick at 30 TPS)
- **Game Tick Duration**: < 33ms (target for 30 TPS)
- **Movement Validation**: < 1ms per player
- **Physics Update**: < 10ms total
- **Collision Checks**: Scales with player count, monitor for optimization
- **Loot Spawn**: < 1ms

### Alerting Thresholds (Recommendations)
- **Collision Check Rate**: Warning at 1000/s, Critical at 5000/s
- **Movement Validation**: Warning at 5ms, Critical at 10ms
- **Physics Update**: Warning at 20ms, Critical at 33ms
- **Loot Spawn Time**: Warning at 1ms, Critical at 5ms

## How to View Metrics

### Access Grafana Dashboard
1. Start all services: `make start`
2. Open Grafana: http://localhost:3001
3. Navigate to **Tank Royale - Game Logic Performance** dashboard
4. Set refresh interval to 5s for real-time monitoring

### Query Prometheus Directly
Access Prometheus: http://localhost:9090

Example queries:
```promql
# Movement rate per second
rate(game_player_movements_total[1m])

# Hitbox accuracy percentage
rate(game_hitbox_hits_total[1m]) / rate(game_hitbox_checks_total[1m]) * 100

# Average collision detection time
rate(game_movement_validation_duration_seconds_sum[1m]) / rate(game_movement_validation_duration_seconds_count[1m])

# Weapon pickup distribution
sum by (weapon_type) (game_weapon_pickups_total)

# Active game objects
game_active_loot_items + game_projectiles_active
```

## Testing Metrics

### Manual Testing
1. Start game server: `make go-restart`
2. Run load test: `make load-test-matchmaking`
3. View metrics in Grafana dashboard
4. Check Prometheus targets: http://localhost:9090/targets

### Verify Metrics Export
```bash
# Check metrics endpoint
curl http://localhost:8081/metrics | grep game_

# Expected output includes:
# game_weapon_pickups_total
# game_player_movements_total
# game_collision_checks_total
# game_hitbox_checks_total
# game_projectiles_active
# etc.
```

## Next Steps

### Recommended Enhancements
1. **Add Game Tick Instrumentation** - Track actual game loop timing in engine/loop.go
2. **Add Safe Zone Metrics** - Track safe zone damage and player deaths
3. **Add Matchmaking Metrics** - Track queue times and match creation
4. **Set Up Alerts** - Configure Alertmanager for performance degradation
5. **Add Percentile Tracking** - P50, P95, P99 for latency metrics

### Performance Optimization Targets
- Monitor collision checks scaling with player count
- Identify bottlenecks in physics updates
- Optimize hitbox checks for large projectile counts
- Track memory allocation in loot spawn operations

## Files Modified

### Core Metrics
- `go-server/internal/metrics/metrics.go` - Added 19 new Prometheus metrics

### Instrumentation
- `go-server/internal/game/loot/manager.go` - Added loot spawn/collection tracking
- `go-server/internal/game/loot/loot.go` - Added weapon pickup tracking
- `go-server/internal/game/combat/physics.go` - Added movement/collision tracking
- `go-server/internal/game/combat/projectiles.go` - Added combat/hitbox tracking

### Dashboard
- `monitoring/dashboards/07-game-logic.json` - New comprehensive dashboard with 15 panels

## Build Verification
✅ All changes compile successfully
✅ No lint errors
✅ Metrics properly exported
✅ Dashboard JSON valid

---
**Created:** $(date)
**Version:** 1.0.0
**Status:** Ready for Production
