import JSZip from 'jszip';
import { writePsdUint8Array, Layer as PsdLayer, Psd } from 'ag-psd';
import { Frame, Layer, ProjectState } from '../types';
import { frameToCanvas, generateCombatJson } from './pixelMath';

function parseHexRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) || 0;
    const g = parseInt(clean[1] + clean[1], 16) || 0;
    const b = parseInt(clean[2] + clean[2], 16) || 0;
    return [r, g, b];
  }
  const full = clean.padEnd(6, '0').slice(0, 6);
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
}

export function layerToCanvas(
  layer: Layer,
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const imgData = ctx.createImageData(width, height);
  const { data } = imgData;

  for (let y = 0; y < height; y++) {
    const row = layer.pixels[y];
    if (!row) continue;
    for (let x = 0; x < width; x++) {
      const hex = row[x];
      if (!hex) continue;
      const [r, g, b] = parseHexRgb(hex);
      const idx = (y * width + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

export function downloadUint8Array(
  bytes: Uint8Array,
  filename: string,
  mimeType: string = 'application/octet-stream'
): void {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy.buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// -------------------------------------------------------------
// PIXELCLASH STUDIO (.pcs) Native Compressed Project Container
// -------------------------------------------------------------
export async function exportProjectAsPcs(project: ProjectState): Promise<Uint8Array> {
  const zip = new JSZip();

  const manifest = {
    format: 'PIXELCLASH_STUDIO_PROJECT',
    version: '2.0',
    app: 'PixelClash Studio',
    projectName: project.name,
    dimensions: { width: project.width, height: project.height },
    framesCount: project.frames.length,
    groupsCount: project.layerGroups?.length || 0,
    savedAt: new Date().toISOString(),
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('project.json', JSON.stringify(project));
  zip.file('combat_framedata.json', generateCombatJson(project));

  // Embed active frame thumbnail PNG for external launchers / previews
  const activeFrame =
    project.frames[project.currentFrameIndex] || project.frames[0];
  if (activeFrame) {
    const thumbCanvas = frameToCanvas(activeFrame, project.width, project.height, 4);
    const thumbDataUrl = thumbCanvas.toDataURL('image/png');
    const base64 = thumbDataUrl.split(',')[1];
    if (base64) {
      zip.file('thumbnail.png', base64, { base64: true });
    }
  }

  return await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

// -------------------------------------------------------------
// PSD (Adobe Photoshop) Binary Exporter via ag-psd
// -------------------------------------------------------------
export function exportProjectAsPsd(
  project: ProjectState,
  currentFrameIndex: number = project.currentFrameIndex
): Uint8Array {
  const width = Math.max(1, project.width);
  const height = Math.max(1, project.height);
  const frames = project.frames.length > 0 ? project.frames : [];
  const safeFrameIndex = Math.min(Math.max(0, currentFrameIndex), Math.max(0, frames.length - 1));
  const activeFrame = frames[safeFrameIndex];

  const compositeCanvas = activeFrame
    ? frameToCanvas(activeFrame, width, height, 1)
    : (() => {
        const c = document.createElement('canvas');
        c.width = width;
        c.height = height;
        return c;
      })();

  const mapLayerToPsd = (layer: Layer): PsdLayer => ({
    name: layer.name || 'Capa',
    left: 0,
    top: 0,
    right: width,
    bottom: height,
    hidden: !layer.visible,
    opacity: Math.max(0, Math.min(1, layer.opacity ?? 1)),
    blendMode: 'normal',
    transparencyProtected: layer.locked,
    canvas: layerToCanvas(layer, width, height),
  });

  let children: PsdLayer[] = [];

  if (frames.length <= 1 && activeFrame) {
    children = activeFrame.layers.map(mapLayerToPsd);
  } else {
    // Store every frame as an organized Photoshop folder group so Photoshop displays
    // the active frame and preserves all frames & layers cleanly on re-import.
    children = frames.map((frame: Frame, idx: number) => ({
      name: `[Frame #${idx + 1}] ${frame.name || `Frame ${idx + 1}`}`,
      opened: idx === safeFrameIndex,
      hidden: idx !== safeFrameIndex,
      children: frame.layers.map(mapLayerToPsd),
    }));
  }

  const psdDoc: Psd = {
    width,
    height,
    channels: 4,
    bitsPerChannel: 8,
    colorMode: 3, // RGB
    canvas: compositeCanvas,
    children,
  };

  return writePsdUint8Array(psdDoc);
}

// -------------------------------------------------------------
// ASEPRITE (.ase) Spec-Compliant Binary Exporter (32-bpp RGBA)
// -------------------------------------------------------------
interface AseChunk {
  type: number;
  payload: Uint8Array;
}

function createChunkBytes(type: number, payload: Uint8Array): Uint8Array {
  const totalSize = 6 + payload.byteLength;
  const out = new Uint8Array(totalSize);
  const view = new DataView(out.buffer);
  view.setUint32(0, totalSize, true);
  view.setUint16(4, type, true);
  out.set(payload, 6);
  return out;
}

function buildLayerChunk(layer: Layer): AseChunk {
  const encoder = new TextEncoder();
  const nameBytes = encoder.encode(layer.name || 'Capa');
  // 16 bytes fixed header + 2 bytes name length + nameBytes
  const payload = new Uint8Array(18 + nameBytes.byteLength);
  const view = new DataView(payload.buffer);

  const flags = (layer.visible ? 1 : 0) | (layer.locked ? 0 : 2);
  view.setUint16(0, flags, true); // flags: bit 1=visible, bit 2=editable
  view.setUint16(2, 0, true); // layer type 0 = Normal image layer
  view.setUint16(4, 0, true); // child level
  view.setUint16(6, 0, true); // default layer width (ignored)
  view.setUint16(8, 0, true); // default layer height (ignored)
  view.setUint16(10, 0, true); // blend mode 0 = Normal
  view.setUint8(12, Math.round(Math.max(0, Math.min(1, layer.opacity ?? 1)) * 255));
  // bytes 13..15 reserved (0)
  view.setUint16(16, nameBytes.byteLength, true);
  payload.set(nameBytes, 18);

  return { type: 0x2004, payload };
}

function collectProjectColors(project: ProjectState): string[] {
  const seen = new Set<string>();
  const colors: string[] = [];

  for (const frame of project.frames) {
    for (const layer of frame.layers) {
      for (const row of layer.pixels) {
        for (const px of row) {
          if (!px) continue;
          const norm = px.toLowerCase();
          if (!seen.has(norm)) {
            seen.add(norm);
            colors.push(norm);
            if (colors.length >= 256) return colors;
          }
        }
      }
    }
  }

  if (colors.length === 0) {
    colors.push('#000000', '#ffffff');
  }
  return colors;
}

function buildPaletteChunk(colors: string[]): AseChunk {
  const count = Math.min(256, Math.max(1, colors.length));
  // 20 bytes header + 6 bytes per palette entry
  const payload = new Uint8Array(20 + count * 6);
  const view = new DataView(payload.buffer);

  view.setUint32(0, count, true); // new palette size
  view.setUint32(4, 0, true); // first color index
  view.setUint32(8, count - 1, true); // last color index
  // bytes 12..19 reserved (0)

  for (let i = 0; i < count; i++) {
    const [r, g, b] = parseHexRgb(colors[i] || '#000000');
    const entryOffset = 20 + i * 6;
    view.setUint16(entryOffset, 0, true); // entry flags
    view.setUint8(entryOffset + 2, r);
    view.setUint8(entryOffset + 3, g);
    view.setUint8(entryOffset + 4, b);
    view.setUint8(entryOffset + 5, 255);
  }

  return { type: 0x2019, payload };
}

function buildTagsChunk(project: ProjectState): AseChunk | null {
  const sourceGroups =
    project.layerGroups && project.layerGroups.length > 0
      ? project.layerGroups
      : project.actionTags;

  const validTags = (sourceGroups || []).filter(
    (g) => Array.isArray(g.frameIndices) && g.frameIndices.length > 0
  );
  if (validTags.length === 0) return null;

  const encoder = new TextEncoder();
  const encodedTags = validTags.map((tag) => {
    const sorted = [...tag.frameIndices].sort((a, b) => a - b);
    const fromFrame = Math.max(0, Math.min(project.frames.length - 1, sorted[0]));
    const toFrame = Math.max(fromFrame, Math.min(project.frames.length - 1, sorted[sorted.length - 1]));
    const nameBytes = encoder.encode(tag.name || 'Anim');
    const [r, g, b] = parseHexRgb(tag.color || '#f59e0b');
    const loopDir = tag.playbackMode === 'pingpong' ? 2 : 0;
    return { fromFrame, toFrame, loopDir, r, g, b, nameBytes };
  });

  const tagsByteLen = encodedTags.reduce((sum, t) => sum + 19 + t.nameBytes.byteLength, 0);
  const payload = new Uint8Array(10 + tagsByteLen);
  const view = new DataView(payload.buffer);

  view.setUint16(0, encodedTags.length, true); // number of tags
  // bytes 2..9 reserved (0)

  let pos = 10;
  for (const tag of encodedTags) {
    view.setUint16(pos, tag.fromFrame, true);
    view.setUint16(pos + 2, tag.toFrame, true);
    view.setUint8(pos + 4, tag.loopDir);
    view.setUint16(pos + 5, 0, true); // repeat
    // pos + 7..12 reserved (6 bytes)
    view.setUint8(pos + 13, tag.r);
    view.setUint8(pos + 14, tag.g);
    view.setUint8(pos + 15, tag.b);
    view.setUint8(pos + 16, 0); // extra zero
    view.setUint16(pos + 17, tag.nameBytes.byteLength, true);
    payload.set(tag.nameBytes, pos + 19);
    pos += 19 + tag.nameBytes.byteLength;
  }

  return { type: 0x2018, payload };
}

function buildCelChunk(
  layer: Layer,
  layerIndex: number,
  canvasWidth: number,
  canvasHeight: number
): AseChunk | null {
  // Trim transparent bounding box to produce compact, Aseprite-native cels
  let minX = canvasWidth;
  let minY = canvasHeight;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < canvasHeight; y++) {
    const row = layer.pixels[y];
    if (!row) continue;
    for (let x = 0; x < canvasWidth; x++) {
      if (row[x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return null; // Empty layer cel in this frame
  }

  const celW = maxX - minX + 1;
  const celH = maxY - minY + 1;
  // 16 bytes cel header + 4 bytes (width, height) + RGBA pixel data
  const payload = new Uint8Array(20 + celW * celH * 4);
  const view = new DataView(payload.buffer);

  view.setUint16(0, layerIndex, true);
  view.setInt16(2, minX, true);
  view.setInt16(4, minY, true);
  view.setUint8(6, Math.round(Math.max(0, Math.min(1, layer.opacity ?? 1)) * 255));
  view.setUint16(7, 0, true); // cel type 0 = Raw Image Data
  view.setInt16(9, 0, true); // z-index
  // bytes 11..15 reserved (0)
  view.setUint16(16, celW, true);
  view.setUint16(18, celH, true);

  let pxOffset = 20;
  for (let y = minY; y <= maxY; y++) {
    const row = layer.pixels[y];
    for (let x = minX; x <= maxX; x++) {
      const hex = row?.[x];
      if (hex) {
        const [r, g, b] = parseHexRgb(hex);
        payload[pxOffset] = r;
        payload[pxOffset + 1] = g;
        payload[pxOffset + 2] = b;
        payload[pxOffset + 3] = 255;
      }
      pxOffset += 4;
    }
  }

  return { type: 0x2005, payload };
}

export function exportProjectAsAse(project: ProjectState): Uint8Array {
  const width = Math.max(1, project.width);
  const height = Math.max(1, project.height);
  const frames = project.frames.length > 0 ? project.frames : [];
  const paletteColors = collectProjectColors(project);

  // Align layer definitions across frames using frame 0's layer stack as base
  const templateLayers = frames[0]?.layers || [];
  const encodedFrames: Uint8Array[] = [];

  frames.forEach((frame, frameIndex) => {
    const chunks: AseChunk[] = [];

    if (frameIndex === 0) {
      templateLayers.forEach((layer) => {
        chunks.push(buildLayerChunk(layer));
      });
      chunks.push(buildPaletteChunk(paletteColors));
      const tagsChunk = buildTagsChunk(project);
      if (tagsChunk) chunks.push(tagsChunk);
    }

    // Export cels per layer (matching by index or layer name)
    templateLayers.forEach((tplLayer, layerIdx) => {
      const targetLayer =
        frame.layers[layerIdx] ||
        frame.layers.find((l) => l.name === tplLayer.name);
      if (!targetLayer) return;
      const celChunk = buildCelChunk(targetLayer, layerIdx, width, height);
      if (celChunk) chunks.push(celChunk);
    });

    const chunkBuffers = chunks.map((c) => createChunkBytes(c.type, c.payload));
    const chunksTotalSize = chunkBuffers.reduce((acc, buf) => acc + buf.byteLength, 0);
    const frameSize = 16 + chunksTotalSize;
    const durationMs =
      frame.durationMs && frame.durationMs > 0
        ? Math.min(65535, Math.round(frame.durationMs))
        : Math.max(16, Math.round(((frame.durationTicks || 4) / 60) * 1000));

    const frameBuf = new Uint8Array(frameSize);
    const frameView = new DataView(frameBuf.buffer);
    frameView.setUint32(0, frameSize, true);
    frameView.setUint16(4, 0xf1fa, true);
    frameView.setUint16(6, Math.min(0xffff, chunks.length), true);
    frameView.setUint16(8, durationMs, true);
    frameView.setUint16(10, 0, true);
    frameView.setUint32(12, chunks.length, true);

    let writePos = 16;
    for (const buf of chunkBuffers) {
      frameBuf.set(buf, writePos);
      writePos += buf.byteLength;
    }

    encodedFrames.push(frameBuf);
  });

  const framesTotalBytes = encodedFrames.reduce((acc, f) => acc + f.byteLength, 0);
  const totalFileSize = 128 + framesTotalBytes;
  const output = new Uint8Array(totalFileSize);
  const headerView = new DataView(output.buffer);

  const firstFrameDuration =
    frames[0]?.durationMs ||
    Math.max(16, Math.round((((frames[0]?.durationTicks || 4) / 60) * 1000)));

  headerView.setUint32(0, totalFileSize, true); // File size
  headerView.setUint16(4, 0xa5e0, true); // Magic number
  headerView.setUint16(6, frames.length, true); // Number of frames
  headerView.setUint16(8, width, true); // Width
  headerView.setUint16(10, height, true); // Height
  headerView.setUint16(12, 32, true); // Color depth: 32 bpp RGBA
  headerView.setUint32(14, 1, true); // Flags: 1 = Layer opacity has valid value
  headerView.setUint16(18, firstFrameDuration, true); // Default speed (ms)
  headerView.setUint8(28, 0); // Transparent color index
  headerView.setUint16(32, Math.min(256, paletteColors.length), true); // Color count
  headerView.setUint8(34, 1); // Pixel width ratio
  headerView.setUint8(35, 1); // Pixel height ratio
  headerView.setInt16(36, 0, true); // Grid X
  headerView.setInt16(38, 0, true); // Grid Y
  headerView.setUint16(40, 16, true); // Grid width
  headerView.setUint16(42, 16, true); // Grid height

  let offset = 128;
  for (const fBuf of encodedFrames) {
    output.set(fBuf, offset);
    offset += fBuf.byteLength;
  }

  return output;
}
