import { query } from '../db/postgres';
import { matchQueries } from './queries';

export interface Match {
  matchId: string;
  startTime: Date;
  endTime: Date | null;
  mapName: string;
  playerCount: number;
  duration: number | null;
}

export interface MatchResult {
  matchId: string;
  userId: string;
  placement: number;
  kills: number;
  damageDealt: number;
  survivalTime: number;
  lootCollected: number;
  mmrChange: number;
}

export interface MatchWithResult extends Match {
  performance: {
    placement: number;
    kills: number;
    damageDealt: number;
    survivalTime: number;
    lootCollected: number;
    mmrChange: number;
  };
}

export interface CreateMatchParams {
  mapName: string;
  playerCount: number;
}

export class MatchRepository {
  /**
   * Create a new match
   */
  async create(params: CreateMatchParams): Promise<Match> {
    const result = await query(matchQueries.create, [params.mapName, params.playerCount]);
    return result.rows[0];
  }

  /**
   * Find match by ID
   */
  async findById(matchId: string): Promise<Match | null> {
    const result = await query(matchQueries.findById, [matchId]);
    return result.rows[0] || null;
  }

  /**
   * End a match
   */
  async endMatch(matchId: string): Promise<void> {
    await query(matchQueries.endMatch, [matchId]);
  }

  /**
   * Get user's match history
   */
  async getUserMatchHistory(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<MatchWithResult[]> {
    const result = await query(matchQueries.getUserMatchHistory, [userId, limit, offset]);

    return result.rows.map(row => ({
      matchId: row.matchId,
      startTime: row.startTime,
      endTime: row.endTime,
      mapName: row.mapName,
      playerCount: row.playerCount,
      duration: row.duration,
      performance: {
        placement: row.placement,
        kills: row.kills,
        damageDealt: row.damageDealt,
        survivalTime: row.survivalTime,
        lootCollected: row.lootCollected,
        mmrChange: row.mmrChange,
      },
    }));
  }

  /**
   * Insert match result for a player
   */
  async insertResult(result: MatchResult): Promise<void> {
    await query(matchQueries.insertResult, [
      result.matchId,
      result.userId,
      result.placement,
      result.kills,
      result.damageDealt,
      result.survivalTime,
      result.lootCollected,
      result.mmrChange,
    ]);
  }

  /**
   * Get all results for a match
   */
  async getMatchResults(matchId: string): Promise<MatchResult[]> {
    const result = await query(matchQueries.getMatchResults, [matchId]);
    return result.rows;
  }
}

// Export singleton instance
export const matchRepository = new MatchRepository();
