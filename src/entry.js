/**
 * Tri-Cube, Quad-Cube & Tri-Fill — Blockbench plugin entry (bundled into dist/tri_cube_tool.js)
 */
function registerTriCubePlugin(TriCube) {
  Plugin.register('tri_cube_tool', {
    title: 'Tri-Cube Tools',
    author: 'Renokas1',
    description: 'Oriented boxes and triangle UV fills from point picks on Java block models',
    about:
      'Tri-Cube: 3 picks on one face. Quad-Cube: 4 picks on a plane. Tri-Fill: 3 triangle corners, zero-depth camera-facing face (triangle texture atlas coming). Shift = edge, Ctrl = face. Java Block models recommended.',
    icon: 'crop_square',
    version: PLUGIN_VERSION,
    variant: 'desktop',
    min_version: '4.10.0',
    tags: ['Minecraft: Java Edition'],
    onload() {
      if (typeof Tool !== 'function') {
        console.error('[Tri-Cube] Blockbench Tool API missing — update Blockbench or reload the correct plugin file.');
        return;
      }
      TriCube.registerTriCubeToolUi();
      TriCube.registerQuadCubeToolUi();
      TriCube.registerTriFillToolUi();
      console.log(
        `%c[Tri-Cube] v${PLUGIN_VERSION} loaded OK`,
        'color:#33ff66;font-weight:bold',
        '— Tri-Cube, Quad-Cube, Tri-Fill'
      );
    },
    onunload() {
      TriCube.unregisterTriCubeToolUi?.();
      TriCube.unregisterQuadCubeToolUi?.();
      TriCube.unregisterTriFillToolUi?.();
      TriCube.disposePickGizmo?.();
    },
  });
}
