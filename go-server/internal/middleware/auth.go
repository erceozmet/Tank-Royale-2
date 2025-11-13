package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/erceozmet/tank-royale-2/go-server/internal/auth"
)

// ContextKey is a type for context keys to avoid collisions
type ContextKey string

const (
	// UserIDKey is the context key for user ID
	UserIDKey ContextKey = "userID"
	// UsernameKey is the context key for username
	UsernameKey ContextKey = "username"
)

// AuthMiddleware verifies JWT token from Authorization header and adds user info to context
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")

		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, `{"error":"No token provided"}`, http.StatusUnauthorized)
			return
		}

		// Extract token (remove "Bearer " prefix)
		token := strings.TrimPrefix(authHeader, "Bearer ")

		// Verify token
		claims, err := auth.VerifyToken(token)
		if err != nil {
			http.Error(w, `{"error":"Invalid or expired token"}`, http.StatusUnauthorized)
			return
		}

		// Add user info to context
		ctx := r.Context()
		ctx = context.WithValue(ctx, UserIDKey, claims.UserID)
		ctx = context.WithValue(ctx, UsernameKey, claims.Username)

		// Continue with updated context
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// OptionalAuthMiddleware adds user info if token is valid, but doesn't block unauthenticated requests
func OptionalAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")

		// If token exists and is valid, add user info to context
		if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
			token := strings.TrimPrefix(authHeader, "Bearer ")

			if claims, err := auth.VerifyToken(token); err == nil {
				ctx := r.Context()
				ctx = context.WithValue(ctx, UserIDKey, claims.UserID)
				ctx = context.WithValue(ctx, UsernameKey, claims.Username)
				r = r.WithContext(ctx)
			}
			// If token is invalid, we just continue without user info
		}

		next.ServeHTTP(w, r)
	})
}

// GetUserID extracts user ID from request context
func GetUserID(r *http.Request) (string, bool) {
	userID, ok := r.Context().Value(UserIDKey).(string)
	return userID, ok
}

// GetUsername extracts username from request context
func GetUsername(r *http.Request) (string, bool) {
	username, ok := r.Context().Value(UsernameKey).(string)
	return username, ok
}

// RequireAuth is a helper that can be used inline to check authentication
func RequireAuth(w http.ResponseWriter, r *http.Request) (userID string, username string, ok bool) {
	userID, userIDOK := GetUserID(r)
	username, usernameOK := GetUsername(r)

	if !userIDOK || !usernameOK {
		http.Error(w, `{"error":"Authentication required"}`, http.StatusUnauthorized)
		return "", "", false
	}

	return userID, username, true
}
