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
