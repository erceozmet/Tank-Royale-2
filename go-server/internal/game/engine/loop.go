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

	// Lag compensation: state history buffer
	stateHistory   []*GameState
	historyIndex   int
	maxHistorySize int

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

	// Calculate history buffer size: 200ms at 30 TPS = ~6 snapshots
	maxSnapshots := int(game.LagCompensationBuffer.Milliseconds() / game.TickInterval.Milliseconds())
	if maxSnapshots < 1 {
		maxSnapshots = 6 // Fallback to 6 snapshots
	}

	return &GameLoop{
		state:             NewGameState(matchID),
		projectileManager: combat.NewProjectileManager(),
		crateManager:      loot.NewCrateManager(),
		physics:           combat.NewPhysics(),
		stateHistory:      make([]*GameState, maxSnapshots),
		historyIndex:      0,
		maxHistorySize:    maxSnapshots,
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

	// 7. Save state snapshot for lag compensation
	gl.saveStateSnapshot()

	// 8. Broadcast state update
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

// saveStateSnapshot saves a snapshot of the current game state to the history buffer
func (gl *GameLoop) saveStateSnapshot() {
	// Clone current state
	snapshot := gl.cloneGameState(gl.state)
	snapshot.Timestamp = time.Now()

	// Store in ring buffer (overwrites oldest)
	gl.stateHistory[gl.historyIndex] = snapshot
	gl.historyIndex = (gl.historyIndex + 1) % gl.maxHistorySize
}

// cloneGameState creates a deep copy of the game state
func (gl *GameLoop) cloneGameState(original *GameState) *GameState {
	clone := &GameState{
		MatchID:     original.MatchID,
		Tick:        original.Tick,
		Timestamp:   original.Timestamp,
		Phase:       original.Phase,
		Players:     make(map[string]*entities.Player),
		Projectiles: make(map[string]*entities.Projectile),
		Obstacles:   make([]*entities.Obstacle, len(original.Obstacles)),
		Crates:      make(map[string]*entities.Crate),
		Loot:        make(map[string]*entities.Loot),
		SafeZone:    original.SafeZone, // SafeZone can be shallow copied (immutable during tick)
		Rankings:    make([]PlayerRanking, len(original.Rankings)),
	}

	// Deep copy players
	for id, player := range original.Players {
		clone.Players[id] = &entities.Player{
			ID:                  player.ID,
			Username:            player.Username,
			Position:            player.Position,
			Velocity:            player.Velocity,
			Rotation:            player.Rotation,
			Health:              player.Health,
			Shield:              player.Shield,
			MaxShield:           player.MaxShield,
			ShieldStacks:        player.ShieldStacks,
			IsAlive:             player.IsAlive,
			Kills:               player.Kills,
			CurrentWeapon:       player.CurrentWeapon,
			LastFireTime:        player.LastFireTime,
			DamageBoostStacks:   player.DamageBoostStacks,
			FireRateBoostStacks: player.FireRateBoostStacks,
			RespawnTime:         player.RespawnTime,
		}
	}

	// Shallow copy projectiles (don't need deep copy for lag comp)
	for id, proj := range original.Projectiles {
		clone.Projectiles[id] = proj
	}

	// Copy obstacles
	copy(clone.Obstacles, original.Obstacles)

	// Copy rankings
	copy(clone.Rankings, original.Rankings)

	return clone
}

// getStateAt retrieves the game state closest to the given timestamp
// Used for lag compensation
func (gl *GameLoop) getStateAt(timestamp time.Time) *GameState {
	var closestState *GameState
	minDiff := time.Hour // Start with large value

	for _, snapshot := range gl.stateHistory {
		if snapshot == nil {
			continue
		}

		// Calculate time difference
		diff := timestamp.Sub(snapshot.Timestamp)
		if diff < 0 {
			diff = -diff // Absolute value
		}

		if diff < minDiff {
			minDiff = diff
			closestState = snapshot
		}
	}

	// If no valid snapshot found, return current state
	if closestState == nil {
		return gl.state
	}

	return closestState
}

// ProcessShootWithLagComp processes a shoot action with lag compensation
// This rewinds the game state to the client's timestamp and checks hit detection
func (gl *GameLoop) ProcessShootWithLagComp(userID string, clientTimestamp time.Time, shootDirection entities.Vector2D) bool {
	gl.mu.Lock()
	defer gl.mu.Unlock()

	// Get the shooter
	shooter, exists := gl.state.Players[userID]
	if !exists || !shooter.IsAlive {
		return false
	}

	// Check if player can fire
	weapon := gl.getWeaponStats(shooter.CurrentWeapon)
	if !shooter.CanFire(weapon.FireRate) {
		return false // Too soon to fire again
	}

	// Get historical state for lag compensation
	pastState := gl.getStateAt(clientTimestamp)

	// Get shooter position from past state (for accurate hit detection)
	pastShooter, exists := pastState.Players[userID]
	if !exists {
		// Fallback to current state if not in history
		pastShooter = shooter
	}

	// Perform raycast in past state to check for hits
	hitPlayerID := gl.performRaycast(userID, pastShooter.Position, shootDirection, pastState)

	// Apply damage in CURRENT state if hit detected
	if hitPlayerID != "" {
		victim, exists := gl.state.Players[hitPlayerID]
		if exists && victim.IsAlive {
			// Calculate damage with boosts
			damage := weapon.Damage
			damage += shooter.DamageBoostStacks * 5 // +5 damage per boost

			// Apply damage
			died := victim.TakeDamage(damage)

			if died {
				shooter.Kills++
				gl.state.UpdatePlayerRanking(userID, shooter.Kills, 0, shooter.IsAlive)
				gl.state.UpdatePlayerRanking(hitPlayerID, victim.Kills, 0, false)
			}

			// Update shooter's last fire time
			shooter.LastFireTime = time.Now()
			return true
		}
	}

	// No hit, but still update fire time
	shooter.LastFireTime = time.Now()
	return false
}

// performRaycast performs a simple raycast to check if the shot hits any player
// Returns the userID of the hit player, or empty string if no hit
func (gl *GameLoop) performRaycast(shooterID string, origin entities.Vector2D, direction entities.Vector2D, state *GameState) string {
	// Normalize direction
	dirLength := direction.Magnitude()
	if dirLength == 0 {
		return ""
	}
	direction = direction.Normalize()

	// Raycast distance (weapon range)
	maxRange := 800.0 // Default weapon range

	// Check all players for intersection
	var closestHit string
	closestDistance := maxRange

	for playerID, player := range state.Players {
		if !player.IsAlive {
			continue
		}

		// Don't hit yourself
		if playerID == shooterID {
			continue
		}

		// Calculate distance from ray to player
		toPlayer := player.Position.Subtract(origin)
		projection := toPlayer.Dot(direction)

		// Player is behind the shooter
		if projection < 0 {
			continue
		}

		// Player is beyond max range
		if projection > maxRange {
			continue
		}

		// Calculate perpendicular distance to ray
		closestPoint := origin.Add(direction.Multiply(projection))
		distanceToRay := player.Position.Distance(closestPoint)

		// Check if within hit radius (player hitbox)
		playerRadius := 20.0 // Player hit radius
		if distanceToRay <= playerRadius && projection < closestDistance {
			closestDistance = projection
			closestHit = playerID
		}
	}

	return closestHit
}

// WeaponStats holds weapon statistics
type WeaponStats struct {
	Damage   int
	FireRate time.Duration
	Range    float64
}

// getWeaponStats returns the stats for a given weapon type
func (gl *GameLoop) getWeaponStats(weaponType entities.WeaponType) WeaponStats {
	switch weaponType {
	case entities.WeaponPistol:
		return WeaponStats{Damage: 20, FireRate: 500 * time.Millisecond, Range: 800}
	case entities.WeaponRifle:
		return WeaponStats{Damage: 30, FireRate: 300 * time.Millisecond, Range: 1000}
	case entities.WeaponShotgun:
		return WeaponStats{Damage: 60, FireRate: 1000 * time.Millisecond, Range: 400}
	case entities.WeaponSniper:
		return WeaponStats{Damage: 100, FireRate: 1500 * time.Millisecond, Range: 1500}
	default:
		return WeaponStats{Damage: 20, FireRate: 500 * time.Millisecond, Range: 800}
	}
}
