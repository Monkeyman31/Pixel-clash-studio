import {
  DEFAULT_ONION_SKIN_CONFIG,
  DEFAULT_ONION_SKIN_TRAIL_CONFIG,
  Frame,
  LayerGroup,
  MotionPathConfig,
  OnionSkinBlendMode,
  OnionSkinColorMode,
  OnionSkinConfig,
  OnionSkinDetailLevel,
  OnionSkinDisplayMode,
  OnionSkinPresetId,
} from '../types';
import { compositeFrame } from './pixelMath';
import { parseColorToAbgr32Fast } from './renderCache';

export const ONION_DISPLAY_MODE_OPTIONS: {
  id: OnionSkinDisplayMode;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    id: 'ghost',
    label: 'Fantasma',
    shortLabel: 'Fantasma',
    description: 'Fotograma completo semitransparente con colores, sombras, luces, contornos y FX.',
  },
  {
    id: 'tinted_ghost',
    label: 'Fantasma Coloreado',
    shortLabel: 'Fantasma Color',
    description: 'Fotograma completo con detalles, sombras y FX teñido al color elegido.',
  },
  {
    id: 'silhouette',
    label: 'Silueta',
    shortLabel: 'Silueta',
    description: 'Únicamente la forma general del sprite sin detalles internos.',
  },
  {
    id: 'outline',
    label: 'Contorno',
    shortLabel: 'Contorno',
    description: 'Únicamente el borde exterior de la silueta del personaje o efecto.',
  },
  {
    id: 'volume',
    label: 'Solo volumen',
    shortLabel: 'Volumen',
    description: 'Masas tonales simplificadas para leer volumen y luz sin micro-detalles.',
  },
  {
    id: 'base_color',
    label: 'Solo color base',
    shortLabel: 'Color Base',
    description: 'Colores planos principales sin líneas finas ni efectos secundarios.',
  },
  {
    id: 'full',
    label: 'Personalizado (Detalle)',
    shortLabel: 'Detalle',
    description: 'Frame completo sujeto al Nivel de Detalle y mezcla personalizada.',
  },
];

export const ONION_COLOR_MODE_OPTIONS: {
  id: OnionSkinColorMode;
  label: string;
  shortLabel: string;
  hex: string | null;
}[] = [
  { id: 'original', label: 'Mantener colores originales', shortLabel: 'Original', hex: null },
  { id: 'red', label: 'Teñir de rojo', shortLabel: 'Rojo', hex: '#ef4444' },
  { id: 'blue', label: 'Teñir de azul', shortLabel: 'Azul', hex: '#3b82f6' },
  { id: 'green', label: 'Teñir de verde', shortLabel: 'Verde', hex: '#22c55e' },
  { id: 'custom', label: 'Color personalizado', shortLabel: 'Pers.', hex: null },
];

export const ONION_OPACITY_PRESETS = [15, 25, 50, 75] as const;

export const ONION_BLEND_MODE_OPTIONS: {
  id: OnionSkinBlendMode;
  label: string;
  compositeOp: GlobalCompositeOperation;
}[] = [
  { id: 'normal', label: 'Normal', compositeOp: 'source-over' },
  { id: 'multiply', label: 'Multiplicar', compositeOp: 'multiply' },
  { id: 'overlay', label: 'Superponer', compositeOp: 'overlay' },
  { id: 'screen', label: 'Pantalla', compositeOp: 'screen' },
  { id: 'difference', label: 'Diferencia', compositeOp: 'difference' },
  { id: 'lighter', label: 'Trama', compositeOp: 'lighter' },
  { id: 'soft-light', label: 'Luz Suave', compositeOp: 'soft-light' },
];

export const ONION_DETAIL_LEVEL_OPTIONS: {
  id: OnionSkinDetailLevel;
  label: string;
  blockSize: number;
  quantStep: number;
}[] = [
  { id: 'very_low', label: 'Muy Bajo', blockSize: 5, quantStep: 64 },
  { id: 'low', label: 'Bajo', blockSize: 3, quantStep: 48 },
  { id: 'medium', label: 'Medio', blockSize: 2, quantStep: 32 },
  { id: 'high', label: 'Alto', blockSize: 1, quantStep: 16 },
  { id: 'full', label: 'Completo', blockSize: 1, quantStep: 1 },
];

export const ONION_COLOR_SWATCHES_PREV = [
  '#ef4444', // Rojo
  '#3b82f6', // Azul
  '#22c55e', // Verde
  '#00d2ff', // Cian
  '#a855f7', // Violeta
];

export const ONION_COLOR_SWATCHES_NEXT = [
  '#22c55e', // Verde
  '#3b82f6', // Azul
  '#ff9900', // Ámbar
  '#ec4899', // Magenta
  '#eab308', // Amarillo
];

export function resolveOnionColorModeHex(
  colorMode: OnionSkinColorMode | undefined,
  customColor: string
): string | null {
  if (colorMode === 'original') return null;
  if (colorMode === 'red') return '#ef4444';
  if (colorMode === 'blue') return '#3b82f6';
  if (colorMode === 'green') return '#22c55e';
  return customColor || '#ef4444';
}

export function applyOnionSkinPreset(
  current: OnionSkinConfig,
  presetId: OnionSkinPresetId
): OnionSkinConfig {
  const baseTrail = current.trail || { ...DEFAULT_ONION_SKIN_TRAIL_CONFIG };
  switch (presetId) {
    case 'animator':
      return {
        ...current,
        enabled: true,
        globalOpacity: 1.0,
        autoDistanceFalloff: true,
        blendMode: 'normal',
        detailLevel: 'full',
        prev: {
          count: Math.max(1, current.prev.count || 2),
          displayMode: 'tinted_ghost',
          colorMode: 'red',
          color: '#ef4444',
          opacity: 0.5,
          tintStrength: 0.58,
        },
        next: {
          count: Math.max(1, current.next.count || 1),
          displayMode: 'tinted_ghost',
          colorMode: 'green',
          color: '#22c55e',
          opacity: 0.5,
          tintStrength: 0.58,
        },
      };
    case 'ghost_clean':
      return {
        ...current,
        enabled: true,
        globalOpacity: 1.0,
        autoDistanceFalloff: true,
        blendMode: 'normal',
        detailLevel: 'full',
        prev: {
          count: 3,
          displayMode: 'ghost',
          colorMode: 'original',
          color: '#ef4444',
          opacity: 0.5,
          tintStrength: 0.5,
        },
        next: {
          count: 1,
          displayMode: 'ghost',
          colorMode: 'original',
          color: '#22c55e',
          opacity: 0.25,
          tintStrength: 0.5,
        },
      };
    case 'kof_trail':
      return {
        ...current,
        enabled: true,
        trail: {
          ...baseTrail,
          enabled: true,
          framesCount: 5,
          opacity: 0.6,
          decay: 0.42,
          preserveOriginalColors: true,
          blendMode: 'normal',
        },
      };
    case 'silhouette_classic':
    default:
      return {
        ...DEFAULT_ONION_SKIN_CONFIG,
        enabled: true,
        globalOpacity: 1.0,
        prev: {
          count: 1,
          displayMode: 'silhouette',
          colorMode: 'red',
          color: '#ef4444',
          opacity: 0.45,
          tintStrength: 0.65,
        },
        next: {
          count: 1,
          displayMode: 'silhouette',
          colorMode: 'blue',
          color: '#3b82f6',
          opacity: 0.4,
          tintStrength: 0.65,
        },
        trail: { ...baseTrail },
        motionPath: { ...current.motionPath },
      };
  }
}

export function mapOnionBlendToCanvasComposite(
  blendMode: OnionSkinBlendMode
): GlobalCompositeOperation {
  const found = ONION_BLEND_MODE_OPTIONS.find((b) => b.id === blendMode);
  return found ? found.compositeOp : 'source-over';
}

function clampByte(n: number): number {
  return n < 0 ? 0 : n > 255 ? 255 : n | 0;
}

function unpackAbgr(abgr: number): [number, number, number, number] {
  return [
    abgr & 0xff,
    (abgr >>> 8) & 0xff,
    (abgr >>> 16) & 0xff,
    (abgr >>> 24) & 0xff,
  ];
}

function packAbgr(r: number, g: number, b: number, a: number): number {
  return (
    ((clampByte(a) & 0xff) << 24) |
    ((clampByte(b) & 0xff) << 16) |
    ((clampByte(g) & 0xff) << 8) |
    (clampByte(r) & 0xff)
  ) >>> 0;
}

function quantizeByte(v: number, step: number): number {
  if (step <= 1) return v;
  return clampByte(Math.round(v / step) * step);
}

// WeakMap cache keyed by composited grid reference -> variant key -> offscreen HTMLCanvasElement
const processedOnionCache = new WeakMap<
  (string | null)[][],
  Map<string, HTMLCanvasElement>
>();

/**
 * Generates and caches an offscreen HTMLCanvasElement for any Onion Skin
 * displayMode + detailLevel + colorMode + tintColor combination with O(1) WeakMap hit rate.
 */
export function getProcessedOnionSkinCanvas(
  compositedGrid: (string | null)[][],
  width: number,
  height: number,
  displayMode: OnionSkinDisplayMode,
  detailLevel: OnionSkinDetailLevel,
  tintColor: string,
  colorMode: OnionSkinColorMode = 'custom',
  tintStrength: number = 0.58
): HTMLCanvasElement {
  const safeW = Math.max(1, width);
  const safeH = Math.max(1, height);
  const resolvedHex = resolveOnionColorModeHex(colorMode, tintColor);
  const isOriginalGhost =
    (displayMode === 'ghost' || displayMode === 'full') && resolvedHex === null;
  const effectiveTintHex = resolvedHex || tintColor || '#ef4444';
  const clampedTintStrength = Math.max(0.15, Math.min(0.95, tintStrength));

  const effectiveDetail: OnionSkinDetailLevel =
    displayMode === 'ghost' || displayMode === 'tinted_ghost' ? 'full' : detailLevel;

  const cacheKey = isOriginalGhost
    ? `${safeW}x${safeH}|${displayMode}|${effectiveDetail}|original`
    : `${safeW}x${safeH}|${displayMode}|${effectiveDetail}|${colorMode}:${effectiveTintHex.toLowerCase()}:${Math.round(
        clampedTintStrength * 100
      )}`;

  let byVariant = processedOnionCache.get(compositedGrid);
  if (byVariant) {
    const hit = byVariant.get(cacheKey);
    if (hit) return hit;
  } else {
    byVariant = new Map<string, HTMLCanvasElement>();
    processedOnionCache.set(compositedGrid, byVariant);
  }

  const canvas = document.createElement('canvas');
  canvas.width = safeW;
  canvas.height = safeH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const detailMeta =
    ONION_DETAIL_LEVEL_OPTIONS.find((d) => d.id === effectiveDetail) ||
    ONION_DETAIL_LEVEL_OPTIONS[4];
  const blockSize = detailMeta.blockSize;
  const quantStep = detailMeta.quantStep;

  const tintAbgr = parseColorToAbgr32Fast(effectiveTintHex);
  const [tr, tg, tb] = unpackAbgr(tintAbgr);

  // Pre-build raw ABGR grid for fast neighbor/block sampling
  const rawBuf = new Uint32Array(safeW * safeH);
  const rowLimit = Math.min(safeH, compositedGrid.length);
  for (let y = 0; y < rowLimit; y++) {
    const row = compositedGrid[y];
    if (!row) continue;
    const colLimit = Math.min(width, Math.min(safeW, row.length));
    const offset = y * safeW;
    for (let x = 0; x < colLimit; x++) {
      const hex = row[x];
      if (hex) {
        rawBuf[offset + x] = parseColorToAbgr32Fast(hex);
      }
    }
  }

  // Optional coarse spatial simplification when effectiveDetail < 'high'
  let workBuf = rawBuf;
  if (blockSize > 1) {
    workBuf = new Uint32Array(safeW * safeH);
    for (let by = 0; by < safeH; by += blockSize) {
      const byEnd = Math.min(safeH, by + blockSize);
      for (let bx = 0; bx < safeW; bx += blockSize) {
        const bxEnd = Math.min(safeW, bx + blockSize);
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let sumA = 0;
        let opaqueCount = 0;
        const totalCells = (byEnd - by) * (bxEnd - bx);

        for (let y = by; y < byEnd; y++) {
          const rowOff = y * safeW;
          for (let x = bx; x < bxEnd; x++) {
            const px = rawBuf[rowOff + x];
            if (px !== 0) {
              const [r, g, b, a] = unpackAbgr(px);
              if (a > 8) {
                sumR += r;
                sumG += g;
                sumB += b;
                sumA += a;
                opaqueCount++;
              }
            }
          }
        }

        // Preserve silhouette cleanly when enough pixels occupy the block
        const threshold =
          displayMode === 'silhouette' || displayMode === 'outline'
            ? 1
            : Math.max(1, Math.floor(totalCells * 0.25));
        if (opaqueCount >= threshold) {
          const avgR = Math.round(sumR / opaqueCount);
          const avgG = Math.round(sumG / opaqueCount);
          const avgB = Math.round(sumB / opaqueCount);
          const avgA = Math.min(255, Math.round(sumA / opaqueCount));
          const blockVal = packAbgr(avgR, avgG, avgB, avgA);
          for (let y = by; y < byEnd; y++) {
            const rowOff = y * safeW;
            for (let x = bx; x < bxEnd; x++) {
              workBuf[rowOff + x] = blockVal;
            }
          }
        }
      }
    }
  }

  const imgData = ctx.createImageData(safeW, safeH);
  const outBuf = new Uint32Array(imgData.data.buffer);

  if (displayMode === 'ghost') {
    // True traditional-animation Ghost Frame: full colors, shadows, highlights, outlines, FX, and alpha
    if (resolvedHex === null) {
      outBuf.set(rawBuf);
    } else {
      // Optional directional color tint while keeping full shadows, FX highlights, outlines & alpha
      const mix = clampedTintStrength;
      for (let i = 0; i < rawBuf.length; i++) {
        const px = rawBuf[i];
        if (px === 0) continue;
        const [r, g, b, a] = unpackAbgr(px);
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const shade = 0.22 + lum * 0.92;
        outBuf[i] = packAbgr(
          Math.round(r * (1 - mix) + tr * shade * mix),
          Math.round(g * (1 - mix) + tg * shade * mix),
          Math.round(b * (1 - mix) + tb * shade * mix),
          a
        );
      }
    }
  } else if (displayMode === 'tinted_ghost') {
    // Tinted Ghost Frame: retains all tonal shading, shadows, highlights, outlines & FX tinted cleanly
    if (colorMode === 'original') {
      outBuf.set(rawBuf);
    } else {
      const mix = clampedTintStrength;
      for (let i = 0; i < rawBuf.length; i++) {
        const px = rawBuf[i];
        if (px === 0) continue;
        const [r, g, b, a] = unpackAbgr(px);
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const shade = 0.2 + lum * 0.96;
        outBuf[i] = packAbgr(
          Math.round(r * (1 - mix) + tr * shade * mix),
          Math.round(g * (1 - mix) + tg * shade * mix),
          Math.round(b * (1 - mix) + tb * shade * mix),
          a
        );
      }
    }
  } else if (displayMode === 'full') {
    const applyTint = resolvedHex !== null;
    if (quantStep <= 1 && !applyTint) {
      outBuf.set(workBuf);
    } else {
      const mix = applyTint ? clampedTintStrength * 0.75 : 0;
      for (let i = 0; i < workBuf.length; i++) {
        const px = workBuf[i];
        if (px === 0) continue;
        const [r, g, b, a] = unpackAbgr(px);
        const qr = quantizeByte(r, quantStep);
        const qg = quantizeByte(g, quantStep);
        const qb = quantizeByte(b, quantStep);
        if (!applyTint) {
          outBuf[i] = packAbgr(qr, qg, qb, a);
        } else {
          const lum = (0.299 * qr + 0.587 * qg + 0.114 * qb) / 255;
          const shade = 0.22 + lum * 0.92;
          outBuf[i] = packAbgr(
            Math.round(qr * (1 - mix) + tr * shade * mix),
            Math.round(qg * (1 - mix) + tg * shade * mix),
            Math.round(qb * (1 - mix) + tb * shade * mix),
            a
          );
        }
      }
    }
  } else if (displayMode === 'silhouette') {
    for (let i = 0; i < workBuf.length; i++) {
      const px = workBuf[i];
      if (px === 0) continue;
      const a = (px >>> 24) & 0xff;
      if (a > 8) {
        outBuf[i] = packAbgr(tr, tg, tb, a);
      }
    }
  } else if (displayMode === 'outline') {
    const thickRadius = effectiveDetail === 'very_low' || effectiveDetail === 'low' ? 2 : 1;
    for (let y = 0; y < safeH; y++) {
      const rowOff = y * safeW;
      for (let x = 0; x < safeW; x++) {
        const px = workBuf[rowOff + x];
        if (px === 0) continue;
        const a = (px >>> 24) & 0xff;
        if (a <= 8) continue;

        let isEdge = x === 0 || y === 0 || x === safeW - 1 || y === safeH - 1;
        if (!isEdge) {
          outer: for (let dy = -thickRadius; dy <= thickRadius; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= safeH) {
              isEdge = true;
              break;
            }
            const nOff = ny * safeW;
            for (let dx = -thickRadius; dx <= thickRadius; dx++) {
              if (dx === 0 && dy === 0) continue;
              if (thickRadius === 1 && Math.abs(dx) + Math.abs(dy) > 1) continue;
              const nx = x + dx;
              if (nx < 0 || nx >= safeW) {
                isEdge = true;
                break outer;
              }
              if (((workBuf[nOff + nx] >>> 24) & 0xff) <= 8) {
                isEdge = true;
                break outer;
              }
            }
          }
        }
        if (isEdge) {
          outBuf[rowOff + x] = packAbgr(tr, tg, tb, 255);
        }
      }
    }
  } else if (displayMode === 'volume') {
    // Simplified tonal massing (3 or 4 bands depending on detail) + directional tint
    const bands =
      effectiveDetail === 'very_low'
        ? 2
        : effectiveDetail === 'low'
        ? 3
        : effectiveDetail === 'medium'
        ? 4
        : 5;
    for (let i = 0; i < workBuf.length; i++) {
      const px = workBuf[i];
      if (px === 0) continue;
      const [r, g, b, a] = unpackAbgr(px);
      if (a <= 8) continue;
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const qLum = Math.round(lum * (bands - 1)) / Math.max(1, bands - 1);
      const shade = 0.28 + qLum * 0.72;
      const vr = Math.round(tr * shade * 0.65 + 245 * qLum * 0.35);
      const vg = Math.round(tg * shade * 0.65 + 245 * qLum * 0.35);
      const vb = Math.round(tb * shade * 0.65 + 245 * qLum * 0.35);
      outBuf[i] = packAbgr(vr, vg, vb, a);
    }
  } else if (displayMode === 'base_color') {
    const baseStep = Math.max(40, quantStep);
    const mixTint = resolvedHex === null ? 0 : 0.22;
    for (let y = 0; y < safeH; y++) {
      const rowOff = y * safeW;
      for (let x = 0; x < safeW; x++) {
        const px = workBuf[rowOff + x];
        if (px === 0) continue;
        const [r, g, b, a] = unpackAbgr(px);
        if (a <= 8) continue;

        let br = r;
        let bg = g;
        let bb = b;

        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum < 70 && safeW > 2 && safeH > 2) {
          let bestLum = lum;
          for (let dy = -1; dy <= 1; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= safeH) continue;
            const nOff = ny * safeW;
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx;
              if (nx < 0 || nx >= safeW) continue;
              const npx = workBuf[nOff + nx];
              if (npx === 0) continue;
              const [nr, ng, nb, na] = unpackAbgr(npx);
              if (na <= 16) continue;
              const nLum = 0.299 * nr + 0.587 * ng + 0.114 * nb;
              if (nLum > bestLum + 24) {
                bestLum = nLum;
                br = nr;
                bg = ng;
                bb = nb;
              }
            }
          }
        }

        const qr = quantizeByte(br, baseStep);
        const qg = quantizeByte(bg, baseStep);
        const qb = quantizeByte(bb, baseStep);
        outBuf[rowOff + x] = packAbgr(
          Math.round(qr * (1 - mixTint) + tr * mixTint),
          Math.round(qg * (1 - mixTint) + tg * mixTint),
          Math.round(qb * (1 - mixTint) + tb * mixTint),
          a
        );
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  if (byVariant.size >= 16) {
    const oldestKey = byVariant.keys().next().value;
    if (oldestKey !== undefined) byVariant.delete(oldestKey);
  }
  byVariant.set(cacheKey, canvas);
  return canvas;
}

export interface MotionPoint {
  x: number;
  y: number;
}

export interface FrameMotionLandmarks {
  cog: MotionPoint | null;
  head: MotionPoint | null;
  leftHand: MotionPoint | null;
  rightHand: MotionPoint | null;
  leftFoot: MotionPoint | null;
  rightFoot: MotionPoint | null;
}

const landmarksCache = new WeakMap<(string | null)[][], FrameMotionLandmarks>();

/**
 * Extracts crisp anatomical motion landmarks (Head, Left/Right Hands, Left/Right Feet,
 * Center of Gravity) from a composited sprite grid and WeakMap-caches the result.
 */
export function extractFrameMotionLandmarks(
  compositedGrid: (string | null)[][],
  width: number,
  height: number
): FrameMotionLandmarks {
  const cached = landmarksCache.get(compositedGrid);
  if (cached) return cached;

  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  let sumX = 0;
  let sumY = 0;
  let count = 0;

  const rowLimit = Math.min(height, compositedGrid.length);
  for (let y = 0; y < rowLimit; y++) {
    const row = compositedGrid[y];
    if (!row) continue;
    const colLimit = Math.min(width, row.length);
    for (let x = 0; x < colLimit; x++) {
      if (row[x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        sumX += x + 0.5;
        sumY += y + 0.5;
        count++;
      }
    }
  }

  if (count === 0) {
    const empty: FrameMotionLandmarks = {
      cog: null,
      head: null,
      leftHand: null,
      rightHand: null,
      leftFoot: null,
      rightFoot: null,
    };
    landmarksCache.set(compositedGrid, empty);
    return empty;
  }

  const cog: MotionPoint = { x: sumX / count, y: sumY / count };
  const spanH = Math.max(1, maxY - minY + 1);
  const midX = cog.x;

  // Head band: top 0% .. 24%
  const headMaxY = minY + spanH * 0.24;
  let headX = 0;
  let headY = 0;
  let headCount = 0;

  // Hands band: 22% .. 62%
  const handMinY = minY + spanH * 0.22;
  const handMaxY = minY + spanH * 0.62;
  let leftmostX = width;
  let leftmostY = 0;
  let rightmostX = -1;
  let rightmostY = 0;

  // Feet band: 76% .. 100%
  const footMinY = minY + spanH * 0.76;
  let lfSumX = 0;
  let lfSumY = 0;
  let lfCount = 0;
  let rfSumX = 0;
  let rfSumY = 0;
  let rfCount = 0;

  for (let y = minY; y <= maxY; y++) {
    const row = compositedGrid[y];
    if (!row) continue;
    for (let x = minX; x <= maxX; x++) {
      if (!row[x]) continue;
      const px = x + 0.5;
      const py = y + 0.5;

      if (y <= headMaxY) {
        headX += px;
        headY += py;
        headCount++;
      }

      if (y >= handMinY && y <= handMaxY) {
        if (px < leftmostX) {
          leftmostX = px;
          leftmostY = py;
        }
        if (px > rightmostX) {
          rightmostX = px;
          rightmostY = py;
        }
      }

      if (y >= footMinY) {
        if (px <= midX) {
          lfSumX += px;
          lfSumY += py;
          lfCount++;
        } else {
          rfSumX += px;
          rfSumY += py;
          rfCount++;
        }
      }
    }
  }

  // Refine hand points by averaging pixels within 2.5px of lateral extremity
  let leftHand: MotionPoint | null = null;
  let rightHand: MotionPoint | null = null;
  if (rightmostX >= 0) {
    let lhX = 0;
    let lhY = 0;
    let lhN = 0;
    let rhX = 0;
    let rhY = 0;
    let rhN = 0;
    for (let y = Math.floor(handMinY); y <= Math.ceil(handMaxY); y++) {
      const row = compositedGrid[y];
      if (!row) continue;
      for (let x = minX; x <= maxX; x++) {
        if (!row[x]) continue;
        const px = x + 0.5;
        const py = y + 0.5;
        if (Math.hypot(px - leftmostX, py - leftmostY) <= 3.2) {
          lhX += px;
          lhY += py;
          lhN++;
        }
        if (Math.hypot(px - rightmostX, py - rightmostY) <= 3.2) {
          rhX += px;
          rhY += py;
          rhN++;
        }
      }
    }
    if (lhN > 0) leftHand = { x: lhX / lhN, y: lhY / lhN };
    if (rhN > 0) rightHand = { x: rhX / rhN, y: rhY / rhN };
  }

  const result: FrameMotionLandmarks = {
    cog,
    head: headCount > 0 ? { x: headX / headCount, y: headY / headCount } : null,
    leftHand,
    rightHand,
    leftFoot: lfCount > 0 ? { x: lfSumX / lfCount, y: lfSumY / lfCount } : null,
    rightFoot: rfCount > 0 ? { x: rfSumX / rfCount, y: rfSumY / rfCount } : null,
  };
  landmarksCache.set(compositedGrid, result);
  return result;
}

interface MotionPathRenderParams {
  frames: Frame[];
  currentFrameIndex: number;
  width: number;
  height: number;
  zoom: number;
  layerGroups: LayerGroup[];
  onionConfig: OnionSkinConfig;
  motionConfig: MotionPathConfig;
}

function drawSmoothTrajectory(
  ctx: CanvasRenderingContext2D,
  samples: { frameIdx: number; pt: MotionPoint }[],
  currentFrameIndex: number,
  zoom: number,
  color: string,
  label: string,
  prevColor: string,
  nextColor: string
) {
  if (samples.length === 0) return;

  ctx.save();
  // Glow underlay + crisp trajectory curve
  if (samples.length >= 2) {
    const drawCurve = (stroke: string, lineWidth: number, dash: number[] = []) => {
      ctx.beginPath();
      ctx.setLineDash(dash);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(samples[0].pt.x * zoom, samples[0].pt.y * zoom);
      for (let i = 1; i < samples.length - 1; i++) {
        const cur = samples[i].pt;
        const nxt = samples[i + 1].pt;
        const midX = ((cur.x + nxt.x) * 0.5) * zoom;
        const midY = ((cur.y + nxt.y) * 0.5) * zoom;
        ctx.quadraticCurveTo(cur.x * zoom, cur.y * zoom, midX, midY);
      }
      const last = samples[samples.length - 1].pt;
      ctx.lineTo(last.x * zoom, last.y * zoom);
      ctx.stroke();
    };

    drawCurve('rgba(10, 12, 20, 0.72)', 3.6);
    drawCurve(color, 1.75);

    // Direction arrowhead at last segment
    const pA = samples[samples.length - 2].pt;
    const pB = samples[samples.length - 1].pt;
    const ang = Math.atan2((pB.y - pA.y) * zoom, (pB.x - pA.x) * zoom);
    const tipX = pB.x * zoom;
    const tipY = pB.y * zoom;
    if (Math.hypot((pB.x - pA.x) * zoom, (pB.y - pA.y) * zoom) > 4) {
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX - Math.cos(ang - 0.45) * 6.5, tipY - Math.sin(ang - 0.45) * 6.5);
      ctx.lineTo(tipX - Math.cos(ang + 0.45) * 6.5, tipY - Math.sin(ang + 0.45) * 6.5);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Frame node markers
  ctx.setLineDash([]);
  let currentPoint: MotionPoint | null = null;
  for (const s of samples) {
    const sx = s.pt.x * zoom;
    const sy = s.pt.y * zoom;
    const isCurrent = s.frameIdx === currentFrameIndex;
    if (isCurrent) {
      currentPoint = s.pt;
      ctx.fillStyle = color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(sx, sy, 4.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = s.frameIdx < currentFrameIndex ? prevColor : nextColor;
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sx, sy, 2.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  if (currentPoint) {
    const lx = currentPoint.x * zoom + 7;
    const ly = currentPoint.y * zoom - 5;
    ctx.font = 'bold 9px monospace';
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(10, 12, 20, 0.82)';
    ctx.fillRect(lx - 2, ly - 9, tw + 4, 11);
    ctx.fillStyle = color;
    ctx.fillText(label, lx, ly);
  }
  ctx.restore();
}

/**
 * Renders Motion Path ("Modo Trazo de Movimiento") trajectory curves over the sprite canvas
 * for Head, Hands, Feet, and Center of Gravity.
 */
export function renderMotionPathsOverlay(
  ctx: CanvasRenderingContext2D,
  params: MotionPathRenderParams
): void {
  const {
    frames,
    currentFrameIndex,
    width,
    height,
    zoom,
    layerGroups,
    onionConfig,
    motionConfig,
  } = params;

  if (!motionConfig.enabled || frames.length === 0) return;
  if (
    !motionConfig.trackHead &&
    !motionConfig.trackHands &&
    !motionConfig.trackFeet &&
    !motionConfig.trackCenterOfGravity
  ) {
    return;
  }

  const prevSpan = Math.max(1, onionConfig.prev.count || 3);
  const nextSpan = Math.max(1, onionConfig.next.count || 3);
  const startIdx =
    motionConfig.scope === 'all_frames'
      ? 0
      : Math.max(0, currentFrameIndex - prevSpan);
  const endIdx =
    motionConfig.scope === 'all_frames'
      ? frames.length - 1
      : Math.min(frames.length - 1, currentFrameIndex + nextSpan);

  const headSamples: { frameIdx: number; pt: MotionPoint }[] = [];
  const leftHandSamples: { frameIdx: number; pt: MotionPoint }[] = [];
  const rightHandSamples: { frameIdx: number; pt: MotionPoint }[] = [];
  const leftFootSamples: { frameIdx: number; pt: MotionPoint }[] = [];
  const rightFootSamples: { frameIdx: number; pt: MotionPoint }[] = [];
  const cogSamples: { frameIdx: number; pt: MotionPoint }[] = [];

  for (let idx = startIdx; idx <= endIdx; idx++) {
    const f = frames[idx];
    if (!f) continue;
    const grid = compositeFrame(f, width, height, idx, false, layerGroups);
    const lm = extractFrameMotionLandmarks(grid, width, height);
    if (lm.head) headSamples.push({ frameIdx: idx, pt: lm.head });
    if (lm.leftHand) leftHandSamples.push({ frameIdx: idx, pt: lm.leftHand });
    if (lm.rightHand) rightHandSamples.push({ frameIdx: idx, pt: lm.rightHand });
    if (lm.leftFoot) leftFootSamples.push({ frameIdx: idx, pt: lm.leftFoot });
    if (lm.rightFoot) rightFootSamples.push({ frameIdx: idx, pt: lm.rightFoot });
    if (lm.cog) cogSamples.push({ frameIdx: idx, pt: lm.cog });
  }

  const prevCol = onionConfig.prev.color || '#ef4444';
  const nextCol = onionConfig.next.color || '#3b82f6';

  if (motionConfig.trackHead) {
    drawSmoothTrajectory(
      ctx,
      headSamples,
      currentFrameIndex,
      zoom,
      '#38bdf8',
      'Cabeza',
      prevCol,
      nextCol
    );
  }
  if (motionConfig.trackHands) {
    drawSmoothTrajectory(
      ctx,
      leftHandSamples,
      currentFrameIndex,
      zoom,
      '#f59e0b',
      'Mano I',
      prevCol,
      nextCol
    );
    drawSmoothTrajectory(
      ctx,
      rightHandSamples,
      currentFrameIndex,
      zoom,
      '#fb923c',
      'Mano D',
      prevCol,
      nextCol
    );
  }
  if (motionConfig.trackFeet) {
    drawSmoothTrajectory(
      ctx,
      leftFootSamples,
      currentFrameIndex,
      zoom,
      '#34d399',
      'Pie I',
      prevCol,
      nextCol
    );
    drawSmoothTrajectory(
      ctx,
      rightFootSamples,
      currentFrameIndex,
      zoom,
      '#10b981',
      'Pie D',
      prevCol,
      nextCol
    );
  }
  if (motionConfig.trackCenterOfGravity) {
    drawSmoothTrajectory(
      ctx,
      cogSamples,
      currentFrameIndex,
      zoom,
      '#f43f5e',
      'C. Gravedad',
      prevCol,
      nextCol
    );
    // Extra Center-of-Gravity crosshair on current frame
    const curCog = cogSamples.find((s) => s.frameIdx === currentFrameIndex)?.pt;
    if (curCog) {
      const cx = curCog.x * zoom;
      const cy = curCog.y * zoom;
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy);
      ctx.lineTo(cx + 6, cy);
      ctx.moveTo(cx, cy - 6);
      ctx.lineTo(cx, cy + 6);
      ctx.stroke();
      ctx.restore();
    }
  }
}
