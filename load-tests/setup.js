#!/usr/bin/env node

/**
 * Setup Script for Load Testing
 * 
 * Creates test users and prepares the database for load testing
 */

const axios = require('axios');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const NUM_TEST_USERS = 5;

const TEST_USERS = [
  { username: 'loadtest1', email: 'loadtest1@test.com', password: 'TestPassword123!' },
  { username: 'loadtest2', email: 'loadtest2@test.com', password: 'TestPassword123!' },
  { username: 'loadtest3', email: 'loadtest3@test.com', password: 'TestPassword123!' },
  { username: 'loadtest4', email: 'loadtest4@test.com', password: 'TestPassword123!' },
  { username: 'loadtest5', email: 'loadtest5@test.com', password: 'TestPassword123!' },
];

async function createTestUser(user) {
  try {
    const response = await axios.post(`${SERVER_URL}/api/auth/register`, user);
    console.log(`✅ Created user: ${user.username}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 409) {
      console.log(`ℹ️  User already exists: ${user.username}`);
    } else {
      console.error(`❌ Failed to create user ${user.username}:`, error.message);
    }
  }
}

async function setup() {
  console.log('🚀 Setting up load test environment');
  console.log('='.repeat(60));
  console.log(`Server: ${SERVER_URL}`);
  console.log(`Creating ${NUM_TEST_USERS} test users...\n`);

  // Check server health
  try {
    await axios.get(`${SERVER_URL}/health`);
    console.log('✅ Server is running\n');
  } catch (error) {
    console.error('❌ Server is not running! Start it with: npm run dev');
    process.exit(1);
  }

  // Create test users
  for (const user of TEST_USERS) {
    await createTestUser(user);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Setup complete! You can now run load tests.');
  console.log('='.repeat(60));
  console.log('\nAvailable commands:');
  console.log('  npm run load-test:api         - Test REST API endpoints');
  console.log('  npm run load-test:websocket   - Test WebSocket connections');
  console.log('  npm run load-test:matchmaking - Test matchmaking queue');
  console.log('  npm run load-test:all         - Run all tests\n');
}

setup().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
