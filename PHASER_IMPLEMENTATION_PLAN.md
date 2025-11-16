# Phaser.js Implementation Plan - Tank Royale 2

> **Goal**: Build a production-ready Phaser 3 game client with TypeScript, Vite, client-side prediction, and smooth 60 FPS rendering.

---

## 📋 Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Phase 1: Foundation Setup](#phase-1-foundation-setup)
4. [Phase 2: Scene Architecture](#phase-2-scene-architecture)
5. [Phase 3: Network Layer](#phase-3-network-layer)
6. [Phase 4: Game Rendering](#phase-4-game-rendering)
7. [Phase 5: Client Prediction & Interpolation](#phase-5-client-prediction--interpolation)
8. [Phase 6: UI/HUD System](#phase-6-uihud-system)
9. [Phase 7: Visual Polish](#phase-7-visual-polish)
10. [Testing Strategy](#testing-strategy)
11. [Performance Optimization](#performance-optimization)
12. [Cloud Deployment Strategy](#cloud-deployment-strategy)

---

## 🎮 Tech Stack

### Core Technologies
- **Phaser 3.80+**: Game framework with WebGL rendering
- **TypeScript 5.x**: Type-safe development
- **Vite 5.x**: Fast dev server with HMR (Hot Module Replacement)
- **axios**: REST API communication
- **WebSocket (native)**: Real-time game state updates

### Development Tools
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **vite-plugin-static-copy**: Asset management

### Why This Stack?
- ✅ **Phaser 3**: Battle-tested game framework, 60 FPS rendering, excellent docs
- ✅ **Vite**: Lightning-fast dev server (~200ms startup), instant HMR
- ✅ **TypeScript**: Type safety prevents runtime errors, better IDE support
- ✅ **Native WebSocket**: No extra dependencies, full control

---

## 📁 Project Structure

```
client/
├── public/
│   ├── index.html              # Entry HTML
│   └── assets/
│       ├── sprites/            # Player, weapon sprites
│       │   ├── tank.png
│       │   ├── bullet.png
│       │   └── loot/
│       │       ├── shield.png
│       │       ├── damage-boost.png
│       │       └── firerate-boost.png
│       ├── sounds/             # Audio files
│       │   ├── shoot-pistol.mp3
│       │   ├── shoot-rifle.mp3
│       │   ├── hit.mp3
│       │   └── loot-pickup.mp3
│       ├── music/              # Background music
│       │   └── game-music.mp3
│       └── ui/                 # UI assets
│           ├── health-bar.png
│           └── minimap-bg.png
├── src/
│   ├── main.ts                 # Entry point - initializes Phaser
│   ├── config/
│   │   ├── game-config.ts      # Phaser game configuration
│   │   └── constants.ts        # Game constants (matching Go server)
│   ├── scenes/
│   │   ├── BootScene.ts        # Asset loading scene
│   │   ├── MenuScene.ts        # Login/Register/Main menu
│   │   ├── LobbyScene.ts       # Matchmaking waiting room
│   │   ├── GameScene.ts        # Main gameplay scene
│   │   └── GameOverScene.ts    # Results and stats
│   ├── entities/
│   │   ├── Player.ts           # Player entity with prediction
│   │   ├── RemotePlayer.ts     # Other players with interpolation
│   │   ├── Projectile.ts       # Bullet rendering
│   │   ├── Loot.ts             # Loot item rendering
│   │   └── Obstacle.ts         # Map obstacles
│   ├── network/
│   │   ├── APIClient.ts        # REST API wrapper
│   │   └── WebSocketManager.ts # WebSocket connection + messages
│   ├── ui/
│   │   ├── HUD.ts              # Health, ammo, kills display
│   │   ├── Minimap.ts          # Minimap rendering
│   │   ├── KillFeed.ts         # Kill notifications
│   │   ├── Menu.ts             # Menu components
│   │   └── GameOverUI.ts       # Results screen
│   ├── systems/
│   │   ├── InputManager.ts     # Keyboard + mouse input
│   │   ├── PredictionSystem.ts # Client-side prediction
│   │   ├── InterpolationSystem.ts # Entity interpolation
│   │   └── CameraController.ts # Camera follow logic
│   ├── utils/
│   │   ├── Vector2D.ts         # Vector math (matching Go)
│   │   ├── Interpolation.ts    # Interpolation helpers
│   │   └── StateHistory.ts     # Input/state buffering
│   └── types/
│       ├── index.ts            # All TypeScript interfaces
│       ├── network.ts          # Network message types
│       └── game.ts             # Game entity types
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .eslintrc.json
├── .prettierrc
└── README.md
```

---

## 🚀 Phase 1: Foundation Setup

### 1.1 Initialize Package.json

**File**: `client/package.json`

```json
{
  "name": "tank-royale-client",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .ts,.tsx",
    "format": "prettier --write \"src/**/*.{ts,tsx}\""
  },
  "dependencies": {
    "phaser": "^3.80.1",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "vite": "^5.0.8",
    "@types/node": "^20.10.6",
    "vite-plugin-static-copy": "^1.0.0",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.18.1",
    "@typescript-eslint/parser": "^6.18.1",
    "prettier": "^3.1.1"
  }
}
```

**Commands to run**:
```bash
cd client
npm install
```

---

### 1.2 Configure TypeScript

**File**: `client/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitAny": true,
    "strictNullChecks": true,

    /* Path aliases */
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@scenes/*": ["src/scenes/*"],
      "@entities/*": ["src/entities/*"],
      "@network/*": ["src/network/*"],
      "@ui/*": ["src/ui/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**File**: `client/tsconfig.node.json`

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

---

### 1.3 Configure Vite

**File**: `client/vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import path from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@scenes': path.resolve(__dirname, './src/scenes'),
      '@entities': path.resolve(__dirname, './src/entities'),
      '@network': path.resolve(__dirname, './src/network'),
      '@ui': path.resolve(__dirname, './src/ui'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Proxy REST API requests to Go API server
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // Proxy WebSocket to Go Game server
      '/ws': {
        target: 'ws://localhost:8081',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'public/assets/**/*',
          dest: 'assets',
        },
      ],
    }),
  ],
});
```

---

### 1.4 Create HTML Entry Point

**File**: `client/public/index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tank Royale 2 - Battle Royale</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            background: #000;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        }
        
        #game-container {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100vw;
            height: 100vh;
        }
        
        canvas {
            display: block;
            image-rendering: pixelated;
            image-rendering: crisp-edges;
        }
        
        #loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #fff;
            font-size: 24px;
            text-align: center;
        }
        
        .spinner {
            border: 4px solid rgba(255, 255, 255, 0.1);
            border-left-color: #fff;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div id="game-container">
        <div id="loading">
            <div class="spinner"></div>
            <div>Loading Tank Royale...</div>
        </div>
    </div>
    <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

---

## 🎬 Phase 2: Scene Architecture

### 2.1 Game Configuration

**File**: `client/src/config/game-config.ts`

```typescript
import Phaser from 'phaser';
import BootScene from '@scenes/BootScene';
import MenuScene from '@scenes/MenuScene';
import LobbyScene from '@scenes/LobbyScene';
import GameScene from '@scenes/GameScene';
import GameOverScene from '@scenes/GameOverScene';

export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // WebGL with Canvas fallback
  width: 1280,
  height: 720,
  parent: 'game-container',
  backgroundColor: '#2d2d2d',
  
  physics: {
    default: 'arcade',
    arcade: {
      debug: false, // Set to true for debugging
      gravity: { x: 0, y: 0 }, // Top-down game, no gravity
    },
  },
  
  scene: [
    BootScene,
    MenuScene,
    LobbyScene,
    GameScene,
    GameOverScene,
  ],
  
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  
  input: {
    keyboard: true,
    mouse: true,
    touch: false,
  },
  
  render: {
    pixelArt: false,
    antialias: true,
    antialiasGL: true,
    roundPixels: false,
  },
  
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
};
```

**File**: `client/src/config/constants.ts`

```typescript
/**
 * Game constants matching Go server configuration
 * Keep these in sync with go-server/internal/game/constants.go
 */

// Map constants
export const MAP_WIDTH = 4000;
export const MAP_HEIGHT = 4000;

// Player constants
export const PLAYER_RADIUS = 20.0;
export const PLAYER_BASE_SPEED = 5.0;
export const PLAYER_MAX_HEALTH = 100;
export const PLAYER_MAX_SHIELDS = 150; // 3 stacks × 50

// Weapon types
export enum WeaponType {
  PISTOL = 'pistol',
  RIFLE = 'rifle',
  SHOTGUN = 'shotgun',
  SNIPER = 'sniper',
}

// Weapon stats
export const WEAPON_STATS = {
  [WeaponType.PISTOL]: {
    damage: 15,
    fireRate: 0.5, // seconds
    range: 400,
    speed: 10,
  },
  [WeaponType.RIFLE]: {
    damage: 20,
    fireRate: 0.15,
    range: 500,
    speed: 12,
  },
  [WeaponType.SHOTGUN]: {
    damage: 35,
    fireRate: 1.0,
    range: 200,
    speed: 8,
  },
  [WeaponType.SNIPER]: {
    damage: 50,
    fireRate: 1.5,
    range: 800,
    speed: 15,
  },
};

// Loot types
export enum LootType {
  SHIELD = 'shield',
  DAMAGE_BOOST = 'damage_boost',
  FIRERATE_BOOST = 'firerate_boost',
  WEAPON_PISTOL = 'weapon_pistol',
  WEAPON_RIFLE = 'weapon_rifle',
  WEAPON_SHOTGUN = 'weapon_shotgun',
  WEAPON_SNIPER = 'weapon_sniper',
}

// Network constants
export const SERVER_TICK_RATE = 30; // TPS
export const SERVER_TICK_MS = 1000 / SERVER_TICK_RATE; // 33.33ms
export const CLIENT_FPS = 60;
export const INTERPOLATION_DELAY = 100; // ms

// API endpoints
export const API_BASE_URL = 'http://localhost:8080';
export const WS_BASE_URL = 'ws://localhost:8081';

// Colors
export const COLORS = {
  PRIMARY: 0x00ff00,
  DANGER: 0xff0000,
  WARNING: 0xffaa00,
  INFO: 0x00aaff,
  SAFE_ZONE: 0x00ff0044,
  DANGER_ZONE: 0xff000044,
};
```

---

### 2.2 Scene Implementation

**File**: `client/src/scenes/BootScene.ts`

```typescript
import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Display loading progress
    this.createLoadingBar();

    // Load assets
    this.loadImages();
    this.loadSounds();
  }

  create() {
    // Remove loading screen
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'none';
    }

    // Start menu scene
    this.scene.start('MenuScene');
  }

  private createLoadingBar() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontSize: '20px',
      color: '#ffffff',
    });
    loadingText.setOrigin(0.5, 0.5);

    const percentText = this.add.text(width / 2, height / 2, '0%', {
      fontSize: '18px',
      color: '#ffffff',
    });
    percentText.setOrigin(0.5, 0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x00ff00, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
      percentText.setText(`${Math.floor(value * 100)}%`);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
    });
  }

  private loadImages() {
    // TODO: Load actual sprite assets
    // this.load.image('tank', 'assets/sprites/tank.png');
    // this.load.image('bullet', 'assets/sprites/bullet.png');
    // this.load.image('shield', 'assets/sprites/loot/shield.png');
  }

  private loadSounds() {
    // TODO: Load actual sound assets
    // this.load.audio('shoot-pistol', 'assets/sounds/shoot-pistol.mp3');
    // this.load.audio('hit', 'assets/sounds/hit.mp3');
  }
}
```

**File**: `client/src/scenes/MenuScene.ts`

```typescript
import Phaser from 'phaser';
import { APIClient } from '@network/APIClient';

export default class MenuScene extends Phaser.Scene {
  private apiClient!: APIClient;
  private domElements: HTMLElement[] = [];

  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    this.apiClient = new APIClient();

    // Check if already logged in
    const token = localStorage.getItem('token');
    if (token) {
      this.showMainMenu();
    } else {
      this.showLoginForm();
    }
  }

  private showLoginForm() {
    // Implementation in Phase 3
    console.log('TODO: Show login form');
  }

  private showMainMenu() {
    // Implementation in Phase 3
    console.log('TODO: Show main menu');
  }

  shutdown() {
    // Clean up DOM elements
    this.domElements.forEach(el => el.remove());
    this.domElements = [];
  }
}
```

**File**: `client/src/scenes/LobbyScene.ts`

```typescript
import Phaser from 'phaser';
import { WebSocketManager } from '@network/WebSocketManager';

export default class LobbyScene extends Phaser.Scene {
  private wsManager!: WebSocketManager;

  constructor() {
    super({ key: 'LobbyScene' });
  }

  create() {
    this.wsManager = WebSocketManager.getInstance();
    
    // Display waiting for players UI
    this.add.text(640, 360, 'Waiting for players...', {
      fontSize: '32px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Listen for game start
    this.wsManager.on('game_start', this.onGameStart, this);
  }

  private onGameStart() {
    this.scene.start('GameScene');
  }

  shutdown() {
    this.wsManager.off('game_start', this.onGameStart, this);
  }
}
```

**File**: `client/src/scenes/GameScene.ts`

```typescript
import Phaser from 'phaser';
import { WebSocketManager } from '@network/WebSocketManager';
import { InputManager } from '@/systems/InputManager';

export default class GameScene extends Phaser.Scene {
  private wsManager!: WebSocketManager;
  private inputManager!: InputManager;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    // Initialize systems
    this.wsManager = WebSocketManager.getInstance();
    this.inputManager = new InputManager(this);

    // Set up world bounds
    this.physics.world.setBounds(0, 0, 4000, 4000);

    // TODO: Implement game rendering (Phase 4)
    console.log('GameScene created - ready for game logic');
  }

  update(time: number, delta: number) {
    // TODO: Update game state (Phase 4)
  }
}
```

**File**: `client/src/scenes/GameOverScene.ts`

```typescript
import Phaser from 'phaser';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: { placement: number; kills: number; damage: number }) {
    const { placement, kills, damage } = data;

    // Display results
    this.add.text(640, 200, 'Game Over', {
      fontSize: '48px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(640, 300, `Placement: #${placement}`, {
      fontSize: '32px',
      color: '#00ff00',
    }).setOrigin(0.5);

    this.add.text(640, 350, `Kills: ${kills}`, {
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(640, 400, `Damage: ${damage}`, {
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Return to menu button
    const button = this.add.text(640, 500, 'Return to Menu', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive();

    button.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });
  }
}
```

---

### 2.3 Main Entry Point

**File**: `client/src/main.ts`

```typescript
import Phaser from 'phaser';
import { GAME_CONFIG } from '@/config/game-config';

// Initialize Phaser game
const game = new Phaser.Game(GAME_CONFIG);

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

// Handle page visibility (pause game when tab is hidden)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    game.pause();
  } else {
    game.resume();
  }
});

// Export game instance for debugging
(window as any).game = game;

console.log('🎮 Tank Royale 2 - Game initialized');
```

---

## 🌐 Phase 3: Network Layer

### 3.1 REST API Client

**File**: `client/src/network/APIClient.ts`

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_BASE_URL } from '@/config/constants';
import type { 
  RegisterRequest, 
  LoginRequest, 
  AuthResponse, 
  User,
  LeaderboardEntry,
  PlayerStats,
} from '@types/index';

export class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('token');
          window.location.reload();
        }
        return Promise.reject(error);
      }
    );
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/api/auth/register', data);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/api/auth/login', data);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  }

  async getMe(): Promise<User> {
    const response = await this.client.get<User>('/api/auth/me');
    return response.data;
  }

  async getLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
    const response = await this.client.get<LeaderboardEntry[]>('/api/leaderboard', {
      params: { limit },
    });
    return response.data;
  }

  async getStats(playerID: string): Promise<PlayerStats> {
    const response = await this.client.get<PlayerStats>(`/api/stats/${playerID}`);
    return response.data;
  }

  logout() {
    localStorage.removeItem('token');
  }
}
```

---

### 3.2 WebSocket Manager

**File**: `client/src/network/WebSocketManager.ts`

```typescript
import Phaser from 'phaser';
import { WS_BASE_URL } from '@/config/constants';
import type { GameState, NetworkMessage } from '@types/network';

export class WebSocketManager extends Phaser.Events.EventEmitter {
  private static instance: WebSocketManager;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;

  private constructor() {
    super();
  }

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem('token');
      if (!token) {
        reject(new Error('No authentication token'));
        return;
      }

      const wsUrl = `${WS_BASE_URL}/ws?token=${token}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: NetworkMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnected = false;
        this.emit('disconnected');
        this.attemptReconnect();
      };
    });
  }

  private handleMessage(message: NetworkMessage) {
    switch (message.type) {
      case 'game_state':
        this.emit('game_state', message.data as GameState);
        break;
      case 'player_hit':
        this.emit('player_hit', message.data);
        break;
      case 'loot_collected':
        this.emit('loot_collected', message.data);
        break;
      case 'player_died':
        this.emit('player_died', message.data);
        break;
      case 'game_start':
        this.emit('game_start', message.data);
        break;
      case 'game_over':
        this.emit('game_over', message.data);
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  send(type: string, data: any) {
    if (!this.isConnected || !this.ws) {
      console.warn('Cannot send message: WebSocket not connected');
      return;
    }

    const message: NetworkMessage = { type, data };
    this.ws.send(JSON.stringify(message));
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('reconnect_failed');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, this.reconnectDelay * this.reconnectAttempts);
  }
}
```

---

## 🎨 Phase 4-7: Additional Implementation

> The remaining phases (Game Rendering, Client Prediction, UI/HUD, Visual Polish) will be detailed in subsequent steps as we progress through the implementation.

---

## ✅ Testing Strategy

### Unit Tests (Future)
- Vector2D math operations
- Interpolation functions
- State history buffering

### Integration Tests
- WebSocket connection/reconnection
- API authentication flow
- Scene transitions

### Manual Testing Checklist
- [ ] Login/Register flow works
- [ ] WebSocket connects successfully
- [ ] Game renders at 60 FPS
- [ ] Input feels responsive
- [ ] Other players move smoothly
- [ ] UI displays correctly
- [ ] Sounds play at appropriate times

---

## 🚀 Performance Optimization

### Rendering Optimizations
- Use object pooling for projectiles and particles
- Implement frustum culling (only render visible entities)
- Use sprite sheets instead of individual images
- Batch draw calls when possible

### Network Optimizations
- Buffer incoming state updates (100ms)
- Implement delta compression for state updates
- Prioritize critical updates (hits, deaths)

### Memory Management
- Clean up DOM elements on scene transitions
- Destroy unused textures
- Implement entity despawning for off-screen objects

---

## 📝 Next Steps

1. **Run setup commands**:
   ```bash
   cd client
   npm install
   npm run dev
   ```

2. **Verify basic setup**:
   - Open http://localhost:5173
   - Should see BootScene → MenuScene

3. **Implement network layer** (Phase 3)

4. **Build MenuScene with login** (Phase 3)

5. **Implement GameScene rendering** (Phase 4)

---

## 🎯 Success Criteria

- ✅ Dev server runs on http://localhost:5173
- ✅ TypeScript compilation has no errors
- ✅ All scenes load correctly
- ✅ WebSocket connects to Go server
- ✅ REST API calls work (login, register)
- ✅ Game renders at 60 FPS
- ✅ Input is responsive
- ✅ Network updates are smooth

---

## ☁️ Cloud Deployment Strategy

### Overview

Our architecture separates **client (frontend)** and **server (backend)**, allowing independent scaling and deployment.

```
┌─────────────────────────────────────────────────────────────┐
│                     PRODUCTION ARCHITECTURE                  │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   CDN/Edge   │         │  API Server  │         │ Game Server  │
│              │         │              │         │              │
│  Cloudflare  │ ──────▶ │   Go API     │ ──────▶ │  Go Game     │
│  /Vercel     │         │  (REST API)  │         │ (WebSocket)  │
│              │         │  Port 8080   │         │  Port 8081   │
└──────────────┘         └──────────────┘         └──────────────┘
       │                        │                         │
       │                        │                         │
       ▼                        ▼                         ▼
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Client     │         │  PostgreSQL  │         │    Redis     │
│   (Phaser)   │         │  (RDS/Supabase)│       │ (ElastiCache)│
│   Static     │         │              │         │              │
└──────────────┘         └──────────────┘         └──────────────┘
```

---

### 🎯 Deployment Options Comparison

| Component | Option 1 (Cheapest) | Option 2 (Balanced) | Option 3 (Enterprise) |
|-----------|---------------------|---------------------|----------------------|
| **Frontend** | Vercel Free | Vercel Pro | AWS CloudFront + S3 |
| **API Server** | Railway/Render | AWS EC2 t3.small | AWS ECS Fargate |
| **Game Server** | Railway/Render | AWS EC2 t3.medium | AWS ECS Fargate |
| **Database** | Supabase Free | Supabase Pro | AWS RDS Multi-AZ |
| **Redis** | Upstash Free | Upstash Pro | AWS ElastiCache |
| **Monitoring** | Prometheus local | Grafana Cloud Free | AWS CloudWatch |
| **Cost/Month** | $0-20 | $50-150 | $200-500 |
| **Users Supported** | 100-500 | 1,000-5,000 | 10,000+ |

---

### 🚀 Option 1: Budget-Friendly (Recommended for Launch)

**Perfect for**: MVP, portfolio, testing, 100-500 concurrent users

#### Frontend Deployment (Vercel - FREE)

**Why Vercel?**
- ✅ Free tier is generous (100 GB bandwidth/month)
- ✅ Automatic deployments from GitHub
- ✅ Global CDN (300+ edge locations)
- ✅ Zero config for Vite projects
- ✅ SSL certificates automatic
- ✅ Preview deployments for PRs

**Setup Steps:**

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy from client directory
cd client
vercel

# 4. Set environment variables in Vercel dashboard
VITE_API_URL=https://your-api.railway.app
VITE_WS_URL=wss://your-game.railway.app
```

**Configuration File**: `client/vercel.json`

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/assets/(.*)",
      "headers": {
        "cache-control": "public, max-age=31536000, immutable"
      }
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

**Cost**: $0 (Free tier sufficient for launch)

---

#### Backend Deployment (Railway - $5/month)

**Why Railway?**
- ✅ Deploy from GitHub with one click
- ✅ Free $5 credit/month
- ✅ PostgreSQL + Redis included
- ✅ Automatic HTTPS
- ✅ Simple environment variables
- ✅ Good for Go applications

**Setup Steps:**

```bash
# 1. Create railway.toml in go-server/
[build]
builder = "nixpacks"
buildCommand = "make build"

[deploy]
startCommand = "./bin/api"
healthcheckPath = "/health"
healthcheckTimeout = 10

# 2. Push to GitHub
git push origin main

# 3. Connect Railway to your GitHub repo
# Visit https://railway.app and link repo

# 4. Add environment variables in Railway dashboard
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=your-secret-key
```

**Create separate services for**:
- API Server (bin/api)
- Game Server (bin/game)
- PostgreSQL (Railway built-in)
- Redis (Railway built-in)

**Cost**: ~$5/month (within free tier)

---

#### Alternative: Render.com (Similar to Railway)

**Why Render?**
- ✅ $0 free tier for web services
- ✅ PostgreSQL + Redis included
- ✅ Auto-deploy from GitHub
- ✅ Simple scaling

**Cost**: $0 (free tier), $7/month for paid tier

---

### 🌟 Option 2: Production-Ready (AWS - Balanced)

**Perfect for**: Serious deployment, 1,000-5,000 users, scalable

#### Frontend: CloudFront + S3

```bash
# Build client
cd client
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

**Cost**: ~$5-10/month (S3 + CloudFront)

---

#### Backend: EC2 Instances

**API Server**: t3.small (2 vCPU, 2 GB RAM) - $15/month
**Game Server**: t3.medium (2 vCPU, 4 GB RAM) - $30/month

**Auto Scaling Group**: Scale to 2-5 instances based on CPU

**Setup with Terraform**:

```hcl
# ec2.tf
resource "aws_instance" "api_server" {
  ami           = "ami-0c55b159cbfafe1f0" # Amazon Linux 2
  instance_type = "t3.small"
  
  user_data = <<-EOF
    #!/bin/bash
    # Install Go
    yum install -y golang
    
    # Clone repo
    git clone https://github.com/erceozmet/Tank-Royale-2.git
    cd Tank-Royale-2/go-server
    
    # Build
    make build
    
    # Run with systemd
    cp api.service /etc/systemd/system/
    systemctl enable api
    systemctl start api
  EOF
  
  tags = {
    Name = "tank-royale-api"
  }
}
```

**Cost**: ~$45/month (EC2 instances)

---

#### Database: RDS PostgreSQL

**Configuration**:
- Instance: db.t3.small (2 vCPU, 2 GB RAM)
- Storage: 20 GB SSD
- Multi-AZ: No (for cost savings, enable for production)
- Automated backups: 7 days

**Cost**: ~$25/month

---

#### Redis: ElastiCache

**Configuration**:
- Instance: cache.t3.small (1.37 GB memory)
- Nodes: 1 (or 2 for high availability)
- No cluster mode needed

**Cost**: ~$20/month

---

#### Load Balancer: Application Load Balancer

**Routes**:
- `/api/*` → API Server
- `/ws` → Game Server (WebSocket sticky sessions)

**Cost**: ~$20/month

---

**Total AWS Cost**: ~$125/month

---

### 🏢 Option 3: Enterprise Grade (AWS Full Stack)

**Perfect for**: 10,000+ users, high availability, auto-scaling

#### Architecture

```
Internet
   │
   ▼
Route 53 (DNS) → CloudFront (CDN) → S3 (Static)
   │
   ├─▶ ALB → ECS Fargate (API Servers)
   │              │
   │              ▼
   │           RDS (Multi-AZ)
   │              │
   │              ▼
   │         ElastiCache (Cluster)
   │
   └─▶ NLB → ECS Fargate (Game Servers)
```

**Features**:
- ✅ Auto-scaling (scale to 100+ instances)
- ✅ Multi-region deployment
- ✅ 99.99% uptime SLA
- ✅ DDoS protection (AWS Shield)
- ✅ WAF (Web Application Firewall)
- ✅ CloudWatch monitoring
- ✅ Automated backups and disaster recovery

**Cost**: $200-500/month (scales with usage)

---

### 📊 Deployment Workflow (CI/CD)

#### GitHub Actions Pipeline

**File**: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  # Test Go servers
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      - name: Run tests
        run: |
          cd go-server
          go test ./...
          
  # Build and deploy client
  deploy-frontend:
    runs-on: ubuntu-latest
    needs: test-backend
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Build client
        run: |
          cd client
          npm ci
          npm run build
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./client
          
  # Deploy backend to Railway/AWS
  deploy-backend:
    runs-on: ubuntu-latest
    needs: test-backend
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy API Server
        # Railway auto-deploys on push to main
        run: echo "Railway deployment triggered"
```

---

### 🔒 Security Considerations

#### SSL/TLS
- ✅ Vercel: Automatic SSL (Let's Encrypt)
- ✅ Railway: Automatic SSL
- ✅ AWS: ACM (AWS Certificate Manager) - free

#### Environment Variables
```bash
# Never commit these!
JWT_SECRET=use-a-strong-random-string
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
STEAM_API_KEY=...
```

#### CORS Configuration
```go
// go-server/cmd/api/main.go
cors.New(cors.Options{
    AllowedOrigins: []string{
        "https://tankroyale.com",
        "https://www.tankroyale.com",
    },
    AllowedMethods: []string{"GET", "POST", "PUT", "DELETE"},
    AllowCredentials: true,
})
```

#### Rate Limiting (Already implemented in Go server!)
```go
// Already in middleware/rate_limiter.go
// 100 requests per IP per minute
```

---

### 📈 Scaling Strategy

#### Phase 1: Launch (100-500 users)
- Vercel (frontend)
- Railway (backend)
- **Cost**: $5-20/month

#### Phase 2: Growth (500-2,000 users)
- Vercel Pro (frontend)
- Railway Pro or AWS t3.small
- Supabase Pro or RDS
- **Cost**: $50-100/month

#### Phase 3: Scale (2,000-10,000 users)
- AWS CloudFront + S3
- AWS ECS or EC2 with auto-scaling
- RDS Multi-AZ
- ElastiCache
- **Cost**: $200-500/month

#### Phase 4: Massive Scale (10,000+ users)
- Multi-region deployment
- DDoS protection
- CDN optimization
- Database read replicas
- **Cost**: $500-2,000/month

---

### 🛠️ Monitoring & Analytics

#### Already Configured:
- ✅ Prometheus (metrics)
- ✅ Grafana (dashboards)

#### Add for Production:
- **Sentry**: Error tracking
- **Google Analytics**: User tracking
- **Mixpanel**: Game analytics
- **Datadog/New Relic**: APM (optional)

```bash
# Add Sentry to client
npm install @sentry/browser

# In client/src/main.ts
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: "production",
  tracesSampleRate: 0.1,
});
```

---

### 🎯 Recommended Deployment Path

**Step 1: MVP Launch (Week 1)**
```bash
# Deploy to free tiers
- Vercel (frontend) - FREE
- Railway (backend) - $5/month
- Supabase (database) - FREE

Total: $5/month
Users: 100-500 concurrent
```

**Step 2: User Feedback (Weeks 2-4)**
- Monitor performance
- Fix bugs
- Gather feedback
- Optimize

**Step 3: Scale if Successful (Month 2+)**
- Move to AWS if needed
- Set up auto-scaling
- Add CDN caching
- Implement monitoring alerts

---

### 📝 Deployment Checklist

#### Pre-Deployment
- [ ] Run all tests (`make test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Environment variables configured
- [ ] SSL certificates ready
- [ ] Database migrations tested
- [ ] Backup strategy in place

#### Post-Deployment
- [ ] Health checks pass
- [ ] WebSocket connects successfully
- [ ] API endpoints respond
- [ ] Metrics flowing to Grafana
- [ ] Error tracking working (Sentry)
- [ ] DNS propagated
- [ ] Load testing completed

#### Monitoring
- [ ] Set up uptime monitoring (UptimeRobot - free)
- [ ] Configure alerts (server down, high latency)
- [ ] Daily backups automated
- [ ] Log aggregation (CloudWatch/Datadog)

---

### 💡 Pro Tips

1. **Start Small**: Use free tiers, validate game mechanics first
2. **Cache Aggressively**: Use CloudFlare for CDN + DDoS protection (free tier)
3. **Monitor Everything**: Prometheus + Grafana already set up!
4. **Automate Deployments**: GitHub Actions for CI/CD
5. **Budget Alerts**: Set AWS billing alarms at $50, $100, $200
6. **Database Backups**: Daily automated backups (S3 + lifecycle policy)
7. **Feature Flags**: Use LaunchDarkly or custom feature flags
8. **Blue-Green Deployment**: Zero-downtime updates

---

**Ready to implement?** Let's start with Phase 1! 🚀
