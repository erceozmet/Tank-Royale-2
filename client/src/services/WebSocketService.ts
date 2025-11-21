// WebSocket Service for blast.io multiplayer communication

// Legacy interfaces - kept for reference but unused
// Game state is now handled by GameScene with server-provided structure
/*
interface PlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  health: number;
  isTurbo: boolean;
}

interface BulletState {
  id: string;
  playerId: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
}

interface GameState {
  players: Map<string, PlayerState>;
  bullets: BulletState[];
  playersAlive: number;
  safeZoneRadius: number;
  safeZoneX: number;
  safeZoneY: number;
}
*/

type MessageHandler = (data: any) => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private playerId: string | null = null;
  private playerName: string = '';

  constructor(private url: string = 'ws://localhost:8081/ws') {}

  connect(playerName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.playerName = playerName;

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('🔗 WebSocket connected to game server');
          this.reconnectAttempts = 0;

          // Send join message
          this.send('join', { name: playerName });
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('🔌 WebSocket disconnected');
          this.attemptReconnect();
        };
      } catch (error) {
        console.error('❌ Failed to connect WebSocket:', error);
        reject(error);
      }
    });
  }

  private handleMessage(data: string) {
    try {
      const message = JSON.parse(data);
      const { type, payload } = message;

      // Handle special messages
      if (type === 'player_id') {
        this.playerId = payload.id;
        console.log('👤 Received player ID:', this.playerId);
        this.emit('player_id', payload);
        return;
      }

      // Emit to registered handlers
      this.emit(type, payload);
    } catch (error) {
      console.error('❌ Failed to parse WebSocket message:', error);
    }
  }

  send(type: string, payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type, payload });
      this.ws.send(message);
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send:', type);
    }
  }

  // Send player position update
  sendPosition(x: number, y: number, isTurbo: boolean) {
    this.send('player_move', { x, y, isTurbo });
  }

  // Send attack/shoot event
  sendAttack(targetX: number, targetY: number) {
    this.send('player_attack', { targetX, targetY });
  }

  // Send player death
  sendDeath() {
    this.send('player_death', {});
  }

  // Register message handler
  on(type: string, handler: MessageHandler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  // Unregister message handler
  off(type: string, handler: MessageHandler) {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Emit message to handlers
  private emit(type: string, data: any) {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.emit('connection_failed', {});
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      if (this.playerName) {
        this.connect(this.playerName).catch((error) => {
          console.error('❌ Reconnection failed:', error);
        });
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageHandlers.clear();
    this.playerId = null;
    console.log('🔌 WebSocket disconnected');
  }

  getPlayerId(): string | null {
    return this.playerId;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
export const wsService = new WebSocketService();
