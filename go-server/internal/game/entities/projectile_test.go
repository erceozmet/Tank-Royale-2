package entities

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewProjectile(t *testing.T) {
	proj := NewProjectile(
		"test-proj",
		"player-1",
		Vector2D{X: 100, Y: 200},
		Vector2D{X: 10, Y: 0},
		20,
		WeaponRifle,
		3000, // 3 second lifetime
	)

	assert.Equal(t, "test-proj", proj.ID)
	assert.Equal(t, "player-1", proj.PlayerID)
	assert.Equal(t, 100.0, proj.Position.X)
	assert.Equal(t, 200.0, proj.Position.Y)
	assert.Equal(t, 10.0, proj.Velocity.X)
	assert.Equal(t, 0.0, proj.Velocity.Y)
	assert.Equal(t, 20, proj.Damage)
	assert.Equal(t, WeaponRifle, proj.WeaponType)
	assert.False(t, proj.IsExpired())
}

func TestNewProjectileWithLagComp(t *testing.T) {
	spawnPos := Vector2D{X: 100, Y: 200}
	velocity := Vector2D{X: 10, Y: 0}
	clientTime := time.Now().Add(-100 * time.Millisecond)

	proj := NewProjectileWithLagComp(
		"test-proj",
		"player-1",
		spawnPos,
		velocity,
		20,
		WeaponRifle,
		3000,
		clientTime,
		800.0, // Max range
	)

	assert.Equal(t, "test-proj", proj.ID)
	assert.Equal(t, "player-1", proj.PlayerID)
	assert.Equal(t, 100.0, proj.Position.X)
	assert.Equal(t, 200.0, proj.Position.Y)
	assert.Equal(t, 100.0, proj.StartPosition.X)
	assert.Equal(t, 200.0, proj.StartPosition.Y)
	assert.Equal(t, 800.0, proj.MaxRange)
	assert.Equal(t, clientTime, proj.ClientTime)
}

func TestProjectileUpdate(t *testing.T) {
	proj := NewProjectile(
		"test-proj",
		"player-1",
		Vector2D{X: 100, Y: 100},
		Vector2D{X: 5, Y: 3}, // Moving diagonally
		20,
		WeaponPistol,
		3000,
	)

	// Update projectile
	proj.Update()

	// Position should have changed by velocity
	assert.Equal(t, 105.0, proj.Position.X)
	assert.Equal(t, 103.0, proj.Position.Y)

	// Update again
	proj.Update()
	assert.Equal(t, 110.0, proj.Position.X)
	assert.Equal(t, 106.0, proj.Position.Y)
}

func TestProjectileIsExpired(t *testing.T) {
	// Create projectile with very short lifetime
	proj := NewProjectile(
		"test-proj",
		"player-1",
		Vector2D{X: 0, Y: 0},
		Vector2D{X: 0, Y: 0},
		20,
		WeaponPistol,
		10, // 10ms lifetime
	)

	// Should not be expired immediately
	assert.False(t, proj.IsExpired())

	// Wait for expiration
	time.Sleep(15 * time.Millisecond)

	// Should be expired now
	assert.True(t, proj.IsExpired())
}

func TestProjectileGetTraveledDistance(t *testing.T) {
	proj := NewProjectileWithLagComp(
		"test-proj",
		"player-1",
		Vector2D{X: 0, Y: 0}, // Start at origin
		Vector2D{X: 3, Y: 4}, // Pythagorean triple velocity
		20,
		WeaponRifle,
		3000,
		time.Now(),
		800.0,
	)

	// Initially, distance should be 0
	assert.Equal(t, 0.0, proj.GetTraveledDistance())

	// Move projectile
	proj.Position = Vector2D{X: 30, Y: 40} // 3-4-5 triangle * 10 = 50 distance

	// Distance should be 50
	assert.Equal(t, 50.0, proj.GetTraveledDistance())
}

func TestProjectileHasExceededRange(t *testing.T) {
	proj := NewProjectileWithLagComp(
		"test-proj",
		"player-1",
		Vector2D{X: 0, Y: 0},
		Vector2D{X: 10, Y: 0}, // Moving right
		20,
		WeaponShotgun,
		3000,
		time.Now(),
		100.0, // Short max range for testing
	)

	// Initially, should not exceed range
	assert.False(t, proj.HasExceededRange())

	// Move within range
	proj.Position = Vector2D{X: 50, Y: 0}
	assert.False(t, proj.HasExceededRange())

	// Move to exactly max range - should be considered exceeded (>= check)
	proj.Position = Vector2D{X: 100, Y: 0}
	assert.True(t, proj.HasExceededRange(), "At exactly max range, projectile should be considered exceeded")

	// Move beyond max range
	proj.Position = Vector2D{X: 101, Y: 0}
	assert.True(t, proj.HasExceededRange())
}

func TestProjectileHasExceededRangeNoMaxRange(t *testing.T) {
	// For legacy projectiles without MaxRange set
	proj := NewProjectile(
		"test-proj",
		"player-1",
		Vector2D{X: 0, Y: 0},
		Vector2D{X: 10, Y: 0},
		20,
		WeaponRifle,
		3000,
	)

	// Should never exceed range if MaxRange is 0
	proj.Position = Vector2D{X: 10000, Y: 0}
	assert.False(t, proj.HasExceededRange())
}

func TestProjectileMultipleUpdates(t *testing.T) {
	proj := NewProjectileWithLagComp(
		"test-proj",
		"player-1",
		Vector2D{X: 0, Y: 0},
		Vector2D{X: 10, Y: 0},
		20,
		WeaponRifle,
		3000,
		time.Now(),
		500.0,
	)

	// Run 60 updates (simulating ~2 seconds at 30 TPS)
	for i := 0; i < 60; i++ {
		if proj.HasExceededRange() {
			break
		}
		proj.Update()
	}

	// After 50 updates (500 units), should exceed range
	distance := proj.GetTraveledDistance()
	require.GreaterOrEqual(t, distance, 500.0, "Projectile should have traveled at least 500 units")
	assert.True(t, proj.HasExceededRange(), "Projectile should have exceeded max range")
}
