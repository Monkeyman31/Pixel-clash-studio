import { Frame, Layer, LayerGroup } from '../types';

// =============================================================================
// HIGH-PERFORMANCE COLOR LUT & RENDER CACHE ENGINE
// =============================================================================
// Eliminates per-pixel regex parsing, repeated layer rasterization, full-frame
// recompositing on mouse hover, and slow fillRect(x, y, 1, 1) loops across
// CanvasViewport, Timeline thumbnails, Layer thumbnails, MiniPreview, and Export.

const MAX_COLOR_CACHE_ENTRIES = 8192;
const rgbaTupleCache = new Map<string, [number, number, number, number]>();
const abgr32Cache = new Map<string, number>();

function hexCharVal(code: number): number {
  if (code >= 48 && code <= 57) return code - 48; // 0-9
  if (code >= 65 && code <= 70) return code - 55; // A-F
  if (code >= 97 && code <= 102) return code - 87; // a-f
  return 0;
}

/**
 * Fast cached parser for `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb(...)`, `rgba(...)`.
 * Zero regex allocation on standard hex strings.
 */
export function parseColorToRgbaTupleFast(color: string): [number, number, number, number] {
  const cached = rgbaTupleCache.get(color);
  if (cached) return cached;

  let r = 0;
  let g = 0;
  let b = 0;
  let a = 1;

  const trimmed = color.trim();
  const len = trimmed.length;

  if (len > 0 && trimmed.charCodeAt(0) === 35 /* '#' */) {
    if (len === 7) {
      r = (hexCharVal(trimmed.charCodeAt(1)) << 4) | hexCharVal(trimmed.charCodeAt(2));
      g = (hexCharVal(trimmed.charCodeAt(3)) << 4) | hexCharVal(trimmed.charCodeAt(4));
      b = (hexCharVal(trimmed.charCodeAt(5)) << 4) | hexCharVal(trimmed.charCodeAt(6));
      a = 1;
    } else if (len === 9) {
      r = (hexCharVal(trimmed.charCodeAt(1)) << 4) | hexCharVal(trimmed.charCodeAt(2));
      g = (hexCharVal(trimmed.charCodeAt(3)) << 4) | hexCharVal(trimmed.charCodeAt(4));
      b = (hexCharVal(trimmed.charCodeAt(5)) << 4) | hexCharVal(trimmed.charCodeAt(6));
      const aByte = (hexCharVal(trimmed.charCodeAt(7)) << 4) | hexCharVal(trimmed.charCodeAt(8));
      a = aByte / 255;
    } else if (len === 4) {
      const r4 = hexCharVal(trimmed.charCodeAt(1));
      const g4 = hexCharVal(trimmed.charCodeAt(2));
      const b4 = hexCharVal(trimmed.charCodeAt(3));
      r = (r4 << 4) | r4;
      g = (g4 << 4) | g4;
      b = (b4 << 4) | b4;
      a = 1;
    } else {
      const clean = trimmed.slice(1).padEnd(6, '0').slice(0, 6);
      r = parseInt(clean.slice(0, 2), 16) || 0;
      g = parseInt(clean.slice(2, 4), 16) || 0;
      b = parseInt(clean.slice(4, 6), 16) || 0;
      a = 1;
    }
  } else if (trimmed.charCodeAt(0) === 114 || trimmed.charCodeAt(0) === 82 /* 'r'/'R' */) {
    const open = trimmed.indexOf('(');
    const close = trimmed.lastIndexOf(')');
    if (open > 0 && close > open) {
      const parts = trimmed.slice(open + 1, close).split(',');
      if (parts.length >= 3) {
        r = Math.max(0, Math.min(255, Math.round(parseFloat(parts[0]) || 0)));
        g = Math.max(0, Math.min(255, Math.round(parseFloat(parts[1]) || 0)));
        b = Math.max(0, Math.min(255, Math.round(parseFloat(parts[2]) || 0)));
        if (parts.length >= 4) {
          const parsedA = parseFloat(parts[3]);
          a = Number.isFinite(parsedA) ? Math.max(0, Math.min(1, parsedA)) : 1;
        }
      }
    }
  }

  const tuple: [number, number, number, number] = [r, g, b, a];
  if (rgbaTupleCache.size >= MAX_COLOR_CACHE_ENTRIES) {
    rgbaTupleCache.clear();
  }
  rgbaTupleCache.set(color, tuple);
  return tuple;
}

/**
 * Packs a CSS color string into a little-endian ABGR 32-bit unsigned integer
 * suitable for direct writes to `new Uint32Array(imageData.data.buffer)`.
 */
export function parseColorToAbgr32Fast(color: string): number {
  const cached = abgr32Cache.get(color);
  if (cached !== undefined) return cached;

  const [r, g, b, a] = parseColorToRgbaTupleFast(color);
  const aByte = Math.max(0, Math.min(255, Math.round(a * 255)));
  const packed = ((aByte << 24) | (b << 16) | (g << 8) | r) >>> 0;

  if (abgr32Cache.size >= MAX_COLOR_CACHE_ENTRIES) {
    abgr32Cache.clear();
  }
  abgr32Cache.set(color, packed);
  return packed;
}

/**
 * Fast check whether a PixelGrid contains any transparent or semi-transparent pixel.
 */
export function gridHasTransparency(
  grid: (string | null)[][],
  width: number,
  height: number
): boolean {
  for (let y = 0; y < height; y++) {
    const row = grid[y];
    if (!row) return true;
    for (let x = 0; x < width; x++) {
      const col = row[x];
      if (!col) return true;
      const abgr = parseColorToAbgr32Fast(col);
      if ((abgr >>> 24) < 255) return true;
    }
  }
  return false;
}

// =============================================================================
// DIRECT ImageData (Uint32Array) BLITTING INTO CANVAS
// =============================================================================

export function blitPixelGridToCanvas(
  grid: (string | null)[][],
  width: number,
  height: number,
  targetCanvas?: HTMLCanvasElement | null
): HTMLCanvasElement {
  const safeW = Math.max(1, width);
  const safeH = Math.max(1, height);
  const canvas = targetCanvas || document.createElement('canvas');
  if (canvas.width !== safeW) canvas.width = safeW;
  if (canvas.height !== safeH) canvas.height = safeH;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const imgData = ctx.createImageData(safeW, safeH);
  const buf32 = new Uint32Array(imgData.data.buffer);

  const rowLimit = Math.min(safeH, grid.length);
  for (let y = 0; y < rowLimit; y++) {
    const row = grid[y];
    if (!row) continue;
    const colLimit = Math.min(safeW, row.length);
    const rowOffset = y * safeW;
    for (let x = 0; x < colLimit; x++) {
      const col = row[x];
      if (col) {
        buf32[rowOffset + x] = parseColorToAbgr32Fast(col);
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

export function blitPixelGridSubRectToCanvas(
  grid: (string | null)[][],
  srcX: number,
  srcY: number,
  srcW: number,
  srcH: number,
  targetCanvas?: HTMLCanvasElement | null
): { canvas: HTMLCanvasElement; hasAnyPixel: boolean } {
  const safeW = Math.max(1, srcW);
  const safeH = Math.max(1, srcH);
  const canvas = targetCanvas || document.createElement('canvas');
  if (canvas.width !== safeW) canvas.width = safeW;
  if (canvas.height !== safeH) canvas.height = safeH;

  const ctx = canvas.getContext('2d');
  if (!ctx) return { canvas, hasAnyPixel: false };

  const imgData = ctx.createImageData(safeW, safeH);
  const buf32 = new Uint32Array(imgData.data.buffer);
  let hasAnyPixel = false;

  const maxY = Math.min(grid.length, srcY + safeH);
  for (let y = Math.max(0, srcY); y < maxY; y++) {
    const row = grid[y];
    if (!row) continue;
    const maxX = Math.min(row.length, srcX + safeW);
    const destRowOffset = (y - srcY) * safeW;
    for (let x = Math.max(0, srcX); x < maxX; x++) {
      const col = row[x];
      if (col) {
        const packed = parseColorToAbgr32Fast(col);
        if ((packed >>> 24) > 0) {
          buf32[destRowOffset + (x - srcX)] = packed;
          hasAnyPixel = true;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return { canvas, hasAnyPixel };
}

// =============================================================================
// WEAKMAP-BACKED SMART CACHES (UNCHANGED LAYERS & FRAMES ARE NEVER REBUILT)
// =============================================================================

interface GridCanvasCacheEntry {
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
}

const pixelGridCanvasCache = new WeakMap<(string | null)[][], GridCanvasCacheEntry>();

/**
 * Returns a cached 1:1 HTMLCanvasElement for an immutable PixelGrid reference.
 * If the grid reference has not changed, returns the cached canvas in O(1).
 */
export function getCachedPixelGridCanvas(
  grid: (string | null)[][],
  width: number,
  height: number
): HTMLCanvasElement {
  const existing = pixelGridCanvasCache.get(grid);
  if (existing && existing.width === width && existing.height === height) {
    return existing.canvas;
  }
  const canvas = blitPixelGridToCanvas(grid, width, height);
  pixelGridCanvasCache.set(grid, { width, height, canvas });
  return canvas;
}

// Cache rasterized vectorPaths + parametricShapes per Layer instance
interface LayerEffectivePixelsCacheEntry {
  width: number;
  height: number;
  pixelsRef: (string | null)[][];
  vectorsRef: Layer['vectorPaths'];
  shapesRef: Layer['parametricShapes'];
  layerType: Layer['layerType'];
  result: (string | null)[][];
}

const layerEffectivePixelsCache = new WeakMap<Layer, LayerEffectivePixelsCacheEntry>();

export function getCachedLayerEffectivePixels(
  layer: Layer,
  width: number,
  height: number,
  computeFn: () => (string | null)[][]
): (string | null)[][] {
  // Fast path: pure raster layer with no vectors or parametric shapes
  const hasVectors = Boolean(layer.vectorPaths && layer.vectorPaths.length > 0);
  const hasShapes = Boolean(layer.parametricShapes && layer.parametricShapes.length > 0);
  if (!hasVectors && !hasShapes) {
    return layer.pixels;
  }

  const existing = layerEffectivePixelsCache.get(layer);
  if (
    existing &&
    existing.width === width &&
    existing.height === height &&
    existing.pixelsRef === layer.pixels &&
    existing.vectorsRef === layer.vectorPaths &&
    existing.shapesRef === layer.parametricShapes &&
    existing.layerType === layer.layerType
  ) {
    return existing.result;
  }

  const result = computeFn();
  layerEffectivePixelsCache.set(layer, {
    width,
    height,
    pixelsRef: layer.pixels,
    vectorsRef: layer.vectorPaths,
    shapesRef: layer.parametricShapes,
    layerType: layer.layerType,
    result,
  });
  return result;
}

// Cache composited grids per frame.layers reference
interface CompositeFrameCacheEntry {
  key: string;
  layerGroupsRef: LayerGroup[];
  grid: (string | null)[][];
  canvas?: HTMLCanvasElement;
}

const compositeFrameCache = new WeakMap<Layer[], Map<string, CompositeFrameCacheEntry>>();

function buildGroupSignature(layerGroups: LayerGroup[]): string {
  if (!layerGroups || layerGroups.length === 0) return '';
  let sig = '';
  for (let i = 0; i < layerGroups.length; i++) {
    const g = layerGroups[i];
    sig += `${g.id}:${g.visible === false ? 0 : 1}:${g.opacity ?? 1}:${g.parentGroupId || ''};`;
  }
  return sig;
}

function buildLayersShallowSignature(layers: Layer[]): string {
  let sig = `${layers.length}|`;
  for (let i = 0; i < layers.length; i++) {
    const l = layers[i];
    sig += `${l.id}:${l.visible ? 1 : 0}:${l.opacity ?? 1}:${l.fillOpacity ?? 1}:${l.blendMode || 'n'}:${l.clippingMask ? 1 : 0}:${l.groupId || ''}:${l.layerType || 'p'}:${l.mask && !l.mask.disabled ? (l.mask.inverted ? 'mi' : 'm') : '0'};`;
  }
  return sig;
}

export function getOrComputeCompositeFrame(
  frame: Frame,
  width: number,
  height: number,
  frameIndex: number,
  excludeTempLayers: boolean,
  layerGroups: LayerGroup[],
  computeFn: () => (string | null)[][]
): (string | null)[][] {
  let byKey = compositeFrameCache.get(frame.layers);
  if (!byKey) {
    byKey = new Map<string, CompositeFrameCacheEntry>();
    compositeFrameCache.set(frame.layers, byKey);
  }

  // Only include frameIndex in cache key if at least one layer has keyframes
  let hasKeyframes = false;
  for (let i = 0; i < frame.layers.length; i++) {
    if (frame.layers[i].keyframes && frame.layers[i].keyframes!.length > 0) {
      hasKeyframes = true;
      break;
    }
  }

  const effectiveIdx = hasKeyframes ? frameIndex : -1;
  const cacheKey = `${width}x${height}|${effectiveIdx}|${excludeTempLayers ? 1 : 0}|${buildLayersShallowSignature(frame.layers)}|${buildGroupSignature(layerGroups)}`;

  const hit = byKey.get(cacheKey);
  if (hit) {
    return hit.grid;
  }

  const grid = computeFn();
  // Keep per-frame-layers cache small (max 6 variants)
  if (byKey.size >= 6) {
    byKey.clear();
  }
  byKey.set(cacheKey, {
    key: cacheKey,
    layerGroupsRef: layerGroups,
    grid,
  });
  return grid;
}

// Cache tinted onion-skin silhouette canvases per composited grid
const onionSkinCanvasCache = new WeakMap<(string | null)[][], Map<number, HTMLCanvasElement>>();

/**
 * Returns a cached tinted silhouette HTMLCanvasElement for onion-skin rendering.
 * Replaces W*H `ctx.fillRect` calls per onion-skin step with a single `ctx.drawImage`.
 */
export function getCachedOnionSkinCanvas(
  compositedGrid: (string | null)[][],
  width: number,
  height: number,
  tintColor: string
): HTMLCanvasElement {
  const tintAbgr = parseColorToAbgr32Fast(tintColor);
  let byTint = onionSkinCanvasCache.get(compositedGrid);
  if (byTint) {
    const existing = byTint.get(tintAbgr);
    if (existing && existing.width === width && existing.height === height) {
      return existing;
    }
  } else {
    byTint = new Map<number, HTMLCanvasElement>();
    onionSkinCanvasCache.set(compositedGrid, byTint);
  }

  const safeW = Math.max(1, width);
  const safeH = Math.max(1, height);
  const canvas = document.createElement('canvas');
  canvas.width = safeW;
  canvas.height = safeH;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const imgData = ctx.createImageData(safeW, safeH);
    const buf32 = new Uint32Array(imgData.data.buffer);
    const rowLimit = Math.min(safeH, compositedGrid.length);
    for (let y = 0; y < rowLimit; y++) {
      const row = compositedGrid[y];
      if (!row) continue;
      const colLimit = Math.min(safeW, row.length);
      const rowOffset = y * safeW;
      for (let x = 0; x < colLimit; x++) {
        if (row[x]) {
          buf32[rowOffset + x] = tintAbgr;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  if (byTint.size >= 4) byTint.clear();
  byTint.set(tintAbgr, canvas);
  return canvas;
}

/**
 * Schedules non-urgent work during browser idle time with safe fallback.
 */
export function scheduleIdleTask(cb: () => void, timeoutMs: number = 600): () => void {
  if (typeof window !== 'undefined' && typeof (window as unknown as { requestIdleCallback?: unknown }).requestIdleCallback === 'function') {
    const win = window as unknown as {
      requestIdleCallback: (fn: () => void, opts?: { timeout?: number }) => number;
      cancelIdleCallback: (id: number) => void;
    };
    const id = win.requestIdleCallback(cb, { timeout: timeoutMs });
    return () => win.cancelIdleCallback(id);
  }
  const timer = window.setTimeout(cb, Math.min(120, timeoutMs));
  return () => window.clearTimeout(timer);
}
