package loot

import (
	"math/rand"

	"github.com/erceozmet/tank-royale-2/go-server/internal/game/entities"
)

// LootTable defines the weighted probabilities for loot drops
var LootTable = []LootTableEntry{
	{Type: entities.LootWeaponRifle, Weight: 20},
	{Type: entities.LootWeaponShotgun, Weight: 15},
	{Type: entities.LootWeaponSniper, Weight: 10},
	{Type: entities.LootShield, Weight: 25},
	{Type: entities.LootDamageBoost, Weight: 15},
	{Type: entities.LootFireRateBoost, Weight: 15},
}

type LootTableEntry struct {
	Type   entities.LootType
	Weight int
}

// GenerateRandomLoot returns a random loot type based on weighted probabilities
func GenerateRandomLoot() entities.LootType {
	totalWeight := 0
	for _, entry := range LootTable {
		totalWeight += entry.Weight
	}

	roll := rand.Intn(totalWeight)
	currentWeight := 0

	for _, entry := range LootTable {
		currentWeight += entry.Weight
		if roll < currentWeight {
			return entry.Type
		}
	}

	// Fallback (should never reach here)
	return entities.LootShield
}

// ApplyLootToPlayer applies the loot effect to a player and returns success status and message
func ApplyLootToPlayer(player *entities.Player, loot *entities.Loot) (bool, string) {
	switch loot.Type {
	case entities.LootWeaponRifle:
		player.SetWeapon(entities.WeaponRifle)
		return true, "Picked up Rifle"

	case entities.LootWeaponShotgun:
		player.SetWeapon(entities.WeaponShotgun)
		return true, "Picked up Shotgun"

	case entities.LootWeaponSniper:
		player.SetWeapon(entities.WeaponSniper)
		return true, "Picked up Sniper"

	case entities.LootShield:
		if player.AddShield() {
			return true, "Shield +50 (Stack " + string(rune(player.ShieldStacks+'0')) + "/3)"
		}
		return false, "Shield already maxed (3/3)"

	case entities.LootDamageBoost:
		if player.AddDamageBoost() {
			return true, "Damage Boost +15% (Stack " + string(rune(player.DamageBoostStacks+'0')) + "/3)"
		}
		return false, "Damage Boost already maxed (3/3)"

	case entities.LootFireRateBoost:
		if player.AddFireRateBoost() {
			return true, "Fire Rate Boost +20% (Stack " + string(rune(player.FireRateBoostStacks+'0')) + "/3)"
		}
		return false, "Fire Rate Boost already maxed (3/3)"
	}

	return false, "Unknown loot type"
}

// CanCollectLoot checks if a player is within collection range of loot
func CanCollectLoot(playerPos, lootPos entities.Vector2D, collectionRadius float64) bool {
	return playerPos.Distance(lootPos) <= collectionRadius
}
