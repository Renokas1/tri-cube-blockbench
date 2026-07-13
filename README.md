# Tri-Cube Tools (Blockbench plugin)

**Author:** Renokas1

Create **oriented boxes** and **triangle UV fills** from clicks on existing geometry. Built for Minecraft Java Block models.

- **Tri-Cube** — 3 picks on one face (anchor + 2 edges)
- **Quad-Cube** — 4 picks near a plane; best-fit rectangular face, 1-unit depth
- **Tri-Fill** — 3 triangle corners; zero-depth camera-facing face (triangle texture atlas planned)

## Install

```bash
npm install
npm run build
```

Load in Blockbench:

1. **Remove the old plugin** — Plugins → manage → delete/uninstall anything named **tri_cube** (the old broken copy). Do not use Dev Reload on it.
2. **File → Plugins → Load Plugin From File** → `dist/tri_cube_tool.js` (in this repo after build). Keep `dist/about.md` in the same folder — Blockbench reads it on dev reload.
3. Confirm in the console (F12): green **`[Tri-Cube] v0.6.1 loaded OK`** message.

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

### Tri-Fill (3 picks)

1. **Tools → Tri-Fill Tool** (toggle on).
2. Click three **triangle corners**:

| Step | Pick |
|------|------|
| 1 | On a cube corner or face (**texture source**) |
| 2–3 | The other two corners of the triangle (same plane) |

Creates a **zero-depth** coplanar patch with **only the camera-facing face** enabled. Pick 1’s texture is copied to that face for now; shared triangle-fill PNGs are the next step.

**Snap modifiers** (all tools)

| Modifier | Snaps to |
|----------|----------|
| *(none)* | Nearest cube corner |
| Shift | Nearest edge midpoint |
| Ctrl | Raw face hit (no snap) |

Press **Esc** to cancel — clears locked picks first, then exits the tool on a second press.

**Tri-Cube / Quad-Cube** create a box with pick-based width/height and **1 unit** depth (extruded inward). **Tri-Fill** uses **zero depth** and keeps only the face toward your current view.

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
  math/triangle_from_points.js  — triangle fill geometry (zero depth)
  snap/pick_snap.js             — raycast + corner/edge snap
  blockbench/space.js           — placement, rotation, vertex snap
  blockbench/copy_uv.js         — copy UV/texture from first pick
  blockbench/tri_fill_uv.js     — camera-facing single face setup
  preview/pick_gizmo.js         — ghost wireframe preview
  tool/tri_cube_tool.js         — 3-click box tool
  tool/quad_cube_tool.js        — 4-click box tool
  tool/tri_fill_tool.js         — 3-click triangle fill tool
  entry.js                  — Plugin.register
```

## Docs

- [docs/DESIGN.md](docs/DESIGN.md) — UX, math, and roadmap

## Blockbench API

https://www.blockbench.net/wiki/docs/plugin/
