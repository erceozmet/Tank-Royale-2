package auth

import (
	"errors"
	"fmt"
	"regexp"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var (
	// JWT secret key (should be loaded from config in production)
	jwtSecret = []byte("your-secret-key-change-in-production")

	// Email validation regex
	emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

	// Username validation regex (3-50 alphanumeric characters or underscores)
	usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_]{3,50}$`)

	// Password validation regex (at least 1 uppercase, 1 lowercase, 1 number)
	passwordRegex = regexp.MustCompile(`^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$`)
)

// JWTClaims represents the JWT token claims
type JWTClaims struct {
	UserID   string `json:"userId"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// HashPassword hashes a plain text password using bcrypt
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}
	return string(bytes), nil
}

// ComparePassword compares a plain text password with a hashed password
func ComparePassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// GenerateToken generates a JWT token for a user
func GenerateToken(userID, username string) (string, error) {
	claims := JWTClaims{
		UserID:   userID,
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}

// VerifyToken verifies and parses a JWT token
func VerifyToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate the signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return jwtSecret, nil
	})

	if err != nil {
		return nil, errors.New("invalid or expired token")
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid or expired token")
	}

	return claims, nil
}

// SetJWTSecret sets the JWT secret key (should be called once during initialization)
func SetJWTSecret(secret string) {
	jwtSecret = []byte(secret)
}

// IsValidEmail validates an email address
func IsValidEmail(email string) bool {
	if len(email) == 0 || len(email) > 254 {
		return false
	}
	return emailRegex.MatchString(email)
}

// IsValidUsername validates a username
func IsValidUsername(username string) bool {
	return usernameRegex.MatchString(username)
}

// IsValidPassword validates a password
// Must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number
func IsValidPassword(password string) bool {
	return passwordRegex.MatchString(password)
}
