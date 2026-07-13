# Tri-Cube & Quad-Cube

Create oriented cubes from picks on existing geometry.

**Author:** Renokas1

## Tri-Cube (3 picks)

1. Open a **Java Block Model** project.
2. Enable **Tools → Tri-Cube Tool**.
3. Click three points on the same face:
   - **Pick 1** — anchor corner
   - **Pick 2** — end of the first edge from the anchor
   - **Pick 3** — anywhere on the same face

## Quad-Cube (4 picks)

1. Enable **Tools → Quad-Cube Tool**.
2. Click four points near the same plane:
   - **Pick 1** — anchor corner on a cube (UV copied from this cube)
   - **Picks 2–4** — anywhere near the face plane (pick 4 projects onto the plane from picks 1–3)

Both tools extrude **1 unit** inward. Width/height come from your picks.

### Snap modifiers (both tools)

| Modifier | Snaps to |
|----------|----------|
| *(none)* | Nearest cube corner |
| **Shift** | Nearest edge midpoint |
| **Ctrl** | Raw face hit (no snap) |

Press **Esc** to cancel — clears locked picks first, then exits the tool on a second press.

## Result

- Width and height match the picked edges; depth is **1 unit**, extruded inward from the picked face.
- The cube is placed in the same outliner group as the first pick.
- If the first pick is on a textured cube, **UV and texture settings are copied** from it.
