/**
 * variations-engine.js
 * 2D Space Colonization Variations Generator for Architectural Solid/Void Plans.
 * Generates distinct spatial typologies, computes metrics, and renders live thumbnail cards.
 */

import { SpaceColonization2D } from './algorithm.js';

export const VARIATION_PRESETS = [
  {
    id: 'var-circulation',
    name: 'Circulation Arteries',
    tag: 'Dendritic Spine',
    target: 'void',
    description: 'Continuous organic circulation spines reaching into all chambers and spatial pockets.',
    params: {
      influenceRadius: 75,
      killRadius: 12,
      segmentLength: 9,
      rectilinearSnap: 0.0,
      curvilinearSmoothness: 0.65,
      closedVenation: false,
      loopRate: 0.2,
      tropismY: -0.15,
      showThickness: true,
      thickScale: 1.8,
      colorRoot: '#ffffff',
      colorTip: '#a1a1aa',
      attractorCount: 650,
      boundaryBias: 0.2,
    },
    rootStrategy: 'portals', // Place root at entrance portal
  },
  {
    id: 'var-orthogonal',
    name: 'Orthogonal Partition',
    tag: '90° Grid Layout',
    target: 'void',
    description: 'Strict 90-degree rectilinear subdivision creating rooms, corridors, and modular bays.',
    params: {
      influenceRadius: 62,
      killRadius: 11,
      segmentLength: 8,
      rectilinearSnap: 0.95,
      curvilinearSmoothness: 0.05,
      closedVenation: false,
      loopRate: 0.2,
      tropismY: 0.0,
      showThickness: true,
      thickScale: 1.6,
      colorRoot: '#ffffff',
      colorTip: '#71717a',
      attractorCount: 600,
      boundaryBias: 0.35,
    },
    rootStrategy: 'bottom-center',
  },
  {
    id: 'var-reticulate',
    name: 'Reticulate Looping Web',
    tag: 'Closed Anastomosis',
    target: 'void',
    description: 'Closed venation loops creating continuous ring circuits around courtyards and rooms.',
    params: {
      influenceRadius: 65,
      killRadius: 13,
      segmentLength: 8,
      rectilinearSnap: 0.2,
      curvilinearSmoothness: 0.45,
      closedVenation: true,
      loopRate: 0.8,
      tropismY: -0.05,
      showThickness: false,
      thickScale: 1.5,
      colorRoot: '#ffffff',
      colorTip: '#a1a1aa',
      attractorCount: 750,
      boundaryBias: 0.3,
    },
    rootStrategy: 'multi-chamber',
  },
  {
    id: 'var-structural',
    name: 'Structural Mass Infiltration',
    tag: 'Solid Infiltration',
    target: 'solid',
    description: 'Branching within solid walls and columns generating organic structural trabecular ribs.',
    params: {
      influenceRadius: 52,
      killRadius: 9,
      segmentLength: 7,
      rectilinearSnap: 0.0,
      curvilinearSmoothness: 0.5,
      closedVenation: false,
      loopRate: 0.3,
      tropismY: -0.4,
      showThickness: true,
      thickScale: 2.2,
      colorRoot: '#ffffff',
      colorTip: '#52525b',
      attractorCount: 700,
      boundaryBias: 0.15,
    },
    rootStrategy: 'base-perimeter',
  },
  {
    id: 'var-porous',
    name: 'Porous Cellular Pockets',
    tag: 'Spongiform Micro-Space',
    target: 'void',
    description: 'Dense, micro-scale branching partitioning space into cellular, acoustic alcoves.',
    params: {
      influenceRadius: 40,
      killRadius: 8,
      segmentLength: 5,
      rectilinearSnap: 0.1,
      curvilinearSmoothness: 0.35,
      closedVenation: true,
      loopRate: 0.45,
      tropismY: 0.0,
      showThickness: false,
      thickScale: 1.1,
      colorRoot: '#ffffff',
      colorTip: '#a1a1aa',
      attractorCount: 950,
      boundaryBias: 0.1,
    },
    rootStrategy: 'multi-chamber',
  },
  {
    id: 'var-axial',
    name: 'Axial Directional Flow',
    tag: 'Zonal Flow Channel',
    target: 'void',
    description: 'Strong directional tropism forming primary programmatic corridors and light ventilation paths.',
    params: {
      influenceRadius: 85,
      killRadius: 15,
      segmentLength: 11,
      rectilinearSnap: 0.3,
      curvilinearSmoothness: 0.6,
      closedVenation: false,
      loopRate: 0.2,
      tropismY: -0.7,
      showThickness: true,
      thickScale: 2.0,
      colorRoot: '#ffffff',
      colorTip: '#a1a1aa',
      attractorCount: 550,
      boundaryBias: 0.15,
    },
    rootStrategy: 'portals',
  },
];

export class VariationsEngine {
  constructor() {
    this.variations = [...VARIATION_PRESETS];
    this.results = new Map(); // id -> { sc, metrics, thumbnailCanvas }
  }

  /**
   * Determine starting root points for a given strategy and grid
   */
  getRootsForStrategy(strategy, grid, targetMode = 'void') {
    const roots = [];
    const chambers = grid.chambers || [];

    if (strategy === 'portals') {
      const portals = grid.findPortals(targetMode, 2);
      if (portals.length > 0) {
        portals.forEach((p, idx) => roots.push({ id: idx + 1, x: p.wx, y: p.wy }));
      } else {
        roots.push({ id: 1, x: 0, y: grid.worldHeight * 0.35 });
      }
    } else if (strategy === 'multi-chamber') {
      if (chambers.length > 0) {
        const topChambers = chambers.slice(0, Math.min(3, chambers.length));
        topChambers.forEach((c, idx) => {
          roots.push({ id: idx + 1, x: c.centroid.wx, y: c.centroid.wy });
        });
      } else {
        roots.push({ id: 1, x: -grid.worldWidth * 0.2, y: 0 });
        roots.push({ id: 2, x: grid.worldWidth * 0.2, y: 0 });
      }
    } else if (strategy === 'base-perimeter') {
      // For solid structure, place roots at bottom solid foundation points
      const samples = grid.sampleAttractors(30, 'solid', 0.5);
      const bottomCandidates = samples.filter((p) => p.y > grid.worldHeight * 0.25);
      if (bottomCandidates.length > 0) {
        roots.push({ id: 1, x: bottomCandidates[0].x, y: bottomCandidates[0].y });
        if (bottomCandidates.length > 1) {
          roots.push({ id: 2, x: bottomCandidates[bottomCandidates.length - 1].x, y: bottomCandidates[bottomCandidates.length - 1].y });
        }
      } else {
        roots.push({ id: 1, x: 0, y: grid.worldHeight * 0.35 });
      }
    } else {
      // Default bottom center
      roots.push({ id: 1, x: 0, y: grid.worldHeight * 0.35 });
    }

    return roots;
  }

  /**
   * Run simulation for one variation definition against a SolidVoidGrid
   */
  generateVariation(variationDef, grid, options = {}) {
    const p = variationDef.params;
    const targetMode = variationDef.target || 'void';

    const sc = new SpaceColonization2D({
      influenceRadius: p.influenceRadius,
      killRadius: p.killRadius,
      segmentLength: p.segmentLength,
      rectilinearSnap: p.rectilinearSnap,
      curvilinearSmoothness: p.curvilinearSmoothness,
      closedVenation: p.closedVenation,
      loopRate: p.loopRate,
      tropismY: p.tropismY,
      boundaryGrid: grid,
      targetMode: targetMode,
    });

    // 1. Setup roots
    const roots = this.getRootsForStrategy(variationDef.rootStrategy, grid, targetMode);
    sc.roots = roots;
    sc.resetTree();

    // 2. Sample attractors inside grid
    const attractors = grid.sampleAttractors(p.attractorCount, targetMode, p.boundaryBias);
    sc.manualPoints = attractors;
    sc.rebuildAttractors();

    // 3. Run to completion
    const maxSteps = options.maxSteps || 160;
    sc.runToCompletion(maxSteps);

    // 4. Calculate metrics
    const metrics = this.calculateMetrics(sc, grid, targetMode);

    // 5. Render miniature preview thumbnail
    const thumbCanvas = this.renderThumbnail(sc, grid, variationDef, 240, 200);

    const result = {
      def: variationDef,
      sc,
      metrics,
      thumbCanvas,
    };

    this.results.set(variationDef.id, result);
    return result;
  }

  /**
   * Run batch simulation for all variations
   */
  generateAll(grid, onProgress = null) {
    const total = this.variations.length;
    const outputs = [];

    for (let i = 0; i < total; i++) {
      const varDef = this.variations[i];
      const res = this.generateVariation(varDef, grid);
      outputs.push(res);
      if (onProgress) {
        onProgress(i + 1, total, res);
      }
    }

    return outputs;
  }

  /**
   * Calculate architectural spatial metrics
   */
  calculateMetrics(sc, grid, targetMode) {
    let totalLength = 0;
    for (const node of sc.nodes) {
      if (node.parent) {
        totalLength += Math.hypot(node.x - node.parent.x, node.y - node.parent.y);
      }
    }
    if (sc.closedVenation) {
      for (const edge of sc.anastomosisEdges) {
        totalLength += Math.hypot(edge.nodeA.x - edge.nodeB.x, edge.nodeA.y - edge.nodeB.y);
      }
    }

    // Estimate coverage: nodes relative to sampled attractors
    const originalAttractors = sc.manualPoints.length || 1;
    const remainingAttractors = sc.attractors.length;
    const colonizedRatio = Math.max(0, Math.min(100, Math.round(((originalAttractors - remainingAttractors) / originalAttractors) * 100)));

    let maxDepth = 1;
    for (const n of sc.nodes) {
      if (n.depth > maxDepth) maxDepth = n.depth;
    }

    return {
      nodeCount: sc.nodes.length,
      branchLength: Math.round(totalLength),
      coveragePct: colonizedRatio,
      loopCount: sc.anastomosisEdges.length,
      maxDepth,
    };
  }

  /**
   * Render miniature preview card thumbnail for UI gallery
   */
  renderThumbnail(sc, grid, variationDef, w = 240, h = 200) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Dark canvas background
    ctx.fillStyle = '#08080a';
    ctx.fillRect(0, 0, w, h);

    // Coordinate mapping from grid world to thumbnail canvas
    const pad = 12;
    const drawW = w - pad * 2;
    const drawH = h - pad * 2;

    const scaleX = drawW / grid.worldWidth;
    const scaleY = drawH / grid.worldHeight;
    const scale = Math.min(scaleX, scaleY);

    const toScreen = (wx, wy) => {
      return {
        x: w / 2 + (wx - (grid.worldX + grid.worldWidth / 2)) * scale,
        y: h / 2 + (wy - (grid.worldY + grid.worldHeight / 2)) * scale,
      };
    };

    // 1. Draw Solid / Void Grid Underlay
    const stepX = grid.worldWidth / grid.width;
    const stepY = grid.worldHeight / grid.height;
    const skip = Math.max(1, Math.floor(grid.width / 60)); // Low-res fast render

    for (let gy = 0; gy < grid.height; gy += skip) {
      for (let gx = 0; gx < grid.width; gx += skip) {
        const val = grid.get(gx, gy);
        if (val === 1) {
          // Solid: subtle grey massing
          const worldPos = grid.gridToWorld(gx, gy);
          const sp = toScreen(worldPos.wx, worldPos.wy);
          const rw = stepX * scale * skip;
          const rh = stepY * scale * skip;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.09)';
          ctx.fillRect(sp.x - rw / 2, sp.y - rh / 2, rw + 0.5, rh + 0.5);
        }
      }
    }

    // 2. Draw Branching Space Colonization
    if (sc.nodes.length > 1) {
      let maxDepth = 1;
      for (const n of sc.nodes) if (n.depth > maxDepth) maxDepth = n.depth;

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const node of sc.nodes) {
        if (!node.parent) continue;
        const p1 = toScreen(node.parent.x, node.parent.y);
        const p2 = toScreen(node.x, node.y);
        const t = node.depth / maxDepth;

        // Subtle gradient: white roots to silver tips
        ctx.strokeStyle = t > 0.6 ? '#a1a1aa' : '#ffffff';
        ctx.lineWidth = Math.max(0.6, (node.thickness || 1) * 0.7 * scale * 1.5);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      // Draw closed anastomosis loops
      if (sc.closedVenation && sc.anastomosisEdges.length > 0) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = Math.max(0.5, 0.8 * scale);
        for (const edge of sc.anastomosisEdges) {
          const p1 = toScreen(edge.nodeA.x, edge.nodeA.y);
          const p2 = toScreen(edge.nodeB.x, edge.nodeB.y);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }

    // 3. Draw Roots
    for (const r of sc.roots) {
      const sp = toScreen(r.x, r.y);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    return canvas;
  }
}
