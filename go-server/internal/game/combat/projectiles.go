package combat

import (
	"fmt"
	"math"

	"github.com/erceozmet/tank-royale-2/go-server/internal/game"
	"github.com/erceozmet/tank-royale-2/go-server/internal/game/entities"
)

// ProjectileManager manages all projectiles in the game
type ProjectileManager struct {
	Projectiles map[string]*entities.Projectile // projectile ID -> projectile
}

// NewProjectileManager creates a new projectile manager
func NewProjectileManager() *ProjectileManager {
	return &ProjectileManager{
		Projectiles: make(map[string]*entities.Projectile),
	}
}

// FireWeapon creates a projectile from a player's weapon
func (pm *ProjectileManager) FireWeapon(player *entities.Player) (*entities.Projectile, error) {
	weaponStats := game.WeaponStatsMap[player.CurrentWeapon]

	// Check if player can fire (fire rate cooldown)
	fireRate := game.CalculateFireRate(player.CurrentWeapon, player.FireRateBoostStacks)
	if !player.CanFire(fireRate) {
		return nil, fmt.Errorf("weapon on cooldown")
	}

	// Calculate damage with boosts
	damage := game.CalculateWeaponDamage(player.CurrentWeapon, player.DamageBoostStacks)

	// Calculate projectile velocity based on player rotation and weapon speed
	velocity := entities.Vector2D{
		X: math.Cos(player.Rotation) * weaponStats.Speed,
		Y: math.Sin(player.Rotation) * weaponStats.Speed,
	}

	// Create projectile slightly in front of player
	spawnOffset := entities.Vector2D{
		X: math.Cos(player.Rotation) * 30, // Spawn 30 units in front
		Y: math.Sin(player.Rotation) * 30,
	}
	spawnPosition := player.Position.Add(spawnOffset)

	projectileID := fmt.Sprintf("proj_%s_%d", player.ID, len(pm.Projectiles))
	projectile := entities.NewProjectile(
		projectileID,
		player.ID,
		spawnPosition,
		velocity,
		damage,
		player.CurrentWeapon,
		weaponStats.Lifetime,
	)

	pm.Projectiles[projectileID] = projectile
	return projectile, nil
}

// Update updates all projectiles and removes expired ones
func (pm *ProjectileManager) Update() {
	for id, projectile := range pm.Projectiles {
		if projectile.IsExpired() {
			delete(pm.Projectiles, id)
			continue
		}
		projectile.Update()
	}
}

// RemoveProjectile removes a projectile (e.g., after collision)
func (pm *ProjectileManager) RemoveProjectile(id string) {
	delete(pm.Projectiles, id)
}

// GetProjectiles returns all active projectiles
func (pm *ProjectileManager) GetProjectiles() []*entities.Projectile {
	projectiles := make([]*entities.Projectile, 0, len(pm.Projectiles))
	for _, p := range pm.Projectiles {
		projectiles = append(projectiles, p)
	}
	return projectiles
}

// CheckProjectileCollisions checks if any projectiles hit players or obstacles
func (pm *ProjectileManager) CheckProjectileCollisions(
	players map[string]*entities.Player,
	obstacles []*entities.Obstacle,
) []CollisionEvent {
	events := make([]CollisionEvent, 0)

	for projID, proj := range pm.Projectiles {
		// Check player collisions
		for _, player := range players {
			// Don't hit the shooter
			if player.ID == proj.PlayerID {
				continue
			}

			// Skip dead players
			if !player.IsAlive {
				continue
			}

			// Check distance (simple circle collision)
			distance := proj.Position.Distance(player.Position)
			if distance <= game.PlayerRadius+game.ProjectileRadius {
				// Hit!
				died := player.TakeDamage(proj.Damage)

				events = append(events, CollisionEvent{
					Type:         CollisionTypePlayerHit,
					ProjectileID: projID,
					TargetID:     player.ID,
					ShooterID:    proj.PlayerID,
					Damage:       proj.Damage,
					PlayerDied:   died,
				})

				// Remove projectile
				pm.RemoveProjectile(projID)
				break
			}
		}

		// Check obstacle collisions
		if _, exists := pm.Projectiles[projID]; !exists {
			continue // Projectile already removed by player collision
		}

		for _, obstacle := range obstacles {
			if obstacle.ContainsPoint(proj.Position) {
				// Hit obstacle
				destroyed := false
				if !obstacle.IsStatic {
					destroyed = obstacle.TakeDamage(proj.Damage)
				}

				events = append(events, CollisionEvent{
					Type:              CollisionTypeObstacleHit,
					ProjectileID:      projID,
					TargetID:          obstacle.ID,
					ShooterID:         proj.PlayerID,
					Damage:            proj.Damage,
					ObstacleDestroyed: destroyed,
				})

				pm.RemoveProjectile(projID)
				break
			}
		}
	}

	return events
}

// CollisionType represents the type of collision
type CollisionType string

const (
	CollisionTypePlayerHit   CollisionType = "player_hit"
	CollisionTypeObstacleHit CollisionType = "obstacle_hit"
)

// CollisionEvent represents a collision that occurred
type CollisionEvent struct {
	Type              CollisionType
	ProjectileID      string
	TargetID          string
	ShooterID         string
	Damage            int
	PlayerDied        bool
	ObstacleDestroyed bool
}
