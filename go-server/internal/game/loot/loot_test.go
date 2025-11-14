package loot
package loot

import (
	"testing"

	"github.com/erceozmet/tank-royale-2/go-server/internal/game/entities"
)

func TestGenerateRandomLoot(t *testing.T) {
	// Test that it returns a valid loot type
	lootCounts := make(map[entities.LootType]int)
	iterations := 1000

	for i := 0; i < iterations; i++ {
		loot := GenerateRandomLoot()
		lootCounts[loot]++
	}

	// Verify all expected types appear
	expectedTypes := []entities.LootType{
		entities.LootWeaponRifle,
		entities.LootWeaponShotgun,
		entities.LootWeaponSniper,
		entities.LootShield,
		entities.LootDamageBoost,
		entities.LootFireRateBoost,
	}

	for _, lootType := range expectedTypes {
		if lootCounts[lootType] == 0 {
			t.Errorf("Loot type %s never generated in %d iterations", lootType, iterations)
		}
	}

	// Shield should be most common (25% weight)
	if lootCounts[entities.LootShield] < 100 {
		t.Errorf("Shield drop rate seems too low: %d out of %d", lootCounts[entities.LootShield], iterations)
	}
}

func TestApplyLootToPlayer_Weapons(t *testing.T) {
	tests := []struct {
		name           string
		lootType       entities.LootType
		expectedWeapon entities.WeaponType
		expectSuccess  bool
		expectedMsg    string
	}{
		{
			name:           "pick up rifle",
			lootType:       entities.LootWeaponRifle,
			expectedWeapon: entities.WeaponRifle,
			expectSuccess:  true,
			expectedMsg:    "Picked up Rifle",
		},
		{
			name:           "pick up shotgun",
			lootType:       entities.LootWeaponShotgun,
			expectedWeapon: entities.WeaponShotgun,
			expectSuccess:  true,
			expectedMsg:    "Picked up Shotgun",
		},
		{
			name:           "pick up sniper",
			lootType:       entities.LootWeaponSniper,
			expectedWeapon: entities.WeaponSniper,
			expectSuccess:  true,
			expectedMsg:    "Picked up Sniper",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			player := entities.NewPlayer("test", "tester", entities.Vector2D{})
			loot := &entities.Loot{Type: tt.lootType}

			success, msg := ApplyLootToPlayer(player, loot)

			if success != tt.expectSuccess {
				t.Errorf("Expected success=%v, got %v", tt.expectSuccess, success)
			}
			if msg != tt.expectedMsg {
				t.Errorf("Expected message '%s', got '%s'", tt.expectedMsg, msg)
			}
			if player.CurrentWeapon != tt.expectedWeapon {
				t.Errorf("Expected weapon %s, got %s", tt.expectedWeapon, player.CurrentWeapon)
			}
		})
	}
}

func TestApplyLootToPlayer_Shield(t *testing.T) {
	player := entities.NewPlayer("test", "tester", entities.Vector2D{})
	loot := &entities.Loot{Type: entities.LootShield}

	// First shield
	success, msg := ApplyLootToPlayer(player, loot)
	if !success {
		t.Error("Expected first shield to succeed")
	}
	if player.ShieldStacks != 1 {
		t.Errorf("Expected 1 shield stack, got %d", player.ShieldStacks)
	}
	if msg != "Shield +50 (Stack 1/3)" {
		t.Errorf("Unexpected message: %s", msg)
	}

	// Second shield
	success, _ = ApplyLootToPlayer(player, loot)
	if !success {
		t.Error("Expected second shield to succeed")
	}
	if player.ShieldStacks != 2 {
		t.Errorf("Expected 2 shield stacks, got %d", player.ShieldStacks)
	}

	// Third shield
	success, _ = ApplyLootToPlayer(player, loot)
	if !success {
		t.Error("Expected third shield to succeed")
	}
	if player.ShieldStacks != 3 {
		t.Errorf("Expected 3 shield stacks, got %d", player.ShieldStacks)
	}

	// Fourth shield (should fail)
	success, msg = ApplyLootToPlayer(player, loot)
	if success {
		t.Error("Expected fourth shield to fail (max 3)")
	}
	if msg != "Shield already maxed (3/3)" {
		t.Errorf("Expected max shield message, got: %s", msg)
	}
	if player.ShieldStacks != 3 {
		t.Errorf("Expected shield stacks to remain 3, got %d", player.ShieldStacks)
	}
}

func TestApplyLootToPlayer_DamageBoost(t *testing.T) {
	player := entities.NewPlayer("test", "tester", entities.Vector2D{})
	loot := &entities.Loot{Type: entities.LootDamageBoost}

	// Add 3 damage boosts
	for i := 1; i <= 3; i++ {
		success, msg := ApplyLootToPlayer(player, loot)
		if !success {
			t.Errorf("Expected damage boost %d to succeed", i)
		}
		if player.DamageBoostStacks != i {
			t.Errorf("Expected %d damage boost stacks, got %d", i, player.DamageBoostStacks)
		}
		if msg == "" {
			t.Error("Expected a success message")
		}
	}

	// Fourth boost (should fail)
	success, msg := ApplyLootToPlayer(player, loot)
	if success {
		t.Error("Expected fourth damage boost to fail (max 3)")
	}
	if msg != "Damage Boost already maxed (3/3)" {
		t.Errorf("Expected max damage message, got: %s", msg)
	}
}

func TestApplyLootToPlayer_FireRateBoost(t *testing.T) {
	player := entities.NewPlayer("test", "tester", entities.Vector2D{})
	loot := &entities.Loot{Type: entities.LootFireRateBoost}

	// Add 3 fire rate boosts
	for i := 1; i <= 3; i++ {
		success, msg := ApplyLootToPlayer(player, loot)
		if !success {
			t.Errorf("Expected fire rate boost %d to succeed", i)
		}
		if player.FireRateBoostStacks != i {
			t.Errorf("Expected %d fire rate boost stacks, got %d", i, player.FireRateBoostStacks)
		}
		if msg == "" {
			t.Error("Expected a success message")
		}
	}

	// Fourth boost (should fail)
	success, msg := ApplyLootToPlayer(player, loot)
	if success {
		t.Error("Expected fourth fire rate boost to fail (max 3)")
	}
	if msg != "Fire Rate Boost already maxed (3/3)" {
		t.Errorf("Expected max fire rate message, got: %s", msg)
	}
}

func TestCanCollectLoot(t *testing.T) {
	tests := []struct {
		name             string
		playerPos        entities.Vector2D
		lootPos          entities.Vector2D
		collectionRadius float64
		expected         bool
	}{
		{
			name:             "within range",
			playerPos:        entities.Vector2D{X: 0, Y: 0},
			lootPos:          entities.Vector2D{X: 30, Y: 0},
			collectionRadius: 50,
			expected:         true,
		},
		{
			name:             "exactly at range",
			playerPos:        entities.Vector2D{X: 0, Y: 0},
			lootPos:          entities.Vector2D{X: 50, Y: 0},
			collectionRadius: 50,
			expected:         true,
		},
		{
			name:             "out of range",
			playerPos:        entities.Vector2D{X: 0, Y: 0},
			lootPos:          entities.Vector2D{X: 60, Y: 0},
			collectionRadius: 50,
			expected:         false,
		},
		{
			name:             "same position",
			playerPos:        entities.Vector2D{X: 100, Y: 100},
			lootPos:          entities.Vector2D{X: 100, Y: 100},
			collectionRadius: 50,
			expected:         true,
		},
		{
			name:             "diagonal distance within range",
			playerPos:        entities.Vector2D{X: 0, Y: 0},
			lootPos:          entities.Vector2D{X: 30, Y: 40}, // distance = 50
			collectionRadius: 50,
			expected:         true,
		},
		{
			name:             "diagonal distance out of range",
			playerPos:        entities.Vector2D{X: 0, Y: 0},
			lootPos:          entities.Vector2D{X: 40, Y: 40}, // distance ≈ 56.57
			collectionRadius: 50,
			expected:         false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := CanCollectLoot(tt.playerPos, tt.lootPos, tt.collectionRadius)
			if result != tt.expected {
				t.Errorf("Expected %v, got %v (distance: %f)", tt.expected, result, tt.playerPos.Distance(tt.lootPos))
			}
		})
	}
}
