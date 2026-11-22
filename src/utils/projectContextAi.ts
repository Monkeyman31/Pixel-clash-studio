import {
  AiCoherenceLevel,
  AiContextualMode,
  AiExplanationReport,
  AiExternalProfileId,
  AiPixelValidationStats,
  AiPoseFidelityLevel,
  Frame,
  LayerGroup,
  ProjectAiTrainingProfile,
  ProjectContextAnalysis,
  ProjectState,
  ReferenceItem,
} from '../types';

export interface AiExternalStyleProfile {
  id: AiExternalProfileId;
  name: string;
  era: string;
  outlinePx: number;
  shading: 'flat' | 'cel' | 'gradient_dither';
  description: string;
  palette: string[];
  promptDirective: string;
  stageMotif: string;
  hudMotif: string;
  vfxMotif: string;
}

export const AI_EXTERNAL_PROFILES: AiExternalStyleProfile[] = [
  {
    id: 'nes',
    name: 'NES',
    era: '8-Bit Consola (1985)',
    outlinePx: 1,
    shading: 'flat',
    description: 'Paleta ultra compacta de 4 colores por sprite/tile, contraste alto y dithering geométrico 8-bit.',
    palette: ['#0f0f0f', '#f83800', '#ffa044', '#fcfcfc', '#0058f8', '#3cbcfc', '#00a800', '#d82800'],
    promptDirective: 'Authentic 8-bit NES Famicom pixel art style: strict 3-4 colors per sprite ramp, pure flat/blocky pixel clusters, hard 1px black outlines, zero anti-aliasing.',
    stageMotif: '8-bit scrolling sky bands, repeating brick blocks and dithered moon',
    hudMotif: 'Minimal 4-color segmented block health gauge on dark solid top band',
    vfxMotif: 'Sharp 4-color 8-bit geometric starbursts and crisp flicker embers',
  },
  {
    id: 'gameboy',
    name: 'Game Boy',
    era: '8-Bit Portátil DMG-01',
    outlinePx: 1,
    shading: 'flat',
    description: 'Cuatro tonos verde oliva clásicos (DMG) o bolsillo de altísima legibilidad con trama Bayer.',
    palette: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
    promptDirective: 'Classic Nintendo Game Boy DMG-01 4-shade olive-green monochrome pixel art: strict 4-tone luminance quantization (#0f380f, #306230, #8bac0f, #9bbc0f) and crisp 2x2 Bayer dithering.',
    stageMotif: '4-tone olive silhouette dojo pillars and Bayer-dithered clouds',
    hudMotif: 'Compact monochrome 4-tone segmented top bar and crisp block timer',
    vfxMotif: 'Pure 4-shade olive impact crosshairs and dithered dust puffs',
  },
  {
    id: 'snes',
    name: 'SNES',
    era: '16-Bit Consola Dorada',
    outlinePx: 1,
    shading: 'cel',
    description: 'Ricos degradados 16-bit de 12-15 colores, iluminación cálida y contornos oscuros tintados (hue-shifting).',
    palette: ['#181028', '#3c2a4d', '#6e4c75', '#d97706', '#fde047', '#16a34a', '#38bdf8', '#f8fafc'],
    promptDirective: 'Classic 16-bit Super Nintendo (SNES) era pixel art: 12-15 color hue-shifted shading ramps, crisp 1px tinted dark outlines, warm expressive fantasy/arcade readability.',
    stageMotif: 'Layered 16-bit parallax clouds, temple eaves and stone floorboards',
    hudMotif: 'Warm gold-trimmed 16-bit emerald/crimson gauges with shadowed numerals',
    vfxMotif: 'Vibrant 16-bit multi-hue flame arcs and soft cel sparks',
  },
  {
    id: 'sega_genesis',
    name: 'SEGA Genesis',
    era: '16-Bit Mega Drive',
    outlinePx: 1,
    shading: 'gradient_dither',
    description: 'Alto contraste metálico, azules eléctricos profundos y tramas checkerboard características de Mega Drive.',
    palette: ['#080c18', '#1e293b', '#1d4ed8', '#38bdf8', '#dc2626', '#f59e0b', '#cbd5e1', '#ffffff'],
    promptDirective: '16-bit SEGA Genesis / Mega Drive pixel art style: bold metallic speculars, punchy cobalt and crimson contrast, intentional vertical/checkerboard dithering.',
    stageMotif: 'Industrial steel girders, twilight city skyline and checkerboard floor reflections',
    hudMotif: 'Sleek cobalt and silver beveled Genesis bars with angular timer',
    vfxMotif: 'High-contrast electric cyan/amber shockwaves with checkerboard trails',
  },
  {
    id: 'cps1',
    name: 'CPS1',
    era: 'Capcom Arcade 1988–1992',
    outlinePx: 1,
    shading: 'cel',
    description: 'Estilo arcade temprano (Street Fighter II / Final Fight): volúmenes sólidos, piel cálida y sombreado directo.',
    palette: ['#110c14', '#4a2511', '#c2410c', '#fbbf24', '#2563eb', '#dc2626', '#e2e8f0', '#ffffff'],
    promptDirective: 'Early Capcom CPS-1 arcade pixel art (SF2 World Warrior / Final Fight): chunky anatomical volume, firm 1px black outlines, bold sunlit primary palette.',
    stageMotif: 'Iconic street arena barrel props, tiled pavement and sunset sky',
    hudMotif: 'Iconic CPS-1 solid yellow health bars on bold red damaged backdrop with center KO box',
    vfxMotif: 'Punchy white-core orange/blue arcade impact flashes and fireballs',
  },
  {
    id: 'cps2',
    name: 'CPS2',
    era: 'Capcom Arcade 1994–2000',
    outlinePx: 1,
    shading: 'cel',
    description: 'Paleta vibrante de 15 colores por sprite con alto contraste cromático para destacar sobre fondos cargados.',
    palette: ['#0b0f19', '#1d4ed8', '#00f0ff', '#ff00aa', '#ffea00', '#ef4444', '#22c55e', '#ffffff'],
    promptDirective: 'Capcom CPS-2 16-color indexed arcade sprite aesthetic: saturated cel-shaded ramps, bright cyan/yellow/magenta accents, tournament readability against busy stages.',
    stageMotif: 'Saturated arcade arena with ornate banners, depth floor tiles and dynamic sky',
    hudMotif: 'Tournament CPS-2 yellow/cyan beveled life bars, framed KO emblem and glowing Super bar',
    vfxMotif: 'Crisp multi-layered plasma cyan/yellow/magenta energy bursts',
  },
  {
    id: 'snk_neogeo',
    name: 'Neo Geo',
    era: 'SNK Neo Geo MVS (16-Bit)',
    outlinePx: 1,
    shading: 'gradient_dither',
    description: 'Dithering artesanal sutil, tonos terrosos, cuero y aceros cálidos con brillo arcade de los 90.',
    palette: ['#120e0a', '#451a03', '#b45309', '#f59e0b', '#dc2626', '#cbd5e1', '#475569', '#fef08a'],
    promptDirective: '1990s SNK Neo Geo MVS pixel art: gritty warm earth and metallic tones, subtle artisanal dithering, authentic leather/steel textures and arcade contrast.',
    stageMotif: 'Detailed Neo Geo port/dojo architecture with dramatic warm/cool horizon and parallax floor',
    hudMotif: 'Brushed gunmetal Neo Geo steel plates with amber/crimson segmented gauges and digital timer',
    vfxMotif: 'Gritty amber, flame-red and bright white spark clusters with smoke wisps',
  },
  {
    id: 'kof',
    name: 'King of Fighters',
    era: 'SNK Arcade / KOF XIII',
    outlinePx: 1,
    shading: 'cel',
    description: 'Anatomía estilizada arcade, sombreado firme, fuego dorado/carmesí y contorno oscuro limpio.',
    palette: ['#0d0914', '#2e1f3d', '#f59e0b', '#ef4444', '#fde047', '#f8fafc', '#38bdf8', '#991b1b'],
    promptDirective: 'The King of Fighters arcade pixel art aesthetic: crisp 1px dark outlines, dramatic directional rim light, dynamic Neo-Geo fighting silhouettes and blazing gold/crimson accents.',
    stageMotif: 'Grand tournament arena spotlights, crimson banners and deep perspective stone floor',
    hudMotif: 'Slanted KOF brushed-gold & crimson life gauges with glowing amber MAX power bar',
    vfxMotif: 'Aggressive blazing gold-to-crimson flame slashes and crescent sparks',
  },
  {
    id: 'sf_alpha',
    name: 'Street Fighter Alpha',
    era: 'Capcom CPS-2 Anime',
    outlinePx: 1,
    shading: 'cel',
    description: 'Proporciones robustas anime, colores cel saturados de alta visibilidad y destellos plasma.',
    palette: ['#090d16', '#1e3a8a', '#3b82f6', '#22d3ee', '#fbbf24', '#ef4444', '#ffffff', '#f97316'],
    promptDirective: 'Street Fighter Alpha 3 CPS-2 anime pixel art style: expressive athletic proportions, clean two-tone cel shading, bold cobalt/amber/cyan tournament readability.',
    stageMotif: 'Bold anime dojo/hangar silhouettes with dramatic diagonal clouds and clean mat floor',
    hudMotif: 'Clean slanted Alpha blue/gold gauges, circular portrait brackets and segmented Super bar',
    vfxMotif: 'Dynamic azure/white Hadoken plasma waves and crisp comic-like hit flashes',
  },
  {
    id: 'darkstalkers',
    name: 'Darkstalkers',
    era: 'Capcom Gótico CPS-2',
    outlinePx: 1,
    shading: 'cel',
    description: 'Fantasía oscura expresiva, púrpuras profundos, verdes ectoplasma y deformaciones squash & stretch.',
    palette: ['#0b0614', '#3b0764', '#9333ea', '#ec4899', '#10b981', '#bef264', '#fde047', '#e2e8f0'],
    promptDirective: 'Darkstalkers Vampire Savior pixel art style: exaggerated gothic arcade silhouette, saturated violet/magenta shadows and eerie emerald/lime highlights.',
    stageMotif: 'Moonlit gothic cathedral arches, eerie mist, stained glass glow and cobblestone floor',
    hudMotif: 'Ornate gothic violet/crimson curved gauges with eerie emerald jewel Super meter',
    vfxMotif: 'Spectral violet/emerald ectoplasm claws, bat-wing energy arcs and acid glow',
  },
  {
    id: 'metal_slug',
    name: 'Metal Slug',
    era: 'SNK Nazca Pixel Obra Maestra',
    outlinePx: 1,
    shading: 'gradient_dither',
    description: 'Riqueza artesanal extrema, texturas orgánicas/mecánicas, óxido, polvo cálido y animación fluida.',
    palette: ['#18120e', '#4d3b2b', '#78716c', '#a3a3a3', '#ca8a04', '#ea580c', '#65a30d', '#fef08a'],
    promptDirective: 'Metal Slug SNK/Nazca masterclass pixel art: dense weathered metallic/fabric micro-texture, warm olive drab, rust, smoky orange explosions and expressive squash-stretch.',
    stageMotif: 'Weathered military ruins, sandbags, rusted steel trusses and textured desert ruins',
    hudMotif: 'Tactical stencil olive/brass arcade HUD frame with rugged bullet/meter pips',
    vfxMotif: 'Rich billowing orange-yellow smoke clouds, debris chunks and explosive shrapnel sparks',
  },
  {
    id: 'guilty_gear',
    name: 'Guilty Gear',
    era: 'Arc System Works',
    outlinePx: 2,
    shading: 'cel',
    description: 'Estilo anime heavy-metal de alto contraste, cel-shading afilado y chispas neón magenta/cian.',
    palette: ['#080a10', '#1e1b4b', '#db2777', '#a855f7', '#06b6d4', '#facc15', '#ffffff', '#dc2626'],
    promptDirective: 'Guilty Gear anime fighting game pixel aesthetic: bold 1-2px razor-sharp outlines, deep heavy-metal black shadows, angular cel highlights and electric magenta/cyan energy.',
    stageMotif: 'Industrial cathedral gears, dramatic spotlight beams and metallic grated arena floor',
    hudMotif: 'Angular heavy-metal crimson/silver tension gauges with spiked center timer and Burst icon',
    vfxMotif: 'Razor-sharp magenta/cyan Tension slashes, lightning fractures and Roman Cancel shock rings',
  },
  {
    id: 'blazblue',
    name: 'BlazBlue',
    era: 'HD 2D Anime Fighter',
    outlinePx: 2,
    shading: 'cel',
    description: 'Trazos nítidos tipo HD sprite con gradientes fríos azules, acentos dorados y auras arcanas.',
    palette: ['#070d1c', '#172554', '#2563eb', '#60a5fa', '#e0f2fe', '#f59e0b', '#c026d3', '#ffffff'],
    promptDirective: 'BlazBlue 2D HD anime fighter sprite aesthetic: refined crystal-blue and royal indigo lighting, ornate gold trim, crisp 1-2px ink-like contours and arcane geometric seals.',
    stageMotif: 'Crystal spires, astral blue runes in night sky and polished marble sanctuary floor',
    hudMotif: 'Crystalline azure and gold filigree HD life gauges with glowing astral Heat meter',
    vfxMotif: 'Crystalline blue/violet Distortion Drive glyphs, ice/azure shards and astral flares',
  },
  {
    id: 'pixel_fantasy',
    name: 'Pixel Fantasy',
    era: 'RPG / Arena Medieval',
    outlinePx: 1,
    shading: 'cel',
    description: 'Acero templado, esmeraldas místicas, madera cálida y magia rúnica dorada.',
    palette: ['#14110f', '#44403c', '#94a3b8', '#e2e8f0', '#16a34a', '#22d3ee', '#eab308', '#991b1b'],
    promptDirective: 'Handcrafted Pixel Fantasy action/fighting sprite aesthetic: crisp tempered steel highlights, vibrant emerald & arcane gold magic runes, rich leather/wood warmth.',
    stageMotif: 'Medieval stone castle battlements, emerald torchlight, banners and flagstones',
    hudMotif: 'Medieval wrought-iron & gold filigree bars with ruby/emerald crystal mana bar',
    vfxMotif: 'Runic golden light circles, emerald wind blades and enchanted embers',
  },
  {
    id: 'pixel_scifi',
    name: 'Pixel Sci-Fi',
    era: 'Neo-Tokyo / Futurista',
    outlinePx: 1,
    shading: 'cel',
    description: 'Asfalto oscuro azulado con neones cian, fucsia y láseres holográficos de alta saturación.',
    palette: ['#050814', '#0f172a', '#1e293b', '#22d3ee', '#f43f5e', '#d946ef', '#a3e635', '#f8fafc'],
    promptDirective: 'Sci-Fi Cyberpunk pixel art aesthetic: deep obsidian/slate shadows lit by intense cyan, neon magenta and laser lime rim lighting with holographic tech accents.',
    stageMotif: 'Rain-slicked futuristic rooftop, glowing holographic billboards and neon grid deck',
    hudMotif: 'Sleek translucent-look cyan/magenta HUD visor brackets, digital timer and plasma bar',
    vfxMotif: 'Holographic cyan/magenta laser beams, digital spark shards and plasma waves',
  },
  {
    id: 'pixel_rpg',
    name: 'Pixel RPG',
    era: 'JRPG / Aventura Clásica',
    outlinePx: 1,
    shading: 'cel',
    description: 'Tonos equilibrados y legibles estilo JRPG clásico, sombreado amable y paleta cromática coherente.',
    palette: ['#1a1625', '#4b3b5c', '#c2855a', '#f2c9a0', '#3b82f6', '#22c55e', '#ef4444', '#fef08a'],
    promptDirective: 'Classic Pixel RPG sprite art style: clean warm skin/cloth shading, 1px soft dark sepia/indigo outlines, readable charming proportions and harmonious color ramps.',
    stageMotif: 'Scenic RPG cobblestone plaza, timber inns, sunlit foliage and horizon hills',
    hudMotif: 'Ornate blue/gold JRPG window-framed status bars with crisp pixel border',
    vfxMotif: 'Bright RPG spell rings, healing sparkles and clean elemental slash trails',
  },
];

export function normalizeProfileId(id?: string): AiExternalProfileId {
  if (!id) return 'kof';
  if (id === 'pixel_cyberpunk') return 'pixel_scifi';
  const found = AI_EXTERNAL_PROFILES.find((p) => p.id === id);
  return found ? found.id : 'kof';
}

export function getAiStyleProfile(id?: string): AiExternalStyleProfile {
  const norm = normalizeProfileId(id);
  return AI_EXTERNAL_PROFILES.find((p) => p.id === norm) || AI_EXTERNAL_PROFILES[7]; // kof default
}

export function hexToRgb(hex: string): [number, number, number] {
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

export function rgbToHex(r: number, g: number, b: number): string {
  const cr = Math.max(0, Math.min(255, Math.round(r)));
  const cg = Math.max(0, Math.min(255, Math.round(g)));
  const cb = Math.max(0, Math.min(255, Math.round(b)));
  return `#${((1 << 24) + (cr << 16) + (cg << 8) + cb).toString(16).slice(1)}`;
}

export function normalizeHexColor(color: string | null | undefined): string | null {
  if (!color || typeof color !== 'string') return null;
  const trimmed = color.trim().toLowerCase();
  if (trimmed === 'transparent' || trimmed === 'none') return null;
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed;
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
  }
  if (/^#[0-9a-f]{8}$/i.test(trimmed)) {
    const alpha = parseInt(trimmed.slice(7, 9), 16);
    if (alpha < 96) return null; // eliminate faint semi-transparent anti-alias smudge
    return `#${trimmed.slice(1, 7)}`;
  }
  const rgba = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/);
  if (rgba) {
    const a = rgba[4] !== undefined ? parseFloat(rgba[4]) : 1;
    if (a < 0.38) return null;
    return rgbToHex(Number(rgba[1]), Number(rgba[2]), Number(rgba[3]));
  }
  return null;
}

export function findNearestColor(hex: string, palette: string[]): string {
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

function getLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function inferStyleProfileFromStats(
  width: number,
  uniqueColors: number,
  sortedColors: string[],
  ditherRatio: number,
  lineThickness: number
): { profileId: AiExternalProfileId; visualStyle: string; era: string } {
  const topPalette = sortedColors.slice(0, 12);

  // Check for Game Boy monochrome green-olive cluster
  const isOliveMonochrome =
    uniqueColors > 0 &&
    uniqueColors <= 5 &&
    topPalette.every((hex) => {
      const [r, g, b] = hexToRgb(hex);
      return g >= r - 12 && g >= b + 6 && Math.abs(r - b) < 75;
    });
  if (isOliveMonochrome) {
    const prof = getAiStyleProfile('gameboy');
    return { profileId: 'gameboy', visualStyle: prof.name, era: prof.era };
  }

  // Classic NES 8-Bit compact resolution / color budget
  if (width <= 24 || (uniqueColors > 0 && uniqueColors <= 6)) {
    const prof = getAiStyleProfile('nes');
    return { profileId: 'nes', visualStyle: prof.name, era: prof.era };
  }

  // Analyze dominant chromatic traits
  let neonCount = 0;
  let warmEarthCount = 0;
  let azureCount = 0;
  let gothicPurpleCount = 0;

  for (const hex of topPalette) {
    const [r, g, b] = hexToRgb(hex);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max > 0 ? (max - min) / max : 0;
    if (sat > 0.72 && (b > 200 || (r > 200 && b > 140))) neonCount++;
    if (r > g + 15 && g > b + 5 && r < 220) warmEarthCount++;
    if (b > r + 40 && b > 140) azureCount++;
    if (r > 95 && b > 115 && g < Math.min(r, b) - 18) gothicPurpleCount++;
  }

  if (width >= 72 || uniqueColors >= 30) {
    if (azureCount >= 3) {
      const prof = getAiStyleProfile('blazblue');
      return { profileId: 'blazblue', visualStyle: prof.name, era: prof.era };
    }
    if (lineThickness >= 2 || neonCount >= 2) {
      const prof = getAiStyleProfile('guilty_gear');
      return { profileId: 'guilty_gear', visualStyle: prof.name, era: prof.era };
    }
  }

  if (neonCount >= 3) {
    const prof = getAiStyleProfile('pixel_scifi');
    return { profileId: 'pixel_scifi', visualStyle: prof.name, era: prof.era };
  }

  if (gothicPurpleCount >= 2) {
    const prof = getAiStyleProfile('darkstalkers');
    return { profileId: 'darkstalkers', visualStyle: prof.name, era: prof.era };
  }

  if (ditherRatio > 0.42 && warmEarthCount >= 2) {
    const prof = getAiStyleProfile('snk_neogeo');
    return { profileId: 'snk_neogeo', visualStyle: prof.name, era: prof.era };
  }

  if (ditherRatio > 0.36) {
    const prof = getAiStyleProfile('sega_genesis');
    return { profileId: 'sega_genesis', visualStyle: prof.name, era: prof.era };
  }

  if (uniqueColors >= 14 && uniqueColors <= 22) {
    const prof = getAiStyleProfile('cps2');
    return { profileId: 'cps2', visualStyle: prof.name, era: prof.era };
  }

  if (uniqueColors >= 7 && uniqueColors <= 13) {
    const prof = getAiStyleProfile('snes');
    return { profileId: 'snes', visualStyle: prof.name, era: prof.era };
  }

  const prof = getAiStyleProfile('kof');
  return { profileId: 'kof', visualStyle: prof.name, era: prof.era };
}

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
  let semiTransparentPixels = 0;
  let totalAlphaChecked = 0;

  for (const frame of frames) {
    for (const layer of frame.layers) {
      if (!layer.visible || layer.layerType === 'temp') continue;
      for (let y = 0; y < layer.pixels.length; y++) {
        for (let x = 0; x < (layer.pixels[y]?.length || 0); x++) {
          const raw = layer.pixels[y][x];
          if (!raw) continue;
          totalAlphaChecked++;
          if (/^#[0-9a-f]{8}$/i.test(raw) && raw.slice(7, 9).toLowerCase() !== 'ff') {
            semiTransparentPixels++;
          } else if (raw.startsWith('rgba')) {
            semiTransparentPixels++;
          }
          const c = normalizeHexColor(raw);
          if (c) {
            colorCounts.set(c, (colorCounts.get(c) || 0) + 1);
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
    sortedColors.length > 0
      ? sortedColors.slice(0, 16)
      : activePaletteColors && activePaletteColors.length > 0
      ? activePaletteColors.slice(0, 16)
      : getAiStyleProfile('kof').palette;

  // Analyze current frame silhouette, outline, light direction, shading & AA
  const curFrame = frames[currentFrameIndex] || frames[0];
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let borderPixels = 0;
  let darkOutlinePixels = 0;
  let secondRingDarkPixels = 0;
  let adjacentDifferentNeighbors = 0;
  let totalFilled = 0;
  let weightedLightX = 0;
  let weightedLightY = 0;
  let totalLightMass = 0;
  let edgeRimBright = 0;

  const composed: (string | null)[][] = Array.from({ length: height }, () => new Array(width).fill(null));
  if (curFrame) {
    for (const layer of curFrame.layers) {
      if (!layer.visible || layer.layerType === 'temp' || layer.layerType === 'adjustment') continue;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const c = normalizeHexColor(layer.pixels[y]?.[x]);
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

        const lum = getLuminance(c);
        weightedLightX += x * (lum / 255);
        weightedLightY += y * (lum / 255);
        totalLightMass += lum / 255;

        const touchesEmpty =
          !composed[y - 1]?.[x] ||
          !composed[y + 1]?.[x] ||
          !composed[y]?.[x - 1] ||
          !composed[y]?.[x + 1];
        if (touchesEmpty) {
          borderPixels++;
          if (lum < 72) darkOutlinePixels++;
          else if (lum > 185) edgeRimBright++;
        } else {
          // check if interior pixel next to border is dark (indicates 2px outline)
          const nearBorder =
            !composed[y - 2]?.[x] ||
            !composed[y + 2]?.[x] ||
            !composed[y]?.[x - 2] ||
            !composed[y]?.[x + 2];
          if (nearBorder && lum < 68) secondRingDarkPixels++;
        }

        const right = composed[y]?.[x + 1];
        const down = composed[y + 1]?.[x];
        if (right && right !== c) adjacentDifferentNeighbors++;
        if (down && down !== c) adjacentDifferentNeighbors++;
      }
    }
  }

  const borderDarkRatio = borderPixels > 0 ? darkOutlinePixels / borderPixels : 0;
  const lineThickness =
    borderPixels === 0
      ? 1
      : borderDarkRatio > 0.42
      ? secondRingDarkPixels / Math.max(1, borderPixels) > 0.35 || width >= 96
        ? 2
        : 1
      : 0;

  const ditherRatio = totalFilled > 0 ? adjacentDifferentNeighbors / (totalFilled * 2) : 0;
  const shadingType: 'flat' | 'cel' | 'gradient_dither' =
    uniqueColors <= 5 ? 'flat' : ditherRatio > 0.36 ? 'gradient_dither' : 'cel';

  const antiAliasLevel: 'none' | 'subtle' | 'heavy' =
    totalAlphaChecked === 0
      ? 'none'
      : semiTransparentPixels / totalAlphaChecked > 0.08
      ? 'heavy'
      : semiTransparentPixels > 0
      ? 'subtle'
      : 'none';

  const characterBounds =
    maxX >= minX && maxY >= minY ? { w: maxX - minX + 1, h: maxY - minY + 1 } : null;

  // Compute dominant light direction from luminance centroid vs bounds center
  let lightDirection: ProjectContextAnalysis['lightDirection'] = 'top-left';
  if (characterBounds && totalLightMass > 0) {
    const cx = minX + characterBounds.w / 2;
    const cy = minY + characterBounds.h / 2;
    const lx = weightedLightX / totalLightMass;
    const ly = weightedLightY / totalLightMass;
    const normDx = (lx - cx) / Math.max(1, characterBounds.w * 0.5);
    const normDy = (ly - cy) / Math.max(1, characterBounds.h * 0.5);

    if (edgeRimBright / Math.max(1, borderPixels) > 0.25) {
      lightDirection = 'rim';
    } else if (normDy < -0.1) {
      lightDirection = normDx < -0.12 ? 'top-left' : normDx > 0.12 ? 'top-right' : 'top';
    } else {
      lightDirection = 'front';
    }
  }

  const detailLevel: ProjectContextAnalysis['detailLevel'] =
    width <= 24 || uniqueColors <= 5
      ? 'low'
      : width >= 96 || uniqueColors >= 32
      ? 'ultra'
      : width >= 48 && uniqueColors >= 14
      ? 'high'
      : 'medium';

  const inferred = inferStyleProfileFromStats(width, uniqueColors, sortedColors, ditherRatio, lineThickness);

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
    visualStyle: inferred.visualStyle,
    detectedProfileId: inferred.profileId,
    era: inferred.era,
    activePalette: palette,
    resolution: `${width}×${height} px`,
    uniqueColors,
    animationType,
    gameGenre: '2D Fighting Game',
    lineThickness,
    shadingType,
    antiAliasLevel,
    lightDirection,
    detailLevel,
    characterBounds,
  };
}

/**
 * Analyzes an external uploaded or guide reference image to extract real visual style,
 * palette, outline width, shading type, anti-alias presence, light direction & detail level.
 */
export function analyzeReferenceImageDataUrl(dataUrl: string): Promise<ProjectContextAnalysis | null> {
  return new Promise((resolve) => {
    if (!dataUrl || typeof document === 'undefined') {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const sampleW = Math.min(96, Math.max(16, img.naturalWidth || 48));
      const sampleH = Math.min(96, Math.max(16, img.naturalHeight || 48));
      const canvas = document.createElement('canvas');
      canvas.width = sampleW;
      canvas.height = sampleH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, sampleW, sampleH);
      const data = ctx.getImageData(0, 0, sampleW, sampleH).data;
      const grid: (string | null)[][] = Array.from({ length: sampleH }, () => new Array(sampleW).fill(null));
      for (let y = 0; y < sampleH; y++) {
        for (let x = 0; x < sampleW; x++) {
          const i = (y * sampleW + x) * 4;
          if (data[i + 3] >= 96) {
            grid[y][x] = rgbToHex(data[i], data[i + 1], data[i + 2]);
          }
        }
      }
      const fakeFrame: Frame = {
        id: 'ref-sample',
        name: 'Reference',
        durationTicks: 6,
        phase: 'neutral',
        hitboxes: [],
        layers: [
          {
            id: 'ref-layer',
            name: 'Ref',
            visible: true,
            locked: false,
            opacity: 1,
            pixels: grid,
          },
        ],
      };
      const analysis = analyzeProjectContext(
        [fakeFrame],
        img.naturalWidth || sampleW,
        img.naturalHeight || sampleH,
        [],
        [],
        0
      );
      resolve({
        ...analysis,
        resolution: `${img.naturalWidth || sampleW}×${img.naturalHeight || sampleH} px`,
      });
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/**
 * Trains an adaptive AI baseline profile from ALL sprites, stage layers, HUD layers,
 * FX layers, and guide references in the current project.
 */
export function trainAiOnCurrentProject(
  project: ProjectState,
  references: ReferenceItem[] = []
): ProjectAiTrainingProfile {
  const baseAnalysis = analyzeProjectContext(project);
  const masterCounts = new Map<string, number>();

  let spriteLayerCount = 0;
  let stageLayerCount = 0;
  let hudLayerCount = 0;
  let fxLayerCount = 0;

  for (const frame of project.frames) {
    for (const layer of frame.layers) {
      if (!layer.visible || layer.layerType === 'temp') continue;
      const lower = (layer.name || '').toLowerCase();
      if (lower.includes('[escenario]') || lower.includes('[stage]') || lower.includes('fondo')) {
        stageLayerCount++;
      } else if (lower.includes('[hud]') || lower.includes('barra') || lower.includes('ui')) {
        hudLayerCount++;
      } else if (lower.includes('[fx]') || lower.includes('vfx') || layer.fxRecipe) {
        fxLayerCount++;
      } else {
        spriteLayerCount++;
      }

      for (let y = 0; y < layer.pixels.length; y++) {
        for (let x = 0; x < (layer.pixels[y]?.length || 0); x++) {
          const hex = normalizeHexColor(layer.pixels[y][x]);
          if (hex) {
            masterCounts.set(hex, (masterCounts.get(hex) || 0) + 1);
          }
        }
      }
    }
  }

  const masterPalette = [...masterCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24)
    .map(([hex]) => hex);

  const activeReferenceCount = references.filter((r) => r.useAsAiGuide && r.dataUrl).length;

  const summaryParts = [
    `${spriteLayerCount} capas de sprite`,
    stageLayerCount > 0 ? `${stageLayerCount} escenarios` : null,
    hudLayerCount > 0 ? `${hudLayerCount} HUDs` : null,
    fxLayerCount > 0 ? `${fxLayerCount} FX` : null,
    activeReferenceCount > 0 ? `${activeReferenceCount} referencias guía` : null,
  ].filter(Boolean);

  return {
    trainedAt: Date.now(),
    projectName: project.name || 'Proyecto Actual',
    detectedProfileId: baseAnalysis.detectedProfileId,
    visualStyle: baseAnalysis.visualStyle,
    era: baseAnalysis.era,
    masterPalette: masterPalette.length > 0 ? masterPalette : baseAnalysis.activePalette,
    uniqueColors: masterCounts.size || baseAnalysis.uniqueColors,
    lineThickness: baseAnalysis.lineThickness,
    shadingType: baseAnalysis.shadingType,
    antiAliasLevel: baseAnalysis.antiAliasLevel,
    lightDirection: baseAnalysis.lightDirection,
    detailLevel: baseAnalysis.detailLevel,
    spriteLayerCount,
    stageLayerCount,
    hudLayerCount,
    fxLayerCount,
    activeReferenceCount,
    summary: `Entrenado con ${summaryParts.join(', ') || 'lienzo activo'} (${baseAnalysis.visualStyle} · ${masterPalette.length} colores).`,
  };
}

export function applyContextualStyleToGrid(
  grid: (string | null)[][],
  styleMode: AiContextualMode,
  profileId: AiExternalProfileId,
  blendRatio: number = 0.5,
  projectPalette: string[] = [],
  coherenceLevel: AiCoherenceLevel = 'high',
  detectedProfileId?: AiExternalProfileId
): (string | null)[][] {
  const effectiveProfileId =
    styleMode === 'auto_detect' && detectedProfileId ? detectedProfileId : profileId;
  const profile = getAiStyleProfile(effectiveProfileId);

  if (styleMode === 'keep') {
    if (projectPalette.length < 2 || coherenceLevel === 'low') {
      return grid.map((r) => r.map((c) => normalizeHexColor(c)));
    }
    return grid.map((row) =>
      row.map((raw) => {
        const c = normalizeHexColor(raw);
        if (!c) return null;
        return coherenceLevel === 'max' || coherenceLevel === 'high'
          ? findNearestColor(c, projectPalette)
          : c;
      })
    );
  }

  if (styleMode === 'adapt' || styleMode === 'custom' || styleMode === 'auto_detect') {
    if (coherenceLevel === 'low') {
      return grid.map((r) => r.map((c) => normalizeHexColor(c)));
    }
    return grid.map((row) =>
      row.map((raw) => {
        const c = normalizeHexColor(raw);
        return c ? findNearestColor(c, profile.palette) : null;
      })
    );
  }

  // blend mode: mix original/project palette with external profile palette
  const ratio = Math.max(0, Math.min(1, blendRatio));
  const combinedPalette = projectPalette.length > 0 ? projectPalette : profile.palette;
  return grid.map((row) =>
    row.map((raw) => {
      const c = normalizeHexColor(raw);
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

export type AiValidationMode = 'sprite' | 'pose' | 'vfx' | 'stage' | 'hud';

export interface ValidateAiPixelOptions {
  targetPalette?: string[];
  coherenceLevel?: AiCoherenceLevel;
  repairOutlines?: boolean;
  minFragmentSize?: number;
}

/**
 * Post-generation pixel integrity validator & cleanup pass:
 * - Removes isolated 1px orphan noise dots
 * - Fills accidental 1px interior holes inside silhouettes
 * - Prunes disconnected floating micro-fragments (crucial so characters never split into pieces!)
 * - Repairs broken 1px diagonal outline gaps
 * - Normalizes semi-transparent anti-alias smudge into crisp pixels
 */
export function validateAndCleanAiPixelGrid(
  sourceGrid: (string | null)[][],
  mode: AiValidationMode = 'sprite',
  options: ValidateAiPixelOptions = {}
): { grid: (string | null)[][]; stats: AiPixelValidationStats } {
  const height = sourceGrid.length;
  const width = sourceGrid[0]?.length || 0;
  const coherence = options.coherenceLevel || 'high';
  const targetPalette = options.targetPalette || [];

  let removedOrphans = 0;
  let filledHoles = 0;
  let prunedFragments = 0;
  let repairedEdges = 0;
  let quantizedColors = 0;

  // Step 1: Normalize hex colors & strip low-alpha anti-alias smudge
  const work: (string | null)[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (__, x) => {
      const raw = sourceGrid[y]?.[x];
      const norm = normalizeHexColor(raw);
      if (!norm) return null;
      if (
        (coherence === 'max' || (coherence === 'high' && targetPalette.length >= 4)) &&
        targetPalette.length >= 2 &&
        mode !== 'vfx'
      ) {
        const snapped = findNearestColor(norm, targetPalette);
        if (snapped !== norm) quantizedColors++;
        return snapped;
      }
      return norm;
    })
  );

  // Step 2: Fill accidental 1px interior holes (>= 3 opaque orthogonal neighbors)
  const holeSnapshot = work.map((r) => [...r]);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (holeSnapshot[y][x]) continue;
      const neighbors = [
        holeSnapshot[y - 1][x],
        holeSnapshot[y + 1][x],
        holeSnapshot[y][x - 1],
        holeSnapshot[y][x + 1],
      ].filter(Boolean) as string[];

      if (neighbors.length >= 3) {
        // Pick majority/closest neighbor color
        const counts = new Map<string, number>();
        for (const n of neighbors) counts.set(n, (counts.get(n) || 0) + 1);
        const bestColor = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
        work[y][x] = bestColor;
        filledHoles++;
      }
    }
  }

  // Step 3: Repair broken 1px diagonal outline gaps for cohesive sprite / pose contours
  if ((options.repairOutlines ?? true) && (mode === 'pose' || mode === 'sprite')) {
    const edgeSnap = work.map((r) => [...r]);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (edgeSnap[y][x]) continue;
        // Detect pinch corners where diagonal pixels are solid and opposite diagonals are solid-ish silhouette edge
        const tl = edgeSnap[y - 1][x - 1];
        const tr = edgeSnap[y - 1][x + 1];
        const bl = edgeSnap[y + 1][x - 1];
        const br = edgeSnap[y + 1][x + 1];
        const u = edgeSnap[y - 1][x];
        const d = edgeSnap[y + 1][x];
        const l = edgeSnap[y][x - 1];
        const r = edgeSnap[y][x + 1];
        if ((tl && br && !u && !d && !l && !r) || (tr && bl && !u && !d && !l && !r)) {
          const bridge = tl || tr || bl || br;
          if (bridge) {
            work[y][x] = bridge;
            repairedEdges++;
          }
        }
      }
    }
  }

  // Step 4: Remove isolated 1px orphan noise dots
  // (For VFX, preserve intentional sparse trailing sparks unless strict 'max' coherence)
  const removeSingletons = mode !== 'vfx' || coherence === 'max';
  if (removeSingletons) {
    const orphanSnap = work.map((r) => [...r]);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!orphanSnap[y][x]) continue;
        let orthoNeighbors = 0;
        let diagNeighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < height && nx >= 0 && nx < width && orphanSnap[ny][nx]) {
              if (dx === 0 || dy === 0) orthoNeighbors++;
              else diagNeighbors++;
            }
          }
        }
        if (orthoNeighbors === 0 && (mode === 'pose' || mode === 'sprite' ? diagNeighbors <= 1 : diagNeighbors === 0)) {
          work[y][x] = null;
          removedOrphans++;
        }
      }
    }
  }

  // Step 5: Connected-component fragment pruning for character sprites & poses
  // Guarantees a pose/sprite edit does NOT leave tiny detached chopped fragments floating away!
  if (mode === 'pose' || mode === 'sprite') {
    const visited = new Uint8Array(width * height);
    const components: { pts: number[] }[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (visited[idx] || !work[y][x]) continue;
        const pts: number[] = [];
        const stack = [idx];
        visited[idx] = 1;
        while (stack.length > 0) {
          const cur = stack.pop()!;
          pts.push(cur);
          const cy = Math.floor(cur / width);
          const cx = cur % width;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const ny = cy + dy;
              const nx = cx + dx;
              if (ny < 0 || ny >= height || nx < 0 || nx >= width) continue;
              const nIdx = ny * width + nx;
              if (!visited[nIdx] && work[ny][nx]) {
                visited[nIdx] = 1;
                stack.push(nIdx);
              }
            }
          }
        }
        components.push({ pts });
      }
    }

    if (components.length > 1) {
      components.sort((a, b) => b.pts.length - a.pts.length);
      const mainSize = components[0].pts.length;
      const minThreshold = options.minFragmentSize ?? Math.max(3, Math.min(8, Math.round(mainSize * 0.04)));
      for (let i = 1; i < components.length; i++) {
        if (components[i].pts.length < minThreshold) {
          for (const pIdx of components[i].pts) {
            const py = Math.floor(pIdx / width);
            const px = pIdx % width;
            work[py][px] = null;
          }
          prunedFragments += components[i].pts.length;
        }
      }
    }
  }

  let totalPixelsAfter = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (work[y][x]) totalPixelsAfter++;
    }
  }

  return {
    grid: work,
    stats: {
      removedOrphans,
      filledHoles,
      prunedFragments,
      repairedEdges,
      quantizedColors,
      totalPixelsAfter,
    },
  };
}

export function pixelsToGrid(
  pixels: { x: number; y: number; color: string }[],
  width: number,
  height: number
): (string | null)[][] {
  const g: (string | null)[][] = Array.from({ length: height }, () => new Array(width).fill(null));
  for (const p of pixels) {
    const px = Math.round(p.x);
    const py = Math.round(p.y);
    const norm = normalizeHexColor(p.color);
    if (px >= 0 && px < width && py >= 0 && py < height && norm) {
      g[py][px] = norm;
    }
  }
  return g;
}

export function gridToPixels(grid: (string | null)[][]): { x: number; y: number; color: string }[] {
  const list: { x: number; y: number; color: string }[] = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < (grid[y]?.length || 0); x++) {
      const c = grid[y][x];
      if (c) list.push({ x, y, color: c });
    }
  }
  return list;
}

export function buildExplainableAiReport(params: {
  contextAnalysis: ProjectContextAnalysis;
  styleMode: AiContextualMode;
  profileId: AiExternalProfileId;
  coherenceLevel: AiCoherenceLevel;
  poseFidelity?: AiPoseFidelityLevel;
  referenceUsed: string;
  validationStats?: AiPixelValidationStats;
  overrideDetectedStyle?: string;
}): AiExplanationReport {
  const activeProfile = getAiStyleProfile(
    params.styleMode === 'keep' || params.styleMode === 'auto_detect'
      ? params.contextAnalysis.detectedProfileId
      : params.profileId
  );
  const targetStyleLabel =
    params.styleMode === 'keep'
      ? `Mantener actual (${params.contextAnalysis.visualStyle})`
      : params.styleMode === 'auto_detect'
      ? `Autodetectado (${activeProfile.name})`
      : `${activeProfile.name}`;

  const palette =
    params.styleMode === 'keep'
      ? params.contextAnalysis.activePalette
      : activeProfile.palette;

  return {
    detectedStyle: params.overrideDetectedStyle || `${params.contextAnalysis.visualStyle} · ${params.contextAnalysis.era}`,
    targetStyleLabel,
    paletteCount: palette.length,
    detectedPalette: palette.slice(0, 12),
    outlineThickness: params.contextAnalysis.lineThickness,
    shadingType: params.contextAnalysis.shadingType,
    lightDirection: params.contextAnalysis.lightDirection,
    referenceUsed: params.referenceUsed,
    coherenceLevel: params.coherenceLevel,
    poseFidelity: params.poseFidelity,
    validationStats: params.validationStats,
    generatedAt: Date.now(),
  };
}
