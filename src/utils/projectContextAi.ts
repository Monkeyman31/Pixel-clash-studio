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
    id: 'garou',
    name: 'Garou: Mark of the Wolves',
    era: 'SNK Neo Geo Obra Maestra (1999)',
    outlinePx: 1,
    shading: 'cel',
    description: 'Sombreado cinematográfico tardío de Neo Geo, pliegues fluidos, luces cálidas suaves y contraste dramático.',
    palette: ['#100b14', '#31233e', '#7c2d12', '#ea580c', '#fbbf24', '#38bdf8', '#cbd5e1', '#fffbeb'],
    promptDirective: 'Garou: Mark of the Wolves (1999 SNK) master pixel art style: fluid anatomical motion creases, warm directional sunlight vs cool twilight shadows, crisp 1px variable-dark ink outlines.',
    stageMotif: 'Atmospheric dusk dockyards, lantern reflections, train yards and warm moody arcade skies',
    hudMotif: 'Sleek metallic Garou gauges with cyan T.O.P. zone highlight and beveled crimson life bar',
    vfxMotif: 'Fluid warm gold and cobalt-blue Buster/Break wave trails with fine sparks',
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
    id: 'skullgirls',
    name: 'Skullgirls',
    era: 'Art Deco Dark-Comic 2D',
    outlinePx: 2,
    shading: 'cel',
    description: 'Contornos negros expresivos, siluetas Art Deco elásticas, sombras profundas y contraste vibrante.',
    palette: ['#0b0710', '#2b133d', '#be123c', '#f43f5e', '#f59e0b', '#fde047', '#0ea5e9', '#fff1f2'],
    promptDirective: 'Skullgirls dark Art Deco fighting game aesthetic in crisp pixel art: thick dynamic ink outlines, dramatic silhouette readability, elastic limb smears and punchy crimson/gold/plum cel contrast.',
    stageMotif: 'Ornate Art Deco grand theater arches, moody jazz alleyways and checkered ballroom floor',
    hudMotif: 'Stylish Art Deco crimson & ivory beveled life bars with ornate portrait medallions',
    vfxMotif: 'Bold ink-outlined crimson/amber impact smears, star flashes and comic speed streaks',
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
  {
    id: 'custom',
    name: 'Personalizado',
    era: 'Definido por el Artista',
    outlinePx: 1,
    shading: 'cel',
    description: 'Define tu propia dirección artística, grosor de contorno, tipo de sombreado y paleta maestra.',
    palette: ['#0f172a', '#334155', '#f59e0b', '#ef4444', '#38bdf8', '#22c55e', '#f8fafc', '#1e1b4b'],
    promptDirective: 'Follow the artist custom style definition, outline width, shading type, and exact custom palette ramps strictly.',
    stageMotif: 'Custom fighting arena composition matching the user-defined style & lighting palette',
    hudMotif: 'Custom stylized fighting HUD bars harmonized with the user-defined palette',
    vfxMotif: 'Custom stylized fighting VFX bursts aligned to the user-defined outline and palette',
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
  return AI_EXTERNAL_PROFILES.find((p) => p.id === norm) || AI_EXTERNAL_PROFILES.find((p) => p.id === 'kof')!;
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
  detectedProfileId?: AiExternalProfileId,
  customPalette?: string[]
): (string | null)[][] {
  const effectiveProfileId =
    styleMode === 'auto_detect' && detectedProfileId ? detectedProfileId : profileId;
  const profile = getAiStyleProfile(effectiveProfileId);
  const effectiveProfilePalette =
    effectiveProfileId === 'custom' && customPalette && customPalette.length >= 2
      ? customPalette
      : profile.palette;

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
        return c ? findNearestColor(c, effectiveProfilePalette) : null;
      })
    );
  }

  // blend mode: mix original/project palette with external profile palette
  const ratio = Math.max(0, Math.min(1, blendRatio));
  const combinedPalette = projectPalette.length > 0 ? projectPalette : effectiveProfilePalette;
  return grid.map((row) =>
    row.map((raw) => {
      const c = normalizeHexColor(raw);
      if (!c) return null;
      const a = findNearestColor(c, combinedPalette);
      const b = findNearestColor(c, effectiveProfilePalette);
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
  customStyleName?: string;
  customPalette?: string[];
}): AiExplanationReport {
  const resolvedProfileId =
    params.styleMode === 'keep' || params.styleMode === 'auto_detect'
      ? params.contextAnalysis.detectedProfileId
      : params.profileId;
  const activeProfile = getAiStyleProfile(resolvedProfileId);
  const customLabel =
    resolvedProfileId === 'custom' && params.customStyleName?.trim()
      ? params.customStyleName.trim()
      : activeProfile.name;

  const targetStyleLabel =
    params.styleMode === 'keep'
      ? `Mantener actual (${params.contextAnalysis.visualStyle})`
      : params.styleMode === 'auto_detect'
      ? `Autodetectado (${activeProfile.name})`
      : customLabel;

  const palette =
    params.styleMode === 'keep'
      ? params.contextAnalysis.activePalette
      : resolvedProfileId === 'custom' && params.customPalette && params.customPalette.length > 0
      ? params.customPalette
      : activeProfile.palette;

  return {
    detectedStyle: params.overrideDetectedStyle || `${params.contextAnalysis.visualStyle} · ${params.contextAnalysis.era}`,
    targetStyleLabel,
    resolution: params.contextAnalysis.resolution,
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

/**
 * Generates local adaptive character variation / recolor / synthesis grid when server key is absent
 * while preserving intact silhouettes and zero floating fragments.
 */
export function generateFallbackCharacterGrid(
  sourceGrid: (string | null)[][],
  width: number,
  height: number,
  mode: 'create' | 'variation' | 'recolor' | 'outfit' | 'anatomy' | 'reference_adapt',
  targetPalette: string[]
): (string | null)[][] {
  const palette = targetPalette.length >= 3 ? targetPalette : ['#18121e', '#ef4444', '#fbbf24', '#38bdf8', '#f8fafc'];
  let nonEmpty = 0;
  for (let y = 0; y < sourceGrid.length; y++) {
    for (let x = 0; x < (sourceGrid[y]?.length || 0); x++) {
      if (sourceGrid[y][x]) nonEmpty++;
    }
  }

  // If canvas is empty or mode is 'create', synthesize a crisp fighting stance silhouette
  if (nonEmpty < 12 || mode === 'create') {
    const out: (string | null)[][] = Array.from({ length: height }, () => new Array(width).fill(null));
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height * 0.52);
    const dark = palette[0];
    const main = palette[Math.min(1, palette.length - 1)];
    const accent = palette[Math.min(2, palette.length - 1)];
    const skin = '#f2c9a0';
    const hi = palette[palette.length - 1];

    const put = (x: number, y: number, c: string) => {
      const ix = Math.round(x);
      const iy = Math.round(y);
      if (ix >= 0 && ix < width && iy >= 0 && iy < height) out[iy][ix] = c;
    };
    const fillRect = (x0: number, y0: number, w0: number, h0: number, c: string) => {
      for (let py = y0; py < y0 + h0; py++) {
        for (let px = x0; px < x0 + w0; px++) put(px, py, c);
      }
    };

    const s = Math.max(0.75, Math.min(2.2, Math.min(width, height) / 48));
    // Head
    fillRect(cx - Math.round(3 * s), cy - Math.round(14 * s), Math.round(6 * s), Math.round(6 * s), skin);
    fillRect(cx - Math.round(3 * s), cy - Math.round(15 * s), Math.round(6 * s), Math.round(2 * s), dark);
    // Headband / hair crest
    fillRect(cx - Math.round(4 * s), cy - Math.round(13 * s), Math.round(8 * s), Math.round(1.5 * s), accent);
    // Torso
    fillRect(cx - Math.round(5 * s), cy - Math.round(8 * s), Math.round(10 * s), Math.round(10 * s), main);
    fillRect(cx - Math.round(2 * s), cy - Math.round(7 * s), Math.round(4 * s), Math.round(7 * s), hi);
    // Arms (combat guard)
    fillRect(cx - Math.round(8 * s), cy - Math.round(6 * s), Math.round(3 * s), Math.round(6 * s), skin);
    fillRect(cx + Math.round(5 * s), cy - Math.round(8 * s), Math.round(4 * s), Math.round(5 * s), skin);
    // Belt + Legs
    fillRect(cx - Math.round(5 * s), cy + Math.round(2 * s), Math.round(10 * s), Math.round(2 * s), accent);
    fillRect(cx - Math.round(5 * s), cy + Math.round(4 * s), Math.round(4 * s), Math.round(11 * s), dark);
    fillRect(cx + Math.round(1 * s), cy + Math.round(4 * s), Math.round(4 * s), Math.round(11 * s), dark);

    // 1px clean outline around silhouette
    const snap = out.map((r) => [...r]);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (snap[y][x]) continue;
        if (snap[y - 1][x] || snap[y + 1][x] || snap[y][x - 1] || snap[y][x + 1]) {
          out[y][x] = dark;
        }
      }
    }
    return out;
  }

  // Otherwise remap luminance cleanly to target palette while optionally adding crisp rim highlight
  const sortedPalette = [...palette].sort((a, b) => getLuminance(a) - getLuminance(b));
  const uniq = new Set<string>();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const c = normalizeHexColor(sourceGrid[y]?.[x]);
      if (c) uniq.add(c);
    }
  }
  const colorOrder = [...uniq].sort((a, b) => getLuminance(a) - getLuminance(b));
  const lut = new Map<string, string>();
  colorOrder.forEach((srcCol, i) => {
    const ratio = colorOrder.length <= 1 ? 0.5 : i / (colorOrder.length - 1);
    const pIdx = Math.min(sortedPalette.length - 1, Math.round(ratio * (sortedPalette.length - 1)));
    lut.set(srcCol, sortedPalette[pIdx]);
  });

  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (__, x) => {
      const c = normalizeHexColor(sourceGrid[y]?.[x]);
      if (!c) return null;
      return mode === 'recolor' || mode === 'outfit' ? lut.get(c) || c : findNearestColor(c, sortedPalette);
    })
  );
}

/**
 * Generates multi-frame intermediate pixel grids cleanly between Frame A and Frame B
 * honoring silhouette mass interpolation, smoothness, and palette lock.
 */
export function generateMultiFrameInBetweensLocal(
  gridA: (string | null)[][],
  gridB: (string | null)[][],
  width: number,
  height: number,
  count: number,
  targetPalette: string[],
  coherenceLevel: AiCoherenceLevel = 'high'
): (string | null)[][][] {
  const safeCount = Math.max(1, Math.min(8, Math.round(count)));
  const getCentroid = (g: (string | null)[][]) => {
    let sx = 0, sy = 0, n = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (g[y]?.[x]) {
          sx += x;
          sy += y;
          n++;
        }
      }
    }
    return n > 0 ? { x: sx / n, y: sy / n } : { x: width / 2, y: height / 2 };
  };

  const cA = getCentroid(gridA);
  const cB = getCentroid(gridB);
  const framesOut: (string | null)[][][] = [];

  for (let i = 1; i <= safeCount; i++) {
    const t = i / (safeCount + 1);
    const shiftFromAx = Math.round((cB.x - cA.x) * t);
    const shiftFromAy = Math.round((cB.y - cA.y) * t);
    const shiftFromBx = Math.round((cA.x - cB.x) * (1 - t));
    const shiftFromBy = Math.round((cA.y - cB.y) * (1 - t));

    const out: (string | null)[][] = Array.from({ length: height }, () => new Array(width).fill(null));
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const ax = x - shiftFromAx;
        const ay = y - shiftFromAy;
        const bx = x - shiftFromBx;
        const by = y - shiftFromBy;
        const pA = ax >= 0 && ax < width && ay >= 0 && ay < height ? normalizeHexColor(gridA[ay]?.[ax]) : null;
        const pB = bx >= 0 && bx < width && by >= 0 && by < height ? normalizeHexColor(gridB[by]?.[bx]) : null;
        if (pA && pB) {
          out[y][x] = t < 0.5 ? pA : pB;
        } else if (pA && t <= 0.65) {
          out[y][x] = pA;
        } else if (pB && t >= 0.35) {
          out[y][x] = pB;
        }
      }
    }
    const cleaned = validateAndCleanAiPixelGrid(out, 'sprite', {
      targetPalette,
      coherenceLevel,
      repairOutlines: true,
    });
    framesOut.push(cleaned.grid);
  }
  return framesOut;
}

/**
 * Synthesizes clean multi-frame local fallback animation sequence (idle breathe, walk, attack, transition).
 */
export function generateFallbackAnimationFrames(
  baseGrid: (string | null)[][],
  width: number,
  height: number,
  frameCount: number,
  mode: 'generate' | 'fix' | 'cycle' | 'transition',
  targetPalette: string[],
  coherenceLevel: AiCoherenceLevel = 'high'
): (string | null)[][][] {
  const safeCount = Math.max(2, Math.min(12, Math.round(frameCount)));
  const workingBase = generateFallbackCharacterGrid(baseGrid, width, height, 'variation', targetPalette);
  const outFrames: (string | null)[][][] = [];

  for (let i = 0; i < safeCount; i++) {
    const phase = (i / safeCount) * Math.PI * 2;
    const dx =
      mode === 'generate'
        ? Math.round(Math.sin(i / Math.max(1, safeCount - 1) * Math.PI) * 3)
        : mode === 'transition'
        ? Math.round((i / Math.max(1, safeCount - 1)) * 2 - 1)
        : 0;
    const dy =
      mode === 'cycle'
        ? Math.round(Math.sin(phase) * 1.2)
        : mode === 'generate'
        ? Math.round(-Math.abs(Math.sin(phase * 0.5)) * 1.5)
        : 0;

    const shifted: (string | null)[][] = Array.from({ length: height }, () => new Array(width).fill(null));
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const sx = x - dx;
        const sy = y - dy;
        if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
          shifted[y][x] = workingBase[sy]?.[sx] || null;
        }
      }
    }
    const cleaned = validateAndCleanAiPixelGrid(shifted, 'sprite', {
      targetPalette,
      coherenceLevel,
      repairOutlines: true,
    });
    outFrames.push(cleaned.grid);
  }

  return outFrames;
}

export function generateFallbackStageGrid(
  w: number,
  h: number,
  mood: string,
  style: string,
  paletteOverride?: string[]
): (string | null)[][] {
  const g: (string | null)[][] = Array.from({ length: h }, () => new Array(w).fill(null));
  const profile = getAiStyleProfile(
    style === 'cyberpunk' ? 'pixel_scifi' : style === 'dojo' ? 'kof' : style === '8bit' ? 'nes' : style
  );
  const pal = paletteOverride && paletteOverride.length >= 4 ? paletteOverride : profile.palette;

  const isCyber = profile.id === 'pixel_scifi' || style === 'cyberpunk';
  const isRetro8 = profile.id === 'nes' || profile.id === 'gameboy';
  const skyTop = mood === 'night' ? (pal[0] || '#0b1026') : mood === 'day' ? '#1d4ed8' : mood === 'storm' ? '#1e293b' : '#431407';
  const skyMid = isRetro8
    ? (pal[1] || '#306230')
    : mood === 'night'
    ? (pal[1] || '#1e1b4b')
    : mood === 'day'
    ? '#38bdf8'
    : mood === 'storm'
    ? '#334155'
    : (pal[2] || '#ea580c');
  const sunCol = isRetro8
    ? (pal[pal.length - 1] || '#9bbc0f')
    : mood === 'night'
    ? '#e2e8f0'
    : mood === 'storm'
    ? '#94a3b8'
    : (pal[4] || '#fde047');
  const floorTop = isCyber ? '#0f172a' : (pal[1] || '#78350f');
  const floorBot = pal[0] || '#451a03';
  const lineCol = isCyber ? (pal[3] || '#22d3ee') : (pal[2] || '#b45309');

  const horizon = Math.floor(h * 0.65);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (y < horizon) {
        g[y][x] = y < Math.floor(horizon * 0.5) ? skyTop : skyMid;
      } else {
        const isDither = profile.shading === 'gradient_dither' && (x + y) % 2 === 0;
        g[y][x] =
          y % 3 === 0 ? lineCol : y < Math.floor((h + horizon) / 2) ? (isDither ? floorBot : floorTop) : floorBot;
      }
    }
  }
  const sx = Math.floor(w * 0.5);
  const sy = Math.floor(horizon * 0.45);
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      if (dx * dx + dy * dy <= 10 && sx + dx >= 0 && sx + dx < w && sy + dy >= 0 && sy + dy < horizon) {
        g[sy + dy][sx + dx] = sunCol;
      }
    }
  }
  const pLeft = Math.max(2, Math.floor(w * 0.12));
  const pRight = Math.min(w - 3, Math.floor(w * 0.85));
  const pillarCol = isCyber ? '#a855f7' : (pal[2] || '#7f1d1d');
  const trimCol = isCyber ? '#22d3ee' : (pal[4] || '#f59e0b');
  for (let y = Math.floor(h * 0.12); y < horizon; y++) {
    g[y][pLeft] = pillarCol;
    g[y][pLeft + 1] = pillarCol;
    g[y][pRight] = pillarCol;
    g[y][pRight + 1] = pillarCol;
  }
  for (let x = 0; x < w; x++) {
    g[Math.floor(h * 0.12)][x] = trimCol;
  }
  return g;
}

export function generateFallbackHudGrid(
  w: number,
  h: number,
  theme: string,
  includeBars: boolean,
  includeTimer: boolean,
  includeSuper: boolean,
  paletteOverride?: string[]
): (string | null)[][] {
  const g: (string | null)[][] = Array.from({ length: h }, () => new Array(w).fill(null));
  const profile = getAiStyleProfile(theme === 'cyber' ? 'pixel_scifi' : theme === 'minimal' ? 'blazblue' : theme);
  const pal = paletteOverride && paletteOverride.length >= 4 ? paletteOverride : profile.palette;
  const frameCol =
    profile.id === 'gameboy'
      ? (pal[3] || '#9bbc0f')
      : theme === 'cyber'
      ? '#22d3ee'
      : theme === 'minimal'
      ? '#e2e8f0'
      : (pal[4] || '#f59e0b');
  const p1Col =
    profile.id === 'gameboy' ? (pal[2] || '#8bac0f') : theme === 'cyber' ? '#38bdf8' : (pal[5] || '#22c55e');
  const p2Col = profile.id === 'gameboy' ? (pal[1] || '#306230') : (pal[3] || '#ef4444');
  const barBg = pal[0] || '#0f172a';
  const mid = Math.floor(w / 2);

  if (includeBars) {
    const barEnd = Math.max(6, mid - 5);
    const p2Start = Math.min(w - 6, mid + 5);
    for (let y = 2; y <= 6; y++) {
      for (let x = 2; x <= barEnd; x++) {
        g[y][x] =
          y === 2 || y === 6 || x === 2 || x === barEnd
            ? frameCol
            : y === 3
            ? (pal[pal.length - 1] || '#fef08a')
            : p1Col;
      }
      for (let x = p2Start; x <= w - 3; x++) {
        g[y][x] =
          y === 2 || y === 6 || x === p2Start || x === w - 3 ? frameCol : x > p2Start + 2 ? p2Col : barBg;
      }
    }
  }

  if (includeTimer) {
    for (let y = 1; y <= 7; y++) {
      for (let x = mid - 3; x <= mid + 3; x++) {
        if (x >= 0 && x < w) {
          g[y][x] = y === 1 || y === 7 || x === mid - 3 || x === mid + 3 ? frameCol : barBg;
        }
      }
    }
    if (mid - 1 >= 0 && mid + 1 < w) {
      g[3][mid - 1] = '#ffffff';
      g[4][mid - 1] = '#ffffff';
      g[5][mid - 1] = '#ffffff';
      g[3][mid + 1] = '#ffffff';
      g[4][mid + 1] = '#ffffff';
      g[5][mid + 1] = '#ffffff';
    }
  }

  if (includeSuper) {
    const sy = Math.max(10, h - 5);
    for (let y = sy; y <= sy + 2 && y < h; y++) {
      for (let x = 3; x < Math.min(w - 3, mid - 4); x++) {
        g[y][x] = y === sy || y === sy + 2 ? '#e2e8f0' : (pal[6] || '#38bdf8');
      }
      for (let x = Math.max(3, mid + 4); x < w - 3; x++) {
        g[y][x] = y === sy || y === sy + 2 ? '#e2e8f0' : (pal[3] || '#a855f7');
      }
    }
  }
  return g;
}


