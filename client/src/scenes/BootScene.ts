import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Display loading progress
    this.createLoadingBar();

    // Load assets
    this.loadImages();
    this.loadSounds();
  }

  create() {
    // Remove HTML loading screen
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'none';
    }

    // Add loaded class to body
    document.body.classList.add('loaded');

    console.log('✅ BootScene: Assets loaded');
    
    // Start menu scene
    this.scene.start('MenuScene');
  }

  private createLoadingBar() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontSize: '20px',
      color: '#ffffff',
    });
    loadingText.setOrigin(0.5, 0.5);

    const percentText = this.add.text(width / 2, height / 2, '0%', {
      fontSize: '18px',
      color: '#ffffff',
    });
    percentText.setOrigin(0.5, 0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x00ff00, 1);
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

  private loadImages() {
    // TODO: Load actual sprite assets when available
    // this.load.image('tank', 'assets/sprites/tank.png');
    // this.load.image('bullet', 'assets/sprites/bullet.png');
    // this.load.image('shield', 'assets/sprites/loot/shield.png');
    
    console.log('📦 BootScene: Loading images...');
  }

  private loadSounds() {
    // TODO: Load actual sound assets when available
    // this.load.audio('shoot-pistol', 'assets/sounds/shoot-pistol.mp3');
    // this.load.audio('hit', 'assets/sounds/hit.mp3');
    // this.load.audio('loot-pickup', 'assets/sounds/loot-pickup.mp3');
    
    console.log('🔊 BootScene: Loading sounds...');
  }
}
