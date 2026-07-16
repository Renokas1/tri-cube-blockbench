/**
 * Create cubes from display-space picks (matches ghost preview), then place in the scene.
 *
 * Matches Blockbench vertex snap: slide unrotated, pivot, set rotation via mesh
 * quaternion, then nudge origin on rotated cubes.
 */
const FROM_CORNER_INDEX = 6;
const FAR_Z_FACE_CORNER_INDEX = 7;
const GHOST_ALIGN_EPS = 0.15;

/** Ghost corner index -> Blockbench getGlobalVertexPositions index. */
const GHOST_TO_BB = {
  1: [6, 3, 4, 1, 7, 2, 5, 0],
  [-1]: [7, 2, 5, 0, 6, 3, 4, 1],
};

function isGroupLike(node) {
  if (!node) return false;
  if (typeof Group !== 'undefined' && node instanceof Group) return true;
  if (typeof Bone !== 'undefined' && node instanceof Bone) return true;
  return node.type === 'group' || node.type === 'bone';
}

function getInsertionParent(picks) {
  const pickCube = picks?.[0]?.cube;
  if (pickCube?.parent && pickCube.parent !== 'root') {
    return pickCube.parent;
  }

  const selected = Outliner.selected?.[0];
  if (!selected) return null;

  if (selected instanceof Cube) {
    const parent = selected.parent;
    return parent && parent !== 'root' ? parent : null;
  }

  if (isGroupLike(selected)) return selected;
  return null;
}

function refreshCube(cube) {
  cube.preview_controller.updateTransform(cube);
  cube.preview_controller.updateGeometry(cube);
}

function matrixFromBasis(basis) {
  const m = new THREE.Matrix4();
  m.makeBasis(
    new THREE.Vector3(basis.u[0], basis.u[1], basis.u[2]),
    new THREE.Vector3(basis.v[0], basis.v[1], basis.v[2]),
    new THREE.Vector3(basis.w[0], basis.w[1], basis.w[2])
  );
  return m;
}

function displayDeltaToOriginOffset(cube, deltaDisplay, parent) {
  const localOffset = new THREE.Vector3(deltaDisplay[0], deltaDisplay[1], deltaDisplay[2]);
  if (typeof Format !== 'undefined' && Format.bone_rig && parent instanceof Group && cube.mesh?.parent) {
    const q = new THREE.Quaternion();
    cube.mesh.parent.getWorldQuaternion(q).invert();
    localOffset.applyQuaternion(q);
  } else if (parent?.mesh) {
    const q = new THREE.Quaternion();
    parent.mesh.getWorldQuaternion(q).invert();
    localOffset.applyQuaternion(q);
  }
  return localOffset;
}

function displayDeltaToMoveVector(deltaDisplay, parent) {
  if (!parent?.mesh || typeof THREE === 'undefined') {
    return deltaDisplay.slice();
  }
  const v = new THREE.Vector3(deltaDisplay[0], deltaDisplay[1], deltaDisplay[2]);
  const q = new THREE.Quaternion();
  parent.mesh.getWorldQuaternion(q).invert();
  v.applyQuaternion(q);
  return [v.x, v.y, v.z];
}

function pickEdgeCornerIndices(extrudeSign) {
  if (extrudeSign >= 0) {
    return { pick1: FROM_CORNER_INDEX, pick2: 3, pick3: 4 };
  }
  return { pick1: FAR_Z_FACE_CORNER_INDEX, pick2: 2, pick3: 5 };
}

function pivotOutlinerCorner(cube, extrudeSign) {
  if (extrudeSign >= 0) return cube.from.slice();
  return [cube.from[0], cube.from[1], cube.to[2]];
}

function resetCubeForm(cube, sizes) {
  const [sx, sy, sz] = sizes;
  cube.from.splice(0, 3, 0, 0, 0);
  cube.to.splice(0, 3, sx, sy, sz);
  cube.origin.splice(0, 3, 0, 0, 0);
  cube.rotation.splice(0, 3, 0, 0, 0);
  refreshCube(cube);
}

/** Slide an axis-aligned cube (rotation 0) so one corner hits the target. */
function translateUnrotatedCorner(cube, targetDisplay, cornerIndex, parent) {
  for (let i = 0; i < 12; i++) {
    refreshCube(cube);
    const verts = cube.getGlobalVertexPositions();
    const current = verts[cornerIndex];
    if (!current) break;

    const deltaDisplay = TriCube.sub(targetDisplay, current);
    if (TriCube.length(deltaDisplay) < 0.0005) break;

    cube.moveVector(displayDeltaToMoveVector(deltaDisplay, parent));
  }
}

/** Nudge a rotated cube so one corner hits the target (vertex snap move style). */
function translateRotatedCorner(cube, targetDisplay, cornerIndex, parent) {
  const useOrigin =
    typeof Format !== 'undefined' && Format.rotate_cubes && typeof Cube !== 'undefined' && cube instanceof Cube;

  for (let i = 0; i < 16; i++) {
    refreshCube(cube);
    const verts = cube.getGlobalVertexPositions();
    const current = verts[cornerIndex];
    if (!current) break;

    const deltaDisplay = TriCube.sub(targetDisplay, current);
    if (TriCube.length(deltaDisplay) < 0.0005) break;

    const localOffset = displayDeltaToOriginOffset(cube, deltaDisplay, parent);
    if (useOrigin) {
      cube.origin[0] += localOffset.x;
      cube.origin[1] += localOffset.y;
      cube.origin[2] += localOffset.z;
    } else {
      cube.moveVector([localOffset.x, localOffset.y, localOffset.z]);
    }
  }
}

/** Set cube.rotation from a display-space basis using mesh quaternion (vertex snap pattern). */
function applyRotationFromBasis(cube, basis, parent) {
  if (typeof THREE === 'undefined' || !cube.mesh) return;

  const worldQuat = new THREE.Quaternion().setFromRotationMatrix(matrixFromBasis(basis));
  const localQuat = worldQuat.clone();

  if (parent?.mesh) {
    const parentQuat = new THREE.Quaternion();
    parent.mesh.getWorldQuaternion(parentQuat);
    localQuat.premultiply(parentQuat.invert());
  }

  const order = typeof Format !== 'undefined' && Format.euler_order ? Format.euler_order : 'XYZ';
  cube.mesh.quaternion.copy(localQuat);
  cube.mesh.rotation.order = order;

  const r = cube.mesh.rotation;
  cube.rotation[0] = Math.round(THREE.MathUtils.radToDeg(r.x) * 1000) / 1000;
  cube.rotation[1] = Math.round(THREE.MathUtils.radToDeg(r.y) * 1000) / 1000;
  cube.rotation[2] = Math.round(THREE.MathUtils.radToDeg(r.z) * 1000) / 1000;

  refreshCube(cube);
}

function scoreGhostAlignment(cube, ghostCorners, extrudeSign) {
  if (!ghostCorners?.length) return Infinity;
  refreshCube(cube);
  const verts = cube.getGlobalVertexPositions();
  const map = GHOST_TO_BB[extrudeSign] || GHOST_TO_BB[1];
  let sum = 0;
  for (let i = 0; i < ghostCorners.length; i++) {
    const actual = verts[map[i]];
    if (!actual) return Infinity;
    sum += TriCube.distance(ghostCorners[i], actual);
  }
  return sum;
}

function scorePickAlignment(cube, picks, extrudeSign, result) {
  refreshCube(cube);
  const verts = cube.getGlobalVertexPositions();
  const map = GHOST_TO_BB[extrudeSign] || GHOST_TO_BB[1];

  if (result?.pickGhostCorners?.length === 4 && picks.length >= 4) {
    let sum = 0;
    for (let i = 0; i < 4; i++) {
      const bbIdx = map[result.pickGhostCorners[i]];
      if (!verts[bbIdx]) return Infinity;
      sum += TriCube.distance(verts[bbIdx], picks[i].point);
    }
    return sum;
  }

  const idx = pickEdgeCornerIndices(extrudeSign);
  if (!verts[idx.pick1] || !verts[idx.pick2] || !verts[idx.pick3]) return Infinity;

  return (
    TriCube.distance(verts[idx.pick1], picks[0].point) +
    TriCube.distance(verts[idx.pick2], picks[1].point) +
    TriCube.distance(verts[idx.pick3], picks[2].point)
  );
}

function getResultSizes(result) {
  return result.sizes || result.to || [result.sideLength, result.sideLength, result.sideLength];
}

function placeCube(cube, result, parent, picks, extrudeSign) {
  const sizes = getResultSizes(result);
  const idx = pickEdgeCornerIndices(extrudeSign);
  const anchorTarget = result.worldAnchor ?? picks[0].point;

  resetCubeForm(cube, sizes);

  translateUnrotatedCorner(cube, anchorTarget, idx.pick1, parent);

  if (typeof cube.transferOrigin === 'function') {
    cube.transferOrigin(pivotOutlinerCorner(cube, extrudeSign));
  }
  refreshCube(cube);

  applyRotationFromBasis(cube, result.basis, parent);
  translateRotatedCorner(cube, anchorTarget, idx.pick1, parent);

  return {
    pickScore: scorePickAlignment(cube, picks, extrudeSign, result),
    ghostScore: scoreGhostAlignment(cube, result.corners, extrudeSign),
  };
}

function chooseBestPlacement(cube, result, parent, picks) {
  const primarySign = result.extrudeSign ?? 1;
  const primary = placeCube(cube, result, parent, picks, primarySign);
  const alternate = placeCube(cube, result, parent, picks, -primarySign);

  const best =
    alternate.ghostScore + 0.0001 < primary.ghostScore
      ? { ...alternate, extrudeSign: -primarySign }
      : { ...primary, extrudeSign: primarySign };

  placeCube(cube, result, parent, picks, best.extrudeSign);
  return best;
}

function createCubeFromResult(result, parent, picks, options = {}) {
  const sizes = getResultSizes(result);
  const cubeName = options.cubeName || 'tri_cube';

  const cube = new Cube({
    name: cubeName,
    from: [0, 0, 0],
    to: sizes.slice(),
    origin: [0, 0, 0],
    rotation: [0, 0, 0],
    autouv: 1,
    ...(options.cubeInit || {}),
    ...(options.faces ? { faces: options.faces } : {}),
  }).init();

  if (parent && typeof cube.addTo === 'function') {
    cube.addTo(parent);
  } else {
    cube.addTo(undefined);
  }

  const best = chooseBestPlacement(cube, result, parent, picks);

  if (best.ghostScore > GHOST_ALIGN_EPS && typeof console !== 'undefined') {
    console.warn(
      `[Tri-Cube] cube/ghost mismatch (ghost=${best.ghostScore.toFixed(3)}, picks=${best.pickScore.toFixed(3)}, extrude=${best.extrudeSign})`
    );
  }

  const sourceCube = picks[0]?.cube;
  if (!options.skipAppearanceCopy && sourceCube instanceof Cube && TriCube.copyCubeAppearance?.(cube, sourceCube)) {
    refreshCube(cube);
  }

  if (!options.skipSelect) {
    cube.select();
  }
  return cube;
}

function registerSpace(TriCube) {
  TriCube.FROM_CORNER_INDEX = FROM_CORNER_INDEX;
  TriCube.FAR_Z_FACE_CORNER_INDEX = FAR_Z_FACE_CORNER_INDEX;
  TriCube.GHOST_TO_BB = GHOST_TO_BB;
  TriCube.getInsertionParent = getInsertionParent;
  TriCube.applyRotationFromBasis = applyRotationFromBasis;
  TriCube.createCubeFromResult = createCubeFromResult;
}
