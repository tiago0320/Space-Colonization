/**
 * image-analyzer.js
 * High-performance Solid vs Void 2D Image Analysis & Boundary Grid
 * for Space Colonization in Architectural Plans and Sketches.
 */

export class SolidVoidGrid {
  constructor(width, height, worldWidth = 600, worldHeight = 600) {
    this.width = width;
    this.height = height;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.worldX = -worldWidth / 2;
    this.worldY = -worldHeight / 2;
    // 0 = Void, 1 = Solid
    this.data = new Uint8Array(width * height);
    this.chambers = []; // Discovered void chambers
  }

  worldToGrid(wx, wy) {
    const gx = Math.floor(((wx - this.worldX) / this.worldWidth) * this.width);
    const gy = Math.floor(((wy - this.worldY) / this.worldHeight) * this.height);
    return { gx, gy };
  }

  gridToWorld(gx, gy) {
    const wx = this.worldX + ((gx + 0.5) / this.width) * this.worldWidth;
    const wy = this.worldY + ((gy + 0.5) / this.height) * this.worldHeight;
    return { wx, wy };
  }

  isInside(gx, gy) {
    return gx >= 0 && gx < this.width && gy >= 0 && gy < this.height;
  }

  isInsideWorld(wx, wy) {
    return wx >= this.worldX && wx <= this.worldX + this.worldWidth &&
           wy >= this.worldY && wy <= this.worldY + this.worldHeight;
  }

  get(gx, gy) {
    if (!this.isInside(gx, gy)) return 1; // Treat outside as solid boundary
    return this.data[gy * this.width + gx];
  }

  set(gx, gy, val) {
    if (this.isInside(gx, gy)) {
      this.data[gy * this.width + gx] = val ? 1 : 0;
    }
  }

  getWorld(wx, wy) {
    const { gx, gy } = this.worldToGrid(wx, wy);
    return this.get(gx, gy);
  }

  /**
   * Ray-march collision check between two world points.
   * Ensures branches do not penetrate opposite domains (e.g. solid walls when colonizing void).
   */
  isRayClear(wx1, wy1, wx2, wy2, targetMode = 'void') {
    const p1 = this.worldToGrid(wx1, wy1);
    const p2 = this.worldToGrid(wx2, wy2);

    const targetVal = targetMode === 'solid' ? 1 : 0;

    let x0 = p1.gx;
    let y0 = p1.gy;
    const x1 = p2.gx;
    const y1 = p2.gy;

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    // Safety step count
    let steps = 0;
    const maxSteps = dx + dy + 2;

    while (steps++ < maxSteps) {
      if (!this.isInside(x0, y0)) return false;
      const val = this.get(x0, y0);
      if (val !== targetVal) {
        return false; // Collided with boundary/opposite domain
      }
      if (x0 === x1 && y0 === y1) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
    return true;
  }

  /**
   * Sample attractors within the target domain (void or solid).
   * Supports boundary bias to attract growth along wall contours.
   */
  sampleAttractors(count = 500, targetMode = 'void', boundaryBias = 0.25) {
    const targetVal = targetMode === 'solid' ? 1 : 0;
    const candidates = [];
    const boundaryCandidates = [];

    for (let gy = 1; gy < this.height - 1; gy++) {
      for (let gx = 1; gx < this.width - 1; gx++) {
        if (this.data[gy * this.width + gx] === targetVal) {
          candidates.push({ gx, gy });

          // Check if it neighbors an opposite cell (boundary contour)
          const isBoundary =
            this.get(gx - 1, gy) !== targetVal ||
            this.get(gx + 1, gy) !== targetVal ||
            this.get(gx, gy - 1) !== targetVal ||
            this.get(gx, gy + 1) !== targetVal;

          if (isBoundary) {
            boundaryCandidates.push({ gx, gy });
          }
        }
      }
    }

    if (candidates.length === 0) return [];

    const attractors = [];
    const cellW = this.worldWidth / this.width;
    const cellH = this.worldHeight / this.height;

    for (let i = 0; i < count; i++) {
      let pick;
      if (boundaryCandidates.length > 0 && Math.random() < boundaryBias) {
        pick = boundaryCandidates[Math.floor(Math.random() * boundaryCandidates.length)];
      } else {
        pick = candidates[Math.floor(Math.random() * candidates.length)];
      }

      // Add sub-cell jitter for smooth organic distribution
      const jitterX = (Math.random() - 0.5) * cellW * 0.9;
      const jitterY = (Math.random() - 0.5) * cellH * 0.9;
      const worldPos = this.gridToWorld(pick.gx, pick.gy);

      const pt = {
        x: worldPos.wx + jitterX,
        y: worldPos.wy + jitterY,
        id: Math.random(),
      };

      // Double check point validity
      if (this.getWorld(pt.x, pt.y) === targetVal) {
        attractors.push(pt);
      }
    }

    return attractors;
  }

  /**
   * Connected component labeling on void (or solid) regions.
   * Detects distinct architectural rooms/chambers and computes their centroids.
   */
  detectChambers(targetMode = 'void', minArea = 50) {
    const targetVal = targetMode === 'solid' ? 1 : 0;
    const visited = new Uint8Array(this.width * this.height);
    const chambers = [];

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        if (visited[idx] || this.data[idx] !== targetVal) continue;

        // BFS flood fill
        const queue = [{ x, y }];
        visited[idx] = 1;
        let sumX = 0;
        let sumY = 0;
        let area = 0;
        let minGx = x, maxGx = x, minGy = y, maxGy = y;

        while (queue.length > 0) {
          const pt = queue.pop();
          area++;
          sumX += pt.x;
          sumY += pt.y;

          if (pt.x < minGx) minGx = pt.x;
          if (pt.x > maxGx) maxGx = pt.x;
          if (pt.y < minGy) minGy = pt.y;
          if (pt.y > maxGy) maxGy = pt.y;

          const neighbors = [
            { x: pt.x + 1, y: pt.y },
            { x: pt.x - 1, y: pt.y },
            { x: pt.x, y: pt.y + 1 },
            { x: pt.x, y: pt.y - 1 },
          ];

          for (const n of neighbors) {
            if (this.isInside(n.x, n.y)) {
              const nIdx = n.y * this.width + n.x;
              if (!visited[nIdx] && this.data[nIdx] === targetVal) {
                visited[nIdx] = 1;
                queue.push(n);
              }
            }
          }
        }

        if (area >= minArea) {
          const centroidGx = sumX / area;
          const centroidGy = sumY / area;
          const worldCentroid = this.gridToWorld(centroidGx, centroidGy);
          chambers.push({
            id: chambers.length + 1,
            area,
            centroid: worldCentroid,
            bounds: {
              minX: this.worldX + (minGx / this.width) * this.worldWidth,
              maxX: this.worldX + (maxGx / this.width) * this.worldWidth,
              minY: this.worldY + (minGy / this.height) * this.worldHeight,
              maxY: this.worldY + (maxGy / this.height) * this.worldHeight,
            },
          });
        }
      }
    }

    // Sort chambers by area descending (largest rooms first)
    chambers.sort((a, b) => b.area - a.area);
    this.chambers = chambers;
    return chambers;
  }

  /**
   * Find entry portals along the outer edge or room boundaries
   */
  findPortals(targetMode = 'void', maxCount = 4) {
    const targetVal = targetMode === 'solid' ? 1 : 0;
    const portals = [];

    // Check bottom perimeter (ground / entrance)
    for (let x = Math.floor(this.width * 0.1); x < this.width * 0.9; x += Math.floor(this.width / 16)) {
      for (let y = this.height - 2; y >= this.height - 20; y--) {
        if (this.get(x, y) === targetVal) {
          portals.push(this.gridToWorld(x, y));
          break;
        }
      }
      if (portals.length >= maxCount) break;
    }

    // If none found at bottom, check center or chamber centroids
    if (portals.length === 0 && this.chambers.length > 0) {
      portals.push(this.chambers[0].centroid);
    } else if (portals.length === 0) {
      portals.push({ wx: 0, wy: this.worldHeight * 0.4 });
    }

    return portals;
  }
}

export class ImageAnalyzer {
  constructor() {
    this.threshold = 128;
    this.invert = false; // By default in sketches: dark lines/masses = solid, white paper = void
    this.denoise = 1;
    this.currentGrid = null;
    this.currentImage = null;
    this.lastProcessedCanvas = null;
  }

  /**
   * Otsu's optimal global thresholding algorithm
   */
  computeOtsuThreshold(grayPixels) {
    const histogram = new Int32Array(256);
    const total = grayPixels.length;

    for (let i = 0; i < total; i++) {
      histogram[grayPixels[i]]++;
    }

    let sum = 0;
    for (let t = 0; t < 256; t++) {
      sum += t * histogram[t];
    }

    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let varMax = 0;
    let threshold = 128;

    for (let t = 0; t < 256; t++) {
      wB += histogram[t];
      if (wB === 0) continue;
      wF = total - wB;
      if (wF === 0) break;

      sumB += t * histogram[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;

      const varBetween = wB * wF * (mB - mF) * (mB - mF);
      if (varBetween > varMax) {
        varMax = varBetween;
        threshold = t;
      }
    }

    return threshold;
  }

  /**
   * Process an image (HTMLImageElement or HTMLCanvasElement) into SolidVoidGrid
   */
  analyze(imageSource, options = {}) {
    const maxDimension = options.maxDimension || 512;
    const worldSize = options.worldSize || 600;

    let srcW = imageSource.naturalWidth || imageSource.videoWidth || imageSource.width || 512;
    let srcH = imageSource.naturalHeight || imageSource.videoHeight || imageSource.height || 512;

    // Maintain aspect ratio
    let scale = 1;
    if (srcW > maxDimension || srcH > maxDimension) {
      scale = maxDimension / Math.max(srcW, srcH);
    }
    const gridW = Math.max(64, Math.round(srcW * scale));
    const gridH = Math.max(64, Math.round(srcH * scale));

    const worldW = worldSize;
    const worldH = (gridH / gridW) * worldSize;

    // Render image to offscreen canvas to sample pixel data
    const offCanvas = document.createElement('canvas');
    offCanvas.width = gridW;
    offCanvas.height = gridH;
    const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });

    // Draw white background first in case of transparent PNG
    offCtx.fillStyle = '#ffffff';
    offCtx.fillRect(0, 0, gridW, gridH);
    offCtx.drawImage(imageSource, 0, 0, gridW, gridH);

    const imgData = offCtx.getImageData(0, 0, gridW, gridH);
    const pixels = imgData.data;

    // 1. Convert to luminance grayscale
    const gray = new Uint8Array(gridW * gridH);
    for (let i = 0, j = 0; i < pixels.length; i += 4, j++) {
      // Standard ITU-R BT.601 perceptual luminance
      gray[j] = Math.round(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]);
    }

    // 2. Threshold determination
    let thresh = options.threshold !== undefined ? options.threshold : this.threshold;
    if (options.autoOtsu) {
      thresh = this.computeOtsuThreshold(gray);
      this.threshold = thresh;
    }

    const invert = options.invert !== undefined ? options.invert : this.invert;
    const denoise = options.denoise !== undefined ? options.denoise : this.denoise;

    // 3. Create SolidVoidGrid
    const grid = new SolidVoidGrid(gridW, gridH, worldW, worldH);

    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        let val = gray[y * gridW + x];

        // Optional 3x3 local smoothing / noise suppression
        if (denoise > 0 && x > 0 && x < gridW - 1 && y > 0 && y < gridH - 1) {
          let sum = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              sum += gray[(y + dy) * gridW + (x + dx)];
            }
          }
          val = Math.round(sum / 9);
        }

        // Standard: dark pixels (ink, walls) are solid (1), light pixels (paper) are void (0)
        let isSolid = val < thresh;
        if (invert) {
          isSolid = !isSolid;
        }

        grid.set(x, y, isSolid ? 1 : 0);
      }
    }

    // Detect chambers
    grid.detectChambers('void');

    this.currentGrid = grid;
    this.currentImage = imageSource;
    this.lastProcessedCanvas = offCanvas;

    return {
      grid,
      threshold: thresh,
      chambers: grid.chambers,
      canvas: offCanvas,
    };
  }

  /**
   * Generate Architectural Plan Presets for immediate exploration
   */
  static createPresetCanvas(presetType = 'courtyard', width = 512, height = 512) {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const ctx = c.getContext('2d');

    // Background: White Void (paper)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 14;

    if (presetType === 'courtyard') {
      // Architectural Courtyard Floor Plan
      // Exterior thick boundary walls
      ctx.strokeRect(36, 36, width - 72, height - 72);

      // Entrance door opening at bottom
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(width / 2 - 32, height - 48, 64, 24);

      // Central Courtyard Solid Borders
      ctx.fillStyle = '#000000';
      ctx.fillRect(150, 150, width - 300, 14); // North
      ctx.fillRect(150, height - 164, width - 300, 14); // South
      ctx.fillRect(150, 150, 14, height - 300); // West
      ctx.fillRect(width - 164, 150, 14, height - 300); // East

      // Door gaps into courtyard
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(width / 2 - 20, 144, 40, 26);
      ctx.fillRect(width / 2 - 20, height - 170, 40, 26);
      ctx.fillRect(144, height / 2 - 20, 26, 40);

      // Interior room partition walls
      ctx.fillStyle = '#000000';
      ctx.fillRect(36, 150, 60, 12);
      ctx.fillRect(width - 96, 150, 60, 12);
      ctx.fillRect(36, height - 162, 60, 12);
      ctx.fillRect(width - 96, height - 162, 60, 12);

      // Columns in courtyard
      ctx.beginPath();
      ctx.arc(200, 200, 12, 0, Math.PI * 2);
      ctx.arc(width - 200, 200, 12, 0, Math.PI * 2);
      ctx.arc(200, height - 200, 12, 0, Math.PI * 2);
      ctx.arc(width - 200, height - 200, 12, 0, Math.PI * 2);
      ctx.fill();

    } else if (presetType === 'urban') {
      // Dense Urban Fabric / Building Blocks & Alleys
      const blocks = [
        [36, 36, 120, 100],
        [186, 36, 140, 80],
        [356, 36, 120, 110],
        [36, 166, 100, 140],
        [166, 146, 90, 90],
        [286, 176, 100, 120],
        [416, 176, 60, 140],
        [36, 336, 130, 140],
        [196, 266, 60, 120],
        [196, 416, 150, 60],
        [286, 326, 100, 70],
        [376, 346, 100, 130],
      ];

      for (const [bx, by, bw, bh] of blocks) {
        ctx.fillRect(bx, by, bw, bh);
      }

    } else if (presetType === 'atrium') {
      // Solid Monolithic Mass with Carved-Out Atrium Voids
      ctx.fillStyle = '#000000';
      ctx.fillRect(40, 40, width - 80, height - 80);

      // Carve out white voids
      ctx.fillStyle = '#ffffff';

      // Central organoid atrium void
      ctx.beginPath();
      ctx.ellipse(width / 2, height / 2, 110, 80, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();

      // Side lightwells / void chambers
      ctx.beginPath();
      ctx.arc(120, 130, 45, 0, Math.PI * 2);
      ctx.arc(width - 120, 130, 40, 0, Math.PI * 2);
      ctx.arc(130, height - 130, 50, 0, Math.PI * 2);
      ctx.arc(width - 130, height - 130, 45, 0, Math.PI * 2);
      ctx.fill();

      // Connecting corridors between voids
      ctx.lineWidth = 24;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(120, 130);
      ctx.lineTo(width / 2, height / 2);
      ctx.lineTo(width - 120, 130);
      ctx.moveTo(130, height - 130);
      ctx.lineTo(width / 2, height / 2);
      ctx.lineTo(width - 130, height - 130);
      ctx.stroke();

    } else if (presetType === 'cavern') {
      // Organic sculpted cavern pockets
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      // Outer border
      ctx.rect(0, 0, width, height);

      // Cutout cavern contour
      ctx.moveTo(80, 80);
      ctx.bezierCurveTo(200, 40, 300, 110, 430, 80);
      ctx.bezierCurveTo(470, 200, 380, 260, 440, 380);
      ctx.bezierCurveTo(320, 460, 220, 400, 80, 440);
      ctx.bezierCurveTo(40, 300, 120, 200, 80, 80);
      ctx.closePath();
      ctx.fill('evenodd');

      // Internal solid islands / stalagmites
      ctx.beginPath();
      ctx.ellipse(200, 230, 35, 50, Math.PI / 4, 0, Math.PI * 2);
      ctx.ellipse(320, 280, 45, 30, -Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
    }

    return c;
  }
}
