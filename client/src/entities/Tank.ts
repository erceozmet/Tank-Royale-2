import Phaser from 'phaser';

/**
 * Tank entity with separate body and turret sprites
 * Body and turret can rotate independently
 */
export class Tank extends Phaser.GameObjects.Container {
  private bodySprite: Phaser.GameObjects.Sprite;
  private turretSprite: Phaser.GameObjects.Sprite;
  private nameText: Phaser.GameObjects.Text;
  private healthBarBg: Phaser.GameObjects.Graphics;
  private healthBarFill: Phaser.GameObjects.Graphics;
  
  private tankColor: 'green' | 'red';

  constructor(
    scene: Phaser.Scene, 
    x: number, 
    y: number, 
    playerName: string, 
    isLocal: boolean = false
  ) {
    super(scene, x, y);

    // Player = green, All enemies = red
    this.tankColor = isLocal ? 'green' : 'red';

    // Create tank body sprite
    this.bodySprite = scene.add.sprite(0, 0, `tank-body-${this.tankColor}`);
    this.bodySprite.setOrigin(0.5, 0.5);
    this.add(this.bodySprite);

    // Create turret sprite (will rotate towards aim direction)
    // Pivot at the left edge (0, 0.5) so the turret extends outward from tank center toward mouse
    this.turretSprite = scene.add.sprite(0, 0, `tank-turret-${this.tankColor}`);
    this.turretSprite.setOrigin(0.5, 0); // Pivot at left edge, barrel extends right toward mouse
    this.add(this.turretSprite);

    // Player name above tank
    this.nameText = scene.add.text(0, -40, playerName, {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 6, y: 3 },
    }).setOrigin(0.5);
    this.add(this.nameText);

    // Health bar (background)
    this.healthBarBg = scene.add.graphics();
    this.add(this.healthBarBg);

    // Health bar (fill)
    this.healthBarFill = scene.add.graphics();
    this.add(this.healthBarFill);

    // Initialize health bar
    this.updateHealthBar(100, 100);

    scene.add.existing(this);
  }

  /**
   * Update tank body rotation (movement direction)
   */
  setBodyRotation(angle: number) {
    this.bodySprite.setRotation(angle);
  }

  /**
   * Update turret rotation (aim direction)
   */
  setTurretRotation(angle: number) {
    this.turretSprite.setRotation(angle);
  }

  /**
   * Update health bar above tank
   */
  updateHealthBar(current: number, max: number) {
    this.healthBarBg.clear();
    this.healthBarFill.clear();

    const barWidth = 50;
    const barHeight = 5;
    const barY = -32;
    const percentage = Math.max(0, Math.min(1, current / max));

    // Background (dark)
    this.healthBarBg.fillStyle(0x000000, 0.5);
    this.healthBarBg.fillRect(-barWidth / 2, barY, barWidth, barHeight);

    // Health fill (color based on percentage)
    let color = 0x10b981; // Green
    if (percentage < 0.5) color = 0xfbbf24; // Yellow
    if (percentage < 0.25) color = 0xef4444; // Red
    
    this.healthBarFill.fillStyle(color, 1);
    this.healthBarFill.fillRect(-barWidth / 2, barY, barWidth * percentage, barHeight);

    // Border
    this.healthBarBg.lineStyle(1, 0xffffff, 0.8);
    this.healthBarBg.strokeRect(-barWidth / 2, barY, barWidth, barHeight);
  }

  /**
   * Update player name text
   */
  setPlayerName(name: string) {
    this.nameText.setText(name);
  }

  /**
   * Play explosion animation when tank is destroyed
   */
  playExplosion() {
    const explosion = this.scene.add.sprite(this.x, this.y, 'explosion-orange-0');
    explosion.setScale(1.5);
    explosion.play('explosion');
    explosion.once('animationcomplete', () => explosion.destroy());
    
    // Camera shake
    this.scene.cameras.main.shake(200, 0.003);
  }

  /**
   * Destroy tank and cleanup
   */
  destroy(fromScene?: boolean) {
    this.healthBarBg.destroy();
    this.healthBarFill.destroy();
    super.destroy(fromScene);
  }
}
