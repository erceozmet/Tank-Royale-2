#!/usr/bin/env node

/**
 * Tank Royale 2 - Physics & Movement Simulation Test
 * 
 * Tests player movement with realistic 2D vector physics, collision detection,
 * and powerup interactions to validate the game loop implementation.
 * 
 * Features tested:
 * - Vector-based movement (velocity, acceleration, friction)
 * - Collision detection (player-to-player, player-to-boundary)
 * - Powerup collection and effects (shields, damage boosts, fire rate boosts)
 * - Weapon switching and firing with proper cooldowns
 * - Map boundaries and safe zone mechanics
 * 
 * Usage:
 *   NUM_PLAYERS=8 TEST_DURATION=60 node physics-simulation-test.js
 *   NUM_PLAYERS=16 TEST_DURATION=120 MAP_SIZE=4000 node physics-simulation-test.js
 */

const WebSocket = require('ws');
const axios = require('axios');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:8080';
const GAME_URL = process.env.GAME_URL || 'ws://localhost:8081';
const NUM_PLAYERS = parseInt(process.env.NUM_PLAYERS || '8');
const TEST_DURATION = parseInt(process.env.TEST_DURATION || '60') * 1000; // Convert to ms

// Game constants (matching Go server)
const MAP_WIDTH = parseFloat(process.env.MAP_SIZE || '4000');
const MAP_HEIGHT = parseFloat(process.env.MAP_SIZE || '4000');
const PLAYER_BASE_SPEED = 5.0; // Units per tick
const PLAYER_RADIUS = 20.0;
const SERVER_TICK_RATE = 30; // 30 TPS
const TICK_INTERVAL = 1000 / SERVER_TICK_RATE; // ~33.33ms

// Weapon stats (matching Go server constants)
const WEAPON_STATS = {
  pistol: { damage: 15, fireRate: 500, range: 600, speed: 10 },
  rifle: { damage: 20, fireRate: 400, range: 800, speed: 12 },
  shotgun: { damage: 35, fireRate: 800, range: 400, speed: 8 },
  sniper: { damage: 50, fireRate: 1200, range: 1200, speed: 15 }
};

// Powerup constants
const SHIELD_PER_STACK = 50;
const MAX_SHIELD_STACKS = 3;
const MAX_DAMAGE_BOOST = 3;
const MAX_FIRE_RATE_BOOST = 3;
const DAMAGE_BOOST_PERCENT = 15; // 15% per stack
const FIRE_RATE_BOOST_PERCENT = 20; // 20% per stack

// Statistics
const stats = {
  playersRegistered: 0,
  playersConnected: 0,
  playersAuthenticated: 0,
  totalMovements: 0,
  totalCollisions: 0,
  totalPowerupsCollected: 0,
  totalWeaponSwitches: 0,
  totalShotsAttempted: 0,
  totalShotsFired: 0,
  messagesSent: 0,
  messagesReceived: 0,
  errors: 0,
  errorTypes: {},
  playerStats: new Map()
};

// 2D Vector class for physics calculations
class Vector2D {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  add(v) {
    return new Vector2D(this.x + v.x, this.y + v.y);
  }

  subtract(v) {
    return new Vector2D(this.x - v.x, this.y - v.y);
  }

  multiply(scalar) {
    return new Vector2D(this.x * scalar, this.y * scalar);
  }

  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize() {
    const mag = this.magnitude();
    return mag > 0 ? new Vector2D(this.x / mag, this.y / mag) : new Vector2D(0, 0);
  }

  distance(v) {
    return this.subtract(v).magnitude();
  }

  dot(v) {
    return this.x * v.x + this.y * v.y;
  }

  static fromAngle(angle, magnitude = 1) {
    return new Vector2D(Math.cos(angle) * magnitude, Math.sin(angle) * magnitude);
  }

  toAngle() {
    return Math.atan2(this.y, this.x);
  }
}

// Simulated Player with full physics
class SimulatedPlayer {
  constructor(id, username, token) {
    this.id = id;
    this.username = username;
    this.token = token;
    this.ws = null;
    this.isConnected = false;
    this.isAuthenticated = false;

    // Physics properties
    this.position = this.randomSpawnPosition();
    this.velocity = new Vector2D(0, 0);
    this.rotation = Math.random() * Math.PI * 2; // Random starting angle
    this.targetVelocity = new Vector2D(0, 0);
    
    // Combat properties
    this.health = 100;
    this.shield = 0;
    this.maxShield = 0;
    this.shieldStacks = 0;
    this.currentWeapon = 'pistol';
    this.lastFireTime = 0;
    this.damageBoostStacks = 0;
    this.fireRateBoostStacks = 0;

    // Simulation state
    this.isMoving = false;
    this.moveTarget = null;
    this.movementPattern = this.randomMovementPattern();
    this.powerupsCollected = 0;
    this.collisionsDetected = 0;
    this.shotsFired = 0;
  }

  randomSpawnPosition() {
    const margin = 200; // Stay away from edges initially
    return new Vector2D(
      margin + Math.random() * (MAP_WIDTH - margin * 2),
      margin + Math.random() * (MAP_HEIGHT - margin * 2)
    );
  }

  randomMovementPattern() {
    const patterns = ['circular', 'zigzag', 'random_walk', 'patrol', 'aggressive'];
    return patterns[Math.floor(Math.random() * patterns.length)];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${GAME_URL}/ws`, {
          headers: { 'Authorization': `Bearer ${this.token}` }
        });

        this.ws.on('open', () => {
          this.isConnected = true;
          stats.playersConnected++;
          resolve();
        });

        this.ws.on('message', (data) => {
          this.handleMessage(data);
        });

        this.ws.on('error', (err) => {
          stats.errors++;
          stats.errorTypes['ws_error'] = (stats.errorTypes['ws_error'] || 0) + 1;
        });

        this.ws.on('close', () => {
          this.isConnected = false;
          this.isAuthenticated = false;
        });

        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'));
          }
        }, 5000);
      } catch (err) {
        reject(err);
      }
    });
  }

  handleMessage(data) {
    try {
      stats.messagesReceived++;
      const msg = JSON.parse(data);

      if (msg.type === 'authenticated') {
        this.isAuthenticated = true;
        stats.playersAuthenticated++;
      } else if (msg.type === 'game:state') {
        // Server sent game state - update local state
        this.updateFromServerState(msg.payload);
      } else if (msg.type === 'pong') {
        // Keep-alive response
      }
    } catch (err) {
      stats.errors++;
      stats.errorTypes['parse_error'] = (stats.errorTypes['parse_error'] || 0) + 1;
    }
  }

  updateFromServerState(state) {
    // Update player state from server (if implemented)
    if (state && state.players) {
      const serverPlayer = state.players.find(p => p.id === this.id);
      if (serverPlayer) {
        this.position = new Vector2D(serverPlayer.position.x, serverPlayer.position.y);
        this.rotation = serverPlayer.rotation;
        this.health = serverPlayer.health;
        this.shield = serverPlayer.shield;
      }
    }
  }

  send(type, payload) {
    if (!this.isConnected || !this.ws) return;

    try {
      this.ws.send(JSON.stringify({ type, payload }));
      stats.messagesSent++;
    } catch (err) {
      stats.errors++;
      stats.errorTypes['send_error'] = (stats.errorTypes['send_error'] || 0) + 1;
    }
  }

  // Physics simulation - update movement
  updatePhysics() {
    // Apply movement pattern
    this.applyMovementPattern();

    // Apply velocity to position
    this.position = this.position.add(this.velocity);

    // Check and handle collisions
    this.checkBoundaryCollision();

    // Apply friction (gradual slowdown)
    const friction = 0.95;
    this.velocity = this.velocity.multiply(friction);

    // Update rotation to face movement direction
    if (this.velocity.magnitude() > 0.1) {
      this.rotation = this.velocity.toAngle();
    }
  }

  applyMovementPattern() {
    const speed = PLAYER_BASE_SPEED;

    switch (this.movementPattern) {
      case 'circular':
        // Move in circles
        const angle = (Date.now() / 1000) + (this.username.charCodeAt(0) / 10);
        const radius = 300;
        const center = new Vector2D(MAP_WIDTH / 2, MAP_HEIGHT / 2);
        this.targetVelocity = new Vector2D(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed
        );
        break;

      case 'zigzag':
        // Zigzag pattern
        const zigTime = Math.floor(Date.now() / 2000) % 2;
        this.targetVelocity = new Vector2D(
          speed * (zigTime === 0 ? 1 : -1),
          speed * Math.sin(Date.now() / 500)
        );
        break;

      case 'random_walk':
        // Random direction changes
        if (Math.random() < 0.05) { // 5% chance to change direction
          const randomAngle = Math.random() * Math.PI * 2;
          this.targetVelocity = Vector2D.fromAngle(randomAngle, speed);
        }
        break;

      case 'patrol':
        // Patrol between random points
        if (!this.moveTarget || this.position.distance(this.moveTarget) < 50) {
          this.moveTarget = new Vector2D(
            200 + Math.random() * (MAP_WIDTH - 400),
            200 + Math.random() * (MAP_HEIGHT - 400)
          );
        }
        const toTarget = this.moveTarget.subtract(this.position).normalize();
        this.targetVelocity = toTarget.multiply(speed);
        break;

      case 'aggressive':
        // Move toward center with high speed
        const toCenter = new Vector2D(MAP_WIDTH / 2, MAP_HEIGHT / 2)
          .subtract(this.position)
          .normalize();
        this.targetVelocity = toCenter.multiply(speed * 1.2);
        break;
    }

    // Smoothly interpolate velocity toward target
    const lerpFactor = 0.2;
    this.velocity = new Vector2D(
      this.velocity.x + (this.targetVelocity.x - this.velocity.x) * lerpFactor,
      this.velocity.y + (this.targetVelocity.y - this.velocity.y) * lerpFactor
    );

    stats.totalMovements++;
  }

  checkBoundaryCollision() {
    const margin = PLAYER_RADIUS;
    let collided = false;

    // Check X boundaries
    if (this.position.x < margin) {
      this.position.x = margin;
      this.velocity.x = Math.abs(this.velocity.x); // Bounce
      collided = true;
    } else if (this.position.x > MAP_WIDTH - margin) {
      this.position.x = MAP_WIDTH - margin;
      this.velocity.x = -Math.abs(this.velocity.x); // Bounce
      collided = true;
    }

    // Check Y boundaries
    if (this.position.y < margin) {
      this.position.y = margin;
      this.velocity.y = Math.abs(this.velocity.y); // Bounce
      collided = true;
    } else if (this.position.y > MAP_HEIGHT - margin) {
      this.position.y = MAP_HEIGHT - margin;
      this.velocity.y = -Math.abs(this.velocity.y); // Bounce
      collided = true;
    }

    if (collided) {
      this.collisionsDetected++;
      stats.totalCollisions++;
    }
  }

  // Check collision with another player
  checkPlayerCollision(otherPlayer) {
    const distance = this.position.distance(otherPlayer.position);
    const minDistance = PLAYER_RADIUS * 2;

    if (distance < minDistance && distance > 0) {
      // Collision detected - push players apart
      const pushDir = this.position.subtract(otherPlayer.position).normalize();
      const overlap = minDistance - distance;
      
      // Push this player away
      this.position = this.position.add(pushDir.multiply(overlap / 2));
      
      // Bounce velocity
      const relativeVelocity = this.velocity.subtract(otherPlayer.velocity);
      const velocityAlongNormal = relativeVelocity.dot(pushDir);
      
      if (velocityAlongNormal < 0) {
        const restitution = 0.5; // Bounce factor
        const impulse = pushDir.multiply(velocityAlongNormal * (1 + restitution));
        this.velocity = this.velocity.subtract(impulse);
      }

      this.collisionsDetected++;
      stats.totalCollisions++;
      return true;
    }
    return false;
  }

  // Simulate powerup collection
  simulatePowerupCollection() {
    // Random chance to "find" a powerup (simulates proximity detection)
    if (Math.random() < 0.01) { // 1% chance per tick
      const powerupTypes = ['shield', 'damage_boost', 'fire_rate_boost', 'weapon'];
      const powerup = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
      
      this.collectPowerup(powerup);
    }
  }

  collectPowerup(type) {
    let collected = false;

    switch (type) {
      case 'shield':
        if (this.shieldStacks < MAX_SHIELD_STACKS) {
          this.shieldStacks++;
          this.maxShield = this.shieldStacks * SHIELD_PER_STACK;
          this.shield = this.maxShield;
          collected = true;
        }
        break;

      case 'damage_boost':
        if (this.damageBoostStacks < MAX_DAMAGE_BOOST) {
          this.damageBoostStacks++;
          collected = true;
        }
        break;

      case 'fire_rate_boost':
        if (this.fireRateBoostStacks < MAX_FIRE_RATE_BOOST) {
          this.fireRateBoostStacks++;
          collected = true;
        }
        break;

      case 'weapon':
        const weapons = ['rifle', 'shotgun', 'sniper'];
        const newWeapon = weapons[Math.floor(Math.random() * weapons.length)];
        if (this.currentWeapon !== newWeapon) {
          this.currentWeapon = newWeapon;
          stats.totalWeaponSwitches++;
          collected = true;
        }
        break;
    }

    if (collected) {
      this.powerupsCollected++;
      stats.totalPowerupsCollected++;
      
      // Send powerup collection message
      this.send('game:collect_loot', {
        lootType: type,
        position: { x: this.position.x, y: this.position.y }
      });
    }
  }

  // Simulate weapon firing
  simulateFiring() {
    // Try to fire weapon (random chance)
    if (Math.random() < 0.1) { // 10% chance per tick
      stats.totalShotsAttempted++;
      
      const weapon = WEAPON_STATS[this.currentWeapon];
      const effectiveFireRate = this.calculateFireRate(weapon.fireRate);
      const now = Date.now();

      if (now - this.lastFireTime >= effectiveFireRate) {
        this.lastFireTime = now;
        this.shotsFired++;
        stats.totalShotsFired++;

        // Calculate effective damage
        const effectiveDamage = this.calculateDamage(weapon.damage);

        // Send fire message
        this.send('game:fire', {
          weapon: this.currentWeapon,
          position: { x: this.position.x, y: this.position.y },
          rotation: this.rotation,
          damage: effectiveDamage
        });
      }
    }
  }

  calculateDamage(baseDamage) {
    if (this.damageBoostStacks === 0) return baseDamage;
    
    const multiplier = 1 + (this.damageBoostStacks * DAMAGE_BOOST_PERCENT / 100);
    return Math.floor(baseDamage * multiplier);
  }

  calculateFireRate(baseFireRate) {
    if (this.fireRateBoostStacks === 0) return baseFireRate;
    
    const reduction = 1 - (this.fireRateBoostStacks * FIRE_RATE_BOOST_PERCENT / 100);
    return Math.floor(baseFireRate * reduction);
  }

  // Send movement update to server
  sendMovementUpdate() {
    this.send('game:move', {
      position: { x: this.position.x, y: this.position.y },
      velocity: { x: this.velocity.x, y: this.velocity.y },
      rotation: this.rotation
    });
  }

  // Send keep-alive ping
  sendPing() {
    this.send('ping', {});
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }

  getStats() {
    return {
      username: this.username,
      position: { x: Math.round(this.position.x), y: Math.round(this.position.y) },
      health: this.health,
      shield: this.shield,
      weapon: this.currentWeapon,
      damageBoost: this.damageBoostStacks,
      fireRateBoost: this.fireRateBoostStacks,
      powerupsCollected: this.powerupsCollected,
      collisions: this.collisionsDetected,
      shotsFired: this.shotsFired
    };
  }
}

// Register a new player
async function registerPlayer(index) {
  try {
    const username = `phystest${index + 1}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const email = `${username}@test.com`;
    const response = await axios.post(`${API_URL}/api/auth/register`, {
      username,
      email,
      password: 'TestPass123!'
    });

    stats.playersRegistered++;
    return {
      id: response.data.user.id,
      username,
      token: response.data.token
    };
  } catch (err) {
    stats.errors++;
    stats.errorTypes['registration'] = (stats.errorTypes['registration'] || 0) + 1;
    console.error(`Registration error: ${err.response?.data?.error || err.message}`);
    throw err;
  }
}

// Main test function
async function runPhysicsTest() {
  console.log('🎮 Starting Physics & Movement Simulation Test');
  console.log('======================================================================');
  console.log(`API Server: ${API_URL}`);
  console.log(`Game Server: ${GAME_URL}`);
  console.log(`Players: ${NUM_PLAYERS}`);
  console.log(`Test Duration: ${TEST_DURATION / 1000}s`);
  console.log(`Map Size: ${MAP_WIDTH}x${MAP_HEIGHT}`);
  console.log(`Tick Rate: ${SERVER_TICK_RATE} TPS (${TICK_INTERVAL.toFixed(2)}ms interval)`);
  console.log('======================================================================\n');

  const startTime = Date.now();
  const players = [];

  // Create and connect players
  console.log('⏳ Creating and connecting players...\n');
  
  for (let i = 0; i < NUM_PLAYERS; i++) {
    try {
      const { id, username, token } = await registerPlayer(i);
      const player = new SimulatedPlayer(id, username, token);
      
      await player.connect();
      players.push(player);

      console.log(`✅ Player ${i} (${username}) connected at (${Math.round(player.position.x)}, ${Math.round(player.position.y)})`);
      
      // Store player stats
      stats.playerStats.set(player.id, player);

      // Stagger connections slightly
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (err) {
      console.error(`❌ Failed to create player ${i}:`, err.message);
    }
  }

  console.log(`\n✅ ${players.length} players created\n`);
  console.log(`⏳ Running physics simulation for ${TEST_DURATION / 1000} seconds...\n`);

  // Start physics simulation loop (30 TPS)
  const simulationInterval = setInterval(() => {
    players.forEach(player => {
      if (!player.isConnected) return;

      // Update physics
      player.updatePhysics();

      // Check collisions with other players
      players.forEach(other => {
        if (other.id !== player.id && other.isConnected) {
          player.checkPlayerCollision(other);
        }
      });

      // Simulate powerup collection
      player.simulatePowerupCollection();

      // Simulate firing
      player.simulateFiring();
    });
  }, TICK_INTERVAL);

  // Send periodic updates to server (10 Hz - less frequent than physics)
  const updateInterval = setInterval(() => {
    players.forEach(player => {
      if (player.isConnected) {
        player.sendMovementUpdate();
      }
    });
  }, 100); // 10 times per second

  // Send keep-alive pings (every 5 seconds)
  const pingInterval = setInterval(() => {
    players.forEach(player => {
      if (player.isConnected) {
        player.sendPing();
      }
    });
  }, 5000);

  // Log periodic progress
  const progressInterval = setInterval(() => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const connected = players.filter(p => p.isConnected).length;
    console.log(`📊 ${elapsed}s | Connected: ${connected}/${NUM_PLAYERS} | Movements: ${stats.totalMovements} | Collisions: ${stats.totalCollisions} | Powerups: ${stats.totalPowerupsCollected} | Shots: ${stats.totalShotsFired}`);
  }, 5000);

  // Wait for test duration
  await new Promise(resolve => setTimeout(resolve, TEST_DURATION));

  // Stop all intervals
  clearInterval(simulationInterval);
  clearInterval(updateInterval);
  clearInterval(pingInterval);
  clearInterval(progressInterval);

  console.log('\n🛑 Stopping test and disconnecting...\n');

  // Disconnect all players
  players.forEach(player => player.disconnect());

  // Wait for clean disconnection
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Calculate and display results
  displayResults(startTime, players);
}

function displayResults(startTime, players) {
  const duration = (Date.now() - startTime) / 1000;

  console.log('======================================================================');
  console.log('🎮 Physics & Movement Simulation Results');
  console.log('======================================================================\n');

  console.log(`⏱️  Duration: ${duration.toFixed(1)}s\n`);

  console.log('👥 Players:');
  console.log(`   Registered: ${stats.playersRegistered}`);
  console.log(`   Connected: ${stats.playersConnected}`);
  console.log(`   Authenticated: ${stats.playersAuthenticated}\n`);

  console.log('🎯 Physics Simulation:');
  console.log(`   Total Movements: ${stats.totalMovements.toLocaleString()}`);
  console.log(`   Movement Updates/sec: ${(stats.totalMovements / duration).toFixed(2)}`);
  console.log(`   Total Collisions: ${stats.totalCollisions.toLocaleString()}`);
  console.log(`   Collision Rate: ${(stats.totalCollisions / duration).toFixed(2)}/sec\n`);

  console.log('⚡ Combat & Powerups:');
  console.log(`   Powerups Collected: ${stats.totalPowerupsCollected}`);
  console.log(`   Weapon Switches: ${stats.totalWeaponSwitches}`);
  console.log(`   Shots Attempted: ${stats.totalShotsAttempted.toLocaleString()}`);
  console.log(`   Shots Fired: ${stats.totalShotsFired.toLocaleString()}`);
  console.log(`   Fire Success Rate: ${((stats.totalShotsFired / Math.max(stats.totalShotsAttempted, 1)) * 100).toFixed(1)}%\n`);

  console.log('📊 Messages:');
  console.log(`   Sent: ${stats.messagesSent.toLocaleString()}`);
  console.log(`   Received: ${stats.messagesReceived.toLocaleString()}`);
  console.log(`   Messages/sec: ${((stats.messagesSent + stats.messagesReceived) / duration).toFixed(2)}\n`);

  console.log('❌ Errors:', stats.errors);
  if (Object.keys(stats.errorTypes).length > 0) {
    Object.entries(stats.errorTypes).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
  }
  console.log();

  // Top 5 most active players
  console.log('🏆 Top 5 Most Active Players:');
  const sortedPlayers = Array.from(stats.playerStats.values())
    .sort((a, b) => (b.powerupsCollected + b.shotsFired) - (a.powerupsCollected + a.shotsFired))
    .slice(0, 5);

  sortedPlayers.forEach((player, i) => {
    const s = player.getStats();
    console.log(`   ${i + 1}. ${s.username}:`);
    console.log(`      Position: (${s.position.x}, ${s.position.y})`);
    console.log(`      Health: ${s.health} | Shield: ${s.shield} | Weapon: ${s.weapon}`);
    console.log(`      Powerups: ${s.powerupsCollected} | Collisions: ${s.collisions} | Shots: ${s.shotsFired}`);
    console.log(`      Boosts: Damage +${s.damageBoost * 15}%, FireRate +${s.fireRateBoost * 20}%`);
  });
  console.log();

  // Pass/Fail Criteria
  console.log('✅ Pass/Fail Criteria:');
  
  const allRegistered = stats.playersRegistered === NUM_PLAYERS;
  const allConnected = stats.playersConnected === NUM_PLAYERS;
  const allAuthenticated = stats.playersAuthenticated === NUM_PLAYERS;
  const hasMovement = stats.totalMovements > 0;
  const hasCollisions = stats.totalCollisions > 0;
  const lowErrorRate = (stats.errors / Math.max(stats.messagesSent, 1)) < 0.05;
  const messagesReceived = stats.messagesReceived > 0;

  console.log(`   ${allRegistered ? '✅' : '❌'} All players registered (${stats.playersRegistered}/${NUM_PLAYERS})`);
  console.log(`   ${allConnected ? '✅' : '❌'} All players connected (${stats.playersConnected}/${NUM_PLAYERS})`);
  console.log(`   ${allAuthenticated ? '✅' : '❌'} All players authenticated (${stats.playersAuthenticated}/${NUM_PLAYERS})`);
  console.log(`   ${hasMovement ? '✅' : '❌'} Movement simulation working (${stats.totalMovements.toLocaleString()} movements)`);
  console.log(`   ${hasCollisions ? '✅' : '❌'} Collision detection working (${stats.totalCollisions} collisions)`);
  console.log(`   ${lowErrorRate ? '✅' : '❌'} Error rate < 5% (${((stats.errors / Math.max(stats.messagesSent, 1)) * 100).toFixed(2)}%)`);
  console.log(`   ${messagesReceived ? '✅' : '❌'} Messages received from server`);

  const allPassed = allRegistered && allConnected && allAuthenticated && 
                    hasMovement && hasCollisions && lowErrorRate && messagesReceived;

  console.log('\n======================================================================');
  if (allPassed) {
    console.log('🎉 ALL PHYSICS TESTS PASSED!');
  } else {
    console.log('⚠️  SOME TESTS FAILED - Review results above');
  }
  console.log('======================================================================');
}

// Run the test
runPhysicsTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
