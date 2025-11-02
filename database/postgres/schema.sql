-- PostgreSQL Schema for Tank Royale

-- Users table
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    total_wins INTEGER DEFAULT 0,
    total_losses INTEGER DEFAULT 0,
    total_kills INTEGER DEFAULT 0,
    total_deaths INTEGER DEFAULT 0,
    mmr INTEGER DEFAULT 1000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_username CHECK (username ~* '^[a-zA-Z0-9_]{3,50}$'),
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Matches table
CREATE TABLE matches (
    match_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    map_name VARCHAR(100) NOT NULL,
    player_count INTEGER NOT NULL,
    duration INTEGER, -- in seconds
    
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
    
    PRIMARY KEY (match_id, user_id),
    CONSTRAINT valid_placement CHECK (placement BETWEEN 1 AND 16)
);

-- Indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_mmr ON users(mmr DESC);
CREATE INDEX idx_users_wins ON users(total_wins DESC);

CREATE INDEX idx_matches_start_time ON matches(start_time DESC);
CREATE INDEX idx_match_results_user_id ON match_results(user_id);
CREATE INDEX idx_match_results_placement ON match_results(placement);

-- View for leaderboard (top players by wins)
CREATE VIEW leaderboard_wins AS
SELECT 
    ROW_NUMBER() OVER (ORDER BY total_wins DESC, total_kills DESC) as rank,
    user_id,
    username,
    total_wins,
    total_kills,
    mmr
FROM users
ORDER BY total_wins DESC
LIMIT 100;

-- View for leaderboard (top players by MMR)
CREATE VIEW leaderboard_mmr AS
SELECT 
    ROW_NUMBER() OVER (ORDER BY mmr DESC, total_wins DESC) as rank,
    user_id,
    username,
    total_wins,
    mmr
FROM users
ORDER BY mmr DESC
LIMIT 100;

-- Function to update user stats after match
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET 
        total_wins = total_wins + CASE WHEN NEW.placement = 1 THEN 1 ELSE 0 END,
        total_losses = total_losses + CASE WHEN NEW.placement > 1 THEN 1 ELSE 0 END,
        total_kills = total_kills + NEW.kills,
        mmr = mmr + NEW.mmr_change
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update user stats
CREATE TRIGGER trg_update_user_stats
AFTER INSERT ON match_results
FOR EACH ROW
EXECUTE FUNCTION update_user_stats();
