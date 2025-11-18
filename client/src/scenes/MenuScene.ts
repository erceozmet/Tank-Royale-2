import Phaser from 'phaser';
import { getToken } from '../services/auth';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
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

    // Check if authenticated (user went through app.ts auth)
    const token = getToken();
    if (!token) {
      // This shouldn't happen since app.ts requires auth first
      console.error('❌ No token found in MenuScene - returning to auth');
      // Game will need to be restarted to go through auth
      return;
    }

    this.showMainMenu();

    console.log('✅ MenuScene: Initialized');
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
      // Navigate to matchmaking scene
      this.scene.start('MatchmakingScene');
    });
  }
}
