import Phaser from 'phaser';
import { joinQueue, leaveQueue, getQueueStatus } from '../services/matchmaking';
import { getWebSocketService } from '../services/websocket';
import { getToken } from '../services/auth';

/**
 * MatchmakingScene - Handles lobby search and matchmaking
 * Uses elegant HTML overlay matching the AuthScreen style
 */
export default class MatchmakingScene extends Phaser.Scene {
  private overlay: HTMLDivElement | null = null;
  private statusCheckInterval: number | null = null;
  private inQueue: boolean = false;
  private dotsInterval: number | null = null;

  constructor() {
    super({ key: 'MatchmakingScene' });
  }

  create() {
    console.log('🔍 MatchmakingScene: Starting lobby search');

    // Create HTML overlay
    this.createOverlay();

    // Setup WebSocket listeners for match found
    this.setupWebSocketListeners();

    // Join queue automatically when scene starts
    this.joinMatchmakingQueue();

    // Start status polling
    this.startStatusPolling();
  }

  private createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'matchmaking-overlay';
    this.overlay.className = 'fixed inset-0 z-50 flex items-center justify-center';
    this.overlay.style.background = 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)';

    this.overlay.innerHTML = `
      <div class="flex flex-col items-center gap-6 w-[450px]">
        <!-- Logo -->
        <div class="text-center mb-2">
          <h1 class="text-5xl font-display font-bold text-gray-900 tracking-wider mb-2">
            blast<span class="text-blue-500">.io</span>
          </h1>
        </div>

        <!-- Main Card -->
        <div class="card-elegant w-full text-center">
          <!-- Animated Loading Spinner -->
          <div class="mb-6">
            <div class="inline-flex items-center justify-center w-20 h-20 relative">
              <div class="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
              <div class="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
              <svg class="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
            </div>
          </div>

          <!-- Status Text -->
          <div class="mb-6">
            <h2 class="text-2xl font-bold text-gray-900 mb-2">Finding Match</h2>
            <p id="searching-text" class="text-gray-500">Searching for players...</p>
          </div>

          <!-- Queue Stats -->
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="bg-gray-50 rounded-xl p-4">
              <div id="players-count" class="text-3xl font-bold font-mono text-blue-600">--</div>
              <div class="text-sm text-gray-500 font-semibold">In Queue</div>
            </div>
            <div class="bg-gray-50 rounded-xl p-4">
              <div id="wait-time" class="text-3xl font-bold font-mono text-gray-900">--</div>
              <div class="text-sm text-gray-500 font-semibold">Est. Wait</div>
            </div>
          </div>

          <!-- Info Text -->
          <p class="text-sm text-gray-400 mb-6">Need 2+ players to start a match</p>

          <!-- Cancel Button -->
          <button id="cancel-btn" class="w-full px-6 py-3 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 font-semibold rounded-xl transition-all border border-transparent hover:border-red-200">
            Cancel
          </button>
        </div>

        <!-- Tips Card -->
        <div class="card-elegant w-full">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
              </svg>
            </div>
            <div class="text-left">
              <div class="font-semibold text-gray-900 text-sm">Pro Tip</div>
              <div class="text-xs text-gray-500">Use WASD to move, mouse to aim, click to shoot!</div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);

    // Add cancel button listener
    const cancelBtn = this.overlay.querySelector('#cancel-btn');
    cancelBtn?.addEventListener('click', () => {
      this.cancelMatchmaking();
    });

    // Start dots animation
    this.startDotsAnimation();
  }

  private startDotsAnimation() {
    let dots = 0;
    this.dotsInterval = window.setInterval(() => {
      dots = (dots + 1) % 4;
      const searchText = this.overlay?.querySelector('#searching-text');
      if (searchText) {
        searchText.textContent = 'Searching for players' + '.'.repeat(dots);
      }
    }, 500);
  }

  private setupWebSocketListeners() {
    const ws = getWebSocketService();

    ws.on('match_found', (payload: any) => {
      console.log('🎮 Match found!', payload);
      this.onMatchFound(payload);
    });

    ws.on('queue_update', (payload: any) => {
      console.log('📊 Queue update:', payload);
      this.updateQueueDisplay(payload.playersInQueue, payload.estimatedWaitTime);
    });
  }

  private updateQueueDisplay(playersInQueue?: number, estimatedWait?: number) {
    if (!this.overlay) return;

    if (playersInQueue !== undefined) {
      const playersEl = this.overlay.querySelector('#players-count');
      if (playersEl) {
        playersEl.textContent = playersInQueue.toString();
      }
    }

    if (estimatedWait !== undefined) {
      const waitEl = this.overlay.querySelector('#wait-time');
      if (waitEl) {
        waitEl.textContent = `${estimatedWait}s`;
      }
    }
  }

  private async joinMatchmakingQueue() {
    try {
      this.inQueue = true;
      await joinQueue();
      console.log('✅ Joined matchmaking queue');
    } catch (error) {
      console.error('❌ Failed to join queue:', error);
      const searchText = this.overlay?.querySelector('#searching-text');
      if (searchText) {
        searchText.textContent = 'Failed to join queue. Try again.';
        (searchText as HTMLElement).style.color = '#ef4444';
      }
    }
  }

  private async cancelMatchmaking() {
    console.log('❌ Cancelling matchmaking');
    
    try {
      this.inQueue = false;
      await leaveQueue();
      console.log('✅ Left matchmaking queue');
    } catch (error) {
      console.error('❌ Failed to leave queue:', error);
    }

    this.cleanup();
    
    // Return to main menu
    if ((window as any).returnToMainMenu) {
      (window as any).returnToMainMenu();
    }
  }

  private startStatusPolling() {
    this.statusCheckInterval = window.setInterval(() => {
      this.checkQueueStatus();
    }, 2000);

    this.checkQueueStatus();
  }

  private stopStatusPolling() {
    if (this.statusCheckInterval !== null) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
  }

  private async checkQueueStatus() {
    if (!this.inQueue) return;

    try {
      const status = await getQueueStatus();
      
      if (status.status === 'matched' || status.matched || status.matchId) {
        console.log('🎉 Match found via polling! Match ID:', status.matchId);
        this.onMatchFound({ matchId: status.matchId, playerCount: status.playerCount });
        return;
      }

      this.updateQueueDisplay(status.playersInQueue, status.estimatedWaitTime);
    } catch (error) {
      console.error('Failed to check queue status:', error);
    }
  }

  private async onMatchFound(payload: any) {
    console.log('🎉 Match found! Starting game...', payload);
    
    this.stopStatusPolling();
    this.inQueue = false;

    // Update UI to show match found
    const searchText = this.overlay?.querySelector('#searching-text');
    if (searchText) {
      searchText.textContent = '🎉 Match Found! Connecting...';
      (searchText as HTMLElement).style.color = '#10b981';
    }

    this.registry.set('matchId', payload.matchId);

    try {
      const ws = getWebSocketService();
      if (!ws.isConnected()) {
        console.log('🔌 Connecting to game server...');
        const token = getToken();
        if (!token) {
          throw new Error('No auth token found');
        }
        await ws.connect(token);
        console.log('✅ Connected to game server');
      }

      this.time.delayedCall(500, () => {
        console.log('Transitioning to GameScene with matchId:', payload.matchId);
        this.cleanup();
        this.scene.start('GameScene', {
          matchId: payload.matchId,
        });
      });
    } catch (error) {
      console.error('❌ Failed to connect to game server:', error);
      if (searchText) {
        searchText.textContent = 'Connection failed. Try again.';
        (searchText as HTMLElement).style.color = '#ef4444';
      }
    }
  }

  private cleanup() {
    this.stopStatusPolling();
    
    if (this.dotsInterval) {
      clearInterval(this.dotsInterval);
      this.dotsInterval = null;
    }

    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  shutdown() {
    console.log('🛑 MatchmakingScene: Shutting down');
    this.cleanup();
    
    const ws = getWebSocketService();
    ws.off('match_found', this.onMatchFound);
    ws.off('queue_update', () => {});
  }
}
