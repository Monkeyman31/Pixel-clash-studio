import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { STUDIO_Z, StudioTopLayerPortal } from './StudioTopLayer';
import { CanvasEditOverlay } from './CanvasEditOverlay';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Crosshair, 
  Play, 
  Pause, 
  Eye, 
  EyeOff,
  Scissors,
  FlipHorizontal,
  Flame,
  Swords,
  Type as TypeIcon,
  Check,
  X,
  Layers,
  RotateCw,
  Focus,
  Pin,
  Lock,
  Unlock,
  ArrowUpToLine,
  Camera,
  Spline,
  Image as ImageIcon,
  BoxSelect,
} from 'lucide-react';
import { 
  AssetLibraryItem,
  BrushSettings,
  BucketSubTool,
  BucketToolOptions,
  CameraKeyframe,
  CameraShakeConfig,
  CanvasEditConfig,
  CanvasEditRect,
  CanvasGuide,
  CombatFxConfig,
  DitherConfig,
  DummyOpponent,
  DummiePose,
  EraserToolOptions,
  EyedropperConfig,
  Frame,
  GradientConfig,
  GroundConfig,
  GuidesConfig,
  GuidesModalTab,
  Hitbox,
  HitboxType,
  LassoMode,
  Layer,
  LayerBlendMode,
  LayerGroup,
  MagicWandOptions,
  MoveSubTool,
  MoveToolOptions,
  ParametricShapeObject,
  PerformanceMode,
  ProjectWorkMode,
  PureRefConfig,
  ReferenceGroup,
  ReferenceItem,
  SampledColorInfo,
  SelectionArea,
  SelectionDisplayConfig,
  SelectionSubTool,
  SelectionToolOptions,
  ShapeRasterConfirmMode,
  ShapeToolConfig,
  StageParallaxConfig,
  StageType,
  SymmetryConfig,
  TileItem,
  TilesetCollection,
  TilesetWorkspaceConfig,
  TileToolConfig,
  ToolType,
  TransformActionId,
  TransformParameters,
  TransformSnapConfig,
  VectorNode,
  VectorPath,
  VectorRasterConfirmMode,
  VectorToolConfig,
  WheelNavigationMode,
  ZoomCommand,
  ZoomToolMode,
} from '../types';
import { 
  DEFAULT_DITHER_CONFIG,
  DEFAULT_SYMMETRY_CONFIG,
  applySmear,
  blendHexColors,
  cleanPixelPerfectStroke, 
  compositeFrame, 
  computeDynamicBrushParams,
  computeSymmetricPoints,
  computeSymmetricPointsRaw,
  computeSymmetricSegments,
  createEmptyGrid,
  drawAdvancedBrush,
  drawAdvancedLine,
  drawBrush, 
  drawCircle,
  drawLine, 
  drawRectangle, 
  evaluateLayerKeyframeTransform,
  getAdvancedDitherColor,
  getBrushStampOffsets,
  getFrameDurationMs,
  resolveGroupVisibilityAndOpacity,
  resolveMaskAlpha,
  sampleDitherMask,
  shiftLayerPixelsNonDestructive
} from '../utils/pixelMath';
import { applyAdjustmentToHex } from '../utils/colorFilters';
import { PixelTextAlign, PixelTextFont, rasterizePixelText } from '../utils/pixelText';
import { renderDummyOpponent, renderStageBackground } from '../utils/stageRenderer';
import { DEFAULT_BRUSH_SETTINGS } from './BrushSettingsPanel';
import { TransformPropertiesBar } from './TransformPropertiesBar';
import { VectorLineInspector } from './VectorLineInspector';
import { StudioSlider } from './StudioSlider';
import {
  applyTransformToGrid,
  getTransformedQuadCorners,
  transformVectorPath,
} from '../utils/transformEngine';
import {
  clearTileCellOnGrid,
  DEFAULT_TILE_TOOL_CONFIG,
  replaceMatchingTilesOnGrid,
  smartFillTilesOnGrid,
  stampTilePixelsOntoGrid,
  updateAutotileAroundCell,
} from '../utils/tilesetEngine';
import {
  alignSelectedNodes,
  bendSegmentByDelta,
  computeVectorSegmentMetrics,
  convertNodeType,
  distributeSelectedNodes,
  getEffectiveHandlesForSegment,
  hitTestVectorHandle,
  hitTestVectorNode,
  hitTestVectorSegment,
  moveHandleWithConstraint,
  rasterizeVectorPathPreviewCells,
  rasterizeVectorPathsToGrid,
  sampleVectorPath,
  snapVectorCoord,
  splitSegmentAt,
} from '../utils/vectorCurveEngine';
import {
  DEFAULT_EYEDROPPER_CONFIG,
  buildSamplingGridForEyedropper,
  computeColorDelta,
  sampleEyedropperAt,
} from '../utils/eyedropperEngine';
import {
  computeDummieVolumes25D,
  getEffectivePoseJoints,
  getJointAnchorColor,
  getJointAnchorLabel,
  getJointAnchorVisualState,
  moveDummieJointWithAnchors,
} from '../utils/dummieRigEngine';
import {
  DEFAULT_BUCKET_OPTIONS,
  DEFAULT_ERASER_OPTIONS,
  DEFAULT_GRADIENT_CONFIG,
  DEFAULT_MAGIC_WAND_OPTIONS,
  DEFAULT_MOVE_OPTIONS,
  DEFAULT_SELECTION_DISPLAY_CONFIG,
  DEFAULT_SELECTION_OPTIONS,
  DEFAULT_SHAPE_CONFIG,
  EdgeMapData,
  advancedFloodFill,
  advancedMagicWandMask,
  buildSelectionMaskFromShape,
  combineSelectionMasks,
  computeCanvasEdgeMap,
  computeUniversalDitherPixel,
  evaluateBrushTextureFactor,
  evaluateDitherThreshold,
  renderGradientToGrid,
  snapPointToStrongestEdge,
  traceMagneticLassoSegment,
} from '../utils/toolEngines';
import {
  ParametricHandleKind,
  SHAPE_KIND_LABELS,
  canvasToShapeLocal,
  createParametricShapeFromDrag,
  getParametricShapeHandles,
  hitTestParametricShape,
  rasterizeParametricShapeToGrid,
  rasterizeParametricShapesList,
  shapeNormToCanvas,
  syncShapeConfigFromObject,
} from '../utils/parametricShapeEngine';
import {
  DEFAULT_GUIDES_CONFIG,
  snapBoundsToGuides,
  snapCoordinateToGuides,
} from '../utils/guidesEngine';
import { ViewportRulersAndGuides } from './ViewportRulersAndGuides';
import { analyzeTilesetSeams } from '../utils/workModesEngine';
import {
  blitPixelGridToCanvas,
  getCachedLayerEffectivePixels,
  getCachedOnionSkinCanvas,
  getCachedPixelGridCanvas,
} from '../utils/renderCache';
import {
  TiledLayerStore,
  getTiledStore,
  isFrameTiled,
  isLayerTiled,
  registerTiledStore,
} from '../utils/tiledImageEngine';

interface CanvasViewportProps {
  width: number;
  height: number;
  currentFrame: Frame;
  currentLayer: Layer;
  previousFrame: Frame | null;
  nextFrame: Frame | null;
  onionSkinEnabled: boolean;
  onionSkinOpacity: number;
  showGrid: boolean;
  showHitboxes: boolean;
  showPivot: boolean;
  globalPivot: { x: number; y: number };
  onUpdatePivot: (pivot: { x: number; y: number }) => void;
  stageType: StageType;
  stageOpacity: number;
  groundConfig: GroundConfig;
  dummyOpponent: DummyOpponent;
  combatFx: CombatFxConfig;
  symmetryEnabled: boolean;
  symmetryAxis: number;
  symmetryConfig?: SymmetryConfig;
  onChangeSymmetryConfig?: (next: SymmetryConfig) => void;
  activeTool: ToolType;
  moveSubTool?: MoveSubTool;
  onChangeMoveSubTool?: (sub: MoveSubTool) => void;
  selectionSubTool?: SelectionSubTool;
  onSelectLayerIndex?: (index: number) => void;
  bucketSubTool?: BucketSubTool;
  onChangeBucketSubTool?: (sub: BucketSubTool) => void;
  gradientConfig?: GradientConfig;
  onChangeGradientConfig?: (next: GradientConfig) => void;
  shapeConfig?: ShapeToolConfig;
  onChangeShapeConfig?: (next: ShapeToolConfig) => void;
  selectionDisplayConfig?: SelectionDisplayConfig;
  zoomToolMode?: ZoomToolMode;
  onChangeZoomToolMode?: (mode: ZoomToolMode) => void;
  zoomCommand?: ZoomCommand | null;
  brushSize: number;
  pixelPerfect: boolean;
  ditherPattern: 'checkered' | 'sparse' | 'dense' | 'horizontal';
  ditherConfig?: DitherConfig;
  marqueeShape?: 'rect' | 'ellipse';
  lassoMode?: LassoMode;
  clipOutsideCanvas?: boolean;
  liveCanvasPreview?: {
    layerId?: string;
    grid: (string | null)[][];
    beforeAfterSplit?: number | null;
  } | null;
  activeHitboxType: HitboxType;
  primaryColor: string;
  primaryAlpha: number;
  secondaryColor: string;
  onUpdateLayerPixels: (pixels: (string | null)[][], offCanvasPixels?: Record<string, string>) => void;
  onCommitTiledLayerEdit?: (layerId: string, newTiledStoreId: string) => void;
  onUpdateHitboxes: (hitboxes: Hitbox[]) => void;
  onPickColor: (color: string) => void;
  allFrames: Frame[];
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackMode: 'loop' | 'pingpong' | 'once';
  fps?: number;
  currentFrameIndex?: number;
  onionSkinPrev?: number;
  onionSkinNext?: number;
  onSelectFrame?: (index: number) => void;
  linkMoveAllFrames?: boolean;
  onShiftAllFramesLayer?: (dx: number, dy: number) => void;
  showMiniPlayerProp?: boolean;
  brushSettings?: BrushSettings;
  selection?: SelectionArea | null;
  onChangeSelection?: (sel: SelectionArea | null) => void;
  onCreateTextLayer?: (name: string, pixels: (string | null)[][]) => void;
  references?: ReferenceItem[];
  referenceGroups?: ReferenceGroup[];
  activeReferenceId?: string | null;
  onSelectReference?: (id: string | null) => void;
  onUpdateReference?: (id: string, patch: Partial<ReferenceItem>) => void;
  onBringReferenceToFront?: (id: string) => void;
  pureRefConfig?: PureRefConfig;
  onChangePureRefConfig?: (next: PureRefConfig) => void;
  onCenterAllReferences?: () => void;
  onDropLibraryAssetAt?: (item: AssetLibraryItem, x: number, y: number) => void;
  combatTestActive?: boolean;
  onExitCombatTest?: () => void;
  layerGroups?: LayerGroup[];
  editingMask?: boolean;
  onUpdateLayerMaskPixels?: (maskPixels: number[][]) => void;
  // Transform System
  transformSession?: {
    params: TransformParameters;
    sourceGrid: (string | null)[][];
    sourceVectorPaths?: VectorPath[];
  } | null;
  transformSnapConfig?: TransformSnapConfig;
  onChangeTransformParams?: (next: TransformParameters) => void;
  onChangeTransformSnapConfig?: (next: TransformSnapConfig) => void;
  onCommitTransform?: () => void;
  onCancelTransform?: () => void;
  onTriggerTransformAction?: (action: TransformActionId) => void;
  selectedLayersCount?: number;
  selectedFramesCount?: number;
  hasActiveGroup?: boolean;
  // Vector Line & Smart Pixel Curve System
  vectorConfig?: VectorToolConfig;
  onChangeVectorConfig?: (next: VectorToolConfig) => void;
  selectedVectorPathId?: string | null;
  onSelectVectorPathId?: (id: string | null) => void;
  selectedVectorNodeIds?: string[];
  onSelectVectorNodeIds?: (ids: string[]) => void;
  onUpdateLayerVectorPaths?: (paths: VectorPath[], createVectorLayerIfEmpty?: boolean) => void;
  onConvertVectorPath?: (path: VectorPath, target: 'to_selection' | 'to_shape' | 'to_raster' | 'to_brush' | 'to_route') => void;
  // Pro Eyedropper + Loupe + Smart Palette
  eyedropperConfig?: EyedropperConfig;
  activePaletteColors?: string[];
  colorHistory?: string[];
  onSampledColorUpdate?: (sample: SampledColorInfo | null) => void;
  // Intelligent 2D Pose Dummie Overlay
  dummiePose?: DummiePose | null;
  onChangeDummiePose?: (next: DummiePose) => void;
  // Camera Shake & Camera Keyframes
  cameraShake?: CameraShakeConfig;
  cameraKeyframes?: CameraKeyframe[];
  cameraShakeTestNonce?: number;
  // Hitbox selection sync & Vector confirmation / Pixel-Perfect preview
  selectedHitboxId?: string | null;
  onSelectHitboxId?: (id: string | null) => void;
  vectorConfirmPolicy?: VectorRasterConfirmMode;
  onChangeVectorConfirmPolicy?: (mode: VectorRasterConfirmMode) => void;
  showPixelPerfectVectorPreview?: boolean;
  onTogglePixelPerfectVectorPreview?: () => void;
  onBakeVectorPath?: (path: VectorPath, rasterizedPixels: (string | null)[][]) => void;
  onUiContextFocus?: () => void;
  onSmartDelete?: () => void;
  // Contextual Tool Options Bar sync
  eraserOptions?: EraserToolOptions;
  bucketOptions?: BucketToolOptions;
  magicWandOptions?: MagicWandOptions;
  selectionOptions?: SelectionToolOptions;
  moveOptions?: MoveToolOptions;
  // Interactive Parametric Shapes
  selectedParametricShapeId?: string | null;
  onSelectParametricShapeId?: (id: string | null) => void;
  onUpdateLayerParametricShapes?: (shapes: ParametricShapeObject[]) => void;
  onRasterizeParametricShape?: (shapeId: string) => void;
  shapeRasterPolicy?: ShapeRasterConfirmMode;
  // Rulers, Interactive Guides & Wheel Navigation
  guides?: CanvasGuide[];
  guidesConfig?: GuidesConfig;
  selectedGuideId?: string | null;
  onSelectGuide?: (id: string | null) => void;
  onAddGuide?: (guide: CanvasGuide) => void;
  onUpdateGuide?: (id: string, patch: Partial<CanvasGuide>) => void;
  onDuplicateGuide?: (id: string) => void;
  onDeleteGuide?: (id: string) => void;
  onChangeGuidesConfig?: (next: GuidesConfig) => void;
  onOpenGuidesModal?: (tab?: GuidesModalTab) => void;
  onFocusGuidesContext?: () => void;
  wheelNavMode?: WheelNavigationMode;
  // Work Modes: Stage Parallax & Tileset Studio overlays
  workMode?: ProjectWorkMode;
  stageParallaxConfig?: StageParallaxConfig;
  tilesetConfig?: TilesetWorkspaceConfig;
  performanceMode?: PerformanceMode;
  // Visual Canvas Edit Tool (Editar Lienzo)
  canvasEditRect?: CanvasEditRect;
  canvasEditConfig?: CanvasEditConfig;
  hasOffCanvasContent?: boolean;
  onChangeCanvasEditRect?: (next: CanvasEditRect) => void;
  onApplyCanvasEdit?: () => void;
  onResetCanvasEdit?: () => void;
  onCancelCanvasEdit?: () => void;
  // Tiles Tool & Tileset Collection
  tileToolConfig?: TileToolConfig;
  tilesets?: TilesetCollection[];
  onChangeTileToolConfig?: (next: TileToolConfig) => void;
  onCommitTileLayerEdit?: (pixels: (string | null)[][], tileMapData: Record<string, string>) => void;
}

const HITBOX_RENDER_STYLES: Record<HitboxType, { stroke: string; fill: string; label: string }> = {
  hurtbox: { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.15)', label: 'HURTBOX' },
  hitbox: { stroke: '#ef4444', fill: 'rgba(239, 68, 68, 0.22)', label: 'ACTIVE HITBOX' },
  pushbox: { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.15)', label: 'PUSHBOX' },
  throwbox: { stroke: '#a855f7', fill: 'rgba(168, 85, 247, 0.20)', label: 'THROWBOX' },
  counterbox: { stroke: '#06b6d4', fill: 'rgba(6, 182, 212, 0.20)', label: 'COUNTERBOX' },
  clashbox: { stroke: '#f97316', fill: 'rgba(249, 115, 22, 0.20)', label: 'CLASHBOX' },
  armorbox: { stroke: '#e2e8f0', fill: 'rgba(226, 232, 240, 0.20)', label: 'ARMORBOX' },
};

export const CanvasViewport: React.FC<CanvasViewportProps> = ({
  width,
  height,
  currentFrame,
  currentLayer,
  previousFrame,
  nextFrame,
  onionSkinEnabled,
  onionSkinOpacity,
  onionSkinPrev = 1,
  onionSkinNext = 0,
  currentFrameIndex = 0,
  onSelectFrame,
  linkMoveAllFrames = false,
  onShiftAllFramesLayer,
  showMiniPlayerProp = true,
  showGrid,
  showHitboxes,
  showPivot,
  globalPivot,
  onUpdatePivot,
  stageType,
  stageOpacity,
  groundConfig,
  dummyOpponent,
  combatFx,
  symmetryEnabled,
  symmetryAxis,
  symmetryConfig,
  onChangeSymmetryConfig,
  activeTool,
  moveSubTool = 'move_object',
  onChangeMoveSubTool,
  selectionSubTool = 'general',
  onSelectLayerIndex,
  bucketSubTool = 'solid',
  gradientConfig = DEFAULT_GRADIENT_CONFIG,
  shapeConfig = DEFAULT_SHAPE_CONFIG,
  onChangeShapeConfig,
  selectionDisplayConfig = DEFAULT_SELECTION_DISPLAY_CONFIG,
  zoomToolMode = 'in',
  zoomCommand = null,
  brushSize,
  pixelPerfect,
  ditherPattern,
  ditherConfig,
  marqueeShape = 'rect',
  lassoMode = 'free',
  clipOutsideCanvas = false,
  liveCanvasPreview = null,
  activeHitboxType,
  primaryColor,
  primaryAlpha,
  secondaryColor,
  onUpdateLayerPixels,
  onUpdateHitboxes,
  onPickColor,
  allFrames,
  isPlaying,
  onTogglePlay,
  playbackMode,
  brushSettings = DEFAULT_BRUSH_SETTINGS,
  selection: controlledSelection,
  onChangeSelection,
  onCreateTextLayer,
  references = [],
  referenceGroups = [],
  activeReferenceId = null,
  onSelectReference,
  onUpdateReference,
  onBringReferenceToFront,
  pureRefConfig = { enabled: false, alwaysOnTop: true, globalOpacity: 1, panX: 0, panY: 0, zoom: 1 },
  onChangePureRefConfig,
  onCenterAllReferences,
  onDropLibraryAssetAt,
  combatTestActive = false,
  onExitCombatTest,
  layerGroups = [],
  editingMask = false,
  onUpdateLayerMaskPixels,
  transformSession = null,
  transformSnapConfig = { grid: true, pixel: true, guides: true, edges: true, objects: true },
  onChangeTransformParams,
  onChangeTransformSnapConfig,
  onCommitTransform,
  onCancelTransform,
  onTriggerTransformAction,
  selectedLayersCount = 1,
  selectedFramesCount = 1,
  hasActiveGroup = false,
  vectorConfig,
  onChangeVectorConfig,
  selectedVectorPathId = null,
  onSelectVectorPathId,
  selectedVectorNodeIds = [],
  onSelectVectorNodeIds,
  onUpdateLayerVectorPaths,
  onConvertVectorPath,
  eyedropperConfig,
  activePaletteColors = [],
  colorHistory = [],
  onSampledColorUpdate,
  dummiePose = null,
  onChangeDummiePose,
  cameraShake,
  cameraKeyframes = [],
  cameraShakeTestNonce = 0,
  selectedHitboxId: controlledSelectedHitboxId,
  onSelectHitboxId,
  vectorConfirmPolicy = 'keep',
  onChangeVectorConfirmPolicy,
  showPixelPerfectVectorPreview = true,
  onTogglePixelPerfectVectorPreview,
  onBakeVectorPath,
  onUiContextFocus,
  onSmartDelete,
  eraserOptions = DEFAULT_ERASER_OPTIONS,
  bucketOptions = DEFAULT_BUCKET_OPTIONS,
  magicWandOptions = DEFAULT_MAGIC_WAND_OPTIONS,
  selectionOptions = DEFAULT_SELECTION_OPTIONS,
  moveOptions = DEFAULT_MOVE_OPTIONS,
  selectedParametricShapeId = null,
  onSelectParametricShapeId,
  onUpdateLayerParametricShapes,
  onRasterizeParametricShape,
  shapeRasterPolicy = 'keep_editable',
  guides = [],
  guidesConfig = DEFAULT_GUIDES_CONFIG,
  selectedGuideId = null,
  onSelectGuide,
  onAddGuide,
  onUpdateGuide,
  onDuplicateGuide,
  onDeleteGuide,
  onChangeGuidesConfig,
  onOpenGuidesModal,
  onFocusGuidesContext,
  wheelNavMode = 'pan',
  workMode = 'fighter',
  stageParallaxConfig,
  tilesetConfig,
  performanceMode = 'balanced',
  onCommitTiledLayerEdit,
  canvasEditRect,
  canvasEditConfig,
  hasOffCanvasContent = false,
  onChangeCanvasEditRect,
  onApplyCanvasEdit,
  onResetCanvasEdit,
  onCancelCanvasEdit,
  tileToolConfig = DEFAULT_TILE_TOOL_CONFIG,
  tilesets = [],
  onChangeTileToolConfig,
  onCommitTileLayerEdit,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasBoxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement>(null);
  const draftTiledStoreRef = useRef<TiledLayerStore | null>(null);

  // Viewport size observer for virtualized large-canvas backing buffer & dynamic fit
  const [viewportSize, setViewportSize] = useState<{ w: number; h: number }>({ w: 1280, h: 800 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const syncSize = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setViewportSize((prev) =>
          Math.abs(prev.w - r.width) > 2 || Math.abs(prev.h - r.height) > 2
            ? { w: Math.round(r.width), h: Math.round(r.height) }
            : prev
        );
      }
    };
    syncSize();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(syncSize);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', syncSize);
    return () => window.removeEventListener('resize', syncSize);
  }, []);

  // Viewport pan & zoom
  const [zoom, setZoom] = useState<number>(12);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dynamic minimum zoom: allows zooming far out on giant 4000px / 10000px / 32000px canvases
  const minZoom = useMemo(() => {
    const maxDim = Math.max(width, height, 1);
    if (maxDim <= 1024) return 1;
    const fitAll = Math.min((viewportSize.w - 64) / maxDim, (viewportSize.h - 64) / maxDim);
    return Math.max(0.01, Math.min(1, Number((fitAll * 0.5).toFixed(4))));
  }, [width, height, viewportSize.w, viewportSize.h]);

  // Virtualized backing canvas rectangle (capped at 4096x4096 GPU-safe buffer)
  const isVirtualViewportMode =
    width * zoom > 3840 || height * zoom > 3840 || isFrameTiled(currentFrame);

  const virtualRect = useMemo(() => {
    const fullW = Math.max(1, Math.round(width * zoom));
    const fullH = Math.max(1, Math.round(height * zoom));
    if (!isVirtualViewportMode) {
      return {
        left: 0,
        top: 0,
        width: fullW,
        height: fullH,
        minWorldX: 0,
        minWorldY: 0,
        maxWorldX: width,
        maxWorldY: height,
      };
    }

    const MARGIN = 160;
    const MAX_BACKING = 4096;
    const visLeft = Math.floor(-pan.x - MARGIN);
    const visTop = Math.floor(-pan.y - MARGIN);
    const visRight = Math.ceil(-pan.x + viewportSize.w + MARGIN);
    const visBottom = Math.ceil(-pan.y + viewportSize.h + MARGIN);

    let left = Math.max(0, Math.min(fullW - 1, visLeft));
    let top = Math.max(0, Math.min(fullH - 1, visTop));
    let right = Math.max(left + 1, Math.min(fullW, visRight));
    let bottom = Math.max(top + 1, Math.min(fullH, visBottom));

    if (right - left > MAX_BACKING) {
      const midX = Math.round((left + right) / 2);
      left = Math.max(0, Math.min(fullW - MAX_BACKING, midX - Math.floor(MAX_BACKING / 2)));
      right = Math.min(fullW, left + MAX_BACKING);
    }
    if (bottom - top > MAX_BACKING) {
      const midY = Math.round((top + bottom) / 2);
      top = Math.max(0, Math.min(fullH - MAX_BACKING, midY - Math.floor(MAX_BACKING / 2)));
      bottom = Math.min(fullH, top + MAX_BACKING);
    }

    const vW = Math.max(1, right - left);
    const vH = Math.max(1, bottom - top);

    return {
      left,
      top,
      width: vW,
      height: vH,
      minWorldX: Math.max(0, Math.floor(left / Math.max(0.0001, zoom))),
      minWorldY: Math.max(0, Math.floor(top / Math.max(0.0001, zoom))),
      maxWorldX: Math.min(width, Math.ceil((left + vW) / Math.max(0.0001, zoom))),
      maxWorldY: Math.min(height, Math.ceil((top + vH) / Math.max(0.0001, zoom))),
    };
  }, [isVirtualViewportMode, width, height, zoom, pan.x, pan.y, viewportSize.w, viewportSize.h]);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  panStartRef.current = panStart;

  // Spacebar pan mode & live viewport pointer / guide snap highlight
  const [isSpaceDown, setIsSpaceDown] = useState<boolean>(false);
  const [cursorClientPos, setCursorClientPos] = useState<{ x: number; y: number } | null>(null);
  const [snappedGuideIds, setSnappedGuideIds] = useState<{ xId: string | null; yId: string | null }>({
    xId: null,
    yId: null,
  });
  const wheelDeltaAccumulator = useRef<number>(0);

  // Global window drag tracking while panning so Hand / Space / Middle-click pans seamlessly anywhere
  useEffect(() => {
    if (!isPanning) return;
    const handleWinMove = (ev: PointerEvent) => {
      setPan({
        x: ev.clientX - panStartRef.current.x,
        y: ev.clientY - panStartRef.current.y,
      });
    };
    const handleWinUp = () => {
      setIsPanning(false);
    };
    window.addEventListener('pointermove', handleWinMove);
    window.addEventListener('pointerup', handleWinUp);
    window.addEventListener('pointercancel', handleWinUp);
    window.addEventListener('blur', handleWinUp);
    return () => {
      window.removeEventListener('pointermove', handleWinMove);
      window.removeEventListener('pointerup', handleWinUp);
      window.removeEventListener('pointercancel', handleWinUp);
      window.removeEventListener('blur', handleWinUp);
    };
  }, [isPanning]);

  const isGuideSnapEnabled = Boolean(
    guidesConfig.snapToGuides ||
      guidesConfig.snapToRulers ||
      guidesConfig.snapToGrid ||
      (guidesConfig.snapToPerspective && guidesConfig.perspective?.enabled)
  );

  const applyGuideSnap = useCallback(
    (
      rawX: number,
      rawY: number,
      altBypass: boolean = false,
      anchorPoint: { x: number; y: number } | null = null
    ) => {
      if (altBypass || !isGuideSnapEnabled) {
        setSnappedGuideIds((prev) =>
          prev.xId || prev.yId ? { xId: null, yId: null } : prev
        );
        return { x: rawX, y: rawY };
      }
      const res = snapCoordinateToGuides(
        rawX,
        rawY,
        width,
        height,
        guides,
        guidesConfig,
        zoom,
        anchorPoint
      );
      const nextXId = res.guideX?.id || null;
      const nextYId = res.guideY?.id || null;
      setSnappedGuideIds((prev) =>
        prev.xId === nextXId && prev.yId === nextYId ? prev : { xId: nextXId, yId: nextYId }
      );
      return { x: res.x, y: res.y };
    },
    [isGuideSnapEnabled, width, height, guides, guidesConfig, zoom]
  );

  const applyBoundsGuideSnap = useCallback(
    (x: number, y: number, w: number, h: number, altBypass: boolean = false) => {
      if (altBypass || !isGuideSnapEnabled) {
        setSnappedGuideIds((prev) =>
          prev.xId || prev.yId ? { xId: null, yId: null } : prev
        );
        return { x, y };
      }
      const res = snapBoundsToGuides(x, y, w, h, width, height, guides, guidesConfig, zoom);
      const nextXId = res.guideX?.id || null;
      const nextYId = res.guideY?.id || null;
      setSnappedGuideIds((prev) =>
        prev.xId === nextXId && prev.yId === nextYId ? prev : { xId: nextXId, yId: nextYId }
      );
      return { x: res.x, y: res.y };
    },
    [isGuideSnapEnabled, width, height, guides, guidesConfig, zoom]
  );

  // Cursor coordinates
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Drawing state & Stylus Pen Pressure
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [lastDrawnPoint, setLastDrawnPoint] = useState<{ x: number; y: number } | null>(null);
  const strokeHistoryRef = useRef<{ x: number; y: number }[]>([]);
  const draftPixelsRef = useRef<(string | null)[][]>([]);
  const draftMaskRef = useRef<number[][]>([]);
  const isPaintingMaskRef = useRef<boolean>(false);
  const smoothedCoordRef = useRef<{ x: number; y: number } | null>(null);
  const draftTileMapRef = useRef<Record<string, string> | null>(null);
  const tileDragStartCellRef = useRef<{ tx: number; ty: number } | null>(null);
  const tileLastCellRef = useRef<{ tx: number; ty: number } | null>(null);
  const [livePressureInfo, setLivePressureInfo] = useState<{ pressure: number; pointerType: string; size: number } | null>(null);

  const activeTileset = useMemo(
    () => tilesets.find((ts) => ts.id === tileToolConfig.activeTilesetId) || tilesets[0] || null,
    [tilesets, tileToolConfig.activeTilesetId]
  );

  const activeTileItem = useMemo(
    () => activeTileset?.tiles.find((t) => t.id === tileToolConfig.activeTileId) || activeTileset?.tiles[0] || null,
    [activeTileset, tileToolConfig.activeTileId]
  );

  const findTileByKey = useCallback(
    (key: string): TileItem | undefined => {
      const sep = key.indexOf(':');
      if (sep > 0) {
        const tsId = key.slice(0, sep);
        const tId = key.slice(sep + 1);
        const ts = tilesets.find((s) => s.id === tsId);
        const found = ts?.tiles.find((t) => t.id === tId);
        if (found) return found;
      }
      for (const ts of tilesets) {
        const f = ts.tiles.find((t) => t.id === key);
        if (f) return f;
      }
      return activeTileItem || undefined;
    },
    [tilesets, activeTileItem]
  );

  // Live centered brush footprint preview HUD (~900ms when adjusting brush sliders)
  const [showBrushPreviewHud, setShowBrushPreviewHud] = useState<boolean>(false);
  const brushPreviewInitRef = useRef<boolean>(false);
  const brushPreviewTimerRef = useRef<number | null>(null);
  const brushPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const effectivePreviewBrushSize = Math.max(1, brushSettings.size || brushSize);

  useEffect(() => {
    if (!brushPreviewInitRef.current) {
      brushPreviewInitRef.current = true;
      return;
    }
    if (isDrawing) return;
    setShowBrushPreviewHud(true);
    if (brushPreviewTimerRef.current !== null) {
      window.clearTimeout(brushPreviewTimerRef.current);
    }
    brushPreviewTimerRef.current = window.setTimeout(() => {
      setShowBrushPreviewHud(false);
      brushPreviewTimerRef.current = null;
    }, 900);
    return () => {
      if (brushPreviewTimerRef.current !== null) {
        window.clearTimeout(brushPreviewTimerRef.current);
      }
    };
  }, [
    brushSize,
    brushSettings.size,
    brushSettings.hardness,
    brushSettings.opacity,
    brushSettings.flow,
    brushSettings.spacing,
    brushSettings.rotation,
    brushSettings.shape,
    ditherConfig?.enabled,
    ditherConfig?.pattern,
    ditherConfig?.density,
  ]);

  useEffect(() => {
    if (!showBrushPreviewHud) return;
    const canvas = brushPreviewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const sz = Math.max(1, effectivePreviewBrushSize);
    const pxSize = 96;
    canvas.width = pxSize;
    canvas.height = pxSize;
    ctx.clearRect(0, 0, pxSize, pxSize);
    ctx.imageSmoothingEnabled = false;

    const center = Math.floor(pxSize / 2);
    const baseAlpha = Math.max(0.1, Math.min(1, brushSettings.opacity * primaryAlpha));
    const paintColor = activeTool === 'eraser' ? '#f43f5e' : primaryColor;
    const useDither = Boolean(ditherConfig?.enabled);

    if (sz <= 32) {
      const gridCells = Math.max(sz + 4, 10);
      const cellPx = Math.max(2, Math.floor(pxSize / gridCells));
      const stamps = getBrushStampOffsets(sz, brushSettings.shape);
      const halfR = Math.max(1, sz / 2);

      for (const { dx, dy } of stamps) {
        let cellAlpha = baseAlpha;
        if (brushSettings.hardness < 0.99 && sz > 1) {
          const dist = Math.hypot(dx, dy);
          cellAlpha *= Math.max(0.18, 1 - (dist / halfR) * (1 - brushSettings.hardness));
        }
        if (useDither) {
          const checker = ((Math.round(dx) + Math.round(dy)) & 1) === 0;
          if (!checker) continue;
        }
        ctx.globalAlpha = Math.max(0.08, Math.min(1, cellAlpha));
        ctx.fillStyle = paintColor;
        ctx.fillRect(
          center + Math.round(dx * cellPx) - Math.floor(cellPx / 2),
          center + Math.round(dy * cellPx) - Math.floor(cellPx / 2),
          cellPx,
          cellPx
        );
      }
      ctx.globalAlpha = 1;
    } else {
      // Proportional vector footprint for large brushes (>32px): <1ms render & never overflows box
      const maxVisualR = 34;
      const ratio = Math.min(1, Math.log2(sz / 16) / 5);
      const drawR = Math.max(14, Math.round(18 + ratio * (maxVisualR - 18)));
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = baseAlpha;
      ctx.fillStyle = paintColor;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.25;

      if (brushSettings.shape === 'circle' || brushSettings.shape === 'spray') {
        if (brushSettings.hardness < 0.95) {
          const grad = ctx.createRadialGradient(center, center, drawR * Math.max(0.1, brushSettings.hardness * 0.7), center, center, drawR);
          grad.addColorStop(0, paintColor);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
        }
        ctx.beginPath();
        ctx.arc(center, center, drawR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (brushSettings.shape === 'diamond') {
        ctx.beginPath();
        ctx.moveTo(center, center - drawR);
        ctx.lineTo(center + drawR, center);
        ctx.lineTo(center, center + drawR);
        ctx.lineTo(center - drawR, center);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (brushSettings.shape === 'slash_right' || brushSettings.shape === 'slash_left') {
        const dir = brushSettings.shape === 'slash_right' ? -1 : 1;
        ctx.strokeStyle = paintColor;
        ctx.lineWidth = Math.max(4, Math.round(drawR * 0.25));
        ctx.beginPath();
        ctx.moveTo(center - drawR, center - dir * drawR);
        ctx.lineTo(center + drawR, center + dir * drawR);
        ctx.stroke();
      } else {
        ctx.fillRect(center - drawR, center - drawR, drawR * 2, drawR * 2);
        ctx.strokeRect(center - drawR, center - drawR, drawR * 2, drawR * 2);
      }

      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(10, 13, 22, 0.86)';
      ctx.fillRect(pxSize - 42, pxSize - 15, 40, 13);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${sz}px`, pxSize - 4, pxSize - 5);
      ctx.restore();
    }
  }, [
    showBrushPreviewHud,
    effectivePreviewBrushSize,
    brushSettings.shape,
    brushSettings.hardness,
    brushSettings.opacity,
    primaryColor,
    primaryAlpha,
    activeTool,
    ditherConfig?.enabled,
    ditherConfig?.pattern,
    ditherConfig?.density,
  ]);

  // Selection (controlled when onChangeSelection is passed)
  const [dragStartPoint, setDragStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [localSelection, setLocalSelection] = useState<SelectionArea | null>(null);
  const selection = controlledSelection !== undefined ? controlledSelection : localSelection;
  const setSelection = useCallback(
    (next: SelectionArea | null) => {
      if (onChangeSelection) onChangeSelection(next);
      else setLocalSelection(next);
    },
    [onChangeSelection]
  );
  const [newHitboxStart, setNewHitboxStart] = useState<{ x: number; y: number } | null>(null);

  // Text Tool Floating Editor State (Traditional min/max controls + bounding box)
  const [textAnchor, setTextAnchor] = useState<{ x: number; y: number } | null>(null);
  const [textInput, setTextInput] = useState<string>('K.O.!');
  const [textFont, setTextFont] = useState<PixelTextFont>('pixel_5x7');
  const [textScale, setTextScale] = useState<number>(1);
  const [textMaxWidth, setTextMaxWidth] = useState<number>(Math.max(24, width));
  const [textMaxHeight, setTextMaxHeight] = useState<number>(Math.max(16, height));
  const [textLetterSpacing, setTextLetterSpacing] = useState<number>(1);
  const [textLineHeight, setTextLineHeight] = useState<number>(2);
  const [textAlign, setTextAlign] = useState<PixelTextAlign>('left');
  const [textOutline, setTextOutline] = useState<boolean>(true);
  const [textShadow, setTextShadow] = useState<boolean>(true);
  const [textGradient, setTextGradient] = useState<boolean>(false);
  const [isDraggingTextBox, setIsDraggingTextBox] = useState<boolean>(false);
  const textDragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Move / Cursor / Hitbox Tool Interactive States (Hitbox, Resize Handles, Pivot, Content)
  type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
  const [localSelectedHitboxId, setLocalSelectedHitboxId] = useState<string | null>(null);
  const selectedHitboxId =
    controlledSelectedHitboxId !== undefined ? controlledSelectedHitboxId : localSelectedHitboxId;
  const setSelectedHitboxId = useCallback(
    (id: string | null) => {
      if (onSelectHitboxId) onSelectHitboxId(id);
      else setLocalSelectedHitboxId(id);
    },
    [onSelectHitboxId]
  );
  const [draggingHitboxId, setDraggingHitboxId] = useState<string | null>(null);
  const [hitboxDragOffset, setHitboxDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [resizingHitbox, setResizingHitbox] = useState<{
    id: string;
    handle: ResizeHandle;
    orig: Hitbox;
    startGrid: { x: number; y: number };
  } | null>(null);
  const [isDraggingPivot, setIsDraggingPivot] = useState<boolean>(false);
  const [isDraggingContent, setIsDraggingContent] = useState<boolean>(false);
  const [contentDragStart, setContentDragStart] = useState<{ x: number; y: number } | null>(null);
  const contentOriginalPixelsRef = useRef<(string | null)[][] | null>(null);
  const contentOriginalOffCanvasRef = useRef<Record<string, string> | undefined>(undefined);
  const draftOffCanvasRef = useRef<Record<string, string> | undefined>(undefined);
  const lastContentDeltaRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [hoveredHitboxId, setHoveredHitboxId] = useState<string | null>(null);
  const [hoveredPivot, setHoveredPivot] = useState<boolean>(false);

  // Freehand / Polygonal / Magnetic Lasso & Marching Ants Selection State
  const [lassoSites, setLassoSites] = useState<{ x: number; y: number }[]>([]);
  const [polygonLassoPts, setPolygonLassoPts] = useState<{ x: number; y: number }[]>([]);
  const [magneticLassoPts, setMagneticLassoPts] = useState<{ x: number; y: number }[]>([]);
  const [magneticPreviewSeg, setMagneticPreviewSeg] = useState<{ x: number; y: number }[]>([]);
  const magneticEdgeMapRef = useRef<EdgeMapData | null>(null);
  const marchingAntsOffsetRef = useRef<number>(0);

  // Temporary Ctrl -> Direct Select while Line tool is active
  const [isCtrlTempDirectSelect, setIsCtrlTempDirectSelect] = useState<boolean>(false);

  // Gradient / Dithered Gradient interactive drag state
  const [gradientDrag, setGradientDrag] = useState<{
    start: { x: number; y: number };
    end: { x: number; y: number };
  } | null>(null);

  // Zoom (Lupa) region drag & custom percent input
  const [zoomRegionDrag, setZoomRegionDrag] = useState<{
    startClientX: number;
    startClientY: number;
    endClientX: number;
    endClientY: number;
    startGrid: { x: number; y: number };
    endGrid: { x: number; y: number };
    altKey: boolean;
  } | null>(null);
  // Parametric Shape live draft, handle dragging & raster prompt
  const [creatingShapeDraft, setCreatingShapeDraft] = useState<ParametricShapeObject | null>(null);
  const creatingShapeDraftRef = useRef<ParametricShapeObject | null>(null);
  const [pendingShapeRasterPromptId, setPendingShapeRasterPromptId] = useState<string | null>(null);
  const shapeLiveOverrideRef = useRef<ParametricShapeObject | null>(null);
  const shapeDragRef = useRef<{
    shapeId: string;
    handleKind: ParametricHandleKind;
    origShape: ParametricShapeObject;
    startGrid: { x: number; y: number };
    startAngle?: number;
    dragHud?: string;
  } | null>(null);
  const prevSelectionBeforeDragRef = useRef<SelectionArea | null>(null);

  // Smart Move overlapping disambiguation menu
  const [moveDisambigMenu, setMoveDisambigMenu] = useState<{
    clientX: number;
    clientY: number;
    gridCoord: { x: number; y: number };
    candidates: Array<{
      id: string;
      kind: 'reference' | 'vector' | 'hitbox' | 'pivot' | 'selection' | 'layer';
      label: string;
      detail: string;
      targetId?: string;
    }>;
  } | null>(null);

  const isDirectSelectActive =
    activeTool === 'direct_select' ||
    (activeTool === 'move' && moveSubTool === 'direct_select') ||
    (activeTool === 'select' && selectionSubTool === 'nodes') ||
    (activeTool === 'line' && isCtrlTempDirectSelect);

  const effTool: ToolType = activeTool === 'vector_select' ? 'move' : activeTool;
  const effDitherConfig: DitherConfig = ditherConfig || {
    ...DEFAULT_DITHER_CONFIG,
    pattern: ditherPattern,
  };
  const effSymmetry: SymmetryConfig = symmetryConfig
    ? symmetryConfig
    : {
        ...DEFAULT_SYMMETRY_CONFIG,
        enabled: symmetryEnabled,
        mode: symmetryEnabled ? 'vertical' : 'none',
        axisX: symmetryAxis,
        axisY: Number(((height - 1) / 2).toFixed(1)),
        lineP1: { x: 0, y: Math.floor(height / 2) },
        lineP2: { x: width, y: Math.floor(height / 2) },
      };

  const symHandleDragRef = useRef<'center' | 'p1' | 'p2' | null>(null);
  const [transformHoverRotCorner, setTransformHoverRotCorner] = useState<{
    cornerX: number;
    cornerY: number;
  } | null>(null);

  // Mini preview & Hitstop
  const [showMiniPlayer, setShowMiniPlayer] = useState<boolean>(showMiniPlayerProp);
  useEffect(() => {
    setShowMiniPlayer(showMiniPlayerProp);
  }, [showMiniPlayerProp]);
  const [previewScale, setPreviewScale] = useState<number>(3);
  const [playbackFrameIndex, setPlaybackFrameIndex] = useState<number>(0);
  const playbackDirectionRef = useRef<number>(1);
  const hitstopFreezeTicksRef = useRef<number>(0);
  const [screenShakeOffset, setScreenShakeOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const animPhaseTimeRef = useRef<number>(0);

  // Reference image cache + static canvas-anchored references composite cache + live compose canvas
  const refImageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const refImageVersionRef = useRef<number>(0);
  const refLayerCacheRef = useRef<{ sig: string; canvas: HTMLCanvasElement } | null>(null);
  const liveComposeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [draggingReferenceId, setDraggingReferenceId] = useState<string | null>(null);
  const refDragStartRef = useRef<{
    kind: 'move' | 'scale' | 'rotate';
    clientX: number;
    clientY: number;
    origX: number;
    origY: number;
    origScale: number;
    origRotation: number;
    centerClientX: number;
    centerClientY: number;
    origDist?: number;
    startAngle?: number;
  } | null>(null);
  const camRefDragRef = useRef<{
    kind: 'move' | 'scale' | 'rotate' | 'pan_board';
    refId?: string;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
    origScale: number;
    origRotation: number;
    centerClientX: number;
    centerClientY: number;
    origDist?: number;
    startAngle?: number;
  } | null>(null);
  const selectionMoveRef = useRef<{
    startGrid: { x: number; y: number };
    origSel: SelectionArea;
    baseWithoutSel: (string | null)[][];
    extracted: { dx: number; dy: number; color: string }[];
  } | null>(null);
  const [isAssetDragOver, setIsAssetDragOver] = useState<boolean>(false);

  // Transform Interactive Drag State
  type TransformDragKind =
    | { kind: 'move'; startMouse: { x: number; y: number }; startParams: TransformParameters }
    | { kind: 'rotate'; center: { x: number; y: number }; startAngle: number; startRot: number }
    | { kind: 'pivot'; startParams: TransformParameters }
    | { kind: 'handle'; handleIdx: number; handleRole: string; startMouse: { x: number; y: number }; startParams: TransformParameters }
    | { kind: 'warp_center'; startMouse: { x: number; y: number }; startParams: TransformParameters };
  const transformDragRef = useRef<TransformDragKind | null>(null);

  // Vector Line / Curve Interactive Drag State
  type VectorDragKind =
    | { kind: 'node'; startGrid: { x: number; y: number }; origNodes: Map<string, VectorNode> }
    | { kind: 'whole_path'; pathId: string; startGrid: { x: number; y: number }; origNodes: VectorNode[] }
    | { kind: 'handle'; nodeId: string; handleKind: 'in' | 'out' }
    | { kind: 'segment_bend'; segIndex: number; lastGrid: { x: number; y: number } }
    | { kind: 'new_straight'; pathId: string; startPt: { x: number; y: number } }
    | { kind: 'new_bezier_handle'; pathId: string; nodeId: string }
    | { kind: 'freehand'; pathId: string; rawPts: { x: number; y: number; width: number }[] };
  const vectorDragRef = useRef<VectorDragKind | null>(null);
  const [vectorMarquee, setVectorMarquee] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [vectorHoverCoord, setVectorHoverCoord] = useState<{ x: number; y: number } | null>(null);
  const [vectorDraftSession, setVectorDraftSession] = useState<{
    pathId: string;
    phase: 'placing' | 'editing';
    priorPathsSnapshot: VectorPath[];
  } | null>(null);
  const [vectorConfirmModalPath, setVectorConfirmModalPath] = useState<VectorPath | null>(null);

  // Camera Shake Event Ref & Explicit Test Trigger
  const shakeEventRef = useRef<{ start: number; until: number; cfg: CameraShakeConfig } | null>(null);
  const triggerCameraShakeEvent = useCallback(
    (overrideCfg?: CameraShakeConfig) => {
      const cfg = overrideCfg || cameraShake || {
        enabled: true,
        intensity: 4,
        durationMs: 240,
        frequencyHz: 28,
        direction: 'both',
      };
      const now = performance.now();
      shakeEventRef.current = {
        start: now,
        until: now + Math.max(40, cfg.durationMs || 220),
        cfg,
      };
    },
    [cameraShake]
  );

  useEffect(() => {
    if (cameraShakeTestNonce > 0) {
      triggerCameraShakeEvent({
        ...(cameraShake || { enabled: true, intensity: 4, durationMs: 260, frequencyHz: 28, direction: 'both' }),
        enabled: true,
      });
    }
  }, [cameraShakeTestNonce, cameraShake, triggerCameraShakeEvent]);

  // Helper: Bake/Finalize or Cancel Non-Destructive Vector Draft
  const finalizeVectorPathWithMode = useCallback(
    (targetPath: VectorPath, mode: 'keep' | 'rasterize') => {
      if (!onUpdateLayerVectorPaths) return;
      if (mode === 'rasterize') {
        const previewCells = rasterizeVectorPathPreviewCells(targetPath, width, height);
        const nextGrid = currentLayer.pixels.map((row) => [...row]);
        for (const cell of previewCells) {
          const pts =
            effSymmetry.enabled && effSymmetry.mode !== 'none'
              ? computeSymmetricPoints(cell.x, cell.y, width, height, effSymmetry, true)
              : [{ x: cell.x, y: cell.y }];
          for (const pt of pts) {
            if (pt.x >= 0 && pt.x < width && pt.y >= 0 && pt.y < height) {
              nextGrid[pt.y][pt.x] = targetPath.color || primaryColor;
            }
          }
        }
        const finalGrid = currentLayer.lockTransparency
          ? applyTransparencyLock(currentLayer.pixels, nextGrid)
          : nextGrid;
        if (onBakeVectorPath) {
          onBakeVectorPath(targetPath, finalGrid);
        } else {
          onUpdateLayerPixels(finalGrid, currentLayer.offCanvasPixels);
          onUpdateLayerVectorPaths(
            (currentLayer.vectorPaths || []).filter((p) => p.id !== targetPath.id)
          );
        }
      }
      setVectorDraftSession(null);
      setVectorHoverCoord(null);
      setVectorConfirmModalPath(null);
      onSelectVectorPathId?.(null);
      onSelectVectorNodeIds?.([]);
    },
    [
      onUpdateLayerVectorPaths,
      width,
      height,
      currentLayer,
      effSymmetry,
      primaryColor,
      onBakeVectorPath,
      onUpdateLayerPixels,
      onSelectVectorPathId,
      onSelectVectorNodeIds,
    ]
  );

  const handleConfirmVectorDraft = useCallback(() => {
    const activePath =
      (currentLayer.vectorPaths || []).find(
        (p) => p.id === (vectorDraftSession?.pathId || selectedVectorPathId)
      ) || null;
    if (!activePath) {
      setVectorDraftSession(null);
      setVectorHoverCoord(null);
      onSelectVectorPathId?.(null);
      onSelectVectorNodeIds?.([]);
      return;
    }
    if (vectorConfirmPolicy === 'ask') {
      setVectorConfirmModalPath(activePath);
      return;
    }
    finalizeVectorPathWithMode(
      activePath,
      vectorConfirmPolicy === 'rasterize' ? 'rasterize' : 'keep'
    );
  }, [
    currentLayer.vectorPaths,
    vectorDraftSession,
    selectedVectorPathId,
    vectorConfirmPolicy,
    finalizeVectorPathWithMode,
    onSelectVectorPathId,
    onSelectVectorNodeIds,
  ]);

  const handleCancelVectorDraft = useCallback(() => {
    if (vectorDraftSession && onUpdateLayerVectorPaths) {
      onUpdateLayerVectorPaths(vectorDraftSession.priorPathsSnapshot);
    }
    setVectorDraftSession(null);
    setVectorHoverCoord(null);
    setVectorConfirmModalPath(null);
    onSelectVectorPathId?.(null);
    onSelectVectorNodeIds?.([]);
  }, [vectorDraftSession, onUpdateLayerVectorPaths, onSelectVectorPathId, onSelectVectorNodeIds]);

  // Pro Eyedropper Floating HUD State
  const effEyedropperConfig = eyedropperConfig || DEFAULT_EYEDROPPER_CONFIG;
  const [hoveredSample, setHoveredSample] = useState<SampledColorInfo | null>(null);
  const [eyedropperScreenPos, setEyedropperScreenPos] = useState<{ x: number; y: number } | null>(null);

  // Live Canvas Dummie Joint Drag State
  const [draggingDummieJointId, setDraggingDummieJointId] = useState<string | null>(null);

  // Real-Time Playable Combat Test Mode State
  const combatKeysRef = useRef<Record<string, boolean>>({});
  const combatStateRef = useRef<{
    p1X: number;
    p1Y: number;
    p1Vy: number;
    p1Hp: number;
    p2Hp: number;
    combo: number;
    attacking: boolean;
    attackFrameIdx: number;
    attackTimerMs: number;
    hitCooldownMs: number;
    lastHitBanner: string;
  }>({
    p1X: 0,
    p1Y: 0,
    p1Vy: 0,
    p1Hp: 100,
    p2Hp: 100,
    combo: 0,
    attacking: false,
    attackFrameIdx: 0,
    attackTimerMs: 0,
    hitCooldownMs: 0,
    lastHitBanner: '',
  });
  const [combatHud, setCombatHud] = useState({ p1Hp: 100, p2Hp: 100, combo: 0, banner: '' });

  // Sync playbackFrameIndex when playback starts
  useEffect(() => {
    if (isPlaying && currentFrameIndex !== undefined) {
      setPlaybackFrameIndex(currentFrameIndex);
    }
  }, [isPlaying, currentFrameIndex]);

  // Reset combat test state when entered
  useEffect(() => {
    if (!combatTestActive) {
      combatKeysRef.current = {};
      return;
    }
    combatStateRef.current = {
      p1X: -6,
      p1Y: 0,
      p1Vy: 0,
      p1Hp: 100,
      p2Hp: 100,
      combo: 0,
      attacking: false,
      attackFrameIdx: 0,
      attackTimerMs: 0,
      hitCooldownMs: 0,
      lastHitBanner: 'COMBATE ACTIVO',
    };
    setCombatHud({ p1Hp: 100, p2Hp: 100, combo: 0, banner: 'COMBATE ACTIVO' });

    const onKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      const k = e.key.toLowerCase();
      combatKeysRef.current[k] = true;
      if (k === 'escape') {
        onExitCombatTest?.();
      } else if (k === 'r') {
        combatStateRef.current.p1X = -6;
        combatStateRef.current.p1Y = 0;
        combatStateRef.current.p1Vy = 0;
        combatStateRef.current.p1Hp = 100;
        combatStateRef.current.p2Hp = 100;
        combatStateRef.current.combo = 0;
        combatStateRef.current.lastHitBanner = 'ROUND RESET';
        setCombatHud({ p1Hp: 100, p2Hp: 100, combo: 0, banner: 'ROUND RESET' });
      } else if (['j', 'k', 'l', ' '].includes(k) && !combatStateRef.current.attacking) {
        combatStateRef.current.attacking = true;
        combatStateRef.current.attackFrameIdx = 0;
        combatStateRef.current.attackTimerMs = 0;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      combatKeysRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [combatTestActive, onExitCombatTest]);

  // Center once on load & auto-fit cleanly whenever document dimensions change to a large canvas
  const initializedRef = useRef<boolean>(false);
  const lastDimsRef = useRef<{ w: number; h: number }>({ w: width, h: height });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const dimsChanged = lastDimsRef.current.w !== width || lastDimsRef.current.h !== height;
    if (!initializedRef.current || (dimsChanged && (width > 256 || height > 256 || lastDimsRef.current.w > 256 || lastDimsRef.current.h > 256))) {
      const rect = el.getBoundingClientRect();
      const rawFit = Math.min(
        Math.max(120, rect.width - 96) / Math.max(1, width),
        Math.max(120, rect.height - 96) / Math.max(1, height)
      );
      const safeZoom =
        width <= 96 && height <= 96
          ? Math.max(1, Math.min(12, Math.floor(rawFit)))
          : rawFit >= 1
          ? Math.max(1, Math.min(12, Math.floor(rawFit)))
          : Math.max(0.01, Number(rawFit.toFixed(4)));
      setZoom(safeZoom);
      setPan({
        x: Math.round((rect.width - width * safeZoom) / 2),
        y: Math.round((rect.height - height * safeZoom) / 2),
      });
      initializedRef.current = true;
      lastDimsRef.current = { w: width, h: height };
    } else if (dimsChanged) {
      lastDimsRef.current = { w: width, h: height };
    }
  }, [width, height]);

  // Sync temporary Ctrl -> Direct Select when activeTool changes
  useEffect(() => {
    if (activeTool !== 'line') {
      setIsCtrlTempDirectSelect(false);
    }
    if (activeTool !== 'lasso' || lassoMode !== 'magnetic') {
      setMagneticLassoPts([]);
      setMagneticPreviewSeg([]);
      magneticEdgeMapRef.current = null;
    }
    if (activeTool !== 'move') {
      setMoveDisambigMenu(null);
    }
  }, [activeTool, lassoMode]);

  const commitPolygonPointsToSelection = useCallback(
    (pts: { x: number; y: number }[], shape: 'polygon' | 'lasso') => {
      if (pts.length < 3) return;
      let minX = width - 1,
        maxX = 0,
        minY = height - 1,
        maxY = 0;
      const mask: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));
      for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
          let inside = false;
          for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            const xi = pts[i].x,
              yi = pts[i].y;
            const xj = pts[j].x,
              yj = pts[j].y;
            const intersect =
              (yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi || 1e-6) + xi;
            if (intersect) inside = !inside;
          }
          if (inside) {
            mask[py][px] = true;
            if (px < minX) minX = px;
            if (px > maxX) maxX = px;
            if (py < minY) minY = py;
            if (py > maxY) maxY = py;
          }
        }
      }
      for (const pt of pts) {
        if (pt.x >= 0 && pt.x < width && pt.y >= 0 && pt.y < height) {
          mask[pt.y][pt.x] = true;
          if (pt.x < minX) minX = pt.x;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.y > maxY) maxY = pt.y;
        }
      }
      setSelection({
        active: true,
        startX: Math.max(0, minX),
        startY: Math.max(0, minY),
        endX: Math.min(width - 1, maxX),
        endY: Math.min(height - 1, maxY),
        shape,
        mask,
      });
    },
    [width, height, setSelection]
  );

  // Keyboard listener for Spacebar pan, Ctrl temp Direct Select on Line, Ctrl+D / Escape / Enter / Delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName);
      if (e.code === 'Space' && !isInput) {
        e.preventDefault();
        setIsSpaceDown(true);
      }
      if ((e.key === 'Control' || e.key === 'Meta') && !isInput && activeTool === 'line') {
        setIsCtrlTempDirectSelect(true);
      }
      // Ctrl+D or Escape to deselect active marquee/lasso/hitbox
      if (!isInput && ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd')) {
        e.preventDefault();
        setSelection(null);
      }
      if (!isInput && e.key === 'Escape') {
        if (moveDisambigMenu) {
          e.preventDefault();
          setMoveDisambigMenu(null);
          return;
        }
        if (vectorConfirmModalPath) {
          e.preventDefault();
          setVectorConfirmModalPath(null);
          return;
        }
        if (vectorDraftSession) {
          e.preventDefault();
          handleCancelVectorDraft();
          return;
        }
        if (transformSession && onCancelTransform) {
          e.preventDefault();
          onCancelTransform();
          return;
        }
        setSelection(null);
        setLassoSites([]);
        setPolygonLassoPts([]);
        setMagneticLassoPts([]);
        setMagneticPreviewSeg([]);
        setGradientDrag(null);
        setZoomRegionDrag(null);
        setSelectedHitboxId(null);
        onSelectVectorPathId?.(null);
        onSelectVectorNodeIds?.([]);
      }
      if (
        !isInput &&
        e.key === 'Enter' &&
        !transformSession &&
        (vectorDraftSession || ((effTool === 'line' || isDirectSelectActive) && selectedVectorPathId))
      ) {
        e.preventDefault();
        handleConfirmVectorDraft();
        return;
      }
      if (!isInput && e.key === 'Enter' && effTool === 'lasso' && polygonLassoPts.length >= 3) {
        e.preventDefault();
        commitPolygonPointsToSelection(polygonLassoPts, 'polygon');
        setPolygonLassoPts([]);
        return;
      }
      if (!isInput && e.key === 'Enter' && effTool === 'lasso' && magneticLassoPts.length >= 3) {
        e.preventDefault();
        const edgeMap = magneticEdgeMapRef.current;
        let finalPts = [...magneticLassoPts];
        if (edgeMap && finalPts.length >= 2) {
          const closing = traceMagneticLassoSegment(finalPts[finalPts.length - 1], finalPts[0], edgeMap);
          finalPts = [...finalPts, ...closing];
        }
        commitPolygonPointsToSelection(finalPts, 'lasso');
        setMagneticLassoPts([]);
        setMagneticPreviewSeg([]);
        magneticEdgeMapRef.current = null;
        return;
      }
      if (!isInput && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (onSmartDelete && e.key === 'Delete' && vectorDraftSession?.phase !== 'placing') {
          e.preventDefault();
          onSmartDelete();
          return;
        }
        if (
          (effTool === 'line' || isDirectSelectActive) &&
          selectedVectorPathId &&
          selectedVectorNodeIds.length > 0 &&
          onUpdateLayerVectorPaths &&
          currentLayer.vectorPaths
        ) {
          e.preventDefault();
          const delSet = new Set(selectedVectorNodeIds);
          const nextPaths = currentLayer.vectorPaths
            .map((p) =>
              p.id === selectedVectorPathId
                ? { ...p, nodes: p.nodes.filter((n) => !delSet.has(n.id)) }
                : p
            )
            .filter((p) => p.nodes.length >= 1);
          onUpdateLayerVectorPaths(nextPaths);
          onSelectVectorNodeIds?.([]);
          return;
        }
        if (selection && selection.active && !currentLayer.locked) {
          e.preventDefault();
          const minX = Math.max(0, Math.min(selection.startX, selection.endX));
          const maxX = Math.min(width - 1, Math.max(selection.startX, selection.endX));
          const minY = Math.max(0, Math.min(selection.startY, selection.endY));
          const maxY = Math.min(height - 1, Math.max(selection.startY, selection.endY));
          const cleared = currentLayer.pixels.map((r) => [...r]);
          for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
              if (!selection.mask || selection.mask[y]?.[x]) {
                cleared[y][x] = null;
              }
            }
          }
          onUpdateLayerPixels(cleared, currentLayer.offCanvasPixels);
        } else if (selectedHitboxId && showHitboxes) {
          e.preventDefault();
          onUpdateHitboxes((currentFrame.hitboxes || []).filter((h) => h.id !== selectedHitboxId));
          setSelectedHitboxId(null);
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceDown(false);
      }
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsCtrlTempDirectSelect(false);
      }
    };
    const handleBlur = () => {
      setIsSpaceDown(false);
      setIsCtrlTempDirectSelect(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [
    activeTool,
    selection,
    currentLayer,
    width,
    height,
    onUpdateLayerPixels,
    selectedHitboxId,
    setSelectedHitboxId,
    showHitboxes,
    currentFrame.hitboxes,
    onUpdateHitboxes,
    transformSession,
    onCancelTransform,
    effTool,
    isDirectSelectActive,
    polygonLassoPts,
    magneticLassoPts,
    moveDisambigMenu,
    commitPolygonPointsToSelection,
    selectedVectorPathId,
    selectedVectorNodeIds,
    onUpdateLayerVectorPaths,
    onSelectVectorPathId,
    onSelectVectorNodeIds,
    setSelection,
    vectorDraftSession,
    vectorConfirmModalPath,
    handleCancelVectorDraft,
    handleConfirmVectorDraft,
    onSmartDelete,
  ]);

  const zoomAtClientPoint = useCallback(
    (targetZoom: number, clientX?: number, clientY?: number) => {
      const clampedZoom = Math.max(minZoom, Math.min(96, Number(targetZoom.toFixed(4))));
      const container = containerRef.current;
      if (!container) {
        setZoom(clampedZoom);
        return;
      }
      const rect = container.getBoundingClientRect();
      const cx = clientX !== undefined ? clientX - rect.left : rect.width / 2;
      const cy = clientY !== undefined ? clientY - rect.top : rect.height / 2;
      setZoom((prevZoom) => {
        if (Math.abs(prevZoom - clampedZoom) < 0.0005) return prevZoom;
        const ratio = clampedZoom / Math.max(0.005, prevZoom);
        setPan((prevPan) => ({
          x: cx - (cx - prevPan.x) * ratio,
          y: cy - (cy - prevPan.y) * ratio,
        }));
        return clampedZoom;
      });
    },
    [minZoom]
  );

  const handleFitToWindow = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const rawFit = Math.min(
      Math.max(80, rect.width - 96) / Math.max(1, width),
      Math.max(80, rect.height - 96) / Math.max(1, height)
    );
    const fitZoom =
      rawFit >= 1
        ? Math.max(1, Math.min(96, Math.floor(rawFit)))
        : Math.max(minZoom, Number(rawFit.toFixed(4)));
    setZoom(fitZoom);
    setPan({
      x: (rect.width - width * fitZoom) / 2,
      y: (rect.height - height * fitZoom) / 2,
    });
  }, [width, height, minZoom]);

  const handleCenterView = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPan({
        x: (rect.width - width * zoom) / 2,
        y: (rect.height - height * zoom) / 2,
      });
    }
  }, [width, height, zoom]);

  // Execute external zoom commands (Ctrl++, Ctrl+-, Ctrl+0, Ctrl+1, Toolbar Lupa presets)
  const lastZoomCommandNonceRef = useRef<number>(0);
  useEffect(() => {
    if (!zoomCommand || zoomCommand.nonce === lastZoomCommandNonceRef.current) return;
    lastZoomCommandNonceRef.current = zoomCommand.nonce;
    if (zoomCommand.type === 'fit') {
      handleFitToWindow();
    } else if (zoomCommand.type === 'percent') {
      const pct = Math.max(1, Math.min(800, zoomCommand.percent || 100));
      zoomAtClientPoint(pct === 100 && (width > 512 || height > 512) ? 1 : (pct / 100) * 12);
    } else if (zoomCommand.type === 'in') {
      zoomAtClientPoint(zoom < 1 ? zoom * 1.4 : zoom < 12 ? zoom + 2 : Math.round(zoom * 1.25));
    } else if (zoomCommand.type === 'out') {
      zoomAtClientPoint(zoom <= 2 ? zoom / 1.4 : zoom <= 12 ? zoom - 2 : Math.round(zoom / 1.25));
    }
  }, [zoomCommand, zoom, width, height, zoomAtClientPoint, handleFitToWindow]);

  const getGridCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.PointerEvent<HTMLCanvasElement>) => {
    const targetEl = canvasBoxRef.current || canvasRef.current;
    if (!targetEl) return null;
    const rect = targetEl.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const x = Math.floor(clientX / zoom);
    const y = Math.floor(clientY / zoom);

    if (x >= 0 && x < width && y >= 0 && y < height) {
      return { x, y };
    }
    return null;
  }, [zoom, width, height]);

  const getUnclampedGridCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.PointerEvent<HTMLCanvasElement>) => {
    const targetEl = canvasBoxRef.current || canvasRef.current;
    if (!targetEl) return null;
    const rect = targetEl.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    return {
      x: Math.floor(clientX / zoom),
      y: Math.floor(clientY / zoom),
    };
  }, [zoom]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const wantsZoom =
      e.ctrlKey || e.metaKey || e.altKey || (wheelNavMode === 'zoom' && !e.shiftKey);

    if (wantsZoom) {
      wheelDeltaAccumulator.current += e.deltaY;
      if (Math.abs(wheelDeltaAccumulator.current) >= 20) {
        const zoomingIn = wheelDeltaAccumulator.current < 0;
        let nextZoom: number;
        if (zoom < 1.5) {
          nextZoom = zoomingIn ? zoom * 1.25 : zoom / 1.25;
        } else {
          const step = zoom >= 24 ? Math.max(2, Math.round(zoom * 0.16)) : 1;
          nextZoom = zoomingIn ? zoom + step : zoom - step;
        }
        zoomAtClientPoint(nextZoom, e.clientX, e.clientY);
        wheelDeltaAccumulator.current = 0;
      }
      return;
    }

    if (e.shiftKey) {
      // Shift + Wheel = Horizontal pan
      const horizDelta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      setPan((p) => ({
        x: p.x - horizDelta,
        y: p.y,
      }));
    } else {
      // Plain Wheel = Vertical pan (plus native trackpad horizontal deltaX)
      setPan((p) => ({
        x: p.x - e.deltaX,
        y: p.y - e.deltaY,
      }));
    }
  };

  // Render Canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    if (virtualRect.left !== 0 || virtualRect.top !== 0) {
      ctx.translate(-virtualRect.left, -virtualRect.top);
    }

    // 1. Render Retro Fighting Stage Background & Ground Line
    renderStageBackground(
      ctx,
      width,
      height,
      zoom,
      stageType,
      stageOpacity,
      groundConfig,
      globalPivot
    );

    const curRenderFrameIdx = combatTestActive
      ? combatStateRef.current.attacking
        ? combatStateRef.current.attackFrameIdx % Math.max(1, allFrames.length)
        : 0
      : isPlaying
      ? playbackFrameIndex % Math.max(1, allFrames.length)
      : currentFrameIndex >= 0
      ? currentFrameIndex
      : allFrames.findIndex((f) => f.id === currentFrame.id);

    const activeFrame =
      allFrames[curRenderFrameIdx] || currentFrame;

    // 1.5. Render Canvas-Anchored References behind Sprite Layers (CACHED: only rebuilds when moved/scaled/modified)
    const visibleGroupIds = new Set(
      referenceGroups.filter((g) => g.visible !== false).map((g) => g.id)
    );
    const sortedCanvasRefs = [...references]
      .filter((refItem) => {
        if (!refItem.visible || refItem.anchor === 'camera') return false;
        if (refItem.groupId && referenceGroups.length > 0 && !visibleGroupIds.has(refItem.groupId)) return false;
        return true;
      })
      .sort((a, b) => (a.zOrder ?? 0) - (b.zOrder ?? 0));

    if (sortedCanvasRefs.length > 0) {
      let refSig = `${canvas.width}x${canvas.height}|${zoom}|${pureRefConfig.enabled ? pureRefConfig.globalOpacity : 1}|${refImageVersionRef.current}|`;
      for (let i = 0; i < sortedCanvasRefs.length; i++) {
        const r = sortedCanvasRefs[i];
        refSig += `${r.id}:${r.dataUrl.length}:${r.x}:${r.y}:${r.scale}:${r.rotation}:${r.opacity}:${r.flipX ? 1 : 0}:${r.flipY ? 1 : 0}:${r.blendMode}:${r.zOrder ?? 0};`;
        if (!refImageCacheRef.current.has(r.dataUrl)) {
          const img = new Image();
          img.onload = () => {
            refImageVersionRef.current += 1;
            refLayerCacheRef.current = null;
            renderCanvas();
          };
          img.src = r.dataUrl;
          refImageCacheRef.current.set(r.dataUrl, img);
        }
      }

      if (!refLayerCacheRef.current || refLayerCacheRef.current.sig !== refSig) {
        const off = refLayerCacheRef.current?.canvas || document.createElement('canvas');
        if (off.width !== canvas.width) off.width = canvas.width;
        if (off.height !== canvas.height) off.height = canvas.height;
        const rCtx = off.getContext('2d');
        if (rCtx) {
          rCtx.clearRect(0, 0, off.width, off.height);
          for (const refItem of sortedCanvasRefs) {
            const img = refImageCacheRef.current.get(refItem.dataUrl);
            if (img && img.complete && img.naturalWidth > 0) {
              rCtx.save();
              rCtx.globalAlpha = Math.max(
                0.02,
                Math.min(1, refItem.opacity * (pureRefConfig.enabled ? pureRefConfig.globalOpacity : 1))
              );
              rCtx.globalCompositeOperation = refItem.blendMode as GlobalCompositeOperation;
              const cx = (width / 2 + refItem.x) * zoom;
              const cy = (height / 2 + refItem.y) * zoom;
              rCtx.translate(cx, cy);
              rCtx.rotate((refItem.rotation * Math.PI) / 180);
              rCtx.scale(
                (refItem.flipX ? -1 : 1) * refItem.scale,
                (refItem.flipY ? -1 : 1) * refItem.scale
              );
              const drawW = img.naturalWidth * (zoom / Math.max(1, img.naturalWidth / width));
              const drawH = img.naturalHeight * (zoom / Math.max(1, img.naturalWidth / width));
              rCtx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
              rCtx.restore();
            }
          }
        }
        refLayerCacheRef.current = { sig: refSig, canvas: off };
      }

      // Single fast blit for all canvas-anchored references
      if (refLayerCacheRef.current) {
        ctx.drawImage(refLayerCacheRef.current.canvas, 0, 0);
      }

      // Draw interactive transform handles only for the currently selected reference
      if (activeReferenceId) {
        const activeRef = sortedCanvasRefs.find((r) => r.id === activeReferenceId);
        const img = activeRef ? refImageCacheRef.current.get(activeRef.dataUrl) : null;
        if (activeRef && img && img.complete && img.naturalWidth > 0) {
          const showRefHandles =
            !activeRef.locked ||
            pureRefConfig.enabled ||
            (activeTool === 'move' && moveSubTool === 'move_reference');
          if (showRefHandles) {
            const cx = (width / 2 + activeRef.x) * zoom;
            const cy = (height / 2 + activeRef.y) * zoom;
            const drawW = img.naturalWidth * (zoom / Math.max(1, img.naturalWidth / width));
            const drawH = img.naturalHeight * (zoom / Math.max(1, img.naturalWidth / width));
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate((activeRef.rotation * Math.PI) / 180);
            const bw = drawW * activeRef.scale;
            const bh = drawH * activeRef.scale;
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 3]);
            ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
            ctx.setLineDash([]);

            const corners = [
              [-bw / 2, -bh / 2],
              [bw / 2, -bh / 2],
              [bw / 2, bh / 2],
              [-bw / 2, bh / 2],
            ];
            for (const [hx, hy] of corners) {
              ctx.fillStyle = '#ffffff';
              ctx.strokeStyle = '#0ea5e9';
              ctx.lineWidth = 1.5;
              ctx.fillRect(hx - 4, hy - 4, 8, 8);
              ctx.strokeRect(hx - 4, hy - 4, 8, 8);
            }

            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, -bh / 2);
            ctx.lineTo(0, -bh / 2 - 16);
            ctx.stroke();
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(0, -bh / 2 - 19, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#0f172a';
            ctx.stroke();

            ctx.strokeStyle = '#f43f5e';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(-6, 0);
            ctx.lineTo(6, 0);
            ctx.moveTo(0, -6);
            ctx.lineTo(0, 6);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    }

    // 2. Render Dummy Opponent & Live Collision Spark (supports Combat Test P1 offsets)
    const p1ShiftX = combatTestActive ? Math.round(combatStateRef.current.p1X) : 0;
    const p1ShiftY = combatTestActive ? Math.round(combatStateRef.current.p1Y) : 0;
    const shiftedHitboxes: Hitbox[] = (activeFrame.hitboxes || []).map((hb) => ({
      ...hb,
      x: hb.x + p1ShiftX,
      y: hb.y + p1ShiftY,
    }));

    renderDummyOpponent(
      ctx,
      width,
      height,
      zoom,
      dummyOpponent,
      groundConfig.groundY,
      shiftedHitboxes,
      animPhaseTimeRef.current
    );

    // 3. Onion Skin: Previous Frames (Cyan) — Cached single-drawImage silhouette blitting
    const curIdx = currentFrameIndex >= 0 ? currentFrameIndex : allFrames.findIndex((f) => f.id === currentFrame.id);
    const skipHeavyOnionDuringDraw = performanceMode === 'performance' && isDrawing;
    if (
      onionSkinEnabled &&
      !isPlaying &&
      !combatTestActive &&
      !skipHeavyOnionDuringDraw &&
      (onionSkinPrev ?? 1) > 0 &&
      allFrames.length > 1 &&
      curIdx >= 0
    ) {
      const prevCount = performanceMode === 'performance' ? Math.min(1, onionSkinPrev ?? 1) : (onionSkinPrev ?? 1);
      for (let step = 1; step <= prevCount; step++) {
        const pIdx = curIdx - step;
        if (pIdx >= 0 && allFrames[pIdx]) {
          const prevF = allFrames[pIdx];
          if (isFrameTiled(prevF)) {
            const alpha = Math.max(0.08, onionSkinOpacity * (1 - (step - 1) * 0.25));
            for (const lyr of prevF.layers) {
              if (!lyr.visible || !lyr.tiledStoreId) continue;
              const store = getTiledStore(lyr.tiledStoreId);
              if (store) {
                store.renderVisibleViewport(
                  ctx,
                  virtualRect.minWorldX,
                  virtualRect.minWorldY,
                  virtualRect.maxWorldX,
                  virtualRect.maxWorldY,
                  zoom,
                  0,
                  0,
                  alpha * (lyr.opacity ?? 1)
                );
              }
            }
          } else {
            const prevComposited = compositeFrame(prevF, width, height, pIdx, false, layerGroups);
            const onionCanvas = getCachedOnionSkinCanvas(prevComposited, width, height, '#00d2ff');
            ctx.globalAlpha = Math.max(0.08, onionSkinOpacity * (1 - (step - 1) * 0.25));
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(onionCanvas, 0, 0, width * zoom, height * zoom);
          }
        }
      }
      ctx.globalAlpha = 1.0;
    }

    // 4. Onion Skin: Next Frames (Amber) — Cached single-drawImage silhouette blitting
    if (
      onionSkinEnabled &&
      !isPlaying &&
      !combatTestActive &&
      !skipHeavyOnionDuringDraw &&
      (onionSkinNext ?? 0) > 0 &&
      allFrames.length > 1 &&
      curIdx >= 0
    ) {
      const nextCount = performanceMode === 'performance' ? Math.min(1, onionSkinNext ?? 0) : (onionSkinNext ?? 0);
      for (let step = 1; step <= nextCount; step++) {
        const nIdx = curIdx + step;
        if (nIdx < allFrames.length && allFrames[nIdx]) {
          const nextF = allFrames[nIdx];
          if (isFrameTiled(nextF)) {
            const alpha = Math.max(0.08, onionSkinOpacity * 0.85 * (1 - (step - 1) * 0.25));
            for (const lyr of nextF.layers) {
              if (!lyr.visible || !lyr.tiledStoreId) continue;
              const store = getTiledStore(lyr.tiledStoreId);
              if (store) {
                store.renderVisibleViewport(
                  ctx,
                  virtualRect.minWorldX,
                  virtualRect.minWorldY,
                  virtualRect.maxWorldX,
                  virtualRect.maxWorldY,
                  zoom,
                  0,
                  0,
                  alpha * (lyr.opacity ?? 1)
                );
              }
            }
          } else {
            const nextComposited = compositeFrame(nextF, width, height, nIdx, false, layerGroups);
            const onionCanvas = getCachedOnionSkinCanvas(nextComposited, width, height, '#ff9900');
            ctx.globalAlpha = Math.max(0.08, onionSkinOpacity * 0.85 * (1 - (step - 1) * 0.25));
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(onionCanvas, 0, 0, width * zoom, height * zoom);
          }
        }
      }
      ctx.globalAlpha = 1.0;
    }

    // 5. Render Layers of Active Frame
    // FAST PATH:
    //   A) Tiled 256×256 Large-Canvas / Spritesheet Engine: renders ONLY tiles intersecting virtualRect
    //   B) Standard Cached Frame Engine: WeakMap-cached single ctx.drawImage call
    const hasLiveTransientEdit =
      !isPlaying &&
      !combatTestActive &&
      (Boolean(transformSession) ||
        ((isDrawing || isDraggingContent || textAnchor !== null) &&
          !isPaintingMaskRef.current &&
          draftPixelsRef.current.length > 0) ||
        (isDrawing && isPaintingMaskRef.current && draftMaskRef.current.length > 0) ||
        Boolean(liveCanvasPreview?.grid) ||
        Boolean(creatingShapeDraftRef.current) ||
        Boolean(shapeLiveOverrideRef.current));

    const parallaxActive =
      workMode === 'stage' &&
      Boolean(stageParallaxConfig?.enabled) &&
      Math.abs(stageParallaxConfig?.scrollOffset || 0) > 0.01;

    let composedGrid: (string | null)[][] = [];
    if (isFrameTiled(activeFrame)) {
      for (const layer of activeFrame.layers) {
        if (!layer.visible) continue;
        const groupState = resolveGroupVisibilityAndOpacity(layer.groupId, layerGroups);
        if (!groupState.visible) continue;
        const kf = evaluateLayerKeyframeTransform(layer, curRenderFrameIdx);
        const fillOp = layer.fillOpacity ?? 1;
        const effectiveOpacity = Math.max(
          0,
          Math.min(1, (layer.opacity ?? 1) * fillOp * kf.opacityMultiplier * groupState.opacity)
        );
        if (effectiveOpacity <= 0.001) continue;

        const isEditingTiled =
          !isPlaying &&
          !combatTestActive &&
          isDrawing &&
          layer.id === currentLayer.id &&
          draftTiledStoreRef.current !== null;
        const store = isEditingTiled
          ? draftTiledStoreRef.current
          : layer.tiledStoreId
          ? getTiledStore(layer.tiledStoreId)
          : undefined;

        if (store) {
          store.renderVisibleViewport(
            ctx,
            virtualRect.minWorldX,
            virtualRect.minWorldY,
            virtualRect.maxWorldX,
            virtualRect.maxWorldY,
            zoom,
            p1ShiftX,
            p1ShiftY,
            effectiveOpacity
          );
        } else if (layer.pixels && layer.pixels.length > 0) {
          const cachedLayer = getCachedPixelGridCanvas(layer.pixels, width, height);
          ctx.save();
          ctx.globalAlpha = effectiveOpacity;
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(cachedLayer, p1ShiftX * zoom, p1ShiftY * zoom, width * zoom, height * zoom);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1.0;
    } else if (!hasLiveTransientEdit && !parallaxActive) {
      composedGrid = compositeFrame(
        activeFrame,
        width,
        height,
        curRenderFrameIdx,
        false,
        layerGroups
      );
      const cachedFrameCanvas = getCachedPixelGridCanvas(composedGrid, width, height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(cachedFrameCanvas, p1ShiftX * zoom, p1ShiftY * zoom, width * zoom, height * zoom);
      ctx.globalAlpha = 1.0;
    } else {
      composedGrid = createEmptyGrid(width, height);
      let lastClippingBasePixels: (string | null)[][] | null = null;

      for (const layer of activeFrame.layers) {
        const isEditingLayer = layer.id === currentLayer.id;
        const isLiveTransformLayer = !isPlaying && !combatTestActive && isEditingLayer && Boolean(transformSession);
        const isLivePixelDraft =
          !isPlaying &&
          !combatTestActive &&
          !isLiveTransformLayer &&
          (isDrawing || isDraggingContent || textAnchor !== null) &&
          !isPaintingMaskRef.current &&
          isEditingLayer &&
          draftPixelsRef.current.length > 0;
        const isLiveMaskDraft =
          !isPlaying &&
          !combatTestActive &&
          isDrawing &&
          isPaintingMaskRef.current &&
          isEditingLayer &&
          draftMaskRef.current.length > 0;

        const isLiveLayerPreview =
          !isPlaying &&
          !combatTestActive &&
          Boolean(liveCanvasPreview?.grid) &&
          (!liveCanvasPreview?.layerId || liveCanvasPreview.layerId === layer.id);

        const layerShapes = layer.parametricShapes || [];
        const isActLyr = !isPlaying && !combatTestActive && layer.id === currentLayer.id;
        const liveDraft = isActLyr ? creatingShapeDraftRef.current : null;
        const hasLiveShapeOverride = Boolean(isActLyr && (liveDraft || shapeLiveOverrideRef.current));

        let pixelSource: (string | null)[][];
        if (
          !isLivePixelDraft &&
          !isLiveLayerPreview &&
          !isLiveTransformLayer &&
          !hasLiveShapeOverride
        ) {
          // Unchanged layer: reuse WeakMap-cached rasterization of vectors & parametric shapes
          pixelSource = getCachedLayerEffectivePixels(layer, width, height, () => {
            let pix =
              layer.vectorPaths && layer.vectorPaths.length > 0
                ? rasterizeVectorPathsToGrid(
                    layer.vectorPaths,
                    width,
                    height,
                    layer.layerType === 'vector' ? null : layer.pixels
                  )
                : layer.pixels;
            if (layerShapes.length > 0) {
              pix = rasterizeParametricShapesList(
                layerShapes,
                width,
                height,
                pix,
                effDitherConfig,
                gradientConfig,
                activePaletteColors
              );
            }
            return pix;
          });
        } else {
          pixelSource = isLivePixelDraft ? draftPixelsRef.current : layer.pixels;
          if (isLiveLayerPreview && liveCanvasPreview?.grid && liveCanvasPreview.layerId === layer.id) {
            const splitFrac = liveCanvasPreview.beforeAfterSplit;
            if (typeof splitFrac === 'number') {
              const splitCol = Math.round(width * splitFrac);
              pixelSource = pixelSource.map((row, ry) =>
                row.map((cell, rx) =>
                  rx >= splitCol ? (liveCanvasPreview.grid[ry]?.[rx] ?? null) : cell
                )
              );
            } else {
              pixelSource = liveCanvasPreview.grid;
            }
          } else if (isLiveTransformLayer && transformSession) {
            const transformedGrid = applyTransformToGrid(
              transformSession.sourceGrid,
              transformSession.params,
              width,
              height,
              transformSession.params.targetScope === 'selection' ? selection : null
            );
            if (transformSession.sourceVectorPaths && transformSession.sourceVectorPaths.length > 0) {
              const transformedVecs = transformSession.sourceVectorPaths.map((vp) =>
                transformVectorPath(vp, transformSession.params)
              );
              pixelSource = rasterizeVectorPathsToGrid(
                transformedVecs,
                width,
                height,
                layer.layerType === 'vector' ? null : transformedGrid
              );
            } else {
              pixelSource = transformedGrid;
            }
          } else if (layer.vectorPaths && layer.vectorPaths.length > 0) {
            pixelSource = rasterizeVectorPathsToGrid(
              layer.vectorPaths,
              width,
              height,
              layer.layerType === 'vector' ? null : pixelSource
            );
          }

          if (layerShapes.length > 0 || liveDraft) {
            const effShapes: ParametricShapeObject[] = layerShapes.map((s) =>
              isActLyr && shapeLiveOverrideRef.current && shapeLiveOverrideRef.current.id === s.id
                ? shapeLiveOverrideRef.current
                : s
            );
            if (liveDraft) effShapes.push(liveDraft);
            pixelSource = rasterizeParametricShapesList(
              effShapes,
              width,
              height,
              pixelSource,
              effDitherConfig,
              gradientConfig,
              activePaletteColors
            );
          }
        }

        const isClipping = Boolean(layer.clippingMask);
        if (!isClipping && layer.layerType !== 'adjustment') {
          lastClippingBasePixels = layer.visible ? pixelSource : null;
        }

        if (!layer.visible) continue;
        const groupState = resolveGroupVisibilityAndOpacity(layer.groupId, layerGroups);
        if (!groupState.visible) continue;

        const kf = evaluateLayerKeyframeTransform(layer, curRenderFrameIdx);
        const fillOp = layer.fillOpacity ?? 1;
        const effectiveOpacity = Math.max(
          0,
          Math.min(1, (layer.opacity ?? 1) * fillOp * kf.opacityMultiplier * groupState.opacity)
        );
        if (effectiveOpacity <= 0.001) continue;

        const blendMode: LayerBlendMode = layer.blendMode || 'normal';
        const activeLayerMask =
          isLiveMaskDraft && layer.mask
            ? { ...layer.mask, pixels: draftMaskRef.current }
            : layer.mask;

        if (layer.layerType === 'adjustment' && layer.adjustment) {
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              if (isClipping && (!lastClippingBasePixels || !lastClippingBasePixels[y]?.[x])) continue;
              const existing = composedGrid[y][x];
              if (existing) {
                const maskAlpha = resolveMaskAlpha(activeLayerMask, x, y);
                const pxOp = effectiveOpacity * maskAlpha;
                if (pxOp > 0.001) {
                  composedGrid[y][x] = applyAdjustmentToHex(existing, layer.adjustment, pxOp);
                }
              }
            }
          }
          continue;
        }

        const hasScale = Math.abs(kf.scale - 1) > 0.01;
        const hasOffset = kf.offsetX !== 0 || kf.offsetY !== 0;
        const hasMask = Boolean(activeLayerMask && !activeLayerMask.disabled);
        const fastNormalOpaque =
          !isClipping &&
          !hasScale &&
          !hasOffset &&
          !hasMask &&
          !parallaxActive &&
          effectiveOpacity >= 0.999 &&
          blendMode === 'normal';

        if (fastNormalOpaque) {
          const rowLim = Math.min(height, pixelSource.length);
          for (let y = 0; y < rowLim; y++) {
            const srcRow = pixelSource[y];
            if (!srcRow) continue;
            const dstRow = composedGrid[y];
            const colLim = Math.min(width, srcRow.length);
            for (let x = 0; x < colLim; x++) {
              const col = srcRow[x];
              if (col) dstRow[x] = col;
            }
          }
          continue;
        }

        const cxMid = width / 2;
        const cyMid = height / 2;
        const invScale = kf.scale > 0.05 ? 1 / kf.scale : 1;
        const layerParallaxShift = parallaxActive
          ? Math.round((stageParallaxConfig?.scrollOffset || 0) * (layer.parallaxSpeed ?? 1))
          : 0;

        for (let y = 0; y < height; y++) {
          const dstRow = composedGrid[y];
          const clipRow = isClipping ? lastClippingBasePixels?.[y] : null;
          let srcYBase = y - kf.offsetY;
          if (hasScale) {
            srcYBase = Math.round(cyMid + (srcYBase - cyMid) * invScale);
          }
          if (srcYBase < 0 || srcYBase >= height) continue;
          const srcRow = pixelSource[srcYBase];
          if (!srcRow) continue;

          for (let x = 0; x < width; x++) {
            if (isClipping && (!clipRow || !clipRow[x])) continue;
            let srcX = x - kf.offsetX;
            if (hasScale) {
              srcX = Math.round(cxMid + (srcX - cxMid) * invScale);
            }
            if (parallaxActive) {
              srcX = (((srcX - layerParallaxShift) % width) + width) % width;
            } else {
              if (srcX < 0 || srcX >= width) continue;
            }
            const col = srcRow[srcX];
            if (col) {
              const maskAlpha = hasMask
                ? resolveMaskAlpha(
                    activeLayerMask,
                    activeLayerMask?.linked !== false ? srcX : x,
                    activeLayerMask?.linked !== false ? srcYBase : y
                  )
                : 1;
              const pixelOpacity = effectiveOpacity * maskAlpha;
              if (pixelOpacity <= 0.001) continue;
              dstRow[x] =
                pixelOpacity < 0.999 || blendMode !== 'normal'
                  ? blendHexColors(dstRow[x], col, pixelOpacity, blendMode)
                  : col;
            }
          }
        }
      }

      // Global Live Canvas Preview (when preview has no target layerId, e.g., Img->Pixel live overlay)
      if (!isPlaying && !combatTestActive && liveCanvasPreview?.grid && !liveCanvasPreview.layerId) {
        const splitCol =
          typeof liveCanvasPreview.beforeAfterSplit === 'number'
            ? Math.round(width * liveCanvasPreview.beforeAfterSplit)
            : 0;
        for (let y = 0; y < height; y++) {
          for (let x = splitCol; x < width; x++) {
            const pCol = liveCanvasPreview.grid[y]?.[x];
            if (pCol) composedGrid[y][x] = pCol;
          }
        }
      }

      // Subtle origin ghost while moving layer content (single cached drawImage blit)
      if (!isPlaying && isDraggingContent && contentOriginalPixelsRef.current) {
        const ghostCanvas = getCachedPixelGridCanvas(contentOriginalPixelsRef.current, width, height);
        ctx.globalAlpha = Math.max(0.12, currentLayer.opacity * 0.24);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(ghostCanvas, 0, 0, width * zoom, height * zoom);
        ctx.globalAlpha = 1.0;
      }

      // Single fast ImageData blit of composedGrid onto main canvas!
      const liveCanvas = blitPixelGridToCanvas(
        composedGrid,
        width,
        height,
        liveComposeCanvasRef.current
      );
      liveComposeCanvasRef.current = liveCanvas;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(liveCanvas, p1ShiftX * zoom, p1ShiftY * zoom, width * zoom, height * zoom);
      ctx.globalAlpha = 1.0;
    }

    // Antes / Después live comparison divider line on canvas
    if (
      !isPlaying &&
      !combatTestActive &&
      liveCanvasPreview?.grid &&
      typeof liveCanvasPreview.beforeAfterSplit === 'number'
    ) {
      const splitX = Math.round(width * liveCanvasPreview.beforeAfterSplit) * zoom;
      ctx.save();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, height * zoom);
      ctx.stroke();
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = 'rgba(10,12,18,0.85)';
      ctx.fillRect(Math.max(2, splitX - 42), 6, 38, 14);
      ctx.fillRect(Math.min(width * zoom - 50, splitX + 4), 6, 46, 14);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('ANTES', Math.max(5, splitX - 39), 16);
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('DESPUÉS', Math.min(width * zoom - 47, splitX + 7), 16);
      ctx.restore();
    }

    // Quick Mask Ruby Overlay Preview when enabled on active layer
    if (!isPlaying && !combatTestActive && currentLayer.mask?.quickPreview && !currentLayer.mask.disabled) {
      const previewMask =
        isDrawing && isPaintingMaskRef.current && draftMaskRef.current.length > 0
          ? { ...currentLayer.mask, pixels: draftMaskRef.current }
          : currentLayer.mask;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const mAlpha = resolveMaskAlpha(previewMask, x, y);
          if (mAlpha < 0.98) {
            ctx.fillStyle = `rgba(239, 68, 68, ${((1 - mAlpha) * 0.42).toFixed(3)})`;
            ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
          }
        }
      }
    }

    // Live Move Delta HUD overlay on canvas
    if (!isPlaying && isDraggingContent) {
      const { dx, dy } = lastContentDeltaRef.current;
      const label = `ΔX: ${dx >= 0 ? `+${dx}` : dx}px  ΔY: ${dy >= 0 ? `+${dy}` : dy}px${linkMoveAllFrames ? ' · TODOS LOS FRAMES' : ''}`;
      ctx.font = 'bold 10px monospace';
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(10, 12, 18, 0.85)';
      ctx.fillRect(6, 6, tw + 12, 18);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1;
      ctx.strokeRect(6, 6, tw + 12, 18);
      ctx.fillStyle = '#fde68a';
      ctx.fillText(label, 12, 18);
    }

    // 6. Advanced 10-Mode Symmetry Axes, Affected Region & Draggable Handles
    if (effSymmetry.enabled && effSymmetry.mode !== 'none') {
      const cx = (effSymmetry.axisX + 0.5) * zoom;
      const cy = (effSymmetry.axisY + 0.5) * zoom;
      const totalW = width * zoom;
      const totalH = height * zoom;
      const diag = Math.hypot(totalW, totalH) + 32;

      if (effSymmetry.showAffectedArea) {
        ctx.save();
        ctx.fillStyle = 'rgba(168, 85, 247, 0.08)';
        if (effSymmetry.mode === 'vertical') {
          ctx.fillRect(cx, 0, totalW - cx, totalH);
        } else if (effSymmetry.mode === 'horizontal') {
          ctx.fillRect(0, cy, totalW, totalH - cy);
        } else if (effSymmetry.mode === 'quad' || effSymmetry.mode === 'octal') {
          ctx.fillRect(cx, 0, totalW - cx, cy);
          ctx.fillRect(0, cy, cx, totalH - cy);
        } else if (effSymmetry.mode === 'radial') {
          const n = Math.max(2, effSymmetry.radialPoints || 6);
          for (let k = 0; k < n; k += 2) {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, diag, (2 * Math.PI * k) / n, (2 * Math.PI * (k + 1)) / n);
            ctx.closePath();
            ctx.fill();
          }
        } else {
          ctx.fillRect(0, 0, totalW, totalH);
        }
        ctx.restore();
      }

      if (effSymmetry.showAxes) {
        ctx.save();
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);

        const drawAngledLine = (rad: number, alpha = 0.85) => {
          ctx.strokeStyle = `rgba(192, 132, 252, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(cx - Math.cos(rad) * diag, cy - Math.sin(rad) * diag);
          ctx.lineTo(cx + Math.cos(rad) * diag, cy + Math.sin(rad) * diag);
          ctx.stroke();
        };

        switch (effSymmetry.mode) {
          case 'vertical':
            ctx.beginPath();
            ctx.moveTo(cx, 0);
            ctx.lineTo(cx, totalH);
            ctx.stroke();
            break;
          case 'horizontal':
            ctx.beginPath();
            ctx.moveTo(0, cy);
            ctx.lineTo(totalW, cy);
            ctx.stroke();
            break;
          case 'quad':
            ctx.beginPath();
            ctx.moveTo(cx, 0);
            ctx.lineTo(cx, totalH);
            ctx.moveTo(0, cy);
            ctx.lineTo(totalW, cy);
            ctx.stroke();
            break;
          case 'octal':
            drawAngledLine(0);
            drawAngledLine(Math.PI / 2);
            drawAngledLine(Math.PI / 4, 0.65);
            drawAngledLine(-Math.PI / 4, 0.65);
            break;
          case 'radial': {
            const n = Math.max(2, effSymmetry.radialPoints || 6);
            for (let k = 0; k < n; k++) {
              const ang = (2 * Math.PI * k) / n;
              ctx.beginPath();
              ctx.moveTo(cx, cy);
              ctx.lineTo(cx + Math.cos(ang) * diag, cy + Math.sin(ang) * diag);
              ctx.stroke();
            }
            break;
          }
          case 'double_mirror': {
            const rad = ((effSymmetry.customAngleDeg || 0) * Math.PI) / 180;
            drawAngledLine(rad);
            drawAngledLine(rad + Math.PI / 2);
            break;
          }
          case 'custom_angle': {
            const rad = ((effSymmetry.customAngleDeg || 0) * Math.PI) / 180;
            drawAngledLine(rad);
            break;
          }
          case 'point': {
            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(8, zoom * 1.2), 0, Math.PI * 2);
            ctx.stroke();
            break;
          }
          case 'custom_line': {
            const p1x = (effSymmetry.lineP1.x + 0.5) * zoom;
            const p1y = (effSymmetry.lineP1.y + 0.5) * zoom;
            const p2x = (effSymmetry.lineP2.x + 0.5) * zoom;
            const p2y = (effSymmetry.lineP2.y + 0.5) * zoom;
            const vx = p2x - p1x;
            const vy = p2y - p1y;
            const len = Math.hypot(vx, vy) || 1;
            const ux = vx / len;
            const uy = vy / len;
            ctx.strokeStyle = 'rgba(192, 132, 252, 0.4)';
            ctx.beginPath();
            ctx.moveTo(p1x - ux * diag, p1y - uy * diag);
            ctx.lineTo(p2x + ux * diag, p2y + uy * diag);
            ctx.stroke();

            ctx.setLineDash([]);
            ctx.strokeStyle = '#c084fc';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(p1x, p1y);
            ctx.lineTo(p2x, p2y);
            ctx.stroke();

            [
              { x: p1x, y: p1y, label: 'P1' },
              { x: p2x, y: p2y, label: 'P2' },
            ].forEach((pt) => {
              ctx.fillStyle = '#fbbf24';
              ctx.strokeStyle = '#090d16';
              ctx.lineWidth = 1.5;
              ctx.fillRect(pt.x - 4.5, pt.y - 4.5, 9, 9);
              ctx.strokeRect(pt.x - 4.5, pt.y - 4.5, 9, 9);
              ctx.font = 'bold 9px monospace';
              ctx.fillStyle = '#fde68a';
              ctx.fillText(pt.label, pt.x + 7, pt.y - 5);
            });
            break;
          }
        }

        if (effSymmetry.mode !== 'custom_line') {
          ctx.setLineDash([]);
          ctx.fillStyle = '#a855f7';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cx, cy - 5);
          ctx.lineTo(cx + 5, cy);
          ctx.lineTo(cx, cy + 5);
          ctx.lineTo(cx - 5, cy);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // 7. Pixel Grid (clipped strictly to visible virtualRect bounds for O(visible) giant canvas speed)
    if (showGrid && zoom >= 5) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const gx0 = Math.max(0, virtualRect.minWorldX);
      const gx1 = Math.min(width, virtualRect.maxWorldX);
      const gy0 = Math.max(0, virtualRect.minWorldY);
      const gy1 = Math.min(height, virtualRect.maxWorldY);
      for (let x = gx0; x <= gx1; x++) {
        ctx.moveTo(x * zoom - 0.5, gy0 * zoom);
        ctx.lineTo(x * zoom - 0.5, gy1 * zoom);
      }
      for (let y = gy0; y <= gy1; y++) {
        ctx.moveTo(gx0 * zoom, y * zoom - 0.5);
        ctx.lineTo(gx1 * zoom, y * zoom - 0.5);
      }
      ctx.stroke();
    }

    // 8. All 7 Combat Boxes (Uses shiftedHitboxes so Combat Test + Playback animate boxes live)
    if (showHitboxes && shiftedHitboxes.length > 0) {
      shiftedHitboxes.forEach((hb) => {
        const sx = hb.x * zoom;
        const sy = hb.y * zoom;
        const sw = hb.w * zoom;
        const sh = hb.h * zoom;

        const isSelected = selectedHitboxId === hb.id;
        const isBeingDragged = draggingHitboxId === hb.id || resizingHitbox?.id === hb.id;
        const isHovered = hoveredHitboxId === hb.id && (activeTool === 'move' || activeTool === 'hitbox');
        const styleCfg = HITBOX_RENDER_STYLES[hb.type] || HITBOX_RENDER_STYLES.hurtbox;

        let strokeColor = styleCfg.stroke;
        let fillColor = styleCfg.fill;
        const label = hb.name || styleCfg.label;

        if (isBeingDragged || isHovered) {
          strokeColor = '#facc15';
          fillColor = 'rgba(250, 204, 21, 0.30)';
        }

        ctx.fillStyle = fillColor;
        ctx.fillRect(sx, sy, sw, sh);
        ctx.strokeStyle = isSelected ? '#ffffff' : strokeColor;
        ctx.lineWidth = isSelected ? 2.5 : isBeingDragged ? 3 : isHovered ? 2.5 : 2;
        ctx.strokeRect(sx, sy, sw, sh);

        ctx.fillStyle = strokeColor;
        ctx.font = 'bold 9px monospace';
        const dragInfo = isBeingDragged ? ` [X:${hb.x}, Y:${hb.y} ${hb.w}x${hb.h}]` : '';
        ctx.fillText(`${label} ${hb.w}x${hb.h}${dragInfo}`, sx + 3, sy + 11);

        // Draw 8 resize handles on selected hitbox
        if (isSelected && !isPlaying && !combatTestActive) {
          const hs = 6;
          const pts = [
            [sx, sy],
            [sx + sw / 2, sy],
            [sx + sw, sy],
            [sx + sw, sy + sh / 2],
            [sx + sw, sy + sh],
            [sx + sw / 2, sy + sh],
            [sx, sy + sh],
            [sx, sy + sh / 2],
          ];
          pts.forEach(([px, py]) => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(px - hs / 2, py - hs / 2, hs, hs);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(px - hs / 2, py - hs / 2, hs, hs);
          });
        }
      });
    }

    // 8.5. Active Pixel Text Tool Bounding Box Overlay
    if (activeTool === 'text' && textAnchor && !isPlaying && !combatTestActive) {
      const tx = textAnchor.x * zoom;
      const ty = textAnchor.y * zoom;
      const tw = Math.min(width - textAnchor.x, textMaxWidth) * zoom;
      const th = Math.min(height - textAnchor.y, textMaxHeight) * zoom;
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(tx, ty, Math.max(zoom, tw), Math.max(zoom, th));
      ctx.restore();
    }

    // 9. Root Pivot
    if (showPivot) {
      const px = (globalPivot.x + 0.5) * zoom;
      const py = (globalPivot.y + 0.5) * zoom;
      const isPivotActive = isDraggingPivot || (hoveredPivot && activeTool === 'move');

      ctx.strokeStyle = isPivotActive ? '#facc15' : '#a855f7';
      ctx.fillStyle = isPivotActive ? '#facc15' : '#a855f7';
      ctx.lineWidth = isPivotActive ? 3 : 2;

      ctx.beginPath();
      ctx.arc(px, py, isPivotActive ? 8 : 6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(px - 12, py);
      ctx.lineTo(px + 12, py);
      ctx.moveTo(px, py - 12);
      ctx.lineTo(px, py + 12);
      ctx.stroke();

      ctx.font = 'bold 9px monospace';
      ctx.fillText(`PIVOT (${globalPivot.x},${globalPivot.y})${isDraggingPivot ? ' [MOVIENDO]' : ''}`, px + 8, py - 4);
    }

    // 10. Customizable Selection Visualization (Marching Ants / Fill / Both / Outline)
    if (selection && selection.active) {
      const minX = Math.max(0, Math.min(selection.startX, selection.endX));
      const maxX = Math.min(width - 1, Math.max(selection.startX, selection.endX));
      const minY = Math.max(0, Math.min(selection.startY, selection.endY));
      const maxY = Math.min(height - 1, Math.max(selection.startY, selection.endY));
      const hasMask = Boolean(selection.mask);
      const isInSel = (px: number, py: number) => {
        if (px < 0 || px >= width || py < 0 || py >= height) return false;
        if (hasMask) return Boolean(selection.mask![py]?.[px]);
        return px >= minX && px <= maxX && py >= minY && py <= maxY;
      };

      const selMode = selectionDisplayConfig?.mode || 'both';
      const borderHex = selectionDisplayConfig?.borderColor || '#38bdf8';
      const fillAlpha = Math.max(0.03, Math.min(0.85, selectionDisplayConfig?.opacity ?? 0.22));
      const strokeWidth = Math.max(0.8, Math.min(4, selectionDisplayConfig?.thickness ?? 1.5));

      ctx.save();
      if (selMode === 'fill_only' || selMode === 'both') {
        const cleanHex = borderHex.replace('#', '');
        const r = cleanHex.length === 6 ? parseInt(cleanHex.slice(0, 2), 16) : 56;
        const g = cleanHex.length === 6 ? parseInt(cleanHex.slice(2, 4), 16) : 189;
        const b = cleanHex.length === 6 ? parseInt(cleanHex.slice(4, 6), 16) : 248;
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${fillAlpha})`;
        if (!hasMask) {
          ctx.fillRect(minX * zoom, minY * zoom, (maxX - minX + 1) * zoom, (maxY - minY + 1) * zoom);
        } else {
          for (let py = minY; py <= maxY; py++) {
            for (let px = minX; px <= maxX; px++) {
              if (isInSel(px, py)) ctx.fillRect(px * zoom, py * zoom, zoom, zoom);
            }
          }
        }
      }

      if (selMode !== 'fill_only') {
        ctx.beginPath();
        if (!hasMask) {
          ctx.rect(
            minX * zoom + 0.5,
            minY * zoom + 0.5,
            (maxX - minX + 1) * zoom - 1,
            (maxY - minY + 1) * zoom - 1
          );
        } else {
          for (let py = minY; py <= maxY; py++) {
            for (let px = minX; px <= maxX; px++) {
              if (!isInSel(px, py)) continue;
              const sx = px * zoom;
              const sy = py * zoom;
              if (!isInSel(px, py - 1)) { ctx.moveTo(sx, sy); ctx.lineTo(sx + zoom, sy); }
              if (!isInSel(px, py + 1)) { ctx.moveTo(sx, sy + zoom); ctx.lineTo(sx + zoom, sy + zoom); }
              if (!isInSel(px - 1, py)) { ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + zoom); }
              if (!isInSel(px + 1, py)) { ctx.moveTo(sx + zoom, sy); ctx.lineTo(sx + zoom, sy + zoom); }
            }
          }
        }

        if (selMode === 'outline_only') {
          ctx.lineWidth = strokeWidth + 1.2;
          ctx.strokeStyle = 'rgba(9, 13, 22, 0.78)';
          ctx.setLineDash([]);
          ctx.stroke();

          ctx.lineWidth = strokeWidth;
          ctx.strokeStyle = borderHex;
          ctx.stroke();
        } else {
          ctx.lineWidth = strokeWidth;
          ctx.strokeStyle = borderHex;
          ctx.setLineDash([]);
          ctx.stroke();

          ctx.strokeStyle = '#090d16';
          ctx.setLineDash([4, 4]);
          ctx.lineDashOffset = -marchingAntsOffsetRef.current;
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // 11. Freehand, Polygonal & Magnetic Lasso Path (while drawing)
    if (lassoSites.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo((lassoSites[0].x + 0.5) * zoom, (lassoSites[0].y + 0.5) * zoom);
      for (let i = 1; i < lassoSites.length; i++) {
        ctx.lineTo((lassoSites[i].x + 0.5) * zoom, (lassoSites[i].y + 0.5) * zoom);
      }
      ctx.stroke();
      ctx.restore();
    }
    if (polygonLassoPts.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo((polygonLassoPts[0].x + 0.5) * zoom, (polygonLassoPts[0].y + 0.5) * zoom);
      for (let i = 1; i < polygonLassoPts.length; i++) {
        ctx.lineTo((polygonLassoPts[i].x + 0.5) * zoom, (polygonLassoPts[i].y + 0.5) * zoom);
      }
      if (cursorPos) {
        ctx.lineTo((cursorPos.x + 0.5) * zoom, (cursorPos.y + 0.5) * zoom);
      }
      ctx.stroke();
      for (const pt of polygonLassoPts) {
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect((pt.x + 0.5) * zoom - 2.5, (pt.y + 0.5) * zoom - 2.5, 5, 5);
      }
      ctx.restore();
    }
    if (magneticLassoPts.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo((magneticLassoPts[0].x + 0.5) * zoom, (magneticLassoPts[0].y + 0.5) * zoom);
      for (let i = 1; i < magneticLassoPts.length; i++) {
        ctx.lineTo((magneticLassoPts[i].x + 0.5) * zoom, (magneticLassoPts[i].y + 0.5) * zoom);
      }
      ctx.stroke();

      if (magneticPreviewSeg.length > 0) {
        const lastAnchor = magneticLassoPts[magneticLassoPts.length - 1];
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo((lastAnchor.x + 0.5) * zoom, (lastAnchor.y + 0.5) * zoom);
        for (const p of magneticPreviewSeg) {
          ctx.lineTo((p.x + 0.5) * zoom, (p.y + 0.5) * zoom);
        }
        ctx.stroke();
      }

      // Draw anchor knots & closure ring on first node
      const firstPt = magneticLassoPts[0];
      ctx.setLineDash([]);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc((firstPt.x + 0.5) * zoom, (firstPt.y + 0.5) * zoom, 5, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < magneticLassoPts.length; i += Math.max(1, Math.floor(magneticLassoPts.length / 28))) {
        const pt = magneticLassoPts[i];
        ctx.fillStyle = i === 0 ? '#f59e0b' : '#22d3ee';
        ctx.fillRect((pt.x + 0.5) * zoom - 2, (pt.y + 0.5) * zoom - 2, 4, 4);
      }
      ctx.restore();
    }

    // 11.2 Live Gradient / Dithered Gradient Direction Vector Guide
    if (gradientDrag) {
      const gx0 = (gradientDrag.start.x + 0.5) * zoom;
      const gy0 = (gradientDrag.start.y + 0.5) * zoom;
      const gx1 = (gradientDrag.end.x + 0.5) * zoom;
      const gy1 = (gradientDrag.end.y + 0.5) * zoom;
      ctx.save();
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(gx0, gy0);
      ctx.lineTo(gx1, gy1);
      ctx.stroke();

      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(gx0, gy0);
      ctx.lineTo(gx1, gy1);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = primaryColor;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(gx0, gy0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = secondaryColor;
      ctx.beginPath();
      ctx.arc(gx1, gy1, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 11.3 Live Zoom (Lupa) Marquee Region Box
    if (zoomRegionDrag) {
      const rx0 = Math.min(zoomRegionDrag.startGrid.x, zoomRegionDrag.endGrid.x) * zoom;
      const ry0 = Math.min(zoomRegionDrag.startGrid.y, zoomRegionDrag.endGrid.y) * zoom;
      const rw = (Math.abs(zoomRegionDrag.endGrid.x - zoomRegionDrag.startGrid.x) + 1) * zoom;
      const rh = (Math.abs(zoomRegionDrag.endGrid.y - zoomRegionDrag.startGrid.y) + 1) * zoom;
      if (rw >= 6 || rh >= 6) {
        ctx.save();
        ctx.fillStyle = 'rgba(251, 191, 36, 0.14)';
        ctx.fillRect(rx0, ry0, rw, rh);
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 2.6;
        ctx.strokeRect(rx0 + 0.5, ry0 + 0.5, rw - 1, rh - 1);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(rx0 + 0.5, ry0 + 0.5, rw - 1, rh - 1);
        ctx.restore();
      }
    }

    // 11.4 Editable Vector Line / Curve, Real-Time Preview, Metrics HUD & Simultaneous Pixel-Perfect Preview
    if (
      (['line', 'move', 'direct_select'].includes(effTool) ||
        isDirectSelectActive ||
        (activeTool === 'select' && selectionSubTool === 'vectors')) &&
      !isPlaying &&
      !combatTestActive &&
      !transformSession
    ) {
      const disp = vectorConfig?.display || {
        showNodes: true,
        showGuides: true,
        showTangents: true,
        showControlCurves: true,
        showThickness: false,
      };
      const layerVecPaths = currentLayer.vectorPaths || [];
      const activeVecPath = layerVecPaths.find((p) => p.id === selectedVectorPathId) || null;
      const allVecNodes = layerVecPaths.flatMap((p) => p.nodes);

      let livePreviewPath: VectorPath | null = activeVecPath;
      let snappedHoverPt: { x: number; y: number } | null = null;
      if (
        vectorDraftSession?.phase === 'placing' &&
        activeVecPath &&
        activeVecPath.id === vectorDraftSession.pathId &&
        vectorHoverCoord
      ) {
        snappedHoverPt = snapVectorCoord(
          vectorHoverCoord,
          vectorConfig?.snap || { grid: false, pixel: true, guides: true, nodes: true, objects: true },
          width,
          height,
          allVecNodes
        );
        livePreviewPath = {
          ...activeVecPath,
          color: primaryColor,
          strokeWidth: vectorConfig?.strokeWidth ?? activeVecPath.strokeWidth,
          nodes: [
            ...activeVecPath.nodes,
            {
              id: 'hover-preview-node',
              x: snappedHoverPt.x,
              y: snappedHoverPt.y,
              nodeType:
                vectorConfig?.mode === 'bezier' || vectorConfig?.mode === 'smooth' ? 'smooth' : 'corner',
              width: vectorConfig?.strokeWidth ?? activeVecPath.strokeWidth,
            },
          ],
        };
      }

      // Simultaneous Pixel-Perfect Raster Preview Grid overlay (crisp individual cells)
      if (
        showPixelPerfectVectorPreview &&
        livePreviewPath &&
        livePreviewPath.nodes.length >= 2
      ) {
        const previewCells = rasterizeVectorPathPreviewCells(livePreviewPath, width, height);
        const col = livePreviewPath.color || primaryColor;
        ctx.save();
        for (const cell of previewCells) {
          const pts =
            effSymmetry.enabled && effSymmetry.mode !== 'none'
              ? computeSymmetricPoints(cell.x, cell.y, width, height, effSymmetry, true)
              : [{ x: cell.x, y: cell.y }];
          for (const pt of pts) {
            if (pt.x < 0 || pt.x >= width || pt.y < 0 || pt.y >= height) continue;
            if (vectorDraftSession?.phase === 'placing') {
              ctx.fillStyle = col;
              ctx.globalAlpha = 0.84;
              ctx.fillRect(pt.x * zoom, pt.y * zoom, zoom, zoom);
            }
            ctx.globalAlpha = 0.72;
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
            ctx.lineWidth = 1;
            ctx.strokeRect(pt.x * zoom + 0.5, pt.y * zoom + 0.5, Math.max(1, zoom - 1), Math.max(1, zoom - 1));
          }
        }
        ctx.restore();
      }

      // Real-time floating vector stroke preview + length/angle/direction HUD during placing
      if (vectorDraftSession?.phase === 'placing' && livePreviewPath && livePreviewPath.nodes.length >= 2) {
        const sampledLive = sampleVectorPath(livePreviewPath);
        if (sampledLive.length >= 2) {
          ctx.save();
          ctx.strokeStyle = livePreviewPath.color || primaryColor;
          ctx.lineWidth = Math.max(1.5, (livePreviewPath.strokeWidth || 1) * zoom * 0.45);
          ctx.lineCap = livePreviewPath.capStyle || 'round';
          ctx.lineJoin = livePreviewPath.joinStyle || 'round';
          ctx.globalAlpha = 0.78;
          ctx.beginPath();
          ctx.moveTo((sampledLive[0].x + 0.5) * zoom, (sampledLive[0].y + 0.5) * zoom);
          for (let i = 1; i < sampledLive.length; i++) {
            ctx.lineTo((sampledLive[i].x + 0.5) * zoom, (sampledLive[i].y + 0.5) * zoom);
          }
          ctx.stroke();

          // Direction arrowhead at tip + live metrics badge
          const prevN = livePreviewPath.nodes[livePreviewPath.nodes.length - 2];
          const tipN = livePreviewPath.nodes[livePreviewPath.nodes.length - 1];
          const metrics = computeVectorSegmentMetrics(prevN, tipN);
          const tx = (tipN.x + 0.5) * zoom;
          const ty = (tipN.y + 0.5) * zoom;
          const rad = (metrics.angleDeg * Math.PI) / 180;
          ctx.globalAlpha = 0.95;
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(tx - Math.cos(rad - 0.45) * 9, ty - Math.sin(rad - 0.45) * 9);
          ctx.lineTo(tx - Math.cos(rad + 0.45) * 9, ty - Math.sin(rad + 0.45) * 9);
          ctx.closePath();
          ctx.fill();

          const hudText = `${metrics.lengthPx}px · ${metrics.angleDeg}° (${metrics.directionLabel})`;
          ctx.font = 'bold 10px monospace';
          const tw = ctx.measureText(hudText).width + 10;
          const bx = Math.max(4, Math.min(width * zoom - tw - 4, tx + 10));
          const by = Math.max(18, Math.min(height * zoom - 6, ty - 10));
          ctx.fillStyle = 'rgba(10, 14, 22, 0.92)';
          ctx.fillRect(bx, by - 14, tw, 16);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1;
          ctx.strokeRect(bx, by - 14, tw, 16);
          ctx.fillStyle = '#e0f2fe';
          ctx.fillText(hudText, bx + 5, by - 2);
          ctx.restore();
        }
      }

      if (layerVecPaths.length > 0) {
        if (disp.showGuides) {
          ctx.save();
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          const cx = (width / 2) * zoom;
          const cy = (height / 2) * zoom;
          ctx.beginPath();
          ctx.moveTo(cx, 0);
          ctx.lineTo(cx, height * zoom);
          ctx.moveTo(0, cy);
          ctx.lineTo(width * zoom, cy);
          ctx.stroke();
          ctx.restore();
        }

        const selNodeSet = new Set(selectedVectorNodeIds);
        for (const vp of layerVecPaths) {
          const isActivePath = vp.id === selectedVectorPathId;
          const segCount = vp.closed ? vp.nodes.length : Math.max(0, vp.nodes.length - 1);

          if (disp.showControlCurves && vp.nodes.length >= 2) {
            ctx.save();
            ctx.strokeStyle = isActivePath ? 'rgba(56, 189, 248, 0.75)' : 'rgba(148, 163, 184, 0.45)';
            ctx.lineWidth = isActivePath ? 1.5 : 1;
            ctx.setLineDash(vp.smartPixelCurve ? [] : [3, 3]);
            ctx.beginPath();
            const sampled = sampleVectorPath(vp);
            if (sampled.length > 0) {
              ctx.moveTo((sampled[0].x + 0.5) * zoom, (sampled[0].y + 0.5) * zoom);
              for (let i = 1; i < sampled.length; i++) {
                ctx.lineTo((sampled[i].x + 0.5) * zoom, (sampled[i].y + 0.5) * zoom);
              }
            }
            ctx.stroke();
            ctx.restore();
          }

          if (disp.showThickness && isActivePath) {
            ctx.save();
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
            ctx.lineWidth = 1;
            for (const nd of vp.nodes) {
              const w = nd.width ?? vp.strokeWidth;
              ctx.beginPath();
              ctx.arc((nd.x + 0.5) * zoom, (nd.y + 0.5) * zoom, (w * zoom) / 2, 0, Math.PI * 2);
              ctx.stroke();
            }
            ctx.restore();
          }

          if (disp.showTangents && isActivePath) {
            for (let s = 0; s < segCount; s++) {
              const eff = getEffectiveHandlesForSegment(vp, s);
              if (!eff) continue;
              const n0 = vp.nodes[s];
              const n1 = vp.nodes[(s + 1) % vp.nodes.length];
              const showH0 = n0.outHandleX !== undefined || selNodeSet.has(n0.id);
              const showH1 = n1.inHandleX !== undefined || selNodeSet.has(n1.id);
              ctx.save();
              ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
              ctx.lineWidth = 1;
              if (showH0) {
                ctx.beginPath();
                ctx.moveTo((n0.x + 0.5) * zoom, (n0.y + 0.5) * zoom);
                ctx.lineTo((eff.c1.x + 0.5) * zoom, (eff.c1.y + 0.5) * zoom);
                ctx.stroke();
                ctx.fillStyle = '#0f172a';
                ctx.beginPath();
                ctx.arc((eff.c1.x + 0.5) * zoom, (eff.c1.y + 0.5) * zoom, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
              }
              if (showH1) {
                ctx.beginPath();
                ctx.moveTo((n1.x + 0.5) * zoom, (n1.y + 0.5) * zoom);
                ctx.lineTo((eff.c2.x + 0.5) * zoom, (eff.c2.y + 0.5) * zoom);
                ctx.stroke();
                ctx.fillStyle = '#0f172a';
                ctx.beginPath();
                ctx.arc((eff.c2.x + 0.5) * zoom, (eff.c2.y + 0.5) * zoom, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
              }
              ctx.restore();
            }
          }

          if (disp.showNodes) {
            for (const nd of vp.nodes) {
              const sx = (nd.x + 0.5) * zoom;
              const sy = (nd.y + 0.5) * zoom;
              const isSel = selNodeSet.has(nd.id);
              ctx.save();
              ctx.fillStyle = isSel ? '#fbbf24' : isActivePath ? '#38bdf8' : '#cbd5e1';
              ctx.strokeStyle = '#090d16';
              ctx.lineWidth = 1.5;
              if (nd.nodeType === 'corner') {
                ctx.fillRect(sx - 4, sy - 4, 8, 8);
                ctx.strokeRect(sx - 4, sy - 4, 8, 8);
              } else {
                ctx.beginPath();
                ctx.arc(sx, sy, isSel ? 5 : 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
              }
              ctx.restore();
            }
          }
        }

        if (vectorMarquee) {
          const mx = Math.min(vectorMarquee.startX, vectorMarquee.endX) * zoom;
          const my = Math.min(vectorMarquee.startY, vectorMarquee.endY) * zoom;
          const mw = (Math.abs(vectorMarquee.endX - vectorMarquee.startX) + 1) * zoom;
          const mh = (Math.abs(vectorMarquee.endY - vectorMarquee.startY) + 1) * zoom;
          ctx.save();
          ctx.strokeStyle = '#38bdf8';
          ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 3]);
          ctx.fillRect(mx, my, mw, mh);
          ctx.strokeRect(mx, my, mw, mh);
          ctx.restore();
        }
      }
    }

    // 11.6 Interactive Transform Box + Live Edge Distance Guides + Pivot Crosshair
    if (transformSession && !isPlaying && !combatTestActive) {
      const tp = transformSession.params;
      const corners = getTransformedQuadCorners(tp);
      const pts = corners.map((c) => ({ x: c.x * zoom, y: c.y * zoom }));

      // Distance guides to canvas borders
      const minX = Math.min(...corners.map((c) => c.x));
      const maxX = Math.max(...corners.map((c) => c.x));
      const minY = Math.min(...corners.map((c) => c.y));
      const maxY = Math.max(...corners.map((c) => c.y));
      const midX = ((minX + maxX) / 2) * zoom;
      const midY = ((minY + maxY) / 2) * zoom;

      ctx.save();
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(minX * zoom, midY);
      ctx.moveTo(maxX * zoom, midY);
      ctx.lineTo(width * zoom, midY);
      ctx.moveTo(midX, 0);
      ctx.lineTo(midX, minY * zoom);
      ctx.moveTo(midX, maxY * zoom);
      ctx.lineTo(midX, height * zoom);
      ctx.stroke();
      ctx.setLineDash([]);

      // Distance labels
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#fde68a';
      ctx.fillText(`${Math.round(minX)}px`, Math.max(4, (minX * zoom) / 2 - 10), midY - 4);
      ctx.fillText(`${Math.round(width - maxX)}px`, Math.min(width * zoom - 28, (maxX * zoom + width * zoom) / 2), midY - 4);
      ctx.fillText(`${Math.round(minY)}px`, midX + 4, Math.max(11, (minY * zoom) / 2));

      // Transform quad outline
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.lineTo(pts[2].x, pts[2].y);
      ctx.lineTo(pts[3].x, pts[3].y);
      ctx.closePath();
      ctx.stroke();

      // Warp grid lines
      if (tp.mode === 'warp') {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.beginPath();
        ctx.moveTo((pts[0].x + pts[3].x) / 2, (pts[0].y + pts[3].y) / 2);
        ctx.lineTo((pts[1].x + pts[2].x) / 2, (pts[1].y + pts[2].y) / 2);
        ctx.moveTo((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
        ctx.lineTo((pts[3].x + pts[2].x) / 2, (pts[3].y + pts[2].y) / 2);
        ctx.stroke();
      }

      // 8 handles (corners + edge midpoints)
      const edgeMids = [
        { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 },
        { x: (pts[1].x + pts[2].x) / 2, y: (pts[1].y + pts[2].y) / 2 },
        { x: (pts[2].x + pts[3].x) / 2, y: (pts[2].y + pts[3].y) / 2 },
        { x: (pts[3].x + pts[0].x) / 2, y: (pts[3].y + pts[0].y) / 2 },
      ];
      const allHandles = [...pts, ...edgeMids];
      allHandles.forEach((h, idx) => {
        ctx.fillStyle = idx < 4 && (tp.mode === 'distort' || tp.mode === 'perspective') ? '#f59e0b' : '#ffffff';
        ctx.strokeStyle = '#0ea5e9';
        ctx.lineWidth = 1.5;
        ctx.fillRect(h.x - 4, h.y - 4, 8, 8);
        ctx.strokeRect(h.x - 4, h.y - 4, 8, 8);
      });

      // Photoshop-style Curved Rotation Arc Cue on outer corner hover or active rotation
      if (transformHoverRotCorner || transformDragRef.current?.kind === 'rotate') {
        const arcCenter = transformHoverRotCorner || {
          cornerX: pts[1].x,
          cornerY: pts[1].y,
        };
        const pivScreen = {
          x: (tp.pivotX + (tp.x - tp.baseX)) * zoom,
          y: (tp.pivotY + (tp.y - tp.baseY)) * zoom,
        };
        const ang = Math.atan2(arcCenter.cornerY - pivScreen.y, arcCenter.cornerX - pivScreen.x);
        ctx.save();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(arcCenter.cornerX, arcCenter.cornerY, 15, ang - 0.65, ang + 0.65);
        ctx.stroke();
        ctx.restore();
      }

      // Pivot Crosshair
      const pivX = (tp.pivotX + (tp.x - tp.baseX)) * zoom;
      const pivY = (tp.pivotY + (tp.y - tp.baseY)) * zoom;
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pivX, pivY, 5, 0, Math.PI * 2);
      ctx.moveTo(pivX - 9, pivY);
      ctx.lineTo(pivX + 9, pivY);
      ctx.moveTo(pivX, pivY - 9);
      ctx.lineTo(pivX, pivY + 9);
      ctx.stroke();

      // Live readout badge near top-left of box
      const readout = `X:${Math.round(tp.x)} Y:${Math.round(tp.y)} · ${Math.round(tp.scaleX)}%×${Math.round(tp.scaleY)}% · ${Math.round(tp.rotation)}°`;
      const rW = ctx.measureText(readout).width + 10;
      const rx = Math.max(4, Math.min(width * zoom - rW - 4, pts[0].x));
      const ry = Math.max(16, pts[0].y - 8);
      ctx.fillStyle = 'rgba(10, 14, 22, 0.88)';
      ctx.fillRect(rx, ry - 13, rW, 15);
      ctx.strokeStyle = '#38bdf8';
      ctx.strokeRect(rx, ry - 13, rW, 15);
      ctx.fillStyle = '#e0f2fe';
      ctx.fillText(readout, rx + 5, ry - 2);
      ctx.restore();
    }

    // 11b. Interactive Parametric Shape Overlay (Unified Transform + Live Shape-Specific Handles)
    if (!isPlaying && !combatTestActive && !transformSession) {
      const activeShapeObj: ParametricShapeObject | null =
        creatingShapeDraftRef.current ||
        (selectedParametricShapeId
          ? (shapeLiveOverrideRef.current && shapeLiveOverrideRef.current.id === selectedParametricShapeId
              ? shapeLiveOverrideRef.current
              : (currentLayer.parametricShapes || []).find((s) => s.id === selectedParametricShapeId) || null)
          : null);

      if (activeShapeObj) {
        ctx.save();
        const cTL = shapeNormToCanvas(activeShapeObj, 0, 0);
        const cTR = shapeNormToCanvas(activeShapeObj, 1, 0);
        const cBR = shapeNormToCanvas(activeShapeObj, 1, 1);
        const cBL = shapeNormToCanvas(activeShapeObj, 0, 1);
        const cTop = shapeNormToCanvas(activeShapeObj, 0.5, 0);
        const cCenter = shapeNormToCanvas(activeShapeObj, 0.5, 0.5);

        // Bounding quad outline
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.25;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(cTL.x * zoom, cTL.y * zoom);
        ctx.lineTo(cTR.x * zoom, cTR.y * zoom);
        ctx.lineTo(cBR.x * zoom, cBR.y * zoom);
        ctx.lineTo(cBL.x * zoom, cBL.y * zoom);
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);

        if (!creatingShapeDraftRef.current) {
          const handles = getParametricShapeHandles(activeShapeObj);
          const rotHandle = handles.find((h) => h.kind === 'rotate');
          if (rotHandle) {
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(cTop.x * zoom, cTop.y * zoom);
            ctx.lineTo(rotHandle.x * zoom, rotHandle.y * zoom);
            ctx.stroke();
          }

          // Helper guide lines for shape-specific manipulators
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.55)';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          for (const h of handles) {
            if (h.kind === 'cr_tl') {
              ctx.beginPath();
              ctx.moveTo(cTL.x * zoom, cTL.y * zoom);
              ctx.lineTo(h.x * zoom, h.y * zoom);
              ctx.stroke();
            } else if (h.kind === 'cr_tr') {
              ctx.beginPath();
              ctx.moveTo(cTR.x * zoom, cTR.y * zoom);
              ctx.lineTo(h.x * zoom, h.y * zoom);
              ctx.stroke();
            } else if (h.kind === 'cr_br') {
              ctx.beginPath();
              ctx.moveTo(cBR.x * zoom, cBR.y * zoom);
              ctx.lineTo(h.x * zoom, h.y * zoom);
              ctx.stroke();
            } else if (h.kind === 'cr_bl') {
              ctx.beginPath();
              ctx.moveTo(cBL.x * zoom, cBL.y * zoom);
              ctx.lineTo(h.x * zoom, h.y * zoom);
              ctx.stroke();
            } else if (
              h.kind === 'arc_start' ||
              h.kind === 'arc_end' ||
              h.kind === 'poly_inner' ||
              h.kind === 'star_depth'
            ) {
              ctx.beginPath();
              ctx.moveTo(cCenter.x * zoom, cCenter.y * zoom);
              ctx.lineTo(h.x * zoom, h.y * zoom);
              ctx.stroke();
            }
          }
          ctx.setLineDash([]);

          for (const h of handles) {
            const hx = h.x * zoom;
            const hy = h.y * zoom;
            if (h.kind === 'pivot') {
              ctx.strokeStyle = '#10b981';
              ctx.lineWidth = 1.4;
              ctx.beginPath();
              ctx.arc(hx, hy, 4.5, 0, Math.PI * 2);
              ctx.moveTo(hx - 7, hy);
              ctx.lineTo(hx + 7, hy);
              ctx.moveTo(hx, hy - 7);
              ctx.lineTo(hx, hy + 7);
              ctx.stroke();
            } else if (h.kind === 'rotate') {
              ctx.fillStyle = '#090d16';
              ctx.strokeStyle = '#f59e0b';
              ctx.lineWidth = 1.8;
              ctx.beginPath();
              ctx.arc(hx, hy, 5, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            } else if (
              h.kind === 'tl' ||
              h.kind === 'tr' ||
              h.kind === 'br' ||
              h.kind === 'bl' ||
              h.kind === 't' ||
              h.kind === 'r' ||
              h.kind === 'b' ||
              h.kind === 'l'
            ) {
              const sz = h.kind.length === 2 ? 7 : 6;
              ctx.fillStyle = '#0b101b';
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 1.5;
              ctx.fillRect(hx - sz / 2, hy - sz / 2, sz, sz);
              ctx.strokeRect(hx - sz / 2, hy - sz / 2, sz, sz);
            } else {
              // Shape-specific interactive handle (diamond/circle)
              const strokeCol = h.accent === 'rose' ? '#fb7185' : '#22d3ee';
              ctx.fillStyle = '#090d16';
              ctx.strokeStyle = strokeCol;
              ctx.lineWidth = 1.8;
              ctx.beginPath();
              ctx.arc(hx, hy, 4.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
              ctx.fillStyle = strokeCol;
              ctx.beginPath();
              ctx.arc(hx, hy, 1.6, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        // Crisp numeric HUD badge for live shape dimensions / parameter drag
        ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
        const hudText =
          shapeDragRef.current?.dragHud ||
          `${SHAPE_KIND_LABELS[activeShapeObj.kind]} · ${Math.round(activeShapeObj.width)}×${Math.round(
            activeShapeObj.height
          )}px${Math.abs(activeShapeObj.rotation) > 0.5 ? ` · ${Math.round(activeShapeObj.rotation)}°` : ''}`;
        const hudW = ctx.measureText(hudText).width + 10;
        const hudX = Math.max(4, Math.min(width * zoom - hudW - 4, Math.min(cTL.x, cBL.x) * zoom));
        const hudY = Math.max(18, Math.min(cTL.y, cTR.y) * zoom - 10);
        ctx.fillStyle = 'rgba(9, 13, 22, 0.9)';
        ctx.fillRect(hudX, hudY - 13, hudW, 15);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.strokeRect(hudX, hudY - 13, hudW, 15);
        ctx.fillStyle = '#e0f2fe';
        ctx.fillText(hudText, hudX + 5, hudY - 2);
        ctx.restore();
      } else if (activeTool === 'move' && moveOptions.showControls) {
        // Show subtle layer content bounding frame when "Mostrar controles" is enabled
        let minX = width, maxX = -1, minY = height, maxY = -1;
        for (let py = 0; py < height; py++) {
          for (let px = 0; px < width; px++) {
            if (currentLayer.pixels[py]?.[px]) {
              if (px < minX) minX = px;
              if (px > maxX) maxX = px;
              if (py < minY) minY = py;
              if (py > maxY) maxY = py;
            }
          }
        }
        if (maxX >= minX && maxY >= minY) {
          ctx.save();
          const bx = minX * zoom;
          const by = minY * zoom;
          const bw = (maxX - minX + 1) * zoom;
          const bh = (maxY - minY + 1) * zoom;
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 3]);
          ctx.strokeRect(bx, by, bw, bh);
          ctx.setLineDash([]);
          const pts = [
            [bx, by],
            [bx + bw, by],
            [bx + bw, by + bh],
            [bx, by + bh],
          ];
          ctx.fillStyle = '#090d16';
          ctx.strokeStyle = '#38bdf8';
          for (const [cx, cy] of pts) {
            ctx.fillRect(cx - 3, cy - 3, 6, 6);
            ctx.strokeRect(cx - 3, cy - 3, 6, 6);
          }
          ctx.restore();
        }
      }
    }

    // 11B. Work Mode Specialized Overlays (Stage Composition Guides & Tileset Studio Seam/Grid)
    if (!isPlaying && !combatTestActive && workMode === 'stage' && stageParallaxConfig?.guides) {
      const sg = stageParallaxConfig.guides;
      const canvasW = width * zoom;
      const canvasH = height * zoom;
      ctx.save();
      ctx.font = 'bold 9px monospace';

      if (sg.playableArea) {
        const yTop = Math.round(height * 0.72) * zoom;
        const yBot = Math.round(height * 0.94) * zoom;
        ctx.fillStyle = 'rgba(16, 185, 129, 0.11)';
        ctx.fillRect(0, yTop, canvasW, Math.max(2, yBot - yTop));
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.75)';
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, yTop);
        ctx.lineTo(canvasW, yTop);
        ctx.moveTo(0, yBot);
        ctx.lineTo(canvasW, yBot);
        ctx.stroke();
        ctx.fillStyle = 'rgba(16, 185, 129, 0.95)';
        ctx.fillText('ÁREA JUGABLE', 6, Math.max(11, yTop - 3));
      }

      if (sg.horizon) {
        const yH = Math.round(height * 0.42) * zoom;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, yH);
        ctx.lineTo(canvasW, yH);
        ctx.stroke();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.95)';
        ctx.fillText('HORIZONTE', 6, Math.max(11, yH - 3));
      }

      if (sg.jumpHeight) {
        const yJ = Math.round(height * 0.34) * zoom;
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)';
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, yJ);
        ctx.lineTo(canvasW, yJ);
        ctx.stroke();
        ctx.fillStyle = 'rgba(251, 191, 36, 0.95)';
        ctx.fillText('ALTURA DE SALTO', Math.max(6, canvasW - 96), Math.max(11, yJ - 3));
      }

      if (sg.sideBounds) {
        const xL = Math.round(width * 0.08) * zoom;
        const xR = Math.round(width * 0.92) * zoom;
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.75)';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(xL, 0);
        ctx.lineTo(xL, canvasH);
        ctx.moveTo(xR, 0);
        ctx.lineTo(xR, canvasH);
        ctx.stroke();
      }

      if (sg.cameraZone) {
        const x1 = Math.round(width * 0.12) * zoom;
        const y1 = Math.round(height * 0.1) * zoom;
        const wBox = Math.round(width * 0.76) * zoom;
        const hBox = Math.round(height * 0.84) * zoom;
        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.65)';
        ctx.lineWidth = 1.25;
        ctx.strokeRect(x1, y1, wBox, hBox);
        ctx.fillStyle = 'rgba(203, 213, 225, 0.85)';
        ctx.fillText('CÁMARA', x1 + 5, y1 + 11);
      }

      ctx.restore();
    }

    if (!isPlaying && !combatTestActive && workMode === 'tileset' && tilesetConfig) {
      const canvasW = width * zoom;
      const canvasH = height * zoom;
      ctx.save();

      if (tilesetConfig.showBlockGrid) {
        const step = Math.max(4, tilesetConfig.tileSize || 16);
        ctx.strokeStyle = 'rgba(45, 212, 191, 0.45)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        for (let gx = step; gx < width; gx += step) {
          ctx.moveTo(gx * zoom, 0);
          ctx.lineTo(gx * zoom, canvasH);
        }
        for (let gy = step; gy < height; gy += step) {
          ctx.moveTo(0, gy * zoom);
          ctx.lineTo(canvasW, gy * zoom);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (tilesetConfig.showSeamChecker && composedGrid.length > 0) {
        const report = analyzeTilesetSeams(composedGrid, width, height);
        ctx.fillStyle = 'rgba(244, 63, 94, 0.7)';
        for (const pt of report.mismatchedEdgePixels) {
          ctx.fillRect(pt.x * zoom, pt.y * zoom, zoom, zoom);
        }
      }

      if (tilesetConfig.showRepeat3x3) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(0.75, 0.75, canvasW - 1.5, canvasH - 1.5);
        ctx.fillStyle = 'rgba(12, 16, 28, 0.82)';
        ctx.fillRect(4, 4, 88, 14);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('SEAMLESS 3×3', 8, 14);
      }

      ctx.restore();
    }

    // 12. Cursor Hover Reticle (Matches configured brush size & shape + fast-path for >32px + Tiles Ghost Preview)
    if (cursorPos && !isSpaceDown && effTool === 'tile') {
      const tileSz = Math.max(4, tileToolConfig.tileSize || 16);
      const tx = Math.floor(cursorPos.x / tileSz);
      const ty = Math.floor(cursorPos.y / tileSz);
      const gx = tx * tileSz;
      const gy = ty * tileSz;
      ctx.save();
      if (tileToolConfig.mode !== 'erase' && tileToolConfig.mode !== 'select' && activeTileItem) {
        ctx.globalAlpha = 0.55;
        const tw = Math.max(1, activeTileItem.width);
        const th = Math.max(1, activeTileItem.height);
        for (let py = 0; py < tileSz; py++) {
          const pxRow = activeTileItem.pixels[py % th];
          if (!pxRow) continue;
          for (let px = 0; px < tileSz; px++) {
            const c = pxRow[px % tw];
            if (!c) continue;
            const cx = gx + px;
            const cy = gy + py;
            if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;
            ctx.fillStyle = c;
            ctx.fillRect(cx * zoom, cy * zoom, zoom, zoom);
          }
        }
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle =
        tileToolConfig.mode === 'erase'
          ? 'rgba(244, 63, 94, 0.95)'
          : tileToolConfig.mode === 'select'
          ? 'rgba(56, 189, 248, 0.95)'
          : 'rgba(16, 185, 129, 0.95)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(gx * zoom + 0.5, gy * zoom + 0.5, tileSz * zoom - 1, tileSz * zoom - 1);
      ctx.restore();
    } else if (cursorPos && !isSpaceDown && effTool !== 'hand' && effTool !== 'move') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1;
      const reticleSize = ['pencil', 'eraser', 'shading', 'smear', 'line', 'dither'].includes(effTool)
        ? Math.max(1, brushSettings.size || brushSize)
        : brushSize;
      const half = Math.floor(reticleSize / 2);
      const cx = (cursorPos.x - half) * zoom;
      const cy = (cursorPos.y - half) * zoom;
      const cw = reticleSize * zoom;
      const ch = reticleSize * zoom;

      // Per-pixel dither preview capped at <=32px to guarantee 60fps on 64-256px brushes
      if (reticleSize <= 32 && (effTool === 'dither' || (effTool === 'pencil' && Boolean(effDitherConfig.enabled)))) {
        const stamps = getBrushStampOffsets(reticleSize, brushSettings.shape);
        ctx.save();
        for (const { dx, dy } of stamps) {
          const px = cursorPos.x + dx;
          const py = cursorPos.y + dy;
          if (px < 0 || px >= width || py < 0 || py >= height) continue;
          const threshold = evaluateDitherThreshold(px, py, effDitherConfig);
          const hit = effDitherConfig.invert
            ? effDitherConfig.density / 100 < threshold
            : effDitherConfig.density / 100 >= threshold;
          ctx.fillStyle = hit ? primaryColor : secondaryColor;
          ctx.globalAlpha = hit ? 0.55 : 0.22;
          ctx.fillRect(px * zoom, py * zoom, zoom, zoom);
        }
        ctx.restore();
      }

      const isBrushOutlineTool = ['pencil', 'eraser', 'dither', 'shading', 'smear'].includes(effTool);
      if (brushSettings.shape === 'circle' && reticleSize > 1 && isBrushOutlineTool) {
        ctx.beginPath();
        ctx.arc(cx + cw / 2, cy + ch / 2, cw / 2, 0, Math.PI * 2);
        ctx.stroke();
      } else if (brushSettings.shape === 'diamond' && reticleSize > 1 && isBrushOutlineTool) {
        ctx.beginPath();
        ctx.moveTo(cx + cw / 2, cy);
        ctx.lineTo(cx + cw, cy + ch / 2);
        ctx.lineTo(cx + cw / 2, cy + ch);
        ctx.lineTo(cx, cy + ch / 2);
        ctx.closePath();
        ctx.stroke();
      } else {
        ctx.strokeRect(cx, cy, cw, ch);
      }

      // Subtle center crosshair + compact size badge for large brushes (>=24px)
      if (reticleSize >= 24 && isBrushOutlineTool) {
        const midX = cx + cw / 2;
        const midY = cy + ch / 2;
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.beginPath();
        ctx.moveTo(midX - 4, midY);
        ctx.lineTo(midX + 4, midY);
        ctx.moveTo(midX, midY - 4);
        ctx.lineTo(midX, midY + 4);
        ctx.stroke();
        const tag = `${reticleSize}px`;
        ctx.font = 'bold 9px monospace';
        const tw = ctx.measureText(tag).width + 8;
        ctx.fillStyle = 'rgba(10, 12, 20, 0.82)';
        ctx.fillRect(cx + cw - tw, Math.max(0, cy - 14), tw, 13);
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(tag, cx + cw - tw + 4, Math.max(10, cy - 4));
        ctx.restore();
      }

      // Live Pre-Stroke Symmetry Replica Point Preview
      if (
        effSymmetry.enabled &&
        effSymmetry.mode !== 'none' &&
        effSymmetry.showReplicaPoints &&
        ['pencil', 'eraser', 'dither', 'shading', 'bucket', 'line', 'rectangle', 'circle'].includes(effTool)
      ) {
        const replicas = computeSymmetricPoints(cursorPos.x, cursorPos.y, width, height, effSymmetry, true);
        if (replicas.length > 1) {
          ctx.save();
          ctx.strokeStyle = 'rgba(192, 132, 252, 0.9)';
          ctx.fillStyle = 'rgba(168, 85, 247, 0.16)';
          ctx.lineWidth = 1;
          for (let i = 1; i < replicas.length; i++) {
            const rp = replicas[i];
            const rx = (rp.x - half) * zoom;
            const ry = (rp.y - half) * zoom;
            if (brushSettings.shape === 'circle' && reticleSize > 1 && isBrushOutlineTool) {
              ctx.beginPath();
              ctx.arc(rx + cw / 2, ry + ch / 2, cw / 2, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            } else if (brushSettings.shape === 'diamond' && reticleSize > 1 && isBrushOutlineTool) {
              ctx.beginPath();
              ctx.moveTo(rx + cw / 2, ry);
              ctx.lineTo(rx + cw, ry + ch / 2);
              ctx.lineTo(rx + cw / 2, ry + ch);
              ctx.lineTo(rx, ry + ch / 2);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            } else {
              ctx.fillRect(rx, ry, cw, ch);
              ctx.strokeRect(rx, ry, cw, ch);
            }
          }
          ctx.restore();
        }
      }
    }

    ctx.restore();
  }, [
    zoom,
    width,
    height,
    virtualRect.left,
    virtualRect.top,
    virtualRect.width,
    virtualRect.height,
    virtualRect.minWorldX,
    virtualRect.minWorldY,
    virtualRect.maxWorldX,
    virtualRect.maxWorldY,
    currentFrame,
    currentLayer,
    previousFrame,
    nextFrame,
    onionSkinEnabled,
    onionSkinOpacity,
    showGrid,
    showHitboxes,
    showPivot,
    globalPivot,
    stageType,
    stageOpacity,
    groundConfig,
    dummyOpponent,
    symmetryEnabled,
    symmetryAxis,
    effSymmetry,
    effTool,
    brushSize,
    brushSettings,
    effDitherConfig,
    primaryColor,
    secondaryColor,
    cursorPos,
    isDrawing,
    isDraggingContent,
    linkMoveAllFrames,
    selection,
    lassoSites,
    polygonLassoPts,
    draggingHitboxId,
    selectedHitboxId,
    resizingHitbox,
    hoveredHitboxId,
    isDraggingPivot,
    hoveredPivot,
    isSpaceDown,
    playbackFrameIndex,
    isPlaying,
    allFrames,
    onionSkinPrev,
    onionSkinNext,
    currentFrameIndex,
    textAnchor,
    textMaxWidth,
    textMaxHeight,
    references,
    referenceGroups,
    activeReferenceId,
    combatTestActive,
    layerGroups,
    transformSession,
    transformHoverRotCorner,
    liveCanvasPreview,
    vectorConfig,
    selectedVectorPathId,
    selectedVectorNodeIds,
    vectorMarquee,
    vectorHoverCoord,
    vectorDraftSession,
    showPixelPerfectVectorPreview,
    selectionDisplayConfig,
    magneticLassoPts,
    magneticPreviewSeg,
    gradientDrag,
    zoomRegionDrag,
    isDirectSelectActive,
    selectionSubTool,
    primaryColor,
    secondaryColor,
    selectedParametricShapeId,
    creatingShapeDraft,
    moveOptions.showControls,
    gradientConfig,
    activePaletteColors,
    workMode,
    stageParallaxConfig,
    tilesetConfig,
    tileToolConfig,
    activeTileItem,
    performanceMode,
  ]);

  // Animated Marching Ants loop honoring Preferencias -> Interfaz -> Selecciones & Performance Mode
  useEffect(() => {
    const mode = selectionDisplayConfig?.mode || 'both';
    const speed = selectionDisplayConfig?.animationSpeed ?? 55;
    if (
      !selection?.active ||
      isPlaying ||
      (performanceMode === 'performance' && isDrawing) ||
      mode === 'fill_only' ||
      mode === 'outline_only' ||
      speed <= 0
    ) {
      return;
    }
    const baseMs = Math.max(20, Math.round(220 - speed * 1.9));
    const intervalMs =
      performanceMode === 'performance'
        ? Math.max(220, baseMs * 2.5)
        : performanceMode === 'balanced'
        ? Math.max(80, baseMs)
        : baseMs;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      marchingAntsOffsetRef.current = (marchingAntsOffsetRef.current + 1) % 8;
      renderCanvas();
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [selection?.active, isPlaying, isDrawing, performanceMode, renderCanvas, selectionDisplayConfig]);

  // Live preview of Pixel Text Tool onto draftPixelsRef while user types or tweaks min/max options
  useEffect(() => {
    if (activeTool !== 'text' || !textAnchor) return;
    const baseGrid =
      currentLayer.layerType === 'adjustment'
        ? createEmptyGrid(width, height)
        : currentLayer.pixels.map((r) => [...r]);

    const raster = rasterizePixelText({
      text: textInput,
      font: textFont,
      scale: textScale,
      color: primaryColor,
      secondaryColor,
      gradient: textGradient,
      outline: textOutline,
      outlineColor: '#090b10',
      shadow: textShadow,
      letterSpacing: textLetterSpacing,
      lineHeight: textLineHeight,
      maxWidth: textMaxWidth,
      maxHeight: textMaxHeight,
      align: textAlign,
    });

    for (const p of raster.pixels) {
      const tx = textAnchor.x + p.x;
      const ty = textAnchor.y + p.y;
      if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
        baseGrid[ty][tx] = p.color;
      }
    }
    draftPixelsRef.current = baseGrid;
    renderCanvas();
  }, [
    activeTool,
    textAnchor,
    textInput,
    textFont,
    textScale,
    textMaxWidth,
    textMaxHeight,
    textLetterSpacing,
    textLineHeight,
    textAlign,
    textOutline,
    textShadow,
    textGradient,
    primaryColor,
    secondaryColor,
    currentLayer,
    width,
    height,
    renderCanvas,
  ]);

  // Cancel active text anchor when switching away from text tool
  useEffect(() => {
    if (activeTool !== 'text' && textAnchor) {
      setTextAnchor(null);
      draftPixelsRef.current = [];
      renderCanvas();
    }
  }, [activeTool, textAnchor, renderCanvas]);

  const commitTextTool = (asNewLayer: boolean) => {
    if (!textAnchor || !textInput.trim()) {
      setTextAnchor(null);
      draftPixelsRef.current = [];
      return;
    }
    const raster = rasterizePixelText({
      text: textInput,
      font: textFont,
      scale: textScale,
      color: primaryColor,
      secondaryColor,
      gradient: textGradient,
      outline: textOutline,
      outlineColor: '#090b10',
      shadow: textShadow,
      letterSpacing: textLetterSpacing,
      lineHeight: textLineHeight,
      maxWidth: textMaxWidth,
      maxHeight: textMaxHeight,
      align: textAlign,
    });

    if (asNewLayer && onCreateTextLayer) {
      const layerGrid = createEmptyGrid(width, height);
      for (const p of raster.pixels) {
        const tx = textAnchor.x + p.x;
        const ty = textAnchor.y + p.y;
        if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
          layerGrid[ty][tx] = p.color;
        }
      }
      onCreateTextLayer(`Texto "${textInput.trim().slice(0, 14)}"`, layerGrid);
    } else if (!currentLayer.locked && !currentLayer.lockPixels && currentLayer.layerType !== 'adjustment') {
      const nextGrid = currentLayer.pixels.map((r) => [...r]);
      for (const p of raster.pixels) {
        const tx = textAnchor.x + p.x;
        const ty = textAnchor.y + p.y;
        if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
          if (currentLayer.lockTransparency && nextGrid[ty][tx] === null) continue;
          nextGrid[ty][tx] = p.color;
        }
      }
      onUpdateLayerPixels(nextGrid);
    }
    setTextAnchor(null);
    draftPixelsRef.current = [];
  };

  // Reactive Mini-Preview renderer (NEVER runs on an idle 60fps loop; uses single cached ImageData blit)
  useEffect(() => {
    if (performanceMode === 'performance' && isDrawing) return;
    const pCanvas = previewCanvasRef.current;
    if (!pCanvas || allFrames.length === 0) return;
    const pCtx = pCanvas.getContext('2d');
    if (!pCtx) return;

    pCtx.imageSmoothingEnabled = false;
    pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);

    const frameIdx = isPlaying
      ? playbackFrameIndex % allFrames.length
      : currentFrameIndex >= 0
      ? currentFrameIndex
      : 0;
    const frameToDraw = allFrames[frameIdx] || currentFrame;
    if (!frameToDraw) return;

    const composited = compositeFrame(frameToDraw, width, height, frameIdx, false, layerGroups);
    const cachedFrameCanvas = getCachedPixelGridCanvas(composited, width, height);
    pCtx.drawImage(cachedFrameCanvas, 0, 0, width * previewScale, height * previewScale);
  }, [
    allFrames,
    currentFrame,
    currentFrameIndex,
    isPlaying,
    isDrawing,
    playbackFrameIndex,
    width,
    height,
    previewScale,
    layerGroups,
    performanceMode,
    showMiniPlayer,
  ]);

  // Live Playback + Combat Test + Dummy Loop (ONLY runs RAF when an animation is actually active!)
  const hasWalkingDummy =
    dummyOpponent.enabled && ['walk', 'jump'].includes(dummyOpponent.state || 'idle');

  useEffect(() => {
    const needsAnimLoop =
      isPlaying || combatTestActive || hasWalkingDummy || Boolean(shakeEventRef.current);
    if (!needsAnimLoop) return;

    let animId = 0;
    let lastTick = performance.now();
    let tickAccumulator = 0;

    const loop = (now: number) => {
      const delta = Math.min(80, now - lastTick);
      lastTick = now;
      animPhaseTimeRef.current += delta / 1000;

      // Real-time Playable Combat Test Mode Physics & Collision
      if (combatTestActive) {
        const cs = combatStateRef.current;
        const keys = combatKeysRef.current;
        const dtSec = delta / 1000;
        if (keys['a'] || keys['arrowleft']) cs.p1X = Math.max(-Math.floor(width / 2), cs.p1X - 24 * dtSec);
        if (keys['d'] || keys['arrowright']) cs.p1X = Math.min(Math.floor(width / 2), cs.p1X + 24 * dtSec);
        if ((keys['w'] || keys['arrowup']) && cs.p1Y >= 0) {
          cs.p1Vy = -46;
        }
        cs.p1Y += cs.p1Vy * dtSec;
        cs.p1Vy += 120 * dtSec;
        if (cs.p1Y > 0) {
          cs.p1Y = 0;
          cs.p1Vy = 0;
        }
        if (cs.hitCooldownMs > 0) cs.hitCooldownMs = Math.max(0, cs.hitCooldownMs - delta);

        if (cs.attacking && allFrames.length > 0) {
          const f = allFrames[cs.attackFrameIdx % allFrames.length];
          const fDur = getFrameDurationMs(f);
          cs.attackTimerMs += delta;
          if (cs.attackTimerMs >= fDur) {
            cs.attackTimerMs = 0;
            cs.attackFrameIdx += 1;
            if (cs.attackFrameIdx >= allFrames.length) {
              cs.attacking = false;
              cs.attackFrameIdx = 0;
            }
          }
          // Check live box overlap against dummy opponent
          if (dummyOpponent.enabled && cs.hitCooldownMs === 0) {
            const p2X = dummyOpponent.distance;
            const p2Y = groundConfig.groundY - 22;
            const p2W = 14;
            const p2H = 22;
            const activeHbs = (f?.hitboxes || []).filter((hb) =>
              ['hitbox', 'throwbox', 'counterbox', 'clashbox', 'armorbox'].includes(hb.type)
            );
            const hit = activeHbs.find((hb) => {
              const hx = hb.x + Math.round(cs.p1X);
              const hy = hb.y + Math.round(cs.p1Y);
              return hx < p2X + p2W && hx + hb.w > p2X && hy < p2Y + p2H && hy + hb.h > p2Y;
            });
            if (hit) {
              const blocked = dummyOpponent.state === 'block' && hit.type !== 'throwbox';
              const dmg = blocked ? 2 : hit.type === 'counterbox' || dummyOpponent.state === 'counter_hit' ? 14 : 9;
              cs.p2Hp = Math.max(0, cs.p2Hp - dmg);
              if (cs.p2Hp === 0) cs.p2Hp = 100;
              cs.combo += blocked ? 0 : 1;
              cs.hitCooldownMs = 260;
              cs.lastHitBanner = blocked
                ? 'BLOQUEADO (CHIP DMG)'
                : hit.type === 'throwbox'
                ? 'AGARRE CONECTADO!'
                : dummyOpponent.state === 'counter_hit'
                ? `COUNTER HIT! (${cs.combo} HITS)`
                : `IMPACTO ${hit.type.toUpperCase()}! (${cs.combo} HITS)`;
              if (combatFx.hitstop) hitstopFreezeTicksRef.current = 4;
              setCombatHud({ p1Hp: cs.p1Hp, p2Hp: cs.p2Hp, combo: cs.combo, banner: cs.lastHitBanner });
            }
          }
        }
        renderCanvas();
      }

      // Hitstop screen freeze & Configurable Camera Shake Engine
      const activeShake =
        shakeEventRef.current && now < shakeEventRef.current.until
          ? shakeEventRef.current
          : null;

      if (hitstopFreezeTicksRef.current > 0) {
        hitstopFreezeTicksRef.current -= 1;
        if (combatFx.screenShake && !activeShake) {
          triggerCameraShakeEvent(cameraShake);
        }
      } else if (!combatTestActive && isPlaying && allFrames.length > 1) {
        const currentPlaybackFrame = allFrames[playbackFrameIndex % allFrames.length];
        const frameMs = getFrameDurationMs(currentPlaybackFrame);

        tickAccumulator += delta;
        if (tickAccumulator >= frameMs) {
          tickAccumulator = 0;

          let next = playbackFrameIndex;
          if (playbackMode === 'pingpong') {
            let n = playbackFrameIndex + playbackDirectionRef.current;
            if (n >= allFrames.length - 1) {
              playbackDirectionRef.current = -1;
              n = allFrames.length - 1;
            } else if (n <= 0) {
              playbackDirectionRef.current = 1;
              n = 0;
            }
            next = n;
          } else if (playbackMode === 'once') {
            if (playbackFrameIndex >= allFrames.length - 1) {
              onTogglePlay();
              return;
            }
            next = playbackFrameIndex + 1;
          } else {
            next = (playbackFrameIndex + 1) % allFrames.length;
          }

          const targetFrame = allFrames[next];
          if (
            combatFx.hitstop &&
            targetFrame?.hitboxes?.some((hb) => hb.type === 'hitbox' || hb.type === 'throwbox')
          ) {
            hitstopFreezeTicksRef.current = 4;
          }

          const kfAtNext = cameraKeyframes.find((k) => k.frameIndex === next);
          const hasCamEvent = Boolean(targetFrame?.events?.some((ev) => ev.type === 'camera'));
          if ((kfAtNext?.shakeTrigger || hasCamEvent) && (cameraShake?.enabled ?? combatFx.screenShake)) {
            triggerCameraShakeEvent(cameraShake);
          }

          setPlaybackFrameIndex(next);
          onSelectFrame?.(next);
        }
      } else if (!combatTestActive && hasWalkingDummy) {
        renderCanvas();
      }

      if (shakeEventRef.current && now < shakeEventRef.current.until) {
        const sh = shakeEventRef.current;
        const total = Math.max(1, sh.until - sh.start);
        const progress = Math.max(0, Math.min(1, (now - sh.start) / total));
        const decay = 1 - progress * 0.85;
        const amp = (sh.cfg.intensity || 4) * decay;
        const tSec = (now - sh.start) / 1000;
        const freq = sh.cfg.frequencyHz || 28;
        const dir = sh.cfg.direction || 'both';
        const sx =
          dir === 'vertical'
            ? 0
            : Math.sin(tSec * freq * Math.PI * 2) * amp + (Math.random() - 0.5) * amp * 0.6;
        const sy =
          dir === 'horizontal'
            ? 0
            : Math.cos(tSec * freq * Math.PI * 1.73) * amp + (Math.random() - 0.5) * amp * 0.6;
        setScreenShakeOffset({ x: Math.round(sx * 10) / 10, y: Math.round(sy * 10) / 10 });
      } else if (shakeEventRef.current) {
        shakeEventRef.current = null;
        setScreenShakeOffset({ x: 0, y: 0 });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [
    isPlaying,
    combatTestActive,
    hasWalkingDummy,
    cameraShakeTestNonce,
    dummyOpponent,
    groundConfig.groundY,
    allFrames,
    playbackFrameIndex,
    width,
    playbackMode,
    combatFx,
    cameraShake,
    cameraKeyframes,
    triggerCameraShakeEvent,
    onSelectFrame,
    onTogglePlay,
    renderCanvas,
  ]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas, playbackFrameIndex, isPlaying]);

  // Drawing Actions (PointerEvent supports real stylus pen pressure + mouse + touch)
  const getPointerStrokeMetrics = (e: React.PointerEvent<HTMLCanvasElement>, strokeLen: number) => {
    const rawPressure = e.pointerType === 'pen' ? Math.max(0.05, e.pressure || 0.5) : 1;
    const mergedSettings: BrushSettings = {
      ...brushSettings,
      size: brushSettings.size || brushSize,
    };
    const { effectiveSize, effectiveOpacity } = computeDynamicBrushParams(
      mergedSettings,
      rawPressure,
      strokeLen
    );
    const totalOpacity = Math.max(0.05, Math.min(1, effectiveOpacity * primaryAlpha));
    return {
      rawPressure,
      pointerType: e.pointerType || 'mouse',
      effectiveSize,
      totalOpacity,
    };
  };

  const handleMouseDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore if capture unavailable
    }

    if (moveDisambigMenu) {
      setMoveDisambigMenu(null);
    }

    // LUPA (Zoom) tool: handled BEFORE altKey pan guard so Alt+Click zooms out cleanly!
    if (activeTool === 'zoom' && !isSpaceDown && e.button === 0) {
      const unc = getUnclampedGridCoords(e) || { x: Math.floor(width / 2), y: Math.floor(height / 2) };
      const clampedStart = {
        x: Math.max(0, Math.min(width - 1, unc.x)),
        y: Math.max(0, Math.min(height - 1, unc.y)),
      };
      setZoomRegionDrag({
        startClientX: e.clientX,
        startClientY: e.clientY,
        endClientX: e.clientX,
        endClientY: e.clientY,
        startGrid: clampedStart,
        endGrid: clampedStart,
        altKey: e.altKey,
      });
      return;
    }

    if (activeTool === 'hand' || isSpaceDown || e.button === 1 || e.button === 2 || e.altKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button !== 0) return;

    if (activeTool === 'canvas_edit') {
      return;
    }

    if (isPlaying) {
      onTogglePlay();
      return;
    }

    const coords = getGridCoords(e);
    if (!coords) return;
    smoothedCoordRef.current = { x: coords.x, y: coords.y };

    // PRIORITY 0: Interactive Transform Box Manipulation (Pivot, 8 Handles, Distort Corners, Rotate Zone, Move)
    if (transformSession && onChangeTransformParams && canvasRef.current) {
      const tp = transformSession.params;
      const rect = canvasRef.current.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const unclamped = getUnclampedGridCoords(e) || coords;

      const pivScreenX = (tp.pivotX + (tp.x - tp.baseX)) * zoom;
      const pivScreenY = (tp.pivotY + (tp.y - tp.baseY)) * zoom;
      if (Math.hypot(px - pivScreenX, py - pivScreenY) <= 10) {
        transformDragRef.current = { kind: 'pivot', startParams: { ...tp, corners: tp.corners.map((c) => ({ ...c })) as any } };
        return;
      }

      const corners = getTransformedQuadCorners(tp);
      const pts = corners.map((c) => ({ x: c.x * zoom, y: c.y * zoom }));
      const edgeMids = [
        { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 },
        { x: (pts[1].x + pts[2].x) / 2, y: (pts[1].y + pts[2].y) / 2 },
        { x: (pts[2].x + pts[3].x) / 2, y: (pts[2].y + pts[3].y) / 2 },
        { x: (pts[3].x + pts[0].x) / 2, y: (pts[3].y + pts[0].y) / 2 },
      ];
      const roles = ['nw', 'ne', 'se', 'sw', 'n', 'e', 's', 'w'];
      const allH = [...pts, ...edgeMids];
      for (let i = 0; i < allH.length; i++) {
        if (Math.abs(px - allH[i].x) <= 9 && Math.abs(py - allH[i].y) <= 9) {
          transformDragRef.current = {
            kind: 'handle',
            handleIdx: i,
            handleRole: roles[i],
            startMouse: unclamped,
            startParams: { ...tp, corners: tp.corners.map((c) => ({ ...c })) as any },
          };
          return;
        }
      }

      const minX = Math.min(...pts.map((p) => p.x));
      const maxX = Math.max(...pts.map((p) => p.x));
      const minY = Math.min(...pts.map((p) => p.y));
      const maxY = Math.max(...pts.map((p) => p.y));
      const insideBox = px >= minX - 4 && px <= maxX + 4 && py >= minY - 4 && py <= maxY + 4;

      if (insideBox) {
        if (tp.mode === 'warp' && e.shiftKey) {
          transformDragRef.current = {
            kind: 'warp_center',
            startMouse: unclamped,
            startParams: { ...tp, corners: tp.corners.map((c) => ({ ...c })) as any },
          };
        } else {
          transformDragRef.current = {
            kind: 'move',
            startMouse: unclamped,
            startParams: { ...tp, corners: tp.corners.map((c) => ({ ...c })) as any },
          };
        }
      } else {
        const startAngle = Math.atan2(py - pivScreenY, px - pivScreenX);
        transformDragRef.current = {
          kind: 'rotate',
          center: { x: pivScreenX, y: pivScreenY },
          startAngle,
          startRot: tp.rotation,
        };
      }
      return;
    }

    // PRIORITY 0.5: Draggable Symmetry Axes / Custom Line Endpoints
    if (effSymmetry.enabled && effSymmetry.mode !== 'none' && effSymmetry.showAxes && onChangeSymmetryConfig && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      if (effSymmetry.mode === 'custom_line') {
        const p1x = (effSymmetry.lineP1.x + 0.5) * zoom;
        const p1y = (effSymmetry.lineP1.y + 0.5) * zoom;
        const p2x = (effSymmetry.lineP2.x + 0.5) * zoom;
        const p2y = (effSymmetry.lineP2.y + 0.5) * zoom;
        if (Math.hypot(px - p1x, py - p1y) <= 9) {
          symHandleDragRef.current = 'p1';
          return;
        }
        if (Math.hypot(px - p2x, py - p2y) <= 9) {
          symHandleDragRef.current = 'p2';
          return;
        }
      } else {
        const cx = (effSymmetry.axisX + 0.5) * zoom;
        const cy = (effSymmetry.axisY + 0.5) * zoom;
        if (Math.hypot(px - cx, py - cy) <= 9) {
          symHandleDragRef.current = 'center';
          return;
        }
      }
    }

    // PRIORITY 0.8: Interactive Parametric Shapes (Handle Drag + Selection + Direct Transform)
    if (
      !currentLayer.locked &&
      !transformSession &&
      onUpdateLayerParametricShapes &&
      canvasRef.current &&
      (effTool === 'rectangle' ||
        effTool === 'circle' ||
        effTool === 'move' ||
        (effTool === 'select' && selectionSubTool === 'objects'))
    ) {
      const shapes = currentLayer.parametricShapes || [];
      const rect = canvasRef.current.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const exactGrid = { x: px / zoom, y: py / zoom };
      const selShape = selectedParametricShapeId
        ? shapes.find((s) => s.id === selectedParametricShapeId) || null
        : null;

      // 0.8a. Hit-test handles of currently selected parametric shape first
      if (selShape) {
        const handles = getParametricShapeHandles(selShape);
        let hitHandle: ParametricHandleKind | null = null;
        let bestDist = 11; // 11 screen px generous hit tolerance
        for (const h of handles) {
          const d = Math.hypot(px - h.x * zoom, py - h.y * zoom);
          if (d <= bestDist) {
            bestDist = d;
            hitHandle = h.kind;
          }
        }
        if (hitHandle) {
          const pivCanvas = shapeNormToCanvas(selShape, selShape.pivotX, selShape.pivotY);
          const startAngle = Math.atan2(exactGrid.y - pivCanvas.y, exactGrid.x - pivCanvas.x);
          const cloned: ParametricShapeObject = {
            ...selShape,
            cornerRadii: [...selShape.cornerRadii],
            cornerOffsets: selShape.cornerOffsets
              ? [
                  { ...selShape.cornerOffsets[0] },
                  { ...selShape.cornerOffsets[1] },
                  { ...selShape.cornerOffsets[2] },
                  { ...selShape.cornerOffsets[3] },
                ]
              : undefined,
          };
          shapeDragRef.current = {
            shapeId: selShape.id,
            handleKind: hitHandle,
            origShape: cloned,
            startGrid: exactGrid,
            startAngle,
          };
          shapeLiveOverrideRef.current = cloned;
          renderCanvas();
          return;
        }
      }

      // 0.8b. Hit-test inside parametric shape body (Move/Select Objects picks any shape; Shape tools drag selected shape body)
      const allowPickAnyShape =
        (effTool === 'move' && (moveSubTool === 'move_object' || moveSubTool === 'move_layer')) ||
        (effTool === 'select' && selectionSubTool === 'objects');
      const candidatesToTest = allowPickAnyShape
        ? [...shapes].reverse()
        : selShape && !e.altKey
        ? [selShape]
        : [];
      for (const sh of candidatesToTest) {
        if (hitTestParametricShape(sh, exactGrid.x, exactGrid.y, 1.8)) {
          onSelectParametricShapeId?.(sh.id);
          if (onChangeShapeConfig) {
            onChangeShapeConfig(syncShapeConfigFromObject(shapeConfig, sh));
          }
          const cloned: ParametricShapeObject = {
            ...sh,
            cornerRadii: [...sh.cornerRadii],
            cornerOffsets: sh.cornerOffsets
              ? [
                  { ...sh.cornerOffsets[0] },
                  { ...sh.cornerOffsets[1] },
                  { ...sh.cornerOffsets[2] },
                  { ...sh.cornerOffsets[3] },
                ]
              : undefined,
          };
          shapeDragRef.current = {
            shapeId: sh.id,
            handleKind: 'move',
            origShape: cloned,
            startGrid: exactGrid,
          };
          shapeLiveOverrideRef.current = cloned;
          renderCanvas();
          return;
        }
      }

      // Clicking empty canvas while using Shape tool deselects current parametric shape before drawing a new one
      if ((effTool === 'rectangle' || effTool === 'circle') && selectedParametricShapeId) {
        onSelectParametricShapeId?.(null);
      }
    }

    // PRIORITY 1: Editable Vector Line & Direct Select (Real-Time Preview + Ctrl Temporary Direct Select)
    if (
      (effTool === 'line' || isDirectSelectActive) &&
      onUpdateLayerVectorPaths &&
      vectorConfig
    ) {
      if (currentLayer.locked) return;
      const paths = currentLayer.vectorPaths ? [...currentLayer.vectorPaths] : [];
      const activePath = paths.find((p) => p.id === selectedVectorPathId) || null;
      const allNodes = paths.flatMap((p) => p.nodes);
      const placingRefPath =
        vectorDraftSession?.phase === 'placing'
          ? paths.find((p) => p.id === vectorDraftSession.pathId) || null
          : activePath;
      const prevVecAnchor =
        placingRefPath && placingRefPath.nodes.length > 0
          ? placingRefPath.nodes[placingRefPath.nodes.length - 1]
          : null;
      const vecBaseSnap = snapVectorCoord(coords, vectorConfig.snap, width, height, allNodes);
      const snapped = applyGuideSnap(
        vecBaseSnap.x,
        vecBaseSnap.y,
        e.altKey,
        prevVecAnchor ? { x: prevVecAnchor.x, y: prevVecAnchor.y } : null
      );
      const allowNodeEditNow = isDirectSelectActive || vectorDraftSession?.phase !== 'placing';

      // 1a. Hit test tangent handles of active path (always allowed when Ctrl/Direct Select is active)
      if (activePath && allowNodeEditNow) {
        const hitH = hitTestVectorHandle(activePath, coords.x, coords.y, 1.8);
        if (hitH) {
          vectorDragRef.current = { kind: 'handle', nodeId: hitH.nodeId, handleKind: hitH.kind };
          return;
        }
      }

      // 1b. Hit test existing nodes (always allowed when Ctrl/Direct Select is active)
      if (allowNodeEditNow) {
        for (let i = paths.length - 1; i >= 0; i--) {
          const p = paths[i];
          const hitN = hitTestVectorNode(p, coords.x, coords.y, 1.8);
          if (hitN) {
            onSelectVectorPathId?.(p.id);
            let nextSel = e.shiftKey
              ? selectedVectorNodeIds.includes(hitN.id)
                ? selectedVectorNodeIds.filter((id) => id !== hitN.id)
                : [...selectedVectorNodeIds, hitN.id]
              : selectedVectorNodeIds.includes(hitN.id)
              ? selectedVectorNodeIds
              : [hitN.id];
            if (nextSel.length === 0) nextSel = [hitN.id];
            onSelectVectorNodeIds?.(nextSel);
            const origNodes = new Map<string, VectorNode>();
            p.nodes.forEach((n) => {
              if (nextSel.includes(n.id)) origNodes.set(n.id, { ...n });
            });
            vectorDragRef.current = { kind: 'node', startGrid: coords, origNodes };
            return;
          }
        }
      }

      // 1c. Hit test segments of active path (drag bends curve; Double-click splits segment)
      if (activePath && activePath.nodes.length >= 2 && allowNodeEditNow) {
        const hitSeg = hitTestVectorSegment(activePath, coords.x, coords.y, 1.5);
        if (hitSeg) {
          if (e.detail === 2 || (!isCtrlTempDirectSelect && (e.ctrlKey || e.metaKey))) {
            const split = splitSegmentAt(activePath, hitSeg.segIndex, hitSeg.t);
            onUpdateLayerVectorPaths(paths.map((p) => (p.id === activePath.id ? split : p)));
            return;
          }
          vectorDragRef.current = { kind: 'segment_bend', segIndex: hitSeg.segIndex, lastGrid: coords };
          return;
        }
      }

      // Direct Select (White Pointer / Move->Direct Select / Select->Nodes / Line+Ctrl): Rectangular Node Marquee
      if (isDirectSelectActive) {
        setVectorMarquee({
          startX: coords.x,
          startY: coords.y,
          endX: coords.x,
          endY: coords.y,
        });
        return;
      }

      // 1d. Real-Time Vector Line Placement & Non-Destructive Editable Transition
      const rawP = e.pointerType === 'pen' && vectorConfig.penPressureEnabled ? Math.max(0.25, e.pressure || 0.7) : 1;
      const nodeW = Math.max(1, Math.round(vectorConfig.strokeWidth * rawP));
      const newNode: VectorNode = {
        id: `vnode-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        x: snapped.x,
        y: snapped.y,
        nodeType: vectorConfig.mode === 'bezier' || vectorConfig.mode === 'smooth' ? 'smooth' : 'corner',
        width: nodeW,
      };

      // If currently placing a new vector path (1st click already placed point #1 -> live preview follows cursor):
      if (vectorDraftSession?.phase === 'placing') {
        const placingPath = paths.find((p) => p.id === vectorDraftSession.pathId);
        if (placingPath) {
          if (vectorConfig.mode === 'straight') {
            const nextPath: VectorPath = {
              ...placingPath,
              nodes: [...placingPath.nodes, newNode],
            };
            onUpdateLayerVectorPaths(paths.map((p) => (p.id === placingPath.id ? nextPath : p)));
            onSelectVectorNodeIds?.([newNode.id]);
            setVectorDraftSession({ ...vectorDraftSession, phase: 'editing' });
            setVectorHoverCoord(null);
            return;
          }
          // Multi-node modes (polyline / bezier / spline / smooth / open / closed)
          const firstN = placingPath.nodes[0];
          const closeToStart =
            firstN &&
            placingPath.nodes.length >= 3 &&
            Math.hypot(snapped.x - firstN.x, snapped.y - firstN.y) <= 1.8;
          if (closeToStart) {
            const nextPath: VectorPath = { ...placingPath, closed: true };
            onUpdateLayerVectorPaths(paths.map((p) => (p.id === placingPath.id ? nextPath : p)));
            setVectorDraftSession({ ...vectorDraftSession, phase: 'editing' });
            setVectorHoverCoord(null);
            return;
          }
          const nextPath: VectorPath = {
            ...placingPath,
            nodes: [...placingPath.nodes, newNode],
          };
          onUpdateLayerVectorPaths(paths.map((p) => (p.id === placingPath.id ? nextPath : p)));
          onSelectVectorNodeIds?.([newNode.id]);
          if (e.detail >= 2) {
            setVectorDraftSession({ ...vectorDraftSession, phase: 'editing' });
            setVectorHoverCoord(null);
          } else if (vectorConfig.mode === 'bezier' || vectorConfig.mode === 'smooth') {
            vectorDragRef.current = { kind: 'new_bezier_handle', pathId: placingPath.id, nodeId: newNode.id };
          }
          return;
        }
      }

      // Append extra node if user already selected an existing multi-node path outside active placing session
      const isMultiNodeMode = ['polyline', 'bezier', 'spline', 'smooth', 'open', 'closed'].includes(
        vectorConfig.mode
      );
      if (activePath && isMultiNodeMode && !vectorDraftSession) {
        const snapshot = JSON.parse(JSON.stringify(paths)) as VectorPath[];
        const nextPath: VectorPath = {
          ...activePath,
          nodes: [...activePath.nodes, newNode],
        };
        onUpdateLayerVectorPaths(paths.map((p) => (p.id === activePath.id ? nextPath : p)));
        onSelectVectorNodeIds?.([newNode.id]);
        setVectorDraftSession({ pathId: activePath.id, phase: 'placing', priorPathsSnapshot: snapshot });
        if (vectorConfig.mode === 'bezier' || vectorConfig.mode === 'smooth') {
          vectorDragRef.current = { kind: 'new_bezier_handle', pathId: activePath.id, nodeId: newNode.id };
        }
        return;
      }

      // 1st click: start a brand new path with ONLY 1 initial anchor node (or freehand drag) + save snapshot
      const priorSnapshot = JSON.parse(JSON.stringify(paths)) as VectorPath[];
      const newPathId = `vpath-${Date.now()}`;
      const newPath: VectorPath = {
        id: newPathId,
        name: `Trazo #${paths.length + 1}`,
        mode: vectorConfig.mode,
        closed: vectorConfig.mode === 'closed',
        nodes: [newNode],
        color: primaryColor,
        widthMode: vectorConfig.widthMode,
        strokeWidth: vectorConfig.strokeWidth,
        profile: vectorConfig.profile,
        customProfileStops: [...vectorConfig.customProfileStops],
        capStyle: vectorConfig.capStyle,
        joinStyle: vectorConfig.joinStyle,
        tension: vectorConfig.tension,
        smoothing: vectorConfig.smoothing,
        curveRadius: vectorConfig.curveRadius,
        pixelPerfect: vectorConfig.pixelPerfect,
        smartPixelCurve: vectorConfig.smartPixelCurve,
        penPressureEnabled: vectorConfig.penPressureEnabled,
      };

      onUpdateLayerVectorPaths([...paths, newPath], vectorConfig.storeOnVectorLayer);
      onSelectVectorPathId?.(newPathId);
      onSelectVectorNodeIds?.([newNode.id]);
      setVectorHoverCoord(snapped);

      if (vectorConfig.mode === 'freehand') {
        setVectorDraftSession({ pathId: newPathId, phase: 'editing', priorPathsSnapshot: priorSnapshot });
        vectorDragRef.current = {
          kind: 'freehand',
          pathId: newPathId,
          rawPts: [{ x: snapped.x, y: snapped.y, width: nodeW }],
        };
      } else {
        setVectorDraftSession({ pathId: newPathId, phase: 'placing', priorPathsSnapshot: priorSnapshot });
        if (vectorConfig.mode === 'bezier' || vectorConfig.mode === 'smooth') {
          vectorDragRef.current = { kind: 'new_bezier_handle', pathId: newPathId, nodeId: newNode.id };
        }
      }
      return;
    }

    // Deselect if clicking outside existing selection with selection tools (marquee, lasso, magic wand)
    if (selection && selection.active && ['select', 'lasso', 'magic_wand'].includes(activeTool)) {
      const minX = Math.min(selection.startX, selection.endX);
      const maxX = Math.max(selection.startX, selection.endX);
      const minY = Math.min(selection.startY, selection.endY);
      const maxY = Math.max(selection.startY, selection.endY);
      const isInside = coords.x >= minX && coords.x <= maxX && coords.y >= minY && coords.y <= maxY;
      if (!isInside) {
        setSelection(null);
        setLassoSites([]);
        return;
      }
    }

    // Shift + Click to position Root Pivot
    if (showPivot && e.shiftKey) {
      onUpdatePivot(coords);
      return;
    }

    // Helper to hit-test the 8 resize handles of the selected hitbox in screen coords
    const findHitboxHandle = (hb: Hitbox): ResizeHandle | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const sx = hb.x * zoom;
      const sy = hb.y * zoom;
      const sw = hb.w * zoom;
      const sh = hb.h * zoom;
      const handles: { id: ResizeHandle; hx: number; hy: number }[] = [
        { id: 'nw', hx: sx, hy: sy },
        { id: 'n', hx: sx + sw / 2, hy: sy },
        { id: 'ne', hx: sx + sw, hy: sy },
        { id: 'e', hx: sx + sw, hy: sy + sh / 2 },
        { id: 'se', hx: sx + sw, hy: sy + sh },
        { id: 's', hx: sx + sw / 2, hy: sy + sh },
        { id: 'sw', hx: sx, hy: sy + sh },
        { id: 'w', hx: sx, hy: sy + sh / 2 },
      ];
      const hit = handles.find((h) => Math.abs(px - h.hx) <= 8 && Math.abs(py - h.hy) <= 8);
      return hit ? hit.id : null;
    };

    // PURE REF MODE GUARD OR MOVE_REFERENCE SUBTOOL: Isolate strictly to References (never mutate layers/sprites/hitboxes)
    const isRefOnlyInteraction =
      pureRefConfig.enabled || (effTool === 'move' && moveSubTool === 'move_reference');

    if (isRefOnlyInteraction && canvasRef.current && onUpdateReference) {
      const rect = canvasRef.current.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const visibleGroupIds = new Set(
        referenceGroups.filter((g) => g.visible !== false).map((g) => g.id)
      );
      const canvasRefs = [...references]
        .filter((r) => r.visible && r.anchor !== 'camera' && (!r.groupId || referenceGroups.length === 0 || visibleGroupIds.has(r.groupId)))
        .sort((a, b) => (a.zOrder ?? 0) - (b.zOrder ?? 0));

      const getCanvasRefMetrics = (r: ReferenceItem) => {
        const img = refImageCacheRef.current.get(r.dataUrl);
        const natW = img?.naturalWidth || r.naturalWidth || width;
        const natH = img?.naturalHeight || r.naturalHeight || height;
        const baseFactor = zoom / Math.max(1, natW / width);
        const bw = natW * baseFactor * r.scale;
        const bh = natH * baseFactor * r.scale;
        const cx = (width / 2 + r.x) * zoom;
        const cy = (height / 2 + r.y) * zoom;
        return { cx, cy, bw, bh };
      };

      const activeCanvasRef = canvasRefs.find((r) => r.id === activeReferenceId);
      if (activeCanvasRef) {
        const { cx, cy, bw, bh } = getCanvasRefMetrics(activeCanvasRef);
        const rad = (-activeCanvasRef.rotation * Math.PI) / 180;
        const dx = px - cx;
        const dy = py - cy;
        const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
        const rotHandleDist = Math.hypot(lx - 0, ly - (-bh / 2 - 19));
        if (rotHandleDist <= 10) {
          const centerClientX = rect.left + cx;
          const centerClientY = rect.top + cy;
          setDraggingReferenceId(activeCanvasRef.id);
          refDragStartRef.current = {
            kind: 'rotate',
            clientX: e.clientX,
            clientY: e.clientY,
            origX: activeCanvasRef.x,
            origY: activeCanvasRef.y,
            origScale: activeCanvasRef.scale,
            origRotation: activeCanvasRef.rotation,
            centerClientX,
            centerClientY,
            startAngle: Math.atan2(e.clientY - centerClientY, e.clientX - centerClientX),
          };
          return;
        }
        const corners = [
          [-bw / 2, -bh / 2],
          [bw / 2, -bh / 2],
          [bw / 2, bh / 2],
          [-bw / 2, bh / 2],
        ];
        if (corners.some(([hx, hy]) => Math.abs(lx - hx) <= 9 && Math.abs(ly - hy) <= 9)) {
          const centerClientX = rect.left + cx;
          const centerClientY = rect.top + cy;
          setDraggingReferenceId(activeCanvasRef.id);
          refDragStartRef.current = {
            kind: 'scale',
            clientX: e.clientX,
            clientY: e.clientY,
            origX: activeCanvasRef.x,
            origY: activeCanvasRef.y,
            origScale: activeCanvasRef.scale,
            origRotation: activeCanvasRef.rotation,
            centerClientX,
            centerClientY,
            origDist: Math.max(12, Math.hypot(e.clientX - centerClientX, e.clientY - centerClientY)),
          };
          return;
        }
      }

      for (let i = canvasRefs.length - 1; i >= 0; i--) {
        const r = canvasRefs[i];
        const { cx, cy, bw, bh } = getCanvasRefMetrics(r);
        const rad = (-r.rotation * Math.PI) / 180;
        const dx = px - cx;
        const dy = py - cy;
        const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
        if (Math.abs(lx) <= bw / 2 && Math.abs(ly) <= bh / 2) {
          onSelectReference?.(r.id);
          onBringReferenceToFront?.(r.id);
          if (r.locked && (pureRefConfig.enabled || moveSubTool === 'move_reference')) {
            onUpdateReference(r.id, { locked: false });
          }
          setDraggingReferenceId(r.id);
          refDragStartRef.current = {
            kind: 'move',
            clientX: e.clientX,
            clientY: e.clientY,
            origX: r.x,
            origY: r.y,
            origScale: r.scale,
            origRotation: r.rotation,
            centerClientX: rect.left + cx,
            centerClientY: rect.top + cy,
          };
          return;
        }
      }

      // If PureRef mode is active or move_reference is active, never draw/modify canvas objects
      onSelectReference?.(null);
      return;
    }

    // MOVE / UNIFIED SELECTION TOOL (General Inteligente / Capa / Selección / Referencia / Directa)
    if (effTool === 'move') {
      const startSelectionContentMove = (): boolean => {
        if (!selection || !selection.active || currentLayer.locked || currentLayer.lockPosition) return false;
        const minX = Math.max(0, Math.min(selection.startX, selection.endX));
        const maxX = Math.min(width - 1, Math.max(selection.startX, selection.endX));
        const minY = Math.max(0, Math.min(selection.startY, selection.endY));
        const maxY = Math.min(height - 1, Math.max(selection.startY, selection.endY));
        const insideSel =
          coords.x >= minX &&
          coords.x <= maxX &&
          coords.y >= minY &&
          coords.y <= maxY &&
          (!selection.mask || selection.mask[coords.y]?.[coords.x]);
        if (!insideSel) return false;

        const baseWithoutSel = currentLayer.pixels.map((row) => [...row]);
        const extracted: { dx: number; dy: number; color: string }[] = [];
        for (let py = minY; py <= maxY; py++) {
          for (let px = minX; px <= maxX; px++) {
            if (selection.mask && !selection.mask[py]?.[px]) continue;
            const col = baseWithoutSel[py]?.[px];
            if (col) {
              extracted.push({ dx: px - minX, dy: py - minY, color: col });
              baseWithoutSel[py][px] = null;
            }
          }
        }
        selectionMoveRef.current = {
          startGrid: coords,
          origSel: {
            ...selection,
            mask: selection.mask ? selection.mask.map((r) => [...r]) : undefined,
          },
          baseWithoutSel,
          extracted,
        };
        return true;
      };

      // Move Selection Subtool: translates active selection bounds & enclosed pixels cleanly
      if (moveSubTool === 'move_selection') {
        if (startSelectionContentMove()) return;
      }

      // Smart Move General (move_object): auto-detect overlapping objects & show disambiguation menu if >= 2 overlap
      if (moveSubTool === 'move_object') {
        const hitboxes = currentFrame.hitboxes || [];

        // Immediate handle manipulation for already-selected hitbox
        if (showHitboxes && selectedHitboxId) {
          const selHb = hitboxes.find((h) => h.id === selectedHitboxId);
          if (selHb) {
            const handle = findHitboxHandle(selHb);
            if (handle) {
              setResizingHitbox({ id: selHb.id, handle, orig: { ...selHb }, startGrid: coords });
              return;
            }
          }
        }

        // Collect all overlapping interactive candidates under the click
        const visibleGroupIds = new Set(
          referenceGroups.filter((g) => g.visible !== false).map((g) => g.id)
        );
        const canvasRefs = [...references]
          .filter(
            (r) =>
              r.visible &&
              !r.locked &&
              r.anchor !== 'camera' &&
              (!r.groupId || referenceGroups.length === 0 || visibleGroupIds.has(r.groupId))
          )
          .sort((a, b) => (a.zOrder ?? 0) - (b.zOrder ?? 0));

        let hitRef: ReferenceItem | null = null;
        if (canvasRef.current && onUpdateReference) {
          const rect = canvasRef.current.getBoundingClientRect();
          const px = e.clientX - rect.left;
          const py = e.clientY - rect.top;
          for (let i = canvasRefs.length - 1; i >= 0; i--) {
            const r = canvasRefs[i];
            const img = refImageCacheRef.current.get(r.dataUrl);
            const natW = img?.naturalWidth || r.naturalWidth || width;
            const natH = img?.naturalHeight || r.naturalHeight || height;
            const baseFactor = zoom / Math.max(1, natW / width);
            const bw = natW * baseFactor * r.scale;
            const bh = natH * baseFactor * r.scale;
            const cx = (width / 2 + r.x) * zoom;
            const cy = (height / 2 + r.y) * zoom;
            const rad = (-r.rotation * Math.PI) / 180;
            const dx = px - cx;
            const dy = py - cy;
            const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
            const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
            if (Math.abs(lx) <= bw / 2 && Math.abs(ly) <= bh / 2) {
              hitRef = r;
              break;
            }
          }
        }

        const distPivot = Math.hypot(coords.x - globalPivot.x, coords.y - globalPivot.y);
        const hitPivot = showPivot && distPivot <= 2.5;

        const hitHb = showHitboxes
          ? [...hitboxes]
              .reverse()
              .find((hb) => coords.x >= hb.x && coords.x < hb.x + hb.w && coords.y >= hb.y && coords.y < hb.y + hb.h) || null
          : null;

        let hitVec: VectorPath | null = null;
        if (!currentLayer.locked && currentLayer.vectorPaths && currentLayer.vectorPaths.length > 0 && onUpdateLayerVectorPaths) {
          for (let i = currentLayer.vectorPaths.length - 1; i >= 0; i--) {
            const p = currentLayer.vectorPaths[i];
            if (
              hitTestVectorNode(p, coords.x, coords.y, 2.2) ||
              (p.nodes.length >= 2 && hitTestVectorSegment(p, coords.x, coords.y, 2.0))
            ) {
              hitVec = p;
              break;
            }
          }
        }

        const insideActiveSel = Boolean(
          selection &&
            selection.active &&
            coords.x >= Math.min(selection.startX, selection.endX) &&
            coords.x <= Math.max(selection.startX, selection.endX) &&
            coords.y >= Math.min(selection.startY, selection.endY) &&
            coords.y <= Math.max(selection.startY, selection.endY) &&
            (!selection.mask || selection.mask[coords.y]?.[coords.x])
        );

        const hitLayerPixel = Boolean(
          !currentLayer.locked && !currentLayer.lockPosition && currentLayer.pixels[coords.y]?.[coords.x]
        );

        const candidates: Array<{
          id: string;
          kind: 'reference' | 'vector' | 'hitbox' | 'pivot' | 'selection' | 'layer';
          label: string;
          detail: string;
          targetId?: string;
        }> = [];

        if (hitRef) {
          candidates.push({
            id: `ref-${hitRef.id}`,
            kind: 'reference',
            label: `Referencia: ${hitRef.name}`,
            detail: 'Mover imagen de referencia',
            targetId: hitRef.id,
          });
        }
        if (hitVec) {
          candidates.push({
            id: `vec-${hitVec.id}`,
            kind: 'vector',
            label: `Trazado Vectorial (${hitVec.nodes.length} nodos)`,
            detail: 'Seleccionar y editar vector',
            targetId: hitVec.id,
          });
        }
        if (hitHb) {
          candidates.push({
            id: `hb-${hitHb.id}`,
            kind: 'hitbox',
            label: `Hitbox: ${hitHb.name || hitHb.type.toUpperCase()}`,
            detail: `${hitHb.w}×${hitHb.h}px`,
            targetId: hitHb.id,
          });
        }
        if (hitPivot) {
          candidates.push({
            id: 'pivot',
            kind: 'pivot',
            label: 'Pivote del Personaje',
            detail: `(${globalPivot.x}, ${globalPivot.y})`,
          });
        }
        if (insideActiveSel) {
          candidates.push({
            id: 'selection',
            kind: 'selection',
            label: 'Área Seleccionada',
            detail: 'Mover píxeles dentro de la selección',
          });
        }
        if (hitLayerPixel) {
          candidates.push({
            id: `layer-${currentLayer.id}`,
            kind: 'layer',
            label: `Capa: ${currentLayer.name}`,
            detail: 'Mover contenido de píxeles',
            targetId: currentLayer.id,
          });
        }

        // If clicking an already-selected reference directly without Alt ambiguity, allow smooth dragging unless >= 2 other candidates overlap
        if (candidates.length >= 2 && !(hitRef && activeReferenceId === hitRef.id && candidates.length === 2 && hitLayerPixel)) {
          setMoveDisambigMenu({
            clientX: e.clientX,
            clientY: e.clientY,
            gridCoord: coords,
            candidates,
          });
          return;
        }

        // Single unambiguous candidate -> act immediately!
        if (hitRef && canvasRef.current && onUpdateReference) {
          const rect = canvasRef.current.getBoundingClientRect();
          const cx = (width / 2 + hitRef.x) * zoom;
          const cy = (height / 2 + hitRef.y) * zoom;
          onSelectReference?.(hitRef.id);
          onBringReferenceToFront?.(hitRef.id);
          setDraggingReferenceId(hitRef.id);
          refDragStartRef.current = {
            kind: 'move',
            clientX: e.clientX,
            clientY: e.clientY,
            origX: hitRef.x,
            origY: hitRef.y,
            origScale: hitRef.scale,
            origRotation: hitRef.rotation,
            centerClientX: rect.left + cx,
            centerClientY: rect.top + cy,
          };
          return;
        }

        if (hitPivot) {
          setIsDraggingPivot(true);
          return;
        }

        if (hitHb) {
          setSelectedHitboxId(hitHb.id);
          setDraggingHitboxId(hitHb.id);
          setHitboxDragOffset({ x: coords.x - hitHb.x, y: coords.y - hitHb.y });
          return;
        }

        setSelectedHitboxId(null);

        if (hitVec) {
          onSelectVectorPathId?.(hitVec.id);
          onSelectVectorNodeIds?.(hitVec.nodes.map((n) => n.id));
          vectorDragRef.current = {
            kind: 'whole_path',
            pathId: hitVec.id,
            startGrid: coords,
            origNodes: hitVec.nodes.map((n) => ({ ...n })),
          };
          return;
        }

        if (insideActiveSel && startSelectionContentMove()) {
          return;
        }

        onSelectVectorPathId?.(null);
        onSelectVectorNodeIds?.([]);

        // Move Tool Auto-Select Layer when enabled and active layer has no pixel under cursor
        if (moveOptions.autoSelect && !hitLayerPixel && onSelectLayerIndex) {
          for (let li = currentFrame.layers.length - 1; li >= 0; li--) {
            const lyr = currentFrame.layers[li];
            if (!lyr.visible || lyr.locked || lyr.lockPosition) continue;
            if (lyr.pixels[coords.y]?.[coords.x]) {
              onSelectLayerIndex(li);
              break;
            }
          }
        }
      }

      // Layer Content / Pixel translation (respect lockPosition, total lock & clipOutsideCanvas)
      if (!currentLayer.locked && !currentLayer.lockPosition) {
        setIsDraggingContent(true);
        setContentDragStart(coords);
        lastContentDeltaRef.current = { dx: 0, dy: 0 };
        contentOriginalPixelsRef.current = currentLayer.pixels.map((r) => [...r]);
        contentOriginalOffCanvasRef.current = currentLayer.offCanvasPixels
          ? { ...currentLayer.offCanvasPixels }
          : undefined;
        draftOffCanvasRef.current = contentOriginalOffCanvasRef.current;
      }
      return;
    }

    // TEXT TOOL: Set anchor or drag existing text bounding box
    if (effTool === 'text') {
      if (
        textAnchor &&
        coords.x >= textAnchor.x &&
        coords.x <= textAnchor.x + textMaxWidth &&
        coords.y >= textAnchor.y &&
        coords.y <= textAnchor.y + textMaxHeight
      ) {
        setIsDraggingTextBox(true);
        textDragOffsetRef.current = { x: coords.x - textAnchor.x, y: coords.y - textAnchor.y };
        return;
      }
      setTextAnchor(coords);
      setTextMaxWidth((prev) => Math.max(12, Math.min(width - coords.x, prev || width - coords.x)));
      setTextMaxHeight((prev) => Math.max(8, Math.min(height - coords.y, prev || height - coords.y)));
      return;
    }

    // LASSO TOOL (Freehand, Polygonal OR Magnetic Contour Snapping)
    if (effTool === 'lasso') {
      if (lassoMode === 'magnetic') {
        let edgeMap = magneticEdgeMapRef.current;
        if (!edgeMap || magneticLassoPts.length === 0) {
          edgeMap = computeCanvasEdgeMap(
            compositeFrame(currentFrame, width, height, currentFrameIndex, false, layerGroups)
          );
          magneticEdgeMapRef.current = edgeMap;
        }
        const snapped = snapPointToStrongestEdge(coords.x, coords.y, edgeMap, 5);
        const snapPt = { x: snapped.x, y: snapped.y };

        if (magneticLassoPts.length === 0) {
          setMagneticLassoPts([snapPt]);
          setMagneticPreviewSeg([]);
          return;
        }

        const firstPt = magneticLassoPts[0];
        const distToStart = Math.hypot(snapPt.x - firstPt.x, snapPt.y - firstPt.y);
        if ((e.detail >= 2 || distToStart <= 2.5) && magneticLassoPts.length >= 4) {
          const closingSeg = traceMagneticLassoSegment(
            magneticLassoPts[magneticLassoPts.length - 1],
            firstPt,
            edgeMap
          );
          const closedPts = [...magneticLassoPts, ...closingSeg];
          commitPolygonPointsToSelection(closedPts, 'lasso');
          setMagneticLassoPts([]);
          setMagneticPreviewSeg([]);
          magneticEdgeMapRef.current = null;
          return;
        }

        const lastAnchor = magneticLassoPts[magneticLassoPts.length - 1];
        const seg = traceMagneticLassoSegment(lastAnchor, snapPt, edgeMap);
        setMagneticLassoPts((prev) => [...prev, ...seg]);
        setMagneticPreviewSeg([]);
        return;
      }

      if (lassoMode === 'polygon') {
        const nextPts = [...polygonLassoPts, coords];
        if (e.detail >= 2 && nextPts.length >= 3) {
          commitPolygonPointsToSelection(nextPts, 'polygon');
          setPolygonLassoPts([]);
        } else {
          setPolygonLassoPts(nextPts);
        }
        return;
      }
      setLassoSites([coords]);
      setIsDrawing(true);
      return;
    }

    const canEditMaskNow = Boolean(editingMask && currentLayer.mask && !currentLayer.locked);
    if (currentLayer.locked) return;
    if (!canEditMaskNow && (currentLayer.lockPixels || currentLayer.layerType === 'adjustment')) return;

    setIsDrawing(true);
    setDragStartPoint(coords);
    strokeHistoryRef.current = [coords];
    isPaintingMaskRef.current = canEditMaskNow;
    if (canEditMaskNow && currentLayer.mask) {
      draftMaskRef.current = currentLayer.mask.pixels.map((r) => [...r]);
      draftTiledStoreRef.current = null;
    } else if (isLayerTiled(currentLayer)) {
      const existingStore = getTiledStore(currentLayer.tiledStoreId);
      draftTiledStoreRef.current = existingStore
        ? existingStore.clone()
        : new TiledLayerStore(width, height);
      draftPixelsRef.current = [];
    } else {
      draftTiledStoreRef.current = null;
      draftPixelsRef.current = currentLayer.pixels.map((r) => [...r]);
    }

    const getMaskBrushVal = (): number => {
      if (activeTool === 'eraser') return 0;
      const clean = primaryColor.replace('#', '');
      if (clean.length === 6) {
        const r = parseInt(clean.slice(0, 2), 16);
        const g = parseInt(clean.slice(2, 4), 16);
        const b = parseInt(clean.slice(4, 6), 16);
        if (r === g && g === b) return r; // Grayscale color directly drives mask opacity 0..255
      }
      return 255;
    };

    const stampMaskPoint = (mx: number, my: number, val: number, sz: number) => {
      const stamps = getBrushStampOffsets(sz, brushSettings.shape);
      const targets =
        effSymmetry.enabled && effSymmetry.mode !== 'none'
          ? computeSymmetricPoints(mx, my, width, height, effSymmetry, true)
          : [{ x: mx, y: my }];
      for (const target of targets) {
        for (const { dx, dy } of stamps) {
          const px = target.x + dx;
          const py = target.y + dy;
          if (px >= 0 && px < width && py >= 0 && py < height && draftMaskRef.current[py]) {
            draftMaskRef.current[py][px] = val;
          }
        }
      }
    };

    // Pro Eyedropper with Sampling Scope & Smart Palette (O(1) fast path for Tiled large canvases)
    if (activeTool === 'eyedropper') {
      isPaintingMaskRef.current = false;
      draftTiledStoreRef.current = null;
      if (isFrameTiled(currentFrame)) {
        let sampledHex: string | null = null;
        if (effEyedropperConfig.layerScope === 'current') {
          sampledHex =
            getTiledStore(currentLayer.tiledStoreId)?.getPixel(coords.x, coords.y) ??
            currentLayer.pixels[coords.y]?.[coords.x] ??
            null;
        } else {
          for (let li = currentFrame.layers.length - 1; li >= 0; li--) {
            const lyr = currentFrame.layers[li];
            if (!lyr.visible) continue;
            const col = lyr.tiledStoreId
              ? getTiledStore(lyr.tiledStoreId)?.getPixel(coords.x, coords.y) ?? null
              : lyr.pixels[coords.y]?.[coords.x] ?? null;
            if (col) {
              sampledHex = col;
              break;
            }
          }
        }
        if (sampledHex) {
          onPickColor(sampledHex);
        }
        setIsDrawing(false);
        return;
      }

      const grid = buildSamplingGridForEyedropper(
        currentFrame,
        currentLayer,
        width,
        height,
        effEyedropperConfig,
        layerGroups
      );
      const sample = sampleEyedropperAt(
        grid,
        coords.x,
        coords.y,
        width,
        height,
        effEyedropperConfig,
        activePaletteColors
      );
      if (sample) {
        onPickColor(sample.hex);
        setHoveredSample(sample);
        onSampledColorUpdate?.(sample);
      }
      setIsDrawing(false);
      return;
    }

    // Paint bucket / Gradient / Dithered Gradient
    if (activeTool === 'bucket') {
      if (canEditMaskNow && currentLayer.mask && onUpdateLayerMaskPixels) {
        const nextMask = currentLayer.mask.pixels.map((r) => [...r]);
        const targetVal = nextMask[coords.y]?.[coords.x] ?? 255;
        const fillVal = getMaskBrushVal();
        if (targetVal !== fillVal) {
          const stack: [number, number][] = [[coords.x, coords.y]];
          const visited = new Uint8Array(width * height);
          while (stack.length > 0) {
            const [fx, fy] = stack.pop()!;
            const idx = fy * width + fx;
            if (visited[idx]) continue;
            visited[idx] = 1;
            nextMask[fy][fx] = fillVal;
            for (const [nx, ny] of [[fx + 1, fy], [fx - 1, fy], [fx, fy + 1], [fx, fy - 1]]) {
              if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[ny * width + nx] && nextMask[ny][nx] === targetVal) {
                stack.push([nx, ny]);
              }
            }
          }
          onUpdateLayerMaskPixels(nextMask);
        }
        isPaintingMaskRef.current = false;
        setIsDrawing(false);
        return;
      }

      // Gradient or Dithered Gradient subtool: drag to preview in real time
      if (bucketSubTool === 'gradient' || bucketSubTool === 'dither_gradient') {
        const useDither = bucketSubTool === 'dither_gradient';
        setGradientDrag({ start: coords, end: coords });
        draftPixelsRef.current = currentLayer.pixels.map((r) => [...r]);
        renderGradientToGrid(
          draftPixelsRef.current,
          currentLayer.pixels,
          coords.x,
          coords.y,
          coords.x + 1,
          coords.y,
          gradientConfig,
          useDither,
          primaryColor,
          secondaryColor,
          {
            selection,
            lockTransparency: currentLayer.lockTransparency,
            activePaletteColors,
            customMatrix: effDitherConfig.customMatrix,
          }
        );
        renderCanvas();
        return;
      }

      const newGrid = currentLayer.pixels.map((r) => [...r]);
      const sampleGrid = bucketOptions.allLayers
        ? compositeFrame(currentFrame, width, height, currentFrameIndex, false, layerGroups)
        : currentLayer.pixels;
      const targets =
        effSymmetry.enabled && effSymmetry.mode !== 'none'
          ? computeSymmetricPoints(coords.x, coords.y, width, height, effSymmetry, true)
          : [coords];
      let filledAny = false;
      for (const target of targets) {
        const changed = advancedFloodFill(
          target.x,
          target.y,
          sampleGrid,
          newGrid,
          primaryColor,
          secondaryColor,
          bucketOptions,
          effDitherConfig,
          selection,
          currentLayer.lockTransparency
        );
        if (changed) filledAny = true;
      }
      if (filledAny) {
        onUpdateLayerPixels(newGrid);
      }
      setIsDrawing(false);
      return;
    }

    // Magic Wand color selection mask (respects Tolerance, Contiguous, All Layers, Continuous Selection & Smooth)
    if (activeTool === 'magic_wand') {
      isPaintingMaskRef.current = false;
      const sampleGrid = magicWandOptions.allLayers
        ? compositeFrame(currentFrame, width, height, currentFrameIndex, false, layerGroups)
        : currentLayer.pixels;
      const wandMask = advancedMagicWandMask(coords.x, coords.y, sampleGrid, magicWandOptions);
      const opMode = e.altKey
        ? 'subtract'
        : e.shiftKey || magicWandOptions.continuousSelection
        ? 'add'
        : 'replace';
      const combined = combineSelectionMasks(
        selection,
        wandMask,
        width,
        height,
        opMode,
        'magic_wand'
      );
      setSelection(combined);
      setIsDrawing(false);
      return;
    }

    // Motion smear brush (standalone or unified Pencil + Smear modifier)
    if (activeTool === 'smear' || (activeTool === 'pencil' && Boolean(brushSettings.smearEnabled) && !canEditMaskNow)) {
      const smearRadius = Math.max(1, Math.round((brushSettings.size || brushSize) * ((brushSettings.smearStrength ?? 65) / 65)));
      applySmear(coords.x, coords.y, coords.x, coords.y, draftPixelsRef.current, smearRadius + 1);
      setLastDrawnPoint(coords);
      renderCanvas();
      return;
    }

    // Cel-Shading brush mode (standalone or unified Pencil + Cel-Shade modifier)
    if (activeTool === 'shading' || (activeTool === 'pencil' && Boolean(brushSettings.celShadeEnabled) && !canEditMaskNow)) {
      const shouldLighten = e.shiftKey || brushSettings.celShadeMode === 'lighten';
      applyShadePoint(coords.x, coords.y, draftPixelsRef.current, shouldLighten);
      setLastDrawnPoint(coords);
      renderCanvas();
      return;
    }

    // Selection Tool with 6 Subtools: General, Objects, Layers, References, Vectors, Nodes (Nodes handled by isDirectSelectActive)
    if (activeTool === 'select') {
      isPaintingMaskRef.current = false;

      if (selectionSubTool === 'objects') {
        const hitboxes = currentFrame.hitboxes || [];
        const hitHb = showHitboxes
          ? [...hitboxes]
              .reverse()
              .find((hb) => coords.x >= hb.x && coords.x < hb.x + hb.w && coords.y >= hb.y && coords.y < hb.y + hb.h)
          : null;
        if (hitHb) {
          setSelectedHitboxId(hitHb.id);
          setSelection({
            active: true,
            startX: Math.max(0, hitHb.x),
            startY: Math.max(0, hitHb.y),
            endX: Math.min(width - 1, hitHb.x + hitHb.w - 1),
            endY: Math.min(height - 1, hitHb.y + hitHb.h - 1),
            shape: 'rect',
          });
          setIsDrawing(false);
          return;
        }

        // BFS connected non-transparent pixel island on current layer
        const src = currentLayer.pixels;
        if (src[coords.y]?.[coords.x]) {
          const mask: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));
          const visited = new Uint8Array(width * height);
          const stack: [number, number][] = [[coords.x, coords.y]];
          let minX = coords.x, maxX = coords.x, minY = coords.y, maxY = coords.y;
          while (stack.length > 0) {
            const [fx, fy] = stack.pop()!;
            const idx = fy * width + fx;
            if (visited[idx]) continue;
            visited[idx] = 1;
            if (!src[fy]?.[fx]) continue;
            mask[fy][fx] = true;
            if (fx < minX) minX = fx;
            if (fx > maxX) maxX = fx;
            if (fy < minY) minY = fy;
            if (fy > maxY) maxY = fy;
            for (const [nx, ny] of [
              [fx + 1, fy],
              [fx - 1, fy],
              [fx, fy + 1],
              [fx, fy - 1],
              [fx + 1, fy + 1],
              [fx - 1, fy - 1],
              [fx + 1, fy - 1],
              [fx - 1, fy + 1],
            ]) {
              if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[ny * width + nx] && src[ny]?.[nx]) {
                stack.push([nx, ny]);
              }
            }
          }
          setSelection({
            active: true,
            startX: minX,
            startY: minY,
            endX: maxX,
            endY: maxY,
            shape: 'magic_wand',
            mask,
          });
        }
        setIsDrawing(false);
        return;
      }

      if (selectionSubTool === 'layers') {
        // Find top-most visible layer with pixel at click, select that layer and mask its silhouette
        for (let li = currentFrame.layers.length - 1; li >= 0; li--) {
          const lyr = currentFrame.layers[li];
          if (!lyr.visible) continue;
          if (lyr.pixels[coords.y]?.[coords.x]) {
            onSelectLayerIndex?.(li);
            const mask: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));
            let minX = width - 1, maxX = 0, minY = height - 1, maxY = 0;
            let count = 0;
            for (let py = 0; py < height; py++) {
              for (let px = 0; px < width; px++) {
                if (lyr.pixels[py]?.[px]) {
                  mask[py][px] = true;
                  count++;
                  if (px < minX) minX = px;
                  if (px > maxX) maxX = px;
                  if (py < minY) minY = py;
                  if (py > maxY) maxY = py;
                }
              }
            }
            if (count > 0) {
              setSelection({
                active: true,
                startX: minX,
                startY: minY,
                endX: maxX,
                endY: maxY,
                shape: 'magic_wand',
                mask,
              });
            }
            break;
          }
        }
        setIsDrawing(false);
        return;
      }

      if (selectionSubTool === 'references') {
        if (canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          const px = e.clientX - rect.left;
          const py = e.clientY - rect.top;
          const canvasRefs = [...references]
            .filter((r) => r.visible && r.anchor !== 'camera')
            .sort((a, b) => (a.zOrder ?? 0) - (b.zOrder ?? 0));
          for (let i = canvasRefs.length - 1; i >= 0; i--) {
            const r = canvasRefs[i];
            const img = refImageCacheRef.current.get(r.dataUrl);
            const natW = img?.naturalWidth || r.naturalWidth || width;
            const natH = img?.naturalHeight || r.naturalHeight || height;
            const baseFactor = zoom / Math.max(1, natW / width);
            const bw = natW * baseFactor * r.scale;
            const bh = natH * baseFactor * r.scale;
            const cx = (width / 2 + r.x) * zoom;
            const cy = (height / 2 + r.y) * zoom;
            const rad = (-r.rotation * Math.PI) / 180;
            const dx = px - cx;
            const dy = py - cy;
            const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
            const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
            if (Math.abs(lx) <= bw / 2 && Math.abs(ly) <= bh / 2) {
              onSelectReference?.(r.id);
              onBringReferenceToFront?.(r.id);
              setIsDrawing(false);
              return;
            }
          }
        }
        onSelectReference?.(null);
        setIsDrawing(false);
        return;
      }

      if (selectionSubTool === 'vectors') {
        const paths = currentLayer.vectorPaths || [];
        let found: VectorPath | null = null;
        for (let i = paths.length - 1; i >= 0; i--) {
          const p = paths[i];
          if (
            hitTestVectorNode(p, coords.x, coords.y, 2.5) ||
            (p.nodes.length >= 2 && hitTestVectorSegment(p, coords.x, coords.y, 2.2))
          ) {
            found = p;
            break;
          }
        }
        if (found) {
          onSelectVectorPathId?.(found.id);
          onSelectVectorNodeIds?.(found.nodes.map((n) => n.id));
        } else {
          onSelectVectorPathId?.(null);
          onSelectVectorNodeIds?.([]);
        }
        setIsDrawing(false);
        return;
      }

      // Default: 'general' Rectangular or Elliptical marquee with boolean mode, fixed ratio & rounded corners
      prevSelectionBeforeDragRef.current = selection ? { ...selection } : null;
      const effOp = e.altKey ? 'subtract' : e.shiftKey ? 'add' : selectionOptions.opMode;
      const initMask = buildSelectionMaskFromShape(
        coords.x,
        coords.y,
        coords.x,
        coords.y,
        width,
        height,
        marqueeShape,
        marqueeShape === 'rect' && selectionOptions.roundedCorners,
        selectionOptions.cornerRadius
      );
      if (effOp === 'replace' && marqueeShape === 'rect' && !selectionOptions.roundedCorners) {
        setSelection({
          active: true,
          startX: coords.x,
          startY: coords.y,
          endX: coords.x,
          endY: coords.y,
          shape: 'rect',
        });
      } else {
        setSelection(
          combineSelectionMasks(
            prevSelectionBeforeDragRef.current,
            initMask,
            width,
            height,
            effOp,
            marqueeShape
          )
        );
      }
      return;
    }

    // Hitbox creation (or select/resize existing box if clicking its handle or inside)
    if (activeTool === 'hitbox') {
      isPaintingMaskRef.current = false;
      const hitboxes = currentFrame.hitboxes || [];
      if (showHitboxes && selectedHitboxId) {
        const selHb = hitboxes.find((h) => h.id === selectedHitboxId);
        if (selHb) {
          const handle = findHitboxHandle(selHb);
          if (handle) {
            setIsDrawing(false);
            setResizingHitbox({ id: selHb.id, handle, orig: { ...selHb }, startGrid: coords });
            return;
          }
        }
      }
      const existingHb = [...hitboxes].reverse().find(
        (hb) => coords.x >= hb.x && coords.x < hb.x + hb.w && coords.y >= hb.y && coords.y < hb.y + hb.h
      );
      if (showHitboxes && existingHb && e.altKey) {
        setIsDrawing(false);
        setSelectedHitboxId(existingHb.id);
        setDraggingHitboxId(existingHb.id);
        setHitboxDragOffset({ x: coords.x - existingHb.x, y: coords.y - existingHb.y });
        return;
      }
      setNewHitboxStart(coords);
      return;
    }

    // Tiles Tool (Dibujar, Colocar, Reemplazar, Borrar, Seleccionar + Autotile + Área + Repetición + Relleno Inteligente)
    if (activeTool === 'tile' && !canEditMaskNow) {
      const tileSz = Math.max(4, tileToolConfig.tileSize || 16);
      const tx = Math.floor(coords.x / tileSz);
      const ty = Math.floor(coords.y / tileSz);
      const coordKey = `${tx},${ty}`;
      const curMap: Record<string, string> = { ...(currentLayer.tileMapData || {}) };

      if (tileToolConfig.mode === 'select') {
        const pickedKey = curMap[coordKey];
        if (pickedKey) {
          const sep = pickedKey.indexOf(':');
          if (sep > 0 && onChangeTileToolConfig) {
            onChangeTileToolConfig({
              ...tileToolConfig,
              activeTilesetId: pickedKey.slice(0, sep),
              activeTileId: pickedKey.slice(sep + 1),
            });
          }
        }
        draftPixelsRef.current = [];
        draftTileMapRef.current = null;
        setIsDrawing(false);
        return;
      }

      if (draftPixelsRef.current.length === 0) {
        draftPixelsRef.current = createEmptyGrid(width, height);
      }
      draftTileMapRef.current = curMap;
      const activeKey = activeTileset && activeTileItem ? `${activeTileset.id}:${activeTileItem.id}` : '';

      if (tileToolConfig.mode === 'replace') {
        const targetKey = curMap[coordKey];
        if (targetKey && activeTileItem && activeKey) {
          const changed = replaceMatchingTilesOnGrid(
            draftPixelsRef.current,
            draftTileMapRef.current,
            targetKey,
            activeKey,
            activeTileItem,
            tileSz,
            width,
            height,
            tileToolConfig.autotile,
            findTileByKey
          );
          if (changed > 0) {
            if (onCommitTileLayerEdit) {
              onCommitTileLayerEdit(draftPixelsRef.current, draftTileMapRef.current);
            } else {
              onUpdateLayerPixels(draftPixelsRef.current, currentLayer.offCanvasPixels);
            }
          }
        }
        draftPixelsRef.current = [];
        draftTileMapRef.current = null;
        setIsDrawing(false);
        return;
      }

      if (tileToolConfig.paintMode === 'smart_fill' && (tileToolConfig.mode === 'draw' || tileToolConfig.mode === 'place')) {
        if (activeTileItem && activeKey) {
          const changed = smartFillTilesOnGrid(
            draftPixelsRef.current,
            draftTileMapRef.current,
            tx,
            ty,
            activeKey,
            activeTileItem,
            tileSz,
            width,
            height,
            tileToolConfig.autotile,
            findTileByKey
          );
          if (changed > 0) {
            if (onCommitTileLayerEdit) {
              onCommitTileLayerEdit(draftPixelsRef.current, draftTileMapRef.current);
            } else {
              onUpdateLayerPixels(draftPixelsRef.current, currentLayer.offCanvasPixels);
            }
          }
        }
        draftPixelsRef.current = [];
        draftTileMapRef.current = null;
        setIsDrawing(false);
        return;
      }

      const applySingleTileCell = (cx: number, cy: number) => {
        if (!draftTileMapRef.current) return;
        const cKey = `${cx},${cy}`;
        if (tileToolConfig.mode === 'erase') {
          delete draftTileMapRef.current[cKey];
          clearTileCellOnGrid(draftPixelsRef.current, cx, cy, tileSz, width, height);
          if (tileToolConfig.autotile) {
            updateAutotileAroundCell(
              draftPixelsRef.current,
              draftTileMapRef.current,
              cx,
              cy,
              tileSz,
              width,
              height,
              findTileByKey
            );
          }
        } else if (activeTileItem && activeKey) {
          draftTileMapRef.current[cKey] = activeKey;
          if (tileToolConfig.autotile) {
            updateAutotileAroundCell(
              draftPixelsRef.current,
              draftTileMapRef.current,
              cx,
              cy,
              tileSz,
              width,
              height,
              findTileByKey
            );
          } else {
            stampTilePixelsOntoGrid(
              draftPixelsRef.current,
              cx,
              cy,
              tileSz,
              activeTileItem.pixels,
              width,
              height
            );
          }
        }
      };

      tileDragStartCellRef.current = { tx, ty };
      tileLastCellRef.current = { tx, ty };
      applySingleTileCell(tx, ty);
      renderCanvas();
      return;
    }

    // Freehand tools (Pencil Universal, Eraser, Dither with full BrushSettings + Stylus Pressure + Mask Painting)
    if (['pencil', 'eraser', 'dither'].includes(activeTool)) {
      const { rawPressure, pointerType, effectiveSize, totalOpacity } = getPointerStrokeMetrics(e, 1);
      setLivePressureInfo({ pressure: rawPressure, pointerType, size: effectiveSize });
      if (canEditMaskNow) {
        stampMaskPoint(coords.x, coords.y, getMaskBrushVal(), effectiveSize);
      } else if (draftTiledStoreRef.current) {
        const tiledColor = activeTool === 'eraser' ? null : primaryColor;
        const targets =
          effSymmetry.enabled && effSymmetry.mode !== 'none'
            ? computeSymmetricPoints(coords.x, coords.y, width, height, effSymmetry, true)
            : [coords];
        for (const pt of targets) {
          draftTiledStoreRef.current.drawBrushStamp(pt.x, pt.y, tiledColor, effectiveSize);
        }
      } else {
        applyPointDraw(coords.x, coords.y, draftPixelsRef.current, effectiveSize, totalOpacity);
      }
      setLastDrawnPoint(coords);
      renderCanvas();
    }
  };

  // Cel-Shade tinting algorithm (Supports all 10 symmetry modes + Cel intensity + Universal Dithering)
  const applyShadePoint = (x: number, y: number, grid: (string | null)[][], lighten: boolean = false) => {
    const targets =
      effSymmetry.enabled && effSymmetry.mode !== 'none'
        ? computeSymmetricPoints(x, y, width, height, effSymmetry, true)
        : [{ x, y }];

    const intensity = Math.max(0.05, Math.min(0.6, (brushSettings.celShadeIntensity ?? 24) / 100));
    const factor = lighten ? 1 + intensity : 1 - intensity;
    const sz = Math.max(1, brushSettings.size || brushSize);
    const stamps = getBrushStampOffsets(sz, brushSettings.shape);
    const useDitherGate = Boolean(effDitherConfig.enabled);

    for (const pt of targets) {
      for (const { dx, dy } of stamps) {
        const px = pt.x + dx;
        const py = pt.y + dy;
        if (px < 0 || px >= width || py < 0 || py >= height) continue;
        if (useDitherGate) {
          const thr = evaluateDitherThreshold(px, py, effDitherConfig);
          const pass = effDitherConfig.invert
            ? effDitherConfig.density / 100 < thr
            : effDitherConfig.density / 100 >= thr;
          if (!pass) continue;
        }
        const currentCol = grid[py]?.[px];
        if (!currentCol) continue;
        const clean = currentCol.replace('#', '');
        const r = Math.min(255, Math.max(0, Math.round(parseInt(clean.substring(0, 2), 16) * factor)));
        const g = Math.min(255, Math.max(0, Math.round(parseInt(clean.substring(2, 4), 16) * factor)));
        const b = Math.min(255, Math.max(0, Math.round(parseInt(clean.substring(4, 6), 16) * factor)));
        grid[py][px] = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
      }
    }
  };

  const applyTransparencyLock = useCallback(
    (orig: (string | null)[][], next: (string | null)[][]): (string | null)[][] => {
      return next.map((row, y) =>
        row.map((col, x) => {
          const origCol = orig[y]?.[x] ?? null;
          if (origCol === null) return null;
          return col === null ? origCol : col;
        })
      );
    },
    []
  );

  const applyPointDraw = (
    x: number,
    y: number,
    grid: (string | null)[][],
    overrideSize?: number,
    overrideOpacity?: number
  ) => {
    const sz = overrideSize ?? (brushSettings.size || brushSize);
    const baseOp = overrideOpacity ?? Math.max(0.05, Math.min(1, brushSettings.opacity * primaryAlpha));
    const flowMul = brushSettings.flow ?? 1;
    const op = Math.max(0.04, Math.min(1, baseOp * flowMul));
    const targets =
      effSymmetry.enabled && effSymmetry.mode !== 'none'
        ? computeSymmetricPoints(x, y, width, height, effSymmetry, true)
        : [{ x, y }];

    const useUniversalDither =
      effTool === 'dither' || (effTool === 'pencil' && Boolean(effDitherConfig.enabled));
    const hasTexture = Boolean(brushSettings.texture && brushSettings.texture !== 'none');
    const isAirbrush = Boolean(brushSettings.airbrushMode || brushSettings.shape === 'spray');

    if (useUniversalDither || (effTool === 'pencil' && (hasTexture || isAirbrush || flowMul < 0.99))) {
      const stamps = getBrushStampOffsets(sz, brushSettings.shape);
      const jitter = brushSettings.jitterPosition || 0;
      const halfR = Math.max(0.5, sz / 2);
      for (const target of targets) {
        const jx = jitter > 0 ? Math.round((Math.random() - 0.5) * 2 * jitter) : 0;
        const jy = jitter > 0 ? Math.round((Math.random() - 0.5) * 2 * jitter) : 0;
        for (const { dx, dy } of stamps) {
          const px = target.x + dx + jx;
          const py = target.y + dy + jy;
          if (px < 0 || px >= width || py < 0 || py >= height) continue;
          if (currentLayer.lockTransparency && !currentLayer.pixels[py]?.[px]) continue;

          if (isAirbrush) {
            const distNorm = Math.hypot(dx, dy) / Math.max(1, halfR);
            if (Math.random() > Math.max(0.18, 0.72 * (1 - distNorm * 0.55))) continue;
          }

          const texMul = evaluateBrushTextureFactor(
            px,
            py,
            brushSettings.texture,
            brushSettings.textureStrength ?? 50
          );
          const distFalloff =
            brushSettings.hardness < 0.99 && sz > 1
              ? Math.max(0.15, 1 - (Math.hypot(dx, dy) / Math.max(1, halfR)) * (1 - brushSettings.hardness))
              : 1;
          const finalAlpha = Math.max(0.05, Math.min(1, op * texMul * distFalloff));

          if (useUniversalDither) {
            const dCol = computeUniversalDitherPixel(
              px,
              py,
              { ...effDitherConfig, enabled: true },
              primaryColor,
              secondaryColor,
              grid[py]?.[px],
              finalAlpha
            );
            if (dCol) {
              grid[py][px] = dCol;
            }
          } else {
            grid[py][px] =
              finalAlpha < 0.999 ? blendHexColors(grid[py][px], primaryColor, finalAlpha, 'normal') : primaryColor;
          }
        }
      }
      return;
    }

    let colorToApply: string | null = primaryColor;
    let drawShape = brushSettings.shape;
    let drawOp = op;
    let drawHardness = brushSettings.hardness;
    if (effTool === 'eraser') {
      if (currentLayer.lockTransparency) return;
      colorToApply = null;
      drawShape = eraserOptions.shape;
      drawOp = Math.max(0.05, Math.min(1, eraserOptions.opacity * eraserOptions.flow));
      drawHardness = Math.max(0, Math.min(1, eraserOptions.hardness / 100));
    }

    for (const target of targets) {
      drawAdvancedBrush(
        target.x,
        target.y,
        colorToApply,
        grid,
        width,
        height,
        sz,
        drawShape,
        drawOp,
        drawHardness,
        brushSettings.jitterPosition
      );
    }

    if (currentLayer.lockTransparency) {
      const locked = applyTransparencyLock(currentLayer.pixels, grid);
      for (let py = 0; py < height; py++) {
        grid[py] = locked[py];
      }
    }
  };

  const handleMouseMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    const rawCoords = getGridCoords(e);
    const unclampedCoords = getUnclampedGridCoords(e);

    // Optional stabilizer smoothing for cleaner hand-drawn linework
    let coords = rawCoords;
    if (isDrawing && rawCoords && brushSettings.stabilizer > 0 && ['pencil', 'eraser', 'shading'].includes(activeTool)) {
      const prevSmooth = smoothedCoordRef.current || rawCoords;
      const factor = Math.max(0.2, 1 - brushSettings.stabilizer * 0.14);
      const sx = Math.round(prevSmooth.x + (rawCoords.x - prevSmooth.x) * factor);
      const sy = Math.round(prevSmooth.y + (rawCoords.y - prevSmooth.y) * factor);
      smoothedCoordRef.current = { x: sx, y: sy };
      coords = {
        x: Math.max(0, Math.min(width - 1, sx)),
        y: Math.max(0, Math.min(height - 1, sy)),
      };
    } else if (rawCoords) {
      smoothedCoordRef.current = rawCoords;
    }

    // Live Zoom (Lupa) region drag update
    if (zoomRegionDrag) {
      const unc = unclampedCoords || rawCoords || zoomRegionDrag.endGrid;
      const clampedEnd = {
        x: Math.max(0, Math.min(width - 1, unc.x)),
        y: Math.max(0, Math.min(height - 1, unc.y)),
      };
      setZoomRegionDrag((prev) =>
        prev
          ? {
              ...prev,
              endClientX: e.clientX,
              endClientY: e.clientY,
              endGrid: clampedEnd,
            }
          : null
      );
      return;
    }

    setCursorPos(coords);

    if (vectorDraftSession?.phase === 'placing' && (rawCoords || unclampedCoords)) {
      const nextPt = rawCoords || unclampedCoords;
      if (nextPt) {
        const placingPath = currentLayer.vectorPaths?.find((p) => p.id === vectorDraftSession.pathId);
        const anchorNode =
          placingPath && placingPath.nodes.length > 0
            ? placingPath.nodes[placingPath.nodes.length - 1]
            : null;
        const snappedHover = applyGuideSnap(
          nextPt.x,
          nextPt.y,
          e.altKey,
          anchorNode ? { x: anchorNode.x, y: anchorNode.y } : null
        );
        setVectorHoverCoord(snappedHover);
      }
    }

    // Magnetic Lasso live contour hugging while moving cursor between anchors
    if (
      effTool === 'lasso' &&
      lassoMode === 'magnetic' &&
      magneticLassoPts.length > 0 &&
      magneticEdgeMapRef.current &&
      coords
    ) {
      const edgeMap = magneticEdgeMapRef.current;
      const snapped = snapPointToStrongestEdge(coords.x, coords.y, edgeMap, 5);
      const lastAnchor = magneticLassoPts[magneticLassoPts.length - 1];
      const seg = traceMagneticLassoSegment(lastAnchor, { x: snapped.x, y: snapped.y }, edgeMap);
      const dist = Math.hypot(snapped.x - lastAnchor.x, snapped.y - lastAnchor.y);
      if (dist >= 7 && snapped.edgeScore >= 0.45 && seg.length > 0) {
        setMagneticLassoPts((prev) => [...prev, ...seg]);
        setMagneticPreviewSeg([]);
      } else {
        setMagneticPreviewSeg(seg);
      }
      renderCanvas();
      return;
    }

    // Dragging Symmetry Axis Center or Custom Line P1/P2
    if (symHandleDragRef.current && onChangeSymmetryConfig && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const gx = (e.clientX - rect.left) / zoom - 0.5;
      const gy = (e.clientY - rect.top) / zoom - 0.5;
      const kind = symHandleDragRef.current;
      if (kind === 'center') {
        onChangeSymmetryConfig({
          ...effSymmetry,
          axisX: Math.round(gx * 2) / 2,
          axisY: Math.round(gy * 2) / 2,
        });
      } else if (kind === 'p1') {
        onChangeSymmetryConfig({
          ...effSymmetry,
          lineP1: { x: Math.round(gx), y: Math.round(gy) },
        });
      } else if (kind === 'p2') {
        onChangeSymmetryConfig({
          ...effSymmetry,
          lineP2: { x: Math.round(gx), y: Math.round(gy) },
        });
      }
      return;
    }

    // Live Parametric Shape Handle Dragging (Scale, Rotate, Skew, Corner Distort, Pivot, Shape Parameters)
    if (shapeDragRef.current && canvasRef.current) {
      const drag = shapeDragRef.current;
      const orig = drag.origShape;
      const rect = canvasRef.current.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const curGrid = { x: px / zoom, y: py / zoom };
      const dx = curGrid.x - drag.startGrid.x;
      const dy = curGrid.y - drag.startGrid.y;
      const next: ParametricShapeObject = {
        ...orig,
        cornerRadii: [...orig.cornerRadii],
        cornerOffsets: orig.cornerOffsets
          ? [
              { ...orig.cornerOffsets[0] },
              { ...orig.cornerOffsets[1] },
              { ...orig.cornerOffsets[2] },
              { ...orig.cornerOffsets[3] },
            ]
          : undefined,
      };
      const snapPx = Boolean(orig.pixelPerfect || moveOptions.snapToGrid);
      const snapVal = (v: number) => (snapPx ? Math.round(v) : Math.round(v * 10) / 10);
      let hud = '';

      const hk = drag.handleKind;
      if (hk === 'move') {
        let nx = snapVal(orig.x + dx);
        let ny = snapVal(orig.y + dy);
        if (moveOptions.snapToGuides) {
          const midX = width / 2;
          const midY = height / 2;
          if (Math.abs(nx + orig.width / 2 - midX) <= 1.5) nx = midX - orig.width / 2;
          if (Math.abs(ny + orig.height / 2 - midY) <= 1.5) ny = midY - orig.height / 2;
        }
        next.x = nx;
        next.y = ny;
        hud = `Pos: ${Math.round(nx)}, ${Math.round(ny)}`;
      } else if (hk === 'rotate') {
        const piv = shapeNormToCanvas(orig, orig.pivotX, orig.pivotY);
        const curAngle = Math.atan2(curGrid.y - piv.y, curGrid.x - piv.x);
        const deltaDeg = ((curAngle - (drag.startAngle ?? 0)) * 180) / Math.PI;
        let rot = orig.rotation + deltaDeg;
        if (e.shiftKey) rot = Math.round(rot / 15) * 15;
        while (rot > 180) rot -= 360;
        while (rot < -180) rot += 360;
        next.rotation = Math.round(rot * 10) / 10;
        hud = `Rotación: ${Math.round(next.rotation)}°`;
      } else if (hk === 'pivot') {
        const local = canvasToShapeLocal(orig, curGrid.x, curGrid.y);
        next.pivotX = Math.max(-0.25, Math.min(1.25, local.lx / Math.max(1, orig.width)));
        next.pivotY = Math.max(-0.25, Math.min(1.25, local.ly / Math.max(1, orig.height)));
        hud = `Pivote: ${Math.round(next.pivotX * 100)}%, ${Math.round(next.pivotY * 100)}%`;
      } else if (hk === 'tl' || hk === 'tr' || hk === 'br' || hk === 'bl') {
        if (e.ctrlKey || e.metaKey) {
          // Ctrl+Corner = Free Corner Distortion
          const idx = hk === 'tl' ? 0 : hk === 'tr' ? 1 : hk === 'br' ? 2 : 3;
          const baseOffsets: [
            { dx: number; dy: number },
            { dx: number; dy: number },
            { dx: number; dy: number },
            { dx: number; dy: number },
          ] = next.cornerOffsets
            ? [
                { ...next.cornerOffsets[0] },
                { ...next.cornerOffsets[1] },
                { ...next.cornerOffsets[2] },
                { ...next.cornerOffsets[3] },
              ]
            : [
                { dx: 0, dy: 0 },
                { dx: 0, dy: 0 },
                { dx: 0, dy: 0 },
                { dx: 0, dy: 0 },
              ];
          const rad = (-orig.rotation * Math.PI) / 180;
          const ldx = dx * Math.cos(rad) - dy * Math.sin(rad);
          const ldy = dx * Math.sin(rad) + dy * Math.cos(rad);
          baseOffsets[idx] = {
            dx: Math.round((baseOffsets[idx].dx + ldx) * 10) / 10,
            dy: Math.round((baseOffsets[idx].dy + ldy) * 10) / 10,
          };
          next.cornerOffsets = baseOffsets;
          hud = `Distorsión ${hk.toUpperCase()}: ${Math.round(baseOffsets[idx].dx)}, ${Math.round(baseOffsets[idx].dy)}`;
        } else {
          // Unified Corner Scaling (Shift keeps aspect ratio, Alt scales from center)
          const rad = (-orig.rotation * Math.PI) / 180;
          const ldx = dx * Math.cos(rad) - dy * Math.sin(rad);
          const ldy = dx * Math.sin(rad) + dy * Math.cos(rad);
          const signX = hk === 'tl' || hk === 'bl' ? -1 : 1;
          const signY = hk === 'tl' || hk === 'tr' ? -1 : 1;
          let nw = Math.max(2, orig.width + (e.altKey ? ldx * signX * 2 : ldx * signX));
          let nh = Math.max(2, orig.height + (e.altKey ? ldy * signY * 2 : ldy * signY));
          if (e.shiftKey) {
            const aspect = orig.width / Math.max(1, orig.height);
            if (Math.abs(nw - orig.width) >= Math.abs(nh - orig.height)) {
              nh = Math.max(2, nw / aspect);
            } else {
              nw = Math.max(2, nh * aspect);
            }
          }
          nw = snapVal(nw);
          nh = snapVal(nh);
          if (e.altKey) {
            next.x = snapVal(orig.x - (nw - orig.width) / 2);
            next.y = snapVal(orig.y - (nh - orig.height) / 2);
          } else {
            next.x = hk === 'tl' || hk === 'bl' ? snapVal(orig.x + (orig.width - nw)) : orig.x;
            next.y = hk === 'tl' || hk === 'tr' ? snapVal(orig.y + (orig.height - nh)) : orig.y;
          }
          next.width = nw;
          next.height = nh;
          hud = `Tamaño: ${Math.round(nw)}×${Math.round(nh)}px`;
        }
      } else if (hk === 't' || hk === 'r' || hk === 'b' || hk === 'l') {
        const rad = (-orig.rotation * Math.PI) / 180;
        const ldx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const ldy = dx * Math.sin(rad) + dy * Math.cos(rad);
        if (e.ctrlKey || e.metaKey) {
          // Ctrl+Side = Skew
          if (hk === 't' || hk === 'b') {
            const dir = hk === 't' ? -1 : 1;
            const addDeg = (Math.atan2(ldx * dir, Math.max(4, orig.height / 2)) * 180) / Math.PI;
            next.skewX = Math.max(-60, Math.min(60, Math.round((orig.skewX + addDeg) * 10) / 10));
            hud = `Sesgo X: ${Math.round(next.skewX)}°`;
          } else {
            const dir = hk === 'l' ? -1 : 1;
            const addDeg = (Math.atan2(ldy * dir, Math.max(4, orig.width / 2)) * 180) / Math.PI;
            next.skewY = Math.max(-60, Math.min(60, Math.round((orig.skewY + addDeg) * 10) / 10));
            hud = `Sesgo Y: ${Math.round(next.skewY)}°`;
          }
        } else {
          if (hk === 'r') {
            next.width = Math.max(2, snapVal(orig.width + ldx));
          } else if (hk === 'l') {
            const nw = Math.max(2, snapVal(orig.width - ldx));
            next.x = snapVal(orig.x + (orig.width - nw));
            next.width = nw;
          } else if (hk === 'b') {
            next.height = Math.max(2, snapVal(orig.height + ldy));
          } else if (hk === 't') {
            const nh = Math.max(2, snapVal(orig.height - ldy));
            next.y = snapVal(orig.y + (orig.height - nh));
            next.height = nh;
          }
          hud = `Tamaño: ${Math.round(next.width)}×${Math.round(next.height)}px`;
        }
      } else if (hk === 'cr_tl' || hk === 'cr_tr' || hk === 'cr_br' || hk === 'cr_bl') {
        const local = canvasToShapeLocal(orig, curGrid.x, curGrid.y);
        const maxR = Math.min(orig.width, orig.height) / 2;
        const cornerIdx = hk === 'cr_tl' ? 0 : hk === 'cr_tr' ? 1 : hk === 'cr_br' ? 2 : 3;
        const distFromX = cornerIdx === 0 || cornerIdx === 3 ? local.lx : orig.width - local.lx;
        const distFromY = cornerIdx === 0 || cornerIdx === 1 ? local.ly : orig.height - local.ly;
        const r = Math.max(0, Math.min(maxR, Math.round((Math.min(distFromX, distFromY) - 1) * 2) / 2));
        if (e.altKey || orig.independentCorners) {
          const nextRadii: [number, number, number, number] = [...orig.cornerRadii];
          nextRadii[cornerIdx] = r;
          next.independentCorners = true;
          next.cornerRadii = nextRadii;
          hud = `Radio Esq.${cornerIdx + 1}: ${r}px`;
        } else {
          next.independentCorners = false;
          next.cornerRadius = r;
          next.cornerRadii = [r, r, r, r];
          hud = `Radio: ${r}px (Alt: indep.)`;
        }
      } else if (hk === 'arc_start' || hk === 'arc_end') {
        const local = canvasToShapeLocal(orig, curGrid.x, curGrid.y);
        const cx = orig.width / 2;
        const cy = orig.height / 2;
        let deg = (Math.atan2(local.ly - cy, local.lx - cx) * 180) / Math.PI + 90;
        while (deg < 0) deg += 360;
        while (deg >= 360) deg -= 360;
        if (hk === 'arc_start') {
          next.arcStartDeg = Math.round(deg);
          if (next.arcType === 'full') next.arcType = 'pie';
          hud = `Inicio arco: ${next.arcStartDeg}°`;
        } else {
          let sweepDeg = deg - (orig.arcStartDeg ?? 0);
          while (sweepDeg <= 0) sweepDeg += 360;
          const pct = Math.max(5, Math.min(100, Math.round((sweepDeg / 360) * 100)));
          next.arcSweepPct = pct;
          next.arcType = pct >= 99 ? 'full' : orig.arcType === 'full' ? 'pie' : orig.arcType;
          hud = `Apertura arco: ${pct}%`;
        }
      } else if (hk === 'poly_inner') {
        const local = canvasToShapeLocal(orig, curGrid.x, curGrid.y);
        const distNorm = Math.max(0.15, Math.min(1, Math.abs(local.lx - orig.width / 2) / Math.max(1, orig.width * 0.45)));
        next.innerRadiusRatio = Math.round(distNorm * 100) / 100;
        hud = `Radio interno: ${Math.round(next.innerRadiusRatio * 100)}%`;
      } else if (hk === 'poly_round') {
        const local = canvasToShapeLocal(orig, curGrid.x, curGrid.y);
        const frac = Math.max(0, Math.min(1, (local.ly / Math.max(1, orig.height) - 0.08) / 0.32));
        next.vertexRoundness = Math.round(frac * 100) / 100;
        hud = `Redondeado: ${Math.round(next.vertexRoundness * 100)}%`;
      } else if (hk === 'star_depth') {
        const local = canvasToShapeLocal(orig, curGrid.x, curGrid.y);
        const nx = (local.lx - orig.width / 2) / Math.max(1, orig.width / 2);
        const ny = (local.ly - orig.height / 2) / Math.max(1, orig.height / 2);
        const depth = Math.max(0.15, Math.min(0.95, Math.hypot(nx, ny)));
        next.starDepth = Math.round(depth * 100) / 100;
        hud = `Profundidad: ${Math.round(next.starDepth * 100)}%`;
      } else if (hk === 'star_twist') {
        const local = canvasToShapeLocal(orig, curGrid.x, curGrid.y);
        const sym = Math.max(-0.5, Math.min(0.5, (local.lx / Math.max(1, orig.width) - 0.5) / 0.6));
        next.starSymmetry = Math.round(sym * 100) / 100;
        hud = `Simetría estrella: ${Math.round(next.starSymmetry * 100)}%`;
      } else if (hk === 'arrow_head') {
        const local = canvasToShapeLocal(orig, curGrid.x, curGrid.y);
        const headFrac = Math.max(0.15, Math.min(0.85, 1 - local.lx / Math.max(1, orig.width)));
        const shaftFrac = Math.max(
          0.1,
          Math.min(0.9, Math.abs(0.5 - local.ly / Math.max(1, orig.height)) * 2)
        );
        next.arrowHeadSize = Math.round(headFrac * 100) / 100;
        next.arrowShaftWidth = Math.round(shaftFrac * 100) / 100;
        hud = `Punta: ${Math.round(headFrac * 100)}% · Cuerpo: ${Math.round(shaftFrac * 100)}%`;
      } else if (hk === 'arrow_curve') {
        const local = canvasToShapeLocal(orig, curGrid.x, curGrid.y);
        const curve = Math.max(-1, Math.min(1, (local.ly / Math.max(1, orig.height) - 0.5) / 0.32));
        next.arrowCurvature = Math.round(curve * 100) / 100;
        hud = `Curvatura: ${Math.round(next.arrowCurvature * 100)}%`;
      }

      shapeDragRef.current.dragHud = hud;
      shapeLiveOverrideRef.current = next;
      renderCanvas();
      return;
    }

    // Hover outer-corner rotation zone detection (Photoshop style) when Transform Box is active
    if (transformSession && !transformDragRef.current && canvasRef.current) {
      const tp = transformSession.params;
      const rect = canvasRef.current.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const corners = getTransformedQuadCorners(tp).map((c) => ({ x: c.x * zoom, y: c.y * zoom }));
      const minX = Math.min(...corners.map((p) => p.x));
      const maxX = Math.max(...corners.map((p) => p.x));
      const minY = Math.min(...corners.map((p) => p.y));
      const maxY = Math.max(...corners.map((p) => p.y));
      const insideBox = px >= minX - 4 && px <= maxX + 4 && py >= minY - 4 && py <= maxY + 4;
      let nearestOuterCorner: { cornerX: number; cornerY: number } | null = null;
      if (!insideBox) {
        let bestDist = Infinity;
        for (const c of corners) {
          const d = Math.hypot(px - c.x, py - c.y);
          if (d > 8 && d <= 36 && d < bestDist) {
            bestDist = d;
            nearestOuterCorner = { cornerX: c.x, cornerY: c.y };
          }
        }
        if (!nearestOuterCorner && px >= minX - 40 && px <= maxX + 40 && py >= minY - 40 && py <= maxY + 40) {
          // Closest corner even slightly outside edge halo
          for (const c of corners) {
            const d = Math.hypot(px - c.x, py - c.y);
            if (d < bestDist) {
              bestDist = d;
              nearestOuterCorner = { cornerX: c.x, cornerY: c.y };
            }
          }
        }
      }
      if (
        (nearestOuterCorner && (!transformHoverRotCorner || transformHoverRotCorner.cornerX !== nearestOuterCorner.cornerX || transformHoverRotCorner.cornerY !== nearestOuterCorner.cornerY)) ||
        (!nearestOuterCorner && transformHoverRotCorner)
      ) {
        setTransformHoverRotCorner(nearestOuterCorner);
      }
    } else if (!transformSession && transformHoverRotCorner) {
      setTransformHoverRotCorner(null);
    }

    // Transform Interactive Dragging
    if (transformSession && transformDragRef.current && onChangeTransformParams && canvasRef.current) {
      const drag = transformDragRef.current;
      const rect = canvasRef.current.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const unclamped = getUnclampedGridCoords(e) || rawCoords || { x: 0, y: 0 };

      if (drag.kind === 'move') {
        let dx = unclamped.x - drag.startMouse.x;
        let dy = unclamped.y - drag.startMouse.y;
        if (transformSnapConfig.grid && drag.startParams.snapToGrid) {
          dx = Math.round(dx);
          dy = Math.round(dy);
        }
        const rawNextX = drag.startParams.x + dx;
        const rawNextY = drag.startParams.y + dy;
        const snappedBox = applyBoundsGuideSnap(
          rawNextX,
          rawNextY,
          drag.startParams.width,
          drag.startParams.height,
          e.altKey
        );
        const effDx = snappedBox.x - drag.startParams.x;
        const effDy = snappedBox.y - drag.startParams.y;
        const nextCorners = drag.startParams.corners.map((c) => ({ x: c.x + effDx, y: c.y + effDy })) as any;
        onChangeTransformParams({
          ...drag.startParams,
          x: snappedBox.x,
          y: snappedBox.y,
          corners: nextCorners,
        });
      } else if (drag.kind === 'rotate') {
        const curAngle = Math.atan2(py - drag.center.y, px - drag.center.x);
        let deltaDeg = ((curAngle - drag.startAngle) * 180) / Math.PI;
        let nextRot = drag.startRot + deltaDeg;
        if (e.shiftKey) {
          nextRot = Math.round(nextRot / 15) * 15;
        } else {
          nextRot = Math.round(nextRot * 10) / 10;
        }
        onChangeTransformParams({ ...transformSession.params, rotation: nextRot });
      } else if (drag.kind === 'pivot') {
        const nextPivX = unclamped.x - (drag.startParams.x - drag.startParams.baseX);
        const nextPivY = unclamped.y - (drag.startParams.y - drag.startParams.baseY);
        onChangeTransformParams({
          ...transformSession.params,
          pivotPreset: 'custom',
          pivotX: nextPivX,
          pivotY: nextPivY,
        });
      } else if (drag.kind === 'warp_center') {
        const dx = (unclamped.x - drag.startMouse.x) / Math.max(8, drag.startParams.baseWidth);
        const dy = (unclamped.y - drag.startMouse.y) / Math.max(8, drag.startParams.baseHeight);
        onChangeTransformParams({
          ...transformSession.params,
          warpBendX: Math.max(-1, Math.min(1, drag.startParams.warpBendX + dx)),
          warpBendY: Math.max(-1, Math.min(1, drag.startParams.warpBendY + dy)),
        });
      } else if (drag.kind === 'handle') {
        const sp = drag.startParams;
        const dx = unclamped.x - drag.startMouse.x;
        const dy = unclamped.y - drag.startMouse.y;

        if (sp.mode === 'distort' || sp.mode === 'perspective' || sp.mode === 'warp' || e.ctrlKey) {
          const nextMode = e.ctrlKey && sp.mode === 'free' ? 'distort' : sp.mode;
          const nextCorners = sp.corners.map((c) => ({ ...c })) as [
            { x: number; y: number },
            { x: number; y: number },
            { x: number; y: number },
            { x: number; y: number },
          ];
          if (drag.handleIdx < 4) {
            nextCorners[drag.handleIdx] = {
              x: sp.corners[drag.handleIdx].x + dx,
              y: sp.corners[drag.handleIdx].y + dy,
            };
            if (sp.mode === 'perspective') {
              // Mirror opposing edge horizontally/vertically when Shift held or symmetrically in perspective
              const opp = drag.handleIdx === 0 ? 1 : drag.handleIdx === 1 ? 0 : drag.handleIdx === 2 ? 3 : 2;
              nextCorners[opp] = {
                x: sp.corners[opp].x - dx,
                y: sp.corners[opp].y + dy,
              };
            }
          }
          onChangeTransformParams({ ...sp, mode: nextMode, corners: nextCorners });
        } else if (sp.mode === 'skew') {
          const nextSkewX = Math.max(-75, Math.min(75, Math.round(sp.skewX + dx * 2)));
          const nextSkewY = Math.max(-75, Math.min(75, Math.round(sp.skewY + dy * 2)));
          onChangeTransformParams({ ...sp, skewX: nextSkewX, skewY: nextSkewY });
        } else {
          // Scale handles (nw, n, ne, e, se, s, sw, w)
          let nextW = sp.width;
          let nextH = sp.height;
          let nextX = sp.x;
          let nextY = sp.y;
          const role = drag.handleRole;
          const mult = e.altKey ? 2 : 1;

          if (role.includes('e')) {
            const rawRight = sp.x + Math.max(1, sp.width + dx * mult);
            const snappedEdge = applyGuideSnap(rawRight, sp.y, e.altKey);
            nextW = Math.max(1, snappedEdge.x - sp.x);
          }
          if (role.includes('s')) {
            const rawBottom = sp.y + Math.max(1, sp.height + dy * mult);
            const snappedEdge = applyGuideSnap(sp.x, rawBottom, e.altKey);
            nextH = Math.max(1, snappedEdge.y - sp.y);
          }
          if (role.includes('w')) {
            const rawLeft = sp.x + dx * mult;
            const snappedEdge = applyGuideSnap(rawLeft, sp.y, e.altKey);
            const rightEdge = sp.x + sp.width;
            nextW = Math.max(1, rightEdge - snappedEdge.x);
            if (!e.altKey) nextX = rightEdge - nextW;
          }
          if (role.includes('n')) {
            const rawTop = sp.y + dy * mult;
            const snappedEdge = applyGuideSnap(sp.x, rawTop, e.altKey);
            const bottomEdge = sp.y + sp.height;
            nextH = Math.max(1, bottomEdge - snappedEdge.y);
            if (!e.altKey) nextY = bottomEdge - nextH;
          }

          if (e.shiftKey) {
            const ratio = Math.max(nextW / Math.max(1, sp.baseWidth), nextH / Math.max(1, sp.baseHeight));
            nextW = Math.max(1, Math.round(sp.baseWidth * ratio));
            nextH = Math.max(1, Math.round(sp.baseHeight * ratio));
          }

          let scaleX = Math.round((nextW / Math.max(1, sp.baseWidth)) * 1000) / 10;
          let scaleY = Math.round((nextH / Math.max(1, sp.baseHeight)) * 1000) / 10;
          if (sp.integerScale) {
            const ix = Math.max(1, Math.round(scaleX / 100));
            const iy = Math.max(1, Math.round(scaleY / 100));
            scaleX = ix * 100;
            scaleY = iy * 100;
            nextW = sp.baseWidth * ix;
            nextH = sp.baseHeight * iy;
          }
          onChangeTransformParams({
            ...sp,
            x: Math.round(nextX),
            y: Math.round(nextY),
            width: Math.round(nextW),
            height: Math.round(nextH),
            scaleX,
            scaleY,
          });
        }
      }
      return;
    }

    // Vector Marquee Dragging (direct_select)
    if (activeTool === 'direct_select' && vectorMarquee && coords) {
      setVectorMarquee({ ...vectorMarquee, endX: coords.x, endY: coords.y });
      return;
    }

    // Vector Line / Curve / Selection Interactive Dragging
    if (
      ['line', 'move', 'direct_select'].includes(effTool) &&
      vectorDragRef.current &&
      onUpdateLayerVectorPaths &&
      vectorConfig &&
      currentLayer.vectorPaths
    ) {
      const drag = vectorDragRef.current;
      const curGrid = rawCoords || coords;
      if (!curGrid) return;
      const paths = currentLayer.vectorPaths;
      const allNodes = paths.flatMap((p) => p.nodes);
      const vecSnapped = snapVectorCoord(curGrid, vectorConfig.snap, width, height, allNodes);
      const snapped = applyGuideSnap(
        vecSnapped.x,
        vecSnapped.y,
        e.altKey,
        drag.kind === 'node' || drag.kind === 'whole_path' ? drag.startGrid : null
      );

      if (drag.kind === 'whole_path') {
        const dx = snapped.x - drag.startGrid.x;
        const dy = snapped.y - drag.startGrid.y;
        const nextPaths = paths.map((p) => {
          if (p.id !== drag.pathId) return p;
          return {
            ...p,
            nodes: drag.origNodes.map((orig) => ({
              ...orig,
              x: orig.x + dx,
              y: orig.y + dy,
              inHandleX: orig.inHandleX !== undefined ? orig.inHandleX + dx : undefined,
              inHandleY: orig.inHandleY !== undefined ? orig.inHandleY + dy : undefined,
              outHandleX: orig.outHandleX !== undefined ? orig.outHandleX + dx : undefined,
              outHandleY: orig.outHandleY !== undefined ? orig.outHandleY + dy : undefined,
            })),
          };
        });
        onUpdateLayerVectorPaths(nextPaths);
      } else if (drag.kind === 'node' && selectedVectorPathId) {
        const dx = snapped.x - drag.startGrid.x;
        const dy = snapped.y - drag.startGrid.y;
        const nextPaths = paths.map((p) => {
          if (p.id !== selectedVectorPathId) return p;
          return {
            ...p,
            nodes: p.nodes.map((n) => {
              const orig = drag.origNodes.get(n.id);
              if (!orig) return n;
              return {
                ...n,
                x: orig.x + dx,
                y: orig.y + dy,
                inHandleX: orig.inHandleX !== undefined ? orig.inHandleX + dx : undefined,
                inHandleY: orig.inHandleY !== undefined ? orig.inHandleY + dy : undefined,
                outHandleX: orig.outHandleX !== undefined ? orig.outHandleX + dx : undefined,
                outHandleY: orig.outHandleY !== undefined ? orig.outHandleY + dy : undefined,
              };
            }),
          };
        });
        onUpdateLayerVectorPaths(nextPaths);
      } else if (drag.kind === 'handle' && selectedVectorPathId) {
        const nextPaths = paths.map((p) => {
          if (p.id !== selectedVectorPathId) return p;
          return {
            ...p,
            nodes: p.nodes.map((n) =>
              n.id === drag.nodeId
                ? moveHandleWithConstraint(n, drag.handleKind, curGrid.x, curGrid.y, e.altKey)
                : n
            ),
          };
        });
        onUpdateLayerVectorPaths(nextPaths);
      } else if (drag.kind === 'segment_bend' && selectedVectorPathId) {
        const dx = curGrid.x - drag.lastGrid.x;
        const dy = curGrid.y - drag.lastGrid.y;
        if (dx !== 0 || dy !== 0) {
          drag.lastGrid = curGrid;
          const nextPaths = paths.map((p) =>
            p.id === selectedVectorPathId ? bendSegmentByDelta(p, drag.segIndex, dx, dy) : p
          );
          onUpdateLayerVectorPaths(nextPaths);
        }
      } else if (drag.kind === 'new_straight') {
        const nextPaths = paths.map((p) => {
          if (p.id !== drag.pathId || p.nodes.length < 2) return p;
          const updatedNodes = [...p.nodes];
          updatedNodes[updatedNodes.length - 1] = {
            ...updatedNodes[updatedNodes.length - 1],
            x: snapped.x,
            y: snapped.y,
          };
          return { ...p, nodes: updatedNodes };
        });
        onUpdateLayerVectorPaths(nextPaths);
      } else if (drag.kind === 'new_bezier_handle') {
        const nextPaths = paths.map((p) => {
          if (p.id !== drag.pathId) return p;
          return {
            ...p,
            nodes: p.nodes.map((n) =>
              n.id === drag.nodeId
                ? moveHandleWithConstraint(n, 'out', curGrid.x, curGrid.y, e.altKey)
                : n
            ),
          };
        });
        onUpdateLayerVectorPaths(nextPaths);
      } else if (drag.kind === 'freehand') {
        const lastRaw = drag.rawPts[drag.rawPts.length - 1];
        if (!lastRaw || Math.hypot(curGrid.x - lastRaw.x, curGrid.y - lastRaw.y) >= 2.2) {
          const rawP = e.pointerType === 'pen' && vectorConfig.penPressureEnabled ? Math.max(0.25, e.pressure || 0.7) : 1;
          const w = Math.max(1, Math.round(vectorConfig.strokeWidth * rawP));
          drag.rawPts.push({ x: curGrid.x, y: curGrid.y, width: w });
          const nextNodes: VectorNode[] = drag.rawPts.map((rp, idx) => ({
            id: `vnode-fh-${idx}`,
            x: rp.x,
            y: rp.y,
            nodeType: 'smooth',
            width: rp.width,
          }));
          const nextPaths = paths.map((p) => (p.id === drag.pathId ? { ...p, nodes: nextNodes } : p));
          onUpdateLayerVectorPaths(nextPaths);
        }
      }
      return;
    }

    // Pro Eyedropper Live Hover Loupe + Delta Preview (O(1) tiled fast path for giant canvases)
    if (activeTool === 'eyedropper' && coords && containerRef.current) {
      const cRect = containerRef.current.getBoundingClientRect();
      setEyedropperScreenPos({
        x: e.clientX - cRect.left,
        y: e.clientY - cRect.top,
      });

      const isTiledEyedropper = isFrameTiled(currentFrame);
      const readTiledAt = (gx: number, gy: number): string | null => {
        if (gx < 0 || gx >= width || gy < 0 || gy >= height) return null;
        if (effEyedropperConfig.layerScope === 'current') {
          return (
            getTiledStore(currentLayer.tiledStoreId)?.getPixel(gx, gy) ??
            currentLayer.pixels[gy]?.[gx] ??
            null
          );
        }
        for (let li = currentFrame.layers.length - 1; li >= 0; li--) {
          const lyr = currentFrame.layers[li];
          if (!lyr.visible) continue;
          const c = lyr.tiledStoreId
            ? getTiledStore(lyr.tiledStoreId)?.getPixel(gx, gy) ?? null
            : lyr.pixels[gy]?.[gx] ?? null;
          if (c) return c;
        }
        return null;
      };

      const grid = isTiledEyedropper
        ? null
        : buildSamplingGridForEyedropper(
            currentFrame,
            currentLayer,
            width,
            height,
            effEyedropperConfig,
            layerGroups
          );

      if (grid) {
        const sample = sampleEyedropperAt(
          grid,
          coords.x,
          coords.y,
          width,
          height,
          effEyedropperConfig,
          activePaletteColors
        );
        setHoveredSample(sample);
        onSampledColorUpdate?.(sample);
      } else {
        const hex = readTiledAt(coords.x, coords.y);
        if (hex) {
          const sample = sampleEyedropperAt(
            [[hex]],
            0,
            0,
            1,
            1,
            effEyedropperConfig,
            activePaletteColors
          );
          setHoveredSample(sample);
          onSampledColorUpdate?.(sample);
        } else {
          setHoveredSample(null);
        }
      }

      const lCanvas = loupeCanvasRef.current;
      if (lCanvas) {
        const lctx = lCanvas.getContext('2d');
        if (lctx) {
          const z = effEyedropperConfig.loupeZoom || 8;
          const size = lCanvas.width;
          const cells = Math.max(3, Math.floor(size / z));
          const half = Math.floor(cells / 2);
          lctx.clearRect(0, 0, size, size);
          for (let dy = -half; dy <= half; dy++) {
            for (let dx = -half; dx <= half; dx++) {
              const gx = coords.x + dx;
              const gy = coords.y + dy;
              const px = (dx + half) * z;
              const py = (dy + half) * z;
              const col = grid
                ? gx >= 0 && gx < width && gy >= 0 && gy < height
                  ? grid[gy]?.[gx]
                  : null
                : readTiledAt(gx, gy);
              if (col) {
                lctx.fillStyle = col;
                lctx.fillRect(px, py, z, z);
              } else {
                lctx.fillStyle = (dx + dy) % 2 === 0 ? '#181e2c' : '#222a3d';
                lctx.fillRect(px, py, z, z);
              }
              lctx.strokeStyle = 'rgba(255,255,255,0.08)';
              lctx.lineWidth = 0.5;
              lctx.strokeRect(px, py, z, z);
            }
          }
          // Center reticle
          lctx.strokeStyle = '#fbbf24';
          lctx.lineWidth = 1.5;
          lctx.strokeRect(half * z, half * z, z, z);
        }
      }
    } else if (activeTool !== 'eyedropper' && eyedropperScreenPos) {
      setEyedropperScreenPos(null);
      setHoveredSample(null);
    }

    // Hover detection for Move tool
    if (coords && activeTool === 'move' && !isDraggingPivot && !draggingHitboxId && !isDraggingContent) {
      const distPivot = Math.hypot(coords.x - globalPivot.x, coords.y - globalPivot.y);
      setHoveredPivot(showPivot && distPivot <= 2.5);

      const hitboxes = currentFrame.hitboxes || [];
      const foundHb = [...hitboxes].reverse().find(
        (hb) => coords.x >= hb.x && coords.x < hb.x + hb.w && coords.y >= hb.y && coords.y < hb.y + hb.h
      );
      setHoveredHitboxId(showHitboxes && foundHb ? foundHb.id : null);
    } else if (!coords || activeTool !== 'move') {
      if (hoveredPivot) setHoveredPivot(false);
      if (hoveredHitboxId) setHoveredHitboxId(null);
    }

    // 0. Move Tool: Drag / Scale / Rotate Canvas Reference
    if (draggingReferenceId && refDragStartRef.current && onUpdateReference) {
      const st = refDragStartRef.current;
      if (st.kind === 'move') {
        const dxPx = Math.round((e.clientX - st.clientX) / Math.max(1, zoom));
        const dyPx = Math.round((e.clientY - st.clientY) / Math.max(1, zoom));
        const rawCenterX = width / 2 + st.origX + dxPx;
        const rawCenterY = height / 2 + st.origY + dyPx;
        const snappedCenter = applyGuideSnap(rawCenterX, rawCenterY, e.altKey);
        onUpdateReference(draggingReferenceId, {
          x: Math.round(snappedCenter.x - width / 2),
          y: Math.round(snappedCenter.y - height / 2),
        });
      } else if (st.kind === 'scale') {
        const curDist = Math.max(6, Math.hypot(e.clientX - st.centerClientX, e.clientY - st.centerClientY));
        const ratio = curDist / Math.max(10, st.origDist || 40);
        const nextScale = Math.max(0.15, Math.min(6, Number((st.origScale * ratio).toFixed(2))));
        onUpdateReference(draggingReferenceId, { scale: nextScale });
      } else if (st.kind === 'rotate') {
        const curAng = Math.atan2(e.clientY - st.centerClientY, e.clientX - st.centerClientX);
        let deg = Math.round(st.origRotation + ((curAng - (st.startAngle || 0)) * 180) / Math.PI);
        if (e.shiftKey) deg = Math.round(deg / 15) * 15;
        while (deg > 180) deg -= 360;
        while (deg < -180) deg += 360;
        onUpdateReference(draggingReferenceId, { rotation: deg });
      }
      return;
    }

    // 0.25 Move Selection Subtool: Live pixel + marquee translation
    if (selectionMoveRef.current && unclampedCoords) {
      const sm = selectionMoveRef.current;
      const rawDx = unclampedCoords.x - sm.startGrid.x;
      const rawDy = unclampedCoords.y - sm.startGrid.y;
      const minX = Math.min(sm.origSel.startX, sm.origSel.endX);
      const minY = Math.min(sm.origSel.startY, sm.origSel.endY);
      const selW = Math.abs(sm.origSel.endX - sm.origSel.startX) + 1;
      const selH = Math.abs(sm.origSel.endY - sm.origSel.startY) + 1;
      const snappedSel = applyBoundsGuideSnap(minX + rawDx, minY + rawDy, selW, selH, e.altKey);
      const dx = snappedSel.x - minX;
      const dy = snappedSel.y - minY;
      const nextGrid = sm.baseWithoutSel.map((row) => [...row]);
      for (const item of sm.extracted) {
        const tx = minX + item.dx + dx;
        const ty = minY + item.dy + dy;
        if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
          nextGrid[ty][tx] = item.color;
        }
      }
      draftPixelsRef.current = nextGrid;

      let shiftedMask: boolean[][] | undefined;
      if (sm.origSel.mask) {
        shiftedMask = Array.from({ length: height }, () => Array(width).fill(false));
        for (let py = 0; py < height; py++) {
          for (let px = 0; px < width; px++) {
            if (sm.origSel.mask[py]?.[px]) {
              const tx = px + dx;
              const ty = py + dy;
              if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
                shiftedMask[ty][tx] = true;
              }
            }
          }
        }
      }
      setSelection({
        ...sm.origSel,
        startX: sm.origSel.startX + dx,
        endX: sm.origSel.endX + dx,
        startY: sm.origSel.startY + dy,
        endY: sm.origSel.endY + dy,
        mask: shiftedMask,
      });
      renderCanvas();
      return;
    }

    // 1. Move Tool: Drag Pivot
    if (isDraggingPivot && unclampedCoords) {
      const snappedPiv = applyGuideSnap(unclampedCoords.x, unclampedCoords.y, e.altKey);
      onUpdatePivot({
        x: Math.max(0, Math.min(width - 1, snappedPiv.x)),
        y: Math.max(0, Math.min(height - 1, snappedPiv.y)),
      });
      return;
    }

    // 1.5 Dragging Text Bounding Box
    if (isDraggingTextBox && unclampedCoords) {
      const snappedTxt = applyGuideSnap(
        unclampedCoords.x - textDragOffsetRef.current.x,
        unclampedCoords.y - textDragOffsetRef.current.y,
        e.altKey
      );
      setTextAnchor({
        x: Math.max(0, Math.min(width - 4, snappedTxt.x)),
        y: Math.max(0, Math.min(height - 4, snappedTxt.y)),
      });
      return;
    }

    // 1.75 Resizing Selected Hitbox with 8 Handles
    if (resizingHitbox && unclampedCoords) {
      const { id, handle, orig, startGrid } = resizingHitbox;
      const snappedCur = applyGuideSnap(unclampedCoords.x, unclampedCoords.y, e.altKey);
      const dx = snappedCur.x - startGrid.x;
      const dy = snappedCur.y - startGrid.y;
      let nx = orig.x;
      let ny = orig.y;
      let nw = orig.w;
      let nh = orig.h;

      if (handle.includes('e')) {
        nw = Math.max(2, orig.w + dx);
      }
      if (handle.includes('s')) {
        nh = Math.max(2, orig.h + dy);
      }
      if (handle.includes('w')) {
        const rightEdge = orig.x + orig.w;
        nx = Math.min(rightEdge - 2, orig.x + dx);
        nw = rightEdge - nx;
      }
      if (handle.includes('n')) {
        const bottomEdge = orig.y + orig.h;
        ny = Math.min(bottomEdge - 2, orig.y + dy);
        nh = bottomEdge - ny;
      }

      onUpdateHitboxes(
        (currentFrame.hitboxes || []).map((hb) =>
          hb.id === id ? { ...hb, x: nx, y: ny, w: nw, h: nh } : hb
        )
      );
      return;
    }

    // 2. Move Tool: Drag Hitbox
    if (draggingHitboxId && unclampedCoords) {
      const updated = (currentFrame.hitboxes || []).map((hb) => {
        if (hb.id === draggingHitboxId) {
          const rawX = Math.max(-hb.w + 1, Math.min(width - 1, unclampedCoords.x - hitboxDragOffset.x));
          const rawY = Math.max(-hb.h + 1, Math.min(height - 1, unclampedCoords.y - hitboxDragOffset.y));
          const snappedHb = applyBoundsGuideSnap(rawX, rawY, hb.w, hb.h, e.altKey);
          return { ...hb, x: snappedHb.x, y: snappedHb.y };
        }
        return hb;
      });
      onUpdateHitboxes(updated);
      return;
    }

    // 3. Move Tool: Drag Layer Content (real-time live pixel preview with non-destructive off-canvas storage)
    if (isDraggingContent && unclampedCoords && contentDragStart && contentOriginalPixelsRef.current) {
      let dx = unclampedCoords.x - contentDragStart.x;
      let dy = unclampedCoords.y - contentDragStart.y;
      if (isGuideSnapEnabled && !e.altKey) {
        // Compute tight bounding box of layer content to snap edges/center cleanly to guides
        const origGrid = contentOriginalPixelsRef.current;
        let minPx = width;
        let maxPx = -1;
        let minPy = height;
        let maxPy = -1;
        for (let py = 0; py < height; py++) {
          const row = origGrid[py];
          if (!row) continue;
          for (let px = 0; px < width; px++) {
            if (row[px]) {
              if (px < minPx) minPx = px;
              if (px > maxPx) maxPx = px;
              if (py < minPy) minPy = py;
              if (py > maxPy) maxPy = py;
            }
          }
        }
        if (maxPx >= minPx && maxPy >= minPy) {
          const snappedBox = applyBoundsGuideSnap(
            minPx + dx,
            minPy + dy,
            maxPx - minPx + 1,
            maxPy - minPy + 1,
            e.altKey
          );
          dx = snappedBox.x - minPx;
          dy = snappedBox.y - minPy;
        }
      }
      lastContentDeltaRef.current = { dx, dy };

      const shifted = shiftLayerPixelsNonDestructive(
        contentOriginalPixelsRef.current,
        contentOriginalOffCanvasRef.current,
        dx,
        dy,
        width,
        height,
        Boolean(clipOutsideCanvas)
      );
      draftPixelsRef.current = shifted.pixels;
      draftOffCanvasRef.current = shifted.offCanvasPixels;
      renderCanvas();
      return;
    }

    // 4. Freehand Lasso Tool
    if (effTool === 'lasso' && isDrawing && coords) {
      const last = lassoSites[lassoSites.length - 1];
      if (!last || last.x !== coords.x || last.y !== coords.y) {
        setLassoSites((prev) => [...prev, coords]);
        renderCanvas();
      }
      return;
    }

    if (!isDrawing || !coords) return;

    if (effTool === 'select' && dragStartPoint) {
      const snappedEnd = applyGuideSnap(coords.x, coords.y, e.altKey);
      let endX = Math.max(0, Math.min(width - 1, snappedEnd.x));
      let endY = Math.max(0, Math.min(height - 1, snappedEnd.y));
      if (
        e.shiftKey ||
        (marqueeShape === 'ellipse' && selectionOptions.perfectCircle) ||
        (marqueeShape === 'rect' && selectionOptions.fixedRatio)
      ) {
        const rw = marqueeShape === 'rect' && selectionOptions.fixedRatio ? Math.max(1, selectionOptions.ratioW) : 1;
        const rh = marqueeShape === 'rect' && selectionOptions.fixedRatio ? Math.max(1, selectionOptions.ratioH) : 1;
        const dxAbs = Math.abs(endX - dragStartPoint.x);
        const dyAbs = Math.abs(endY - dragStartPoint.y);
        const unit = Math.max(dxAbs / rw, dyAbs / rh);
        endX = Math.max(0, Math.min(width - 1, Math.round(dragStartPoint.x + (endX >= dragStartPoint.x ? unit * rw : -unit * rw))));
        endY = Math.max(0, Math.min(height - 1, Math.round(dragStartPoint.y + (endY >= dragStartPoint.y ? unit * rh : -unit * rh))));
      }
      const effOp = e.altKey ? 'subtract' : e.shiftKey ? 'add' : selectionOptions.opMode;
      const incomingMask = buildSelectionMaskFromShape(
        dragStartPoint.x,
        dragStartPoint.y,
        endX,
        endY,
        width,
        height,
        marqueeShape,
        marqueeShape === 'rect' && selectionOptions.roundedCorners,
        selectionOptions.cornerRadius
      );
      if (effOp === 'replace' && marqueeShape === 'rect' && !selectionOptions.roundedCorners) {
        setSelection({
          active: true,
          startX: dragStartPoint.x,
          startY: dragStartPoint.y,
          endX,
          endY,
          shape: 'rect',
        });
      } else {
        setSelection(
          combineSelectionMasks(
            prevSelectionBeforeDragRef.current,
            incomingMask,
            width,
            height,
            effOp,
            marqueeShape
          )
        );
      }
      renderCanvas();
      return;
    }

    if (activeTool === 'hitbox') {
      renderCanvas();
      return;
    }

    // Live Gradient / Dithered Gradient drag preview (Shift snaps to 45° increments)
    if (activeTool === 'bucket' && gradientDrag && isDrawing) {
      let gx1 = coords.x;
      let gy1 = coords.y;
      if (e.shiftKey) {
        const dx = coords.x - gradientDrag.start.x;
        const dy = coords.y - gradientDrag.start.y;
        const dist = Math.hypot(dx, dy);
        const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
        gx1 = Math.max(0, Math.min(width - 1, Math.round(gradientDrag.start.x + Math.cos(angle) * dist)));
        gy1 = Math.max(0, Math.min(height - 1, Math.round(gradientDrag.start.y + Math.sin(angle) * dist)));
      }
      setGradientDrag({ start: gradientDrag.start, end: { x: gx1, y: gy1 } });
      draftPixelsRef.current = currentLayer.pixels.map((r) => [...r]);
      renderGradientToGrid(
        draftPixelsRef.current,
        currentLayer.pixels,
        gradientDrag.start.x,
        gradientDrag.start.y,
        gx1,
        gy1,
        gradientConfig,
        bucketSubTool === 'dither_gradient',
        primaryColor,
        secondaryColor,
        {
          selection,
          lockTransparency: currentLayer.lockTransparency,
          activePaletteColors,
          customMatrix: effDitherConfig.customMatrix,
        }
      );
      renderCanvas();
      return;
    }

    if (activeTool === 'shading' || (activeTool === 'pencil' && Boolean(brushSettings.celShadeEnabled) && !isPaintingMaskRef.current)) {
      const shouldLighten = e.shiftKey || brushSettings.celShadeMode === 'lighten';
      applyShadePoint(coords.x, coords.y, draftPixelsRef.current, shouldLighten);
      renderCanvas();
      return;
    }

    if ((activeTool === 'smear' || (activeTool === 'pencil' && Boolean(brushSettings.smearEnabled) && !isPaintingMaskRef.current)) && lastDrawnPoint) {
      const smearRadius = Math.max(1, Math.round((brushSettings.size || brushSize) * ((brushSettings.smearStrength ?? 65) / 65)));
      const beforeGrid = effDitherConfig.enabled ? draftPixelsRef.current.map((r) => [...r]) : null;
      applySmear(lastDrawnPoint.x, lastDrawnPoint.y, coords.x, coords.y, draftPixelsRef.current, smearRadius + 1);
      if (beforeGrid && effDitherConfig.enabled) {
        for (let py = 0; py < height; py++) {
          for (let px = 0; px < width; px++) {
            if (draftPixelsRef.current[py][px] !== beforeGrid[py][px]) {
              const thr = evaluateDitherThreshold(px, py, effDitherConfig);
              const pass = effDitherConfig.invert
                ? effDitherConfig.density / 100 < thr
                : effDitherConfig.density / 100 >= thr;
              if (!pass) draftPixelsRef.current[py][px] = beforeGrid[py][px];
            }
          }
        }
      }
      setLastDrawnPoint(coords);
      renderCanvas();
      return;
    }

    if (activeTool === 'line' || activeTool === 'rectangle' || activeTool === 'circle') {
      if (dragStartPoint) {
        draftPixelsRef.current = currentLayer.pixels.map((r) => [...r]);
        if (activeTool === 'line') {
          const snappedLineEnd = applyGuideSnap(coords.x, coords.y, e.altKey, dragStartPoint);
          const lineEndX = Math.round(snappedLineEnd.x);
          const lineEndY = Math.round(snappedLineEnd.y);
          const segs =
            effSymmetry.enabled && effSymmetry.mode !== 'none'
              ? computeSymmetricSegments(dragStartPoint.x, dragStartPoint.y, lineEndX, lineEndY, effSymmetry)
              : [{ x0: dragStartPoint.x, y0: dragStartPoint.y, x1: lineEndX, y1: lineEndY }];
          for (const seg of segs) {
            drawAdvancedLine(
              seg.x0,
              seg.y0,
              seg.x1,
              seg.y1,
              primaryColor,
              draftPixelsRef.current,
              brushSettings.size || brushSize,
              brushSettings.shape,
              Math.max(0.05, Math.min(1, brushSettings.opacity * primaryAlpha)),
              brushSettings.hardness,
              brushSettings.spacing,
              brushSettings.jitterPosition
            );
          }
        } else if (activeTool === 'rectangle' || activeTool === 'circle') {
          const snappedShapeEnd = applyGuideSnap(coords.x, coords.y, e.altKey, dragStartPoint);
          let endX = snappedShapeEnd.x;
          let endY = snappedShapeEnd.y;
          // Shift constrains 1:1 perfect square / circle / regular polygon / star
          if (e.shiftKey) {
            const side = Math.max(Math.abs(endX - dragStartPoint.x), Math.abs(endY - dragStartPoint.y));
            endX = dragStartPoint.x + (endX >= dragStartPoint.x ? side : -side);
            endY = dragStartPoint.y + (endY >= dragStartPoint.y ? side : -side);
          }
          const kind = activeTool === 'circle' ? 'ellipse' : shapeConfig.shapeKind;
          const shapeOpacity = Math.max(
            0.05,
            Math.min(1, (shapeConfig.opacity ?? 1) * primaryAlpha)
          );
          const draftObj = createParametricShapeFromDrag(
            kind,
            dragStartPoint.x,
            dragStartPoint.y,
            endX,
            endY,
            shapeConfig,
            primaryColor,
            secondaryColor,
            shapeOpacity
          );
          creatingShapeDraftRef.current = draftObj;
          setCreatingShapeDraft(draftObj);
          // Clear draftPixelsRef so renderCanvas renders purely from creatingShapeDraftRef without duplicating
          draftPixelsRef.current = [];
          renderCanvas();
          return;
        }
        if (currentLayer.lockTransparency) {
          draftPixelsRef.current = applyTransparencyLock(currentLayer.pixels, draftPixelsRef.current);
        }
        renderCanvas();
      }
      return;
    }

    if (activeTool === 'tile' && isDrawing && draftTileMapRef.current) {
      const tileSz = Math.max(4, tileToolConfig.tileSize || 16);
      const tx = Math.floor(coords.x / tileSz);
      const ty = Math.floor(coords.y / tileSz);
      const activeKey = activeTileset && activeTileItem ? `${activeTileset.id}:${activeTileItem.id}` : '';

      if (tileToolConfig.paintMode === 'area' && tileDragStartCellRef.current) {
        const baseGrid =
          currentLayer.pixels.length > 0
            ? currentLayer.pixels.map((r) => [...r])
            : createEmptyGrid(width, height);
        const nextMap: Record<string, string> = { ...(currentLayer.tileMapData || {}) };
        const minTx = Math.min(tileDragStartCellRef.current.tx, tx);
        const maxTx = Math.max(tileDragStartCellRef.current.tx, tx);
        const minTy = Math.min(tileDragStartCellRef.current.ty, ty);
        const maxTy = Math.max(tileDragStartCellRef.current.ty, ty);

        for (let cy = minTy; cy <= maxTy; cy++) {
          for (let cx = minTx; cx <= maxTx; cx++) {
            const cKey = `${cx},${cy}`;
            if (tileToolConfig.mode === 'erase') {
              delete nextMap[cKey];
              clearTileCellOnGrid(baseGrid, cx, cy, tileSz, width, height);
            } else if (activeTileItem && activeKey) {
              nextMap[cKey] = activeKey;
              if (!tileToolConfig.autotile) {
                stampTilePixelsOntoGrid(baseGrid, cx, cy, tileSz, activeTileItem.pixels, width, height);
              }
            }
          }
        }
        if (tileToolConfig.autotile) {
          for (let cy = minTy; cy <= maxTy; cy++) {
            for (let cx = minTx; cx <= maxTx; cx++) {
              updateAutotileAroundCell(baseGrid, nextMap, cx, cy, tileSz, width, height, findTileByKey);
            }
          }
        }
        draftPixelsRef.current = baseGrid;
        draftTileMapRef.current = nextMap;
        tileLastCellRef.current = { tx, ty };
        renderCanvas();
        return;
      }

      if (
        (tileToolConfig.continuousDraw || tileToolConfig.autoRepeat || tileToolConfig.paintMode === 'repeat') &&
        tileToolConfig.mode !== 'place' &&
        tileLastCellRef.current &&
        (tileLastCellRef.current.tx !== tx || tileLastCellRef.current.ty !== ty)
      ) {
        let cx0 = tileLastCellRef.current.tx;
        let cy0 = tileLastCellRef.current.ty;
        const dx = Math.abs(tx - cx0);
        const dy = Math.abs(ty - cy0);
        const sx = cx0 < tx ? 1 : -1;
        const sy = cy0 < ty ? 1 : -1;
        let err = dx - dy;

        while (true) {
          const cKey = `${cx0},${cy0}`;
          if (tileToolConfig.mode === 'erase') {
            delete draftTileMapRef.current[cKey];
            clearTileCellOnGrid(draftPixelsRef.current, cx0, cy0, tileSz, width, height);
            if (tileToolConfig.autotile) {
              updateAutotileAroundCell(draftPixelsRef.current, draftTileMapRef.current, cx0, cy0, tileSz, width, height, findTileByKey);
            }
          } else if (activeTileItem && activeKey) {
            draftTileMapRef.current[cKey] = activeKey;
            if (tileToolConfig.autotile) {
              updateAutotileAroundCell(draftPixelsRef.current, draftTileMapRef.current, cx0, cy0, tileSz, width, height, findTileByKey);
            } else {
              stampTilePixelsOntoGrid(draftPixelsRef.current, cx0, cy0, tileSz, activeTileItem.pixels, width, height);
            }
          }
          if (cx0 === tx && cy0 === ty) break;
          const e2 = 2 * err;
          if (e2 > -dy) { err -= dy; cx0 += sx; }
          if (e2 < dx) { err += dx; cy0 += sy; }
        }
        tileLastCellRef.current = { tx, ty };
        renderCanvas();
        return;
      }
      return;
    }

    if (lastDrawnPoint) {
      strokeHistoryRef.current.push(coords);
      const strokeLen = strokeHistoryRef.current.length;
      const { rawPressure, pointerType, effectiveSize, totalOpacity } = getPointerStrokeMetrics(e, strokeLen);
      setLivePressureInfo({ pressure: rawPressure, pointerType, size: effectiveSize });

      if (isPaintingMaskRef.current && currentLayer.mask) {
        const clean = primaryColor.replace('#', '');
        let maskVal = 255;
        if (activeTool === 'eraser') maskVal = 0;
        else if (clean.length === 6) {
          const r = parseInt(clean.slice(0, 2), 16);
          const g = parseInt(clean.slice(2, 4), 16);
          const b = parseInt(clean.slice(4, 6), 16);
          if (r === g && g === b) maskVal = r;
        }
        const stamps = getBrushStampOffsets(effectiveSize, brushSettings.shape);
        const drawMaskSeg = (x0: number, y0: number, x1: number, y1: number) => {
          let cx0 = x0;
          let cy0 = y0;
          const dx = Math.abs(x1 - x0);
          const dy = Math.abs(y1 - y0);
          const sx = x0 < x1 ? 1 : -1;
          const sy = y0 < y1 ? 1 : -1;
          let err = dx - dy;
          while (true) {
            for (const { dx: ox, dy: oy } of stamps) {
              const px = cx0 + ox;
              const py = cy0 + oy;
              if (px >= 0 && px < width && py >= 0 && py < height && draftMaskRef.current[py]) {
                draftMaskRef.current[py][px] = maskVal;
              }
            }
            if (cx0 === x1 && cy0 === y1) break;
            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; cx0 += sx; }
            if (e2 < dx) { err += dx; cy0 += sy; }
          }
        };
        const maskSegs =
          effSymmetry.enabled && effSymmetry.mode !== 'none'
            ? computeSymmetricSegments(lastDrawnPoint.x, lastDrawnPoint.y, coords.x, coords.y, effSymmetry)
            : [{ x0: lastDrawnPoint.x, y0: lastDrawnPoint.y, x1: coords.x, y1: coords.y }];
        for (const seg of maskSegs) {
          drawMaskSeg(seg.x0, seg.y0, seg.x1, seg.y1);
        }
        setLastDrawnPoint(coords);
        renderCanvas();
        return;
      }

      const colorToApply = effTool === 'eraser' ? null : primaryColor;
      if (draftTiledStoreRef.current) {
        const strokeSegs =
          effSymmetry.enabled && effSymmetry.mode !== 'none'
            ? computeSymmetricSegments(lastDrawnPoint.x, lastDrawnPoint.y, coords.x, coords.y, effSymmetry)
            : [{ x0: lastDrawnPoint.x, y0: lastDrawnPoint.y, x1: coords.x, y1: coords.y }];
        for (const seg of strokeSegs) {
          draftTiledStoreRef.current.drawLine(
            seg.x0,
            seg.y0,
            seg.x1,
            seg.y1,
            colorToApply,
            effectiveSize
          );
        }
        setLastDrawnPoint(coords);
        renderCanvas();
        return;
      }

      const usePixelByPixelModifiers =
        effTool === 'dither' ||
        (effTool === 'pencil' &&
          (Boolean(effDitherConfig.enabled) ||
            Boolean(brushSettings.airbrushMode) ||
            brushSettings.shape === 'spray' ||
            (brushSettings.texture && brushSettings.texture !== 'none') ||
            (brushSettings.flow ?? 1) < 0.99));

      if (usePixelByPixelModifiers) {
        let cx0 = lastDrawnPoint.x;
        let cy0 = lastDrawnPoint.y;
        const dx = Math.abs(coords.x - cx0);
        const dy = Math.abs(coords.y - cy0);
        const sx = cx0 < coords.x ? 1 : -1;
        const sy = cy0 < coords.y ? 1 : -1;
        let err = dx - dy;
        while (true) {
          applyPointDraw(cx0, cy0, draftPixelsRef.current, effectiveSize, totalOpacity);
          if (cx0 === coords.x && cy0 === coords.y) break;
          const e2 = 2 * err;
          if (e2 > -dy) { err -= dy; cx0 += sx; }
          if (e2 < dx) { err += dx; cy0 += sy; }
        }
      } else if (!(effTool === 'eraser' && currentLayer.lockTransparency)) {
        const strokeSegs =
          effSymmetry.enabled && effSymmetry.mode !== 'none'
            ? computeSymmetricSegments(lastDrawnPoint.x, lastDrawnPoint.y, coords.x, coords.y, effSymmetry)
            : [{ x0: lastDrawnPoint.x, y0: lastDrawnPoint.y, x1: coords.x, y1: coords.y }];
        for (const seg of strokeSegs) {
          drawAdvancedLine(
            seg.x0,
            seg.y0,
            seg.x1,
            seg.y1,
            colorToApply,
            draftPixelsRef.current,
            effectiveSize,
            effTool === 'eraser' ? eraserOptions.shape : brushSettings.shape,
            effTool === 'eraser'
              ? Math.max(0.05, Math.min(1, eraserOptions.opacity * eraserOptions.flow))
              : totalOpacity,
            effTool === 'eraser' ? Math.max(0, Math.min(1, eraserOptions.hardness / 100)) : brushSettings.hardness,
            brushSettings.spacing,
            brushSettings.jitterPosition
          );
        }
        if (currentLayer.lockTransparency) {
          draftPixelsRef.current = applyTransparencyLock(currentLayer.pixels, draftPixelsRef.current);
        }
      }
      setLastDrawnPoint(coords);
      renderCanvas();
    }
  };

  const handleMouseUp = () => {
    setLivePressureInfo(null);
    smoothedCoordRef.current = null;
    setSnappedGuideIds((prev) => (prev.xId || prev.yId ? { xId: null, yId: null } : prev));

    // Commit Zoom (Lupa) click or marquee region zoom
    if (zoomRegionDrag) {
      const drag = zoomRegionDrag;
      setZoomRegionDrag(null);
      const distPx = Math.hypot(drag.endClientX - drag.startClientX, drag.endClientY - drag.startClientY);
      if (distPx >= 8 && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const minX = Math.min(drag.startGrid.x, drag.endGrid.x);
        const maxX = Math.max(drag.startGrid.x, drag.endGrid.x);
        const minY = Math.min(drag.startGrid.y, drag.endGrid.y);
        const maxY = Math.max(drag.startGrid.y, drag.endGrid.y);
        const regionW = Math.max(1, maxX - minX + 1);
        const regionH = Math.max(1, maxY - minY + 1);
        const targetZoom = Math.max(
          1,
          Math.min(
            96,
            Math.floor(Math.min((rect.width - 80) / regionW, (rect.height - 80) / regionH))
          )
        );
        const centerGridX = (minX + maxX + 1) / 2;
        const centerGridY = (minY + maxY + 1) / 2;
        setZoom(targetZoom);
        setPan({
          x: rect.width / 2 - centerGridX * targetZoom,
          y: rect.height / 2 - centerGridY * targetZoom,
        });
      } else {
        const zoomingOut = drag.altKey || zoomToolMode === 'out';
        const nextZoom = zoomingOut
          ? zoom <= 12
            ? Math.max(1, zoom - 2)
            : Math.max(1, Math.round(zoom / 1.35))
          : zoom < 12
          ? Math.min(96, zoom + 2)
          : Math.min(96, Math.round(zoom * 1.35));
        zoomAtClientPoint(nextZoom, drag.startClientX, drag.startClientY);
      }
      return;
    }

    // Commit Gradient / Dithered Gradient drag
    if (gradientDrag) {
      setGradientDrag(null);
      setIsDrawing(false);
      if (draftPixelsRef.current.length > 0) {
        const finalGrid = currentLayer.lockTransparency
          ? applyTransparencyLock(currentLayer.pixels, draftPixelsRef.current)
          : draftPixelsRef.current;
        onUpdateLayerPixels(finalGrid, currentLayer.offCanvasPixels);
        draftPixelsRef.current = [];
      }
      setDragStartPoint(null);
      return;
    }

    if (symHandleDragRef.current) {
      symHandleDragRef.current = null;
      return;
    }
    // Commit Parametric Shape live handle drag
    if (shapeDragRef.current) {
      const committed = shapeLiveOverrideRef.current;
      const draggedId = shapeDragRef.current.shapeId;
      shapeDragRef.current = null;
      shapeLiveOverrideRef.current = null;
      if (committed && onUpdateLayerParametricShapes) {
        const nextShapes = (currentLayer.parametricShapes || []).map((s) =>
          s.id === draggedId ? committed : s
        );
        onUpdateLayerParametricShapes(nextShapes);
        if (onChangeShapeConfig) {
          onChangeShapeConfig(syncShapeConfigFromObject(shapeConfig, committed));
        }
      }
      renderCanvas();
      return;
    }
    if (transformDragRef.current) {
      transformDragRef.current = null;
      return;
    }
    if (vectorMarquee && currentLayer.vectorPaths) {
      const minX = Math.min(vectorMarquee.startX, vectorMarquee.endX);
      const maxX = Math.max(vectorMarquee.startX, vectorMarquee.endX);
      const minY = Math.min(vectorMarquee.startY, vectorMarquee.endY);
      const maxY = Math.max(vectorMarquee.startY, vectorMarquee.endY);
      const targetPath =
        currentLayer.vectorPaths.find((p) => p.id === selectedVectorPathId) ||
        currentLayer.vectorPaths.find((p) =>
          p.nodes.some((n) => n.x >= minX && n.x <= maxX && n.y >= minY && n.y <= maxY)
        );
      if (targetPath) {
        onSelectVectorPathId?.(targetPath.id);
        const insideIds = targetPath.nodes
          .filter((n) => n.x >= minX && n.x <= maxX && n.y >= minY && n.y <= maxY)
          .map((n) => n.id);
        onSelectVectorNodeIds?.(insideIds);
      } else {
        onSelectVectorNodeIds?.([]);
      }
      setVectorMarquee(null);
      return;
    }
    if (vectorDragRef.current) {
      vectorDragRef.current = null;
      return;
    }
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    // Release Move Tool interactions
    if (selectionMoveRef.current) {
      selectionMoveRef.current = null;
      if (draftPixelsRef.current.length > 0) {
        onUpdateLayerPixels(draftPixelsRef.current, currentLayer.offCanvasPixels);
        draftPixelsRef.current = [];
      }
      return;
    }

    if (draggingReferenceId) {
      setDraggingReferenceId(null);
      refDragStartRef.current = null;
      return;
    }

    if (isDraggingTextBox) {
      setIsDraggingTextBox(false);
      return;
    }

    if (resizingHitbox) {
      setResizingHitbox(null);
      return;
    }

    if (isDraggingPivot) {
      setIsDraggingPivot(false);
      return;
    }

    if (draggingHitboxId) {
      setDraggingHitboxId(null);
      return;
    }

    if (isDraggingContent) {
      setIsDraggingContent(false);
      setContentDragStart(null);
      const { dx, dy } = lastContentDeltaRef.current;
      if (linkMoveAllFrames && onShiftAllFramesLayer && (dx !== 0 || dy !== 0)) {
        onShiftAllFramesLayer(dx, dy);
        draftPixelsRef.current = [];
        draftOffCanvasRef.current = undefined;
      } else if (draftPixelsRef.current.length > 0) {
        onUpdateLayerPixels(draftPixelsRef.current, draftOffCanvasRef.current);
        draftPixelsRef.current = [];
        draftOffCanvasRef.current = undefined;
      }
      lastContentDeltaRef.current = { dx: 0, dy: 0 };
      contentOriginalPixelsRef.current = null;
      contentOriginalOffCanvasRef.current = undefined;
      return;
    }

    // Finalize Freehand Lasso with full pixel polygon mask
    if (effTool === 'lasso' && lassoMode === 'free' && lassoSites.length >= 2) {
      setIsDrawing(false);
      let minX = width - 1, maxX = 0, minY = height - 1, maxY = 0;
      const mask: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));
      if (lassoSites.length >= 3) {
        for (let py = 0; py < height; py++) {
          for (let px = 0; px < width; px++) {
            let inside = false;
            for (let i = 0, j = lassoSites.length - 1; i < lassoSites.length; j = i++) {
              const xi = lassoSites[i].x, yi = lassoSites[i].y;
              const xj = lassoSites[j].x, yj = lassoSites[j].y;
              const intersect = (yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / ((yj - yi) || 1e-6) + xi;
              if (intersect) inside = !inside;
            }
            if (inside) {
              mask[py][px] = true;
              if (px < minX) minX = px;
              if (px > maxX) maxX = px;
              if (py < minY) minY = py;
              if (py > maxY) maxY = py;
            }
          }
        }
      }
      for (const pt of lassoSites) {
        if (pt.x >= 0 && pt.x < width && pt.y >= 0 && pt.y < height) {
          mask[pt.y][pt.x] = true;
          if (pt.x < minX) minX = pt.x;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.y > maxY) maxY = pt.y;
        }
      }
      const combined = combineSelectionMasks(
        selection,
        mask,
        width,
        height,
        selectionOptions.opMode,
        'lasso'
      );
      setSelection(combined);
      setLassoSites([]);
      return;
    }

    // Commit Parametric Shape drag creation (keep editable, rasterize, or ask)
    if (creatingShapeDraftRef.current) {
      const created = creatingShapeDraftRef.current;
      creatingShapeDraftRef.current = null;
      setCreatingShapeDraft(null);
      setIsDrawing(false);
      setDragStartPoint(null);
      draftPixelsRef.current = [];

      if (shapeRasterPolicy === 'rasterize' || !onUpdateLayerParametricShapes) {
        const nextGrid = currentLayer.pixels.map((r) => [...r]);
        if (effSymmetry.enabled && effSymmetry.mode !== 'none') {
          const p0s = computeSymmetricPointsRaw(created.x, created.y, effSymmetry);
          const p1s = computeSymmetricPointsRaw(
            created.x + created.width,
            created.y + created.height,
            effSymmetry
          );
          const cnt = Math.min(p0s.length, p1s.length);
          for (let i = 0; i < cnt; i++) {
            const symShape: ParametricShapeObject = {
              ...created,
              x: Math.min(p0s[i].x, p1s[i].x),
              y: Math.min(p0s[i].y, p1s[i].y),
              width: Math.max(2, Math.abs(p1s[i].x - p0s[i].x)),
              height: Math.max(2, Math.abs(p1s[i].y - p0s[i].y)),
            };
            rasterizeParametricShapeToGrid(
              symShape,
              nextGrid,
              currentLayer.pixels,
              effDitherConfig,
              gradientConfig,
              activePaletteColors
            );
          }
        } else {
          rasterizeParametricShapeToGrid(
            created,
            nextGrid,
            currentLayer.pixels,
            effDitherConfig,
            gradientConfig,
            activePaletteColors
          );
        }
        const finalGrid = currentLayer.lockTransparency
          ? applyTransparencyLock(currentLayer.pixels, nextGrid)
          : nextGrid;
        onUpdateLayerPixels(finalGrid, currentLayer.offCanvasPixels);
      } else {
        const nextShapes = [...(currentLayer.parametricShapes || []), created];
        onUpdateLayerParametricShapes(nextShapes);
        onSelectParametricShapeId?.(created.id);
        if (shapeRasterPolicy === 'ask') {
          setPendingShapeRasterPromptId(created.id);
        }
      }
      renderCanvas();
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);
    prevSelectionBeforeDragRef.current = null;

    if (effTool === 'hitbox' && newHitboxStart && cursorPos) {
      const minX = Math.min(newHitboxStart.x, cursorPos.x);
      const minY = Math.min(newHitboxStart.y, cursorPos.y);
      const w = Math.abs(cursorPos.x - newHitboxStart.x) + 1;
      const h = Math.abs(cursorPos.y - newHitboxStart.y) + 1;

      if (w >= 2 && h >= 2) {
        const newHitbox: Hitbox = {
          id: `hb-${Date.now()}`,
          type: activeHitboxType,
          x: minX,
          y: minY,
          w,
          h,
          name: `${activeHitboxType.toUpperCase()} ${w}x${h}`
        };
        onUpdateHitboxes([...(currentFrame.hitboxes || []), newHitbox]);
        setSelectedHitboxId(newHitbox.id);
      }
      setNewHitboxStart(null);
      return;
    }

    if (isPaintingMaskRef.current && draftMaskRef.current.length > 0 && onUpdateLayerMaskPixels) {
      onUpdateLayerMaskPixels(draftMaskRef.current);
      draftMaskRef.current = [];
      isPaintingMaskRef.current = false;
      setLastDrawnPoint(null);
      setDragStartPoint(null);
      return;
    }
    isPaintingMaskRef.current = false;

    if (draftTiledStoreRef.current) {
      const committedId = registerTiledStore(draftTiledStoreRef.current);
      draftTiledStoreRef.current = null;
      onCommitTiledLayerEdit?.(currentLayer.id, committedId);
      setLastDrawnPoint(null);
      setDragStartPoint(null);
      return;
    }

    if (
      ((effTool === 'pencil' && (pixelPerfect || brushSettings.pixelPerfect)) ||
        (effTool === 'eraser' && eraserOptions.pixelPerfect)) &&
      (brushSettings.size || brushSize) === 1
    ) {
      cleanPixelPerfectStroke(strokeHistoryRef.current, draftPixelsRef.current);
    }

    if (activeTool === 'tile' && draftTileMapRef.current) {
      if (draftPixelsRef.current.length > 0) {
        const finalGrid = currentLayer.lockTransparency
          ? applyTransparencyLock(currentLayer.pixels, draftPixelsRef.current)
          : draftPixelsRef.current;
        if (onCommitTileLayerEdit) {
          onCommitTileLayerEdit(finalGrid, draftTileMapRef.current);
        } else {
          onUpdateLayerPixels(finalGrid, currentLayer.offCanvasPixels);
        }
        draftPixelsRef.current = [];
      }
      draftTileMapRef.current = null;
      tileDragStartCellRef.current = null;
      tileLastCellRef.current = null;
      setLastDrawnPoint(null);
      setDragStartPoint(null);
      return;
    }

    if (draftPixelsRef.current.length > 0) {
      const finalGrid = currentLayer.lockTransparency
        ? applyTransparencyLock(currentLayer.pixels, draftPixelsRef.current)
        : draftPixelsRef.current;
      onUpdateLayerPixels(finalGrid, currentLayer.offCanvasPixels);
      draftPixelsRef.current = [];
    }

    setLastDrawnPoint(null);
    setDragStartPoint(null);
  };

  const rotateSvgCursor = useMemo(
    () =>
      `url("data:image/svg+xml;utf8,${encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M19 9A7 7 0 1 0 17.5 16.5" fill="none" stroke="#090d16" stroke-width="4" stroke-linecap="round"/><path d="M19 9A7 7 0 1 0 17.5 16.5" fill="none" stroke="#fbbf24" stroke-width="2.2" stroke-linecap="round"/><polygon points="21,4 21,11 14,10" fill="#fbbf24" stroke="#090d16" stroke-width="1"/></svg>'
      )}") 12 12, alias`,
    []
  );

  const isTransformRotateCursor = Boolean(
    transformSession && (transformHoverRotCorner || transformDragRef.current?.kind === 'rotate')
  );

  const cursorClass = isPanning
    ? 'cursor-grabbing'
    : isSpaceDown || activeTool === 'hand'
    ? 'cursor-grab'
    : activeTool === 'zoom'
    ? zoomToolMode === 'out'
      ? 'cursor-zoom-out'
      : 'cursor-zoom-in'
    : isDirectSelectActive
    ? 'cursor-default'
    : activeTool === 'move'
    ? hoveredPivot || hoveredHitboxId || isDraggingPivot || draggingHitboxId
      ? 'cursor-move'
      : 'cursor-grab'
    : 'cursor-crosshair';

  const activeCameraTransform = useMemo(() => {
    const idx = isPlaying ? playbackFrameIndex : currentFrameIndex ?? 0;
    if (!cameraKeyframes || cameraKeyframes.length === 0) {
      return { camX: 0, camY: 0, camZoom: 1 };
    }
    const sorted = [...cameraKeyframes].sort((a, b) => a.frameIndex - b.frameIndex);
    const exact = sorted.find((k) => k.frameIndex === idx);
    if (exact) {
      return { camX: exact.x, camY: exact.y, camZoom: exact.zoom || 1 };
    }
    let prevKf = sorted[0];
    let nextKf = sorted[sorted.length - 1];
    for (const k of sorted) {
      if (k.frameIndex < idx) prevKf = k;
      if (k.frameIndex > idx) {
        nextKf = k;
        break;
      }
    }
    if (idx <= prevKf.frameIndex) return { camX: prevKf.x, camY: prevKf.y, camZoom: prevKf.zoom || 1 };
    if (idx >= nextKf.frameIndex) return { camX: nextKf.x, camY: nextKf.y, camZoom: nextKf.zoom || 1 };
    if (prevKf.easing === 'hold') return { camX: prevKf.x, camY: prevKf.y, camZoom: prevKf.zoom || 1 };
    let t = (idx - prevKf.frameIndex) / Math.max(1, nextKf.frameIndex - prevKf.frameIndex);
    if (prevKf.easing === 'ease-in') t = t * t;
    else if (prevKf.easing === 'ease-out') t = 1 - (1 - t) * (1 - t);
    else if (prevKf.easing === 'ease-in-out') t = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    return {
      camX: prevKf.x + (nextKf.x - prevKf.x) * t,
      camY: prevKf.y + (nextKf.y - prevKf.y) * t,
      camZoom: (prevKf.zoom || 1) + ((nextKf.zoom || 1) - (prevKf.zoom || 1)) * t,
    };
  }, [cameraKeyframes, isPlaying, playbackFrameIndex, currentFrameIndex]);

  const draftVectorMetrics = useMemo(() => {
    const activePath =
      (currentLayer.vectorPaths || []).find(
        (p) => p.id === (vectorDraftSession?.pathId || selectedVectorPathId)
      ) || null;
    if (!activePath || activePath.nodes.length === 0) return null;
    if (vectorDraftSession?.phase === 'placing' && vectorHoverCoord) {
      const prevNode = activePath.nodes[activePath.nodes.length - 1];
      const m = computeVectorSegmentMetrics(prevNode, vectorHoverCoord);
      return { ...m, nodeCount: activePath.nodes.length + 1 };
    }
    if (activePath.nodes.length >= 2) {
      const p0 = activePath.nodes[activePath.nodes.length - 2];
      const p1 = activePath.nodes[activePath.nodes.length - 1];
      const m = computeVectorSegmentMetrics(p0, p1);
      return { ...m, nodeCount: activePath.nodes.length };
    }
    return { lengthPx: 0, angleDeg: 0, directionLabel: 'E', nodeCount: activePath.nodes.length };
  }, [currentLayer.vectorPaths, vectorDraftSession, selectedVectorPathId, vectorHoverCoord]);

  return (
    <div 
      ref={containerRef}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
      onMouseDownCapture={() => onUiContextFocus?.()}
      onPointerDownCapture={(e) => {
        // Free Panning from ANYWHERE in the viewport (empty area, outer camera zone, over camera references, or over canvas)
        const targetEl = e.target as HTMLElement | null;
        const isUiControl = Boolean(
          targetEl?.closest('button, input, select, textarea, [data-no-pan="true"]')
        );
        const isRuler = targetEl?.tagName === 'CANVAS' && targetEl !== canvasRef.current;
        const wantsSpaceOrMiddlePan = isSpaceDown || e.button === 1;
        const wantsHandToolPan = activeTool === 'hand' && e.button === 0 && !isUiControl && !isRuler;

        if (wantsSpaceOrMiddlePan || wantsHandToolPan) {
          e.preventDefault();
          e.stopPropagation();
          setIsPanning(true);
          setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }
      }}
      onPointerDown={(e) => {
        // If clicking on container background outside the canvas, clear active selection & guide selection
        if (e.target === containerRef.current) {
          if (selection) {
            setSelection(null);
            setLassoSites([]);
          }
          if (selectedGuideId) {
            onSelectGuide?.(null);
          }
        }
      }}
      onPointerMove={(e) => {
        setCursorClientPos({ x: e.clientX, y: e.clientY });
      }}
      onPointerLeave={() => {
        setCursorClientPos(null);
      }}
      className={`relative flex-1 h-full overflow-hidden select-none ${cursorClass}`}
      style={{
        backgroundColor: 'var(--studio-bg-canvas)',
        cursor: isTransformRotateCursor ? rotateSvgCursor : undefined,
      }}
    >
      {/* Dynamic Rulers (Top & Left) + Interactive Draggable Guides */}
      <ViewportRulersAndGuides
        containerRef={containerRef}
        canvasRef={canvasBoxRef}
        width={width}
        height={height}
        zoom={zoom}
        pan={pan}
        cameraTransform={activeCameraTransform}
        guides={guides}
        guidesConfig={guidesConfig}
        selectedGuideId={selectedGuideId}
        snappedGuideIds={snappedGuideIds}
        cursorClientPos={cursorClientPos}
        isPanInteractionActive={isPanning || isSpaceDown || activeTool === 'hand'}
        onSelectGuide={onSelectGuide}
        onAddGuide={onAddGuide}
        onUpdateGuide={onUpdateGuide}
        onDuplicateGuide={onDuplicateGuide}
        onDeleteGuide={onDeleteGuide}
        onChangeGuidesConfig={onChangeGuidesConfig}
        onOpenGuidesModal={onOpenGuidesModal}
        onFocusGuidesContext={onFocusGuidesContext}
        workMode={workMode}
      />

      {/* Temporary Spacebar Hand Tool Indicator */}
      {isSpaceDown && (
        <div
          className="pointer-events-none absolute top-7 left-1/2 -translate-x-1/2 z-[45] px-2.5 py-1 rounded-md border text-[11px] font-mono shadow-lg backdrop-blur-xs"
          style={{
            backgroundColor: 'rgba(15, 19, 32, 0.9)',
            borderColor: 'var(--studio-accent)',
            color: 'var(--studio-accent)',
          }}
        >
          Mano temporal (Espacio) · Arrastra desde cualquier zona
        </div>
      )}

      {/* Pan & Zoom Canvas Container with Camera Shake, Camera Keyframes & Asset Browser Drop */}
      <div
        className="absolute origin-top-left"
        style={{
          transform: `translate(${pan.x + screenShakeOffset.x + activeCameraTransform.camX * zoom}px, ${pan.y + screenShakeOffset.y + activeCameraTransform.camY * zoom}px) scale(${activeCameraTransform.camZoom})`,
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('application/x-pixelclash-asset')) {
            e.preventDefault();
            setIsAssetDragOver(true);
          }
        }}
        onDragLeave={() => setIsAssetDragOver(false)}
        onDrop={(e) => {
          setIsAssetDragOver(false);
          const raw = e.dataTransfer.getData('application/x-pixelclash-asset');
          const dropTarget = canvasBoxRef.current || canvasRef.current;
          if (!raw || !onDropLibraryAssetAt || !dropTarget) return;
          e.preventDefault();
          try {
            const asset = JSON.parse(raw) as AssetLibraryItem;
            const rect = dropTarget.getBoundingClientRect();
            const gx = Math.max(0, Math.min(width - 1, Math.floor((e.clientX - rect.left) / zoom)));
            const gy = Math.max(0, Math.min(height - 1, Math.floor((e.clientY - rect.top) / zoom)));
            onDropLibraryAssetAt(asset, gx, gy);
          } catch {
            // ignore malformed drop payload
          }
        }}
      >
        <div
          ref={canvasBoxRef}
          className={`canvas-checkerboard relative shadow-2xl border rounded-xs overflow-hidden ${
            isAssetDragOver ? 'border-amber-400 ring-2 ring-amber-400/50' : 'border-[#2b3347]'
          }`}
          style={{
            width: Math.max(1, Math.round(width * zoom)),
            height: Math.max(1, Math.round(height * zoom)),
          }}
        >
          <canvas
            ref={canvasRef}
            width={virtualRect.width}
            height={virtualRect.height}
            onPointerDown={handleMouseDown}
            onPointerMove={handleMouseMove}
            onPointerUp={handleMouseUp}
            onPointerLeave={() => {
              setCursorPos(null);
              setEyedropperScreenPos(null);
              setTransformHoverRotCorner(null);
              if (symHandleDragRef.current) symHandleDragRef.current = null;
              if (isDrawing) handleMouseUp();
            }}
            className="pixel-canvas block touch-none absolute"
            style={{
              left: virtualRect.left,
              top: virtualRect.top,
              width: virtualRect.width,
              height: virtualRect.height,
              cursor: isTransformRotateCursor ? rotateSvgCursor : undefined,
            }}
          />

          {/* Interactive 2.5D Volumetric Pose Dummie SVG Overlay directly over Sprite */}
          {dummiePose &&
            dummiePose.overlayMode === 'canvas' &&
            onChangeDummiePose &&
            (() => {
              const perspForDummie = guidesConfig.perspective;
              const canvasDims = { width, height };
              const joints = getEffectivePoseJoints(dummiePose, perspForDummie, canvasDims);
              const jointMap = new Map(joints.map((j) => [j.id, j]));
              const totalW = width * zoom;
              const totalH = height * zoom;
              const toPx = (j: { x: number; y: number }) => ({
                x: (j.x * width * dummiePose.canvasScale + dummiePose.canvasX) * zoom,
                y: (j.y * height * dummiePose.canvasScale + dummiePose.canvasY) * zoom,
              });
              const pelvis = jointMap.get('pelvis');
              const pelvisPx = pelvis ? toPx(pelvis) : { x: totalW / 2, y: totalH / 2 };

              const dispMode =
                dummiePose.modifiers.displayMode ||
                (dummiePose.modifiers.skeletonMode ? 'joints_only' : 'joints_and_volumes');
              const showVols = dispMode !== 'joints_only';
              const showJts = dispMode === 'joints_only' || dispMode === 'joints_and_volumes';
              const isSolidSil = dispMode === 'solid_silhouette';
              const isSimpleSil = dispMode === 'simple_silhouette';
              const rigW = totalW * dummiePose.canvasScale;
              const rigH = totalH * dummiePose.canvasScale;
              const offX = dummiePose.canvasX * zoom;
              const offY = dummiePose.canvasY * zoom;
              const volumes = showVols
                ? computeDummieVolumes25D(dummiePose, rigW, rigH, perspForDummie, canvasDims)
                : [];

              return (
                <svg
                  className="absolute inset-0 w-full h-full z-20"
                  viewBox={`0 0 ${totalW} ${totalH}`}
                  style={{ opacity: dummiePose.overlayOpacity }}
                  onPointerMove={(e) => {
                    if (!draggingDummieJointId) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const nx = Math.max(0.02, Math.min(0.98, ((e.clientX - rect.left) / zoom - dummiePose.canvasX) / (width * dummiePose.canvasScale)));
                    const ny = Math.max(0.02, Math.min(0.98, ((e.clientY - rect.top) / zoom - dummiePose.canvasY) / (height * dummiePose.canvasScale)));
                    onChangeDummiePose(
                      moveDummieJointWithAnchors(dummiePose, draggingDummieJointId, nx, ny, {
                        altBypass: e.altKey,
                      })
                    );
                  }}
                  onPointerUp={() => setDraggingDummieJointId(null)}
                  onPointerLeave={() => setDraggingDummieJointId(null)}
                >
                  {dummiePose.modifiers.showBalanceLine && (
                    <line
                      x1={pelvisPx.x}
                      y1={0}
                      x2={pelvisPx.x}
                      y2={totalH}
                      stroke="#fbbf24"
                      strokeDasharray="4 4"
                      strokeWidth={1.2}
                      opacity={0.7}
                    />
                  )}
                  {showVols && (
                    <g transform={`translate(${offX}, ${offY})`}>
                      {volumes.map((shape) => {
                        const fillCol = isSolidSil
                          ? dummiePose.overlayColor || '#38bdf8'
                          : isSimpleSil
                          ? 'rgba(56,189,248,0.14)'
                          : shape.fill;
                        const strokeCol = isSolidSil ? dummiePose.overlayColor || '#38bdf8' : shape.stroke;
                        const strokeW = isSimpleSil ? 1.8 : 1.2;

                        if (shape.kind === 'box' && shape.faces) {
                          return (
                            <g key={shape.id}>
                              {shape.faces.map((f) => (
                                <polygon
                                  key={f.id}
                                  points={f.points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                                  fill={isSolidSil ? dummiePose.overlayColor || '#38bdf8' : isSimpleSil ? 'rgba(56,189,248,0.12)' : f.fill}
                                  stroke={strokeCol}
                                  strokeWidth={strokeW}
                                  strokeLinejoin="round"
                                  opacity={isSolidSil ? 0.85 : 0.9}
                                />
                              ))}
                            </g>
                          );
                        }
                        if (shape.kind === 'sphere' && shape.cx !== undefined && shape.cy !== undefined && shape.rx) {
                          const yawShift = Math.sin(((shape.yawDeg || 0) * Math.PI) / 180) * shape.rx * 0.65;
                          const pitchShift = Math.sin(((shape.pitchDeg || 0) * Math.PI) / 180) * (shape.ry || shape.rx) * 0.5;
                          return (
                            <g key={shape.id}>
                              <ellipse
                                cx={shape.cx}
                                cy={shape.cy}
                                rx={shape.rx}
                                ry={shape.ry || shape.rx}
                                fill={fillCol}
                                stroke={strokeCol}
                                strokeWidth={1.5}
                                opacity={isSolidSil ? 0.88 : 1}
                              />
                              {!isSolidSil && (
                                <>
                                  <line
                                    x1={shape.cx - shape.rx * 0.88}
                                    y1={shape.cy + pitchShift}
                                    x2={shape.cx + shape.rx * 0.88}
                                    y2={shape.cy + pitchShift}
                                    stroke="#fbbf24"
                                    strokeWidth={1.1}
                                  />
                                  <line
                                    x1={shape.cx + yawShift}
                                    y1={shape.cy - (shape.ry || shape.rx) * 0.85}
                                    x2={shape.cx + yawShift}
                                    y2={shape.cy + (shape.ry || shape.rx) * 0.85}
                                    stroke="#fbbf24"
                                    strokeWidth={1.1}
                                  />
                                </>
                              )}
                            </g>
                          );
                        }
                        if (shape.polyPoints && shape.polyPoints.length > 0) {
                          return (
                            <polygon
                              key={shape.id}
                              points={shape.polyPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                              fill={fillCol}
                              stroke={strokeCol}
                              strokeWidth={strokeW}
                              strokeLinejoin="round"
                              opacity={isSolidSil ? 0.85 : 0.92}
                            />
                          );
                        }
                        return null;
                      })}
                    </g>
                  )}
                  {(showJts || isSimpleSil || dummiePose.rigViewEnabled) &&
                    joints.map((j) => {
                      if (!j.parentId) return null;
                      const parent = jointMap.get(j.parentId);
                      if (!parent) return null;
                      const p1 = toPx(parent);
                      const p2 = toPx(j);
                      const vState = getJointAnchorVisualState(j);
                      return (
                        <line
                          key={`bone-${j.id}`}
                          x1={p1.x}
                          y1={p1.y}
                          x2={p2.x}
                          y2={p2.y}
                          stroke={dummiePose.rigViewEnabled ? getJointAnchorColor(vState) : dummiePose.overlayColor || '#38bdf8'}
                          strokeWidth={Math.max(1.8, (dummiePose.lineWidth || 2.5) * (zoom * 0.12))}
                          strokeDasharray={vState === 'independent' ? '5 4' : vState === 'partial' ? '8 3' : undefined}
                          strokeLinecap="round"
                          opacity={isSimpleSil ? 0.4 : 0.88}
                        />
                      );
                    })}
                  {(showJts || dummiePose.rigViewEnabled) &&
                    joints.map((j) => {
                      const p = toPx(j);
                      const isDrag = draggingDummieJointId === j.id;
                      const vState = getJointAnchorVisualState(j);
                      const handleColor = getJointAnchorColor(vState);
                      return (
                        <g key={`joint-${j.id}`}>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={isDrag ? 7 : 5}
                            fill={isDrag ? '#fbbf24' : handleColor}
                            stroke={isDrag ? '#fff' : '#090d16'}
                            strokeWidth={1.8}
                            className="cursor-grab active:cursor-grabbing"
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              if (!j.locked) setDraggingDummieJointId(j.id);
                            }}
                          >
                            <title>{`${j.label} · ${getJointAnchorLabel(vState)} (Alt + arrastrar = desanclaje temporal)`}</title>
                          </circle>
                        </g>
                      );
                    })}
                </svg>
              );
            })()}
        </div>

        {/* Visual Canvas Edit Tool Overlay (Sibling of canvasBoxRef so expansion outside bounds is NEVER clipped) */}
        {activeTool === 'canvas_edit' &&
          !isPlaying &&
          !combatTestActive &&
          canvasEditRect &&
          canvasEditConfig &&
          onChangeCanvasEditRect &&
          onApplyCanvasEdit &&
          onResetCanvasEdit &&
          onCancelCanvasEdit && (
            <CanvasEditOverlay
              origWidth={width}
              origHeight={height}
              zoom={zoom}
              rect={canvasEditRect}
              config={canvasEditConfig}
              hasOffCanvasContent={hasOffCanvasContent}
              onChangeRect={onChangeCanvasEditRect}
              onApply={onApplyCanvasEdit}
              onReset={onResetCanvasEdit}
              onCancel={onCancelCanvasEdit}
            />
          )}
      </div>

      {/* PureRef Viewport Interaction Layer (blocks accidental canvas painting when PureRef Mode is active) */}
      {pureRefConfig.enabled && (
        <div
          className={`absolute inset-0 ${pureRefConfig.alwaysOnTop ? 'z-[34]' : 'z-[18]'} cursor-grab active:cursor-grabbing`}
          onPointerDown={(e) => {
            if (e.button !== 0 && e.button !== 1) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            camRefDragRef.current = {
              kind: 'pan_board',
              startClientX: e.clientX,
              startClientY: e.clientY,
              origX: pureRefConfig.panX,
              origY: pureRefConfig.panY,
              origScale: 1,
              origRotation: 0,
              centerClientX: 0,
              centerClientY: 0,
            };
            onSelectReference?.(null);
          }}
          onPointerMove={(e) => {
            const st = camRefDragRef.current;
            if (!st || st.kind !== 'pan_board' || !onChangePureRefConfig) return;
            onChangePureRefConfig({
              ...pureRefConfig,
              panX: Math.round(st.origX + (e.clientX - st.startClientX)),
              panY: Math.round(st.origY + (e.clientY - st.startClientY)),
            });
          }}
          onPointerUp={(e) => {
            if (camRefDragRef.current?.kind === 'pan_board') {
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {
                // ignore
              }
              camRefDragRef.current = null;
            }
          }}
          onWheel={(e) => {
            if (!onChangePureRefConfig) return;
            e.preventDefault();
            e.stopPropagation();
            const factor = e.deltaY < 0 ? 1.1 : 0.9;
            const nextZoom = Math.max(0.25, Math.min(4, Number(((pureRefConfig.zoom || 1) * factor).toFixed(2))));
            onChangePureRefConfig({ ...pureRefConfig, zoom: nextZoom });
          }}
        />
      )}

      {/* Camera-Anchored Free Workspace References (PureRef / Outside & Over Canvas) */}
      {(() => {
        const visibleGroupIds = new Set(
          referenceGroups.filter((g) => g.visible !== false).map((g) => g.id)
        );
        const camRefs = [...references]
          .filter((r) => {
            if (!r.visible || r.anchor !== 'camera') return false;
            if (r.groupId && referenceGroups.length > 0 && !visibleGroupIds.has(r.groupId)) return false;
            return true;
          })
          .sort((a, b) => (a.zOrder ?? 0) - (b.zOrder ?? 0));

        if (camRefs.length === 0) return null;
        const camZoom = pureRefConfig.zoom || 1;

        return (
          <div
            className={`absolute inset-0 pointer-events-none overflow-hidden ${
              pureRefConfig.alwaysOnTop ? 'z-[36]' : 'z-[20]'
            }`}
          >
            {camRefs.map((r, idx) => {
              const isSel = activeReferenceId === r.id;
              const canInteract =
                pureRefConfig.enabled ||
                (activeTool === 'move' && moveSubTool === 'move_reference') ||
                !r.locked;
              const grp = r.groupId ? referenceGroups.find((g) => g.id === r.groupId) : undefined;
              const baseW = Math.min(260, Math.max(120, r.naturalWidth || 160));
              const effectiveOpacity = Math.max(
                0.05,
                Math.min(1, r.opacity * (pureRefConfig.enabled ? pureRefConfig.globalOpacity : 1))
              );
              const zIndexItem = isSel ? 900 : 10 + (r.zOrder ?? idx);

              return (
                <div
                  key={r.id}
                  onPointerDown={(e) => {
                    if (!canInteract || e.button !== 0 || !onUpdateReference) return;
                    e.stopPropagation();
                    onSelectReference?.(r.id);
                    onBringReferenceToFront?.(r.id);
                    if (r.locked && (pureRefConfig.enabled || (activeTool === 'move' && moveSubTool === 'move_reference'))) {
                      onUpdateReference(r.id, { locked: false });
                    }
                    e.currentTarget.setPointerCapture(e.pointerId);
                    const boxRect = e.currentTarget.getBoundingClientRect();
                    camRefDragRef.current = {
                      kind: 'move',
                      refId: r.id,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      origX: r.x,
                      origY: r.y,
                      origScale: r.scale,
                      origRotation: r.rotation,
                      centerClientX: boxRect.left + boxRect.width / 2,
                      centerClientY: boxRect.top + boxRect.height / 2,
                    };
                  }}
                  onPointerMove={(e) => {
                    const st = camRefDragRef.current;
                    if (!st || st.refId !== r.id || !onUpdateReference) return;
                    e.stopPropagation();
                    if (st.kind === 'move') {
                      onUpdateReference(r.id, {
                        x: Math.round(st.origX + (e.clientX - st.startClientX) / camZoom),
                        y: Math.round(st.origY + (e.clientY - st.startClientY) / camZoom),
                      });
                    } else if (st.kind === 'scale') {
                      const curDist = Math.max(8, Math.hypot(e.clientX - st.centerClientX, e.clientY - st.centerClientY));
                      const ratio = curDist / Math.max(12, st.origDist || 40);
                      const nextScale = Math.max(0.15, Math.min(6, Number((st.origScale * ratio).toFixed(2))));
                      onUpdateReference(r.id, { scale: nextScale });
                    } else if (st.kind === 'rotate') {
                      const curAng = Math.atan2(e.clientY - st.centerClientY, e.clientX - st.centerClientX);
                      let deg = Math.round(st.origRotation + ((curAng - (st.startAngle || 0)) * 180) / Math.PI);
                      if (e.shiftKey) deg = Math.round(deg / 15) * 15;
                      while (deg > 180) deg -= 360;
                      while (deg < -180) deg += 360;
                      onUpdateReference(r.id, { rotation: deg });
                    }
                  }}
                  onPointerUp={(e) => {
                    if (camRefDragRef.current?.refId === r.id) {
                      try {
                        e.currentTarget.releasePointerCapture(e.pointerId);
                      } catch {
                        // ignore
                      }
                      camRefDragRef.current = null;
                    }
                  }}
                  className={`absolute select-none ${
                    canInteract ? 'pointer-events-auto cursor-move' : 'pointer-events-none'
                  }`}
                  style={{
                    left: `calc(50% + ${pureRefConfig.panX + r.x * camZoom}px)`,
                    top: `calc(50% + ${pureRefConfig.panY + r.y * camZoom}px)`,
                    width: baseW,
                    zIndex: zIndexItem,
                    opacity: effectiveOpacity,
                    mixBlendMode: r.blendMode,
                    transform: `translate(-50%, -50%) rotate(${r.rotation}deg) scale(${camZoom * r.scale})`,
                    transformOrigin: 'center center',
                  }}
                >
                  {/* Visual Selection Bounding Frame + Scale Handles + Pivot + Rotation Handle */}
                  {isSel && canInteract && (
                    <>
                      <div className="absolute -inset-0.5 border-2 border-dashed border-sky-400 pointer-events-none rounded-xs" />

                      {/* Top Rotation Handle + Angle Readout */}
                      <div
                        onPointerDown={(e) => {
                          if (!onUpdateReference) return;
                          e.stopPropagation();
                          e.currentTarget.setPointerCapture(e.pointerId);
                          const parentRect = e.currentTarget.parentElement?.getBoundingClientRect();
                          const cx = parentRect ? parentRect.left + parentRect.width / 2 : e.clientX;
                          const cy = parentRect ? parentRect.top + parentRect.height / 2 : e.clientY;
                          camRefDragRef.current = {
                            kind: 'rotate',
                            refId: r.id,
                            startClientX: e.clientX,
                            startClientY: e.clientY,
                            origX: r.x,
                            origY: r.y,
                            origScale: r.scale,
                            origRotation: r.rotation,
                            centerClientX: cx,
                            centerClientY: cy,
                            startAngle: Math.atan2(e.clientY - cy, e.clientX - cx),
                          };
                        }}
                        title="Arrastra para rotar (Shift = 15°)"
                        className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing z-30"
                      >
                        <div className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 border border-slate-900 flex items-center justify-center shadow">
                          <RotateCw className="w-3 h-3" />
                        </div>
                        <div className="w-0.5 h-2 bg-amber-400" />
                      </div>

                      {/* 4 Corner Scale Handles */}
                      {(['-top-1.5 -left-1.5 cursor-nwse-resize', '-top-1.5 -right-1.5 cursor-nesw-resize', '-bottom-1.5 -right-1.5 cursor-nwse-resize', '-bottom-1.5 -left-1.5 cursor-nesw-resize'] as const).map(
                        (posCls, cIdx) => (
                          <div
                            key={cIdx}
                            onPointerDown={(e) => {
                              if (!onUpdateReference) return;
                              e.stopPropagation();
                              e.currentTarget.setPointerCapture(e.pointerId);
                              const parentRect = e.currentTarget.parentElement?.getBoundingClientRect();
                              const cx = parentRect ? parentRect.left + parentRect.width / 2 : e.clientX;
                              const cy = parentRect ? parentRect.top + parentRect.height / 2 : e.clientY;
                              camRefDragRef.current = {
                                kind: 'scale',
                                refId: r.id,
                                startClientX: e.clientX,
                                startClientY: e.clientY,
                                origX: r.x,
                                origY: r.y,
                                origScale: r.scale,
                                origRotation: r.rotation,
                                centerClientX: cx,
                                centerClientY: cy,
                                origDist: Math.max(12, Math.hypot(e.clientX - cx, e.clientY - cy)),
                              };
                            }}
                            title="Arrastra para escalar referencia"
                            className={`absolute ${posCls} w-3 h-3 rounded-xs bg-white border-2 border-sky-500 shadow z-30`}
                          />
                        )
                      )}

                      {/* Center Pivot Crosshair */}
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none flex items-center justify-center z-20">
                        <div className="w-3 h-[1.5px] bg-rose-500 shadow" />
                        <div className="w-[1.5px] h-3 bg-rose-500 shadow absolute" />
                      </div>
                    </>
                  )}

                  {/* Reference Image Card */}
                  <div
                    className="rounded border shadow-xl overflow-hidden bg-black/25"
                    style={{
                      borderColor: isSel
                        ? '#38bdf8'
                        : grp
                        ? grp.color
                        : 'rgba(255,255,255,0.16)',
                    }}
                  >
                    <img
                      src={r.dataUrl}
                      alt={r.name}
                      draggable={false}
                      className="w-full h-auto block pointer-events-none select-none"
                      style={{
                        transform: `scale(${r.flipX ? -1 : 1}, ${r.flipY ? -1 : 1})`,
                      }}
                    />
                  </div>

                  {/* Quick Selection Info & Bring-to-Front Micro Bar */}
                  {isSel && canInteract && (
                    <div
                      className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded border shadow-lg flex items-center gap-1.5 whitespace-nowrap text-[9px] font-mono tabular-nums z-30"
                      style={{
                        backgroundColor: 'var(--studio-bg-bar)',
                        borderColor: 'var(--studio-border-strong)',
                        color: 'var(--studio-text)',
                        transform: `scale(${1 / Math.max(0.4, camZoom * r.scale)})`,
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <span>{Math.round(r.scale * 100)}% · {r.rotation}°</span>
                      {onBringReferenceToFront && (
                        <button
                          type="button"
                          onClick={() => onBringReferenceToFront(r.id)}
                          title="Traer al frente"
                          className="hover:opacity-80"
                          style={{ color: 'var(--studio-accent)' }}
                        >
                          <ArrowUpToLine className="w-3 h-3" />
                        </button>
                      )}
                      {onUpdateReference && (
                        <button
                          type="button"
                          onClick={() => onUpdateReference(r.id, { locked: !r.locked })}
                          title={r.locked ? 'Desbloquear' : 'Bloquear'}
                          className="hover:opacity-80"
                        >
                          {r.locked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3 text-emerald-400" />}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Floating PureRef / Move-Reference Workspace HUD */}
      {(pureRefConfig.enabled || (activeTool === 'move' && moveSubTool === 'move_reference')) && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-[45] px-2.5 py-1.5 rounded-xl border shadow-2xl backdrop-blur-md flex items-center gap-2 text-[10px] font-mono"
          style={{
            backgroundColor: 'var(--studio-bg-panel)',
            borderColor: 'var(--studio-accent)',
            color: 'var(--studio-text)',
          }}
        >
          <span className="font-bold flex items-center gap-1" style={{ color: 'var(--studio-accent)' }}>
            <Camera className="w-3.5 h-3.5" />
            <span>{pureRefConfig.enabled ? 'Modo PureRef (Lienzo Protegido)' : 'Mover Referencia'}</span>
          </span>

          {pureRefConfig.enabled && onChangePureRefConfig && (
            <>
              <span className="opacity-25">|</span>
              <div className="w-28">
                <StudioSlider
                  variant="compact"
                  value={Math.round(pureRefConfig.globalOpacity * 100)}
                  min={15}
                  max={100}
                  step={1}
                  defaultValue={100}
                  unit="%"
                  onChange={(v) =>
                    onChangePureRefConfig({
                      ...pureRefConfig,
                      globalOpacity: v / 100,
                    })
                  }
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  onChangePureRefConfig({
                    ...pureRefConfig,
                    alwaysOnTop: !pureRefConfig.alwaysOnTop,
                  })
                }
                title="Siempre visible encima de guías y canvas"
                className="px-1.5 py-0.5 rounded border flex items-center gap-1"
                style={{
                  backgroundColor: pureRefConfig.alwaysOnTop
                    ? 'color-mix(in srgb, var(--studio-accent) 20%, var(--studio-bg-elevated))'
                    : 'var(--studio-bg-card)',
                  borderColor: pureRefConfig.alwaysOnTop ? 'var(--studio-accent)' : 'var(--studio-border)',
                  color: pureRefConfig.alwaysOnTop ? 'var(--studio-accent)' : 'var(--studio-text-muted)',
                }}
              >
                <Pin className="w-3 h-3" />
                <span>Siempre visible</span>
              </button>
            </>
          )}

          {onCenterAllReferences && (
            <button
              type="button"
              onClick={onCenterAllReferences}
              title="Centrar todas las referencias visibles en pantalla"
              className="px-1.5 py-0.5 rounded border flex items-center gap-1 hover:opacity-90"
              style={{
                backgroundColor: 'var(--studio-bg-card)',
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-accent)',
              }}
            >
              <Focus className="w-3 h-3" />
              <span>Centrar Refs</span>
            </button>
          )}

          {pureRefConfig.enabled && onChangePureRefConfig && (
            <button
              type="button"
              onClick={() => onChangePureRefConfig({ ...pureRefConfig, enabled: false })}
              title="Salir de Modo PureRef y volver a dibujar"
              className="px-2 py-0.5 rounded font-bold flex items-center gap-1"
              style={{
                backgroundColor: 'var(--studio-accent)',
                color: 'var(--studio-accent-text)',
              }}
            >
              <X className="w-3 h-3" />
              <span>Salir PureRef</span>
            </button>
          )}
        </div>
      )}

      {/* Real-Time Playable Combat Test Mode HUD */}
      {combatTestActive && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 w-[min(520px,92%)] bg-[#0c101b]/95 border border-rose-500/70 rounded-xl p-2.5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-emerald-300 mb-0.5">
                <span>P1 FIGHTER</span>
                <span>{combatHud.p1Hp}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${combatHud.p1Hp}%` }} />
              </div>
            </div>
            <div className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-[10px] font-mono font-bold text-rose-300">
              VS · {combatHud.combo} HITS
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-amber-300 mb-0.5">
                <span>P2 DUMMY ({dummyOpponent.state || 'idle'})</span>
                <span>{combatHud.p2Hp}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded overflow-hidden">
                <div className="h-full bg-rose-500 transition-all" style={{ width: `${combatHud.p2Hp}%` }} />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-slate-300">
            <span>Controles: A/D Mover · W Saltar · J/K/L Atacar · R Reset</span>
            <span className="text-amber-300 font-bold">{combatHud.banner}</span>
            {onExitCombatTest && (
              <button
                type="button"
                onClick={onExitCombatTest}
                className="px-2 py-0.5 rounded bg-rose-500 text-white font-bold hover:bg-rose-400"
              >
                Salir (Esc)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Left Canvas HUD */}
      <div
        className="absolute top-3 left-3 backdrop-blur-md border rounded-lg px-3 py-1.5 flex items-center gap-3 text-xs font-mono shadow-lg pointer-events-none z-10"
        style={{
          backgroundColor: 'var(--studio-bg-panel)',
          borderColor: 'var(--studio-border-strong)',
          color: 'var(--studio-text)',
        }}
      >
        <span className="flex items-center gap-1.5 tabular-nums">
          <Crosshair className="w-3.5 h-3.5" style={{ color: 'var(--studio-accent)' }} />
          {cursorPos ? `X: ${cursorPos.x}, Y: ${cursorPos.y}` : `X: --, Y: --`}
        </span>
        <span className="opacity-30">|</span>
        <span className="tabular-nums" style={{ color: 'var(--studio-text-muted)' }}>
          Zoom: {Math.round((zoom / 12) * 100)}%
        </span>
        <span className="opacity-30">|</span>
        <span className="font-semibold">{currentLayer.name}</span>
        {livePressureInfo && (
          <>
            <span className="opacity-30">|</span>
            <span className="tabular-nums font-bold" style={{ color: 'var(--studio-accent)' }}>
              {livePressureInfo.pointerType === 'pen' ? 'Pluma' : 'Pincel'}: {livePressureInfo.size}px · {Math.round(livePressureInfo.pressure * 100)}%
            </span>
          </>
        )}
        {activeTool === 'move' && linkMoveAllFrames && (
          <>
            <span className="opacity-30">|</span>
            <span className="font-bold" style={{ color: 'var(--studio-accent)' }}>
              Mover: Todos los Fotogramas
            </span>
          </>
        )}
        {activeTool === 'line' && isCtrlTempDirectSelect && (
          <>
            <span className="opacity-30">|</span>
            <span className="font-bold text-amber-300">
              Ctrl: Selección Directa temporal
            </span>
          </>
        )}
        {activeTool === 'lasso' && lassoMode === 'magnetic' && (
          <>
            <span className="opacity-30">|</span>
            <span className="font-bold text-cyan-300">
              Lazo Magnético {magneticLassoPts.length > 0 ? `(${magneticLassoPts.length} pts · Enter/2×Clic cerrar)` : '(Clic en borde)'}
            </span>
          </>
        )}
        {stageType !== 'checkerboard' && (
          <>
            <span className="opacity-30">|</span>
            <span className="font-semibold uppercase" style={{ color: 'var(--studio-accent)' }}>
              {stageType.replace('_', ' ')}
            </span>
          </>
        )}
      </div>

      {/* Bottom Left Viewport Zoom & Pan Controls */}
      <div className="absolute bottom-3 left-3 bg-[#131620]/90 backdrop-blur-md border border-[#242b3d] rounded-lg p-1 flex items-center gap-1 shadow-lg z-10">
        <button
          onClick={() =>
            zoomAtClientPoint(
              zoom <= 2 ? zoom / 1.35 : zoom <= 12 ? Math.max(minZoom, zoom - 2) : Math.round(zoom / 1.25)
            )
          }
          title="Alejar zoom (Ctrl+-)"
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#202738] transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleFitToWindow}
          title="Ajustar lienzo a pantalla (Ctrl+0)"
          className="px-2 py-1 rounded text-xs font-mono text-slate-300 hover:text-white hover:bg-[#202738] transition-colors flex items-center gap-1"
        >
          <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
          <span>Ajustar</span>
        </button>
        <button
          onClick={handleCenterView}
          title="Centrar vista"
          className="px-1.5 py-1 rounded text-[11px] font-mono text-slate-400 hover:text-white hover:bg-[#202738] transition-colors tabular-nums"
        >
          {zoom < 1 ? `${Math.max(1, Math.round(zoom * 100))}%` : `${Math.round((zoom / 12) * 100)}%`}
        </button>
        <button
          onClick={() =>
            zoomAtClientPoint(
              zoom < 1 ? zoom * 1.35 : zoom < 12 ? zoom + 2 : Math.min(96, Math.round(zoom * 1.25))
            )
          }
          title="Acercar zoom (Ctrl++)"
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#202738] transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* Parametric Shape Rasterization Confirmation Prompt (when policy = 'ask') */}
      {pendingShapeRasterPromptId && !isPlaying && !combatTestActive && (() => {
        const targetShape = (currentLayer.parametricShapes || []).find(
          (s) => s.id === pendingShapeRasterPromptId
        );
        if (!targetShape) return null;
        return (
          <div
            className="absolute top-3 left-1/2 -translate-x-1/2 z-30 border rounded-xl px-3 py-1.5 shadow-2xl flex items-center gap-2 text-[10px] font-mono backdrop-blur-md"
            style={{
              backgroundColor: 'var(--studio-bg-panel)',
              borderColor: 'var(--studio-accent)',
              color: 'var(--studio-text)',
            }}
          >
            <span className="font-semibold whitespace-nowrap">
              {SHAPE_KIND_LABELS[targetShape.kind]} creada:
            </span>
            <button
              type="button"
              onClick={() => setPendingShapeRasterPromptId(null)}
              className="px-2 py-0.5 rounded border font-semibold whitespace-nowrap"
              style={{
                backgroundColor: 'var(--studio-accent)',
                borderColor: 'var(--studio-accent)',
                color: 'var(--studio-accent-text)',
              }}
            >
              Mantener editable
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingShapeRasterPromptId(null);
                onRasterizeParametricShape?.(targetShape.id);
              }}
              className="px-2 py-0.5 rounded border whitespace-nowrap hover:opacity-90"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            >
              Convertir en píxeles
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingShapeRasterPromptId(null);
                onUpdateLayerParametricShapes?.(
                  (currentLayer.parametricShapes || []).filter((s) => s.id !== targetShape.id)
                );
                onSelectParametricShapeId?.(null);
              }}
              className="px-1.5 py-0.5 rounded border text-rose-400 border-rose-500/40 hover:bg-rose-500/15"
              title="Descartar forma"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })()}

      {/* Selected Hitbox Floating Free-Edit Bar */}
      {showHitboxes && selectedHitboxId && !isPlaying && !combatTestActive && (() => {
        const selHb = (currentFrame.hitboxes || []).find((h) => h.id === selectedHitboxId);
        if (!selHb) return null;
        const patchSel = (patch: Partial<Hitbox>) =>
          onUpdateHitboxes((currentFrame.hitboxes || []).map((h) => (h.id === selHb.id ? { ...h, ...patch } : h)));
        return (
          <div
            className="absolute bottom-14 left-3 z-30 border rounded-xl p-2 shadow-2xl flex flex-wrap items-center gap-1.5 text-[10px] font-mono backdrop-blur-md"
            style={{
              backgroundColor: 'var(--studio-bg-panel)',
              borderColor: 'var(--studio-accent)',
              color: 'var(--studio-text)',
            }}
          >
            <span className="font-bold px-1" style={{ color: 'var(--studio-accent)' }}>
              Hitbox Libre:
            </span>
            <select
              value={selHb.type}
              onChange={(e) => patchSel({ type: e.target.value as HitboxType })}
              className="px-1.5 py-0.5 rounded border"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            >
              {Object.entries(HITBOX_RENDER_STYLES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={selHb.name || ''}
              onChange={(e) => patchSel({ name: e.target.value })}
              placeholder="Nombre..."
              className="w-24 px-1.5 py-0.5 rounded border"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            />
            {(['x', 'y', 'w', 'h'] as const).map((field) => (
              <label key={field} className="flex items-center gap-0.5 uppercase">
                <span style={{ color: 'var(--studio-text-muted)' }}>{field}:</span>
                <input
                  type="number"
                  min={field === 'w' || field === 'h' ? 1 : -width}
                  value={selHb[field]}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 0;
                    patchSel({ [field]: field === 'w' || field === 'h' ? Math.max(1, val) : val });
                  }}
                  className="w-11 px-1 py-0.5 rounded border text-center tabular-nums"
                  style={{
                    backgroundColor: 'var(--studio-bg-elevated)',
                    borderColor: 'var(--studio-border-strong)',
                    color: 'var(--studio-text)',
                  }}
                />
              </label>
            ))}
            <button
              type="button"
              onClick={() => {
                onUpdateHitboxes((currentFrame.hitboxes || []).filter((h) => h.id !== selHb.id));
                setSelectedHitboxId(null);
              }}
              className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/50 text-rose-300 font-bold hover:bg-rose-500/35"
            >
              Eliminar
            </button>
            <button
              type="button"
              onClick={() => setSelectedHitboxId(null)}
              className="p-0.5 opacity-70 hover:opacity-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })()}

      {/* Photoshop-style Numeric Transform Properties Bar */}
      {transformSession && onChangeTransformParams && onCommitTransform && onCancelTransform && (
        <TransformPropertiesBar
          params={transformSession.params}
          snapConfig={transformSnapConfig}
          selectedLayersCount={selectedLayersCount}
          selectedFramesCount={selectedFramesCount}
          hasActiveGroup={hasActiveGroup}
          hasSelection={Boolean(selection && selection.active)}
          onChangeParams={onChangeTransformParams}
          onChangeSnapConfig={(next) => onChangeTransformSnapConfig?.(next)}
          onTriggerQuickAction={(act) => onTriggerTransformAction?.(act)}
          onConfirm={onCommitTransform}
          onCancel={onCancelTransform}
        />
      )}

      {/* Editable Vector Lines & Smart Pixel Curves Inspector */}
      {(['line', 'direct_select'].includes(effTool) || (effTool === 'move' && Boolean(selectedVectorPathId))) &&
        !transformSession &&
        !isPlaying &&
        !combatTestActive &&
        vectorConfig &&
        onChangeVectorConfig &&
        onUpdateLayerVectorPaths && (
          <VectorLineInspector
            config={vectorConfig}
            currentLayer={currentLayer}
            activePath={
              (currentLayer.vectorPaths || []).find((p) => p.id === selectedVectorPathId) || null
            }
            selectedNodeIds={selectedVectorNodeIds}
            onChangeConfig={onChangeVectorConfig}
            onSelectPath={(id) => {
              onSelectVectorPathId?.(id);
              onSelectVectorNodeIds?.([]);
            }}
            onStartNewPath={() => {
              onSelectVectorPathId?.(null);
              onSelectVectorNodeIds?.([]);
            }}
            onDeleteActivePath={() => {
              if (!selectedVectorPathId || !currentLayer.vectorPaths) return;
              onUpdateLayerVectorPaths(
                currentLayer.vectorPaths.filter((p) => p.id !== selectedVectorPathId)
              );
              onSelectVectorPathId?.(null);
              onSelectVectorNodeIds?.([]);
            }}
            onUpdateActivePath={(patch) => {
              if (!selectedVectorPathId || !currentLayer.vectorPaths) return;
              onUpdateLayerVectorPaths(
                currentLayer.vectorPaths.map((p) =>
                  p.id === selectedVectorPathId ? { ...p, ...patch } : p
                )
              );
            }}
            onNodeAction={(action) => {
              if (!selectedVectorPathId || !currentLayer.vectorPaths) return;
              const target = currentLayer.vectorPaths.find((p) => p.id === selectedVectorPathId);
              if (!target) return;
              let nextPath = target;
              if (action === 'add_midpoint' && target.nodes.length >= 2) {
                nextPath = splitSegmentAt(target, 0, 0.5);
              } else if (action === 'duplicate_selected' && selectedVectorNodeIds.length > 0) {
                const copies = target.nodes
                  .filter((n) => selectedVectorNodeIds.includes(n.id))
                  .map((n, i) => ({
                    ...n,
                    id: `vnode-dup-${Date.now()}-${i}`,
                    x: n.x + 3,
                    y: n.y + 3,
                  }));
                nextPath = { ...target, nodes: [...target.nodes, ...copies] };
              } else if (action === 'delete_selected') {
                const del = new Set(selectedVectorNodeIds);
                nextPath = { ...target, nodes: target.nodes.filter((n) => !del.has(n.id)) };
                onSelectVectorNodeIds?.([]);
              } else if (action === 'convert_corner') {
                nextPath = convertNodeType(target, selectedVectorNodeIds, 'corner');
              } else if (action === 'convert_smooth') {
                nextPath = convertNodeType(target, selectedVectorNodeIds, 'smooth');
              } else if (action === 'convert_symmetric') {
                nextPath = convertNodeType(target, selectedVectorNodeIds, 'symmetric');
              } else if (action === 'break_tangents') {
                const sel = new Set(selectedVectorNodeIds);
                nextPath = {
                  ...target,
                  nodes: target.nodes.map((n) =>
                    sel.has(n.id) ? { ...n, handlesBroken: true } : n
                  ),
                };
              } else if (action === 'join_tangents') {
                const sel = new Set(selectedVectorNodeIds);
                nextPath = {
                  ...target,
                  nodes: target.nodes.map((n) =>
                    sel.has(n.id) ? { ...n, handlesBroken: false, nodeType: 'smooth' } : n
                  ),
                };
              } else if (action === 'toggle_straight_curve') {
                nextPath = {
                  ...target,
                  mode: target.mode === 'straight' || target.mode === 'polyline' ? 'bezier' : 'polyline',
                  smoothing: target.mode === 'straight' ? 0.5 : target.smoothing,
                };
              } else if (action === 'align_x') {
                nextPath = alignSelectedNodes(target, selectedVectorNodeIds, 'centerX');
              } else if (action === 'align_y') {
                nextPath = alignSelectedNodes(target, selectedVectorNodeIds, 'centerY');
              } else if (action === 'distribute_h') {
                nextPath = distributeSelectedNodes(target, selectedVectorNodeIds, 'horizontal');
              } else if (action === 'distribute_v') {
                nextPath = distributeSelectedNodes(target, selectedVectorNodeIds, 'vertical');
              } else if (action === 'rotate_nodes_15' && target.nodes.length >= 2) {
                const cx = target.nodes.reduce((a, b) => a + b.x, 0) / target.nodes.length;
                const cy = target.nodes.reduce((a, b) => a + b.y, 0) / target.nodes.length;
                const rad = (15 * Math.PI) / 180;
                const c = Math.cos(rad);
                const s = Math.sin(rad);
                const rotPt = (px: number, py: number) => ({
                  x: cx + (px - cx) * c - (py - cy) * s,
                  y: cy + (px - cx) * s + (py - cy) * c,
                });
                nextPath = {
                  ...target,
                  nodes: target.nodes.map((n) => {
                    const p = rotPt(n.x, n.y);
                    const ih = n.inHandleX !== undefined && n.inHandleY !== undefined ? rotPt(n.inHandleX, n.inHandleY) : null;
                    const oh = n.outHandleX !== undefined && n.outHandleY !== undefined ? rotPt(n.outHandleX, n.outHandleY) : null;
                    return {
                      ...n,
                      x: p.x,
                      y: p.y,
                      inHandleX: ih?.x,
                      inHandleY: ih?.y,
                      outHandleX: oh?.x,
                      outHandleY: oh?.y,
                    };
                  }),
                };
              }
              onUpdateLayerVectorPaths(
                currentLayer.vectorPaths.map((p) => (p.id === target.id ? nextPath : p))
              );
            }}
            onConvertPath={(conv) => {
              if (!selectedVectorPathId || !currentLayer.vectorPaths) return;
              const target = currentLayer.vectorPaths.find((p) => p.id === selectedVectorPathId);
              if (target) onConvertVectorPath?.(target, conv);
            }}
            isDraftActive={Boolean(vectorDraftSession)}
            draftPhase={vectorDraftSession?.phase || null}
            draftMetrics={draftVectorMetrics}
            confirmPolicy={vectorConfirmPolicy}
            onChangeConfirmPolicy={onChangeVectorConfirmPolicy}
            showPixelPerfectPreview={showPixelPerfectVectorPreview}
            onTogglePixelPerfectPreview={onTogglePixelPerfectVectorPreview}
            onConfirmVector={handleConfirmVectorDraft}
            onCancelVector={handleCancelVectorDraft}
          />
        )}

      {/* Ask-before-confirm Modal when vectorConfirmPolicy === 'ask' — rendered on Global Top UI Layer */}
      <StudioTopLayerPortal
        isOpen={Boolean(vectorConfirmModalPath)}
        tier="critical"
        autoFocus
        ariaRole="alertdialog"
      >
        {vectorConfirmModalPath && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div
              className="w-full max-w-sm rounded-xl border p-4 shadow-2xl space-y-3"
              style={{
                backgroundColor: 'var(--studio-bg-panel)',
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Confirmar trazo vectorial</span>
                <button
                  type="button"
                  onClick={() => setVectorConfirmModalPath(null)}
                  className="p-1 rounded hover:bg-white/10"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] opacity-80 leading-relaxed">
                Elige cómo finalizar <strong>{vectorConfirmModalPath.name}</strong> ({vectorConfirmModalPath.nodes.length} nodos):
              </p>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => finalizeVectorPathWithMode(vectorConfirmModalPath, 'keep')}
                  className="w-full px-3 py-2 rounded-lg text-[11px] font-bold bg-sky-500/20 border border-sky-400/50 text-sky-300 hover:bg-sky-500/30 text-left"
                >
                  Mantener como Vector (No destructivo · Editable siempre)
                </button>
                <button
                  type="button"
                  onClick={() => finalizeVectorPathWithMode(vectorConfirmModalPath, 'rasterize')}
                  className="w-full px-3 py-2 rounded-lg text-[11px] font-bold bg-amber-500/20 border border-amber-400/50 text-amber-300 hover:bg-amber-500/30 text-left"
                >
                  Rasterizar a píxeles de la capa actual
                </button>
                <button
                  type="button"
                  onClick={() => setVectorConfirmModalPath(null)}
                  className="w-full px-3 py-1.5 rounded-lg text-[11px] border border-white/15 hover:bg-white/10"
                >
                  Seguir editando
                </button>
              </div>
            </div>
          </div>
        )}
      </StudioTopLayerPortal>

      {/* Traditional Pixel Text Tool Editor Bar with Min/Max Controls & 4 Preserved Fonts */}
      {activeTool === 'text' && textAnchor && (
        <div
          className="absolute bottom-14 left-1/2 -translate-x-1/2 z-30 border rounded-xl p-2.5 shadow-2xl flex flex-col gap-2 max-w-[95%] w-[min(680px,95%)] backdrop-blur-md"
          style={{
            backgroundColor: 'var(--studio-bg-panel)',
            borderColor: 'var(--studio-accent)',
            color: 'var(--studio-text)',
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold shrink-0" style={{ color: 'var(--studio-accent)' }}>
              <TypeIcon className="w-3.5 h-3.5" />
              <span>Texto ({textAnchor.x},{textAnchor.y})</span>
            </div>

            <textarea
              autoFocus
              rows={2}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  commitTextTool(false);
                } else if (e.key === 'Escape') {
                  setTextAnchor(null);
                  draftPixelsRef.current = [];
                }
              }}
              placeholder="Escribe texto multilínea (Ctrl+Enter estampa)..."
              className="flex-1 min-w-[160px] rounded-lg border px-2 py-1 text-xs font-mono resize-none focus:outline-none"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            />

            <select
              value={textFont}
              onChange={(e) => setTextFont(e.target.value as PixelTextFont)}
              className="rounded-lg border px-2 py-1 text-[11px] font-mono"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            >
              <option value="pixel_5x7">Pixel 5×7 Retro</option>
              <option value="pixel_3x5">Pixel Mini 3×5</option>
              <option value="arcade_bold">Arcade Bold</option>
              <option value="impact_hd">Impact Fighting</option>
            </select>

            <div className="flex items-center gap-1 shrink-0">
              {(['left', 'center', 'right'] as PixelTextAlign[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setTextAlign(a)}
                  className="px-1.5 py-1 rounded border text-[10px] font-mono"
                  style={{
                    backgroundColor: textAlign === a ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                    color: textAlign === a ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                    borderColor: textAlign === a ? 'var(--studio-accent)' : 'var(--studio-border-strong)',
                  }}
                >
                  {a === 'left' ? 'Izq' : a === 'center' ? 'Cen' : 'Der'}
                </button>
              ))}
            </div>
          </div>

          {/* Min / Max Numeric Ranges + Effects */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
            <div className="flex flex-wrap items-center gap-2 tabular-nums">
              <div className="w-36" title="Escala mínima 1x hasta 24x (editable manualmente hasta 48x)">
                <StudioSlider
                  variant="compact"
                  label="Escala"
                  value={textScale}
                  min={1}
                  max={24}
                  step={1}
                  defaultValue={1}
                  unit="x"
                  allowManualOverflow
                  hardMax={48}
                  onChange={(v) => setTextScale(Math.max(1, Math.min(48, Math.round(v))))}
                />
              </div>

              <label className="flex items-center gap-1" title="Ancho máximo de caja en píxeles (ajuste automático de líneas)">
                <span style={{ color: 'var(--studio-text-muted)' }}>W Máx:</span>
                <input
                  type="number"
                  min={8}
                  max={width}
                  value={textMaxWidth}
                  onChange={(e) => setTextMaxWidth(Math.max(8, Math.min(width, parseInt(e.target.value, 10) || width)))}
                  className="w-12 px-1 py-0.5 rounded border text-center"
                  style={{
                    backgroundColor: 'var(--studio-bg-elevated)',
                    borderColor: 'var(--studio-border-strong)',
                    color: 'var(--studio-text)',
                  }}
                />
              </label>

              <label className="flex items-center gap-1" title="Alto máximo de caja en píxeles">
                <span style={{ color: 'var(--studio-text-muted)' }}>H Máx:</span>
                <input
                  type="number"
                  min={5}
                  max={height}
                  value={textMaxHeight}
                  onChange={(e) => setTextMaxHeight(Math.max(5, Math.min(height, parseInt(e.target.value, 10) || height)))}
                  className="w-12 px-1 py-0.5 rounded border text-center"
                  style={{
                    backgroundColor: 'var(--studio-bg-elevated)',
                    borderColor: 'var(--studio-border-strong)',
                    color: 'var(--studio-text)',
                  }}
                />
              </label>

              <label className="flex items-center gap-1" title="Espaciado entre letras (-2 a 32)">
                <span style={{ color: 'var(--studio-text-muted)' }}>Esp:</span>
                <input
                  type="number"
                  min={-2}
                  max={32}
                  value={textLetterSpacing}
                  onChange={(e) => setTextLetterSpacing(Math.max(-2, Math.min(32, parseInt(e.target.value, 10) || 0)))}
                  className="w-11 px-1 py-0.5 rounded border text-center"
                  style={{
                    backgroundColor: 'var(--studio-bg-elevated)',
                    borderColor: 'var(--studio-border-strong)',
                    color: 'var(--studio-text)',
                  }}
                />
              </label>

              <label className="flex items-center gap-1" title="Interlineado extra (0 a 128)">
                <span style={{ color: 'var(--studio-text-muted)' }}>Int:</span>
                <input
                  type="number"
                  min={0}
                  max={128}
                  value={textLineHeight}
                  onChange={(e) => setTextLineHeight(Math.max(0, Math.min(128, parseInt(e.target.value, 10) || 0)))}
                  className="w-11 px-1 py-0.5 rounded border text-center"
                  style={{
                    backgroundColor: 'var(--studio-bg-elevated)',
                    borderColor: 'var(--studio-border-strong)',
                    color: 'var(--studio-text)',
                  }}
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={textOutline}
                  onChange={(e) => setTextOutline(e.target.checked)}
                  className="accent-amber-400"
                />
                <span>Contorno</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={textShadow}
                  onChange={(e) => setTextShadow(e.target.checked)}
                  className="accent-amber-400"
                />
                <span>Sombra</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={textGradient}
                  onChange={(e) => setTextGradient(e.target.checked)}
                  className="accent-amber-400"
                />
                <span>Degradado</span>
              </label>

              <button
                type="button"
                disabled={currentLayer.locked || currentLayer.layerType === 'adjustment'}
                onClick={() => commitTextTool(false)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 disabled:opacity-40"
                style={{
                  backgroundColor: 'var(--studio-accent)',
                  color: 'var(--studio-accent-text)',
                }}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Estampar</span>
              </button>

              {onCreateTextLayer && (
                <button
                  type="button"
                  onClick={() => commitTextTool(true)}
                  className="px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1"
                  style={{
                    backgroundColor: 'var(--studio-bg-elevated)',
                    borderColor: 'var(--studio-border-strong)',
                    color: 'var(--studio-text)',
                  }}
                >
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  <span>+ Capa</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setTextAnchor(null);
                  draftPixelsRef.current = [];
                }}
                className="p-1 rounded hover:opacity-80"
                style={{ color: 'var(--studio-text-muted)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Canvas Playback Indicator */}
      {isPlaying && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-[#161a26]/95 border border-amber-400/70 px-4 py-1.5 rounded-full shadow-2xl flex items-center gap-2.5 font-mono text-xs text-amber-300 pointer-events-none backdrop-blur-md">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <span className="font-bold">REPRODUCIENDO EN LIENZO</span>
          <span className="text-[10px] text-slate-400">· Enter o Clic para pausar</span>
        </div>
      )}

      {/* Mini Preview Player with Hitstop indicator */}
      {showMiniPlayer && (
        <div className="absolute top-3 right-3 bg-[#131620]/95 backdrop-blur-md border border-[#262e42] rounded-xl p-2.5 shadow-2xl flex flex-col items-center gap-2 z-20">
          <div className="flex items-center justify-between w-full gap-2 border-b border-[#22293b] pb-1.5">
            <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400 font-semibold flex items-center gap-1">
              <span>Preview</span>
              {combatFx.hitstop && (
                <span className="text-rose-400 text-[9px] font-bold">[Hitstop]</span>
              )}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPreviewScale((s) => (s === 1 ? 2 : s === 2 ? 3 : 1))}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#1c2233] text-amber-400 hover:bg-[#262f47]"
              >
                {previewScale}x
              </button>
              <button
                onClick={() => setShowMiniPlayer(false)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#22293b]"
              >
                <EyeOff className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div 
            className="canvas-checkerboard rounded border border-[#2e374d] overflow-hidden flex items-center justify-center p-1"
            style={{
              width: width * previewScale + 8,
              height: height * previewScale + 8,
            }}
          >
            <canvas
              ref={previewCanvasRef}
              width={width * previewScale}
              height={height * previewScale}
              className="pixel-canvas block"
            />
          </div>

          <button
            onClick={onTogglePlay}
            className={`w-full py-1 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              isPlaying
                ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                : 'bg-[#22293d] text-slate-200 hover:bg-[#2c364f]'
            }`}
          >
            {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
            <span className="text-[11px]">{isPlaying ? 'Pausar' : 'Reproducir'}</span>
          </button>
        </div>
      )}

      {/* Pro Eyedropper Floating HUD + Loupe + Smart Palette */}
      {activeTool === 'eyedropper' && hoveredSample && eyedropperScreenPos && (() => {
        const delta = computeColorDelta(primaryColor, hoveredSample.hex);
        const boxW = 246;
        const boxH = 225;
        const cw = containerRef.current?.clientWidth || 800;
        const ch = containerRef.current?.clientHeight || 600;
        const left = eyedropperScreenPos.x + 22 + boxW > cw ? Math.max(8, eyedropperScreenPos.x - boxW - 18) : eyedropperScreenPos.x + 22;
        const top = eyedropperScreenPos.y + 16 + boxH > ch ? Math.max(8, eyedropperScreenPos.y - boxH - 12) : eyedropperScreenPos.y + 16;

        return (
          <div
            className="pointer-events-none absolute z-40 rounded-xl border shadow-2xl p-2 flex flex-col gap-1.5 backdrop-blur-md"
            style={{
              left,
              top,
              width: boxW,
              backgroundColor: 'rgba(13, 17, 28, 0.94)',
              borderColor: 'var(--studio-border-strong)',
              color: 'var(--studio-text)',
            }}
          >
            {/* Top Split: Magnified Loupe + Current vs New + Deltas */}
            <div className="flex items-start gap-2">
              <div className="rounded border border-amber-400/50 overflow-hidden shrink-0 bg-[#0b0e17]">
                <canvas ref={loupeCanvasRef} width={80} height={80} className="block pixel-canvas" />
                <div className="text-[8px] font-mono text-center bg-black/70 text-amber-300 py-0.5">
                  Lupa {effEyedropperConfig.loupeZoom}× · {effEyedropperConfig.pixelArtMode ? 'PxArt' : effEyedropperConfig.sampleMode}
                </div>
              </div>

              <div className="flex-1 min-w-0 flex flex-col gap-1 text-[9px] font-mono">
                {/* Color Split Ring */}
                <div className="flex items-center gap-1.5">
                  <div className="flex h-6 w-12 rounded overflow-hidden border border-white/20 shrink-0">
                    <div className="flex-1" style={{ backgroundColor: primaryColor }} title="Actual" />
                    <div className="flex-1" style={{ backgroundColor: hoveredSample.hex }} title="Muestra" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-amber-300 truncate">{hoveredSample.hex.toUpperCase()}</div>
                    <div className="text-[8px] text-slate-400">
                      ΔE:{delta.dE} · ΔH:{delta.dH}° · ΔV:{delta.dV}%
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-0.5 text-[8.5px] text-slate-300 bg-black/30 rounded p-1 border border-white/5">
                  <div>RGB({hoveredSample.r}, {hoveredSample.g}, {hoveredSample.b})</div>
                  <div>HSV({hoveredSample.h}°, {hoveredSample.s}%, {hoveredSample.v}%)</div>
                  <div>HSL-L:{hoveredSample.hslL}% · A:{Math.round(hoveredSample.alpha * 100)}% {hoveredSample.paletteIndex >= 0 ? `· Idx #${hoveredSample.paletteIndex}` : ''}</div>
                </div>
              </div>
            </div>

            {/* Smart Palette Preview (2 Darker, 2 Lighter, Palette Related) */}
            <div className="flex items-center justify-between gap-1 pt-1 border-t border-white/10">
              <span className="text-[8px] font-mono uppercase text-slate-400">Tonos:</span>
              <div className="flex items-center gap-1">
                {hoveredSample.shadesDarker.map((c, i) => (
                  <span key={`sd-${i}`} className="w-3.5 h-3.5 rounded border border-white/20" style={{ backgroundColor: c }} />
                ))}
                <span className="w-4 h-4 rounded border-2 border-amber-400" style={{ backgroundColor: hoveredSample.hex }} />
                {hoveredSample.shadesLighter.map((c, i) => (
                  <span key={`sl-${i}`} className="w-3.5 h-3.5 rounded border border-white/20" style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>

            {colorHistory.length > 0 && (
              <div className="flex items-center gap-1 pt-0.5">
                <span className="text-[8px] font-mono text-slate-500">Hist:</span>
                {colorHistory.slice(0, 7).map((c, idx) => (
                  <span key={`ch-${idx}`} className="w-2.5 h-2.5 rounded-xs border border-white/15" style={{ backgroundColor: c }} />
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Smart Move Floating Disambiguation Menu (Overlapping Objects Portal) */}
      {moveDisambigMenu &&
        createPortal(
          <div
            className="fixed w-64 rounded-xl border shadow-2xl p-1.5 flex flex-col gap-0.5 backdrop-blur-md"
            style={{
              zIndex: STUDIO_Z.CONTEXT_MENU,
              left: Math.min(window.innerWidth - 270, Math.max(8, moveDisambigMenu.clientX + 8)),
              top: Math.min(window.innerHeight - 240, Math.max(8, moveDisambigMenu.clientY + 8)),
              backgroundColor: 'var(--studio-bg-panel)',
              borderColor: 'var(--studio-accent)',
              color: 'var(--studio-text)',
            }}
            onMouseDown={(ev) => ev.stopPropagation()}
          >
            <div
              className="px-2 py-1 text-[9px] font-mono uppercase tracking-wider border-b mb-0.5 flex items-center justify-between"
              style={{ borderColor: 'var(--studio-border)', color: 'var(--studio-text-muted)' }}
            >
              <span>Elementos superpuestos</span>
              <button
                type="button"
                onClick={() => setMoveDisambigMenu(null)}
                className="hover:opacity-100 opacity-70"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            {moveDisambigMenu.candidates.map((cand) => {
              const CandIcon =
                cand.kind === 'reference'
                  ? ImageIcon
                  : cand.kind === 'vector'
                  ? Spline
                  : cand.kind === 'hitbox'
                  ? BoxSelect
                  : cand.kind === 'pivot'
                  ? Crosshair
                  : cand.kind === 'selection'
                  ? Focus
                  : Layers;
              return (
                <button
                  key={cand.id}
                  type="button"
                  onClick={() => {
                    if (cand.kind === 'reference' && cand.targetId) {
                      onSelectReference?.(cand.targetId);
                      onBringReferenceToFront?.(cand.targetId);
                      onChangeMoveSubTool?.('move_reference');
                    } else if (cand.kind === 'vector' && cand.targetId) {
                      const found = (currentLayer.vectorPaths || []).find((p) => p.id === cand.targetId);
                      onSelectVectorPathId?.(cand.targetId);
                      if (found) onSelectVectorNodeIds?.(found.nodes.map((n) => n.id));
                      onChangeMoveSubTool?.('direct_select');
                    } else if (cand.kind === 'hitbox' && cand.targetId) {
                      setSelectedHitboxId(cand.targetId);
                    } else if (cand.kind === 'selection') {
                      onChangeMoveSubTool?.('move_selection');
                    } else if (cand.kind === 'layer') {
                      onChangeMoveSubTool?.('move_layer');
                    } else if (cand.kind === 'pivot') {
                      onUpdatePivot(moveDisambigMenu.gridCoord);
                    }
                    setMoveDisambigMenu(null);
                  }}
                  className="px-2 py-1.5 rounded-lg text-left flex items-center gap-2 hover:bg-white/10 transition-colors"
                >
                  <CandIcon className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--studio-accent)' }} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-semibold truncate">{cand.label}</span>
                    <span className="text-[9px] truncate" style={{ color: 'var(--studio-text-muted)' }}>
                      {cand.detail}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>,
          document.body
        )}

      {/* Live Brush Footprint Preview HUD while adjusting brush parameters */}
      {showBrushPreviewHud && !isDrawing && (
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[48] px-3 py-2.5 rounded-xl border shadow-2xl backdrop-blur-md flex flex-col items-center gap-1.5 transition-opacity"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--studio-bg-panel) 92%, transparent)',
            borderColor: 'var(--studio-accent)',
            color: 'var(--studio-text)',
          }}
        >
          <div
            className="w-24 h-24 rounded-lg border canvas-checkerboard flex items-center justify-center overflow-hidden"
            style={{ borderColor: 'var(--studio-border-strong)' }}
          >
            <canvas
              ref={brushPreviewCanvasRef}
              width={96}
              height={96}
              className="w-24 h-24 pixel-canvas"
            />
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono tabular-nums">
            <span className="font-bold" style={{ color: 'var(--studio-accent)' }}>
              {effectivePreviewBrushSize}px
            </span>
            <span style={{ color: 'var(--studio-text-muted)' }}>
              Dur {Math.round(brushSettings.hardness * 100)}%
            </span>
            <span style={{ color: 'var(--studio-text-muted)' }}>
              Opac {Math.round(brushSettings.opacity * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
