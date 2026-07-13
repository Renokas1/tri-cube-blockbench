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
      edges: [],
      hint: 'Pick anchor corner',
    };
  }

  const p0 = priorPicks[0];
  const p0Point = p0.point || p0;
  if (pickIndex === 1) {
    const entries = collectAdjacentCornerEntries(p0);
    const corners = entries.map((e) => e.point);
    return {
      entries,
      corners,
      edges: edgesFromAnchor(p0Point, corners),
      hint: entries.length ? 'Pick first edge corner (neighbor of anchor)' : 'Pick first edge corner',
    };
  }

  const entries = collectFaceCornerEntries(p0, priorPicks[1]);
  const corners = entries.map((e) => e.point);
  const p1Point = priorPicks[1].point || priorPicks[1];
  const faceEdges = edgesFromAnchor(p0Point, corners);
  faceEdges.push({ a: p0Point, b: p1Point });
  for (let i = 0; i < corners.length; i++) {
    for (let j = i + 1; j < corners.length; j++) {
      faceEdges.push({ a: corners[i], b: corners[j] });
    }
  }
  return {
    entries,
    corners,
    edges: faceEdges,
    hint: 'Pick anywhere on the same face',
  };
}

function getThirdPickFacePlane(p0Pick, p1Pick, hitPoint) {
  const p0 = p0Pick.point || p0Pick;
  const p1 = p1Pick.point || p1Pick;
  const uHat = TriCube.normalize(TriCube.sub(p1, p0));
  if (!uHat) return null;

  const toHit = TriCube.sub(hitPoint, p0);
  const toHitInPlane = TriCube.sub(toHit, TriCube.scale(uHat, TriCube.dot(toHit, uHat)));
  let refDir = TriCube.length(toHitInPlane) > SNAP_EPS ? TriCube.normalize(toHitInPlane) : null;

  const cube = p0Pick?.cube;
  const cornerIndex = p0Pick?.cornerIndex;
  if (cube instanceof Cube && cornerIndex != null) {
    const display = getCubeVerticesWorld(cube);
    const perpDirs = [];
    for (const i of getAdjacentCornerIndices(display, cornerIndex)) {
      const d = TriCube.normalize(TriCube.sub(display[i], p0));
      if (!d) continue;
      if (Math.abs(TriCube.dot(d, uHat)) < 0.2) perpDirs.push(d);
    }

    if (perpDirs.length) {
      if (refDir) {
        let best = perpDirs[0];
        let bestDot = TriCube.dot(refDir, best);
        for (const d of perpDirs) {
          const score = TriCube.dot(refDir, d);
          if (score > bestDot) {
            bestDot = score;
            best = d;
          }
        }
        refDir = best;
      } else {
        refDir = perpDirs[0];
      }
    }
  }

  if (!refDir) return null;

  const normal = TriCube.normalize(TriCube.cross(uHat, refDir));
  if (!normal) return null;

  return { origin: p0.slice(), normal };
}

function resolveThirdPickPoint(hitPoint, p0Pick, p1Pick, snapMode, candidates) {
  let point = hitPoint.slice();

  if (snapMode === SNAP.EDGE) {
    const edgeSnap = resolveEdgeSnapPoint(hitPoint, candidates);
    if (edgeSnap) point = edgeSnap.point;
  }

  const plane = getThirdPickFacePlane(p0Pick, p1Pick, hitPoint);
  if (plane) {
    point = TriCube.projectPointOntoPlane(point, plane.origin, plane.normal);
  }

  if (snapMode === SNAP.EDGE) {
    const edgeSnap = resolveEdgeSnapPoint(point, candidates);
    if (edgeSnap) {
      return {
        ...edgeSnap,
        outliner: displayToOutliner(edgeSnap.point, p0Pick),
        hint: 'Pick anywhere on the same face',
      };
    }
  }

  if (snapMode === SNAP.CORNER && candidates.entries?.length) {
    const nearest = nearestEntry(point, candidates.entries);
    const edgeLen =
      p0Pick?.cube instanceof Cube
        ? getCubeEdgeLength(getCubeVerticesWorld(p0Pick.cube))
        : 1;
    const snapTol = Math.max(0.35, edgeLen * 0.45);
    if (nearest && TriCube.distance(point, nearest.point) <= snapTol) {
      return {
        ...nearest,
        hint: 'Pick anywhere on the same face',
      };
    }
  }

  return {
    point,
    outliner: displayToOutliner(point, p0Pick),
    mode: SNAP.FACE,
    cube: null,
    hint: 'Pick anywhere on the same face',
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

function getCubeEdgesWorld(cube) {
  const display = getCubeVerticesWorld(cube);
  const outliner = getOutlinerCorners(cube);
  if (display.length !== 8) return [];

  const edges = [];
  for (let i = 0; i < 8; i++) {
    for (let j = i + 1; j < 8; j++) {
      let diffAxes = 0;
      for (let k = 0; k < 3; k++) {
        if (Math.abs(outliner[i][k] - outliner[j][k]) > SNAP_EPS) diffAxes++;
      }
      if (diffAxes === 1) {
        edges.push({ a: display[i], b: display[j] });
      }
    }
  }
  return edges;
}

function getEdgeSnapMaxDist(hitPoint) {
  const r = typeof TriCube.markerRadiusAt === 'function' ? TriCube.markerRadiusAt(hitPoint) : 0.14;
  return Math.max(1.5, r * 16);
}

function collectEdgeList(candidates = {}) {
  const edges = [];
  if (candidates.edges?.length) edges.push(...candidates.edges);
  for (const cube of Cube.all) {
    if (cube.visibility === false) continue;
    edges.push(...getCubeEdgesWorld(cube));
  }
  return edges;
}

function resolveEdgeSnapPoint(hitPoint, candidates = {}, options = {}) {
  const maxDist = options.maxEdgeDist ?? getEdgeSnapMaxDist(hitPoint);
  const nearestEdge = nearestEdgePoint(hitPoint, collectEdgeList(candidates), maxDist);
  if (!nearestEdge) return null;
  return { point: nearestEdge.point, mode: SNAP.EDGE, cube: null, outliner: null };
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

function nearestEdgePoint(target, edges, maxDist) {
  let best = null;
  for (const edge of edges) {
    const point = closestPointOnSegment(target, edge.a, edge.b);
    const distance = TriCube.distance(target, point);
    if (maxDist != null && distance > maxDist) continue;
    if (!best || distance < best.distance) {
      best = { point, distance, edge };
    }
  }
  return best;
}

function resolveSnapPoint(hitPoint, candidates, snapMode, options = {}) {
  const strictCandidates = options.strictCandidates ?? false;

  if (snapMode === SNAP.FACE || !candidates.entries?.length) {
    if (snapMode === SNAP.EDGE) {
      const edgeSnap = resolveEdgeSnapPoint(hitPoint, candidates, options);
      if (edgeSnap) return edgeSnap;
    }
    return { point: hitPoint.slice(), mode: SNAP.FACE, cube: null, outliner: null };
  }

  if (snapMode === SNAP.EDGE) {
    const edgeSnap = resolveEdgeSnapPoint(hitPoint, candidates, options);
    if (edgeSnap) {
      const nearestCorner = nearestPoint(hitPoint, candidates.corners);
      const edgeDist = TriCube.distance(hitPoint, edgeSnap.point);
      if (
        nearestCorner &&
        nearestCorner.distance <= (options.cornerSnapDist ?? 0.22) &&
        nearestCorner.distance < edgeDist * 0.65
      ) {
        const entry = nearestEntry(hitPoint, candidates.entries);
        if (entry) return entry;
      }
      return edgeSnap;
    }
  }

  if (strictCandidates && snapMode !== SNAP.EDGE) {
    const nearest = nearestEntry(hitPoint, candidates.entries);
    if (nearest) return nearest;
  }

  const cornerBias = options.cornerBias ?? 0.45;
  const maxCornerDist = options.maxCornerDist ?? 24;
  const nearestCorner = nearestPoint(hitPoint, candidates.corners);
  const edgeList = collectEdgeList(candidates);
  const nearestEdge = edgeList.length ? nearestEdgePoint(hitPoint, edgeList) : null;

  if (snapMode === SNAP.EDGE && nearestEdge) {
    const preferEdge =
      !nearestCorner ||
      nearestEdge.distance <= nearestCorner.distance * 0.85 ||
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

function pickWorldPointFromRaycastQuad(result, snapMode, context = {}) {
  if (!result || result.type === 'none') return null;

  const hitPoint = TriCube.getRaycastHitPoint(result);
  if (!hitPoint) return null;

  const pickIndex = context.pickIndex ?? 0;
  const priorPicks = context.priorPicks ?? [];
  const refPick = priorPicks[0];
  const cube = result.element instanceof Cube ? result.element : result.cube;

  if (pickIndex === 0) {
    if (result.type === 'vertex' && cube instanceof Cube && result.vertex_index != null) {
      const entry = makeCornerEntry(cube, result.vertex_index);
      return { ...entry, hint: 'Pick anchor corner on a cube' };
    }
    if (cube instanceof Cube) {
      const entry = nearestCornerEntry(cube, hitPoint);
      return { ...entry, hint: 'Pick anchor corner on a cube' };
    }
    return null;
  }

  let point = hitPoint.slice();
  let mode = SNAP.FACE;
  let pickCube = null;

  if (snapMode === SNAP.EDGE) {
    const edgeSnap = resolveEdgeSnapPoint(hitPoint, {}, context.snapOptions);
    if (edgeSnap) {
      point = edgeSnap.point;
      mode = SNAP.EDGE;
    }
  } else if (snapMode === SNAP.CORNER && cube instanceof Cube) {
    const entry = nearestCornerEntry(cube, hitPoint);
    point = entry.point;
    mode = SNAP.CORNER;
    pickCube = cube;
  }

  if (pickIndex >= 3 && priorPicks.length >= 3) {
    const plane = TriCube.fitPlaneFromPoints(priorPicks.slice(0, 3).map((p) => p.point));
    if (plane) {
      point = TriCube.projectPointOntoPlane(point, plane.origin, plane.normal);
    }
  }

  const hint =
    pickIndex < 3 ? 'Pick a point near the face plane' : 'Pick a point on the fitted plane';

  return {
    point,
    outliner: displayToOutliner(point, refPick),
    mode,
    cube: pickCube,
    hint,
  };
}

function pickWorldPointFromRaycast(result, snapMode, context = {}) {
  if (!result || result.type === 'none') return null;

  const hitPoint = TriCube.getRaycastHitPoint(result);
  if (!hitPoint) return null;

  const pickIndex = context.pickIndex ?? 0;
  const priorPicks = context.priorPicks ?? [];
  const candidates = getPickCandidates(pickIndex, priorPicks);
  const refPick = priorPicks[0];

  if (pickIndex === 2 && priorPicks.length >= 2) {
    return resolveThirdPickPoint(hitPoint, priorPicks[0], priorPicks[1], snapMode, candidates);
  }

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

  if (snapMode === SNAP.EDGE) {
    const edgeSnap = resolveEdgeSnapPoint(hitPoint, candidates, context.snapOptions);
    if (edgeSnap) {
      return {
        ...edgeSnap,
        outliner: displayToOutliner(edgeSnap.point, refPick),
        hint: candidates.hint,
      };
    }
  }

  if (cube instanceof Cube && snapMode === SNAP.CORNER) {
    const entry = nearestCornerEntry(cube, hitPoint);
    return { ...entry, hint: candidates.hint };
  }

  if (candidates.entries.length) {
    const snapped = resolveSnapPoint(hitPoint, candidates, snapMode, {
      strictCandidates: pickIndex === 1,
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
  TriCube.getThirdPickFacePlane = getThirdPickFacePlane;
  TriCube.pickWorldPointFromRaycast = pickWorldPointFromRaycast;
  TriCube.pickWorldPointFromRaycastQuad = pickWorldPointFromRaycastQuad;
  TriCube.snapModeFromEvent = snapModeFromEvent;
  TriCube.getCubeEdgesWorld = getCubeEdgesWorld;
  TriCube.resolveEdgeSnapPoint = resolveEdgeSnapPoint;
}
