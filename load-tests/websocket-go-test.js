#!/usr/bin/env node

/**
 * WebSocket Connection Test for Go Game Server
 * 
 * Tests basic WebSocket connectivity and authentication
 */

const WebSocket = require('ws');
const axios = require('axios');

// Configuration
const CONFIG = {
  API_URL: process.env.API_URL || 'http://localhost:8080',
  GAME_URL: process.env.GAME_URL || 'ws://localhost:8081',
  NUM_PLAYERS: parseInt(process.env.NUM_PLAYERS || '16'),
  TEST_DURATION: parseInt(process.env.TEST_DURATION || '60'), // seconds
};

// Test users
const TEST_USERS = [
  { username: 'loadtest1', email: 'loadtest1@test.com', password: 'TestPassword123!' },
  { username: 'loadtest2', email: 'loadtest2@test.com', password: 'TestPassword123!' },
  { username: 'loadtest3', email: 'loadtest3@test.com', password: 'TestPassword123!' },
  { username: 'loadtest4', email: 'loadtest4@test.com', password: 'TestPassword123!' },
  { username: 'loadtest5', email: 'loadtest5@test.com', password: 'TestPassword123!' },
];

// Metrics
const metrics = {
  playersRegistered: 0,
  playersConnected: 0,
  playersAuthenticated: 0,
  messagesReceived: 0,
  messagesSent: 0,
  errors: 0,
  connectionTimes: [],
  startTime: Date.now(),
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
    metrics.playersRegistered++;
    return { token: response.data.token, username: uniqueUsername };
  } catch (error) {
    console.error(`Failed to register user:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Create a player and connect to game server
 */
async function createPlayer(playerId) {
  return new Promise(async (resolve, reject) => {
    const startTime = Date.now();
    
    // Register
    let auth;
    try {
      auth = await registerUser(playerId);
    } catch (error) {
      metrics.errors++;
      reject(error);
      return;
    }

    // Connect to game server WebSocket
    const ws = new WebSocket(`${CONFIG.GAME_URL}/ws`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    });

    const player = {
      id: playerId,
      username: auth.username,
      token: auth.token,
      ws,
      authenticated: false,
    };

    // WebSocket event handlers
    ws.on('open', () => {
      const connectionTime = Date.now() - startTime;
      metrics.connectionTimes.push(connectionTime);
      metrics.playersConnected++;
      
      if (metrics.playersConnected % 5 === 0) {
        console.log(`🔌 ${metrics.playersConnected} players connected`);
      }
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        metrics.messagesReceived++;
        
        if (message.type === 'authenticated') {
          player.authenticated = true;
          metrics.playersAuthenticated++;
          console.log(`✅ Player ${playerId} (${auth.username}) authenticated`);
        }
        
        if (player.authenticated && message.type !== 'authenticated') {
          console.log(`📨 Player ${playerId} received: ${message.type}`);
        }
      } catch (error) {
        console.error(`Error parsing message:`, error);
        metrics.errors++;
      }
    });

    ws.on('error', (error) => {
      console.error(`❌ WebSocket error for player ${playerId}:`, error.message);
      metrics.errors++;
    });

    ws.on('close', () => {
      console.log(`⚠️  Player ${playerId} disconnected`);
    });

    // Wait for connection
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        resolve(player);
      } else {
        reject(new Error('Failed to connect to game server'));
      }
    }, 2000);
  });
}

/**
 * Send periodic ping to keep connection alive
 */
function startPinging(player) {
  const interval = setInterval(() => {
    if (player.ws.readyState === WebSocket.OPEN && player.authenticated) {
      const pingMsg = JSON.stringify({
        type: 'ping',
        timestamp: Date.now(),
      });
      player.ws.send(pingMsg);
      metrics.messagesSent++;
    } else {
      clearInterval(interval);
    }
  }, 5000);
  
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
  console.log('🎮 WebSocket Connection Test Results');
  console.log('='.repeat(70));
  console.log(`\n⏱️  Duration: ${duration.toFixed(1)}s`);
  
  console.log(`\n👥 Players:`);
  console.log(`   Registered: ${metrics.playersRegistered}`);
  console.log(`   Connected: ${metrics.playersConnected}`);
  console.log(`   Authenticated: ${metrics.playersAuthenticated}`);
  
  console.log(`\n📊 Messages:`);
  console.log(`   Sent: ${metrics.messagesSent}`);
  console.log(`   Received: ${metrics.messagesReceived}`);
  console.log(`   Messages/sec: ${(metrics.messagesReceived / duration).toFixed(2)}`);
  
  if (metrics.connectionTimes.length > 0) {
    console.log(`\n⚡ Connection Times:`);
    console.log(`   Average: ${(metrics.connectionTimes.reduce((a, b) => a + b, 0) / metrics.connectionTimes.length).toFixed(2)}ms`);
    console.log(`   Min: ${Math.min(...metrics.connectionTimes)}ms`);
    console.log(`   Max: ${Math.max(...metrics.connectionTimes)}ms`);
    console.log(`   p50: ${percentile(metrics.connectionTimes, 50)}ms`);
    console.log(`   p95: ${percentile(metrics.connectionTimes, 95)}ms`);
    console.log(`   p99: ${percentile(metrics.connectionTimes, 99)}ms`);
  }
  
  console.log(`\n❌ Errors: ${metrics.errors}`);
  
  // Pass/Fail criteria
  console.log(`\n✅ Pass/Fail Criteria:`);
  const successRate = (metrics.playersAuthenticated / CONFIG.NUM_PLAYERS * 100);
  const checks = [
    { name: `All players registered (${metrics.playersRegistered}/${CONFIG.NUM_PLAYERS})`, pass: metrics.playersRegistered >= CONFIG.NUM_PLAYERS * 0.95 },
    { name: `All players connected (${metrics.playersConnected}/${CONFIG.NUM_PLAYERS})`, pass: metrics.playersConnected >= CONFIG.NUM_PLAYERS * 0.95 },
    { name: `All players authenticated (${metrics.playersAuthenticated}/${CONFIG.NUM_PLAYERS})`, pass: metrics.playersAuthenticated >= CONFIG.NUM_PLAYERS * 0.95 },
    { name: 'p95 connection time < 200ms', pass: percentile(metrics.connectionTimes, 95) < 200 },
    { name: 'Error rate < 5%', pass: metrics.errors < CONFIG.NUM_PLAYERS * 0.05 },
    { name: 'Messages received', pass: metrics.messagesReceived > 0 },
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
  console.log('🎮 Starting WebSocket Connection Test');
  console.log('='.repeat(70));
  console.log(`API Server: ${CONFIG.API_URL}`);
  console.log(`Game Server: ${CONFIG.GAME_URL}`);
  console.log(`Players: ${CONFIG.NUM_PLAYERS}`);
  console.log(`Test Duration: ${CONFIG.TEST_DURATION}s`);
  console.log('='.repeat(70) + '\n');

  console.log(`⏳ Creating and connecting players...\n`);

  // Create players with staggered connections
  for (let i = 0; i < CONFIG.NUM_PLAYERS; i++) {
    try {
      const player = await createPlayer(i);
      players.push(player);
      
      // Start pinging to keep connection alive
      player.pingInterval = startPinging(player);
    } catch (error) {
      console.error(`Failed to create player ${i}:`, error.message);
    }
    
    // Stagger connections
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n✅ ${players.length} players created\n`);
  console.log(`⏳ Running for ${CONFIG.TEST_DURATION} seconds...\n`);

  // Run test for configured duration
  await new Promise(resolve => setTimeout(resolve, CONFIG.TEST_DURATION * 1000));

  // Cleanup
  console.log('\n🛑 Stopping test and disconnecting...\n');
  players.forEach(player => {
    if (player.pingInterval) clearInterval(player.pingInterval);
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
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
