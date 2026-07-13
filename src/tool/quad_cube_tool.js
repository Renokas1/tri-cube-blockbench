/**
 * Four-click tool — fit a plane, best-match rectangular face, extrude 1 unit.
 */
function registerQuadCubeTool(TriCube) {
  const PICK_COUNT = 4;
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
    console.log(`[Quad-Cube] ${text}`);
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
    return TriCube.pickWorldPointFromRaycastQuad(ray, state.snapMode, pickContext());
  }

  function resetPicks() {
    state.picks = [];
    state.hoverPick = null;
    TriCube.clearPickGizmo?.();
    updateToolLabel();
  }

  function updateToolLabel() {
    if (!tool) return;
    const n = state.picks.length;
    tool.setName(n === 0 ? 'Quad-Cube Tool' : `Quad-Cube Tool (${n}/${PICK_COUNT})`);
  }

  function cubeComputeOptions(extra = {}) {
    return {
      biasCenter: TriCube.getProjectCenterDisplay?.(),
      ...extra,
    };
  }

  function updateGhostPreview(hoverPick) {
    if (state.picks.length === 3 && hoverPick?.point) {
      const trial = TriCube.computeCubeFromFourPoints(
        state.picks[0].point,
        state.picks[1].point,
        state.picks[2].point,
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
    status(`Quad-Cube (${state.picks.length}/${PICK_COUNT}): ${pick.hint || 'Pick a point'} — ${snapLabel} snap`);
  }

  function onCanvasClick(ray) {
    if (!ray) {
      status('Quad-Cube: click a cube face or corner');
      return;
    }

    const pick = resolvePick(ray);
    if (!pick) {
      status('Quad-Cube: first pick must be on a cube corner');
      return;
    }

    state.picks.push(pick);
    state.hoverPick = pick;
    updateToolLabel();
    syncGizmo();

    const snapLabel =
      pick.mode === TriCube.SNAP.EDGE ? 'edge' : pick.mode === TriCube.SNAP.FACE ? 'face' : 'corner';
    status(`Quad-Cube: locked pick ${state.picks.length}/${PICK_COUNT} (${snapLabel})`);

    if (state.picks.length < PICK_COUNT) return;

    finishFromPicks();
  }

  function notifyError(message) {
    status(message);
    if (typeof Blockbench !== 'undefined' && Blockbench.showQuickMessage) {
      Blockbench.showQuickMessage(message, 2500);
    }
  }

  function finishFromPicks() {
    const computed = TriCube.computeCubeFromFourPoints(
      state.picks[0].point,
      state.picks[1].point,
      state.picks[2].point,
      state.picks[3].point,
      cubeComputeOptions({ roundOutput: false })
    );

    if (!computed.valid) {
      notifyError(`Quad-Cube: ${computed.error}`);
      resetPicks();
      return;
    }

    const parent = TriCube.getInsertionParent(state.picks);
    Undo.initEdit({ elements: [], outliner: true, selection: true });

    const cube = TriCube.createCubeFromResult(computed, parent, state.picks, {
      cubeName: 'quad_cube',
    });

    Canvas.updateView({
      elements: [cube],
      element_aspects: { geometry: true, transform: true, faces: true },
      selection: true,
    });

    Undo.finishEdit('Create cube from 4 plane points');
    const fitNote =
      computed.fitError != null && computed.fitError > 0.05
        ? ` (fit error ${computed.fitError.toFixed(2)})`
        : '';
    status(`Quad-Cube: created ${TriCube.formatSizeLabel(computed.sizes)} box${fitNote}`);
    resetPicks();
  }

  function onPressKey(data) {
    if (!tool) return;
    const selected = (typeof Toolbox !== 'undefined' && Toolbox.selected) || Tool.selected;
    if (selected !== tool) return;

    const event = data?.event;
    if (!event || (event.code !== 'Escape' && event.key !== 'Escape')) return;
    if (data.input_in_focus) return;

    if (state.picks.length > 0) {
      resetPicks();
      status('Quad-Cube: picks cleared');
    } else {
      exitToDefaultTool();
    }

    data.capture?.();
    event.preventDefault?.();
    event.stopPropagation?.();
  }

  TriCube._quadToolState = state;
  TriCube.resetQuadCubePicks = resetPicks;

  TriCube.registerQuadCubeToolUi = function registerQuadCubeToolUi() {
    tool = new Tool('quad_cube_tool', {
      name: 'Quad-Cube Tool',
      description:
        'Create a cube from 4 picks on a plane — best-fit face, 1-unit depth. First pick on a cube corner (for UV). Shift = edge, Ctrl = face hit.',
      icon: 'view_in_ar',
      category: 'tools',
      cursor: 'crosshair',
      selectElements: false,
      transformerMode: 'hidden',
      raycast_options: { vertices: true, edges: true },
      onSelect() {
        resetPicks();
        status('Quad-Cube: pick anchor corner on a cube — then 3 more points on the same plane');
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

    Blockbench.on('press_key', onPressKey);

    return tool;
  };

  TriCube.unregisterQuadCubeToolUi = function unregisterQuadCubeToolUi() {
    try {
      Blockbench.removeListener('press_key', onPressKey);
    } catch (_) {}
    if (tool) {
      try {
        const selected = (typeof Toolbox !== 'undefined' && Toolbox.selected) || Tool.selected;
        if (selected === tool) exitToDefaultTool();
      } catch (_) {}
      try {
        tool.delete();
      } catch (_) {}
      tool = null;
    }
  };
}
