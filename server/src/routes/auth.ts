import { Router, Request, Response } from 'express';
import { hashPassword, comparePassword, generateToken, isValidEmail, isValidUsername, isValidPassword } from '../auth/utils';
import { authenticate } from '../middleware/auth';
import { userRepository } from '../repositories';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (!isValidUsername(username)) {
      return res.status(400).json({ 
        error: 'Invalid username. Must be 3-50 alphanumeric characters or underscores' 
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number' 
      });
    }

    // Check if user already exists
    const existingUser = await userRepository.usernameOrEmailExists(username, email);

    if (existingUser) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await userRepository.create({ username, email, passwordHash });

    // Generate JWT token
    const token = generateToken(user.userId, user.username);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        mmr: user.mmr,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('[AUTH] Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login
 * Login with username/email and password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }

    // Find user by username or email
    const user = await userRepository.findByUsernameOrEmail(usernameOrEmail);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login timestamp
    await userRepository.updateLastLogin(user.userId);

    // Generate JWT token
    const token = generateToken(user.userId, user.username);

    res.json({
      message: 'Login successful',
      token,
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        mmr: user.mmr,
        totalWins: user.totalWins,
        totalLosses: user.totalLosses,
      },
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile (requires authentication)
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId; // Set by auth middleware

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await userRepository.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const stats = await userRepository.getStats(userId);

    res.json({
      userId: user.userId,
      username: user.username,
      email: user.email,
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
    console.error('[AUTH] Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
