import { SpaceColonization2D, DrawnShape } from './algorithm.js';

// --- State Configuration ---
const state = {
  activeTool: 'rect', // 'select' | 'rect' | 'circle' | 'point' | 'erase' | 'root'
  selectedShapeId: null,

  // Default parameters for new shapes
  defaultShapeCount: 150,
  defaultHollow: false,

  // Growth & Morphology
  influenceRadius: 65,
  killRadius: 12,
  segmentLength: 8,
  tropismY: -0.25,
  rectilinearSnap: 0.0,
  curvilinearSmoothness: 0.5,
  closedVenation: false,
  loopRate: 0.5,

  // Visuals
  colorRoot: '#0ea5e9',
  colorTip: '#f43f5e',
  showThickness: true,
  thickScale: 1.2,
  showAttractors: true,
  isRunning: false,
};

// --- Algorithm Instance ---
const sc = new SpaceColonization2D({
  influenceRadius: state.influenceRadius,
  killRadius: state.killRadius,
  segmentLength: state.segmentLength,
  tropismY: state.tropismY,
  rectilinearSnap: state.rectilinearSnap,
  curvilinearSmoothness: state.curvilinearSmoothness,
  closedVenation: state.closedVenation,
  loopRate: state.loopRate,
});

// --- Canvas & Viewport Setup ---
const canvas = document.getElementById('canvas2d');
const ctx = canvas.getContext('2d');
const dimBadge = document.getElementById('draw-dim-badge');

let view = {
  panX: Math.max(window.innerWidth * 0.5, (window.innerWidth - 380) * 0.5 + 380),
  panY: window.innerHeight * 0.82,
  zoom: 1.0,
};

function screenToWorld(sx, sy) {
  return {
    x: (sx - view.panX) / view.zoom,
    y: (sy - view.panY) / view.zoom,
  };
}

function worldToScreen(wx, wy) {
  return {
    x: wx * view.zoom + view.panX,
    y: wy * view.zoom + view.panY,
  };
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  render();
}
window.addEventListener('resize', resizeCanvas);

// Default initial setup: root placed at center base
sc.setRoot(0, 0);

// Default initial canopy rectangle for instant exploration
const initialCanopy = new DrawnShape({
  type: 'rect',
  name: 'Canopy #1',
  x1: -160,
  y1: -320,
  x2: 160,
  y2: -180,
  count: 220,
  hollow: false,
});
sc.addShape(initialCanopy);
state.selectedShapeId = initialCanopy.id;

// --- UI Element References ---
const ui = {
  toolSelect: document.getElementById('tool-select'),
  toolRect: document.getElementById('tool-rect'),
  toolCircle: document.getElementById('tool-circle'),
  toolPoint: document.getElementById('tool-point'),
  toolErase: document.getElementById('tool-erase'),
  toolRoot: document.getElementById('tool-root'),

  // Selected Shape Editor
  sectionSelectedShape: document.getElementById('section-selected-shape'),
  labelSelectedShape: document.getElementById('label-selected-shape'),
  inputSelectedCount: document.getElementById('input-selected-count'),
  valSelectedCount: document.getElementById('val-selected-count'),
  toggleSelectedHollow: document.getElementById('toggle-selected-hollow'),
  btnDeleteShape: document.getElementById('btn-delete-shape'),
  btnDeselectShape: document.getElementById('btn-deselect-shape'),

  btnClearAttractors: document.getElementById('btn-clear-attractors'),
  btnSingleRoot: document.getElementById('btn-single-root'),

  btnPlay: document.getElementById('btn-play'),
  btnStep: document.getElementById('btn-step'),
  btnResetAll: document.getElementById('btn-reset-all'),
  btnUndo: document.getElementById('btn-undo'),
  btnRedo: document.getElementById('btn-redo'),
  btnExportSvg: document.getElementById('btn-export-svg'),
  btnExportDxf: document.getElementById('btn-export-dxf'),
  btnExportObj: document.getElementById('btn-export-obj'),

  inputRectilinear: document.getElementById('input-rectilinear'),
  valRectilinear: document.getElementById('val-rectilinear'),
  inputSmoothness: document.getElementById('input-smoothness'),
  valSmoothness: document.getElementById('val-smoothness'),
  toggleClosedVenation: document.getElementById('toggle-closed-venation'),
  inputLoopRate: document.getElementById('input-loop-rate'),
  valLoopRate: document.getElementById('val-loop-rate'),

  inputInfluence: document.getElementById('input-influence'),
  valInfluence: document.getElementById('val-influence'),
  inputKill: document.getElementById('input-kill'),
  valKill: document.getElementById('val-kill'),
  inputSegment: document.getElementById('input-segment'),
  valSegment: document.getElementById('val-segment'),
  inputTropism: document.getElementById('input-tropism'),
  valTropism: document.getElementById('val-tropism'),

  inputColorRoot: document.getElementById('input-color-root'),
  inputColorTip: document.getElementById('input-color-tip'),
  toggleThickness: document.getElementById('toggle-thickness'),
  groupThick: document.getElementById('group-thick'),
  inputThick: document.getElementById('input-thick'),
  valThick: document.getElementById('val-thick'),
  toggleAttractors: document.getElementById('toggle-attractors'),

  statNodes: document.getElementById('stat-nodes'),
  statAttractors: document.getElementById('stat-attractors'),
  statIterations: document.getElementById('stat-iterations'),
  statStatus: document.getElementById('stat-status'),
};

// --- Shape Selection Management ---
function getSelectedShape() {
  if (state.selectedShapeId === null) return null;
  return sc.shapes.find((s) => s.id === state.selectedShapeId) || null;
}

function selectShape(shapeId) {
  state.selectedShapeId = shapeId;
  const shape = getSelectedShape();

  if (shape) {
    ui.sectionSelectedShape.style.opacity = '1';
    ui.sectionSelectedShape.style.pointerEvents = 'auto';
    ui.labelSelectedShape.textContent = `${shape.name} [Active]`;
    ui.inputSelectedCount.value = shape.count;
    ui.valSelectedCount.textContent = shape.count;
    ui.toggleSelectedHollow.checked = shape.hollow;
  } else {
    ui.sectionSelectedShape.style.opacity = '0.45';
    ui.labelSelectedShape.textContent = 'Selected Shape: None';
  }
  render();
}

// Live Parametric Recalculation
function triggerLiveUpdate() {
  if (sc.nodes.length > sc.roots.length) {
    sc.runToCompletion(220);
  }
  render();
  updateStats();
}

// --- Undo & Redo History System ---
function serializeState() {
  return {
    shapes: sc.shapes.map((s) => ({
      id: s.id,
      type: s.type,
      name: s.name,
      x1: s.x1,
      y1: s.y1,
      x2: s.x2,
      y2: s.y2,
      cx: s.cx,
      cy: s.cy,
      radius: s.radius,
      count: s.count,
      hollow: s.hollow,
      attractors: (s.attractors || []).map((a) => ({ x: a.x, y: a.y, id: a.id })),
    })),
    roots: sc.roots.map((r) => ({ id: r.id, x: r.x, y: r.y })),
    manualPoints: sc.manualPoints.map((p) => ({ id: p.id, x: p.x, y: p.y })),
    selectedShapeId: state.selectedShapeId,
    showThickness: state.showThickness,
  };
}

function restoreState(snapshot) {
  if (!snapshot) return;
  sc.shapes = snapshot.shapes.map((sd) => {
    const s = new DrawnShape({
      type: sd.type,
      name: sd.name,
      x1: sd.x1,
      y1: sd.y1,
      x2: sd.x2,
      y2: sd.y2,
      cx: sd.cx,
      cy: sd.cy,
      radius: sd.radius,
      count: sd.count,
      hollow: sd.hollow,
    });
    s.id = sd.id;
    s.attractors = (sd.attractors || []).map((a) => ({ x: a.x, y: a.y, id: a.id }));
    return s;
  });

  sc.roots = snapshot.roots.map((r) => ({ id: r.id, x: r.x, y: r.y }));
  sc.manualPoints = snapshot.manualPoints.map((p) => ({ id: p.id, x: p.x, y: p.y }));
  if (snapshot.showThickness !== undefined) {
    state.showThickness = snapshot.showThickness;
    if (ui.toggleThickness) ui.toggleThickness.checked = state.showThickness;
    if (ui.groupThick) {
      ui.groupThick.style.opacity = state.showThickness ? '1' : '0.45';
      ui.groupThick.style.pointerEvents = state.showThickness ? 'auto' : 'none';
    }
  }
  sc.rebuildAttractors();
  selectShape(snapshot.selectedShapeId);
  sc.resetTree();
  triggerLiveUpdate();
}

const history = {
  undoStack: [],
  redoStack: [],
  isApplying: false,

  push() {
    if (this.isApplying) return;
    this.undoStack.push(serializeState());
    if (this.undoStack.length > 40) this.undoStack.shift();
    this.redoStack = [];
    this.updateButtons();
  },

  undo() {
    if (this.undoStack.length === 0) return;
    this.isApplying = true;
    this.redoStack.push(serializeState());
    const prev = this.undoStack.pop();
    restoreState(prev);
    this.isApplying = false;
    this.updateButtons();
  },

  redo() {
    if (this.redoStack.length === 0) return;
    this.isApplying = true;
    this.undoStack.push(serializeState());
    const next = this.redoStack.pop();
    restoreState(next);
    this.isApplying = false;
    this.updateButtons();
  },

  updateButtons() {
    if (ui.btnUndo) ui.btnUndo.disabled = this.undoStack.length === 0;
    if (ui.btnRedo) ui.btnRedo.disabled = this.redoStack.length === 0;
  },
};

// --- Active Drag / Interaction State ---
let isInteracting = false;
let isPanning = false;
let dragAction = null; // null | { type: 'move-shape'|'resize-shape'|'move-root', ... }
let dragStart = { sx: 0, sy: 0, wx: 0, wy: 0 };
let currentMouse = { sx: 0, sy: 0, wx: 0, wy: 0 };

// --- Color Helpers ---
function hexToRgb(hex) {
  const bigint = parseInt(hex.slice(1), 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function lerpColor(c1, c2, t) {
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r},${g},${b})`;
}

// --- Main 2D Render Routine ---
function render() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  // 1. Pure Black Background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);

  // 2. Architectural Coordinate Grid
  drawArchitecturalGrid(w, h);

  // 3. Ground Level Datum
  const groundScreenY = worldToScreen(0, 0).y;
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.moveTo(0, groundScreenY);
  ctx.lineTo(w, groundScreenY);
  ctx.stroke();
  ctx.setLineDash([]);

  // 4. Draw All Shapes (Boundaries, Handles & Selection Highlights)
  for (const shape of sc.shapes) {
    const isSelected = shape.id === state.selectedShapeId;
    ctx.save();

    if (shape.type === 'rect') {
      const sp1 = worldToScreen(shape.x1, shape.y1);
      const sp2 = worldToScreen(shape.x2, shape.y2);
      const minX = Math.min(sp1.x, sp2.x);
      const minY = Math.min(sp1.y, sp2.y);
      const rw = Math.abs(sp2.x - sp1.x);
      const rh = Math.abs(sp2.y - sp1.y);

      // Subtle fill
      ctx.fillStyle = isSelected ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.03)';
      ctx.fillRect(minX, minY, rw, rh);

      // Border outline
      ctx.strokeStyle = isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.setLineDash(isSelected ? [6, 4] : [3, 3]);
      ctx.strokeRect(minX, minY, rw, rh);

      // Tag label
      if (isSelected) {
        ctx.fillStyle = '#38bdf8';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(`${shape.name} (${shape.count} pts) [Drag inside to move]`, minX + 4, minY - 8);

        // Draw 4 Corner Resize Handles
        drawHandle(minX, minY);
        drawHandle(minX + rw, minY);
        drawHandle(minX, minY + rh);
        drawHandle(minX + rw, minY + rh);
      }
    } else if (shape.type === 'circle') {
      const center = worldToScreen(shape.cx, shape.cy);
      const rScreen = shape.radius * view.zoom;

      ctx.fillStyle = isSelected ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.03)';
      ctx.beginPath();
      ctx.arc(center.x, center.y, rScreen, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.setLineDash(isSelected ? [6, 4] : [3, 3]);
      ctx.stroke();

      if (isSelected) {
        ctx.fillStyle = '#38bdf8';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(`${shape.name} (${shape.count} pts) [Drag center to move]`, center.x - rScreen, center.y - rScreen - 8);

        // Draw Radial Resize Handles
        drawHandle(center.x + rScreen, center.y);
        drawHandle(center.x, center.y - rScreen);
      }
    }
    ctx.restore();
  }

  // 5. Draw Attractor Points
  if (state.showAttractors && sc.attractors.length > 0) {
    for (let i = 0; i < sc.attractors.length; i++) {
      const attr = sc.attractors[i];
      const sp = worldToScreen(attr.x, attr.y);
      const isSelected = attr.shapeId && attr.shapeId === state.selectedShapeId;

      ctx.beginPath();
      ctx.fillStyle = isSelected ? '#38bdf8' : 'rgba(56, 189, 248, 0.65)';
      ctx.arc(sp.x, sp.y, (isSelected ? 2.8 : 2.0) * Math.max(0.7, view.zoom), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 6. Draw Colonization Branches (Color Gradient & Murray's Law Tapering)
  if (sc.nodes.length > sc.roots.length) {
    let maxDepth = 1;
    for (let i = 0; i < sc.nodes.length; i++) {
      if (sc.nodes[i].depth > maxDepth) maxDepth = sc.nodes[i].depth;
    }

    const rgbRoot = hexToRgb(state.colorRoot);
    const rgbTip = hexToRgb(state.colorTip);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < sc.nodes.length; i++) {
      const node = sc.nodes[i];
      if (!node.parent) continue;

      const p1 = worldToScreen(node.parent.x, node.parent.y);
      const p2 = worldToScreen(node.x, node.y);

      const t = node.depth / maxDepth;
      ctx.strokeStyle = lerpColor(rgbRoot, rgbTip, t);
      ctx.lineWidth = state.showThickness
        ? Math.max(1.2, node.thickness * state.thickScale * view.zoom)
        : 1.0;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // 6b. Draw Closed Venation Anastomosis Loops
    if (sc.closedVenation && sc.anastomosisEdges.length > 0) {
      for (const edge of sc.anastomosisEdges) {
        const p1 = worldToScreen(edge.nodeA.x, edge.nodeA.y);
        const p2 = worldToScreen(edge.nodeB.x, edge.nodeB.y);
        const t = (edge.nodeA.depth + edge.nodeB.depth) / (2 * maxDepth);

        ctx.strokeStyle = lerpColor(rgbRoot, rgbTip, t);
        ctx.lineWidth = state.showThickness
          ? Math.max(1.0, Math.min(edge.nodeA.thickness, edge.nodeB.thickness) * state.thickScale * 0.75 * view.zoom)
          : 1.0;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
  }

  // 7. Draw All Root Points (Interactive Multi-Roots)
  for (let idx = 0; idx < sc.roots.length; idx++) {
    const root = sc.roots[idx];
    const sp = worldToScreen(root.x, root.y);

    // Pulse ring
    ctx.beginPath();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.2;
    ctx.arc(sp.x, sp.y, 10, 0, Math.PI * 2);
    ctx.stroke();

    // Solid core
    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.arc(sp.x, sp.y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Crosshairs
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
    ctx.lineWidth = 1;
    ctx.moveTo(sp.x - 14, sp.y);
    ctx.lineTo(sp.x + 14, sp.y);
    ctx.moveTo(sp.x, sp.y - 14);
    ctx.lineTo(sp.x + 14, sp.y);
    ctx.stroke();

    // Root label
    ctx.fillStyle = '#38bdf8';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(`Root #${root.id}`, sp.x + 14, sp.y + 4);
  }

  // 8. Active Drawing Drag Preview
  if (isInteracting && !isPanning && !dragAction && (state.activeTool === 'rect' || state.activeTool === 'circle')) {
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);

    if (state.activeTool === 'rect') {
      const minX = Math.min(dragStart.sx, currentMouse.sx);
      const minY = Math.min(dragStart.sy, currentMouse.sy);
      const rw = Math.abs(currentMouse.sx - dragStart.sx);
      const rh = Math.abs(currentMouse.sy - dragStart.sy);

      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.fillRect(minX, minY, rw, rh);
      ctx.strokeRect(minX, minY, rw, rh);
    } else if (state.activeTool === 'circle') {
      const radiusScreen = Math.hypot(currentMouse.sx - dragStart.sx, currentMouse.sy - dragStart.sy);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.beginPath();
      ctx.arc(dragStart.sx, dragStart.sy, radiusScreen, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawHandle(sx, sy) {
  const size = 8;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 2;
  ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
  ctx.strokeRect(sx - size / 2, sy - size / 2, size, size);
}

function drawArchitecturalGrid(w, h) {
  const gridSizeWorld = 40;
  const gridSizeScreen = gridSizeWorld * view.zoom;
  if (gridSizeScreen < 10) return;

  const startX = view.panX % gridSizeScreen;
  const startY = view.panY % gridSizeScreen;

  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;

  for (let x = startX; x < w; x += gridSizeScreen) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = startY; y < h; y += gridSizeScreen) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  // Primary origin axes (X = 0, Y = 0)
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.moveTo(view.panX, 0);
  ctx.lineTo(view.panX, h);
  ctx.moveTo(0, view.panY);
  ctx.lineTo(w, view.panY);
  ctx.stroke();
}

// --- Stats HUD ---
function updateStats() {
  ui.statNodes.textContent = sc.nodes.length.toLocaleString();
  ui.statAttractors.textContent = sc.attractors.length.toLocaleString();
  ui.statIterations.textContent = sc.iterations;

  if (sc.isFinished) {
    ui.statStatus.textContent = 'Completed';
    ui.statStatus.style.color = 'var(--accent-emerald)';
  } else if (state.isRunning) {
    ui.statStatus.textContent = 'Colonizing';
    ui.statStatus.style.color = 'var(--accent-cyan)';
  } else {
    ui.statStatus.textContent = 'Ready';
    ui.statStatus.style.color = 'var(--accent-amber)';
  }
}

// --- Simulation Step & Cycle ---
function doStep() {
  if (sc.isFinished) return false;
  const active = sc.step();
  render();
  updateStats();
  if (!active && state.isRunning) {
    toggleRunning(false);
  }
  return active;
}

function toggleRunning(forced) {
  state.isRunning = forced !== undefined ? forced : !state.isRunning;
  if (state.isRunning) {
    ui.btnPlay.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
      Pause
    `;
    ui.btnPlay.classList.add('btn-accent');
    ui.btnPlay.classList.remove('btn-primary');
  } else {
    ui.btnPlay.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      Play
    `;
    ui.btnPlay.classList.add('btn-primary');
    ui.btnPlay.classList.remove('btn-accent');
  }
  updateStats();
}

// --- Mouse & Touch Canvas Interaction ---
canvas.addEventListener('pointerdown', (e) => {
  // Middle click or Space key triggers panning
  if (e.button === 1 || e.shiftKey || e.altKey) {
    isPanning = true;
    dragStart = { sx: e.clientX, sy: e.clientY };
    return;
  }

  try { canvas.setPointerCapture(e.pointerId); } catch {}

  const wPt = screenToWorld(e.clientX, e.clientY);
  isInteracting = true;
  dragStart = {
    sx: e.clientX,
    sy: e.clientY,
    wx: wPt.x,
    wy: wPt.y,
  };
  currentMouse = { ...dragStart };
  dragAction = null;

  // 1. Check if user clicked to erase
  if (state.activeTool === 'erase') {
    // A. Check root (if >1 roots)
    const hitRoot = sc.getRootNear(wPt.x, wPt.y, 16);
    if (hitRoot && sc.roots.length > 1) {
      history.push();
      sc.removeRoot(hitRoot.id);
      triggerLiveUpdate();
      return;
    }
    // B. Check attractor point
    const removedPt = sc.removeAttractorNear(wPt.x, wPt.y, 14);
    if (removedPt) {
      history.push();
      triggerLiveUpdate();
      return;
    }
    // C. Check shape
    const hitShape = sc.shapes.find((s) => s.containsPoint(wPt.x, wPt.y));
    if (hitShape) {
      history.push();
      sc.removeShape(hitShape.id);
      if (state.selectedShapeId === hitShape.id) selectShape(null);
      triggerLiveUpdate();
      return;
    }
    return;
  }

  // 2. Check if user clicked a Root Point to move it!
  const hitRoot = sc.getRootNear(wPt.x, wPt.y, 16);
  if (hitRoot && (state.activeTool === 'select' || state.activeTool === 'root')) {
    history.push();
    dragAction = {
      type: 'move-root',
      rootId: hitRoot.id,
    };
    return;
  }

  // 3. If in Select mode: check for resize handles or shape body
  if (state.activeTool === 'select') {
    const activeShape = getSelectedShape();
    if (activeShape) {
      const handle = activeShape.getHandleNear(wPt.x, wPt.y, 12 / view.zoom);
      if (handle) {
        history.push();
        dragAction = {
          type: 'resize-shape',
          shape: activeShape,
          handle,
        };
        return;
      }
    }

    // Check if clicked inside any shape to select and move it
    const clickedShape = sc.shapes.find((s) => s.containsPoint(wPt.x, wPt.y));
    if (clickedShape) {
      history.push();
      selectShape(clickedShape.id);
      dragAction = {
        type: 'move-shape',
        shape: clickedShape,
        lastWx: wPt.x,
        lastWy: wPt.y,
      };
      return;
    } else {
      selectShape(null);
    }
    return;
  }

  // 4. Click to place Point or add Root
  if (state.activeTool === 'point') {
    history.push();
    sc.addPointAttractor(dragStart.wx, dragStart.wy);
    triggerLiveUpdate();
  } else if (state.activeTool === 'root') {
    history.push();
    sc.addRoot(dragStart.wx, dragStart.wy);
    triggerLiveUpdate();
  }
});

window.addEventListener('pointermove', (e) => {
  if (isPanning) {
    const dx = e.clientX - dragStart.sx;
    const dy = e.clientY - dragStart.sy;
    view.panX += dx;
    view.panY += dy;
    dragStart.sx = e.clientX;
    dragStart.sy = e.clientY;
    render();
    return;
  }

  const wCoords = screenToWorld(e.clientX, e.clientY);

  // Dynamic Cursor Feedback when hovering
  if (!isInteracting) {
    updateHoverCursor(wCoords);
    return;
  }

  currentMouse.sx = e.clientX;
  currentMouse.sy = e.clientY;
  currentMouse.wx = wCoords.x;
  currentMouse.wy = wCoords.y;

  // A. Moving a Root Point
  if (dragAction && dragAction.type === 'move-root') {
    sc.moveRoot(dragAction.rootId, wCoords.x, wCoords.y);
    triggerLiveUpdate();
    return;
  }

  // B. Moving a Shape
  if (dragAction && dragAction.type === 'move-shape') {
    const dx = wCoords.x - dragAction.lastWx;
    const dy = wCoords.y - dragAction.lastWy;
    dragAction.shape.move(dx, dy);
    dragAction.lastWx = wCoords.x;
    dragAction.lastWy = wCoords.y;
    sc.rebuildAttractors();
    triggerLiveUpdate();
    return;
  }

  // C. Resizing a Shape
  if (dragAction && dragAction.type === 'resize-shape') {
    dragAction.shape.resize(dragAction.handle, wCoords.x, wCoords.y);
    sc.rebuildAttractors();
    triggerLiveUpdate();
    return;
  }

  // D. Drawing a new shape: update floating dimension badge
  if (state.activeTool === 'rect' || state.activeTool === 'circle') {
    dimBadge.style.display = 'block';
    dimBadge.style.left = `${e.clientX + 14}px`;
    dimBadge.style.top = `${e.clientY + 14}px`;

    const count = state.defaultShapeCount;
    if (state.activeTool === 'rect') {
      const w = Math.round(Math.abs(currentMouse.wx - dragStart.wx));
      const h = Math.round(Math.abs(currentMouse.wy - dragStart.wy));
      dimBadge.textContent = `${w} x ${h}px • ${count} pts`;
    } else {
      const r = Math.round(Math.hypot(currentMouse.wx - dragStart.wx, currentMouse.wy - dragStart.wy));
      dimBadge.textContent = `Radius ${r}px • ${count} pts`;
    }
  }

  render();
});

window.addEventListener('pointerup', (e) => {
  if (isPanning) {
    isPanning = false;
    return;
  }

  if (!isInteracting) return;
  isInteracting = false;
  dimBadge.style.display = 'none';

  try { canvas.releasePointerCapture(e.pointerId); } catch {}

  // If we were dragging a handle, shape, or root, finish action
  if (dragAction) {
    dragAction = null;
    triggerLiveUpdate();
    return;
  }

  const wCoords = screenToWorld(e.clientX, e.clientY);
  const dragDist = Math.hypot(e.clientX - dragStart.sx, e.clientY - dragStart.sy);

  if (state.activeTool === 'select') return;

  if (state.activeTool === 'rect') {
    let x1 = dragStart.wx, y1 = dragStart.wy;
    let x2 = wCoords.x, y2 = wCoords.y;

    if (dragDist <= 6) {
      x1 = dragStart.wx - 60;
      y1 = dragStart.wy - 40;
      x2 = dragStart.wx + 60;
      y2 = dragStart.wy + 40;
    }

    history.push();
    const newShape = new DrawnShape({
      type: 'rect',
      x1, y1, x2, y2,
      count: state.defaultShapeCount,
      hollow: state.defaultHollow,
    });
    sc.addShape(newShape);
    selectShape(newShape.id);
    triggerLiveUpdate();
  } else if (state.activeTool === 'circle') {
    let r = Math.hypot(wCoords.x - dragStart.wx, wCoords.y - dragStart.wy);
    if (dragDist <= 6) r = 50;

    history.push();
    const newShape = new DrawnShape({
      type: 'circle',
      cx: dragStart.wx,
      cy: dragStart.wy,
      radius: r,
      count: state.defaultShapeCount,
      hollow: state.defaultHollow,
    });
    sc.addShape(newShape);
    selectShape(newShape.id);
    triggerLiveUpdate();
  }
});

function updateHoverCursor(wCoords) {
  const root = sc.getRootNear(wCoords.x, wCoords.y, 16);
  if (root) {
    canvas.style.cursor = 'grab';
    return;
  }

  if (state.activeTool === 'select') {
    const activeShape = getSelectedShape();
    if (activeShape) {
      const handle = activeShape.getHandleNear(wCoords.x, wCoords.y, 12 / view.zoom);
      if (handle) {
        if (handle === 'tl' || handle === 'br') canvas.style.cursor = 'nwse-resize';
        else if (handle === 'tr' || handle === 'bl') canvas.style.cursor = 'nesw-resize';
        else canvas.style.cursor = 'ew-resize';
        return;
      }
    }

    const inside = sc.shapes.find((s) => s.containsPoint(wCoords.x, wCoords.y));
    if (inside) {
      canvas.style.cursor = 'move';
      return;
    }
    canvas.style.cursor = 'default';
  } else if (state.activeTool === 'erase') {
    canvas.style.cursor = 'not-allowed';
  } else if (state.activeTool === 'root') {
    canvas.style.cursor = 'pointer';
  } else {
    canvas.style.cursor = 'crosshair';
  }
}

// Zoom with mouse wheel
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
  const mouseBefore = screenToWorld(e.clientX, e.clientY);

  view.zoom = Math.min(6.0, Math.max(0.15, view.zoom * zoomFactor));

  // Anchor zoom to cursor coordinate
  const mouseAfter = screenToWorld(e.clientX, e.clientY);
  view.panX += (mouseAfter.x - mouseBefore.x) * view.zoom;
  view.panY += (mouseAfter.y - mouseBefore.y) * view.zoom;

  render();
}, { passive: false });

// --- Tool Buttons Binding ---
function setTool(toolName) {
  state.activeTool = toolName;
  ui.toolSelect.classList.toggle('active', toolName === 'select');
  ui.toolRect.classList.toggle('active', toolName === 'rect');
  ui.toolCircle.classList.toggle('active', toolName === 'circle');
  ui.toolPoint.classList.toggle('active', toolName === 'point');
  ui.toolErase.classList.toggle('active', toolName === 'erase');
  ui.toolRoot.classList.toggle('active', toolName === 'root');
}

ui.toolSelect.addEventListener('click', () => setTool('select'));
ui.toolRect.addEventListener('click', () => setTool('rect'));
ui.toolCircle.addEventListener('click', () => setTool('circle'));
ui.toolPoint.addEventListener('click', () => setTool('point'));
ui.toolErase.addEventListener('click', () => setTool('erase'));
ui.toolRoot.addEventListener('click', () => setTool('root'));

// --- Selected Shape Live Adjustments ---
ui.inputSelectedCount.addEventListener('input', (e) => {
  const count = parseInt(e.target.value, 10);
  ui.valSelectedCount.textContent = count;
  state.defaultShapeCount = count;

  const shape = getSelectedShape();
  if (shape) {
    sc.updateShape(shape.id, { count });
    triggerLiveUpdate();
  }
});

ui.toggleSelectedHollow.addEventListener('change', (e) => {
  const hollow = e.target.checked;
  state.defaultHollow = hollow;

  const shape = getSelectedShape();
  if (shape) {
    sc.updateShape(shape.id, { hollow });
    triggerLiveUpdate();
  }
});

ui.btnDeleteShape.addEventListener('click', () => {
  const shape = getSelectedShape();
  if (shape) {
    history.push();
    sc.removeShape(shape.id);
    selectShape(null);
    triggerLiveUpdate();
  }
});

ui.btnDeselectShape.addEventListener('click', () => {
  selectShape(null);
});

// --- General Controls ---
ui.btnClearAttractors.addEventListener('click', () => {
  history.push();
  toggleRunning(false);
  sc.clearAttractors();
  selectShape(null);
  sc.resetTree();
  render();
  updateStats();
});

ui.btnSingleRoot.addEventListener('click', () => {
  history.push();
  sc.setRoot(0, 0);
  triggerLiveUpdate();
});

ui.btnPlay.addEventListener('click', () => toggleRunning());
ui.btnStep.addEventListener('click', () => {
  toggleRunning(false);
  doStep();
});
ui.btnResetAll.addEventListener('click', () => {
  history.push();
  toggleRunning(false);
  sc.resetTree();
  render();
  updateStats();
});

// Curvilinear vs Rectilinear Controls (Live Parametric Updates)
ui.inputRectilinear.addEventListener('input', (e) => {
  state.rectilinearSnap = parseFloat(e.target.value);
  const pct = Math.round(state.rectilinearSnap * 100);
  ui.valRectilinear.textContent = pct === 0 ? '0% (Organic)' : pct === 100 ? '100% (Orthogonal 90°)' : `${pct}% (Faceted)`;
  sc.rectilinearSnap = state.rectilinearSnap;
  triggerLiveUpdate();
});

ui.inputSmoothness.addEventListener('input', (e) => {
  state.curvilinearSmoothness = parseFloat(e.target.value);
  ui.valSmoothness.textContent = `${Math.round(state.curvilinearSmoothness * 100)}%`;
  sc.curvilinearSmoothness = state.curvilinearSmoothness;
  triggerLiveUpdate();
});

// Closed Venation Controls (Instant Live Re-simulation & Loop Formation)
ui.toggleClosedVenation.addEventListener('change', (e) => {
  state.closedVenation = e.target.checked;
  sc.closedVenation = state.closedVenation;
  if (sc.nodes.length > sc.roots.length) {
    sc.updateClosedVenation();
  }
  triggerLiveUpdate();
});

ui.inputLoopRate.addEventListener('input', (e) => {
  state.loopRate = parseFloat(e.target.value);
  ui.valLoopRate.textContent = `${Math.round(state.loopRate * 100)}%`;
  sc.loopRate = state.loopRate;
  if (sc.nodes.length > sc.roots.length) {
    sc.updateClosedVenation();
  }
  triggerLiveUpdate();
});

// Growth Parameters (Live Parametric Updates)
ui.inputInfluence.addEventListener('input', (e) => {
  state.influenceRadius = parseFloat(e.target.value);
  ui.valInfluence.textContent = `${state.influenceRadius}px`;
  sc.influenceRadius = state.influenceRadius;
  triggerLiveUpdate();
});

ui.inputKill.addEventListener('input', (e) => {
  state.killRadius = parseFloat(e.target.value);
  ui.valKill.textContent = `${state.killRadius}px`;
  sc.killRadius = state.killRadius;
  triggerLiveUpdate();
});

ui.inputSegment.addEventListener('input', (e) => {
  state.segmentLength = parseFloat(e.target.value);
  ui.valSegment.textContent = `${state.segmentLength}px`;
  sc.segmentLength = state.segmentLength;
  triggerLiveUpdate();
});

ui.inputTropism.addEventListener('input', (e) => {
  state.tropismY = parseFloat(e.target.value);
  const dirText = state.tropismY < 0 ? 'Upward' : state.tropismY > 0 ? 'Downward' : 'Neutral';
  ui.valTropism.textContent = `${state.tropismY.toFixed(2)} (${dirText})`;
  sc.tropismY = state.tropismY;
  triggerLiveUpdate();
});

// Color Gradient & Caliber (Instant Live Re-render)
ui.inputColorRoot.addEventListener('input', (e) => {
  state.colorRoot = e.target.value;
  render();
});

ui.inputColorTip.addEventListener('input', (e) => {
  state.colorTip = e.target.value;
  render();
});

if (ui.toggleThickness) {
  ui.toggleThickness.addEventListener('change', (e) => {
    state.showThickness = e.target.checked;
    if (ui.groupThick) {
      ui.groupThick.style.opacity = state.showThickness ? '1' : '0.45';
      ui.groupThick.style.pointerEvents = state.showThickness ? 'auto' : 'none';
    }
    render();
  });
}

ui.inputThick.addEventListener('input', (e) => {
  state.thickScale = parseFloat(e.target.value);
  ui.valThick.textContent = `${state.thickScale.toFixed(1)}x`;
  render();
});

ui.toggleAttractors.addEventListener('change', (e) => {
  state.showAttractors = e.target.checked;
  render();
});

// --- Exporters ---
// 1. SVG Vector Exporter
if (ui.btnExportSvg) {
  ui.btnExportSvg.addEventListener('click', () => {
    const svgData = sc.exportToSVG(1600, 1000, state.colorRoot, state.colorTip, state.showThickness);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `section_colonization_${sc.nodes.length}nodes.svg`;
    link.click();
    URL.revokeObjectURL(link.href);
  });
}

// 2. DXF Vector CAD Exporter (AutoCAD / Rhino)
if (ui.btnExportDxf) {
  ui.btnExportDxf.addEventListener('click', () => {
    const dxfData = sc.exportToDXF();
    const blob = new Blob([dxfData], { type: 'application/dxf;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `section_colonization_${sc.nodes.length}nodes.dxf`;
    link.click();
    URL.revokeObjectURL(link.href);
  });
}

// 3. Rhino 3D Mesh (.OBJ) Exporter
if (ui.btnExportObj) {
  ui.btnExportObj.addEventListener('click', () => {
    const objData = sc.exportToOBJ(8, state.thickScale);
    const blob = new Blob([objData], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `section_colonization_rhino_${sc.nodes.length}nodes.obj`;
    link.click();
    URL.revokeObjectURL(link.href);
  });
}

// --- Undo / Redo Controls & Keybindings ---
if (ui.btnUndo) ui.btnUndo.addEventListener('click', () => history.undo());
if (ui.btnRedo) ui.btnRedo.addEventListener('click', () => history.redo());

window.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    if (e.shiftKey) {
      e.preventDefault();
      history.redo();
    } else {
      e.preventDefault();
      history.undo();
    }
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    history.redo();
  }
});

// --- Editable Slider Bounds Integration ---
function initSliderBounds() {
  const boundInputs = document.querySelectorAll('.bound-input');
  boundInputs.forEach((input) => {
    const updateBound = () => {
      const sliderId = input.getAttribute('data-slider-id');
      const slider = document.getElementById(sliderId);
      if (!slider) return;

      const isMin = input.classList.contains('bound-min');
      const val = parseFloat(input.value);
      if (isNaN(val)) return;

      if (isMin) {
        slider.min = val;
        if (parseFloat(slider.value) < val) {
          slider.value = val;
          slider.dispatchEvent(new Event('input'));
        }
      } else {
        slider.max = val;
        if (parseFloat(slider.value) > val) {
          slider.value = val;
          slider.dispatchEvent(new Event('input'));
        }
      }
    };

    input.addEventListener('change', updateBound);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        updateBound();
        input.blur();
      }
    });
  });
}

// --- Main Animation Frame Loop ---
let lastStepTime = 0;
function loop(time) {
  requestAnimationFrame(loop);
  if (state.isRunning && !sc.isFinished) {
    if (time - lastStepTime > 32) {
      doStep();
      lastStepTime = time;
    }
  }
}

// Initial Boot
resizeCanvas();
selectShape(initialCanopy.id);
initSliderBounds();
history.updateButtons();
updateStats();
loop(0);
