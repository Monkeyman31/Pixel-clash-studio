import {
  EditableFxRecipe,
  FxDetailLevel,
  FxDirectionType,
  FxEffectType,
  FxGeneratorConfig,
  FxLabModule,
  FxLabModuleType,
  FxLibraryPreset,
  FxShapeType,
  FxVisualStyle,
  LayerBlendMode,
} from '../types';

export interface FxEffectMeta {
  id: FxEffectType;
  label: string;
  colors: [string, string, string, string]; // core, mid, outer, smoke/accent
  defaultShape: FxShapeType;
  defaultDirection: FxDirectionType;
  tagline: string;
}

export const FX_EFFECT_TYPES: FxEffectMeta[] = [
  { id: 'aura', label: 'Aura', colors: ['#f0fdfa', '#5eead4', '#0d9488', '#134e4a'], defaultShape: 'circular', defaultDirection: 'up', tagline: 'Energía envolvente ascendente' },
  { id: 'ki', label: 'Ki', colors: ['#fefce8', '#fde047', '#f59e0b', '#b45309'], defaultShape: 'conical', defaultDirection: 'up', tagline: 'Flama de combate intensa y pulsos de poder' },
  { id: 'chakra', label: 'Chakra', colors: ['#ecfeff', '#38bdf8', '#2563eb', '#1e3a8a'], defaultShape: 'spiral', defaultDirection: 'up', tagline: 'Flujo espiral, niebla y chispas espirituales' },
  { id: 'mana', label: 'Mana', colors: ['#f5f3ff', '#c4b5fd', '#8b5cf6', '#4c1d95'], defaultShape: 'spiral', defaultDirection: 'up', tagline: 'Esencia arcana cristalina y destellos' },
  { id: 'energy', label: 'Energía', colors: ['#ecfeff', '#22d3ee', '#2563eb', '#1e1b4b'], defaultShape: 'linear', defaultDirection: 'right', tagline: 'Ondas Ki, haces, proyectiles y núcleos' },
  { id: 'electricity', label: 'Electricidad', colors: ['#ffffff', '#bae6fd', '#38bdf8', '#1d4ed8'], defaultShape: 'linear', defaultDirection: 'right', tagline: 'Arcos voltaicos y descargas ramificadas' },
  { id: 'fire', label: 'Fuego', colors: ['#fffbeb', '#facc15', '#f97316', '#991b1b'], defaultShape: 'conical', defaultDirection: 'up', tagline: 'Llamas vivas, brasas y humo' },
  { id: 'ice', label: 'Hielo', colors: ['#f0f9ff', '#7dd3fc', '#0284c7', '#1e3a8a'], defaultShape: 'radial', defaultDirection: 'right', tagline: 'Cristales, escarcha y destellos' },
  { id: 'water', label: 'Agua', colors: ['#ecfeff', '#67e8f9', '#0891b2', '#164e63'], defaultShape: 'conical', defaultDirection: 'right', tagline: 'Salpicaduras, espuma y gotas' },
  { id: 'smoke', label: 'Humo', colors: ['#e2e8f0', '#94a3b8', '#475569', '#1e293b'], defaultShape: 'conical', defaultDirection: 'up', tagline: 'Volutas, vapor y niebla' },
  { id: 'wind', label: 'Viento', colors: ['#f8fafc', '#cbd5e1', '#94a3b8', '#475569'], defaultShape: 'spiral', defaultDirection: 'right', tagline: 'Ráfagas, corrientes y vórtices' },
  { id: 'sand', label: 'Arena', colors: ['#fef3c7', '#f59e0b', '#b45309', '#78350f'], defaultShape: 'conical', defaultDirection: 'right', tagline: 'Torbellinos y ráfagas granulares' },
  { id: 'plasma', label: 'Plasma', colors: ['#fdf4ff', '#f0abfc', '#c026d3', '#581c87'], defaultShape: 'circular', defaultDirection: 'right', tagline: 'Núcleo ionizado inestable' },
  { id: 'magic', label: 'Magia', colors: ['#fdf2f8', '#f472b6', '#a855f7', '#4c1d95'], defaultShape: 'spiral', defaultDirection: 'up', tagline: 'Runas arcanas y polvo estelar' },
  { id: 'darkness', label: 'Oscuridad', colors: ['#e9d5ff', '#7e22ce', '#3b0764', '#09090b'], defaultShape: 'spiral', defaultDirection: 'up', tagline: 'Sombras abisales y niebla oscura' },
  { id: 'light', label: 'Luz', colors: ['#ffffff', '#fef9c3', '#facc15', '#ca8a04'], defaultShape: 'radial', defaultDirection: 'up', tagline: 'Haces sagrados y halos' },
  { id: 'blood_stylized', label: 'Sangrado Estilizado', colors: ['#fecdd3', '#f43f5e', '#be123c', '#4c0519'], defaultShape: 'conical', defaultDirection: 'diagonal', tagline: 'Salpicadura estilizada tipo anime/arcade' },
  { id: 'dust', label: 'Polvo', colors: ['#f5f5f4', '#d6d3d1', '#a8a29e', '#57534e'], defaultShape: 'conical', defaultDirection: 'up', tagline: 'Nube de impacto, aterrizaje o carrera' },
  { id: 'shockwave', label: 'Ondas Expansivas', colors: ['#ffffff', '#a5f3fc', '#0ea5e9', '#1e3a8a'], defaultShape: 'circular', defaultDirection: 'up', tagline: 'Anillos de choque y presión aérea' },
  { id: 'impact', label: 'Impactos', colors: ['#ffffff', '#fef08a', '#fb7185', '#be123c'], defaultShape: 'radial', defaultDirection: 'right', tagline: 'Hitspark arcade de golpe' },
  { id: 'smear_fx', label: 'Smears', colors: ['#ffffff', '#fde047', '#f97316', '#9a3412'], defaultShape: 'custom', defaultDirection: 'right', tagline: 'Barridos y trazos cinéticos de velocidad' },
  { id: 'rocks_fx', label: 'Rocas', colors: ['#e7e5e4', '#a8a29e', '#57534e', '#1c1917'], defaultShape: 'conical', defaultDirection: 'up', tagline: 'Rocas sólidas, picos y pilares' },
  { id: 'fragments_fx', label: 'Fragmentos', colors: ['#fef3c7', '#d97706', '#78716c', '#292524'], defaultShape: 'radial', defaultDirection: 'up', tagline: 'Esquirlas proyectadas tras impacto' },
  { id: 'debris_fx', label: 'Escombros', colors: ['#cbd5e1', '#64748b', '#334155', '#0f172a'], defaultShape: 'conical', defaultDirection: 'up', tagline: 'Destrucción pesada de suelo y concreto' },
  { id: 'earth', label: 'Tierra', colors: ['#fef3c7', '#d97706', '#78350f', '#44403c'], defaultShape: 'conical', defaultDirection: 'up', tagline: 'Rocas, grietas y polvo' },
  { id: 'explosion', label: 'Explosión', colors: ['#ffffff', '#fde047', '#ea580c', '#57534e'], defaultShape: 'circular', defaultDirection: 'up', tagline: 'Detonación, onda y humo denso' },
  { id: 'sparks', label: 'Chispas', colors: ['#ffffff', '#fde047', '#fb923c', '#dc2626'], defaultShape: 'conical', defaultDirection: 'diagonal', tagline: 'Destellos metálicos balísticos' },
  { id: 'custom', label: 'Personalizado', colors: ['#ffffff', '#fbbf24', '#ec4899', '#4c1d95'], defaultShape: 'circular', defaultDirection: 'right', tagline: 'Combinación híbrida libre' },
];

export const FX_DETAIL_LEVELS: { id: FxDetailLevel; label: string; densityMul: number; microDetail: number }[] = [
  { id: 'very_simple', label: 'Muy Simple', densityMul: 0.45, microDetail: 0 },
  { id: 'simple', label: 'Simple', densityMul: 0.65, microDetail: 1 },
  { id: 'medium', label: 'Medio', densityMul: 0.85, microDetail: 2 },
  { id: 'high', label: 'Alto', densityMul: 1.05, microDetail: 3 },
  { id: 'very_high', label: 'Muy Alto', densityMul: 1.25, microDetail: 4 },
  { id: 'professional', label: 'Profesional', densityMul: 1.45, microDetail: 5 },
];

export const FX_VISUAL_STYLES: {
  id: FxVisualStyle;
  label: string;
  outline: boolean;
  dither: boolean;
  contrastBoost: number;
  satMul: number;
  hueShift: number;
}[] = [
  { id: 'pixel_retro', label: 'Pixel Retro', outline: true, dither: true, contrastBoost: 1.12, satMul: 1.0, hueShift: 0 },
  { id: 'snes', label: 'SNES', outline: false, dither: true, contrastBoost: 1.05, satMul: 1.08, hueShift: 4 },
  { id: 'neo_geo', label: 'Neo Geo', outline: true, dither: false, contrastBoost: 1.22, satMul: 1.18, hueShift: -4 },
  { id: 'cps2', label: 'CPS2', outline: false, dither: false, contrastBoost: 1.25, satMul: 1.25, hueShift: 6 },
  { id: 'kof', label: 'King of Fighters', outline: true, dither: false, contrastBoost: 1.18, satMul: 1.15, hueShift: -6 },
  { id: 'sf_alpha', label: 'Street Fighter Alpha', outline: false, dither: false, contrastBoost: 1.15, satMul: 1.28, hueShift: 10 },
  { id: 'guilty_gear', label: 'Guilty Gear', outline: true, dither: false, contrastBoost: 1.32, satMul: 1.22, hueShift: -12 },
  { id: 'anime', label: 'Anime', outline: false, dither: false, contrastBoost: 1.18, satMul: 1.15, hueShift: 2 },
  { id: 'pixel_fantasy', label: 'Pixel Fantasy', outline: false, dither: true, contrastBoost: 1.08, satMul: 1.12, hueShift: 14 },
  { id: 'pixel_scifi', label: 'Pixel Sci-Fi', outline: false, dither: true, contrastBoost: 1.2, satMul: 1.25, hueShift: -18 },
  { id: 'pixel_dark_fantasy', label: 'Pixel Dark Fantasy', outline: true, dither: true, contrastBoost: 1.28, satMul: 0.78, hueShift: -24 },
  { id: 'custom', label: 'Personalizado', outline: false, dither: false, contrastBoost: 1.0, satMul: 1.0, hueShift: 0 },
];

export const FX_SHAPES: { id: FxShapeType; label: string }[] = [
  { id: 'circular', label: 'Circular' },
  { id: 'linear', label: 'Lineal' },
  { id: 'conical', label: 'Cónica' },
  { id: 'radial', label: 'Radial' },
  { id: 'spiral', label: 'Espiral' },
  { id: 'custom', label: 'Personalizada' },
];

export const FX_DIRECTIONS: { id: FxDirectionType; label: string; angleDeg: number }[] = [
  { id: 'up', label: 'Arriba', angleDeg: 270 },
  { id: 'down', label: 'Abajo', angleDeg: 90 },
  { id: 'left', label: 'Izquierda', angleDeg: 180 },
  { id: 'right', label: 'Derecha', angleDeg: 0 },
  { id: 'diagonal', label: 'Diagonal', angleDeg: 315 },
  { id: 'custom', label: 'Personalizada', angleDeg: 45 },
];

export const FX_LAB_MODULE_META: {
  type: FxLabModuleType;
  label: string;
  desc: string;
  defaultBlend: LayerBlendMode;
  defaultColors: [string, string, string];
}[] = [
  { type: 'particles', label: 'Partículas', desc: 'Enjambre animado de motas y brasas', defaultBlend: 'screen', defaultColors: ['#ffffff', '#fde047', '#f97316'] },
  { type: 'glow', label: 'Brillos', desc: 'Núcleo radiante y resplandor aditivo', defaultBlend: 'color-dodge', defaultColors: ['#ffffff', '#7dd3fc', '#2563eb'] },
  { type: 'lightning', label: 'Rayos', desc: 'Descargas eléctricas ramificadas', defaultBlend: 'screen', defaultColors: ['#ffffff', '#bae6fd', '#0284c7'] },
  { type: 'smoke', label: 'Humo', desc: 'Volutas y nubes de densidad suave', defaultBlend: 'normal', defaultColors: ['#cbd5e1', '#64748b', '#1e293b'] },
  { type: 'sparks', label: 'Chispas', desc: 'Destellos direccionales rápidos', defaultBlend: 'screen', defaultColors: ['#ffffff', '#fef08a', '#ef4444'] },
  { type: 'waves', label: 'Ondas', desc: 'Anillos expansivos de choque', defaultBlend: 'screen', defaultColors: ['#ffffff', '#67e8f9', '#6366f1'] },
];

export const DEFAULT_FX_GENERATOR_CONFIG: FxGeneratorConfig = {
  effectType: 'fire',
  detailLevel: 'high',
  visualStyle: 'cps2',
  prompt: '',
  modifiers: {
    intensity: 80,
    scale: 100,
    brightness: 105,
    saturation: 110,
    opacity: 95,
    chaos: 38,
    visualSpeed: 100,
    density: 72,
    length: 100,
  },
  shape: 'conical',
  direction: 'up',
  customAngleDeg: 315,
  layerMode: 'per_component',
  animated: true,
  frameCount: 8,
  seed: 4217,
  customPrimaryColor: '#f97316',
  customSecondaryColor: '#fde047',
  useCustomColors: false,
};

export const DEFAULT_FX_LAB_MODULES: FxLabModule[] = [
  {
    id: 'fxmod-smoke',
    name: 'Humo Ambiental',
    type: 'smoke',
    enabled: true,
    blendMode: 'normal',
    colorCore: '#cbd5e1',
    colorMid: '#64748b',
    colorEdge: '#1e293b',
    scale: 110,
    density: 55,
    intensity: 65,
    speed: 75,
    opacity: 75,
    chaos: 45,
    angleDeg: 270,
    offsetX: 0,
    offsetY: 6,
    seed: 101,
  },
  {
    id: 'fxmod-glow',
    name: 'Núcleo Brillo',
    type: 'glow',
    enabled: true,
    blendMode: 'screen',
    colorCore: '#ffffff',
    colorMid: '#fde047',
    colorEdge: '#f97316',
    scale: 95,
    density: 75,
    intensity: 88,
    speed: 100,
    opacity: 95,
    chaos: 20,
    angleDeg: 0,
    offsetX: 0,
    offsetY: 0,
    seed: 202,
  },
  {
    id: 'fxmod-waves',
    name: 'Onda Expansiva',
    type: 'waves',
    enabled: true,
    blendMode: 'screen',
    colorCore: '#ffffff',
    colorMid: '#38bdf8',
    colorEdge: '#2563eb',
    scale: 100,
    density: 65,
    intensity: 80,
    speed: 110,
    opacity: 85,
    chaos: 15,
    angleDeg: 0,
    offsetX: 0,
    offsetY: 0,
    seed: 303,
  },
  {
    id: 'fxmod-sparks',
    name: 'Chispas Impacto',
    type: 'sparks',
    enabled: true,
    blendMode: 'color-dodge',
    colorCore: '#ffffff',
    colorMid: '#fef08a',
    colorEdge: '#ef4444',
    scale: 105,
    density: 70,
    intensity: 90,
    speed: 130,
    opacity: 95,
    chaos: 50,
    angleDeg: 315,
    offsetX: 0,
    offsetY: 0,
    seed: 404,
  },
];

// =========================================================
// DETERMINISTIC PRNG & COLOR TRANSFORM UTILITIES
// =========================================================
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2d(ix: number, iy: number, seed: number): number {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
  n = (n ^ (n >>> 13)) | 0;
  n = Math.imul(n, 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function smoothNoise2d(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2d(ix, iy, seed);
  const b = hash2d(ix + 1, iy, seed);
  const c = hash2d(ix, iy + 1, seed);
  const d = hash2d(ix + 1, iy + 1, seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm2d(x: number, y: number, seed: number, octaves: number = 3): number {
  let val = 0;
  let amp = 0.55;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    val += smoothNoise2d(x * freq, y * freq, seed + i * 97) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.05;
  }
  return norm > 0 ? val / norm : 0;
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length < 6) return [255, 255, 255];
  return [
    parseInt(clean.slice(0, 2), 16) || 0,
    parseInt(clean.slice(2, 4), 16) || 0,
    parseInt(clean.slice(4, 6), 16) || 0,
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${clampByte(r).toString(16).padStart(2, '0')}${clampByte(g).toString(16).padStart(2, '0')}${clampByte(b).toString(16).padStart(2, '0')}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
      case gn: h = (bn - rn) / d + 2; break;
      case bn: h = (rn - gn) / d + 4; break;
    }
    h *= 60;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hn = ((h % 360) + 360) % 360 / 360;
  if (s === 0) {
    const v = clampByte(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return [clampByte(hue2rgb(hn + 1 / 3) * 255), clampByte(hue2rgb(hn) * 255), clampByte(hue2rgb(hn - 1 / 3) * 255)];
}

function adjustHexColor(
  hex: string,
  brightnessPct: number,
  saturationPct: number,
  hueShiftDeg: number = 0,
  contrastBoost: number = 1
): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const nextH = h + hueShiftDeg;
  const nextS = Math.max(0, Math.min(1, s * (saturationPct / 100)));
  const contrastedL = 0.5 + (l - 0.5) * contrastBoost;
  const nextL = Math.max(0.03, Math.min(0.98, contrastedL * (brightnessPct / 100)));
  const [nr, ng, nb] = hslToRgb(nextH, nextS, nextL);
  return rgbToHex(nr, ng, nb);
}

function makeEmptyGrid(w: number, h: number): (string | null)[][] {
  return Array.from({ length: h }, () => Array<string | null>(w).fill(null));
}

function plot(grid: (string | null)[][], x: number, y: number, color: string) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (iy >= 0 && iy < grid.length && ix >= 0 && ix < (grid[0]?.length || 0)) {
    grid[iy][ix] = color;
  }
}

function drawPixelLine(
  grid: (string | null)[][],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  thickness: number = 1
) {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  const half = Math.floor(thickness / 2);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = Math.round(x0 + (x1 - x0) * t);
    const cy = Math.round(y0 + (y1 - y0) * t);
    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        if (dx * dx + dy * dy <= (half + 0.5) * (half + 0.5)) {
          plot(grid, cx + dx, cy + dy, color);
        }
      }
    }
  }
}

function addOutlineToGrid(grid: (string | null)[][], outlineColor: string) {
  const h = grid.length;
  const w = grid[0]?.length || 0;
  const outlinePts: [number, number][] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (grid[y][x] !== null) continue;
      if (
        (x > 0 && grid[y][x - 1] !== null) ||
        (x < w - 1 && grid[y][x + 1] !== null) ||
        (y > 0 && grid[y - 1][x] !== null) ||
        (y < h - 1 && grid[y + 1][x] !== null)
      ) {
        outlinePts.push([x, y]);
      }
    }
  }
  for (const [x, y] of outlinePts) {
    grid[y][x] = outlineColor;
  }
}

function resolveAngleRad(direction: FxDirectionType, customAngleDeg: number): number {
  if (direction === 'custom') return (customAngleDeg * Math.PI) / 180;
  const found = FX_DIRECTIONS.find((d) => d.id === direction);
  return ((found?.angleDeg ?? 0) * Math.PI) / 180;
}

export interface SynthesizedFxFrame {
  merged: (string | null)[][];
  base: (string | null)[][];
  glow: (string | null)[][];
  sparks: (string | null)[][];
  smoke: (string | null)[][];
}

export interface SynthesizedFxResult {
  name: string;
  palette: string[];
  frames: SynthesizedFxFrame[];
}

export function synthesizeFxFrames(
  config: FxGeneratorConfig,
  width: number,
  height: number
): SynthesizedFxResult {
  const w = Math.max(12, Math.min(256, Math.round(width)));
  const h = Math.max(12, Math.min(256, Math.round(height)));
  const effectMeta = FX_EFFECT_TYPES.find((e) => e.id === config.effectType) || FX_EFFECT_TYPES[0];
  const detailMeta = FX_DETAIL_LEVELS.find((d) => d.id === config.detailLevel) || FX_DETAIL_LEVELS[2];
  const styleMeta = FX_VISUAL_STYLES.find((s) => s.id === config.visualStyle) || FX_VISUAL_STYLES[3];

  const rawColors: [string, string, string, string] = config.useCustomColors && config.customPrimaryColor
    ? [
        '#ffffff',
        config.customSecondaryColor || '#fde047',
        config.customPrimaryColor,
        adjustHexColor(config.customPrimaryColor, 55, 85, -10, 1.1),
      ]
    : effectMeta.colors;

  const { intensity, scale, brightness, saturation, opacity, chaos, visualSpeed, density, length } = config.modifiers;
  const palette = rawColors.map((c, idx) =>
    adjustHexColor(
      c,
      brightness * (idx === 0 ? 1.04 : 1),
      saturation * styleMeta.satMul,
      styleMeta.hueShift,
      styleMeta.contrastBoost
    )
  );
  const [cCore, cMid, cOuter, cSmoke] = palette;

  const angleRad = resolveAngleRad(config.direction, config.customAngleDeg);
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  const frameCount = config.animated ? Math.max(2, Math.min(32, Math.round(config.frameCount || 8))) : 1;
  const scaleNorm = Math.max(0.2, scale / 100);
  const lenNorm = Math.max(0.3, length / 100);
  const chaosNorm = chaos / 100;
  const intensityNorm = intensity / 100;
  const densityNorm = (density / 100) * detailMeta.densityMul;
  const opacityGate = Math.max(0.1, opacity / 100);
  const speedNorm = visualSpeed / 100;

  const cx = w * 0.5;
  const cy = h * 0.5;
  const minDim = Math.min(w, h);
  const baseRadius = minDim * 0.34 * scaleNorm;
  const octaves = detailMeta.microDetail >= 3 ? 3 : 2;
  const bayer4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ];

  const frames: SynthesizedFxFrame[] = [];

  for (let f = 0; f < frameCount; f++) {
    const phase = frameCount === 1 ? 0.35 : f / frameCount;
    const animCycle = Math.sin(phase * Math.PI); // 0 -> 1 -> 0 envelope for burst effects
    const pulse = 0.72 + 0.28 * animCycle;
    const scrollPhase = phase * speedNorm * 4.2;

    const base = makeEmptyGrid(w, h);
    const glow = makeEmptyGrid(w, h);
    const sparks = makeEmptyGrid(w, h);
    const smoke = makeEmptyGrid(w, h);
    const merged = makeEmptyGrid(w, h);
    const rng = mulberry32(config.seed + f * 7919);

    // 1. VOLUMETRIC PIXEL FIELD (Base, Glow & Smoke)
    const isLightning = config.effectType === 'electricity';
    const isImpact = config.effectType === 'impact' || config.effectType === 'fragments_fx';
    const isSparksOnly = config.effectType === 'sparks' || config.effectType === 'sand';
    const isSmokeOnly = config.effectType === 'smoke' || config.effectType === 'dust';
    const isAura =
      config.effectType === 'aura' ||
      config.effectType === 'ki' ||
      config.effectType === 'chakra' ||
      config.effectType === 'mana' ||
      config.effectType === 'shockwave';
    const isExplosion = config.effectType === 'explosion';
    const isIce = config.effectType === 'ice' || config.effectType === 'rocks_fx';
    const isWind = config.effectType === 'wind' || config.effectType === 'smear_fx';
    const isChunky =
      config.effectType === 'rocks_fx' ||
      config.effectType === 'debris_fx' ||
      config.effectType === 'earth' ||
      config.effectType === 'blood_stylized';

    // Origin offset for directional cones / beams
    const originShift =
      config.shape === 'conical' || config.shape === 'linear'
        ? -baseRadius * 0.55 * lenNorm
        : 0;
    const ox = cx + cosA * originShift;
    const oy = cy + sinA * originShift;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // Opacity dither gate for semi-transparent styles or low opacity
        if (opacityGate < 0.96) {
          const bayerVal = bayer4[y & 3][x & 3] / 16;
          if (bayerVal > opacityGate) continue;
        }

        const dx = x - ox;
        const dy = y - oy;
        // Rotated coordinates along active direction
        const along = dx * cosA + dy * sinA;
        const perp = -dx * sinA + dy * cosA;
        const dist = Math.hypot(x - cx, y - cy);
        const theta = Math.atan2(y - cy, x - cx);

        const nFreq = (0.14 + detailMeta.microDetail * 0.025) / Math.max(0.4, scaleNorm);
        const n1 = fbm2d(
          x * nFreq - cosA * scrollPhase,
          y * nFreq - sinA * scrollPhase,
          config.seed,
          octaves
        );
        const n2 = fbm2d(
          x * nFreq * 1.8 + sinA * scrollPhase * 0.7,
          y * nFreq * 1.8 - cosA * scrollPhase * 0.7,
          config.seed + 511,
          2
        );
        const turb = (n1 - 0.5) * 2 * (0.25 + chaosNorm * 0.95);

        let field = 0;
        const maxR = Math.max(3, baseRadius * (isExplosion ? 0.55 + animCycle * 0.75 : pulse));

        if (config.shape === 'circular') {
          const normR = dist / maxR;
          if (isAura) {
            const ring = 1 - Math.abs(normR - 0.78) * 3.1;
            field = ring + turb * 0.55;
          } else {
            field = 1 - normR + turb * 0.65;
          }
        } else if (config.shape === 'linear') {
          const beamLen = Math.max(4, baseRadius * 2.1 * lenNorm);
          const halfThick = Math.max(1.5, baseRadius * 0.34 * (1 - 0.25 * Math.max(0, along / beamLen)));
          if (along >= -2 && along <= beamLen) {
            const coreFalloff = 1 - Math.abs(perp) / (halfThick + turb * halfThick * 0.85);
            const endFade = 1 - Math.max(0, (along - beamLen * 0.78) / (beamLen * 0.28));
            field = coreFalloff * Math.min(1, endFade) + (n2 - 0.45) * 0.4;
          }
        } else if (config.shape === 'conical') {
          const coneLen = Math.max(4, baseRadius * 2.05 * lenNorm);
          if (along >= -2 && along <= coneLen) {
            const progress = Math.max(0, along / coneLen);
            const spread = baseRadius * (0.14 + progress * 0.78);
            const normPerp = Math.abs(perp) / Math.max(1.2, spread);
            field = (1 - normPerp) * (1 - progress * 0.45) + turb * (0.4 + progress * 0.55);
          }
        } else if (config.shape === 'radial') {
          const rayCount = isIce ? 6 : isImpact ? 8 : Math.max(5, Math.round(6 + densityNorm * 5));
          const rayWave = Math.pow(0.5 + 0.5 * Math.cos(theta * rayCount + phase * Math.PI * 2 * speedNorm * 0.5), 1.6);
          const rayR = maxR * (0.45 + 0.75 * rayWave * lenNorm);
          field = 1 - dist / Math.max(2, rayR) + turb * 0.45;
        } else if (config.shape === 'spiral') {
          const arms = isWind ? 3 : 2;
          const twist = dist * (0.28 / Math.max(0.4, scaleNorm)) - phase * Math.PI * 2 * speedNorm;
          const spiralBand = 0.5 + 0.5 * Math.cos(theta * arms + twist);
          const normR = dist / (maxR * 1.15);
          field = (1 - normR * 0.85) * (0.35 + spiralBand * 0.85) + turb * 0.4;
        } else {
          // Custom organic crescent / slash arc
          const arcDist = Math.abs(dist - maxR * 0.72) / Math.max(1.5, maxR * 0.34);
          const dirAlign = (Math.cos(theta - angleRad) + 1) * 0.5;
          field = (1 - arcDist) * Math.pow(dirAlign, 1.3) * 1.25 + turb * 0.45;
        }

        // Effect-specific sharpening / modulation
        if (isWind) field -= (n2 > 0.52 ? 0.35 : -0.15);
        if (isLightning || isSparksOnly) field *= 0.62;
        if (isSmokeOnly) field += (n1 - 0.4) * 0.45;

        const effectiveVal = field * (0.58 + intensityNorm * 0.62) * (0.65 + densityNorm * 0.35);
        const ditherBias = styleMeta.dither ? ((bayer4[y & 3][x & 3] / 16) - 0.5) * 0.14 : 0;
        const v = effectiveVal + ditherBias;

        if (v <= 0.16) continue;

        if (isSmokeOnly) {
          if (v > 0.74) smoke[y][x] = cCore;
          else if (v > 0.48) smoke[y][x] = cMid;
          else if (v > 0.25) smoke[y][x] = cOuter;
          else smoke[y][x] = cSmoke;
        } else if (v > 0.78) {
          glow[y][x] = cCore;
          base[y][x] = cMid;
        } else if (v > 0.52) {
          base[y][x] = cMid;
          if (v > 0.66) glow[y][x] = cMid;
        } else if (v > 0.29) {
          base[y][x] = cOuter;
        } else if (v > 0.18 && (config.effectType === 'fire' || isExplosion || config.effectType === 'darkness' || isChunky)) {
          smoke[y][x] = cSmoke;
        }
      }
    }

    // 2. ELECTRICITY / ENERGY / CHAKRA / KI BOLT BRANCHES
    if (
      isLightning ||
      config.effectType === 'plasma' ||
      config.effectType === 'chakra' ||
      ((config.effectType === 'energy' || config.effectType === 'ki') && detailMeta.microDetail >= 2)
    ) {
      const boltCount = Math.max(2, Math.round((2 + densityNorm * 4) * (isLightning ? 1.5 : 0.7)));
      for (let b = 0; b < boltCount; b++) {
        const spreadAngle =
          config.shape === 'linear' || config.shape === 'conical'
            ? angleRad + (rng() - 0.5) * (0.55 + chaosNorm * 0.7)
            : (b / boltCount) * Math.PI * 2 + phase * 1.4 + (rng() - 0.5) * 0.5;
        let bx = config.shape === 'linear' || config.shape === 'conical' ? ox : cx;
        let by = config.shape === 'linear' || config.shape === 'conical' ? oy : cy;
        const segments = 5 + detailMeta.microDetail;
        const segLen = (baseRadius * (1.2 + lenNorm * 0.65)) / segments;
        for (let s = 0; s < segments; s++) {
          const jitter = (rng() - 0.5) * (0.85 + chaosNorm * 1.2);
          const nx = bx + Math.cos(spreadAngle + jitter) * segLen;
          const ny = by + Math.sin(spreadAngle + jitter) * segLen;
          drawPixelLine(glow, bx, by, nx, ny, cMid, s < 2 ? 2 : 1);
          drawPixelLine(sparks, bx, by, nx, ny, cCore, 1);
          bx = nx;
          by = ny;
        }
      }
    }

    // 3. IMPACT / ICE CRYSTALS / RADIAL SHARDS
    if (isImpact || isIce || config.effectType === 'light') {
      const shardCount = Math.max(4, Math.round(5 + densityNorm * 7));
      for (let i = 0; i < shardCount; i++) {
        const a = (i / shardCount) * Math.PI * 2 + (isImpact ? phase * 0.5 : 0) + (rng() - 0.5) * chaosNorm * 0.4;
        const rStart = baseRadius * (0.12 + rng() * 0.18);
        const rEnd = baseRadius * (0.75 + rng() * 0.65) * lenNorm * (0.7 + 0.4 * animCycle);
        drawPixelLine(
          glow,
          cx + Math.cos(a) * rStart,
          cy + Math.sin(a) * rStart,
          cx + Math.cos(a) * rEnd,
          cy + Math.sin(a) * rEnd,
          i % 2 === 0 ? cCore : cMid,
          i % 3 === 0 ? 2 : 1
        );
      }
    }

    // 4. SPARKS & FLYING PARTICLES
    const sparkCount = Math.max(
      4,
      Math.round((8 + detailMeta.microDetail * 6) * densityNorm * (isSparksOnly ? 2.4 : 1.0))
    );
    for (let i = 0; i < sparkCount; i++) {
      const life = ((i / sparkCount) + phase * speedNorm) % 1;
      const spread =
        config.shape === 'linear' || config.shape === 'conical'
          ? angleRad + (hash2d(i, 1, config.seed) - 0.5) * (0.75 + chaosNorm * 0.9)
          : hash2d(i, 2, config.seed) * Math.PI * 2;
      const dist = (0.2 + life * 1.18) * baseRadius * lenNorm;
      const sx = (config.shape === 'conical' || config.shape === 'linear' ? ox : cx) + Math.cos(spread) * dist;
      const sy = (config.shape === 'conical' || config.shape === 'linear' ? oy : cy) + Math.sin(spread) * dist;
      const col = life < 0.35 ? cCore : life < 0.72 ? cMid : cOuter;
      plot(sparks, sx, sy, col);
      if (isSparksOnly || intensity > 65) {
        plot(sparks, sx - Math.cos(spread), sy - Math.sin(spread), cMid);
      }
    }

    // Optional crisp retro outline on base layer for Neo Geo / KOF / Dark Fantasy styles
    if (styleMeta.outline && !isSmokeOnly) {
      addOutlineToGrid(base, '#0b0d14');
    }

    // Composite into merged preview: smoke -> base -> glow -> sparks
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        merged[y][x] = sparks[y][x] || glow[y][x] || base[y][x] || smoke[y][x] || null;
      }
    }

    frames.push({ merged, base, glow, sparks, smoke });
  }

  return {
    name: config.prompt?.trim()
      ? config.prompt.trim().slice(0, 28)
      : `FX ${effectMeta.label} (${styleMeta.label})`,
    palette,
    frames,
  };
}

// =========================================================
// FX LAB VISUAL MODULAR SYNTHESIS ENGINE
// =========================================================
export interface SynthesizedLabFrame {
  merged: (string | null)[][];
  byModule: {
    moduleId: string;
    name: string;
    blendMode: LayerBlendMode;
    pixels: (string | null)[][];
  }[];
}

export function synthesizeFxLabFrames(
  modules: FxLabModule[],
  frameCount: number,
  width: number,
  height: number
): SynthesizedLabFrame[] {
  const w = Math.max(12, Math.min(256, Math.round(width)));
  const h = Math.max(12, Math.min(256, Math.round(height)));
  const count = Math.max(1, Math.min(32, Math.round(frameCount)));
  const activeModules = modules.filter((m) => m.enabled);
  const minDim = Math.min(w, h);
  const results: SynthesizedLabFrame[] = [];

  for (let f = 0; f < count; f++) {
    const phase = count === 1 ? 0.35 : f / count;
    const merged = makeEmptyGrid(w, h);
    const byModule: SynthesizedLabFrame['byModule'] = [];

    for (const mod of activeModules) {
      const grid = makeEmptyGrid(w, h);
      const cx = w * (0.5 + mod.offsetX / 100);
      const cy = h * (0.5 + mod.offsetY / 100);
      const radius = Math.max(3, minDim * 0.34 * (mod.scale / 100));
      const speed = mod.speed / 100;
      const density = mod.density / 100;
      const intensity = mod.intensity / 100;
      const chaos = mod.chaos / 100;
      const angleRad = (mod.angleDeg * Math.PI) / 180;
      const rng = mulberry32(mod.seed + f * 3571);

      if (mod.type === 'glow') {
        const pulse = 0.85 + 0.2 * Math.sin(phase * Math.PI * 2 * speed);
        const r = radius * pulse;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const d = Math.hypot(x - cx, y - cy) / Math.max(1, r);
            const n = (fbm2d(x * 0.16, y * 0.16 + phase * 3 * speed, mod.seed, 2) - 0.5) * chaos * 0.65;
            const v = (1 - d + n) * (0.65 + intensity * 0.5);
            if (v > 0.72) grid[y][x] = mod.colorCore;
            else if (v > 0.45) grid[y][x] = mod.colorMid;
            else if (v > 0.24 && ((x + y) & 1) === 0) grid[y][x] = mod.colorEdge;
          }
        }
      } else if (mod.type === 'smoke') {
        const puffs = Math.max(4, Math.round(5 + density * 9));
        for (let i = 0; i < puffs; i++) {
          const life = ((i / puffs) + phase * speed) % 1;
          const spread = angleRad + (hash2d(i, 11, mod.seed) - 0.5) * (0.9 + chaos * 1.4);
          const dist = life * radius * 1.15;
          const px = cx + Math.cos(spread) * dist;
          const py = cy + Math.sin(spread) * dist;
          const pr = Math.max(1.5, radius * (0.22 + (1 - life) * 0.28));
          for (let dy = -Math.ceil(pr); dy <= Math.ceil(pr); dy++) {
            for (let dx = -Math.ceil(pr); dx <= Math.ceil(pr); dx++) {
              const nd = Math.hypot(dx, dy) / pr;
              if (nd <= 1) {
                const col = nd < 0.4 ? mod.colorCore : nd < 0.75 ? mod.colorMid : mod.colorEdge;
                if (nd < 0.75 || ((Math.round(px + dx) + Math.round(py + dy)) & 1) === 0) {
                  plot(grid, px + dx, py + dy, col);
                }
              }
            }
          }
        }
      } else if (mod.type === 'particles') {
        const total = Math.max(6, Math.round(12 + density * 36));
        for (let i = 0; i < total; i++) {
          const life = ((i / total) + phase * speed) % 1;
          const a = hash2d(i, 3, mod.seed) * Math.PI * 2;
          const r = (0.15 + life * 1.1) * radius;
          const drift = Math.sin(life * 6 + i) * chaos * radius * 0.25;
          const px = cx + Math.cos(a) * r + Math.cos(angleRad) * drift;
          const py = cy + Math.sin(a) * r + Math.sin(angleRad) * drift;
          const col = life < 0.35 ? mod.colorCore : life < 0.7 ? mod.colorMid : mod.colorEdge;
          plot(grid, px, py, col);
          if (intensity > 0.7 && i % 4 === 0) {
            plot(grid, px + 1, py, mod.colorMid);
          }
        }
      } else if (mod.type === 'sparks') {
        const total = Math.max(4, Math.round(6 + density * 20));
        for (let i = 0; i < total; i++) {
          const life = ((i / total) + phase * speed * 1.2) % 1;
          const a = angleRad + (hash2d(i, 7, mod.seed) - 0.5) * (1.2 + chaos * 2.2);
          const dist = (0.15 + life * 1.25) * radius;
          const sx = cx + Math.cos(a) * dist;
          const sy = cy + Math.sin(a) * dist;
          const tail = 1.5 + intensity * 3.5;
          drawPixelLine(grid, sx, sy, sx - Math.cos(a) * tail, sy - Math.sin(a) * tail, life < 0.45 ? mod.colorCore : mod.colorMid, 1);
          plot(grid, sx - Math.cos(a) * (tail + 1), sy - Math.sin(a) * (tail + 1), mod.colorEdge);
        }
      } else if (mod.type === 'lightning') {
        const bolts = Math.max(1, Math.round(1 + density * 5));
        for (let b = 0; b < bolts; b++) {
          let bx = cx;
          let by = cy;
          const baseA = angleRad + (b - (bolts - 1) / 2) * (0.45 + chaos * 0.4);
          const segs = 6;
          const step = (radius * 1.35) / segs;
          for (let s = 0; s < segs; s++) {
            const nx = bx + Math.cos(baseA + (rng() - 0.5) * (0.9 + chaos)) * step;
            const ny = by + Math.sin(baseA + (rng() - 0.5) * (0.9 + chaos)) * step;
            drawPixelLine(grid, bx, by, nx, ny, mod.colorEdge, 2);
            drawPixelLine(grid, bx, by, nx, ny, s < 3 ? mod.colorCore : mod.colorMid, 1);
            bx = nx;
            by = ny;
          }
        }
      } else if (mod.type === 'waves') {
        const rings = Math.max(1, Math.round(1 + density * 2.5));
        for (let rIdx = 0; rIdx < rings; rIdx++) {
          const prog = ((rIdx / rings) + phase * speed) % 1;
          const ringR = Math.max(2, prog * radius * 1.25);
          const thickness = Math.max(1, (1 - prog * 0.6) * (1.2 + intensity * 1.8));
          const steps = Math.max(24, Math.ceil(ringR * 7));
          for (let s = 0; s < steps; s++) {
            const a = (s / steps) * Math.PI * 2;
            const wobble = Math.sin(a * 4 + phase * 6) * chaos * 2.2;
            const rr = ringR + wobble;
            const px = cx + Math.cos(a) * rr;
            const py = cy + Math.sin(a) * rr;
            plot(grid, px, py, prog < 0.35 ? mod.colorCore : prog < 0.72 ? mod.colorMid : mod.colorEdge);
            if (thickness > 1.6) {
              plot(grid, cx + Math.cos(a) * (rr - 1), cy + Math.sin(a) * (rr - 1), mod.colorMid);
            }
          }
        }
      }

      byModule.push({
        moduleId: mod.id,
        name: `FX Lab · ${mod.name}`,
        blendMode: mod.blendMode,
        pixels: grid,
      });

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (grid[y][x]) merged[y][x] = grid[y][x];
        }
      }
    }

    results.push({ merged, byModule });
  }

  return results;
}

// =========================================================
// FX LIBRARY PERSISTENCE (localStorage + .pxfx.json)
// =========================================================
const FX_LIBRARY_STORAGE_KEY = 'pixelclash_fx_library_v1';

const BUILTIN_FX_PRESETS: FxLibraryPreset[] = [
  {
    id: 'builtin-shoryu-flame',
    name: 'Llamarada Arcade CPS2',
    category: 'fire',
    createdAt: '2026-01-01T00:00:00.000Z',
    recipe: {
      id: 'builtin-shoryu-flame',
      name: 'Llamarada Arcade CPS2',
      source: 'generator',
      createdAt: '2026-01-01T00:00:00.000Z',
      generatorConfig: {
        ...DEFAULT_FX_GENERATOR_CONFIG,
        effectType: 'fire',
        visualStyle: 'cps2',
        detailLevel: 'high',
        shape: 'conical',
        direction: 'up',
        frameCount: 8,
        seed: 7711,
      },
    },
  },
  {
    id: 'builtin-thunder-arc',
    name: 'Descarga Eléctrica Neo Geo',
    category: 'electricity',
    createdAt: '2026-01-01T00:00:00.000Z',
    recipe: {
      id: 'builtin-thunder-arc',
      name: 'Descarga Eléctrica Neo Geo',
      source: 'generator',
      createdAt: '2026-01-01T00:00:00.000Z',
      generatorConfig: {
        ...DEFAULT_FX_GENERATOR_CONFIG,
        effectType: 'electricity',
        visualStyle: 'neo_geo',
        detailLevel: 'very_high',
        shape: 'linear',
        direction: 'right',
        modifiers: { ...DEFAULT_FX_GENERATOR_CONFIG.modifiers, chaos: 62, intensity: 92, density: 80 },
        frameCount: 8,
        seed: 3329,
      },
    },
  },
  {
    id: 'builtin-hitspark-gg',
    name: 'Impacto Crítico Guilty Gear',
    category: 'impact',
    createdAt: '2026-01-01T00:00:00.000Z',
    recipe: {
      id: 'builtin-hitspark-gg',
      name: 'Impacto Crítico Guilty Gear',
      source: 'generator',
      createdAt: '2026-01-01T00:00:00.000Z',
      generatorConfig: {
        ...DEFAULT_FX_GENERATOR_CONFIG,
        effectType: 'impact',
        visualStyle: 'guilty_gear',
        detailLevel: 'professional',
        shape: 'radial',
        direction: 'right',
        modifiers: { ...DEFAULT_FX_GENERATOR_CONFIG.modifiers, intensity: 95, scale: 115, length: 135 },
        frameCount: 4,
        seed: 9104,
      },
    },
  },
  {
    id: 'builtin-arcane-vortex',
    name: 'Vórtice Arcano Pixel Fantasy',
    category: 'magic',
    createdAt: '2026-01-01T00:00:00.000Z',
    recipe: {
      id: 'builtin-arcane-vortex',
      name: 'Vórtice Arcano Pixel Fantasy',
      source: 'generator',
      createdAt: '2026-01-01T00:00:00.000Z',
      generatorConfig: {
        ...DEFAULT_FX_GENERATOR_CONFIG,
        effectType: 'magic',
        visualStyle: 'pixel_fantasy',
        detailLevel: 'high',
        shape: 'spiral',
        direction: 'up',
        frameCount: 12,
        seed: 5518,
      },
    },
  },
  {
    id: 'builtin-lab-super-burst',
    name: 'Combo FX Lab · Explosión Super',
    category: 'lab',
    createdAt: '2026-01-01T00:00:00.000Z',
    recipe: {
      id: 'builtin-lab-super-burst',
      name: 'Combo FX Lab · Explosión Super',
      source: 'lab',
      createdAt: '2026-01-01T00:00:00.000Z',
      labModules: DEFAULT_FX_LAB_MODULES,
      labAnimated: true,
      labFrameCount: 8,
      labLayerMode: 'per_component',
    },
  },
];

export function loadFxLibraryPresets(): FxLibraryPreset[] {
  try {
    const raw = localStorage.getItem(FX_LIBRARY_STORAGE_KEY);
    if (!raw) return BUILTIN_FX_PRESETS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return BUILTIN_FX_PRESETS;
    const existingIds = new Set(parsed.map((p: FxLibraryPreset) => p.id));
    return [...parsed, ...BUILTIN_FX_PRESETS.filter((b) => !existingIds.has(b.id))];
  } catch {
    return BUILTIN_FX_PRESETS;
  }
}

export function saveFxLibraryPreset(preset: FxLibraryPreset): FxLibraryPreset[] {
  const current = loadFxLibraryPresets().filter((p) => p.id !== preset.id);
  const next = [preset, ...current];
  try {
    localStorage.setItem(FX_LIBRARY_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors
  }
  return next;
}

export function deleteFxLibraryPreset(presetId: string): FxLibraryPreset[] {
  const next = loadFxLibraryPresets().filter((p) => p.id !== presetId);
  try {
    localStorage.setItem(FX_LIBRARY_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore
  }
  return next;
}

export function serializeFxPresetJson(recipe: EditableFxRecipe): string {
  return JSON.stringify(
    {
      format: 'pixelclash-fx-preset',
      version: 1,
      recipe,
    },
    null,
    2
  );
}

export function parseImportedFxPresetJson(jsonText: string): EditableFxRecipe | null {
  try {
    const data = JSON.parse(jsonText);
    const rec: EditableFxRecipe | undefined = data?.recipe || (data?.source ? data : undefined);
    if (!rec || (rec.source !== 'generator' && rec.source !== 'lab')) return null;
    return {
      ...rec,
      id: rec.id || `fx-import-${Date.now()}`,
      name: rec.name || 'Efecto Importado',
      createdAt: rec.createdAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
