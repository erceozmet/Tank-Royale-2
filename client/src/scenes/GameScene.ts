import Phaser from 'phaser';
import { MAP_WIDTH, MAP_HEIGHT, COLORS } from '../config/constants';
import { getWebSocketService, GameState, PlayerState, Projectile, Loot, Crate } from '../services/websocket';

// TODO: Replace with AI-generated tank sprite
const TANK_SIZE = 30;
// TODO: Replace with AI-generated bullet sprite
const BULLET_SIZE = 6;
// TODO: Replace with AI-generated crate sprite
const CRATE_SIZE = 25;
// TODO: Replace with AI-generated loot sprite
const LOOT_SIZE = 15;

interface TankGraphics {
  body: Phaser.GameObjects.Graphics;
  healthBar: Phaser.GameObjects.Graphics;
  nameText: Phaser.GameObjects.Text;
}

export default class GameScene extends Phaser.Scene {
  private localPlayerId: string | null = null;
  private tanks: Map<string, TankGraphics> = new Map();
  private projectileGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private lootGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private crateGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
  
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

  create() {
    console.log('🎮 GameScene: Initializing');

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
    ws.on('game_state', (state: GameState) => {
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

    // Remove tanks that no longer exist
    this.tanks.forEach((graphics, id) => {
      if (!players[id]) {
        graphics.body.destroy();
        graphics.healthBar.destroy();
        graphics.nameText.destroy();
        this.tanks.delete(id);
      }
    });

    // Update or create tanks
    playerIds.forEach(id => {
      const player = players[id];
      if (!player.isAlive) return;

      let tank = this.tanks.get(id);
      if (!tank) {
        tank = this.createTank(id, player);
        this.tanks.set(id, tank);
      }

      // Update position and rotation - TODO: Replace with proper sprite rotation
      tank.body.setPosition(player.position.x, player.position.y);
      tank.body.clear();
      
      // Draw tank facing the rotation angle
      // TODO: Replace with AI-generated tank sprite
      const isLocal = id === this.localPlayerId;
      const color = isLocal ? 0x00ff00 : 0xff0000;
      
      // Draw tank body (rotated rectangle)
      const cos = Math.cos(player.rotation);
      const sin = Math.sin(player.rotation);
      const halfSize = TANK_SIZE / 2;
      
      tank.body.fillStyle(color, 1);
      tank.body.fillRect(player.position.x - halfSize, player.position.y - halfSize, TANK_SIZE, TANK_SIZE);
      
      // Draw gun barrel pointing in rotation direction
      tank.body.fillStyle(0x000000, 1);
      const barrelLength = TANK_SIZE / 2;
      const barrelWidth = 10;
      const barrelX = player.position.x + cos * barrelLength / 2;
      const barrelY = player.position.y + sin * barrelLength / 2;
      tank.body.fillRect(barrelX - barrelWidth / 2, barrelY - barrelWidth / 2, barrelWidth, barrelLength);

      // Update health bar
      this.updateHealthBar(tank.healthBar, player.health, player.maxHealth);
    });
  }

  private createTank(_id: string, player: PlayerState): TankGraphics {
    const body = this.add.graphics();
    
    const healthBar = this.add.graphics();
    
    const nameText = this.add.text(0, 0, player.username, {
      fontSize: '12px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    });
    nameText.setOrigin(0.5, 1);

    return { body, healthBar, nameText };
  }

  private updateHealthBar(graphics: Phaser.GameObjects.Graphics, health: number, maxHealth: number) {
    graphics.clear();
    
    const barWidth = TANK_SIZE;
    const barHeight = 4;
    const healthPercent = health / maxHealth;

    // Background
    graphics.fillStyle(0x000000, 0.5);
    graphics.fillRect(-barWidth / 2, 0, barWidth, barHeight);

    // Health
    const healthColor = healthPercent > 0.5 ? 0x00ff00 : healthPercent > 0.25 ? 0xffff00 : 0xff0000;
    graphics.fillStyle(healthColor, 1);
    graphics.fillRect(-barWidth / 2, 0, barWidth * healthPercent, barHeight);
  }

  private updateProjectiles(projectiles: Projectile[]) {
    const projectileIds = new Set(projectiles.map(p => p.id));

    // Remove old projectiles
    this.projectileGraphics.forEach((graphics, id) => {
      if (!projectileIds.has(id)) {
        graphics.destroy();
        this.projectileGraphics.delete(id);
      }
    });

    // Update or create projectiles
    projectiles.forEach(proj => {
      let graphics = this.projectileGraphics.get(proj.id);
      if (!graphics) {
        graphics = this.add.graphics();
        // TODO: Replace with AI-generated bullet sprite
        graphics.fillStyle(0x000000, 1);
        graphics.fillCircle(0, 0, BULLET_SIZE);
        this.projectileGraphics.set(proj.id, graphics);
      }

      graphics.setPosition(proj.position.x, proj.position.y);
    });
  }

  private updateLoot(loot: Loot[]) {
    const lootIds = new Set(loot.map(l => l.id));

    // Remove old loot
    this.lootGraphics.forEach((graphics, id) => {
      if (!lootIds.has(id)) {
        graphics.destroy();
        this.lootGraphics.delete(id);
      }
    });

    // Update or create loot
    loot.forEach(item => {
      let graphics = this.lootGraphics.get(item.id);
      if (!graphics) {
        graphics = this.add.graphics();
        // TODO: Replace with AI-generated loot sprite (different colors for types)
        const lootColor = this.getLootColor(item.type);
        graphics.fillStyle(lootColor, 1);
        // Draw a simple diamond shape
        graphics.beginPath();
        graphics.moveTo(0, -LOOT_SIZE);
        graphics.lineTo(LOOT_SIZE, 0);
        graphics.lineTo(0, LOOT_SIZE);
        graphics.lineTo(-LOOT_SIZE, 0);
        graphics.closePath();
        graphics.fillPath();
        this.lootGraphics.set(item.id, graphics);
      }

      graphics.setPosition(item.position.x, item.position.y);
    });
  }

  private getLootColor(type: string): number {
    switch (type) {
      case 'health': return 0xff0000;
      case 'armor': return 0x0000ff;
      case 'damage': return 0xff8800;
      case 'speed': return 0x00ffff;
      case 'fire_rate': return 0xff00ff;
      default: return 0xffffff;
    }
  }

  private updateCrates(crates: Crate[]) {
    const crateIds = new Set(crates.map(c => c.id));

    // Remove old crates
    this.crateGraphics.forEach((graphics, id) => {
      if (!crateIds.has(id)) {
        graphics.destroy();
        this.crateGraphics.delete(id);
      }
    });

    // Update or create crates
    crates.forEach(crate => {
      if (crate.isOpened) {
        // Remove opened crates
        const graphics = this.crateGraphics.get(crate.id);
        if (graphics) {
          graphics.destroy();
          this.crateGraphics.delete(crate.id);
        }
        return;
      }

      let graphics = this.crateGraphics.get(crate.id);
      if (!graphics) {
        graphics = this.add.graphics();
        // TODO: Replace with AI-generated crate sprite
        graphics.fillStyle(0x8b4513, 1);
        graphics.fillRect(-CRATE_SIZE / 2, -CRATE_SIZE / 2, CRATE_SIZE, CRATE_SIZE);
        graphics.lineStyle(2, 0x000000, 1);
        graphics.strokeRect(-CRATE_SIZE / 2, -CRATE_SIZE / 2, CRATE_SIZE, CRATE_SIZE);
        this.crateGraphics.set(crate.id, graphics);
      }

      graphics.setPosition(crate.position.x, crate.position.y);
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
