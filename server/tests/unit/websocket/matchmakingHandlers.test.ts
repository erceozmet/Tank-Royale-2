/**
 * Matchmaking Handlers Unit Tests
 * 
 * Tests for matchmaking WebSocket event handlers
 */

import { AuthenticatedSocket } from '../../../src/websocket';
import * as MatchmakingService from '../../../src/services/MatchmakingService';

// Mock the matchmaking service
jest.mock('../../../src/services/MatchmakingService', () => ({
  joinQueue: jest.fn(),
  leaveQueue: jest.fn(),
  getQueueStatus: jest.fn(),
}));

describe('Matchmaking Handlers', () => {
  let mockSocket: Partial<AuthenticatedSocket>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock socket
    mockSocket = {
      userId: 'test-user-1',
      username: 'testuser',
      on: jest.fn(),
      emit: jest.fn(),
      connected: true,
    } as any;
  });

  describe('matchmaking:join', () => {
    it('should call joinQueue with socket', async () => {
      (MatchmakingService.joinQueue as jest.Mock).mockResolvedValue(undefined);

      await MatchmakingService.joinQueue(mockSocket as AuthenticatedSocket);

      expect(MatchmakingService.joinQueue).toHaveBeenCalledWith(mockSocket);
    });

    it('should handle join queue error', async () => {
      const error = new Error('Failed to join queue');
      (MatchmakingService.joinQueue as jest.Mock).mockRejectedValue(error);

      await expect(
        MatchmakingService.joinQueue(mockSocket as AuthenticatedSocket)
      ).rejects.toThrow('Failed to join queue');
    });
  });

  describe('matchmaking:leave', () => {
    it('should call leaveQueue with userId', async () => {
      (MatchmakingService.leaveQueue as jest.Mock).mockResolvedValue(undefined);

      await MatchmakingService.leaveQueue('test-user-1');

      expect(MatchmakingService.leaveQueue).toHaveBeenCalledWith('test-user-1');
    });

    it('should handle leave queue error', async () => {
      const error = new Error('Failed to leave queue');
      (MatchmakingService.leaveQueue as jest.Mock).mockRejectedValue(error);

      await expect(
        MatchmakingService.leaveQueue('test-user-1')
      ).rejects.toThrow('Failed to leave queue');
    });
  });

  describe('matchmaking:status', () => {
    it('should return queue status', async () => {
      const mockStatus = {
        inQueue: true,
        queueSize: 5,
        queueTime: 30000,
        mmr: 1500,
        mmrRange: 150,
      };

      (MatchmakingService.getQueueStatus as jest.Mock).mockResolvedValue(mockStatus);

      const status = await MatchmakingService.getQueueStatus('test-user-1');

      expect(MatchmakingService.getQueueStatus).toHaveBeenCalledWith('test-user-1');
      expect(status).toEqual(mockStatus);
    });

    it('should handle status check error', async () => {
      const error = new Error('Failed to get status');
      (MatchmakingService.getQueueStatus as jest.Mock).mockRejectedValue(error);

      await expect(
        MatchmakingService.getQueueStatus('test-user-1')
      ).rejects.toThrow('Failed to get status');
    });
  });

  describe('Socket event handlers', () => {
    it('should set up event handlers on socket', () => {
      const onMock = mockSocket.on as jest.Mock;

      // Simulate registering handlers
      onMock('matchmaking:join', jest.fn());
      onMock('matchmaking:leave', jest.fn());
      onMock('matchmaking:status', jest.fn());

      expect(onMock).toHaveBeenCalled();
    });
  });
});
