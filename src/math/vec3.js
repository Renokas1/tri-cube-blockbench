/**
 * Pure vec3 helpers — no Blockbench / THREE dependency (unit-testable).
 */
function vec3(x = 0, y = 0, z = 0) {
  return [x, y, z];
}

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale(v, s) {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function length(v) {
  return Math.hypot(v[0], v[1], v[2]);
}

function normalize(v) {
  const len = length(v);
  if (len < 1e-8) return null;
  return scale(v, 1 / len);
}

function distance(a, b) {
  return length(sub(a, b));
}

function roundToGrid(value, step = 0.0625) {
  return Math.round(value / step) * step;
}

function roundVec3(v, step = 0.0625) {
  return [roundToGrid(v[0], step), roundToGrid(v[1], step), roundToGrid(v[2], step)];
}

function registerVec3(TriCube) {
  TriCube.vec3 = vec3;
  TriCube.add = add;
  TriCube.sub = sub;
  TriCube.scale = scale;
  TriCube.dot = dot;
  TriCube.cross = cross;
  TriCube.length = length;
  TriCube.normalize = normalize;
  TriCube.distance = distance;
  TriCube.roundToGrid = roundToGrid;
  TriCube.roundVec3 = roundVec3;
}
