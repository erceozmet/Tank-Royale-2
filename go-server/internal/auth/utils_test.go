package auth

import (
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestHashPassword(t *testing.T) {
	tests := []struct {
		name        string
		password    string
		expectError bool
	}{
		{
			name:        "valid password",
			password:    "MyPassword123",
			expectError: false,
		},
		{
			name:        "short password",
			password:    "Pass1",
			expectError: false,
		},
		{
			name:        "long password (within bcrypt limit)",
			password:    strings.Repeat("a", 70),
			expectError: false,
		},
		{
			name:        "password exceeds bcrypt limit",
			password:    strings.Repeat("a", 100),
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hash, err := HashPassword(tt.password)

			if tt.expectError {
				if err == nil {
					t.Error("HashPassword() should return error for password exceeding bcrypt limit")
				}
				return
			}

			if err != nil {
				t.Fatalf("HashPassword() error = %v", err)
			}

			if hash == "" {
				t.Error("HashPassword() returned empty string")
			}

			if hash == tt.password {
				t.Error("HashPassword() returned password unchanged")
			}

			if len(hash) == 0 {
				t.Error("HashPassword() returned zero length hash")
			}
		})
	}
}

func TestHashPasswordDifferentHashes(t *testing.T) {
	password := "MyPassword123"
	hash1, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword() error = %v", err)
	}

	hash2, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword() error = %v", err)
	}

	if hash1 == hash2 {
		t.Error("HashPassword() should generate different hashes for same password (due to salt)")
	}
}

func TestComparePassword(t *testing.T) {
	tests := []struct {
		name     string
		password string
		wantErr  bool
	}{
		{
			name:     "matching password",
			password: "MyPassword123",
			wantErr:  false,
		},
		{
			name:     "empty password",
			password: "",
			wantErr:  false,
		},
		{
			name:     "special characters",
			password: "P@ssw0rd!#$%",
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hash, err := HashPassword(tt.password)
			if err != nil {
				t.Fatalf("HashPassword() error = %v", err)
			}

			if !ComparePassword(tt.password, hash) {
				t.Error("ComparePassword() should return true for matching password")
			}

			if ComparePassword(tt.password+"wrong", hash) {
				t.Error("ComparePassword() should return false for non-matching password")
			}

			if ComparePassword("", hash) && tt.password != "" {
				t.Error("ComparePassword() should return false for empty password when hash is not empty")
			}
		})
	}
}

func TestGenerateToken(t *testing.T) {
	tests := []struct {
		name     string
		userID   string
		username string
	}{
		{
			name:     "valid token",
			userID:   "user-123",
			username: "testuser",
		},
		{
			name:     "empty username",
			userID:   "user-456",
			username: "",
		},
		{
			name:     "special characters in username",
			userID:   "user-789",
			username: "test_user-123",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			token, err := GenerateToken(tt.userID, tt.username)
			if err != nil {
				t.Fatalf("GenerateToken() error = %v", err)
			}

			if token == "" {
				t.Error("GenerateToken() returned empty token")
			}

			// JWT should have 3 parts separated by dots
			parts := strings.Split(token, ".")
			if len(parts) != 3 {
				t.Errorf("GenerateToken() returned invalid JWT format, got %d parts, want 3", len(parts))
			}
		})
	}
}

func TestGenerateTokenDifferentUsers(t *testing.T) {
	token1, err := GenerateToken("user-1", "user1")
	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}

	token2, err := GenerateToken("user-2", "user2")
	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}

	if token1 == token2 {
		t.Error("GenerateToken() should generate different tokens for different users")
	}
}

func TestVerifyToken(t *testing.T) {
	tests := []struct {
		name      string
		userID    string
		username  string
		wantError bool
	}{
		{
			name:      "valid token",
			userID:    "user-123",
			username:  "testuser",
			wantError: false,
		},
		{
			name:      "empty username",
			userID:    "user-456",
			username:  "",
			wantError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			token, err := GenerateToken(tt.userID, tt.username)
			if err != nil {
				t.Fatalf("GenerateToken() error = %v", err)
			}

			claims, err := VerifyToken(token)
			if (err != nil) != tt.wantError {
				t.Errorf("VerifyToken() error = %v, wantError %v", err, tt.wantError)
				return
			}

			if !tt.wantError {
				if claims.UserID != tt.userID {
					t.Errorf("VerifyToken() UserID = %v, want %v", claims.UserID, tt.userID)
				}
				if claims.Username != tt.username {
					t.Errorf("VerifyToken() Username = %v, want %v", claims.Username, tt.username)
				}
			}
		})
	}
}

func TestVerifyTokenInvalid(t *testing.T) {
	tests := []struct {
		name  string
		token string
	}{
		{
			name:  "invalid token",
			token: "invalid.token.here",
		},
		{
			name:  "malformed token",
			token: "not-a-jwt-token",
		},
		{
			name:  "empty token",
			token: "",
		},
		{
			name:  "random string",
			token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := VerifyToken(tt.token)
			if err == nil {
				t.Error("VerifyToken() should return error for invalid token")
			}
			if !strings.Contains(err.Error(), "invalid or expired token") {
				t.Errorf("VerifyToken() error message = %v, want 'invalid or expired token'", err.Error())
			}
		})
	}
}

func TestVerifyTokenExpired(t *testing.T) {
	// Create a token that's already expired
	claims := JWTClaims{
		UserID:   "user-123",
		Username: "testuser",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-1 * time.Hour)), // Expired 1 hour ago
			IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
			NotBefore: jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		t.Fatalf("Failed to create test token: %v", err)
	}

	_, err = VerifyToken(tokenString)
	if err == nil {
		t.Error("VerifyToken() should return error for expired token")
	}
}

func TestSetJWTSecret(t *testing.T) {
	originalSecret := jwtSecret
	defer func() {
		jwtSecret = originalSecret // Restore original secret
	}()

	newSecret := "new-test-secret-key"
	SetJWTSecret(newSecret)

	if string(jwtSecret) != newSecret {
		t.Errorf("SetJWTSecret() = %v, want %v", string(jwtSecret), newSecret)
	}

	// Verify tokens work with new secret
	token, err := GenerateToken("test-user", "testuser")
	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}

	claims, err := VerifyToken(token)
	if err != nil {
		t.Fatalf("VerifyToken() error = %v", err)
	}

	if claims.UserID != "test-user" {
		t.Errorf("Token with new secret: UserID = %v, want test-user", claims.UserID)
	}
}

func TestIsValidEmail(t *testing.T) {
	tests := []struct {
		name  string
		email string
		want  bool
	}{
		// Valid emails
		{name: "standard email", email: "user@example.com", want: true},
		{name: "email with dot", email: "test.user@example.com", want: true},
		{name: "email with plus", email: "user+tag@example.co.uk", want: true},
		{name: "email with numbers", email: "user123@test-domain.com", want: true},
		{name: "short email", email: "a@b.co", want: true},
		{name: "subdomain", email: "user@mail.example.com", want: true},

		// Invalid emails
		{name: "no @", email: "invalid", want: false},
		{name: "no domain", email: "invalid@", want: false},
		{name: "no user", email: "@example.com", want: false},
		{name: "no TLD", email: "user@example", want: false},
		{name: "space in email", email: "user @example.com", want: false},
		{name: "space in domain", email: "user@exam ple.com", want: false},
		{name: "empty string", email: "", want: false},
		{name: "dot at start of domain", email: "user@.com", want: false},
		{name: "too long", email: strings.Repeat("a", 256) + "@example.com", want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsValidEmail(tt.email); got != tt.want {
				t.Errorf("IsValidEmail(%q) = %v, want %v", tt.email, got, tt.want)
			}
		})
	}
}

func TestIsValidUsername(t *testing.T) {
	tests := []struct {
		name     string
		username string
		want     bool
	}{
		// Valid usernames
		{name: "alphanumeric", username: "user123", want: true},
		{name: "with underscore", username: "test_user", want: true},
		{name: "mixed case", username: "Player_123", want: true},
		{name: "minimum length", username: "abc", want: true},
		{name: "maximum length", username: strings.Repeat("a", 50), want: true},
		{name: "all uppercase", username: "TESTUSER", want: true},
		{name: "all numbers", username: "123456", want: true},

		// Invalid usernames
		{name: "too short", username: "ab", want: false},
		{name: "too long", username: strings.Repeat("a", 51), want: false},
		{name: "with dash", username: "user-name", want: false},
		{name: "with dot", username: "user.name", want: false},
		{name: "with space", username: "user name", want: false},
		{name: "with @", username: "user@name", want: false},
		{name: "with #", username: "user#123", want: false},
		{name: "empty", username: "", want: false},
		{name: "special chars", username: "user!@#", want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsValidUsername(tt.username); got != tt.want {
				t.Errorf("IsValidUsername(%q) = %v, want %v", tt.username, got, tt.want)
			}
		})
	}
}

func TestIsValidPassword(t *testing.T) {
	tests := []struct {
		name     string
		password string
		want     bool
	}{
		// Valid passwords
		{name: "standard password", password: "Password123", want: true},
		{name: "with special chars", password: "MyP@ssw0rd", want: true},
		{name: "minimum valid", password: "Abcd1234", want: true},
		{name: "long password", password: "ThisIsAVeryLongPassword123", want: true},
		{name: "multiple special", password: "P@ss!w0rd#123", want: true},

		// Invalid passwords - missing uppercase
		{name: "no uppercase", password: "password123", want: false},
		{name: "all lowercase with number", password: "test1234", want: false},

		// Invalid passwords - missing lowercase
		{name: "no lowercase", password: "PASSWORD123", want: false},
		{name: "all uppercase with number", password: "TEST1234", want: false},

		// Invalid passwords - missing number
		{name: "no number", password: "Password", want: false},
		{name: "only letters", password: "TestPass", want: false},

		// Invalid passwords - too short
		{name: "too short", password: "Pass1", want: false},
		{name: "very short", password: "Ab1", want: false},
		{name: "empty", password: "", want: false},

		// Edge cases
		{name: "exactly 8 chars", password: "Pass1234", want: true},
		{name: "7 chars valid format", password: "Pass123", want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsValidPassword(tt.password); got != tt.want {
				t.Errorf("IsValidPassword(%q) = %v, want %v", tt.password, got, tt.want)
			}
		})
	}
}

func TestTokenPayload(t *testing.T) {
	userID := "test-user-id-123"
	username := "testuser"

	token, err := GenerateToken(userID, username)
	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}

	// Decode without verification to check payload
	parser := jwt.NewParser()
	decoded, _, err := parser.ParseUnverified(token, &JWTClaims{})
	if err != nil {
		t.Fatalf("ParseUnverified() error = %v", err)
	}

	claims, ok := decoded.Claims.(*JWTClaims)
	if !ok {
		t.Fatal("Failed to cast claims to JWTClaims")
	}

	if claims.UserID != userID {
		t.Errorf("Token payload UserID = %v, want %v", claims.UserID, userID)
	}

	if claims.Username != username {
		t.Errorf("Token payload Username = %v, want %v", claims.Username, username)
	}

	if claims.ExpiresAt == nil {
		t.Error("Token should have ExpiresAt")
	}

	if claims.IssuedAt == nil {
		t.Error("Token should have IssuedAt")
	}
}

func BenchmarkHashPassword(b *testing.B) {
	password := "BenchmarkPassword123"
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = HashPassword(password)
	}
}

func BenchmarkComparePassword(b *testing.B) {
	password := "BenchmarkPassword123"
	hash, _ := HashPassword(password)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = ComparePassword(password, hash)
	}
}

func BenchmarkGenerateToken(b *testing.B) {
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = GenerateToken("user-123", "testuser")
	}
}

func BenchmarkVerifyToken(b *testing.B) {
	token, _ := GenerateToken("user-123", "testuser")
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = VerifyToken(token)
	}
}
