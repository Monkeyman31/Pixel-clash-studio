import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  BookmarkPlus,
  Check,
  ChevronLeft,
  ChevronRight,
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
  Sliders,
  Sparkles,
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
  AiHudCategory,
  AiPoseFidelityLevel,
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
import { compositeFrame, createEmptyGrid, frameToCanvas } from '../utils/pixelMath';
import {
  AI_EXTERNAL_PROFILES,
  analyzeProjectContext,
  analyzeReferenceImageDataUrl,
  applyContextualStyleToGrid,
  buildExplainableAiReport,
  generateFallbackAnimationFrames,
  generateFallbackCharacterGrid,
  generateFallbackHudGrid,
  generateFallbackStageGrid,
  generateMultiFrameInBetweensLocal,
  getAiStyleProfile,
  gridToPixels,
  pixelsToGrid,
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
  { id: 'biblioteca_ia', label: 'Biblioteca', icon: FolderHeart },
  { id: 'configuracion_ia', label: 'Config', icon: Sliders },
];

const CHARACTER_TASK_OPTIONS: { id: AiCharacterTaskMode; label: string }[] = [
  { id: 'create', label: 'Crear personaje' },
  { id: 'variation', label: 'Variación' },
  { id: 'recolor', label: 'Recolorear' },
  { id: 'outfit', label: 'Vestimenta' },
  { id: 'anatomy', label: 'Anatomía' },
  { id: 'reference_adapt', label: 'Adaptar Ref.' },
];

const ANIMATION_MODE_OPTIONS: { id: AiAnimationTaskMode; label: string }[] = [
  { id: 'generate', label: 'Generar anim.' },
  { id: 'fix', label: 'Arreglar / Pulir' },
  { id: 'cycle', label: 'Ciclo / Loop' },
  { id: 'transition', label: 'Transición' },
];

const STAGE_CATEGORIES: { id: AiStageCategory; label: string }[] = [
  { id: 'escenarios', label: 'Escenario' },
  { id: 'fondos', label: 'Fondo' },
  { id: 'decoracion', label: 'Decoración' },
  { id: 'parallax', label: 'Parallax' },
  { id: 'tiles', label: 'Tiles' },
  { id: 'mundo', label: 'Mundo / Prop' },
];

const HUD_CATEGORIES: { id: AiHudCategory; label: string }[] = [
  { id: 'barras_vida', label: 'Barras Vida' },
  { id: 'retratos', label: 'Retratos' },
  { id: 'interfaces', label: 'Interfaz' },
  { id: 'menus', label: 'Menús' },
  { id: 'marcadores', label: 'Marcadores' },
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

  // 3) Animaciones state
  const [animMode, setAnimMode] = useState<AiAnimationTaskMode>('generate');
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

  const activeReferenceLabel = useMemo(() => {
    const parts: string[] = ['Lienzo actual'];
    if (trainedProjectProfile) {
      parts.push(`Entrenado (${trainedProjectProfile.spriteLayerCount + trainedProjectProfile.stageLayerCount + trainedProjectProfile.hudLayerCount} capas)`);
    }
    if (referenceImageBase64) parts.push('Imagen guía');
    if (activeAiGuideRefs.length > 0) parts.push(`${activeAiGuideRefs.length} Ref(s)`);
    return parts.join(' + ');
  }, [trainedProjectProfile, referenceImageBase64, activeAiGuideRefs]);

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

  // =========================================================
  // HANDLER 1: PERSONAJES
  // =========================================================
  const handleRunCharacterAi = async () => {
    setIsAiLoading(true);
    setAiError(null);
    const chosenId = effectiveTargetProfileId;
    const ctxForAi = buildEffectiveContextForAi();
    const targetPalette = effectivePalette.length > 0 ? effectivePalette : FIGHTING_GAME_PALETTES[0].colors;
    const customDesc = chosenId === 'custom' ? `${customStyle.name}: ${customStyle.description}` : '';

    try {
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
          referenceFidelity: charFidelity,
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
      setLastAiExplanation(
        buildExplainableAiReport({
          contextAnalysis: ctxForAi,
          styleMode: aiContextMode,
          profileId: chosenId,
          coherenceLevel: aiCoherenceLevel,
          poseFidelity: charFidelity,
          referenceUsed: activeReferenceLabel,
          validationStats: cleaned.stats,
          customStyleName: customStyle.name,
          customPalette: customStyle.palette,
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
      setLastAiExplanation(
        buildExplainableAiReport({
          contextAnalysis: ctxForAi,
          styleMode: aiContextMode,
          profileId: chosenId,
          coherenceLevel: aiCoherenceLevel,
          poseFidelity: charFidelity,
          referenceUsed: activeReferenceLabel,
          validationStats: cleaned.stats,
          customStyleName: customStyle.name,
          customPalette: customStyle.palette,
        })
      );
      setAiError('Vista previa de personaje generada en modo local adaptativo.');
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

  const showMandatoryStyleQuestion = section !== 'adaptacion_estilo' && section !== 'configuracion_ia';

  const aiLibraryItems = useMemo(
    () => libraryItems.filter((item) => item.origin === 'ai' || item.tags?.includes('ai')),
    [libraryItems]
  );

  return (
    <div className="flex flex-col gap-2 text-xs">
      {/* 10-Section Navigation Rail (2 rows x 5 cols, clean hairline buttons) */}
      <div
        className="grid grid-cols-5 gap-1 p-1 rounded-lg border"
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
              className="py-1.5 px-1 rounded flex flex-col items-center justify-center gap-0.5 text-[9px] font-semibold transition-colors whitespace-nowrap"
              style={{
                backgroundColor: active ? 'var(--studio-accent)' : 'transparent',
                color: active ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
              }}
              title={tab.label}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate max-w-full">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mandatory Target Style Question Bar across generation tabs */}
      {showMandatoryStyleQuestion && (
        <div
          className="px-2 py-1.5 rounded-lg border flex flex-col gap-1.5 text-[10px]"
          style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold" style={{ color: 'var(--studio-text)' }}>
              ¿Estilo objetivo?
            </span>
            <span className="font-mono text-[9px] truncate" style={{ color: 'var(--studio-accent)' }}>
              {aiContextMode === 'keep'
                ? `Actual (${projectAnalysis.visualStyle})`
                : aiContextMode === 'auto_detect'
                ? `Auto (${getAiStyleProfile(effectiveTargetProfileId).name})`
                : aiExternalProfile === 'custom'
                ? customStyle.name
                : getAiStyleProfile(aiExternalProfile).name}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {(
              [
                { id: 'auto_detect', label: 'Detectar auto' },
                { id: 'keep', label: 'Mantener actual' },
                { id: 'custom', label: 'Elegir manual' },
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
                  className="py-1 px-1.5 rounded border text-[9px] font-semibold truncate"
                  style={{
                    backgroundColor: active ? 'color-mix(in srgb, var(--studio-accent) 18%, var(--studio-bg-elevated))' : 'var(--studio-bg-elevated)',
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
                <span>Estudio de Personajes IA</span>
              </span>
              <span className="text-[9px] font-mono tabular-nums" style={{ color: 'var(--studio-text-muted)' }}>
                {canvasWidth}×{canvasHeight}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1">
              {CHARACTER_TASK_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCharTaskMode(opt.id)}
                  className="py-1 px-1.5 rounded border text-[9px] font-semibold truncate"
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

            {/* Fidelity level */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px]">
                <span style={{ color: 'var(--studio-text-muted)' }}>Fidelidad a la referencia:</span>
                <span className="font-mono font-bold uppercase" style={{ color: 'var(--studio-accent)' }}>
                  {charFidelity === 'low' ? 'Baja' : charFidelity === 'medium' ? 'Media' : charFidelity === 'high' ? 'Alta' : 'Exacta'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {(
                  [
                    { id: 'low', label: 'Baja' },
                    { id: 'medium', label: 'Media' },
                    { id: 'high', label: 'Alta' },
                    { id: 'exact', label: 'Exacta' },
                  ] as { id: AiPoseFidelityLevel; label: string }[]
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setCharFidelity(f.id)}
                    className="py-1 rounded border text-[9px] font-semibold"
                    style={{
                      backgroundColor: charFidelity === f.id ? 'color-mix(in srgb, var(--studio-accent) 20%, var(--studio-bg-elevated))' : 'var(--studio-bg-elevated)',
                      borderColor: charFidelity === f.id ? 'var(--studio-accent)' : 'var(--studio-border)',
                      color: charFidelity === f.id ? 'var(--studio-accent)' : 'var(--studio-text-muted)',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
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
              placeholder="Describe personaje, atuendo, variaciones o recoloreado..."
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
              <span>{isAiLoading ? 'Procesando Personaje...' : 'Generar Comparativa de Personaje'}</span>
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
      {/* 2. POSES Y DUMMIE (UNIFIED RIG + REFERENCES + POSE AI)            */}
      {/* ================================================================= */}
      {section === 'poses_dummie' && (
        <div className="flex flex-col gap-2">
          <div
            className="p-2 rounded-lg border flex flex-col gap-1.5 text-[10px]"
            style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5" style={{ color: 'var(--studio-accent)' }}>
                <ImagePlus className="w-3.5 h-3.5" />
                <span>Referencias + Rig Dummie 2.5D + Pose IA</span>
              </span>
              <span className="font-mono text-[9px]" style={{ color: 'var(--studio-text-muted)' }}>
                {activeAiGuideRefs.length} refs
              </span>
            </div>

            {activeAiGuideRefs.length > 0 && (
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

            {onOpenApplyPoseModal && (
              <button
                type="button"
                onClick={onOpenApplyPoseModal}
                className="w-full py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5"
                style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Adaptar Personaje a Pose Dummie con IA</span>
              </button>
            )}
          </div>

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
              <span>Generador y Corrector de Animaciones IA</span>
            </span>

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

            <div className="pt-1.5 border-t text-[9px] font-mono" style={{ borderColor: 'var(--studio-border)', color: 'var(--studio-text-muted)' }}>
              Sincronización activa para: <b style={{ color: 'var(--studio-text)' }}>Personajes · FX · HUD · Escenarios</b> ({getAiStyleProfile(effectiveTargetProfileId).name})
            </div>
          </div>
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
