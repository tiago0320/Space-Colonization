export class TreeNode2D {
  constructor(x, y, parent = null, depth = 0) {
    this.id = TreeNode2D.nextId++;
    this.x = x;
    this.y = y;
    this.parent = parent;
    this.children = [];
    this.depth = depth;
    this.thickness = 1.0;
    this.descendantCount = 1;

    // Per-step accumulator
    this.accumX = 0;
    this.accumY = 0;
    this.influenceCount = 0;
  }

  resetInfluence() {
    this.accumX = 0;
    this.accumY = 0;
    this.influenceCount = 0;
  }

  static nextId = 0;
}

export class DrawnShape {
  constructor(options = {}) {
    this.id = DrawnShape.nextId++;
    this.type = options.type || 'rect'; // 'rect' | 'circle'
    this.name = options.name || `${this.type === 'rect' ? 'Rectangle' : 'Circle'} #${this.id}`;

    // Rect dimensions
    this.x1 = options.x1 !== undefined ? options.x1 : -100;
    this.y1 = options.y1 !== undefined ? options.y1 : -200;
    this.x2 = options.x2 !== undefined ? options.x2 : 100;
    this.y2 = options.y2 !== undefined ? options.y2 : -100;

    // Circle dimensions
    this.cx = options.cx !== undefined ? options.cx : 0;
    this.cy = options.cy !== undefined ? options.cy : -150;
    this.radius = options.radius !== undefined ? options.radius : 60;

    this.count = options.count !== undefined ? options.count : 150;
    this.hollow = options.hollow !== undefined ? options.hollow : false;
    this.attractors = [];
    this.generateAttractors();
  }

  generateAttractors() {
    this.attractors = [];
    if (this.type === 'rect') {
      const minX = Math.min(this.x1, this.x2);
      const maxX = Math.max(this.x1, this.x2);
      const minY = Math.min(this.y1, this.y2);
      const maxY = Math.max(this.y1, this.y2);
      const w = maxX - minX;
      const h = maxY - minY;
      if (w <= 0 || h <= 0) return;

      for (let i = 0; i < this.count; i++) {
        let x, y;
        if (this.hollow) {
          const perimeter = 2 * (w + h);
          const dist = Math.random() * perimeter;
          if (dist < w) {
            x = minX + dist;
            y = minY;
          } else if (dist < w + h) {
            x = maxX;
            y = minY + (dist - w);
          } else if (dist < 2 * w + h) {
            x = maxX - (dist - (w + h));
            y = maxY;
          } else {
            x = minX;
            y = maxY - (dist - (2 * w + h));
          }
        } else {
          x = minX + Math.random() * w;
          y = minY + Math.random() * h;
        }
        this.attractors.push({ x, y, id: Math.random(), shapeId: this.id });
      }
    } else if (this.type === 'circle') {
      if (this.radius <= 0) return;
      for (let i = 0; i < this.count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const r = this.hollow ? this.radius * (0.94 + Math.random() * 0.06) : this.radius * Math.sqrt(Math.random());
        const x = this.cx + r * Math.cos(theta);
        const y = this.cy + r * Math.sin(theta);
        this.attractors.push({ x, y, id: Math.random(), shapeId: this.id });
      }
    }
  }

  containsPoint(wx, wy) {
    if (this.type === 'rect') {
      const minX = Math.min(this.x1, this.x2);
      const maxX = Math.max(this.x1, this.x2);
      const minY = Math.min(this.y1, this.y2);
      const maxY = Math.max(this.y1, this.y2);
      return wx >= minX - 8 && wx <= maxX + 8 && wy >= minY - 8 && wy <= maxY + 8;
    } else if (this.type === 'circle') {
      const dist = Math.hypot(wx - this.cx, wy - this.cy);
      return dist <= this.radius + 8;
    }
    return false;
  }

  move(dx, dy) {
    if (this.type === 'rect') {
      this.x1 += dx;
      this.x2 += dx;
      this.y1 += dy;
      this.y2 += dy;
    } else if (this.type === 'circle') {
      this.cx += dx;
      this.cy += dy;
    }
    this.generateAttractors();
  }

  getResizeHandles() {
    if (this.type === 'rect') {
      const minX = Math.min(this.x1, this.x2);
      const maxX = Math.max(this.x1, this.x2);
      const minY = Math.min(this.y1, this.y2);
      const maxY = Math.max(this.y1, this.y2);
      return [
        { name: 'tl', x: minX, y: minY },
        { name: 'tr', x: maxX, y: minY },
        { name: 'bl', x: minX, y: maxY },
        { name: 'br', x: maxX, y: maxY },
      ];
    } else if (this.type === 'circle') {
      return [
        { name: 'radius-r', x: this.cx + this.radius, y: this.cy },
        { name: 'radius-t', x: this.cx, y: this.cy - this.radius },
      ];
    }
    return [];
  }

  getHandleNear(wx, wy, threshold = 12) {
    const handles = this.getResizeHandles();
    for (const h of handles) {
      if (Math.hypot(wx - h.x, wy - h.y) <= threshold) {
        return h.name;
      }
    }
    return null;
  }

  resize(handleName, wx, wy) {
    if (this.type === 'rect') {
      const minX = Math.min(this.x1, this.x2);
      const maxX = Math.max(this.x1, this.x2);
      const minY = Math.min(this.y1, this.y2);
      const maxY = Math.max(this.y1, this.y2);

      if (handleName === 'tl') {
        this.x1 = wx; this.y1 = wy; this.x2 = maxX; this.y2 = maxY;
      } else if (handleName === 'tr') {
        this.x1 = minX; this.y1 = wy; this.x2 = wx; this.y2 = maxY;
      } else if (handleName === 'bl') {
        this.x1 = wx; this.y1 = minY; this.x2 = maxX; this.y2 = wy;
      } else if (handleName === 'br') {
        this.x1 = minX; this.y1 = minY; this.x2 = wx; this.y2 = wy;
      }
    } else if (this.type === 'circle') {
      const r = Math.hypot(wx - this.cx, wy - this.cy);
      this.radius = Math.max(12, r);
    }
    this.generateAttractors();
  }

  static nextId = 1;
}

export class SpaceColonization2D {
  constructor(options = {}) {
    this.influenceRadius = options.influenceRadius || 60;
    this.killRadius = options.killRadius || 12;
    this.segmentLength = options.segmentLength || 8;
    this.tropismX = options.tropismX || 0;
    this.tropismY = options.tropismY !== undefined ? options.tropismY : -0.25;
    this.rectilinearSnap = options.rectilinearSnap || 0;
    this.curvilinearSmoothness = options.curvilinearSmoothness !== undefined ? options.curvilinearSmoothness : 0.5;
    this.closedVenation = options.closedVenation || false; // Open (tree) vs Closed (anastomosing loops)
    this.loopRate = options.loopRate !== undefined ? options.loopRate : 0.5; // Anastomosis loop density
    this.boundaryGrid = options.boundaryGrid || null; // Optional SolidVoidGrid for obstacle avoidance
    this.targetMode = options.targetMode || 'void'; // 'void' or 'solid'

    this.nodes = [];
    this.roots = []; // Array of { id, x, y }
    this.shapes = []; // Array of DrawnShape
    this.manualPoints = []; // Array of { x, y, id }
    this.attractors = []; // Active pool of attractors for growth
    this.anastomosisEdges = []; // Array of { nodeA, nodeB } for closed loop cycles
    this.iterations = 0;
    this.isFinished = false;
  }

  clear() {
    TreeNode2D.nextId = 0;
    DrawnShape.nextId = 1;
    this.nodes = [];
    this.roots = [];
    this.shapes = [];
    this.manualPoints = [];
    this.attractors = [];
    this.anastomosisEdges = [];
    this.iterations = 0;
    this.isFinished = false;
  }

  clearAttractors() {
    this.shapes = [];
    this.manualPoints = [];
    this.attractors = [];
    this.anastomosisEdges = [];
    this.isFinished = false;
  }

  resetTree() {
    TreeNode2D.nextId = 0;
    this.nodes = [];
    this.anastomosisEdges = [];
    this.iterations = 0;
    this.isFinished = false;

    // Create starting node for every root point
    for (const r of this.roots) {
      const freshNode = new TreeNode2D(r.x, r.y);
      this.nodes.push(freshNode);
    }
    this.rebuildAttractors();
  }

  setRoot(x, y) {
    this.roots = [{ id: 1, x, y }];
    this.resetTree();
    return this.roots[0];
  }

  addRoot(x, y) {
    const newId = this.roots.length > 0 ? Math.max(...this.roots.map((r) => r.id)) + 1 : 1;
    const root = { id: newId, x, y };
    this.roots.push(root);
    this.resetTree();
    return root;
  }

  moveRoot(id, x, y) {
    const r = this.roots.find((root) => root.id === id);
    if (r) {
      r.x = x;
      r.y = y;
      if (this.nodes.length <= this.roots.length) {
        this.resetTree();
      }
    }
  }

  removeRoot(id) {
    if (this.roots.length <= 1) return;
    this.roots = this.roots.filter((r) => r.id !== id);
    this.resetTree();
  }

  getRootNear(wx, wy, threshold = 16) {
    for (const r of this.roots) {
      if (Math.hypot(wx - r.x, wy - r.y) <= threshold) {
        return r;
      }
    }
    return null;
  }

  addShape(shape) {
    this.shapes.push(shape);
    this.rebuildAttractors();
    return shape;
  }

  updateShape(shapeId, updates = {}) {
    const shape = this.shapes.find((s) => s.id === shapeId);
    if (!shape) return null;

    if (updates.count !== undefined) shape.count = updates.count;
    if (updates.hollow !== undefined) shape.hollow = updates.hollow;

    shape.generateAttractors();
    this.rebuildAttractors();
    return shape;
  }

  removeShape(shapeId) {
    this.shapes = this.shapes.filter((s) => s.id !== shapeId);
    this.rebuildAttractors();
  }

  rebuildAttractors() {
    this.attractors = [];
    for (const shape of this.shapes) {
      this.attractors.push(...shape.attractors);
    }
    for (const pt of this.manualPoints) {
      this.attractors.push(pt);
    }
    this.isFinished = false;
  }

  getAllAttractors() {
    const list = [];
    for (const shape of this.shapes) {
      if (shape.attractors) list.push(...shape.attractors);
    }
    for (const pt of this.manualPoints) {
      list.push(pt);
    }
    return list;
  }

  addPointAttractor(x, y) {
    const pt = { x, y, id: Math.random() };
    this.manualPoints.push(pt);
    this.attractors.push(pt);
    this.isFinished = false;
    return pt;
  }

  removeAttractorNear(wx, wy, threshold = 14) {
    // 1. Manual points
    for (let i = 0; i < this.manualPoints.length; i++) {
      const pt = this.manualPoints[i];
      if (Math.hypot(wx - pt.x, wy - pt.y) <= threshold) {
        this.manualPoints.splice(i, 1);
        this.rebuildAttractors();
        return true;
      }
    }

    // 2. Shape points
    for (const shape of this.shapes) {
      for (let i = 0; i < shape.attractors.length; i++) {
        const pt = shape.attractors[i];
        if (Math.hypot(wx - pt.x, wy - pt.y) <= threshold) {
          shape.attractors.splice(i, 1);
          shape.count = shape.attractors.length;
          this.rebuildAttractors();
          return true;
        }
      }
    }
    return false;
  }

  runToCompletion(maxSteps = 220) {
    this.resetTree();
    let stepCount = 0;
    while (!this.isFinished && stepCount < maxSteps) {
      const active = this.step();
      if (!active) break;
      stepCount++;
    }
    if (this.closedVenation) {
      this.updateClosedVenation();
    }
    return stepCount;
  }

  step() {
    if (this.attractors.length === 0 || this.nodes.length === 0) {
      this.isFinished = true;
      return false;
    }

    // 1. Reset influence on nodes
    for (let i = 0; i < this.nodes.length; i++) {
      this.nodes[i].resetInfluence();
    }

    const killDistSq = this.killRadius * this.killRadius;
    const inflDistSq = this.influenceRadius * this.influenceRadius;

    const remainingAttractors = [];
    let killed = 0;

    // 2. Associate attractors with nearest nodes
    for (let i = 0; i < this.attractors.length; i++) {
      const attr = this.attractors[i];
      let closestNode = null;
      let minDistanceSq = Infinity;

      for (let j = 0; j < this.nodes.length; j++) {
        const node = this.nodes[j];
        const dx = attr.x - node.x;
        const dy = attr.y - node.y;
        const dSq = dx * dx + dy * dy;

        if (dSq < minDistanceSq) {
          minDistanceSq = dSq;
          closestNode = node;
        }
      }

      // Check kill radius
      if (closestNode && minDistanceSq <= killDistSq) {
        killed++;
        continue;
      }

      // Check influence radius
      if (closestNode && minDistanceSq <= inflDistSq) {
        const dist = Math.sqrt(minDistanceSq);
        if (dist > 0.0001) {
          closestNode.accumX += (attr.x - closestNode.x) / dist;
          closestNode.accumY += (attr.y - closestNode.y) / dist;
          closestNode.influenceCount++;
        }
      }

      remainingAttractors.push(attr);
    }

    this.attractors = remainingAttractors;

    // 3. Grow branches from influenced nodes
    let newNodesCreated = 0;
    const nodeCount = this.nodes.length;

    for (let i = 0; i < nodeCount; i++) {
      const node = this.nodes[i];
      if (node.influenceCount > 0) {
        let dirX = node.accumX / node.influenceCount;
        let dirY = node.accumY / node.influenceCount;

        // Apply tropism (e.g. upward load/growth bias)
        dirX += this.tropismX;
        dirY += this.tropismY;

        let len = Math.hypot(dirX, dirY);
        if (len > 0.0001) {
          dirX /= len;
          dirY /= len;
        } else {
          dirX = 0;
          dirY = -1;
        }

        // 1. Curvilinear Inertia (smooth curve from parent direction)
        if (node.parent && this.curvilinearSmoothness > 0) {
          let pDirX = node.x - node.parent.x;
          let pDirY = node.y - node.parent.y;
          const pLen = Math.hypot(pDirX, pDirY);
          if (pLen > 0.0001) {
            pDirX /= pLen;
            pDirY /= pLen;
            const blend = (1.0 - this.rectilinearSnap) * (this.curvilinearSmoothness * 0.7);
            dirX = dirX * (1 - blend) + pDirX * blend;
            dirY = dirY * (1 - blend) + pDirY * blend;
            const blendedLen = Math.hypot(dirX, dirY);
            if (blendedLen > 0.0001) {
              dirX /= blendedLen;
              dirY /= blendedLen;
            }
          }
        }

        // 2. Rectilinear Orthogonal Snapping (90-degree Grid)
        if (this.rectilinearSnap > 0.01) {
          let orthoX = 0;
          let orthoY = 0;
          if (Math.abs(dirX) >= Math.abs(dirY)) {
            orthoX = Math.sign(dirX) || 1;
            orthoY = 0;
          } else {
            orthoX = 0;
            orthoY = Math.sign(dirY) || 1;
          }

          dirX = dirX * (1 - this.rectilinearSnap) + orthoX * this.rectilinearSnap;
          dirY = dirY * (1 - this.rectilinearSnap) + orthoY * this.rectilinearSnap;
          const snapLen = Math.hypot(dirX, dirY);
          if (snapLen > 0.0001) {
            dirX /= snapLen;
            dirY /= snapLen;
          }
        }

        // Add child node
        const childX = node.x + dirX * this.segmentLength;
        const childY = node.y + dirY * this.segmentLength;

        // Boundary collision check
        if (this.boundaryGrid) {
          const isClear = this.boundaryGrid.isRayClear(node.x, node.y, childX, childY, this.targetMode);
          if (!isClear) {
            continue;
          }
        }

        const child = new TreeNode2D(childX, childY, node, node.depth + 1);
        node.children.push(child);
        this.nodes.push(child);
        newNodesCreated++;
      }
    }

    this.iterations++;

    // 4. Update Murray's law branch caliber
    if (newNodesCreated > 0) {
      this.updateBranchThickness();
      if (this.closedVenation) {
        this.updateClosedVenation();
      }
    }

    if (this.attractors.length === 0 || newNodesCreated === 0) {
      this.isFinished = true;
      return false;
    }

    return true;
  }

  updateBranchThickness() {
    for (let i = 0; i < this.nodes.length; i++) {
      this.nodes[i].descendantCount = 1;
    }

    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      if (node.parent) {
        node.parent.descendantCount += node.descendantCount;
      }
    }

    const baseThick = 1.0;
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      node.thickness = baseThick * Math.pow(node.descendantCount, 0.44);
    }
  }

  updateClosedVenation() {
    this.anastomosisEdges = [];
    if (!this.closedVenation || this.loopRate <= 0.01 || this.nodes.length < 6) return;

    // Search radius: scales with segment length and loop density
    const maxDist = this.segmentLength * (1.2 + this.loopRate * 2.5);
    const maxDistSq = maxDist * maxDist;
    const linkCounts = new Map();

    for (let i = 0; i < this.nodes.length; i++) {
      const u = this.nodes[i];
      if (u.depth < 2) continue; // Skip roots and first segments

      const uLinks = linkCounts.get(u.id) || 0;
      if (uLinks >= 2) continue;

      for (let j = i + 1; j < this.nodes.length; j++) {
        const v = this.nodes[j];
        if (v.depth < 2) continue;
        if (u.parent === v || v.parent === u) continue;
        if (u.parent && u.parent.parent === v) continue;
        if (v.parent && v.parent.parent === u) continue;

        const vLinks = linkCounts.get(v.id) || 0;
        if (vLinks >= 2) continue;

        const dx = u.x - v.x;
        const dy = u.y - v.y;
        const distSq = dx * dx + dy * dy;

        if (distSq <= maxDistSq) {
          if (this.boundaryGrid) {
            const isClear = this.boundaryGrid.isRayClear(u.x, u.y, v.x, v.y, this.targetMode);
            if (!isClear) continue;
          }
          this.anastomosisEdges.push({ nodeA: u, nodeB: v });
          linkCounts.set(u.id, uLinks + 1);
          linkCounts.set(v.id, vLinks + 1);
          break;
        }
      }
    }
  }

  // Export 2D Section as clean SVG CAD vector format
  exportToSVG(width = 1200, height = 800, colorRoot = '#0ea5e9', colorTip = '#f43f5e', showThickness = true) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const n of this.nodes) {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    }
    const pad = 40;
    minX -= pad; maxX += pad; minY -= pad; maxY += pad;
    const viewW = maxX - minX;
    const viewH = maxY - minY;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${viewW} ${viewH}" width="${viewW}" height="${viewH}" style="background:#000000">\n`;
    svg += `<g fill="none" stroke-linecap="round" stroke-linejoin="round">\n`;

    let maxDepth = 1;
    for (const n of this.nodes) if (n.depth > maxDepth) maxDepth = n.depth;

    // Primary hierarchical branches
    for (const node of this.nodes) {
      if (node.parent) {
        const t = node.depth / maxDepth;
        const strokeW = showThickness ? Math.max(1.0, node.thickness * 0.85).toFixed(2) : '1.0';
        svg += `  <line x1="${node.parent.x.toFixed(2)}" y1="${node.parent.y.toFixed(2)}" x2="${node.x.toFixed(2)}" y2="${node.y.toFixed(2)}" stroke="${t > 0.5 ? colorTip : colorRoot}" stroke-width="${strokeW}" opacity="0.9"/>\n`;
      }
    }

    // Closed venation anastomosis loops
    if (this.closedVenation && this.anastomosisEdges.length > 0) {
      for (const edge of this.anastomosisEdges) {
        const t = (edge.nodeA.depth + edge.nodeB.depth) / (2 * maxDepth);
        const strokeW = showThickness ? Math.max(0.8, Math.min(edge.nodeA.thickness, edge.nodeB.thickness) * 0.7).toFixed(2) : '1.0';
        svg += `  <line x1="${edge.nodeA.x.toFixed(2)}" y1="${edge.nodeA.y.toFixed(2)}" x2="${edge.nodeB.x.toFixed(2)}" y2="${edge.nodeB.y.toFixed(2)}" stroke="${t > 0.5 ? colorTip : colorRoot}" stroke-width="${strokeW}" opacity="0.85"/>\n`;
      }
    }

    svg += `</g>\n</svg>`;
    return svg;
  }

  // Export 2D Section as AutoCAD / Rhino DXF vector drawing with dedicated layers
  exportToDXF() {
    let dxf = '0\nSECTION\n2\nHEADER\n0\nENDSEC\n';
    dxf += '0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n4\n';

    // Layer definitions (Color: 3 = Green/Cyan, 4 = Cyan, 1 = Red, 7 = White)
    dxf += '0\nLAYER\n2\nTREE_BRANCHES\n70\n0\n62\n3\n6\nCONTINUOUS\n';
    dxf += '0\nLAYER\n2\nANASTOMOSIS_LOOPS\n70\n0\n62\n4\n6\nCONTINUOUS\n';
    dxf += '0\nLAYER\n2\nROOTS\n70\n0\n62\n1\n6\nCONTINUOUS\n';
    dxf += '0\nLAYER\n2\nBOUNDARY_SHAPES\n70\n0\n62\n7\n6\nCONTINUOUS\n';
    dxf += '0\nENDTAB\n0\nENDSEC\n';

    dxf += '0\nSECTION\n2\nENTITIES\n';

    // 1. Primary branches
    for (const node of this.nodes) {
      if (node.parent) {
        // Section coordinates: in CAD Y is positive upwards, so invert Y (-node.y)
        const x1 = node.parent.x.toFixed(3);
        const y1 = (-node.parent.y).toFixed(3);
        const x2 = node.x.toFixed(3);
        const y2 = (-node.y).toFixed(3);

        dxf += '0\nLINE\n8\nTREE_BRANCHES\n';
        dxf += `10\n${x1}\n20\n${y1}\n30\n0.0\n`;
        dxf += `11\n${x2}\n20\n${y2}\n30\n0.0\n`;
      }
    }

    // 2. Closed loops
    if (this.closedVenation && this.anastomosisEdges.length > 0) {
      for (const edge of this.anastomosisEdges) {
        const x1 = edge.nodeA.x.toFixed(3);
        const y1 = (-edge.nodeA.y).toFixed(3);
        const x2 = edge.nodeB.x.toFixed(3);
        const y2 = (-edge.nodeB.y).toFixed(3);

        dxf += '0\nLINE\n8\nANASTOMOSIS_LOOPS\n';
        dxf += `10\n${x1}\n20\n${y1}\n30\n0.0\n`;
        dxf += `11\n${x2}\n20\n${y2}\n30\n0.0\n`;
      }
    }

    // 3. Roots
    for (const root of this.roots) {
      dxf += '0\nCIRCLE\n8\nROOTS\n';
      dxf += `10\n${root.x.toFixed(3)}\n20\n${(-root.y).toFixed(3)}\n30\n0.0\n`;
      dxf += '40\n6.0\n';
    }

    // 4. Boundary shapes
    for (const s of this.shapes) {
      if (s.type === 'rect') {
        const minX = Math.min(s.x1, s.x2).toFixed(3);
        const maxX = Math.max(s.x1, s.x2).toFixed(3);
        const minY = (-Math.max(s.y1, s.y2)).toFixed(3);
        const maxY = (-Math.min(s.y1, s.y2)).toFixed(3);

        const corners = [
          [minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY], [minX, minY]
        ];
        for (let i = 0; i < 4; i++) {
          dxf += '0\nLINE\n8\nBOUNDARY_SHAPES\n';
          dxf += `10\n${corners[i][0]}\n20\n${corners[i][1]}\n30\n0.0\n`;
          dxf += `11\n${corners[i+1][0]}\n20\n${corners[i+1][1]}\n30\n0.0\n`;
        }
      } else if (s.type === 'circle') {
        dxf += '0\nCIRCLE\n8\nBOUNDARY_SHAPES\n';
        dxf += `10\n${s.cx.toFixed(3)}\n20\n${(-s.cy).toFixed(3)}\n30\n0.0\n`;
        dxf += `40\n${s.radius.toFixed(3)}\n`;
      }
    }

    dxf += '0\nENDSEC\n0\nEOF\n';
    return dxf;
  }

  // Export 3D Tubular Polygonal Mesh (Wavefront .OBJ) ready for direct Rhino 3D import / SubD
  exportToOBJ(radialSegments = 8, caliberMultiplier = 1.0) {
    const vertices = [];
    const faces = [];

    const addCylinder = (p1, p2, r1, r2) => {
      const dx = p2.x - p1.x;
      const dy = -(p2.y - p1.y); // Invert Y for Rhino architectural section
      const len = Math.hypot(dx, dy);
      if (len < 0.001) return;

      const ux = dx / len;
      const uy = dy / len;

      // Normal perpendicular to branch direction in the section plane (XY)
      const nx = -uy;
      const ny = ux;

      // Binormal in Z (depth out of page)
      const bz = 1;

      const baseIdx = vertices.length + 1; // OBJ is 1-indexed

      // Create ring at p1
      const p1x = p1.x;
      const p1y = -p1.y;
      const p1z = 0;

      for (let i = 0; i < radialSegments; i++) {
        const theta = (2 * Math.PI * i) / radialSegments;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        const vx = p1x + r1 * (cosT * nx);
        const vy = p1y + r1 * (cosT * ny);
        const vz = p1z + r1 * (sinT * bz);
        vertices.push([vx.toFixed(3), vy.toFixed(3), vz.toFixed(3)]);
      }

      // Create ring at p2
      const p2x = p2.x;
      const p2y = -p2.y;
      const p2z = 0;

      for (let i = 0; i < radialSegments; i++) {
        const theta = (2 * Math.PI * i) / radialSegments;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        const vx = p2x + r2 * (cosT * nx);
        const vy = p2y + r2 * (cosT * ny);
        const vz = p2z + r2 * (sinT * bz);
        vertices.push([vx.toFixed(3), vy.toFixed(3), vz.toFixed(3)]);
      }

      // Create quad faces connecting Ring 1 to Ring 2
      for (let i = 0; i < radialSegments; i++) {
        const next = (i + 1) % radialSegments;
        const v1 = baseIdx + i;
        const v2 = baseIdx + next;
        const v3 = baseIdx + radialSegments + next;
        const v4 = baseIdx + radialSegments + i;
        faces.push([v1, v2, v3, v4]);
      }
    };

    // 1. Build tubes for all primary branches
    for (const node of this.nodes) {
      if (node.parent) {
        const rParent = Math.max(0.75, (node.parent.thickness || 1.0) * caliberMultiplier * 0.7);
        const rChild = Math.max(0.5, (node.thickness || 1.0) * caliberMultiplier * 0.7);
        addCylinder(node.parent, node, rParent, rChild);
      }
    }

    // 2. Build tubes for all closed venation anastomosis loops
    if (this.closedVenation && this.anastomosisEdges.length > 0) {
      for (const edge of this.anastomosisEdges) {
        const rLoop = Math.max(0.4, Math.min(edge.nodeA.thickness, edge.nodeB.thickness) * caliberMultiplier * 0.5);
        addCylinder(edge.nodeA, edge.nodeB, rLoop, rLoop);
      }
    }

    // Compose OBJ text
    let obj = '# Space Colonization 3D Architectural Section Mesh for Rhino\n';
    obj += '# Units: Millimeters / Standard CAD Units\n';
    obj += `o Space_Colonization_Mesh_${this.nodes.length}nodes\n\n`;

    for (let i = 0; i < vertices.length; i++) {
      obj += `v ${vertices[i][0]} ${vertices[i][1]} ${vertices[i][2]}\n`;
    }
    obj += '\n';

    for (let i = 0; i < faces.length; i++) {
      const f = faces[i];
      obj += `f ${f[0]} ${f[1]} ${f[2]} ${f[3]}\n`;
    }

    return obj;
  }
}

