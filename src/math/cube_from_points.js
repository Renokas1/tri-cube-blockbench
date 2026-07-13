/**
 * Build a box from three adjacent corner picks (anchor + two face neighbors).
 *
 * Face spans both picked edges (u from pick 2, v from pick 3). Depth (w) defaults to 1 unit.
 */
function computeCubeFromThreePoints(p0, p1, p2, options = {}) {
  const {
    rightAngleTolerance = 0.08,
    minEdgeLength = 0.0625,
    gridStep = 0.0625,
    extrudeDepth = 1,
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

  const extrudeSign = options.biasCenter ? resolveExtrudeSign(p0, wHat, options.biasCenter) : 1;

  let sizeU = uLen;
  let sizeV = vLen;
  let sizeW = extrudeDepth;
  let anchor = p0.slice();

  if (roundOutput) {
    anchor = TriCube.roundVec3(anchor, gridStep);
    sizeU = TriCube.roundToGrid(sizeU, gridStep);
    sizeV = TriCube.roundToGrid(sizeV, gridStep);
    sizeW = TriCube.roundToGrid(sizeW, gridStep);
  }

  if (sizeU < minEdgeLength || sizeV < minEdgeLength || sizeW < minEdgeLength) {
    return { valid: false, error: 'Box is too small after grid rounding.' };
  }

  const sizes = [sizeU, sizeV, sizeW];
  const corners = buildCubeCorners(p0, uHat, vHat, wHat, sizeU, sizeV, sizeW, extrudeSign);

  return {
    valid: true,
    origin: anchor,
    from: [0, 0, 0],
    to: sizes.slice(),
    sizes,
    sideLength: Math.max(sizeU, sizeV, sizeW),
    extrudeSign,
    basis: { u: uHat, v: vHat, w: wHat },
    corners,
    worldAnchor: p0,
  };
}

/** +1 = extrude along +w from the picked face; -1 = extrude toward -w (inward). */
function resolveExtrudeSign(anchor, wHat, biasCenter) {
  const toward = TriCube.sub(biasCenter, anchor);
  if (TriCube.length(toward) < 1e-6) return 1;
  return TriCube.dot(wHat, toward) >= 0 ? 1 : -1;
}

function buildCubeCorners(anchor, uHat, vHat, wHat, sizeU, sizeV, sizeW, extrudeSign = 1) {
  const u = TriCube.scale(uHat, sizeU);
  const v = TriCube.scale(vHat, sizeV);
  const w = TriCube.scale(wHat, sizeW);
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
      TriCube.add(
        TriCube.scale(u, iu),
        TriCube.add(TriCube.scale(v, iv), TriCube.scale(w, iw * extrudeSign))
      )
    )
  );
}

function pickFaceCornerIndex(extrudeSign) {
  return extrudeSign >= 0 ? 6 : 7;
}

function formatSizeLabel(sizes) {
  return sizes.map((n) => (Number.isInteger(n) ? String(n) : n.toFixed(3))).join('×');
}

function basisToRotationDegrees(uHat, vHat, wHat, eulerOrder = 'XYZ') {
  if (typeof THREE === 'undefined') {
    return [0, 0, 0];
  }

  const m = new THREE.Matrix4();
  m.makeBasis(
    new THREE.Vector3(uHat[0], uHat[1], uHat[2]),
    new THREE.Vector3(vHat[0], vHat[1], vHat[2]),
    new THREE.Vector3(wHat[0], wHat[1], wHat[2])
  );

  const quat = new THREE.Quaternion();
  quat.setFromRotationMatrix(m);
  const e = new THREE.Euler(0, 0, 0, eulerOrder);
  e.setFromQuaternion(quat, eulerOrder);
  return [
    Math.round(THREE.MathUtils.radToDeg(e.x) * 1000) / 1000,
    Math.round(THREE.MathUtils.radToDeg(e.y) * 1000) / 1000,
    Math.round(THREE.MathUtils.radToDeg(e.z) * 1000) / 1000,
  ];
}

function registerCubeFromPoints(TriCube) {
  TriCube.computeCubeFromThreePoints = computeCubeFromThreePoints;
  TriCube.resolveExtrudeSign = resolveExtrudeSign;
  TriCube.buildCubeCorners = buildCubeCorners;
  TriCube.pickFaceCornerIndex = pickFaceCornerIndex;
  TriCube.formatSizeLabel = formatSizeLabel;
  TriCube.basisToRotationDegrees = basisToRotationDegrees;
}
