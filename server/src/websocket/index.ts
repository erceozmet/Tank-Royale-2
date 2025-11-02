import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '../auth/utils';
import { RedisSessionManager } from '../db/redis';
import { websocketConnections } from '../middleware/metrics';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

let io: Server | null = null;

/**
 * Initialize WebSocket server
 */
export function initWebSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true,
    },
    pingTimeout: 60000, // 60 seconds
    pingInterval: 25000, // 25 seconds
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = verifyToken(token);
      
      if (!decoded || !decoded.userId) {
        return next(new Error('Invalid token'));
      }

      // Verify session exists in Redis
      const session = await RedisSessionManager.getSession(decoded.userId);
      if (!session) {
        return next(new Error('Session expired'));
      }

      // Attach user info to socket
      socket.userId = decoded.userId;
      socket.username = decoded.username;

      next();
    } catch (error) {
      console.error('WebSocket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`✅ WebSocket connected: ${socket.userId} (${socket.username})`);
    
    // Increment WebSocket connections metric
    websocketConnections.inc();

    // Join user to their personal room
    socket.join(`user:${socket.userId}`);

    // Notify client of successful authentication
    socket.emit('authenticated', {
      userId: socket.userId,
      username: socket.username,
    });

    // Refresh session on activity
    refreshSessionPeriodically(socket);

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`❌ WebSocket disconnected: ${socket.userId} - ${reason}`);
      // Decrement WebSocket connections metric
      websocketConnections.dec();
      handleDisconnect(socket);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`WebSocket error for ${socket.userId}:`, error);
    });

    // Heartbeat/ping-pong
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
  });

  console.log('✅ WebSocket server initialized');
  return io;
}

/**
 * Get WebSocket server instance
 */
export function getIO(): Server {
  if (!io) {
    throw new Error('WebSocket server not initialized. Call initWebSocket() first.');
  }
  return io;
}

/**
 * Refresh user session periodically while connected
 */
function refreshSessionPeriodically(socket: AuthenticatedSocket) {
  const intervalId = setInterval(async () => {
    if (socket.userId && socket.connected) {
      try {
        await RedisSessionManager.refreshSession(socket.userId);
      } catch (error) {
        console.error(`Failed to refresh session for ${socket.userId}:`, error);
      }
    } else {
      clearInterval(intervalId);
    }
  }, 5 * 60 * 1000); // Every 5 minutes

  // Clean up on disconnect
  socket.on('disconnect', () => {
    clearInterval(intervalId);
  });
}

/**
 * Handle user disconnect
 */
function handleDisconnect(socket: AuthenticatedSocket) {
  // Override in specific handlers (e.g., matchmaking, game)
  // This is a placeholder for graceful disconnect logic
}

/**
 * Emit event to specific user
 */
export function emitToUser(userId: string, event: string, data: any): void {
  const io = getIO();
  io.to(`user:${userId}`).emit(event, data);
}

/**
 * Emit event to multiple users
 */
export function emitToUsers(userIds: string[], event: string, data: any): void {
  const io = getIO();
  userIds.forEach(userId => {
    io.to(`user:${userId}`).emit(event, data);
  });
}

/**
 * Broadcast event to all connected users
 */
export function broadcastToAll(event: string, data: any): void {
  const io = getIO();
  io.emit(event, data);
}

/**
 * Get number of connected clients
 */
export async function getConnectedCount(): Promise<number> {
  const io = getIO();
  const sockets = await io.fetchSockets();
  return sockets.length;
}

/**
 * Check if user is connected
 */
export async function isUserConnected(userId: string): Promise<boolean> {
  const io = getIO();
  const sockets = await io.in(`user:${userId}`).fetchSockets();
  return sockets.length > 0;
}

/**
 * Disconnect user forcefully
 */
export async function disconnectUser(userId: string, reason?: string): Promise<void> {
  const io = getIO();
  const sockets = await io.in(`user:${userId}`).fetchSockets();
  
  sockets.forEach(socket => {
    socket.emit('force_disconnect', { reason: reason || 'Disconnected by server' });
    socket.disconnect(true);
  });
}
