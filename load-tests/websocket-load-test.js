#!/usr/bin/env node

/**
 * WebSocket Load Test
 * 
 * Tests Socket.IO connection capacity and performance:
 * - Concurrent connections
 * - Authentication throughput
 * - Memory usage
 * - Connection stability
 */

const io = require('socket.io-client');
const axios = require('axios');

// Configuration
const CONFIG = {
  SERVER_URL: process.env.SERVER_URL || 'http://localhost:3000',
  NUM_CLIENTS: parseInt(process.env.NUM_CLIENTS || '500'),
  RAMP_UP_TIME: parseInt(process.env.RAMP_UP_TIME || '60'), // seconds
  TEST_DURATION: parseInt(process.env.TEST_DURATION || '300'), // seconds (5 min)
  PING_INTERVAL: parseInt(process.env.PING_INTERVAL || '5000'), // ms
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
  connected: 0,
  disconnected: 0,
  authenticated: 0,
  errors: 0,
  connectionTimes: [],
  pongLatencies: [],
  startTime: Date.now(),
};

// Active clients
const clients = [];

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
 * Create a Socket.IO client and connect
 */
async function createClient(clientId) {
  return new Promise(async (resolve, reject) => {
    const startTime = Date.now();
    
    // Get JWT token for this client
    let token;
    try {
      token = await getAuthToken(clientId);
    } catch (error) {
      metrics.errors++;
      reject(error);
      return;
    }
    
    // Create socket connection
    const socket = io(CONFIG.SERVER_URL, {
      auth: { token },
      reconnection: false,
      timeout: 10000,
    });

    // Connection success
    socket.on('connect', () => {
      const connectionTime = Date.now() - startTime;
      metrics.connected++;
      metrics.connectionTimes.push(connectionTime);
      
      if (metrics.connected % 50 === 0) {
        console.log(`✅ ${metrics.connected} clients connected`);
      }
    });

    // Authentication success
    socket.on('authenticated', (data) => {
      metrics.authenticated++;
      resolve({ socket, clientId });
    });

    // Connection error
    socket.on('connect_error', (error) => {
      metrics.errors++;
      console.error(`❌ Client ${clientId} connect error:`, error.message);
      reject(error);
    });

    // Disconnect
    socket.on('disconnect', (reason) => {
      metrics.disconnected++;
      if (metrics.disconnected % 50 === 0) {
        console.log(`⚠️  ${metrics.disconnected} clients disconnected`);
      }
    });

    // Pong response (for latency measurement)
    socket.on('pong', (data) => {
      const latency = Date.now() - data.timestamp;
      metrics.pongLatencies.push(latency);
    });

    // General error
    socket.on('error', (error) => {
      metrics.errors++;
      console.error(`❌ Client ${clientId} error:`, error);
    });
  });
}

/**
 * Send periodic pings to measure latency
 */
function startPinging(client) {
  const interval = setInterval(() => {
    if (client.socket.connected) {
      client.socket.emit('ping');
    } else {
      clearInterval(interval);
    }
  }, CONFIG.PING_INTERVAL);
  
  return interval;
}

/**
 * Calculate percentile from array
 */
function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Print metrics summary
 */
function printMetrics() {
  const duration = (Date.now() - metrics.startTime) / 1000;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 WebSocket Load Test Results');
  console.log('='.repeat(60));
  console.log(`\n⏱️  Duration: ${duration.toFixed(1)}s`);
  console.log(`\n👥 Connections:`);
  console.log(`   Total Attempted: ${CONFIG.NUM_CLIENTS}`);
  console.log(`   Successfully Connected: ${metrics.connected}`);
  console.log(`   Authenticated: ${metrics.authenticated}`);
  console.log(`   Disconnected: ${metrics.disconnected}`);
  console.log(`   Errors: ${metrics.errors}`);
  console.log(`   Currently Active: ${metrics.connected - metrics.disconnected}`);
  
  if (metrics.connectionTimes.length > 0) {
    console.log(`\n⚡ Connection Times:`);
    console.log(`   Min: ${Math.min(...metrics.connectionTimes)}ms`);
    console.log(`   Max: ${Math.max(...metrics.connectionTimes)}ms`);
    console.log(`   Average: ${(metrics.connectionTimes.reduce((a, b) => a + b, 0) / metrics.connectionTimes.length).toFixed(2)}ms`);
    console.log(`   p50: ${percentile(metrics.connectionTimes, 50)}ms`);
    console.log(`   p95: ${percentile(metrics.connectionTimes, 95)}ms`);
    console.log(`   p99: ${percentile(metrics.connectionTimes, 99)}ms`);
  }
  
  if (metrics.pongLatencies.length > 0) {
    console.log(`\n🏓 Ping/Pong Latency:`);
    console.log(`   Samples: ${metrics.pongLatencies.length}`);
    console.log(`   Min: ${Math.min(...metrics.pongLatencies)}ms`);
    console.log(`   Max: ${Math.max(...metrics.pongLatencies)}ms`);
    console.log(`   Average: ${(metrics.pongLatencies.reduce((a, b) => a + b, 0) / metrics.pongLatencies.length).toFixed(2)}ms`);
    console.log(`   p95: ${percentile(metrics.pongLatencies, 95)}ms`);
    console.log(`   p99: ${percentile(metrics.pongLatencies, 99)}ms`);
  }
  
  // Memory usage
  const memUsage = process.memoryUsage();
  console.log(`\n💾 Memory Usage:`);
  console.log(`   Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Per Connection: ${(memUsage.heapUsed / metrics.connected / 1024).toFixed(2)} KB`);
  
  // Success rate
  const successRate = (metrics.authenticated / CONFIG.NUM_CLIENTS * 100).toFixed(2);
  const errorRate = (metrics.errors / CONFIG.NUM_CLIENTS * 100).toFixed(2);
  
  console.log(`\n📈 Success Metrics:`);
  console.log(`   Success Rate: ${successRate}%`);
  console.log(`   Error Rate: ${errorRate}%`);
  
  // Pass/Fail criteria
  console.log(`\n✅ Pass/Fail Criteria:`);
  const p95ConnectionTime = percentile(metrics.connectionTimes, 95);
  const p95Latency = percentile(metrics.pongLatencies, 95);
  
  const checks = [
    { name: 'Connection Success Rate > 99%', pass: parseFloat(successRate) > 99 },
    { name: 'p95 Connection Time < 200ms', pass: p95ConnectionTime < 200 },
    { name: 'p95 Latency < 100ms', pass: p95Latency < 100 },
    { name: 'Error Rate < 1%', pass: parseFloat(errorRate) < 1 },
    { name: 'No disconnects', pass: metrics.disconnected === 0 },
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
  console.log('🚀 Starting WebSocket Load Test');
  console.log('='.repeat(60));
  console.log(`Server: ${CONFIG.SERVER_URL}`);
  console.log(`Clients: ${CONFIG.NUM_CLIENTS}`);
  console.log(`Ramp-up Time: ${CONFIG.RAMP_UP_TIME}s`);
  console.log(`Test Duration: ${CONFIG.TEST_DURATION}s`);
  console.log('='.repeat(60) + '\n');

  // Calculate ramp-up delay
  const delayBetweenClients = (CONFIG.RAMP_UP_TIME * 1000) / CONFIG.NUM_CLIENTS;

  console.log(`⏳ Connecting clients (${delayBetweenClients.toFixed(0)}ms between each)...\n`);

  // Connect clients with ramp-up
  for (let i = 0; i < CONFIG.NUM_CLIENTS; i++) {
    createClient(i)
      .then(client => {
        clients.push(client);
        // Start pinging
        client.pingInterval = startPinging(client);
      })
      .catch(error => {
        // Error already logged
      });

    // Wait before next client
    await new Promise(resolve => setTimeout(resolve, delayBetweenClients));
  }

  // Wait for all connections to settle
  console.log(`\n⏳ All clients connecting... waiting for connections to stabilize...\n`);
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Run test for configured duration
  console.log(`⏳ Running load test for ${CONFIG.TEST_DURATION}s...\n`);
  await new Promise(resolve => setTimeout(resolve, CONFIG.TEST_DURATION * 1000));

  // Cleanup
  console.log('\n🛑 Stopping test and disconnecting clients...\n');
  clients.forEach(client => {
    if (client.pingInterval) clearInterval(client.pingInterval);
    if (client.socket.connected) client.socket.disconnect();
  });

  // Wait for disconnects
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Print results
  const exitCode = printMetrics();
  
  process.exit(exitCode);
}

// Handle interruption
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Test interrupted by user');
  clients.forEach(client => {
    if (client.socket.connected) client.socket.disconnect();
  });
  printMetrics();
  process.exit(1);
});

// Run the test
runLoadTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
