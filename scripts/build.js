/**
 * Bundles src/*.js into dist/tri_cube_tool.js for Blockbench.
 * Plugin id must match filename: tri_cube_tool.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PLUGIN_ID = 'tri_cube_tool';
const OUT = path.join(ROOT, 'dist', `${PLUGIN_ID}.js`);
const LEGACY_OUT = path.join(ROOT, 'dist', 'tri_cube.js');

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
  read('src/blockbench/copy_uv.js'),
  '  registerCopyUv(TriCube);',
  '',
  read('src/blockbench/scene_space.js'),
  '  registerSceneSpace(TriCube);',
  '',
  read('src/tool/tri_cube_tool.js'),
  '  registerTriCubeTool(TriCube);',
  '',
  read('src/entry.js'),
  '  registerTriCubePlugin(TriCube);',
  '  window.TriCube = TriCube;',
];

const output = `/**
 * Tri-Cube v${version} — BUILT FILE (${PLUGIN_ID}.js)
 * If you see "setSelected" errors you are running an OLD cached plugin — remove tri_cube, load THIS file.
 */
(() => {
  const PLUGIN_VERSION = '${version}';
  const TriCube = {};

${chunks.join('\n')}
})();
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, output, 'utf8');
if (fs.existsSync(LEGACY_OUT)) {
  fs.unlinkSync(LEGACY_OUT);
  console.log('Removed stale dist/tri_cube.js (use tri_cube_tool.js instead)');
}
console.log(`Built dist/${PLUGIN_ID}.js (v${version})`);
