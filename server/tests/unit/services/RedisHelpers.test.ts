import { 
  RedisSessionManager, 
  RedisMatchmakingQueue, 
  RedisLeaderboard
} from '../../../src/db/redis';

describe('Redis Helpers', () => {
  let mockRedisClient: any;

  beforeEach(() => {
    // Create mock Redis client
    mockRedisClient = {
      setEx: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      zAdd: jest.fn().mockResolvedValue(1),
      zRem: jest.fn().mockResolvedValue(1),
      zRangeByScore: jest.fn().mockResolvedValue([]),
      zRangeWithScores: jest.fn().mockResolvedValue([]),
      zCard: jest.fn().mockResolvedValue(0),
      zRank: jest.fn().mockResolvedValue(null),
      zRevRank: jest.fn().mockResolvedValue(null),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('RedisSessionManager', () => {
    describe('setSession', () => {
      it('should store session with 7-day TTL', async () => {
        const sessionData = { userId: 'user-123', token: 'abc123' };

        await RedisSessionManager.setSession('user-123', sessionData, mockRedisClient);

        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          'session:user-123',
          7 * 24 * 60 * 60, // 7 days in seconds
          JSON.stringify(sessionData)
        );
      });

      it('should handle complex session data', async () => {
        const sessionData = {
          userId: 'user-123',
          token: 'abc123',
          roles: ['player', 'admin'],
          metadata: { lastAction: Date.now() },
        };

        await RedisSessionManager.setSession('user-123', sessionData, mockRedisClient);

        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          'session:user-123',
          expect.any(Number),
          JSON.stringify(sessionData)
        );
      });
    });

    describe('getSession', () => {
      it('should retrieve existing session', async () => {
        const sessionData = { userId: 'user-123', token: 'abc123' };
        mockRedisClient.get.mockResolvedValue(JSON.stringify(sessionData));

        const result = await RedisSessionManager.getSession('user-123', mockRedisClient);

        expect(mockRedisClient.get).toHaveBeenCalledWith('session:user-123');
        expect(result).toEqual(sessionData);
      });

      it('should return null for non-existent session', async () => {
        mockRedisClient.get.mockResolvedValue(null);

        const result = await RedisSessionManager.getSession('nonexistent', mockRedisClient);

        expect(result).toBeNull();
      });

      it('should parse JSON correctly', async () => {
        const sessionData = { nested: { data: true }, array: [1, 2, 3] };
        mockRedisClient.get.mockResolvedValue(JSON.stringify(sessionData));

        const result = await RedisSessionManager.getSession('user-123', mockRedisClient);

        expect(result).toEqual(sessionData);
      });
    });

    describe('deleteSession', () => {
      it('should delete session', async () => {
        await RedisSessionManager.deleteSession('user-123', mockRedisClient);

        expect(mockRedisClient.del).toHaveBeenCalledWith('session:user-123');
      });
    });

    describe('refreshSession', () => {
      it('should refresh session TTL', async () => {
        await RedisSessionManager.refreshSession('user-123', mockRedisClient);

        expect(mockRedisClient.expire).toHaveBeenCalledWith(
          'session:user-123',
          7 * 24 * 60 * 60
        );
      });
    });
  });

  describe('RedisMatchmakingQueue', () => {
    describe('addToQueue', () => {
      it('should add player to queue with MMR as score', async () => {
        await RedisMatchmakingQueue.addToQueue('user-123', 1500, mockRedisClient);

        expect(mockRedisClient.zAdd).toHaveBeenCalledWith(
          'matchmaking:queue',
          { score: 1500, value: 'user-123' }
        );
        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          'matchmaking:player:user-123',
          300, // 5 minutes
          expect.stringContaining('user-123')
        );
      });

      it('should store player state with timestamp', async () => {
        await RedisMatchmakingQueue.addToQueue('user-123', 1500, mockRedisClient);

        const setExCall = mockRedisClient.setEx.mock.calls[0];
        const playerState = JSON.parse(setExCall[2]);

        expect(playerState).toHaveProperty('userId', 'user-123');
        expect(playerState).toHaveProperty('mmr', 1500);
        expect(playerState).toHaveProperty('joinedAt');
        expect(typeof playerState.joinedAt).toBe('number');
      });
    });

    describe('removeFromQueue', () => {
      it('should remove player from queue and delete state', async () => {
        await RedisMatchmakingQueue.removeFromQueue('user-123', mockRedisClient);

        expect(mockRedisClient.zRem).toHaveBeenCalledWith(
          'matchmaking:queue',
          'user-123'
        );
        expect(mockRedisClient.del).toHaveBeenCalledWith(
          'matchmaking:player:user-123'
        );
      });
    });

    describe('getPlayersInRange', () => {
      it('should get players within MMR range', async () => {
        mockRedisClient.zRangeByScore.mockResolvedValue(['user-1', 'user-2', 'user-3']);

        const result = await RedisMatchmakingQueue.getPlayersInRange(1400, 1600, mockRedisClient);

        expect(mockRedisClient.zRangeByScore).toHaveBeenCalledWith(
          'matchmaking:queue',
          1400,
          1600
        );
        expect(result).toEqual(['user-1', 'user-2', 'user-3']);
      });

      it('should return empty array when no players in range', async () => {
        mockRedisClient.zRangeByScore.mockResolvedValue([]);

        const result = await RedisMatchmakingQueue.getPlayersInRange(2000, 2100, mockRedisClient);

        expect(result).toEqual([]);
      });
    });

    describe('getAllPlayers', () => {
      it('should get all players with scores', async () => {
        mockRedisClient.zRangeWithScores.mockResolvedValue([
          { value: 'user-1', score: 1400 },
          { value: 'user-2', score: 1500 },
          { value: 'user-3', score: 1600 },
        ]);

        const result = await RedisMatchmakingQueue.getAllPlayers(mockRedisClient);

        expect(mockRedisClient.zRangeWithScores).toHaveBeenCalledWith(
          'matchmaking:queue',
          0,
          -1
        );
        expect(result).toEqual([
          { userId: 'user-1', mmr: 1400 },
          { userId: 'user-2', mmr: 1500 },
          { userId: 'user-3', mmr: 1600 },
        ]);
      });

      it('should return empty array when queue is empty', async () => {
        mockRedisClient.zRangeWithScores.mockResolvedValue([]);

        const result = await RedisMatchmakingQueue.getAllPlayers(mockRedisClient);

        expect(result).toEqual([]);
      });
    });

    describe('getQueueSize', () => {
      it('should return queue size', async () => {
        mockRedisClient.zCard.mockResolvedValue(10);

        const result = await RedisMatchmakingQueue.getQueueSize(mockRedisClient);

        expect(mockRedisClient.zCard).toHaveBeenCalledWith('matchmaking:queue');
        expect(result).toBe(10);
      });

      it('should return 0 for empty queue', async () => {
        mockRedisClient.zCard.mockResolvedValue(0);

        const result = await RedisMatchmakingQueue.getQueueSize(mockRedisClient);

        expect(result).toBe(0);
      });
    });

    describe('getPlayerRank', () => {
      it('should return player rank (1-indexed)', async () => {
        mockRedisClient.zRank.mockResolvedValue(4); // 0-indexed position 4

        const result = await RedisMatchmakingQueue.getPlayerRank('user-123', mockRedisClient);

        expect(result).toBe(5); // 1-indexed position
      });

      it('should return null for player not in queue', async () => {
        mockRedisClient.zRank.mockResolvedValue(null);

        const result = await RedisMatchmakingQueue.getPlayerRank('nonexistent', mockRedisClient);

        expect(result).toBeNull();
      });
    });
  });

  describe('RedisLeaderboard', () => {
    describe('updateWins', () => {
      it('should update player wins', async () => {
        await RedisLeaderboard.updateWins('user-123', 50, mockRedisClient);

        expect(mockRedisClient.zAdd).toHaveBeenCalledWith(
          'leaderboard:wins',
          { score: 50, value: 'user-123' }
        );
      });
    });

    describe('updateMMR', () => {
      it('should update player MMR', async () => {
        await RedisLeaderboard.updateMMR('user-123', 1800, mockRedisClient);

        expect(mockRedisClient.zAdd).toHaveBeenCalledWith(
          'leaderboard:mmr',
          { score: 1800, value: 'user-123' }
        );
      });
    });

    describe('getTopByWins', () => {
      it('should get top 100 players by wins', async () => {
        mockRedisClient.zRangeWithScores.mockResolvedValue([
          { value: 'user-1', score: 100 },
          { value: 'user-2', score: 95 },
          { value: 'user-3', score: 90 },
        ]);

        const result = await RedisLeaderboard.getTopByWins(100, mockRedisClient);

        expect(mockRedisClient.zRangeWithScores).toHaveBeenCalledWith(
          'leaderboard:wins',
          0,
          99, // Top 100 (0-indexed)
          { REV: true } // Descending order
        );
        expect(result).toEqual([
          { userId: 'user-1', wins: 100 },
          { userId: 'user-2', wins: 95 },
          { userId: 'user-3', wins: 90 },
        ]);
      });

      it('should support custom limit', async () => {
        mockRedisClient.zRangeWithScores.mockResolvedValue([]);

        await RedisLeaderboard.getTopByWins(50, mockRedisClient);

        expect(mockRedisClient.zRangeWithScores).toHaveBeenCalledWith(
          'leaderboard:wins',
          0,
          49, // Top 50
          { REV: true }
        );
      });
    });

    describe('getTopByMMR', () => {
      it('should get top players by MMR', async () => {
        mockRedisClient.zRangeWithScores.mockResolvedValue([
          { value: 'user-1', score: 2000 },
          { value: 'user-2', score: 1900 },
        ]);

        const result = await RedisLeaderboard.getTopByMMR(2, mockRedisClient);

        expect(mockRedisClient.zRangeWithScores).toHaveBeenCalledWith(
          'leaderboard:mmr',
          0,
          1, // Top 2
          { REV: true }
        );
        expect(result).toEqual([
          { userId: 'user-1', mmr: 2000 },
          { userId: 'user-2', mmr: 1900 },
        ]);
      });
    });

    describe('getWinsRank', () => {
      it('should get player wins rank', async () => {
        mockRedisClient.zRevRank.mockResolvedValue(9); // 10th place (0-indexed)

        const result = await RedisLeaderboard.getWinsRank('user-123', mockRedisClient);

        expect(mockRedisClient.zRevRank).toHaveBeenCalledWith(
          'leaderboard:wins',
          'user-123'
        );
        expect(result).toBe(10); // 1-indexed
      });

      it('should return null for unranked player', async () => {
        mockRedisClient.zRevRank.mockResolvedValue(null);

        const result = await RedisLeaderboard.getWinsRank('newplayer', mockRedisClient);

        expect(result).toBeNull();
      });
    });

    describe('getMMRRank', () => {
      it('should get player MMR rank', async () => {
        mockRedisClient.zRevRank.mockResolvedValue(0); // 1st place (0-indexed)

        const result = await RedisLeaderboard.getMMRRank('user-123', mockRedisClient);

        expect(result).toBe(1); // 1-indexed
      });

      it('should return null for unranked player', async () => {
        mockRedisClient.zRevRank.mockResolvedValue(null);

        const result = await RedisLeaderboard.getMMRRank('newplayer', mockRedisClient);

        expect(result).toBeNull();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.setEx.mockRejectedValue(new Error('Redis error'));

      await expect(RedisSessionManager.setSession('user-123', {}, mockRedisClient)).rejects.toThrow('Redis error');
    });

    it('should handle malformed JSON in session', async () => {
      mockRedisClient.get.mockResolvedValue('invalid json {');

      await expect(RedisSessionManager.getSession('user-123', mockRedisClient)).rejects.toThrow();
    });

    it('should handle concurrent queue operations', async () => {
      // Add multiple players simultaneously
      const promises = [
        RedisMatchmakingQueue.addToQueue('user-1', 1500, mockRedisClient),
        RedisMatchmakingQueue.addToQueue('user-2', 1600, mockRedisClient),
        RedisMatchmakingQueue.addToQueue('user-3', 1400, mockRedisClient),
      ];

      await Promise.all(promises);

      expect(mockRedisClient.zAdd).toHaveBeenCalledTimes(3);
    });
  });
});
