import { query } from '../db/postgres';

export interface User {
  userId: string;
  username: string;
  email: string;
  passwordHash: string;
  mmr: number;
  totalWins: number;
  totalLosses: number;
  totalKills: number;
  totalDeaths: number;
  createdAt: Date;
  lastLogin: Date | null;
}

export interface CreateUserParams {
  username: string;
  email: string;
  passwordHash: string;
}

export interface UserStats {
  mmr: number;
  totalWins: number;
  totalLosses: number;
  totalKills: number;
  totalDeaths: number;
  winRate: string;
  kdr: string;
}

export class UserRepository {
  /**
   * Find user by ID
   */
  async findById(userId: string): Promise<User | null> {
    const result = await query(
      `SELECT 
        user_id as "userId",
        username,
        email,
        password_hash as "passwordHash",
        mmr,
        total_wins as "totalWins",
        total_losses as "totalLosses",
        total_kills as "totalKills",
        total_deaths as "totalDeaths",
        created_at as "createdAt",
        last_login as "lastLogin"
       FROM users
       WHERE user_id = $1`,
      [userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    const result = await query(
      `SELECT 
        user_id as "userId",
        username,
        email,
        password_hash as "passwordHash",
        mmr,
        total_wins as "totalWins",
        total_losses as "totalLosses",
        total_kills as "totalKills",
        total_deaths as "totalDeaths",
        created_at as "createdAt",
        last_login as "lastLogin"
       FROM users
       WHERE username = $1`,
      [username]
    );

    return result.rows[0] || null;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await query(
      `SELECT 
        user_id as "userId",
        username,
        email,
        password_hash as "passwordHash",
        mmr,
        total_wins as "totalWins",
        total_losses as "totalLosses",
        total_kills as "totalKills",
        total_deaths as "totalDeaths",
        created_at as "createdAt",
        last_login as "lastLogin"
       FROM users
       WHERE email = $1`,
      [email]
    );

    return result.rows[0] || null;
  }

  /**
   * Find user by username OR email
   */
  async findByUsernameOrEmail(usernameOrEmail: string): Promise<User | null> {
    const result = await query(
      `SELECT 
        user_id as "userId",
        username,
        email,
        password_hash as "passwordHash",
        mmr,
        total_wins as "totalWins",
        total_losses as "totalLosses",
        total_kills as "totalKills",
        total_deaths as "totalDeaths",
        created_at as "createdAt",
        last_login as "lastLogin"
       FROM users
       WHERE username = $1 OR email = $1`,
      [usernameOrEmail]
    );

    return result.rows[0] || null;
  }

  /**
   * Check if username exists
   */
  async usernameExists(username: string): Promise<boolean> {
    const result = await query(
      'SELECT 1 FROM users WHERE username = $1',
      [username]
    );
    return result.rows.length > 0;
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const result = await query(
      'SELECT 1 FROM users WHERE email = $1',
      [email]
    );
    return result.rows.length > 0;
  }

  /**
   * Check if username or email exists
   */
  async usernameOrEmailExists(username: string, email: string): Promise<boolean> {
    const result = await query(
      'SELECT 1 FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    return result.rows.length > 0;
  }

  /**
   * Create a new user
   */
  async create(params: CreateUserParams): Promise<User> {
    const result = await query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING 
        user_id as "userId",
        username,
        email,
        password_hash as "passwordHash",
        mmr,
        total_wins as "totalWins",
        total_losses as "totalLosses",
        total_kills as "totalKills",
        total_deaths as "totalDeaths",
        created_at as "createdAt",
        last_login as "lastLogin"`,
      [params.username, params.email, params.passwordHash]
    );

    return result.rows[0];
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1',
      [userId]
    );
  }

  /**
   * Get user stats with calculated fields
   */
  async getStats(userId: string): Promise<UserStats | null> {
    const result = await query(
      `SELECT 
        mmr,
        total_wins as "totalWins",
        total_losses as "totalLosses",
        total_kills as "totalKills",
        total_deaths as "totalDeaths",
        CASE 
          WHEN (total_wins + total_losses) > 0 
          THEN ROUND((total_wins::numeric / (total_wins + total_losses)) * 100, 2)
          ELSE 0 
        END as "winRate",
        CASE 
          WHEN total_deaths > 0 
          THEN ROUND(total_kills::numeric / total_deaths, 2)
          ELSE total_kills 
        END as kdr
       FROM users
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      mmr: row.mmr,
      totalWins: row.totalWins,
      totalLosses: row.totalLosses,
      totalKills: row.totalKills,
      totalDeaths: row.totalDeaths,
      winRate: row.winRate.toString(),
      kdr: row.kdr.toString(),
    };
  }

  /**
   * Search users by username pattern
   */
  async search(searchQuery: string, limit: number = 20): Promise<User[]> {
    const result = await query(
      `SELECT 
        user_id as "userId",
        username,
        email,
        password_hash as "passwordHash",
        mmr,
        total_wins as "totalWins",
        total_losses as "totalLosses",
        total_kills as "totalKills",
        total_deaths as "totalDeaths",
        created_at as "createdAt",
        last_login as "lastLogin"
       FROM users
       WHERE username ILIKE $1
       ORDER BY mmr DESC
       LIMIT $2`,
      [`%${searchQuery}%`, limit]
    );

    return result.rows;
  }
}

// Export singleton instance
export const userRepository = new UserRepository();
