# Physics & Movement Simulation Testing

## Overview

Comprehensive physics simulation test that validates player movement with realistic 2D vector physics, collision detection, and powerup interactions for the Tank Royale 2 game server.

## Test Features

### ✅ Physics & Movement
- **Vector-based movement** - Velocity, acceleration, and friction
- **Movement patterns** - Circular, zigzag, random walk, patrol, aggressive
- **Boundary collision detection** - Map edge collision with bounce physics
- **Player-to-player collision** - Realistic collision response with impulse physics
- **30 TPS simulation** - Matches server tick rate (~33.33ms intervals)

### ✅ Combat System
- **Weapon switching** - All 4 weapon types (pistol, rifle, shotgun, sniper)
- **Fire rate mechanics** - Proper cooldown enforcement
- **Damage boost calculation** - 15% per stack (max 3 stacks)
- **Fire rate boost calculation** - 20% cooldown reduction per stack (max 3 stacks)

### ✅ Powerup Collection
- **Shield stacks** - 50 HP per stack (max 150 total)
- **Damage boosts** - Up to +45% damage (3 stacks)
- **Fire rate boosts** - Up to -60% cooldown (3 stacks)
- **Weapon pickups** - Rifle, shotgun, sniper upgrades

## Quick Start

### Basic Test
```bash
npm run test:physics-quick
# Or: NUM_PLAYERS=8 TEST_DURATION=30 node physics-simulation-test.js
```

### Standard Test
```bash
npm run test:physics
# Or: NUM_PLAYERS=16 TEST_DURATION=60 node physics-simulation-test.js
```

### Stress Test
```bash
npm run test:physics-stress
# Or: NUM_PLAYERS=32 TEST_DURATION=120 node physics-simulation-test.js
```

## Test Configurations

### Environment Variables
- `NUM_PLAYERS` - Number of concurrent players (default: 8)
- `TEST_DURATION` - Test duration in seconds (default: 60)
- `MAP_SIZE` - Map dimensions (default: 4000)
- `API_URL` - API server URL (default: http://localhost:8080)
- `GAME_URL` - Game WebSocket URL (default: ws://localhost:8081)

### Example Commands
```bash
# Quick 30-second test with 8 players
NUM_PLAYERS=8 TEST_DURATION=30 node physics-simulation-test.js

# Medium load with 16 players for 1 minute
NUM_PLAYERS=16 TEST_DURATION=60 node physics-simulation-test.js

# Heavy load with 32 players for 2 minutes
NUM_PLAYERS=32 TEST_DURATION=120 node physics-simulation-test.js

# Custom map size (larger map = less collisions)
NUM_PLAYERS=16 TEST_DURATION=60 MAP_SIZE=6000 node physics-simulation-test.js
```

## Test Results

### What Gets Measured

#### Player Metrics
- Players registered/connected/authenticated
- Active connections throughout test

#### Physics Simulation
- Total movement calculations
- Movement updates per second
- Collision detections (boundary + player-to-player)
- Collision rate per second

#### Combat & Powerups
- Powerups collected (by type)
- Weapon switches
- Shots attempted vs shots fired
- Fire success rate (cooldown enforcement)

#### Network Performance
- Messages sent/received
- Messages per second
- Error rate
- Error types breakdown

#### Individual Player Stats
- Final position
- Health and shield status
- Current weapon and boosts
- Powerups collected
- Collisions detected
- Shots fired

### Success Criteria
✅ All players registered  
✅ All players connected  
✅ All players authenticated  
✅ Movement simulation working (>0 movements)  
✅ Collision detection working (>0 collisions)  
✅ Error rate < 5%  
✅ Messages received from server  

## Expected Results

### Normal Load (16 players, 60s)
```
⏱️  Duration: 61.5s

👥 Players: 16/16 registered, connected, authenticated

🎯 Physics Simulation:
   Total Movements: ~28,800
   Movement Updates/sec: ~468/sec
   Total Collisions: 1-10
   Collision Rate: 0.02-0.16/sec

⚡ Combat & Powerups:
   Powerups Collected: 200-300
   Weapon Switches: 50-100
   Shots Fired: 1,200-2,000
   Fire Success Rate: 40-50%

📊 Messages:
   Messages/sec: 350-400/sec
   Error rate: <1%
```

### Heavy Load (32 players, 120s)
```
⏱️  Duration: 122s

👥 Players: 32/32 registered, connected, authenticated

🎯 Physics Simulation:
   Total Movements: ~115,000
   Movement Updates/sec: ~943/sec
   Total Collisions: 10-50
   Collision Rate: 0.08-0.41/sec

⚡ Combat & Powerups:
   Powerups Collected: 800-1,200
   Weapon Switches: 200-400
   Shots Fired: 4,800-8,000
   Fire Success Rate: 40-50%

📊 Messages:
   Messages/sec: 700-800/sec
   Error rate: <2%
```

## Physics Implementation Details

### Vector2D Class
```javascript
class Vector2D {
  constructor(x, y)
  add(v)           // Vector addition
  subtract(v)      // Vector subtraction
  multiply(scalar) // Scalar multiplication
  magnitude()      // Vector length
  normalize()      // Unit vector
  distance(v)      // Distance between points
  dot(v)          // Dot product
  static fromAngle(angle, magnitude) // Create from polar coords
  toAngle()       // Convert to angle
}
```

### Movement Patterns
1. **Circular** - Move in circles around map center
2. **Zigzag** - Oscillating pattern with direction changes
3. **Random Walk** - 5% chance to change direction each tick
4. **Patrol** - Move between random waypoints
5. **Aggressive** - Move toward center at 120% speed

### Collision Physics
- **Boundary Collision** - Bounce off map edges with reflection
- **Player Collision** - Push apart with impulse-based collision response
- **Collision Radius** - 20 units per player (40 units diameter)

### Powerup Effects
```javascript
Shield: +50 HP per stack (max 150 total)
Damage Boost: +15% per stack (max +45% at 3 stacks)
Fire Rate Boost: -20% cooldown per stack (max -60% at 3 stacks)
Weapons: Pistol (15 dmg, 500ms) → Rifle (20, 400ms) → Shotgun (35, 800ms) → Sniper (50, 1200ms)
```

### Weapon Stats
| Weapon  | Base Damage | Fire Rate | Range | Speed | Max Damage (3 boosts) |
|---------|-------------|-----------|-------|-------|----------------------|
| Pistol  | 15          | 500ms     | 600   | 10    | 21                   |
| Rifle   | 20          | 400ms     | 800   | 12    | 29                   |
| Shotgun | 35          | 800ms     | 400   | 8     | 50                   |
| Sniper  | 50          | 1200ms    | 1200  | 15    | 72                   |

With 3 fire rate boosts, cooldowns become:
- Pistol: 200ms (-60%)
- Rifle: 160ms (-60%)
- Shotgun: 320ms (-60%)
- Sniper: 480ms (-60%)

## Troubleshooting

### No Players Connecting
- Check API server is running: `curl http://localhost:8080/health`
- Check Game server is running: `curl http://localhost:8081/health`
- Verify JWT authentication is working

### Low Movement Count
- Check `SERVER_TICK_RATE` matches server (30 TPS)
- Verify physics simulation loop is running
- Check for JavaScript errors in console

### No Collisions Detected
- Increase player count for more interactions
- Decrease map size to force proximity
- Verify collision radius (20 units)

### High Error Rate
- Check WebSocket connection stability
- Verify message format matches server expectations
- Check for network throttling

## Related Tests

- **websocket-go-test.js** - Basic WebSocket connectivity
- **game-loop-load-test.js** - Full game loop simulation (when matchmaking is implemented)
- **preflight-check.js** - System readiness validation

## Future Enhancements

- [ ] Projectile trajectory simulation
- [ ] Safe zone damage tracking
- [ ] Real match integration (when server supports it)
- [ ] Server-side state validation
- [ ] Latency compensation testing
- [ ] Network lag simulation
- [ ] Obstacle collision detection
- [ ] Team-based gameplay simulation
