import { Frame, InterpolationMode, Layer, LayerGroup } from '../types';
import { parseColorToRgbaTupleFast } from './renderCache';
import { createEmptyGrid } from './pixelMath';
import { AnchorPosition } from './imageTransforms';

// =============================================================================
// TILED / CHUNKED VIRTUAL CANVAS & MASSIVE SPRITESHEET ENGINE
// =============================================================================
// Enables arbitrary canvas & spritesheet sizes (e.g., 4096×4096, 10000×10000,
// 32000×32000+) with:
//   - Zero automatic resizing or downscaling (1:1 original pixel preservation)
//   - Sparse 256×256 RGBA tile storage (blank regions use 0 bytes of RAM)
//   - On-demand viewport-culled tile blitting (Nearest Neighbor crisp pixels)
//   - Bounded LRU GPU tile bitmap cache (keeps VRAM under ~32 MB)

export const TILED_TILE_SIZE = 256;
export const TILED_CANVAS_THRESHOLD_DIM = 1024;
export const TILED_CANVAS_THRESHOLD_PIXELS = 1024 * 1024;
const MAX_CACHED_TILE_CANVASES = 128;

export function shouldUseTiledStorage(width: number, height: number): boolean {
  return (
    width > TILED_CANVAS_THRESHOLD_DIM ||
    height > TILED_CANVAS_THRESHOLD_DIM ||
    width * height > TILED_CANVAS_THRESHOLD_PIXELS
  );
}

function rgbaTupleToCss(r: number, g: number, b: number, a: number): string | null {
  if (a <= 0) return null;
  if (a >= 254) {
    return `#${((1 << 24) | ((r & 255) << 16) | ((g & 255) << 8) | (b & 255)).toString(16).slice(1)}`;
  }
  const alpha = Math.max(0.004, Math.min(1, Math.round((a / 255) * 1000) / 1000));
  return `rgba(${r & 255},${g & 255},${b & 255},${alpha})`;
}

export class TiledLayerStore {
  public readonly id: string;
  public width: number;
  public height: number;
  public readonly tileSize: number = TILED_TILE_SIZE;
  /** Optional uniform solid background color (zero-RAM fill for giant blank canvases) */
  public backgroundFill: string | null = null;
  /** Sparse map of "tx,ty" -> tileSize*tileSize*4 RGBA Uint8ClampedArray */
  private tiles: Map<string, Uint8ClampedArray> = new Map();
  /** Bounded LRU cache of materialized HTMLCanvasElements for visible viewport tiles */
  private tileCanvasCache: Map<string, HTMLCanvasElement> = new Map();
  public revision: number = 1;

  constructor(width: number, height: number, id?: string, backgroundFill: string | null = null) {
    this.id = id || `tiled-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.width = Math.max(1, Math.round(width));
    this.height = Math.max(1, Math.round(height));
    this.backgroundFill = backgroundFill;
  }

  public get allocatedTileCount(): number {
    return this.tiles.size;
  }

  public get isEmpty(): boolean {
    return !this.backgroundFill && this.tiles.size === 0;
  }

  public get estimatedMemoryBytes(): number {
    return this.tiles.size * this.tileSize * this.tileSize * 4;
  }

  private tileKey(tx: number, ty: number): string {
    return `${tx},${ty}`;
  }

  private createInitializedTile(): Uint8ClampedArray {
    const buf = new Uint8ClampedArray(this.tileSize * this.tileSize * 4);
    if (this.backgroundFill) {
      const [r, g, b, a] = parseColorToRgbaTupleFast(this.backgroundFill);
      const aByte = Math.max(0, Math.min(255, Math.round(a * 255)));
      for (let i = 0; i < buf.length; i += 4) {
        buf[i] = r;
        buf[i + 1] = g;
        buf[i + 2] = b;
        buf[i + 3] = aByte;
      }
    }
    return buf;
  }

  public hasNonEmptyContent(): boolean {
    if (this.backgroundFill) return true;
    for (const tile of this.tiles.values()) {
      for (let i = 3; i < tile.length; i += 4) {
        if (tile[i] > 0) return true;
      }
    }
    return false;
  }

  public getPixel(x: number, y: number): string | null {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) return null;

    const tx = Math.floor(ix / this.tileSize);
    const ty = Math.floor(iy / this.tileSize);
    const tile = this.tiles.get(this.tileKey(tx, ty));
    if (!tile) return this.backgroundFill;

    const lx = ix - tx * this.tileSize;
    const ly = iy - ty * this.tileSize;
    const off = (ly * this.tileSize + lx) * 4;
    return rgbaTupleToCss(tile[off], tile[off + 1], tile[off + 2], tile[off + 3]);
  }

  public setPixel(x: number, y: number, color: string | null): void {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) return;

    const tx = Math.floor(ix / this.tileSize);
    const ty = Math.floor(iy / this.tileSize);
    const key = this.tileKey(tx, ty);
    let tile = this.tiles.get(key);
    if (!tile) {
      if (!color && !this.backgroundFill) return;
      tile = this.createInitializedTile();
      this.tiles.set(key, tile);
    }

    const lx = ix - tx * this.tileSize;
    const ly = iy - ty * this.tileSize;
    const off = (ly * this.tileSize + lx) * 4;

    if (!color) {
      tile[off] = 0;
      tile[off + 1] = 0;
      tile[off + 2] = 0;
      tile[off + 3] = 0;
    } else {
      const [r, g, b, a] = parseColorToRgbaTupleFast(color);
      tile[off] = r;
      tile[off + 1] = g;
      tile[off + 2] = b;
      tile[off + 3] = Math.max(0, Math.min(255, Math.round(a * 255)));
    }

    this.tileCanvasCache.delete(key);
    this.revision++;
  }

  public setPixelRgba(x: number, y: number, r: number, g: number, b: number, a: number): void {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) return;
    if (a <= 0 && !this.backgroundFill) {
      const tx = Math.floor(ix / this.tileSize);
      const ty = Math.floor(iy / this.tileSize);
      const key = this.tileKey(tx, ty);
      const existing = this.tiles.get(key);
      if (!existing) return;
      const lx = ix - tx * this.tileSize;
      const ly = iy - ty * this.tileSize;
      const off = (ly * this.tileSize + lx) * 4;
      existing[off] = 0;
      existing[off + 1] = 0;
      existing[off + 2] = 0;
      existing[off + 3] = 0;
      this.tileCanvasCache.delete(key);
      return;
    }

    const tx = Math.floor(ix / this.tileSize);
    const ty = Math.floor(iy / this.tileSize);
    const key = this.tileKey(tx, ty);
    let tile = this.tiles.get(key);
    if (!tile) {
      tile = this.createInitializedTile();
      this.tiles.set(key, tile);
    }
    const lx = ix - tx * this.tileSize;
    const ly = iy - ty * this.tileSize;
    const off = (ly * this.tileSize + lx) * 4;
    tile[off] = r;
    tile[off + 1] = g;
    tile[off + 2] = b;
    tile[off + 3] = a;
    this.tileCanvasCache.delete(key);
  }

  public drawBrushStamp(cx: number, cy: number, color: string | null, brushSize: number = 1): void {
    const half = Math.floor(Math.max(1, brushSize) / 2);
    const startX = cx - half;
    const startY = cy - half;
    const endX = cx + half;
    const endY = cy + half;
    for (let py = startY; py <= endY; py++) {
      for (let px = startX; px <= endX; px++) {
        this.setPixel(px, py, color);
      }
    }
  }

  public drawLine(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: string | null,
    brushSize: number = 1
  ): void {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let cx = x0;
    let cy = y0;
    while (true) {
      this.drawBrushStamp(cx, cy, color, brushSize);
      if (cx === x1 && cy === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        cx += sx;
      }
      if (e2 < dx) {
        err += dx;
        cy += sy;
      }
    }
  }

  /**
   * Populates tiles directly from a dense RGBA Uint8ClampedArray (1:1 exact pixel preservation).
   */
  public loadFromRgbaBuffer(data: Uint8ClampedArray, width: number, height: number): {
    nonEmptyCount: number;
    hasTransparency: boolean;
  } {
    this.width = Math.max(1, Math.round(width));
    this.height = Math.max(1, Math.round(height));
    this.backgroundFill = null;
    this.tiles.clear();
    this.tileCanvasCache.clear();

    const ts = this.tileSize;
    const tilesX = Math.ceil(this.width / ts);
    const tilesY = Math.ceil(this.height / ts);
    let nonEmptyCount = 0;
    let hasTransparency = false;

    for (let ty = 0; ty < tilesY; ty++) {
      const startY = ty * ts;
      const copyH = Math.min(ts, this.height - startY);
      for (let tx = 0; tx < tilesX; tx++) {
        const startX = tx * ts;
        const copyW = Math.min(ts, this.width - startX);

        // Quick scan to skip allocating completely empty tiles
        let tileHasPixels = false;
        for (let ly = 0; ly < copyH; ly++) {
          const srcRowOff = ((startY + ly) * this.width + startX) * 4;
          for (let lx = 0; lx < copyW; lx++) {
            const a = data[srcRowOff + lx * 4 + 3];
            if (a > 0) {
              tileHasPixels = true;
              nonEmptyCount++;
              if (a < 254) hasTransparency = true;
            } else {
              hasTransparency = true;
            }
          }
        }

        if (!tileHasPixels) continue;

        const tile = new Uint8ClampedArray(ts * ts * 4);
        for (let ly = 0; ly < copyH; ly++) {
          const srcStart = ((startY + ly) * this.width + startX) * 4;
          const srcEnd = srcStart + copyW * 4;
          tile.set(data.subarray(srcStart, srcEnd), ly * ts * 4);
        }
        this.tiles.set(this.tileKey(tx, ty), tile);
      }
    }

    this.revision++;
    return { nonEmptyCount, hasTransparency };
  }

  /**
   * Slices a potentially gigantic HTMLImageElement / ImageBitmap directly into 256×256
   * chunks WITHOUT ever creating a single giant canvas exceeding 256×256!
   * Preserves every pixel 1:1 with zero downscaling.
   */
  public loadFromImageSourceChunked(
    source: CanvasImageSource,
    width: number,
    height: number
  ): { nonEmptyCount: number; hasTransparency: boolean } {
    this.width = Math.max(1, Math.round(width));
    this.height = Math.max(1, Math.round(height));
    this.backgroundFill = null;
    this.tiles.clear();
    this.tileCanvasCache.clear();

    const ts = this.tileSize;
    const scratch = document.createElement('canvas');
    scratch.width = ts;
    scratch.height = ts;
    const sctx = scratch.getContext('2d', { willReadFrequently: true });
    if (!sctx) {
      throw new Error('Contexto 2D no disponible para decodificación por bloques.');
    }
    sctx.imageSmoothingEnabled = false;

    const tilesX = Math.ceil(this.width / ts);
    const tilesY = Math.ceil(this.height / ts);
    let nonEmptyCount = 0;
    let hasTransparency = false;

    for (let ty = 0; ty < tilesY; ty++) {
      const startY = ty * ts;
      const copyH = Math.min(ts, this.height - startY);
      for (let tx = 0; tx < tilesX; tx++) {
        const startX = tx * ts;
        const copyW = Math.min(ts, this.width - startX);

        sctx.clearRect(0, 0, ts, ts);
        sctx.drawImage(source, startX, startY, copyW, copyH, 0, 0, copyW, copyH);
        const imgData = sctx.getImageData(0, 0, ts, ts);
        const buf = imgData.data;

        let tileHasPixels = false;
        for (let ly = 0; ly < copyH; ly++) {
          const rowOff = ly * ts * 4;
          for (let lx = 0; lx < copyW; lx++) {
            const a = buf[rowOff + lx * 4 + 3];
            if (a > 0) {
              tileHasPixels = true;
              nonEmptyCount++;
              if (a < 254) hasTransparency = true;
            } else {
              hasTransparency = true;
            }
          }
        }

        if (tileHasPixels) {
          this.tiles.set(this.tileKey(tx, ty), new Uint8ClampedArray(buf));
        }
      }
    }

    this.revision++;
    return { nonEmptyCount, hasTransparency };
  }

  /**
   * Loads an existing standard (string | null)[][] PixelGrid into sparse tiles.
   */
  public loadFromPixelGrid(grid: (string | null)[][], width: number, height: number): void {
    this.width = Math.max(1, Math.round(width));
    this.height = Math.max(1, Math.round(height));
    this.backgroundFill = null;
    this.tiles.clear();
    this.tileCanvasCache.clear();

    const rowLimit = Math.min(this.height, grid.length);
    for (let y = 0; y < rowLimit; y++) {
      const row = grid[y];
      if (!row) continue;
      const colLimit = Math.min(this.width, row.length);
      for (let x = 0; x < colLimit; x++) {
        const col = row[x];
        if (!col) continue;
        const [r, g, b, a] = parseColorToRgbaTupleFast(col);
        const aByte = Math.max(0, Math.min(255, Math.round(a * 255)));
        if (aByte > 0) {
          this.setPixelRgba(x, y, r, g, b, aByte);
        }
      }
    }
    this.revision++;
  }

  private getOrCreateTileCanvas(key: string, tileData: Uint8ClampedArray): HTMLCanvasElement {
    const cached = this.tileCanvasCache.get(key);
    if (cached) {
      // Refresh LRU ordering
      this.tileCanvasCache.delete(key);
      this.tileCanvasCache.set(key, cached);
      return cached;
    }

    if (this.tileCanvasCache.size >= MAX_CACHED_TILE_CANVASES) {
      const oldestKey = this.tileCanvasCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.tileCanvasCache.delete(oldestKey);
      }
    }

    const c = document.createElement('canvas');
    c.width = this.tileSize;
    c.height = this.tileSize;
    const ctx = c.getContext('2d');
    if (ctx) {
      const copy = new Uint8ClampedArray(tileData.length);
      copy.set(tileData);
      ctx.putImageData(new ImageData(copy, this.tileSize, this.tileSize), 0, 0);
    }
    this.tileCanvasCache.set(key, c);
    return c;
  }

  /**
   * Renders ONLY the tiles intersecting the visible canvas world rectangle
   * [viewMinX..viewMaxX, viewMinY..viewMaxY] with strict Nearest Neighbor (no smoothing).
   */
  public renderVisibleViewport(
    ctx: CanvasRenderingContext2D,
    viewMinX: number,
    viewMinY: number,
    viewMaxX: number,
    viewMaxY: number,
    zoom: number,
    shiftX: number = 0,
    shiftY: number = 0,
    opacity: number = 1
  ): void {
    const ts = this.tileSize;
    const minX = Math.max(0, Math.floor(viewMinX));
    const minY = Math.max(0, Math.floor(viewMinY));
    const maxX = Math.min(this.width, Math.ceil(viewMaxX));
    const maxY = Math.min(this.height, Math.ceil(viewMaxY));
    if (maxX <= minX || maxY <= minY) return;

    const minTx = Math.floor(minX / ts);
    const maxTx = Math.floor((maxX - 1) / ts);
    const minTy = Math.floor(minY / ts);
    const maxTy = Math.floor((maxY - 1) / ts);

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
    ctx.imageSmoothingEnabled = false;

    for (let ty = minTy; ty <= maxTy; ty++) {
      const worldY = ty * ts;
      const drawH = Math.min(ts, this.height - worldY);
      if (drawH <= 0) continue;

      for (let tx = minTx; tx <= maxTx; tx++) {
        const worldX = tx * ts;
        const drawW = Math.min(ts, this.width - worldX);
        if (drawW <= 0) continue;

        const key = this.tileKey(tx, ty);
        const tileData = this.tiles.get(key);
        if (tileData) {
          const tileCanvas = this.getOrCreateTileCanvas(key, tileData);
          ctx.drawImage(
            tileCanvas,
            0,
            0,
            drawW,
            drawH,
            (worldX + shiftX) * zoom,
            (worldY + shiftY) * zoom,
            drawW * zoom,
            drawH * zoom
          );
        } else if (this.backgroundFill) {
          ctx.fillStyle = this.backgroundFill;
          ctx.fillRect(
            (worldX + shiftX) * zoom,
            (worldY + shiftY) * zoom,
            drawW * zoom,
            drawH * zoom
          );
        }
      }
    }

    ctx.restore();
  }

  /**
   * Slices a region [sx, sy, sw, sh] at exact 1:1 pixels into a standard PixelGrid
   * (used by Spritesheet Slicer and sub-region copy).
   */
  public sliceRegionToPixelGrid(
    sx: number,
    sy: number,
    sw: number,
    sh: number
  ): { grid: (string | null)[][]; nonEmptyCount: number } {
    const safeW = Math.max(1, Math.round(sw));
    const safeH = Math.max(1, Math.round(sh));
    const grid = createEmptyGrid(safeW, safeH);
    let nonEmptyCount = 0;

    for (let y = 0; y < safeH; y++) {
      const wy = sy + y;
      if (wy < 0 || wy >= this.height) continue;
      for (let x = 0; x < safeW; x++) {
        const wx = sx + x;
        if (wx < 0 || wx >= this.width) continue;
        const col = this.getPixel(wx, wy);
        if (col) {
          grid[y][x] = col;
          nonEmptyCount++;
        }
      }
    }
    return { grid, nonEmptyCount };
  }

  public sliceRegionToRgba(sx: number, sy: number, sw: number, sh: number): Uint8ClampedArray {
    const safeW = Math.max(1, Math.round(sw));
    const safeH = Math.max(1, Math.round(sh));
    const out = new Uint8ClampedArray(safeW * safeH * 4);
    const ts = this.tileSize;
    const bgTuple = this.backgroundFill ? parseColorToRgbaTupleFast(this.backgroundFill) : null;
    const bgA = bgTuple ? Math.max(0, Math.min(255, Math.round(bgTuple[3] * 255))) : 0;

    for (let y = 0; y < safeH; y++) {
      const wy = sy + y;
      if (wy < 0 || wy >= this.height) continue;
      const ty = Math.floor(wy / ts);
      const ly = wy - ty * ts;
      for (let x = 0; x < safeW; x++) {
        const wx = sx + x;
        if (wx < 0 || wx >= this.width) continue;
        const tx = Math.floor(wx / ts);
        const lx = wx - tx * ts;
        const dst = (y * safeW + x) * 4;
        const tile = this.tiles.get(this.tileKey(tx, ty));
        if (tile) {
          const src = (ly * ts + lx) * 4;
          out[dst] = tile[src];
          out[dst + 1] = tile[src + 1];
          out[dst + 2] = tile[src + 2];
          out[dst + 3] = tile[src + 3];
        } else if (bgTuple && bgA > 0) {
          out[dst] = bgTuple[0];
          out[dst + 1] = bgTuple[1];
          out[dst + 2] = bgTuple[2];
          out[dst + 3] = bgA;
        }
      }
    }
    return out;
  }

  /**
   * Exports a compact scaled preview/thumbnail directly from tiles (safe even for 32000×32000).
   */
  public renderScaledPreviewToContext(
    ctx: CanvasRenderingContext2D,
    destWidth: number,
    destHeight: number,
    paddingPx: number = 2
  ): void {
    const availW = Math.max(1, destWidth - paddingPx * 2);
    const availH = Math.max(1, destHeight - paddingPx * 2);
    const scale = Math.min(availW / this.width, availH / this.height);
    const drawW = Math.max(1, Math.round(this.width * scale));
    const drawH = Math.max(1, Math.round(this.height * scale));
    const ox = Math.floor((destWidth - drawW) / 2);
    const oy = Math.floor((destHeight - drawH) / 2);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (this.backgroundFill) {
      ctx.fillStyle = this.backgroundFill;
      ctx.fillRect(ox, oy, drawW, drawH);
    }

    const ts = this.tileSize;
    for (const [key, tileData] of this.tiles.entries()) {
      const [txStr, tyStr] = key.split(',');
      const tx = parseInt(txStr, 10);
      const ty = parseInt(tyStr, 10);
      const wx = tx * ts;
      const wy = ty * ts;
      const cw = Math.min(ts, this.width - wx);
      const ch = Math.min(ts, this.height - wy);
      if (cw <= 0 || ch <= 0) continue;

      const tileCanvas = this.getOrCreateTileCanvas(key, tileData);
      ctx.drawImage(
        tileCanvas,
        0,
        0,
        cw,
        ch,
        ox + wx * scale,
        oy + wy * scale,
        Math.max(1, cw * scale),
        Math.max(1, ch * scale)
      );
    }
    ctx.restore();
  }

  public exportThumbnailDataUrl(maxDim: number = 144): string {
    if (typeof document === 'undefined') return '';
    const scale = Math.min(maxDim / this.width, maxDim / this.height, 1);
    const w = Math.max(16, Math.round(this.width * scale));
    const h = Math.max(16, Math.round(this.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    this.renderScaledPreviewToContext(ctx, w, h, 0);
    return canvas.toDataURL('image/png');
  }

  public clone(): TiledLayerStore {
    const copy = new TiledLayerStore(this.width, this.height, undefined, this.backgroundFill);
    for (const [key, tile] of this.tiles.entries()) {
      copy.tiles.set(key, new Uint8ClampedArray(tile));
    }
    return copy;
  }

  /**
   * Resizes canvas (adds padding or crops pixels according to anchor) without scaling pixels.
   */
  public resizeCanvas(newW: number, newH: number, anchor: AnchorPosition = 'center'): TiledLayerStore {
    const safeW = Math.max(1, Math.round(newW));
    const safeH = Math.max(1, Math.round(newH));
    let offsetX = 0;
    let offsetY = 0;

    if (anchor.includes('left')) offsetX = 0;
    else if (anchor.includes('right')) offsetX = safeW - this.width;
    else offsetX = Math.floor((safeW - this.width) / 2);

    if (anchor.includes('top')) offsetY = 0;
    else if (anchor.includes('bottom')) offsetY = safeH - this.height;
    else offsetY = Math.floor((safeH - this.height) / 2);

    const out = new TiledLayerStore(safeW, safeH, undefined, this.backgroundFill);
    const ts = this.tileSize;

    for (const [key, tile] of this.tiles.entries()) {
      const [txStr, tyStr] = key.split(',');
      const baseX = parseInt(txStr, 10) * ts;
      const baseY = parseInt(tyStr, 10) * ts;
      const maxLy = Math.min(ts, this.height - baseY);
      const maxLx = Math.min(ts, this.width - baseX);

      for (let ly = 0; ly < maxLy; ly++) {
        const destY = baseY + ly + offsetY;
        if (destY < 0 || destY >= safeH) continue;
        const rowOff = ly * ts * 4;
        for (let lx = 0; lx < maxLx; lx++) {
          const destX = baseX + lx + offsetX;
          if (destX < 0 || destX >= safeW) continue;
          const off = rowOff + lx * 4;
          const a = tile[off + 3];
          if (a > 0 || this.backgroundFill) {
            out.setPixelRgba(destX, destY, tile[off], tile[off + 1], tile[off + 2], a);
          }
        }
      }
    }

    return out;
  }

  /**
   * Computes exact non-transparent pixel bounding box across allocated sparse tiles.
   */
  public getContentBounds(): { minX: number; minY: number; maxX: number; maxY: number } | null {
    if (this.backgroundFill) {
      return { minX: 0, minY: 0, maxX: this.width - 1, maxY: this.height - 1 };
    }
    if (this.tiles.size === 0) return null;
    const ts = this.tileSize;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const [key, tile] of this.tiles.entries()) {
      const [txStr, tyStr] = key.split(',');
      const baseX = parseInt(txStr, 10) * ts;
      const baseY = parseInt(tyStr, 10) * ts;
      const maxLy = Math.min(ts, this.height - baseY);
      const maxLx = Math.min(ts, this.width - baseX);
      for (let ly = 0; ly < maxLy; ly++) {
        const wy = baseY + ly;
        const rowOff = ly * ts * 4;
        for (let lx = 0; lx < maxLx; lx++) {
          if (tile[rowOff + lx * 4 + 3] > 0) {
            const wx = baseX + lx;
            if (wx < minX) minX = wx;
            if (wx > maxX) maxX = wx;
            if (wy < minY) minY = wy;
            if (wy > maxY) maxY = wy;
          }
        }
      }
    }

    if (!Number.isFinite(minX)) return null;
    return { minX, minY, maxX, maxY };
  }

  /**
   * Resizes canvas to an arbitrary rect [left, top, newW, newH] relative to original canvas origin (0,0).
   * Preserves 1:1 original pixels without scaling, and optionally preserves cropped pixels in offCanvasPixels.
   */
  public resizeCanvasWithRect(
    left: number,
    top: number,
    newW: number,
    newH: number,
    keepOffCanvas: boolean = false,
    existingOffCanvas?: Record<string, string>
  ): { store: TiledLayerStore; offCanvasPixels?: Record<string, string> } {
    const safeW = Math.max(1, Math.round(newW));
    const safeH = Math.max(1, Math.round(newH));
    const offsetX = -Math.round(left);
    const offsetY = -Math.round(top);

    const out = new TiledLayerStore(safeW, safeH, undefined, this.backgroundFill);
    const nextOffCanvas: Record<string, string> = {};
    const MAX_OFFCANVAS_ENTRIES = 250000;
    let offCount = 0;

    // 1. Re-project any existing off-canvas pixels first
    if (existingOffCanvas) {
      for (const [coord, color] of Object.entries(existingOffCanvas)) {
        if (!color) continue;
        const comma = coord.indexOf(',');
        if (comma === -1) continue;
        const oldX = parseInt(coord.slice(0, comma), 10);
        const oldY = parseInt(coord.slice(comma + 1), 10);
        if (Number.isNaN(oldX) || Number.isNaN(oldY)) continue;
        const destX = oldX + offsetX;
        const destY = oldY + offsetY;
        if (destX >= 0 && destX < safeW && destY >= 0 && destY < safeH) {
          out.setPixel(destX, destY, color);
        } else if (keepOffCanvas && offCount < MAX_OFFCANVAS_ENTRIES) {
          nextOffCanvas[`${destX},${destY}`] = color;
          offCount++;
        }
      }
    }

    // 2. Copy all allocated tiles shifted by (offsetX, offsetY)
    const ts = this.tileSize;
    for (const [key, tile] of this.tiles.entries()) {
      const [txStr, tyStr] = key.split(',');
      const baseX = parseInt(txStr, 10) * ts;
      const baseY = parseInt(tyStr, 10) * ts;
      const maxLy = Math.min(ts, this.height - baseY);
      const maxLx = Math.min(ts, this.width - baseX);

      for (let ly = 0; ly < maxLy; ly++) {
        const destY = baseY + ly + offsetY;
        const rowOff = ly * ts * 4;
        for (let lx = 0; lx < maxLx; lx++) {
          const off = rowOff + lx * 4;
          const a = tile[off + 3];
          if (a <= 0 && !this.backgroundFill) continue;
          const destX = baseX + lx + offsetX;
          if (destX >= 0 && destX < safeW && destY >= 0 && destY < safeH) {
            out.setPixelRgba(destX, destY, tile[off], tile[off + 1], tile[off + 2], a);
          } else if (keepOffCanvas && a > 0 && offCount < MAX_OFFCANVAS_ENTRIES) {
            const css = rgbaTupleToCss(tile[off], tile[off + 1], tile[off + 2], a);
            if (css) {
              nextOffCanvas[`${destX},${destY}`] = css;
              offCount++;
            }
          }
        }
      }
    }

    return {
      store: out,
      offCanvasPixels: keepOffCanvas && offCount > 0 ? nextOffCanvas : undefined,
    };
  }

  /**
   * Rescales tiled image using Nearest Neighbor (default) or smooth Bilinear/Bicubic interpolation.
   */
  public rescale(
    newW: number,
    newH: number,
    interpolation: InterpolationMode = 'nearest'
  ): TiledLayerStore {
    const safeW = Math.max(1, Math.round(newW));
    const safeH = Math.max(1, Math.round(newH));
    const out = new TiledLayerStore(safeW, safeH, undefined, this.backgroundFill);
    if (this.tiles.size === 0) return out;

    const scaleX = safeW / this.width;
    const scaleY = safeH / this.height;
    const ts = this.tileSize;

    // For each destination tile, sample only from source tiles that overlap it!
    const dstTilesX = Math.ceil(safeW / ts);
    const dstTilesY = Math.ceil(safeH / ts);

    for (let dty = 0; dty < dstTilesY; dty++) {
      const dstStartY = dty * ts;
      const dstCopyH = Math.min(ts, safeH - dstStartY);
      const srcMinTy = Math.max(0, Math.floor(Math.floor(dstStartY / scaleY) / ts));
      const srcMaxTy = Math.floor(Math.min(this.height - 1, Math.ceil((dstStartY + dstCopyH) / scaleY)) / ts);

      for (let dtx = 0; dtx < dstTilesX; dtx++) {
        const dstStartX = dtx * ts;
        const dstCopyW = Math.min(ts, safeW - dstStartX);
        const srcMinTx = Math.max(0, Math.floor(Math.floor(dstStartX / scaleX) / ts));
        const srcMaxTx = Math.floor(Math.min(this.width - 1, Math.ceil((dstStartX + dstCopyW) / scaleX)) / ts);

        // Skip empty destination regions cleanly
        let anySourceTile = false;
        for (let sty = srcMinTy; sty <= srcMaxTy && !anySourceTile; sty++) {
          for (let stx = srcMinTx; stx <= srcMaxTx; stx++) {
            if (this.tiles.has(this.tileKey(stx, sty))) {
              anySourceTile = true;
              break;
            }
          }
        }
        if (!anySourceTile) continue;

        const dstTile = new Uint8ClampedArray(ts * ts * 4);
        let hasPixel = false;

        for (let ly = 0; ly < dstCopyH; ly++) {
          const dy = dstStartY + ly;
          const syFloat = dy / scaleY;
          const sy0 = Math.max(0, Math.min(this.height - 1, Math.floor(syFloat)));
          const fy = syFloat - sy0;

          for (let lx = 0; lx < dstCopyW; lx++) {
            const dx = dstStartX + lx;
            const sxFloat = dx / scaleX;
            const sx0 = Math.max(0, Math.min(this.width - 1, Math.floor(sxFloat)));
            const fx = sxFloat - sx0;
            const dstOff = (ly * ts + lx) * 4;

            if (interpolation === 'nearest') {
              const stx = Math.floor(sx0 / ts);
              const sty = Math.floor(sy0 / ts);
              const srcTile = this.tiles.get(this.tileKey(stx, sty));
              if (!srcTile) continue;
              const sOff = ((sy0 - sty * ts) * ts + (sx0 - stx * ts)) * 4;
              const a = srcTile[sOff + 3];
              if (a > 0) {
                dstTile[dstOff] = srcTile[sOff];
                dstTile[dstOff + 1] = srcTile[sOff + 1];
                dstTile[dstOff + 2] = srcTile[sOff + 2];
                dstTile[dstOff + 3] = a;
                hasPixel = true;
              }
            } else {
              // Bilinear / Bicubic smooth sampling
              const sx1 = Math.min(this.width - 1, sx0 + 1);
              const sy1 = Math.min(this.height - 1, sy0 + 1);
              const readRgba = (px: number, py: number): [number, number, number, number] => {
                const t = this.tiles.get(this.tileKey(Math.floor(px / ts), Math.floor(py / ts)));
                if (!t) return [0, 0, 0, 0];
                const o = ((py % ts) * ts + (px % ts)) * 4;
                return [t[o], t[o + 1], t[o + 2], t[o + 3]];
              };
              const c00 = readRgba(sx0, sy0);
              const c10 = readRgba(sx1, sy0);
              const c01 = readRgba(sx0, sy1);
              const c11 = readRgba(sx1, sy1);
              const w00 = (1 - fx) * (1 - fy);
              const w10 = fx * (1 - fy);
              const w01 = (1 - fx) * fy;
              const w11 = fx * fy;
              const a = Math.round(c00[3] * w00 + c10[3] * w10 + c01[3] * w01 + c11[3] * w11);
              if (a > 0) {
                dstTile[dstOff] = Math.round(c00[0] * w00 + c10[0] * w10 + c01[0] * w01 + c11[0] * w11);
                dstTile[dstOff + 1] = Math.round(c00[1] * w00 + c10[1] * w10 + c01[1] * w01 + c11[1] * w11);
                dstTile[dstOff + 2] = Math.round(c00[2] * w00 + c10[2] * w10 + c01[2] * w01 + c11[2] * w11);
                dstTile[dstOff + 3] = a;
                hasPixel = true;
              }
            }
          }
        }

        if (hasPixel) {
          out.tiles.set(this.tileKey(dtx, dty), dstTile);
        }
      }
    }

    return out;
  }

  public flipHorizontal(): TiledLayerStore {
    const out = new TiledLayerStore(this.width, this.height, undefined, this.backgroundFill);
    const ts = this.tileSize;
    for (const [key, tile] of this.tiles.entries()) {
      const [txStr, tyStr] = key.split(',');
      const baseX = parseInt(txStr, 10) * ts;
      const baseY = parseInt(tyStr, 10) * ts;
      const maxLy = Math.min(ts, this.height - baseY);
      const maxLx = Math.min(ts, this.width - baseX);
      for (let ly = 0; ly < maxLy; ly++) {
        const dy = baseY + ly;
        const rowOff = ly * ts * 4;
        for (let lx = 0; lx < maxLx; lx++) {
          const off = rowOff + lx * 4;
          const a = tile[off + 3];
          if (a > 0 || this.backgroundFill) {
            out.setPixelRgba(this.width - 1 - (baseX + lx), dy, tile[off], tile[off + 1], tile[off + 2], a);
          }
        }
      }
    }
    return out;
  }

  public flipVertical(): TiledLayerStore {
    const out = new TiledLayerStore(this.width, this.height, undefined, this.backgroundFill);
    const ts = this.tileSize;
    for (const [key, tile] of this.tiles.entries()) {
      const [txStr, tyStr] = key.split(',');
      const baseX = parseInt(txStr, 10) * ts;
      const baseY = parseInt(tyStr, 10) * ts;
      const maxLy = Math.min(ts, this.height - baseY);
      const maxLx = Math.min(ts, this.width - baseX);
      for (let ly = 0; ly < maxLy; ly++) {
        const dy = this.height - 1 - (baseY + ly);
        const rowOff = ly * ts * 4;
        for (let lx = 0; lx < maxLx; lx++) {
          const off = rowOff + lx * 4;
          const a = tile[off + 3];
          if (a > 0 || this.backgroundFill) {
            out.setPixelRgba(baseX + lx, dy, tile[off], tile[off + 1], tile[off + 2], a);
          }
        }
      }
    }
    return out;
  }

  public rotateClockwise(): TiledLayerStore {
    const out = new TiledLayerStore(this.height, this.width, undefined, this.backgroundFill);
    const ts = this.tileSize;
    for (const [key, tile] of this.tiles.entries()) {
      const [txStr, tyStr] = key.split(',');
      const baseX = parseInt(txStr, 10) * ts;
      const baseY = parseInt(tyStr, 10) * ts;
      const maxLy = Math.min(ts, this.height - baseY);
      const maxLx = Math.min(ts, this.width - baseX);
      for (let ly = 0; ly < maxLy; ly++) {
        const sy = baseY + ly;
        const rowOff = ly * ts * 4;
        for (let lx = 0; lx < maxLx; lx++) {
          const sx = baseX + lx;
          const off = rowOff + lx * 4;
          const a = tile[off + 3];
          if (a > 0 || this.backgroundFill) {
            out.setPixelRgba(this.height - 1 - sy, sx, tile[off], tile[off + 1], tile[off + 2], a);
          }
        }
      }
    }
    return out;
  }

  public dispose(): void {
    this.tiles.clear();
    this.tileCanvasCache.clear();
  }
}

// =============================================================================
// GLOBAL TILED STORE REGISTRY (Keeps React State & JSON Serialization Lightweight)
// =============================================================================
const storeRegistry = new Map<string, TiledLayerStore>();

export function registerTiledStore(store: TiledLayerStore): string {
  storeRegistry.set(store.id, store);
  return store.id;
}

export function getTiledStore(id?: string | null): TiledLayerStore | undefined {
  if (!id) return undefined;
  return storeRegistry.get(id);
}

export function cloneTiledStoreById(id?: string | null): string | undefined {
  const existing = getTiledStore(id);
  if (!existing) return undefined;
  const cloned = existing.clone();
  return registerTiledStore(cloned);
}

export function disposeTiledStore(id?: string | null): void {
  if (!id) return;
  const store = storeRegistry.get(id);
  if (store) {
    store.dispose();
    storeRegistry.delete(id);
  }
}

export function isLayerTiled(layer?: Layer | null): boolean {
  return Boolean(layer?.tiledStoreId && storeRegistry.has(layer.tiledStoreId));
}

export function isFrameTiled(frame?: Frame | null): boolean {
  if (!frame) return false;
  return frame.layers.some((l) => isLayerTiled(l));
}

export function renderTiledFrameThumbnailDataUrl(
  frame: Frame,
  width: number,
  height: number,
  layerGroups: LayerGroup[] = [],
  maxDim: number = 144
): string {
  if (typeof document === 'undefined') return '';
  const scale = Math.min(maxDim / Math.max(1, width), maxDim / Math.max(1, height), 1);
  const tw = Math.max(16, Math.round(width * scale));
  const th = Math.max(16, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const hiddenGroups = new Set(layerGroups.filter((g) => g.visible === false).map((g) => g.id));
  for (const layer of frame.layers) {
    if (!layer.visible) continue;
    if (layer.groupId && hiddenGroups.has(layer.groupId)) continue;
    const store = getTiledStore(layer.tiledStoreId);
    if (!store) continue;
    ctx.save();
    ctx.globalAlpha = layer.opacity ?? 1;
    store.renderScaledPreviewToContext(ctx, tw, th, 0);
    ctx.restore();
  }
  return canvas.toDataURL('image/png');
}
