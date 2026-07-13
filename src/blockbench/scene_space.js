/**
 * Blockbench uses two related spaces:
 * - THREE world (raycast intersect.point)
 * - scene-local / outliner space (getGlobalVertexPositions subtracts scene.position)
 *
 * Gizmos parented to Canvas.scene must use scene-local coordinates.
 */
function getSceneOffset() {
  const scene = Canvas?.scene;
  if (!scene?.position) return TriCube.vec3(0, 0, 0);
  return [scene.position.x, scene.position.y, scene.position.z];
}

function toSceneSpace(point) {
  if (!point) return null;
  const off = getSceneOffset();
  const x = point.x != null ? point.x : point[0];
  const y = point.y != null ? point.y : point[1];
  const z = point.z != null ? point.z : point[2];
  return [x - off[0], y - off[1], z - off[2]];
}

function toWorldSpace(point) {
  const off = getSceneOffset();
  return [point[0] + off[0], point[1] + off[1], point[2] + off[2]];
}

function getRaycastHitPoint(ray) {
  if (!ray?.intersects?.[0]?.point) return null;
  return toSceneSpace(ray.intersects[0].point);
}

function markerRadiusAt(scenePoint) {
  if (typeof THREE === 'undefined' || !Preview?.selected?.calculateControlScale) {
    return 0.14;
  }
  const world = new THREE.Vector3(...toWorldSpace(scenePoint));
  return Math.max(0.08, Preview.selected.calculateControlScale(world) / 10);
}

/** Middle of existing geometry in display space (same coords as picks / ghost). */
function getProjectCenterDisplay() {
  if (typeof Outliner === 'undefined' || typeof Cube === 'undefined') {
    return [8, 8, 8];
  }

  const cubes = (Outliner.elements || []).filter((el) => el instanceof Cube);
  if (!cubes.length) {
    return [8, 8, 8];
  }

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let hasVerts = false;

  for (const cube of cubes) {
    if (typeof cube.getGlobalVertexPositions !== 'function') continue;
    for (const v of cube.getGlobalVertexPositions()) {
      hasVerts = true;
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], v[i]);
        max[i] = Math.max(max[i], v[i]);
      }
    }
  }

  if (!hasVerts) return [8, 8, 8];
  return [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
}

function registerSceneSpace(TriCube) {
  TriCube.getSceneOffset = getSceneOffset;
  TriCube.toSceneSpace = toSceneSpace;
  TriCube.toWorldSpace = toWorldSpace;
  TriCube.getRaycastHitPoint = getRaycastHitPoint;
  TriCube.markerRadiusAt = markerRadiusAt;
  TriCube.getProjectCenterDisplay = getProjectCenterDisplay;
}
