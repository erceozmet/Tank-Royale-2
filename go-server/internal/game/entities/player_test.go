package entities

import (
	"testing"
	"time"
)

func TestNewPlayer(t *testing.T) {
	id := "player123"
	username := "TestPlayer"
	position := Vector2D{X: 100, Y: 200}

	player := NewPlayer(id, username, position)

	if player.ID != id {
		t.Errorf("Expected ID %s, got %s", id, player.ID)
	}
	if player.Username != username {
		t.Errorf("Expected Username %s, got %s", username, player.Username)
	}
	if player.Position.X != position.X || player.Position.Y != position.Y {
		t.Errorf("Expected Position {%v, %v}, got {%v, %v}", position.X, position.Y, player.Position.X, player.Position.Y)
	}
	if player.Health != 100 {
		t.Errorf("Expected Health 100, got %d", player.Health)
	}
	if player.Shield != 0 {
		t.Errorf("Expected Shield 0, got %d", player.Shield)
	}
	if player.CurrentWeapon != WeaponPistol {
		t.Errorf("Expected CurrentWeapon %s, got %s", WeaponPistol, player.CurrentWeapon)
	}
	if !player.IsAlive {
		t.Error("Expected IsAlive to be true")
	}
	if player.DamageBoostStacks != 0 {
		t.Errorf("Expected DamageBoostStacks 0, got %d", player.DamageBoostStacks)
	}
	if player.FireRateBoostStacks != 0 {
		t.Errorf("Expected FireRateBoostStacks 0, got %d", player.FireRateBoostStacks)
	}
}

func TestPlayer_TakeDamage(t *testing.T) {
	tests := []struct {
		name           string
		initialHealth  int
		initialShield  int
		damage         int
		expectedHealth int
		expectedShield int
		expectedDead   bool
	}{
		{
			name:           "damage to health only",
			initialHealth:  100,
			initialShield:  0,
			damage:         30,
			expectedHealth: 70,
			expectedShield: 0,
			expectedDead:   false,
		},
		{
			name:           "damage absorbed by shield",
			initialHealth:  100,
			initialShield:  50,
			damage:         30,
			expectedHealth: 100,
			expectedShield: 20,
			expectedDead:   false,
		},
		{
			name:           "damage breaks shield and hits health",
			initialHealth:  100,
			initialShield:  20,
			damage:         50,
			expectedHealth: 70,
			expectedShield: 0,
			expectedDead:   false,
		},
		{
			name:           "fatal damage",
			initialHealth:  50,
			initialShield:  0,
			damage:         50,
			expectedHealth: 0,
			expectedShield: 0,
			expectedDead:   true,
		},
		{
			name:           "overkill damage",
			initialHealth:  30,
			initialShield:  0,
			damage:         100,
			expectedHealth: 0,
			expectedShield: 0,
			expectedDead:   true,
		},
		{
			name:           "shield completely blocks damage",
			initialHealth:  100,
			initialShield:  100,
			damage:         50,
			expectedHealth: 100,
			expectedShield: 50,
			expectedDead:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			player := NewPlayer("test", "tester", Vector2D{})
			player.Health = tt.initialHealth
			player.Shield = tt.initialShield

			died := player.TakeDamage(tt.damage)

			if player.Health != tt.expectedHealth {
				t.Errorf("Expected Health %d, got %d", tt.expectedHealth, player.Health)
			}
			if player.Shield != tt.expectedShield {
				t.Errorf("Expected Shield %d, got %d", tt.expectedShield, player.Shield)
			}
			if died != tt.expectedDead {
				t.Errorf("Expected died=%v, got %v", tt.expectedDead, died)
			}
			if player.IsAlive == tt.expectedDead {
				t.Errorf("Expected IsAlive=%v, got %v", !tt.expectedDead, player.IsAlive)
			}
		})
	}
}

func TestPlayer_TakeDamage_WhenDead(t *testing.T) {
	player := NewPlayer("test", "tester", Vector2D{})
	player.IsAlive = false
	player.Health = 0

	died := player.TakeDamage(50)

	if died {
		t.Error("Expected died=false when player is already dead")
	}
	if player.Health != 0 {
		t.Errorf("Expected Health to remain 0, got %d", player.Health)
	}
}

func TestPlayer_AddShield(t *testing.T) {
	player := NewPlayer("test", "tester", Vector2D{})

	// First shield
	success := player.AddShield()
	if !success {
		t.Error("Expected first shield to succeed")
	}
	if player.ShieldStacks != 1 {
		t.Errorf("Expected ShieldStacks 1, got %d", player.ShieldStacks)
	}
	if player.MaxShield != 50 {
		t.Errorf("Expected MaxShield 50, got %d", player.MaxShield)
	}
	if player.Shield != 50 {
		t.Errorf("Expected Shield 50, got %d", player.Shield)
	}

	// Second shield
	success = player.AddShield()
	if !success {
		t.Error("Expected second shield to succeed")
	}
	if player.ShieldStacks != 2 {
		t.Errorf("Expected ShieldStacks 2, got %d", player.ShieldStacks)
	}
	if player.MaxShield != 100 {
		t.Errorf("Expected MaxShield 100, got %d", player.MaxShield)
	}
	if player.Shield != 100 {
		t.Errorf("Expected Shield 100, got %d", player.Shield)
	}

	// Third shield
	success = player.AddShield()
	if !success {
		t.Error("Expected third shield to succeed")
	}
	if player.ShieldStacks != 3 {
		t.Errorf("Expected ShieldStacks 3, got %d", player.ShieldStacks)
	}
	if player.MaxShield != 150 {
		t.Errorf("Expected MaxShield 150, got %d", player.MaxShield)
	}
	if player.Shield != 150 {
		t.Errorf("Expected Shield 150, got %d", player.Shield)
	}

	// Fourth shield (should fail)
	success = player.AddShield()
	if success {
		t.Error("Expected fourth shield to fail (max 3 stacks)")
	}
	if player.ShieldStacks != 3 {
		t.Errorf("Expected ShieldStacks to remain 3, got %d", player.ShieldStacks)
	}
}

func TestPlayer_AddDamageBoost(t *testing.T) {
	player := NewPlayer("test", "tester", Vector2D{})

	// Add 3 damage boosts
	for i := 1; i <= 3; i++ {
		success := player.AddDamageBoost()
		if !success {
			t.Errorf("Expected damage boost %d to succeed", i)
		}
		if player.DamageBoostStacks != i {
			t.Errorf("Expected DamageBoostStacks %d, got %d", i, player.DamageBoostStacks)
		}
	}

	// Fourth boost should fail
	success := player.AddDamageBoost()
	if success {
		t.Error("Expected fourth damage boost to fail (max 3 stacks)")
	}
	if player.DamageBoostStacks != 3 {
		t.Errorf("Expected DamageBoostStacks to remain 3, got %d", player.DamageBoostStacks)
	}
}

func TestPlayer_AddFireRateBoost(t *testing.T) {
	player := NewPlayer("test", "tester", Vector2D{})

	// Add 3 fire rate boosts
	for i := 1; i <= 3; i++ {
		success := player.AddFireRateBoost()
		if !success {
			t.Errorf("Expected fire rate boost %d to succeed", i)
		}
		if player.FireRateBoostStacks != i {
			t.Errorf("Expected FireRateBoostStacks %d, got %d", i, player.FireRateBoostStacks)
		}
	}

	// Fourth boost should fail
	success := player.AddFireRateBoost()
	if success {
		t.Error("Expected fourth fire rate boost to fail (max 3 stacks)")
	}
	if player.FireRateBoostStacks != 3 {
		t.Errorf("Expected FireRateBoostStacks to remain 3, got %d", player.FireRateBoostStacks)
	}
}

func TestPlayer_SetWeapon(t *testing.T) {
	player := NewPlayer("test", "tester", Vector2D{})

	weapons := []WeaponType{WeaponPistol, WeaponRifle, WeaponShotgun, WeaponSniper}

	for _, weapon := range weapons {
		player.SetWeapon(weapon)
		if player.CurrentWeapon != weapon {
			t.Errorf("Expected CurrentWeapon %s, got %s", weapon, player.CurrentWeapon)
		}
	}
}

func TestPlayer_CanFire(t *testing.T) {
	player := NewPlayer("test", "tester", Vector2D{})
	player.CurrentWeapon = WeaponPistol
	fireRate := 500 * time.Millisecond

	// Should be able to fire immediately (LastFireTime is in the past)
	player.LastFireTime = time.Now().Add(-1 * time.Second)
	if !player.CanFire(fireRate) {
		t.Error("Expected CanFire to be true initially")
	}

	// Set LastFireTime to now
	player.LastFireTime = time.Now()

	// Should not be able to fire immediately
	if player.CanFire(fireRate) {
		t.Error("Expected CanFire to be false right after firing")
	}

	// Set LastFireTime to just after cooldown
	player.LastFireTime = time.Now().Add(-600 * time.Millisecond)

	// Should be able to fire again
	if !player.CanFire(fireRate) {
		t.Error("Expected CanFire to be true after cooldown")
	}
}
