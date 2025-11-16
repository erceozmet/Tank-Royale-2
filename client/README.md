# Tank Royale 2 - Client

Phaser 3 game client for Tank Royale 2 battle royale game.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open browser
http://localhost:5173
```

## 📦 Tech Stack

- **Phaser 3.80+**: Game framework
- **TypeScript 5.x**: Type-safe development
- **Vite 5.x**: Fast dev server with HMR
- **axios**: REST API communication

## 🎮 Development

```bash
# Development server (hot reload)
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format

# Production build
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
client/
├── public/              # Static assets
│   ├── index.html       # Entry HTML
│   └── assets/          # Game assets
│       ├── sprites/     # Player, weapon sprites
│       ├── sounds/      # Audio files
│       └── music/       # Background music
├── src/
│   ├── main.ts          # Entry point
│   ├── config/          # Game configuration
│   │   ├── game-config.ts
│   │   └── constants.ts
│   ├── scenes/          # Phaser scenes
│   │   ├── BootScene.ts
│   │   ├── MenuScene.ts
│   │   ├── LobbyScene.ts
│   │   ├── GameScene.ts
│   │   └── GameOverScene.ts
│   ├── entities/        # Game entities (coming soon)
│   ├── network/         # API & WebSocket (coming soon)
│   ├── ui/              # UI components (coming soon)
│   ├── systems/         # Game systems (coming soon)
│   ├── utils/           # Utilities (coming soon)
│   └── types/           # TypeScript types (coming soon)
└── package.json
```

## 🌐 Environment

Development uses Vite proxy to connect to local Go servers:
- REST API: `http://localhost:8080/api/*`
- WebSocket: `ws://localhost:8081/ws`

## 🎯 Current Status

**Phase 1: Foundation Setup** ✅
- ✅ Package.json with dependencies
- ✅ TypeScript configuration
- ✅ Vite configuration with path aliases
- ✅ HTML entry point
- ✅ Phaser game configuration
- ✅ All 5 scenes created (Boot, Menu, Lobby, Game, GameOver)

**Next Steps:**
- Phase 2: Network layer (APIClient, WebSocket)
- Phase 3: Game rendering (players, projectiles, loot)
- Phase 4: Client prediction & interpolation
- Phase 5: UI/HUD system
- Phase 6: Visual polish (particles, sounds)

## 🔧 Configuration

### Path Aliases

TypeScript path aliases are configured in `tsconfig.json`:

```typescript
import Scene from '@scenes/GameScene';
import { APIClient } from '@network/APIClient';
import { COLORS } from '@config/constants';
```

Available aliases:
- `@/` → `src/`
- `@scenes/` → `src/scenes/`
- `@entities/` → `src/entities/`
- `@network/` → `src/network/`
- `@ui/` → `src/ui/`
- `@utils/` → `src/utils/`
- `@types/` → `src/types/`
- `@systems/` → `src/systems/`
- `@config/` → `src/config/`

### Vite Proxy

Vite automatically proxies API requests to Go servers:

```typescript
// This request goes to http://localhost:8080/api/auth/login
axios.post('/api/auth/login', { ... })

// This WebSocket goes to ws://localhost:8081/ws
new WebSocket('/ws?token=...')
```

## 📖 Documentation

See `PHASER_IMPLEMENTATION_PLAN.md` in the root directory for detailed implementation plan.

## 🎮 Controls (Coming Soon)

- **WASD**: Movement
- **Mouse**: Aim
- **Left Click**: Shoot
- **1-4**: Weapon switch
- **ESC**: Pause menu

## 🚀 Deployment

```bash
# Build for production
npm run build

# Deploy to Vercel
vercel

# Or deploy to any static hosting
# Upload dist/ folder
```

## 📝 License

MIT
