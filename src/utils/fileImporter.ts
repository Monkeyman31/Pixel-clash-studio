import JSZip from 'jszip';
import {
  decodeLayerPixels,
  getCompositeImageData,
  Layer as AgPsdLayer,
  LayerMaskData as AgPsdMaskData,
  PixelData as AgPsdPixelData,
  Psd as AgPsd,
  readPsd,
  ReadOptions as AgPsdReadOptions,
} from 'ag-psd';
import {
  ActionTag,
  Frame,
  InterpolationMode,
  Layer,
  LayerAdjustmentConfig,
  LayerBlendMode,
  LayerGroup,
  LayerMask,
  ProjectState,
  RecentProjectFileFormat,
} from '../types';
import { createEmptyGrid } from './pixelMath';
import {
  getTiledStore,
  registerTiledStore,
  shouldUseTiledStorage,
  TiledLayerStore,
} from './tiledImageEngine';
import {
  detectPsdSourceSoftware,
  inspectPsdHeader,
  PsdCompatibilityCheckItem,
  PsdCompatibilityReport,
  PsdHeaderInspection,
  PsdRecoveryMode,
} from './fileDiagnostics';

export const SUPPORTED_IMAGE_EXTENSIONS = [
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'bmp',
  'tif',
  'tiff',
  'tga',
  'ico',
] as const;

export const SUPPORTED_PROJECT_EXTENSIONS = [
  'pcs',
  'ase',
  'aseprite',
  'psd',
  'psb',
  'json',
] as const;

export const SUPPORTED_ALL_OPEN_EXTENSIONS = [
  ...SUPPORTED_PROJECT_EXTENSIONS,
  ...SUPPORTED_IMAGE_EXTENSIONS,
] as const;

export const SUPPORTED_OPEN_ACCEPT =
  '.pcs,.ase,.aseprite,.psd,.psb,.json,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tif,.tiff,.tga,.ico,image/png,image/jpeg,image/webp,image/gif,image/bmp,image/tiff,image/x-icon,image/vnd.microsoft.icon';

export const SUPPORTED_IMAGE_ACCEPT =
  '.png,.jpg,.jpeg,.webp,.gif,.bmp,.tif,.tiff,.tga,.ico,image/png,image/jpeg,image/webp,image/gif,image/bmp,image/tiff,image/x-icon,image/vnd.microsoft.icon';

export interface FileLoadErrorMeta {
  errorCode?: string;
  moduleName?: string;
  fileSizeBytes?: number;
  psdVersion?: string;
  incompatibleElement?: string;
  canOfferPsdRecovery?: boolean;
}

export class FileLoadError extends Error {
  public readonly fileName: string;
  public readonly formatLabel: string;
  public readonly technicalDetails?: string;
  public readonly errorCode: string;
  public readonly moduleName: string;
  public readonly fileSizeBytes?: number;
  public readonly psdVersion?: string;
  public readonly incompatibleElement?: string;
  public readonly canOfferPsdRecovery: boolean;

  constructor(
    message: string,
    fileName: string,
    formatLabel: string = 'Archivo',
    technicalDetails?: string,
    meta?: FileLoadErrorMeta
  ) {
    super(message);
    this.name = 'FileLoadError';
    this.fileName = fileName;
    this.formatLabel = formatLabel;
    this.technicalDetails = technicalDetails;
    this.errorCode = meta?.errorCode || 'FILE_LOAD_ERR';
    this.moduleName = meta?.moduleName || 'File Importer';
    this.fileSizeBytes = meta?.fileSizeBytes;
    this.psdVersion = meta?.psdVersion;
    this.incompatibleElement = meta?.incompatibleElement;
    this.canOfferPsdRecovery = Boolean(meta?.canOfferPsdRecovery);
  }
}

export interface DecodedRgbaImage {
  width: number;
  height: number;
  /** Dense RGBA buffer (may be empty length-0 when very large image is backed directly by tiledStoreId) */
  data: Uint8ClampedArray;
  hasTransparency: boolean;
  /** Original DPI extracted from PNG pHYs / JPEG JFIF / BMP header (defaults to 72) */
  dpi?: number;
  /** On-demand 256×256 tiled store ID for high-resolution spritesheets & giant images */
  tiledStoreId?: string;
}

export interface SpritesheetCandidateInfo {
  isCandidate: boolean;
  suggestedCols: number;
  suggestedRows: number;
  suggestedFrameWidth: number;
  suggestedFrameHeight: number;
  reason: string;
}

export interface ImportLoadStats {
  formatLabel: string;
  fileFormat: RecentProjectFileFormat;
  frameCount: number;
  layerCount: number;
  nonEmptyPixelCount: number;
  hasTransparency: boolean;
  isAnimated: boolean;
  wasDownscaled?: boolean;
  originalWidth?: number;
  originalHeight?: number;
  dpi?: number;
  usesTiledEngine?: boolean;
}

export interface ImportResult {
  name: string;
  width: number;
  height: number;
  dpi?: number;
  frames: Frame[];
  layerGroups?: LayerGroup[];
  actionTags?: ActionTag[];
  projectState?: Partial<ProjectState>;
  fps?: number;
  /** Full-resolution raw RGBA / Tiled buffer for single-image imports (enables 1:1 spritesheet slicing!) */
  rawRaster?: DecodedRgbaImage;
  spritesheetCandidate?: SpritesheetCandidateInfo;
  psdCompatibilityReport?: PsdCompatibilityReport;
  usedRecoveryMode?: PsdRecoveryMode;
  stats: ImportLoadStats;
}

/**
 * Extracts original DPI metadata from PNG (pHYs chunk), JPEG (JFIF APP0), or BMP (DIB header).
 * Defaults to 72 DPI when the file specifies no physical resolution metadata.
 */
export function extractImageDpiFromBytes(buffer: ArrayBuffer, ext: string): number {
  try {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    const lower = ext.toLowerCase();

    // PNG pHYs chunk (pixels per meter -> DPI = ppm * 0.0254)
    if (
      (lower === 'png' || (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50)) &&
      bytes.length >= 33
    ) {
      let off = 8;
      while (off + 12 <= bytes.length) {
        const len = view.getUint32(off, false);
        const type =
          String.fromCharCode(bytes[off + 4], bytes[off + 5], bytes[off + 6], bytes[off + 7]);
        if (type === 'pHYs' && len === 9 && off + 8 + 9 <= bytes.length) {
          const ppuX = view.getUint32(off + 8, false);
          const unit = bytes[off + 16];
          if (unit === 1 && ppuX > 0) {
            const dpi = Math.round(ppuX * 0.0254);
            if (dpi >= 1 && dpi <= 4800) return dpi;
          }
          break;
        }
        if (type === 'IDAT' || type === 'IEND') break;
        off += 12 + len;
      }
    }

    // JPEG JFIF APP0 density
    if ((lower === 'jpg' || lower === 'jpeg') && bytes.length >= 20 && bytes[0] === 0xff && bytes[1] === 0xd8) {
      let off = 2;
      while (off + 4 < bytes.length) {
        if (bytes[off] !== 0xff) break;
        const marker = bytes[off + 1];
        if (marker === 0xda || marker === 0xd9) break;
        const segLen = view.getUint16(off + 2, false);
        if (
          marker === 0xe0 &&
          segLen >= 16 &&
          off + 16 <= bytes.length &&
          bytes[off + 4] === 0x4a &&
          bytes[off + 5] === 0x46 &&
          bytes[off + 6] === 0x49 &&
          bytes[off + 7] === 0x46
        ) {
          const units = bytes[off + 11];
          const xDensity = view.getUint16(off + 12, false);
          if (units === 1 && xDensity > 0) return Math.max(1, Math.min(4800, xDensity));
          if (units === 2 && xDensity > 0) return Math.max(1, Math.min(4800, Math.round(xDensity * 2.54)));
          break;
        }
        off += 2 + segLen;
      }
    }

    // BMP DIB header XPelsPerMeter at offset 38
    if (lower === 'bmp' && bytes.length >= 46 && bytes[0] === 0x42 && bytes[1] === 0x4d) {
      const dibSize = view.getUint32(14, true);
      if (dibSize >= 40) {
        const ppmX = view.getInt32(38, true);
        if (ppmX > 0) {
          const dpi = Math.round(ppmX * 0.0254);
          if (dpi >= 1 && dpi <= 4800) return dpi;
        }
      }
    }
  } catch {
    // fallback safely to 72 DPI
  }
  return 72;
}

export function getFileExtension(fileName: string): string {
  const parts = fileName.trim().split('.');
  if (parts.length < 2) return '';
  return (parts.pop() || '').toLowerCase();
}

export function isSupportedImageFile(file: File): boolean {
  const ext = getFileExtension(file.name);
  if ((SUPPORTED_IMAGE_EXTENSIONS as readonly string[]).includes(ext)) return true;
  return Boolean(file.type && file.type.startsWith('image/'));
}

export function isSupportedOpenableFile(file: File): boolean {
  const ext = getFileExtension(file.name);
  if ((SUPPORTED_ALL_OPEN_EXTENSIONS as readonly string[]).includes(ext)) return true;
  return Boolean(file.type && file.type.startsWith('image/'));
}

export function normalizeFileFormatTag(fileName: string): RecentProjectFileFormat {
  const ext = getFileExtension(fileName);
  switch (ext) {
    case 'pcs':
      return 'pcs';
    case 'json':
      return 'json';
    case 'psd':
    case 'psb':
      return 'psd';
    case 'ase':
    case 'aseprite':
      return 'ase';
    case 'jpg':
    case 'jpeg':
      return 'jpg';
    case 'webp':
      return 'webp';
    case 'gif':
      return 'gif';
    case 'bmp':
      return 'bmp';
    case 'tif':
    case 'tiff':
      return 'tiff';
    case 'tga':
      return 'tga';
    case 'ico':
      return 'ico';
    default:
      return 'png';
  }
}

export function rgbaToPixelString(r: number, g: number, b: number, a: number): string | null {
  if (a <= 0) return null;
  const rr = Math.max(0, Math.min(255, r | 0));
  const gg = Math.max(0, Math.min(255, g | 0));
  const bb = Math.max(0, Math.min(255, b | 0));
  if (a >= 254) {
    return `#${((1 << 24) | (rr << 16) | (gg << 8) | bb).toString(16).slice(1)}`;
  }
  const alpha = Math.max(0.004, Math.min(1, Math.round((a / 255) * 1000) / 1000));
  return `rgba(${rr},${gg},${bb},${alpha})`;
}

export function rgbaBufferToPixelGrid(
  data: Uint8ClampedArray,
  width: number,
  height: number
): { grid: (string | null)[][]; nonEmptyCount: number; hasTransparency: boolean } {
  const grid = createEmptyGrid(width, height);
  let nonEmptyCount = 0;
  let hasTransparency = false;

  for (let y = 0; y < height; y++) {
    const row = grid[y];
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x * 4;
      const a = data[idx + 3];
      if (a <= 0) {
        hasTransparency = true;
        row[x] = null;
      } else {
        if (a < 254) hasTransparency = true;
        row[x] = rgbaToPixelString(data[idx], data[idx + 1], data[idx + 2], a);
        nonEmptyCount++;
      }
    }
  }
  return { grid, nonEmptyCount, hasTransparency };
}

export function canvasToPixelGrid(
  canvas: HTMLCanvasElement | ImageData,
  width: number,
  height: number
): (string | null)[][] {
  let imgData: ImageData;
  if (canvas instanceof ImageData) {
    imgData = canvas;
  } else {
    const ctx = canvas.getContext('2d');
    if (!ctx) return createEmptyGrid(width, height);
    imgData = ctx.getImageData(0, 0, width, height);
  }
  return rgbaBufferToPixelGrid(imgData.data, width, height).grid;
}

export function rgbaToDataUrl(rgba: DecodedRgbaImage, maxPreviewDim?: number): string {
  if (rgba.tiledStoreId && rgba.data.length === 0) {
    const store = getTiledStore(rgba.tiledStoreId);
    if (store) {
      return store.exportThumbnailDataUrl(maxPreviewDim || 512);
    }
  }
  const safeW = Math.max(1, rgba.width);
  const safeH = Math.max(1, rgba.height);
  if (maxPreviewDim && (safeW > maxPreviewDim || safeH > maxPreviewDim)) {
    const scale = Math.min(maxPreviewDim / safeW, maxPreviewDim / safeH);
    const outW = Math.max(1, Math.round(safeW * scale));
    const outH = Math.max(1, Math.round(safeH * scale));
    const scaled = scaleRgbaImage(rgba, outW, outH, 'stretch', 'nearest');
    const c = document.createElement('canvas');
    c.width = outW;
    c.height = outH;
    const ctx = c.getContext('2d');
    if (!ctx) return '';
    ctx.putImageData(new ImageData(new Uint8ClampedArray(scaled.data), outW, outH), 0, 0);
    return c.toDataURL('image/png');
  }
  const canvas = document.createElement('canvas');
  canvas.width = safeW;
  canvas.height = safeH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const imageData = new ImageData(new Uint8ClampedArray(rgba.data), safeW, safeH);
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

function scaleRgbaImage(
  src: DecodedRgbaImage,
  targetW: number,
  targetH: number,
  fitMode: 'fit' | 'original' | 'stretch' | 'center_no_resize' = 'original',
  interpolation: InterpolationMode = 'nearest'
): DecodedRgbaImage {
  const safeW = Math.max(1, Math.round(targetW));
  const safeH = Math.max(1, Math.round(targetH));

  // Fast exact 1:1 pass-through when target matches source
  if (
    src.width === safeW &&
    src.height === safeH &&
    src.data.length === safeW * safeH * 4
  ) {
    return {
      width: safeW,
      height: safeH,
      data: new Uint8ClampedArray(src.data),
      hasTransparency: src.hasTransparency,
      dpi: src.dpi,
    };
  }

  // If source is backed by a TiledLayerStore (huge spritesheet), sample via tiled store cleanly
  if (src.tiledStoreId && src.data.length === 0) {
    const store = getTiledStore(src.tiledStoreId);
    if (store) {
      if (fitMode === 'original' || fitMode === 'center_no_resize') {
        const dx = Math.floor((safeW - src.width) / 2);
        const dy = Math.floor((safeH - src.height) / 2);
        const out = new Uint8ClampedArray(safeW * safeH * 4);
        let hasTransparency = false;
        const copyStartX = Math.max(0, dx);
        const copyStartY = Math.max(0, dy);
        const copyEndX = Math.min(safeW, dx + src.width);
        const copyEndY = Math.min(safeH, dy + src.height);
        const sliceW = Math.max(0, copyEndX - copyStartX);
        const sliceH = Math.max(0, copyEndY - copyStartY);
        if (sliceW > 0 && sliceH > 0) {
          const sub = store.sliceRegionToRgba(copyStartX - dx, copyStartY - dy, sliceW, sliceH);
          for (let ly = 0; ly < sliceH; ly++) {
            const dstRow = ((copyStartY + ly) * safeW + copyStartX) * 4;
            const srcRow = ly * sliceW * 4;
            out.set(sub.subarray(srcRow, srcRow + sliceW * 4), dstRow);
          }
        }
        for (let i = 3; i < out.length; i += 4) {
          if (out[i] < 254) {
            hasTransparency = true;
            break;
          }
        }
        return { width: safeW, height: safeH, data: out, hasTransparency, dpi: src.dpi };
      }

      const scaledStore =
        fitMode === 'fit'
          ? (() => {
              const sc = Math.min(safeW / src.width, safeH / src.height);
              const dw = Math.max(1, Math.round(src.width * sc));
              const dh = Math.max(1, Math.round(src.height * sc));
              return store.rescale(dw, dh, interpolation).resizeCanvas(safeW, safeH, 'center');
            })()
          : store.rescale(safeW, safeH, interpolation);
      const out = scaledStore.sliceRegionToRgba(0, 0, safeW, safeH);
      scaledStore.dispose();
      let hasTransparency = false;
      for (let i = 3; i < out.length; i += 4) {
        if (out[i] < 254) {
          hasTransparency = true;
          break;
        }
      }
      return { width: safeW, height: safeH, data: out, hasTransparency, dpi: src.dpi };
    }
  }

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = src.width;
  srcCanvas.height = src.height;
  const sctx = srcCanvas.getContext('2d');
  if (!sctx) {
    throw new Error('No se pudo inicializar el contexto 2D de origen.');
  }
  sctx.putImageData(new ImageData(new Uint8ClampedArray(src.data), src.width, src.height), 0, 0);

  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = safeW;
  dstCanvas.height = safeH;
  const dctx = dstCanvas.getContext('2d');
  if (!dctx) {
    throw new Error('No se pudo inicializar el contexto 2D de destino.');
  }
  // Strictly Nearest Neighbor by default! Smoothing ONLY if user explicitly requests bilinear/bicubic
  dctx.imageSmoothingEnabled = interpolation !== 'nearest';
  if (interpolation !== 'nearest') {
    dctx.imageSmoothingQuality = interpolation === 'bicubic' ? 'high' : 'medium';
  }
  dctx.clearRect(0, 0, safeW, safeH);

  let drawW = safeW;
  let drawH = safeH;
  let dx = 0;
  let dy = 0;

  if (fitMode === 'fit') {
    const scale = Math.min(safeW / src.width, safeH / src.height);
    drawW = Math.max(1, Math.round(src.width * scale));
    drawH = Math.max(1, Math.round(src.height * scale));
    dx = Math.floor((safeW - drawW) / 2);
    dy = Math.floor((safeH - drawH) / 2);
  } else if (fitMode === 'original' || fitMode === 'center_no_resize') {
    drawW = src.width;
    drawH = src.height;
    dx = Math.floor((safeW - drawW) / 2);
    dy = Math.floor((safeH - drawH) / 2);
  }

  dctx.drawImage(srcCanvas, dx, dy, drawW, drawH);
  const out = dctx.getImageData(0, 0, safeW, safeH);
  let hasTransparency = false;
  for (let i = 3; i < out.data.length; i += 4) {
    if (out.data[i] < 254) {
      hasTransparency = true;
      break;
    }
  }
  return { width: safeW, height: safeH, data: out.data, hasTransparency, dpi: src.dpi };
}

function decodeBrowserBlobToRgba(blob: Blob, dpi: number = 72): Promise<DecodedRgbaImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (w <= 0 || h <= 0) {
          URL.revokeObjectURL(url);
          reject(new Error('La imagen decodificada tiene dimensiones nulas (0×0).'));
          return;
        }

        // For massive images/spritesheets (> 4096px or > 16M px), decode directly in 256×256
        // chunks into a sparse TiledLayerStore — NEVER creates a giant single canvas and NEVER downscales!
        if (w > 4096 || h > 4096 || w * h > 4096 * 4096) {
          const store = new TiledLayerStore(w, h);
          const { hasTransparency } = store.loadFromImageSourceChunked(img, w, h);
          const tiledStoreId = registerTiledStore(store);
          URL.revokeObjectURL(url);
          resolve({
            width: w,
            height: h,
            data: new Uint8ClampedArray(0),
            hasTransparency,
            dpi,
            tiledStoreId,
          });
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Contexto 2D de canvas no disponible.'));
          return;
        }
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, w, h);
        URL.revokeObjectURL(url);

        let hasTransparency = false;
        for (let i = 3; i < imgData.data.length; i += 4) {
          if (imgData.data[i] < 254) {
            hasTransparency = true;
            break;
          }
        }
        resolve({ width: w, height: h, data: imgData.data, hasTransparency, dpi });
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('El navegador no pudo decodificar la imagen (archivo corrupto o no compatible).'));
    };
    img.src = url;
  });
}

// =========================================================================
// ZLIB / DEFLATE DECOMPRESSION HELPER (Aseprite & TIFF)
// =========================================================================
async function inflateBytes(
  compressed: Uint8Array,
  format: 'deflate' | 'deflate-raw' = 'deflate'
): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Tu entorno no soporta DecompressionStream para archivos comprimidos.');
  }
  const copy = new Uint8Array(compressed.byteLength);
  copy.set(compressed);
  const stream = new Blob([copy.buffer]).stream().pipeThrough(new DecompressionStream(format));
  const ab = await new Response(stream).arrayBuffer();
  return new Uint8Array(ab);
}

// =========================================================================
// ANIMATED GIF DECODER (GIF87a & GIF89a · Full LZW + Disposal + Alpha)
// =========================================================================
interface DecodedGifFrame {
  rgba: Uint8ClampedArray;
  delayMs: number;
}

function lzwDecodeGif(minCodeSize: number, data: Uint8Array, pixelCount: number): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let codeMask = (1 << codeSize) - 1;
  let nextCode = eoiCode + 1;

  const prefix = new Int32Array(4096);
  const suffix = new Uint8Array(4096);
  const stack = new Uint8Array(4097);

  for (let i = 0; i < clearCode; i++) {
    prefix[i] = -1;
    suffix[i] = i;
  }

  const out = new Uint8Array(pixelCount);
  let outPos = 0;
  let bitPos = 0;
  const totalBits = data.length * 8;

  const readCode = (): number => {
    if (bitPos + codeSize > totalBits) return eoiCode;
    let byteIdx = bitPos >> 3;
    let bitOff = bitPos & 7;
    let val = data[byteIdx] >> bitOff;
    let bitsRead = 8 - bitOff;
    byteIdx++;
    while (bitsRead < codeSize && byteIdx < data.length) {
      val |= data[byteIdx] << bitsRead;
      bitsRead += 8;
      byteIdx++;
    }
    bitPos += codeSize;
    return val & codeMask;
  };

  let prevCode = -1;
  let firstChar = 0;

  while (outPos < pixelCount) {
    const code = readCode();
    if (code === eoiCode) break;
    if (code === clearCode) {
      codeSize = minCodeSize + 1;
      codeMask = (1 << codeSize) - 1;
      nextCode = eoiCode + 1;
      prevCode = -1;
      continue;
    }

    let inCode = code;
    let stackTop = 0;

    if (code >= nextCode) {
      if (prevCode === -1) break;
      stack[stackTop++] = firstChar;
      inCode = prevCode;
    }

    let guard = 0;
    while (inCode >= clearCode && guard < 4096) {
      stack[stackTop++] = suffix[inCode];
      inCode = prefix[inCode];
      guard++;
    }
    if (inCode < 0 || inCode >= 4096) break;

    firstChar = suffix[inCode];
    stack[stackTop++] = firstChar;

    while (stackTop > 0 && outPos < pixelCount) {
      out[outPos++] = stack[--stackTop];
    }

    if (prevCode !== -1 && nextCode < 4096) {
      prefix[nextCode] = prevCode;
      suffix[nextCode] = firstChar;
      nextCode++;
      if (nextCode > codeMask && codeSize < 12) {
        codeSize++;
        codeMask = (1 << codeSize) - 1;
      }
    }
    prevCode = code;
  }

  return out;
}

export function decodeAnimatedGif(buffer: ArrayBuffer): {
  width: number;
  height: number;
  frames: DecodedGifFrame[];
  hasTransparency: boolean;
} {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 14) {
    throw new Error('Archivo GIF demasiado pequeño o truncado.');
  }
  const sig = String.fromCharCode(...bytes.slice(0, 6));
  if (sig !== 'GIF87a' && sig !== 'GIF89a') {
    throw new Error('Cabecera GIF inválida (se esperaba GIF87a o GIF89a).');
  }

  const width = bytes[6] | (bytes[7] << 8);
  const height = bytes[8] | (bytes[9] << 8);
  if (width <= 0 || height <= 0) {
    throw new Error('Dimensiones GIF inválidas (0×0).');
  }

  const lsdPacked = bytes[10];
  const hasGct = (lsdPacked & 0x80) !== 0;
  const gctCount = 1 << ((lsdPacked & 0x07) + 1);
  let pos = 13;

  let gct: Uint8Array | null = null;
  if (hasGct) {
    const gctBytes = gctCount * 3;
    if (pos + gctBytes > bytes.length) {
      throw new Error('Tabla de color global GIF truncada.');
    }
    gct = bytes.subarray(pos, pos + gctBytes);
    pos += gctBytes;
  }

  const canvas = new Uint8ClampedArray(width * height * 4);
  const frames: DecodedGifFrame[] = [];
  let hasTransparency = false;

  // Graphic Control Extension state (resets after each image block)
  let disposalMethod = 0;
  let hasTransparentIdx = false;
  let transparentIdx = -1;
  let delayMs = 100;

  const skipSubBlocks = () => {
    while (pos < bytes.length) {
      const size = bytes[pos++];
      if (size === 0) break;
      pos += size;
    }
  };

  while (pos < bytes.length) {
    const introducer = bytes[pos++];
    if (introducer === 0x3b) {
      // GIF Trailer
      break;
    } else if (introducer === 0x21) {
      // Extension block
      if (pos >= bytes.length) break;
      const label = bytes[pos++];
      if (label === 0xf9 && pos + 5 <= bytes.length) {
        const blockSize = bytes[pos++];
        if (blockSize >= 4) {
          const packed = bytes[pos];
          disposalMethod = (packed >> 2) & 0x07;
          hasTransparentIdx = (packed & 0x01) !== 0;
          const delayCs = bytes[pos + 1] | (bytes[pos + 2] << 8);
          delayMs = delayCs <= 1 ? 100 : delayCs * 10;
          transparentIdx = bytes[pos + 3];
        }
        pos += blockSize;
        skipSubBlocks();
      } else {
        skipSubBlocks();
      }
    } else if (introducer === 0x2c) {
      // Image Descriptor
      if (pos + 9 > bytes.length) break;
      const imgLeft = bytes[pos] | (bytes[pos + 1] << 8);
      const imgTop = bytes[pos + 2] | (bytes[pos + 3] << 8);
      const imgW = bytes[pos + 4] | (bytes[pos + 5] << 8);
      const imgH = bytes[pos + 6] | (bytes[pos + 7] << 8);
      const imgPacked = bytes[pos + 8];
      pos += 9;

      const hasLct = (imgPacked & 0x80) !== 0;
      const interlaced = (imgPacked & 0x40) !== 0;
      const lctCount = 1 << ((imgPacked & 0x07) + 1);

      let colorTable = gct;
      if (hasLct) {
        const lctBytes = lctCount * 3;
        if (pos + lctBytes > bytes.length) break;
        colorTable = bytes.subarray(pos, pos + lctBytes);
        pos += lctBytes;
      }

      if (pos >= bytes.length) break;
      const minCodeSize = bytes[pos++];
      if (minCodeSize < 2 || minCodeSize > 11) {
        throw new Error(`Tamaño mínimo LZW de GIF inválido (${minCodeSize}).`);
      }

      // Concatenate image data sub-blocks
      const chunks: Uint8Array[] = [];
      let totalDataLen = 0;
      while (pos < bytes.length) {
        const subLen = bytes[pos++];
        if (subLen === 0) break;
        const end = Math.min(bytes.length, pos + subLen);
        chunks.push(bytes.subarray(pos, end));
        totalDataLen += end - pos;
        pos = end;
      }

      const lzwData = new Uint8Array(totalDataLen);
      let writeOff = 0;
      for (const ch of chunks) {
        lzwData.set(ch, writeOff);
        writeOff += ch.length;
      }

      const indices = lzwDecodeGif(minCodeSize, lzwData, imgW * imgH);
      const prevCanvasSnapshot = disposalMethod === 3 ? new Uint8ClampedArray(canvas) : null;

      // De-interlace row map
      const passStarts = [0, 4, 2, 1];
      const passSteps = [8, 8, 4, 2];
      let srcRow = 0;
      const rowMap = new Int32Array(imgH);
      if (interlaced) {
        for (let p = 0; p < 4; p++) {
          for (let y = passStarts[p]; y < imgH; y += passSteps[p]) {
            rowMap[srcRow++] = y;
          }
        }
      } else {
        for (let y = 0; y < imgH; y++) rowMap[y] = y;
      }

      if (colorTable) {
        for (let sy = 0; sy < imgH; sy++) {
          const dy = imgTop + rowMap[sy];
          if (dy < 0 || dy >= height) continue;
          for (let sx = 0; sx < imgW; sx++) {
            const dx = imgLeft + sx;
            if (dx < 0 || dx >= width) continue;
            const cIdx = indices[sy * imgW + sx];
            if (hasTransparentIdx && cIdx === transparentIdx) {
              hasTransparency = true;
              continue;
            }
            const tOff = cIdx * 3;
            if (tOff + 2 >= colorTable.length) continue;
            const dst = (dy * width + dx) * 4;
            canvas[dst] = colorTable[tOff];
            canvas[dst + 1] = colorTable[tOff + 1];
            canvas[dst + 2] = colorTable[tOff + 2];
            canvas[dst + 3] = 255;
          }
        }
      }

      // Check transparency on frame 0 if sub-rect didn't cover whole canvas
      if (!hasTransparency) {
        for (let i = 3; i < canvas.length; i += 4) {
          if (canvas[i] < 254) {
            hasTransparency = true;
            break;
          }
        }
      }

      frames.push({
        rgba: new Uint8ClampedArray(canvas),
        delayMs,
      });

      // Apply disposal method for subsequent frame
      if (disposalMethod === 2) {
        for (let sy = 0; sy < imgH; sy++) {
          const dy = imgTop + sy;
          if (dy < 0 || dy >= height) continue;
          for (let sx = 0; sx < imgW; sx++) {
            const dx = imgLeft + sx;
            if (dx < 0 || dx >= width) continue;
            const dst = (dy * width + dx) * 4;
            canvas[dst] = 0;
            canvas[dst + 1] = 0;
            canvas[dst + 2] = 0;
            canvas[dst + 3] = 0;
          }
        }
      } else if (disposalMethod === 3 && prevCanvasSnapshot) {
        canvas.set(prevCanvasSnapshot);
      }

      // Reset GCE state for next frame
      disposalMethod = 0;
      hasTransparentIdx = false;
      transparentIdx = -1;
      delayMs = 100;
    } else if (introducer === 0x00) {
      continue;
    } else {
      break;
    }
  }

  if (frames.length === 0) {
    throw new Error('No se encontró ningún fotograma válido dentro del archivo GIF.');
  }

  return { width, height, frames, hasTransparency };
}

// =========================================================================
// TGA (TARGA) BINARY DECODER (Types 1/2/3/9/10/11 · 8/15/16/24/32 bpp)
// =========================================================================
export function decodeTgaToRgba(buffer: ArrayBuffer): DecodedRgbaImage {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 18) {
    throw new Error('Archivo TGA demasiado pequeño o cabecera incompleta.');
  }
  const view = new DataView(buffer);
  const idLength = bytes[0];
  const colorMapType = bytes[1];
  const imageType = bytes[2];
  const cmFirstEntry = view.getUint16(3, true);
  const cmLength = view.getUint16(5, true);
  const cmEntrySize = bytes[7];
  const width = view.getUint16(12, true);
  const height = view.getUint16(14, true);
  const pixelDepth = bytes[16];
  const descriptor = bytes[17];

  if (width <= 0 || height <= 0) {
    throw new Error('Dimensiones TGA inválidas.');
  }

  const supportedTypes = [1, 2, 3, 9, 10, 11];
  if (!supportedTypes.includes(imageType)) {
    throw new Error(`Tipo de imagen TGA no soportado (código ${imageType}).`);
  }

  const isRle = imageType >= 9;
  const baseType = isRle ? imageType - 8 : imageType; // 1=indexed, 2=truecolor, 3=grayscale
  const bytesPerPixel = Math.ceil(pixelDepth / 8);
  if (bytesPerPixel < 1 || bytesPerPixel > 4) {
    throw new Error(`Profundidad de color TGA no soportada (${pixelDepth} bits).`);
  }

  const alphaBits = descriptor & 0x0f;
  const originRight = (descriptor & 0x10) !== 0;
  const originTop = (descriptor & 0x20) !== 0;

  let offset = 18 + idLength;

  // Read color map if present
  const colorMap: [number, number, number, number][] = [];
  if (colorMapType === 1 && cmLength > 0) {
    const cmBpp = Math.ceil(cmEntrySize / 8);
    for (let i = 0; i < cmLength && offset + cmBpp <= bytes.length; i++) {
      if (cmBpp === 4) {
        colorMap.push([bytes[offset + 2], bytes[offset + 1], bytes[offset], bytes[offset + 3]]);
      } else if (cmBpp === 3) {
        colorMap.push([bytes[offset + 2], bytes[offset + 1], bytes[offset], 255]);
      } else if (cmBpp === 2) {
        const v = bytes[offset] | (bytes[offset + 1] << 8);
        const r = Math.round(((v >> 10) & 31) * (255 / 31));
        const g = Math.round(((v >> 5) & 31) * (255 / 31));
        const b = Math.round((v & 31) * (255 / 31));
        const a = cmEntrySize === 16 && (v & 0x8000) === 0 ? 0 : 255;
        colorMap.push([r, g, b, a]);
      } else {
        const v = bytes[offset];
        colorMap.push([v, v, v, 255]);
      }
      offset += cmBpp;
    }
  }

  const totalPixels = width * height;
  const rawPixels = new Uint8Array(totalPixels * bytesPerPixel);

  if (!isRle) {
    const needed = totalPixels * bytesPerPixel;
    if (offset + needed > bytes.length) {
      throw new Error('Datos de píxeles TGA truncados.');
    }
    rawPixels.set(bytes.subarray(offset, offset + needed));
  } else {
    let pixelIdx = 0;
    while (pixelIdx < totalPixels && offset < bytes.length) {
      const header = bytes[offset++];
      const count = (header & 0x7f) + 1;
      if ((header & 0x80) !== 0) {
        // RLE packet
        if (offset + bytesPerPixel > bytes.length) break;
        const sample = bytes.subarray(offset, offset + bytesPerPixel);
        offset += bytesPerPixel;
        for (let k = 0; k < count && pixelIdx < totalPixels; k++) {
          rawPixels.set(sample, pixelIdx * bytesPerPixel);
          pixelIdx++;
        }
      } else {
        // Raw packet
        const rawBytesCount = count * bytesPerPixel;
        const avail = Math.min(rawBytesCount, bytes.length - offset);
        const pixelsToCopy = Math.min(count, totalPixels - pixelIdx, Math.floor(avail / bytesPerPixel));
        rawPixels.set(bytes.subarray(offset, offset + pixelsToCopy * bytesPerPixel), pixelIdx * bytesPerPixel);
        offset += rawBytesCount;
        pixelIdx += pixelsToCopy;
      }
    }
  }

  const out = new Uint8ClampedArray(totalPixels * 4);
  let anyAlphaNonZero = false;
  let anyRgbNonZero = false;

  for (let i = 0; i < totalPixels; i++) {
    const sx = i % width;
    const sy = Math.floor(i / width);
    const dx = originRight ? width - 1 - sx : sx;
    const dy = originTop ? sy : height - 1 - sy;
    const dst = (dy * width + dx) * 4;
    const src = i * bytesPerPixel;

    let r = 0;
    let g = 0;
    let b = 0;
    let a = 255;

    if (baseType === 1) {
      const idx =
        bytesPerPixel === 1
          ? rawPixels[src]
          : rawPixels[src] | (rawPixels[src + 1] << 8);
      const entry = colorMap[idx - cmFirstEntry];
      if (entry) {
        [r, g, b, a] = entry;
      }
    } else if (baseType === 3) {
      r = g = b = rawPixels[src];
      a = bytesPerPixel >= 2 ? rawPixels[src + 1] : 255;
    } else {
      // Truecolor
      if (bytesPerPixel === 4) {
        b = rawPixels[src];
        g = rawPixels[src + 1];
        r = rawPixels[src + 2];
        a = rawPixels[src + 3];
      } else if (bytesPerPixel === 3) {
        b = rawPixels[src];
        g = rawPixels[src + 1];
        r = rawPixels[src + 2];
        a = 255;
      } else if (bytesPerPixel === 2) {
        const v = rawPixels[src] | (rawPixels[src + 1] << 8);
        r = Math.round(((v >> 10) & 31) * (255 / 31));
        g = Math.round(((v >> 5) & 31) * (255 / 31));
        b = Math.round((v & 31) * (255 / 31));
        a = alphaBits > 0 ? ((v & 0x8000) !== 0 ? 255 : 0) : 255;
      }
    }

    if (a > 0) anyAlphaNonZero = true;
    if (r > 0 || g > 0 || b > 0) anyRgbNonZero = true;
    out[dst] = r;
    out[dst + 1] = g;
    out[dst + 2] = b;
    out[dst + 3] = a;
  }

  // Some 32-bit TGA writers leave alpha = 0 across an opaque image when alphaBits === 0
  if ((pixelDepth === 32 || pixelDepth === 16) && !anyAlphaNonZero && anyRgbNonZero) {
    for (let i = 3; i < out.length; i += 4) {
      out[i] = 255;
    }
  }

  let hasTransparency = false;
  for (let i = 3; i < out.length; i += 4) {
    if (out[i] < 254) {
      hasTransparency = true;
      break;
    }
  }

  return { width, height, data: out, hasTransparency };
}

// =========================================================================
// BMP BINARY DECODER (1/4/8/16/24/32 bpp · BI_RGB & BI_BITFIELDS + Alpha)
// =========================================================================
function decodeMaskChannel(val: number, mask: number): number {
  if (mask === 0) return 0;
  let shift = 0;
  let m = mask >>> 0;
  while ((m & 1) === 0 && shift < 32) {
    m >>>= 1;
    shift++;
  }
  const bits = m;
  if (bits === 0) return 0;
  const extracted = (val >>> shift) & bits;
  return Math.round((extracted / bits) * 255);
}

export async function decodeBmpToRgba(buffer: ArrayBuffer, fallbackBlob?: Blob): Promise<DecodedRgbaImage> {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 26 || bytes[0] !== 0x42 || bytes[1] !== 0x4d) {
    throw new Error('Archivo BMP inválido (falta firma mágica "BM").');
  }
  const view = new DataView(buffer);
  const dataOffset = view.getUint32(10, true);
  const dibSize = view.getUint32(14, true);

  let width = 0;
  let rawHeight = 0;
  let bpp = 0;
  let compression = 0;
  let colorsUsed = 0;

  if (dibSize === 12) {
    width = view.getUint16(18, true);
    rawHeight = view.getUint16(20, true);
    bpp = view.getUint16(24, true);
  } else if (dibSize >= 40 && bytes.length >= 54) {
    width = view.getInt32(18, true);
    rawHeight = view.getInt32(22, true);
    bpp = view.getUint16(28, true);
    compression = view.getUint32(30, true);
    colorsUsed = view.getUint32(46, true);
  } else {
    if (fallbackBlob) return decodeBrowserBlobToRgba(fallbackBlob);
    throw new Error(`Cabecera DIB BMP no soportada (${dibSize} bytes).`);
  }

  const height = Math.abs(rawHeight);
  const topDown = rawHeight < 0;
  if (width <= 0 || height <= 0) {
    throw new Error('Dimensiones BMP inválidas.');
  }

  // RLE4/RLE8/JPEG/PNG BMP variants delegate to browser native image decoder
  if (compression !== 0 && compression !== 3 && compression !== 6) {
    if (fallbackBlob) return decodeBrowserBlobToRgba(fallbackBlob);
    throw new Error(`Compresión BMP no soportada (código ${compression}).`);
  }

  let rMask = bpp === 16 ? 0x7c00 : 0x00ff0000;
  let gMask = bpp === 16 ? 0x03e0 : 0x0000ff00;
  let bMask = bpp === 16 ? 0x001f : 0x000000ff;
  let aMask = bpp === 32 ? 0xff000000 : 0;

  if ((compression === 3 || compression === 6) && bytes.length >= 14 + 40 + 12) {
    const maskOff = dibSize >= 52 ? 54 : 14 + dibSize;
    if (maskOff + 12 <= bytes.length) {
      rMask = view.getUint32(maskOff, true);
      gMask = view.getUint32(maskOff + 4, true);
      bMask = view.getUint32(maskOff + 8, true);
      if (dibSize >= 56 && maskOff + 16 <= bytes.length) {
        aMask = view.getUint32(maskOff + 12, true);
      }
    }
  }

  const palette: [number, number, number][] = [];
  if (bpp <= 8) {
    const count = colorsUsed > 0 ? colorsUsed : 1 << bpp;
    const palOff = 14 + dibSize;
    const entrySize = dibSize === 12 ? 3 : 4;
    for (let i = 0; i < count && palOff + i * entrySize + 2 < bytes.length; i++) {
      const p = palOff + i * entrySize;
      palette.push([bytes[p + 2], bytes[p + 1], bytes[p]]);
    }
  }

  const rowStride = Math.floor((bpp * width + 31) / 32) * 4;
  const out = new Uint8ClampedArray(width * height * 4);
  let anyAlphaNonZero = false;
  let anyRgbNonZero = false;

  for (let row = 0; row < height; row++) {
    const dy = topDown ? row : height - 1 - row;
    const rowOff = dataOffset + row * rowStride;
    if (rowOff >= bytes.length) break;

    for (let x = 0; x < width; x++) {
      const dst = (dy * width + x) * 4;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 255;

      if (bpp === 32) {
        const p = rowOff + x * 4;
        if (p + 3 >= bytes.length) continue;
        if (compression === 3 || compression === 6) {
          const val = view.getUint32(p, true);
          r = decodeMaskChannel(val, rMask);
          g = decodeMaskChannel(val, gMask);
          b = decodeMaskChannel(val, bMask);
          a = aMask !== 0 ? decodeMaskChannel(val, aMask) : 255;
        } else {
          b = bytes[p];
          g = bytes[p + 1];
          r = bytes[p + 2];
          a = bytes[p + 3];
        }
      } else if (bpp === 24) {
        const p = rowOff + x * 3;
        if (p + 2 >= bytes.length) continue;
        b = bytes[p];
        g = bytes[p + 1];
        r = bytes[p + 2];
      } else if (bpp === 16) {
        const p = rowOff + x * 2;
        if (p + 1 >= bytes.length) continue;
        const val = view.getUint16(p, true);
        r = decodeMaskChannel(val, rMask);
        g = decodeMaskChannel(val, gMask);
        b = decodeMaskChannel(val, bMask);
        a = aMask !== 0 ? decodeMaskChannel(val, aMask) : 255;
      } else if (bpp === 8) {
        const idx = bytes[rowOff + x] ?? 0;
        const c = palette[idx];
        if (c) [r, g, b] = c;
      } else if (bpp === 4) {
        const byte = bytes[rowOff + (x >> 1)] ?? 0;
        const idx = (x & 1) === 0 ? (byte >> 4) & 0x0f : byte & 0x0f;
        const c = palette[idx];
        if (c) [r, g, b] = c;
      } else if (bpp === 1) {
        const byte = bytes[rowOff + (x >> 3)] ?? 0;
        const idx = (byte >> (7 - (x & 7))) & 1;
        const c = palette[idx];
        if (c) [r, g, b] = c;
      }

      if (a > 0) anyAlphaNonZero = true;
      if (r > 0 || g > 0 || b > 0) anyRgbNonZero = true;
      out[dst] = r;
      out[dst + 1] = g;
      out[dst + 2] = b;
      out[dst + 3] = a;
    }
  }

  // Many 32-bit BI_RGB BMPs leave the padding byte as 0 instead of 255
  if (bpp === 32 && !anyAlphaNonZero && anyRgbNonZero) {
    for (let i = 3; i < out.length; i += 4) out[i] = 255;
  }

  let hasTransparency = false;
  for (let i = 3; i < out.length; i += 4) {
    if (out[i] < 254) {
      hasTransparency = true;
      break;
    }
  }

  return { width, height, data: out, hasTransparency };
}

// =========================================================================
// ICO / CUR BINARY DECODER (PNG-embedded OR XOR DIB + 1-bit AND Mask)
// =========================================================================
export async function decodeIcoToRgba(buffer: ArrayBuffer): Promise<DecodedRgbaImage> {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 22) {
    throw new Error('Archivo ICO demasiado pequeño o inválido.');
  }
  const view = new DataView(buffer);
  const reserved = view.getUint16(0, true);
  const iconType = view.getUint16(2, true);
  const count = view.getUint16(4, true);

  if (reserved !== 0 || (iconType !== 1 && iconType !== 2) || count < 1) {
    throw new Error('Cabecera ICO inválida.');
  }

  interface IcoEntry {
    w: number;
    h: number;
    bpp: number;
    size: number;
    offset: number;
  }

  const entries: IcoEntry[] = [];
  for (let i = 0; i < count; i++) {
    const base = 6 + i * 16;
    if (base + 16 > bytes.length) break;
    const w = bytes[base] === 0 ? 256 : bytes[base];
    const h = bytes[base + 1] === 0 ? 256 : bytes[base + 1];
    const bpp = view.getUint16(base + 6, true) || 32;
    const size = view.getUint32(base + 8, true);
    const offset = view.getUint32(base + 12, true);
    if (offset + size <= bytes.length && size >= 16) {
      entries.push({ w, h, bpp, size, offset });
    }
  }

  if (entries.length === 0) {
    throw new Error('El archivo ICO no contiene entradas de imagen válidas.');
  }

  // Pick the highest resolution & highest bit depth icon
  entries.sort((a, b) => {
    const areaDiff = b.w * b.h - a.w * a.h;
    if (areaDiff !== 0) return areaDiff;
    return b.bpp - a.bpp;
  });

  const best = entries[0];
  const slice = bytes.subarray(best.offset, best.offset + best.size);

  // Check for embedded PNG signature
  if (
    slice.length >= 8 &&
    slice[0] === 0x89 &&
    slice[1] === 0x50 &&
    slice[2] === 0x4e &&
    slice[3] === 0x47
  ) {
    const pngCopy = new Uint8Array(slice.byteLength);
    pngCopy.set(slice);
    return decodeBrowserBlobToRgba(new Blob([pngCopy.buffer], { type: 'image/png' }));
  }

  // Decode embedded DIB (XOR bitmap + 1-bit AND transparency mask)
  const dibView = new DataView(buffer, best.offset, best.size);
  const headerSize = dibView.getUint32(0, true);
  if (headerSize < 40 || best.size < headerSize) {
    throw new Error('Entrada DIB dentro de archivo ICO corrupta.');
  }
  const width = Math.abs(dibView.getInt32(4, true)) || best.w;
  const rawH = dibView.getInt32(8, true);
  const height = Math.abs(rawH) === best.h * 2 ? best.h : Math.max(1, Math.floor(Math.abs(rawH) / 2) || best.h);
  const bpp = dibView.getUint16(14, true);
  const colorsUsed = dibView.getUint32(32, true);

  let pos = headerSize;
  const palette: [number, number, number][] = [];
  if (bpp <= 8) {
    const palCount = colorsUsed > 0 ? colorsUsed : 1 << bpp;
    for (let i = 0; i < palCount && pos + 4 <= slice.length; i++) {
      palette.push([slice[pos + 2], slice[pos + 1], slice[pos]]);
      pos += 4;
    }
  }

  const xorStride = Math.floor((bpp * width + 31) / 32) * 4;
  const xorSize = xorStride * height;
  const andOffset = pos + xorSize;
  const andStride = Math.floor((width + 31) / 32) * 4;
  const hasAndMask = andOffset + andStride * height <= slice.length;

  const out = new Uint8ClampedArray(width * height * 4);
  let anyAlphaNonZero = false;

  for (let row = 0; row < height; row++) {
    const dy = height - 1 - row;
    const xorRow = pos + row * xorStride;
    const andRow = andOffset + row * andStride;

    for (let x = 0; x < width; x++) {
      const dst = (dy * width + x) * 4;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 255;

      if (bpp === 32) {
        const p = xorRow + x * 4;
        if (p + 3 < slice.length) {
          b = slice[p];
          g = slice[p + 1];
          r = slice[p + 2];
          a = slice[p + 3];
        }
      } else if (bpp === 24) {
        const p = xorRow + x * 3;
        if (p + 2 < slice.length) {
          b = slice[p];
          g = slice[p + 1];
          r = slice[p + 2];
        }
      } else if (bpp === 8) {
        const idx = slice[xorRow + x] ?? 0;
        const c = palette[idx];
        if (c) [r, g, b] = c;
      } else if (bpp === 4) {
        const byte = slice[xorRow + (x >> 1)] ?? 0;
        const idx = (x & 1) === 0 ? (byte >> 4) & 0x0f : byte & 0x0f;
        const c = palette[idx];
        if (c) [r, g, b] = c;
      } else if (bpp === 1) {
        const byte = slice[xorRow + (x >> 3)] ?? 0;
        const idx = (byte >> (7 - (x & 7))) & 1;
        const c = palette[idx];
        if (c) [r, g, b] = c;
      }

      if (bpp < 32 && hasAndMask) {
        const maskByte = slice[andRow + (x >> 3)] ?? 0;
        const isTransparent = ((maskByte >> (7 - (x & 7))) & 1) === 1;
        if (isTransparent) a = 0;
      }

      if (a > 0) anyAlphaNonZero = true;
      out[dst] = r;
      out[dst + 1] = g;
      out[dst + 2] = b;
      out[dst + 3] = a;
    }
  }

  // Fallback to AND mask if a 32-bit ICO wrote all-zero alpha channel
  if (bpp === 32 && !anyAlphaNonZero && hasAndMask) {
    for (let row = 0; row < height; row++) {
      const dy = height - 1 - row;
      const andRow = andOffset + row * andStride;
      for (let x = 0; x < width; x++) {
        const maskByte = slice[andRow + (x >> 3)] ?? 0;
        const isTransparent = ((maskByte >> (7 - (x & 7))) & 1) === 1;
        out[(dy * width + x) * 4 + 3] = isTransparent ? 0 : 255;
      }
    }
  }

  let hasTransparency = false;
  for (let i = 3; i < out.length; i += 4) {
    if (out[i] < 254) {
      hasTransparency = true;
      break;
    }
  }
  return { width, height, data: out, hasTransparency };
}

// =========================================================================
// TIFF BINARY DECODER (II/MM · Multi-Page · Uncompressed / PackBits / LZW / Deflate)
// =========================================================================
function decodeTiffPackBits(src: Uint8Array, expectedBytes: number): Uint8Array {
  const out = new Uint8Array(expectedBytes);
  let srcPos = 0;
  let dstPos = 0;
  while (srcPos < src.length && dstPos < expectedBytes) {
    let n = src[srcPos++];
    if (n > 127) n -= 256;
    if (n >= 0) {
      const count = n + 1;
      for (let i = 0; i < count && srcPos < src.length && dstPos < expectedBytes; i++) {
        out[dstPos++] = src[srcPos++];
      }
    } else if (n !== -128) {
      const count = -n + 1;
      if (srcPos >= src.length) break;
      const val = src[srcPos++];
      for (let i = 0; i < count && dstPos < expectedBytes; i++) {
        out[dstPos++] = val;
      }
    }
  }
  return out;
}

function decodeTiffLzw(src: Uint8Array, expectedBytes: number): Uint8Array {
  const out = new Uint8Array(expectedBytes);
  let outPos = 0;
  let bitPos = 0;
  const totalBits = src.length * 8;

  const CLEAR = 256;
  const EOI = 257;
  let codeLen = 9;
  let nextCode = 258;

  const prefix = new Int32Array(4096);
  const suffix = new Uint8Array(4096);
  const stack = new Uint8Array(4097);

  for (let i = 0; i < 256; i++) {
    prefix[i] = -1;
    suffix[i] = i;
  }

  const readBitsMsb = (n: number): number => {
    if (bitPos + n > totalBits) return EOI;
    let val = 0;
    for (let i = 0; i < n; i++) {
      const byteIdx = bitPos >> 3;
      const bitIdx = 7 - (bitPos & 7);
      val = (val << 1) | ((src[byteIdx] >> bitIdx) & 1);
      bitPos++;
    }
    return val;
  };

  let prevCode = -1;
  let firstChar = 0;

  while (outPos < expectedBytes) {
    const code = readBitsMsb(codeLen);
    if (code === EOI) break;
    if (code === CLEAR) {
      codeLen = 9;
      nextCode = 258;
      prevCode = -1;
      continue;
    }

    let inCode = code;
    let stackTop = 0;
    if (code >= nextCode) {
      if (prevCode === -1) break;
      stack[stackTop++] = firstChar;
      inCode = prevCode;
    }

    let guard = 0;
    while (inCode >= 256 && guard < 4096) {
      stack[stackTop++] = suffix[inCode];
      inCode = prefix[inCode];
      guard++;
    }
    if (inCode < 0 || inCode >= 4096) break;
    firstChar = suffix[inCode];
    stack[stackTop++] = firstChar;

    while (stackTop > 0 && outPos < expectedBytes) {
      out[outPos++] = stack[--stackTop];
    }

    if (prevCode !== -1 && nextCode < 4096) {
      prefix[nextCode] = prevCode;
      suffix[nextCode] = firstChar;
      nextCode++;
      // TIFF LZW uses early-change bit width transitions at 511, 1023, 2047
      if (nextCode === 511) codeLen = 10;
      else if (nextCode === 1023) codeLen = 11;
      else if (nextCode === 2047) codeLen = 12;
    }
    prevCode = code;
  }

  return out;
}

export async function decodeTiffFrames(buffer: ArrayBuffer): Promise<DecodedRgbaImage[]> {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 8) {
    throw new Error('Archivo TIFF demasiado pequeño.');
  }

  let littleEndian = true;
  if (bytes[0] === 0x49 && bytes[1] === 0x49) {
    littleEndian = true;
  } else if (bytes[0] === 0x4d && bytes[1] === 0x4d) {
    littleEndian = false;
  } else {
    throw new Error('Cabecera TIFF inválida (no es "II" ni "MM").');
  }

  const view = new DataView(buffer);
  const magic = view.getUint16(2, littleEndian);
  if (magic !== 42) {
    throw new Error(`Número mágico TIFF inválido (${magic}, se esperaba 42).`);
  }

  const TYPE_SIZES: Record<number, number> = {
    1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8,
  };

  const readTagValues = (entryOff: number): number[] => {
    const type = view.getUint16(entryOff + 2, littleEndian);
    const count = view.getUint32(entryOff + 4, littleEndian);
    const typeSize = TYPE_SIZES[type] || 1;
    const totalBytes = count * typeSize;
    const dataOff = totalBytes <= 4 ? entryOff + 8 : view.getUint32(entryOff + 8, littleEndian);
    const vals: number[] = [];
    for (let i = 0; i < count; i++) {
      const p = dataOff + i * typeSize;
      if (p + typeSize > bytes.length) break;
      if (type === 1 || type === 7) vals.push(bytes[p]);
      else if (type === 3) vals.push(view.getUint16(p, littleEndian));
      else if (type === 4) vals.push(view.getUint32(p, littleEndian));
      else if (type === 8) vals.push(view.getInt16(p, littleEndian));
      else if (type === 9) vals.push(view.getInt32(p, littleEndian));
      else vals.push(bytes[p]);
    }
    return vals;
  };

  const pages: DecodedRgbaImage[] = [];
  let ifdOffset = view.getUint32(4, littleEndian);
  const visitedIfds = new Set<number>();

  while (ifdOffset > 0 && ifdOffset + 2 <= bytes.length && !visitedIfds.has(ifdOffset) && pages.length < 128) {
    visitedIfds.add(ifdOffset);
    const numEntries = view.getUint16(ifdOffset, littleEndian);
    const tags = new Map<number, number[]>();

    for (let i = 0; i < numEntries; i++) {
      const entryOff = ifdOffset + 2 + i * 12;
      if (entryOff + 12 > bytes.length) break;
      const tagId = view.getUint16(entryOff, littleEndian);
      tags.set(tagId, readTagValues(entryOff));
    }

    const nextIfdPos = ifdOffset + 2 + numEntries * 12;
    ifdOffset = nextIfdPos + 4 <= bytes.length ? view.getUint32(nextIfdPos, littleEndian) : 0;

    const width = tags.get(256)?.[0] || 0;
    const height = tags.get(257)?.[0] || 0;
    if (width <= 0 || height <= 0) continue;

    const bitsPerSampleArr = tags.get(258) || [8];
    const bps = bitsPerSampleArr[0] || 8;
    const compression = tags.get(259)?.[0] || 1;
    const photometric = tags.get(262)?.[0] ?? 2;
    const samplesPerPixel = tags.get(277)?.[0] || bitsPerSampleArr.length || 1;
    const planarConfig = tags.get(284)?.[0] || 1;
    const predictor = tags.get(317)?.[0] || 1;
    const colorMap = tags.get(320) || [];

    const stripOffsets = tags.get(273) || [];
    const stripByteCounts = tags.get(279) || [];
    const rowsPerStrip = tags.get(278)?.[0] || height;

    const tileWidth = tags.get(322)?.[0] || 0;
    const tileLength = tags.get(323)?.[0] || 0;
    const tileOffsets = tags.get(324) || [];
    const tileByteCounts = tags.get(325) || [];

    const decompressChunk = async (raw: Uint8Array, expected: number): Promise<Uint8Array> => {
      if (compression === 1) return raw;
      if (compression === 32773) return decodeTiffPackBits(raw, expected);
      if (compression === 5) return decodeTiffLzw(raw, expected);
      if (compression === 8 || compression === 32946) {
        try {
          return await inflateBytes(raw, 'deflate');
        } catch {
          return await inflateBytes(raw, 'deflate-raw');
        }
      }
      throw new Error(`Compresión TIFF no soportada (código ${compression}).`);
    };

    const applyHorizontalPredictor = (
      buf: Uint8Array,
      rowW: number,
      rowH: number,
      spp: number
    ) => {
      if (predictor !== 2) return;
      if (bps === 8) {
        const rowStride = rowW * spp;
        for (let y = 0; y < rowH; y++) {
          const base = y * rowStride;
          for (let i = spp; i < rowStride && base + i < buf.length; i++) {
            buf[base + i] = (buf[base + i] + buf[base + i - spp]) & 0xff;
          }
        }
      } else if (bps === 16) {
        const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
        const rowSamples = rowW * spp;
        for (let y = 0; y < rowH; y++) {
          const base = y * rowSamples;
          for (let i = spp; i < rowSamples && (base + i) * 2 + 1 < buf.length; i++) {
            const cur = dv.getUint16((base + i) * 2, littleEndian);
            const prev = dv.getUint16((base + i - spp) * 2, littleEndian);
            dv.setUint16((base + i) * 2, (cur + prev) & 0xffff, littleEndian);
          }
        }
      }
    };

    const bytesPerSample = bps === 16 ? 2 : 1;
    const out = new Uint8ClampedArray(width * height * 4);

    const writePixelBlock = (
      decoded: Uint8Array,
      blockX: number,
      blockY: number,
      blockW: number,
      blockH: number,
      planeIndex: number | null
    ) => {
      const spp = planeIndex !== null ? 1 : samplesPerPixel;
      applyHorizontalPredictor(decoded, blockW, blockH, spp);

      const dv = bps === 16 ? new DataView(decoded.buffer, decoded.byteOffset, decoded.byteLength) : null;
      const readSample = (sampleIdx: number): number => {
        if (bps === 16 && dv) {
          const off = sampleIdx * 2;
          if (off + 1 >= decoded.length) return 0;
          return dv.getUint16(off, littleEndian) >> 8;
        }
        return decoded[sampleIdx] ?? 0;
      };

      for (let ly = 0; ly < blockH; ly++) {
        const dy = blockY + ly;
        if (dy < 0 || dy >= height) continue;

        if (bps === 1) {
          const rowBytes = Math.ceil((blockW * spp) / 8);
          for (let lx = 0; lx < blockW; lx++) {
            const dx = blockX + lx;
            if (dx < 0 || dx >= width) continue;
            const byte = decoded[ly * rowBytes + (lx >> 3)] ?? 0;
            const bit = (byte >> (7 - (lx & 7))) & 1;
            const v = photometric === 0 ? (bit ? 0 : 255) : bit ? 255 : 0;
            const dst = (dy * width + dx) * 4;
            out[dst] = v;
            out[dst + 1] = v;
            out[dst + 2] = v;
            out[dst + 3] = 255;
          }
          continue;
        }

        if (bps === 4) {
          const rowBytes = Math.ceil((blockW * spp) / 2);
          for (let lx = 0; lx < blockW; lx++) {
            const dx = blockX + lx;
            if (dx < 0 || dx >= width) continue;
            const byte = decoded[ly * rowBytes + (lx >> 1)] ?? 0;
            const nib = (lx & 1) === 0 ? (byte >> 4) & 0x0f : byte & 0x0f;
            const dst = (dy * width + dx) * 4;
            if (photometric === 3 && colorMap.length >= 48) {
              const mapLen = colorMap.length / 3;
              out[dst] = (colorMap[nib] ?? 0) >> 8;
              out[dst + 1] = (colorMap[mapLen + nib] ?? 0) >> 8;
              out[dst + 2] = (colorMap[mapLen * 2 + nib] ?? 0) >> 8;
              out[dst + 3] = 255;
            } else {
              const v = photometric === 0 ? 255 - nib * 17 : nib * 17;
              out[dst] = v;
              out[dst + 1] = v;
              out[dst + 2] = v;
              out[dst + 3] = 255;
            }
          }
          continue;
        }

        for (let lx = 0; lx < blockW; lx++) {
          const dx = blockX + lx;
          if (dx < 0 || dx >= width) continue;
          const dst = (dy * width + dx) * 4;
          const baseSample = (ly * blockW + lx) * spp;

          if (planeIndex !== null) {
            const v = readSample(baseSample);
            if (planeIndex < 4) out[dst + planeIndex] = v;
            if (samplesPerPixel < 4) out[dst + 3] = 255;
            continue;
          }

          if (photometric === 2) {
            // RGB / RGBA
            out[dst] = readSample(baseSample);
            out[dst + 1] = samplesPerPixel >= 2 ? readSample(baseSample + 1) : out[dst];
            out[dst + 2] = samplesPerPixel >= 3 ? readSample(baseSample + 2) : out[dst];
            out[dst + 3] = samplesPerPixel >= 4 ? readSample(baseSample + 3) : 255;
          } else if (photometric === 3 && colorMap.length >= 3) {
            // Palette / Indexed
            const idx = readSample(baseSample);
            const mapLen = Math.floor(colorMap.length / 3);
            out[dst] = (colorMap[idx] ?? 0) >> 8;
            out[dst + 1] = (colorMap[mapLen + idx] ?? 0) >> 8;
            out[dst + 2] = (colorMap[mapLen * 2 + idx] ?? 0) >> 8;
            out[dst + 3] = samplesPerPixel >= 2 ? readSample(baseSample + 1) : 255;
          } else if (photometric === 5 && samplesPerPixel >= 4) {
            // CMYK -> RGB
            const c = readSample(baseSample) / 255;
            const m = readSample(baseSample + 1) / 255;
            const yk = readSample(baseSample + 2) / 255;
            const k = readSample(baseSample + 3) / 255;
            out[dst] = Math.round(255 * (1 - c) * (1 - k));
            out[dst + 1] = Math.round(255 * (1 - m) * (1 - k));
            out[dst + 2] = Math.round(255 * (1 - yk) * (1 - k));
            out[dst + 3] = samplesPerPixel >= 5 ? readSample(baseSample + 4) : 255;
          } else {
            // Grayscale (0=WhiteIsZero, 1=BlackIsZero)
            const rawV = readSample(baseSample);
            const v = photometric === 0 ? 255 - rawV : rawV;
            out[dst] = v;
            out[dst + 1] = v;
            out[dst + 2] = v;
            out[dst + 3] = samplesPerPixel >= 2 ? readSample(baseSample + 1) : 255;
          }
        }
      }
    };

    if (tileOffsets.length > 0 && tileWidth > 0 && tileLength > 0) {
      const tilesAcross = Math.ceil(width / tileWidth);
      const tilesDown = Math.ceil(height / tileLength);
      const tilesPerPlane = tilesAcross * tilesDown;
      for (let t = 0; t < tileOffsets.length; t++) {
        const off = tileOffsets[t];
        const len = tileByteCounts[t] || bytes.length - off;
        if (off >= bytes.length) continue;
        const planeIdx = planarConfig === 2 ? Math.floor(t / tilesPerPlane) : null;
        const localIdx = planarConfig === 2 ? t % tilesPerPlane : t;
        const tx = (localIdx % tilesAcross) * tileWidth;
        const ty = Math.floor(localIdx / tilesAcross) * tileLength;
        const spp = planeIdx !== null ? 1 : samplesPerPixel;
        const expected =
          bps === 1
            ? Math.ceil((tileWidth * spp) / 8) * tileLength
            : bps === 4
            ? Math.ceil((tileWidth * spp) / 2) * tileLength
            : tileWidth * tileLength * spp * bytesPerSample;
        const raw = bytes.subarray(off, Math.min(bytes.length, off + len));
        const decoded = await decompressChunk(raw, expected);
        writePixelBlock(decoded, tx, ty, tileWidth, tileLength, planeIdx);
      }
    } else if (stripOffsets.length > 0) {
      const stripsPerPlane = Math.ceil(height / rowsPerStrip);
      for (let s = 0; s < stripOffsets.length; s++) {
        const off = stripOffsets[s];
        const len = stripByteCounts[s] || bytes.length - off;
        if (off >= bytes.length) continue;
        const planeIdx = planarConfig === 2 ? Math.floor(s / stripsPerPlane) : null;
        const localStrip = planarConfig === 2 ? s % stripsPerPlane : s;
        const sy = localStrip * rowsPerStrip;
        const stripH = Math.min(rowsPerStrip, height - sy);
        if (stripH <= 0) continue;
        const spp = planeIdx !== null ? 1 : samplesPerPixel;
        const expected =
          bps === 1
            ? Math.ceil((width * spp) / 8) * stripH
            : bps === 4
            ? Math.ceil((width * spp) / 2) * stripH
            : width * stripH * spp * bytesPerSample;
        const raw = bytes.subarray(off, Math.min(bytes.length, off + len));
        const decoded = await decompressChunk(raw, expected);
        writePixelBlock(decoded, 0, sy, width, stripH, planeIdx);
      }
    } else {
      throw new Error('El archivo TIFF no contiene franjas ni mosaicos de píxeles.');
    }

    let hasTransparency = false;
    for (let i = 3; i < out.length; i += 4) {
      if (out[i] < 254) {
        hasTransparency = true;
        break;
      }
    }
    pages.push({ width, height, data: out, hasTransparency });
  }

  if (pages.length === 0) {
    throw new Error('No se pudo decodificar ninguna página válida del archivo TIFF.');
  }
  return pages;
}

// =========================================================================
// UNIFIED RASTER DECODER (Works on PNG, JPG, WEBP, GIF, BMP, TIFF, TGA, ICO)
// =========================================================================
export async function decodeAnyRasterFileToRgba(file: File): Promise<DecodedRgbaImage> {
  const ext = getFileExtension(file.name);
  if (ext === 'tga') {
    const buf = await file.arrayBuffer();
    const res = decodeTgaToRgba(buf);
    return { ...res, dpi: 72 };
  }
  if (ext === 'bmp') {
    const buf = await file.arrayBuffer();
    const dpi = extractImageDpiFromBytes(buf, 'bmp');
    const res = await decodeBmpToRgba(buf, file);
    return { ...res, dpi };
  }
  if (ext === 'ico') {
    const res = await decodeIcoToRgba(await file.arrayBuffer());
    return { ...res, dpi: 72 };
  }
  if (ext === 'tif' || ext === 'tiff') {
    const pages = await decodeTiffFrames(await file.arrayBuffer());
    return { ...pages[0], dpi: pages[0].dpi || 72 };
  }
  if (ext === 'gif') {
    const gif = decodeAnimatedGif(await file.arrayBuffer());
    return {
      width: gif.width,
      height: gif.height,
      data: gif.frames[0].rgba,
      hasTransparency: gif.hasTransparency,
      dpi: 72,
    };
  }
  let dpi = 72;
  try {
    // Only need the first 64 KB header slice to read PNG pHYs or JPEG JFIF DPI
    const headerBuf = await file.slice(0, 65536).arrayBuffer();
    dpi = extractImageDpiFromBytes(headerBuf, ext || 'png');
  } catch {
    dpi = 72;
  }
  return decodeBrowserBlobToRgba(file, dpi);
}

/**
 * Unified rasterizer used by Importar al Proyecto, SmartImportModal, Palettes, References & Assets.
 * Guarantees PNG, JPG, JPEG, WEBP, GIF, BMP, TIFF, TGA, and ICO all decode identically.
 * Strictly uses Nearest Neighbor interpolation by default (smoothing ONLY if requested).
 */
export async function rasterizeImageFileToTargetGrid(
  file: File,
  targetW: number,
  targetH: number,
  fitMode: 'fit' | 'original' | 'stretch' | 'center_no_resize' = 'original',
  interpolation: InterpolationMode = 'nearest'
): Promise<{
  grid: (string | null)[][];
  tiledStoreId?: string;
  naturalWidth: number;
  naturalHeight: number;
  dpi: number;
  dataUrl: string;
}> {
  const decoded = await decodeAnyRasterFileToRgba(file);
  const safeW = Math.max(1, Math.round(targetW));
  const safeH = Math.max(1, Math.round(targetH));
  const dataUrl = rgbaToDataUrl(decoded, 1024);

  if (shouldUseTiledStorage(safeW, safeH)) {
    const sourceStore =
      decoded.tiledStoreId && getTiledStore(decoded.tiledStoreId)
        ? getTiledStore(decoded.tiledStoreId)!.clone()
        : (() => {
            const st = new TiledLayerStore(decoded.width, decoded.height);
            st.loadFromRgbaBuffer(decoded.data, decoded.width, decoded.height);
            return st;
          })();

    let finalStore: TiledLayerStore;
    if (decoded.width === safeW && decoded.height === safeH) {
      finalStore = sourceStore;
    } else if (fitMode === 'original' || fitMode === 'center_no_resize') {
      finalStore = sourceStore.resizeCanvas(safeW, safeH, 'center');
      sourceStore.dispose();
    } else if (fitMode === 'fit') {
      const sc = Math.min(safeW / decoded.width, safeH / decoded.height);
      const dw = Math.max(1, Math.round(decoded.width * sc));
      const dh = Math.max(1, Math.round(decoded.height * sc));
      const scaled = sourceStore.rescale(dw, dh, interpolation);
      sourceStore.dispose();
      finalStore = scaled.resizeCanvas(safeW, safeH, 'center');
      scaled.dispose();
    } else {
      finalStore = sourceStore.rescale(safeW, safeH, interpolation);
      sourceStore.dispose();
    }

    const tiledStoreId = registerTiledStore(finalStore);
    return {
      grid: [],
      tiledStoreId,
      naturalWidth: decoded.width,
      naturalHeight: decoded.height,
      dpi: decoded.dpi || 72,
      dataUrl,
    };
  }

  const scaled = scaleRgbaImage(decoded, safeW, safeH, fitMode, interpolation);
  const { grid } = rgbaBufferToPixelGrid(scaled.data, safeW, safeH);
  return {
    grid,
    naturalWidth: decoded.width,
    naturalHeight: decoded.height,
    dpi: decoded.dpi || 72,
    dataUrl,
  };
}

export async function decodeFilePreviewDataUrl(file: File): Promise<{
  dataUrl: string;
  width: number;
  height: number;
  dpi?: number;
  frameCount?: number;
}> {
  const ext = getFileExtension(file.name);
  if (ext === 'gif') {
    const gif = decodeAnimatedGif(await file.arrayBuffer());
    return {
      dataUrl: rgbaToDataUrl(
        {
          width: gif.width,
          height: gif.height,
          data: gif.frames[0].rgba,
          hasTransparency: gif.hasTransparency,
        },
        512
      ),
      width: gif.width,
      height: gif.height,
      dpi: 72,
      frameCount: gif.frames.length,
    };
  }
  const rgba = await decodeAnyRasterFileToRgba(file);
  return {
    dataUrl: rgbaToDataUrl(rgba, 512),
    width: rgba.width,
    height: rgba.height,
    dpi: rgba.dpi || 72,
    frameCount: 1,
  };
}

// =========================================================================
// SPRITESHEET AUTO-DETECTION & 1:1 GRID SLICING ENGINE
// =========================================================================
export function detectSpritesheetCandidate(
  fileName: string,
  width: number,
  height: number
): SpritesheetCandidateInfo {
  const lower = fileName.toLowerCase();

  // Explicit grid hint in filename, e.g. hero_4x2.png or attack_16x4.png
  const gridHint = lower.match(/(?:^|[_\-\s])(\d{1,3})x(\d{1,3})(?:[_\-\s.]|$)/);
  if (gridHint) {
    const c = parseInt(gridHint[1], 10);
    const r = parseInt(gridHint[2], 10);
    if (c >= 2 && c <= 256 && r >= 1 && r <= 256 && width % c === 0 && height % r === 0) {
      return {
        isCandidate: true,
        suggestedCols: c,
        suggestedRows: r,
        suggestedFrameWidth: Math.floor(width / c),
        suggestedFrameHeight: Math.floor(height / r),
        reason: `Detectada cuadrícula ${c}×${r} en el nombre del archivo`,
      };
    }
  }

  const stripNameKeyword = /(sheet|strip|sprite|atlas|frames|anim|walk|run|idle|attack|jump|combo|cycle|char|fighter|boss)/i.test(
    lower
  );

  // Horizontal square-frame strip (e.g. 256×64 -> 4 frames of 64×64, or 2048×128 -> 16 frames of 128×128)
  if (width >= height * 2 && width % height === 0) {
    const cols = width / height;
    if (cols >= 2 && cols <= 128) {
      return {
        isCandidate: true,
        suggestedCols: cols,
        suggestedRows: 1,
        suggestedFrameWidth: height,
        suggestedFrameHeight: height,
        reason: `Tira horizontal divisible exactamente en ${cols} fotogramas de ${height}×${height} px`,
      };
    }
  }

  // Vertical square-frame strip (e.g. 64×256 -> 4 frames of 64×64)
  if (height >= width * 2 && height % width === 0) {
    const rows = height / width;
    if (rows >= 2 && rows <= 128) {
      return {
        isCandidate: true,
        suggestedCols: 1,
        suggestedRows: rows,
        suggestedFrameWidth: width,
        suggestedFrameHeight: width,
        reason: `Tira vertical divisible exactamente en ${rows} fotogramas de ${width}×${width} px`,
      };
    }
  }

  const commonSizes = [16, 24, 32, 48, 64, 80, 96, 128, 160, 192, 256, 512];

  // Clean grid multiples of classic pixel-art cell sizes when filename suggests spritesheet OR aspect ratio is wide/tall
  if (stripNameKeyword || width / Math.max(1, height) >= 3 || height / Math.max(1, width) >= 3) {
    for (let i = commonSizes.length - 1; i >= 0; i--) {
      const sz = commonSizes[i];
      if (width >= sz * 2 && width % sz === 0 && height % sz === 0) {
        const cols = width / sz;
        const rows = height / sz;
        if (cols * rows >= 2 && cols * rows <= 256) {
          return {
            isCandidate: true,
            suggestedCols: cols,
            suggestedRows: rows,
            suggestedFrameWidth: sz,
            suggestedFrameHeight: sz,
            reason: `Posible spritesheet (${cols}×${rows} celdas de ${sz}×${sz} px)`,
          };
        }
      }
    }
    if (stripNameKeyword && (width >= 48 || height >= 48)) {
      const cols = width >= height ? Math.max(2, Math.min(32, Math.round(width / Math.max(1, height)))) : 1;
      const rows = height > width ? Math.max(2, Math.min(32, Math.round(height / Math.max(1, width)))) : 1;
      return {
        isCandidate: true,
        suggestedCols: cols,
        suggestedRows: rows,
        suggestedFrameWidth: Math.max(1, Math.floor(width / cols)),
        suggestedFrameHeight: Math.max(1, Math.floor(height / rows)),
        reason: 'Nombre y proporción compatibles con hoja de sprites',
      };
    }
  }

  // Non-candidate default suggestion if user manually opens the slicer
  const defaultCols = width >= height * 2 ? Math.max(2, Math.min(32, Math.round(width / Math.max(1, height)))) : 4;
  return {
    isCandidate: false,
    suggestedCols: defaultCols,
    suggestedRows: 1,
    suggestedFrameWidth: Math.max(1, Math.floor(width / defaultCols)),
    suggestedFrameHeight: height,
    reason: '',
  };
}

export interface SpritesheetSliceOptions {
  cols: number;
  rows: number;
  marginX?: number;
  marginY?: number;
  spacingX?: number;
  spacingY?: number;
  skipEmptyFrames?: boolean;
  fps?: number;
  baseName: string;
}

export function sliceRgbaToSpritesheetResult(
  raw: DecodedRgbaImage,
  opts: SpritesheetSliceOptions
): ImportResult {
  const cols = Math.max(1, Math.min(512, Math.floor(opts.cols)));
  const rows = Math.max(1, Math.min(512, Math.floor(opts.rows)));
  const marginX = Math.max(0, Math.floor(opts.marginX || 0));
  const marginY = Math.max(0, Math.floor(opts.marginY || 0));
  const spacingX = Math.max(0, Math.floor(opts.spacingX || 0));
  const spacingY = Math.max(0, Math.floor(opts.spacingY || 0));
  const fps = Math.max(1, Math.min(60, Math.floor(opts.fps || 12)));

  const usableW = Math.max(1, raw.width - marginX * 2 - spacingX * (cols - 1));
  const usableH = Math.max(1, raw.height - marginY * 2 - spacingY * (rows - 1));
  const cellW = Math.max(1, Math.floor(usableW / cols));
  const cellH = Math.max(1, Math.floor(usableH / rows));

  const frameDurationMs = Math.round(1000 / fps);
  const frameTicks = Math.max(1, Math.round((frameDurationMs / 1000) * 60));
  const stamp = Date.now();
  const frames: Frame[] = [];
  const sourceTiledStore = raw.tiledStoreId ? getTiledStore(raw.tiledStoreId) : undefined;
  const cellNeedsTiled = shouldUseTiledStorage(cellW, cellH);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const startX = marginX + c * (cellW + spacingX);
      const startY = marginY + r * (cellH + spacingY);

      if (cellNeedsTiled) {
        const subRgba = sourceTiledStore
          ? sourceTiledStore.sliceRegionToRgba(startX, startY, cellW, cellH)
          : (() => {
              const buf = new Uint8ClampedArray(cellW * cellH * 4);
              for (let y = 0; y < cellH; y++) {
                const sy = startY + y;
                if (sy < 0 || sy >= raw.height) continue;
                const copyLen = Math.max(0, Math.min(cellW, raw.width - startX));
                if (copyLen <= 0) continue;
                const srcOff = (sy * raw.width + startX) * 4;
                buf.set(raw.data.subarray(srcOff, srcOff + copyLen * 4), y * cellW * 4);
              }
              return buf;
            })();

        const cellStore = new TiledLayerStore(cellW, cellH);
        const { nonEmptyCount } = cellStore.loadFromRgbaBuffer(subRgba, cellW, cellH);
        if (opts.skipEmptyFrames && nonEmptyCount === 0) {
          cellStore.dispose();
          continue;
        }
        const tiledStoreId = registerTiledStore(cellStore);
        const idx = frames.length;
        frames.push({
          id: `frame-sheet-${stamp}-${idx}`,
          name: `Fotograma #${idx + 1}`,
          durationTicks: frameTicks,
          durationMs: frameDurationMs,
          phase: 'neutral',
          layers: [
            {
              id: `layer-sheet-${stamp}-${idx}`,
              name: 'Spritesheet',
              visible: true,
              locked: false,
              opacity: 1,
              fillOpacity: 1,
              blendMode: 'normal',
              layerType: 'raster',
              pixels: [],
              tiledStoreId,
              tiledRevision: 1,
            },
          ],
          hitboxes: [],
        });
        continue;
      }

      let grid: (string | null)[][];
      let cellPixels = 0;

      if (sourceTiledStore && raw.data.length === 0) {
        const sliced = sourceTiledStore.sliceRegionToPixelGrid(startX, startY, cellW, cellH);
        grid = sliced.grid;
        cellPixels = sliced.nonEmptyCount;
      } else {
        grid = createEmptyGrid(cellW, cellH);
        for (let y = 0; y < cellH; y++) {
          const sy = startY + y;
          if (sy < 0 || sy >= raw.height) continue;
          for (let x = 0; x < cellW; x++) {
            const sx = startX + x;
            if (sx < 0 || sx >= raw.width) continue;
            const idx = (sy * raw.width + sx) * 4;
            const a = raw.data[idx + 3];
            if (a > 0) {
              grid[y][x] = rgbaToPixelString(raw.data[idx], raw.data[idx + 1], raw.data[idx + 2], a);
              cellPixels++;
            }
          }
        }
      }

      if (opts.skipEmptyFrames && cellPixels === 0) continue;

      const idx = frames.length;
      frames.push({
        id: `frame-sheet-${stamp}-${idx}`,
        name: `Fotograma #${idx + 1}`,
        durationTicks: frameTicks,
        durationMs: frameDurationMs,
        phase: 'neutral',
        layers: [
          {
            id: `layer-sheet-${stamp}-${idx}`,
            name: 'Spritesheet',
            visible: true,
            locked: false,
            opacity: 1,
            fillOpacity: 1,
            blendMode: 'normal',
            layerType: 'raster',
            pixels: grid,
          },
        ],
        hitboxes: [],
      });
    }
  }

  if (frames.length === 0) {
    throw new FileLoadError(
      'Todas las celdas del Spritesheet están vacías con los parámetros actuales.',
      opts.baseName,
      'Spritesheet'
    );
  }

  return validateImportResult(
    {
      name: opts.baseName,
      width: cellW,
      height: cellH,
      dpi: raw.dpi || 72,
      frames,
      fps,
      stats: {
        formatLabel: 'Spritesheet',
        fileFormat: 'spritesheet',
        frameCount: frames.length,
        layerCount: 1,
        nonEmptyPixelCount: 0,
        hasTransparency: raw.hasTransparency,
        isAnimated: frames.length > 1,
        wasDownscaled: false,
        originalWidth: raw.width,
        originalHeight: raw.height,
        dpi: raw.dpi || 72,
        usesTiledEngine: cellNeedsTiled,
      },
    },
    opts.baseName,
    'Spritesheet'
  );
}

// =========================================================================
// PSD / PSB (PHOTOSHOP, KRITA, CLIP STUDIO) COMPATIBILITY & RECOVERY IMPORTER
// =========================================================================
function mapPsdBlendMode(mode?: string): { blendMode: LayerBlendMode; supported: boolean } {
  switch (mode) {
    case undefined:
    case 'normal':
    case 'pass through':
      return { blendMode: 'normal', supported: true };
    case 'multiply':
      return { blendMode: 'multiply', supported: true };
    case 'screen':
      return { blendMode: 'screen', supported: true };
    case 'overlay':
      return { blendMode: 'overlay', supported: true };
    case 'soft light':
      return { blendMode: 'soft-light', supported: true };
    case 'hard light':
      return { blendMode: 'hard-light', supported: true };
    case 'darken':
      return { blendMode: 'darken', supported: true };
    case 'lighten':
      return { blendMode: 'lighten', supported: true };
    case 'color dodge':
    case 'linear dodge':
      return { blendMode: 'color-dodge', supported: true };
    case 'color burn':
    case 'linear burn':
      return { blendMode: 'color-burn', supported: true };
    case 'difference':
      return { blendMode: 'difference', supported: true };
    case 'exclusion':
      return { blendMode: 'exclusion', supported: true };
    case 'hue':
      return { blendMode: 'hue', supported: true };
    case 'saturation':
      return { blendMode: 'saturation', supported: true };
    case 'color':
      return { blendMode: 'color', supported: true };
    case 'luminosity':
      return { blendMode: 'luminosity', supported: true };
    default:
      return { blendMode: 'normal', supported: false };
  }
}

function extractPsdDpi(psd: AgPsd): number {
  const res = psd.imageResources?.resolutionInfo;
  if (res && typeof res.horizontalResolution === 'number' && res.horizontalResolution > 0) {
    const dpi =
      res.horizontalResolutionUnit === 'PPCM'
        ? Math.round(res.horizontalResolution * 2.54)
        : Math.round(res.horizontalResolution);
    if (dpi >= 1 && dpi <= 4800) return dpi;
  }
  return 72;
}

function pixelDataToUint8ClampedRgba(pixelData: AgPsdPixelData): Uint8ClampedArray {
  const src = pixelData.data;
  if (src instanceof Uint8ClampedArray) return src;
  const out = new Uint8ClampedArray(src.length);
  if (src instanceof Uint8Array) {
    out.set(src);
    return out;
  }
  if (src instanceof Uint16Array) {
    for (let i = 0; i < src.length; i++) {
      out[i] = src[i] >> 8;
    }
    return out;
  }
  // Float32Array (32-bit HDR channel)
  for (let i = 0; i < src.length; i++) {
    const v = src[i];
    out[i] = Math.max(0, Math.min(255, Math.round((Number.isFinite(v) ? v : 0) * 255)));
  }
  return out;
}

function extractMaskPlaneFromPsdMask(
  psdMask: AgPsdMaskData,
  canvasWidth: number,
  canvasHeight: number
): Uint8Array | null {
  let maskImageData = psdMask.imageData;
  if (!maskImageData && psdMask.canvas) {
    const ctx = psdMask.canvas.getContext('2d');
    if (ctx) {
      maskImageData = ctx.getImageData(0, 0, psdMask.canvas.width, psdMask.canvas.height);
    }
  }
  if (!maskImageData || maskImageData.width <= 0 || maskImageData.height <= 0) {
    return null;
  }

  const defaultVal = Math.max(0, Math.min(255, psdMask.defaultColor ?? 255));
  const density =
    typeof psdMask.userMaskDensity === 'number'
      ? Math.max(0, Math.min(1, psdMask.userMaskDensity))
      : typeof psdMask.vectorMaskDensity === 'number'
      ? Math.max(0, Math.min(1, psdMask.vectorMaskDensity))
      : 1;

  const applyDensity = (rawVal: number): number => {
    if (density >= 0.999) return rawVal;
    return Math.round(255 * (1 - density) + rawVal * density);
  };

  const plane = new Uint8Array(canvasWidth * canvasHeight);
  plane.fill(applyDensity(defaultVal));

  const srcRgba = pixelDataToUint8ClampedRgba(maskImageData);
  const mw = maskImageData.width;
  const mh = maskImageData.height;
  const offX = psdMask.left || 0;
  const offY = psdMask.top || 0;

  for (let y = 0; y < mh; y++) {
    const destY = offY + y;
    if (destY < 0 || destY >= canvasHeight) continue;
    const rowDst = destY * canvasWidth;
    const rowSrc = y * mw * 4;
    for (let x = 0; x < mw; x++) {
      const destX = offX + x;
      if (destX < 0 || destX >= canvasWidth) continue;
      plane[rowDst + destX] = applyDensity(srcRgba[rowSrc + x * 4]);
    }
  }
  return plane;
}

function buildCombinedPsdMaskPlane(
  child: AgPsdLayer,
  canvasWidth: number,
  canvasHeight: number
): { plane: Uint8Array | null; disabled: boolean; isVectorMask: boolean; hasAdvancedMask: boolean } {
  let hasAdvancedMask = false;
  let isVectorMask = false;
  let combined: Uint8Array | null = null;
  let allDisabled = true;

  const masks: Array<{ data: AgPsdMaskData; fromReal?: boolean }> = [];
  if (child.mask) masks.push({ data: child.mask, fromReal: false });
  if (child.realMask) masks.push({ data: child.realMask, fromReal: true });

  if (child.vectorMask || child.realMask) {
    hasAdvancedMask = true;
  }

  for (const entry of masks) {
    const m = entry.data;
    if (m.fromVectorData || entry.fromReal) {
      isVectorMask = true;
      hasAdvancedMask = true;
    }
    if (
      (typeof m.userMaskFeather === 'number' && m.userMaskFeather > 0) ||
      (typeof m.vectorMaskFeather === 'number' && m.vectorMaskFeather > 0)
    ) {
      hasAdvancedMask = true;
    }
    const plane = extractMaskPlaneFromPsdMask(m, canvasWidth, canvasHeight);
    if (!plane) continue;
    if (!m.disabled) allDisabled = false;
    if (!combined) {
      combined = plane;
    } else if (!m.disabled) {
      for (let i = 0; i < combined.length; i++) {
        combined[i] = Math.round((combined[i] * plane[i]) / 255);
      }
    }
  }

  return {
    plane: combined,
    disabled: allDisabled,
    isVectorMask,
    hasAdvancedMask: hasAdvancedMask || Boolean(child.mask),
  };
}

function maskPlaneToLayerMask(
  plane: Uint8Array,
  width: number,
  height: number,
  disabled: boolean,
  isVectorMask: boolean
): LayerMask {
  const pixels: number[][] = Array.from({ length: height }, (_, y) => {
    const row = new Array<number>(width);
    const rowOff = y * width;
    for (let x = 0; x < width; x++) {
      row[x] = plane[rowOff + x];
    }
    return row;
  });
  return {
    type: isVectorMask ? 'vector' : 'layer',
    pixels,
    disabled,
    inverted: false,
    linked: true,
  };
}

function buildCanvasRgbaBufferFromPsdLayer(
  child: AgPsdLayer,
  canvasWidth: number,
  canvasHeight: number
): { rgba: Uint8ClampedArray; hasPixels: boolean; hasTransparency: boolean } | null {
  let pixelData: AgPsdPixelData | undefined = child.imageData;
  if (!pixelData && child.canvas) {
    const ctx = child.canvas.getContext('2d');
    if (ctx && child.canvas.width > 0 && child.canvas.height > 0) {
      pixelData = ctx.getImageData(0, 0, child.canvas.width, child.canvas.height);
    }
  }
  if (!pixelData || pixelData.width <= 0 || pixelData.height <= 0) {
    return null;
  }

  const srcRgba = pixelDataToUint8ClampedRgba(pixelData);
  const w = pixelData.width;
  const h = pixelData.height;
  const offsetX = child.left || 0;
  const offsetY = child.top || 0;
  const out = new Uint8ClampedArray(canvasWidth * canvasHeight * 4);
  let hasPixels = false;
  let hasTransparency = false;

  for (let y = 0; y < h; y++) {
    const destY = offsetY + y;
    if (destY < 0 || destY >= canvasHeight) continue;
    const dstRow = destY * canvasWidth * 4;
    const srcRow = y * w * 4;
    for (let x = 0; x < w; x++) {
      const destX = offsetX + x;
      if (destX < 0 || destX >= canvasWidth) continue;
      const srcIdx = srcRow + x * 4;
      const a = srcRgba[srcIdx + 3];
      if (a > 0) {
        hasPixels = true;
        if (a < 254) hasTransparency = true;
        const dstIdx = dstRow + destX * 4;
        out[dstIdx] = srcRgba[srcIdx];
        out[dstIdx + 1] = srcRgba[srcIdx + 1];
        out[dstIdx + 2] = srcRgba[srcIdx + 2];
        out[dstIdx + 3] = a;
      } else {
        hasTransparency = true;
      }
    }
  }

  return { rgba: out, hasPixels, hasTransparency };
}

function mapPsdAdjustmentToConfig(
  adj: AgPsdLayer['adjustment']
): { config?: LayerAdjustmentConfig; label: string; compatible: boolean } {
  if (!adj) return { label: '', compatible: true };
  const base: LayerAdjustmentConfig = {
    hue: 0,
    saturation: 0,
    brightness: 0,
    contrast: 0,
    posterize: 0,
    invert: false,
    grayscale: false,
    sepia: false,
    tintColor: '#ffffff',
    tintAmount: 0,
  };
  switch (adj.type) {
    case 'hue/saturation':
      return {
        config: {
          ...base,
          hue: Math.max(-180, Math.min(180, Math.round(adj.master?.hue || 0))),
          saturation: Math.max(-100, Math.min(100, Math.round(adj.master?.saturation || 0))),
          brightness: Math.max(-100, Math.min(100, Math.round(adj.master?.lightness || 0))),
        },
        label: 'Tono/Saturación',
        compatible: true,
      };
    case 'brightness/contrast':
      return {
        config: {
          ...base,
          brightness: Math.max(-100, Math.min(100, Math.round(adj.brightness || 0))),
          contrast: Math.max(-100, Math.min(100, Math.round(adj.contrast || 0))),
        },
        label: 'Brillo/Contraste',
        compatible: true,
      };
    case 'invert':
      return {
        config: { ...base, invert: true },
        label: 'Invertir',
        compatible: true,
      };
    case 'posterize':
      return {
        config: { ...base, posterize: Math.max(2, Math.min(16, Math.round(adj.levels || 4))) },
        label: 'Posterizar',
        compatible: true,
      };
    case 'black & white':
      return {
        config: { ...base, grayscale: true },
        label: 'Blanco y Negro',
        compatible: true,
      };
    default:
      return {
        label: String(adj.type || 'Ajuste Photoshop'),
        compatible: false,
      };
  }
}

function compositeRgbaOver(dst: Uint8ClampedArray, src: Uint8ClampedArray, opacity: number): void {
  const len = Math.min(dst.length, src.length);
  for (let i = 0; i < len; i += 4) {
    const sa = (src[i + 3] / 255) * opacity;
    if (sa <= 0.001) continue;
    const da = dst[i + 3] / 255;
    const outA = sa + da * (1 - sa);
    if (outA <= 0.001) continue;
    dst[i] = Math.round((src[i] * sa + dst[i] * da * (1 - sa)) / outA);
    dst[i + 1] = Math.round((src[i + 1] * sa + dst[i + 1] * da * (1 - sa)) / outA);
    dst[i + 2] = Math.round((src[i + 2] * sa + dst[i + 2] * da * (1 - sa)) / outA);
    dst[i + 3] = Math.round(outA * 255);
  }
}

function formatPsdReadError(
  err: unknown,
  file: File,
  header: PsdHeaderInspection
): FileLoadError {
  const rawMsg = err instanceof Error ? err.message : String(err || 'Error desconocido al analizar PSD');
  const lower = rawMsg.toLowerCase();

  let code = 'PSD_IMPORT_109';
  let userMsg = `No se pudo decodificar la estructura interna del archivo PSD (${rawMsg}).`;
  let incompatibleElement = 'Estructura binaria PSD';

  if (lower.includes('invalid signature') || lower.includes('not a psd')) {
    code = 'PSD_IMPORT_101';
    userMsg = 'Cabecera o sección interna PSD corrupta (firma binaria "8BPS"/"8BIM" inválida).';
    incompatibleElement = 'Cabecera o firma de bloque PSD';
  } else if (lower.includes('color mode') || lower.includes('channel')) {
    code = 'PSD_IMPORT_103';
    userMsg = `Modo de color o canal no compatible directamente (${header.colorModeLabel}, ${header.bitsPerChannel} bits).`;
    incompatibleElement = `Modo de color ${header.colorModeLabel} (${header.bitsPerChannel} bits)`;
  } else if (lower.includes('bit') || lower.includes('compression') || lower.includes('zip') || lower.includes('rle')) {
    code = 'PSD_IMPORT_103';
    userMsg = `Compresión de capa o profundidad de bits no compatible (${rawMsg}).`;
    incompatibleElement = `Compresión / ${header.bitsPerChannel}-bit por canal`;
  } else if (lower.includes('memory') || lower.includes('limit') || lower.includes('size') || lower.includes('bounds')) {
    code = 'PSD_IMPORT_104';
    userMsg = `El tamaño de capa o consumo de memoria del PSD excede el límite seguro (${rawMsg}).`;
    incompatibleElement = `${header.width}×${header.height} px / Límites de capa`;
  } else if (lower.includes('end of file') || lower.includes('offset is outside') || lower.includes('rangeerror')) {
    code = 'PSD_IMPORT_101';
    userMsg = 'El archivo PSD está truncado o incompleto (se alcanzó el final antes de terminar de leer las capas).';
    incompatibleElement = 'Flujo binario incompleto (EOF inesperado)';
  } else if (lower.includes('layer') || lower.includes('mask') || lower.includes('resource')) {
    code = 'PSD_IMPORT_102';
    userMsg = `Elemento de capa o recurso incompatible dentro del PSD (${rawMsg}).`;
    incompatibleElement = 'Metadatos de capa / recursos Photoshop';
  }

  return new FileLoadError(userMsg, file.name, 'Photoshop (.PSD)', err instanceof Error ? err.stack || rawMsg : rawMsg, {
    errorCode: code,
    moduleName: 'PSD Importer',
    fileSizeBytes: file.size,
    psdVersion: header.psdVersionLabel,
    incompatibleElement,
    canOfferPsdRecovery: header.isPsdSignature,
  });
}

export async function importPsd(
  file: File,
  options?: { recoveryMode?: PsdRecoveryMode }
): Promise<ImportResult> {
  const recoveryMode: PsdRecoveryMode = options?.recoveryMode || 'normal';
  const buffer = await file.arrayBuffer();
  const header = inspectPsdHeader(buffer);

  if (!header.isPsdSignature || !header.headerValid) {
    throw new FileLoadError(
      header.headerError || 'El archivo no tiene una cabecera PSD/PSB ("8BPS") válida.',
      file.name,
      'Photoshop (.PSD)',
      `Signature=${header.signatureText} Version=${header.versionNumber} Size=${header.width}x${header.height} Depth=${header.bitsPerChannel} ColorMode=${header.colorModeLabel}`,
      {
        errorCode: 'PSD_IMPORT_101',
        moduleName: 'PSD Importer',
        fileSizeBytes: file.size,
        psdVersion: header.psdVersionLabel,
        incompatibleElement: header.headerError || 'Cabecera PSD inválida',
        canOfferPsdRecovery: false,
      }
    );
  }

  const readPasses: AgPsdReadOptions[] =
    recoveryMode === 'merged_composite'
      ? [
          {
            useImageData: true,
            skipLayerImageData: true,
            skipThumbnail: true,
            skipLinkedFilesData: true,
          },
          {
            useImageData: true,
            useRawData: true,
            skipCompositeImageData: true,
            skipThumbnail: true,
            skipLinkedFilesData: true,
            imageResourcesWhitelist: ['resolutionInfo', 'alphaChannelNames', 'transparencyIndex'],
          },
        ]
      : [
          {
            useImageData: true,
            useRawData: true,
            skipCompositeImageData: false,
            skipThumbnail: true,
            skipLinkedFilesData: true,
          },
          {
            useImageData: true,
            useRawData: true,
            skipCompositeImageData: false,
            skipThumbnail: true,
            skipLinkedFilesData: true,
            imageResourcesWhitelist: ['resolutionInfo', 'alphaChannelNames', 'transparencyIndex'],
          },
          {
            useImageData: true,
            useRawData: true,
            skipCompositeImageData: true,
            skipThumbnail: true,
            skipLinkedFilesData: true,
            imageResourcesWhitelist: [],
          },
        ];

  let psd: AgPsd | null = null;
  let lastParseError: unknown = null;
  let strippedResourcesFallback = false;

  for (let passIdx = 0; passIdx < readPasses.length; passIdx++) {
    try {
      psd = readPsd(buffer, readPasses[passIdx]);
      if (passIdx > 0 && recoveryMode !== 'merged_composite') {
        strippedResourcesFallback = true;
      }
      break;
    } catch (err) {
      lastParseError = err;
    }
  }

  if (!psd) {
    throw formatPsdReadError(lastParseError, file, header);
  }

  const width = psd.width || header.width;
  const height = psd.height || header.height;
  if (!width || !height || width <= 0 || height <= 0) {
    throw new FileLoadError(
      'El archivo PSD no contiene dimensiones válidas.',
      file.name,
      'Photoshop (.PSD)',
      `Parsed dimensions: ${width}x${height}`,
      {
        errorCode: 'PSD_IMPORT_101',
        moduleName: 'PSD Importer',
        fileSizeBytes: file.size,
        psdVersion: header.psdVersionLabel,
        incompatibleElement: 'Dimensiones 0×0',
        canOfferPsdRecovery: false,
      }
    );
  }

  const dpi = extractPsdDpi(psd);
  const sourceSoftware = detectPsdSourceSoftware(psd.imageResources);
  const useTiled = shouldUseTiledStorage(width, height);
  const stamp = Date.now();
  const baseDocName = file.name.replace(/\.[^/.]+$/, '');

  // Helper to convert raw RGBA + optional mask plane into a PixelClash Layer
  const makeRasterLayerFromBuffer = (
    id: string,
    name: string,
    rgba: Uint8ClampedArray,
    opts: {
      visible: boolean;
      locked: boolean;
      opacity: number;
      blendMode: LayerBlendMode;
      groupId?: string | null;
      clippingMask?: boolean;
      layerType?: Layer['layerType'];
      smartSourceName?: string;
      maskInfo?: ReturnType<typeof buildCombinedPsdMaskPlane>;
    }
  ): Layer => {
    if (useTiled) {
      const store = new TiledLayerStore(width, height);
      const bufferToLoad = new Uint8ClampedArray(rgba);
      if (opts.maskInfo?.plane && !opts.maskInfo.disabled) {
        const mPlane = opts.maskInfo.plane;
        for (let p = 0; p < mPlane.length; p++) {
          bufferToLoad[p * 4 + 3] = Math.round((bufferToLoad[p * 4 + 3] * mPlane[p]) / 255);
        }
      }
      store.loadFromRgbaBuffer(bufferToLoad, width, height);
      const tiledStoreId = registerTiledStore(store);
      return {
        id,
        name,
        visible: opts.visible,
        locked: opts.locked,
        opacity: opts.opacity,
        fillOpacity: 1,
        blendMode: opts.blendMode,
        clippingMask: opts.clippingMask,
        layerType: opts.layerType || 'raster',
        smartSourceName: opts.smartSourceName,
        groupId: opts.groupId ?? null,
        pixels: [],
        tiledStoreId,
        tiledRevision: 1,
      };
    }

    const { grid } = rgbaBufferToPixelGrid(rgba, width, height);
    const layerMask =
      opts.maskInfo?.plane
        ? maskPlaneToLayerMask(
            opts.maskInfo.plane,
            width,
            height,
            opts.maskInfo.disabled,
            opts.maskInfo.isVectorMask
          )
        : null;

    return {
      id,
      name,
      visible: opts.visible,
      locked: opts.locked,
      opacity: opts.opacity,
      fillOpacity: 1,
      blendMode: opts.blendMode,
      clippingMask: opts.clippingMask,
      mask: layerMask,
      layerType: opts.layerType || 'raster',
      smartSourceName: opts.smartSourceName,
      groupId: opts.groupId ?? null,
      pixels: grid,
    };
  };

  // Compatibility telemetry counters
  let totalSourceLayers = 0;
  let importedLayers = 0;
  let importedGroups = 0;
  let skippedLayers = 0;
  let rasterizedLayers = 0;
  let hasAnyTransparency = false;
  let hasAdvancedMasks = false;
  let smartObjectsFound = 0;
  let smartObjectsRasterized = 0;
  let adjustmentsCompatible = 0;
  let adjustmentsUnsupported = 0;
  let textLayersFound = 0;
  let effectsLayersFound = 0;
  let failedLayerDecodes = 0;
  let firstIncompatibleElement: string | undefined;
  const unsupportedBlendModes = new Set<string>();
  const extraNotes: string[] = [];

  if (strippedResourcesFallback) {
    extraNotes.push('Metadatos auxiliares (ICC/XMP) omitidos para evitar errores de análisis.');
  }

  // =========================================================================
  // RECOVERY MODE: MERGED COMPOSITE ("Abrir imagen fusionada")
  // =========================================================================
  if (recoveryMode === 'merged_composite') {
    let compositeRgba: Uint8ClampedArray | null = null;

    let compImageData = psd.imageData;
    if (!compImageData && psd.rawCompositeData && psd.rawCompositeDataInfo) {
      try {
        compImageData = getCompositeImageData(psd);
      } catch {
        compImageData = undefined;
      }
    }
    if (compImageData && compImageData.width > 0 && compImageData.height > 0) {
      const converted = pixelDataToUint8ClampedRgba(compImageData);
      if (compImageData.width === width && compImageData.height === height) {
        compositeRgba = converted;
      }
    }

    // Fallback: flatten decodable visible layers if PSD was saved without composite image
    if (!compositeRgba && psd.children && psd.children.length > 0) {
      const flat = new Uint8ClampedArray(width * height * 4);
      const flattenChildren = (list: AgPsdLayer[]) => {
        for (const child of list) {
          if (child.hidden) continue;
          if (child.children) {
            flattenChildren(child.children);
            continue;
          }
          totalSourceLayers++;
          try {
            if (child.rawData) decodeLayerPixels(child, true);
            const built = buildCanvasRgbaBufferFromPsdLayer(child, width, height);
            if (built) {
              const maskInfo = buildCombinedPsdMaskPlane(child, width, height);
              if (maskInfo.plane && !maskInfo.disabled) {
                for (let p = 0; p < maskInfo.plane.length; p++) {
                  built.rgba[p * 4 + 3] = Math.round((built.rgba[p * 4 + 3] * maskInfo.plane[p]) / 255);
                }
              }
              compositeRgbaOver(flat, built.rgba, child.opacity ?? 1);
            }
          } catch {
            skippedLayers++;
          }
        }
      };
      flattenChildren(psd.children);
      compositeRgba = flat;
    }

    if (!compositeRgba) {
      throw new FileLoadError(
        'El archivo PSD no incluye una vista previa compuesta válida y ninguna capa pudo acoplarse.',
        file.name,
        'Photoshop (.PSD)',
        undefined,
        {
          errorCode: 'PSD_IMPORT_105',
          moduleName: 'PSD Importer',
          fileSizeBytes: file.size,
          psdVersion: header.psdVersionLabel,
          incompatibleElement: 'Sin imagen compuesta ni capas válidas',
          canOfferPsdRecovery: true,
        }
      );
    }

    const mergedLayer = makeRasterLayerFromBuffer(
      `layer-psd-merged-${stamp}`,
      'Imagen Fusionada (PSD)',
      compositeRgba,
      {
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'normal',
      }
    );

    const report: PsdCompatibilityReport = {
      fileName: file.name,
      sourceSoftware,
      psdVersion: header.psdVersionLabel,
      colorModeLabel: header.colorModeLabel,
      bitsPerChannel: header.bitsPerChannel,
      width,
      height,
      dpi,
      totalSourceLayers: Math.max(1, totalSourceLayers),
      importedLayers: 1,
      importedGroups: 0,
      skippedLayers,
      rasterizedLayers: 1,
      recoveryModeUsed: 'merged_composite',
      hasWarnings: true,
      items: [
        { key: 'layers', label: 'Capas', status: 'partial', detail: 'Acopladas en imagen fusionada' },
        { key: 'groups', label: 'Grupos', status: 'partial', detail: 'Aplanados en modo recuperación' },
        { key: 'transparency', label: 'Transparencia', status: 'compatible', detail: 'Preservada' },
        { key: 'masks', label: 'Máscaras avanzadas', status: 'partial', detail: 'Aplicadas al compuesto' },
        { key: 'smart_objects', label: 'Objetos inteligentes', status: 'partial', detail: 'Rasterizados en vista fusionada' },
        { key: 'adjustments', label: 'Ajustes Photoshop', status: 'partial', detail: 'Horneados en vista fusionada' },
      ],
      notes: ['Abierto mediante modo de recuperación: Imagen Fusionada.'],
    };

    return validateImportResult(
      {
        name: baseDocName,
        width,
        height,
        dpi,
        layerGroups: [],
        frames: [
          {
            id: `frame-psd-${stamp}`,
            name: 'Fotograma #1',
            durationTicks: 4,
            phase: 'neutral',
            layers: [mergedLayer],
            hitboxes: [],
          },
        ],
        psdCompatibilityReport: report,
        usedRecoveryMode: 'merged_composite',
        stats: {
          formatLabel: `${header.isPsb ? 'PSB' : 'PSD'} Fusionado`,
          fileFormat: 'psd',
          frameCount: 1,
          layerCount: 1,
          nonEmptyPixelCount: 0,
          hasTransparency: true,
          isAnimated: false,
          originalWidth: width,
          originalHeight: height,
          dpi,
          usesTiledEngine: useTiled,
        },
      },
      file.name,
      header.isPsb ? 'PSB Fusionado' : 'PSD Fusionado'
    );
  }

  // =========================================================================
  // FRAME FOLDERS ANIMATION DETECTION ([Frame #N])
  // =========================================================================
  const hasFrameFolders =
    psd.children &&
    psd.children.length > 0 &&
    psd.children.some(
      (c) => Array.isArray(c.children) && c.children.length > 0 && /^\[Frame #\d+\]/i.test(c.name || '')
    );

  const decodeSinglePsdChild = (
    child: AgPsdLayer,
    idxSeed: number,
    parentGroupId: string | null
  ): Layer | null => {
    totalSourceLayers++;

    if (recoveryMode === 'visible_only' && child.hidden) {
      skippedLayers++;
      return null;
    }

    const isSmart = Boolean(child.placedLayer);
    const isText = Boolean(child.text);
    const isVector = Boolean(child.vectorMask || child.vectorFill || child.vectorStroke);
    const isAdjustment = Boolean(child.adjustment);
    const hasEffects = Boolean(child.effects && !child.effects.disabled);

    if (isSmart) smartObjectsFound++;
    if (isText) textLayersFound++;
    if (hasEffects) effectsLayersFound++;

    const blendMapped = mapPsdBlendMode(child.blendMode);
    if (!blendMapped.supported && child.blendMode) {
      unsupportedBlendModes.add(child.blendMode);
    }

    // Adjustment layer handling
    if (isAdjustment && child.adjustment) {
      const adjInfo = mapPsdAdjustmentToConfig(child.adjustment);
      if (adjInfo.compatible && adjInfo.config && recoveryMode !== 'rasterize_incompatible') {
        adjustmentsCompatible++;
        // Check if mask is present on the adjustment layer
        try {
          if (child.rawData) decodeLayerPixels(child, true);
        } catch {
          // Adjustment mask failed, still try base adjustment
        }
        const maskInfo = buildCombinedPsdMaskPlane(child, width, height);
        if (maskInfo.hasAdvancedMask) hasAdvancedMasks = true;
        const maskObj =
          maskInfo.plane && !useTiled
            ? maskPlaneToLayerMask(
                maskInfo.plane,
                width,
                height,
                maskInfo.disabled,
                maskInfo.isVectorMask
              )
            : null;
        importedLayers++;
        return {
          id: `layer-psd-adj-${stamp}-${idxSeed}-${Math.random().toString(36).slice(2, 6)}`,
          name: child.name || `Ajuste (${adjInfo.label})`,
          visible: !child.hidden,
          locked: Boolean(child.transparencyProtected),
          opacity: child.opacity !== undefined ? child.opacity : 1,
          fillOpacity: child.fillOpacity !== undefined ? child.fillOpacity : 1,
          blendMode: blendMapped.blendMode,
          clippingMask: Boolean(child.clipping),
          mask: maskObj,
          layerType: 'adjustment',
          adjustment: adjInfo.config,
          groupId: parentGroupId,
          pixels: createEmptyGrid(width, height),
        };
      }

      // Unsupported Photoshop adjustment or rasterize_incompatible requested
      adjustmentsUnsupported++;
      firstIncompatibleElement = firstIncompatibleElement || `Capa de ajuste "${adjInfo.label}"`;
      if (recoveryMode === 'ignore_incompatible') {
        skippedLayers++;
        return null;
      }
      // Try decoding cached pixels if Photoshop/Krita embedded them
      try {
        if (child.rawData) decodeLayerPixels(child, true);
        const built = buildCanvasRgbaBufferFromPsdLayer(child, width, height);
        if (built && built.hasPixels) {
          rasterizedLayers++;
          importedLayers++;
          if (built.hasTransparency) hasAnyTransparency = true;
          const maskInfo = buildCombinedPsdMaskPlane(child, width, height);
          if (maskInfo.hasAdvancedMask) hasAdvancedMasks = true;
          return makeRasterLayerFromBuffer(
            `layer-psd-adjr-${stamp}-${idxSeed}-${Math.random().toString(36).slice(2, 6)}`,
            `${child.name || adjInfo.label} (Rasterizado)`,
            built.rgba,
            {
              visible: !child.hidden,
              locked: Boolean(child.transparencyProtected),
              opacity: child.opacity !== undefined ? child.opacity : 1,
              blendMode: blendMapped.blendMode,
              groupId: parentGroupId,
              clippingMask: Boolean(child.clipping),
              layerType: 'raster',
              maskInfo,
            }
          );
        }
      } catch {
        // Ignore adjustment decode failure
      }
      skippedLayers++;
      return null;
    }

    // Decode raster channels (normal raster, smart object cached bitmap, text cached bitmap, vector cached bitmap)
    try {
      if (child.rawData) {
        decodeLayerPixels(child, true);
      }
    } catch (decodeErr: unknown) {
      failedLayerDecodes++;
      const msg = decodeErr instanceof Error ? decodeErr.message : String(decodeErr);
      firstIncompatibleElement =
        firstIncompatibleElement || `Capa "${child.name || 'Sin nombre'}" (${msg})`;

      if (recoveryMode === 'ignore_incompatible' || recoveryMode === 'rasterize_incompatible' || recoveryMode === 'normal') {
        skippedLayers++;
        extraNotes.push(`Se omitió la capa "${child.name || `Capa ${idxSeed + 1}`}" por error de decodificación (${msg}).`);
        return null;
      }
    }

    const maskInfo = buildCombinedPsdMaskPlane(child, width, height);
    if (maskInfo.hasAdvancedMask) {
      hasAdvancedMasks = true;
    }

    const built = buildCanvasRgbaBufferFromPsdLayer(child, width, height);
    if (!built) {
      // Empty raster / vector-without-cache / smart-without-cache
      if (isSmart || isVector || isText) {
        firstIncompatibleElement =
          firstIncompatibleElement ||
          `${isSmart ? 'Objeto inteligente' : isText ? 'Capa de texto' : 'Capa vectorial'} "${child.name || 'Sin nombre'}" sin caché ráster`;
      }
      skippedLayers++;
      return null;
    }

    if (built.hasTransparency) hasAnyTransparency = true;
    if (isSmart) {
      smartObjectsRasterized++;
      rasterizedLayers++;
    } else if (isText || isVector) {
      rasterizedLayers++;
    }

    importedLayers++;
    const resolvedLayerType: Layer['layerType'] =
      recoveryMode === 'rasterize_incompatible'
        ? 'raster'
        : isSmart
        ? 'smart'
        : 'raster';

    return makeRasterLayerFromBuffer(
      `layer-psd-${stamp}-${idxSeed}-${Math.random().toString(36).slice(2, 7)}`,
      child.name || 'Capa PSD',
      built.rgba,
      {
        visible: !child.hidden,
        locked: Boolean(child.transparencyProtected),
        opacity: child.opacity !== undefined ? child.opacity : 1,
        blendMode: blendMapped.blendMode,
        groupId: parentGroupId,
        clippingMask: Boolean(child.clipping),
        layerType: resolvedLayerType,
        smartSourceName: isSmart ? child.name || 'Smart Object PSD' : undefined,
        maskInfo,
      }
    );
  };

  if (hasFrameFolders && psd.children) {
    const importedFrames: Frame[] = [];
    psd.children.forEach((folder, fIdx) => {
      if (!folder.children || folder.children.length === 0) return;
      if (recoveryMode === 'visible_only' && folder.hidden) return;
      const frameLayers: Layer[] = [];
      folder.children.forEach((child, cIdx) => {
        const layer = decodeSinglePsdChild(child, fIdx * 1000 + cIdx, null);
        if (layer) frameLayers.push(layer);
      });
      if (frameLayers.length > 0) {
        const cleanName = (folder.name || `Frame ${fIdx + 1}`).replace(/^\[Frame #\d+\]\s*/i, '');
        importedFrames.push({
          id: `frame-psd-${stamp}-${fIdx}`,
          name: cleanName || `Fotograma ${fIdx + 1}`,
          durationTicks: 4,
          phase: 'neutral',
          layers: frameLayers,
          hitboxes: [],
        });
      }
    });

    if (importedFrames.length > 0) {
      const report = buildPsdCompatibilityReport({
        fileName: file.name,
        sourceSoftware,
        header,
        width,
        height,
        dpi,
        totalSourceLayers,
        importedLayers,
        importedGroups: 0,
        skippedLayers,
        rasterizedLayers,
        hasAnyTransparency,
        hasAdvancedMasks,
        smartObjectsFound,
        smartObjectsRasterized,
        adjustmentsCompatible,
        adjustmentsUnsupported,
        textLayersFound,
        effectsLayersFound,
        unsupportedBlendModes: Array.from(unsupportedBlendModes),
        recoveryMode,
        notes: extraNotes,
      });

      return validateImportResult(
        {
          name: baseDocName,
          width,
          height,
          dpi,
          frames: importedFrames,
          psdCompatibilityReport: report,
          usedRecoveryMode: recoveryMode,
          stats: {
            formatLabel: `${header.isPsb ? 'PSB' : 'Photoshop'} (.PSD)`,
            fileFormat: 'psd',
            frameCount: importedFrames.length,
            layerCount: importedFrames[0].layers.length,
            nonEmptyPixelCount: 0,
            hasTransparency: true,
            isAnimated: importedFrames.length > 1,
            originalWidth: width,
            originalHeight: height,
            dpi,
            usesTiledEngine: useTiled,
          },
        },
        file.name,
        header.isPsb ? 'Photoshop (.PSB)' : 'Photoshop (.PSD)'
      );
    }
  }

  const layers: Layer[] = [];
  const layerGroups: LayerGroup[] = [];
  const groupColors = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ec4899'];
  let layerSeq = 0;

  const collectPsdLayers = (children: AgPsdLayer[] | undefined, parentGroupId: string | null = null) => {
    if (!children) return;
    for (const child of children) {
      if (child.children !== undefined) {
        if (recoveryMode === 'visible_only' && child.hidden) {
          skippedLayers++;
          continue;
        }
        const grpId = `group-psd-${layerGroups.length}-${stamp}`;
        const grpBlend = mapPsdBlendMode(child.blendMode);
        if (!grpBlend.supported && child.blendMode) {
          unsupportedBlendModes.add(child.blendMode);
        }
        importedGroups++;
        layerGroups.push({
          id: grpId,
          name: child.name || `Grupo PSD ${layerGroups.length + 1}`,
          color: groupColors[layerGroups.length % groupColors.length],
          frameIndices: [0],
          collapsed: child.opened === false,
          visible: !child.hidden,
          locked: Boolean(child.transparencyProtected),
          opacity: child.opacity !== undefined ? child.opacity : 1,
          blendMode: grpBlend.blendMode,
          parentGroupId,
        });
        collectPsdLayers(child.children, grpId);
      } else {
        const layer = decodeSinglePsdChild(child, layerSeq++, parentGroupId);
        if (layer) {
          layers.push(layer);
        }
      }
    }
  };

  collectPsdLayers(psd.children);

  // Fallback to merged composite image if no individual layers were usable
  if (layers.length === 0) {
    let compImageData = psd.imageData;
    if (!compImageData && psd.rawCompositeData && psd.rawCompositeDataInfo) {
      try {
        compImageData = getCompositeImageData(psd);
      } catch {
        compImageData = undefined;
      }
    }
    if (compImageData && compImageData.width === width && compImageData.height === height) {
      const compRgba = pixelDataToUint8ClampedRgba(compImageData);
      layers.push(
        makeRasterLayerFromBuffer(`layer-psd-comp-${stamp}`, 'Imagen Compuesta (PSD)', compRgba, {
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'normal',
        })
      );
      importedLayers = 1;
      extraNotes.push('No se detectaron capas individuales con contenido; se cargó la vista compuesta del PSD.');
    }
  }

  if (layers.length === 0) {
    throw new FileLoadError(
      failedLayerDecodes > 0
        ? `No se pudo decodificar ninguna capa del PSD (${failedLayerDecodes} capa(s) con error de compresión o formato).`
        : 'El archivo PSD no contiene capas con píxeles ni imagen compuesta decodificable.',
      file.name,
      'Photoshop (.PSD)',
      firstIncompatibleElement,
      {
        errorCode: failedLayerDecodes > 0 ? 'PSD_IMPORT_102' : 'PSD_IMPORT_105',
        moduleName: 'PSD Importer',
        fileSizeBytes: file.size,
        psdVersion: header.psdVersionLabel,
        incompatibleElement: firstIncompatibleElement || 'Sin capas ráster decodificables',
        canOfferPsdRecovery: true,
      }
    );
  }

  const report = buildPsdCompatibilityReport({
    fileName: file.name,
    sourceSoftware,
    header,
    width,
    height,
    dpi,
    totalSourceLayers: Math.max(totalSourceLayers, importedLayers),
    importedLayers,
    importedGroups,
    skippedLayers,
    rasterizedLayers,
    hasAnyTransparency,
    hasAdvancedMasks,
    smartObjectsFound,
    smartObjectsRasterized,
    adjustmentsCompatible,
    adjustmentsUnsupported,
    textLayersFound,
    effectsLayersFound,
    unsupportedBlendModes: Array.from(unsupportedBlendModes),
    recoveryMode,
    notes: extraNotes,
  });

  return validateImportResult(
    {
      name: baseDocName,
      width,
      height,
      dpi,
      layerGroups,
      frames: [
        {
          id: `frame-psd-${stamp}`,
          name: 'Fotograma #1',
          durationTicks: 4,
          phase: 'neutral',
          layers,
          hitboxes: [],
        },
      ],
      psdCompatibilityReport: report,
      usedRecoveryMode: recoveryMode,
      stats: {
        formatLabel: header.isPsb ? 'Photoshop (.PSB)' : 'Photoshop (.PSD)',
        fileFormat: 'psd',
        frameCount: 1,
        layerCount: layers.length,
        nonEmptyPixelCount: 0,
        hasTransparency: hasAnyTransparency || true,
        isAnimated: false,
        originalWidth: width,
        originalHeight: height,
        dpi,
        usesTiledEngine: useTiled,
      },
    },
    file.name,
    header.isPsb ? 'Photoshop (.PSB)' : 'Photoshop (.PSD)'
  );
}

function buildPsdCompatibilityReport(input: {
  fileName: string;
  sourceSoftware: string;
  header: PsdHeaderInspection;
  width: number;
  height: number;
  dpi: number;
  totalSourceLayers: number;
  importedLayers: number;
  importedGroups: number;
  skippedLayers: number;
  rasterizedLayers: number;
  hasAnyTransparency: boolean;
  hasAdvancedMasks: boolean;
  smartObjectsFound: number;
  smartObjectsRasterized: number;
  adjustmentsCompatible: number;
  adjustmentsUnsupported: number;
  textLayersFound: number;
  effectsLayersFound: number;
  unsupportedBlendModes: string[];
  recoveryMode: PsdRecoveryMode;
  notes: string[];
}): PsdCompatibilityReport {
  const items: PsdCompatibilityCheckItem[] = [
    {
      key: 'layers',
      label: 'Capas',
      status: input.skippedLayers > 0 ? 'partial' : 'compatible',
      detail:
        input.skippedLayers > 0
          ? `${input.importedLayers} importadas, ${input.skippedLayers} omitidas`
          : `${input.importedLayers} capa(s) importadas 1:1`,
    },
    {
      key: 'groups',
      label: 'Grupos',
      status: 'compatible',
      detail:
        input.importedGroups > 0
          ? `${input.importedGroups} carpeta(s) / grupo(s) preservados`
          : 'Sin carpetas de grupo',
    },
    {
      key: 'transparency',
      label: 'Transparencia',
      status: 'compatible',
      detail: input.hasAnyTransparency ? 'Canal alfa RGBA intacto (sin pérdida premultiplicada)' : 'Opacidad 100% preservada',
    },
    {
      key: 'masks',
      label: 'Máscaras avanzadas',
      status: input.hasAdvancedMasks ? 'warning' : 'compatible',
      detail: input.hasAdvancedMasks
        ? 'Máscaras ráster importadas (pluma/vector complejo convertido)'
        : 'Compatible',
    },
    {
      key: 'smart_objects',
      label: 'Objetos inteligentes',
      status: input.smartObjectsFound > 0 ? 'warning' : 'compatible',
      detail:
        input.smartObjectsFound > 0
          ? `${input.smartObjectsRasterized}/${input.smartObjectsFound} rasterizados desde caché PSD`
          : 'Sin objetos inteligentes',
    },
    {
      key: 'adjustments',
      label: 'Ajustes Photoshop',
      status:
        input.adjustmentsUnsupported > 0
          ? 'warning'
          : input.adjustmentsCompatible > 0
          ? 'partial'
          : 'compatible',
      detail:
        input.adjustmentsUnsupported > 0
          ? `${input.adjustmentsCompatible} nativo(s), ${input.adjustmentsUnsupported} exclusivo(s) de Photoshop`
          : input.adjustmentsCompatible > 0
          ? `${input.adjustmentsCompatible} ajuste(s) convertido(s)`
          : 'Sin capas de ajuste incompatibles',
    },
  ];

  const notes = [...input.notes];
  if (input.textLayersFound > 0) {
    notes.push(`${input.textLayersFound} capa(s) de texto rasterizada(s) preservando su apariencia exacta.`);
  }
  if (input.effectsLayersFound > 0) {
    notes.push(`${input.effectsLayersFound} capa(s) contienen estilos/efectos de Photoshop (solo el contenido ráster base se importa).`);
  }
  if (input.unsupportedBlendModes.length > 0) {
    notes.push(`Modos de fusión convertidos a Normal: ${input.unsupportedBlendModes.join(', ')}.`);
  }
  if (input.header.colorModeCode === 4) {
    notes.push('Documento CMYK convertido automáticamente a sRGB preservando dimensiones exactas.');
  }
  if (input.header.bitsPerChannel > 8) {
    notes.push(`Canal de ${input.header.bitsPerChannel} bits normalizado a 8-bit por componente sin reescalado.`);
  }

  const hasWarnings =
    input.recoveryMode !== 'normal' ||
    input.skippedLayers > 0 ||
    input.hasAdvancedMasks ||
    input.smartObjectsFound > 0 ||
    input.adjustmentsUnsupported > 0 ||
    input.textLayersFound > 0 ||
    input.effectsLayersFound > 0 ||
    input.unsupportedBlendModes.length > 0 ||
    notes.length > 0;

  return {
    fileName: input.fileName,
    sourceSoftware: input.sourceSoftware,
    psdVersion: input.header.psdVersionLabel,
    colorModeLabel: input.header.colorModeLabel,
    bitsPerChannel: input.header.bitsPerChannel,
    width: input.width,
    height: input.height,
    dpi: input.dpi,
    totalSourceLayers: input.totalSourceLayers,
    importedLayers: input.importedLayers,
    importedGroups: input.importedGroups,
    skippedLayers: input.skippedLayers,
    rasterizedLayers: input.rasterizedLayers,
    recoveryModeUsed: input.recoveryMode,
    hasWarnings,
    items,
    notes,
  };
}

// =========================================================================
// ASEPRITE (.ase / .aseprite) BINARY IMPORTER (Full Linked Cels + Groups + Alpha)
// =========================================================================
interface ParsedAseLayerMeta {
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  type: number; // 0=image, 1=group, 2=tilemap
  childLevel: number;
  blendMode: LayerBlendMode;
  groupId: string | null;
  ownGroupId?: string;
}

function mapAseBlendMode(mode: number): LayerBlendMode {
  switch (mode) {
    case 1:
      return 'multiply';
    case 2:
      return 'screen';
    case 3:
      return 'overlay';
    case 4:
      return 'darken';
    case 5:
      return 'lighten';
    case 6:
      return 'color-dodge';
    case 7:
      return 'color-burn';
    case 8:
      return 'hard-light';
    case 9:
      return 'soft-light';
    case 10:
      return 'difference';
    case 11:
      return 'exclusion';
    default:
      return 'normal';
  }
}

export async function importAseprite(file: File): Promise<ImportResult> {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);

  if (buffer.byteLength < 128) {
    throw new FileLoadError('Archivo Aseprite inválido o demasiado pequeño.', file.name, 'Aseprite', undefined, {
      errorCode: 'ASE_IMPORT_201',
      moduleName: 'Aseprite Importer',
      fileSizeBytes: file.size,
      incompatibleElement: 'Cabecera Aseprite truncada (<128 bytes)',
    });
  }

  const magic = view.getUint16(4, true);
  if (magic !== 0xa5e0) {
    throw new FileLoadError(
      'Cabecera Aseprite no reconocida (el archivo puede estar dañado o tener otra extensión).',
      file.name,
      'Aseprite',
      `Magic=${magic.toString(16)}`,
      {
        errorCode: 'ASE_IMPORT_202',
        moduleName: 'Aseprite Importer',
        fileSizeBytes: file.size,
        incompatibleElement: 'Firma mágica 0xA5E0 ausente',
      }
    );
  }

  const numFrames = view.getUint16(6, true) || 1;
  const width = view.getUint16(8, true);
  const height = view.getUint16(10, true);
  if (width <= 0 || height <= 0) {
    throw new FileLoadError('Dimensiones inválidas en archivo Aseprite.', file.name, 'Aseprite', undefined, {
      errorCode: 'ASE_IMPORT_203',
      moduleName: 'Aseprite Importer',
      fileSizeBytes: file.size,
      incompatibleElement: `Dimensiones ${width}×${height}`,
    });
  }

  const colorDepth = view.getUint16(12, true); // 32=RGBA, 16=Grayscale, 8=Indexed
  const headerSpeedMs = view.getUint16(18, true) || 100;
  const transparentIndex = view.getUint8(28);

  const aseLayers: ParsedAseLayerMeta[] = [];
  const extractedGroups: LayerGroup[] = [];
  const groupStack: { level: number; id: string }[] = [];
  const groupPaletteColors = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ec4899'];

  const palette: string[] = new Array(256).fill('#000000');
  let hasModernPalette = false;
  const actionTags: ActionTag[] = [];
  const rawFrameEntries: {
    durationMs: number;
    durationTicks: number;
    cels: Map<number, (string | null)[][]>;
  }[] = [];

  const decoder = new TextDecoder();
  let offset = 128;

  for (let f = 0; f < numFrames && offset + 16 <= buffer.byteLength; f++) {
    const frameBytes = view.getUint32(offset, true);
    const frameMagic = view.getUint16(offset + 4, true);
    if (frameMagic !== 0xf1fa || frameBytes < 16) break;

    const oldChunks = view.getUint16(offset + 6, true);
    const frameDurationMs = view.getUint16(offset + 8, true) || headerSpeedMs;
    const newChunks = view.getUint32(offset + 12, true);
    const numChunks = newChunks > 0 ? newChunks : oldChunks;
    const durationTicks = Math.max(1, Math.round((frameDurationMs / 1000) * 60));

    const cels = new Map<number, (string | null)[][]>();
    const frameEnd = Math.min(buffer.byteLength, offset + frameBytes);
    let chunkOffset = offset + 16;

    for (let c = 0; c < numChunks && chunkOffset + 6 <= frameEnd; c++) {
      const chunkBytes = view.getUint32(chunkOffset, true);
      const chunkType = view.getUint16(chunkOffset + 4, true);
      if (chunkBytes < 6) break;
      const chunkEnd = Math.min(frameEnd, chunkOffset + chunkBytes);

      // Layer Chunk (0x2004)
      if (chunkType === 0x2004 && chunkOffset + 24 <= chunkEnd) {
        const flags = view.getUint16(chunkOffset + 6, true);
        const layerType = view.getUint16(chunkOffset + 8, true);
        const childLevel = view.getUint16(chunkOffset + 10, true);
        const blendModeId = view.getUint16(chunkOffset + 16, true);
        const opacityByte = view.getUint8(chunkOffset + 18);
        const nameLen = view.getUint16(chunkOffset + 22, true);
        let layerName = `Capa ${aseLayers.length + 1}`;
        if (chunkOffset + 24 + nameLen <= chunkEnd && nameLen > 0) {
          layerName = decoder.decode(new Uint8Array(buffer, chunkOffset + 24, nameLen));
        }

        while (groupStack.length > 0 && groupStack[groupStack.length - 1].level >= childLevel) {
          groupStack.pop();
        }
        const parentGroupId = groupStack.length > 0 ? groupStack[groupStack.length - 1].id : null;

        let ownGroupId: string | undefined;
        if (layerType === 1) {
          ownGroupId = `group-ase-${extractedGroups.length}-${Date.now()}`;
          extractedGroups.push({
            id: ownGroupId,
            name: layerName,
            color: groupPaletteColors[extractedGroups.length % groupPaletteColors.length],
            frameIndices: Array.from({ length: numFrames }, (_, idx) => idx),
            collapsed: (flags & 32) !== 0,
            visible: (flags & 1) !== 0,
            locked: (flags & 2) === 0,
            opacity: opacityByte > 0 ? opacityByte / 255 : 1,
            blendMode: mapAseBlendMode(blendModeId),
            parentGroupId,
          });
          groupStack.push({ level: childLevel, id: ownGroupId });
        }

        aseLayers.push({
          name: layerName,
          visible: (flags & 1) !== 0,
          locked: (flags & 2) === 0,
          opacity: opacityByte > 0 ? opacityByte / 255 : 1,
          type: layerType,
          childLevel,
          blendMode: mapAseBlendMode(blendModeId),
          groupId: parentGroupId,
          ownGroupId,
        });
      }

      // Old Palette Chunks (0x0004 & 0x0011) as fallback when 0x2019 is absent
      if ((chunkType === 0x0004 || chunkType === 0x0011) && !hasModernPalette && chunkOffset + 8 <= chunkEnd) {
        const packetCount = view.getUint16(chunkOffset + 6, true);
        let pOffset = chunkOffset + 8;
        let palIndex = 0;
        for (let pk = 0; pk < packetCount && pOffset + 2 <= chunkEnd; pk++) {
          const skip = view.getUint8(pOffset);
          const rawCount = view.getUint8(pOffset + 1);
          const count = rawCount === 0 ? 256 : rawCount;
          pOffset += 2;
          palIndex += skip;
          for (let i = 0; i < count && pOffset + 3 <= chunkEnd && palIndex < 256; i++) {
            let r = view.getUint8(pOffset);
            let g = view.getUint8(pOffset + 1);
            let b = view.getUint8(pOffset + 2);
            if (chunkType === 0x0011) {
              r = Math.min(255, Math.round((r * 255) / 63));
              g = Math.min(255, Math.round((g * 255) / 63));
              b = Math.min(255, Math.round((b * 255) / 63));
            }
            palette[palIndex++] = `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
            pOffset += 3;
          }
        }
      }

      // Modern Palette Chunk (0x2019)
      if (chunkType === 0x2019 && chunkOffset + 26 <= chunkEnd) {
        hasModernPalette = true;
        const firstIdx = view.getUint32(chunkOffset + 10, true);
        const lastIdx = view.getUint32(chunkOffset + 14, true);
        let pOffset = chunkOffset + 26;
        for (let idx = firstIdx; idx <= lastIdx && pOffset + 6 <= chunkEnd; idx++) {
          const entryFlags = view.getUint16(pOffset, true);
          const r = view.getUint8(pOffset + 2);
          const g = view.getUint8(pOffset + 3);
          const b = view.getUint8(pOffset + 4);
          const a = view.getUint8(pOffset + 5);
          palette[idx] = rgbaToPixelString(r, g, b, a) || '#000000';
          pOffset += 6;
          if ((entryFlags & 1) !== 0 && pOffset + 2 <= chunkEnd) {
            const nameLen = view.getUint16(pOffset, true);
            pOffset += 2 + nameLen;
          }
        }
      }

      // Cel Chunk (0x2005) — Supports Raw (0), Linked Cel (1), and Compressed (2)
      if (chunkType === 0x2005 && chunkOffset + 22 <= chunkEnd) {
        const layerIndex = view.getUint16(chunkOffset + 6, true);
        const celX = view.getInt16(chunkOffset + 8, true);
        const celY = view.getInt16(chunkOffset + 10, true);
        const celOpacity = view.getUint8(chunkOffset + 12) / 255;
        const celType = view.getUint16(chunkOffset + 13, true);

        if (celType === 1 && chunkOffset + 24 <= chunkEnd) {
          // Linked Cel: clone pixels from referenced earlier frame!
          const linkedFrameIdx = view.getUint16(chunkOffset + 22, true);
          const sourceGrid = rawFrameEntries[linkedFrameIdx]?.cels.get(layerIndex);
          if (sourceGrid) {
            cels.set(
              layerIndex,
              sourceGrid.map((row) => [...row])
            );
          }
        } else if ((celType === 0 || celType === 2) && chunkOffset + 26 <= chunkEnd) {
          const celW = view.getUint16(chunkOffset + 22, true);
          const celH = view.getUint16(chunkOffset + 24, true);
          let pixelBytes: Uint8Array | null = null;

          if (celType === 0) {
            pixelBytes = new Uint8Array(buffer, chunkOffset + 26, chunkEnd - (chunkOffset + 26));
          } else {
            const compressed = new Uint8Array(buffer, chunkOffset + 26, chunkEnd - (chunkOffset + 26));
            pixelBytes = await inflateBytes(compressed, 'deflate');
          }

          if (pixelBytes && celW > 0 && celH > 0) {
            const layerGrid = cels.get(layerIndex) || createEmptyGrid(width, height);
            const bpp = colorDepth === 8 ? 1 : colorDepth === 16 ? 2 : 4;
            let pIdx = 0;

            for (let cy = 0; cy < celH; cy++) {
              for (let cx = 0; cx < celW; cx++) {
                if (pIdx + bpp > pixelBytes.byteLength) break;
                let pixelVal: string | null = null;

                if (bpp === 4) {
                  const r = pixelBytes[pIdx];
                  const g = pixelBytes[pIdx + 1];
                  const b = pixelBytes[pIdx + 2];
                  const a = Math.round(pixelBytes[pIdx + 3] * celOpacity);
                  pixelVal = rgbaToPixelString(r, g, b, a);
                } else if (bpp === 2) {
                  const v = pixelBytes[pIdx];
                  const a = Math.round(pixelBytes[pIdx + 1] * celOpacity);
                  pixelVal = rgbaToPixelString(v, v, v, a);
                } else {
                  const idx = pixelBytes[pIdx];
                  if (idx !== transparentIndex && palette[idx]) {
                    pixelVal = palette[idx];
                  }
                }

                pIdx += bpp;
                const destX = celX + cx;
                const destY = celY + cy;
                if (pixelVal && destX >= 0 && destX < width && destY >= 0 && destY < height) {
                  layerGrid[destY][destX] = pixelVal;
                }
              }
            }
            cels.set(layerIndex, layerGrid);
          }
        }
      }

      // Tags Chunk (0x2018)
      if (chunkType === 0x2018 && chunkOffset + 16 <= chunkEnd) {
        const numTags = view.getUint16(chunkOffset + 6, true);
        let tagOffset = chunkOffset + 16;
        for (let t = 0; t < numTags && tagOffset + 19 <= chunkEnd; t++) {
          const fromFrame = view.getUint16(tagOffset, true);
          const toFrame = view.getUint16(tagOffset + 2, true);
          const loopDir = view.getUint8(tagOffset + 4);
          const r = view.getUint8(tagOffset + 13);
          const g = view.getUint8(tagOffset + 14);
          const b = view.getUint8(tagOffset + 15);
          const nameLen = view.getUint16(tagOffset + 17, true);
          let tagName = `Anim ${t + 1}`;
          if (tagOffset + 19 + nameLen <= chunkEnd && nameLen > 0) {
            tagName = decoder.decode(new Uint8Array(buffer, tagOffset + 19, nameLen));
          }
          const tagHex = `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
          actionTags.push({
            id: `tag-${t}-${Date.now()}`,
            name: tagName,
            color: tagHex === '#000000' ? '#f59e0b' : tagHex,
            frameIndices: Array.from(
              { length: Math.max(1, toFrame - fromFrame + 1) },
              (_, i) => fromFrame + i
            ),
            playbackMode: loopDir === 2 ? 'pingpong' : 'loop',
            category: 'Normal',
          });
          tagOffset += 19 + nameLen;
        }
      }

      chunkOffset += chunkBytes;
    }

    rawFrameEntries.push({
      durationMs: frameDurationMs,
      durationTicks,
      cels,
    });

    offset += frameBytes;
  }

  if (rawFrameEntries.length === 0) {
    throw new FileLoadError('El archivo Aseprite no contiene fotogramas válidos.', file.name, 'Aseprite');
  }

  const imageLayerIndices = aseLayers
    .map((meta, idx) => ({ meta, idx }))
    .filter((item) => item.meta.type === 0);

  const avgMs =
    rawFrameEntries.reduce((acc, f) => acc + (f.durationMs || 100), 0) / rawFrameEntries.length;
  const computedFps = Math.max(1, Math.min(60, Math.round(1000 / Math.max(16, avgMs))));

  const frames: Frame[] = rawFrameEntries.map((entry, fIdx) => {
    const layers: Layer[] =
      imageLayerIndices.length > 0
        ? imageLayerIndices.map(({ meta, idx }) => ({
            id: `layer-ase-${fIdx}-${idx}`,
            name: meta.name,
            visible: meta.visible,
            locked: meta.locked,
            opacity: meta.opacity,
            fillOpacity: 1,
            blendMode: meta.blendMode,
            layerType: 'raster',
            groupId: meta.groupId,
            pixels: entry.cels.get(idx) || createEmptyGrid(width, height),
          }))
        : [
            {
              id: `layer-ase-${fIdx}-0`,
              name: 'Capa Aseprite',
              visible: true,
              locked: false,
              opacity: 1,
              fillOpacity: 1,
              blendMode: 'normal',
              layerType: 'raster',
              pixels: entry.cels.get(0) || createEmptyGrid(width, height),
            },
          ];

    return {
      id: `frame-ase-${fIdx}-${Date.now()}`,
      name: `Fotograma #${fIdx + 1}`,
      durationTicks: entry.durationTicks,
      durationMs: entry.durationMs,
      phase: 'neutral',
      layers,
      hitboxes: [],
    };
  });

  return validateImportResult(
    {
      name: file.name.replace(/\.[^/.]+$/, ''),
      width,
      height,
      frames,
      layerGroups: extractedGroups,
      actionTags,
      fps: computedFps,
      stats: {
        formatLabel: 'Aseprite (.ASE)',
        fileFormat: 'ase',
        frameCount: frames.length,
        layerCount: frames[0].layers.length,
        nonEmptyPixelCount: 0,
        hasTransparency: true,
        isAnimated: frames.length > 1,
      },
    },
    file.name,
    'Aseprite'
  );
}

// =========================================================================
// PIXELCLASH STUDIO (.pcs) & PROJECT (.json) NATIVE IMPORTERS
// =========================================================================
export async function importPcs(file: File): Promise<ImportResult> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let projectJsonText = '';

  if (bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const zip = await JSZip.loadAsync(buffer);
    const projectEntry = zip.file('project.json');
    if (!projectEntry) {
      throw new FileLoadError(
        'Archivo .pcs corrupto: falta el descriptor interno project.json.',
        file.name,
        'PixelClash (.PCS)',
        undefined,
        {
          errorCode: 'PCS_IMPORT_301',
          moduleName: 'PCS Project Loader',
          fileSizeBytes: file.size,
          incompatibleElement: 'Entrada zip project.json ausente',
        }
      );
    }
    projectJsonText = await projectEntry.async('string');
  } else {
    projectJsonText = new TextDecoder().decode(bytes);
  }

  let parsed: Partial<ProjectState>;
  try {
    parsed = JSON.parse(projectJsonText) as Partial<ProjectState>;
  } catch (err: any) {
    throw new FileLoadError(
      'No se pudo analizar el contenido interno del archivo .pcs (JSON dañado).',
      file.name,
      'PixelClash (.PCS)',
      err?.message,
      {
        errorCode: 'PCS_IMPORT_302',
        moduleName: 'PCS Project Loader',
        fileSizeBytes: file.size,
        incompatibleElement: 'Descriptor project.json malformado',
      }
    );
  }

  if (!parsed || !parsed.width || !parsed.height || !Array.isArray(parsed.frames) || parsed.frames.length === 0) {
    throw new FileLoadError(
      'Estructura de proyecto .pcs inválida o sin fotogramas.',
      file.name,
      'PixelClash (.PCS)',
      undefined,
      {
        errorCode: 'PCS_IMPORT_303',
        moduleName: 'PCS Project Loader',
        fileSizeBytes: file.size,
        incompatibleElement: 'Estructura frames[] / dimensiones inválidas',
      }
    );
  }

  return validateImportResult(
    {
      name: parsed.name || file.name.replace(/\.[^/.]+$/, ''),
      width: parsed.width,
      height: parsed.height,
      frames: parsed.frames,
      layerGroups: Array.isArray(parsed.layerGroups) ? parsed.layerGroups : [],
      actionTags: Array.isArray(parsed.actionTags) ? parsed.actionTags : [],
      projectState: parsed,
      fps: typeof parsed.fps === 'number' ? parsed.fps : 12,
      stats: {
        formatLabel: 'PixelClash (.PCS)',
        fileFormat: 'pcs',
        frameCount: parsed.frames.length,
        layerCount: parsed.frames[0]?.layers?.length || 1,
        nonEmptyPixelCount: 0,
        hasTransparency: true,
        isAnimated: parsed.frames.length > 1,
      },
    },
    file.name,
    'PixelClash (.PCS)'
  );
}

export async function importProjectJson(file: File): Promise<ImportResult> {
  let parsed: Partial<ProjectState>;
  try {
    const text = await file.text();
    parsed = JSON.parse(text) as Partial<ProjectState>;
  } catch (err: any) {
    throw new FileLoadError(
      'El archivo JSON está dañado o no tiene sintaxis JSON válida.',
      file.name,
      'Proyecto JSON',
      err?.message,
      {
        errorCode: 'JSON_IMPORT_301',
        moduleName: 'JSON Project Loader',
        fileSizeBytes: file.size,
        incompatibleElement: 'Sintaxis JSON inválida',
      }
    );
  }

  if (!parsed || !parsed.width || !parsed.height || !Array.isArray(parsed.frames) || parsed.frames.length === 0) {
    throw new FileLoadError(
      'El archivo JSON no corresponde a un proyecto válido de PixelClash Studio (faltan dimensiones o fotogramas).',
      file.name,
      'Proyecto JSON',
      undefined,
      {
        errorCode: 'JSON_IMPORT_302',
        moduleName: 'JSON Project Loader',
        fileSizeBytes: file.size,
        incompatibleElement: 'Esquema de proyecto PixelClash incompleto',
      }
    );
  }

  return validateImportResult(
    {
      name: parsed.name || file.name.replace(/(\.pixelclash|\.pcsanim)?\.json$/i, ''),
      width: parsed.width,
      height: parsed.height,
      frames: parsed.frames,
      layerGroups: Array.isArray(parsed.layerGroups) ? parsed.layerGroups : [],
      actionTags: Array.isArray(parsed.actionTags) ? parsed.actionTags : [],
      projectState: parsed,
      fps: typeof parsed.fps === 'number' ? parsed.fps : 12,
      stats: {
        formatLabel: 'Proyecto JSON',
        fileFormat: 'json',
        frameCount: parsed.frames.length,
        layerCount: parsed.frames[0]?.layers?.length || 1,
        nonEmptyPixelCount: 0,
        hasTransparency: true,
        isAnimated: parsed.frames.length > 1,
      },
    },
    file.name,
    'Proyecto JSON'
  );
}

// =========================================================================
// ANIMATED GIF & MULTI-PAGE TIFF PROJECT IMPORTERS
// =========================================================================
async function importGif(file: File): Promise<ImportResult> {
  const gif = decodeAnimatedGif(await file.arrayBuffer());
  // NEVER auto-resize: keep 100% original width, height, transparency, and pixels!
  const targetW = gif.width;
  const targetH = gif.height;
  const useTiled = shouldUseTiledStorage(targetW, targetH);

  const stamp = Date.now();
  const frames: Frame[] = gif.frames.map((gf, idx) => {
    const durationTicks = Math.max(1, Math.round((gf.delayMs / 1000) * 60));
    let layer: Layer;

    if (useTiled) {
      const store = new TiledLayerStore(targetW, targetH);
      store.loadFromRgbaBuffer(gf.rgba, targetW, targetH);
      const tiledStoreId = registerTiledStore(store);
      layer = {
        id: `layer-gif-${stamp}-${idx}`,
        name: gif.frames.length > 1 ? 'Animación GIF' : 'Imagen Base',
        visible: true,
        locked: false,
        opacity: 1,
        fillOpacity: 1,
        blendMode: 'normal',
        layerType: 'raster',
        pixels: [],
        tiledStoreId,
        tiledRevision: 1,
      };
    } else {
      const { grid } = rgbaBufferToPixelGrid(gf.rgba, targetW, targetH);
      layer = {
        id: `layer-gif-${stamp}-${idx}`,
        name: gif.frames.length > 1 ? 'Animación GIF' : 'Imagen Base',
        visible: true,
        locked: false,
        opacity: 1,
        fillOpacity: 1,
        blendMode: 'normal',
        layerType: 'raster',
        pixels: grid,
      };
    }

    return {
      id: `frame-gif-${stamp}-${idx}`,
      name: gif.frames.length > 1 ? `GIF #${idx + 1}` : 'Imagen GIF',
      durationTicks,
      durationMs: gf.delayMs,
      phase: 'neutral',
      layers: [layer],
      hitboxes: [],
    };
  });

  const avgMs = gif.frames.reduce((s, f) => s + f.delayMs, 0) / gif.frames.length;
  const computedFps = Math.max(1, Math.min(60, Math.round(1000 / Math.max(16, avgMs))));
  const rawFirst: DecodedRgbaImage = {
    width: gif.width,
    height: gif.height,
    data: gif.frames[0].rgba,
    hasTransparency: gif.hasTransparency,
    dpi: 72,
    tiledStoreId: frames[0]?.layers[0]?.tiledStoreId,
  };

  return validateImportResult(
    {
      name: file.name.replace(/\.[^/.]+$/, ''),
      width: targetW,
      height: targetH,
      dpi: 72,
      frames,
      fps: computedFps,
      rawRaster: gif.frames.length === 1 ? rawFirst : undefined,
      spritesheetCandidate:
        gif.frames.length === 1 ? detectSpritesheetCandidate(file.name, gif.width, gif.height) : undefined,
      stats: {
        formatLabel: gif.frames.length > 1 ? 'GIF Animado' : 'GIF',
        fileFormat: 'gif',
        frameCount: frames.length,
        layerCount: 1,
        nonEmptyPixelCount: 0,
        hasTransparency: gif.hasTransparency,
        isAnimated: frames.length > 1,
        wasDownscaled: false,
        originalWidth: gif.width,
        originalHeight: gif.height,
        dpi: 72,
        usesTiledEngine: useTiled,
      },
    },
    file.name,
    gif.frames.length > 1 ? 'GIF Animado' : 'GIF'
  );
}

async function importTiff(file: File): Promise<ImportResult> {
  const pages = await decodeTiffFrames(await file.arrayBuffer());
  const first = pages[0];
  // NEVER auto-resize: keep 100% original dimensions!
  const targetW = first.width;
  const targetH = first.height;
  const useTiled = shouldUseTiledStorage(targetW, targetH);

  const stamp = Date.now();
  const frames: Frame[] = pages.map((page, idx) => {
    const normalized =
      page.width !== targetW || page.height !== targetH
        ? scaleRgbaImage(page, targetW, targetH, 'center_no_resize', 'nearest')
        : page;

    let layer: Layer;
    if (useTiled) {
      const store = new TiledLayerStore(targetW, targetH);
      store.loadFromRgbaBuffer(normalized.data, targetW, targetH);
      const tiledStoreId = registerTiledStore(store);
      layer = {
        id: `layer-tiff-${stamp}-${idx}`,
        name: 'Imagen Base',
        visible: true,
        locked: false,
        opacity: 1,
        fillOpacity: 1,
        blendMode: 'normal',
        layerType: 'raster',
        pixels: [],
        tiledStoreId,
        tiledRevision: 1,
      };
    } else {
      const { grid } = rgbaBufferToPixelGrid(normalized.data, targetW, targetH);
      layer = {
        id: `layer-tiff-${stamp}-${idx}`,
        name: 'Imagen Base',
        visible: true,
        locked: false,
        opacity: 1,
        fillOpacity: 1,
        blendMode: 'normal',
        layerType: 'raster',
        pixels: grid,
      };
    }

    return {
      id: `frame-tiff-${stamp}-${idx}`,
      name: pages.length > 1 ? `Página TIFF #${idx + 1}` : 'Imagen TIFF',
      durationTicks: 5,
      durationMs: 100,
      phase: 'neutral',
      layers: [layer],
      hitboxes: [],
    };
  });

  return validateImportResult(
    {
      name: file.name.replace(/\.[^/.]+$/, ''),
      width: targetW,
      height: targetH,
      dpi: first.dpi || 72,
      frames,
      fps: 10,
      rawRaster: pages.length === 1 ? { ...first, tiledStoreId: frames[0]?.layers[0]?.tiledStoreId } : undefined,
      spritesheetCandidate:
        pages.length === 1 ? detectSpritesheetCandidate(file.name, first.width, first.height) : undefined,
      stats: {
        formatLabel: pages.length > 1 ? 'TIFF Multipágina' : 'TIFF',
        fileFormat: 'tiff',
        frameCount: frames.length,
        layerCount: 1,
        nonEmptyPixelCount: 0,
        hasTransparency: pages.some((p) => p.hasTransparency),
        isAnimated: pages.length > 1,
        wasDownscaled: false,
        originalWidth: first.width,
        originalHeight: first.height,
        dpi: first.dpi || 72,
        usesTiledEngine: useTiled,
      },
    },
    file.name,
    'TIFF'
  );
}

async function importSingleRasterImage(
  file: File,
  formatLabel: string,
  fileFormat: RecentProjectFileFormat
): Promise<ImportResult> {
  const raw = await decodeAnyRasterFileToRgba(file);
  // PIXEL INTEGRITY GUARANTEE: NEVER resize or resample on Open!
  const targetW = raw.width;
  const targetH = raw.height;
  const dpi = raw.dpi || 72;
  const useTiled = shouldUseTiledStorage(targetW, targetH);

  const stamp = Date.now();
  const baseName = file.name.replace(/\.[^/.]+$/, '');

  let layer: Layer;
  let nonEmptyCount = 0;
  let hasTransparency = raw.hasTransparency;
  let rawWithTile: DecodedRgbaImage = raw;

  if (useTiled) {
    let tiledStoreId = raw.tiledStoreId;
    if (!tiledStoreId || !getTiledStore(tiledStoreId)) {
      const store = new TiledLayerStore(targetW, targetH);
      const stats = store.loadFromRgbaBuffer(raw.data, targetW, targetH);
      nonEmptyCount = stats.nonEmptyCount;
      hasTransparency = hasTransparency || stats.hasTransparency;
      tiledStoreId = registerTiledStore(store);
    } else {
      const store = getTiledStore(tiledStoreId)!;
      nonEmptyCount = store.allocatedTileCount > 0 ? Math.max(1, store.allocatedTileCount * 64) : 0;
    }
    rawWithTile = { ...raw, tiledStoreId };
    layer = {
      id: `layer-${fileFormat}-${stamp}`,
      name: baseName || 'Imagen Base',
      visible: true,
      locked: false,
      opacity: 1,
      fillOpacity: 1,
      blendMode: 'normal',
      layerType: 'raster',
      pixels: [],
      tiledStoreId,
      tiledRevision: 1,
    };
  } else {
    const converted = rgbaBufferToPixelGrid(raw.data, targetW, targetH);
    nonEmptyCount = converted.nonEmptyCount;
    hasTransparency = converted.hasTransparency;
    layer = {
      id: `layer-${fileFormat}-${stamp}`,
      name: baseName || 'Imagen Base',
      visible: true,
      locked: false,
      opacity: 1,
      fillOpacity: 1,
      blendMode: 'normal',
      layerType: 'raster',
      pixels: converted.grid,
    };
  }

  return validateImportResult(
    {
      name: baseName,
      width: targetW,
      height: targetH,
      dpi,
      frames: [
        {
          id: `frame-${fileFormat}-${stamp}`,
          name: `Imagen ${formatLabel}`,
          durationTicks: 5,
          durationMs: 83,
          phase: 'neutral',
          layers: [layer],
          hitboxes: [],
        },
      ],
      rawRaster: rawWithTile,
      spritesheetCandidate: detectSpritesheetCandidate(file.name, raw.width, raw.height),
      stats: {
        formatLabel,
        fileFormat,
        frameCount: 1,
        layerCount: 1,
        nonEmptyPixelCount: nonEmptyCount,
        hasTransparency,
        isAnimated: false,
        wasDownscaled: false,
        originalWidth: raw.width,
        originalHeight: raw.height,
        dpi,
        usesTiledEngine: useTiled,
      },
    },
    file.name,
    formatLabel
  );
}

// =========================================================================
// MANDATORY POST-LOAD VALIDATION ENGINE
// =========================================================================
export function validateDocumentFramesIntegrity(
  width: number,
  height: number,
  frames: Frame[],
  fileName: string,
  formatLabel: string
): {
  normalizedFrames: Frame[];
  nonEmptyPixelCount: number;
  maxLayerCount: number;
  hasTransparency: boolean;
} {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    throw new FileLoadError(
      `El documento tiene dimensiones inválidas (${width}×${height} px).`,
      fileName,
      formatLabel
    );
  }
  if (!Array.isArray(frames) || frames.length === 0) {
    throw new FileLoadError(
      'El archivo no contiene ningún fotograma válido.',
      fileName,
      formatLabel
    );
  }

  let nonEmptyPixelCount = 0;
  let maxLayerCount = 0;
  let hasTransparency = false;

  const normalizedFrames: Frame[] = frames.map((frame, fIdx) => {
    if (!frame || !Array.isArray(frame.layers) || frame.layers.length === 0) {
      throw new FileLoadError(
        `El fotograma #${fIdx + 1} está dañado o no contiene capas válidas.`,
        fileName,
        formatLabel
      );
    }
    maxLayerCount = Math.max(maxLayerCount, frame.layers.length);

    const normalizedLayers: Layer[] = frame.layers.map((layer, lIdx) => {
      // Fast O(1) validation for Tiled/Chunked high-resolution layers (never allocate giant string[][])
      const tiledStore = layer?.tiledStoreId ? getTiledStore(layer.tiledStoreId) : undefined;
      if (tiledStore) {
        if (tiledStore.hasNonEmptyContent()) {
          nonEmptyPixelCount += Math.max(1, tiledStore.allocatedTileCount * 64);
        }
        hasTransparency = true;
        return {
          ...layer,
          id: layer.id || `layer-val-${fIdx}-${lIdx}`,
          name: layer.name || `Capa ${lIdx + 1}`,
          visible: layer.visible !== false,
          locked: Boolean(layer.locked),
          opacity: typeof layer.opacity === 'number' ? layer.opacity : 1,
          fillOpacity: typeof layer.fillOpacity === 'number' ? layer.fillOpacity : 1,
          blendMode: layer.blendMode || 'normal',
          pixels: [],
          tiledStoreId: layer.tiledStoreId,
          tiledRevision: layer.tiledRevision || 1,
        };
      }

      if (!layer || !Array.isArray(layer.pixels)) {
        throw new FileLoadError(
          `La capa "${layer?.name || lIdx + 1}" del fotograma #${fIdx + 1} no tiene matriz de píxeles válida.`,
          fileName,
          formatLabel
        );
      }

      // Normalize ragged rows cleanly without losing data
      let needsRebuild = layer.pixels.length !== height;
      if (!needsRebuild) {
        for (let y = 0; y < height; y++) {
          if (!Array.isArray(layer.pixels[y]) || layer.pixels[y].length !== width) {
            needsRebuild = true;
            break;
          }
        }
      }

      const finalPixels: (string | null)[][] = needsRebuild
        ? Array.from({ length: height }, (_, y) =>
            Array.from({ length: width }, (_, x) => {
              const cell = layer.pixels[y]?.[x];
              return typeof cell === 'string' && cell.length > 0 ? cell : null;
            })
          )
        : layer.pixels;

      for (let y = 0; y < height; y++) {
        const row = finalPixels[y];
        for (let x = 0; x < width; x++) {
          const val = row[x];
          if (val) {
            nonEmptyPixelCount++;
            if (val.startsWith('rgba(')) hasTransparency = true;
          } else {
            hasTransparency = true;
          }
        }
      }

      return {
        ...layer,
        id: layer.id || `layer-val-${fIdx}-${lIdx}`,
        name: layer.name || `Capa ${lIdx + 1}`,
        visible: layer.visible !== false,
        locked: Boolean(layer.locked),
        opacity: typeof layer.opacity === 'number' ? layer.opacity : 1,
        fillOpacity: typeof layer.fillOpacity === 'number' ? layer.fillOpacity : 1,
        blendMode: layer.blendMode || 'normal',
        pixels: finalPixels,
      };
    });

    return {
      ...frame,
      id: frame.id || `frame-val-${fIdx}`,
      name: frame.name || `Fotograma #${fIdx + 1}`,
      durationTicks: typeof frame.durationTicks === 'number' && frame.durationTicks > 0 ? frame.durationTicks : 4,
      phase: frame.phase || 'neutral',
      layers: normalizedLayers,
      hitboxes: Array.isArray(frame.hitboxes) ? frame.hitboxes : [],
    };
  });

  return { normalizedFrames, nonEmptyPixelCount, maxLayerCount, hasTransparency };
}

export function validateImportResult(
  result: ImportResult,
  fileName: string,
  formatLabel: string
): ImportResult {
  const { normalizedFrames, nonEmptyPixelCount, maxLayerCount, hasTransparency } =
    validateDocumentFramesIntegrity(
      result.width,
      result.height,
      result.frames,
      fileName,
      formatLabel
    );

  return {
    ...result,
    frames: normalizedFrames,
    stats: {
      ...result.stats,
      formatLabel,
      frameCount: normalizedFrames.length,
      layerCount: maxLayerCount,
      nonEmptyPixelCount,
      hasTransparency: result.stats.hasTransparency || hasTransparency,
      isAnimated: normalizedFrames.length > 1,
    },
  };
}

// =========================================================================
// UNIVERSAL UNIFIED FILE IMPORTER
// Used across: Archivo -> Abrir, Abrir Recientes, Importar & Drag & Drop
// =========================================================================
export interface ImportGraphicFileOptions {
  psdRecoveryMode?: PsdRecoveryMode;
}

export async function importGraphicFile(
  file: File,
  options?: ImportGraphicFileOptions
): Promise<ImportResult> {
  if (!file || file.size === 0) {
    throw new FileLoadError(
      'El archivo está vacío (0 bytes) o no pudo leerse.',
      file?.name || 'archivo',
      'Desconocido',
      undefined,
      {
        errorCode: 'FILE_EMPTY_001',
        moduleName: 'File Loader',
        fileSizeBytes: file?.size ?? 0,
        incompatibleElement: 'Archivo vacío (0 bytes)',
      }
    );
  }

  const ext = getFileExtension(file.name);

  try {
    if (ext === 'pcs') {
      return await importPcs(file);
    }
    if (ext === 'json') {
      return await importProjectJson(file);
    }
    if (ext === 'psd' || ext === 'psb') {
      return await importPsd(file, { recoveryMode: options?.psdRecoveryMode });
    }
    if (ext === 'ase' || ext === 'aseprite') {
      return await importAseprite(file);
    }
    if (ext === 'gif') {
      return await importGif(file);
    }
    if (ext === 'tif' || ext === 'tiff') {
      return await importTiff(file);
    }
    if (ext === 'tga') {
      return await importSingleRasterImage(file, 'TGA', 'tga');
    }
    if (ext === 'bmp') {
      return await importSingleRasterImage(file, 'BMP', 'bmp');
    }
    if (ext === 'ico') {
      return await importSingleRasterImage(file, 'ICO', 'ico');
    }
    if (ext === 'png' || file.type === 'image/png') {
      return await importSingleRasterImage(file, 'PNG', 'png');
    }
    if (ext === 'jpg' || ext === 'jpeg' || file.type === 'image/jpeg') {
      return await importSingleRasterImage(file, 'JPEG', 'jpg');
    }
    if (ext === 'webp' || file.type === 'image/webp') {
      return await importSingleRasterImage(file, 'WEBP', 'webp');
    }

    throw new FileLoadError(
      `Formato ".${ext || 'desconocido'}" no soportado. Formatos válidos: PNG, JPG, JPEG, WEBP, GIF, BMP, TIFF, TGA, ICO, ASE, ASEPRITE, PSD, PSB, PCS y JSON.`,
      file.name,
      ext ? `.${ext.toUpperCase()}` : 'Desconocido',
      undefined,
      {
        errorCode: 'FORMAT_UNSUPPORTED_415',
        moduleName: 'File Dispatcher',
        fileSizeBytes: file.size,
        incompatibleElement: ext ? `Extensión .${ext}` : 'Tipo de archivo desconocido',
      }
    );
  } catch (err: any) {
    if (err instanceof FileLoadError) {
      if (err.fileSizeBytes === undefined) {
        throw new FileLoadError(err.message, err.fileName, err.formatLabel, err.technicalDetails, {
          errorCode: err.errorCode,
          moduleName: err.moduleName,
          fileSizeBytes: file.size,
          psdVersion: err.psdVersion,
          incompatibleElement: err.incompatibleElement,
          canOfferPsdRecovery: err.canOfferPsdRecovery,
        });
      }
      throw err;
    }
    const moduleMap: Record<string, string> = {
      psd: 'PSD Importer',
      psb: 'PSD Importer',
      ase: 'Aseprite Importer',
      aseprite: 'Aseprite Importer',
      pcs: 'PCS Project Loader',
      json: 'JSON Project Loader',
      gif: 'GIF Decoder',
      tif: 'TIFF Decoder',
      tiff: 'TIFF Decoder',
    };
    const codeMap: Record<string, string> = {
      psd: 'PSD_IMPORT_109',
      psb: 'PSD_IMPORT_109',
      ase: 'ASE_IMPORT_201',
      aseprite: 'ASE_IMPORT_201',
      pcs: 'PCS_IMPORT_301',
      json: 'JSON_IMPORT_302',
      gif: 'GIF_DECODE_202',
      tif: 'TIFF_DECODE_203',
      tiff: 'TIFF_DECODE_203',
    };
    throw new FileLoadError(
      err?.message || 'Error al decodificar el archivo seleccionado.',
      file.name,
      ext ? `.${ext.toUpperCase()}` : 'Archivo',
      err?.stack || String(err),
      {
        errorCode: codeMap[ext] || 'IMG_DECODE_201',
        moduleName: moduleMap[ext] || 'Raster Image Decoder',
        fileSizeBytes: file.size,
        canOfferPsdRecovery: ext === 'psd' || ext === 'psb',
      }
    );
  }
}
