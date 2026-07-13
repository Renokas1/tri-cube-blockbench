/**
 * Unit tests for cube_from_four_points math (no Blockbench required).
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
    'src/math/cube_from_four_points.js',
  ];
  const sandbox = { TriCube, console, Math, THREE: undefined };
  for (const rel of files) {
    const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const register =
      rel.includes('vec3')
        ? 'registerVec3(TriCube);'
        : rel.includes('four')
          ? 'registerCubeFromFourPoints(TriCube);'
          : 'registerCubeFromPoints(TriCube);';
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

  console.log('cube_from_four_points');

  test('fits axis-aligned rectangle from four corners', () => {
    const r = TriCube.computeCubeFromFourPoints(
      [0, 0, 0],
      [4, 0, 0],
      [4, 2, 0],
      [0, 2, 0],
      { roundOutput: false }
    );
    assert(r.valid, 'expected valid box');
    assert(approx(r.sizes[0], 4) && approx(r.sizes[1], 2) && approx(r.sizes[2], 1), `sizes ${r.sizes}`);
    assert(r.fitError < 0.01, `fit error ${r.fitError}`);
  });

  test('fits skewed quad picks on a plane', () => {
    const r = TriCube.computeCubeFromFourPoints(
      [0, 0, 0],
      [3.1, 0.1, 0],
      [3.2, 2.1, 0.05],
      [0.1, 1.9, -0.05],
      { roundOutput: false, planeTolerance: 0.2 }
    );
    assert(r.valid, 'expected valid box');
    assert(r.sizes[0] > 2.5 && r.sizes[1] > 1.5, `sizes ${r.sizes}`);
  });

  test('accepts in-plane picks that are not rectangle corners', () => {
    const r = TriCube.computeCubeFromFourPoints(
      [0, 0, 0],
      [4, 0, 0],
      [4, 2, 0],
      [1, 1.5, 0],
      { roundOutput: false }
    );
    assert(r.valid, 'expected valid box');
    assert(approx(r.sizes[0], 4) && approx(r.sizes[1], 2), `sizes ${r.sizes}`);
  });

  test('rejects collinear picks', () => {
    const r = TriCube.computeCubeFromFourPoints(
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
      [3, 0, 0],
      { roundOutput: false }
    );
    assert(!r.valid, 'expected invalid');
  });

  test('returns pick-to-corner mapping for placement', () => {
    const r = TriCube.computeCubeFromFourPoints(
      [0, 0, 0],
      [4, 0, 0],
      [4, 2, 0],
      [0, 2, 0],
      { roundOutput: false }
    );
    assert(r.valid, 'expected valid box');
    assert(r.pickGhostCorners?.length === 4, 'expected pick corner map');
    assert(r.worldAnchor, 'expected world anchor');
  });

  test('rejects point far off plane', () => {
    const r = TriCube.computeCubeFromFourPoints(
      [0, 0, 0],
      [2, 0, 0],
      [2, 2, 0],
      [0, 2, 2],
      { roundOutput: false, planeTolerance: 0.25 }
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
