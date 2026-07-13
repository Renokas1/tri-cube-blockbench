/**
 * Convert a world-space point / rotation into the local space of a parent outliner node.
 */
function getInsertionParent() {
  const selected = Outliner.selected?.[0];
  if (selected && (selected instanceof Group || selected instanceof Bone || selected instanceof Cube)) {
    return selected instanceof Cube ? selected.parent || selected : selected;
  }
  return null;
}

function worldPointToParentLocal(worldPoint, parent) {
  if (!parent?.mesh || typeof THREE === 'undefined') {
    return worldPoint.slice();
  }
  const local = new THREE.Vector3(worldPoint[0], worldPoint[1], worldPoint[2]);
  parent.mesh.worldToLocal(local);
  return [local.x, local.y, local.z];
}

function worldBasisToLocalRotationDegrees(basis, parent) {
  const worldRot = TriCube.basisToRotationDegrees(basis.u, basis.v, basis.w);
  if (!parent?.mesh || typeof THREE === 'undefined') {
    return worldRot;
  }

  const worldMatrix = new THREE.Matrix4();
  worldMatrix.makeBasis(
    new THREE.Vector3(basis.u[0], basis.u[1], basis.u[2]),
    new THREE.Vector3(basis.v[0], basis.v[1], basis.v[2]),
    new THREE.Vector3(basis.w[0], basis.w[1], basis.w[2])
  );

  const parentWorldQuat = new THREE.Quaternion();
  parent.mesh.getWorldQuaternion(parentWorldQuat);
  const parentWorldMatrix = new THREE.Matrix4().makeRotationFromQuaternion(parentWorldQuat);
  const parentInverse = parentWorldMatrix.clone().invert();

  const localMatrix = new THREE.Matrix4().multiplyMatrices(parentInverse, worldMatrix);
  const e = new THREE.Euler();
  e.setFromRotationMatrix(localMatrix, 'ZYX');
  return [
    Math.round(THREE.MathUtils.radToDeg(e.x) * 1000) / 1000,
    Math.round(THREE.MathUtils.radToDeg(e.y) * 1000) / 1000,
    Math.round(THREE.MathUtils.radToDeg(e.z) * 1000) / 1000,
  ];
}

function createCubeFromResult(result, parent) {
  const localOrigin = worldPointToParentLocal(result.origin, parent);
  const localRotation = worldBasisToLocalRotationDegrees(result.basis, parent);

  const cube = new Cube({
    name: 'tri_cube',
    from: result.from.slice(),
    to: result.to.slice(),
    origin: localOrigin,
    rotation: localRotation,
    autouv: 1,
  }).init();

  if (parent && typeof cube.addTo === 'function') {
    cube.addTo(parent);
  } else {
    cube.addTo(undefined);
  }

  cube.select();
  return cube;
}

function registerSpace(TriCube) {
  TriCube.getInsertionParent = getInsertionParent;
  TriCube.worldPointToParentLocal = worldPointToParentLocal;
  TriCube.worldBasisToLocalRotationDegrees = worldBasisToLocalRotationDegrees;
  TriCube.createCubeFromResult = createCubeFromResult;
}
