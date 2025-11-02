-- Cassandra Schema for Tank Royale (CQL)

-- Create keyspace
CREATE KEYSPACE IF NOT EXISTS tank_royale
WITH replication = {
    'class': 'SimpleStrategy',
    'replication_factor': 3
};

USE tank_royale;

-- Game events table (time-series data)
-- Stores all game events for analytics
CREATE TABLE game_events (
    match_id UUID,
    event_timestamp TIMESTAMP,
    event_id UUID,
    event_type TEXT,
    player_id UUID,
    event_data MAP<TEXT, TEXT>,
    
    PRIMARY KEY (match_id, event_timestamp, event_id)
) WITH CLUSTERING ORDER BY (event_timestamp DESC)
  AND compaction = {'class': 'TimeWindowCompactionStrategy'}
  AND default_time_to_live = 2592000; -- 30 days

-- Player telemetry (for analytics)
-- Tracks player actions and positions over time
CREATE TABLE player_telemetry (
    player_id UUID,
    match_id UUID,
    timestamp TIMESTAMP,
    position_x FLOAT,
    position_y FLOAT,
    health INT,
    action TEXT,
    
    PRIMARY KEY (player_id, match_id, timestamp)
) WITH CLUSTERING ORDER BY (match_id DESC, timestamp DESC)
  AND default_time_to_live = 604800; -- 7 days

-- Match events by type (for specific analytics queries)
CREATE TABLE match_events_by_type (
    event_type TEXT,
    match_id UUID,
    event_timestamp TIMESTAMP,
    player_id UUID,
    event_data MAP<TEXT, TEXT>,
    
    PRIMARY KEY (event_type, match_id, event_timestamp)
) WITH CLUSTERING ORDER BY (match_id DESC, event_timestamp DESC)
  AND compaction = {'class': 'TimeWindowCompactionStrategy'}
  AND default_time_to_live = 2592000; -- 30 days

-- Combat log (kills, hits, damage)
CREATE TABLE combat_log (
    match_id UUID,
    timestamp TIMESTAMP,
    attacker_id UUID,
    defender_id UUID,
    event_type TEXT, -- 'HIT', 'KILL'
    damage INT,
    weapon_type TEXT,
    position_x FLOAT,
    position_y FLOAT,
    
    PRIMARY KEY (match_id, timestamp)
) WITH CLUSTERING ORDER BY (timestamp DESC)
  AND default_time_to_live = 2592000; -- 30 days

-- Loot collection log
CREATE TABLE loot_collection_log (
    match_id UUID,
    timestamp TIMESTAMP,
    player_id UUID,
    loot_type TEXT,
    loot_value INT,
    position_x FLOAT,
    position_y FLOAT,
    
    PRIMARY KEY (match_id, timestamp)
) WITH CLUSTERING ORDER BY (timestamp DESC)
  AND default_time_to_live = 2592000; -- 30 days

-- Player statistics aggregation (materialized view alternative)
CREATE TABLE player_daily_stats (
    player_id UUID,
    date DATE,
    matches_played COUNTER,
    wins COUNTER,
    kills COUNTER,
    deaths COUNTER,
    damage_dealt COUNTER,
    
    PRIMARY KEY (player_id, date)
) WITH CLUSTERING ORDER BY (date DESC);

-- Example queries:

-- Get all events for a match:
-- SELECT * FROM game_events WHERE match_id = ? ORDER BY event_timestamp DESC;

-- Get player's match history:
-- SELECT * FROM player_telemetry WHERE player_id = ? LIMIT 10;

-- Get all kills in a match:
-- SELECT * FROM combat_log WHERE match_id = ? AND event_type = 'KILL';

-- Get player's daily stats:
-- SELECT * FROM player_daily_stats WHERE player_id = ? AND date >= '2025-11-01';
