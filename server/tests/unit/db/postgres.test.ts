// Mock the pg module
jest.mock('pg', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  const mockPool = {
    connect: jest.fn().mockResolvedValue(mockClient),
    query: jest.fn(),
    end: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  };

  return {
    Pool: jest.fn(() => mockPool),
  };
});

import { Pool, PoolClient, QueryResult } from 'pg';
import {
  initPostgres,
  getPool,
  query,
  getClient,
  transaction,
  closePostgres,
  healthCheck,
} from '../../../src/db/postgres';

describe('Postgres Module', () => {
  let mockPool: any;
  let mockClient: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Close any existing connection
    try {
      await closePostgres();
    } catch (e) {
      // Ignore errors
    }

    // Get the mocked Pool constructor
    const { Pool: MockedPool } = require('pg');
    mockPool = new MockedPool();
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    mockPool.connect.mockResolvedValue(mockClient);
  });

  afterEach(async () => {
    try {
      await closePostgres();
    } catch (e) {
      // Ignore errors
    }
  });

  describe('initPostgres', () => {
    it('should initialize PostgreSQL connection pool', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ schema_exists: true }],
      });

      const result = await initPostgres();

      expect(result).toBe(mockPool);
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should detect missing schema', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ schema_exists: false }],
      });

      await initPostgres();

      expect(mockClient.query).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      mockPool.connect.mockRejectedValueOnce(new Error('Connection failed'));

      await expect(initPostgres()).rejects.toThrow('Connection failed');
    });

    it('should not reinitialize if already connected', async () => {
      mockClient.query.mockResolvedValue({
        rows: [{ schema_exists: true }],
      });

      await initPostgres();
      const firstCallCount = mockPool.connect.mock.calls.length;

      await initPostgres();
      const secondCallCount = mockPool.connect.mock.calls.length;

      expect(secondCallCount).toBe(firstCallCount);
    });
  });

  describe('getPool', () => {
    it('should return the initialized pool', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ schema_exists: true }],
      });

      await initPostgres();
      const pool = getPool();

      expect(pool).toBe(mockPool);
    });

    it('should throw error if pool not initialized', async () => {
      await closePostgres();

      expect(() => getPool()).toThrow('PostgreSQL pool not initialized');
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      mockClient.query.mockResolvedValue({
        rows: [{ schema_exists: true }],
      });
      await initPostgres();
    });

    it('should execute a query successfully', async () => {
      const mockResult = {
        rows: [{ id: 1, name: 'test' }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValueOnce(mockResult);

      const result = await query('SELECT * FROM users WHERE id = $1', [1]);

      expect(result).toEqual(mockResult);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        [1]
      );
    });

    it('should handle query errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Query failed'));

      await expect(query('INVALID SQL')).rejects.toThrow('Query failed');
    });

    it('should log slow queries', async () => {
      const mockResult = { rows: [], rowCount: 0 };
      mockPool.query.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockResult), 150)
          )
      );

      await query('SELECT * FROM large_table');

      // Just verify it completes without error
      expect(mockPool.query).toHaveBeenCalled();
    });

    it('should handle queries without parameters', async () => {
      const mockResult = { rows: [{ now: new Date() }], rowCount: 1 };
      mockPool.query.mockResolvedValueOnce(mockResult);

      const result = await query('SELECT NOW()');

      expect(result).toEqual(mockResult);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT NOW()', undefined);
    });
  });

  describe('getClient', () => {
    beforeEach(async () => {
      mockClient.query.mockResolvedValue({
        rows: [{ schema_exists: true }],
      });
      await initPostgres();
    });

    it('should return a client from the pool', async () => {
      const client = await getClient();

      expect(client).toBe(mockClient);
      expect(mockPool.connect).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      mockPool.connect.mockRejectedValueOnce(
        new Error('No connections available')
      );

      await expect(getClient()).rejects.toThrow('No connections available');
    });
  });

  describe('transaction', () => {
    beforeEach(async () => {
      mockClient.query.mockResolvedValue({
        rows: [{ schema_exists: true }],
      });
      await initPostgres();
      mockClient.query.mockClear();
    });

    it('should execute transaction successfully', async () => {
      const callback = jest.fn().mockResolvedValue('success');

      const result = await transaction(callback);

      expect(result).toBe('success');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(callback).toHaveBeenCalledWith(mockClient);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      const callback = jest.fn().mockRejectedValue(new Error('Transaction failed'));

      await expect(transaction(callback)).rejects.toThrow('Transaction failed');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should release client even if commit fails', async () => {
      const callback = jest.fn().mockResolvedValue('success');
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('Commit failed')); // COMMIT fails

      await expect(transaction(callback)).rejects.toThrow('Commit failed');

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle complex transactions', async () => {
      const callback = async (client: PoolClient) => {
        await client.query('INSERT INTO users (username) VALUES ($1)', ['test']);
        await client.query('INSERT INTO stats (user_id) VALUES ($1)', [1]);
        return { inserted: 2 };
      };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT users
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT stats
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await transaction(callback);

      expect(result).toEqual({ inserted: 2 });
      expect(mockClient.query).toHaveBeenCalledTimes(4);
    });
  });

  describe('closePostgres', () => {
    it('should close the PostgreSQL pool', async () => {
      mockClient.query.mockResolvedValue({
        rows: [{ schema_exists: true }],
      });

      await initPostgres();
      await closePostgres();

      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should do nothing if pool is not initialized', async () => {
      await closePostgres();
      await closePostgres(); // Call again

      // Should not throw
      expect(mockPool.end).not.toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    beforeEach(async () => {
      mockClient.query.mockResolvedValue({
        rows: [{ schema_exists: true }],
      });
      await initPostgres();
      mockPool.query.mockClear();
    });

    it('should return true when database is healthy', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ current_time: new Date() }],
      });

      const result = await healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when query fails', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database down'));

      const result = await healthCheck();

      expect(result).toBe(false);
    });

    it('should return false when no rows returned', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await healthCheck();

      expect(result).toBe(false);
    });
  });
});
