package websocket

import (
	"sync"

	"github.com/erceozmet/tank-royale-2/go-server/pkg/logger"
)

// MessageHandler is a function that handles a specific message type
type MessageHandler func(*Connection, Message)

// Router handles message routing to registered handlers
type Router struct {
	handlers map[string]MessageHandler
	mu       sync.RWMutex
}

// NewRouter creates a new message router
func NewRouter() *Router {
	return &Router{
		handlers: make(map[string]MessageHandler),
	}
}

// Register registers a handler for a message type
func (r *Router) Register(messageType string, handler MessageHandler) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.handlers[messageType] = handler

	logger.Logger.Debug().
		Str("messageType", messageType).
		Msg("Registered WebSocket message handler")
}

// Handle routes a message to the appropriate handler
func (r *Router) Handle(conn *Connection, msg Message) {
	r.mu.RLock()
	handler, ok := r.handlers[msg.Type]
	r.mu.RUnlock()

	if !ok {
		logger.Logger.Warn().
			Str("messageType", msg.Type).
			Str("userId", conn.UserID).
			Msg("No handler registered for message type")

		conn.Send("error", map[string]string{
			"message": "Unknown message type",
			"type":    msg.Type,
		})
		return
	}

	// Handle message
	handler(conn, msg)
}

// RegisterDefaultHandlers registers common handlers like ping/pong
func (r *Router) RegisterDefaultHandlers() {
	// Ping handler
	r.Register("ping", func(conn *Connection, msg Message) {
		conn.Send("pong", map[string]interface{}{
			"timestamp": conn.lastPingAt.Unix(),
		})
	})

	// Echo handler (for testing)
	r.Register("echo", func(conn *Connection, msg Message) {
		conn.Send("echo_response", map[string]interface{}{
			"payload": msg.Payload,
		})
	})
}
