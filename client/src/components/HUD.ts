// HUD Component - Streamlined, clean design
export function createHUD(playerName: string): HTMLElement {
  const container = document.createElement('div');
  container.className = 'flex items-start justify-between no-select pointer-events-none';

  container.innerHTML = `
    <!-- Player Info (Left) - Compact dark panel -->
    <div class="pointer-events-auto" style="
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      border-radius: 8px;
      padding: 12px 16px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    ">
      <div class="flex items-center gap-3">
        <!-- Health Bar -->
        <div style="width: 120px;">
          <div class="flex items-center justify-between mb-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#ef4444">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span id="health-value" style="font-family: monospace; font-size: 12px; font-weight: bold; color: #10b981;">100</span>
          </div>
          <div style="
            height: 6px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
            overflow: hidden;
          ">
            <div id="health-bar-fill" style="
              width: 100%;
              height: 100%;
              background: linear-gradient(90deg, #10b981, #34d399);
              border-radius: 3px;
              transition: width 0.2s ease;
            "></div>
          </div>
        </div>
        
        <!-- Player Name -->
        <div style="
          font-size: 13px;
          font-weight: 600;
          color: #e2e8f0;
          padding-left: 8px;
          border-left: 1px solid rgba(255, 255, 255, 0.1);
        " id="player-name-display">${playerName}</div>
      </div>
    </div>

    <!-- Players Alive (Top Center-Right) -->
    <div class="pointer-events-auto" style="
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      border-radius: 8px;
      padding: 8px 16px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      text-align: center;
    ">
      <div style="font-family: monospace; font-size: 20px; font-weight: bold; color: #f8fafc;" id="players-alive-count">2</div>
      <div style="font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Alive</div>
    </div>

    <!-- Zone Warning (will be positioned center) -->
    <div id="zone-warning" class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 hidden pointer-events-auto">
      <div style="
        background: rgba(239, 68, 68, 0.9);
        backdrop-filter: blur(8px);
        border-radius: 8px;
        padding: 12px 20px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
      ">
        <div class="flex items-center gap-2" style="color: white;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" class="animate-pulse">
            <path d="M12 2L1 21h22L12 2zm0 4l8 15H4l8-15zm-1 10h2v2h-2v-2zm0-6h2v5h-2V10z"/>
          </svg>
          <span style="font-weight: bold; font-size: 14px;" id="zone-warning-text">Zone closing in 30s</span>
        </div>
      </div>
    </div>
    
    <!-- Hidden elements for compatibility -->
    <div id="player-color-indicator" class="hidden"></div>
    <div id="powerup-display" class="hidden"></div>
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
    const healthBarFill = document.getElementById('health-bar-fill');
    
    if (healthElement) {
      healthElement.textContent = data.health.toString();
      // Change color based on health
      if (data.health > 60) {
        healthElement.style.color = '#10b981'; // Green
      } else if (data.health > 30) {
        healthElement.style.color = '#fbbf24'; // Yellow
      } else {
        healthElement.style.color = '#ef4444'; // Red
      }
    }
    
    if (healthBarFill) {
      const percentage = Math.max(0, Math.min(100, data.health));
      healthBarFill.style.width = `${percentage}%`;
      
      // Change bar color based on health
      if (data.health > 60) {
        healthBarFill.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
      } else if (data.health > 30) {
        healthBarFill.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
      } else {
        healthBarFill.style.background = 'linear-gradient(90deg, #dc2626, #ef4444)';
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
