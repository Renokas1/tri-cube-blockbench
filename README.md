# Tri-Cube (Blockbench plugin)

**Author:** Renokas1

Create a **rotated cube** from three or four clicks on existing geometry. Built for Minecraft Java Block models with free 3-axis rotation.

- **Tri-Cube** — 3 picks on one face (anchor + 2 edges)
- **Quad-Cube** — 4 picks near a plane; best-fit rectangular face, 1-unit depth

## Install

```bash
npm install
npm run build
```

Load in Blockbench:

1. **Remove the old plugin** — Plugins → manage → delete/uninstall anything named **tri_cube** (the old broken copy). Do not use Dev Reload on it.
2. **File → Plugins → Load Plugin From File** → `dist/tri_cube_tool.js` (in this repo after build). Keep `dist/about.md` in the same folder — Blockbench reads it on dev reload.
3. Confirm in the console (F12): green **`[Tri-Cube] v0.5.0 loaded OK`** message.

Optional: `npm run install-plugin` copies the built file to your Blockbench plugins folder.

If you still see `setSelected` errors, Blockbench is running a stale copy — restart Blockbench and repeat step 1.

## Usage

### Tri-Cube (3 picks)

1. Open a **Java Block Model** project.
2. **Tools → Tri-Cube Tool** (toggle on).
3. Click three points:

| Step | Pick |
|------|------|
| 1 | Anchor corner |
| 2 | End of first edge from anchor |
| 3 | Anywhere on the **same face** (projects click onto that face; still snaps to corners when close) |

### Quad-Cube (4 picks)

1. **Tools → Quad-Cube Tool** (toggle on).
2. Click four points:

| Step | Pick |
|------|------|
| 1 | Anchor corner **on a cube** (UV/texture copied from this cube) |
| 2–3 | Anywhere near the target face plane |
| 4 | Anywhere on the plane (auto-projected onto the plane from picks 1–3) |

**Snap modifiers** (both tools)

| Modifier | Snaps to |
|----------|----------|
| *(none)* | Nearest cube corner |
| Shift | Nearest edge midpoint |
| Ctrl | Raw face hit (no snap) |

Press **Esc** to cancel — clears locked picks first, then exits the tool on a second press.

Both tools create a box with **pick-based width/height** and **1 unit** depth (extruded inward). Tri-Cube and Quad-Cube copy **UV/texture** from the first pick when it is on a textured cube.

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
  math/vec3.js                  — vec3 helpers (testable)
  math/cube_from_points.js      — 3-point cube geometry
  math/cube_from_four_points.js — 4-point plane fit + best rectangle
  snap/pick_snap.js         — raycast + corner/edge snap
  blockbench/space.js       — placement, rotation, vertex snap
  blockbench/copy_uv.js     — copy UV/texture from first pick
  preview/pick_gizmo.js     — ghost wireframe preview
  tool/tri_cube_tool.js     — 3-click state machine
  tool/quad_cube_tool.js    — 4-click state machine
  entry.js                  — Plugin.register
```

## Docs

- [docs/DESIGN.md](docs/DESIGN.md) — UX, math, and roadmap

## Blockbench API

https://www.blockbench.net/wiki/docs/plugin/
