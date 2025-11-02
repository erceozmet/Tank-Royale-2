-- PostgreSQL Schema for Tank Royale (Query-Optimized)

-- Users table
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Stats (denormalized for fast reads)
    total_wins INTEGER DEFAULT 0,
    total_losses INTEGER DEFAULT 0,
    total_kills INTEGER DEFAULT 0,
    total_deaths INTEGER DEFAULT 0,
    mmr INTEGER DEFAULT 1000,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Computed columns (for queries)
    total_matches GENERATED ALWAYS AS (total_wins + total_losses) STORED,
    win_rate GENERATED ALWAYS AS (
        CASE 
            WHEN (total_wins + total_losses) > 0 
            THEN ROUND((total_wins::numeric / (total_wins + total_losses)) * 100, 2)
            ELSE 0 
        END
    ) STORED,
    kd_ratio GENERATED ALWAYS AS (
        CASE 
            WHEN total_deaths > 0 
            THEN ROUND(total_kills::numeric / total_deaths, 2)
            ELSE total_kills::numeric
        END
    ) STORED,
    
    CONSTRAINT valid_username CHECK (username ~* '^[a-zA-Z0-9_]{3,50}$'),
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Matches table
CREATE TABLE matches (
    match_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    map_name VARCHAR(100) NOT NULL DEFAULT 'default_map',
    player_count INTEGER NOT NULL,
    duration INTEGER, -- in seconds (computed: end_time - start_time)
    
    -- For analytics
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_player_count CHECK (player_count BETWEEN 2 AND 16)
);

-- Match results table (many-to-many: users <-> matches)
CREATE TABLE match_results (
    match_id UUID REFERENCES matches(match_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    placement INTEGER NOT NULL,
    kills INTEGER DEFAULT 0,
    damage_dealt INTEGER DEFAULT 0,
    survival_time INTEGER NOT NULL, -- in seconds
    loot_collected INTEGER DEFAULT 0,
    mmr_change INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (match_id, user_id),
    CONSTRAINT valid_placement CHECK (placement BETWEEN 1 AND 16)
);

-- ==========================================
-- INDEXES FOR QUERY OPTIMIZATION
-- ==========================================

-- Authentication queries (email/username login)
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Leaderboard queries (top players by various metrics)
CREATE INDEX idx_users_mmr ON users(mmr DESC);
CREATE INDEX idx_users_wins ON users(total_wins DESC);
CREATE INDEX idx_users_kd_ratio ON users(kd_ratio DESC) WHERE total_matches >= 10;
CREATE INDEX idx_users_win_rate ON users(win_rate DESC) WHERE total_matches >= 10;

-- Match history queries (player's recent matches)
CREATE INDEX idx_match_results_user_matches ON match_results(user_id, match_id);
CREATE INDEX idx_matches_start_time ON matches(start_time DESC);

-- Match detail queries (all players in a match)
-- Covered by PRIMARY KEY (match_id, user_id)

-- Admin/analytics queries
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_matches_created_at ON matches(created_at DESC);
CREATE INDEX idx_match_results_placement ON match_results(placement);

-- ==========================================
-- VIEWS (Materialized for Performance)
-- ==========================================

-- Materialized view for leaderboard (refreshed periodically)
CREATE MATERIALIZED VIEW leaderboard_mmr AS
SELECT 
    ROW_NUMBER() OVER (ORDER BY mmr DESC, total_wins DESC) as rank,
    user_id,
    username,
    total_wins,
    total_losses,
    total_matches,
    win_rate,
    kd_ratio,
    mmr
FROM users
WHERE total_matches >= 5  -- Only show players with 5+ matches
ORDER BY mmr DESC
LIMIT 100;

CREATE UNIQUE INDEX idx_leaderboard_mmr_userid ON leaderboard_mmr(user_id);

-- Leaderboard by wins
CREATE MATERIALIZED VIEW leaderboard_wins AS
SELECT 
    ROW_NUMBER() OVER (ORDER BY total_wins DESC, mmr DESC) as rank,
    user_id,
    username,
    total_wins,
    total_losses,
    mmr
FROM users
WHERE total_matches >= 5
ORDER BY total_wins DESC
LIMIT 100;

CREATE UNIQUE INDEX idx_leaderboard_wins_userid ON leaderboard_wins(user_id);

-- ==========================================
-- FUNCTIONS & TRIGGERS
-- ==========================================

-- Function to update user stats after match
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET 
        total_wins = total_wins + CASE WHEN NEW.placement = 1 THEN 1 ELSE 0 END,
        total_losses = total_losses + CASE WHEN NEW.placement > 1 THEN 1 ELSE 0 END,
        total_kills = total_kills + NEW.kills,
        total_deaths = total_deaths + CASE WHEN NEW.placement > 1 THEN 1 ELSE 0 END,
        mmr = mmr + NEW.mmr_change,
        last_login = CURRENT_TIMESTAMP
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update user stats
CREATE TRIGGER trg_update_user_stats
AFTER INSERT ON match_results
FOR EACH ROW
EXECUTE FUNCTION update_user_stats();

-- Function to refresh materialized views (call this periodically via cron/scheduler)
CREATE OR REPLACE FUNCTION refresh_leaderboards()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_mmr;
    REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_wins;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- HELPER QUERIES (for common operations)
-- ==========================================

-- Query 1: Get player profile with stats
-- SELECT * FROM users WHERE user_id = $1;

-- Query 2: Get player's match history (last 20)
-- SELECT m.match_id, m.start_time, mr.placement, mr.kills, mr.damage_dealt, mr.survival_time
-- FROM match_results mr
-- JOIN matches m ON mr.match_id = m.match_id
-- WHERE mr.user_id = $1
-- ORDER BY m.start_time DESC
-- LIMIT 20;

-- Query 3: Get match details (all players in a match)
-- SELECT u.username, mr.placement, mr.kills, mr.damage_dealt, mr.survival_time
-- FROM match_results mr
-- JOIN users u ON mr.user_id = u.user_id
-- WHERE mr.match_id = $1
-- ORDER BY mr.placement;

-- Query 4: Get player's rank in leaderboard
-- SELECT rank FROM leaderboard_mmr WHERE user_id = $1;

-- Query 5: Search players by username
-- SELECT user_id, username, mmr, total_wins 
-- FROM users 
-- WHERE username ILIKE $1 || '%' 
-- LIMIT 10;
