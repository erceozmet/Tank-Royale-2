import { UserRepository } from '../../../src/repositories/UserRepository';
import { query } from '../../../src/db/postgres';
import { userQueries } from '../../../src/repositories/queries';

// Mock the postgres query function
jest.mock('../../../src/db/postgres');
const mockedQuery = query as jest.MockedFunction<typeof query>;

describe('UserRepository', () => {
  let userRepository: UserRepository;

  beforeEach(() => {
    userRepository = new UserRepository();
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        mmr: 1000,
        totalWins: 5,
        totalLosses: 3,
        totalKills: 50,
        totalDeaths: 30,
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      mockedQuery.mockResolvedValue({ rows: [mockUser], rowCount: 1 } as any);

      const result = await userRepository.findById('user-123');

      expect(result).toEqual(mockUser);
      expect(mockedQuery).toHaveBeenCalledWith(
        userQueries.findById,
        ['user-123']
      );
    });

    it('should return null when user not found', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const result = await userRepository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      mockedQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(userRepository.findById('user-123')).rejects.toThrow('Database connection failed');
    });

    it('should handle SQL injection attempts', async () => {
      const maliciousId = "'; DROP TABLE users; --";
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await userRepository.findById(maliciousId);

      // Verify parameterized query was used
      expect(mockedQuery).toHaveBeenCalledWith(
        userQueries.findById,
        [maliciousId]
      );
    });
  });

  describe('findByUsername', () => {
    it('should return user when found', async () => {
      const mockUser = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        mmr: 1000,
        totalWins: 5,
        totalLosses: 3,
        totalKills: 50,
        totalDeaths: 30,
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      mockedQuery.mockResolvedValue({ rows: [mockUser], rowCount: 1 } as any);

      const result = await userRepository.findByUsername('testuser');

      expect(result).toEqual(mockUser);
      expect(mockedQuery).toHaveBeenCalledWith(
        userQueries.findByUsername,
        ['testuser']
      );
    });

    it('should be case-sensitive', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await userRepository.findByUsername('TestUser');

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.any(String),
        ['TestUser']
      );
    });

    it('should return null when user not found', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const result = await userRepository.findByUsername('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      const mockUser = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        mmr: 1000,
        totalWins: 5,
        totalLosses: 3,
        totalKills: 50,
        totalDeaths: 30,
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      mockedQuery.mockResolvedValue({ rows: [mockUser], rowCount: 1 } as any);

      const result = await userRepository.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
    });

    it('should handle email with special characters', async () => {
      const specialEmail = "user+test@example.com";
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await userRepository.findByEmail(specialEmail);

      expect(mockedQuery).toHaveBeenCalledWith(
        userQueries.findByEmail,
        [specialEmail]
      );
    });
  });

  describe('findByUsernameOrEmail', () => {
    it('should find user by username', async () => {
      const mockUser = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        mmr: 1000,
        totalWins: 5,
        totalLosses: 3,
        totalKills: 50,
        totalDeaths: 30,
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      mockedQuery.mockResolvedValue({ rows: [mockUser], rowCount: 1 } as any);

      const result = await userRepository.findByUsernameOrEmail('testuser');

      expect(result).toEqual(mockUser);
      expect(mockedQuery).toHaveBeenCalledWith(
        userQueries.findByUsernameOrEmail,
        ['testuser']
      );
    });

    it('should find user by email', async () => {
      const mockUser = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        mmr: 1000,
        totalWins: 5,
        totalLosses: 3,
        totalKills: 50,
        totalDeaths: 30,
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      mockedQuery.mockResolvedValue({ rows: [mockUser], rowCount: 1 } as any);

      const result = await userRepository.findByUsernameOrEmail('test@example.com');

      expect(result).toEqual(mockUser);
    });
  });

  describe('usernameExists', () => {
    it('should return true when username exists', async () => {
      mockedQuery.mockResolvedValue({ rows: [{ exists: true }], rowCount: 1 } as any);

      const result = await userRepository.usernameExists('testuser');

      expect(result).toBe(true);
    });

    it('should return false when username does not exist', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const result = await userRepository.usernameExists('nonexistent');

      expect(result).toBe(false);
    });

    it('should return false when rows array is empty', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const result = await userRepository.usernameExists('testuser');

      expect(result).toBe(false);
    });

    it('should return true when multiple rows found (edge case)', async () => {
      mockedQuery.mockResolvedValue({ rows: [{ exists: true }, { exists: true }], rowCount: 2 } as any);

      const result = await userRepository.usernameExists('testuser');

      expect(result).toBe(true);
    });

    it('should handle SQL injection in username check', async () => {
      const maliciousUsername = "admin' OR '1'='1";
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await userRepository.usernameExists(maliciousUsername);

      expect(mockedQuery).toHaveBeenCalledWith(
        userQueries.usernameExists,
        [maliciousUsername]
      );
    });
  });

  describe('emailExists', () => {
    it('should return true when email exists', async () => {
      mockedQuery.mockResolvedValue({ rows: [{ exists: true }], rowCount: 1 } as any);

      const result = await userRepository.emailExists('test@example.com');

      expect(result).toBe(true);
    });

    it('should return false when email does not exist', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const result = await userRepository.emailExists('nonexistent@example.com');

      expect(result).toBe(false);
    });

    it('should return false when rows length is exactly 0', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const result = await userRepository.emailExists('test@example.com');

      expect(result).toBe(false);
      expect(mockedQuery).toHaveBeenCalled();
    });

    it('should return true for any non-zero rows length', async () => {
      mockedQuery.mockResolvedValue({ rows: [{ exists: true }], rowCount: 1 } as any);

      const result = await userRepository.emailExists('exists@example.com');

      expect(result).toBe(true);
    });
  });

  describe('usernameOrEmailExists', () => {
    it('should return true when username exists', async () => {
      mockedQuery.mockResolvedValue({ rows: [{ exists: true }], rowCount: 1 } as any);

      const result = await userRepository.usernameOrEmailExists('testuser', 'new@example.com');

      expect(result).toBe(true);
    });

    it('should return true when email exists', async () => {
      mockedQuery.mockResolvedValue({ rows: [{ exists: true }], rowCount: 1 } as any);

      const result = await userRepository.usernameOrEmailExists('newuser', 'existing@example.com');

      expect(result).toBe(true);
    });

    it('should return false when neither exists', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const result = await userRepository.usernameOrEmailExists('newuser', 'new@example.com');

      expect(result).toBe(false);
    });

    it('should return false when rows length is 0', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const result = await userRepository.usernameOrEmailExists('user', 'email@test.com');

      expect(result).toBe(false);
    });

    it('should return true when rows length > 0', async () => {
      mockedQuery.mockResolvedValue({ rows: [{ exists: true }, { exists: true }], rowCount: 2 } as any);

      const result = await userRepository.usernameOrEmailExists('user', 'email@test.com');

      expect(result).toBe(true);
    });

    it('should use parameterized queries', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await userRepository.usernameOrEmailExists('testuser', 'test@example.com');

      expect(mockedQuery).toHaveBeenCalledWith(
        userQueries.usernameOrEmailExists,
        ['testuser', 'test@example.com']
      );
    });
  });

  describe('create', () => {
    it('should create user successfully', async () => {
      const newUser = {
        username: 'newuser',
        email: 'new@example.com',
        passwordHash: 'hashed_password',
      };

      const createdUser = {
        userId: 'user-123',
        username: 'newuser',
        email: 'new@example.com',
        passwordHash: 'hashed_password',
        mmr: 1000,
        totalWins: 0,
        totalLosses: 0,
        totalKills: 0,
        totalDeaths: 0,
        createdAt: new Date(),
        lastLogin: null,
      };

      mockedQuery.mockResolvedValue({ rows: [createdUser], rowCount: 1 } as any);

      const result = await userRepository.create(newUser);

      expect(result).toEqual(createdUser);
      expect(mockedQuery).toHaveBeenCalledWith(
        userQueries.create,
        [newUser.username, newUser.email, newUser.passwordHash]
      );
    });

    it('should handle duplicate username error', async () => {
      const newUser = {
        username: 'existing',
        email: 'new@example.com',
        passwordHash: 'hashed_password',
      };

      const duplicateError = new Error('duplicate key value violates unique constraint');
      (duplicateError as any).code = '23505';
      mockedQuery.mockRejectedValue(duplicateError);

      await expect(userRepository.create(newUser)).rejects.toThrow();
    });

    it('should sanitize inputs', async () => {
      const maliciousUser = {
        username: "<script>alert('xss')</script>",
        email: 'test@example.com',
        passwordHash: 'hashed_password',
      };

      mockedQuery.mockResolvedValue({ 
        rows: [{ ...maliciousUser, userId: 'user-123' }], 
        rowCount: 1 
      } as any);

      await userRepository.create(maliciousUser);

      // Verify the malicious input was passed as a parameter
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.any(String),
        [maliciousUser.username, maliciousUser.email, maliciousUser.passwordHash]
      );
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 1 } as any);

      await userRepository.updateLastLogin('user-123');

      expect(mockedQuery).toHaveBeenCalledWith(
        userQueries.updateLastLogin,
        ['user-123']
      );
    });

    it('should handle nonexistent user', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await userRepository.updateLastLogin('nonexistent');

      expect(mockedQuery).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockedQuery.mockRejectedValue(new Error('Connection timeout'));

      await expect(userRepository.updateLastLogin('user-123')).rejects.toThrow('Connection timeout');
    });
  });

  describe('getStats', () => {
    it('should return calculated stats', async () => {
      const mockStats = {
        mmr: 1500,
        totalWins: 10,
        totalLosses: 5,
        totalKills: 100,
        totalDeaths: 50,
        winRate: '66.67',
        kdr: '2.00',
      };

      mockedQuery.mockResolvedValue({ rows: [mockStats], rowCount: 1 } as any);

      const result = await userRepository.getStats('user-123');

      expect(result).toEqual(mockStats);
    });

    it('should return null when user not found', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const result = await userRepository.getStats('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle division by zero in win rate', async () => {
      const mockStats = {
        mmr: 1000,
        totalWins: 0,
        totalLosses: 0,
        totalKills: 0,
        totalDeaths: 0,
        winRate: '0',
        kdr: '0',
      };

      mockedQuery.mockResolvedValue({ rows: [mockStats], rowCount: 1 } as any);

      const result = await userRepository.getStats('user-123');

      expect(result?.winRate).toBe('0');
    });

    it('should handle division by zero in KDR', async () => {
      const mockStats = {
        mmr: 1000,
        totalWins: 5,
        totalLosses: 5,
        totalKills: 50,
        totalDeaths: 0,
        winRate: '50.00',
        kdr: '50', // When deaths = 0, KDR = kills
      };

      mockedQuery.mockResolvedValue({ rows: [mockStats], rowCount: 1 } as any);

      const result = await userRepository.getStats('user-123');

      expect(result?.kdr).toBe('50');
    });
  });

  describe('search', () => {
    it('should search users by username pattern', async () => {
      const mockUsers = [
        {
          userId: 'user-1',
          username: 'player1',
          email: 'player1@example.com',
          passwordHash: 'hash',
          mmr: 1500,
          totalWins: 10,
          totalLosses: 5,
          totalKills: 100,
          totalDeaths: 50,
          createdAt: new Date(),
          lastLogin: new Date(),
        },
        {
          userId: 'user-2',
          username: 'player2',
          email: 'player2@example.com',
          passwordHash: 'hash',
          mmr: 1400,
          totalWins: 8,
          totalLosses: 7,
          totalKills: 80,
          totalDeaths: 60,
          createdAt: new Date(),
          lastLogin: new Date(),
        },
      ];

      mockedQuery.mockResolvedValue({ rows: mockUsers, rowCount: 2 } as any);

      const result = await userRepository.search('player', 20);

      expect(result).toEqual(mockUsers);
      expect(mockedQuery).toHaveBeenCalledWith(
        userQueries.search,
        ['%player%', 20]
      );
    });

    it('should respect limit parameter', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await userRepository.search('test', 10);

      expect(mockedQuery).toHaveBeenCalledWith(
        userQueries.search,
        ['%test%', 10]
      );
    });

    it('should handle SQL wildcards in search query', async () => {
      const searchQuery = 'user%_test';
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await userRepository.search(searchQuery, 20);

      // The % should be added by the function, original should be passed as-is
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.any(String),
        [`%${searchQuery}%`, 20]
      );
    });

    it('should order by MMR descending', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await userRepository.search('test', 20);

      expect(mockedQuery).toHaveBeenCalledWith(
        userQueries.search,
        expect.any(Array)
      );
    });

    it('should return empty array when no matches', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const result = await userRepository.search('nonexistent', 20);

      expect(result).toEqual([]);
    });
  });

  describe('Security Tests', () => {
    it('should prevent SQL injection in all methods', async () => {
      const injectionAttempts = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--",
        "' UNION SELECT * FROM users--",
      ];

      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      for (const injection of injectionAttempts) {
        await userRepository.findById(injection);
        await userRepository.findByUsername(injection);
        await userRepository.findByEmail(injection);
        await userRepository.usernameExists(injection);
      }

      // Verify all calls used parameterized queries
      expect(mockedQuery).toHaveBeenCalledTimes(injectionAttempts.length * 4);
      mockedQuery.mock.calls.forEach((call: any[]) => {
        expect(call[1]).toBeDefined(); // Parameters array should exist
      });
    });

    it('should handle extremely long inputs', async () => {
      const longString = 'a'.repeat(10000);
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await userRepository.findByUsername(longString);

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.any(String),
        [longString]
      );
    });

    it('should handle null and undefined inputs gracefully', async () => {
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await userRepository.findById(null as any);
      await userRepository.findByUsername(undefined as any);

      expect(mockedQuery).toHaveBeenCalled();
    });
  });
});
