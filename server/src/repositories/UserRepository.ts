import { query } from '../db/postgres';
import { userQueries } from './queries';

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
    const result = await query(userQueries.findById, [userId]);
    return result.rows[0] || null;
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    const result = await query(userQueries.findByUsername, [username]);
    return result.rows[0] || null;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await query(userQueries.findByEmail, [email]);
    return result.rows[0] || null;
  }

  /**
   * Find user by username OR email
   */
  async findByUsernameOrEmail(usernameOrEmail: string): Promise<User | null> {
    const result = await query(userQueries.findByUsernameOrEmail, [usernameOrEmail]);
    return result.rows[0] || null;
  }

  /**
   * Check if username exists
   */
  async usernameExists(username: string): Promise<boolean> {
    const result = await query(userQueries.usernameExists, [username]);
    return result.rows[0]?.exists || false;
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const result = await query(userQueries.emailExists, [email]);
    return result.rows[0]?.exists || false;
  }

  /**
   * Check if username or email exists
   */
  async usernameOrEmailExists(username: string, email: string): Promise<boolean> {
    const result = await query(userQueries.usernameOrEmailExists, [username, email]);
    return result.rows[0]?.exists || false;
  }

  /**
   * Create a new user
   */
  async create(params: CreateUserParams): Promise<User> {
    const result = await query(userQueries.create, [params.username, params.email, params.passwordHash]);
    return result.rows[0];
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    await query(userQueries.updateLastLogin, [userId]);
  }

  /**
   * Get user stats with calculated fields
   */
  async getStats(userId: string): Promise<UserStats | null> {
    const result = await query(userQueries.getStats, [userId]);

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
    const result = await query(userQueries.search, [`%${searchQuery}%`, limit]);
    return result.rows;
  }
}

// Export singleton instance
export const userRepository = new UserRepository();
