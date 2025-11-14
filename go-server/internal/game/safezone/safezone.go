package safezone

import (
	"time"

	"github.com/erceozmet/tank-royale-2/go-server/internal/game"
	"github.com/erceozmet/tank-royale-2/go-server/internal/game/entities"
)

// SafeZone represents the shrinking play area
type SafeZone struct {
	Center        entities.Vector2D `json:"center"`
	Radius        float64           `json:"radius"`
	NextCenter    entities.Vector2D `json:"nextCenter"`
	NextRadius    float64           `json:"nextRadius"`
	ShrinkStart   time.Time         `json:"-"`
	ShrinkEnd     time.Time         `json:"-"`
	IsShrinking   bool              `json:"isShrinking"`
	DamagePerTick int               `json:"damagePerTick"`
}

// NewSafeZone creates a new safe zone covering the entire map
func NewSafeZone() *SafeZone {
	center := entities.Vector2D{
		X: game.MapWidth / 2,
		Y: game.MapHeight / 2,
	}

	// Initial radius covers the entire map
	initialRadius := (game.MapWidth + game.MapHeight) / 4 // Average of width and height divided by 2

	return &SafeZone{
		Center:        center,
		Radius:        initialRadius,
		NextCenter:    center,
		NextRadius:    initialRadius,
		IsShrinking:   false,
		DamagePerTick: game.SafeZoneDamagePerTick,
	}
}

// Update updates the safe zone based on elapsed time
func (sz *SafeZone) Update(matchStartTime time.Time, currentTime time.Time) {
	elapsed := currentTime.Sub(matchStartTime)

	// Check if it's time to start shrinking
	if !sz.IsShrinking && elapsed >= game.SafeZoneShrinkStartTime {
		sz.StartShrinking(currentTime)
	}

	// Update shrinking progress
	if sz.IsShrinking {
		sz.UpdateShrinking(currentTime)
	}
}

// StartShrinking initiates the safe zone shrinking process
func (sz *SafeZone) StartShrinking(currentTime time.Time) {
	sz.IsShrinking = true
	sz.ShrinkStart = currentTime
	sz.ShrinkEnd = currentTime.Add(game.SafeZoneShrinkDuration)

	// Calculate next center (slightly random, but within bounds)
	// For simplicity, move towards map center
	sz.NextCenter = entities.Vector2D{
		X: game.MapWidth / 2,
		Y: game.MapHeight / 2,
	}
	sz.NextRadius = game.SafeZoneMinRadius
}

// UpdateShrinking updates the safe zone during shrinking
func (sz *SafeZone) UpdateShrinking(currentTime time.Time) {
	if !sz.IsShrinking {
		return
	}

	// Check if shrinking is complete
	if currentTime.After(sz.ShrinkEnd) {
		sz.Center = sz.NextCenter
		sz.Radius = sz.NextRadius
		sz.IsShrinking = false
		return
	}

	// Calculate progress (0.0 to 1.0)
	totalDuration := sz.ShrinkEnd.Sub(sz.ShrinkStart)
	elapsed := currentTime.Sub(sz.ShrinkStart)
	progress := float64(elapsed) / float64(totalDuration)

	// Interpolate between current and next values
	sz.Center = sz.interpolatePosition(sz.Center, sz.NextCenter, progress)
	sz.Radius = sz.interpolateRadius(sz.Radius, sz.NextRadius, progress)
}

// interpolatePosition interpolates between two positions
func (sz *SafeZone) interpolatePosition(start, end entities.Vector2D, progress float64) entities.Vector2D {
	return entities.Vector2D{
		X: start.X + (end.X-start.X)*progress,
		Y: start.Y + (end.Y-start.Y)*progress,
	}
}

// interpolateRadius interpolates between two radii
func (sz *SafeZone) interpolateRadius(start, end, progress float64) float64 {
	return start + (end-start)*progress
}

// IsPositionSafe checks if a position is inside the safe zone
func (sz *SafeZone) IsPositionSafe(position entities.Vector2D) bool {
	distance := position.Distance(sz.Center)
	return distance <= sz.Radius
}

// GetDistanceFromEdge returns how far outside the safe zone a position is (negative if inside)
func (sz *SafeZone) GetDistanceFromEdge(position entities.Vector2D) float64 {
	distance := position.Distance(sz.Center)
	return distance - sz.Radius
}

// ApplyDamageToPlayer applies safe zone damage to a player if they're outside
func (sz *SafeZone) ApplyDamageToPlayer(player *entities.Player) bool {
	if player == nil || !player.IsAlive {
		return false
	}

	if !sz.IsPositionSafe(player.Position) {
		return player.TakeDamage(sz.DamagePerTick)
	}

	return false
}

// GetShrinkProgress returns the current shrink progress (0.0 to 1.0)
func (sz *SafeZone) GetShrinkProgress(currentTime time.Time) float64 {
	if !sz.IsShrinking {
		return 0.0
	}

	totalDuration := sz.ShrinkEnd.Sub(sz.ShrinkStart)
	elapsed := currentTime.Sub(sz.ShrinkStart)
	progress := float64(elapsed) / float64(totalDuration)

	if progress > 1.0 {
		return 1.0
	}
	return progress
}
