/**
 * Tri-Cube & Quad-Cube — Blockbench plugin entry (bundled into dist/tri_cube_tool.js)
 */
function registerTriCubePlugin(TriCube) {
  Plugin.register('tri_cube_tool', {
    title: 'Tri-Cube & Quad-Cube',
    author: 'Renokas1',
    description: 'Create oriented cubes from 3 or 4 picks on existing geometry',
    about:
      'Tri-Cube: 3 picks (anchor + two edges on one face). Quad-Cube: 4 picks anywhere on a plane — best-fit face, 1-unit depth. Shift = edge snap, Ctrl = face hit. Java Block model format recommended.',
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
      console.log(
        `%c[Tri-Cube] v${PLUGIN_VERSION} loaded OK`,
        'color:#33ff66;font-weight:bold',
        '— Tri-Cube + Quad-Cube tools'
      );
    },
    onunload() {
      TriCube.unregisterTriCubeToolUi?.();
      TriCube.unregisterQuadCubeToolUi?.();
      TriCube.disposePickGizmo?.();
    },
  });
}
