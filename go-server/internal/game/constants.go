package game

import (
	"time"

	"github.com/erceozmet/tank-royale-2/go-server/internal/game/entities"
)

// Game timing constants
const (
	ServerTickRate = 30                                   // Ticks per second
	TickInterval   = time.Second / ServerTickRate         // ~33.33ms
	ClientFPS      = 60                                   // Target client frame rate
	ClientInterval = time.Second / ClientFPS              // ~16.67ms
)

// Match constants
const (
	MinPlayers = 2
	MaxPlayers = 16
)

// Map constants
const (
	MapWidth  = 4000.0
	MapHeight = 4000.0
)

// Player constants
const (
	PlayerMaxHealth   = 100
	PlayerBaseSpeed   = 5.0 // Units per tick
	PlayerRadius      = 20.0 // Collision radius
	PlayerSpawnRadius = 50.0 // Spawn distance from center
)

// Shield constants
const (
	ShieldPerStack = 50
	MaxShieldStacks = 3
	MaxShield = ShieldPerStack * MaxShieldStacks // 150
)

// Stat boost constants
const (
	MaxDamageBoostStacks   = 3
	MaxFireRateBoostStacks = 3
	DamageBoostPercent     = 15.0 // 15% damage increase per stack
	FireRateBoostPercent   = 20.0 // 20% fire rate increase per stack (lower cooldown)
)

// Weapon stats
type WeaponStats struct {
	BaseDamage int
	FireRate   time.Duration
	Range      float64
	Speed      float64
	Lifetime   int // milliseconds
}

var WeaponStatsMap = map[entities.WeaponType]WeaponStats{
	entities.WeaponPistol: {
		BaseDamage: 15,
		FireRate:   500 * time.Millisecond,
		Range:      600.0,
		Speed:      10.0,
		Lifetime:   3000,
	},
	entities.WeaponRifle: {
		BaseDamage: 20,
		FireRate:   400 * time.Millisecond,
		Range:      800.0,
		Speed:      12.0,
		Lifetime:   3500,
	},
	entities.WeaponShotgun: {
		BaseDamage: 35,
		FireRate:   800 * time.Millisecond,
		Range:      400.0,
		Speed:      8.0,
		Lifetime:   2000,
	},
	entities.WeaponSniper: {
		BaseDamage: 50,
		FireRate:   1200 * time.Millisecond,
		Range:      1200.0,
		Speed:      15.0,
		Lifetime:   4000,
	},
}

// Projectile constants
const (
	ProjectileRadius = 5.0 // Collision radius
)

// Loot constants
const (
	LootCollectionRadius = 30.0 // Distance to collect loot
	CrateRadius          = 25.0 // Crate size
)

// Safe zone constants
const (
	SafeZoneShrinkStartTime = 2 * time.Minute // When safe zone starts shrinking
	SafeZoneShrinkDuration  = 3 * time.Minute // How long it takes to fully shrink
	SafeZoneDamagePerTick   = 2                // Damage per tick outside safe zone
	SafeZoneMinRadius       = 200.0            // Final safe zone radius
)

// Obstacle constants
const (
	ObstacleMinSize     = 30.0
	ObstacleMaxSize     = 100.0
	ObstacleDensity     = 0.35 // 35% of map covered by obstacles
	ObstacleMinDistance = 150.0 // Minimum distance between obstacles
)

// Network constants
const (
	InterestRadius          = 800.0                 // Radius for state updates
	LagCompensationBuffer   = 200 * time.Millisecond // Time to keep state history
	MaxMessageSize          = 65536                  // Max WebSocket message size
	WriteWait               = 10 * time.Second       // Time allowed to write message
	PongWait                = 60 * time.Second       // Time allowed to read pong
	PingPeriod              = (PongWait * 9) / 10    // Send pings to peer with this period
	MaxMessageQueueSize     = 256                    // Max messages queued per connection
)

// Calculate effective weapon stats with boosts
func CalculateWeaponDamage(baseWeapon entities.WeaponType, damageBoostStacks int) int {
	stats := WeaponStatsMap[baseWeapon]
	damage := float64(stats.BaseDamage)
	
	// Apply damage boost: each stack adds 15%
	if damageBoostStacks > 0 {
		multiplier := 1.0 + (float64(damageBoostStacks) * DamageBoostPercent / 100.0)
		damage *= multiplier
	}
	
	return int(damage)
}

// Calculate effective fire rate with boosts (lower is faster)
func CalculateFireRate(baseWeapon entities.WeaponType, fireRateBoostStacks int) time.Duration {
	stats := WeaponStatsMap[baseWeapon]
	fireRate := stats.FireRate
	
	// Apply fire rate boost: each stack reduces cooldown by 20%
	if fireRateBoostStacks > 0 {
		reduction := 1.0 - (float64(fireRateBoostStacks) * FireRateBoostPercent / 100.0)
		fireRate = time.Duration(float64(fireRate) * reduction)
	}
	
	return fireRate
}
