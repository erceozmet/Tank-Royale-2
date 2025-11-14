package entities

// LootType represents the type of loot
type LootType string

const (
	LootWeaponRifle   LootType = "weapon_rifle"
	LootWeaponShotgun LootType = "weapon_shotgun"
	LootWeaponSniper  LootType = "weapon_sniper"
	LootShield        LootType = "shield"
	LootDamageBoost   LootType = "damage_boost"
	LootFireRateBoost LootType = "fire_rate_boost"
)

// Loot represents a collectible item (inside crates)
type Loot struct {
	ID       string   `json:"id"`
	Type     LootType `json:"type"`
	Position Vector2D `json:"position"`
	Value    int      `json:"value"` // Generic value field (e.g., shield amount)
}

// NewLoot creates a new loot item
func NewLoot(id string, lootType LootType, position Vector2D) *Loot {
	value := 0

	switch lootType {
	case LootShield:
		value = 50 // Shield amount
	case LootDamageBoost:
		value = 1 // Stack count
	case LootFireRateBoost:
		value = 1 // Stack count
	}

	return &Loot{
		ID:       id,
		Type:     lootType,
		Position: position,
		Value:    value,
	}
}

// Crate represents a container with random loot
type Crate struct {
	ID       string   `json:"id"`
	Position Vector2D `json:"position"`
	IsOpened bool     `json:"isOpened"`
	LootID   string   `json:"lootId"` // ID of the loot inside (generated on spawn)
}

// NewCrate creates a new crate
func NewCrate(id string, position Vector2D, lootID string) *Crate {
	return &Crate{
		ID:       id,
		Position: position,
		IsOpened: false,
		LootID:   lootID,
	}
}
