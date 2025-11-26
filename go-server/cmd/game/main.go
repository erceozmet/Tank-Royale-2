package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/erceozmet/tank-royale-2/go-server/internal/cache"
	"github.com/erceozmet/tank-royale-2/go-server/internal/config"
	"github.com/erceozmet/tank-royale-2/go-server/internal/db/postgres"
	"github.com/erceozmet/tank-royale-2/go-server/internal/db/redis"
	"github.com/erceozmet/tank-royale-2/go-server/internal/game/combat"
	"github.com/erceozmet/tank-royale-2/go-server/internal/game/engine"
	"github.com/erceozmet/tank-royale-2/go-server/internal/game/match"
	"github.com/erceozmet/tank-royale-2/go-server/internal/metrics"
	"github.com/erceozmet/tank-royale-2/go-server/internal/websocket"
	"github.com/erceozmet/tank-royale-2/go-server/pkg/logger"
	"github.com/joho/godotenv"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		fmt.Printf("Warning: .env file not found, using environment variables\n")
	}

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		fmt.Printf("Failed to load config: %v\n", err)
		os.Exit(1)
	}

	// Initialize logger
	logger.Init(cfg.Logging.Level, cfg.Logging.Format)
	logger.Logger.Info().Msg("Starting Tank Royale Game Server")

	// Connect to PostgreSQL
	logger.Logger.Info().Msg("Connecting to PostgreSQL...")
	pgDB, err := postgres.Connect(cfg.Database.Postgres)
	if err != nil {
		logger.Logger.Fatal().Err(err).Msg("Failed to connect to PostgreSQL")
	}
	defer pgDB.Close()
	logger.Logger.Info().Msg("Connected to PostgreSQL")

	// Connect to Redis (for sessions and match assignments)
	logger.Logger.Info().Msg("Connecting to Redis...")
	redisDB, err := redis.Connect(cfg.Database.Redis)
	if err != nil {
		logger.Logger.Fatal().Err(err).Msg("Failed to connect to Redis")
	}
	defer redisDB.Close()
	logger.Logger.Info().Msg("Connected to Redis")

	// Initialize session manager
	sessionManager := cache.NewSessionManager(redisDB.Client)

	// Initialize match manager
	matchManager := NewMatchManager(pgDB, redisDB)

	// Initialize WebSocket managers
	connManager := websocket.NewConnectionManager()
	roomManager := websocket.NewRoomManager()
	router := websocket.NewRouter()

	// Register default handlers
	router.RegisterDefaultHandlers()

	// Register custom handlers
	registerGameHandlers(router, connManager, roomManager, matchManager, redisDB)

	// Create HTTP server
	mux := http.NewServeMux()

	// WebSocket endpoint
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		handleWebSocket(w, r, sessionManager, connManager, roomManager, router)
	})

	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{"status":"healthy","connections":%d,"rooms":%d}`,
			connManager.Count(), roomManager.GetRoomCount())
	})

	// Metrics endpoint
	mux.Handle("/metrics", promhttp.Handler())

	// Start HTTP server
	port := cfg.Server.GamePort
	server := &http.Server{
		Addr:    fmt.Sprintf(":%d", port),
		Handler: mux,
	}

	// Start server in goroutine
	go func() {
		logger.Logger.Info().
			Int("port", port).
			Msg("Game server listening")

		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Logger.Fatal().Err(err).Msg("Failed to start game server")
		}
	}()

	// Start cleanup routine for empty rooms
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		for range ticker.C {
			removed := roomManager.CleanupEmptyRooms()
			if removed > 0 {
				logger.Logger.Info().
					Int("removed", removed).
					Msg("Cleaned up empty rooms")
			}
		}
	}()

	// Start metrics updater
	go func() {
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()

		for range ticker.C {
			redisDB.UpdatePoolMetrics()
			metrics.ActiveRooms.Set(float64(roomManager.GetRoomCount()))
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Logger.Info().Msg("Shutting down game server...")

	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		logger.Logger.Error().Err(err).Msg("Game server forced to shutdown")
	}

	logger.Logger.Info().Msg("Game server stopped")
}

// handleWebSocket handles new WebSocket connections
func handleWebSocket(
	w http.ResponseWriter,
	r *http.Request,
	sessionManager *cache.SessionManager,
	connManager *websocket.ConnectionManager,
	roomManager *websocket.RoomManager,
	router *websocket.Router,
) {
	// Authenticate and upgrade connection
	conn, err := websocket.AuthenticateAndUpgrade(w, r, sessionManager)
	if err != nil {
		// Error already logged and response sent
		return
	}

	// Add to connection manager
	connManager.Add(conn)
	metrics.WSConnectionsActive.Inc()

	// Send authentication success message
	conn.Send("authenticated", map[string]string{
		"userId":   conn.UserID,
		"username": conn.Username,
	})

	// Start read/write pumps
	go conn.WritePump()
	go conn.ReadPump(func(c *websocket.Connection, msg websocket.Message) {
		metrics.WSMessagesTotal.WithLabelValues(msg.Type, "inbound").Inc()
		router.Handle(c, msg)
	})

	// Handle cleanup on disconnect
	go func() {
		<-conn.Done()

		// Remove from all rooms
		roomManager.LeaveAllRooms(conn.UserID)

		// Remove from connection manager
		connManager.Remove(conn.UserID)
		metrics.WSConnectionsActive.Dec()

		logger.Logger.Info().
			Str("userId", conn.UserID).
			Str("username", conn.Username).
			Msg("WebSocket connection closed")
	}()
}

// registerGameHandlers registers game-specific message handlers
func registerGameHandlers(
	router *websocket.Router,
	connManager *websocket.ConnectionManager,
	roomManager *websocket.RoomManager,
	matchManager *MatchManager,
	redisDB *redis.DB,
) {
	// Join room handler
	router.Register("room:join", func(conn *websocket.Connection, msg websocket.Message) {
		var payload struct {
			RoomID string `json:"roomId"`
		}

		if err := json.Unmarshal(msg.Payload, &payload); err != nil {
			conn.Send("error", map[string]string{"message": "Invalid payload"})
			return
		}

		// Get or create room
		room, ok := roomManager.GetRoom(payload.RoomID)
		if !ok {
			// Create new room
			newRoom, err := roomManager.CreateRoom(payload.RoomID, payload.RoomID, 10)
			if err != nil {
				conn.Send("error", map[string]string{"message": "Failed to create room"})
				return
			}
			room = newRoom
		}

		if err := room.Join(conn); err != nil {
			conn.Send("error", map[string]string{"message": err.Error()})
			return
		}

		// Notify user
		conn.Send("room:joined", map[string]interface{}{
			"roomId":  payload.RoomID,
			"members": room.GetMembers(),
		})

		// Notify other members
		room.BroadcastExcept(conn.UserID, "room:member_joined", map[string]interface{}{
			"userId":      conn.UserID,
			"username":    conn.Username,
			"memberCount": room.GetMemberCount(),
		})

		metrics.ActiveRooms.Set(float64(roomManager.GetRoomCount()))
	})

	// Leave room handler
	router.Register("room:leave", func(conn *websocket.Connection, msg websocket.Message) {
		var payload struct {
			RoomID string `json:"roomId"`
		}

		if err := json.Unmarshal(msg.Payload, &payload); err != nil {
			conn.Send("error", map[string]string{"message": "Invalid payload"})
			return
		}

		room, ok := roomManager.GetRoom(payload.RoomID)
		if !ok {
			conn.Send("error", map[string]string{"message": "Room not found"})
			return
		}

		room.Leave(conn.UserID)

		// Notify user
		conn.Send("room:left", map[string]string{"roomId": payload.RoomID})

		// Notify other members
		room.Broadcast("room:member_left", map[string]interface{}{
			"userId":      conn.UserID,
			"username":    conn.Username,
			"memberCount": room.GetMemberCount(),
		})

		metrics.ActiveRooms.Set(float64(roomManager.GetRoomCount()))
	})

	// Room message handler
	router.Register("room:message", func(conn *websocket.Connection, msg websocket.Message) {
		var payload struct {
			RoomID  string      `json:"roomId"`
			Message interface{} `json:"message"`
		}

		if err := json.Unmarshal(msg.Payload, &payload); err != nil {
			conn.Send("error", map[string]string{"message": "Invalid payload"})
			return
		}

		room, ok := roomManager.GetRoom(payload.RoomID)
		if !ok {
			conn.Send("error", map[string]string{"message": "Room not found"})
			return
		}

		if !room.HasMember(conn.UserID) {
			conn.Send("error", map[string]string{"message": "Not a member of this room"})
			return
		}

		// Broadcast message to all members
		room.Broadcast("room:message", map[string]interface{}{
			"roomId":   payload.RoomID,
			"userId":   conn.UserID,
			"username": conn.Username,
			"message":  payload.Message,
		})
	})

	// Match join handler - called when a player wants to join their matched game
	router.Register("match:join", func(conn *websocket.Connection, msg websocket.Message) {
		var payload struct {
			MatchID string `json:"matchId"`
		}

		if err := json.Unmarshal(msg.Payload, &payload); err != nil {
			conn.Send("error", map[string]string{"message": "Invalid payload"})
			return
		}

		// Verify this player is assigned to this match in Redis
		ctx := context.Background()
		matchKey := fmt.Sprintf("match:player:%s", conn.UserID)
		matchData, err := redisDB.Client.Get(ctx, matchKey).Result()
		if err != nil {
			logger.Logger.Warn().
				Err(err).
				Str("userId", conn.UserID).
				Str("matchId", payload.MatchID).
				Msg("Player not assigned to any match")
			conn.Send("error", map[string]string{"message": "No match assignment found"})
			return
		}

		// Parse match assignment data
		var assignment struct {
			MatchID     string `json:"matchId"`
			PlayerCount int    `json:"playerCount"`
			CreatedAt   int64  `json:"createdAt"`
		}
		if err := json.Unmarshal([]byte(matchData), &assignment); err != nil {
			logger.Logger.Error().
				Err(err).
				Str("userId", conn.UserID).
				Msg("Failed to parse match assignment")
			conn.Send("error", map[string]string{"message": "Invalid match assignment"})
			return
		}

		// Verify matchId matches
		if assignment.MatchID != payload.MatchID {
			logger.Logger.Warn().
				Str("userId", conn.UserID).
				Str("requestedMatchId", payload.MatchID).
				Str("assignedMatchId", assignment.MatchID).
				Msg("Match ID mismatch")
			conn.Send("error", map[string]string{"message": "Match ID mismatch"})
			return
		}

		// Get or create the match instance
		m := matchManager.GetOrCreateMatch(payload.MatchID)

		// Add player to match
		if err := m.AddPlayer(conn.UserID, conn.Username); err != nil {
			logger.Logger.Error().
				Err(err).
				Str("userId", conn.UserID).
				Str("matchId", payload.MatchID).
				Msg("Failed to add player to match")
			conn.Send("error", map[string]string{"message": err.Error()})
			return
		}

		logger.Logger.Info().
			Str("userId", conn.UserID).
			Str("username", conn.Username).
			Str("matchId", payload.MatchID).
			Int("playerCount", len(m.Players)).
			Int("expectedPlayers", assignment.PlayerCount).
			Msg("Player joined match")

		// Send confirmation to player
		conn.Send("match:joined", map[string]interface{}{
			"matchId":         payload.MatchID,
			"playerCount":     len(m.Players),
			"expectedPlayers": assignment.PlayerCount,
		})

		// Check if all players have joined - if so, start the match
		if len(m.Players) >= assignment.PlayerCount {
			logger.Logger.Info().
				Str("matchId", payload.MatchID).
				Int("playerCount", len(m.Players)).
				Msg("All players joined - starting match")

			// Log all player connections BEFORE starting
			for _, player := range m.Players {
				if _, ok := connManager.Get(player.UserID); ok {
					logger.Logger.Info().
						Str("userId", player.UserID).
						Str("username", player.Username).
						Msg("✅ Player connection found before match start")
				} else {
					logger.Logger.Error().
						Str("userId", player.UserID).
						Str("username", player.Username).
						Msg("❌ Player connection NOT found before match start")
				}
			}

			if err := m.Start(); err != nil {
				logger.Logger.Error().
					Err(err).
					Str("matchId", payload.MatchID).
					Msg("Failed to start match")

				// Notify all players of error
				for _, player := range m.Players {
					if playerConn, ok := connManager.Get(player.UserID); ok {
						playerConn.Send("error", map[string]string{
							"message": "Failed to start match",
						})
					}
				}
				return
			}

			// Notify all players that match has started
			for _, player := range m.Players {
				if playerConn, ok := connManager.Get(player.UserID); ok {
					playerConn.Send("match:started", map[string]interface{}{
						"matchId":     payload.MatchID,
						"playerCount": len(m.Players),
					})
				}
			}

			// Start broadcasting game state updates to all players
			go func(matchID string, m *match.Match) {
				logger.Logger.Info().
					Str("matchId", matchID).
					Int("playerCount", len(m.Players)).
					Msg("Starting game state broadcast goroutine")

				broadcastChan := m.GameLoop.GetBroadcastChannel()

				for update := range broadcastChan {
					// Send state update to all players in the match
					sentCount := 0
					for _, player := range m.Players {
						if playerConn, ok := connManager.Get(player.UserID); ok {
							playerConn.Send("game:state", update)
							sentCount++
						} else {
							logger.Logger.Warn().
								Str("userId", player.UserID).
								Str("matchId", matchID).
								Msg("Player connection not found for broadcast")
						}
					}

					if sentCount == 0 {
						logger.Logger.Warn().
							Str("matchId", matchID).
							Int("playersInMatch", len(m.Players)).
							Msg("No player connections found for broadcast!")
					}
				}

				logger.Logger.Info().
					Str("matchId", matchID).
					Msg("Game state broadcast goroutine ended")
			}(payload.MatchID, m)

			// Start broadcasting match events (like match_ended)
			go func(matchID string, m *match.Match) {
				logger.Logger.Info().
					Str("matchId", matchID).
					Msg("Starting match event broadcast goroutine")

				eventChan := m.GetEventChannel()

				for event := range eventChan {
					// Send match event to all players in the match
					sentCount := 0
					for _, player := range m.Players {
						if playerConn, ok := connManager.Get(player.UserID); ok {
							playerConn.Send(event.Type, event.Data)
							sentCount++
						} else {
							logger.Logger.Warn().
								Str("userId", player.UserID).
								Str("matchId", matchID).
								Str("eventType", event.Type).
								Msg("Player connection not found for event broadcast")
						}
					}

					logger.Logger.Info().
						Str("matchId", matchID).
						Str("eventType", event.Type).
						Int("sentCount", sentCount).
						Msg("Match event broadcasted to players")
				}

				logger.Logger.Info().
					Str("matchId", matchID).
					Msg("Match event broadcast goroutine ended")
			}(payload.MatchID, m)
		}
	})

	// Player input handler - handles keyboard/mouse input from players
	router.Register("player_input", func(conn *websocket.Connection, msg websocket.Message) {
		var input struct {
			Tick     int     `json:"tick"`
			Up       bool    `json:"up"`
			Down     bool    `json:"down"`
			Left     bool    `json:"left"`
			Right    bool    `json:"right"`
			Shoot    bool    `json:"shoot"`
			AimAngle float64 `json:"aimAngle"`
		}

		if err := json.Unmarshal(msg.Payload, &input); err != nil {
			logger.Logger.Warn().
				Err(err).
				Str("userId", conn.UserID).
				Msg("Invalid player_input payload")
			return
		}

		// Find which match this player is in
		ctx := context.Background()
		matchKey := fmt.Sprintf("match:player:%s", conn.UserID)
		matchData, err := redisDB.Client.Get(ctx, matchKey).Result()
		if err != nil {
			// Player not in a match - ignore input
			return
		}

		var assignment struct {
			MatchID string `json:"matchId"`
		}
		if err := json.Unmarshal([]byte(matchData), &assignment); err != nil {
			return
		}

		// Get the match
		m, exists := matchManager.GetMatch(assignment.MatchID)
		if !exists {
			return
		}

		// Queue the input to the game loop
		m.GameLoop.QueueInput(engine.PlayerInput{
			UserID: conn.UserID,
			Tick:   int64(input.Tick),
			Input: combat.PlayerInput{
				MoveForward:  input.Up,
				MoveBackward: input.Down,
				MoveLeft:     input.Left,
				MoveRight:    input.Right,
				Rotation:     input.AimAngle,
				Fire:         input.Shoot,
				Interact:     false,
			},
			Timestamp: time.Now(),
		})
	})
}

// MatchManager manages active game matches
type MatchManager struct {
	matches map[string]*match.Match
	pgDB    *postgres.DB
	redisDB *redis.DB
	mu      sync.RWMutex
}

// NewMatchManager creates a new match manager
func NewMatchManager(pgDB *postgres.DB, redisDB *redis.DB) *MatchManager {
	return &MatchManager{
		matches: make(map[string]*match.Match),
		pgDB:    pgDB,
		redisDB: redisDB,
	}
}

// GetOrCreateMatch gets an existing match or creates a new one
func (mm *MatchManager) GetOrCreateMatch(matchID string) *match.Match {
	mm.mu.Lock()
	defer mm.mu.Unlock()

	if m, exists := mm.matches[matchID]; exists {
		return m
	}

	// Create new match
	m := match.NewMatch(matchID, mm.pgDB)
	mm.matches[matchID] = m

	logger.Logger.Info().
		Str("matchId", matchID).
		Msg("Created new match instance")

	return m
}

// GetMatch returns a match by ID
func (mm *MatchManager) GetMatch(matchID string) (*match.Match, bool) {
	mm.mu.RLock()
	defer mm.mu.RUnlock()

	m, exists := mm.matches[matchID]
	return m, exists
}

// RemoveMatch removes a match from the manager
func (mm *MatchManager) RemoveMatch(matchID string) {
	mm.mu.Lock()
	defer mm.mu.Unlock()

	delete(mm.matches, matchID)

	logger.Logger.Info().
		Str("matchId", matchID).
		Msg("Removed match instance")
}

// GetMatchCount returns the number of active matches
func (mm *MatchManager) GetMatchCount() int {
	mm.mu.RLock()
	defer mm.mu.RUnlock()

	return len(mm.matches)
}
