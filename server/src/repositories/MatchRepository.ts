import { query } from '../db/postgres';

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
    const result = await query(
      `INSERT INTO matches (map_name, player_count, start_time)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       RETURNING 
        match_id as "matchId",
        start_time as "startTime",
        end_time as "endTime",
        map_name as "mapName",
        player_count as "playerCount",
        duration`,
      [params.mapName, params.playerCount]
    );

    return result.rows[0];
  }

  /**
   * Find match by ID
   */
  async findById(matchId: string): Promise<Match | null> {
    const result = await query(
      `SELECT 
        match_id as "matchId",
        start_time as "startTime",
        end_time as "endTime",
        map_name as "mapName",
        player_count as "playerCount",
        duration
       FROM matches
       WHERE match_id = $1`,
      [matchId]
    );

    return result.rows[0] || null;
  }

  /**
   * End a match
   */
  async endMatch(matchId: string): Promise<void> {
    await query(
      `UPDATE matches 
       SET end_time = CURRENT_TIMESTAMP,
           duration = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time))
       WHERE match_id = $1`,
      [matchId]
    );
  }

  /**
   * Get user's match history
   */
  async getUserMatchHistory(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<MatchWithResult[]> {
    const result = await query(
      `SELECT 
        m.match_id as "matchId",
        m.start_time as "startTime",
        m.end_time as "endTime",
        m.map_name as "mapName",
        m.player_count as "playerCount",
        m.duration,
        mr.placement,
        mr.kills,
        mr.damage_dealt as "damageDealt",
        mr.survival_time as "survivalTime",
        mr.loot_collected as "lootCollected",
        mr.mmr_change as "mmrChange"
       FROM match_results mr
       JOIN matches m ON mr.match_id = m.match_id
       WHERE mr.user_id = $1
       ORDER BY m.start_time DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

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
    await query(
      `INSERT INTO match_results 
        (match_id, user_id, placement, kills, damage_dealt, survival_time, loot_collected, mmr_change)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        result.matchId,
        result.userId,
        result.placement,
        result.kills,
        result.damageDealt,
        result.survivalTime,
        result.lootCollected,
        result.mmrChange,
      ]
    );
  }

  /**
   * Get all results for a match
   */
  async getMatchResults(matchId: string): Promise<MatchResult[]> {
    const result = await query(
      `SELECT 
        match_id as "matchId",
        user_id as "userId",
        placement,
        kills,
        damage_dealt as "damageDealt",
        survival_time as "survivalTime",
        loot_collected as "lootCollected",
        mmr_change as "mmrChange"
       FROM match_results
       WHERE match_id = $1
       ORDER BY placement ASC`,
      [matchId]
    );

    return result.rows;
  }
}

// Export singleton instance
export const matchRepository = new MatchRepository();
