/**
 * WebSocket Integration Tests
 * 
 * NOTE: These tests require socket.io-client to be installed.
 * Run: npm install --save-dev socket.io-client
 * 
 * These tests verify the WebSocket server functionality including:
 * - Connection authentication with JWT
 * - Matchmaking events
 * - Session management
 * - Error handling
 */

// Conditional test execution - skip if socket.io-client is not available
let ioClient: any;
let Socket: any;

try {
  const socketIOClient = require('socket.io-client');
  ioClient = socketIOClient.io;
  Socket = socketIOClient.Socket;
} catch (error) {
  console.warn('⚠️  socket.io-client not installed. Skipping WebSocket integration tests.');
  console.warn('   Install with: npm install --save-dev socket.io-client');
}

const describeIfSocketIO = ioClient ? describe : describe.skip;

import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import express from 'express';
import { initWebSocket } from '../../src/websocket';
import { generateToken } from '../../src/auth/utils';
import { RedisSessionManager } from '../../src/db/redis';

// Mock Redis for session checks
jest.mock('../../src/db/redis', () => ({
  getRedis: jest.fn(),
  RedisSessionManager: {
    getSession: jest.fn(),
  },
}));

describeIfSocketIO('WebSocket Integration Tests', () => {
  let httpServer: http.Server;
  let io: SocketIOServer;
  let clientSocket: typeof Socket;
  let port: number;

  beforeAll(async () => {
    // Create express app and HTTP server
    const app = express();
    httpServer = http.createServer(app);

    // Setup WebSocket server
    io = initWebSocket(httpServer);

    // Start server on random available port
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        port = (httpServer.address() as any).port;
        resolve();
      });
    });
  });

  afterAll(() => {
    io.close();
    httpServer.close();
  });

  afterEach(() => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Connection Authentication', () => {
    it('should accept connection with valid token', (done) => {
      const token = generateToken('1', 'testuser');
      
      // Mock session exists
      (RedisSessionManager.getSession as jest.Mock).mockResolvedValue({
        userId: '1',
        username: 'testuser',
      });

      clientSocket = ioClient(`http://localhost:${port}`, {
        auth: { token },
      });

      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        done();
      });

      clientSocket.on('connect_error', (error: Error) => {
        done(new Error(`Connection failed: ${error.message}`));
      });
    });

    it('should reject connection without token', (done) => {
      clientSocket = ioClient(`http://localhost:${port}`);

      clientSocket.on('connect', () => {
        done(new Error('Should not connect without token'));
      });

      clientSocket.on('connect_error', (error: Error) => {
        expect(error.message).toMatch(/authentication|Authentication token required/i);
        done();
      });
    });

    it('should reject connection with invalid token', (done) => {
      clientSocket = ioClient(`http://localhost:${port}`, {
        auth: { token: 'invalid_token' },
      });

      clientSocket.on('connect', () => {
        done(new Error('Should not connect with invalid token'));
      });

      clientSocket.on('connect_error', (error: Error) => {
        expect(error.message).toContain('Authentication failed');
        done();
      });
    });
  });

  describe('Session Management', () => {
    it('should emit authenticated event on successful connection', (done) => {
      const token = generateToken('1', 'testuser');
      
      (RedisSessionManager.getSession as jest.Mock).mockResolvedValue({
        userId: '1',
        username: 'testuser',
      });

      clientSocket = ioClient(`http://localhost:${port}`, {
        auth: { token },
      });

      clientSocket.on('authenticated', (data: any) => {
        expect(data).toHaveProperty('userId');
        expect(data).toHaveProperty('username');
        done();
      });

      clientSocket.on('connect_error', (error: Error) => {
        done(new Error(`Connection failed: ${error.message}`));
      });
    });

    it('should handle ping/pong', (done) => {
      const token = generateToken('1', 'testuser');
      
      (RedisSessionManager.getSession as jest.Mock).mockResolvedValue({
        userId: '1',
        username: 'testuser',
      });

      clientSocket = ioClient(`http://localhost:${port}`, {
        auth: { token },
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('ping');
      });

      clientSocket.on('pong', (data: any) => {
        expect(data).toHaveProperty('timestamp');
        done();
      });
    });
  });

  describe('Disconnect Handling', () => {
    it('should handle clean disconnect', (done) => {
      const token = generateToken('1', 'testuser');
      
      (RedisSessionManager.getSession as jest.Mock).mockResolvedValue({
        userId: '1',
        username: 'testuser',
      });

      clientSocket = ioClient(`http://localhost:${port}`, {
        auth: { token },
      });

      clientSocket.on('connect', () => {
        clientSocket.disconnect();
        
        setTimeout(() => {
          expect(clientSocket.connected).toBe(false);
          done();
        }, 100);
      });
    });
  });
});

// Export a note about missing dependency
export const WEBSOCKET_TEST_NOTE = 
  'WebSocket integration tests require socket.io-client. Install with: npm install --save-dev socket.io-client';
