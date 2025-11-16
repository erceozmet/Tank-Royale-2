import Phaser from 'phaser';
import type {
  NetworkMessage,
  MessageType,
  GameState,
  PlayerHitMessage,
  PlayerDiedMessage,
  LootCollectedMessage,
  GameStartMessage,
  GameOverMessage,
  PlayerInputMessage,
  ShootMessage,
  CollectLootMessage,
  SwitchWeaponMessage,
} from '@/types';

/**
 * WebSocket Manager for Tank Royale 2
 * Handles real-time communication with game server
 * Singleton pattern with Phaser EventEmitter
 */
export class WebSocketManager extends Phaser.Events.EventEmitter {
  private static instance: WebSocketManager;
  private ws: WebSocket | null = null;
  private wsURL: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private isConnected = false;
  private isConnecting = false;
  private shouldReconnect = true;
  private heartbeatInterval: number | null = null;
  private lastPingTime = 0;
  private latency = 0;

  private constructor() {
    super();
    this.wsURL = import.meta.env.VITE_WS_URL || 'ws://localhost:8081';
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Connect to WebSocket server with authentication token
   */
  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.warn('WebSocket already connected');
      return Promise.resolve();
    }

    if (this.isConnecting) {
      console.warn('WebSocket connection already in progress');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const token = localStorage.getItem('token');
      if (!token) {
        const error = new Error('No authentication token found');
        this.emit('error', error);
        reject(error);
        return;
      }

      this.isConnecting = true;
      const wsUrl = `${this.wsURL}/ws?token=${token}`;

      console.log(`🔌 Connecting to WebSocket: ${this.wsURL}`);

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected');
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.startHeartbeat();
          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.emit('error', error);
          if (this.isConnecting) {
            reject(error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket disconnected', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
          });
          
          this.isConnected = false;
          this.isConnecting = false;
          this.stopHeartbeat();
          this.emit('disconnected', { code: event.code, reason: event.reason });

          // Attempt reconnection if not a clean close
          if (this.shouldReconnect && !event.wasClean) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        this.isConnecting = false;
        this.emit('error', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   * @param reconnect Whether to allow automatic reconnection
   */
  public disconnect(reconnect: boolean = false): void {
    this.shouldReconnect = reconnect;
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }

    this.isConnected = false;
    this.isConnecting = false;
  }

  /**
   * Check if currently connected
   */
  public get connected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get current latency in milliseconds
   */
  public getLatency(): number {
    return this.latency;
  }

  // ============================================================================
  // Reconnection Logic
  // ============================================================================

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.emit('reconnect_failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    console.log(
      `🔄 Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`
    );

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  // ============================================================================
  // Heartbeat / Ping-Pong
  // ============================================================================

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = window.setInterval(() => {
      if (this.connected) {
        this.lastPingTime = Date.now();
        this.send('ping', { timestamp: this.lastPingTime });
      }
    }, 10000); // Every 10 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // ============================================================================
  // Message Handling
  // ============================================================================

  private handleMessage(data: string): void {
    try {
      const message: NetworkMessage = JSON.parse(data);
      
      // Handle pong response
      if (message.type === 'pong') {
        this.latency = Date.now() - this.lastPingTime;
        this.emit('latency_update', this.latency);
        return;
      }

      // Route message to appropriate handler
      this.emit(message.type, message.data);

      // Special handling for common message types
      switch (message.type) {
        case 'game_state':
          this.emit('game_state', message.data as GameState);
          break;
        case 'player_hit':
          this.emit('player_hit', message.data as PlayerHitMessage);
          break;
        case 'player_died':
          this.emit('player_died', message.data as PlayerDiedMessage);
          break;
        case 'loot_collected':
          this.emit('loot_collected', message.data as LootCollectedMessage);
          break;
        case 'game_start':
          this.emit('game_start', message.data as GameStartMessage);
          break;
        case 'game_over':
          this.emit('game_over', message.data as GameOverMessage);
          break;
        case 'error':
          console.error('Server error:', message.data);
          this.emit('server_error', message.data);
          break;
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error, data);
    }
  }

  // ============================================================================
  // Sending Messages
  // ============================================================================

  /**
   * Send a message to the server
   * @param type Message type
   * @param data Message payload
   */
  public send(type: MessageType | string, data: any): void {
    if (!this.connected) {
      console.warn('Cannot send message: WebSocket not connected');
      return;
    }

    try {
      const message: NetworkMessage = { type, data };
      this.ws!.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
    }
  }

  // ============================================================================
  // Game-Specific Messages
  // ============================================================================

  /**
   * Send player input to server
   */
  public sendPlayerInput(input: PlayerInputMessage): void {
    this.send('player_input', input);
  }

  /**
   * Send shoot action to server
   */
  public sendShoot(shoot: ShootMessage): void {
    this.send('shoot', shoot);
  }

  /**
   * Send collect loot request to server
   */
  public sendCollectLoot(loot: CollectLootMessage): void {
    this.send('collect_loot', loot);
  }

  /**
   * Send switch weapon request to server
   */
  public sendSwitchWeapon(weapon: SwitchWeaponMessage): void {
    this.send('switch_weapon', weapon);
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.shouldReconnect = false;
    this.disconnect();
    this.removeAllListeners();
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export function getWebSocketManager(): WebSocketManager {
  return WebSocketManager.getInstance();
}

export default WebSocketManager;
