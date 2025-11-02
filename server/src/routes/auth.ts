import { Router, Request, Response } from 'express';
import { query } from '../db/postgres';
import { hashPassword, comparePassword, generateToken, isValidEmail, isValidUsername, isValidPassword } from '../auth/utils';

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
    const existingUser = await query(
      'SELECT user_id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const result = await query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING user_id, username, email, mmr, created_at`,
      [username, email, passwordHash]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = generateToken(user.user_id, user.username);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        mmr: user.mmr,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
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
    const result = await query(
      `SELECT user_id, username, email, password_hash, mmr, total_wins, total_losses
       FROM users 
       WHERE username = $1 OR email = $1`,
      [usernameOrEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login timestamp
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1',
      [user.user_id]
    );

    // Generate JWT token
    const token = generateToken(user.user_id, user.username);

    res.json({
      message: 'Login successful',
      token,
      user: {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        mmr: user.mmr,
        totalWins: user.total_wins,
        totalLosses: user.total_losses,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile (requires authentication)
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    // This will be protected by auth middleware (we'll add it next)
    const userId = (req as any).userId; // Will be set by auth middleware

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await query(
      `SELECT user_id, username, email, mmr, total_wins, total_losses, 
              total_kills, total_deaths, created_at, last_login
       FROM users 
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    res.json({
      userId: user.user_id,
      username: user.username,
      email: user.email,
      stats: {
        mmr: user.mmr,
        totalWins: user.total_wins,
        totalLosses: user.total_losses,
        totalKills: user.total_kills,
        totalDeaths: user.total_deaths,
        winRate: user.total_wins + user.total_losses > 0
          ? ((user.total_wins / (user.total_wins + user.total_losses)) * 100).toFixed(2)
          : '0.00',
      },
      createdAt: user.created_at,
      lastLogin: user.last_login,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
