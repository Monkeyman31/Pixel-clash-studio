import {
  EyedropperConfig,
  Frame,
  Layer,
  LayerGroup,
  SampledColorInfo,
} from '../types';
import { compositeFrame, resolveGroupVisibilityAndOpacity } from './pixelMath';

export const DEFAULT_EYEDROPPER_CONFIG: EyedropperConfig = {
  loupeZoom: 8,
  sampleMode: 'point',
  customSampleRadius: 2,
  layerScope: 'visible',
  ignoreLocked: false,
  ignoreHidden: true,
  pixelArtMode: true,
  historyLimit: 20,
};

export function parseColorToRgba(color: string | null | undefined): [number, number, number, number] | null {
  if (!color) return null;
  const trimmed = color.trim();
  const rgbaMatch = trimmed.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i
  );
  if (rgbaMatch) {
    return [
      Math.max(0, Math.min(255, Math.round(parseFloat(rgbaMatch[1])))),
      Math.max(0, Math.min(255, Math.round(parseFloat(rgbaMatch[2])))),
      Math.max(0, Math.min(255, Math.round(parseFloat(rgbaMatch[3])))),
      rgbaMatch[4] !== undefined ? Math.max(0, Math.min(1, parseFloat(rgbaMatch[4]))) : 1,
    ];
  }
  const clean = trimmed.replace('#', '');
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16) || 0,
      parseInt(clean[1] + clean[1], 16) || 0,
      parseInt(clean[2] + clean[2], 16) || 0,
      1,
    ];
  }
  if (clean.length >= 6) {
    const a = clean.length >= 8 ? (parseInt(clean.slice(6, 8), 16) || 255) / 255 : 1;
    return [
      parseInt(clean.slice(0, 2), 16) || 0,
      parseInt(clean.slice(2, 4), 16) || 0,
      parseInt(clean.slice(4, 6), 16) || 0,
      a,
    ];
  }
  return null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${((1 << 24) + (clamp(r) << 16) + (clamp(g) << 8) + clamp(b)).toString(16).slice(1)}`;
}

export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
    else if (max === gn) h = ((bn - rn) / d + 2) * 60;
    else h = ((rn - gn) / d + 4) * 60;
  }
  const s = max === 0 ? 0 : (d / max) * 100;
  const v = max * 100;
  return [Math.round(h), Math.round(s), Math.round(v)];
}

export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const vn = Math.max(0, Math.min(100, v)) / 100;
  const hn = ((h % 360) + 360) % 360;
  const c = vn * sn;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = vn - c;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (hn < 60) [rp, gp, bp] = [c, x, 0];
  else if (hn < 120) [rp, gp, bp] = [x, c, 0];
  else if (hn < 180) [rp, gp, bp] = [0, c, x];
  else if (hn < 240) [rp, gp, bp] = [0, x, c];
  else if (hn < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  return [
    Math.round((rp + m) * 255),
    Math.round((gp + m) * 255),
    Math.round((bp + m) * 255),
  ];
}

export function rgbToHslL(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  return Math.round(((max + min) / 2) * 100);
}

export function computeColorDelta(hexA: string, hexB: string): { dE: number; dH: number; dV: number } {
  const a = parseColorToRgba(hexA) || [0, 0, 0, 1];
  const b = parseColorToRgba(hexB) || [0, 0, 0, 1];
  const dE = Math.round(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
  const [ha, , va] = rgbToHsv(a[0], a[1], a[2]);
  const [hb, , vb] = rgbToHsv(b[0], b[1], b[2]);
  const dH = Math.round(Math.min(Math.abs(ha - hb), 360 - Math.abs(ha - hb)));
  const dV = Math.round(vb - va);
  return { dE, dH, dV };
}

export function buildSmartPaletteFromHex(
  hex: string,
  activePalette: string[] = []
): {
  shadesDarker: [string, string];
  shadesLighter: [string, string];
  paletteRelated: string[];
  paletteIndex: number;
} {
  const rgba = parseColorToRgba(hex) || [128, 128, 128, 1];
  const [h, s, v] = rgbToHsv(rgba[0], rgba[1], rgba[2]);

  // Hue-shifted pixel art shading (cool shadows, warm highlights)
  const [dr1, dg1, db1] = hsvToRgb(h - 8, Math.min(100, s + 8), Math.max(8, v * 0.72));
  const [dr2, dg2, db2] = hsvToRgb(h - 16, Math.min(100, s + 14), Math.max(4, v * 0.48));
  const [lr1, lg1, lb1] = hsvToRgb(h + 6, Math.max(0, s - 8), Math.min(100, v + (100 - v) * 0.36));
  const [lr2, lg2, lb2] = hsvToRgb(h + 12, Math.max(0, s - 18), Math.min(100, v + (100 - v) * 0.68));

  const lowerHex = hex.toLowerCase();
  const paletteIndex = activePalette.findIndex((p) => p.toLowerCase() === lowerHex);

  // Closest 4 palette colors
  const sorted = [...activePalette]
    .map((p) => {
      const pr = parseColorToRgba(p) || [0, 0, 0, 1];
      const dist = Math.hypot(pr[0] - rgba[0], pr[1] - rgba[1], pr[2] - rgba[2]);
      return { color: p, dist };
    })
    .sort((a, b) => a.dist - b.dist)
    .map((x) => x.color);

  return {
    shadesDarker: [rgbToHex(dr2, dg2, db2), rgbToHex(dr1, dg1, db1)],
    shadesLighter: [rgbToHex(lr1, lg1, lb1), rgbToHex(lr2, lg2, lb2)],
    paletteRelated: sorted.slice(0, 5),
    paletteIndex,
  };
}

export function buildSamplingGridForEyedropper(
  frame: Frame,
  currentLayer: Layer,
  width: number,
  height: number,
  config: EyedropperConfig,
  layerGroups: LayerGroup[] = []
): (string | null)[][] {
  if (config.layerScope === 'current') {
    return currentLayer.pixels;
  }
  const filteredLayers = frame.layers.filter((l) => {
    if (config.ignoreLocked && l.locked) return false;
    if (config.layerScope === 'visible' && config.ignoreHidden) {
      const grp = resolveGroupVisibilityAndOpacity(l.groupId, layerGroups);
      if (!l.visible || !grp.visible) return false;
    }
    return true;
  });

  if (config.layerScope === 'all' && !config.ignoreHidden) {
    // Include hidden layers temporarily as visible for sampling
    const tempFrame: Frame = {
      ...frame,
      layers: filteredLayers.map((l) => ({ ...l, visible: true })),
    };
    return compositeFrame(tempFrame, width, height, -1, false, layerGroups);
  }

  const tempFrame: Frame = { ...frame, layers: filteredLayers };
  return compositeFrame(tempFrame, width, height, -1, false, layerGroups);
}

export function sampleEyedropperAt(
  grid: (string | null)[][],
  x: number,
  y: number,
  width: number,
  height: number,
  config: EyedropperConfig,
  activePalette: string[] = []
): SampledColorInfo | null {
  if (x < 0 || x >= width || y < 0 || y >= height) return null;

  const effectiveMode = config.pixelArtMode ? 'point' : config.sampleMode;
  const radius =
    effectiveMode === 'point'
      ? 0
      : effectiveMode === 'avg3'
      ? 1
      : effectiveMode === 'avg5'
      ? 2
      : Math.max(1, Math.min(8, config.customSampleRadius || 2));

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let sumA = 0;
  let count = 0;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const px = x + dx;
      const py = y + dy;
      if (px < 0 || px >= width || py < 0 || py >= height) continue;
      const col = grid[py]?.[px];
      if (!col) continue;
      const rgba = parseColorToRgba(col);
      if (!rgba) continue;
      sumR += rgba[0];
      sumG += rgba[1];
      sumB += rgba[2];
      sumA += rgba[3];
      count++;
    }
  }

  if (count === 0) return null;
  const r = Math.round(sumR / count);
  const g = Math.round(sumG / count);
  const b = Math.round(sumB / count);
  const alpha = Math.max(0, Math.min(1, sumA / count));
  let hex = rgbToHex(r, g, b);

  // In Pixel Art Mode, snap slightly matched colors if exact palette entry exists within tiny delta
  if (config.pixelArtMode && activePalette.length > 0 && radius > 0) {
    let bestHex = hex;
    let bestDist = Infinity;
    for (const pal of activePalette) {
      const pr = parseColorToRgba(pal);
      if (!pr) continue;
      const d = Math.hypot(pr[0] - r, pr[1] - g, pr[2] - b);
      if (d < bestDist) {
        bestDist = d;
        bestHex = pal;
      }
    }
    if (bestDist <= 12) {
      hex = bestHex;
    }
  }

  const finalRgba = parseColorToRgba(hex) || [r, g, b, alpha];
  const [h, s, v] = rgbToHsv(finalRgba[0], finalRgba[1], finalRgba[2]);
  const hslL = rgbToHslL(finalRgba[0], finalRgba[1], finalRgba[2]);
  const smart = buildSmartPaletteFromHex(hex, activePalette);

  return {
    hex,
    r: finalRgba[0],
    g: finalRgba[1],
    b: finalRgba[2],
    alpha,
    h,
    s,
    v,
    hslL,
    paletteIndex: smart.paletteIndex,
    shadesDarker: smart.shadesDarker,
    shadesLighter: smart.shadesLighter,
    paletteRelated: smart.paletteRelated,
  };
}
