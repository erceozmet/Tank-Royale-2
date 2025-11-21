#!/usr/bin/env node

/**
 * Generate temporary game sprites as SVG/PNG
 * These are placeholder sprites until we get proper game assets
 * 
 * Usage: node scripts/generate-sprites.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPRITE_DIR = path.join(__dirname, '..', 'public', 'assets', 'sprites');

// Ensure directories exist
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Generate Tank Body SVG (64x64)
function generateTankBody(color, filename) {
  const svg = `<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tankGrad${color}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#000;stop-opacity:0.3" />
    </linearGradient>
  </defs>
  <!-- Tank body (rounded rectangle) -->
  <rect x="12" y="16" width="40" height="32" rx="4" fill="url(#tankGrad${color})" stroke="#000" stroke-width="2"/>
  <!-- Left tread -->
  <rect x="8" y="14" width="6" height="36" rx="2" fill="#333" stroke="#000" stroke-width="1"/>
  <!-- Right tread -->
  <rect x="50" y="14" width="6" height="36" rx="2" fill="#333" stroke="#000" stroke-width="1"/>
  <!-- Tread details (left) -->
  <line x1="10" y1="18" x2="10" y2="46" stroke="#555" stroke-width="1"/>
  <!-- Tread details (right) -->
  <line x1="52" y1="18" x2="52" y2="46" stroke="#555" stroke-width="1"/>
  <!-- Hatch/center detail -->
  <circle cx="32" cy="32" r="6" fill="#222" stroke="#000" stroke-width="1"/>
</svg>`;
  
  const filePath = path.join(SPRITE_DIR, 'tanks', filename);
  fs.writeFileSync(filePath, svg);
  console.log(`✅ Created: ${filename}`);
}

// Generate Tank Turret SVG (64x64, pointing right)
function generateTankTurret(color, filename) {
  const svg = `<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="turretGrad${color}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#444;stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color};stop-opacity:0.8" />
    </linearGradient>
  </defs>
  <!-- Turret base (circle) -->
  <circle cx="32" cy="32" r="8" fill="url(#turretGrad${color})" stroke="#000" stroke-width="2"/>
  <!-- Gun barrel (rectangle pointing right) -->
  <rect x="32" y="28" width="24" height="8" rx="1" fill="#444" stroke="#000" stroke-width="2"/>
  <!-- Barrel tip -->
  <rect x="54" y="28" width="4" height="8" rx="1" fill="#222" stroke="#000" stroke-width="1"/>
</svg>`;
  
  const filePath = path.join(SPRITE_DIR, 'tanks', filename);
  fs.writeFileSync(filePath, svg);
  console.log(`✅ Created: ${filename}`);
}

// Generate Bullet SVG (16x16)
function generateBullet(filename) {
  const svg = `<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bulletGrad">
      <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
      <stop offset="70%" style="stop-color:#FFA500;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FF4500;stop-opacity:0.8" />
    </radialGradient>
  </defs>
  <!-- Bullet core -->
  <circle cx="8" cy="8" r="6" fill="url(#bulletGrad)" stroke="#000" stroke-width="1"/>
  <!-- Bullet highlight -->
  <circle cx="6" cy="6" r="2" fill="#FFF" opacity="0.6"/>
</svg>`;
  
  const filePath = path.join(SPRITE_DIR, 'weapons', filename);
  fs.writeFileSync(filePath, svg);
  console.log(`✅ Created: ${filename}`);
}

// Generate Loot Item SVG (24x24)
function generateLootItem(color, label, filename) {
  const svg = `<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="lootGrad${label}">
      <stop offset="0%" style="stop-color:#FFF;stop-opacity:1" />
      <stop offset="50%" style="stop-color:${color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color};stop-opacity:0.5" />
    </radialGradient>
    <filter id="glow${label}">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <!-- Diamond shape -->
  <path d="M 12 2 L 22 12 L 12 22 L 2 12 Z" fill="url(#lootGrad${label})" stroke="${color}" stroke-width="2" filter="url(#glow${label})"/>
  <!-- Center dot -->
  <circle cx="12" cy="12" r="3" fill="#FFF" opacity="0.8"/>
</svg>`;
  
  const filePath = path.join(SPRITE_DIR, 'loot', filename);
  fs.writeFileSync(filePath, svg);
  console.log(`✅ Created: ${filename}`);
}

// Generate Crate SVG (32x32)
function generateCrate(filename) {
  const svg = `<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="woodGrain" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="4" fill="#8B4513"/>
      <line x1="0" y1="2" x2="4" y2="2" stroke="#654321" stroke-width="0.5"/>
    </pattern>
  </defs>
  <!-- Crate box -->
  <rect x="2" y="2" width="28" height="28" fill="url(#woodGrain)" stroke="#000" stroke-width="2"/>
  <!-- Horizontal band -->
  <rect x="2" y="14" width="28" height="4" fill="#654321" stroke="#000" stroke-width="1"/>
  <!-- Vertical band -->
  <rect x="14" y="2" width="4" height="28" fill="#654321" stroke="#000" stroke-width="1"/>
  <!-- Corner screws -->
  <circle cx="6" cy="6" r="1.5" fill="#333"/>
  <circle cx="26" cy="6" r="1.5" fill="#333"/>
  <circle cx="6" cy="26" r="1.5" fill="#333"/>
  <circle cx="26" cy="26" r="1.5" fill="#333"/>
</svg>`;
  
  const filePath = path.join(SPRITE_DIR, 'loot', filename);
  fs.writeFileSync(filePath, svg);
  console.log(`✅ Created: ${filename}`);
}

// Generate Explosion Frame (for animation) - 128x128
function generateExplosionFrame(frame, totalFrames, filename) {
  const progress = frame / totalFrames;
  const size = 20 + (progress * 90); // Grows from 20 to 110
  const opacity = 1 - (progress * 0.8); // Fades out
  const outerSize = size * 1.3;
  
  const svg = `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="explosionGrad${frame}">
      <stop offset="0%" style="stop-color:#FFF;stop-opacity:${opacity}" />
      <stop offset="30%" style="stop-color:#FFA500;stop-opacity:${opacity * 0.9}" />
      <stop offset="60%" style="stop-color:#FF4500;stop-opacity:${opacity * 0.6}" />
      <stop offset="100%" style="stop-color:#8B0000;stop-opacity:0" />
    </radialGradient>
  </defs>
  <!-- Outer explosion ring -->
  <circle cx="64" cy="64" r="${outerSize}" fill="none" stroke="#FF4500" stroke-width="${3 * opacity}" opacity="${opacity * 0.5}"/>
  <!-- Main explosion -->
  <circle cx="64" cy="64" r="${size}" fill="url(#explosionGrad${frame})"/>
  <!-- Inner bright core -->
  <circle cx="64" cy="64" r="${size * 0.3}" fill="#FFF" opacity="${opacity}"/>
</svg>`;
  
  const filePath = path.join(SPRITE_DIR, 'effects', filename);
  fs.writeFileSync(filePath, svg);
  console.log(`✅ Created: ${filename} (frame ${frame}/${totalFrames})`);
}

// Generate Particle (smoke, spark) - 16x16
function generateParticle(type, filename) {
  let svg = '';
  
  if (type === 'smoke') {
    svg = `<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="smokeGrad">
      <stop offset="0%" style="stop-color:#AAA;stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:#666;stop-opacity:0" />
    </radialGradient>
  </defs>
  <circle cx="8" cy="8" r="7" fill="url(#smokeGrad)"/>
</svg>`;
  } else if (type === 'spark') {
    svg = `<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="sparkGrad">
      <stop offset="0%" style="stop-color:#FFF;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#FFD700;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FFA500;stop-opacity:0" />
    </radialGradient>
  </defs>
  <circle cx="8" cy="8" r="6" fill="url(#sparkGrad)"/>
  <circle cx="8" cy="8" r="2" fill="#FFF"/>
</svg>`;
  }
  
  const filePath = path.join(SPRITE_DIR, 'effects', filename);
  fs.writeFileSync(filePath, svg);
  console.log(`✅ Created: ${filename}`);
}

// Main generation
console.log('🎨 Generating game sprites...\n');

ensureDir(path.join(SPRITE_DIR, 'tanks'));
ensureDir(path.join(SPRITE_DIR, 'weapons'));
ensureDir(path.join(SPRITE_DIR, 'loot'));
ensureDir(path.join(SPRITE_DIR, 'effects'));

console.log('🚛 Generating tanks...');
generateTankBody('#10B981', 'tank-body-green.svg'); // Player (green)
generateTankBody('#EF4444', 'tank-body-red.svg');   // Enemy (red)
generateTankBody('#3B82F6', 'tank-body-blue.svg');  // Team color
generateTankBody('#F59E0B', 'tank-body-orange.svg'); // Team color

generateTankTurret('#10B981', 'tank-turret-green.svg');
generateTankTurret('#EF4444', 'tank-turret-red.svg');
generateTankTurret('#3B82F6', 'tank-turret-blue.svg');
generateTankTurret('#F59E0B', 'tank-turret-orange.svg');

console.log('\n🔫 Generating weapons...');
generateBullet('bullet.svg');

console.log('\n💎 Generating loot items...');
generateLootItem('#EF4444', 'health', 'loot-health.svg');      // Red
generateLootItem('#3B82F6', 'armor', 'loot-armor.svg');        // Blue
generateLootItem('#F59E0B', 'damage', 'loot-damage.svg');      // Orange
generateLootItem('#06B6D4', 'speed', 'loot-speed.svg');        // Cyan
generateLootItem('#EC4899', 'firerate', 'loot-firerate.svg');  // Magenta

console.log('\n📦 Generating crates...');
generateCrate('crate.svg');

console.log('\n💥 Generating explosion animation (12 frames)...');
for (let i = 0; i < 12; i++) {
  generateExplosionFrame(i, 12, `explosion-${String(i).padStart(2, '0')}.svg`);
}

console.log('\n✨ Generating particle effects...');
generateParticle('smoke', 'particle-smoke.svg');
generateParticle('spark', 'particle-spark.svg');

console.log('\n✅ Sprite generation complete!');
console.log('\n📝 Next steps:');
console.log('   1. Update BootScene to load these sprites');
console.log('   2. Replace Graphics objects with Sprites in GameScene');
console.log('   3. Test in-game rendering');
console.log('   4. (Optional) Replace SVGs with proper PNG assets from Kenney.nl');
