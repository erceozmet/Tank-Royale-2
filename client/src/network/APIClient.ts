import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  User,
  LeaderboardEntry,
  PlayerStats,
  MatchmakingStatus,
  ErrorResponse,
} from '@/types';

/**
 * REST API Client for Tank Royale 2
 * Handles authentication, user data, leaderboards, and stats
 */
export class APIClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = import.meta.env.VITE_API_URL || 'http://localhost:8080') {
    this.baseURL = baseURL;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor: Add auth token to requests
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor: Handle errors globally
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ErrorResponse>) => {
        // Handle 401 Unauthorized (token expired/invalid)
        if (error.response?.status === 401) {
          this.clearToken();
          console.warn('Authentication failed, token cleared');
          
          // Emit event for UI to handle (e.g., redirect to login)
          window.dispatchEvent(new CustomEvent('auth:logout'));
        }

        // Handle network errors
        if (!error.response) {
          console.error('Network error:', error.message);
        }

        return Promise.reject(error);
      }
    );
  }

  // ============================================================================
  // Token Management
  // ============================================================================

  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  private clearToken(): void {
    localStorage.removeItem('token');
  }

  public isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // ============================================================================
  // Authentication Endpoints
  // ============================================================================

  /**
   * Register a new user account
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await this.client.post<AuthResponse>('/api/auth/register', data);
      
      if (response.data.token) {
        this.setToken(response.data.token);
      }
      
      return response.data;
    } catch (error) {
      this.handleError(error, 'Registration failed');
      throw error;
    }
  }

  /**
   * Login with existing account
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await this.client.post<AuthResponse>('/api/auth/login', data);
      
      if (response.data.token) {
        this.setToken(response.data.token);
      }
      
      return response.data;
    } catch (error) {
      this.handleError(error, 'Login failed');
      throw error;
    }
  }

  /**
   * Get current user information
   */
  async getMe(): Promise<User> {
    try {
      const response = await this.client.get<User>('/api/auth/me');
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to get user info');
      throw error;
    }
  }

  /**
   * Logout (clear local token)
   */
  logout(): void {
    this.clearToken();
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }

  // ============================================================================
  // Leaderboard Endpoints
  // ============================================================================

  /**
   * Get top players on the leaderboard
   * @param limit Number of entries to return (default: 100)
   */
  async getLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
    try {
      const response = await this.client.get<LeaderboardEntry[]>('/api/leaderboard', {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to fetch leaderboard');
      throw error;
    }
  }

  // ============================================================================
  // Player Stats Endpoints
  // ============================================================================

  /**
   * Get player statistics
   * @param playerID User ID or "me" for current user
   */
  async getStats(playerID: string = 'me'): Promise<PlayerStats> {
    try {
      const response = await this.client.get<PlayerStats>(`/api/stats/${playerID}`);
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to fetch player stats');
      throw error;
    }
  }

  // ============================================================================
  // Matchmaking Endpoints
  // ============================================================================

  /**
   * Join matchmaking queue
   */
  async joinMatchmaking(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.client.post('/api/matchmaking/join');
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to join matchmaking');
      throw error;
    }
  }

  /**
   * Leave matchmaking queue
   */
  async leaveMatchmaking(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.client.post('/api/matchmaking/leave');
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to leave matchmaking');
      throw error;
    }
  }

  /**
   * Get matchmaking queue status
   */
  async getMatchmakingStatus(): Promise<MatchmakingStatus> {
    try {
      const response = await this.client.get<MatchmakingStatus>('/api/matchmaking/status');
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to get matchmaking status');
      throw error;
    }
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  /**
   * Check if API server is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  // ============================================================================
  // Error Handling
  // ============================================================================

  private handleError(error: unknown, context: string): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ErrorResponse>;
      
      if (axiosError.response) {
        // Server responded with error
        const errorMessage = axiosError.response.data?.message || axiosError.message;
        console.error(`${context}:`, errorMessage, {
          status: axiosError.response.status,
          data: axiosError.response.data,
        });
      } else if (axiosError.request) {
        // Request was made but no response
        console.error(`${context}: No response from server`, {
          request: axiosError.request,
        });
      } else {
        // Something else happened
        console.error(`${context}:`, axiosError.message);
      }
    } else {
      console.error(`${context}:`, error);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let apiClientInstance: APIClient | null = null;

export function getAPIClient(): APIClient {
  if (!apiClientInstance) {
    apiClientInstance = new APIClient();
  }
  return apiClientInstance;
}

export default APIClient;
