// Controls Display Component - Bottom-left
export function createControlsDisplay(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'controls-display no-select';

  container.innerHTML = `
    <div class="text-gray-700">
      <div class="text-xs font-bold mb-2 text-gray-500 uppercase tracking-wider">Controls</div>
      
      <!-- Movement -->
      <div class="flex items-center gap-2 mb-1">
        <div class="flex gap-1">
          <kbd class="bg-gray-100 px-2 py-1 rounded text-xs font-bold border border-gray-300">W</kbd>
          <kbd class="bg-gray-100 px-2 py-1 rounded text-xs font-bold border border-gray-300">A</kbd>
          <kbd class="bg-gray-100 px-2 py-1 rounded text-xs font-bold border border-gray-300">S</kbd>
          <kbd class="bg-gray-100 px-2 py-1 rounded text-xs font-bold border border-gray-300">D</kbd>
        </div>
        <span class="text-xs">Move</span>
      </div>

      <!-- Turbo -->
      <div class="flex items-center gap-2 mb-1">
        <kbd class="bg-gray-100 px-3 py-1 rounded text-xs font-bold border border-gray-300">SPACE</kbd>
        <span class="text-xs">Turbo</span>
      </div>

      <!-- Attack -->
      <div class="flex items-center gap-2">
        <div class="bg-gray-100 px-2 py-1 rounded text-xs font-bold border border-gray-300 flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 3L21 12L3 21V3Z"/>
          </svg>
          CLICK
        </div>
        <span class="text-xs">Attack</span>
      </div>
    </div>
  `;

  return container;
}
