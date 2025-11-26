import Phaser from 'phaser';
import { joinQueue, leaveQueue, getQueueStatus } from '../services/matchmaking';
import { getWebSocketService } from '../services/websocket';
import { getToken } from '../services/auth';
import { COLORS } from '../config/constants';

/**
 * MatchmakingScene - Handles lobby search and matchmaking
 * Shows queue status, estimated wait time, and allows cancellation
 */
export default class MatchmakingScene extends Phaser.Scene {
  private searchingText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private playersInQueueText!: Phaser.GameObjects.Text;
  private cancelButton!: Phaser.GameObjects.Rectangle;
  private cancelButtonText!: Phaser.GameObjects.Text;
  private loadingDots: string = '';
  private statusCheckInterval: number | null = null;
  private inQueue: boolean = false;

  // Animation elements
  private searchIcon!: Phaser.GameObjects.Graphics;
  private rotationAngle: number = 0;

  constructor() {
    super({ key: 'MatchmakingScene' });
  }

  create() {
    console.log('🔍 MatchmakingScene: Starting lobby search');

    // Set background
    this.cameras.main.setBackgroundColor(COLORS.BACKGROUND);

    // Create UI elements
    this.createUI();

    // Setup WebSocket listeners for match found
    this.setupWebSocketListeners();

    // Join queue automatically when scene starts
    this.joinMatchmakingQueue();

    // Start status polling
    this.startStatusPolling();
  }

  private createUI() {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // Title
    const title = this.add.text(centerX, centerY - 200, 'FINDING MATCH', {
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'Arial',
    });
    title.setOrigin(0.5);

    // Searching animation icon (spinning circle)
    // TODO: Replace with AI-generated loading spinner asset
    this.searchIcon = this.add.graphics();
    this.searchIcon.x = centerX;
    this.searchIcon.y = centerY - 80;
    this.drawSearchIcon();

    // Searching text with animated dots
    this.searchingText = this.add.text(centerX, centerY, 'Searching for players...', {
      fontSize: '24px',
      color: '#aaaaaa',
      fontFamily: 'Arial',
    });
    this.searchingText.setOrigin(0.5);

    // Queue status
    this.statusText = this.add.text(centerX, centerY + 50, 'Estimated wait: --s', {
      fontSize: '20px',
      color: '#888888',
      fontFamily: 'Arial',
    });
    this.statusText.setOrigin(0.5);

    // Players in queue
    this.playersInQueueText = this.add.text(centerX, centerY + 90, 'Players in queue: --', {
      fontSize: '20px',
      color: '#888888',
      fontFamily: 'Arial',
    });
    this.playersInQueueText.setOrigin(0.5);

    // Cancel button
    // TODO: Replace with AI-generated button asset with hover effects
    const buttonWidth = 200;
    const buttonHeight = 50;
    this.cancelButton = this.add.rectangle(
      centerX,
      centerY + 180,
      buttonWidth,
      buttonHeight,
      0xff4444
    );
    this.cancelButton.setInteractive({ useHandCursor: true });
    this.cancelButton.setStrokeStyle(2, 0xffffff);

    this.cancelButtonText = this.add.text(centerX, centerY + 180, 'CANCEL', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'Arial',
    });
    this.cancelButtonText.setOrigin(0.5);

    // Button hover effects
    this.cancelButton.on('pointerover', () => {
      this.cancelButton.setFillStyle(0xff6666);
      this.cancelButton.setScale(1.05);
    });

    this.cancelButton.on('pointerout', () => {
      this.cancelButton.setFillStyle(0xff4444);
      this.cancelButton.setScale(1.0);
    });

    this.cancelButton.on('pointerdown', () => {
      this.cancelMatchmaking();
    });

    // Helper text
    const helperText = this.add.text(centerX, centerY + 260, 
      'Need 8-16 players to start a match', {
      fontSize: '16px',
      color: '#666666',
      fontFamily: 'Arial',
      align: 'center',
    });
    helperText.setOrigin(0.5);
  }

  private drawSearchIcon() {
    this.searchIcon.clear();
    
    // Draw rotating loading circle
    // TODO: Replace with AI-generated animated loading icon
    this.searchIcon.lineStyle(4, 0x3b82f6, 1);
    this.searchIcon.beginPath();
    this.searchIcon.arc(0, 0, 40, this.rotationAngle, this.rotationAngle + Math.PI * 1.5);
    this.searchIcon.strokePath();
    
    // Inner circle
    this.searchIcon.lineStyle(2, 0x60a5fa, 0.5);
    this.searchIcon.beginPath();
    this.searchIcon.arc(0, 0, 30, -this.rotationAngle, -this.rotationAngle + Math.PI);
    this.searchIcon.strokePath();
  }

  private setupWebSocketListeners() {
    const ws = getWebSocketService();

    // Listen for match_found event
    ws.on('match_found', (payload: any) => {
      console.log('🎮 Match found!', payload);
      this.onMatchFound(payload);
    });

    // Listen for queue_update events
    ws.on('queue_update', (payload: any) => {
      console.log('📊 Queue update:', payload);
      if (payload.playersInQueue !== undefined) {
        this.playersInQueueText.setText(`Players in queue: ${payload.playersInQueue}`);
      }
    });
  }

  private async joinMatchmakingQueue() {
    try {
      this.inQueue = true;
      await joinQueue();
      console.log('✅ Joined matchmaking queue');
    } catch (error) {
      console.error('❌ Failed to join queue:', error);
      this.statusText.setText('Failed to join queue');
      this.statusText.setColor('#ff4444');
      
      // Stay on matchmaking screen and allow retry
      this.time.delayedCall(2000, () => {
        this.statusText.setText('Click "Find Match" to try again');
        this.statusText.setColor('#ffffff');
      });
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

    // Clean up
    this.stopStatusPolling();
    
    // Reset UI to initial state (stay on matchmaking screen)
    this.statusText.setText('Queue cancelled');
    this.statusText.setColor('#ffffff');
    this.playersInQueueText.setText('');
  }

  private startStatusPolling() {
    // Poll queue status every 2 seconds
    this.statusCheckInterval = window.setInterval(() => {
      this.checkQueueStatus();
    }, 2000);

    // Initial check
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
      
      // Check if match was found
      if (status.status === 'matched' || status.matched || status.matchId) {
        console.log('🎉 Match found via polling! Match ID:', status.matchId);
        this.onMatchFound({ matchId: status.matchId, playerCount: status.playerCount });
        return;
      }

      // Update UI with queue status
      if (status.playersInQueue !== undefined) {
        this.playersInQueueText.setText(`Players in queue: ${status.playersInQueue}`);
      }

      if (status.estimatedWaitTime !== undefined) {
        this.statusText.setText(`Estimated wait: ${status.estimatedWaitTime}s`);
      }
    } catch (error) {
      console.error('Failed to check queue status:', error);
    }
  }

  private async onMatchFound(payload: any) {
    console.log('🎉 Match found! Starting game...', payload);
    
    // Stop polling
    this.stopStatusPolling();
    this.inQueue = false;

    // Update UI
    this.searchingText.setText('Match Found!');
    this.searchingText.setColor('#10b981');
    this.statusText.setText('Connecting to game server...');

    // Store match data
    this.registry.set('matchId', payload.matchId);

    try {
      // Ensure WebSocket is connected to game server
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

      // Transition to game scene after brief delay
      this.time.delayedCall(500, () => {
        console.log('Transitioning to GameScene with matchId:', payload.matchId);
        this.scene.start('GameScene', {
          matchId: payload.matchId,
        });
      });
    } catch (error) {
      console.error('❌ Failed to connect to game server:', error);
      this.statusText.setText('Connection failed. Try again.');
      this.statusText.setColor('#ff4444');
      // Stay on matchmaking screen, allow retry
    }
  }

  update(time: number, _delta: number) {
    // Animate loading dots
    const dotsCount = Math.floor((time / 500) % 4);
    this.loadingDots = '.'.repeat(dotsCount);
    this.searchingText.setText(`Searching for players${this.loadingDots}`);

    // Rotate search icon
    this.rotationAngle += 0.05;
    this.drawSearchIcon();
  }

  shutdown() {
    console.log('🛑 MatchmakingScene: Shutting down');
    
    // Clean up
    this.stopStatusPolling();
    
    // Remove WebSocket listeners
    const ws = getWebSocketService();
    ws.off('match_found', this.onMatchFound);
    ws.off('queue_update', () => {});
  }
}
