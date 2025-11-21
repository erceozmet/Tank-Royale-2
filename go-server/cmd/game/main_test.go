package main

import (
	"encoding/json"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/erceozmet/tank-royale-2/go-server/internal/db/postgres"
	"github.com/erceozmet/tank-royale-2/go-server/internal/db/redis"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestNewMatchManager verifies MatchManager initialization
func TestNewMatchManager(t *testing.T) {
	pgDB := &postgres.DB{} // Mock or nil is fine for this test
	redisDB := &redis.DB{}

	mm := NewMatchManager(pgDB, redisDB)

	require.NotNil(t, mm)
	assert.NotNil(t, mm.matches)
	assert.Equal(t, pgDB, mm.pgDB)
	assert.Equal(t, redisDB, mm.redisDB)
	assert.Equal(t, 0, mm.GetMatchCount())
}

// TestGetOrCreateMatch verifies match creation and retrieval
func TestGetOrCreateMatch(t *testing.T) {
	pgDB := &postgres.DB{}
	redisDB := &redis.DB{}
	mm := NewMatchManager(pgDB, redisDB)

	matchID := "test-match-123"

	// First call should create new match
	m1 := mm.GetOrCreateMatch(matchID)
	require.NotNil(t, m1)
	assert.Equal(t, matchID, m1.ID)
	assert.Equal(t, 1, mm.GetMatchCount())

	// Second call should return same match
	m2 := mm.GetOrCreateMatch(matchID)
	require.NotNil(t, m2)
	assert.Equal(t, m1, m2, "Should return same match instance")
	assert.Equal(t, 1, mm.GetMatchCount(), "Count should not increase")
}

// TestGetMatch verifies match retrieval
func TestGetMatch(t *testing.T) {
	pgDB := &postgres.DB{}
	redisDB := &redis.DB{}
	mm := NewMatchManager(pgDB, redisDB)

	matchID := "test-match-456"

	// Non-existent match should return false
	m, exists := mm.GetMatch(matchID)
	assert.False(t, exists)
	assert.Nil(t, m)

	// Create match
	mm.GetOrCreateMatch(matchID)

	// Now should exist
	m, exists = mm.GetMatch(matchID)
	assert.True(t, exists)
	assert.NotNil(t, m)
	assert.Equal(t, matchID, m.ID)
}

// TestRemoveMatch verifies match removal
func TestRemoveMatch(t *testing.T) {
	pgDB := &postgres.DB{}
	redisDB := &redis.DB{}
	mm := NewMatchManager(pgDB, redisDB)

	matchID := "test-match-789"

	// Create match
	mm.GetOrCreateMatch(matchID)
	assert.Equal(t, 1, mm.GetMatchCount())

	// Remove match
	mm.RemoveMatch(matchID)
	assert.Equal(t, 0, mm.GetMatchCount())

	// Verify it's gone
	m, exists := mm.GetMatch(matchID)
	assert.False(t, exists)
	assert.Nil(t, m)
}

// TestGetMatchCount verifies match counting
func TestGetMatchCount(t *testing.T) {
	pgDB := &postgres.DB{}
	redisDB := &redis.DB{}
	mm := NewMatchManager(pgDB, redisDB)

	assert.Equal(t, 0, mm.GetMatchCount())

	// Create multiple matches
	mm.GetOrCreateMatch("match-1")
	assert.Equal(t, 1, mm.GetMatchCount())

	mm.GetOrCreateMatch("match-2")
	assert.Equal(t, 2, mm.GetMatchCount())

	mm.GetOrCreateMatch("match-3")
	assert.Equal(t, 3, mm.GetMatchCount())

	// Remove one
	mm.RemoveMatch("match-2")
	assert.Equal(t, 2, mm.GetMatchCount())
}

// TestMatchManagerConcurrency verifies thread safety
func TestMatchManagerConcurrency(t *testing.T) {
	pgDB := &postgres.DB{}
	redisDB := &redis.DB{}
	mm := NewMatchManager(pgDB, redisDB)

	var wg sync.WaitGroup
	numGoroutines := 50
	matchID := "concurrent-match"

	// Concurrent GetOrCreateMatch calls
	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			m := mm.GetOrCreateMatch(matchID)
			assert.NotNil(t, m)
			assert.Equal(t, matchID, m.ID)
		}()
	}

	wg.Wait()

	// Should only have created one match
	assert.Equal(t, 1, mm.GetMatchCount())
}

// TestMatchManagerMultipleMatches verifies handling multiple matches
func TestMatchManagerMultipleMatches(t *testing.T) {
	pgDB := &postgres.DB{}
	redisDB := &redis.DB{}
	mm := NewMatchManager(pgDB, redisDB)

	// Create multiple matches
	match1 := mm.GetOrCreateMatch("match-1")
	match2 := mm.GetOrCreateMatch("match-2")
	match3 := mm.GetOrCreateMatch("match-3")

	// Verify they're all different
	assert.NotEqual(t, match1, match2)
	assert.NotEqual(t, match2, match3)
	assert.NotEqual(t, match1, match3)

	// Verify all can be retrieved
	m1, exists := mm.GetMatch("match-1")
	assert.True(t, exists)
	assert.Equal(t, match1, m1)

	m2, exists := mm.GetMatch("match-2")
	assert.True(t, exists)
	assert.Equal(t, match2, m2)

	m3, exists := mm.GetMatch("match-3")
	assert.True(t, exists)
	assert.Equal(t, match3, m3)
}

// TestMatchPlayerManagement verifies adding players to matches
func TestMatchPlayerManagement(t *testing.T) {
	pgDB := &postgres.DB{}
	redisDB := &redis.DB{}
	mm := NewMatchManager(pgDB, redisDB)

	matchID := "player-test-match"
	m := mm.GetOrCreateMatch(matchID)

	// Add players
	err := m.AddPlayer("player1", "Player One")
	assert.NoError(t, err)
	assert.Equal(t, 1, len(m.Players))

	err = m.AddPlayer("player2", "Player Two")
	assert.NoError(t, err)
	assert.Equal(t, 2, len(m.Players))

	// Try to add duplicate player
	err = m.AddPlayer("player1", "Player One")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "already in match")
	assert.Equal(t, 2, len(m.Players))
}

// TestMatchAssignmentData verifies Redis match assignment structure
func TestMatchAssignmentData(t *testing.T) {
	matchID := "test-match-assignment"
	playerCount := 2
	createdAt := time.Now().Unix()

	// Create assignment data as server does
	assignment := map[string]interface{}{
		"matchId":     matchID,
		"playerCount": playerCount,
		"createdAt":   createdAt,
	}

	assignmentJSON, err := json.Marshal(assignment)
	require.NoError(t, err)

	// Parse it back as match:join handler does
	var parsed struct {
		MatchID     string `json:"matchId"`
		PlayerCount int    `json:"playerCount"`
		CreatedAt   int64  `json:"createdAt"`
	}

	err = json.Unmarshal(assignmentJSON, &parsed)
	require.NoError(t, err)

	assert.Equal(t, matchID, parsed.MatchID)
	assert.Equal(t, playerCount, parsed.PlayerCount)
	assert.Equal(t, createdAt, parsed.CreatedAt)
}

// BenchmarkGetOrCreateMatch benchmarks match creation/retrieval
func BenchmarkGetOrCreateMatch(b *testing.B) {
	pgDB := &postgres.DB{}
	redisDB := &redis.DB{}
	mm := NewMatchManager(pgDB, redisDB)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		matchID := fmt.Sprintf("match-%d", i%100) // Reuse some matches
		mm.GetOrCreateMatch(matchID)
	}
}

// BenchmarkGetMatch benchmarks match retrieval
func BenchmarkGetMatch(b *testing.B) {
	pgDB := &postgres.DB{}
	redisDB := &redis.DB{}
	mm := NewMatchManager(pgDB, redisDB)

	// Pre-create some matches
	for i := 0; i < 100; i++ {
		mm.GetOrCreateMatch(fmt.Sprintf("match-%d", i))
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		matchID := fmt.Sprintf("match-%d", i%100)
		mm.GetMatch(matchID)
	}
}
