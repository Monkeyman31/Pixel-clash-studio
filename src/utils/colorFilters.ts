import { LayerAdjustmentConfig } from '../types';

export const DEFAULT_ADJUSTMENT_CONFIG: LayerAdjustmentConfig = {
  hue: 0,
  saturation: 0,
  brightness: 0,
  contrast: 0,
  posterize: 0,
  invert: false,
  grayscale: false,
  sepia: false,
  tintColor: '#fbbf24',
  tintAmount: 0,
};

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function parseColorWithAlpha(color: string): [number, number, number, number] {
  const trimmed = color.trim();
  const rgbaMatch = trimmed.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (rgbaMatch) {
    return [
      clampByte(parseFloat(rgbaMatch[1])),
      clampByte(parseFloat(rgbaMatch[2])),
      clampByte(parseFloat(rgbaMatch[3])),
      rgbaMatch[4] !== undefined ? Math.max(0, Math.min(1, parseFloat(rgbaMatch[4]))) : 1,
    ];
  }
  const clean = trimmed.replace('#', '');
  const full =
    clean.length === 3
      ? `${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`
      : clean.padEnd(6, '0').slice(0, 6);
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
    1,
  ];
}

export function hexToRgb(hex: string): [number, number, number] {
  const [r, g, b] = parseColorWithAlpha(hex);
  return [r, g, b];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (clampByte(r) << 16) + (clampByte(g) << 8) + clampByte(b))
    .toString(16)
    .slice(1)}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }

  return [h * 360, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hn = (((h % 360) + 360) % 360) / 360;
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const ln = Math.max(0, Math.min(100, l)) / 100;

  if (sn === 0) {
    const v = clampByte(ln * 255);
    return [v, v, v];
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  return [
    clampByte(hue2rgb(p, q, hn + 1 / 3) * 255),
    clampByte(hue2rgb(p, q, hn) * 255),
    clampByte(hue2rgb(p, q, hn - 1 / 3) * 255),
  ];
}

export function applyAdjustmentToHex(
  hex: string,
  cfg: LayerAdjustmentConfig,
  strength: number = 1
): string {
  const alpha = Math.max(0, Math.min(1, strength));
  if (alpha <= 0.001) return hex;

  const [origR, origG, origB, origA] = parseColorWithAlpha(hex);
  let [r, g, b] = [origR, origG, origB];

  // 1. Hue & Saturation in HSL space
  if (cfg.hue !== 0 || cfg.saturation !== 0) {
    const [h, s, l] = rgbToHsl(r, g, b);
    const nextH = h + cfg.hue;
    const nextS =
      cfg.saturation >= 0
        ? s + (100 - s) * (cfg.saturation / 100)
        : s * (1 + cfg.saturation / 100);
    [r, g, b] = hslToRgb(nextH, nextS, l);
  }

  // 2. Brightness (-100 to 100)
  if (cfg.brightness !== 0) {
    const shift = (cfg.brightness / 100) * 255;
    r = clampByte(r + shift);
    g = clampByte(g + shift);
    b = clampByte(b + shift);
  }

  // 3. Contrast (-100 to 100)
  if (cfg.contrast !== 0) {
    const cVal = (cfg.contrast / 100) * 255;
    const factor = (259 * (cVal + 255)) / (255 * (259 - cVal));
    r = clampByte(factor * (r - 128) + 128);
    g = clampByte(factor * (g - 128) + 128);
    b = clampByte(factor * (b - 128) + 128);
  }

  // 4. Grayscale
  if (cfg.grayscale) {
    const lum = clampByte(0.299 * r + 0.587 * g + 0.114 * b);
    r = lum;
    g = lum;
    b = lum;
  }

  // 5. Sepia
  if (cfg.sepia) {
    const sr = clampByte(r * 0.393 + g * 0.769 + b * 0.189);
    const sg = clampByte(r * 0.349 + g * 0.686 + b * 0.168);
    const sb = clampByte(r * 0.272 + g * 0.534 + b * 0.131);
    r = sr;
    g = sg;
    b = sb;
  }

  // 6. Color Tint
  if (cfg.tintAmount > 0 && cfg.tintColor) {
    const [tr, tg, tb] = hexToRgb(cfg.tintColor);
    const t = Math.max(0, Math.min(1, cfg.tintAmount / 100));
    r = clampByte(r * (1 - t) + tr * t);
    g = clampByte(g * (1 - t) + tg * t);
    b = clampByte(b * (1 - t) + tb * t);
  }

  // 7. Posterize
  if (cfg.posterize >= 2) {
    const levels = Math.max(2, Math.min(16, Math.round(cfg.posterize)));
    const step = 255 / (levels - 1);
    r = clampByte(Math.round(r / step) * step);
    g = clampByte(Math.round(g / step) * step);
    b = clampByte(Math.round(b / step) * step);
  }

  // 8. Invert
  if (cfg.invert) {
    r = 255 - r;
    g = 255 - g;
    b = 255 - b;
  }

  if (alpha < 0.999) {
    r = clampByte(origR + (r - origR) * alpha);
    g = clampByte(origG + (g - origG) * alpha);
    b = clampByte(origB + (b - origB) * alpha);
  }

  return origA < 0.999 ? `rgba(${r}, ${g}, ${b}, ${origA.toFixed(3)})` : rgbToHex(r, g, b);
}

export function applyAdjustmentToGrid(
  grid: (string | null)[][],
  cfg: LayerAdjustmentConfig,
  strength: number = 1
): (string | null)[][] {
  return grid.map((row) =>
    row.map((cell) => (cell ? applyAdjustmentToHex(cell, cfg, strength) : null))
  );
}

export function applyAutoOutlineToGrid(
  grid: (string | null)[][],
  outlineColor: string = '#090b10'
): (string | null)[][] {
  const height = grid.length;
  const width = grid[0]?.length || 0;
  const next = grid.map((r) => [...r]);

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] !== null) continue;
      let touchesSprite = false;
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && grid[ny][nx] !== null) {
          touchesSprite = true;
          break;
        }
      }
      if (touchesSprite) {
        next[y][x] = outlineColor;
      }
    }
  }
  return next;
}

export function applyGameBoyFilterToGrid(grid: (string | null)[][]): (string | null)[][] {
  const gbPalette = ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'];
  return grid.map((row) =>
    row.map((cell) => {
      if (!cell) return null;
      const [r, g, b] = hexToRgb(cell);
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const idx = lum < 0.25 ? 0 : lum < 0.5 ? 1 : lum < 0.78 ? 2 : 3;
      return gbPalette[idx];
    })
  );
}

export type FilterGalleryPresetId =
  | 'outline'
  | 'gameboy'
  | 'crt_arcade'
  | 'neogeo_crisp'
  | 'cel_boost'
  | 'noir_ink'
  | 'cyber_neon'
  | 'poster_pop'
  | 'sepia'
  | 'grayscale'
  | 'invert';

export interface FilterGalleryPreset {
  id: FilterGalleryPresetId;
  name: string;
  category: 'Pixel Art' | 'Arcade' | 'Estilizado' | 'Color';
  description: string;
  swatch: [string, string, string];
}

export const FILTER_GALLERY_PRESETS: FilterGalleryPreset[] = [
  {
    id: 'outline',
    name: 'Auto-Contorno 1px',
    category: 'Pixel Art',
    description: 'Genera borde de 1px limpio alrededor de la silueta.',
    swatch: ['#090b10', '#38bdf8', '#f8fafc'],
  },
  {
    id: 'gameboy',
    name: 'GameBoy DMG',
    category: 'Arcade',
    description: 'Cuantización clásica 4-tonos verde fósforo.',
    swatch: ['#0f380f', '#306230', '#9bbc0f'],
  },
  {
    id: 'crt_arcade',
    name: 'CRT Scanlines',
    category: 'Arcade',
    description: 'Líneas de escaneo retro y contraste cálido arcade.',
    swatch: ['#1e1b4b', '#f59e0b', '#fef08a'],
  },
  {
    id: 'neogeo_crisp',
    name: 'Neo-Geo Crisp',
    category: 'Arcade',
    description: 'Realce de saturación cálida y nitidez 16-bit.',
    swatch: ['#451a03', '#ef4444', '#fde047'],
  },
  {
    id: 'cel_boost',
    name: 'Cel-Shade Boost',
    category: 'Estilizado',
    description: 'Posterizado 5 niveles + contraste alto CPS-2.',
    swatch: ['#0f172a', '#3b82f6', '#22d3ee'],
  },
  {
    id: 'cyber_neon',
    name: 'Cyber Neon',
    category: 'Estilizado',
    description: 'Tinte magenta/cian y luces eléctricas intensas.',
    swatch: ['#090d16', '#ec4899', '#22d3ee'],
  },
  {
    id: 'noir_ink',
    name: 'Noir Tinta',
    category: 'Estilizado',
    description: 'Blanco y negro dramático de alto contraste.',
    swatch: ['#090b10', '#64748b', '#f8fafc'],
  },
  {
    id: 'poster_pop',
    name: 'Poster Pop 4C',
    category: 'Estilizado',
    description: 'Posterizado arcade 4 tonos de máxima legibilidad.',
    swatch: ['#1e1b4b', '#db2777', '#facc15'],
  },
  {
    id: 'sepia',
    name: 'Sepia Clásico',
    category: 'Color',
    description: 'Tono dorado vintage de archivo.',
    swatch: ['#451a03', '#b45309', '#fde68a'],
  },
  {
    id: 'grayscale',
    name: 'Escala de Grises',
    category: 'Color',
    description: 'Conversión neutral de luminancia.',
    swatch: ['#1e293b', '#94a3b8', '#f1f5f9'],
  },
  {
    id: 'invert',
    name: 'Negativo / 2P',
    category: 'Color',
    description: 'Inversión instantánea tipo paleta Jugador 2.',
    swatch: ['#f8fafc', '#22d3ee', '#090b10'],
  },
];

export function blendHexOver(
  baseHex: string | null,
  targetHex: string | null,
  t01: number
): string | null {
  const t = Math.max(0, Math.min(1, t01));
  if (t <= 0.001) return baseHex;
  if (t >= 0.999) return targetHex;
  if (!baseHex) return targetHex;
  if (!targetHex) return baseHex;
  const [r1, g1, b1, a1] = parseColorWithAlpha(baseHex);
  const [r2, g2, b2, a2] = parseColorWithAlpha(targetHex);
  const r = clampByte(r1 + (r2 - r1) * t);
  const g = clampByte(g1 + (g2 - g1) * t);
  const b = clampByte(b1 + (b2 - b1) * t);
  const a = a1 + (a2 - a1) * t;
  return a < 0.999 ? `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})` : rgbToHex(r, g, b);
}

export function applyGalleryFilterToGrid(
  grid: (string | null)[][],
  presetId: FilterGalleryPresetId,
  intensity01: number = 1,
  primaryColor: string = '#090b10'
): (string | null)[][] {
  const t = Math.max(0, Math.min(1, intensity01));
  let filtered: (string | null)[][];

  switch (presetId) {
    case 'outline': {
      const outlined = applyAutoOutlineToGrid(grid, primaryColor);
      if (t >= 0.5) return outlined;
      return grid.map((r) => [...r]);
    }
    case 'gameboy':
      filtered = applyGameBoyFilterToGrid(grid);
      break;
    case 'crt_arcade':
      filtered = grid.map((row, y) =>
        row.map((cell) => {
          if (!cell) return null;
          const base = applyAdjustmentToHex(cell, {
            ...DEFAULT_ADJUSTMENT_CONFIG,
            contrast: 22,
            saturation: 18,
            brightness: y % 2 === 1 ? -16 : 6,
          });
          return base;
        })
      );
      break;
    case 'neogeo_crisp':
      filtered = applyAdjustmentToGrid(grid, {
        ...DEFAULT_ADJUSTMENT_CONFIG,
        saturation: 28,
        contrast: 18,
        tintColor: '#f59e0b',
        tintAmount: 10,
      });
      break;
    case 'cel_boost':
      filtered = applyAdjustmentToGrid(grid, {
        ...DEFAULT_ADJUSTMENT_CONFIG,
        posterize: 5,
        contrast: 32,
        saturation: 22,
      });
      break;
    case 'cyber_neon':
      filtered = applyAdjustmentToGrid(grid, {
        ...DEFAULT_ADJUSTMENT_CONFIG,
        hue: -24,
        saturation: 45,
        contrast: 28,
        tintColor: '#22d3ee',
        tintAmount: 24,
      });
      break;
    case 'noir_ink':
      filtered = applyAdjustmentToGrid(grid, {
        ...DEFAULT_ADJUSTMENT_CONFIG,
        grayscale: true,
        contrast: 65,
        posterize: 4,
      });
      break;
    case 'poster_pop':
      filtered = applyAdjustmentToGrid(grid, {
        ...DEFAULT_ADJUSTMENT_CONFIG,
        posterize: 4,
        saturation: 50,
        contrast: 30,
      });
      break;
    case 'sepia':
      filtered = applyAdjustmentToGrid(grid, { ...DEFAULT_ADJUSTMENT_CONFIG, sepia: true });
      break;
    case 'grayscale':
      filtered = applyAdjustmentToGrid(grid, { ...DEFAULT_ADJUSTMENT_CONFIG, grayscale: true });
      break;
    case 'invert':
      filtered = applyAdjustmentToGrid(grid, { ...DEFAULT_ADJUSTMENT_CONFIG, invert: true });
      break;
    default:
      filtered = grid.map((r) => [...r]);
      break;
  }

  if (t >= 0.999) return filtered;
  return grid.map((row, y) =>
    row.map((cell, x) => blendHexOver(cell, filtered[y]?.[x] ?? null, t))
  );
}
