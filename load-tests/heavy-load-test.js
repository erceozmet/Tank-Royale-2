#!/usr/bin/env node

/**
 * Heavy Load Test - 1000 Users with MMR-based Matchmaking
 * 
 * Simulates realistic game load:
 * - 1000 concurrent WebSocket connections
 * - MMR-based matchmaking
 * - Periodic queue joins/leaves
 * - Connection stability monitoring
 */

const io = require('socket.io-client');
const axios = require('axios');
const fs = require('fs');

// Configuration
const CONFIG = {
  SERVER_URL: process.env.SERVER_URL || 'http://localhost:3000',
  NUM_CLIENTS: parseInt(process.env.NUM_CLIENTS || '1000'),
  RAMP_UP_TIME: parseInt(process.env.RAMP_UP_TIME || '120'), // 2 minutes
  TEST_DURATION: parseInt(process.env.TEST_DURATION || '300'), // 5 minutes
  MATCHMAKING_INTERVAL: parseInt(process.env.MATCHMAKING_INTERVAL || '10000'), // 10s
  CREDENTIALS_FILE: '/tmp/loadtest-credentials.json',
};

// Load test users
let TEST_USERS = [];
try {
  TEST_USERS = JSON.parse(fs.readFileSync(CONFIG.CREDENTIALS_FILE, 'utf8'));
  console.log(`✅ Loaded ${TEST_USERS.length} test users from ${CONFIG.CREDENTIALS_FILE}`);
} catch (error) {
  console.error(`❌ Failed to load credentials from ${CONFIG.CREDENTIALS_FILE}`);
  console.error('   Run: node setup-1000-users.js first');
  process.exit(1);
}

// Metrics
const metrics = {
  connections: {
    attempted: 0,
    connected: 0,
    authenticated: 0,
    disconnected: 0,
    errors: 0,
  },
  matchmaking: {
    queued: 0,
    matched: 0,
    left: 0,
    errors: 0,
  },
  latency: {
    connectionTimes: [],
    pongTimes: [],
    queueTimes: [],
  },
  startTime: Date.now(),
  errors: [],
};

// Active clients
const clients = new Map();
const matchmakingQueue = new Set();

/**
 * Get authentication token
 */
async function getAuthToken(user) {
  try {
    const response = await axios.post(`${CONFIG.SERVER_URL}/api/auth/login`, {
      usernameOrEmail: user.email,
      password: user.password,
    });
    return response.data.token;
  } catch (error) {
    throw new Error(`Login failed for ${user.email}: ${error.message}`);
  }
}

/**
 * Create and connect a client
 */
async function createClient(user, clientId) {
  return new Promise(async (resolve, reject) => {
    const startTime = Date.now();
    
    // Get JWT token
    let token;
    try {
      token = await getAuthToken(user);
    } catch (error) {
      metrics.connections.errors++;
      metrics.errors.push({ type: 'auth', user: user.username, error: error.message });
      reject(error);
      return;
    }

    // Create socket connection
    const socket = io(CONFIG.SERVER_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
    });

    const clientData = {
      socket,
      user,
      connected: false,
      inQueue: false,
      matchId: null,
      lastPong: Date.now(),
    };

    // Connection event handlers
    socket.on('connect', () => {
      clientData.connected = true;
      metrics.connections.connected++;
      metrics.connections.authenticated++;
      metrics.latency.connectionTimes.push(Date.now() - startTime);
      
      if (clientId % 100 === 0) {
        console.log(`✓ ${metrics.connections.connected} clients connected`);
      }
      
      resolve(clientData);
    });

    socket.on('connect_error', (error) => {
      metrics.connections.errors++;
      metrics.errors.push({ type: 'connect', user: user.username, error: error.message });
      reject(error);
    });

    socket.on('disconnect', () => {
      if (clientData.connected) {
        metrics.connections.disconnected++;
        clientData.connected = false;
      }
    });

    // Matchmaking events
    socket.on('matchmaking:queued', (data) => {
      clientData.inQueue = true;
      metrics.matchmaking.queued++;
      matchmakingQueue.add(user.username);
    });

    socket.on('matchmaking:match_found', (data) => {
      clientData.inQueue = false;
      clientData.matchId = data.matchId;
      metrics.matchmaking.matched++;
      matchmakingQueue.delete(user.username);
      
      if (metrics.matchmaking.matched % 10 === 0) {
        console.log(`🎮 ${metrics.matchmaking.matched} matches found`);
      }
    });

    socket.on('matchmaking:error', (data) => {
      metrics.matchmaking.errors++;
      metrics.errors.push({ type: 'matchmaking', user: user.username, error: data.message });
    });

    // Ping/Pong for latency monitoring
    socket.on('pong', () => {
      const latency = Date.now() - clientData.lastPong;
      metrics.latency.pongTimes.push(latency);
      clientData.lastPong = Date.now();
    });

    metrics.connections.attempted++;
  });
}

/**
 * Ramp up connections gradually
 */
async function rampUpConnections() {
  console.log(`⏳ Ramping up ${CONFIG.NUM_CLIENTS} clients over ${CONFIG.RAMP_UP_TIME}s...\n`);
  
  const delayBetweenClients = (CONFIG.RAMP_UP_TIME * 1000) / CONFIG.NUM_CLIENTS;
  const batchSize = 10; // Connect in batches of 10
  
  for (let i = 0; i < CONFIG.NUM_CLIENTS; i += batchSize) {
    const batchPromises = [];
    
    for (let j = 0; j < batchSize && (i + j) < CONFIG.NUM_CLIENTS; j++) {
      const clientId = i + j;
      const user = TEST_USERS[clientId % TEST_USERS.length];
      
      batchPromises.push(
        createClient(user, clientId)
          .then(clientData => {
            clients.set(user.username, clientData);
          })
          .catch(error => {
            // Error already tracked in metrics
          })
      );
    }
    
    await Promise.all(batchPromises);
    await new Promise(resolve => setTimeout(resolve, delayBetweenClients * batchSize));
  }
  
  console.log(`\n✅ Ramp-up complete: ${clients.size}/${CONFIG.NUM_CLIENTS} clients connected`);
}

/**
 * Simulate matchmaking activity
 */
function simulateMatchmaking() {
  const interval = setInterval(() => {
    // Select random users not in queue
    const availableClients = Array.from(clients.values()).filter(c => c.connected && !c.inQueue);
    
    if (availableClients.length < 2) return;
    
    // Join 20-40 random players to queue
    const numToQueue = Math.floor(Math.random() * 20) + 20;
    const toQueue = availableClients
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(numToQueue, availableClients.length));
    
    toQueue.forEach(client => {
      client.socket.emit('matchmaking:join_queue', { gameMode: 'battle_royale' });
    });
    
    // Occasionally have some players leave queue
    if (Math.random() > 0.7 && matchmakingQueue.size > 10) {
      const inQueue = Array.from(clients.values()).filter(c => c.inQueue);
      const numToLeave = Math.floor(Math.random() * 5) + 1;
      const toLeave = inQueue.slice(0, Math.min(numToLeave, inQueue.length));
      
      toLeave.forEach(client => {
        client.socket.emit('matchmaking:leave_queue');
        client.inQueue = false;
        matchmakingQueue.delete(client.user.username);
        metrics.matchmaking.left++;
      });
    }
  }, CONFIG.MATCHMAKING_INTERVAL);
  
  return interval;
}

/**
 * Send periodic pings for latency monitoring
 */
function startLatencyMonitoring() {
  const interval = setInterval(() => {
    clients.forEach(client => {
      if (client.connected) {
        client.lastPong = Date.now();
        client.socket.emit('ping');
      }
    });
  }, 5000);
  
  return interval;
}

/**
 * Calculate percentiles
 */
function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Display real-time metrics
 */
function displayMetrics() {
  const interval = setInterval(() => {
    const duration = (Date.now() - metrics.startTime) / 1000;
    const connected = metrics.connections.connected - metrics.connections.disconnected;
    
    console.log(`\n📊 Live Metrics (${duration.toFixed(0)}s)`);
    console.log(`   Connections: ${connected}/${CONFIG.NUM_CLIENTS} active`);
    console.log(`   In Queue: ${matchmakingQueue.size}`);
    console.log(`   Matches: ${metrics.matchmaking.matched}`);
    console.log(`   Errors: ${metrics.connections.errors + metrics.matchmaking.errors}`);
  }, 15000);
  
  return interval;
}

/**
 * Generate final report
 */
function generateReport() {
  const duration = (Date.now() - metrics.startTime) / 1000;
  
  console.log('\n\n============================================================');
  console.log('📊 HEAVY LOAD TEST RESULTS - 1000 USERS');
  console.log('============================================================\n');
  
  console.log(`⏱️  Test Duration: ${duration.toFixed(1)}s`);
  console.log(`👥 Target Users: ${CONFIG.NUM_CLIENTS}\n`);
  
  console.log('🔌 Connection Metrics:');
  console.log(`   Attempted: ${metrics.connections.attempted}`);
  console.log(`   Connected: ${metrics.connections.connected}`);
  console.log(`   Authenticated: ${metrics.connections.authenticated}`);
  console.log(`   Disconnected: ${metrics.connections.disconnected}`);
  console.log(`   Active: ${metrics.connections.connected - metrics.connections.disconnected}`);
  console.log(`   Errors: ${metrics.connections.errors}`);
  console.log(`   Success Rate: ${((metrics.connections.connected / metrics.connections.attempted) * 100).toFixed(2)}%\n`);
  
  if (metrics.latency.connectionTimes.length > 0) {
    console.log('⚡ Connection Latency:');
    console.log(`   Min: ${Math.min(...metrics.latency.connectionTimes)}ms`);
    console.log(`   Max: ${Math.max(...metrics.latency.connectionTimes)}ms`);
    console.log(`   Average: ${(metrics.latency.connectionTimes.reduce((a, b) => a + b, 0) / metrics.latency.connectionTimes.length).toFixed(2)}ms`);
    console.log(`   p50: ${percentile(metrics.latency.connectionTimes, 50)}ms`);
    console.log(`   p95: ${percentile(metrics.latency.connectionTimes, 95)}ms`);
    console.log(`   p99: ${percentile(metrics.latency.connectionTimes, 99)}ms\n`);
  }
  
  if (metrics.latency.pongTimes.length > 0) {
    console.log('🏓 Ping/Pong Latency:');
    console.log(`   Samples: ${metrics.latency.pongTimes.length}`);
    console.log(`   Min: ${Math.min(...metrics.latency.pongTimes)}ms`);
    console.log(`   Max: ${Math.max(...metrics.latency.pongTimes)}ms`);
    console.log(`   Average: ${(metrics.latency.pongTimes.reduce((a, b) => a + b, 0) / metrics.latency.pongTimes.length).toFixed(2)}ms`);
    console.log(`   p95: ${percentile(metrics.latency.pongTimes, 95)}ms\n`);
  }
  
  console.log('🎮 Matchmaking Metrics:');
  console.log(`   Queue Joins: ${metrics.matchmaking.queued}`);
  console.log(`   Matches Found: ${metrics.matchmaking.matched}`);
  console.log(`   Queue Leaves: ${metrics.matchmaking.left}`);
  console.log(`   Errors: ${metrics.matchmaking.errors}`);
  console.log(`   Match Success Rate: ${metrics.matchmaking.queued > 0 ? ((metrics.matchmaking.matched / metrics.matchmaking.queued) * 100).toFixed(2) : 0}%\n`);
  
  console.log('📈 Throughput:');
  console.log(`   Connections/sec: ${(metrics.connections.connected / duration).toFixed(2)}`);
  console.log(`   Matches/sec: ${(metrics.matchmaking.matched / duration).toFixed(2)}\n`);
  
  if (metrics.errors.length > 0) {
    console.log('❌ Error Summary:');
    const errorTypes = metrics.errors.reduce((acc, err) => {
      acc[err.type] = (acc[err.type] || 0) + 1;
      return acc;
    }, {});
    Object.entries(errorTypes).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    console.log(`\n   Sample errors (first 5):`);
    metrics.errors.slice(0, 5).forEach(err => {
      console.log(`   - [${err.type}] ${err.user}: ${err.error}`);
    });
    console.log('');
  }
  
  const memUsage = process.memoryUsage();
  console.log('💾 Memory Usage:');
  console.log(`   Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Per Connection: ${((memUsage.heapUsed / 1024) / metrics.connections.connected).toFixed(2)} KB\n`);
  
  console.log('============================================================');
  
  const successRate = (metrics.connections.connected / metrics.connections.attempted) * 100;
  const errorRate = ((metrics.connections.errors + metrics.matchmaking.errors) / 
                     (metrics.connections.attempted + metrics.matchmaking.queued)) * 100;
  
  if (successRate >= 99 && errorRate < 1) {
    console.log('✅ LOAD TEST PASSED');
  } else {
    console.log('⚠️  LOAD TEST COMPLETED WITH WARNINGS');
  }
  console.log('============================================================\n');
  
  // Save detailed results
  const results = {
    duration,
    connections: metrics.connections,
    matchmaking: metrics.matchmaking,
    latency: {
      connection: {
        min: Math.min(...metrics.latency.connectionTimes),
        max: Math.max(...metrics.latency.connectionTimes),
        avg: metrics.latency.connectionTimes.reduce((a, b) => a + b, 0) / metrics.latency.connectionTimes.length,
        p50: percentile(metrics.latency.connectionTimes, 50),
        p95: percentile(metrics.latency.connectionTimes, 95),
        p99: percentile(metrics.latency.connectionTimes, 99),
      },
      pong: {
        samples: metrics.latency.pongTimes.length,
        min: Math.min(...metrics.latency.pongTimes),
        max: Math.max(...metrics.latency.pongTimes),
        avg: metrics.latency.pongTimes.reduce((a, b) => a + b, 0) / metrics.latency.pongTimes.length,
        p95: percentile(metrics.latency.pongTimes, 95),
      },
    },
    memory: memUsage,
    errors: metrics.errors,
  };
  
  fs.writeFileSync('/tmp/heavy-load-test-results.json', JSON.stringify(results, null, 2));
  console.log('💾 Detailed results saved to: /tmp/heavy-load-test-results.json\n');
}

/**
 * Cleanup and disconnect all clients
 */
function cleanup() {
  console.log('\n🛑 Stopping test and disconnecting clients...\n');
  
  clients.forEach(client => {
    if (client.socket && client.connected) {
      client.socket.disconnect();
    }
  });
  
  clients.clear();
}

/**
 * Main test execution
 */
async function main() {
  console.log('🚀 Starting Heavy Load Test - 1000 Users');
  console.log('============================================================');
  console.log(`Server: ${CONFIG.SERVER_URL}`);
  console.log(`Target Clients: ${CONFIG.NUM_CLIENTS}`);
  console.log(`Ramp-up Time: ${CONFIG.RAMP_UP_TIME}s`);
  console.log(`Test Duration: ${CONFIG.TEST_DURATION}s`);
  console.log(`Total Test Time: ~${Math.ceil((CONFIG.RAMP_UP_TIME + CONFIG.TEST_DURATION) / 60)} minutes`);
  console.log('============================================================\n');

  try {
    // Ramp up connections
    await rampUpConnections();
    
    console.log('\n⏳ All clients connected. Starting test activities...\n');
    
    // Start test activities
    const matchmakingInterval = simulateMatchmaking();
    const latencyInterval = startLatencyMonitoring();
    const metricsInterval = displayMetrics();
    
    // Run test for specified duration
    await new Promise(resolve => setTimeout(resolve, CONFIG.TEST_DURATION * 1000));
    
    // Stop activities
    clearInterval(matchmakingInterval);
    clearInterval(latencyInterval);
    clearInterval(metricsInterval);
    
    // Generate report
    generateReport();
    
    // Cleanup
    cleanup();
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    cleanup();
    process.exit(1);
  }
}

// Handle interrupts
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Test interrupted by user');
  generateReport();
  cleanup();
  process.exit(0);
});

main();
