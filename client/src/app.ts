// Main application entry point
import { createAuthScreen } from './components/AuthScreen';
import { createGameWrapper } from './components/GameWrapper';
import { getWebSocketService } from './services/websocket';
import * as authService from './services/auth';

type AppState = 'auth' | 'game';

class App {
  private state: AppState = 'auth';
  private rootElement: HTMLElement;
  private currentView: HTMLElement | null = null;
  private playerName: string = '';
  private jwtToken: string = '';

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
    return createAuthScreen(async (name: string, type: 'quick' | 'login' | 'register', data?: any) => {
      try {
        let authResponse;
        
        if (type === 'quick') {
          // Quick play - guest registration
          authResponse = await authService.quickPlay(name);
        } else if (type === 'login') {
          // Sign in with existing account
          authResponse = await authService.login(data);
        } else {
          // Full registration
          authResponse = await authService.register(data);
        }
        
        this.playerName = authResponse.user.username;
        this.jwtToken = authResponse.token;
        
        // Store token
        authService.storeToken(authResponse.token);
        
        // Connect to WebSocket with token
        const ws = getWebSocketService();
        await ws.connect(authResponse.token);
        
        // Transition to game
        this.state = 'game';
        this.render();
      } catch (error) {
        console.error('Authentication failed:', error);
        alert(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  private renderGame(): HTMLElement {
    return createGameWrapper(this.playerName, () => {
      // Disconnect WebSocket
      const ws = getWebSocketService();
      ws.disconnect();
      
      // Clear auth
      authService.clearToken();
      
      // Return to auth screen
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
