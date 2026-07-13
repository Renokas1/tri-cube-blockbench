/**
 * Bundles src/*.js into dist/tri_cube.js for Blockbench.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist', 'tri_cube.js');

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const version = pkg.version;

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const chunks = [
  read('src/math/vec3.js'),
  '  registerVec3(TriCube);',
  '',
  read('src/math/cube_from_points.js'),
  '  registerCubeFromPoints(TriCube);',
  '',
  read('src/snap/pick_snap.js'),
  '  registerPickSnap(TriCube);',
  '',
  read('src/preview/pick_gizmo.js'),
  '  registerPickGizmo(TriCube);',
  '',
  read('src/blockbench/space.js'),
  '  registerSpace(TriCube);',
  '',
  read('src/tool/tri_cube_tool.js'),
  '  registerTriCubeTool(TriCube);',
  '',
  read('src/entry.js'),
  '  registerTriCubePlugin(TriCube);',
  '  window.TriCube = TriCube;',
];

const output = `/**
 * Tri-Cube v${version} — BUILT FILE. Edit src/ and run: npm run build
 * Tool API (not Action). If you see setSelected errors, uninstall the plugin and load this file fresh.
 */
(() => {
  const PLUGIN_VERSION = '${version}';
  const TriCube = {};

${chunks.join('\n')}
})();
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, output, 'utf8');
console.log(`Built dist/tri_cube.js (v${version})`);
