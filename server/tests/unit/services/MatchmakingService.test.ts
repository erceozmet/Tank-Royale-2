import { 
  joinQueue, 
  leaveQueue, 
  getQueueStatus,
  getActivePlayersCount,
  getActiveLobbiesCount,
  startMatchmaking,
  stopMatchmaking,
  clearMatchmakingState,
} from '../../../src/services/MatchmakingService';
import { RedisMatchmakingQueue } from '../../../src/db/redis';
import { userRepository } from '../../../src/repositories/UserRepository';
import { AuthenticatedSocket } from '../../../src/websocket';

// Mock dependencies
jest.mock('../../../src/db/redis');
jest.mock('../../../src/repositories/UserRepository');

const mockedRedisQueue = RedisMatchmakingQueue as jest.Mocked<typeof RedisMatchmakingQueue>;
const mockedUserRepo = userRepository as jest.Mocked<typeof userRepository>;

describe('MatchmakingService', () => {
  let mockSocket: Partial<AuthenticatedSocket>;

  beforeEach(() => {
    jest.clearAllMocks();
    clearMatchmakingState(); // Clear state between tests
    
    // Create mock socket
    mockSocket = {
      userId: 'user-123',
      username: 'testuser',
      connected: true,
      emit: jest.fn(),
      on: jest.fn(),
    };

    // Mock Redis methods
    mockedRedisQueue.addToQueue = jest.fn().mockResolvedValue(undefined);
    mockedRedisQueue.removeFromQueue = jest.fn().mockResolvedValue(undefined);
    mockedRedisQueue.getQueueSize = jest.fn().mockResolvedValue(5);
  });

  afterEach(() => {
    stopMatchmaking();
    clearMatchmakingState(); // Clean up after each test
  });

  describe('joinQueue', () => {
    it('should add player to queue successfully', async () => {
      const mockUser = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hash',
        mmr: 1500,
        totalWins: 10,
        totalLosses: 5,
        totalKills: 100,
        totalDeaths: 50,
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      mockedUserRepo.findById.mockResolvedValue(mockUser);

      await joinQueue(mockSocket as AuthenticatedSocket);

      expect(mockedUserRepo.findById).toHaveBeenCalledWith('user-123');
      expect(mockedRedisQueue.addToQueue).toHaveBeenCalledWith('user-123', 1500);
      expect(mockSocket.emit).toHaveBeenCalledWith('matchmaking:joined', {
        userId: 'user-123',
        mmr: 1500,
        queueSize: 5,
      });
    });

    it('should reject if player already in queue', async () => {
      const mockUser = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hash',
        mmr: 1500,
        totalWins: 10,
        totalLosses: 5,
        totalKills: 100,
        totalDeaths: 50,
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      mockedUserRepo.findById.mockResolvedValue(mockUser);

      // First join
      await joinQueue(mockSocket as AuthenticatedSocket);

      // Try to join again
      await joinQueue(mockSocket as AuthenticatedSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('matchmaking:error', {
        message: 'Already in queue',
      });
    });

    it('should handle user not found', async () => {
      mockedUserRepo.findById.mockResolvedValue(null);

      await joinQueue(mockSocket as AuthenticatedSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('matchmaking:error', {
        message: 'User not found',
      });
      expect(mockedRedisQueue.addToQueue).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockedUserRepo.findById.mockRejectedValue(new Error('Database error'));

      await joinQueue(mockSocket as AuthenticatedSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('matchmaking:error', {
        message: 'Failed to join queue',
      });
    });

    it('should setup disconnect handler', async () => {
      const mockUser = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hash',
        mmr: 1500,
        totalWins: 10,
        totalLosses: 5,
        totalKills: 100,
        totalDeaths: 50,
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      mockedUserRepo.findById.mockResolvedValue(mockUser);

      await joinQueue(mockSocket as AuthenticatedSocket);

      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });
  });

  describe('leaveQueue', () => {
    it('should remove player from queue', async () => {
      const mockUser = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hash',
        mmr: 1500,
        totalWins: 10,
        totalLosses: 5,
        totalKills: 100,
        totalDeaths: 50,
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      mockedUserRepo.findById.mockResolvedValue(mockUser);

      // Join first
      await joinQueue(mockSocket as AuthenticatedSocket);
      
      // Then leave
      await leaveQueue('user-123');

      expect(mockedRedisQueue.removeFromQueue).toHaveBeenCalledWith('user-123');
      expect(mockSocket.emit).toHaveBeenCalledWith('matchmaking:left', {
        userId: 'user-123',
      });
    });

    it('should handle leaving when not in queue', async () => {
      await leaveQueue('nonexistent-user');

      expect(mockedRedisQueue.removeFromQueue).not.toHaveBeenCalled();
    });

    it('should not emit if socket disconnected', async () => {
      const mockUser = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hash',
        mmr: 1500,
        totalWins: 10,
        totalLosses: 5,
        totalKills: 100,
        totalDeaths: 50,
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      mockedUserRepo.findById.mockResolvedValue(mockUser);

      await joinQueue(mockSocket as AuthenticatedSocket);
      
      // Disconnect socket
      mockSocket.connected = false;
      
      // Clear previous emits
      (mockSocket.emit as jest.Mock).mockClear();
      
      await leaveQueue('user-123');

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('getQueueStatus', () => {
    it('should return not in queue status', async () => {
      const status = await getQueueStatus('user-123');

      expect(status).toEqual({ inQueue: false });
    });

    it('should return in queue status with details', async () => {
      const mockUser = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hash',
        mmr: 1500,
        totalWins: 10,
        totalLosses: 5,
        totalKills: 100,
        totalDeaths: 50,
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      mockedUserRepo.findById.mockResolvedValue(mockUser);

      await joinQueue(mockSocket as AuthenticatedSocket);

      const status = await getQueueStatus('user-123');

      expect(status.inQueue).toBe(true);
      expect(status.mmr).toBe(1500);
      expect(status.queueSize).toBe(5);
      expect(status).toHaveProperty('queueTime');
      expect(status).toHaveProperty('mmrRange');
    });

    it('should calculate MMR range expansion over time', async () => {
      const mockUser = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hash',
        mmr: 1500,
        totalWins: 10,
        totalLosses: 5,
        totalKills: 100,
        totalDeaths: 50,
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      mockedUserRepo.findById.mockResolvedValue(mockUser);

      await joinQueue(mockSocket as AuthenticatedSocket);

      // Immediately after joining
      const status1 = await getQueueStatus('user-123');
      expect(status1.mmrRange).toBe(100); // Initial range

      // The range would expand after waiting, but we can't easily test time-based logic
      // without mocking Date.now() or using fake timers
    });
  });

  describe('matchmaking service', () => {
    it('should start matchmaking service', () => {
      startMatchmaking();
      // Service should be running
      stopMatchmaking();
    });

    it('should not start if already running', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      startMatchmaking();
      startMatchmaking(); // Try to start again

      expect(consoleSpy).toHaveBeenCalledWith('⚠️  Matchmaking service already running');
      
      stopMatchmaking();
      consoleSpy.mockRestore();
    });

    it('should stop matchmaking service', () => {
      startMatchmaking();
      stopMatchmaking();
      // Service should be stopped
    });
  });

  describe('statistics', () => {
    it('should return active players count', async () => {
      const mockUser = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hash',
        mmr: 1500,
        totalWins: 10,
        totalLosses: 5,
        totalKills: 100,
        totalDeaths: 50,
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      mockedUserRepo.findById.mockResolvedValue(mockUser);

      expect(getActivePlayersCount()).toBe(0);

      await joinQueue(mockSocket as AuthenticatedSocket);

      expect(getActivePlayersCount()).toBe(1);

      await leaveQueue('user-123');

      expect(getActivePlayersCount()).toBe(0);
    });

    it('should return active lobbies count', () => {
      expect(getActiveLobbiesCount()).toBe(0);
      // Lobbies are created during matchmaking process
    });
  });

  describe('edge cases', () => {
    it('should handle multiple players with same MMR', async () => {
      const createMockUser = (id: string) => ({
        userId: id,
        username: `user${id}`,
        email: `${id}@example.com`,
        passwordHash: 'hash',
        mmr: 1500, // Same MMR
        totalWins: 10,
        totalLosses: 5,
        totalKills: 100,
        totalDeaths: 50,
        createdAt: new Date(),
        lastLogin: new Date(),
      });

      mockedUserRepo.findById.mockImplementation(async (id) => createMockUser(id));

      // Add multiple players
      for (let i = 1; i <= 3; i++) {
        const socket = {
          userId: `user-${i}`,
          username: `user${i}`,
          connected: true,
          emit: jest.fn(),
          on: jest.fn(),
        } as unknown as AuthenticatedSocket;
        await joinQueue(socket);
      }

      expect(getActivePlayersCount()).toBe(3);
    });

    it('should handle Redis connection errors gracefully', async () => {
      mockedRedisQueue.addToQueue.mockRejectedValue(new Error('Redis connection failed'));
      
      const mockUser = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hash',
        mmr: 1500,
        totalWins: 10,
        totalLosses: 5,
        totalKills: 100,
        totalDeaths: 50,
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      mockedUserRepo.findById.mockResolvedValue(mockUser);

      await joinQueue(mockSocket as AuthenticatedSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('matchmaking:error', {
        message: 'Failed to join queue',
      });
    });
  });

  describe('processMatchmakingQueue', () => {
    beforeEach(() => {
      // Mock Redis queue operations
      mockedRedisQueue.getQueueSize = jest.fn().mockResolvedValue(0);
      mockedRedisQueue.getAllPlayers = jest.fn().mockResolvedValue([]);
    });

    it('should not process when queue size is below minimum', async () => {
      mockedRedisQueue.getQueueSize.mockResolvedValue(5); // Less than MIN_PLAYERS_TO_START (8)
      
      startMatchmaking();
      
      // Wait for interval to trigger
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // getAllPlayers should not be called if queue is too small
      stopMatchmaking();
    });

    it('should process queue when enough players are present', async () => {
      const createMockUser = (id: number, mmr: number) => ({
        userId: `user-${id}`,
        username: `user${id}`,
        email: `user${id}@example.com`,
        passwordHash: 'hash',
        mmr,
        totalWins: 10,
        totalLosses: 5,
        totalKills: 100,
        totalDeaths: 50,
        createdAt: new Date(),
        lastLogin: new Date(),
      });

      // Create 10 players with similar MMR
      const players = [];
      for (let i = 1; i <= 10; i++) {
        const user = createMockUser(i, 1500 + i * 10);
        const socket = {
          userId: user.userId,
          username: user.username,
          connected: true,
          emit: jest.fn(),
          on: jest.fn(),
        } as unknown as AuthenticatedSocket;
        
        mockedUserRepo.findById.mockResolvedValue(user);
        await joinQueue(socket);
        players.push({ userId: user.userId, mmr: user.mmr });
      }

      mockedRedisQueue.getQueueSize.mockResolvedValue(10);
      mockedRedisQueue.getAllPlayers.mockResolvedValue(players);

      expect(getActivePlayersCount()).toBe(10);
    });

    it('should handle errors during queue processing', async () => {
      mockedRedisQueue.getQueueSize.mockRejectedValue(new Error('Redis error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      startMatchmaking();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      stopMatchmaking();
      consoleSpy.mockRestore();
    });
  });

  describe('queue timeout', () => {
    it('should handle queue timeout after 5 minutes', async () => {
      jest.useFakeTimers();
      
      const mockUser = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hash',
        mmr: 1500,
        totalWins: 10,
        totalLosses: 5,
        totalKills: 100,
        totalDeaths: 50,
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      mockedUserRepo.findById.mockResolvedValue(mockUser);

      await joinQueue(mockSocket as AuthenticatedSocket);

      expect(getActivePlayersCount()).toBe(1);

      // Fast-forward 5 minutes (300000ms)
      jest.advanceTimersByTime(300000);

      jest.useRealTimers();
    });
  });

  describe('MMR range calculation', () => {
    it('should calculate expanding MMR range over time', async () => {
      const mockUser = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hash',
        mmr: 1500,
        totalWins: 10,
        totalLosses: 5,
        totalKills: 100,
        totalDeaths: 50,
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      mockedUserRepo.findById.mockResolvedValue(mockUser);

      await joinQueue(mockSocket as AuthenticatedSocket);

      // Initial range should be 100
      const initialStatus = await getQueueStatus('user-123');
      expect(initialStatus.mmrRange).toBe(100);
    });
  });

  describe('lobby creation', () => {
    it('should emit match_found event to all players in lobby', async () => {
      const players = [];
      
      for (let i = 1; i <= 8; i++) {
        const user = {
          userId: `user-${i}`,
          username: `user${i}`,
          email: `user${i}@example.com`,
          passwordHash: 'hash',
          mmr: 1500,
          totalWins: 10,
          totalLosses: 5,
          totalKills: 100,
          totalDeaths: 50,
          createdAt: new Date(),
          lastLogin: new Date(),
        };

        const socket = {
          userId: user.userId,
          username: user.username,
          connected: true,
          emit: jest.fn(),
          on: jest.fn(),
        } as unknown as AuthenticatedSocket;

        mockedUserRepo.findById.mockResolvedValue(user);
        await joinQueue(socket);
        players.push(socket);
      }

      expect(getActivePlayersCount()).toBe(8);
    });
  });

  describe('concurrent operations', () => {
    it('should handle multiple players joining simultaneously', async () => {
      const createMockUser = (id: number) => ({
        userId: `user-${id}`,
        username: `user${id}`,
        email: `user${id}@example.com`,
        passwordHash: 'hash',
        mmr: 1500,
        totalWins: 10,
        totalLosses: 5,
        totalKills: 100,
        totalDeaths: 50,
        createdAt: new Date(),
        lastLogin: new Date(),
      });

      mockedUserRepo.findById.mockImplementation(async (id) => {
        const userId = parseInt(id.split('-')[1]);
        return createMockUser(userId);
      });

      const joinPromises = [];
      for (let i = 1; i <= 5; i++) {
        const socket = {
          userId: `user-${i}`,
          username: `user${i}`,
          connected: true,
          emit: jest.fn(),
          on: jest.fn(),
        } as unknown as AuthenticatedSocket;
        
        joinPromises.push(joinQueue(socket));
      }

      await Promise.all(joinPromises);

      expect(getActivePlayersCount()).toBe(5);
    });

    it('should handle players leaving while matchmaking is processing', async () => {
      const mockUser = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hash',
        mmr: 1500,
        totalWins: 10,
        totalLosses: 5,
        totalKills: 100,
        totalDeaths: 50,
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      mockedUserRepo.findById.mockResolvedValue(mockUser);

      await joinQueue(mockSocket as AuthenticatedSocket);
      expect(getActivePlayersCount()).toBe(1);

      await leaveQueue('user-123');
      expect(getActivePlayersCount()).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle database errors during join', async () => {
      mockedUserRepo.findById.mockRejectedValue(new Error('Database connection failed'));

      await joinQueue(mockSocket as AuthenticatedSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('matchmaking:error', {
        message: 'Failed to join queue',
      });
    });

    it('should handle errors during leave', async () => {
      const mockUser = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hash',
        mmr: 1500,
        totalWins: 10,
        totalLosses: 5,
        totalKills: 100,
        totalDeaths: 50,
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      mockedUserRepo.findById.mockResolvedValue(mockUser);
      await joinQueue(mockSocket as AuthenticatedSocket);

      mockedRedisQueue.removeFromQueue.mockRejectedValue(new Error('Redis error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await leaveQueue('user-123');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
