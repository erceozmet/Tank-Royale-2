import Phaser from 'phaser';
import { MAP_WIDTH, MAP_HEIGHT, COLORS } from '../config/constants';
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
  private gridGraphics!: Phaser.GameObjects.Graphics;
  
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
    console.log('🎮 GameScene: Initializing with matchId:', data.matchId);

    // CRITICAL: Prevent scene from pausing when tab loses focus
    // We need to keep processing WebSocket game state updates for multiplayer
    this.sys.events.on('pause', () => {
      console.log('🚫 Preventing GameScene pause for multiplayer');
      this.sys.resume(); // Immediately resume
    });

    // Set background
    this.cameras.main.setBackgroundColor(COLORS.BACKGROUND);
    this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Create grid
    this.createGrid();

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
      console.log('📤 Sending match:join for matchId:', data.matchId);
      ws.send('match:join', { matchId: data.matchId });
    } else {
      console.error('❌ No matchId provided to GameScene');
      this.scene.start('MenuScene');
      return;
    }

    this.setupWebSocketHandlers();
    
    console.log('✅ GameScene ready, waiting for game state from server');
  }

  private createGrid() {
    this.gridGraphics = this.add.graphics();
    this.gridGraphics.lineStyle(1, COLORS.GRID, 0.5);

    // Draw vertical lines every 100 pixels
    for (let x = 0; x <= MAP_WIDTH; x += 100) {
      this.gridGraphics.lineBetween(x, 0, x, MAP_HEIGHT);
    }

    // Draw horizontal lines every 100 pixels
    for (let y = 0; y <= MAP_HEIGHT; y += 100) {
      this.gridGraphics.lineBetween(0, y, MAP_WIDTH, y);
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
      // Log first game state to confirm we're receiving updates
      if (state.tick === 1) {
        console.log('🎮 First game state received! Tick:', state.tick, 'Players:', Object.keys(state.players).length);
      }
      this.lastGameState = state;
      this.currentTick = state.tick;
      this.updateGameState(state);
    });

    // Handle match end
    ws.on('match_ended', (data: any) => {
      console.log('� Match ended:', data);
      // TODO: Show game over screen
      this.scene.start('GameOverScene', data);
    });

    // Handle player death
    ws.on('player_died', (data: any) => {
      console.log('💀 Player died:', data);
    });

    console.log('✅ WebSocket handlers registered');
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

    console.log('🎮 updatePlayers called with', playerIds.length, 'players. Current tanks:', this.tanks.size);

    // Remove tanks that no longer exist
    this.tanks.forEach((tankData, id) => {
      if (!players[id]) {
        console.log('🗑️ Removing tank for player:', id);
        tankData.tank.destroy();
        this.tanks.delete(id);
      }
    });

    // Update or create tanks
    playerIds.forEach(id => {
      const player = players[id];
      console.log('🔍 Processing player:', id, 'isAlive:', player.isAlive, 'pos:', player.position);
      
      if (!player.isAlive) {
        console.log('⚰️ Player', id, 'is not alive, skipping');
        return;
      }

      let tankData = this.tanks.get(id);
      if (!tankData) {
        const isLocal = id === this.localPlayerId;
        console.log('🆕 Creating new tank for player:', player.username, 'isLocal:', isLocal, 'at position:', player.position);
        const tank = new Tank(this, player.position.x, player.position.y, player.username, isLocal);
        tankData = { tank };
        this.tanks.set(id, tankData);
        console.log('✅ Tank created! Total tanks now:', this.tanks.size);
      }

      // Update tank position
      tankData.tank.setPosition(player.position.x, player.position.y);
      
      // Update tank body rotation (movement direction)
      tankData.tank.setBodyRotation(player.rotation);
      
      // Update turret rotation (aim direction - same as movement for now)
      tankData.tank.setTurretRotation(player.rotation);

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
        sprite.setScale(0.8); // Scale down bullets slightly
        this.projectileSprites.set(proj.id, sprite);
      }

      // Update position and rotation
      sprite.setPosition(proj.position.x, proj.position.y);
      sprite.setRotation(proj.velocity ? Math.atan2(proj.velocity.y, proj.velocity.x) : 0);
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
    // Clean up - WebSocket handlers will be cleaned up automatically
    console.log('🧹 GameScene shutdown');
  }
}
