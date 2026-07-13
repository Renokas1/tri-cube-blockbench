# Tri-Cube (Blockbench plugin)

Create a **rotated cube** from three clicks — anchor corner, then two neighbors on the same face. Built for Minecraft Java Block models with free 3-axis rotation.

## Install

```bash
npm install
npm run build
```

Load in Blockbench:

1. **Remove** any existing Tri-Cube plugin first (Plugins → manage → delete/uninstall).
   Dev reload will **not** work if an old copy is still loaded — its broken `onunload` blocks the update.
2. Build and install:

```bash
npm run build
npm run install-plugin
```

   Or **File → Plugins → Load Plugin From File** → `dist/tri_cube.js` (full path below).
3. Reload plugins: `Ctrl/Cmd + J`

Verify in the dev console: `[Tri-Cube] loaded v0.1.1 — Tool API`

Plugin file path:

`C:\Users\renov\Documents\Master plugin chef\tri-cube-blockbench\dist\tri_cube.js`

## Usage

1. Open a **Java Block Model** project.
2. **Tools → Tri-Cube Tool** (toggle on).
3. Click three points:

| Step | Pick |
|------|------|
| 1 | Anchor corner |
| 2 | End of first edge from anchor |
| 3 | End of second edge on the **same face** |

**Snap modifiers**

| Modifier | Snaps to |
|----------|----------|
| *(none)* | Nearest cube corner |
| Shift | Nearest edge midpoint |
| Ctrl | Raw face hit (no snap) |

Press **Esc** to cancel the tool. After the third click a cube is created in the current outliner group (or root).

## Development

Edit `src/`, then:

```bash
npm run build    # bundle → dist/tri_cube.js
npm test         # math unit tests (no Blockbench needed)
```

Do not hand-edit `dist/tri_cube.js` (generated).

## Architecture

```
src/
  math/vec3.js              — vec3 helpers (testable)
  math/cube_from_points.js  — 3-point cube geometry
  snap/pick_snap.js         — raycast + corner/edge snap
  blockbench/space.js       — parent-local origin & rotation
  tool/tri_cube_tool.js     — 3-click state machine
  entry.js                  — Plugin.register
```

## Docs

- [docs/DESIGN.md](docs/DESIGN.md) — UX, math, and roadmap

## Blockbench API

https://www.blockbench.net/wiki/docs/plugin/
