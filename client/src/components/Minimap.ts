// Minimap Component - Top-right corner
export function createMinimap(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'minimap w-48 h-48 p-2 no-select';

  // Canvas for minimap rendering
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 192;
  canvas.className = 'w-full h-full rounded-lg';
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
  let _mapHeight = 4000; // Prefix with _ to indicate intentionally unused (reserved for future)
  let safeZoneRadius = 2000;
  let safeZoneX = 2000;
  let safeZoneY = 2000;
  let playerX = 0;
  let playerY = 0;

  function render() {
    if (!ctx) return; // Guard against null context
    
    // Clear canvas
    ctx.fillStyle = '#f9fafb'; // Light gray background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw map border
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Draw safe zone circle
    // Note: Currently using square map (mapWidth === mapHeight)
    // For future non-square maps, use: const scaleY = canvas.height / mapHeight;
    const scale = canvas.width / mapWidth;
    const centerX = (safeZoneX * scale);
    const centerY = (safeZoneY * scale);
    const radius = safeZoneRadius * scale;

    // Outer danger zone (red tint)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Safe zone (white)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Safe zone border (blue)
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw player position (green dot)
    const playerPosX = (playerX * scale);
    const playerPosY = (playerY * scale);
    
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(playerPosX, playerPosY, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Player dot border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(playerPosX, playerPosY, 4, 0, Math.PI * 2);
    ctx.stroke();

    // Add "YOU" label
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 10px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('YOU', playerPosX, playerPosY - 8);

    requestAnimationFrame(render);
  }

  // Start rendering loop
  render();

  // Expose update functions
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
    _mapHeight = data.mapHeight; // Match the underscore prefix
    safeZoneX = data.safeZoneX;
    safeZoneY = data.safeZoneY;
    safeZoneRadius = data.safeZoneRadius;
  };
}
