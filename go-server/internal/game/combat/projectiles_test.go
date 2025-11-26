package combat

import (
	"testing"
	"time"

	"github.com/erceozmet/tank-royale-2/go-server/internal/game/entities"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewProjectileManager(t *testing.T) {
	pm := NewProjectileManager()
	assert.NotNil(t, pm)
	assert.NotNil(t, pm.Projectiles)
	assert.Empty(t, pm.Projectiles)
}

func TestFireWeapon(t *testing.T) {
	pm := NewProjectileManager()

	player := &entities.Player{
		ID:            "player-1",
		Position:      entities.Vector2D{X: 100, Y: 100},
		Rotation:      0, // Facing right
		CurrentWeapon: entities.WeaponRifle,
		LastFireTime:  time.Now().Add(-2 * time.Second), // Can fire
	}

	proj, err := pm.FireWeapon(player)
	require.NoError(t, err)
	require.NotNil(t, proj)

	assert.Equal(t, "player-1", proj.PlayerID)
	assert.Greater(t, proj.Position.X, player.Position.X) // Spawned in front
	assert.NotZero(t, proj.Velocity.X)                    // Moving
	assert.Equal(t, entities.WeaponRifle, proj.WeaponType)
}

func TestFireWeaponCooldown(t *testing.T) {
	pm := NewProjectileManager()

	player := &entities.Player{
		ID:            "player-1",
		Position:      entities.Vector2D{X: 100, Y: 100},
		Rotation:      0,
		CurrentWeapon: entities.WeaponRifle,
		LastFireTime:  time.Now(), // Just fired - on cooldown
	}

	proj, err := pm.FireWeapon(player)
	assert.Error(t, err)
	assert.Nil(t, proj)
	assert.Contains(t, err.Error(), "cooldown")
}

func TestFireWeaponWithLagComp(t *testing.T) {
	pm := NewProjectileManager()

	player := &entities.Player{
		ID:             "player-1",
		Position:       entities.Vector2D{X: 100, Y: 100},
		Rotation:       0, // Facing right
		TurretRotation: 0,
		CurrentWeapon:  entities.WeaponRifle,
		LastFireTime:   time.Now().Add(-2 * time.Second),
	}

	clientTime := time.Now().Add(-100 * time.Millisecond)
	historicalPosition := entities.Vector2D{X: 80, Y: 80} // Player was at different position
	historicalRotation := 0.0                              // Facing right

	proj, err := pm.FireWeaponWithLagComp(player, clientTime, historicalPosition, historicalRotation)
	require.NoError(t, err)
	require.NotNil(t, proj)

	assert.Equal(t, "player-1", proj.PlayerID)
	assert.Equal(t, clientTime, proj.ClientTime)
	assert.NotZero(t, proj.MaxRange)
	// Projectile should spawn near historical position (80, 80) + offset, not current position
	assert.Greater(t, proj.StartPosition.X, 80.0) // 80 + spawn offset in X direction
}

func TestSimulateForward(t *testing.T) {
	pm := NewProjectileManager()

	// Create a simple projectile moving right
	proj := entities.NewProjectileWithLagComp(
		"test-proj",
		"player-1",
		entities.Vector2D{X: 0, Y: 0},
		entities.Vector2D{X: 10, Y: 0}, // 10 units per tick
		20,
		entities.WeaponRifle,
		3000,
		time.Now().Add(-100*time.Millisecond), // Fired 100ms ago
		800.0,
	)

	// Simulate forward 100ms (3 ticks at 30 TPS)
	duration := 100 * time.Millisecond
	events := pm.SimulateForward(proj, duration, nil, nil)

	// No collisions expected with nil players
	assert.Empty(t, events)

	// Position should have moved (~3 ticks * 10 = 30 units)
	assert.Greater(t, proj.Position.X, 20.0) // At least 2 ticks worth
}

func TestSimulateForwardWithCollision(t *testing.T) {
	pm := NewProjectileManager()

	// Create projectile at origin moving right
	proj := entities.NewProjectileWithLagComp(
		"test-proj",
		"shooter",
		entities.Vector2D{X: 0, Y: 0},
		entities.Vector2D{X: 10, Y: 0}, // 10 units per tick
		20,
		entities.WeaponRifle,
		3000,
		time.Now(),
		800.0,
	)

	// Create target player directly in path
	target := &entities.Player{
		ID:       "target",
		Position: entities.Vector2D{X: 50, Y: 0}, // 50 units away
		IsAlive:  true,
		Health:   100,
	}

	players := map[string]*entities.Player{
		"shooter": {ID: "shooter", Position: entities.Vector2D{X: 0, Y: 0}},
		"target":  target,
	}

	// Simulate forward 500ms (should hit target during simulation)
	duration := 500 * time.Millisecond
	events := pm.SimulateForward(proj, duration, players, nil)

	// Should have collision event
	assert.NotEmpty(t, events, "Should detect collision with target")
	if len(events) > 0 {
		assert.Equal(t, "target", events[0].TargetID)
		assert.Equal(t, 20, events[0].Damage)
	}
}

func TestCheckSingleProjectileCollision(t *testing.T) {
	pm := NewProjectileManager()

	// Projectile at position (100, 100)
	proj := entities.NewProjectile(
		"test-proj",
		"shooter",
		entities.Vector2D{X: 100, Y: 100},
		entities.Vector2D{X: 10, Y: 0},
		20,
		entities.WeaponRifle,
		3000,
	)

	// Target very close to projectile
	target := &entities.Player{
		ID:       "target",
		Position: entities.Vector2D{X: 105, Y: 100}, // 5 units away
		IsAlive:  true,
		Health:   100,
	}

	players := map[string]*entities.Player{
		"shooter": {ID: "shooter", Position: entities.Vector2D{X: 0, Y: 0}},
		"target":  target,
	}

	event := pm.CheckSingleProjectileCollision(proj, players, nil)
	require.NotNil(t, event, "Should detect collision")
	assert.Equal(t, "target", event.TargetID)
}

func TestCheckSingleProjectileCollisionMiss(t *testing.T) {
	pm := NewProjectileManager()

	// Projectile at position (100, 100)
	proj := entities.NewProjectile(
		"test-proj",
		"shooter",
		entities.Vector2D{X: 100, Y: 100},
		entities.Vector2D{X: 10, Y: 0},
		20,
		entities.WeaponRifle,
		3000,
	)

	// Target far from projectile
	target := &entities.Player{
		ID:       "target",
		Position: entities.Vector2D{X: 500, Y: 500}, // Far away
		IsAlive:  true,
		Health:   100,
	}

	players := map[string]*entities.Player{
		"shooter": {ID: "shooter", Position: entities.Vector2D{X: 0, Y: 0}},
		"target":  target,
	}

	event := pm.CheckSingleProjectileCollision(proj, players, nil)
	assert.Nil(t, event, "Should not detect collision with distant player")
}

func TestCheckSingleProjectileCollisionDeadPlayer(t *testing.T) {
	pm := NewProjectileManager()

	proj := entities.NewProjectile(
		"test-proj",
		"shooter",
		entities.Vector2D{X: 100, Y: 100},
		entities.Vector2D{X: 10, Y: 0},
		20,
		entities.WeaponRifle,
		3000,
	)

	// Dead target at projectile position
	target := &entities.Player{
		ID:       "target",
		Position: entities.Vector2D{X: 100, Y: 100}, // Same position
		IsAlive:  false,                             // Dead
		Health:   0,
	}

	players := map[string]*entities.Player{
		"shooter": {ID: "shooter", Position: entities.Vector2D{X: 0, Y: 0}},
		"target":  target,
	}

	event := pm.CheckSingleProjectileCollision(proj, players, nil)
	assert.Nil(t, event, "Should not detect collision with dead player")
}

func TestCheckSingleProjectileCollisionSelf(t *testing.T) {
	pm := NewProjectileManager()

	// Projectile owned by shooter
	proj := entities.NewProjectile(
		"test-proj",
		"shooter",
		entities.Vector2D{X: 100, Y: 100},
		entities.Vector2D{X: 10, Y: 0},
		20,
		entities.WeaponRifle,
		3000,
	)

	// Shooter at same position as projectile
	shooter := &entities.Player{
		ID:       "shooter",
		Position: entities.Vector2D{X: 100, Y: 100}, // Same position
		IsAlive:  true,
		Health:   100,
	}

	players := map[string]*entities.Player{
		"shooter": shooter,
	}

	event := pm.CheckSingleProjectileCollision(proj, players, nil)
	assert.Nil(t, event, "Should not detect collision with own projectile owner")
}

func TestProjectileManagerUpdate(t *testing.T) {
	pm := NewProjectileManager()

	// Add two projectiles
	proj1 := entities.NewProjectileWithLagComp(
		"proj-1",
		"player-1",
		entities.Vector2D{X: 0, Y: 0},
		entities.Vector2D{X: 10, Y: 0},
		20,
		entities.WeaponShotgun, // Short range
		3000,
		time.Now(),
		50.0, // Very short range for testing
	)
	proj2 := entities.NewProjectileWithLagComp(
		"proj-2",
		"player-1",
		entities.Vector2D{X: 0, Y: 0},
		entities.Vector2D{X: 10, Y: 0},
		20,
		entities.WeaponSniper, // Long range
		3000,
		time.Now(),
		1000.0,
	)

	pm.Projectiles["proj-1"] = proj1
	pm.Projectiles["proj-2"] = proj2

	// Run updates until proj-1 exceeds range
	for i := 0; i < 10; i++ {
		pm.Update()
	}

	// proj-1 should be removed (exceeded 50 unit range at 10 units/tick after 5 ticks)
	assert.Nil(t, pm.Projectiles["proj-1"], "Short-range projectile should be removed")

	// proj-2 should still exist (has 1000 unit range)
	assert.NotNil(t, pm.Projectiles["proj-2"], "Long-range projectile should still exist")
}

func TestGetProjectiles(t *testing.T) {
	pm := NewProjectileManager()

	// Empty initially
	assert.Empty(t, pm.GetProjectiles())

	// Add projectiles
	pm.Projectiles["proj-1"] = entities.NewProjectile("proj-1", "p1", entities.Vector2D{}, entities.Vector2D{}, 10, entities.WeaponPistol, 1000)
	pm.Projectiles["proj-2"] = entities.NewProjectile("proj-2", "p2", entities.Vector2D{}, entities.Vector2D{}, 10, entities.WeaponRifle, 1000)

	projectiles := pm.GetProjectiles()
	assert.Len(t, projectiles, 2)
}

func TestRemoveProjectile(t *testing.T) {
	pm := NewProjectileManager()

	pm.Projectiles["proj-1"] = entities.NewProjectile("proj-1", "p1", entities.Vector2D{}, entities.Vector2D{}, 10, entities.WeaponPistol, 1000)

	assert.Len(t, pm.Projectiles, 1)

	pm.RemoveProjectile("proj-1")

	assert.Empty(t, pm.Projectiles)
}
