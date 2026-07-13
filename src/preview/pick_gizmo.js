/**
 * Viewport gizmo: hover sphere, committed pick markers, edge lines, ghost cube.
 */
function registerPickGizmo(TriCube) {
  const COLORS = {
    hover: 0x44aaff,
    pick: [0x33ff66, 0xffcc33, 0xff6633, 0xaa44ff],
    line: 0xffffff,
    ghost: 0x66ff99,
    candidate: 0x4488ff,
  };

  let root = null;
  let hoverMesh = null;
  let candidateGroup = null;
  let pickMeshes = [];
  let lineGroup = null;
  let ghostGroup = null;

  function ensureRoot() {
    if (root || typeof THREE === 'undefined' || typeof Canvas === 'undefined') return root;
    root = new THREE.Group();
    root.name = 'tri_cube_gizmo';
    Canvas.scene.add(root);
    if (Array.isArray(Canvas.gizmos)) Canvas.gizmos.push(root);
    return root;
  }

  function makeSphere(color, opacity = 0.95, radius = 0.14) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 14, 14),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthTest: false,
      })
    );
    mesh.renderOrder = 1000;
    return mesh;
  }

  function setMeshPosition(mesh, point, radius) {
    mesh.position.set(point[0], point[1], point[2]);
    if (radius != null && mesh.geometry?.parameters?.radius !== radius) {
      mesh.geometry.dispose();
      mesh.geometry = new THREE.SphereGeometry(radius, 14, 14);
    }
  }

  function clearGroup(group) {
    if (!group) return;
    while (group.children.length) {
      const child = group.children[0];
      group.remove(child);
      child.geometry?.dispose?.();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose?.());
        else child.material.dispose?.();
      }
    }
  }

  function refreshPreview() {
    if (Preview?.selected?.render) Preview.selected.render();
    else if (Canvas?.updateView) Canvas.updateView({});
  }

  function showCandidateMarkers(corners) {
    ensureRoot();
    if (!root) return;
    if (!candidateGroup) {
      candidateGroup = new THREE.Group();
      candidateGroup.name = 'tri_cube_candidates';
      root.add(candidateGroup);
    }
    clearGroup(candidateGroup);
    for (const c of corners.slice(0, 32)) {
      const r = TriCube.markerRadiusAt(c) * 0.75;
      const m = makeSphere(COLORS.candidate, 0.45, r);
      setMeshPosition(m, c, r);
      candidateGroup.add(m);
    }
    refreshPreview();
  }

  function clearCandidateMarkers() {
    if (candidateGroup) clearGroup(candidateGroup);
  }

  function setHoverPoint(point, mode) {
    ensureRoot();
    if (!root) return;
    if (!point) {
      if (hoverMesh) hoverMesh.visible = false;
      refreshPreview();
      return;
    }
    if (!hoverMesh) {
      hoverMesh = makeSphere(COLORS.hover, 0.65);
      root.add(hoverMesh);
    }
    hoverMesh.visible = true;
    const color =
      mode === TriCube.SNAP.EDGE ? 0xffaa44 : mode === TriCube.SNAP.FACE ? 0xff4444 : COLORS.hover;
    hoverMesh.material.color.setHex(color);
    const r = TriCube.markerRadiusAt(point);
    setMeshPosition(hoverMesh, point, r);
    refreshPreview();
  }

  function setCommittedPicks(picks) {
    ensureRoot();
    if (!root) return;

    for (const mesh of pickMeshes) {
      root.remove(mesh);
      mesh.geometry?.dispose?.();
      mesh.material?.dispose?.();
    }
    pickMeshes = [];

    picks.forEach((pick, i) => {
      const point = pick.point || pick;
      const r = TriCube.markerRadiusAt(point);
      const mesh = makeSphere(COLORS.pick[i] ?? COLORS.pick[2], 1, r);
      setMeshPosition(mesh, point, r);
      root.add(mesh);
      pickMeshes.push(mesh);
    });

    if (!lineGroup) {
      lineGroup = new THREE.Group();
      lineGroup.name = 'tri_cube_lines';
      root.add(lineGroup);
    }
    clearGroup(lineGroup);

    const points = picks.map((p) => p.point || p);
    if (points.length >= 4) {
      addLine(lineGroup, points[0], points[1], COLORS.line);
      addLine(lineGroup, points[1], points[2], COLORS.line);
      addLine(lineGroup, points[2], points[3], COLORS.line);
      addLine(lineGroup, points[3], points[0], COLORS.ghost);
    } else if (points.length >= 2) {
      addLine(lineGroup, points[0], points[1], COLORS.line);
    }
    if (points.length === 3) {
      addLine(lineGroup, points[0], points[2], COLORS.line);
      addLine(lineGroup, points[1], points[2], COLORS.ghost);
    }

    refreshPreview();
  }

  function addLine(group, a, b, color) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(a[0], a[1], a[2]),
      new THREE.Vector3(b[0], b[1], b[2]),
    ]);
    const line = new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, depthTest: false })
    );
    line.renderOrder = 999;
    group.add(line);
  }

  function setGhostCube(corners) {
    ensureRoot();
    if (!root) return;
    if (!ghostGroup) {
      ghostGroup = new THREE.Group();
      ghostGroup.name = 'tri_cube_ghost';
      root.add(ghostGroup);
    }
    clearGroup(ghostGroup);
    if (!corners || corners.length !== 8) {
      refreshPreview();
      return;
    }

    const edgePairs = [
      [0, 1],
      [0, 2],
      [0, 4],
      [1, 3],
      [1, 5],
      [2, 3],
      [2, 6],
      [3, 7],
      [4, 5],
      [4, 6],
      [5, 7],
      [6, 7],
    ];
    for (const [a, b] of edgePairs) {
      addLine(ghostGroup, corners[a], corners[b], COLORS.ghost);
    }
    refreshPreview();
  }

  function setGhostTrianglePreview(triangle) {
    ensureRoot();
    if (!root) return;
    if (!ghostGroup) {
      ghostGroup = new THREE.Group();
      ghostGroup.name = 'tri_cube_ghost';
      root.add(ghostGroup);
    }
    clearGroup(ghostGroup);
    if (!triangle || triangle.length !== 3) {
      refreshPreview();
      return;
    }
    addLine(ghostGroup, triangle[0], triangle[1], COLORS.ghost);
    addLine(ghostGroup, triangle[1], triangle[2], COLORS.ghost);
    addLine(ghostGroup, triangle[2], triangle[0], COLORS.ghost);
    refreshPreview();
  }

  function clearAll() {
    setHoverPoint(null);
    clearCandidateMarkers();
    setCommittedPicks([]);
    setGhostCube(null);
  }

  function dispose() {
    clearAll();
    if (root) {
      Canvas.scene.remove(root);
      if (Array.isArray(Canvas.gizmos)) {
        const idx = Canvas.gizmos.indexOf(root);
        if (idx !== -1) Canvas.gizmos.splice(idx, 1);
      }
      root = null;
      hoverMesh = null;
      candidateGroup = null;
      lineGroup = null;
      ghostGroup = null;
      pickMeshes = [];
    }
    refreshPreview();
  }

  TriCube.showCandidateMarkers = showCandidateMarkers;
  TriCube.clearCandidateMarkers = clearCandidateMarkers;
  TriCube.setHoverPickPoint = setHoverPoint;
  TriCube.setCommittedPickMarkers = setCommittedPicks;
  TriCube.setGhostCubePreview = setGhostCube;
  TriCube.setGhostTrianglePreview = setGhostTrianglePreview;
  TriCube.clearPickGizmo = clearAll;
  TriCube.disposePickGizmo = dispose;
}
