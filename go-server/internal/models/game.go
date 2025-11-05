package models

import "time"

// Vector2D represents a 2D vector for position and velocity
type Vector2D struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// Tank represents a player's tank in the game
type Tank struct {
	ID           string    `json:"id"`
	PlayerID     string    `json:"player_id"`
	Position     Vector2D  `json:"position"`
	Velocity     Vector2D  `json:"velocity"`
	Rotation     float64   `json:"rotation"`
	TurretRotation float64 `json:"turret_rotation"`
	Health       int       `json:"health"`
	MaxHealth    int       `json:"max_health"`
	Speed        float64   `json:"speed"`
	Armor        int       `json:"armor"`
	Ammo         int       `json:"ammo"`
	MaxAmmo      int       `json:"max_ammo"`
	IsAlive      bool      `json:"is_alive"`
	Kills        int       `json:"kills"`
	Score        int       `json:"score"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Bullet represents a projectile in the game
type Bullet struct {
	ID         string    `json:"id"`
	OwnerID    string    `json:"owner_id"`
	Position   Vector2D  `json:"position"`
	Velocity   Vector2D  `json:"velocity"`
	Damage     int       `json:"damage"`
	Speed      float64   `json:"speed"`
	CreatedAt  time.Time `json:"created_at"`
}

// PowerUp represents a collectible item in the game
type PowerUp struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"` // "health", "ammo", "speed", "shield"
	Position  Vector2D  `json:"position"`
	Value     int       `json:"value"`
	Duration  int       `json:"duration"` // Duration in seconds, 0 for instant
	SpawnedAt time.Time `json:"spawned_at"`
	ExpiresAt time.Time `json:"expires_at"`
}

// GameRoom represents a game session
type GameRoom struct {
	ID            string              `json:"id"`
	Status        string              `json:"status"` // "waiting", "active", "finished"
	Players       map[string]*Tank    `json:"players"`
	Bullets       map[string]*Bullet  `json:"bullets"`
	PowerUps      map[string]*PowerUp `json:"power_ups"`
	MaxPlayers    int                 `json:"max_players"`
	StartedAt     time.Time           `json:"started_at"`
	FinishedAt    time.Time           `json:"finished_at"`
	TickRate      int                 `json:"tick_rate"`
	CurrentTick   int64               `json:"current_tick"`
}

// GameState represents the current state of a game
type GameState struct {
	RoomID      string              `json:"room_id"`
	Tick        int64               `json:"tick"`
	Tanks       map[string]*Tank    `json:"tanks"`
	Bullets     map[string]*Bullet  `json:"bullets"`
	PowerUps    map[string]*PowerUp `json:"power_ups"`
	Timestamp   time.Time           `json:"timestamp"`
}

// PlayerInput represents input from a player
type PlayerInput struct {
	PlayerID       string  `json:"player_id"`
	MoveDirection  Vector2D `json:"move_direction"`
	TurretRotation float64 `json:"turret_rotation"`
	Shoot          bool    `json:"shoot"`
	Timestamp      time.Time `json:"timestamp"`
}

// GameResult represents the final result of a game
type GameResult struct {
	RoomID       string    `json:"room_id"`
	WinnerID     string    `json:"winner_id"`
	PlayerScores map[string]int `json:"player_scores"`
	Duration     int       `json:"duration"` // Duration in seconds
	FinishedAt   time.Time `json:"finished_at"`
}
