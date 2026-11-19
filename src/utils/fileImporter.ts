import JSZip from 'jszip';
import { readPsd } from 'ag-psd';
import { ActionTag, Frame, Layer, ProjectState } from '../types';
import { createEmptyGrid } from './pixelMath';

export interface ImportResult {
  name: string;
  width: number;
  height: number;
  frames: Frame[];
  actionTags?: ActionTag[];
  projectState?: Partial<ProjectState>;
}

// Convert canvas or ImageData to 2D pixel grid
export function canvasToPixelGrid(
  canvas: HTMLCanvasElement | ImageData,
  width: number,
  height: number
): (string | null)[][] {
  const grid = createEmptyGrid(width, height);
  let imgData: ImageData;

  if (canvas instanceof ImageData) {
    imgData = canvas;
  } else {
    const ctx = canvas.getContext('2d');
    if (!ctx) return grid;
    imgData = ctx.getImageData(0, 0, width, height);
  }

  const { data } = imgData;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a > 10) {
        const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        grid[y][x] = hex;
      } else {
        grid[y][x] = null;
      }
    }
  }
  return grid;
}

// Convert PSD layer canvas (respecting left/top bounds) to full-canvas pixel grid
function psdLayerCanvasToGrid(
  canvas: HTMLCanvasElement,
  canvasWidth: number,
  canvasHeight: number,
  offsetX: number = 0,
  offsetY: number = 0
): (string | null)[][] {
  const grid = createEmptyGrid(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) return grid;
  const w = canvas.width;
  const h = canvas.height;
  if (w <= 0 || h <= 0) return grid;

  const { data } = ctx.getImageData(0, 0, w, h);
  for (let y = 0; y < h; y++) {
    const destY = offsetY + y;
    if (destY < 0 || destY >= canvasHeight) continue;
    for (let x = 0; x < w; x++) {
      const destX = offsetX + x;
      if (destX < 0 || destX >= canvasWidth) continue;
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      if (a > 10) {
        grid[destY][destX] = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
      }
    }
  }
  return grid;
}

// -------------------------------------------------------------
// PSD (Photoshop) Importer (Single frame or multi-frame folders)
// -------------------------------------------------------------
export async function importPsd(file: File): Promise<ImportResult> {
  const buffer = await file.arrayBuffer();
  const psd = readPsd(buffer);

  const width = psd.width;
  const height = psd.height;

  const defaultHitboxes = [
    {
      id: 'hb-def',
      type: 'hurtbox' as const,
      x: Math.floor(width * 0.2),
      y: Math.floor(height * 0.2),
      w: Math.floor(width * 0.6),
      h: Math.floor(height * 0.7),
      name: 'Hurtbox PSD',
    },
  ];

  // Check if exported as multi-frame "[Frame #N]" folder groups
  const hasFrameFolders =
    psd.children &&
    psd.children.length > 0 &&
    psd.children.some(
      (c) => Array.isArray(c.children) && c.children.length > 0 && /^\[Frame #\d+\]/i.test(c.name || '')
    );

  if (hasFrameFolders && psd.children) {
    const importedFrames: Frame[] = [];
    psd.children.forEach((folder, fIdx) => {
      if (!folder.children || folder.children.length === 0) return;
      const frameLayers: Layer[] = [];
      for (const child of folder.children) {
        if (child.canvas) {
          frameLayers.push({
            id: `layer-psd-${fIdx}-${Math.random().toString(36).slice(2, 7)}`,
            name: child.name || 'Capa PSD',
            visible: !child.hidden,
            locked: !!child.transparencyProtected,
            opacity: child.opacity !== undefined ? child.opacity : 1,
            pixels: psdLayerCanvasToGrid(
              child.canvas,
              width,
              height,
              child.left || 0,
              child.top || 0
            ),
          });
        }
      }
      if (frameLayers.length > 0) {
        const cleanName = (folder.name || `Frame ${fIdx + 1}`).replace(/^\[Frame #\d+\]\s*/i, '');
        importedFrames.push({
          id: `frame-psd-${Date.now()}-${fIdx}`,
          name: cleanName || `Fotograma ${fIdx + 1}`,
          durationTicks: 4,
          phase: fIdx === 1 ? 'startup' : fIdx === 2 ? 'active' : 'neutral',
          layers: frameLayers,
          hitboxes: fIdx === 0 ? defaultHitboxes : [],
        });
      }
    });

    if (importedFrames.length > 0) {
      return {
        name: file.name.replace(/\.[^/.]+$/, ''),
        width,
        height,
        frames: importedFrames,
      };
    }
  }

  // Standard flat/nested PSD import into Frame 1 layers
  const layers: Layer[] = [];
  const collectPsdLayers = (children: typeof psd.children) => {
    if (!children) return;
    for (const child of children) {
      if (child.children && child.children.length > 0) {
        collectPsdLayers(child.children);
      } else if (child.canvas) {
        layers.push({
          id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: child.name || 'Capa PSD',
          visible: !child.hidden,
          locked: !!child.transparencyProtected,
          opacity: child.opacity !== undefined ? child.opacity : 1,
          pixels: psdLayerCanvasToGrid(
            child.canvas,
            width,
            height,
            child.left || 0,
            child.top || 0
          ),
        });
      }
    }
  };

  collectPsdLayers(psd.children);

  if (layers.length === 0 && psd.canvas) {
    const grid = canvasToPixelGrid(psd.canvas, width, height);
    layers.push({
      id: 'layer-composite',
      name: 'Photoshop Composite',
      visible: true,
      locked: false,
      opacity: 1,
      pixels: grid,
    });
  }

  const defaultFrame: Frame = {
    id: `frame-${Date.now()}`,
    name: 'PSD Import',
    durationTicks: 4,
    phase: 'neutral',
    layers:
      layers.length > 0
        ? layers
        : [
            {
              id: 'layer-1',
              name: 'Capa 1',
              visible: true,
              locked: false,
              opacity: 1,
              pixels: createEmptyGrid(width, height),
            },
          ],
    hitboxes: defaultHitboxes,
  };

  return {
    name: file.name.replace(/\.[^/.]+$/, ''),
    width,
    height,
    frames: [defaultFrame],
  };
}

// Decompress zlib-wrapped deflate data (Aseprite compressed cels celType=2)
async function inflateZlibBytes(compressed: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Tu navegador no soporta DecompressionStream para cels .ase comprimidos.');
  }
  const copy = new Uint8Array(compressed.byteLength);
  copy.set(compressed);
  const stream = new Blob([copy.buffer]).stream().pipeThrough(new DecompressionStream('deflate'));
  const ab = await new Response(stream).arrayBuffer();
  return new Uint8Array(ab);
}

interface ParsedAseLayerMeta {
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  type: number;
}

// -------------------------------------------------------------
// ASEPRITE (.ase / .aseprite) Binary Importer
// -------------------------------------------------------------
export async function importAseprite(file: File): Promise<ImportResult> {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);

  if (buffer.byteLength < 128) {
    throw new Error('Archivo .ase inválido o demasiado pequeño.');
  }

  const magic = view.getUint16(4, true);
  if (magic !== 0xa5e0) {
    throw new Error('Formato .ase no reconocido (cabecera mágica inválida).');
  }

  const numFrames = view.getUint16(6, true) || 1;
  const width = view.getUint16(8, true) || 48;
  const height = view.getUint16(10, true) || 48;
  const colorDepth = view.getUint16(12, true); // 32 = RGBA, 16 = Grayscale, 8 = Indexed
  const headerSpeedMs = view.getUint16(18, true) || 100;
  const transparentIndex = view.getUint8(28);

  const aseLayers: ParsedAseLayerMeta[] = [];
  const palette: string[] = new Array(256).fill('#000000');
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
        const opacityByte = view.getUint8(chunkOffset + 18);
        const nameLen = view.getUint16(chunkOffset + 22, true);
        let layerName = `Capa ${aseLayers.length + 1}`;
        if (chunkOffset + 24 + nameLen <= chunkEnd && nameLen > 0) {
          layerName = decoder.decode(new Uint8Array(buffer, chunkOffset + 24, nameLen));
        }
        aseLayers.push({
          name: layerName,
          visible: (flags & 1) !== 0,
          locked: (flags & 2) === 0,
          opacity: opacityByte > 0 ? opacityByte / 255 : 1,
          type: layerType,
        });
      }

      // Palette Chunk (0x2019)
      if (chunkType === 0x2019 && chunkOffset + 26 <= chunkEnd) {
        const firstIdx = view.getUint32(chunkOffset + 10, true);
        const lastIdx = view.getUint32(chunkOffset + 14, true);
        let pOffset = chunkOffset + 26;
        for (let idx = firstIdx; idx <= lastIdx && pOffset + 6 <= chunkEnd; idx++) {
          const entryFlags = view.getUint16(pOffset, true);
          const r = view.getUint8(pOffset + 2);
          const g = view.getUint8(pOffset + 3);
          const b = view.getUint8(pOffset + 4);
          palette[idx] = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
          pOffset += 6;
          if ((entryFlags & 1) !== 0 && pOffset + 2 <= chunkEnd) {
            const nameLen = view.getUint16(pOffset, true);
            pOffset += 2 + nameLen;
          }
        }
      }

      // Cel Chunk (0x2005)
      if (chunkType === 0x2005 && chunkOffset + 22 <= chunkEnd) {
        const layerIndex = view.getUint16(chunkOffset + 6, true);
        const celX = view.getInt16(chunkOffset + 8, true);
        const celY = view.getInt16(chunkOffset + 10, true);
        const celType = view.getUint16(chunkOffset + 13, true); // 0=Raw, 1=Linked, 2=Compressed

        if ((celType === 0 || celType === 2) && chunkOffset + 26 <= chunkEnd) {
          const celW = view.getUint16(chunkOffset + 22, true);
          const celH = view.getUint16(chunkOffset + 24, true);
          let pixelBytes: Uint8Array | null = null;

          if (celType === 0) {
            pixelBytes = new Uint8Array(buffer, chunkOffset + 26, chunkEnd - (chunkOffset + 26));
          } else {
            try {
              const compressed = new Uint8Array(buffer, chunkOffset + 26, chunkEnd - (chunkOffset + 26));
              pixelBytes = await inflateZlibBytes(compressed);
            } catch {
              pixelBytes = null;
            }
          }

          if (pixelBytes && celW > 0 && celH > 0) {
            const layerGrid = cels.get(layerIndex) || createEmptyGrid(width, height);
            const bpp = colorDepth === 8 ? 1 : colorDepth === 16 ? 2 : 4;
            let pIdx = 0;

            for (let cy = 0; cy < celH; cy++) {
              for (let cx = 0; cx < celW; cx++) {
                if (pIdx + bpp > pixelBytes.byteLength) break;
                let hex: string | null = null;

                if (bpp === 4) {
                  const r = pixelBytes[pIdx];
                  const g = pixelBytes[pIdx + 1];
                  const b = pixelBytes[pIdx + 2];
                  const a = pixelBytes[pIdx + 3];
                  if (a > 10) {
                    hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
                  }
                } else if (bpp === 2) {
                  const v = pixelBytes[pIdx];
                  const a = pixelBytes[pIdx + 1];
                  if (a > 10) {
                    hex = `#${((1 << 24) + (v << 16) + (v << 8) + v).toString(16).slice(1)}`;
                  }
                } else {
                  const idx = pixelBytes[pIdx];
                  if (idx !== transparentIndex && palette[idx]) {
                    hex = palette[idx];
                  }
                }

                pIdx += bpp;
                const destX = celX + cx;
                const destY = celY + cy;
                if (hex && destX >= 0 && destX < width && destY >= 0 && destY < height) {
                  layerGrid[destY][destX] = hex;
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
          const tagHex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
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

  // Ensure at least one layer template exists
  const imageLayerIndices = aseLayers
    .map((meta, idx) => ({ meta, idx }))
    .filter((item) => item.meta.type === 0);

  const frames: Frame[] = rawFrameEntries.map((entry, fIdx) => {
    const layers: Layer[] =
      imageLayerIndices.length > 0
        ? imageLayerIndices.map(({ meta, idx }) => ({
            id: `layer-ase-${fIdx}-${idx}`,
            name: meta.name,
            visible: meta.visible,
            locked: meta.locked,
            opacity: meta.opacity,
            pixels: entry.cels.get(idx) || createEmptyGrid(width, height),
          }))
        : [
            {
              id: `layer-ase-${fIdx}-0`,
              name: 'Capa Aseprite',
              visible: true,
              locked: false,
              opacity: 1,
              pixels: entry.cels.get(0) || createEmptyGrid(width, height),
            },
          ];

    return {
      id: `frame-ase-${fIdx}-${Date.now()}`,
      name: `Fotograma #${fIdx + 1}`,
      durationTicks: entry.durationTicks,
      durationMs: entry.durationMs,
      phase: fIdx === 1 ? 'startup' : fIdx === 2 ? 'active' : 'neutral',
      layers,
      hitboxes: [],
    };
  });

  return {
    name: file.name.replace(/\.[^/.]+$/, ''),
    width,
    height,
    frames:
      frames.length > 0
        ? frames
        : [
            {
              id: 'frame-1',
              name: 'Frame 1',
              durationTicks: 4,
              phase: 'neutral',
              layers: [
                {
                  id: 'layer-1',
                  name: 'Capa 1',
                  visible: true,
                  locked: false,
                  opacity: 1,
                  pixels: createEmptyGrid(width, height),
                },
              ],
              hitboxes: [],
            },
          ],
    actionTags,
  };
}

// -------------------------------------------------------------
// PIXELCLASH STUDIO (.pcs) Native Project Container Importer
// -------------------------------------------------------------
export async function importPcs(file: File): Promise<ImportResult> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let projectJsonText = '';

  // Detect ZIP magic header ("PK") used by compressed .pcs packages
  if (bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const zip = await JSZip.loadAsync(buffer);
    const projectEntry = zip.file('project.json');
    if (!projectEntry) {
      throw new Error('Archivo .pcs corrupto: falta project.json interno.');
    }
    projectJsonText = await projectEntry.async('string');
  } else {
    projectJsonText = new TextDecoder().decode(bytes);
  }

  const parsed = JSON.parse(projectJsonText) as Partial<ProjectState>;
  if (!parsed || !parsed.width || !parsed.height || !Array.isArray(parsed.frames)) {
    throw new Error('Estructura de proyecto .pcs inválida.');
  }

  return {
    name: parsed.name || file.name.replace(/\.[^/.]+$/, ''),
    width: parsed.width,
    height: parsed.height,
    frames: parsed.frames,
    actionTags: parsed.actionTags || parsed.layerGroups,
    projectState: parsed,
  };
}

// -------------------------------------------------------------
// Universal File Importer
// -------------------------------------------------------------
export async function importGraphicFile(file: File): Promise<ImportResult> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'pcs') {
    return importPcs(file);
  } else if (ext === 'psd') {
    return importPsd(file);
  } else if (ext === 'ase' || ext === 'aseprite') {
    return importAseprite(file);
  } else if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp') {
    // Single Image Import
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const w = img.width;
        const h = img.height;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context failure'));
        ctx.drawImage(img, 0, 0);
        const grid = canvasToPixelGrid(canvas, w, h);

        resolve({
          name: file.name.replace(/\.[^/.]+$/, ''),
          width: w,
          height: h,
          frames: [
            {
              id: `frame-${Date.now()}`,
              name: 'Imported PNG',
              durationTicks: 4,
              phase: 'neutral',
              layers: [
                {
                  id: 'layer-imported',
                  name: 'Base Image',
                  visible: true,
                  locked: false,
                  opacity: 1,
                  pixels: grid
                }
              ],
              hitboxes: []
            }
          ]
        });
      };
      img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
      img.src = URL.createObjectURL(file);
    });
  }

  throw new Error(`Formato .${ext} no soportado. Usa .pcs, .ase, .aseprite, .psd, .png o .json`);
}
