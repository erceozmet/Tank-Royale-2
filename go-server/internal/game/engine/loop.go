package engine

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/erceozmet/tank-royale-2/go-server/internal/game"
	"github.com/erceozmet/tank-royale-2/go-server/internal/game/combat"
	"github.com/erceozmet/tank-royale-2/go-server/internal/game/entities"
	"github.com/erceozmet/tank-royale-2/go-server/internal/game/loot"
)

// GameLoop manages the game loop for a match
type GameLoop struct {
	state             *GameState
	projectileManager *combat.ProjectileManager
	crateManager      *loot.CrateManager
	physics           *combat.Physics

	inputQueue    chan PlayerInput
	broadcastChan chan GameStateUpdate

	matchStartTime time.Time
	tickStartTime  time.Time

	mu      sync.RWMutex
	running bool
	ctx     context.Context
	cancel  context.CancelFunc
}

// PlayerInput represents input from a player
type PlayerInput struct {
	UserID    string
	Tick      int64
	Input     combat.PlayerInput
	Timestamp time.Time
}

// GameStateUpdate represents a state update to broadcast
type GameStateUpdate struct {
	Tick        int64                       `json:"tick"`
	Players     map[string]*entities.Player `json:"players"`
	Projectiles []*entities.Projectile      `json:"projectiles"`
	Loot        []*entities.Loot            `json:"loot"`
	Crates      []*entities.Crate           `json:"crates"`
	SafeZone    interface{}                 `json:"safeZone"`
	Phase       GamePhase                   `json:"phase"`
	Rankings    []PlayerRanking             `json:"rankings"`
}

// NewGameLoop creates a new game loop
func NewGameLoop(matchID string) *GameLoop {
	ctx, cancel := context.WithCancel(context.Background())

	return &GameLoop{
		state:             NewGameState(matchID),
		projectileManager: combat.NewProjectileManager(),
		crateManager:      loot.NewCrateManager(),
		physics:           combat.NewPhysics(),
		inputQueue:        make(chan PlayerInput, 1000),
		broadcastChan:     make(chan GameStateUpdate, 100),
		ctx:               ctx,
		cancel:            cancel,
		running:           false,
	}
}

// Start starts the game loop
func (gl *GameLoop) Start() error {
	gl.mu.Lock()
	if gl.running {
		gl.mu.Unlock()
		return fmt.Errorf("game loop already running")
	}
	gl.running = true
	gl.matchStartTime = time.Now()
	gl.tickStartTime = time.Now()
	gl.state.Phase = PhasePlaying
	gl.mu.Unlock()

	// Start the game loop in a goroutine
	go gl.run()

	return nil
}

// Stop stops the game loop
func (gl *GameLoop) Stop() {
	gl.mu.Lock()
	defer gl.mu.Unlock()

	if !gl.running {
		return
	}

	gl.running = false
	gl.cancel()
	close(gl.inputQueue)
}

// run is the main game loop
func (gl *GameLoop) run() {
	ticker := time.NewTicker(game.TickInterval)
	defer ticker.Stop()

	for {
		select {
		case <-gl.ctx.Done():
			return
		case <-ticker.C:
			gl.tick()
		}
	}
}

// tick processes one game tick
func (gl *GameLoop) tick() {
	gl.mu.Lock()
	defer gl.mu.Unlock()

	startTime := time.Now()
	gl.state.Tick++

	// 1. Process player inputs
	gl.processInputs()

	// 2. Update physics (movement)
	gl.updatePhysics()

	// 3. Update projectiles
	gl.projectileManager.Update()

	// 4. Check collisions
	gl.checkCollisions()

	// 5. Update safe zone
	gl.state.SafeZone.Update(gl.matchStartTime, time.Now())
	gl.applySafeZoneDamage()

	// 6. Check win condition
	gl.checkWinCondition()

	// 7. Broadcast state update
	gl.broadcastState()

	// Track tick duration for performance monitoring
	tickDuration := time.Since(startTime)
	if tickDuration > game.TickInterval {
		fmt.Printf("Warning: Tick %d took %v (target: %v)\n",
			gl.state.Tick, tickDuration, game.TickInterval)
	}
}

// processInputs processes all queued player inputs
func (gl *GameLoop) processInputs() {
	for {
		select {
		case input := <-gl.inputQueue:
			player, exists := gl.state.Players[input.UserID]
			if !exists || !player.IsAlive {
				continue
			}

			// Handle fire input
			if input.Input.Fire {
				projectile, err := gl.projectileManager.FireWeapon(player)
				if err == nil && projectile != nil {
					player.LastFireTime = time.Now()
				}
			}

			// Handle interact input (crate opening)
			if input.Input.Interact {
				gl.handleCrateInteraction(player)
			}

			// Movement will be handled in updatePhysics

		default:
			return // No more inputs
		}
	}
}

// updatePhysics updates player movement and physics
func (gl *GameLoop) updatePhysics() {
	// Get pending inputs for each player
	playerInputs := make(map[string]combat.PlayerInput)

	// Process movement for each player
	for userID, player := range gl.state.Players {
		if !player.IsAlive {
			continue
		}

		// Get input for this player (if any)
		input, exists := playerInputs[userID]
		if !exists {
			input = combat.PlayerInput{} // Empty input = no movement
		}

		// Update player movement
		gl.physics.UpdatePlayerMovement(player, input, gl.state.Obstacles)
	}

	// Check player-to-player collisions
	gl.physics.CheckPlayerCollisions(gl.state.Players)
}

// checkCollisions checks for projectile collisions
func (gl *GameLoop) checkCollisions() {
	events := gl.projectileManager.CheckProjectileCollisions(gl.state.Players, gl.state.Obstacles)

	for _, event := range events {
		if event.Type == combat.CollisionTypePlayerHit {
			// Update killer's stats
			if shooter, exists := gl.state.Players[event.ShooterID]; exists {
				if event.PlayerDied {
					shooter.Kills++
					gl.state.UpdatePlayerRanking(event.ShooterID, shooter.Kills, 0, shooter.IsAlive)
				}
			}

			// Update victim's stats
			if victim, exists := gl.state.Players[event.TargetID]; exists {
				gl.state.UpdatePlayerRanking(event.TargetID, victim.Kills, 0, victim.IsAlive)
			}
		}

		if event.Type == combat.CollisionTypeObstacleHit && event.ObstacleDestroyed {
			// Remove destroyed obstacle
			for i, obstacle := range gl.state.Obstacles {
				if obstacle.ID == event.TargetID {
					gl.state.Obstacles = append(gl.state.Obstacles[:i], gl.state.Obstacles[i+1:]...)
					break
				}
			}
		}
	}
}

// applySafeZoneDamage applies damage to players outside safe zone
func (gl *GameLoop) applySafeZoneDamage() {
	for _, player := range gl.state.Players {
		if !player.IsAlive {
			continue
		}

		died := gl.state.SafeZone.ApplyDamageToPlayer(player)
		if died {
			gl.state.UpdatePlayerRanking(player.ID, player.Kills, 0, false)
		}
	}
}

// checkWinCondition checks if the game should end
func (gl *GameLoop) checkWinCondition() {
	aliveCount := gl.state.GetAlivePlayerCount()

	if aliveCount <= 1 && gl.state.Phase == PhasePlaying {
		gl.state.Phase = PhaseEnding
		// Game will end after a few seconds to show results
	}
}

// broadcastState broadcasts the current game state
func (gl *GameLoop) broadcastState() {
	update := GameStateUpdate{
		Tick:        gl.state.Tick,
		Players:     gl.state.Players,
		Projectiles: gl.projectileManager.GetProjectiles(),
		Loot:        gl.crateManager.GetAllLoot(),
		Crates:      gl.crateManager.GetAllCrates(),
		SafeZone:    gl.state.SafeZone,
		Phase:       gl.state.Phase,
		Rankings:    gl.state.Rankings,
	}

	select {
	case gl.broadcastChan <- update:
	default:
		// Channel full, skip this update
	}
}

// handleCrateInteraction handles player interaction with crates
func (gl *GameLoop) handleCrateInteraction(player *entities.Player) {
	// Find nearby crates
	nearCrates := gl.crateManager.GetCratesInRange(player.Position, game.LootCollectionRadius)

	for _, crate := range nearCrates {
		if crate.IsOpened {
			continue
		}

		// Open crate and get loot
		lootItem, success := gl.crateManager.OpenCrate(crate.ID)
		if !success || lootItem == nil {
			continue
		}

		// Apply loot to player
		loot.ApplyLootToPlayer(player, lootItem)

		// Remove loot from manager
		gl.crateManager.CollectLoot(lootItem.ID)

		// Only open one crate per interact
		break
	}
}

// QueueInput queues a player input for processing
func (gl *GameLoop) QueueInput(input PlayerInput) {
	select {
	case gl.inputQueue <- input:
	default:
		// Queue full, drop input
	}
}

// GetBroadcastChannel returns the broadcast channel
func (gl *GameLoop) GetBroadcastChannel() <-chan GameStateUpdate {
	return gl.broadcastChan
}

// GetState returns a copy of the current game state
func (gl *GameLoop) GetState() *GameState {
	gl.mu.RLock()
	defer gl.mu.RUnlock()
	return gl.state
}

// AddPlayer adds a player to the game
func (gl *GameLoop) AddPlayer(player *entities.Player) {
	gl.mu.Lock()
	defer gl.mu.Unlock()
	gl.state.AddPlayer(player)
}

// RemovePlayer removes a player from the game
func (gl *GameLoop) RemovePlayer(userID string) {
	gl.mu.Lock()
	defer gl.mu.Unlock()
	gl.state.RemovePlayer(userID)
}
