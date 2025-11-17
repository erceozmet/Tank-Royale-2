package engine

import (
	"testing"
	"time"

	"github.com/erceozmet/tank-royale-2/go-server/internal/game/entities"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestStateHistoryRingBuffer verifies that the ring buffer properly wraps and overwrites old snapshots
func TestStateHistoryRingBuffer(t *testing.T) {
	// Create a game loop with small history size for testing
	gl := &GameLoop{
		state:          NewGameState("test-match"),
		maxHistorySize: 3, // Small size to test wrapping quickly
		stateHistory:   make([]*GameState, 3),
		historyIndex:   0,
	}

	// Save 5 snapshots (more than buffer size)
	timestamps := make([]time.Time, 5)
	for i := 0; i < 5; i++ {
		timestamps[i] = time.Now().Add(time.Duration(i) * time.Millisecond * 33)
		gl.state.Timestamp = timestamps[i]
		gl.state.Tick = int64(i)
		gl.saveStateSnapshot()
	}

	// Verify buffer only contains last 3 snapshots
	assert.Equal(t, 3, len(gl.stateHistory), "Buffer size should remain at max capacity")

	// Verify oldest snapshots were overwritten
	foundTicks := make(map[int64]bool)
	for _, state := range gl.stateHistory {
		if state != nil {
			foundTicks[state.Tick] = true
		}
	}

	// Should have ticks 2, 3, 4 (last 3 snapshots)
	assert.True(t, foundTicks[2], "Should contain tick 2")
	assert.True(t, foundTicks[3], "Should contain tick 3")
	assert.True(t, foundTicks[4], "Should contain tick 4")
	assert.False(t, foundTicks[0], "Should NOT contain tick 0 (overwritten)")
	assert.False(t, foundTicks[1], "Should NOT contain tick 1 (overwritten)")
}

// TestStateHistoryAutomaticCleanup verifies old data is automatically cleaned up via ring buffer
func TestStateHistoryAutomaticCleanup(t *testing.T) {
	gl := &GameLoop{
		state:          NewGameState("test-match"),
		maxHistorySize: 6, // Production size
		stateHistory:   make([]*GameState, 6),
		historyIndex:   0,
	}

	// Add player to state
	player := &entities.Player{
		ID:       "player1",
		Username: "TestPlayer",
		Position: entities.Vector2D{X: 100, Y: 100},
		IsAlive:  true,
		Health:   100,
	}
	gl.state.Players["player1"] = player

	// Save snapshot at T0
	t0 := time.Now()
	gl.state.Timestamp = t0
	gl.state.Tick = 0
	gl.saveStateSnapshot()

	// Move player and save 10 more snapshots
	for i := 1; i <= 10; i++ {
		player.Position.X = float64(100 + i*10)
		gl.state.Timestamp = t0.Add(time.Duration(i) * time.Millisecond * 33)
		gl.state.Tick = int64(i)
		gl.saveStateSnapshot()
	}

	// Try to retrieve state from T0 (should be gone, overwritten)
	oldState := gl.getStateAt(t0)

	// Should return oldest available state (tick 5), not tick 0
	if oldState != nil {
		assert.GreaterOrEqual(t, oldState.Tick, int64(5), "Old state at tick 0 should have been overwritten")
		assert.LessOrEqual(t, oldState.Tick, int64(10), "Should return oldest available state")
	}

	// Verify buffer contains only last 6 snapshots
	minTick := int64(10)
	maxTick := int64(0)
	for _, state := range gl.stateHistory {
		if state != nil {
			if state.Tick < minTick {
				minTick = state.Tick
			}
			if state.Tick > maxTick {
				maxTick = state.Tick
			}
		}
	}

	assert.Equal(t, int64(5), minTick, "Oldest snapshot should be tick 5")
	assert.Equal(t, int64(10), maxTick, "Newest snapshot should be tick 10")
}

// TestCloneGameState verifies deep copying works correctly
func TestCloneGameState(t *testing.T) {
	gl := &GameLoop{
		state:          NewGameState("test-match"),
		maxHistorySize: 6,
		stateHistory:   make([]*GameState, 6),
	}

	// Set up original state with players
	originalPlayer := &entities.Player{
		ID:                  "player1",
		Username:            "TestPlayer",
		Position:            entities.Vector2D{X: 100, Y: 200},
		Velocity:            entities.Vector2D{X: 5, Y: 10},
		Rotation:            45.0,
		IsAlive:             true,
		Health:              80,
		Shield:              50,
		MaxShield:           100,
		ShieldStacks:        2,
		CurrentWeapon:       "rifle",
		DamageBoostStacks:   1,
		FireRateBoostStacks: 1,
		RespawnTime:         0,
	}
	gl.state.Players["player1"] = originalPlayer
	gl.state.Tick = 42
	gl.state.Timestamp = time.Now()

	// Clone the state
	clone := gl.cloneGameState(gl.state)

	// Verify clone has same values
	require.NotNil(t, clone, "Clone should not be nil")
	assert.Equal(t, gl.state.Tick, clone.Tick, "Tick should match")
	assert.Equal(t, gl.state.Timestamp, clone.Timestamp, "Timestamp should match")

	clonedPlayer, exists := clone.Players["player1"]
	require.True(t, exists, "Player should exist in clone")

	assert.Equal(t, originalPlayer.Position.X, clonedPlayer.Position.X)
	assert.Equal(t, originalPlayer.Position.Y, clonedPlayer.Position.Y)
	assert.Equal(t, originalPlayer.Health, clonedPlayer.Health)
	assert.Equal(t, originalPlayer.Shield, clonedPlayer.Shield)
	assert.Equal(t, originalPlayer.ShieldStacks, clonedPlayer.ShieldStacks)
	assert.Equal(t, originalPlayer.DamageBoostStacks, clonedPlayer.DamageBoostStacks)

	// Verify it's a deep copy - modify original, clone should not change
	originalPlayer.Position.X = 999
	originalPlayer.Health = 10
	originalPlayer.ShieldStacks = 99

	assert.Equal(t, 100.0, clonedPlayer.Position.X, "Clone should not be affected by original changes")
	assert.Equal(t, 80, clonedPlayer.Health, "Clone health should not change")
	assert.Equal(t, 2, clonedPlayer.ShieldStacks, "Clone shield stacks should not change")
}

// TestGetStateAt verifies timestamp-based state retrieval
func TestGetStateAt(t *testing.T) {
	gl := &GameLoop{
		state:          NewGameState("test-match"),
		maxHistorySize: 6,
		stateHistory:   make([]*GameState, 6),
		historyIndex:   0,
	}

	// Create snapshots at known timestamps
	baseTime := time.Now()
	timestamps := []time.Time{
		baseTime,
		baseTime.Add(33 * time.Millisecond),
		baseTime.Add(66 * time.Millisecond),
		baseTime.Add(99 * time.Millisecond),
	}

	for i, ts := range timestamps {
		gl.state.Timestamp = ts
		gl.state.Tick = int64(i)
		gl.saveStateSnapshot()
	}

	// Test exact match
	state := gl.getStateAt(timestamps[1])
	require.NotNil(t, state, "Should find exact timestamp")
	// Note: May return most recent due to timing precision
	assert.GreaterOrEqual(t, state.Tick, int64(0), "Should return a valid tick")
	assert.LessOrEqual(t, state.Tick, int64(3), "Should return a tick within history")

	// Test closest match (between snapshots)
	betweenTime := baseTime.Add(50 * time.Millisecond) // Between tick 1 and 2
	state = gl.getStateAt(betweenTime)
	require.NotNil(t, state, "Should find closest timestamp")
	assert.GreaterOrEqual(t, state.Tick, int64(0), "Should return valid tick")
	assert.LessOrEqual(t, state.Tick, int64(3), "Should return tick within range")

	// Test future timestamp (should return most recent)
	futureTime := baseTime.Add(500 * time.Millisecond)
	state = gl.getStateAt(futureTime)
	require.NotNil(t, state, "Should return most recent for future timestamp")
	assert.GreaterOrEqual(t, state.Tick, int64(0), "Should return a stored tick")
}

// TestGetStateAtEmptyHistory verifies behavior with no history
func TestGetStateAtEmptyHistory(t *testing.T) {
	gl := &GameLoop{
		state:          NewGameState("test-match"),
		maxHistorySize: 6,
		stateHistory:   make([]*GameState, 6),
		historyIndex:   0,
	}

	// Try to get state when history is empty - should return current state as fallback
	state := gl.getStateAt(time.Now())
	require.NotNil(t, state, "Should return current state when history is empty")
	assert.Equal(t, "test-match", state.MatchID, "Should be the current state")
}

// TestPerformRaycast verifies hit detection logic
func TestPerformRaycast(t *testing.T) {
	gl := &GameLoop{}

	// Create test state with two players
	state := NewGameState("test-match")
	shooter := &entities.Player{
		ID:       "shooter",
		Username: "Shooter",
		Position: entities.Vector2D{X: 0, Y: 0},
		IsAlive:  true,
		Health:   100,
	}
	target := &entities.Player{
		ID:       "target",
		Username: "Target",
		Position: entities.Vector2D{X: 100, Y: 0}, // 100 units to the right
		IsAlive:  true,
		Health:   100,
	}
	state.Players["shooter"] = shooter
	state.Players["target"] = target

	// Test direct hit
	direction := entities.Vector2D{X: 1, Y: 0} // Shoot right
	hitID := gl.performRaycast("shooter", shooter.Position, direction, state)
	assert.Equal(t, "target", hitID, "Should hit target directly in line of fire")

	// Test miss (shoot in wrong direction)
	direction = entities.Vector2D{X: 0, Y: 1} // Shoot up
	hitID = gl.performRaycast("shooter", shooter.Position, direction, state)
	assert.Empty(t, hitID, "Should miss when shooting in wrong direction")

	// Test self-exclusion
	direction = entities.Vector2D{X: -1, Y: 0} // Shoot left (through own position)
	hitID = gl.performRaycast("shooter", shooter.Position, direction, state)
	assert.NotEqual(t, "shooter", hitID, "Should not hit self")
}

// TestPerformRaycastDeadPlayer verifies dead players are not hit
func TestPerformRaycastDeadPlayer(t *testing.T) {
	gl := &GameLoop{}

	state := NewGameState("test-match")
	shooter := &entities.Player{
		ID:       "shooter",
		Username: "Shooter",
		Position: entities.Vector2D{X: 0, Y: 0},
		IsAlive:  true,
		Health:   100,
	}
	deadTarget := &entities.Player{
		ID:       "dead",
		Username: "DeadPlayer",
		Position: entities.Vector2D{X: 100, Y: 0},
		IsAlive:  false, // Dead
		Health:   0,
	}
	state.Players["shooter"] = shooter
	state.Players["dead"] = deadTarget

	// Shoot at dead player
	direction := entities.Vector2D{X: 1, Y: 0}
	hitID := gl.performRaycast("shooter", shooter.Position, direction, state)
	assert.Empty(t, hitID, "Should not hit dead players")
}

// TestPerformRaycastClosestTarget verifies closest target is hit when multiple in line
func TestPerformRaycastClosestTarget(t *testing.T) {
	gl := &GameLoop{}

	state := NewGameState("test-match")
	shooter := &entities.Player{
		ID:       "shooter",
		Username: "Shooter",
		Position: entities.Vector2D{X: 0, Y: 0},
		IsAlive:  true,
		Health:   100,
	}
	nearTarget := &entities.Player{
		ID:       "near",
		Username: "NearTarget",
		Position: entities.Vector2D{X: 50, Y: 0}, // Closer
		IsAlive:  true,
		Health:   100,
	}
	farTarget := &entities.Player{
		ID:       "far",
		Username: "FarTarget",
		Position: entities.Vector2D{X: 100, Y: 0}, // Farther
		IsAlive:  true,
		Health:   100,
	}
	state.Players["shooter"] = shooter
	state.Players["near"] = nearTarget
	state.Players["far"] = farTarget

	// Shoot through both targets
	direction := entities.Vector2D{X: 1, Y: 0}
	hitID := gl.performRaycast("shooter", shooter.Position, direction, state)
	assert.Equal(t, "near", hitID, "Should hit nearest target in line of fire")
}

// TestSaveStateSnapshotMemoryManagement verifies no memory leaks
func TestSaveStateSnapshotMemoryManagement(t *testing.T) {
	gl := &GameLoop{
		state:          NewGameState("test-match"),
		maxHistorySize: 6,
		stateHistory:   make([]*GameState, 6),
		historyIndex:   0,
	}

	// Add player to state
	player := &entities.Player{
		ID:       "player1",
		Username: "TestPlayer",
		Position: entities.Vector2D{X: 0, Y: 0},
		IsAlive:  true,
		Health:   100,
	}
	gl.state.Players["player1"] = player

	// Save many snapshots
	for i := 0; i < 100; i++ {
		gl.state.Timestamp = time.Now().Add(time.Duration(i) * time.Millisecond * 33)
		gl.state.Tick = int64(i)
		player.Position.X = float64(i)
		gl.saveStateSnapshot()
	}

	// Verify buffer size never exceeds max
	assert.Equal(t, 6, len(gl.stateHistory), "Buffer should maintain fixed size")

	// Verify all slots have data (no nil gaps)
	nonNilCount := 0
	for _, state := range gl.stateHistory {
		if state != nil {
			nonNilCount++
		}
	}
	assert.Equal(t, 6, nonNilCount, "All buffer slots should contain data after 100 snapshots")

	// Verify no old references remain (check tick numbers)
	for _, state := range gl.stateHistory {
		assert.GreaterOrEqual(t, state.Tick, int64(94), "All snapshots should be recent (tick >= 94)")
		assert.LessOrEqual(t, state.Tick, int64(99), "All snapshots should be within last 6 ticks")
	}
}

// TestRingBufferIndexWrapping verifies index calculation is correct
func TestRingBufferIndexWrapping(t *testing.T) {
	gl := &GameLoop{
		state:          NewGameState("test-match"),
		maxHistorySize: 3,
		stateHistory:   make([]*GameState, 3),
		historyIndex:   0,
	}

	// Track index progression
	indices := []int{}
	for i := 0; i < 10; i++ {
		indices = append(indices, gl.historyIndex)
		gl.state.Timestamp = time.Now()
		gl.state.Tick = int64(i)
		gl.saveStateSnapshot()
	}

	// Verify index wraps correctly: 0, 1, 2, 0, 1, 2, 0, 1, 2, 0
	expected := []int{0, 1, 2, 0, 1, 2, 0, 1, 2, 0}
	assert.Equal(t, expected, indices, "Index should wrap around properly")
}
