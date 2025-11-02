import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { userRepository, matchRepository } from '../repositories';

const router = Router();

/**
 * GET /api/users/:username
 * Get user profile by username (public)
 */
router.get('/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    const user = await userRepository.findByUsername(username);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const stats = await userRepository.getStats(user.userId);

    res.json({
      userId: user.userId,
      username: user.username,
      stats: stats || {
        mmr: user.mmr,
        totalWins: user.totalWins,
        totalLosses: user.totalLosses,
        totalKills: user.totalKills,
        totalDeaths: user.totalDeaths,
        winRate: '0.00',
        kdr: '0.00',
      },
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    });
  } catch (error) {
    console.error('[USERS] Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users/:userId/matches
 * Get user's match history (last 20 matches)
 */
router.get('/:userId/matches', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = parseInt(req.query.offset as string) || 0;

    const user = await userRepository.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const matches = await matchRepository.getUserMatchHistory(userId, limit, offset);

    res.json({
      userId,
      username: user.username,
      matches,
      pagination: {
        limit,
        offset,
        hasMore: matches.length === limit,
      },
    });
  } catch (error) {
    console.error('[USERS] Error fetching match history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users/search
 * Search users by username (requires authentication)
 */
router.get('/search', authenticate, async (req: Request, res: Response) => {
  try {
    const searchQuery = req.query.q as string;

    if (!searchQuery || searchQuery.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const users = await userRepository.search(searchQuery, 20);

    res.json({
      query: searchQuery,
      results: users.map(user => ({
        userId: user.userId,
        username: user.username,
        mmr: user.mmr,
        totalWins: user.totalWins,
        totalLosses: user.totalLosses,
      })),
    });
  } catch (error) {
    console.error('[USERS] Error searching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
