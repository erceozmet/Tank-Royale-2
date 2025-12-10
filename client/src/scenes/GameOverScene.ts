import Phaser from 'phaser';
import { leaveQueue } from '../services/matchmaking';

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
  localPlayerId?: string;
}

export default class GameOverScene extends Phaser.Scene {
  private overlay: HTMLDivElement | null = null;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: GameOverData) {
    const { rankings, winner_id, localPlayerId } = data;

    // Find local player's result
    const localResult = rankings.find(r => r.user_id === localPlayerId);
    
    if (!localResult) {
      console.error('❌ GameOverScene: Local player result not found');
      console.log('Rankings:', rankings);
      console.log('Looking for localPlayerId:', localPlayerId);
    }

    const result = localResult || {
      placement: rankings.length || 1,
      kills: 0,
      damage_dealt: 0,
      survival_time: 0,
      mmr_change: 0,
      user_id: localPlayerId || '',
      username: 'Player'
    };

    const { placement, kills, damage_dealt, survival_time, mmr_change } = result;
    const isWinner = result.user_id === winner_id;

    // Create HTML overlay
    this.createOverlay(isWinner, placement, kills, damage_dealt, survival_time, mmr_change, rankings);
  }

  private createOverlay(
    isWinner: boolean,
    placement: number,
    kills: number,
    damage: number,
    survivalTime: number,
    mmrChange: number,
    rankings: PlayerResult[]
  ) {
    // Create overlay container
    this.overlay = document.createElement('div');
    this.overlay.id = 'game-over-overlay';
    this.overlay.className = 'fixed inset-0 z-50 flex items-center justify-center';
    this.overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    this.overlay.style.backdropFilter = 'blur(8px)';
    
    const placementColor = placement === 1 ? '#fbbf24' : placement <= 3 ? '#d1d5db' : '#cd7f32';
    const mmrColor = mmrChange > 0 ? '#10b981' : mmrChange < 0 ? '#ef4444' : '#6b7280';
    const mmrSign = mmrChange > 0 ? '+' : '';

    this.overlay.innerHTML = `
      <div class="flex gap-8 items-start animate-fade-in">
        <!-- Main Result Card -->
        <div class="card-elegant w-[450px] text-center">
          <!-- Title -->
          <div class="mb-6">
            <h1 class="text-5xl font-display font-bold ${isWinner ? 'text-yellow-400' : 'text-gray-300'} mb-2">
              ${isWinner ? '🏆 VICTORY!' : '💀 DEFEATED'}
            </h1>
            <p class="text-gray-500">Match Complete</p>
          </div>

          <!-- Placement Badge -->
          <div class="mb-8">
            <div class="inline-flex items-center justify-center w-24 h-24 rounded-full border-4" 
                 style="border-color: ${placementColor}; background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent);">
              <span class="text-4xl font-bold font-mono" style="color: ${placementColor}">
                #${placement}
              </span>
            </div>
          </div>

          <!-- Stats Grid -->
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="bg-gray-50 rounded-xl p-4">
              <div class="text-3xl font-bold font-mono text-gray-900">${kills}</div>
              <div class="text-sm text-gray-500 font-semibold">Kills</div>
            </div>
            <div class="bg-gray-50 rounded-xl p-4">
              <div class="text-3xl font-bold font-mono text-gray-900">${Math.round(damage)}</div>
              <div class="text-sm text-gray-500 font-semibold">Damage</div>
            </div>
            <div class="bg-gray-50 rounded-xl p-4">
              <div class="text-3xl font-bold font-mono text-gray-900">${survivalTime}s</div>
              <div class="text-sm text-gray-500 font-semibold">Survival</div>
            </div>
            <div class="bg-gray-50 rounded-xl p-4">
              <div class="text-3xl font-bold font-mono" style="color: ${mmrColor}">
                ${mmrSign}${mmrChange}
              </div>
              <div class="text-sm text-gray-500 font-semibold">MMR</div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="space-y-3">
            <button id="play-again-btn" class="btn-primary w-full">
              PLAY AGAIN
            </button>
            <button id="main-menu-btn" class="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all">
              Main Menu
            </button>
          </div>
        </div>

        <!-- Leaderboard Card -->
        <div class="card-elegant w-[300px]">
          <h2 class="text-xl font-bold text-gray-900 mb-4 text-center">Match Rankings</h2>
          <div class="space-y-2 max-h-[400px] overflow-y-auto">
            ${rankings.map((player) => `
              <div class="flex items-center gap-3 p-2 rounded-lg ${player.placement === placement ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'} transition-colors">
                <div class="text-lg font-bold min-w-[30px] ${
                  player.placement === 1 ? 'text-yellow-500' :
                  player.placement === 2 ? 'text-gray-400' :
                  player.placement === 3 ? 'text-amber-600' : 'text-gray-500'
                }">
                  ${player.placement <= 3 ? ['🥇', '🥈', '🥉'][player.placement - 1] : `#${player.placement}`}
                </div>
                <div class="flex-1 text-left">
                  <div class="font-semibold text-gray-900 text-sm truncate">${player.username}</div>
                  <div class="text-xs text-gray-500">${player.kills} kills • ${Math.round(player.damage_dealt)} dmg</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Add to DOM
    document.body.appendChild(this.overlay);

    // Add event listeners
    const playAgainBtn = this.overlay.querySelector('#play-again-btn');
    const mainMenuBtn = this.overlay.querySelector('#main-menu-btn');

    playAgainBtn?.addEventListener('click', () => {
      this.handlePlayAgain();
    });

    mainMenuBtn?.addEventListener('click', () => {
      this.handleMainMenu();
    });
  }

  private handlePlayAgain() {
    console.log('🎮 Play Again clicked');
    this.cleanup();
    this.scene.start('MatchmakingScene');
  }

  private async handleMainMenu() {
    console.log('🏠 Main Menu clicked');
    
    try {
      await leaveQueue();
    } catch (e) {
      // Ignore - might not be in queue
    }
    
    this.cleanup();
    
    if ((window as any).returnToMainMenu) {
      (window as any).returnToMainMenu();
    }
  }

  private cleanup() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  shutdown() {
    this.cleanup();
  }
}
