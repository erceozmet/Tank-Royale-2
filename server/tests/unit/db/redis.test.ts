// Mock the redis module BEFORE importing the module under test
jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

// Import after mocking
import { createClient } from 'redis';
import { 
  initRedis, 
  closeRedis, 
  healthCheck,
  getRedis,
  RedisSessionManager 
} from '../../../src/db/redis';

describe('Redis Module', () => {
  let mockRedisClient: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Close any existing connection
    try {
      await closeRedis();
    } catch (e) {
      // Ignore errors
    }
    
    // Create a mock Redis client with all necessary methods
    mockRedisClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
      ping: jest.fn().mockResolvedValue('PONG'),
      get: jest.fn(),
      set: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      expire: jest.fn(),
      exists: jest.fn(),
      keys: jest.fn(),
      on: jest.fn(),
      isOpen: true,
      isReady: true,
    };

    (createClient as jest.Mock).mockReturnValue(mockRedisClient);
  });

  afterEach(async () => {
    try {
      await closeRedis();
    } catch (e) {
      // Ignore errors
    }
  });

  describe('initRedis', () => {
    it('should successfully initialize Redis connection', async () => {
      await initRedis();

      expect(createClient).toHaveBeenCalled();
      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
    });

    it('should handle connection errors', async () => {
      mockRedisClient.connect.mockRejectedValueOnce(new Error('Connection failed'));

      await expect(initRedis()).rejects.toThrow('Connection failed');
    });

    it('should not reinitialize if already connected', async () => {
      await initRedis();
      const firstCallCount = mockRedisClient.connect.mock.calls.length;
      
      await initRedis();
      const secondCallCount = mockRedisClient.connect.mock.calls.length;
      
      // Should not call connect again
      expect(secondCallCount).toBe(firstCallCount);
    });
  });

  describe('closeRedis', () => {
    it('should close Redis connection', async () => {
      await initRedis();
      await closeRedis();

      expect(mockRedisClient.quit).toHaveBeenCalled();
    });

    it('should handle close errors gracefully', async () => {
      await initRedis();
      mockRedisClient.quit.mockRejectedValueOnce(new Error('Close failed'));

      await expect(closeRedis()).rejects.toThrow('Close failed');
    });

    it('should do nothing if Redis is not initialized', async () => {
      await closeRedis();

      expect(mockRedisClient.quit).not.toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return true when Redis is healthy', async () => {
      await initRedis();
      mockRedisClient.ping.mockResolvedValueOnce('PONG');

      const result = await healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when Redis ping fails', async () => {
      await initRedis();
      mockRedisClient.ping.mockRejectedValueOnce(new Error('Ping failed'));

      const result = await healthCheck();

      expect(result).toBe(false);
    });

    it('should return false when Redis is not initialized', async () => {
      const result = await healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('RedisSessionManager', () => {
    beforeEach(async () => {
      await initRedis();
      mockRedisClient.setEx.mockClear();
      mockRedisClient.get.mockClear();
    });

    describe('setSession', () => {
      it('should create a new session', async () => {
        const userId = '123';
        const sessionData = { username: 'testuser', loginAt: Date.now() };
        mockRedisClient.setEx.mockResolvedValueOnce('OK');

        await RedisSessionManager.setSession(userId, sessionData, mockRedisClient);

        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          `session:${userId}`,
          expect.any(Number),
          JSON.stringify(sessionData)
        );
      });

      it('should handle session creation errors', async () => {
        mockRedisClient.setEx.mockRejectedValueOnce(new Error('Set failed'));

        await expect(
          RedisSessionManager.setSession('123', { username: 'testuser' }, mockRedisClient)
        ).rejects.toThrow('Set failed');
      });
    });

    describe('getSession', () => {
      it('should retrieve an existing session', async () => {
        const sessionData = JSON.stringify({ userId: '123', username: 'testuser' });
        mockRedisClient.get.mockResolvedValueOnce(sessionData);

        const result = await RedisSessionManager.getSession('123', mockRedisClient);

        expect(result).toEqual({ userId: '123', username: 'testuser' });
        expect(mockRedisClient.get).toHaveBeenCalledWith('session:123');
      });

      it('should return null for non-existent session', async () => {
        mockRedisClient.get.mockResolvedValueOnce(null);

        const result = await RedisSessionManager.getSession('123', mockRedisClient);

        expect(result).toBeNull();
      });

      it('should handle invalid JSON in session data', async () => {
        mockRedisClient.get.mockResolvedValueOnce('invalid json');

        await expect(
          RedisSessionManager.getSession('123', mockRedisClient)
        ).rejects.toThrow();
      });
    });

    describe('refreshSession', () => {
      it('should refresh an existing session', async () => {
        mockRedisClient.expire.mockResolvedValueOnce(1);

        await RedisSessionManager.refreshSession('123', mockRedisClient);

        expect(mockRedisClient.expire).toHaveBeenCalledWith(
          'session:123',
          expect.any(Number)
        );
      });
    });

    describe('deleteSession', () => {
      it('should delete a session', async () => {
        mockRedisClient.del.mockResolvedValueOnce(1);

        await RedisSessionManager.deleteSession('123', mockRedisClient);

        expect(mockRedisClient.del).toHaveBeenCalledWith('session:123');
      });

      it('should handle deletion errors', async () => {
        mockRedisClient.del.mockRejectedValueOnce(new Error('Delete failed'));

        await expect(
          RedisSessionManager.deleteSession('123', mockRedisClient)
        ).rejects.toThrow('Delete failed');
      });
    });
  });
});
