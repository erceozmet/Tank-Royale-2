import { Server } from 'socket.io';
import { AuthenticatedSocket } from './index';
import { joinQueue, leaveQueue, getQueueStatus } from '../services/MatchmakingService';

/**
 * Register matchmaking event handlers
 */
export function registerMatchmakingHandlers(io: Server) {
  io.on('connection', (socket: AuthenticatedSocket) => {
    
    /**
     * Join matchmaking queue
     */
    socket.on('matchmaking:join', async () => {
      try {
        await joinQueue(socket);
      } catch (error) {
        console.error('Error in matchmaking:join:', error);
        socket.emit('matchmaking:error', { message: 'Failed to join matchmaking' });
      }
    });

    /**
     * Leave matchmaking queue
     */
    socket.on('matchmaking:leave', async () => {
      try {
        await leaveQueue(socket.userId!);
        socket.emit('matchmaking:left', { userId: socket.userId });
      } catch (error) {
        console.error('Error in matchmaking:leave:', error);
        socket.emit('matchmaking:error', { message: 'Failed to leave matchmaking' });
      }
    });

    /**
     * Get queue status
     */
    socket.on('matchmaking:status', async () => {
      try {
        const status = await getQueueStatus(socket.userId!);
        socket.emit('matchmaking:status_update', status);
      } catch (error) {
        console.error('Error in matchmaking:status:', error);
        socket.emit('matchmaking:error', { message: 'Failed to get queue status' });
      }
    });

    /**
     * Player ready for match
     */
    socket.on('matchmaking:ready', (data: { lobbyId: string }) => {
      // TODO: Mark player as ready in lobby
      // Will be implemented when we add lobby management
      console.log(`Player ${socket.userId} ready for lobby ${data.lobbyId}`);
    });
  });
}
