import { query } from '../db/postgres';
import { leaderboardQueries } from './queries';

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
    const result = await query(leaderboardQueries.getTopByWins, [limit, offset]);

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
    const result = await query(leaderboardQueries.getTopByMMR, [limit, offset]);

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
    const result = await query(leaderboardQueries.getPlayerMMRRank, [userId]);
    return parseInt(result.rows[0].rank);
  }

  /**
   * Get player's rank on wins leaderboard
   */
  async getPlayerWinsRank(userId: string): Promise<number> {
    const result = await query(leaderboardQueries.getPlayerWinsRank, [userId]);
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
