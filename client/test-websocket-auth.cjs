const WebSocket = require('ws');
const http = require('http');

const API_URL = 'http://localhost:8080';
const WS_URL = 'ws://localhost:8081/ws';
const TEST_USERNAME = `test_${Date.now()}`;
const TEST_PASSWORD = 'TestPass123!';

console.log('🧪 blast.io WebSocket Connection Test (with Auth)');
console.log('==================================================\n');

let testPassed = false;
let timeout;

// Step 1: Register/Login to get JWT token
async function authenticate() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      username: TEST_USERNAME,
      email: `${TEST_USERNAME}@test.com`,
      password: TEST_PASSWORD
    });

    const options = {
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };

    console.log('🔐 Step 1: Authenticating...');
    console.log(`   Username: ${TEST_USERNAME}`);

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            if (response.token) {
              console.log('   ✅ Authentication successful!\n');
              resolve(response.token);
            } else {
              reject(new Error('No token in response'));
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${e.message}`));
          }
        } else {
          reject(new Error(`Registration failed with status ${res.statusCode}: ${data}`));
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

// Step 2: Connect to WebSocket with token
async function testWebSocket(token) {
  console.log('🔌 Step 2: Connecting to WebSocket...');
  console.log(`   URL: ${WS_URL}`);
  console.log(`   Token: ${token.substring(0, 30)}...\n`);

  // Create WebSocket connection with token in query parameter
  const ws = new WebSocket(`${WS_URL}?token=${token}`);

  // Connection opened
  ws.on('open', () => {
    console.log('✅ WebSocket connected!\n');
  });

  // Listen for messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📥 Received message:');
      console.log(`   Type: ${message.type}`);
      console.log(`   Payload: ${JSON.stringify(message.payload, null, 2)}\n`);

      // If we received authenticated message, test is successful
      if (message.type === 'authenticated') {
        console.log('✅ Authentication confirmed by server!\n');
        
        // Send a ping to test message handling
        console.log('📤 Sending ping message...');
        ws.send(JSON.stringify({
          type: 'ping',
          payload: {}
        }));

        // Close after receiving pong or after 2 seconds
        setTimeout(() => {
          console.log('✅ Test complete - closing connection');
          testPassed = true;
          ws.close();
        }, 2000);
      }
    } catch (e) {
      console.error('❌ Error parsing message:', e.message);
    }
  });

  // Connection closed
  ws.on('close', (code, reason) => {
    console.log(`\n🔌 Connection closed (code: ${code})`);
    if (testPassed) {
      console.log('\n✅ TEST PASSED: WebSocket connection and authentication working!');
      process.exit(0);
    } else {
      console.log('\n❌ TEST FAILED: Connection closed before receiving authenticated message');
      process.exit(1);
    }
  });

  // Error handling
  ws.on('error', (error) => {
    console.error(`\n❌ WebSocket error: ${error.message}`);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check if Go game server is running on port 8081');
    console.log('   2. Verify the token is valid');
    console.log('   3. Check server logs for authentication errors\n');
    process.exit(1);
  });

  // Overall timeout
  timeout = setTimeout(() => {
    if (!testPassed) {
      console.log('\n❌ Test timeout - no authenticated message received');
      ws.close();
      process.exit(1);
    }
  }, 10000);
}

// Run the test
(async () => {
  try {
    const token = await authenticate();
    await testWebSocket(token);
  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check if API server is running on port 8080:');
    console.log('      cd go-server && ./bin/api');
    console.log('   2. Check if game server is running on port 8081:');
    console.log('      cd go-server && ./bin/game');
    console.log('   3. Verify Redis and PostgreSQL containers are running:');
    console.log('      podman ps\n');
    process.exit(1);
  }
})();
