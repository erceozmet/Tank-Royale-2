package matchmaking

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"sync"
	"time"

	"github.com/erceozmet/tank-royale-2/go-server/internal/cache"
	"github.com/erceozmet/tank-royale-2/go-server/internal/db/postgres"
	"github.com/erceozmet/tank-royale-2/go-server/internal/db/redis"
	"github.com/erceozmet/tank-royale-2/go-server/internal/game"
	"github.com/erceozmet/tank-royale-2/go-server/internal/game/match"
	"github.com/erceozmet/tank-royale-2/go-server/internal/repositories"
	"github.com/google/uuid"
	goredis "github.com/redis/go-redis/v9"
)

const (
	QueueKeyPrefix      = "matchmaking:queue:"
	QueueTimeout        = 5 * time.Minute
	MatchmakingInterval = 2 * time.Second
	InitialMMRRange     = 100
	MaxMMRRange         = 500
	MMRRangeExpansion   = 50 // Expand by 50 MMR every 10 seconds
)

// QueueEntry represents a player in the matchmaking queue
type QueueEntry struct {
	UserID   string    `json:"userId"`
	Username string    `json:"username"`
	MMR      int       `json:"mmr"`
	JoinedAt time.Time `json:"joinedAt"`
}

// MatchmakingService handles matchmaking operations
type MatchmakingService struct {
	pgDB           *postgres.DB
	redisDB        *redis.DB
	userRepo       *repositories.UserRepository
	sessionManager *cache.SessionManager

	activeMatches map[string]*match.Match
	matchesMu     sync.RWMutex

	ctx    context.Context
	cancel context.CancelFunc
	wg     sync.WaitGroup
}

// NewMatchmakingService creates a new matchmaking service
func NewMatchmakingService(pgDB *postgres.DB, redisDB *redis.DB) *MatchmakingService {
	ctx, cancel := context.WithCancel(context.Background())

	return &MatchmakingService{
		pgDB:           pgDB,
		redisDB:        redisDB,
		userRepo:       repositories.NewUserRepository(pgDB, redisDB),
		sessionManager: cache.NewSessionManager(redisDB.Client),
		activeMatches:  make(map[string]*match.Match),
		ctx:            ctx,
		cancel:         cancel,
	}
}

// Start starts the matchmaking service
func (s *MatchmakingService) Start() error {
	fmt.Println("Starting matchmaking service...")

	s.wg.Add(1)
	go s.processQueue()

	return nil
}

// Stop stops the matchmaking service
func (s *MatchmakingService) Stop() {
	fmt.Println("Stopping matchmaking service...")
	s.cancel()
	s.wg.Wait()
}

// JoinQueue adds a player to the matchmaking queue
func (s *MatchmakingService) JoinQueue(ctx context.Context, userID string) error {
	// First, remove any existing entry for this user to prevent duplicates
	s.LeaveQueue(ctx, userID)

	var username string
	var mmr int

	// Check if this is a guest user (ID starts with "guest_")
	if strings.HasPrefix(userID, "guest_") {
		// Get guest data from Redis session
		session, err := s.sessionManager.GetSession(ctx, userID)
		if err != nil {
			return fmt.Errorf("failed to get guest session: %w", err)
		}
		if session == nil {
			return fmt.Errorf("guest session not found")
		}
		username = session.Username
		mmr = 1000 // Default MMR for guests
	} else {
		// Get user data from database
		user, err := s.userRepo.FindByID(ctx, userID)
		if err != nil {
			return fmt.Errorf("failed to get user: %w", err)
		}
		if user == nil {
			return fmt.Errorf("user not found")
		}
		username = user.Username
		mmr = user.MMR
	}

	// Create queue entry
	entry := QueueEntry{
		UserID:   userID,
		Username: username,
		MMR:      mmr,
		JoinedAt: time.Now(),
	}

	entryJSON, err := json.Marshal(entry)
	if err != nil {
		return fmt.Errorf("failed to marshal queue entry: %w", err)
	}

	// Add to Redis sorted set (score = MMR for easy range queries)
	queueKey := "matchmaking:queue"

	err = s.redisDB.Client.ZAdd(ctx, queueKey, goredis.Z{
		Score:  float64(mmr),
		Member: string(entryJSON),
	}).Err()

	if err != nil {
		return fmt.Errorf("failed to add to queue: %w", err)
	}

	fmt.Printf("Player %s joined matchmaking queue (MMR: %d)\n", username, mmr)

	return nil
}

// LeaveQueue removes a player from the matchmaking queue
func (s *MatchmakingService) LeaveQueue(ctx context.Context, userID string) error {
	queueKey := "matchmaking:queue"

	// Get all queue entries
	entries, err := s.redisDB.Client.ZRange(ctx, queueKey, 0, -1).Result()
	if err != nil {
		return fmt.Errorf("failed to get queue entries: %w", err)
	}

	// Find and remove the user's entry
	for _, entryJSON := range entries {
		var entry QueueEntry
		if err := json.Unmarshal([]byte(entryJSON), &entry); err != nil {
			continue
		}

		if entry.UserID == userID {
			err = s.redisDB.Client.ZRem(ctx, queueKey, entryJSON).Err()
			if err != nil {
				return fmt.Errorf("failed to remove from queue: %w", err)
			}

			fmt.Printf("Player %s left matchmaking queue\n", entry.Username)
			return nil
		}
	}

	return nil
}

// processQueue continuously processes the matchmaking queue
func (s *MatchmakingService) processQueue() {
	defer s.wg.Done()

	ticker := time.NewTicker(MatchmakingInterval)
	defer ticker.Stop()

	for {
		select {
		case <-s.ctx.Done():
			return
		case <-ticker.C:
			if err := s.tryCreateMatch(); err != nil {
				fmt.Printf("Error creating match: %v\n", err)
			}
		}
	}
}

// tryCreateMatch attempts to create a match from the queue
func (s *MatchmakingService) tryCreateMatch() error {
	ctx := context.Background()
	queueKey := "matchmaking:queue"

	// Get all queue entries
	entries, err := s.redisDB.Client.ZRange(ctx, queueKey, 0, -1).Result()
	if err != nil {
		return fmt.Errorf("failed to get queue entries: %w", err)
	}

	fmt.Printf("[Matchmaking Ticker] Checking queue: %d players (need %d)\n", len(entries), game.MinPlayers)

	if len(entries) < game.MinPlayers {
		return nil // Not enough players
	}

	// Parse entries
	var queueEntries []QueueEntry
	for _, entryJSON := range entries {
		var entry QueueEntry
		if err := json.Unmarshal([]byte(entryJSON), &entry); err != nil {
			continue
		}
		queueEntries = append(queueEntries, entry)
	}

	// Try to find a group of players with similar MMR
	matchedPlayers := s.findMatchedPlayers(queueEntries)

	if len(matchedPlayers) >= game.MinPlayers {
		// Create match
		if err := s.createMatch(ctx, matchedPlayers); err != nil {
			return fmt.Errorf("failed to create match: %w", err)
		}

		// Remove matched players from queue
		for _, player := range matchedPlayers {
			s.LeaveQueue(ctx, player.UserID)
		}
	}

	return nil
}

// findMatchedPlayers finds a group of players with similar MMR
func (s *MatchmakingService) findMatchedPlayers(entries []QueueEntry) []QueueEntry {
	if len(entries) < game.MinPlayers {
		return nil
	}

	// Sort by MMR (already sorted by Redis sorted set)
	// Find the first valid group

	for i := 0; i < len(entries); i++ {
		anchor := entries[i]
		var group []QueueEntry
		group = append(group, anchor)

		// Calculate MMR range based on wait time
		waitTime := time.Since(anchor.JoinedAt)
		mmrRange := calculateMMRRange(waitTime)

		// Find players within MMR range
		for j := i + 1; j < len(entries) && len(group) < game.MaxPlayers; j++ {
			candidate := entries[j]

			if math.Abs(float64(candidate.MMR-anchor.MMR)) <= float64(mmrRange) {
				group = append(group, candidate)
			}
		}

		// Check if we have enough players
		if len(group) >= game.MinPlayers {
			// Limit to MaxPlayers
			if len(group) > game.MaxPlayers {
				group = group[:game.MaxPlayers]
			}
			return group
		}
	}

	return nil
}

// calculateMMRRange calculates the MMR range based on wait time
func calculateMMRRange(waitTime time.Duration) int {
	// Start with InitialMMRRange, expand every 10 seconds
	expansions := int(waitTime.Seconds() / 10)
	mmrRange := InitialMMRRange + (expansions * MMRRangeExpansion)

	if mmrRange > MaxMMRRange {
		mmrRange = MaxMMRRange
	}

	return mmrRange
}

// createMatch creates a new match with the given players
func (s *MatchmakingService) createMatch(ctx context.Context, players []QueueEntry) error {
	matchID := uuid.New().String()

	// Create match
	newMatch := match.NewMatch(matchID, s.pgDB)

	// Add players to match
	for _, player := range players {
		if err := newMatch.AddPlayer(player.UserID, player.Username); err != nil {
			return fmt.Errorf("failed to add player to match: %w", err)
		}
	}

	// Store match
	s.matchesMu.Lock()
	s.activeMatches[matchID] = newMatch
	s.matchesMu.Unlock()

	// Start match
	if err := newMatch.Start(); err != nil {
		return fmt.Errorf("failed to start match: %w", err)
	}

	fmt.Printf("Created match %s with %d players\n", matchID, len(players))

	// Store match assignments in Redis for each player (with 5 minute TTL)
	for _, player := range players {
		matchData := map[string]interface{}{
			"matchId":     matchID,
			"playerCount": len(players),
			"createdAt":   time.Now().Unix(),
		}
		matchJSON, err := json.Marshal(matchData)
		if err == nil {
			key := fmt.Sprintf("match:player:%s", player.UserID)
			s.redisDB.Client.Set(ctx, key, matchJSON, 5*time.Minute)
			fmt.Printf("Stored match assignment for player %s in Redis\n", player.Username)
		}
	}

	// Clean up finished matches in the background
	go s.cleanupMatch(matchID)

	return nil
}

// cleanupMatch removes a finished match from memory
func (s *MatchmakingService) cleanupMatch(matchID string) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-s.ctx.Done():
			return
		case <-ticker.C:
			s.matchesMu.RLock()
			m, exists := s.activeMatches[matchID]
			s.matchesMu.RUnlock()

			if !exists {
				return
			}

			if m.IsFinished() {
				s.matchesMu.Lock()
				delete(s.activeMatches, matchID)
				s.matchesMu.Unlock()

				fmt.Printf("Cleaned up match %s\n", matchID)
				return
			}
		}
	}
}

// GetMatch retrieves a match by ID
func (s *MatchmakingService) GetMatch(matchID string) *match.Match {
	s.matchesMu.RLock()
	defer s.matchesMu.RUnlock()
	return s.activeMatches[matchID]
}

// GetActiveMatchCount returns the number of active matches
func (s *MatchmakingService) GetActiveMatchCount() int {
	s.matchesMu.RLock()
	defer s.matchesMu.RUnlock()
	return len(s.activeMatches)
}

// GetMatchAssignment retrieves a player's match assignment from Redis
func (s *MatchmakingService) GetMatchAssignment(ctx context.Context, matchKey string) (map[string]interface{}, error) {
	val, err := s.redisDB.Client.Get(ctx, matchKey).Result()
	if err != nil {
		return nil, err
	}

	var matchData map[string]interface{}
	if err := json.Unmarshal([]byte(val), &matchData); err != nil {
		return nil, err
	}

	return matchData, nil
}

// GetQueueSize returns the number of players in queue
func (s *MatchmakingService) GetQueueSize(ctx context.Context) (int, error) {
	queueKey := "matchmaking:queue"
	size, err := s.redisDB.Client.ZCard(ctx, queueKey).Result()
	if err != nil {
		return 0, fmt.Errorf("failed to get queue size: %w", err)
	}
	return int(size), nil
}
