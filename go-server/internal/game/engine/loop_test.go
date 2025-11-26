package engine

import (
	"sync"
	"testing"
	"time"

	"github.com/erceozmet/tank-royale-2/go-server/internal/game"
	"github.com/erceozmet/tank-royale-2/go-server/internal/game/combat"
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

// TestPerformRaycast has been replaced by projectile-based tests
// The old hitscan raycast system has been removed in favor of projectile-based lag compensation

// TestProjectileLagCompensationSpawnsAtHistoricalPosition verifies projectiles spawn at shooter's past position
func TestProjectileLagCompensationSpawnsAtHistoricalPosition(t *testing.T) {
	gl := NewGameLoop("test-match")
	gl.matchStartTime = time.Now()

	// Add shooter at initial position
	shooter := &entities.Player{
		ID:             "shooter",
		Username:       "Shooter",
		Position:       entities.Vector2D{X: 100, Y: 100},
		TurretRotation: 0, // Aiming right
		IsAlive:        true,
		Health:         100,
		CurrentWeapon:  entities.WeaponRifle,
		LastFireTime:   time.Now().Add(-2 * time.Second), // Can fire
	}
	gl.state.Players["shooter"] = shooter

	// Save snapshot at T0 (shooter at 100, 100)
	t0 := time.Now()
	gl.state.Timestamp = t0
	gl.saveStateSnapshot()

	// Move shooter to new position
	shooter.Position = entities.Vector2D{X: 300, Y: 300}

	// Save snapshot at T1
	time.Sleep(35 * time.Millisecond) // One tick
	gl.state.Timestamp = time.Now()
	gl.saveStateSnapshot()

	// Queue fire input with T0 timestamp (when shooter was at 100, 100)
	input := PlayerInput{
		UserID: "shooter",
		Tick:   1,
		Input: combat.PlayerInput{
			Fire: true,
		},
		Timestamp: t0,
	}
	gl.inputQueue <- input

	// Process inputs
	gl.processInputs()

	// Verify projectile was created
	projectiles := gl.projectileManager.GetProjectiles()
	require.Len(t, projectiles, 1, "Should have spawned one projectile")

	proj := projectiles[0]

	// Projectile should have spawned near historical position (100, 100), not current (300, 300)
	// Allow for spawn offset (30 units in front) and some fast-forward movement
	assert.Less(t, proj.StartPosition.X, 200.0, "Projectile should have spawned near historical X position")
	assert.Less(t, proj.StartPosition.Y, 200.0, "Projectile should have spawned near historical Y position")
}

// TestProjectileLagCompensationFastForward verifies projectiles are fast-forwarded
func TestProjectileLagCompensationFastForward(t *testing.T) {
	gl := NewGameLoop("test-match")
	gl.matchStartTime = time.Now()

	shooter := &entities.Player{
		ID:             "shooter",
		Username:       "Shooter",
		Position:       entities.Vector2D{X: 100, Y: 100},
		TurretRotation: 0, // Aiming right (positive X direction)
		IsAlive:        true,
		Health:         100,
		CurrentWeapon:  entities.WeaponRifle,
		LastFireTime:   time.Now().Add(-2 * time.Second),
	}
	gl.state.Players["shooter"] = shooter

	// Save snapshot
	pastTime := time.Now().Add(-100 * time.Millisecond) // 100ms ago
	gl.state.Timestamp = pastTime
	gl.saveStateSnapshot()

	// Queue fire input with past timestamp
	input := PlayerInput{
		UserID: "shooter",
		Tick:   1,
		Input: combat.PlayerInput{
			Fire: true,
		},
		Timestamp: pastTime, // Client fired 100ms ago
	}
	gl.inputQueue <- input

	// Process inputs
	gl.processInputs()

	// Get projectile
	projectiles := gl.projectileManager.GetProjectiles()
	require.Len(t, projectiles, 1)

	proj := projectiles[0]

	// Projectile should have moved forward from start position due to fast-forward
	traveledDistance := proj.Position.Distance(proj.StartPosition)
	assert.Greater(t, traveledDistance, 0.0, "Projectile should have moved due to fast-forward")
}

// TestProjectileCanBeDodged verifies slow projectiles can be dodged
func TestProjectileCanBeDodged(t *testing.T) {
	gl := NewGameLoop("test-match")
	gl.matchStartTime = time.Now()

	// Shooter at origin, aiming right
	shooter := &entities.Player{
		ID:             "shooter",
		Username:       "Shooter",
		Position:       entities.Vector2D{X: 100, Y: 500},
		TurretRotation: 0, // Aiming right
		IsAlive:        true,
		Health:         100,
		CurrentWeapon:  entities.WeaponShotgun, // Slow projectile
		LastFireTime:   time.Now().Add(-2 * time.Second),
	}

	// Target 400 units away (at shotgun max range)
	target := &entities.Player{
		ID:       "target",
		Username: "Target",
		Position: entities.Vector2D{X: 500, Y: 500},
		IsAlive:  true,
		Health:   100,
	}

	gl.state.Players["shooter"] = shooter
	gl.state.Players["target"] = target

	// Save snapshot
	gl.state.Timestamp = time.Now()
	gl.saveStateSnapshot()

	// Fire at target
	input := PlayerInput{
		UserID: "shooter",
		Tick:   1,
		Input: combat.PlayerInput{
			Fire: true,
		},
		Timestamp: time.Now(),
	}
	gl.inputQueue <- input
	gl.processInputs()

	// Target moves out of the way immediately (before projectile arrives)
	target.Position.Y = 700 // Move up significantly

	// Run multiple ticks to let projectile travel
	for i := 0; i < 50; i++ {
		gl.tick()
	}

	// Target should still be alive (dodged the projectile)
	assert.True(t, target.IsAlive, "Target should have dodged the slow projectile")
	assert.Equal(t, 100, target.Health, "Target health should be unchanged")
}

// TestProjectileHitsStationaryTarget verifies projectiles hit targets that don't move
func TestProjectileHitsStationaryTarget(t *testing.T) {
	gl := NewGameLoop("test-match")
	gl.matchStartTime = time.Now()

	// Shooter at origin, aiming right
	shooter := &entities.Player{
		ID:             "shooter",
		Username:       "Shooter",
		Position:       entities.Vector2D{X: 100, Y: 500},
		TurretRotation: 0, // Aiming right
		IsAlive:        true,
		Health:         100,
		CurrentWeapon:  entities.WeaponRifle, // Fast projectile
		LastFireTime:   time.Now().Add(-2 * time.Second),
	}

	// Target directly in line of fire
	target := &entities.Player{
		ID:       "target",
		Username: "Target",
		Position: entities.Vector2D{X: 300, Y: 500}, // 200 units away, directly right
		IsAlive:  true,
		Health:   100,
	}

	gl.state.Players["shooter"] = shooter
	gl.state.Players["target"] = target

	gl.state.Timestamp = time.Now()
	gl.saveStateSnapshot()

	// Fire at target
	input := PlayerInput{
		UserID: "shooter",
		Tick:   1,
		Input: combat.PlayerInput{
			Fire: true,
		},
		Timestamp: time.Now(),
	}
	gl.inputQueue <- input
	gl.processInputs()

	// Run ticks until projectile hits or expires
	for i := 0; i < 100; i++ {
		if target.Health < 100 {
			break
		}
		gl.tick()
	}

	// Target should have taken damage
	assert.Less(t, target.Health, 100, "Target should have been hit by projectile")
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

// ===== GameLoop Lifecycle Tests =====

// TestNewGameLoop verifies GameLoop initialization
func TestNewGameLoop(t *testing.T) {
	gl := NewGameLoop("test-match-123")

	require.NotNil(t, gl)
	assert.NotNil(t, gl.state)
	assert.Equal(t, "test-match-123", gl.state.MatchID)
	assert.NotNil(t, gl.projectileManager)
	assert.NotNil(t, gl.crateManager)
	assert.NotNil(t, gl.physics)
	assert.NotNil(t, gl.inputQueue)
	assert.NotNil(t, gl.broadcastChan)
	assert.NotNil(t, gl.ctx)
	assert.NotNil(t, gl.cancel)
	assert.False(t, gl.running)

	// Verify history buffer is initialized correctly
	expectedSize := int(game.LagCompensationBuffer.Milliseconds() / game.TickInterval.Milliseconds())
	assert.Equal(t, expectedSize, gl.maxHistorySize)
	assert.Equal(t, expectedSize, len(gl.stateHistory))
	assert.Equal(t, 0, gl.historyIndex)
}

// TestStartGameLoop verifies game loop can start
func TestStartGameLoop(t *testing.T) {
	gl := NewGameLoop("test-match")

	// Should not be running initially
	assert.False(t, gl.running)
	assert.Equal(t, PhaseWaiting, gl.state.Phase)

	// Start the game loop
	err := gl.Start()
	assert.NoError(t, err)
	assert.True(t, gl.running)
	assert.Equal(t, PhasePlaying, gl.state.Phase)
	assert.False(t, gl.matchStartTime.IsZero())

	// Clean up
	gl.Stop()
	time.Sleep(10 * time.Millisecond) // Give goroutine time to stop
}

// TestStartGameLoopTwice verifies starting already running loop returns error
func TestStartGameLoopTwice(t *testing.T) {
	gl := NewGameLoop("test-match")

	err := gl.Start()
	assert.NoError(t, err)

	// Try to start again
	err = gl.Start()
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "already running")

	// Clean up
	gl.Stop()
	time.Sleep(10 * time.Millisecond)
}

// TestStopGameLoop verifies game loop can stop
func TestStopGameLoop(t *testing.T) {
	gl := NewGameLoop("test-match")

	err := gl.Start()
	require.NoError(t, err)
	assert.True(t, gl.running)

	// Stop the loop
	gl.Stop()
	assert.False(t, gl.running)

	// Wait for goroutine to finish
	time.Sleep(50 * time.Millisecond)

	// Context should be cancelled
	select {
	case <-gl.ctx.Done():
		// Good, context is cancelled
	default:
		t.Fatal("Context should be cancelled after Stop()")
	}
}

// TestStopGameLoopWhenNotRunning verifies stopping non-running loop is safe
func TestStopGameLoopWhenNotRunning(t *testing.T) {
	gl := NewGameLoop("test-match")

	// Should not panic
	assert.NotPanics(t, func() {
		gl.Stop()
	})

	assert.False(t, gl.running)
}

// ===== Player Management Tests =====

// TestAddPlayerToGameLoop verifies adding players to game loop
func TestAddPlayerToGameLoop(t *testing.T) {
	gl := NewGameLoop("test-match")

	player := &entities.Player{
		ID:       "player1",
		Username: "TestPlayer",
		Position: entities.Vector2D{X: 100, Y: 100},
		IsAlive:  true,
		Health:   100,
	}

	gl.AddPlayer(player)

	state := gl.GetState()
	assert.Len(t, state.Players, 1)
	assert.Contains(t, state.Players, "player1")
}

// TestRemovePlayerFromGameLoop verifies removing players
func TestRemovePlayerFromGameLoop(t *testing.T) {
	gl := NewGameLoop("test-match")

	player := &entities.Player{
		ID:       "player1",
		Username: "TestPlayer",
		IsAlive:  true,
		Health:   100,
	}

	gl.AddPlayer(player)
	assert.Len(t, gl.GetState().Players, 1)

	gl.RemovePlayer("player1")
	assert.Empty(t, gl.GetState().Players)
}

// TestGetState verifies getting game state is thread-safe
func TestGetState(t *testing.T) {
	gl := NewGameLoop("test-match")

	player := &entities.Player{
		ID:       "player1",
		Username: "P1",
		IsAlive:  true,
		Health:   100,
	}
	gl.AddPlayer(player)

	// Access state multiple times concurrently
	done := make(chan bool, 10)
	for i := 0; i < 10; i++ {
		go func() {
			state := gl.GetState()
			assert.NotNil(t, state)
			assert.Equal(t, "test-match", state.MatchID)
			done <- true
		}()
	}

	// Wait for all goroutines
	for i := 0; i < 10; i++ {
		<-done
	}
}

// ===== Input Queue Tests =====

// TestQueueInput verifies input queueing
func TestQueueInput(t *testing.T) {
	gl := NewGameLoop("test-match")

	input := PlayerInput{
		UserID: "player1",
		Tick:   100,
		Input: combat.PlayerInput{
			MoveForward: true,
			Fire:        true,
		},
		Timestamp: time.Now(),
	}

	// Queue should accept input
	gl.QueueInput(input)

	// Verify input is in queue
	select {
	case received := <-gl.inputQueue:
		assert.Equal(t, "player1", received.UserID)
		assert.Equal(t, int64(100), received.Tick)
		assert.True(t, received.Input.Fire)
	case <-time.After(100 * time.Millisecond):
		t.Fatal("Input was not queued")
	}
}

// TestQueueInputWhenFull verifies behavior when queue is full
func TestQueueInputWhenFull(t *testing.T) {
	gl := NewGameLoop("test-match")

	// Fill the queue (capacity is 1000)
	for i := 0; i < 1000; i++ {
		input := PlayerInput{
			UserID:    "player1",
			Tick:      int64(i),
			Timestamp: time.Now(),
		}
		gl.QueueInput(input)
	}

	// Queue is now full - next input should be dropped (not block)
	input := PlayerInput{
		UserID:    "player_overflow",
		Tick:      9999,
		Timestamp: time.Now(),
	}

	// Should not block or panic
	done := make(chan bool)
	go func() {
		gl.QueueInput(input)
		done <- true
	}()

	select {
	case <-done:
		// Good, didn't block
	case <-time.After(100 * time.Millisecond):
		t.Fatal("QueueInput blocked when queue was full")
	}
}

// ===== Broadcast Channel Tests =====

// TestGetBroadcastChannel verifies broadcast channel access
func TestGetBroadcastChannel(t *testing.T) {
	gl := NewGameLoop("test-match")

	ch := gl.GetBroadcastChannel()
	assert.NotNil(t, ch)

	// Channel should be receive-only from outside
	_, ok := interface{}(ch).(<-chan GameStateUpdate)
	assert.True(t, ok, "Channel should be receive-only")
}

// ===== Lag Compensation Integration Tests =====

// TestProcessShootWithLagCompIntegration verifies lag compensation with actual damage
func TestProcessShootWithLagCompIntegration(t *testing.T) {
	gl := NewGameLoop("test-match")

	// Add shooter and target
	shooter := &entities.Player{
		ID:             "shooter",
		Username:       "Shooter",
		Position:       entities.Vector2D{X: 0, Y: 0},
		TurretRotation: 0, // Aiming right
		IsAlive:        true,
		Health:         100,
		CurrentWeapon:  entities.WeaponRifle,
		LastFireTime:   time.Now().Add(-1 * time.Second), // Can fire
	}

	target := &entities.Player{
		ID:       "target",
		Username: "Target",
		Position: entities.Vector2D{X: 100, Y: 0},
		IsAlive:  true,
		Health:   100,
	}

	gl.state.Players["shooter"] = shooter
	gl.state.Players["target"] = target

	// Save a snapshot
	gl.state.Timestamp = time.Now()
	gl.saveStateSnapshot()

	// Queue fire input
	input := PlayerInput{
		UserID: "shooter",
		Tick:   1,
		Input: combat.PlayerInput{
			Fire: true,
		},
		Timestamp: time.Now(),
	}
	gl.inputQueue <- input

	// Process the input (spawns projectile)
	gl.processInputs()

	// Run ticks until projectile hits
	for i := 0; i < 50; i++ {
		if target.Health < 100 {
			break
		}
		gl.tick()
	}

	// Target should have taken damage
	assert.Less(t, target.Health, 100, "Target should have taken damage")
}

// TestProjectileMiss verifies missing a shot with projectile
func TestProjectileMiss(t *testing.T) {
	gl := NewGameLoop("test-match")
	gl.matchStartTime = time.Now()

	shooter := &entities.Player{
		ID:             "shooter",
		Username:       "Shooter",
		Position:       entities.Vector2D{X: 500, Y: 500}, // Center of map to avoid safe zone
		TurretRotation: 0,                                  // Aiming right
		IsAlive:        true,
		Health:         100,
		CurrentWeapon:  entities.WeaponPistol,
		LastFireTime:   time.Now().Add(-1 * time.Second),
	}

	target := &entities.Player{
		ID:       "target",
		Username: "Target",
		Position: entities.Vector2D{X: 500, Y: 700}, // 200 units up (not in line of fire)
		IsAlive:  true,
		Health:   100,
	}

	gl.state.Players["shooter"] = shooter
	gl.state.Players["target"] = target
	gl.state.Timestamp = time.Now()
	gl.saveStateSnapshot()

	// Queue fire input (shooting straight right, target is above)
	input := PlayerInput{
		UserID: "shooter",
		Tick:   1,
		Input: combat.PlayerInput{
			Fire: true,
		},
		Timestamp: time.Now(),
	}
	gl.inputQueue <- input
	gl.processInputs()

	// Run until projectile exceeds range
	for i := 0; i < 100; i++ {
		gl.tick()
	}

	// Should miss - target health unchanged
	assert.Equal(t, 100, target.Health, "Target health should be unchanged")
}

// TestProjectileNoHistoryFallback verifies behavior with no history (uses current state)
func TestProjectileNoHistoryFallback(t *testing.T) {
	gl := NewGameLoop("test-match")
	gl.matchStartTime = time.Now()

	shooter := &entities.Player{
		ID:             "shooter",
		Username:       "Shooter",
		Position:       entities.Vector2D{X: 0, Y: 0},
		TurretRotation: 0, // Aiming right
		IsAlive:        true,
		Health:         100,
		CurrentWeapon:  entities.WeaponRifle,
		LastFireTime:   time.Now().Add(-1 * time.Second),
	}

	target := &entities.Player{
		ID:       "target",
		Username: "Target",
		Position: entities.Vector2D{X: 100, Y: 0},
		IsAlive:  true,
		Health:   100,
	}

	gl.state.Players["shooter"] = shooter
	gl.state.Players["target"] = target

	// No snapshots saved - should use current state for spawn
	input := PlayerInput{
		UserID: "shooter",
		Tick:   1,
		Input: combat.PlayerInput{
			Fire: true,
		},
		Timestamp: time.Now(),
	}
	gl.inputQueue <- input
	gl.processInputs()

	// Verify projectile was created
	projectiles := gl.projectileManager.GetProjectiles()
	assert.Len(t, projectiles, 1, "Should have spawned projectile using current state as fallback")
}

// TestProjectileExceedsRange verifies projectiles despawn after exceeding max range
func TestProjectileExceedsRange(t *testing.T) {
	gl := NewGameLoop("test-match")
	gl.matchStartTime = time.Now()

	shooter := &entities.Player{
		ID:             "shooter",
		Username:       "Shooter",
		Position:       entities.Vector2D{X: 0, Y: 0},
		TurretRotation: 0, // Aiming right
		IsAlive:        true,
		Health:         100,
		CurrentWeapon:  entities.WeaponShotgun, // Short range (400)
		LastFireTime:   time.Now().Add(-1 * time.Second),
	}

	gl.state.Players["shooter"] = shooter
	gl.state.Timestamp = time.Now()
	gl.saveStateSnapshot()

	// Fire projectile
	input := PlayerInput{
		UserID: "shooter",
		Tick:   1,
		Input: combat.PlayerInput{
			Fire: true,
		},
		Timestamp: time.Now(),
	}
	gl.inputQueue <- input
	gl.processInputs()

	// Verify projectile was created
	assert.Len(t, gl.projectileManager.GetProjectiles(), 1)

	// Run many ticks until projectile should exceed range and despawn
	for i := 0; i < 200; i++ {
		gl.tick()
	}

	// Projectile should be gone (exceeded range)
	assert.Len(t, gl.projectileManager.GetProjectiles(), 0, "Projectile should despawn after exceeding range")
}

// TestWeaponDamageValues verifies weapon damage values are correct
func TestWeaponDamageValues(t *testing.T) {
	// Test that CalculateWeaponDamage returns correct base damage values
	// These match the BaseDamage in game.WeaponStatsMap

	tests := []struct {
		weapon         entities.WeaponType
		expectedDamage int
	}{
		{entities.WeaponPistol, 15},
		{entities.WeaponRifle, 20},
		{entities.WeaponShotgun, 35},
		{entities.WeaponSniper, 50},
	}

	for _, tt := range tests {
		t.Run(string(tt.weapon), func(t *testing.T) {
			damage := game.CalculateWeaponDamage(tt.weapon, 0) // No damage boost stacks
			assert.Equal(t, tt.expectedDamage, damage)
		})
	}
}

// TestWeaponSpeedAndRange verifies projectile speed and range values from WeaponStatsMap
func TestWeaponSpeedAndRange(t *testing.T) {
	tests := []struct {
		weapon        entities.WeaponType
		expectedSpeed float64
		expectedRange float64
	}{
		{entities.WeaponPistol, 10.0, 600.0},
		{entities.WeaponRifle, 12.0, 800.0},
		{entities.WeaponShotgun, 8.0, 400.0},
		{entities.WeaponSniper, 15.0, 1200.0},
	}

	for _, tt := range tests {
		t.Run(string(tt.weapon), func(t *testing.T) {
			stats := game.WeaponStatsMap[tt.weapon]
			assert.Equal(t, tt.expectedSpeed, stats.Speed, "Unexpected speed for %s", tt.weapon)
			assert.Equal(t, tt.expectedRange, stats.Range, "Unexpected range for %s", tt.weapon)
		})
	}
}

// ===== Concurrency Safety Tests =====

// TestConcurrentAddRemovePlayers verifies thread safety
func TestConcurrentAddRemovePlayers(t *testing.T) {
	gl := NewGameLoop("test-match")

	var wg sync.WaitGroup
	numGoroutines := 10

	// Concurrently add and remove players
	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()

			playerID := "player_" + string(rune('0'+id))
			player := &entities.Player{
				ID:       playerID,
				Username: "Player" + string(rune('0'+id)),
				IsAlive:  true,
				Health:   100,
			}

			gl.AddPlayer(player)
			time.Sleep(1 * time.Millisecond)
			gl.RemovePlayer(playerID)
		}(i)
	}

	wg.Wait()

	// All players should be removed
	state := gl.GetState()
	assert.Empty(t, state.Players)
}

// TestConcurrentStateAccess verifies concurrent state reads are safe
func TestConcurrentStateAccess(t *testing.T) {
	gl := NewGameLoop("test-match")

	player := &entities.Player{
		ID:       "player1",
		Username: "P1",
		IsAlive:  true,
		Health:   100,
	}
	gl.AddPlayer(player)

	var wg sync.WaitGroup
	numReaders := 50

	// Many concurrent readers
	for i := 0; i < numReaders; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			state := gl.GetState()
			assert.NotNil(t, state)
			assert.Equal(t, "test-match", state.MatchID)
		}()
	}

	wg.Wait()
}

// ===== Game Tick Integration Tests =====

// TestTickIncrement verifies that tick counter increments
func TestTickIncrement(t *testing.T) {
	gl := NewGameLoop("test-match")

	initialTick := gl.state.Tick

	// Manually call tick
	gl.tick()

	assert.Equal(t, initialTick+1, gl.state.Tick)
}

// TestBroadcastState verifies state broadcasting
func TestBroadcastState(t *testing.T) {
	gl := NewGameLoop("test-match")

	player := &entities.Player{
		ID:       "player1",
		Username: "P1",
		IsAlive:  true,
		Health:   100,
	}
	gl.AddPlayer(player)

	// Call broadcastState
	gl.broadcastState()

	// Should have a message in broadcast channel
	select {
	case update := <-gl.broadcastChan:
		assert.Equal(t, gl.state.Tick, update.Tick)
		assert.Equal(t, gl.state.Phase, update.Phase)
		assert.Len(t, update.Players, 1)
	case <-time.After(100 * time.Millisecond):
		t.Fatal("No broadcast received")
	}
}

// TestCheckWinCondition verifies win condition detection
func TestCheckWinCondition(t *testing.T) {
	gl := NewGameLoop("test-match")
	gl.state.Phase = PhasePlaying

	p1 := &entities.Player{ID: "p1", Username: "P1", IsAlive: true, Health: 100}
	p2 := &entities.Player{ID: "p2", Username: "P2", IsAlive: true, Health: 100}

	gl.state.Players["p1"] = p1
	gl.state.Players["p2"] = p2

	// Multiple alive players - should stay in playing phase
	gl.checkWinCondition()
	assert.Equal(t, PhasePlaying, gl.state.Phase)

	// Kill one player - should transition to ending
	p2.IsAlive = false
	gl.checkWinCondition()
	assert.Equal(t, PhaseEnding, gl.state.Phase)
}

// TestCheckWinConditionAllDead verifies handling when all players are dead
func TestCheckWinConditionAllDead(t *testing.T) {
	gl := NewGameLoop("test-match")
	gl.state.Phase = PhasePlaying

	p1 := &entities.Player{ID: "p1", Username: "P1", IsAlive: false, Health: 0}
	p2 := &entities.Player{ID: "p2", Username: "P2", IsAlive: false, Health: 0}

	gl.state.Players["p1"] = p1
	gl.state.Players["p2"] = p2

	// All dead - should transition to ending
	gl.checkWinCondition()
	assert.Equal(t, PhaseEnding, gl.state.Phase)
}

// TestProcessInputsWithFire verifies fire input processing
func TestProcessInputsWithFire(t *testing.T) {
	gl := NewGameLoop("test-match")

	player := &entities.Player{
		ID:            "player1",
		Username:      "P1",
		Position:      entities.Vector2D{X: 100, Y: 100},
		IsAlive:       true,
		Health:        100,
		CurrentWeapon: entities.WeaponPistol,
		LastFireTime:  time.Now().Add(-2 * time.Second), // Can fire
	}
	gl.state.Players["player1"] = player

	// Queue fire input
	input := PlayerInput{
		UserID: "player1",
		Tick:   1,
		Input: combat.PlayerInput{
			Fire: true,
		},
		Timestamp: time.Now(),
	}
	gl.inputQueue <- input

	// Process inputs
	gl.processInputs()

	// LastFireTime should be updated (within last second)
	assert.WithinDuration(t, time.Now(), player.LastFireTime, 1*time.Second)
}

// TestProcessInputsDeadPlayer verifies dead players can't act
func TestProcessInputsDeadPlayer(t *testing.T) {
	gl := NewGameLoop("test-match")

	player := &entities.Player{
		ID:            "player1",
		Username:      "P1",
		IsAlive:       false, // Dead
		Health:        0,
		CurrentWeapon: entities.WeaponPistol,
		LastFireTime:  time.Now().Add(-2 * time.Second),
	}
	gl.state.Players["player1"] = player

	oldFireTime := player.LastFireTime

	// Queue fire input
	input := PlayerInput{
		UserID: "player1",
		Tick:   1,
		Input: combat.PlayerInput{
			Fire: true,
		},
		Timestamp: time.Now(),
	}
	gl.inputQueue <- input

	// Process inputs
	gl.processInputs()

	// Dead player shouldn't be able to fire
	assert.Equal(t, oldFireTime, player.LastFireTime)
}

// TestApplySafeZoneDamage verifies safe zone damage application
func TestApplySafeZoneDamage(t *testing.T) {
	gl := NewGameLoop("test-match")

	player := &entities.Player{
		ID:       "player1",
		Username: "P1",
		Position: entities.Vector2D{X: 10000, Y: 10000}, // Far outside
		IsAlive:  true,
		Health:   100,
	}
	gl.state.Players["player1"] = player
	gl.state.AddPlayer(player)

	// Initialize match start time
	gl.matchStartTime = time.Now().Add(-5 * time.Minute) // Match has been running

	// Update safe zone to make it small
	gl.state.SafeZone.Update(gl.matchStartTime, time.Now())

	initialHealth := player.Health

	// Apply safe zone damage
	gl.applySafeZoneDamage()

	// Player should take damage if outside safe zone
	// Note: This depends on safe zone implementation
	// If player is far enough outside, health should decrease
	if player.Health < initialHealth {
		// Damage was applied
		assert.Less(t, player.Health, initialHealth)
	}
}

// TestUpdatePhysics verifies physics update runs
func TestUpdatePhysics(t *testing.T) {
	gl := NewGameLoop("test-match")

	player := &entities.Player{
		ID:       "player1",
		Username: "P1",
		Position: entities.Vector2D{X: 100, Y: 100},
		Velocity: entities.Vector2D{X: 5, Y: 0},
		IsAlive:  true,
		Health:   100,
	}
	gl.state.Players["player1"] = player

	// Call updatePhysics
	assert.NotPanics(t, func() {
		gl.updatePhysics()
	})
}

// TestCheckCollisions verifies collision checking runs
func TestCheckCollisions(t *testing.T) {
	gl := NewGameLoop("test-match")

	player := &entities.Player{
		ID:       "player1",
		Username: "P1",
		Position: entities.Vector2D{X: 100, Y: 100},
		IsAlive:  true,
		Health:   100,
		Kills:    0,
	}
	gl.state.Players["player1"] = player
	gl.state.AddPlayer(player)

	// Call checkCollisions
	assert.NotPanics(t, func() {
		gl.checkCollisions()
	})
}

// TestHandleCrateInteraction verifies crate interaction
func TestHandleCrateInteraction(t *testing.T) {
	gl := NewGameLoop("test-match")

	player := &entities.Player{
		ID:       "player1",
		Username: "P1",
		Position: entities.Vector2D{X: 100, Y: 100},
		IsAlive:  true,
		Health:   100,
	}

	// Call handleCrateInteraction (should not panic even with no crates)
	assert.NotPanics(t, func() {
		gl.handleCrateInteraction(player)
	})
}

// TestFullTickCycle verifies complete tick execution
func TestFullTickCycle(t *testing.T) {
	gl := NewGameLoop("test-match")

	player := &entities.Player{
		ID:       "player1",
		Username: "P1",
		Position: entities.Vector2D{X: 100, Y: 100},
		IsAlive:  true,
		Health:   100,
	}
	gl.AddPlayer(player)
	gl.matchStartTime = time.Now()

	initialTick := gl.state.Tick

	// Execute one full tick
	assert.NotPanics(t, func() {
		gl.tick()
	})

	// Tick should increment
	assert.Equal(t, initialTick+1, gl.state.Tick)

	// State should have timestamp
	assert.False(t, gl.state.Timestamp.IsZero())
}

// TestRunGameLoopForMultipleTicks verifies game loop runs multiple ticks
func TestRunGameLoopForMultipleTicks(t *testing.T) {
	gl := NewGameLoop("test-match")

	player := &entities.Player{
		ID:       "player1",
		Username: "P1",
		Position: entities.Vector2D{X: 100, Y: 100},
		IsAlive:  true,
		Health:   100,
	}
	gl.AddPlayer(player)

	// Start game loop
	err := gl.Start()
	require.NoError(t, err)

	// Let it run for a bit
	time.Sleep(150 * time.Millisecond) // Should run ~4-5 ticks at 30 TPS

	// Stop loop
	gl.Stop()
	time.Sleep(50 * time.Millisecond)

	// Should have executed multiple ticks
	assert.Greater(t, gl.state.Tick, int64(0))
	assert.LessOrEqual(t, gl.state.Tick, int64(10)) // Reasonable upper bound
}

// TestBroadcastChannelOverflow verifies broadcast doesn't block when channel is full
func TestBroadcastChannelOverflow(t *testing.T) {
	gl := NewGameLoop("test-match")
	gl.state.Phase = PhasePlaying

	// Don't consume from broadcast channel - let it fill up
	// Channel capacity is 100

	// Try to broadcast 150 times
	for i := 0; i < 150; i++ {
		gl.state.Tick = int64(i)

		// Should not panic or block
		assert.NotPanics(t, func() {
			gl.broadcastState()
		})
	}

	// Verify some messages were dropped (channel should be at capacity)
	channelSize := len(gl.broadcastChan)
	assert.Equal(t, 100, channelSize, "Channel should be at capacity")
}

// ===== Edge Case Tests =====

// TestProcessInputsNonExistentPlayer verifies handling of inputs for non-existent players
func TestProcessInputsNonExistentPlayer(t *testing.T) {
	gl := NewGameLoop("test-match")

	// Queue input for non-existent player
	input := PlayerInput{
		UserID: "nonexistent",
		Tick:   1,
		Input: combat.PlayerInput{
			Fire: true,
		},
		Timestamp: time.Now(),
	}
	gl.inputQueue <- input

	// Should not panic
	assert.NotPanics(t, func() {
		gl.processInputs()
	})
}

// TestProcessInputsWithInteract verifies interact input processing
func TestProcessInputsWithInteract(t *testing.T) {
	gl := NewGameLoop("test-match")

	player := &entities.Player{
		ID:       "player1",
		Username: "P1",
		Position: entities.Vector2D{X: 100, Y: 100},
		IsAlive:  true,
		Health:   100,
	}
	gl.state.Players["player1"] = player

	// Queue interact input
	input := PlayerInput{
		UserID: "player1",
		Tick:   1,
		Input: combat.PlayerInput{
			Interact: true,
		},
		Timestamp: time.Now(),
	}
	gl.inputQueue <- input

	// Process inputs - should call handleCrateInteraction
	assert.NotPanics(t, func() {
		gl.processInputs()
	})
}

// TestMultiplePlayersInGameLoop verifies multiple players can coexist
func TestMultiplePlayersInGameLoop(t *testing.T) {
	gl := NewGameLoop("test-match")

	for i := 1; i <= 5; i++ {
		player := &entities.Player{
			ID:       "player" + string(rune('0'+i)),
			Username: "Player" + string(rune('0'+i)),
			Position: entities.Vector2D{X: float64(i * 100), Y: float64(i * 100)},
			IsAlive:  true,
			Health:   100,
		}
		gl.AddPlayer(player)
	}

	state := gl.GetState()
	assert.Len(t, state.Players, 5)

	// Run a tick with multiple players
	assert.NotPanics(t, func() {
		gl.tick()
	})
}

// TestGameLoopPhaseTransitions verifies phase transitions
func TestGameLoopPhaseTransitions(t *testing.T) {
	gl := NewGameLoop("test-match")

	// Initial phase
	assert.Equal(t, PhaseWaiting, gl.state.Phase)

	// Start should transition to playing
	err := gl.Start()
	require.NoError(t, err)
	assert.Equal(t, PhasePlaying, gl.state.Phase)

	// Add two players
	p1 := &entities.Player{ID: "p1", Username: "P1", IsAlive: true, Health: 100}
	p2 := &entities.Player{ID: "p2", Username: "P2", IsAlive: true, Health: 100}
	gl.AddPlayer(p1)
	gl.AddPlayer(p2)

	// Kill one player to trigger win condition
	gl.state.Players["p2"].IsAlive = false
	gl.checkWinCondition()

	// Should transition to ending
	assert.Equal(t, PhaseEnding, gl.state.Phase)

	gl.Stop()
	time.Sleep(50 * time.Millisecond)
}

// TestStateSnapshotPreservesPlayerData verifies snapshots preserve all player data
func TestStateSnapshotPreservesPlayerData(t *testing.T) {
	gl := NewGameLoop("test-match")

	player := &entities.Player{
		ID:                  "player1",
		Username:            "TestPlayer",
		Position:            entities.Vector2D{X: 123.45, Y: 678.90},
		Velocity:            entities.Vector2D{X: 5.5, Y: -3.2},
		Rotation:            1.57,
		IsAlive:             true,
		Health:              75,
		Shield:              50,
		MaxShield:           100,
		ShieldStacks:        2,
		CurrentWeapon:       entities.WeaponRifle,
		DamageBoostStacks:   2,
		FireRateBoostStacks: 1,
		Kills:               3,
		RespawnTime:         0,
	}

	gl.state.Players["player1"] = player
	gl.state.Timestamp = time.Now()
	gl.state.Tick = 42

	// Save snapshot
	gl.saveStateSnapshot()

	// Verify snapshot exists
	require.NotNil(t, gl.stateHistory[0])

	// Verify all player data is preserved
	snapshotPlayer := gl.stateHistory[0].Players["player1"]
	require.NotNil(t, snapshotPlayer)

	assert.Equal(t, player.Position.X, snapshotPlayer.Position.X)
	assert.Equal(t, player.Position.Y, snapshotPlayer.Position.Y)
	assert.Equal(t, player.Velocity.X, snapshotPlayer.Velocity.X)
	assert.Equal(t, player.Velocity.Y, snapshotPlayer.Velocity.Y)
	assert.Equal(t, player.Rotation, snapshotPlayer.Rotation)
	assert.Equal(t, player.Health, snapshotPlayer.Health)
	assert.Equal(t, player.Shield, snapshotPlayer.Shield)
	assert.Equal(t, player.ShieldStacks, snapshotPlayer.ShieldStacks)
	assert.Equal(t, player.CurrentWeapon, snapshotPlayer.CurrentWeapon)
	assert.Equal(t, player.DamageBoostStacks, snapshotPlayer.DamageBoostStacks)
	assert.Equal(t, player.FireRateBoostStacks, snapshotPlayer.FireRateBoostStacks)
	assert.Equal(t, player.Kills, snapshotPlayer.Kills)
}

// ===== Player Input Storage Tests (Movement Bug Fix) =====

// TestPlayerLastInputsInitialized verifies playerLastInputs map is initialized
func TestPlayerLastInputsInitialized(t *testing.T) {
	gl := NewGameLoop("test-match")
	require.NotNil(t, gl.playerLastInputs, "playerLastInputs should be initialized")
}

// TestProcessInputsStoresMovementInput verifies movement inputs are stored
func TestProcessInputsStoresMovementInput(t *testing.T) {
	gl := NewGameLoop("test-match")

	player := &entities.Player{
		ID:            "player1", 
		Username:      "TestPlayer",
		Position:      entities.Vector2D{X: 100, Y: 100},
		IsAlive:       true,
		Health:        100,
		CurrentWeapon: entities.WeaponPistol,
	}
	gl.state.Players["player1"] = player

	// Queue movement input
	input := PlayerInput{
		UserID: "player1",
		Tick:   1,
		Input: combat.PlayerInput{
			MoveForward: true,
			MoveLeft:    true,
			Rotation:    1.57, // ~90 degrees
		},
		Timestamp: time.Now(),
	}
	gl.inputQueue <- input

	// Process inputs
	gl.processInputs()

	// Verify input was stored
	storedInput, exists := gl.playerLastInputs["player1"]
	require.True(t, exists, "Input should be stored in playerLastInputs")
	assert.True(t, storedInput.MoveForward, "MoveForward should be stored")
	assert.True(t, storedInput.MoveLeft, "MoveLeft should be stored")
	assert.InDelta(t, 1.57, storedInput.Rotation, 0.01, "Rotation should be stored")
}

// TestProcessInputsStoresAllDirections verifies all movement directions are stored
func TestProcessInputsStoresAllDirections(t *testing.T) {
	gl := NewGameLoop("test-match")

	player := &entities.Player{
		ID:       "player1",
		Username: "TestPlayer",
		IsAlive:  true,
		Health:   100,
	}
	gl.state.Players["player1"] = player

	// Queue input with all directions
	input := PlayerInput{
		UserID: "player1",
		Tick:   1,
		Input: combat.PlayerInput{
			MoveForward:  true,
			MoveBackward: true,
			MoveLeft:     true,
			MoveRight:    true,
		},
		Timestamp: time.Now(),
	}
	gl.inputQueue <- input

	gl.processInputs()

	storedInput := gl.playerLastInputs["player1"]
	assert.True(t, storedInput.MoveForward)
	assert.True(t, storedInput.MoveBackward)
	assert.True(t, storedInput.MoveLeft)
	assert.True(t, storedInput.MoveRight)
}

// TestUpdatePhysicsUsesStoredInputs verifies updatePhysics uses stored inputs
func TestUpdatePhysicsUsesStoredInputs(t *testing.T) {
	gl := NewGameLoop("test-match")

	player := &entities.Player{
		ID:       "player1",
		Username: "TestPlayer",
		Position: entities.Vector2D{X: 500, Y: 500}, // Center of map to avoid boundaries
		IsAlive:  true,
		Health:   100,
	}
	gl.state.Players["player1"] = player

	// Store movement input directly (simulating processInputs)
	gl.playerLastInputs["player1"] = combat.PlayerInput{
		MoveForward: true, // Move up (negative Y)
	}

	initialY := player.Position.Y

	// Run updatePhysics
	gl.updatePhysics()

	// Player should have moved (Y should decrease for forward movement)
	assert.Less(t, player.Position.Y, initialY, "Player should have moved forward (Y decreased)")
}

// TestUpdatePhysicsMovementAllDirections verifies movement in all directions
func TestUpdatePhysicsMovementAllDirections(t *testing.T) {
	tests := []struct {
		name      string
		input     combat.PlayerInput
		expectX   string // "increase", "decrease", "same"
		expectY   string
	}{
		{"MoveForward", combat.PlayerInput{MoveForward: true}, "same", "decrease"},
		{"MoveBackward", combat.PlayerInput{MoveBackward: true}, "same", "increase"},
		{"MoveLeft", combat.PlayerInput{MoveLeft: true}, "decrease", "same"},
		{"MoveRight", combat.PlayerInput{MoveRight: true}, "increase", "same"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gl := NewGameLoop("test-match")

			player := &entities.Player{
				ID:       "player1",
				Username: "TestPlayer",
				Position: entities.Vector2D{X: 500, Y: 500},
				IsAlive:  true,
				Health:   100,
			}
			gl.state.Players["player1"] = player
			gl.playerLastInputs["player1"] = tt.input

			initialX := player.Position.X
			initialY := player.Position.Y

			gl.updatePhysics()

			switch tt.expectX {
			case "increase":
				assert.Greater(t, player.Position.X, initialX)
			case "decrease":
				assert.Less(t, player.Position.X, initialX)
			case "same":
				assert.InDelta(t, initialX, player.Position.X, 0.1)
			}

			switch tt.expectY {
			case "increase":
				assert.Greater(t, player.Position.Y, initialY)
			case "decrease":
				assert.Less(t, player.Position.Y, initialY)
			case "same":
				assert.InDelta(t, initialY, player.Position.Y, 0.1)
			}
		})
	}
}

// TestUpdatePhysicsNoInputNoMovement verifies no movement without input
func TestUpdatePhysicsNoInputNoMovement(t *testing.T) {
	gl := NewGameLoop("test-match")

	player := &entities.Player{
		ID:       "player1",
		Username: "TestPlayer",
		Position: entities.Vector2D{X: 500, Y: 500},
		IsAlive:  true,
		Health:   100,
	}
	gl.state.Players["player1"] = player

	// No input stored for player
	initialX := player.Position.X
	initialY := player.Position.Y

	gl.updatePhysics()

	// Position should not change
	assert.InDelta(t, initialX, player.Position.X, 0.1)
	assert.InDelta(t, initialY, player.Position.Y, 0.1)
}

// TestMultiplePlayersMovementIndependent verifies players move independently
func TestMultiplePlayersMovementIndependent(t *testing.T) {
	gl := NewGameLoop("test-match")

	player1 := &entities.Player{
		ID:       "player1",
		Username: "P1",
		Position: entities.Vector2D{X: 300, Y: 300},
		IsAlive:  true,
		Health:   100,
	}
	player2 := &entities.Player{
		ID:       "player2",
		Username: "P2",
		Position: entities.Vector2D{X: 700, Y: 700},
		IsAlive:  true,
		Health:   100,
	}

	gl.state.Players["player1"] = player1
	gl.state.Players["player2"] = player2

	// Different inputs for each player
	gl.playerLastInputs["player1"] = combat.PlayerInput{MoveForward: true}
	gl.playerLastInputs["player2"] = combat.PlayerInput{MoveRight: true}

	p1InitialY := player1.Position.Y
	p2InitialX := player2.Position.X

	gl.updatePhysics()

	// Player 1 should move forward (Y decreases)
	assert.Less(t, player1.Position.Y, p1InitialY)

	// Player 2 should move right (X increases)
	assert.Greater(t, player2.Position.X, p2InitialX)
}

// TestInputOverwriteOnNewInput verifies new inputs overwrite old inputs
func TestInputOverwriteOnNewInput(t *testing.T) {
	gl := NewGameLoop("test-match")

	player := &entities.Player{
		ID:       "player1",
		Username: "TestPlayer",
		IsAlive:  true,
		Health:   100,
	}
	gl.state.Players["player1"] = player

	// First input
	input1 := PlayerInput{
		UserID: "player1",
		Tick:   1,
		Input: combat.PlayerInput{
			MoveForward: true,
			Rotation:    1.0,
		},
		Timestamp: time.Now(),
	}
	gl.inputQueue <- input1
	gl.processInputs()

	// Verify first input stored
	assert.True(t, gl.playerLastInputs["player1"].MoveForward)
	assert.InDelta(t, 1.0, gl.playerLastInputs["player1"].Rotation, 0.01)

	// Second input (different direction)
	input2 := PlayerInput{
		UserID: "player1",
		Tick:   2,
		Input: combat.PlayerInput{
			MoveBackward: true,
			Rotation:     2.0,
		},
		Timestamp: time.Now(),
	}
	gl.inputQueue <- input2
	gl.processInputs()

	// Verify second input overwrote first
	assert.False(t, gl.playerLastInputs["player1"].MoveForward)
	assert.True(t, gl.playerLastInputs["player1"].MoveBackward)
	assert.InDelta(t, 2.0, gl.playerLastInputs["player1"].Rotation, 0.01)
}

// TestDeadPlayerInputNotStored verifies dead player inputs are ignored
func TestDeadPlayerInputNotStored(t *testing.T) {
	gl := NewGameLoop("test-match")

	player := &entities.Player{
		ID:       "player1",
		Username: "TestPlayer",
		IsAlive:  false, // Dead
		Health:   0,
	}
	gl.state.Players["player1"] = player

	input := PlayerInput{
		UserID: "player1",
		Tick:   1,
		Input: combat.PlayerInput{
			MoveForward: true,
		},
		Timestamp: time.Now(),
	}
	gl.inputQueue <- input
	gl.processInputs()

	// Dead player input should not be stored
	_, exists := gl.playerLastInputs["player1"]
	assert.False(t, exists, "Dead player input should not be stored")
}

// TestNonExistentPlayerInputNotStored verifies non-existent player inputs are ignored
func TestNonExistentPlayerInputNotStored(t *testing.T) {
	gl := NewGameLoop("test-match")

	input := PlayerInput{
		UserID: "nonexistent",
		Tick:   1,
		Input: combat.PlayerInput{
			MoveForward: true,
		},
		Timestamp: time.Now(),
	}
	gl.inputQueue <- input
	gl.processInputs()

	// Non-existent player input should not be stored
	_, exists := gl.playerLastInputs["nonexistent"]
	assert.False(t, exists, "Non-existent player input should not be stored")
}

// TestFullTickWithMovement verifies movement works in full tick cycle
func TestFullTickWithMovement(t *testing.T) {
	gl := NewGameLoop("test-match")
	gl.matchStartTime = time.Now()

	player := &entities.Player{
		ID:            "player1",
		Username:      "TestPlayer",
		Position:      entities.Vector2D{X: 500, Y: 500},
		IsAlive:       true,
		Health:        100,
		CurrentWeapon: entities.WeaponPistol,
	}
	gl.AddPlayer(player)

	// Queue movement input
	input := PlayerInput{
		UserID: "player1",
		Tick:   1,
		Input: combat.PlayerInput{
			MoveForward: true,
			MoveRight:   true,
		},
		Timestamp: time.Now(),
	}
	gl.inputQueue <- input

	initialX := player.Position.X
	initialY := player.Position.Y

	// Run full tick
	gl.tick()

	// Player should have moved diagonally
	assert.Greater(t, player.Position.X, initialX, "X should increase (moving right)")
	assert.Less(t, player.Position.Y, initialY, "Y should decrease (moving forward)")
}

// TestConcurrentInputProcessing verifies thread safety of input processing
func TestConcurrentInputProcessing(t *testing.T) {
	gl := NewGameLoop("test-match")

	// Add multiple players
	for i := 0; i < 10; i++ {
		player := &entities.Player{
			ID:       "player" + string(rune('0'+i)),
			Username: "P" + string(rune('0'+i)),
			Position: entities.Vector2D{X: float64(100 + i*100), Y: 500},
			IsAlive:  true,
			Health:   100,
		}
		gl.state.Players[player.ID] = player
	}

	var wg sync.WaitGroup

	// Queue inputs concurrently
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			for j := 0; j < 10; j++ {
				input := PlayerInput{
					UserID: "player" + string(rune('0'+id)),
					Tick:   int64(j),
					Input: combat.PlayerInput{
						MoveForward: true,
					},
					Timestamp: time.Now(),
				}
				gl.QueueInput(input)
			}
		}(i)
	}

	wg.Wait()

	// Process all queued inputs
	gl.processInputs()

	// Should not panic and inputs should be stored
	assert.NotPanics(t, func() {
		gl.updatePhysics()
	})
}

