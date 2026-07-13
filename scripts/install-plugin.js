/**
 * Copy dist/tri_cube.js into Blockbench's plugins folder.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const src = path.join(ROOT, 'dist', 'tri_cube.js');
const destDir = path.join(os.homedir(), 'AppData', 'Roaming', 'Blockbench', 'plugins');
const dest = path.join(destDir, 'tri_cube.js');

if (!fs.existsSync(src)) {
  console.error('Missing dist/tri_cube.js — run: npm run build');
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log(`Installed ${dest}`);
console.log('In Blockbench: Plugins → remove old Tri-Cube if present, then reload (Ctrl/Cmd+J)');
