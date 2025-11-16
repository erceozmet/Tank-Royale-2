# Tank Royale 2 - Frontend Implementation Guide

Complete step-by-step guide for building the Tank Royale 2 client with modern UI components and game assets.

---

## 🎨 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  React UI Layer (Aceternity UI + Tailwind CSS)             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐             │
│  │   Login    │ │    Menu    │ │    HUD     │             │
│  │   Modal    │ │  Animated  │ │  Overlay   │             │
│  └────────────┘ └────────────┘ └────────────┘             │
│  - Authentication forms with animations                     │
│  - Main menu with glassmorphism effects                    │
│  - In-game HUD (health, ammo, minimap)                     │
│  - Match results, leaderboards, settings                   │
└─────────────────────────────────────────────────────────────┘
                          ↕ Props & Events
┌─────────────────────────────────────────────────────────────┐
│  Phaser 3 Canvas Layer (Game Rendering)                    │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐             │
│  │   Tanks    │ │  Bullets   │ │  Terrain   │             │
│  │  Sprites   │ │ Particles  │ │  Loot Box  │             │
│  └────────────┘ └────────────┘ └────────────┘             │
│  - Game state rendering                                     │
│  - Physics simulation display                               │
│  - Visual effects (explosions, trails)                     │
└─────────────────────────────────────────────────────────────┘
                          ↕ WebSocket
┌─────────────────────────────────────────────────────────────┐
│  Go Backend (API + Game Server)                            │
│  - Game state management                                    │
│  - Physics calculations                                     │
│  - Matchmaking & lobbies                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Implementation Phases

### **Phase 1: Setup UI Framework** ✅ COMPLETED

**Goal**: Bootstrap React + Tailwind CSS + Framer Motion alongside Phaser

#### Step 1.1: Install UI Dependencies

```bash
cd client
npm install tailwindcss postcss autoprefixer
npm install framer-motion clsx tailwind-merge
npm install @tabler/icons-react  # Icons for Aceternity components
npx tailwindcss init -p
```

#### Step 1.2: Configure Tailwind CSS

Create `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Tank Royale brand colors
        primary: {
          50: '#f0f9ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        danger: {
          500: '#ef4444',
          600: '#dc2626',
        },
        success: {
          500: '#10b981',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
```

Add to `src/main.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom game-specific styles */
@layer base {
  body {
    @apply bg-gray-900 text-white font-sans;
  }
}
```

#### Step 1.3: Create UI Component Library Folder

```bash
mkdir -p src/components/ui
mkdir -p src/components/aceternity
mkdir -p src/components/game-ui
```

**Verification**: ✅ Tailwind classes working in dev server

---

### **Phase 2: Build Authentication UI**

**Goal**: Beautiful login/register forms with Aceternity UI components

#### Step 2.1: Find & Download UI Assets

**🎨 Visual Design Resources:**

1. **Color Palette Inspiration**
   - 🔗 [Coolors.co](https://coolors.co/palettes/trending) - Generate game color schemes
   - 🔗 [Color Hunt](https://colorhunt.co/palettes/dark) - Dark theme palettes
   - **Recommended**: Military/Tech themes (dark blues, greens, orange accents)

2. **Background Patterns**
   - 🔗 [Hero Patterns](https://heropatterns.com/) - SVG background patterns
   - 🔗 [SVG Backgrounds](https://www.svgbackgrounds.com/) - Animated SVG backgrounds
   - **Use**: Grid patterns, topographic maps for military feel

3. **Icons**
   - 🔗 [Tabler Icons](https://tabler.io/icons) - Already installed, 4,000+ icons
   - 🔗 [Lucide Icons](https://lucide.dev/) - Modern icon library
   - **Need**: User, lock, eye, shield, crosshair, target icons

#### Step 2.2: Implement Aceternity Signup Form

Fetch from Aceternity UI:
```bash
# I'll fetch this component for you
```

**Component URL**: https://ui.aceternity.com/components/signup-form

**Customization Checklist**:
- [ ] Replace demo fields with: Username, Email, Password, Confirm Password
- [ ] Add "Remember Me" checkbox with animated toggle
- [ ] Add "Forgot Password?" link
- [ ] Change submit button text to "Join Battle"
- [ ] Add error states with red glow effect
- [ ] Add loading state with spinner

**Visual Polish**:
- Background: Dark grid pattern with blue glow
- Form: Glassmorphism effect (backdrop-blur-lg, bg-opacity-10)
- Inputs: Neon blue borders on focus
- Button: Gradient background (blue to purple) with glow on hover

#### Step 2.3: Create Login Modal

**Component**: Animated Modal from Aceternity
**URL**: https://ui.aceternity.com/components/animated-modal

**Features**:
- Smooth scale-in animation
- Click outside to close
- ESC key support
- Tab/Shift+Tab between Login/Register modes

**Verification**: ✅ Can toggle between login/register, validation works

---

### **Phase 3: Main Menu Scene**

**Goal**: Epic animated main menu with particle effects

#### Step 3.1: Find Menu Background Assets

**🎨 Background Options:**

1. **Particle Systems**
   - 🔗 [Particles.js](https://vincentgarreau.com/particles.js/) - Interactive particles
   - 🔗 [tsParticles](https://particles.js.org/) - Modern TypeScript version
   - **Effect**: Floating hexagons, military grid lines

2. **Animated Backgrounds**
   - Aceternity: `Aurora Background` - Subtle northern lights effect
   - Aceternity: `Background Beams` - Animated light beams
   - Aceternity: `Grid and Dot Backgrounds` - Animated grid
   - **Recommended**: Aurora Background for main menu

3. **3D Effects**
   - Aceternity: `Hero Parallax` - 3D scroll effect for featured tanks
   - **Use**: Showcase player's tank collection in parallax

#### Step 3.2: Implement Menu Buttons

**Component**: Tailwind CSS Buttons from Aceternity
**URL**: https://ui.aceternity.com/components/tailwindcss-buttons

**Button Variants Needed**:
1. **Primary CTA** - "Start Matchmaking" 
   - Shimmer effect button with gradient
   - Glow on hover
   
2. **Secondary** - "Custom Match", "Practice"
   - Moving border effect
   - Scale on hover

3. **Icon Buttons** - Settings, Profile, Leaderboard
   - Hover border gradient
   - Tooltip on hover

**Audio**: Add button click sound (whoosh + mechanical click)

#### Step 3.3: Create Player Stats Card

**Component**: Card Stack or Glare Card
**URL**: 
- https://ui.aceternity.com/components/card-stack
- https://ui.aceternity.com/components/glare-card

**Display**:
- Player avatar/tank preview
- Level & XP bar (animated progress)
- Stats: Kills, Wins, Win Rate
- Current rank with icon

**Visual**: Holographic card effect, blue glare on hover

**Verification**: ✅ Menu loads with animations, buttons trigger scenes

---

### **Phase 4: Game Assets & Sprites**

**Goal**: Find and integrate all game sprites and animations

#### Step 4.1: Tank Sprites

**🎮 Tank Asset Resources:**

1. **Free Sprite Packs**
   - 🔗 [OpenGameArt.org](https://opengameart.org/art-search?keys=tank) - Search "tank"
   - 🔗 [Itch.io Game Assets](https://itch.io/game-assets/free/tag-tanks) - Free tank sprites
   - 🔗 [Kenney.nl](https://kenney.nl/assets?q=tank) - Top-down tank sprites
   - **Recommended Pack**: Kenney's "Topdown Tanks Redux" (free, CC0)

2. **Tank Requirements**:
   - **Format**: PNG sprite sheets (transparent background)
   - **Resolution**: 64x64 or 128x128 per frame
   - **Animations Needed**:
     - Idle (1 frame)
     - Moving (4-8 frames for treads)
     - Turret rotation (36 frames for 360° or separate turret sprite)
     - Explosion death (8-12 frames)
   - **Color Variants**: 4-6 team colors (red, blue, green, yellow, purple, orange)

3. **Tank Features to Look For**:
   - Top-down perspective
   - Clean pixel art or vector style
   - Modular design (body + turret separate)
   - Multiple tank types (light, medium, heavy)

**Download & Organization**:
```
public/assets/sprites/tanks/
├── light-tank/
│   ├── body.png          # Tank body sprite
│   ├── turret.png        # Tank turret sprite
│   └── shadow.png        # Drop shadow
├── medium-tank/
├── heavy-tank/
└── explosion/
    └── explosion-sheet.png  # 8-frame explosion
```

#### Step 4.2: Weapon & Projectile Sprites

**🎯 Weapon Assets:**

1. **Bullet/Projectile Sprites**
   - 🔗 [OpenGameArt - Bullets](https://opengameart.org/art-search?keys=bullet)
   - 🔗 [Kenney - Particle Pack](https://kenney.nl/assets/particle-pack)
   
   **Need**:
   - Small bullets (16x16) - for rapid-fire weapons
   - Rockets (32x64) - with flame trail
   - Cannon balls (24x24) - for heavy tanks
   - Laser beams (8x64) - for energy weapons
   - Particle effects for trails

2. **Weapon Visual Effects**
   - Muzzle flash (sprite sheet, 3-5 frames)
   - Bullet casings ejection
   - Impact sparks
   - Ricochet effect

**Organization**:
```
public/assets/sprites/weapons/
├── bullets/
│   ├── small-bullet.png
│   ├── rocket.png
│   └── laser.png
├── effects/
│   ├── muzzle-flash.png
│   ├── impact-sparks.png
│   └── ricochet.png
└── icons/
    └── weapon-icons.png  # UI icons for weapon switching
```

#### Step 4.3: Environment & Terrain

**🗺️ Map Assets:**

1. **Terrain Tiles**
   - 🔗 [Kenney - Topdown Shooter](https://kenney.nl/assets/topdown-shooter)
   - 🔗 [OpenGameArt - Tiles](https://opengameart.org/art-search?keys=tile)
   
   **Need**:
   - Grass tiles (seamless)
   - Sand/dirt variations
   - Concrete/asphalt for urban maps
   - Rock formations for cover
   - Water tiles (animated)
   
2. **Obstacles & Destructibles**
   - Crates/barrels (destructible)
   - Rock piles
   - Trees (top-down)
   - Buildings/bunkers
   - Walls (concrete, sandbags)

3. **Loot Boxes**
   - Weapon crate (glowing)
   - Ammo box
   - Health pack
   - Shield pickup
   - **Animation**: Idle floating, spinning, open animation

**Organization**:
```
public/assets/sprites/environment/
├── terrain/
│   ├── grass-tileset.png
│   ├── sand-tileset.png
│   └── concrete-tileset.png
├── obstacles/
│   ├── crate.png
│   ├── barrel.png
│   ├── rock-pile.png
│   └── tree-top.png
└── loot/
    ├── weapon-crate.png
    ├── health-pack.png
    └── ammo-box.png
```

#### Step 4.4: UI Icons & HUD Elements

**🎮 HUD Asset Resources:**

1. **Icons**
   - 🔗 [Game-icons.net](https://game-icons.net/) - 4,000+ SVG game icons
   - 🔗 [Flaticon](https://www.flaticon.com/packs/military) - Military icon packs
   
   **Need**:
   - Health heart icon
   - Ammo/bullet icon
   - Shield icon
   - Minimap icons (player dot, enemy dot)
   - Weapon icons (pistol, rifle, shotgun, sniper)
   - Kill feed icons (skull, assist)

2. **HUD Frames**
   - Health bar frame (sci-fi style)
   - Ammo counter background
   - Minimap border
   - Kill feed panel
   - **Style**: Futuristic, holographic borders

**Organization**:
```
public/assets/ui/
├── icons/
│   ├── health.svg
│   ├── ammo.svg
│   ├── shield.svg
│   └── weapons/
│       ├── pistol.svg
│       ├── rifle.svg
│       └── sniper.svg
├── frames/
│   ├── health-bar-frame.png
│   ├── minimap-border.png
│   └── kill-feed-bg.png
└── cursors/
    ├── default.png
    └── crosshair.png
```

**Verification**: ✅ All assets loaded in BootScene, preview in MenuScene

---

### **Phase 5: In-Game HUD Overlay**

**Goal**: React HUD overlay on top of Phaser canvas

#### Step 5.1: Create HUD Components

**Components Needed**:

1. **Health Bar**
   - Component: Custom with Framer Motion
   - **Visual**: Animated width on damage, red pulse when low
   - **Position**: Top-left corner
   - **Info**: Current HP / Max HP, percentage bar

2. **Ammo Counter**
   - Component: Animated number counter
   - **Visual**: Number flips on reload, red when low
   - **Position**: Bottom-right corner
   - **Info**: Current ammo / Reserve ammo

3. **Minimap**
   - Component: Canvas element (Phaser rendering)
   - **Visual**: Circular or square, fog of war
   - **Position**: Top-right corner
   - **Info**: Player position, enemy dots, safe zone circle

4. **Kill Feed**
   - Component: Animated list from Aceternity
   - **Visual**: Slide in from right, fade out after 5s
   - **Position**: Right side, top
   - **Info**: "[Player] eliminated [Player] with [Weapon]"

5. **Match Timer & Player Count**
   - Component: Simple text with icon
   - **Position**: Top-center
   - **Info**: Time remaining, players alive

6. **Weapon Selector**
   - Component: Horizontal icon list
   - **Visual**: Glow on selected weapon, greyscale on unavailable
   - **Position**: Bottom-center
   - **Info**: 1-4 weapon slots with icons

#### Step 5.2: Implement Aceternity Components

**Useful Components**:

1. **Animated Tooltip** - For weapon descriptions
   - URL: https://ui.aceternity.com/components/animated-tooltip
   - Use: Hover over weapon icons to see stats

2. **Floating Dock** - For quick actions
   - URL: https://ui.aceternity.com/components/floating-dock
   - Use: Settings, map, inventory buttons

3. **Multi Step Loader** - Match loading screen
   - URL: https://ui.aceternity.com/components/multi-step-loader
   - Steps: "Finding players...", "Preparing map...", "Spawning tanks...", "Good luck!"

#### Step 5.3: Create React Wrapper

**File**: `src/components/GameWrapper.tsx`

```typescript
import React, { useRef, useEffect, useState } from 'react';
import Phaser from 'phaser';
import gameConfig from '@config/game-config';
import HUD from './game-ui/HUD';
import PauseMenu from './game-ui/PauseMenu';

interface GameState {
  health: number;
  maxHealth: number;
  ammo: number;
  reserveAmmo: number;
  weaponIndex: number;
  kills: number;
  playersAlive: number;
}

export default function GameWrapper() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    health: 100,
    maxHealth: 100,
    ammo: 30,
    reserveAmmo: 90,
    weaponIndex: 0,
    kills: 0,
    playersAlive: 100,
  });
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    // Initialize Phaser game
    if (!gameRef.current) {
      gameRef.current = new Phaser.Game({
        ...gameConfig,
        parent: 'phaser-game',
      });

      // Listen to game events
      gameRef.current.events.on('updateGameState', (state: Partial<GameState>) => {
        setGameState(prev => ({ ...prev, ...state }));
      });
    }

    return () => {
      gameRef.current?.destroy(true);
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Phaser Canvas */}
      <div id="phaser-game" className="absolute inset-0 z-0" />

      {/* React HUD Overlay */}
      <HUD 
        health={gameState.health}
        maxHealth={gameState.maxHealth}
        ammo={gameState.ammo}
        reserveAmmo={gameState.reserveAmmo}
        weaponIndex={gameState.weaponIndex}
        kills={gameState.kills}
        playersAlive={gameState.playersAlive}
      />

      {/* Pause Menu */}
      {isPaused && (
        <PauseMenu 
          onResume={() => setIsPaused(false)}
          onSettings={() => {}}
          onQuit={() => {}}
        />
      )}
    </div>
  );
}
```

**Verification**: ✅ HUD updates in real-time, doesn't block Phaser input

---

### **Phase 6: Game Scene Implementation**

**Goal**: Render all game entities in Phaser

#### Step 6.1: Load Sprites in BootScene

```typescript
// src/scenes/BootScene.ts
export class BootScene extends Phaser.Scene {
  preload() {
    // Tanks
    this.load.image('tank-body-light', '/assets/sprites/tanks/light-tank/body.png');
    this.load.image('tank-turret-light', '/assets/sprites/tanks/light-tank/turret.png');
    
    // Weapons
    this.load.image('bullet-small', '/assets/sprites/weapons/bullets/small-bullet.png');
    this.load.spritesheet('muzzle-flash', '/assets/sprites/weapons/effects/muzzle-flash.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    
    // Environment
    this.load.image('terrain-grass', '/assets/sprites/environment/terrain/grass-tileset.png');
    this.load.image('loot-weapon', '/assets/sprites/environment/loot/weapon-crate.png');
    
    // Effects
    this.load.spritesheet('explosion', '/assets/sprites/tanks/explosion/explosion-sheet.png', {
      frameWidth: 128,
      frameHeight: 128,
    });
    
    // Progress bar
    this.createLoadingBar();
  }

  create() {
    // Create animations
    this.anims.create({
      key: 'explode',
      frames: this.anims.generateFrameNumbers('explosion', { start: 0, end: 11 }),
      frameRate: 24,
      repeat: 0,
    });
    
    this.anims.create({
      key: 'muzzle-flash-anim',
      frames: this.anims.generateFrameNumbers('muzzle-flash', { start: 0, end: 4 }),
      frameRate: 30,
      repeat: 0,
    });

    this.scene.start('MenuScene');
  }
}
```

#### Step 6.2: Implement Tank Entity

```typescript
// src/entities/Tank.ts
export class Tank extends Phaser.GameObjects.Container {
  private body: Phaser.GameObjects.Sprite;
  private turret: Phaser.GameObjects.Sprite;
  private nameText: Phaser.GameObjects.Text;
  private healthBar: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, playerName: string) {
    super(scene, x, y);

    // Tank body
    this.body = scene.add.sprite(0, 0, 'tank-body-light');
    this.add(this.body);

    // Tank turret
    this.turret = scene.add.sprite(0, 0, 'tank-turret-light');
    this.add(this.turret);

    // Player name
    this.nameText = scene.add.text(0, -40, playerName, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5);
    this.add(this.nameText);

    // Health bar
    this.healthBar = scene.add.graphics();
    this.add(this.healthBar);
    this.updateHealthBar(100, 100);

    scene.add.existing(this);
  }

  updateHealthBar(current: number, max: number) {
    this.healthBar.clear();
    const barWidth = 60;
    const barHeight = 6;
    const percentage = current / max;

    // Background
    this.healthBar.fillStyle(0x000000, 0.5);
    this.healthBar.fillRect(-barWidth / 2, -50, barWidth, barHeight);

    // Health fill
    const color = percentage > 0.5 ? 0x10b981 : percentage > 0.25 ? 0xfbbf24 : 0xef4444;
    this.healthBar.fillStyle(color);
    this.healthBar.fillRect(-barWidth / 2, -50, barWidth * percentage, barHeight);

    // Border
    this.healthBar.lineStyle(1, 0xffffff, 0.8);
    this.healthBar.strokeRect(-barWidth / 2, -50, barWidth, barHeight);
  }

  aimTurret(targetX: number, targetY: number) {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    this.turret.rotation = angle;
  }

  playExplosion() {
    const explosion = this.scene.add.sprite(this.x, this.y, 'explosion');
    explosion.play('explode');
    explosion.once('animationcomplete', () => explosion.destroy());
  }
}
```

#### Step 6.3: Implement GameScene Rendering

```typescript
// src/scenes/GameScene.ts
export class GameScene extends Phaser.Scene {
  private tanks: Map<string, Tank> = new Map();
  private bullets: Phaser.Physics.Arcade.Group;
  private lootBoxes: Phaser.Physics.Arcade.Group;

  create() {
    // Create tilemap
    this.createMap();
    
    // Initialize groups
    this.bullets = this.physics.add.group({
      defaultKey: 'bullet-small',
      maxSize: 100,
    });
    
    this.lootBoxes = this.physics.add.group();

    // Setup collisions
    this.physics.add.collider(this.bullets, this.lootBoxes, this.onBulletHitLoot, null, this);

    // Listen to WebSocket updates
    this.setupNetworkListeners();
  }

  update(time: number, delta: number) {
    // Interpolate tank positions
    this.tanks.forEach(tank => {
      // Client-side prediction & interpolation logic
    });

    // Update bullets
    this.bullets.children.each((bullet: any) => {
      if (bullet.active && bullet.x < 0 || bullet.x > this.scale.width) {
        bullet.setActive(false);
        bullet.setVisible(false);
      }
    });
  }

  spawnTank(playerId: string, x: number, y: number, playerName: string) {
    const tank = new Tank(this, x, y, playerName);
    this.tanks.set(playerId, tank);
  }

  fireBullet(tankId: string, angle: number) {
    const tank = this.tanks.get(tankId);
    if (!tank) return;

    // Muzzle flash
    const flash = this.add.sprite(tank.x, tank.y, 'muzzle-flash');
    flash.play('muzzle-flash-anim');
    flash.once('animationcomplete', () => flash.destroy());

    // Spawn bullet
    const bullet = this.bullets.get(tank.x, tank.y);
    if (bullet) {
      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.setRotation(angle);
      this.physics.velocityFromRotation(angle, 600, bullet.body.velocity);
    }
  }

  spawnLootBox(x: number, y: number, type: string) {
    const loot = this.lootBoxes.create(x, y, `loot-${type}`);
    loot.setScale(0.8);
    
    // Floating animation
    this.tweens.add({
      targets: loot,
      y: loot.y - 10,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Spinning animation
    this.tweens.add({
      targets: loot,
      angle: 360,
      duration: 3000,
      repeat: -1,
      ease: 'Linear',
    });
  }
}
```

**Verification**: ✅ Tanks render with turrets, bullets fire, loot boxes spawn

---

### **Phase 7: Visual Polish & Effects**

**Goal**: Add particles, screen shake, and visual juice

#### Step 7.1: Particle Effects

**🎆 Particle Resources:**
- 🔗 [Kenney Particle Pack](https://kenney.nl/assets/particle-pack) - Stars, smoke, sparks
- Use: Bullet trails, explosion debris, engine exhaust

**Implementation**:
```typescript
// Bullet trail
const emitter = this.add.particles(0, 0, 'particle-smoke', {
  speed: { min: 10, max: 50 },
  scale: { start: 0.3, end: 0 },
  alpha: { start: 0.8, end: 0 },
  lifespan: 300,
  blendMode: 'ADD',
});
emitter.startFollow(bullet);

// Tank engine exhaust
const exhaustEmitter = this.add.particles(tank.x, tank.y, 'particle-smoke', {
  speed: 20,
  scale: { start: 0.2, end: 0 },
  alpha: { start: 0.5, end: 0 },
  lifespan: 500,
  frequency: 100,
  angle: { min: 160, max: 200 },
});
```

#### Step 7.2: Screen Shake & Camera Effects

```typescript
// On explosion
cameras.main.shake(200, 0.005);

// On player hit
cameras.main.flash(100, 255, 0, 0, false, 0.3);

// Death effect
cameras.main.fade(1000, 0, 0, 0);
```

#### Step 7.3: Sound Effects

**🔊 Audio Resources:**
- 🔗 [Freesound.org](https://freesound.org/) - Search: "tank shot", "explosion", "reload"
- 🔗 [OpenGameArt Audio](https://opengameart.org/art-search-advanced?keys=&field_art_type_tid%5B%5D=12) - Game sounds
- 🔗 [Zapsplat](https://www.zapsplat.com/) - Free sound effects

**Need**:
- Tank engine idle loop
- Cannon fire (different per weapon)
- Bullet impact (metal, dirt, water)
- Explosion (small, medium, large)
- Loot pickup sound
- UI sounds (button click, hover, error)

**Organization**:
```
public/assets/sounds/
├── weapons/
│   ├── pistol-shot.mp3
│   ├── rifle-shot.mp3
│   ├── shotgun-shot.mp3
│   └── reload.mp3
├── impacts/
│   ├── bullet-metal.mp3
│   ├── bullet-dirt.mp3
│   └── explosion.mp3
├── ui/
│   ├── button-click.mp3
│   ├── button-hover.mp3
│   └── error.mp3
└── ambient/
    ├── engine-idle.mp3
    └── menu-music.mp3
```

**Verification**: ✅ Particles spawn, screen shakes, sounds play

---

### **Phase 8: Leaderboard & Match Results**

**Goal**: Post-game stats display with animations

#### Step 8.1: Match Results Modal

**Component**: Animated Modal from Aceternity
**Visual Design**:
- Large "Victory!" or "Defeated" text with glow
- Your stats card (kills, damage, survival time)
- Top 3 players podium with 3D effect
- XP bar with animation filling up
- "Return to Menu" button

**Components to Use**:
1. **Hero Highlight** - For "Victory!" text
   - URL: https://ui.aceternity.com/components/hero-highlight

2. **Card Spotlight** - For stats cards
   - URL: https://ui.aceternity.com/components/card-spotlight

3. **Animated Number Counter** - For XP gain
   - Custom implementation with Framer Motion

#### Step 8.2: Leaderboard Scene

**Component**: Timeline from Aceternity
**URL**: https://ui.aceternity.com/components/timeline

**Display**:
- Top 100 players
- Columns: Rank, Player Name, Level, Kills, Wins, Win Rate
- Your position highlighted with glow
- Smooth scroll with virtual scrolling for performance

**Visual**: Dark card with glowing borders, rank icons (bronze, silver, gold, platinum)

**Verification**: ✅ Match results animate smoothly, leaderboard loads fast

---

### **Phase 9: Settings & Options**

**Goal**: Comprehensive settings panel

#### Step 9.1: Settings Modal

**Components Needed**:

1. **Sidebar** - For settings categories
   - URL: https://ui.aceternity.com/components/sidebar
   - Categories: Video, Audio, Controls, Gameplay, Account

2. **Custom Inputs**:
   - Volume sliders (master, music, SFX)
   - Graphics quality dropdown
   - Resolution selector
   - Keybind editor
   - Toggle switches (VSync, fullscreen, show FPS)

3. **Animated Tabs** - For settings sections
   - URL: https://ui.aceternity.com/components/tabs

**Visual**: Glassmorphism panel with categories on left, settings on right

**Verification**: ✅ Settings save to localStorage, apply immediately

---

### **Phase 10: Final Integration & Testing**

**Goal**: Everything working together seamlessly

#### Step 10.1: Performance Optimization

- [ ] Lazy load Aceternity components
- [ ] Use React.memo for HUD components
- [ ] Optimize Phaser texture atlas (combine sprites)
- [ ] Enable Phaser's multi-texture batching
- [ ] Profile FPS, aim for 60fps stable

#### Step 10.2: Responsive Design

- [ ] HUD scales on different screen sizes
- [ ] Minimum resolution: 1280x720
- [ ] Mobile: Show "Desktop Only" message

#### Step 10.3: Accessibility

- [ ] Keyboard navigation for all menus
- [ ] ESC key to close modals
- [ ] Tab order makes sense
- [ ] High contrast mode option

#### Step 10.4: Cross-Browser Testing

- [ ] Chrome (primary)
- [ ] Firefox
- [ ] Safari (Mac)
- [ ] Edge

**Final Verification**: ✅ 60fps gameplay, smooth animations, no memory leaks

---

## 🎨 Design System Summary

### Color Palette
```typescript
const colors = {
  primary: '#3b82f6',      // Blue - main actions
  danger: '#ef4444',       // Red - health, damage
  success: '#10b981',      // Green - healing, success
  warning: '#f59e0b',      // Orange - low ammo warning
  neutral: '#6b7280',      // Gray - disabled states
  background: '#0f172a',   // Dark blue-gray - main bg
  surface: '#1e293b',      // Lighter surface
};
```

### Typography
```typescript
const fonts = {
  heading: "'Orbitron', sans-serif",  // Futuristic for titles
  body: "'Inter', sans-serif",        // Clean for body text
  mono: "'JetBrains Mono', monospace", // Stats/numbers
};
```

### Spacing
```typescript
const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
};
```

---

## 📦 Asset Download Checklist

### Must-Have Assets
- [ ] Tank sprites (3 types: light, medium, heavy)
- [ ] Turret sprites (separate from body)
- [ ] Explosion sprite sheet (8-12 frames)
- [ ] Bullet sprites (3 types)
- [ ] Muzzle flash sprite sheet
- [ ] Terrain tileset (grass, sand, concrete)
- [ ] Loot box sprites (weapon, health, ammo)
- [ ] UI icons (health, ammo, shield)
- [ ] Weapon icons for HUD
- [ ] Particle textures (smoke, sparks)

### Nice-to-Have Assets
- [ ] Tank treads animation
- [ ] Water tiles (animated)
- [ ] Destructible obstacles
- [ ] Weather effects (rain, fog)
- [ ] Tank exhaust smoke
- [ ] Minimap icons
- [ ] Victory/defeat banners
- [ ] Rank badges (bronze → diamond)

---

## 🚀 Quick Commands Reference

```bash
# Development
npm run dev              # Start Vite + HMR
npm run type-check       # Check TypeScript

# Asset Management
npm run optimize-images  # TODO: Add script to compress PNGs
npm run generate-atlas   # TODO: Add TexturePacker script

# Testing
npm run test            # Unit tests
npm run test:e2e        # TODO: Add Playwright tests

# Production
npm run build           # Build for production
npm run preview         # Preview production build
```

---

## 📚 Additional Resources

### Learning Resources
- 📖 [Phaser 3 Docs](https://photonstorm.github.io/phaser3-docs/)
- 📖 [Aceternity UI Components](https://ui.aceternity.com/components)
- 📖 [Framer Motion Docs](https://www.framer.com/motion/)
- 📖 [Tailwind CSS Docs](https://tailwindcss.com/docs)

### Game Design
- 📖 [Game Feel by Steve Swink](https://www.gamefeelthing.com/)
- 📖 [The Art of Game Design](https://www.schellgames.com/art-of-game-design)

### Asset Creation
- 🎨 [Aseprite](https://www.aseprite.org/) - Pixel art editor
- 🎨 [Piskel](https://www.piskelapp.com/) - Free online pixel art
- 🎨 [GIMP](https://www.gimp.org/) - Free Photoshop alternative

---

## 🎯 Current Status

- ✅ Phase 1: UI Framework Setup
- ⏳ Phase 2: Authentication UI (NEXT)
- ⏳ Phase 3: Main Menu Scene
- ⏳ Phase 4: Game Assets & Sprites
- ⏳ Phase 5: In-Game HUD Overlay
- ⏳ Phase 6: Game Scene Implementation
- ⏳ Phase 7: Visual Polish & Effects
- ⏳ Phase 8: Leaderboard & Match Results
- ⏳ Phase 9: Settings & Options
- ⏳ Phase 10: Final Integration & Testing

---

**Last Updated**: November 16, 2025
**Version**: 1.0.0
**Next Milestone**: Complete Phase 2 (Authentication UI)
