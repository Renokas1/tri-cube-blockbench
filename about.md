# Tri-Cube

Create a perfectly oriented cube from **three corner picks** on existing geometry.

**Author:** Renokas1

## Usage

1. Open a **Java Block Model** project.
2. Enable **Tools → Tri-Cube Tool**.
3. Click three points on the same face:
   - **Pick 1** — anchor corner
   - **Pick 2** — end of the first edge from the anchor
   - **Pick 3** — anywhere on the same face

### Snap modifiers

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
