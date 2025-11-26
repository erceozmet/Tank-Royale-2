package combat

import (
	"fmt"
	"math"
	"time"

	"github.com/erceozmet/tank-royale-2/go-server/internal/game"
	"github.com/erceozmet/tank-royale-2/go-server/internal/game/entities"
	"github.com/erceozmet/tank-royale-2/go-server/internal/metrics"
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

	// Track metrics
	metrics.ProjectilesFired.WithLabelValues(string(player.CurrentWeapon)).Inc()
	metrics.ProjectilesActive.Inc()

	return projectile, nil
}

// Update updates all projectiles and removes expired ones
func (pm *ProjectileManager) Update() {
	for id, projectile := range pm.Projectiles {
		// Check if expired by time
		if projectile.IsExpired() {
			delete(pm.Projectiles, id)
			metrics.ProjectilesActive.Dec()
			continue
		}
		// Check if exceeded range
		if projectile.HasExceededRange() {
			delete(pm.Projectiles, id)
			metrics.ProjectilesActive.Dec()
			continue
		}
		projectile.Update()
	}
}

// RemoveProjectile removes a projectile (e.g., after collision)
func (pm *ProjectileManager) RemoveProjectile(id string) {
	if _, exists := pm.Projectiles[id]; exists {
		metrics.ProjectilesActive.Dec()
	}
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
	start := time.Now()
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
			metrics.HitboxChecksTotal.Inc()
			distance := proj.Position.Distance(player.Position)
			if distance <= game.PlayerRadius+game.ProjectileRadius {
				// Hit!
				metrics.HitboxHitsTotal.WithLabelValues("projectile").Inc()
				metrics.CollisionsDetectedTotal.WithLabelValues("player_projectile").Inc()
				metrics.DamageDealt.WithLabelValues(string(proj.WeaponType)).Observe(float64(proj.Damage))

				died := player.TakeDamage(proj.Damage)
				if died {
					metrics.PlayerDeaths.WithLabelValues(string(proj.WeaponType)).Inc()
				}

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
			metrics.HitboxChecksTotal.Inc()
			if obstacle.ContainsPoint(proj.Position) {
				// Hit obstacle
				metrics.HitboxHitsTotal.WithLabelValues("obstacle").Inc()
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

	// Track hitbox check duration
	metrics.PhysicsUpdateDuration.Observe(time.Since(start).Seconds())

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

// FireWeaponWithLagComp creates a projectile accounting for client latency
// It spawns the projectile at the shooter's historical position (where they were when they fired)
func (pm *ProjectileManager) FireWeaponWithLagComp(
	player *entities.Player,
	clientTimestamp time.Time,
	historicalPosition entities.Vector2D,
	historicalRotation float64,
) (*entities.Projectile, error) {
	weaponStats := game.WeaponStatsMap[player.CurrentWeapon]

	// Check if player can fire (fire rate cooldown)
	fireRate := game.CalculateFireRate(player.CurrentWeapon, player.FireRateBoostStacks)
	if !player.CanFire(fireRate) {
		return nil, fmt.Errorf("weapon on cooldown")
	}

	// Calculate damage with boosts
	damage := game.CalculateWeaponDamage(player.CurrentWeapon, player.DamageBoostStacks)

	// Use HISTORICAL rotation for aim direction
	velocity := entities.Vector2D{
		X: math.Cos(historicalRotation) * weaponStats.Speed,
		Y: math.Sin(historicalRotation) * weaponStats.Speed,
	}

	// Spawn at HISTORICAL position (where player was when they fired)
	spawnOffset := entities.Vector2D{
		X: math.Cos(historicalRotation) * 30, // Spawn 30 units in front
		Y: math.Sin(historicalRotation) * 30,
	}
	spawnPosition := historicalPosition.Add(spawnOffset)

	projectileID := fmt.Sprintf("proj_%s_%d", player.ID, time.Now().UnixNano())
	projectile := entities.NewProjectileWithLagComp(
		projectileID,
		player.ID,
		spawnPosition,
		velocity,
		damage,
		player.CurrentWeapon,
		weaponStats.Lifetime,
		clientTimestamp,
		weaponStats.Range,
	)

	pm.Projectiles[projectileID] = projectile

	// Update player's last fire time
	player.LastFireTime = time.Now()

	// Track metrics
	metrics.ProjectilesFired.WithLabelValues(string(player.CurrentWeapon)).Inc()
	metrics.ProjectilesActive.Inc()

	return projectile, nil
}

// SimulateForward fast-forwards a projectile to catch up with current server time
// This is used for lag compensation - when a client fires, we spawn the projectile
// at their past position and then simulate it forward to the present
// Returns any collision events that occurred during the simulation
func (pm *ProjectileManager) SimulateForward(
	proj *entities.Projectile,
	duration time.Duration,
	players map[string]*entities.Player,
	obstacles []*entities.Obstacle,
) []CollisionEvent {
	events := make([]CollisionEvent, 0)

	// Cap duration to prevent abuse (max lag compensation buffer)
	if duration > game.LagCompensationBuffer {
		duration = game.LagCompensationBuffer
	}

	// Calculate number of ticks to simulate
	ticksToSimulate := int(duration / game.TickInterval)

	for i := 0; i < ticksToSimulate; i++ {
		// Move projectile one tick
		proj.Position = proj.Position.Add(proj.Velocity)

		// Check if projectile has exceeded its range
		if proj.HasExceededRange() {
			pm.RemoveProjectile(proj.ID)
			return events
		}

		// Check if projectile is expired
		if proj.IsExpired() {
			pm.RemoveProjectile(proj.ID)
			return events
		}

		// Check for collisions during fast-forward
		collision := pm.CheckSingleProjectileCollision(proj, players, obstacles)
		if collision != nil {
			events = append(events, *collision)
			pm.RemoveProjectile(proj.ID)
			return events
		}
	}

	return events
}

// CheckSingleProjectileCollision checks one projectile against all targets
// Returns a collision event if hit, nil otherwise
func (pm *ProjectileManager) CheckSingleProjectileCollision(
	proj *entities.Projectile,
	players map[string]*entities.Player,
	obstacles []*entities.Obstacle,
) *CollisionEvent {
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

		// Check distance (circle collision)
		metrics.HitboxChecksTotal.Inc()
		distance := proj.Position.Distance(player.Position)
		if distance <= game.PlayerRadius+game.ProjectileRadius {
			// Hit!
			metrics.HitboxHitsTotal.WithLabelValues("projectile").Inc()
			metrics.CollisionsDetectedTotal.WithLabelValues("player_projectile").Inc()
			metrics.DamageDealt.WithLabelValues(string(proj.WeaponType)).Observe(float64(proj.Damage))

			died := player.TakeDamage(proj.Damage)
			if died {
				metrics.PlayerDeaths.WithLabelValues(string(proj.WeaponType)).Inc()
			}

			return &CollisionEvent{
				Type:         CollisionTypePlayerHit,
				ProjectileID: proj.ID,
				TargetID:     player.ID,
				ShooterID:    proj.PlayerID,
				Damage:       proj.Damage,
				PlayerDied:   died,
			}
		}
	}

	// Check obstacle collisions
	for _, obstacle := range obstacles {
		metrics.HitboxChecksTotal.Inc()
		if obstacle.ContainsPoint(proj.Position) {
			// Hit obstacle
			metrics.HitboxHitsTotal.WithLabelValues("obstacle").Inc()
			destroyed := false
			if !obstacle.IsStatic {
				destroyed = obstacle.TakeDamage(proj.Damage)
			}

			return &CollisionEvent{
				Type:              CollisionTypeObstacleHit,
				ProjectileID:      proj.ID,
				TargetID:          obstacle.ID,
				ShooterID:         proj.PlayerID,
				Damage:            proj.Damage,
				ObstacleDestroyed: destroyed,
			}
		}
	}

	return nil
}
