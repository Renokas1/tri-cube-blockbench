# Tri-Cube (Blockbench plugin)

**Author:** Renokas1

Create a **rotated cube** from three clicks — anchor corner, then two neighbors on the same face. Built for Minecraft Java Block models with free 3-axis rotation.

## Install

```bash
npm install
npm run build
```

Load in Blockbench:

1. **Remove the old plugin** — Plugins → manage → delete/uninstall anything named **tri_cube** (the old broken copy). Do not use Dev Reload on it.
2. **File → Plugins → Load Plugin From File** → `dist/tri_cube_tool.js` (in this repo after build). Keep `dist/about.md` in the same folder — Blockbench reads it on dev reload.
3. Confirm in the console (F12): green **`[Tri-Cube] v0.4.2 loaded OK`** message.

Optional: `npm run install-plugin` copies the built file to your Blockbench plugins folder.

If you still see `setSelected` errors, Blockbench is running a stale copy — restart Blockbench and repeat step 1.

## Usage

1. Open a **Java Block Model** project.
2. **Tools → Tri-Cube Tool** (toggle on).
3. Click three points:

| Step | Pick |
|------|------|
| 1 | Anchor corner |
| 2 | End of first edge from anchor |
| 3 | Anywhere on the **same face** (projects click onto that face; still snaps to corners when close) |

**Snap modifiers**

| Modifier | Snaps to |
|----------|----------|
| *(none)* | Nearest cube corner |
| Shift | Nearest edge midpoint |
| Ctrl | Raw face hit (no snap) |

Press **Esc** to cancel — clears locked picks first, then exits the tool on a second press. After the third click a cube is created in the same outliner group as the first pick (or root).

The new cube uses the **edge lengths from picks 2 and 3** for width/height and **1 unit** for depth (extruded inward from the picked face). If the first pick was on a cube with textures, **UV and texture settings are copied** from that cube.

## Development

Edit `src/`, then:

```bash
npm run build    # bundle → dist/tri_cube_tool.js
npm test         # math unit tests (no Blockbench needed)
```

Do not hand-edit `dist/tri_cube_tool.js` (generated).

## Architecture

```
src/
  math/vec3.js              — vec3 helpers (testable)
  math/cube_from_points.js  — 3-point cube geometry
  snap/pick_snap.js         — raycast + corner/edge snap
  blockbench/space.js       — placement, rotation, vertex snap
  blockbench/copy_uv.js     — copy UV/texture from first pick
  preview/pick_gizmo.js     — ghost wireframe preview
  tool/tri_cube_tool.js     — 3-click state machine
  entry.js                  — Plugin.register
```

## Docs

- [docs/DESIGN.md](docs/DESIGN.md) — UX, math, and roadmap

## Blockbench API

https://www.blockbench.net/wiki/docs/plugin/
