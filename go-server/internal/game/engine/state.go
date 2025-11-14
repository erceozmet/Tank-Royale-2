package engine

import (
	"github.com/erceozmet/tank-royale-2/go-server/internal/game/entities"
	"github.com/erceozmet/tank-royale-2/go-server/internal/game/safezone"
)

// GamePhase represents the current phase of the game
type GamePhase string

const (
	PhaseWaiting  GamePhase = "waiting"  // Waiting for players
	PhaseStarting GamePhase = "starting" // Countdown before game starts
	PhasePlaying  GamePhase = "playing"  // Active gameplay
	PhaseEnding   GamePhase = "ending"   // Game over, showing results
	PhaseFinished GamePhase = "finished" // Match complete
)

// GameState represents the complete state of a game match
type GameState struct {
	MatchID     string                          `json:"matchId"`
	Tick        int64                           `json:"tick"`
	Phase       GamePhase                       `json:"phase"`
	Players     map[string]*entities.Player     `json:"players"`     // userID -> Player
	Projectiles map[string]*entities.Projectile `json:"projectiles"` // projectileID -> Projectile
	Obstacles   []*entities.Obstacle            `json:"obstacles"`
	Crates      map[string]*entities.Crate      `json:"crates"` // crateID -> Crate
	Loot        map[string]*entities.Loot       `json:"loot"`   // lootID -> Loot
	SafeZone    *safezone.SafeZone              `json:"safeZone"`

	// Player rankings (updated as players die)
	Rankings []PlayerRanking `json:"rankings"`
}

// PlayerRanking tracks player performance
type PlayerRanking struct {
	UserID      string `json:"userId"`
	Username    string `json:"username"`
	Placement   int    `json:"placement"` // 1 = winner, 2 = 2nd place, etc.
	Kills       int    `json:"kills"`
	DamageDealt int    `json:"damageDealt"`
	IsAlive     bool   `json:"isAlive"`
}

// NewGameState creates a new game state
func NewGameState(matchID string) *GameState {
	return &GameState{
		MatchID:     matchID,
		Tick:        0,
		Phase:       PhaseWaiting,
		Players:     make(map[string]*entities.Player),
		Projectiles: make(map[string]*entities.Projectile),
		Obstacles:   make([]*entities.Obstacle, 0),
		Crates:      make(map[string]*entities.Crate),
		Loot:        make(map[string]*entities.Loot),
		SafeZone:    safezone.NewSafeZone(),
		Rankings:    make([]PlayerRanking, 0),
	}
}

// AddPlayer adds a player to the game
func (gs *GameState) AddPlayer(player *entities.Player) {
	gs.Players[player.ID] = player
	gs.Rankings = append(gs.Rankings, PlayerRanking{
		UserID:      player.ID,
		Username:    player.Username,
		Placement:   0,
		Kills:       0,
		DamageDealt: 0,
		IsAlive:     true,
	})
}

// RemovePlayer removes a player from the game
func (gs *GameState) RemovePlayer(userID string) {
	delete(gs.Players, userID)

	// Update rankings
	for i := range gs.Rankings {
		if gs.Rankings[i].UserID == userID {
			gs.Rankings[i].IsAlive = false
			break
		}
	}
}

// GetAlivePlayers returns all alive players
func (gs *GameState) GetAlivePlayers() []*entities.Player {
	alive := make([]*entities.Player, 0)
	for _, player := range gs.Players {
		if player.IsAlive {
			alive = append(alive, player)
		}
	}
	return alive
}

// GetAlivePlayerCount returns the count of alive players
func (gs *GameState) GetAlivePlayerCount() int {
	count := 0
	for _, player := range gs.Players {
		if player.IsAlive {
			count++
		}
	}
	return count
}

// UpdatePlayerRanking updates a player's ranking stats
func (gs *GameState) UpdatePlayerRanking(userID string, kills, damageDealt int, isAlive bool) {
	for i := range gs.Rankings {
		if gs.Rankings[i].UserID == userID {
			gs.Rankings[i].Kills = kills
			gs.Rankings[i].DamageDealt = damageDealt
			gs.Rankings[i].IsAlive = isAlive

			// If player died, assign placement based on remaining alive players
			if !isAlive && gs.Rankings[i].Placement == 0 {
				gs.Rankings[i].Placement = gs.GetAlivePlayerCount() + 1
			}
			break
		}
	}
}

// GetWinner returns the winner if there is one
func (gs *GameState) GetWinner() *entities.Player {
	aliveCount := gs.GetAlivePlayerCount()
	if aliveCount != 1 {
		return nil
	}

	for _, player := range gs.Players {
		if player.IsAlive {
			return player
		}
	}
	return nil
}

// GetFinalRankings returns the sorted final rankings
func (gs *GameState) GetFinalRankings() []PlayerRanking {
	// Ensure winner has placement 1
	winner := gs.GetWinner()
	if winner != nil {
		for i := range gs.Rankings {
			if gs.Rankings[i].UserID == winner.ID {
				gs.Rankings[i].Placement = 1
				break
			}
		}
	}

	return gs.Rankings
}
