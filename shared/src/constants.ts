/**
 * Game Configuration Constants
 */

// Game Loop
export const SERVER_TICK_RATE = 30; // 30 ticks per second
export const TICK_INTERVAL = 1000 / SERVER_TICK_RATE; // 33.33ms
export const CLIENT_FPS = 60;

// Lobby Settings
export const MIN_PLAYERS = 2; // For testing
export const MAX_PLAYERS = 16;
export const LOBBY_START_COUNTDOWN = 5000; // 5 seconds

// Map Settings
export const MAP_WIDTH = 4000;
export const MAP_HEIGHT = 4000;
export const SAFE_ZONE_SHRINK_START = 120000; // 2 minutes
export const SAFE_ZONE_SHRINK_DURATION = 180000; // 3 minutes
export const SAFE_ZONE_DAMAGE_PER_TICK = 2;

// Player Settings
export const PLAYER_MAX_HEALTH = 100;
export const PLAYER_RADIUS = 20;
export const PLAYER_BASE_SPEED = 5; // units per tick
export const PLAYER_RESPAWN_INVULNERABILITY = 3000; // 3 seconds

// Weapon Settings
export const WEAPON_FIRE_RATE = 500; // ms between shots
export const WEAPON_BASE_DAMAGE = 15;
export const PROJECTILE_SPEED = 10; // units per tick
export const PROJECTILE_LIFETIME = 3000; // 3 seconds
export const PROJECTILE_RADIUS = 5;

// Loot Settings
export const LOOT_SPAWN_COUNT = 50;
export const LOOT_RESPAWN_TIME = 30000; // 30 seconds
export const LOOT_PICKUP_RADIUS = 30;

// Networking
export const INTEREST_RADIUS = 800; // Only send entities within this distance
export const LAG_COMPENSATION_BUFFER = 200; // ms of history to keep
export const MAX_CLIENT_LAG = 500; // Max acceptable client lag
export const DISCONNECT_GRACE_PERIOD = 10000; // 10 seconds

// Validation
export const MAX_POSITION_DELTA = PLAYER_BASE_SPEED * 2; // Anti-speed hack
export const MAX_FIRE_RATE_VARIANCE = 0.9; // 10% tolerance

// Matchmaking
export const MMR_STARTING = 1000;
export const MMR_RANGE = 200; // Match players within ±200 MMR
export const MATCHMAKING_TIMEOUT = 30000; // 30 seconds
export const MMR_GAIN_WIN = 25;
export const MMR_LOSS = -10;

// Leaderboard
export const LEADERBOARD_TOP_N = 100;
export const LEADERBOARD_REFRESH_INTERVAL = 30000; // 30 seconds
