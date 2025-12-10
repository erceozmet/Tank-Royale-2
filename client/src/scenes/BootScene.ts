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

    console.log('📦 BootScene: Loading blast.io...');

    // Load tank sprites (body + turret separate for rotation)
    // Player = green, Enemies = red
    this.load.image('tank-body-green', '/assets/sprites/tanks/tankGreen.png');
    this.load.image('tank-body-red', '/assets/sprites/tanks/tankRed.png');
    this.load.image('tank-turret-green', '/assets/sprites/tanks/turret-green.png');
    this.load.image('tank-turret-red', '/assets/sprites/tanks/turret-red.png');

    // Load bullet sprites (gray for all)
    this.load.image('bullet-gray', '/assets/sprites/weapons/bulletGray.png');
    // Legacy bullet colors (kept for compatibility)
    this.load.image('bullet-green', '/assets/sprites/weapons/bulletGreen.png');
    this.load.image('bullet-red', '/assets/sprites/weapons/bulletRed.png');

    // Load loot crate sprites
    // Health = green, Armor = red/orange, Ammo = grey
    this.load.image('crate-health', '/assets/sprites/loot/crate-health.png');
    this.load.image('crate-armor', '/assets/sprites/loot/crate-armor.png');
    this.load.image('crate-ammo', '/assets/sprites/loot/crate-ammo.png');

    // Load explosion/smoke animation (always grey smoke)
    for (let i = 0; i <= 5; i++) {
      this.load.image(`explosion-orange-${i}`, `/assets/sprites/effects/smokeOrange${i}.png`);
      this.load.image(`smoke-grey-${i}`, `/assets/sprites/effects/smokeGrey${i}.png`);
    }

    // Load terrain background (LPC Terrains by bluecarrot16 et al. - CC-BY-SA 3.0)
    // Single large 4000x4000 arena map with varied terrain
    this.load.image('arena-map', '/assets/terrain/arena-map.jpg');
  }

  create() {
    console.log('✅ BootScene: blast.io initialized');

    // Create explosion animation
    this.anims.create({
      key: 'explosion',
      frames: [
        { key: 'explosion-orange-0' },
        { key: 'explosion-orange-1' },
        { key: 'explosion-orange-2' },
        { key: 'explosion-orange-3' },
        { key: 'explosion-orange-4' },
        { key: 'explosion-orange-5' },
      ],
      frameRate: 12,
      repeat: 0,
      hideOnComplete: true,
    });

    // Create smoke trail animation
    this.anims.create({
      key: 'smoke-trail',
      frames: [
        { key: 'smoke-grey-0' },
        { key: 'smoke-grey-1' },
        { key: 'smoke-grey-2' },
        { key: 'smoke-grey-3' },
      ],
      frameRate: 10,
      repeat: 0,
      hideOnComplete: true,
    });
    
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
