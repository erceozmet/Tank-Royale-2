#!/usr/bin/env node

/**
 * Setup 1000 Test Users
 * Creates unique test users with varied MMR for realistic matchmaking
 */

const axios = require('axios');

const CONFIG = {
  SERVER_URL: process.env.SERVER_URL || 'http://localhost:3000',
  NUM_USERS: 1000,
  BATCH_SIZE: 50, // Process in batches to avoid overwhelming server
};

// MMR distribution (realistic ELO spread)
const MMR_RANGES = [
  { min: 800, max: 1000, percentage: 0.15 },   // Bronze: 15%
  { min: 1000, max: 1200, percentage: 0.25 },  // Silver: 25%
  { min: 1200, max: 1400, percentage: 0.30 },  // Gold: 30%
  { min: 1400, max: 1600, percentage: 0.20 },  // Platinum: 20%
  { min: 1600, max: 2000, percentage: 0.10 },  // Diamond: 10%
];

/**
 * Generate MMR based on distribution
 */
function generateMMR(index, total) {
  const ratio = index / total;
  let cumulativePercentage = 0;
  
  for (const range of MMR_RANGES) {
    cumulativePercentage += range.percentage;
    if (ratio <= cumulativePercentage) {
      return Math.floor(Math.random() * (range.max - range.min) + range.min);
    }
  }
  
  return 1000; // Default
}

/**
 * Register a test user
 */
async function registerUser(username, email, password) {
  try {
    const response = await axios.post(`${CONFIG.SERVER_URL}/api/auth/register`, {
      username,
      email,
      password,
    });
    return { success: true, data: response.data };
  } catch (error) {
    if (error.response?.status === 409) {
      return { success: false, reason: 'exists' };
    }
    return { success: false, reason: error.message };
  }
}

/**
 * Update user MMR via SQL (faster than API calls)
 */
function generateUpdateScript(users) {
  const updates = users
    .map(u => `UPDATE users SET mmr = ${u.mmr} WHERE username = '${u.username}';`)
    .join('\n');
  
  return `-- Update MMR for 1000 test users
BEGIN;
${updates}
COMMIT;
`;
}

/**
 * Main setup function
 */
async function main() {
  console.log('🚀 Setting up 1000 test users for load testing');
  console.log('============================================================');
  console.log(`Server: ${CONFIG.SERVER_URL}`);
  console.log(`Users to create: ${CONFIG.NUM_USERS}`);
  console.log('============================================================\n');

  // Check server health
  try {
    await axios.get(`${CONFIG.SERVER_URL}/health`);
    console.log('✅ Server is running\n');
  } catch (error) {
    console.error('❌ Server is not responding. Please start the server first.');
    process.exit(1);
  }

  const users = [];
  const stats = {
    created: 0,
    existed: 0,
    failed: 0,
  };

  // Create users in batches
  for (let batch = 0; batch < Math.ceil(CONFIG.NUM_USERS / CONFIG.BATCH_SIZE); batch++) {
    const batchStart = batch * CONFIG.BATCH_SIZE;
    const batchEnd = Math.min(batchStart + CONFIG.BATCH_SIZE, CONFIG.NUM_USERS);
    
    console.log(`📦 Processing batch ${batch + 1}/${Math.ceil(CONFIG.NUM_USERS / CONFIG.BATCH_SIZE)} (users ${batchStart + 1}-${batchEnd})`);
    
    const batchPromises = [];
    
    for (let i = batchStart; i < batchEnd; i++) {
      const userNum = i + 1;
      const username = `loadtest${userNum}`;
      const email = `loadtest${userNum}@test.com`;
      const password = 'TestPassword123!';
      const mmr = generateMMR(i, CONFIG.NUM_USERS);
      
      users.push({ username, email, password, mmr });
      batchPromises.push(registerUser(username, email, password));
    }
    
    const results = await Promise.all(batchPromises);
    
    results.forEach(result => {
      if (result.success) {
        stats.created++;
      } else if (result.reason === 'exists') {
        stats.existed++;
      } else {
        stats.failed++;
      }
    });
    
    console.log(`   ✓ Batch complete - Created: ${stats.created}, Existed: ${stats.existed}, Failed: ${stats.failed}`);
  }

  console.log('\n============================================================');
  console.log('📊 Registration Summary:');
  console.log(`   ✅ Created: ${stats.created}`);
  console.log(`   ℹ️  Already existed: ${stats.existed}`);
  console.log(`   ❌ Failed: ${stats.failed}`);
  console.log('============================================================\n');

  // Generate SQL update script for MMR
  const sqlScript = generateUpdateScript(users);
  const fs = require('fs');
  fs.writeFileSync('/tmp/update-mmr.sql', sqlScript);
  
  console.log('💾 Saved MMR update script to: /tmp/update-mmr.sql');
  console.log('\n📋 To apply MMR distribution, run:');
  console.log('   podman exec -i tank-postgres psql -U tank_user -d tank_royale < /tmp/update-mmr.sql\n');

  // Save user credentials for load tests
  const credentials = users.map(u => ({
    username: u.username,
    email: u.email,
    password: u.password,
    mmr: u.mmr,
  }));
  
  fs.writeFileSync(
    '/tmp/loadtest-credentials.json',
    JSON.stringify(credentials, null, 2)
  );
  
  console.log('💾 Saved user credentials to: /tmp/loadtest-credentials.json');
  console.log('\n✅ Setup complete! You can now run load tests.');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
