import { Router, Request, Response } from 'express';
import { leaderboardRepository, userRepository } from '../repositories';

const router = Router();

/**
 * GET /api/leaderboard/wins
 * Get top 100 players by total wins
 */
router.get('/wins', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const leaderboard = await leaderboardRepository.getTopByWins(limit, offset);

    res.json({
      leaderboard,
      pagination: {
        limit,
        offset,
        hasMore: leaderboard.length === limit,
      },
    });
  } catch (error) {
    console.error('[LEADERBOARD] Error fetching wins leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/leaderboard/mmr
 * Get top 100 players by MMR
 */
router.get('/mmr', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const leaderboard = await leaderboardRepository.getTopByMMR(limit, offset);

    res.json({
      leaderboard,
      pagination: {
        limit,
        offset,
        hasMore: leaderboard.length === limit,
      },
    });
  } catch (error) {
    console.error('[LEADERBOARD] Error fetching MMR leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/leaderboard/player/:userId
 * Get a player's rank on both leaderboards
 */
router.get('/player/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await userRepository.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const ranks = await leaderboardRepository.getPlayerRanks(userId);
    const stats = await userRepository.getStats(userId);

    res.json({
      userId,
      username: user.username,
      ranks,
      stats: stats || {
        mmr: user.mmr,
        totalWins: user.totalWins,
        totalLosses: user.totalLosses,
        totalKills: user.totalKills,
        totalDeaths: user.totalDeaths,
        winRate: '0.00',
        kdr: '0.00',
      },
    });
  } catch (error) {
    console.error('[LEADERBOARD] Error fetching player rank:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
