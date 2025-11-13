package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/erceozmet/tank-royale-2/go-server/internal/auth"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func init() {
	// Set JWT secret for tests
	auth.SetJWTSecret("test-secret-key-for-middleware-tests")
}

func TestAuthMiddleware(t *testing.T) {
	t.Run("valid token", func(t *testing.T) {
		// Generate valid token
		userID := uuid.New().String()
		username := "testuser"
		token, err := auth.GenerateToken(userID, username)
		require.NoError(t, err)

		// Create request with Authorization header
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearer "+token)

		rr := httptest.NewRecorder()

		// Create a test handler that verifies context
		testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Verify user info is in context
			contextUserID, ok := GetUserID(r)
			assert.True(t, ok)
			assert.Equal(t, userID, contextUserID)

			contextUsername, ok := GetUsername(r)
			assert.True(t, ok)
			assert.Equal(t, username, contextUsername)

			w.WriteHeader(http.StatusOK)
			w.Write([]byte("success"))
		})

		// Apply middleware
		handler := AuthMiddleware(testHandler)
		handler.ServeHTTP(rr, req)

		// Verify response
		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "success", rr.Body.String())
	})

	t.Run("missing authorization header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		rr := httptest.NewRecorder()

		testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Fatal("handler should not be called")
		})

		handler := AuthMiddleware(testHandler)
		handler.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
		assert.Contains(t, rr.Body.String(), "No token provided")
	})

	t.Run("malformed authorization header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "InvalidFormat token123")
		rr := httptest.NewRecorder()

		testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Fatal("handler should not be called")
		})

		handler := AuthMiddleware(testHandler)
		handler.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
		assert.Contains(t, rr.Body.String(), "No token provided")
	})

	t.Run("invalid token", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearer invalid.token.here")
		rr := httptest.NewRecorder()

		testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Fatal("handler should not be called")
		})

		handler := AuthMiddleware(testHandler)
		handler.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
		assert.Contains(t, rr.Body.String(), "Invalid or expired token")
	})

	t.Run("empty token", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearer ")
		rr := httptest.NewRecorder()

		testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Fatal("handler should not be called")
		})

		handler := AuthMiddleware(testHandler)
		handler.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
		assert.Contains(t, rr.Body.String(), "Invalid or expired token")
	})

	t.Run("token signed with different secret", func(t *testing.T) {
		// Generate token with different secret
		originalSecret := "test-secret-key-for-middleware-tests"
		auth.SetJWTSecret("different-secret")
		userID := uuid.New().String()
		username := "testuser"
		token, err := auth.GenerateToken(userID, username)
		require.NoError(t, err)

		// Restore original secret
		auth.SetJWTSecret(originalSecret)

		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rr := httptest.NewRecorder()

		testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Fatal("handler should not be called")
		})

		handler := AuthMiddleware(testHandler)
		handler.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
		assert.Contains(t, rr.Body.String(), "Invalid or expired token")
	})
}

func TestOptionalAuthMiddleware(t *testing.T) {
	t.Run("valid token", func(t *testing.T) {
		userID := uuid.New().String()
		username := "testuser"
		token, err := auth.GenerateToken(userID, username)
		require.NoError(t, err)

		req := httptest.NewRequest(http.MethodGet, "/public", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rr := httptest.NewRecorder()

		testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Verify user info is in context
			contextUserID, ok := GetUserID(r)
			assert.True(t, ok)
			assert.Equal(t, userID, contextUserID)

			contextUsername, ok := GetUsername(r)
			assert.True(t, ok)
			assert.Equal(t, username, contextUsername)

			w.WriteHeader(http.StatusOK)
			w.Write([]byte("success with auth"))
		})

		handler := OptionalAuthMiddleware(testHandler)
		handler.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "success with auth", rr.Body.String())
	})

	t.Run("no token", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/public", nil)
		rr := httptest.NewRecorder()

		testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Verify user info is NOT in context
			_, ok := GetUserID(r)
			assert.False(t, ok)

			_, ok = GetUsername(r)
			assert.False(t, ok)

			w.WriteHeader(http.StatusOK)
			w.Write([]byte("success without auth"))
		})

		handler := OptionalAuthMiddleware(testHandler)
		handler.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "success without auth", rr.Body.String())
	})

	t.Run("invalid token", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/public", nil)
		req.Header.Set("Authorization", "Bearer invalid.token")
		rr := httptest.NewRecorder()

		testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Verify user info is NOT in context (invalid token is ignored)
			_, ok := GetUserID(r)
			assert.False(t, ok)

			_, ok = GetUsername(r)
			assert.False(t, ok)

			w.WriteHeader(http.StatusOK)
			w.Write([]byte("success without auth"))
		})

		handler := OptionalAuthMiddleware(testHandler)
		handler.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "success without auth", rr.Body.String())
	})
}

func TestGetUserID(t *testing.T) {
	t.Run("user ID exists in context", func(t *testing.T) {
		userID := uuid.New().String()
		token, err := auth.GenerateToken(userID, "testuser")
		require.NoError(t, err)

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rr := httptest.NewRecorder()

		testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			extractedUserID, ok := GetUserID(r)
			assert.True(t, ok)
			assert.Equal(t, userID, extractedUserID)
			w.WriteHeader(http.StatusOK)
		})

		handler := AuthMiddleware(testHandler)
		handler.ServeHTTP(rr, req)
	})

	t.Run("user ID does not exist in context", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)

		userID, ok := GetUserID(req)
		assert.False(t, ok)
		assert.Empty(t, userID)
	})
}

func TestGetUsername(t *testing.T) {
	t.Run("username exists in context", func(t *testing.T) {
		username := "testuser"
		token, err := auth.GenerateToken(uuid.New().String(), username)
		require.NoError(t, err)

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rr := httptest.NewRecorder()

		testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			extractedUsername, ok := GetUsername(r)
			assert.True(t, ok)
			assert.Equal(t, username, extractedUsername)
			w.WriteHeader(http.StatusOK)
		})

		handler := AuthMiddleware(testHandler)
		handler.ServeHTTP(rr, req)
	})

	t.Run("username does not exist in context", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)

		username, ok := GetUsername(req)
		assert.False(t, ok)
		assert.Empty(t, username)
	})
}

func TestRequireAuth(t *testing.T) {
	t.Run("authenticated request", func(t *testing.T) {
		userID := uuid.New().String()
		username := "testuser"
		token, err := auth.GenerateToken(userID, username)
		require.NoError(t, err)

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rr := httptest.NewRecorder()

		testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			extractedUserID, extractedUsername, ok := RequireAuth(w, r)
			assert.True(t, ok)
			assert.Equal(t, userID, extractedUserID)
			assert.Equal(t, username, extractedUsername)
			w.WriteHeader(http.StatusOK)
		})

		handler := AuthMiddleware(testHandler)
		handler.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
	})

	t.Run("unauthenticated request", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		rr := httptest.NewRecorder()

		userID, username, ok := RequireAuth(rr, req)
		assert.False(t, ok)
		assert.Empty(t, userID)
		assert.Empty(t, username)
		assert.Equal(t, http.StatusUnauthorized, rr.Code)
		assert.Contains(t, rr.Body.String(), "Authentication required")
	})
}

// Benchmark tests
func BenchmarkAuthMiddleware(b *testing.B) {
	userID := uuid.New().String()
	username := "testuser"
	token, _ := auth.GenerateToken(userID, username)

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handler := AuthMiddleware(testHandler)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
	}
}

func BenchmarkOptionalAuthMiddleware(b *testing.B) {
	userID := uuid.New().String()
	username := "testuser"
	token, _ := auth.GenerateToken(userID, username)

	req := httptest.NewRequest(http.MethodGet, "/public", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handler := OptionalAuthMiddleware(testHandler)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
	}
}
