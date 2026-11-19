import {
  EditableFxRecipe,
  FxAuraConfig,
  FxAuraType,
  FxBaseGuideConfig,
  FxBaseGuideType,
  FxComponentExplorerCategory,
  FxComponentLibraryCategory,
  FxComponentLibraryItem,
  FxDeformerConfig,
  FxExampleEntry,
  FxLabModule,
  FxLayerRole,
  FxMorphologyConfig,
  FxRockCluster,
  FxRockPiece,
  LayerBlendMode,
} from '../types';
import { DEFAULT_FX_GENERATOR_CONFIG, synthesizeFxFrames } from './fxGeneratorEngine';
import {
  bakeFluidFrames,
  createBlankFxGrid,
  DEFAULT_FLUID_CONFIG,
  synthesizeEnhancedLabFrames,
  synthesizeParticleFrames,
  synthesizeRocksFrames,
  synthesizeSmearFrames,
} from './fxLabSuiteEngine';

// =========================================================
// INTERNAL DETERMINISTIC HELPERS
// =========================================================
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

function plot(grid: (string | null)[][], x: number, y: number, color: string | null) {
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
      if (dx * dx + dy * dy <= rad * rad) plot(grid, cx + dx, cy + dy, color);
    }
  }
}

function drawLine(
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
    if (thickness <= 1.2) plot(grid, x, y, color);
    else drawDisk(grid, x, y, r, color);
  }
}

function addOutline(grid: (string | null)[][], color: string) {
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
  for (const [x, y] of pts) grid[y][x] = color;
}

// =========================================================
// 1. SISTEMA DE BASES (12 FX BASE GUIDES)
// =========================================================
export const FX_BASE_TYPES: { id: FxBaseGuideType; label: string; desc: string }[] = [
  { id: 'empty_silhouette', label: 'Silueta Vacía', desc: 'Contorno guía hueco para dibujar encima' },
  { id: 'solid_silhouette', label: 'Silueta Sólida', desc: 'Volumen base relleno listo para esculpir' },
  { id: 'radial_shape', label: 'Forma Radial', desc: 'Estrella de ejes y destellos desde el centro' },
  { id: 'linear_shape', label: 'Forma Lineal', desc: 'Haz direccional o trayectoria de ataque' },
  { id: 'explosion_base', label: 'Explosión Base', desc: 'Núcleo circular con lóbulos de detonación' },
  { id: 'aura_base', label: 'Aura Base', desc: 'Silueta flameante envolvente para personaje' },
  { id: 'projectile_base', label: 'Proyectil Base', desc: 'Cabeza aerodinámica + estela energética' },
  { id: 'column_base', label: 'Columna Base', desc: 'Pilar vertical de poder o rayo ascendente' },
  { id: 'wave_base', label: 'Onda Base', desc: 'Anillo expansivo o frente de choque' },
  { id: 'rock_base', label: 'Roca Base', desc: 'Bloque poligonal facetado de tierra/piedra' },
  { id: 'fragment_base', label: 'Fragmento Base', desc: 'Esquirlas angulares dispersas' },
  { id: 'cloud_base', label: 'Nube Base', desc: 'Volutas orgánicas para humo, polvo o niebla' },
];

export const DEFAULT_FX_BASE_GUIDE: FxBaseGuideConfig = {
  enabled: false,
  type: 'aura_base',
  showAsOverlay: true,
  includeInExport: false,
  guideColor: '#38bdf8',
  scale: 100,
  thickness: 2,
  rotationDeg: 0,
  seed: 3104,
};

export function synthesizeFxBaseGuide(
  cfg: FxBaseGuideConfig,
  width: number,
  height: number
): (string | null)[][] {
  const w = Math.max(12, Math.min(256, Math.round(width)));
  const h = Math.max(12, Math.min(256, Math.round(height)));
  const grid = createBlankFxGrid(w, h);
  const cx = w * 0.5;
  const cy = h * 0.5;
  const minDim = Math.min(w, h);
  const r = Math.max(3, minDim * 0.34 * (cfg.scale / 100));
  const rot = (cfg.rotationDeg * Math.PI) / 180;
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);
  const col = cfg.guideColor || '#38bdf8';

  const toLocal = (x: number, y: number): [number, number] => {
    const dx = x - cx;
    const dy = y - cy;
    return [dx * cosR + dy * sinR, -dx * sinR + dy * cosR];
  };

  const filled = createBlankFxGrid(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [lx, ly] = toLocal(x, y);
      const dist = Math.hypot(lx, ly);
      const ang = Math.atan2(ly, lx);
      let inside = false;

      switch (cfg.type) {
        case 'empty_silhouette':
        case 'solid_silhouette': {
          const wobble = Math.sin(ang * 3 + cfg.seed) * 0.08 + Math.cos(ang * 5) * 0.05;
          inside = dist / r <= 0.92 + wobble;
          break;
        }
        case 'radial_shape': {
          const rays = 8;
          const star = 0.42 + 0.65 * Math.pow(0.5 + 0.5 * Math.cos(ang * rays), 2);
          inside = dist <= r * star;
          break;
        }
        case 'linear_shape': {
          const halfL = r * 1.25;
          const halfT = Math.max(1.5, r * 0.24 * (1 - Math.max(0, lx / halfL) * 0.45));
          inside = Math.abs(lx) <= halfL && Math.abs(ly) <= halfT;
          break;
        }
        case 'explosion_base': {
          const lobes = 0.78 + 0.26 * Math.sin(ang * 7 + cfg.seed) + 0.14 * Math.cos(ang * 11);
          inside = dist <= r * lobes;
          break;
        }
        case 'aura_base': {
          const ny = (ly + r * 0.9) / Math.max(2, r * 2.1); // 0 top .. 1 bottom
          if (ny >= 0 && ny <= 1.05) {
            const taper = ny < 0.35 ? 0.3 + ny * 1.9 : 0.98 - (ny - 0.35) * 0.28;
            const flame = Math.sin(ny * 10 + cfg.seed) * 0.12;
            const halfW = r * 0.78 * taper * (1 + flame);
            inside = Math.abs(lx) <= halfW;
          }
          break;
        }
        case 'projectile_base': {
          // Head on right (+lx), tapered tail on left (-lx)
          const headDist = Math.hypot(lx - r * 0.42, ly);
          const inHead = headDist <= r * 0.45;
          const inTail =
            lx <= r * 0.42 &&
            lx >= -r * 1.25 &&
            Math.abs(ly) <= r * 0.42 * Math.max(0, (lx + r * 1.25) / (r * 1.67));
          inside = inHead || inTail;
          break;
        }
        case 'column_base': {
          const halfW = r * (0.38 + 0.12 * Math.sin(ly * 0.22 + cfg.seed));
          inside = Math.abs(lx) <= halfW && Math.abs(ly) <= r * 1.25;
          break;
        }
        case 'wave_base': {
          const ringThickness = Math.max(1.5, cfg.thickness * 1.4);
          inside = Math.abs(dist - r * 0.85) <= ringThickness;
          break;
        }
        case 'rock_base': {
          const facet = 0.85 + 0.18 * Math.sin(ang * 5 + cfg.seed) + 0.12 * Math.cos(ang * 3);
          inside = Math.max(Math.abs(lx) * 0.9, Math.abs(ly) * 1.05) <= r * 0.72 * facet;
          break;
        }
        case 'fragment_base': {
          const tri1 = Math.abs(lx) * 1.2 + Math.abs(ly + r * 0.15) * 0.9 <= r * 0.55;
          const tri2 = Math.hypot(lx - r * 0.65, ly + r * 0.45) <= r * 0.24;
          const tri3 = Math.hypot(lx + r * 0.62, ly - r * 0.35) <= r * 0.22;
          inside = tri1 || tri2 || tri3;
          break;
        }
        case 'cloud_base': {
          const c1 = Math.hypot(lx, ly) <= r * 0.56;
          const c2 = Math.hypot(lx - r * 0.45, ly + r * 0.12) <= r * 0.42;
          const c3 = Math.hypot(lx + r * 0.46, ly + r * 0.14) <= r * 0.4;
          const c4 = Math.hypot(lx, ly - r * 0.36) <= r * 0.36;
          inside = c1 || c2 || c3 || c4;
          break;
        }
      }

      if (inside) filled[y][x] = col;
    }
  }

  if (cfg.type === 'empty_silhouette' || (cfg.showAsOverlay && cfg.type !== 'solid_silhouette')) {
    // Hollow crisp guide contour
    const t = Math.max(1, Math.min(4, Math.round(cfg.thickness)));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!filled[y][x]) continue;
        let isEdge = false;
        for (let dy = -t; dy <= t && !isEdge; dy++) {
          for (let dx = -t; dx <= t && !isEdge; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h || !filled[ny][nx]) {
              isEdge = true;
            }
          }
        }
        if (isEdge) grid[y][x] = col;
      }
    }
    return grid;
  }

  return filled;
}

// =========================================================
// 2. EDITOR DE MORFOLOGÍA + 9 DEFORMADORES + VELOCIDAD VISUAL
// =========================================================
export const DEFAULT_FX_MORPHOLOGY: FxMorphologyConfig = {
  enabled: false,
  width: 100,
  height: 100,
  length: 100,
  volume: 0,
  thickness: 100,
  intensity: 100,
  topWidth: 100,
  midWidth: 100,
  bottomWidth: 100,
  topHeight: 100,
  bottomHeight: 100,
  overallHeight: 100,
};

export const DEFAULT_FX_DEFORMERS: FxDeformerConfig = {
  enabled: false,
  wave: 0,
  curvature: 0,
  twist: 0,
  noise: 0,
  turbulence: 0,
  distortion: 0,
  vortex: 0,
  expansion: 0,
  contraction: 0,
  visualSpeed: 100,
  agitation: 20,
  intensity: 100,
  directionDeg: 270,
  flow: 35,
  seed: 5209,
};

export function isMorphologyActive(m: FxMorphologyConfig): boolean {
  if (!m.enabled) return false;
  return (
    m.width !== 100 ||
    m.height !== 100 ||
    m.length !== 100 ||
    m.volume !== 0 ||
    m.thickness !== 100 ||
    m.topWidth !== 100 ||
    m.midWidth !== 100 ||
    m.bottomWidth !== 100 ||
    m.topHeight !== 100 ||
    m.bottomHeight !== 100 ||
    m.overallHeight !== 100
  );
}

export function isDeformersActive(d: FxDeformerConfig): boolean {
  if (!d.enabled) return false;
  return (
    d.wave !== 0 ||
    d.curvature !== 0 ||
    d.twist !== 0 ||
    d.noise !== 0 ||
    d.turbulence !== 0 ||
    d.distortion !== 0 ||
    d.vortex !== 0 ||
    d.expansion !== 0 ||
    d.contraction !== 0 ||
    d.agitation > 0 ||
    d.flow > 0
  );
}

/**
 * Applies independent morphology profile (topWidth / midWidth / bottomWidth, topHeight / bottomHeight / overallHeight,
 * volume, thickness) and all 9 visual deformers + visual velocity cleanly via crisp inverse nearest-neighbor sampling.
 */
export function applyMorphologyAndDeformersToGrid(
  src: (string | null)[][],
  morph: FxMorphologyConfig,
  def: FxDeformerConfig,
  phase: number
): (string | null)[][] {
  const morphOn = isMorphologyActive(morph);
  const defOn = isDeformersActive(def);
  if (!morphOn && !defOn) return src;

  const h = src.length;
  const w = src[0]?.length || 0;
  if (w === 0 || h === 0) return src;

  const out = createBlankFxGrid(w, h);
  const cx = w * 0.5;
  const cy = h * 0.5;
  const minDim = Math.min(w, h);

  const speed = def.visualSpeed / 100;
  const dIntensity = def.intensity / 100;
  const dirRad = (def.directionDeg * Math.PI) / 180;
  const flowPhase = phase * Math.PI * 2 * speed;
  const flowShift = (def.flow / 100) * Math.sin(flowPhase) * minDim * 0.08;
  const agitAmp = (def.agitation / 100) * dIntensity;

  for (let y = 0; y < h; y++) {
    const ny = (y - cy) / Math.max(1, cy); // -1 (top) .. 0 (mid) .. +1 (bottom)
    // Piecewise quadratic width profile: topWidth (-1), midWidth (0), bottomWidth (+1)
    let localWidthScale = 1;
    let localHeightScale = 1;

    if (morphOn) {
      const globalW = (morph.width / 100) * (morph.thickness / 100);
      const tTop = Math.max(0, -ny);
      const tBot = Math.max(0, ny);
      const profileW =
        ny < 0
          ? (morph.midWidth * (1 - tTop) + morph.topWidth * tTop) / 100
          : (morph.midWidth * (1 - tBot) + morph.bottomWidth * tBot) / 100;
      localWidthScale = Math.max(0.12, globalW * profileW);

      const halfHScale = ny < 0 ? morph.topHeight / 100 : morph.bottomHeight / 100;
      localHeightScale = Math.max(
        0.15,
        (morph.height / 100) * (morph.overallHeight / 100) * (morph.length / 100) * halfHScale
      );
    }

    for (let x = 0; x < w; x++) {
      let sx = (x - cx) / localWidthScale;
      let sy = (y - cy) / localHeightScale;

      if (defOn) {
        const r = Math.hypot(sx, sy);
        const normR = r / Math.max(1, minDim * 0.5);

        // 1. Expansion / Contraction (radial zoom)
        const radialZoom = Math.max(
          0.35,
          1 + (def.expansion / 100) * 0.65 * dIntensity - (def.contraction / 100) * 0.5 * dIntensity
        );
        sx /= radialZoom;
        sy /= radialZoom;

        // 2. Twist (Torsión) & Vortex (Vórtice)
        const twistRad = ((def.twist / 100) * 2.2 * (sy / Math.max(1, cy))) * dIntensity;
        const vortexRad =
          ((def.vortex / 100) * 2.6 * Math.exp(-normR * 1.15) * (0.75 + 0.25 * Math.sin(flowPhase))) *
          dIntensity;
        const totalSpin = twistRad + vortexRad;
        if (Math.abs(totalSpin) > 0.001) {
          const cs = Math.cos(totalSpin);
          const sn = Math.sin(totalSpin);
          const rx = sx * cs - sy * sn;
          const ry = sx * sn + sy * cs;
          sx = rx;
          sy = ry;
        }

        // 3. Curvature (Curvatura parabolic bend)
        if (def.curvature !== 0) {
          const bend = (def.curvature / 100) * minDim * 0.36 * dIntensity;
          sx -= ny * ny * bend;
        }

        // 4. Wave (Ondulación)
        if (def.wave !== 0) {
          const amp = (def.wave / 100) * minDim * 0.14 * dIntensity;
          sx += Math.sin(ny * 5.2 + flowPhase) * amp;
          sy += Math.cos((x / Math.max(1, w)) * 4.2 + flowPhase * 0.8) * amp * 0.35;
        }

        // 5. Noise (Ruido) & Turbulence (Turbulencia) & Distortion (Distorsión)
        if (def.noise > 0 || def.turbulence > 0 || def.distortion > 0 || agitAmp > 0) {
          const n1 = smoothNoise(x * 0.16 + Math.cos(dirRad) * flowPhase, y * 0.16 + Math.sin(dirRad) * flowPhase, def.seed);
          const n2 = smoothNoise(x * 0.32 - Math.sin(dirRad) * flowPhase * 1.4, y * 0.32 + Math.cos(dirRad) * flowPhase * 1.4, def.seed + 77);
          const nAmp = (def.noise / 100) * minDim * 0.11 * dIntensity;
          const tAmp = (def.turbulence / 100) * minDim * 0.16 * dIntensity;
          const distAmp = (def.distortion / 100) * minDim * 0.13 * dIntensity;
          const jitterX = (n1 - 0.5) * 2 * (nAmp + tAmp) + Math.sin(y * 0.45 + flowPhase * 2) * distAmp;
          const jitterY = (n2 - 0.5) * 2 * (nAmp + tAmp * 0.85) + Math.cos(x * 0.45 - flowPhase * 1.7) * distAmp * 0.6;
          const microAgit = (hash2d(x, y, def.seed + Math.round(phase * 100)) - 0.5) * agitAmp * 3.2;
          sx += jitterX + microAgit;
          sy += jitterY + microAgit;
        }

        // 6. Visual Flow drift along directionDeg
        if (def.flow > 0) {
          sx -= Math.cos(dirRad) * flowShift;
          sy -= Math.sin(dirRad) * flowShift;
        }
      }

      const ix = Math.round(cx + sx);
      const iy = Math.round(cy + sy);
      if (ix >= 0 && ix < w && iy >= 0 && iy < h) {
        out[y][x] = src[iy][ix];
      }
    }
  }

  // Volume dilation pass if morph.volume > 15
  if (morphOn && morph.volume > 15) {
    const passes = morph.volume > 65 ? 2 : 1;
    let current = out;
    for (let p = 0; p < passes; p++) {
      const dilated = current.map((row) => [...row]);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          if (current[y][x]) continue;
          const neighbor = current[y - 1][x] || current[y + 1][x] || current[y][x - 1] || current[y][x + 1];
          if (neighbor) dilated[y][x] = neighbor;
        }
      }
      current = dilated;
    }
    return current;
  }

  return out;
}

// =========================================================
// 3. EDITOR ESPECIALIZADO DE AURAS (INCLUYE AURA SIN ENERGÍA!)
// =========================================================
export const AURA_TYPE_META: {
  id: FxAuraType;
  label: string;
  desc: string;
  colors: [string, string, string];
  coreStyle: FxAuraConfig['coreStyle'];
}[] = [
  { id: 'ki', label: 'Aura de Ki', desc: 'Llamas ascendentes de poder estilo anime', colors: ['#ffffff', '#fde047', '#f59e0b'], coreStyle: 'flames' },
  { id: 'chakra', label: 'Aura de Chakra', desc: 'Flujo espiral eléctrico con niebla', colors: ['#ecfeff', '#38bdf8', '#2563eb'], coreStyle: 'spiral' },
  { id: 'spiritual', label: 'Aura Espiritual', desc: 'Haces etéreos, halos y ondas suaves', colors: ['#ffffff', '#fef08a', '#38bdf8'], coreStyle: 'rays' },
  { id: 'elemental', label: 'Aura Elemental', desc: 'Fuego, hielo, aire o tierra envolvente', colors: ['#fff7ed', '#fb923c', '#dc2626'], coreStyle: 'pillar' },
  { id: 'custom', label: 'Aura Personalizada', desc: 'Combina libremente o apaga la energía visible', colors: ['#e0f2fe', '#94a3b8', '#475569'], coreStyle: 'mist' },
];

export const DEFAULT_AURA_CONFIG: FxAuraConfig = {
  auraType: 'ki',
  showCoreEnergy: true,
  coreStyle: 'flames',
  colorCore: '#ffffff',
  colorMid: '#fde047',
  colorEdge: '#f59e0b',
  topWidth: 68,
  midWidth: 105,
  bottomWidth: 122,
  height: 112,
  turbulence: 52,
  speed: 115,
  components: {
    wind: { enabled: true, intensity: 55, color: '#e2e8f0' },
    rocks: { enabled: false, intensity: 65, color: '#78716c' },
    sparks: { enabled: true, intensity: 60, color: '#fef08a' },
    smoke: { enabled: false, intensity: 55, color: '#94a3b8' },
    particles: { enabled: true, intensity: 68, color: '#fde047' },
    fragments: { enabled: false, intensity: 60, color: '#a8a29e' },
    waves: { enabled: true, intensity: 52, color: '#fbbf24' },
    ambientDistortion: { enabled: true, intensity: 48, color: '#fef9c3' },
  },
  seed: 7741,
};

export const ENERGY_LESS_POWER_AURA: FxAuraConfig = {
  auraType: 'custom',
  showCoreEnergy: false, // SIN ENERGÍA VISIBLE: solo aire, polvo, rocas suspendidas, fragmentos y distorsión!
  coreStyle: 'mist',
  colorCore: '#f8fafc',
  colorMid: '#cbd5e1',
  colorEdge: '#64748b',
  topWidth: 92,
  midWidth: 115,
  bottomWidth: 135,
  height: 115,
  turbulence: 62,
  speed: 125,
  components: {
    wind: { enabled: true, intensity: 88, color: '#e2e8f0' },
    rocks: { enabled: true, intensity: 90, color: '#78716c' },
    sparks: { enabled: false, intensity: 35, color: '#fef08a' },
    smoke: { enabled: true, intensity: 76, color: '#d6d3d1' },
    particles: { enabled: true, intensity: 64, color: '#f5f5f4' },
    fragments: { enabled: true, intensity: 85, color: '#a8a29e' },
    waves: { enabled: true, intensity: 58, color: '#cbd5e1' },
    ambientDistortion: { enabled: true, intensity: 74, color: '#e0f2fe' },
  },
  seed: 9182,
};

export interface SynthesizedAuraFrame {
  merged: (string | null)[][];
  components: { name: string; blendMode: LayerBlendMode; colorTag: string; pixels: (string | null)[][] }[];
}

export function synthesizeAuraFrames(
  cfg: FxAuraConfig,
  frameCount: number,
  width: number,
  height: number
): SynthesizedAuraFrame[] {
  const w = Math.max(12, Math.min(256, Math.round(width)));
  const h = Math.max(12, Math.min(256, Math.round(height)));
  const count = Math.max(1, Math.min(32, Math.round(frameCount)));
  const cx = w * 0.5;
  const baseY = h * 0.88;
  const maxH = h * 0.78 * (cfg.height / 100);
  const baseHalfW = w * 0.3;
  const speed = cfg.speed / 100;
  const turb = cfg.turbulence / 100;
  const frames: SynthesizedAuraFrame[] = [];

  for (let f = 0; f < count; f++) {
    const phase = count === 1 ? 0.35 : f / count;
    const merged = createBlankFxGrid(w, h);
    const layerList: SynthesizedAuraFrame['components'] = [];

    const mergeInto = (
      name: string,
      blendMode: LayerBlendMode,
      colorTag: string,
      g: (string | null)[][]
    ) => {
      let hasAny = false;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (g[y][x]) {
            merged[y][x] = g[y][x];
            hasAny = true;
          }
        }
      }
      if (hasAny) layerList.push({ name, blendMode, colorTag, pixels: g });
    };

    // 1. Humo / Polvo ascendente
    if (cfg.components.smoke.enabled) {
      const g = createBlankFxGrid(w, h);
      const puffs = Math.max(5, Math.round(6 + (cfg.components.smoke.intensity / 100) * 14));
      for (let i = 0; i < puffs; i++) {
        const life = ((i / puffs) + phase * speed * 0.9) % 1;
        const side = i % 2 === 0 ? 1 : -1;
        const spread = (0.35 + hash2d(i, 12, cfg.seed) * 0.95) * baseHalfW * (cfg.bottomWidth / 100);
        const px = cx + side * spread * (0.6 + life * 0.45);
        const py = baseY - life * maxH * 0.72;
        const pr = Math.max(1.2, (1.5 + life * 2.6) * (w / 48));
        for (let dy = -Math.ceil(pr); dy <= Math.ceil(pr); dy++) {
          for (let dx = -Math.ceil(pr); dx <= Math.ceil(pr); dx++) {
            const nd = Math.hypot(dx, dy) / pr;
            if (nd <= 1 && (nd < 0.65 || ((Math.round(px + dx) + Math.round(py + dy)) & 1) === 0)) {
              plot(g, px + dx, py + dy, cfg.components.smoke.color);
            }
          }
        }
      }
      mergeInto('Aura · Polvo / Humo', 'normal', cfg.components.smoke.color, g);
    }

    // 2. Cuerpo Principal de Energía (STRICTLY OPTIONAL — can be disabled!)
    if (cfg.showCoreEnergy) {
      const g = createBlankFxGrid(w, h);
      for (let y = 0; y < h; y++) {
        const up = (baseY - y) / Math.max(4, maxH); // 0 bottom .. 1 top
        if (up < -0.08 || up > 1.08) continue;
        const uClamped = Math.max(0, Math.min(1, up));
        const profileW =
          uClamped < 0.5
            ? (cfg.bottomWidth * (1 - uClamped * 2) + cfg.midWidth * (uClamped * 2)) / 100
            : (cfg.midWidth * (1 - (uClamped - 0.5) * 2) + cfg.topWidth * ((uClamped - 0.5) * 2)) / 100;
        const halfW = Math.max(2, baseHalfW * profileW);

        for (let x = 0; x < w; x++) {
          const dx = (x - cx) / halfW;
          const n = smoothNoise(x * 0.18, y * 0.15 + phase * 5.2 * speed, cfg.seed);
          const n2 = smoothNoise(x * 0.34 - phase * 2, y * 0.28 + phase * 7 * speed, cfg.seed + 33);
          const flameWave = (n - 0.45) * (0.4 + turb * 0.95);

          let field = 0;
          if (cfg.coreStyle === 'spiral') {
            const helix = Math.sin(uClamped * 9 - phase * Math.PI * 2 * speed + dx * 3.2);
            field = (1 - Math.abs(dx) * 0.95) * (0.65 + 0.45 * helix) + flameWave * 0.55;
          } else if (cfg.coreStyle === 'rays') {
            const ray = Math.pow(0.5 + 0.5 * Math.cos(dx * 8.5 + phase * 4 * speed), 2);
            field = (1 - Math.abs(dx) * 0.9) * (0.45 + ray * 0.85) * (1 - uClamped * 0.25);
          } else if (cfg.coreStyle === 'pillar') {
            const edgeDist = Math.abs(Math.abs(dx) - 0.72);
            field = (1 - edgeDist * 2.1) + flameWave * 0.5;
          } else if (cfg.coreStyle === 'mist') {
            field = (1 - Math.abs(dx)) * (0.55 + (n2 - 0.35) * 0.9) * (1 - uClamped * 0.3);
          } else {
            // Classic anime Ki flames
            const shell = 1 - Math.abs(Math.abs(dx) - (0.64 + flameWave * 0.35)) * 2.15;
            const innerFill = (1 - Math.abs(dx)) * 0.55;
            field = Math.max(shell, innerFill) * (1 - uClamped * 0.28) + flameWave * 0.55;
          }

          if (field > 0.74) g[y][x] = cfg.colorCore;
          else if (field > 0.48) g[y][x] = cfg.colorMid;
          else if (field > 0.26 && (field > 0.34 || ((x + y) & 1) === 0)) g[y][x] = cfg.colorEdge;
        }
      }
      mergeInto('Aura · Energía Principal', 'screen', cfg.colorMid, g);
    }

    // 3. Corrientes de Aire / Viento
    if (cfg.components.wind.enabled) {
      const g = createBlankFxGrid(w, h);
      const streams = Math.max(3, Math.round(4 + (cfg.components.wind.intensity / 100) * 10));
      for (let i = 0; i < streams; i++) {
        const life = ((i / streams) + phase * speed * 1.15) % 1;
        const side = i % 2 === 0 ? 1 : -1;
        const radialOffset = (0.42 + hash2d(i, 21, cfg.seed) * 0.85) * baseHalfW * (cfg.midWidth / 100);
        const startY = baseY - life * maxH * 0.65;
        const len = maxH * (0.28 + hash2d(i, 22, cfg.seed) * 0.32);
        const steps = Math.max(8, Math.ceil(len));
        for (let s = 0; s <= steps; s++) {
          const u = s / steps;
          const py = startY - u * len;
          const curl = Math.sin(u * Math.PI * 1.8 + phase * 6 + i) * (2 + turb * 4);
          const taper = 1 - u * 0.35;
          const px = cx + side * radialOffset * taper + curl;
          if (u > 0.12 && u < 0.92) plot(g, px, py, cfg.components.wind.color);
        }
      }
      mergeInto('Aura · Corrientes de Viento', 'screen', cfg.components.wind.color, g);
    }

    // 4. Ondas de presión en el suelo
    if (cfg.components.waves.enabled) {
      const g = createBlankFxGrid(w, h);
      const rings = Math.max(1, Math.round(1 + (cfg.components.waves.intensity / 100) * 2));
      for (let rIdx = 0; rIdx < rings; rIdx++) {
        const prog = ((rIdx / rings) + phase * speed) % 1;
        const rx = baseHalfW * (0.45 + prog * 1.25) * (cfg.bottomWidth / 100);
        const ry = Math.max(2, rx * 0.26);
        const steps = Math.max(22, Math.ceil(rx * 5));
        for (let s = 0; s < steps; s++) {
          const a = (s / steps) * Math.PI * 2;
          const px = cx + Math.cos(a) * rx;
          const py = baseY + Math.sin(a) * ry;
          if (prog < 0.72 || (s & 1) === 0) plot(g, px, py, cfg.components.waves.color);
        }
      }
      mergeInto('Aura · Ondas de Presión', 'screen', cfg.components.waves.color, g);
    }

    // 5. Rocas suspendidas levitando
    if (cfg.components.rocks.enabled) {
      const g = createBlankFxGrid(w, h);
      const rockCount = Math.max(3, Math.round(3 + (cfg.components.rocks.intensity / 100) * 8));
      for (let i = 0; i < rockCount; i++) {
        const life = ((i / rockCount) + phase * speed * 0.65) % 1;
        const side = i % 2 === 0 ? 1 : -1;
        const orbitX = (0.52 + hash2d(i, 31, cfg.seed) * 0.85) * baseHalfW * (cfg.bottomWidth / 100);
        const rx = cx + side * orbitX + Math.sin(phase * Math.PI * 2 + i) * 2.2;
        const ry = baseY - life * maxH * 0.88;
        const rad = Math.max(1.2, (1.4 + hash2d(i, 33, cfg.seed) * 2.1) * (w / 48));
        drawDisk(g, rx, ry, rad, cfg.components.rocks.color);
        plot(g, rx - rad * 0.4, ry - rad * 0.4, '#e7e5e4');
        plot(g, rx + rad * 0.35, ry + rad * 0.35, '#292524');
      }
      addOutline(g, '#141218');
      mergeInto('Aura · Rocas Suspendidas', 'normal', cfg.components.rocks.color, g);
    }

    // 6. Fragmentos desintegrándose
    if (cfg.components.fragments.enabled) {
      const g = createBlankFxGrid(w, h);
      const fragCount = Math.max(5, Math.round(6 + (cfg.components.fragments.intensity / 100) * 16));
      for (let i = 0; i < fragCount; i++) {
        const life = ((i / fragCount) + phase * speed * 1.1) % 1;
        const spread = (hash2d(i, 41, cfg.seed) - 0.5) * baseHalfW * 2.5 * (cfg.midWidth / 100);
        const fx = cx + spread;
        const fy = baseY - life * maxH * 0.95;
        plot(g, fx, fy, cfg.components.fragments.color);
        if (life < 0.65) plot(g, fx + 1, fy, '#292524');
      }
      mergeInto('Aura · Fragmentos', 'normal', cfg.components.fragments.color, g);
    }

    // 7. Chispas / Descargas
    if (cfg.components.sparks.enabled) {
      const g = createBlankFxGrid(w, h);
      const sparkCount = Math.max(4, Math.round(5 + (cfg.components.sparks.intensity / 100) * 14));
      for (let i = 0; i < sparkCount; i++) {
        const life = ((i / sparkCount) + phase * speed * 1.35) % 1;
        const spread = (hash2d(i, 51, cfg.seed) - 0.5) * baseHalfW * 2.1;
        const sx = cx + spread;
        const sy = baseY - life * maxH;
        const tail = 1.5 + (cfg.components.sparks.intensity / 100) * 3;
        drawLine(g, sx, sy, sx + (hash2d(i, 52, cfg.seed) - 0.5) * 2.5, sy + tail, cfg.components.sparks.color, 1);
        plot(g, sx, sy, '#ffffff');
      }
      mergeInto('Aura · Chispas', 'screen', cfg.components.sparks.color, g);
    }

    // 8. Partículas ligeras ascendentes
    if (cfg.components.particles.enabled) {
      const g = createBlankFxGrid(w, h);
      const pCount = Math.max(6, Math.round(8 + (cfg.components.particles.intensity / 100) * 26));
      for (let i = 0; i < pCount; i++) {
        const life = ((i / pCount) + phase * speed) % 1;
        const spread = (hash2d(i, 61, cfg.seed) - 0.5) * baseHalfW * 2.3;
        const sway = Math.sin(life * 7 + i) * 2.5;
        const px = cx + spread + sway;
        const py = baseY - life * maxH * 1.05;
        plot(g, px, py, life < 0.35 ? '#ffffff' : cfg.components.particles.color);
      }
      mergeInto('Aura · Partículas', 'screen', cfg.components.particles.color, g);
    }

    // 9. Distorsión ambiental / calor
    if (cfg.components.ambientDistortion.enabled) {
      const g = createBlankFxGrid(w, h);
      const bands = Math.max(2, Math.round(2 + (cfg.components.ambientDistortion.intensity / 100) * 4));
      for (let b = 0; b < bands; b++) {
        const prog = ((b / bands) + phase * speed * 0.9) % 1;
        const yLine = baseY - prog * maxH;
        const span = baseHalfW * (0.95 + prog * 0.45) * (cfg.midWidth / 100);
        for (let dx = -Math.round(span); dx <= Math.round(span); dx += 2) {
          const waveY = yLine + Math.sin(dx * 0.45 + phase * 8 + b) * (1.2 + turb * 2.2);
          if (((dx + b + f) & 1) === 0) {
            plot(g, cx + dx, waveY, cfg.components.ambientDistortion.color);
          }
        }
      }
      mergeInto('Aura · Distorsión Ambiental', 'screen', cfg.components.ambientDistortion.color, g);
    }

    frames.push({ merged, components: layerList });
  }

  return frames;
}

// =========================================================
// 4. ATAQUE DE PÚAS DE TIERRA GENERATOR (INDIVIDUALLY EDITABLE!)
// =========================================================
export function createEarthSpikesAttackPreset(options?: {
  spikeCount?: number;
  heightScale?: number;
  widthScale?: number;
  emergeSpeed?: number;
  curvature?: number;
}): { pieces: FxRockPiece[]; clusters: FxRockCluster[] } {
  const count = Math.max(2, Math.min(8, Math.round(options?.spikeCount ?? 4)));
  const hScale = (options?.heightScale ?? 100) / 100;
  const wScale = (options?.widthScale ?? 100) / 100;
  const speed = options?.emergeSpeed ?? 68;
  const curve = options?.curvature ?? 18;
  const clusterId = 'cluster-earth-spikes';

  const clusters: FxRockCluster[] = [
    {
      id: clusterId,
      name: 'Ataque Púas de Tierra',
      offsetX: 0,
      offsetY: 0,
      scale: 100,
      rotationDeg: 0,
      burstSpeed: speed,
      gravity: 52,
      emergeMode: true,
    },
  ];

  const pieces: FxRockPiece[] = [
    // 1. Suelo y grietas base
    {
      id: 'esp-ground-1',
      name: 'Suelo Agrietado Base',
      kind: 'ground_crack',
      x: 50,
      y: 84,
      size: Math.round(18 * wScale),
      aspect: 2.3,
      rotationDeg: 0,
      deform: 42,
      colorPrimary: '#78350f',
      colorHighlight: '#d97706',
      colorShadow: '#291508',
      outline: true,
      clusterId,
      emergeOrder: 0,
      seed: 4101,
    },
  ];

  // 2. Púas emergentes + Pilares
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const xPos = Math.round(22 + t * 56);
    const isPillar = i === Math.floor(count / 2);
    const heightSize = Math.round((isPillar ? 20 : 14 + (1 - Math.abs(t - 0.5) * 1.4) * 7) * hScale);
    pieces.push({
      id: `esp-spike-${i + 1}`,
      name: isPillar ? `Pilar Central #${i + 1}` : `Púa Emergente #${i + 1}`,
      kind: isPillar ? 'pillar' : 'spike',
      x: xPos,
      y: Math.round(62 - (heightSize - 14) * 0.7),
      size: Math.max(8, Math.min(32, heightSize)),
      aspect: Number((0.46 * wScale).toFixed(2)),
      rotationDeg: Math.round((t - 0.5) * 24),
      deform: 34,
      colorPrimary: isPillar ? '#64748b' : '#78716c',
      colorHighlight: '#e7e5e4',
      colorShadow: '#1c1917',
      outline: true,
      clusterId,
      emergeOrder: Number((t * 0.65).toFixed(2)),
      curvature: Math.round((t - 0.5) * 2 * curve),
      seed: 4200 + i * 37,
    });
  }

  // 3. Rocas desprendidas + Fragmentos + Polvo
  pieces.push(
    {
      id: 'esp-rock-1',
      name: 'Roca Desprendida Izq',
      kind: 'rock',
      x: 28,
      y: 50,
      size: 6,
      aspect: 1.1,
      rotationDeg: 22,
      deform: 48,
      colorPrimary: '#78716c',
      colorHighlight: '#d6d3d1',
      colorShadow: '#292524',
      outline: true,
      clusterId,
      emergeOrder: 0.25,
      seed: 4301,
    },
    {
      id: 'esp-rock-2',
      name: 'Roca Desprendida Der',
      kind: 'rock',
      x: 74,
      y: 48,
      size: 5,
      aspect: 0.9,
      rotationDeg: 325,
      deform: 52,
      colorPrimary: '#78716c',
      colorHighlight: '#d6d3d1',
      colorShadow: '#292524',
      outline: true,
      clusterId,
      emergeOrder: 0.45,
      seed: 4302,
    },
    {
      id: 'esp-frag-1',
      name: 'Fragmento Alto #1',
      kind: 'fragment',
      x: 42,
      y: 34,
      size: 5,
      aspect: 0.85,
      rotationDeg: 40,
      deform: 55,
      colorPrimary: '#a8a29e',
      colorHighlight: '#fef3c7',
      colorShadow: '#44403c',
      outline: true,
      clusterId,
      emergeOrder: 0.35,
      seed: 4401,
    },
    {
      id: 'esp-frag-2',
      name: 'Fragmento Alto #2',
      kind: 'fragment',
      x: 60,
      y: 32,
      size: 4,
      aspect: 1.15,
      rotationDeg: 295,
      deform: 50,
      colorPrimary: '#a8a29e',
      colorHighlight: '#fef3c7',
      colorShadow: '#44403c',
      outline: true,
      clusterId,
      emergeOrder: 0.55,
      seed: 4402,
    }
  );

  return { pieces, clusters };
}

// =========================================================
// 5. SISTEMA DE CAPAS FX + EXPLORADOR DE 16 COMPONENTES + BIBLIOTECA DE COMPONENTES
// =========================================================
export const FX_LAYER_ROLES: { id: FxLayerRole; label: string; color: string }[] = [
  { id: 'base', label: 'Base', color: '#f59e0b' },
  { id: 'particles', label: 'Partículas', color: '#38bdf8' },
  { id: 'rocks', label: 'Rocas', color: '#a8a29e' },
  { id: 'smoke', label: 'Humo', color: '#94a3b8' },
  { id: 'sparks', label: 'Chispas', color: '#fde047' },
  { id: 'distortion', label: 'Distorsión', color: '#818cf8' },
  { id: 'glow', label: 'Brillo', color: '#22d3ee' },
  { id: 'extras', label: 'Extras', color: '#f472b6' },
];

export interface FxComponentExplorerMeta {
  id: FxComponentExplorerCategory;
  label: string;
  desc: string;
  accent: string;
  createModule: () => FxLabModule;
}

function mkMod(
  partial: Partial<FxLabModule> & Pick<FxLabModule, 'name' | 'type' | 'colorCore' | 'colorMid' | 'colorEdge'>
): FxLabModule {
  const stamp = Date.now() + Math.floor(Math.random() * 9999);
  return {
    id: `comp-${partial.type}-${stamp}`,
    enabled: true,
    blendMode: partial.blendMode || 'screen',
    layerRole: partial.layerRole || 'base',
    scale: 100,
    density: 68,
    intensity: 85,
    speed: 105,
    opacity: 95,
    chaos: 42,
    angleDeg: 270,
    offsetX: 0,
    offsetY: 0,
    seed: (stamp % 9000) + 101,
    ...partial,
  };
}

export const FX_COMPONENT_EXPLORER: FxComponentExplorerMeta[] = [
  {
    id: 'energy',
    label: 'Energía',
    desc: 'Núcleo energético, haz o pulso Ki',
    accent: '#22d3ee',
    createModule: () => mkMod({ name: 'Energía Central', type: 'glow', layerRole: 'glow', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#22d3ee', colorEdge: '#2563eb' }),
  },
  {
    id: 'aura',
    label: 'Aura',
    desc: 'Envolvente flameante de Ki o Chakra',
    accent: '#fde047',
    createModule: () => mkMod({ name: 'Envolvente Aura', type: 'aura_shell', layerRole: 'base', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#fde047', colorEdge: '#f59e0b', scale: 112 }),
  },
  {
    id: 'rocks',
    label: 'Rocas',
    desc: 'Púas, pilares y bloques de piedra',
    accent: '#a8a29e',
    createModule: () => mkMod({ name: 'Púas / Rocas', type: 'ground_spikes', layerRole: 'rocks', blendMode: 'normal', colorCore: '#e7e5e4', colorMid: '#78716c', colorEdge: '#292524', offsetY: 6 }),
  },
  {
    id: 'debris',
    label: 'Escombros',
    desc: 'Fragmentos sólidos lanzados al aire',
    accent: '#94a3b8',
    createModule: () => mkMod({ name: 'Escombros Proyectados', type: 'fragments', layerRole: 'rocks', blendMode: 'normal', colorCore: '#e2e8f0', colorMid: '#64748b', colorEdge: '#1e293b', chaos: 65 }),
  },
  {
    id: 'smoke',
    label: 'Humo',
    desc: 'Volutas densas y niebla expansiva',
    accent: '#64748b',
    createModule: () => mkMod({ name: 'Humo Denso', type: 'smoke', layerRole: 'smoke', blendMode: 'normal', colorCore: '#cbd5e1', colorMid: '#64748b', colorEdge: '#1e293b', scale: 115 }),
  },
  {
    id: 'electricity',
    label: 'Electricidad',
    desc: 'Arcos voltaicos y descargas',
    accent: '#38bdf8',
    createModule: () => mkMod({ name: 'Arcos Eléctricos', type: 'lightning', layerRole: 'sparks', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#bae6fd', colorEdge: '#0284c7', speed: 130 }),
  },
  {
    id: 'water',
    label: 'Agua',
    desc: 'Chorros líquidos, espuma y gotas',
    accent: '#06b6d4',
    createModule: () => mkMod({ name: 'Salpicadura Agua', type: 'fluid', layerRole: 'base', blendMode: 'normal', colorCore: '#ecfeff', colorMid: '#38bdf8', colorEdge: '#0369a1' }),
  },
  {
    id: 'lava',
    label: 'Lava',
    desc: 'Magma espeso incandescente',
    accent: '#f97316',
    createModule: () => mkMod({ name: 'Magma / Lava', type: 'fluid', layerRole: 'base', blendMode: 'normal', colorCore: '#fef08a', colorMid: '#f97316', colorEdge: '#991b1b', speed: 85 }),
  },
  {
    id: 'air',
    label: 'Aire',
    desc: 'Corrientes de viento y ráfagas curvas',
    accent: '#e2e8f0',
    createModule: () => mkMod({ name: 'Corrientes de Aire', type: 'wind_streams', layerRole: 'extras', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#cbd5e1', colorEdge: '#64748b', speed: 120 }),
  },
  {
    id: 'dust',
    label: 'Polvo',
    desc: 'Polvo ascendente de suelo e impacto',
    accent: '#d6d3d1',
    createModule: () => mkMod({ name: 'Polvo de Suelo', type: 'dust_cloud', layerRole: 'smoke', blendMode: 'normal', colorCore: '#f5f5f4', colorMid: '#d6d3d1', colorEdge: '#78716c', offsetY: 14 }),
  },
  {
    id: 'sparks',
    label: 'Chispas',
    desc: 'Destellos rápidos y trazos de impacto',
    accent: '#facc15',
    createModule: () => mkMod({ name: 'Chispas Impacto', type: 'sparks', layerRole: 'sparks', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#fef08a', colorEdge: '#ef4444', speed: 135 }),
  },
  {
    id: 'particles',
    label: 'Partículas',
    desc: 'Motas flotantes, brasas o magia',
    accent: '#a855f7',
    createModule: () => mkMod({ name: 'Partículas Flotantes', type: 'particles', layerRole: 'particles', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#e879f9', colorEdge: '#7c3aed' }),
  },
  {
    id: 'smears',
    label: 'Smears',
    desc: 'Barridos cinéticos de golpe o espada',
    accent: '#fb7185',
    createModule: () => mkMod({ name: 'Smear de Velocidad', type: 'smear', layerRole: 'extras', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#fde047', colorEdge: '#f43f5e', angleDeg: 335 }),
  },
  {
    id: 'waves',
    label: 'Ondas',
    desc: 'Anillos expansivos de presión',
    accent: '#67e8f9',
    createModule: () => mkMod({ name: 'Onda Expansiva', type: 'waves', layerRole: 'glow', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#67e8f9', colorEdge: '#4f46e5', scale: 120 }),
  },
  {
    id: 'distortion',
    label: 'Distorsión',
    desc: 'Ondas de calor y refracción visual',
    accent: '#818cf8',
    createModule: () => mkMod({ name: 'Distorsión Calor', type: 'distortion', layerRole: 'distortion', blendMode: 'screen', colorCore: '#e0f2fe', colorMid: '#93c5fd', colorEdge: '#3b82f6' }),
  },
  {
    id: 'custom',
    label: 'Personalizados',
    desc: 'Núcleo libre de fuego/plasma configurable',
    accent: '#f472b6',
    createModule: () => mkMod({ name: 'Módulo Personalizado', type: 'fire_core', layerRole: 'base', blendMode: 'normal', colorCore: '#ffffff', colorMid: '#f472b6', colorEdge: '#7e22ce' }),
  },
];

export const FX_COMPONENT_LIB_CATEGORIES: { id: FxComponentLibraryCategory; label: string }[] = [
  { id: 'rocks', label: 'Rocas' },
  { id: 'dust', label: 'Polvo' },
  { id: 'sparks', label: 'Chispas' },
  { id: 'smoke', label: 'Humo' },
  { id: 'auras', label: 'Auras' },
  { id: 'waves', label: 'Ondas' },
  { id: 'smears', label: 'Smears' },
  { id: 'fluids', label: 'Fluidos' },
  { id: 'fragments', label: 'Fragmentos' },
];

const COMPONENT_LIB_STORAGE_KEY = 'pixelclash_fx_component_library_v1';

const DEFAULT_COMPONENT_LIBRARY: FxComponentLibraryItem[] = [
  {
    id: 'clib-rocks-1',
    name: 'Púas de Tierra Emergentes',
    category: 'rocks',
    description: 'Bloque de picos rocosos emergiendo desde grieta',
    createdAt: '2026-01-01T00:00:00.000Z',
    module: mkMod({ name: 'Púas de Tierra', type: 'ground_spikes', layerRole: 'rocks', blendMode: 'normal', colorCore: '#e7e5e4', colorMid: '#78716c', colorEdge: '#292524', offsetY: 8 }),
  },
  {
    id: 'clib-dust-1',
    name: 'Polvo de Aterrizaje / Poder',
    category: 'dust',
    description: 'Nube granular ascendente reutilizable en impactos o auras',
    createdAt: '2026-01-01T00:00:00.000Z',
    module: mkMod({ name: 'Polvo Ascendente', type: 'dust_cloud', layerRole: 'smoke', blendMode: 'normal', colorCore: '#f5f5f4', colorMid: '#d6d3d1', colorEdge: '#78716c', offsetY: 14 }),
  },
  {
    id: 'clib-sparks-1',
    name: 'Chispas Hit Spark Doradas',
    category: 'sparks',
    description: 'Destellos rápidos direccionales para combate',
    createdAt: '2026-01-01T00:00:00.000Z',
    module: mkMod({ name: 'Chispas Combate', type: 'sparks', layerRole: 'sparks', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#fde047', colorEdge: '#ef4444', speed: 140 }),
  },
  {
    id: 'clib-smoke-1',
    name: 'Humo Oscuro Abisal',
    category: 'smoke',
    description: 'Humo denso para sombras, explosiones o aura oscura',
    createdAt: '2026-01-01T00:00:00.000Z',
    module: mkMod({ name: 'Humo Oscuro', type: 'smoke', layerRole: 'smoke', blendMode: 'normal', colorCore: '#a855f7', colorMid: '#3b0764', colorEdge: '#09090b', scale: 118 }),
  },
  {
    id: 'clib-auras-1',
    name: 'Flama Aura Ki Dorada',
    category: 'auras',
    description: 'Silueta de aura flameante reutilizable',
    createdAt: '2026-01-01T00:00:00.000Z',
    module: mkMod({ name: 'Aura Ki Dorada', type: 'aura_shell', layerRole: 'base', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#fde047', colorEdge: '#f59e0b', scale: 112 }),
  },
  {
    id: 'clib-waves-1',
    name: 'Onda de Choque Cian',
    category: 'waves',
    description: 'Anillo expansivo para guard break, impacto o transformación',
    createdAt: '2026-01-01T00:00:00.000Z',
    module: mkMod({ name: 'Onda de Presión', type: 'waves', layerRole: 'glow', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#38bdf8', colorEdge: '#1d4ed8', scale: 122 }),
  },
  {
    id: 'clib-smears-1',
    name: 'Smear Curvo de Golpe',
    category: 'smears',
    description: 'Estela de puñetazo o corte rápido',
    createdAt: '2026-01-01T00:00:00.000Z',
    module: mkMod({ name: 'Smear Golpe', type: 'smear', layerRole: 'extras', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#38bdf8', colorEdge: '#4f46e5', angleDeg: 335 }),
  },
  {
    id: 'clib-fluids-1',
    name: 'Chorro Magma / Agua',
    category: 'fluids',
    description: 'Masa líquida animada lista para mezclar',
    createdAt: '2026-01-01T00:00:00.000Z',
    module: mkMod({ name: 'Salpicadura Fluida', type: 'fluid', layerRole: 'base', blendMode: 'normal', colorCore: '#fef08a', colorMid: '#f97316', colorEdge: '#991b1b' }),
  },
  {
    id: 'clib-fragments-1',
    name: 'Fragmentos en Desintegración',
    category: 'fragments',
    description: 'Esquirlas rocosas giratorias para explosiones o auras de poder',
    createdAt: '2026-01-01T00:00:00.000Z',
    module: mkMod({ name: 'Fragmentos Rocosos', type: 'fragments', layerRole: 'rocks', blendMode: 'normal', colorCore: '#e7e5e4', colorMid: '#78716c', colorEdge: '#292524', chaos: 65 }),
  },
];

export function loadFxComponentLibrary(): FxComponentLibraryItem[] {
  try {
    const raw = localStorage.getItem(COMPONENT_LIB_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore storage failures
  }
  return DEFAULT_COMPONENT_LIBRARY;
}

export function saveFxComponentLibrary(item: FxComponentLibraryItem): FxComponentLibraryItem[] {
  const existing = loadFxComponentLibrary();
  const next = [item, ...existing.filter((x) => x.id !== item.id)];
  try {
    localStorage.setItem(COMPONENT_LIB_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage failures
  }
  return next;
}

export function deleteFxComponentLibrary(id: string): FxComponentLibraryItem[] {
  const next = loadFxComponentLibrary().filter((x) => x.id !== id);
  try {
    localStorage.setItem(COMPONENT_LIB_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage failures
  }
  return next;
}

// =========================================================
// 6. GALERÍA DE EJEMPLOS FX (6 AURAS + 7 ATAQUES + 12 FIGHTING GAME FX = 25 EJEMPLOS REALES!)
// =========================================================
const earthAttackDefault = createEarthSpikesAttackPreset({ spikeCount: 4, heightScale: 108, widthScale: 100, emergeSpeed: 72, curvature: 20 });

export const FX_EXAMPLES_GALLERY: FxExampleEntry[] = [
  // ==================== AURAS (6) ====================
  {
    id: 'ex-aura-ki',
    name: 'Aura de Ki Clásica',
    category: 'auras',
    shortDesc: 'Flama ascendente de combate con núcleo dorado, ondulación, brillo y partículas ligeras.',
    inspiration: 'Transformaciones clásicas de artes marciales anime.',
    howBuilt: 'Usa el Editor de Auras con Energía Principal estilo Flamas + Ondulación ligera en Deformadores + Partículas y Distorsión ambiental.',
    componentsUsed: ['Energía principal', 'Ondulación', 'Brillo', 'Distorsión', 'Partículas ligeras'],
    layersUsed: ['Aura · Energía Principal', 'Aura · Ondas de Presión', 'Aura · Partículas', 'Aura · Distorsión Ambiental'],
    particlesSummary: 'Partículas doradas ascendentes con ligera oscilación lateral.',
    modifiersUsed: ['Ondulación 28%', 'Anchura Sup 68% / Inf 122%', 'Velocidad Visual 115%'],
    keyParamsToTweak: ['Anchura Superior/Inferior', 'Turbulencia', 'Colores Núcleo/Borde', 'Intensidad de Ondulación'],
    generationMethod: 'Editor de Auras + Deformadores (100% Manual)',
    recipe: {
      id: 'rec-aura-ki',
      name: 'Aura de Ki Clásica',
      source: 'aura',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      labFrameCount: 8,
      labAnimated: true,
      auraConfig: DEFAULT_AURA_CONFIG,
      deformers: { ...DEFAULT_FX_DEFORMERS, enabled: true, wave: 28, turbulence: 24, visualSpeed: 115 },
    },
  },
  {
    id: 'ex-aura-chakra',
    name: 'Aura de Chakra',
    category: 'auras',
    shortDesc: 'Flujo azul espiral con chispas finas, niebla energética y ondas de presión.',
    inspiration: 'Concentración de energía ninja con estela fluida.',
    howBuilt: 'Editor de Auras configurado en modo Espiral con niebla azulada, chispas rápidas y torsión visual en Deformadores.',
    componentsUsed: ['Flujo espiral', 'Chispas', 'Niebla energética', 'Ondas de presión'],
    layersUsed: ['Aura · Energía Principal (Espiral)', 'Aura · Polvo/Niebla', 'Aura · Chispas', 'Aura · Ondas de Presión'],
    particlesSummary: 'Chispas eléctricas cian + motas de chakra orbitando.',
    modifiersUsed: ['Torsión 26%', 'Turbulencia 40%', 'Flujo 55%'],
    keyParamsToTweak: ['Estilo de Núcleo (Espiral)', 'Torsión', 'Intensidad de Chispas'],
    generationMethod: 'Editor de Auras (Chakra) + Torsión',
    recipe: {
      id: 'rec-aura-chakra',
      name: 'Aura de Chakra',
      source: 'aura',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      labFrameCount: 8,
      labAnimated: true,
      auraConfig: {
        ...DEFAULT_AURA_CONFIG,
        auraType: 'chakra',
        coreStyle: 'spiral',
        colorCore: '#ecfeff',
        colorMid: '#38bdf8',
        colorEdge: '#2563eb',
        components: {
          wind: { enabled: true, intensity: 45, color: '#bae6fd' },
          rocks: { enabled: false, intensity: 40, color: '#64748b' },
          sparks: { enabled: true, intensity: 78, color: '#7dd3fc' },
          smoke: { enabled: true, intensity: 58, color: '#1d4ed8' },
          particles: { enabled: true, intensity: 64, color: '#e0f2fe' },
          fragments: { enabled: false, intensity: 40, color: '#94a3b8' },
          waves: { enabled: true, intensity: 74, color: '#38bdf8' },
          ambientDistortion: { enabled: true, intensity: 45, color: '#bae6fd' },
        },
      },
      deformers: { ...DEFAULT_FX_DEFORMERS, enabled: true, twist: 26, flow: 55 },
    },
  },
  {
    id: 'ex-aura-air',
    name: 'Aura de Aire',
    category: 'auras',
    shortDesc: 'Corrientes de viento ascendentes con polvo, hojas y distorsión atmosférica sin flama energética.',
    inspiration: 'Guerreros del viento y saltos supersónicos.',
    howBuilt: 'Energía principal desactivada; construida combinando Corrientes de Viento + Polvo + Hojas (Partículas verdes) + Distorsión y Vórtice suave.',
    componentsUsed: ['Corrientes de viento', 'Polvo', 'Hojas', 'Distorsión'],
    layersUsed: ['Aura · Corrientes de Viento', 'Aura · Polvo / Humo', 'Aura · Partículas (Hojas)', 'Aura · Distorsión Ambiental'],
    particlesSummary: 'Hojas verdes planeando + polvo fino arrastrado hacia arriba.',
    modifiersUsed: ['Vórtice 24%', 'Ondulación 32%', 'Sin Energía Visible'],
    keyParamsToTweak: ['Toggle Energía Visible', 'Intensidad de Viento', 'Vórtice'],
    generationMethod: 'Editor de Auras (Sin Energía) + Vórtice',
    recipe: {
      id: 'rec-aura-air',
      name: 'Aura de Aire',
      source: 'aura',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      labFrameCount: 8,
      labAnimated: true,
      auraConfig: {
        ...ENERGY_LESS_POWER_AURA,
        auraType: 'elemental',
        showCoreEnergy: false,
        components: {
          wind: { enabled: true, intensity: 95, color: '#f8fafc' },
          rocks: { enabled: false, intensity: 40, color: '#78716c' },
          sparks: { enabled: false, intensity: 30, color: '#ffffff' },
          smoke: { enabled: true, intensity: 68, color: '#d6d3d1' },
          particles: { enabled: true, intensity: 82, color: '#4ade80' },
          fragments: { enabled: false, intensity: 30, color: '#a8a29e' },
          waves: { enabled: true, intensity: 60, color: '#e2e8f0' },
          ambientDistortion: { enabled: true, intensity: 72, color: '#cbd5e1' },
        },
      },
      deformers: { ...DEFAULT_FX_DEFORMERS, enabled: true, vortex: 24, wave: 32 },
    },
  },
  {
    id: 'ex-aura-power',
    name: 'Aura de Poder (Sin Energía Visible)',
    category: 'auras',
    shortDesc: 'Presión pura de poder: rocas levitando, fragmentos desintegrándose, polvo ascendente y distorsión de calor.',
    inspiration: 'Transformaciones épicas tipo anime donde el entorno reacciona antes de encender el aura.',
    howBuilt: 'Desactiva "Energía Principal" en el Editor de Auras y activa Rocas Suspendidas + Fragmentos + Polvo + Corrientes de Viento + Distorsión de Calor.',
    componentsUsed: ['Rocas suspendidas', 'Fragmentos', 'Polvo ascendente', 'Distorsión de calor', 'Corrientes de aire'],
    layersUsed: ['Aura · Rocas Suspendidas', 'Aura · Fragmentos', 'Aura · Polvo', 'Aura · Corrientes de Viento', 'Aura · Distorsión Ambiental'],
    particlesSummary: 'Polvo fino y esquirlas rocosas elevándose contra la gravedad.',
    modifiersUsed: ['Sin Energía Visible', 'Distorsión 36%', 'Agitación 42%'],
    keyParamsToTweak: ['Cantidad de Rocas', 'Fragmentos', 'Distorsión de Calor', 'Velocidad Visual'],
    generationMethod: 'Editor de Auras (Presión Ambiental Pura)',
    recipe: {
      id: 'rec-aura-power',
      name: 'Aura de Poder (Sin Energía)',
      source: 'aura',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      labFrameCount: 8,
      labAnimated: true,
      auraConfig: ENERGY_LESS_POWER_AURA,
      deformers: { ...DEFAULT_FX_DEFORMERS, enabled: true, distortion: 36, agitation: 42 },
    },
  },
  {
    id: 'ex-aura-dark',
    name: 'Aura Oscura',
    category: 'auras',
    shortDesc: 'Niebla abisal púrpura y negra con humo espeso, partículas oscuras y distorsión sombría.',
    inspiration: 'Jefes finales, energía maldita y corrupción.',
    howBuilt: 'Aura estilo Niebla con paleta púrpura profunda + Humo negro denso + Partículas sombrías + Turbulencia alta.',
    componentsUsed: ['Humo', 'Sombras', 'Partículas negras', 'Distorsión visual'],
    layersUsed: ['Aura · Energía Oscura', 'Aura · Humo Abisal', 'Aura · Partículas Negras', 'Aura · Distorsión'],
    particlesSummary: 'Partículas oscuras flotantes y jirones de sombra.',
    modifiersUsed: ['Turbulencia 58%', 'Ruido 32%', 'Distorsión 40%'],
    keyParamsToTweak: ['Paleta Oscura', 'Humo', 'Turbulencia'],
    generationMethod: 'Editor de Auras + Turbulencia',
    recipe: {
      id: 'rec-aura-dark',
      name: 'Aura Oscura',
      source: 'aura',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      labFrameCount: 8,
      labAnimated: true,
      auraConfig: {
        ...DEFAULT_AURA_CONFIG,
        auraType: 'custom',
        coreStyle: 'mist',
        colorCore: '#d8b4fe',
        colorMid: '#581c87',
        colorEdge: '#09090b',
        turbulence: 72,
        components: {
          wind: { enabled: false, intensity: 40, color: '#6b21a8' },
          rocks: { enabled: false, intensity: 30, color: '#18181b' },
          sparks: { enabled: false, intensity: 30, color: '#c084fc' },
          smoke: { enabled: true, intensity: 92, color: '#18181b' },
          particles: { enabled: true, intensity: 85, color: '#27272a' },
          fragments: { enabled: true, intensity: 60, color: '#3b0764' },
          waves: { enabled: true, intensity: 50, color: '#7e22ce' },
          ambientDistortion: { enabled: true, intensity: 76, color: '#a855f7' },
        },
      },
      deformers: { ...DEFAULT_FX_DEFORMERS, enabled: true, turbulence: 58, noise: 32, distortion: 40 },
    },
  },
  {
    id: 'ex-aura-sacred',
    name: 'Aura Sagrada',
    category: 'auras',
    shortDesc: 'Rayos de luz vertical dorados con partículas luminosas y ondas suaves.',
    inspiration: 'Curación divina, paladines y super ataques celestiales.',
    howBuilt: 'Aura espiritual en modo Rayos con brillo blanco-dorado, partículas ascendentes y ondas suaves.',
    componentsUsed: ['Rayos de luz', 'Partículas brillantes', 'Ondas suaves'],
    layersUsed: ['Aura · Rayos Sagrados', 'Aura · Partículas Luminosas', 'Aura · Ondas Suaves'],
    particlesSummary: 'Destellos suaves blancos y dorados elevándose en calma.',
    modifiersUsed: ['Anchura Sup 115%', 'Velocidad Visual 80%', 'Expansión 18%'],
    keyParamsToTweak: ['Anchura Superior', 'Velocidad', 'Intensidad de Ondas'],
    generationMethod: 'Editor de Auras (Espiritual · Rayos)',
    recipe: {
      id: 'rec-aura-sacred',
      name: 'Aura Sagrada',
      source: 'aura',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      labFrameCount: 8,
      labAnimated: true,
      auraConfig: {
        ...DEFAULT_AURA_CONFIG,
        auraType: 'spiritual',
        coreStyle: 'rays',
        colorCore: '#ffffff',
        colorMid: '#fef08a',
        colorEdge: '#38bdf8',
        topWidth: 115,
        midWidth: 96,
        bottomWidth: 105,
        turbulence: 22,
        speed: 82,
        components: {
          wind: { enabled: false, intensity: 25, color: '#ffffff' },
          rocks: { enabled: false, intensity: 20, color: '#78716c' },
          sparks: { enabled: true, intensity: 52, color: '#ffffff' },
          smoke: { enabled: false, intensity: 20, color: '#fef9c3' },
          particles: { enabled: true, intensity: 90, color: '#fef08a' },
          fragments: { enabled: false, intensity: 20, color: '#fde047' },
          waves: { enabled: true, intensity: 76, color: '#fef9c3' },
          ambientDistortion: { enabled: false, intensity: 25, color: '#ffffff' },
        },
      },
    },
  },

  // ==================== TIPOS DE ATAQUES (7) ====================
  {
    id: 'ex-atk-earth-spikes',
    name: 'Ataque de Rocas Ascendentes',
    category: 'attacks',
    shortDesc: 'Picos y pilares de roca emergiendo en secuencia desde el suelo agrietado con fragmentos y polvo.',
    inspiration: 'Ataques elementales de tierra en juegos de pelea y RPG de acción.',
    howBuilt: 'Editor de Rocas y Púas con modo Emergencia activo: Suelo agrietado + Púas escalonadas + Pilar central + Rocas y Fragmentos proyectados.',
    componentsUsed: ['Suelo', 'Grietas', 'Pilares', 'Púas emergentes', 'Fragmentos', 'Polvo'],
    layersUsed: ['Base · Suelo Agrietado', 'Rocas · Púas y Pilares', 'Extras · Fragmentos Desprendidos'],
    particlesSummary: 'Fragmentos y rocas pequeñas lanzadas al emerger las púas.',
    modifiersUsed: ['Modo Emergencia escalonada', 'Curvatura +20°', 'Gravedad 52%'],
    keyParamsToTweak: ['Altura', 'Anchura', 'Cantidad de Púas', 'Velocidad de aparición', 'Curvatura'],
    generationMethod: 'Editor de Rocas y Púas (100% Editable Pieza por Pieza)',
    recipe: {
      id: 'rec-atk-earth-spikes',
      name: 'Ataque de Rocas Ascendentes',
      source: 'rocks',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      labFrameCount: 8,
      labAnimated: true,
      rockPieces: earthAttackDefault.pieces,
      rockClusters: earthAttackDefault.clusters,
    },
  },
  {
    id: 'ex-atk-energy-fist',
    name: 'Puño de Energía',
    category: 'attacks',
    shortDesc: 'Golpe cargado con estela direccional, smear cinético, chispas intensas y onda de impacto.',
    inspiration: 'Golpes especiales EX y uppercuts cargados de energía.',
    howBuilt: 'Constructor FX combinando 4 módulos: Smear curvo + Brillo central + Onda expansiva + Chispas balísticas.',
    componentsUsed: ['Estela', 'Smear', 'Chispas', 'Onda de impacto'],
    layersUsed: ['Base · Smear de Golpe', 'Brillo · Núcleo Puño', 'Ondas · Onda Impacto', 'Chispas · Destellos'],
    particlesSummary: 'Chispas rápidas proyectadas hacia el frente del golpe.',
    modifiersUsed: ['Dirección 350°', 'Intensidad 92%', 'Fusión Pantalla'],
    keyParamsToTweak: ['Ángulo del Smear', 'Escala de Onda', 'Paleta de Energía'],
    generationMethod: 'Constructor FX Modular (4 capas)',
    recipe: {
      id: 'rec-atk-energy-fist',
      name: 'Puño de Energía',
      source: 'lab',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      labFrameCount: 6,
      labAnimated: true,
      labLayerMode: 'per_component',
      labModules: [
        mkMod({ name: 'Smear de Puño', type: 'smear', layerRole: 'base', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#38bdf8', colorEdge: '#1d4ed8', angleDeg: 350, scale: 112, intensity: 95 }),
        mkMod({ name: 'Núcleo Impacto', type: 'glow', layerRole: 'glow', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#7dd3fc', colorEdge: '#2563eb', offsetX: 16, scale: 82 }),
        mkMod({ name: 'Onda de Impacto', type: 'waves', layerRole: 'glow', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#bae6fd', colorEdge: '#3b82f6', offsetX: 18, scale: 95 }),
        mkMod({ name: 'Chispas Golpe', type: 'sparks', layerRole: 'sparks', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#fde047', colorEdge: '#38bdf8', offsetX: 12, angleDeg: 0, speed: 145 }),
      ],
    },
  },
  {
    id: 'ex-atk-ki-wave',
    name: 'Ola de Ki (Beam / Kame)',
    category: 'attacks',
    shortDesc: 'Rayo de energía masivo con núcleo incandescente, bordes vibrantes, distorsión y brillos.',
    inspiration: 'Super proyectiles de haz continuo tipo arcade.',
    howBuilt: 'Constructor FX con Núcleo lineal + Brillo envolvente + Distorsión + Chispas, moldeado con Morfología (Anchura Superior/Inferior y Longitud).',
    componentsUsed: ['Núcleo energético', 'Bordes', 'Distorsión', 'Brillos'],
    layersUsed: ['Base · Haz Principal', 'Brillo · Bordes Ki', 'Distorsión · Refracción', 'Chispas · Descargas'],
    particlesSummary: 'Chispas y destellos escapando a lo largo del haz.',
    modifiersUsed: ['Longitud 145%', 'Anchura Sup 118% / Inf 85%', 'Ondulación 22%'],
    keyParamsToTweak: ['Anchura Superior', 'Anchura Inferior', 'Longitud', 'Intensidad'],
    generationMethod: 'Constructor FX + Editor de Morfología',
    recipe: {
      id: 'rec-atk-ki-wave',
      name: 'Ola de Ki',
      source: 'lab',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      labFrameCount: 8,
      labAnimated: true,
      labLayerMode: 'per_component',
      labModules: [
        mkMod({ name: 'Bordes Ki', type: 'fire_core', layerRole: 'base', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#38bdf8', colorEdge: '#1d4ed8', angleDeg: 0, scale: 118, chaos: 28 }),
        mkMod({ name: 'Núcleo Haz', type: 'smear', layerRole: 'glow', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#bae6fd', colorEdge: '#0284c7', angleDeg: 0, scale: 125, intensity: 96, chaos: 12 }),
        mkMod({ name: 'Distorsión Haz', type: 'distortion', layerRole: 'distortion', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#7dd3fc', colorEdge: '#2563eb', scale: 115 }),
        mkMod({ name: 'Brillos Laterales', type: 'sparks', layerRole: 'sparks', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#e0f2fe', colorEdge: '#38bdf8', angleDeg: 0, speed: 150 }),
      ],
      morphology: { ...DEFAULT_FX_MORPHOLOGY, enabled: true, width: 125, topWidth: 118, bottomWidth: 85, length: 145 },
      deformers: { ...DEFAULT_FX_DEFORMERS, enabled: true, wave: 22, flow: 60, directionDeg: 0 },
    },
  },
  {
    id: 'ex-atk-plasma',
    name: 'Ataque de Plasma',
    category: 'attacks',
    shortDesc: 'Energía central violeta ionizada con arcos eléctricos, partículas y explosión.',
    howBuilt: 'Fusión modular de Núcleo de plasma + Electricidad ramificada + Partículas ionizadas + Onda explosiva.',
    componentsUsed: ['Energía central', 'Electricidad', 'Partículas', 'Explosión'],
    layersUsed: ['Base · Núcleo Plasma', 'Chispas · Rayos', 'Partículas · Iones', 'Brillo · Explosión'],
    particlesSummary: 'Motas magenta y blanco de plasma inestable.',
    modifiersUsed: ['Caos 55%', 'Velocidad 130%', 'Fusión Pantalla'],
    keyParamsToTweak: ['Densidad de Rayos', 'Colores Plasma', 'Escala Explosión'],
    generationMethod: 'Constructor FX Modular (Híbrido)',
    recipe: {
      id: 'rec-atk-plasma',
      name: 'Ataque de Plasma',
      source: 'lab',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      labFrameCount: 8,
      labAnimated: true,
      labLayerMode: 'per_component',
      labModules: [
        mkMod({ name: 'Explosión Plasma', type: 'fire_core', layerRole: 'base', blendMode: 'normal', colorCore: '#ffffff', colorMid: '#e879f9', colorEdge: '#6b21a8', scale: 105 }),
        mkMod({ name: 'Electricidad Arcos', type: 'lightning', layerRole: 'sparks', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#f0abfc', colorEdge: '#9333ea', scale: 120, speed: 135 }),
        mkMod({ name: 'Partículas Iónicas', type: 'particles', layerRole: 'particles', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#f472b6', colorEdge: '#7e22ce', density: 82 }),
        mkMod({ name: 'Onda Choque', type: 'waves', layerRole: 'glow', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#e879f9', colorEdge: '#4c1d95', scale: 120 }),
      ],
    },
  },
  {
    id: 'ex-atk-meteor-rain',
    name: 'Lluvia de Meteoritos',
    category: 'attacks',
    shortDesc: 'Rocas ardientes cayendo en diagonal con estela de fuego, humo denso e impactos.',
    howBuilt: 'Combina Humo diagonal + Fuego incandescente + Fragmentos de roca en ángulo 55° + Chispas de impacto.',
    componentsUsed: ['Rocas', 'Fuego', 'Humo', 'Impactos'],
    layersUsed: ['Humo · Estela', 'Base · Fuego Meteoro', 'Rocas · Meteoritos', 'Chispas · Impacto'],
    particlesSummary: 'Rocas proyectadas y brasas en caída diagonal.',
    modifiersUsed: ['Ángulo 55°', 'Caos 60%', 'Velocidad 125%'],
    keyParamsToTweak: ['Ángulo de Caída', 'Densidad de Rocas', 'Escala de Fuego'],
    generationMethod: 'Constructor FX Modular',
    recipe: {
      id: 'rec-atk-meteor-rain',
      name: 'Lluvia de Meteoritos',
      source: 'lab',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      labFrameCount: 8,
      labAnimated: true,
      labLayerMode: 'per_component',
      labModules: [
        mkMod({ name: 'Humo Estela', type: 'smoke', layerRole: 'smoke', blendMode: 'normal', colorCore: '#94a3b8', colorMid: '#475569', colorEdge: '#1e293b', angleDeg: 235, offsetX: -6, offsetY: -8 }),
        mkMod({ name: 'Fuego Meteoro', type: 'fire_core', layerRole: 'base', blendMode: 'normal', colorCore: '#fffbeb', colorMid: '#facc15', colorEdge: '#ea580c', angleDeg: 55, scale: 95 }),
        mkMod({ name: 'Rocas Ardientes', type: 'fragments', layerRole: 'rocks', blendMode: 'normal', colorCore: '#fde68a', colorMid: '#78716c', colorEdge: '#292524', angleDeg: 55, speed: 125, chaos: 58 }),
        mkMod({ name: 'Impactos Suelo', type: 'sparks', layerRole: 'sparks', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#fde047', colorEdge: '#dc2626', offsetY: 16, angleDeg: 270 }),
      ],
    },
  },
  {
    id: 'ex-atk-energy-whip',
    name: 'Látigo de Energía',
    category: 'attacks',
    shortDesc: 'Trazo energético flexible con segmentos luminosos, electricidad y smear curvo.',
    howBuilt: 'Smear curvo largo + Arcos de electricidad siguiendo el mismo ángulo + Ondulación y Curvatura en Deformadores.',
    componentsUsed: ['Trazo principal', 'Segmentos', 'Electricidad', 'Smear'],
    layersUsed: ['Base · Smear Látigo', 'Chispas · Electricidad', 'Partículas · Segmentos'],
    particlesSummary: 'Chispas y nodos luminosos a lo largo de la curva.',
    modifiersUsed: ['Ondulación 42%', 'Curvatura +35%', 'Longitud 125%'],
    keyParamsToTweak: ['Curvatura', 'Ondulación', 'Grosor del Smear'],
    generationMethod: 'Constructor FX + Deformador Ondulación',
    recipe: {
      id: 'rec-atk-energy-whip',
      name: 'Látigo de Energía',
      source: 'lab',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      labFrameCount: 6,
      labAnimated: true,
      labLayerMode: 'per_component',
      labModules: [
        mkMod({ name: 'Trazo Látigo', type: 'smear', layerRole: 'base', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#f472b6', colorEdge: '#9333ea', angleDeg: 10, scale: 125, intensity: 95 }),
        mkMod({ name: 'Electricidad Segmentos', type: 'lightning', layerRole: 'sparks', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#f9a8d4', colorEdge: '#a855f7', angleDeg: 10, scale: 118 }),
        mkMod({ name: 'Destellos Punta', type: 'sparks', layerRole: 'sparks', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#fde047', colorEdge: '#ec4899', offsetX: 22, angleDeg: 0 }),
      ],
      deformers: { ...DEFAULT_FX_DEFORMERS, enabled: true, wave: 42, curvature: 35, visualSpeed: 135 },
    },
  },
  {
    id: 'ex-atk-tornado',
    name: 'Tornado',
    category: 'attacks',
    shortDesc: 'Embudo giratorio combinando fluido/viento, polvo ascendente, escombros y ondas.',
    howBuilt: 'Corrientes de aire + Polvo + Escombros + Ondas moldeados con Morfología de embudo (Anchura Sup 165% / Inf 42%) y Deformador Vórtice.',
    componentsUsed: ['Fluido / Viento', 'Polvo', 'Escombros', 'Ondas'],
    layersUsed: ['Base · Corrientes Aire', 'Humo · Polvo Embudo', 'Rocas · Escombros', 'Brillo · Ondas'],
    particlesSummary: 'Escombros y polvo atrapados en el remolino.',
    modifiersUsed: ['Anchura Sup 165% / Inf 42%', 'Vórtice 64%', 'Torsión 45%'],
    keyParamsToTweak: ['Anchura Superior/Inferior', 'Vórtice', 'Torsión', 'Velocidad'],
    generationMethod: 'Constructor FX + Morfología Embudo + Vórtice',
    recipe: {
      id: 'rec-atk-tornado',
      name: 'Tornado',
      source: 'lab',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      labFrameCount: 8,
      labAnimated: true,
      labLayerMode: 'per_component',
      labModules: [
        mkMod({ name: 'Polvo Embudo', type: 'dust_cloud', layerRole: 'smoke', blendMode: 'normal', colorCore: '#e2e8f0', colorMid: '#94a3b8', colorEdge: '#475569', scale: 118, offsetY: 4 }),
        mkMod({ name: 'Viento Espiral', type: 'wind_streams', layerRole: 'base', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#cbd5e1', colorEdge: '#64748b', scale: 120, speed: 140 }),
        mkMod({ name: 'Escombros Remolino', type: 'fragments', layerRole: 'rocks', blendMode: 'normal', colorCore: '#d6d3d1', colorMid: '#78716c', colorEdge: '#292524', chaos: 75 }),
        mkMod({ name: 'Ondas Base', type: 'waves', layerRole: 'glow', blendMode: 'screen', colorCore: '#f8fafc', colorMid: '#cbd5e1', colorEdge: '#475569', offsetY: 18, scale: 85 }),
      ],
      morphology: { ...DEFAULT_FX_MORPHOLOGY, enabled: true, topWidth: 165, midWidth: 96, bottomWidth: 42, overallHeight: 118 },
      deformers: { ...DEFAULT_FX_DEFORMERS, enabled: true, vortex: 64, twist: 45, visualSpeed: 145 },
    },
  },

  // ==================== FIGHTING GAME FX (12) ====================
  {
    id: 'ex-fg-hit-sparks',
    name: 'Hit Sparks',
    category: 'fighting',
    shortDesc: 'Destello clásico de impacto directo en 4–6 frames con cruz brillante y chispas.',
    howBuilt: 'Núcleo de impacto brillante + Anillo rápido + Chispas radiales en 5 frames rápidos.',
    componentsUsed: ['Brillo central', 'Onda rápida', 'Chispas balísticas'],
    layersUsed: ['Brillo · Flash', 'Ondas · Anillo', 'Chispas · Hit Sparks'],
    particlesSummary: 'Chispas explosivas de alta velocidad con estela corta.',
    modifiersUsed: ['Velocidad 155%', 'Intensidad 96%', 'Fusión Pantalla'],
    keyParamsToTweak: ['Escala', 'Cantidad de Chispas', 'Paleta de Impacto'],
    generationMethod: 'Constructor FX · Fighting Game Preset',
    recipe: {
      id: 'rec-fg-hit-sparks',
      name: 'Hit Sparks',
      source: 'lab',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      labFrameCount: 5,
      labAnimated: true,
      labModules: [
        mkMod({ name: 'Flash Impacto', type: 'glow', layerRole: 'glow', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#fde047', colorEdge: '#f97316', scale: 76, intensity: 98 }),
        mkMod({ name: 'Anillo Golpe', type: 'waves', layerRole: 'glow', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#fb7185', colorEdge: '#e11d48', scale: 105, speed: 150 }),
        mkMod({ name: 'Chispas Hit', type: 'sparks', layerRole: 'sparks', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#fef08a', colorEdge: '#ef4444', scale: 122, density: 85, speed: 155 }),
      ],
    },
  },
  {
    id: 'ex-fg-block-sparks',
    name: 'Block Sparks',
    category: 'fighting',
    shortDesc: 'Escudo defensivo azul-cian con anillos concéntricos y chispas frías de bloqueo.',
    howBuilt: 'Onda defensiva azul + Brillo limpio + Chispas direccionales hacia atrás.',
    componentsUsed: ['Escudo de ondas', 'Brillo cian', 'Chispas defensivas'],
    layersUsed: ['Ondas · Escudo', 'Brillo · Flash Bloqueo', 'Chispas · Rebote'],
    particlesSummary: 'Chispas cian rebotando desde el punto de guardia.',
    modifiersUsed: ['Paleta Azul/Cian', 'Baja Turbulencia', 'Contraste Arcade'],
    keyParamsToTweak: ['Escala de Onda', 'Ángulo de Rebote', 'Colores de Guardia'],
    generationMethod: 'Constructor FX · Fighting Game Preset',
    recipe: {
      id: 'rec-fg-block-sparks',
      name: 'Block Sparks',
      source: 'lab',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      labFrameCount: 5,
      labAnimated: true,
      labModules: [
        mkMod({ name: 'Anillo Bloqueo', type: 'waves', layerRole: 'base', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#38bdf8', colorEdge: '#1d4ed8', scale: 102, density: 75, chaos: 8 }),
        mkMod({ name: 'Flash Guardia', type: 'glow', layerRole: 'glow', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#bae6fd', colorEdge: '#0284c7', scale: 68 }),
        mkMod({ name: 'Chispas Rebote', type: 'sparks', layerRole: 'sparks', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#7dd3fc', colorEdge: '#2563eb', angleDeg: 180, speed: 140 }),
      ],
    },
  },
  {
    id: 'ex-fg-counter-hit',
    name: 'Counter Hit',
    category: 'fighting',
    shortDesc: 'Impacto crítico masivo rojo-dorado con rayos, smear radial y doble onda de choque.',
    howBuilt: 'Flash carmesí + Smear radial + Descargas + Chispas de alta intensidad para resaltar un Counter.',
    componentsUsed: ['Flash crítico', 'Smear radial', 'Rayos', 'Doble onda'],
    layersUsed: ['Base · Flash Crítico', 'Extras · Smear', 'Chispas · Rayos', 'Ondas · Choque'],
    particlesSummary: 'Rayos y destellos radiales explosivos.',
    modifiersUsed: ['Expansión 32%', 'Intensidad 100%', 'Velocidad 160%'],
    keyParamsToTweak: ['Expansión', 'Paleta Rojo/Oro', 'Densidad de Rayos'],
    generationMethod: 'Constructor FX + Expansión',
    recipe: {
      id: 'rec-fg-counter-hit',
      name: 'Counter Hit',
      source: 'lab',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      labFrameCount: 6,
      labAnimated: true,
      labModules: [
        mkMod({ name: 'Núcleo Counter', type: 'fire_core', layerRole: 'base', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#fde047', colorEdge: '#dc2626', scale: 108 }),
        mkMod({ name: 'Ondas Críticas', type: 'waves', layerRole: 'glow', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#fb7185', colorEdge: '#991b1b', scale: 135, density: 85 }),
        mkMod({ name: 'Arcos Críticos', type: 'lightning', layerRole: 'sparks', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#fef08a', colorEdge: '#ef4444', scale: 128 }),
        mkMod({ name: 'Chispas Counter', type: 'sparks', layerRole: 'sparks', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#fde047', colorEdge: '#b91c1c', speed: 165, density: 92 }),
      ],
      deformers: { ...DEFAULT_FX_DEFORMERS, enabled: true, expansion: 32 },
    },
  },
  {
    id: 'ex-fg-guard-break',
    name: 'Guard Break',
    category: 'fighting',
    shortDesc: 'Ruptura de escudo cristalino con fragmentos proyectados, onda expansiva y destello.',
    howBuilt: 'Fragmentos cristalinos cian/violeta explotando + Onda expansiva + Chispas de fractura.',
    componentsUsed: ['Fragmentos de escudo', 'Onda de ruptura', 'Destello', 'Chispas'],
    layersUsed: ['Rocas · Cristales Escudo', 'Ondas · Ruptura', 'Chispas · Fractura'],
    particlesSummary: 'Esquirlas de escudo volando en todas direcciones.',
    modifiersUsed: ['Caos 70%', 'Velocidad 135%', 'Contorno nítido'],
    keyParamsToTweak: ['Cantidad de Fragmentos', 'Color de Escudo', 'Velocidad de Estallido'],
    generationMethod: 'Constructor FX · Guard Break',
    recipe: {
      id: 'rec-fg-guard-break',
      name: 'Guard Break',
      source: 'lab',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      labFrameCount: 6,
      labAnimated: true,
      labModules: [
        mkMod({ name: 'Onda Ruptura', type: 'waves', layerRole: 'glow', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#38bdf8', colorEdge: '#7c3aed', scale: 128 }),
        mkMod({ name: 'Fragmentos Escudo', type: 'fragments', layerRole: 'rocks', blendMode: 'normal', colorCore: '#f0f9ff', colorMid: '#38bdf8', colorEdge: '#1e3a8a', density: 86, speed: 135, chaos: 72 }),
        mkMod({ name: 'Chispas Ruptura', type: 'sparks', layerRole: 'sparks', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#e879f9', colorEdge: '#38bdf8', speed: 150 }),
      ],
    },
  },
  {
    id: 'ex-fg-super-aura',
    name: 'Super Move Aura',
    category: 'fighting',
    shortDesc: 'Activación de Super / EX con pilar energético, rayos eléctricos, viento y ondas.',
    howBuilt: 'Editor de Auras en modo Pilar con chispas intensas, corrientes de viento, partículas y ondas de choque.',
    componentsUsed: ['Pilar de energía', 'Chispas', 'Viento', 'Ondas', 'Distorsión'],
    layersUsed: ['Aura · Pilar Super', 'Aura · Corrientes Aire', 'Aura · Chispas', 'Aura · Ondas'],
    particlesSummary: 'Chispas y partículas neón ascendiendo a gran velocidad.',
    modifiersUsed: ['Altura 135%', 'Velocidad 150%', 'Agitación 35%'],
    keyParamsToTweak: ['Altura', 'Colores EX/Super', 'Velocidad'],
    generationMethod: 'Editor de Auras (Super Move)',
    recipe: {
      id: 'rec-fg-super-aura',
      name: 'Super Move Aura',
      source: 'aura',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      labFrameCount: 8,
      labAnimated: true,
      auraConfig: {
        ...DEFAULT_AURA_CONFIG,
        auraType: 'elemental',
        coreStyle: 'pillar',
        colorCore: '#ffffff',
        colorMid: '#22d3ee',
        colorEdge: '#6366f1',
        topWidth: 118,
        midWidth: 112,
        bottomWidth: 138,
        height: 135,
        speed: 150,
        components: {
          wind: { enabled: true, intensity: 82, color: '#e0f2fe' },
          rocks: { enabled: false, intensity: 40, color: '#64748b' },
          sparks: { enabled: true, intensity: 92, color: '#fef08a' },
          smoke: { enabled: false, intensity: 30, color: '#94a3b8' },
          particles: { enabled: true, intensity: 86, color: '#67e8f9' },
          fragments: { enabled: false, intensity: 30, color: '#94a3b8' },
          waves: { enabled: true, intensity: 88, color: '#38bdf8' },
          ambientDistortion: { enabled: true, intensity: 65, color: '#a5f3fc' },
        },
      },
    },
  },
  {
    id: 'ex-fg-dash-smoke',
    name: 'Dash Smoke',
    category: 'fighting',
    shortDesc: 'Estela rápida de humo y líneas de viento al iniciar una carrera o backdash.',
    howBuilt: 'Polvo de suelo + Humo orientado hacia atrás (180°) + Líneas rápidas de aire.',
    componentsUsed: ['Polvo direccional', 'Humo rápido', 'Corrientes de aire'],
    layersUsed: ['Humo · Estela Dash', 'Extras · Líneas Aire'],
    particlesSummary: 'Bocanadas rápidas disipándose hacia atrás.',
    modifiersUsed: ['Dirección 180°', 'Velocidad 135%', 'Altura Compacta'],
    keyParamsToTweak: ['Dirección (Izq/Der)', 'Densidad de Polvo', 'Escala'],
    generationMethod: 'Constructor FX · Dash',
    recipe: {
      id: 'rec-fg-dash-smoke',
      name: 'Dash Smoke',
      source: 'lab',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      labFrameCount: 6,
      labAnimated: true,
      labModules: [
        mkMod({ name: 'Humo Dash', type: 'smoke', layerRole: 'smoke', blendMode: 'normal', colorCore: '#f8fafc', colorMid: '#cbd5e1', colorEdge: '#64748b', angleDeg: 180, offsetY: 16, scale: 95, speed: 135 }),
        mkMod({ name: 'Líneas Velocidad', type: 'wind_streams', layerRole: 'extras', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#e2e8f0', colorEdge: '#94a3b8', angleDeg: 180, offsetY: 10, scale: 112, speed: 145 }),
      ],
    },
  },
  {
    id: 'ex-fg-landing-dust',
    name: 'Landing Dust',
    category: 'fighting',
    shortDesc: 'Nube simétrica de polvo y pequeñas piedritas al aterrizar de un salto.',
    howBuilt: 'Polvo bajo en base del lienzo + Fragmentos diminutos de grava + Morfología ancha y baja.',
    componentsUsed: ['Polvo lateral', 'Grava / Fragmentos', 'Onda sutil'],
    layersUsed: ['Humo · Polvo Aterrizaje', 'Rocas · Grava'],
    particlesSummary: 'Grava pequeña y polvo abriéndose lateralmente.',
    modifiersUsed: ['Anchura 138%', 'Altura 62%', 'Offset Y +22%'],
    keyParamsToTweak: ['Anchura', 'Offset Vertical', 'Color del Terreno'],
    generationMethod: 'Constructor FX + Morfología Baja',
    recipe: {
      id: 'rec-fg-landing-dust',
      name: 'Landing Dust',
      source: 'lab',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      labFrameCount: 6,
      labAnimated: true,
      labModules: [
        mkMod({ name: 'Polvo Suelo', type: 'dust_cloud', layerRole: 'smoke', blendMode: 'normal', colorCore: '#f5f5f4', colorMid: '#d6d3d1', colorEdge: '#78716c', offsetY: 22, scale: 112, density: 80 }),
        mkMod({ name: 'Grava Suelo', type: 'fragments', layerRole: 'rocks', blendMode: 'normal', colorCore: '#e7e5e4', colorMid: '#a8a29e', colorEdge: '#44403c', offsetY: 24, scale: 68, density: 42 }),
      ],
      morphology: { ...DEFAULT_FX_MORPHOLOGY, enabled: true, width: 138, height: 68 },
    },
  },
  {
    id: 'ex-fg-ground-shockwave',
    name: 'Ground Shockwave',
    category: 'fighting',
    shortDesc: 'Onda sísmica horizontal al golpear el piso con polvo, grieta y fragmentos.',
    howBuilt: 'Onda expansiva aplanada con Morfología + Polvo ascendente + Picos pequeños y fragmentos.',
    componentsUsed: ['Onda sísmica', 'Polvo', 'Fragmentos', 'Grietas'],
    layersUsed: ['Ondas · Onda Sísmica', 'Humo · Polvo Choque', 'Rocas · Fragmentos'],
    particlesSummary: 'Rocas pequeñas proyectadas verticalmente por la onda.',
    modifiersUsed: ['Anchura 145%', 'Altura 72%', 'Expansión 25%'],
    keyParamsToTweak: ['Anchura Horizontal', 'Expansión', 'Densidad de Escombros'],
    generationMethod: 'Constructor FX + Morfología',
    recipe: {
      id: 'rec-fg-ground-shockwave',
      name: 'Ground Shockwave',
      source: 'lab',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      labFrameCount: 7,
      labAnimated: true,
      labModules: [
        mkMod({ name: 'Onda Sísmica', type: 'waves', layerRole: 'glow', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#fde047', colorEdge: '#ea580c', offsetY: 16, scale: 132 }),
        mkMod({ name: 'Polvo Impacto', type: 'dust_cloud', layerRole: 'smoke', blendMode: 'normal', colorCore: '#f5f5f4', colorMid: '#a8a29e', colorEdge: '#57534e', offsetY: 18, scale: 115 }),
        mkMod({ name: 'Escombros Suelo', type: 'fragments', layerRole: 'rocks', blendMode: 'normal', colorCore: '#e7e5e4', colorMid: '#78716c', colorEdge: '#292524', offsetY: 16, speed: 120 }),
      ],
      morphology: { ...DEFAULT_FX_MORPHOLOGY, enabled: true, width: 145, height: 78 },
    },
  },
  {
    id: 'ex-fg-projectile',
    name: 'Projectile Effects (Fireball / Hadou)',
    category: 'fighting',
    shortDesc: 'Esfera de energía con estela flameante, brillo central y chispas aerodinámicas.',
    howBuilt: 'Núcleo brillante adelantado + Estela de llamas hacia la izquierda + Chispas direccionales.',
    componentsUsed: ['Núcleo esférico', 'Estela energética', 'Brillo', 'Chispas'],
    layersUsed: ['Base · Estela', 'Brillo · Núcleo', 'Chispas · Estela'],
    particlesSummary: 'Chispas desprendiéndose de la cola del proyectil.',
    modifiersUsed: ['Dirección 180° (Cola)', 'Velocidad 130%', 'Fusión Pantalla'],
    keyParamsToTweak: ['Escala del Núcleo', 'Longitud de Cola', 'Paleta Elemental'],
    generationMethod: 'Constructor FX · Projectile',
    recipe: {
      id: 'rec-fg-projectile',
      name: 'Projectile Effects',
      source: 'lab',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      labFrameCount: 6,
      labAnimated: true,
      labModules: [
        mkMod({ name: 'Estela Proyectil', type: 'fire_core', layerRole: 'base', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#38bdf8', colorEdge: '#1d4ed8', angleDeg: 180, offsetX: -4, scale: 105 }),
        mkMod({ name: 'Núcleo Esfera', type: 'glow', layerRole: 'glow', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#bae6fd', colorEdge: '#0284c7', offsetX: 12, scale: 76 }),
        mkMod({ name: 'Chispas Cola', type: 'sparks', layerRole: 'sparks', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#7dd3fc', colorEdge: '#2563eb', angleDeg: 180, offsetX: -6, speed: 135 }),
      ],
    },
  },
  {
    id: 'ex-fg-charge',
    name: 'Charge Effects',
    category: 'fighting',
    shortDesc: 'Concentración de energía convergiendo al centro con vórtice, chispas y contracción.',
    howBuilt: 'Partículas + Ondas + Brillo central con Deformador Contracción y Vórtice para dar sensación de absorción.',
    componentsUsed: ['Núcleo carga', 'Ondas convergentes', 'Partículas', 'Vórtice'],
    layersUsed: ['Brillo · Núcleo Carga', 'Ondas · Pulso', 'Partículas · Absorción'],
    particlesSummary: 'Partículas concentrándose alrededor del núcleo.',
    modifiersUsed: ['Contracción 34%', 'Vórtice 48%', 'Velocidad 125%'],
    keyParamsToTweak: ['Contracción', 'Vórtice', 'Velocidad de Pulso'],
    generationMethod: 'Constructor FX + Contracción + Vórtice',
    recipe: {
      id: 'rec-fg-charge',
      name: 'Charge Effects',
      source: 'lab',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      labFrameCount: 8,
      labAnimated: true,
      labModules: [
        mkMod({ name: 'Núcleo Carga', type: 'glow', layerRole: 'glow', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#fde047', colorEdge: '#f59e0b', scale: 72 }),
        mkMod({ name: 'Anillos Carga', type: 'waves', layerRole: 'base', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#fef08a', colorEdge: '#d97706', scale: 112 }),
        mkMod({ name: 'Partículas Absorción', type: 'particles', layerRole: 'particles', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#fde047', colorEdge: '#ea580c', density: 85 }),
      ],
      deformers: { ...DEFAULT_FX_DEFORMERS, enabled: true, contraction: 34, vortex: 48, visualSpeed: 125 },
    },
  },
  {
    id: 'ex-fg-teleport',
    name: 'Teleport Effects',
    category: 'fighting',
    shortDesc: 'Desaparición vertical de teletransporte con haz estirado, distorsión y chispas.',
    howBuilt: 'Columna brillante estirada verticalmente con Morfología (Anchura 52%, Altura 155%) + Distorsión + Partículas.',
    componentsUsed: ['Haz vertical', 'Distorsión', 'Partículas residuales', 'Onda'],
    layersUsed: ['Base · Columna Flash', 'Distorsión · Warp', 'Partículas · Residuo'],
    particlesSummary: 'Motas residuales flotando tras el destello.',
    modifiersUsed: ['Anchura 52%', 'Altura 155%', 'Distorsión 45%'],
    keyParamsToTweak: ['Anchura', 'Altura', 'Distorsión'],
    generationMethod: 'Constructor FX + Morfología Vertical',
    recipe: {
      id: 'rec-fg-teleport',
      name: 'Teleport Effects',
      source: 'lab',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      labFrameCount: 6,
      labAnimated: true,
      labModules: [
        mkMod({ name: 'Columna Warp', type: 'aura_shell', layerRole: 'base', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#a5f3fc', colorEdge: '#6366f1', scale: 115 }),
        mkMod({ name: 'Distorsión Warp', type: 'distortion', layerRole: 'distortion', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#c4b5fd', colorEdge: '#4f46e5', scale: 110 }),
        mkMod({ name: 'Residuo Partículas', type: 'particles', layerRole: 'particles', blendMode: 'screen', colorCore: '#ffffff', colorMid: '#67e8f9', colorEdge: '#818cf8', density: 70 }),
      ],
      morphology: { ...DEFAULT_FX_MORPHOLOGY, enabled: true, width: 54, height: 150, topWidth: 70, bottomWidth: 70 },
      deformers: { ...DEFAULT_FX_DEFORMERS, enabled: true, distortion: 45 },
    },
  },
  {
    id: 'ex-fg-transformation',
    name: 'Transformation Effects',
    category: 'fighting',
    shortDesc: 'Estallido de transformación completa: aura dorada, rocas levitando, viento, rayos y ondas.',
    howBuilt: 'Editor de Auras con Energía Principal dorada + Rocas + Fragmentos + Viento + Chispas + Ondas de presión + Distorsión.',
    componentsUsed: ['Aura dorada', 'Rocas levitando', 'Viento', 'Chispas', 'Ondas', 'Distorsión'],
    layersUsed: ['Aura · Energía Principal', 'Aura · Rocas', 'Aura · Viento', 'Aura · Chispas', 'Aura · Ondas', 'Aura · Distorsión'],
    particlesSummary: 'Combinación total de rocas, chispas y polvo ascendente.',
    modifiersUsed: ['Altura 130%', 'Turbulencia 68%', 'Velocidad 140%'],
    keyParamsToTweak: ['Activar/Desactivar cada componente', 'Colores de Transformación', 'Anchura Superior'],
    generationMethod: 'Editor de Auras Completo (Transformación)',
    recipe: {
      id: 'rec-fg-transformation',
      name: 'Transformation Effects',
      source: 'aura',
      origin: 'preset',
      createdAt: '2026-01-01T00:00:00.000Z',
      labFrameCount: 8,
      labAnimated: true,
      auraConfig: {
        ...DEFAULT_AURA_CONFIG,
        auraType: 'ki',
        showCoreEnergy: true,
        coreStyle: 'flames',
        colorCore: '#ffffff',
        colorMid: '#fde047',
        colorEdge: '#f97316',
        topWidth: 96,
        midWidth: 118,
        bottomWidth: 140,
        height: 130,
        turbulence: 68,
        speed: 140,
        components: {
          wind: { enabled: true, intensity: 82, color: '#fef9c3' },
          rocks: { enabled: true, intensity: 85, color: '#78716c' },
          sparks: { enabled: true, intensity: 92, color: '#ffffff' },
          smoke: { enabled: true, intensity: 64, color: '#d6d3d1' },
          particles: { enabled: true, intensity: 85, color: '#fde047' },
          fragments: { enabled: true, intensity: 76, color: '#a8a29e' },
          waves: { enabled: true, intensity: 88, color: '#fbbf24' },
          ambientDistortion: { enabled: true, intensity: 72, color: '#fef08a' },
        },
      },
    },
  },
];

// =========================================================
// 7. TUTORIALES RÁPIDOS ("¿QUÉ PUEDO CREAR?")
// =========================================================
export interface FxQuickTutorial {
  id: string;
  title: string;
  goal: string;
  steps: string[];
  recommendedExampleId: string;
}

export const FX_QUICK_TUTORIALS: FxQuickTutorial[] = [
  {
    id: 'tut-energyless-aura',
    title: 'Crear un Aura de Poder SIN energía visible',
    goal: 'Lograr presión pura con viento, polvo, rocas flotando y distorsión de calor.',
    steps: [
      'Ve a la pestaña "Auras" y desactiva el interruptor "Mostrar Energía Principal".',
      'Activa individualmente: Corrientes de Viento, Rocas Suspendidas, Polvo/Humo, Fragmentos y Distorsión Ambiental.',
      'Ajusta Anchura Inferior y Velocidad, o agrega Distorsión extra en "Morfología & Deformadores".',
    ],
    recommendedExampleId: 'ex-aura-power',
  },
  {
    id: 'tut-earth-spikes',
    title: 'Construir un Ataque de Púas de Tierra editable',
    goal: 'Suelo agrietado → Púas emergentes → Pilares → Rocas desprendidas → Fragmentos.',
    steps: [
      'Abre la pestaña "Rocas y Púas" y pulsa "Generar Ataque de Púas de Tierra".',
      'Ajusta Altura, Anchura, Cantidad, Velocidad de aparición y Curvatura de las púas.',
      'Haz clic en cualquier púa, pilar o fragmento individual para moverlo, rotarlo o cambiarle el color.',
    ],
    recommendedExampleId: 'ex-atk-earth-spikes',
  },
  {
    id: 'tut-hybrid-builder',
    title: 'Combinar módulos libres (Fórmula A + B + C)',
    goal: 'Crear un efecto híbrido desde cero (ej. Aura + Rocas + Viento + Distorsión).',
    steps: [
      'Entra a "Constructor FX" y abre el Explorador de 16 Componentes.',
      'Haz clic en los componentes que deseas sumar (cada uno se agrega como una Capa FX editable).',
      'Refina la silueta en "Morfología & Deformadores" y guarda tus piezas favoritas en la Biblioteca de Componentes.',
    ],
    recommendedExampleId: 'ex-atk-tornado',
  },
  {
    id: 'tut-base-and-draw',
    title: 'Usar una FX Base para dibujar encima o guiar la IA',
    goal: 'Usar siluetas guía profesionales antes de pintar píxel a píxel o pedir ayuda a la IA.',
    steps: [
      'Abre "FX Base" y elige una silueta (Aura Base, Proyectil Base, Explosión Base, Roca Base...).',
      'Pulsa "Dibujar Encima (Frame-by-Frame)" para pintar libremente usando la base como referencia visual.',
      'Opcionalmente, abre "IA FX" para pedir variaciones o detalles sin bloquear tu edición manual posterior.',
    ],
    recommendedExampleId: 'ex-atk-ki-wave',
  },
];

// =========================================================
// 8. HELPER TO RENDER ANY RECIPE INTO PREVIEW FRAMES (USED BY GALLERY THUMBNAILS!)
// =========================================================
export function renderRecipePreviewFrames(
  recipe: EditableFxRecipe,
  width: number = 40,
  height: number = 40,
  maxFrames: number = 6
): (string | null)[][][] {
  const frameCount = Math.max(1, Math.min(maxFrames, recipe.labFrameCount || recipe.generatorConfig?.frameCount || 6));
  let rawFrames: (string | null)[][][];

  if (recipe.customFrames && recipe.customFrames.length > 0) {
    rawFrames = recipe.customFrames.slice(0, frameCount);
  } else if (recipe.source === 'aura' && recipe.auraConfig) {
    rawFrames = synthesizeAuraFrames(recipe.auraConfig, frameCount, width, height).map((f) => f.merged);
  } else if (recipe.source === 'lab' && recipe.labModules && recipe.labModules.length > 0) {
    rawFrames = synthesizeEnhancedLabFrames(recipe.labModules, frameCount, width, height).map((f) => f.merged);
  } else if (recipe.source === 'rocks' && recipe.rockPieces) {
    rawFrames = synthesizeRocksFrames(recipe.rockPieces, recipe.rockClusters || [], frameCount, width, height);
  } else if (recipe.source === 'particles' && recipe.particleConfig) {
    rawFrames = synthesizeParticleFrames(recipe.particleConfig, frameCount, width, height);
  } else if (recipe.source === 'smears' && recipe.smearConfig) {
    rawFrames = synthesizeSmearFrames(recipe.smearConfig, frameCount, width, height);
  } else if (recipe.source === 'fluids') {
    rawFrames = bakeFluidFrames(recipe.fluidConfig || DEFAULT_FLUID_CONFIG, frameCount, width, height);
  } else {
    const res = synthesizeFxFrames(
      { ...(recipe.generatorConfig || DEFAULT_FX_GENERATOR_CONFIG), frameCount, animated: frameCount > 1 },
      width,
      height
    );
    rawFrames = res.frames.map((f) => f.merged);
  }

  const morph = recipe.morphology || DEFAULT_FX_MORPHOLOGY;
  const def = recipe.deformers || DEFAULT_FX_DEFORMERS;
  if (!isMorphologyActive(morph) && !isDeformersActive(def)) return rawFrames;

  return rawFrames.map((g, idx) =>
    applyMorphologyAndDeformersToGrid(g, morph, def, rawFrames.length === 1 ? 0.35 : idx / rawFrames.length)
  );
}
