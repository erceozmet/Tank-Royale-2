/**
 * WebSocket Service for blast.io multiplayer
 * Handles connection, authentication, and real-time game communication
 */

interface WebSocketMessage {
  type: string;
  payload: any;
}

export interface PlayerState {
  userId: string;
  username: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  rotation: number;
  health: number;
  maxHealth: number;
  speed: number;
  armor: number;
  damage: number;
  fireRate: number;
  isAlive: boolean;
  kills: number;
  deaths: number;
  lastDamageTime?: number;
  respawnTime?: number;
}

export interface Projectile {
  id: string;
  ownerId: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  damage: number;
  createdAt: number;
}

export interface Loot {
  id: string;
  type: string;
  position: { x: number; y: number };
  value: number;
}

export interface Crate {
  id: string;
  position: { x: number; y: number };
  isOpened: boolean;
}

export interface SafeZone {
  center: { x: number; y: number };
  currentRadius: number;
  targetRadius: number;
  nextShrinkTime: number;
  damagePerTick: number;
}

export interface GameState {
  tick: number;
  players: Record<string, PlayerState>;
  projectiles: Projectile[];
  loot: Loot[];
  crates: Crate[];
  safeZone: SafeZone;
  phase: string;
  rankings: Array<{ userId: string; username: string; kills: number; placement: number }>;
}

type MessageHandler = (payload: any) => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private isConnecting = false;
  private isAuthenticated = false;
  private userId: string | null = null;
  private username: string | null = null;
  private heartbeatInterval: number | null = null;

  constructor(url: string = 'ws://localhost:8081/ws') {
    this.url = url;
  }

  /**
   * Connect to WebSocket server with JWT token
   */
  async connect(token: string): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      console.warn('[WS] Already connected or connecting');
      return;
    }

    this.token = token;
    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        // Include token in query parameter
        const wsUrl = `${this.url}?token=${token}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('[WS] Connected to game server');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);

            // Resolve promise on authenticated message
            if (message.type === 'authenticated') {
              this.isAuthenticated = true;
              this.userId = message.payload.userId;
              this.username = message.payload.username;
              console.log(`[WS] Authenticated as ${this.username} (${this.userId})`);
              resolve();
            }
          } catch (error) {
            console.error('[WS] Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WS] WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log(`[WS] Connection closed (code: ${event.code})`);
          this.isConnecting = false;
          this.isAuthenticated = false;
          this.stopHeartbeat();

          // Attempt reconnection if not intentional disconnect
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        // Timeout after 5 seconds if not authenticated
        setTimeout(() => {
          if (!this.isAuthenticated && this.isConnecting) {
            this.isConnecting = false;
            reject(new Error('Authentication timeout'));
          }
        }, 5000);
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.stopHeartbeat();
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
      this.isAuthenticated = false;
      this.userId = null;
      this.username = null;
      console.log('[WS] Disconnected');
    }
  }

  /**
   * Send message to server
   */
  send(type: string, payload: any = {}): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WS] Cannot send message - not connected');
      return;
    }

    const message: WebSocketMessage = { type, payload };
    this.ws.send(JSON.stringify(message));
  }

  /**
   * Register message handler for specific message type
   */
  on(messageType: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    this.messageHandlers.get(messageType)!.push(handler);
  }

  /**
   * Unregister message handler
   */
  off(messageType: string, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(messageType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: WebSocketMessage): void {
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message.payload);
        } catch (error) {
          console.error(`[WS] Error in handler for ${message.type}:`, error);
        }
      });
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.token) {
        this.connect(this.token).catch(error => {
          console.error('[WS] Reconnection failed:', error);
        });
      }
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = window.setInterval(() => {
      this.send('ping');
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Join a game room
   */
  joinRoom(roomId: string): void {
    this.send('room:join', { roomId });
  }

  /**
   * Leave current room
   */
  leaveRoom(roomId: string): void {
    this.send('room:leave', { roomId });
  }

  /**
   * Send player movement update
   */
  sendMove(x: number, y: number, velocityX: number, velocityY: number, isTurbo: boolean): void {
    this.send('game:move', {
      x,
      y,
      velocityX,
      velocityY,
      isTurbo,
      timestamp: Date.now()
    });
  }

  /**
   * Send attack/shoot event
   */
  sendAttack(targetX: number, targetY: number, angle: number): void {
    this.send('game:attack', {
      targetX,
      targetY,
      angle,
      timestamp: Date.now()
    });
  }

  /**
   * Send player death notification
   */
  sendDeath(): void {
    this.send('game:death', {
      timestamp: Date.now()
    });
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN && this.isAuthenticated;
  }

  /**
   * Get current user ID
   */
  getUserId(): string | null {
    return this.userId;
  }

  /**
   * Get current username
   */
  getUsername(): string | null {
    return this.username;
  }
}

// Singleton instance
let wsInstance: WebSocketService | null = null;

/**
 * Get or create WebSocket service instance
 */
export function getWebSocketService(): WebSocketService {
  if (!wsInstance) {
    wsInstance = new WebSocketService();
  }
  return wsInstance;
}

/**
 * Reset WebSocket service (useful for testing)
 */
export function resetWebSocketService(): void {
  if (wsInstance) {
    wsInstance.disconnect();
    wsInstance = null;
  }
}
