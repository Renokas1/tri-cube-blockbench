/**
 * Snap a raycast hit to cube corners / edges across the whole model.
 * Pick 2 and 3 are constrained to valid cube corners adjacent to prior picks.
 */
const SNAP = {
  CORNER: 'corner',
  EDGE: 'edge',
  FACE: 'face',
};

const SNAP_EPS = 0.001;

function approx(a, b, tolerance) {
  return Math.abs(a - b) <= tolerance;
}

function dedupePoints(points, epsilon = 0.05) {
  const out = [];
  for (const p of points) {
    if (!out.some((q) => TriCube.distance(p, q) < epsilon)) out.push(p.slice());
  }
  return out;
}

function getCubeVerticesWorld(cube) {
  if (!cube || typeof cube.getGlobalVertexPositions !== 'function') return [];
  return cube.getGlobalVertexPositions().map((v) => [v[0], v[1], v[2]]);
}

function getCubeEdgeLength(verts) {
  let min = Infinity;
  for (let i = 0; i < verts.length; i++) {
    for (let j = i + 1; j < verts.length; j++) {
      const d = TriCube.distance(verts[i], verts[j]);
      if (d > SNAP_EPS && d < min) min = d;
    }
  }
  return min === Infinity ? 1 : min;
}

function getAdjacentCornersOnCube(verts, cornerIndex) {
  const corner = verts[cornerIndex];
  const edgeLen = getCubeEdgeLength(verts);
  const tol = Math.max(SNAP_EPS, edgeLen * 0.08);
  return verts.filter(
    (v, i) => i !== cornerIndex && approx(TriCube.distance(v, corner), edgeLen, tol)
  );
}

function findCornerOnCube(verts, point) {
  const edgeLen = getCubeEdgeLength(verts);
  const tol = Math.max(0.2, edgeLen * 0.35);
  let bestIdx = -1;
  let bestDist = Infinity;
  for (let i = 0; i < verts.length; i++) {
    const d = TriCube.distance(verts[i], point);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestDist <= tol ? bestIdx : -1;
}

function getAllCubeEdgesWorld() {
  const edges = [];
  for (const cube of Cube.all) {
    if (cube.visibility === false) continue;
    const verts = getCubeVerticesWorld(cube);
    if (verts.length !== 8) continue;
    const edgeLen = getCubeEdgeLength(verts);
    const tol = Math.max(SNAP_EPS, edgeLen * 0.08);
    for (let i = 0; i < verts.length; i++) {
      for (let j = i + 1; j < verts.length; j++) {
        if (approx(TriCube.distance(verts[i], verts[j]), edgeLen, tol)) {
          edges.push({ a: verts[i], b: verts[j] });
        }
      }
    }
  }
  return edges;
}

function collectAllCornersWorld() {
  const corners = [];
  for (const cube of Cube.all) {
    if (cube.visibility === false) continue;
    corners.push(...getCubeVerticesWorld(cube));
  }
  return dedupePoints(corners);
}

function collectAdjacentCornersWorld(anchorPoint) {
  const adjacent = [];
  for (const cube of Cube.all) {
    if (cube.visibility === false) continue;
    const verts = getCubeVerticesWorld(cube);
    const idx = findCornerOnCube(verts, anchorPoint);
    if (idx === -1) continue;
    adjacent.push(...getAdjacentCornersOnCube(verts, idx));
  }
  return dedupePoints(adjacent);
}

function collectFaceCornerCandidates(p0, p1) {
  const adjacent = collectAdjacentCornersWorld(p0);
  const u = TriCube.sub(p1, p0);
  const uLen = TriCube.length(u);
  if (uLen < SNAP_EPS) return adjacent;
  const uHat = TriCube.normalize(u);
  return adjacent.filter((c) => {
    if (TriCube.distance(c, p0) < SNAP_EPS) return false;
    if (TriCube.distance(c, p1) < SNAP_EPS) return false;
    const dir = TriCube.normalize(TriCube.sub(c, p0));
    if (!dir) return false;
    return Math.abs(TriCube.dot(dir, uHat)) < 0.2;
  });
}

function edgesFromAnchor(anchor, corners) {
  const edges = [];
  for (const c of corners) {
    edges.push({ a: anchor.slice(), b: c.slice() });
  }
  return edges;
}

function getPickCandidates(pickIndex, priorPicks) {
  if (pickIndex === 0) {
    return {
      corners: collectAllCornersWorld(),
      edges: getAllCubeEdgesWorld(),
      hint: 'Pick anchor corner',
    };
  }

  const p0 = priorPicks[0]?.point || priorPicks[0];
  if (pickIndex === 1) {
    const corners = collectAdjacentCornersWorld(p0);
    return {
      corners,
      edges: edgesFromAnchor(p0, corners),
      hint: corners.length ? 'Pick first edge corner (neighbor of anchor)' : 'Pick first edge corner',
    };
  }

  const p1 = priorPicks[1]?.point || priorPicks[1];
  let corners = collectFaceCornerCandidates(p0, p1);
  if (!corners.length) {
    corners = collectAdjacentCornersWorld(p0).filter((c) => TriCube.distance(c, p1) > SNAP_EPS);
  }
  return {
    corners,
    edges: edgesFromAnchor(p0, corners),
    hint: corners.length ? 'Pick second edge corner (same face)' : 'Pick second edge corner on the same face',
  };
}

function nearestPoint(target, candidates) {
  let best = null;
  let bestDist = Infinity;
  for (const c of candidates) {
    const d = TriCube.distance(target, c);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best == null ? null : { point: best.slice(), distance: bestDist };
}

function closestPointOnSegment(point, a, b) {
  const ab = TriCube.sub(b, a);
  const lenSq = TriCube.dot(ab, ab);
  if (lenSq < SNAP_EPS) return a.slice();
  const t = Math.max(0, Math.min(1, TriCube.dot(TriCube.sub(point, a), ab) / lenSq));
  return TriCube.add(a, TriCube.scale(ab, t));
}

function nearestEdgePoint(target, edges) {
  let best = null;
  for (const edge of edges) {
    const point = closestPointOnSegment(target, edge.a, edge.b);
    const distance = TriCube.distance(target, point);
    if (!best || distance < best.distance) {
      best = { point, distance, edge };
    }
  }
  return best;
}

function resolveSnapPoint(hitPoint, candidates, snapMode, options = {}) {
  const cornerBias = options.cornerBias ?? 0.55;
  const maxCornerDist = options.maxCornerDist ?? 3;

  if (snapMode === SNAP.FACE || !candidates.corners.length) {
    return { point: hitPoint.slice(), mode: SNAP.FACE, cube: null };
  }

  const nearestCorner = nearestPoint(hitPoint, candidates.corners);
  const nearestEdge = candidates.edges.length ? nearestEdgePoint(hitPoint, candidates.edges) : null;

  if (snapMode === SNAP.EDGE && nearestEdge) {
    const preferEdge =
      !nearestCorner ||
      nearestEdge.distance <= nearestCorner.distance * 1.05 ||
      nearestCorner.distance > maxCornerDist;
    if (preferEdge) {
      return { point: nearestEdge.point, mode: SNAP.EDGE, cube: null };
    }
  }

  if (nearestCorner) {
    const preferCorner =
      nearestCorner.distance <= maxCornerDist ||
      !nearestEdge ||
      nearestCorner.distance <= nearestEdge.distance * cornerBias;
    if (preferCorner) {
      return { point: nearestCorner.point, mode: SNAP.CORNER, cube: null };
    }
  }

  if (nearestEdge) {
    return { point: nearestEdge.point, mode: SNAP.EDGE, cube: null };
  }

  return { point: hitPoint.slice(), mode: SNAP.FACE, cube: null };
}

function pickWorldPointFromRaycast(result, snapMode, context = {}) {
  if (!result || result.type === 'none') return null;

  const hit = result.intersects?.[0]?.point;
  const hitPoint = hit ? [hit.x, hit.y, hit.z] : null;
  if (!hitPoint) return null;

  const pickIndex = context.pickIndex ?? 0;
  const priorPicks = context.priorPicks ?? [];
  const candidates = getPickCandidates(pickIndex, priorPicks);

  if (snapMode === SNAP.FACE) {
    return { point: hitPoint, mode: SNAP.FACE, cube: result.cube || result.element || null, hint: candidates.hint };
  }

  if (candidates.corners.length) {
    const snapped = resolveSnapPoint(hitPoint, candidates, snapMode, context.snapOptions);
    return {
      point: snapped.point,
      mode: snapped.mode,
      cube: result.cube || result.element || null,
      hint: candidates.hint,
    };
  }

  const cube = result.cube || result.element;
  if (cube) {
    const fallbackCorners = getCubeVerticesWorld(cube);
    const snapped = resolveSnapPoint(
      hitPoint,
      { corners: fallbackCorners, edges: getAllCubeEdgesWorld() },
      snapMode,
      context.snapOptions
    );
    return {
      point: snapped.point,
      mode: snapped.mode,
      cube,
      hint: candidates.hint,
    };
  }

  return { point: hitPoint, mode: SNAP.FACE, cube: null, hint: candidates.hint };
}

function snapModeFromEvent(event) {
  if (event?.shiftKey) return SNAP.EDGE;
  if (event?.ctrlKey || event?.metaKey) return SNAP.FACE;
  return SNAP.CORNER;
}

function registerPickSnap(TriCube) {
  TriCube.SNAP = SNAP;
  TriCube.getCubeVerticesWorld = getCubeVerticesWorld;
  TriCube.getPickCandidates = getPickCandidates;
  TriCube.pickWorldPointFromRaycast = pickWorldPointFromRaycast;
  TriCube.snapModeFromEvent = snapModeFromEvent;
  TriCube.closestPointOnSegment = closestPointOnSegment;
}
