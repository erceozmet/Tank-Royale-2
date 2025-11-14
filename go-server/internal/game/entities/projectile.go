package entities

import "time"

// Projectile represents a fired bullet
type Projectile struct {
	ID         string     `json:"id"`
	PlayerID   string     `json:"playerId"`
	Position   Vector2D   `json:"position"`
	Velocity   Vector2D   `json:"velocity"`
	Damage     int        `json:"damage"`
	WeaponType WeaponType `json:"weaponType"`
	SpawnTime  time.Time  `json:"-"`
	Lifetime   int        `json:"lifetime"` // in milliseconds
}

// NewProjectile creates a new projectile
func NewProjectile(id, playerID string, position, velocity Vector2D, damage int, weaponType WeaponType, lifetime int) *Projectile {
	return &Projectile{
		ID:         id,
		PlayerID:   playerID,
		Position:   position,
		Velocity:   velocity,
		Damage:     damage,
		WeaponType: weaponType,
		SpawnTime:  time.Now(),
		Lifetime:   lifetime,
	}
}

// IsExpired checks if the projectile has exceeded its lifetime
func (p *Projectile) IsExpired() bool {
	return time.Since(p.SpawnTime).Milliseconds() > int64(p.Lifetime)
}

// Update moves the projectile based on its velocity
func (p *Projectile) Update() {
	p.Position = p.Position.Add(p.Velocity)
}
