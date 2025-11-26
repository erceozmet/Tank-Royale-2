import Phaser from 'phaser';

interface PlayerResult {
  user_id: string;
  username: string;
  placement: number;
  kills: number;
  damage_dealt: number;
  survival_time: number;
  mmr_change: number;
}

interface GameOverData {
  match_id: string;
  duration: number;
  rankings: PlayerResult[];
  winner_id: string;
  localPlayerId?: string; // Passed separately
}

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: GameOverData) {
    const { rankings, winner_id, localPlayerId } = data;
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Find local player's result
    const localResult = rankings.find(r => r.user_id === localPlayerId);
    
    if (!localResult) {
      console.error('❌ GameOverScene: Local player result not found');
      this.scene.start('MatchmakingScene');
      return;
    }

    const { placement, kills, damage_dealt, survival_time, mmr_change } = localResult;
    const isWinner = localResult.user_id === winner_id;

    // Background overlay
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.85);
    overlay.setOrigin(0);

    // Title - Victory or Defeat
    const titleText = isWinner ? 'VICTORY!' : 'DEFEATED';
    const titleColor = isWinner ? '#00ff00' : '#ff3333';
    const title = this.add.text(width / 2, 120, titleText, {
      fontSize: '72px',
      color: titleColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    });
    title.setOrigin(0.5);

    // Placement badge
    const placementColor = placement === 1 ? '#ffd700' : placement <= 3 ? '#c0c0c0' : '#cd7f32';
    const placementBg = this.add.circle(width / 2, 240, 70, 0x222222);
    placementBg.setStrokeStyle(4, parseInt(placementColor.replace('#', '0x')));
    
    const placementText = this.add.text(width / 2, 240, `#${placement}`, {
      fontSize: '64px',
      color: placementColor,
      fontStyle: 'bold',
    });
    placementText.setOrigin(0.5);

    // Stats panel
    const statsY = 360;
    const statSpacing = 50;
    
    const killsText = this.add.text(width / 2, statsY, `Kills: ${kills}`, {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    killsText.setOrigin(0.5);

    const damageText = this.add.text(width / 2, statsY + statSpacing, `Damage: ${Math.round(damage_dealt)}`, {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    damageText.setOrigin(0.5);

    const survivalText = this.add.text(width / 2, statsY + statSpacing * 2, `Survival: ${survival_time}s`, {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    survivalText.setOrigin(0.5);

    // MMR change (only if non-zero)
    if (mmr_change !== 0) {
      const mmrColor = mmr_change > 0 ? '#00ff00' : '#ff3333';
      const mmrSign = mmr_change > 0 ? '+' : '';
      const mmrText = this.add.text(width / 2, statsY + statSpacing * 3, `MMR: ${mmrSign}${mmr_change}`, {
        fontSize: '32px',
        color: mmrColor,
        fontStyle: 'bold',
      });
      mmrText.setOrigin(0.5);
    }

    // Return to menu button
    const buttonY = height - 120;
    const menuButton = this.add.text(width / 2, buttonY, 'Return to Menu', {
      fontSize: '32px',
      color: '#ffffff',
      backgroundColor: '#2a2a2a',
      padding: { x: 50, y: 20 },
      stroke: '#ffffff',
      strokeThickness: 2,
    });
    menuButton.setOrigin(0.5);
    menuButton.setInteractive({ useHandCursor: true });
    
    menuButton.on('pointerover', () => {
      menuButton.setBackgroundColor('#3a3a3a');
      menuButton.setScale(1.05);
    });
    
    menuButton.on('pointerout', () => {
      menuButton.setBackgroundColor('#2a2a2a');
      menuButton.setScale(1);
    });
    
    menuButton.on('pointerdown', () => {
      this.scene.start('MatchmakingScene');
    });
  }
}
