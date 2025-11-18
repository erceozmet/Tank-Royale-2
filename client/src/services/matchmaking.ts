/**
 * Matchmaking API service
 * Handles queue joining/leaving and status checks
 */

import { getToken } from './auth';

const API_URL = 'http://localhost:8080/api/matchmaking';

interface QueueStatus {
  status?: string; // "searching" or "matched"
  matched?: boolean; // For backwards compatibility
  matchId?: string;
  playerCount?: number;
  inQueue?: boolean;
  queuePosition?: number;
  estimatedWaitTime?: number;
  playersInQueue?: number;
}

// TODO: Use this interface when implementing match_found WebSocket listener
// interface MatchFoundResponse {
//   matchId: string;
//   lobbyId: string;
//   players: string[];
// }

/**
 * Join the matchmaking queue
 */
export async function joinQueue(): Promise<void> {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  console.log('🔑 Joining queue with token:', token.substring(0, 20) + '...');

  const response = await fetch(`${API_URL}/join`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error('❌ Join queue failed:', response.status, response.statusText);
    const error = await response.json().catch(() => ({ error: 'Failed to join queue' }));
    throw new Error(error.error || 'Failed to join queue');
  }

  return response.json();
}

/**
 * Leave the matchmaking queue
 */
export async function leaveQueue(): Promise<void> {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/leave`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to leave queue' }));
    throw new Error(error.error || 'Failed to leave queue');
  }

  return response.json();
}

/**
 * Get current queue status
 */
export async function getQueueStatus(): Promise<QueueStatus> {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/status`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to get queue status' }));
    throw new Error(error.error || 'Failed to get queue status');
  }

  return response.json();
}
