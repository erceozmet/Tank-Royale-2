// Minimap Component - Streamlined and clean design
export function createMinimap(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'no-select';
  container.style.cssText = `
    width: 140px;
    height: 140px;
    background: rgba(15, 23, 42, 0.85);
    border-radius: 8px;
    padding: 8px;
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  `;

  // Canvas for minimap rendering
  const canvas = document.createElement('canvas');
  canvas.width = 124;
  canvas.height = 124;
  canvas.style.cssText = `
    width: 100%;
    height: 100%;
    border-radius: 4px;
  `;
  container.appendChild(canvas);

  // Initialize minimap rendering
  initMinimapRendering(canvas);

  return container;
}

function initMinimapRendering(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Map dimensions (will be updated from game state)
  let mapWidth = 4000;
  let mapHeight = 4000;
  let safeZoneRadius = 2000;
  let safeZoneX = 2000;
  let safeZoneY = 2000;
  let playerX = 0;
  let playerY = 0;

  function render() {
    if (!ctx) return;
    
    // Clear canvas with dark background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate scale
    const scale = canvas.width / Math.max(mapWidth, mapHeight);
    const centerX = safeZoneX * scale;
    const centerY = safeZoneY * scale;
    const radius = safeZoneRadius * scale;

    // Danger zone (subtle red tint)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Safe zone (darker area)
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Safe zone border (cyan/blue glow)
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Player position
    const playerPosX = playerX * scale;
    const playerPosY = playerY * scale;
    
    // Player dot with glow
    ctx.fillStyle = '#10b981';
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(playerPosX, playerPosY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // White border on player dot
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(playerPosX, playerPosY, 4, 0, Math.PI * 2);
    ctx.stroke();

    requestAnimationFrame(render);
  }

  render();

  // Expose update function
  (window as any).updateMinimap = (data: {
    playerX: number;
    playerY: number;
    mapWidth: number;
    mapHeight: number;
    safeZoneX: number;
    safeZoneY: number;
    safeZoneRadius: number;
  }) => {
    playerX = data.playerX;
    playerY = data.playerY;
    mapWidth = data.mapWidth;
    mapHeight = data.mapHeight;
    safeZoneX = data.safeZoneX;
    safeZoneY = data.safeZoneY;
    safeZoneRadius = data.safeZoneRadius;
  };
}
