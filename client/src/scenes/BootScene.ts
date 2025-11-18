import Phaser from 'phaser';
import { COLORS } from '../config/constants';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Set white background for blast.io
    this.cameras.main.setBackgroundColor(COLORS.BACKGROUND);

    // Display loading progress
    this.createLoadingBar();

    // Load assets (currently using graphics, so minimal loading)
    console.log('📦 BootScene: Loading blast.io...');
  }

  create() {
    console.log('✅ BootScene: blast.io initialized');
    
    // Skip MenuScene - go directly to matchmaking since auth is handled by React
    this.scene.start('MatchmakingScene');
  }

  private createLoadingBar() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0xe5e7eb, 1);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'blast.io', {
      fontSize: '32px',
      fontFamily: 'Orbitron, sans-serif',
      color: '#1f2937',
    });
    loadingText.setOrigin(0.5, 0.5);

    const percentText = this.add.text(width / 2, height / 2, '0%', {
      fontSize: '18px',
      fontFamily: 'Inter, sans-serif',
      color: '#6b7280',
    });
    percentText.setOrigin(0.5, 0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x3b82f6, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
      percentText.setText(`${Math.floor(value * 100)}%`);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
    });
  }
}
