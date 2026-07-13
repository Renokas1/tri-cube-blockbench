/**
 * Coplanar triangle fill — bounding rect in pick plane, zero depth (single face).
 */
const DEFAULT_FILL_DEPTH = 0;

function computeTriangleFillFromThreePoints(p0, p1, p2, options = {}) {
  const {
    minEdgeLength = 0.0625,
    fillDepth = DEFAULT_FILL_DEPTH,
    roundOutput = true,
    gridStep = 0.0625,
  } = options;

  const u = TriCube.sub(p1, p0);
  const uLen = TriCube.length(u);
  if (uLen < minEdgeLength) {
    return { valid: false, error: 'Second pick is too close to the first — pick two distinct corners.' };
  }

  const uHat = TriCube.normalize(u);
  const vRaw = TriCube.sub(p2, p0);
  const v = TriCube.sub(vRaw, TriCube.scale(uHat, TriCube.dot(vRaw, uHat)));
  const vLen = TriCube.length(v);
  if (vLen < minEdgeLength) {
    return {
      valid: false,
      error: 'Third pick is collinear — pick a third corner of the triangle.',
    };
  }

  const vHat = TriCube.normalize(v);
  const wHat = TriCube.normalize(TriCube.cross(uHat, vHat));
  if (!wHat) {
    return { valid: false, error: 'Could not derive a plane from the three picks.' };
  }

  const triPoints = [p0, p1, p2];
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (const p of triPoints) {
    const d = TriCube.sub(p, p0);
    const cu = TriCube.dot(d, uHat);
    const cv = TriCube.dot(d, vHat);
    minU = Math.min(minU, cu);
    maxU = Math.max(maxU, cu);
    minV = Math.min(minV, cv);
    maxV = Math.max(maxV, cv);
  }

  let sizeU = maxU - minU;
  let sizeV = maxV - minV;
  let anchor = TriCube.add(
    p0,
    TriCube.add(TriCube.scale(uHat, minU), TriCube.scale(vHat, minV))
  );

  if (roundOutput) {
    anchor = TriCube.roundVec3(anchor, gridStep);
    sizeU = TriCube.roundToGrid(sizeU, gridStep);
    sizeV = TriCube.roundToGrid(sizeV, gridStep);
  }

  if (sizeU < minEdgeLength || sizeV < minEdgeLength) {
    return { valid: false, error: 'Triangle fill is too small after grid rounding.' };
  }

  const extrudeSign = options.biasCenter
    ? TriCube.resolveExtrudeSign(anchor, wHat, options.biasCenter)
    : 1;

  const depth = fillDepth <= 0 ? 0 : roundOutput ? TriCube.roundToGrid(fillDepth, gridStep) : fillDepth;
  const sizes = [sizeU, sizeV, depth];
  const corners = TriCube.buildCubeCorners(
    anchor,
    uHat,
    vHat,
    wHat,
    sizeU,
    sizeV,
    depth,
    extrudeSign
  );

  return {
    valid: true,
    origin: anchor.slice(),
    from: [0, 0, 0],
    to: sizes.slice(),
    sizes,
    sideLength: Math.max(sizeU, sizeV, depth),
    extrudeSign,
    basis: { u: uHat, v: vHat, w: wHat },
    corners,
    worldAnchor: anchor,
    triangle: triPoints.map((p) => p.slice()),
    fillDepth: depth,
  };
}

function registerTriangleFromPoints(TriCube) {
  TriCube.DEFAULT_FILL_DEPTH = DEFAULT_FILL_DEPTH;
  TriCube.computeTriangleFillFromThreePoints = computeTriangleFillFromThreePoints;
}
