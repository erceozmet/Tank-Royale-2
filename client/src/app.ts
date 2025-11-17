// Main application entry point
import { createAuthScreen } from './components/AuthScreen';
import { createGameWrapper } from './components/GameWrapper';

type AppState = 'auth' | 'game';

class App {
  private state: AppState = 'auth';
  private rootElement: HTMLElement;
  private currentView: HTMLElement | null = null;
  private playerName: string = '';

  constructor() {
    const root = document.getElementById('root');
    if (!root) {
      throw new Error('Root element not found');
    }
    this.rootElement = root;
  }

  init() {
    this.render();
  }

  private render() {
    // Clear current view
    if (this.currentView) {
      this.currentView.remove();
    }

    // Render based on state
    if (this.state === 'auth') {
      this.currentView = this.renderAuthScreen();
    } else {
      this.currentView = this.renderGame();
    }

    this.rootElement.appendChild(this.currentView);
  }

  private renderAuthScreen(): HTMLElement {
    return createAuthScreen((name: string) => {
      this.playerName = name;
      this.state = 'game';
      this.render();
    });
  }

  private renderGame(): HTMLElement {
    return createGameWrapper(this.playerName, () => {
      this.state = 'auth';
      this.render();
    });
  }
}

export function createApp() {
  const app = new App();
  app.init();
  console.log('🚀 blast.io - Client Started');
}
