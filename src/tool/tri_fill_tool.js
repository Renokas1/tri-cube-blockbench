/**
 * Three-click triangle fill — zero-depth, camera-facing face (triangle atlas TBD).
 */
function registerTriFillTool(TriCube) {
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
    console.log(`[Tri-Fill] ${text}`);
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
    const pick = TriCube.pickWorldPointFromRaycastTriFill(ray, state.snapMode, pickContext());
    if (pick && ray?.face && !pick.face) pick.face = ray.face;
    return pick;
  }

  function resetPicks() {
    state.picks = [];
    state.hoverPick = null;
    TriCube.clearPickGizmo?.();
    TriCube.clearCandidateMarkers?.();
    updateToolLabel();
  }

  function updateToolLabel() {
    if (!tool) return;
    const n = state.picks.length;
    tool.setName(n === 0 ? 'Tri-Fill Tool' : `Tri-Fill Tool (${n}/3)`);
  }

  function cubeComputeOptions(extra = {}) {
    return {
      biasCenter: TriCube.getProjectCenterDisplay?.(),
      fillDepth: TriCube.DEFAULT_FILL_DEPTH,
      ...extra,
    };
  }

  function updateGhostPreview(hoverPick) {
    if (state.picks.length === 2 && hoverPick?.point) {
      const trial = TriCube.computeTriangleFillFromThreePoints(
        state.picks[0].point,
        state.picks[1].point,
        hoverPick.point,
        cubeComputeOptions({ roundOutput: false })
      );
      TriCube.setGhostTrianglePreview?.(trial.valid ? trial.triangle : null);
      return;
    }
    TriCube.setGhostTrianglePreview?.(null);
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
      TriCube.setGhostTrianglePreview?.(null);
      return;
    }

    const pick = resolvePick(ray);
    if (!pick) {
      state.hoverPick = null;
      TriCube.setHoverPickPoint?.(null);
      TriCube.setGhostTrianglePreview?.(null);
      return;
    }

    state.hoverPick = pick;
    TriCube.setHoverPickPoint?.(pick.point, pick.mode);
    updateGhostPreview(pick);

    const snapLabel =
      pick.mode === TriCube.SNAP.EDGE ? 'edge' : pick.mode === TriCube.SNAP.FACE ? 'face' : 'corner';
    status(`Tri-Fill (${state.picks.length}/3): ${pick.hint || 'Pick triangle corner'} — ${snapLabel} snap`);
  }

  function onCanvasClick(ray) {
    if (!ray) {
      status('Tri-Fill: click a cube face or corner');
      return;
    }

    const pick = resolvePick(ray);
    if (!pick) {
      status('Tri-Fill: first pick must be on a cube (for texture color later)');
      return;
    }

    if (state.picks.length === 0 && !pick.cube) {
      status('Tri-Fill: first pick must be on a cube corner or face');
      return;
    }

    state.picks.push(pick);
    state.hoverPick = pick;
    updateToolLabel();
    syncGizmo();

    const snapLabel =
      pick.mode === TriCube.SNAP.EDGE ? 'edge' : pick.mode === TriCube.SNAP.FACE ? 'face' : 'corner';
    status(`Tri-Fill: locked pick ${state.picks.length}/3 (${snapLabel})`);

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
    const computed = TriCube.computeTriangleFillFromThreePoints(
      state.picks[0].point,
      state.picks[1].point,
      state.picks[2].point,
      cubeComputeOptions({ roundOutput: false })
    );

    if (!computed.valid) {
      notifyError(`Tri-Fill: ${computed.error}`);
      resetPicks();
      return;
    }

    const parent = TriCube.getInsertionParent(state.picks);
    Undo.initEdit({ elements: [], outliner: true, selection: true });

    const cube = TriCube.createTriangleFillFromResult(computed, parent, state.picks);

    Canvas.updateView({
      elements: [cube],
      element_aspects: { geometry: true, transform: true, faces: true },
      selection: true,
    });

    Undo.finishEdit('Create triangle fill from 3 points');
    status(`Tri-Fill: created ${TriCube.formatSizeLabel(computed.sizes)} patch (camera-facing face)`);
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
      status('Tri-Fill: picks cleared');
    } else {
      exitToDefaultTool();
    }

    data.capture?.();
    event.preventDefault?.();
    event.stopPropagation?.();
  }

  TriCube.registerTriFillToolUi = function registerTriFillToolUi() {
    tool = new Tool('tri_fill_tool', {
      name: 'Tri-Fill Tool',
      description:
        'Fill a triangular hole with a zero-depth coplanar face toward the camera. 3 picks = triangle corners. Shift = edge, Ctrl = face.',
      icon: 'change_history',
      category: 'tools',
      cursor: 'crosshair',
      selectElements: false,
      transformerMode: 'hidden',
      raycast_options: { vertices: true, edges: true },
      onSelect() {
        resetPicks();
        status('Tri-Fill: pick 3 triangle corners — first pick on a cube');
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

  TriCube.unregisterTriFillToolUi = function unregisterTriFillToolUi() {
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
