/**
 * Copy texture / UV settings from a reference cube onto a newly created cube.
 */
const FACE_KEYS = ['north', 'south', 'east', 'west', 'up', 'down'];

function cubeHasTexture(cube) {
  if (!cube?.faces) return false;
  for (const key of FACE_KEYS) {
    const face = cube.faces[key];
    if (!face || face.texture === null || face.texture === false) continue;
    if (typeof face.getTexture === 'function' && face.getTexture()) return true;
    if (face.texture) return true;
  }
  return false;
}

function copyCubeAppearance(target, source) {
  if (!target?.faces || !source?.faces) return false;
  if (!cubeHasTexture(source)) return false;

  target.autouv = source.autouv;

  if (source.box_uv !== target.box_uv && typeof target.setUVMode === 'function') {
    target.setUVMode(!!source.box_uv);
  } else {
    target.box_uv = !!source.box_uv;
  }

  target.mirror_uv = !!source.mirror_uv;
  if (source.uv_offset && target.uv_offset) {
    target.uv_offset[0] = source.uv_offset[0];
    target.uv_offset[1] = source.uv_offset[1];
  }

  for (const key of FACE_KEYS) {
    const srcFace = source.faces[key];
    const dstFace = target.faces[key];
    if (!srcFace || !dstFace) continue;

    const copied =
      typeof srcFace.getUndoCopy === 'function' ? srcFace.getUndoCopy() : srcFace;
    const patch = {
      texture: copied.texture,
      rotation: copied.rotation,
      tint: copied.tint,
      cullface: copied.cullface,
      enabled: copied.enabled,
      material_name: copied.material_name,
    };
    if (copied.uv) patch.uv = copied.uv.slice();
    dstFace.extend(patch);
  }

  if (target.box_uv) {
    target.mirror_uv = !!source.mirror_uv;
    target.uv_offset[0] = source.uv_offset[0];
    target.uv_offset[1] = source.uv_offset[1];
  } else if ((target.autouv === 1 || target.autouv === 2) && typeof target.mapAutoUV === 'function') {
    target.mapAutoUV();
  }

  target.preview_controller.updateFaces(target);
  target.preview_controller.updateUV(target);
  return true;
}

function registerCopyUv(TriCube) {
  TriCube.FACE_KEYS = FACE_KEYS;
  TriCube.cubeHasTexture = cubeHasTexture;
  TriCube.copyCubeAppearance = copyCubeAppearance;
}
