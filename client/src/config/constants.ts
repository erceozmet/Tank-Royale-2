/**
 * blast.io - Game constants
 * Keep these in sync with go-server configuration
 */

// Map constants
export const MAP_WIDTH = 4000;
export const MAP_HEIGHT = 4000;

// Player constants - CIRCULAR PLAYERS
export const PLAYER_RADIUS = 25; // Increased for better visibility
export const PLAYER_BASE_SPEED = 250; // pixels per second
export const PLAYER_TURBO_SPEED = 400; // pixels per second with space
export const PLAYER_MAX_HEALTH = 100;

// Player colors - vibrant and distinct from white background
export const PLAYER_COLORS = [
  0xef4444, // Red
  0xf97316, // Orange
  0xf59e0b, // Amber
  0x84cc16, // Lime
  0x10b981, // Green
  0x14b8a6, // Teal
  0x06b6d4, // Cyan
  0x3b82f6, // Blue
  0x6366f1, // Indigo
  0x8b5cf6, // Purple
  0xec4899, // Pink
  0xf43f5e, // Rose
];

// Attack/bullet constants
export const BULLET_SPEED = 600; // pixels per second
export const BULLET_DAMAGE = 20;
export const BULLET_RADIUS = 5;
export const FIRE_RATE = 300; // milliseconds between shots

// Power-up types
export enum PowerUpType {
  SPEED = 'speed',
  DAMAGE = 'damage',
  HEALTH = 'health',
  SHIELD = 'shield',
  RAPID_FIRE = 'rapid_fire',
}

// Zone mechanics - matching your requirements
export const ZONE_CONFIG = {
  INITIAL_DELAY: 300000, // 5 minutes (300 seconds) before first zone close
  WARNING_TIME: 30000, // 30 seconds warning before zone closes
  CLOSE_INTERVAL: 120000, // 2 minutes between each zone close
  SHRINK_SPEED: 10, // pixels per second
};

// Network constants
export const SERVER_TICK_RATE = 30; // TPS
export const SERVER_TICK_MS = 1000 / SERVER_TICK_RATE;
export const CLIENT_FPS = 60;
export const INTERPOLATION_DELAY = 100; // ms

// API endpoints
export const API_BASE_URL = import.meta.env.PROD 
  ? 'https://your-api.railway.app' 
  : 'http://localhost:8080';

export const WS_BASE_URL = import.meta.env.PROD 
  ? 'wss://your-game.railway.app' 
  : 'ws://localhost:8081';

// Colors (hex for CSS/Phaser)
export const COLORS = {
  BACKGROUND: 0xffffff, // White
  GRID: 0xe5e7eb, // Light gray grid
  SAFE_ZONE: 0x3b82f6, // Blue
  DANGER_ZONE: 0xef4444, // Red
  BULLET: 0x000000, // Black
  HEALTH_BAR_BG: 0xe5e7eb,
  HEALTH_BAR_GOOD: 0x10b981, // Green
  HEALTH_BAR_WARNING: 0xf59e0b, // Orange
  HEALTH_BAR_DANGER: 0xef4444, // Red
};

// UI Constants
export const UI = {
  HEALTH_BAR_WIDTH: 40,
  HEALTH_BAR_HEIGHT: 4,
  MINIMAP_SIZE: 192,
  NAME_TAG_FONT_SIZE: 12,
  POWERUP_ICON_SIZE: 20,
};

