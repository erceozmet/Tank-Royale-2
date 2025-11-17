// Game Wrapper Component - Phaser game + UI overlay
import Phaser from 'phaser';
import gameConfig from '../config/game-config';
import { createControlsDisplay } from './ControlsDisplay';
import { createHUD } from './HUD';
import { createMinimap } from './Minimap';

export function createGameWrapper(
  playerName: string,
  onQuit: () => void
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'relative w-full h-full overflow-hidden';

  // Phaser game container
  const gameContainer = document.createElement('div');
  gameContainer.id = 'phaser-game';
  gameContainer.className = 'absolute inset-0 z-0';

  // UI overlay container
  const uiOverlay = document.createElement('div');
  uiOverlay.className = 'game-ui-overlay';

  // Add controls display (bottom-left)
  const controls = createControlsDisplay();
  controls.className += ' absolute bottom-6 left-6 slide-in-left';
  uiOverlay.appendChild(controls);

  // Add HUD (top)
  const hud = createHUD(playerName);
  hud.className += ' absolute top-6 left-6 right-6 slide-in-right';
  uiOverlay.appendChild(hud);

  // Add minimap (top-right)
  const minimap = createMinimap();
  minimap.className += ' absolute top-6 right-6 slide-in-right';
  uiOverlay.appendChild(minimap);

  // Append elements
  container.appendChild(gameContainer);
  container.appendChild(uiOverlay);

  // Initialize Phaser game after DOM is ready
  setTimeout(() => {
    const game = new Phaser.Game({
      ...gameConfig,
      parent: 'phaser-game',
    });

    // Pass player name to game
    game.registry.set('playerName', playerName);

    // Handle page visibility (pause/resume)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        game.pause();
      } else {
        game.resume();
      }
    });

    // Debug in development
    if (import.meta.env.DEV) {
      (window as any).game = game;
      console.log('🎮 Game initialized for:', playerName);
    }
  }, 100);

  return container;
}
