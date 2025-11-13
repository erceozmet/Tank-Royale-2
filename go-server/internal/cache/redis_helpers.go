package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// TTL constants for different use cases
const (
	// Session tokens - 7 days
	TTLSession = 7 * 24 * time.Hour // 604800 seconds

	// Blacklisted tokens - same as token expiry (set dynamically)
	// TTLBlacklist = variable

	// Queue player lookup - 60 seconds
	TTLQueuePlayer = 60 * time.Second

	// Rate limiting - 60 seconds (sliding window)
	TTLRateLimit = 60 * time.Second

	// User profile cache - 5 minutes
	TTLUserCache = 5 * time.Minute // 300 seconds

	// Lobby safety net - 2 hours (manual cleanup preferred)
	TTLLobbySafety = 2 * time.Hour // 7200 seconds
)

// RedisCache wraps redis.Client with helper methods
type RedisCache struct {
	client *redis.Client
}

// NewRedisCache creates a new RedisCache instance
func NewRedisCache(client *redis.Client) *RedisCache {
	return &RedisCache{client: client}
}

// ========================================
// 1. LEADERBOARDS (Cache with 5 min TTL)
// ========================================
// NOTE: PostgreSQL is the source of truth for leaderboards.
// Redis is used as a READ-THROUGH CACHE for performance.
//
// Flow:
// 1. Match ends → Update PostgreSQL users table (trigger updates stats)
// 2. Invalidate Redis leaderboard cache (DEL leaderboard:*)
// 3. Next GET request rebuilds cache from PostgreSQL
//
// TTL: 5 minutes (auto-refresh on reads if expired)

// CacheLeaderboard stores leaderboard data from PostgreSQL
func (r *RedisCache) CacheLeaderboard(ctx context.Context, leaderboardType string, entries []redis.Z) error {
	key := fmt.Sprintf("leaderboard:%s", leaderboardType)

	pipe := r.client.Pipeline()
	pipe.Del(ctx, key) // Clear existing
	if len(entries) > 0 {
		pipe.ZAdd(ctx, key, entries...)
	}
	pipe.Expire(ctx, key, 5*time.Minute) // 5 minute cache
	_, err := pipe.Exec(ctx)
	return err
}

// GetCachedLeaderboard retrieves cached leaderboard
func (r *RedisCache) GetCachedLeaderboard(ctx context.Context, leaderboardType string, limit int64) ([]redis.Z, error) {
	key := fmt.Sprintf("leaderboard:%s", leaderboardType)
	return r.client.ZRevRangeWithScores(ctx, key, 0, limit-1).Result()
}

// InvalidateLeaderboard removes leaderboard cache (call after match ends)
func (r *RedisCache) InvalidateLeaderboard(ctx context.Context, leaderboardType string) error {
	key := fmt.Sprintf("leaderboard:%s", leaderboardType)
	return r.client.Del(ctx, key).Err()
}

// GetPlayerRankCached returns player's cached rank (if available)
func (r *RedisCache) GetPlayerRankCached(ctx context.Context, leaderboardType, userID string) (int64, error) {
	key := fmt.Sprintf("leaderboard:%s", leaderboardType)
	return r.client.ZRevRank(ctx, key, userID).Result()
}

// ========================================
// 2. ACTIVE LOBBIES (2h safety TTL)
// ========================================

// CreateLobby creates a new lobby with safety TTL
func (r *RedisCache) CreateLobby(ctx context.Context, lobbyID string, data map[string]interface{}) error {
	key := fmt.Sprintf("lobby:%s", lobbyID)

	// Add to active lobbies set
	if err := r.client.SAdd(ctx, "lobbies:active", lobbyID).Err(); err != nil {
		return err
	}

	// Set lobby data with safety TTL
	pipe := r.client.Pipeline()
	pipe.HSet(ctx, key, data)
	pipe.Expire(ctx, key, TTLLobbySafety) // 2 hour safety net
	_, err := pipe.Exec(ctx)
	return err
}

// GetLobby retrieves lobby data
func (r *RedisCache) GetLobby(ctx context.Context, lobbyID string) (map[string]string, error) {
	key := fmt.Sprintf("lobby:%s", lobbyID)
	return r.client.HGetAll(ctx, key).Result()
}

// UpdateLobbyStatus updates lobby status
func (r *RedisCache) UpdateLobbyStatus(ctx context.Context, lobbyID, status string) error {
	key := fmt.Sprintf("lobby:%s", lobbyID)
	return r.client.HSet(ctx, key, "status", status).Err()
}

// DeleteLobby removes lobby (call on game end)
func (r *RedisCache) DeleteLobby(ctx context.Context, lobbyID string) error {
	key := fmt.Sprintf("lobby:%s", lobbyID)

	pipe := r.client.Pipeline()
	pipe.Del(ctx, key)
	pipe.SRem(ctx, "lobbies:active", lobbyID)
	_, err := pipe.Exec(ctx)
	return err
}

// GetActiveLobbies returns all active lobby IDs
func (r *RedisCache) GetActiveLobbies(ctx context.Context) ([]string, error) {
	return r.client.SMembers(ctx, "lobbies:active").Result()
}

// ========================================
// 3. MATCHMAKING QUEUE (60s TTL for player lookup)
// ========================================

// QueuePlayer represents a player in queue
type QueuePlayer struct {
	UserID   string    `json:"user_id"`
	Username string    `json:"username"`
	MMR      int64     `json:"mmr"`
	JoinedAt time.Time `json:"joined_at"`
}

// EnqueuePlayer adds player to matchmaking queue
func (r *RedisCache) EnqueuePlayer(ctx context.Context, player QueuePlayer) error {
	mmrRange := getMMRRange(player.MMR)
	queueKey := fmt.Sprintf("queue:mmr:%s", mmrRange)
	lookupKey := fmt.Sprintf("player:queue:%s", player.UserID)

	playerJSON, err := json.Marshal(player)
	if err != nil {
		return err
	}

	pipe := r.client.Pipeline()
	pipe.LPush(ctx, queueKey, playerJSON)
	pipe.Set(ctx, lookupKey, queueKey, TTLQueuePlayer) // 60 second TTL
	_, err = pipe.Exec(ctx)
	return err
}

// DequeuePlayer removes next player from queue
func (r *RedisCache) DequeuePlayer(ctx context.Context, mmr int64) (*QueuePlayer, error) {
	mmrRange := getMMRRange(mmr)
	queueKey := fmt.Sprintf("queue:mmr:%s", mmrRange)

	result, err := r.client.RPop(ctx, queueKey).Result()
	if err != nil {
		return nil, err
	}

	var player QueuePlayer
	if err := json.Unmarshal([]byte(result), &player); err != nil {
		return nil, err
	}

	// Delete lookup key
	lookupKey := fmt.Sprintf("player:queue:%s", player.UserID)
	r.client.Del(ctx, lookupKey)

	return &player, nil
}

// GetQueueSize returns number of players in queue for MMR range
func (r *RedisCache) GetQueueSize(ctx context.Context, mmr int64) (int64, error) {
	mmrRange := getMMRRange(mmr)
	queueKey := fmt.Sprintf("queue:mmr:%s", mmrRange)
	return r.client.LLen(ctx, queueKey).Result()
}

// Helper function to determine MMR range
func getMMRRange(mmr int64) string {
	// 200 MMR buckets: 800-1000, 1000-1200, 1200-1400, etc.
	lower := (mmr / 200) * 200
	upper := lower + 200
	return fmt.Sprintf("%d-%d", lower, upper)
}

// ========================================
// 4. SESSION TOKENS (7 day TTL)
// ========================================

// SetSession stores user session with 7 day TTL
func (r *RedisCache) SetSession(ctx context.Context, userID, token string) error {
	key := fmt.Sprintf("session:%s", userID)
	return r.client.Set(ctx, key, token, TTLSession).Err() // 7 days
}

// GetSession retrieves user session
func (r *RedisCache) GetSession(ctx context.Context, userID string) (string, error) {
	key := fmt.Sprintf("session:%s", userID)
	return r.client.Get(ctx, key).Result()
}

// DeleteSession removes user session (logout)
func (r *RedisCache) DeleteSession(ctx context.Context, userID string) error {
	key := fmt.Sprintf("session:%s", userID)
	return r.client.Del(ctx, key).Err()
}

// BlacklistToken adds token to blacklist
func (r *RedisCache) BlacklistToken(ctx context.Context, tokenHash string, expiresIn time.Duration) error {
	key := fmt.Sprintf("blacklist:token:%s", tokenHash)
	return r.client.Set(ctx, key, "1", expiresIn).Err()
}

// IsTokenBlacklisted checks if token is blacklisted
func (r *RedisCache) IsTokenBlacklisted(ctx context.Context, tokenHash string) (bool, error) {
	key := fmt.Sprintf("blacklist:token:%s", tokenHash)
	exists, err := r.client.Exists(ctx, key).Result()
	return exists > 0, err
}

// ========================================
// 5. PLAYER ONLINE STATUS (Manual cleanup)
// ========================================

// UpdatePlayerOnline updates player's last seen timestamp
func (r *RedisCache) UpdatePlayerOnline(ctx context.Context, userID string) error {
	return r.client.ZAdd(ctx, "players:online", redis.Z{
		Score:  float64(time.Now().Unix()),
		Member: userID,
	}).Err()
}

// RemoveInactivePlayers removes players who haven't been seen in X minutes
func (r *RedisCache) RemoveInactivePlayers(ctx context.Context, inactiveMinutes int) (int64, error) {
	cutoff := time.Now().Add(-time.Duration(inactiveMinutes) * time.Minute).Unix()
	return r.client.ZRemRangeByScore(ctx, "players:online", "0", fmt.Sprintf("%d", cutoff)).Result()
}

// GetOnlineCount returns number of online players
func (r *RedisCache) GetOnlineCount(ctx context.Context) (int64, error) {
	return r.client.ZCard(ctx, "players:online").Result()
}

// IsPlayerOnline checks if player was seen recently (within 5 minutes)
func (r *RedisCache) IsPlayerOnline(ctx context.Context, userID string) (bool, error) {
	score, err := r.client.ZScore(ctx, "players:online", userID).Result()
	if err == redis.Nil {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	lastSeen := time.Unix(int64(score), 0)
	return time.Since(lastSeen) < 5*time.Minute, nil
}

// ========================================
// 6. RATE LIMITING (60s TTL)
// ========================================

// IncrementRateLimit increments rate limit counter
func (r *RedisCache) IncrementRateLimit(ctx context.Context, userID, endpoint string) (int64, error) {
	key := fmt.Sprintf("ratelimit:%s:%s", userID, endpoint)

	pipe := r.client.Pipeline()
	incr := pipe.Incr(ctx, key)
	pipe.Expire(ctx, key, TTLRateLimit) // 60 second window
	_, err := pipe.Exec(ctx)

	if err != nil {
		return 0, err
	}

	return incr.Val(), nil
}

// GetRateLimit returns current rate limit count
func (r *RedisCache) GetRateLimit(ctx context.Context, userID, endpoint string) (int64, error) {
	key := fmt.Sprintf("ratelimit:%s:%s", userID, endpoint)
	count, err := r.client.Get(ctx, key).Int64()
	if err == redis.Nil {
		return 0, nil
	}
	return count, err
}

// ========================================
// 7. USER CACHE (5 minute TTL)
// ========================================

// CacheUser stores user profile data
func (r *RedisCache) CacheUser(ctx context.Context, userID string, data map[string]interface{}) error {
	key := fmt.Sprintf("user:cache:%s", userID)

	pipe := r.client.Pipeline()
	pipe.HSet(ctx, key, data)
	pipe.Expire(ctx, key, TTLUserCache) // 5 minutes
	_, err := pipe.Exec(ctx)
	return err
}

// GetCachedUser retrieves cached user profile
func (r *RedisCache) GetCachedUser(ctx context.Context, userID string) (map[string]string, error) {
	key := fmt.Sprintf("user:cache:%s", userID)
	return r.client.HGetAll(ctx, key).Result()
}

// InvalidateUserCache removes cached user data (call on DB update)
func (r *RedisCache) InvalidateUserCache(ctx context.Context, userID string) error {
	key := fmt.Sprintf("user:cache:%s", userID)
	return r.client.Del(ctx, key).Err()
}

// ========================================
// 8. MATCH RESULTS CACHE (No TTL, size-capped)
// ========================================

// MatchResult represents a recent match
type MatchResult struct {
	MatchID     string    `json:"match_id"`
	Timestamp   time.Time `json:"timestamp"`
	Winner      string    `json:"winner"`
	PlayerCount int       `json:"player_count"`
}

// AddRecentMatch adds match to recent matches list (capped at 100)
func (r *RedisCache) AddRecentMatch(ctx context.Context, match MatchResult) error {
	matchJSON, err := json.Marshal(match)
	if err != nil {
		return err
	}

	pipe := r.client.Pipeline()
	pipe.LPush(ctx, "matches:recent", matchJSON)
	pipe.LTrim(ctx, "matches:recent", 0, 99) // Keep only 100 matches
	_, err = pipe.Exec(ctx)
	return err
}

// GetRecentMatches retrieves N recent matches
func (r *RedisCache) GetRecentMatches(ctx context.Context, limit int64) ([]MatchResult, error) {
	results, err := r.client.LRange(ctx, "matches:recent", 0, limit-1).Result()
	if err != nil {
		return nil, err
	}

	matches := make([]MatchResult, 0, len(results))
	for _, result := range results {
		var match MatchResult
		if err := json.Unmarshal([]byte(result), &match); err != nil {
			continue // Skip invalid entries
		}
		matches = append(matches, match)
	}

	return matches, nil
}

// ========================================
// 9. SERVER METRICS (No TTL)
// ========================================

// IncrementMetric increments a server metric
func (r *RedisCache) IncrementMetric(ctx context.Context, metric string, delta int64) error {
	return r.client.HIncrBy(ctx, "metrics:server", metric, delta).Err()
}

// SetMetric sets a server metric value
func (r *RedisCache) SetMetric(ctx context.Context, metric string, value interface{}) error {
	return r.client.HSet(ctx, "metrics:server", metric, value).Err()
}

// GetMetric retrieves a server metric
func (r *RedisCache) GetMetric(ctx context.Context, metric string) (string, error) {
	return r.client.HGet(ctx, "metrics:server", metric).Result()
}

// GetAllMetrics retrieves all server metrics
func (r *RedisCache) GetAllMetrics(ctx context.Context) (map[string]string, error) {
	return r.client.HGetAll(ctx, "metrics:server").Result()
}
