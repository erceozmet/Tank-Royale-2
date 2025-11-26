package combat

import (
	"time"

	"github.com/erceozmet/tank-royale-2/go-server/internal/game"
	"github.com/erceozmet/tank-royale-2/go-server/internal/game/entities"
	"github.com/erceozmet/tank-royale-2/go-server/internal/metrics"
)

// Physics handles movement and collision detection
type Physics struct{}

// NewPhysics creates a new physics engine
func NewPhysics() *Physics {
	return &Physics{}
}

// UpdatePlayerMovement updates player position based on input and velocity
func (p *Physics) UpdatePlayerMovement(
	player *entities.Player,
	input PlayerInput,
	obstacles []*entities.Obstacle,
) {
	start := time.Now()

	if !player.IsAlive {
		return
	}

	// Calculate desired velocity based on input
	desiredVelocity := entities.Vector2D{X: 0, Y: 0}

	movementType := "idle"
	if input.MoveForward {
		desiredVelocity.Y -= game.PlayerBaseSpeed
		movementType = "walk"
	}
	if input.MoveBackward {
		desiredVelocity.Y += game.PlayerBaseSpeed
		movementType = "walk"
	}
	if input.MoveLeft {
		desiredVelocity.X -= game.PlayerBaseSpeed
		movementType = "walk"
	}
	if input.MoveRight {
		desiredVelocity.X += game.PlayerBaseSpeed
		movementType = "walk"
	}

	// Track movement if player is moving
	if desiredVelocity.Magnitude() > 0 {
		metrics.PlayerMovementsTotal.WithLabelValues(movementType).Inc()
	}

	// Normalize diagonal movement
	if desiredVelocity.Magnitude() > 0 {
		desiredVelocity = desiredVelocity.Normalize().Multiply(game.PlayerBaseSpeed)
	}

	// Calculate new position
	newPosition := player.Position.Add(desiredVelocity)

	// Check map boundaries
	boundaryCollision := false
	if newPosition.X < game.PlayerRadius {
		newPosition.X = game.PlayerRadius
		boundaryCollision = true
	}
	if newPosition.X > game.MapWidth-game.PlayerRadius {
		newPosition.X = game.MapWidth - game.PlayerRadius
		boundaryCollision = true
	}
	if newPosition.Y < game.PlayerRadius {
		newPosition.Y = game.PlayerRadius
		boundaryCollision = true
	}
	if newPosition.Y > game.MapHeight-game.PlayerRadius {
		newPosition.Y = game.MapHeight - game.PlayerRadius
		boundaryCollision = true
	}

	if boundaryCollision {
		metrics.CollisionsDetectedTotal.WithLabelValues("player_boundary").Inc()
	}

	// Check obstacle collisions
	if !p.checkObstacleCollision(newPosition, obstacles) {
		player.Position = newPosition
		player.Velocity = desiredVelocity
	} else {
		// Try sliding along obstacles
		// Try X movement only
		testX := entities.Vector2D{X: newPosition.X, Y: player.Position.Y}
		if !p.checkObstacleCollision(testX, obstacles) {
			player.Position = testX
			player.Velocity = entities.Vector2D{X: desiredVelocity.X, Y: 0}
		} else {
			// Try Y movement only
			testY := entities.Vector2D{X: player.Position.X, Y: newPosition.Y}
			if !p.checkObstacleCollision(testY, obstacles) {
				player.Position = testY
				player.Velocity = entities.Vector2D{X: 0, Y: desiredVelocity.Y}
			} else {
				// Can't move
				player.Velocity = entities.Vector2D{X: 0, Y: 0}
			}
		}
	}

	// Update body rotation based on movement direction (if moving)
	if desiredVelocity.Magnitude() > 0 {
		player.Rotation = desiredVelocity.Angle()
	}

	// Update turret rotation to aim angle from input
	player.TurretRotation = input.Rotation

	// Track movement validation duration
	metrics.MovementValidationDuration.Observe(time.Since(start).Seconds())
}

// checkObstacleCollision checks if a position collides with any obstacle
func (p *Physics) checkObstacleCollision(position entities.Vector2D, obstacles []*entities.Obstacle) bool {
	metrics.CollisionChecksTotal.Inc()

	for _, obstacle := range obstacles {
		minX, minY, maxX, maxY := obstacle.GetBounds()

		// Expand bounds by player radius for collision detection
		minX -= game.PlayerRadius
		minY -= game.PlayerRadius
		maxX += game.PlayerRadius
		maxY += game.PlayerRadius

		// Check if player position is inside expanded bounds
		if position.X >= minX && position.X <= maxX && position.Y >= minY && position.Y <= maxY {
			metrics.CollisionsDetectedTotal.WithLabelValues("player_obstacle").Inc()
			return true
		}
	}
	return false
}

// CheckPlayerCollisions checks for player-to-player collisions (push apart)
func (p *Physics) CheckPlayerCollisions(players map[string]*entities.Player) {
	start := time.Now()

	playerList := make([]*entities.Player, 0, len(players))
	for _, player := range players {
		if player.IsAlive {
			playerList = append(playerList, player)
		}
	}

	// Check all pairs
	for i := 0; i < len(playerList); i++ {
		for j := i + 1; j < len(playerList); j++ {
			p1 := playerList[i]
			p2 := playerList[j]

			metrics.CollisionChecksTotal.Inc()
			distance := p1.Position.Distance(p2.Position)
			minDistance := game.PlayerRadius * 2

			if distance < minDistance {
				// Push apart
				metrics.CollisionsDetectedTotal.WithLabelValues("player_player").Inc()
				pushDirection := p1.Position.Subtract(p2.Position).Normalize()
				pushAmount := (minDistance - distance) / 2

				p1.Position = p1.Position.Add(pushDirection.Multiply(pushAmount))
				p2.Position = p2.Position.Add(pushDirection.Multiply(-pushAmount))
			}
		}
	}

	metrics.PhysicsUpdateDuration.Observe(time.Since(start).Seconds())
}

// PlayerInput represents player input for a tick
type PlayerInput struct {
	MoveForward  bool
	MoveBackward bool
	MoveLeft     bool
	MoveRight    bool
	Rotation     float64 // Target rotation in radians
	Fire         bool
	Interact     bool // For opening crates
}
