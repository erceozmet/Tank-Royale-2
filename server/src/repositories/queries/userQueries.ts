/**
 * SQL queries for User operations
 * Centralized location for all user-related database queries
 */

export const userQueries = {
  /**
   * Find user by ID
   */
  findById: `
    SELECT 
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
    WHERE user_id = $1
  `,

  /**
   * Find user by username
   */
  findByUsername: `
    SELECT 
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
    WHERE username = $1
  `,

  /**
   * Find user by email
   */
  findByEmail: `
    SELECT 
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
    WHERE email = $1
  `,

  /**
   * Find user by username or email
   */
  findByUsernameOrEmail: `
    SELECT 
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
    WHERE username = $1 OR email = $1
  `,

  /**
   * Check if username exists
   */
  usernameExists: `
    SELECT EXISTS(SELECT 1 FROM users WHERE username = $1) as exists
  `,

  /**
   * Check if email exists
   */
  emailExists: `
    SELECT EXISTS(SELECT 1 FROM users WHERE email = $1) as exists
  `,

  /**
   * Check if username or email exists
   */
  usernameOrEmailExists: `
    SELECT EXISTS(
      SELECT 1 FROM users WHERE username = $1 OR email = $2
    ) as exists
  `,

  /**
   * Create new user
   */
  create: `
    INSERT INTO users (username, email, password_hash)
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
      last_login as "lastLogin"
  `,

  /**
   * Update last login timestamp
   */
  updateLastLogin: `
    UPDATE users 
    SET last_login = CURRENT_TIMESTAMP 
    WHERE user_id = $1
  `,

  /**
   * Get user stats with calculated fields
   */
  getStats: `
    SELECT 
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
      END as "kdr"
    FROM users
    WHERE user_id = $1
  `,

  /**
   * Search users by username pattern
   */
  search: `
    SELECT 
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
    LIMIT $2
  `,
} as const;
