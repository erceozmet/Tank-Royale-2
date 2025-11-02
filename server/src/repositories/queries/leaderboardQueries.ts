/**
 * SQL queries for Leaderboard operations
 * Centralized location for all leaderboard-related database queries
 */

export const leaderboardQueries = {
  /**
   * Get top players sorted by wins
   */
  getTopByWins: `
    SELECT 
      user_id as "userId",
      username,
      mmr,
      total_wins as "totalWins",
      total_losses as "totalLosses",
      total_kills as "totalKills",
      total_deaths as "totalDeaths",
      CASE 
        WHEN (total_wins + total_losses) > 0 
        THEN ROUND((total_wins::numeric / (total_wins + total_losses)) * 100, 2)
        ELSE 0 
      END as "winRate"
    FROM users
    WHERE total_wins > 0
    ORDER BY total_wins DESC, mmr DESC
    LIMIT $1 OFFSET $2
  `,

  /**
   * Get top players sorted by MMR
   */
  getTopByMMR: `
    SELECT 
      user_id as "userId",
      username,
      mmr,
      total_wins as "totalWins",
      total_losses as "totalLosses",
      total_kills as "totalKills",
      total_deaths as "totalDeaths",
      CASE 
        WHEN (total_wins + total_losses) > 0 
        THEN ROUND((total_wins::numeric / (total_wins + total_losses)) * 100, 2)
        ELSE 0 
      END as "winRate"
    FROM users
    ORDER BY mmr DESC, total_wins DESC
    LIMIT $1 OFFSET $2
  `,

  /**
   * Get player's rank on MMR leaderboard
   */
  getPlayerMMRRank: `
    SELECT COUNT(*) + 1 as rank
    FROM users
    WHERE mmr > (SELECT mmr FROM users WHERE user_id = $1)
       OR (mmr = (SELECT mmr FROM users WHERE user_id = $1) 
           AND total_wins > (SELECT total_wins FROM users WHERE user_id = $1))
  `,

  /**
   * Get player's rank on wins leaderboard
   */
  getPlayerWinsRank: `
    SELECT COUNT(*) + 1 as rank
    FROM users
    WHERE total_wins > (SELECT total_wins FROM users WHERE user_id = $1)
       OR (total_wins = (SELECT total_wins FROM users WHERE user_id = $1) 
           AND mmr > (SELECT mmr FROM users WHERE user_id = $1))
  `,
} as const;
