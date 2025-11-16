import Phaser from 'phaser';
import { MAP_WIDTH, MAP_HEIGHT } from '@config/constants';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Set up world bounds
    this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Background
    this.cameras.main.setBackgroundColor('#2d2d2d');

    // Temporary placeholder
    const text = this.add.text(width / 2, height / 2, 'GAME SCENE\n(Rendering coming in Phase 4)', {
      fontSize: '32px',
      color: '#ffffff',
      align: 'center',
    });
    text.setOrigin(0.5);
    text.setScrollFactor(0); // Fixed to camera

    // Debug info
    const debugText = this.add.text(10, 10, 'Press ESC to return to menu', {
      fontSize: '16px',
      color: '#aaaaaa',
    });
    debugText.setScrollFactor(0);

    // ESC to return to menu
    this.input.keyboard?.on('keydown-ESC', () => {
      console.log('🔙 Returning to menu');
      this.scene.start('MenuScene');
    });

    // TODO: Implement game rendering (Phase 4)
    // - Player entity with sprite
    // - Other players with interpolation
    // - Projectiles
    // - Loot items
    // - Map obstacles
    // - HUD (health, ammo, kills)
    // - Minimap

    console.log('✅ GameScene: Initialized');
    console.log(`📐 World size: ${MAP_WIDTH}x${MAP_HEIGHT}`);

    // Simulate game over after 10 seconds (temporary)
    this.time.delayedCall(10000, () => {
      console.log('🏁 Game over!');
      this.scene.start('GameOverScene', {
        placement: 3,
        kills: 5,
        damage: 350,
      });
    });
  }

  update() {
    // TODO: Update game state (Phase 4)
    // - Process input
    // - Update client prediction
    // - Interpolate other players
    // - Update camera position
  }
}
