import {
  CanvasGuide,
  Frame,
  GuidePresetKind,
  GuidesConfig,
  LayerGroup,
  RulerUnit,
} from '../types';
import { compositeFrame } from './pixelMath';

export const GUIDES_CONFIG_STORAGE_KEY = 'pixelclash_guides_config_v1';

export const DEFAULT_GUIDES_CONFIG: GuidesConfig = {
  showRulers: true,
  showGuides: true,
  lockGuides: false,
  unit: 'px',
  customScale: 16,
  customLabel: 'tile',
  snapToGuides: true,
  snapToRulers: false,
  snapToGrid: false,
  snapThresholdPx: 2.5,
  gridStep: 8,
};

export function loadGuidesConfig(): GuidesConfig {
  try {
    const raw = localStorage.getItem(GUIDES_CONFIG_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_GUIDES_CONFIG };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_GUIDES_CONFIG,
      ...parsed,
      customScale: Math.max(1, Number(parsed?.customScale) || 16),
      gridStep: Math.max(1, Number(parsed?.gridStep) || 8),
      snapThresholdPx: Math.max(0.5, Math.min(12, Number(parsed?.snapThresholdPx) || 2.5)),
    };
  } catch {
    return { ...DEFAULT_GUIDES_CONFIG };
  }
}

export function saveGuidesConfig(cfg: GuidesConfig): void {
  try {
    localStorage.setItem(GUIDES_CONFIG_STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // Ignore storage quota errors
  }
}

export function pxToUnitValue(
  px: number,
  unit: RulerUnit,
  axisLength: number,
  customScale: number = 16
): number {
  if (unit === 'percent') {
    const safeLen = Math.max(1, axisLength);
    return Number(((px / safeLen) * 100).toFixed(1));
  }
  if (unit === 'custom') {
    const safeScale = Math.max(1, customScale);
    return Number((px / safeScale).toFixed(2));
  }
  return Number(px.toFixed(1));
}

export function parseUnitValueToPx(
  value: number,
  unit: RulerUnit,
  axisLength: number,
  customScale: number = 16
): number {
  if (!Number.isFinite(value)) return 0;
  if (unit === 'percent') {
    return Math.round(((value / 100) * Math.max(1, axisLength)) * 2) / 2;
  }
  if (unit === 'custom') {
    return Math.round(value * Math.max(1, customScale) * 2) / 2;
  }
  return Math.round(value * 2) / 2;
}

export function formatRulerCoordinate(
  px: number,
  unit: RulerUnit,
  axisLength: number,
  customScale: number = 16,
  customLabel: string = 'tile',
  includeUnit: boolean = true
): string {
  if (unit === 'percent') {
    const val = Math.round((px / Math.max(1, axisLength)) * 1000) / 10;
    const str = Number.isInteger(val) ? String(val) : val.toFixed(1);
    return includeUnit ? `${str}%` : str;
  }
  if (unit === 'custom') {
    const val = Math.round((px / Math.max(1, customScale)) * 100) / 100;
    const str = Number.isInteger(val) ? String(val) : String(val);
    return includeUnit ? `${str} ${customLabel || 'u'}` : str;
  }
  const rounded = Math.round(px * 10) / 10;
  const str = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return includeUnit ? `${str} px` : str;
}

export function computeRulerStepPx(
  zoom: number,
  unit: RulerUnit,
  axisLength: number,
  customScale: number = 16
): { majorStepPx: number; minorDivisions: number } {
  const safeZoom = Math.max(0.5, zoom);
  const minMajorScreenPx = 44;

  if (unit === 'percent') {
    const percentCandidates = [1, 2, 5, 10, 20, 25, 50, 100];
    for (const pct of percentCandidates) {
      const px = (pct / 100) * Math.max(1, axisLength);
      if (px * safeZoom >= minMajorScreenPx) {
        return { majorStepPx: px, minorDivisions: pct >= 10 ? 5 : 2 };
      }
    }
    return { majorStepPx: Math.max(1, axisLength), minorDivisions: 4 };
  }

  if (unit === 'custom') {
    const base = Math.max(1, customScale);
    const mults = [0.25, 0.5, 1, 2, 4, 8, 16, 32];
    for (const m of mults) {
      const px = base * m;
      if (px * safeZoom >= minMajorScreenPx) {
        return { majorStepPx: px, minorDivisions: m >= 1 ? 4 : 2 };
      }
    }
    return { majorStepPx: base * 32, minorDivisions: 4 };
  }

  const pxCandidates = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512];
  for (const step of pxCandidates) {
    if (step * safeZoom >= minMajorScreenPx) {
      return {
        majorStepPx: step,
        minorDivisions: step >= 8 ? 4 : step >= 2 ? 2 : 1,
      };
    }
  }
  return { majorStepPx: 512, minorDivisions: 4 };
}

export interface SnapPointResult {
  x: number;
  y: number;
  snappedX: boolean;
  snappedY: boolean;
  guideX: CanvasGuide | null;
  guideY: CanvasGuide | null;
  kindX: 'guide' | 'ruler' | 'grid' | null;
  kindY: 'guide' | 'ruler' | 'grid' | null;
}

export function snapCoordinateToGuides(
  rawX: number,
  rawY: number,
  canvasW: number,
  canvasH: number,
  guides: CanvasGuide[],
  config: GuidesConfig,
  zoom: number = 8
): SnapPointResult {
  let outX = rawX;
  let outY = rawY;
  let snappedX = false;
  let snappedY = false;
  let guideX: CanvasGuide | null = null;
  let guideY: CanvasGuide | null = null;
  let kindX: 'guide' | 'ruler' | 'grid' | null = null;
  let kindY: 'guide' | 'ruler' | 'grid' | null = null;

  // Dynamic snap threshold in canvas px: never too wide at high zoom, still comfortable when zoomed out
  const threshold = Math.max(
    0.75,
    Math.min(config.snapThresholdPx || 2.5, 10 / Math.max(1, zoom))
  );

  // 1. Highest priority: Active Canvas Guides (when visible + snapToGuides)
  if (config.snapToGuides && config.showGuides && guides.length > 0) {
    let bestDistX = threshold;
    let bestDistY = threshold;
    for (const g of guides) {
      if (g.orientation === 'vertical') {
        const d = Math.abs(rawX - g.position);
        if (d <= bestDistX) {
          bestDistX = d;
          outX = g.position;
          snappedX = true;
          guideX = g;
          kindX = 'guide';
        }
      } else {
        const d = Math.abs(rawY - g.position);
        if (d <= bestDistY) {
          bestDistY = d;
          outY = g.position;
          snappedY = true;
          guideY = g;
          kindY = 'guide';
        }
      }
    }
  }

  // 2. Second priority: Ruler major ticks (when rulers shown + snapToRulers)
  if (config.snapToRulers && config.showRulers) {
    if (!snappedX) {
      const { majorStepPx } = computeRulerStepPx(zoom, config.unit, canvasW, config.customScale);
      const nearest = Math.round(rawX / majorStepPx) * majorStepPx;
      if (Math.abs(rawX - nearest) <= threshold) {
        outX = nearest;
        snappedX = true;
        kindX = 'ruler';
      }
    }
    if (!snappedY) {
      const { majorStepPx } = computeRulerStepPx(zoom, config.unit, canvasH, config.customScale);
      const nearest = Math.round(rawY / majorStepPx) * majorStepPx;
      if (Math.abs(rawY - nearest) <= threshold) {
        outY = nearest;
        snappedY = true;
        kindY = 'ruler';
      }
    }
  }

  // 3. Third priority: Grid snapping (when snapToGrid enabled)
  if (config.snapToGrid) {
    const step = Math.max(1, config.gridStep || 8);
    if (!snappedX) {
      const nearest = Math.round(rawX / step) * step;
      if (Math.abs(rawX - nearest) <= Math.max(threshold, step * 0.35)) {
        outX = nearest;
        snappedX = true;
        kindX = 'grid';
      }
    }
    if (!snappedY) {
      const nearest = Math.round(rawY / step) * step;
      if (Math.abs(rawY - nearest) <= Math.max(threshold, step * 0.35)) {
        outY = nearest;
        snappedY = true;
        kindY = 'grid';
      }
    }
  }

  return {
    x: Math.round(outX),
    y: Math.round(outY),
    snappedX,
    snappedY,
    guideX,
    guideY,
    kindX,
    kindY,
  };
}

export interface SnapBoundsResult {
  x: number;
  y: number;
  guideX: CanvasGuide | null;
  guideY: CanvasGuide | null;
}

/**
 * Snaps left, center, or right edge (and top, middle, bottom edge) of a rectangle
 * to active guides, ruler ticks, or grid.
 */
export function snapBoundsToGuides(
  x: number,
  y: number,
  w: number,
  h: number,
  canvasW: number,
  canvasH: number,
  guides: CanvasGuide[],
  config: GuidesConfig,
  zoom: number = 8
): SnapBoundsResult {
  if (!config.snapToGuides && !config.snapToRulers && !config.snapToGrid) {
    return { x, y, guideX: null, guideY: null };
  }

  const xAnchors = [
    { offset: 0, val: x },
    { offset: w / 2, val: x + w / 2 },
    { offset: w, val: x + w },
  ];
  const yAnchors = [
    { offset: 0, val: y },
    { offset: h / 2, val: y + h / 2 },
    { offset: h, val: y + h },
  ];

  let bestX = x;
  let bestDeltaX = Infinity;
  let guideX: CanvasGuide | null = null;

  for (const a of xAnchors) {
    const res = snapCoordinateToGuides(a.val, y, canvasW, canvasH, guides, config, zoom);
    if (res.snappedX) {
      const delta = Math.abs(res.x - a.val);
      if (delta < bestDeltaX) {
        bestDeltaX = delta;
        bestX = Math.round(res.x - a.offset);
        guideX = res.guideX;
      }
    }
  }

  let bestY = y;
  let bestDeltaY = Infinity;
  let guideY: CanvasGuide | null = null;

  for (const a of yAnchors) {
    const res = snapCoordinateToGuides(x, a.val, canvasW, canvasH, guides, config, zoom);
    if (res.snappedY) {
      const delta = Math.abs(res.y - a.val);
      if (delta < bestDeltaY) {
        bestDeltaY = delta;
        bestY = Math.round(res.y - a.offset);
        guideY = res.guideY;
      }
    }
  }

  return { x: bestX, y: bestY, guideX, guideY };
}

export function createHorizonGuidePreset(width: number, height: number): CanvasGuide[] {
  const ts = Date.now();
  return [
    {
      id: `guide-horizon-sky-${ts}`,
      orientation: 'horizontal',
      position: Math.round(height * 0.34),
      label: 'Cielo / Fondo lejano',
      color: '#38bdf8',
      preset: 'horizon',
    },
    {
      id: `guide-horizon-main-${ts + 1}`,
      orientation: 'horizontal',
      position: Math.round(height * 0.62),
      label: 'Línea de Horizonte',
      color: '#f59e0b',
      preset: 'horizon',
    },
    {
      id: `guide-horizon-ground-${ts + 2}`,
      orientation: 'horizontal',
      position: Math.round(height * 0.84),
      label: 'Plano de Suelo',
      color: '#10b981',
      preset: 'horizon',
    },
  ];
}

export function createHudGuidePreset(width: number, height: number): CanvasGuide[] {
  const ts = Date.now();
  const safeX = Math.max(2, Math.round(width * 0.06));
  const safeTop = Math.max(2, Math.round(height * 0.08));
  const healthBottom = Math.max(safeTop + 2, Math.round(height * 0.2));
  const superTop = Math.round(height * 0.86);
  return [
    {
      id: `guide-hud-left-${ts}`,
      orientation: 'vertical',
      position: safeX,
      label: 'Margen HUD Izq.',
      color: '#f43f5e',
      preset: 'hud',
    },
    {
      id: `guide-hud-center-${ts + 1}`,
      orientation: 'vertical',
      position: Math.round(width * 0.5),
      label: 'Centro Timer / KO',
      color: '#fbbf24',
      preset: 'hud',
    },
    {
      id: `guide-hud-right-${ts + 2}`,
      orientation: 'vertical',
      position: width - safeX,
      label: 'Margen HUD Der.',
      color: '#f43f5e',
      preset: 'hud',
    },
    {
      id: `guide-hud-top-${ts + 3}`,
      orientation: 'horizontal',
      position: safeTop,
      label: 'HUD Superior',
      color: '#38bdf8',
      preset: 'hud',
    },
    {
      id: `guide-hud-hp-${ts + 4}`,
      orientation: 'horizontal',
      position: healthBottom,
      label: 'Límite Barras HP',
      color: '#38bdf8',
      preset: 'hud',
    },
    {
      id: `guide-hud-super-${ts + 5}`,
      orientation: 'horizontal',
      position: superTop,
      label: 'Zona Barra Súper',
      color: '#a855f7',
      preset: 'hud',
    },
  ];
}

export function createCharacterGuidePreset(width: number, height: number): CanvasGuide[] {
  const ts = Date.now();
  return [
    {
      id: `guide-char-axis-${ts}`,
      orientation: 'vertical',
      position: Math.round(width * 0.5),
      label: 'Eje Central Personaje',
      color: '#38bdf8',
      preset: 'character',
    },
    {
      id: `guide-char-head-${ts + 1}`,
      orientation: 'horizontal',
      position: Math.round(height * 0.16),
      label: 'Cabeza / Corona',
      color: '#a855f7',
      preset: 'character',
    },
    {
      id: `guide-char-shoulders-${ts + 2}`,
      orientation: 'horizontal',
      position: Math.round(height * 0.34),
      label: 'Hombros / Guardia',
      color: '#38bdf8',
      preset: 'character',
    },
    {
      id: `guide-char-waist-${ts + 3}`,
      orientation: 'horizontal',
      position: Math.round(height * 0.54),
      label: 'Cadera / Centro Masa',
      color: '#fbbf24',
      preset: 'character',
    },
    {
      id: `guide-char-feet-${ts + 4}`,
      orientation: 'horizontal',
      position: Math.round(height * 0.88),
      label: 'Línea de Pies / Suelo',
      color: '#10b981',
      preset: 'character',
    },
  ];
}

export function createStageGuidePreset(width: number, height: number): CanvasGuide[] {
  const ts = Date.now();
  return [
    {
      id: `guide-stage-t1x-${ts}`,
      orientation: 'vertical',
      position: Math.round(width / 3),
      label: 'Tercio Izq. / Spawn P1',
      color: '#38bdf8',
      preset: 'stage',
    },
    {
      id: `guide-stage-t2x-${ts + 1}`,
      orientation: 'vertical',
      position: Math.round((width * 2) / 3),
      label: 'Tercio Der. / Spawn P2',
      color: '#38bdf8',
      preset: 'stage',
    },
    {
      id: `guide-stage-bound-l-${ts + 2}`,
      orientation: 'vertical',
      position: Math.max(2, Math.round(width * 0.08)),
      label: 'Esquina Escenario Izq.',
      color: '#f97316',
      preset: 'stage',
    },
    {
      id: `guide-stage-bound-r-${ts + 3}`,
      orientation: 'vertical',
      position: Math.min(width - 2, Math.round(width * 0.92)),
      label: 'Esquina Escenario Der.',
      color: '#f97316',
      preset: 'stage',
    },
    {
      id: `guide-stage-horizon-${ts + 4}`,
      orientation: 'horizontal',
      position: Math.round(height * 0.58),
      label: 'Horizonte Escenario',
      color: '#f59e0b',
      preset: 'stage',
    },
    {
      id: `guide-stage-floor-${ts + 5}`,
      orientation: 'horizontal',
      position: Math.round(height * 0.84),
      label: 'Piso de Combate',
      color: '#10b981',
      preset: 'stage',
    },
  ];
}

export function createGuidePreset(kind: GuidePresetKind, width: number, height: number): CanvasGuide[] {
  switch (kind) {
    case 'horizon':
      return createHorizonGuidePreset(width, height);
    case 'hud':
      return createHudGuidePreset(width, height);
    case 'character':
      return createCharacterGuidePreset(width, height);
    case 'stage':
      return createStageGuidePreset(width, height);
  }
}

/**
 * Generates a crisp nearest-neighbor 48x48 PNG data URL thumbnail from frame 0
 * for displaying in "Archivo -> Abrir Recientes".
 */
export function renderProjectThumbnailDataUrl(
  frames: Frame[],
  width: number,
  height: number,
  layerGroups: LayerGroup[] = []
): string | undefined {
  try {
    const f0 = frames[0];
    if (!f0) return undefined;
    const grid = compositeFrame(f0, width, height, 0, true, layerGroups);
    const thumbSize = 48;
    const canvas = document.createElement('canvas');
    canvas.width = thumbSize;
    canvas.height = thumbSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    // Subtle dark checkerboard backdrop
    const tile = 6;
    for (let ty = 0; ty < thumbSize; ty += tile) {
      for (let tx = 0; tx < thumbSize; tx += tile) {
        ctx.fillStyle = ((tx / tile + ty / tile) & 1) === 0 ? '#141824' : '#1b2131';
        ctx.fillRect(tx, ty, tile, tile);
      }
    }

    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = Math.max(1, width);
    srcCanvas.height = Math.max(1, height);
    const sctx = srcCanvas.getContext('2d');
    if (!sctx) return undefined;
    for (let y = 0; y < height; y++) {
      const row = grid[y];
      if (!row) continue;
      for (let x = 0; x < width; x++) {
        const col = row[x];
        if (!col) continue;
        sctx.fillStyle = col;
        sctx.fillRect(x, y, 1, 1);
      }
    }

    const scale = Math.min((thumbSize - 4) / Math.max(1, width), (thumbSize - 4) / Math.max(1, height));
    const dw = Math.max(1, Math.round(width * scale));
    const dh = Math.max(1, Math.round(height * scale));
    const dx = Math.floor((thumbSize - dw) / 2);
    const dy = Math.floor((thumbSize - dh) / 2);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(srcCanvas, dx, dy, dw, dh);
    return canvas.toDataURL('image/png');
  } catch {
    return undefined;
  }
}
