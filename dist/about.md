# Tri-Cube Tools

Oriented boxes and triangle UV fills for Java block models.

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

## Tri-Fill (3 picks)

1. Enable **Tools → Tri-Fill Tool**.
2. Click **three corners of a triangular hole**:
   - **Pick 1** — on a cube (texture/UV sampled from this face)
   - **Picks 2–3** — the other triangle corners (same plane)

Creates a **zero-depth coplanar face** with **only the camera-facing side enabled**. Texture from pick 1 is copied to that face for now; shared triangle-fill PNGs are planned next.

### Snap modifiers (all tools)

| Modifier | Snaps to |
|----------|----------|
| *(none)* | Nearest cube corner |
| **Shift** | Nearest edge midpoint |
| **Ctrl** | Raw face hit (no snap) |

Press **Esc** to cancel — clears locked picks first, then exits the tool on a second press.

## Result

- **Tri-Cube / Quad-Cube:** box with pick-based width/height, 1-unit depth, inward extrusion.
- **Tri-Fill:** zero-depth patch, single camera-facing face enabled, texture from pick 1 (triangle atlas TBD).
- First pick group / UV copy matches the first pick’s cube when applicable.
