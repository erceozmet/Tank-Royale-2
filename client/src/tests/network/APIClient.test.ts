import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { APIClient } from '@network/APIClient';

// Mock axios module
vi.mock('axios');

describe('APIClient', () => {
  let apiClient: APIClient;
  let mockAxiosInstance: Partial<AxiosInstance>;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Reset mocks
    vi.clearAllMocks();

    // Create a properly mocked axios instance
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      interceptors: {
        request: {
          use: vi.fn((fn) => {
            // Just return the function for simplicity
            return 0;
          }),
        } as any,
        response: {
          use: vi.fn((successFn) => {
            // Just return the function for simplicity
            return 0;
          }),
        } as any,
      } as any,
    };

    // Mock axios.create to return our mocked instance
    (axios.create as any) = vi.fn(() => mockAxiosInstance);

    // Create fresh API client (this will use the mocked axios)
    apiClient = new APIClient();
  });

  describe('constructor', () => {
    it('should create an API client instance', () => {
      expect(apiClient).toBeDefined();
      expect(apiClient).toBeInstanceOf(APIClient);
    });

    it('should set up axios instance with correct config', () => {
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: expect.stringContaining('8080'),
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });
  });

  describe('register', () => {
    it('should register a new user and store token', async () => {
      const mockResponse = {
        data: {
          token: 'test-token-123',
          user: {
            id: '1',
            username: 'testuser',
            email: 'test@example.com',
          },
        },
      };

      (mockAxiosInstance.post as any).mockResolvedValue(mockResponse);

      const registerData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123!',
      };

      const result = await apiClient.register(registerData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/auth/register', registerData);
      expect(result.token).toBe('test-token-123');
      expect(localStorage.getItem('token')).toBe('test-token-123');
    });

    it('should handle registration errors', async () => {
      const mockError = new Error('Username already exists');
      (mockAxiosInstance.post as any).mockRejectedValue(mockError);

      await expect(
        apiClient.register({
          username: 'testuser',
          email: 'test@example.com',
          password: 'TestPass123!',
        })
      ).rejects.toThrow('Username already exists');
    });
  });

  describe('login', () => {
    it('should login user and store token', async () => {
      const mockResponse = {
        data: {
          token: 'login-token-456',
          user: {
            id: '1',
            username: 'testuser',
            email: 'test@example.com',
          },
        },
      };

      (mockAxiosInstance.post as any).mockResolvedValue(mockResponse);

      const loginData = {
        username: 'testuser',
        password: 'TestPass123!',
      };

      const result = await apiClient.login(loginData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/auth/login', loginData);
      expect(result.token).toBe('login-token-456');
      expect(localStorage.getItem('token')).toBe('login-token-456');
    });

    it('should handle login errors', async () => {
      const mockError = new Error('Invalid credentials');
      (mockAxiosInstance.post as any).mockRejectedValue(mockError);

      await expect(
        apiClient.login({
          username: 'testuser',
          password: 'wrong-password',
        })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('getMe', () => {
    it('should get current user info', async () => {
      const mockResponse = {
        data: {
          id: '1',
          username: 'testuser',
          email: 'test@example.com',
        },
      };

      (mockAxiosInstance.get as any).mockResolvedValue(mockResponse);

      const result = await apiClient.getMe();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/auth/me');
      expect(result.username).toBe('testuser');
    });

    it('should handle unauthorized errors', async () => {
      const mockError = new Error('Unauthorized');
      (mockAxiosInstance.get as any).mockRejectedValue(mockError);

      await expect(apiClient.getMe()).rejects.toThrow('Unauthorized');
    });
  });

  describe('getLeaderboard', () => {
    it('should fetch leaderboard with default limit', async () => {
      const mockResponse = {
        data: [
          { rank: 1, username: 'player1', wins: 50 },
          { rank: 2, username: 'player2', wins: 45 },
          { rank: 3, username: 'player3', wins: 40 },
        ],
      };

      (mockAxiosInstance.get as any).mockResolvedValue(mockResponse);

      const result = await apiClient.getLeaderboard();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/leaderboard', {
        params: { limit: 100 },
      });
      expect(result).toHaveLength(3);
      expect(result[0].username).toBe('player1');
    });

    it('should fetch leaderboard with custom limit', async () => {
      const mockResponse = { data: [] };
      (mockAxiosInstance.get as any).mockResolvedValue(mockResponse);

      await apiClient.getLeaderboard(50);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/leaderboard', {
        params: { limit: 50 },
      });
    });
  });

  describe('getStats', () => {
    it('should fetch player stats by ID', async () => {
      const mockResponse = {
        data: {
          playerID: 'player-123',
          wins: 25,
          losses: 75,
        },
      };

      (mockAxiosInstance.get as any).mockResolvedValue(mockResponse);

      const result = await apiClient.getStats('player-123');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/stats/player-123');
      expect(result.wins).toBe(25);
    });
  });

  describe('logout', () => {
    it('should remove token from localStorage', () => {
      localStorage.setItem('token', 'test-token');
      expect(localStorage.getItem('token')).toBe('test-token');

      apiClient.logout();

      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('token management', () => {
    it('should not store token if response has no token', async () => {
      const mockResponse = {
        data: {
          user: {
            id: '1',
            username: 'testuser',
          },
        },
      };

      (mockAxiosInstance.post as any).mockResolvedValue(mockResponse);

      await apiClient.register({
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123!',
      });

      expect(localStorage.getItem('token')).toBeNull();
    });
  });
});
