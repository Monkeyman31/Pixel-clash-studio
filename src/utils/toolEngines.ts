import {
  BrushTextureType,
  BucketToolOptions,
  DitherConfig,
  EraserToolOptions,
  GradientConfig,
  MagicWandOptions,
  MoveToolOptions,
  OptionsBarState,
  QuickAiBarOptions,
  SelectionArea,
  SelectionBooleanMode,
  SelectionDisplayConfig,
  SelectionToolOptions,
  ShapePatternType,
  ShapeToolConfig,
} from '../types';
import { blendHexColors } from './pixelMath';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = (hex || '#000000').replace('#', '').trim();
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16) || 0,
      g: parseInt(clean[1] + clean[1], 16) || 0,
      b: parseInt(clean[2] + clean[2], 16) || 0,
    };
  }
  const num = parseInt(clean.slice(0, 6), 16);
  if (Number.isNaN(num)) return { r: 0, g: 0, b: 0 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${((1 << 24) + (clamp(r) << 16) + (clamp(g) << 8) + clamp(b)).toString(16).slice(1)}`;
}

export const DEFAULT_GRADIENT_CONFIG: GradientConfig = {
  type: 'linear',
  ditherAlgorithm: 'bayer',
  intensity: 85,
  scale: 1,
  contrast: 50,
  paletteMode: 'primary_secondary',
  reverse: false,
  opacity: 1,
};

export const DEFAULT_SHAPE_CONFIG: ShapeToolConfig = {
  shapeKind: 'rectangle',
  roundedCorners: false,
  cornerRadius: 4,
  independentCorners: false,
  cornerRadii: [4, 4, 4, 4],
  bevel: 0,
  filled: true,
  fillMode: 'solid',
  strokeEnabled: true,
  strokeWidth: 1,
  innerStroke: false,
  innerStrokeWidth: 1,
  outerStroke: false,
  outerStrokeWidth: 1,
  antiAlias: false,
  pixelPerfect: true,
  pattern: 'checker',
  useDither: false,
  useGradient: false,
  opacity: 1,
  arcStartDeg: 0,
  arcSweepPct: 100,
  arcType: 'full',
  sides: 6,
  innerRadiusRatio: 1,
  vertexRoundness: 0,
  starPoints: 5,
  starDepth: 0.45,
  starSymmetry: 0,
  arrowShaftWidth: 0.38,
  arrowHeadSize: 0.36,
  arrowHeadType: 'triangle',
  arrowCurvature: 0,
  customPreset: 'heart',
  rasterPolicy: 'keep_editable',
};

export const DEFAULT_ERASER_OPTIONS: EraserToolOptions = {
  hardness: 100,
  opacity: 1,
  flow: 1,
  antiAlias: false,
  pixelPerfect: true,
  shape: 'square',
};

export const DEFAULT_BUCKET_OPTIONS: BucketToolOptions = {
  tolerance: 0,
  contiguous: true,
  allLayers: false,
  ignoreTransparency: false,
  expandPx: 0,
  globalFill: false,
};

export const DEFAULT_MAGIC_WAND_OPTIONS: MagicWandOptions = {
  tolerance: 12,
  contiguous: true,
  allLayers: false,
  continuousSelection: false,
  smooth: false,
};

export const DEFAULT_SELECTION_OPTIONS: SelectionToolOptions = {
  opMode: 'replace',
  fixedRatio: false,
  ratioW: 1,
  ratioH: 1,
  roundedCorners: false,
  cornerRadius: 4,
  perfectCircle: false,
  smooth: false,
  rememberBooleanMode: true,
};

export const DEFAULT_MOVE_OPTIONS: MoveToolOptions = {
  autoSelect: true,
  showControls: true,
  snapToGrid: true,
  snapToGuides: true,
};

export const DEFAULT_OPTIONS_BAR_STATE: OptionsBarState = {
  visible: true,
  displayMode: 'icon_text',
  collapsed: false,
  floating: false,
  floatX: 80,
  floatY: 88,
  floatWidth: 920,
};

export const DEFAULT_QUICK_AI_OPTIONS: QuickAiBarOptions = {
  prompt: 'Aura de energía pixel art vibrante',
  intensity: 75,
  style: 'arcade_cps2',
  useReference: false,
  adaptToCanvas: true,
  variations: 1,
};

const OPTIONS_BAR_STORAGE_KEY = 'pixelclash_options_bar_v1';

export function loadOptionsBarState(): OptionsBarState {
  try {
    const raw = localStorage.getItem(OPTIONS_BAR_STORAGE_KEY);
    if (!raw) return DEFAULT_OPTIONS_BAR_STATE;
    return { ...DEFAULT_OPTIONS_BAR_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_OPTIONS_BAR_STATE;
  }
}

export function saveOptionsBarState(state: OptionsBarState): void {
  try {
    localStorage.setItem(OPTIONS_BAR_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

export const DEFAULT_SELECTION_DISPLAY_CONFIG: SelectionDisplayConfig = {
  mode: 'both',
  animationSpeed: 55,
  borderColor: '#38bdf8',
  opacity: 0.22,
  thickness: 1.5,
};

const SELECTION_DISPLAY_STORAGE_KEY = 'pixelclash_selection_display_v1';

export function loadSelectionDisplayConfig(): SelectionDisplayConfig {
  try {
    const raw = localStorage.getItem(SELECTION_DISPLAY_STORAGE_KEY);
    if (!raw) return DEFAULT_SELECTION_DISPLAY_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SELECTION_DISPLAY_CONFIG,
      ...parsed,
    };
  } catch {
    return DEFAULT_SELECTION_DISPLAY_CONFIG;
  }
}

export function saveSelectionDisplayConfig(cfg: SelectionDisplayConfig): void {
  try {
    localStorage.setItem(SELECTION_DISPLAY_STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // Ignore storage errors
  }
}

// =========================================================================
// 1. DETERMINISTIC HASH & BAYER MATRICES
// =========================================================================

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const ORDERED_8X8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

export function hashPixel2D(x: number, y: number, seed = 1337): number {
  let n = Math.imul(x + 374761393, 668265263) ^ Math.imul(y + 1442695041, 2246822519) ^ Math.imul(seed, 3266489917);
  n = (n ^ (n >>> 13)) * 1274126177;
  n = n ^ (n >>> 16);
  return (n >>> 0) / 4294967295;
}

function rotateCoord(x: number, y: number, rotation: 0 | 90 | 180 | 270): { rx: number; ry: number } {
  switch (rotation) {
    case 90:
      return { rx: -y, ry: x };
    case 180:
      return { rx: -x, ry: -y };
    case 270:
      return { rx: y, ry: -x };
    default:
      return { rx: x, ry: y };
  }
}

export function evaluateDitherThreshold(
  x: number,
  y: number,
  config: DitherConfig
): number {
  const scale = Math.max(1, Math.round(config.scale ?? 1));
  const sx = Math.floor(x / scale);
  const sy = Math.floor(y / scale);
  const { rx, ry } = rotateCoord(sx, sy, config.rotation);
  const mx4 = ((rx % 4) + 4) % 4;
  const my4 = ((ry % 4) + 4) % 4;
  const mx2 = ((rx % 2) + 2) % 2;
  const my2 = ((ry % 2) + 2) % 2;

  let threshold = 0.5;
  switch (config.pattern) {
    case 'checkered':
      threshold = (mx2 + my2) % 2 === 0 ? 0.25 : 0.75;
      break;
    case 'sparse':
      threshold = mx4 === 0 && my4 === 0 ? 0.15 : ((mx4 + my4) % 2 === 0 ? 0.58 : 0.85);
      break;
    case 'dense':
      threshold = (mx2 === 0 && my2 === 0) ? 0.82 : 0.22;
      break;
    case 'horizontal':
      threshold = my2 === 0 ? 0.25 : 0.75;
      break;
    case 'diagonal':
      threshold = ((rx + ry) % 4 + 4) % 4 / 4;
      break;
    case 'custom': {
      const mat = config.customMatrix;
      if (mat && mat.length >= 4) {
        const bit = mat[my4]?.[mx4] ? 0.22 : 0.78;
        threshold = bit;
      } else {
        threshold = (BAYER_4X4[my4][mx4] + 0.5) / 16;
      }
      break;
    }
    case 'bayer4':
    default:
      threshold = (BAYER_4X4[my4][mx4] + 0.5) / 16;
      break;
  }

  // Apply contrast curve around 0.5
  const contrastNorm = (config.contrast ?? 50) / 50; // 0..2
  threshold = Math.max(0.01, Math.min(0.99, (threshold - 0.5) * contrastNorm + 0.5));

  // Apply randomness jitter
  const randAmt = (config.randomness ?? 0) / 100;
  if (randAmt > 0) {
    const jitter = (hashPixel2D(sx, sy, 9173) - 0.5) * randAmt;
    threshold = Math.max(0.01, Math.min(0.99, threshold + jitter));
  }

  return threshold;
}

/**
 * Universal brush dithering modifier:
 * Returns a resolved color or null (skip pixel) depending on pattern, density, scale,
 * contrast, rotation, randomness, and blendMode.
 */
export function computeUniversalDitherPixel(
  x: number,
  y: number,
  config: DitherConfig,
  primaryColor: string,
  secondaryColor: string,
  existingColor: string | null,
  opacity: number = 1
): string | null {
  let effectiveDensity = Math.max(0, Math.min(100, config.density)) / 100;

  if (config.smartLuminance && existingColor) {
    const rgb = hexToRgb(existingColor);
    const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    effectiveDensity = Math.max(0.08, Math.min(0.92, effectiveDensity * (1 - lum * 0.45)));
  }

  const threshold = evaluateDitherThreshold(x, y, config);
  let usePrimary = effectiveDensity >= threshold;
  if (config.invert) usePrimary = !usePrimary;

  const blendMode = config.blendMode ?? 'replace';

  if (blendMode === 'secondary') {
    const target = usePrimary ? primaryColor : secondaryColor;
    return opacity < 0.999 ? blendHexColors(existingColor, target, opacity, 'normal') : target;
  }

  if (blendMode === 'mix') {
    if (usePrimary) {
      return opacity < 0.999 ? blendHexColors(existingColor, primaryColor, opacity, 'normal') : primaryColor;
    }
    const mixed = blendHexColors(primaryColor, secondaryColor, 0.5, 'normal');
    return opacity < 0.999 ? blendHexColors(existingColor, mixed, opacity * 0.65, 'normal') : mixed;
  }

  if (blendMode === 'overlay') {
    if (!usePrimary) return null;
    const base = existingColor || secondaryColor;
    return blendHexColors(base, primaryColor, Math.max(0.15, opacity * 0.72), 'overlay');
  }

  // 'replace': paint primary on active dither cells, skip inactive cells (preserving background/layer)
  if (!usePrimary) return null;
  return opacity < 0.999 ? blendHexColors(existingColor, primaryColor, opacity, 'normal') : primaryColor;
}

/**
 * Evaluates procedural brush texture alpha multiplier (0..1) for universal brush texture support.
 */
export function evaluateBrushTextureFactor(
  x: number,
  y: number,
  texture: BrushTextureType | undefined,
  strength: number = 50
): number {
  if (!texture || texture === 'none' || strength <= 0) return 1;
  const amt = Math.max(0, Math.min(1, strength / 100));
  let sample = 1;
  switch (texture) {
    case 'noise':
      sample = hashPixel2D(x, y, 4219);
      break;
    case 'paper': {
      const coarse = hashPixel2D(Math.floor(x / 2), Math.floor(y / 2), 771);
      const fine = hashPixel2D(x, y, 311);
      sample = coarse * 0.65 + fine * 0.35;
      break;
    }
    case 'canvas': {
      const weaveX = ((x % 3) + 3) % 3 === 0 ? 0.35 : 0.95;
      const weaveY = ((y % 3) + 3) % 3 === 0 ? 0.35 : 0.95;
      sample = (weaveX + weaveY) * 0.5;
      break;
    }
    case 'dots': {
      const mx = ((x % 3) + 3) % 3;
      const my = ((y % 3) + 3) % 3;
      sample = mx === 1 && my === 1 ? 1 : 0.25;
      break;
    }
    case 'crosshatch': {
      const d1 = ((x + y) % 4 + 4) % 4 === 0;
      const d2 = ((x - y) % 4 + 4) % 4 === 0;
      sample = d1 || d2 ? 1 : 0.22;
      break;
    }
    default:
      sample = 1;
  }
  return Math.max(0.05, 1 - amt + amt * sample);
}

// =========================================================================
// 2. GRADIENT & DITHERED GRADIENT ENGINE
// =========================================================================

function interpolateColorList(colors: string[], t: number): string {
  if (colors.length === 0) return '#ffffff';
  if (colors.length === 1) return colors[0];
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (colors.length - 1);
  const idx0 = Math.floor(scaled);
  const idx1 = Math.min(colors.length - 1, idx0 + 1);
  const frac = scaled - idx0;
  const c0 = hexToRgb(colors[idx0]);
  const c1 = hexToRgb(colors[idx1]);
  return rgbToHex(
    Math.round(c0.r + (c1.r - c0.r) * frac),
    Math.round(c0.g + (c1.g - c0.g) * frac),
    Math.round(c0.b + (c1.b - c0.b) * frac)
  );
}

function buildGradientPaletteStops(
  primaryColor: string,
  secondaryColor: string,
  paletteMode: GradientConfig['paletteMode'],
  activePaletteColors?: string[],
  reverse?: boolean
): string[] {
  let stops: string[];
  if (paletteMode === 'active_palette' && activePaletteColors && activePaletteColors.length >= 2) {
    // Sort palette colors by luminance for smooth pixel-art ramps
    stops = [...activePaletteColors].slice(0, 12).sort((a, b) => {
      const ra = hexToRgb(a);
      const rb = hexToRgb(b);
      const la = 0.299 * ra.r + 0.587 * ra.g + 0.114 * ra.b;
      const lb = 0.299 * rb.r + 0.587 * rb.g + 0.114 * rb.b;
      return lb - la;
    });
  } else if (paletteMode === 'monochrome') {
    const rgb = hexToRgb(primaryColor);
    const highlight = rgbToHex(
      Math.min(255, Math.round(rgb.r + (255 - rgb.r) * 0.65)),
      Math.min(255, Math.round(rgb.g + (255 - rgb.g) * 0.65)),
      Math.min(255, Math.round(rgb.b + (255 - rgb.b) * 0.65))
    );
    const shadow = rgbToHex(
      Math.max(0, Math.round(rgb.r * 0.28)),
      Math.max(0, Math.round(rgb.g * 0.28)),
      Math.max(0, Math.round(rgb.b * 0.28))
    );
    stops = [highlight, primaryColor, shadow];
  } else {
    stops = [primaryColor, secondaryColor];
  }
  return reverse ? [...stops].reverse() : stops;
}

export function evaluateGradientFactor(
  x: number,
  y: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  type: GradientConfig['type']
): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const lenSq = dx * dx + dy * dy;
  const len = Math.sqrt(lenSq);
  if (len < 0.001) return 0;

  const px = x - x0;
  const py = y - y0;

  switch (type) {
    case 'radial': {
      const dist = Math.hypot(px, py);
      return Math.max(0, Math.min(1, dist / len));
    }
    case 'angular': {
      const baseAngle = Math.atan2(dy, dx);
      const ptAngle = Math.atan2(py, px);
      let diff = ptAngle - baseAngle;
      while (diff < 0) diff += Math.PI * 2;
      while (diff >= Math.PI * 2) diff -= Math.PI * 2;
      return diff / (Math.PI * 2);
    }
    case 'reflected': {
      const proj = (px * dx + py * dy) / lenSq;
      return Math.max(0, Math.min(1, Math.abs(proj)));
    }
    case 'diamond': {
      // Rotate pixel into gradient basis so diamond aligns with drag angle
      const ux = dx / len;
      const uy = dy / len;
      const rx = Math.abs(px * ux + py * uy);
      const ry = Math.abs(-px * uy + py * ux);
      return Math.max(0, Math.min(1, (rx + ry) / len));
    }
    case 'linear':
    default: {
      const proj = (px * dx + py * dy) / lenSq;
      return Math.max(0, Math.min(1, proj));
    }
  }
}

export function sampleGradientColorAt(
  x: number,
  y: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  config: GradientConfig,
  useDither: boolean,
  primaryColor: string,
  secondaryColor: string,
  activePaletteColors?: string[],
  customMatrix?: number[][]
): string {
  const stops = buildGradientPaletteStops(
    primaryColor,
    secondaryColor,
    config.paletteMode,
    activePaletteColors,
    config.reverse
  );

  let t = evaluateGradientFactor(x, y, x0, y0, x1, y1, config.type);

  // Contrast adjustment around 0.5
  const contrastFactor = 0.25 + (config.contrast / 50) * 1.15;
  t = Math.max(0, Math.min(1, (t - 0.5) * contrastFactor + 0.5));

  if (!useDither || config.intensity <= 0) {
    return interpolateColorList(stops, t);
  }

  const scale = Math.max(1, Math.round(config.scale));
  const sx = Math.floor(x / scale);
  const sy = Math.floor(y / scale);
  let threshold = 0.5;

  switch (config.ditherAlgorithm) {
    case 'ordered': {
      const mx = ((sx % 8) + 8) % 8;
      const my = ((sy % 8) + 8) % 8;
      threshold = (ORDERED_8X8[my][mx] + 0.5) / 64;
      break;
    }
    case 'custom': {
      const mx = ((sx % 4) + 4) % 4;
      const my = ((sy % 4) + 4) % 4;
      if (customMatrix && customMatrix.length >= 4) {
        const bit = customMatrix[my]?.[mx] ? 0.25 : 0.75;
        threshold = bit * 0.7 + ((BAYER_4X4[my][mx] + 0.5) / 16) * 0.3;
      } else {
        threshold = (BAYER_4X4[my][mx] + 0.5) / 16;
      }
      break;
    }
    case 'noise': {
      threshold = hashPixel2D(sx, sy, 5813);
      break;
    }
    case 'bayer':
    default: {
      const mx = ((sx % 4) + 4) % 4;
      const my = ((sy % 4) + 4) % 4;
      threshold = (BAYER_4X4[my][mx] + 0.5) / 16;
      break;
    }
  }

  const intensityNorm = Math.max(0, Math.min(1, config.intensity / 100));
  const segments = Math.max(1, stops.length - 1);
  const scaled = t * segments;
  const idx0 = Math.min(segments - 1, Math.floor(scaled));
  const idx1 = Math.min(stops.length - 1, idx0 + 1);
  const localT = scaled - idx0;

  // Blend between pure dithered selection and smooth interpolation using intensity
  const ditheredColor = localT >= threshold ? stops[idx1] : stops[idx0];
  if (intensityNorm >= 0.98) {
    return ditheredColor;
  }
  const smoothColor = interpolateColorList(stops, t);
  return blendHexColors(smoothColor, ditheredColor, intensityNorm, 'normal');
}

export function renderGradientToGrid(
  grid: (string | null)[][],
  basePixels: (string | null)[][],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  config: GradientConfig,
  useDither: boolean,
  primaryColor: string,
  secondaryColor: string,
  options: {
    selection?: SelectionArea | null;
    lockTransparency?: boolean;
    activePaletteColors?: string[];
    customMatrix?: number[][];
  } = {}
): void {
  const height = grid.length;
  const width = grid[0]?.length || 0;
  const { selection, lockTransparency, activePaletteColors, customMatrix } = options;

  const hasSel = Boolean(selection && selection.active);
  const minX = hasSel ? Math.max(0, Math.min(selection!.startX, selection!.endX)) : 0;
  const maxX = hasSel ? Math.min(width - 1, Math.max(selection!.startX, selection!.endX)) : width - 1;
  const minY = hasSel ? Math.max(0, Math.min(selection!.startY, selection!.endY)) : 0;
  const maxY = hasSel ? Math.min(height - 1, Math.max(selection!.startY, selection!.endY)) : height - 1;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (hasSel && selection!.mask && !selection!.mask[y]?.[x]) continue;
      if (lockTransparency && !basePixels[y]?.[x]) continue;

      const sampled = sampleGradientColorAt(
        x,
        y,
        x0,
        y0,
        x1,
        y1,
        config,
        useDither,
        primaryColor,
        secondaryColor,
        activePaletteColors,
        customMatrix
      );

      grid[y][x] =
        config.opacity < 0.999
          ? blendHexColors(grid[y][x], sampled, config.opacity, 'normal')
          : sampled;
    }
  }
}

// =========================================================================
// 3. ADVANCED SHAPE ENGINE (RECTANGLE & ELLIPSE WITH 12 MODIFIERS)
// =========================================================================

function sampleShapePatternColor(
  x: number,
  y: number,
  pattern: ShapePatternType,
  primary: string,
  secondary: string
): string | null {
  const mx = ((x % 4) + 4) % 4;
  const my = ((y % 4) + 4) % 4;
  switch (pattern) {
    case 'checker':
      return (x + y) % 2 === 0 ? primary : secondary;
    case 'dots':
      return mx === 1 && my === 1 ? primary : secondary;
    case 'hlines':
      return y % 2 === 0 ? primary : secondary;
    case 'vlines':
      return x % 2 === 0 ? primary : secondary;
    case 'diagonal':
      return ((x + y) % 3 + 3) % 3 === 0 ? primary : secondary;
    case 'bricks': {
      const row = Math.floor(y / 3);
      const offset = (row % 2) * 3;
      const isMortar = y % 3 === 0 || (x + offset) % 6 === 0;
      return isMortar ? secondary : primary;
    }
    default:
      return primary;
  }
}

/**
 * Signed distance function for rectangle (with optional rounded corners or chamfer bevel)
 * and ellipse. Negative = inside, 0 = boundary, Positive = outside.
 */
function shapeSignedDistance(
  px: number,
  py: number,
  cx: number,
  cy: number,
  hx: number,
  hy: number,
  config: ShapeToolConfig
): number {
  const dx = Math.abs(px - cx);
  const dy = Math.abs(py - cy);

  if (config.shapeKind === 'ellipse') {
    const rx = Math.max(0.5, hx);
    const ry = Math.max(0.5, hy);
    const nx = dx / rx;
    const ny = dy / ry;
    const d = Math.hypot(nx, ny);
    // Approximate Euclidean distance in pixel space
    return (d - 1) * Math.min(rx, ry);
  }

  // Chamfered bevel rectangle (octagonal corners)
  const bevel = Math.min(config.bevel, Math.floor(Math.min(hx, hy)));
  if (bevel > 0 && !config.roundedCorners) {
    const boxDist = Math.max(dx - hx, dy - hy);
    const chamferDist = (dx - (hx - bevel) + dy - (hy - bevel)) * 0.70710678 - bevel * 0.70710678;
    return Math.max(boxDist, chamferDist);
  }

  // Rounded rectangle SDF
  const r = config.roundedCorners ? Math.min(config.cornerRadius, Math.min(hx, hy)) : 0;
  const qx = dx - (hx - r);
  const qy = dy - (hy - r);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const inside = Math.min(Math.max(qx, qy), 0);
  return outside + inside - r;
}

export function renderAdvancedShapeToGrid(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  grid: (string | null)[][],
  config: ShapeToolConfig,
  primaryColor: string,
  secondaryColor: string,
  ditherConfig: DitherConfig,
  gradientConfig: GradientConfig,
  activePaletteColors?: string[],
  opacity: number = 1
): void {
  const height = grid.length;
  const width = grid[0]?.length || 0;
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const hx = Math.max(0.5, (maxX - minX) / 2);
  const hy = Math.max(0.5, (maxY - minY) / 2);

  const outerPad = config.outerStroke ? Math.ceil(config.outerStrokeWidth) + 1 : 1;
  const scanMinX = Math.max(0, Math.floor(minX - outerPad));
  const scanMaxX = Math.min(width - 1, Math.ceil(maxX + outerPad));
  const scanMinY = Math.max(0, Math.floor(minY - outerPad));
  const scanMaxY = Math.min(height - 1, Math.ceil(maxY + outerPad));

  // Build crisp binary inside mask first for clean pixel-perfect contours & inner/outer strokes
  const insideMap = new Map<number, boolean>();
  const sdfMap = new Map<number, number>();
  const key = (px: number, py: number) => py * width + px;

  for (let py = scanMinY; py <= scanMaxY; py++) {
    for (let px = scanMinX; px <= scanMaxX; px++) {
      const sd = shapeSignedDistance(px, py, cx, cy, hx, hy, config);
      sdfMap.set(key(px, py), sd);
      insideMap.set(key(px, py), sd <= 0.15);
    }
  }

  const strokeW = config.strokeEnabled ? Math.max(1, config.strokeWidth) : 0;
  const innerW = config.innerStroke ? Math.max(1, config.innerStrokeWidth) : 0;
  const outerW = config.outerStroke ? Math.max(1, config.outerStrokeWidth) : 0;

  const paintCell = (px: number, py: number, color: string | null, cellOpacity: number) => {
    if (!color || px < 0 || px >= width || py < 0 || py >= height) return;
    const alpha = Math.max(0.05, Math.min(1, opacity * cellOpacity));
    grid[py][px] = alpha < 0.999 ? blendHexColors(grid[py][px], color, alpha, 'normal') : color;
  };

  // Resolve fill pixel color respecting fillMode, pattern, dither, and gradient modifiers
  const resolveFillColor = (px: number, py: number): string | null => {
    const mode = config.filled ? (config.fillMode === 'none' ? 'solid' : config.fillMode) : 'none';
    if (mode === 'none') return null;

    if (mode === 'gradient' || config.useGradient) {
      return sampleGradientColorAt(
        px,
        py,
        minX,
        minY,
        maxX,
        maxY,
        gradientConfig,
        config.useDither || mode === 'dither',
        primaryColor,
        secondaryColor,
        activePaletteColors,
        ditherConfig.customMatrix
      );
    }

    if (mode === 'pattern') {
      return sampleShapePatternColor(px, py, config.pattern, primaryColor, secondaryColor);
    }

    if (mode === 'dither' || config.useDither) {
      return computeUniversalDitherPixel(
        px,
        py,
        { ...ditherConfig, enabled: true },
        primaryColor,
        secondaryColor,
        grid[py][px],
        1
      );
    }

    return primaryColor;
  };

  // Track single-pixel boundary points for pixel-perfect L-corner pruning
  const strokeCoords: { x: number; y: number }[] = [];

  for (let py = scanMinY; py <= scanMaxY; py++) {
    for (let px = scanMinX; px <= scanMaxX; px++) {
      const sd = sdfMap.get(key(px, py)) ?? 99;
      const inside = insideMap.get(key(px, py)) ?? false;

      // 1. Outer Stroke (outside shape boundary)
      if (outerW > 0 && !inside && sd <= outerW + 0.25) {
        const edgeAlpha = config.antiAlias && sd > outerW - 0.55 ? Math.max(0.18, 1 - (sd - (outerW - 0.55))) : 1;
        paintCell(px, py, secondaryColor, edgeAlpha);
        continue;
      }

      // Anti-aliased soft outer fringe when no outer stroke
      if (!inside) {
        if (config.antiAlias && !config.pixelPerfect && sd > 0.15 && sd < 0.95) {
          const fringeAlpha = Math.max(0.12, 1 - sd);
          const fringeCol = config.strokeEnabled ? primaryColor : resolveFillColor(px, py);
          paintCell(px, py, fringeCol, fringeAlpha * 0.72);
        }
        continue;
      }

      // Check 4-neighbor boundary distance
      const isBorder4 =
        !(insideMap.get(key(px - 1, py)) ?? false) ||
        !(insideMap.get(key(px + 1, py)) ?? false) ||
        !(insideMap.get(key(px, py - 1)) ?? false) ||
        !(insideMap.get(key(px, py + 1)) ?? false);

      // 2. Main Contour / Stroke
      const isMainStroke =
        strokeW > 0 && (strokeW === 1 ? isBorder4 : sd > -(strokeW - 0.15));

      if (isMainStroke) {
        if (strokeW === 1 && config.pixelPerfect && !config.filled) {
          strokeCoords.push({ x: px, y: py });
        } else {
          const strokeCol = config.useGradient
            ? sampleGradientColorAt(
                px,
                py,
                minX,
                minY,
                maxX,
                maxY,
                gradientConfig,
                config.useDither,
                primaryColor,
                secondaryColor,
                activePaletteColors,
                ditherConfig.customMatrix
              )
            : primaryColor;
          paintCell(px, py, strokeCol, 1);
        }
        continue;
      }

      // 3. Inner Stroke (inset inside main stroke)
      if (innerW > 0 && sd <= -(strokeW - 0.15) && sd > -(strokeW + innerW - 0.15)) {
        paintCell(px, py, secondaryColor, 1);
        continue;
      }

      // 4. Fill Interior
      if (config.filled) {
        const fillCol = resolveFillColor(px, py);
        if (fillCol) {
          paintCell(px, py, fillCol, 1);
        }
      }
    }
  }

  // Pixel-Perfect L-corner cleanup for 1px unfilled outlines
  if (strokeCoords.length > 0) {
    const coordSet = new Set(strokeCoords.map((p) => key(p.x, p.y)));
    for (const p of strokeCoords) {
      const nUp = coordSet.has(key(p.x, p.y - 1));
      const nDown = coordSet.has(key(p.x, p.y + 1));
      const nLeft = coordSet.has(key(p.x - 1, p.y));
      const nRight = coordSet.has(key(p.x + 1, p.y));
      // Prune redundant corner elbow pixel if diagonal neighbor preserves full 8-connectivity
      const isElbow =
        (nUp && nLeft && coordSet.has(key(p.x - 1, p.y - 1)) && !nDown && !nRight) ||
        (nUp && nRight && coordSet.has(key(p.x + 1, p.y - 1)) && !nDown && !nLeft) ||
        (nDown && nLeft && coordSet.has(key(p.x - 1, p.y + 1)) && !nUp && !nRight) ||
        (nDown && nRight && coordSet.has(key(p.x + 1, p.y + 1)) && !nUp && !nLeft);

      if (isElbow && (config.shapeKind === 'ellipse' || config.roundedCorners || config.bevel > 0)) {
        coordSet.delete(key(p.x, p.y));
        continue;
      }

      const strokeCol = config.useGradient
        ? sampleGradientColorAt(
            p.x,
            p.y,
            minX,
            minY,
            maxX,
            maxY,
            gradientConfig,
            config.useDither,
            primaryColor,
            secondaryColor,
            activePaletteColors,
            ditherConfig.customMatrix
          )
        : primaryColor;
      paintCell(p.x, p.y, strokeCol, 1);
    }
  }
}

// =========================================================================
// 4. MAGNETIC LASSO EDGE DETECTION & CONTOUR TRACING ENGINE
// =========================================================================

export interface EdgeMapData {
  width: number;
  height: number;
  strength: Float32Array;
}

/**
 * Computes pixel-art contour edge strength combining alpha boundary contrast
 * and RGB Sobel gradient magnitude.
 */
export function computeCanvasEdgeMap(pixels: (string | null)[][]): EdgeMapData {
  const height = pixels.length;
  const width = pixels[0]?.length || 0;
  const strength = new Float32Array(width * height);

  const sampleLumAlpha = (x: number, y: number): { l: number; a: number } => {
    if (x < 0 || x >= width || y < 0 || y >= height) return { l: 0, a: 0 };
    const col = pixels[y]?.[x];
    if (!col) return { l: 0, a: 0 };
    const rgb = hexToRgb(col);
    return { l: (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255, a: 1 };
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const c = sampleLumAlpha(x, y);
      const l = sampleLumAlpha(x - 1, y);
      const r = sampleLumAlpha(x + 1, y);
      const u = sampleLumAlpha(x, y - 1);
      const d = sampleLumAlpha(x, y + 1);

      // Strongest signal: silhouette boundary (opaque pixel adjacent to transparent)
      const alphaEdge =
        c.a > 0 && (l.a === 0 || r.a === 0 || u.a === 0 || d.a === 0)
          ? 1.0
          : c.a === 0 && (l.a > 0 || r.a > 0 || u.a > 0 || d.a > 0)
          ? 0.55
          : 0;

      // Internal color contrast (Sobel-like)
      const gx = Math.abs(r.l - l.l);
      const gy = Math.abs(d.l - u.l);
      const lumEdge = Math.min(1, Math.hypot(gx, gy) * 1.45);

      strength[y * width + x] = Math.min(1, Math.max(alphaEdge, lumEdge));
    }
  }

  return { width, height, strength };
}

/**
 * Snaps a cursor coordinate to the highest-energy edge within a local search radius.
 */
export function snapPointToStrongestEdge(
  x: number,
  y: number,
  edgeMap: EdgeMapData,
  radius: number = 5
): { x: number; y: number; edgeScore: number } {
  const { width, height, strength } = edgeMap;
  let bestX = Math.max(0, Math.min(width - 1, Math.round(x)));
  let bestY = Math.max(0, Math.min(height - 1, Math.round(y)));
  let bestScore = strength[bestY * width + bestX] || 0;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = bestX + dx;
      const ny = bestY + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const dist = Math.hypot(dx, dy);
      if (dist > radius) continue;
      const edge = strength[ny * width + nx];
      if (edge < 0.18) continue;
      // Favor strong edges closer to cursor
      const score = edge - dist * 0.065;
      if (score > bestScore) {
        bestScore = score;
        bestX = nx;
        bestY = ny;
      }
    }
  }

  return { x: bestX, y: bestY, edgeScore: bestScore };
}

/**
 * Traces a contour-hugging path between anchor `start` and `end` using Dijkstra/A*
 * over edge costs bounded to the local corridor, providing crisp Magnetic Lasso snapping.
 */
export function traceMagneticLassoSegment(
  start: { x: number; y: number },
  end: { x: number; y: number },
  edgeMap: EdgeMapData
): { x: number; y: number }[] {
  const { width, height, strength } = edgeMap;
  const sx = Math.max(0, Math.min(width - 1, Math.round(start.x)));
  const sy = Math.max(0, Math.min(height - 1, Math.round(start.y)));
  const ex = Math.max(0, Math.min(width - 1, Math.round(end.x)));
  const ey = Math.max(0, Math.min(height - 1, Math.round(end.y)));

  if (sx === ex && sy === ey) return [{ x: ex, y: ey }];

  const distTotal = Math.hypot(ex - sx, ey - sy);
  // Keep search local and fast (<1ms)
  const pad = Math.min(10, Math.max(4, Math.ceil(distTotal * 0.35)));
  const minX = Math.max(0, Math.min(sx, ex) - pad);
  const maxX = Math.min(width - 1, Math.max(sx, ex) + pad);
  const minY = Math.max(0, Math.min(sy, ey) - pad);
  const maxY = Math.min(height - 1, Math.max(sy, ey) + pad);

  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const totalNodes = bw * bh;

  // Fallback straight line if bounding region is extremely large
  if (totalNodes > 2800) {
    const pts: { x: number; y: number }[] = [];
    const steps = Math.max(1, Math.ceil(distTotal));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const rx = Math.round(sx + (ex - sx) * t);
      const ry = Math.round(sy + (ey - sy) * t);
      const snapped = snapPointToStrongestEdge(rx, ry, edgeMap, 3);
      pts.push({ x: snapped.x, y: snapped.y });
    }
    return pts;
  }

  const gScore = new Float32Array(totalNodes).fill(1e9);
  const fScore = new Float32Array(totalNodes).fill(1e9);
  const cameFrom = new Int32Array(totalNodes).fill(-1);
  const closed = new Uint8Array(totalNodes);

  const idxOf = (x: number, y: number) => (y - minY) * bw + (x - minX);
  const startIdx = idxOf(sx, sy);
  const endIdx = idxOf(ex, ey);

  gScore[startIdx] = 0;
  fScore[startIdx] = distTotal * 0.25;

  const open: number[] = [startIdx];
  const dirs = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, 1.414],
    [-1, 1, 1.414],
    [1, -1, 1.414],
    [-1, -1, 1.414],
  ];

  let iter = 0;
  const maxIter = Math.min(totalNodes * 2, 1800);

  while (open.length > 0 && iter < maxIter) {
    iter++;
    // Pop lowest fScore
    let bestPos = 0;
    let bestF = fScore[open[0]];
    for (let i = 1; i < open.length; i++) {
      const f = fScore[open[i]];
      if (f < bestF) {
        bestF = f;
        bestPos = i;
      }
    }
    const cur = open[bestPos];
    open[bestPos] = open[open.length - 1];
    open.pop();

    if (cur === endIdx) break;
    if (closed[cur]) continue;
    closed[cur] = 1;

    const cx = minX + (cur % bw);
    const cy = minY + Math.floor(cur / bw);

    for (let d = 0; d < 8; d++) {
      const nx = cx + dirs[d][0];
      const ny = cy + dirs[d][1];
      if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue;
      const nIdx = idxOf(nx, ny);
      if (closed[nIdx]) continue;

      const edgeVal = strength[ny * width + nx];
      // Moving along strong edges costs 0.14; moving across flat space costs 1.15
      const stepCost = dirs[d][2] * (1.15 - edgeVal * 1.01);
      const tentativeG = gScore[cur] + stepCost;

      if (tentativeG < gScore[nIdx]) {
        cameFrom[nIdx] = cur;
        gScore[nIdx] = tentativeG;
        fScore[nIdx] = tentativeG + Math.hypot(ex - nx, ey - ny) * 0.3;
        open.push(nIdx);
      }
    }
  }

  // Reconstruct path
  if (cameFrom[endIdx] === -1) {
    return [{ x: ex, y: ey }];
  }

  const rev: { x: number; y: number }[] = [];
  let trace = endIdx;
  let guard = 0;
  while (trace !== -1 && trace !== startIdx && guard < totalNodes) {
    guard++;
    const tx = minX + (trace % bw);
    const ty = minY + Math.floor(trace / bw);
    rev.push({ x: tx, y: ty });
    trace = cameFrom[trace];
  }
  rev.reverse();
  return rev;
}

// =========================================================================
// 5. ADVANCED BUCKET FILL, MAGIC WAND & BOOLEAN SELECTION HELPERS
// =========================================================================

export function colorDistanceRgb(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (!a || !b) return 255;
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  return Math.max(Math.abs(ra.r - rb.r), Math.abs(ra.g - rb.g), Math.abs(ra.b - rb.b));
}

export function advancedFloodFill(
  startX: number,
  startY: number,
  sampleGrid: (string | null)[][],
  targetGrid: (string | null)[][],
  fillColor: string,
  secondaryColor: string,
  options: BucketToolOptions,
  ditherConfig?: DitherConfig,
  selection?: SelectionArea | null,
  lockTransparency?: boolean
): boolean {
  const height = targetGrid.length;
  const width = targetGrid[0]?.length || 0;
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) return false;

  const seedCol = sampleGrid[startY]?.[startX] ?? null;
  if (options.ignoreTransparency && seedCol === null) return false;
  if (lockTransparency && targetGrid[startY]?.[startX] === null) return false;

  const tol = Math.max(0, Math.min(255, options.tolerance || 0));
  const matches = (col: string | null): boolean => {
    if (options.ignoreTransparency && col === null) return false;
    if (seedCol === null) return col === null;
    if (col === null) return false;
    return colorDistanceRgb(seedCol, col) <= tol;
  };

  const inSel = (x: number, y: number): boolean => {
    if (!selection || !selection.active) return true;
    if (selection.mask) return Boolean(selection.mask[y]?.[x]);
    const minX = Math.min(selection.startX, selection.endX);
    const maxX = Math.max(selection.startX, selection.endX);
    const minY = Math.min(selection.startY, selection.endY);
    const maxY = Math.max(selection.startY, selection.endY);
    if (x < minX || x > maxX || y < minY || y > maxY) return false;
    if (selection.shape === 'ellipse') {
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const rx = Math.max(0.5, (maxX - minX) / 2 + 0.5);
      const ry = Math.max(0.5, (maxY - minY) / 2 + 0.5);
      return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
    }
    return true;
  };

  const mask = new Uint8Array(width * height);
  let hitCount = 0;

  if (options.globalFill || !options.contiguous) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!inSel(x, y)) continue;
        if (matches(sampleGrid[y]?.[x] ?? null)) {
          mask[y * width + x] = 1;
          hitCount++;
        }
      }
    }
  } else {
    if (!inSel(startX, startY)) return false;
    const stack: [number, number][] = [[startX, startY]];
    const visited = new Uint8Array(width * height);
    while (stack.length > 0) {
      const [fx, fy] = stack.pop()!;
      const idx = fy * width + fx;
      if (visited[idx]) continue;
      visited[idx] = 1;
      if (!inSel(fx, fy)) continue;
      if (!matches(sampleGrid[fy]?.[fx] ?? null)) continue;
      mask[idx] = 1;
      hitCount++;
      if (fx + 1 < width && !visited[idx + 1]) stack.push([fx + 1, fy]);
      if (fx - 1 >= 0 && !visited[idx - 1]) stack.push([fx - 1, fy]);
      if (fy + 1 < height && !visited[idx + width]) stack.push([fx, fy + 1]);
      if (fy - 1 >= 0 && !visited[idx - width]) stack.push([fx, fy - 1]);
    }
  }

  if (hitCount === 0) return false;

  // Optional 1..4px expansion (dilate fill region to eliminate anti-alias halo gaps)
  const expand = Math.max(0, Math.min(4, Math.round(options.expandPx || 0)));
  let finalMask = mask;
  for (let step = 0; step < expand; step++) {
    const next = new Uint8Array(finalMask);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (finalMask[idx]) continue;
        if (
          (x > 0 && finalMask[idx - 1]) ||
          (x + 1 < width && finalMask[idx + 1]) ||
          (y > 0 && finalMask[idx - width]) ||
          (y + 1 < height && finalMask[idx + width])
        ) {
          if (inSel(x, y)) next[idx] = 1;
        }
      }
    }
    finalMask = next;
  }

  let changed = false;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!finalMask[y * width + x]) continue;
      if (lockTransparency && targetGrid[y]?.[x] === null) continue;
      let col = fillColor;
      if (ditherConfig?.enabled) {
        const thr = evaluateDitherThreshold(x, y, ditherConfig);
        const pass = ditherConfig.invert
          ? ditherConfig.density / 100 < thr
          : ditherConfig.density / 100 >= thr;
        col = pass ? fillColor : secondaryColor;
      }
      if (targetGrid[y][x] !== col) {
        targetGrid[y][x] = col;
        changed = true;
      }
    }
  }
  return changed;
}

export function advancedMagicWandMask(
  startX: number,
  startY: number,
  sampleGrid: (string | null)[][],
  options: MagicWandOptions
): boolean[][] {
  const height = sampleGrid.length;
  const width = sampleGrid[0]?.length || 0;
  const mask: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) return mask;

  const seedCol = sampleGrid[startY]?.[startX] ?? null;
  const tol = Math.max(0, Math.min(255, options.tolerance || 0));
  const matches = (col: string | null): boolean => {
    if (seedCol === null) return col === null;
    if (col === null) return false;
    return colorDistanceRgb(seedCol, col) <= tol;
  };

  if (!options.contiguous) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (matches(sampleGrid[y]?.[x] ?? null)) mask[y][x] = true;
      }
    }
  } else {
    const visited = new Uint8Array(width * height);
    const stack: [number, number][] = [[startX, startY]];
    while (stack.length > 0) {
      const [fx, fy] = stack.pop()!;
      const idx = fy * width + fx;
      if (visited[idx]) continue;
      visited[idx] = 1;
      if (!matches(sampleGrid[fy]?.[fx] ?? null)) continue;
      mask[fy][fx] = true;
      if (fx + 1 < width && !visited[idx + 1]) stack.push([fx + 1, fy]);
      if (fx - 1 >= 0 && !visited[idx - 1]) stack.push([fx - 1, fy]);
      if (fy + 1 < height && !visited[idx + width]) stack.push([fx, fy + 1]);
      if (fy - 1 >= 0 && !visited[idx - width]) stack.push([fx, fy - 1]);
    }
  }

  if (options.smooth) {
    // 3x3 majority smoothing pass to remove jagged single-pixel spurs
    const smoothed = mask.map((r) => [...r]);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (mask[y + dy][x + dx]) count++;
          }
        }
        smoothed[y][x] = count >= 5;
      }
    }
    return smoothed;
  }

  return mask;
}

export function selectionToBooleanMask(
  sel: SelectionArea | null,
  width: number,
  height: number
): boolean[][] {
  const out: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));
  if (!sel || !sel.active) return out;
  if (sel.mask) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        out[y][x] = Boolean(sel.mask[y]?.[x]);
      }
    }
    return out;
  }
  const minX = Math.max(0, Math.min(sel.startX, sel.endX));
  const maxX = Math.min(width - 1, Math.max(sel.startX, sel.endX));
  const minY = Math.max(0, Math.min(sel.startY, sel.endY));
  const maxY = Math.min(height - 1, Math.max(sel.startY, sel.endY));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const rx = Math.max(0.5, (maxX - minX) / 2 + 0.5);
  const ry = Math.max(0.5, (maxY - minY) / 2 + 0.5);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (sel.shape === 'ellipse') {
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) out[y][x] = true;
      } else {
        out[y][x] = true;
      }
    }
  }
  return out;
}

export function buildSelectionMaskFromShape(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  width: number,
  height: number,
  shape: 'rect' | 'ellipse',
  roundedCorners: boolean,
  cornerRadius: number
): boolean[][] {
  const out: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));
  const minX = Math.max(0, Math.min(x0, x1));
  const maxX = Math.min(width - 1, Math.max(x0, x1));
  const minY = Math.max(0, Math.min(y0, y1));
  const maxY = Math.min(height - 1, Math.max(y0, y1));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const hw = Math.max(0.5, (maxX - minX) / 2 + 0.5);
  const hh = Math.max(0.5, (maxY - minY) / 2 + 0.5);
  const r = roundedCorners ? Math.max(0, Math.min(cornerRadius, hw, hh)) : 0;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (shape === 'ellipse') {
        if (((x - cx) / hw) ** 2 + ((y - cy) / hh) ** 2 <= 1) out[y][x] = true;
      } else if (r > 0.25) {
        const qx = Math.abs(x - cx) - (hw - r);
        const qy = Math.abs(y - cy) - (hh - r);
        const d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
        if (d <= 0) out[y][x] = true;
      } else {
        out[y][x] = true;
      }
    }
  }
  return out;
}

export function combineSelectionMasks(
  prevSel: SelectionArea | null,
  incomingMask: boolean[][],
  width: number,
  height: number,
  mode: SelectionBooleanMode,
  shapeLabel: SelectionArea['shape'] = 'magic_wand'
): SelectionArea | null {
  const prevMask = selectionToBooleanMask(prevSel, width, height);
  const hasPrev = Boolean(prevSel && prevSel.active);
  const out: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = hasPrev ? Boolean(prevMask[y]?.[x]) : false;
      const b = Boolean(incomingMask[y]?.[x]);
      let res = b;
      if (mode === 'add') res = a || b;
      else if (mode === 'subtract') res = a && !b;
      else if (mode === 'intersect') res = hasPrev ? a && b : b;
      if (res) {
        out[y][x] = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return {
    active: true,
    startX: minX,
    startY: minY,
    endX: maxX,
    endY: maxY,
    shape: shapeLabel,
    mask: out,
  };
}

/**
 * Resolves the active boolean selection operation consistently across ALL selection tools
 * (Magic Wand, Free/Polygonal/Magnetic Lasso, Rect/Elliptical Marquee).
 */
export function resolveSelectionOpMode(
  shiftKey: boolean,
  altKey: boolean,
  fallbackMode: SelectionBooleanMode = 'replace'
): SelectionBooleanMode {
  if (shiftKey && altKey) return 'intersect';
  if (shiftKey) return 'add';
  if (altKey) return 'subtract';
  return fallbackMode;
}

/**
 * Computes marquee bounding box supporting 1:1 / fixed ratio (Shift) and symmetrical
 * expansion from center (Alt), or both combined (Shift + Alt).
 */
export function computeConstrainedMarqueeBox(
  start: { x: number; y: number },
  end: { x: number; y: number },
  opts: {
    constrainRatio: boolean;
    ratioW: number;
    ratioH: number;
    fromCenter: boolean;
    width: number;
    height: number;
  }
): { startX: number; startY: number; endX: number; endY: number } {
  const { constrainRatio, ratioW, ratioH, fromCenter, width, height } = opts;
  const maxW = Math.max(0, width - 1);
  const maxH = Math.max(0, height - 1);
  const clampX = (v: number) => Math.max(0, Math.min(maxW, Math.round(v)));
  const clampY = (v: number) => Math.max(0, Math.min(maxH, Math.round(v)));

  let rawDx = end.x - start.x;
  let rawDy = end.y - start.y;

  if (constrainRatio) {
    const rw = Math.max(1, ratioW || 1);
    const rh = Math.max(1, ratioH || 1);
    const unit = Math.max(Math.abs(rawDx) / rw, Math.abs(rawDy) / rh);
    rawDx = (rawDx >= 0 ? 1 : -1) * unit * rw;
    rawDy = (rawDy >= 0 ? 1 : -1) * unit * rh;
  }

  if (fromCenter) {
    const hx = Math.round(Math.abs(rawDx));
    const hy = Math.round(Math.abs(rawDy));
    return {
      startX: clampX(start.x - hx),
      startY: clampY(start.y - hy),
      endX: clampX(start.x + hx),
      endY: clampY(start.y + hy),
    };
  }

  return {
    startX: clampX(start.x),
    startY: clampY(start.y),
    endX: clampX(start.x + rawDx),
    endY: clampY(start.y + rawDy),
  };
}

/**
 * Builds a clean pixel-accurate boolean mask from closed polygon/lasso points,
 * including Bresenham perimeter pixels so thin shapes never drop pixels.
 */
export function buildPolygonSelectionMask(
  pts: { x: number; y: number }[],
  width: number,
  height: number
): boolean[][] {
  const mask: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));
  if (pts.length === 0 || width <= 0 || height <= 0) return mask;

  if (pts.length >= 3) {
    let minX = width - 1;
    let maxX = 0;
    let minY = height - 1;
    let maxY = 0;
    for (const pt of pts) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }
    minX = Math.max(0, Math.floor(minX));
    maxX = Math.min(width - 1, Math.ceil(maxX));
    minY = Math.max(0, Math.floor(minY));
    maxY = Math.min(height - 1, Math.ceil(maxY));

    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const xi = pts[i].x;
          const yi = pts[i].y;
          const xj = pts[j].x;
          const yj = pts[j].y;
          const intersect =
            (yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi || 1e-6) + xi;
          if (intersect) inside = !inside;
        }
        if (inside) mask[py][px] = true;
      }
    }
  }

  const drawSegment = (x0: number, y0: number, x1: number, y1: number) => {
    let cx = Math.round(x0);
    let cy = Math.round(y0);
    const tx = Math.round(x1);
    const ty = Math.round(y1);
    const dx = Math.abs(tx - cx);
    const dy = Math.abs(ty - cy);
    const sx = cx < tx ? 1 : -1;
    const sy = cy < ty ? 1 : -1;
    let err = dx - dy;
    while (true) {
      if (cx >= 0 && cx < width && cy >= 0 && cy < height) {
        mask[cy][cx] = true;
      }
      if (cx === tx && cy === ty) break;
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
  };

  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    if (i < pts.length - 1 || pts.length >= 3) {
      drawSegment(a.x, a.y, b.x, b.y);
    } else if (a.x >= 0 && a.x < width && a.y >= 0 && a.y < height) {
      mask[Math.round(a.y)][Math.round(a.x)] = true;
    }
  }

  return mask;
}

export function cloneSelectionArea(sel: SelectionArea | null | undefined): SelectionArea | null {
  if (!sel) return null;
  return {
    ...sel,
    mask: sel.mask ? sel.mask.map((row) => [...row]) : undefined,
    pixels: sel.pixels ? sel.pixels.map((row) => [...row]) : undefined,
  };
}

export function isPointInsideSelection(
  sel: SelectionArea | null | undefined,
  x: number,
  y: number
): boolean {
  if (!sel || !sel.active) return false;
  const minX = Math.min(sel.startX, sel.endX);
  const maxX = Math.max(sel.startX, sel.endX);
  const minY = Math.min(sel.startY, sel.endY);
  const maxY = Math.max(sel.startY, sel.endY);
  if (x < minX || x > maxX || y < minY || y > maxY) return false;
  if (sel.mask) {
    return Boolean(sel.mask[y]?.[x]);
  }
  if (sel.shape === 'ellipse') {
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const rx = Math.max(0.5, (maxX - minX) / 2 + 0.5);
    const ry = Math.max(0.5, (maxY - minY) / 2 + 0.5);
    return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  }
  return true;
}

export function translateSelectionArea(
  sel: SelectionArea,
  dx: number,
  dy: number,
  width: number,
  height: number
): SelectionArea {
  if (!sel.mask) {
    return {
      ...sel,
      startX: sel.startX + dx,
      endX: sel.endX + dx,
      startY: sel.startY + dy,
      endY: sel.endY + dy,
    };
  }
  const shiftedMask: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  for (let py = 0; py < sel.mask.length; py++) {
    const row = sel.mask[py];
    if (!row) continue;
    for (let px = 0; px < row.length; px++) {
      if (!row[px]) continue;
      const nx = px + dx;
      const ny = py + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        shiftedMask[ny][nx] = true;
        if (nx < minX) minX = nx;
        if (nx > maxX) maxX = nx;
        if (ny < minY) minY = ny;
        if (ny > maxY) maxY = ny;
      }
    }
  }
  return {
    ...sel,
    startX: maxX >= minX ? minX : sel.startX + dx,
    startY: maxY >= minY ? minY : sel.startY + dy,
    endX: maxX >= minX ? maxX : sel.endX + dx,
    endY: maxY >= minY ? maxY : sel.endY + dy,
    mask: shiftedMask,
  };
}

export function morphSelectionMask(
  sel: SelectionArea | null,
  width: number,
  height: number,
  deltaPx: number
): SelectionArea | null {
  if (!sel || !sel.active || deltaPx === 0) return sel;
  let mask = selectionToBooleanMask(sel, width, height);
  const steps = Math.min(8, Math.abs(Math.round(deltaPx)));
  const isExpand = deltaPx > 0;

  for (let s = 0; s < steps; s++) {
    const next: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (isExpand) {
          next[y][x] =
            mask[y][x] ||
            (x > 0 && mask[y][x - 1]) ||
            (x + 1 < width && mask[y][x + 1]) ||
            (y > 0 && mask[y - 1][x]) ||
            (y + 1 < height && mask[y + 1][x]);
        } else {
          next[y][x] =
            mask[y][x] &&
            x > 0 &&
            mask[y][x - 1] &&
            x + 1 < width &&
            mask[y][x + 1] &&
            y > 0 &&
            mask[y - 1][x] &&
            y + 1 < height &&
            mask[y + 1][x];
        }
      }
    }
    mask = next;
  }

  return combineSelectionMasks(null, mask, width, height, 'replace', sel.shape || 'magic_wand');
}

export function generateQuickAiSpriteGrid(
  width: number,
  height: number,
  opts: QuickAiBarOptions,
  primaryColor: string,
  secondaryColor: string,
  activePaletteColors: string[],
  variationIndex: number = 0
): (string | null)[][] {
  const grid: (string | null)[][] = Array.from({ length: height }, () => Array(width).fill(null));
  const promptLower = (opts.prompt || '').toLowerCase();
  const seedBase =
    promptLower.split('').reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 17) +
    variationIndex * 997;

  const stylePalettes: Record<QuickAiBarOptions['style'], string[]> = {
    retro_16bit: ['#fef08a', '#f97316', '#dc2626', '#4c1d95', '#1e1b4b'],
    arcade_cps2: ['#ffffff', '#38bdf8', '#2563eb', '#7c3aed', '#0f172a'],
    cyberpunk: ['#f0abfc', '#22d3ee', '#e11d48', '#4f46e5', '#090d1a'],
    anime_cel: ['#ffffff', '#fde047', '#fb7185', '#6366f1', '#1e293b'],
    dark_fantasy: ['#fed7aa', '#b45309', '#7f1d1d', '#312e81', '#0c0a09'],
  };
  const pal =
    opts.useReference && activePaletteColors.length >= 3
      ? activePaletteColors.slice(0, 6)
      : [primaryColor, secondaryColor, ...stylePalettes[opts.style]].slice(0, 6);

  const cx = Math.floor(width / 2) + ((variationIndex % 3) - 1);
  const cy = Math.floor(height / 2);
  const scale = opts.adaptToCanvas ? 0.42 : 0.3;
  const rx = Math.max(3, Math.floor(width * scale));
  const ry = Math.max(3, Math.floor(height * scale));
  const intensity = Math.max(0.15, Math.min(1, (opts.intensity || 75) / 100));

  const isSlash = /espada|slash|corte|sword|blade|golpe|punch/.test(promptLower);
  const isFire = /fuego|fire|llama|flame|explosi|hadoken|aura|energia/.test(promptLower);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const n = Math.sin(angle * (isSlash ? 3 : 5) + seedBase * 0.01) * 0.24 * intensity;

      if (isSlash) {
        const arcDist = Math.abs(dist - (0.72 + n * 0.3));
        if (arcDist < 0.22 * intensity && angle > -2.2 && angle < 1.1) {
          const idx = arcDist < 0.07 ? 0 : arcDist < 0.14 ? 1 : 2;
          grid[y][x] = pal[Math.min(pal.length - 1, idx)];
        }
      } else if (isFire) {
        const flame = dist + dy * 0.28 + n;
        if (flame < 0.92 * intensity + 0.18) {
          const norm = Math.max(0, Math.min(0.99, flame / (0.95 * intensity + 0.2)));
          const idx = Math.floor(norm * pal.length);
          grid[y][x] = pal[Math.min(pal.length - 1, idx)];
        }
      } else {
        // Emblem / crystalline energy sprite
        const diamond = (Math.abs(dx) + Math.abs(dy)) * 0.72 + n;
        if (diamond < 0.85 * intensity + 0.15) {
          const norm = Math.max(0, Math.min(0.99, diamond / (0.88 * intensity + 0.18)));
          const idx = Math.floor(norm * pal.length);
          grid[y][x] = pal[Math.min(pal.length - 1, idx)];
        }
      }
    }
  }
  return grid;
}

