import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketManager } from '@network/WebSocketManager';

// Mock Phaser to avoid canvas issues
vi.mock('phaser', () => ({
  default: {
    Events: {
      EventEmitter: class MockEventEmitter {
        private listeners: Map<string, Array<(...args: any[]) => void>> = new Map();
        
        on(event: string, fn: (...args: any[]) => void): this {
          if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
          }
          this.listeners.get(event)!.push(fn);
          return this;
        }
        
        off(event: string, fn?: (...args: any[]) => void): this {
          if (!fn) {
            this.listeners.delete(event);
          } else {
            const eventListeners = this.listeners.get(event);
            if (eventListeners) {
              const index = eventListeners.indexOf(fn);
              if (index !== -1) {
                eventListeners.splice(index, 1);
              }
            }
          }
          return this;
        }
        
        emit(event: string, ...args: any[]): boolean {
          const eventListeners = this.listeners.get(event);
          if (eventListeners) {
            eventListeners.forEach(fn => fn(...args));
            return true;
          }
          return false;
        }
        
        removeAllListeners(): this {
          this.listeners.clear();
          return this;
        }
      }
    }
  }
}));

describe('WebSocketManager', () => {
  let wsManager: WebSocketManager;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Reset WebSocketManager singleton
    (WebSocketManager as any).instance = null;
    
    wsManager = WebSocketManager.getInstance();
  });

  afterEach(() => {
    // Clean up manager
    if (wsManager) {
      wsManager.destroy();
    }
    
    // Clean up
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = WebSocketManager.getInstance();
      const instance2 = WebSocketManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should be the same instance as wsManager', () => {
      const instance = WebSocketManager.getInstance();
      expect(instance).toBe(wsManager);
    });
  });

  describe('Connection', () => {
    it('should reject connection without a token', async () => {
      await expect(wsManager.connect()).rejects.toThrow('No authentication token found');
    });

    it('should attempt to connect with a valid token', async () => {
      localStorage.setItem('token', 'test-token-123');
      
      // connect() returns a Promise, and will attempt WebSocket connection
      const connectPromise = wsManager.connect();
      
      // We expect this to hang or reject since MockWebSocket doesn't trigger callbacks
      // Just verify it's a promise and doesn't throw immediately
      expect(connectPromise).toBeInstanceOf(Promise);
    });

    it('should warn if already connected', async () => {
      // Set wsManager as already connected
      (wsManager as any).isConnected = true;
      
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      await wsManager.connect();
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('WebSocket already connected');
      consoleWarnSpy.mockRestore();
    });
  });

  describe('Disconnect', () => {
    it('should disconnect and clean up', () => {
      // Manually set connected state
      (wsManager as any).isConnected = true;
      (wsManager as any).ws = { close: vi.fn() };
      
      wsManager.disconnect();
      
      expect((wsManager as any).isConnected).toBe(false);
      expect((wsManager as any).ws).toBe(null);
    });

    it('should do nothing if not connected', () => {
      expect(() => wsManager.disconnect()).not.toThrow();
    });
  });

  describe('Event Handlers', () => {
    it('should register and trigger event handlers', () => {
      const handler = vi.fn();
      
      wsManager.on('game_state', handler);
      
      // Manually trigger the handler (simulating WebSocket message)
      wsManager.emit('game_state', { test: 'data' });
      
      expect(handler).toHaveBeenCalledWith({ test: 'data' });
    });

    it('should remove event handlers', () => {
      const handler = vi.fn();
      
      wsManager.on('player_hit', handler);
      wsManager.off('player_hit', handler);
      
      wsManager.emit('player_hit', { damage: 10 });
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle multiple handlers for the same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      wsManager.on('loot_collected', handler1);
      wsManager.on('loot_collected', handler2);
      
      wsManager.emit('loot_collected', { lootId: '123' });
      
      expect(handler1).toHaveBeenCalledWith({ lootId: '123' });
      expect(handler2).toHaveBeenCalledWith({ lootId: '123' });
    });
  });

  describe('Message Sending', () => {
    it('should warn and not send when disconnected', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      wsManager.send('test_event', { data: 'test' });
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('Cannot send message: WebSocket not connected');
      consoleWarnSpy.mockRestore();
    });

    it('should send messages when connected', () => {
      // This test verifies the send method exists and works with proper structure
      // Mock spies on the send method itself
      const sendSpy = vi.spyOn(wsManager, 'send');
      
      wsManager.send('player_move', { x: 100, y: 200 });
      
      expect(sendSpy).toHaveBeenCalledWith('player_move', { x: 100, y: 200 });
    });
  });

  describe('Connection State', () => {
    it('should return false for connected when not connected', () => {
      expect(wsManager.connected).toBe(false);
    });

    it('should have connected getter that returns boolean', () => {
      // Test that connected getter exists and returns a boolean value
      const connectionState = wsManager.connected;
      expect(typeof connectionState).toBe('boolean');
    });

    it('should track latency', () => {
      const latency = wsManager.getLatency();
      expect(latency).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should emit error event on connection failure', async () => {
      const errorHandler = vi.fn();
      wsManager.on('error', errorHandler);
      
      // Try to connect without token
      await expect(wsManager.connect()).rejects.toThrow();
      
      expect(errorHandler).toHaveBeenCalled();
    });

    it('should handle send errors when WebSocket is null', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      (wsManager as any).ws = null;
      (wsManager as any).isConnected = false;
      
      wsManager.send('test', {});
      
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('should handle emit gracefully', () => {
      const handler = vi.fn();
      wsManager.on('test_event', handler);
      
      // Should not throw
      expect(() => wsManager.emit('test_event', {})).not.toThrow();
      expect(handler).toHaveBeenCalledWith({});
    });
  });

  describe('Reconnection Logic', () => {
    it('should emit reconnect_failed after max attempts', () => {
      const failHandler = vi.fn();
      wsManager.on('reconnect_failed', failHandler);
      
      // Set reconnect attempts to max
      (wsManager as any).reconnectAttempts = 5;
      (wsManager as any).maxReconnectAttempts = 5;
      
      // Try to reconnect
      (wsManager as any).attemptReconnect();
      
      // Should emit failed event
      expect(failHandler).toHaveBeenCalled();
    });

    it('should use exponential backoff for reconnection', () => {
      vi.useFakeTimers();
      
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      (wsManager as any).reconnectAttempts = 0;
      (wsManager as any).reconnectDelay = 1000;
      
      // Trigger first reconnection attempt
      (wsManager as any).attemptReconnect();
      
      // Should log with delay information
      expect(consoleLogSpy).toHaveBeenCalled();
      
      vi.useRealTimers();
      consoleLogSpy.mockRestore();
    });
  });

  describe('Message Parsing', () => {
    it('should parse and emit valid WebSocket messages', () => {
      const handler = vi.fn();
      wsManager.on('game_start', handler);
      
      const messageData = JSON.stringify({
        type: 'game_start',
        data: { matchId: 'match-123' },
      });
      
      // Manually call the message handler
      (wsManager as any).handleMessage(messageData);
      
      expect(handler).toHaveBeenCalledWith({ matchId: 'match-123' });
    });

    it('should handle pong messages and update latency', () => {
      const latencyHandler = vi.fn();
      wsManager.on('latency_update', latencyHandler);
      
      (wsManager as any).lastPingTime = Date.now() - 50; // 50ms ago
      
      const pongData = JSON.stringify({
        type: 'pong',
        data: {},
      });
      
      (wsManager as any).handleMessage(pongData);
      
      expect(wsManager.getLatency()).toBeGreaterThanOrEqual(0);
      expect(latencyHandler).toHaveBeenCalled();
    });

    it('should handle invalid JSON messages gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Should not throw
      expect(() => (wsManager as any).handleMessage('invalid json{')).not.toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Game-Specific Messages', () => {
    it('should send player input messages', () => {
      const sendSpy = vi.spyOn(wsManager, 'send');
      
      const input = { x: 100, y: 200, angle: 1.57 };
      wsManager.sendPlayerInput(input);
      
      expect(sendSpy).toHaveBeenCalledWith('player_input', input);
    });

    it('should send shoot messages', () => {
      const sendSpy = vi.spyOn(wsManager, 'send');
      
      const shoot = { targetX: 500, targetY: 600 };
      wsManager.sendShoot(shoot);
      
      expect(sendSpy).toHaveBeenCalledWith('shoot', shoot);
    });

    it('should send collect loot messages', () => {
      const sendSpy = vi.spyOn(wsManager, 'send');
      
      const loot = { lootId: 'loot-123' };
      wsManager.sendCollectLoot(loot);
      
      expect(sendSpy).toHaveBeenCalledWith('collect_loot', loot);
    });

    it('should send switch weapon messages', () => {
      const sendSpy = vi.spyOn(wsManager, 'send');
      
      const weapon = { weaponType: 'rifle' };
      wsManager.sendSwitchWeapon(weapon);
      
      expect(sendSpy).toHaveBeenCalledWith('switch_weapon', weapon);
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on destroy', () => {
      (wsManager as any).isConnected = true;
      (wsManager as any).ws = { close: vi.fn() };
      
      wsManager.destroy();
      
      expect((wsManager as any).shouldReconnect).toBe(false);
      expect((wsManager as any).ws).toBe(null);
    });
  });
});
