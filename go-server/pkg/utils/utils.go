package utils

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"math"
	"time"
)

// GenerateID generates a random hexadecimal ID
func GenerateID(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// Clamp constrains a value between min and max
func Clamp(value, min, max float64) float64 {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

// Distance calculates the Euclidean distance between two points
func Distance(x1, y1, x2, y2 float64) float64 {
	dx := x2 - x1
	dy := y2 - y1
	return math.Sqrt(dx*dx + dy*dy)
}

// Lerp performs linear interpolation between two values
func Lerp(start, end, t float64) float64 {
	return start + (end-start)*t
}

// Min returns the minimum of two float64 values
func Min(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

// Max returns the maximum of two float64 values
func Max(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}

// MinInt returns the minimum of two int values
func MinInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// MaxInt returns the maximum of two int values
func MaxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// TimeNowUnix returns current Unix timestamp in seconds
func TimeNowUnix() int64 {
	return time.Now().Unix()
}

// TimeNowMillis returns current Unix timestamp in milliseconds
func TimeNowMillis() int64 {
	return time.Now().UnixMilli()
}

// FormatDuration formats a duration into a human-readable string
func FormatDuration(d time.Duration) string {
	if d < time.Second {
		return fmt.Sprintf("%dms", d.Milliseconds())
	}
	if d < time.Minute {
		return fmt.Sprintf("%.1fs", d.Seconds())
	}
	if d < time.Hour {
		return fmt.Sprintf("%.1fm", d.Minutes())
	}
	return fmt.Sprintf("%.1fh", d.Hours())
}

// Ptr returns a pointer to the given value (useful for inline pointer creation)
func Ptr[T any](v T) *T {
	return &v
}

// DerefOr returns the dereferenced pointer or a default value if nil
func DerefOr[T any](ptr *T, defaultVal T) T {
	if ptr == nil {
		return defaultVal
	}
	return *ptr
}
