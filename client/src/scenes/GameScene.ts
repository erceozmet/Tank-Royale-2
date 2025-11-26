import Phaser from 'phaser';
import { MAP_WIDTH, MAP_HEIGHT } from '../config/constants';
import { getWebSocketService, GameState, PlayerState, Projectile, Loot, Crate } from '../services/websocket';
import { Tank } from '../entities/Tank';

interface TankData {
  tank: Tank;
}

export default class GameScene extends Phaser.Scene {
  private localPlayerId: string | null = null;
  private tanks: Map<string, TankData> = new Map();
  private projectileSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private lootSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private crateSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  
  private safeZoneGraphics!: Phaser.GameObjects.Graphics;
  
  private lastGameState: GameState | null = null;
  private currentTick: number = 0;

  // Input state
  private keys: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
  } | null = null;
  private lastInputSent: { up: boolean; down: boolean; left: boolean; right: boolean; shoot: boolean } = {
    up: false,
    down: false,
    left: false,
    right: false,
    shoot: false,
  };

  constructor() {
    super({ key: 'GameScene' });
  }

  create(data: { matchId?: string }) {
    // CRITICAL: Prevent scene from pausing when tab loses focus
    // We need to keep processing WebSocket game state updates for multiplayer
    this.sys.events.on('pause', () => {
      this.sys.resume(); // Immediately resume
    });

    // Set background
    this.cameras.main.setBackgroundColor(0x2d4a2b); // Dark green base
    this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Create procedural terrain background
    this.createTerrainBackground();

    // Create safe zone graphics
    this.safeZoneGraphics = this.add.graphics();

    // Set up camera
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.cameras.main.setZoom(1);

    // Set up input
    this.setupInput();

    // Connect to WebSocket and setup handlers
    const ws = getWebSocketService();
    this.localPlayerId = ws.getUserId();
    
    if (!ws.isConnected()) {
      console.error('❌ WebSocket not connected, returning to menu');
      this.scene.start('MenuScene');
      return;
    }

    // Send match:join message to join the match
    if (data.matchId) {
      ws.send('match:join', { matchId: data.matchId });
    } else {
      console.error('❌ No matchId provided to GameScene');
      this.scene.start('MenuScene');
      return;
    }

    this.setupWebSocketHandlers();
  }

  private createTerrainBackground() {
    // Create procedural terrain using simple rectangles
    // Colors: grass (green) and dirt (brown)
    const grassColor = 0x3a5a38; // Medium green
    const dirtColor = 0x6b5344;  // Brown
    const tileSize = 64; // Size of each tile
    
    const terrainGraphics = this.add.graphics();
    terrainGraphics.setDepth(-100); // Behind everything
    
    // Create a seeded random for consistent terrain
    const seed = 12345;
    let random = seed;
    const seededRandom = () => {
      random = (random * 9301 + 49297) % 233280;
      return random / 233280;
    };
    
    // Fill the map with tiles (60% grass, 40% dirt)
    for (let y = 0; y < MAP_HEIGHT; y += tileSize) {
      for (let x = 0; x < MAP_WIDTH; x += tileSize) {
        const color = seededRandom() < 0.6 ? grassColor : dirtColor;
        
        // Add slight color variation for visual interest
        const variation = Math.floor(seededRandom() * 15) - 7;
        const variedColor = color + (variation << 16) + (variation << 8) + variation;
        
        terrainGraphics.fillStyle(variedColor, 1);
        terrainGraphics.fillRect(x, y, tileSize, tileSize);
      }
    }
  }

  private setupInput() {
    if (!this.input.keyboard) return;

    this.keys = {
      w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Mouse click to shoot
    this.input.on('pointerdown', () => {
      this.sendInput(true);
    });
  }

  private setupWebSocketHandlers() {
    const ws = getWebSocketService();

    // Listen for game state updates (30 times per second from server)
    ws.on('game:state', (state: GameState) => {
      this.lastGameState = state;
      this.currentTick = state.tick;
      this.updateGameState(state);
    });

    // Handle match end
    ws.on('match_ended', (data: any) => {
      // Add local player ID to the data
      const gameOverData = {
        ...data,
        localPlayerId: this.localPlayerId,
      };
      
      // Stop game scene and show game over screen
      this.scene.start('GameOverScene', gameOverData);
    });

    // Handle player death
    ws.on('player_died', (_data: any) => {
      // Player death handled in game state update
    });
  }

  private updateGameState(state: GameState) {
    // Update players/tanks
    this.updatePlayers(state.players);
    
    // Update projectiles
    this.updateProjectiles(state.projectiles);
    
    // Update loot
    this.updateLoot(state.loot);
    
    // Update crates
    this.updateCrates(state.crates);
    
    // Update safe zone
    if (state.safeZone) {
      this.updateSafeZone(state.safeZone);
    }

    // Follow local player with camera
    if (this.localPlayerId && state.players[this.localPlayerId]) {
      const localPlayer = state.players[this.localPlayerId];
      this.cameras.main.scrollX = localPlayer.position.x - this.cameras.main.width / 2;
      this.cameras.main.scrollY = localPlayer.position.y - this.cameras.main.height / 2;
    }

    // Update HUD
    this.updateHUD(state);
  }

  private updatePlayers(players: Record<string, PlayerState>) {
    const playerIds = Object.keys(players);

    // Remove tanks that no longer exist
    this.tanks.forEach((tankData, id) => {
      if (!players[id]) {
        tankData.tank.destroy();
        this.tanks.delete(id);
      }
    });

    // Update or create tanks
    playerIds.forEach(id => {
      const player = players[id];
      
      if (!player.isAlive) {
        return;
      }

      let tankData = this.tanks.get(id);
      if (!tankData) {
        const isLocal = id === this.localPlayerId;
        const tank = new Tank(this, player.position.x, player.position.y, player.username, isLocal);
        tankData = { tank };
        this.tanks.set(id, tankData);
      }

      // Update tank position
      tankData.tank.setPosition(player.position.x, player.position.y);
      
      // Update tank body rotation (movement direction)
      tankData.tank.setBodyRotation(player.rotation);
      
      // Update turret rotation
      // For local player: use mouse position (real-time, not synced)
      // For other players: use their rotation as fallback (server doesn't need to send turret_rotation)
      if (id === this.localPlayerId) {
        // Local player - calculate turret angle from mouse position in real-time
        const pointer = this.input.activePointer;
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const turretAngle = Phaser.Math.Angle.Between(
          player.position.x,
          player.position.y,
          worldPoint.x,
          worldPoint.y
        );
        tankData.tank.setTurretRotation(turretAngle);
      } else {
        // Other players - just show body rotation (or turret_rotation if server sends it)
        tankData.tank.setTurretRotation(player.turret_rotation || player.rotation);
      }

      // Update health bar
      tankData.tank.updateHealthBar(player.health, player.maxHealth);
    });
  }

  private updateProjectiles(projectiles: Projectile[]) {
    const projectileIds = new Set(projectiles.map(p => p.id));

    // Remove old projectiles
    this.projectileSprites.forEach((sprite, id) => {
      if (!projectileIds.has(id)) {
        sprite.destroy();
        this.projectileSprites.delete(id);
      }
    });

    // Update or create projectiles
    projectiles.forEach(proj => {
      let sprite = this.projectileSprites.get(proj.id);
      if (!sprite) {
        // Determine bullet color based on owner (green = player, red = enemy)
        const bulletKey = proj.ownerId === this.localPlayerId ? 'bullet-green' : 'bullet-red';
        sprite = this.add.sprite(proj.position.x, proj.position.y, bulletKey);
        sprite.setOrigin(0.5, 0.5); // Center origin for proper rotation
        sprite.setScale(0.8); // Scale down bullets slightly
        this.projectileSprites.set(proj.id, sprite);
      }

      // Update position and rotation based on velocity direction
      sprite.setPosition(proj.position.x, proj.position.y);
      // Bullet sprite points up by default, so add π/2 to rotate it to point right first
      // Then atan2 gives us the angle from right (0) going counter-clockwise
      const bulletRotation = proj.velocity ? Math.atan2(proj.velocity.y, proj.velocity.x) + Math.PI / 2 : 0;
      sprite.setRotation(bulletRotation);
    });
  }

  private updateLoot(loot: Loot[]) {
    const lootIds = new Set(loot.map(l => l.id));

    // Remove old loot
    this.lootSprites.forEach((sprite, id) => {
      if (!lootIds.has(id)) {
        sprite.destroy();
        this.lootSprites.delete(id);
      }
    });

    // Update or create loot
    loot.forEach(item => {
      let sprite = this.lootSprites.get(item.id);
      if (!sprite) {
        // Map loot type to crate sprite
        const crateKey = this.getLootCrateKey(item.type);
        sprite = this.add.sprite(item.position.x, item.position.y, crateKey);
        sprite.setScale(0.5); // Loot is smaller than crates
        
        // Add floating animation
        this.tweens.add({
          targets: sprite,
          y: item.position.y - 5,
          duration: 1000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        
        this.lootSprites.set(item.id, sprite);
      }

      sprite.setPosition(item.position.x, item.position.y);
    });
  }

  private getLootCrateKey(type: string): string {
    switch (type) {
      case 'health': return 'crate-health'; // Green crate
      case 'armor': return 'crate-armor';   // Red crate
      case 'ammo': return 'crate-ammo';     // Grey crate
      default: return 'crate-ammo';
    }
  }

  private updateCrates(crates: Crate[]) {
    const crateIds = new Set(crates.map(c => c.id));

    // Remove old crates
    this.crateSprites.forEach((sprite, id) => {
      if (!crateIds.has(id)) {
        sprite.destroy();
        this.crateSprites.delete(id);
      }
    });

    // Update or create crates
    crates.forEach(crate => {
      if (crate.isOpened) {
        // Remove opened crates
        const sprite = this.crateSprites.get(crate.id);
        if (sprite) {
          sprite.destroy();
          this.crateSprites.delete(crate.id);
        }
        return;
      }

      let sprite = this.crateSprites.get(crate.id);
      if (!sprite) {
        // Randomly select crate type
        const crateTypes = ['crate-health', 'crate-armor', 'crate-ammo'];
        const crateKey = crateTypes[Math.floor(Math.random() * crateTypes.length)];
        
        sprite = this.add.sprite(crate.position.x, crate.position.y, crateKey);
        sprite.setScale(0.75); // Crates are slightly larger than loot
        
        this.crateSprites.set(crate.id, sprite);
      }

      sprite.setPosition(crate.position.x, crate.position.y);
    });
  }

  private updateSafeZone(safeZone: any) {
    this.safeZoneGraphics.clear();

    // Draw danger zone (red tint outside safe zone)
    this.safeZoneGraphics.fillStyle(0xff0000, 0.1);
    this.safeZoneGraphics.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Clear safe zone (make it transparent)
    this.safeZoneGraphics.fillStyle(0xffffff, 0);
    this.safeZoneGraphics.fillCircle(
      safeZone.center.x,
      safeZone.center.y,
      safeZone.currentRadius
    );

    // Draw safe zone border
    this.safeZoneGraphics.lineStyle(3, 0x00ff00, 1);
    this.safeZoneGraphics.strokeCircle(
      safeZone.center.x,
      safeZone.center.y,
      safeZone.currentRadius
    );

    // Draw next safe zone if shrinking
    if (safeZone.targetRadius < safeZone.currentRadius) {
      this.safeZoneGraphics.lineStyle(2, 0xffff00, 0.5);
      this.safeZoneGraphics.strokeCircle(
        safeZone.center.x,
        safeZone.center.y,
        safeZone.targetRadius
      );
    }
  }

  private updateHUD(state: GameState) {
    if (!this.localPlayerId) return;
    
    const localPlayer = state.players[this.localPlayerId];
    if (!localPlayer) return;

    const playersAlive = Object.values(state.players).filter(p => p.isAlive).length;

    if ((window as any).updateHUD) {
      (window as any).updateHUD({
        playerName: localPlayer.username,
        health: localPlayer.health,
        maxHealth: localPlayer.maxHealth,
        playersAlive,
      });
    }

    if ((window as any).updateMinimap) {
      (window as any).updateMinimap({
        playerX: localPlayer.position.x,
        playerY: localPlayer.position.y,
        mapWidth: MAP_WIDTH,
        mapHeight: MAP_HEIGHT,
        safeZoneRadius: state.safeZone?.currentRadius || MAP_WIDTH / 2,
      });
    }
  }

  update() {
    if (!this.keys) return;

    // Check input state
    const up = this.keys.w.isDown;
    const down = this.keys.s.isDown;
    const left = this.keys.a.isDown;
    const right = this.keys.d.isDown;

    // Only send input if it changed
    const inputChanged = 
      up !== this.lastInputSent.up ||
      down !== this.lastInputSent.down ||
      left !== this.lastInputSent.left ||
      right !== this.lastInputSent.right;

    if (inputChanged) {
      this.sendInput(false);
    }
  }

  private sendInput(shoot: boolean) {
    if (!this.keys) return;

    const up = this.keys.w.isDown;
    const down = this.keys.s.isDown;
    const left = this.keys.a.isDown;
    const right = this.keys.d.isDown;

    this.lastInputSent = { up, down, left, right, shoot };

    const ws = getWebSocketService();
    const pointer = this.input.activePointer;
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

    // Calculate aim angle
    let aimAngle = 0;
    if (this.localPlayerId && this.lastGameState) {
      const localPlayer = this.lastGameState.players[this.localPlayerId];
      if (localPlayer) {
        aimAngle = Phaser.Math.Angle.Between(
          localPlayer.position.x,
          localPlayer.position.y,
          worldPoint.x,
          worldPoint.y
        );
      }
    }

    ws.send('player_input', {
      tick: this.currentTick,
      up,
      down,
      left,
      right,
      shoot,
      aimAngle,
    });
  }

  shutdown() {
    // Clean up WebSocket handlers to prevent stale callbacks
    const ws = getWebSocketService();
    ws.clearHandlers('game:state');
    ws.clearHandlers('match_ended');
    ws.clearHandlers('player_died');
    
    // Clear sprite maps
    this.tanks.forEach(tankData => tankData.tank.destroy());
    this.tanks.clear();
    
    this.projectileSprites.forEach(sprite => sprite.destroy());
    this.projectileSprites.clear();
    
    this.lootSprites.forEach(sprite => sprite.destroy());
    this.lootSprites.clear();
    
    this.crateSprites.forEach(sprite => sprite.destroy());
    this.crateSprites.clear();
    
    console.log('🛑 GameScene: Shutdown complete');
  }
}
