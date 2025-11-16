/**
 * TypeScript type definitions matching Go server models
 * Keep these in sync with go-server/internal/models/
 */

// ============================================================================
// Authentication & User Types
// ============================================================================

export interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ============================================================================
// Stats & Leaderboard Types
// ============================================================================

export interface PlayerStats {
  user_id: string;
  wins: number;
  losses: number;
  kills: number;
  deaths: number;
  damage_dealt: number;
  damage_taken: number;
  games_played: number;
  total_playtime: number;
  avg_placement: number;
  highest_placement: number;
  mmr: number;
}

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  mmr: number;
  wins: number;
  kills: number;
  rank: number;
}

// ============================================================================
// Vector & Math Types
// ============================================================================

export interface Vector2D {
  x: number;
  y: number;
}

// ============================================================================
// Game Entity Types
// ============================================================================

export enum WeaponType {
  PISTOL = 'pistol',
  RIFLE = 'rifle',
  SHOTGUN = 'shotgun',
  SNIPER = 'sniper',
}

export interface Weapon {
  type: WeaponType;
  damage: number;
  fire_rate: number;
  range: number;
  speed: number;
  last_fire_time?: number;
}

export interface Player {
  id: string;
  username: string;
  position: Vector2D;
  velocity: Vector2D;
  rotation: number;
  health: number;
  max_health: number;
  shields: number;
  current_weapon: WeaponType;
  weapons: Weapon[];
  speed: number;
  damage_boost: number;
  fire_rate_boost: number;
  is_alive: boolean;
  kills: number;
  damage_dealt: number;
}

export interface Projectile {
  id: string;
  owner_id: string;
  position: Vector2D;
  velocity: Vector2D;
  damage: number;
  weapon_type: WeaponType;
  created_at: number;
}

export enum LootType {
  SHIELD = 'shield',
  DAMAGE_BOOST = 'damage_boost',
  FIRERATE_BOOST = 'firerate_boost',
  WEAPON_PISTOL = 'weapon_pistol',
  WEAPON_RIFLE = 'weapon_rifle',
  WEAPON_SHOTGUN = 'weapon_shotgun',
  WEAPON_SNIPER = 'weapon_sniper',
}

export interface Loot {
  id: string;
  type: LootType;
  position: Vector2D;
  value: number;
}

export interface Obstacle {
  id: string;
  position: Vector2D;
  radius: number;
}

// ============================================================================
// Game State Types
// ============================================================================

export enum MatchStatus {
  WAITING = 'waiting',
  STARTING = 'starting',
  ACTIVE = 'active',
  FINISHED = 'finished',
}

export interface SafeZone {
  center: Vector2D;
  current_radius: number;
  target_radius: number;
  shrink_rate: number;
  damage_per_tick: number;
}

export interface GameState {
  match_id: string;
  status: MatchStatus;
  tick: number;
  timestamp: number;
  players: Player[];
  projectiles: Projectile[];
  loot: Loot[];
  obstacles: Obstacle[];
  safe_zone: SafeZone;
  players_alive: number;
  total_players: number;
}

// ============================================================================
// Network Message Types
// ============================================================================

export enum MessageType {
  // Client -> Server
  PLAYER_INPUT = 'player_input',
  SHOOT = 'shoot',
  COLLECT_LOOT = 'collect_loot',
  SWITCH_WEAPON = 'switch_weapon',
  
  // Server -> Client
  GAME_STATE = 'game_state',
  PLAYER_HIT = 'player_hit',
  PLAYER_DIED = 'player_died',
  LOOT_COLLECTED = 'loot_collected',
  GAME_START = 'game_start',
  GAME_OVER = 'game_over',
  ERROR = 'error',
}

export interface NetworkMessage {
  type: MessageType | string;
  data: any;
}

// Client -> Server messages
export interface PlayerInputMessage {
  sequence: number;
  timestamp: number;
  movement: {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
  };
  rotation: number;
  shoot: boolean;
}

export interface ShootMessage {
  timestamp: number;
  rotation: number;
  position: Vector2D;
}

export interface CollectLootMessage {
  loot_id: string;
}

export interface SwitchWeaponMessage {
  weapon_type: WeaponType;
}

// Server -> Client messages
export interface PlayerHitMessage {
  player_id: string;
  damage: number;
  health_remaining: number;
  shields_remaining: number;
  attacker_id: string;
}

export interface PlayerDiedMessage {
  player_id: string;
  killer_id: string;
  placement: number;
}

export interface LootCollectedMessage {
  player_id: string;
  loot_id: string;
  loot_type: LootType;
}

export interface GameStartMessage {
  match_id: string;
  player_count: number;
  map_size: Vector2D;
}

export interface GameOverMessage {
  winner_id: string;
  winner_username: string;
  placement: number;
  kills: number;
  damage_dealt: number;
  survival_time: number;
}

// ============================================================================
// Matchmaking Types
// ============================================================================

export interface MatchmakingStatus {
  in_queue: boolean;
  queue_position: number;
  estimated_wait_time: number;
  players_in_queue: number;
}

// ============================================================================
// Client-Side Prediction Types
// ============================================================================

export interface PredictedState {
  sequence: number;
  timestamp: number;
  position: Vector2D;
  velocity: Vector2D;
  rotation: number;
}

export interface InputState {
  sequence: number;
  timestamp: number;
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  rotation: number;
  shoot: boolean;
}

// ============================================================================
// Error Types
// ============================================================================

export interface ErrorResponse {
  error: string;
  message: string;
  status_code: number;
}

export interface SuccessResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}
