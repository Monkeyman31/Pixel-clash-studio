import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  BookmarkPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Compass,
  Eye,
  Film,
  Flame,
  FlaskConical,
  FolderHeart,
  GitCompare,
  ImagePlus,
  Layout,
  Monitor,
  Palette,
  Pause,
  Play,
  Plus,
  RefreshCw,
  ScanSearch,
  ShieldAlert,
  Sliders,
  Sparkles,
  Stethoscope,
  Upload,
  User,
  Wand2,
} from 'lucide-react';
import {
  AiAnimationTaskMode,
  AiCharacterPreserveFlags,
  AiCharacterTaskMode,
  AiCoherenceLevel,
  AiContextualMode,
  AiCustomStyleConfig,
  AiExplanationReport,
  AiExternalProfileId,
  AiGenerationStatsSnapshot,
  AiHudCategory,
  AiPhaseOneAnalysis,
  AiPoseFidelityLevel,
  AiPreserveConstraints,
  AiReferenceMode,
  AiReferenceProjectId,
  AiSelfEvaluationReport,
  AiStageCategory,
  AiWorkspaceSection,
  AssetCategory,
  AssetLibraryItem,
  CombatFxConfig,
  DummyOpponent,
  DummiePose,
  EditableFxRecipe,
  Frame,
  GroundConfig,
  GuidesConfig,
  Layer,
  LayerGroup,
  PerformanceMode,
  ProjectAiTrainingProfile,
  ProjectState,
  ReferenceItem,
  StageType,
} from '../types';
import { FIGHTING_GAME_PALETTES } from '../constants/palettes';
import { compositeFrame, createEmptyGrid } from '../utils/pixelMath';
import {
  AI_EXTERNAL_PROFILES,
  analyzeProjectContext,
  analyzeReferenceImageDataUrl,
  applyContextualStyleToGrid,
  buildExplainableAiReport,
  buildPhaseOneAnalysis,
  buildReferenceProjectProfile,
  createDefaultAiGenerationStats,
  generateAiDiagnosticsAndRecommendations,
  generateFallbackAnimationFrames,
  generateFallbackCharacterGrid,
  generateFallbackHudGrid,
  generateFallbackStageGrid,
  generateMultiFrameInBetweensLocal,
  getAiStyleProfile,
  gridToPixels,
  loadAiGenerationStats,
  pixelsToGrid,
  recordAiGenerationEvent,
  runLocalAiSelfEvaluation,
  saveAiGenerationStats,
  trainAiOnCurrentProject,
  validateAndCleanAiPixelGrid,
} from '../utils/projectContextAi';
import { AiFxPreview, AiStyleMode, FX_PRESETS, FxPreset, remapFxPixelsToStyle } from './AiFxPreview';
import { DummiePosePanel } from './DummiePosePanel';
import { ExplainableAiCard } from './ExplainableAiCard';
import { ImageToPixelPanel } from './ImageToPixelPanel';
import { getCachedPixelGridCanvas } from '../utils/renderCache';
import { StudioSlider } from './StudioSlider';

const PixelGridMiniPreview: React.FC<{
  grid: (string | null)[][];
  width: number;
  height: number;
  className?: string;
}> = React.memo(({ grid, width, height, className = '' }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    if (c.width !== width) c.width = width;
    if (c.height !== height) c.height = height;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);
    const cached = getCachedPixelGridCanvas(grid, width, height);
    ctx.drawImage(cached, 0, 0);
  }, [grid, width, height]);
  return <canvas ref={ref} className={`pixel-canvas canvas-checkerboard ${className}`} />;
});

export interface AiStudioHubProps {
  canvasWidth: number;
  canvasHeight: number;
  currentFrame: Frame;
  currentFrameIndex: number;
  frames: Frame[];
  layers: Layer[];
  currentLayerIndex: number;
  layerGroups: LayerGroup[];
  primaryColor: string;
  primaryAlpha: number;
  secondaryColor: string;
  activePaletteColors?: string[];
  project?: ProjectState;
  stageType: StageType;
  stageOpacity: number;
  groundConfig: GroundConfig;
  dummyOpponent: DummyOpponent;
  combatFx: CombatFxConfig;
  performanceMode?: PerformanceMode;
  references?: ReferenceItem[];
  libraryItems?: AssetLibraryItem[];
  // Dummie & Poses
  dummiePose?: DummiePose;
  onChangeDummiePose?: (pose: DummiePose) => void;
  savedDummiePoses?: DummiePose[];
  onSaveDummiePose?: (pose: DummiePose) => void;
  onDeleteSavedDummiePose?: (id: string) => void;
  onOpenApplyPoseModal?: () => void;
  onGenerateDummieFromReference?: (ref: ReferenceItem) => void;
  guidesConfig?: GuidesConfig;
  onChangeGuidesConfig?: (next: GuidesConfig) => void;
  // FX Studio integration
  onOpenFxStudio?: (initialTab?: 'generator' | 'lab', recipeToEdit?: EditableFxRecipe | null) => void;
  lastGeneratedFxRecipe?: EditableFxRecipe | null;
  // Canvas & Library Mutation Callbacks
  onInjectAiVfx: (
    pixelsOrFrames: { x: number; y: number; color: string }[] | { x: number; y: number; color: string }[][],
    name: string,
    hitbox?: any,
    targetMode?: 'modify' | 'new_layer',
    wrapInGroup?: boolean,
    groupName?: string,
    groupColor?: string
  ) => void;
  onApplyFrameRemix: (
    pixels: { x: number; y: number; color: string }[],
    hitboxes?: any[],
    targetMode?: 'modify' | 'new_layer',
    wrapInGroup?: boolean
  ) => void;
  onGenerateInBetween: (frameAIndex: number, frameBIndex: number) => Promise<void>;
  onInsertInBetweenSequence?: (
    insertAfterIndex: number,
    grids: (string | null)[][][],
    labelPrefix?: string
  ) => void;
  onInsertAnimationFrames?: (
    grids: (string | null)[][][],
    labelPrefix: string,
    insertMode: 'append_frames' | 'overlay_layers'
  ) => void;
  onInsertGeneratedGrid?: (
    grid: (string | null)[][],
    mode: 'current_layer' | 'new_layer',
    name: string,
    groupName?: string,
    groupColor?: string,
    insertAtBottom?: boolean
  ) => void;
  onSaveGridToLibrary?: (
    name: string,
    grid: (string | null)[][],
    width: number,
    height: number,
    category?: AssetCategory,
    origin?: 'ai' | 'user'
  ) => void;
  onInsertLibraryItem?: (item: AssetLibraryItem, mode: 'stamp' | 'new_layer') => void;
  onLiveCanvasPreview?: (
    preview: { layerId?: string; grid: (string | null)[][]; beforeAfterSplit?: number | null } | null
  ) => void;
}

const SECTION_TABS: { id: AiWorkspaceSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'personajes', label: 'Personajes', icon: User },
  { id: 'poses_dummie', label: 'Poses', icon: Activity },
  { id: 'animaciones', label: 'Animaciones', icon: Film },
  { id: 'inbetweens', label: 'Inbetweens', icon: GitCompare },
  { id: 'fx_lab', label: 'FX Lab', icon: FlaskConical },
  { id: 'escenarios', label: 'Escenarios', icon: Monitor },
  { id: 'hud_ui', label: 'HUD/UI', icon: Layout },
  { id: 'adaptacion_estilo', label: 'Estilo', icon: Palette },
  { id: 'proyecto_referencia', label: 'Ref. Global', icon: Compass },
  { id: 'diagnostico_ia', label: 'Diagnóstico', icon: Stethoscope },
  { id: 'biblioteca_ia', label: 'Biblioteca', icon: FolderHeart },
  { id: 'configuracion_ia', label: 'Config', icon: Sliders },
];

const CHARACTER_TASK_OPTIONS: { id: AiCharacterTaskMode; label: string }[] = [
  { id: 'create', label: 'Crear personaje' },
  { id: 'variation', label: 'Rediseñar personaje' },
  { id: 'recolor', label: 'Recolorear personaje' },
  { id: 'outfit', label: 'Cambiar vestuario' },
  { id: 'anatomy', label: 'Adaptar pose' },
  { id: 'clean_sprite', label: 'Limpiar sprite' },
  { id: 'reference_adapt', label: 'Adaptar Ref.' },
];

const ANIMATION_MODE_OPTIONS: { id: AiAnimationTaskMode; label: string }[] = [
  { id: 'generate', label: 'Generar anim.' },
  { id: 'fix', label: 'Arreglar / Pulir' },
  { id: 'cycle', label: 'Ciclo / Loop' },
  { id: 'transition', label: 'Transición' },
];

const ANIMATION_CYCLE_PRESETS: { id: string; label: string; mode: AiAnimationTaskMode; prompt: string; frames: number }[] = [
  { id: 'idle', label: 'Idle', mode: 'cycle', prompt: 'Ciclo Idle respiración de guardia firme en bucle suave', frames: 4 },
  { id: 'walk', label: 'Walk Cycle', mode: 'cycle', prompt: 'Walk Cycle caminata lateral de combate paso a paso en bucle', frames: 6 },
  { id: 'run', label: 'Run Cycle', mode: 'cycle', prompt: 'Run Cycle carrera inclinada hacia adelante con brazos dinámicos', frames: 6 },
  { id: 'jump', label: 'Jump', mode: 'generate', prompt: 'Salto completo: agachado de impulso, ascenso aéreo, ápice y aterrizaje', frames: 5 },
  { id: 'attack', label: 'Attack', mode: 'generate', prompt: 'Patada frontal / golpe rápido con anticipación, impacto activo y recuperación', frames: 4 },
];

const STAGE_CATEGORIES: { id: AiStageCategory; label: string }[] = [
  { id: 'fondos', label: 'Fondos' },
  { id: 'tiles', label: 'Tiles' },
  { id: 'decoracion', label: 'Decoración' },
  { id: 'parallax', label: 'Parallax' },
  { id: 'terreno', label: 'Terreno' },
  { id: 'escenarios', label: 'Escenario' },
];

const HUD_CATEGORIES: { id: AiHudCategory; label: string }[] = [
  { id: 'barras_vida', label: 'Barras de vida' },
  { id: 'retratos', label: 'Retratos' },
  { id: 'temporizadores', label: 'Temporizadores' },
  { id: 'interfaces', label: 'Interfaces' },
  { id: 'menus', label: 'Menús' },
  { id: 'marcadores', label: 'Marcadores' },
];

const GUIDED_CREATE_TARGETS: { id: string; label: string; section: AiWorkspaceSection }[] = [
  { id: 'fighter', label: 'Fighter', section: 'personajes' },
  { id: 'pose', label: 'Pose', section: 'poses_dummie' },
  { id: 'anim', label: 'Animación', section: 'animaciones' },
  { id: 'inbetween', label: 'Inbetween', section: 'inbetweens' },
  { id: 'fx', label: 'FX', section: 'fx_lab' },
  { id: 'stage', label: 'Stage', section: 'escenarios' },
  { id: 'hud', label: 'HUD', section: 'hud_ui' },
];

export const AiStudioHub: React.FC<AiStudioHubProps> = ({
  canvasWidth,
  canvasHeight,
  currentFrame,
  currentFrameIndex,
  frames,
  layers,
  currentLayerIndex,
  layerGroups,
  primaryColor,
  primaryAlpha,
  secondaryColor,
  activePaletteColors,
  project,
  stageType,
  stageOpacity,
  groundConfig,
  dummyOpponent,
  combatFx,
  performanceMode = 'balanced',
  references = [],
  libraryItems = [],
  dummiePose,
  onChangeDummiePose,
  savedDummiePoses = [],
  onSaveDummiePose,
  onDeleteSavedDummiePose,
  onOpenApplyPoseModal,
  onGenerateDummieFromReference,
  guidesConfig,
  onChangeGuidesConfig,
  onOpenFxStudio,
  lastGeneratedFxRecipe,
  onInjectAiVfx,
  onApplyFrameRemix,
  onGenerateInBetween,
  onInsertInBetweenSequence,
  onInsertAnimationFrames,
  onInsertGeneratedGrid,
  onSaveGridToLibrary,
  onInsertLibraryItem,
  onLiveCanvasPreview,
}) => {
  // Active section
  const [section, setSection] = useState<AiWorkspaceSection>('personajes');

  // Shared Project & Style Governance State
  const [aiTargetMode, setAiTargetMode] = useState<'modify' | 'new_layer'>('new_layer');
  const [wrapVfxInGroup, setWrapVfxInGroup] = useState<boolean>(true);
  const [aiContextMode, setAiContextMode] = useState<AiContextualMode>('keep');
  const [aiExternalProfile, setAiExternalProfile] = useState<AiExternalProfileId>('kof');
  const [aiBlendRatio, setAiBlendRatio] = useState<number>(0.5);
  const [aiCoherenceLevel, setAiCoherenceLevel] = useState<AiCoherenceLevel>('high');
  const [aiPoseFidelity, setAiPoseFidelity] = useState<AiPoseFidelityLevel>('high');
  const [referenceMode, setReferenceMode] = useState<AiReferenceMode>('strict');
  const [preserveConstraints, setPreserveConstraints] = useState<AiPreserveConstraints>({
    pose: true,
    colors: true,
    silhouette: true,
    style: true,
    proportions: true,
    animation: false,
  });
  const [globalStyleCoherence, setGlobalStyleCoherence] = useState<boolean>(true);
  const [phase1Analysis, setPhase1Analysis] = useState<AiPhaseOneAnalysis | null>(null);
  const [isAnalyzingPhase1, setIsAnalyzingPhase1] = useState<boolean>(false);
  const [showContextControls, setShowContextControls] = useState<boolean>(true);
  const [customStyle, setCustomStyle] = useState<AiCustomStyleConfig>({
    name: 'Estilo Arcade Propio',
    description: 'Pixel art nítido con contorno 1px tinta oscura y sombras cel de alto contraste',
    outlinePx: 1,
    shading: 'cel',
    palette: ['#0f172a', '#334155', '#ef4444', '#f59e0b', '#38bdf8', '#f8fafc'],
  });
  const [customNewSwatch, setCustomNewSwatch] = useState<string>('#22d3ee');
  const [trainedProjectProfile, setTrainedProjectProfile] = useState<ProjectAiTrainingProfile | null>(null);
  const [lastAiExplanation, setLastAiExplanation] = useState<AiExplanationReport | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Reference Project, AI Diagnostics, Recommendations & Self-Evaluation
  const [activeRefProjectId, setActiveRefProjectId] = useState<AiReferenceProjectId | null>(null);
  const [aiStats, setAiStats] = useState<AiGenerationStatsSnapshot>(() => loadAiGenerationStats());
  const [diagSubTab, setDiagSubTab] = useState<'diagnostico' | 'recomendaciones' | 'autoevaluacion'>('diagnostico');
  const [diagRefreshNonce, setDiagRefreshNonce] = useState<number>(0);
  const [selfEvaluation, setSelfEvaluation] = useState<AiSelfEvaluationReport | null>(null);
  const [isSelfEvaluating, setIsSelfEvaluating] = useState<boolean>(false);

  // Periodic background diagnostic refresh (every 45s while IA hub is active)
  useEffect(() => {
    const t = window.setInterval(() => {
      setDiagRefreshNonce((n) => n + 1);
    }, 45000);
    return () => window.clearInterval(t);
  }, []);

  // Reference image upload
  const [referenceImageBase64, setReferenceImageBase64] = useState<string | null>(null);
  const charFileInputRef = useRef<HTMLInputElement>(null);

  // 1) Personajes state
  const [charTaskMode, setCharTaskMode] = useState<AiCharacterTaskMode>('variation');
  const [charPrompt, setCharPrompt] = useState<string>(
    'Guerrero karateka con aura dorada, cinta ondeante y sombreado firme'
  );
  const [charFidelity, setCharFidelity] = useState<AiPoseFidelityLevel>('high');
  const [charPreserve, setCharPreserve] = useState<AiCharacterPreserveFlags>({
    silhouette: true,
    proportions: true,
    posture: true,
    design: true,
    hair: true,
    outfit: true,
    accessories: true,
  });
  const [charPreviewGrid, setCharPreviewGrid] = useState<(string | null)[][] | null>(null);
  const [charPreviewHitboxes, setCharPreviewHitboxes] = useState<any[] | undefined>(undefined);

  // 2) Poses IA state (Dummie / Imagen / Frame existente)
  const [poseInputSource, setPoseInputSource] = useState<'dummie' | 'image' | 'frame'>('dummie');
  const [poseSourceFrameIdx, setPoseSourceFrameIdx] = useState<number>(currentFrameIndex);
  const [posePrompt, setPosePrompt] = useState<string>('Adaptar personaje completo a pose dinámica manteniendo silueta intacta');
  const [posePreviewGrid, setPosePreviewGrid] = useState<(string | null)[][] | null>(null);

  // 3) Animaciones state
  const [animMode, setAnimMode] = useState<AiAnimationTaskMode>('generate');
  const [animCyclePreset, setAnimCyclePreset] = useState<string>('attack');
  const [animPrompt, setAnimPrompt] = useState<string>('Patada frontal rápida con anticipación, impacto y recuperación');
  const [animFrameCount, setAnimFrameCount] = useState<number>(4);
  const [animDetail, setAnimDetail] = useState<'low' | 'medium' | 'high' | 'ultra'>('high');
  const [animSmoothness, setAnimSmoothness] = useState<number>(80);
  const [animPreviewFrames, setAnimPreviewFrames] = useState<(string | null)[][][] | null>(null);
  const [animPlayIdx, setAnimPlayIdx] = useState<number>(0);
  const [animPlaying, setAnimPlaying] = useState<boolean>(true);
  const [animInsertMode, setAnimInsertMode] = useState<'append_frames' | 'overlay_layers'>('append_frames');

  // 4) Inbetweens state
  const [tweenFrameA, setTweenFrameA] = useState<number>(0);
  const [tweenFrameB, setTweenFrameB] = useState<number>(Math.min(1, Math.max(0, frames.length - 1)));
  const [tweenCount, setTweenCount] = useState<number>(2);
  const [tweenDetail, setTweenDetail] = useState<'low' | 'medium' | 'high' | 'ultra'>('high');
  const [tweenSmoothness, setTweenSmoothness] = useState<number>(85);
  const [tweenPreviewFrames, setTweenPreviewFrames] = useState<(string | null)[][][] | null>(null);
  const [tweenPreviewCursor, setTweenPreviewCursor] = useState<number>(0);

  // 5) FX Lab state
  const [selectedFxPresetId, setSelectedFxPresetId] = useState<string>('hadoken_blue');
  const [vfxPrompt, setVfxPrompt] = useState<string>('Onda de energía azul con núcleo blanco y estelas dinámicas');
  const [vfxPreviewFrames, setVfxPreviewFrames] = useState<{ x: number; y: number; color: string }[][] | null>(null);
  const [vfxPreviewName, setVfxPreviewName] = useState<string>('VFX IA');
  const [vfxPreviewHitbox, setVfxPreviewHitbox] = useState<any>(null);

  // 6) Escenarios state
  const [stageCategory, setStageCategory] = useState<AiStageCategory>('escenarios');
  const [stagePrompt, setStagePrompt] = useState<string>('Templo dojo tradicional con columnas de madera, tatami y cielo al atardecer');
  const [stageMood, setStageMood] = useState<string>('sunset');
  const [stageInsertMode, setStageInsertMode] = useState<'current_layer' | 'new_layer'>('new_layer');
  const [stagePreviewGrid, setStagePreviewGrid] = useState<(string | null)[][] | null>(null);
  const [stagePreviewName, setStagePreviewName] = useState<string>('Escenario IA');
  const [stageOriginalSnap, setStageOriginalSnap] = useState<(string | null)[][] | null>(null);

  // 7) HUD/UI state
  const [hudCategory, setHudCategory] = useState<AiHudCategory>('barras_vida');
  const [hudPrompt, setHudPrompt] = useState<string>('Barras de vida metálicas arcade doradas con indicador K.O. y barra Super');
  const [hudIncludeBars, setHudIncludeBars] = useState<boolean>(true);
  const [hudIncludeTimer, setHudIncludeTimer] = useState<boolean>(true);
  const [hudIncludeSuper, setHudIncludeSuper] = useState<boolean>(true);
  const [hudInsertMode, setHudInsertMode] = useState<'current_layer' | 'new_layer'>('new_layer');
  const [hudPreviewGrid, setHudPreviewGrid] = useState<(string | null)[][] | null>(null);
  const [hudPreviewName, setHudPreviewName] = useState<string>('HUD Lucha IA');
  const [hudOriginalSnap, setHudOriginalSnap] = useState<(string | null)[][] | null>(null);

  // 9) Biblioteca IA quick element state
  const [libSubMode, setLibSubMode] = useState<'assets' | 'img2pixel' | 'stamp'>('assets');
  const [stampPrompt, setStampPrompt] = useState<string>('Espada rúnica arcade con destello dorado');
  const [stampCategory, setStampCategory] = useState<'character' | 'vfx' | 'stage' | 'hud'>('vfx');
  const [stampPreviewGrid, setStampPreviewGrid] = useState<(string | null)[][] | null>(null);
  const [stampPreviewName, setStampPreviewName] = useState<string>('Elemento IA');

  // Animation preview ticker
  useEffect(() => {
    if (!animPreviewFrames || animPreviewFrames.length === 0 || !animPlaying) return;
    const t = window.setInterval(() => {
      setAnimPlayIdx((prev) => (prev + 1) % animPreviewFrames.length);
    }, 150);
    return () => window.clearInterval(t);
  }, [animPreviewFrames, animPlaying]);

  // Keep tween indices valid when frames change
  useEffect(() => {
    setTweenFrameA((a) => Math.min(a, Math.max(0, frames.length - 1)));
    setTweenFrameB((b) => (frames.length > 1 ? Math.min(b === 0 ? 1 : b, frames.length - 1) : 0));
  }, [frames.length]);

  const syntheticProject = useMemo<ProjectState>(
    () =>
      project || {
        name: 'Proyecto Actual',
        width: canvasWidth,
        height: canvasHeight,
        frames,
        layerGroups,
        clips: [],
        actionTags: [],
        activeClipId: '',
        activeActionTagId: null,
        currentFrameIndex,
        currentLayerIndex,
        primaryColor,
        primaryAlpha,
        secondaryColor,
        secondaryAlpha: 1,
        activeTool: 'pencil',
        brushSize: 1,
        activePaletteColors,
        pixelPerfect: false,
        ditherPattern: 'checkered',
        activeHitboxType: 'hitbox',
        symmetryEnabled: false,
        symmetryAxis: Math.floor(canvasWidth / 2),
        showGrid: true,
        showHitboxes: true,
        showPivot: true,
        globalPivot: { x: Math.floor(canvasWidth / 2), y: canvasHeight - 4 },
        stageType,
        stageOpacity,
        groundConfig,
        dummyOpponent,
        combatFx,
        onionSkinEnabled: false,
        onionSkinPrev: 1,
        onionSkinNext: 0,
        onionSkinOpacity: 0.35,
        playbackMode: 'loop',
      },
    [
      project,
      canvasWidth,
      canvasHeight,
      frames,
      layerGroups,
      currentFrameIndex,
      currentLayerIndex,
      primaryColor,
      primaryAlpha,
      secondaryColor,
      activePaletteColors,
      stageType,
      stageOpacity,
      groundConfig,
      dummyOpponent,
      combatFx,
    ]
  );

  const projectAnalysis = useMemo(() => analyzeProjectContext(syntheticProject), [syntheticProject]);
  const activeAiGuideRefs = useMemo(() => references.filter((r) => r.useAsAiGuide && r.dataUrl), [references]);
  const [refVisualAnalysis, setRefVisualAnalysis] = useState<ReturnType<typeof analyzeProjectContext> | null>(null);

  useEffect(() => {
    const src = referenceImageBase64 || activeAiGuideRefs[0]?.dataUrl;
    if (!src) {
      setRefVisualAnalysis(null);
      return;
    }
    let cancelled = false;
    analyzeReferenceImageDataUrl(src).then((info) => {
      if (!cancelled) setRefVisualAnalysis(info);
    });
    return () => {
      cancelled = true;
    };
  }, [referenceImageBase64, activeAiGuideRefs]);

  const effectiveTargetProfileId = useMemo<AiExternalProfileId>(() => {
    if (aiContextMode === 'keep') {
      return trainedProjectProfile?.detectedProfileId || projectAnalysis.detectedProfileId;
    }
    if (aiContextMode === 'auto_detect') {
      return refVisualAnalysis?.detectedProfileId || trainedProjectProfile?.detectedProfileId || projectAnalysis.detectedProfileId;
    }
    return aiExternalProfile;
  }, [aiContextMode, aiExternalProfile, projectAnalysis.detectedProfileId, trainedProjectProfile, refVisualAnalysis]);

  const effectivePalette = useMemo(() => {
    if (aiContextMode === 'keep') {
      return trainedProjectProfile?.masterPalette || projectAnalysis.activePalette;
    }
    if (effectiveTargetProfileId === 'custom' && customStyle.palette.length > 0) {
      return customStyle.palette;
    }
    return getAiStyleProfile(effectiveTargetProfileId).palette;
  }, [aiContextMode, effectiveTargetProfileId, trainedProjectProfile, projectAnalysis.activePalette, customStyle.palette]);

  const effectiveStyleConditioning = useMemo<AiStyleMode>(() => {
    if (aiContextMode === 'keep') return 'inherit';
    return effectiveTargetProfileId;
  }, [aiContextMode, effectiveTargetProfileId]);

  const buildEffectiveContextForAi = useCallback(() => {
    if (!refVisualAnalysis) return projectAnalysis;
    return {
      ...projectAnalysis,
      lineThickness: refVisualAnalysis.lineThickness,
      lightDirection: refVisualAnalysis.lightDirection,
      shadingType: refVisualAnalysis.shadingType,
    };
  }, [projectAnalysis, refVisualAnalysis]);

  const activeRefProject = useMemo(() => {
    if (!activeRefProjectId) return null;
    return buildReferenceProjectProfile(
      activeRefProjectId,
      projectAnalysis,
      trainedProjectProfile,
      project?.name || 'Proyecto propio'
    );
  }, [activeRefProjectId, projectAnalysis, trainedProjectProfile, project?.name]);

  const diagnosticsReport = useMemo(() => {
    void diagRefreshNonce;
    return generateAiDiagnosticsAndRecommendations({
      stats: aiStats,
      projectAnalysis,
      trainedProfile: trainedProjectProfile,
      referenceProject: activeRefProject,
      framesCount: frames.length,
      hasGuideReferences: Boolean(referenceImageBase64 || activeAiGuideRefs.length > 0),
      poseFidelity: aiPoseFidelity,
      referenceMode,
      coherenceLevel: aiCoherenceLevel,
    });
  }, [
    diagRefreshNonce,
    aiStats,
    projectAnalysis,
    trainedProjectProfile,
    activeRefProject,
    frames.length,
    referenceImageBase64,
    activeAiGuideRefs.length,
    aiPoseFidelity,
    referenceMode,
    aiCoherenceLevel,
  ]);

  const activeReferenceLabel = useMemo(() => {
    const parts: string[] = ['Lienzo actual'];
    if (activeRefProject) {
      parts.push(`Ref. Global: ${activeRefProject.name}`);
    }
    if (trainedProjectProfile) {
      parts.push(`Entrenado (${trainedProjectProfile.spriteLayerCount + trainedProjectProfile.stageLayerCount + trainedProjectProfile.hudLayerCount} capas)`);
    }
    if (referenceImageBase64) parts.push('Imagen guía');
    if (activeAiGuideRefs.length > 0) parts.push(`${activeAiGuideRefs.length} Ref(s)`);
    return parts.join(' + ');
  }, [activeRefProject, trainedProjectProfile, referenceImageBase64, activeAiGuideRefs]);

  const collectRefImages = () =>
    [...(referenceImageBase64 ? [referenceImageBase64] : []), ...activeAiGuideRefs.map((r) => r.dataUrl)].slice(0, 3);

  const frameToPngBase64 = (f: Frame) => {
    const comp = compositeFrame(f, canvasWidth, canvasHeight, currentFrameIndex);
    const c = document.createElement('canvas');
    c.width = canvasWidth;
    c.height = canvasHeight;
    const ctx = c.getContext('2d');
    if (!ctx) return '';
    for (let y = 0; y < canvasHeight; y++) {
      for (let x = 0; x < canvasWidth; x++) {
        const hex = comp[y]?.[x];
        if (hex) {
          ctx.fillStyle = hex;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    return c.toDataURL('image/png');
  };

  const handleTrainAi = () => {
    const trained = trainAiOnCurrentProject(syntheticProject, references);
    setTrainedProjectProfile(trained);
    setAiExternalProfile(trained.detectedProfileId);
  };

  const handleUploadCharReference = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') setReferenceImageBase64(ev.target.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const buildLocalPhase1 = useCallback(
    (sourceLabelOverride?: string): AiPhaseOneAnalysis =>
      buildPhaseOneAnalysis({
        projectAnalysis,
        refAnalysis: refVisualAnalysis,
        styleMode: aiContextMode,
        targetProfileId: effectiveTargetProfileId,
        customStyleName: customStyle.name,
        customOutlinePx: customStyle.outlinePx,
        customPalette: customStyle.palette,
        sourceLabel: sourceLabelOverride || activeReferenceLabel,
      }),
    [
      projectAnalysis,
      refVisualAnalysis,
      aiContextMode,
      effectiveTargetProfileId,
      customStyle.name,
      customStyle.outlinePx,
      customStyle.palette,
      activeReferenceLabel,
    ]
  );

  const livePhase1Analysis = useMemo(
    () => phase1Analysis || buildLocalPhase1(),
    [phase1Analysis, buildLocalPhase1]
  );

  // Refresh heuristic Phase 1 when core canvas/style/reference changes (unless AI-analyzed explicitly right before)
  useEffect(() => {
    setPhase1Analysis(buildLocalPhase1());
  }, [buildLocalPhase1]);

  const handleRunPhaseOneAnalysis = async () => {
    setIsAnalyzingPhase1(true);
    setAiError(null);
    const localBase = buildLocalPhase1();
    try {
      const res = await fetch('/api/ai/analyze-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentFrameBase64: frameToPngBase64(currentFrame),
          referenceImagesBase64: collectRefImages(),
          projectContext: projectAnalysis,
          targetSection: section,
          prompt:
            section === 'personajes'
              ? charPrompt
              : section === 'animaciones'
              ? animPrompt
              : section === 'escenarios'
              ? stagePrompt
              : section === 'hud_ui'
              ? hudPrompt
              : section === 'fx_lab'
              ? vfxPrompt
              : posePrompt,
        }),
      });
      const data = await res.json();
      if (data.error || data.fallback) {
        setPhase1Analysis(localBase);
      } else {
        setPhase1Analysis(
          buildPhaseOneAnalysis({
            projectAnalysis,
            refAnalysis: refVisualAnalysis,
            styleMode: aiContextMode,
            targetProfileId: effectiveTargetProfileId,
            customStyleName: customStyle.name,
            customOutlinePx: customStyle.outlinePx,
            customPalette: customStyle.palette,
            sourceLabel: activeReferenceLabel,
            aiOverride: {
              detectedStyle: data.detectedStyle || localBase.detectedStyle,
              paletteCount: typeof data.paletteCount === 'number' ? data.paletteCount : localBase.paletteCount,
              detectedPose: data.detectedPose || localBase.detectedPose,
              perspective: data.perspective || localBase.perspective,
              outlinePx: typeof data.outlinePx === 'number' ? data.outlinePx : localBase.outlinePx,
              shadingType: data.shadingType || localBase.shadingType,
              lightDirection: data.lightDirection || localBase.lightDirection,
              anatomyNotes: data.anatomyNotes || localBase.anatomyNotes,
            },
          })
        );
      }
    } catch {
      setPhase1Analysis(localBase);
    } finally {
      setIsAnalyzingPhase1(false);
    }
  };

  // =========================================================
  // HANDLER 1: PERSONAJES (FASE 2 CON ANÁLISIS Y RESTRICCIONES)
  // =========================================================
  const handleRunCharacterAi = async () => {
    setIsAiLoading(true);
    setAiError(null);
    const chosenId = effectiveTargetProfileId;
    const ctxForAi = buildEffectiveContextForAi();
    const activePhase1 = phase1Analysis || buildLocalPhase1();
    const targetPalette = effectivePalette.length > 0 ? effectivePalette : FIGHTING_GAME_PALETTES[0].colors;
    const customDesc = chosenId === 'custom' ? `${customStyle.name}: ${customStyle.description}` : '';
    const effectiveFidelity: AiPoseFidelityLevel = referenceMode === 'free' ? 'low' : charFidelity;

    try {
      // Fast local path for 'clean_sprite' if server is offline or direct polish requested
      const res = await fetch('/api/ai/character-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskMode: charTaskMode,
          prompt: charPrompt,
          currentFrameBase64: frameToPngBase64(currentFrame),
          referenceImagesBase64: collectRefImages(),
          width: canvasWidth,
          height: canvasHeight,
          palette: targetPalette,
          styleMode: aiContextMode,
          styleProfile: chosenId,
          blendRatio: aiBlendRatio,
          customStyleDescription: customDesc,
          contextAnalysis: ctxForAi,
          trainedProfile: trainedProjectProfile,
          coherenceLevel: aiCoherenceLevel,
          referenceFidelity: effectiveFidelity,
          referenceMode,
          preserveConstraints,
          phase1Analysis: activePhase1,
          referenceProject: activeRefProject,
          preserveFlags: charPreserve,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      let grid = pixelsToGrid(Array.isArray(data.pixels) ? data.pixels : [], canvasWidth, canvasHeight);
      grid = applyContextualStyleToGrid(
        grid,
        aiContextMode,
        chosenId,
        aiBlendRatio,
        targetPalette,
        aiCoherenceLevel,
        projectAnalysis.detectedProfileId,
        customStyle.palette
      );
      const cleaned = validateAndCleanAiPixelGrid(grid, 'sprite', {
        targetPalette,
        coherenceLevel: aiCoherenceLevel,
        repairOutlines: true,
      });
      setCharPreviewGrid(cleaned.grid);
      setCharPreviewHitboxes(data.hitboxes);
      setAiStats((prev) =>
        recordAiGenerationEvent(prev, {
          section: 'personajes',
          usedApi: true,
          stats: cleaned.stats,
          lowPoseFidelity: effectiveFidelity === 'low' || referenceMode === 'free',
        })
      );
      setLastAiExplanation(
        buildExplainableAiReport({
          contextAnalysis: ctxForAi,
          styleMode: aiContextMode,
          profileId: chosenId,
          coherenceLevel: aiCoherenceLevel,
          poseFidelity: effectiveFidelity,
          referenceMode,
          referenceUsed: activeReferenceLabel,
          validationStats: cleaned.stats,
          customStyleName: customStyle.name,
          customPalette: customStyle.palette,
          preserveConstraints,
          phase1Analysis: activePhase1,
        })
      );
    } catch {
      const baseComposite = compositeFrame(currentFrame, canvasWidth, canvasHeight, currentFrameIndex);
      let fallback = generateFallbackCharacterGrid(
        baseComposite,
        canvasWidth,
        canvasHeight,
        charTaskMode,
        targetPalette
      );
      fallback = applyContextualStyleToGrid(
        fallback,
        aiContextMode,
        chosenId,
        aiBlendRatio,
        targetPalette,
        aiCoherenceLevel,
        projectAnalysis.detectedProfileId,
        customStyle.palette
      );
      const cleaned = validateAndCleanAiPixelGrid(fallback, 'sprite', {
        targetPalette,
        coherenceLevel: aiCoherenceLevel,
        repairOutlines: true,
      });
      setCharPreviewGrid(cleaned.grid);
      setCharPreviewHitboxes(undefined);
      setAiStats((prev) =>
        recordAiGenerationEvent(prev, {
          section: 'personajes',
          usedApi: false,
          stats: cleaned.stats,
          lowPoseFidelity: effectiveFidelity === 'low' || referenceMode === 'free',
        })
      );
      setLastAiExplanation(
        buildExplainableAiReport({
          contextAnalysis: ctxForAi,
          styleMode: aiContextMode,
          profileId: chosenId,
          coherenceLevel: aiCoherenceLevel,
          poseFidelity: effectiveFidelity,
          referenceMode,
          referenceUsed: activeReferenceLabel,
          validationStats: cleaned.stats,
          customStyleName: customStyle.name,
          customPalette: customStyle.palette,
          preserveConstraints,
          phase1Analysis: activePhase1,
        })
      );
      setAiError(
        charTaskMode === 'clean_sprite'
          ? 'Limpieza de sprite completada con validación anatómica y de paleta.'
          : 'Vista previa de personaje generada en modo local adaptativo.'
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  // =========================================================
  // HANDLER 2: POSES IA (DUMMIE / IMAGEN / FRAME EXISTENTE)
  // =========================================================
  const handleRunPoseAi = async () => {
    setIsAiLoading(true);
    setAiError(null);
    const chosenId = effectiveTargetProfileId;
    const ctxForAi = buildEffectiveContextForAi();
    const activePhase1 = phase1Analysis || buildLocalPhase1();
    const targetPalette = effectivePalette.length > 0 ? effectivePalette : FIGHTING_GAME_PALETTES[0].colors;
    const sourceFrame =
      poseInputSource === 'frame'
        ? frames[Math.min(Math.max(0, poseSourceFrameIdx), Math.max(0, frames.length - 1))] || currentFrame
        : currentFrame;
    const jointSummary = dummiePose?.joints
      ? Object.entries(dummiePose.joints)
          .map(([k, v]: [string, any]) => `${k}:(${Math.round((v.x ?? 0.5) * 100)}%,${Math.round((v.y ?? 0.5) * 100)}%)`)
          .join(' ')
      : '';
    const effectiveFidelity: AiPoseFidelityLevel = referenceMode === 'free' ? 'low' : aiPoseFidelity;
    const poseRefLabel =
      poseInputSource === 'dummie'
        ? `Rig Dummie 2.5D (${dummiePose?.name || 'Pose'})`
        : poseInputSource === 'image'
        ? activeReferenceLabel
        : `Frame #${poseSourceFrameIdx + 1} (${sourceFrame.name})`;

    try {
      const res = await fetch('/api/ai/pose-retarget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentFrameBase64: frameToPngBase64(sourceFrame),
          poseName: dummiePose?.name || activePhase1.detectedPose || 'Pose de combate',
          rigType: dummiePose?.rigType || 'male',
          jointSummary,
          prompt: posePrompt,
          width: canvasWidth,
          height: canvasHeight,
          palette: targetPalette,
          intensity: effectiveFidelity === 'exact' ? 95 : 75,
          poseFidelity: effectiveFidelity,
          coherenceLevel: aiCoherenceLevel,
          styleMode: aiContextMode,
          styleProfile: chosenId,
          referenceMode,
          preserveConstraints,
          phase1Analysis: activePhase1,
          referenceProject: activeRefProject,
          contextAnalysis: ctxForAi,
          trainedProfile: trainedProjectProfile,
          referenceImagesBase64: poseInputSource === 'image' ? collectRefImages() : [],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      let grid = pixelsToGrid(Array.isArray(data.pixels) ? data.pixels : [], canvasWidth, canvasHeight);
      grid = applyContextualStyleToGrid(
        grid,
        aiContextMode,
        chosenId,
        aiBlendRatio,
        targetPalette,
        aiCoherenceLevel,
        projectAnalysis.detectedProfileId,
        customStyle.palette
      );
      const cleaned = validateAndCleanAiPixelGrid(grid, 'pose', {
        targetPalette,
        coherenceLevel: aiCoherenceLevel,
        repairOutlines: true,
      });
      setPosePreviewGrid(cleaned.grid);
      setAiStats((prev) =>
        recordAiGenerationEvent(prev, {
          section: 'poses',
          usedApi: true,
          stats: cleaned.stats,
          lowPoseFidelity: effectiveFidelity === 'low' || referenceMode === 'free',
        })
      );
      setLastAiExplanation(
        buildExplainableAiReport({
          contextAnalysis: ctxForAi,
          styleMode: aiContextMode,
          profileId: chosenId,
          coherenceLevel: aiCoherenceLevel,
          poseFidelity: effectiveFidelity,
          referenceMode,
          referenceUsed: poseRefLabel,
          validationStats: cleaned.stats,
          customStyleName: customStyle.name,
          customPalette: customStyle.palette,
          preserveConstraints,
          phase1Analysis: activePhase1,
        })
      );
    } catch {
      const baseComposite = compositeFrame(sourceFrame, canvasWidth, canvasHeight, currentFrameIndex);
      let fallback = generateFallbackCharacterGrid(baseComposite, canvasWidth, canvasHeight, 'anatomy', targetPalette);
      fallback = applyContextualStyleToGrid(
        fallback,
        aiContextMode,
        chosenId,
        aiBlendRatio,
        targetPalette,
        aiCoherenceLevel,
        projectAnalysis.detectedProfileId,
        customStyle.palette
      );
      const cleaned = validateAndCleanAiPixelGrid(fallback, 'pose', {
        targetPalette,
        coherenceLevel: aiCoherenceLevel,
        repairOutlines: true,
      });
      setPosePreviewGrid(cleaned.grid);
      setAiStats((prev) =>
        recordAiGenerationEvent(prev, {
          section: 'poses',
          usedApi: false,
          stats: cleaned.stats,
          lowPoseFidelity: effectiveFidelity === 'low' || referenceMode === 'free',
        })
      );
      setLastAiExplanation(
        buildExplainableAiReport({
          contextAnalysis: ctxForAi,
          styleMode: aiContextMode,
          profileId: chosenId,
          coherenceLevel: aiCoherenceLevel,
          poseFidelity: effectiveFidelity,
          referenceMode,
          referenceUsed: poseRefLabel,
          validationStats: cleaned.stats,
          customStyleName: customStyle.name,
          customPalette: customStyle.palette,
          preserveConstraints,
          phase1Analysis: activePhase1,
        })
      );
      setAiError('Pose adaptada localmente preservando silueta íntegra (sin fragmentar).');
    } finally {
      setIsAiLoading(false);
    }
  };

  // =========================================================
  // HANDLER 3: ANIMACIONES
  // =========================================================
  const handleRunAnimationAi = async () => {
    setIsAiLoading(true);
    setAiError(null);
    const chosenId = effectiveTargetProfileId;
    const ctxForAi = buildEffectiveContextForAi();
    const targetPalette = effectivePalette.length > 0 ? effectivePalette : FIGHTING_GAME_PALETTES[0].colors;
    const customDesc = chosenId === 'custom' ? `${customStyle.name}: ${customStyle.description}` : '';

    try {
      const res = await fetch('/api/ai/animation-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskMode: animMode,
          prompt: animPrompt,
          currentFrameBase64: frameToPngBase64(currentFrame),
          referenceImagesBase64: collectRefImages(),
          width: canvasWidth,
          height: canvasHeight,
          frameCount: animFrameCount,
          detailLevel: animDetail,
          smoothness: animSmoothness,
          palette: targetPalette,
          styleMode: aiContextMode,
          styleProfile: chosenId,
          customStyleDescription: customDesc,
          contextAnalysis: ctxForAi,
          trainedProfile: trainedProjectProfile,
          coherenceLevel: aiCoherenceLevel,
          referenceProject: activeRefProject,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const rawList: { x: number; y: number; color: string }[][] = Array.isArray(data.frames) ? data.frames : [];
      if (rawList.length === 0) throw new Error('Sin frames generados');

      let lastStats: ReturnType<typeof validateAndCleanAiPixelGrid>['stats'] | undefined;
      const grids = rawList.map((pts) => {
        let g = pixelsToGrid(pts, canvasWidth, canvasHeight);
        g = applyContextualStyleToGrid(
          g,
          aiContextMode,
          chosenId,
          aiBlendRatio,
          targetPalette,
          aiCoherenceLevel,
          projectAnalysis.detectedProfileId,
          customStyle.palette
        );
        const cleaned = validateAndCleanAiPixelGrid(g, 'sprite', {
          targetPalette,
          coherenceLevel: aiCoherenceLevel,
          repairOutlines: true,
        });
        lastStats = cleaned.stats;
        return cleaned.grid;
      });

      setAnimPreviewFrames(grids);
      setAnimPlayIdx(0);
      setAiStats((prev) => recordAiGenerationEvent(prev, { section: 'animaciones', usedApi: true, stats: lastStats }));
      setLastAiExplanation(
        buildExplainableAiReport({
          contextAnalysis: ctxForAi,
          styleMode: aiContextMode,
          profileId: chosenId,
          coherenceLevel: aiCoherenceLevel,
          referenceUsed: activeReferenceLabel,
          validationStats: lastStats,
          customStyleName: customStyle.name,
          customPalette: customStyle.palette,
        })
      );
    } catch {
      const baseComposite = compositeFrame(currentFrame, canvasWidth, canvasHeight, currentFrameIndex);
      const localFrames = generateFallbackAnimationFrames(
        baseComposite,
        canvasWidth,
        canvasHeight,
        animFrameCount,
        animMode,
        targetPalette,
        aiCoherenceLevel
      );
      setAnimPreviewFrames(localFrames);
      setAnimPlayIdx(0);
      setAiStats((prev) => recordAiGenerationEvent(prev, { section: 'animaciones', usedApi: false }));
      setLastAiExplanation(
        buildExplainableAiReport({
          contextAnalysis: ctxForAi,
          styleMode: aiContextMode,
          profileId: chosenId,
          coherenceLevel: aiCoherenceLevel,
          referenceUsed: activeReferenceLabel,
          customStyleName: customStyle.name,
          customPalette: customStyle.palette,
        })
      );
      setAiError('Secuencia de animación sintetizada localmente con limpieza de silueta.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // =========================================================
  // HANDLER 4: INBETWEENS (WITH PRE-GEN QUALITY CONTROLS)
  // =========================================================
  const handleRunInBetweensAi = async () => {
    if (tweenFrameA === tweenFrameB || frames.length < 2) {
      setAiError('Selecciona dos fotogramas distintos para interpolar.');
      return;
    }
    setIsAiLoading(true);
    setAiError(null);

    const frameA = frames[tweenFrameA];
    const frameB = frames[tweenFrameB];
    const chosenId = effectiveTargetProfileId;
    const ctxForAi = buildEffectiveContextForAi();
    const targetPalette = effectivePalette.length > 0 ? effectivePalette : FIGHTING_GAME_PALETTES[0].colors;
    const customDesc = chosenId === 'custom' ? `${customStyle.name}: ${customStyle.description}` : '';

    try {
      const res = await fetch('/api/ai/tween-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frameABase64: frameToPngBase64(frameA),
          frameBBase64: frameToPngBase64(frameB),
          moveName: `${frameA.name} -> ${frameB.name}`,
          width: canvasWidth,
          height: canvasHeight,
          palette: targetPalette,
          frameCount: tweenCount,
          detailLevel: tweenDetail,
          smoothness: tweenSmoothness,
          styleMode: aiContextMode,
          styleProfile: chosenId,
          customStyleDescription: customDesc,
          contextAnalysis: ctxForAi,
          trainedProfile: trainedProjectProfile,
          coherenceLevel: aiCoherenceLevel,
          referenceProject: activeRefProject,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const rawFrames: { x: number; y: number; color: string }[][] =
        Array.isArray(data.frames) && data.frames.length > 0
          ? data.frames
          : Array.isArray(data.pixels)
          ? [data.pixels]
          : [];
      if (rawFrames.length === 0) throw new Error('Sin frames interpolados');

      let lastStats: ReturnType<typeof validateAndCleanAiPixelGrid>['stats'] | undefined;
      const cleanedList = rawFrames.map((pts) => {
        let g = pixelsToGrid(pts, canvasWidth, canvasHeight);
        g = applyContextualStyleToGrid(
          g,
          aiContextMode,
          chosenId,
          aiBlendRatio,
          targetPalette,
          aiCoherenceLevel,
          projectAnalysis.detectedProfileId,
          customStyle.palette
        );
        const cleaned = validateAndCleanAiPixelGrid(g, 'sprite', {
          targetPalette,
          coherenceLevel: aiCoherenceLevel,
          repairOutlines: true,
        });
        lastStats = cleaned.stats;
        return cleaned.grid;
      });
      setTweenPreviewFrames(cleanedList);
      setTweenPreviewCursor(0);
      setAiStats((prev) => recordAiGenerationEvent(prev, { section: 'inbetweens', usedApi: true, stats: lastStats }));
      setLastAiExplanation(
        buildExplainableAiReport({
          contextAnalysis: ctxForAi,
          styleMode: aiContextMode,
          profileId: chosenId,
          coherenceLevel: aiCoherenceLevel,
          referenceUsed: `Frame #${tweenFrameA + 1} + Frame #${tweenFrameB + 1}`,
          validationStats: lastStats,
          customStyleName: customStyle.name,
          customPalette: customStyle.palette,
        })
      );
    } catch {
      const gridA = compositeFrame(frameA, canvasWidth, canvasHeight, tweenFrameA);
      const gridB = compositeFrame(frameB, canvasWidth, canvasHeight, tweenFrameB);
      const localList = generateMultiFrameInBetweensLocal(
        gridA,
        gridB,
        canvasWidth,
        canvasHeight,
        tweenCount,
        targetPalette,
        aiCoherenceLevel
      );
      setTweenPreviewFrames(localList);
      setTweenPreviewCursor(0);
      setAiStats((prev) => recordAiGenerationEvent(prev, { section: 'inbetweens', usedApi: false }));
      setLastAiExplanation(
        buildExplainableAiReport({
          contextAnalysis: ctxForAi,
          styleMode: aiContextMode,
          profileId: chosenId,
          coherenceLevel: aiCoherenceLevel,
          referenceUsed: `Frame #${tweenFrameA + 1} + Frame #${tweenFrameB + 1}`,
          customStyleName: customStyle.name,
          customPalette: customStyle.palette,
        })
      );
      setAiError('Interpolación generada localmente con limpieza de silueta.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // =========================================================
  // HANDLER 5: FX LAB (SEPARATED)
  // =========================================================
  const handleRunFxLabAi = async () => {
    setIsAiLoading(true);
    setAiError(null);
    const chosenId = effectiveTargetProfileId;
    const targetPalette = effectivePalette.length > 0 ? effectivePalette : FIGHTING_GAME_PALETTES[0].colors;
    const ctxForAi = buildEffectiveContextForAi();

    try {
      const res = await fetch('/api/ai/vfx-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: vfxPrompt,
          width: canvasWidth,
          height: canvasHeight,
          palette: targetPalette,
          stylePreset: effectiveStyleConditioning,
          styleMode: aiContextMode,
          styleProfile: chosenId,
          blendRatio: aiBlendRatio,
          contextAnalysis: ctxForAi,
          trainedProfile: trainedProjectProfile,
          coherenceLevel: aiCoherenceLevel,
          referenceProject: activeRefProject,
          referenceImagesBase64: collectRefImages(),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const rawFrames: { x: number; y: number; color: string }[][] =
        data.frames && Array.isArray(data.frames) && data.frames.length > 0
          ? data.frames
          : data.pixels && Array.isArray(data.pixels)
          ? [data.pixels]
          : [];

      let lastStats: ReturnType<typeof validateAndCleanAiPixelGrid>['stats'] | undefined;
      const cleanedFrames = rawFrames.map((f) => {
        const remapped = remapFxPixelsToStyle(f, effectiveStyleConditioning, targetPalette);
        const grid = pixelsToGrid(remapped, canvasWidth, canvasHeight);
        const cleaned = validateAndCleanAiPixelGrid(grid, 'vfx', {
          targetPalette,
          coherenceLevel: aiCoherenceLevel,
        });
        lastStats = cleaned.stats;
        return gridToPixels(cleaned.grid);
      });
      setVfxPreviewFrames(cleanedFrames);
      setVfxPreviewName(data.name || 'VFX IA');
      setVfxPreviewHitbox(data.hitbox);
      setAiStats((prev) => recordAiGenerationEvent(prev, { section: 'fx', usedApi: true, stats: lastStats }));
      setLastAiExplanation(
        buildExplainableAiReport({
          contextAnalysis: ctxForAi,
          styleMode: aiContextMode,
          profileId: chosenId,
          coherenceLevel: aiCoherenceLevel,
          referenceUsed: activeReferenceLabel,
          validationStats: lastStats,
          customStyleName: customStyle.name,
          customPalette: customStyle.palette,
        })
      );
    } catch {
      const activePreset = FX_PRESETS.find((p) => p.id === selectedFxPresetId) || FX_PRESETS[0];
      let lastStats: ReturnType<typeof validateAndCleanAiPixelGrid>['stats'] | undefined;
      const styled = activePreset.frames.map((pts) => {
        const remapped = remapFxPixelsToStyle(pts, effectiveStyleConditioning, targetPalette);
        const cleaned = validateAndCleanAiPixelGrid(pixelsToGrid(remapped, canvasWidth, canvasHeight), 'vfx', {
          targetPalette,
          coherenceLevel: aiCoherenceLevel,
        });
        lastStats = cleaned.stats;
        return gridToPixels(cleaned.grid);
      });
      setVfxPreviewFrames(styled);
      setVfxPreviewName(`FX ${getAiStyleProfile(chosenId).name}`);
      setVfxPreviewHitbox({ x: 14, y: 12, width: 12, height: 8 });
      setAiStats((prev) => recordAiGenerationEvent(prev, { section: 'fx', usedApi: false, stats: lastStats }));
      setLastAiExplanation(
        buildExplainableAiReport({
          contextAnalysis: ctxForAi,
          styleMode: aiContextMode,
          profileId: chosenId,
          coherenceLevel: aiCoherenceLevel,
          referenceUsed: activeReferenceLabel,
          validationStats: lastStats,
          customStyleName: customStyle.name,
          customPalette: customStyle.palette,
        })
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  // =========================================================
  // HANDLER 6: ESCENARIOS
  // =========================================================
  const handleRunStageAi = async () => {
    setIsAiLoading(true);
    setAiError(null);
    setStageOriginalSnap(compositeFrame(currentFrame, canvasWidth, canvasHeight, currentFrameIndex));
    const chosenId = effectiveTargetProfileId;
    const targetPalette = effectivePalette.length > 0 ? effectivePalette : FIGHTING_GAME_PALETTES[0].colors;
    const ctxForAi = buildEffectiveContextForAi();
    const customDesc = chosenId === 'custom' ? `${customStyle.name}: ${customStyle.description}` : '';

    try {
      const res = await fetch('/api/ai/stage-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: stagePrompt,
          width: canvasWidth,
          height: canvasHeight,
          stylePreset: chosenId,
          mood: stageMood,
          stageCategory,
          palette: targetPalette,
          styleMode: aiContextMode,
          styleProfile: chosenId,
          blendRatio: aiBlendRatio,
          customStyleDescription: customDesc,
          contextAnalysis: ctxForAi,
          trainedProfile: trainedProjectProfile,
          coherenceLevel: aiCoherenceLevel,
          referenceProject: activeRefProject,
          referenceImagesBase64: collectRefImages(),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      let grid = pixelsToGrid(Array.isArray(data.pixels) ? data.pixels : [], canvasWidth, canvasHeight);
      grid = applyContextualStyleToGrid(
        grid,
        aiContextMode,
        chosenId,
        aiBlendRatio,
        targetPalette,
        aiCoherenceLevel,
        projectAnalysis.detectedProfileId,
        customStyle.palette
      );
      const cleaned = validateAndCleanAiPixelGrid(grid, 'stage', {
        targetPalette,
        coherenceLevel: aiCoherenceLevel,
      });
      setStagePreviewGrid(cleaned.grid);
      setStagePreviewName(data.name || 'Escenario IA');
      setAiStats((prev) => recordAiGenerationEvent(prev, { section: 'escenarios', usedApi: true, stats: cleaned.stats }));
      setLastAiExplanation(
        buildExplainableAiReport({
          contextAnalysis: ctxForAi,
          styleMode: aiContextMode,
          profileId: chosenId,
          coherenceLevel: aiCoherenceLevel,
          referenceUsed: activeReferenceLabel,
          validationStats: cleaned.stats,
          customStyleName: customStyle.name,
          customPalette: customStyle.palette,
        })
      );
    } catch {
      let fallback = generateFallbackStageGrid(
        canvasWidth,
        canvasHeight,
        stageMood,
        chosenId,
        aiContextMode === 'keep' ? targetPalette : undefined
      );
      fallback = applyContextualStyleToGrid(
        fallback,
        aiContextMode,
        chosenId,
        aiBlendRatio,
        targetPalette,
        aiCoherenceLevel,
        projectAnalysis.detectedProfileId,
        customStyle.palette
      );
      const cleaned = validateAndCleanAiPixelGrid(fallback, 'stage', {
        targetPalette,
        coherenceLevel: aiCoherenceLevel,
      });
      setStagePreviewGrid(cleaned.grid);
      setStagePreviewName(`${STAGE_CATEGORIES.find((c) => c.id === stageCategory)?.label || 'Escenario'} ${getAiStyleProfile(chosenId).name}`);
      setAiStats((prev) => recordAiGenerationEvent(prev, { section: 'escenarios', usedApi: false, stats: cleaned.stats }));
      setLastAiExplanation(
        buildExplainableAiReport({
          contextAnalysis: ctxForAi,
          styleMode: aiContextMode,
          profileId: chosenId,
          coherenceLevel: aiCoherenceLevel,
          referenceUsed: activeReferenceLabel,
          validationStats: cleaned.stats,
          customStyleName: customStyle.name,
          customPalette: customStyle.palette,
        })
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  // =========================================================
  // HANDLER 7: HUD/UI
  // =========================================================
  const handleRunHudAi = async () => {
    setIsAiLoading(true);
    setAiError(null);
    setHudOriginalSnap(compositeFrame(currentFrame, canvasWidth, canvasHeight, currentFrameIndex));
    const chosenId = effectiveTargetProfileId;
    const targetPalette = effectivePalette.length > 0 ? effectivePalette : FIGHTING_GAME_PALETTES[0].colors;
    const ctxForAi = buildEffectiveContextForAi();
    const customDesc = chosenId === 'custom' ? `${customStyle.name}: ${customStyle.description}` : '';

    try {
      const res = await fetch('/api/ai/hud-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: hudPrompt,
          width: canvasWidth,
          height: canvasHeight,
          theme: chosenId,
          hudCategory,
          elementCategory: hudCategory,
          includeBars: hudIncludeBars,
          includeTimer: hudIncludeTimer,
          includeSuper: hudIncludeSuper,
          palette: targetPalette,
          styleMode: aiContextMode,
          styleProfile: chosenId,
          blendRatio: aiBlendRatio,
          customStyleDescription: customDesc,
          contextAnalysis: ctxForAi,
          trainedProfile: trainedProjectProfile,
          coherenceLevel: aiCoherenceLevel,
          referenceProject: activeRefProject,
          referenceImagesBase64: collectRefImages(),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      let grid = pixelsToGrid(Array.isArray(data.pixels) ? data.pixels : [], canvasWidth, canvasHeight);
      grid = applyContextualStyleToGrid(
        grid,
        aiContextMode,
        chosenId,
        aiBlendRatio,
        targetPalette,
        aiCoherenceLevel,
        projectAnalysis.detectedProfileId,
        customStyle.palette
      );
      const cleaned = validateAndCleanAiPixelGrid(grid, 'hud', {
        targetPalette,
        coherenceLevel: aiCoherenceLevel,
      });
      setHudPreviewGrid(cleaned.grid);
      setHudPreviewName(data.name || 'HUD IA');
      setAiStats((prev) => recordAiGenerationEvent(prev, { section: 'hud', usedApi: true, stats: cleaned.stats }));
      setLastAiExplanation(
        buildExplainableAiReport({
          contextAnalysis: ctxForAi,
          styleMode: aiContextMode,
          profileId: chosenId,
          coherenceLevel: aiCoherenceLevel,
          referenceUsed: activeReferenceLabel,
          validationStats: cleaned.stats,
          customStyleName: customStyle.name,
          customPalette: customStyle.palette,
        })
      );
    } catch {
      let fallback = generateFallbackHudGrid(
        canvasWidth,
        canvasHeight,
        chosenId,
        hudIncludeBars,
        hudIncludeTimer,
        hudIncludeSuper,
        aiContextMode === 'keep' ? targetPalette : undefined
      );
      fallback = applyContextualStyleToGrid(
        fallback,
        aiContextMode,
        chosenId,
        aiBlendRatio,
        targetPalette,
        aiCoherenceLevel,
        projectAnalysis.detectedProfileId,
        customStyle.palette
      );
      const cleaned = validateAndCleanAiPixelGrid(fallback, 'hud', {
        targetPalette,
        coherenceLevel: aiCoherenceLevel,
      });
      setHudPreviewGrid(cleaned.grid);
      setHudPreviewName(`HUD ${getAiStyleProfile(chosenId).name}`);
      setAiStats((prev) => recordAiGenerationEvent(prev, { section: 'hud', usedApi: false, stats: cleaned.stats }));
      setLastAiExplanation(
        buildExplainableAiReport({
          contextAnalysis: ctxForAi,
          styleMode: aiContextMode,
          profileId: chosenId,
          coherenceLevel: aiCoherenceLevel,
          referenceUsed: activeReferenceLabel,
          validationStats: cleaned.stats,
          customStyleName: customStyle.name,
          customPalette: customStyle.palette,
        })
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  // =========================================================
  // HANDLER 8B: AUTOEVALUACIÓN IA
  // =========================================================
  const handleRunSelfEvaluation = async () => {
    setIsSelfEvaluating(true);
    setAiError(null);
    const localReport = runLocalAiSelfEvaluation({
      projectAnalysis,
      stats: aiStats,
      trainedProfile: trainedProjectProfile,
      referenceProject: activeRefProject,
      frames,
      coherenceLevel: aiCoherenceLevel,
    });
    try {
      const res = await fetch('/api/ai/self-evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentFrameBase64: frameToPngBase64(currentFrame),
          projectContext: projectAnalysis,
          telemetryStats: aiStats,
          referenceProject: activeRefProject,
          trainedProfile: trainedProjectProfile,
          framesCount: frames.length,
        }),
      });
      const data = await res.json();
      if (data.error || data.fallback || !Array.isArray(data.axes)) {
        setSelfEvaluation(localReport);
      } else {
        setSelfEvaluation({
          evaluatedAt: Date.now(),
          evaluatedByAi: true,
          overallScore: typeof data.overallScore === 'number' ? data.overallScore : localReport.overallScore,
          axes: data.axes,
          summary: data.summary || localReport.summary,
          improvements: Array.isArray(data.improvements) && data.improvements.length > 0 ? data.improvements : localReport.improvements,
        });
      }
    } catch {
      setSelfEvaluation(localReport);
    } finally {
      setIsSelfEvaluating(false);
    }
  };

  const handleSelectReferenceProject = (id: AiReferenceProjectId) => {
    setActiveRefProjectId(id);
    const prof = buildReferenceProjectProfile(id, projectAnalysis, trainedProjectProfile, project?.name || 'Proyecto propio');
    if (id === 'custom_project') {
      setAiContextMode('keep');
      setAiExternalProfile(prof.styleProfileId);
    } else {
      setAiExternalProfile(prof.styleProfileId);
      setAiContextMode('adapt');
    }
    setAiStats((prev) => {
      const next = { ...prev, styleChangesCount: prev.styleChangesCount + 1, lastUpdatedAt: Date.now() };
      saveAiGenerationStats(next);
      return next;
    });
  };

  // =========================================================
  // HANDLER 9: BIBLIOTECA IA ELEMENT / STAMP
  // =========================================================
  const handleGenerateStamp = async () => {
    setIsAiLoading(true);
    setAiError(null);
    const size = Math.min(32, Math.max(16, Math.min(canvasWidth, canvasHeight)));
    const targetPalette = effectivePalette.length > 0 ? effectivePalette : FIGHTING_GAME_PALETTES[0].colors;

    try {
      const res = await fetch('/api/ai/element-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: stampPrompt,
          category: stampCategory,
          size,
          palette: targetPalette,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const raw = pixelsToGrid(Array.isArray(data.pixels) ? data.pixels : [], size, size);
      const cleaned = validateAndCleanAiPixelGrid(raw, stampCategory === 'vfx' ? 'vfx' : 'sprite', {
        targetPalette,
        coherenceLevel: aiCoherenceLevel,
      });
      setStampPreviewGrid(cleaned.grid);
      setStampPreviewName(data.name || 'Componente IA');
    } catch {
      const raw = generateFallbackCharacterGrid(createEmptyGrid(size, size), size, size, 'create', targetPalette);
      const cleaned = validateAndCleanAiPixelGrid(raw, 'sprite', { targetPalette, coherenceLevel: aiCoherenceLevel });
      setStampPreviewGrid(cleaned.grid);
      setStampPreviewName(`Sello ${stampCategory}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const showMandatoryStyleQuestion =
    section !== 'adaptacion_estilo' &&
    section !== 'proyecto_referencia' &&
    section !== 'diagnostico_ia' &&
    section !== 'configuracion_ia';

  const aiLibraryItems = useMemo(
    () => libraryItems.filter((item) => item.origin === 'ai' || item.tags?.includes('ai')),
    [libraryItems]
  );

  const warningAlertsCount = diagnosticsReport.problemsDetected.filter((p) => p.severity === 'warning').length;

  return (
    <div className="flex flex-col gap-2 text-xs">
      {/* 12-Section Navigation Rail (3 rows x 4 cols, clean hairline buttons) */}
      <div
        className="grid grid-cols-4 gap-1 p-1 rounded-lg border"
        style={{ backgroundColor: 'var(--studio-bg-panel)', borderColor: 'var(--studio-border)' }}
      >
        {SECTION_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = section === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className="py-1.5 px-1 rounded flex flex-col items-center justify-center gap-0.5 text-[9px] font-semibold transition-colors whitespace-nowrap relative"
              style={{
                backgroundColor: active ? 'var(--studio-accent)' : 'transparent',
                color: active ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
              }}
              title={tab.label}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate max-w-full">{tab.label}</span>
              {tab.id === 'diagnostico_ia' && warningAlertsCount > 0 && !active && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
              )}
              {tab.id === 'proyecto_referencia' && activeRefProject && !active && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Compact Active Reference Project + Periodic Diagnostic Status Strip */}
      {(activeRefProject || (warningAlertsCount > 0 && section !== 'diagnostico_ia')) && (
        <div
          className="px-2 py-1 rounded border flex items-center justify-between gap-2 text-[9.5px]"
          style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
        >
          {activeRefProject ? (
            <button
              type="button"
              onClick={() => setSection('proyecto_referencia')}
              className="truncate text-left font-medium hover:underline"
              style={{ color: 'var(--studio-accent)' }}
            >
              Ref: {activeRefProject.name}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSection('diagnostico_ia')}
              className="truncate text-left font-medium text-amber-300 hover:underline flex items-center gap-1"
            >
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span className="truncate">{diagnosticsReport.problemsDetected[0]?.title}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setSection('diagnostico_ia')}
            className="font-mono text-[9px] shrink-0 whitespace-nowrap"
            style={{ color: warningAlertsCount > 0 ? '#fbbf24' : '#34d399' }}
          >
            {warningAlertsCount > 0 ? `${warningAlertsCount} aviso(s)` : 'IA OK'}
          </button>
        </div>
      )}

      {/* Guided Creation Bar + Two-Phase Flow (Phase 1 Analysis + Constraints + Strict/Free Reference) */}
      {showMandatoryStyleQuestion && (
        <div className="flex flex-col gap-1.5">
          {/* Guided Creation: ¿Qué desea crear? */}
          <div
            className="px-2 py-1.5 rounded-lg border flex flex-col gap-1 text-[10px]"
            style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold" style={{ color: 'var(--studio-text)' }}>
                ¿Qué desea crear?
              </span>
              <span className="font-mono text-[9px]" style={{ color: 'var(--studio-text-muted)' }}>
                Flujo guiado 2 fases
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {GUIDED_CREATE_TARGETS.map((t) => {
                const active = section === t.section;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSection(t.section)}
                    className="py-1 px-1 rounded border text-[9px] font-semibold truncate whitespace-nowrap"
                    style={{
                      backgroundColor: active
                        ? 'color-mix(in srgb, var(--studio-accent) 18%, var(--studio-bg-elevated))'
                        : 'var(--studio-bg-elevated)',
                      borderColor: active ? 'var(--studio-accent)' : 'var(--studio-border)',
                      color: active ? 'var(--studio-accent)' : 'var(--studio-text-muted)',
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Style Governance + Phase 1 Context & Constraints Card */}
          <div
            className="px-2 py-1.5 rounded-lg border flex flex-col gap-1.5 text-[10px]"
            style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
          >
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowContextControls((v) => !v)}
                className="font-bold flex items-center gap-1 text-left"
                style={{ color: 'var(--studio-text)' }}
              >
                <ScanSearch className="w-3 h-3 shrink-0" style={{ color: 'var(--studio-accent)' }} />
                <span>Fase 1: Contexto y Restricciones</span>
                {showContextControls ? (
                  <ChevronUp className="w-3 h-3 shrink-0 opacity-70" />
                ) : (
                  <ChevronDown className="w-3 h-3 shrink-0 opacity-70" />
                )}
              </button>
              <span className="font-mono text-[9px] truncate" style={{ color: 'var(--studio-accent)' }}>
                {livePhase1Analysis.detectedStyle} · {livePhase1Analysis.paletteCount} col.
              </span>
            </div>

            {showContextControls && (
              <>
                {/* Style selection: Auto Detectar / Mantener actual / Personalizado */}
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      { id: 'auto_detect', label: 'Auto Detectar' },
                      { id: 'keep', label: 'Mantener actual' },
                      { id: 'custom', label: 'Personalizado' },
                    ] as { id: AiContextualMode; label: string }[]
                  ).map((opt) => {
                    const active =
                      aiContextMode === opt.id ||
                      (opt.id === 'custom' && (aiContextMode === 'adapt' || aiContextMode === 'blend'));
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setAiContextMode(opt.id)}
                        className="py-1 px-1.5 rounded border text-[9px] font-semibold truncate whitespace-nowrap"
                        style={{
                          backgroundColor: active
                            ? 'color-mix(in srgb, var(--studio-accent) 18%, var(--studio-bg-elevated))'
                            : 'var(--studio-bg-elevated)',
                          borderColor: active ? 'var(--studio-accent)' : 'var(--studio-border)',
                          color: active ? 'var(--studio-accent)' : 'var(--studio-text-muted)',
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {(aiContextMode === 'custom' || aiContextMode === 'adapt' || aiContextMode === 'blend') && (
                  <div className="flex items-center gap-1">
                    <select
                      value={aiExternalProfile}
                      onChange={(e) => setAiExternalProfile(e.target.value as AiExternalProfileId)}
                      className="flex-1 px-1.5 py-1 rounded border text-[10px] font-mono"
                      style={{
                        backgroundColor: 'var(--studio-bg-elevated)',
                        borderColor: 'var(--studio-border-strong)',
                        color: 'var(--studio-text)',
                      }}
                    >
                      {AI_EXTERNAL_PROFILES.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.era}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setSection('adaptacion_estilo')}
                      className="px-2 py-1 rounded border text-[9px] font-semibold whitespace-nowrap"
                      style={{
                        backgroundColor: 'var(--studio-bg-elevated)',
                        borderColor: 'var(--studio-border-strong)',
                        color: 'var(--studio-accent)',
                      }}
                    >
                      Editar
                    </button>
                  </div>
                )}

                {/* Phase 1 Readout Box */}
                <div
                  className="p-1.5 rounded border flex flex-col gap-1 text-[9.5px] font-mono"
                  style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-sans font-bold" style={{ color: 'var(--studio-accent)' }}>
                      Análisis Fase 1 {livePhase1Analysis.analyzedByAi ? '(IA Multimodal)' : '(Contexto)'}
                    </span>
                    <button
                      type="button"
                      onClick={handleRunPhaseOneAnalysis}
                      disabled={isAnalyzingPhase1}
                      className="px-1.5 py-0.5 rounded border font-sans text-[9px] font-semibold whitespace-nowrap disabled:opacity-50"
                      style={{
                        backgroundColor: 'var(--studio-bg-card)',
                        borderColor: 'var(--studio-border-strong)',
                        color: 'var(--studio-text)',
                      }}
                    >
                      {isAnalyzingPhase1 ? 'Analizando...' : 'Analizar con IA'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5" style={{ color: 'var(--studio-text-muted)' }}>
                    <span className="truncate">
                      Estilo detectado: <b style={{ color: 'var(--studio-text)' }}>{livePhase1Analysis.detectedStyle}</b>
                    </span>
                    <span className="tabular-nums">
                      Paleta: <b style={{ color: 'var(--studio-text)' }}>{livePhase1Analysis.paletteCount} colores</b>
                    </span>
                    <span className="truncate">
                      Pose: <b style={{ color: 'var(--studio-text)' }}>{livePhase1Analysis.detectedPose}</b>
                    </span>
                    <span>
                      Perspectiva: <b style={{ color: 'var(--studio-text)' }}>{livePhase1Analysis.perspective}</b>
                    </span>
                    <span>
                      Contorno: <b className="tabular-nums" style={{ color: 'var(--studio-text)' }}>{livePhase1Analysis.outlinePx}px</b>
                    </span>
                    <span className="tabular-nums">
                      Resolución: <b style={{ color: 'var(--studio-text)' }}>{livePhase1Analysis.resolution}</b>
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                    {livePhase1Analysis.palette.slice(0, 10).map((c, idx) => (
                      <span
                        key={`${c}-${idx}`}
                        className="w-2.5 h-2.5 rounded-sm border border-white/25"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>

                {/* ¿Qué desea conservar? */}
                <div className="flex flex-col gap-1 pt-0.5">
                  <span className="text-[9.5px] font-bold" style={{ color: 'var(--studio-text)' }}>
                    ¿Qué desea conservar?
                  </span>
                  <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-[9.5px]">
                    {(
                      [
                        ['pose', 'Pose'],
                        ['colors', 'Colores'],
                        ['silhouette', 'Silueta'],
                        ['style', 'Estilo'],
                        ['proportions', 'Proporciones'],
                        ['animation', 'Animación'],
                      ] as [keyof AiPreserveConstraints, string][]
                    ).map(([k, lbl]) => (
                      <label key={k} className="flex items-center gap-1 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={preserveConstraints[k]}
                          onChange={(e) =>
                            setPreserveConstraints((prev) => ({ ...prev, [k]: e.target.checked }))
                          }
                          className="accent-amber-400"
                        />
                        <span>{lbl}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Strict vs Free Reference Mode */}
                <div className="pt-1 border-t flex flex-col gap-1" style={{ borderColor: 'var(--studio-border)' }}>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setReferenceMode('strict')}
                      className="py-1 px-1.5 rounded border text-[9.5px] font-semibold whitespace-nowrap"
                      style={{
                        backgroundColor:
                          referenceMode === 'strict'
                            ? 'color-mix(in srgb, var(--studio-accent) 18%, var(--studio-bg-elevated))'
                            : 'var(--studio-bg-elevated)',
                        borderColor: referenceMode === 'strict' ? 'var(--studio-accent)' : 'var(--studio-border)',
                        color: referenceMode === 'strict' ? 'var(--studio-accent)' : 'var(--studio-text-muted)',
                      }}
                    >
                      Referencia Estricta
                    </button>
                    <button
                      type="button"
                      onClick={() => setReferenceMode('free')}
                      className="py-1 px-1.5 rounded border text-[9.5px] font-semibold whitespace-nowrap"
                      style={{
                        backgroundColor:
                          referenceMode === 'free'
                            ? 'color-mix(in srgb, var(--studio-accent) 18%, var(--studio-bg-elevated))'
                            : 'var(--studio-bg-elevated)',
                        borderColor: referenceMode === 'free' ? 'var(--studio-accent)' : 'var(--studio-border)',
                        color: referenceMode === 'free' ? 'var(--studio-accent)' : 'var(--studio-text-muted)',
                      }}
                    >
                      Referencia Libre
                    </button>
                  </div>

                  {referenceMode === 'strict' ? (
                    <div className="grid grid-cols-4 gap-1">
                      {(
                        [
                          { id: 'low', label: 'Baja' },
                          { id: 'medium', label: 'Media' },
                          { id: 'high', label: 'Alta' },
                          { id: 'exact', label: 'Exacta' },
                        ] as { id: AiPoseFidelityLevel; label: string }[]
                      ).map((lvl) => {
                        const active = charFidelity === lvl.id;
                        return (
                          <button
                            key={lvl.id}
                            type="button"
                            onClick={() => {
                              setCharFidelity(lvl.id);
                              setAiPoseFidelity(lvl.id);
                            }}
                            className="py-0.5 rounded border text-[9px] font-semibold whitespace-nowrap"
                            style={{
                              backgroundColor: active ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                              color: active ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                              borderColor: active ? 'var(--studio-accent)' : 'var(--studio-border)',
                            }}
                          >
                            {lvl.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[9px]" style={{ color: 'var(--studio-text-muted)' }}>
                      Inspirarse en la referencia sin copiar pose o composición exacta.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 1. PERSONAJES                                                     */}
      {/* ================================================================= */}
      {section === 'personajes' && (
        <div className="flex flex-col gap-2">
          <div
            className="p-2.5 rounded-lg border flex flex-col gap-2"
            style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: 'var(--studio-accent)' }}>
                <User className="w-3.5 h-3.5" />
                <span>IA de Personajes (Fase 2)</span>
              </span>
              <span className="text-[9px] font-mono tabular-nums" style={{ color: 'var(--studio-text-muted)' }}>
                {canvasWidth}×{canvasHeight}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1">
              {CHARACTER_TASK_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCharTaskMode(opt.id)}
                  className="py-1 px-1.5 rounded border text-[9px] font-semibold truncate whitespace-nowrap"
                  style={{
                    backgroundColor: charTaskMode === opt.id ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                    color: charTaskMode === opt.id ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                    borderColor: charTaskMode === opt.id ? 'var(--studio-accent)' : 'var(--studio-border)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Reference Image + Guide strip */}
            <div className="flex items-center gap-1.5">
              {referenceImageBase64 ? (
                <div className="flex items-center gap-1.5 flex-1 px-2 py-1 rounded border" style={{ borderColor: 'var(--studio-border-strong)', backgroundColor: 'var(--studio-bg-elevated)' }}>
                  <img src={referenceImageBase64} alt="Ref" className="w-6 h-6 rounded object-cover" />
                  <span className="text-[10px] truncate flex-1">Referencia cargada</span>
                  <button type="button" onClick={() => setReferenceImageBase64(null)} className="text-rose-400 text-xs px-1">
                    ×
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => charFileInputRef.current?.click()}
                  className="flex-1 py-1.5 px-2 rounded border border-dashed text-[10px] flex items-center justify-center gap-1.5 hover:opacity-90"
                  style={{ borderColor: 'var(--studio-border-strong)', color: 'var(--studio-text-muted)' }}
                >
                  <Upload className="w-3 h-3" />
                  <span>Adjuntar referencia ({activeAiGuideRefs.length} activas)</span>
                </button>
              )}
              <input ref={charFileInputRef} type="file" accept="image/*" onChange={handleUploadCharReference} className="sr-only" />
            </div>

            {/* Strict character preserve checkboxes */}
            <div className="pt-1 border-t flex flex-wrap gap-x-2.5 gap-y-1 text-[9px]" style={{ borderColor: 'var(--studio-border)' }}>
              {(
                [
                  ['silhouette', 'Silueta'],
                  ['proportions', 'Proporciones'],
                  ['posture', 'Postura'],
                  ['design', 'Diseño'],
                  ['hair', 'Cabello'],
                  ['outfit', 'Vestimenta'],
                  ['accessories', 'Accesorios'],
                ] as [keyof AiCharacterPreserveFlags, string][]
              ).map(([k, lbl]) => (
                <label key={k} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={charPreserve[k]}
                    onChange={(e) => setCharPreserve((prev) => ({ ...prev, [k]: e.target.checked }))}
                    className="accent-amber-400"
                  />
                  <span>{lbl}</span>
                </label>
              ))}
            </div>

            <textarea
              rows={2}
              value={charPrompt}
              onChange={(e) => setCharPrompt(e.target.value)}
              placeholder="Describe personaje, vestuario, pose o limpieza..."
              className="w-full px-2 py-1.5 rounded border text-[11px] resize-none focus:outline-none"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            />

            <button
              type="button"
              onClick={handleRunCharacterAi}
              disabled={isAiLoading}
              className="w-full py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>{isAiLoading ? 'Fase 2: Generando Personaje...' : 'Fase 2: Generar usando Análisis'}</span>
            </button>
          </div>

          {charPreviewGrid && (
            <div className="p-2 rounded-lg border flex flex-col gap-2" style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-accent)' }}>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[9px]" style={{ color: 'var(--studio-text-muted)' }}>Original</span>
                  <PixelGridMiniPreview
                    grid={compositeFrame(currentFrame, canvasWidth, canvasHeight, currentFrameIndex)}
                    width={canvasWidth}
                    height={canvasHeight}
                    className="w-full h-20 rounded border object-contain"
                  />
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[9px]" style={{ color: 'var(--studio-accent)' }}>Propuesta IA</span>
                  <PixelGridMiniPreview
                    grid={charPreviewGrid}
                    width={canvasWidth}
                    height={canvasHeight}
                    className="w-full h-20 rounded border object-contain"
                  />
                </div>
              </div>
              {lastAiExplanation && <ExplainableAiCard report={lastAiExplanation} compact />}
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => setCharPreviewGrid(null)}
                  className="py-1 rounded border text-[10px]"
                  style={{ borderColor: 'var(--studio-border-strong)', color: 'var(--studio-text-muted)' }}
                >
                  Descartar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSaveGridToLibrary?.(`Personaje ${charTaskMode}`, charPreviewGrid, canvasWidth, canvasHeight, 'character', 'ai');
                  }}
                  className="py-1 rounded border text-[10px] font-semibold flex items-center justify-center gap-1"
                  style={{ borderColor: 'var(--studio-border-strong)', color: 'var(--studio-text)' }}
                >
                  <BookmarkPlus className="w-3 h-3 text-emerald-400" />
                  <span>Guardar</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onApplyFrameRemix(gridToPixels(charPreviewGrid), charPreviewHitboxes, aiTargetMode, false);
                    setCharPreviewGrid(null);
                  }}
                  className="py-1 rounded text-[10px] font-bold flex items-center justify-center gap-1"
                  style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
                >
                  <Check className="w-3 h-3" />
                  <span>Aplicar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* 2. POSES Y DUMMIE (DUMMIE / IMAGEN / FRAME -> POSE COHESIVA IA)   */}
      {/* ================================================================= */}
      {section === 'poses_dummie' && (
        <div className="flex flex-col gap-2">
          <div
            className="p-2.5 rounded-lg border flex flex-col gap-2 text-[10px]"
            style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: 'var(--studio-accent)' }}>
                <Activity className="w-3.5 h-3.5" />
                <span>IA de Poses Coherentes (Fase 2)</span>
              </span>
              <span className="font-mono text-[9px]" style={{ color: 'var(--studio-text-muted)' }}>
                {activeAiGuideRefs.length} refs
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[9.5px]" style={{ color: 'var(--studio-text-muted)' }}>
                Fuente de Pose:
              </span>
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    { id: 'dummie', label: 'Dummie 2.5D' },
                    { id: 'image', label: 'Imagen Ref.' },
                    { id: 'frame', label: 'Frame Existente' },
                  ] as const
                ).map((src) => (
                  <button
                    key={src.id}
                    type="button"
                    onClick={() => setPoseInputSource(src.id)}
                    className="py-1 px-1.5 rounded border text-[9px] font-semibold whitespace-nowrap"
                    style={{
                      backgroundColor: poseInputSource === src.id ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                      color: poseInputSource === src.id ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                      borderColor: poseInputSource === src.id ? 'var(--studio-accent)' : 'var(--studio-border)',
                    }}
                  >
                    {src.label}
                  </button>
                ))}
              </div>
            </div>

            {poseInputSource === 'frame' && (
              <label className="flex items-center justify-between gap-2 text-[10px]">
                <span style={{ color: 'var(--studio-text-muted)' }}>Frame origen:</span>
                <select
                  value={poseSourceFrameIdx}
                  onChange={(e) => setPoseSourceFrameIdx(Number(e.target.value))}
                  className="px-1.5 py-1 rounded border font-mono text-[10px]"
                  style={{
                    backgroundColor: 'var(--studio-bg-elevated)',
                    borderColor: 'var(--studio-border-strong)',
                    color: 'var(--studio-text)',
                  }}
                >
                  {frames.map((f, idx) => (
                    <option key={f.id} value={idx}>
                      #{idx + 1} · {f.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {poseInputSource === 'image' && activeAiGuideRefs.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {activeAiGuideRefs.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onGenerateDummieFromReference?.(r)}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] hover:opacity-90"
                    style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
                    title="Extraer pose articulada desde referencia"
                  >
                    <img src={r.dataUrl} alt={r.name} className="w-4 h-4 rounded object-cover" />
                    <span className="max-w-[80px] truncate">{r.name}</span>
                  </button>
                ))}
              </div>
            )}

            <input
              type="text"
              value={posePrompt}
              onChange={(e) => setPosePrompt(e.target.value)}
              placeholder="Ej: Patada frontal alta manteniendo casco y chaqueta..."
              className="w-full px-2 py-1 rounded border text-[10.5px] focus:outline-none"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            />

            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={handleRunPoseAi}
                disabled={isAiLoading}
                className="w-full py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAiLoading ? 'Fase 2: Generando Pose...' : 'Fase 2: Generar Pose Coherente'}</span>
              </button>
              {onOpenApplyPoseModal && (
                <button
                  type="button"
                  onClick={onOpenApplyPoseModal}
                  className="w-full py-1 rounded border text-[10px] font-semibold flex items-center justify-center gap-1.5"
                  style={{
                    backgroundColor: 'var(--studio-bg-elevated)',
                    borderColor: 'var(--studio-border-strong)',
                    color: 'var(--studio-text)',
                  }}
                >
                  <Eye className="w-3 h-3" />
                  <span>Abrir Modal Comparativa Rig Dummie</span>
                </button>
              )}
            </div>
          </div>

          {posePreviewGrid && (
            <div className="p-2 rounded-lg border flex flex-col gap-2" style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-accent)' }}>
              <div className="grid grid-cols-2 gap-1.5">
                <PixelGridMiniPreview
                  grid={compositeFrame(currentFrame, canvasWidth, canvasHeight, currentFrameIndex)}
                  width={canvasWidth}
                  height={canvasHeight}
                  className="w-full h-20 rounded border object-contain"
                />
                <PixelGridMiniPreview
                  grid={posePreviewGrid}
                  width={canvasWidth}
                  height={canvasHeight}
                  className="w-full h-20 rounded border object-contain"
                />
              </div>
              {lastAiExplanation && <ExplainableAiCard report={lastAiExplanation} compact />}
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setPosePreviewGrid(null)}
                  className="py-1 rounded border text-[10px]"
                  style={{ borderColor: 'var(--studio-border-strong)', color: 'var(--studio-text-muted)' }}
                >
                  Descartar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onApplyFrameRemix(gridToPixels(posePreviewGrid), undefined, aiTargetMode, false);
                    setPosePreviewGrid(null);
                  }}
                  className="py-1 rounded text-[10px] font-bold flex items-center justify-center gap-1"
                  style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
                >
                  <Check className="w-3 h-3" />
                  <span>Aplicar Pose</span>
                </button>
              </div>
            </div>
          )}

          {dummiePose && onChangeDummiePose && onSaveDummiePose && onDeleteSavedDummiePose && onOpenApplyPoseModal ? (
            <DummiePosePanel
              pose={dummiePose}
              onChangePose={onChangeDummiePose}
              savedPoses={savedDummiePoses}
              onSavePose={onSaveDummiePose}
              onDeleteSavedPose={onDeleteSavedDummiePose}
              onOpenApplyModal={onOpenApplyPoseModal}
              references={references}
              guidesConfig={guidesConfig}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              onChangeGuidesConfig={onChangeGuidesConfig}
            />
          ) : (
            <p className="text-[10px] p-2" style={{ color: 'var(--studio-text-muted)' }}>
              Rig Dummie no inicializado.
            </p>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* 3. ANIMACIONES (GENERATE / FIX / CYCLES / TRANSITIONS)            */}
      {/* ================================================================= */}
      {section === 'animaciones' && (
        <div className="flex flex-col gap-2">
          <div
            className="p-2.5 rounded-lg border flex flex-col gap-2"
            style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
          >
            <span className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: 'var(--studio-accent)' }}>
              <Film className="w-3.5 h-3.5" />
              <span>IA de Animación (Ciclos y Combate)</span>
            </span>

            <div className="flex flex-col gap-1">
              <span className="text-[9.5px]" style={{ color: 'var(--studio-text-muted)' }}>
                Ciclos y Acciones Clave:
              </span>
              <div className="grid grid-cols-3 gap-1">
                {ANIMATION_CYCLE_PRESETS.map((preset) => {
                  const active = animCyclePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setAnimCyclePreset(preset.id);
                        setAnimMode(preset.mode);
                        setAnimPrompt(preset.prompt);
                        setAnimFrameCount(preset.frames);
                      }}
                      className="py-1 px-1.5 rounded border text-[9px] font-semibold truncate whitespace-nowrap"
                      style={{
                        backgroundColor: active
                          ? 'color-mix(in srgb, var(--studio-accent) 18%, var(--studio-bg-elevated))'
                          : 'var(--studio-bg-elevated)',
                        borderColor: active ? 'var(--studio-accent)' : 'var(--studio-border)',
                        color: active ? 'var(--studio-accent)' : 'var(--studio-text-muted)',
                      }}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1">
              {ANIMATION_MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAnimMode(opt.id)}
                  className="py-1 px-2 rounded border text-[10px] font-semibold"
                  style={{
                    backgroundColor: animMode === opt.id ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                    color: animMode === opt.id ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                    borderColor: animMode === opt.id ? 'var(--studio-accent)' : 'var(--studio-border)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <StudioSlider
                variant="panel"
                label="Frames"
                value={animFrameCount}
                min={2}
                max={12}
                step={1}
                defaultValue={4}
                onChange={setAnimFrameCount}
              />
              <StudioSlider
                variant="panel"
                label="Suavidad"
                value={animSmoothness}
                min={20}
                max={100}
                step={5}
                unit="%"
                defaultValue={80}
                onChange={setAnimSmoothness}
              />
            </div>

            <label className="flex items-center justify-between gap-2 text-[10px]">
              <span style={{ color: 'var(--studio-text-muted)' }}>Detalle anatómico / trazos:</span>
              <select
                value={animDetail}
                onChange={(e) => setAnimDetail(e.target.value as any)}
                className="px-2 py-0.5 rounded border text-[10px] font-mono"
                style={{
                  backgroundColor: 'var(--studio-bg-elevated)',
                  borderColor: 'var(--studio-border-strong)',
                  color: 'var(--studio-text)',
                }}
              >
                <option value="low">Bajo (Retro rápido)</option>
                <option value="medium">Medio</option>
                <option value="high">Alto</option>
                <option value="ultra">Ultra (Fighting Arcade)</option>
              </select>
            </label>

            <textarea
              rows={2}
              value={animPrompt}
              onChange={(e) => setAnimPrompt(e.target.value)}
              placeholder="Ej: Ciclo idle respirando, dash hacia adelante o combo de 4 golpes..."
              className="w-full px-2 py-1.5 rounded border text-[11px] resize-none focus:outline-none"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            />

            <button
              type="button"
              onClick={handleRunAnimationAi}
              disabled={isAiLoading}
              className="w-full py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAiLoading ? 'Generando Secuencia...' : `Generar Secuencia (${animFrameCount}F)`}</span>
            </button>
          </div>

          {animPreviewFrames && animPreviewFrames.length > 0 && (
            <div className="p-2 rounded-lg border flex flex-col gap-2" style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-accent)' }}>
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold">Preview Animada ({animPlayIdx + 1}/{animPreviewFrames.length})</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setAnimPlaying((p) => !p)}
                    className="px-2 py-0.5 rounded border flex items-center gap-1"
                    style={{ borderColor: 'var(--studio-border-strong)', backgroundColor: 'var(--studio-bg-elevated)' }}
                  >
                    {animPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    <span>{animPlaying ? 'Pausa' : 'Play'}</span>
                  </button>
                </div>
              </div>
              <PixelGridMiniPreview
                grid={animPreviewFrames[animPlayIdx] || animPreviewFrames[0]}
                width={canvasWidth}
                height={canvasHeight}
                className="w-full h-24 rounded border object-contain"
              />
              {lastAiExplanation && <ExplainableAiCard report={lastAiExplanation} compact />}
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setAnimInsertMode('append_frames')}
                  className="py-1 rounded border font-semibold"
                  style={{
                    backgroundColor: animInsertMode === 'append_frames' ? 'color-mix(in srgb, var(--studio-accent) 18%, var(--studio-bg-elevated))' : 'var(--studio-bg-elevated)',
                    borderColor: animInsertMode === 'append_frames' ? 'var(--studio-accent)' : 'var(--studio-border)',
                  }}
                >
                  Añadir Fotogramas
                </button>
                <button
                  type="button"
                  onClick={() => setAnimInsertMode('overlay_layers')}
                  className="py-1 rounded border font-semibold"
                  style={{
                    backgroundColor: animInsertMode === 'overlay_layers' ? 'color-mix(in srgb, var(--studio-accent) 18%, var(--studio-bg-elevated))' : 'var(--studio-bg-elevated)',
                    borderColor: animInsertMode === 'overlay_layers' ? 'var(--studio-accent)' : 'var(--studio-border)',
                  }}
                >
                  Capas en Frames Actuales
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setAnimPreviewFrames(null)}
                  className="py-1 rounded border text-[10px]"
                  style={{ borderColor: 'var(--studio-border-strong)', color: 'var(--studio-text-muted)' }}
                >
                  Descartar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onInsertAnimationFrames) {
                      onInsertAnimationFrames(animPreviewFrames, `Anim_${animMode}`, animInsertMode);
                    } else {
                      const seq = animPreviewFrames.map((g) => gridToPixels(g));
                      onInjectAiVfx(seq, `Anim_${animMode}`, undefined, 'new_layer', true, `[Anim] ${animMode}`, '#38bdf8');
                    }
                    setAnimPreviewFrames(null);
                  }}
                  className="py-1 rounded text-[10px] font-bold flex items-center justify-center gap-1"
                  style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
                >
                  <Plus className="w-3 h-3" />
                  <span>Insertar en Timeline</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* 4. INBETWEENS (CON CONTROL DE CALIDAD OBLIGATORIO)                */}
      {/* ================================================================= */}
      {section === 'inbetweens' && (
        <div className="flex flex-col gap-2">
          <div
            className="p-2.5 rounded-lg border flex flex-col gap-2"
            style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
          >
            <span className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: 'var(--studio-accent)' }}>
              <GitCompare className="w-3.5 h-3.5" />
              <span>Interpolación e Inbetweens IA</span>
            </span>

            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <label className="flex flex-col gap-0.5">
                <span style={{ color: 'var(--studio-text-muted)' }}>Frame A (Pose inicio):</span>
                <select
                  value={tweenFrameA}
                  onChange={(e) => setTweenFrameA(Number(e.target.value))}
                  className="px-1.5 py-1 rounded border font-mono text-[10px]"
                  style={{
                    backgroundColor: 'var(--studio-bg-elevated)',
                    borderColor: 'var(--studio-border-strong)',
                    color: 'var(--studio-text)',
                  }}
                >
                  {frames.map((f, i) => (
                    <option key={f.id} value={i}>
                      #{i + 1} · {f.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-0.5">
                <span style={{ color: 'var(--studio-text-muted)' }}>Frame B (Pose fin):</span>
                <select
                  value={tweenFrameB}
                  onChange={(e) => setTweenFrameB(Number(e.target.value))}
                  className="px-1.5 py-1 rounded border font-mono text-[10px]"
                  style={{
                    backgroundColor: 'var(--studio-bg-elevated)',
                    borderColor: 'var(--studio-border-strong)',
                    color: 'var(--studio-text)',
                  }}
                >
                  {frames.map((f, i) => (
                    <option key={f.id} value={i}>
                      #{i + 1} · {f.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Pre-Gen Quality Controls */}
            <div className="pt-1.5 border-t flex flex-col gap-1.5" style={{ borderColor: 'var(--studio-border)' }}>
              <span className="text-[10px] font-bold" style={{ color: 'var(--studio-text)' }}>
                Control de Calidad (Previo a generar):
              </span>
              <div className="grid grid-cols-2 gap-2">
                <StudioSlider
                  variant="panel"
                  label="Cant. frames"
                  value={tweenCount}
                  min={1}
                  max={6}
                  step={1}
                  defaultValue={2}
                  onChange={setTweenCount}
                />
                <StudioSlider
                  variant="panel"
                  label="Suavidad"
                  value={tweenSmoothness}
                  min={25}
                  max={100}
                  step={5}
                  unit="%"
                  defaultValue={85}
                  onChange={setTweenSmoothness}
                />
              </div>
              <label className="flex items-center justify-between text-[10px]">
                <span style={{ color: 'var(--studio-text-muted)' }}>Nivel de detalle:</span>
                <select
                  value={tweenDetail}
                  onChange={(e) => setTweenDetail(e.target.value as any)}
                  className="px-2 py-0.5 rounded border text-[10px] font-mono"
                  style={{
                    backgroundColor: 'var(--studio-bg-elevated)',
                    borderColor: 'var(--studio-border-strong)',
                    color: 'var(--studio-text)',
                  }}
                >
                  <option value="low">Bajo</option>
                  <option value="medium">Medio</option>
                  <option value="high">Alto</option>
                  <option value="ultra">Ultra</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={handleRunInBetweensAi}
                disabled={isAiLoading || frames.length < 2}
                className="py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAiLoading ? 'Interpolando...' : `Previsualizar (${tweenCount}F)`}</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (tweenFrameA === tweenFrameB) return;
                  setIsAiLoading(true);
                  try {
                    await onGenerateInBetween(tweenFrameA, tweenFrameB);
                  } finally {
                    setIsAiLoading(false);
                  }
                }}
                disabled={isAiLoading || frames.length < 2 || tweenFrameA === tweenFrameB}
                className="py-1.5 rounded-lg border text-[10px] font-semibold disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--studio-bg-elevated)',
                  borderColor: 'var(--studio-border-strong)',
                  color: 'var(--studio-text)',
                }}
              >
                Directo 1F Rápido
              </button>
            </div>
          </div>

          {tweenPreviewFrames && tweenPreviewFrames.length > 0 && (
            <div className="p-2 rounded-lg border flex flex-col gap-2" style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-accent)' }}>
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold">
                  Intermedio {tweenPreviewCursor + 1} de {tweenPreviewFrames.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setTweenPreviewCursor((c) => Math.max(0, c - 1))}
                    className="p-0.5 rounded border"
                    style={{ borderColor: 'var(--studio-border-strong)' }}
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTweenPreviewCursor((c) => Math.min(tweenPreviewFrames.length - 1, c + 1))}
                    className="p-0.5 rounded border"
                    style={{ borderColor: 'var(--studio-border-strong)' }}
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <PixelGridMiniPreview
                grid={tweenPreviewFrames[tweenPreviewCursor] || tweenPreviewFrames[0]}
                width={canvasWidth}
                height={canvasHeight}
                className="w-full h-24 rounded border object-contain"
              />
              {lastAiExplanation && <ExplainableAiCard report={lastAiExplanation} compact />}
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setTweenPreviewFrames(null)}
                  className="py-1 rounded border text-[10px]"
                  style={{ borderColor: 'var(--studio-border-strong)', color: 'var(--studio-text-muted)' }}
                >
                  Descartar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onInsertInBetweenSequence) {
                      onInsertInBetweenSequence(
                        Math.min(tweenFrameA, tweenFrameB),
                        tweenPreviewFrames,
                        `InBetween (${tweenFrameA + 1}→${tweenFrameB + 1})`
                      );
                    }
                    setTweenPreviewFrames(null);
                  }}
                  className="py-1 rounded text-[10px] font-bold flex items-center justify-center gap-1"
                  style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
                >
                  <Plus className="w-3 h-3" />
                  <span>Insertar en Timeline</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* 5. FX LAB (COMPLETAMENTE SEPARADO DE PERSONAJES)                  */}
      {/* ================================================================= */}
      {section === 'fx_lab' && (
        <div className="flex flex-col gap-2">
          {onOpenFxStudio && (
            <div
              className="p-2.5 rounded-lg border flex flex-col gap-2"
              style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: 'var(--studio-accent)' }}>
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>FX Lab Modular (Contexto VFX)</span>
                </span>
                <span className="text-[9px] font-mono" style={{ color: 'var(--studio-text-muted)' }}>
                  17 tipos · 9 deformadores
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onOpenFxStudio('generator')}
                  className="py-1.5 px-2 rounded text-[11px] font-bold flex items-center justify-center gap-1"
                  style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generador FX</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenFxStudio('lab')}
                  className="py-1.5 px-2 rounded border text-[11px] font-semibold flex items-center justify-center gap-1"
                  style={{
                    backgroundColor: 'var(--studio-bg-elevated)',
                    borderColor: 'var(--studio-border-strong)',
                    color: 'var(--studio-text)',
                  }}
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>Abrir FX Lab</span>
                </button>
              </div>
              {(layers[currentLayerIndex]?.fxRecipe || lastGeneratedFxRecipe) && (
                <button
                  type="button"
                  onClick={() =>
                    onOpenFxStudio(
                      (layers[currentLayerIndex]?.fxRecipe || lastGeneratedFxRecipe)?.source === 'lab' ? 'lab' : 'generator',
                      layers[currentLayerIndex]?.fxRecipe || lastGeneratedFxRecipe
                    )
                  }
                  className="w-full py-1 rounded border text-[10px] font-semibold"
                  style={{ borderColor: 'var(--studio-border-strong)', color: 'var(--studio-accent)' }}
                >
                  Editar efecto actual: {(layers[currentLayerIndex]?.fxRecipe || lastGeneratedFxRecipe)?.name}
                </button>
              )}
            </div>
          )}

          <AiFxPreview
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            selectedPresetId={selectedFxPresetId}
            styleMode={effectiveStyleConditioning}
            performanceMode={performanceMode}
            characterPalette={effectivePalette}
            onSelectPreset={(preset: FxPreset) => {
              setSelectedFxPresetId(preset.id);
              setVfxPrompt(preset.prompt);
            }}
            onInjectSequence={(seq, preset) => {
              onInjectAiVfx(seq, preset.name, { x: 14, y: 12, width: 12, height: 8 }, aiTargetMode, wrapVfxInGroup, `[FX] ${preset.name}`, preset.color);
            }}
          />

          <div
            className="p-2.5 rounded-lg border flex flex-col gap-2"
            style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
          >
            <span className="text-[10px] font-bold" style={{ color: 'var(--studio-text-muted)' }}>
              Generar Secuencia VFX por Prompt IA:
            </span>
            <input
              type="text"
              value={vfxPrompt}
              onChange={(e) => setVfxPrompt(e.target.value)}
              placeholder="Ej: Corte relámpago púrpura o explosión..."
              className="w-full px-2 py-1.5 rounded border text-[11px] focus:outline-none"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            />
            <button
              type="button"
              onClick={handleRunFxLabAi}
              disabled={isAiLoading}
              className="w-full py-1.5 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: 'var(--studio-accent)',
                color: 'var(--studio-accent)',
              }}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>{isAiLoading ? 'Generando VFX...' : 'Previsualizar Secuencia VFX IA'}</span>
            </button>

            {vfxPreviewFrames && vfxPreviewFrames.length > 0 && (
              <div className="p-2 rounded border flex flex-col gap-1.5" style={{ borderColor: 'var(--studio-accent)', backgroundColor: 'var(--studio-bg-elevated)' }}>
                <span className="text-[10px] font-bold">
                  Vista Previa ({vfxPreviewFrames.length}F) · {vfxPreviewName}
                </span>
                <PixelGridMiniPreview
                  grid={(() => {
                    const g = createEmptyGrid(canvasWidth, canvasHeight);
                    for (const p of vfxPreviewFrames[0]) {
                      if (p.x >= 0 && p.x < canvasWidth && p.y >= 0 && p.y < canvasHeight) g[p.y][p.x] = p.color;
                    }
                    return g;
                  })()}
                  width={canvasWidth}
                  height={canvasHeight}
                  className="w-full h-20 rounded border object-contain"
                />
                {lastAiExplanation && <ExplainableAiCard report={lastAiExplanation} compact />}
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setVfxPreviewFrames(null)}
                    className="py-1 rounded border text-[10px]"
                    style={{ borderColor: 'var(--studio-border-strong)' }}
                  >
                    Descartar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onInjectAiVfx(vfxPreviewFrames, vfxPreviewName, vfxPreviewHitbox, aiTargetMode, wrapVfxInGroup, `[FX] ${vfxPreviewName}`, '#a855f7');
                      setVfxPreviewFrames(null);
                    }}
                    className="py-1 rounded text-[10px] font-bold flex items-center justify-center gap-1"
                    style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
                  >
                    <Check className="w-3 h-3" />
                    <span>Aplicar VFX</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 6. ESCENARIOS                                                     */}
      {/* ================================================================= */}
      {section === 'escenarios' && (
        <div className="flex flex-col gap-2">
          <div
            className="p-2.5 rounded-lg border flex flex-col gap-2"
            style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
          >
            <span className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: 'var(--studio-accent)' }}>
              <Monitor className="w-3.5 h-3.5" />
              <span>Escenarios, Fondos, Parallax y Tiles</span>
            </span>

            <div className="grid grid-cols-3 gap-1">
              {STAGE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setStageCategory(cat.id)}
                  className="py-1 px-1.5 rounded border text-[9px] font-semibold truncate"
                  style={{
                    backgroundColor: stageCategory === cat.id ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                    color: stageCategory === cat.id ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                    borderColor: stageCategory === cat.id ? 'var(--studio-accent)' : 'var(--studio-border)',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={stagePrompt}
              onChange={(e) => setStagePrompt(e.target.value)}
              placeholder="Describe escenario, capa parallax, tileset o prop del mundo..."
              className="w-full px-2 py-1.5 rounded border text-[11px] resize-none focus:outline-none"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            />

            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <label className="flex flex-col gap-0.5">
                <span style={{ color: 'var(--studio-text-muted)' }}>Iluminación:</span>
                <select
                  value={stageMood}
                  onChange={(e) => setStageMood(e.target.value)}
                  className="px-1.5 py-1 rounded border font-mono text-[10px]"
                  style={{
                    backgroundColor: 'var(--studio-bg-elevated)',
                    borderColor: 'var(--studio-border-strong)',
                    color: 'var(--studio-text)',
                  }}
                >
                  <option value="sunset">Atardecer</option>
                  <option value="night">Noche Neón</option>
                  <option value="day">Día Claro</option>
                  <option value="storm">Tormenta</option>
                </select>
              </label>
              <label className="flex flex-col gap-0.5">
                <span style={{ color: 'var(--studio-text-muted)' }}>Inserción:</span>
                <select
                  value={stageInsertMode}
                  onChange={(e) => setStageInsertMode(e.target.value as any)}
                  className="px-1.5 py-1 rounded border font-mono text-[10px]"
                  style={{
                    backgroundColor: 'var(--studio-bg-elevated)',
                    borderColor: 'var(--studio-border-strong)',
                    color: 'var(--studio-text)',
                  }}
                >
                  <option value="new_layer">Nueva Capa [Escenario]</option>
                  <option value="current_layer">Capa Actual</option>
                </select>
              </label>
            </div>

            <button
              type="button"
              onClick={handleRunStageAi}
              disabled={isAiLoading}
              className="w-full py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAiLoading ? 'Generando Escenario...' : 'Generar Arte de Escenario'}</span>
            </button>
          </div>

          {stagePreviewGrid && (
            <div className="p-2 rounded-lg border flex flex-col gap-2" style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-accent)' }}>
              <div className="grid grid-cols-2 gap-1.5">
                <PixelGridMiniPreview
                  grid={stageOriginalSnap || compositeFrame(currentFrame, canvasWidth, canvasHeight, currentFrameIndex)}
                  width={canvasWidth}
                  height={canvasHeight}
                  className="w-full h-20 rounded border object-contain"
                />
                <PixelGridMiniPreview
                  grid={stagePreviewGrid}
                  width={canvasWidth}
                  height={canvasHeight}
                  className="w-full h-20 rounded border object-contain"
                />
              </div>
              {lastAiExplanation && <ExplainableAiCard report={lastAiExplanation} compact />}
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() =>
                    onInsertGeneratedGrid?.(stagePreviewGrid, stageInsertMode, stagePreviewName, '[Escenario]', '#10b981', true)
                  }
                  className="py-1.5 rounded text-[10px] font-bold flex items-center justify-center gap-1"
                  style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
                >
                  <Plus className="w-3 h-3" />
                  <span>Aplicar al Fondo</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onSaveGridToLibrary?.(stagePreviewName, stagePreviewGrid, canvasWidth, canvasHeight, 'stage', 'ai')
                  }
                  className="py-1.5 rounded border text-[10px] font-semibold flex items-center justify-center gap-1"
                  style={{ borderColor: 'var(--studio-border-strong)', color: 'var(--studio-text)' }}
                >
                  <BookmarkPlus className="w-3 h-3 text-emerald-400" />
                  <span>Guardar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* 7. HUD/UI                                                         */}
      {/* ================================================================= */}
      {section === 'hud_ui' && (
        <div className="flex flex-col gap-2">
          <div
            className="p-2.5 rounded-lg border flex flex-col gap-2"
            style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
          >
            <span className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: 'var(--studio-accent)' }}>
              <Layout className="w-3.5 h-3.5" />
              <span>Generador IA de HUD e Interfaz</span>
            </span>

            <div className="grid grid-cols-3 gap-1">
              {HUD_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setHudCategory(cat.id)}
                  className="py-1 px-1.5 rounded border text-[9px] font-semibold truncate"
                  style={{
                    backgroundColor: hudCategory === cat.id ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                    color: hudCategory === cat.id ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                    borderColor: hudCategory === cat.id ? 'var(--studio-accent)' : 'var(--studio-border)',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={hudPrompt}
              onChange={(e) => setHudPrompt(e.target.value)}
              placeholder="Describe barras de vida, retrato, menú o marcador..."
              className="w-full px-2 py-1.5 rounded border text-[11px] resize-none focus:outline-none"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            />

            <div className="flex items-center justify-between gap-2 text-[10px]">
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={hudIncludeBars} onChange={(e) => setHudIncludeBars(e.target.checked)} className="accent-amber-400" />
                <span>Vida P1/P2</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={hudIncludeTimer} onChange={(e) => setHudIncludeTimer(e.target.checked)} className="accent-amber-400" />
                <span>Timer 99</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={hudIncludeSuper} onChange={(e) => setHudIncludeSuper(e.target.checked)} className="accent-amber-400" />
                <span>Super</span>
              </label>
            </div>

            <button
              type="button"
              onClick={handleRunHudAi}
              disabled={isAiLoading}
              className="w-full py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAiLoading ? 'Generando HUD...' : 'Generar HUD / UI Pixel Art'}</span>
            </button>
          </div>

          {hudPreviewGrid && (
            <div className="p-2 rounded-lg border flex flex-col gap-2" style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-accent)' }}>
              <div className="grid grid-cols-2 gap-1.5">
                <PixelGridMiniPreview
                  grid={hudOriginalSnap || compositeFrame(currentFrame, canvasWidth, canvasHeight, currentFrameIndex)}
                  width={canvasWidth}
                  height={canvasHeight}
                  className="w-full h-20 rounded border object-contain"
                />
                <PixelGridMiniPreview
                  grid={hudPreviewGrid}
                  width={canvasWidth}
                  height={canvasHeight}
                  className="w-full h-20 rounded border object-contain"
                />
              </div>
              {lastAiExplanation && <ExplainableAiCard report={lastAiExplanation} compact />}
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() =>
                    onInsertGeneratedGrid?.(hudPreviewGrid, hudInsertMode, hudPreviewName, '[HUD]', '#f59e0b', false)
                  }
                  className="py-1.5 rounded text-[10px] font-bold flex items-center justify-center gap-1"
                  style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
                >
                  <Plus className="w-3 h-3" />
                  <span>Aplicar en Tope</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onSaveGridToLibrary?.(hudPreviewName, hudPreviewGrid, canvasWidth, canvasHeight, 'hud', 'ai')
                  }
                  className="py-1.5 rounded border text-[10px] font-semibold flex items-center justify-center gap-1"
                  style={{ borderColor: 'var(--studio-border-strong)', color: 'var(--studio-text)' }}
                >
                  <BookmarkPlus className="w-3 h-3 text-emerald-400" />
                  <span>Guardar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* 8. ADAPTACIÓN DE ESTILO (ESTILOS + PERSONALIZADO + COHERENCIA)    */}
      {/* ================================================================= */}
      {section === 'adaptacion_estilo' && (
        <div className="flex flex-col gap-2">
          <div
            className="p-2.5 rounded-lg border flex flex-col gap-2"
            style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
          >
            <span className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: 'var(--studio-accent)' }}>
              <Palette className="w-3.5 h-3.5" />
              <span>Dirección de Estilo Global del Proyecto</span>
            </span>

            <div className="grid grid-cols-2 gap-1 text-[10px]">
              {(
                [
                  { id: 'keep', label: 'Mantener estilo actual' },
                  { id: 'auto_detect', label: 'Detectar automáticamente' },
                  { id: 'custom', label: 'Elegir estilo manual' },
                  { id: 'blend', label: 'Mezclar estilos (%)' },
                ] as { id: AiContextualMode; label: string }[]
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setAiContextMode(m.id)}
                  className="py-1.5 px-2 rounded border font-semibold text-left truncate"
                  style={{
                    backgroundColor: aiContextMode === m.id ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                    color: aiContextMode === m.id ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                    borderColor: aiContextMode === m.id ? 'var(--studio-accent)' : 'var(--studio-border)',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {aiContextMode === 'blend' && (
              <StudioSlider
                variant="panel"
                label="Mezcla hacia estilo elegido"
                value={Math.round(aiBlendRatio * 100)}
                min={10}
                max={90}
                step={5}
                unit="%"
                defaultValue={50}
                onChange={(v) => setAiBlendRatio(v / 100)}
              />
            )}

            <div className="pt-1 border-t flex flex-col gap-1" style={{ borderColor: 'var(--studio-border)' }}>
              <span className="text-[10px] font-semibold" style={{ color: 'var(--studio-text-muted)' }}>
                Biblioteca de Estilos ({AI_EXTERNAL_PROFILES.length}):
              </span>
              <div className="max-h-52 overflow-y-auto flex flex-col gap-1 pr-0.5">
                {AI_EXTERNAL_PROFILES.map((prof) => {
                  const selected = aiExternalProfile === prof.id && aiContextMode !== 'keep';
                  return (
                    <button
                      key={prof.id}
                      type="button"
                      onClick={() => {
                        setAiExternalProfile(prof.id);
                        if (aiContextMode === 'keep' || aiContextMode === 'auto_detect') {
                          setAiContextMode('custom');
                        }
                      }}
                      className="p-1.5 rounded border text-left flex flex-col gap-1 transition-colors"
                      style={{
                        backgroundColor: selected ? 'color-mix(in srgb, var(--studio-accent) 16%, var(--studio-bg-elevated))' : 'var(--studio-bg-elevated)',
                        borderColor: selected ? 'var(--studio-accent)' : 'var(--studio-border)',
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[10px]" style={{ color: selected ? 'var(--studio-accent)' : 'var(--studio-text)' }}>
                          {prof.name}
                        </span>
                        <span className="text-[9px] font-mono" style={{ color: 'var(--studio-text-muted)' }}>
                          {prof.outlinePx}px · {prof.shading}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-0.5">
                          {(prof.id === 'custom' ? customStyle.palette : prof.palette).slice(0, 8).map((c, idx) => (
                            <span key={`${prof.id}-${idx}`} className="w-2.5 h-2.5 rounded-sm border border-white/20" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                        <span className="text-[9px] truncate" style={{ color: 'var(--studio-text-muted)' }}>
                          {prof.era}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {aiExternalProfile === 'custom' && (
              <div className="p-2 rounded border flex flex-col gap-1.5" style={{ borderColor: 'var(--studio-accent)', backgroundColor: 'var(--studio-bg-elevated)' }}>
                <span className="text-[10px] font-bold" style={{ color: 'var(--studio-accent)' }}>
                  Definición de Estilo Personalizado
                </span>
                <input
                  type="text"
                  value={customStyle.name}
                  onChange={(e) => setCustomStyle((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Nombre del estilo..."
                  className="px-2 py-1 rounded border text-[10px]"
                  style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border-strong)', color: 'var(--studio-text)' }}
                />
                <textarea
                  rows={2}
                  value={customStyle.description}
                  onChange={(e) => setCustomStyle((s) => ({ ...s, description: e.target.value }))}
                  placeholder="Describe trazos, sombras, proporción y paleta..."
                  className="px-2 py-1 rounded border text-[10px] resize-none"
                  style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border-strong)', color: 'var(--studio-text)' }}
                />
                <div className="flex items-center gap-1 flex-wrap">
                  {customStyle.palette.map((c, idx) => (
                    <button
                      key={`${c}-${idx}`}
                      type="button"
                      onClick={() =>
                        setCustomStyle((s) => ({
                          ...s,
                          palette: s.palette.length > 2 ? s.palette.filter((_, i) => i !== idx) : s.palette,
                        }))
                      }
                      className="w-4 h-4 rounded border border-white/30"
                      style={{ backgroundColor: c }}
                      title={`Quitar ${c}`}
                    />
                  ))}
                  <input type="color" value={customNewSwatch} onChange={(e) => setCustomNewSwatch(e.target.value)} className="w-5 h-5 bg-transparent cursor-pointer" />
                  <button
                    type="button"
                    onClick={() =>
                      setCustomStyle((s) => ({
                        ...s,
                        palette: s.palette.includes(customNewSwatch) ? s.palette : [...s.palette, customNewSwatch],
                      }))
                    }
                    className="px-1.5 py-0.5 rounded border text-[9px]"
                    style={{ borderColor: 'var(--studio-border-strong)' }}
                  >
                    +Color
                  </button>
                </div>
              </div>
            )}

            <div className="pt-1.5 border-t flex items-center justify-between gap-2 text-[9.5px]" style={{ borderColor: 'var(--studio-border)' }}>
              <label className="flex items-center gap-1.5 cursor-pointer" style={{ color: 'var(--studio-text-muted)' }}>
                <input
                  type="checkbox"
                  checked={globalStyleCoherence}
                  onChange={(e) => setGlobalStyleCoherence(e.target.checked)}
                  className="accent-amber-400"
                />
                <span>
                  Adaptación global ({getAiStyleProfile(effectiveTargetProfileId).name}):{' '}
                  <b style={{ color: 'var(--studio-text)' }}>FX · HUD · Escenarios · Retratos</b>
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 8B. PROYECTO DE REFERENCIA GLOBAL                                 */}
      {/* ================================================================= */}
      {section === 'proyecto_referencia' && (
        <div className="flex flex-col gap-2">
          <div
            className="p-2.5 rounded-lg border flex flex-col gap-2"
            style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: 'var(--studio-accent)' }}>
                <Compass className="w-3.5 h-3.5" />
                <span>Proyecto de Referencia Visual</span>
              </span>
              {activeRefProject && (
                <button
                  type="button"
                  onClick={() => setActiveRefProjectId(null)}
                  className="text-[9px] font-mono text-slate-400 hover:text-white"
                >
                  Desactivar
                </button>
              )}
            </div>
            <p className="text-[10px] leading-snug" style={{ color: 'var(--studio-text-muted)' }}>
              Selecciona una obra o proyecto maestro. La IA analizará sus sprites, FX, HUD y escenarios y lo aplicará como referencia global en cada generación.
            </p>

            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { id: 'kof', label: 'King of Fighters', sub: 'SNK Neo Geo Arcade' },
                  { id: 'sf_alpha', label: 'Street Fighter Alpha', sub: 'Capcom CPS-2 Anime' },
                  { id: 'guilty_gear', label: 'Guilty Gear', sub: 'ArcSys Heavy-Metal' },
                  { id: 'custom_project', label: 'Proyecto propio', sub: 'Tu lienzo y paleta' },
                ] as { id: AiReferenceProjectId; label: string; sub: string }[]
              ).map((item) => {
                const selected = activeRefProjectId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectReferenceProject(item.id)}
                    className="p-2 rounded-lg border text-left flex flex-col gap-0.5 transition-colors"
                    style={{
                      backgroundColor: selected
                        ? 'color-mix(in srgb, var(--studio-accent) 18%, var(--studio-bg-elevated))'
                        : 'var(--studio-bg-elevated)',
                      borderColor: selected ? 'var(--studio-accent)' : 'var(--studio-border)',
                    }}
                  >
                    <span className="text-[10px] font-bold truncate" style={{ color: selected ? 'var(--studio-accent)' : 'var(--studio-text)' }}>
                      {item.label}
                    </span>
                    <span className="text-[9px] truncate" style={{ color: 'var(--studio-text-muted)' }}>
                      {item.sub}
                    </span>
                  </button>
                );
              })}
            </div>

            {activeRefProject && (
              <div
                className="p-2 rounded border flex flex-col gap-1.5 text-[9.5px]"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-accent)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold" style={{ color: 'var(--studio-accent)' }}>
                    Análisis Aplicado: {activeRefProject.name}
                  </span>
                  <span className="font-mono text-[9px] tabular-nums" style={{ color: 'var(--studio-text-muted)' }}>
                    {activeRefProject.outlinePx}px · {activeRefProject.shadingType}
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {activeRefProject.palette.slice(0, 10).map((c, idx) => (
                    <span key={`${c}-${idx}`} className="w-3 h-3 rounded-sm border border-white/25" style={{ backgroundColor: c }} title={c} />
                  ))}
                </div>
                <div className="flex flex-col gap-1 leading-snug" style={{ color: 'var(--studio-text-muted)' }}>
                  <span><b style={{ color: 'var(--studio-text)' }}>Sprites:</b> {activeRefProject.spriteTraits}</span>
                  <span><b style={{ color: 'var(--studio-text)' }}>FX:</b> {activeRefProject.fxTraits}</span>
                  <span><b style={{ color: 'var(--studio-text)' }}>HUD:</b> {activeRefProject.hudTraits}</span>
                  <span><b style={{ color: 'var(--studio-text)' }}>Escenarios:</b> {activeRefProject.stageTraits}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 8C. DIAGNÓSTICO IA · RECOMENDACIONES · AUTOEVALUACIÓN IA          */}
      {/* ================================================================= */}
      {section === 'diagnostico_ia' && (
        <div className="flex flex-col gap-2">
          <div
            className="grid grid-cols-3 gap-1 p-1 rounded-lg border"
            style={{ backgroundColor: 'var(--studio-bg-panel)', borderColor: 'var(--studio-border)' }}
          >
            {(
              [
                { id: 'diagnostico', label: 'Diagnóstico IA' },
                { id: 'recomendaciones', label: 'Recomendaciones' },
                { id: 'autoevaluacion', label: 'Autoevaluación' },
              ] as const
            ).map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setDiagSubTab(sub.id)}
                className="py-1 px-1 rounded text-[9.5px] font-semibold truncate whitespace-nowrap"
                style={{
                  backgroundColor: diagSubTab === sub.id ? 'var(--studio-accent)' : 'transparent',
                  color: diagSubTab === sub.id ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                }}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {diagSubTab === 'diagnostico' && (
            <div
              className="p-2.5 rounded-lg border flex flex-col gap-2"
              style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: 'var(--studio-accent)' }}>
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>Diagnóstico Periódico de IA</span>
                </span>
                <button
                  type="button"
                  onClick={() => setDiagRefreshNonce((n) => n + 1)}
                  className="px-1.5 py-0.5 rounded border text-[9px] font-semibold flex items-center gap-1"
                  style={{ borderColor: 'var(--studio-border-strong)', color: 'var(--studio-text-muted)' }}
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>Analizar</span>
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                {diagnosticsReport.problemsDetected.map((alert) => {
                  const isWarn = alert.severity === 'warning';
                  const isOk = alert.severity === 'ok';
                  return (
                    <div
                      key={alert.id}
                      className="p-2 rounded border flex flex-col gap-1"
                      style={{
                        backgroundColor: 'var(--studio-bg-elevated)',
                        borderColor: isWarn
                          ? 'rgba(245, 158, 11, 0.55)'
                          : isOk
                          ? 'rgba(16, 185, 129, 0.5)'
                          : 'var(--studio-border)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <span
                          className="text-[10px] font-bold flex items-center gap-1 leading-tight"
                          style={{ color: isWarn ? '#fbbf24' : isOk ? '#6ee7b7' : '#7dd3fc' }}
                        >
                          {isWarn ? (
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                          )}
                          <span>{alert.title}</span>
                        </span>
                      </div>
                      <p className="text-[9.5px] leading-snug" style={{ color: 'var(--studio-text-muted)' }}>
                        {alert.detail}
                      </p>
                      {alert.actionSection && alert.actionLabel && (
                        <button
                          type="button"
                          onClick={() => setSection(alert.actionSection!)}
                          className="self-start px-2 py-0.5 rounded border text-[9px] font-semibold mt-0.5"
                          style={{ borderColor: 'var(--studio-border-strong)', color: 'var(--studio-text)' }}
                        >
                          {alert.actionLabel}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {diagSubTab === 'recomendaciones' && (
            <div
              className="p-2.5 rounded-lg border flex flex-col gap-2.5 text-[10px]"
              style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold" style={{ color: 'var(--studio-accent)' }}>
                  Panel de Recomendaciones IA
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const empty = createDefaultAiGenerationStats();
                    saveAiGenerationStats(empty);
                    setAiStats(empty);
                  }}
                  className="text-[9px] font-mono text-slate-400 hover:text-white"
                >
                  Reiniciar stats
                </button>
              </div>

              {/* Estadísticas de generación */}
              <div className="p-2 rounded border flex flex-col gap-1.5" style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}>
                <span className="text-[9.5px] font-bold uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                  Estadísticas de generación
                </span>
                <div className="grid grid-cols-2 gap-1 font-mono text-[9.5px] tabular-nums">
                  <span>Total generadas: <b style={{ color: 'var(--studio-text)' }}>{aiStats.totalGenerations}</b></span>
                  <span>API / Local: <b style={{ color: 'var(--studio-text)' }}>{aiStats.apiGenerations} / {aiStats.localFallbacks}</b></span>
                  <span>Píxeles aislados limp.: <b className="text-amber-300">{aiStats.totalOrphansRemoved}</b></span>
                  <span>Huecos reparados: <b className="text-emerald-300">{aiStats.totalHolesFilled}</b></span>
                  <span>Ajustes anatómicos: <b className="text-sky-300">{aiStats.totalAnatomicalFixes}</b></span>
                  <span>Colores cuantizados: <b style={{ color: 'var(--studio-text)' }}>{aiStats.totalQuantizedColors}</b></span>
                </div>
                <div className="grid grid-cols-4 gap-1 pt-1 border-t text-[9px] font-mono tabular-nums" style={{ borderColor: 'var(--studio-border)', color: 'var(--studio-text-muted)' }}>
                  <span>Pjs: {aiStats.bySection.personajes}</span>
                  <span>Pos: {aiStats.bySection.poses}</span>
                  <span>Anim: {aiStats.bySection.animaciones}</span>
                  <span>FX: {aiStats.bySection.fx}</span>
                  <span>Tween: {aiStats.bySection.inbetweens}</span>
                  <span>Stg: {aiStats.bySection.escenarios}</span>
                  <span>HUD: {aiStats.bySection.hud}</span>
                  <span>Est: {aiStats.styleChangesCount}</span>
                </div>
              </div>

              {/* Problemas detectados */}
              <div className="flex flex-col gap-1">
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-amber-300">
                  Problemas detectados ({diagnosticsReport.problemsDetected.length})
                </span>
                {diagnosticsReport.problemsDetected.map((p) => (
                  <div key={p.id} className="text-[9.5px] leading-snug" style={{ color: 'var(--studio-text-muted)' }}>
                    • <b style={{ color: 'var(--studio-text)' }}>{p.title}:</b> {p.detail}
                  </div>
                ))}
              </div>

              {/* Áreas mejorables */}
              <div className="flex flex-col gap-1 pt-1 border-t" style={{ borderColor: 'var(--studio-border)' }}>
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-sky-300">
                  Áreas mejorables
                </span>
                {diagnosticsReport.improvableAreas.map((area, i) => (
                  <div key={i} className="text-[9.5px] leading-snug" style={{ color: 'var(--studio-text-muted)' }}>
                    • {area}
                  </div>
                ))}
              </div>

              {/* Funciones futuras recomendadas */}
              <div className="flex flex-col gap-1 pt-1 border-t" style={{ borderColor: 'var(--studio-border)' }}>
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-300">
                  Funciones futuras recomendadas
                </span>
                {diagnosticsReport.futureFeatures.map((feat, i) => (
                  <div key={i} className="text-[9.5px] leading-snug" style={{ color: 'var(--studio-text-muted)' }}>
                    • {feat}
                  </div>
                ))}
              </div>
            </div>
          )}

          {diagSubTab === 'autoevaluacion' && (
            <div
              className="p-2.5 rounded-lg border flex flex-col gap-2"
              style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold" style={{ color: 'var(--studio-accent)' }}>
                  Autoevaluación de Calidad IA
                </span>
                {selfEvaluation && (
                  <span className="text-[10px] font-mono font-bold tabular-nums text-emerald-300">
                    {selfEvaluation.overallScore}/100
                  </span>
                )}
              </div>
              <p className="text-[9.5px] leading-snug" style={{ color: 'var(--studio-text-muted)' }}>
                Evalúa la calidad actual de Sprites, HUD, FX, Animaciones y Coherencia Visual generados, explicando qué mejorar y por qué.
              </p>

              <button
                type="button"
                onClick={handleRunSelfEvaluation}
                disabled={isSelfEvaluating}
                className="w-full py-1.5 rounded-lg text-[10.5px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isSelfEvaluating ? 'Evaluando proyecto...' : 'Ejecutar Autoevaluación IA'}</span>
              </button>

              {selfEvaluation && (
                <div className="flex flex-col gap-2 pt-1">
                  <div
                    className="p-2 rounded border text-[9.5px] leading-snug"
                    style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
                  >
                    <div className="flex items-center justify-between font-bold mb-1">
                      <span>{selfEvaluation.evaluatedByAi ? 'Auditoría Gemini IA' : 'Auditoría Local Adaptativa'}</span>
                      <span className="font-mono tabular-nums text-amber-300">{selfEvaluation.overallScore}/100</span>
                    </div>
                    <p style={{ color: 'var(--studio-text-muted)' }}>{selfEvaluation.summary}</p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {selfEvaluation.axes.map((ax) => (
                      <div
                        key={ax.key}
                        className="p-1.5 rounded border flex flex-col gap-1"
                        style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
                      >
                        <div className="flex items-center justify-between text-[9.5px]">
                          <span className="font-bold">{ax.label}</span>
                          <span className="font-mono tabular-nums text-[9px]" style={{ color: ax.score >= 82 ? '#6ee7b7' : ax.score >= 68 ? '#fbbf24' : '#fda4af' }}>
                            {ax.score}/100 · {ax.status}
                          </span>
                        </div>
                        <div className="w-full h-1 rounded-full overflow-hidden bg-slate-900">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(8, Math.min(100, ax.score))}%`,
                              backgroundColor: ax.score >= 82 ? '#10b981' : ax.score >= 68 ? '#f59e0b' : '#f43f5e',
                            }}
                          />
                        </div>
                        <p className="text-[9px] leading-snug" style={{ color: 'var(--studio-text-muted)' }}>
                          {ax.observation}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-1 pt-1 border-t" style={{ borderColor: 'var(--studio-border)' }}>
                    <span className="text-[9.5px] font-bold text-amber-300">
                      Qué mejorar y por qué:
                    </span>
                    {selfEvaluation.improvements.map((imp, idx) => (
                      <span key={idx} className="text-[9.5px] leading-snug" style={{ color: 'var(--studio-text-muted)' }}>
                        • {imp}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* 9. BIBLIOTECA IA                                                  */}
      {/* ================================================================= */}
      {section === 'biblioteca_ia' && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-1 p-1 rounded-lg border" style={{ backgroundColor: 'var(--studio-bg-panel)', borderColor: 'var(--studio-border)' }}>
            {(
              [
                { id: 'assets', label: `Generados (${aiLibraryItems.length})` },
                { id: 'stamp', label: 'Crear Sello IA' },
                { id: 'img2pixel', label: 'Img ➔ Pixel' },
              ] as const
            ).map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setLibSubMode(sub.id)}
                className="py-1 rounded text-[10px] font-semibold"
                style={{
                  backgroundColor: libSubMode === sub.id ? 'var(--studio-accent)' : 'transparent',
                  color: libSubMode === sub.id ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                }}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {libSubMode === 'assets' && (
            <div className="p-2 rounded-lg border flex flex-col gap-1.5" style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}>
              {aiLibraryItems.length === 0 ? (
                <p className="text-[10px] py-3 text-center" style={{ color: 'var(--studio-text-muted)' }}>
                  Aún no hay recursos guardados desde IA. Usa &quot;Guardar&quot; en cualquier vista previa o genera un sello.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 max-h-72 overflow-y-auto">
                  {aiLibraryItems.map((item) => (
                    <div key={item.id} className="p-1.5 rounded border flex flex-col gap-1" style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}>
                      <PixelGridMiniPreview grid={item.pixels} width={item.width} height={item.height} className="w-full h-14 rounded object-contain" />
                      <span className="text-[9px] font-semibold truncate">{item.name}</span>
                      <button
                        type="button"
                        onClick={() => onInsertLibraryItem?.(item, 'new_layer')}
                        className="py-0.5 rounded text-[9px] font-bold"
                        style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
                      >
                        Insertar Capa
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {libSubMode === 'stamp' && (
            <div className="p-2.5 rounded-lg border flex flex-col gap-2" style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}>
              <span className="text-[10px] font-bold" style={{ color: 'var(--studio-accent)' }}>
                Generar Componente Reutilizable IA
              </span>
              <select
                value={stampCategory}
                onChange={(e) => setStampCategory(e.target.value as any)}
                className="px-2 py-1 rounded border text-[10px]"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)', color: 'var(--studio-text)' }}
              >
                <option value="vfx">Chispa / FX</option>
                <option value="character">Arma / Accesorio Personaje</option>
                <option value="stage">Prop de Escenario</option>
                <option value="hud">Insignia HUD</option>
              </select>
              <input
                type="text"
                value={stampPrompt}
                onChange={(e) => setStampPrompt(e.target.value)}
                className="px-2 py-1 rounded border text-[10px]"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)', color: 'var(--studio-text)' }}
              />
              <button
                type="button"
                onClick={handleGenerateStamp}
                disabled={isAiLoading}
                className="py-1.5 rounded text-[10px] font-bold"
                style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
              >
                {isAiLoading ? 'Generando...' : 'Generar Sello IA'}
              </button>
              {stampPreviewGrid && (
                <div className="flex flex-col gap-1.5 pt-1 border-t" style={{ borderColor: 'var(--studio-border)' }}>
                  <PixelGridMiniPreview
                    grid={stampPreviewGrid}
                    width={stampPreviewGrid[0]?.length || 24}
                    height={stampPreviewGrid.length}
                    className="w-full h-16 rounded border object-contain"
                  />
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        onInsertGeneratedGrid?.(stampPreviewGrid, 'new_layer', stampPreviewName)
                      }
                      className="py-1 rounded text-[10px] font-bold"
                      style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
                    >
                      Insertar en Lienzo
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onSaveGridToLibrary?.(
                          stampPreviewName,
                          stampPreviewGrid,
                          stampPreviewGrid[0]?.length || 24,
                          stampPreviewGrid.length,
                          stampCategory,
                          'ai'
                        )
                      }
                      className="py-1 rounded border text-[10px]"
                      style={{ borderColor: 'var(--studio-border-strong)' }}
                    >
                      Guardar Sello
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {libSubMode === 'img2pixel' && (
            <ImageToPixelPanel
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              activePaletteColors={activePaletteColors && activePaletteColors.length > 0 ? activePaletteColors : FIGHTING_GAME_PALETTES[0].colors}
              onApplyPixelGrid={(grid, mode, name) => onInsertGeneratedGrid?.(grid, mode, name || 'Imagen PixelArt')}
              onSaveToLibrary={(name, grid, w, h) => onSaveGridToLibrary?.(name, grid, w, h, 'character', 'user')}
              onLivePreviewChange={(p) => onLiveCanvasPreview?.(p)}
            />
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* 10. CONFIGURACIÓN IA (PRE-ANALISIS + ENTRENAR + POST-VALIDACION)  */}
      {/* ================================================================= */}
      {section === 'configuracion_ia' && (
        <div className="flex flex-col gap-2">
          <div
            className="p-2.5 rounded-lg border flex flex-col gap-2"
            style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
          >
            <span className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: 'var(--studio-accent)' }}>
              <Sliders className="w-3.5 h-3.5" />
              <span>Análisis del Proyecto y Reglas IA</span>
            </span>

            <div className="grid grid-cols-2 gap-1 text-[10px] font-mono" style={{ color: 'var(--studio-text-muted)' }}>
              <span>Resolución: <b className="tabular-nums" style={{ color: 'var(--studio-text)' }}>{projectAnalysis.resolution}</b></span>
              <span>Colores: <b className="tabular-nums" style={{ color: 'var(--studio-text)' }}>{projectAnalysis.uniqueColors}</b></span>
              <span>Estilo: <b style={{ color: 'var(--studio-text)' }}>{projectAnalysis.visualStyle}</b></span>
              <span>Contorno: <b style={{ color: 'var(--studio-text)' }}>{projectAnalysis.lineThickness}px</b></span>
              <span>Sombreado: <b style={{ color: 'var(--studio-text)' }}>{projectAnalysis.shadingType}</b></span>
              <span>Luz: <b style={{ color: 'var(--studio-text)' }}>{projectAnalysis.lightDirection}</b></span>
              <span>Anti-Alias: <b style={{ color: 'var(--studio-text)' }}>{projectAnalysis.antiAliasLevel}</b></span>
              <span>Detalle: <b style={{ color: 'var(--studio-text)' }}>{projectAnalysis.detailLevel}</b></span>
            </div>

            <div className="flex items-center gap-1 flex-wrap">
              {(trainedProjectProfile?.masterPalette || projectAnalysis.activePalette).slice(0, 12).map((c, idx) => (
                <span key={`${c}-${idx}`} className="w-3.5 h-3.5 rounded-sm border border-white/25" style={{ backgroundColor: c }} title={c} />
              ))}
            </div>

            <button
              type="button"
              onClick={handleTrainAi}
              className="w-full py-1.5 rounded-lg border font-bold text-[10px] flex items-center justify-center gap-1.5"
              style={{
                backgroundColor: trainedProjectProfile ? 'rgba(16, 185, 129, 0.16)' : 'var(--studio-bg-elevated)',
                borderColor: trainedProjectProfile ? '#10b981' : 'var(--studio-accent)',
                color: trainedProjectProfile ? '#6ee7b7' : 'var(--studio-accent)',
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{trainedProjectProfile ? 'Re-entrenar IA con el proyecto' : 'Entrenar IA con el proyecto actual'}</span>
            </button>
            {trainedProjectProfile && (
              <p className="text-[9px] font-mono text-emerald-300 leading-snug">{trainedProjectProfile.summary}</p>
            )}

            <div className="grid grid-cols-2 gap-1.5 pt-1 border-t" style={{ borderColor: 'var(--studio-border)' }}>
              <label className="flex flex-col gap-0.5 text-[10px]">
                <span style={{ color: 'var(--studio-text-muted)' }}>Coherencia post-limpieza:</span>
                <select
                  value={aiCoherenceLevel}
                  onChange={(e) => setAiCoherenceLevel(e.target.value as AiCoherenceLevel)}
                  className="px-1.5 py-1 rounded border font-mono text-[10px]"
                  style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)', color: 'var(--studio-text)' }}
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta (Sin ruido)</option>
                  <option value="max">Máxima (Estricta)</option>
                </select>
              </label>
              <label className="flex flex-col gap-0.5 text-[10px]">
                <span style={{ color: 'var(--studio-text-muted)' }}>Fidelidad Pose Base:</span>
                <select
                  value={aiPoseFidelity}
                  onChange={(e) => setAiPoseFidelity(e.target.value as AiPoseFidelityLevel)}
                  className="px-1.5 py-1 rounded border font-mono text-[10px]"
                  style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)', color: 'var(--studio-text)' }}
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="exact">Exacta</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <button
                type="button"
                onClick={() => setAiTargetMode('new_layer')}
                className="py-1 px-2 rounded border font-semibold"
                style={{
                  backgroundColor: aiTargetMode === 'new_layer' ? 'color-mix(in srgb, var(--studio-accent) 18%, var(--studio-bg-elevated))' : 'var(--studio-bg-elevated)',
                  borderColor: aiTargetMode === 'new_layer' ? 'var(--studio-accent)' : 'var(--studio-border)',
                }}
              >
                Nueva capa vinculada
              </button>
              <button
                type="button"
                onClick={() => setAiTargetMode('modify')}
                className="py-1 px-2 rounded border font-semibold"
                style={{
                  backgroundColor: aiTargetMode === 'modify' ? 'color-mix(in srgb, var(--studio-accent) 18%, var(--studio-bg-elevated))' : 'var(--studio-bg-elevated)',
                  borderColor: aiTargetMode === 'modify' ? 'var(--studio-accent)' : 'var(--studio-border)',
                }}
              >
                Modificar capa
              </button>
            </div>

            <label className="flex items-center gap-2 text-[10px] cursor-pointer">
              <input
                type="checkbox"
                checked={wrapVfxInGroup}
                onChange={(e) => setWrapVfxInGroup(e.target.checked)}
                className="accent-amber-400"
              />
              <span>Organizar VFX/Animaciones generadas en carpeta de grupo</span>
            </label>
          </div>
        </div>
      )}

      {aiError && (
        <p className="text-[10px] text-amber-300/90 px-2 py-1 rounded border border-amber-500/30 bg-amber-950/20">
          {aiError}
        </p>
      )}
    </div>
  );
};
