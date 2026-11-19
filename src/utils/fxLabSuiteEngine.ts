import {
  EditableFxRecipe,
  FxEffectType,
  FxFluidConfig,
  FxFluidType,
  FxLabModule,
  FxLabModuleType,
  FxLibraryPreset,
  FxMaterialPresetId,
  FxMaterialProfile,
  FxOriginTag,
  FxParticleEmitterConfig,
  FxParticleTemplateId,
  FxRockCluster,
  FxRockPiece,
  FxRockPieceKind,
  FxSmearConfig,
  LayerBlendMode,
} from '../types';
import {
  DEFAULT_FX_GENERATOR_CONFIG,
  FX_EFFECT_TYPES,
  loadFxLibraryPresets,
  SynthesizedLabFrame,
} from './fxGeneratorEngine';

// =========================================================
// INTERNAL PIXEL & MATH HELPERS (100% DETERMINISTIC, ZERO AI)
// =========================================================
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

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

function smoothNoise(x: number, y: number, seed: number): number {
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

export function createBlankFxGrid(w: number, h: number): (string | null)[][] {
  return Array.from({ length: h }, () => Array<string | null>(w).fill(null));
}

export function cloneFxGrid(grid: (string | null)[][]): (string | null)[][] {
  return grid.map((row) => [...row]);
}

function plotPx(grid: (string | null)[][], x: number, y: number, color: string | null) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (iy >= 0 && iy < grid.length && ix >= 0 && ix < (grid[0]?.length || 0)) {
    grid[iy][ix] = color;
  }
}

function drawDisk(grid: (string | null)[][], cx: number, cy: number, r: number, color: string) {
  const rad = Math.max(0.5, r);
  const ce = Math.ceil(rad);
  for (let dy = -ce; dy <= ce; dy++) {
    for (let dx = -ce; dx <= ce; dx++) {
      if (dx * dx + dy * dy <= rad * rad) {
        plotPx(grid, cx + dx, cy + dy, color);
      }
    }
  }
}

function drawLinePx(
  grid: (string | null)[][],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  thickness: number = 1
) {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  const r = Math.max(0.5, thickness * 0.5);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    if (thickness <= 1.2) {
      plotPx(grid, x, y, color);
    } else {
      drawDisk(grid, x, y, r, color);
    }
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16) || 0,
      parseInt(clean[1] + clean[1], 16) || 0,
      parseInt(clean[2] + clean[2], 16) || 0,
    ];
  }
  return [
    parseInt(clean.slice(0, 2), 16) || 0,
    parseInt(clean.slice(2, 4), 16) || 0,
    parseInt(clean.slice(4, 6), 16) || 0,
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`;
}

function colorLuminance(color: string): number {
  const [r, g, b] = hexToRgb(color);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function colorSaturation(color: string): number {
  const [r, g, b] = hexToRgb(color);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function addCrispOutline(grid: (string | null)[][], outlineColor: string) {
  const h = grid.length;
  const w = grid[0]?.length || 0;
  const pts: [number, number][] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (grid[y][x] !== null) continue;
      if (
        (x > 0 && grid[y][x - 1] !== null) ||
        (x < w - 1 && grid[y][x + 1] !== null) ||
        (y > 0 && grid[y - 1][x] !== null) ||
        (y < h - 1 && grid[y + 1][x] !== null)
      ) {
        pts.push([x, y]);
      }
    }
  }
  for (const [x, y] of pts) {
    grid[y][x] = outlineColor;
  }
}

export function resizeFxGridNearest(
  src: (string | null)[][],
  targetW: number,
  targetH: number
): (string | null)[][] {
  const srcH = src.length;
  const srcW = src[0]?.length || 0;
  if (srcW === targetW && srcH === targetH) return cloneFxGrid(src);
  const dst = createBlankFxGrid(targetW, targetH);
  if (srcW === 0 || srcH === 0) return dst;
  for (let y = 0; y < targetH; y++) {
    const sy = Math.min(srcH - 1, Math.floor((y / targetH) * srcH));
    for (let x = 0; x < targetW; x++) {
      const sx = Math.min(srcW - 1, Math.floor((x / targetW) * srcW));
      dst[y][x] = src[sy]?.[sx] || null;
    }
  }
  return dst;
}

// =========================================================
// 1. MODULAR BUILDER & EFFECT COMBINER (10 MODULE TYPES)
// =========================================================
export interface ExtendedModuleMeta {
  type: FxLabModuleType;
  label: string;
  desc: string;
  defaultBlend: LayerBlendMode;
  defaultColors: [string, string, string];
}

export const FX_LAB_MODULE_META_EXTENDED: ExtendedModuleMeta[] = [
  { type: 'fire_core', label: 'Núcleo / Fuego', desc: 'Núcleo de detonación o llamas vivas', defaultBlend: 'normal', defaultColors: ['#ffffff', '#fde047', '#ea580c'] },
  { type: 'aura_shell', label: 'Aura / Envolvente', desc: 'Cuerpo flameante de Ki, Chakra o Mana', defaultBlend: 'screen', defaultColors: ['#ffffff', '#fde047', '#f59e0b'] },
  { type: 'glow', label: 'Brillo / Resplandor', desc: 'Halo luminoso y energía central', defaultBlend: 'screen', defaultColors: ['#ffffff', '#7dd3fc', '#2563eb'] },
  { type: 'wind_streams', label: 'Corrientes de Aire', desc: 'Ráfagas curvas de viento y presión', defaultBlend: 'screen', defaultColors: ['#f8fafc', '#cbd5e1', '#64748b'] },
  { type: 'smoke', label: 'Humo / Niebla', desc: 'Volutas densas y nubes expansivas', defaultBlend: 'normal', defaultColors: ['#cbd5e1', '#64748b', '#1e293b'] },
  { type: 'dust_cloud', label: 'Polvo / Suelo', desc: 'Nube granular ascendente o aterrizaje', defaultBlend: 'normal', defaultColors: ['#f5f5f4', '#d6d3d1', '#78716c'] },
  { type: 'sparks', label: 'Chispas', desc: 'Destellos direccionales de impacto', defaultBlend: 'screen', defaultColors: ['#ffffff', '#fef08a', '#ef4444'] },
  { type: 'particles', label: 'Partículas', desc: 'Enjambre balístico de brasas y motas', defaultBlend: 'screen', defaultColors: ['#ffffff', '#fde047', '#f97316'] },
  { type: 'fragments', label: 'Fragmentos / Rocas', desc: 'Escombros sólidos proyectados con rotación', defaultBlend: 'normal', defaultColors: ['#e7e5e4', '#a8a29e', '#44403c'] },
  { type: 'ground_spikes', label: 'Púas / Pilares Tierra', desc: 'Picos y pilares de roca emergiendo del suelo', defaultBlend: 'normal', defaultColors: ['#e7e5e4', '#78716c', '#292524'] },
  { type: 'waves', label: 'Onda Expansiva', desc: 'Anillos de choque y ondas de impacto', defaultBlend: 'screen', defaultColors: ['#ffffff', '#67e8f9', '#6366f1'] },
  { type: 'lightning', label: 'Rayos / Electricidad', desc: 'Arcos voltaicos ramificados', defaultBlend: 'screen', defaultColors: ['#ffffff', '#bae6fd', '#0284c7'] },
  { type: 'smear', label: 'Smear / Barrido', desc: 'Trazos curvos o lineales de velocidad', defaultBlend: 'screen', defaultColors: ['#ffffff', '#fde047', '#f43f5e'] },
  { type: 'fluid', label: 'Fluido / Lava / Agua', desc: 'Chorros líquidos, lava o salpicaduras', defaultBlend: 'normal', defaultColors: ['#ecfeff', '#38bdf8', '#0369a1'] },
  { type: 'distortion', label: 'Distorsión / Calor', desc: 'Ondas de refracción, presión y energía invisible', defaultBlend: 'screen', defaultColors: ['#e0f2fe', '#93c5fd', '#3b82f6'] },
];

export interface FxModularPreset {
  id: string;
  name: string;
  tagline: string;
  modules: FxLabModule[];
}

export const FX_MODULAR_PRESETS: FxModularPreset[] = [
  {
    id: 'explosion_complete',
    name: 'Explosión Completa (6 módulos)',
    tagline: 'Núcleo + Humo + Chispas + Fragmentos + Brillo + Onda expansiva',
    modules: [
      { id: 'exp-smoke', name: 'Humo Denso', type: 'smoke', enabled: true, blendMode: 'normal', colorCore: '#94a3b8', colorMid: '#475569', colorEdge: '#1e293b', scale: 120, density: 68, intensity: 72, speed: 80, opacity: 90, chaos: 55, angleDeg: 270, offsetX: 0, offsetY: 4, seed: 111 },
      { id: 'exp-core', name: 'Núcleo Detonación', type: 'fire_core', enabled: true, blendMode: 'normal', colorCore: '#ffffff', colorMid: '#fde047', colorEdge: '#ea580c', scale: 95, density: 82, intensity: 92, speed: 105, opacity: 100, chaos: 40, angleDeg: 270, offsetX: 0, offsetY: 0, seed: 222 },
      { id: 'exp-frags', name: 'Fragmentos Proyectados', type: 'fragments', enabled: true, blendMode: 'normal', colorCore: '#fde68a', colorMid: '#78716c', colorEdge: '#292524', scale: 110, density: 60, intensity: 85, speed: 120, opacity: 100, chaos: 65, angleDeg: 270, offsetX: 0, offsetY: 0, seed: 333 },
      { id: 'exp-wave', name: 'Onda Expansiva', type: 'waves', enabled: true, blendMode: 'screen', colorCore: '#ffffff', colorMid: '#fdba74', colorEdge: '#ea580c', scale: 125, density: 50, intensity: 85, speed: 115, opacity: 85, chaos: 18, angleDeg: 0, offsetX: 0, offsetY: 0, seed: 444 },
      { id: 'exp-glow', name: 'Brillo Central', type: 'glow', enabled: true, blendMode: 'screen', colorCore: '#ffffff', colorMid: '#fef08a', colorEdge: '#f97316', scale: 80, density: 70, intensity: 90, speed: 95, opacity: 85, chaos: 15, angleDeg: 0, offsetX: 0, offsetY: 0, seed: 555 },
      { id: 'exp-sparks', name: 'Chispas Balísticas', type: 'sparks', enabled: true, blendMode: 'screen', colorCore: '#ffffff', colorMid: '#fef08a', colorEdge: '#ef4444', scale: 125, density: 78, intensity: 95, speed: 135, opacity: 100, chaos: 60, angleDeg: 270, offsetX: 0, offsetY: 0, seed: 666 },
    ],
  },
  {
    id: 'fire_elec_smoke',
    name: 'Fuego + Electricidad + Humo',
    tagline: 'Efecto combinado elemental con descargas voltaicas',
    modules: [
      { id: 'fes-smoke', name: 'Humo Oscuro', type: 'smoke', enabled: true, blendMode: 'normal', colorCore: '#cbd5e1', colorMid: '#64748b', colorEdge: '#1e293b', scale: 112, density: 58, intensity: 65, speed: 85, opacity: 85, chaos: 48, angleDeg: 270, offsetX: 0, offsetY: -6, seed: 701 },
      { id: 'fes-fire', name: 'Llamas Base', type: 'fire_core', enabled: true, blendMode: 'normal', colorCore: '#fffbeb', colorMid: '#facc15', colorEdge: '#ea580c', scale: 100, density: 78, intensity: 88, speed: 110, opacity: 100, chaos: 45, angleDeg: 270, offsetX: 0, offsetY: 4, seed: 702 },
      { id: 'fes-elec', name: 'Arcos Eléctricos', type: 'lightning', enabled: true, blendMode: 'screen', colorCore: '#ffffff', colorMid: '#7dd3fc', colorEdge: '#2563eb', scale: 115, density: 68, intensity: 92, speed: 130, opacity: 100, chaos: 62, angleDeg: 315, offsetX: 0, offsetY: 0, seed: 703 },
      { id: 'fes-sparks', name: 'Chispas Plasma', type: 'sparks', enabled: true, blendMode: 'screen', colorCore: '#ffffff', colorMid: '#bae6fd', colorEdge: '#f97316', scale: 110, density: 65, intensity: 88, speed: 125, opacity: 95, chaos: 55, angleDeg: 270, offsetX: 0, offsetY: 0, seed: 704 },
    ],
  },
  {
    id: 'rock_smash_smear',
    name: 'Impacto Roca + Smear + Polvo',
    tagline: 'Golpe pesado con barrido cinético y escombros',
    modules: [
      { id: 'rss-dust', name: 'Polvo de Suelo', type: 'smoke', enabled: true, blendMode: 'normal', colorCore: '#e7e5e4', colorMid: '#a8a29e', colorEdge: '#57534e', scale: 115, density: 65, intensity: 70, speed: 90, opacity: 85, chaos: 50, angleDeg: 270, offsetX: 0, offsetY: 14, seed: 801 },
      { id: 'rss-smear', name: 'Smear de Impacto', type: 'smear', enabled: true, blendMode: 'screen', colorCore: '#ffffff', colorMid: '#fde047', colorEdge: '#f97316', scale: 105, density: 75, intensity: 92, speed: 115, opacity: 95, chaos: 22, angleDeg: 335, offsetX: 0, offsetY: 0, seed: 802 },
      { id: 'rss-frags', name: 'Rocas y Escombros', type: 'fragments', enabled: true, blendMode: 'normal', colorCore: '#d6d3d1', colorMid: '#78716c', colorEdge: '#292524', scale: 115, density: 74, intensity: 90, speed: 115, opacity: 100, chaos: 70, angleDeg: 270, offsetX: 0, offsetY: 4, seed: 803 },
      { id: 'rss-wave', name: 'Anillo Choque', type: 'waves', enabled: true, blendMode: 'screen', colorCore: '#ffffff', colorMid: '#fef08a', colorEdge: '#d97706', scale: 100, density: 45, intensity: 80, speed: 110, opacity: 85, chaos: 15, angleDeg: 0, offsetX: 0, offsetY: 6, seed: 804 },
    ],
  },
  {
    id: 'lava_splash_embers',
    name: 'Salpicadura de Lava + Brasas',
    tagline: 'Fluido magmático incandescente con humo y chispas',
    modules: [
      { id: 'lse-smoke', name: 'Vapor Volcánico', type: 'smoke', enabled: true, blendMode: 'normal', colorCore: '#94a3b8', colorMid: '#475569', colorEdge: '#1e293b', scale: 108, density: 55, intensity: 65, speed: 75, opacity: 80, chaos: 48, angleDeg: 270, offsetX: 0, offsetY: -8, seed: 901 },
      { id: 'lse-fluid', name: 'Magma Fluido', type: 'fluid', enabled: true, blendMode: 'normal', colorCore: '#fef08a', colorMid: '#f97316', colorEdge: '#991b1b', scale: 110, density: 80, intensity: 92, speed: 95, opacity: 100, chaos: 45, angleDeg: 270, offsetX: 0, offsetY: 6, seed: 902 },
      { id: 'lse-embers', name: 'Brasas Ascendentes', type: 'particles', enabled: true, blendMode: 'screen', colorCore: '#ffffff', colorMid: '#facc15', colorEdge: '#dc2626', scale: 115, density: 72, intensity: 88, speed: 105, opacity: 95, chaos: 50, angleDeg: 270, offsetX: 0, offsetY: 0, seed: 903 },
    ],
  },
];

function effectTypeToModuleType(effectType: FxEffectType): FxLabModuleType {
  switch (effectType) {
    case 'fire':
    case 'explosion':
      return 'fire_core';
    case 'electricity':
    case 'plasma':
      return 'lightning';
    case 'smoke':
    case 'darkness':
      return 'smoke';
    case 'dust':
    case 'sand':
      return 'dust_cloud';
    case 'sparks':
      return 'sparks';
    case 'earth':
    case 'rocks_fx':
      return 'ground_spikes';
    case 'fragments_fx':
    case 'debris_fx':
      return 'fragments';
    case 'water':
    case 'blood_stylized':
      return 'fluid';
    case 'wind':
      return 'wind_streams';
    case 'impact':
    case 'smear_fx':
      return 'smear';
    case 'aura':
    case 'ki':
    case 'chakra':
    case 'mana':
      return 'aura_shell';
    case 'shockwave':
    case 'light':
      return 'waves';
    case 'ice':
    case 'magic':
      return 'particles';
    default:
      return 'glow';
  }
}

export function combineFxTypesIntoModules(
  typeA: FxEffectType,
  typeB: FxEffectType,
  includeSmoke: boolean = true
): FxLabModule[] {
  const metaA = FX_EFFECT_TYPES.find((e) => e.id === typeA) || FX_EFFECT_TYPES[0];
  const metaB = FX_EFFECT_TYPES.find((e) => e.id === typeB) || FX_EFFECT_TYPES[1];
  const stamp = Date.now();
  const list: FxLabModule[] = [];

  if (includeSmoke) {
    list.push({
      id: `comb-smoke-${stamp}`,
      name: 'Humo Ambiental',
      type: 'smoke',
      enabled: true,
      blendMode: 'normal',
      colorCore: '#cbd5e1',
      colorMid: '#64748b',
      colorEdge: '#1e293b',
      scale: 112,
      density: 54,
      intensity: 64,
      speed: 82,
      opacity: 82,
      chaos: 45,
      angleDeg: 270,
      offsetX: 0,
      offsetY: -4,
      seed: 1001 + (stamp % 997),
    });
  }

  const modTypeA = effectTypeToModuleType(typeA);
  const modTypeB = effectTypeToModuleType(typeB);
  const isOpaqueA = modTypeA === 'fire_core' || modTypeA === 'smoke' || modTypeA === 'fragments' || modTypeA === 'fluid';
  const isOpaqueB = modTypeB === 'fire_core' || modTypeB === 'smoke' || modTypeB === 'fragments' || modTypeB === 'fluid';

  list.push({
    id: `comb-a-${stamp}`,
    name: `${metaA.label} (Base)`,
    type: modTypeA,
    enabled: true,
    blendMode: isOpaqueA ? 'normal' : 'screen',
    colorCore: metaA.colors[0],
    colorMid: metaA.colors[1],
    colorEdge: metaA.colors[2],
    scale: 100,
    density: 76,
    intensity: 88,
    speed: 100,
    opacity: 100,
    chaos: 42,
    angleDeg: metaA.defaultDirection === 'up' ? 270 : 0,
    offsetX: 0,
    offsetY: 0,
    seed: 2002 + (stamp % 991),
  });

  list.push({
    id: `comb-b-${stamp}`,
    name: `${metaB.label} (Acento)`,
    type: modTypeB,
    enabled: true,
    blendMode: isOpaqueB ? 'normal' : 'screen',
    colorCore: metaB.colors[0],
    colorMid: metaB.colors[1],
    colorEdge: metaB.colors[2],
    scale: 112,
    density: 70,
    intensity: 90,
    speed: 120,
    opacity: 96,
    chaos: 52,
    angleDeg: metaB.defaultDirection === 'up' ? 270 : 315,
    offsetX: 0,
    offsetY: 0,
    seed: 3003 + (stamp % 983),
  });

  return list;
}

export function synthesizeEnhancedLabFrames(
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
    const merged = createBlankFxGrid(w, h);
    const byModule: SynthesizedLabFrame['byModule'] = [];

    for (const mod of activeModules) {
      const grid = createBlankFxGrid(w, h);
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
        const pulse = 0.84 + 0.22 * Math.sin(phase * Math.PI * 2 * speed);
        const r = radius * pulse;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const d = Math.hypot(x - cx, y - cy) / Math.max(1, r);
            const n = (smoothNoise(x * 0.16, y * 0.16 + phase * 3 * speed, mod.seed) - 0.5) * chaos * 0.65;
            const v = (1 - d + n) * (0.65 + intensity * 0.5);
            if (v > 0.72) grid[y][x] = mod.colorCore;
            else if (v > 0.45) grid[y][x] = mod.colorMid;
            else if (v > 0.24 && ((x + y) & 1) === 0) grid[y][x] = mod.colorEdge;
          }
        }
      } else if (mod.type === 'fire_core') {
        const burstEnv = 0.65 + 0.48 * Math.sin(phase * Math.PI);
        const r = radius * burstEnv;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const along = dx * Math.cos(angleRad) + dy * Math.sin(angleRad);
            const dist = Math.hypot(dx, dy);
            const n = smoothNoise(x * 0.18 - Math.cos(angleRad) * phase * 4 * speed, y * 0.18 - Math.sin(angleRad) * phase * 4 * speed, mod.seed);
            const tongue = along > 0 ? (along / Math.max(2, r)) * 0.35 : 0;
            const v = (1 - dist / Math.max(2, r * (1 + tongue)) + (n - 0.45) * (0.45 + chaos * 0.85)) * (0.68 + intensity * 0.45);
            if (v > 0.76) grid[y][x] = mod.colorCore;
            else if (v > 0.5) grid[y][x] = mod.colorMid;
            else if (v > 0.26) grid[y][x] = mod.colorEdge;
          }
        }
      } else if (mod.type === 'smoke') {
        const puffs = Math.max(4, Math.round(5 + density * 10));
        for (let i = 0; i < puffs; i++) {
          const life = ((i / puffs) + phase * speed) % 1;
          const spread = angleRad + (hash2d(i, 11, mod.seed) - 0.5) * (1.1 + chaos * 1.5);
          const dist = life * radius * 1.15;
          const px = cx + Math.cos(spread) * dist;
          const py = cy + Math.sin(spread) * dist;
          const pr = Math.max(1.5, radius * (0.2 + (1 - life * 0.6) * 0.3));
          for (let dy = -Math.ceil(pr); dy <= Math.ceil(pr); dy++) {
            for (let dx = -Math.ceil(pr); dx <= Math.ceil(pr); dx++) {
              const nd = Math.hypot(dx, dy) / pr;
              if (nd <= 1) {
                const col = nd < 0.38 ? mod.colorCore : nd < 0.74 ? mod.colorMid : mod.colorEdge;
                if (nd < 0.74 || ((Math.round(px + dx) + Math.round(py + dy)) & 1) === 0) {
                  plotPx(grid, px + dx, py + dy, col);
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
          const r = (0.15 + life * 1.12) * radius;
          const drift = Math.sin(life * 6 + i) * chaos * radius * 0.24;
          const px = cx + Math.cos(a) * r + Math.cos(angleRad) * drift;
          const py = cy + Math.sin(a) * r + Math.sin(angleRad) * drift;
          const col = life < 0.35 ? mod.colorCore : life < 0.7 ? mod.colorMid : mod.colorEdge;
          plotPx(grid, px, py, col);
          if (intensity > 0.68 && i % 3 === 0) {
            plotPx(grid, px + 1, py, mod.colorMid);
          }
        }
      } else if (mod.type === 'fragments') {
        const chunkCount = Math.max(4, Math.round(5 + density * 11));
        for (let i = 0; i < chunkCount; i++) {
          const life = ((i / chunkCount) * 0.35 + phase * speed) % 1;
          const a = angleRad + (hash2d(i, 19, mod.seed) - 0.5) * (1.8 + chaos * 1.8);
          const v0 = radius * (0.85 + hash2d(i, 23, mod.seed) * 0.85);
          const fx = cx + Math.cos(a) * v0 * life;
          const fy = cy + Math.sin(a) * v0 * life + life * life * radius * 0.85;
          const sz = Math.max(1.2, (1.2 + hash2d(i, 29, mod.seed) * 2.4) * (mod.scale / 100));
          drawDisk(grid, fx, fy, sz, mod.colorMid);
          plotPx(grid, fx - sz * 0.4, fy - sz * 0.4, mod.colorCore);
          plotPx(grid, fx + sz * 0.4, fy + sz * 0.4, mod.colorEdge);
        }
        addCrispOutline(grid, '#141218');
      } else if (mod.type === 'sparks') {
        const total = Math.max(4, Math.round(6 + density * 22));
        for (let i = 0; i < total; i++) {
          const life = ((i / total) + phase * speed * 1.2) % 1;
          const a = angleRad + (hash2d(i, 7, mod.seed) - 0.5) * (1.3 + chaos * 2.2);
          const dist = (0.15 + life * 1.25) * radius;
          const sx = cx + Math.cos(a) * dist;
          const sy = cy + Math.sin(a) * dist;
          const tail = 1.5 + intensity * 3.5;
          drawLinePx(grid, sx, sy, sx - Math.cos(a) * tail, sy - Math.sin(a) * tail, life < 0.45 ? mod.colorCore : mod.colorMid, 1);
          plotPx(grid, sx - Math.cos(a) * (tail + 1), sy - Math.sin(a) * (tail + 1), mod.colorEdge);
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
            drawLinePx(grid, bx, by, nx, ny, mod.colorEdge, 2);
            drawLinePx(grid, bx, by, nx, ny, s < 3 ? mod.colorCore : mod.colorMid, 1);
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
            plotPx(grid, px, py, prog < 0.35 ? mod.colorCore : prog < 0.72 ? mod.colorMid : mod.colorEdge);
            if (thickness > 1.6) {
              plotPx(grid, cx + Math.cos(a) * (rr - 1), cy + Math.sin(a) * (rr - 1), mod.colorMid);
            }
          }
        }
      } else if (mod.type === 'smear') {
        const smearFrames = synthesizeSmearFrames(
          {
            enabled: true,
            mode: 'curved',
            thickness: Math.max(2, Math.round(3 + intensity * 5)),
            length: Math.min(100, Math.round(mod.scale * 0.75)),
            directionDeg: mod.angleDeg,
            curvature: Math.round(35 + chaos * 45),
            intensity: mod.intensity,
            strokeCount: Math.max(2, Math.round(2 + density * 4)),
            taper: true,
            colors: [mod.colorCore, mod.colorMid, mod.colorEdge],
            seed: mod.seed,
          },
          count,
          w,
          h
        );
        const sf = smearFrames[f];
        if (sf) {
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              if (sf[y][x]) grid[y][x] = sf[y][x];
            }
          }
        }
      } else if (mod.type === 'fluid') {
        const blobCount = Math.max(8, Math.round(10 + density * 18));
        for (let i = 0; i < blobCount; i++) {
          const life = ((i / blobCount) + phase * speed) % 1;
          const a = angleRad + (hash2d(i, 41, mod.seed) - 0.5) * (1.2 + chaos * 1.4);
          const dist = (0.1 + life * 0.95) * radius;
          const fx = cx + Math.cos(a) * dist;
          const fy = cy + Math.sin(a) * dist + life * life * radius * 0.65;
          const br = Math.max(1.5, radius * (0.12 + (1 - life) * 0.16));
          drawDisk(grid, fx, fy, br, mod.colorEdge);
          drawDisk(grid, fx - 0.4, fy - 0.4, br * 0.65, mod.colorMid);
          if (i % 2 === 0) plotPx(grid, fx - br * 0.35, fy - br * 0.45, mod.colorCore);
        }
      } else if (mod.type === 'aura_shell') {
        const halfH = Math.max(5, h * 0.42 * (mod.scale / 100));
        const baseW = Math.max(4, w * 0.3 * (mod.scale / 100));
        for (let y = 0; y < h; y++) {
          const ny = (y - (cy + halfH * 0.65)) / Math.max(4, halfH * 1.65); // -1 (top) .. 0 (bottom)
          if (ny < -1.05 || ny > 0.15) continue;
          const upProg = Math.max(0, Math.min(1, -ny));
          // Tapered anime aura silhouette
          const wFactor = upProg < 0.25 ? 0.75 + upProg : 1.0 - (upProg - 0.25) * 0.65;
          const localHalfW = Math.max(2, baseW * wFactor);
          for (let x = 0; x < w; x++) {
            const dx = (x - cx) / localHalfW;
            const n = smoothNoise(x * 0.2, y * 0.16 + phase * 5.2 * speed, mod.seed);
            const flameFlicker = (n - 0.45) * (0.45 + chaos * 0.85);
            const shellDist = Math.abs(Math.abs(dx) - (0.68 + flameFlicker * 0.32));
            const inside = Math.abs(dx) < 0.95 + flameFlicker * 0.4;
            if (!inside) continue;
            const edgeVal = (1 - shellDist * 2.2) * (0.65 + intensity * 0.5) * (1 - upProg * 0.35);
            if (edgeVal > 0.72) grid[y][x] = mod.colorCore;
            else if (edgeVal > 0.44) grid[y][x] = mod.colorMid;
            else if (edgeVal > 0.2 && ((x + y) & 1) === 0) grid[y][x] = mod.colorEdge;
          }
        }
      } else if (mod.type === 'wind_streams') {
        const streams = Math.max(3, Math.round(4 + density * 9));
        for (let i = 0; i < streams; i++) {
          const life = ((i / streams) + phase * speed * 1.1) % 1;
          const baseOffset = (hash2d(i, 61, mod.seed) - 0.5) * radius * 1.9;
          const perpX = -Math.sin(angleRad);
          const perpY = Math.cos(angleRad);
          const len = radius * (0.7 + hash2d(i, 62, mod.seed) * 0.8);
          const startShift = (life - 0.5) * radius * 1.4;
          const steps = Math.max(10, Math.ceil(len));
          for (let s = 0; s <= steps; s++) {
            const u = s / steps;
            const sway = Math.sin(u * Math.PI * 2 + phase * 6 + i) * (1.8 + chaos * 4.5);
            const px = cx + Math.cos(angleRad) * (startShift + (u - 0.5) * len) + perpX * (baseOffset + sway);
            const py = cy + Math.sin(angleRad) * (startShift + (u - 0.5) * len) + perpY * (baseOffset + sway);
            const col = u > 0.35 && u < 0.7 ? mod.colorCore : u > 0.15 && u < 0.85 ? mod.colorMid : mod.colorEdge;
            plotPx(grid, px, py, col);
            if (intensity > 0.65 && u > 0.3 && u < 0.7) {
              plotPx(grid, px + perpX, py + perpY, mod.colorMid);
            }
          }
        }
      } else if (mod.type === 'distortion') {
        const bands = Math.max(2, Math.round(3 + density * 5));
        for (let b = 0; b < bands; b++) {
          const prog = ((b / bands) + phase * speed * 0.9) % 1;
          const rX = Math.max(3, radius * (0.35 + prog * 1.05));
          const rY = rX * (0.72 + (b % 2) * 0.35);
          const steps = Math.max(20, Math.ceil(rX * 6));
          for (let s = 0; s < steps; s++) {
            const a = (s / steps) * Math.PI * 2;
            const shimmer = Math.sin(a * 6 + phase * 8 + b) * (1 + chaos * 2.4);
            const px = cx + Math.cos(a) * (rX + shimmer);
            const py = cy + Math.sin(a) * (rY + shimmer * 0.8);
            if (((Math.round(px) + Math.round(py) + f) & 1) === 0) {
              plotPx(grid, px, py, prog < 0.4 ? mod.colorCore : prog < 0.75 ? mod.colorMid : mod.colorEdge);
            }
          }
        }
      } else if (mod.type === 'ground_spikes') {
        const spikeCount = Math.max(3, Math.round(3 + density * 5));
        const groundY = Math.min(h - 2, Math.round(cy + radius * 0.65));
        // Ground crack strip
        for (let x = Math.max(1, Math.round(cx - radius * 1.1)); x < Math.min(w - 1, Math.round(cx + radius * 1.1)); x++) {
          const j = Math.round((hash2d(x, 71, mod.seed) - 0.5) * 2);
          plotPx(grid, x, groundY + j, mod.colorEdge);
          plotPx(grid, x, groundY + j - 1, mod.colorMid);
        }
        for (let i = 0; i < spikeCount; i++) {
          const stagger = i / Math.max(1, spikeCount);
          const emerge = count === 1 ? 1 : Math.max(0.15, Math.min(1, (phase * 1.65 - stagger * 0.45) * speed));
          const sx = cx + (i - (spikeCount - 1) / 2) * ((radius * 1.6) / Math.max(1, spikeCount - 1));
          const maxH = radius * (0.85 + hash2d(i, 73, mod.seed) * 0.75) * emerge;
          const baseHalfW = Math.max(1.5, (radius * 0.24) * (0.7 + hash2d(i, 75, mod.seed) * 0.5));
          const lean = (hash2d(i, 77, mod.seed) - 0.5) * (0.4 + chaos * 0.7) * maxH;
          const steps = Math.max(4, Math.ceil(maxH));
          for (let s = 0; s <= steps; s++) {
            const u = s / steps;
            const py = groundY - u * maxH;
            const pxCenter = sx + lean * u * u;
            const halfW = Math.max(0.5, baseHalfW * (1 - u * 0.92));
            for (let dx = -Math.ceil(halfW); dx <= Math.ceil(halfW); dx++) {
              const col = dx < -halfW * 0.25 ? mod.colorCore : dx > halfW * 0.3 ? mod.colorEdge : mod.colorMid;
              plotPx(grid, pxCenter + dx, py, col);
            }
          }
        }
        addCrispOutline(grid, '#141218');
      } else if (mod.type === 'dust_cloud') {
        const puffs = Math.max(5, Math.round(6 + density * 14));
        for (let i = 0; i < puffs; i++) {
          const life = ((i / puffs) + phase * speed) % 1;
          const spread = (hash2d(i, 83, mod.seed) - 0.5) * radius * 2.1;
          const px = cx + spread * (0.35 + life * 0.85);
          const py = cy + radius * 0.4 - life * radius * (0.85 + chaos * 0.4);
          const pr = Math.max(1.2, radius * (0.12 + life * 0.22));
          for (let dy = -Math.ceil(pr); dy <= Math.ceil(pr); dy++) {
            for (let dx = -Math.ceil(pr); dx <= Math.ceil(pr); dx++) {
              const nd = Math.hypot(dx, dy) / pr;
              if (nd <= 1 && (nd < 0.65 || ((Math.round(px + dx) + Math.round(py + dy)) & 1) === 0)) {
                const col = nd < 0.35 ? mod.colorCore : nd < 0.7 ? mod.colorMid : mod.colorEdge;
                plotPx(grid, px + dx, py + dy, col);
              }
            }
          }
        }
      }

      byModule.push({
        moduleId: mod.id,
        name: mod.name,
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
// 2. PARTICLE SYSTEM (10 PIXEL-ART TEMPLATES)
// =========================================================
export interface ParticleTemplateMeta {
  id: FxParticleTemplateId;
  label: string;
  desc: string;
  defaults: Partial<FxParticleEmitterConfig>;
}

export const PARTICLE_TEMPLATES: ParticleTemplateMeta[] = [
  { id: 'sparks', label: 'Chispas', desc: 'Estelas brillantes balísticas', defaults: { count: 36, size: 2, speed: 125, directionDeg: 270, spreadDeg: 140, gravity: 45, lifetime: 80, colors: ['#ffffff', '#fde047', '#f97316'] } },
  { id: 'ash', label: 'Cenizas', desc: 'Flotación lenta con deriva térmica', defaults: { count: 40, size: 1, speed: 45, directionDeg: 260, spreadDeg: 95, gravity: -20, lifetime: 95, colors: ['#e2e8f0', '#94a3b8', '#475569'] } },
  { id: 'rocks', label: 'Rocas', desc: 'Piedras pesadas con gravedad fuerte', defaults: { count: 18, size: 4, speed: 105, directionDeg: 270, spreadDeg: 120, gravity: 88, lifetime: 85, colors: ['#d6d3d1', '#78716c', '#292524'] } },
  { id: 'fragments', label: 'Fragmentos', desc: 'Esquirlas angulares de explosión', defaults: { count: 28, size: 3, speed: 135, directionDeg: 270, spreadDeg: 220, gravity: 62, lifetime: 78, colors: ['#fef3c7', '#d97706', '#57534e'] } },
  { id: 'metal_shards', label: 'Trozos Metálicos', desc: 'Chatarra brillante con destellos', defaults: { count: 24, size: 3, speed: 130, directionDeg: 315, spreadDeg: 110, gravity: 75, lifetime: 82, colors: ['#f8fafc', '#94a3b8', '#334155'] } },
  { id: 'leaves', label: 'Hojas', desc: 'Planeo orgánico oscilante al viento', defaults: { count: 22, size: 3, speed: 55, directionDeg: 15, spreadDeg: 80, gravity: 18, lifetime: 98, colors: ['#bbf7d0', '#22c55e', '#15803d'] } },
  { id: 'sand', label: 'Arena', desc: 'Nube fina y ráfagas de granos', defaults: { count: 65, size: 1, speed: 95, directionDeg: 0, spreadDeg: 55, gravity: 28, lifetime: 75, colors: ['#fef3c7', '#eab308', '#a16207'] } },
  { id: 'crystals', label: 'Cristales', desc: 'Prismas geométricos luminosos', defaults: { count: 22, size: 3, speed: 90, directionDeg: 270, spreadDeg: 180, gravity: 35, lifetime: 88, colors: ['#f0f9ff', '#38bdf8', '#4f46e5'] } },
  { id: 'energy', label: 'Energía', desc: 'Orbes y motas Ki ascendentes', defaults: { count: 42, size: 2, speed: 85, directionDeg: 270, spreadDeg: 360, gravity: -32, lifetime: 90, colors: ['#ffffff', '#22d3ee', '#7c3aed'] } },
  { id: 'smoke', label: 'Humo', desc: 'Bocanadas suaves que se expanden', defaults: { count: 24, size: 5, speed: 55, directionDeg: 270, spreadDeg: 70, gravity: -28, lifetime: 95, colors: ['#e2e8f0', '#94a3b8', '#334155'] } },
];

export const DEFAULT_PARTICLE_CONFIG: FxParticleEmitterConfig = {
  enabled: true,
  template: 'sparks',
  count: 36,
  size: 2,
  sizeVariance: 45,
  speed: 120,
  directionDeg: 270,
  spreadDeg: 140,
  gravity: 48,
  lifetime: 85,
  originX: 50,
  originY: 62,
  colors: ['#ffffff', '#fde047', '#f97316'],
  seed: 6102,
};

export function synthesizeParticleFrames(
  cfg: FxParticleEmitterConfig,
  frameCount: number,
  width: number,
  height: number
): (string | null)[][][] {
  const w = Math.max(12, Math.min(256, Math.round(width)));
  const h = Math.max(12, Math.min(256, Math.round(height)));
  const count = Math.max(1, Math.min(32, Math.round(frameCount)));
  const minDim = Math.min(w, h);
  const ox = (cfg.originX / 100) * w;
  const oy = (cfg.originY / 100) * h;
  const dirRad = (cfg.directionDeg * Math.PI) / 180;
  const spreadRad = (cfg.spreadDeg * Math.PI) / 180;
  const lifeLimit = Math.max(0.2, cfg.lifetime / 100);
  const speedScale = (cfg.speed / 100) * minDim * 0.55;
  const gravScale = (cfg.gravity / 100) * minDim * 0.65;

  const frames: (string | null)[][][] = [];

  for (let f = 0; f < count; f++) {
    const grid = createBlankFxGrid(w, h);
    const phase = count === 1 ? 0.35 : f / count;

    for (let i = 0; i < cfg.count; i++) {
      const r1 = hash2d(i, 1, cfg.seed);
      const r2 = hash2d(i, 2, cfg.seed);
      const r3 = hash2d(i, 3, cfg.seed);
      const r4 = hash2d(i, 4, cfg.seed);

      const tRaw = (phase + r1 * 0.9) % 1;
      if (tRaw > lifeLimit) continue;
      const t = tRaw / lifeLimit;

      const angle = dirRad + (r2 - 0.5) * spreadRad;
      const v = speedScale * (0.45 + r3 * 0.8);
      const sway =
        cfg.template === 'leaves' || cfg.template === 'ash'
          ? Math.sin(t * Math.PI * 4 + i * 1.7) * minDim * 0.08
          : 0;

      const px = ox + Math.cos(angle) * v * t + sway;
      const py = oy + Math.sin(angle) * v * t + 0.5 * gravScale * t * t;

      const sizeJitter = 1 + (r4 - 0.5) * (cfg.sizeVariance / 100);
      const sz = Math.max(1, Math.round(cfg.size * sizeJitter * (cfg.template === 'smoke' ? 0.7 + t * 0.9 : 1 - t * 0.35)));
      const col = t < 0.3 ? cfg.colors[0] : t < 0.7 ? cfg.colors[1] : cfg.colors[2];

      if (cfg.template === 'sparks') {
        const vx = Math.cos(angle) * v;
        const vy = Math.sin(angle) * v + gravScale * t;
        const vLen = Math.max(1, Math.hypot(vx, vy));
        const tail = Math.max(1, sz * 1.6);
        drawLinePx(grid, px, py, px - (vx / vLen) * tail, py - (vy / vLen) * tail, col, 1);
        plotPx(grid, px, py, cfg.colors[0]);
      } else if (cfg.template === 'crystals' || cfg.template === 'metal_shards') {
        // Diamond / shard shape
        const r = Math.max(1, Math.floor(sz / 2));
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (Math.abs(dx) + Math.abs(dy) <= r) {
              plotPx(grid, px + dx, py + dy, dy < 0 ? cfg.colors[0] : col);
            }
          }
        }
      } else if (cfg.template === 'leaves') {
        plotPx(grid, px, py, col);
        plotPx(grid, px + 1, py, cfg.colors[1]);
        if (sz >= 2) plotPx(grid, px, py + 1, cfg.colors[2]);
      } else if (cfg.template === 'smoke') {
        drawDisk(grid, px, py, sz * 0.65, col);
      } else if (cfg.template === 'rocks' || cfg.template === 'fragments') {
        drawDisk(grid, px, py, Math.max(0.8, sz * 0.55), col);
        if (sz >= 2) {
          plotPx(grid, px - 1, py - 1, cfg.colors[0]);
          plotPx(grid, px + 1, py + 1, cfg.colors[2]);
        }
      } else {
        drawDisk(grid, px, py, Math.max(0.6, sz * 0.45), col);
      }
    }

    if (cfg.template === 'rocks' || cfg.template === 'fragments' || cfg.template === 'metal_shards') {
      addCrispOutline(grid, '#141218');
    }
    frames.push(grid);
  }

  return frames;
}

// =========================================================
// 3. ROCKS, DEBRIS, DESTRUCTIBLE BLOCKS & CLUSTERS
// =========================================================
export const ROCK_KIND_META: { id: FxRockPieceKind; label: string; colors: [string, string, string] }[] = [
  { id: 'rock', label: 'Roca', colors: ['#78716c', '#d6d3d1', '#292524'] },
  { id: 'spike', label: 'Púa Emergente', colors: ['#78716c', '#e7e5e4', '#1c1917'] },
  { id: 'pillar', label: 'Pilar de Roca', colors: ['#64748b', '#cbd5e1', '#1e293b'] },
  { id: 'fragment', label: 'Fragmento / Esquirla', colors: ['#a8a29e', '#fef3c7', '#44403c'] },
  { id: 'ground_crack', label: 'Suelo / Grieta', colors: ['#78350f', '#d97706', '#291508'] },
  { id: 'debris', label: 'Escombro', colors: ['#64748b', '#cbd5e1', '#1e293b'] },
  { id: 'ground_chunk', label: 'Trozo de Suelo', colors: ['#92400e', '#f59e0b', '#451a03'] },
  { id: 'brick', label: 'Ladrillo', colors: ['#b91c1c', '#f87171', '#450a0a'] },
  { id: 'block', label: 'Bloque Destructible', colors: ['#475569', '#94a3b8', '#0f172a'] },
  { id: 'crystal_chunk', label: 'Bloque Cristal', colors: ['#0284c7', '#bae6fd', '#1e1b4b'] },
];

export const DEFAULT_ROCK_CLUSTERS: FxRockCluster[] = [
  {
    id: 'cluster-main',
    name: 'Cúmulo Principal',
    offsetX: 0,
    offsetY: 0,
    scale: 100,
    rotationDeg: 0,
    burstSpeed: 38,
    gravity: 45,
  },
];

export const DEFAULT_ROCK_PIECES: FxRockPiece[] = [
  { id: 'rp-1', name: 'Roca Central', kind: 'rock', x: 50, y: 54, size: 11, aspect: 1.15, rotationDeg: 14, deform: 38, colorPrimary: '#78716c', colorHighlight: '#d6d3d1', colorShadow: '#292524', outline: true, clusterId: 'cluster-main', seed: 101 },
  { id: 'rp-2', name: 'Escombro Izq', kind: 'debris', x: 34, y: 46, size: 7, aspect: 0.85, rotationDeg: 320, deform: 55, colorPrimary: '#64748b', colorHighlight: '#cbd5e1', colorShadow: '#1e293b', outline: true, clusterId: 'cluster-main', seed: 202 },
  { id: 'rp-3', name: 'Trozo Suelo Der', kind: 'ground_chunk', x: 67, y: 58, size: 8, aspect: 1.35, rotationDeg: 28, deform: 45, colorPrimary: '#92400e', colorHighlight: '#f59e0b', colorShadow: '#451a03', outline: true, clusterId: 'cluster-main', seed: 303 },
  { id: 'rp-4', name: 'Ladrillo Alto', kind: 'brick', x: 48, y: 34, size: 6, aspect: 1.5, rotationDeg: 210, deform: 18, colorPrimary: '#b91c1c', colorHighlight: '#f87171', colorShadow: '#450a0a', outline: true, clusterId: 'cluster-main', seed: 404 },
];

export function createRandomRockPiece(
  kind: FxRockPieceKind,
  clusterId: string | null,
  seed: number
): FxRockPiece {
  const rng = mulberry32(seed);
  const meta = ROCK_KIND_META.find((k) => k.id === kind) || ROCK_KIND_META[0];
  return {
    id: `rp-${Date.now()}-${Math.floor(rng() * 9999)}`,
    name: `${meta.label} #${Math.floor(1 + rng() * 99)}`,
    kind,
    x: Math.round(24 + rng() * 52),
    y: Math.round(26 + rng() * 48),
    size: Math.round(5 + rng() * 9),
    aspect: Math.round((kind === 'brick' ? 1.45 : 0.75 + rng() * 0.75) * 100) / 100,
    rotationDeg: Math.round(rng() * 360),
    deform: Math.round(kind === 'block' || kind === 'brick' ? 8 + rng() * 18 : 28 + rng() * 52),
    colorPrimary: meta.colors[0],
    colorHighlight: meta.colors[1],
    colorShadow: meta.colors[2],
    outline: true,
    clusterId,
    seed: Math.floor(rng() * 100000),
  };
}

export function synthesizeRocksFrames(
  pieces: FxRockPiece[],
  clusters: FxRockCluster[],
  frameCount: number,
  width: number,
  height: number
): (string | null)[][][] {
  const w = Math.max(12, Math.min(256, Math.round(width)));
  const h = Math.max(12, Math.min(256, Math.round(height)));
  const count = Math.max(1, Math.min(32, Math.round(frameCount)));
  const clusterMap = new Map(clusters.map((c) => [c.id, c]));
  const frames: (string | null)[][][] = [];

  for (let f = 0; f < count; f++) {
    const grid = createBlankFxGrid(w, h);
    const phase = count === 1 ? 0 : f / Math.max(1, count - 1);

    for (const piece of pieces) {
      const cluster = piece.clusterId ? clusterMap.get(piece.clusterId) : null;
      const cScale = cluster ? cluster.scale / 100 : 1;
      const cRotRad = cluster ? (cluster.rotationDeg * Math.PI) / 180 : 0;

      // Base position relative to center (50,50) when inside a cluster
      let relX = piece.x - 50;
      let relY = piece.y - 50;
      if (cluster) {
        const rx = relX * Math.cos(cRotRad) - relY * Math.sin(cRotRad);
        const ry = relX * Math.sin(cRotRad) + relY * Math.cos(cRotRad);
        relX = rx * cScale + cluster.offsetX;
        relY = ry * cScale + cluster.offsetY;

        // Dynamic burst / emerge + gravity animation across frames
        if (count > 1 && cluster.emergeMode) {
          const stagger = piece.emergeOrder ?? 0;
          const speedFactor = 0.65 + (cluster.burstSpeed / 100) * 1.4;
          const prog = Math.max(0, Math.min(1, (phase * 1.45 - stagger * 0.45) * speedFactor));
          if (piece.kind === 'spike' || piece.kind === 'pillar') {
            // Slide upward from beneath ground
            relY += (1 - prog) * 32;
          } else if (piece.kind === 'fragment' || piece.kind === 'rock' || piece.kind === 'debris') {
            const burstAngle = -Math.PI * 0.5 + (hash2d(piece.seed, 1, 7) - 0.5) * 1.5;
            const dist = prog * (14 + cluster.burstSpeed * 0.35);
            relX += Math.cos(burstAngle) * dist;
            relY += Math.sin(burstAngle) * dist + (cluster.gravity / 100) * 28 * prog * prog;
          }
        } else if (count > 1 && (cluster.burstSpeed > 0 || cluster.gravity !== 0)) {
          const burstAngle = Math.atan2(relY - 4, relX + (hash2d(piece.seed, 1, 7) - 0.5) * 6);
          const burstDist = (cluster.burstSpeed / 100) * 32 * phase;
          relX += Math.cos(burstAngle) * burstDist;
          relY += Math.sin(burstAngle) * burstDist + (cluster.gravity / 100) * 38 * phase * phase;
        }
      }

      const cx = ((50 + relX) / 100) * w;
      const cy = ((50 + relY) / 100) * h;
      const rx = Math.max(1.5, piece.size * 0.5 * piece.aspect * cScale);
      const ry = Math.max(1.5, piece.size * 0.5 * cScale);
      const spinMult = cluster?.emergeMode && (piece.kind === 'spike' || piece.kind === 'pillar' || piece.kind === 'ground_crack') ? 0 : 2.2;
      const rot = ((piece.rotationDeg + (cluster ? cluster.rotationDeg : 0) + phase * (cluster?.burstSpeed || 0) * spinMult) * Math.PI) / 180;
      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);
      const maxR = Math.ceil(Math.max(rx, ry) * 1.65);
      const isBoxy = piece.kind === 'brick' || piece.kind === 'block';
      const isCrystal = piece.kind === 'crystal_chunk';
      const isSpike = piece.kind === 'spike';
      const isPillar = piece.kind === 'pillar';
      const isFragment = piece.kind === 'fragment';
      const isGroundCrack = piece.kind === 'ground_crack';
      const deformNorm = piece.deform / 100;
      const curveBend = ((piece.curvature || 0) / 100) * 0.85;

      const pieceGrid = createBlankFxGrid(w, h);

      for (let dy = -maxR; dy <= maxR; dy++) {
        for (let dx = -maxR; dx <= maxR; dx++) {
          const lx = dx * cosR + dy * sinR;
          const ly = -dx * sinR + dy * cosR;
          const nx = lx / rx;
          const ny = ly / ry;
          const ang = Math.atan2(ny, nx);
          const edgeNoise =
            (Math.sin(ang * 3 + piece.seed) * 0.16 +
              Math.cos(ang * 5 - piece.seed * 0.7) * 0.12 +
              (hash2d(Math.round(ang * 4), piece.seed, 13) - 0.5) * 0.14) *
            deformNorm;

          let distMetric: number;
          if (isSpike) {
            // Tapered triangular spike pointing upward (-ny) with optional curvature
            const upT = Math.max(0, Math.min(1, (1 - ny) * 0.5));
            const bendX = nx - curveBend * upT * upT;
            const allowedHalfW = Math.max(0.06, (1 - upT) * 1.05);
            distMetric =
              ny > 1 || ny < -1
                ? 2
                : Math.abs(bendX) / allowedHalfW + edgeNoise * 0.4;
          } else if (isPillar) {
            // Tall faceted stone pillar with beveled top
            const upT = Math.max(0, Math.min(1, (1 - ny) * 0.5));
            const bendX = nx - curveBend * upT * upT * 0.7;
            const topBevel = ny < -0.75 ? (-0.75 - ny) * 1.8 : 0;
            distMetric = Math.max(Math.abs(bendX) + topBevel, Math.abs(ny)) + edgeNoise * 0.35;
          } else if (isFragment) {
            // Sharp triangular shard
            distMetric = Math.abs(nx) * 1.35 + (ny + 0.35) * 0.75 + Math.abs(ny - 0.1) * 0.45 + edgeNoise * 0.5;
          } else if (isGroundCrack) {
            // Wide fissured ground slab
            const slab = Math.max(Math.abs(nx), Math.abs(ny) * 2.2) + edgeNoise * 0.45;
            const crackLine = Math.abs(Math.sin(lx * 0.45 + piece.seed) * 0.35 - ny) < 0.12;
            distMetric = crackLine && Math.abs(nx) < 0.75 ? 1.5 : slab;
          } else if (isBoxy) {
            distMetric = Math.max(Math.abs(nx), Math.abs(ny)) + edgeNoise * 0.45;
          } else if (isCrystal) {
            distMetric = Math.abs(nx) * 1.15 + Math.abs(ny) * 0.85 + edgeNoise * 0.35;
          } else {
            distMetric = Math.hypot(nx, ny) + edgeNoise;
          }

          if (distMetric <= 1) {
            // Top-left directional lighting + subtle crack lines
            const lightVal = -(dx + dy) / Math.max(2, maxR * 1.1);
            const crackNoise = smoothNoise((lx + 12) * 0.45, (ly + 12) * 0.45, piece.seed + 55);
            let col = piece.colorPrimary;
            if (lightVal > 0.22) col = piece.colorHighlight;
            else if (lightVal < -0.2 || (crackNoise < 0.22 && deformNorm > 0.25)) col = piece.colorShadow;
            plotPx(pieceGrid, cx + dx, cy + dy, col);
          }
        }
      }

      if (piece.outline) {
        addCrispOutline(pieceGrid, '#11131a');
      }

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (pieceGrid[y][x]) grid[y][x] = pieceGrid[y][x];
        }
      }
    }

    frames.push(grid);
  }

  return frames;
}

// =========================================================
// 4. SMEARS ENGINE (LINEAR, CURVED, RADIAL, MULTIPLE)
// =========================================================
export const DEFAULT_SMEAR_CONFIG: FxSmearConfig = {
  enabled: true,
  mode: 'curved',
  thickness: 6,
  length: 76,
  directionDeg: 330,
  curvature: 58,
  intensity: 88,
  strokeCount: 4,
  taper: true,
  colors: ['#ffffff', '#38bdf8', '#4f46e5'],
  seed: 8042,
};

export function synthesizeSmearFrames(
  cfg: FxSmearConfig,
  frameCount: number,
  width: number,
  height: number
): (string | null)[][][] {
  const w = Math.max(12, Math.min(256, Math.round(width)));
  const h = Math.max(12, Math.min(256, Math.round(height)));
  const count = Math.max(1, Math.min(32, Math.round(frameCount)));
  const minDim = Math.min(w, h);
  const cx = w * 0.5;
  const cy = h * 0.5;
  const dirRad = (cfg.directionDeg * Math.PI) / 180;
  const lenPx = (cfg.length / 100) * minDim * 0.82;
  const curveNorm = cfg.curvature / 100;
  const frames: (string | null)[][][] = [];

  for (let f = 0; f < count; f++) {
    const grid = createBlankFxGrid(w, h);
    const phase = count === 1 ? 0.5 : f / Math.max(1, count - 1);
    const headT = count === 1 ? 1 : Math.min(1, phase * 1.45 + 0.15);
    const tailT = count === 1 ? 0 : Math.max(0, phase * 1.35 - 0.35);

    if (cfg.mode === 'radial') {
      const rays = Math.max(3, cfg.strokeCount * 2);
      for (let i = 0; i < rays; i++) {
        const a = dirRad + (i / rays) * Math.PI * 2 + (hash2d(i, 2, cfg.seed) - 0.5) * 0.25;
        const r0 = minDim * (0.08 + tailT * 0.28);
        const r1 = r0 + lenPx * 0.58 * (0.65 + hash2d(i, 5, cfg.seed) * 0.45) * headT;
        const steps = Math.max(8, Math.ceil(r1 - r0));
        for (let s = 0; s <= steps; s++) {
          const u = s / steps;
          const rr = r0 + (r1 - r0) * u;
          const thick = cfg.taper ? Math.max(1, cfg.thickness * 0.5 * Math.sin(u * Math.PI)) : Math.max(1, cfg.thickness * 0.4);
          const col = u > 0.65 ? cfg.colors[0] : u > 0.3 ? cfg.colors[1] : cfg.colors[2];
          drawDisk(grid, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, thick * 0.5, col);
        }
      }
    } else {
      const strokes = cfg.mode === 'multiple' ? Math.max(2, cfg.strokeCount) : cfg.mode === 'curved' ? Math.max(1, Math.min(6, cfg.strokeCount)) : 1;
      for (let k = 0; k < strokes; k++) {
        const spreadOffset = strokes === 1 ? 0 : (k - (strokes - 1) / 2) * Math.max(2.2, cfg.thickness * 0.65);
        const perpX = -Math.sin(dirRad);
        const perpY = Math.cos(dirRad);
        const halfL = lenPx * 0.5;
        const p0x = cx - Math.cos(dirRad) * halfL + perpX * spreadOffset;
        const p0y = cy - Math.sin(dirRad) * halfL + perpY * spreadOffset;
        const p2x = cx + Math.cos(dirRad) * halfL + perpX * spreadOffset;
        const p2y = cy + Math.sin(dirRad) * halfL + perpY * spreadOffset;
        const bend = cfg.mode === 'linear' ? 0 : curveNorm * lenPx * 0.55;
        const p1x = cx + perpX * (bend + spreadOffset * 1.15);
        const p1y = cy + perpY * (bend + spreadOffset * 1.15);

        const steps = Math.max(16, Math.ceil(lenPx * 1.6));
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          if (t < tailT || t > headT) continue;
          const localU = (t - tailT) / Math.max(0.05, headT - tailT);
          const inv = 1 - t;
          const bx = inv * inv * p0x + 2 * inv * t * p1x + t * t * p2x;
          const by = inv * inv * p0y + 2 * inv * t * p1y + t * t * p2y;

          const baseThick = cfg.thickness * (k === Math.floor(strokes / 2) ? 1 : 0.62);
          const env = cfg.taper ? Math.pow(Math.sin(localU * Math.PI), 0.72) : 1;
          const rad = Math.max(0.5, baseThick * 0.5 * env * (0.65 + (cfg.intensity / 100) * 0.45));

          drawDisk(grid, bx, by, rad, cfg.colors[2]);
          if (rad >= 1.1) drawDisk(grid, bx, by, rad * 0.68, cfg.colors[1]);
          if (localU > 0.35 && localU < 0.92) {
            drawDisk(grid, bx, by, Math.max(0.5, rad * 0.35), cfg.colors[0]);
          }
        }
      }
    }

    frames.push(grid);
  }

  return frames;
}

// =========================================================
// 5. REAL-TIME FLUID LAB ENGINE (PLAY / PAUSE / RESET + BAKE)
// =========================================================
export interface FluidTypeMeta {
  id: FxFluidType;
  label: string;
  desc: string;
  defaults: Partial<FxFluidConfig>;
}

export const FLUID_TYPE_PRESETS: FluidTypeMeta[] = [
  { id: 'water', label: 'Agua', desc: 'Fluido ligero con espuma blanca y ondas', defaults: { density: 62, viscosity: 18, pressure: 65, turbulence: 38, speed: 115, foam: 72, ripple: 68, colors: ['#f0f9ff', '#67e8f9', '#0284c7', '#0c4a6e'] } },
  { id: 'lava', label: 'Lava', desc: 'Magma denso y viscoso incandescente', defaults: { density: 86, viscosity: 78, pressure: 48, turbulence: 44, speed: 62, foam: 55, ripple: 34, colors: ['#fef9c3', '#facc15', '#ea580c', '#7f1d1d'] } },
  { id: 'blood', label: 'Sangre Estilizada', desc: 'Salpicadura arcade de alto contraste', defaults: { density: 70, viscosity: 42, pressure: 78, turbulence: 32, speed: 128, foam: 22, ripple: 45, colors: ['#fecdd3', '#f43f5e', '#be123c', '#4c0519'] } },
  { id: 'liquid_energy', label: 'Energía Líquida', desc: 'Fluido neón luminoso de baja gravedad', defaults: { density: 58, viscosity: 25, pressure: 74, turbulence: 68, speed: 120, foam: 85, ripple: 82, colors: ['#ffffff', '#22d3ee', '#a855f7', '#312e81'] } },
  { id: 'mud', label: 'Lodo', desc: 'Barro espeso de alta viscosidad', defaults: { density: 90, viscosity: 88, pressure: 35, turbulence: 22, speed: 52, foam: 12, ripple: 20, colors: ['#d6d3d1', '#a16207', '#713f12', '#292524'] } },
  { id: 'acid', label: 'Ácido', desc: 'Líquido corrosivo burbujeante verde', defaults: { density: 66, viscosity: 32, pressure: 62, turbulence: 56, speed: 98, foam: 78, ripple: 72, colors: ['#f7fee7', '#a3e635', '#16a34a', '#14532d'] } },
  { id: 'custom', label: 'Personalizado', desc: 'Paleta y física completamente libres', defaults: { density: 65, viscosity: 35, pressure: 60, turbulence: 42, speed: 100, foam: 50, ripple: 50 } },
];

export const DEFAULT_FLUID_CONFIG: FxFluidConfig = {
  fluidType: 'water',
  emitterMode: 'splash',
  density: 64,
  viscosity: 22,
  pressure: 66,
  turbulence: 40,
  speed: 112,
  directionDeg: 270,
  foam: 70,
  ripple: 65,
  colors: ['#f0f9ff', '#67e8f9', '#0284c7', '#0c4a6e'],
  seed: 5120,
};

export interface FluidSimParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
}

export interface FluidSimState {
  width: number;
  height: number;
  tick: number;
  particles: FluidSimParticle[];
  rngState: number;
}

function nextRand(state: FluidSimState): number {
  let a = (state.rngState + 0x6d2b79f5) | 0;
  state.rngState = a;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function createFluidSimState(cfg: FxFluidConfig, width: number, height: number): FluidSimState {
  const w = Math.max(12, Math.min(256, Math.round(width)));
  const h = Math.max(12, Math.min(256, Math.round(height)));
  const state: FluidSimState = {
    width: w,
    height: h,
    tick: 0,
    particles: [],
    rngState: (cfg.seed || 1337) >>> 0,
  };
  // Pre-seed particles depending on emitter mode
  const initialCount = Math.max(18, Math.round(24 + (cfg.density / 100) * 44));
  for (let i = 0; i < initialCount; i++) {
    spawnFluidParticle(state, cfg, true);
  }
  return state;
}

function spawnFluidParticle(state: FluidSimState, cfg: FxFluidConfig, initial: boolean = false) {
  const { width: w, height: h } = state;
  const dirRad = (cfg.directionDeg * Math.PI) / 180;
  const speedMul = (cfg.speed / 100) * Math.min(w, h) * 0.048;
  const r1 = nextRand(state);
  const r2 = nextRand(state);
  const r3 = nextRand(state);

  let x = w * 0.5;
  let y = h * 0.65;
  let vx = 0;
  let vy = 0;

  if (cfg.emitterMode === 'splash') {
    x = w * (0.44 + r1 * 0.12);
    y = h * (0.64 + r2 * 0.08);
    const a = dirRad + (r3 - 0.5) * 1.85;
    const sp = speedMul * (0.55 + r1 * 0.95);
    vx = Math.cos(a) * sp;
    vy = Math.sin(a) * sp;
  } else if (cfg.emitterMode === 'stream') {
    x = w * 0.22;
    y = h * (0.42 + (r1 - 0.5) * 0.1);
    const a = dirRad + (r2 - 0.5) * 0.28;
    const sp = speedMul * (0.9 + r3 * 0.55);
    vx = Math.cos(a) * sp;
    vy = Math.sin(a) * sp;
  } else if (cfg.emitterMode === 'wave') {
    x = initial ? w * r1 : w * 0.1;
    y = h * (0.58 + Math.sin(x * 0.22) * 0.12 + (r2 - 0.5) * 0.12);
    vx = speedMul * (0.8 + r3 * 0.45);
    vy = -speedMul * 0.25 * Math.cos(r1 * Math.PI * 2);
  } else if (cfg.emitterMode === 'geyser') {
    x = w * (0.47 + (r1 - 0.5) * 0.08);
    y = h * 0.86;
    const a = -Math.PI * 0.5 + (r2 - 0.5) * 0.42;
    const sp = speedMul * (1.1 + r3 * 0.7);
    vx = Math.cos(a) * sp;
    vy = Math.sin(a) * sp;
  } else {
    // pool
    x = w * (0.15 + r1 * 0.7);
    y = h * (0.62 + r2 * 0.22);
    vx = (r3 - 0.5) * speedMul * 0.55;
    vy = (r2 - 0.5) * speedMul * 0.25;
  }

  state.particles.push({
    x,
    y,
    vx,
    vy,
    life: initial ? Math.floor(r1 * 18) : 0,
    maxLife: Math.round(28 + r2 * 26),
    radius: Math.max(1.3, Math.min(w, h) * (0.042 + r3 * 0.032) * (0.7 + cfg.density / 180)),
  });
}

export function stepFluidSimulation(state: FluidSimState, cfg: FxFluidConfig): FluidSimState {
  const { width: w, height: h } = state;
  state.tick += 1;

  const viscDamp = 1 - Math.max(0.015, (cfg.viscosity / 100) * 0.14);
  const grav =
    cfg.fluidType === 'liquid_energy'
      ? Math.min(w, h) * 0.002
      : Math.min(w, h) * (0.009 + (cfg.density / 100) * 0.008);
  const turbAmt = (cfg.turbulence / 100) * Math.min(w, h) * 0.012;
  const pressurePush = (cfg.pressure / 100) * 0.24;
  const maxParticles = Math.max(24, Math.round(30 + (cfg.density / 100) * 65));

  // Spawn continuous particles
  const spawnPerTick = Math.max(1, Math.round(1 + (cfg.speed / 100) * 2.2));
  for (let s = 0; s < spawnPerTick; s++) {
    if (state.particles.length < maxParticles) {
      spawnFluidParticle(state, cfg, false);
    }
  }

  // Pairwise soft pressure separation (capped loop for smooth 60fps perf)
  const pts = state.particles;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    for (let j = i + 1; j < n; j++) {
      const b = pts[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const minDist = (a.radius + b.radius) * 0.72;
      const d2 = dx * dx + dy * dy;
      if (d2 > 0.001 && d2 < minDist * minDist) {
        const d = Math.sqrt(d2);
        const f = ((minDist - d) / minDist) * pressurePush;
        const nx = dx / d;
        const ny = dy / d;
        a.vx -= nx * f;
        a.vy -= ny * f;
        b.vx += nx * f;
        b.vy += ny * f;
      }
    }
  }

  const floorY = h * 0.88;
  const alive: FluidSimParticle[] = [];

  for (const p of pts) {
    // Curl-like turbulence + ripple oscillation
    const rippleWave = Math.sin(p.x * 0.28 + state.tick * 0.24) * (cfg.ripple / 100) * 0.22;
    const tAngle = smoothNoise(p.x * 0.14, p.y * 0.14 + state.tick * 0.08, cfg.seed) * Math.PI * 2;
    p.vx = (p.vx + Math.cos(tAngle) * turbAmt) * viscDamp;
    p.vy = (p.vy + grav + Math.sin(tAngle) * turbAmt + rippleWave) * viscDamp;

    p.x += p.vx;
    p.y += p.vy;
    p.life += 1;

    // Floor & side bounds with bounce / splash
    if (p.y > floorY) {
      p.y = floorY;
      p.vy = -Math.abs(p.vy) * (0.28 + (1 - cfg.viscosity / 100) * 0.3);
      p.vx += (nextRand(state) - 0.5) * (cfg.pressure / 100) * 0.9;
    }
    if (p.x < 2) {
      p.x = 2;
      p.vx = Math.abs(p.vx) * 0.55;
    } else if (p.x > w - 3) {
      p.x = w - 3;
      p.vx = -Math.abs(p.vx) * 0.55;
    }

    if (p.life < p.maxLife && p.y > -h * 0.25) {
      alive.push(p);
    }
  }

  state.particles = alive;
  return state;
}

export function renderFluidStateToGrid(
  state: FluidSimState,
  cfg: FxFluidConfig
): (string | null)[][] {
  const { width: w, height: h, particles } = state;
  const field = new Float32Array(w * h);
  const velField = new Float32Array(w * h);

  for (const p of particles) {
    const r = p.radius * 1.45;
    const r2 = r * r;
    const x0 = Math.max(0, Math.floor(p.x - r));
    const x1 = Math.min(w - 1, Math.ceil(p.x + r));
    const y0 = Math.max(0, Math.floor(p.y - r));
    const y1 = Math.min(h - 1, Math.ceil(p.y + r));
    const spd = Math.hypot(p.vx, p.vy);

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - p.x;
        const dy = y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2) {
          const wgt = 1 - d2 / r2;
          const contrib = wgt * wgt;
          const idx = y * w + x;
          field[idx] += contrib;
          velField[idx] += contrib * spd;
        }
      }
    }
  }

  const grid = createBlankFxGrid(w, h);
  const [cFoam, cLight, cBody, cDeep] = cfg.colors;
  const threshold = 0.52 - (cfg.density / 100) * 0.16;
  const foamCutoff = 1.15 - (cfg.foam / 100) * 0.65;
  const rippleAmp = (cfg.ripple / 100) * 0.16;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const val = field[idx];
      if (val < threshold) continue;

      const rippleBias = Math.sin(x * 0.55 + y * 0.25 + state.tick * 0.35) * rippleAmp;
      const aboveVal = y > 0 ? field[(y - 1) * w + x] : 0;
      const isTopEdge = aboveVal < threshold;
      const speedNorm = val > 0 ? velField[idx] / val : 0;

      if ((isTopEdge && cfg.foam > 15 && (speedNorm > foamCutoff || ((x + state.tick) & 3) === 0)) || val + rippleBias > 2.35) {
        grid[y][x] = cFoam;
      } else if (isTopEdge || val + rippleBias > 1.45) {
        grid[y][x] = cLight;
      } else if (val + rippleBias > 0.82) {
        grid[y][x] = cBody;
      } else {
        grid[y][x] = cDeep;
      }
    }
  }

  return grid;
}

export function bakeFluidFrames(
  cfg: FxFluidConfig,
  frameCount: number,
  width: number,
  height: number
): (string | null)[][][] {
  const count = Math.max(1, Math.min(32, Math.round(frameCount)));
  const sim = createFluidSimState(cfg, width, height);
  // Warmup ticks so baked sequence starts lively
  for (let w = 0; w < 6; w++) {
    stepFluidSimulation(sim, cfg);
  }
  const frames: (string | null)[][][] = [];
  for (let f = 0; f < count; f++) {
    stepFluidSimulation(sim, cfg);
    stepFluidSimulation(sim, cfg);
    frames.push(renderFluidStateToGrid(sim, cfg));
  }
  return frames;
}

// =========================================================
// 6. FX MATERIALS SYSTEM (7 BASE MATERIALS + PIXEL REMAPPING)
// =========================================================
export const DEFAULT_FX_MATERIALS: FxMaterialProfile[] = [
  { id: 'smoke', name: 'Humo Volumétrico', baseType: 'smoke', palette: ['#f1f5f9', '#94a3b8', '#475569', '#1e293b'], ditherStrength: 55, useOutline: false, outlineColor: '#0f172a', glowIntensity: 10, roughness: 35, blendMode: 'normal' },
  { id: 'fire', name: 'Fuego Incandescente', baseType: 'fire', palette: ['#ffffff', '#fde047', '#f97316', '#991b1b'], ditherStrength: 25, useOutline: false, outlineColor: '#450a0a', glowIntensity: 90, roughness: 20, blendMode: 'screen' },
  { id: 'electricity', name: 'Electricidad Voltaica', baseType: 'electricity', palette: ['#ffffff', '#bae6fd', '#38bdf8', '#1d4ed8'], ditherStrength: 10, useOutline: false, outlineColor: '#1e1b4b', glowIntensity: 95, roughness: 15, blendMode: 'screen' },
  { id: 'water', name: 'Agua Cristalina', baseType: 'water', palette: ['#f0f9ff', '#67e8f9', '#0284c7', '#0c4a6e'], ditherStrength: 30, useOutline: false, outlineColor: '#082f49', glowIntensity: 45, roughness: 10, blendMode: 'normal' },
  { id: 'stone', name: 'Piedra Rugosa', baseType: 'stone', palette: ['#d6d3d1', '#78716c', '#44403c', '#1c1917'], ditherStrength: 45, useOutline: true, outlineColor: '#0c0a09', glowIntensity: 0, roughness: 75, blendMode: 'normal' },
  { id: 'metal', name: 'Metal Pulido', baseType: 'metal', palette: ['#f8fafc', '#cbd5e1', '#64748b', '#1e293b'], ditherStrength: 18, useOutline: true, outlineColor: '#090d16', glowIntensity: 60, roughness: 25, blendMode: 'normal' },
  { id: 'crystal', name: 'Cristal Arcano', baseType: 'crystal', palette: ['#ffffff', '#e879f9', '#7c3aed', '#2e1065'], ditherStrength: 22, useOutline: true, outlineColor: '#1e1b4b', glowIntensity: 85, roughness: 12, blendMode: 'screen' },
];

export function applyMaterialToGrid(
  grid: (string | null)[][],
  material: FxMaterialProfile
): (string | null)[][] {
  const h = grid.length;
  const w = grid[0]?.length || 0;
  const out = createBlankFxGrid(w, h);
  const ditherAmt = (material.ditherStrength / 100) * 0.24;
  const roughAmt = (material.roughness / 100) * 0.16;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = grid[y]?.[x];
      if (!px) continue;
      let lum = colorLuminance(px);
      const bayer = BAYER_4X4[y & 3][x & 3] / 16 - 0.5;
      const grain = hash2d(x, y, 719) - 0.5;
      lum = Math.max(0, Math.min(1, lum + bayer * ditherAmt + grain * roughAmt));
      if (lum > 0.74) out[y][x] = material.palette[0];
      else if (lum > 0.48) out[y][x] = material.palette[1];
      else if (lum > 0.24) out[y][x] = material.palette[2];
      else out[y][x] = material.palette[3];
    }
  }

  if (material.useOutline) {
    addCrispOutline(out, material.outlineColor || '#0b0d14');
  }
  return out;
}

// =========================================================
// 7. IMPORT EXTERNAL FX (PNG, WEBP, GIF, SPRITESHEET) + TOOLS
// =========================================================
export interface ExternalFxImportOptions {
  cols: number;
  rows: number;
  cropTop: number;
  cropRight: number;
  cropBottom: number;
  cropLeft: number;
  targetW: number;
  targetH: number;
  alphaThreshold?: number;
}

export async function importImageFileToFxFrames(
  file: File,
  opts: ExternalFxImportOptions
): Promise<(string | null)[][][]> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Formato de imagen no válido'));
    el.src = dataUrl;
  });

  const srcW = Math.max(1, img.naturalWidth || img.width);
  const srcH = Math.max(1, img.naturalHeight || img.height);
  const cols = Math.max(1, Math.min(32, Math.round(opts.cols)));
  const rows = Math.max(1, Math.min(32, Math.round(opts.rows)));
  const cropL = Math.max(0, Math.min(srcW - 1, Math.round(opts.cropLeft)));
  const cropR = Math.max(0, Math.min(srcW - 1 - cropL, Math.round(opts.cropRight)));
  const cropT = Math.max(0, Math.min(srcH - 1, Math.round(opts.cropTop)));
  const cropB = Math.max(0, Math.min(srcH - 1 - cropT, Math.round(opts.cropBottom)));

  const usableW = Math.max(1, srcW - cropL - cropR);
  const usableH = Math.max(1, srcH - cropT - cropB);
  const cellW = usableW / cols;
  const cellH = usableH / rows;
  const alphaCut = opts.alphaThreshold ?? 32;

  const off = document.createElement('canvas');
  off.width = opts.targetW;
  off.height = opts.targetH;
  const ctx = off.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [createBlankFxGrid(opts.targetW, opts.targetH)];
  ctx.imageSmoothingEnabled = false;

  const frames: (string | null)[][][] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.clearRect(0, 0, opts.targetW, opts.targetH);
      const sx = cropL + c * cellW;
      const sy = cropT + r * cellH;
      ctx.drawImage(img, sx, sy, cellW, cellH, 0, 0, opts.targetW, opts.targetH);
      const imgData = ctx.getImageData(0, 0, opts.targetW, opts.targetH).data;
      const grid = createBlankFxGrid(opts.targetW, opts.targetH);
      let nonEmpty = 0;
      for (let y = 0; y < opts.targetH; y++) {
        for (let x = 0; x < opts.targetW; x++) {
          const i = (y * opts.targetW + x) * 4;
          const a = imgData[i + 3];
          if (a >= alphaCut) {
            grid[y][x] = rgbToHex(imgData[i], imgData[i + 1], imgData[i + 2]);
            nonEmpty++;
          }
        }
      }
      if (nonEmpty > 0 || (cols === 1 && rows === 1)) {
        frames.push(grid);
      }
    }
  }

  return frames.length > 0 ? frames : [createBlankFxGrid(opts.targetW, opts.targetH)];
}

export function recolorFxFrames(
  frames: (string | null)[][][],
  palette4: [string, string, string, string]
): (string | null)[][][] {
  return frames.map((grid) =>
    grid.map((row) =>
      row.map((px) => {
        if (!px) return null;
        const lum = colorLuminance(px);
        if (lum > 0.74) return palette4[0];
        if (lum > 0.48) return palette4[1];
        if (lum > 0.24) return palette4[2];
        return palette4[3];
      })
    )
  );
}

export function splitGridIntoFxComponents(grid: (string | null)[][]): {
  name: string;
  blendMode: LayerBlendMode;
  colorTag: string;
  pixels: (string | null)[][];
}[] {
  const h = grid.length;
  const w = grid[0]?.length || 0;
  const base = createBlankFxGrid(w, h);
  const glow = createBlankFxGrid(w, h);
  const sparks = createBlankFxGrid(w, h);
  const smoke = createBlankFxGrid(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = grid[y]?.[x];
      if (!px) continue;
      const lum = colorLuminance(px);
      const sat = colorSaturation(px);

      // Count 4-neighbors to isolate tiny floating spark pixels
      let neighbors = 0;
      if (x > 0 && grid[y][x - 1]) neighbors++;
      if (x < w - 1 && grid[y][x + 1]) neighbors++;
      if (y > 0 && grid[y - 1][x]) neighbors++;
      if (y < h - 1 && grid[y + 1][x]) neighbors++;

      if (neighbors <= 1 && lum > 0.45) {
        sparks[y][x] = px;
      } else if (lum >= 0.78) {
        glow[y][x] = px;
      } else if (sat < 0.22 && lum < 0.55) {
        smoke[y][x] = px;
      } else {
        base[y][x] = px;
      }
    }
  }

  return [
    { name: 'Humo / Sombra', blendMode: 'normal', colorTag: '#64748b', pixels: smoke },
    { name: 'Base FX', blendMode: 'normal', colorTag: '#f97316', pixels: base },
    { name: 'Brillo / Núcleo', blendMode: 'screen', colorTag: '#38bdf8', pixels: glow },
    { name: 'Chispas / Detalles', blendMode: 'screen', colorTag: '#fde047', pixels: sparks },
  ];
}

export type StaticFxAnimMode = 'pulse' | 'expand' | 'scroll_up' | 'jitter' | 'dissolve';

export function animateStaticFxFrame(
  grid: (string | null)[][],
  frameCount: number,
  mode: StaticFxAnimMode
): (string | null)[][][] {
  const h = grid.length;
  const w = grid[0]?.length || 0;
  const count = Math.max(2, Math.min(24, Math.round(frameCount)));
  const cx = w * 0.5;
  const cy = h * 0.5;
  const out: (string | null)[][][] = [];

  for (let f = 0; f < count; f++) {
    const phase = f / count;
    const dst = createBlankFxGrid(w, h);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sx = x;
        let sy = y;

        if (mode === 'pulse') {
          const sc = 0.82 + 0.32 * Math.sin(phase * Math.PI * 2);
          sx = Math.round(cx + (x - cx) / sc);
          sy = Math.round(cy + (y - cy) / sc);
        } else if (mode === 'expand') {
          const sc = 0.45 + phase * 0.9;
          sx = Math.round(cx + (x - cx) / sc);
          sy = Math.round(cy + (y - cy) / sc);
        } else if (mode === 'scroll_up') {
          sy = (y + Math.round(phase * h)) % h;
        } else if (mode === 'jitter') {
          const jx = Math.round((hash2d(f, 1, 91) - 0.5) * 4);
          const jy = Math.round((hash2d(f, 2, 91) - 0.5) * 4);
          sx = x - jx;
          sy = y - jy;
        } else if (mode === 'dissolve') {
          const cutoff = 1 - phase * 0.85;
          if (hash2d(x, y, 409) > cutoff) continue;
        }

        if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
          dst[y][x] = grid[sy]?.[sx] || null;
        }
      }
    }
    out.push(dst);
  }

  return out;
}

export function interpolateFxFrames(
  frameA: (string | null)[][],
  frameB: (string | null)[][]
): (string | null)[][] {
  const h = frameA.length;
  const w = frameA[0]?.length || 0;
  const mid = createBlankFxGrid(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = frameA[y]?.[x] || null;
      const b = frameB[y]?.[x] || null;
      if (a && b) {
        const [r1, g1, b1] = hexToRgb(a);
        const [r2, g2, b2] = hexToRgb(b);
        mid[y][x] = rgbToHex((r1 + r2) * 0.5, (g1 + g2) * 0.5, (b1 + b2) * 0.5);
      } else if ((a || b) && ((x + y) & 1) === 0) {
        mid[y][x] = a || b;
      }
    }
  }
  return mid;
}

export function paintPixelBrushOnGrid(
  grid: (string | null)[][],
  cx: number,
  cy: number,
  size: number,
  color: string | null
): (string | null)[][] {
  const next = cloneFxGrid(grid);
  const h = next.length;
  const w = next[0]?.length || 0;
  const half = Math.floor(Math.max(1, size) / 2);
  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      const px = cx + dx;
      const py = cy + dy;
      if (px >= 0 && px < w && py >= 0 && py < h) {
        next[py][px] = color;
      }
    }
  }
  return next;
}

// =========================================================
// 8. PERSISTENT FX LIBRARY V2 (ORIGIN TAGGING + RICH PRESETS)
// =========================================================
const FX_LIBRARY_V2_KEY = 'pixelclash_fx_library_v2';

export const FX_ORIGIN_LABELS: Record<FxOriginTag, { label: string; color: string }> = {
  preset: { label: 'Preset', color: '#94a3b8' },
  manual: { label: 'Manual', color: '#38bdf8' },
  imported: { label: 'Importado', color: '#10b981' },
  ai: { label: 'IA', color: '#a855f7' },
  modified: { label: 'Modificado', color: '#f59e0b' },
};

const BUILTIN_SUITE_PRESETS: FxLibraryPreset[] = [
  {
    id: 'suite-explosion-full',
    name: 'Explosión Modular Completa',
    category: 'lab',
    origin: 'preset',
    createdAt: '2026-01-01T00:00:00.000Z',
    recipe: {
      id: 'suite-explosion-full',
      name: 'Explosión Modular Completa',
      source: 'lab',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      labModules: FX_MODULAR_PRESETS[0].modules,
      labAnimated: true,
      labFrameCount: 8,
      labLayerMode: 'per_component',
    },
  },
  {
    id: 'suite-fire-lightning',
    name: 'Fuego + Electricidad + Humo',
    category: 'lab',
    origin: 'preset',
    createdAt: '2026-01-01T00:00:00.000Z',
    recipe: {
      id: 'suite-fire-lightning',
      name: 'Fuego + Electricidad + Humo',
      source: 'lab',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      labModules: FX_MODULAR_PRESETS[1].modules,
      labAnimated: true,
      labFrameCount: 8,
      labLayerMode: 'per_component',
    },
  },
  {
    id: 'suite-smear-slash',
    name: 'Smear Curvo de Espada',
    category: 'smears',
    origin: 'preset',
    createdAt: '2026-01-01T00:00:00.000Z',
    recipe: {
      id: 'suite-smear-slash',
      name: 'Smear Curvo de Espada',
      source: 'smears',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      smearConfig: DEFAULT_SMEAR_CONFIG,
      labAnimated: true,
      labFrameCount: 6,
    },
  },
  {
    id: 'suite-fluid-water',
    name: 'Salpicadura de Agua 2D',
    category: 'fluids',
    origin: 'preset',
    createdAt: '2026-01-01T00:00:00.000Z',
    recipe: {
      id: 'suite-fluid-water',
      name: 'Salpicadura de Agua 2D',
      source: 'fluids',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      fluidConfig: DEFAULT_FLUID_CONFIG,
      labAnimated: true,
      labFrameCount: 8,
    },
  },
  {
    id: 'suite-fluid-lava',
    name: 'Géiser de Lava Volcánica',
    category: 'fluids',
    origin: 'preset',
    createdAt: '2026-01-01T00:00:00.000Z',
    recipe: {
      id: 'suite-fluid-lava',
      name: 'Géiser de Lava Volcánica',
      source: 'fluids',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      fluidConfig: {
        ...DEFAULT_FLUID_CONFIG,
        fluidType: 'lava',
        emitterMode: 'geyser',
        ...(FLUID_TYPE_PRESETS.find((p) => p.id === 'lava')?.defaults || {}),
      },
      labAnimated: true,
      labFrameCount: 8,
    },
  },
  {
    id: 'suite-rocks-cluster',
    name: 'Cúmulo de Rocas y Escombros',
    category: 'rocks',
    origin: 'preset',
    createdAt: '2026-01-01T00:00:00.000Z',
    recipe: {
      id: 'suite-rocks-cluster',
      name: 'Cúmulo de Rocas y Escombros',
      source: 'rocks',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      rockPieces: DEFAULT_ROCK_PIECES,
      rockClusters: DEFAULT_ROCK_CLUSTERS,
      labAnimated: true,
      labFrameCount: 6,
    },
  },
  {
    id: 'suite-particles-sparks',
    name: 'Chispas Metálicas de Impacto',
    category: 'particles',
    origin: 'preset',
    createdAt: '2026-01-01T00:00:00.000Z',
    recipe: {
      id: 'suite-particles-sparks',
      name: 'Chispas Metálicas de Impacto',
      source: 'particles',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      particleConfig: DEFAULT_PARTICLE_CONFIG,
      labAnimated: true,
      labFrameCount: 8,
    },
  },
  {
    id: 'suite-fire-cps2',
    name: 'Llamarada Arcade CPS2',
    category: 'fire',
    origin: 'preset',
    createdAt: '2026-01-01T00:00:00.000Z',
    recipe: {
      id: 'suite-fire-cps2',
      name: 'Llamarada Arcade CPS2',
      source: 'generator',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      generatorConfig: {
        ...DEFAULT_FX_GENERATOR_CONFIG,
        effectType: 'fire',
        visualStyle: 'cps2',
        frameCount: 8,
        seed: 7711,
      },
    },
  },
];

export function loadFxLibraryV2(): FxLibraryPreset[] {
  try {
    const rawV2 = localStorage.getItem(FX_LIBRARY_V2_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      if (Array.isArray(parsed)) {
        const existingIds = new Set(parsed.map((p: FxLibraryPreset) => p.id));
        return [
          ...parsed.map((p: FxLibraryPreset) => ({
            ...p,
            origin: p.origin || p.recipe?.origin || 'preset',
          })),
          ...BUILTIN_SUITE_PRESETS.filter((b) => !existingIds.has(b.id)),
        ];
      }
    }
    // Migrate v1 user presets seamlessly
    const v1 = loadFxLibraryPresets();
    const userV1 = v1
      .filter((p) => !p.id.startsWith('builtin-'))
      .map((p) => ({ ...p, origin: (p.origin || 'manual') as FxOriginTag }));
    return [...userV1, ...BUILTIN_SUITE_PRESETS];
  } catch {
    return BUILTIN_SUITE_PRESETS;
  }
}

export function saveFxLibraryV2(preset: FxLibraryPreset): FxLibraryPreset[] {
  const tagged: FxLibraryPreset = {
    ...preset,
    origin: preset.origin || preset.recipe.origin || 'manual',
    recipe: {
      ...preset.recipe,
      origin: preset.recipe.origin || preset.origin || 'manual',
    },
  };
  const current = loadFxLibraryV2().filter((p) => p.id !== tagged.id);
  const next = [tagged, ...current];
  try {
    localStorage.setItem(FX_LIBRARY_V2_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors
  }
  return next;
}

export function deleteFxLibraryV2(presetId: string): FxLibraryPreset[] {
  const next = loadFxLibraryV2().filter((p) => p.id !== presetId);
  try {
    localStorage.setItem(FX_LIBRARY_V2_KEY, JSON.stringify(next));
  } catch {
    // Ignore
  }
  return next;
}
