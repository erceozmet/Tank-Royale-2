import { query } from '../db/postgres';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  mmr: number;
  totalWins: number;
  totalLosses: number;
  totalKills: number;
  totalDeaths: number;
  winRate: number;
}

export interface PlayerRanks {
  mmr: number;
  wins: number;
}

export class LeaderboardRepository {
  /**
   * Get top players by wins
   */
  async getTopByWins(limit: number = 100, offset: number = 0): Promise<LeaderboardEntry[]> {
    const result = await query(
      `SELECT 
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
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows.map((row, index) => ({
      rank: offset + index + 1,
      userId: row.userId,
      username: row.username,
      mmr: row.mmr,
      totalWins: row.totalWins,
      totalLosses: row.totalLosses,
      totalKills: row.totalKills,
      totalDeaths: row.totalDeaths,
      winRate: parseFloat(row.winRate),
    }));
  }

  /**
   * Get top players by MMR
   */
  async getTopByMMR(limit: number = 100, offset: number = 0): Promise<LeaderboardEntry[]> {
    const result = await query(
      `SELECT 
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
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows.map((row, index) => ({
      rank: offset + index + 1,
      userId: row.userId,
      username: row.username,
      mmr: row.mmr,
      totalWins: row.totalWins,
      totalLosses: row.totalLosses,
      totalKills: row.totalKills,
      totalDeaths: row.totalDeaths,
      winRate: parseFloat(row.winRate),
    }));
  }

  /**
   * Get player's rank on MMR leaderboard
   */
  async getPlayerMMRRank(userId: string): Promise<number> {
    const result = await query(
      `SELECT COUNT(*) + 1 as rank
       FROM users
       WHERE mmr > (SELECT mmr FROM users WHERE user_id = $1)
          OR (mmr = (SELECT mmr FROM users WHERE user_id = $1) 
              AND total_wins > (SELECT total_wins FROM users WHERE user_id = $1))`,
      [userId]
    );

    return parseInt(result.rows[0].rank);
  }

  /**
   * Get player's rank on wins leaderboard
   */
  async getPlayerWinsRank(userId: string): Promise<number> {
    const result = await query(
      `SELECT COUNT(*) + 1 as rank
       FROM users
       WHERE total_wins > (SELECT total_wins FROM users WHERE user_id = $1)
          OR (total_wins = (SELECT total_wins FROM users WHERE user_id = $1) 
              AND mmr > (SELECT mmr FROM users WHERE user_id = $1))`,
      [userId]
    );

    return parseInt(result.rows[0].rank);
  }

  /**
   * Get both ranks for a player
   */
  async getPlayerRanks(userId: string): Promise<PlayerRanks> {
    const [mmrRank, winsRank] = await Promise.all([
      this.getPlayerMMRRank(userId),
      this.getPlayerWinsRank(userId),
    ]);

    return {
      mmr: mmrRank,
      wins: winsRank,
    };
  }
}

// Export singleton instance
export const leaderboardRepository = new LeaderboardRepository();
