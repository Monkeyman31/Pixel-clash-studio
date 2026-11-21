import {
  CanvasGuide,
  FightingGameProfileId,
  FxVisualStyle,
  ProjectWorkMode,
} from '../types';

export interface FightingGameProfileSpec {
  id: FightingGameProfileId;
  name: string;
  shortName: string;
  era: string;
  paletteId: string;
  fxStyle: FxVisualStyle;
  accentColor: string;
  description: string;
  resolutions: {
    fighter: { w: number; h: number; label: string };
    stage: { w: number; h: number; label: string };
    hud: { w: number; h: number; label: string };
    fx: { w: number; h: number; label: string };
    portrait: { w: number; h: number; label: string };
    cutscene: { w: number; h: number; label: string };
  };
  fighterLayout: {
    recommendedFps: number;
    pixelPerfect: boolean;
    gridStep: number;
    hurtboxRefHeightPct: number;
    layers: string[];
  };
  stageLayout: {
    horizonPct: number;
    floorPct: number;
    jumpHeightPct: number;
    parallaxPlanes: number;
    cameraSafeMarginPct: number;
    recommendedPresetId: string;
  };
  fxLayout: {
    additiveGlow: boolean;
    preferredFrames: number;
    description: string;
  };
  typicalGuides: string[];
}

export const FIGHTING_GAME_PROFILES: Record<FightingGameProfileId, FightingGameProfileSpec> = {
  kof: {
    id: 'kof',
    name: 'King of Fighters (SNK Neo-Geo)',
    shortName: 'King of Fighters',
    era: 'Arcade Neo-Geo 304×224',
    paletteId: 'snk-neogeo',
    fxStyle: 'kof',
    accentColor: '#f43f5e',
    description: 'Estética SNK de alto contraste, anatomía estilizada, escenarios amplios multi-plano y flamas chispeantes.',
    resolutions: {
      fighter: { w: 96, h: 128, label: '96×128 (SNK)' },
      stage: { w: 1280, h: 720, label: '1280×720 Wide' },
      hud: { w: 640, h: 96, label: '640×96 HUD' },
      fx: { w: 96, h: 96, label: '96×96 Impact/Flame' },
      portrait: { w: 128, h: 160, label: '128×160 Team' },
      cutscene: { w: 640, h: 360, label: '640×360 Intro' },
    },
    fighterLayout: {
      recommendedFps: 15,
      pixelPerfect: true,
      gridStep: 8,
      hurtboxRefHeightPct: 76,
      layers: ['Pose Base', 'Lineart SNK', 'Sombra Dither', 'Ropa / Cinta', 'Chispas KOF'],
    },
    stageLayout: {
      horizonPct: 48,
      floorPct: 82,
      jumpHeightPct: 28,
      parallaxPlanes: 5,
      cameraSafeMarginPct: 8,
      recommendedPresetId: 'stage_city',
    },
    fxLayout: {
      additiveGlow: true,
      preferredFrames: 8,
      description: 'Llamas escarlata/oro con núcleo blanco y partículas rápidas de chispa.',
    },
    typicalGuides: ['Suelo jugable (82%)', 'Altura máxima de salto (28%)', 'Zona cámara arcade 4:3/16:9', 'Límites esquina KOF'],
  },
  sfa: {
    id: 'sfa',
    name: 'Street Fighter Alpha (Capcom CPS-2)',
    shortName: 'Street Fighter Alpha',
    era: 'Arcade CPS-2 384×224',
    paletteId: 'capcom-cps2',
    fxStyle: 'sf_alpha',
    accentColor: '#38bdf8',
    description: 'Línea gruesa vibrante, colores saturados CPS-2, anatomía sólida y sombreado cel nítido.',
    resolutions: {
      fighter: { w: 96, h: 96, label: '96×96 (CPS-2)' },
      stage: { w: 1280, h: 720, label: '1280×720 Stage' },
      hud: { w: 640, h: 96, label: '640×96 Super HUD' },
      fx: { w: 80, h: 80, label: '80×80 Hadou/Hit' },
      portrait: { w: 112, h: 128, label: '112×128 Vs' },
      cutscene: { w: 640, h: 360, label: '640×360 Arcade' },
    },
    fighterLayout: {
      recommendedFps: 12,
      pixelPerfect: true,
      gridStep: 8,
      hurtboxRefHeightPct: 72,
      layers: ['Bloqueo CPS-2', 'Contorno Grueso', 'Color Plano', 'Cel Shading 2 Tonos', 'Impacto'],
    },
    stageLayout: {
      horizonPct: 50,
      floorPct: 80,
      jumpHeightPct: 30,
      parallaxPlanes: 4,
      cameraSafeMarginPct: 10,
      recommendedPresetId: 'stage_temple',
    },
    fxLayout: {
      additiveGlow: true,
      preferredFrames: 6,
      description: 'Golpes radiales clásicos, ondas azules/cian y destellos de hit-spark.',
    },
    typicalGuides: ['Horizonte CPS-2 (50%)', 'Suelo Tatami (80%)', 'Línea ojos retrato', 'Zona segura HUD superior'],
  },
  darkstalkers: {
    id: 'darkstalkers',
    name: 'Darkstalkers / Vampire Savior',
    shortName: 'Darkstalkers',
    era: 'CPS-2 Squash & Stretch',
    paletteId: 'darkstalkers-gothic',
    fxStyle: 'cps2',
    accentColor: '#a855f7',
    description: 'Animación súper fluida estilo cartoon gótico con exageración extrema de silueta y colores nocturnos.',
    resolutions: {
      fighter: { w: 128, h: 128, label: '128×128 Exaggerated' },
      stage: { w: 1280, h: 720, label: '1280×720 Gothic' },
      hud: { w: 640, h: 96, label: '640×96 Vampire HUD' },
      fx: { w: 96, h: 96, label: '96×96 Dark Magic' },
      portrait: { w: 128, h: 128, label: '128×128 Portrait' },
      cutscene: { w: 640, h: 360, label: '640×360 Scene' },
    },
    fighterLayout: {
      recommendedFps: 18,
      pixelPerfect: true,
      gridStep: 8,
      hurtboxRefHeightPct: 74,
      layers: ['Squash & Stretch', 'Tinta Gótica', 'Base Saturada', 'Sombras Púrpura', 'FX Espectral'],
    },
    stageLayout: {
      horizonPct: 46,
      floorPct: 84,
      jumpHeightPct: 26,
      parallaxPlanes: 5,
      cameraSafeMarginPct: 8,
      recommendedPresetId: 'stage_castle',
    },
    fxLayout: {
      additiveGlow: true,
      preferredFrames: 10,
      description: 'Auras espectrales violeta/verde ácido con distorsión fluida y smear curvo.',
    },
    typicalGuides: ['Piso perspectiva gótica (84%)', 'Margen squash lateral', 'Horizonte lunar (46%)'],
  },
  garou: {
    id: 'garou',
    name: 'Garou: Mark of the Wolves',
    shortName: 'Garou',
    era: 'Neo-Geo Late Era',
    paletteId: 'snk-neogeo',
    fxStyle: 'neo_geo',
    accentColor: '#f59e0b',
    description: 'Animación de élite cuadro a cuadro con pliegues realistas de ropa, iluminación cinematográfica y reflejos.',
    resolutions: {
      fighter: { w: 128, h: 128, label: '128×128 Garou' },
      stage: { w: 1600, h: 900, label: '1600×900 Wide' },
      hud: { w: 640, h: 96, label: '640×96 T.O.P. HUD' },
      fx: { w: 96, h: 96, label: '96×96 Neo-Geo FX' },
      portrait: { w: 128, h: 160, label: '128×160 Cut-in' },
      cutscene: { w: 1280, h: 720, label: '1280×720 HD' },
    },
    fighterLayout: {
      recommendedFps: 20,
      pixelPerfect: true,
      gridStep: 8,
      hurtboxRefHeightPct: 78,
      layers: ['Anatomía Realista', 'Pliegues Chaqueta', 'Sombra Profunda', 'Rim Light Dorado', 'Impacto TOP'],
    },
    stageLayout: {
      horizonPct: 49,
      floorPct: 83,
      jumpHeightPct: 27,
      parallaxPlanes: 6,
      cameraSafeMarginPct: 8,
      recommendedPresetId: 'stage_city',
    },
    fxLayout: {
      additiveGlow: true,
      preferredFrames: 10,
      description: 'Estelas limpias, polvo de derrape en suelo y chispas doradas de impacto.',
    },
    typicalGuides: ['Suelo urbano (83%)', 'Zona T.O.P. HUD', 'Línea horizonte 49%', 'Márgenes de scroll largo'],
  },
  guilty_gear: {
    id: 'guilty_gear',
    name: 'Guilty Gear (ArcSys Style)',
    shortName: 'Guilty Gear',
    era: 'HD Anime Fighter',
    paletteId: 'arc-guilty',
    fxStyle: 'guilty_gear',
    accentColor: '#ef4444',
    description: 'Sprites HD estilizados de rock/anime, sombras muy marcadas, smear agresivo y FX metal/fuego masivos.',
    resolutions: {
      fighter: { w: 256, h: 256, label: '256×256 HD Sprite' },
      stage: { w: 1920, h: 1080, label: '1920×1080 Full HD' },
      hud: { w: 1280, h: 160, label: '1280×160 Tension HUD' },
      fx: { w: 160, h: 160, label: '160×160 Slash/Overdrive' },
      portrait: { w: 256, h: 256, label: '256×256 Cut-in' },
      cutscene: { w: 1920, h: 1080, label: '1920×1080 Scene' },
    },
    fighterLayout: {
      recommendedFps: 16,
      pixelPerfect: false,
      gridStep: 16,
      hurtboxRefHeightPct: 78,
      layers: ['Pose Dinámica', 'Tinta Angulosa', 'Base Rock', 'Sombra Negra Hard', 'Rim Carmesí', 'Overdrive FX'],
    },
    stageLayout: {
      horizonPct: 52,
      floorPct: 85,
      jumpHeightPct: 22,
      parallaxPlanes: 6,
      cameraSafeMarginPct: 7,
      recommendedPresetId: 'stage_castle',
    },
    fxLayout: {
      additiveGlow: true,
      preferredFrames: 12,
      description: 'Cortes diagonales afilados, relámpagos rojos y partículas metálicas de alta energía.',
    },
    typicalGuides: ['Suelo HD (85%)', 'Zona Air Dash / Super Jump (22%)', 'Encuadre cámara widescreen 16:9'],
  },
  blazblue: {
    id: 'blazblue',
    name: 'BlazBlue (ArcSys HD 2D)',
    shortName: 'BlazBlue',
    era: 'HD 16:9 Anime',
    paletteId: 'anime-pastel',
    fxStyle: 'anime',
    accentColor: '#60a5fa',
    description: 'Sprites HD estilizados con trazo limpio, sombreado suave anime, magia geométrica y escenarios 2.5D.',
    resolutions: {
      fighter: { w: 256, h: 256, label: '256×256 HD Sprite' },
      stage: { w: 1920, h: 1080, label: '1920×1080 16:9' },
      hud: { w: 1280, h: 160, label: '1280×160 Astral HUD' },
      fx: { w: 160, h: 160, label: '160×160 Ars Magus' },
      portrait: { w: 256, h: 256, label: '256×256 Dialogue' },
      cutscene: { w: 1920, h: 1080, label: '1920×1080 Story' },
    },
    fighterLayout: {
      recommendedFps: 16,
      pixelPerfect: false,
      gridStep: 16,
      hurtboxRefHeightPct: 76,
      layers: ['Esqueleto Anime', 'Lineart Fino', 'Color Base', 'Sombra 2 Pasos', 'Sello Mágico FX'],
    },
    stageLayout: {
      horizonPct: 50,
      floorPct: 84,
      jumpHeightPct: 24,
      parallaxPlanes: 6,
      cameraSafeMarginPct: 7,
      recommendedPresetId: 'stage_lab',
    },
    fxLayout: {
      additiveGlow: true,
      preferredFrames: 12,
      description: 'Aros rúnicos cian/violeta, cortes anime y cristales de energía.',
    },
    typicalGuides: ['Línea de piso 84%', 'Altura Super Jump 24%', 'Márgenes HUD 16:9'],
  },
  mvc: {
    id: 'mvc',
    name: 'Marvel vs Capcom (Hyper Tag)',
    shortName: 'Marvel vs Capcom',
    era: 'CPS-2 / Naomi Hyper',
    paletteId: 'capcom-cps2',
    fxStyle: 'cps2',
    accentColor: '#facc15',
    description: 'Combate aéreo hiper-dinámico con super jumps enormes, beams de pantalla completa y FX súper brillantes.',
    resolutions: {
      fighter: { w: 128, h: 128, label: '128×128 Tag Hero' },
      stage: { w: 1600, h: 900, label: '1600×900 Super Jump' },
      hud: { w: 640, h: 112, label: '640×112 Team 3v3' },
      fx: { w: 128, h: 128, label: '128×128 Hyper Beam' },
      portrait: { w: 128, h: 128, label: '128×128 Tag Icon' },
      cutscene: { w: 1280, h: 720, label: '1280×720 Hyper' },
    },
    fighterLayout: {
      recommendedFps: 15,
      pixelPerfect: true,
      gridStep: 8,
      hurtboxRefHeightPct: 74,
      layers: ['Silueta Cómic', 'Lineart Cómic', 'Tinta Negra', 'Colores Primarios', 'Hyper Beam FX'],
    },
    stageLayout: {
      horizonPct: 56,
      floorPct: 86,
      jumpHeightPct: 16,
      parallaxPlanes: 5,
      cameraSafeMarginPct: 8,
      recommendedPresetId: 'stage_arena',
    },
    fxLayout: {
      additiveGlow: true,
      preferredFrames: 8,
      description: 'Rayos gigantes, explosiones multicolor y hit-sparks de cómic.',
    },
    typicalGuides: ['Suelo Tag (86%)', 'Techo Super Jump (16%)', 'Zona cámara horizontal'],
  },
  skullgirls: {
    id: 'skullgirls',
    name: 'Skullgirls (Hand-Drawn HD 2D)',
    shortName: 'Skullgirls',
    era: 'HD Art Deco 1080p',
    paletteId: 'darkstalkers-gothic',
    fxStyle: 'anime',
    accentColor: '#ec4899',
    description: 'Animación tradicional fluida de altísima densidad con siluetas Art Deco, múltiples frames y sombras dramáticas.',
    resolutions: {
      fighter: { w: 256, h: 256, label: '256×256 Hand-Drawn' },
      stage: { w: 1920, h: 1080, label: '1920×1080 HD 2.5D' },
      hud: { w: 1280, h: 140, label: '1280×140 Art Deco HUD' },
      fx: { w: 160, h: 160, label: '160×160 Smear/Hit' },
      portrait: { w: 256, h: 256, label: '256×256 Cut-In' },
      cutscene: { w: 1920, h: 1080, label: '1920×1080 Story' },
    },
    fighterLayout: {
      recommendedFps: 24,
      pixelPerfect: false,
      gridStep: 16,
      hurtboxRefHeightPct: 75,
      layers: ['Rough Animación', 'Clean Lineart', 'Flats Art Deco', 'Sombras Suaves', 'Rim Light / FX'],
    },
    stageLayout: {
      horizonPct: 52,
      floorPct: 84,
      jumpHeightPct: 24,
      parallaxPlanes: 6,
      cameraSafeMarginPct: 7,
      recommendedPresetId: 'stage_city',
    },
    fxLayout: {
      additiveGlow: true,
      preferredFrames: 12,
      description: 'Smears de tinta expresiva, destellos magenta y humo estilizado.',
    },
    typicalGuides: ['Piso escenario (84%)', 'Horizonte Art Deco (52%)', 'Margen TV Safe 90%'],
  },
  dbfz: {
    id: 'dbfz',
    name: 'Dragon Ball FighterZ (Shonen Hyper)',
    shortName: 'Dragon Ball FighterZ',
    era: 'Shonen Cel-Shading HD',
    paletteId: 'anime-pastel',
    fxStyle: 'anime',
    accentColor: '#f97316',
    description: 'Iluminación shonen intensa con auras Ki incandescentes, esferas de energía, destrucción de terreno y alto brillo.',
    resolutions: {
      fighter: { w: 256, h: 256, label: '256×256 Shonen' },
      stage: { w: 2560, h: 1440, label: '2560×1440 Arena' },
      hud: { w: 1280, h: 160, label: '1280×160 Ki HUD' },
      fx: { w: 192, h: 192, label: '192×192 Ki Aura/Beam' },
      portrait: { w: 256, h: 256, label: '256×256 Dramatic' },
      cutscene: { w: 1920, h: 1080, label: '1920×1080 Finish' },
    },
    fighterLayout: {
      recommendedFps: 24,
      pixelPerfect: false,
      gridStep: 16,
      hurtboxRefHeightPct: 76,
      layers: ['Pose Shonen', 'Lineart Manga', 'Base Vibrante', 'Cel Hard + Specular', 'Aura Ki Aditiva'],
    },
    stageLayout: {
      horizonPct: 48,
      floorPct: 83,
      jumpHeightPct: 20,
      parallaxPlanes: 6,
      cameraSafeMarginPct: 6,
      recommendedPresetId: 'stage_desert',
    },
    fxLayout: {
      additiveGlow: true,
      preferredFrames: 12,
      description: 'Auras de Ki ascendentes con rocas flotantes, rayos eléctricos y ondas expansivas.',
    },
    typicalGuides: ['Suelo rocoso (83%)', 'Vuelo / Super Dash (20%)', 'Horizonte amplio (48%)'],
  },
  custom: {
    id: 'custom',
    name: 'Personalizado (PixelClash Libre)',
    shortName: 'Personalizado',
    era: 'Resolución Libre',
    paletteId: 'capcom-cps2',
    fxStyle: 'pixel_retro',
    accentColor: '#10b981',
    description: 'Configuración abierta sin restricciones para adaptar cualquier estética, resolución o motor de juego.',
    resolutions: {
      fighter: { w: 64, h: 64, label: '64×64 Arcade' },
      stage: { w: 1280, h: 720, label: '1280×720 HD' },
      hud: { w: 256, h: 64, label: '256×64 HUD' },
      fx: { w: 96, h: 96, label: '96×96 FX' },
      portrait: { w: 128, h: 128, label: '128×128 Retrato' },
      cutscene: { w: 640, h: 360, label: '640×360 Escena' },
    },
    fighterLayout: {
      recommendedFps: 12,
      pixelPerfect: true,
      gridStep: 8,
      hurtboxRefHeightPct: 75,
      layers: ['Boceto', 'Línea', 'Color Base', 'Sombras', 'Brillos'],
    },
    stageLayout: {
      horizonPct: 50,
      floorPct: 82,
      jumpHeightPct: 28,
      parallaxPlanes: 4,
      cameraSafeMarginPct: 8,
      recommendedPresetId: 'stage_arena',
    },
    fxLayout: {
      additiveGlow: true,
      preferredFrames: 8,
      description: 'Efectos pixel art versátiles compatibles con cualquier paleta.',
    },
    typicalGuides: ['Guía de tercios', 'Línea de suelo (82%)', 'Margen seguro 90%'],
  },
};

export const FIGHTING_GAME_PROFILE_ORDER: FightingGameProfileId[] = [
  'kof',
  'sfa',
  'darkstalkers',
  'garou',
  'guilty_gear',
  'blazblue',
  'mvc',
  'skullgirls',
  'dbfz',
  'custom',
];

export interface ModeSizePreset {
  id: string;
  mode: ProjectWorkMode;
  categoryLabel: string;
  name: string;
  width: number;
  height: number;
  desc: string;
  animationMode: boolean;
  grid: boolean;
  pixelPerfect: boolean;
  stagePresetId?: string;
}

export const MODE_SIZE_PRESETS: ModeSizePreset[] = [
  // Fighter Mode: 32×32, 48×48, 64×64, 96×96, 128×128, 256×256
  { id: 'fighter-32', mode: 'fighter', categoryLabel: 'Personaje', name: 'Fighter 32×32', width: 32, height: 32, desc: '8-Bit / Pocket Fighter', animationMode: true, grid: true, pixelPerfect: true },
  { id: 'fighter-48', mode: 'fighter', categoryLabel: 'Personaje', name: 'Fighter 48×48', width: 48, height: 48, desc: 'Estándar arcade ágil', animationMode: true, grid: true, pixelPerfect: true },
  { id: 'fighter-64', mode: 'fighter', categoryLabel: 'Personaje', name: 'Fighter 64×64', width: 64, height: 64, desc: 'Luchador CPS-1 / Retro', animationMode: true, grid: true, pixelPerfect: true },
  { id: 'fighter-96', mode: 'fighter', categoryLabel: 'Personaje', name: 'Fighter 96×96', width: 96, height: 96, desc: 'Arcade CPS-2 / SF Alpha', animationMode: true, grid: true, pixelPerfect: true },
  { id: 'fighter-128', mode: 'fighter', categoryLabel: 'Personaje', name: 'Fighter 128×128', width: 128, height: 128, desc: 'SNK / Neo-Geo / Garou', animationMode: true, grid: true, pixelPerfect: true },
  { id: 'fighter-256', mode: 'fighter', categoryLabel: 'Personaje', name: 'Fighter 256×256', width: 256, height: 256, desc: 'HD Anime / Guilty Gear', animationMode: true, grid: true, pixelPerfect: false },

  // Stage Mode: 640×360, 1280×720, 1600×900, 1920×1080, 2560×1440
  { id: 'stage-640', mode: 'stage', categoryLabel: 'Stage', name: 'Stage 640×360', width: 640, height: 360, desc: 'Pixel Art 16:9 Nítido', animationMode: false, grid: false, pixelPerfect: true },
  { id: 'stage-1280', mode: 'stage', categoryLabel: 'Stage', name: 'Stage 1280×720', width: 1280, height: 720, desc: 'HD Arcade / Parallax', animationMode: false, grid: false, pixelPerfect: false },
  { id: 'stage-1600', mode: 'stage', categoryLabel: 'Stage', name: 'Stage 1600×900', width: 1600, height: 900, desc: 'HD+ Wide Fighting', animationMode: false, grid: false, pixelPerfect: false },
  { id: 'stage-1920', mode: 'stage', categoryLabel: 'Stage', name: 'Stage 1920×1080', width: 1920, height: 1080, desc: 'Full HD 1080p Tiled', animationMode: false, grid: false, pixelPerfect: false },
  { id: 'stage-2560', mode: 'stage', categoryLabel: 'Stage', name: 'Stage 2560×1440', width: 2560, height: 1440, desc: 'QHD Ultra-Wide 2K', animationMode: false, grid: false, pixelPerfect: false },

  // HUD Mode: Barra de vida, Retrato personaje, Medidor de energía, Temporizador, HUD completo
  { id: 'hud-life', mode: 'hud_ui', categoryLabel: 'HUD', name: 'Barra de vida', width: 320, height: 64, desc: 'Barra HP P1 / P2 biselada', animationMode: false, grid: true, pixelPerfect: true },
  { id: 'hud-portrait', mode: 'hud_ui', categoryLabel: 'HUD', name: 'Retrato personaje', width: 128, height: 128, desc: 'Marco retrato HUD P1/P2', animationMode: false, grid: true, pixelPerfect: true },
  { id: 'hud-energy', mode: 'hud_ui', categoryLabel: 'HUD', name: 'Medidor de energía', width: 256, height: 48, desc: 'Barra Super / EX / Tension', animationMode: true, grid: true, pixelPerfect: true },
  { id: 'hud-timer', mode: 'hud_ui', categoryLabel: 'HUD', name: 'Temporizador', width: 96, height: 64, desc: 'Reloj central 99 arcade', animationMode: false, grid: true, pixelPerfect: true },
  { id: 'hud-full', mode: 'hud_ui', categoryLabel: 'HUD', name: 'HUD completo', width: 640, height: 180, desc: 'Set combate completo', animationMode: false, grid: true, pixelPerfect: true },

  // FX Mode: Sprite individual, Efecto animado, Spritesheet FX, Partículas
  { id: 'fx-single', mode: 'fx', categoryLabel: 'FX', name: 'Sprite individual FX', width: 64, height: 64, desc: 'Chispa, impacto o proyectil', animationMode: false, grid: true, pixelPerfect: true },
  { id: 'fx-anim', mode: 'fx', categoryLabel: 'FX', name: 'Efecto animado', width: 96, height: 96, desc: 'Aura, llama o slash en loop', animationMode: true, grid: true, pixelPerfect: true },
  { id: 'fx-sheet', mode: 'fx', categoryLabel: 'FX', name: 'Spritesheet FX', width: 512, height: 128, desc: 'Tira 8×64 o 4×128 de VFX', animationMode: true, grid: true, pixelPerfect: true },
  { id: 'fx-particles', mode: 'fx', categoryLabel: 'FX', name: 'Partículas', width: 128, height: 128, desc: 'Polvo, rocas y esquirlas', animationMode: true, grid: true, pixelPerfect: true },

  // Portrait Mode: Retratos VN, Fighting Games, RPG, Diálogos
  { id: 'port-vn', mode: 'portrait', categoryLabel: 'Portrait', name: 'Retratos VN', width: 256, height: 320, desc: 'Busto Visual Novel expresivo', animationMode: false, grid: false, pixelPerfect: false },
  { id: 'port-fg', mode: 'portrait', categoryLabel: 'Portrait', name: 'Fighting Games', width: 128, height: 160, desc: 'Select & Super Move Cut-in', animationMode: false, grid: false, pixelPerfect: true },
  { id: 'port-rpg', mode: 'portrait', categoryLabel: 'Portrait', name: 'RPG', width: 96, height: 96, desc: 'Medallón / Estado RPG', animationMode: false, grid: true, pixelPerfect: true },
  { id: 'port-dialog', mode: 'portrait', categoryLabel: 'Portrait', name: 'Diálogos', width: 128, height: 128, desc: 'Ventana de diálogo clásica', animationMode: false, grid: true, pixelPerfect: true },

  // Cutscene Mode: Viñeta, Página completa, Splash Art, Cinemática
  { id: 'cut-panel', mode: 'cutscene', categoryLabel: 'Cutscene', name: 'Viñeta', width: 320, height: 240, desc: 'Viñeta de escena narrativa', animationMode: false, grid: false, pixelPerfect: true },
  { id: 'cut-page', mode: 'cutscene', categoryLabel: 'Cutscene', name: 'Página completa', width: 640, height: 720, desc: 'Secuencia vertical / cómic', animationMode: false, grid: false, pixelPerfect: false },
  { id: 'cut-splash', mode: 'cutscene', categoryLabel: 'Cutscene', name: 'Splash Art', width: 1280, height: 720, desc: 'Ilustración keyframe 16:9', animationMode: false, grid: false, pixelPerfect: false },
  { id: 'cut-cinema', mode: 'cutscene', categoryLabel: 'Cutscene', name: 'Cinemática', width: 640, height: 360, desc: 'Cinemática animada widescreen', animationMode: true, grid: false, pixelPerfect: false },

  // Tileset & Personalizado
  { id: 'tile-16', mode: 'tileset', categoryLabel: 'Tileset', name: 'Hoja Tiles 256×256', width: 256, height: 256, desc: 'Tiles 16×16 / 32×32 modulares', animationMode: false, grid: true, pixelPerfect: true },
  { id: 'tile-atlas', mode: 'tileset', categoryLabel: 'Tileset', name: 'Mega Atlas 1024×1024', width: 1024, height: 1024, desc: 'Atlas completo de niveles', animationMode: false, grid: true, pixelPerfect: true },
  { id: 'custom-1024', mode: 'custom', categoryLabel: 'Personalizado', name: 'Alta Resolución 1024', width: 1024, height: 1024, desc: 'Lienzo HD sin límites', animationMode: false, grid: false, pixelPerfect: false },
  { id: 'custom-4096', mode: 'custom', categoryLabel: 'Personalizado', name: 'Mega Lienzo 4096', width: 4096, height: 4096, desc: 'Tiled 256×256 automático', animationMode: false, grid: false, pixelPerfect: false },
];

export function buildFightingProfileGuides(
  profileId: FightingGameProfileId,
  width: number,
  height: number
): CanvasGuide[] {
  const spec = FIGHTING_GAME_PROFILES[profileId] || FIGHTING_GAME_PROFILES.custom;
  const horizonY = Math.round((spec.stageLayout.horizonPct / 100) * height);
  const floorY = Math.round((spec.stageLayout.floorPct / 100) * height);
  const jumpY = Math.round((spec.stageLayout.jumpHeightPct / 100) * height);
  const safeX = Math.max(2, Math.round((spec.stageLayout.cameraSafeMarginPct / 100) * width));

  return [
    {
      id: `fg-guide-horizon-${profileId}`,
      orientation: 'horizontal',
      position: horizonY,
      label: `Horizonte ${spec.shortName}`,
      color: '#38bdf8',
      thickness: 1,
      opacity: 0.72,
      preset: 'horizon',
    },
    {
      id: `fg-guide-floor-${profileId}`,
      orientation: 'horizontal',
      position: floorY,
      label: `Suelo Combate (${spec.stageLayout.floorPct}%)`,
      color: '#10b981',
      thickness: 1.5,
      opacity: 0.85,
      preset: 'stage',
    },
    {
      id: `fg-guide-jump-${profileId}`,
      orientation: 'horizontal',
      position: jumpY,
      label: `Techo Salto (${spec.stageLayout.jumpHeightPct}%)`,
      color: '#f59e0b',
      thickness: 1,
      opacity: 0.65,
      preset: 'stage',
    },
    {
      id: `fg-guide-safe-l-${profileId}`,
      orientation: 'vertical',
      position: safeX,
      label: 'Límite Izq.',
      color: '#ef4444',
      thickness: 1,
      opacity: 0.6,
      preset: 'stage',
    },
    {
      id: `fg-guide-safe-r-${profileId}`,
      orientation: 'vertical',
      position: width - safeX,
      label: 'Límite Der.',
      color: '#ef4444',
      thickness: 1,
      opacity: 0.6,
      preset: 'stage',
    },
    {
      id: `fg-guide-center-${profileId}`,
      orientation: 'vertical',
      position: Math.round(width / 2),
      label: 'Centro Stage',
      color: '#a855f7',
      thickness: 1,
      opacity: 0.55,
      preset: 'stage',
    },
  ];
}
