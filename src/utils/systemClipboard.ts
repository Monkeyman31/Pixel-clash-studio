import {
  DecodedRgbaImage,
  decodeAnyRasterFileToRgba,
  isSupportedImageFile,
  rgbaBufferToPixelGrid,
  rgbaToDataUrl,
} from './fileImporter';
import { getCachedPixelGridCanvas } from './renderCache';

export interface ClipboardImagePayload {
  file: File;
  rgba: DecodedRgbaImage;
  dataUrl: string;
  width: number;
  height: number;
  mimeType: string;
  formatLabel: string;
  sizeBytes: number;
  hasTransparency: boolean;
  source: 'event' | 'electron' | 'async_api';
}

interface DesktopClipboardBridge {
  readClipboardImage?: () => Promise<{
    hasImage: boolean;
    pngBytes?: Uint8Array | number[];
    width?: number;
    height?: number;
    error?: string;
  }>;
  writeClipboardImage?: (pngBytes: Uint8Array) => Promise<{ ok: boolean; error?: string }>;
}

function getDesktopBridge(): DesktopClipboardBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { pixelClashDesktop?: DesktopClipboardBridge }).pixelClashDesktop;
}

function rgbaBufferHasTransparency(rgba: Uint8ClampedArray): boolean {
  for (let i = 3; i < rgba.length; i += 4) {
    if (rgba[i] < 255) return true;
  }
  return false;
}

function detectFormatLabel(mimeType: string, fileName: string): string {
  const lowerMime = (mimeType || '').toLowerCase();
  const lowerName = (fileName || '').toLowerCase();
  if (lowerMime.includes('png') || lowerName.endsWith('.png')) return 'PNG';
  if (lowerMime.includes('webp') || lowerName.endsWith('.webp')) return 'WEBP';
  if (lowerMime.includes('gif') || lowerName.endsWith('.gif')) return 'GIF';
  if (lowerMime.includes('bmp') || lowerName.endsWith('.bmp')) return 'BMP';
  if (lowerMime.includes('tiff') || lowerName.endsWith('.tif') || lowerName.endsWith('.tiff')) return 'TIFF';
  if (lowerMime.includes('jpeg') || lowerMime.includes('jpg') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'JPG';
  if (lowerName.endsWith('.tga')) return 'TGA';
  if (lowerName.endsWith('.ico') || lowerMime.includes('icon')) return 'ICO';
  return 'PNG';
}

async function decodeFileToClipboardPayload(
  file: File,
  source: ClipboardImagePayload['source']
): Promise<ClipboardImagePayload | null> {
  try {
    const decoded = await decodeAnyRasterFileToRgba(file);
    if (!decoded || decoded.width <= 0 || decoded.height <= 0) return null;
    const hasTransparency = rgbaBufferHasTransparency(decoded.data);
    const dataUrl = rgbaToDataUrl(decoded);
    const mimeType = file.type || 'image/png';
    return {
      file,
      rgba: decoded,
      dataUrl,
      width: decoded.width,
      height: decoded.height,
      mimeType,
      formatLabel: detectFormatLabel(mimeType, file.name),
      sizeBytes: file.size || decoded.data.byteLength,
      hasTransparency,
      source,
    };
  } catch {
    return null;
  }
}

/**
 * Inspects a native browser `ClipboardEvent` (Ctrl+V / Paste) for any raster image
 * or copied image file (from browser, Photoshop, Aseprite, Krita, File Explorer,
 * Discord, Screenshots, etc.) while preserving full RGBA transparency.
 */
export async function readImageFromClipboardEvent(
  e: ClipboardEvent
): Promise<ClipboardImagePayload | null> {
  const dt = e.clipboardData;
  if (!dt) return null;

  const candidateFiles: File[] = [];

  // 1. Inspect DataTransfer items (prioritize PNG first so transparency is preserved!)
  if (dt.items && dt.items.length > 0) {
    const items = Array.from(dt.items);
    const ordered = [...items].sort((a, b) => {
      const aPng = a.type === 'image/png' ? 0 : a.type.startsWith('image/') ? 1 : 2;
      const bPng = b.type === 'image/png' ? 0 : b.type.startsWith('image/') ? 1 : 2;
      return aPng - bPng;
    });

    for (const item of ordered) {
      if (item.kind === 'file') {
        const f = item.getAsFile();
        if (f && (f.type.startsWith('image/') || isSupportedImageFile(f))) {
          candidateFiles.push(f);
        }
      }
    }
  }

  // 2. Also inspect clipboardData.files (File Explorer copy-paste)
  if (dt.files && dt.files.length > 0) {
    for (const f of Array.from(dt.files)) {
      if (f.type.startsWith('image/') || isSupportedImageFile(f)) {
        if (!candidateFiles.includes(f)) {
          candidateFiles.push(f);
        }
      }
    }
  }

  for (const file of candidateFiles) {
    const payload = await decodeFileToClipboardPayload(file, 'event');
    if (payload) return payload;
  }

  // 3. Fallback: if HTML fragment contains a data:image/* URI (e.g., some apps copy <img src="data:image/png;base64,...">)
  const html = dt.getData('text/html');
  if (html) {
    const match = html.match(/src=["'](data:image\/[a-zA-Z0-9.+-]+;base64,[^"']+)["']/i);
    if (match && match[1]) {
      try {
        const resp = await fetch(match[1]);
        const blob = await resp.blob();
        const ext = (blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
        const file = new File([blob], `clipboard.${ext}`, { type: blob.type || 'image/png' });
        const payload = await decodeFileToClipboardPayload(file, 'event');
        if (payload) return payload;
      } catch {
        // Ignore malformed data URLs
      }
    }
  }

  return null;
}

/**
 * Reads an image directly from the global OS clipboard (via Electron native
 * clipboard IPC first for lossless alpha support, then Web Async Clipboard API).
 */
export async function readImageFromGlobalClipboard(): Promise<ClipboardImagePayload | null> {
  // 1. Electron desktop native clipboard (preserves exact OS RGBA PNG transparency)
  const bridge = getDesktopBridge();
  if (bridge?.readClipboardImage) {
    try {
      const res = await bridge.readClipboardImage();
      if (res && res.hasImage && res.pngBytes && res.pngBytes.length > 0) {
        const bytes = res.pngBytes instanceof Uint8Array ? res.pngBytes : new Uint8Array(res.pngBytes);
        const copy = new Uint8Array(bytes.byteLength);
        copy.set(bytes);
        const blob = new Blob([copy.buffer], { type: 'image/png' });
        const file = new File([blob], 'clipboard-image.png', { type: 'image/png' });
        const payload = await decodeFileToClipboardPayload(file, 'electron');
        if (payload) return payload;
      }
    } catch {
      // Fall through to Web Async Clipboard API
    }
  }

  // 2. Web Async Clipboard API (navigator.clipboard.read)
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.read === 'function') {
    try {
      const items = await navigator.clipboard.read();
      const preferredOrder = [
        'image/png',
        'image/webp',
        'image/gif',
        'image/bmp',
        'image/tiff',
        'image/jpeg',
      ];
      for (const item of items) {
        const imageTypes = item.types.filter((t) => t.startsWith('image/'));
        if (imageTypes.length === 0) continue;
        imageTypes.sort((a, b) => {
          const ia = preferredOrder.indexOf(a);
          const ib = preferredOrder.indexOf(b);
          return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        });
        for (const mime of imageTypes) {
          const blob = await item.getType(mime);
          if (!blob || blob.size === 0) continue;
          const ext = (mime.split('/')[1] || 'png').replace('jpeg', 'jpg');
          const file = new File([blob], `clipboard.${ext}`, { type: mime });
          const payload = await decodeFileToClipboardPayload(file, 'async_api');
          if (payload) return payload;
        }
      }
    } catch {
      // Permission denied or empty clipboard
    }
  }

  return null;
}

/**
 * Renders a PixelGrid at exact 1:1 resolution with full RGBA transparency (no matte!)
 * into a lossless PNG and writes it to the global OS clipboard so users can paste
 * directly into Photoshop, Aseprite, Discord, Paint.NET, etc.
 */
export async function writePixelGridToSystemClipboard(
  grid: (string | null)[][],
  width: number,
  height: number
): Promise<boolean> {
  if (width <= 0 || height <= 0) return false;
  try {
    const canvas = getCachedPixelGridCanvas(grid, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png')
    );
    if (!blob) return false;

    let wroteElectron = false;
    const bridge = getDesktopBridge();
    if (bridge?.writeClipboardImage) {
      try {
        const arrBuf = await blob.arrayBuffer();
        const res = await bridge.writeClipboardImage(new Uint8Array(arrBuf));
        wroteElectron = Boolean(res?.ok);
      } catch {
        wroteElectron = false;
      }
    }

    let wroteWeb = false;
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.write === 'function' &&
      typeof ClipboardItem !== 'undefined'
    ) {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        wroteWeb = true;
      } catch {
        wroteWeb = false;
      }
    }

    return wroteElectron || wroteWeb;
  } catch {
    return false;
  }
}

/**
 * Converts a decoded clipboard RGBA image into a PixelGrid fitted/placed onto
 * a target canvas size while strictly preserving RGBA transparency.
 */
export function rasterizeClipboardImageToGrid(
  payload: ClipboardImagePayload,
  targetWidth: number,
  targetHeight: number,
  fitMode: 'original' | 'fit' | 'fill' = 'original'
): (string | null)[][] {
  const safeW = Math.max(1, targetWidth);
  const safeH = Math.max(1, targetHeight);
  const srcW = payload.width;
  const srcH = payload.height;

  // Exact 1:1 size match -> direct lossless conversion with zero resampling!
  if (srcW === safeW && srcH === safeH) {
    return rgbaBufferToPixelGrid(payload.rgba.data, srcW, srcH).grid;
  }

  // Create source canvas from RGBA without any background fill
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = srcW;
  srcCanvas.height = srcH;
  const srcCtx = srcCanvas.getContext('2d');
  if (!srcCtx) return rgbaBufferToPixelGrid(payload.rgba.data, srcW, srcH).grid;
  const srcImg = new ImageData(new Uint8ClampedArray(payload.rgba.data), srcW, srcH);
  srcCtx.putImageData(srcImg, 0, 0);

  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = safeW;
  dstCanvas.height = safeH;
  const dstCtx = dstCanvas.getContext('2d', { willReadFrequently: true });
  if (!dstCtx) return rgbaBufferToPixelGrid(payload.rgba.data, srcW, srcH).grid;

  // Strictly transparent destination (NEVER paint white/black background!)
  dstCtx.clearRect(0, 0, safeW, safeH);
  dstCtx.imageSmoothingEnabled = false;

  if (fitMode === 'original' && srcW <= safeW && srcH <= safeH) {
    const ox = Math.floor((safeW - srcW) / 2);
    const oy = Math.floor((safeH - srcH) / 2);
    dstCtx.drawImage(srcCanvas, ox, oy);
  } else if (fitMode === 'fill') {
    const scale = Math.max(safeW / srcW, safeH / srcH);
    const drawW = Math.max(1, Math.round(srcW * scale));
    const drawH = Math.max(1, Math.round(srcH * scale));
    const ox = Math.floor((safeW - drawW) / 2);
    const oy = Math.floor((safeH - drawH) / 2);
    dstCtx.drawImage(srcCanvas, 0, 0, srcW, srcH, ox, oy, drawW, drawH);
  } else {
    // 'fit' OR 'original' when source exceeds canvas bounds
    const scale = Math.min(safeW / srcW, safeH / srcH);
    const drawW = Math.max(1, Math.round(srcW * scale));
    const drawH = Math.max(1, Math.round(srcH * scale));
    const ox = Math.floor((safeW - drawW) / 2);
    const oy = Math.floor((safeH - drawH) / 2);
    dstCtx.drawImage(srcCanvas, 0, 0, srcW, srcH, ox, oy, drawW, drawH);
  }

  const outData = dstCtx.getImageData(0, 0, safeW, safeH).data;
  return rgbaBufferToPixelGrid(outData, safeW, safeH).grid;
}

export function formatClipboardBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
