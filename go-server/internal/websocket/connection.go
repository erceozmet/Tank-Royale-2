package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/erceozmet/tank-royale-2/go-server/pkg/logger"
	"github.com/gorilla/websocket"
)

// Connection represents an authenticated WebSocket connection
type Connection struct {
	// User identification
	UserID   string
	Username string

	// WebSocket connection
	conn *websocket.Conn

	// Channels for message handling
	send chan []byte

	// Context for graceful shutdown
	ctx    context.Context
	cancel context.CancelFunc

	// Connection metadata
	connectedAt time.Time
	lastPingAt  time.Time

	// Rooms this connection has joined
	rooms map[string]bool
	mu    sync.RWMutex

	// Ensure Close is only called once
	closeOnce sync.Once
} // Message represents a WebSocket message structure
type Message struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

// NewConnection creates a new authenticated connection
func NewConnection(conn *websocket.Conn, userID, username string) *Connection {
	ctx, cancel := context.WithCancel(context.Background())

	return &Connection{
		UserID:      userID,
		Username:    username,
		conn:        conn,
		send:        make(chan []byte, 256),
		ctx:         ctx,
		cancel:      cancel,
		connectedAt: time.Now(),
		lastPingAt:  time.Now(),
		rooms:       make(map[string]bool),
	}
}

// ReadPump handles incoming messages from the WebSocket
func (c *Connection) ReadPump(handler func(*Connection, Message)) {
	defer func() {
		c.Close()
	}()

	// Configure read settings
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		c.lastPingAt = time.Now()
		return nil
	})

	for {
		select {
		case <-c.ctx.Done():
			return
		default:
			_, messageBytes, err := c.conn.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					logger.Logger.Error().
						Err(err).
						Str("userId", c.UserID).
						Msg("WebSocket read error")
				}
				return
			}

			// Parse message
			var msg Message
			if err := json.Unmarshal(messageBytes, &msg); err != nil {
				logger.Logger.Warn().
					Err(err).
					Str("userId", c.UserID).
					Str("message", string(messageBytes)).
					Msg("Failed to parse WebSocket message")
				continue
			}

			// Handle message
			handler(c, msg)
		}
	}
}

// WritePump handles outgoing messages to the WebSocket
func (c *Connection) WritePump() {
	ticker := time.NewTicker(25 * time.Second)
	defer func() {
		ticker.Stop()
		c.Close()
	}()

	for {
		select {
		case <-c.ctx.Done():
			// Send close message
			c.conn.WriteMessage(websocket.CloseMessage, []byte{})
			return

		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				// Channel closed
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				logger.Logger.Error().
					Err(err).
					Str("userId", c.UserID).
					Msg("Failed to write WebSocket message")
				return
			}

		case <-ticker.C:
			// Send ping
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// Send sends a message to this connection
func (c *Connection) Send(messageType string, payload interface{}) error {
	msg := Message{
		Type:    messageType,
		Payload: json.RawMessage{},
	}

	// Marshal payload
	if payload != nil {
		payloadBytes, err := json.Marshal(payload)
		if err != nil {
			return err
		}
		msg.Payload = payloadBytes
	}

	// Marshal full message
	msgBytes, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	select {
	case c.send <- msgBytes:
		return nil
	case <-c.ctx.Done():
		return context.Canceled
	case <-time.After(5 * time.Second):
		return context.DeadlineExceeded
	}
}

// JoinRoom adds this connection to a room
func (c *Connection) JoinRoom(roomID string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.rooms[roomID] = true
}

// LeaveRoom removes this connection from a room
func (c *Connection) LeaveRoom(roomID string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.rooms, roomID)
}

// IsInRoom checks if connection is in a room
func (c *Connection) IsInRoom(roomID string) bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.rooms[roomID]
}

// GetRooms returns all rooms this connection is in
func (c *Connection) GetRooms() []string {
	c.mu.RLock()
	defer c.mu.RUnlock()

	rooms := make([]string, 0, len(c.rooms))
	for room := range c.rooms {
		rooms = append(rooms, room)
	}
	return rooms
}

// Close closes the WebSocket connection
func (c *Connection) Close() {
	c.closeOnce.Do(func() {
		c.cancel()
		close(c.send)
		c.conn.Close()
	})
}

// Done returns a channel that's closed when the connection is closed
func (c *Connection) Done() <-chan struct{} {
	return c.ctx.Done()
}

// ConnectionManager manages all active WebSocket connections
type ConnectionManager struct {
	connections map[string]*Connection // userID -> Connection
	mu          sync.RWMutex
}

// NewConnectionManager creates a new connection manager
func NewConnectionManager() *ConnectionManager {
	return &ConnectionManager{
		connections: make(map[string]*Connection),
	}
}

// Add adds a connection to the manager
func (cm *ConnectionManager) Add(conn *Connection) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	// Close existing connection for this user
	if existing, ok := cm.connections[conn.UserID]; ok {
		logger.Logger.Info().
			Str("userId", conn.UserID).
			Msg("Closing existing connection for user")
		existing.Close()
	}

	cm.connections[conn.UserID] = conn

	logger.Logger.Info().
		Str("userId", conn.UserID).
		Str("username", conn.Username).
		Int("total", len(cm.connections)).
		Msg("WebSocket connection added")
}

// Remove removes a connection from the manager
func (cm *ConnectionManager) Remove(userID string) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	if conn, ok := cm.connections[userID]; ok {
		conn.Close()
		delete(cm.connections, userID)

		logger.Logger.Info().
			Str("userId", userID).
			Int("total", len(cm.connections)).
			Msg("WebSocket connection removed")
	}
}

// Get retrieves a connection by user ID
func (cm *ConnectionManager) Get(userID string) (*Connection, bool) {
	cm.mu.RLock()
	defer cm.mu.RUnlock()
	conn, ok := cm.connections[userID]
	return conn, ok
}

// IsConnected checks if a user is connected
func (cm *ConnectionManager) IsConnected(userID string) bool {
	cm.mu.RLock()
	defer cm.mu.RUnlock()
	_, ok := cm.connections[userID]
	return ok
}

// Count returns the number of active connections
func (cm *ConnectionManager) Count() int {
	cm.mu.RLock()
	defer cm.mu.RUnlock()
	return len(cm.connections)
}

// Broadcast sends a message to all connected users
func (cm *ConnectionManager) Broadcast(messageType string, payload interface{}) {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	for _, conn := range cm.connections {
		go conn.Send(messageType, payload)
	}
}

// SendToUser sends a message to a specific user
func (cm *ConnectionManager) SendToUser(userID string, messageType string, payload interface{}) error {
	cm.mu.RLock()
	conn, ok := cm.connections[userID]
	cm.mu.RUnlock()

	if !ok {
		return fmt.Errorf("user not connected")
	}

	return conn.Send(messageType, payload)
}

// SendToUsers sends a message to multiple users
func (cm *ConnectionManager) SendToUsers(userIDs []string, messageType string, payload interface{}) {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	for _, userID := range userIDs {
		if conn, ok := cm.connections[userID]; ok {
			go conn.Send(messageType, payload)
		}
	}
}

// GetConnectedUsers returns all connected user IDs
func (cm *ConnectionManager) GetConnectedUsers() []string {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	users := make([]string, 0, len(cm.connections))
	for userID := range cm.connections {
		users = append(users, userID)
	}
	return users
}

// DisconnectUser forcefully disconnects a user
func (cm *ConnectionManager) DisconnectUser(userID string, reason string) {
	cm.mu.RLock()
	conn, ok := cm.connections[userID]
	cm.mu.RUnlock()

	if ok {
		conn.Send("force_disconnect", map[string]string{"reason": reason})
		cm.Remove(userID)
	}
}
