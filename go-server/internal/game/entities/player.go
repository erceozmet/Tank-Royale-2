package entities

import "time"

// WeaponType represents the type of weapon
type WeaponType string

const (
	WeaponPistol  WeaponType = "pistol"
	WeaponRifle   WeaponType = "rifle"
	WeaponShotgun WeaponType = "shotgun"
	WeaponSniper  WeaponType = "sniper"
)

// Player represents a player in the game
type Player struct {
	ID       string   `json:"id"`
	Username string   `json:"username"`
	Position Vector2D `json:"position"`
	Rotation float64  `json:"rotation"` // angle in radians
	Velocity Vector2D `json:"velocity"`

	// Health system
	Health       int `json:"health"`        // Base health (max 100)
	Shield       int `json:"shield"`        // Shield health (max 150, stacks of 50)
	MaxShield    int `json:"maxShield"`     // Current max shield capacity
	ShieldStacks int `json:"shieldStacks"`  // Number of shield upgrades (max 3)

	// Combat
	CurrentWeapon WeaponType `json:"currentWeapon"`
	LastFireTime  time.Time  `json:"-"` // Last time weapon was fired

	// Stat upgrades (permanent, stackable up to 3 each)
	DamageBoostStacks   int `json:"damageBoostStacks"`   // Damage upgrade count (max 3)
	FireRateBoostStacks int `json:"fireRateBoostStacks"` // Fire rate upgrade count (max 3)

	// Game stats
	Kills       int  `json:"kills"`
	IsAlive     bool `json:"isAlive"`
	RespawnTime int  `json:"respawnTime"` // Tick when player can respawn
}

// NewPlayer creates a new player with starting stats
func NewPlayer(id, username string, position Vector2D) *Player {
	return &Player{
		ID:                  id,
		Username:            username,
		Position:            position,
		Rotation:            0,
		Velocity:            Vector2D{X: 0, Y: 0},
		Health:              100,
		Shield:              0,
		MaxShield:           0,
		ShieldStacks:        0,
		CurrentWeapon:       WeaponPistol,
		LastFireTime:        time.Now(),
		DamageBoostStacks:   0,
		FireRateBoostStacks: 0,
		Kills:               0,
		IsAlive:             true,
		RespawnTime:         0,
	}
}

// TakeDamage applies damage to the player (shields absorb first)
func (p *Player) TakeDamage(damage int) bool {
	if !p.IsAlive {
		return false
	}

	// Shields absorb damage first
	if p.Shield > 0 {
		if p.Shield >= damage {
			p.Shield -= damage
			return false // Still alive
		}
		// Shield broken, remaining damage goes to health
		damage -= p.Shield
		p.Shield = 0
	}

	// Apply remaining damage to health
	p.Health -= damage
	if p.Health <= 0 {
		p.Health = 0
		p.IsAlive = false
		return true // Player died
	}

	return false
}

// AddShield adds a shield stack (max 3 stacks, +50 per stack)
func (p *Player) AddShield() bool {
	if p.ShieldStacks >= 3 {
		return false // Already at max shield stacks
	}

	p.ShieldStacks++
	p.MaxShield = p.ShieldStacks * 50
	p.Shield = p.MaxShield // Full shield on pickup

	return true
}

// AddDamageBoost adds a damage boost stack (max 3)
func (p *Player) AddDamageBoost() bool {
	if p.DamageBoostStacks >= 3 {
		return false
	}
	p.DamageBoostStacks++
	return true
}

// AddFireRateBoost adds a fire rate boost stack (max 3)
func (p *Player) AddFireRateBoost() bool {
	if p.FireRateBoostStacks >= 3 {
		return false
	}
	p.FireRateBoostStacks++
	return true
}

// CanFire checks if the player can fire based on weapon fire rate
func (p *Player) CanFire(fireRate time.Duration) bool {
	return time.Since(p.LastFireTime) >= fireRate
}

// SetWeapon changes the player's current weapon
func (p *Player) SetWeapon(weapon WeaponType) {
	p.CurrentWeapon = weapon
}
