import Phaser from 'phaser';
import BootScene from '@scenes/BootScene';
import MatchmakingScene from '@scenes/MatchmakingScene';
import LobbyScene from '@scenes/LobbyScene';
import GameScene from '@scenes/GameScene';
import GameOverScene from '@scenes/GameOverScene';

export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // WebGL with Canvas fallback
  width: 1280,
  height: 720,
  parent: 'phaser-game',
  backgroundColor: '#ffffff', // White background
  
  // CRITICAL: Disable pause on blur for multiplayer
  // Without this, game stops updating when tab is hidden
  disableContextMenu: true,
  
  physics: {
    default: 'arcade',
    arcade: {
      debug: false, // Set to true for debugging
      gravity: { x: 0, y: 0 }, // Top-down game, no gravity
    },
  },
  
  scene: [
    BootScene,
    MatchmakingScene,
    LobbyScene,
    GameScene,
    GameOverScene,
  ],
  
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  
  input: {
    keyboard: true,
    mouse: true,
    touch: false, // Desktop-only
  },
  
  render: {
    pixelArt: false,
    antialias: true,
    antialiasGL: true,
    roundPixels: false,
  },
  
  fps: {
    target: 60,
    forceSetTimeOut: true, // CRITICAL: Use setTimeout instead of RAF for background tab support
  },
  
  dom: {
    createContainer: true, // Allow DOM elements in scenes
  },
};

export default GAME_CONFIG;

