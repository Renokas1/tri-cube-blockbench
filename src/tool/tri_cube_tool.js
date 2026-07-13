/**
 * Three-click tool state machine + canvas interaction.
 */
function registerTriCubeTool(TriCube) {
  const state = {
    picks: [],
    hoverPick: null,
    snapMode: TriCube.SNAP.CORNER,
  };

  let tool = null;

  function status(text) {
    if (typeof Blockbench !== 'undefined' && Blockbench.setStatusBarText) {
      Blockbench.setStatusBarText(text);
      return;
    }
    console.log(`[Tri-Cube] ${text}`);
  }

  function pickContext() {
    return {
      pickIndex: state.picks.length,
      priorPicks: state.picks,
    };
  }

  function resolvePick(ray) {
    const event = ray?.event;
    state.snapMode = TriCube.snapModeFromEvent(event);
    return TriCube.pickWorldPointFromRaycast(ray, state.snapMode, pickContext());
  }

  function resetPicks() {
    state.picks = [];
    state.hoverPick = null;
    TriCube.clearPickGizmo?.();
    updateToolLabel();
    updateCandidatePreview();
  }

  function updateToolLabel() {
    if (!tool) return;
    const n = state.picks.length;
    tool.setName(n === 0 ? 'Tri-Cube Tool' : `Tri-Cube Tool (${n}/3)`);
  }

  function updateCandidatePreview() {
    const candidates = TriCube.getPickCandidates(state.picks.length, state.picks);
    if (state.picks.length > 0 && candidates.corners.length) {
      TriCube.showCandidateMarkers?.(candidates.corners);
    } else {
      TriCube.clearCandidateMarkers?.();
    }
  }

  function cubeComputeOptions(extra = {}) {
    return {
      biasCenter: TriCube.getProjectCenterDisplay?.(),
      ...extra,
    };
  }

  function updateGhostPreview(hoverPick) {
    if (state.picks.length === 2 && hoverPick?.point) {
      const trial = TriCube.computeCubeFromThreePoints(
        state.picks[0].point,
        state.picks[1].point,
        hoverPick.point,
        cubeComputeOptions({ roundOutput: false })
      );
      TriCube.setGhostCubePreview?.(trial.valid ? trial.corners : null);
      return;
    }
    TriCube.setGhostCubePreview?.(null);
  }

  function syncGizmo() {
    TriCube.setCommittedPickMarkers?.(state.picks);
    updateCandidatePreview();
    updateGhostPreview(state.hoverPick);
  }

  function exitToDefaultTool() {
    const fallback = BarItems['translate'] || BarItems['move_tool'] || BarItems['resize'];
    if (fallback?.select) fallback.select();
  }

  function onCanvasHover(ray) {
    if (!ray) {
      state.hoverPick = null;
      TriCube.setHoverPickPoint?.(null);
      TriCube.setGhostCubePreview?.(null);
      return;
    }

    const pick = resolvePick(ray);
    if (!pick) {
      state.hoverPick = null;
      TriCube.setHoverPickPoint?.(null);
      TriCube.setGhostCubePreview?.(null);
      return;
    }

    state.hoverPick = pick;
    TriCube.setHoverPickPoint?.(pick.point, pick.mode);
    updateGhostPreview(pick);

    const snapLabel =
      pick.mode === TriCube.SNAP.EDGE ? 'edge' : pick.mode === TriCube.SNAP.FACE ? 'face' : 'corner';
    status(`Tri-Cube (${state.picks.length}/3): ${pick.hint || 'Pick a point'} — ${snapLabel} snap`);
  }

  function onCanvasClick(ray) {
    if (!ray) {
      status('Tri-Cube: click a cube face or corner');
      return;
    }

    const pick = resolvePick(ray);
    if (!pick) {
      status('Tri-Cube: could not resolve a snap point');
      return;
    }

    state.picks.push(pick);
    state.hoverPick = pick;
    updateToolLabel();
    syncGizmo();

    const snapLabel =
      pick.mode === TriCube.SNAP.EDGE ? 'edge' : pick.mode === TriCube.SNAP.FACE ? 'face' : 'corner';
    status(`Tri-Cube: locked pick ${state.picks.length}/3 (${snapLabel})`);

    if (state.picks.length < 3) return;

    finishFromPicks();
  }

  function notifyError(message) {
    status(message);
    if (typeof Blockbench !== 'undefined' && Blockbench.showQuickMessage) {
      Blockbench.showQuickMessage(message, 2500);
    }
  }

  function finishFromPicks() {
    const p0d = state.picks[0].point;
    const p1d = state.picks[1].point;
    const p2d = state.picks[2].point;

    const computed = TriCube.computeCubeFromThreePoints(
      p0d,
      p1d,
      p2d,
      cubeComputeOptions({ roundOutput: false })
    );

    if (!computed.valid) {
      notifyError(`Tri-Cube: ${computed.error}`);
      resetPicks();
      return;
    }

    const parent = TriCube.getInsertionParent(state.picks);
    Undo.initEdit({ elements: [], outliner: true, selection: true });

    const cube = TriCube.createCubeFromResult(computed, parent, state.picks);

    Canvas.updateView({
      elements: [cube],
      element_aspects: { geometry: true, transform: true },
      selection: true,
    });

    Undo.finishEdit('Create cube from 3 points');
    status(`Tri-Cube: created ${TriCube.formatSizeLabel(computed.sizes)} box`);
    resetPicks();
  }

  function onKeydown(event) {
    if (!tool || Tool.selected !== tool) return;
    if (event.key === 'Escape') {
      if (state.picks.length > 0) {
        resetPicks();
        status('Tri-Cube: picks cleared');
      } else {
        exitToDefaultTool();
      }
      event.preventDefault();
    }
  }

  TriCube._toolState = state;
  TriCube.resetTriCubePicks = resetPicks;

  TriCube.registerTriCubeToolUi = function registerTriCubeToolUi() {
    tool = new Tool('tri_cube_tool', {
      name: 'Tri-Cube Tool',
      description:
        'Create a cube from 3 picks: anchor corner, edge neighbor, then face neighbor. Corners snap aggressively; Shift = edge, Ctrl = free face.',
      icon: 'crop_square',
      category: 'tools',
      cursor: 'crosshair',
      selectElements: false,
      transformerMode: 'hidden',
      raycast_options: { vertices: true, edges: true },
      onSelect() {
        resetPicks();
        status('Tri-Cube: pick anchor corner — blue dot follows cursor, green/yellow/orange lock each pick');
      },
      onUnselect() {
        resetPicks();
        TriCube.disposePickGizmo?.();
        status('');
      },
      onCanvasMouseMove(ray) {
        onCanvasHover(ray);
      },
      onCanvasClick(ray) {
        onCanvasClick(ray);
      },
    });
    MenuBar.menus.tools.addAction(tool);

    Blockbench.on('keydown', onKeydown);

    return tool;
  };

  TriCube.unregisterTriCubeToolUi = function unregisterTriCubeToolUi() {
    try {
      Blockbench.removeListener('keydown', onKeydown);
    } catch (_) {}
    TriCube.disposePickGizmo?.();
    if (tool) {
      try {
        if (Tool.selected === tool) exitToDefaultTool();
      } catch (_) {}
      try {
        tool.delete();
      } catch (_) {}
      tool = null;
    }
  };
}
