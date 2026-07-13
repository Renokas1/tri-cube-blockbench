/**
 * Optional: copy built plugin to Blockbench plugins folder.
 * Prefer loading dist/tri_cube_tool.js directly from the repo.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const src = path.join(ROOT, 'dist', 'tri_cube_tool.js');
const about = path.join(ROOT, 'dist', 'about.md');
const destDir = path.join(os.homedir(), 'AppData', 'Roaming', 'Blockbench', 'plugins');
const dest = path.join(destDir, 'tri_cube_tool.js');
const destAbout = path.join(destDir, 'about.md');
const legacy = path.join(destDir, 'tri_cube.js');

if (!fs.existsSync(src)) {
  console.error('Missing dist/tri_cube_tool.js — run: npm run build');
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
if (fs.existsSync(about)) fs.copyFileSync(about, destAbout);
if (fs.existsSync(legacy)) fs.unlinkSync(legacy);
console.log(`Installed ${dest}`);
if (fs.existsSync(about)) console.log(`Installed ${destAbout}`);
console.log('Remove old tri_cube plugin in Blockbench if still listed, then reload plugins.');
