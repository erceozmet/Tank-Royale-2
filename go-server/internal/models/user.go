package models

import "time"

// User represents a player/user in the system
type User struct {
	ID           string    `json:"id" db:"id"`
	Username     string    `json:"username" db:"username"`
	Email        string    `json:"email" db:"email"`
	PasswordHash string    `json:"-" db:"password_hash"` // Never expose password
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

// UserStats represents player statistics
type UserStats struct {
	UserID      string    `json:"user_id" db:"user_id"`
	GamesPlayed int       `json:"games_played" db:"games_played"`
	Wins        int       `json:"wins" db:"wins"`
	Losses      int       `json:"losses" db:"losses"`
	Kills       int       `json:"kills" db:"kills"`
	Deaths      int       `json:"deaths" db:"deaths"`
	TotalScore  int       `json:"total_score" db:"total_score"`
	HighScore   int       `json:"high_score" db:"high_score"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

// LeaderboardEntry represents a single leaderboard entry
type LeaderboardEntry struct {
	Rank       int       `json:"rank"`
	UserID     string    `json:"user_id" db:"user_id"`
	Username   string    `json:"username" db:"username"`
	TotalScore int       `json:"total_score" db:"total_score"`
	Wins       int       `json:"wins" db:"wins"`
	UpdatedAt  time.Time `json:"updated_at" db:"updated_at"`
}

// Session represents an active user session
type Session struct {
	SessionID string    `json:"session_id"`
	UserID    string    `json:"user_id"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

// AuthResponse represents the response after successful authentication
type AuthResponse struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
	User      User      `json:"user"`
}

// RegisterRequest represents a user registration request
type RegisterRequest struct {
	Username string `json:"username" validate:"required,min=3,max=20"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

// LoginRequest represents a user login request
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
	Code    int    `json:"code"`
}

// SuccessResponse represents a generic success response
type SuccessResponse struct {
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}
