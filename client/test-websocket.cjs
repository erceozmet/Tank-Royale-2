#!/usr/bin/env node

/**
 * WebSocket Connection Test for blast.io
 * Tests connection to Go game server at ws://localhost:8081
 */

const WebSocket = require('ws');

const WS_URL = 'ws://localhost:8081/ws';
const TEST_PLAYER_NAME = 'TestPlayer_' + Date.now();

console.log('🧪 blast.io WebSocket Connection Test');
console.log('=====================================\n');
console.log(`Connecting to: ${WS_URL}`);
console.log(`Player name: ${TEST_PLAYER_NAME}\n`);

const ws = new WebSocket(WS_URL);
let messageCount = 0;
let connected = false;

ws.on('open', () => {
  connected = true;
  console.log('✅ WebSocket connection established!\n');

  // Send join message
  const joinMessage = {
    type: 'join',
    payload: {
      playerName: TEST_PLAYER_NAME,
      timestamp: Date.now(),
    },
  };

  console.log('📤 Sending JOIN message:');
  console.log(JSON.stringify(joinMessage, null, 2));
  ws.send(JSON.stringify(joinMessage));

  // Send test movement after 1 second
  setTimeout(() => {
    const moveMessage = {
      type: 'move',
      payload: {
        x: 2000,
        y: 2000,
        velocityX: 250,
        velocityY: 0,
        timestamp: Date.now(),
      },
    };

    console.log('\n📤 Sending MOVE message:');
    console.log(JSON.stringify(moveMessage, null, 2));
    ws.send(JSON.stringify(moveMessage));
  }, 1000);

  // Send test attack after 2 seconds
  setTimeout(() => {
    const attackMessage = {
      type: 'attack',
      payload: {
        angle: Math.PI / 4, // 45 degrees
        targetX: 2100,
        targetY: 2100,
        timestamp: Date.now(),
      },
    };

    console.log('\n📤 Sending ATTACK message:');
    console.log(JSON.stringify(attackMessage, null, 2));
    ws.send(JSON.stringify(attackMessage));
  }, 2000);

  // Close after 5 seconds
  setTimeout(() => {
    console.log('\n⏱️  Test complete, closing connection...');
    ws.close();
  }, 5000);
});

ws.on('message', (data) => {
  messageCount++;
  console.log(`\n📥 Received message #${messageCount}:`);
  
  try {
    const message = JSON.parse(data.toString());
    console.log(JSON.stringify(message, null, 2));

    // Display specific message types
    if (message.type === 'game_state') {
      console.log(`   → Players in game: ${Object.keys(message.payload.players || {}).length}`);
    } else if (message.type === 'player_joined') {
      console.log(`   → Player joined: ${message.payload.playerName}`);
    } else if (message.type === 'player_left') {
      console.log(`   → Player left: ${message.payload.playerId}`);
    }
  } catch (error) {
    console.log('Raw data:', data.toString());
  }
});

ws.on('error', (error) => {
  console.error('\n❌ WebSocket error:', error.message);
  
  if (!connected) {
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check if Go game server is running:');
    console.log('      cd go-server && go run cmd/game/main.go');
    console.log('   2. Verify server is listening on port 8081');
    console.log('   3. Check firewall settings');
  }
  
  process.exit(1);
});

ws.on('close', (code, reason) => {
  console.log(`\n🔌 WebSocket connection closed`);
  console.log(`   Code: ${code}`);
  console.log(`   Reason: ${reason || 'Normal closure'}`);
  console.log(`   Messages received: ${messageCount}`);
  
  if (connected && messageCount > 0) {
    console.log('\n✅ Test PASSED - Connection working!');
    process.exit(0);
  } else {
    console.log('\n❌ Test FAILED - No messages received');
    process.exit(1);
  }
});

// Timeout after 10 seconds
setTimeout(() => {
  if (ws.readyState !== WebSocket.CLOSED) {
    console.log('\n⏰ Timeout - closing connection');
    ws.close();
  }
}, 10000);
