import {
  AutoFloorGridConfig,
  CameraGuidesConfig,
  CanvasGuide,
  Frame,
  GuideGroup,
  GuidePresetKind,
  GuidesConfig,
  LayerGroup,
  PerspectiveGuidesConfig,
  PerspectiveGuideType,
  RulerUnit,
  SavedPerspectiveConfiguration,
  ScenarioGuidePresetId,
  StageDepthGuidesConfig,
  VanishingPoint,
} from '../types';
import { compositeFrame } from './pixelMath';
import { isFrameTiled, renderTiledFrameThumbnailDataUrl } from './tiledImageEngine';

export const GUIDES_CONFIG_STORAGE_KEY = 'pixelclash_guides_config_v2';
export const LEGACY_GUIDES_CONFIG_STORAGE_KEY = 'pixelclash_guides_config_v1';
export const SAVED_PERSPECTIVE_CONFIGS_KEY = 'pixelclash_saved_perspective_configs_v1';

export const DEFAULT_GUIDE_GROUPS: GuideGroup[] = [
  {
    id: 'grp-stage',
    name: 'Guías Escenario',
    visible: true,
    locked: false,
    color: '#10b981',
    thickness: 1,
    opacity: 0.8,
  },
  {
    id: 'grp-characters',
    name: 'Guías Personajes',
    visible: true,
    locked: false,
    color: '#38bdf8',
    thickness: 1,
    opacity: 0.82,
  },
  {
    id: 'grp-hud',
    name: 'Guías HUD',
    visible: true,
    locked: false,
    color: '#f43f5e',
    thickness: 1,
    opacity: 0.8,
  },
  {
    id: 'grp-camera',
    name: 'Guías Cámara',
    visible: true,
    locked: false,
    color: '#f59e0b',
    thickness: 1,
    opacity: 0.85,
  },
];

export const DEFAULT_AUTO_FLOOR_GRID: AutoFloorGridConfig = {
  enabled: false,
  spacing: 12,
  density: 10,
  color: '#10b981',
  opacity: 0.6,
  floorYRatio: 0.94,
  depthRows: 7,
};

export function createVanishingPointsForType(
  type: PerspectiveGuideType,
  canvasW: number = 128,
  canvasH: number = 128,
  horizonY?: number
): VanishingPoint[] {
  const hy = Math.round(horizonY ?? canvasH * 0.54);
  const cx = Math.round(canvasW * 0.5);
  switch (type) {
    case '1point':
      return [
        {
          id: 'vp-center',
          label: 'PF Central',
          x: cx,
          y: hy,
          locked: false,
          visible: true,
          color: '#38bdf8',
        },
      ];
    case '2point':
      return [
        {
          id: 'vp-left',
          label: 'PF Izquierdo',
          x: Math.round(-canvasW * 0.35),
          y: hy,
          locked: false,
          visible: true,
          color: '#38bdf8',
        },
        {
          id: 'vp-right',
          label: 'PF Derecho',
          x: Math.round(canvasW * 1.35),
          y: hy,
          locked: false,
          visible: true,
          color: '#a855f7',
        },
      ];
    case '3point':
      return [
        {
          id: 'vp-left',
          label: 'PF Izquierdo',
          x: Math.round(-canvasW * 0.38),
          y: hy,
          locked: false,
          visible: true,
          color: '#38bdf8',
        },
        {
          id: 'vp-right',
          label: 'PF Derecho',
          x: Math.round(canvasW * 1.38),
          y: hy,
          locked: false,
          visible: true,
          color: '#a855f7',
        },
        {
          id: 'vp-vertical',
          label: 'PF Vertical (Cenit)',
          x: cx,
          y: Math.round(-canvasH * 0.65),
          locked: false,
          visible: true,
          color: '#f59e0b',
        },
      ];
    case 'curvilinear':
      return [
        {
          id: 'vp-curv-center',
          label: 'PF Centro Ojo',
          x: cx,
          y: hy,
          locked: false,
          visible: true,
          color: '#38bdf8',
        },
        {
          id: 'vp-curv-left',
          label: 'PF Arco Izq.',
          x: Math.round(-canvasW * 0.15),
          y: hy,
          locked: false,
          visible: true,
          color: '#10b981',
        },
        {
          id: 'vp-curv-right',
          label: 'PF Arco Der.',
          x: Math.round(canvasW * 1.15),
          y: hy,
          locked: false,
          visible: true,
          color: '#10b981',
        },
        {
          id: 'vp-curv-top',
          label: 'PF Arco Sup.',
          x: cx,
          y: Math.round(-canvasH * 0.18),
          locked: false,
          visible: true,
          color: '#f59e0b',
        },
        {
          id: 'vp-curv-bottom',
          label: 'PF Arco Inf.',
          x: cx,
          y: Math.round(canvasH * 1.18),
          locked: false,
          visible: true,
          color: '#f59e0b',
        },
      ];
    case 'isometric':
    case 'dimetric':
    case 'trimetric':
    default:
      return [];
  }
}

export function getDefaultAxonometricAngles(type: PerspectiveGuideType): {
  isoAngleLeft: number;
  isoAngleRight: number;
} {
  if (type === 'dimetric') {
    // 2:1 pixel art isometric standard (~26.565 deg)
    return { isoAngleLeft: 26.57, isoAngleRight: 26.57 };
  }
  if (type === 'trimetric') {
    return { isoAngleLeft: 18, isoAngleRight: 36 };
  }
  return { isoAngleLeft: 30, isoAngleRight: 30 };
}

export const DEFAULT_PERSPECTIVE_CONFIG: PerspectiveGuidesConfig = {
  enabled: false,
  type: '1point',
  vanishingPoints: createVanishingPointsForType('1point', 128, 128, 69),
  horizonY: 69,
  horizonLocked: false,
  showHorizon: true,
  showRays: true,
  rayDensity: 12,
  showConstructionGrid: true,
  color: '#38bdf8',
  thickness: 1,
  opacity: 0.65,
  isoAngleLeft: 30,
  isoAngleRight: 30,
  isoCellSize: 16,
  floorGrid: { ...DEFAULT_AUTO_FLOOR_GRID },
  activeScenarioPreset: null,
  configName: 'Personalizada',
};

export const DEFAULT_CAMERA_GUIDES_CONFIG: CameraGuidesConfig = {
  enabled: false,
  showVisibleArea: true,
  visibleAreaInsetPct: 4,
  showSafeMargins: true,
  safeMarginPct: 9,
  showCombatZone: true,
  combatZoneInsetXPct: 14,
  combatZoneTopPct: 30,
  combatZoneFloorPct: 86,
  showScrollLimits: true,
  scrollLimitInsetPct: 7,
  showCameraCenter: true,
  color: '#f59e0b',
  thickness: 1,
  opacity: 0.78,
};

export const DEFAULT_STAGE_DEPTH_CONFIG: StageDepthGuidesConfig = {
  enabled: false,
  autoShowInStageMode: true,
  showHorizon: true,
  horizonPct: 54,
  showGroundPlane: true,
  groundPlanePct: 84,
  showVisualDepth: true,
  showFarBackground: true,
  farBgPct: 26,
  showMidBackground: true,
  midBgPct: 68,
  showForeground: true,
  foregroundPct: 93,
  color: '#10b981',
  thickness: 1,
  opacity: 0.75,
};

export const DEFAULT_GUIDES_CONFIG: GuidesConfig = {
  showRulers: true,
  showGuides: true,
  lockGuides: false,
  unit: 'px',
  customScale: 16,
  customLabel: 'tile',
  snapToGuides: true,
  snapToRulers: false,
  snapToGrid: false,
  snapToPerspective: false,
  dummieFollowPerspective: false,
  snapThresholdPx: 2.5,
  gridStep: 8,
  defaultGuideColor: '#38bdf8',
  defaultGuideThickness: 1,
  defaultGuideOpacity: 0.8,
  groups: DEFAULT_GUIDE_GROUPS.map((g) => ({ ...g })),
  activeGroupId: 'grp-stage',
  perspective: {
    ...DEFAULT_PERSPECTIVE_CONFIG,
    vanishingPoints: DEFAULT_PERSPECTIVE_CONFIG.vanishingPoints.map((vp) => ({ ...vp })),
    floorGrid: { ...DEFAULT_AUTO_FLOOR_GRID },
  },
  cameraGuides: { ...DEFAULT_CAMERA_GUIDES_CONFIG },
  stageDepth: { ...DEFAULT_STAGE_DEPTH_CONFIG },
};

export function normalizeGuidesConfig(raw: any): GuidesConfig {
  const parsed = raw && typeof raw === 'object' ? raw : {};
  const perspRaw = parsed.perspective || {};
  const floorRaw = perspRaw.floorGrid || {};
  const camRaw = parsed.cameraGuides || {};
  const stageRaw = parsed.stageDepth || {};
  const groupsRaw = Array.isArray(parsed.groups) && parsed.groups.length > 0
    ? parsed.groups
    : DEFAULT_GUIDE_GROUPS.map((g) => ({ ...g }));

  return {
    ...DEFAULT_GUIDES_CONFIG,
    ...parsed,
    customScale: Math.max(1, Number(parsed?.customScale) || 16),
    gridStep: Math.max(1, Number(parsed?.gridStep) || 8),
    snapThresholdPx: Math.max(0.5, Math.min(12, Number(parsed?.snapThresholdPx) || 2.5)),
    snapToPerspective: Boolean(parsed?.snapToPerspective),
    dummieFollowPerspective: Boolean(parsed?.dummieFollowPerspective),
    defaultGuideColor: parsed?.defaultGuideColor || '#38bdf8',
    defaultGuideThickness: Math.max(1, Math.min(4, Number(parsed?.defaultGuideThickness) || 1)),
    defaultGuideOpacity: Math.max(0.1, Math.min(1, Number(parsed?.defaultGuideOpacity) || 0.8)),
    groups: groupsRaw,
    activeGroupId: parsed?.activeGroupId || groupsRaw[0]?.id || 'grp-stage',
    perspective: {
      ...DEFAULT_PERSPECTIVE_CONFIG,
      ...perspRaw,
      vanishingPoints: Array.isArray(perspRaw.vanishingPoints)
        ? perspRaw.vanishingPoints
        : DEFAULT_PERSPECTIVE_CONFIG.vanishingPoints.map((vp) => ({ ...vp })),
      rayDensity: Math.max(4, Math.min(36, Number(perspRaw.rayDensity) || 12)),
      thickness: Math.max(1, Math.min(4, Number(perspRaw.thickness) || 1)),
      opacity: Math.max(0.1, Math.min(1, Number(perspRaw.opacity) || 0.65)),
      isoCellSize: Math.max(4, Math.min(64, Number(perspRaw.isoCellSize) || 16)),
      floorGrid: {
        ...DEFAULT_AUTO_FLOOR_GRID,
        ...floorRaw,
        spacing: Math.max(2, Math.min(64, Number(floorRaw.spacing) || 12)),
        density: Math.max(3, Math.min(28, Number(floorRaw.density) || 10)),
        opacity: Math.max(0.1, Math.min(1, Number(floorRaw.opacity) || 0.6)),
        floorYRatio: Math.max(0.55, Math.min(1.15, Number(floorRaw.floorYRatio) || 0.94)),
        depthRows: Math.max(2, Math.min(18, Number(floorRaw.depthRows) || 7)),
      },
    },
    cameraGuides: {
      ...DEFAULT_CAMERA_GUIDES_CONFIG,
      ...camRaw,
    },
    stageDepth: {
      ...DEFAULT_STAGE_DEPTH_CONFIG,
      ...stageRaw,
    },
  };
}

export function loadGuidesConfig(): GuidesConfig {
  try {
    const raw =
      localStorage.getItem(GUIDES_CONFIG_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_GUIDES_CONFIG_STORAGE_KEY);
    if (!raw) return normalizeGuidesConfig(null);
    return normalizeGuidesConfig(JSON.parse(raw));
  } catch {
    return normalizeGuidesConfig(null);
  }
}

export function saveGuidesConfig(cfg: GuidesConfig): void {
  try {
    localStorage.setItem(GUIDES_CONFIG_STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // Ignore storage quota errors
  }
}

// =========================================================
// PERSPECTIVE TYPES, SCENARIO PRESETS & SAVED CONFIGS
// =========================================================
export const PERSPECTIVE_TYPE_META: {
  id: PerspectiveGuideType;
  label: string;
  shortLabel: string;
  desc: string;
}[] = [
  {
    id: '1point',
    label: 'Perspectiva de 1 punto',
    shortLabel: '1 Punto',
    desc: 'Ideal para escenarios Fighting, pasillos, calles frontales y pisos de combate simétricos.',
  },
  {
    id: '2point',
    label: 'Perspectiva de 2 puntos',
    shortLabel: '2 Puntos',
    desc: 'Edificios en esquina, ciudades, templos e interiores con puntos de fuga fuera del lienzo.',
  },
  {
    id: '3point',
    label: 'Perspectiva de 3 puntos',
    shortLabel: '3 Puntos',
    desc: 'Planos picados o contrapicados dramáticos con fuga vertical cenit/nadir.',
  },
  {
    id: 'curvilinear',
    label: 'Perspectiva curvilínea',
    shortLabel: 'Curvilínea',
    desc: 'Gran angular / ojo de pez con arcos suaves para cámaras dinámicas y supers.',
  },
  {
    id: 'isometric',
    label: 'Perspectiva isométrica',
    shortLabel: 'Isométrica',
    desc: 'Proyección clásica 30°/30° sin distorsión para RPG tácticos y tilesets.',
  },
  {
    id: 'dimetric',
    label: 'Perspectiva dimétrica',
    shortLabel: 'Dimétrica 2:1',
    desc: 'Proporción 2:1 pixel art (~26.57°) para escalones limpios sin dientes de sierra.',
  },
  {
    id: 'trimetric',
    label: 'Perspectiva trimétrica',
    shortLabel: 'Trimétrica',
    desc: 'Ángulos asimétricos (18°/36°) para composiciones arquitectónicas con mayor dinamismo.',
  },
];

export interface ScenarioPresetDefinition {
  id: ScenarioGuidePresetId;
  label: string;
  subtitle: string;
  accent: string;
  build: (
    canvasW: number,
    canvasH: number
  ) => {
    perspective: PerspectiveGuidesConfig;
    cameraGuides: CameraGuidesConfig;
    stageDepth: StageDepthGuidesConfig;
  };
}

export const SCENARIO_GUIDE_PRESETS: ScenarioPresetDefinition[] = [
  {
    id: 'fighting',
    label: 'Fighting Games',
    subtitle: '1 punto central + piso de combate + zona de pelea y márgenes HUD',
    accent: '#f59e0b',
    build: (w, h) => {
      const hy = Math.round(h * 0.56);
      return {
        perspective: {
          ...DEFAULT_PERSPECTIVE_CONFIG,
          enabled: true,
          type: '1point',
          horizonY: hy,
          vanishingPoints: createVanishingPointsForType('1point', w, h, hy),
          rayDensity: 12,
          showConstructionGrid: false,
          color: '#38bdf8',
          opacity: 0.55,
          floorGrid: {
            enabled: true,
            spacing: Math.max(6, Math.round(w / 10)),
            density: 12,
            color: '#10b981',
            opacity: 0.72,
            floorYRatio: 0.96,
            depthRows: 7,
          },
          activeScenarioPreset: 'fighting',
          configName: 'Escenario Fighting Games',
        },
        cameraGuides: {
          ...DEFAULT_CAMERA_GUIDES_CONFIG,
          enabled: true,
          showVisibleArea: true,
          showSafeMargins: true,
          safeMarginPct: 8,
          showCombatZone: true,
          combatZoneInsetXPct: 14,
          combatZoneTopPct: 32,
          combatZoneFloorPct: 88,
          showScrollLimits: true,
          showCameraCenter: true,
        },
        stageDepth: {
          ...DEFAULT_STAGE_DEPTH_CONFIG,
          enabled: true,
          horizonPct: 56,
          groundPlanePct: 86,
          farBgPct: 28,
          midBgPct: 68,
          foregroundPct: 94,
        },
      };
    },
  },
  {
    id: 'beatemup',
    label: "Beat'em Ups",
    subtitle: 'Plano profundo caminable (belt-scroller), horizonte alto y límites de scroll',
    accent: '#10b981',
    build: (w, h) => {
      const hy = Math.round(h * 0.44);
      return {
        perspective: {
          ...DEFAULT_PERSPECTIVE_CONFIG,
          enabled: true,
          type: '1point',
          horizonY: hy,
          vanishingPoints: createVanishingPointsForType('1point', w, h, hy),
          rayDensity: 14,
          showConstructionGrid: true,
          color: '#38bdf8',
          opacity: 0.52,
          floorGrid: {
            enabled: true,
            spacing: Math.max(6, Math.round(w / 12)),
            density: 14,
            color: '#10b981',
            opacity: 0.78,
            floorYRatio: 0.98,
            depthRows: 10,
          },
          activeScenarioPreset: 'beatemup',
          configName: "Escenario Beat'em Up",
        },
        cameraGuides: {
          ...DEFAULT_CAMERA_GUIDES_CONFIG,
          enabled: true,
          showVisibleArea: true,
          showSafeMargins: true,
          safeMarginPct: 6,
          showCombatZone: true,
          combatZoneInsetXPct: 8,
          combatZoneTopPct: 48,
          combatZoneFloorPct: 92,
          showScrollLimits: true,
          scrollLimitInsetPct: 5,
          showCameraCenter: true,
        },
        stageDepth: {
          ...DEFAULT_STAGE_DEPTH_CONFIG,
          enabled: true,
          horizonPct: 44,
          groundPlanePct: 74,
          farBgPct: 22,
          midBgPct: 54,
          foregroundPct: 94,
        },
      };
    },
  },
  {
    id: 'platformer',
    label: 'Plataformas',
    subtitle: 'Rejilla limpia de niveles, paralaje multicapa y límites de cámara lateral',
    accent: '#38bdf8',
    build: (w, h) => {
      const hy = Math.round(h * 0.62);
      return {
        perspective: {
          ...DEFAULT_PERSPECTIVE_CONFIG,
          enabled: true,
          type: '1point',
          horizonY: hy,
          vanishingPoints: createVanishingPointsForType('1point', w, h, hy),
          rayDensity: 8,
          showRays: false,
          showConstructionGrid: true,
          color: '#38bdf8',
          opacity: 0.48,
          floorGrid: {
            enabled: false,
            spacing: 16,
            density: 8,
            color: '#10b981',
            opacity: 0.45,
            floorYRatio: 0.9,
            depthRows: 4,
          },
          activeScenarioPreset: 'platformer',
          configName: 'Escenario Plataformas',
        },
        cameraGuides: {
          ...DEFAULT_CAMERA_GUIDES_CONFIG,
          enabled: true,
          showVisibleArea: true,
          showSafeMargins: true,
          safeMarginPct: 8,
          showCombatZone: false,
          showScrollLimits: true,
          scrollLimitInsetPct: 10,
          showCameraCenter: true,
        },
        stageDepth: {
          ...DEFAULT_STAGE_DEPTH_CONFIG,
          enabled: true,
          horizonPct: 62,
          groundPlanePct: 82,
          farBgPct: 24,
          midBgPct: 64,
          foregroundPct: 92,
        },
      };
    },
  },
  {
    id: 'rpg',
    label: 'RPG',
    subtitle: 'Rejilla Dimétrica 2:1 / Isométrica de mapas tácticos con centro de cámara',
    accent: '#a855f7',
    build: (w, h) => {
      const hy = Math.round(h * 0.35);
      return {
        perspective: {
          ...DEFAULT_PERSPECTIVE_CONFIG,
          enabled: true,
          type: 'dimetric',
          horizonY: hy,
          vanishingPoints: [],
          showHorizon: false,
          showRays: false,
          showConstructionGrid: true,
          isoAngleLeft: 26.57,
          isoAngleRight: 26.57,
          isoCellSize: Math.max(8, Math.round(w / 10)),
          color: '#a855f7',
          opacity: 0.62,
          floorGrid: {
            enabled: true,
            spacing: Math.max(8, Math.round(w / 10)),
            density: 12,
            color: '#a855f7',
            opacity: 0.58,
            floorYRatio: 0.95,
            depthRows: 8,
          },
          activeScenarioPreset: 'rpg',
          configName: 'Mapa RPG Dimétrico 2:1',
        },
        cameraGuides: {
          ...DEFAULT_CAMERA_GUIDES_CONFIG,
          enabled: true,
          showVisibleArea: true,
          showSafeMargins: true,
          safeMarginPct: 7,
          showCombatZone: false,
          showScrollLimits: false,
          showCameraCenter: true,
        },
        stageDepth: {
          ...DEFAULT_STAGE_DEPTH_CONFIG,
          enabled: false,
        },
      };
    },
  },
  {
    id: 'visual_novel',
    label: 'Visual Novels',
    subtitle: 'Perspectiva arquitectónica de 2 puntos + línea de ojos + zona de diálogo',
    accent: '#ec4899',
    build: (w, h) => {
      const hy = Math.round(h * 0.48);
      return {
        perspective: {
          ...DEFAULT_PERSPECTIVE_CONFIG,
          enabled: true,
          type: '2point',
          horizonY: hy,
          vanishingPoints: createVanishingPointsForType('2point', w, h, hy),
          rayDensity: 10,
          showConstructionGrid: true,
          color: '#ec4899',
          opacity: 0.56,
          floorGrid: {
            enabled: true,
            spacing: Math.max(8, Math.round(w / 8)),
            density: 8,
            color: '#f472b6',
            opacity: 0.42,
            floorYRatio: 0.96,
            depthRows: 5,
          },
          activeScenarioPreset: 'visual_novel',
          configName: 'Escenario Visual Novel 2P',
        },
        cameraGuides: {
          ...DEFAULT_CAMERA_GUIDES_CONFIG,
          enabled: true,
          showVisibleArea: true,
          showSafeMargins: true,
          safeMarginPct: 6,
          showCombatZone: true,
          combatZoneInsetXPct: 8,
          combatZoneTopPct: 72,
          combatZoneFloorPct: 95,
          showScrollLimits: false,
          showCameraCenter: true,
          color: '#ec4899',
        },
        stageDepth: {
          ...DEFAULT_STAGE_DEPTH_CONFIG,
          enabled: true,
          horizonPct: 48,
          groundPlanePct: 76,
          farBgPct: 24,
          midBgPct: 58,
          foregroundPct: 86,
          color: '#ec4899',
        },
      };
    },
  },
];

export function buildBuiltinSavedPerspectiveConfigs(
  canvasW: number,
  canvasH: number
): SavedPerspectiveConfiguration[] {
  const kofH = Math.round(canvasH * 0.56);
  const castleH = Math.round(canvasH * 0.68);
  const cityH = Math.round(canvasH * 0.52);

  return [
    {
      id: 'builtin-kof-stage01',
      name: 'Perspectiva_KOF_Stage01',
      category: 'Fighting Games',
      description: 'Escenario arcade clásico con fuga central, piso de combate y zona segura HUD.',
      builtIn: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      perspective: {
        ...DEFAULT_PERSPECTIVE_CONFIG,
        enabled: true,
        type: '1point',
        horizonY: kofH,
        vanishingPoints: createVanishingPointsForType('1point', canvasW, canvasH, kofH),
        rayDensity: 12,
        showHorizon: true,
        showRays: true,
        showConstructionGrid: false,
        color: '#38bdf8',
        thickness: 1,
        opacity: 0.58,
        floorGrid: {
          enabled: true,
          spacing: Math.max(6, Math.round(canvasW / 10)),
          density: 12,
          color: '#10b981',
          opacity: 0.72,
          floorYRatio: 0.96,
          depthRows: 7,
        },
        activeScenarioPreset: 'fighting',
        configName: 'Perspectiva_KOF_Stage01',
      },
      cameraGuides: {
        ...DEFAULT_CAMERA_GUIDES_CONFIG,
        enabled: true,
      },
      stageDepth: {
        ...DEFAULT_STAGE_DEPTH_CONFIG,
        enabled: true,
        horizonPct: 56,
        groundPlanePct: 86,
      },
    },
    {
      id: 'builtin-castillo',
      name: 'Perspectiva_Castillo',
      category: 'Arquitectura / Boss',
      description: 'Contrapicado monumental de 3 puntos con fuga cenital fuera del lienzo.',
      builtIn: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      perspective: {
        ...DEFAULT_PERSPECTIVE_CONFIG,
        enabled: true,
        type: '3point',
        horizonY: castleH,
        vanishingPoints: createVanishingPointsForType('3point', canvasW, canvasH, castleH),
        rayDensity: 10,
        showHorizon: true,
        showRays: true,
        showConstructionGrid: true,
        color: '#f59e0b',
        thickness: 1,
        opacity: 0.6,
        floorGrid: {
          enabled: true,
          spacing: Math.max(8, Math.round(canvasW / 8)),
          density: 10,
          color: '#f59e0b',
          opacity: 0.52,
          floorYRatio: 0.98,
          depthRows: 6,
        },
        configName: 'Perspectiva_Castillo',
      },
    },
    {
      id: 'builtin-ciudad',
      name: 'Perspectiva_Ciudad',
      category: 'Urbano / Calle',
      description: 'Esquina urbana de 2 puntos con fugas laterales externas y piso de avenida.',
      builtIn: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      perspective: {
        ...DEFAULT_PERSPECTIVE_CONFIG,
        enabled: true,
        type: '2point',
        horizonY: cityH,
        vanishingPoints: createVanishingPointsForType('2point', canvasW, canvasH, cityH),
        rayDensity: 12,
        showHorizon: true,
        showRays: true,
        showConstructionGrid: true,
        color: '#a855f7',
        thickness: 1,
        opacity: 0.62,
        floorGrid: {
          enabled: true,
          spacing: Math.max(8, Math.round(canvasW / 10)),
          density: 10,
          color: '#38bdf8',
          opacity: 0.56,
          floorYRatio: 0.96,
          depthRows: 7,
        },
        configName: 'Perspectiva_Ciudad',
      },
    },
  ];
}

export function loadSavedPerspectiveConfigs(
  canvasW: number,
  canvasH: number
): SavedPerspectiveConfiguration[] {
  const builtins = buildBuiltinSavedPerspectiveConfigs(canvasW, canvasH);
  try {
    const raw = localStorage.getItem(SAVED_PERSPECTIVE_CONFIGS_KEY);
    if (!raw) return builtins;
    const custom = JSON.parse(raw);
    if (!Array.isArray(custom)) return builtins;
    return [...custom, ...builtins];
  } catch {
    return builtins;
  }
}

export function saveUserPerspectiveConfig(
  cfg: SavedPerspectiveConfiguration
): SavedPerspectiveConfiguration[] {
  try {
    const raw = localStorage.getItem(SAVED_PERSPECTIVE_CONFIGS_KEY);
    const existing: SavedPerspectiveConfiguration[] = raw ? JSON.parse(raw) : [];
    const filtered = existing.filter((c) => c.id !== cfg.id && c.name !== cfg.name);
    const next = [{ ...cfg, builtIn: false }, ...filtered];
    localStorage.setItem(SAVED_PERSPECTIVE_CONFIGS_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [cfg];
  }
}

export function deleteUserPerspectiveConfig(id: string): void {
  try {
    const raw = localStorage.getItem(SAVED_PERSPECTIVE_CONFIGS_KEY);
    if (!raw) return;
    const existing: SavedPerspectiveConfiguration[] = JSON.parse(raw);
    const next = existing.filter((c) => c.id !== id);
    localStorage.setItem(SAVED_PERSPECTIVE_CONFIGS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

// =========================================================
// PERSPECTIVE & AUTO FLOOR GRID REAL-TIME GEOMETRY MATH
// =========================================================
export interface PerspectiveSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kind: 'ray' | 'grid' | 'floor_radial' | 'floor_depth' | 'horizon';
  color?: string;
}

export interface PerspectiveArc {
  x1: number;
  y1: number;
  cx: number;
  cy: number;
  x2: number;
  y2: number;
  kind: 'curvilinear_h' | 'curvilinear_v';
  color?: string;
}

export interface PerspectiveGeometryResult {
  segments: PerspectiveSegment[];
  arcs: PerspectiveArc[];
}

export function computeAutoFloorGridSegments(
  perspective: PerspectiveGuidesConfig,
  canvasW: number,
  canvasH: number
): PerspectiveSegment[] {
  const fg = perspective.floorGrid;
  if (!fg || !fg.enabled) return [];

  const segments: PerspectiveSegment[] = [];
  const floorColor = fg.color || '#10b981';

  // Axonometric floor plane (isometric / dimetric / trimetric)
  if (
    perspective.type === 'isometric' ||
    perspective.type === 'dimetric' ||
    perspective.type === 'trimetric'
  ) {
    const cell = Math.max(4, fg.spacing || perspective.isoCellSize || 16);
    const radL = ((perspective.isoAngleLeft || 30) * Math.PI) / 180;
    const radR = ((perspective.isoAngleRight || 30) * Math.PI) / 180;
    const tanL = Math.tan(radL);
    const tanR = Math.tan(radR);
    const diag = Math.hypot(canvasW, canvasH) * 1.4;
    const minY = Math.round(canvasH * 0.45);
    const maxY = Math.round(canvasH * fg.floorYRatio);
    const stepX = Math.max(4, cell * (12 / Math.max(4, fg.density)));

    for (let x = -canvasW; x <= canvasW * 2; x += stepX) {
      // Right-up diagonal clipped loosely around floor band
      const dxR = diag;
      const dyR = -diag * tanR;
      segments.push({
        x1: x - dxR * 0.5,
        y1: maxY - dyR * 0.5,
        x2: x + dxR * 0.5,
        y2: maxY + dyR * 0.5,
        kind: 'floor_radial',
        color: floorColor,
      });
      // Left-up diagonal
      const dxL = diag;
      const dyL = diag * tanL;
      segments.push({
        x1: x - dxL * 0.5,
        y1: minY - dyL * 0.5,
        x2: x + dxL * 0.5,
        y2: minY + dyL * 0.5,
        kind: 'floor_depth',
        color: floorColor,
      });
    }
    return segments;
  }

  // Vanishing-point based Perspective Floor Grid (1pt, 2pt, 3pt, curvilinear)
  const visibleVps = perspective.vanishingPoints.filter((vp) => vp.visible);
  const horizonY = perspective.horizonY;
  const floorBottomY = canvasH * Math.max(0.55, fg.floorYRatio);
  const effectiveFloorY =
    Math.abs(floorBottomY - horizonY) < 4 ? horizonY + Math.max(24, canvasH * 0.35) : floorBottomY;

  const density = Math.max(3, Math.min(28, Math.round(fg.density)));
  const spacingRatio = Math.max(0.35, Math.min(2.8, fg.spacing / 12));
  const spanHalf = canvasW * 0.9 * spacingRatio;
  const centerX = canvasW * 0.5;

  if (perspective.type === '2point' || perspective.type === '3point') {
    const vpL = visibleVps[0] || { x: -canvasW * 0.35, y: horizonY };
    const vpR = visibleVps[1] || { x: canvasW * 1.35, y: horizonY };
    const steps = Math.max(4, Math.min(20, density));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const bx = centerX - spanHalf + t * spanHalf * 2;
      segments.push({
        x1: vpL.x,
        y1: vpL.y,
        x2: bx,
        y2: effectiveFloorY,
        kind: 'floor_radial',
        color: floorColor,
      });
      segments.push({
        x1: vpR.x,
        y1: vpR.y,
        x2: bx,
        y2: effectiveFloorY,
        kind: 'floor_radial',
        color: floorColor,
      });
    }
  } else {
    // 1-point & curvilinear floor grid converging toward primary VP
    const primaryVp = visibleVps[0] || { x: centerX, y: horizonY };
    for (let i = -density; i <= density; i++) {
      const bx = primaryVp.x + (i / density) * spanHalf * 1.6;
      segments.push({
        x1: primaryVp.x,
        y1: primaryVp.y,
        x2: bx,
        y2: effectiveFloorY + (effectiveFloorY - primaryVp.y) * 0.25,
        kind: 'floor_radial',
        color: floorColor,
      });
    }
  }

  // Foreshortened horizontal depth lines between horizonY and effectiveFloorY
  const rows = Math.max(2, Math.min(18, Math.round(fg.depthRows)));
  const depthSpan = effectiveFloorY - horizonY;
  for (let r = 1; r <= rows; r++) {
    // Non-linear perspective progression (closer together near horizon, wider in foreground)
    const u = r / rows;
    const perspT = Math.pow(u, 1.85);
    const y = horizonY + depthSpan * perspT;
    segments.push({
      x1: -canvasW * 0.35,
      y1: y,
      x2: canvasW * 1.35,
      y2: y,
      kind: 'floor_depth',
      color: floorColor,
    });
  }

  return segments;
}

export function computePerspectiveGeometry(
  perspective: PerspectiveGuidesConfig,
  canvasW: number,
  canvasH: number
): PerspectiveGeometryResult {
  const segments: PerspectiveSegment[] = [];
  const arcs: PerspectiveArc[] = [];
  if (!perspective.enabled) return { segments, arcs };

  const extendDist = Math.hypot(canvasW, canvasH) * 2.4;

  // 1. Isometric / Dimetric / Trimetric Construction Grids
  if (
    perspective.type === 'isometric' ||
    perspective.type === 'dimetric' ||
    perspective.type === 'trimetric'
  ) {
    if (perspective.showConstructionGrid || perspective.showRays) {
      const cell = Math.max(4, perspective.isoCellSize || 16);
      const radL = ((perspective.isoAngleLeft || 30) * Math.PI) / 180;
      const radR = ((perspective.isoAngleRight || 30) * Math.PI) / 180;
      const cosL = Math.cos(radL);
      const sinL = Math.sin(radL);
      const cosR = Math.cos(radR);
      const sinR = Math.sin(radR);

      // Family A (left-to-right rising)
      const count = Math.ceil((canvasW + canvasH) / cell) + 6;
      for (let i = -count; i <= count; i++) {
        const ox = i * cell;
        const oy = canvasH * 0.5;
        segments.push({
          x1: ox - cosR * extendDist,
          y1: oy + sinR * extendDist,
          x2: ox + cosR * extendDist,
          y2: oy - sinR * extendDist,
          kind: 'grid',
          color: perspective.color,
        });
        // Family B (left-to-right falling)
        segments.push({
          x1: ox - cosL * extendDist,
          y1: oy - sinL * extendDist,
          x2: ox + cosL * extendDist,
          y2: oy + sinL * extendDist,
          kind: 'grid',
          color: perspective.color,
        });
      }

      // Vertical construction verticals for axonometric architecture
      if (perspective.showConstructionGrid) {
        for (let vx = 0; vx <= canvasW; vx += cell) {
          segments.push({
            x1: vx,
            y1: -canvasH * 0.25,
            x2: vx,
            y2: canvasH * 1.25,
            kind: 'grid',
            color: perspective.color,
          });
        }
      }
    }
    return { segments, arcs };
  }

  // 2. Curvilinear Perspective (5-point fisheye curved grid + central rays)
  if (perspective.type === 'curvilinear') {
    const vps = perspective.vanishingPoints.filter((vp) => vp.visible);
    const centerVp = vps[0] || { x: canvasW * 0.5, y: perspective.horizonY };
    const leftVp = vps[1] || { x: -canvasW * 0.15, y: perspective.horizonY };
    const rightVp = vps[2] || { x: canvasW * 1.15, y: perspective.horizonY };
    const topVp = vps[3] || { x: centerVp.x, y: -canvasH * 0.18 };
    const bottomVp = vps[4] || { x: centerVp.x, y: canvasH * 1.18 };

    const count = Math.max(4, Math.min(18, Math.round(perspective.rayDensity * 0.75)));
    // Horizontal curved latitude arcs from leftVp to rightVp
    for (let i = -count; i <= count; i++) {
      if (i === 0) continue;
      const ratio = i / count;
      const cy = centerVp.y + ratio * canvasH * 1.15;
      arcs.push({
        x1: leftVp.x,
        y1: leftVp.y,
        cx: centerVp.x,
        cy,
        x2: rightVp.x,
        y2: rightVp.y,
        kind: 'curvilinear_h',
        color: perspective.color,
      });
    }
    // Vertical curved longitude arcs from topVp to bottomVp
    for (let i = -count; i <= count; i++) {
      if (i === 0) continue;
      const ratio = i / count;
      const cx = centerVp.x + ratio * canvasW * 1.15;
      arcs.push({
        x1: topVp.x,
        y1: topVp.y,
        cx,
        cy: centerVp.y,
        x2: bottomVp.x,
        y2: bottomVp.y,
        kind: 'curvilinear_v',
        color: perspective.color,
      });
    }

    // Optional center perspective rays
    if (perspective.showRays) {
      const rayCount = Math.max(6, Math.min(24, perspective.rayDensity));
      for (let i = 0; i < rayCount; i++) {
        const ang = (i / rayCount) * Math.PI * 2;
        segments.push({
          x1: centerVp.x,
          y1: centerVp.y,
          x2: centerVp.x + Math.cos(ang) * extendDist,
          y2: centerVp.y + Math.sin(ang) * extendDist,
          kind: 'ray',
          color: centerVp.color || perspective.color,
        });
      }
    }
    return { segments, arcs };
  }

  // 3. Linear 1-Point, 2-Point, 3-Point Vanishing Point Rays
  const visibleVps = perspective.vanishingPoints.filter((vp) => vp.visible);
  if (perspective.showRays) {
    const rayCount = Math.max(4, Math.min(36, perspective.rayDensity));
    for (const vp of visibleVps) {
      for (let i = 0; i < rayCount; i++) {
        const ang = (i / rayCount) * Math.PI * 2;
        segments.push({
          x1: vp.x,
          y1: vp.y,
          x2: vp.x + Math.cos(ang) * extendDist,
          y2: vp.y + Math.sin(ang) * extendDist,
          kind: 'ray',
          color: vp.color || perspective.color,
        });
      }
    }
  }

  // Optional vertical/horizontal construction grid for 1-point & 2-point
  if (perspective.showConstructionGrid && (perspective.type === '1point' || perspective.type === '2point')) {
    const stepX = Math.max(8, Math.round(canvasW / 8));
    for (let x = stepX; x < canvasW; x += stepX) {
      segments.push({
        x1: x,
        y1: -canvasH * 0.15,
        x2: x,
        y2: canvasH * 1.15,
        kind: 'grid',
        color: perspective.color,
      });
    }
    if (perspective.type === '1point') {
      const stepY = Math.max(8, Math.round(canvasH / 8));
      for (let y = stepY; y < canvasH; y += stepY) {
        segments.push({
          x1: -canvasW * 0.15,
          y1: y,
          x2: canvasW * 1.15,
          y2: y,
          kind: 'grid',
          color: perspective.color,
        });
      }
    }
  }

  return { segments, arcs };
}

// =========================================================
// UNIT FORMATTING & RULER MATH
// =========================================================
export function pxToUnitValue(
  px: number,
  unit: RulerUnit,
  axisLength: number,
  customScale: number = 16
): number {
  if (unit === 'percent') {
    const safeLen = Math.max(1, axisLength);
    return Number(((px / safeLen) * 100).toFixed(1));
  }
  if (unit === 'custom') {
    const safeScale = Math.max(1, customScale);
    return Number((px / safeScale).toFixed(2));
  }
  return Number(px.toFixed(1));
}

export function parseUnitValueToPx(
  value: number,
  unit: RulerUnit,
  axisLength: number,
  customScale: number = 16
): number {
  if (!Number.isFinite(value)) return 0;
  if (unit === 'percent') {
    return Math.round(((value / 100) * Math.max(1, axisLength)) * 2) / 2;
  }
  if (unit === 'custom') {
    return Math.round(value * Math.max(1, customScale) * 2) / 2;
  }
  return Math.round(value * 2) / 2;
}

export function formatRulerCoordinate(
  px: number,
  unit: RulerUnit,
  axisLength: number,
  customScale: number = 16,
  customLabel: string = 'tile',
  includeUnit: boolean = true
): string {
  if (unit === 'percent') {
    const val = Math.round((px / Math.max(1, axisLength)) * 1000) / 10;
    const str = Number.isInteger(val) ? String(val) : val.toFixed(1);
    return includeUnit ? `${str}%` : str;
  }
  if (unit === 'custom') {
    const val = Math.round((px / Math.max(1, customScale)) * 100) / 100;
    const str = Number.isInteger(val) ? String(val) : String(val);
    return includeUnit ? `${str} ${customLabel || 'u'}` : str;
  }
  const rounded = Math.round(px * 10) / 10;
  const str = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return includeUnit ? `${str} px` : str;
}

export function computeRulerStepPx(
  zoom: number,
  unit: RulerUnit,
  axisLength: number,
  customScale: number = 16
): { majorStepPx: number; minorDivisions: number } {
  const safeZoom = Math.max(0.5, zoom);
  const minMajorScreenPx = 44;

  if (unit === 'percent') {
    const percentCandidates = [1, 2, 5, 10, 20, 25, 50, 100];
    for (const pct of percentCandidates) {
      const px = (pct / 100) * Math.max(1, axisLength);
      if (px * safeZoom >= minMajorScreenPx) {
        return { majorStepPx: px, minorDivisions: pct >= 10 ? 5 : 2 };
      }
    }
    return { majorStepPx: Math.max(1, axisLength), minorDivisions: 4 };
  }

  if (unit === 'custom') {
    const base = Math.max(1, customScale);
    const mults = [0.25, 0.5, 1, 2, 4, 8, 16, 32];
    for (const m of mults) {
      const px = base * m;
      if (px * safeZoom >= minMajorScreenPx) {
        return { majorStepPx: px, minorDivisions: m >= 1 ? 4 : 2 };
      }
    }
    return { majorStepPx: base * 32, minorDivisions: 4 };
  }

  const pxCandidates = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512];
  for (const step of pxCandidates) {
    if (step * safeZoom >= minMajorScreenPx) {
      return {
        majorStepPx: step,
        minorDivisions: step >= 8 ? 4 : step >= 2 ? 2 : 1,
      };
    }
  }
  return { majorStepPx: 512, minorDivisions: 4 };
}

// =========================================================
// SNAPPING ENGINE (GUIDES + PERSPECTIVE + RULERS + GRID)
// =========================================================
export interface SnapPointResult {
  x: number;
  y: number;
  snappedX: boolean;
  snappedY: boolean;
  snappedPerspective?: boolean;
  guideX: CanvasGuide | null;
  guideY: CanvasGuide | null;
  kindX: 'guide' | 'ruler' | 'grid' | 'perspective' | null;
  kindY: 'guide' | 'ruler' | 'grid' | 'perspective' | null;
}

function projectPointToLine(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): { x: number; y: number; dist: number } {
  const vx = bx - ax;
  const vy = by - ay;
  const lenSq = vx * vx + vy * vy;
  if (lenSq < 1e-6) {
    return { x: ax, y: ay, dist: Math.hypot(px - ax, py - ay) };
  }
  const t = ((px - ax) * vx + (py - ay) * vy) / lenSq;
  const projX = ax + t * vx;
  const projY = ay + t * vy;
  return { x: projX, y: projY, dist: Math.hypot(px - projX, py - projY) };
}

/**
 * Snaps a coordinate (or ray from anchorPoint -> rawPoint) to active Perspective vanishing points,
 * horizon line, or axonometric angles (isometric / dimetric / trimetric).
 */
export function snapPointToPerspective(
  rawX: number,
  rawY: number,
  canvasW: number,
  canvasH: number,
  config: GuidesConfig,
  zoom: number = 8,
  anchorPoint?: { x: number; y: number } | null
): { x: number; y: number; snapped: boolean } {
  const persp = config.perspective;
  if (!config.snapToPerspective || !persp?.enabled) {
    return { x: rawX, y: rawY, snapped: false };
  }

  const threshold = Math.max(
    1.2,
    Math.min((config.snapThresholdPx || 2.5) * 1.75, 16 / Math.max(1, zoom))
  );

  // Case 1: Directional ray snap from an anchor point (Lines, Vectors, Shapes, Selections)
  if (anchorPoint) {
    const ax = anchorPoint.x;
    const ay = anchorPoint.y;
    const segLen = Math.hypot(rawX - ax, rawY - ay);
    if (segLen >= 1.5) {
      const candidateDirs: { vx: number; vy: number }[] = [
        { vx: 1, vy: 0 }, // Horizontal (parallel to horizon)
        { vx: 0, vy: 1 }, // Vertical
      ];

      if (persp.type === 'isometric' || persp.type === 'dimetric' || persp.type === 'trimetric') {
        const radL = ((persp.isoAngleLeft || 30) * Math.PI) / 180;
        const radR = ((persp.isoAngleRight || 30) * Math.PI) / 180;
        candidateDirs.push(
          { vx: Math.cos(radR), vy: -Math.sin(radR) },
          { vx: Math.cos(radL), vy: Math.sin(radL) }
        );
      } else {
        for (const vp of persp.vanishingPoints) {
          if (!vp.visible) continue;
          const dx = vp.x - ax;
          const dy = vp.y - ay;
          const d = Math.hypot(dx, dy);
          if (d > 1) {
            candidateDirs.push({ vx: dx / d, vy: dy / d });
          }
        }
      }

      let bestProj: { x: number; y: number; dist: number } | null = null;
      const angularSnapAllowance = Math.max(threshold, segLen * 0.16);
      for (const dir of candidateDirs) {
        const proj = projectPointToLine(rawX, rawY, ax, ay, ax + dir.vx * 100, ay + dir.vy * 100);
        if (proj.dist <= angularSnapAllowance && (!bestProj || proj.dist < bestProj.dist)) {
          bestProj = proj;
        }
      }

      if (bestProj) {
        return { x: bestProj.x, y: bestProj.y, snapped: true };
      }
    }
  }

  // Case 2: Free point snap to Horizon line, Perspective Rays, or Floor Grid lines
  let bestX = rawX;
  let bestY = rawY;
  let bestDist = threshold;
  let snapped = false;

  if (persp.showHorizon && Math.abs(rawY - persp.horizonY) <= bestDist) {
    bestDist = Math.abs(rawY - persp.horizonY);
    bestY = persp.horizonY;
    snapped = true;
  }

  const geom = computePerspectiveGeometry(persp, canvasW, canvasH);
  const floorSegs = computeAutoFloorGridSegments(persp, canvasW, canvasH);
  const allSegs = [...geom.segments, ...floorSegs];

  for (const s of allSegs) {
    const proj = projectPointToLine(rawX, rawY, s.x1, s.y1, s.x2, s.y2);
    if (proj.dist < bestDist) {
      bestDist = proj.dist;
      bestX = proj.x;
      bestY = proj.y;
      snapped = true;
    }
  }

  return { x: bestX, y: bestY, snapped };
}

export function isGuideVisibleInGroups(guide: CanvasGuide, config: GuidesConfig): boolean {
  if (!guide.groupId || !config.groups || config.groups.length === 0) return true;
  const grp = config.groups.find((g) => g.id === guide.groupId);
  return grp ? grp.visible : true;
}

export function isGuideLockedInGroups(guide: CanvasGuide, config: GuidesConfig): boolean {
  if (guide.locked || config.lockGuides) return true;
  if (!guide.groupId || !config.groups || config.groups.length === 0) return false;
  const grp = config.groups.find((g) => g.id === guide.groupId);
  return Boolean(grp?.locked);
}

export function snapCoordinateToGuides(
  rawX: number,
  rawY: number,
  canvasW: number,
  canvasH: number,
  guides: CanvasGuide[],
  config: GuidesConfig,
  zoom: number = 8,
  anchorPoint?: { x: number; y: number } | null
): SnapPointResult {
  let outX = rawX;
  let outY = rawY;
  let snappedX = false;
  let snappedY = false;
  let snappedPerspective = false;
  let guideX: CanvasGuide | null = null;
  let guideY: CanvasGuide | null = null;
  let kindX: 'guide' | 'ruler' | 'grid' | 'perspective' | null = null;
  let kindY: 'guide' | 'ruler' | 'grid' | 'perspective' | null = null;

  const threshold = Math.max(
    0.75,
    Math.min(config.snapThresholdPx || 2.5, 10 / Math.max(1, zoom))
  );

  // 1. Perspective snapping (highest priority when actively enabled with perspective guides)
  if (config.snapToPerspective && config.perspective?.enabled) {
    const perspSnap = snapPointToPerspective(
      rawX,
      rawY,
      canvasW,
      canvasH,
      config,
      zoom,
      anchorPoint
    );
    if (perspSnap.snapped) {
      outX = perspSnap.x;
      outY = perspSnap.y;
      snappedX = true;
      snappedY = true;
      snappedPerspective = true;
      kindX = 'perspective';
      kindY = 'perspective';
    }
  }

  // 2. Active Canvas Guides (respecting guide group visibility)
  if (config.snapToGuides && config.showGuides && guides.length > 0) {
    let bestDistX = threshold;
    let bestDistY = threshold;
    for (const g of guides) {
      if (!isGuideVisibleInGroups(g, config)) continue;
      if (g.orientation === 'vertical') {
        const d = Math.abs(rawX - g.position);
        if (d <= bestDistX) {
          bestDistX = d;
          outX = g.position;
          snappedX = true;
          guideX = g;
          kindX = 'guide';
        }
      } else {
        const d = Math.abs(rawY - g.position);
        if (d <= bestDistY) {
          bestDistY = d;
          outY = g.position;
          snappedY = true;
          guideY = g;
          kindY = 'guide';
        }
      }
    }
  }

  // 3. Ruler major ticks
  if (config.snapToRulers && config.showRulers) {
    if (!snappedX) {
      const { majorStepPx } = computeRulerStepPx(zoom, config.unit, canvasW, config.customScale);
      const nearest = Math.round(rawX / majorStepPx) * majorStepPx;
      if (Math.abs(rawX - nearest) <= threshold) {
        outX = nearest;
        snappedX = true;
        kindX = 'ruler';
      }
    }
    if (!snappedY) {
      const { majorStepPx } = computeRulerStepPx(zoom, config.unit, canvasH, config.customScale);
      const nearest = Math.round(rawY / majorStepPx) * majorStepPx;
      if (Math.abs(rawY - nearest) <= threshold) {
        outY = nearest;
        snappedY = true;
        kindY = 'ruler';
      }
    }
  }

  // 4. Grid snapping
  if (config.snapToGrid) {
    const step = Math.max(1, config.gridStep || 8);
    if (!snappedX) {
      const nearest = Math.round(rawX / step) * step;
      if (Math.abs(rawX - nearest) <= Math.max(threshold, step * 0.35)) {
        outX = nearest;
        snappedX = true;
        kindX = 'grid';
      }
    }
    if (!snappedY) {
      const nearest = Math.round(rawY / step) * step;
      if (Math.abs(rawY - nearest) <= Math.max(threshold, step * 0.35)) {
        outY = nearest;
        snappedY = true;
        kindY = 'grid';
      }
    }
  }

  return {
    x: Math.round(outX),
    y: Math.round(outY),
    snappedX,
    snappedY,
    snappedPerspective,
    guideX,
    guideY,
    kindX,
    kindY,
  };
}

export interface SnapBoundsResult {
  x: number;
  y: number;
  guideX: CanvasGuide | null;
  guideY: CanvasGuide | null;
}

export function snapBoundsToGuides(
  x: number,
  y: number,
  w: number,
  h: number,
  canvasW: number,
  canvasH: number,
  guides: CanvasGuide[],
  config: GuidesConfig,
  zoom: number = 8
): SnapBoundsResult {
  if (
    !config.snapToGuides &&
    !config.snapToRulers &&
    !config.snapToGrid &&
    !(config.snapToPerspective && config.perspective?.enabled)
  ) {
    return { x, y, guideX: null, guideY: null };
  }

  const xAnchors = [
    { offset: 0, val: x },
    { offset: w / 2, val: x + w / 2 },
    { offset: w, val: x + w },
  ];
  const yAnchors = [
    { offset: 0, val: y },
    { offset: h / 2, val: y + h / 2 },
    { offset: h, val: y + h },
  ];

  let bestX = x;
  let bestDeltaX = Infinity;
  let guideX: CanvasGuide | null = null;

  for (const a of xAnchors) {
    const res = snapCoordinateToGuides(a.val, y + h, canvasW, canvasH, guides, config, zoom);
    if (res.snappedX) {
      const delta = Math.abs(res.x - a.val);
      if (delta < bestDeltaX) {
        bestDeltaX = delta;
        bestX = Math.round(res.x - a.offset);
        guideX = res.guideX;
      }
    }
  }

  let bestY = y;
  let bestDeltaY = Infinity;
  let guideY: CanvasGuide | null = null;

  for (const a of yAnchors) {
    const res = snapCoordinateToGuides(x + w / 2, a.val, canvasW, canvasH, guides, config, zoom);
    if (res.snappedY) {
      const delta = Math.abs(res.y - a.val);
      if (delta < bestDeltaY) {
        bestDeltaY = delta;
        bestY = Math.round(res.y - a.offset);
        guideY = res.guideY;
      }
    }
  }

  return { x: bestX, y: bestY, guideX, guideY };
}

// =========================================================
// LINEAR GUIDE PRESETS (GROUP-ASSIGNED)
// =========================================================
export function createHorizonGuidePreset(width: number, height: number): CanvasGuide[] {
  const ts = Date.now();
  return [
    {
      id: `guide-horizon-sky-${ts}`,
      orientation: 'horizontal',
      position: Math.round(height * 0.34),
      label: 'Cielo / Fondo lejano',
      color: '#38bdf8',
      groupId: 'grp-stage',
      preset: 'horizon',
    },
    {
      id: `guide-horizon-main-${ts + 1}`,
      orientation: 'horizontal',
      position: Math.round(height * 0.62),
      label: 'Línea de Horizonte',
      color: '#f59e0b',
      groupId: 'grp-stage',
      preset: 'horizon',
    },
    {
      id: `guide-horizon-ground-${ts + 2}`,
      orientation: 'horizontal',
      position: Math.round(height * 0.84),
      label: 'Plano de Suelo',
      color: '#10b981',
      groupId: 'grp-stage',
      preset: 'horizon',
    },
  ];
}

export function createHudGuidePreset(width: number, height: number): CanvasGuide[] {
  const ts = Date.now();
  const safeX = Math.max(2, Math.round(width * 0.06));
  const safeTop = Math.max(2, Math.round(height * 0.08));
  const healthBottom = Math.max(safeTop + 2, Math.round(height * 0.2));
  const superTop = Math.round(height * 0.86);
  return [
    {
      id: `guide-hud-left-${ts}`,
      orientation: 'vertical',
      position: safeX,
      label: 'Margen HUD Izq.',
      color: '#f43f5e',
      groupId: 'grp-hud',
      preset: 'hud',
    },
    {
      id: `guide-hud-center-${ts + 1}`,
      orientation: 'vertical',
      position: Math.round(width * 0.5),
      label: 'Centro Timer / KO',
      color: '#fbbf24',
      groupId: 'grp-hud',
      preset: 'hud',
    },
    {
      id: `guide-hud-right-${ts + 2}`,
      orientation: 'vertical',
      position: width - safeX,
      label: 'Margen HUD Der.',
      color: '#f43f5e',
      groupId: 'grp-hud',
      preset: 'hud',
    },
    {
      id: `guide-hud-top-${ts + 3}`,
      orientation: 'horizontal',
      position: safeTop,
      label: 'HUD Superior',
      color: '#38bdf8',
      groupId: 'grp-hud',
      preset: 'hud',
    },
    {
      id: `guide-hud-hp-${ts + 4}`,
      orientation: 'horizontal',
      position: healthBottom,
      label: 'Límite Barras HP',
      color: '#38bdf8',
      groupId: 'grp-hud',
      preset: 'hud',
    },
    {
      id: `guide-hud-super-${ts + 5}`,
      orientation: 'horizontal',
      position: superTop,
      label: 'Zona Barra Súper',
      color: '#a855f7',
      groupId: 'grp-hud',
      preset: 'hud',
    },
  ];
}

export function createCharacterGuidePreset(width: number, height: number): CanvasGuide[] {
  const ts = Date.now();
  return [
    {
      id: `guide-char-axis-${ts}`,
      orientation: 'vertical',
      position: Math.round(width * 0.5),
      label: 'Eje Central Personaje',
      color: '#38bdf8',
      groupId: 'grp-characters',
      preset: 'character',
    },
    {
      id: `guide-char-head-${ts + 1}`,
      orientation: 'horizontal',
      position: Math.round(height * 0.16),
      label: 'Cabeza / Corona',
      color: '#a855f7',
      groupId: 'grp-characters',
      preset: 'character',
    },
    {
      id: `guide-char-shoulders-${ts + 2}`,
      orientation: 'horizontal',
      position: Math.round(height * 0.34),
      label: 'Hombros / Guardia',
      color: '#38bdf8',
      groupId: 'grp-characters',
      preset: 'character',
    },
    {
      id: `guide-char-waist-${ts + 3}`,
      orientation: 'horizontal',
      position: Math.round(height * 0.54),
      label: 'Cadera / Centro Masa',
      color: '#fbbf24',
      groupId: 'grp-characters',
      preset: 'character',
    },
    {
      id: `guide-char-feet-${ts + 4}`,
      orientation: 'horizontal',
      position: Math.round(height * 0.88),
      label: 'Línea de Pies / Suelo',
      color: '#10b981',
      groupId: 'grp-characters',
      preset: 'character',
    },
  ];
}

export function createStageGuidePreset(width: number, height: number): CanvasGuide[] {
  const ts = Date.now();
  return [
    {
      id: `guide-stage-t1x-${ts}`,
      orientation: 'vertical',
      position: Math.round(width / 3),
      label: 'Tercio Izq. / Spawn P1',
      color: '#38bdf8',
      groupId: 'grp-stage',
      preset: 'stage',
    },
    {
      id: `guide-stage-t2x-${ts + 1}`,
      orientation: 'vertical',
      position: Math.round((width * 2) / 3),
      label: 'Tercio Der. / Spawn P2',
      color: '#38bdf8',
      groupId: 'grp-stage',
      preset: 'stage',
    },
    {
      id: `guide-stage-bound-l-${ts + 2}`,
      orientation: 'vertical',
      position: Math.max(2, Math.round(width * 0.08)),
      label: 'Esquina Escenario Izq.',
      color: '#f97316',
      groupId: 'grp-camera',
      preset: 'stage',
    },
    {
      id: `guide-stage-bound-r-${ts + 3}`,
      orientation: 'vertical',
      position: Math.min(width - 2, Math.round(width * 0.92)),
      label: 'Esquina Escenario Der.',
      color: '#f97316',
      groupId: 'grp-camera',
      preset: 'stage',
    },
    {
      id: `guide-stage-horizon-${ts + 4}`,
      orientation: 'horizontal',
      position: Math.round(height * 0.58),
      label: 'Horizonte Escenario',
      color: '#f59e0b',
      groupId: 'grp-stage',
      preset: 'stage',
    },
    {
      id: `guide-stage-floor-${ts + 5}`,
      orientation: 'horizontal',
      position: Math.round(height * 0.84),
      label: 'Piso de Combate',
      color: '#10b981',
      groupId: 'grp-stage',
      preset: 'stage',
    },
  ];
}

export function createGuidePreset(kind: GuidePresetKind, width: number, height: number): CanvasGuide[] {
  switch (kind) {
    case 'horizon':
      return createHorizonGuidePreset(width, height);
    case 'hud':
      return createHudGuidePreset(width, height);
    case 'character':
      return createCharacterGuidePreset(width, height);
    case 'stage':
      return createStageGuidePreset(width, height);
  }
}

/**
 * Generates a crisp nearest-neighbor 48x48 PNG data URL thumbnail from frame 0
 * for displaying in "Archivo -> Abrir Recientes".
 */
export function renderProjectThumbnailDataUrl(
  frames: Frame[],
  width: number,
  height: number,
  layerGroups: LayerGroup[] = []
): string | undefined {
  try {
    const f0 = frames[0];
    if (!f0) return undefined;
    if (isFrameTiled(f0)) {
      return renderTiledFrameThumbnailDataUrl(f0, width, height, layerGroups, 64);
    }
    const grid = compositeFrame(f0, width, height, 0, true, layerGroups);
    const thumbSize = 48;
    const canvas = document.createElement('canvas');
    canvas.width = thumbSize;
    canvas.height = thumbSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const tile = 6;
    for (let ty = 0; ty < thumbSize; ty += tile) {
      for (let tx = 0; tx < thumbSize; tx += tile) {
        ctx.fillStyle = ((tx / tile + ty / tile) & 1) === 0 ? '#141824' : '#1b2131';
        ctx.fillRect(tx, ty, tile, tile);
      }
    }

    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = Math.max(1, width);
    srcCanvas.height = Math.max(1, height);
    const sctx = srcCanvas.getContext('2d');
    if (!sctx) return undefined;
    for (let y = 0; y < height; y++) {
      const row = grid[y];
      if (!row) continue;
      for (let x = 0; x < width; x++) {
        const col = row[x];
        if (!col) continue;
        sctx.fillStyle = col;
        sctx.fillRect(x, y, 1, 1);
      }
    }

    const scale = Math.min((thumbSize - 4) / Math.max(1, width), (thumbSize - 4) / Math.max(1, height));
    const dw = Math.max(1, Math.round(width * scale));
    const dh = Math.max(1, Math.round(height * scale));
    const dx = Math.floor((thumbSize - dw) / 2);
    const dy = Math.floor((thumbSize - dh) / 2);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(srcCanvas, dx, dy, dw, dh);
    return canvas.toDataURL('image/png');
  } catch {
    return undefined;
  }
}
