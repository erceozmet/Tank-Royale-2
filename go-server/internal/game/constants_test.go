package game

import (
	"testing"
	"time"

	"github.com/erceozmet/tank-royale-2/go-server/internal/game/entities"
)

func TestCalculateWeaponDamage_NoBooosts(t *testing.T) {
	tests := []struct {
		weapon         entities.WeaponType
		expectedDamage int
	}{
		{entities.WeaponPistol, 15},
		{entities.WeaponRifle, 20},
		{entities.WeaponShotgun, 35},
		{entities.WeaponSniper, 50},
	}

	for _, tt := range tests {
		t.Run(string(tt.weapon), func(t *testing.T) {
			damage := CalculateWeaponDamage(tt.weapon, 0)
			if damage != tt.expectedDamage {
				t.Errorf("Expected damage %d, got %d", tt.expectedDamage, damage)
			}
		})
	}
}

func TestCalculateWeaponDamage_WithBoosts(t *testing.T) {
	tests := []struct {
		name           string
		weapon         entities.WeaponType
		boostStacks    int
		expectedDamage int
	}{
		{
			name:           "pistol 1 boost",
			weapon:         entities.WeaponPistol,
			boostStacks:    1,
			expectedDamage: 17, // 15 * 1.15 = 17.25 -> 17
		},
		{
			name:           "pistol 2 boosts",
			weapon:         entities.WeaponPistol,
			boostStacks:    2,
			expectedDamage: 19, // 15 * 1.30 = 19.5 -> 19
		},
		{
			name:           "pistol 3 boosts",
			weapon:         entities.WeaponPistol,
			boostStacks:    3,
			expectedDamage: 21, // 15 * 1.45 = 21.75 -> 21
		},
		{
			name:           "rifle 3 boosts",
			weapon:         entities.WeaponRifle,
			boostStacks:    3,
			expectedDamage: 29, // 20 * 1.45 = 29
		},
		{
			name:           "shotgun 3 boosts",
			weapon:         entities.WeaponShotgun,
			boostStacks:    3,
			expectedDamage: 50, // 35 * 1.45 = 50.75 -> 50
		},
		{
			name:           "sniper 3 boosts",
			weapon:         entities.WeaponSniper,
			boostStacks:    3,
			expectedDamage: 72, // 50 * 1.45 = 72.5 -> 72
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			damage := CalculateWeaponDamage(tt.weapon, tt.boostStacks)
			if damage != tt.expectedDamage {
				t.Errorf("Expected damage %d, got %d", tt.expectedDamage, damage)
			}
		})
	}
}

func TestCalculateFireRate_NoBoosts(t *testing.T) {
	tests := []struct {
		weapon           entities.WeaponType
		expectedFireRate time.Duration
	}{
		{entities.WeaponPistol, 500 * time.Millisecond},
		{entities.WeaponRifle, 400 * time.Millisecond},
		{entities.WeaponShotgun, 800 * time.Millisecond},
		{entities.WeaponSniper, 1200 * time.Millisecond},
	}

	for _, tt := range tests {
		t.Run(string(tt.weapon), func(t *testing.T) {
			fireRate := CalculateFireRate(tt.weapon, 0)
			if fireRate != tt.expectedFireRate {
				t.Errorf("Expected fire rate %v, got %v", tt.expectedFireRate, fireRate)
			}
		})
	}
}

func TestCalculateFireRate_WithBoosts(t *testing.T) {
	tests := []struct {
		name             string
		weapon           entities.WeaponType
		boostStacks      int
		expectedFireRate time.Duration
	}{
		{
			name:             "pistol 1 boost",
			weapon:           entities.WeaponPistol,
			boostStacks:      1,
			expectedFireRate: 400 * time.Millisecond, // 500 * 0.8
		},
		{
			name:             "pistol 2 boosts",
			weapon:           entities.WeaponPistol,
			boostStacks:      2,
			expectedFireRate: 300 * time.Millisecond, // 500 * 0.6
		},
		{
			name:             "pistol 3 boosts",
			weapon:           entities.WeaponPistol,
			boostStacks:      3,
			expectedFireRate: 200 * time.Millisecond, // 500 * 0.4
		},
		{
			name:             "rifle 3 boosts",
			weapon:           entities.WeaponRifle,
			boostStacks:      3,
			expectedFireRate: 160 * time.Millisecond, // 400 * 0.4
		},
		{
			name:             "shotgun 3 boosts",
			weapon:           entities.WeaponShotgun,
			boostStacks:      3,
			expectedFireRate: 320 * time.Millisecond, // 800 * 0.4
		},
		{
			name:             "sniper 3 boosts",
			weapon:           entities.WeaponSniper,
			boostStacks:      3,
			expectedFireRate: 480 * time.Millisecond, // 1200 * 0.4
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fireRate := CalculateFireRate(tt.weapon, tt.boostStacks)
			if fireRate != tt.expectedFireRate {
				t.Errorf("Expected fire rate %v, got %v", tt.expectedFireRate, fireRate)
			}
		})
	}
}

func TestWeaponStatsMap(t *testing.T) {
	// Verify all weapon types have stats defined
	weapons := []entities.WeaponType{
		entities.WeaponPistol,
		entities.WeaponRifle,
		entities.WeaponShotgun,
		entities.WeaponSniper,
	}

	for _, weapon := range weapons {
		t.Run(string(weapon), func(t *testing.T) {
			stats, exists := WeaponStatsMap[weapon]
			if !exists {
				t.Errorf("Weapon %s not found in WeaponStatsMap", weapon)
			}
			if stats.BaseDamage <= 0 {
				t.Errorf("Weapon %s has invalid BaseDamage: %d", weapon, stats.BaseDamage)
			}
			if stats.FireRate <= 0 {
				t.Errorf("Weapon %s has invalid FireRate: %v", weapon, stats.FireRate)
			}
			if stats.Range <= 0 {
				t.Errorf("Weapon %s has invalid Range: %f", weapon, stats.Range)
			}
			if stats.Speed <= 0 {
				t.Errorf("Weapon %s has invalid Speed: %f", weapon, stats.Speed)
			}
		})
	}
}

func TestConstants_Consistency(t *testing.T) {
	// Test that constants make sense
	if ServerTickRate <= 0 {
		t.Error("ServerTickRate must be positive")
	}
	if TickInterval <= 0 {
		t.Error("TickInterval must be positive")
	}
	if MinPlayers > MaxPlayers {
		t.Error("MinPlayers cannot be greater than MaxPlayers")
	}
	if MapWidth <= 0 || MapHeight <= 0 {
		t.Error("Map dimensions must be positive")
	}
	if ShieldPerStack <= 0 {
		t.Error("ShieldPerStack must be positive")
	}
	if MaxShield != ShieldPerStack*MaxShieldStacks {
		t.Error("MaxShield should equal ShieldPerStack * MaxShieldStacks")
	}
	if DamageBoostPercent <= 0 {
		t.Error("DamageBoostPercent must be positive")
	}
	if FireRateBoostPercent <= 0 {
		t.Error("FireRateBoostPercent must be positive")
	}
}
