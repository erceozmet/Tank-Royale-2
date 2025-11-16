import Phaser from 'phaser';
import { getAPIClient } from '@/network/APIClient';
import type { APIClient } from '@/network/APIClient';

export default class MenuScene extends Phaser.Scene {
  private apiClient!: APIClient;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    this.apiClient = getAPIClient();
    
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Title
    const title = this.add.text(width / 2, height / 4, 'TANK ROYALE 2', {
      fontSize: '64px',
      color: '#00ff00',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    // Subtitle
    const subtitle = this.add.text(width / 2, height / 4 + 70, 'Battle Royale', {
      fontSize: '24px',
      color: '#ffffff',
    });
    subtitle.setOrigin(0.5);

    // Check if already logged in
    const token = localStorage.getItem('token');
    if (token) {
      this.showMainMenu();
    } else {
      this.showAuthButtons();
    }

    console.log('✅ MenuScene: Initialized');
  }

  private showAuthButtons() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Login button
    const loginButton = this.add.text(width / 2, height / 2, 'Login', {
      fontSize: '32px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 40, y: 15 },
    });
    loginButton.setOrigin(0.5);
    loginButton.setInteractive({ useHandCursor: true });
    loginButton.on('pointerover', () => {
      loginButton.setBackgroundColor('#444444');
    });
    loginButton.on('pointerout', () => {
      loginButton.setBackgroundColor('#333333');
    });
    loginButton.on('pointerdown', () => {
      // TODO: Show login form (Phase 3)
      console.log('TODO: Show login form');
    });

    // Register button
    const registerButton = this.add.text(width / 2, height / 2 + 70, 'Register', {
      fontSize: '32px',
      color: '#ffffff',
      backgroundColor: '#00aa00',
      padding: { x: 40, y: 15 },
    });
    registerButton.setOrigin(0.5);
    registerButton.setInteractive({ useHandCursor: true });
    registerButton.on('pointerover', () => {
      registerButton.setBackgroundColor('#00cc00');
    });
    registerButton.on('pointerout', () => {
      registerButton.setBackgroundColor('#00aa00');
    });
    registerButton.on('pointerdown', () => {
      // TODO: Show register form (Phase 3)
      console.log('TODO: Show register form');
    });
  }

  private showMainMenu() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Play button
    const playButton = this.add.text(width / 2, height / 2, 'PLAY', {
      fontSize: '48px',
      color: '#ffffff',
      backgroundColor: '#00aa00',
      padding: { x: 60, y: 20 },
    });
    playButton.setOrigin(0.5);
    playButton.setInteractive({ useHandCursor: true });
    playButton.on('pointerover', () => {
      playButton.setBackgroundColor('#00cc00');
      playButton.setScale(1.05);
    });
    playButton.on('pointerout', () => {
      playButton.setBackgroundColor('#00aa00');
      playButton.setScale(1);
    });
    playButton.on('pointerdown', async () => {
      console.log('🎮 Starting matchmaking...');
      try {
        await this.apiClient.joinMatchmaking();
        this.scene.start('LobbyScene');
      } catch (error) {
        console.error('Failed to join matchmaking:', error);
      }
    });

    // Logout button (small, in corner)
    const logoutButton = this.add.text(width - 20, 20, 'Logout', {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#aa0000',
      padding: { x: 15, y: 8 },
    });
    logoutButton.setOrigin(1, 0);
    logoutButton.setInteractive({ useHandCursor: true });
    logoutButton.on('pointerover', () => {
      logoutButton.setBackgroundColor('#cc0000');
    });
    logoutButton.on('pointerout', () => {
      logoutButton.setBackgroundColor('#aa0000');
    });
    logoutButton.on('pointerdown', () => {
      localStorage.removeItem('token');
      this.scene.restart();
    });
  }
}
