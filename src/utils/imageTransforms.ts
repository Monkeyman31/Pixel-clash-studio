import {
  CanvasEditAnchor,
  CanvasEditOverflowMode,
  CanvasEditRect,
  Frame,
  Hitbox,
  InterpolationMode,
  Layer,
} from '../types';
import { createEmptyGrid } from './pixelMath';
import {
  getTiledStore,
  registerTiledStore,
  shouldUseTiledStorage,
  TiledLayerStore,
} from './tiledImageEngine';
import { parseColorToRgbaTupleFast } from './renderCache';

export type AnchorPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

function rgbaToCss(r: number, g: number, b: number, a: number): string | null {
  if (a <= 0) return null;
  if (a >= 254) {
    return `#${((1 << 24) | ((r & 255) << 16) | ((g & 255) << 8) | (b & 255)).toString(16).slice(1)}`;
  }
  const alpha = Math.max(0.004, Math.min(1, Math.round((a / 255) * 1000) / 1000));
  return `rgba(${r & 255},${g & 255},${b & 255},${alpha})`;
}

function layerToTiledStore(layer: Layer, width: number, height: number): TiledLayerStore {
  const existing = getTiledStore(layer.tiledStoreId);
  if (existing) return existing;
  const store = new TiledLayerStore(width, height);
  store.loadFromPixelGrid(layer.pixels || [], width, height);
  return store;
}

function finalizeLayerFromTiledStore(
  layer: Layer,
  store: TiledLayerStore,
  targetW: number,
  targetH: number,
  offCanvasPixels?: Record<string, string>
): Layer {
  if (shouldUseTiledStorage(targetW, targetH)) {
    const newId = registerTiledStore(store);
    return {
      ...layer,
      pixels: [],
      tiledStoreId: newId,
      tiledRevision: (layer.tiledRevision || 1) + 1,
      offCanvasPixels,
    };
  }
  const { grid } = store.sliceRegionToPixelGrid(0, 0, targetW, targetH);
  store.dispose();
  return {
    ...layer,
    pixels: grid,
    tiledStoreId: undefined,
    tiledRevision: undefined,
    offCanvasPixels,
  };
}

/**
 * Computes anchored canvas rect [left, top, width, height] in original canvas pixel coordinates.
 */
export function computeAnchoredCanvasRect(
  oldW: number,
  oldH: number,
  targetW: number,
  targetH: number,
  anchor: CanvasEditAnchor
): CanvasEditRect {
  const safeW = Math.max(1, Math.round(targetW));
  const safeH = Math.max(1, Math.round(targetH));

  let left = 0;
  let top = 0;

  if (anchor === 'left' || anchor === 'top-left' || anchor === 'bottom-left') {
    left = 0;
  } else if (anchor === 'right' || anchor === 'top-right' || anchor === 'bottom-right') {
    left = oldW - safeW;
  } else {
    left = Math.floor((oldW - safeW) / 2);
  }

  if (anchor === 'top' || anchor === 'top-left' || anchor === 'top-right') {
    top = 0;
  } else if (anchor === 'bottom' || anchor === 'bottom-left' || anchor === 'bottom-right') {
    top = oldH - safeH;
  } else {
    top = Math.floor((oldH - safeH) / 2);
  }

  return { left, top, width: safeW, height: safeH };
}

/**
 * Scans all frames & layers (both visible pixels, sparse tiled stores, vectors, and off-canvas cache)
 * to determine exact content bounds for Auto-Expand / Fit-to-Content.
 */
export function computeAllFramesContentBounds(
  frames: Frame[],
  canvasW: number,
  canvasH: number
): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  hasContent: boolean;
  hasOffCanvas: boolean;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let hasOffCanvas = false;

  const includePoint = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (x < 0 || x >= canvasW || y < 0 || y >= canvasH) {
      hasOffCanvas = true;
    }
  };

  for (const frame of frames) {
    for (const layer of frame.layers) {
      if (layer.offCanvasPixels) {
        for (const [coord, col] of Object.entries(layer.offCanvasPixels)) {
          if (!col) continue;
          const comma = coord.indexOf(',');
          if (comma === -1) continue;
          const ox = parseInt(coord.slice(0, comma), 10);
          const oy = parseInt(coord.slice(comma + 1), 10);
          if (!Number.isNaN(ox) && !Number.isNaN(oy)) {
            includePoint(ox, oy);
          }
        }
      }

      const store = getTiledStore(layer.tiledStoreId);
      if (store) {
        const b = store.getContentBounds();
        if (b) {
          includePoint(b.minX, b.minY);
          includePoint(b.maxX, b.maxY);
        }
      } else if (layer.pixels && layer.pixels.length > 0) {
        const rows = Math.min(layer.pixels.length, canvasH);
        for (let y = 0; y < rows; y++) {
          const row = layer.pixels[y];
          if (!row) continue;
          const cols = Math.min(row.length, canvasW);
          for (let x = 0; x < cols; x++) {
            if (row[x]) {
              includePoint(x, y);
            }
          }
        }
      }

      if (layer.vectorPaths && layer.vectorPaths.length > 0) {
        for (const vp of layer.vectorPaths) {
          for (const node of vp.nodes) {
            includePoint(Math.floor(node.x), Math.floor(node.y));
          }
        }
      }

      if (layer.parametricShapes && layer.parametricShapes.length > 0) {
        for (const shape of layer.parametricShapes) {
          includePoint(Math.floor(shape.x), Math.floor(shape.y));
          includePoint(Math.ceil(shape.x + shape.width) - 1, Math.ceil(shape.y + shape.height) - 1);
        }
      }
    }
  }

  if (!Number.isFinite(minX)) {
    return {
      minX: 0,
      minY: 0,
      maxX: Math.max(0, canvasW - 1),
      maxY: Math.max(0, canvasH - 1),
      hasContent: false,
      hasOffCanvas: false,
    };
  }

  return { minX, minY, maxX, maxY, hasContent: true, hasOffCanvas };
}

/**
 * Applies a visual Canvas Edit Rect transform across all frames & layers with full 1:1 pixel fidelity
 * (zero automatic scaling) and explicit off-canvas handling:
 *   - 'keep': preserves cropped-out pixels in layer.offCanvasPixels & restores them if expanded back
 *   - 'crop': permanently removes out-of-bounds pixels & clears offCanvasPixels
 *   - 'auto_expand': expands target rect automatically so no pixel content (including off-canvas) is lost
 */
export function applyCanvasRectTransform(
  frames: Frame[],
  oldW: number,
  oldH: number,
  requestedRect: CanvasEditRect,
  overflowMode: CanvasEditOverflowMode = 'keep'
): {
  frames: Frame[];
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
} {
  let left = Math.round(requestedRect.left);
  let top = Math.round(requestedRect.top);
  let right = left + Math.max(1, Math.round(requestedRect.width));
  let bottom = top + Math.max(1, Math.round(requestedRect.height));

  if (overflowMode === 'auto_expand') {
    const contentBounds = computeAllFramesContentBounds(frames, oldW, oldH);
    if (contentBounds.hasContent) {
      left = Math.min(left, contentBounds.minX);
      top = Math.min(top, contentBounds.minY);
      right = Math.max(right, contentBounds.maxX + 1);
      bottom = Math.max(bottom, contentBounds.maxY + 1);
    }
  }

  const safeNewW = Math.max(1, right - left);
  const safeNewH = Math.max(1, bottom - top);
  const offsetX = -left;
  const offsetY = -top;
  const keepOffCanvas = overflowMode === 'keep';
  const targetNeedsTiled = shouldUseTiledStorage(safeNewW, safeNewH);

  const shiftVectors = (layer: Layer) => {
    const shiftedVectorPaths = layer.vectorPaths?.map((vp) => ({
      ...vp,
      nodes: vp.nodes.map((n) => ({
        ...n,
        x: n.x + offsetX,
        y: n.y + offsetY,
        inHandleX: typeof n.inHandleX === 'number' ? n.inHandleX + offsetX : n.inHandleX,
        inHandleY: typeof n.inHandleY === 'number' ? n.inHandleY + offsetY : n.inHandleY,
        outHandleX: typeof n.outHandleX === 'number' ? n.outHandleX + offsetX : n.outHandleX,
        outHandleY: typeof n.outHandleY === 'number' ? n.outHandleY + offsetY : n.outHandleY,
      })),
    }));

    const shiftedShapes = layer.parametricShapes?.map((sh) => ({
      ...sh,
      x: sh.x + offsetX,
      y: sh.y + offsetY,
    }));

    return { shiftedVectorPaths, shiftedShapes };
  };

  const nextFrames = frames.map((frame) => {
    const nextLayers: Layer[] = frame.layers.map((layer) => {
      const { shiftedVectorPaths, shiftedShapes } = shiftVectors(layer);
      const sourceStore = getTiledStore(layer.tiledStoreId);

      if (sourceStore || targetNeedsTiled) {
        const baseStore = sourceStore || layerToTiledStore(layer, oldW, oldH);
        const { store: resizedStore, offCanvasPixels } = baseStore.resizeCanvasWithRect(
          left,
          top,
          safeNewW,
          safeNewH,
          keepOffCanvas,
          overflowMode === 'crop' ? undefined : layer.offCanvasPixels
        );
        if (!sourceStore) baseStore.dispose();
        const finalized = finalizeLayerFromTiledStore(
          layer,
          resizedStore,
          safeNewW,
          safeNewH,
          offCanvasPixels
        );
        return {
          ...finalized,
          vectorPaths: shiftedVectorPaths,
          parametricShapes: shiftedShapes,
        };
      }

      const newGrid = createEmptyGrid(safeNewW, safeNewH);
      const nextOffCanvas: Record<string, string> = {};
      let hasOff = false;

      // 1. Re-project existing off-canvas pixels (unless hard-cropping)
      if (overflowMode !== 'crop' && layer.offCanvasPixels) {
        for (const [coord, col] of Object.entries(layer.offCanvasPixels)) {
          if (!col) continue;
          const comma = coord.indexOf(',');
          if (comma === -1) continue;
          const ox = parseInt(coord.slice(0, comma), 10);
          const oy = parseInt(coord.slice(comma + 1), 10);
          if (Number.isNaN(ox) || Number.isNaN(oy)) continue;
          const destX = ox + offsetX;
          const destY = oy + offsetY;
          if (destX >= 0 && destX < safeNewW && destY >= 0 && destY < safeNewH) {
            newGrid[destY][destX] = col;
          } else if (keepOffCanvas) {
            nextOffCanvas[`${destX},${destY}`] = col;
            hasOff = true;
          }
        }
      }

      // 2. Copy all visible canvas pixels (shifted by offsetX, offsetY)
      for (let y = 0; y < oldH; y++) {
        const row = layer.pixels[y];
        if (!row) continue;
        const destY = y + offsetY;
        for (let x = 0; x < oldW; x++) {
          const col = row[x];
          if (!col) continue;
          const destX = x + offsetX;
          if (destX >= 0 && destX < safeNewW && destY >= 0 && destY < safeNewH) {
            newGrid[destY][destX] = col;
          } else if (keepOffCanvas) {
            nextOffCanvas[`${destX},${destY}`] = col;
            hasOff = true;
          }
        }
      }

      return {
        ...layer,
        pixels: newGrid,
        tiledStoreId: undefined,
        tiledRevision: undefined,
        offCanvasPixels: keepOffCanvas && hasOff ? nextOffCanvas : undefined,
        vectorPaths: shiftedVectorPaths,
        parametricShapes: shiftedShapes,
      };
    });

    const nextHitboxes: Hitbox[] = (frame.hitboxes || []).map((hb) => ({
      ...hb,
      x: Math.max(0, Math.min(Math.max(0, safeNewW - hb.w), hb.x + offsetX)),
      y: Math.max(0, Math.min(Math.max(0, safeNewH - hb.h), hb.y + offsetY)),
    }));

    return {
      ...frame,
      layers: nextLayers,
      hitboxes: nextHitboxes,
      pivot: frame.pivot
        ? { x: frame.pivot.x + offsetX, y: frame.pivot.y + offsetY }
        : undefined,
    };
  });

  return {
    frames: nextFrames,
    width: safeNewW,
    height: safeNewH,
    offsetX,
    offsetY,
  };
}

// Resize Canvas (Adds padding or crops pixels according to anchor — ZERO pixel scaling)
export function resizeCanvasGrid(
  frames: Frame[],
  oldW: number,
  oldH: number,
  newW: number,
  newH: number,
  anchor: AnchorPosition = 'center'
): Frame[] {
  const safeNewW = Math.max(1, Math.round(newW));
  const safeNewH = Math.max(1, Math.round(newH));
  const targetNeedsTiled = shouldUseTiledStorage(safeNewW, safeNewH);

  let offsetX = 0;
  let offsetY = 0;

  if (anchor.includes('left')) offsetX = 0;
  else if (anchor.includes('right')) offsetX = safeNewW - oldW;
  else offsetX = Math.floor((safeNewW - oldW) / 2);

  if (anchor.includes('top')) offsetY = 0;
  else if (anchor.includes('bottom')) offsetY = safeNewH - oldH;
  else offsetY = Math.floor((safeNewH - oldH) / 2);

  return frames.map((frame) => {
    const nextLayers: Layer[] = frame.layers.map((layer) => {
      const sourceStore = getTiledStore(layer.tiledStoreId);
      if (sourceStore || targetNeedsTiled) {
        const baseStore = sourceStore || layerToTiledStore(layer, oldW, oldH);
        const resizedStore = baseStore.resizeCanvas(safeNewW, safeNewH, anchor);
        if (!sourceStore) baseStore.dispose();
        return finalizeLayerFromTiledStore(layer, resizedStore, safeNewW, safeNewH);
      }

      const newGrid = createEmptyGrid(safeNewW, safeNewH);
      for (let y = 0; y < oldH; y++) {
        const row = layer.pixels[y];
        if (!row) continue;
        const destY = y + offsetY;
        if (destY < 0 || destY >= safeNewH) continue;
        for (let x = 0; x < oldW; x++) {
          const col = row[x];
          const destX = x + offsetX;
          if (col && destX >= 0 && destX < safeNewW) {
            newGrid[destY][destX] = col;
          }
        }
      }
      return { ...layer, pixels: newGrid, tiledStoreId: undefined };
    });

    const nextHitboxes: Hitbox[] = (frame.hitboxes || []).map((hb) => ({
      ...hb,
      x: Math.max(0, Math.min(Math.max(0, safeNewW - hb.w), hb.x + offsetX)),
      y: Math.max(0, Math.min(Math.max(0, safeNewH - hb.h), hb.y + offsetY)),
    }));

    return {
      ...frame,
      layers: nextLayers,
      hitboxes: nextHitboxes,
      pivot: frame.pivot
        ? { x: frame.pivot.x + offsetX, y: frame.pivot.y + offsetY }
        : undefined,
    };
  });
}

function rescalePixelGridSmooth(
  grid: (string | null)[][],
  oldW: number,
  oldH: number,
  newW: number,
  newH: number,
  interpolation: InterpolationMode
): (string | null)[][] {
  if (typeof document === 'undefined' || interpolation === 'nearest') {
    const scaleX = newW / Math.max(1, oldW);
    const scaleY = newH / Math.max(1, oldH);
    const newGrid = createEmptyGrid(newW, newH);
    for (let destY = 0; destY < newH; destY++) {
      const srcY = Math.min(oldH - 1, Math.floor(destY / scaleY));
      const srcRow = grid[srcY];
      if (!srcRow) continue;
      for (let destX = 0; destX < newW; destX++) {
        const srcX = Math.min(oldW - 1, Math.floor(destX / scaleX));
        const col = srcRow[srcX];
        if (col) newGrid[destY][destX] = col;
      }
    }
    return newGrid;
  }

  // Smooth Bilinear / Bicubic canvas resampling (only when explicitly requested by user)
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = oldW;
  srcCanvas.height = oldH;
  const sctx = srcCanvas.getContext('2d');
  if (!sctx) return createEmptyGrid(newW, newH);
  const srcImg = sctx.createImageData(oldW, oldH);
  for (let y = 0; y < oldH; y++) {
    const row = grid[y];
    if (!row) continue;
    for (let x = 0; x < oldW; x++) {
      const col = row[x];
      if (!col) continue;
      const [r, g, b, a] = parseColorToRgbaTupleFast(col);
      const off = (y * oldW + x) * 4;
      srcImg.data[off] = r;
      srcImg.data[off + 1] = g;
      srcImg.data[off + 2] = b;
      srcImg.data[off + 3] = Math.max(0, Math.min(255, Math.round(a * 255)));
    }
  }
  sctx.putImageData(srcImg, 0, 0);

  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = newW;
  dstCanvas.height = newH;
  const dctx = dstCanvas.getContext('2d');
  if (!dctx) return createEmptyGrid(newW, newH);
  dctx.imageSmoothingEnabled = true;
  dctx.imageSmoothingQuality = interpolation === 'bicubic' ? 'high' : 'medium';
  dctx.drawImage(srcCanvas, 0, 0, newW, newH);
  const outImg = dctx.getImageData(0, 0, newW, newH);

  const newGrid = createEmptyGrid(newW, newH);
  for (let y = 0; y < newH; y++) {
    for (let x = 0; x < newW; x++) {
      const off = (y * newW + x) * 4;
      const a = outImg.data[off + 3];
      if (a > 0) {
        newGrid[y][x] = rgbaToCss(outImg.data[off], outImg.data[off + 1], outImg.data[off + 2], a);
      }
    }
  }
  return newGrid;
}

// Rescale Image / Sprite (Strictly Nearest Neighbor by default; Bilinear/Bicubic only if explicitly chosen)
export function rescaleSpriteGrid(
  frames: Frame[],
  oldW: number,
  oldH: number,
  newW: number,
  newH: number,
  interpolation: InterpolationMode = 'nearest'
): Frame[] {
  const safeNewW = Math.max(1, Math.round(newW));
  const safeNewH = Math.max(1, Math.round(newH));
  const targetNeedsTiled = shouldUseTiledStorage(safeNewW, safeNewH);
  const scaleX = safeNewW / Math.max(1, oldW);
  const scaleY = safeNewH / Math.max(1, oldH);

  return frames.map((frame) => {
    const nextLayers: Layer[] = frame.layers.map((layer) => {
      const sourceStore = getTiledStore(layer.tiledStoreId);
      if (sourceStore || targetNeedsTiled) {
        const baseStore = sourceStore || layerToTiledStore(layer, oldW, oldH);
        const rescaledStore = baseStore.rescale(safeNewW, safeNewH, interpolation);
        if (!sourceStore) baseStore.dispose();
        return finalizeLayerFromTiledStore(layer, rescaledStore, safeNewW, safeNewH);
      }

      const newGrid = rescalePixelGridSmooth(
        layer.pixels,
        oldW,
        oldH,
        safeNewW,
        safeNewH,
        interpolation
      );
      return { ...layer, pixels: newGrid, tiledStoreId: undefined };
    });

    const nextHitboxes: Hitbox[] = (frame.hitboxes || []).map((hb) => ({
      ...hb,
      x: Math.round(hb.x * scaleX),
      y: Math.round(hb.y * scaleY),
      w: Math.max(2, Math.round(hb.w * scaleX)),
      h: Math.max(2, Math.round(hb.h * scaleY)),
    }));

    return {
      ...frame,
      layers: nextLayers,
      hitboxes: nextHitboxes,
      pivot: frame.pivot
        ? { x: Math.round(frame.pivot.x * scaleX), y: Math.round(frame.pivot.y * scaleY) }
        : undefined,
    };
  });
}

// Flip Canvas Horizontally across all frames
export function flipCanvasHorizontal(frames: Frame[], width: number, height: number): Frame[] {
  return frames.map((frame) => {
    const nextLayers: Layer[] = frame.layers.map((layer) => {
      const store = getTiledStore(layer.tiledStoreId);
      if (store) {
        const flipped = store.flipHorizontal();
        const newId = registerTiledStore(flipped);
        return { ...layer, tiledStoreId: newId, tiledRevision: (layer.tiledRevision || 1) + 1 };
      }

      const newGrid = createEmptyGrid(width, height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          newGrid[y][width - 1 - x] = layer.pixels[y]?.[x] || null;
        }
      }
      return { ...layer, pixels: newGrid };
    });

    const nextHitboxes: Hitbox[] = (frame.hitboxes || []).map((hb) => ({
      ...hb,
      x: width - (hb.x + hb.w),
    }));

    return { ...frame, layers: nextLayers, hitboxes: nextHitboxes };
  });
}

// Flip Canvas Vertically across all frames
export function flipCanvasVertical(frames: Frame[], width: number, height: number): Frame[] {
  return frames.map((frame) => {
    const nextLayers: Layer[] = frame.layers.map((layer) => {
      const store = getTiledStore(layer.tiledStoreId);
      if (store) {
        const flipped = store.flipVertical();
        const newId = registerTiledStore(flipped);
        return { ...layer, tiledStoreId: newId, tiledRevision: (layer.tiledRevision || 1) + 1 };
      }

      const newGrid = createEmptyGrid(width, height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          newGrid[height - 1 - y][x] = layer.pixels[y]?.[x] || null;
        }
      }
      return { ...layer, pixels: newGrid };
    });

    const nextHitboxes: Hitbox[] = (frame.hitboxes || []).map((hb) => ({
      ...hb,
      y: height - (hb.y + hb.h),
    }));

    return { ...frame, layers: nextLayers, hitboxes: nextHitboxes };
  });
}

// Rotate Canvas 90° Clockwise
export function rotateCanvasClockwise(
  frames: Frame[],
  width: number,
  height: number
): { frames: Frame[]; newWidth: number; newHeight: number } {
  const newWidth = height;
  const newHeight = width;

  const nextFrames = frames.map((frame) => {
    const nextLayers: Layer[] = frame.layers.map((layer) => {
      const store = getTiledStore(layer.tiledStoreId);
      if (store) {
        const rotated = store.rotateClockwise();
        const newId = registerTiledStore(rotated);
        return { ...layer, tiledStoreId: newId, tiledRevision: (layer.tiledRevision || 1) + 1 };
      }

      const newGrid = createEmptyGrid(newWidth, newHeight);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const col = layer.pixels[y]?.[x];
          if (col) {
            newGrid[x][height - 1 - y] = col;
          }
        }
      }
      return { ...layer, pixels: newGrid };
    });

    const nextHitboxes: Hitbox[] = (frame.hitboxes || []).map((hb) => ({
      ...hb,
      x: height - (hb.y + hb.h),
      y: hb.x,
      w: hb.h,
      h: hb.w,
    }));

    return { ...frame, layers: nextLayers, hitboxes: nextHitboxes };
  });

  return { frames: nextFrames, newWidth, newHeight };
}
