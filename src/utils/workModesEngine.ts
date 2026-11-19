import {
  CanvasGuide,
  LayerBlendMode,
  LayerType,
  ProjectWorkMode,
  StageParallaxConfig,
  TilesetWorkspaceConfig,
  ToolType,
} from '../types';

export interface SuggestedModeLayer {
  name: string;
  layerType?: LayerType;
  blendMode?: LayerBlendMode;
  parallaxSpeed?: number;
  stagePlane?: string;
  colorTag?: string;
  opacity?: number;
}

export interface ModeTemplateMeta {
  id: string;
  name: string;
  subtitle: string;
  category: string;
}

export interface ModeAiCategory {
  id: string;
  label: string;
  promptHint: string;
}

export interface WorkModeDefinition {
  id: ProjectWorkMode;
  label: string;
  shortLabel: string;
  badge: string;
  accentColor: string;
  description: string;
  autoRulers: boolean;
  autoGuides: boolean;
  autoGrid: boolean;
  prioritizedTools: ToolType[];
  recommendedPanels: string[];
  suggestedLayers: SuggestedModeLayer[];
  templates: ModeTemplateMeta[];
  aiCategories: ModeAiCategory[];
}

export const DEFAULT_STAGE_PARALLAX_CONFIG: StageParallaxConfig = {
  enabled: false,
  scrollOffset: 0,
  autoScroll: false,
  autoScrollSpeed: 18,
  horizonPct: 48,
  playableFloorPct: 82,
  jumpHeightPct: 30,
  guides: {
    horizon: true,
    playableArea: true,
    sideBounds: true,
    jumpHeight: true,
    cameraZone: true,
  },
};

export const DEFAULT_TILESET_CONFIG: TilesetWorkspaceConfig = {
  tileSize: 16,
  showBlockGrid: true,
  showRepeat3x3: false,
  showSeamChecker: false,
  showAutotilePreview: true,
};

export const PARALLAX_SPEED_PRESETS = [
  { label: 'Cielo', speed: 0.1, desc: '0.1×' },
  { label: 'Fondo lento', speed: 0.25, desc: '0.25×' },
  { label: 'Fondo medio', speed: 0.55, desc: '0.55×' },
  { label: 'Normal', speed: 1.0, desc: '1.0×' },
  { label: 'Primer plano', speed: 1.35, desc: '1.35×' },
];

export const WORK_MODES_REGISTRY: Record<ProjectWorkMode, WorkModeDefinition> = {
  fighter: {
    id: 'fighter',
    label: 'Fighter',
    shortLabel: 'Fighter',
    badge: 'Combate',
    accentColor: '#f59e0b',
    description: 'Sprites de personajes de lucha: Hitboxes, Hurtboxes, Frame Data, Sparring y VFX de combate.',
    autoRulers: false,
    autoGuides: false,
    autoGrid: true,
    prioritizedTools: ['pencil', 'eraser', 'hitbox', 'dither', 'smear', 'line'],
    recommendedPanels: ['layers', 'color', 'hitboxes', 'animation', 'workmode'],
    suggestedLayers: [
      { name: 'Boceto / Pose', colorTag: '#64748b', opacity: 0.6 },
      { name: 'Línea / Silueta', colorTag: '#e2e8f0' },
      { name: 'Cuerpo Base', colorTag: '#f59e0b' },
      { name: 'Ropa y Armadura', colorTag: '#3b82f6' },
      { name: 'Sombras Cel', colorTag: '#6366f1', blendMode: 'multiply', opacity: 0.75 },
      { name: 'Brillos / FX Impacto', colorTag: '#22d3ee', blendMode: 'screen' },
    ],
    templates: [],
    aiCategories: [
      { id: 'idle_stance', label: 'Guardia / Idle', promptHint: 'fighting game martial arts idle stance sprite' },
      { id: 'heavy_strike', label: 'Golpe Fuerte', promptHint: 'dynamic fighting game heavy punch or kick impact pose' },
      { id: 'special_move', label: 'Especial / Proyectil', promptHint: 'fighting game special move aura energy attack' },
    ],
  },
  stage: {
    id: 'stage',
    label: 'Stage',
    shortLabel: 'Stage',
    badge: 'Escenarios',
    accentColor: '#10b981',
    description: 'Escenarios, fondos multi-capa con parallax real, guías de horizonte, suelo jugable y cámara.',
    autoRulers: true,
    autoGuides: true,
    autoGrid: true,
    prioritizedTools: ['pencil', 'bucket', 'dither', 'rectangle', 'line', 'move'],
    recommendedPanels: ['workmode', 'layers', 'color', 'brushes', 'ai'],
    suggestedLayers: [
      { name: 'Cielo', parallaxSpeed: 0.1, stagePlane: 'sky', colorTag: '#38bdf8' },
      { name: 'Fondo lejano', parallaxSpeed: 0.25, stagePlane: 'far', colorTag: '#6366f1' },
      { name: 'Fondo medio', parallaxSpeed: 0.5, stagePlane: 'mid', colorTag: '#8b5cf6' },
      { name: 'Fondo cercano', parallaxSpeed: 0.75, stagePlane: 'near', colorTag: '#14b8a6' },
      { name: 'Elementos decorativos', parallaxSpeed: 0.9, stagePlane: 'props', colorTag: '#f59e0b' },
      { name: 'Suelo', parallaxSpeed: 1.0, stagePlane: 'ground', colorTag: '#10b981' },
      { name: 'Primer plano', parallaxSpeed: 1.35, stagePlane: 'fg', colorTag: '#ef4444' },
      { name: 'Efectos ambientales', parallaxSpeed: 1.15, stagePlane: 'fx', blendMode: 'screen', colorTag: '#22d3ee', opacity: 0.85 },
    ],
    templates: [
      { id: 'stage_forest', name: 'Bosque Ancestral', subtitle: '4 planos parallax', category: 'Bosques' },
      { id: 'stage_city', name: 'Ciudad Neón', subtitle: 'Skyline cyberpunk', category: 'Ciudades' },
      { id: 'stage_castle', name: 'Castillo Gótico', subtitle: 'Luna y murallas', category: 'Castillos' },
      { id: 'stage_ruins', name: 'Ruinas Antiguas', subtitle: 'Columnas y arena', category: 'Ruinas' },
      { id: 'stage_interior', name: 'Dojo Interior', subtitle: 'Tatami y shoji', category: 'Interiores' },
      { id: 'stage_lab', name: 'Laboratorio', subtitle: 'Cápsulas y monitores', category: 'Laboratorios' },
      { id: 'stage_scifi', name: 'Estación Futurista', subtitle: 'Bahía espacial', category: 'Futurista' },
      { id: 'stage_arena', name: 'Arena de Combate', subtitle: 'Coliseo arcade', category: 'Combate' },
    ],
    aiCategories: [
      { id: 'forest', label: 'Bosques', promptHint: 'pixel art enchanted twilight forest fighting stage with parallax trees and mossy ground' },
      { id: 'city', label: 'Ciudades', promptHint: 'pixel art retro neon city street rooftop stage at night with skyscrapers' },
      { id: 'castle', label: 'Castillos', promptHint: 'pixel art gothic stone castle rampart stage under full moon with torches' },
      { id: 'ruins', label: 'Ruinas', promptHint: 'pixel art ancient temple ruins stage with broken marble pillars and desert sunset' },
      { id: 'interior', label: 'Interiores', promptHint: 'pixel art traditional wooden martial arts dojo interior with shoji screens and lanterns' },
      { id: 'lab', label: 'Laboratorios', promptHint: 'pixel art sci-fi biotech laboratory stage with glowing containment tubes and steel floor' },
      { id: 'futuristic', label: 'Escenarios futuristas', promptHint: 'pixel art futuristic cyber orbital dock stage with holographic signs and metal catwalk' },
      { id: 'combat_arena', label: 'Escenarios de combate', promptHint: 'pixel art grand tournament fighting arena colosseum with spotlights and cheering crowd' },
    ],
  },
  hud_ui: {
    id: 'hud_ui',
    label: 'HUD / UI',
    shortLabel: 'HUD / UI',
    badge: 'Interfaces',
    accentColor: '#38bdf8',
    description: 'Diseño de interfaces, barras de vida, energía, menús, iconos y márgenes seguros de pantalla.',
    autoRulers: true,
    autoGuides: true,
    autoGrid: true,
    prioritizedTools: ['rectangle', 'line', 'text', 'bucket', 'pencil', 'select'],
    recommendedPanels: ['workmode', 'layers', 'properties', 'color', 'ai'],
    suggestedLayers: [
      { name: 'Fondo', colorTag: '#475569' },
      { name: 'Decoraciones', colorTag: '#f59e0b' },
      { name: 'Indicadores', colorTag: '#22c55e' },
      { name: 'Texto', layerType: 'text', colorTag: '#f8fafc' },
      { name: 'Efectos', blendMode: 'screen', colorTag: '#38bdf8' },
      { name: 'Interactividad', colorTag: '#ec4899' },
    ],
    templates: [
      { id: 'hud_healthbar', name: 'Barra de vida', subtitle: 'Arcade biselada', category: 'Indicadores' },
      { id: 'hud_energy', name: 'Medidor de energía', subtitle: 'EX / Super 3 niveles', category: 'Indicadores' },
      { id: 'hud_portrait', name: 'Retratos HUD', subtitle: 'Marcos P1 / P2', category: 'Marcos' },
      { id: 'hud_timer', name: 'Temporizador', subtitle: 'Reloj central 99', category: 'Indicadores' },
      { id: 'hud_main_menu', name: 'Menú principal', subtitle: 'Título + botones', category: 'Menús' },
      { id: 'hud_pause_menu', name: 'Menú pausa', subtitle: 'Ventana modal', category: 'Menús' },
      { id: 'hud_char_select', name: 'Selección personaje', subtitle: 'Grid de roster', category: 'Menús' },
      { id: 'hud_inventory', name: 'Menú inventario', subtitle: 'Ranuras y equipo', category: 'Menús' },
      { id: 'hud_rpg', name: 'HUD RPG', subtitle: 'HP/MP/XP + diálogo', category: 'HUD Completo' },
      { id: 'hud_fighting', name: 'HUD Fighting Game', subtitle: 'Set arcade completo', category: 'HUD Completo' },
    ],
    aiCategories: [
      { id: 'frames', label: 'Marcos', promptHint: 'ornate pixel art UI window frames and portrait borders with metallic bevels' },
      { id: 'borders', label: 'Bordes', promptHint: 'crisp retro arcade pixel art corner trim and HUD border ornaments' },
      { id: 'buttons', label: 'Botones', promptHint: 'pixel art interactive game UI buttons normal hover pressed states' },
      { id: 'panels', label: 'Paneles', promptHint: 'pixel art RPG and sci-fi dialog panels and inventory window containers' },
      { id: 'interfaces', label: 'Interfaces', promptHint: 'complete fighting game HUD interface layout with health bars timer and super gauge' },
      { id: 'icons', label: 'Iconos', promptHint: 'pixel art game HUD icons set sword shield potion flame lightning coin' },
    ],
  },
  fx: {
    id: 'fx',
    label: 'FX',
    shortLabel: 'FX',
    badge: 'Efectos',
    accentColor: '#f97316',
    description: 'Efectos especiales animados, partículas, resplandores aditivos, simetría y acceso directo a FX Lab.',
    autoRulers: false,
    autoGuides: false,
    autoGrid: true,
    prioritizedTools: ['pencil', 'dither', 'line', 'bucket', 'smear', 'eraser'],
    recommendedPanels: ['workmode', 'layers', 'symmetry', 'dither', 'color'],
    suggestedLayers: [
      { name: 'FX · Humo', colorTag: '#64748b', opacity: 0.75 },
      { name: 'FX · Base', colorTag: '#f97316' },
      { name: 'FX · Brillo', blendMode: 'screen', colorTag: '#facc15', opacity: 0.9 },
      { name: 'FX · Chispas', blendMode: 'color-dodge', colorTag: '#38bdf8' },
    ],
    templates: [],
    aiCategories: [
      { id: 'fire_burst', label: 'Fuego / Explosión', promptHint: 'arcade pixel art fire explosion burst with glowing core and smoke' },
      { id: 'lightning_arc', label: 'Electricidad / Rayo', promptHint: 'crisp cyan white electric lightning strike pixel art VFX' },
      { id: 'energy_slash', label: 'Corte / Impacto', promptHint: 'dynamic anime fighting game energy sword slash arc VFX' },
      { id: 'magic_aura', label: 'Magia / Aura', promptHint: 'mystical pixel art glowing rune aura swirl particles' },
    ],
  },
  tileset: {
    id: 'tileset',
    label: 'Tileset',
    shortLabel: 'Tileset',
    badge: 'Modular',
    accentColor: '#a855f7',
    description: 'Creación de terrenos, plataformas y bloques repetibles con vista 3×3, autotiling y revisión de costuras.',
    autoRulers: true,
    autoGuides: false,
    autoGrid: true,
    prioritizedTools: ['pencil', 'bucket', 'dither', 'select', 'rectangle', 'eraser'],
    recommendedPanels: ['workmode', 'layers', 'color', 'dither'],
    suggestedLayers: [
      { name: 'Base Terreno', colorTag: '#78716c' },
      { name: 'Bordes y Relieve', colorTag: '#22c55e' },
      { name: 'Textura / Grietas', colorTag: '#a855f7' },
      { name: 'Vegetación / Detalles', colorTag: '#84cc16' },
    ],
    templates: [
      { id: 'tileset_rpg', name: 'Terreno RPG Top-Down', subtitle: 'Césped y camino modular', category: 'RPG' },
      { id: 'tileset_platform', name: 'Plataforma Lateral', subtitle: 'Hierba, tierra y piedra', category: 'Plataforma' },
      { id: 'tileset_metroidvania', name: 'Mazmorra Metroidvania', subtitle: 'Ladrillo oscuro y musgo', category: 'Metroidvania' },
    ],
    aiCategories: [
      { id: 'rpg_terrain', label: 'Terreno RPG', promptHint: 'seamless top-down pixel art RPG grass dirt and stone path tileset' },
      { id: 'platformer', label: 'Plataformas', promptHint: 'seamless side-view pixel art platformer grass brick and rock tiles' },
      { id: 'dungeon', label: 'Mazmorra / Metroidvania', promptHint: 'seamless gothic metroidvania stone dungeon bricks moss and metal grates' },
    ],
  },
  portrait: {
    id: 'portrait',
    label: 'Portrait',
    shortLabel: 'Portrait',
    badge: 'Retratos',
    accentColor: '#ec4899',
    description: 'Retratos, expresiones faciales y diálogos con simetría facial, referencias y capas de sombreado.',
    autoRulers: true,
    autoGuides: true,
    autoGrid: false,
    prioritizedTools: ['pencil', 'shading', 'eyedropper', 'dither', 'eraser', 'line'],
    recommendedPanels: ['workmode', 'layers', 'color', 'symmetry', 'references'],
    suggestedLayers: [
      { name: 'Fondo Retrato', colorTag: '#475569' },
      { name: 'Boceto Facial', colorTag: '#94a3b8', opacity: 0.55 },
      { name: 'Piel y Base', colorTag: '#fb923c' },
      { name: 'Ojos y Expresión', colorTag: '#ec4899' },
      { name: 'Cabello', colorTag: '#6366f1' },
      { name: 'Ropa / Cuello', colorTag: '#3b82f6' },
      { name: 'Sombras y Rubor', blendMode: 'multiply', colorTag: '#a855f7', opacity: 0.65 },
      { name: 'Luz de Borde (Rim)', blendMode: 'screen', colorTag: '#fde047', opacity: 0.85 },
    ],
    templates: [
      { id: 'portrait_vn', name: 'Visual Novel Bust', subtitle: 'Marco de diálogo clásico', category: 'Visual Novel' },
      { id: 'portrait_fg', name: 'Fighting Cut-In', subtitle: 'Diagonal de Super Move', category: 'Fighting' },
      { id: 'portrait_rpg', name: 'Medallón RPG', subtitle: 'Retrato cuadrado con bisel', category: 'RPG' },
    ],
    aiCategories: [
      { id: 'hero_portrait', label: 'Expresión Neutra', promptHint: 'anime pixel art character close-up portrait expressive eyes clean cel shading' },
      { id: 'battle_cutin', label: 'Grito / Super Move', promptHint: 'dramatic fighting game super move portrait cut-in intense lighting' },
    ],
  },
  cutscene: {
    id: 'cutscene',
    label: 'Cutscene',
    shortLabel: 'Cutscene',
    badge: 'Cinemática',
    accentColor: '#eab308',
    description: 'Ilustraciones narrativas, splash arts, viñetas y diálogos con guías de tercios y bandas cinemáticas.',
    autoRulers: true,
    autoGuides: true,
    autoGrid: false,
    prioritizedTools: ['pencil', 'line', 'rectangle', 'text', 'bucket', 'dither'],
    recommendedPanels: ['workmode', 'layers', 'color', 'references', 'properties'],
    suggestedLayers: [
      { name: 'Fondo Escena', colorTag: '#334155' },
      { name: 'Iluminación / Atmósfera', blendMode: 'screen', colorTag: '#f59e0b', opacity: 0.7 },
      { name: 'Personajes', colorTag: '#3b82f6' },
      { name: 'Efectos Narrativos', blendMode: 'screen', colorTag: '#22d3ee' },
      { name: 'Bandas / Viñetas', colorTag: '#0f172a' },
      { name: 'Texto y Bocadillos', layerType: 'text', colorTag: '#f8fafc' },
    ],
    templates: [
      { id: 'cutscene_splash', name: 'Splash Art Cinemático', subtitle: 'Bandas 2.39:1 + foco', category: 'Splash Art' },
      { id: 'cutscene_comic', name: 'Viñeta Cómic', subtitle: '3 paneles narrativos', category: 'Cómic' },
      { id: 'cutscene_dialogue', name: 'Escena de Diálogo', subtitle: 'Widescreen + caja texto', category: 'Diálogo' },
    ],
    aiCategories: [
      { id: 'splash_art', label: 'Splash Art', promptHint: 'epic retro anime pixel art cutscene illustration dramatic lighting widescreen' },
      { id: 'story_panel', label: 'Viñeta Narrativa', promptHint: 'pixel art story cutscene panel confrontation in rain with dramatic shadows' },
    ],
  },
  custom: {
    id: 'custom',
    label: 'Personalizado',
    shortLabel: 'Custom',
    badge: 'Libre',
    accentColor: '#94a3b8',
    description: 'Espacio de trabajo libre: mantiene exactamente tu distribución de paneles y guías personalizadas.',
    autoRulers: false,
    autoGuides: false,
    autoGrid: true,
    prioritizedTools: ['pencil', 'eraser', 'bucket', 'line', 'select', 'move'],
    recommendedPanels: ['layers', 'color', 'workmode'],
    suggestedLayers: [
      { name: 'Fondo', colorTag: '#475569' },
      { name: 'Capa Principal', colorTag: '#f59e0b' },
      { name: 'Detalles', colorTag: '#38bdf8' },
    ],
    templates: [],
    aiCategories: [],
  },
};

export const WORK_MODE_ORDER: ProjectWorkMode[] = [
  'fighter',
  'stage',
  'hud_ui',
  'fx',
  'tileset',
  'portrait',
  'cutscene',
  'custom',
];

export function generateModeGuides(
  mode: ProjectWorkMode,
  width: number,
  height: number,
  stageCfg: StageParallaxConfig = DEFAULT_STAGE_PARALLAX_CONFIG
): CanvasGuide[] {
  const ts = Date.now().toString(36);
  if (mode === 'stage') {
    return [
      {
        id: `mode-stage-hor-${ts}`,
        orientation: 'horizontal',
        position: Math.round((height * stageCfg.horizonPct) / 100),
        label: 'Horizonte',
        color: '#38bdf8',
        preset: 'horizon',
      },
      {
        id: `mode-stage-floor-${ts}`,
        orientation: 'horizontal',
        position: Math.round((height * stageCfg.playableFloorPct) / 100),
        label: 'Área jugable (Suelo)',
        color: '#10b981',
        preset: 'stage',
      },
      {
        id: `mode-stage-jump-${ts}`,
        orientation: 'horizontal',
        position: Math.round((height * stageCfg.jumpHeightPct) / 100),
        label: 'Altura de salto',
        color: '#f59e0b',
        preset: 'stage',
      },
      {
        id: `mode-stage-left-${ts}`,
        orientation: 'vertical',
        position: Math.max(2, Math.round(width * 0.08)),
        label: 'Límite izquierdo',
        color: '#ef4444',
        preset: 'stage',
      },
      {
        id: `mode-stage-right-${ts}`,
        orientation: 'vertical',
        position: Math.min(width - 2, Math.round(width * 0.92)),
        label: 'Límite derecho',
        color: '#ef4444',
        preset: 'stage',
      },
    ];
  }

  if (mode === 'hud_ui') {
    const mx = Math.max(2, Math.round(width * 0.06));
    const my = Math.max(2, Math.round(height * 0.06));
    return [
      { id: `mode-hud-t-${ts}`, orientation: 'horizontal', position: my, label: 'Margen seguro sup.', color: '#38bdf8', preset: 'hud' },
      { id: `mode-hud-b-${ts}`, orientation: 'horizontal', position: height - my, label: 'Margen seguro inf.', color: '#38bdf8', preset: 'hud' },
      { id: `mode-hud-hudtop-${ts}`, orientation: 'horizontal', position: Math.round(height * 0.22), label: 'Zona HUD superior', color: '#22d3ee', preset: 'hud' },
      { id: `mode-hud-l-${ts}`, orientation: 'vertical', position: mx, label: 'Margen izq.', color: '#38bdf8', preset: 'hud' },
      { id: `mode-hud-r-${ts}`, orientation: 'vertical', position: width - mx, label: 'Margen der.', color: '#38bdf8', preset: 'hud' },
      { id: `mode-hud-cx-${ts}`, orientation: 'vertical', position: Math.round(width / 2), label: 'Centro HUD', color: '#facc15', preset: 'hud' },
    ];
  }

  if (mode === 'portrait') {
    return [
      { id: `mode-port-cx-${ts}`, orientation: 'vertical', position: Math.round(width / 2), label: 'Eje facial', color: '#ec4899', preset: 'character' },
      { id: `mode-port-eyes-${ts}`, orientation: 'horizontal', position: Math.round(height * 0.38), label: 'Línea de ojos', color: '#38bdf8', preset: 'character' },
      { id: `mode-port-chin-${ts}`, orientation: 'horizontal', position: Math.round(height * 0.68), label: 'Mentón / Hombros', color: '#f59e0b', preset: 'character' },
    ];
  }

  if (mode === 'cutscene') {
    return [
      { id: `mode-cut-t1-${ts}`, orientation: 'horizontal', position: Math.round(height * 0.14), label: 'Banda cine sup.', color: '#eab308', preset: 'hud' },
      { id: `mode-cut-t2-${ts}`, orientation: 'horizontal', position: Math.round(height * 0.86), label: 'Banda cine inf.', color: '#eab308', preset: 'hud' },
      { id: `mode-cut-3a-${ts}`, orientation: 'vertical', position: Math.round(width / 3), label: 'Regla tercios 1/3', color: '#38bdf8', preset: 'stage' },
      { id: `mode-cut-3b-${ts}`, orientation: 'vertical', position: Math.round((width * 2) / 3), label: 'Regla tercios 2/3', color: '#38bdf8', preset: 'stage' },
    ];
  }

  if (mode === 'tileset') {
    return [
      { id: `mode-tile-cx-${ts}`, orientation: 'vertical', position: Math.round(width / 2), label: 'Mitad X', color: '#a855f7', preset: 'stage' },
      { id: `mode-tile-cy-${ts}`, orientation: 'horizontal', position: Math.round(height / 2), label: 'Mitad Y', color: '#a855f7', preset: 'stage' },
    ];
  }

  return [];
}

// =========================================================
// PROCEDURAL NON-DESTRUCTIVE TEMPLATE BUILDERS
// =========================================================
function makeGrid(w: number, h: number): (string | null)[][] {
  return Array.from({ length: h }, () => Array<string | null>(w).fill(null));
}

function fillRect(
  grid: (string | null)[][],
  x0: number,
  y0: number,
  w: number,
  h: number,
  color: string
) {
  const gh = grid.length;
  const gw = grid[0]?.length || 0;
  const xStart = Math.max(0, Math.floor(x0));
  const yStart = Math.max(0, Math.floor(y0));
  const xEnd = Math.min(gw - 1, Math.floor(x0 + w - 1));
  const yEnd = Math.min(gh - 1, Math.floor(y0 + h - 1));
  for (let y = yStart; y <= yEnd; y++) {
    for (let x = xStart; x <= xEnd; x++) {
      grid[y][x] = color;
    }
  }
}

function strokeRect(
  grid: (string | null)[][],
  x0: number,
  y0: number,
  w: number,
  h: number,
  color: string,
  thickness: number = 1
) {
  fillRect(grid, x0, y0, w, thickness, color);
  fillRect(grid, x0, y0 + h - thickness, w, thickness, color);
  fillRect(grid, x0, y0, thickness, h, color);
  fillRect(grid, x0 + w - thickness, y0, thickness, h, color);
}

function drawBevelBox(
  grid: (string | null)[][],
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  borderDark: string,
  highlight: string,
  shadow: string
) {
  if (w < 3 || h < 3) return;
  fillRect(grid, x, y, w, h, fill);
  strokeRect(grid, x, y, w, h, borderDark, 1);
  if (w >= 5 && h >= 5) {
    fillRect(grid, x + 1, y + 1, w - 2, 1, highlight);
    fillRect(grid, x + 1, y + 1, 1, h - 2, highlight);
    fillRect(grid, x + 1, y + h - 2, w - 2, 1, shadow);
    fillRect(grid, x + w - 2, y + 1, 1, h - 2, shadow);
  }
}

function drawFilledCircle(
  grid: (string | null)[][],
  cx: number,
  cy: number,
  r: number,
  color: string
) {
  const gh = grid.length;
  const gw = grid[0]?.length || 0;
  const r2 = r * r;
  for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(gh - 1, Math.ceil(cy + r)); y++) {
    for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(gw - 1, Math.ceil(cx + r)); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) {
        grid[y][x] = color;
      }
    }
  }
}

export interface GeneratedTemplateLayer {
  name: string;
  pixels: (string | null)[][];
  blendMode?: LayerBlendMode;
  parallaxSpeed?: number;
  stagePlane?: string;
  colorTag?: string;
  opacity?: number;
}

export function buildModeTemplateLayers(
  templateId: string,
  width: number,
  height: number
): { title: string; layers: GeneratedTemplateLayer[] } {
  const w = Math.max(16, width);
  const h = Math.max(16, height);

  // ---------------- HUD TEMPLATES (10) ----------------
  if (templateId === 'hud_healthbar') {
    const g = makeGrid(w, h);
    const barW = Math.max(12, Math.floor(w * 0.8));
    const barH = Math.max(5, Math.floor(h * 0.16));
    const bx = Math.floor((w - barW) / 2);
    const by = Math.floor((h - barH) / 2);
    drawBevelBox(g, bx, by, barW, barH, '#1e293b', '#090d16', '#94a3b8', '#0f172a');
    const innerW = Math.max(4, barW - 4);
    const innerH = Math.max(2, barH - 4);
    const redW = Math.floor(innerW * 0.22);
    const greenW = Math.floor(innerW * 0.62);
    fillRect(g, bx + 2, by + 2, greenW, innerH, '#22c55e');
    fillRect(g, bx + 2, by + 2, greenW, Math.max(1, Math.floor(innerH / 2)), '#86efac');
    fillRect(g, bx + 2 + greenW, by + 2, redW, innerH, '#ef4444');
    return { title: 'Barra de vida', layers: [{ name: 'HUD · Barra de vida', pixels: g, colorTag: '#22c55e' }] };
  }

  if (templateId === 'hud_energy') {
    const g = makeGrid(w, h);
    const barW = Math.max(12, Math.floor(w * 0.78));
    const barH = Math.max(5, Math.floor(h * 0.14));
    const bx = Math.floor((w - barW) / 2);
    const by = Math.floor(h * 0.72);
    drawBevelBox(g, bx, by, barW, barH, '#0f172a', '#020617', '#38bdf8', '#1e3a8a');
    const segCount = 3;
    const segW = Math.max(3, Math.floor((barW - 6 - (segCount - 1) * 2) / segCount));
    for (let i = 0; i < segCount; i++) {
      const sx = bx + 3 + i * (segW + 2);
      const col = i < 2 ? '#06b6d4' : '#facc15';
      const hi = i < 2 ? '#a5f3fc' : '#fef08a';
      fillRect(g, sx, by + 2, segW, Math.max(1, barH - 4), col);
      fillRect(g, sx, by + 2, segW, 1, hi);
    }
    return { title: 'Medidor de energía', layers: [{ name: 'HUD · Medidor energía', pixels: g, colorTag: '#38bdf8' }] };
  }

  if (templateId === 'hud_portrait') {
    const g = makeGrid(w, h);
    const box = Math.max(10, Math.floor(Math.min(w, h) * 0.28));
    const margin = Math.max(2, Math.floor(w * 0.05));
    drawBevelBox(g, margin, margin, box, box, '#1e1b4b', '#090d16', '#f59e0b', '#78350f');
    drawBevelBox(g, w - margin - box, margin, box, box, '#1e1b4b', '#090d16', '#38bdf8', '#0c4a6e');
    drawFilledCircle(g, margin + box / 2, margin + box * 0.42, Math.max(2, box * 0.2), '#fdba74');
    drawFilledCircle(g, w - margin - box / 2, margin + box * 0.42, Math.max(2, box * 0.2), '#bae6fd');
    return { title: 'Retratos HUD', layers: [{ name: 'HUD · Retratos P1/P2', pixels: g, colorTag: '#f59e0b' }] };
  }

  if (templateId === 'hud_timer') {
    const g = makeGrid(w, h);
    const bw = Math.max(12, Math.floor(w * 0.24));
    const bh = Math.max(10, Math.floor(h * 0.2));
    const bx = Math.floor((w - bw) / 2);
    const by = Math.max(2, Math.floor(h * 0.06));
    drawBevelBox(g, bx, by, bw, bh, '#0f172a', '#020617', '#fbbf24', '#92400e');
    // Stylized "99" pixel pips inside
    const midY = by + Math.floor(bh / 2);
    fillRect(g, bx + 3, by + 3, Math.max(2, Math.floor(bw * 0.28)), Math.max(3, bh - 6), '#fef08a');
    fillRect(g, bx + bw - 3 - Math.max(2, Math.floor(bw * 0.28)), by + 3, Math.max(2, Math.floor(bw * 0.28)), Math.max(3, bh - 6), '#fef08a');
    fillRect(g, bx + 4, midY - 1, 1, 1, '#0f172a');
    fillRect(g, bx + bw - 5, midY - 1, 1, 1, '#0f172a');
    return { title: 'Temporizador', layers: [{ name: 'HUD · Temporizador', pixels: g, colorTag: '#facc15' }] };
  }

  if (templateId === 'hud_main_menu') {
    const bg = makeGrid(w, h);
    const ui = makeGrid(w, h);
    drawBevelBox(bg, Math.floor(w * 0.1), Math.floor(h * 0.1), Math.floor(w * 0.8), Math.floor(h * 0.24), '#1e1b4b', '#020617', '#f59e0b', '#7c2d12');
    const btnW = Math.max(10, Math.floor(w * 0.52));
    const btnH = Math.max(5, Math.floor(h * 0.11));
    const bx = Math.floor((w - btnW) / 2);
    for (let i = 0; i < 3; i++) {
      const by = Math.floor(h * 0.44) + i * (btnH + Math.max(2, Math.floor(h * 0.05)));
      const active = i === 0;
      drawBevelBox(
        ui,
        bx,
        by,
        btnW,
        btnH,
        active ? '#b45309' : '#1e293b',
        '#090d16',
        active ? '#fde047' : '#64748b',
        '#0f172a'
      );
      if (active) {
        fillRect(ui, Math.max(1, bx - 4), by + Math.floor(btnH / 2) - 1, 2, 2, '#facc15');
      }
    }
    return {
      title: 'Menú principal',
      layers: [
        { name: 'HUD · Banner Título', pixels: bg, colorTag: '#f59e0b' },
        { name: 'HUD · Botones Menú', pixels: ui, colorTag: '#38bdf8' },
      ],
    };
  }

  if (templateId === 'hud_pause_menu') {
    const g = makeGrid(w, h);
    const mw = Math.floor(w * 0.64);
    const mh = Math.floor(h * 0.64);
    const mx = Math.floor((w - mw) / 2);
    const my = Math.floor((h - mh) / 2);
    drawBevelBox(g, mx, my, mw, mh, '#0f172a', '#020617', '#94a3b8', '#1e293b');
    fillRect(g, mx + 3, my + 3, mw - 6, Math.max(2, Math.floor(mh * 0.14)), '#f59e0b');
    for (let i = 0; i < 3; i++) {
      const ry = my + Math.floor(mh * (0.32 + i * 0.2));
      drawBevelBox(g, mx + 4, ry, mw - 8, Math.max(4, Math.floor(mh * 0.14)), i === 0 ? '#1d4ed8' : '#1e293b', '#020617', '#60a5fa', '#0f172a');
    }
    return { title: 'Menú pausa', layers: [{ name: 'HUD · Menú Pausa', pixels: g, colorTag: '#38bdf8' }] };
  }

  if (templateId === 'hud_char_select') {
    const g = makeGrid(w, h);
    const topH = Math.floor(h * 0.44);
    const pad = Math.max(2, Math.floor(w * 0.05));
    const cardW = Math.floor((w - pad * 3) / 2);
    drawBevelBox(g, pad, pad, cardW, topH - pad, '#1e1b4b', '#020617', '#f59e0b', '#7c2d12');
    drawBevelBox(g, pad * 2 + cardW, pad, cardW, topH - pad, '#172554', '#020617', '#38bdf8', '#0c4a6e');
    const cols = 4;
    const rows = 2;
    const gridTop = topH + pad;
    const cellW = Math.max(4, Math.floor((w - pad * 2 - (cols - 1) * 2) / cols));
    const cellH = Math.max(4, Math.floor((h - gridTop - pad - (rows - 1) * 2) / rows));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = pad + c * (cellW + 2);
        const cy = gridTop + r * (cellH + 2);
        const isSel = r === 0 && (c === 0 || c === 3);
        drawBevelBox(g, cx, cy, cellW, cellH, '#1e293b', '#020617', isSel ? '#facc15' : '#64748b', '#0f172a');
      }
    }
    return { title: 'Selección personaje', layers: [{ name: 'HUD · Roster Selección', pixels: g, colorTag: '#ec4899' }] };
  }

  if (templateId === 'hud_inventory') {
    const g = makeGrid(w, h);
    const pad = Math.max(2, Math.floor(w * 0.05));
    drawBevelBox(g, pad, pad, w - pad * 2, h - pad * 2, '#18181b', '#09090b', '#a1a1aa', '#27272a');
    const cols = 4;
    const rows = 3;
    const leftW = Math.floor((w - pad * 2) * 0.62);
    const slotW = Math.max(4, Math.floor((leftW - 8 - (cols - 1) * 2) / cols));
    const slotH = Math.max(4, Math.floor((h - pad * 2 - 10 - (rows - 1) * 2) / rows));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        drawBevelBox(g, pad + 3 + c * (slotW + 2), pad + 4 + r * (slotH + 2), slotW, slotH, '#27272a', '#09090b', r === 0 && c === 0 ? '#facc15' : '#52525b', '#18181b');
      }
    }
    const rightX = pad + leftW + 2;
    const rightW = Math.max(6, w - pad - rightX - 3);
    drawBevelBox(g, rightX, pad + 4, rightW, Math.floor((h - pad * 2) * 0.45), '#27272a', '#09090b', '#38bdf8', '#18181b');
    fillRect(g, rightX + 1, Math.floor(h * 0.62), Math.max(2, rightW - 2), 2, '#22c55e');
    fillRect(g, rightX + 1, Math.floor(h * 0.72), Math.max(2, Math.floor((rightW - 2) * 0.75)), 2, '#3b82f6');
    return { title: 'Menú inventario', layers: [{ name: 'HUD · Inventario', pixels: g, colorTag: '#a855f7' }] };
  }

  if (templateId === 'hud_rpg') {
    const g = makeGrid(w, h);
    const pad = Math.max(2, Math.floor(w * 0.04));
    drawBevelBox(g, pad, pad, Math.floor(w * 0.44), Math.max(10, Math.floor(h * 0.24)), '#1e293b', '#020617', '#e2e8f0', '#0f172a');
    fillRect(g, pad + 3, pad + 3, Math.max(4, Math.floor(w * 0.34)), 2, '#ef4444');
    fillRect(g, pad + 3, pad + 6, Math.max(4, Math.floor(w * 0.26)), 2, '#38bdf8');
    // Dialogue box at bottom
    const dh = Math.max(10, Math.floor(h * 0.26));
    drawBevelBox(g, pad, h - pad - dh, w - pad * 2, dh, '#0f172a', '#020617', '#cbd5e1', '#1e293b');
    fillRect(g, pad + 4, h - pad - dh + 4, Math.floor(w * 0.55), 1, '#f8fafc');
    fillRect(g, pad + 4, h - pad - dh + 7, Math.floor(w * 0.4), 1, '#94a3b8');
    return { title: 'HUD RPG', layers: [{ name: 'HUD · RPG Completo', pixels: g, colorTag: '#38bdf8' }] };
  }

  if (templateId === 'hud_fighting') {
    const frameLayer = makeGrid(w, h);
    const indLayer = makeGrid(w, h);
    const pad = Math.max(2, Math.floor(w * 0.04));
    const timerW = Math.max(8, Math.floor(w * 0.16));
    const timerX = Math.floor((w - timerW) / 2);
    const barW = Math.max(8, timerX - pad - 2);
    const barH = Math.max(5, Math.floor(h * 0.11));

    // Top health bars
    drawBevelBox(frameLayer, pad, pad, barW, barH, '#1e293b', '#020617', '#e2e8f0', '#0f172a');
    drawBevelBox(frameLayer, timerX + timerW + 2, pad, barW, barH, '#1e293b', '#020617', '#e2e8f0', '#0f172a');
    drawBevelBox(frameLayer, timerX, pad - 1, timerW, barH + 3, '#0f172a', '#020617', '#facc15', '#92400e');

    fillRect(indLayer, pad + 2, pad + 2, Math.max(2, barW - 4), Math.max(1, barH - 4), '#facc15');
    fillRect(indLayer, timerX + timerW + 4, pad + 2, Math.max(2, Math.floor((barW - 4) * 0.8)), Math.max(1, barH - 4), '#ef4444');

    // Bottom super meters
    const supW = Math.max(10, Math.floor(w * 0.34));
    const supH = Math.max(4, Math.floor(h * 0.09));
    drawBevelBox(frameLayer, pad, h - pad - supH, supW, supH, '#0f172a', '#020617', '#38bdf8', '#1e3a8a');
    drawBevelBox(frameLayer, w - pad - supW, h - pad - supH, supW, supH, '#0f172a', '#020617', '#f97316', '#7c2d12');
    fillRect(indLayer, pad + 2, h - pad - supH + 2, Math.max(2, Math.floor((supW - 4) * 0.7)), Math.max(1, supH - 4), '#22d3ee');
    fillRect(indLayer, w - pad - supW + 2, h - pad - supH + 2, Math.max(2, Math.floor((supW - 4) * 0.9)), Math.max(1, supH - 4), '#fb923c');

    return {
      title: 'HUD Fighting Game',
      layers: [
        { name: 'HUD · Marcos y Contenedores', pixels: frameLayer, colorTag: '#94a3b8' },
        { name: 'HUD · Indicadores Vida/Super', pixels: indLayer, colorTag: '#facc15' },
      ],
    };
  }

  // ---------------- STAGE TEMPLATES (MULTI-LAYER PARALLAX) ----------------
  if (templateId.startsWith('stage_')) {
    const palettes: Record<
      string,
      { skyTop: string; skyBot: string; far: string; mid: string; ground: string; groundHi: string; accent: string; title: string }
    > = {
      stage_forest: { skyTop: '#0f172a', skyBot: '#1e3a5f', far: '#14532d', mid: '#166534', ground: '#3f2e21', groundHi: '#4d7c0f', accent: '#fde047', title: 'Bosque Ancestral' },
      stage_city: { skyTop: '#090d1f', skyBot: '#311042', far: '#1e1b4b', mid: '#312e81', ground: '#1f2937', groundHi: '#374151', accent: '#ec4899', title: 'Ciudad Neón' },
      stage_castle: { skyTop: '#0c0a1d', skyBot: '#2e1065', far: '#334155', mid: '#475569', ground: '#1e293b', groundHi: '#64748b', accent: '#f59e0b', title: 'Castillo Gótico' },
      stage_ruins: { skyTop: '#7c2d12', skyBot: '#ea580c', far: '#9a3412', mid: '#b45309', ground: '#78350f', groundHi: '#d97706', accent: '#fef08a', title: 'Ruinas Antiguas' },
      stage_interior: { skyTop: '#451a03', skyBot: '#78350f', far: '#92400e', mid: '#d6d3d1', ground: '#854d0e', groundHi: '#ca8a04', accent: '#ef4444', title: 'Dojo Interior' },
      stage_lab: { skyTop: '#082f49', skyBot: '#0f172a', far: '#1e293b', mid: '#334155', ground: '#0f172a', groundHi: '#06b6d4', accent: '#22d3ee', title: 'Laboratorio' },
      stage_scifi: { skyTop: '#020617', skyBot: '#172554', far: '#1e3a8a', mid: '#1e293b', ground: '#334155', groundHi: '#38bdf8', accent: '#a855f7', title: 'Estación Futurista' },
      stage_arena: { skyTop: '#1c1917', skyBot: '#44403c', far: '#57534e', mid: '#78716c', ground: '#a16207', groundHi: '#eab308', accent: '#ef4444', title: 'Arena de Combate' },
    };
    const p = palettes[templateId] || palettes.stage_city;
    const sky = makeGrid(w, h);
    const far = makeGrid(w, h);
    const mid = makeGrid(w, h);
    const ground = makeGrid(w, h);
    const horizon = Math.floor(h * 0.5);
    const floorY = Math.floor(h * 0.8);

    // Sky gradient + celestial orb
    for (let y = 0; y < floorY; y++) {
      const col = y < horizon * 0.6 ? p.skyTop : p.skyBot;
      for (let x = 0; x < w; x++) sky[y][x] = col;
    }
    drawFilledCircle(sky, Math.floor(w * 0.72), Math.floor(h * 0.22), Math.max(2, Math.floor(Math.min(w, h) * 0.08)), p.accent);

    // Far silhouettes (seamless periodic hills/towers)
    for (let x = 0; x < w; x++) {
      const wave = Math.floor(Math.sin((x / w) * Math.PI * 4) * (h * 0.12) + Math.cos((x / w) * Math.PI * 8) * (h * 0.04));
      const topY = Math.max(2, horizon - Math.floor(h * 0.1) + wave);
      for (let y = topY; y < floorY; y++) far[y][x] = p.far;
    }

    // Mid architecture / trees / pillars (periodic)
    const count = 4;
    const span = Math.max(6, Math.floor(w / count));
    for (let i = 0; i < count; i++) {
      const bx = i * span + Math.floor(span * 0.2);
      const bw = Math.max(3, Math.floor(span * 0.45));
      const bh = Math.floor(h * (0.28 + (i % 2) * 0.12));
      fillRect(mid, bx, floorY - bh, bw, bh, p.mid);
      // Lit windows / lanterns
      fillRect(mid, bx + 1, floorY - bh + 2, Math.max(1, bw - 2), 2, p.accent);
    }

    // Ground plane
    fillRect(ground, 0, floorY, w, h - floorY, p.ground);
    fillRect(ground, 0, floorY, w, Math.max(1, Math.floor(h * 0.04)), p.groundHi);
    for (let x = 0; x < w; x += Math.max(4, Math.floor(w / 10))) {
      fillRect(ground, x, floorY + 2, 1, h - floorY - 2, p.groundHi);
    }

    return {
      title: p.title,
      layers: [
        { name: 'Cielo', pixels: sky, parallaxSpeed: 0.1, stagePlane: 'sky', colorTag: '#38bdf8' },
        { name: 'Fondo lejano', pixels: far, parallaxSpeed: 0.3, stagePlane: 'far', colorTag: '#6366f1' },
        { name: 'Fondo medio', pixels: mid, parallaxSpeed: 0.6, stagePlane: 'mid', colorTag: '#8b5cf6' },
        { name: 'Suelo', pixels: ground, parallaxSpeed: 1.0, stagePlane: 'ground', colorTag: '#10b981' },
      ],
    };
  }

  // ---------------- TILESET TEMPLATES ----------------
  if (templateId.startsWith('tileset_')) {
    const g = makeGrid(w, h);
    if (templateId === 'tileset_rpg') {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const hHash = ((x * 73 + y * 137) ^ (x * y)) & 15;
          g[y][x] = hHash === 0 ? '#4ade80' : hHash < 4 ? '#15803d' : '#16a34a';
        }
      }
      // Subtle seamless cross-path stones in middle
      const pathH = Math.max(4, Math.floor(h * 0.25));
      const py = Math.floor((h - pathH) / 2);
      fillRect(g, 0, py, w, pathH, '#a8a29e');
      fillRect(g, 0, py, w, 1, '#d6d3d1');
      fillRect(g, 0, py + pathH - 1, w, 1, '#57534e');
      return { title: 'Terreno RPG Top-Down', layers: [{ name: 'Tileset · RPG Terreno', pixels: g, colorTag: '#22c55e' }] };
    }
    if (templateId === 'tileset_platform') {
      const grassH = Math.max(3, Math.floor(h * 0.22));
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (y < grassH) {
            g[y][x] = y === 0 ? '#86efac' : y === grassH - 1 ? '#15803d' : '#22c55e';
          } else {
            const brick = ((x + (Math.floor(y / 4) % 2) * 4) % 8 === 0) || (y % 4 === 0);
            g[y][x] = brick ? '#451a03' : (x + y) % 5 === 0 ? '#92400e' : '#78350f';
          }
        }
      }
      return { title: 'Plataforma Lateral', layers: [{ name: 'Tileset · Plataforma', pixels: g, colorTag: '#f59e0b' }] };
    }
    // Metroidvania dark stone bricks (strictly seamless)
    const brickW = Math.max(4, Math.floor(w / 4));
    const brickH = Math.max(4, Math.floor(h / 4));
    for (let y = 0; y < h; y++) {
      const row = Math.floor(y / brickH);
      const offset = (row % 2) * Math.floor(brickW / 2);
      for (let x = 0; x < w; x++) {
        const bx = (x + offset) % brickW;
        const by = y % brickH;
        if (bx === 0 || by === 0) g[y][x] = '#0f172a';
        else if (by === 1) g[y][x] = '#475569';
        else g[y][x] = ((x * 19 + y * 31) % 11 === 0) ? '#15803d' : '#334155';
      }
    }
    return { title: 'Mazmorra Metroidvania', layers: [{ name: 'Tileset · Metroidvania', pixels: g, colorTag: '#a855f7' }] };
  }

  // ---------------- PORTRAIT TEMPLATES ----------------
  if (templateId.startsWith('portrait_')) {
    const bg = makeGrid(w, h);
    const guide = makeGrid(w, h);
    const pad = Math.max(2, Math.floor(w * 0.06));
    if (templateId === 'portrait_fg') {
      // Dramatic diagonal speed-lines cut-in
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const band = (x + y * 2) % 9;
          bg[y][x] = band < 2 ? '#f59e0b' : band < 5 ? '#7c2d12' : '#1e1b4b';
        }
      }
      strokeRect(bg, 0, 0, w, h, '#fde047', 1);
    } else {
      drawBevelBox(bg, pad, pad, w - pad * 2, h - pad * 2, '#1e1b4b', '#020617', '#ec4899', '#500724');
    }
    // Head + shoulders silhouette guide
    drawFilledCircle(guide, Math.floor(w / 2), Math.floor(h * 0.38), Math.max(4, Math.floor(Math.min(w, h) * 0.2)), '#64748b');
    fillRect(guide, Math.floor(w * 0.26), Math.floor(h * 0.58), Math.floor(w * 0.48), Math.floor(h * 0.34), '#475569');
    return {
      title: templateId === 'portrait_fg' ? 'Fighting Cut-In' : templateId === 'portrait_rpg' ? 'Medallón RPG' : 'Visual Novel Bust',
      layers: [
        { name: 'Fondo Retrato', pixels: bg, colorTag: '#ec4899' },
        { name: 'Silueta Guía Facial', pixels: guide, colorTag: '#94a3b8', opacity: 0.45 },
      ],
    };
  }

  // ---------------- CUTSCENE TEMPLATES ----------------
  const frame = makeGrid(w, h);
  const barH = Math.max(3, Math.floor(h * 0.14));
  if (templateId === 'cutscene_comic') {
    fillRect(frame, 0, 0, w, h, '#f8fafc');
    const pad = Math.max(2, Math.floor(w * 0.05));
    const midY = Math.floor(h * 0.52);
    fillRect(frame, pad, pad, w - pad * 2, midY - pad - 1, '#0f172a');
    fillRect(frame, pad, midY + 1, Math.floor(w * 0.44) - pad, h - midY - pad - 1, '#1e293b');
    fillRect(frame, Math.floor(w * 0.46), midY + 1, w - Math.floor(w * 0.46) - pad, h - midY - pad - 1, '#1e1b4b');
    return { title: 'Viñeta Cómic', layers: [{ name: 'Cutscene · Viñetas Cómic', pixels: frame, colorTag: '#eab308' }] };
  }
  if (templateId === 'cutscene_dialogue') {
    fillRect(frame, 0, 0, w, barH, '#020617');
    drawBevelBox(frame, Math.max(2, Math.floor(w * 0.06)), Math.floor(h * 0.7), Math.floor(w * 0.88), Math.floor(h * 0.24), '#0f172a', '#020617', '#eab308', '#1e293b');
    return { title: 'Escena de Diálogo', layers: [{ name: 'Cutscene · Marco Diálogo', pixels: frame, colorTag: '#eab308' }] };
  }
  fillRect(frame, 0, 0, w, barH, '#020617');
  fillRect(frame, 0, h - barH, w, barH, '#020617');
  return { title: 'Splash Art Cinemático', layers: [{ name: 'Cutscene · Bandas 2.39:1', pixels: frame, colorTag: '#eab308' }] };
}

// =========================================================
// TILESET SEAM CHECKER & AUTOTILE ANALYSIS
// =========================================================
function hexToRgbTuple(hex: string | null): [number, number, number, number] {
  if (!hex) return [0, 0, 0, 0];
  const clean = hex.replace('#', '');
  if (clean.length < 6) return [0, 0, 0, 255];
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  return [r, g, b, 255];
}

export interface TilesetSeamReport {
  horizontalScore: number; // 0..100% seamless Left <-> Right
  verticalScore: number; // 0..100% seamless Top <-> Bottom
  overallScore: number; // 0..100%
  mismatchedEdgePixels: { x: number; y: number }[];
}

export function analyzeTilesetSeams(
  grid: (string | null)[][],
  width: number,
  height: number
): TilesetSeamReport {
  if (width < 2 || height < 2 || !grid.length) {
    return { horizontalScore: 100, verticalScore: 100, overallScore: 100, mismatchedEdgePixels: [] };
  }
  const mismatched: { x: number; y: number }[] = [];
  let hMatches = 0;
  let vMatches = 0;
  const colorTol = 58; // perceptual distance tolerance for smooth pixel transitions

  for (let y = 0; y < height; y++) {
    const left = hexToRgbTuple(grid[y]?.[0] ?? null);
    const right = hexToRgbTuple(grid[y]?.[width - 1] ?? null);
    const alphaDiff = Math.abs(left[3] - right[3]);
    const dist = Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
    if (alphaDiff === 0 && dist <= colorTol) {
      hMatches++;
    } else {
      mismatched.push({ x: 0, y }, { x: width - 1, y });
    }
  }

  for (let x = 0; x < width; x++) {
    const top = hexToRgbTuple(grid[0]?.[x] ?? null);
    const bot = hexToRgbTuple(grid[height - 1]?.[x] ?? null);
    const alphaDiff = Math.abs(top[3] - bot[3]);
    const dist = Math.hypot(top[0] - bot[0], top[1] - bot[1], top[2] - bot[2]);
    if (alphaDiff === 0 && dist <= colorTol) {
      vMatches++;
    } else {
      mismatched.push({ x, y: 0 }, { x, y: height - 1 });
    }
  }

  const horizontalScore = Math.round((hMatches / height) * 100);
  const verticalScore = Math.round((vMatches / width) * 100);
  const overallScore = Math.round((horizontalScore + verticalScore) / 2);

  return { horizontalScore, verticalScore, overallScore, mismatchedEdgePixels: mismatched };
}
