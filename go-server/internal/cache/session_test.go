package cache

import (
	"context"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// setupTestRedis creates a test Redis instance using miniredis
func setupTestRedis(t *testing.T) (*redis.Client, *miniredis.Miniredis) {
	mr, err := miniredis.Run()
	require.NoError(t, err)
	
	client := redis.NewClient(&redis.Options{
		Addr: mr.Addr(),
	})
	
	return client, mr
}

func TestSetSession(t *testing.T) {
	client, mr := setupTestRedis(t)
	defer mr.Close()
	defer client.Close()
	
	sm := NewSessionManager(client)
	ctx := context.Background()
	
	t.Run("set valid session", func(t *testing.T) {
		sessionData := SessionData{
			UserID:   "user-123",
			Username: "testuser",
			Email:    "test@example.com",
			Token:    "jwt-token-here",
		}
		
		err := sm.SetSession(ctx, "user-123", sessionData)
		assert.NoError(t, err)
		
		// Verify session exists in Redis
		exists, err := sm.SessionExists(ctx, "user-123")
		assert.NoError(t, err)
		assert.True(t, exists)
	})
	
	t.Run("timestamps are set automatically", func(t *testing.T) {
		sessionData := SessionData{
			UserID:   "user-456",
			Username: "testuser2",
			Email:    "test2@example.com",
			Token:    "jwt-token-2",
		}
		
		err := sm.SetSession(ctx, "user-456", sessionData)
		assert.NoError(t, err)
		
		// Retrieve and verify timestamps
		retrieved, err := sm.GetSession(ctx, "user-456")
		assert.NoError(t, err)
		assert.NotNil(t, retrieved)
		assert.False(t, retrieved.CreatedAt.IsZero())
		assert.False(t, retrieved.LastSeen.IsZero())
	})
	
	t.Run("overwrites existing session", func(t *testing.T) {
		// First session
		sessionData1 := SessionData{
			UserID:   "user-789",
			Username: "testuser3",
			Email:    "test3@example.com",
			Token:    "jwt-token-3",
		}
		err := sm.SetSession(ctx, "user-789", sessionData1)
		assert.NoError(t, err)
		
		// Overwrite with new token
		sessionData2 := SessionData{
			UserID:   "user-789",
			Username: "testuser3",
			Email:    "test3@example.com",
			Token:    "new-jwt-token",
		}
		err = sm.SetSession(ctx, "user-789", sessionData2)
		assert.NoError(t, err)
		
		// Verify new token
		retrieved, err := sm.GetSession(ctx, "user-789")
		assert.NoError(t, err)
		assert.Equal(t, "new-jwt-token", retrieved.Token)
	})
}

func TestGetSession(t *testing.T) {
	client, mr := setupTestRedis(t)
	defer mr.Close()
	defer client.Close()
	
	sm := NewSessionManager(client)
	ctx := context.Background()
	
	t.Run("get existing session", func(t *testing.T) {
		sessionData := SessionData{
			UserID:   "user-123",
			Username: "testuser",
			Email:    "test@example.com",
			Token:    "jwt-token-here",
		}
		
		err := sm.SetSession(ctx, "user-123", sessionData)
		require.NoError(t, err)
		
		retrieved, err := sm.GetSession(ctx, "user-123")
		assert.NoError(t, err)
		assert.NotNil(t, retrieved)
		assert.Equal(t, "user-123", retrieved.UserID)
		assert.Equal(t, "testuser", retrieved.Username)
		assert.Equal(t, "test@example.com", retrieved.Email)
		assert.Equal(t, "jwt-token-here", retrieved.Token)
	})
	
	t.Run("get non-existent session", func(t *testing.T) {
		retrieved, err := sm.GetSession(ctx, "non-existent-user")
		assert.NoError(t, err)
		assert.Nil(t, retrieved)
	})
	
	t.Run("empty user ID", func(t *testing.T) {
		retrieved, err := sm.GetSession(ctx, "")
		assert.NoError(t, err)
		assert.Nil(t, retrieved)
	})
}

func TestDeleteSession(t *testing.T) {
	client, mr := setupTestRedis(t)
	defer mr.Close()
	defer client.Close()
	
	sm := NewSessionManager(client)
	ctx := context.Background()
	
	t.Run("delete existing session", func(t *testing.T) {
		sessionData := SessionData{
			UserID:   "user-123",
			Username: "testuser",
			Email:    "test@example.com",
			Token:    "jwt-token-here",
		}
		
		err := sm.SetSession(ctx, "user-123", sessionData)
		require.NoError(t, err)
		
		// Verify exists
		exists, err := sm.SessionExists(ctx, "user-123")
		assert.NoError(t, err)
		assert.True(t, exists)
		
		// Delete
		err = sm.DeleteSession(ctx, "user-123")
		assert.NoError(t, err)
		
		// Verify deleted
		exists, err = sm.SessionExists(ctx, "user-123")
		assert.NoError(t, err)
		assert.False(t, exists)
	})
	
	t.Run("delete non-existent session", func(t *testing.T) {
		err := sm.DeleteSession(ctx, "non-existent-user")
		assert.NoError(t, err) // Should not error
	})
}

func TestRefreshSession(t *testing.T) {
	client, mr := setupTestRedis(t)
	defer mr.Close()
	defer client.Close()
	
	sm := NewSessionManager(client)
	ctx := context.Background()
	
	t.Run("refresh existing session", func(t *testing.T) {
		sessionData := SessionData{
			UserID:   "user-123",
			Username: "testuser",
			Email:    "test@example.com",
			Token:    "jwt-token-here",
		}
		
		err := sm.SetSession(ctx, "user-123", sessionData)
		require.NoError(t, err)
		
		// Get initial last seen
		session1, err := sm.GetSession(ctx, "user-123")
		require.NoError(t, err)
		initialLastSeen := session1.LastSeen
		
		// Wait a moment
		time.Sleep(10 * time.Millisecond)
		
		// Refresh
		err = sm.RefreshSession(ctx, "user-123")
		assert.NoError(t, err)
		
		// Get updated last seen
		session2, err := sm.GetSession(ctx, "user-123")
		require.NoError(t, err)
		assert.True(t, session2.LastSeen.After(initialLastSeen))
	})
	
	t.Run("refresh non-existent session", func(t *testing.T) {
		err := sm.RefreshSession(ctx, "non-existent-user")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "session not found")
	})
}

func TestSessionExists(t *testing.T) {
	client, mr := setupTestRedis(t)
	defer mr.Close()
	defer client.Close()
	
	sm := NewSessionManager(client)
	ctx := context.Background()
	
	t.Run("session exists", func(t *testing.T) {
		sessionData := SessionData{
			UserID:   "user-123",
			Username: "testuser",
			Email:    "test@example.com",
			Token:    "jwt-token-here",
		}
		
		err := sm.SetSession(ctx, "user-123", sessionData)
		require.NoError(t, err)
		
		exists, err := sm.SessionExists(ctx, "user-123")
		assert.NoError(t, err)
		assert.True(t, exists)
	})
	
	t.Run("session does not exist", func(t *testing.T) {
		exists, err := sm.SessionExists(ctx, "non-existent-user")
		assert.NoError(t, err)
		assert.False(t, exists)
	})
}

func TestGetSessionTTL(t *testing.T) {
	client, mr := setupTestRedis(t)
	defer mr.Close()
	defer client.Close()
	
	sm := NewSessionManager(client)
	ctx := context.Background()
	
	t.Run("get TTL of existing session", func(t *testing.T) {
		sessionData := SessionData{
			UserID:   "user-123",
			Username: "testuser",
			Email:    "test@example.com",
			Token:    "jwt-token-here",
		}
		
		err := sm.SetSession(ctx, "user-123", sessionData)
		require.NoError(t, err)
		
		ttl, err := sm.GetSessionTTL(ctx, "user-123")
		assert.NoError(t, err)
		assert.True(t, ttl > 0)
		assert.True(t, ttl <= sessionTTL) // Should be <= 7 days
	})
	
	t.Run("get TTL of non-existent session", func(t *testing.T) {
		ttl, err := sm.GetSessionTTL(ctx, "non-existent-user")
		assert.NoError(t, err)
		assert.True(t, ttl < 0) // Redis returns -2 for non-existent keys
	})
}

func TestGetActiveSessions(t *testing.T) {
	client, mr := setupTestRedis(t)
	defer mr.Close()
	defer client.Close()
	
	sm := NewSessionManager(client)
	ctx := context.Background()
	
	t.Run("get active sessions", func(t *testing.T) {
		// Create multiple sessions
		users := []string{"user-1", "user-2", "user-3"}
		for _, userID := range users {
			sessionData := SessionData{
				UserID:   userID,
				Username: "test_" + userID,
				Email:    userID + "@example.com",
				Token:    "token-" + userID,
			}
			err := sm.SetSession(ctx, userID, sessionData)
			require.NoError(t, err)
		}
		
		// Get active sessions
		activeSessions, err := sm.GetActiveSessions(ctx)
		assert.NoError(t, err)
		assert.Len(t, activeSessions, 3)
		
		// Verify all user IDs are present
		for _, userID := range users {
			assert.Contains(t, activeSessions, userID)
		}
	})
	
	t.Run("no active sessions", func(t *testing.T) {
		// Clear all sessions first
		_, err := sm.DeleteAllUserSessions(ctx)
		require.NoError(t, err)
		
		activeSessions, err := sm.GetActiveSessions(ctx)
		assert.NoError(t, err)
		assert.Empty(t, activeSessions)
	})
}

func TestGetActiveSessionCount(t *testing.T) {
	client, mr := setupTestRedis(t)
	defer mr.Close()
	defer client.Close()
	
	sm := NewSessionManager(client)
	ctx := context.Background()
	
	t.Run("count active sessions", func(t *testing.T) {
		// Clear first
		_, err := sm.DeleteAllUserSessions(ctx)
		require.NoError(t, err)
		
		// Create sessions
		for i := 1; i <= 5; i++ {
			sessionData := SessionData{
				UserID:   "user-" + string(rune('0'+i)),
				Username: "testuser",
				Email:    "test@example.com",
				Token:    "token",
			}
			err := sm.SetSession(ctx, sessionData.UserID, sessionData)
			require.NoError(t, err)
		}
		
		count, err := sm.GetActiveSessionCount(ctx)
		assert.NoError(t, err)
		assert.Equal(t, 5, count)
	})
}

func TestDeleteAllUserSessions(t *testing.T) {
	client, mr := setupTestRedis(t)
	defer mr.Close()
	defer client.Close()
	
	sm := NewSessionManager(client)
	ctx := context.Background()
	
	t.Run("delete all sessions", func(t *testing.T) {
		// Create multiple sessions
		for i := 1; i <= 10; i++ {
			sessionData := SessionData{
				UserID:   "user-" + string(rune('0'+i)),
				Username: "testuser",
				Email:    "test@example.com",
				Token:    "token",
			}
			err := sm.SetSession(ctx, sessionData.UserID, sessionData)
			require.NoError(t, err)
		}
		
		// Verify sessions exist
		count, err := sm.GetActiveSessionCount(ctx)
		require.NoError(t, err)
		assert.Equal(t, 10, count)
		
		// Delete all
		deleted, err := sm.DeleteAllUserSessions(ctx)
		assert.NoError(t, err)
		assert.Equal(t, int64(10), deleted)
		
		// Verify all deleted
		count, err = sm.GetActiveSessionCount(ctx)
		assert.NoError(t, err)
		assert.Equal(t, 0, count)
	})
	
	t.Run("delete when no sessions exist", func(t *testing.T) {
		deleted, err := sm.DeleteAllUserSessions(ctx)
		assert.NoError(t, err)
		assert.Equal(t, int64(0), deleted)
	})
}

func TestSessionDataSerialization(t *testing.T) {
	client, mr := setupTestRedis(t)
	defer mr.Close()
	defer client.Close()
	
	sm := NewSessionManager(client)
	ctx := context.Background()
	
	t.Run("preserve all fields", func(t *testing.T) {
		now := time.Now()
		sessionData := SessionData{
			UserID:    "user-123",
			Username:  "testuser",
			Email:     "test@example.com",
			Token:     "jwt-token-here",
			CreatedAt: now,
			LastSeen:  now,
		}
		
		err := sm.SetSession(ctx, "user-123", sessionData)
		require.NoError(t, err)
		
		retrieved, err := sm.GetSession(ctx, "user-123")
		assert.NoError(t, err)
		assert.NotNil(t, retrieved)
		assert.Equal(t, sessionData.UserID, retrieved.UserID)
		assert.Equal(t, sessionData.Username, retrieved.Username)
		assert.Equal(t, sessionData.Email, retrieved.Email)
		assert.Equal(t, sessionData.Token, retrieved.Token)
		// Timestamps might differ slightly due to JSON serialization
		assert.WithinDuration(t, sessionData.CreatedAt, retrieved.CreatedAt, time.Second)
	})
}

// Benchmark tests
func BenchmarkSetSession(b *testing.B) {
	client, mr := setupTestRedis(&testing.T{})
	defer mr.Close()
	defer client.Close()
	
	sm := NewSessionManager(client)
	ctx := context.Background()
	
	sessionData := SessionData{
		UserID:   "user-123",
		Username: "testuser",
		Email:    "test@example.com",
		Token:    "jwt-token-here",
	}
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = sm.SetSession(ctx, "user-123", sessionData)
	}
}

func BenchmarkGetSession(b *testing.B) {
	client, mr := setupTestRedis(&testing.T{})
	defer mr.Close()
	defer client.Close()
	
	sm := NewSessionManager(client)
	ctx := context.Background()
	
	sessionData := SessionData{
		UserID:   "user-123",
		Username: "testuser",
		Email:    "test@example.com",
		Token:    "jwt-token-here",
	}
	_ = sm.SetSession(ctx, "user-123", sessionData)
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = sm.GetSession(ctx, "user-123")
	}
}

func BenchmarkRefreshSession(b *testing.B) {
	client, mr := setupTestRedis(&testing.T{})
	defer mr.Close()
	defer client.Close()
	
	sm := NewSessionManager(client)
	ctx := context.Background()
	
	sessionData := SessionData{
		UserID:   "user-123",
		Username: "testuser",
		Email:    "test@example.com",
		Token:    "jwt-token-here",
	}
	_ = sm.SetSession(ctx, "user-123", sessionData)
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = sm.RefreshSession(ctx, "user-123")
	}
}
