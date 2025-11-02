/**
 * Shared TypeScript interfaces and types
 */

// ============ Player Types ============

export interface Vector2 {
  x: number;
  y: number;
}

export interface PlayerState {
  id: string;
  username: string;
  position: Vector2;
  rotation: number; // radians
  health: number;
  maxHealth: number;
  velocity: Vector2;
  isAlive: boolean;
  kills: number;
  damage: number;
  inventory: PlayerInventory;
  lastShotTime: number;
  isInvulnerable: boolean;
}

export interface PlayerInventory {
  weapon: WeaponType;
  armor: number;
  shield: number;
  consumables: Consumable[];
}

// ============ Game Entity Types ============

export interface Projectile {
  id: string;
  playerId: string;
  position: Vector2;
  velocity: Vector2;
  damage: number;
  createdAt: number;
}

export interface Loot {
  id: string;
  position: Vector2;
  type: LootType;
  value: number;
  spawnedAt: number;
}

export interface Obstacle {
  id: string;
  position: Vector2;
  width: number;
  height: number;
  type: ObstacleType;
}

// ============ Enums ============

export enum WeaponType {
  PISTOL = 'PISTOL',
  RIFLE = 'RIFLE',
  SHOTGUN = 'SHOTGUN',
  SNIPER = 'SNIPER',
}

export enum LootType {
  WEAPON_UPGRADE = 'WEAPON_UPGRADE',
  ARMOR = 'ARMOR',
  SHIELD = 'SHIELD',
  HEALTH_PACK = 'HEALTH_PACK',
  SPEED_BOOST = 'SPEED_BOOST',
  DAMAGE_BOOST = 'DAMAGE_BOOST',
}

export enum ObstacleType {
  ROCK = 'ROCK',
  TREE = 'TREE',
  BUILDING = 'BUILDING',
  WALL = 'WALL',
}

export interface Consumable {
  type: LootType;
  quantity: number;
  effect?: TemporaryEffect;
}

export interface TemporaryEffect {
  type: 'SPEED' | 'DAMAGE' | 'SHIELD';
  multiplier: number;
  expiresAt: number;
}

// ============ Game State ============

export interface GameState {
  tick: number;
  timestamp: number;
  players: Map<string, PlayerState>;
  projectiles: Projectile[];
  loot: Loot[];
  obstacles: Obstacle[];
  safeZone: SafeZone;
  gamePhase: GamePhase;
}

export interface SafeZone {
  center: Vector2;
  radius: number;
  nextCenter: Vector2;
  nextRadius: number;
  shrinkStartTime: number;
  shrinkEndTime: number;
}

export enum GamePhase {
  WAITING = 'WAITING',
  STARTING = 'STARTING',
  PLAYING = 'PLAYING',
  SHRINKING = 'SHRINKING',
  ENDING = 'ENDING',
  FINISHED = 'FINISHED',
}

// ============ Network Messages ============

export enum MessageType {
  // Client -> Server
  PLAYER_INPUT = 'PLAYER_INPUT',
  PLAYER_SHOOT = 'PLAYER_SHOOT',
  PLAYER_USE_ITEM = 'PLAYER_USE_ITEM',
  
  // Server -> Client
  GAME_STATE = 'GAME_STATE',
  STATE_DELTA = 'STATE_DELTA',
  PLAYER_JOINED = 'PLAYER_JOINED',
  PLAYER_LEFT = 'PLAYER_LEFT',
  PLAYER_DIED = 'PLAYER_DIED',
  PLAYER_HIT = 'PLAYER_HIT',
  LOOT_COLLECTED = 'LOOT_COLLECTED',
  GAME_OVER = 'GAME_OVER',
  
  // Bidirectional
  PING = 'PING',
  PONG = 'PONG',
}

export interface PlayerInputMessage {
  type: MessageType.PLAYER_INPUT;
  timestamp: number;
  input: {
    mousePosition: Vector2;
    rotation: number;
    velocity: Vector2;
  };
}

export interface PlayerShootMessage {
  type: MessageType.PLAYER_SHOOT;
  timestamp: number;
  direction: Vector2;
}

export interface GameStateMessage {
  type: MessageType.GAME_STATE;
  tick: number;
  timestamp: number;
  nearbyPlayers: PlayerState[];
  projectiles: Projectile[];
  nearbyLoot: Loot[];
  safeZone: SafeZone;
  gamePhase: GamePhase;
}

export interface StateDeltaMessage {
  type: MessageType.STATE_DELTA;
  tick: number;
  timestamp: number;
  changedPlayers: Partial<PlayerState>[];
  newProjectiles: Projectile[];
  removedProjectiles: string[];
  collectedLoot: string[];
  newLoot: Loot[];
}

// ============ Database Models ============

export interface User {
  userId: string;
  username: string;
  email: string;
  passwordHash: string;
  totalWins: number;
  totalLosses: number;
  totalKills: number;
  totalDeaths: number;
  mmr: number;
  createdAt: Date;
  lastLogin: Date;
}

export interface Match {
  matchId: string;
  startTime: Date;
  endTime: Date;
  mapName: string;
  playerCount: number;
  duration: number;
}

export interface MatchResult {
  matchId: string;
  userId: string;
  placement: number;
  kills: number;
  damageDealt: number;
  survivalTime: number;
  lootCollected: number;
  mmrChange: number;
}

// ============ API Types ============

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    userId: string;
    username: string;
    mmr: number;
  };
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  wins: number;
  kills: number;
  mmr: number;
}

export interface MatchHistoryEntry {
  matchId: string;
  timestamp: Date;
  placement: number;
  kills: number;
  survivalTime: number;
  mmrChange: number;
}
