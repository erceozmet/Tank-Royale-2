import Phaser from 'phaser';
import { getWebSocketManager } from '@/network/WebSocketManager';
import { getAPIClient } from '@/network/APIClient';
import type { WebSocketManager } from '@/network/WebSocketManager';
import type { APIClient } from '@/network/APIClient';

export default class LobbyScene extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;
  private playerCountText!: Phaser.GameObjects.Text;
  private wsManager!: WebSocketManager;
  private apiClient!: APIClient;

  constructor() {
    super({ key: 'LobbyScene' });
  }

  async create() {
    this.wsManager = getWebSocketManager();
    this.apiClient = getAPIClient();
    
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Title
    const title = this.add.text(width / 2, 100, 'MATCHMAKING', {
      fontSize: '48px',
      color: '#00ff00',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    // Status text (animated dots)
    this.statusText = this.add.text(width / 2, height / 2, 'Searching for players', {
      fontSize: '32px',
      color: '#ffffff',
    });
    this.statusText.setOrigin(0.5);

    // Animate status dots
    this.time.addEvent({
      delay: 500,
      callback: () => {
        const currentText = this.statusText.text;
        const dots = (currentText.match(/\./g) || []).length;
        if (dots >= 3) {
          this.statusText.setText('Searching for players');
        } else {
          this.statusText.setText(currentText + '.');
        }
      },
      loop: true,
    });

    // Player count
    this.playerCountText = this.add.text(width / 2, height / 2 + 60, '0/16 players', {
      fontSize: '24px',
      color: '#aaaaaa',
    });
    this.playerCountText.setOrigin(0.5);

    // Cancel button
    const cancelButton = this.add.text(width / 2, height - 100, 'Cancel', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#aa0000',
      padding: { x: 40, y: 15 },
    });
    cancelButton.setOrigin(0.5);
    cancelButton.setInteractive({ useHandCursor: true });
    cancelButton.on('pointerover', () => {
      cancelButton.setBackgroundColor('#cc0000');
    });
    cancelButton.on('pointerout', () => {
      cancelButton.setBackgroundColor('#aa0000');
    });
    cancelButton.on('pointerdown', async () => {
      console.log('❌ Matchmaking cancelled');
      try {
        await this.apiClient.leaveMatchmaking();
        this.wsManager.disconnect();
      } catch (error) {
        console.error('Error leaving matchmaking:', error);
      }
      this.scene.start('MenuScene');
    });

    // Connect to WebSocket
    try {
      await this.wsManager.connect();
      this.statusText.setText('Connected! Waiting for players');
      
      // Listen for game start
      this.wsManager.on('game_start', this.onGameStart, this);
    } catch (error) {
      console.error('Failed to connect to game server:', error);
      this.statusText.setText('Connection failed');
      setTimeout(() => this.scene.start('MenuScene'), 3000);
    }

    console.log('✅ LobbyScene: Waiting for players...');
  }

  private onGameStart = (data: any) => {
    console.log('🎮 Game starting!', data);
    this.scene.start('GameScene', data);
  }

  shutdown() {
    if (this.wsManager) {
      this.wsManager.off('game_start', this.onGameStart, this);
    }
  }
}
