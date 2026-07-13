/**
 * Build a box from four picks near a plane — best-fit rectangular face, depth 1 unit.
 */
const PERMS4 = [
  [0, 1, 2, 3],
  [0, 1, 3, 2],
  [0, 2, 1, 3],
  [0, 2, 3, 1],
  [0, 3, 1, 2],
  [0, 3, 2, 1],
  [1, 0, 2, 3],
  [1, 0, 3, 2],
  [1, 2, 0, 3],
  [1, 2, 3, 0],
  [1, 3, 0, 2],
  [1, 3, 2, 0],
  [2, 0, 1, 3],
  [2, 0, 3, 1],
  [2, 1, 0, 3],
  [2, 1, 3, 0],
  [2, 3, 0, 1],
  [2, 3, 1, 0],
  [3, 0, 1, 2],
  [3, 0, 2, 1],
  [3, 1, 0, 2],
  [3, 1, 2, 0],
  [3, 2, 0, 1],
  [3, 2, 1, 0],
];

function centroid(points) {
  const sum = points.reduce((acc, p) => TriCube.add(acc, p), [0, 0, 0]);
  return TriCube.scale(sum, 1 / points.length);
}

function fitPlaneFromPoints(points) {
  if (!points || points.length < 3) return null;

  const origin = centroid(points);
  let normal = null;

  if (points.length === 3) {
    normal = TriCube.normalize(
      TriCube.cross(TriCube.sub(points[1], points[0]), TriCube.sub(points[2], points[0]))
    );
  } else {
    const n = [0, 0, 0];
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const pi = points[i];
      const pj = points[j];
      n[0] += (pi[1] - pj[1]) * (pi[2] + pj[2]);
      n[1] += (pi[2] - pj[2]) * (pi[0] + pj[0]);
      n[2] += (pi[0] - pj[0]) * (pi[1] + pj[1]);
    }
    normal = TriCube.normalize(n);
  }

  if (!normal) return null;

  let maxDev = 0;
  for (const p of points) {
    const dev = Math.abs(TriCube.dot(TriCube.sub(p, origin), normal));
    maxDev = Math.max(maxDev, dev);
  }

  return { origin, normal, maxDev };
}

function pcaAxis2D(uvPoints) {
  let cu = 0;
  let cv = 0;
  for (const [u, v] of uvPoints) {
    cu += u;
    cv += v;
  }
  cu /= uvPoints.length;
  cv /= uvPoints.length;

  let a = 0;
  let b = 0;
  let c = 0;
  for (const [u, v] of uvPoints) {
    const du = u - cu;
    const dv = v - cv;
    a += du * du;
    b += du * dv;
    c += dv * dv;
  }
  const n = uvPoints.length;
  a /= n;
  b /= n;
  c /= n;

  const trace = a + c;
  const disc = Math.sqrt(Math.max(0, trace * trace / 4 - (a * c - b * b)));
  const lambda1 = trace / 2 + disc;
  let du = b;
  let dv = lambda1 - a;
  if (Math.abs(du) + Math.abs(dv) < 1e-8) {
    du = 1;
    dv = 0;
  }
  const len = Math.hypot(du, dv);
  return [du / len, dv / len];
}

function scoreRectangle(points3D, corners3D, perm) {
  let sum = 0;
  for (let i = 0; i < 4; i++) sum += TriCube.distance(points3D[i], corners3D[perm[i]]);
  return sum;
}

function buildRectFromUV(uCoords, vCoords, origin, uHat, vHat) {
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (let i = 0; i < uCoords.length; i++) {
    minU = Math.min(minU, uCoords[i]);
    maxU = Math.max(maxU, uCoords[i]);
    minV = Math.min(minV, vCoords[i]);
    maxV = Math.max(maxV, vCoords[i]);
  }

  const anchor = TriCube.add(
    origin,
    TriCube.add(TriCube.scale(uHat, minU), TriCube.scale(vHat, minV))
  );
  const sizeU = maxU - minU;
  const sizeV = maxV - minV;
  const cornerUV = [
    [minU, minV],
    [maxU, minV],
    [maxU, maxV],
    [minU, maxV],
  ];
  const corners3D = cornerUV.map(([u, v]) =>
    TriCube.add(origin, TriCube.add(TriCube.scale(uHat, u), TriCube.scale(vHat, v)))
  );

  return { anchor, sizeU, sizeV, corners3D };
}

/** corners3D index from buildRectFromUV → buildCubeCorners face corner index. */
const CORNER3D_TO_GHOST = [0, 1, 3, 2];

function permToPickGhostCorners(perm) {
  return perm.map((c3dIdx) => CORNER3D_TO_GHOST[c3dIdx]);
}

function addUniqueAxis(candidates, axis) {
  if (!axis) return;
  const exists = candidates.some((c) => TriCube.dot(c, axis) > 0.999 || TriCube.dot(c, axis) < -0.999);
  if (!exists) candidates.push(axis);
}

function findBestRectangle(projectedPoints, origin, normal) {
  const n = projectedPoints.length;
  if (n < 3) return null;

  const uCandidates = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const raw = TriCube.sub(projectedPoints[j], projectedPoints[i]);
      const rawHat = TriCube.normalize(raw);
      if (!rawHat) continue;
      const inPlane = TriCube.sub(rawHat, TriCube.scale(normal, TriCube.dot(rawHat, normal)));
      const uHat = TriCube.normalize(inPlane);
      addUniqueAxis(uCandidates, uHat);
      addUniqueAxis(uCandidates, uHat ? TriCube.scale(uHat, -1) : null);
    }
  }

  if (uCandidates.length) {
    const u0 = uCandidates[0];
    const v0 = TriCube.normalize(TriCube.cross(normal, u0));
    if (v0) {
      const ucs = projectedPoints.map((p) => {
        const d = TriCube.sub(p, origin);
        return [TriCube.dot(d, u0), TriCube.dot(d, v0)];
      });
      const pcaDir = pcaAxis2D(ucs);
      const pcaU = TriCube.normalize(
        TriCube.add(TriCube.scale(u0, pcaDir[0]), TriCube.scale(v0, pcaDir[1]))
      );
      addUniqueAxis(uCandidates, pcaU);
    }
  }

  let best = null;
  for (const uHat of uCandidates) {
    if (!uHat) continue;
    const vHat = TriCube.normalize(TriCube.cross(normal, uHat));
    if (!vHat) continue;

    const uCoords = [];
    const vCoords = [];
    for (const p of projectedPoints) {
      const d = TriCube.sub(p, origin);
      uCoords.push(TriCube.dot(d, uHat));
      vCoords.push(TriCube.dot(d, vHat));
    }

    const rect = buildRectFromUV(uCoords, vCoords, origin, uHat, vHat);
    let bestPermScore = Infinity;
    let bestPerm = PERMS4[0];
    for (const perm of PERMS4) {
      const s = scoreRectangle(projectedPoints, rect.corners3D, perm);
      if (s < bestPermScore) {
        bestPermScore = s;
        bestPerm = perm;
      }
    }

    if (!best || bestPermScore < best.score) {
      best = {
        ...rect,
        uHat,
        vHat,
        score: bestPermScore,
        pickPerm: bestPerm,
        pickGhostCorners: permToPickGhostCorners(bestPerm),
      };
    }
  }

  return best;
}

function computeCubeFromFourPoints(p0, p1, p2, p3, options = {}) {
  const {
    minEdgeLength = 0.0625,
    gridStep = 0.0625,
    extrudeDepth = 1,
    planeTolerance = 0.5,
    roundOutput = true,
  } = options;

  const points = [p0, p1, p2, p3];
  const plane = fitPlaneFromPoints(points);
  if (!plane) {
    return { valid: false, error: 'Could not fit a plane through the picks — avoid collinear points.' };
  }

  if (plane.maxDev > planeTolerance) {
    return {
      valid: false,
      error: `A pick is too far from the plane (${plane.maxDev.toFixed(2)} blocks) — keep points on the same face.`,
    };
  }

  const projected = points.map((p) =>
    TriCube.projectPointOntoPlane(p, plane.origin, plane.normal)
  );
  const rect = findBestRectangle(projected, plane.origin, plane.normal);
  if (!rect || rect.sizeU < minEdgeLength || rect.sizeV < minEdgeLength) {
    return {
      valid: false,
      error: 'Fitted face is too small — spread picks farther apart on the plane.',
    };
  }

  const wHat = TriCube.normalize(TriCube.cross(rect.uHat, rect.vHat));
  if (!wHat) {
    return { valid: false, error: 'Could not derive a stable face orientation from the picks.' };
  }

  const extrudeSign = options.biasCenter
    ? TriCube.resolveExtrudeSign(rect.anchor, wHat, options.biasCenter)
    : 1;

  let sizeU = rect.sizeU;
  let sizeV = rect.sizeV;
  let sizeW = extrudeDepth;
  let anchor = rect.anchor.slice();

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
  const corners = TriCube.buildCubeCorners(
    rect.anchor,
    rect.uHat,
    rect.vHat,
    wHat,
    sizeU,
    sizeV,
    sizeW,
    extrudeSign
  );

  return {
    valid: true,
    origin: anchor,
    from: [0, 0, 0],
    to: sizes.slice(),
    sizes,
    sideLength: Math.max(sizeU, sizeV, sizeW),
    extrudeSign,
    basis: { u: rect.uHat, v: rect.vHat, w: wHat },
    corners,
    worldAnchor: rect.anchor,
    fitError: rect.score,
    pickGhostCorners: rect.pickGhostCorners,
  };
}

function registerCubeFromFourPoints(TriCube) {
  TriCube.fitPlaneFromPoints = fitPlaneFromPoints;
  TriCube.computeCubeFromFourPoints = computeCubeFromFourPoints;
}
