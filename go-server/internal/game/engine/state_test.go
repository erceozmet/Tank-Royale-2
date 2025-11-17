package engine

import (
	"testing"

	"github.com/erceozmet/tank-royale-2/go-server/internal/game/entities"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestNewGameState verifies game state initialization
func TestNewGameState(t *testing.T) {
	state := NewGameState("test-match-123")

	assert.Equal(t, "test-match-123", state.MatchID)
	assert.Equal(t, int64(0), state.Tick)
	assert.Equal(t, PhaseWaiting, state.Phase)
	assert.NotNil(t, state.Players)
	assert.NotNil(t, state.Projectiles)
	assert.NotNil(t, state.Obstacles)
	assert.NotNil(t, state.Crates)
	assert.NotNil(t, state.Loot)
	assert.NotNil(t, state.SafeZone)
	assert.NotNil(t, state.Rankings)
	assert.Empty(t, state.Players)
	assert.Empty(t, state.Rankings)
}

// TestAddPlayer verifies player addition
func TestAddPlayer(t *testing.T) {
	state := NewGameState("test-match")

	player := &entities.Player{
		ID:       "player1",
		Username: "TestPlayer1",
		Position: entities.Vector2D{X: 100, Y: 100},
		IsAlive:  true,
		Health:   100,
	}

	state.AddPlayer(player)

	// Verify player was added
	assert.Len(t, state.Players, 1)
	assert.Contains(t, state.Players, "player1")
	assert.Equal(t, player, state.Players["player1"])

	// Verify ranking was created
	require.Len(t, state.Rankings, 1)
	assert.Equal(t, "player1", state.Rankings[0].UserID)
	assert.Equal(t, "TestPlayer1", state.Rankings[0].Username)
	assert.Equal(t, 0, state.Rankings[0].Placement)
	assert.Equal(t, 0, state.Rankings[0].Kills)
	assert.Equal(t, 0, state.Rankings[0].DamageDealt)
	assert.True(t, state.Rankings[0].IsAlive)
}

// TestAddMultiplePlayers verifies multiple player addition
func TestAddMultiplePlayers(t *testing.T) {
	state := NewGameState("test-match")

	for i := 1; i <= 5; i++ {
		player := &entities.Player{
			ID:       string(rune('a' + i)),
			Username: "Player" + string(rune('0'+i)),
			IsAlive:  true,
			Health:   100,
		}
		state.AddPlayer(player)
	}

	assert.Len(t, state.Players, 5)
	assert.Len(t, state.Rankings, 5)
}

// TestRemovePlayer verifies player removal
func TestRemovePlayer(t *testing.T) {
	state := NewGameState("test-match")

	player1 := &entities.Player{ID: "player1", Username: "P1", IsAlive: true, Health: 100}
	player2 := &entities.Player{ID: "player2", Username: "P2", IsAlive: true, Health: 100}

	state.AddPlayer(player1)
	state.AddPlayer(player2)

	assert.Len(t, state.Players, 2)
	assert.Len(t, state.Rankings, 2)

	// Remove player1
	state.RemovePlayer("player1")

	// Player should be removed from map
	assert.Len(t, state.Players, 1)
	assert.NotContains(t, state.Players, "player1")
	assert.Contains(t, state.Players, "player2")

	// Ranking should be marked as not alive
	assert.Len(t, state.Rankings, 2) // Rankings stay
	var player1Ranking *PlayerRanking
	for i := range state.Rankings {
		if state.Rankings[i].UserID == "player1" {
			player1Ranking = &state.Rankings[i]
			break
		}
	}
	require.NotNil(t, player1Ranking)
	assert.False(t, player1Ranking.IsAlive)
}

// TestGetAlivePlayers verifies alive player filtering
func TestGetAlivePlayers(t *testing.T) {
	state := NewGameState("test-match")

	alive1 := &entities.Player{ID: "alive1", Username: "A1", IsAlive: true, Health: 100}
	alive2 := &entities.Player{ID: "alive2", Username: "A2", IsAlive: true, Health: 80}
	dead1 := &entities.Player{ID: "dead1", Username: "D1", IsAlive: false, Health: 0}
	dead2 := &entities.Player{ID: "dead2", Username: "D2", IsAlive: false, Health: 0}

	state.Players["alive1"] = alive1
	state.Players["alive2"] = alive2
	state.Players["dead1"] = dead1
	state.Players["dead2"] = dead2

	alivePlayers := state.GetAlivePlayers()

	assert.Len(t, alivePlayers, 2)
	assert.Contains(t, alivePlayers, alive1)
	assert.Contains(t, alivePlayers, alive2)
	assert.NotContains(t, alivePlayers, dead1)
	assert.NotContains(t, alivePlayers, dead2)
}

// TestGetAlivePlayerCount verifies alive player counting
func TestGetAlivePlayerCount(t *testing.T) {
	state := NewGameState("test-match")

	// No players
	assert.Equal(t, 0, state.GetAlivePlayerCount())

	// Add alive players
	state.Players["p1"] = &entities.Player{ID: "p1", IsAlive: true}
	state.Players["p2"] = &entities.Player{ID: "p2", IsAlive: true}
	state.Players["p3"] = &entities.Player{ID: "p3", IsAlive: true}
	assert.Equal(t, 3, state.GetAlivePlayerCount())

	// Add dead players
	state.Players["p4"] = &entities.Player{ID: "p4", IsAlive: false}
	state.Players["p5"] = &entities.Player{ID: "p5", IsAlive: false}
	assert.Equal(t, 3, state.GetAlivePlayerCount())

	// Kill one player
	state.Players["p2"].IsAlive = false
	assert.Equal(t, 2, state.GetAlivePlayerCount())
}

// TestUpdatePlayerRanking verifies ranking updates
func TestUpdatePlayerRanking(t *testing.T) {
	state := NewGameState("test-match")

	player := &entities.Player{ID: "player1", Username: "P1", IsAlive: true, Health: 100}
	state.AddPlayer(player)

	// Update ranking with kills and damage
	state.UpdatePlayerRanking("player1", 5, 350, true)

	assert.Len(t, state.Rankings, 1)
	assert.Equal(t, 5, state.Rankings[0].Kills)
	assert.Equal(t, 350, state.Rankings[0].DamageDealt)
	assert.True(t, state.Rankings[0].IsAlive)
	assert.Equal(t, 0, state.Rankings[0].Placement) // Still alive, no placement yet
}

// TestUpdatePlayerRankingOnDeath verifies placement assignment on death
func TestUpdatePlayerRankingOnDeath(t *testing.T) {
	state := NewGameState("test-match")

	// Add 4 players
	for i := 1; i <= 4; i++ {
		player := &entities.Player{
			ID:       "player" + string(rune('0'+i)),
			Username: "P" + string(rune('0'+i)),
			IsAlive:  true,
			Health:   100,
		}
		state.AddPlayer(player)
	}

	// Kill player4 (4 alive -> placement should be 4)
	state.Players["player4"].IsAlive = false
	state.UpdatePlayerRanking("player4", 0, 0, false)
	assert.Equal(t, 4, state.Rankings[3].Placement)

	// Kill player2 (3 alive -> placement should be 3)
	state.Players["player2"].IsAlive = false
	state.UpdatePlayerRanking("player2", 2, 100, false)
	assert.Equal(t, 3, state.Rankings[1].Placement)
	assert.Equal(t, 2, state.Rankings[1].Kills)
	assert.Equal(t, 100, state.Rankings[1].DamageDealt)

	// Kill player1 (2 alive -> placement should be 2)
	state.Players["player1"].IsAlive = false
	state.UpdatePlayerRanking("player1", 1, 50, false)
	assert.Equal(t, 2, state.Rankings[0].Placement)

	// Player3 should still be alive with no placement
	assert.True(t, state.Players["player3"].IsAlive)
	assert.Equal(t, 0, state.Rankings[2].Placement)
}

// TestGetWinner verifies winner determination
func TestGetWinner(t *testing.T) {
	state := NewGameState("test-match")

	// No players - no winner
	assert.Nil(t, state.GetWinner())

	// Multiple alive players - no winner
	p1 := &entities.Player{ID: "p1", Username: "P1", IsAlive: true, Health: 100}
	p2 := &entities.Player{ID: "p2", Username: "P2", IsAlive: true, Health: 100}
	state.Players["p1"] = p1
	state.Players["p2"] = p2
	assert.Nil(t, state.GetWinner())

	// All dead - no winner
	p1.IsAlive = false
	p2.IsAlive = false
	assert.Nil(t, state.GetWinner())

	// One alive - winner!
	p1.IsAlive = true
	winner := state.GetWinner()
	require.NotNil(t, winner)
	assert.Equal(t, "p1", winner.ID)
}

// TestGetFinalRankings verifies final rankings with winner placement
func TestGetFinalRankings(t *testing.T) {
	state := NewGameState("test-match")

	// Add 3 players
	for i := 1; i <= 3; i++ {
		player := &entities.Player{
			ID:       "player" + string(rune('0'+i)),
			Username: "P" + string(rune('0'+i)),
			IsAlive:  true,
			Health:   100,
		}
		state.AddPlayer(player)
	}

	// Kill player3 (placement 3)
	state.Players["player3"].IsAlive = false
	state.UpdatePlayerRanking("player3", 0, 0, false)

	// Kill player2 (placement 2)
	state.Players["player2"].IsAlive = false
	state.UpdatePlayerRanking("player2", 5, 200, false)

	// Player1 is the winner
	rankings := state.GetFinalRankings()

	require.Len(t, rankings, 3)

	// Winner should have placement 1
	var winnerRanking *PlayerRanking
	for i := range rankings {
		if rankings[i].UserID == "player1" {
			winnerRanking = &rankings[i]
			break
		}
	}
	require.NotNil(t, winnerRanking)
	assert.Equal(t, 1, winnerRanking.Placement)
	assert.True(t, winnerRanking.IsAlive)

	// Verify other placements
	for i := range rankings {
		if rankings[i].UserID == "player2" {
			assert.Equal(t, 2, rankings[i].Placement)
		}
		if rankings[i].UserID == "player3" {
			assert.Equal(t, 3, rankings[i].Placement)
		}
	}
}

// TestGetFinalRankingsNoWinner verifies rankings when no winner exists
func TestGetFinalRankingsNoWinner(t *testing.T) {
	state := NewGameState("test-match")

	p1 := &entities.Player{ID: "p1", Username: "P1", IsAlive: true, Health: 100}
	p2 := &entities.Player{ID: "p2", Username: "P2", IsAlive: true, Health: 100}
	state.Players["p1"] = p1
	state.Players["p2"] = p2

	state.AddPlayer(p1)
	state.AddPlayer(p2)

	// Multiple alive players, no winner
	rankings := state.GetFinalRankings()
	assert.Len(t, rankings, 2)

	// No placements assigned yet
	for _, ranking := range rankings {
		assert.Equal(t, 0, ranking.Placement)
	}
}

// TestUpdatePlayerRankingNonExistent verifies behavior with non-existent player
func TestUpdatePlayerRankingNonExistent(t *testing.T) {
	state := NewGameState("test-match")

	player := &entities.Player{ID: "player1", Username: "P1", IsAlive: true, Health: 100}
	state.AddPlayer(player)

	// Try to update non-existent player - should not panic
	assert.NotPanics(t, func() {
		state.UpdatePlayerRanking("nonexistent", 10, 500, false)
	})

	// Original player should be unchanged
	assert.Equal(t, 0, state.Rankings[0].Kills)
	assert.Equal(t, 0, state.Rankings[0].DamageDealt)
}

// TestRemovePlayerNonExistent verifies behavior when removing non-existent player
func TestRemovePlayerNonExistent(t *testing.T) {
	state := NewGameState("test-match")

	player := &entities.Player{ID: "player1", Username: "P1", IsAlive: true, Health: 100}
	state.AddPlayer(player)

	// Remove non-existent player - should not panic
	assert.NotPanics(t, func() {
		state.RemovePlayer("nonexistent")
	})

	// Original player should still exist
	assert.Len(t, state.Players, 1)
	assert.Contains(t, state.Players, "player1")
}
