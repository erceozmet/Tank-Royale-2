// Game Wrapper Component - Phaser game + UI overlay
import Phaser from 'phaser';
import gameConfig from '../config/game-config';
import { createControlsDisplay } from './ControlsDisplay';
import { createHUD, updateHUD } from './HUD';
import { createMinimap } from './Minimap';

export function createGameWrapper(
  playerName: string,
  _onQuit: () => void // Prefix with _ to indicate intentionally unused
): HTMLElement {
  // Expose updateHUD on window so Phaser scenes can access it
  (window as any).updateHUD = updateHUD;

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

    // CRITICAL: Prevent Phaser from pausing when tab loses focus
    // For multiplayer, we MUST keep processing WebSocket updates even in background
    game.events.on('pause', () => {
      console.log('🚫 Preventing Phaser pause for multiplayer');
      game.loop.sleep(); // Don't pause, just sleep the loop (keeps scenes active)
      game.loop.wake(); // Immediately wake it back up
    });
    
    // Pass player name to game
    game.registry.set('playerName', playerName);

    // Handle page visibility
    // For multiplayer games, we MUST keep game loop running to receive state updates
    // even when tab is in background, otherwise we'll miss game state and get out of sync
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('⏸️ Tab hidden - but keeping game loop active for multiplayer');
        // Don't pause anything - game must keep running to receive WebSocket updates
      } else {
        console.log('▶️ Tab visible');
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
