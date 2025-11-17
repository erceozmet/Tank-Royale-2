const http = require('http');

const API_URL = 'http://localhost:8080/api/auth';
const TEST_USERNAME = `testuser_${Date.now()}`;
const TEST_EMAIL = `${TEST_USERNAME}@test.com`;
const TEST_PASSWORD = 'TestPass123!';

console.log('🧪 Testing Sign In Flow');
console.log('======================\n');

async function testSignInFlow() {
  try {
    // Step 1: Register a new user
    console.log('📝 Step 1: Registering new user...');
    const registerToken = await makeRequest('register', {
      username: TEST_USERNAME,
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    console.log(`   ✅ Registration successful!`);
    console.log(`   Username: ${TEST_USERNAME}`);
    console.log(`   Token: ${registerToken.substring(0, 30)}...\n`);

    // Step 2: Sign in with the same credentials
    console.log('🔐 Step 2: Signing in with credentials...');
    const loginToken = await makeRequest('login', {
      usernameOrEmail: TEST_USERNAME,
      password: TEST_PASSWORD
    });
    console.log(`   ✅ Sign in successful!`);
    console.log(`   Token: ${loginToken.substring(0, 30)}...\n`);

    // Step 3: Verify tokens are different (new session)
    if (registerToken !== loginToken) {
      console.log('✅ Step 3: Tokens are different (new session created)');
    } else {
      console.log('⚠️  Step 3: Tokens are the same (unexpected)');
    }

    console.log('\n✅ ALL TESTS PASSED: Sign in flow working correctly!\n');
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ TEST FAILED: ${error.message}\n`);
    process.exit(1);
  }
}

function makeRequest(endpoint, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: `/api/auth/${endpoint}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            const response = JSON.parse(responseData);
            if (response.token) {
              resolve(response.token);
            } else {
              reject(new Error('No token in response'));
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${e.message}`));
          }
        } else {
          reject(new Error(`${endpoint} failed with status ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Run the test
testSignInFlow();
