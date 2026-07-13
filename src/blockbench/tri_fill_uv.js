/**
 * Tri-Fill: zero-depth cube, one camera-facing face (triangle texture atlas TBD).
 */
const FACE_VERTEX_INDICES = {
  north: [1, 0, 3, 2],
  south: [5, 4, 7, 6],
  east: [0, 4, 6, 2],
  west: [1, 5, 7, 3],
  up: [2, 3, 7, 6],
  down: [4, 0, 1, 5],
};

function getFaceWorldCorners(cube, faceKey) {
  const indices = FACE_VERTEX_INDICES[faceKey];
  if (!indices || typeof cube.getGlobalVertexPositions !== 'function') return null;
  const verts = cube.getGlobalVertexPositions();
  return indices.map((i) => verts[i]?.slice?.() ?? verts[i]);
}

function getFaceWorldNormal(cube, faceKey) {
  const corners = getFaceWorldCorners(cube, faceKey);
  if (!corners || corners.length < 4) return null;
  const e1 = TriCube.sub(corners[1], corners[0]);
  const e2 = TriCube.sub(corners[3], corners[0]);
  return TriCube.normalize(TriCube.cross(e1, e2));
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

function findFaceKeyTowardCamera(cube) {
  const cam = getCameraDisplayPosition();
  if (!cam) return null;

  const center = getCubeCenterDisplay(cube);
  const toCam = TriCube.normalize(TriCube.sub(cam, center));
  if (!toCam) return null;

  let bestKey = null;
  let bestDot = -Infinity;
  for (const key of TriCube.FACE_KEYS) {
    const n = getFaceWorldNormal(cube, key);
    if (!n) continue;
    const d = TriCube.dot(n, toCam);
    if (d > bestDot) {
      bestDot = d;
      bestKey = key;
    }
  }
  return bestKey;
}

function copySourceTextureToVisibleFace(targetCube, sourceCube, visibleKey, pickFace) {
  if (!targetCube?.faces || !sourceCube?.faces || !visibleKey) return;

  const srcKey =
    (pickFace && sourceCube.faces[pickFace]?.texture !== false && sourceCube.faces[pickFace]?.texture !== null
      ? pickFace
      : null) ||
    TriCube.FACE_KEYS.find((key) => {
      const face = sourceCube.faces[key];
      return face && face.texture !== false && face.texture !== null;
    });

  if (!srcKey) return;

  const srcFace = sourceCube.faces[srcKey];
  const dstFace = targetCube.faces[visibleKey];
  if (!srcFace || !dstFace) return;

  dstFace.texture = srcFace.texture;
  dstFace.rotation = srcFace.rotation;
  dstFace.tint = srcFace.tint;
  if (srcFace.uv) dstFace.uv = srcFace.uv.slice();
}

function applyTriFillFace(cube, picks) {
  if (!cube?.faces) return false;

  const visibleKey = findFaceKeyTowardCamera(cube);
  if (!visibleKey) return false;

  cube.autouv = 0;
  if (cube.box_uv && typeof cube.setUVMode === 'function') {
    cube.setUVMode(false);
  } else {
    cube.box_uv = false;
  }

  for (const key of TriCube.FACE_KEYS) {
    const face = cube.faces[key];
    if (!face) continue;
    if (key === visibleKey) {
      face.enabled = true;
      face.texture = face.texture ?? null;
      if (!face.uv || face.uv.every((n) => n === 0)) {
        face.uv = [0, 0, 16, 0, 16, 16, 0, 16];
      }
    } else {
      face.enabled = false;
      face.texture = false;
    }
  }

  const sourceCube = picks?.[0]?.cube;
  if (sourceCube instanceof Cube) {
    copySourceTextureToVisibleFace(cube, sourceCube, visibleKey, picks[0].face);
  }

  cube.preview_controller.updateFaces(cube);
  cube.preview_controller.updateUV(cube);
  return true;
}

function createTriangleFillFromResult(result, parent, picks) {
  const cube = TriCube.createCubeFromResult(result, parent, picks, {
    cubeName: 'tri_fill',
    skipAppearanceCopy: true,
  });

  if (!applyTriFillFace(cube, picks)) {
    for (const key of TriCube.FACE_KEYS) {
      if (cube.faces[key]) cube.faces[key].enabled = false;
    }
    cube.preview_controller.updateFaces(cube);
  }

  return cube;
}

function registerTriFillUv(TriCube) {
  TriCube.FACE_VERTEX_INDICES = FACE_VERTEX_INDICES;
  TriCube.getCameraDisplayPosition = getCameraDisplayPosition;
  TriCube.findFaceKeyTowardCamera = findFaceKeyTowardCamera;
  TriCube.applyTriFillFace = applyTriFillFace;
  TriCube.createTriangleFillFromResult = createTriangleFillFromResult;
}
