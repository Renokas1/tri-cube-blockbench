/**
 * Build a cube from three adjacent corner picks (anchor + two face neighbors).
 *
 * Click order:
 *   1 — anchor corner
 *   2 — end of first edge
 *   3 — end of second edge on the same face
 */
function computeCubeFromThreePoints(p0, p1, p2, options = {}) {
  const {
    rightAngleTolerance = 0.08,
    minEdgeLength = 0.0625,
    gridStep = 0.0625,
    roundOutput = true,
  } = options;

  const u = TriCube.sub(p1, p0);
  const uLen = TriCube.length(u);
  if (uLen < minEdgeLength) {
    return { valid: false, error: 'First edge is too short — pick two distinct corners.' };
  }

  const uHat = TriCube.normalize(u);
  const vRaw = TriCube.sub(p2, p0);
  const vRawLen = TriCube.length(vRaw);
  if (vRawLen < minEdgeLength) {
    return {
      valid: false,
      error: 'Third point is too close to the anchor — pick a different corner.',
    };
  }

  const vRawHat = TriCube.normalize(vRaw);
  const cosCornerAngle = Math.abs(TriCube.dot(uHat, vRawHat));
  if (cosCornerAngle > rightAngleTolerance) {
    return {
      valid: false,
      error: `Pick a corner on the same face (not along the first edge). Angle is too shallow.`,
    };
  }

  const vProjLen = TriCube.dot(vRaw, uHat);
  const v = TriCube.sub(vRaw, TriCube.scale(uHat, vProjLen));
  const vLen = TriCube.length(v);

  if (vLen < minEdgeLength) {
    return {
      valid: false,
      error: 'Third point does not define a second edge — it is collinear with the first.',
    };
  }

  const vHat = TriCube.normalize(v);
  const wHat = TriCube.normalize(TriCube.cross(uHat, vHat));
  if (!wHat) {
    return { valid: false, error: 'Could not derive a third axis from the three picks.' };
  }

  // Cube side comes from the first edge; the third pick only sets direction.
  const sideLength = uLen;

  const corners = buildCubeCorners(p0, uHat, vHat, wHat, sideLength);
  let origin = p0.slice();
  let size = sideLength;
  let rotation = [0, 0, 0];

  if (roundOutput) {
    origin = TriCube.roundVec3(origin, gridStep);
    size = TriCube.roundToGrid(size, gridStep);
  }

  if (size < minEdgeLength) {
    return { valid: false, error: 'Cube side is too small after grid rounding.' };
  }

  return {
    valid: true,
    origin,
    from: [0, 0, 0],
    to: [size, size, size],
    rotation,
    sideLength: size,
    basis: { u: uHat, v: vHat, w: wHat },
    corners,
    worldAnchor: p0,
  };
}

function buildCubeCorners(anchor, uHat, vHat, wHat, s) {
  const u = TriCube.scale(uHat, s);
  const v = TriCube.scale(vHat, s);
  const w = TriCube.scale(wHat, s);
  const combos = [
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
    [1, 1, 0],
    [0, 0, 1],
    [1, 0, 1],
    [0, 1, 1],
    [1, 1, 1],
  ];
  return combos.map(([iu, iv, iw]) =>
    TriCube.add(
      anchor,
      TriCube.add(TriCube.scale(u, iu), TriCube.add(TriCube.scale(v, iv), TriCube.scale(w, iw)))
    )
  );
}

/**
 * Convert an orthonormal basis (columns u,v,w) to Blockbench rotation degrees.
 * Uses THREE when running inside Blockbench; falls back to zero rotation in tests.
 */
function basisToRotationDegrees(uHat, vHat, wHat) {
  if (typeof THREE === 'undefined') {
    return [0, 0, 0];
  }

  const m = new THREE.Matrix4();
  m.makeBasis(
    new THREE.Vector3(uHat[0], uHat[1], uHat[2]),
    new THREE.Vector3(vHat[0], vHat[1], vHat[2]),
    new THREE.Vector3(wHat[0], wHat[1], wHat[2])
  );

  const e = new THREE.Euler();
  e.setFromRotationMatrix(m, 'ZYX');
  return [
    Math.round(THREE.MathUtils.radToDeg(e.x) * 1000) / 1000,
    Math.round(THREE.MathUtils.radToDeg(e.y) * 1000) / 1000,
    Math.round(THREE.MathUtils.radToDeg(e.z) * 1000) / 1000,
  ];
}

function registerCubeFromPoints(TriCube) {
  TriCube.computeCubeFromThreePoints = computeCubeFromThreePoints;
  TriCube.buildCubeCorners = buildCubeCorners;
  TriCube.basisToRotationDegrees = basisToRotationDegrees;
}
