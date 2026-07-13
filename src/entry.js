/**
 * Tri-Cube — Blockbench plugin entry (bundled into dist/tri_cube_tool.js)
 */
function registerTriCubePlugin(TriCube) {
  let tool = null;

  Plugin.register('tri_cube_tool', {
    title: 'Tri-Cube',
    author: 'renov',
    description: 'Create a perfectly oriented cube from 3 corner picks',
    about:
      'Pick three adjacent corners: anchor, then two neighbors on the same face. Shift = edge snap, Ctrl = face hit. Java Block model format recommended.',
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
      tool = TriCube.registerTriCubeToolUi();
      console.log(
        `%c[Tri-Cube] v${PLUGIN_VERSION} loaded OK`,
        'color:#33ff66;font-weight:bold',
        '— outliner from/to fix (v0.3+)'
      );
    },
    onunload() {
      TriCube.unregisterTriCubeToolUi?.();
      tool = null;
    },
  });
}
