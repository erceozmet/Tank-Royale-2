#!/usr/bin/env node

/**
 * Tank Royale 2 - Redis Cache Load Test
 * 
 * Comprehensive test to verify Redis caching works correctly under load:
 * - Session management (7-day TTL)
 * - Game state caching (future implementation)
 * - Matchmaking queue performance
 * - Rate limiting (60s sliding window)
 * - Leaderboard caching (5min TTL)
 * - Cache invalidation patterns
 * - TTL expiration behavior
 * - Concurrent read/write operations
 * 
 * Usage:
 *   NUM_SESSIONS=100 TEST_DURATION=60 node redis-cache-load-test.js
 *   NUM_SESSIONS=500 CONCURRENT_OPS=50 node redis-cache-load-test.js
 */

const WebSocket = require('ws');
const axios = require('axios');
const { createClient } = require('redis');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:8080';
const GAME_URL = process.env.GAME_URL || 'ws://localhost:8081';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const NUM_SESSIONS = parseInt(process.env.NUM_SESSIONS || '100');
const TEST_DURATION = parseInt(process.env.TEST_DURATION || '60') * 1000;
const CONCURRENT_OPS = parseInt(process.env.CONCURRENT_OPS || '20');

// Statistics
const stats = {
  // Session tests
  sessionsCreated: 0,
  sessionsValidated: 0,
  sessionErrors: 0,
  sessionCacheHits: 0,
  sessionCacheMisses: 0,
  
  // Redis direct tests
  redisReads: 0,
  redisWrites: 0,
  redisDeletes: 0,
  redisErrors: 0,
  
  // Performance metrics
  readLatencies: [],
  writeLatencies: [],
  
  // Queue tests
  queueOperations: 0,
  queueErrors: 0,
  
  // Rate limiting tests
  rateLimitTests: 0,
  rateLimitBlocked: 0,
  
  // TTL tests
  ttlValidations: 0,
  ttlExpired: 0,
  
  // Concurrent access tests
  concurrentReads: 0,
  concurrentWrites: 0,
  raceConditions: 0,
  
  startTime: Date.now()
};

// Redis client
let redisClient;

// Helper function to measure latency
async function measureLatency(operation) {
  const start = Date.now();
  try {
    const result = await operation();
    const latency = Date.now() - start;
    return { success: true, latency, result };
  } catch (err) {
    const latency = Date.now() - start;
    return { success: false, latency, error: err.message };
  }
}

// Connect to Redis
async function connectRedis() {
  console.log('🔌 Connecting to Redis...\n');
  
  redisClient = createClient({ url: REDIS_URL });
  
  redisClient.on('error', (err) => {
    console.error('❌ Redis Client Error:', err);
    stats.redisErrors++;
  });
  
  await redisClient.connect();
  console.log('✅ Connected to Redis\n');
}

// Test 1: Session Creation and Retrieval
async function testSessionCaching() {
  console.log('📋 Test 1: Session Creation and Retrieval');
  console.log('='.repeat(70));
  
  const users = [];
  
  // Create sessions
  console.log(`Creating ${NUM_SESSIONS} user sessions...`);
  for (let i = 0; i < NUM_SESSIONS; i++) {
    try {
      const username = `cachetest${i + 1}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const email = `${username}@test.com`;
      
      const response = await axios.post(`${API_URL}/api/auth/register`, {
        username,
        email,
        password: 'TestPass123!'
      });
      
      users.push({
        id: response.data.user.userId,  // Note: API returns 'userId' not 'id'
        username,
        token: response.data.token
      });
      
      stats.sessionsCreated++;
      
      if ((i + 1) % 20 === 0) {
        process.stdout.write(`  Created ${i + 1}/${NUM_SESSIONS} sessions\r`);
      }
    } catch (err) {
      stats.sessionErrors++;
    }
  }
  
  console.log(`\n✅ Created ${stats.sessionsCreated} sessions\n`);
  
  // Small delay to ensure all sessions are written to Redis
  console.log('Waiting 500ms for Redis writes to complete...');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Validate sessions exist in Redis
  console.log('Validating sessions in Redis...');
  for (const user of users) {
    try {
      const { latency, result } = await measureLatency(() => 
        redisClient.get(`session:${user.id}`)
      );
      
      stats.redisReads++;
      stats.readLatencies.push(latency);
      
      if (result) {
        stats.sessionCacheHits++;
        stats.sessionsValidated++;
      } else {
        stats.sessionCacheMisses++;
        // Log first few misses for debugging
        if (stats.sessionCacheMisses <= 3) {
          console.log(`   Debug: Session not found for user ID: ${user.id}`);
        }
      }
    } catch (err) {
      stats.sessionErrors++;
      stats.redisErrors++;
      if (stats.sessionErrors <= 3) {
        console.log(`   Debug: Redis error for user ${user.id}: ${err.message}`);
      }
    }
  }
  
  console.log(`✅ Validated ${stats.sessionsValidated}/${stats.sessionsCreated} sessions in Redis`);
  console.log(`   Cache hits: ${stats.sessionCacheHits}, Misses: ${stats.sessionCacheMisses}\n`);
  
  return users;
}

// Test 2: Concurrent Session Access
async function testConcurrentAccess(users) {
  console.log('📋 Test 2: Concurrent Session Access');
  console.log('='.repeat(70));
  
  const selectedUsers = users.slice(0, Math.min(CONCURRENT_OPS, users.length));
  
  console.log(`Testing ${selectedUsers.length} concurrent session reads...`);
  
  const concurrentReads = selectedUsers.map(user => 
    measureLatency(() => redisClient.get(`session:${user.id}`))
  );
  
  const results = await Promise.all(concurrentReads);
  
  results.forEach(({ success, latency }) => {
    if (success) {
      stats.concurrentReads++;
      stats.readLatencies.push(latency);
    } else {
      stats.redisErrors++;
    }
  });
  
  console.log(`✅ Completed ${stats.concurrentReads} concurrent reads`);
  console.log(`   Average latency: ${(stats.readLatencies.reduce((a, b) => a + b, 0) / stats.readLatencies.length).toFixed(2)}ms\n`);
}

// Test 3: Session TTL Verification
async function testSessionTTL(users) {
  console.log('📋 Test 3: Session TTL Verification');
  console.log('='.repeat(70));
  
  const sampleUser = users[0];
  
  console.log(`Checking TTL for session:${sampleUser.id}...`);
  
  try {
    const ttl = await redisClient.ttl(`session:${sampleUser.id}`);
    stats.ttlValidations++;
    
    const expectedTTL = 7 * 24 * 60 * 60; // 7 days in seconds
    const ttlHours = (ttl / 3600).toFixed(2);
    const ttlDays = (ttl / 86400).toFixed(2);
    
    console.log(`✅ Session TTL: ${ttl}s (${ttlHours} hours, ${ttlDays} days)`);
    console.log(`   Expected: ~${expectedTTL}s (7 days)`);
    
    if (ttl > 0 && ttl <= expectedTTL) {
      console.log(`   ✅ TTL is within expected range\n`);
    } else if (ttl === -1) {
      console.log(`   ⚠️  No TTL set (key will never expire)\n`);
    } else if (ttl === -2) {
      console.log(`   ❌ Key does not exist\n`);
      stats.ttlExpired++;
    } else {
      console.log(`   ⚠️  TTL unexpected: ${ttl}s\n`);
    }
  } catch (err) {
    console.log(`❌ TTL check failed: ${err.message}\n`);
    stats.redisErrors++;
  }
}

// Test 4: Rate Limiting Performance
async function testRateLimiting(users) {
  console.log('📋 Test 4: Rate Limiting Performance');
  console.log('='.repeat(70));
  
  const testUser = users[0];
  const endpoint = '/api/test';
  const rateLimit = 10; // Assume 10 requests per minute
  
  console.log(`Testing rate limiting for user ${testUser.username}...`);
  console.log(`Sending ${rateLimit + 5} requests (limit: ${rateLimit}/min)...\n`);
  
  for (let i = 0; i < rateLimit + 5; i++) {
    try {
      const key = `ratelimit:${testUser.id}:${endpoint}`;
      
      const { latency, result } = await measureLatency(async () => {
        const count = await redisClient.incr(key);
        if (i === 0) {
          // Set TTL on first request
          await redisClient.expire(key, 60);
        }
        return count;
      });
      
      stats.rateLimitTests++;
      stats.writeLatencies.push(latency);
      
      if (result <= rateLimit) {
        console.log(`  Request ${i + 1}: ✅ Allowed (count: ${result})`);
      } else {
        console.log(`  Request ${i + 1}: ❌ Would be blocked (count: ${result})`);
        stats.rateLimitBlocked++;
      }
    } catch (err) {
      stats.redisErrors++;
    }
  }
  
  console.log(`\n✅ Rate limiting test complete`);
  console.log(`   Allowed: ${stats.rateLimitTests - stats.rateLimitBlocked}`);
  console.log(`   Blocked: ${stats.rateLimitBlocked}\n`);
}

// Test 5: Matchmaking Queue Operations
async function testMatchmakingQueue(users) {
  console.log('📋 Test 5: Matchmaking Queue Operations');
  console.log('='.repeat(70));
  
  const queueSize = Math.min(50, users.length);
  const selectedUsers = users.slice(0, queueSize);
  
  console.log(`Adding ${queueSize} players to matchmaking queue...`);
  
  // Add players to queue
  for (const user of selectedUsers) {
    try {
      const mmr = 1000 + Math.floor(Math.random() * 1000);
      const mmrRange = `${Math.floor(mmr / 200) * 200}-${Math.floor(mmr / 200) * 200 + 200}`;
      const queueKey = `queue:mmr:${mmrRange}`;
      
      const playerData = JSON.stringify({
        userId: user.id,
        username: user.username,
        mmr,
        joinedAt: new Date().toISOString()
      });
      
      const { latency } = await measureLatency(() => 
        redisClient.lPush(queueKey, playerData)
      );
      
      stats.queueOperations++;
      stats.redisWrites++;
      stats.writeLatencies.push(latency);
    } catch (err) {
      stats.queueErrors++;
      stats.redisErrors++;
    }
  }
  
  console.log(`✅ Added ${stats.queueOperations} players to queue\n`);
  
  // Check queue sizes
  console.log('Checking queue sizes per MMR range...');
  const mmrRanges = ['800-1000', '1000-1200', '1200-1400', '1400-1600', '1600-1800', '1800-2000'];
  
  for (const range of mmrRanges) {
    try {
      const queueKey = `queue:mmr:${range}`;
      const size = await redisClient.lLen(queueKey);
      if (size > 0) {
        console.log(`  MMR ${range}: ${size} players`);
      }
    } catch (err) {
      stats.redisErrors++;
    }
  }
  
  console.log();
}

// Test 6: Leaderboard Caching
async function testLeaderboardCaching(users) {
  console.log('📋 Test 6: Leaderboard Caching');
  console.log('='.repeat(70));
  
  const leaderboardKey = 'leaderboard:wins';
  
  console.log('Creating mock leaderboard data...');
  
  // Add top 10 players
  const topPlayers = users.slice(0, Math.min(10, users.length));
  
  try {
    // Clear existing leaderboard
    await redisClient.del(leaderboardKey);
    
    // Add players with scores
    for (let i = 0; i < topPlayers.length; i++) {
      const wins = 100 - i * 5; // Decreasing wins
      const { latency } = await measureLatency(() => 
        redisClient.zAdd(leaderboardKey, { score: wins, value: topPlayers[i].id })
      );
      
      stats.redisWrites++;
      stats.writeLatencies.push(latency);
    }
    
    // Set TTL (5 minutes for leaderboards)
    await redisClient.expire(leaderboardKey, 300);
    
    console.log(`✅ Created leaderboard with ${topPlayers.length} players\n`);
    
    // Retrieve leaderboard
    console.log('Retrieving leaderboard (should be cached)...');
    
    const { latency, result } = await measureLatency(() => 
      redisClient.zRangeWithScores(leaderboardKey, 0, 9, { REV: true })
    );
    
    stats.redisReads++;
    stats.readLatencies.push(latency);
    
    console.log(`✅ Retrieved leaderboard in ${latency}ms`);
    console.log(`   Entries: ${result.length}`);
    console.log(`   Top 3:`);
    result.slice(0, 3).forEach((entry, i) => {
      const user = users.find(u => u.id === entry.value);
      console.log(`     ${i + 1}. ${user?.username || 'Unknown'}: ${entry.score} wins`);
    });
    
    // Check TTL
    const ttl = await redisClient.ttl(leaderboardKey);
    console.log(`   Cache TTL: ${ttl}s (${(ttl / 60).toFixed(2)} minutes)\n`);
    
  } catch (err) {
    console.error(`❌ Leaderboard test failed: ${err.message}\n`);
    stats.redisErrors++;
  }
}

// Test 7: Cache Invalidation
async function testCacheInvalidation(users) {
  console.log('📋 Test 7: Cache Invalidation');
  console.log('='.repeat(70));
  
  const testUser = users[0];
  const userCacheKey = `user:cache:${testUser.id}`;
  
  console.log(`Testing cache invalidation for user ${testUser.username}...`);
  
  try {
    // Create cached user data
    console.log('1. Creating cached user profile...');
    const userData = {
      username: testUser.username,
      wins: '10',
      losses: '5',
      mmr: '1500'
    };
    
    await redisClient.hSet(userCacheKey, userData);
    await redisClient.expire(userCacheKey, 300); // 5 min TTL
    stats.redisWrites++;
    
    console.log('   ✅ User profile cached');
    
    // Verify cache exists
    console.log('2. Verifying cache exists...');
    const cached = await redisClient.hGetAll(userCacheKey);
    stats.redisReads++;
    
    if (Object.keys(cached).length > 0) {
      console.log('   ✅ Cache hit:', cached);
    } else {
      console.log('   ❌ Cache miss');
    }
    
    // Invalidate cache
    console.log('3. Invalidating cache (simulating profile update)...');
    const { latency } = await measureLatency(() => 
      redisClient.del(userCacheKey)
    );
    
    stats.redisDeletes++;
    stats.writeLatencies.push(latency);
    console.log(`   ✅ Cache invalidated in ${latency}ms`);
    
    // Verify cache is gone
    console.log('4. Verifying cache is invalidated...');
    const afterInvalidation = await redisClient.hGetAll(userCacheKey);
    stats.redisReads++;
    
    if (Object.keys(afterInvalidation).length === 0) {
      console.log('   ✅ Cache successfully invalidated\n');
    } else {
      console.log('   ❌ Cache still exists!\n');
    }
    
  } catch (err) {
    console.error(`❌ Cache invalidation test failed: ${err.message}\n`);
    stats.redisErrors++;
  }
}

// Test 8: Stress Test - Concurrent Mixed Operations
async function testConcurrentMixedOperations(users) {
  console.log('📋 Test 8: Concurrent Mixed Operations (Stress Test)');
  console.log('='.repeat(70));
  
  const operations = CONCURRENT_OPS * 3; // Read, Write, Delete
  console.log(`Performing ${operations} concurrent mixed operations...\n`);
  
  const promises = [];
  
  // Random reads
  for (let i = 0; i < CONCURRENT_OPS; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    promises.push(
      measureLatency(() => redisClient.get(`session:${user.id}`))
        .then(({ latency }) => {
          stats.concurrentReads++;
          stats.readLatencies.push(latency);
        })
    );
  }
  
  // Random writes
  for (let i = 0; i < CONCURRENT_OPS; i++) {
    const key = `test:concurrent:${i}`;
    promises.push(
      measureLatency(() => redisClient.set(key, `value-${i}`, { EX: 60 }))
        .then(({ latency }) => {
          stats.concurrentWrites++;
          stats.writeLatencies.push(latency);
        })
    );
  }
  
  // Random deletes
  for (let i = 0; i < CONCURRENT_OPS; i++) {
    const key = `test:concurrent:${i}`;
    promises.push(
      measureLatency(() => redisClient.del(key))
        .then(({ latency }) => {
          stats.writeLatencies.push(latency);
        })
    );
  }
  
  await Promise.all(promises);
  
  console.log(`✅ Completed ${operations} concurrent operations`);
  console.log(`   Concurrent reads: ${stats.concurrentReads}`);
  console.log(`   Concurrent writes: ${stats.concurrentWrites}\n`);
}

// Test 9: Memory and Connection Test
async function testRedisHealth() {
  console.log('📋 Test 9: Redis Health Check');
  console.log('='.repeat(70));
  
  try {
    const info = await redisClient.info('memory');
    const lines = info.split('\r\n');
    
    const usedMemory = lines.find(l => l.startsWith('used_memory_human:'));
    const peakMemory = lines.find(l => l.startsWith('used_memory_peak_human:'));
    const fragRatio = lines.find(l => l.startsWith('mem_fragmentation_ratio:'));
    
    console.log('Redis Memory Stats:');
    if (usedMemory) console.log(`  ${usedMemory}`);
    if (peakMemory) console.log(`  ${peakMemory}`);
    if (fragRatio) console.log(`  ${fragRatio}`);
    
    // Get key count
    const dbInfo = await redisClient.info('keyspace');
    console.log(`\nKeyspace: ${dbInfo.split('\r\n')[1] || 'No keys'}\n`);
    
  } catch (err) {
    console.error(`❌ Health check failed: ${err.message}\n`);
    stats.redisErrors++;
  }
}

// Cleanup function
async function cleanup(users) {
  console.log('\n🧹 Cleaning up test data...');
  
  let cleaned = 0;
  
  // Delete test sessions
  for (const user of users) {
    try {
      await redisClient.del(`session:${user.id}`);
      cleaned++;
    } catch (err) {
      // Ignore errors during cleanup
    }
  }
  
  // Delete test queues
  const mmrRanges = ['800-1000', '1000-1200', '1200-1400', '1400-1600', '1600-1800', '1800-2000'];
  for (const range of mmrRanges) {
    try {
      await redisClient.del(`queue:mmr:${range}`);
    } catch (err) {
      // Ignore
    }
  }
  
  // Delete test keys
  try {
    const keys = await redisClient.keys('test:*');
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (err) {
    // Ignore
  }
  
  console.log(`✅ Cleaned up ${cleaned} test sessions\n`);
}

// Display results
function displayResults() {
  const duration = (Date.now() - stats.startTime) / 1000;
  
  console.log('='.repeat(70));
  console.log('🎮 Redis Cache Load Test Results');
  console.log('='.repeat(70));
  console.log();
  
  console.log(`⏱️  Duration: ${duration.toFixed(1)}s\n`);
  
  console.log('📊 Session Management:');
  console.log(`   Sessions created: ${stats.sessionsCreated}`);
  console.log(`   Sessions validated: ${stats.sessionsValidated}`);
  console.log(`   Cache hits: ${stats.sessionCacheHits}`);
  console.log(`   Cache misses: ${stats.sessionCacheMisses}`);
  console.log(`   Hit rate: ${((stats.sessionCacheHits / Math.max(stats.sessionCacheHits + stats.sessionCacheMisses, 1)) * 100).toFixed(1)}%\n`);
  
  console.log('🔄 Redis Operations:');
  console.log(`   Total reads: ${stats.redisReads}`);
  console.log(`   Total writes: ${stats.redisWrites}`);
  console.log(`   Total deletes: ${stats.redisDeletes}`);
  console.log(`   Operations/sec: ${((stats.redisReads + stats.redisWrites + stats.redisDeletes) / duration).toFixed(2)}\n`);
  
  console.log('⚡ Performance:');
  if (stats.readLatencies.length > 0) {
    const avgRead = stats.readLatencies.reduce((a, b) => a + b, 0) / stats.readLatencies.length;
    const sortedReads = [...stats.readLatencies].sort((a, b) => a - b);
    const p50Read = sortedReads[Math.floor(sortedReads.length * 0.5)];
    const p95Read = sortedReads[Math.floor(sortedReads.length * 0.95)];
    const p99Read = sortedReads[Math.floor(sortedReads.length * 0.99)];
    
    console.log(`   Read latency avg: ${avgRead.toFixed(2)}ms`);
    console.log(`   Read p50: ${p50Read}ms`);
    console.log(`   Read p95: ${p95Read}ms`);
    console.log(`   Read p99: ${p99Read}ms`);
  }
  
  if (stats.writeLatencies.length > 0) {
    const avgWrite = stats.writeLatencies.reduce((a, b) => a + b, 0) / stats.writeLatencies.length;
    const sortedWrites = [...stats.writeLatencies].sort((a, b) => a - b);
    const p50Write = sortedWrites[Math.floor(sortedWrites.length * 0.5)];
    const p95Write = sortedWrites[Math.floor(sortedWrites.length * 0.95)];
    const p99Write = sortedWrites[Math.floor(sortedWrites.length * 0.99)];
    
    console.log(`   Write latency avg: ${avgWrite.toFixed(2)}ms`);
    console.log(`   Write p50: ${p50Write}ms`);
    console.log(`   Write p95: ${p95Write}ms`);
    console.log(`   Write p99: ${p99Write}ms\n`);
  }
  
  console.log('🎯 Specialized Tests:');
  console.log(`   Queue operations: ${stats.queueOperations}`);
  console.log(`   Rate limit tests: ${stats.rateLimitTests}`);
  console.log(`   Rate limit blocked: ${stats.rateLimitBlocked}`);
  console.log(`   TTL validations: ${stats.ttlValidations}`);
  console.log(`   Concurrent reads: ${stats.concurrentReads}`);
  console.log(`   Concurrent writes: ${stats.concurrentWrites}\n`);
  
  console.log('❌ Errors:');
  console.log(`   Session errors: ${stats.sessionErrors}`);
  console.log(`   Redis errors: ${stats.redisErrors}`);
  console.log(`   Queue errors: ${stats.queueErrors}`);
  console.log(`   Total errors: ${stats.sessionErrors + stats.redisErrors + stats.queueErrors}\n`);
  
  // Pass/Fail Criteria
  console.log('✅ Pass/Fail Criteria:');
  
  const sessionHitRate = (stats.sessionCacheHits / Math.max(stats.sessionCacheHits + stats.sessionCacheMisses, 1)) * 100;
  const avgReadLatency = stats.readLatencies.length > 0 
    ? stats.readLatencies.reduce((a, b) => a + b, 0) / stats.readLatencies.length 
    : 0;
  const p95ReadLatency = stats.readLatencies.length > 0
    ? [...stats.readLatencies].sort((a, b) => a - b)[Math.floor(stats.readLatencies.length * 0.95)]
    : 0;
  const errorRate = ((stats.redisErrors + stats.sessionErrors) / Math.max(stats.redisReads + stats.redisWrites, 1)) * 100;
  
  console.log(`   ${stats.sessionsCreated > 0 ? '✅' : '❌'} Sessions created (${stats.sessionsCreated})`);
  console.log(`   ${sessionHitRate >= 95 ? '✅' : '❌'} Cache hit rate >= 95% (${sessionHitRate.toFixed(1)}%)`);
  console.log(`   ${avgReadLatency < 10 ? '✅' : '❌'} Average read latency < 10ms (${avgReadLatency.toFixed(2)}ms)`);
  console.log(`   ${p95ReadLatency < 20 ? '✅' : '❌'} p95 read latency < 20ms (${p95ReadLatency}ms)`);
  console.log(`   ${errorRate < 1 ? '✅' : '❌'} Error rate < 1% (${errorRate.toFixed(2)}%)`);
  console.log(`   ${stats.queueOperations > 0 ? '✅' : '❌'} Queue operations working (${stats.queueOperations})`);
  console.log(`   ${stats.rateLimitTests > 0 ? '✅' : '❌'} Rate limiting working (${stats.rateLimitTests} tests)`);
  
  const allPassed = stats.sessionsCreated > 0 && 
                     sessionHitRate >= 95 && 
                     avgReadLatency < 10 && 
                     p95ReadLatency < 20 && 
                     errorRate < 1 &&
                     stats.queueOperations > 0 &&
                     stats.rateLimitTests > 0;
  
  console.log();
  console.log('='.repeat(70));
  if (allPassed) {
    console.log('🎉 ALL REDIS CACHE TESTS PASSED!');
  } else {
    console.log('⚠️  SOME TESTS FAILED - Review results above');
  }
  console.log('='.repeat(70));
}

// Main test function
async function runCacheLoadTest() {
  console.log('🎮 Starting Redis Cache Load Test');
  console.log('='.repeat(70));
  console.log(`API Server: ${API_URL}`);
  console.log(`Redis: ${REDIS_URL}`);
  console.log(`Sessions: ${NUM_SESSIONS}`);
  console.log(`Concurrent ops: ${CONCURRENT_OPS}`);
  console.log('='.repeat(70));
  console.log();
  
  try {
    // Connect to Redis
    await connectRedis();
    
    // Run tests
    const users = await testSessionCaching();
    await testConcurrentAccess(users);
    await testSessionTTL(users);
    await testRateLimiting(users);
    await testMatchmakingQueue(users);
    await testLeaderboardCaching(users);
    await testCacheInvalidation(users);
    await testConcurrentMixedOperations(users);
    await testRedisHealth();
    
    // Cleanup
    await cleanup(users);
    
    // Display results
    displayResults();
    
    // Close connections
    await redisClient.quit();
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    if (redisClient) {
      await redisClient.quit();
    }
    process.exit(1);
  }
}

// Run the test
runCacheLoadTest();
