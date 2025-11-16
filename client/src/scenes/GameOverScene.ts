import Phaser from 'phaser';

interface GameOverData {
  placement: number;
  kills: number;
  damage: number;
}

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: GameOverData) {
    const { placement, kills, damage } = data;
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background overlay
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.8);
    overlay.setOrigin(0);

    // Title
    const title = this.add.text(width / 2, 150, 'GAME OVER', {
      fontSize: '64px',
      color: '#ff0000',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    // Placement
    const placementColor = placement === 1 ? '#00ff00' : placement <= 3 ? '#ffaa00' : '#ffffff';
    const placementText = this.add.text(width / 2, 270, `#${placement}`, {
      fontSize: '72px',
      color: placementColor,
      fontStyle: 'bold',
    });
    placementText.setOrigin(0.5);

    // Stats
    const killsText = this.add.text(width / 2, 380, `Kills: ${kills}`, {
      fontSize: '28px',
      color: '#ffffff',
    });
    killsText.setOrigin(0.5);

    const damageText = this.add.text(width / 2, 430, `Damage: ${damage}`, {
      fontSize: '28px',
      color: '#ffffff',
    });
    damageText.setOrigin(0.5);

    // Return to menu button
    const menuButton = this.add.text(width / 2, 550, 'Return to Menu', {
      fontSize: '28px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 40, y: 15 },
    });
    menuButton.setOrigin(0.5);
    menuButton.setInteractive({ useHandCursor: true });
    menuButton.on('pointerover', () => {
      menuButton.setBackgroundColor('#444444');
      menuButton.setScale(1.05);
    });
    menuButton.on('pointerout', () => {
      menuButton.setBackgroundColor('#333333');
      menuButton.setScale(1);
    });
    menuButton.on('pointerdown', () => {
      console.log('🔙 Returning to menu');
      this.scene.start('MenuScene');
    });

    console.log('✅ GameOverScene: Initialized');
    console.log(`📊 Results - Placement: #${placement}, Kills: ${kills}, Damage: ${damage}`);
  }
}
