import { MatchRepository } from '../../../src/repositories/MatchRepository';
import { query } from '../../../src/db/postgres';

// Mock the postgres query function
jest.mock('../../../src/db/postgres');
const mockedQuery = query as jest.MockedFunction<typeof query>;

describe('MatchRepository', () => {
  let matchRepository: MatchRepository;

  beforeEach(() => {
    matchRepository = new MatchRepository();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create match successfully', async () => {
      const params = {
        mapName: 'arena_1',
        playerCount: 4,
      };

      const createdMatch = {
        matchId: 'match-123',
        mapName: params.mapName,
        playerCount: params.playerCount,
        startTime: new Date(),
        endTime: null,
        duration: null,
      };

      mockedQuery.mockResolvedValue({ rows: [createdMatch], rowCount: 1 } as any);

      const result = await matchRepository.create(params);

      expect(result).toEqual(createdMatch);
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO matches'),
        [params.mapName, params.playerCount]
      );
    });

    it('should handle minimum players (2)', async () => {
      const params = {
        mapName: 'arena_1',
        playerCount: 2,
      };

      mockedQuery.mockResolvedValue({
        rows: [{ matchId: 'match-123', ...params, startTime: new Date(), endTime: null, duration: null }],
        rowCount: 1
      } as any);

      await matchRepository.create(params);

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.any(String),
        [params.mapName, params.playerCount]
      );
    });

    it('should handle maximum players (16)', async () => {
      const params = {
        mapName: 'large_arena',
        playerCount: 16,
      };

      mockedQuery.mockResolvedValue({
        rows: [{ matchId: 'match-123', ...params, startTime: new Date(), endTime: null, duration: null }],
        rowCount: 1
      } as any);

      await matchRepository.create(params);

      expect(mockedQuery).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const params = {
        mapName: 'arena_1',
        playerCount: 2,
      };

      mockedQuery.mockRejectedValue(new Error('Foreign key violation'));

      await expect(matchRepository.create(params)).rejects.toThrow('Foreign key violation');
    });

    it('should handle SQL injection in map name', async () => {
      const params = {
        mapName: "arena'; DROP TABLE matches; --",
        playerCount: 4,
      };

      mockedQuery.mockResolvedValue({
        rows: [{ matchId: 'match-123', ...params, startTime: new Date(), endTime: null, duration: null }],
        rowCount: 1
      } as any);

      await matchRepository.create(params);

      // Verify parameterized query
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.any(String),
        [params.mapName, params.playerCount]
      );
    });
  });

  describe('findById', () => {
    it('should return match when found', async () => {
      const mockMatch = {
        matchId: 'match-123',
        mapName: 'arena_1',
        playerCount: 4,
        startTime: new Date(),
        endTime: new Date(),
        duration: 900,
      };

      mockedQuery.mockResolvedValue({ rows: [mockMatch], rowCount: 1 } as any);

      const result = await matchRepository.findById('match-123');

      expect(result).toEqual(mockMatch);
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE match_id = $1'),
        ['match-123']
      );
    });

    it('should return null when match not found', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const result = await matchRepository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle SQL injection attempts', async () => {
      const maliciousId = "'; DELETE FROM matches; --";
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await matchRepository.findById(maliciousId);

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE match_id = $1'),
        [maliciousId]
      );
    });
  });

  describe('endMatch', () => {
    it('should end match successfully', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 1 } as any);

      await matchRepository.endMatch('match-123');

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE matches'),
        ['match-123']
      );
    });

    it('should set end time and calculate duration', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 1 } as any);

      await matchRepository.endMatch('match-123');

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('duration = EXTRACT(EPOCH FROM'),
        ['match-123']
      );
    });

    it('should handle nonexistent match', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await matchRepository.endMatch('nonexistent');

      expect(mockedQuery).toHaveBeenCalled();
    });

    it('should handle SQL injection in match ID', async () => {
      const maliciousId = "match-123'; DROP TABLE match_results; --";
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await matchRepository.endMatch(maliciousId);

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.any(String),
        [maliciousId]
      );
    });
  });

  describe('getUserMatchHistory', () => {
    it('should return match history with results', async () => {
      const mockRows = [
        {
          matchId: 'match-1',
          startTime: new Date('2024-01-01T00:00:00Z'),
          endTime: new Date('2024-01-01T00:15:00Z'),
          mapName: 'arena_1',
          playerCount: 2,
          duration: 900,
          placement: 1,
          kills: 5,
          damageDealt: 1500,
          survivalTime: 600,
          lootCollected: 10,
          mmrChange: 25,
        },
        {
          matchId: 'match-2',
          startTime: new Date('2024-01-01T01:00:00Z'),
          endTime: new Date('2024-01-01T01:20:00Z'),
          mapName: 'arena_2',
          playerCount: 4,
          duration: 1200,
          placement: 2,
          kills: 3,
          damageDealt: 1000,
          survivalTime: 500,
          lootCollected: 8,
          mmrChange: 10,
        },
      ];

      const expectedResult = [
        {
          matchId: 'match-1',
          startTime: new Date('2024-01-01T00:00:00Z'),
          endTime: new Date('2024-01-01T00:15:00Z'),
          mapName: 'arena_1',
          playerCount: 2,
          duration: 900,
          performance: {
            placement: 1,
            kills: 5,
            damageDealt: 1500,
            survivalTime: 600,
            lootCollected: 10,
            mmrChange: 25,
          },
        },
        {
          matchId: 'match-2',
          startTime: new Date('2024-01-01T01:00:00Z'),
          endTime: new Date('2024-01-01T01:20:00Z'),
          mapName: 'arena_2',
          playerCount: 4,
          duration: 1200,
          performance: {
            placement: 2,
            kills: 3,
            damageDealt: 1000,
            survivalTime: 500,
            lootCollected: 8,
            mmrChange: 10,
          },
        },
      ];

      mockedQuery.mockResolvedValue({ rows: mockRows, rowCount: 2 } as any);

      const result = await matchRepository.getUserMatchHistory('user-1', 10, 0);

      expect(result).toEqual(expectedResult);
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM match_results mr'),
        ['user-1', 10, 0]
      );
    });

    it('should respect limit and offset', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await matchRepository.getUserMatchHistory('user-1', 5, 10);

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        ['user-1', 5, 10]
      );
    });

    it('should order by most recent first', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await matchRepository.getUserMatchHistory('user-1', 10, 0);

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY m.start_time DESC'),
        expect.any(Array)
      );
    });

    it('should return empty array when no matches', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const result = await matchRepository.getUserMatchHistory('user-1', 10, 0);

      expect(result).toEqual([]);
    });

    it('should handle SQL injection in user ID', async () => {
      const maliciousId = "user-1' OR '1'='1";
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await matchRepository.getUserMatchHistory(maliciousId, 10, 0);

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.any(String),
        [maliciousId, 10, 0]
      );
    });

    it('should handle negative offset', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await matchRepository.getUserMatchHistory('user-1', 10, -5);

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.any(String),
        ['user-1', 10, -5]
      );
    });

    it('should handle very large limit', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await matchRepository.getUserMatchHistory('user-1', 1000000, 0);

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.any(String),
        ['user-1', 1000000, 0]
      );
    });
  });

  describe('insertResult', () => {
    it('should insert match result successfully', async () => {
      const resultData = {
        matchId: 'match-123',
        userId: 'user-1',
        placement: 1,
        kills: 5,
        damageDealt: 1500,
        survivalTime: 600,
        lootCollected: 10,
        mmrChange: 25,
      };

      mockedQuery.mockResolvedValue({ rows: [], rowCount: 1 } as any);

      await matchRepository.insertResult(resultData);

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO match_results'),
        [
          resultData.matchId,
          resultData.userId,
          resultData.placement,
          resultData.kills,
          resultData.damageDealt,
          resultData.survivalTime,
          resultData.lootCollected,
          resultData.mmrChange,
        ]
      );
    });

    it('should handle multiple results for same match', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 1 } as any);

      await matchRepository.insertResult({
        matchId: 'match-123',
        userId: 'user-1',
        placement: 1,
        kills: 5,
        damageDealt: 1500,
        survivalTime: 600,
        lootCollected: 10,
        mmrChange: 25,
      });

      await matchRepository.insertResult({
        matchId: 'match-123',
        userId: 'user-2',
        placement: 2,
        kills: 3,
        damageDealt: 1000,
        survivalTime: 500,
        lootCollected: 8,
        mmrChange: 10,
      });

      expect(mockedQuery).toHaveBeenCalledTimes(2);
    });

    it('should handle negative MMR change', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 1 } as any);

      await matchRepository.insertResult({
        matchId: 'match-123',
        userId: 'user-1',
        placement: 10,
        kills: 0,
        damageDealt: 100,
        survivalTime: 120,
        lootCollected: 2,
        mmrChange: -15,
      });

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([-15])
      );
    });

    it('should handle database constraint violations', async () => {
      const duplicateError = new Error('duplicate key value violates unique constraint');
      (duplicateError as any).code = '23505';
      mockedQuery.mockRejectedValue(duplicateError);

      await expect(
        matchRepository.insertResult({
          matchId: 'match-123',
          userId: 'user-1',
          placement: 1,
          kills: 5,
          damageDealt: 1500,
          survivalTime: 600,
          lootCollected: 10,
          mmrChange: 25,
        })
      ).rejects.toThrow();
    });

    it('should handle foreign key violations', async () => {
      const fkError = new Error('foreign key violation');
      (fkError as any).code = '23503';
      mockedQuery.mockRejectedValue(fkError);

      await expect(
        matchRepository.insertResult({
          matchId: 'nonexistent-match',
          userId: 'user-1',
          placement: 1,
          kills: 5,
          damageDealt: 1500,
          survivalTime: 600,
          lootCollected: 10,
          mmrChange: 25,
        })
      ).rejects.toThrow();
    });
  });

  describe('getMatchResults', () => {
    it('should return all results for a match', async () => {
      const mockResults = [
        {
          userId: 'user-1',
          placement: 1,
          kills: 5,
          deaths: 1,
          damageDealt: 1500,
          damageTaken: 500,
          mmrChange: 25,
        },
        {
          userId: 'user-2',
          placement: 2,
          kills: 3,
          deaths: 1,
          damageDealt: 1000,
          damageTaken: 800,
          mmrChange: 10,
        },
      ];

      mockedQuery.mockResolvedValue({ rows: mockResults, rowCount: 2 } as any);

      const result = await matchRepository.getMatchResults('match-123');

      expect(result).toEqual(mockResults);
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE match_id = $1'),
        ['match-123']
      );
    });

    it('should order by placement', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await matchRepository.getMatchResults('match-123');

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY placement'),
        expect.any(Array)
      );
    });

    it('should return empty array when no results', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const result = await matchRepository.getMatchResults('match-123');

      expect(result).toEqual([]);
    });

    it('should handle SQL injection in match ID', async () => {
      const maliciousId = "match-123'; DELETE FROM match_results; --";
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await matchRepository.getMatchResults(maliciousId);

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.any(String),
        [maliciousId]
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values gracefully', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await matchRepository.findById(null as any);
      await matchRepository.endMatch(null as any);
      await matchRepository.getMatchResults(null as any);

      expect(mockedQuery).toHaveBeenCalled();
    });

    it('should handle undefined values gracefully', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await matchRepository.findById(undefined as any);
      await matchRepository.getUserMatchHistory(undefined as any, 10, 0);

      expect(mockedQuery).toHaveBeenCalled();
    });

    it('should handle empty string IDs', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await matchRepository.findById('');
      await matchRepository.endMatch('');

      expect(mockedQuery).toHaveBeenCalled();
    });

    it('should handle database connection timeout', async () => {
      mockedQuery.mockRejectedValue(new Error('connection timeout'));

      await expect(matchRepository.findById('match-123')).rejects.toThrow('connection timeout');
    });
  });
});
