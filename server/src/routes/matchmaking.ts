import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { getRedis } from '../db/redis';
import { userRepository, matchRepository } from '../repositories';

const router = Router();

const QUEUE_KEY = 'matchmaking:queue';
const QUEUE_TIMESTAMP_KEY = 'matchmaking:timestamps';
const MIN_PLAYERS = 2; // Minimum players to start a match
const MAX_PLAYERS = 16; // Maximum players in a match
const MMR_RANGE = 200; // Initial MMR range for matchmaking
const MAX_MMR_RANGE = 800; // Maximum MMR range after waiting

/**
 * POST /api/matchmaking/join
 * Join the matchmaking queue
 */
router.post('/join', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const username = (req as any).username;

    // Get user's MMR
    const user = await userRepository.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const mmr = user.mmr;
    const redis = getRedis();

    // Check if already in queue
    const inQueue = await redis.zScore(QUEUE_KEY, userId);
    if (inQueue !== null) {
      return res.status(409).json({ 
        error: 'Already in queue',
        queuePosition: await getQueuePosition(userId),
      });
    }

    // Add to queue (sorted set by MMR)
    await redis.zAdd(QUEUE_KEY, { score: mmr, value: userId });
    
    // Store join timestamp
    await redis.hSet(QUEUE_TIMESTAMP_KEY, userId, Date.now().toString());

    const queuePosition = await getQueuePosition(userId);
    const queueSize = await redis.zCard(QUEUE_KEY);

    res.json({
      message: 'Joined matchmaking queue',
      queuePosition,
      queueSize,
      estimatedWaitTime: estimateWaitTime(queueSize),
    });
  } catch (error) {
    console.error('[MATCHMAKING] Error joining queue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/matchmaking/leave
 * Leave the matchmaking queue
 */
router.delete('/leave', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const redis = getRedis();

    const removed = await redis.zRem(QUEUE_KEY, userId);
    await redis.hDel(QUEUE_TIMESTAMP_KEY, userId);

    if (removed === 0) {
      return res.status(404).json({ error: 'Not in queue' });
    }

    res.json({ message: 'Left matchmaking queue' });
  } catch (error) {
    console.error('[MATCHMAKING] Error leaving queue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/matchmaking/status
 * Get current queue status
 */
router.get('/status', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const redis = getRedis();

    const inQueue = await redis.zScore(QUEUE_KEY, userId);
    
    if (inQueue === null) {
      return res.json({
        inQueue: false,
        queueSize: await redis.zCard(QUEUE_KEY),
      });
    }

    const joinTime = await redis.hGet(QUEUE_TIMESTAMP_KEY, userId);
    const waitTime = joinTime ? Date.now() - parseInt(joinTime) : 0;
    const queuePosition = await getQueuePosition(userId);
    const queueSize = await redis.zCard(QUEUE_KEY);

    res.json({
      inQueue: true,
      queuePosition,
      queueSize,
      waitTime: Math.floor(waitTime / 1000), // Convert to seconds
      mmr: Math.round(inQueue),
    });
  } catch (error) {
    console.error('[MATCHMAKING] Error getting status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Helper: Get player's position in queue
 */
async function getQueuePosition(userId: string): Promise<number> {
  const redis = getRedis();
  const rank = await redis.zRank(QUEUE_KEY, userId);
  return rank !== null ? rank + 1 : 0;
}

/**
 * Helper: Estimate wait time based on queue size
 */
function estimateWaitTime(queueSize: number): string {
  if (queueSize < MIN_PLAYERS) {
    return 'Waiting for more players';
  }
  
  // Rough estimate: match starts every 60 seconds
  const matchesAhead = Math.floor(queueSize / MAX_PLAYERS);
  const seconds = matchesAhead * 60;
  
  if (seconds < 60) {
    return `~${seconds} seconds`;
  } else {
    return `~${Math.floor(seconds / 60)} minutes`;
  }
}

/**
 * Background matchmaker process
 * This should be called periodically (e.g., every 2 seconds)
 * In production, use a separate worker or cron job
 */
export async function processMatchmaking(): Promise<void> {
  try {
    const redis = getRedis();
    const queueSize = await redis.zCard(QUEUE_KEY);

    if (queueSize < MIN_PLAYERS) {
      return; // Not enough players
    }

    // Get all players in queue
    const players = await redis.zRangeWithScores(QUEUE_KEY, 0, -1);

    if (players.length < MIN_PLAYERS) {
      return;
    }

    // Group players by MMR proximity
    const matches: string[][] = [];
    let currentMatch: string[] = [];
    let currentMatchAvgMMR = 0;

    for (const player of players) {
      const playerMMR = player.score;
      
      if (currentMatch.length === 0) {
        // Start new match
        currentMatch.push(player.value);
        currentMatchAvgMMR = playerMMR;
      } else {
        // Check MMR range
        const mmrDiff = Math.abs(playerMMR - currentMatchAvgMMR);
        const waitTime = await getPlayerWaitTime(player.value);
        const maxRange = Math.min(MMR_RANGE + (waitTime / 10000), MAX_MMR_RANGE);

        if (mmrDiff <= maxRange && currentMatch.length < MAX_PLAYERS) {
          // Add to current match
          currentMatch.push(player.value);
          currentMatchAvgMMR = (currentMatchAvgMMR * (currentMatch.length - 1) + playerMMR) / currentMatch.length;
        } else if (currentMatch.length >= MIN_PLAYERS) {
          // Finalize current match and start new one
          matches.push([...currentMatch]);
          currentMatch = [player.value];
          currentMatchAvgMMR = playerMMR;
        } else {
          // Add anyway if not enough players yet
          currentMatch.push(player.value);
          currentMatchAvgMMR = (currentMatchAvgMMR * (currentMatch.length - 1) + playerMMR) / currentMatch.length;
        }
      }
    }

    // Add last match if it has enough players
    if (currentMatch.length >= MIN_PLAYERS) {
      matches.push(currentMatch);
    }

    // Create matches and remove players from queue
    for (const matchPlayers of matches) {
      await createMatch(matchPlayers);
      
      // Remove players from queue
      await redis.zRem(QUEUE_KEY, matchPlayers);
      await redis.hDel(QUEUE_TIMESTAMP_KEY, matchPlayers);
      
      console.log(`[MATCHMAKING] Created match with ${matchPlayers.length} players`);
    }
  } catch (error) {
    console.error('[MATCHMAKING] Error processing queue:', error);
  }
}

/**
 * Helper: Get player wait time in milliseconds
 */
async function getPlayerWaitTime(userId: string): Promise<number> {
  const redis = getRedis();
  const joinTime = await redis.hGet(QUEUE_TIMESTAMP_KEY, userId);
  return joinTime ? Date.now() - parseInt(joinTime) : 0;
}

/**
 * Helper: Create a new match in the database
 */
async function createMatch(playerIds: string[]): Promise<string> {
  const match = await matchRepository.create({
    mapName: 'default_map',
    playerCount: playerIds.length,
  });

  // TODO: Notify players via WebSocket that match is ready
  // TODO: Create game lobby and start game server

  return match.matchId;
}

export default router;
