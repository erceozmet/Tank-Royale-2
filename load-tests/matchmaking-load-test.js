#!/usr/bin/env node

/**
 * Matchmaking Queue Load Test
 * 
 * Stress tests the matchmaking system:
 * - Queue join/leave operations
 * - Redis performance under load
 * - Matchmaking algorithm speed
 * - Lobby creation
 */

const io = require('socket.io-client');
const axios = require('axios');

// Configuration
const CONFIG = {
  SERVER_URL: process.env.SERVER_URL || 'http://localhost:3000',
  NUM_PLAYERS: parseInt(process.env.NUM_PLAYERS || '1000'),
  JOIN_RATE: parseInt(process.env.JOIN_RATE || '50'), // players per second
  LEAVE_PERCENTAGE: parseInt(process.env.LEAVE_PERCENTAGE || '10'), // % that leave queue
  TEST_DURATION: parseInt(process.env.TEST_DURATION || '120'), // seconds
};

// Test users pool (5 users, will be reused)
const TEST_USERS = [
  { email: 'loadtest1@test.com', password: 'LoadTest123!' },
  { email: 'loadtest2@test.com', password: 'LoadTest123!' },
  { email: 'loadtest3@test.com', password: 'LoadTest123!' },
  { email: 'loadtest4@test.com', password: 'LoadTest123!' },
  { email: 'loadtest5@test.com', password: 'LoadTest123!' },
];

// Metrics
const metrics = {
  playersJoined: 0,
  playersLeft: 0,
  matchesFound: 0,
  errors: 0,
  queueTimes: [],
  joinLatencies: [],
  leaveLatencies: [],
  statusCheckLatencies: [],
  startTime: Date.now(),
};

// Active players
const players = [];

/**
 * Get authentication token for a test user
 */
async function getAuthToken(userIndex) {
  const user = TEST_USERS[userIndex % TEST_USERS.length];
  
  try {
    const response = await axios.post(`${CONFIG.SERVER_URL}/api/auth/login`, {
      usernameOrEmail: user.email,
      password: user.password,
    });
    return response.data.token;
  } catch (error) {
    console.error(`Failed to authenticate user ${user.email}:`, error.message);
    throw error;
  }
}

/**
 * Create a player and connect to matchmaking
 */
async function createPlayer(playerId) {
  return new Promise(async (resolve, reject) => {
    // Get JWT token for this player
    let token;
    try {
      token = await getAuthToken(playerId);
    } catch (error) {
      metrics.errors++;
      reject(error);
      return;
    }
    
    const socket = io(CONFIG.SERVER_URL, {
      auth: { token },
      reconnection: false,
      timeout: 10000,
    });

    const player = {
      id: playerId,
      socket,
      joinTime: null,
      inQueue: false,
    };

    socket.on('connect', () => {
      // Connected successfully
    });

    socket.on('authenticated', () => {
      resolve(player);
    });

    socket.on('connect_error', (error) => {
      metrics.errors++;
      reject(error);
    });

    // Matchmaking events
    socket.on('matchmaking:joined', (data) => {
      player.inQueue = true;
      player.joinTime = Date.now();
      metrics.playersJoined++;
      
      if (metrics.playersJoined % 100 === 0) {
        console.log(`✅ ${metrics.playersJoined} players joined queue`);
      }
    });

    socket.on('matchmaking:left', () => {
      player.inQueue = false;
      metrics.playersLeft++;
      
      if (metrics.playersLeft % 50 === 0) {
        console.log(`⬅️  ${metrics.playersLeft} players left queue`);
      }
    });

    socket.on('matchmaking:match_found', (data) => {
      const queueTime = Date.now() - player.joinTime;
      metrics.queueTimes.push(queueTime);
      metrics.matchesFound++;
      player.inQueue = false;
      
      console.log(`🎮 Match found! Lobby: ${data.lobbyId}, Players: ${data.playerCount}, Queue time: ${queueTime}ms`);
    });

    socket.on('matchmaking:error', (error) => {
      metrics.errors++;
      console.error(`❌ Matchmaking error for player ${playerId}:`, error);
    });

    socket.on('error', (error) => {
      metrics.errors++;
    });
  });
}

/**
 * Player joins matchmaking queue
 */
async function joinQueue(player) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    player.socket.emit('matchmaking:join');
    
    // Wait for confirmation
    const timeout = setTimeout(() => {
      const latency = Date.now() - startTime;
      metrics.joinLatencies.push(latency);
      resolve();
    }, 5000);

    const handler = () => {
      clearTimeout(timeout);
      const latency = Date.now() - startTime;
      metrics.joinLatencies.push(latency);
      player.socket.off('matchmaking:joined', handler);
      resolve();
    };

    player.socket.once('matchmaking:joined', handler);
  });
}

/**
 * Player leaves matchmaking queue
 */
async function leaveQueue(player) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    player.socket.emit('matchmaking:leave');
    
    const timeout = setTimeout(() => {
      const latency = Date.now() - startTime;
      metrics.leaveLatencies.push(latency);
      resolve();
    }, 5000);

    const handler = () => {
      clearTimeout(timeout);
      const latency = Date.now() - startTime;
      metrics.leaveLatencies.push(latency);
      player.socket.off('matchmaking:left', handler);
      resolve();
    };

    player.socket.once('matchmaking:left', handler);
  });
}

/**
 * Check queue status
 */
async function checkStatus(player) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    player.socket.emit('matchmaking:status');
    
    const timeout = setTimeout(() => {
      resolve();
    }, 5000);

    const handler = (status) => {
      clearTimeout(timeout);
      const latency = Date.now() - startTime;
      metrics.statusCheckLatencies.push(latency);
      player.socket.off('matchmaking:status_update', handler);
      resolve(status);
    };

    player.socket.once('matchmaking:status_update', handler);
  });
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
  
  console.log('\n' + '='.repeat(60));
  console.log('🎮 Matchmaking Load Test Results');
  console.log('='.repeat(60));
  console.log(`\n⏱️  Duration: ${duration.toFixed(1)}s`);
  console.log(`\n👥 Queue Operations:`);
  console.log(`   Players Joined: ${metrics.playersJoined}`);
  console.log(`   Players Left: ${metrics.playersLeft}`);
  console.log(`   Matches Found: ${metrics.matchesFound}`);
  console.log(`   Errors: ${metrics.errors}`);
  console.log(`   Currently in Queue: ${metrics.playersJoined - metrics.playersLeft - metrics.matchesFound}`);
  
  if (metrics.joinLatencies.length > 0) {
    console.log(`\n⚡ Join Queue Latency:`);
    console.log(`   Average: ${(metrics.joinLatencies.reduce((a, b) => a + b, 0) / metrics.joinLatencies.length).toFixed(2)}ms`);
    console.log(`   p50: ${percentile(metrics.joinLatencies, 50)}ms`);
    console.log(`   p95: ${percentile(metrics.joinLatencies, 95)}ms`);
    console.log(`   p99: ${percentile(metrics.joinLatencies, 99)}ms`);
  }
  
  if (metrics.queueTimes.length > 0) {
    console.log(`\n⏱️  Time in Queue (until match found):`);
    console.log(`   Samples: ${metrics.queueTimes.length}`);
    console.log(`   Average: ${(metrics.queueTimes.reduce((a, b) => a + b, 0) / metrics.queueTimes.length / 1000).toFixed(2)}s`);
    console.log(`   Min: ${(Math.min(...metrics.queueTimes) / 1000).toFixed(2)}s`);
    console.log(`   Max: ${(Math.max(...metrics.queueTimes) / 1000).toFixed(2)}s`);
    console.log(`   p50: ${(percentile(metrics.queueTimes, 50) / 1000).toFixed(2)}s`);
    console.log(`   p95: ${(percentile(metrics.queueTimes, 95) / 1000).toFixed(2)}s`);
  }
  
  if (metrics.statusCheckLatencies.length > 0) {
    console.log(`\n📊 Status Check Latency:`);
    console.log(`   Average: ${(metrics.statusCheckLatencies.reduce((a, b) => a + b, 0) / metrics.statusCheckLatencies.length).toFixed(2)}ms`);
    console.log(`   p95: ${percentile(metrics.statusCheckLatencies, 95)}ms`);
  }
  
  // Throughput
  console.log(`\n📈 Throughput:`);
  console.log(`   Queue Joins/sec: ${(metrics.playersJoined / duration).toFixed(2)}`);
  console.log(`   Matches/sec: ${(metrics.matchesFound / duration).toFixed(2)}`);
  
  // Pass/Fail
  console.log(`\n✅ Pass/Fail Criteria:`);
  const checks = [
    { name: 'All players joined successfully', pass: metrics.playersJoined === players.length },
    { name: 'p95 Join Latency < 500ms', pass: percentile(metrics.joinLatencies, 95) < 500 },
    { name: 'Error Rate < 1%', pass: (metrics.errors / metrics.playersJoined * 100) < 1 },
    { name: 'At least 1 match created', pass: metrics.matchesFound > 0 },
  ];
  
  let allPassed = true;
  checks.forEach(check => {
    const status = check.pass ? '✅' : '❌';
    console.log(`   ${status} ${check.name}`);
    if (!check.pass) allPassed = false;
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(allPassed ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED');
  console.log('='.repeat(60) + '\n');
  
  return allPassed ? 0 : 1;
}

/**
 * Main test execution
 */
async function runLoadTest() {
  console.log('🎮 Starting Matchmaking Load Test');
  console.log('='.repeat(60));
  console.log(`Server: ${CONFIG.SERVER_URL}`);
  console.log(`Players: ${CONFIG.NUM_PLAYERS}`);
  console.log(`Join Rate: ${CONFIG.JOIN_RATE} players/sec`);
  console.log(`Leave %: ${CONFIG.LEAVE_PERCENTAGE}%`);
  console.log(`Test Duration: ${CONFIG.TEST_DURATION}s`);
  console.log('='.repeat(60) + '\n');

  const delayBetweenJoins = 1000 / CONFIG.JOIN_RATE;

  console.log(`⏳ Creating and connecting players...\n`);

  // Create players
  for (let i = 0; i < CONFIG.NUM_PLAYERS; i++) {
    try {
      const player = await createPlayer(i);
      players.push(player);
      
      if ((i + 1) % 100 === 0) {
        console.log(`🔌 ${i + 1} players connected`);
      }
    } catch (error) {
      console.error(`Failed to create player ${i}:`, error.message);
    }
    
    // Small delay to avoid overwhelming server
    await new Promise(resolve => setTimeout(resolve, 20));
  }

  console.log(`\n✅ ${players.length} players connected\n`);
  console.log(`⏳ Joining matchmaking queue (${CONFIG.JOIN_RATE} players/sec)...\n`);

  // Join queue with controlled rate
  for (const player of players) {
    joinQueue(player);
    await new Promise(resolve => setTimeout(resolve, delayBetweenJoins));
  }

  console.log(`\n✅ All players sent join requests\n`);
  console.log(`⏳ Waiting for matches and queue processing...\n`);

  // Wait for matchmaking to process
  await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds

  // Randomly have some players leave queue
  console.log(`\n⏳ Simulating ${CONFIG.LEAVE_PERCENTAGE}% of players leaving queue...\n`);
  const playersToLeave = Math.floor(players.length * CONFIG.LEAVE_PERCENTAGE / 100);
  for (let i = 0; i < playersToLeave; i++) {
    const randomIndex = Math.floor(Math.random() * players.length);
    const player = players[randomIndex];
    if (player.inQueue) {
      leaveQueue(player);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  // Continue test
  console.log(`\n⏳ Running test for remaining duration...\n`);
  await new Promise(resolve => setTimeout(resolve, CONFIG.TEST_DURATION * 1000 - 30000));

  // Cleanup
  console.log('\n🛑 Stopping test and disconnecting players...\n');
  players.forEach(player => {
    if (player.socket.connected) player.socket.disconnect();
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
    if (player.socket.connected) player.socket.disconnect();
  });
  printMetrics();
  process.exit(1);
});

// Run
runLoadTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
