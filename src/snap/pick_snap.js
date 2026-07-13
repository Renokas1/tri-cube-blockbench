/**
 * Snap picks to cube corners using display coords for gizmos and outliner coords for creation.
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

function dedupeEntries(entries, epsilon = 0.05) {
  const out = [];
  for (const e of entries) {
    if (!out.some((q) => TriCube.distance(e.point, q.point) < epsilon)) out.push(e);
  }
  return out;
}

/** Outliner from/to corners — same order as Cube.getGlobalVertexPositions(). */
function getOutlinerCorners(cube) {
  const from = cube.from;
  const to = cube.to;
  return [
    [to[0], to[1], to[2]],
    [to[0], to[1], from[2]],
    [to[0], from[1], to[2]],
    [to[0], from[1], from[2]],
    [from[0], to[1], from[2]],
    [from[0], to[1], to[2]],
    [from[0], from[1], from[2]],
    [from[0], from[1], to[2]],
  ];
}

function getCubeVerticesWorld(cube) {
  if (!cube || typeof cube.getGlobalVertexPositions !== 'function') return [];
  return cube.getGlobalVertexPositions().map((v) => [v[0], v[1], v[2]]);
}

function makeCornerEntry(cube, cornerIndex) {
  const display = getCubeVerticesWorld(cube);
  const outliner = getOutlinerCorners(cube);
  return {
    point: display[cornerIndex].slice(),
    outliner: outliner[cornerIndex].slice(),
    cube,
    cornerIndex,
    mode: SNAP.CORNER,
  };
}

function nearestCornerEntry(cube, displayPoint) {
  const display = getCubeVerticesWorld(cube);
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < display.length; i++) {
    const d = TriCube.distance(displayPoint, display[i]);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return makeCornerEntry(cube, bestIdx);
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

function getAdjacentCornerIndices(verts, cornerIndex) {
  const corner = verts[cornerIndex];
  const edgeLen = getCubeEdgeLength(verts);
  const tol = Math.max(SNAP_EPS, edgeLen * 0.08);
  const out = [];
  for (let i = 0; i < verts.length; i++) {
    if (i === cornerIndex) continue;
    if (approx(TriCube.distance(verts[i], corner), edgeLen, tol)) out.push(i);
  }
  return out;
}

function findCornerIndexOnCube(cube, displayPoint) {
  const verts = getCubeVerticesWorld(cube);
  const edgeLen = getCubeEdgeLength(verts);
  const tol = Math.max(0.35, edgeLen * 0.45);
  let bestIdx = -1;
  let bestDist = Infinity;
  for (let i = 0; i < verts.length; i++) {
    const d = TriCube.distance(verts[i], displayPoint);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestDist <= tol ? bestIdx : -1;
}

function collectAllCornerEntries() {
  const entries = [];
  for (const cube of Cube.all) {
    if (cube.visibility === false) continue;
    for (let i = 0; i < 8; i++) entries.push(makeCornerEntry(cube, i));
  }
  return dedupeEntries(entries);
}

function collectAdjacentCornerEntries(anchorPick) {
  const anchorDisplay = anchorPick.point || anchorPick;
  const entries = [];
  for (const cube of Cube.all) {
    if (cube.visibility === false) continue;
    const display = getCubeVerticesWorld(cube);
    let idx = findCornerIndexOnCube(cube, anchorDisplay);
    if (idx === -1) {
      let bestDist = Infinity;
      for (let i = 0; i < display.length; i++) {
        const d = TriCube.distance(display[i], anchorDisplay);
        if (d < bestDist) {
          bestDist = d;
          idx = i;
        }
      }
      const edgeLen = getCubeEdgeLength(display);
      if (bestDist > Math.max(0.5, edgeLen * 0.5)) idx = -1;
    }
    if (idx === -1) continue;
    for (const adj of getAdjacentCornerIndices(display, idx)) {
      entries.push(makeCornerEntry(cube, adj));
    }
  }
  return dedupeEntries(entries, 0.08);
}

function collectFaceCornerEntries(p0Pick, p1Pick) {
  const p0 = p0Pick.point || p0Pick;
  const p1 = p1Pick.point || p1Pick;
  const adjacent = collectAdjacentCornerEntries(p0Pick);
  const u = TriCube.sub(p1, p0);
  const uLen = TriCube.length(u);
  if (uLen < SNAP_EPS) return adjacent;
  const uHat = TriCube.normalize(u);
  let entries = adjacent.filter((e) => {
    if (TriCube.distance(e.point, p0) < SNAP_EPS) return false;
    if (TriCube.distance(e.point, p1) < SNAP_EPS) return false;
    const dir = TriCube.normalize(TriCube.sub(e.point, p0));
    if (!dir) return false;
    return Math.abs(TriCube.dot(dir, uHat)) < 0.2;
  });
  if (!entries.length) {
    entries = adjacent.filter((e) => TriCube.distance(e.point, p1) > SNAP_EPS);
  }
  return entries;
}

function getPickCandidates(pickIndex, priorPicks) {
  if (pickIndex === 0) {
    const entries = collectAllCornerEntries();
    return {
      entries,
      corners: entries.map((e) => e.point),
      hint: 'Pick anchor corner',
    };
  }

  const p0 = priorPicks[0];
  if (pickIndex === 1) {
    const entries = collectAdjacentCornerEntries(p0);
    return {
      entries,
      corners: entries.map((e) => e.point),
      hint: entries.length ? 'Pick first edge corner (neighbor of anchor)' : 'Pick first edge corner',
    };
  }

  const entries = collectFaceCornerEntries(p0, priorPicks[1]);
  return {
    entries,
    corners: entries.map((e) => e.point),
    hint: entries.length ? 'Pick second edge corner (same face)' : 'Pick second edge corner on the same face',
  };
}

function nearestEntry(target, entries) {
  let best = null;
  let bestDist = Infinity;
  for (const e of entries) {
    const d = TriCube.distance(target, e.point);
    if (d < bestDist) {
      bestDist = d;
      best = e;
    }
  }
  return best;
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

function edgesFromAnchor(anchor, corners) {
  const edges = [];
  for (const c of corners) {
    edges.push({ a: anchor.slice(), b: c.slice() });
  }
  return edges;
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
  const strictCandidates = options.strictCandidates ?? false;

  if (snapMode === SNAP.FACE || !candidates.entries?.length) {
    return { point: hitPoint.slice(), mode: SNAP.FACE, cube: null, outliner: null };
  }

  if (strictCandidates) {
    const nearest = nearestEntry(hitPoint, candidates.entries);
    if (nearest) return nearest;
  }

  const cornerBias = options.cornerBias ?? 0.45;
  const maxCornerDist = options.maxCornerDist ?? 24;
  const nearestCorner = nearestPoint(hitPoint, candidates.corners);
  const nearestEdge = candidates.edges?.length ? nearestEdgePoint(hitPoint, candidates.edges) : null;

  if (snapMode === SNAP.EDGE && nearestEdge) {
    const preferEdge =
      !nearestCorner ||
      nearestEdge.distance <= nearestCorner.distance * 1.05 ||
      nearestCorner.distance > maxCornerDist;
    if (preferEdge) {
      return { point: nearestEdge.point, mode: SNAP.EDGE, cube: null, outliner: null };
    }
  }

  if (nearestCorner) {
    const preferCorner =
      nearestCorner.distance <= maxCornerDist ||
      !nearestEdge ||
      nearestCorner.distance <= nearestEdge.distance * cornerBias;
    if (preferCorner) {
      const entry = nearestEntry(hitPoint, candidates.entries);
      if (entry) return entry;
    }
  }

  if (nearestEdge) {
    return { point: nearestEdge.point, mode: SNAP.EDGE, cube: null, outliner: null };
  }

  return { point: hitPoint.slice(), mode: SNAP.FACE, cube: null, outliner: null };
}

function displayToOutliner(displayPoint, referencePick) {
  if (referencePick?.outliner && referencePick?.point) {
    const delta = TriCube.sub(displayPoint, referencePick.point);
    return TriCube.add(referencePick.outliner, delta);
  }
  return displayPoint.slice();
}

function pickWorldPointFromRaycast(result, snapMode, context = {}) {
  if (!result || result.type === 'none') return null;

  const hitPoint = TriCube.getRaycastHitPoint(result);
  if (!hitPoint) return null;

  const pickIndex = context.pickIndex ?? 0;
  const priorPicks = context.priorPicks ?? [];
  const candidates = getPickCandidates(pickIndex, priorPicks);
  const refPick = priorPicks[0];

  const cube = result.element instanceof Cube ? result.element : result.cube;

  if (result.type === 'vertex' && cube instanceof Cube && result.vertex_index != null) {
    const entry = makeCornerEntry(cube, result.vertex_index);
    return { ...entry, hint: candidates.hint };
  }

  if (snapMode === SNAP.FACE) {
    return {
      point: hitPoint,
      outliner: displayToOutliner(hitPoint, refPick),
      mode: SNAP.FACE,
      cube: cube || null,
      hint: candidates.hint,
    };
  }

  if (cube instanceof Cube && snapMode === SNAP.CORNER) {
    const entry = nearestCornerEntry(cube, hitPoint);
    return { ...entry, hint: candidates.hint };
  }

  if (candidates.entries.length) {
    const snapped = resolveSnapPoint(hitPoint, candidates, snapMode, {
      strictCandidates: pickIndex > 0,
      ...context.snapOptions,
    });
    return {
      ...snapped,
      outliner: snapped.outliner || displayToOutliner(snapped.point, refPick),
      hint: candidates.hint,
    };
  }

  if (cube instanceof Cube) {
    const entry = nearestCornerEntry(cube, hitPoint);
    return { ...entry, hint: candidates.hint };
  }

  return {
    point: hitPoint,
    outliner: displayToOutliner(hitPoint, refPick),
    mode: SNAP.FACE,
    cube: null,
    hint: candidates.hint,
  };
}

function snapModeFromEvent(event) {
  if (event?.shiftKey) return SNAP.EDGE;
  if (event?.ctrlKey || event?.metaKey) return SNAP.FACE;
  return SNAP.CORNER;
}

function registerPickSnap(TriCube) {
  TriCube.SNAP = SNAP;
  TriCube.getOutlinerCorners = getOutlinerCorners;
  TriCube.getCubeVerticesWorld = getCubeVerticesWorld;
  TriCube.getPickCandidates = getPickCandidates;
  TriCube.pickWorldPointFromRaycast = pickWorldPointFromRaycast;
  TriCube.snapModeFromEvent = snapModeFromEvent;
  TriCube.closestPointOnSegment = closestPointOnSegment;
}
