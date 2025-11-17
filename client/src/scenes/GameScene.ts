import Phaser from 'phaser';
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  COLORS,
  PLAYER_RADIUS,
  PLAYER_BASE_SPEED,
  PLAYER_TURBO_SPEED,
  PLAYER_COLORS,
  BULLET_SPEED,
  BULLET_RADIUS,
  FIRE_RATE,
} from '../config/constants';
import { getWebSocketService } from '../services/websocket';

interface Player {
  graphics: Phaser.GameObjects.Graphics;
  body: Phaser.Physics.Arcade.Body;
  color: number;
  health: number;
  isTurbo: boolean;
}

interface OtherPlayer {
  id: string;
  name: string;
  graphics: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  color: number;
  health: number;
}

export default class GameScene extends Phaser.Scene {
  private player!: Player;
  private otherPlayers: Map<string, OtherPlayer> = new Map();
  private wasd!: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
  };
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private lastFireTime: number = 0;
  private bullets: Phaser.GameObjects.Graphics[] = [];
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private lastPositionUpdate: number = 0;
  private positionUpdateRate: number = 50; // Send position every 50ms

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    console.log('�� GameScene: Creating blast.io game');

    // Set white background
    this.cameras.main.setBackgroundColor(COLORS.BACKGROUND);

    // Set up world bounds (4000x4000 map)
    this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Create grid background
    this.createGrid();

    // Create player
    this.createPlayer();

    // Set up camera to follow player
    this.cameras.main.startFollow(this.player.graphics, true, 0.1, 0.1);
    this.cameras.main.setZoom(1);
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Set up controls
    this.setupControls();

    // Mouse click to shoot
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.shootBullet(pointer);
    });

    // WebSocket connection is established in app.ts before scene starts
    // Setup message handlers
    const ws = getWebSocketService();
    if (ws.isConnected()) {
      console.log('✅ WebSocket already connected');
      this.setupWebSocketHandlers();
    } else {
      console.warn('⚠️ WebSocket not connected - running in offline mode');
    }

    console.log('✅ GameScene: blast.io game ready');
    console.log(`📐 Map size: ${MAP_WIDTH}x${MAP_HEIGHT}`);
  }

  private setupWebSocketHandlers() {
    const ws = getWebSocketService();
    
    // TODO: Implement multiplayer message handlers
    // For now, just log that we're ready for multiplayer
    console.log('🎮 Multiplayer handlers ready');
    console.log(`👤 Playing as: ${ws.getUsername()} (${ws.getUserId()})`);
    
    // Handle other players joining
    ws.on('player_joined', (data: any) => {
      console.log('� Player joined:', data);
    });

    // Handle other players moving
    ws.on('player_moved', (data: any) => {
      console.log('🏃 Player moved:', data);
    });

    // Handle other players leaving
    ws.on('player_left', (data: any) => {
      console.log('� Player left:', data);
    });
  }

  private handlePlayerDeath() {
    console.log('💀 Player died');
    const ws = getWebSocketService();
    if (ws.isConnected()) {
      ws.sendDeath();
    }
    // TODO: Show death screen and respawn options
    this.scene.restart();
  }

  private createGrid() {
    // Create grid graphics
    this.gridGraphics = this.add.graphics();
    this.gridGraphics.lineStyle(1, COLORS.GRID, 1);

    // Draw vertical lines
    for (let x = 0; x <= MAP_WIDTH; x += 40) {
      this.gridGraphics.lineBetween(x, 0, x, MAP_HEIGHT);
    }

    // Draw horizontal lines
    for (let y = 0; y <= MAP_HEIGHT; y += 40) {
      this.gridGraphics.lineBetween(0, y, MAP_WIDTH, y);
    }
  }

  private createPlayer() {
    // Random color from PLAYER_COLORS
    const colorHex = PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
    const color = parseInt(colorHex.replace('#', ''), 16);

    // Create graphics object for player circle
    const graphics = this.add.graphics();
    graphics.fillStyle(color, 1);
    graphics.fillCircle(0, 0, PLAYER_RADIUS);

    // Add black outline
    graphics.lineStyle(2, 0x000000, 1);
    graphics.strokeCircle(0, 0, PLAYER_RADIUS);

    // Start in center of map
    graphics.setPosition(MAP_WIDTH / 2, MAP_HEIGHT / 2);

    // Add physics to graphics
    this.physics.add.existing(graphics);
    const body = graphics.body as Phaser.Physics.Arcade.Body;
    body.setCircle(PLAYER_RADIUS);
    body.setCollideWorldBounds(true);

    this.player = {
      graphics,
      body,
      color,
      health: 100,
      isTurbo: false,
    };
  }

  private setupControls() {
    // WASD controls
    this.wasd = {
      w: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Space for turbo
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  private shootBullet(pointer: Phaser.Input.Pointer) {
    const now = this.time.now;
    if (now - this.lastFireTime < FIRE_RATE) {
      return; // Rate limiting
    }

    this.lastFireTime = now;

    // Get world position of pointer
    const worldX = pointer.worldX;
    const worldY = pointer.worldY;

    // Calculate direction
    const angle = Phaser.Math.Angle.Between(
      this.player.graphics.x,
      this.player.graphics.y,
      worldX,
      worldY
    );

    // Create bullet
    const bullet = this.add.graphics();
    bullet.fillStyle(0x000000, 1);
    bullet.fillCircle(0, 0, BULLET_RADIUS);
    bullet.setPosition(this.player.graphics.x, this.player.graphics.y);

    // Add physics
    this.physics.add.existing(bullet);
    const bulletBody = bullet.body as Phaser.Physics.Arcade.Body;
    bulletBody.setCircle(BULLET_RADIUS);

    // Set velocity
    bulletBody.setVelocity(Math.cos(angle) * BULLET_SPEED, Math.sin(angle) * BULLET_SPEED);

    this.bullets.push(bullet);

    // Destroy bullet after 2 seconds
    this.time.delayedCall(2000, () => {
      bullet.destroy();
      const index = this.bullets.indexOf(bullet);
      if (index > -1) {
        this.bullets.splice(index, 1);
      }
    });
  }

  update() {
    // Handle movement
    let velocityX = 0;
    let velocityY = 0;

    if (this.wasd.w.isDown) {
      velocityY = -1;
    } else if (this.wasd.s.isDown) {
      velocityY = 1;
    }

    if (this.wasd.a.isDown) {
      velocityX = -1;
    } else if (this.wasd.d.isDown) {
      velocityX = 1;
    }

    // Normalize diagonal movement
    if (velocityX !== 0 && velocityY !== 0) {
      velocityX *= 0.707;
      velocityY *= 0.707;
    }

    // Check if turbo is active
    this.player.isTurbo = this.spaceKey.isDown;
    const speed = this.player.isTurbo ? PLAYER_TURBO_SPEED : PLAYER_BASE_SPEED;

    // Apply velocity
    this.player.body.setVelocity(velocityX * speed, velocityY * speed);

    // Update HUD
    const playerName = localStorage.getItem('blast-io-player-name') || 'Player';
    if (window.updateHUD) {
      window.updateHUD({
        playerName,
        health: this.player.health,
        maxHealth: 100,
        playersAlive: 24,
      });
    }

    // Update minimap
    if (window.updateMinimap) {
      window.updateMinimap({
        playerX: this.player.graphics.x,
        playerY: this.player.graphics.y,
        mapWidth: MAP_WIDTH,
        mapHeight: MAP_HEIGHT,
        safeZoneRadius: MAP_WIDTH / 2,
      });
    }
  }
}
