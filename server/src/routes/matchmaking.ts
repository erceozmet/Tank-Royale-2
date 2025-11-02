import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { getQueueStatus, getActivePlayersCount, getActiveLobbiesCount } from '../services/MatchmakingService';

const router = Router();

/**
 * POST /api/matchmaking/join
 * Note: Matchmaking join is primarily handled via WebSocket
 * This endpoint is kept for REST API compatibility
 */
router.post('/join', authenticate, async (req: Request, res: Response) => {
  res.json({
    message: 'Please use WebSocket connection for matchmaking',
    websocketEvent: 'matchmaking:join',
  });
});

/**
 * DELETE /api/matchmaking/leave
 * Note: Matchmaking leave is primarily handled via WebSocket
 * This endpoint is kept for REST API compatibility
 */
router.delete('/leave', authenticate, async (req: Request, res: Response) => {
  res.json({
    message: 'Please use WebSocket connection for matchmaking',
    websocketEvent: 'matchmaking:leave',
  });
});

/**
 * GET /api/matchmaking/status
 * Get current queue status
 */
router.get('/status', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const status = await getQueueStatus(userId);
    res.json(status);
  } catch (error) {
    console.error('[MATCHMAKING] Error getting status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/matchmaking/stats
 * Get matchmaking system statistics
 */
router.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    res.json({
      activePlayersInQueue: getActivePlayersCount(),
      activeLobbies: getActiveLobbiesCount(),
    });
  } catch (error) {
    console.error('[MATCHMAKING] Error getting stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
