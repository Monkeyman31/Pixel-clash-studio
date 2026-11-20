import { BrushSettings, BrushShape, DitherConfig, Frame, Hitbox, KeyframeEasing, Layer, LayerBlendMode, LayerGroup, LayerKeyframe, LayerMask, ProjectState, SymmetryConfig } from '../types';
import { applyAdjustmentToHex } from './colorFilters';
import { rasterizeVectorPathsToGrid } from './vectorCurveEngine';
import { rasterizeParametricShapesList } from './parametricShapeEngine';
import {
  blitPixelGridSubRectToCanvas,
  getCachedLayerEffectivePixels,
  getCachedPixelGridCanvas,
  getOrComputeCompositeFrame,
  parseColorToRgbaTupleFast,
} from './renderCache';
import { getTiledStore, isFrameTiled } from './tiledImageEngine';

export function createEmptyGrid(width: number, height: number): (string | null)[][] {
  const grid: (string | null)[][] = [];
  for (let y = 0; y < height; y++) {
    grid[y] = new Array(width).fill(null);
  }
  return grid;
}

export function cloneGrid(grid: (string | null)[][]): (string | null)[][] {
  return grid.map(row => [...row]);
}

// Bresenham's line algorithm with brush size
export function drawLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  grid: (string | null)[][],
  brushSize: number = 1
): void {
  const width = grid[0].length;
  const height = grid.length;

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let currX = x0;
  let currY = y0;

  while (true) {
    drawBrush(currX, currY, color, grid, brushSize, width, height);

    if (currX === x1 && currY === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      currX += sx;
    }
    if (e2 < dx) {
      err += dx;
      currY += sy;
    }
  }
}

export function drawBrush(
  cx: number,
  cy: number,
  color: string | null,
  grid: (string | null)[][],
  size: number,
  width: number,
  height: number
): void {
  const half = Math.floor(size / 2);
  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      const px = cx + dx;
      const py = cy + dy;
      if (px >= 0 && px < width && py >= 0 && py < height) {
        grid[py][px] = color;
      }
    }
  }
}

function parseRgbaTuple(color: string): [number, number, number, number] {
  return parseColorToRgbaTupleFast(color);
}

function rgbToHsl01(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

function hsl01ToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l, l, l];
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
}

function applyBlendChannel(b: number, s: number, mode: LayerBlendMode): number {
  switch (mode) {
    case 'multiply':
      return b * s;
    case 'screen':
      return 1 - (1 - b) * (1 - s);
    case 'overlay':
      return b < 0.5 ? 2 * b * s : 1 - 2 * (1 - b) * (1 - s);
    case 'soft-light':
      return s <= 0.5
        ? b - (1 - 2 * s) * b * (1 - b)
        : b + (2 * s - 1) * ((b <= 0.25 ? ((16 * b - 12) * b + 4) * b : Math.sqrt(b)) - b);
    case 'hard-light':
      return s < 0.5 ? 2 * b * s : 1 - 2 * (1 - b) * (1 - s);
    case 'darken':
      return Math.min(b, s);
    case 'lighten':
      return Math.max(b, s);
    case 'color-dodge':
      return s >= 0.999 ? 1 : Math.min(1, b / (1 - s));
    case 'color-burn':
      return s <= 0.001 ? 0 : Math.max(0, 1 - (1 - b) / s);
    case 'difference':
      return Math.abs(b - s);
    case 'exclusion':
      return b + s - 2 * b * s;
    default:
      return s;
  }
}

function applyBlendRgb(
  br: number,
  bg: number,
  bb: number,
  sr: number,
  sg: number,
  sb: number,
  mode: LayerBlendMode
): [number, number, number] {
  if (mode === 'normal') return [sr, sg, sb];
  const b0 = br / 255;
  const b1 = bg / 255;
  const b2 = bb / 255;
  const s0 = sr / 255;
  const s1 = sg / 255;
  const s2 = sb / 255;

  if (mode === 'hue' || mode === 'saturation' || mode === 'color' || mode === 'luminosity') {
    const [bh, bs, bl] = rgbToHsl01(b0, b1, b2);
    const [sh, ss, sl] = rgbToHsl01(s0, s1, s2);
    let r = b0;
    let g = b1;
    let b = b2;
    if (mode === 'hue') [r, g, b] = hsl01ToRgb(sh, bs, bl);
    else if (mode === 'saturation') [r, g, b] = hsl01ToRgb(bh, ss, bl);
    else if (mode === 'color') [r, g, b] = hsl01ToRgb(sh, ss, bl);
    else [r, g, b] = hsl01ToRgb(bh, bs, sl);
    return [
      Math.max(0, Math.min(255, Math.round(r * 255))),
      Math.max(0, Math.min(255, Math.round(g * 255))),
      Math.max(0, Math.min(255, Math.round(b * 255))),
    ];
  }

  return [
    Math.max(0, Math.min(255, Math.round(applyBlendChannel(b0, s0, mode) * 255))),
    Math.max(0, Math.min(255, Math.round(applyBlendChannel(b1, s1, mode) * 255))),
    Math.max(0, Math.min(255, Math.round(applyBlendChannel(b2, s2, mode) * 255))),
  ];
}

export function blendHexColors(
  baseColor: string | null,
  topColor: string,
  opacity: number,
  blendMode: LayerBlendMode = 'normal'
): string {
  const layerAlpha = Math.max(0, Math.min(1, opacity));
  const [tr, tg, tb, ta] = parseRgbaTuple(topColor);
  const srcA = Math.max(0, Math.min(1, ta * layerAlpha));
  if (srcA <= 0.001) return baseColor || `rgba(${tr}, ${tg}, ${tb}, 0)`;
  if (!baseColor) {
    if (srcA >= 0.995) {
      return `#${((1 << 24) + (tr << 16) + (tg << 8) + tb).toString(16).slice(1)}`;
    }
    return `rgba(${tr}, ${tg}, ${tb}, ${srcA.toFixed(3)})`;
  }
  const [br, bg, bb, ba] = parseRgbaTuple(baseColor);
  const [cr, cg, cb] = blendMode === 'normal' ? [tr, tg, tb] : applyBlendRgb(br, bg, bb, tr, tg, tb, blendMode);

  if (srcA >= 0.995 && ba >= 0.995) {
    return `#${((1 << 24) + (cr << 16) + (cg << 8) + cb).toString(16).slice(1)}`;
  }
  const outA = srcA + ba * (1 - srcA);
  if (outA <= 0.001) return `rgba(0, 0, 0, 0)`;
  // Porter-Duff source-over with blended color where both base and top overlap
  const mixedR = ba > 0.001 ? br * (1 - srcA) + cr * srcA : cr;
  const mixedG = ba > 0.001 ? bg * (1 - srcA) + cg * srcA : cg;
  const mixedB = ba > 0.001 ? bb * (1 - srcA) + cb * srcA : cb;
  const r = Math.max(0, Math.min(255, Math.round((mixedR * srcA + br * ba * (1 - srcA)) / outA)));
  const g = Math.max(0, Math.min(255, Math.round((mixedG * srcA + bg * ba * (1 - srcA)) / outA)));
  const b = Math.max(0, Math.min(255, Math.round((mixedB * srcA + bb * ba * (1 - srcA)) / outA)));
  if (outA >= 0.995) {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
  return `rgba(${r}, ${g}, ${b}, ${outA.toFixed(3)})`;
}

export function createMaskGrid(width: number, height: number, fillValue: number = 255): number[][] {
  const clamped = Math.max(0, Math.min(255, Math.round(fillValue)));
  return Array.from({ length: height }, () => new Array(width).fill(clamped));
}

export function resolveMaskAlpha(mask: LayerMask | null | undefined, x: number, y: number): number {
  if (!mask || mask.disabled) return 1;
  const raw = mask.pixels?.[y]?.[x];
  const val = typeof raw === 'number' ? raw : 255;
  const eff = mask.inverted ? 255 - val : val;
  return Math.max(0, Math.min(1, eff / 255));
}

export function applyPressureCurve(
  rawPressure: number,
  curve: 'linear' | 'soft' | 'firm'
): number {
  const p = Math.max(0.02, Math.min(1, rawPressure));
  if (curve === 'soft') return Math.pow(p, 0.55); // Easy light strokes reach fuller thickness
  if (curve === 'firm') return Math.pow(p, 1.8); // Requires firmer press for full width
  return p;
}

export function computeDynamicBrushParams(
  settings: BrushSettings,
  rawPressure: number,
  strokePointCount: number = 99
): { effectiveSize: number; effectiveOpacity: number } {
  const baseSize = Math.max(1, Math.round(settings.size));
  const minSize = Math.max(1, Math.min(baseSize, Math.round(settings.pressureMinSize || 1)));
  const shapedP = applyPressureCurve(rawPressure, settings.pressureCurve);

  let effectiveSize = baseSize;
  if (settings.penPressureEnabled && settings.pressureAffectsSize) {
    effectiveSize = Math.max(
      minSize,
      Math.min(baseSize, Math.round(minSize + (baseSize - minSize) * shapedP))
    );
  } else if (settings.taperEnds && baseSize > 1 && strokePointCount <= 4) {
    // Smooth entry tapering for fine calligraphy even with a mouse
    const taperRatio = Math.min(1, strokePointCount / 4);
    effectiveSize = Math.max(1, Math.round(1 + (baseSize - 1) * taperRatio));
  }

  let effectiveOpacity = Math.max(0.05, Math.min(1, settings.opacity));
  if (settings.penPressureEnabled && settings.pressureAffectsOpacity) {
    effectiveOpacity = Math.max(0.08, Math.min(1, effectiveOpacity * (0.2 + 0.8 * shapedP)));
  }

  return { effectiveSize, effectiveOpacity };
}

const BRUSH_STAMP_CACHE = new Map<string, { dx: number; dy: number; distRatio: number }[]>();
const MAX_STAMP_CACHE_ENTRIES = 48;

export function getBrushStampOffsets(
  size: number,
  shape: BrushShape
): { dx: number; dy: number; distRatio: number }[] {
  const s = Math.max(1, Math.round(size));
  if (s === 1 && shape !== 'spray') {
    return [{ dx: 0, dy: 0, distRatio: 0 }];
  }

  const cacheKey = shape !== 'spray' && s <= 512 ? `${shape}:${s}` : null;
  if (cacheKey) {
    const cached = BRUSH_STAMP_CACHE.get(cacheKey);
    if (cached) return cached;
  }

  const start = -Math.floor(s / 2);
  const end = start + s - 1;
  const center = (start + end) / 2;
  const radius = Math.max(0.5, s / 2);
  const offsets: { dx: number; dy: number; distRatio: number }[] = [];

  for (let dy = start; dy <= end; dy++) {
    for (let dx = start; dx <= end; dx++) {
      const ndx = dx - center;
      const ndy = dy - center;
      const dist = Math.hypot(ndx, ndy);
      const distRatio = Math.min(1, dist / Math.max(0.5, radius));

      if (shape === 'square') {
        offsets.push({ dx, dy, distRatio });
      } else if (shape === 'circle') {
        if (dist <= radius + 0.15) {
          offsets.push({ dx, dy, distRatio });
        }
      } else if (shape === 'diamond') {
        if (Math.abs(ndx) + Math.abs(ndy) <= radius + 0.25) {
          offsets.push({ dx, dy, distRatio });
        }
      } else if (shape === 'slash_right') {
        // Diagonal calligraphic nib "/"
        if (Math.abs(ndx + ndy) <= Math.max(0.75, s * 0.35)) {
          offsets.push({ dx, dy, distRatio });
        }
      } else if (shape === 'slash_left') {
        // Diagonal calligraphic nib "\"
        if (Math.abs(ndx - ndy) <= Math.max(0.75, s * 0.35)) {
          offsets.push({ dx, dy, distRatio });
        }
      } else if (shape === 'spray') {
        const prob = 0.42 * (1 - distRatio * 0.65);
        if (dist <= radius + 0.5 && Math.random() < prob) {
          offsets.push({ dx, dy, distRatio });
        }
      }
    }
  }

  const result = offsets.length > 0 ? offsets : [{ dx: 0, dy: 0, distRatio: 0 }];
  if (cacheKey) {
    if (BRUSH_STAMP_CACHE.size >= MAX_STAMP_CACHE_ENTRIES) {
      const oldestKey = BRUSH_STAMP_CACHE.keys().next().value;
      if (oldestKey !== undefined) BRUSH_STAMP_CACHE.delete(oldestKey);
    }
    BRUSH_STAMP_CACHE.set(cacheKey, result);
  }
  return result;
}

export function drawAdvancedBrush(
  cx: number,
  cy: number,
  color: string | null,
  grid: (string | null)[][],
  width: number,
  height: number,
  size: number,
  shape: BrushShape = 'square',
  opacity: number = 1,
  hardness: number = 1,
  jitterPosition: number = 0
): void {
  const jx =
    jitterPosition > 0
      ? Math.round((Math.random() - 0.5) * 2 * jitterPosition)
      : 0;
  const jy =
    jitterPosition > 0
      ? Math.round((Math.random() - 0.5) * 2 * jitterPosition)
      : 0;

  const s = Math.max(1, Math.round(size));
  const originX = cx + jx;
  const originY = cy + jy;

  // High-performance direct scanline fast-path for large brushes (zero massive array allocation & direct canvas clipping)
  if (s >= 20) {
    const start = -Math.floor(s / 2);
    const end = start + s - 1;
    const center = (start + end) / 2;
    const radius = Math.max(0.5, s / 2);
    const radiusEdgeSq = (radius + 0.15) * (radius + 0.15);
    const invRadius = 1 / radius;
    const minPx = Math.max(0, originX + start);
    const maxPx = Math.min(width - 1, originX + end);
    const minPy = Math.max(0, originY + start);
    const maxPy = Math.min(height - 1, originY + end);
    if (minPx > maxPx || minPy > maxPy) return;

    const isSoft = hardness < 0.99;
    const falloffDenom = Math.max(0.05, 1 - hardness);
    const diagLimit = Math.max(0.75, s * 0.35);

    for (let py = minPy; py <= maxPy; py++) {
      const row = grid[py];
      const ndy = py - originY - center;
      const ndySq = ndy * ndy;
      const absNdy = Math.abs(ndy);

      for (let px = minPx; px <= maxPx; px++) {
        const ndx = px - originX - center;
        let distRatio = 0;

        if (shape === 'circle') {
          const distSq = ndx * ndx + ndySq;
          if (distSq > radiusEdgeSq) continue;
          if (isSoft) distRatio = Math.min(1, Math.sqrt(distSq) * invRadius);
        } else if (shape === 'diamond') {
          const manhattan = Math.abs(ndx) + absNdy;
          if (manhattan > radius + 0.25) continue;
          if (isSoft) distRatio = Math.min(1, Math.hypot(ndx, ndy) * invRadius);
        } else if (shape === 'slash_right') {
          if (Math.abs(ndx + ndy) > diagLimit) continue;
          if (isSoft) distRatio = Math.min(1, Math.hypot(ndx, ndy) * invRadius);
        } else if (shape === 'slash_left') {
          if (Math.abs(ndx - ndy) > diagLimit) continue;
          if (isSoft) distRatio = Math.min(1, Math.hypot(ndx, ndy) * invRadius);
        } else if (shape === 'spray') {
          const dist = Math.hypot(ndx, ndy);
          if (dist > radius + 0.5) continue;
          distRatio = Math.min(1, dist * invRadius);
          const prob = 0.26 * (1 - distRatio * 0.65);
          if (Math.random() >= prob) continue;
        } else if (isSoft) {
          distRatio = Math.min(1, Math.hypot(ndx, ndy) * invRadius);
        }

        let pixelAlpha = opacity;
        if (isSoft && distRatio > hardness) {
          const falloff = 1 - (distRatio - hardness) / falloffDenom;
          pixelAlpha = opacity * Math.max(0.12, falloff);
        }

        if (color === null) {
          if (pixelAlpha >= 0.5 || row[px] === null) {
            row[px] = null;
          }
        } else {
          row[px] =
            pixelAlpha >= 0.99
              ? color
              : blendHexColors(row[px], color, pixelAlpha);
        }
      }
    }
    return;
  }

  const stamps = getBrushStampOffsets(s, shape);

  for (const { dx, dy, distRatio } of stamps) {
    const px = originX + dx;
    const py = originY + dy;
    if (px < 0 || px >= width || py < 0 || py >= height) continue;

    // Edge softness falloff when hardness < 1
    let pixelAlpha = opacity;
    if (hardness < 0.99 && s > 1 && distRatio > hardness) {
      const falloff = 1 - (distRatio - hardness) / Math.max(0.05, 1 - hardness);
      pixelAlpha = opacity * Math.max(0.12, falloff);
    }

    if (color === null) {
      if (pixelAlpha >= 0.5 || grid[py][px] === null) {
        grid[py][px] = null;
      }
    } else {
      grid[py][px] =
        pixelAlpha >= 0.99
          ? color
          : blendHexColors(grid[py][px], color, pixelAlpha);
    }
  }
}

export function drawAdvancedLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string | null,
  grid: (string | null)[][],
  size: number,
  shape: BrushShape = 'square',
  opacity: number = 1,
  hardness: number = 1,
  spacing: number = 1,
  jitterPosition: number = 0
): void {
  const width = grid[0].length;
  const height = grid.length;
  const requestedSpacing = Math.max(1, Math.round(spacing));
  // Auto-stride dense large brushes to avoid 256x256 overwrites on every 1px step while maintaining seamless overlap
  const stepSpacing =
    requestedSpacing === 1 && size >= 16 && shape !== 'spray'
      ? Math.max(1, Math.floor(size / 8))
      : requestedSpacing;

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let currX = x0;
  let currY = y0;
  let stepCount = 0;
  let drewFinal = false;

  while (true) {
    const isFinal = currX === x1 && currY === y1;
    if (stepCount % stepSpacing === 0 || (isFinal && !drewFinal)) {
      drawAdvancedBrush(
        currX,
        currY,
        color,
        grid,
        width,
        height,
        size,
        shape,
        opacity,
        hardness,
        jitterPosition
      );
      if (isFinal) drewFinal = true;
    }
    stepCount++;

    if (isFinal) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      currX += sx;
    }
    if (e2 < dx) {
      err += dx;
      currY += sy;
    }
  }
}

// Aseprite-style pixel perfect line cleaner
// Removes redundant corner pixels that form 'L' corners in 1-pixel strokes
export function cleanPixelPerfectStroke(
  points: { x: number; y: number }[],
  grid: (string | null)[][]
): void {
  if (points.length < 3) return;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    if (prev.x !== next.x && prev.y !== next.y) {
      if (
        (prev.x === curr.x && next.y === curr.y) ||
        (prev.y === curr.y && next.x === curr.x)
      ) {
        // Redundant corner pixel
        if (curr.y >= 0 && curr.y < grid.length && curr.x >= 0 && curr.x < grid[0].length) {
          grid[curr.y][curr.x] = null;
        }
      }
    }
  }
}

// Flood fill algorithm
export function floodFill(
  startX: number,
  startY: number,
  targetColor: string | null,
  fillColor: string,
  grid: (string | null)[][]
): void {
  const height = grid.length;
  const width = grid[0].length;

  if (targetColor === fillColor) return;
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;
  if (grid[startY][startX] !== targetColor) return;

  const queue: [number, number][] = [[startX, startY]];
  const visited = new Uint8Array(width * height);

  while (queue.length > 0) {
    const [x, y] = queue.pop()!;
    const idx = y * width + x;
    if (visited[idx]) continue;
    visited[idx] = 1;

    grid[y][x] = fillColor;

    const neighbors: [number, number][] = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIdx = ny * width + nx;
        if (!visited[nIdx] && grid[ny][nx] === targetColor) {
          queue.push([nx, ny]);
        }
      }
    }
  }
}

// Draw rectangle (filled or hollow)
export function drawRectangle(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  grid: (string | null)[][],
  filled: boolean = false
): void {
  const minX = Math.max(0, Math.min(x0, x1));
  const maxX = Math.min(grid[0].length - 1, Math.max(x0, x1));
  const minY = Math.max(0, Math.min(y0, y1));
  const maxY = Math.min(grid.length - 1, Math.max(y0, y1));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (filled || x === minX || x === maxX || y === minY || y === maxY) {
        grid[y][x] = color;
      }
    }
  }
}

// Draw pixel-art circle / ellipse (hollow or filled)
export function drawCircle(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  grid: (string | null)[][],
  filled: boolean = false
): void {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  const rx = (maxX - minX) / 2;
  const ry = (maxY - minY) / 2;
  const cx = minX + rx;
  const cy = minY + ry;
  const width = grid[0].length;
  const height = grid.length;

  if (rx < 0.5 && ry < 0.5) {
    if (minX >= 0 && minX < width && minY >= 0 && minY < height) {
      grid[minY][minX] = color;
    }
    return;
  }

  for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(height - 1, Math.ceil(maxY)); y++) {
    for (let x = Math.max(0, Math.floor(minX)); x <= Math.min(width - 1, Math.ceil(maxX)); x++) {
      const dx = (x + 0.5 - cx) / Math.max(0.5, rx);
      const dy = (y + 0.5 - cy) / Math.max(0.5, ry);
      const distSq = dx * dx + dy * dy;

      if (filled) {
        if (distSq <= 1.05) {
          grid[y][x] = color;
        }
      } else {
        const innerDx = (x + 0.5 - cx) / Math.max(0.2, rx - 0.85);
        const innerDy = (y + 0.5 - cy) / Math.max(0.2, ry - 0.85);
        const innerDistSq = innerDx * innerDx + innerDy * innerDy;
        if (distSq <= 1.25 && innerDistSq >= 0.7) {
          grid[y][x] = color;
        }
      }
    }
  }
}

// Fighting game motion smear brush: streaks color along movement vector
export function applySmear(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  grid: (string | null)[][],
  brushSize: number = 2
): void {
  const width = grid[0].length;
  const height = grid.length;
  const half = Math.floor(brushSize / 2);

  // Pick pixels at starting position
  const sourcePixels: { dx: number; dy: number; color: string }[] = [];
  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      const sx = x0 + dx;
      const sy = y0 + dy;
      if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
        const c = grid[sy][sx];
        if (c) sourcePixels.push({ dx, dy, color: c });
      }
    }
  }

  if (sourcePixels.length === 0) return;

  // Streak along line to (x1, y1) with dither fading
  const steps = Math.max(1, Math.hypot(x1 - x0, y1 - y0));
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    const px = Math.round(x0 + (x1 - x0) * t);
    const py = Math.round(y0 + (y1 - y0) * t);

    // Apply fading smear
    for (const src of sourcePixels) {
      const targetX = px + src.dx;
      const targetY = py + src.dy;
      if (targetX >= 0 && targetX < width && targetY >= 0 && targetY < height) {
        // Dither probability decreases along distance
        if (Math.random() > t * 0.45) {
          grid[targetY][targetX] = src.color;
        }
      }
    }
  }
}

export const DEFAULT_DITHER_CONFIG: DitherConfig = {
  pattern: 'checkered',
  density: 50,
  rotation: 0,
  invert: false,
  smartLuminance: false,
  customMatrix: [
    [1, 0, 1, 0],
    [0, 1, 0, 1],
    [1, 0, 1, 0],
    [0, 1, 0, 1],
  ],
};

function rotateMatrixCoord(x: number, y: number, size: number, rotation: 0 | 90 | 180 | 270): [number, number] {
  const mx = ((x % size) + size) % size;
  const my = ((y % size) + size) % size;
  if (rotation === 90) return [size - 1 - my, mx];
  if (rotation === 180) return [size - 1 - mx, size - 1 - my];
  if (rotation === 270) return [my, size - 1 - mx];
  return [mx, my];
}

export function sampleDitherMask(
  x: number,
  y: number,
  config: DitherConfig,
  targetLuminance01?: number
): boolean {
  const bayer4x4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ];

  const [rx, ry] = rotateMatrixCoord(x, y, 4, config.rotation || 0);
  const densityNorm = Math.max(0, Math.min(1, (config.density ?? 50) / 100));
  const effThreshold =
    config.smartLuminance && typeof targetLuminance01 === 'number'
      ? Math.max(0.05, Math.min(0.95, densityNorm * (0.4 + targetLuminance01 * 0.9)))
      : densityNorm;

  let hit = false;
  switch (config.pattern) {
    case 'checkered':
      hit = ((rx + ry) & 1) === 0 && bayer4x4[ry][rx] < Math.ceil(effThreshold * 16);
      if (densityNorm >= 0.95) hit = true;
      else if (densityNorm <= 0.02) hit = false;
      else if (Math.abs(densityNorm - 0.5) < 0.12 && !config.smartLuminance) hit = ((rx + ry) & 1) === 0;
      break;
    case 'sparse':
      hit = bayer4x4[ry][rx] < Math.max(1, Math.round(effThreshold * 8));
      break;
    case 'dense':
      hit = bayer4x4[ry][rx] < Math.max(1, Math.round(effThreshold * 16));
      break;
    case 'horizontal':
      hit = (ry & 1) === 0 && (effThreshold >= 0.5 || (rx & 1) === 0);
      break;
    case 'diagonal':
      hit = ((rx + ry) % 3 === 0) || (effThreshold > 0.65 && ((rx - ry + 4) % 3 === 0));
      break;
    case 'bayer4':
      hit = bayer4x4[ry][rx] / 16 < effThreshold;
      break;
    case 'custom': {
      const mat = config.customMatrix && config.customMatrix.length === 4 ? config.customMatrix : DEFAULT_DITHER_CONFIG.customMatrix!;
      const cell = mat[ry]?.[rx] ?? 0;
      hit = cell > 0 && bayer4x4[ry][rx] / 16 < Math.max(0.25, effThreshold + 0.35);
      break;
    }
    default:
      hit = ((rx + ry) & 1) === 0;
      break;
  }

  return config.invert ? !hit : hit;
}

export function getAdvancedDitherColor(
  x: number,
  y: number,
  config: DitherConfig,
  primaryColor: string,
  secondaryColor: string | null,
  existingHex?: string | null
): string | null {
  let lum01: number | undefined;
  if (config.smartLuminance && existingHex) {
    const clean = existingHex.replace('#', '');
    if (clean.length >= 6) {
      const r = parseInt(clean.slice(0, 2), 16) || 0;
      const g = parseInt(clean.slice(2, 4), 16) || 0;
      const b = parseInt(clean.slice(4, 6), 16) || 0;
      lum01 = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    }
  }
  const usePrimary = sampleDitherMask(x, y, config, lum01);
  return usePrimary ? primaryColor : secondaryColor;
}

// Retro dither pattern check (backward-compatible)
export function getDitherColor(
  x: number,
  y: number,
  pattern: 'checkered' | 'sparse' | 'dense' | 'horizontal',
  primaryColor: string,
  secondaryColor: string | null
): string | null {
  const bayer4x4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ];

  switch (pattern) {
    case 'checkered':
      return (x + y) % 2 === 0 ? primaryColor : secondaryColor;
    case 'sparse':
      return bayer4x4[((y % 4) + 4) % 4][((x % 4) + 4) % 4] < 5 ? primaryColor : secondaryColor;
    case 'dense':
      return bayer4x4[((y % 4) + 4) % 4][((x % 4) + 4) % 4] < 12 ? primaryColor : secondaryColor;
    case 'horizontal':
      return y % 2 === 0 ? primaryColor : secondaryColor;
    default:
      return primaryColor;
  }
}

export function shiftLayerPixelsNonDestructive(
  pixels: (string | null)[][],
  offCanvasPixels: Record<string, string> | undefined,
  dx: number,
  dy: number,
  width: number,
  height: number,
  clipOutsideCanvas: boolean
): { pixels: (string | null)[][]; offCanvasPixels?: Record<string, string> } {
  const movedGrid = createEmptyGrid(width, height);
  const nextOff: Record<string, string> = {};

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const col = pixels[y]?.[x];
      if (!col) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        movedGrid[ny][nx] = col;
      } else if (!clipOutsideCanvas) {
        nextOff[`${nx},${ny}`] = col;
      }
    }
  }

  if (!clipOutsideCanvas && offCanvasPixels) {
    for (const [key, col] of Object.entries(offCanvasPixels)) {
      const [ox, oy] = key.split(',').map(Number);
      if (Number.isNaN(ox) || Number.isNaN(oy)) continue;
      const nx = ox + dx;
      const ny = oy + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        movedGrid[ny][nx] = col;
      } else {
        nextOff[`${nx},${ny}`] = col;
      }
    }
  }

  return {
    pixels: movedGrid,
    offCanvasPixels: !clipOutsideCanvas && Object.keys(nextOff).length > 0 ? nextOff : undefined,
  };
}

export function applyKeyframeEasing(t: number, easing: KeyframeEasing): number {
  const clamped = Math.max(0, Math.min(1, t));
  if (easing === 'hold') return 0;
  if (easing === 'ease-in') return clamped * clamped;
  if (easing === 'ease-out') return 1 - (1 - clamped) * (1 - clamped);
  if (easing === 'ease-in-out') {
    return clamped < 0.5 ? 2 * clamped * clamped : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
  }
  return clamped;
}

export function evaluateLayerKeyframeTransform(
  layer: Layer,
  frameIndex: number
): { offsetX: number; offsetY: number; scale: number; opacityMultiplier: number } {
  const kfs: LayerKeyframe[] = layer.keyframes || [];
  if (kfs.length === 0 || frameIndex < 0) {
    return { offsetX: 0, offsetY: 0, scale: 1, opacityMultiplier: 1 };
  }
  const sorted = [...kfs].sort((a, b) => a.frameIndex - b.frameIndex);
  if (frameIndex <= sorted[0].frameIndex) {
    const k = sorted[0];
    return { offsetX: k.offsetX, offsetY: k.offsetY, scale: k.scale, opacityMultiplier: k.opacity };
  }
  if (frameIndex >= sorted[sorted.length - 1].frameIndex) {
    const k = sorted[sorted.length - 1];
    return { offsetX: k.offsetX, offsetY: k.offsetY, scale: k.scale, opacityMultiplier: k.opacity };
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (frameIndex >= a.frameIndex && frameIndex <= b.frameIndex) {
      const span = Math.max(1, b.frameIndex - a.frameIndex);
      const rawT = (frameIndex - a.frameIndex) / span;
      const easedT = applyKeyframeEasing(rawT, a.easing);
      return {
        offsetX: Math.round(a.offsetX + (b.offsetX - a.offsetX) * easedT),
        offsetY: Math.round(a.offsetY + (b.offsetY - a.offsetY) * easedT),
        scale: a.scale + (b.scale - a.scale) * easedT,
        opacityMultiplier: a.opacity + (b.opacity - a.opacity) * easedT,
      };
    }
  }
  return { offsetX: 0, offsetY: 0, scale: 1, opacityMultiplier: 1 };
}

export function getFrameDurationMs(frame?: Partial<Frame> | null): number {
  if (!frame) return 67;
  if (typeof frame.durationMs === 'number' && !isNaN(frame.durationMs)) {
    return Math.max(0, frame.durationMs);
  }
  const ticks = typeof frame.durationTicks === 'number' && !isNaN(frame.durationTicks) ? frame.durationTicks : 4;
  return Math.max(0, Math.round((ticks / 60) * 1000));
}

export function resolveGroupVisibilityAndOpacity(
  groupId: string | null | undefined,
  layerGroups: LayerGroup[] = []
): { visible: boolean; opacity: number } {
  if (!groupId || layerGroups.length === 0) {
    return { visible: true, opacity: 1 };
  }
  let visible = true;
  let opacity = 1;
  let curId: string | null | undefined = groupId;
  const visited = new Set<string>();
  while (curId && !visited.has(curId)) {
    visited.add(curId);
    const grp = layerGroups.find((g) => g.id === curId);
    if (!grp) break;
    if (grp.visible === false) visible = false;
    if (typeof grp.opacity === 'number') {
      opacity *= Math.max(0, Math.min(1, grp.opacity));
    }
    curId = grp.parentGroupId;
  }
  return { visible, opacity };
}

// Composite all visible layers (strict bottom-to-top stack order + blend modes + fill + masks + clipping masks + group opacity + keyframe transforms + adjustment layers)
export function compositeFrame(
  frame: Frame,
  width: number,
  height: number,
  frameIndex: number = -1,
  excludeTempLayers: boolean = false,
  layerGroups: LayerGroup[] = []
): (string | null)[][] {
  // Never allocate massive dense JS pixel matrices for tiled ultra-high-res documents
  if (isFrameTiled(frame) && width * height > 2_000_000) {
    return [];
  }
  return getOrComputeCompositeFrame(
    frame,
    width,
    height,
    frameIndex,
    excludeTempLayers,
    layerGroups,
    () => {
      const result = createEmptyGrid(width, height);
      let lastClippingBasePixels: (string | null)[][] | null = null;

      for (let li = 0; li < frame.layers.length; li++) {
        const layer = frame.layers[li];
        const isClipping = Boolean(layer.clippingMask);
        if (!isClipping && layer.layerType !== 'adjustment') {
          lastClippingBasePixels = layer.visible ? layer.pixels : null;
        }

        if (!layer.visible) continue;
        if (excludeTempLayers && layer.layerType === 'temp') continue;

        const groupState = resolveGroupVisibilityAndOpacity(layer.groupId, layerGroups);
        if (!groupState.visible) continue;

        const kf = evaluateLayerKeyframeTransform(layer, frameIndex);
        const fillOp = layer.fillOpacity ?? 1;
        const effectiveOpacity = Math.max(
          0,
          Math.min(1, (layer.opacity ?? 1) * fillOp * kf.opacityMultiplier * groupState.opacity)
        );
        if (effectiveOpacity <= 0.001) continue;

        const blendMode: LayerBlendMode = layer.blendMode || 'normal';

        if (layer.layerType === 'adjustment' && layer.adjustment) {
          const hasMask = Boolean(layer.mask && !layer.mask.disabled);
          for (let y = 0; y < height; y++) {
            const resRow = result[y];
            const clipRow = isClipping ? lastClippingBasePixels?.[y] : null;
            for (let x = 0; x < width; x++) {
              if (isClipping && (!clipRow || !clipRow[x])) continue;
              const existing = resRow[x];
              if (existing) {
                const maskAlpha = hasMask ? resolveMaskAlpha(layer.mask, x, y) : 1;
                const pxOp = effectiveOpacity * maskAlpha;
                if (pxOp > 0.001) {
                  resRow[x] = applyAdjustmentToHex(existing, layer.adjustment, pxOp);
                }
              }
            }
          }
          continue;
        }

        const effectivePixels = getCachedLayerEffectivePixels(layer, width, height, () => {
          let pix =
            layer.vectorPaths && layer.vectorPaths.length > 0
              ? rasterizeVectorPathsToGrid(
                  layer.vectorPaths,
                  width,
                  height,
                  layer.layerType === 'vector' ? null : layer.pixels
                )
              : layer.pixels;
          if (layer.parametricShapes && layer.parametricShapes.length > 0) {
            pix = rasterizeParametricShapesList(layer.parametricShapes, width, height, pix);
          }
          return pix;
        });

        const hasScale = Math.abs(kf.scale - 1) > 0.01;
        const hasOffset = kf.offsetX !== 0 || kf.offsetY !== 0;
        const hasMask = Boolean(layer.mask && !layer.mask.disabled);
        const fastNormalOpaque =
          !isClipping && !hasScale && !hasOffset && !hasMask && effectiveOpacity >= 0.999 && blendMode === 'normal';

        // Ultra-fast inner loop for standard opaque normal layers (90% of layers!)
        if (fastNormalOpaque) {
          const rowLim = Math.min(height, effectivePixels.length);
          for (let y = 0; y < rowLim; y++) {
            const srcRow = effectivePixels[y];
            if (!srcRow) continue;
            const dstRow = result[y];
            const colLim = Math.min(width, srcRow.length);
            for (let x = 0; x < colLim; x++) {
              const pixel = srcRow[x];
              if (pixel) {
                dstRow[x] = pixel;
              }
            }
          }
          continue;
        }

        const cx = width / 2;
        const cy = height / 2;
        const invScale = kf.scale > 0.05 ? 1 / kf.scale : 1;

        for (let y = 0; y < height; y++) {
          const dstRow = result[y];
          const clipRow = isClipping ? lastClippingBasePixels?.[y] : null;
          let srcYBase = y - kf.offsetY;
          if (hasScale) {
            srcYBase = Math.round(cy + (srcYBase - cy) * invScale);
          }
          if (srcYBase < 0 || srcYBase >= height) continue;
          const srcRow = effectivePixels[srcYBase];
          if (!srcRow) continue;

          for (let x = 0; x < width; x++) {
            if (isClipping && (!clipRow || !clipRow[x])) continue;
            let srcX = x - kf.offsetX;
            if (hasScale) {
              srcX = Math.round(cx + (srcX - cx) * invScale);
            }
            if (srcX < 0 || srcX >= width) continue;
            const pixel = srcRow[srcX];
            if (pixel) {
              const maskAlpha = hasMask
                ? resolveMaskAlpha(
                    layer.mask,
                    layer.mask?.linked !== false ? srcX : x,
                    layer.mask?.linked !== false ? srcYBase : y
                  )
                : 1;
              const pixelOpacity = effectiveOpacity * maskAlpha;
              if (pixelOpacity <= 0.001) continue;
              dstRow[x] =
                pixelOpacity < 0.999 || blendMode !== 'normal'
                  ? blendHexColors(dstRow[x], pixel, pixelOpacity, blendMode)
                  : pixel;
            }
          }
        }
      }
      return result;
    }
  );
}

// Replace a specific color throughout an entire layer or frame
export function replaceColorInLayer(
  layer: Layer,
  targetColor: string,
  newColor: string
): void {
  for (let y = 0; y < layer.pixels.length; y++) {
    for (let x = 0; x < layer.pixels[y].length; x++) {
      if (layer.pixels[y][x]?.toLowerCase() === targetColor.toLowerCase()) {
        layer.pixels[y][x] = newColor;
      }
    }
  }
}

// Convert a frame's composited grid to an HTML5 Canvas element using cached ImageData blitting
export function frameToCanvas(
  frame: Frame,
  width: number,
  height: number,
  scale: number = 1,
  excludeTempLayers: boolean = false,
  layerGroups: LayerGroup[] = []
): HTMLCanvasElement {
  // Tiled fast-path: composite tiled layers directly onto an HTMLCanvas without dense JS grids
  if (isFrameTiled(frame)) {
    const rawOutW = Math.max(1, Math.round(width * scale));
    const rawOutH = Math.max(1, Math.round(height * scale));
    const maxSafeDim = 16384;
    const clampRatio = Math.min(1, maxSafeDim / Math.max(rawOutW, rawOutH));
    const outW = Math.max(1, Math.round(rawOutW * clampRatio));
    const outH = Math.max(1, Math.round(rawOutH * clampRatio));

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.imageSmoothingEnabled = false;
    for (let li = 0; li < frame.layers.length; li++) {
      const layer = frame.layers[li];
      if (!layer.visible) continue;
      if (excludeTempLayers && layer.layerType === 'temp') continue;
      const groupState = resolveGroupVisibilityAndOpacity(layer.groupId, layerGroups);
      if (!groupState.visible) continue;
      const effectiveOpacity = Math.max(
        0,
        Math.min(1, (layer.opacity ?? 1) * (layer.fillOpacity ?? 1) * groupState.opacity)
      );
      if (effectiveOpacity <= 0.001) continue;

      ctx.save();
      ctx.globalAlpha = effectiveOpacity;
      ctx.imageSmoothingEnabled = false;
      if (layer.tiledStoreId) {
        const store = getTiledStore(layer.tiledStoreId);
        if (store) {
          store.renderScaledPreviewToContext(ctx, outW, outH, 0);
        }
      } else if (layer.pixels && layer.pixels.length > 0) {
        const layerCanvas = getCachedPixelGridCanvas(layer.pixels, width, height);
        ctx.drawImage(layerCanvas, 0, 0, outW, outH);
      }
      ctx.restore();
    }
    return canvas;
  }

  const composited = compositeFrame(frame, width, height, -1, excludeTempLayers, layerGroups);
  const baseCanvas = getCachedPixelGridCanvas(composited, width, height);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(baseCanvas, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// Generate Spritesheet canvas
export function generateSpritesheet(
  frames: Frame[],
  frameWidth: number,
  frameHeight: number,
  columns: number = frames.length,
  padding: number = 0
): HTMLCanvasElement {
  const cols = Math.min(columns, frames.length);
  const rows = Math.ceil(frames.length / cols);
  const totalWidth = cols * frameWidth + (cols - 1) * padding;
  const totalHeight = rows * frameHeight + (rows - 1) * padding;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, totalWidth);
  canvas.height = Math.max(1, totalHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = false;

  frames.forEach((frame, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const destX = col * (frameWidth + padding);
    const destY = row * (frameHeight + padding);

    const fCanvas = frameToCanvas(frame, frameWidth, frameHeight, 1);
    ctx.drawImage(fCanvas, destX, destY);
  });

  return canvas;
}

// Generate Grouped Spritesheet with each group's free name printed cleanly above its animation strip
export function generateGroupedSpritesheet(
  frames: Frame[],
  layerGroups: LayerGroup[],
  frameWidth: number,
  frameHeight: number,
  options: {
    scale?: number;
    padding?: number;
    includeGroupNames?: boolean;
    excludeTempLayers?: boolean;
    backgroundColor?: string;
  } = {}
): HTMLCanvasElement {
  const scale = Math.max(1, options.scale ?? 1);
  const padding = Math.max(0, options.padding ?? 4 * scale);
  const includeGroupNames = options.includeGroupNames ?? true;
  const excludeTempLayers = options.excludeTempLayers ?? true;
  const backgroundColor = options.backgroundColor ?? 'transparent';

  type RowBucket = { name: string; color: string; indices: number[] };
  const buckets: RowBucket[] = [];
  const usedFrameIndices = new Set<number>();

  for (const grp of layerGroups) {
    const validIndices = Array.from(
      new Set(
        (grp.frameIndices && grp.frameIndices.length > 0
          ? grp.frameIndices
          : frames
              .map((f, idx) => (f.groupId === grp.id ? idx : -1))
              .filter((idx) => idx >= 0)
        ).filter((idx) => idx >= 0 && idx < frames.length)
      )
    );
    if (validIndices.length > 0) {
      validIndices.forEach((idx) => usedFrameIndices.add(idx));
      buckets.push({
        name: grp.name || 'Animación',
        color: grp.color || '#38bdf8',
        indices: validIndices,
      });
    }
  }

  const ungrouped: number[] = [];
  frames.forEach((f, idx) => {
    if (!usedFrameIndices.has(idx)) {
      ungrouped.push(idx);
    } else if (f.groupId && !layerGroups.some((g) => g.id === f.groupId)) {
      ungrouped.push(idx);
    }
  });
  if (ungrouped.length > 0) {
    buckets.push({
      name: buckets.length > 0 ? 'Sin grupo' : 'Animación',
      color: '#94a3b8',
      indices: ungrouped,
    });
  }

  if (buckets.length === 0) {
    buckets.push({
      name: 'Animación',
      color: '#38bdf8',
      indices: frames.map((_, i) => i),
    });
  }

  const cellW = frameWidth * scale;
  const cellH = frameHeight * scale;
  const headerH = includeGroupNames ? Math.max(18, 12 * scale) : 0;
  const headerGap = includeGroupNames ? Math.max(4, 2 * scale) : 0;
  const rowGap = Math.max(6, padding * 2);

  const maxCols = Math.max(1, ...buckets.map((b) => b.indices.length));
  const totalWidth = Math.max(
    180,
    padding * 2 + maxCols * cellW + Math.max(0, maxCols - 1) * padding
  );
  const totalHeight = Math.max(
    1,
    padding * 2 + buckets.length * (headerH + headerGap + cellH) + Math.max(0, buckets.length - 1) * rowGap
  );

  const canvas = document.createElement('canvas');
  canvas.width = totalWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = false;
  if (backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, totalWidth, totalHeight);
  } else {
    ctx.clearRect(0, 0, totalWidth, totalHeight);
  }

  let curY = padding;
  for (const bucket of buckets) {
    if (includeGroupNames) {
      const stripW = Math.max(cellW, bucket.indices.length * cellW + Math.max(0, bucket.indices.length - 1) * padding);
      ctx.fillStyle = 'rgba(15, 20, 32, 0.9)';
      ctx.fillRect(padding, curY, Math.min(totalWidth - padding * 2, Math.max(stripW, 140)), headerH);
      ctx.fillStyle = bucket.color;
      ctx.fillRect(padding, curY, Math.max(3, 3 * scale), headerH);

      const fontSize = Math.max(10, Math.min(24, Math.round(headerH * 0.62)));
      ctx.font = `bold ${fontSize}px 'JetBrains Mono', monospace`;
      ctx.fillStyle = '#f8fafc';
      ctx.textBaseline = 'middle';
      ctx.fillText(bucket.name, padding + Math.max(8, 6 * scale), curY + headerH / 2);

      curY += headerH + headerGap;
    }

    bucket.indices.forEach((fIdx, slotIdx) => {
      const frame = frames[fIdx];
      if (!frame) return;
      const destX = padding + slotIdx * (cellW + padding);
      const fc = frameToCanvas(frame, frameWidth, frameHeight, scale, excludeTempLayers, layerGroups);
      ctx.drawImage(fc, destX, curY);
    });

    curY += cellH + rowGap;
  }

  return canvas;
}

// Format fighting game combat frame data export
export function generateCombatJson(project: ProjectState): string {
  const data = {
    name: project.name,
    canvasSize: { width: project.width, height: project.height },
    fps: 60,
    clips: project.clips.map(clip => ({
      name: clip.name,
      loop: clip.loop,
      framesCount: clip.frameIndices.length,
      frames: clip.frameIndices.map(fIdx => {
        const frame = project.frames[fIdx];
        return {
          frameIndex: fIdx,
          name: frame?.name,
          durationTicks: frame?.durationTicks || 4,
          phase: frame?.phase || 'neutral',
          hitboxes: (frame?.hitboxes || []).map(hb => ({
            id: hb.id,
            type: hb.type,
            rect: [hb.x, hb.y, hb.w, hb.h]
          }))
        };
      })
    }))
  };
  return JSON.stringify(data, null, 2);
}

export const DEFAULT_SYMMETRY_CONFIG: SymmetryConfig = {
  enabled: false,
  mode: 'vertical',
  axisX: 23.5,
  axisY: 23.5,
  radialPoints: 6,
  customAngleDeg: 45,
  lineP1: { x: 8, y: 8 },
  lineP2: { x: 40, y: 40 },
  showAxes: true,
  showReplicaPoints: true,
  showAffectedArea: false,
};

export function computeSymmetricPointsRaw(
  x: number,
  y: number,
  cfg: SymmetryConfig
): { x: number; y: number }[] {
  if (!cfg.enabled || cfg.mode === 'none') {
    return [{ x: Math.round(x), y: Math.round(y) }];
  }

  const cx = cfg.axisX;
  const cy = cfg.axisY;
  const dx = x - cx;
  const dy = y - cy;
  const raw: { x: number; y: number }[] = [{ x, y }];

  switch (cfg.mode) {
    case 'vertical': {
      raw.push({ x: 2 * cx - x, y });
      break;
    }
    case 'horizontal': {
      raw.push({ x, y: 2 * cy - y });
      break;
    }
    case 'quad': {
      raw.push({ x: 2 * cx - x, y });
      raw.push({ x, y: 2 * cy - y });
      raw.push({ x: 2 * cx - x, y: 2 * cy - y });
      break;
    }
    case 'double_mirror': {
      const rad = ((cfg.customAngleDeg || 0) * Math.PI) / 180;
      const c = Math.cos(rad);
      const s = Math.sin(rad);
      // Project into rotated frame (u, v)
      const u = dx * c + dy * s;
      const v = -dx * s + dy * c;
      const pairs: [number, number][] = [
        [-u, v],
        [u, -v],
        [-u, -v],
      ];
      for (const [pu, pv] of pairs) {
        raw.push({
          x: cx + pu * c - pv * s,
          y: cy + pu * s + pv * c,
        });
      }
      break;
    }
    case 'octal': {
      const variants: [number, number][] = [
        [-dx, dy],
        [dx, -dy],
        [-dx, -dy],
        [dy, dx],
        [-dy, dx],
        [dy, -dx],
        [-dy, -dx],
      ];
      for (const [vx, vy] of variants) {
        raw.push({ x: cx + vx, y: cy + vy });
      }
      break;
    }
    case 'radial': {
      const n = Math.max(2, Math.min(32, Math.round(cfg.radialPoints || 6)));
      for (let k = 1; k < n; k++) {
        const ang = (2 * Math.PI * k) / n;
        const cosA = Math.cos(ang);
        const sinA = Math.sin(ang);
        raw.push({
          x: cx + dx * cosA - dy * sinA,
          y: cy + dx * sinA + dy * cosA,
        });
      }
      break;
    }
    case 'custom_angle': {
      const rad = ((cfg.customAngleDeg || 0) * Math.PI) / 180;
      const ux = Math.cos(rad);
      const uy = Math.sin(rad);
      const dot = dx * ux + dy * uy;
      raw.push({
        x: cx + (2 * dot * ux - dx),
        y: cy + (2 * dot * uy - dy),
      });
      break;
    }
    case 'point': {
      raw.push({ x: 2 * cx - x, y: 2 * cy - y });
      break;
    }
    case 'custom_line': {
      const p1 = cfg.lineP1 || { x: 0, y: 0 };
      const p2 = cfg.lineP2 || { x: cx * 2, y: cy * 2 };
      const vx = p2.x - p1.x;
      const vy = p2.y - p1.y;
      const lenSq = vx * vx + vy * vy;
      if (lenSq > 1e-6) {
        const t = ((x - p1.x) * vx + (y - p1.y) * vy) / lenSq;
        const qx = p1.x + t * vx;
        const qy = p1.y + t * vy;
        raw.push({ x: 2 * qx - x, y: 2 * qy - y });
      }
      break;
    }
    default:
      break;
  }

  return raw.map((pt) => ({ x: Math.round(pt.x), y: Math.round(pt.y) }));
}

export function computeSymmetricPoints(
  x: number,
  y: number,
  width: number,
  height: number,
  cfg: SymmetryConfig,
  clampToBounds: boolean = true
): { x: number; y: number }[] {
  const raw = computeSymmetricPointsRaw(x, y, cfg);
  const seen = new Set<string>();
  const out: { x: number; y: number }[] = [];

  for (const pt of raw) {
    if (clampToBounds && (pt.x < 0 || pt.x >= width || pt.y < 0 || pt.y >= height)) {
      continue;
    }
    const key = `${pt.x},${pt.y}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(pt);
    }
  }
  return out;
}

export function computeSymmetricSegments(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  cfg: SymmetryConfig
): { x0: number; y0: number; x1: number; y1: number }[] {
  const pts0 = computeSymmetricPointsRaw(x0, y0, cfg);
  const pts1 = computeSymmetricPointsRaw(x1, y1, cfg);
  const count = Math.min(pts0.length, pts1.length);
  const out: { x0: number; y0: number; x1: number; y1: number }[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < count; i++) {
    const a = pts0[i];
    const b = pts1[i];
    const key = `${a.x},${a.y}->${b.x},${b.y}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ x0: a.x, y0: a.y, x1: b.x, y1: b.y });
    }
  }
  return out;
}

export type ThumbnailBoundsMode = 'canvas' | 'content';

export interface PixelContentBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Computes the tightest non-transparent pixel bounding box inside a pixel grid.
 * Returns null if the grid contains no painted pixels.
 */
export function computePixelGridBounds(
  pixels: (string | null)[][],
  width: number,
  height: number
): PixelContentBounds | null {
  const safeH = Math.min(Math.max(0, height), pixels.length);
  const safeW = Math.max(0, width);
  let minX = safeW;
  let minY = safeH;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < safeH; y++) {
    const row = pixels[y];
    if (!row) continue;
    const cols = Math.min(safeW, row.length);
    for (let x = 0; x < cols; x++) {
      const col = row[x];
      if (col && col !== 'transparent' && col !== 'rgba(0,0,0,0)' && col !== 'rgba(0, 0, 0, 0)') {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

let sharedThumbOffscreenCanvas: HTMLCanvasElement | null = null;

/**
 * Renders a pixel grid onto a destination thumbnail 2D canvas context in either:
 * - 'canvas': shows the entire canvas proportionally centered inside the thumbnail
 * - 'content': zooms proportionally to the tight bounding box of the painted content
 */
export function renderPixelGridToCanvas(
  ctx: CanvasRenderingContext2D,
  pixels: (string | null)[][],
  canvasWidth: number,
  canvasHeight: number,
  destWidth: number,
  destHeight: number,
  boundsMode: ThumbnailBoundsMode = 'canvas',
  paddingPx: number = 2,
  showCanvasFrameOutline: boolean = false
): void {
  ctx.clearRect(0, 0, destWidth, destHeight);

  const safeW = Math.max(1, canvasWidth || pixels[0]?.length || 1);
  const safeH = Math.max(1, canvasHeight || pixels.length || 1);

  let srcX = 0;
  let srcY = 0;
  let srcW = safeW;
  let srcH = safeH;

  if (boundsMode === 'content') {
    const bounds = computePixelGridBounds(pixels, safeW, safeH);
    if (!bounds) return;
    srcX = bounds.x;
    srcY = bounds.y;
    srcW = bounds.width;
    srcH = bounds.height;
  }

  const pad = Math.max(0, boundsMode === 'content' ? paddingPx : Math.min(2, paddingPx));
  const availW = Math.max(1, destWidth - pad * 2);
  const availH = Math.max(1, destHeight - pad * 2);
  const scale = Math.min(availW / srcW, availH / srcH);
  const drawW = Math.max(1, Math.round(srcW * scale));
  const drawH = Math.max(1, Math.round(srcH * scale));
  const ox = Math.floor((destWidth - drawW) / 2);
  const oy = Math.floor((destHeight - drawH) / 2);

  if (typeof document === 'undefined') return;

  if (boundsMode === 'canvas' && srcX === 0 && srcY === 0 && srcW === safeW && srcH === safeH) {
    // Fast path: reuse WeakMap-cached 1:1 ImageData canvas for this pixel grid
    const cached = getCachedPixelGridCanvas(pixels, safeW, safeH);
    ctx.imageSmoothingEnabled = scale < 0.72;
    ctx.drawImage(cached, 0, 0, safeW, safeH, ox, oy, drawW, drawH);
    ctx.imageSmoothingEnabled = false;
  } else {
    if (!sharedThumbOffscreenCanvas) {
      sharedThumbOffscreenCanvas = document.createElement('canvas');
    }
    const { canvas: off, hasAnyPixel } = blitPixelGridSubRectToCanvas(
      pixels,
      srcX,
      srcY,
      srcW,
      srcH,
      sharedThumbOffscreenCanvas
    );

    if (hasAnyPixel) {
      // Keep pixel art razor sharp when upscaling or near-1:1; allow smooth downscale
      // only on high-res canvases so 1px strokes remain visible in tiny thumbnails.
      ctx.imageSmoothingEnabled = scale < 0.72;
      ctx.drawImage(off, 0, 0, srcW, srcH, ox, oy, drawW, drawH);
      ctx.imageSmoothingEnabled = false;
    }
  }

  if (showCanvasFrameOutline && boundsMode === 'canvas' && drawW < destWidth - 2 && drawH < destHeight - 2) {
    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + 0.5, oy + 0.5, Math.max(1, drawW - 1), Math.max(1, drawH - 1));
    ctx.restore();
  }
}
