/**
 * Tri-Cube — Blockbench plugin entry (bundled into dist/tri_cube.js)
 */
function registerTriCubePlugin(TriCube) {
  let action = null;

  Plugin.register('tri_cube', {
    title: 'Tri-Cube',
    author: 'renov',
    description: 'Create a perfectly oriented cube from 3 corner picks',
    about:
      'Pick three adjacent corners of an imaginary cube: anchor corner, then the two neighbors on the same face. The plugin snaps to cube corners by default (Shift = edge midpoint, Ctrl = raw face hit). Requires Java Block model format for free rotation.',
    icon: 'crop_square',
    version: PLUGIN_VERSION,
    variant: 'desktop',
    min_version: '4.10.0',
    tags: ['Minecraft: Java Edition'],
    onload() {
      action = TriCube.registerTriCubeToolUi();
      console.log(`[Tri-Cube] loaded v${PLUGIN_VERSION} — Tool API (expect no setSelected in stack traces)`);
    },
    onunload() {
      TriCube.unregisterTriCubeToolUi?.();
      action = null;
    },
  });
}
