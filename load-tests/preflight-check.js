#!/usr/bin/env node

/**
 * Pre-flight check script
 * Verifies that all services are ready before running load tests
 */

const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

const CONFIG = {
  API_URL: process.env.API_URL || 'http://localhost:8080',
  GAME_URL: process.env.GAME_URL || 'http://localhost:8081',
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: process.env.REDIS_PORT || '6379',
  POSTGRES_HOST: process.env.POSTGRES_HOST || 'localhost',
  POSTGRES_PORT: process.env.POSTGRES_PORT || '5432',
};

const checks = [];

/**
 * Check if API server is healthy
 */
async function checkAPIServer() {
  try {
    const response = await axios.get(`${CONFIG.API_URL}/health`, { timeout: 5000 });
    if (response.data.status === 'healthy') {
      return { success: true, message: 'API server is healthy' };
    }
    return { success: false, message: `API server unhealthy: ${JSON.stringify(response.data)}` };
  } catch (error) {
    return { success: false, message: `API server not reachable: ${error.message}` };
  }
}

/**
 * Check if Game server is healthy
 */
async function checkGameServer() {
  try {
    const response = await axios.get(`${CONFIG.GAME_URL}/health`, { timeout: 5000 });
    if (response.data.status === 'healthy') {
      return { success: true, message: 'Game server is healthy' };
    }
    return { success: false, message: `Game server unhealthy: ${JSON.stringify(response.data)}` };
  } catch (error) {
    return { success: false, message: `Game server not reachable: ${error.message}` };
  }
}

/**
 * Check if Redis is reachable
 */
async function checkRedis() {
  try {
    const { stdout } = await execPromise(`redis-cli -h ${CONFIG.REDIS_HOST} -p ${CONFIG.REDIS_PORT} PING`);
    if (stdout.trim() === 'PONG') {
      return { success: true, message: 'Redis is reachable' };
    }
    return { success: false, message: `Redis returned: ${stdout}` };
  } catch (error) {
    return { success: false, message: `Redis not reachable: ${error.message}` };
  }
}

/**
 * Check if PostgreSQL is reachable
 */
async function checkPostgres() {
  try {
    const { stdout } = await execPromise(
      `pg_isready -h ${CONFIG.POSTGRES_HOST} -p ${CONFIG.POSTGRES_PORT}`
    );
    if (stdout.includes('accepting connections')) {
      return { success: true, message: 'PostgreSQL is accepting connections' };
    }
    return { success: false, message: `PostgreSQL: ${stdout}` };
  } catch (error) {
    return { success: false, message: `PostgreSQL not reachable: ${error.message}` };
  }
}

/**
 * Check if dependencies are installed
 */
async function checkDependencies() {
  try {
    const { stdout } = await execPromise('npm list --depth=0');
    const hasDeps = stdout.includes('axios') && stdout.includes('ws');
    if (hasDeps) {
      return { success: true, message: 'All npm dependencies installed' };
    }
    return { success: false, message: 'Missing dependencies. Run: npm install' };
  } catch (error) {
    return { success: false, message: 'Dependencies not installed. Run: npm install' };
  }
}

/**
 * Check if servers have expected endpoints
 */
async function checkEndpoints() {
  const endpoints = [
    { url: `${CONFIG.API_URL}/api/auth/login`, method: 'POST' },
    { url: `${CONFIG.API_URL}/api/matchmaking/join`, method: 'POST' },
    { url: `${CONFIG.GAME_URL}/metrics`, method: 'GET' },
  ];

  const results = [];
  for (const endpoint of endpoints) {
    try {
      if (endpoint.method === 'GET') {
        await axios.get(endpoint.url, { timeout: 3000 });
        results.push(`${endpoint.url} ✅`);
      } else {
        // Just check if endpoint exists (expect 4xx, not 404)
        try {
          await axios.post(endpoint.url, {}, { timeout: 3000 });
        } catch (error) {
          if (error.response && error.response.status !== 404) {
            results.push(`${endpoint.url} ✅`);
          } else {
            results.push(`${endpoint.url} ❌`);
          }
        }
      }
    } catch (error) {
      if (error.response && error.response.status !== 404) {
        results.push(`${endpoint.url} ✅`);
      } else {
        results.push(`${endpoint.url} ❌`);
      }
    }
  }

  const allOk = results.every(r => r.includes('✅'));
  return {
    success: allOk,
    message: allOk ? 'All endpoints available' : `Some endpoints missing:\n   ${results.join('\n   ')}`
  };
}

/**
 * Get system info
 */
async function getSystemInfo() {
  try {
    const { stdout: cpuInfo } = await execPromise('nproc');
    const { stdout: memInfo } = await execPromise('free -h | grep Mem');
    const memMatch = memInfo.match(/Mem:\s+(\S+)\s+(\S+)\s+(\S+)/);
    
    return {
      cpus: cpuInfo.trim(),
      memory: memMatch ? {
        total: memMatch[1],
        used: memMatch[2],
        available: memMatch[3]
      } : 'Unknown'
    };
  } catch (error) {
    return { cpus: 'Unknown', memory: 'Unknown' };
  }
}

/**
 * Run all checks
 */
async function runChecks() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 Pre-flight Checks for Load Testing');
  console.log('='.repeat(70) + '\n');

  console.log('📊 Configuration:');
  console.log(`   API Server:    ${CONFIG.API_URL}`);
  console.log(`   Game Server:   ${CONFIG.GAME_URL}`);
  console.log(`   Redis:         ${CONFIG.REDIS_HOST}:${CONFIG.REDIS_PORT}`);
  console.log(`   PostgreSQL:    ${CONFIG.POSTGRES_HOST}:${CONFIG.POSTGRES_PORT}`);
  console.log('');

  // Get system info
  console.log('💻 System Information:');
  const sysInfo = await getSystemInfo();
  console.log(`   CPU Cores:     ${sysInfo.cpus}`);
  if (typeof sysInfo.memory === 'object') {
    console.log(`   Memory Total:  ${sysInfo.memory.total}`);
    console.log(`   Memory Used:   ${sysInfo.memory.used}`);
    console.log(`   Memory Free:   ${sysInfo.memory.available}`);
  }
  console.log('');

  console.log('🔧 Running checks...\n');

  // Run checks
  const checkFunctions = [
    { name: 'Dependencies', fn: checkDependencies },
    { name: 'API Server', fn: checkAPIServer },
    { name: 'Game Server', fn: checkGameServer },
    { name: 'Redis', fn: checkRedis },
    { name: 'PostgreSQL', fn: checkPostgres },
    { name: 'Endpoints', fn: checkEndpoints },
  ];

  const results = [];
  for (const check of checkFunctions) {
    process.stdout.write(`   ${check.name}... `);
    const result = await check.fn();
    results.push(result);
    
    const status = result.success ? '✅' : '❌';
    console.log(status);
    
    if (!result.success) {
      console.log(`      └─ ${result.message}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  
  const allPassed = results.every(r => r.success);
  
  if (allPassed) {
    console.log('✅ All checks passed! Ready to run load tests.');
    console.log('\nSuggested commands:');
    console.log('   npm run test:game-quick      # Quick game loop test (16 players, 60s)');
    console.log('   npm run test:gameloop        # Full game loop test (32 players, 3 min)');
    console.log('   npm run test:websocket       # WebSocket connection test');
    console.log('   npm run test:matchmaking     # Matchmaking queue test');
    console.log('   npm run test:all             # Run all tests');
  } else {
    console.log('❌ Some checks failed. Please fix the issues before running load tests.');
    console.log('\nCommon fixes:');
    console.log('   1. Start services:     cd .. && make start');
    console.log('   2. Check status:       cd .. && make status');
    console.log('   3. View logs:          cd .. && make go-logs-api');
    console.log('   4. Install deps:       npm install');
    console.log('   5. Check health:       curl http://localhost:8080/health');
  }
  
  console.log('='.repeat(70) + '\n');
  
  return allPassed ? 0 : 1;
}

// Run checks
runChecks()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('\n❌ Fatal error during checks:', error.message);
    process.exit(1);
  });
