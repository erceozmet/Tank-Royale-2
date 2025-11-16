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

// Weapon stats (matching Go server)
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

// API endpoints (will use proxy in development, direct in production)
export const API_BASE_URL = import.meta.env.PROD 
  ? 'https://your-api.railway.app' 
  : 'http://localhost:8080';

export const WS_BASE_URL = import.meta.env.PROD 
  ? 'wss://your-game.railway.app' 
  : 'ws://localhost:8081';

// Colors
export const COLORS = {
  PRIMARY: 0x00ff00,
  DANGER: 0xff0000,
  WARNING: 0xffaa00,
  INFO: 0x00aaff,
  SAFE_ZONE: 0x00ff0044,
  DANGER_ZONE: 0xff000044,
  BACKGROUND: 0x2d2d2d,
  UI_DARK: 0x1a1a1a,
  UI_LIGHT: 0x333333,
};

// UI Constants
export const UI = {
  HEALTH_BAR_WIDTH: 200,
  HEALTH_BAR_HEIGHT: 20,
  MINIMAP_SIZE: 200,
  KILL_FEED_MAX: 5,
};
