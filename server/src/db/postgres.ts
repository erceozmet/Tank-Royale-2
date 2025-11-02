import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// PostgreSQL connection pool
let pool: Pool | null = null;

interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number; // Max connections in pool
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

/**
 * Initialize PostgreSQL connection pool
 * Call this once at server startup
 */
export async function initPostgres(config?: PostgresConfig): Promise<Pool> {
  if (pool) {
    console.log('⚠️  PostgreSQL pool already initialized');
    return pool;
  }

  const pgConfig: PostgresConfig = config || {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'tank_royale',
    user: process.env.POSTGRES_USER || 'tank_user',
    password: process.env.POSTGRES_PASSWORD || 'tank_pass_dev_only',
    max: 20, // Max 20 connections
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 2000, // Fail after 2s if can't connect
  };

  pool = new Pool(pgConfig);

  // Test connection
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected successfully');
    
    // Check if schema exists
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      ) as schema_exists;
    `);

    if (!result.rows[0].schema_exists) {
      console.log('⚠️  Database schema not initialized. Tables are missing.');
      console.log('💡 Run the schema.sql file in pgAdmin or via psql to create tables.');
    } else {
      console.log('✅ Database schema verified (tables exist)');
    }

    client.release();
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error);
    throw error;
  }

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('❌ Unexpected PostgreSQL pool error:', err);
  });

  return pool;
}

/**
 * Get the PostgreSQL pool instance
 * Use this for queries
 */
export function getPool(): Pool {
  if (!pool) {
    throw new Error('PostgreSQL pool not initialized. Call initPostgres() first.');
  }
  return pool;
}

/**
 * Execute a query with the pool
 * Convenience wrapper around pool.query()
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const pool = getPool();
  const start = Date.now();
  
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries (> 100ms)
    if (duration > 100) {
      console.warn(`[DB] Slow query (${duration}ms): ${text.substring(0, 80)}...`);
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[DB] Query error (${duration}ms):`, error);
    console.error('[DB] Query:', text);
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 * Remember to release it with client.release()
 */
export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return await pool.connect();
}

/**
 * Execute a transaction with automatic rollback on error
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[DB] Transaction rolled back:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close the PostgreSQL pool
 * Call this on server shutdown
 */
export async function closePostgres(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ PostgreSQL pool closed');
  }
}

/**
 * Health check - verify database is responsive
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW() as current_time');
    return result.rows.length > 0;
  } catch (error) {
    console.error('❌ PostgreSQL health check failed:', error);
    return false;
  }
}
