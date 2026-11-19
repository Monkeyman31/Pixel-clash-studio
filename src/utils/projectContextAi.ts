import {
  AiContextualMode,
  AiExternalProfileId,
  Frame,
  LayerGroup,
  ProjectContextAnalysis,
  ProjectState,
} from '../types';

export interface AiExternalStyleProfile {
  id: AiExternalProfileId;
  name: string;
  era: string;
  description: string;
  palette: string[];
  promptDirective: string;
}

export const AI_EXTERNAL_PROFILES: AiExternalStyleProfile[] = [
  {
    id: 'kof',
    name: 'King of Fighters',
    era: 'SNK Neo Geo / XIII',
    description: 'Anatomía estilizada arcade, sombreado firme, fuego dorado/carmesí y contorno oscuro limpio.',
    palette: ['#0d0914', '#2e1f3d', '#f59e0b', '#ef4444', '#fde047', '#f8fafc', '#38bdf8', '#991b1b'],
    promptDirective: 'The King of Fighters arcade pixel art aesthetic, crisp 1px dark outlines, dramatic directional rim light, dynamic Neo-Geo fighting silhouettes.',
  },
  {
    id: 'sf_alpha',
    name: 'Street Fighter Alpha',
    era: 'Capcom CPS-2 Anime',
    description: 'Proporciones robustas, colores cel saturados de alta visibilidad y destellos plasma.',
    palette: ['#090d16', '#1e3a8a', '#3b82f6', '#22d3ee', '#fbbf24', '#ef4444', '#ffffff', '#f97316'],
    promptDirective: 'Street Fighter Alpha 3 CPS-2 anime pixel art style, bold muscular shapes, clean cel-shaded color ramps, bright tournament-readable highlights.',
  },
  {
    id: 'darkstalkers',
    name: 'Darkstalkers',
    era: 'Capcom Gótico CPS-2',
    description: 'Fantasía oscura expresiva, púrpuras profundos, verdes ectoplasma y deformaciones squash & stretch.',
    palette: ['#0b0614', '#3b0764', '#9333ea', '#ec4899', '#10b981', '#bef264', '#fde047', '#e2e8f0'],
    promptDirective: 'Darkstalkers Vampire Savior style, exaggerated gothic arcade animation, saturated violet/magenta shadows and eerie emerald highlights.',
  },
  {
    id: 'guilty_gear',
    name: 'Guilty Gear',
    era: 'Arc System Works',
    description: 'Estilo anime heavy-metal de alto contraste, cel-shading afilado y chispas neón magenta/cian.',
    palette: ['#080a10', '#1e1b4b', '#db2777', '#a855f7', '#06b6d4', '#facc15', '#ffffff', '#dc2626'],
    promptDirective: 'Guilty Gear anime fighting game aesthetic, sharp angular cel-shading, heavy contrast shadows, neon magenta and electric cyan energy arcs.',
  },
  {
    id: 'blazblue',
    name: 'BlazBlue',
    era: 'HD 2D Anime Fighter',
    description: 'Trazos nítidos tipo HD sprite con gradientes fríos azules, acentos dorados y auras arcanas.',
    palette: ['#070d1c', '#172554', '#2563eb', '#60a5fa', '#e0f2fe', '#f59e0b', '#c026d3', '#ffffff'],
    promptDirective: 'BlazBlue 2D anime fighter sprite aesthetic, crystalline azure and royal blue lighting, ornate gold trim, razor-sharp arcane energy bursts.',
  },
  {
    id: 'snk_neogeo',
    name: 'SNK Neo Geo',
    era: 'Arcade 16-Bit Clásico',
    description: 'Dithering artesanal sutil, tonos terrosos y metálicos cálidos con brillo arcade de los 90.',
    palette: ['#120e0a', '#451a03', '#b45309', '#f59e0b', '#dc2626', '#cbd5e1', '#475569', '#fef08a'],
    promptDirective: 'Classic 1990s SNK Neo Geo MVS 16-bit pixel art, subtle checkerboard dithering, gritty warm earth and metallic tones, authentic arcade scanline contrast.',
  },
  {
    id: 'cps2',
    name: 'CPS2',
    era: 'Capcom Arcade Board',
    description: 'Paleta estricta de 15 colores por sprite con alto contraste cromático para fondos cargados.',
    palette: ['#0b0f19', '#1d4ed8', '#00f0ff', '#ff00aa', '#ffea00', '#ef4444', '#22c55e', '#ffffff'],
    promptDirective: 'Capcom CPS-2 16-color indexed sprite palette, punchy primary hues, high readability against detailed arcade backgrounds.',
  },
  {
    id: 'pixel_fantasy',
    name: 'Pixel Fantasy',
    era: 'RPG / Arena Medieval',
    description: 'Acero templado, esmeraldas místicas, madera cálida y magia rúnica dorada.',
    palette: ['#14110f', '#44403c', '#94a3b8', '#e2e8f0', '#16a34a', '#22d3ee', '#eab308', '#991b1b'],
    promptDirective: 'Handcrafted Pixel Fantasy fighting/action RPG sprite style, crisp steel highlights, emerald and arcane gold magic runes, rich wood/leather tones.',
  },
  {
    id: 'pixel_cyberpunk',
    name: 'Pixel Cyberpunk',
    era: 'Neo-Tokyo Synth',
    description: 'Asfalto oscuro azulado con neones cian, fucsia y láseres holográficos de alta saturación.',
    palette: ['#050814', '#0f172a', '#1e293b', '#22d3ee', '#f43f5e', '#d946ef', '#a3e635', '#f8fafc'],
    promptDirective: 'Cyberpunk pixel art aesthetic, deep midnight shadows with intense cyan, hot pink, and lime neon rim-lighting and holographic glitch accents.',
  },
];

export function analyzeProjectContext(project: ProjectState): ProjectContextAnalysis;
export function analyzeProjectContext(
  frames: Frame[],
  width: number,
  height: number,
  activePaletteColors: string[],
  layerGroups: LayerGroup[],
  currentFrameIndex: number
): ProjectContextAnalysis;
export function analyzeProjectContext(
  framesOrProject: Frame[] | ProjectState,
  widthArg?: number,
  heightArg?: number,
  activePaletteColorsArg?: string[],
  layerGroupsArg?: LayerGroup[],
  currentFrameIndexArg?: number
): ProjectContextAnalysis {
  const isProject = !Array.isArray(framesOrProject);
  const frames = isProject ? framesOrProject.frames : framesOrProject;
  const width = isProject ? framesOrProject.width : widthArg ?? 48;
  const height = isProject ? framesOrProject.height : heightArg ?? 48;
  const activePaletteColors = isProject
    ? framesOrProject.activePaletteColors || []
    : activePaletteColorsArg || [];
  const layerGroups = isProject
    ? framesOrProject.layerGroups || []
    : layerGroupsArg || [];
  const currentFrameIndex = isProject
    ? framesOrProject.currentFrameIndex
    : currentFrameIndexArg ?? 0;

  const colorCounts = new Map<string, number>();
  for (const frame of frames) {
    for (const layer of frame.layers) {
      if (!layer.visible || layer.layerType === 'temp') continue;
      for (let y = 0; y < layer.pixels.length; y++) {
        for (let x = 0; x < (layer.pixels[y]?.length || 0); x++) {
          const c = layer.pixels[y][x];
          if (c) {
            const norm = c.toLowerCase();
            colorCounts.set(norm, (colorCounts.get(norm) || 0) + 1);
          }
        }
      }
    }
  }

  const sortedColors = [...colorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([hex]) => hex);

  const uniqueColors = sortedColors.length;
  const palette =
    activePaletteColors && activePaletteColors.length > 0
      ? activePaletteColors.slice(0, 12)
      : sortedColors.slice(0, 12);

  let visualStyle = '16-Bit Arcade Fighter';
  if (width <= 24 || uniqueColors <= 6) {
    visualStyle = '8-Bit Retro Compacto';
  } else if (width >= 64 || uniqueColors > 24) {
    visualStyle = 'HD Pixel Art Detallado';
  } else if (uniqueColors >= 10) {
    visualStyle = 'CPS-2 / Neo-Geo Pixel Art';
  }

  // Detect silhouette bounds, shading type, and outline thickness across current frame
  const curFrame = frames[currentFrameIndex] || frames[0];
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let borderPixels = 0;
  let darkOutlinePixels = 0;
  let adjacentDifferentNeighbors = 0;
  let totalFilled = 0;

  const isDarkHex = (hex: string) => {
    const [r, g, b] = hexToRgb(hex);
    return 0.299 * r + 0.587 * g + 0.114 * b < 68;
  };

  if (curFrame) {
    const composed: (string | null)[][] = Array.from({ length: height }, () => new Array(width).fill(null));
    for (const layer of curFrame.layers) {
      if (!layer.visible || layer.layerType === 'temp' || layer.layerType === 'adjustment') continue;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const c = layer.pixels[y]?.[x];
          if (c) composed[y][x] = c;
        }
      }
    }
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const c = composed[y][x];
        if (!c) continue;
        totalFilled++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        const touchesEmpty =
          !composed[y - 1]?.[x] ||
          !composed[y + 1]?.[x] ||
          !composed[y]?.[x - 1] ||
          !composed[y]?.[x + 1];
        if (touchesEmpty) {
          borderPixels++;
          if (isDarkHex(c)) darkOutlinePixels++;
        }
        const right = composed[y]?.[x + 1];
        if (right && right.toLowerCase() !== c.toLowerCase()) {
          adjacentDifferentNeighbors++;
        }
      }
    }
  }

  const lineThickness =
    borderPixels === 0
      ? 1
      : darkOutlinePixels / Math.max(1, borderPixels) > 0.45
      ? width >= 64
        ? 2
        : 1
      : 0;

  const ditherRatio = totalFilled > 0 ? adjacentDifferentNeighbors / totalFilled : 0;
  const shadingType: 'flat' | 'cel' | 'gradient_dither' =
    uniqueColors <= 4 ? 'flat' : ditherRatio > 0.42 ? 'gradient_dither' : 'cel';

  const characterBounds =
    maxX >= minX && maxY >= minY ? { w: maxX - minX + 1, h: maxY - minY + 1 } : null;

  const group = layerGroups.find((g) => g.id === curFrame?.groupId);
  const phase = curFrame?.phase || 'neutral';
  const hasHitbox = (curFrame?.hitboxes || []).some((h) => h.type === 'hitbox');
  const animationType = group
    ? `${group.name} (${phase})`
    : hasHitbox || phase === 'active'
    ? 'Ataque / Impacto Activo'
    : phase === 'startup'
    ? 'Anticipación (Startup)'
    : phase === 'recovery'
    ? 'Recuperación (Recovery)'
    : 'Guardia / Idle';

  return {
    visualStyle,
    activePalette: palette,
    resolution: `${width}×${height} px`,
    uniqueColors,
    animationType,
    gameGenre: '2D Fighting Game',
    lineThickness,
    shadingType,
    characterBounds,
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? `${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`
      : clean.padEnd(6, '0').slice(0, 6);
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const cr = Math.max(0, Math.min(255, Math.round(r)));
  const cg = Math.max(0, Math.min(255, Math.round(g)));
  const cb = Math.max(0, Math.min(255, Math.round(b)));
  return `#${((1 << 24) + (cr << 16) + (cg << 8) + cb).toString(16).slice(1)}`;
}

function findNearestColor(hex: string, palette: string[]): string {
  if (!palette.length) return hex;
  const [r1, g1, b1] = hexToRgb(hex);
  let best = palette[0];
  let bestDist = Infinity;
  for (const cand of palette) {
    const [r2, g2, b2] = hexToRgb(cand);
    const d = (r1 - r2) * (r1 - r2) + (g1 - g2) * (g1 - g2) + (b1 - b2) * (b1 - b2);
    if (d < bestDist) {
      bestDist = d;
      best = cand;
    }
  }
  return best;
}

export function applyContextualStyleToGrid(
  grid: (string | null)[][],
  styleMode: AiContextualMode,
  profileId: AiExternalProfileId,
  blendRatio: number = 0.5,
  projectPalette: string[] = []
): (string | null)[][] {
  const profile = AI_EXTERNAL_PROFILES.find((p) => p.id === profileId) || AI_EXTERNAL_PROFILES[0];
  if (styleMode === 'keep') {
    if (projectPalette.length < 2) return grid.map((r) => [...r]);
    return grid.map((row) =>
      row.map((c) => (c ? findNearestColor(c, projectPalette) : null))
    );
  }
  if (styleMode === 'adapt') {
    return grid.map((row) =>
      row.map((c) => (c ? findNearestColor(c, profile.palette) : null))
    );
  }
  // blend mode: mix original/project palette with external profile palette
  const ratio = Math.max(0, Math.min(1, blendRatio));
  const combinedPalette = projectPalette.length > 0 ? projectPalette : profile.palette;
  return grid.map((row) =>
    row.map((c) => {
      if (!c) return null;
      const a = findNearestColor(c, combinedPalette);
      const b = findNearestColor(c, profile.palette);
      const [ra, ga, ba] = hexToRgb(a);
      const [rb, gb, bb] = hexToRgb(b);
      return rgbToHex(
        ra + (rb - ra) * ratio,
        ga + (gb - ga) * ratio,
        ba + (bb - ba) * ratio
      );
    })
  );
}
