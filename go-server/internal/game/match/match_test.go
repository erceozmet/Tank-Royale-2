package match

import (
	"testing"

	"github.com/erceozmet/tank-royale-2/go-server/internal/db/postgres"
	"github.com/erceozmet/tank-royale-2/go-server/internal/game"
	"github.com/erceozmet/tank-royale-2/go-server/internal/game/engine"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestNewMatch verifies match initialization
func TestNewMatch(t *testing.T) {
	pgDB := &postgres.DB{}
	matchID := "test-match-123"

	m := NewMatch(matchID, pgDB)

	require.NotNil(t, m)
	assert.Equal(t, matchID, m.ID)
	assert.NotNil(t, m.Players)
	assert.Equal(t, 0, len(m.Players))
	assert.NotNil(t, m.GameLoop)
	assert.NotNil(t, m.MapGenerator)
	assert.NotNil(t, m.CrateManager)
	assert.Equal(t, engine.PhaseWaiting, m.Phase)
	assert.Equal(t, pgDB, m.pgDB)
	assert.NotNil(t, m.ctx)
	assert.NotNil(t, m.cancel)
}

// TestAddPlayer verifies adding players to a match
func TestAddPlayer(t *testing.T) {
	pgDB := &postgres.DB{}
	m := NewMatch("test-match", pgDB)

	// Add first player
	err := m.AddPlayer("user1", "Player One")
	require.NoError(t, err)
	assert.Equal(t, 1, len(m.Players))

	player1, exists := m.Players["user1"]
	assert.True(t, exists)
	assert.Equal(t, "user1", player1.UserID)
	assert.Equal(t, "Player One", player1.Username)
	assert.True(t, player1.Connected)
	assert.Nil(t, player1.DisconnectAt)

	// Add second player
	err = m.AddPlayer("user2", "Player Two")
	require.NoError(t, err)
	assert.Equal(t, 2, len(m.Players))
}

// TestAddPlayerDuplicate verifies duplicate player handling
func TestAddPlayerDuplicate(t *testing.T) {
	pgDB := &postgres.DB{}
	m := NewMatch("test-match", pgDB)

	// Add player
	err := m.AddPlayer("user1", "Player One")
	require.NoError(t, err)

	// Try to add same player again
	err = m.AddPlayer("user1", "Player One")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "already in match")
	assert.Equal(t, 1, len(m.Players))
}

// TestAddPlayerMaxPlayers verifies max player limit
func TestAddPlayerMaxPlayers(t *testing.T) {
	pgDB := &postgres.DB{}
	m := NewMatch("test-match", pgDB)

	// Add max players
	for i := 0; i < game.MaxPlayers; i++ {
		err := m.AddPlayer(string(rune('A'+i)), string(rune('A'+i)))
		require.NoError(t, err)
	}

	assert.Equal(t, game.MaxPlayers, len(m.Players))

	// Try to add one more
	err := m.AddPlayer("overflow", "Overflow Player")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "match is full")
}

// TestRemovePlayer verifies player removal
func TestRemovePlayer(t *testing.T) {
	pgDB := &postgres.DB{}
	m := NewMatch("test-match", pgDB)

	// Add player
	err := m.AddPlayer("user1", "Player One")
	require.NoError(t, err)

	player := m.Players["user1"]
	assert.True(t, player.Connected)
	assert.Nil(t, player.DisconnectAt)

	// Remove player
	m.RemovePlayer("user1")

	// Player should still be in map but disconnected
	assert.False(t, player.Connected)
	assert.NotNil(t, player.DisconnectAt)
}

// TestRemovePlayerNonExistent verifies removing non-existent player doesn't crash
func TestRemovePlayerNonExistent(t *testing.T) {
	pgDB := &postgres.DB{}
	m := NewMatch("test-match", pgDB)

	// Should not panic
	assert.NotPanics(t, func() {
		m.RemovePlayer("nonexistent")
	})
}

// TestStartMatchSuccess verifies successful match start
func TestStartMatchSuccess(t *testing.T) {
	pgDB := &postgres.DB{}
	m := NewMatch("test-match", pgDB)

	// Add minimum players
	for i := 0; i < game.MinPlayers; i++ {
		err := m.AddPlayer(string(rune('A'+i)), string(rune('A'+i)))
		require.NoError(t, err)
	}

	// Start match
	err := m.Start()
	require.NoError(t, err)

	assert.Equal(t, engine.PhasePlaying, m.Phase)
	assert.False(t, m.StartTime.IsZero())

	// Verify players were spawned
	for _, matchPlayer := range m.Players {
		assert.NotNil(t, matchPlayer.Entity, "Player entity should be spawned")
	}

	// Cleanup
	m.GameLoop.Stop()
	m.cancel()
}

// TestStartMatchNotEnoughPlayers verifies match can't start without min players
func TestStartMatchNotEnoughPlayers(t *testing.T) {
	pgDB := &postgres.DB{}
	m := NewMatch("test-match", pgDB)

	// Add fewer than minimum players
	err := m.AddPlayer("user1", "Player One")
	require.NoError(t, err)

	// Try to start
	err = m.Start()
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not enough players")
	assert.Equal(t, engine.PhaseWaiting, m.Phase)
}

// TestStartMatchAlreadyStarted verifies match can't be started twice
func TestStartMatchAlreadyStarted(t *testing.T) {
	pgDB := &postgres.DB{}
	m := NewMatch("test-match", pgDB)

	// Add minimum players
	for i := 0; i < game.MinPlayers; i++ {
		err := m.AddPlayer(string(rune('A'+i)), string(rune('A'+i)))
		require.NoError(t, err)
	}

	// Start match
	err := m.Start()
	require.NoError(t, err)

	// Try to start again
	err = m.Start()
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "already started")

	// Cleanup
	m.GameLoop.Stop()
	m.cancel()
}

// TestGetPlayerCount verifies player count
func TestGetPlayerCount(t *testing.T) {
	pgDB := &postgres.DB{}
	m := NewMatch("test-match", pgDB)

	assert.Equal(t, 0, m.GetPlayerCount())

	m.AddPlayer("user1", "Player One")
	assert.Equal(t, 1, m.GetPlayerCount())

	m.AddPlayer("user2", "Player Two")
	assert.Equal(t, 2, m.GetPlayerCount())

	m.AddPlayer("user3", "Player Three")
	assert.Equal(t, 3, m.GetPlayerCount())
}

// TestGetPhase verifies phase retrieval
func TestGetPhase(t *testing.T) {
	pgDB := &postgres.DB{}
	m := NewMatch("test-match", pgDB)

	assert.Equal(t, engine.PhaseWaiting, m.GetPhase())

	// Add players and start
	for i := 0; i < game.MinPlayers; i++ {
		m.AddPlayer(string(rune('A'+i)), string(rune('A'+i)))
	}

	m.Start()
	assert.Equal(t, engine.PhasePlaying, m.GetPhase())

	// Cleanup
	m.GameLoop.Stop()
	m.cancel()
}

// TestIsFinished verifies finished state
func TestIsFinished(t *testing.T) {
	pgDB := &postgres.DB{}
	m := NewMatch("test-match", pgDB)

	assert.False(t, m.IsFinished())

	// Manually set to finished
	m.mu.Lock()
	m.Phase = engine.PhaseFinished
	m.mu.Unlock()

	assert.True(t, m.IsFinished())
}

// TestCalculateMMRChange verifies MMR calculation
func TestCalculateMMRChange(t *testing.T) {
	tests := []struct {
		name         string
		placement    int
		totalPlayers int
		expectedMMR  int
	}{
		{
			name:         "Winner with 4 players",
			placement:    1,
			totalPlayers: 4,
			expectedMMR:  27, // 25 + (4-2)
		},
		{
			name:         "Winner with 10 players",
			placement:    1,
			totalPlayers: 10,
			expectedMMR:  33, // 25 + (10-2)
		},
		{
			name:         "Top 25% - 2nd place in 4 players",
			placement:    2,
			totalPlayers: 4,
			expectedMMR:  5, // 2 <= ceil(4*0.5) = 2, so top 50% = +5
		},
		{
			name:         "Top 50% - 3rd place in 4 players",
			placement:    3,
			totalPlayers: 4,
			expectedMMR:  -10, // 3 > ceil(4*0.5) = 2, so bottom 50%
		},
		{
			name:         "Bottom 50% - 4th place in 4 players",
			placement:    4,
			totalPlayers: 4,
			expectedMMR:  -10,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mmr := calculateMMRChange(tt.placement, tt.totalPlayers)
			assert.Equal(t, tt.expectedMMR, mmr)
		})
	}
}

// TestMatchPlayer verifies MatchPlayer structure
func TestMatchPlayer(t *testing.T) {
	player := &MatchPlayer{
		UserID:    "user123",
		Username:  "TestPlayer",
		Connected: true,
	}

	assert.Equal(t, "user123", player.UserID)
	assert.Equal(t, "TestPlayer", player.Username)
	assert.True(t, player.Connected)
	assert.Nil(t, player.Entity)
	assert.Nil(t, player.DisconnectAt)
}

// TestMatchConcurrency verifies thread safety
func TestMatchConcurrency(t *testing.T) {
	pgDB := &postgres.DB{}
	m := NewMatch("test-match", pgDB)

	// Concurrent player additions
	done := make(chan bool, 10)

	for i := 0; i < 10; i++ {
		go func(id int) {
			userID := string(rune('A' + id))
			m.AddPlayer(userID, userID)
			done <- true
		}(i)
	}

	// Wait for all goroutines
	for i := 0; i < 10; i++ {
		<-done
	}

	// All players should be added
	assert.Equal(t, 10, m.GetPlayerCount())
}

// TestMatchPhaseTransitions verifies phase transitions
func TestMatchPhaseTransitions(t *testing.T) {
	pgDB := &postgres.DB{}
	m := NewMatch("test-match", pgDB)

	// Initial phase
	assert.Equal(t, engine.PhaseWaiting, m.GetPhase())

	// Add players
	for i := 0; i < game.MinPlayers; i++ {
		m.AddPlayer(string(rune('A'+i)), string(rune('A'+i)))
	}

	// Start match - should transition to Playing
	err := m.Start()
	require.NoError(t, err)
	assert.Equal(t, engine.PhasePlaying, m.GetPhase())

	// Note: We don't test endMatch here because it triggers saveResults
	// which requires a real database connection. That's tested in integration tests.

	// Cleanup
	m.GameLoop.Stop()
	m.cancel()
}

// BenchmarkAddPlayer benchmarks player addition
func BenchmarkAddPlayer(b *testing.B) {
	pgDB := &postgres.DB{}
	m := NewMatch("benchmark-match", pgDB)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		if i < game.MaxPlayers {
			m.AddPlayer(string(rune('A'+i)), string(rune('A'+i)))
		}
	}
}

// BenchmarkGetPlayerCount benchmarks player count retrieval
func BenchmarkGetPlayerCount(b *testing.B) {
	pgDB := &postgres.DB{}
	m := NewMatch("benchmark-match", pgDB)

	// Add some players
	for i := 0; i < 10; i++ {
		m.AddPlayer(string(rune('A'+i)), string(rune('A'+i)))
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		m.GetPlayerCount()
	}
}
