package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/erceozmet/tank-royale-2/go-server/internal/auth"
	"github.com/erceozmet/tank-royale-2/go-server/internal/cache"
	"github.com/erceozmet/tank-royale-2/go-server/internal/metrics"
	"github.com/erceozmet/tank-royale-2/go-server/internal/middleware"
	"github.com/erceozmet/tank-royale-2/go-server/internal/repositories"
	"github.com/erceozmet/tank-royale-2/go-server/pkg/logger"
	"github.com/google/uuid"
)

// AuthHandler handles authentication endpoints
type AuthHandler struct {
	userRepo       *repositories.UserRepository
	sessionManager *cache.SessionManager
}

// NewAuthHandler creates a new AuthHandler
func NewAuthHandler(userRepo *repositories.UserRepository, sessionManager *cache.SessionManager) *AuthHandler {
	return &AuthHandler{
		userRepo:       userRepo,
		sessionManager: sessionManager,
	}
}

// RegisterRequest represents the registration request body
type RegisterRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginRequest represents the login request body
type LoginRequest struct {
	UsernameOrEmail string `json:"usernameOrEmail"`
	Password        string `json:"password"`
}

// UserResponse represents the user data in responses
type UserResponse struct {
	UserID      string `json:"userId"`
	Username    string `json:"username"`
	Email       string `json:"email"`
	MMR         int    `json:"mmr"`
	CreatedAt   string `json:"createdAt"`
	TotalWins   *int   `json:"totalWins,omitempty"`
	TotalLosses *int   `json:"totalLosses,omitempty"`
}

// Register handles POST /api/auth/register
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Parse request body
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}

	// Validation
	if req.Username == "" || req.Email == "" || req.Password == "" {
		http.Error(w, `{"error":"Username, email, and password are required"}`, http.StatusBadRequest)
		return
	}

	if !auth.IsValidUsername(req.Username) {
		http.Error(w, `{"error":"Invalid username. Must be 3-50 alphanumeric characters or underscores"}`, http.StatusBadRequest)
		return
	}

	if !auth.IsValidEmail(req.Email) {
		http.Error(w, `{"error":"Invalid email format"}`, http.StatusBadRequest)
		return
	}

	if !auth.IsValidPassword(req.Password) {
		http.Error(w, `{"error":"Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number"}`, http.StatusBadRequest)
		return
	}

	// Check if user already exists
	exists, err := h.userRepo.UsernameOrEmailExists(ctx, req.Username, req.Email)
	if err != nil {
		logger.Logger.Error().Err(err).Msg("Failed to check if user exists")
		http.Error(w, `{"error":"Internal server error"}`, http.StatusInternalServerError)
		return
	}

	if exists {
		http.Error(w, `{"error":"Username or email already exists"}`, http.StatusConflict)
		return
	}

	// Hash password
	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		logger.Logger.Error().Err(err).Msg("Failed to hash password")
		http.Error(w, `{"error":"Internal server error"}`, http.StatusInternalServerError)
		return
	}

	// Create user
	user, err := h.userRepo.Create(ctx, repositories.CreateUserParams{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: passwordHash,
	})
	if err != nil {
		logger.Logger.Error().Err(err).Msg("Failed to create user")
		http.Error(w, `{"error":"Internal server error"}`, http.StatusInternalServerError)
		return
	}

	// Generate JWT token
	token, err := auth.GenerateToken(user.UserID, user.Username)
	if err != nil {
		logger.Logger.Error().Err(err).Msg("Failed to generate token")
		http.Error(w, `{"error":"Internal server error"}`, http.StatusInternalServerError)
		return
	}

	// Create Redis session for WebSocket authentication
	sessionData := cache.SessionData{
		UserID:   user.UserID,
		Username: user.Username,
		Email:    user.Email,
		Token:    token,
	}
	if err := h.sessionManager.SetSession(ctx, user.UserID, sessionData); err != nil {
		logger.Logger.Error().Err(err).Msg("Failed to create session")
		// Don't fail the registration, just log the error
	}

	// Track successful authentication
	metrics.AuthAttempts.WithLabelValues("success").Inc()

	// Return response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "User registered successfully",
		"token":   token,
		"user": UserResponse{
			UserID:    user.UserID,
			Username:  user.Username,
			Email:     user.Email,
			MMR:       user.MMR,
			CreatedAt: user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		},
	})
}

// Login handles POST /api/auth/login
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Parse request body
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}

	// Validation
	if req.UsernameOrEmail == "" || req.Password == "" {
		http.Error(w, `{"error":"Username/email and password are required"}`, http.StatusBadRequest)
		return
	}

	// Find user by username or email
	user, err := h.userRepo.FindByUsernameOrEmail(ctx, req.UsernameOrEmail)
	if err != nil {
		logger.Logger.Error().Err(err).Msg("Failed to find user")
		http.Error(w, `{"error":"Internal server error"}`, http.StatusInternalServerError)
		return
	}

	if user == nil {
		metrics.AuthAttempts.WithLabelValues("failure").Inc()
		http.Error(w, `{"error":"Invalid credentials"}`, http.StatusUnauthorized)
		return
	}

	// Verify password
	isValid := auth.ComparePassword(req.Password, user.PasswordHash)
	if !isValid {
		metrics.AuthAttempts.WithLabelValues("failure").Inc()
		http.Error(w, `{"error":"Invalid credentials"}`, http.StatusUnauthorized)
		return
	}

	// Update last login timestamp
	if err := h.userRepo.UpdateLastLogin(ctx, user.UserID); err != nil {
		logger.Logger.Error().Err(err).Msg("Failed to update last login")
		// Don't fail the login, just log the error
	}

	// Generate JWT token
	token, err := auth.GenerateToken(user.UserID, user.Username)
	if err != nil {
		logger.Logger.Error().Err(err).Msg("Failed to generate token")
		http.Error(w, `{"error":"Internal server error"}`, http.StatusInternalServerError)
		return
	}

	// Create Redis session for WebSocket authentication
	sessionData := cache.SessionData{
		UserID:   user.UserID,
		Username: user.Username,
		Email:    user.Email,
		Token:    token,
	}
	if err := h.sessionManager.SetSession(ctx, user.UserID, sessionData); err != nil {
		logger.Logger.Error().Err(err).Msg("Failed to create session")
		// Don't fail the login, just log the error
	}

	// Track successful authentication
	metrics.AuthAttempts.WithLabelValues("success").Inc()

	// Return response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Login successful",
		"token":   token,
		"user": UserResponse{
			UserID:      user.UserID,
			Username:    user.Username,
			Email:       user.Email,
			MMR:         user.MMR,
			TotalWins:   &user.TotalWins,
			TotalLosses: &user.TotalLosses,
		},
	})
}

// Me handles GET /api/auth/me (requires authentication)
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Extract user ID from context (set by auth middleware)
	userID, ok := ctx.Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
		return
	}

	// Find user by ID
	user, err := h.userRepo.FindByID(ctx, userID)
	if err != nil {
		logger.Logger.Error().Err(err).Msg("Failed to find user")
		http.Error(w, `{"error":"Internal server error"}`, http.StatusInternalServerError)
		return
	}

	if user == nil {
		http.Error(w, `{"error":"User not found"}`, http.StatusNotFound)
		return
	}

	// Get user stats
	stats, err := h.userRepo.GetStats(ctx, userID)
	if err != nil {
		logger.Logger.Error().Err(err).Msg("Failed to get user stats")
		http.Error(w, `{"error":"Internal server error"}`, http.StatusInternalServerError)
		return
	}

	// Return response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user": map[string]interface{}{
			"userId":      user.UserID,
			"username":    user.Username,
			"email":       user.Email,
			"mmr":         user.MMR,
			"totalWins":   user.TotalWins,
			"totalLosses": user.TotalLosses,
			"totalKills":  user.TotalKills,
			"totalDeaths": user.TotalDeaths,
			"winRate":     stats.WinRate,
			"kdr":         stats.KDR,
			"createdAt":   user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			"lastLogin":   user.LastLogin.Format("2006-01-02T15:04:05Z07:00"),
		},
	})
}

// Guest handles POST /api/auth/guest
// Creates a temporary guest session without database persistence
func (h *AuthHandler) Guest(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Generate unique guest ID and username
	guestID := fmt.Sprintf("guest_%s", uuid.New().String()[:8])
	guestNumber := time.Now().UnixNano() % 10000
	guestUsername := fmt.Sprintf("Guest_%04d", guestNumber)

	// Generate JWT token for the guest
	token, err := auth.GenerateToken(guestID, guestUsername)
	if err != nil {
		logger.Logger.Error().Err(err).Msg("Failed to generate guest token")
		http.Error(w, `{"error":"Internal server error"}`, http.StatusInternalServerError)
		return
	}

	// Create Redis session (no database entry)
	sessionData := cache.SessionData{
		UserID:   guestID,
		Username: guestUsername,
		Email:    "", // No email for guests
		Token:    token,
		IsGuest:  true,
	}
	if err := h.sessionManager.SetSession(ctx, guestID, sessionData); err != nil {
		logger.Logger.Error().Err(err).Msg("Failed to create guest session")
		http.Error(w, `{"error":"Internal server error"}`, http.StatusInternalServerError)
		return
	}

	// Track successful authentication
	metrics.AuthAttempts.WithLabelValues("guest").Inc()

	logger.Logger.Info().
		Str("guestId", guestID).
		Str("username", guestUsername).
		Msg("Guest session created")

	// Return response (same format as register/login for client compatibility)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Guest session created",
		"token":   token,
		"user": map[string]interface{}{
			"id":       guestID,
			"username": guestUsername,
			"isGuest":  true,
		},
	})
}
