/**
 * Authentication service for blast.io
 * Handles registration and login with the API server
 */

const API_URL = 'http://localhost:8080/api/auth';

interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email?: string;
  };
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
}

interface LoginData {
  usernameOrEmail: string;
  password: string;
}

/**
 * Register a new user and get JWT token
 */
export async function register(data: RegisterData): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Registration failed' }));
    throw new Error(error.error || 'Registration failed');
  }

  return response.json();
}

/**
 * Login existing user and get JWT token
 */
export async function login(data: LoginData): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(error.error || 'Login failed');
  }

  return response.json();
}

/**
 * Quick play - register with random password for guest play
 */
export async function quickPlay(username: string): Promise<AuthResponse> {
  // Generate random password for guest account
  const randomPassword = `Guest_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const email = `${username}@guest.blast.io`;

  return register({
    username,
    email,
    password: randomPassword,
  });
}

/**
 * Store authentication token
 */
export function storeToken(token: string): void {
  localStorage.setItem('blast-io-token', token);
}

/**
 * Get stored authentication token
 */
export function getToken(): string | null {
  return localStorage.getItem('blast-io-token');
}

/**
 * Clear authentication token
 */
export function clearToken(): void {
  localStorage.removeItem('blast-io-token');
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}
