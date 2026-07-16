/**
 * Tri-Fill: one camera-facing face in Java JSON export.
 *
 * Java block codec (BB 5.x) only omits a face when face.texture === null.
 * texture:false still exports as "#missing".
 */
const LOCAL_FACE_NORMALS = {
  east: [1, 0, 0],
  west: [-1, 0, 0],
  up: [0, 1, 0],
  down: [0, -1, 0],
  north: [0, 0, 1],
  south: [0, 0, -1],
};

const PLANE_NORMAL_PARALLEL_EPS = 0.9;

function getCubeSceneObject(cube) {
  return cube?.scene_object || cube?.mesh || null;
}

function getCubeCenterDisplay(cube) {
  const verts = cube.getGlobalVertexPositions?.();
  if (!verts?.length) return [0, 0, 0];
  const sum = verts.reduce((acc, v) => TriCube.add(acc, v), [0, 0, 0]);
  return TriCube.scale(sum, 1 / verts.length);
}

function getCameraDisplayPosition() {
  if (typeof THREE === 'undefined' || !Preview?.selected?.camera) return null;
  const v = new THREE.Vector3();
  Preview.selected.camera.getWorldPosition(v);
  return TriCube.toSceneSpace(v);
}

function getWorldFaceNormal(cube, faceKey) {
  const local = LOCAL_FACE_NORMALS[faceKey];
  const obj = getCubeSceneObject(cube);
  if (!local || !obj || typeof THREE === 'undefined') return null;

  const n = new THREE.Vector3(local[0], local[1], local[2]);
  const q = new THREE.Quaternion();
  obj.getWorldQuaternion(q);
  n.applyQuaternion(q);
  if (n.lengthSq() < 1e-12) return null;
  n.normalize();
  return [n.x, n.y, n.z];
}

function findFaceTowardCamera(cube, planeNormal) {
  if (!cube?.faces || !planeNormal) return null;

  const cam = getCameraDisplayPosition();
  const center = getCubeCenterDisplay(cube);
  const toCam = cam ? TriCube.normalize(TriCube.sub(cam, center)) : null;
  if (!toCam) return null;

  let bestKey = null;
  let bestDot = -Infinity;

  for (const key of TriCube.FACE_KEYS) {
    const n = getWorldFaceNormal(cube, key);
    if (!n) continue;
    if (Math.abs(TriCube.dot(n, planeNormal)) < PLANE_NORMAL_PARALLEL_EPS) continue;

    const toward = TriCube.dot(n, toCam);
    if (toward > bestDot) {
      bestDot = toward;
      bestKey = key;
    }
  }

  return bestKey;
}

function markFaceRemoved(face) {
  if (!face) return;
  face.enabled = false;
  face.texture = null;
  face.cullface = '';
}

function markHiddenFaces(cube, visibleKey) {
  for (const key of TriCube.FACE_KEYS) {
    if (key !== visibleKey) markFaceRemoved(cube.faces[key]);
  }
}

function faceHasExportTexture(face) {
  const t = face?.texture;
  return t != null && t !== false;
}

function countExportableFaces(cube) {
  if (!cube?.faces) return 0;
  return TriCube.FACE_KEYS.filter((key) => faceHasExportTexture(cube.faces[key])).length;
}

function resolveSourceFaceKey(sourceCube, pickFace) {
  if (!sourceCube?.faces) return null;

  if (pickFace && faceHasExportTexture(sourceCube.faces[pickFace])) {
    return pickFace;
  }

  return TriCube.FACE_KEYS.find((key) => faceHasExportTexture(sourceCube.faces[key])) || null;
}

function resolveTextureUuid(face) {
  if (!face) return null;
  const resolved = typeof face.getTexture === 'function' ? face.getTexture() : null;
  if (resolved?.uuid) return resolved.uuid;
  const t = face.texture;
  if (typeof t === 'string') return t;
  if (t?.uuid) return t.uuid;
  return null;
}

function copySourceTextureToVisibleFace(targetCube, sourceCube, visibleKey, pickFace) {
  if (!targetCube?.faces || !sourceCube?.faces || !visibleKey) return false;

  const srcKey = resolveSourceFaceKey(sourceCube, pickFace);
  if (!srcKey) return false;

  const srcFace = sourceCube.faces[srcKey];
  const dstFace = targetCube.faces[visibleKey];
  if (!srcFace || !dstFace) return false;

  const textureUuid = resolveTextureUuid(srcFace);
  if (!textureUuid) return false;

  dstFace.enabled = true;
  dstFace.texture = textureUuid;
  dstFace.cullface = '';
  dstFace.rotation = srcFace.rotation ?? 0;
  if (srcFace.tint !== undefined && srcFace.tint !== null) dstFace.tint = srcFace.tint;
  if (srcFace.uv?.length === 8) dstFace.uv = srcFace.uv.slice();

  return true;
}

function stripToSingleFace(cube, visibleKey) {
  if (!cube?.faces || !visibleKey) return false;

  cube.autouv = 0;
  if (cube.box_uv && typeof cube.setUVMode === 'function') {
    cube.setUVMode(false);
  } else {
    cube.box_uv = false;
  }

  for (const key of TriCube.FACE_KEYS) {
    markFaceRemoved(cube.faces[key]);
  }

  const visible = cube.faces[visibleKey];
  if (!visible) return false;

  visible.enabled = true;
  visible.cullface = '';
  if (!visible.uv || visible.uv.every((n) => n === 0)) {
    visible.uv = [0, 0, 16, 0, 16, 16, 0, 16];
  }

  return true;
}

function syncTriFillGeometry(cube) {
  if (!cube || typeof Canvas === 'undefined') return;

  const mesh = getCubeSceneObject(cube);
  if (typeof Canvas.adaptObjectPosition === 'function') {
    Canvas.adaptObjectPosition(cube, mesh);
  }
  if (typeof Canvas.adaptObjectFaceGeo === 'function') {
    Canvas.adaptObjectFaceGeo(cube);
  }
}

function syncTriFillFaceMaterials(cube) {
  if (!cube) return;

  const mesh = getCubeSceneObject(cube);
  if (typeof Canvas !== 'undefined' && typeof Canvas.adaptObjectFaces === 'function' && mesh) {
    Canvas.adaptObjectFaces(cube, mesh);
  }
  cube.preview_controller?.updateFaces?.(cube);
}

function applyTriFillFace(cube, picks, result) {
  if (!cube?.faces || !result?.basis?.w) return false;

  const visibleKey = findFaceTowardCamera(cube, result.basis.w);
  if (!visibleKey) {
    console.warn('[Tri-Fill] Could not resolve camera-facing face from world normals.');
    return false;
  }

  if (!stripToSingleFace(cube, visibleKey)) return false;

  syncTriFillGeometry(cube);

  const sourceCube = picks?.[0]?.cube;
  let copied = false;
  if (sourceCube instanceof Cube) {
    copied = copySourceTextureToVisibleFace(cube, sourceCube, visibleKey, picks[0].face);
  }

  markHiddenFaces(cube, visibleKey);

  if (copied) {
    syncTriFillFaceMaterials(cube);
    markHiddenFaces(cube, visibleKey);

    if (!faceHasExportTexture(cube.faces[visibleKey]) && sourceCube instanceof Cube) {
      copySourceTextureToVisibleFace(cube, sourceCube, visibleKey, picks[0].face);
      markHiddenFaces(cube, visibleKey);
    }
  }

  const exportable = countExportableFaces(cube);
  if (typeof console !== 'undefined') {
    console.log(`[Tri-Fill] visible=${visibleKey}, exportable=${exportable}, copied=${copied}`);
    if (exportable !== 1) {
      console.warn(`[Tri-Fill] expected 1 exportable face (texture uuid set), got ${exportable}`);
    }
    if (!copied) {
      console.warn('[Tri-Fill] no texture copied — pick 1 must be on a textured cube face');
    }
  }

  return exportable === 1;
}

function createTriangleFillFromResult(result, parent, picks) {
  return TriCube.createCubeFromResult(result, parent, picks, {
    cubeName: 'tri_fill',
    skipAppearanceCopy: true,
    skipSelect: true,
    cubeInit: { autouv: 0, box_uv: false },
  });
}

function registerTriFillUv(TriCube) {
  TriCube.LOCAL_FACE_NORMALS = LOCAL_FACE_NORMALS;
  TriCube.getCameraDisplayPosition = getCameraDisplayPosition;
  TriCube.findFaceTowardCamera = findFaceTowardCamera;
  TriCube.applyTriFillFace = applyTriFillFace;
  TriCube.syncTriFillGeometry = syncTriFillGeometry;
  TriCube.syncTriFillFaceMaterials = syncTriFillFaceMaterials;
  TriCube.createTriangleFillFromResult = createTriangleFillFromResult;
}
