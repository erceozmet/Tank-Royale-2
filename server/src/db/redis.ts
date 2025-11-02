import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

/**
 * Initialize Redis connection
 * Call this once at server startup
 */
export async function initRedis(config?: RedisConfig): Promise<RedisClientType> {
  if (redisClient) {
    console.log('⚠️  Redis client already initialized');
    return redisClient;
  }

  const redisConfig: RedisConfig = config || {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  };

  redisClient = createClient({
    socket: {
      host: redisConfig.host,
      port: redisConfig.port,
    },
    password: redisConfig.password,
  });

  // Handle errors
  redisClient.on('error', (err) => {
    console.error('❌ Redis error:', err);
  });

  redisClient.on('connect', () => {
    console.log('✅ Redis connected successfully');
  });

  // Connect
  await redisClient.connect();

  return redisClient;
}

/**
 * Get the Redis client instance
 */
export function getRedis(): RedisClientType {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initRedis() first.');
  }
  return redisClient;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('✅ Redis connection closed');
  }
}

/**
 * Health check - verify Redis is responsive
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const redis = getRedis();
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (error) {
    console.error('❌ Redis health check failed:', error);
    return false;
  }
}

/**
 * Session management helpers
 */
export class RedisSessionManager {
  private static SESSION_PREFIX = 'session:';
  private static SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

  /**
   * Store user session
   */
  static async setSession(userId: string, sessionData: Record<string, unknown>, redis?: RedisClientType): Promise<void> {
    const client = redis || getRedis();
    const key = `${this.SESSION_PREFIX}${userId}`;
    await client.setEx(key, this.SESSION_TTL, JSON.stringify(sessionData));
  }

  /**
   * Get user session
   */
  static async getSession(userId: string, redis?: RedisClientType): Promise<Record<string, unknown> | null> {
    const client = redis || getRedis();
    const key = `${this.SESSION_PREFIX}${userId}`;
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Delete user session (logout)
   */
  static async deleteSession(userId: string, redis?: RedisClientType): Promise<void> {
    const client = redis || getRedis();
    const key = `${this.SESSION_PREFIX}${userId}`;
    await client.del(key);
  }

  /**
   * Refresh session TTL
   */
  static async refreshSession(userId: string, redis?: RedisClientType): Promise<void> {
    const client = redis || getRedis();
    const key = `${this.SESSION_PREFIX}${userId}`;
    await client.expire(key, this.SESSION_TTL);
  }
}

/**
 * Matchmaking queue helpers
 */
export class RedisMatchmakingQueue {
  private static QUEUE_KEY = 'matchmaking:queue';
  private static PLAYER_STATE_PREFIX = 'matchmaking:player:';

  /**
   * Add player to matchmaking queue
   * Uses sorted set with MMR as score for efficient range queries
   */
  static async addToQueue(userId: string, mmr: number, redis?: RedisClientType): Promise<void> {
    const client = redis || getRedis();
    
    // Add to sorted set (score = MMR)
    await client.zAdd(this.QUEUE_KEY, {
      score: mmr,
      value: userId,
    });

    // Store player state with timestamp
    const playerKey = `${this.PLAYER_STATE_PREFIX}${userId}`;
    await client.setEx(
      playerKey,
      300, // 5 minutes timeout
      JSON.stringify({
        userId,
        mmr,
        joinedAt: Date.now(),
      })
    );
  }

  /**
   * Remove player from matchmaking queue
   */
  static async removeFromQueue(userId: string, redis?: RedisClientType): Promise<void> {
    const client = redis || getRedis();
    
    // Remove from sorted set
    await client.zRem(this.QUEUE_KEY, userId);

    // Delete player state
    const playerKey = `${this.PLAYER_STATE_PREFIX}${userId}`;
    await client.del(playerKey);
  }

  /**
   * Get players in MMR range
   */
  static async getPlayersInRange(minMMR: number, maxMMR: number, redis?: RedisClientType): Promise<string[]> {
    const client = redis || getRedis();
    return await client.zRangeByScore(this.QUEUE_KEY, minMMR, maxMMR);
  }

  /**
   * Get all players in queue
   */
  static async getAllPlayers(redis?: RedisClientType): Promise<Array<{ userId: string; mmr: number }>> {
    const client = redis || getRedis();
    const players = await client.zRangeWithScores(this.QUEUE_KEY, 0, -1);
    return players.map(p => ({
      userId: p.value,
      mmr: p.score,
    }));
  }

  /**
   * Get queue size
   */
  static async getQueueSize(redis?: RedisClientType): Promise<number> {
    const client = redis || getRedis();
    return await client.zCard(this.QUEUE_KEY);
  }

  /**
   * Get player's queue position
   */
  static async getPlayerRank(userId: string, redis?: RedisClientType): Promise<number | null> {
    const client = redis || getRedis();
    const rank = await client.zRank(this.QUEUE_KEY, userId);
    return rank !== null ? rank + 1 : null;
  }
}

/**
 * Leaderboard helpers
 */
export class RedisLeaderboard {
  private static WINS_LEADERBOARD = 'leaderboard:wins';
  private static MMR_LEADERBOARD = 'leaderboard:mmr';

  /**
   * Update player wins on leaderboard
   */
  static async updateWins(userId: string, wins: number, redis?: RedisClientType): Promise<void> {
    const client = redis || getRedis();
    await client.zAdd(this.WINS_LEADERBOARD, {
      score: wins,
      value: userId,
    });
  }

  /**
   * Update player MMR on leaderboard
   */
  static async updateMMR(userId: string, mmr: number, redis?: RedisClientType): Promise<void> {
    const client = redis || getRedis();
    await client.zAdd(this.MMR_LEADERBOARD, {
      score: mmr,
      value: userId,
    });
  }

  /**
   * Get top players by wins
   */
  static async getTopByWins(limit: number = 100, redis?: RedisClientType): Promise<Array<{ userId: string; wins: number }>> {
    const client = redis || getRedis();
    const players = await client.zRangeWithScores(this.WINS_LEADERBOARD, 0, limit - 1, {
      REV: true, // Descending order
    });
    return players.map(p => ({
      userId: p.value,
      wins: p.score,
    }));
  }

  /**
   * Get top players by MMR
   */
  static async getTopByMMR(limit: number = 100, redis?: RedisClientType): Promise<Array<{ userId: string; mmr: number }>> {
    const client = redis || getRedis();
    const players = await client.zRangeWithScores(this.MMR_LEADERBOARD, 0, limit - 1, {
      REV: true, // Descending order
    });
    return players.map(p => ({
      userId: p.value,
      mmr: p.score,
    }));
  }

  /**
   * Get player's wins rank
   */
  static async getWinsRank(userId: string, redis?: RedisClientType): Promise<number | null> {
    const client = redis || getRedis();
    const rank = await client.zRevRank(this.WINS_LEADERBOARD, userId);
    return rank !== null ? rank + 1 : null;
  }

  /**
   * Get player's MMR rank
   */
  static async getMMRRank(userId: string, redis?: RedisClientType): Promise<number | null> {
    const client = redis || getRedis();
    const rank = await client.zRevRank(this.MMR_LEADERBOARD, userId);
    return rank !== null ? rank + 1 : null;
  }
}
