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

  test('face spans both picked edges with depth 1', () => {
    const p0 = [0, 0, 0];
    const p1 = [2, 0, 0];
    const p2 = [0, 2, 0];
    const r = TriCube.computeCubeFromThreePoints(p0, p1, p2, { roundOutput: false });
    assert(r.valid, 'expected valid box');
    assert(approx(r.sizes[0], 2) && approx(r.sizes[1], 2) && approx(r.sizes[2], 1), `sizes ${r.sizes}`);
    assert(approx(r.corners[3][0], 2) && approx(r.corners[3][1], 2) && approx(r.corners[3][2], 0), 'face corner');
    assert(approx(r.corners[7][0], 2) && approx(r.corners[7][1], 2) && approx(r.corners[7][2], 1), 'depth corner');
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

  test('uses independent u and v lengths from picks', () => {
    const r = TriCube.computeCubeFromThreePoints([0, 0, 0], [4, 0, 0], [0, 2, 0], {
      roundOutput: false,
    });
    assert(r.valid, 'expected valid box');
    assert(approx(r.sizes[0], 4) && approx(r.sizes[1], 2) && approx(r.sizes[2], 1), `sizes ${r.sizes}`);
    assert(approx(r.corners[1][0], 4) && approx(r.corners[2][1], 2), 'picks lie on face edges');
  });

  test('45° rotated face still valid with depth 1', () => {
    const s = 2;
    const c = Math.SQRT1_2;
    const p0 = [0, 0, 0];
    const p1 = [s * c, s * c, 0];
    const p2 = [-s * c, s * c, 0];
    const r = TriCube.computeCubeFromThreePoints(p0, p1, p2, { roundOutput: false });
    assert(r.valid, 'expected valid rotated box');
    assert(approx(r.sizes[0], s) && approx(r.sizes[1], s) && approx(r.sizes[2], 1), `sizes ${r.sizes}`);
  });

  test('extrude sign biases plane side without flipping u/v/w', () => {
    const p0 = [10, 0, 0];
    const p1 = [10, 2, 0];
    const p2 = [10, 0, 2];
    const center = [4, 4, 4];
    const outward = TriCube.computeCubeFromThreePoints(p0, p1, p2, {
      roundOutput: false,
      biasCenter: null,
    });
    const inward = TriCube.computeCubeFromThreePoints(p0, p1, p2, {
      roundOutput: false,
      biasCenter: center,
    });
    assert(outward.valid && inward.valid, 'expected valid boxes');
    assert(outward.extrudeSign === 1, 'default extrudes along +w');
    assert(inward.extrudeSign === -1, 'inward extrudes along -w');
    assert(approx(outward.corners[4][0], 11), 'outward depth is 1 unit along +X');
    assert(approx(inward.corners[4][0], 9), 'inward depth is 1 unit along -X');
  });

  console.log(`\n${passed} passed`);
}

try {
  run();
} catch (err) {
  console.error('\nFAILED:', err.message);
  process.exit(1);
}
