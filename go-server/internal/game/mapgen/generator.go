package mapgen

import (
	"math"
	"math/rand"

	"github.com/erceozmet/tank-royale-2/go-server/internal/game/entities"
)

const (
	// Grid size for flood-fill algorithm (smaller = more precise, slower)
	GridCellSize = 50.0
)

// MapGenerator generates procedural maps with obstacles
type MapGenerator struct {
	Width      float64
	Height     float64
	Obstacles  []*entities.Obstacle
	Crates     []entities.Vector2D // Crate spawn positions
	GridWidth  int
	GridHeight int
}

// NewMapGenerator creates a new map generator
func NewMapGenerator(width, height float64) *MapGenerator {
	return &MapGenerator{
		Width:      width,
		Height:     height,
		Obstacles:  make([]*entities.Obstacle, 0),
		Crates:     make([]entities.Vector2D, 0),
		GridWidth:  int(math.Ceil(width / GridCellSize)),
		GridHeight: int(math.Ceil(height / GridCellSize)),
	}
}

// GenerateMap creates a new map with obstacles and validates connectivity
func (mg *MapGenerator) GenerateMap(obstacleDensity float64, numCrates int) error {
	// Clear existing obstacles and crates
	mg.Obstacles = make([]*entities.Obstacle, 0)
	mg.Crates = make([]entities.Vector2D, 0)

	// Calculate total area and obstacle count
	totalArea := mg.Width * mg.Height
	obstacleArea := totalArea * obstacleDensity
	avgObstacleSize := 60.0 // Average obstacle size
	avgObstacleArea := avgObstacleSize * avgObstacleSize
	targetObstacleCount := int(obstacleArea / avgObstacleArea)

	// Generate obstacles using cluster-based approach
	mg.generateObstacleClusters(targetObstacleCount)

	// Validate connectivity - ensure at least 95% of map is reachable
	if !mg.validateConnectivity(0.95) {
		// If not connected enough, reduce obstacle density and try again
		return mg.GenerateMap(obstacleDensity*0.9, numCrates)
	}

	// Generate crate spawn positions (in open areas)
	mg.generateCratePositions(numCrates)

	return nil
}

// generateObstacleClusters creates obstacles in clusters for more natural layouts
func (mg *MapGenerator) generateObstacleClusters(targetCount int) {
	clustersCount := 15 + rand.Intn(10) // 15-25 clusters
	obstaclesPerCluster := targetCount / clustersCount

	for i := 0; i < clustersCount; i++ {
		// Random cluster center
		clusterX := rand.Float64() * mg.Width
		clusterY := rand.Float64() * mg.Height
		clusterRadius := 200.0 + rand.Float64()*300.0 // 200-500 unit radius

		// Generate obstacles around cluster center
		for j := 0; j < obstaclesPerCluster; j++ {
			// Random position within cluster
			angle := rand.Float64() * 2 * math.Pi
			distance := rand.Float64() * clusterRadius
			x := clusterX + math.Cos(angle)*distance
			y := clusterY + math.Sin(angle)*distance

			// Bounds check
			if x < 50 || x > mg.Width-50 || y < 50 || y > mg.Height-50 {
				continue
			}

			position := entities.Vector2D{X: x, Y: y}

			// Check minimum distance from existing obstacles
			if !mg.isPositionValid(position, 100.0) {
				continue
			}

			// Random obstacle type and size
			obstacleType := mg.randomObstacleType()
			size := mg.randomObstacleSize(obstacleType)

			obstacle := entities.NewObstacle(
				generateObstacleID(),
				position,
				size,
				size,
				obstacleType,
			)

			mg.Obstacles = append(mg.Obstacles, obstacle)
		}
	}
}

// validateConnectivity uses flood-fill to check if most of the map is reachable
func (mg *MapGenerator) validateConnectivity(minReachablePercent float64) bool {
	// Create grid
	grid := make([][]bool, mg.GridHeight)
	for i := range grid {
		grid[i] = make([]bool, mg.GridWidth)
	}

	// Mark obstacle cells as blocked
	for _, obstacle := range mg.Obstacles {
		minX, minY, maxX, maxY := obstacle.GetBounds()

		startCellX := int(minX / GridCellSize)
		startCellY := int(minY / GridCellSize)
		endCellX := int(maxX / GridCellSize)
		endCellY := int(maxY / GridCellSize)

		for y := startCellY; y <= endCellY && y < mg.GridHeight; y++ {
			for x := startCellX; x <= endCellX && x < mg.GridWidth; x++ {
				if x >= 0 && x < mg.GridWidth && y >= 0 && y < mg.GridHeight {
					grid[y][x] = true // Mark as blocked
				}
			}
		}
	}

	// Flood fill from center
	centerX := mg.GridWidth / 2
	centerY := mg.GridHeight / 2

	reachableCells := mg.floodFill(grid, centerX, centerY)
	totalCells := mg.GridWidth * mg.GridHeight
	reachablePercent := float64(reachableCells) / float64(totalCells)

	return reachablePercent >= minReachablePercent
}

// floodFill performs flood fill algorithm and returns count of reachable cells
func (mg *MapGenerator) floodFill(grid [][]bool, startX, startY int) int {
	if startX < 0 || startX >= mg.GridWidth || startY < 0 || startY >= mg.GridHeight {
		return 0
	}
	if grid[startY][startX] {
		return 0 // Already visited or blocked
	}

	count := 0
	queue := []struct{ x, y int }{{startX, startY}}
	grid[startY][startX] = true // Mark as visited

	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]
		count++

		// Check 4 neighbors
		directions := []struct{ dx, dy int }{
			{0, -1}, // Up
			{1, 0},  // Right
			{0, 1},  // Down
			{-1, 0}, // Left
		}

		for _, dir := range directions {
			nx := current.x + dir.dx
			ny := current.y + dir.dy

			if nx >= 0 && nx < mg.GridWidth && ny >= 0 && ny < mg.GridHeight && !grid[ny][nx] {
				grid[ny][nx] = true
				queue = append(queue, struct{ x, y int }{nx, ny})
			}
		}
	}

	return count
}

// generateCratePositions creates spawn positions for crates in open areas
func (mg *MapGenerator) generateCratePositions(numCrates int) {
	attempts := 0
	maxAttempts := numCrates * 10

	for len(mg.Crates) < numCrates && attempts < maxAttempts {
		attempts++

		// Random position
		x := 100 + rand.Float64()*(mg.Width-200)
		y := 100 + rand.Float64()*(mg.Height-200)
		position := entities.Vector2D{X: x, Y: y}

		// Check if position is valid (not too close to obstacles or other crates)
		if mg.isPositionValid(position, 80.0) && mg.isCratePositionValid(position, 150.0) {
			mg.Crates = append(mg.Crates, position)
		}
	}
}

// isPositionValid checks if a position is far enough from obstacles
func (mg *MapGenerator) isPositionValid(position entities.Vector2D, minDistance float64) bool {
	for _, obstacle := range mg.Obstacles {
		if position.Distance(obstacle.Position) < minDistance {
			return false
		}
	}
	return true
}

// isCratePositionValid checks if a position is far enough from other crates
func (mg *MapGenerator) isCratePositionValid(position entities.Vector2D, minDistance float64) bool {
	for _, cratePos := range mg.Crates {
		if position.Distance(cratePos) < minDistance {
			return false
		}
	}
	return true
}

// randomObstacleType returns a random obstacle type
func (mg *MapGenerator) randomObstacleType() entities.ObstacleType {
	types := []entities.ObstacleType{
		entities.ObstacleRock,
		entities.ObstacleTree,
		entities.ObstacleBuilding,
		entities.ObstacleWall,
	}
	return types[rand.Intn(len(types))]
}

// randomObstacleSize returns a size appropriate for the obstacle type
func (mg *MapGenerator) randomObstacleSize(obstacleType entities.ObstacleType) float64 {
	switch obstacleType {
	case entities.ObstacleRock:
		return 30 + rand.Float64()*30 // 30-60
	case entities.ObstacleTree:
		return 40 + rand.Float64()*20 // 40-60
	case entities.ObstacleBuilding:
		return 80 + rand.Float64()*40 // 80-120
	case entities.ObstacleWall:
		return 20 + rand.Float64()*10 // 20-30 (usually longer in one dimension)
	default:
		return 50
	}
}

// GetObstacles returns all generated obstacles
func (mg *MapGenerator) GetObstacles() []*entities.Obstacle {
	return mg.Obstacles
}

// GetCratePositions returns all crate spawn positions
func (mg *MapGenerator) GetCratePositions() []entities.Vector2D {
	return mg.Crates
}

// generateObstacleID generates a unique obstacle ID
func generateObstacleID() string {
	return "obstacle_" + randomString(8)
}

func randomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	result := make([]byte, length)
	for i := range result {
		result[i] = charset[rand.Intn(len(charset))]
	}
	return string(result)
}
