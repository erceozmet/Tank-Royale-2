package websocket

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/erceozmet/tank-royale-2/go-server/internal/auth"
	"github.com/erceozmet/tank-royale-2/go-server/internal/cache"
	"github.com/erceozmet/tank-royale-2/go-server/pkg/logger"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// TODO: Configure allowed origins from environment
		return true // Allow all origins for now
	},
}

// AuthenticateAndUpgrade handles WebSocket upgrade with JWT authentication
func AuthenticateAndUpgrade(
	w http.ResponseWriter,
	r *http.Request,
	sessionManager *cache.SessionManager,
) (*Connection, error) {
	// Extract token from query parameter or Authorization header
	token := r.URL.Query().Get("token")
	if token == "" {
		authHeader := r.Header.Get("Authorization")
		if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
			token = strings.TrimPrefix(authHeader, "Bearer ")
		}
	}

	if token == "" {
		logger.Logger.Warn().
			Str("remoteAddr", r.RemoteAddr).
			Msg("WebSocket connection attempt without token")
		http.Error(w, "Authentication token required", http.StatusUnauthorized)
		return nil, fmt.Errorf("no token provided")
	}

	// Verify JWT token
	claims, err := auth.VerifyToken(token)
	if err != nil {
		logger.Logger.Warn().
			Err(err).
			Str("remoteAddr", r.RemoteAddr).
			Msg("WebSocket authentication failed: invalid token")
		http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	// Verify session exists in Redis
	ctx := r.Context()
	session, err := sessionManager.GetSession(ctx, claims.UserID)
	if err != nil || session == nil {
		logger.Logger.Warn().
			Str("userId", claims.UserID).
			Str("remoteAddr", r.RemoteAddr).
			Msg("WebSocket authentication failed: session not found")
		http.Error(w, "Session expired", http.StatusUnauthorized)
		return nil, fmt.Errorf("session not found")
	}

	// Upgrade connection
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.Logger.Error().
			Err(err).
			Str("userId", claims.UserID).
			Msg("Failed to upgrade WebSocket connection")
		return nil, fmt.Errorf("upgrade failed: %w", err)
	}

	// Create authenticated connection
	wsConn := NewConnection(conn, claims.UserID, claims.Username)

	logger.Logger.Info().
		Str("userId", claims.UserID).
		Str("username", claims.Username).
		Str("remoteAddr", r.RemoteAddr).
		Msg("WebSocket connection authenticated")

	return wsConn, nil
}
