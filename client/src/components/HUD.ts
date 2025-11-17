// HUD Component - Player stats at top
export function createHUD(playerName: string): HTMLElement {
  const container = document.createElement('div');
  container.className = 'flex items-start justify-between no-select pointer-events-none';

  container.innerHTML = `
    <!-- Player Info (Left) -->
    <div class="hud-element px-4 py-3 pointer-events-auto">
      <div class="flex items-center gap-3">
        <!-- Player Circle (color indicator) -->
        <div class="w-8 h-8 rounded-full border-2 border-gray-300" id="player-color-indicator"></div>
        
        <!-- Player Stats -->
        <div>
          <div class="font-bold text-gray-900" id="player-name-display">${playerName}</div>
          <div class="flex items-center gap-4 mt-1">
            <!-- Health -->
            <div class="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="text-red-500">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <div class="font-mono font-bold text-sm">
                <span id="health-value" class="text-green-600">100</span>
                <span class="text-gray-400">/100</span>
              </div>
            </div>
            
            <!-- Upgrades/Power-ups -->
            <div class="flex gap-1" id="powerup-display">
              <!-- Power-ups will be added dynamically -->
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Players Alive (Center-Right) -->
    <div class="hud-element px-6 py-3 pointer-events-auto">
      <div class="text-center">
        <div class="text-2xl font-bold font-mono text-gray-900" id="players-alive-count">100</div>
        <div class="text-xs text-gray-500 uppercase tracking-wide">Players Alive</div>
      </div>
    </div>

    <!-- Zone Warning (will be positioned center) -->
    <div id="zone-warning" class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 hidden pointer-events-auto">
      <div class="zone-warning">
        <div class="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="animate-pulse">
            <path d="M12 2L1 21h22L12 2zm0 4l8 15H4l8-15zm-1 10h2v2h-2v-2zm0-6h2v5h-2V10z"/>
          </svg>
          <span class="font-bold" id="zone-warning-text">Zone closing in 30s</span>
        </div>
      </div>
    </div>
  `;

  return container;
}

// Helper function to update HUD
export function updateHUD(data: {
  health?: number;
  playersAlive?: number;
  powerups?: string[];
  playerColor?: string;
}) {
  if (data.health !== undefined) {
    const healthElement = document.getElementById('health-value');
    if (healthElement) {
      healthElement.textContent = data.health.toString();
      // Change color based on health
      if (data.health > 60) {
        healthElement.className = 'text-green-600';
      } else if (data.health > 30) {
        healthElement.className = 'text-yellow-600';
      } else {
        healthElement.className = 'text-red-600 animate-pulse';
      }
    }
  }

  if (data.playersAlive !== undefined) {
    const playersElement = document.getElementById('players-alive-count');
    if (playersElement) {
      playersElement.textContent = data.playersAlive.toString();
    }
  }

  if (data.playerColor) {
    const colorIndicator = document.getElementById('player-color-indicator');
    if (colorIndicator) {
      colorIndicator.style.backgroundColor = data.playerColor;
    }
  }

  if (data.powerups) {
    const powerupDisplay = document.getElementById('powerup-display');
    if (powerupDisplay) {
      powerupDisplay.innerHTML = data.powerups
        .map(
          (powerup) => `
        <div class="w-6 h-6 bg-purple-500 rounded flex items-center justify-center text-white text-xs font-bold" title="${powerup}">
          ${powerup[0].toUpperCase()}
        </div>
      `
        )
        .join('');
    }
  }
}

// Show/hide zone warning
export function showZoneWarning(secondsRemaining: number) {
  const warning = document.getElementById('zone-warning');
  const text = document.getElementById('zone-warning-text');
  if (warning && text) {
    warning.classList.remove('hidden');
    text.textContent = `Zone closing in ${secondsRemaining}s`;
  }
}

export function hideZoneWarning() {
  const warning = document.getElementById('zone-warning');
  if (warning) {
    warning.classList.add('hidden');
  }
}
