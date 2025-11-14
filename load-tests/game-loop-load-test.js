#!/usr/bin/env node

/**
 * Game Loop Load Test
 * 
 * Simulates real gameplay with the new Go game server:
 * - Player movement and input
 * - Weapon firing (Pistol, Rifle, Shotgun, Sniper)
 * - Loot collection and upgrades
 * - Combat simulation
 * - 30 TPS game state updates
 * - Physics and collision detection
 */

const WebSocket = require('ws');
const axios = require('axios');

// Configuration
const CONFIG = {
  API_URL: process.env.API_URL || 'http://localhost:8080',
  GAME_URL: process.env.GAME_URL || 'ws://localhost:8081',
  NUM_PLAYERS: parseInt(process.env.NUM_PLAYERS || '32'), // 2 full matches
  TEST_DURATION: parseInt(process.env.TEST_DURATION || '180'), // 3 minutes
  MOVEMENT_UPDATE_RATE: 50, // ms (20 updates/sec)
  FIRE_PROBABILITY: 0.3, // 30% chance to fire each update
  LOOT_COLLECT_PROBABILITY: 0.1, // 10% chance to collect loot
};

// Weapon types from Go server
const WEAPONS = {
  PISTOL: 'pistol',
  RIFLE: 'rifle',
  SHOTGUN: 'shotgun',
  SNIPER: 'sniper',
};

// Test users pool
const TEST_USERS = [
  { username: 'loadtest1', email: 'loadtest1@test.com', password: 'TestPassword123!' },
  { username: 'loadtest2', email: 'loadtest2@test.com', password: 'TestPassword123!' },
  { username: 'loadtest3', email: 'loadtest3@test.com', password: 'TestPassword123!' },
  { username: 'loadtest4', email: 'loadtest4@test.com', password: 'TestPassword123!' },
  { username: 'loadtest5', email: 'loadtest5@test.com', password: 'TestPassword123!' },
];

// Metrics
const metrics = {
  playersConnected: 0,
  matchesJoined: 0,
  movementUpdates: 0,
  shotsFired: 0,
  lotsCollected: 0,
  damageDealt: 0,
  deaths: 0,
  gameStateUpdates: 0,
  errors: 0,
  messageLatencies: [],
  gameStateLatencies: [],
  tickRates: [],
  startTime: Date.now(),
  lastTickTime: null,
};

// Active players
const players = [];

/**
 * Register a new test user
 */
async function registerUser(userIndex) {
  const user = TEST_USERS[userIndex % TEST_USERS.length];
  const uniqueEmail = `${user.username}_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`;
  const uniqueUsername = `${user.username}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  try {
    const response = await axios.post(`${CONFIG.API_URL}/api/auth/register`, {
      username: uniqueUsername,
      email: uniqueEmail,
      password: user.password,
    });
    return { token: response.data.token, username: uniqueUsername };
  } catch (error) {
    // Try login if already exists
    try {
      const response = await axios.post(`${CONFIG.API_URL}/api/auth/login`, {
        usernameOrEmail: user.email,
        password: user.password,
      });
      return { token: response.data.token, username: user.username };
    } catch (loginError) {
      console.error(`Failed to authenticate user:`, error.message);
      throw error;
    }
  }
}

/**
 * Create a player and connect to game server
 */
async function createPlayer(playerId) {
  return new Promise(async (resolve, reject) => {
    // Register/authenticate
    let auth;
    try {
      auth = await registerUser(playerId);
      console.log(`✅ Player ${playerId} (${auth.username}) registered`);
    } catch (error) {
      metrics.errors++;
      reject(error);
      return;
    }

    // Connect to game server WebSocket directly (matchmaking happens via WebSocket)
    const ws = new WebSocket(`${CONFIG.GAME_URL}/ws`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    });

    const player = {
      id: playerId,
      username: auth.username,
      token: auth.token,
      ws,
      position: { x: 0, y: 0 },
      rotation: 0,
      velocity: { x: 0, y: 0 },
      health: 100,
      shield: 0,
      weapon: WEAPONS.PISTOL,
      damageBoostStacks: 0,
      fireRateBoostStacks: 0,
      lastFireTime: 0,
      inMatch: false,
      matchId: null,
    };

    // WebSocket event handlers
    ws.on('open', () => {
      metrics.playersConnected++;
      
      // Send authentication
      ws.send(JSON.stringify({
        type: 'auth',
        token: auth.token,
      }));

      if (metrics.playersConnected % 10 === 0) {
        console.log(`🔌 ${metrics.playersConnected} players connected to game server`);
      }
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleGameMessage(player, message);
      } catch (error) {
        console.error(`Error parsing message:`, error);
        metrics.errors++;
      }
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for player ${playerId}:`, error.message);
      metrics.errors++;
    });

    ws.on('close', () => {
      if (player.inMatch) {
        console.log(`⚠️  Player ${playerId} disconnected from match`);
      }
    });

    // Wait for connection
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        resolve(player);
      } else {
        reject(new Error('Failed to connect to game server'));
      }
    }, 3000);
  });
}

/**
 * Handle game messages from server
 */
function handleGameMessage(player, message) {
  const now = Date.now();

  switch (message.type) {
    case 'auth_success':
      console.log(`✅ Player ${player.id} authenticated with game server`);
      break;

    case 'match_joined':
      player.inMatch = true;
      player.matchId = message.matchId;
      metrics.matchesJoined++;
      console.log(`🎮 Player ${player.id} joined match ${message.matchId}`);
      break;

    case 'game_state':
      metrics.gameStateUpdates++;
      
      // Calculate tick rate
      if (metrics.lastTickTime) {
        const tickDelta = now - metrics.lastTickTime;
        metrics.tickRates.push(tickDelta);
      }
      metrics.lastTickTime = now;

      // Update player state from server
      if (message.players && message.players[player.id]) {
        const serverPlayer = message.players[player.id];
        player.position = serverPlayer.position || player.position;
        player.health = serverPlayer.health || player.health;
        player.shield = serverPlayer.shield || player.shield;
      }

      // Track latency if timestamp provided
      if (message.timestamp) {
        const latency = now - message.timestamp;
        metrics.gameStateLatencies.push(latency);
      }
      break;

    case 'player_hit':
      if (message.targetId === player.id) {
        console.log(`💥 Player ${player.id} was hit! Damage: ${message.damage}, Health: ${player.health}`);
      } else if (message.shooterId === player.id) {
        metrics.damageDealt += message.damage;
      }
      break;

    case 'player_died':
      if (message.playerId === player.id) {
        metrics.deaths++;
        console.log(`💀 Player ${player.id} died. Killed by: ${message.killerId}`);
      }
      break;

    case 'loot_collected':
      if (message.playerId === player.id) {
        metrics.lotsCollected++;
        console.log(`📦 Player ${player.id} collected loot: ${message.lootType}`);
        
        // Update player state based on loot
        switch (message.lootType) {
          case 'shield':
            player.shield = Math.min(player.shield + 50, 150);
            break;
          case 'damage_boost':
            player.damageBoostStacks = Math.min(player.damageBoostStacks + 1, 3);
            break;
          case 'fire_rate_boost':
            player.fireRateBoostStacks = Math.min(player.fireRateBoostStacks + 1, 3);
            break;
          case 'rifle':
          case 'shotgun':
          case 'sniper':
            player.weapon = message.lootType;
            break;
        }
      }
      break;

    case 'match_ended':
      player.inMatch = false;
      console.log(`🏁 Match ${message.matchId} ended. Winner: ${message.winnerId}`);
      break;

    case 'error':
      metrics.errors++;
      console.error(`❌ Game error for player ${player.id}:`, message.message);
      break;
  }
}

/**
 * Simulate player movement (random walk)
 */
function simulateMovement(player) {
  if (!player.inMatch || player.ws.readyState !== WebSocket.OPEN) return;

  // Random movement direction
  const angle = Math.random() * Math.PI * 2;
  const speed = 200 + Math.random() * 100; // 200-300 units/sec

  player.velocity = {
    x: Math.cos(angle) * speed,
    y: Math.sin(angle) * speed,
  };
  player.rotation = angle;

  // Send input to server
  const startTime = Date.now();
  player.ws.send(JSON.stringify({
    type: 'player_input',
    input: {
      velocity: player.velocity,
      rotation: player.rotation,
      timestamp: startTime,
    }
  }));

  metrics.movementUpdates++;
}

/**
 * Simulate weapon firing
 */
function simulateFiring(player) {
  if (!player.inMatch || player.ws.readyState !== WebSocket.OPEN) return;
  
  const now = Date.now();
  
  // Check fire rate cooldown
  const fireRates = {
    [WEAPONS.PISTOL]: 500,
    [WEAPONS.RIFLE]: 400,
    [WEAPONS.SHOTGUN]: 800,
    [WEAPONS.SNIPER]: 1200,
  };
  
  const cooldown = fireRates[player.weapon] * Math.pow(0.8, player.fireRateBoostStacks);
  
  if (now - player.lastFireTime < cooldown) return;

  // Random chance to fire
  if (Math.random() > CONFIG.FIRE_PROBABILITY) return;

  // Random target direction
  const targetAngle = Math.random() * Math.PI * 2;
  const targetDistance = 500 + Math.random() * 500;
  
  const targetX = player.position.x + Math.cos(targetAngle) * targetDistance;
  const targetY = player.position.y + Math.sin(targetAngle) * targetDistance;

  player.ws.send(JSON.stringify({
    type: 'player_fire',
    target: { x: targetX, y: targetY },
    timestamp: now,
  }));

  player.lastFireTime = now;
  metrics.shotsFired++;
}

/**
 * Simulate loot collection
 */
function simulateLootCollection(player) {
  if (!player.inMatch || player.ws.readyState !== WebSocket.OPEN) return;
  
  // Random chance to try collecting loot
  if (Math.random() > CONFIG.LOOT_COLLECT_PROBABILITY) return;

  // Random loot position near player
  const lootAngle = Math.random() * Math.PI * 2;
  const lootDistance = Math.random() * 100; // Within 100 units
  
  const lootX = player.position.x + Math.cos(lootAngle) * lootDistance;
  const lootY = player.position.y + Math.sin(lootAngle) * lootDistance;

  player.ws.send(JSON.stringify({
    type: 'collect_loot',
    position: { x: lootX, y: lootY },
    timestamp: Date.now(),
  }));
}

/**
 * Simulate player behavior
 */
function simulatePlayer(player) {
  const interval = setInterval(() => {
    if (!player.inMatch || player.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    simulateMovement(player);
    simulateFiring(player);
    simulateLootCollection(player);
  }, CONFIG.MOVEMENT_UPDATE_RATE);

  return interval;
}

/**
 * Calculate percentile
 */
function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Print metrics
 */
function printMetrics() {
  const duration = (Date.now() - metrics.startTime) / 1000;
  
  console.log('\n' + '='.repeat(70));
  console.log('🎮 Game Loop Load Test Results');
  console.log('='.repeat(70));
  console.log(`\n⏱️  Duration: ${duration.toFixed(1)}s`);
  
  console.log(`\n👥 Players:`);
  console.log(`   Connected: ${metrics.playersConnected}`);
  console.log(`   Matches Joined: ${metrics.matchesJoined}`);
  console.log(`   Deaths: ${metrics.deaths}`);
  
  console.log(`\n🎯 Game Actions:`);
  console.log(`   Movement Updates: ${metrics.movementUpdates}`);
  console.log(`   Shots Fired: ${metrics.shotsFired}`);
  console.log(`   Loot Collected: ${metrics.lotsCollected}`);
  console.log(`   Damage Dealt: ${metrics.damageDealt}`);
  
  console.log(`\n📊 Server Performance:`);
  console.log(`   Game State Updates Received: ${metrics.gameStateUpdates}`);
  console.log(`   Updates/sec: ${(metrics.gameStateUpdates / duration).toFixed(2)}`);
  
  if (metrics.tickRates.length > 0) {
    const avgTickRate = metrics.tickRates.reduce((a, b) => a + b, 0) / metrics.tickRates.length;
    const tps = 1000 / avgTickRate;
    console.log(`   Average Tick Rate: ${tps.toFixed(2)} TPS (target: 30 TPS)`);
    console.log(`   Tick Interval: ${avgTickRate.toFixed(2)}ms (target: 33.33ms)`);
    console.log(`   Min Tick Interval: ${Math.min(...metrics.tickRates)}ms`);
    console.log(`   Max Tick Interval: ${Math.max(...metrics.tickRates)}ms`);
  }
  
  if (metrics.gameStateLatencies.length > 0) {
    console.log(`\n⚡ Network Latency:`);
    console.log(`   Samples: ${metrics.gameStateLatencies.length}`);
    console.log(`   Average: ${(metrics.gameStateLatencies.reduce((a, b) => a + b, 0) / metrics.gameStateLatencies.length).toFixed(2)}ms`);
    console.log(`   p50: ${percentile(metrics.gameStateLatencies, 50)}ms`);
    console.log(`   p95: ${percentile(metrics.gameStateLatencies, 95)}ms`);
    console.log(`   p99: ${percentile(metrics.gameStateLatencies, 99)}ms`);
  }
  
  console.log(`\n📈 Throughput:`);
  console.log(`   Movement Updates/sec: ${(metrics.movementUpdates / duration).toFixed(2)}`);
  console.log(`   Shots/sec: ${(metrics.shotsFired / duration).toFixed(2)}`);
  console.log(`   Total Messages/sec: ${((metrics.movementUpdates + metrics.shotsFired + metrics.lotsCollected) / duration).toFixed(2)}`);
  
  console.log(`\n❌ Errors: ${metrics.errors}`);
  
  // Pass/Fail criteria
  console.log(`\n✅ Pass/Fail Criteria:`);
  const avgTickRate = metrics.tickRates.length > 0 
    ? metrics.tickRates.reduce((a, b) => a + b, 0) / metrics.tickRates.length 
    : 0;
  const tps = avgTickRate > 0 ? 1000 / avgTickRate : 0;
  
  const checks = [
    { name: 'All players connected', pass: metrics.playersConnected >= CONFIG.NUM_PLAYERS * 0.95 },
    { name: 'At least 1 match joined', pass: metrics.matchesJoined > 0 },
    { name: 'Game state updates received', pass: metrics.gameStateUpdates > 100 },
    { name: 'Server tick rate ~30 TPS', pass: tps >= 25 && tps <= 35 },
    { name: 'p95 latency < 100ms', pass: percentile(metrics.gameStateLatencies, 95) < 100 },
    { name: 'Error rate < 5%', pass: metrics.errors < (metrics.movementUpdates + metrics.shotsFired) * 0.05 },
    { name: 'Player actions processed', pass: metrics.movementUpdates > 100 && metrics.shotsFired > 10 },
  ];
  
  let allPassed = true;
  checks.forEach(check => {
    const status = check.pass ? '✅' : '❌';
    console.log(`   ${status} ${check.name}`);
    if (!check.pass) allPassed = false;
  });
  
  console.log('\n' + '='.repeat(70));
  console.log(allPassed ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED');
  console.log('='.repeat(70) + '\n');
  
  return allPassed ? 0 : 1;
}

/**
 * Main test execution
 */
async function runLoadTest() {
  console.log('🎮 Starting Game Loop Load Test');
  console.log('='.repeat(70));
  console.log(`API Server: ${CONFIG.API_URL}`);
  console.log(`Game Server: ${CONFIG.GAME_URL}`);
  console.log(`Players: ${CONFIG.NUM_PLAYERS}`);
  console.log(`Test Duration: ${CONFIG.TEST_DURATION}s`);
  console.log(`Movement Update Rate: ${CONFIG.MOVEMENT_UPDATE_RATE}ms`);
  console.log('='.repeat(70) + '\n');

  console.log(`⏳ Creating players and joining matches...\n`);

  // Create players with staggered connections
  const playerPromises = [];
  for (let i = 0; i < CONFIG.NUM_PLAYERS; i++) {
    playerPromises.push(
      createPlayer(i).catch(error => {
        console.error(`Failed to create player ${i}:`, error.message);
        return null;
      })
    );
    
    // Stagger connections
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Wait for all players
  const createdPlayers = (await Promise.all(playerPromises)).filter(p => p !== null);
  players.push(...createdPlayers);

  console.log(`\n✅ ${players.length} players ready\n`);
  console.log(`🎮 Starting gameplay simulation...\n`);

  // Start simulating all players
  const intervals = players.map(player => simulatePlayer(player));

  // Run test for configured duration
  await new Promise(resolve => setTimeout(resolve, CONFIG.TEST_DURATION * 1000));

  // Cleanup
  console.log('\n🛑 Stopping test...\n');
  intervals.forEach(interval => clearInterval(interval));
  players.forEach(player => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.close();
    }
  });

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Print results
  const exitCode = printMetrics();
  process.exit(exitCode);
}

// Handle interruption
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Test interrupted by user');
  players.forEach(player => {
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      player.ws.close();
    }
  });
  printMetrics();
  process.exit(1);
});

// Run
runLoadTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
