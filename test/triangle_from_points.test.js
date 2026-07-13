/**
 * Unit tests for triangle_from_points math (no Blockbench required).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function loadTriCubeMath() {
  const TriCube = {};
  const files = [
    'src/math/vec3.js',
    'src/math/cube_from_points.js',
    'src/math/triangle_from_points.js',
  ];
  const sandbox = { TriCube, console, Math, THREE: undefined };
  for (const rel of files) {
    const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    let register = 'registerCubeFromPoints(TriCube);';
    if (rel.includes('vec3')) register = 'registerVec3(TriCube);';
    if (rel.includes('triangle')) register = 'registerTriangleFromPoints(TriCube);';
    vm.runInNewContext(code + '\n' + register, sandbox);
  }
  return TriCube;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function approx(a, b, eps = 1e-3) {
  return Math.abs(a - b) <= eps;
}

function run() {
  const TriCube = loadTriCubeMath();
  let passed = 0;

  function test(name, fn) {
    fn();
    passed += 1;
    console.log(`  ok — ${name}`);
  }

  console.log('triangle_from_points');

  test('right triangle bounding rect and zero depth', () => {
    const r = TriCube.computeTriangleFillFromThreePoints(
      [0, 0, 0],
      [4, 0, 0],
      [0, 3, 0],
      { roundOutput: false }
    );
    assert(r.valid, 'expected valid fill');
    assert(approx(r.sizes[0], 4) && approx(r.sizes[1], 3), `sizes ${r.sizes}`);
    assert(approx(r.sizes[2], 0), `depth ${r.sizes[2]}`);
    assert(r.triangle.length === 3, 'triangle corners');
  });

  test('general triangle uses bbox in plane', () => {
    const r = TriCube.computeTriangleFillFromThreePoints(
      [1, 0, 0],
      [5, 0, 0],
      [3, 2, 0],
      { roundOutput: false }
    );
    assert(r.valid, 'expected valid fill');
    assert(r.sizes[0] >= 3.5 && r.sizes[1] >= 1.5, `sizes ${r.sizes}`);
  });

  test('rejects collinear picks', () => {
    const r = TriCube.computeTriangleFillFromThreePoints(
      [0, 0, 0],
      [2, 0, 0],
      [4, 0, 0],
      { roundOutput: false }
    );
    assert(!r.valid, 'expected invalid');
  });

  console.log(`\n${passed} passed`);
}

try {
  run();
} catch (err) {
  console.error('\nFAILED:', err.message);
  process.exit(1);
}
