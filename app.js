import { SpaceColonization2D, DrawnShape } from './algorithm.js';
import { ImageAnalyzer, SolidVoidGrid } from './image-analyzer.js';
import { VariationsEngine, VARIATION_PRESETS } from './variations-engine.js';

// --- State Configuration ---
const state = {
  mode: 'section', // 'section' | 'sketch'
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
  colorRoot: '#ffffff',
  colorTip: '#a1a1aa',
  showThickness: false,
  thickScale: 1.5,
  showAttractors: true,
  attractorColor: '#ffffff',
  attractorSize: 2.0,
  isRunning: false,
};

// --- Section Mode Algorithm Instance ---
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

// --- Sketch & Void Studio State & Algorithm Instance ---
const sketchState = {
  analyzer: new ImageAnalyzer(),
  variationsEngine: new VariationsEngine(),
  sourceImage: null,
  grid: null,
  maskCanvas: null, // Pre-rendered solid mask for fast 60fps draw
  targetMode: 'void', // 'void' (rooms/circulation) | 'solid' (structure/walls)
  threshold: 128,
  invert: false,
  denoise: 1,
  imgOpacity: 0.35,
  showMask: true,
  showAttractors: true,
  attractorCount: 650,
  boundaryBias: 0.25,
  attractorSize: 2.0,
  attractorColor: '#ffffff',
  influenceRadius: 75,
  killRadius: 12,
  segmentLength: 9,
  tropismY: -0.15,
  tropismX: 0.0,
  rectilinearSnap: 0.0,
  curvilinearSmoothness: 0.65,
  closedVenation: false,
  loopRate: 0.5,
  thickScale: 1.8,
  showThickness: true,
  colorRoot: '#ffffff',
  colorTip: '#a1a1aa',
  rootStrategy: 'portals',
  isRootToolActive: false,
  isRunning: false,
  activeVariationId: null,
  currentPreset: 'courtyard',

  // In-canvas Quick Doodle
  doodleActive: false,
  doodleMode: 'ink', // 'ink' (draw solid) | 'erase' (carve void)
  doodleSize: 16,
  doodleCanvas: null,
  doodleCtx: null,
};

const sketchSC = new SpaceColonization2D({
  influenceRadius: 75,
  killRadius: 12,
  segmentLength: 9,
  tropismY: -0.15,
  rectilinearSnap: 0.0,
  curvilinearSmoothness: 0.65,
  closedVenation: false,
  loopRate: 0.2,
  targetMode: 'void',
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
  inputColorAttractor: document.getElementById('input-color-attractor'),
  inputAttractorSize: document.getElementById('input-attractor-size'),
  valAttractorSize: document.getElementById('val-attractor-size'),

  statNodes: document.getElementById('stat-nodes'),
  statAttractors: document.getElementById('stat-attractors'),
  statIterations: document.getElementById('stat-iterations'),
  statStatus: document.getElementById('stat-status'),

  // Studio Navigation Tabs
  tabSectionMode: document.getElementById('tab-section-mode'),
  tabSketchMode: document.getElementById('tab-sketch-mode'),
  appSubtitleTag: document.getElementById('app-subtitle-tag'),
  sidebarSection: document.getElementById('sidebar'),
  sidebarSketch: document.getElementById('sidebar-sketch'),

  // Sketch Input & Presets
  dropzone: document.getElementById('dropzone'),
  inputImageFile: document.getElementById('input-image-file'),
  btnPresetCourtyard: document.getElementById('btn-preset-courtyard'),
  btnPresetUrban: document.getElementById('btn-preset-urban'),
  btnPresetAtrium: document.getElementById('btn-preset-atrium'),
  btnPresetCavern: document.getElementById('btn-preset-cavern'),
  btnToggleDoodle: document.getElementById('btn-toggle-doodle'),
  labelBtnDoodle: document.getElementById('label-btn-doodle'),

  // Doodle Floating Toolbar
  doodleToolbar: document.getElementById('doodle-toolbar'),
  doodleModeInk: document.getElementById('doodle-mode-ink'),
  doodleModeErase: document.getElementById('doodle-mode-erase'),
  inputDoodleSize: document.getElementById('input-doodle-size'),
  btnDoodleClear: document.getElementById('btn-doodle-clear'),
  btnDoodleClose: document.getElementById('btn-doodle-close'),

  // Solid vs Void Analysis Controls
  inputSketchThresh: document.getElementById('input-sketch-thresh'),
  numSketchThresh: document.getElementById('num-sketch-thresh'),
  btnAutoOtsu: document.getElementById('btn-auto-otsu'),
  toggleSketchInvert: document.getElementById('toggle-sketch-invert'),
  targetModeVoid: document.getElementById('target-mode-void'),
  targetModeSolid: document.getElementById('target-mode-solid'),
  inputSketchImgOpacity: document.getElementById('input-sketch-img-opacity'),
  numSketchImgOpacity: document.getElementById('num-sketch-img-opacity'),
  toggleSketchMask: document.getElementById('toggle-sketch-mask'),
  toggleSketchAttractors: document.getElementById('toggle-sketch-attractors'),

  // Attractor Controls
  inputSketchAttractors: document.getElementById('input-sketch-attractors'),
  numSketchAttractors: document.getElementById('num-sketch-attractors'),
  inputSketchBoundaryBias: document.getElementById('input-sketch-boundary-bias'),
  numSketchBoundaryBias: document.getElementById('num-sketch-boundary-bias'),
  inputSketchAttractorSize: document.getElementById('input-sketch-attractor-size'),
  numSketchAttractorSize: document.getElementById('num-sketch-attractor-size'),
  inputSketchAttractorColor: document.getElementById('input-sketch-attractor-color'),
  btnSketchResampleAttractors: document.getElementById('btn-sketch-resample-attractors'),

  // Growth Parameters
  inputSketchInfluence: document.getElementById('input-sketch-influence'),
  numSketchInfluence: document.getElementById('num-sketch-influence'),
  inputSketchKill: document.getElementById('input-sketch-kill'),
  numSketchKill: document.getElementById('num-sketch-kill'),
  inputSketchSegment: document.getElementById('input-sketch-segment'),
  numSketchSegment: document.getElementById('num-sketch-segment'),
  inputSketchTropismY: document.getElementById('input-sketch-tropism-y'),
  numSketchTropismY: document.getElementById('num-sketch-tropism-y'),
  valSketchTropismY: document.getElementById('val-sketch-tropism-y'),
  inputSketchTropismX: document.getElementById('input-sketch-tropism-x'),
  numSketchTropismX: document.getElementById('num-sketch-tropism-x'),
  valSketchTropismX: document.getElementById('val-sketch-tropism-x'),

  // Curvature & Morphology
  inputSketchRectilinear: document.getElementById('input-sketch-rectilinear'),
  numSketchRectilinear: document.getElementById('num-sketch-rectilinear'),
  valSketchRectilinear: document.getElementById('val-sketch-rectilinear'),
  inputSketchSmoothness: document.getElementById('input-sketch-smoothness'),
  numSketchSmoothness: document.getElementById('num-sketch-smoothness'),
  toggleSketchClosedVenation: document.getElementById('toggle-sketch-closed-venation'),
  inputSketchLoopRate: document.getElementById('input-sketch-loop-rate'),
  numSketchLoopRate: document.getElementById('num-sketch-loop-rate'),

  // Branch Geometry & Caliber
  inputSketchThick: document.getElementById('input-sketch-thick'),
  numSketchThick: document.getElementById('num-sketch-thick'),
  toggleSketchThickness: document.getElementById('toggle-sketch-thickness'),
  inputSketchColorRoot: document.getElementById('input-sketch-color-root'),
  inputSketchColorTip: document.getElementById('input-sketch-color-tip'),

  // Roots
  selectRootStrategy: document.getElementById('select-root-strategy'),
  toolSketchRoot: document.getElementById('tool-sketch-root'),
  btnSketchResetRoots: document.getElementById('btn-sketch-reset-roots'),

  // Simulation & Variations Controls
  btnSketchPlay: document.getElementById('btn-sketch-play'),
  btnSketchStep: document.getElementById('btn-sketch-step'),
  btnSketchReset: document.getElementById('btn-sketch-reset'),
  btnGenerateVariations: document.getElementById('btn-generate-variations'),
  btnToggleDrawer: document.getElementById('btn-toggle-drawer'),
  labelToggleDrawer: document.getElementById('label-toggle-drawer'),

  // Variations Drawer
  variationsDrawer: document.getElementById('variations-drawer'),
  variationsGrid: document.getElementById('variations-grid'),
  btnRegenerateAll: document.getElementById('btn-regenerate-all'),
  btnCloseDrawer: document.getElementById('btn-close-drawer'),

  // Export PNG
  btnExportPng: document.getElementById('btn-export-png'),
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

    if (ui.inputSelectedCount) {
      const curMin = parseFloat(ui.inputSelectedCount.min);
      const curMax = parseFloat(ui.inputSelectedCount.max);
      if (!isNaN(curMin) && shape.count < curMin) {
        ui.inputSelectedCount.min = shape.count;
        const minBound = document.querySelector(`.bound-min[data-slider-id="input-selected-count"]`);
        if (minBound) minBound.value = shape.count;
      }
      if (!isNaN(curMax) && shape.count > curMax) {
        ui.inputSelectedCount.max = shape.count;
        const maxBound = document.querySelector(`.bound-max[data-slider-id="input-selected-count"]`);
        if (maxBound) maxBound.value = shape.count;
      }
      ui.inputSelectedCount.value = shape.count;
    }

    const numSelectedCount = document.getElementById('num-selected-count');
    if (numSelectedCount) numSelectedCount.value = shape.count;
    if (ui.valSelectedCount) ui.valSelectedCount.textContent = shape.count;
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
    thickScale: state.thickScale,
    attractorSize: state.attractorSize,
    attractorColor: state.attractorColor,
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
  }
  if (snapshot.thickScale !== undefined) {
    state.thickScale = snapshot.thickScale;
    if (ui.inputThick) ui.inputThick.value = state.thickScale;
    const numThick = document.getElementById('num-thick');
    if (numThick) numThick.value = state.thickScale;
    if (ui.valThick) ui.valThick.textContent = `${state.thickScale.toFixed(1)}px`;
  }
  if (snapshot.attractorSize !== undefined) {
    state.attractorSize = snapshot.attractorSize;
    if (ui.inputAttractorSize) ui.inputAttractorSize.value = state.attractorSize;
    const numAttractorSize = document.getElementById('num-attractor-size');
    if (numAttractorSize) numAttractorSize.value = state.attractorSize;
    if (ui.valAttractorSize) ui.valAttractorSize.textContent = `${state.attractorSize.toFixed(1)}px`;
  }
  if (snapshot.attractorColor !== undefined) {
    state.attractorColor = snapshot.attractorColor;
    if (ui.inputColorAttractor) ui.inputColorAttractor.value = state.attractorColor;
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

  if (state.mode === 'sketch') {
    renderSketchMode(w, h);
    return;
  }

  // 3. Ground Level Datum
  const groundScreenY = worldToScreen(0, 0).y;
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
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
      ctx.fillStyle = isSelected ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)';
      ctx.fillRect(minX, minY, rw, rh);

      // Border outline
      ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.setLineDash(isSelected ? [6, 4] : [3, 3]);
      ctx.strokeRect(minX, minY, rw, rh);

      // Tag label
      if (isSelected) {
        ctx.fillStyle = '#ffffff';
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

      ctx.fillStyle = isSelected ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)';
      ctx.beginPath();
      ctx.arc(center.x, center.y, rScreen, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.setLineDash(isSelected ? [6, 4] : [3, 3]);
      ctx.stroke();

      if (isSelected) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(`${shape.name} (${shape.count} pts) [Drag center to move]`, center.x - rScreen, center.y - rScreen - 8);

        // Draw Radial Resize Handles
        drawHandle(center.x + rScreen, center.y);
        drawHandle(center.x, center.y - rScreen);
      }
    }
    ctx.restore();
  }

  // 5. Draw Attractor Points (Visible before, during, and after simulation!)
  const allAttractors = sc.getAllAttractors();
  if (state.showAttractors && allAttractors.length > 0) {
    const baseRadius = state.attractorSize || 2.0;
    const activeSet = new Set(sc.attractors);

    for (let i = 0; i < allAttractors.length; i++) {
      const attr = allAttractors[i];
      const sp = worldToScreen(attr.x, attr.y);
      const isSelected = attr.shapeId && attr.shapeId === state.selectedShapeId;
      const isActive = activeSet.has(attr);

      ctx.beginPath();
      ctx.fillStyle = state.attractorColor || '#ffffff';
      // When simulation is finished, attractors remain clearly visible (0.75 opacity)
      const alpha = isSelected ? 1.0 : (sc.isFinished ? 0.75 : (isActive ? 0.9 : 0.45));
      ctx.globalAlpha = alpha;
      const r = (isSelected ? baseRadius * 1.35 : baseRadius) * Math.max(0.6, view.zoom);
      ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }

  // 6. Draw Colonization Branches & Nodes (Color Gradient & Thickness Scaling)
  if (sc.nodes.length > sc.roots.length) {
    let maxDepth = 1;
    for (let i = 0; i < sc.nodes.length; i++) {
      if (sc.nodes[i].depth > maxDepth) maxDepth = sc.nodes[i].depth;
    }

    const rgbRoot = hexToRgb(state.colorRoot);
    const rgbTip = hexToRgb(state.colorTip);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 6a. Primary Branches (Lines)
    for (let i = 0; i < sc.nodes.length; i++) {
      const node = sc.nodes[i];
      if (!node.parent) continue;

      const p1 = worldToScreen(node.parent.x, node.parent.y);
      const p2 = worldToScreen(node.x, node.y);

      const t = node.depth / maxDepth;
      ctx.strokeStyle = lerpColor(rgbRoot, rgbTip, t);

      // When taper is ON, taper via Murray's law scaled by thickScale.
      // When taper is OFF, draw clean uniform lines directly scaled by thickScale!
      const lineWeight = state.showThickness
        ? Math.max(0.5, (node.thickness * 0.75 * state.thickScale) * view.zoom)
        : Math.max(0.5, state.thickScale * view.zoom);
      ctx.lineWidth = lineWeight;

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
        const loopWeight = state.showThickness
          ? Math.max(0.5, Math.min(edge.nodeA.thickness, edge.nodeB.thickness) * 0.6 * state.thickScale * view.zoom)
          : Math.max(0.5, state.thickScale * view.zoom);
        ctx.lineWidth = loopWeight;

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
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.0;
    ctx.arc(sp.x, sp.y, 10, 0, Math.PI * 2);
    ctx.stroke();

    // Solid core
    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.arc(sp.x, sp.y, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Crosshairs
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.moveTo(sp.x - 14, sp.y);
    ctx.lineTo(sp.x + 14, sp.y);
    ctx.moveTo(sp.x, sp.y - 14);
    ctx.lineTo(sp.x, sp.y + 14);
    ctx.stroke();

    // Root label
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(`Root #${root.id}`, sp.x + 14, sp.y + 4);
  }

  // 8. Active Drawing Drag Preview
  if (isInteracting && !isPanning && !dragAction && (state.activeTool === 'rect' || state.activeTool === 'circle')) {
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);

    if (state.activeTool === 'rect') {
      const minX = Math.min(dragStart.sx, currentMouse.sx);
      const minY = Math.min(dragStart.sy, currentMouse.sy);
      const rw = Math.abs(currentMouse.sx - dragStart.sx);
      const rh = Math.abs(currentMouse.sy - dragStart.sy);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(minX, minY, rw, rh);
      ctx.strokeRect(minX, minY, rw, rh);
    } else if (state.activeTool === 'circle') {
      const radiusScreen = Math.hypot(currentMouse.sx - dragStart.sx, currentMouse.sy - dragStart.sy);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
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
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 1.5;
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
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
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
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1.5;
  ctx.moveTo(view.panX, 0);
  ctx.lineTo(view.panX, h);
  ctx.moveTo(0, view.panY);
  ctx.lineTo(w, view.panY);
  ctx.stroke();
}

// --- Stats HUD ---
function updateStats() {
  const activeSC = state.mode === 'sketch' ? sketchSC : sc;
  const isRunning = state.mode === 'sketch' ? sketchState.isRunning : state.isRunning;

  ui.statNodes.textContent = activeSC.nodes.length.toLocaleString();
  const totalAttr = activeSC.manualPoints ? activeSC.manualPoints.length : (activeSC.getAllAttractors ? activeSC.getAllAttractors().length : 0);
  ui.statAttractors.textContent = activeSC.isFinished ? `${totalAttr}` : `${activeSC.attractors.length} / ${totalAttr}`;
  ui.statIterations.textContent = activeSC.iterations;

  if (activeSC.isFinished) {
    ui.statStatus.textContent = 'Completed';
    ui.statStatus.style.color = '#ffffff';
  } else if (isRunning) {
    ui.statStatus.textContent = 'Colonizing';
    ui.statStatus.style.color = '#ffffff';
  } else {
    ui.statStatus.textContent = 'Ready';
    ui.statStatus.style.color = 'var(--text-muted)';
  }
}

// --- Simulation Step & Cycle ---
function doStep() {
  const activeSC = state.mode === 'sketch' ? sketchSC : sc;
  const isRunning = state.mode === 'sketch' ? sketchState.isRunning : state.isRunning;
  if (activeSC.isFinished) return false;
  const active = activeSC.step();
  render();
  updateStats();
  if (!active && isRunning) {
    toggleRunning(false);
  }
  return active;
}

function toggleRunning(forced) {
  if (state.mode === 'sketch') {
    sketchState.isRunning = forced !== undefined ? forced : !sketchState.isRunning;
    if (sketchState.isRunning) {
      if (ui.btnSketchPlay) {
        ui.btnSketchPlay.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          Pause
        `;
        ui.btnSketchPlay.classList.add('btn-accent');
        ui.btnSketchPlay.classList.remove('btn-primary');
      }
    } else {
      if (ui.btnSketchPlay) {
        ui.btnSketchPlay.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          Play
        `;
        ui.btnSketchPlay.classList.add('btn-primary');
        ui.btnSketchPlay.classList.remove('btn-accent');
      }
    }
  } else {
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
  }
  updateStats();
}

// --- Mouse & Touch Canvas Interaction ---
function commitActiveValInput() {
  if (document.activeElement && (document.activeElement.classList.contains('val-input') || document.activeElement.classList.contains('bound-input'))) {
    document.activeElement.blur();
  }
}

window.addEventListener('pointerdown', (e) => {
  if (e.target && !e.target.classList.contains('val-input') && !e.target.classList.contains('bound-input')) {
    commitActiveValInput();
  }
});

canvas.addEventListener('pointerdown', (e) => {
  commitActiveValInput();
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

  if (state.mode === 'sketch') {
    handleSketchPointerDown(e, wPt);
    return;
  }

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

  if (state.mode === 'sketch') {
    handleSketchPointerMove(e, wCoords);
    return;
  }

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

  if (state.mode === 'sketch') {
    handleSketchPointerUp(e);
    dragAction = null;
    return;
  }

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
  if (isNaN(count)) return;
  if (ui.valSelectedCount) ui.valSelectedCount.textContent = count;
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
  if (ui.valRectilinear) ui.valRectilinear.textContent = pct === 0 ? '(Organic)' : pct === 100 ? '(Orthogonal 90°)' : `(${pct}% Faceted)`;
  sc.rectilinearSnap = state.rectilinearSnap;
  triggerLiveUpdate();
});

ui.inputSmoothness.addEventListener('input', (e) => {
  state.curvilinearSmoothness = parseFloat(e.target.value);
  if (ui.valSmoothness) ui.valSmoothness.textContent = `(${Math.round(state.curvilinearSmoothness * 100)}%)`;
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
  if (ui.valLoopRate) ui.valLoopRate.textContent = `(${Math.round(state.loopRate * 100)}%)`;
  sc.loopRate = state.loopRate;
  if (sc.nodes.length > sc.roots.length) {
    sc.updateClosedVenation();
  }
  triggerLiveUpdate();
});

// Growth Parameters (Live Parametric Updates)
ui.inputInfluence.addEventListener('input', (e) => {
  state.influenceRadius = parseFloat(e.target.value);
  if (ui.valInfluence) ui.valInfluence.textContent = `${state.influenceRadius}px`;
  sc.influenceRadius = state.influenceRadius;
  triggerLiveUpdate();
});

ui.inputKill.addEventListener('input', (e) => {
  state.killRadius = parseFloat(e.target.value);
  if (ui.valKill) ui.valKill.textContent = `${state.killRadius}px`;
  sc.killRadius = state.killRadius;
  triggerLiveUpdate();
});

ui.inputSegment.addEventListener('input', (e) => {
  state.segmentLength = parseFloat(e.target.value);
  if (ui.valSegment) ui.valSegment.textContent = `${state.segmentLength}px`;
  sc.segmentLength = state.segmentLength;
  triggerLiveUpdate();
});

ui.inputTropism.addEventListener('input', (e) => {
  state.tropismY = parseFloat(e.target.value);
  const dirText = state.tropismY < 0 ? 'Upward' : state.tropismY > 0 ? 'Downward' : 'Neutral';
  if (ui.valTropism) ui.valTropism.textContent = `(${dirText})`;
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
    render();
  });
}

ui.inputThick.addEventListener('input', (e) => {
  state.thickScale = parseFloat(e.target.value);
  if (ui.valThick) ui.valThick.textContent = `${state.thickScale.toFixed(1)}px`;
  render();
});
ui.inputThick.addEventListener('change', () => history.push());

ui.toggleAttractors.addEventListener('change', (e) => {
  state.showAttractors = e.target.checked;
  render();
});

if (ui.inputColorAttractor) {
  ui.inputColorAttractor.addEventListener('input', (e) => {
    state.attractorColor = e.target.value;
    render();
  });
  ui.inputColorAttractor.addEventListener('change', () => history.push());
}

if (ui.inputAttractorSize) {
  ui.inputAttractorSize.addEventListener('input', (e) => {
    state.attractorSize = parseFloat(e.target.value);
    if (ui.valAttractorSize) ui.valAttractorSize.textContent = `${state.attractorSize.toFixed(1)}px`;
    render();
  });
  ui.inputAttractorSize.addEventListener('change', () => history.push());
}

// --- Exporters ---
// 1. SVG Vector Exporter
if (ui.btnExportSvg) {
  ui.btnExportSvg.addEventListener('click', () => {
    const activeSC = state.mode === 'sketch' ? sketchSC : sc;
    const svgData = activeSC.exportToSVG(1600, 1000, state.colorRoot, state.colorTip, state.showThickness);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${state.mode === 'sketch' ? 'sketch_plan' : 'section'}_colonization_${activeSC.nodes.length}nodes.svg`;
    link.click();
    URL.revokeObjectURL(link.href);
  });
}

// 2. DXF Vector CAD Exporter (AutoCAD / Rhino)
if (ui.btnExportDxf) {
  ui.btnExportDxf.addEventListener('click', () => {
    const activeSC = state.mode === 'sketch' ? sketchSC : sc;
    const dxfData = activeSC.exportToDXF();
    const blob = new Blob([dxfData], { type: 'application/dxf;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${state.mode === 'sketch' ? 'sketch_plan' : 'section'}_colonization_${activeSC.nodes.length}nodes.dxf`;
    link.click();
    URL.revokeObjectURL(link.href);
  });
}

// 3. Rhino 3D Mesh (.OBJ) Exporter
if (ui.btnExportObj) {
  ui.btnExportObj.addEventListener('click', () => {
    const activeSC = state.mode === 'sketch' ? sketchSC : sc;
    const caliber = state.mode === 'sketch' ? (sketchState.thickScale || 1.8) : state.thickScale;
    const objData = activeSC.exportToOBJ(8, caliber);
    const blob = new Blob([objData], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${state.mode === 'sketch' ? 'sketch_plan' : 'section'}_rhino_${activeSC.nodes.length}nodes.obj`;
    link.click();
    URL.revokeObjectURL(link.href);
  });
}

// 4. PNG Blueprint Exporter
if (ui.btnExportPng) {
  ui.btnExportPng.addEventListener('click', () => {
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${state.mode === 'sketch' ? 'sketch_plan' : 'section'}_blueprint.png`;
    link.click();
  });
}

// ==========================================================================
// Sketch & Void Studio Implementation
// ==========================================================================

function buildMaskCanvas(grid) {
  const c = document.createElement('canvas');
  c.width = grid.width;
  c.height = grid.height;
  const cCtx = c.getContext('2d');

  const imgData = cCtx.createImageData(grid.width, grid.height);
  const data = imgData.data;

  // Solid: dark architectural mass fill (subtle white with opacity)
  // Void: completely transparent
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const idx = (y * grid.width + x) * 4;
      const isSolid = grid.get(x, y) === 1;

      if (isSolid) {
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = 34; // 13% opacity architectural solid mass
      } else {
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
      }
    }
  }

  cCtx.putImageData(imgData, 0, 0);
  return c;
}

function renderSketchMode(w, h) {
  const grid = sketchState.grid;
  if (!grid) return;

  const sp = worldToScreen(grid.worldX, grid.worldY);
  const sw = grid.worldWidth * view.zoom;
  const sh = grid.worldHeight * view.zoom;

  // 1. Source Image Underlay
  if (sketchState.sourceImage && sketchState.imgOpacity > 0.01) {
    ctx.save();
    ctx.globalAlpha = sketchState.imgOpacity;
    ctx.drawImage(sketchState.sourceImage, sp.x, sp.y, sw, sh);
    ctx.restore();
  }

  // 2. Solid Mask Hatch Overlay
  if (sketchState.showMask && sketchState.maskCanvas) {
    ctx.save();
    ctx.drawImage(sketchState.maskCanvas, sp.x, sp.y, sw, sh);
    ctx.restore();
  }

  // 3. Doodle Overlay
  if (sketchState.doodleCanvas) {
    ctx.save();
    ctx.drawImage(sketchState.doodleCanvas, sp.x, sp.y, sw, sh);
    ctx.restore();
  }

  // 4. Architectural Boundary Frame & Corner Markers
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(sp.x, sp.y, sw, sh);

  const cLen = 14;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  // Top-left
  ctx.moveTo(sp.x - 4, sp.y); ctx.lineTo(sp.x + cLen, sp.y);
  ctx.moveTo(sp.x, sp.y - 4); ctx.lineTo(sp.x, sp.y + cLen);
  // Top-right
  ctx.moveTo(sp.x + sw + 4, sp.y); ctx.lineTo(sp.x + sw - cLen, sp.y);
  ctx.moveTo(sp.x + sw, sp.y - 4); ctx.lineTo(sp.x + sw, sp.y + cLen);
  // Bottom-left
  ctx.moveTo(sp.x - 4, sp.y + sh); ctx.lineTo(sp.x + cLen, sp.y + sh);
  ctx.moveTo(sp.x, sp.y + sh + 4); ctx.lineTo(sp.x, sp.y + sh - cLen);
  // Bottom-right
  ctx.moveTo(sp.x + sw + 4, sp.y + sh); ctx.lineTo(sp.x + sw - cLen, sp.y + sh);
  ctx.moveTo(sp.x + sw, sp.y + sh + 4); ctx.lineTo(sp.x + sw, sp.y + sh - cLen);
  ctx.stroke();

  // Plan dimension tag
  ctx.fillStyle = '#9e9ea7';
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.fillText(`PLAN BOUNDS: ${Math.round(grid.worldWidth)} x ${Math.round(grid.worldHeight)}mm [TARGET: ${sketchState.targetMode.toUpperCase()}S]`, sp.x, sp.y - 8);
  ctx.restore();

  // 5. Attractor Points
  if (sketchState.showAttractors && sketchSC.manualPoints && sketchSC.manualPoints.length > 0) {
    const activeSet = new Set(sketchSC.attractors);
    const baseRadius = sketchState.attractorSize || 2.0;

    for (let i = 0; i < sketchSC.manualPoints.length; i++) {
      const attr = sketchSC.manualPoints[i];
      const asp = worldToScreen(attr.x, attr.y);
      const isActive = activeSet.has(attr);

      ctx.beginPath();
      ctx.fillStyle = sketchState.attractorColor || '#ffffff';
      ctx.globalAlpha = isActive ? 0.8 : (sketchSC.isFinished ? 0.5 : 0.2);
      const r = baseRadius * Math.max(0.6, view.zoom);
      ctx.arc(asp.x, asp.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }

  // 6. Colonization Branches & Closed Anastomosis Loops
  if (sketchSC.nodes.length > sketchSC.roots.length) {
    let maxDepth = 1;
    for (let i = 0; i < sketchSC.nodes.length; i++) {
      if (sketchSC.nodes[i].depth > maxDepth) maxDepth = sketchSC.nodes[i].depth;
    }

    const rgbRoot = hexToRgb(sketchState.colorRoot || '#ffffff');
    const rgbTip = hexToRgb(sketchState.colorTip || '#a1a1aa');

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Primary Branches
    for (let i = 0; i < sketchSC.nodes.length; i++) {
      const node = sketchSC.nodes[i];
      if (!node.parent) continue;

      const p1 = worldToScreen(node.parent.x, node.parent.y);
      const p2 = worldToScreen(node.x, node.y);
      const t = node.depth / maxDepth;

      ctx.strokeStyle = lerpColor(rgbRoot, rgbTip, t);
      const lineWeight = sketchState.showThickness
        ? Math.max(0.5, (node.thickness * 0.75 * sketchState.thickScale) * view.zoom)
        : Math.max(0.5, sketchState.thickScale * view.zoom);
      ctx.lineWidth = lineWeight;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Anastomosis Loops
    if (sketchSC.closedVenation && sketchSC.anastomosisEdges && sketchSC.anastomosisEdges.length > 0) {
      for (const edge of sketchSC.anastomosisEdges) {
        const p1 = worldToScreen(edge.nodeA.x, edge.nodeA.y);
        const p2 = worldToScreen(edge.nodeB.x, edge.nodeB.y);
        const t = (edge.nodeA.depth + edge.nodeB.depth) / (2 * maxDepth);

        ctx.strokeStyle = lerpColor(rgbRoot, rgbTip, t);
        const loopWeight = sketchState.showThickness
          ? Math.max(0.5, Math.min(edge.nodeA.thickness, edge.nodeB.thickness) * 0.6 * sketchState.thickScale * view.zoom)
          : Math.max(0.5, sketchState.thickScale * view.zoom);
        ctx.lineWidth = loopWeight;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
  }

  // 7. Interactive Root Points
  for (let idx = 0; idx < sketchSC.roots.length; idx++) {
    const root = sketchSC.roots[idx];
    const rsp = worldToScreen(root.x, root.y);

    ctx.beginPath();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.0;
    ctx.arc(rsp.x, rsp.y, 10, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.arc(rsp.x, rsp.y, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1;
    ctx.moveTo(rsp.x - 16, rsp.y); ctx.lineTo(rsp.x + 16, rsp.y);
    ctx.moveTo(rsp.x, rsp.y - 16); ctx.lineTo(rsp.x, rsp.y + 16);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(`Root #${root.id}`, rsp.x + 12, rsp.y - 12);
  }
}

// --- Sketch Mouse & Pointer Event Handling ---
let sketchLastDoodlePt = null;

function handleSketchPointerDown(e, wPt) {
  if (!sketchState.grid) return;

  // 1. Doodle Brush Mode
  if (sketchState.doodleActive) {
    dragAction = { type: 'doodle' };
    sketchLastDoodlePt = { wx: wPt.x, wy: wPt.y };
    paintDoodleStroke(wPt.x, wPt.y, true);
    render();
    return;
  }

  // 2. Custom Root Placement Tool
  if (sketchState.isRootToolActive) {
    const nextId = sketchSC.roots.length > 0 ? Math.max(...sketchSC.roots.map((r) => r.id)) + 1 : 1;
    sketchSC.roots.push({ id: nextId, x: wPt.x, y: wPt.y });
    sketchSC.resetTree();
    sketchSC.runToCompletion(180);
    render();
    updateStats();
    sketchState.isRootToolActive = false;
    if (ui.toolSketchRoot) {
      ui.toolSketchRoot.classList.remove('active');
    }
    return;
  }

  // 3. Move existing root
  for (const r of sketchSC.roots) {
    if (Math.hypot(wPt.x - r.x, wPt.y - r.y) <= 16 / view.zoom) {
      dragAction = { type: 'move-sketch-root', rootId: r.id };
      return;
    }
  }
}

function handleSketchPointerMove(e, wCoords) {
  if (dragAction && dragAction.type === 'doodle') {
    paintDoodleStroke(wCoords.x, wCoords.y, false);
    render();
    return;
  }

  if (dragAction && dragAction.type === 'move-sketch-root') {
    const root = sketchSC.roots.find((r) => r.id === dragAction.rootId);
    if (root) {
      root.x = wCoords.x;
      root.y = wCoords.y;
      sketchSC.resetTree();
      sketchSC.runToCompletion(180);
      render();
      updateStats();
    }
    return;
  }
}

function handleSketchPointerUp(e) {
  if (dragAction && dragAction.type === 'doodle') {
    dragAction = null;
    sketchLastDoodlePt = null;
    commitDoodleToAnalysis();
    return;
  }
  if (dragAction && dragAction.type === 'move-sketch-root') {
    dragAction = null;
    return;
  }
}

function paintDoodleStroke(wx, wy, isStart) {
  if (!sketchState.doodleCanvas || !sketchState.grid) return;
  const dCtx = sketchState.doodleCtx;
  const grid = sketchState.grid;

  const gx = ((wx - grid.worldX) / grid.worldWidth) * grid.width;
  const gy = ((wy - grid.worldY) / grid.worldHeight) * grid.height;

  dCtx.save();
  if (sketchState.doodleMode === 'erase') {
    dCtx.globalCompositeOperation = 'destination-out';
  } else {
    dCtx.globalCompositeOperation = 'source-over';
    dCtx.fillStyle = '#000000';
    dCtx.strokeStyle = '#000000';
  }

  const radius = (sketchState.doodleSize / 2) * (grid.width / 512);

  if (isStart || !sketchLastDoodlePt) {
    dCtx.beginPath();
    dCtx.arc(gx, gy, radius, 0, Math.PI * 2);
    dCtx.fill();
  } else {
    const prevGx = ((sketchLastDoodlePt.wx - grid.worldX) / grid.worldWidth) * grid.width;
    const prevGy = ((sketchLastDoodlePt.wy - grid.worldY) / grid.worldHeight) * grid.height;
    dCtx.lineWidth = radius * 2;
    dCtx.lineCap = 'round';
    dCtx.beginPath();
    dCtx.moveTo(prevGx, prevGy);
    dCtx.lineTo(gx, gy);
    dCtx.stroke();
  }
  dCtx.restore();

  sketchLastDoodlePt = { wx, wy };
}

function commitDoodleToAnalysis() {
  if (!sketchState.sourceImage || !sketchState.doodleCanvas) return;
  const merged = document.createElement('canvas');
  merged.width = sketchState.grid.width;
  merged.height = sketchState.grid.height;
  const mCtx = merged.getContext('2d');
  mCtx.drawImage(sketchState.sourceImage, 0, 0, merged.width, merged.height);
  mCtx.drawImage(sketchState.doodleCanvas, 0, 0);

  updateSketchAnalysis({ mergedImage: merged });
}

function loadSketchPreset(presetName) {
  document.querySelectorAll('.btn-preset').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-preset') === presetName);
  });
  sketchState.currentPreset = presetName;
  const presetCanvas = ImageAnalyzer.createPresetCanvas(presetName, 512, 512);
  loadSketchImage(presetCanvas);
}

function loadSketchImage(imageSource, isMerged = false) {
  if (!isMerged) {
    sketchState.sourceImage = imageSource;
    sketchState.doodleCanvas = document.createElement('canvas');
    sketchState.doodleCanvas.width = 512;
    sketchState.doodleCanvas.height = 512;
    sketchState.doodleCtx = sketchState.doodleCanvas.getContext('2d');
  }

  const res = sketchState.analyzer.analyze(imageSource, {
    threshold: sketchState.threshold,
    invert: sketchState.invert,
    denoise: sketchState.denoise,
  });

  sketchState.grid = res.grid;
  sketchSC.boundaryGrid = res.grid;
  sketchSC.targetMode = sketchState.targetMode;
  sketchState.maskCanvas = buildMaskCanvas(res.grid);

  setupSketchRoots();
  resampleSketchAttractors();
  sketchSC.runToCompletion(180);

  if (!isMerged) {
    view.panX = Math.max(window.innerWidth * 0.5, (window.innerWidth - 380) * 0.5 + 380);
    view.panY = window.innerHeight * 0.5;
    const fitScale = Math.min((window.innerWidth - 440) / res.grid.worldWidth, (window.innerHeight - 340) / res.grid.worldHeight) * 0.85;
    view.zoom = Math.max(0.4, Math.min(2.0, fitScale));
  }

  // Generate 6 variations batch
  const variations = sketchState.variationsEngine.generateAll(res.grid);
  renderVariationsDrawer(variations);

  render();
  updateStats();
}

function updateSketchAnalysis(options = {}) {
  if (!sketchState.sourceImage) return;

  if (options.threshold !== undefined) sketchState.threshold = options.threshold;
  if (options.invert !== undefined) sketchState.invert = options.invert;
  if (options.denoise !== undefined) sketchState.denoise = options.denoise;

  const imgSrc = options.mergedImage || sketchState.sourceImage;
  const res = sketchState.analyzer.analyze(imgSrc, {
    threshold: sketchState.threshold,
    invert: sketchState.invert,
    denoise: sketchState.denoise,
  });

  sketchState.grid = res.grid;
  sketchSC.boundaryGrid = res.grid;
  sketchSC.targetMode = sketchState.targetMode;
  sketchState.maskCanvas = buildMaskCanvas(res.grid);

  resampleSketchAttractors();
}

function resampleSketchAttractors() {
  if (!sketchState.grid) return;
  const pts = sketchState.grid.sampleAttractors(sketchState.attractorCount, sketchState.targetMode, sketchState.boundaryBias);
  sketchSC.manualPoints = pts;
  sketchSC.rebuildAttractors();
  sketchSC.resetTree();
  sketchSC.runToCompletion(180);
  render();
  updateStats();
}

function setupSketchRoots() {
  if (!sketchState.grid) return;
  const roots = sketchState.variationsEngine.getRootsForStrategy(sketchState.rootStrategy, sketchState.grid, sketchState.targetMode);
  sketchSC.roots = roots;
  sketchSC.resetTree();
}

function renderVariationsDrawer(variations) {
  if (!ui.variationsGrid) return;
  ui.variationsGrid.innerHTML = '';

  for (const item of variations) {
    const card = document.createElement('div');
    card.className = `variation-card ${item.def.id === sketchState.activeVariationId ? 'active' : ''}`;
    card.setAttribute('data-id', item.def.id);

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.innerHTML = `
      <span class="variation-card-title">${item.def.name}</span>
      <span class="variation-card-tag">${item.def.tag}</span>
    `;
    card.appendChild(header);

    const thumbWrap = document.createElement('div');
    thumbWrap.className = 'variation-thumb-wrap';
    thumbWrap.appendChild(item.thumbCanvas);
    card.appendChild(thumbWrap);

    const metricsRow = document.createElement('div');
    metricsRow.className = 'variation-metrics';
    metricsRow.innerHTML = `
      <div class="metric-pill">
        <span class="metric-val">${item.metrics.coveragePct}%</span>
        <span class="metric-lbl">Coverage</span>
      </div>
      <div class="metric-pill">
        <span class="metric-val">${item.metrics.nodeCount}</span>
        <span class="metric-lbl">Nodes</span>
      </div>
      <div class="metric-pill">
        <span class="metric-val">${item.metrics.loopCount}</span>
        <span class="metric-lbl">Loops</span>
      </div>
    `;
    card.appendChild(metricsRow);

    const btn = document.createElement('button');
    btn.className = 'btn btn-load-variation';
    btn.textContent = item.def.id === sketchState.activeVariationId ? '✓ Active in Viewport' : 'Load Variation';
    if (item.def.id === sketchState.activeVariationId) btn.classList.add('btn-primary');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      applyVariation(item.def.id);
    });
    card.appendChild(btn);

    card.addEventListener('click', () => {
      applyVariation(item.def.id);
    });

    ui.variationsGrid.appendChild(card);
  }
}

function applyVariation(variationId) {
  const result = sketchState.variationsEngine.results.get(variationId);
  if (!result) return;

  sketchState.activeVariationId = variationId;
  const p = result.def.params;

  sketchSC.influenceRadius = p.influenceRadius;
  sketchSC.killRadius = p.killRadius;
  sketchSC.segmentLength = p.segmentLength;
  sketchSC.rectilinearSnap = p.rectilinearSnap;
  sketchSC.curvilinearSmoothness = p.curvilinearSmoothness;
  sketchSC.closedVenation = p.closedVenation;
  sketchSC.loopRate = p.loopRate;
  sketchSC.tropismY = p.tropismY;
  sketchSC.tropismX = p.tropismX || 0;
  sketchSC.targetMode = result.def.target || 'void';

  sketchState.targetMode = result.def.target || 'void';
  sketchState.influenceRadius = p.influenceRadius;
  sketchState.killRadius = p.killRadius;
  sketchState.segmentLength = p.segmentLength;
  sketchState.rectilinearSnap = p.rectilinearSnap;
  sketchState.curvilinearSmoothness = p.curvilinearSmoothness;
  sketchState.closedVenation = p.closedVenation;
  sketchState.loopRate = p.loopRate;
  sketchState.tropismY = p.tropismY;
  sketchState.tropismX = p.tropismX || 0;
  sketchState.thickScale = p.thickScale || 1.8;
  sketchState.showThickness = p.showThickness !== false;
  sketchState.colorRoot = p.colorRoot || '#ffffff';
  sketchState.colorTip = p.colorTip || '#a1a1aa';
  sketchState.attractorCount = p.attractorCount || 650;
  sketchState.boundaryBias = p.boundaryBias || 0.25;
  sketchState.rootStrategy = result.def.rootStrategy || 'portals';

  // Synchronize UI Inputs & Sliders
  if (ui.inputSketchAttractors) ui.inputSketchAttractors.value = sketchState.attractorCount;
  if (ui.numSketchAttractors) ui.numSketchAttractors.value = sketchState.attractorCount;
  if (ui.inputSketchBoundaryBias) ui.inputSketchBoundaryBias.value = sketchState.boundaryBias;
  if (ui.numSketchBoundaryBias) ui.numSketchBoundaryBias.value = sketchState.boundaryBias;
  if (ui.selectRootStrategy) ui.selectRootStrategy.value = sketchState.rootStrategy;

  if (ui.inputSketchInfluence) ui.inputSketchInfluence.value = sketchSC.influenceRadius;
  if (ui.numSketchInfluence) ui.numSketchInfluence.value = sketchSC.influenceRadius;
  if (ui.inputSketchKill) ui.inputSketchKill.value = sketchSC.killRadius;
  if (ui.numSketchKill) ui.numSketchKill.value = sketchSC.killRadius;
  if (ui.inputSketchSegment) ui.inputSketchSegment.value = sketchSC.segmentLength;
  if (ui.numSketchSegment) ui.numSketchSegment.value = sketchSC.segmentLength;

  if (ui.inputSketchTropismY) ui.inputSketchTropismY.value = sketchSC.tropismY;
  if (ui.numSketchTropismY) ui.numSketchTropismY.value = sketchSC.tropismY;
  if (ui.valSketchTropismY) {
    const dir = sketchSC.tropismY < 0 ? 'Upward' : sketchSC.tropismY > 0 ? 'Downward' : 'Neutral';
    ui.valSketchTropismY.textContent = `(${sketchSC.tropismY.toFixed(2)} ${dir})`;
  }

  if (ui.inputSketchTropismX) ui.inputSketchTropismX.value = sketchSC.tropismX;
  if (ui.numSketchTropismX) ui.numSketchTropismX.value = sketchSC.tropismX;
  if (ui.valSketchTropismX) {
    const dir = sketchSC.tropismX < 0 ? 'Left' : sketchSC.tropismX > 0 ? 'Right' : 'Neutral';
    ui.valSketchTropismX.textContent = `(${sketchSC.tropismX.toFixed(2)} ${dir})`;
  }

  if (ui.inputSketchRectilinear) ui.inputSketchRectilinear.value = sketchSC.rectilinearSnap;
  if (ui.numSketchRectilinear) ui.numSketchRectilinear.value = sketchSC.rectilinearSnap;
  if (ui.valSketchRectilinear) {
    const pct = Math.round(sketchSC.rectilinearSnap * 100);
    ui.valSketchRectilinear.textContent = pct === 0 ? '(Organic)' : pct === 100 ? '(Orthogonal 90°)' : `(${pct}% Faceted)`;
  }

  if (ui.inputSketchSmoothness) ui.inputSketchSmoothness.value = sketchSC.curvilinearSmoothness;
  if (ui.numSketchSmoothness) ui.numSketchSmoothness.value = sketchSC.curvilinearSmoothness;

  if (ui.toggleSketchClosedVenation) ui.toggleSketchClosedVenation.checked = sketchSC.closedVenation;
  if (ui.inputSketchLoopRate) ui.inputSketchLoopRate.value = sketchSC.loopRate;
  if (ui.numSketchLoopRate) ui.numSketchLoopRate.value = sketchSC.loopRate;

  if (ui.inputSketchThick) ui.inputSketchThick.value = sketchState.thickScale;
  if (ui.numSketchThick) ui.numSketchThick.value = sketchState.thickScale;
  if (ui.toggleSketchThickness) ui.toggleSketchThickness.checked = sketchState.showThickness;
  if (ui.inputSketchColorRoot) ui.inputSketchColorRoot.value = sketchState.colorRoot;
  if (ui.inputSketchColorTip) ui.inputSketchColorTip.value = sketchState.colorTip;

  if (sketchState.targetMode === 'solid') {
    if (ui.targetModeSolid) ui.targetModeSolid.classList.add('active');
    if (ui.targetModeVoid) ui.targetModeVoid.classList.remove('active');
  } else {
    if (ui.targetModeVoid) ui.targetModeVoid.classList.add('active');
    if (ui.targetModeSolid) ui.targetModeSolid.classList.remove('active');
  }

  sketchSC.roots = result.sc.roots.map((r) => ({ id: r.id, x: r.x, y: r.y }));
  sketchSC.manualPoints = result.sc.manualPoints.map((pt) => ({ id: pt.id, x: pt.x, y: pt.y }));
  sketchSC.rebuildAttractors();
  sketchSC.runToCompletion(180);

  document.querySelectorAll('.variation-card').forEach((c) => {
    const isThis = c.getAttribute('data-id') === variationId;
    c.classList.toggle('active', isThis);
    const btn = c.querySelector('.btn-load-variation');
    if (btn) {
      btn.textContent = isThis ? '✓ Active in Viewport' : 'Load Variation';
      btn.classList.toggle('btn-primary', isThis);
    }
  });

  render();
  updateStats();
}

function initSketchStudio() {
  // 1. Studio Mode Switching Tabs
  if (ui.tabSectionMode) {
    ui.tabSectionMode.addEventListener('click', () => {
      state.mode = 'section';
      ui.tabSectionMode.classList.add('active');
      ui.tabSketchMode.classList.remove('active');
      if (ui.sidebarSection) ui.sidebarSection.style.display = 'flex';
      if (ui.sidebarSketch) ui.sidebarSketch.style.display = 'none';
      if (ui.variationsDrawer) ui.variationsDrawer.style.display = 'none';
      if (ui.doodleToolbar) ui.doodleToolbar.style.display = 'none';
      if (ui.appSubtitleTag) ui.appSubtitleTag.textContent = 'Section 2D Morphology';
      render();
      updateStats();
    });
  }

  if (ui.tabSketchMode) {
    ui.tabSketchMode.addEventListener('click', () => {
      state.mode = 'sketch';
      ui.tabSketchMode.classList.add('active');
      ui.tabSectionMode.classList.remove('active');
      if (ui.sidebarSection) ui.sidebarSection.style.display = 'none';
      if (ui.sidebarSketch) ui.sidebarSketch.style.display = 'flex';
      if (ui.variationsDrawer) ui.variationsDrawer.style.display = 'flex';
      if (ui.appSubtitleTag) ui.appSubtitleTag.textContent = 'Image & Void Studio';

      if (!sketchState.grid) {
        loadSketchPreset('courtyard');
      } else {
        render();
        updateStats();
      }
    });
  }

  // 2. Preset Buttons
  if (ui.btnPresetCourtyard) ui.btnPresetCourtyard.addEventListener('click', () => loadSketchPreset('courtyard'));
  if (ui.btnPresetUrban) ui.btnPresetUrban.addEventListener('click', () => loadSketchPreset('urban'));
  if (ui.btnPresetAtrium) ui.btnPresetAtrium.addEventListener('click', () => loadSketchPreset('atrium'));
  if (ui.btnPresetCavern) ui.btnPresetCavern.addEventListener('click', () => loadSketchPreset('cavern'));

  // 3. Dropzone & File Input
  if (ui.dropzone && ui.inputImageFile) {
    ui.dropzone.addEventListener('click', () => ui.inputImageFile.click());

    ui.inputImageFile.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = new Image();
        img.onload = () => loadSketchImage(img);
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    });

    ui.dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      ui.dropzone.classList.add('dragover');
    });

    ui.dropzone.addEventListener('dragleave', () => {
      ui.dropzone.classList.remove('dragover');
    });

    ui.dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      ui.dropzone.classList.remove('dragover');
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = new Image();
        img.onload = () => loadSketchImage(img);
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // 4. In-App Quick Doodle Brush
  if (ui.btnToggleDoodle) {
    ui.btnToggleDoodle.addEventListener('click', () => {
      sketchState.doodleActive = !sketchState.doodleActive;
      if (ui.doodleToolbar) {
        ui.doodleToolbar.style.display = sketchState.doodleActive ? 'block' : 'none';
      }
      if (ui.labelBtnDoodle) {
        ui.labelBtnDoodle.textContent = sketchState.doodleActive ? 'Exit Doodle Mode' : 'Canvas Doodle Brush';
      }
      ui.btnToggleDoodle.classList.toggle('btn-primary', sketchState.doodleActive);
      ui.btnToggleDoodle.classList.toggle('btn-accent', !sketchState.doodleActive);
    });
  }

  if (ui.doodleModeInk) {
    ui.doodleModeInk.addEventListener('click', () => {
      sketchState.doodleMode = 'ink';
      ui.doodleModeInk.classList.add('btn-primary');
      if (ui.doodleModeErase) ui.doodleModeErase.classList.remove('btn-primary');
    });
  }

  if (ui.doodleModeErase) {
    ui.doodleModeErase.addEventListener('click', () => {
      sketchState.doodleMode = 'erase';
      ui.doodleModeErase.classList.add('btn-primary');
      if (ui.doodleModeInk) ui.doodleModeInk.classList.remove('btn-primary');
    });
  }

  if (ui.inputDoodleSize) {
    ui.inputDoodleSize.addEventListener('input', (e) => {
      sketchState.doodleSize = parseFloat(e.target.value);
    });
  }

  if (ui.btnDoodleClear) {
    ui.btnDoodleClear.addEventListener('click', () => {
      if (sketchState.doodleCanvas) {
        sketchState.doodleCtx.clearRect(0, 0, sketchState.doodleCanvas.width, sketchState.doodleCanvas.height);
        commitDoodleToAnalysis();
      }
    });
  }

  if (ui.btnDoodleClose) {
    ui.btnDoodleClose.addEventListener('click', () => {
      sketchState.doodleActive = false;
      if (ui.doodleToolbar) ui.doodleToolbar.style.display = 'none';
      if (ui.labelBtnDoodle) ui.labelBtnDoodle.textContent = 'Canvas Doodle Brush';
      if (ui.btnToggleDoodle) {
        ui.btnToggleDoodle.classList.remove('btn-primary');
        ui.btnToggleDoodle.classList.add('btn-accent');
      }
    });
  }

  // 5. Solid / Void Analysis Controls
  if (ui.inputSketchThresh) {
    ui.inputSketchThresh.addEventListener('input', (e) => {
      sketchState.threshold = parseInt(e.target.value);
      if (ui.numSketchThresh) ui.numSketchThresh.value = sketchState.threshold;
      updateSketchAnalysis();
    });
  }

  if (ui.btnAutoOtsu) {
    ui.btnAutoOtsu.addEventListener('click', () => {
      if (!sketchState.sourceImage) return;
      const res = sketchState.analyzer.analyze(sketchState.sourceImage, { autoOtsu: true });
      sketchState.threshold = res.threshold;
      if (ui.inputSketchThresh) ui.inputSketchThresh.value = sketchState.threshold;
      if (ui.numSketchThresh) ui.numSketchThresh.value = sketchState.threshold;
      updateSketchAnalysis();
    });
  }

  if (ui.toggleSketchInvert) {
    ui.toggleSketchInvert.addEventListener('change', (e) => {
      sketchState.invert = e.target.checked;
      updateSketchAnalysis();
    });
  }

  if (ui.targetModeVoid) {
    ui.targetModeVoid.addEventListener('click', () => {
      sketchState.targetMode = 'void';
      sketchSC.targetMode = 'void';
      ui.targetModeVoid.classList.add('active');
      if (ui.targetModeSolid) ui.targetModeSolid.classList.remove('active');
      setupSketchRoots();
      resampleSketchAttractors();
    });
  }

  if (ui.targetModeSolid) {
    ui.targetModeSolid.addEventListener('click', () => {
      sketchState.targetMode = 'solid';
      sketchSC.targetMode = 'solid';
      ui.targetModeSolid.classList.add('active');
      if (ui.targetModeVoid) ui.targetModeVoid.classList.remove('active');
      setupSketchRoots();
      resampleSketchAttractors();
    });
  }

  if (ui.inputSketchImgOpacity) {
    ui.inputSketchImgOpacity.addEventListener('input', (e) => {
      sketchState.imgOpacity = parseFloat(e.target.value);
      render();
    });
  }

  if (ui.toggleSketchMask) {
    ui.toggleSketchMask.addEventListener('change', (e) => {
      sketchState.showMask = e.target.checked;
      render();
    });
  }

  if (ui.toggleSketchAttractors) {
    ui.toggleSketchAttractors.addEventListener('change', (e) => {
      sketchState.showAttractors = e.target.checked;
      render();
    });
  }

  function triggerSketchLiveUpdate() {
    if (!sketchState.grid) return;
    sketchSC.resetTree();
    sketchSC.runToCompletion(180);
    render();
    updateStats();
  }

  // 6. Attractor Sampling & Roots
  if (ui.inputSketchAttractors) {
    ui.inputSketchAttractors.addEventListener('input', (e) => {
      sketchState.attractorCount = parseInt(e.target.value);
      if (ui.numSketchAttractors) ui.numSketchAttractors.value = sketchState.attractorCount;
      resampleSketchAttractors();
    });
  }

  if (ui.inputSketchBoundaryBias) {
    ui.inputSketchBoundaryBias.addEventListener('input', (e) => {
      sketchState.boundaryBias = parseFloat(e.target.value);
      if (ui.numSketchBoundaryBias) ui.numSketchBoundaryBias.value = sketchState.boundaryBias;
      resampleSketchAttractors();
    });
  }

  if (ui.inputSketchAttractorSize) {
    ui.inputSketchAttractorSize.addEventListener('input', (e) => {
      sketchState.attractorSize = parseFloat(e.target.value);
      if (ui.numSketchAttractorSize) ui.numSketchAttractorSize.value = sketchState.attractorSize;
      render();
    });
  }

  if (ui.inputSketchAttractorColor) {
    ui.inputSketchAttractorColor.addEventListener('input', (e) => {
      sketchState.attractorColor = e.target.value;
      render();
    });
  }

  if (ui.btnSketchResampleAttractors) {
    ui.btnSketchResampleAttractors.addEventListener('click', () => {
      resampleSketchAttractors();
    });
  }

  // 6b. Growth Parameters (Live Parametric Recalculation)
  if (ui.inputSketchInfluence) {
    ui.inputSketchInfluence.addEventListener('input', (e) => {
      sketchState.influenceRadius = parseFloat(e.target.value);
      sketchSC.influenceRadius = sketchState.influenceRadius;
      if (ui.numSketchInfluence) ui.numSketchInfluence.value = sketchState.influenceRadius;
      triggerSketchLiveUpdate();
    });
  }

  if (ui.inputSketchKill) {
    ui.inputSketchKill.addEventListener('input', (e) => {
      sketchState.killRadius = parseFloat(e.target.value);
      sketchSC.killRadius = sketchState.killRadius;
      if (ui.numSketchKill) ui.numSketchKill.value = sketchState.killRadius;
      triggerSketchLiveUpdate();
    });
  }

  if (ui.inputSketchSegment) {
    ui.inputSketchSegment.addEventListener('input', (e) => {
      sketchState.segmentLength = parseFloat(e.target.value);
      sketchSC.segmentLength = sketchState.segmentLength;
      if (ui.numSketchSegment) ui.numSketchSegment.value = sketchState.segmentLength;
      triggerSketchLiveUpdate();
    });
  }

  if (ui.inputSketchTropismY) {
    ui.inputSketchTropismY.addEventListener('input', (e) => {
      sketchState.tropismY = parseFloat(e.target.value);
      sketchSC.tropismY = sketchState.tropismY;
      if (ui.numSketchTropismY) ui.numSketchTropismY.value = sketchState.tropismY;
      if (ui.valSketchTropismY) {
        const dir = sketchState.tropismY < 0 ? 'Upward' : sketchState.tropismY > 0 ? 'Downward' : 'Neutral';
        ui.valSketchTropismY.textContent = `(${sketchState.tropismY.toFixed(2)} ${dir})`;
      }
      triggerSketchLiveUpdate();
    });
  }

  if (ui.inputSketchTropismX) {
    ui.inputSketchTropismX.addEventListener('input', (e) => {
      sketchState.tropismX = parseFloat(e.target.value);
      sketchSC.tropismX = sketchState.tropismX;
      if (ui.numSketchTropismX) ui.numSketchTropismX.value = sketchState.tropismX;
      if (ui.valSketchTropismX) {
        const dir = sketchState.tropismX < 0 ? 'Left' : sketchState.tropismX > 0 ? 'Right' : 'Neutral';
        ui.valSketchTropismX.textContent = `(${sketchState.tropismX.toFixed(2)} ${dir})`;
      }
      triggerSketchLiveUpdate();
    });
  }

  // 6c. Curvature & Morphology Controls
  if (ui.inputSketchRectilinear) {
    ui.inputSketchRectilinear.addEventListener('input', (e) => {
      sketchState.rectilinearSnap = parseFloat(e.target.value);
      sketchSC.rectilinearSnap = sketchState.rectilinearSnap;
      if (ui.numSketchRectilinear) ui.numSketchRectilinear.value = sketchState.rectilinearSnap;
      if (ui.valSketchRectilinear) {
        const pct = Math.round(sketchState.rectilinearSnap * 100);
        ui.valSketchRectilinear.textContent = pct === 0 ? '(Organic)' : pct === 100 ? '(Orthogonal 90°)' : `(${pct}% Faceted)`;
      }
      triggerSketchLiveUpdate();
    });
  }

  if (ui.inputSketchSmoothness) {
    ui.inputSketchSmoothness.addEventListener('input', (e) => {
      sketchState.curvilinearSmoothness = parseFloat(e.target.value);
      sketchSC.curvilinearSmoothness = sketchState.curvilinearSmoothness;
      if (ui.numSketchSmoothness) ui.numSketchSmoothness.value = sketchState.curvilinearSmoothness;
      triggerSketchLiveUpdate();
    });
  }

  if (ui.toggleSketchClosedVenation) {
    ui.toggleSketchClosedVenation.addEventListener('change', (e) => {
      sketchState.closedVenation = e.target.checked;
      sketchSC.closedVenation = sketchState.closedVenation;
      if (sketchSC.nodes.length > sketchSC.roots.length) {
        sketchSC.updateClosedVenation();
      }
      triggerSketchLiveUpdate();
    });
  }

  if (ui.inputSketchLoopRate) {
    ui.inputSketchLoopRate.addEventListener('input', (e) => {
      sketchState.loopRate = parseFloat(e.target.value);
      sketchSC.loopRate = sketchState.loopRate;
      if (ui.numSketchLoopRate) ui.numSketchLoopRate.value = sketchState.loopRate;
      if (sketchSC.nodes.length > sketchSC.roots.length) {
        sketchSC.updateClosedVenation();
      }
      triggerSketchLiveUpdate();
    });
  }

  // 6d. Branch Geometry & Caliber
  if (ui.inputSketchThick) {
    ui.inputSketchThick.addEventListener('input', (e) => {
      sketchState.thickScale = parseFloat(e.target.value);
      if (ui.numSketchThick) ui.numSketchThick.value = sketchState.thickScale;
      render();
    });
  }

  if (ui.toggleSketchThickness) {
    ui.toggleSketchThickness.addEventListener('change', (e) => {
      sketchState.showThickness = e.target.checked;
      render();
    });
  }

  if (ui.inputSketchColorRoot) {
    ui.inputSketchColorRoot.addEventListener('input', (e) => {
      sketchState.colorRoot = e.target.value;
      render();
    });
  }

  if (ui.inputSketchColorTip) {
    ui.inputSketchColorTip.addEventListener('input', (e) => {
      sketchState.colorTip = e.target.value;
      render();
    });
  }

  // 6e. Root Seeding Strategy
  if (ui.selectRootStrategy) {
    ui.selectRootStrategy.addEventListener('change', (e) => {
      sketchState.rootStrategy = e.target.value;
      setupSketchRoots();
      sketchSC.runToCompletion(180);
      render();
      updateStats();
    });
  }

  if (ui.toolSketchRoot) {
    ui.toolSketchRoot.addEventListener('click', () => {
      sketchState.isRootToolActive = !sketchState.isRootToolActive;
      ui.toolSketchRoot.classList.toggle('active', sketchState.isRootToolActive);
    });
  }

  if (ui.btnSketchResetRoots) {
    ui.btnSketchResetRoots.addEventListener('click', () => {
      sketchState.rootStrategy = 'portals';
      if (ui.selectRootStrategy) ui.selectRootStrategy.value = 'portals';
      setupSketchRoots();
      triggerSketchLiveUpdate();
    });
  }

  // 7. Simulation Controls
  if (ui.btnSketchPlay) ui.btnSketchPlay.addEventListener('click', () => toggleRunning());
  if (ui.btnSketchStep) ui.btnSketchStep.addEventListener('click', () => doStep());
  if (ui.btnSketchReset) {
    ui.btnSketchReset.addEventListener('click', () => {
      sketchSC.resetTree();
      render();
      updateStats();
    });
  }

  // 8. Variations Batch Engine
  if (ui.btnGenerateVariations) {
    ui.btnGenerateVariations.addEventListener('click', () => {
      if (!sketchState.grid) return;
      const variations = sketchState.variationsEngine.generateAll(sketchState.grid);
      renderVariationsDrawer(variations);
      if (ui.variationsDrawer) ui.variationsDrawer.style.display = 'flex';
      if (ui.labelToggleDrawer) ui.labelToggleDrawer.textContent = 'Minimize Variations Matrix';
    });
  }

  if (ui.btnRegenerateAll) {
    ui.btnRegenerateAll.addEventListener('click', () => {
      if (!sketchState.grid) return;
      const variations = sketchState.variationsEngine.generateAll(sketchState.grid);
      renderVariationsDrawer(variations);
    });
  }

  if (ui.btnToggleDrawer) {
    ui.btnToggleDrawer.addEventListener('click', () => {
      if (!ui.variationsDrawer) return;
      const isVisible = ui.variationsDrawer.style.display !== 'none';
      ui.variationsDrawer.style.display = isVisible ? 'none' : 'flex';
      if (ui.labelToggleDrawer) {
        ui.labelToggleDrawer.textContent = isVisible ? 'Open Variations Matrix' : 'Minimize Variations Matrix';
      }
    });
  }

  if (ui.btnCloseDrawer) {
    ui.btnCloseDrawer.addEventListener('click', () => {
      if (ui.variationsDrawer) ui.variationsDrawer.style.display = 'none';
      if (ui.labelToggleDrawer) ui.labelToggleDrawer.textContent = 'Open Variations Matrix';
    });
  }
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

      slider.step = 'any';
      if (isMin) {
        slider.min = val;
        if (parseFloat(slider.value) < val) {
          slider.value = val;
          slider.dispatchEvent(new Event('input', { bubbles: true }));
        }
      } else {
        slider.max = val;
        if (parseFloat(slider.value) > val) {
          slider.value = val;
          slider.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    };

    input.addEventListener('change', updateBound);
    input.addEventListener('blur', updateBound);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        updateBound();
        input.blur();
      }
    });
  });
}

// --- Exact Value Numeric Inputs Integration ---
function initValueInputs() {
  const valInputs = document.querySelectorAll('.val-input');
  valInputs.forEach((numInput) => {
    const sliderId = numInput.getAttribute('data-slider-id');
    const slider = document.getElementById(sliderId);
    if (!slider) return;

    slider.step = 'any';
    numInput.step = 'any';
    numInput.value = slider.value;

    let isSyncing = false;

    const applyVal = () => {
      if (isSyncing) return;
      const rawText = numInput.value !== undefined && numInput.value !== null ? numInput.value.toString().trim() : '';
      if (rawText === '') {
        numInput.value = slider.value;
        return;
      }

      let val = parseFloat(rawText);
      if (isNaN(val)) {
        numInput.value = slider.value;
        return;
      }

      // Safe parameter floor limits
      if (sliderId === 'input-selected-count' || sliderId === 'input-sketch-attractors') {
        val = Math.max(1, Math.round(val));
      } else if (sliderId === 'input-segment' || sliderId === 'input-kill' || sliderId === 'input-sketch-segment' || sliderId === 'input-sketch-kill') {
        val = Math.max(1, val);
      } else if (sliderId === 'input-influence' || sliderId === 'input-sketch-influence') {
        val = Math.max(2, val);
      } else if (sliderId === 'input-thick' || sliderId === 'input-attractor-size' || sliderId === 'input-sketch-thick' || sliderId === 'input-sketch-attractor-size') {
        val = Math.max(0.1, val);
      } else if (sliderId === 'input-rectilinear' || sliderId === 'input-smoothness' || sliderId === 'input-sketch-rectilinear' || sliderId === 'input-sketch-smoothness' || sliderId === 'input-sketch-boundary-bias') {
        val = Math.max(0, Math.min(1, val));
      } else if (sliderId === 'input-loop-rate' || sliderId === 'input-sketch-loop-rate') {
        val = Math.max(0.01, Math.min(1, val));
      }

      isSyncing = true;

      // Auto-expand bounds if typed value exceeds current slider min/max bounds
      const minBoundInput = document.querySelector(`.bound-min[data-slider-id="${sliderId}"]`);
      const maxBoundInput = document.querySelector(`.bound-max[data-slider-id="${sliderId}"]`);

      const currentMin = parseFloat(slider.min);
      const currentMax = parseFloat(slider.max);

      if (!isNaN(currentMin) && val < currentMin) {
        slider.min = val;
        if (minBoundInput) minBoundInput.value = val;
      }
      if (!isNaN(currentMax) && val > currentMax) {
        slider.max = val;
        if (maxBoundInput) maxBoundInput.value = val;
      }

      slider.step = 'any';
      slider.value = val;

      // Trigger slider input event to update state and algorithms
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));

      // Retain the exact typed value in the input
      numInput.value = val;

      isSyncing = false;
      history.push();
    };

    numInput.addEventListener('change', applyVal);
    numInput.addEventListener('blur', applyVal);
    numInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        applyVal();
        numInput.blur();
      }
    });

    // Keep number input in sync when slider moves via mouse dragging
    slider.addEventListener('input', () => {
      if (isSyncing) return;
      if (sliderId === 'input-selected-count') {
        numInput.value = Math.round(parseFloat(slider.value));
      } else {
        numInput.value = slider.value;
      }
    });
  });
}

// --- Main Animation Frame Loop ---
let lastStepTime = 0;
function loop(time) {
  requestAnimationFrame(loop);
  const isRunning = state.mode === 'sketch' ? sketchState.isRunning : state.isRunning;
  const activeSC = state.mode === 'sketch' ? sketchSC : sc;

  if (isRunning && !activeSC.isFinished) {
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
initValueInputs();
initSketchStudio();
history.updateButtons();
updateStats();
loop(0);
