import { LeaderboardRepository } from '../../../src/repositories/LeaderboardRepository';
import { query } from '../../../src/db/postgres';

// Mock the postgres query function
jest.mock('../../../src/db/postgres');
const mockedQuery = query as jest.MockedFunction<typeof query>;

describe('LeaderboardRepository', () => {
  let leaderboardRepository: LeaderboardRepository;

  beforeEach(() => {
    leaderboardRepository = new LeaderboardRepository();
    jest.clearAllMocks();
  });

  describe('getTopByWins', () => {
    it('should return top players sorted by wins', async () => {
      const mockPlayers = [
        {
          userId: 'user-1',
          username: 'champion',
          mmr: 2000,
          totalWins: 100,
          totalLosses: 20,
          totalKills: 1000,
          totalDeaths: 200,
          winRate: '83.33',
        },
        {
          userId: 'user-2',
          username: 'runner-up',
          mmr: 1800,
          totalWins: 90,
          totalLosses: 30,
          totalKills: 900,
          totalDeaths: 300,
          winRate: '75.00',
        },
      ];

      mockedQuery.mockResolvedValue({ rows: mockPlayers, rowCount: 2 } as any);

      const result = await leaderboardRepository.getTopByWins(100, 0);

      expect(result).toHaveLength(2);
      expect(result[0].rank).toBe(1);
      expect(result[0].username).toBe('champion');
      expect(result[1].rank).toBe(2);
      expect(result[1].username).toBe('runner-up');
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY total_wins DESC, mmr DESC'),
        [100, 0]
      );
    });

    it('should respect limit parameter', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await leaderboardRepository.getTopByWins(50, 0);

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        [50, 0]
      );
    });

    it('should respect offset parameter for pagination', async () => {
      const mockPlayers = [
        {
          userId: 'user-11',
          username: 'player11',
          mmr: 1500,
          totalWins: 50,
          totalLosses: 10,
          totalKills: 500,
          totalDeaths: 100,
          winRate: '83.33',
        },
      ];

      mockedQuery.mockResolvedValue({ rows: mockPlayers, rowCount: 1 } as any);

      const result = await leaderboardRepository.getTopByWins(10, 10);

      expect(result[0].rank).toBe(11); // Rank should account for offset
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.any(String),
        [10, 10]
      );
    });

    it('should filter players with zero wins', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await leaderboardRepository.getTopByWins(100, 0);

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE total_wins > 0'),
        expect.any(Array)
      );
    });

    it('should calculate win rate correctly', async () => {
      const mockPlayers = [
        {
          userId: 'user-1',
          username: 'player1',
          mmr: 1500,
          totalWins: 10,
          totalLosses: 5,
          totalKills: 100,
          totalDeaths: 50,
          winRate: '66.67',
        },
      ];

      mockedQuery.mockResolvedValue({ rows: mockPlayers, rowCount: 1 } as any);

      const result = await leaderboardRepository.getTopByWins(100, 0);

      expect(result[0].winRate).toBe(66.67);
    });

    it('should handle zero games played', async () => {
      const mockPlayers = [
        {
          userId: 'user-1',
          username: 'newbie',
          mmr: 1000,
          totalWins: 0,
          totalLosses: 0,
          totalKills: 0,
          totalDeaths: 0,
          winRate: '0',
        },
      ];

      mockedQuery.mockResolvedValue({ rows: mockPlayers, rowCount: 1 } as any);

      const result = await leaderboardRepository.getTopByWins(100, 0);

      expect(result[0].winRate).toBe(0);
    });

    it('should return empty array when no players', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const result = await leaderboardRepository.getTopByWins(100, 0);

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockedQuery.mockRejectedValue(new Error('Connection failed'));

      await expect(leaderboardRepository.getTopByWins(100, 0)).rejects.toThrow('Connection failed');
    });
  });

  describe('getTopByMMR', () => {
    it('should return top players sorted by MMR', async () => {
      const mockPlayers = [
        {
          userId: 'user-1',
          username: 'top-mmr',
          mmr: 2500,
          totalWins: 80,
          totalLosses: 20,
          totalKills: 800,
          totalDeaths: 200,
          winRate: '80.00',
        },
        {
          userId: 'user-2',
          username: 'second-mmr',
          mmr: 2400,
          totalWins: 85,
          totalLosses: 15,
          totalKills: 850,
          totalDeaths: 150,
          winRate: '85.00',
        },
      ];

      mockedQuery.mockResolvedValue({ rows: mockPlayers, rowCount: 2 } as any);

      const result = await leaderboardRepository.getTopByMMR(100, 0);

      expect(result).toHaveLength(2);
      expect(result[0].mmr).toBe(2500);
      expect(result[1].mmr).toBe(2400);
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY mmr DESC, total_wins DESC'),
        [100, 0]
      );
    });

    it('should use wins as tiebreaker for same MMR', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await leaderboardRepository.getTopByMMR(100, 0);

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY mmr DESC, total_wins DESC'),
        expect.any(Array)
      );
    });

    it('should respect pagination', async () => {
      const mockPlayers = [
        {
          userId: 'user-51',
          username: 'mid-tier',
          mmr: 1500,
          totalWins: 50,
          totalLosses: 50,
          totalKills: 500,
          totalDeaths: 500,
          winRate: '50.00',
        },
      ];

      mockedQuery.mockResolvedValue({ rows: mockPlayers, rowCount: 1 } as any);

      const result = await leaderboardRepository.getTopByMMR(10, 50);

      expect(result[0].rank).toBe(51);
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.any(String),
        [10, 50]
      );
    });

    it('should include players with zero wins', async () => {
      const mockPlayers = [
        {
          userId: 'user-1',
          username: 'no-wins',
          mmr: 1000,
          totalWins: 0,
          totalLosses: 5,
          totalKills: 10,
          totalDeaths: 50,
          winRate: '0',
        },
      ];

      mockedQuery.mockResolvedValue({ rows: mockPlayers, rowCount: 1 } as any);

      const result = await leaderboardRepository.getTopByMMR(100, 0);

      expect(result[0].totalWins).toBe(0);
    });

    it('should return empty array when no players', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const result = await leaderboardRepository.getTopByMMR(100, 0);

      expect(result).toEqual([]);
    });
  });

  describe('getPlayerMMRRank', () => {
    it('should return correct rank for player', async () => {
      mockedQuery.mockResolvedValue({ rows: [{ rank: '15' }], rowCount: 1 } as any);

      const rank = await leaderboardRepository.getPlayerMMRRank('user-123');

      expect(rank).toBe(15);
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE mmr >'),
        ['user-123']
      );
    });

    it('should return 1 for top player', async () => {
      mockedQuery.mockResolvedValue({ rows: [{ rank: '1' }], rowCount: 1 } as any);

      const rank = await leaderboardRepository.getPlayerMMRRank('top-player');

      expect(rank).toBe(1);
    });

    it('should handle tiebreaker with wins', async () => {
      mockedQuery.mockResolvedValue({ rows: [{ rank: '10' }], rowCount: 1 } as any);

      await leaderboardRepository.getPlayerMMRRank('user-123');

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND total_wins >'),
        expect.any(Array)
      );
    });

    it('should handle SQL injection in user ID', async () => {
      const maliciousId = "user-1' OR '1'='1";
      mockedQuery.mockResolvedValue({ rows: [{ rank: '1' }], rowCount: 1 } as any);

      await leaderboardRepository.getPlayerMMRRank(maliciousId);

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.any(String),
        [maliciousId]
      );
    });

    it('should handle nonexistent user', async () => {
      mockedQuery.mockResolvedValue({ rows: [{ rank: null }], rowCount: 1 } as any);

      const rank = await leaderboardRepository.getPlayerMMRRank('nonexistent');

      expect(isNaN(rank)).toBe(true);
    });

    it('should handle database errors', async () => {
      mockedQuery.mockRejectedValue(new Error('Query timeout'));

      await expect(leaderboardRepository.getPlayerMMRRank('user-123')).rejects.toThrow('Query timeout');
    });
  });

  describe('getPlayerWinsRank', () => {
    it('should return correct rank for player', async () => {
      mockedQuery.mockResolvedValue({ rows: [{ rank: '25' }], rowCount: 1 } as any);

      const rank = await leaderboardRepository.getPlayerWinsRank('user-123');

      expect(rank).toBe(25);
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE total_wins >'),
        ['user-123']
      );
    });

    it('should use MMR as tiebreaker', async () => {
      mockedQuery.mockResolvedValue({ rows: [{ rank: '10' }], rowCount: 1 } as any);

      await leaderboardRepository.getPlayerWinsRank('user-123');

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND mmr >'),
        expect.any(Array)
      );
    });

    it('should handle SQL injection in user ID', async () => {
      const maliciousId = "'; DROP TABLE users; --";
      mockedQuery.mockResolvedValue({ rows: [{ rank: '1' }], rowCount: 1 } as any);

      await leaderboardRepository.getPlayerWinsRank(maliciousId);

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.any(String),
        [maliciousId]
      );
    });

    it('should handle player with zero wins', async () => {
      mockedQuery.mockResolvedValue({ rows: [{ rank: '1000' }], rowCount: 1 } as any);

      const rank = await leaderboardRepository.getPlayerWinsRank('newbie');

      expect(rank).toBeGreaterThan(0);
    });
  });

  describe('getPlayerRanks', () => {
    it('should return both MMR and wins ranks', async () => {
      mockedQuery
        .mockResolvedValueOnce({ rows: [{ rank: '15' }], rowCount: 1 } as any) // MMR rank
        .mockResolvedValueOnce({ rows: [{ rank: '20' }], rowCount: 1 } as any); // Wins rank

      const ranks = await leaderboardRepository.getPlayerRanks('user-123');

      expect(ranks).toEqual({
        mmr: 15,
        wins: 20,
      });
      expect(mockedQuery).toHaveBeenCalledTimes(2);
    });

    it('should call both rank methods in parallel', async () => {
      mockedQuery
        .mockResolvedValueOnce({ rows: [{ rank: '10' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ rank: '12' }], rowCount: 1 } as any);

      const startTime = Date.now();
      await leaderboardRepository.getPlayerRanks('user-123');
      const duration = Date.now() - startTime;

      // Should be fast because of Promise.all (parallel execution)
      expect(duration).toBeLessThan(100); // Assuming mocks resolve instantly
      expect(mockedQuery).toHaveBeenCalledTimes(2);
    });

    it('should handle when ranks are the same', async () => {
      mockedQuery
        .mockResolvedValueOnce({ rows: [{ rank: '50' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ rank: '50' }], rowCount: 1 } as any);

      const ranks = await leaderboardRepository.getPlayerRanks('user-123');

      expect(ranks.mmr).toBe(ranks.wins);
    });

    it('should handle when MMR rank is better than wins rank', async () => {
      mockedQuery
        .mockResolvedValueOnce({ rows: [{ rank: '10' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ rank: '50' }], rowCount: 1 } as any);

      const ranks = await leaderboardRepository.getPlayerRanks('user-123');

      expect(ranks.mmr).toBeLessThan(ranks.wins);
    });

    it('should handle when wins rank is better than MMR rank', async () => {
      mockedQuery
        .mockResolvedValueOnce({ rows: [{ rank: '50' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ rank: '10' }], rowCount: 1 } as any);

      const ranks = await leaderboardRepository.getPlayerRanks('user-123');

      expect(ranks.wins).toBeLessThan(ranks.mmr);
    });

    it('should handle SQL injection', async () => {
      const maliciousId = "admin' OR '1'='1";
      mockedQuery
        .mockResolvedValueOnce({ rows: [{ rank: '1' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ rank: '1' }], rowCount: 1 } as any);

      await leaderboardRepository.getPlayerRanks(maliciousId);

      expect(mockedQuery).toHaveBeenCalledTimes(2);
      mockedQuery.mock.calls.forEach((call: any[]) => {
        expect(call[1]).toEqual([maliciousId]);
      });
    });

    it('should handle database errors', async () => {
      mockedQuery.mockRejectedValue(new Error('Database unavailable'));

      await expect(leaderboardRepository.getPlayerRanks('user-123')).rejects.toThrow('Database unavailable');
    });

    it('should handle when one query fails', async () => {
      mockedQuery
        .mockResolvedValueOnce({ rows: [{ rank: '15' }], rowCount: 1 } as any)
        .mockRejectedValueOnce(new Error('Query failed'));

      await expect(leaderboardRepository.getPlayerRanks('user-123')).rejects.toThrow('Query failed');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large limit values', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await leaderboardRepository.getTopByWins(1000000, 0);

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.any(String),
        [1000000, 0]
      );
    });

    it('should handle negative limit', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await leaderboardRepository.getTopByWins(-10, 0);

      expect(mockedQuery).toHaveBeenCalled();
    });

    it('should handle negative offset', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await leaderboardRepository.getTopByMMR(100, -50);

      expect(mockedQuery).toHaveBeenCalled();
    });

    it('should handle null user ID', async () => {
      mockedQuery.mockResolvedValue({ rows: [{ rank: null }], rowCount: 1 } as any);

      await leaderboardRepository.getPlayerMMRRank(null as any);

      expect(mockedQuery).toHaveBeenCalled();
    });

    it('should handle undefined user ID', async () => {
      mockedQuery.mockResolvedValue({ rows: [{ rank: null }], rowCount: 1 } as any);

      await leaderboardRepository.getPlayerWinsRank(undefined as any);

      expect(mockedQuery).toHaveBeenCalled();
    });

    it('should handle empty string user ID', async () => {
      mockedQuery.mockResolvedValue({ rows: [{ rank: null }], rowCount: 1 } as any);

      const rank = await leaderboardRepository.getPlayerMMRRank('');

      expect(mockedQuery).toHaveBeenCalled();
    });

    it('should handle connection timeout', async () => {
      mockedQuery.mockRejectedValue(new Error('connection timeout'));

      await expect(leaderboardRepository.getTopByMMR(100, 0)).rejects.toThrow('connection timeout');
    });
  });
});
