package entities

// ObstacleType represents different types of obstacles
type ObstacleType string

const (
	ObstacleRock     ObstacleType = "rock"
	ObstacleTree     ObstacleType = "tree"
	ObstacleBuilding ObstacleType = "building"
	ObstacleWall     ObstacleType = "wall"
	ObstacleCrate    ObstacleType = "crate"
)

// Obstacle represents a static obstacle on the map
type Obstacle struct {
	ID       string       `json:"id"`
	Position Vector2D     `json:"position"` // Center position
	Width    float64      `json:"width"`
	Height   float64      `json:"height"`
	Type     ObstacleType `json:"type"`
	Health   int          `json:"health"`       // For destructible obstacles
	IsStatic bool         `json:"isStatic"`     // If true, cannot be destroyed
	Rotation float64      `json:"rotation"`     // Rotation in radians
}

// NewObstacle creates a new obstacle
func NewObstacle(id string, position Vector2D, width, height float64, obstacleType ObstacleType) *Obstacle {
	health := 0
	isStatic := true

	// Set health and destructibility based on type
	switch obstacleType {
	case ObstacleCrate:
		health = 50
		isStatic = false
	case ObstacleWall:
		health = 200
		isStatic = false
	case ObstacleBuilding:
		health = 500
		isStatic = false
	default:
		// Rocks and trees are static
		isStatic = true
	}

	return &Obstacle{
		ID:       id,
		Position: position,
		Width:    width,
		Height:   height,
		Type:     obstacleType,
		Health:   health,
		IsStatic: isStatic,
		Rotation: 0,
	}
}

// TakeDamage applies damage to a destructible obstacle
func (o *Obstacle) TakeDamage(damage int) bool {
	if o.IsStatic {
		return false
	}

	o.Health -= damage
	return o.Health <= 0 // Returns true if destroyed
}

// GetBounds returns the bounding box of the obstacle
func (o *Obstacle) GetBounds() (minX, minY, maxX, maxY float64) {
	halfWidth := o.Width / 2
	halfHeight := o.Height / 2

	minX = o.Position.X - halfWidth
	minY = o.Position.Y - halfHeight
	maxX = o.Position.X + halfWidth
	maxY = o.Position.Y + halfHeight

	return
}

// ContainsPoint checks if a point is inside the obstacle
func (o *Obstacle) ContainsPoint(point Vector2D) bool {
	minX, minY, maxX, maxY := o.GetBounds()
	return point.X >= minX && point.X <= maxX && point.Y >= minY && point.Y <= maxY
}
