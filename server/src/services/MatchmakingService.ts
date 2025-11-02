import { AuthenticatedSocket, emitToUser, emitToUsers } from '../websocket';
import { RedisMatchmakingQueue } from '../db/redis';
import { userRepository } from '../repositories/UserRepository';
import { matchmakingQueueSize, activeMatches, matchesCreated } from '../middleware/metrics';

export interface MatchmakingPlayer {
  userId: string;
  username: string;
  mmr: number;
  socket: AuthenticatedSocket;
  joinedAt: number;
}

export interface Lobby {
  lobbyId: string;
  players: MatchmakingPlayer[];
  status: 'waiting' | 'starting' | 'playing' | 'ended';
  createdAt: number;
  mapName: string;
}

const activePlayers = new Map<string, MatchmakingPlayer>();
const activeLobbies = new Map<string, Lobby>();

// Matchmaking configuration
const MATCHMAKING_CONFIG = {
  PLAYERS_PER_MATCH: 16,
  MIN_PLAYERS_TO_START: 8, // Minimum players to start a match
  MMR_RANGE_INITIAL: 100, // Initial MMR search range
  MMR_RANGE_MAX: 500, // Maximum MMR range after expansion
  MMR_RANGE_EXPANSION: 50, // Expand range by this amount each iteration
  MATCHMAKING_INTERVAL: 2000, // Check queue every 2 seconds
  QUEUE_TIMEOUT: 300000, // 5 minutes timeout
};

let matchmakingInterval: NodeJS.Timeout | null = null;

/**
 * Start matchmaking service
 */
export function startMatchmaking() {
  if (matchmakingInterval) {
    console.log('⚠️  Matchmaking service already running');
    return;
  }

  console.log('✅ Starting matchmaking service');
  matchmakingInterval = setInterval(processMatchmakingQueue, MATCHMAKING_CONFIG.MATCHMAKING_INTERVAL);
}

/**
 * Stop matchmaking service
 */
export function stopMatchmaking() {
  if (matchmakingInterval) {
    clearInterval(matchmakingInterval);
    matchmakingInterval = null;
    console.log('✅ Matchmaking service stopped');
  }
}

/**
 * Add player to matchmaking queue
 */
export async function joinQueue(socket: AuthenticatedSocket): Promise<void> {
  const userId = socket.userId!;
  const username = socket.username!;

  // Check if already in queue
  if (activePlayers.has(userId)) {
    socket.emit('matchmaking:error', { message: 'Already in queue' });
    return;
  }

  try {
    // Get player MMR from database
    const user = await userRepository.findById(userId);
    if (!user) {
      socket.emit('matchmaking:error', { message: 'User not found' });
      return;
    }

    // Create player object
    const player: MatchmakingPlayer = {
      userId,
      username,
      mmr: user.mmr,
      socket,
      joinedAt: Date.now(),
    };

    // Add to local map
    activePlayers.set(userId, player);

    // Add to Redis queue
    await RedisMatchmakingQueue.addToQueue(userId, user.mmr);

    // Update metrics
    matchmakingQueueSize.set(await RedisMatchmakingQueue.getQueueSize());

    // Notify player
    socket.emit('matchmaking:joined', {
      userId,
      mmr: user.mmr,
      queueSize: await RedisMatchmakingQueue.getQueueSize(),
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      leaveQueue(userId).catch(console.error);
    });

    console.log(`✅ Player ${username} (${userId}) joined matchmaking queue (MMR: ${user.mmr})`);
  } catch (error) {
    console.error('Error joining queue:', error);
    socket.emit('matchmaking:error', { message: 'Failed to join queue' });
  }
}

/**
 * Remove player from matchmaking queue
 */
export async function leaveQueue(userId: string): Promise<void> {
  const player = activePlayers.get(userId);
  if (!player) {
    return;
  }

  try {
    // Remove from local map
    activePlayers.delete(userId);

    // Remove from Redis queue
    await RedisMatchmakingQueue.removeFromQueue(userId);

    // Update metrics
    matchmakingQueueSize.set(await RedisMatchmakingQueue.getQueueSize());

    // Notify player
    if (player.socket.connected) {
      player.socket.emit('matchmaking:left', { userId });
    }

    console.log(`✅ Player ${player.username} (${userId}) left matchmaking queue`);
  } catch (error) {
    console.error('Error leaving queue:', error);
  }
}

/**
 * Process matchmaking queue
 */
async function processMatchmakingQueue(): Promise<void> {
  try {
    const queueSize = await RedisMatchmakingQueue.getQueueSize();
    
    // Not enough players to make a match
    if (queueSize < MATCHMAKING_CONFIG.MIN_PLAYERS_TO_START) {
      return;
    }

    // Get all players in queue
    const queuedPlayers = await RedisMatchmakingQueue.getAllPlayers();
    
    // Sort by MMR
    queuedPlayers.sort((a, b) => a.mmr - b.mmr);

    // Try to form lobbies
    const lobbies: string[][] = [];
    const usedPlayers = new Set<string>();

    for (const player of queuedPlayers) {
      if (usedPlayers.has(player.userId)) continue;

      const mmrRange = calculateMMRRange(player.userId);
      const minMMR = player.mmr - mmrRange;
      const maxMMR = player.mmr + mmrRange;

      // Find players in MMR range
      const matchedPlayers = queuedPlayers.filter(p => 
        !usedPlayers.has(p.userId) &&
        p.mmr >= minMMR &&
        p.mmr <= maxMMR
      );

      // If we have enough players, create a lobby
      if (matchedPlayers.length >= MATCHMAKING_CONFIG.MIN_PLAYERS_TO_START) {
        const lobbyPlayers = matchedPlayers
          .slice(0, MATCHMAKING_CONFIG.PLAYERS_PER_MATCH)
          .map(p => p.userId);

        lobbies.push(lobbyPlayers);
        lobbyPlayers.forEach(id => usedPlayers.add(id));
      }
    }

    // Create lobbies
    for (const playerIds of lobbies) {
      await createLobby(playerIds);
    }

    // Check for timed-out players
    await checkQueueTimeouts();

  } catch (error) {
    console.error('Error processing matchmaking queue:', error);
  }
}

/**
 * Calculate MMR range for matchmaking (expands over time)
 */
function calculateMMRRange(userId: string): number {
  const player = activePlayers.get(userId);
  if (!player) return MATCHMAKING_CONFIG.MMR_RANGE_INITIAL;

  const waitTime = Date.now() - player.joinedAt;
  const expansions = Math.floor(waitTime / 30000); // Expand every 30 seconds
  
  const range = MATCHMAKING_CONFIG.MMR_RANGE_INITIAL + 
                (expansions * MATCHMAKING_CONFIG.MMR_RANGE_EXPANSION);

  return Math.min(range, MATCHMAKING_CONFIG.MMR_RANGE_MAX);
}

/**
 * Create a lobby with matched players
 */
async function createLobby(playerIds: string[]): Promise<void> {
  try {
    const lobbyId = generateLobbyId();
    const players: MatchmakingPlayer[] = [];

    // Get player objects
    for (const userId of playerIds) {
      const player = activePlayers.get(userId);
      if (player) {
        players.push(player);
        activePlayers.delete(userId);
        await RedisMatchmakingQueue.removeFromQueue(userId);
      }
    }

    // Create lobby
    const lobby: Lobby = {
      lobbyId,
      players,
      status: 'waiting',
      createdAt: Date.now(),
      mapName: selectRandomMap(),
    };

    activeLobbies.set(lobbyId, lobby);

    // Update metrics
    activeMatches.set(activeLobbies.size);
    matchesCreated.inc();
    matchmakingQueueSize.set(await RedisMatchmakingQueue.getQueueSize());

    // Notify all players
    const playerData = players.map(p => ({
      userId: p.userId,
      username: p.username,
      mmr: p.mmr,
    }));

    emitToUsers(
      playerIds,
      'matchmaking:match_found',
      {
        lobbyId,
        players: playerData,
        mapName: lobby.mapName,
        playerCount: players.length,
      }
    );

    console.log(`✅ Created lobby ${lobbyId} with ${players.length} players`);

    // TODO: Start game server instance for this lobby
    // This will be implemented in Phase 4 (Game Server Core)
  } catch (error) {
    console.error('Error creating lobby:', error);
  }
}

/**
 * Check for players who have been in queue too long
 */
async function checkQueueTimeouts(): Promise<void> {
  const now = Date.now();

  for (const [userId, player] of activePlayers.entries()) {
    const queueTime = now - player.joinedAt;
    
    if (queueTime > MATCHMAKING_CONFIG.QUEUE_TIMEOUT) {
      // Notify player and remove from queue
      if (player.socket.connected) {
        player.socket.emit('matchmaking:timeout', {
          message: 'Matchmaking timed out. Please try again.',
        });
      }
      
      await leaveQueue(userId);
      console.log(`⏰ Player ${player.username} timed out in queue`);
    }
  }
}

/**
 * Generate unique lobby ID
 */
function generateLobbyId(): string {
  return `lobby_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Select random map
 */
function selectRandomMap(): string {
  const maps = ['Desert Valley', 'Arctic Wasteland', 'Urban Ruins', 'Forest Arena'];
  return maps[Math.floor(Math.random() * maps.length)];
}

/**
 * Get queue status for a player
 */
export async function getQueueStatus(userId: string): Promise<any> {
  const player = activePlayers.get(userId);
  
  if (!player) {
    return { inQueue: false };
  }

  const queueSize = await RedisMatchmakingQueue.getQueueSize();
  const queueTime = Date.now() - player.joinedAt;
  const mmrRange = calculateMMRRange(userId);

  return {
    inQueue: true,
    queueSize,
    queueTime,
    mmr: player.mmr,
    mmrRange,
  };
}

/**
 * Get active lobbies count
 */
export function getActiveLobbiesCount(): number {
  return activeLobbies.size;
}

/**
 * Get active players count
 */
export function getActivePlayersCount(): number {
  return activePlayers.size;
}

/**
 * Clear all state (for testing purposes)
 */
export function clearMatchmakingState(): void {
  activePlayers.clear();
  activeLobbies.clear();
  if (matchmakingInterval) {
    clearInterval(matchmakingInterval);
    matchmakingInterval = null;
  }
}
