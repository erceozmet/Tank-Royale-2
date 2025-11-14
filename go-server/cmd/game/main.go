package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/erceozmet/tank-royale-2/go-server/internal/cache"
	"github.com/erceozmet/tank-royale-2/go-server/internal/config"
	"github.com/erceozmet/tank-royale-2/go-server/internal/db/redis"
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

	// Connect to Redis (for sessions)
	logger.Logger.Info().Msg("Connecting to Redis...")
	redisDB, err := redis.Connect(cfg.Database.Redis)
	if err != nil {
		logger.Logger.Fatal().Err(err).Msg("Failed to connect to Redis")
	}
	defer redisDB.Close()
	logger.Logger.Info().Msg("Connected to Redis")

	// Initialize session manager
	sessionManager := cache.NewSessionManager(redisDB.Client)

	// Initialize WebSocket managers
	connManager := websocket.NewConnectionManager()
	roomManager := websocket.NewRoomManager()
	router := websocket.NewRouter()

	// Register default handlers
	router.RegisterDefaultHandlers()

	// Register custom handlers
	registerGameHandlers(router, connManager, roomManager)

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
}
