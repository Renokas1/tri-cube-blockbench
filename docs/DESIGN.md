# Tri-Cube — design sketch

**Status:** v0.1 scaffold — core math + 3-click tool wired; ghost preview and edge snap refinement TBD.

## Problem

Minecraft Java block models support rotation on all axes, but Blockbench has no quick workflow for placing a **cube at an arbitrary angle** to fill a gap defined by existing geometry. Vertex snap helps move elements but does not **create** oriented cubes from spatial references.

## Solution

A dedicated **3-click tool**:

1. **Anchor** — one corner of the new cube.
2. **Edge A** — defines first edge vector **u** and side length `s = |u|`.
3. **Edge B** — defines second edge on the same face; projected onto the plane ⊥ **u** to get **v**.

Third axis: **w** = **u** × **v**. All eight corners follow from `anchor + i·u + j·v + k·w` with `i,j,k ∈ {0,1}`.

### Validation

| Check | Default tolerance |
|-------|-------------------|
| **u** and **v** perpendicular | dot(û, v̂) ≤ 0.08 |
| Equal edge length | \|v\| within 25% of \|u\| |
| Minimum size | 1/16 block unit |

Invalid picks show a status message and reset the click counter.

## Snap modes

| Mode | Trigger | Use case |
|------|---------|----------|
| Corner | default | Align to existing cube corners |
| Edge midpoint | Shift | Center on an edge |
| Face hit | Ctrl | Free point on a face (advanced) |

Raycast via `Canvas.raycast(event)`; corners from `cube.getGlobalVertexPositions()`.

## Blockbench cube mapping

New cube in parent outliner space:

- `from: [0,0,0]`, `to: [s,s,s]`
- `origin` = anchor converted with `parent.mesh.worldToLocal`
- `rotation` = basis (**u**, **v**, **w**) converted to parent-local Euler (ZYX, via THREE)

Insertion parent: first selected Group / Bone / Cube’s parent, else project root.

## Out of scope (v0.1)

- Ghost cube preview between clicks 2 and 3
- Opposite-corner two-click mode
- Best-fit cube when picks are slightly off
- Bedrock format (rotation limits differ)

## Roadmap

| Version | Feature |
|---------|---------|
| v0.1 | 3-click tool, corner snap, math tests |
| v0.2 | Ghost preview + pick markers |
| v0.3 | Tolerance slider / best-fit mode |
| v0.4 | Store submission to blockbench-plugins repo |

## References

- [Blockbench plugin docs](https://www.blockbench.net/wiki/docs/plugin/)
- [RaycastResult](https://web.blockbench.net/docs/types/custom_preview.RaycastResult.html)
- [Cube.getGlobalVertexPositions](https://web.blockbench.net/docs/classes/custom_cube.Cube.html)
