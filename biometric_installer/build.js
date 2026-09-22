/**
 * =================================================================
 * Lifeline360 — Build Script (build.js)
 * =================================================================
 * Compiles sync_agent.js into a standalone Windows executable
 * (sync_installer.exe) using the 'pkg' tool.
 *
 * Usage:
 *   node build.js
 *
 * Output:
 *   dist/sync_installer.exe   ← standalone Windows binary
 * =================================================================
 */

'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('=== Lifeline360 Biometric Installer Build ===\n');

// 1. Check that pkg is available
try {
  execSync('npx pkg --version', { stdio: 'pipe' });
  console.log('[1/4] pkg is available.');
} catch {
  console.log('[1/4] pkg not found. Installing...');
  execSync('npm install --save-dev pkg', { stdio: 'inherit' });
}

// 2. Install dependencies
console.log('[2/4] Installing dependencies (mysql2, axios)...');
execSync('npm install --production', { stdio: 'inherit' });

// 3. Ensure dist directory exists
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// 4. Compile to .exe
console.log('[3/4] Compiling sync_agent.js → dist/sync_installer.exe...');
console.log('      Target: node18-win-x64  (Windows 64-bit)');
console.log('      This may take a minute for the first build...\n');

execSync(
  'npx pkg sync_agent.js --targets node18-win-x64 --output dist/sync_installer.exe',
  { stdio: 'inherit', cwd: __dirname }
);

// 5. Copy config.json into dist/ folder alongside the exe
const configSrc = path.join(__dirname, 'config.json');
const configDst = path.join(distDir, 'config.json');
fs.copyFileSync(configSrc, configDst);

console.log('\n[4/4] Build complete!');
console.log('');
console.log('┌──────────────────────────────────────────────────┐');
console.log('│  Output Files (deploy these to the clinic server):│');
console.log('│                                                    │');
console.log('│   dist/sync_installer.exe  ← Run this 24/7       │');
console.log('│   dist/config.json         ← Edit with MySQL creds│');
console.log('└──────────────────────────────────────────────────┘');
console.log('');
console.log('IMPORTANT: Edit dist/config.json with correct MySQL');
console.log('           credentials and your server URL BEFORE');
console.log('           deploying to the clinic local server.');
