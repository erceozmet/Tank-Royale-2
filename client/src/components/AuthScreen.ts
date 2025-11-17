// Auth Screen Component - Centered layout with login/register + leaderboard

// Generate leaderboard items
function generateLeaderboardItems(): string {
  const players = [
    { rank: 1, name: 'ProSniper', score: 2847, color: '#fbbf24' },
    { rank: 2, name: 'BlastMaster', score: 2654, color: '#d1d5db' },
    { rank: 3, name: 'NinjaCircle', score: 2431, color: '#cd7f32' },
    { rank: 4, name: 'SpeedDemon', score: 2189, color: '#3b82f6' },
    { rank: 5, name: 'TurboKing', score: 2056, color: '#10b981' },
    { rank: 6, name: 'ShadowBlast', score: 1943, color: '#8b5cf6' },
    { rank: 7, name: 'CircleHero', score: 1829, color: '#ef4444' },
    { rank: 8, name: 'QuickShot', score: 1756, color: '#f97316' },
    { rank: 9, name: 'BlitzKing', score: 1687, color: '#06b6d4' },
    { rank: 10, name: 'ElitePlayer', score: 1623, color: '#ec4899' },
  ];

  return players
    .map(
      (player) => `
    <div class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
      <div class="text-lg font-bold ${player.rank <= 3 ? 'text-2xl' : ''}" style="color: ${player.color}; min-width: 30px;">
        ${player.rank <= 3 ? ['🥇', '🥈', '🥉'][player.rank - 1] : `#${player.rank}`}
      </div>
      <div class="w-8 h-8 rounded-full" style="background-color: ${player.color};"></div>
      <div class="flex-1 text-left">
        <div class="font-semibold text-gray-900 text-sm">${player.name}</div>
        <div class="text-xs text-gray-500 font-mono">${player.score.toLocaleString()} pts</div>
      </div>
    </div>
  `
    )
    .join('');
}

export function createAuthScreen(onPlay: (playerName: string) => void): HTMLElement {
  const container = document.createElement('div');
  container.className = 'fixed inset-0 flex items-center justify-center p-8';
  
  container.innerHTML = `
    <!-- Main Container: Form + Leaderboard - Centered Together -->
    <div class="flex gap-6 items-start">
      <!-- Left Side: Logo, Tabs, Forms -->
      <div class="flex flex-col items-center gap-6 w-[400px]">
        <!-- Logo -->
        <div class="text-center">
          <h1 class="text-6xl font-display font-bold text-gray-900 tracking-wider mb-2">
            blast<span class="text-blue-500">.io</span>
          </h1>
          <p class="text-sm text-gray-500">Battle Royale • Fast Paced • Minimalist</p>
        </div>

        <!-- Tab Switcher -->
        <div class="flex gap-2 p-1 bg-gray-100 rounded-lg w-full">
          <button
            id="login-tab"
            class="flex-1 px-4 py-2 rounded-md font-semibold transition-all bg-blue-500 text-white"
          >
            Quick Play
          </button>
          <button
            id="register-tab"
            class="flex-1 px-4 py-2 rounded-md font-semibold transition-all bg-white/50 text-gray-600"
          >
            Create Account
          </button>
        </div>

        <!-- Quick Play Form -->
        <div id="login-form" class="card-elegant w-full">
          <div class="text-center mb-4">
            <h2 class="text-2xl font-bold text-gray-900">Jump In</h2>
            <p class="text-sm text-gray-500 mt-1">No account needed • Play instantly</p>
          </div>
          
          <div class="space-y-4">
            <div>
              <label for="quick-play-name" class="block text-sm font-semibold text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                id="quick-play-name"
                class="input-elegant"
                placeholder="Enter 3-15 characters"
                maxlength="15"
                autocomplete="off"
              />
            </div>
            
            <button
              id="quick-play-button"
              class="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              disabled
            >
              PLAY NOW
            </button>
          </div>
        </div>

        <!-- Register Form (Hidden by default) -->
        <div id="register-form" class="card-elegant w-full hidden">
          <div class="text-center mb-4">
            <h2 class="text-2xl font-bold text-gray-900">Create Account</h2>
            <p class="text-sm text-gray-500 mt-1">Save your progress • Track stats</p>
          </div>
          
          <div class="space-y-4">
            <div>
              <label for="register-username" class="block text-sm font-semibold text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                id="register-username"
                class="input-elegant"
                placeholder="3-15 characters"
                maxlength="15"
                autocomplete="off"
              />
            </div>
            
            <div>
              <label for="register-email" class="block text-sm font-semibold text-gray-700 mb-2">
                Email <span class="text-gray-400 text-xs">(optional)</span>
              </label>
              <input
                type="email"
                id="register-email"
                class="input-elegant"
                placeholder="your@email.com"
                autocomplete="off"
              />
            </div>
            
            <div>
              <label for="register-password" class="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="register-password"
                class="input-elegant"
                placeholder="At least 6 characters"
                autocomplete="new-password"
              />
            </div>
            
            <button
              id="register-button"
              class="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              disabled
            >
              CREATE & PLAY
            </button>
          </div>
        </div>
      </div>

      <!-- Right Side: Leaderboard -->
      <div class="card-elegant w-[350px]">
        <div class="text-center mb-4">
          <h2 class="text-2xl font-bold text-gray-900">Top Players</h2>
          <p class="text-sm text-gray-500 mt-1">Live Rankings</p>
        </div>

        <!-- Leaderboard List -->
        <div class="space-y-1 mb-4">
          ${generateLeaderboardItems()}
        </div>

        <!-- Stats -->
        <div class="border-t border-gray-200 pt-4 space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Players Online</span>
            <span class="font-bold text-green-600 font-mono">2,431</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Active Matches</span>
            <span class="font-bold text-blue-600 font-mono">158</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Server Status</span>
            <span class="font-bold text-green-600">● Online 24/7</span>
          </div>
        </div>

        <!-- Additional Stats -->
        <div class="mt-4 pt-4 border-t border-gray-200">
          <div class="grid grid-cols-2 gap-3 text-center">
            <div class="bg-gray-50 rounded-lg p-2">
              <div class="font-mono text-lg font-bold text-gray-900">45.2K</div>
              <div class="text-xs text-gray-500">Total Players</div>
            </div>
            <div class="bg-gray-50 rounded-lg p-2">
              <div class="font-mono text-lg font-bold text-gray-900">892K</div>
              <div class="text-xs text-gray-500">Matches Played</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Controls Display - Bottom Center -->
    <div class="absolute bottom-8 left-1/2 transform -translate-x-1/2">
      <div class="card-elegant px-6 py-3">
        <div class="flex items-center gap-6">
          <!-- WASD -->
          <div class="flex items-center gap-2">
            <div class="text-xs text-gray-500 font-semibold">MOVE</div>
            <div class="flex gap-1">
              <div class="w-8 h-8 bg-gray-100 rounded flex items-center justify-center font-mono text-xs font-bold text-gray-700">W</div>
              <div class="w-8 h-8 bg-gray-100 rounded flex items-center justify-center font-mono text-xs font-bold text-gray-700">A</div>
              <div class="w-8 h-8 bg-gray-100 rounded flex items-center justify-center font-mono text-xs font-bold text-gray-700">S</div>
              <div class="w-8 h-8 bg-gray-100 rounded flex items-center justify-center font-mono text-xs font-bold text-gray-700">D</div>
            </div>
          </div>

          <!-- Divider -->
          <div class="w-px h-8 bg-gray-300"></div>

          <!-- SPACE -->
          <div class="flex items-center gap-2">
            <div class="text-xs text-gray-500 font-semibold">TURBO</div>
            <div class="px-4 h-8 bg-gray-100 rounded flex items-center justify-center font-mono text-xs font-bold text-gray-700">SPACE</div>
          </div>

          <!-- Divider -->
          <div class="w-px h-8 bg-gray-300"></div>

          <!-- CLICK -->
          <div class="flex items-center gap-2">
            <div class="text-xs text-gray-500 font-semibold">ATTACK</div>
            <div class="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
              <svg class="w-4 h-4 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/>
              </svg>
            </div>
            <div class="font-mono text-xs font-bold text-gray-700">CLICK</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Get elements
  const loginTab = container.querySelector('#login-tab') as HTMLButtonElement;
  const registerTab = container.querySelector('#register-tab') as HTMLButtonElement;
  const loginForm = container.querySelector('#login-form') as HTMLDivElement;
  const registerForm = container.querySelector('#register-form') as HTMLDivElement;
  
  const quickPlayInput = container.querySelector('#quick-play-name') as HTMLInputElement;
  const quickPlayButton = container.querySelector('#quick-play-button') as HTMLButtonElement;
  
  const registerUsername = container.querySelector('#register-username') as HTMLInputElement;
  const registerEmail = container.querySelector('#register-email') as HTMLInputElement;
  const registerPassword = container.querySelector('#register-password') as HTMLInputElement;
  const registerButton = container.querySelector('#register-button') as HTMLButtonElement;

  // Tab switching
  loginTab.addEventListener('click', () => {
    loginTab.classList.add('bg-blue-500', 'text-white');
    loginTab.classList.remove('bg-white/50', 'text-gray-600');
    registerTab.classList.remove('bg-blue-500', 'text-white');
    registerTab.classList.add('bg-white/50', 'text-gray-600');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
  });

  registerTab.addEventListener('click', () => {
    registerTab.classList.add('bg-blue-500', 'text-white');
    registerTab.classList.remove('bg-white/50', 'text-gray-600');
    loginTab.classList.remove('bg-blue-500', 'text-white');
    loginTab.classList.add('bg-white/50', 'text-gray-600');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  });

  // Quick Play validation
  quickPlayInput.addEventListener('input', () => {
    const name = quickPlayInput.value.trim();
    const isValid = name.length >= 3 && name.length <= 15;
    
    quickPlayButton.disabled = !isValid;
    
    if (isValid) {
      quickPlayButton.classList.remove('opacity-50', 'cursor-not-allowed');
      quickPlayButton.classList.add('pulse-glow');
    } else {
      quickPlayButton.classList.add('opacity-50', 'cursor-not-allowed');
      quickPlayButton.classList.remove('pulse-glow');
    }
  });

  // Register form validation
  function validateRegisterForm() {
    const username = registerUsername.value.trim();
    const password = registerPassword.value.trim();
    const isValid = username.length >= 3 && username.length <= 15 && password.length >= 6;
    
    registerButton.disabled = !isValid;
    
    if (isValid) {
      registerButton.classList.remove('opacity-50', 'cursor-not-allowed');
      registerButton.classList.add('pulse-glow');
    } else {
      registerButton.classList.add('opacity-50', 'cursor-not-allowed');
      registerButton.classList.remove('pulse-glow');
    }
  }

  registerUsername.addEventListener('input', validateRegisterForm);
  registerPassword.addEventListener('input', validateRegisterForm);

  // Quick Play - Enter key
  quickPlayInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !quickPlayButton.disabled) {
      handleQuickPlay();
    }
  });

  // Quick Play button
  quickPlayButton.addEventListener('click', handleQuickPlay);

  function handleQuickPlay() {
    const name = quickPlayInput.value.trim();
    if (name.length >= 3 && name.length <= 15) {
      localStorage.setItem('blast-io-player-name', name);
      onPlay(name);
    }
  }

  // Register button
  registerButton.addEventListener('click', () => {
    const username = registerUsername.value.trim();
    const email = registerEmail.value.trim();
    const password = registerPassword.value.trim();
    
    if (username.length >= 3 && username.length <= 15 && password.length >= 6) {
      // TODO: Send to API for registration
      console.log('Register:', { username, email, password });
      
      // For now, just play with username
      localStorage.setItem('blast-io-player-name', username);
      localStorage.setItem('blast-io-registered', 'true');
      onPlay(username);
    }
  });

  // Load saved name
  const savedName = localStorage.getItem('blast-io-player-name');
  if (savedName) {
    quickPlayInput.value = savedName;
    quickPlayInput.dispatchEvent(new Event('input'));
  }

  return container;
}
