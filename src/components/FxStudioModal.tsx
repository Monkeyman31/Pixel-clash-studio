import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BookmarkPlus,
  BookOpen,
  Copy,
  Download,
  Droplets,
  Eraser,
  Eye,
  EyeOff,
  Film,
  Flame,
  FlaskConical,
  FolderHeart,
  GraduationCap,
  HelpCircle,
  ImagePlus,
  Layers,
  Mountain,
  PackagePlus,
  Paintbrush,
  Palette,
  Pause,
  Pencil,
  Pipette,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Shapes,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
  Waves,
  Wind,
  X,
} from 'lucide-react';
import {
  EditableFxRecipe,
  FxAuraConfig,
  FxBaseGuideConfig,
  FxComponentLibraryCategory,
  FxComponentLibraryItem,
  FxDeformerConfig,
  FxDetailLevel,
  FxDirectionType,
  FxEffectType,
  FxExampleEntry,
  FxFluidConfig,
  FxFluidEmitterMode,
  FxFluidType,
  FxGeneratorConfig,
  FxLabModule,
  FxLayerOutputMode,
  FxLayerRole,
  FxLibraryPreset,
  FxMaterialProfile,
  FxMorphologyConfig,
  FxOriginTag,
  FxParticleEmitterConfig,
  FxRockCluster,
  FxRockPiece,
  FxRockPieceKind,
  FxShapeType,
  FxSmearConfig,
  FxSmearMode,
  FxStudioWorkspaceTab,
  FxVisualizerBackdrop,
  FxVisualStyle,
  LayerBlendMode,
  PerformanceMode,
} from '../types';
import {
  DEFAULT_FX_GENERATOR_CONFIG,
  FX_DETAIL_LEVELS,
  FX_DIRECTIONS,
  FX_EFFECT_TYPES,
  FX_SHAPES,
  FX_VISUAL_STYLES,
  parseImportedFxPresetJson,
  serializeFxPresetJson,
  synthesizeFxFrames,
} from '../utils/fxGeneratorEngine';
import { validateAndCleanAiPixelGrid } from '../utils/projectContextAi';
import {
  animateStaticFxFrame,
  applyMaterialToGrid,
  bakeFluidFrames,
  cloneFxGrid,
  combineFxTypesIntoModules,
  createBlankFxGrid,
  createFluidSimState,
  createRandomRockPiece,
  DEFAULT_FLUID_CONFIG,
  DEFAULT_FX_MATERIALS,
  DEFAULT_PARTICLE_CONFIG,
  DEFAULT_ROCK_CLUSTERS,
  DEFAULT_ROCK_PIECES,
  DEFAULT_SMEAR_CONFIG,
  deleteFxLibraryV2,
  FLUID_TYPE_PRESETS,
  FluidSimState,
  FX_LAB_MODULE_META_EXTENDED,
  FX_MODULAR_PRESETS,
  FX_ORIGIN_LABELS,
  importImageFileToFxFrames,
  interpolateFxFrames,
  loadFxLibraryV2,
  paintPixelBrushOnGrid,
  PARTICLE_TEMPLATES,
  recolorFxFrames,
  renderFluidStateToGrid,
  resizeFxGridNearest,
  ROCK_KIND_META,
  saveFxLibraryV2,
  splitGridIntoFxComponents,
  StaticFxAnimMode,
  stepFluidSimulation,
  synthesizeEnhancedLabFrames,
  synthesizeParticleFrames,
  synthesizeRocksFrames,
  synthesizeSmearFrames,
} from '../utils/fxLabSuiteEngine';
import {
  applyMorphologyAndDeformersToGrid,
  createEarthSpikesAttackPreset,
  DEFAULT_AURA_CONFIG,
  DEFAULT_FX_BASE_GUIDE,
  DEFAULT_FX_DEFORMERS,
  DEFAULT_FX_MORPHOLOGY,
  deleteFxComponentLibrary,
  FX_COMPONENT_EXPLORER,
  FX_COMPONENT_LIB_CATEGORIES,
  FX_LAYER_ROLES,
  isDeformersActive,
  isMorphologyActive,
  loadFxComponentLibrary,
  saveFxComponentLibrary,
  synthesizeAuraFrames,
  synthesizeFxBaseGuide,
} from '../utils/fxWorkshopEngine';
import { FxExamplesGalleryPanel } from './FxExamplesGalleryPanel';
import {
  FxAuraEditorPanel,
  FxBaseGuidePanel,
  FxGuidedAiPanel,
  FxMorphologyDeformersPanel,
  GuidedAiFormState,
} from './FxWorkshopControlsPanels';
import { StudioSlider } from './StudioSlider';
import { getCachedPixelGridCanvas } from '../utils/renderCache';

export interface FxInjectionComponentLayer {
  name: string;
  blendMode: LayerBlendMode;
  opacity?: number;
  colorTag?: string;
  pixels: (string | null)[][];
}

export interface FxInjectionFrame {
  merged: (string | null)[][];
  components: FxInjectionComponentLayer[];
}

export interface FxInjectionPayload {
  name: string;
  layerMode: FxLayerOutputMode;
  singleBlendMode?: LayerBlendMode;
  animated: boolean;
  frames: FxInjectionFrame[];
  recipe: EditableFxRecipe;
}

interface FxStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'generator' | 'lab' | 'library' | FxStudioWorkspaceTab;
  initialRecipe?: EditableFxRecipe | null;
  canvasWidth: number;
  canvasHeight: number;
  activePaletteColors: string[];
  activeCanvasGrid?: (string | null)[][] | null;
  activeCanvasLayerName?: string;
  onInjectResult: (payload: FxInjectionPayload) => void;
  onShowToast?: (msg: string) => void;
  performanceMode?: PerformanceMode;
}

const BLEND_OPTIONS: { value: LayerBlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal (Sólido)' },
  { value: 'screen', label: 'Pantalla (Brillo)' },
  { value: 'color-dodge', label: 'Sobreexponer (Neón)' },
  { value: 'lighten', label: 'Aclarar' },
  { value: 'overlay', label: 'Superponer' },
  { value: 'multiply', label: 'Multiplicar' },
];

const WORKSPACE_TABS: {
  id: FxStudioWorkspaceTab;
  label: string;
  icon: React.ReactNode;
  accent?: string;
}[] = [
  { id: 'examples', label: 'Ejemplos & Fighting FX', icon: <BookOpen className="w-3.5 h-3.5" />, accent: 'text-amber-300' },
  { id: 'builder', label: 'Constructor FX', icon: <Layers className="w-3.5 h-3.5" /> },
  { id: 'base', label: 'FX Base', icon: <Shapes className="w-3.5 h-3.5" /> },
  { id: 'aura', label: 'Auras', icon: <Flame className="w-3.5 h-3.5" /> },
  { id: 'deformers', label: 'Morfología & Deformadores', icon: <Activity className="w-3.5 h-3.5" /> },
  { id: 'editor', label: 'Efectos Libres', icon: <SlidersHorizontal className="w-3.5 h-3.5" /> },
  { id: 'particles', label: 'Partículas', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'rocks', label: 'Rocas y Púas', icon: <Mountain className="w-3.5 h-3.5" /> },
  { id: 'smears', label: 'Smears', icon: <Wind className="w-3.5 h-3.5" /> },
  { id: 'fluids', label: 'Fluidos', icon: <Droplets className="w-3.5 h-3.5" /> },
  { id: 'materials', label: 'Materiales', icon: <Palette className="w-3.5 h-3.5" /> },
  { id: 'import', label: 'Importar FX', icon: <ImagePlus className="w-3.5 h-3.5" /> },
  { id: 'library', label: 'Biblioteca FX', icon: <FolderHeart className="w-3.5 h-3.5" /> },
  { id: 'ai', label: 'IA FX (Opcional)', icon: <Wand2 className="w-3.5 h-3.5" />, accent: 'text-purple-300' },
];

type ProceduralSourceTab = 'builder' | 'aura' | 'editor' | 'particles' | 'rocks' | 'smears' | 'fluids';

function isProceduralTab(tab: FxStudioWorkspaceTab): tab is ProceduralSourceTab {
  return (
    tab === 'builder' ||
    tab === 'aura' ||
    tab === 'editor' ||
    tab === 'particles' ||
    tab === 'rocks' ||
    tab === 'smears' ||
    tab === 'fluids'
  );
}

function mapInitialTab(
  tab?: 'generator' | 'lab' | 'library' | FxStudioWorkspaceTab
): FxStudioWorkspaceTab {
  if (!tab) return 'builder';
  if (tab === 'generator') return 'editor';
  if (tab === 'lab') return 'builder';
  return tab;
}

function guessComponentLibCategory(mod: FxLabModule): FxComponentLibraryCategory {
  if (mod.type === 'ground_spikes' || mod.layerRole === 'rocks') return 'rocks';
  if (mod.type === 'dust_cloud') return 'dust';
  if (mod.type === 'sparks' || mod.type === 'lightning') return 'sparks';
  if (mod.type === 'smoke') return 'smoke';
  if (mod.type === 'aura_shell' || mod.type === 'wind_streams') return 'auras';
  if (mod.type === 'waves' || mod.type === 'distortion') return 'waves';
  if (mod.type === 'smear') return 'smears';
  if (mod.type === 'fluid') return 'fluids';
  return 'fragments';
}

export const FxStudioModal: React.FC<FxStudioModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'builder',
  initialRecipe = null,
  canvasWidth,
  canvasHeight,
  activePaletteColors,
  activeCanvasGrid = null,
  activeCanvasLayerName = 'Capa Actual',
  onInjectResult,
  onShowToast,
  performanceMode = 'balanced',
}) => {
  const [activeTab, setActiveTab] = useState<FxStudioWorkspaceTab>(mapInitialTab(initialTab));
  const [lastProceduralSource, setLastProceduralSource] = useState<ProceduralSourceTab>('builder');
  const [effectName, setEffectName] = useState<string>('Explosión Modular FX');
  const [effectOrigin, setEffectOrigin] = useState<FxOriginTag>('manual');
  const [outputLayerMode, setOutputLayerMode] = useState<FxLayerOutputMode>('per_component');
  const [singleBlendMode, setSingleBlendMode] = useState<LayerBlendMode>('normal');
  const [sequenceFrameCount, setSequenceFrameCount] = useState<number>(8);

  // Learning mode + active anatomy note
  const [learningMode, setLearningMode] = useState<boolean>(false);
  const [activeLearningExample, setActiveLearningExample] = useState<FxExampleEntry | null>(null);

  // Visualizer controls (Dark / Light / Transparent Checkerboard / Custom Color)
  const [backdropMode, setBackdropMode] = useState<FxVisualizerBackdrop>('dark');
  const [customBackdropColor, setCustomBackdropColor] = useState<string>('#1e293b');
  const [previewZoom, setPreviewZoom] = useState<'fit' | '2x' | '4x'>('fit');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [previewFps, setPreviewFps] = useState<number>(10);
  const [previewFrameIdx, setPreviewFrameIdx] = useState<number>(0);

  // 1. Library & Reusable Components Library state
  const [libraryPresets, setLibraryPresets] = useState<FxLibraryPreset[]>(() => loadFxLibraryV2());
  const [librarySearch, setLibrarySearch] = useState<string>('');
  const [libraryOriginFilter, setLibraryOriginFilter] = useState<FxOriginTag | 'all'>('all');
  const [componentLibrary, setComponentLibrary] = useState<FxComponentLibraryItem[]>(() =>
    loadFxComponentLibrary()
  );
  const [componentLibFilter, setComponentLibFilter] = useState<'all' | FxComponentLibraryCategory>('all');

  // 2. Modular Builder & Combiner state
  const [labModules, setLabModules] = useState<FxLabModule[]>(() => FX_MODULAR_PRESETS[0].modules);
  const [selectedModuleId, setSelectedModuleId] = useState<string>(FX_MODULAR_PRESETS[0].modules[0]?.id || '');
  const [combineTypeA, setCombineTypeA] = useState<FxEffectType>('fire');
  const [combineTypeB, setCombineTypeB] = useState<FxEffectType>('electricity');
  const [combineIncludeSmoke, setCombineIncludeSmoke] = useState<boolean>(true);

  // 2B. FX Base Guide + Global Morphology + 9 Deformers + Specialized Aura state
  const [baseGuide, setBaseGuide] = useState<FxBaseGuideConfig>(DEFAULT_FX_BASE_GUIDE);
  const [morphology, setMorphology] = useState<FxMorphologyConfig>(DEFAULT_FX_MORPHOLOGY);
  const [deformers, setDeformers] = useState<FxDeformerConfig>(DEFAULT_FX_DEFORMERS);
  const [auraConfig, setAuraConfig] = useState<FxAuraConfig>(DEFAULT_AURA_CONFIG);

  // 3. Procedural Free FX Editor state (28 effect types)
  const [genConfig, setGenConfig] = useState<FxGeneratorConfig>(DEFAULT_FX_GENERATOR_CONFIG);

  // 4. Particles state (10 templates)
  const [particleConfig, setParticleConfig] = useState<FxParticleEmitterConfig>(DEFAULT_PARTICLE_CONFIG);

  // 5. Rocks, Debris, Earth Spikes & Clusters state
  const [rockPieces, setRockPieces] = useState<FxRockPiece[]>(DEFAULT_ROCK_PIECES);
  const [rockClusters, setRockClusters] = useState<FxRockCluster[]>(DEFAULT_ROCK_CLUSTERS);
  const [selectedPieceId, setSelectedPieceId] = useState<string>(DEFAULT_ROCK_PIECES[0]?.id || '');
  const [selectedClusterId, setSelectedClusterId] = useState<string>(DEFAULT_ROCK_CLUSTERS[0]?.id || '');
  const [earthSpikesParams, setEarthSpikesParams] = useState({
    spikeCount: 4,
    heightScale: 105,
    widthScale: 100,
    emergeSpeed: 72,
    curvature: 20,
  });

  // 6. Smears state
  const [smearConfig, setSmearConfig] = useState<FxSmearConfig>(DEFAULT_SMEAR_CONFIG);

  // 7. Real-Time Fluid Lab state
  const [fluidConfig, setFluidConfig] = useState<FxFluidConfig>(DEFAULT_FLUID_CONFIG);
  const [fluidLiveRunning, setFluidLiveRunning] = useState<boolean>(true);
  const [fluidLiveGrid, setFluidLiveGrid] = useState<(string | null)[][]>(() =>
    createBlankFxGrid(canvasWidth, canvasHeight)
  );
  const fluidSimRef = useRef<FluidSimState | null>(null);

  // 8. Materials state
  const [materials, setMaterials] = useState<FxMaterialProfile[]>(DEFAULT_FX_MATERIALS);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(DEFAULT_FX_MATERIALS[0].id);

  // 9. External Import FX state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importCols, setImportCols] = useState<number>(1);
  const [importRows, setImportRows] = useState<number>(1);
  const [importCropTop, setImportCropTop] = useState<number>(0);
  const [importCropRight, setImportCropRight] = useState<number>(0);
  const [importCropBottom, setImportCropBottom] = useState<number>(0);
  const [importCropLeft, setImportCropLeft] = useState<number>(0);
  const [importRecolorPalette, setImportRecolorPalette] = useState<[string, string, string, string]>([
    '#ffffff',
    '#fde047',
    '#f97316',
    '#450a0a',
  ]);
  const [importAnimMode, setImportAnimMode] = useState<StaticFxAnimMode>('pulse');

  // 10. Optional Guided AI FX Assistant state
  const [guidedAiForm, setGuidedAiForm] = useState<GuidedAiFormState>({
    effectType: 'ki',
    detailLevel: 'medium',
    visualStyle: 'cps2',
    resolution: canvasWidth,
    animated: true,
    frameCount: 8,
    particleAmount: 'medium',
    complexity: 'medium',
    prompt: '',
  });
  const [isAiBusy, setIsAiBusy] = useState<boolean>(false);
  const [aiStatusMsg, setAiStatusMsg] = useState<string | null>(null);

  // Frame-by-Frame Editable Frames Override (used when user enables Frame-by-Frame, imports, bakes fluids, loads canvas layer, or runs AI)
  const [frameByFrameActive, setFrameByFrameActive] = useState<boolean>(false);
  const [editableFrames, setEditableFrames] = useState<(string | null)[][][] | null>(null);
  const [paintTool, setPaintTool] = useState<'pencil' | 'eraser' | 'eyedropper'>('pencil');
  const [paintColor, setPaintColor] = useState<string>('#fde047');
  const [paintSize, setPaintSize] = useState<number>(1);
  const isPaintingRef = useRef<boolean>(false);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const importPresetInputRef = useRef<HTMLInputElement>(null);
  const importImageInputRef = useRef<HTMLInputElement>(null);

  // Sync on open
  useEffect(() => {
    if (!isOpen) return;
    const mapped = mapInitialTab(initialTab);
    setActiveTab(mapped);
    if (isProceduralTab(mapped)) setLastProceduralSource(mapped);
    setLibraryPresets(loadFxLibraryV2());
    setComponentLibrary(loadFxComponentLibrary());
    setPreviewFrameIdx(0);
    setGuidedAiForm((prev) => ({ ...prev, resolution: canvasWidth }));
    setAiStatusMsg(null);
    if (initialRecipe) {
      loadRecipeIntoWorkspace(initialRecipe);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialTab, initialRecipe]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const loadRecipeIntoWorkspace = useCallback(
    (rec: EditableFxRecipe, stayOnCurrentTab: boolean = false) => {
      setEffectName(rec.name || 'Efecto FX');
      setEffectOrigin(rec.origin || 'preset');
      setPreviewFrameIdx(0);
      setBaseGuide(rec.baseGuide ? { ...DEFAULT_FX_BASE_GUIDE, ...rec.baseGuide } : DEFAULT_FX_BASE_GUIDE);
      setMorphology(rec.morphology ? { ...DEFAULT_FX_MORPHOLOGY, ...rec.morphology } : DEFAULT_FX_MORPHOLOGY);
      setDeformers(rec.deformers ? { ...DEFAULT_FX_DEFORMERS, ...rec.deformers } : DEFAULT_FX_DEFORMERS);

      if (rec.customFrames && rec.customFrames.length > 0) {
        setEditableFrames(rec.customFrames.map((f) => resizeFxGridNearest(f, canvasWidth, canvasHeight)));
        setFrameByFrameActive(true);
        setSequenceFrameCount(rec.customFrames.length);
        if (!stayOnCurrentTab) setActiveTab(rec.source === 'imported' ? 'import' : 'editor');
        return;
      }

      setEditableFrames(null);
      setFrameByFrameActive(false);

      if (rec.source === 'aura' && rec.auraConfig) {
        setAuraConfig(rec.auraConfig);
        setSequenceFrameCount(rec.labFrameCount || 8);
        setOutputLayerMode(rec.labLayerMode || 'per_component');
        setSingleBlendMode(rec.auraConfig.showCoreEnergy ? 'screen' : 'normal');
        setLastProceduralSource('aura');
        if (!stayOnCurrentTab) setActiveTab('aura');
      } else if (rec.source === 'lab' && rec.labModules) {
        setLabModules(rec.labModules.map((m) => ({ ...m })));
        setSelectedModuleId(rec.labModules[0]?.id || '');
        setSequenceFrameCount(rec.labFrameCount || 8);
        setOutputLayerMode(rec.labLayerMode || 'per_component');
        setSingleBlendMode('normal');
        setLastProceduralSource('builder');
        if (!stayOnCurrentTab) setActiveTab('builder');
      } else if (rec.source === 'particles' && rec.particleConfig) {
        setParticleConfig(rec.particleConfig);
        setSequenceFrameCount(rec.labFrameCount || 8);
        setSingleBlendMode('screen');
        setLastProceduralSource('particles');
        if (!stayOnCurrentTab) setActiveTab('particles');
      } else if (rec.source === 'rocks' && rec.rockPieces) {
        setRockPieces(rec.rockPieces.map((p) => ({ ...p })));
        setRockClusters((rec.rockClusters || DEFAULT_ROCK_CLUSTERS).map((c) => ({ ...c })));
        setSelectedPieceId(rec.rockPieces[0]?.id || '');
        setSelectedClusterId((rec.rockClusters || DEFAULT_ROCK_CLUSTERS)[0]?.id || '');
        setSequenceFrameCount(rec.labFrameCount || 6);
        setSingleBlendMode('normal');
        setLastProceduralSource('rocks');
        if (!stayOnCurrentTab) setActiveTab('rocks');
      } else if (rec.source === 'smears' && rec.smearConfig) {
        setSmearConfig(rec.smearConfig);
        setSequenceFrameCount(rec.labFrameCount || 6);
        setSingleBlendMode('screen');
        setLastProceduralSource('smears');
        if (!stayOnCurrentTab) setActiveTab('smears');
      } else if (rec.source === 'fluids' && rec.fluidConfig) {
        setFluidConfig(rec.fluidConfig);
        setSequenceFrameCount(rec.labFrameCount || 8);
        setSingleBlendMode('normal');
        setLastProceduralSource('fluids');
        if (!stayOnCurrentTab) setActiveTab('fluids');
      } else if (rec.generatorConfig) {
        setGenConfig(rec.generatorConfig);
        setSequenceFrameCount(rec.generatorConfig.frameCount || 8);
        setOutputLayerMode(rec.generatorConfig.layerMode || 'per_component');
        setSingleBlendMode(
          rec.generatorConfig.effectType === 'smoke' ||
            rec.generatorConfig.effectType === 'earth' ||
            rec.generatorConfig.effectType === 'rocks_fx' ||
            rec.generatorConfig.effectType === 'debris_fx'
            ? 'normal'
            : 'screen'
        );
        setLastProceduralSource('editor');
        if (!stayOnCurrentTab) setActiveTab('editor');
      }
    },
    [canvasWidth, canvasHeight]
  );

  // =========================================================
  // REAL-TIME FLUID SIMULATION LOOP (WHEN IN FLUIDS TAB)
  // =========================================================
  const effectiveSource: ProceduralSourceTab = isProceduralTab(activeTab)
    ? activeTab
    : lastProceduralSource;

  useEffect(() => {
    if (!isOpen || effectiveSource !== 'fluids' || editableFrames) return;
    fluidSimRef.current = createFluidSimState(fluidConfig, canvasWidth, canvasHeight);
    setFluidLiveGrid(renderFluidStateToGrid(fluidSimRef.current, fluidConfig));
  }, [isOpen, effectiveSource, fluidConfig, canvasWidth, canvasHeight, editableFrames]);

  useEffect(() => {
    if (!isOpen || effectiveSource !== 'fluids' || !fluidLiveRunning || editableFrames) return;
    const baseMs = Math.max(45, Math.round(1000 / Math.max(4, previewFps)));
    const intervalMs = performanceMode === 'performance' ? Math.max(140, baseMs * 2) : baseMs;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      if (!fluidSimRef.current) {
        fluidSimRef.current = createFluidSimState(fluidConfig, canvasWidth, canvasHeight);
      }
      stepFluidSimulation(fluidSimRef.current, fluidConfig);
      setFluidLiveGrid(renderFluidStateToGrid(fluidSimRef.current, fluidConfig));
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [isOpen, effectiveSource, fluidLiveRunning, fluidConfig, previewFps, canvasWidth, canvasHeight, editableFrames, performanceMode]);

  // =========================================================
  // PROCEDURAL PREVIEW SYNTHESIS (LAZY: ONLY RUNS ACTIVE TAB WHEN MODAL IS OPEN!)
  // =========================================================
  const builderSynth = useMemo(
    () =>
      isOpen && effectiveSource === 'builder'
        ? synthesizeEnhancedLabFrames(labModules, sequenceFrameCount, canvasWidth, canvasHeight)
        : [],
    [isOpen, effectiveSource, labModules, sequenceFrameCount, canvasWidth, canvasHeight]
  );

  const auraSynth = useMemo(
    () =>
      isOpen && effectiveSource === 'aura'
        ? synthesizeAuraFrames(auraConfig, sequenceFrameCount, canvasWidth, canvasHeight)
        : [],
    [isOpen, effectiveSource, auraConfig, sequenceFrameCount, canvasWidth, canvasHeight]
  );

  const editorSynth = useMemo(
    () =>
      isOpen && effectiveSource === 'editor'
        ? synthesizeFxFrames(
            { ...genConfig, frameCount: sequenceFrameCount, animated: sequenceFrameCount > 1 },
            canvasWidth,
            canvasHeight
          )
        : { frames: [], summary: '' },
    [isOpen, effectiveSource, genConfig, sequenceFrameCount, canvasWidth, canvasHeight]
  );

  const particleFrames = useMemo(
    () =>
      isOpen && effectiveSource === 'particles'
        ? synthesizeParticleFrames(particleConfig, sequenceFrameCount, canvasWidth, canvasHeight)
        : [],
    [isOpen, effectiveSource, particleConfig, sequenceFrameCount, canvasWidth, canvasHeight]
  );

  const rocksFrames = useMemo(
    () =>
      isOpen && effectiveSource === 'rocks'
        ? synthesizeRocksFrames(rockPieces, rockClusters, sequenceFrameCount, canvasWidth, canvasHeight)
        : [],
    [isOpen, effectiveSource, rockPieces, rockClusters, sequenceFrameCount, canvasWidth, canvasHeight]
  );

  const smearFrames = useMemo(
    () =>
      isOpen && effectiveSource === 'smears'
        ? synthesizeSmearFrames(smearConfig, sequenceFrameCount, canvasWidth, canvasHeight)
        : [],
    [isOpen, effectiveSource, smearConfig, sequenceFrameCount, canvasWidth, canvasHeight]
  );

  const baseGuideGrid = useMemo(
    () => (isOpen && baseGuide.enabled ? synthesizeFxBaseGuide(baseGuide, canvasWidth, canvasHeight) : null),
    [isOpen, baseGuide, canvasWidth, canvasHeight]
  );

  const morphActive = isMorphologyActive(morphology);
  const deformActive = isDeformersActive(deformers);

  const rawSequenceFrames: (string | null)[][][] = useMemo(() => {
    if (!isOpen) return [];
    if (editableFrames && editableFrames.length > 0) return editableFrames;
    if (effectiveSource === 'aura') return auraSynth.map((f) => f.merged);
    if (effectiveSource === 'builder') return builderSynth.map((f) => f.merged);
    if (effectiveSource === 'particles') return particleFrames;
    if (effectiveSource === 'rocks') return rocksFrames;
    if (effectiveSource === 'smears') return smearFrames;
    if (effectiveSource === 'fluids') return [fluidLiveGrid];
    return editorSynth.frames.map((f) => f.merged);
  }, [
    isOpen,
    editableFrames,
    effectiveSource,
    auraSynth,
    builderSynth,
    particleFrames,
    rocksFrames,
    smearFrames,
    fluidLiveGrid,
    editorSynth,
  ]);

  const activeSequenceFrames: (string | null)[][][] = useMemo(() => {
    if (!isOpen) return [];
    if (!morphActive && !deformActive) return rawSequenceFrames;
    const total = Math.max(1, rawSequenceFrames.length);
    return rawSequenceFrames.map((grid, idx) =>
      applyMorphologyAndDeformersToGrid(grid, morphology, deformers, idx / total)
    );
  }, [isOpen, rawSequenceFrames, morphActive, deformActive, morphology, deformers]);

  const totalPreviewFrames = Math.max(1, activeSequenceFrames.length);
  const safeFrameIdx = Math.min(previewFrameIdx, totalPreviewFrames - 1);
  const currentPreviewGrid = !isOpen
    ? []
    : effectiveSource === 'fluids' && !editableFrames
    ? activeSequenceFrames[0] || fluidLiveGrid
    : activeSequenceFrames[safeFrameIdx] || createBlankFxGrid(canvasWidth, canvasHeight);

  // Playback timer for non-live sequences
  useEffect(() => {
    if (!isOpen || !isPlaying || totalPreviewFrames <= 1) return;
    if (effectiveSource === 'fluids' && !editableFrames) return;
    if (frameByFrameActive) return; // Pause playback automatically while painting frame-by-frame
    const baseMs = Math.max(40, Math.round(1000 / Math.max(1, previewFps)));
    const ms = performanceMode === 'performance' ? Math.max(140, baseMs * 1.8) : baseMs;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setPreviewFrameIdx((prev) => (prev + 1) % totalPreviewFrames);
    }, ms);
    return () => window.clearInterval(id);
  }, [isOpen, isPlaying, totalPreviewFrames, previewFps, effectiveSource, editableFrames, frameByFrameActive, performanceMode]);

  // Render preview canvas with chosen backdrop (Dark / Light / Checkerboard / Custom Color) + Optional FX Base Guide
  useEffect(() => {
    if (!isOpen) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale =
      previewZoom === '4x'
        ? 4
        : previewZoom === '2x'
        ? 2
        : Math.max(1, Math.min(8, Math.floor(240 / Math.max(canvasWidth, canvasHeight))));
    canvas.width = canvasWidth * scale;
    canvas.height = canvasHeight * scale;
    ctx.imageSmoothingEnabled = false;

    if (backdropMode === 'dark') {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (backdropMode === 'light') {
      ctx.fillStyle = '#eef2f7';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (backdropMode === 'custom') {
      ctx.fillStyle = customBackdropColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      // Transparent checkerboard
      const tile = Math.max(6, scale * 2);
      for (let y = 0; y < canvas.height; y += tile) {
        for (let x = 0; x < canvas.width; x += tile) {
          ctx.fillStyle = ((x / tile + y / tile) & 1) === 0 ? '#2b3344' : '#1b202d';
          ctx.fillRect(x, y, tile, tile);
        }
      }
    }

    // Draw solid base guide behind effect when solid (cached single drawImage)
    if (baseGuideGrid && !baseGuide.showAsOverlay) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        getCachedPixelGridCanvas(baseGuideGrid, canvasWidth, canvasHeight),
        0,
        0,
        canvasWidth * scale,
        canvasHeight * scale
      );
      ctx.restore();
    }

    // Draw effect pixels (cached single drawImage)
    if (currentPreviewGrid && currentPreviewGrid.length > 0) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        getCachedPixelGridCanvas(currentPreviewGrid, canvasWidth, canvasHeight),
        0,
        0,
        canvasWidth * scale,
        canvasHeight * scale
      );
    }

    // Draw hollow guide outline above effect when overlay mode enabled
    if (baseGuideGrid && baseGuide.showAsOverlay) {
      ctx.save();
      ctx.globalAlpha = 0.65;
      for (let y = 0; y < canvasHeight; y++) {
        const row = baseGuideGrid[y];
        if (!row) continue;
        for (let x = 0; x < canvasWidth; x++) {
          const c = row[x];
          if (c) {
            ctx.fillStyle = c;
            ctx.fillRect(x * scale, y * scale, scale, scale);
          }
        }
      }
      ctx.restore();
    }
  }, [
    isOpen,
    currentPreviewGrid,
    baseGuideGrid,
    baseGuide.showAsOverlay,
    canvasWidth,
    canvasHeight,
    backdropMode,
    customBackdropColor,
    previewZoom,
  ]);

  // =========================================================
  // FRAME-BY-FRAME DIRECT PIXEL EDITING HANDLERS
  // =========================================================
  const ensureEditableFrames = useCallback((): (string | null)[][][] => {
    if (editableFrames && editableFrames.length > 0) return editableFrames;
    const baked =
      effectiveSource === 'fluids'
        ? bakeFluidFrames(fluidConfig, sequenceFrameCount, canvasWidth, canvasHeight)
        : activeSequenceFrames.map((f) => cloneFxGrid(f));
    setEditableFrames(baked);
    setFrameByFrameActive(true);
    setIsPlaying(false);
    return baked;
  }, [editableFrames, effectiveSource, fluidConfig, sequenceFrameCount, canvasWidth, canvasHeight, activeSequenceFrames]);

  const applyPaintAtEvent = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!frameByFrameActive) return;
      const canvas = previewCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const px = Math.floor(((e.clientX - rect.left) / Math.max(1, rect.width)) * canvasWidth);
      const py = Math.floor(((e.clientY - rect.top) / Math.max(1, rect.height)) * canvasHeight);
      if (px < 0 || px >= canvasWidth || py < 0 || py >= canvasHeight) return;

      const baseFrames = ensureEditableFrames();
      const idx = Math.min(safeFrameIdx, baseFrames.length - 1);

      if (paintTool === 'eyedropper') {
        const picked = baseFrames[idx]?.[py]?.[px];
        if (picked) {
          setPaintColor(picked);
          setPaintTool('pencil');
        }
        return;
      }

      const nextColor = paintTool === 'eraser' ? null : paintColor;
      setEditableFrames((prev) => {
        const list = prev && prev.length > 0 ? prev : baseFrames;
        const target = Math.min(idx, list.length - 1);
        return list.map((g, i) => (i === target ? paintPixelBrushOnGrid(g, px, py, paintSize, nextColor) : g));
      });
      setEffectOrigin((prev) => (prev === 'preset' ? 'modified' : prev));
    },
    [frameByFrameActive, canvasWidth, canvasHeight, ensureEditableFrames, safeFrameIdx, paintTool, paintColor, paintSize]
  );

  const handleLoadActiveCanvasLayer = () => {
    if (!activeCanvasGrid) return;
    const resized = resizeFxGridNearest(activeCanvasGrid, canvasWidth, canvasHeight);
    setEditableFrames([resized]);
    setFrameByFrameActive(true);
    setIsPlaying(false);
    setPreviewFrameIdx(0);
    setEffectName(`FX · ${activeCanvasLayerName}`);
    setEffectOrigin('modified');
    setSingleBlendMode('normal');
    setActiveTab('editor');
    onShowToast?.(`Capa "${activeCanvasLayerName}" cargada en FX Lab para edición.`);
  };

  // =========================================================
  // MATERIALS APPLY TO CURRENT FX
  // =========================================================
  const selectedMaterial = useMemo(
    () => materials.find((m) => m.id === selectedMaterialId) || materials[0],
    [materials, selectedMaterialId]
  );

  const handleApplyMaterialToCurrentFx = () => {
    const base = ensureEditableFrames();
    const mapped = base.map((g) => applyMaterialToGrid(g, selectedMaterial));
    setEditableFrames(mapped);
    setSingleBlendMode(selectedMaterial.blendMode);
    setEffectOrigin('modified');
    onShowToast?.(`Material "${selectedMaterial.name}" aplicado a ${mapped.length} fotogramas.`);
  };

  // =========================================================
  // EXTERNAL IMAGE / SPRITESHEET IMPORT HANDLERS
  // =========================================================
  const handleRunExternalImport = async (fileOverride?: File) => {
    const targetFile = fileOverride || importFile;
    if (!targetFile) return;
    try {
      const frames = await importImageFileToFxFrames(targetFile, {
        cols: importCols,
        rows: importRows,
        cropTop: importCropTop,
        cropRight: importCropRight,
        cropBottom: importCropBottom,
        cropLeft: importCropLeft,
        targetW: canvasWidth,
        targetH: canvasHeight,
      });
      setEditableFrames(frames);
      setSequenceFrameCount(frames.length);
      setPreviewFrameIdx(0);
      setFrameByFrameActive(true);
      setIsPlaying(frames.length > 1);
      setEffectName(targetFile.name.replace(/\.[^.]+$/, ''));
      setEffectOrigin('imported');
      setSingleBlendMode('normal');
      onShowToast?.(`Importado "${targetFile.name}" (${frames.length} frames editables en FX Lab).`);
    } catch (err: any) {
      onShowToast?.(err?.message || 'Error al importar imagen externa.');
    }
  };

  // =========================================================
  // OPTIONAL GUIDED AI FX ASSISTANT (MODULAR RECIPE OR PIXEL FRAMES)
  // =========================================================
  const handleGenerateAiModularRecipe = async () => {
    setIsAiBusy(true);
    setAiStatusMsg(null);
    try {
      const res = await fetch('/api/ai/vfx-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: guidedAiForm.prompt.trim() || `${guidedAiForm.effectType} modular fx`,
          effectType: guidedAiForm.effectType,
          detailLevel: guidedAiForm.detailLevel,
          visualStyle: guidedAiForm.visualStyle,
          resolution: guidedAiForm.resolution,
          animated: guidedAiForm.animated,
          frameCount: guidedAiForm.animated ? guidedAiForm.frameCount : 1,
          particleAmount: guidedAiForm.particleAmount,
          complexity: guidedAiForm.complexity,
          palette: activePaletteColors.slice(0, 10),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Servicio IA no disponible en el servidor.');
      }

      if (!Array.isArray(data.modules) || data.modules.length === 0) {
        throw new Error('La IA no devolvió módulos válidos.');
      }

      const parsedModules: FxLabModule[] = data.modules.map((m: Partial<FxLabModule>, idx: number) => ({
        id: `ai-mod-${Date.now()}-${idx}`,
        name: m.name || `Capa IA ${idx + 1}`,
        type: m.type || 'glow',
        layerRole: m.layerRole || 'base',
        enabled: true,
        blendMode: m.blendMode || 'screen',
        colorCore: m.colorCore || '#ffffff',
        colorMid: m.colorMid || '#38bdf8',
        colorEdge: m.colorEdge || '#1d4ed8',
        scale: Number(m.scale) || 100,
        density: Number(m.density) || 70,
        intensity: Number(m.intensity) || 85,
        speed: Number(m.speed) || 105,
        opacity: Number(m.opacity) || 95,
        chaos: Number(m.chaos) || 40,
        angleDeg: Number(m.angleDeg) || 270,
        offsetX: Number(m.offsetX) || 0,
        offsetY: Number(m.offsetY) || 0,
        seed: Number(m.seed) || 1500 + idx * 131,
      }));

      setEditableFrames(null);
      setFrameByFrameActive(false);
      setLabModules(parsedModules);
      setSelectedModuleId(parsedModules[0].id);
      setSequenceFrameCount(guidedAiForm.animated ? guidedAiForm.frameCount : 1);
      if (data.morphology && typeof data.morphology === 'object') {
        setMorphology({ ...DEFAULT_FX_MORPHOLOGY, ...data.morphology });
      }
      if (data.deformers && typeof data.deformers === 'object') {
        setDeformers({ ...DEFAULT_FX_DEFORMERS, ...data.deformers });
      }
      setEffectName(data.name || `Receta IA · ${guidedAiForm.effectType}`);
      setEffectOrigin('ai');
      setLastProceduralSource('builder');
      setActiveTab('builder');
      setAiStatusMsg(
        `Receta Modular construida (${parsedModules.length} capas editables${data.summary ? `: ${data.summary}` : ''}).`
      );
      onShowToast?.(`Receta IA lista con ${parsedModules.length} capas en Constructor FX.`);
    } catch (err: any) {
      setAiStatusMsg(
        `IA opcional no disponible (${err?.message || 'sin clave en servidor'}). Todas las herramientas manuales y modulares siguen 100% activas.`
      );
    } finally {
      setIsAiBusy(false);
    }
  };

  const handleRunOptionalAiAssist = async (
    assistAction:
      | 'generate'
      | 'variations'
      | 'clean'
      | 'add_detail'
      | 'simplify'
      | 'adapt_style'
      | 'recolor'
      | 'animate'
  ) => {
    setIsAiBusy(true);
    setAiStatusMsg(null);
    try {
      const targetSize = Math.max(16, Math.min(128, guidedAiForm.resolution || canvasWidth));
      const srcPixels: { x: number; y: number; color: string }[] = [];
      if (assistAction !== 'generate' || baseGuideGrid) {
        const src = assistAction === 'generate' && baseGuideGrid ? baseGuideGrid : currentPreviewGrid;
        for (let y = 0; y < src.length; y++) {
          for (let x = 0; x < (src[y]?.length || 0); x++) {
            const c = src[y][x];
            if (c) srcPixels.push({ x, y, color: c });
          }
        }
      }

      const res = await fetch('/api/ai/vfx-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: guidedAiForm.prompt.trim() || `${guidedAiForm.effectType} pixel art vfx`,
          width: targetSize,
          height: targetSize,
          palette: activePaletteColors.slice(0, 12),
          effectType: guidedAiForm.effectType,
          detailLevel: guidedAiForm.detailLevel,
          visualStyle: guidedAiForm.visualStyle,
          modifiers: genConfig.modifiers,
          shape: genConfig.shape,
          direction: genConfig.direction,
          customAngleDeg: genConfig.customAngleDeg,
          frameCount: guidedAiForm.animated ? Math.max(1, Math.min(12, guidedAiForm.frameCount)) : 1,
          animated: guidedAiForm.animated,
          particleAmount: guidedAiForm.particleAmount,
          complexity: guidedAiForm.complexity === 'hybrid' ? 'complex' : guidedAiForm.complexity,
          assistAction,
          sourcePixels: srcPixels.slice(0, 220),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Servicio IA no disponible en el servidor.');
      }

      const rawFrames: { x: number; y: number; color: string }[][] =
        Array.isArray(data.frames) && data.frames.length > 0
          ? data.frames
          : Array.isArray(data.pixels)
          ? [data.pixels]
          : [];
      if (rawFrames.length === 0) {
        throw new Error('La IA no devolvió píxeles válidos.');
      }

      const parsedGrids = rawFrames.map((pts) => {
        const g = createBlankFxGrid(targetSize, targetSize);
        for (const p of pts) {
          const x = Math.round(Number(p.x));
          const y = Math.round(Number(p.y));
          if (x >= 0 && x < targetSize && y >= 0 && y < targetSize && typeof p.color === 'string') {
            g[y][x] = p.color;
          }
        }
        const resized = resizeFxGridNearest(g, canvasWidth, canvasHeight);
        return validateAndCleanAiPixelGrid(resized, 'vfx', {
          targetPalette: activePaletteColors,
          coherenceLevel: 'high',
        }).grid;
      });

      setEditableFrames(parsedGrids);
      setSequenceFrameCount(parsedGrids.length);
      setPreviewFrameIdx(0);
      setFrameByFrameActive(true);
      setEffectName(data.name || `${effectName} (IA)`);
      setEffectOrigin('ai');
      setAiStatusMsg(`Asistente IA completado (${parsedGrids.length} frames listos para edición manual).`);
      onShowToast?.(`IA FX completado: ${parsedGrids.length} frames editables.`);
    } catch (err: any) {
      setAiStatusMsg(
        `IA opcional no disponible (${err?.message || 'sin clave en servidor'}). Todas las herramientas de FX Lab siguen 100% activas sin IA.`
      );
    } finally {
      setIsAiBusy(false);
    }
  };

  // =========================================================
  // BUILD CURRENT RECIPE + SAVE TO LIBRARY + INJECT TO CANVAS
  // =========================================================
  const buildCurrentRecipe = (): EditableFxRecipe => {
    const id = `fx-${Date.now()}`;
    const sharedModifiers = {
      baseGuide: baseGuide.enabled ? baseGuide : undefined,
      morphology: morphActive ? morphology : undefined,
      deformers: deformActive ? deformers : undefined,
    };

    if (editableFrames && editableFrames.length > 0) {
      return {
        id,
        name: effectName.trim() || 'Efecto Editado FX',
        source: effectOrigin === 'imported' ? 'imported' : 'manual',
        origin: effectOrigin,
        createdAt: new Date().toISOString(),
        generatorConfig: genConfig,
        labFrameCount: editableFrames.length,
        labAnimated: editableFrames.length > 1,
        labLayerMode: outputLayerMode,
        customFrames: editableFrames,
        ...sharedModifiers,
      };
    }
    if (effectiveSource === 'aura') {
      return {
        id,
        name: effectName.trim() || 'Aura Personalizada FX',
        source: 'aura',
        origin: effectOrigin,
        createdAt: new Date().toISOString(),
        auraConfig,
        labAnimated: sequenceFrameCount > 1,
        labFrameCount: sequenceFrameCount,
        labLayerMode: outputLayerMode,
        ...sharedModifiers,
      };
    }
    if (effectiveSource === 'builder') {
      return {
        id,
        name: effectName.trim() || 'Efecto Modular FX',
        source: 'lab',
        origin: effectOrigin,
        createdAt: new Date().toISOString(),
        labModules,
        labAnimated: sequenceFrameCount > 1,
        labFrameCount: sequenceFrameCount,
        labLayerMode: outputLayerMode,
        ...sharedModifiers,
      };
    }
    if (effectiveSource === 'particles') {
      return {
        id,
        name: effectName.trim() || 'Partículas FX',
        source: 'particles',
        origin: effectOrigin,
        createdAt: new Date().toISOString(),
        particleConfig,
        labAnimated: sequenceFrameCount > 1,
        labFrameCount: sequenceFrameCount,
        ...sharedModifiers,
      };
    }
    if (effectiveSource === 'rocks') {
      return {
        id,
        name: effectName.trim() || 'Rocas y Púas FX',
        source: 'rocks',
        origin: effectOrigin,
        createdAt: new Date().toISOString(),
        rockPieces,
        rockClusters,
        labAnimated: sequenceFrameCount > 1,
        labFrameCount: sequenceFrameCount,
        ...sharedModifiers,
      };
    }
    if (effectiveSource === 'smears') {
      return {
        id,
        name: effectName.trim() || 'Smear FX',
        source: 'smears',
        origin: effectOrigin,
        createdAt: new Date().toISOString(),
        smearConfig,
        labAnimated: sequenceFrameCount > 1,
        labFrameCount: sequenceFrameCount,
        ...sharedModifiers,
      };
    }
    if (effectiveSource === 'fluids') {
      return {
        id,
        name: effectName.trim() || 'Fluido FX',
        source: 'fluids',
        origin: effectOrigin,
        createdAt: new Date().toISOString(),
        fluidConfig,
        labAnimated: sequenceFrameCount > 1,
        labFrameCount: sequenceFrameCount,
        ...sharedModifiers,
      };
    }
    return {
      id,
      name: effectName.trim() || 'Efecto Procedural FX',
      source: 'generator',
      origin: effectOrigin,
      createdAt: new Date().toISOString(),
      generatorConfig: { ...genConfig, frameCount: sequenceFrameCount, layerMode: outputLayerMode },
      ...sharedModifiers,
    };
  };

  const handleSaveToLibrary = () => {
    const rec = buildCurrentRecipe();
    const category: FxLibraryPreset['category'] =
      rec.source === 'lab'
        ? 'lab'
        : rec.source === 'aura'
        ? 'aura'
        : rec.source === 'particles'
        ? 'particles'
        : rec.source === 'rocks'
        ? 'rocks'
        : rec.source === 'smears'
        ? 'smears'
        : rec.source === 'fluids'
        ? 'fluids'
        : rec.source === 'imported'
        ? 'imported'
        : rec.source === 'manual'
        ? 'manual'
        : genConfig.effectType;

    const updated = saveFxLibraryV2({
      id: rec.id,
      name: rec.name,
      category,
      origin: rec.origin || effectOrigin,
      createdAt: rec.createdAt,
      recipe: rec,
    });
    setLibraryPresets(updated);
    onShowToast?.(`"${rec.name}" guardado en Biblioteca FX (${FX_ORIGIN_LABELS[rec.origin || effectOrigin].label}).`);
  };

  const handleApplyToCanvas = () => {
    const rec = buildCurrentRecipe();
    let payloadFrames: FxInjectionFrame[] = [];
    const applyDeform = (grid: (string | null)[][], idx: number, total: number) =>
      morphActive || deformActive
        ? applyMorphologyAndDeformersToGrid(grid, morphology, deformers, idx / Math.max(1, total))
        : grid;

    if (editableFrames && editableFrames.length > 0) {
      payloadFrames = editableFrames.map((grid, i) => {
        const sculpted = applyDeform(grid, i, editableFrames.length);
        return {
          merged: sculpted,
          components: outputLayerMode === 'per_component' ? splitGridIntoFxComponents(sculpted) : [],
        };
      });
    } else if (effectiveSource === 'aura') {
      payloadFrames = auraSynth.map((f, i) => ({
        merged: applyDeform(f.merged, i, auraSynth.length),
        components: f.components.map((l) => ({
          name: l.name,
          blendMode: l.blendMode,
          opacity: 1,
          colorTag: l.colorTag || '#f59e0b',
          pixels: applyDeform(l.pixels, i, auraSynth.length),
        })),
      }));
    } else if (effectiveSource === 'builder') {
      payloadFrames = builderSynth.map((f, i) => ({
        merged: applyDeform(f.merged, i, builderSynth.length),
        components: f.byModule.map((m) => ({
          name: m.name,
          blendMode: m.blendMode,
          opacity: 1,
          colorTag: '#22d3ee',
          pixels: applyDeform(m.pixels, i, builderSynth.length),
        })),
      }));
    } else if (effectiveSource === 'fluids') {
      const baked = bakeFluidFrames(fluidConfig, sequenceFrameCount, canvasWidth, canvasHeight);
      payloadFrames = baked.map((grid, i) => {
        const sculpted = applyDeform(grid, i, baked.length);
        return {
          merged: sculpted,
          components: outputLayerMode === 'per_component' ? splitGridIntoFxComponents(sculpted) : [],
        };
      });
    } else if (effectiveSource === 'particles' || effectiveSource === 'rocks' || effectiveSource === 'smears') {
      payloadFrames = activeSequenceFrames.map((grid) => ({
        merged: grid,
        components: outputLayerMode === 'per_component' ? splitGridIntoFxComponents(grid) : [],
      }));
    } else {
      payloadFrames = editorSynth.frames.map((f, i) => ({
        merged: applyDeform(f.merged, i, editorSynth.frames.length),
        components: [
          { name: 'Humo', blendMode: 'normal' as LayerBlendMode, colorTag: '#64748b', pixels: applyDeform(f.smoke, i, editorSynth.frames.length) },
          { name: 'Base', blendMode: 'normal' as LayerBlendMode, colorTag: '#f97316', pixels: applyDeform(f.base, i, editorSynth.frames.length) },
          { name: 'Brillo', blendMode: 'screen' as LayerBlendMode, colorTag: '#38bdf8', pixels: applyDeform(f.glow, i, editorSynth.frames.length) },
          { name: 'Chispas', blendMode: 'screen' as LayerBlendMode, colorTag: '#fde047', pixels: applyDeform(f.sparks, i, editorSynth.frames.length) },
        ].filter((c) => c.pixels.some((row) => row.some(Boolean))),
      }));
    }

    // Optionally include FX Base Guide layer in export
    if (baseGuide.enabled && baseGuide.includeInExport && baseGuideGrid) {
      payloadFrames = payloadFrames.map((pf) => {
        const mergedWithBase = cloneFxGrid(pf.merged);
        for (let y = 0; y < canvasHeight; y++) {
          for (let x = 0; x < canvasWidth; x++) {
            if (!mergedWithBase[y][x] && baseGuideGrid[y]?.[x]) {
              mergedWithBase[y][x] = baseGuideGrid[y][x];
            }
          }
        }
        return {
          merged: mergedWithBase,
          components: [
            {
              name: 'FX Base',
              blendMode: 'normal',
              opacity: 0.85,
              colorTag: baseGuide.guideColor,
              pixels: cloneFxGrid(baseGuideGrid),
            },
            ...pf.components,
          ],
        };
      });
    }

    onInjectResult({
      name: rec.name,
      layerMode: outputLayerMode,
      singleBlendMode,
      animated: payloadFrames.length > 1,
      frames: payloadFrames,
      recipe: rec,
    });
  };

  const handleExportPresetJson = (preset: FxLibraryPreset) => {
    const json = serializeFxPresetJson(preset.recipe);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${preset.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.pxfx.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportPresetJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rec = parseImportedFxPresetJson(String(reader.result || ''));
      if (!rec) {
        onShowToast?.('Archivo .pxfx.json inválido.');
        return;
      }
      const next = saveFxLibraryV2({
        id: rec.id,
        name: rec.name,
        category: 'imported',
        origin: 'imported',
        createdAt: rec.createdAt,
        recipe: { ...rec, origin: 'imported' },
      });
      setLibraryPresets(next);
      loadRecipeIntoWorkspace(rec);
      onShowToast?.(`Preset "${rec.name}" importado en Biblioteca FX.`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Filtered library list
  const filteredLibrary = useMemo(() => {
    const q = librarySearch.trim().toLowerCase();
    return libraryPresets.filter((p) => {
      const origin = p.origin || p.recipe.origin || 'preset';
      if (libraryOriginFilter !== 'all' && origin !== libraryOriginFilter) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || String(p.category).toLowerCase().includes(q);
    });
  }, [libraryPresets, librarySearch, libraryOriginFilter]);

  const selectedModule = useMemo(
    () => labModules.find((m) => m.id === selectedModuleId) || labModules[0] || null,
    [labModules, selectedModuleId]
  );

  const selectedPiece = useMemo(
    () => rockPieces.find((p) => p.id === selectedPieceId) || rockPieces[0] || null,
    [rockPieces, selectedPieceId]
  );

  const selectedCluster = useMemo(
    () => rockClusters.find((c) => c.id === selectedClusterId) || rockClusters[0] || null,
    [rockClusters, selectedClusterId]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[1340px] h-[94vh] rounded-2xl border border-[#2a3450] bg-[#10131e] text-slate-100 shadow-2xl flex flex-col overflow-hidden">
        {/* ===================================================== */}
        {/* HEADER                                                */}
        {/* ===================================================== */}
        <div className="px-4 py-2.5 border-b border-[#232b42] bg-[#141827] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/35 text-cyan-300 flex items-center justify-center shrink-0">
              <FlaskConical className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight truncate">
                  FX Lab · Constructor Completo de Efectos 2D
                </h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                  100% Manual + IA Opcional
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                  {canvasWidth}×{canvasHeight}px
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                28 efectos libres · FX Base · Auras (con o sin energía) · Morfología & 9 Deformadores · Púas de Tierra · 25 Ejemplos & Fighting FX
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('examples')}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'examples'
                  ? 'border-amber-400 bg-amber-400/20 text-amber-100'
                  : 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200'
              }`}
              title="Explorar 25 ejemplos interactivos, Fighting Game FX y tutoriales rápidos"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">¿Qué puedo crear?</span>
            </button>
            <button
              type="button"
              onClick={() => setLearningMode((v) => !v)}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                learningMode
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                  : 'border-[#2c3856] bg-[#181f33] hover:bg-[#222c47] text-slate-300'
              }`}
              title="Activa explicaciones en vivo de capas, deformadores y anatomía de efectos"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Aprendizaje: {learningMode ? 'ON' : 'OFF'}</span>
            </button>
            {activeCanvasGrid && (
              <button
                type="button"
                onClick={handleLoadActiveCanvasLayer}
                className="px-2.5 py-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 text-sky-200 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Cargar los píxeles de la capa actual del lienzo dentro de FX Lab para editarlos"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Cargar Capa</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ===================================================== */}
        {/* 14 WORKSPACE TABS                                     */}
        {/* ===================================================== */}
        <div className="px-3 pt-2 pb-0 border-b border-[#222a40] bg-[#121624] flex items-center gap-1 overflow-x-auto shrink-0">
          {WORKSPACE_TABS.map((tab) => {
            const active = activeTab === tab.id;
            const showActiveDot =
              (tab.id === 'base' && baseGuide.enabled) ||
              (tab.id === 'deformers' && (morphActive || deformActive));
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  if (isProceduralTab(tab.id)) {
                    setLastProceduralSource(tab.id);
                    if (!frameByFrameActive) setEditableFrames(null);
                  }
                }}
                className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-t-lg border-b-2 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'border-cyan-400 text-cyan-200 bg-[#1a2135]'
                    : `border-transparent ${tab.accent || 'text-slate-400'} hover:text-slate-100 hover:bg-white/5`
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {showActiveDot && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Activo en vista previa" />
                )}
              </button>
            );
          })}
        </div>

        {/* ===================================================== */}
        {/* MAIN 2-PANE BODY: LEFT VISUALIZER + RIGHT WORKSPACE   */}
        {/* ===================================================== */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* LEFT: DEDICATED FX VISUALIZER + FRAME-BY-FRAME CANVAS */}
          <div className="w-full lg:w-[370px] xl:w-[400px] border-b lg:border-b-0 lg:border-r border-[#222a40] bg-[#0d1019] p-3 flex flex-col gap-2.5 shrink-0 overflow-y-auto">
            {/* Visualizer Backdrop Selector */}
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Visualizador FX
              </span>
              <div className="flex items-center gap-1">
                {(
                  [
                    ['dark', 'Oscuro'],
                    ['light', 'Claro'],
                    ['checker', 'Transp.'],
                    ['custom', 'Color'],
                  ] as [FxVisualizerBackdrop, string][]
                ).map(([mode, lbl]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setBackdropMode(mode)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${
                      backdropMode === mode
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                        : 'bg-[#171c2b] border-[#283148] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
                {backdropMode === 'custom' && (
                  <input
                    type="color"
                    value={customBackdropColor}
                    onChange={(e) => setCustomBackdropColor(e.target.value)}
                    title="Color personalizado de fondo del visualizador"
                    className="w-5 h-5 rounded border border-[#2c3650] bg-transparent cursor-pointer"
                  />
                )}
              </div>
            </div>

            {/* Canvas Stage */}
            <div
              className="relative rounded-xl border border-[#29334d] bg-[#080b12] flex items-center justify-center min-h-[246px] p-2 overflow-hidden select-none"
              onPointerUp={() => {
                isPaintingRef.current = false;
              }}
              onPointerLeave={() => {
                isPaintingRef.current = false;
              }}
            >
              <canvas
                ref={previewCanvasRef}
                onPointerDown={(e) => {
                  if (!frameByFrameActive) return;
                  isPaintingRef.current = true;
                  applyPaintAtEvent(e);
                }}
                onPointerMove={(e) => {
                  if (!frameByFrameActive || !isPaintingRef.current) return;
                  applyPaintAtEvent(e);
                }}
                className={`pixel-canvas max-w-full max-h-[240px] rounded border border-white/10 shadow-lg ${
                  frameByFrameActive ? 'cursor-crosshair' : ''
                }`}
              />

              {/* Mode + active modifiers badge overlay */}
              <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1">
                {editableFrames && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/25 border border-amber-400/50 text-amber-200 text-[9px] font-mono font-bold pointer-events-none">
                    {frameByFrameActive ? 'Frame-by-Frame Activo' : 'Frames Editables'}
                  </span>
                )}
                {effectiveSource === 'fluids' && !editableFrames && (
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/25 border border-cyan-400/50 text-cyan-200 text-[9px] font-mono font-bold pointer-events-none">
                    Simulación Tiempo Real
                  </span>
                )}
                {baseGuide.enabled && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('base')}
                    className="px-1.5 py-0.5 rounded bg-sky-500/25 border border-sky-400/60 text-sky-100 text-[9px] font-mono font-bold cursor-pointer"
                  >
                    FX Base ON
                  </button>
                )}
                {morphActive && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('deformers')}
                    className="px-1.5 py-0.5 rounded bg-cyan-500/25 border border-cyan-400/60 text-cyan-100 text-[9px] font-mono font-bold cursor-pointer"
                  >
                    Morfología ON
                  </button>
                )}
                {deformActive && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('deformers')}
                    className="px-1.5 py-0.5 rounded bg-purple-500/25 border border-purple-400/60 text-purple-100 text-[9px] font-mono font-bold cursor-pointer"
                  >
                    Deformadores ON
                  </button>
                )}
              </div>

              {/* Zoom selector */}
              <div className="absolute bottom-2 right-2 flex items-center gap-0.5 bg-black/65 rounded-md p-0.5 border border-white/10">
                {(['fit', '2x', '4x'] as const).map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setPreviewZoom(z)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono cursor-pointer ${
                      previewZoom === z ? 'bg-cyan-400 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {z === 'fit' ? 'Ajustar' : z}
                  </button>
                ))}
              </div>
            </div>

            {/* Playback + Frame Count Controls */}
            <div className="p-2.5 rounded-xl border border-[#222a40] bg-[#131826] flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {effectiveSource === 'fluids' && !editableFrames ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setFluidLiveRunning((v) => !v)}
                        className="px-2.5 py-1 rounded-md bg-cyan-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        {fluidLiveRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        <span>{fluidLiveRunning ? 'Pausar' : 'Simular'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          fluidSimRef.current = createFluidSimState(fluidConfig, canvasWidth, canvasHeight);
                          setFluidLiveGrid(renderFluidStateToGrid(fluidSimRef.current, fluidConfig));
                        }}
                        className="px-2 py-1 rounded-md border border-[#2c3650] bg-[#1a2033] text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer hover:bg-[#232b42]"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reiniciar</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (frameByFrameActive) setFrameByFrameActive(false);
                          setIsPlaying((v) => !v);
                        }}
                        className="px-2.5 py-1 rounded-md bg-cyan-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        {isPlaying && !frameByFrameActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        <span>{isPlaying && !frameByFrameActive ? 'Pausa' : 'Reproducir'}</span>
                      </button>
                      <span className="text-[11px] font-mono text-slate-300">
                        F{safeFrameIdx + 1}/{totalPreviewFrames}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-mono text-slate-400">Frames:</span>
                  {[1, 4, 6, 8, 12].map((fc) => (
                    <button
                      key={fc}
                      type="button"
                      onClick={() => {
                        setSequenceFrameCount(fc);
                        setGenConfig((p) => ({ ...p, frameCount: fc, animated: fc > 1 }));
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                        sequenceFrameCount === fc
                          ? 'bg-amber-400 text-slate-950 font-bold'
                          : 'bg-[#1a2033] text-slate-400 hover:text-white'
                      }`}
                    >
                      {fc}
                    </button>
                  ))}
                </div>
              </div>

              <StudioSlider
                variant="compact"
                label="Velocidad FPS"
                value={previewFps}
                min={2}
                max={24}
                step={1}
                unit="fps"
                onChange={setPreviewFps}
              />

              {/* Frame Strip Scrubber */}
              {totalPreviewFrames > 1 && (
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                  {activeSequenceFrames.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setIsPlaying(false);
                        setPreviewFrameIdx(idx);
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono shrink-0 border cursor-pointer ${
                        safeFrameIdx === idx
                          ? 'bg-cyan-400/20 border-cyan-400 text-cyan-200 font-bold'
                          : 'bg-[#171c2b] border-[#263048] text-slate-400 hover:text-slate-100'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Frame-by-Frame Pixel Painting Toolbar */}
            <div className="p-2.5 rounded-xl border border-[#242d45] bg-[#131826] flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-amber-300 flex items-center gap-1">
                  <Film className="w-3 h-3" />
                  <span>Modo Frame-by-Frame FX</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (!frameByFrameActive) {
                      ensureEditableFrames();
                    } else {
                      setFrameByFrameActive(false);
                    }
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                    frameByFrameActive
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-[#1c2336] text-slate-300 border border-[#2e3a57] hover:text-white'
                  }`}
                >
                  {frameByFrameActive ? 'Editando Píxeles ✓' : 'Activar Dibujo Manual'}
                </button>
              </div>

              {frameByFrameActive && (
                <>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setPaintTool('pencil')}
                      className={`px-2 py-1 rounded text-[10px] flex items-center gap-1 cursor-pointer ${
                        paintTool === 'pencil' ? 'bg-cyan-400 text-slate-950 font-bold' : 'bg-[#1c2336] text-slate-300'
                      }`}
                    >
                      <Pencil className="w-3 h-3" /> Lápiz
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaintTool('eraser')}
                      className={`px-2 py-1 rounded text-[10px] flex items-center gap-1 cursor-pointer ${
                        paintTool === 'eraser' ? 'bg-rose-400 text-slate-950 font-bold' : 'bg-[#1c2336] text-slate-300'
                      }`}
                    >
                      <Eraser className="w-3 h-3" /> Borrador
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaintTool('eyedropper')}
                      className={`px-2 py-1 rounded text-[10px] flex items-center gap-1 cursor-pointer ${
                        paintTool === 'eyedropper' ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-[#1c2336] text-slate-300'
                      }`}
                    >
                      <Pipette className="w-3 h-3" /> Gotero
                    </button>
                    <input
                      type="color"
                      value={paintColor}
                      onChange={(e) => setPaintColor(e.target.value)}
                      className="w-6 h-6 rounded border border-[#2e3a57] bg-transparent cursor-pointer"
                      title="Color de pincel FX"
                    />
                    <div className="flex items-center gap-0.5 ml-auto">
                      {[1, 2, 3, 5].map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setPaintSize(sz)}
                          className={`w-5 h-5 rounded text-[9px] font-mono cursor-pointer ${
                            paintSize === sz ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-[#1c2336] text-slate-400'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Frame Sequence Edit Actions */}
                  <div className="grid grid-cols-3 gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => {
                        const list = ensureEditableFrames();
                        const next = [...list];
                        next.splice(safeFrameIdx + 1, 0, createBlankFxGrid(canvasWidth, canvasHeight));
                        setEditableFrames(next);
                        setSequenceFrameCount(next.length);
                        setPreviewFrameIdx(safeFrameIdx + 1);
                      }}
                      className="px-1.5 py-1 rounded bg-[#1b2236] hover:bg-[#252f49] border border-[#2d3855] text-slate-200 cursor-pointer"
                    >
                      + Frame Blanco
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const list = ensureEditableFrames();
                        const next = [...list];
                        next.splice(safeFrameIdx + 1, 0, cloneFxGrid(list[safeFrameIdx]));
                        setEditableFrames(next);
                        setSequenceFrameCount(next.length);
                        setPreviewFrameIdx(safeFrameIdx + 1);
                      }}
                      className="px-1.5 py-1 rounded bg-[#1b2236] hover:bg-[#252f49] border border-[#2d3855] text-slate-200 cursor-pointer"
                    >
                      Duplicar Frame
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const list = ensureEditableFrames();
                        if (list.length < 2) return;
                        const nextIdx = (safeFrameIdx + 1) % list.length;
                        const mid = interpolateFxFrames(list[safeFrameIdx], list[nextIdx]);
                        const next = [...list];
                        next.splice(safeFrameIdx + 1, 0, mid);
                        setEditableFrames(next);
                        setSequenceFrameCount(next.length);
                        setPreviewFrameIdx(safeFrameIdx + 1);
                      }}
                      className="px-1.5 py-1 rounded bg-[#1b2236] hover:bg-[#252f49] border border-[#2d3855] text-cyan-200 cursor-pointer"
                    >
                      Interpolar →
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const list = ensureEditableFrames();
                        setEditableFrames(
                          list.map((g, i) => (i === safeFrameIdx ? createBlankFxGrid(canvasWidth, canvasHeight) : g))
                        );
                      }}
                      className="px-1.5 py-1 rounded bg-[#1b2236] hover:bg-[#252f49] border border-[#2d3855] text-slate-300 cursor-pointer"
                    >
                      Limpiar Frame
                    </button>
                    <button
                      type="button"
                      disabled={totalPreviewFrames <= 1}
                      onClick={() => {
                        const list = ensureEditableFrames();
                        if (list.length <= 1) return;
                        const next = list.filter((_, i) => i !== safeFrameIdx);
                        setEditableFrames(next);
                        setSequenceFrameCount(next.length);
                        setPreviewFrameIdx(Math.max(0, safeFrameIdx - 1));
                      }}
                      className="px-1.5 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-200 disabled:opacity-40 cursor-pointer"
                    >
                      Borrar Frame
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditableFrames(null);
                        setFrameByFrameActive(false);
                        setIsPlaying(true);
                      }}
                      className="px-1.5 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-200 cursor-pointer"
                    >
                      Volver a Vivo
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Active Learning Mode Guide Banner */}
            {learningMode && (
              <div className="p-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 flex flex-col gap-1.5 text-[10px]">
                <div className="flex items-center justify-between text-emerald-200 font-bold">
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Modo Aprendizaje Activo</span>
                  </span>
                  <span className="font-mono text-[9px] text-emerald-300/80 uppercase">
                    Fuente: {effectiveSource}
                  </span>
                </div>
                {activeLearningExample ? (
                  <div className="text-slate-200 space-y-1">
                    <div className="font-semibold text-amber-200">{activeLearningExample.name}</div>
                    <p className="text-slate-300 leading-snug">{activeLearningExample.howBuilt}</p>
                    <div className="text-[9px] text-cyan-200">
                      <strong>Qué ajustar primero:</strong> {activeLearningExample.keyParamsToTweak.join(' · ')}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-300 leading-snug">
                    Combina capas en <strong>Constructor FX</strong> (A + B + C), usa <strong>FX Base</strong> para guiar la silueta,
                    esculpe la forma en <strong>Morfología & Deformadores</strong> o abre cualquier ejemplo de <strong>¿Qué puedo crear?</strong> para estudiar su receta.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ===================================================== */}
          {/* RIGHT: 14-TAB WORKSPACE CONTENT                       */}
          {/* ===================================================== */}
          <div className="flex-1 min-w-0 overflow-y-auto p-4 flex flex-col gap-4 text-xs">
            {/* --------------------------------------------------- */}
            {/* TAB 0: EJEMPLOS FX + FIGHTING GAME FX + TUTORIALES  */}
            {/* --------------------------------------------------- */}
            {activeTab === 'examples' && (
              <FxExamplesGalleryPanel
                learningMode={learningMode}
                onToggleLearningMode={() => setLearningMode((v) => !v)}
                onSelectPreviewExample={(recipe) => {
                  loadRecipeIntoWorkspace(recipe, true);
                }}
                onOpenExample={(example, duplicateMode) => {
                  setActiveLearningExample(example);
                  const clonedRecipe: EditableFxRecipe = duplicateMode
                    ? {
                        ...example.recipe,
                        id: `fx-copy-${Date.now()}`,
                        name: `${example.name} (Mi Versión)`,
                        origin: 'modified',
                      }
                    : example.recipe;
                  loadRecipeIntoWorkspace(clonedRecipe, false);
                  onShowToast?.(
                    duplicateMode
                      ? `Duplicado "${example.name}" listo para modificar.`
                      : `Ejemplo "${example.name}" abierto en modo editable.`
                  );
                }}
              />
            )}

            {/* --------------------------------------------------- */}
            {/* TAB BASE: SISTEMA DE BASES (12 FX BASE GUIDES)      */}
            {/* --------------------------------------------------- */}
            {activeTab === 'base' && (
              <FxBaseGuidePanel
                baseGuide={baseGuide}
                onChange={setBaseGuide}
                onDrawOverBase={() => {
                  setBaseGuide((prev) => ({ ...prev, enabled: true, showAsOverlay: true }));
                  if (!editableFrames) {
                    setEditableFrames(
                      Array.from({ length: Math.max(1, sequenceFrameCount) }, () =>
                        createBlankFxGrid(canvasWidth, canvasHeight)
                      )
                    );
                  }
                  setFrameByFrameActive(true);
                  setIsPlaying(false);
                  onShowToast?.('Guía FX Base activa: dibuja directamente sobre el visualizador con el lápiz.');
                }}
                onBakeBaseToFrame={() => {
                  const baked = synthesizeFxBaseGuide({ ...baseGuide, enabled: true }, canvasWidth, canvasHeight);
                  setEditableFrames([baked]);
                  setSequenceFrameCount(1);
                  setPreviewFrameIdx(0);
                  setFrameByFrameActive(true);
                  setIsPlaying(false);
                  onShowToast?.('Silueta FX Base horneada a frame editable píxel a píxel.');
                }}
                onAddParticlesOverBase={() => {
                  setBaseGuide((prev) => ({ ...prev, enabled: true }));
                  setLastProceduralSource('builder');
                  setActiveTab('builder');
                  onShowToast?.('FX Base mantenida como guía visual dentro de Constructor FX.');
                }}
                onSendBaseToAi={() => {
                  setBaseGuide((prev) => ({ ...prev, enabled: true }));
                  setActiveTab('ai');
                  onShowToast?.('Guía FX Base conectada como referencia para el Asistente IA.');
                }}
              />
            )}

            {/* --------------------------------------------------- */}
            {/* TAB AURA: EDITOR ESPECIALIZADO DE AURAS             */}
            {/* --------------------------------------------------- */}
            {activeTab === 'aura' && (
              <FxAuraEditorPanel
                auraConfig={auraConfig}
                onChange={(next) => {
                  setEditableFrames(null);
                  setFrameByFrameActive(false);
                  setAuraConfig(next);
                  setLastProceduralSource('aura');
                  setEffectOrigin('manual');
                }}
              />
            )}

            {/* --------------------------------------------------- */}
            {/* TAB DEFORMERS: MORFOLOGÍA + 9 DEFORMADORES + VELOC. */}
            {/* --------------------------------------------------- */}
            {activeTab === 'deformers' && (
              <FxMorphologyDeformersPanel
                morphology={morphology}
                deformers={deformers}
                onChangeMorphology={setMorphology}
                onChangeDeformers={setDeformers}
              />
            )}
            {/* --------------------------------------------------- */}
            {/* TAB 1: BIBLIOTECA FX                                */}
            {/* --------------------------------------------------- */}
            {activeTab === 'library' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <div className="relative flex-1 max-w-xs">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={librarySearch}
                        onChange={(e) => setLibrarySearch(e.target.value)}
                        placeholder="Buscar efecto en Biblioteca FX..."
                        className="w-full h-8 pl-8 pr-2.5 rounded-lg bg-[#161b2c] border border-[#2a3450] text-xs outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                      {(['all', 'preset', 'manual', 'imported', 'ai', 'modified'] as const).map((orig) => (
                        <button
                          key={orig}
                          type="button"
                          onClick={() => setLibraryOriginFilter(orig)}
                          className={`px-2 py-1 rounded-md text-[10px] font-mono border cursor-pointer ${
                            libraryOriginFilter === orig
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                              : 'bg-[#151a2a] border-[#26304a] text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {orig === 'all' ? 'Todos' : FX_ORIGIN_LABELS[orig].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      ref={importPresetInputRef}
                      type="file"
                      accept=".json,.pxfx.json"
                      className="hidden"
                      onChange={handleImportPresetJsonFile}
                    />
                    <button
                      type="button"
                      onClick={() => importPresetInputRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-lg border border-[#2d3855] bg-[#181f33] hover:bg-[#222b44] text-[11px] flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Importar .pxfx.json</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                  {filteredLibrary.map((preset) => {
                    const orig = preset.origin || preset.recipe.origin || 'preset';
                    const badge = FX_ORIGIN_LABELS[orig];
                    return (
                      <div
                        key={preset.id}
                        className="p-3 rounded-xl border border-[#26304b] bg-[#151a2a] hover:border-cyan-400/60 transition-colors flex flex-col gap-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-bold text-slate-100 truncate">{preset.name}</div>
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                              {preset.category} · {preset.recipe.labFrameCount || preset.recipe.generatorConfig?.frameCount || preset.recipe.customFrames?.length || 1} frames
                            </div>
                          </div>
                          <span
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0"
                            style={{
                              color: badge.color,
                              borderColor: `${badge.color}55`,
                              backgroundColor: `${badge.color}18`,
                            }}
                          >
                            {badge.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 mt-auto pt-1">
                          <button
                            type="button"
                            onClick={() => loadRecipeIntoWorkspace(preset.recipe)}
                            className="flex-1 px-2.5 py-1 rounded-md bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-[11px] cursor-pointer"
                          >
                            Abrir / Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const dupId = `fx-dup-${Date.now()}`;
                              const next = saveFxLibraryV2({
                                ...preset,
                                id: dupId,
                                name: `${preset.name} (Copia)`,
                                origin: 'modified',
                                createdAt: new Date().toISOString(),
                                recipe: { ...preset.recipe, id: dupId, name: `${preset.name} (Copia)`, origin: 'modified' },
                              });
                              setLibraryPresets(next);
                            }}
                            title="Duplicar efecto"
                            className="p-1.5 rounded-md bg-[#1d2438] hover:bg-[#28324d] text-slate-300 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExportPresetJson(preset)}
                            title="Exportar .pxfx.json"
                            className="p-1.5 rounded-md bg-[#1d2438] hover:bg-[#28324d] text-sky-300 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setLibraryPresets(deleteFxLibraryV2(preset.id))}
                            title="Eliminar"
                            className="p-1.5 rounded-md bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* --------------------------------------------------- */}
            {/* TAB 2: CONSTRUCTOR FX (MODO CONSTRUCCIÓN + CAPAS FX)*/}
            {/* --------------------------------------------------- */}
            {activeTab === 'builder' && (
              <div className="flex flex-col gap-3.5">
                {/* Visual Formula Bar (A + B + C = Efecto) */}
                <div className="p-2.5 rounded-xl border border-cyan-500/35 bg-[#10182a] flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-mono uppercase font-bold text-cyan-300 mr-1">
                    Modo Construcción:
                  </span>
                  {labModules
                    .filter((m) => m.enabled)
                    .map((m, idx, arr) => {
                      const roleInfo = FX_LAYER_ROLES.find((r) => r.id === (m.layerRole || 'base'));
                      return (
                        <React.Fragment key={m.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedModuleId(m.id)}
                            className={`px-2 py-0.5 rounded border text-[10px] font-semibold flex items-center gap-1 cursor-pointer ${
                              selectedModule?.id === m.id
                                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100'
                                : 'border-[#2c3857] bg-[#162038] text-slate-200'
                            }`}
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: roleInfo?.color || '#22d3ee' }}
                            />
                            <span>{m.name}</span>
                          </button>
                          {idx < arr.length - 1 && <span className="text-amber-300 font-bold text-xs">+</span>}
                        </React.Fragment>
                      );
                    })}
                  <span className="text-emerald-300 font-bold text-xs mx-1">=</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 text-[10px] font-bold">
                    {effectName || 'Efecto Personalizado'}
                  </span>
                </div>

                {/* Explorador de 16 Componentes (1-Click Add to Current Effect) */}
                <div className="p-3 rounded-xl border border-[#25304a] bg-[#141929] flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-semibold">
                      Explorador de Componentes FX (16 Categorías · Clic para añadir capa)
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('deformers')}
                      className="text-[10px] text-purple-300 hover:text-purple-200 font-semibold cursor-pointer"
                    >
                      Esculpir Morfología / Deformadores →
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-1.5">
                    {FX_COMPONENT_EXPLORER.map((comp) => (
                      <button
                        key={comp.id}
                        type="button"
                        onClick={() => {
                          const nextMod = comp.createModule();
                          setEditableFrames(null);
                          setFrameByFrameActive(false);
                          setLabModules((prev) => [...prev, nextMod]);
                          setSelectedModuleId(nextMod.id);
                          setEffectOrigin('manual');
                          setLastProceduralSource('builder');
                        }}
                        title={comp.desc}
                        className="px-2 py-1.5 rounded-lg border border-[#293450] bg-[#171e32] hover:border-cyan-400/70 hover:bg-[#1e2842] text-left transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: comp.accent }}
                        />
                        <span className="text-[10px] font-semibold text-slate-200 truncate">{comp.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Effect Combiner (e.g. Fuego + Electricidad + Humo) */}
                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-amber-300">
                    Combinador Híbrido (A + B + Humo):
                  </span>
                  <select
                    value={combineTypeA}
                    onChange={(e) => setCombineTypeA(e.target.value as FxEffectType)}
                    className="h-7 px-2 rounded bg-[#161c2d] border border-[#2c3650] text-[11px]"
                  >
                    {FX_EFFECT_TYPES.map((e) => (
                      <option key={e.id} value={e.id}>{e.label}</option>
                    ))}
                  </select>
                  <span className="text-amber-300 font-bold">+</span>
                  <select
                    value={combineTypeB}
                    onChange={(e) => setCombineTypeB(e.target.value as FxEffectType)}
                    className="h-7 px-2 rounded bg-[#161c2d] border border-[#2c3650] text-[11px]"
                  >
                    {FX_EFFECT_TYPES.map((e) => (
                      <option key={e.id} value={e.id}>{e.label}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer ml-1">
                    <input
                      type="checkbox"
                      checked={combineIncludeSmoke}
                      onChange={(e) => setCombineIncludeSmoke(e.target.checked)}
                      className="accent-amber-400"
                    />
                    <span>+ Humo</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const nextMods = combineFxTypesIntoModules(combineTypeA, combineTypeB, combineIncludeSmoke);
                      setEditableFrames(null);
                      setFrameByFrameActive(false);
                      setLabModules(nextMods);
                      setSelectedModuleId(nextMods[0]?.id || '');
                      const la = FX_EFFECT_TYPES.find((x) => x.id === combineTypeA)?.label || combineTypeA;
                      const lb = FX_EFFECT_TYPES.find((x) => x.id === combineTypeB)?.label || combineTypeB;
                      setEffectName(`${la} + ${lb}${combineIncludeSmoke ? ' + Humo' : ''}`);
                      setEffectOrigin('manual');
                    }}
                    className="ml-auto px-3 py-1 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px] cursor-pointer"
                  >
                    Combinar Capas
                  </button>
                </div>

                {/* Active FX Layers Stack + Selected Module Inspector */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-5 flex flex-col gap-1.5">
                    <span className="text-[10px] font-mono uppercase text-slate-400">
                      Sistema de Capas FX ({labModules.length})
                    </span>
                    {labModules.map((mod) => {
                      const sel = selectedModule?.id === mod.id;
                      const roleMeta = FX_LAYER_ROLES.find((r) => r.id === (mod.layerRole || 'base'));
                      return (
                        <div
                          key={mod.id}
                          onClick={() => setSelectedModuleId(mod.id)}
                          className={`px-2.5 py-2 rounded-lg border flex items-center justify-between gap-2 cursor-pointer ${
                            sel
                              ? 'bg-cyan-500/15 border-cyan-400 text-cyan-100'
                              : 'bg-[#151a2a] border-[#26304a] text-slate-300 hover:bg-[#1a2135]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLabModules((prev) =>
                                  prev.map((m) => (m.id === mod.id ? { ...m, enabled: !m.enabled } : m))
                                );
                              }}
                              className="text-slate-400 hover:text-white cursor-pointer"
                            >
                              {mod.enabled ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-[11px] truncate">{mod.name}</span>
                                <span
                                  className="px-1 py-0.2 rounded text-[8px] font-mono border shrink-0"
                                  style={{
                                    color: roleMeta?.color || '#22d3ee',
                                    borderColor: `${roleMeta?.color || '#22d3ee'}55`,
                                    backgroundColor: `${roleMeta?.color || '#22d3ee'}18`,
                                  }}
                                >
                                  {roleMeta?.label || 'Base'}
                                </span>
                              </div>
                              <div className="text-[9px] font-mono text-slate-400">{mod.type} · {mod.blendMode}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const dup = { ...mod, id: `mod-dup-${Date.now()}`, name: `${mod.name} II`, seed: mod.seed + 77 };
                                setLabModules((prev) => [...prev, dup]);
                                setSelectedModuleId(dup.id);
                              }}
                              title="Duplicar capa FX"
                              className="p-1 rounded hover:bg-white/10 text-slate-400 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={labModules.length <= 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                setLabModules((prev) => prev.filter((m) => m.id !== mod.id));
                              }}
                              title="Eliminar capa FX"
                              className="p-1 rounded hover:bg-rose-500/20 text-rose-300 disabled:opacity-30 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Quick Module Types Strip */}
                    <div className="pt-1 flex flex-wrap gap-1">
                      {FX_LAB_MODULE_META_EXTENDED.slice(0, 8).map((meta) => (
                        <button
                          key={meta.type}
                          type="button"
                          onClick={() => {
                            const newMod: FxLabModule = {
                              id: `mod-${meta.type}-${Date.now()}`,
                              name: meta.label,
                              type: meta.type,
                              layerRole: 'base',
                              enabled: true,
                              blendMode: meta.defaultBlend,
                              colorCore: meta.defaultColors[0],
                              colorMid: meta.defaultColors[1],
                              colorEdge: meta.defaultColors[2],
                              scale: 100,
                              density: 70,
                              intensity: 85,
                              speed: 100,
                              opacity: 95,
                              chaos: 40,
                              angleDeg: 270,
                              offsetX: 0,
                              offsetY: 0,
                              seed: Math.floor(Math.random() * 99999),
                            };
                            setEditableFrames(null);
                            setLabModules((prev) => [...prev, newMod]);
                            setSelectedModuleId(newMod.id);
                          }}
                          className="px-1.5 py-0.5 rounded border border-[#2a3552] bg-[#151b2d] hover:border-cyan-400 text-[9px] text-slate-300 flex items-center gap-0.5 cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5 text-cyan-400" />
                          <span>{meta.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedModule && (
                    <div className="md:col-span-7 p-3 rounded-xl border border-[#26304a] bg-[#151a2a] flex flex-col gap-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] text-slate-400">Nombre capa FX</span>
                          <input
                            type="text"
                            value={selectedModule.name}
                            onChange={(e) =>
                              setLabModules((prev) =>
                                prev.map((m) => (m.id === selectedModule.id ? { ...m, name: e.target.value } : m))
                              )
                            }
                            className="h-7 px-2 rounded bg-[#101421] border border-[#2a3450] text-xs"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] text-slate-400">Rol de Capa FX</span>
                          <select
                            value={selectedModule.layerRole || 'base'}
                            onChange={(e) =>
                              setLabModules((prev) =>
                                prev.map((m) =>
                                  m.id === selectedModule.id ? { ...m, layerRole: e.target.value as FxLayerRole } : m
                                )
                              )
                            }
                            className="h-7 px-2 rounded bg-[#101421] border border-[#2a3450] text-xs"
                          >
                            {FX_LAYER_ROLES.map((r) => (
                              <option key={r.id} value={r.id}>{r.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] text-slate-400">Modo de fusión</span>
                          <select
                            value={selectedModule.blendMode}
                            onChange={(e) =>
                              setLabModules((prev) =>
                                prev.map((m) =>
                                  m.id === selectedModule.id ? { ...m, blendMode: e.target.value as LayerBlendMode } : m
                                )
                              )
                            }
                            className="h-7 px-2 rounded bg-[#101421] border border-[#2a3450] text-xs"
                          >
                            {BLEND_OPTIONS.map((b) => (
                              <option key={b.value} value={b.value}>{b.label}</option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-slate-400">Colores:</span>
                          {(
                            [
                              ['colorCore', 'Núcleo'],
                              ['colorMid', 'Medio'],
                              ['colorEdge', 'Borde'],
                            ] as const
                          ).map(([k, lbl]) => (
                            <label key={k} className="flex items-center gap-1 text-[10px]">
                              <input
                                type="color"
                                value={selectedModule[k]}
                                onChange={(e) =>
                                  setLabModules((prev) =>
                                    prev.map((m) => (m.id === selectedModule.id ? { ...m, [k]: e.target.value } : m))
                                  )
                                }
                                className="w-5 h-5 rounded cursor-pointer bg-transparent"
                              />
                              <span>{lbl}</span>
                            </label>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const saved = saveFxComponentLibrary({
                              id: `clib-${Date.now()}`,
                              name: selectedModule.name,
                              category: guessComponentLibCategory(selectedModule),
                              description: `Guardado desde ${effectName}`,
                              module: { ...selectedModule },
                              createdAt: new Date().toISOString(),
                            });
                            setComponentLibrary(saved);
                            onShowToast?.(`Componente "${selectedModule.name}" guardado en Biblioteca Reutilizable.`);
                          }}
                          className="px-2 py-1 rounded border border-emerald-500/45 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <PackagePlus className="w-3 h-3" />
                          <span>Guardar Componente</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(
                          [
                            ['scale', 'Escala', 15, 200, '%'],
                            ['density', 'Densidad', 10, 100, '%'],
                            ['intensity', 'Intensidad', 10, 100, '%'],
                            ['speed', 'Velocidad', 10, 200, '%'],
                            ['chaos', 'Caos', 0, 100, '%'],
                            ['angleDeg', 'Dirección', 0, 360, '°'],
                            ['offsetX', 'Posición X', -40, 40, '%'],
                            ['offsetY', 'Posición Y', -40, 40, '%'],
                          ] as const
                        ).map(([field, lbl, min, max, unit]) => (
                          <StudioSlider
                            key={field}
                            variant="compact"
                            label={lbl}
                            value={selectedModule[field]}
                            min={min}
                            max={max}
                            step={1}
                            unit={unit}
                            onChange={(v) =>
                              setLabModules((prev) =>
                                prev.map((m) => (m.id === selectedModule.id ? { ...m, [field]: v } : m))
                              )
                            }
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Biblioteca de Componentes Reutilizables (9 Categorías) */}
                <div className="p-3 rounded-xl border border-[#263250] bg-[#121726] flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 font-semibold">
                      Biblioteca de Componentes Reutilizables ({componentLibrary.length})
                    </span>
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setComponentLibFilter('all')}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono border cursor-pointer ${
                          componentLibFilter === 'all'
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100 font-bold'
                            : 'bg-[#171e32] border-[#293554] text-slate-400'
                        }`}
                      >
                        Todos
                      </button>
                      {FX_COMPONENT_LIB_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setComponentLibFilter(cat.id)}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono border cursor-pointer ${
                            componentLibFilter === cat.id
                              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100 font-bold'
                              : 'bg-[#171e32] border-[#293554] text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {componentLibrary
                      .filter((it) => componentLibFilter === 'all' || it.category === componentLibFilter)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="px-2 py-1.5 rounded-lg border border-[#26314c] bg-[#161c2e] flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-slate-100 truncate">{item.name}</div>
                            <div className="text-[9px] text-slate-400 truncate">{item.description}</div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                const inserted: FxLabModule = {
                                  ...item.module,
                                  id: `mod-lib-${Date.now()}`,
                                  seed: Math.floor(Math.random() * 99999),
                                };
                                setEditableFrames(null);
                                setFrameByFrameActive(false);
                                setLabModules((prev) => [...prev, inserted]);
                                setSelectedModuleId(inserted.id);
                                onShowToast?.(`Componente "${item.name}" insertado en el efecto actual.`);
                              }}
                              className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-100 text-[10px] font-bold cursor-pointer"
                            >
                              + Insertar
                            </button>
                            {!item.id.startsWith('clib-default-') && (
                              <button
                                type="button"
                                onClick={() => setComponentLibrary(deleteFxComponentLibrary(item.id))}
                                className="p-1 rounded hover:bg-rose-500/20 text-rose-300 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* 1-Click Modular Archetypes */}
                <div className="p-3 rounded-xl border border-[#25304a] bg-[#141929] flex flex-col gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                    Recetas Modulares Rápidas
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {FX_MODULAR_PRESETS.map((mp) => (
                      <button
                        key={mp.id}
                        type="button"
                        onClick={() => {
                          setEditableFrames(null);
                          setFrameByFrameActive(false);
                          setLabModules(mp.modules.map((m) => ({ ...m })));
                          setSelectedModuleId(mp.modules[0]?.id || '');
                          setEffectName(mp.name);
                          setEffectOrigin('manual');
                        }}
                        className="p-2 rounded-lg border border-[#293450] bg-[#181f33] hover:border-cyan-400/60 text-left cursor-pointer"
                      >
                        <div className="font-bold text-[11px] text-slate-100">{mp.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{mp.tagline}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* --------------------------------------------------- */}
            {/* TAB 3: EDITOR FX (17 EFECTOS + FRAME-BY-FRAME)      */}
            {/* --------------------------------------------------- */}
            {activeTab === 'editor' && (
              <div className="flex flex-col gap-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sistema de Efectos Libres ({FX_EFFECT_TYPES.length} tipos · Sin IA)</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setGenConfig((p) => ({ ...p, seed: Math.floor(Math.random() * 99999) }))
                      }
                      className="px-2.5 py-1 rounded-md bg-[#1a2236] border border-[#2d3855] hover:border-cyan-400 text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Shuffle className="w-3 h-3 text-cyan-400" /> Nueva Semilla
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        ensureEditableFrames();
                        onShowToast?.('Convertido a frames editables para dibujo manual píxel a píxel.');
                      }}
                      className="px-2.5 py-1 rounded-md bg-amber-400/15 border border-amber-400/40 text-amber-200 hover:bg-amber-400/25 text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Paintbrush className="w-3 h-3" /> Editar Píxel a Píxel
                    </button>
                  </div>
                </div>

                {/* 17 Effect Types Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {FX_EFFECT_TYPES.map((ef) => (
                    <button
                      key={ef.id}
                      type="button"
                      onClick={() => {
                        setEditableFrames(null);
                        setFrameByFrameActive(false);
                        setGenConfig((p) => ({
                          ...p,
                          effectType: ef.id,
                          shape: ef.defaultShape,
                          direction: ef.defaultDirection,
                        }));
                        setEffectName(`FX ${ef.label}`);
                        setEffectOrigin('manual');
                      }}
                      className={`px-2 py-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
                        genConfig.effectType === ef.id
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100 font-bold'
                          : 'bg-[#151a2a] border-[#26304a] text-slate-300 hover:bg-[#1b2236]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: ef.colors[1] }}
                        />
                        <span className="truncate text-[11px]">{ef.label}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Style, Detail, Shape, Direction */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400">Estilo Visual</span>
                    <select
                      value={genConfig.visualStyle}
                      onChange={(e) => setGenConfig((p) => ({ ...p, visualStyle: e.target.value as FxVisualStyle }))}
                      className="h-7 px-2 rounded bg-[#161c2d] border border-[#2c3650] text-[11px]"
                    >
                      {FX_VISUAL_STYLES.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400">Nivel de Detalle</span>
                    <select
                      value={genConfig.detailLevel}
                      onChange={(e) => setGenConfig((p) => ({ ...p, detailLevel: e.target.value as FxDetailLevel }))}
                      className="h-7 px-2 rounded bg-[#161c2d] border border-[#2c3650] text-[11px]"
                    >
                      {FX_DETAIL_LEVELS.map((d) => (
                        <option key={d.id} value={d.id}>{d.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400">Forma Geométrica</span>
                    <select
                      value={genConfig.shape}
                      onChange={(e) => setGenConfig((p) => ({ ...p, shape: e.target.value as FxShapeType }))}
                      className="h-7 px-2 rounded bg-[#161c2d] border border-[#2c3650] text-[11px]"
                    >
                      {FX_SHAPES.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400">Dirección</span>
                    <select
                      value={genConfig.direction}
                      onChange={(e) => setGenConfig((p) => ({ ...p, direction: e.target.value as FxDirectionType }))}
                      className="h-7 px-2 rounded bg-[#161c2d] border border-[#2c3650] text-[11px]"
                    >
                      {FX_DIRECTIONS.map((d) => (
                        <option key={d.id} value={d.id}>{d.label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* Custom Colors Toggle */}
                <div className="p-2.5 rounded-xl border border-[#26304a] bg-[#151a2a] flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(genConfig.useCustomColors)}
                      onChange={(e) => setGenConfig((p) => ({ ...p, useCustomColors: e.target.checked }))}
                      className="accent-cyan-400"
                    />
                    <span className="text-[11px]">Usar colores personalizados</span>
                  </label>
                  {genConfig.useCustomColors && (
                    <>
                      <label className="flex items-center gap-1 text-[10px]">
                        <input
                          type="color"
                          value={genConfig.customPrimaryColor || '#f97316'}
                          onChange={(e) => setGenConfig((p) => ({ ...p, customPrimaryColor: e.target.value }))}
                          className="w-5 h-5 cursor-pointer bg-transparent"
                        />
                        <span>Primario</span>
                      </label>
                      <label className="flex items-center gap-1 text-[10px]">
                        <input
                          type="color"
                          value={genConfig.customSecondaryColor || '#fde047'}
                          onChange={(e) => setGenConfig((p) => ({ ...p, customSecondaryColor: e.target.value }))}
                          className="w-5 h-5 cursor-pointer bg-transparent"
                        />
                        <span>Secundario</span>
                      </label>
                    </>
                  )}
                </div>

                {/* Modifiers */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl border border-[#26304a] bg-[#151a2a]">
                  {(
                    [
                      ['intensity', 'Intensidad', 10, 100, '%'],
                      ['scale', 'Escala', 20, 190, '%'],
                      ['density', 'Densidad', 10, 100, '%'],
                      ['brightness', 'Brillo', 40, 150, '%'],
                      ['saturation', 'Saturación', 0, 150, '%'],
                      ['opacity', 'Opacidad', 20, 100, '%'],
                      ['chaos', 'Caos', 0, 100, '%'],
                      ['visualSpeed', 'Velocidad', 20, 200, '%'],
                      ['length', 'Longitud', 30, 200, '%'],
                    ] as const
                  ).map(([k, lbl, min, max, unit]) => (
                    <StudioSlider
                      key={k}
                      variant="compact"
                      label={lbl}
                      value={genConfig.modifiers[k]}
                      min={min}
                      max={max}
                      step={1}
                      unit={unit}
                      onChange={(v) =>
                        setGenConfig((p) => ({ ...p, modifiers: { ...p.modifiers, [k]: v } }))
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {/* --------------------------------------------------- */}
            {/* TAB 4: PARTÍCULAS (10 PLANTILLAS)                   */}
            {/* --------------------------------------------------- */}
            {activeTab === 'particles' && (
              <div className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-100">Plantillas de Partículas Pixel Art (10 tipos)</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setParticleConfig((p) => ({ ...p, seed: Math.floor(Math.random() * 99999) }))
                      }
                      className="px-2.5 py-1 rounded-md bg-[#1a2236] border border-[#2d3855] hover:border-cyan-400 text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3 text-cyan-400" /> Emitir Nueva Semilla
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setParticleConfig((p) => ({ ...p, count: Math.min(120, p.count + 16) }))
                      }
                      className="px-2.5 py-1 rounded-md bg-cyan-500/15 border border-cyan-500/40 text-cyan-200 text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" /> Duplicar Emisión
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {PARTICLE_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        setEditableFrames(null);
                        setFrameByFrameActive(false);
                        setParticleConfig((p) => ({
                          ...p,
                          template: tpl.id,
                          ...tpl.defaults,
                        }));
                        setEffectName(`Partículas · ${tpl.label}`);
                        setEffectOrigin('manual');
                      }}
                      className={`p-2 rounded-lg border text-left cursor-pointer ${
                        particleConfig.template === tpl.id
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100'
                          : 'bg-[#151a2a] border-[#26304a] text-slate-300 hover:bg-[#1a2135]'
                      }`}
                    >
                      <div className="font-bold text-[11px]">{tpl.label}</div>
                      <div className="text-[9px] text-slate-400 truncate mt-0.5">{tpl.desc}</div>
                    </button>
                  ))}
                </div>

                <div className="p-3 rounded-xl border border-[#26304a] bg-[#151a2a] grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <StudioSlider variant="compact" label="Cantidad" value={particleConfig.count} min={4} max={120} step={1} onChange={(v) => setParticleConfig((p) => ({ ...p, count: v }))} />
                  <StudioSlider variant="compact" label="Tamaño" value={particleConfig.size} min={1} max={10} step={1} unit="px" onChange={(v) => setParticleConfig((p) => ({ ...p, size: v }))} />
                  <StudioSlider variant="compact" label="Variación tamaño" value={particleConfig.sizeVariance} min={0} max={100} step={1} unit="%" onChange={(v) => setParticleConfig((p) => ({ ...p, sizeVariance: v }))} />
                  <StudioSlider variant="compact" label="Velocidad" value={particleConfig.speed} min={5} max={200} step={1} unit="%" onChange={(v) => setParticleConfig((p) => ({ ...p, speed: v }))} />
                  <StudioSlider variant="compact" label="Dirección" value={particleConfig.directionDeg} min={0} max={360} step={1} unit="°" onChange={(v) => setParticleConfig((p) => ({ ...p, directionDeg: v }))} />
                  <StudioSlider variant="compact" label="Dispersión" value={particleConfig.spreadDeg} min={5} max={360} step={1} unit="°" onChange={(v) => setParticleConfig((p) => ({ ...p, spreadDeg: v }))} />
                  <StudioSlider variant="compact" label="Gravedad" value={particleConfig.gravity} min={-100} max={100} step={1} onChange={(v) => setParticleConfig((p) => ({ ...p, gravity: v }))} />
                  <StudioSlider variant="compact" label="Tiempo de vida" value={particleConfig.lifetime} min={20} max={100} step={1} unit="%" onChange={(v) => setParticleConfig((p) => ({ ...p, lifetime: v }))} />
                  <StudioSlider variant="compact" label="Origen X" value={particleConfig.originX} min={0} max={100} step={1} unit="%" onChange={(v) => setParticleConfig((p) => ({ ...p, originX: v }))} />
                  <StudioSlider variant="compact" label="Origen Y" value={particleConfig.originY} min={0} max={100} step={1} unit="%" onChange={(v) => setParticleConfig((p) => ({ ...p, originY: v }))} />
                </div>

                <div className="p-2.5 rounded-xl border border-[#26304a] bg-[#151a2a] flex items-center gap-4">
                  <span className="text-[11px] text-slate-400">Paleta de partículas:</span>
                  {(['Inicio', 'Medio', 'Final'] as const).map((lbl, idx) => (
                    <label key={lbl} className="flex items-center gap-1.5 text-[11px]">
                      <input
                        type="color"
                        value={particleConfig.colors[idx]}
                        onChange={(e) => {
                          const next: [string, string, string] = [...particleConfig.colors];
                          next[idx] = e.target.value;
                          setParticleConfig((p) => ({ ...p, colors: next }));
                        }}
                        className="w-5 h-5 cursor-pointer bg-transparent"
                      />
                      <span>{lbl}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* --------------------------------------------------- */}
            {/* TAB 5: ROCAS, PÚAS DE TIERRA, ESCOMBROS Y CÚMULOS   */}
            {/* --------------------------------------------------- */}
            {activeTab === 'rocks' && (
              <div className="flex flex-col gap-3.5">
                {/* Ataque de Púas de Tierra Generator Card */}
                <div className="p-3 rounded-xl border border-amber-500/40 bg-[#171522] flex flex-col gap-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Mountain className="w-4 h-4 text-amber-300 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-amber-100">
                          Generador: Ataque de Púas de Tierra (Suelo → Púas → Pilares → Rocas → Fragmentos)
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Genera la secuencia completa y luego edita cada púa, pilar, grieta o fragmento individualmente.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const preset = createEarthSpikesAttackPreset(earthSpikesParams);
                        setEditableFrames(null);
                        setFrameByFrameActive(false);
                        setRockPieces(preset.pieces);
                        setRockClusters(preset.clusters);
                        setSelectedPieceId(preset.pieces[1]?.id || preset.pieces[0]?.id || '');
                        setSelectedClusterId(preset.clusters[0]?.id || '');
                        setEffectName('Ataque de Púas de Tierra');
                        setEffectOrigin('manual');
                        setLastProceduralSource('rocks');
                        onShowToast?.(`Generadas ${preset.pieces.length} piezas editables (suelo, púas, pilares y fragmentos).`);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px] cursor-pointer"
                    >
                      Generar Ataque de Púas de Tierra
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <StudioSlider
                      variant="compact"
                      label="Cantidad Púas"
                      value={earthSpikesParams.spikeCount}
                      min={2}
                      max={8}
                      step={1}
                      onChange={(v) => setEarthSpikesParams((p) => ({ ...p, spikeCount: v }))}
                    />
                    <StudioSlider
                      variant="compact"
                      label="Altura"
                      value={earthSpikesParams.heightScale}
                      min={50}
                      max={170}
                      step={5}
                      unit="%"
                      onChange={(v) => setEarthSpikesParams((p) => ({ ...p, heightScale: v }))}
                    />
                    <StudioSlider
                      variant="compact"
                      label="Anchura"
                      value={earthSpikesParams.widthScale}
                      min={50}
                      max={170}
                      step={5}
                      unit="%"
                      onChange={(v) => setEarthSpikesParams((p) => ({ ...p, widthScale: v }))}
                    />
                    <StudioSlider
                      variant="compact"
                      label="Vel. Aparición"
                      value={earthSpikesParams.emergeSpeed}
                      min={20}
                      max={100}
                      step={1}
                      unit="%"
                      onChange={(v) => setEarthSpikesParams((p) => ({ ...p, emergeSpeed: v }))}
                    />
                    <StudioSlider
                      variant="compact"
                      label="Curvatura"
                      value={earthSpikesParams.curvature}
                      min={0}
                      max={60}
                      step={1}
                      unit="°"
                      onChange={(v) => setEarthSpikesParams((p) => ({ ...p, curvature: v }))}
                    />
                  </div>
                </div>

                {/* Add piece bar */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-mono text-slate-400">Crear elemento:</span>
                  {ROCK_KIND_META.map((rk) => (
                    <button
                      key={rk.id}
                      type="button"
                      onClick={() => {
                        const np = createRandomRockPiece(rk.id, selectedCluster?.id || null, Date.now() + rockPieces.length * 37);
                        setEditableFrames(null);
                        setRockPieces((prev) => [...prev, np]);
                        setSelectedPieceId(np.id);
                      }}
                      className="px-2 py-1 rounded-md border border-[#2a3552] bg-[#161c2e] hover:border-amber-400 text-[10px] flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-amber-400" />
                      <span>{rk.label}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  {/* Pieces List */}
                  <div className="md:col-span-5 flex flex-col gap-2">
                    <span className="text-[10px] font-mono uppercase text-slate-400">
                      Piezas Individuales ({rockPieces.length})
                    </span>
                    <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
                      {rockPieces.map((piece) => (
                        <div
                          key={piece.id}
                          onClick={() => setSelectedPieceId(piece.id)}
                          className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-2 cursor-pointer ${
                            selectedPiece?.id === piece.id
                              ? 'bg-amber-400/15 border-amber-400 text-amber-100'
                              : 'bg-[#151a2a] border-[#26304a] text-slate-300 hover:bg-[#1a2135]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-3 h-3 rounded-xs border border-white/20 shrink-0"
                              style={{ backgroundColor: piece.colorPrimary }}
                            />
                            <span className="truncate text-[11px] font-semibold">{piece.name}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const dup: FxRockPiece = {
                                  ...piece,
                                  id: `rp-dup-${Date.now()}`,
                                  name: `${piece.name} II`,
                                  x: Math.min(88, piece.x + 8),
                                  y: Math.min(88, piece.y + 6),
                                  seed: piece.seed + 53,
                                };
                                setRockPieces((prev) => [...prev, dup]);
                                setSelectedPieceId(dup.id);
                              }}
                              className="p-1 rounded hover:bg-white/10 text-slate-400 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={rockPieces.length <= 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                setRockPieces((prev) => prev.filter((p) => p.id !== piece.id));
                              }}
                              className="p-1 rounded hover:bg-rose-500/20 text-rose-300 disabled:opacity-30 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Clusters Section */}
                    <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col gap-2 mt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase font-bold text-emerald-300">
                          Cúmulos / Clusters ({rockClusters.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const nc: FxRockCluster = {
                              id: `cluster-${Date.now()}`,
                              name: `Cúmulo ${rockClusters.length + 1}`,
                              offsetX: 0,
                              offsetY: 0,
                              scale: 100,
                              rotationDeg: 0,
                              burstSpeed: 40,
                              gravity: 45,
                            };
                            setRockClusters((prev) => [...prev, nc]);
                            setSelectedClusterId(nc.id);
                          }}
                          className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200 text-[10px] cursor-pointer"
                        >
                          + Cúmulo
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {rockClusters.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedClusterId(c.id)}
                            className={`px-2 py-0.5 rounded text-[10px] border cursor-pointer ${
                              selectedCluster?.id === c.id
                                ? 'bg-emerald-400 text-slate-950 font-bold border-emerald-300'
                                : 'bg-[#161d2e] border-[#2a3652] text-slate-300'
                            }`}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>

                      {selectedCluster && (
                        <div className="flex flex-col gap-1.5">
                          <StudioSlider variant="compact" label="Mover X" value={selectedCluster.offsetX} min={-45} max={45} step={1} unit="%" onChange={(v) => setRockClusters((prev) => prev.map((c) => (c.id === selectedCluster.id ? { ...c, offsetX: v } : c)))} />
                          <StudioSlider variant="compact" label="Mover Y" value={selectedCluster.offsetY} min={-45} max={45} step={1} unit="%" onChange={(v) => setRockClusters((prev) => prev.map((c) => (c.id === selectedCluster.id ? { ...c, offsetY: v } : c)))} />
                          <StudioSlider variant="compact" label="Escala Cúmulo" value={selectedCluster.scale} min={35} max={180} step={1} unit="%" onChange={(v) => setRockClusters((prev) => prev.map((c) => (c.id === selectedCluster.id ? { ...c, scale: v } : c)))} />
                          <StudioSlider variant="compact" label="Rotación Cúmulo" value={selectedCluster.rotationDeg} min={-180} max={180} step={1} unit="°" onChange={(v) => setRockClusters((prev) => prev.map((c) => (c.id === selectedCluster.id ? { ...c, rotationDeg: v } : c)))} />
                          <StudioSlider variant="compact" label="Expansión / Estallido" value={selectedCluster.burstSpeed} min={0} max={100} step={1} unit="%" onChange={(v) => setRockClusters((prev) => prev.map((c) => (c.id === selectedCluster.id ? { ...c, burstSpeed: v } : c)))} />
                          <StudioSlider variant="compact" label="Gravedad Cúmulo" value={selectedCluster.gravity} min={-40} max={100} step={1} onChange={(v) => setRockClusters((prev) => prev.map((c) => (c.id === selectedCluster.id ? { ...c, gravity: v } : c)))} />
                          <label className="flex items-center gap-1.5 text-[10px] text-emerald-200 pt-0.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(selectedCluster.emergeMode)}
                              onChange={(e) =>
                                setRockClusters((prev) =>
                                  prev.map((c) => (c.id === selectedCluster.id ? { ...c, emergeMode: e.target.checked } : c))
                                )
                              }
                              className="accent-emerald-400"
                            />
                            <span>Modo Emergente desde el Suelo (Púas / Pilares)</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected Piece Inspector */}
                  {selectedPiece && (
                    <div className="md:col-span-7 p-3 rounded-xl border border-[#26304a] bg-[#151a2a] flex flex-col gap-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-amber-200">Inspector de Pieza: {selectedPiece.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setRockPieces((prev) =>
                              prev.map((p) =>
                                p.id === selectedPiece.id
                                  ? { ...p, seed: Math.floor(Math.random() * 99999), rotationDeg: Math.floor(Math.random() * 360) }
                                  : p
                              )
                            )
                          }
                          className="px-2 py-0.5 rounded bg-[#1d2439] border border-[#2f3b5c] text-[10px] flex items-center gap-1 cursor-pointer"
                        >
                          <Shuffle className="w-3 h-3 text-amber-400" /> Variación Aleatoria
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] text-slate-400">Tipo de pieza</span>
                          <select
                            value={selectedPiece.kind}
                            onChange={(e) => {
                              const k = e.target.value as FxRockPieceKind;
                              const meta = ROCK_KIND_META.find((r) => r.id === k);
                              setRockPieces((prev) =>
                                prev.map((p) =>
                                  p.id === selectedPiece.id
                                    ? {
                                        ...p,
                                        kind: k,
                                        colorPrimary: meta?.colors[0] || p.colorPrimary,
                                        colorHighlight: meta?.colors[1] || p.colorHighlight,
                                        colorShadow: meta?.colors[2] || p.colorShadow,
                                      }
                                    : p
                                )
                              );
                            }}
                            className="h-7 px-2 rounded bg-[#101421] border border-[#2a3450] text-[11px]"
                          >
                            {ROCK_KIND_META.map((r) => (
                              <option key={r.id} value={r.id}>{r.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] text-slate-400">Cúmulo asignado</span>
                          <select
                            value={selectedPiece.clusterId || ''}
                            onChange={(e) =>
                              setRockPieces((prev) =>
                                prev.map((p) =>
                                  p.id === selectedPiece.id ? { ...p, clusterId: e.target.value || null } : p
                                )
                              )
                            }
                            className="h-7 px-2 rounded bg-[#101421] border border-[#2a3450] text-[11px]"
                          >
                            <option value="">Independiente (sin cúmulo)</option>
                            {rockClusters.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <StudioSlider variant="compact" label="Posición X" value={selectedPiece.x} min={5} max={95} step={1} unit="%" onChange={(v) => setRockPieces((prev) => prev.map((p) => (p.id === selectedPiece.id ? { ...p, x: v } : p)))} />
                        <StudioSlider variant="compact" label="Posición Y" value={selectedPiece.y} min={5} max={95} step={1} unit="%" onChange={(v) => setRockPieces((prev) => prev.map((p) => (p.id === selectedPiece.id ? { ...p, y: v } : p)))} />
                        <StudioSlider variant="compact" label="Tamaño" value={selectedPiece.size} min={3} max={28} step={1} unit="px" onChange={(v) => setRockPieces((prev) => prev.map((p) => (p.id === selectedPiece.id ? { ...p, size: v } : p)))} />
                        <StudioSlider variant="compact" label="Proporción" value={Math.round(selectedPiece.aspect * 100)} min={45} max={210} step={5} unit="%" onChange={(v) => setRockPieces((prev) => prev.map((p) => (p.id === selectedPiece.id ? { ...p, aspect: v / 100 } : p)))} />
                        <StudioSlider variant="compact" label="Rotación" value={selectedPiece.rotationDeg} min={0} max={360} step={1} unit="°" onChange={(v) => setRockPieces((prev) => prev.map((p) => (p.id === selectedPiece.id ? { ...p, rotationDeg: v } : p)))} />
                        <StudioSlider variant="compact" label="Deformación / Grietas" value={selectedPiece.deform} min={0} max={100} step={1} unit="%" onChange={(v) => setRockPieces((prev) => prev.map((p) => (p.id === selectedPiece.id ? { ...p, deform: v } : p)))} />
                        <StudioSlider variant="compact" label="Curvatura Púa/Pilar" value={selectedPiece.curvature ?? 0} min={-60} max={60} step={1} unit="°" onChange={(v) => setRockPieces((prev) => prev.map((p) => (p.id === selectedPiece.id ? { ...p, curvature: v } : p)))} />
                        <StudioSlider variant="compact" label="Retardo Aparición" value={Math.round((selectedPiece.emergeOrder ?? 0) * 100)} min={0} max={100} step={5} unit="%" onChange={(v) => setRockPieces((prev) => prev.map((p) => (p.id === selectedPiece.id ? { ...p, emergeOrder: v / 100 } : p)))} />
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        {(
                          [
                            ['colorHighlight', 'Luz'],
                            ['colorPrimary', 'Base'],
                            ['colorShadow', 'Sombra'],
                          ] as const
                        ).map(([k, lbl]) => (
                          <label key={k} className="flex items-center gap-1 text-[10px]">
                            <input
                              type="color"
                              value={selectedPiece[k]}
                              onChange={(e) =>
                                setRockPieces((prev) =>
                                  prev.map((p) => (p.id === selectedPiece.id ? { ...p, [k]: e.target.value } : p))
                                )
                              }
                              className="w-5 h-5 cursor-pointer bg-transparent"
                            />
                            <span>{lbl}</span>
                          </label>
                        ))}
                        <label className="flex items-center gap-1.5 text-[11px] ml-auto cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedPiece.outline}
                            onChange={(e) =>
                              setRockPieces((prev) =>
                                prev.map((p) => (p.id === selectedPiece.id ? { ...p, outline: e.target.checked } : p))
                              )
                            }
                            className="accent-amber-400"
                          />
                          <span>Contorno Pixel Art</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --------------------------------------------------- */}
            {/* TAB 6: SMEARS (LINEAL, CURVO, RADIAL, MÚLTIPLE)     */}
            {/* --------------------------------------------------- */}
            {activeTab === 'smears' && (
              <div className="flex flex-col gap-3.5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      ['linear', 'Smear Lineal', 'Barrido recto de golpe o dash'],
                      ['curved', 'Smear Curvo', 'Arco de espada o patada giratoria'],
                      ['radial', 'Smear Radial', 'Líneas de impacto centrípetas'],
                      ['multiple', 'Smear Múltiple', 'Trazos paralelos de alta velocidad'],
                    ] as [FxSmearMode, string, string][]
                  ).map(([m, title, sub]) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setEditableFrames(null);
                        setFrameByFrameActive(false);
                        setSmearConfig((p) => ({ ...p, mode: m }));
                        setEffectName(title);
                        setEffectOrigin('manual');
                      }}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer ${
                        smearConfig.mode === m
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100'
                          : 'bg-[#151a2a] border-[#26304a] text-slate-300 hover:bg-[#1a2135]'
                      }`}
                    >
                      <div className="font-bold text-[11px]">{title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>
                    </button>
                  ))}
                </div>

                <div className="p-3 rounded-xl border border-[#26304a] bg-[#151a2a] grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <StudioSlider variant="compact" label="Grosor" value={smearConfig.thickness} min={1} max={20} step={1} unit="px" onChange={(v) => setSmearConfig((p) => ({ ...p, thickness: v }))} />
                  <StudioSlider variant="compact" label="Longitud" value={smearConfig.length} min={15} max={100} step={1} unit="%" onChange={(v) => setSmearConfig((p) => ({ ...p, length: v }))} />
                  <StudioSlider variant="compact" label="Dirección" value={smearConfig.directionDeg} min={0} max={360} step={1} unit="°" onChange={(v) => setSmearConfig((p) => ({ ...p, directionDeg: v }))} />
                  <StudioSlider variant="compact" label="Curvatura" value={smearConfig.curvature} min={-100} max={100} step={1} unit="%" onChange={(v) => setSmearConfig((p) => ({ ...p, curvature: v }))} />
                  <StudioSlider variant="compact" label="Intensidad" value={smearConfig.intensity} min={10} max={100} step={1} unit="%" onChange={(v) => setSmearConfig((p) => ({ ...p, intensity: v }))} />
                  <StudioSlider variant="compact" label="Cantidad de trazos" value={smearConfig.strokeCount} min={1} max={12} step={1} onChange={(v) => setSmearConfig((p) => ({ ...p, strokeCount: v }))} />
                </div>

                <div className="p-2.5 rounded-xl border border-[#26304a] bg-[#151a2a] flex flex-wrap items-center gap-4">
                  {(['Núcleo', 'Estela', 'Borde'] as const).map((lbl, idx) => (
                    <label key={lbl} className="flex items-center gap-1.5 text-[11px]">
                      <input
                        type="color"
                        value={smearConfig.colors[idx]}
                        onChange={(e) => {
                          const next: [string, string, string] = [...smearConfig.colors];
                          next[idx] = e.target.value;
                          setSmearConfig((p) => ({ ...p, colors: next }));
                        }}
                        className="w-5 h-5 cursor-pointer bg-transparent"
                      />
                      <span>{lbl}</span>
                    </label>
                  ))}
                  <label className="flex items-center gap-1.5 ml-auto cursor-pointer text-[11px]">
                    <input
                      type="checkbox"
                      checked={smearConfig.taper}
                      onChange={(e) => setSmearConfig((p) => ({ ...p, taper: e.target.checked }))}
                      className="accent-cyan-400"
                    />
                    <span>Afinar puntas (Taper)</span>
                  </label>
                </div>
              </div>
            )}

            {/* --------------------------------------------------- */}
            {/* TAB 7: FLUIDOS EN TIEMPO REAL                       */}
            {/* --------------------------------------------------- */}
            {activeTab === 'fluids' && (
              <div className="flex flex-col gap-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-cyan-200 flex items-center gap-1.5">
                    <Waves className="w-4 h-4 text-cyan-400" />
                    <span>Laboratorio de Fluidos 2D (Simulación en Tiempo Real)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const baked = bakeFluidFrames(fluidConfig, sequenceFrameCount, canvasWidth, canvasHeight);
                      setEditableFrames(baked);
                      setFrameByFrameActive(true);
                      setIsPlaying(false);
                      setPreviewFrameIdx(0);
                      setEffectOrigin('manual');
                      onShowToast?.(`Fluido horneado a ${baked.length} frames editables.`);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-[11px] cursor-pointer"
                  >
                    Hornear a {sequenceFrameCount} Frames Editables
                  </button>
                </div>

                {/* 7 Fluid Types */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {FLUID_TYPE_PRESETS.map((fp) => (
                    <button
                      key={fp.id}
                      type="button"
                      onClick={() => {
                        setEditableFrames(null);
                        setFrameByFrameActive(false);
                        setFluidConfig((p) => ({
                          ...p,
                          fluidType: fp.id as FxFluidType,
                          ...fp.defaults,
                        }));
                        setEffectName(`Fluido · ${fp.label}`);
                        setEffectOrigin('manual');
                        setSingleBlendMode(fp.id === 'liquid_energy' ? 'screen' : 'normal');
                      }}
                      className={`p-2 rounded-lg border text-left cursor-pointer ${
                        fluidConfig.fluidType === fp.id
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100'
                          : 'bg-[#151a2a] border-[#26304a] text-slate-300 hover:bg-[#1a2135]'
                      }`}
                    >
                      <div className="font-bold text-[11px]">{fp.label}</div>
                      <div className="text-[9px] text-slate-400 truncate">{fp.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Emitter Modes */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-mono text-slate-400">Modo de Emisor:</span>
                  {(
                    [
                      ['splash', 'Salpicadura'],
                      ['stream', 'Chorro'],
                      ['wave', 'Ola'],
                      ['geyser', 'Géiser'],
                      ['pool', 'Estanque'],
                    ] as [FxFluidEmitterMode, string][]
                  ).map(([em, lbl]) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => {
                        setEditableFrames(null);
                        setFluidConfig((p) => ({ ...p, emitterMode: em }));
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] border cursor-pointer ${
                        fluidConfig.emitterMode === em
                          ? 'bg-amber-400 text-slate-950 font-bold border-amber-300'
                          : 'bg-[#151a2a] border-[#26304a] text-slate-300'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>

                {/* Physics Parameters */}
                <div className="p-3 rounded-xl border border-[#26304a] bg-[#151a2a] grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <StudioSlider variant="compact" label="Densidad" value={fluidConfig.density} min={15} max={100} step={1} unit="%" onChange={(v) => setFluidConfig((p) => ({ ...p, density: v }))} />
                  <StudioSlider variant="compact" label="Viscosidad" value={fluidConfig.viscosity} min={5} max={100} step={1} unit="%" onChange={(v) => setFluidConfig((p) => ({ ...p, viscosity: v }))} />
                  <StudioSlider variant="compact" label="Presión" value={fluidConfig.pressure} min={10} max={100} step={1} unit="%" onChange={(v) => setFluidConfig((p) => ({ ...p, pressure: v }))} />
                  <StudioSlider variant="compact" label="Turbulencia" value={fluidConfig.turbulence} min={0} max={100} step={1} unit="%" onChange={(v) => setFluidConfig((p) => ({ ...p, turbulence: v }))} />
                  <StudioSlider variant="compact" label="Velocidad" value={fluidConfig.speed} min={10} max={200} step={1} unit="%" onChange={(v) => setFluidConfig((p) => ({ ...p, speed: v }))} />
                  <StudioSlider variant="compact" label="Dirección" value={fluidConfig.directionDeg} min={0} max={360} step={1} unit="°" onChange={(v) => setFluidConfig((p) => ({ ...p, directionDeg: v }))} />
                  <StudioSlider variant="compact" label="Espuma" value={fluidConfig.foam} min={0} max={100} step={1} unit="%" onChange={(v) => setFluidConfig((p) => ({ ...p, foam: v }))} />
                  <StudioSlider variant="compact" label="Ondulación" value={fluidConfig.ripple} min={0} max={100} step={1} unit="%" onChange={(v) => setFluidConfig((p) => ({ ...p, ripple: v }))} />
                </div>

                {/* 4 Fluid Colors */}
                <div className="p-2.5 rounded-xl border border-[#26304a] bg-[#151a2a] flex flex-wrap items-center gap-3">
                  <span className="text-[11px] text-slate-400">Paleta del Fluido:</span>
                  {(['Espuma', 'Brillo', 'Cuerpo', 'Profundo'] as const).map((lbl, idx) => (
                    <label key={lbl} className="flex items-center gap-1.5 text-[11px]">
                      <input
                        type="color"
                        value={fluidConfig.colors[idx]}
                        onChange={(e) => {
                          const next: [string, string, string, string] = [...fluidConfig.colors];
                          next[idx] = e.target.value;
                          setFluidConfig((p) => ({ ...p, colors: next }));
                        }}
                        className="w-5 h-5 cursor-pointer bg-transparent"
                      />
                      <span>{lbl}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* --------------------------------------------------- */}
            {/* TAB 8: MATERIALES FX (7 MATERIALES BASE)            */}
            {/* --------------------------------------------------- */}
            {activeTab === 'materials' && (
              <div className="flex flex-col gap-3.5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {materials.map((mat) => (
                    <button
                      key={mat.id}
                      type="button"
                      onClick={() => setSelectedMaterialId(mat.id)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer ${
                        selectedMaterial.id === mat.id
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100'
                          : 'bg-[#151a2a] border-[#26304a] text-slate-300 hover:bg-[#1a2135]'
                      }`}
                    >
                      <div className="font-bold text-[11px]">{mat.name}</div>
                      <div className="flex items-center gap-1 mt-1.5">
                        {mat.palette.map((c, i) => (
                          <span key={i} className="w-4 h-3 rounded-xs border border-white/15" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>

                {selectedMaterial && (
                  <div className="p-3.5 rounded-xl border border-[#26304a] bg-[#151a2a] flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-100">Propiedades de Material: {selectedMaterial.name}</span>
                      <button
                        type="button"
                        onClick={handleApplyMaterialToCurrentFx}
                        className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px] cursor-pointer"
                      >
                        Aplicar Material al Efecto Actual
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {(['Luz', 'Medio', 'Sombra', 'Profundo'] as const).map((lbl, idx) => (
                        <label key={lbl} className="flex items-center gap-1 text-[11px]">
                          <input
                            type="color"
                            value={selectedMaterial.palette[idx]}
                            onChange={(e) =>
                              setMaterials((prev) =>
                                prev.map((m) => {
                                  if (m.id !== selectedMaterial.id) return m;
                                  const pal: [string, string, string, string] = [...m.palette];
                                  pal[idx] = e.target.value;
                                  return { ...m, palette: pal };
                                })
                              )
                            }
                            className="w-5 h-5 cursor-pointer bg-transparent"
                          />
                          <span>{lbl}</span>
                        </label>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <StudioSlider
                        variant="compact"
                        label="Dithering Bayer"
                        value={selectedMaterial.ditherStrength}
                        min={0}
                        max={100}
                        step={1}
                        unit="%"
                        onChange={(v) =>
                          setMaterials((prev) => prev.map((m) => (m.id === selectedMaterial.id ? { ...m, ditherStrength: v } : m)))
                        }
                      />
                      <StudioSlider
                        variant="compact"
                        label="Rugosidad"
                        value={selectedMaterial.roughness}
                        min={0}
                        max={100}
                        step={1}
                        unit="%"
                        onChange={(v) =>
                          setMaterials((prev) => prev.map((m) => (m.id === selectedMaterial.id ? { ...m, roughness: v } : m)))
                        }
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                        <input
                          type="checkbox"
                          checked={selectedMaterial.useOutline}
                          onChange={(e) =>
                            setMaterials((prev) =>
                              prev.map((m) => (m.id === selectedMaterial.id ? { ...m, useOutline: e.target.checked } : m))
                            )
                          }
                          className="accent-cyan-400"
                        />
                        <span>Contorno 1px</span>
                      </label>
                      {selectedMaterial.useOutline && (
                        <input
                          type="color"
                          value={selectedMaterial.outlineColor}
                          onChange={(e) =>
                            setMaterials((prev) =>
                              prev.map((m) => (m.id === selectedMaterial.id ? { ...m, outlineColor: e.target.value } : m))
                            )
                          }
                          className="w-5 h-5 cursor-pointer bg-transparent"
                        />
                      )}
                      <select
                        value={selectedMaterial.blendMode}
                        onChange={(e) =>
                          setMaterials((prev) =>
                            prev.map((m) =>
                              m.id === selectedMaterial.id ? { ...m, blendMode: e.target.value as LayerBlendMode } : m
                            )
                          )
                        }
                        className="h-7 px-2 rounded bg-[#101421] border border-[#2a3450] text-[11px] ml-auto"
                      >
                        {BLEND_OPTIONS.map((b) => (
                          <option key={b.value} value={b.value}>{b.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* --------------------------------------------------- */}
            {/* TAB 9: IMPORTAR FX EXTERNO (PNG, WEBP, GIF, SHEET)  */}
            {/* --------------------------------------------------- */}
            {activeTab === 'import' && (
              <div className="flex flex-col gap-3.5">
                <div className="p-3.5 rounded-xl border border-[#2a3654] bg-[#151a2a] flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-100">Importar FX Externos (PNG, WEBP, GIF, Sprite Sheets)</div>
                      <div className="text-[10px] text-slate-400">
                        Recorta, divide en frames, recolorea, separa componentes, anima y edita frame a frame dentro de FX Lab.
                      </div>
                    </div>
                    <input
                      ref={importImageInputRef}
                      type="file"
                      accept="image/png,image/webp,image/gif,image/jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        setImportFile(f);
                        handleRunExternalImport(f);
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => importImageInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer"
                    >
                      <ImagePlus className="w-3.5 h-3.5" />
                      <span>Seleccionar Imagen / Sprite Sheet</span>
                    </button>
                  </div>

                  {/* Spritesheet Slicer & Crop Controls */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400">Columnas</span>
                      <input type="number" min={1} max={32} value={importCols} onChange={(e) => setImportCols(Math.max(1, Number(e.target.value) || 1))} className="h-7 px-2 rounded bg-[#101421] border border-[#2a3450] font-mono text-xs" />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400">Filas</span>
                      <input type="number" min={1} max={32} value={importRows} onChange={(e) => setImportRows(Math.max(1, Number(e.target.value) || 1))} className="h-7 px-2 rounded bg-[#101421] border border-[#2a3450] font-mono text-xs" />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400">Recorte Sup</span>
                      <input type="number" min={0} value={importCropTop} onChange={(e) => setImportCropTop(Math.max(0, Number(e.target.value) || 0))} className="h-7 px-2 rounded bg-[#101421] border border-[#2a3450] font-mono text-xs" />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400">Recorte Der</span>
                      <input type="number" min={0} value={importCropRight} onChange={(e) => setImportCropRight(Math.max(0, Number(e.target.value) || 0))} className="h-7 px-2 rounded bg-[#101421] border border-[#2a3450] font-mono text-xs" />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400">Recorte Inf</span>
                      <input type="number" min={0} value={importCropBottom} onChange={(e) => setImportCropBottom(Math.max(0, Number(e.target.value) || 0))} className="h-7 px-2 rounded bg-[#101421] border border-[#2a3450] font-mono text-xs" />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400">Recorte Izq</span>
                      <input type="number" min={0} value={importCropLeft} onChange={(e) => setImportCropLeft(Math.max(0, Number(e.target.value) || 0))} className="h-7 px-2 rounded bg-[#101421] border border-[#2a3450] font-mono text-xs" />
                    </label>
                  </div>

                  {importFile && (
                    <div className="flex items-center justify-between gap-2 text-[11px] bg-[#101421] px-2.5 py-1.5 rounded-lg border border-[#26304a]">
                      <span className="truncate text-emerald-300 font-mono">{importFile.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRunExternalImport()}
                        className="px-2.5 py-1 rounded bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 font-semibold cursor-pointer"
                      >
                        Re-cortar y Extraer Frames
                      </button>
                    </div>
                  )}
                </div>

                {/* Post-Import Transform & Edit Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Recolor */}
                  <div className="p-3 rounded-xl border border-[#26304a] bg-[#151a2a] flex flex-col gap-2.5">
                    <span className="font-bold text-[11px] text-slate-200">Recolorear FX Importado</span>
                    <div className="flex items-center gap-2">
                      {importRecolorPalette.map((c, idx) => (
                        <input
                          key={idx}
                          type="color"
                          value={c}
                          onChange={(e) => {
                            const next: [string, string, string, string] = [...importRecolorPalette];
                            next[idx] = e.target.value;
                            setImportRecolorPalette(next);
                          }}
                          className="w-7 h-7 rounded cursor-pointer bg-transparent"
                        />
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const base = ensureEditableFrames();
                          setEditableFrames(recolorFxFrames(base, importRecolorPalette));
                          setEffectOrigin('modified');
                          onShowToast?.('Paleta de recoloreo aplicada a todos los frames.');
                        }}
                        className="ml-auto px-3 py-1 rounded-md bg-amber-400 text-slate-950 font-bold text-[11px] cursor-pointer"
                      >
                        Aplicar Color
                      </button>
                    </div>
                  </div>

                  {/* Auto-Animate Static Import */}
                  <div className="p-3 rounded-xl border border-[#26304a] bg-[#151a2a] flex flex-col gap-2.5">
                    <span className="font-bold text-[11px] text-slate-200">Animar Efecto Estático</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={importAnimMode}
                        onChange={(e) => setImportAnimMode(e.target.value as StaticFxAnimMode)}
                        className="h-7 px-2 rounded bg-[#101421] border border-[#2a3450] text-[11px] flex-1"
                      >
                        <option value="pulse">Pulso energético</option>
                        <option value="expand">Expansión de impacto</option>
                        <option value="scroll_up">Flujo ascendente (llama/humo)</option>
                        <option value="jitter">Vibración eléctrica</option>
                        <option value="dissolve">Disolución progresiva</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const animated = animateStaticFxFrame(currentPreviewGrid, sequenceFrameCount, importAnimMode);
                          setEditableFrames(animated);
                          setFrameByFrameActive(false);
                          setIsPlaying(true);
                          setEffectOrigin('modified');
                          onShowToast?.(`Secuencia animada de ${animated.length} frames generada.`);
                        }}
                        className="px-3 py-1 rounded-md bg-cyan-400 text-slate-950 font-bold text-[11px] cursor-pointer"
                      >
                        Animar ({sequenceFrameCount}f)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --------------------------------------------------- */}
            {/* TAB 14: IA FX ASISTIDA & GENERACIÓN GUIADA          */}
            {/* --------------------------------------------------- */}
            {activeTab === 'ai' && (
              <FxGuidedAiPanel
                form={guidedAiForm}
                canvasWidth={canvasWidth}
                isBusy={isAiBusy}
                statusMsg={aiStatusMsg}
                onChangeForm={(next) => {
                  setGuidedAiForm(next);
                  setGenConfig((p) => ({
                    ...p,
                    effectType: next.effectType,
                    detailLevel: next.detailLevel,
                    visualStyle: next.visualStyle,
                  }));
                }}
                onGenerateModularRecipe={handleGenerateAiModularRecipe}
                onRunPixelAssist={handleRunOptionalAiAssist}
              />
            )}
          </div>
        </div>

        {/* ===================================================== */}
        {/* FOOTER: NAME, OUTPUT MODE, SAVE TO LIBRARY, APPLY     */}
        {/* ===================================================== */}
        <div className="px-4 py-2.5 border-t border-[#232b42] bg-[#141827] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={effectName}
              onChange={(e) => setEffectName(e.target.value)}
              placeholder="Nombre del efecto..."
              className="h-8 px-2.5 rounded-lg bg-[#0f1320] border border-[#2b3654] text-xs font-semibold text-slate-100 w-48 outline-none focus:border-cyan-400"
            />
            <select
              value={outputLayerMode}
              onChange={(e) => setOutputLayerMode(e.target.value as FxLayerOutputMode)}
              className="h-8 px-2 rounded-lg bg-[#0f1320] border border-[#2b3654] text-[11px] text-slate-200"
              title="Modo de inserción en capas del proyecto"
            >
              <option value="per_component">Capas por componente</option>
              <option value="single">Capa única combinada</option>
            </select>
            {outputLayerMode === 'single' && (
              <select
                value={singleBlendMode}
                onChange={(e) => setSingleBlendMode(e.target.value as LayerBlendMode)}
                className="h-8 px-2 rounded-lg bg-[#0f1320] border border-[#2b3654] text-[11px] text-slate-200"
                title="Modo de fusión para capa única"
              >
                {BLEND_OPTIONS.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveToLibrary}
              className="px-3 py-1.5 rounded-lg border border-[#2f3b5c] bg-[#1b2236] hover:bg-[#242e48] text-slate-100 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-amber-400" />
              <span>Guardar en Biblioteca FX</span>
            </button>

            <button
              type="button"
              onClick={handleApplyToCanvas}
              className="px-4 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Aplicar al Lienzo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
