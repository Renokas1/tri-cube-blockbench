/**
 * Unit tests for cube_from_points math (no Blockbench required).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function loadTriCubeMath() {
  const TriCube = {};
  const files = ['src/math/vec3.js', 'src/math/cube_from_points.js'];
  const sandbox = { TriCube, console, Math, THREE: undefined };
  for (const rel of files) {
    const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    vm.runInNewContext(
      code +
        '\n' +
        (rel.includes('vec3') ? 'registerVec3(TriCube);' : 'registerCubeFromPoints(TriCube);'),
      sandbox
    );
  }
  return TriCube;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function approx(a, b, eps = 1e-4) {
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

  console.log('cube_from_points');

  test('axis-aligned unit cube from origin picks', () => {
    const p0 = [0, 0, 0];
    const p1 = [2, 0, 0];
    const p2 = [0, 2, 0];
    const r = TriCube.computeCubeFromThreePoints(p0, p1, p2, { roundOutput: false });
    assert(r.valid, 'expected valid cube');
    assert(approx(r.sideLength, 2), `sideLength ${r.sideLength}`);
    assert(r.corners.length === 8, 'eight corners');
    assert(approx(r.corners[7][0], 2) && approx(r.corners[7][1], 2) && approx(r.corners[7][2], 2), 'far corner');
  });

  test('rejects collinear picks', () => {
    const r = TriCube.computeCubeFromThreePoints([0, 0, 0], [1, 0, 0], [2, 0, 0], { roundOutput: false });
    assert(!r.valid, 'expected invalid');
  });

  test('rejects non-square angle', () => {
    const r = TriCube.computeCubeFromThreePoints([0, 0, 0], [2, 0, 0], [1, 1, 0], {
      roundOutput: false,
      rightAngleTolerance: 0.01,
    });
    assert(!r.valid, 'expected invalid for 45°');
  });

  test('forces cube from first edge even when third corner is closer on another axis', () => {
    const r = TriCube.computeCubeFromThreePoints([0, 0, 0], [4, 0, 0], [0, 2, 0], {
      roundOutput: false,
    });
    assert(r.valid, 'expected valid cube from direction picks');
    assert(approx(r.sideLength, 4), `sideLength ${r.sideLength}`);
  });

  test('45° rotated cube in XY plane still valid when edges equal', () => {
    const s = 2;
    const c = Math.SQRT1_2;
    const p0 = [0, 0, 0];
    const p1 = [s * c, s * c, 0];
    const p2 = [-s * c, s * c, 0];
    const r = TriCube.computeCubeFromThreePoints(p0, p1, p2, { roundOutput: false });
    assert(r.valid, 'expected valid rotated cube');
    assert(approx(r.sideLength, s), `sideLength ${r.sideLength}`);
  });

  console.log(`\n${passed} passed`);
}

try {
  run();
} catch (err) {
  console.error('\nFAILED:', err.message);
  process.exit(1);
}
