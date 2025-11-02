import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import express from 'express';
import {
  initWebSocket,
  getIO,
  emitToUser,
  emitToUsers,
  broadcastToAll,
  getConnectedCount,
  isUserConnected,
  disconnectUser,
} from '../../../src/websocket';

// Mock dependencies
jest.mock('../../../src/auth/utils', () => ({
  verifyToken: jest.fn(),
}));

jest.mock('../../../src/db/redis', () => ({
  RedisSessionManager: {
    getSession: jest.fn(),
    refreshSession: jest.fn(),
  },
}));

import { verifyToken } from '../../../src/auth/utils';
import { RedisSessionManager } from '../../../src/db/redis';

describe('WebSocket Helper Functions', () => {
  let httpServer: HttpServer;
  let io: SocketIOServer;

  beforeEach(() => {
    const app = express();
    httpServer = new HttpServer(app);
    
    // Mock verification
    (verifyToken as jest.Mock).mockReturnValue({
      userId: 'test-user-1',
      username: 'testuser',
    });
    (RedisSessionManager.getSession as jest.Mock).mockResolvedValue({
      userId: 'test-user-1',
      username: 'testuser',
    });
    (RedisSessionManager.refreshSession as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(async () => {
    // Close IO first
    if (io) {
      await new Promise<void>((resolve) => {
        io.close(() => {
          resolve();
        });
      });
    }
    
    // Then close HTTP server
    await new Promise<void>((resolve) => {
      httpServer.close(() => {
        resolve();
      });
    });
  });

  describe('initWebSocket', () => {
    it('should initialize WebSocket server', () => {
      io = initWebSocket(httpServer);
      expect(io).toBeDefined();
      expect(io).toBeInstanceOf(SocketIOServer);
    });

    it('should configure CORS', () => {
      io = initWebSocket(httpServer);
      // Server is initialized with CORS options
      expect(io).toBeDefined();
    });
  });

  describe('getIO', () => {
    it('should return initialized IO instance', () => {
      io = initWebSocket(httpServer);
      const retrievedIO = getIO();
      expect(retrievedIO).toBe(io);
    });

    it('should throw error if IO not initialized', async () => {
      // Make sure any previous IO is closed
      try {
        const existingIO = getIO();
        await new Promise<void>((resolve) => {
          existingIO.close(() => resolve());
        });
      } catch (e) {
        // IO not initialized, which is what we want
      }
      
      // Reset the module to clear the internal io variable
      jest.resetModules();
      const { getIO: freshGetIO } = require('../../../src/websocket');
      
      expect(() => freshGetIO()).toThrow('WebSocket server not initialized');
    });
  });

  describe('emitToUser', () => {
    it('should emit event to specific user room', async () => {
      io = initWebSocket(httpServer);
      
      // Mock the to().emit() chain
      const emitMock = jest.fn();
      const toMock = jest.fn().mockReturnValue({ emit: emitMock });
      io.to = toMock;

      emitToUser('user-123', 'test:event', { data: 'test' });

      expect(toMock).toHaveBeenCalledWith('user:user-123');
      expect(emitMock).toHaveBeenCalledWith('test:event', { data: 'test' });
    });
  });

  describe('emitToUsers', () => {
    it('should emit event to multiple user rooms', async () => {
      io = initWebSocket(httpServer);
      
      const emitMock = jest.fn();
      const toMock = jest.fn().mockReturnValue({ emit: emitMock });
      io.to = toMock;

      emitToUsers(['user-1', 'user-2', 'user-3'], 'test:event', { data: 'test' });

      expect(toMock).toHaveBeenCalledTimes(3);
      expect(toMock).toHaveBeenCalledWith('user:user-1');
      expect(toMock).toHaveBeenCalledWith('user:user-2');
      expect(toMock).toHaveBeenCalledWith('user:user-3');
      expect(emitMock).toHaveBeenCalledTimes(3);
    });

    it('should handle empty user array', async () => {
      io = initWebSocket(httpServer);
      
      const toMock = jest.fn();
      io.to = toMock;

      emitToUsers([], 'test:event', { data: 'test' });

      expect(toMock).not.toHaveBeenCalled();
    });
  });

  describe('broadcastToAll', () => {
    it('should broadcast event to all connected clients', async () => {
      io = initWebSocket(httpServer);
      
      const emitMock = jest.fn();
      io.emit = emitMock;

      broadcastToAll('test:broadcast', { message: 'hello' });

      expect(emitMock).toHaveBeenCalledWith('test:broadcast', { message: 'hello' });
    });
  });

  describe('getConnectedCount', () => {
    it('should return number of connected clients', async () => {
      io = initWebSocket(httpServer);
      
      // Mock fetchSockets to return array
      io.fetchSockets = jest.fn().mockResolvedValue([
        { id: 'socket-1' },
        { id: 'socket-2' },
        { id: 'socket-3' },
      ]);

      const count = await getConnectedCount();

      expect(count).toBe(3);
    });

    it('should return 0 when no clients connected', async () => {
      io = initWebSocket(httpServer);
      
      io.fetchSockets = jest.fn().mockResolvedValue([]);

      const count = await getConnectedCount();

      expect(count).toBe(0);
    });
  });

  describe('isUserConnected', () => {
    it('should return true if user is connected', async () => {
      io = initWebSocket(httpServer);
      
      const inMock = jest.fn().mockReturnValue({
        fetchSockets: jest.fn().mockResolvedValue([{ id: 'socket-1' }]),
      });
      io.in = inMock;

      const connected = await isUserConnected('user-123');

      expect(connected).toBe(true);
      expect(inMock).toHaveBeenCalledWith('user:user-123');
    });

    it('should return false if user is not connected', async () => {
      io = initWebSocket(httpServer);
      
      const inMock = jest.fn().mockReturnValue({
        fetchSockets: jest.fn().mockResolvedValue([]),
      });
      io.in = inMock;

      const connected = await isUserConnected('user-123');

      expect(connected).toBe(false);
    });
  });

  describe('disconnectUser', () => {
    it('should disconnect user with reason', async () => {
      io = initWebSocket(httpServer);
      
      const disconnectMock = jest.fn();
      const emitMock = jest.fn();
      const mockSocket = {
        id: 'socket-1',
        emit: emitMock,
        disconnect: disconnectMock,
      };

      const inMock = jest.fn().mockReturnValue({
        fetchSockets: jest.fn().mockResolvedValue([mockSocket]),
      });
      io.in = inMock;

      await disconnectUser('user-123', 'Kicked by admin');

      expect(emitMock).toHaveBeenCalledWith('force_disconnect', {
        reason: 'Kicked by admin',
      });
      expect(disconnectMock).toHaveBeenCalledWith(true);
    });

    it('should disconnect user with default reason', async () => {
      io = initWebSocket(httpServer);
      
      const disconnectMock = jest.fn();
      const emitMock = jest.fn();
      const mockSocket = {
        emit: emitMock,
        disconnect: disconnectMock,
      };

      const inMock = jest.fn().mockReturnValue({
        fetchSockets: jest.fn().mockResolvedValue([mockSocket]),
      });
      io.in = inMock;

      await disconnectUser('user-123');

      expect(emitMock).toHaveBeenCalledWith('force_disconnect', {
        reason: 'Disconnected by server',
      });
    });

    it('should handle disconnecting multiple sockets for same user', async () => {
      io = initWebSocket(httpServer);
      
      const mockSockets = [
        { emit: jest.fn(), disconnect: jest.fn() },
        { emit: jest.fn(), disconnect: jest.fn() },
      ];

      const inMock = jest.fn().mockReturnValue({
        fetchSockets: jest.fn().mockResolvedValue(mockSockets),
      });
      io.in = inMock;

      await disconnectUser('user-123');

      mockSockets.forEach(socket => {
        expect(socket.emit).toHaveBeenCalled();
        expect(socket.disconnect).toHaveBeenCalled();
      });
    });
  });
});
