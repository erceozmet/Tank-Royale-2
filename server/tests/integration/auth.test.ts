import request from 'supertest';
import express, { Express } from 'express';
import authRoutes from '../../src/routes/auth';
import { userRepository } from '../../src/repositories/UserRepository';
import * as authUtils from '../../src/auth/utils';

// Mock the repositories
jest.mock('../../src/repositories/UserRepository');
jest.mock('../../src/middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    // Mock authentication - set userId from token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
      const token = authHeader.substring(7);
      const decoded = require('../../src/auth/utils').verifyToken(token);
      req.userId = decoded.userId;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  },
}));

describe('Auth Routes Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    // Setup express app
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        userId: '123',
        username: 'testuser',
        email: 'test@example.com',
        mmr: 1000,
        createdAt: new Date(),
        totalWins: 0,
        totalLosses: 0,
        totalKills: 0,
        totalDeaths: 0,
        passwordHash: 'hashed_password',
        lastLogin: null,
      };

      (userRepository.usernameOrEmailExists as jest.Mock).mockResolvedValue(false);
      (userRepository.create as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123',
        })
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('userId', '123');
      expect(response.body.user).toHaveProperty('username', 'testuser');
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('should reject registration with invalid username', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'ab', // Too short
          email: 'test@example.com',
          password: 'Password123',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid username');
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'validuser',
          email: 'invalid-email',
          password: 'Password123',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid email');
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'validuser',
          email: 'test@example.com',
          password: 'weak',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Password must be');
    });

    it('should reject duplicate username', async () => {
      (userRepository.usernameOrEmailExists as jest.Mock).mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'existinguser',
          email: 'newemail@example.com',
          password: 'Password123',
        })
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    const mockUser = {
      userId: '123',
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: '',
      mmr: 1000,
      totalWins: 5,
      totalLosses: 3,
      totalKills: 0,
      totalDeaths: 0,
      createdAt: new Date(),
      lastLogin: null,
    };

    beforeEach(async () => {
      // Hash a test password
      mockUser.passwordHash = await authUtils.hashPassword('Password123');
    });

    it('should login with username', async () => {
      (userRepository.findByUsernameOrEmail as jest.Mock).mockResolvedValue(mockUser);
      (userRepository.updateLastLogin as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          usernameOrEmail: 'testuser',
          password: 'Password123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe('testuser');
    });

    it('should login with email', async () => {
      (userRepository.findByUsernameOrEmail as jest.Mock).mockResolvedValue(mockUser);
      (userRepository.updateLastLogin as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          usernameOrEmail: 'test@example.com',
          password: 'Password123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
    });

    it('should reject login with wrong password', async () => {
      (userRepository.findByUsernameOrEmail as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          usernameOrEmail: 'testuser',
          password: 'WrongPassword123',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should reject login with nonexistent user', async () => {
      (userRepository.findByUsernameOrEmail as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          usernameOrEmail: 'nonexistent',
          password: 'Password123',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/me', () => {
    const mockUser = {
      userId: '123',
      username: 'testuser',
      email: 'test@example.com',
      mmr: 1000,
      totalWins: 5,
      totalLosses: 3,
      totalKills: 20,
      totalDeaths: 15,
      createdAt: new Date(),
      lastLogin: new Date(),
      passwordHash: 'hashed',
    };

    const mockStats = {
      mmr: 1000,
      totalWins: 5,
      totalLosses: 3,
      totalKills: 20,
      totalDeaths: 15,
      winRate: '62.50',
      kdr: '1.33',
    };

    it('should return user profile with valid token', async () => {
      const token = authUtils.generateToken('123', 'testuser');
      
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (userRepository.getStats as jest.Mock).mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('userId', '123');
      expect(response.body).toHaveProperty('username', 'testuser');
      expect(response.body).not.toHaveProperty('passwordHash');
      expect(response.body).toHaveProperty('stats');
    });

    it('should reject request without token', async () => {
      await request(app)
        .get('/api/auth/me')
        .expect(401);
    });

    it('should reject request with invalid token', async () => {
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);
    });

    it('should reject request with malformed authorization header', async () => {
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);
    });

    it('should handle user not found in database', async () => {
      const token = authUtils.generateToken('nonexistent-id', 'testuser');
      
      (userRepository.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('User not found');
    });

    it('should handle database error when fetching user', async () => {
      const token = authUtils.generateToken('123', 'testuser');
      
      (userRepository.findById as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Internal server error');
    });

    it('should handle database error when fetching stats', async () => {
      const token = authUtils.generateToken('123', 'testuser');
      
      const mockUser = {
        userId: '123',
        username: 'testuser',
        email: 'test@example.com',
        mmr: 1000,
        totalWins: 5,
        totalLosses: 3,
        totalKills: 20,
        totalDeaths: 15,
        createdAt: new Date(),
        lastLogin: new Date(),
        passwordHash: 'hashed',
      };

      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (userRepository.getStats as jest.Mock).mockRejectedValue(new Error('Stats query failed'));

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should return user profile with null stats if getStats returns null', async () => {
      const token = authUtils.generateToken('123', 'testuser');
      
      const mockUser = {
        userId: '123',
        username: 'testuser',
        email: 'test@example.com',
        mmr: 1000,
        totalWins: 0,
        totalLosses: 0,
        totalKills: 0,
        totalDeaths: 0,
        createdAt: new Date(),
        lastLogin: new Date(),
        passwordHash: 'hashed',
      };

      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (userRepository.getStats as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toEqual({
        mmr: 1000,
        totalWins: 0,
        totalLosses: 0,
        totalKills: 0,
        totalDeaths: 0,
        winRate: '0.00',
        kdr: '0.00',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database error during registration', async () => {
      (userRepository.usernameOrEmailExists as jest.Mock).mockResolvedValue(false);
      (userRepository.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123',
        })
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Internal server error');
    });

    it('should handle database error during login', async () => {
      (userRepository.findByUsernameOrEmail as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          usernameOrEmail: 'testuser',
          password: 'Password123',
        })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle missing fields in registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          // Missing email and password
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('required');
    });

    it('should handle missing fields in login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          // Missing both fields
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('required');
    });
  });
});
