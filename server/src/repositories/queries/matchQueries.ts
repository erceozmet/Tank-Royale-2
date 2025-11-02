/**
 * SQL queries for Match operations
 * Centralized location for all match-related database queries
 */

export const matchQueries = {
  /**
   * Create a new match
   */
  create: `
    INSERT INTO matches (map_name, player_count, start_time)
    VALUES ($1, $2, CURRENT_TIMESTAMP)
    RETURNING 
      match_id as "matchId",
      start_time as "startTime",
      end_time as "endTime",
      map_name as "mapName",
      player_count as "playerCount",
      duration
  `,

  /**
   * Find match by ID
   */
  findById: `
    SELECT 
      match_id as "matchId",
      start_time as "startTime",
      end_time as "endTime",
      map_name as "mapName",
      player_count as "playerCount",
      duration
    FROM matches
    WHERE match_id = $1
  `,

  /**
   * End a match and calculate duration
   */
  endMatch: `
    UPDATE matches 
    SET end_time = CURRENT_TIMESTAMP,
        duration = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time))
    WHERE match_id = $1
  `,

  /**
   * Get user's match history with performance data
   */
  getUserMatchHistory: `
    SELECT 
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
    LIMIT $2 OFFSET $3
  `,

  /**
   * Insert match result for a player
   */
  insertResult: `
    INSERT INTO match_results 
      (match_id, user_id, placement, kills, damage_dealt, survival_time, loot_collected, mmr_change)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `,

  /**
   * Get all results for a match
   */
  getMatchResults: `
    SELECT 
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
    ORDER BY placement ASC
  `,
} as const;
