package entities

import "time"

// Projectile represents a fired bullet
type Projectile struct {
	ID            string     `json:"id"`
	PlayerID      string     `json:"playerId"`
	Position      Vector2D   `json:"position"`
	StartPosition Vector2D   `json:"startPosition"` // For range calculation
	Velocity      Vector2D   `json:"velocity"`
	Damage        int        `json:"damage"`
	WeaponType    WeaponType `json:"weaponType"`
	SpawnTime     time.Time  `json:"-"`        // Server time when spawned
	ClientTime    time.Time  `json:"-"`        // Client timestamp for lag compensation
	Lifetime      int        `json:"lifetime"` // in milliseconds
	MaxRange      float64    `json:"-"`        // Maximum travel distance
}

// NewProjectile creates a new projectile
func NewProjectile(id, playerID string, position, velocity Vector2D, damage int, weaponType WeaponType, lifetime int) *Projectile {
	return &Projectile{
		ID:            id,
		PlayerID:      playerID,
		Position:      position,
		StartPosition: position,
		Velocity:      velocity,
		Damage:        damage,
		WeaponType:    weaponType,
		SpawnTime:     time.Now(),
		ClientTime:    time.Now(),
		Lifetime:      lifetime,
		MaxRange:      0, // Will be set by weapon stats
	}
}

// NewProjectileWithLagComp creates a new projectile with lag compensation data
func NewProjectileWithLagComp(id, playerID string, position, velocity Vector2D, damage int, weaponType WeaponType, lifetime int, clientTime time.Time, maxRange float64) *Projectile {
	return &Projectile{
		ID:            id,
		PlayerID:      playerID,
		Position:      position,
		StartPosition: position,
		Velocity:      velocity,
		Damage:        damage,
		WeaponType:    weaponType,
		SpawnTime:     time.Now(),
		ClientTime:    clientTime,
		Lifetime:      lifetime,
		MaxRange:      maxRange,
	}
}

// IsExpired checks if the projectile has exceeded its lifetime
func (p *Projectile) IsExpired() bool {
	return time.Since(p.SpawnTime).Milliseconds() > int64(p.Lifetime)
}

// HasExceededRange checks if projectile has traveled past its maximum range
func (p *Projectile) HasExceededRange() bool {
	if p.MaxRange <= 0 {
		return false // No range limit
	}
	return p.Position.Distance(p.StartPosition) >= p.MaxRange
}

// Update moves the projectile based on its velocity
func (p *Projectile) Update() {
	p.Position = p.Position.Add(p.Velocity)
}

// GetTraveledDistance returns how far the projectile has traveled from spawn
func (p *Projectile) GetTraveledDistance() float64 {
	return p.Position.Distance(p.StartPosition)
}
