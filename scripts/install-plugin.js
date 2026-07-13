/**
 * Optional: copy built plugin to Blockbench plugins folder.
 * Prefer loading dist/tri_cube_tool.js directly from the repo.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const src = path.join(ROOT, 'dist', 'tri_cube_tool.js');
const destDir = path.join(os.homedir(), 'AppData', 'Roaming', 'Blockbench', 'plugins');
const dest = path.join(destDir, 'tri_cube_tool.js');
const legacy = path.join(destDir, 'tri_cube.js');

if (!fs.existsSync(src)) {
  console.error('Missing dist/tri_cube_tool.js — run: npm run build');
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
if (fs.existsSync(legacy)) fs.unlinkSync(legacy);
console.log(`Installed ${dest}`);
console.log('Remove old tri_cube plugin in Blockbench if still listed, then reload plugins.');
