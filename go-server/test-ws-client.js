#!/usr/bin/env node

const WebSocket = require('ws');

// Get token from command line argument or use default
const token = process.argv[2] || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzZDA4NTE0NC1kZmY4LTRjODctOGU2ZS02MDcxZmUzNjhhN2YiLCJ1c2VybmFtZSI6InRlc3R1c2VyIiwiZXhwIjoxNzYzMTU3ODM2LCJuYmYiOjE3NjMwNzE0MzYsImlhdCI6MTc2MzA3MTQzNn0.slaTWZsrlveV7fZdU_2u-B1W2WmdgFJAmkskGbh0HDY';

console.log('🔌 Connecting to WebSocket server...');
console.log(`Token: ${token.substring(0, 30)}...`);

const ws = new WebSocket(`ws://localhost:8081/ws?token=${token}`);

ws.on('open', () => {
  console.log('✅ Connected to WebSocket server\n');

  // Test ping
  console.log('📤 Sending ping...');
  ws.send(JSON.stringify({ type: 'ping', payload: {} }));

  // Test joining a room
  setTimeout(() => {
    console.log('📤 Joining room: test-room-1...');
    ws.send(JSON.stringify({
      type: 'room:join',
      payload: { roomId: 'test-room-1' }
    }));
  }, 1000);

  // Test sending a room message
  setTimeout(() => {
    console.log('📤 Sending room message...');
    ws.send(JSON.stringify({
      type: 'room:message',
      payload: {
        roomId: 'test-room-1',
        message: 'Hello from test client!'
      }
    }));
  }, 2000);

  // Test leaving room
  setTimeout(() => {
    console.log('📤 Leaving room...');
    ws.send(JSON.stringify({
      type: 'room:leave',
      payload: { roomId: 'test-room-1' }
    }));
  }, 3000);

  // Close connection
  setTimeout(() => {
    console.log('\n🔌 Closing connection...');
    ws.close();
  }, 4000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    console.log('📥 Received:', JSON.stringify(message, null, 2));
  } catch (e) {
    console.log('📥 Received (raw):', data.toString());
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
  console.log(`\n🔌 Connection closed (code: ${code}, reason: ${reason || 'none'})`);
  process.exit(0);
});
