import { AssetCategory, AssetLibraryItem } from '../types';
import { createEmptyGrid } from './pixelMath';

const USER_LIBRARY_STORAGE_KEY = 'pixelclash_asset_library_v1';
const USER_FOLDERS_STORAGE_KEY = 'pixelclash_asset_folders_v1';

function buildGridFromCoords(
  w: number,
  h: number,
  pixels: { x: number; y: number; color: string }[]
): (string | null)[][] {
  const g = createEmptyGrid(w, h);
  for (const p of pixels) {
    if (p.x >= 0 && p.x < w && p.y >= 0 && p.y < h) {
      g[p.y][p.x] = p.color;
    }
  }
  return g;
}

function rectPixels(
  x0: number,
  y0: number,
  w: number,
  h: number,
  color: string
): { x: number; y: number; color: string }[] {
  const out: { x: number; y: number; color: string }[] = [];
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      out.push({ x, y, color });
    }
  }
  return out;
}

function extractPalette(grid: (string | null)[][]): string[] {
  const set = new Set<string>();
  for (const row of grid) {
    for (const col of row) {
      if (col) set.add(col.toLowerCase());
    }
  }
  return [...set].slice(0, 12);
}

// Synthesize short retro WAV DataURL for built-in Sound presets (works offline cleanly)
function createRetroWavDataUrl(
  freqStart: number,
  freqEnd: number,
  durationSec: number,
  wave: 'square' | 'noise' | 'saw'
): string {
  const sampleRate = 11025;
  const numSamples = Math.max(256, Math.floor(sampleRate * durationSec));
  const buffer = new ArrayBuffer(44 + numSamples);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true); // 8-bit unsigned PCM
  writeStr(36, 'data');
  view.setUint32(40, numSamples, true);

  let phase = 0;
  for (let i = 0; i < numSamples; i++) {
    const t = i / numSamples;
    const env = Math.pow(1 - t, 1.4);
    const freq = freqStart + (freqEnd - freqStart) * t;
    phase += (2 * Math.PI * freq) / sampleRate;
    let sample = 0;
    if (wave === 'noise') {
      sample = (Math.random() * 2 - 1) * env;
    } else if (wave === 'saw') {
      sample = (((phase / (2 * Math.PI)) % 1) * 2 - 1) * env;
    } else {
      sample = (Math.sin(phase) >= 0 ? 1 : -1) * env;
    }
    const byteVal = Math.max(0, Math.min(255, Math.round(128 + sample * 90)));
    view.setUint8(44 + i, byteVal);
  }

  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

export const ASSET_CATEGORIES: { id: AssetCategory; label: string; short: string }[] = [
  { id: 'character', label: 'Personajes', short: 'Pers.' },
  { id: 'stage', label: 'Escenarios', short: 'Escen.' },
  { id: 'hud', label: 'HUD', short: 'HUD' },
  { id: 'vfx', label: 'Efectos', short: 'VFX' },
  { id: 'particles', label: 'Partículas', short: 'Partíc.' },
  { id: 'projectiles', label: 'Proyectiles', short: 'Proyect.' },
  { id: 'sounds', label: 'Sonidos', short: 'Audio' },
  { id: 'ui', label: 'UI', short: 'UI' },
  { id: 'references', label: 'Referencias', short: 'Ref.' },
];

export const BUILTIN_ASSET_PRESETS: AssetLibraryItem[] = (() => {
  const hitSparkGrid = buildGridFromCoords(16, 16, [
    ...rectPixels(7, 2, 2, 12, '#ef4444'),
    ...rectPixels(2, 7, 12, 2, '#ef4444'),
    ...rectPixels(5, 5, 6, 6, '#f97316'),
    ...rectPixels(6, 6, 4, 4, '#facc15'),
    ...rectPixels(7, 7, 2, 2, '#ffffff'),
    { x: 3, y: 3, color: '#fbbf24' },
    { x: 12, y: 3, color: '#fbbf24' },
    { x: 3, y: 12, color: '#fbbf24' },
    { x: 12, y: 12, color: '#fbbf24' },
  ]);

  const orbGrid = buildGridFromCoords(16, 16, [
    ...rectPixels(2, 6, 4, 4, '#1d4ed8'),
    ...rectPixels(5, 4, 7, 8, '#0284c7'),
    ...rectPixels(7, 5, 6, 6, '#38bdf8'),
    ...rectPixels(9, 6, 4, 4, '#bae6fd'),
    ...rectPixels(10, 7, 2, 2, '#ffffff'),
    { x: 1, y: 7, color: '#60a5fa' },
    { x: 3, y: 4, color: '#38bdf8' },
    { x: 3, y: 11, color: '#38bdf8' },
  ]);

  const particlesGrid = buildGridFromCoords(16, 16, [
    { x: 3, y: 12, color: '#f97316' },
    { x: 4, y: 11, color: '#facc15' },
    { x: 6, y: 9, color: '#ffffff' },
    { x: 8, y: 10, color: '#fbbf24' },
    { x: 10, y: 7, color: '#ef4444' },
    { x: 11, y: 5, color: '#fde047' },
    { x: 5, y: 6, color: '#fb923c' },
    { x: 13, y: 9, color: '#f97316' },
    { x: 7, y: 4, color: '#ffffff' },
  ]);

  const lifebarGrid = buildGridFromCoords(32, 8, [
    ...rectPixels(0, 1, 32, 6, '#0f172a'),
    ...rectPixels(1, 2, 30, 4, '#7f1d1d'),
    ...rectPixels(1, 2, 24, 4, '#f59e0b'),
    ...rectPixels(1, 2, 24, 2, '#fde047'),
    ...rectPixels(0, 0, 32, 1, '#94a3b8'),
    ...rectPixels(0, 7, 32, 1, '#475569'),
  ]);

  const uiBadgeGrid = buildGridFromCoords(20, 12, [
    ...rectPixels(1, 1, 18, 10, '#1e293b'),
    ...rectPixels(0, 0, 20, 1, '#38bdf8'),
    ...rectPixels(0, 11, 20, 1, '#0284c7'),
    ...rectPixels(2, 2, 16, 8, '#0f172a'),
    ...rectPixels(4, 4, 3, 4, '#38bdf8'),
    ...rectPixels(9, 4, 7, 1, '#e2e8f0'),
    ...rectPixels(9, 6, 5, 1, '#94a3b8'),
  ]);

  const lanternGrid = buildGridFromCoords(14, 20, [
    ...rectPixels(6, 0, 2, 3, '#475569'),
    ...rectPixels(4, 3, 6, 2, '#1e293b'),
    ...rectPixels(3, 5, 8, 10, '#dc2626'),
    ...rectPixels(4, 6, 6, 8, '#ef4444'),
    ...rectPixels(5, 8, 4, 4, '#fef08a'),
    ...rectPixels(4, 15, 6, 2, '#1e293b'),
    ...rectPixels(6, 17, 2, 3, '#f59e0b'),
  ]);

  const bandanaGrid = buildGridFromCoords(16, 10, [
    ...rectPixels(5, 2, 9, 2, '#dc2626'),
    ...rectPixels(6, 2, 7, 1, '#ef4444'),
    { x: 4, y: 3, color: '#b91c1c' },
    { x: 3, y: 4, color: '#dc2626' },
    { x: 2, y: 5, color: '#ef4444' },
    { x: 1, y: 6, color: '#b91c1c' },
    { x: 4, y: 5, color: '#991b1b' },
    { x: 3, y: 6, color: '#dc2626' },
    { x: 2, y: 7, color: '#ef4444' },
  ]);

  const sfxWaveGrid = buildGridFromCoords(16, 12, [
    ...rectPixels(2, 5, 2, 2, '#38bdf8'),
    ...rectPixels(5, 3, 2, 6, '#38bdf8'),
    ...rectPixels(8, 1, 2, 10, '#fbbf24'),
    ...rectPixels(11, 3, 2, 6, '#38bdf8'),
    ...rectPixels(14, 5, 1, 2, '#94a3b8'),
  ]);

  const refSilhouetteGrid = buildGridFromCoords(16, 20, [
    ...rectPixels(6, 1, 4, 4, '#64748b'),
    ...rectPixels(5, 5, 6, 7, '#475569'),
    ...rectPixels(3, 6, 2, 5, '#64748b'),
    ...rectPixels(11, 6, 2, 5, '#64748b'),
    ...rectPixels(5, 12, 2, 7, '#334155'),
    ...rectPixels(9, 12, 2, 7, '#334155'),
  ]);

  const items: AssetLibraryItem[] = [
    {
      id: 'preset-hit-spark',
      name: 'Chispa Impacto K.O.',
      category: 'vfx',
      origin: 'preset',
      folder: 'Combate / Impactos',
      tags: ['hit', 'spark', 'kof', 'impacto'],
      favorite: true,
      width: 16,
      height: 16,
      createdAt: '2025-01-10',
      description: 'Destello de impacto en cruz clásico estilo Street Fighter / KOF.',
      pixels: hitSparkGrid,
      metadata: {
        author: 'PixelClash Arcade Core',
        createdAt: '2025-01-10',
        palette: extractPalette(hitSparkGrid),
        resolution: '16×16',
        sourceProject: 'Arcade VFX Pack',
      },
    },
    {
      id: 'preset-hadoken-orb',
      name: 'Esfera Hadoken Ki',
      category: 'projectiles',
      origin: 'preset',
      folder: 'Combate / Proyectiles',
      tags: ['fireball', 'hadoken', 'ki', 'proyectil'],
      favorite: true,
      width: 16,
      height: 16,
      createdAt: '2025-01-10',
      description: 'Proyectil compacto con núcleo blanco y estela azul plasma.',
      pixels: orbGrid,
      metadata: {
        author: 'PixelClash Arcade Core',
        createdAt: '2025-01-10',
        palette: extractPalette(orbGrid),
        resolution: '16×16',
        sourceProject: 'CPS-2 FX Pack',
      },
    },
    {
      id: 'preset-ember-particles',
      name: 'Brasas y Chispas Ascendentes',
      category: 'particles',
      origin: 'preset',
      folder: 'Combate / Partículas',
      tags: ['particulas', 'fuego', 'polvo'],
      favorite: false,
      width: 16,
      height: 16,
      createdAt: '2025-01-12',
      description: 'Partículas sueltas para estelas de dash, fuego y polvo de caída.',
      pixels: particlesGrid,
      metadata: {
        author: 'PixelClash Arcade Core',
        createdAt: '2025-01-12',
        palette: extractPalette(particlesGrid),
        resolution: '16×16',
        sourceProject: 'Particle Kit',
      },
    },
    {
      id: 'preset-hud-lifebar',
      name: 'Barra de Vida P1 Arcade',
      category: 'hud',
      origin: 'preset',
      folder: 'Interfaz / Barras',
      tags: ['hud', 'vida', 'cps2'],
      favorite: false,
      width: 32,
      height: 8,
      createdAt: '2025-01-14',
      description: 'Medidor de salud con marco metálico y relleno degradado.',
      pixels: lifebarGrid,
      metadata: {
        author: 'PixelClash Arcade Core',
        createdAt: '2025-01-14',
        palette: extractPalette(lifebarGrid),
        resolution: '32×8',
        sourceProject: 'Tournament HUD',
      },
    },
    {
      id: 'preset-ui-card',
      name: 'Placa Menú Selector UI',
      category: 'ui',
      origin: 'preset',
      folder: 'Interfaz / Menús',
      tags: ['ui', 'menu', 'select'],
      favorite: false,
      width: 20,
      height: 12,
      createdAt: '2025-01-14',
      description: 'Tarjeta modular de interfaz para pantallas de selección.',
      pixels: uiBadgeGrid,
      metadata: {
        author: 'PixelClash Arcade Core',
        createdAt: '2025-01-14',
        palette: extractPalette(uiBadgeGrid),
        resolution: '20×12',
        sourceProject: 'Select Screen UI',
      },
    },
    {
      id: 'preset-stage-lantern',
      name: 'Linterna Dojo Japonesa',
      category: 'stage',
      origin: 'preset',
      folder: 'Escenarios / Props',
      tags: ['dojo', 'escenario', 'prop'],
      favorite: false,
      width: 14,
      height: 20,
      createdAt: '2025-01-15',
      description: 'Farolillo de papel rojo colgante para escenarios de templo o dojo.',
      pixels: lanternGrid,
      metadata: {
        author: 'PixelClash Arcade Core',
        createdAt: '2025-01-15',
        palette: extractPalette(lanternGrid),
        resolution: '14×20',
        sourceProject: 'Dojo Stage Kit',
      },
    },
    {
      id: 'preset-char-bandana',
      name: 'Cinta / Headband Luchador',
      category: 'character',
      origin: 'preset',
      folder: 'Personajes / Accesorios',
      tags: ['personaje', 'cinta', 'ryu'],
      favorite: false,
      width: 16,
      height: 10,
      createdAt: '2025-01-15',
      description: 'Cinta roja ondeante lista para acoplar a la cabeza de tu personaje.',
      pixels: bandanaGrid,
      metadata: {
        author: 'PixelClash Arcade Core',
        createdAt: '2025-01-15',
        palette: extractPalette(bandanaGrid),
        resolution: '16×10',
        sourceProject: 'Fighter Wardrobe',
      },
    },
    {
      id: 'preset-sfx-heavy-hit',
      name: 'SFX Golpe Fuerte Arcade',
      category: 'sounds',
      origin: 'preset',
      folder: 'Audio / Combate',
      tags: ['sfx', 'golpe', 'retro', 'wav'],
      favorite: true,
      width: 16,
      height: 12,
      createdAt: '2025-01-16',
      description: 'Sonido retro de impacto fuerte sintetizado en 8-bit PCM.',
      pixels: sfxWaveGrid,
      mediaDataUrl: createRetroWavDataUrl(280, 65, 0.18, 'noise'),
      metadata: {
        author: 'PixelClash Synth',
        createdAt: '2025-01-16',
        palette: ['#38bdf8', '#fbbf24'],
        resolution: 'Audio WAV 11kHz',
        sourceProject: 'Arcade SFX Bank',
        durationSec: 0.18,
        mimeType: 'audio/wav',
      },
    },
    {
      id: 'preset-sfx-parry',
      name: 'SFX Parry / Guard Block',
      category: 'sounds',
      origin: 'preset',
      folder: 'Audio / Combate',
      tags: ['sfx', 'block', 'parry', 'guard'],
      favorite: false,
      width: 16,
      height: 12,
      createdAt: '2025-01-16',
      description: 'Tono metálico rápido de bloqueo o parry perfecto.',
      pixels: sfxWaveGrid,
      mediaDataUrl: createRetroWavDataUrl(760, 1280, 0.14, 'square'),
      metadata: {
        author: 'PixelClash Synth',
        createdAt: '2025-01-16',
        palette: ['#38bdf8', '#fbbf24'],
        resolution: 'Audio WAV 11kHz',
        sourceProject: 'Arcade SFX Bank',
        durationSec: 0.14,
        mimeType: 'audio/wav',
      },
    },
    {
      id: 'preset-ref-pose',
      name: 'Guía Proporción Luchador',
      category: 'references',
      origin: 'preset',
      folder: 'Referencias / Anatomía',
      tags: ['referencia', 'silueta', 'anatomia'],
      favorite: false,
      width: 16,
      height: 20,
      createdAt: '2025-01-16',
      description: 'Silueta base de proporciones arcade para trazar poses.',
      pixels: refSilhouetteGrid,
      metadata: {
        author: 'PixelClash Studio',
        createdAt: '2025-01-16',
        palette: extractPalette(refSilhouetteGrid),
        resolution: '16×20',
        sourceProject: 'Proportions Guide',
      },
    },
  ];
  return items;
})();

export function loadUserAssetLibrary(): AssetLibraryItem[] {
  try {
    const raw = localStorage.getItem(USER_LIBRARY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveUserAssetLibrary(items: AssetLibraryItem[]): void {
  try {
    localStorage.setItem(USER_LIBRARY_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore quota limits
  }
}

export function loadAssetFolders(): string[] {
  try {
    const raw = localStorage.getItem(USER_FOLDERS_STORAGE_KEY);
    if (!raw) return ['General', 'Combate / Impactos', 'Personajes / Propios', 'Audio / Combate'];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : ['General', 'Combate / Impactos', 'Personajes / Propios', 'Audio / Combate'];
  } catch {
    return ['General', 'Combate / Impactos', 'Personajes / Propios', 'Audio / Combate'];
  }
}

export function saveAssetFolders(folders: string[]): void {
  try {
    localStorage.setItem(USER_FOLDERS_STORAGE_KEY, JSON.stringify(folders));
  } catch {
    // ignore
  }
}
