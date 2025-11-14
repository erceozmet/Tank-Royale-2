package entities

import "math"

// Vector2D represents a 2D position or velocity
type Vector2D struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// Add returns the sum of two vectors
func (v Vector2D) Add(other Vector2D) Vector2D {
	return Vector2D{X: v.X + other.X, Y: v.Y + other.Y}
}

// Subtract returns the difference of two vectors
func (v Vector2D) Subtract(other Vector2D) Vector2D {
	return Vector2D{X: v.X - other.X, Y: v.Y - other.Y}
}

// Multiply returns the vector scaled by a scalar
func (v Vector2D) Multiply(scalar float64) Vector2D {
	return Vector2D{X: v.X * scalar, Y: v.Y * scalar}
}

// Magnitude returns the length of the vector
func (v Vector2D) Magnitude() float64 {
	return math.Sqrt(v.X*v.X + v.Y*v.Y)
}

// Normalize returns a unit vector in the same direction
func (v Vector2D) Normalize() Vector2D {
	mag := v.Magnitude()
	if mag == 0 {
		return Vector2D{X: 0, Y: 0}
	}
	return Vector2D{X: v.X / mag, Y: v.Y / mag}
}

// Distance returns the distance between two points
func (v Vector2D) Distance(other Vector2D) float64 {
	return v.Subtract(other).Magnitude()
}

// Dot returns the dot product of two vectors
func (v Vector2D) Dot(other Vector2D) float64 {
	return v.X*other.X + v.Y*other.Y
}
