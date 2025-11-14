package websocket

import (
	"fmt"
	"sync"
	"time"

	"github.com/erceozmet/tank-royale-2/go-server/pkg/logger"
)

// Room represents a group of connections (e.g., game lobby, match)
type Room struct {
	ID        string
	Name      string
	CreatedAt time.Time
	MaxSize   int

	members map[string]*Connection // userID -> Connection
	mu      sync.RWMutex
}

// NewRoom creates a new room
func NewRoom(id, name string, maxSize int) *Room {
	return &Room{
		ID:        id,
		Name:      name,
		CreatedAt: time.Now(),
		MaxSize:   maxSize,
		members:   make(map[string]*Connection),
	}
}

// Join adds a connection to the room
func (r *Room) Join(conn *Connection) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Check if room is full
	if r.MaxSize > 0 && len(r.members) >= r.MaxSize {
		return fmt.Errorf("room is full")
	}

	// Check if already in room
	if _, exists := r.members[conn.UserID]; exists {
		return fmt.Errorf("user already in room")
	}

	// Add to room
	r.members[conn.UserID] = conn
	conn.JoinRoom(r.ID)

	logger.Logger.Info().
		Str("roomId", r.ID).
		Str("userId", conn.UserID).
		Int("memberCount", len(r.members)).
		Msg("User joined room")

	return nil
}

// Leave removes a connection from the room
func (r *Room) Leave(userID string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if conn, exists := r.members[userID]; exists {
		delete(r.members, userID)
		conn.LeaveRoom(r.ID)

		logger.Logger.Info().
			Str("roomId", r.ID).
			Str("userId", userID).
			Int("memberCount", len(r.members)).
			Msg("User left room")
	}
}

// Broadcast sends a message to all members in the room
func (r *Room) Broadcast(messageType string, payload interface{}) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, conn := range r.members {
		go conn.Send(messageType, payload)
	}
}

// BroadcastExcept sends a message to all members except one
func (r *Room) BroadcastExcept(excludeUserID string, messageType string, payload interface{}) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for userID, conn := range r.members {
		if userID != excludeUserID {
			go conn.Send(messageType, payload)
		}
	}
}

// GetMembers returns all user IDs in the room
func (r *Room) GetMembers() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()

	members := make([]string, 0, len(r.members))
	for userID := range r.members {
		members = append(members, userID)
	}
	return members
}

// GetMemberCount returns the number of members
func (r *Room) GetMemberCount() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.members)
}

// IsFull checks if the room is at capacity
func (r *Room) IsFull() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.MaxSize > 0 && len(r.members) >= r.MaxSize
}

// IsEmpty checks if the room has no members
func (r *Room) IsEmpty() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.members) == 0
}

// HasMember checks if a user is in the room
func (r *Room) HasMember(userID string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	_, exists := r.members[userID]
	return exists
}

// RoomManager manages all active rooms
type RoomManager struct {
	rooms map[string]*Room // roomID -> Room
	mu    sync.RWMutex
}

// NewRoomManager creates a new room manager
func NewRoomManager() *RoomManager {
	return &RoomManager{
		rooms: make(map[string]*Room),
	}
}

// CreateRoom creates a new room
func (rm *RoomManager) CreateRoom(id, name string, maxSize int) (*Room, error) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	if _, exists := rm.rooms[id]; exists {
		return nil, fmt.Errorf("room already exists")
	}

	room := NewRoom(id, name, maxSize)
	rm.rooms[id] = room

	logger.Logger.Info().
		Str("roomId", id).
		Str("name", name).
		Int("maxSize", maxSize).
		Msg("Room created")

	return room, nil
}

// GetRoom retrieves a room by ID
func (rm *RoomManager) GetRoom(id string) (*Room, bool) {
	rm.mu.RLock()
	defer rm.mu.RUnlock()
	room, ok := rm.rooms[id]
	return room, ok
}

// DeleteRoom removes a room
func (rm *RoomManager) DeleteRoom(id string) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	if room, exists := rm.rooms[id]; exists {
		delete(rm.rooms, id)

		logger.Logger.Info().
			Str("roomId", id).
			Msg("Room deleted")

		// Notify all members
		room.Broadcast("room_closed", map[string]string{
			"roomId": id,
			"reason": "Room was closed",
		})
	}
}

// JoinRoom adds a connection to a room
func (rm *RoomManager) JoinRoom(roomID string, conn *Connection) error {
	rm.mu.RLock()
	room, ok := rm.rooms[roomID]
	rm.mu.RUnlock()

	if !ok {
		return fmt.Errorf("room not found")
	}

	return room.Join(conn)
}

// LeaveRoom removes a connection from a room
func (rm *RoomManager) LeaveRoom(roomID, userID string) {
	rm.mu.RLock()
	room, ok := rm.rooms[roomID]
	rm.mu.RUnlock()

	if ok {
		room.Leave(userID)
	}
}

// LeaveAllRooms removes a user from all rooms
func (rm *RoomManager) LeaveAllRooms(userID string) {
	rm.mu.RLock()
	defer rm.mu.RUnlock()

	for _, room := range rm.rooms {
		room.Leave(userID)
	}
}

// GetRoomCount returns the number of active rooms
func (rm *RoomManager) GetRoomCount() int {
	rm.mu.RLock()
	defer rm.mu.RUnlock()
	return len(rm.rooms)
}

// GetAllRooms returns all room IDs
func (rm *RoomManager) GetAllRooms() []string {
	rm.mu.RLock()
	defer rm.mu.RUnlock()

	roomIDs := make([]string, 0, len(rm.rooms))
	for id := range rm.rooms {
		roomIDs = append(roomIDs, id)
	}
	return roomIDs
}

// CleanupEmptyRooms removes rooms with no members
func (rm *RoomManager) CleanupEmptyRooms() int {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	removed := 0
	for id, room := range rm.rooms {
		if room.IsEmpty() {
			delete(rm.rooms, id)
			removed++

			logger.Logger.Debug().
				Str("roomId", id).
				Msg("Cleaned up empty room")
		}
	}

	return removed
}
