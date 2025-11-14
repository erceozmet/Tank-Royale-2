package loot

import (
	"fmt"
	"math/rand"

	"github.com/erceozmet/tank-royale-2/go-server/internal/game/entities"
)

// CrateManager manages crates and their contained loot
type CrateManager struct {
	Crates map[string]*entities.Crate // crate ID -> crate
	Loot   map[string]*entities.Loot  // loot ID -> loot
}

// NewCrateManager creates a new crate manager
func NewCrateManager() *CrateManager {
	return &CrateManager{
		Crates: make(map[string]*entities.Crate),
		Loot:   make(map[string]*entities.Loot),
	}
}

// SpawnCrate creates a new crate with random loot at the specified position
func (cm *CrateManager) SpawnCrate(position entities.Vector2D) string {
	crateID := fmt.Sprintf("crate_%d", rand.Int63())
	lootID := fmt.Sprintf("loot_%d", rand.Int63())

	// Generate random loot
	lootType := GenerateRandomLoot()
	loot := entities.NewLoot(lootID, lootType, position)

	// Create crate
	crate := entities.NewCrate(crateID, position, lootID)

	cm.Crates[crateID] = crate
	cm.Loot[lootID] = loot

	return crateID
}

// OpenCrate opens a crate and returns the loot inside
func (cm *CrateManager) OpenCrate(crateID string) (*entities.Loot, bool) {
	crate, exists := cm.Crates[crateID]
	if !exists || crate.IsOpened {
		return nil, false
	}

	// Mark crate as opened
	crate.IsOpened = true

	// Get the loot
	loot, lootExists := cm.Loot[crate.LootID]
	if !lootExists {
		return nil, false
	}

	return loot, true
}

// CollectLoot removes loot from the manager (after it's been picked up)
func (cm *CrateManager) CollectLoot(lootID string) bool {
	if _, exists := cm.Loot[lootID]; !exists {
		return false
	}

	delete(cm.Loot, lootID)
	return true
}

// RemoveCrate removes a crate and its associated loot
func (cm *CrateManager) RemoveCrate(crateID string) bool {
	crate, exists := cm.Crates[crateID]
	if !exists {
		return false
	}

	// Remove associated loot
	delete(cm.Loot, crate.LootID)
	delete(cm.Crates, crateID)

	return true
}

// GetCratesInRange returns all unopened crates within a certain radius
func (cm *CrateManager) GetCratesInRange(position entities.Vector2D, radius float64) []*entities.Crate {
	var nearCrates []*entities.Crate

	for _, crate := range cm.Crates {
		if !crate.IsOpened && position.Distance(crate.Position) <= radius {
			nearCrates = append(nearCrates, crate)
		}
	}

	return nearCrates
}

// GetAllCrates returns all crates
func (cm *CrateManager) GetAllCrates() []*entities.Crate {
	crates := make([]*entities.Crate, 0, len(cm.Crates))
	for _, crate := range cm.Crates {
		crates = append(crates, crate)
	}
	return crates
}

// GetAllLoot returns all loot items
func (cm *CrateManager) GetAllLoot() []*entities.Loot {
	loot := make([]*entities.Loot, 0, len(cm.Loot))
	for _, l := range cm.Loot {
		loot = append(loot, l)
	}
	return loot
}
