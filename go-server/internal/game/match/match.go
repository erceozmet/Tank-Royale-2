package match

import (
	"context"
	"fmt"
	"math"
	"math/rand"
	"strings"
	"sync"
	"time"

	"github.com/erceozmet/tank-royale-2/go-server/internal/db/postgres"
	"github.com/erceozmet/tank-royale-2/go-server/internal/game"
	"github.com/erceozmet/tank-royale-2/go-server/internal/game/engine"
	"github.com/erceozmet/tank-royale-2/go-server/internal/game/entities"
	"github.com/erceozmet/tank-royale-2/go-server/internal/game/loot"
	"github.com/erceozmet/tank-royale-2/go-server/internal/game/mapgen"
	"github.com/erceozmet/tank-royale-2/go-server/internal/repositories"
)

// MatchEvent represents a custom match event
type MatchEvent struct {
	Type string                 `json:"type"`
	Data map[string]interface{} `json:"data"`
}

// Match represents a game match
type Match struct {
	ID           string
	Players      map[string]*MatchPlayer // userID -> MatchPlayer
	GameLoop     *engine.GameLoop
	MapGenerator *mapgen.MapGenerator
	CrateManager *loot.CrateManager

	StartTime time.Time
	EndTime   *time.Time
	Phase     engine.GamePhase

	// Database connections
	pgDB *postgres.DB

	// Custom event channel for match events (like match_ended)
	eventChan chan MatchEvent

	mu     sync.RWMutex
	ctx    context.Context
	cancel context.CancelFunc
}

// MatchPlayer represents a player in a match
type MatchPlayer struct {
	UserID       string
	Username     string
	Entity       *entities.Player
	Connected    bool
	DisconnectAt *time.Time
}

// NewMatch creates a new match
func NewMatch(matchID string, pgDB *postgres.DB) *Match {
	ctx, cancel := context.WithCancel(context.Background())

	return &Match{
		ID:           matchID,
		Players:      make(map[string]*MatchPlayer),
		GameLoop:     engine.NewGameLoop(matchID),
		MapGenerator: mapgen.NewMapGenerator(game.MapWidth, game.MapHeight),
		CrateManager: loot.NewCrateManager(),
		Phase:        engine.PhaseWaiting,
		pgDB:         pgDB,
		eventChan:    make(chan MatchEvent, 10),
		ctx:          ctx,
		cancel:       cancel,
	}
}

// AddPlayer adds a player to the match
func (m *Match) AddPlayer(userID, username string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.Players[userID]; exists {
		return fmt.Errorf("player already in match")
	}

	if len(m.Players) >= game.MaxPlayers {
		return fmt.Errorf("match is full")
	}

	matchPlayer := &MatchPlayer{
		UserID:    userID,
		Username:  username,
		Connected: true,
	}

	m.Players[userID] = matchPlayer

	return nil
}

// RemovePlayer removes a player from the match
func (m *Match) RemovePlayer(userID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if player, exists := m.Players[userID]; exists {
		player.Connected = false
		now := time.Now()
		player.DisconnectAt = &now

		// Remove from game loop
		m.GameLoop.RemovePlayer(userID)
	}
}

// Start starts the match
func (m *Match) Start() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.Phase != engine.PhaseWaiting {
		return fmt.Errorf("match already started")
	}

	if len(m.Players) < game.MinPlayers {
		return fmt.Errorf("not enough players")
	}

	// Generate map
	numCrates := 20 + rand.Intn(10) // 20-30 crates
	if err := m.MapGenerator.GenerateMap(game.ObstacleDensity, numCrates); err != nil {
		return fmt.Errorf("failed to generate map: %w", err)
	}

	// Spawn crates
	for _, cratePos := range m.MapGenerator.GetCratePositions() {
		m.CrateManager.SpawnCrate(cratePos)
	}

	// Spawn players
	if err := m.spawnPlayers(); err != nil {
		return fmt.Errorf("failed to spawn players: %w", err)
	}

	// Start game loop
	m.Phase = engine.PhasePlaying
	m.StartTime = time.Now()

	if err := m.GameLoop.Start(); err != nil {
		return fmt.Errorf("failed to start game loop: %w", err)
	}

	// Start match monitoring goroutine
	go m.monitorMatch()

	return nil
}

// spawnPlayers spawns all players on the map
func (m *Match) spawnPlayers() error {
	// Spawn players in a circle around the map center
	centerX := game.MapWidth / 2
	centerY := game.MapHeight / 2
	spawnRadius := game.MapWidth / 4 // Spawn at 25% of map width from center

	playerCount := len(m.Players)
	angleStep := (2 * math.Pi) / float64(playerCount)

	i := 0
	for userID, matchPlayer := range m.Players {
		angle := float64(i) * angleStep

		spawnX := centerX + math.Cos(angle)*spawnRadius
		spawnY := centerY + math.Sin(angle)*spawnRadius

		position := entities.Vector2D{X: spawnX, Y: spawnY}

		// Create player entity
		player := entities.NewPlayer(userID, matchPlayer.Username, position)
		player.Rotation = angle + math.Pi // Face towards center

		matchPlayer.Entity = player
		m.GameLoop.AddPlayer(player)

		i++
	}

	return nil
}

// monitorMatch monitors the match and handles end conditions
func (m *Match) monitorMatch() {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-m.ctx.Done():
			return
		case <-ticker.C:
			m.checkEndConditions()
		}
	}
}

// checkEndConditions checks if the match should end
func (m *Match) checkEndConditions() {
	m.mu.RLock()
	state := m.GameLoop.GetState()
	totalPlayers := len(m.Players)
	m.mu.RUnlock()

	// Check if only one player is left (battle royale win condition)
	aliveCount := state.GetAlivePlayerCount()

	// Only end if: all players are dead OR (more than 1 total player AND only 1 left alive)
	// This allows solo testing without immediate game over
	shouldEnd := aliveCount == 0 || (totalPlayers > 1 && aliveCount <= 1)

	if shouldEnd && m.Phase == engine.PhasePlaying {
		m.endMatch()
	}

	// Check for timeout (e.g., 15 minutes max)
	if time.Since(m.StartTime) > 15*time.Minute && m.Phase == engine.PhasePlaying {
		m.endMatch()
	}
}

// endMatch ends the match and saves results
func (m *Match) endMatch() {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.Phase == engine.PhaseEnding || m.Phase == engine.PhaseFinished {
		return // Already ending
	}

	m.Phase = engine.PhaseEnding
	now := time.Now()
	m.EndTime = &now

	// Stop game loop
	m.GameLoop.Stop()

	// Save results to database and broadcast match ended
	go m.saveResults()

	// After a short delay, mark as finished
	time.AfterFunc(5*time.Second, func() {
		m.mu.Lock()
		m.Phase = engine.PhaseFinished
		m.mu.Unlock()
		m.cancel()

		// Close event channel
		close(m.eventChan)
	})
}

// saveResults saves match results to PostgreSQL and broadcasts match_ended
func (m *Match) saveResults() {
	ctx := context.Background()
	state := m.GameLoop.GetState()

	// Calculate duration
	duration := 0
	if m.EndTime != nil {
		duration = int(m.EndTime.Sub(m.StartTime).Seconds())
	}

	// Get rankings - this is needed for broadcasting regardless of database
	rankings := state.GetFinalRankings()

	// Prepare results for broadcasting (even if we can't save to DB)
	playerResults := make([]map[string]interface{}, 0, len(rankings))

	for _, ranking := range rankings {
		// Calculate MMR change based on placement
		mmrChange := calculateMMRChange(ranking.Placement, len(rankings))

		// Add to results for broadcasting
		playerResults = append(playerResults, map[string]interface{}{
			"user_id":       ranking.UserID,
			"username":      ranking.Username,
			"placement":     ranking.Placement,
			"kills":         ranking.Kills,
			"damage_dealt":  ranking.DamageDealt,
			"survival_time": duration,
			"mmr_change":    mmrChange,
		})
	}

	// Determine winner - find player with placement == 1
	winnerId := ""
	for _, ranking := range rankings {
		if ranking.Placement == 1 {
			winnerId = ranking.UserID
			break
		}
	}

	// ALWAYS broadcast match ended event to all players
	// This must happen even if database operations fail
	m.eventChan <- MatchEvent{
		Type: "match_ended",
		Data: map[string]interface{}{
			"match_id":  m.ID,
			"duration":  duration,
			"rankings":  playerResults,
			"winner_id": winnerId,
		},
	}

	fmt.Printf("Match %s ended event broadcasted with %d player results\n", m.ID, len(playerResults))

	// Now try to save to database (best effort, don't block match ending)
	if m.pgDB == nil {
		fmt.Printf("Database not initialized, skipping result persistence for match %s\n", m.ID)
		return
	}

	if len(rankings) == 0 {
		fmt.Printf("No rankings to save for match %s\n", m.ID)
		return
	}

	// Create match record
	matchRepo := repositories.NewMatchRepository(m.pgDB)

	matchID, err := matchRepo.Create(ctx, repositories.CreateMatchParams{
		MapName:     "procedural",
		PlayerCount: len(m.Players),
		StartTime:   m.StartTime,
		EndTime:     m.EndTime,
		Duration:    duration,
	})

	if err != nil {
		fmt.Printf("Error saving match to database: %v\n", err)
		return
	}

	// Save player results (skip guest users)
	for _, ranking := range rankings {
		// Skip guest users - they don't have database records
		if strings.HasPrefix(ranking.UserID, "guest_") {
			fmt.Printf("Skipping database save for guest user: %s\n", ranking.UserID)
			continue
		}

		// Calculate MMR change
		mmrChange := calculateMMRChange(ranking.Placement, len(rankings))

		// Save match result
		err := matchRepo.InsertResult(ctx, repositories.MatchResult{
			MatchID:      matchID,
			UserID:       ranking.UserID,
			Placement:    ranking.Placement,
			Kills:        ranking.Kills,
			DamageDealt:  ranking.DamageDealt,
			SurvivalTime: duration,
			MMRChange:    mmrChange,
		})

		if err != nil {
			fmt.Printf("Error saving player result for %s: %v\n", ranking.UserID, err)
			continue
		}

		// Update player MMR and stats
		if err := matchRepo.UpdateMMR(ctx, ranking.UserID, mmrChange); err != nil {
			fmt.Printf("Error updating MMR for %s: %v\n", ranking.UserID, err)
		}

		// Update win/loss/kill/death stats
		deaths := 0
		if ranking.Placement > 1 {
			deaths = 1 // Player died if not winner
		}
		if err := matchRepo.UpdateStats(ctx, ranking.UserID, ranking.Placement, ranking.Kills, deaths); err != nil {
			fmt.Printf("Error updating stats for %s: %v\n", ranking.UserID, err)
		}
	}

	fmt.Printf("Match %s results saved to database\n", m.ID)
}

// calculateMMRChange calculates MMR change based on placement
func calculateMMRChange(placement, totalPlayers int) int {
	// Winner gets most MMR
	if placement == 1 {
		return 25 + (totalPlayers - 2) // More players = more MMR
	}

	// Top 25% gets positive MMR
	topQuarter := int(math.Ceil(float64(totalPlayers) * 0.25))
	if placement <= topQuarter {
		return 15
	}

	// Top 50% gets small positive MMR
	topHalf := int(math.Ceil(float64(totalPlayers) * 0.5))
	if placement <= topHalf {
		return 5
	}

	// Bottom 50% loses MMR
	return -10
}

// GetPlayerCount returns the number of players in the match
func (m *Match) GetPlayerCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.Players)
}

// GetPhase returns the current match phase
func (m *Match) GetPhase() engine.GamePhase {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.Phase
}

// IsFinished returns true if the match is finished
func (m *Match) IsFinished() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.Phase == engine.PhaseFinished
}

// GetEventChannel returns the match event channel
func (m *Match) GetEventChannel() <-chan MatchEvent {
	return m.eventChan
}
