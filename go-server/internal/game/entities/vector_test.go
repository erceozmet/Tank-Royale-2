package entities

import (
	"math"
	"testing"
)

func TestVector2D_Add(t *testing.T) {
	tests := []struct {
		name     string
		v1       Vector2D
		v2       Vector2D
		expected Vector2D
	}{
		{
			name:     "positive values",
			v1:       Vector2D{X: 10, Y: 20},
			v2:       Vector2D{X: 5, Y: 15},
			expected: Vector2D{X: 15, Y: 35},
		},
		{
			name:     "negative values",
			v1:       Vector2D{X: -10, Y: -20},
			v2:       Vector2D{X: -5, Y: -15},
			expected: Vector2D{X: -15, Y: -35},
		},
		{
			name:     "mixed values",
			v1:       Vector2D{X: 10, Y: -20},
			v2:       Vector2D{X: -5, Y: 15},
			expected: Vector2D{X: 5, Y: -5},
		},
		{
			name:     "zero vectors",
			v1:       Vector2D{X: 0, Y: 0},
			v2:       Vector2D{X: 0, Y: 0},
			expected: Vector2D{X: 0, Y: 0},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.v1.Add(tt.v2)
			if result.X != tt.expected.X || result.Y != tt.expected.Y {
				t.Errorf("Add() = {%v, %v}, want {%v, %v}", result.X, result.Y, tt.expected.X, tt.expected.Y)
			}
		})
	}
}

func TestVector2D_Subtract(t *testing.T) {
	tests := []struct {
		name     string
		v1       Vector2D
		v2       Vector2D
		expected Vector2D
	}{
		{
			name:     "positive values",
			v1:       Vector2D{X: 10, Y: 20},
			v2:       Vector2D{X: 5, Y: 15},
			expected: Vector2D{X: 5, Y: 5},
		},
		{
			name:     "result in negative",
			v1:       Vector2D{X: 5, Y: 10},
			v2:       Vector2D{X: 10, Y: 20},
			expected: Vector2D{X: -5, Y: -10},
		},
		{
			name:     "zero vector",
			v1:       Vector2D{X: 10, Y: 20},
			v2:       Vector2D{X: 10, Y: 20},
			expected: Vector2D{X: 0, Y: 0},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.v1.Subtract(tt.v2)
			if result.X != tt.expected.X || result.Y != tt.expected.Y {
				t.Errorf("Subtract() = {%v, %v}, want {%v, %v}", result.X, result.Y, tt.expected.X, tt.expected.Y)
			}
		})
	}
}

func TestVector2D_Multiply(t *testing.T) {
	tests := []struct {
		name     string
		v        Vector2D
		scalar   float64
		expected Vector2D
	}{
		{
			name:     "multiply by 2",
			v:        Vector2D{X: 10, Y: 20},
			scalar:   2,
			expected: Vector2D{X: 20, Y: 40},
		},
		{
			name:     "multiply by 0.5",
			v:        Vector2D{X: 10, Y: 20},
			scalar:   0.5,
			expected: Vector2D{X: 5, Y: 10},
		},
		{
			name:     "multiply by 0",
			v:        Vector2D{X: 10, Y: 20},
			scalar:   0,
			expected: Vector2D{X: 0, Y: 0},
		},
		{
			name:     "multiply by negative",
			v:        Vector2D{X: 10, Y: 20},
			scalar:   -1,
			expected: Vector2D{X: -10, Y: -20},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.v.Multiply(tt.scalar)
			if result.X != tt.expected.X || result.Y != tt.expected.Y {
				t.Errorf("Multiply() = {%v, %v}, want {%v, %v}", result.X, result.Y, tt.expected.X, tt.expected.Y)
			}
		})
	}
}

func TestVector2D_Magnitude(t *testing.T) {
	tests := []struct {
		name     string
		v        Vector2D
		expected float64
	}{
		{
			name:     "3-4-5 triangle",
			v:        Vector2D{X: 3, Y: 4},
			expected: 5,
		},
		{
			name:     "zero vector",
			v:        Vector2D{X: 0, Y: 0},
			expected: 0,
		},
		{
			name:     "unit vector",
			v:        Vector2D{X: 1, Y: 0},
			expected: 1,
		},
		{
			name:     "negative values",
			v:        Vector2D{X: -3, Y: -4},
			expected: 5,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.v.Magnitude()
			if math.Abs(result-tt.expected) > 0.0001 {
				t.Errorf("Magnitude() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestVector2D_Normalize(t *testing.T) {
	tests := []struct {
		name     string
		v        Vector2D
		expected Vector2D
	}{
		{
			name:     "horizontal vector",
			v:        Vector2D{X: 10, Y: 0},
			expected: Vector2D{X: 1, Y: 0},
		},
		{
			name:     "vertical vector",
			v:        Vector2D{X: 0, Y: 10},
			expected: Vector2D{X: 0, Y: 1},
		},
		{
			name:     "zero vector",
			v:        Vector2D{X: 0, Y: 0},
			expected: Vector2D{X: 0, Y: 0},
		},
		{
			name:     "diagonal vector",
			v:        Vector2D{X: 3, Y: 4},
			expected: Vector2D{X: 0.6, Y: 0.8},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.v.Normalize()
			if math.Abs(result.X-tt.expected.X) > 0.0001 || math.Abs(result.Y-tt.expected.Y) > 0.0001 {
				t.Errorf("Normalize() = {%v, %v}, want {%v, %v}", result.X, result.Y, tt.expected.X, tt.expected.Y)
			}
			// Verify magnitude is 1 (unless zero vector)
			if tt.v.Magnitude() > 0 {
				mag := result.Magnitude()
				if math.Abs(mag-1.0) > 0.0001 {
					t.Errorf("Normalized vector magnitude = %v, want 1.0", mag)
				}
			}
		})
	}
}

func TestVector2D_Distance(t *testing.T) {
	tests := []struct {
		name     string
		v1       Vector2D
		v2       Vector2D
		expected float64
	}{
		{
			name:     "horizontal distance",
			v1:       Vector2D{X: 0, Y: 0},
			v2:       Vector2D{X: 10, Y: 0},
			expected: 10,
		},
		{
			name:     "vertical distance",
			v1:       Vector2D{X: 0, Y: 0},
			v2:       Vector2D{X: 0, Y: 10},
			expected: 10,
		},
		{
			name:     "3-4-5 triangle",
			v1:       Vector2D{X: 0, Y: 0},
			v2:       Vector2D{X: 3, Y: 4},
			expected: 5,
		},
		{
			name:     "same point",
			v1:       Vector2D{X: 5, Y: 5},
			v2:       Vector2D{X: 5, Y: 5},
			expected: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.v1.Distance(tt.v2)
			if math.Abs(result-tt.expected) > 0.0001 {
				t.Errorf("Distance() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestVector2D_Dot(t *testing.T) {
	tests := []struct {
		name     string
		v1       Vector2D
		v2       Vector2D
		expected float64
	}{
		{
			name:     "orthogonal vectors",
			v1:       Vector2D{X: 1, Y: 0},
			v2:       Vector2D{X: 0, Y: 1},
			expected: 0,
		},
		{
			name:     "parallel vectors",
			v1:       Vector2D{X: 2, Y: 0},
			v2:       Vector2D{X: 3, Y: 0},
			expected: 6,
		},
		{
			name:     "general case",
			v1:       Vector2D{X: 1, Y: 2},
			v2:       Vector2D{X: 3, Y: 4},
			expected: 11, // 1*3 + 2*4
		},
		{
			name:     "zero vector",
			v1:       Vector2D{X: 5, Y: 5},
			v2:       Vector2D{X: 0, Y: 0},
			expected: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.v1.Dot(tt.v2)
			if math.Abs(result-tt.expected) > 0.0001 {
				t.Errorf("Dot() = %v, want %v", result, tt.expected)
			}
		})
	}
}
