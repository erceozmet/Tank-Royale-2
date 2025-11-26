package combat

import (
	"math"
	"testing"

	"github.com/erceozmet/tank-royale-2/go-server/internal/game/entities"
	"github.com/stretchr/testify/assert"
)

// ===== Player Movement Tests =====

// TestUpdatePlayerMovement_Forward verifies forward movement
func TestUpdatePlayerMovement_Forward(t *testing.T) {
	physics := NewPhysics()

	player := &entities.Player{
		ID:       "player1",
		Position: entities.Vector2D{X: 500, Y: 500},
		IsAlive:  true,
		Health:   100,
	}

	input := PlayerInput{
		MoveForward: true,
	}

	initialY := player.Position.Y

	physics.UpdatePlayerMovement(player, input, nil)

	assert.Less(t, player.Position.Y, initialY, "Forward movement should decrease Y")
}

// TestUpdatePlayerMovement_Backward verifies backward movement
func TestUpdatePlayerMovement_Backward(t *testing.T) {
	physics := NewPhysics()

	player := &entities.Player{
		ID:       "player1",
		Position: entities.Vector2D{X: 500, Y: 500},
		IsAlive:  true,
		Health:   100,
	}

	input := PlayerInput{
		MoveBackward: true,
	}

	initialY := player.Position.Y

	physics.UpdatePlayerMovement(player, input, nil)

	assert.Greater(t, player.Position.Y, initialY, "Backward movement should increase Y")
}

// TestUpdatePlayerMovement_Left verifies left movement
func TestUpdatePlayerMovement_Left(t *testing.T) {
	physics := NewPhysics()

	player := &entities.Player{
		ID:       "player1",
		Position: entities.Vector2D{X: 500, Y: 500},
		IsAlive:  true,
		Health:   100,
	}

	input := PlayerInput{
		MoveLeft: true,
	}

	initialX := player.Position.X

	physics.UpdatePlayerMovement(player, input, nil)

	assert.Less(t, player.Position.X, initialX, "Left movement should decrease X")
}

// TestUpdatePlayerMovement_Right verifies right movement
func TestUpdatePlayerMovement_Right(t *testing.T) {
	physics := NewPhysics()

	player := &entities.Player{
		ID:       "player1",
		Position: entities.Vector2D{X: 500, Y: 500},
		IsAlive:  true,
		Health:   100,
	}

	input := PlayerInput{
		MoveRight: true,
	}

	initialX := player.Position.X

	physics.UpdatePlayerMovement(player, input, nil)

	assert.Greater(t, player.Position.X, initialX, "Right movement should increase X")
}

// TestUpdatePlayerMovement_Diagonal verifies diagonal movement is normalized
func TestUpdatePlayerMovement_Diagonal(t *testing.T) {
	physics := NewPhysics()

	playerDiagonal := &entities.Player{
		ID:       "diagonal",
		Position: entities.Vector2D{X: 500, Y: 500},
		IsAlive:  true,
		Health:   100,
	}

	playerStraight := &entities.Player{
		ID:       "straight",
		Position: entities.Vector2D{X: 500, Y: 500},
		IsAlive:  true,
		Health:   100,
	}

	diagonalInput := PlayerInput{
		MoveForward: true,
		MoveRight:   true,
	}

	straightInput := PlayerInput{
		MoveForward: true,
	}

	physics.UpdatePlayerMovement(playerDiagonal, diagonalInput, nil)
	physics.UpdatePlayerMovement(playerStraight, straightInput, nil)

	// Calculate distances moved
	diagonalDist := math.Sqrt(
		math.Pow(playerDiagonal.Position.X-500, 2) +
			math.Pow(playerDiagonal.Position.Y-500, 2),
	)
	straightDist := math.Abs(playerStraight.Position.Y - 500)

	// Diagonal movement should be normalized (same speed as straight)
	assert.InDelta(t, straightDist, diagonalDist, 0.1, "Diagonal movement should be normalized to same speed")
}

// TestUpdatePlayerMovement_NoInput verifies no movement without input
func TestUpdatePlayerMovement_NoInput(t *testing.T) {
	physics := NewPhysics()

	player := &entities.Player{
		ID:       "player1",
		Position: entities.Vector2D{X: 500, Y: 500},
		IsAlive:  true,
		Health:   100,
	}

	input := PlayerInput{} // Empty input

	physics.UpdatePlayerMovement(player, input, nil)

	assert.InDelta(t, 500, player.Position.X, 0.01, "X should not change without input")
	assert.InDelta(t, 500, player.Position.Y, 0.01, "Y should not change without input")
}

// TestUpdatePlayerMovement_DeadPlayer verifies dead players don't move
func TestUpdatePlayerMovement_DeadPlayer(t *testing.T) {
	physics := NewPhysics()

	player := &entities.Player{
		ID:       "player1",
		Position: entities.Vector2D{X: 500, Y: 500},
		IsAlive:  false, // Dead
		Health:   0,
	}

	input := PlayerInput{
		MoveForward: true,
		MoveRight:   true,
	}

	physics.UpdatePlayerMovement(player, input, nil)

	assert.InDelta(t, 500, player.Position.X, 0.01, "Dead player X should not change")
	assert.InDelta(t, 500, player.Position.Y, 0.01, "Dead player Y should not change")
}

// ===== Turret Rotation Tests =====

// TestUpdatePlayerMovement_TurretRotation verifies turret rotation is updated
func TestUpdatePlayerMovement_TurretRotation(t *testing.T) {
	physics := NewPhysics()

	player := &entities.Player{
		ID:             "player1",
		Position:       entities.Vector2D{X: 500, Y: 500},
		IsAlive:        true,
		Health:         100,
		TurretRotation: 0, // Initial rotation
	}

	input := PlayerInput{
		Rotation: math.Pi / 4, // 45 degrees
	}

	physics.UpdatePlayerMovement(player, input, nil)

	assert.InDelta(t, math.Pi/4, player.TurretRotation, 0.01, "Turret rotation should be updated")
}

// TestUpdatePlayerMovement_TurretRotationVariousAngles verifies turret rotation at various angles
func TestUpdatePlayerMovement_TurretRotationVariousAngles(t *testing.T) {
	tests := []struct {
		name     string
		rotation float64
	}{
		{"0 degrees", 0},
		{"45 degrees", math.Pi / 4},
		{"90 degrees", math.Pi / 2},
		{"180 degrees", math.Pi},
		{"270 degrees", 3 * math.Pi / 2},
		{"Negative angle", -math.Pi / 4},
		{"Full rotation", 2 * math.Pi},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			physics := NewPhysics()

			player := &entities.Player{
				ID:             "player1",
				Position:       entities.Vector2D{X: 500, Y: 500},
				IsAlive:        true,
				Health:         100,
				TurretRotation: 0,
			}

			input := PlayerInput{
				Rotation: tt.rotation,
			}

			physics.UpdatePlayerMovement(player, input, nil)

			assert.InDelta(t, tt.rotation, player.TurretRotation, 0.01, "Turret rotation should match input")
		})
	}
}

// TestUpdatePlayerMovement_TurretRotationIndependentOfMovement verifies turret rotation works without movement
func TestUpdatePlayerMovement_TurretRotationIndependentOfMovement(t *testing.T) {
	physics := NewPhysics()

	player := &entities.Player{
		ID:             "player1",
		Position:       entities.Vector2D{X: 500, Y: 500},
		IsAlive:        true,
		Health:         100,
		TurretRotation: 0,
	}

	// Only rotation, no movement
	input := PlayerInput{
		Rotation: math.Pi / 2,
	}

	physics.UpdatePlayerMovement(player, input, nil)

	// Position should not change
	assert.InDelta(t, 500, player.Position.X, 0.01)
	assert.InDelta(t, 500, player.Position.Y, 0.01)

	// But turret rotation should be updated
	assert.InDelta(t, math.Pi/2, player.TurretRotation, 0.01)
}

// TestUpdatePlayerMovement_TurretRotationWithMovement verifies turret and body can rotate independently
func TestUpdatePlayerMovement_TurretRotationWithMovement(t *testing.T) {
	physics := NewPhysics()

	player := &entities.Player{
		ID:             "player1",
		Position:       entities.Vector2D{X: 500, Y: 500},
		IsAlive:        true,
		Health:         100,
		Rotation:       0,
		TurretRotation: 0,
	}

	// Move forward (body rotation changes) but aim right (turret rotation)
	input := PlayerInput{
		MoveForward: true,
		Rotation:    math.Pi / 2, // Aim right
	}

	physics.UpdatePlayerMovement(player, input, nil)

	// Turret should aim where we told it
	assert.InDelta(t, math.Pi/2, player.TurretRotation, 0.01, "Turret should aim at input rotation")

	// Body rotation should be updated based on movement direction (up = -90 degrees)
	expectedBodyRotation := -math.Pi / 2
	assert.InDelta(t, expectedBodyRotation, player.Rotation, 0.01, "Body should rotate based on movement")
}

// ===== Boundary Tests =====

// TestUpdatePlayerMovement_BoundaryLeft verifies left boundary collision
func TestUpdatePlayerMovement_BoundaryLeft(t *testing.T) {
	physics := NewPhysics()

	player := &entities.Player{
		ID:       "player1",
		Position: entities.Vector2D{X: 10, Y: 500}, // Near left edge
		IsAlive:  true,
		Health:   100,
	}

	input := PlayerInput{
		MoveLeft: true,
	}

	physics.UpdatePlayerMovement(player, input, nil)

	// Should be clamped to boundary (PlayerRadius)
	assert.GreaterOrEqual(t, player.Position.X, float64(20), "Player should not go past left boundary")
}

// TestUpdatePlayerMovement_BoundaryTop verifies top boundary collision
func TestUpdatePlayerMovement_BoundaryTop(t *testing.T) {
	physics := NewPhysics()

	player := &entities.Player{
		ID:       "player1",
		Position: entities.Vector2D{X: 500, Y: 10}, // Near top edge
		IsAlive:  true,
		Health:   100,
	}

	input := PlayerInput{
		MoveForward: true,
	}

	physics.UpdatePlayerMovement(player, input, nil)

	// Should be clamped to boundary (PlayerRadius)
	assert.GreaterOrEqual(t, player.Position.Y, float64(20), "Player should not go past top boundary")
}

// ===== Collision Tests =====

// TestCheckPlayerCollisions verifies player-to-player collision detection
func TestCheckPlayerCollisions(t *testing.T) {
	physics := NewPhysics()

	players := map[string]*entities.Player{
		"player1": {
			ID:       "player1",
			Position: entities.Vector2D{X: 100, Y: 100},
			IsAlive:  true,
			Health:   100,
		},
		"player2": {
			ID:       "player2",
			Position: entities.Vector2D{X: 110, Y: 100}, // Very close to player1
			IsAlive:  true,
			Health:   100,
		},
	}

	// Should not panic
	assert.NotPanics(t, func() {
		physics.CheckPlayerCollisions(players)
	})
}

// TestCheckPlayerCollisions_DeadPlayersIgnored verifies dead players are ignored in collision
func TestCheckPlayerCollisions_DeadPlayersIgnored(t *testing.T) {
	physics := NewPhysics()

	players := map[string]*entities.Player{
		"player1": {
			ID:       "player1",
			Position: entities.Vector2D{X: 100, Y: 100},
			IsAlive:  true,
			Health:   100,
		},
		"dead": {
			ID:       "dead",
			Position: entities.Vector2D{X: 100, Y: 100}, // Same position as player1
			IsAlive:  false,                              // Dead
			Health:   0,
		},
	}

	// Should not affect alive player
	physics.CheckPlayerCollisions(players)

	// Positions should remain unchanged (dead player collision ignored)
	assert.InDelta(t, 100, players["player1"].Position.X, 0.01)
	assert.InDelta(t, 100, players["player1"].Position.Y, 0.01)
}

// ===== Performance Tests =====

// TestUpdatePlayerMovement_ManyPlayers verifies performance with many players
func TestUpdatePlayerMovement_ManyPlayers(t *testing.T) {
	physics := NewPhysics()

	players := make(map[string]*entities.Player)
	for i := 0; i < 100; i++ {
		players["player"+string(rune(i))] = &entities.Player{
			ID:       "player" + string(rune(i)),
			Position: entities.Vector2D{X: float64(100 + i*10), Y: float64(100 + i*10)},
			IsAlive:  true,
			Health:   100,
		}
	}

	// Should complete without issues
	assert.NotPanics(t, func() {
		for _, player := range players {
			input := PlayerInput{MoveForward: true, Rotation: 0.5}
			physics.UpdatePlayerMovement(player, input, nil)
		}
	})
}
