package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/erceozmet/tank-royale-2/go-server/internal/metrics"
	"github.com/redis/go-redis/v9"
)

// SessionData represents user session information stored in Redis
type SessionData struct {
	UserID    string    `json:"userId"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	Token     string    `json:"token"`
	CreatedAt time.Time `json:"createdAt"`
	LastSeen  time.Time `json:"lastSeen"`
}

// SessionManager handles user session operations in Redis
type SessionManager struct {
	client *redis.Client
}

// NewSessionManager creates a new SessionManager instance
func NewSessionManager(client *redis.Client) *SessionManager {
	return &SessionManager{client: client}
}

const (
	sessionPrefix = "session:"
	sessionTTL    = 7 * 24 * time.Hour // 7 days
)

// SetSession stores a user session in Redis with 7-day TTL
func (sm *SessionManager) SetSession(ctx context.Context, userID string, data SessionData) error {
	key := fmt.Sprintf("%s%s", sessionPrefix, userID)

	// Set timestamps
	now := time.Now()
	if data.CreatedAt.IsZero() {
		data.CreatedAt = now
	}
	data.LastSeen = now

	// Serialize session data
	sessionJSON, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal session data: %w", err)
	}

	// Track cache operation duration
	start := time.Now()

	// Store with TTL
	if err := sm.client.Set(ctx, key, sessionJSON, sessionTTL).Err(); err != nil {
		return fmt.Errorf("failed to set session in Redis: %w", err)
	}

	duration := time.Since(start).Seconds()
	metrics.CacheOperationDuration.WithLabelValues("set", "session").Observe(duration)

	return nil
}

// GetSession retrieves a user session from Redis
func (sm *SessionManager) GetSession(ctx context.Context, userID string) (*SessionData, error) {
	key := fmt.Sprintf("%s%s", sessionPrefix, userID)

	start := time.Now()
	result, err := sm.client.Get(ctx, key).Result()
	duration := time.Since(start).Seconds()

	// Track cache operation duration
	metrics.CacheOperationDuration.WithLabelValues("get", "session").Observe(duration)

	if err == redis.Nil {
		// Cache miss
		metrics.CacheMisses.WithLabelValues("session").Inc()
		return nil, nil // Session not found
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get session from Redis: %w", err)
	}

	// Cache hit
	metrics.CacheHits.WithLabelValues("session").Inc()

	var session SessionData
	if err := json.Unmarshal([]byte(result), &session); err != nil {
		return nil, fmt.Errorf("failed to unmarshal session data: %w", err)
	}

	return &session, nil
}

// DeleteSession removes a user session from Redis (logout)
func (sm *SessionManager) DeleteSession(ctx context.Context, userID string) error {
	key := fmt.Sprintf("%s%s", sessionPrefix, userID)

	start := time.Now()

	if err := sm.client.Del(ctx, key).Err(); err != nil {
		return fmt.Errorf("failed to delete session from Redis: %w", err)
	}

	duration := time.Since(start).Seconds()
	metrics.CacheOperationDuration.WithLabelValues("delete", "session").Observe(duration)

	return nil
}

// RefreshSession extends the TTL of a user session
func (sm *SessionManager) RefreshSession(ctx context.Context, userID string) error {
	key := fmt.Sprintf("%s%s", sessionPrefix, userID)

	// Check if session exists
	exists, err := sm.client.Exists(ctx, key).Result()
	if err != nil {
		return fmt.Errorf("failed to check session existence: %w", err)
	}
	if exists == 0 {
		return fmt.Errorf("session not found for user %s", userID)
	}

	// Get current session data
	session, err := sm.GetSession(ctx, userID)
	if err != nil {
		return err
	}
	if session == nil {
		return fmt.Errorf("session not found for user %s", userID)
	}

	// Update last seen timestamp
	session.LastSeen = time.Now()

	// Save with refreshed TTL
	return sm.SetSession(ctx, userID, *session)
}

// SessionExists checks if a session exists for the given user ID
func (sm *SessionManager) SessionExists(ctx context.Context, userID string) (bool, error) {
	key := fmt.Sprintf("%s%s", sessionPrefix, userID)

	exists, err := sm.client.Exists(ctx, key).Result()
	if err != nil {
		return false, fmt.Errorf("failed to check session existence: %w", err)
	}

	return exists > 0, nil
}

// GetSessionTTL returns the remaining TTL for a session
func (sm *SessionManager) GetSessionTTL(ctx context.Context, userID string) (time.Duration, error) {
	key := fmt.Sprintf("%s%s", sessionPrefix, userID)

	ttl, err := sm.client.TTL(ctx, key).Result()
	if err != nil {
		return 0, fmt.Errorf("failed to get session TTL: %w", err)
	}

	return ttl, nil
}

// DeleteAllUserSessions removes all sessions (admin function, use with caution)
func (sm *SessionManager) DeleteAllUserSessions(ctx context.Context) (int64, error) {
	// Use SCAN to find all session keys
	var cursor uint64
	var deletedCount int64
	pattern := fmt.Sprintf("%s*", sessionPrefix)

	for {
		var keys []string
		var err error

		keys, cursor, err = sm.client.Scan(ctx, cursor, pattern, 100).Result()
		if err != nil {
			return deletedCount, fmt.Errorf("failed to scan session keys: %w", err)
		}

		if len(keys) > 0 {
			deleted, err := sm.client.Del(ctx, keys...).Result()
			if err != nil {
				return deletedCount, fmt.Errorf("failed to delete session keys: %w", err)
			}
			deletedCount += deleted
		}

		if cursor == 0 {
			break
		}
	}

	return deletedCount, nil
}

// GetActiveSessions returns all active session user IDs (admin function)
func (sm *SessionManager) GetActiveSessions(ctx context.Context) ([]string, error) {
	var cursor uint64
	var userIDs []string
	pattern := fmt.Sprintf("%s*", sessionPrefix)

	for {
		var keys []string
		var err error

		keys, cursor, err = sm.client.Scan(ctx, cursor, pattern, 100).Result()
		if err != nil {
			return nil, fmt.Errorf("failed to scan session keys: %w", err)
		}

		// Extract user IDs from keys (remove prefix)
		for _, key := range keys {
			userID := key[len(sessionPrefix):]
			userIDs = append(userIDs, userID)
		}

		if cursor == 0 {
			break
		}
	}

	return userIDs, nil
}

// GetActiveSessionCount returns the number of active sessions
func (sm *SessionManager) GetActiveSessionCount(ctx context.Context) (int, error) {
	userIDs, err := sm.GetActiveSessions(ctx)
	if err != nil {
		return 0, err
	}
	return len(userIDs), nil
}
