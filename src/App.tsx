import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FileText, Plus, X, Upload, Maximize2 } from 'lucide-react';
import { TopBar } from './components/TopBar';
import { PixelClashLogoIcon } from './components/PixelClashLogoIcon';
import { MenuBar, ImportMenuMode } from './components/MenuBar';
import { ToolOptionsBar } from './components/ToolOptionsBar';
import { SmartImportDestination, SmartImportFitMode, SmartImportModal } from './components/SmartImportModal';
import { Toolbar } from './components/Toolbar';
import { CanvasViewport } from './components/CanvasViewport';
import { Timeline } from './components/Timeline';
import { RightSidebar } from './components/RightSidebar';
import { ExportModal, ExportModalTab } from './components/ExportModal';
import { CanvasSizeModal } from './components/CanvasSizeModal';
import { ImageSizeModal } from './components/ImageSizeModal';
import { NewProjectModal, NewProjectTemplateCategory } from './components/NewProjectModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { ToolGuideModal } from './components/ToolGuideModal';
import { WhatIsThisOverlay } from './components/WhatIsThisOverlay';
import { LospecPaletteModal } from './components/LospecPaletteModal';
import { LocalInstallerModal } from './components/LocalInstallerModal';
import { SpriteSheetTemplateModal } from './components/SpriteSheetTemplateModal';
import { WorkspaceLayoutModal } from './components/WorkspaceLayoutModal';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { AltShortcutsOverlay } from './components/AltShortcutsOverlay';
import { AiInsertDestinationModal } from './components/AiInsertDestinationModal';
import { ApplyPoseModal } from './components/ApplyPoseModal';
import { DummiePosePanel } from './components/DummiePosePanel';
import { SmartDeleteModal } from './components/SmartDeleteModal';
import { GuidesManagerModal } from './components/GuidesManagerModal';
import { FxInjectionPayload, FxStudioModal } from './components/FxStudioModal';
import {
  FileLoadErrorModal,
  FileLoadErrorPayload,
  ImportResolutionMismatchModal,
  MissingRecentFileModal,
  PsdCompatibilityReportModal,
  SpritesheetDetectedPromptModal,
  SpritesheetSlicerModal,
} from './components/FileRecoveryAndSheetModals';
import { SmartPasteModal } from './components/SmartPasteModal';
import {
  ModifiedDocumentSummary,
  SaveAsFormatModal,
  UnsavedAppCloseModal,
  UnsavedDocumentCloseModal,
} from './components/DocumentCloseAndSaveModals';
import {
  StudioAlertNotificationHost,
  StudioNotificationItem,
  StudioTopLayerPortal,
  classifyNotificationSeverity,
} from './components/StudioTopLayer';
import { HomeScreen, HomeScreenSection } from './components/HomeScreen';
import { SplashLoadingScreen } from './components/SplashLoadingScreen';
import { DEFAULT_BRUSH_SETTINGS } from './components/BrushSettingsPanel';
import { createDefaultFighterFrames } from './constants/defaultFighter';
import { computeFrameLayerTrackKeys } from './utils/layerTracks';
import { FIGHTING_GAME_PALETTES } from './constants/palettes';
import {
  DEFAULT_WORKSPACE_LAYOUT,
  DockOrientation,
  DockTabGroupConfig,
  FloatingPanelState,
  PANEL_REGISTRY,
  PanelCollapseDisplayMode,
  PanelDockZone,
  RightPanelConfig,
  RightPanelId,
  STUDIO_MONO_FONTS,
  STUDIO_THEMES,
  STUDIO_UI_FONTS,
  SavedCustomLayout,
  StudioStyleConfig,
  UI_STYLE_PRESETS,
  WORKSPACE_TEMPLATES,
  WorkspaceLayoutConfig,
  loadSavedCustomLayouts,
  loadStudioStyle,
  loadWorkspaceLayout,
  parsePcsLayoutFile,
  saveCustomLayouts,
  saveStudioStyle,
  saveWorkspaceLayout,
} from './constants/workspaceThemes';
import { 
  ActionTag, 
  ActiveFilterBarSession,
  AiInsertConfig,
  AnimationClip, 
  AssetCategory,
  AssetLibraryItem,
  BrushSettings,
  BucketSubTool,
  BucketToolOptions,
  CameraKeyframe,
  CameraShakeConfig,
  CanvasEditConfig,
  CanvasEditRect,
  CanvasGuide,
  ClipboardData,
  ClipboardFitMode,
  ClipboardPasteDestination,
  CombatFxConfig,
  DitherConfig,
  DummyOpponent,
  DummieApplyConfig,
  DummiePose,
  EditableFxRecipe,
  EraserToolOptions,
  EyedropperConfig,
  FightingGameProfileId,
  Frame,
  FramePhase,
  GradientConfig,
  GroundConfig,
  GuidePresetKind,
  GuidesConfig,
  GuidesModalTab,
  Hitbox, 
  HitboxType, 
  InterpolationMode,
  LassoMode,
  Layer, 
  LayerAdjustmentConfig,
  LayerGroup,
  LayerKeyframe,
  LayerMaskType,
  LayerType,
  MacroStep,
  MagicWandOptions,
  MoveSubTool,
  MoveToolOptions,
  NewProjectConfig,
  OptionsBarState,
  ParametricShapeObject,
  PencilBrushSubMode,
  PerformanceMode,
  PerspectiveGuideType,
  ProjectState,
  ProjectWorkMode,
  PureRefConfig,
  QuickAiBarOptions,
  RecentProjectEntry,
  RecentProjectFileFormat,
  RecordedMacro,
  ReferenceGroup,
  ReferenceItem,
  ResolutionMismatchAction,
  RulerUnit,
  SampledColorInfo,
  SaveAsFormatId,
  ScenarioGuidePresetId,
  SelectionArea,
  SelectionDisplayConfig,
  SelectionSubTool,
  SelectionToolOptions,
  ShapeRasterConfirmMode,
  ShapeToolConfig,
  ShortcutBinding,
  ShortcutProfileId,
  SmartDeleteCandidate,
  StageBuilderRole,
  StageParallaxConfig,
  StageType,
  StartupPreferences,
  SymmetryConfig,
  TilesetCollection,
  TilesetWorkspaceConfig,
  TileToolConfig,
  TimelineMarker,
  ToolType,
  TransformActionId,
  TransformMode,
  TransformParameters,
  TransformSnapConfig,
  UniversalSearchItem,
  VectorPath,
  VectorRasterConfirmMode,
  VectorToolConfig,
  WheelNavigationMode,
  ZoomCommand,
  ZoomToolMode
} from './types';
import {
  FIGHTING_GAME_PROFILES,
  buildFightingProfileGuides,
} from './utils/fightingGameProfiles';
import {
  captureTilePixelsFromGrid,
  createDefaultTilesetLibrary,
  DEFAULT_TILE_TOOL_CONFIG,
} from './utils/tilesetEngine';
import {
  DEFAULT_STAGE_PARALLAX_CONFIG,
  DEFAULT_TILESET_CONFIG,
  WORK_MODES_REGISTRY,
  WORK_MODE_ORDER,
  buildModeTemplateLayers,
  generateModeGuides,
} from './utils/workModesEngine';
import {
  PERSPECTIVE_TYPE_META,
  SCENARIO_GUIDE_PRESETS,
  createGuidePreset,
  createVanishingPointsForType,
  getDefaultAxonometricAngles,
  loadGuidesConfig,
  renderProjectThumbnailDataUrl,
  saveGuidesConfig,
} from './utils/guidesEngine';
import {
  DEFAULT_BUCKET_OPTIONS,
  DEFAULT_ERASER_OPTIONS,
  DEFAULT_GRADIENT_CONFIG,
  DEFAULT_MAGIC_WAND_OPTIONS,
  DEFAULT_MOVE_OPTIONS,
  DEFAULT_QUICK_AI_OPTIONS,
  DEFAULT_SELECTION_OPTIONS,
  DEFAULT_SHAPE_CONFIG,
  generateQuickAiSpriteGrid,
  loadOptionsBarState,
  loadSelectionDisplayConfig,
  morphSelectionMask,
  saveOptionsBarState,
  saveSelectionDisplayConfig,
} from './utils/toolEngines';
import {
  SHAPE_KIND_LABELS,
  rasterizeParametricShapeToGrid,
  syncShapeConfigFromObject,
} from './utils/parametricShapeEngine';
import { HelpCatalogItem } from './utils/helpCatalog';
import {
  buildProfileBindings,
  loadRecordedMacros,
  loadShortcutBindings,
  loadShortcutProfile,
  matchesShortcutEvent,
  saveRecordedMacros,
  saveShortcutBindings,
  saveShortcutProfile,
} from './utils/shortcutsRegistry';
import { DEFAULT_EYEDROPPER_CONFIG } from './utils/eyedropperEngine';
import {
  applyPresetToDummiePose,
  generateDummiePoseFromImageDataUrl,
  interpolateDummiePoses,
  retargetSpriteGridToPose,
} from './utils/dummieRigEngine';
import {
  analyzeProjectContext,
  pixelsToGrid,
  validateAndCleanAiPixelGrid,
} from './utils/projectContextAi';
import {
  applyHQScaleInCanvas,
  applyTransformToGrid,
  applyTransformWithOffCanvas,
  centerGridInCanvas,
  computeGridContentBounds,
  computeMultiLayerBounds,
  computeVectorPathsBounds,
  createInitialTransformParams,
  flipGridH,
  flipGridV,
  rotateGridOrthogonal,
  snapGridContentToGrid,
  transformVectorPath,
} from './utils/transformEngine';
import {
  pathToSelectionArea,
  rasterizeVectorPathsToGrid,
} from './utils/vectorCurveEngine';
import {
  DEFAULT_DITHER_CONFIG,
  DEFAULT_SYMMETRY_CONFIG,
  blendHexColors,
  compositeFrame,
  createEmptyGrid,
  createMaskGrid,
  frameToCanvas,
  getFrameDurationMs,
  resolveMaskAlpha,
  shiftLayerPixelsNonDestructive,
} from './utils/pixelMath';
import {
  DEFAULT_ADJUSTMENT_CONFIG,
  FILTER_GALLERY_PRESETS,
  FilterGalleryPresetId,
  applyAdjustmentToGrid,
  applyGalleryFilterToGrid,
} from './utils/colorFilters';
import {
  BUILTIN_ASSET_PRESETS,
  loadAssetFolders,
  loadUserAssetLibrary,
  saveAssetFolders,
  saveUserAssetLibrary,
} from './utils/assetLibraryPresets';
import {
  DecodedRgbaImage,
  FileLoadError,
  ImportResult,
  SUPPORTED_IMAGE_ACCEPT,
  SUPPORTED_OPEN_ACCEPT,
  SpritesheetCandidateInfo,
  SpritesheetSliceOptions,
  decodeAnyRasterFileToRgba,
  decodeFilePreviewDataUrl,
  detectSpritesheetCandidate,
  importGraphicFile,
  isSupportedImageFile,
  normalizeFileFormatTag,
  rasterizeImageFileToTargetGrid,
  rgbaBufferToPixelGrid,
  sliceRgbaToSpritesheetResult,
  validateDocumentFramesIntegrity,
} from './utils/fileImporter';
import {
  PsdCompatibilityReport,
  PsdRecoveryMode,
  recordFileFailureDiagnostic,
} from './utils/fileDiagnostics';
import {
  clearAllRecentProjectPayloads,
  deleteRecentProjectPayload,
  getRecentProjectPayload,
  pruneRecentProjectPayloads,
  saveRecentProjectPayload,
} from './utils/recentProjectsDb';
import {
  downloadBlob,
  downloadUint8Array,
  exportProjectAsAse,
  exportProjectAsPcs,
  exportProjectAsPsd,
  exportProjectToFormat,
} from './utils/fileExporter';
import { gridHasTransparency, scheduleIdleTask } from './utils/renderCache';
import {
  ClipboardImagePayload,
  rasterizeClipboardImageToGrid,
  readImageFromClipboardEvent,
  readImageFromGlobalClipboard,
  writePixelGridToSystemClipboard,
} from './utils/systemClipboard';
import { getDesktopBridge } from './utils/desktopBridge';
import { 
  AnchorPosition, 
  applyCanvasRectTransform,
  computeAllFramesContentBounds,
  flipCanvasHorizontal, 
  flipCanvasVertical, 
  rescaleSpriteGrid, 
  resizeCanvasGrid, 
  rotateCanvasClockwise 
} from './utils/imageTransforms';
import {
  CustomBrushPreset,
  loadCustomBrushPresets,
  parseBrushFromFile,
  saveCustomBrushPresets,
} from './utils/customBrushStorage';
import { parseAnyLospecText } from './utils/lospecImporter';
import {
  TiledLayerStore,
  isLayerTiled,
  registerTiledStore,
  shouldUseTiledStorage,
} from './utils/tiledImageEngine';
import {
  loadStartupPreferences,
  saveStartupPreferences,
} from './utils/startupPreferences';
import { detectHardwareCapabilities } from './utils/canvasMemoryEstimator';

interface OpenDocumentSnapshot {
  name: string;
  width: number;
  height: number;
  frames: Frame[];
  currentFrameIndex: number;
  currentLayerIndex: number;
  layerGroups: LayerGroup[];
  globalPivot: { x: number; y: number };
  actionTags: ActionTag[];
  playbackMode: 'loop' | 'pingpong' | 'once';
  fps: number;
  references: ReferenceItem[];
  referenceGroups: ReferenceGroup[];
  timelineMarkers: TimelineMarker[];
  cameraShake: CameraShakeConfig;
  cameraKeyframes: CameraKeyframe[];
  activePaletteColors: string[];
  guides?: CanvasGuide[];
  workMode?: ProjectWorkMode;
}

function formatRecentDate(timestamp?: number): string {
  const date =
    typeof timestamp === 'number' && Number.isFinite(timestamp) && timestamp > 0
      ? new Date(timestamp)
      : new Date();
  return date.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
}

interface PendingSpritesheetOpenState {
  file: File;
  fileName: string;
  rawRaster: DecodedRgbaImage;
  candidate: SpritesheetCandidateInfo;
  fallbackSingleResult: ImportResult | null;
  diskPath?: string;
  fileHandle?: FileSystemFileHandle;
  replaceRecentId?: string;
  allowOpenAsSingleImage: boolean;
}

interface PendingResolutionMismatchState {
  files: File[];
  mode: ImportMenuMode;
  fileName: string;
  sourceWidth: number;
  sourceHeight: number;
  sourceDpi: number;
  previewDataUrl: string | null;
}

const RECENT_SNAPSHOTS_STORAGE_KEY = 'pixelclash_recent_snapshots_v1';
const WHEEL_NAV_STORAGE_KEY = 'pixelclash_wheel_nav_v1';
const PERF_MODE_STORAGE_KEY = 'pixelclash_perf_mode_v1';
const QUICK_PASTE_STORAGE_KEY = 'pixelclash_quick_paste_v1';

function computeRgbaQuickSignature(data: Uint8ClampedArray, width: number, height: number): string {
  let hash = 2166136261 >>> 0;
  const len = data.length;
  const step = Math.max(4, Math.floor(len / 4096) * 4);
  for (let i = 0; i < len; i += step) {
    hash ^= data[i];
    hash = Math.imul(hash, 16777619) >>> 0;
    hash ^= data[i + 1];
    hash = Math.imul(hash, 16777619) >>> 0;
    hash ^= data[i + 2];
    hash = Math.imul(hash, 16777619) >>> 0;
    hash ^= data[i + 3];
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return `${width}x${height}:${hash.toString(16)}`;
}

function computePixelGridQuickSignature(grid: (string | null)[][], width: number, height: number): string {
  const tmp = document.createElement('canvas');
  tmp.width = Math.max(1, width);
  tmp.height = Math.max(1, height);
  const ctx = tmp.getContext('2d', { willReadFrequently: true });
  if (!ctx) return `${width}x${height}:0`;
  for (let y = 0; y < height; y++) {
    const row = grid[y];
    if (!row) continue;
    for (let x = 0; x < width; x++) {
      const col = row[x];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const rgba = ctx.getImageData(0, 0, tmp.width, tmp.height).data;
  return computeRgbaQuickSignature(rgba, tmp.width, tmp.height);
}

function readRecentSnapshotsMap(): Record<string, OpenDocumentSnapshot> {
  try {
    const raw = localStorage.getItem(RECENT_SNAPSHOTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeRecentSnapshot(id: string, snap: OpenDocumentSnapshot, keepIds: string[]): void {
  try {
    const current = readRecentSnapshotsMap();
    current[id] = snap;
    const pruned: Record<string, OpenDocumentSnapshot> = {};
    const orderedKeys = [id, ...keepIds.filter((k) => k !== id && Boolean(current[k]))].slice(0, 4);
    for (const k of orderedKeys) {
      if (current[k]) pruned[k] = current[k];
    }
    localStorage.setItem(RECENT_SNAPSHOTS_STORAGE_KEY, JSON.stringify(pruned));
  } catch {
    // Primary persistence is handled by IndexedDB (recentProjectsDb.ts); ignore legacy localStorage quota
  }
}

function removeRecentSnapshot(id: string): void {
  void deleteRecentProjectPayload(id);
  try {
    const current = readRecentSnapshotsMap();
    if (current[id]) {
      delete current[id];
      localStorage.setItem(RECENT_SNAPSHOTS_STORAGE_KEY, JSON.stringify(current));
    }
  } catch {
    // ignore
  }
}

interface DocumentTabEntry {
  id: string;
  name: string;
  width: number;
  height: number;
  snapshot: OpenDocumentSnapshot | null;
  isDirty: boolean;
  isNewUnsaved: boolean;
  hasSavedLocation: boolean;
  savedFormat?: SaveAsFormatId;
  filePath?: string;
}

async function rasterizeImageFileToGrid(
  file: File,
  targetW: number,
  targetH: number,
  fitMode: SmartImportFitMode = 'original',
  interpolation: InterpolationMode = 'nearest'
): Promise<{
  grid: (string | null)[][];
  tiledStoreId?: string;
  naturalWidth: number;
  naturalHeight: number;
  dpi: number;
  dataUrl: string;
}> {
  return rasterizeImageFileToTargetGrid(file, targetW, targetH, fitMode, interpolation);
}

async function extractPaletteFromImageFile(file: File, maxColors: number = 32): Promise<string[]> {
  const { grid } = await rasterizeImageFileToGrid(file, 96, 96, 'fit');
  const counts = new Map<string, number>();
  for (const row of grid) {
    for (const col of row) {
      if (!col) continue;
      const key = col.toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxColors)
    .map(([hex]) => hex);
}

function getAcceptForImportMode(mode: ImportMenuMode | null): string {
  switch (mode) {
    case 'palette':
      return `.hex,.gpl,.pal,.txt,${SUPPORTED_IMAGE_ACCEPT}`;
    case 'config':
      return '.pcslayout,.pcsshortcuts,.json';
    case 'brush':
      return `.pcsbrush,.json,${SUPPORTED_IMAGE_ACCEPT}`;
    case 'external_project':
      return '.pcs,.ase,.aseprite,.psd,.psb,.json,.gif,.tif,.tiff';
    case 'spritesheet':
      return SUPPORTED_IMAGE_ACCEPT;
    default:
      return SUPPORTED_IMAGE_ACCEPT;
  }
}

export default function App() {
  const [projectName, setProjectName] = useState<string>('K.O. Fighter');
  // Canvas Dimensions (64x64 high-detail Fighting Game Demo Character)
  const [canvasWidth, setCanvasWidth] = useState<number>(64);
  const [canvasHeight, setCanvasHeight] = useState<number>(64);

  // Layer Folders + Retro Fighting Movement Groups (8 complete demo animations, 32 frames)
  const [layerGroups, setLayerGroups] = useState<LayerGroup[]>([
    {
      id: 'folder-fx',
      name: 'FX y Escena',
      color: '#a855f7',
      category: 'VFX',
      frameIndices: [],
      collapsed: false,
      visible: true,
      locked: false,
      playbackMode: 'loop',
      fps: 12,
    },
    {
      id: 'folder-character',
      name: 'Personaje · Kaito',
      color: '#3b82f6',
      category: 'Idle',
      frameIndices: [],
      collapsed: false,
      visible: true,
      locked: false,
      playbackMode: 'loop',
      fps: 12,
    },
    {
      id: 'group-idle',
      name: '[Idle] Guardia',
      color: '#3b82f6',
      category: 'Idle',
      frameIndices: [0, 1, 2, 3],
      collapsed: false,
      visible: true,
      locked: false,
      playbackMode: 'pingpong',
      fps: 10,
    },
    {
      id: 'group-walk',
      name: '[Walk] Caminata',
      color: '#10b981',
      category: 'Movement',
      frameIndices: [4, 5, 6, 7, 8, 9],
      collapsed: true,
      visible: true,
      locked: false,
      playbackMode: 'loop',
      fps: 12,
    },
    {
      id: 'group-run',
      name: '[Run] Carrera',
      color: '#06b6d4',
      category: 'Movement',
      frameIndices: [10, 11, 12, 13],
      collapsed: true,
      visible: true,
      locked: false,
      playbackMode: 'loop',
      fps: 14,
    },
    {
      id: 'group-jump',
      name: '[Jump] Salto',
      color: '#8b5cf6',
      category: 'Movement',
      frameIndices: [14, 15, 16, 17],
      collapsed: true,
      visible: true,
      locked: false,
      playbackMode: 'once',
      fps: 10,
    },
    {
      id: 'group-crouch',
      name: '[Agachado] Guardia Baja',
      color: '#14b8a6',
      category: 'Movement',
      frameIndices: [18, 19, 20],
      collapsed: true,
      visible: true,
      locked: false,
      playbackMode: 'pingpong',
      fps: 10,
    },
    {
      id: 'group-light',
      name: '[Ataque Ligero] Jab',
      color: '#f59e0b',
      category: 'Normal',
      frameIndices: [21, 22, 23],
      collapsed: true,
      visible: true,
      locked: false,
      playbackMode: 'once',
      fps: 14,
    },
    {
      id: 'group-heavy',
      name: '[Ataque Fuerte] Dragón',
      color: '#f97316',
      category: 'Normal',
      frameIndices: [24, 25, 26, 27],
      collapsed: true,
      visible: true,
      locked: false,
      playbackMode: 'once',
      fps: 12,
    },
    {
      id: 'group-special',
      name: '[Especial] Onda Ki',
      color: '#a855f7',
      category: 'Special',
      frameIndices: [28, 29, 30, 31],
      collapsed: true,
      visible: true,
      locked: false,
      playbackMode: 'once',
      fps: 12,
    },
  ]);

  // Frames & Layers State
  const [frames, setFrames] = useState<Frame[]>(() => createDefaultFighterFrames(64, 64));
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [currentLayerIndex, setCurrentLayerIndex] = useState<number>(2);
  const [selectedFrameIndices, setSelectedFrameIndices] = useState<number[]>([0]);
  const [selectedLayerIndices, setSelectedLayerIndices] = useState<number[]>([2]);
  const [activeTrackKey, setActiveTrackKey] = useState<string | null>('trk:demo-body');
  const [editingMask, setEditingMask] = useState<boolean>(false);

  // Animation Clips & Action Tags
  const [clips, setClips] = useState<AnimationClip[]>([
    {
      id: 'clip-hadoken-combo',
      name: 'Kaito Blaze · Demo Completo (8 Movimientos)',
      frameIndices: Array.from({ length: 32 }, (_, i) => i),
      loop: true,
      fps: 12,
      playbackMode: 'loop',
    },
  ]);
  const [activeClipId, setActiveClipId] = useState<string>('clip-hadoken-combo');

  const [actionTags, setActionTags] = useState<ActionTag[]>([
    { id: 'tag-idle', name: 'Idle', color: '#3b82f6', frameIndices: [0, 1, 2, 3], playbackMode: 'pingpong', category: 'Idle' },
    { id: 'tag-walk', name: 'Walk', color: '#10b981', frameIndices: [4, 5, 6, 7, 8, 9], playbackMode: 'loop', category: 'Movement' },
    { id: 'tag-run', name: 'Run', color: '#06b6d4', frameIndices: [10, 11, 12, 13], playbackMode: 'loop', category: 'Movement' },
    { id: 'tag-jump', name: 'Jump', color: '#8b5cf6', frameIndices: [14, 15, 16, 17], playbackMode: 'once', category: 'Movement' },
    { id: 'tag-crouch', name: 'Agachado', color: '#14b8a6', frameIndices: [18, 19, 20], playbackMode: 'pingpong', category: 'Movement' },
    { id: 'tag-light', name: 'Ataque ligero', color: '#f59e0b', frameIndices: [21, 22, 23], playbackMode: 'once', category: 'Normal' },
    { id: 'tag-heavy', name: 'Ataque fuerte', color: '#f97316', frameIndices: [24, 25, 26, 27], playbackMode: 'once', category: 'Normal' },
    { id: 'tag-special', name: 'Especial simple', color: '#a855f7', frameIndices: [28, 29, 30, 31], playbackMode: 'once', category: 'Special' },
  ]);
  const [activeActionTagId, setActiveActionTagId] = useState<string | null>(null);

  // Playback Mode: 'loop' | 'pingpong' | 'once'
  const [playbackMode, setPlaybackMode] = useState<'loop' | 'pingpong' | 'once'>('loop');

  // Tooling & Brushes
  const [activeTool, setActiveTool] = useState<ToolType>('pencil');
  const [moveSubTool, setMoveSubTool] = useState<MoveSubTool>('move_object');
  const [selectionSubTool, setSelectionSubTool] = useState<SelectionSubTool>('general');
  const [bucketSubTool, setBucketSubTool] = useState<BucketSubTool>('solid');
  const [gradientConfig, setGradientConfig] = useState<GradientConfig>(DEFAULT_GRADIENT_CONFIG);
  const [shapeConfig, setShapeConfig] = useState<ShapeToolConfig>(DEFAULT_SHAPE_CONFIG);
  const [selectionDisplayConfig, setSelectionDisplayConfig] = useState<SelectionDisplayConfig>(() =>
    loadSelectionDisplayConfig()
  );
  useEffect(() => {
    saveSelectionDisplayConfig(selectionDisplayConfig);
  }, [selectionDisplayConfig]);
  const [zoomToolMode, setZoomToolMode] = useState<ZoomToolMode>('in');
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [zoomCommand, setZoomCommand] = useState<ZoomCommand | null>(null);
  const triggerZoomAction = useCallback((type: ZoomCommand['type'], percent?: number) => {
    setZoomPercent((prev) => {
      if (type === 'percent' && typeof percent === 'number') {
        return Math.max(25, Math.min(3200, Math.round(percent)));
      }
      if (type === 'in') return Math.min(3200, Math.round(prev * 1.25));
      if (type === 'out') return Math.max(25, Math.round(prev / 1.25));
      return 100;
    });
    setZoomCommand({ type, percent, nonce: Date.now() + Math.random() });
  }, []);

  const [brushSettings, setBrushSettings] = useState<BrushSettings>(DEFAULT_BRUSH_SETTINGS);
  const [brushSize, setBrushSize] = useState<number>(DEFAULT_BRUSH_SETTINGS.size);
  const [pixelPerfect, setPixelPerfect] = useState<boolean>(DEFAULT_BRUSH_SETTINGS.pixelPerfect);
  const [ditherPattern, setDitherPattern] = useState<'checkered' | 'sparse' | 'dense' | 'horizontal'>('checkered');
  const [ditherConfig, setDitherConfig] = useState<DitherConfig>(DEFAULT_DITHER_CONFIG);
  const [marqueeShape, setMarqueeShape] = useState<'rect' | 'ellipse'>('rect');
  const [lassoMode, setLassoMode] = useState<LassoMode>('free');

  // Contextual Tool Options Bar & Interactive Parametric Shape States
  const [optionsBarState, setOptionsBarState] = useState<OptionsBarState>(() => loadOptionsBarState());
  useEffect(() => {
    saveOptionsBarState(optionsBarState);
  }, [optionsBarState]);
  const [pencilSubMode, setPencilSubMode] = useState<PencilBrushSubMode>('pencil');
  const [eraserOptions, setEraserOptions] = useState<EraserToolOptions>(DEFAULT_ERASER_OPTIONS);
  const [bucketOptions, setBucketOptions] = useState<BucketToolOptions>(DEFAULT_BUCKET_OPTIONS);
  const [magicWandOptions, setMagicWandOptions] = useState<MagicWandOptions>(DEFAULT_MAGIC_WAND_OPTIONS);
  const [selectionOptions, setSelectionOptions] = useState<SelectionToolOptions>(DEFAULT_SELECTION_OPTIONS);
  const lastSelectionBooleanOpRef = useRef<'replace' | 'add' | 'subtract' | 'intersect'>('replace');

  const handleChangeSelectionOptions = useCallback((next: SelectionToolOptions) => {
    if (next.opMode !== 'replace') {
      lastSelectionBooleanOpRef.current = next.opMode;
    }
    setSelectionOptions(next);
    setMagicWandOptions((prev) =>
      prev.continuousSelection === (next.opMode === 'add')
        ? prev
        : { ...prev, continuousSelection: next.opMode === 'add' }
    );
  }, []);

  const handleChangeMagicWandOptions = useCallback((next: MagicWandOptions) => {
    setMagicWandOptions((prev) => {
      if (next.continuousSelection !== prev.continuousSelection) {
        const nextOp = next.continuousSelection ? 'add' : 'replace';
        if (nextOp !== 'replace') lastSelectionBooleanOpRef.current = nextOp;
        setSelectionOptions((selPrev) => ({ ...selPrev, opMode: nextOp }));
      }
      return next;
    });
  }, []);

  const [moveOptions, setMoveOptions] = useState<MoveToolOptions>(DEFAULT_MOVE_OPTIONS);
  const [selectedParametricShapeId, setSelectedParametricShapeId] = useState<string | null>(null);
  const [shapeRasterPolicy, setShapeRasterPolicy] = useState<ShapeRasterConfirmMode>('keep_editable');
  const [symmetryBarActive, setSymmetryBarActive] = useState<boolean>(false);
  const [activeFilterSession, setActiveFilterSession] = useState<ActiveFilterBarSession | null>(null);
  const [aiBarActive, setAiBarActive] = useState<boolean>(false);
  const [quickAiOptions, setQuickAiOptions] = useState<QuickAiBarOptions>(DEFAULT_QUICK_AI_OPTIONS);
  const [isGeneratingQuickAi, setIsGeneratingQuickAi] = useState<boolean>(false);

  const handleChangeShapeConfig = useCallback((next: ShapeToolConfig) => {
    setShapeConfig(next);
    setActiveTool((curr) =>
      curr === 'rectangle' || curr === 'circle'
        ? next.shapeKind === 'ellipse'
          ? 'circle'
          : 'rectangle'
        : curr
    );
  }, []);

  const previousToolBeforeCanvasEditRef = useRef<ToolType>('pencil');
  const [canvasEditRect, setCanvasEditRect] = useState<CanvasEditRect>({
    left: 0,
    top: 0,
    width: 64,
    height: 64,
  });
  const [canvasEditConfig, setCanvasEditConfig] = useState<CanvasEditConfig>({
    anchor: 'center',
    overflowMode: 'keep',
    snapToGrid: false,
    snapGridStep: 8,
    snapToPixels: true,
    lockAspectRatio: false,
    symmetricGrowth: false,
    spritesheetMode: false,
    cellWidth: 32,
    cellHeight: 32,
  });

  useEffect(() => {
    setCanvasEditRect({ left: 0, top: 0, width: canvasWidth, height: canvasHeight });
  }, [canvasWidth, canvasHeight]);

  const handleSelectTool = useCallback((tool: ToolType) => {
    setSymmetryBarActive(false);
    setAiBarActive(false);
    if (tool === 'canvas_edit') {
      setActiveTool((curr) => {
        if (curr !== 'canvas_edit') {
          previousToolBeforeCanvasEditRef.current = curr;
        }
        return 'canvas_edit';
      });
      setCanvasEditRect({ left: 0, top: 0, width: canvasWidth, height: canvasHeight });
      setSelectedParametricShapeId(null);
      return;
    }
    if (tool === 'vector_select' || tool === 'direct_select') {
      setMoveSubTool('direct_select');
      setActiveTool('move');
      return;
    }
    if (tool === 'dither') {
      setActiveTool('pencil');
      setDitherConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
      return;
    }
    if (tool === 'smear') {
      setActiveTool('pencil');
      setBrushSettings((prev) => {
        const nextSmear = !prev.smearEnabled;
        return {
          ...prev,
          smearEnabled: nextSmear,
          celShadeEnabled: nextSmear ? false : prev.celShadeEnabled,
        };
      });
      return;
    }
    if (tool === 'shading') {
      setActiveTool('pencil');
      setBrushSettings((prev) => {
        const nextCel = !prev.celShadeEnabled;
        return {
          ...prev,
          celShadeEnabled: nextCel,
          smearEnabled: nextCel ? false : prev.smearEnabled,
        };
      });
      return;
    }
    if (tool === 'rectangle') {
      setShapeConfig((prev) =>
        prev.shapeKind === 'ellipse' ? { ...prev, shapeKind: 'rectangle' } : prev
      );
      setActiveTool('rectangle');
      return;
    }
    if (tool === 'circle') {
      setShapeConfig((prev) => ({ ...prev, shapeKind: 'ellipse' }));
      setActiveTool('circle');
      return;
    }
    if (!['move', 'select'].includes(tool)) {
      setSelectedParametricShapeId(null);
    }
    setActiveTool(tool);
  }, [canvasWidth, canvasHeight]);
  const handleActivateMoveReferenceTool = useCallback(() => {
    setActiveTool('move');
    setMoveSubTool('move_reference');
  }, []);
  const [clipOutsideCanvas, setClipOutsideCanvas] = useState<boolean>(false);
  const [liveCanvasPreview, setLiveCanvasPreview] = useState<{
    layerId?: string;
    grid: (string | null)[][];
    beforeAfterSplit?: number | null;
  } | null>(null);
  const [activeHitboxType, setActiveHitboxType] = useState<HitboxType>('hurtbox');

  // Transform System State (Edición > Transformar)
  const [transformSession, setTransformSession] = useState<{
    params: TransformParameters;
    sourceGrid: (string | null)[][];
    sourceVectorPaths?: VectorPath[];
  } | null>(null);
  const [lastTransformParams, setLastTransformParams] = useState<TransformParameters | null>(null);
  const [transformSnapConfig, setTransformSnapConfig] = useState<TransformSnapConfig>({
    grid: true,
    pixel: true,
    guides: true,
    edges: true,
    objects: true,
  });

  // Vector Line & Smart Pixel Curve System State
  const [vectorConfig, setVectorConfig] = useState<VectorToolConfig>({
    mode: 'bezier',
    widthMode: 'uniform',
    strokeWidth: 1,
    profile: 'uniform',
    customProfileStops: [0.35, 1.0, 0.35],
    capStyle: 'round',
    joinStyle: 'round',
    tension: 0.4,
    smoothing: 0.5,
    curveRadius: 0,
    pixelPerfect: true,
    smartPixelCurve: true,
    penPressureEnabled: true,
    symmetryMode: 'none',
    customSymmetryX: 24,
    customSymmetryY: 24,
    snap: { grid: false, pixel: true, guides: true, nodes: true, objects: true },
    display: {
      showNodes: true,
      showGuides: true,
      showTangents: true,
      showControlCurves: true,
      showThickness: false,
    },
    storeOnVectorLayer: true,
  });
  const [selectedVectorPathId, setSelectedVectorPathId] = useState<string | null>(null);
  const [selectedVectorNodeIds, setSelectedVectorNodeIds] = useState<string[]>([]);
  const [vectorConfirmPolicy, setVectorConfirmPolicy] = useState<VectorRasterConfirmMode>('keep');
  const [showPixelPerfectVectorPreview, setShowPixelPerfectVectorPreview] = useState<boolean>(true);
  const [selectedHitboxId, setSelectedHitboxId] = useState<string | null>(null);

  // Camera Shake & Camera Keyframes
  const [cameraShake, setCameraShake] = useState<CameraShakeConfig>({
    enabled: true,
    intensity: 4,
    durationMs: 240,
    frequencyHz: 28,
    direction: 'both',
  });
  const [cameraKeyframes, setCameraKeyframes] = useState<CameraKeyframe[]>([]);
  const [cameraShakeTestNonce, setCameraShakeTestNonce] = useState<number>(0);

  // Project Work Modes & Advanced FX Studio / FX Lab States
  const [workMode, setWorkMode] = useState<ProjectWorkMode>('fighter');
  const [stageParallaxConfig, setStageParallaxConfig] = useState<StageParallaxConfig>(
    DEFAULT_STAGE_PARALLAX_CONFIG
  );
  const [tilesetConfig, setTilesetConfig] = useState<TilesetWorkspaceConfig>(DEFAULT_TILESET_CONFIG);
  const [activeFightingProfile, setActiveFightingProfile] = useState<FightingGameProfileId>('kof');
  const [tilesets, setTilesets] = useState<TilesetCollection[]>(() => createDefaultTilesetLibrary(16));
  const [tileToolConfig, setTileToolConfig] = useState<TileToolConfig>(DEFAULT_TILE_TOOL_CONFIG);
  const [fxStudioModalOpen, setFxStudioModalOpen] = useState<boolean>(false);
  const [fxStudioTab, setFxStudioTab] = useState<'generator' | 'lab' | 'library'>('generator');
  const [fxStudioInitialRecipe, setFxStudioInitialRecipe] = useState<EditableFxRecipe | null>(null);
  const [lastGeneratedFxRecipe, setLastGeneratedFxRecipe] = useState<EditableFxRecipe | null>(null);

  // Enhanced Help Locator, Timeline Curves Reveal & Smart Delete States
  const [forceOpenCurvesNonce, setForceOpenCurvesNonce] = useState<number>(0);
  const [toolGuideFocusSearchNonce, setToolGuideFocusSearchNonce] = useState<number>(0);
  const [lastActiveUiContext, setLastActiveUiContext] = useState<
    'canvas' | 'layers' | 'timeline' | 'references' | 'library' | 'poses' | 'keyframes' | 'guides'
  >('canvas');
  const [smartDeleteModalState, setSmartDeleteModalState] = useState<{
    candidates: SmartDeleteCandidate[];
  } | null>(null);

  const handleChangeBrushSettings = useCallback((next: BrushSettings) => {
    const safeSize = Math.max(1, Math.min(2048, Math.round(next.size || 1)));
    const normalized = safeSize === next.size ? next : { ...next, size: safeSize };
    setBrushSettings(normalized);
    setBrushSize(safeSize);
    setPixelPerfect(normalized.pixelPerfect);
  }, []);

  const handleChangeBrushSizeSynced = useCallback((size: number) => {
    const clamped = Math.max(1, Math.min(2048, Math.round(size)));
    setBrushSize(clamped);
    setBrushSettings((prev) => ({ ...prev, size: clamped }));
  }, []);

  const handleTogglePixelPerfectSynced = useCallback(() => {
    setPixelPerfect((prev) => {
      const next = !prev;
      setBrushSettings((b) => ({ ...b, pixelPerfect: next }));
      return next;
    });
  }, []);

  const handleOpenBrushSettings = useCallback(() => {
    setWorkspaceLayout((prev) => {
      const targetDock: PanelDockZone = prev.sidebarPosition === 'left' ? 'left-main' : 'right-main';
      return {
        ...prev,
        sidebarPosition: prev.sidebarPosition === 'hidden' ? 'right' : prev.sidebarPosition,
        rightPanels: prev.rightPanels.map((p) =>
          p.id === 'brushes'
            ? {
                ...p,
                visible: true,
                expanded: true,
                dock: p.dock && p.dock.endsWith('mini') ? targetDock : p.dock || targetDock,
              }
            : p
        ),
      };
    });
    setRightSidebarOpen(true);
  }, []);

  // Colors & Alpha
  const [primaryColor, setPrimaryColor] = useState<string>('#ffffff');
  const [primaryAlpha, setPrimaryAlpha] = useState<number>(1.0);
  const [secondaryColor, setSecondaryColor] = useState<string>('#eb4f46');
  const [secondaryAlpha, setSecondaryAlpha] = useState<number>(1.0);

  // Viewport toggles
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showHitboxes, setShowHitboxes] = useState<boolean>(true);
  const [showPivot, setShowPivot] = useState<boolean>(false);
  const [globalPivot, setGlobalPivot] = useState<{ x: number; y: number }>({ x: 32, y: 53 });
  const [onionSkinEnabled, setOnionSkinEnabled] = useState<boolean>(true);
  const [onionSkinOpacity, setOnionSkinOpacity] = useState<number>(0.35);
  const [symmetryEnabled, setSymmetryEnabled] = useState<boolean>(false);
  const [symmetryConfig, setSymmetryConfig] = useState<SymmetryConfig>(() => ({
    ...DEFAULT_SYMMETRY_CONFIG,
    axisX: 31.5,
    axisY: 31.5,
    lineP1: { x: 8, y: 8 },
    lineP2: { x: 54, y: 54 },
  }));
  const symmetryAxis = Math.round(symmetryConfig.axisX);

  const handleChangeSymmetryConfig = useCallback((next: SymmetryConfig) => {
    setSymmetryConfig(next);
    setSymmetryEnabled(Boolean(next.enabled && next.mode !== 'none'));
  }, []);

  // Retro Arena Stage, Ground & Foot Shadow
  const [stageType, setStageType] = useState<StageType>('training_grid');
  const [stageOpacity, setStageOpacity] = useState<number>(0.85);
  const [groundConfig, setGroundConfig] = useState<GroundConfig>({
    visible: true,
    groundY: 54,
    showShadow: true,
  });

  // Dummy Sparring Partner (Hidden by default for clean startup; toggle via Fighter Mode)
  const [dummyOpponent, setDummyOpponent] = useState<DummyOpponent>({
    enabled: false,
    distance: 26,
    showHurtbox: true,
  });

  // Fighting Game Hitstop & Screen Shake (synced with CameraShakeConfig)
  const [combatFx, setCombatFx] = useState<CombatFxConfig>({
    hitstop: true,
    screenShake: true,
  });

  const handleChangeCombatFxSynced = useCallback((next: CombatFxConfig) => {
    setCombatFx(next);
    setCameraShake((prev) =>
      prev.enabled === next.screenShake ? prev : { ...prev, enabled: next.screenShake }
    );
  }, []);

  const handleChangeCameraShakeSynced = useCallback((next: CameraShakeConfig) => {
    setCameraShake(next);
    setCombatFx((prev) =>
      prev.screenShake === next.enabled ? prev : { ...prev, screenShake: next.enabled }
    );
  }, []);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Sidebar & Modal states
  const [rightSidebarOpen, setRightSidebarOpen] = useState<boolean>(true);
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [exportModalTab, setExportModalTab] = useState<ExportModalTab>('gif');
  const [canvasSizeModalOpen, setCanvasSizeModalOpen] = useState<boolean>(false);
  const [imageSizeModalOpen, setImageSizeModalOpen] = useState<boolean>(false);
  const [newProjectModalOpen, setNewProjectModalOpen] = useState<boolean>(false);
  const [newProjectInitialCategory, setNewProjectInitialCategory] =
    useState<NewProjectTemplateCategory>('Todas');
  const [newProjectInitialFightingProfileId, setNewProjectInitialFightingProfileId] =
    useState<FightingGameProfileId>('custom');
  const [documentDpi, setDocumentDpi] = useState<number>(72);
  const [startupPreferences, setStartupPreferences] = useState<StartupPreferences>(() =>
    loadStartupPreferences()
  );
  const [splashOpen, setSplashOpen] = useState<boolean>(() => {
    const prefs = loadStartupPreferences();
    return prefs.showSplashAnimation;
  });
  const [splashTestMode, setSplashTestMode] = useState<boolean>(false);
  const [homeScreenOpen, setHomeScreenOpen] = useState<boolean>(() => {
    const prefs = loadStartupPreferences();
    return prefs.showHomeScreen;
  });
  const [homeScreenSection, setHomeScreenSection] = useState<HomeScreenSection>('inicio');
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState<boolean>(false);
  const [toolGuideModalOpen, setToolGuideModalOpen] = useState<boolean>(false);
  const [helpInitialFocusId, setHelpInitialFocusId] = useState<string | null>(null);
  const [whatIsThisActive, setWhatIsThisActive] = useState<boolean>(false);
  const [spotlightTarget, setSpotlightTarget] = useState<{
    helpId: string;
    label: string;
    hint?: string;
  } | null>(null);
  const [lospecModalOpen, setLospecModalOpen] = useState<boolean>(false);
  const [localInstallerModalOpen, setLocalInstallerModalOpen] = useState<boolean>(false);
  const [spriteSheetModalOpen, setSpriteSheetModalOpen] = useState<boolean>(false);
  const [onionSkinPrev, setOnionSkinPrev] = useState<number>(1);
  const [onionSkinNext, setOnionSkinNext] = useState<number>(0);
  const [animationFps, setAnimationFps] = useState<number>(12);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [isolateActiveGroup, setIsolateActiveGroup] = useState<boolean>(false);
  const [activePaletteColors, setActivePaletteColors] = useState<string[]>([]);
  const [recentProjects, setRecentProjects] = useState<RecentProjectEntry[]>(() => {
    try {
      const raw = localStorage.getItem('pixelclash_recent_projects_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('pixelclash_recent_projects_v1', JSON.stringify(recentProjects));
    } catch {
      // ignore storage overflow
    }
  }, [recentProjects]);

  // Rulers, Interactive Guides & Wheel Navigation Mode State
  const [guides, setGuides] = useState<CanvasGuide[]>([]);
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);
  const [guidesConfig, setGuidesConfig] = useState<GuidesConfig>(() => loadGuidesConfig());
  const [guidesModalOpen, setGuidesModalOpen] = useState<boolean>(false);
  const [guidesModalTab, setGuidesModalTab] = useState<GuidesModalTab>('perspective');
  const [wheelNavMode, setWheelNavMode] = useState<WheelNavigationMode>(() => {
    try {
      const saved = localStorage.getItem(WHEEL_NAV_STORAGE_KEY);
      return saved === 'zoom' ? 'zoom' : 'pan';
    } catch {
      return 'pan';
    }
  });

  useEffect(() => {
    saveGuidesConfig(guidesConfig);
  }, [guidesConfig]);

  useEffect(() => {
    try {
      localStorage.setItem(WHEEL_NAV_STORAGE_KEY, wheelNavMode);
    } catch {
      // ignore
    }
  }, [wheelNavMode]);

  // Global Top-Layer Notification & Alert Queue (z-index 250000)
  const [studioNotifications, setStudioNotifications] = useState<StudioNotificationItem[]>([]);
  const handleDismissStudioNotification = useCallback((id: string) => {
    setStudioNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);
  const setImportNotification = useCallback((msg: string | null) => {
    if (!msg) return;
    const severity = classifyNotificationSeverity(msg);
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setStudioNotifications((prev) => {
      const deduped = prev.filter((item) => item.message !== msg);
      return [{ id, message: msg, severity, createdAt: Date.now() }, ...deduped].slice(0, 4);
    });
  }, []);

  // Modular Workspace Layout, Saved Presets & Studio Styles
  const [workspaceLayout, setWorkspaceLayout] = useState<WorkspaceLayoutConfig>(() => loadWorkspaceLayout());
  const [savedCustomLayouts, setSavedCustomLayouts] = useState<SavedCustomLayout[]>(() => loadSavedCustomLayouts());
  const [studioStyle, setStudioStyle] = useState<StudioStyleConfig>(() => loadStudioStyle());
  const [layoutModalOpen, setLayoutModalOpen] = useState<boolean>(false);
  const [layoutModalTab, setLayoutModalTab] = useState<'layout' | 'style' | 'selections' | 'minipreview'>('layout');

  // Linked movement across all frames
  const [linkMoveAllFrames, setLinkMoveAllFrames] = useState<boolean>(false);

  // Selection, Clipboard & Asset Library Browser State
  const [selection, setSelection] = useState<SelectionArea | null>(null);
  const prevHasSelectionRef = useRef<boolean>(false);
  useEffect(() => {
    const hasSel = Boolean(selection && selection.active);
    if (prevHasSelectionRef.current && !hasSel) {
      setSelectionOptions((prev) =>
        prev.opMode === 'subtract' || prev.opMode === 'intersect'
          ? { ...prev, opMode: 'replace' }
          : prev
      );
    }
    prevHasSelectionRef.current = hasSel;
  }, [selection]);
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);
  const [userLibraryItems, setUserLibraryItems] = useState<AssetLibraryItem[]>(() => loadUserAssetLibrary());
  const [assetFolders, setAssetFolders] = useState<string[]>(() => loadAssetFolders());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      scheduleIdleTask(() => saveUserAssetLibrary(userLibraryItems), 1200);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [userLibraryItems]);

  useEffect(() => {
    saveAssetFolders(assetFolders);
  }, [assetFolders]);

  const allLibraryItems = React.useMemo(
    () => [...userLibraryItems, ...BUILTIN_ASSET_PRESETS],
    [userLibraryItems]
  );

  // Imported / Custom Brushes State (persisted locally)
  const [customBrushes, setCustomBrushes] = useState<CustomBrushPreset[]>(() => loadCustomBrushPresets());
  useEffect(() => {
    saveCustomBrushPresets(customBrushes);
  }, [customBrushes]);

  // Performance Mode (Ver -> Rendimiento: Calidad máxima | Equilibrado | Rendimiento)
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>(() => {
    try {
      const saved = localStorage.getItem(PERF_MODE_STORAGE_KEY);
      if (saved === 'quality' || saved === 'balanced' || saved === 'performance') return saved;
    } catch {
      // ignore
    }
    return 'balanced';
  });
  useEffect(() => {
    try {
      localStorage.setItem(PERF_MODE_STORAGE_KEY, performanceMode);
    } catch {
      // ignore
    }
  }, [performanceMode]);

  // Global OS Clipboard Smart Paste vs Quick Paste State
  const [quickPasteMode, setQuickPasteMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(QUICK_PASTE_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(QUICK_PASTE_STORAGE_KEY, quickPasteMode ? '1' : '0');
    } catch {
      // ignore
    }
  }, [quickPasteMode]);
  const [pendingClipboardImage, setPendingClipboardImage] = useState<ClipboardImagePayload | null>(null);
  const lastInternalCopySigRef = useRef<string | null>(null);

  // Multi-Document Tabs (Always visible, tracks dirty & save state per tab)
  const [activeDocumentId, setActiveDocumentId] = useState<string>('doc-initial');
  const [openDocuments, setOpenDocuments] = useState<DocumentTabEntry[]>([
    {
      id: 'doc-initial',
      name: 'K.O. Fighter',
      width: 64,
      height: 64,
      snapshot: null,
      isDirty: false,
      isNewUnsaved: true,
      hasSavedLocation: false,
    },
  ]);
  const activeDocumentIdRef = useRef<string>(activeDocumentId);
  activeDocumentIdRef.current = activeDocumentId;
  const openDocumentsRef = useRef<DocumentTabEntry[]>(openDocuments);
  openDocumentsRef.current = openDocuments;
  const suppressDirtyMarkRef = useRef<boolean>(false);

  // Document Tab Reorder, Safe Close, Multi-Doc App Exit & Save-As Modals State
  const [draggedDocTabId, setDraggedDocTabId] = useState<string | null>(null);
  const [pendingCloseDocId, setPendingCloseDocId] = useState<string | null>(null);
  const [unsavedAppCloseModalOpen, setUnsavedAppCloseModalOpen] = useState<boolean>(false);
  const [isAppClosingFromDesktop, setIsAppClosingFromDesktop] = useState<boolean>(false);
  const [isBatchSavingDocs, setIsBatchSavingDocs] = useState<boolean>(false);
  const [reviewCloseSession, setReviewCloseSession] = useState<{
    docIds: string[];
    currentIndex: number;
    fromDesktopExit: boolean;
  } | null>(null);
  const [batchSaveAsQueue, setBatchSaveAsQueue] = useState<{
    remainingDocIds: string[];
    savedCount: number;
    totalNewLocationCount: number;
    fromDesktopExit: boolean;
  } | null>(null);
  const [saveAsModalState, setSaveAsModalState] = useState<{
    docId: string;
    initialName: string;
    initialFormat: SaveAsFormatId;
    afterSaveAction?: 'close_doc' | 'batch_close_queue' | 'review_next' | null;
    queueLabel?: string | null;
  } | null>(null);
  const [isSavingAs, setIsSavingAs] = useState<boolean>(false);
  const [isWindowMaximized, setIsWindowMaximized] = useState<boolean>(false);
  const [isWindowMinimized, setIsWindowMinimized] = useState<boolean>(false);

  // Dedicated Import Into Project State + Smart Import Modal + External OS Drop Overlay
  const [pendingImportMode, setPendingImportMode] = useState<ImportMenuMode | null>(null);
  const [smartImportFiles, setSmartImportFiles] = useState<File[]>([]);
  const [isExternalFileDragOver, setIsExternalFileDragOver] = useState<boolean>(false);

  // Unified File Recovery, Load Validation Error, PSD Compatibility, Spritesheet Detection & Resolution Mismatch Modals
  const [missingRecentEntry, setMissingRecentEntry] = useState<RecentProjectEntry | null>(null);
  const [fileLoadError, setFileLoadError] = useState<FileLoadErrorPayload | null>(null);
  const [psdCompatibilityReport, setPsdCompatibilityReport] = useState<PsdCompatibilityReport | null>(null);
  const [pendingSpritesheetPrompt, setPendingSpritesheetPrompt] =
    useState<PendingSpritesheetOpenState | null>(null);
  const [pendingSpritesheetOpen, setPendingSpritesheetOpen] =
    useState<PendingSpritesheetOpenState | null>(null);
  const [pendingResolutionMismatch, setPendingResolutionMismatch] =
    useState<PendingResolutionMismatchState | null>(null);
  const relocatingRecentIdRef = useRef<string | null>(null);

  const handleUpdateStartupPreferences = useCallback((next: StartupPreferences) => {
    setStartupPreferences(next);
    saveStartupPreferences(next);
  }, []);

  const handleSplashInitTask = useCallback(async () => {
    detectHardwareCapabilities();
  }, []);

  const handleSplashComplete = useCallback(() => {
    setSplashOpen(false);
    if (splashTestMode) {
      setSplashTestMode(false);
      return;
    }
    if (startupPreferences.showHomeScreen) {
      setHomeScreenOpen(true);
    }
  }, [splashTestMode, startupPreferences.showHomeScreen]);

  const handleOpenHomeScreen = useCallback((section: HomeScreenSection = 'inicio') => {
    setHomeScreenSection(section);
    setHomeScreenOpen(true);
  }, []);

  const handleTestSplashAnimation = useCallback(() => {
    setSplashTestMode(true);
    setSplashOpen(true);
  }, []);

  // References System State
  const [references, setReferences] = useState<ReferenceItem[]>(() => {
    try {
      const raw = localStorage.getItem('pixelclash_references_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [referenceGroups, setReferenceGroups] = useState<ReferenceGroup[]>(() => {
    try {
      const raw = localStorage.getItem('pixelclash_ref_groups_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [activeReferenceId, setActiveReferenceId] = useState<string | null>(null);
  const [pureRefConfig, setPureRefConfig] = useState<PureRefConfig>(() => {
    try {
      const raw = localStorage.getItem('pixelclash_pureref_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          enabled: Boolean(parsed.enabled),
          alwaysOnTop: parsed.alwaysOnTop !== false,
          globalOpacity: typeof parsed.globalOpacity === 'number' ? parsed.globalOpacity : 1,
          panX: typeof parsed.panX === 'number' ? parsed.panX : 0,
          panY: typeof parsed.panY === 'number' ? parsed.panY : 0,
          zoom: typeof parsed.zoom === 'number' ? parsed.zoom : 1,
        };
      }
    } catch {
      // ignore
    }
    return { enabled: false, alwaysOnTop: true, globalOpacity: 1, panX: 0, panY: 0, zoom: 1 };
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem('pixelclash_pureref_v1', JSON.stringify(pureRefConfig));
      } catch {
        // ignore
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [pureRefConfig]);

  // Debounced + idle-scheduled persistence for references (never blocks canvas drag/scale FPS)
  useEffect(() => {
    const delay = performanceMode === 'performance' ? 2000 : 800;
    const timer = window.setTimeout(() => {
      scheduleIdleTask(() => {
        try {
          localStorage.setItem('pixelclash_references_v1', JSON.stringify(references));
        } catch {
          // ignore storage quota overflow for large reference images
        }
      }, 1500);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [references, performanceMode]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem('pixelclash_ref_groups_v1', JSON.stringify(referenceGroups));
      } catch {
        // ignore
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [referenceGroups]);

  // Hybrid Timeline Markers & Playable Combat Test Mode
  const [timelineMarkers, setTimelineMarkers] = useState<TimelineMarker[]>([]);
  const [combatTestActive, setCombatTestActive] = useState<boolean>(false);

  // System 3: Custom Shortcuts, Profiles, Macros, Command Palette & Hold-Alt Overlay
  const [shortcutProfileId, setShortcutProfileId] = useState<ShortcutProfileId>(() => loadShortcutProfile());
  const [shortcutBindings, setShortcutBindings] = useState<ShortcutBinding[]>(() => loadShortcutBindings());
  const [recordedMacros, setRecordedMacros] = useState<RecordedMacro[]>(() => loadRecordedMacros());
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const [altKeyHeld, setAltKeyHeld] = useState<boolean>(false);
  const [isRecordingMacro, setIsRecordingMacro] = useState<boolean>(false);
  const [recordedMacroSteps, setRecordedMacroSteps] = useState<MacroStep[]>([]);

  useEffect(() => {
    saveShortcutProfile(shortcutProfileId);
  }, [shortcutProfileId]);

  useEffect(() => {
    saveShortcutBindings(shortcutBindings);
  }, [shortcutBindings]);

  useEffect(() => {
    saveRecordedMacros(recordedMacros);
  }, [recordedMacros]);

  // System 4: Pro Eyedropper + Color History + Smart Palette
  const [eyedropperConfig, setEyedropperConfig] = useState<EyedropperConfig>(DEFAULT_EYEDROPPER_CONFIG);
  const [lastSampledColor, setLastSampledColor] = useState<SampledColorInfo | null>(null);
  const [colorHistory, setColorHistory] = useState<string[]>(['#ffffff', '#eb4f46', '#38bdf8', '#fbbf24']);

  // System 5: Intelligent 2D Pose Dummie & Dummie Master
  const [dummiePose, setDummiePose] = useState<DummiePose>(() => applyPresetToDummiePose('male', 'idle'));
  const [savedDummiePoses, setSavedDummiePoses] = useState<DummiePose[]>(() => {
    try {
      const raw = localStorage.getItem('pixelclash_saved_dummie_poses_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [applyPoseModalOpen, setApplyPoseModalOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('pixelclash_saved_dummie_poses_v1', JSON.stringify(savedDummiePoses));
    } catch {
      // ignore
    }
  }, [savedDummiePoses]);

  // System 6: AI Multi-Frame Destination Modal & Auto-Apply Bypass + Studio Console Logs
  const [autoApplyAiAllFrames, setAutoApplyAiAllFrames] = useState<boolean>(false);
  const [studioLogs, setStudioLogs] = useState<string[]>([
    'PixelClash Studio iniciado · Modo Modular 28 Paneles listo.',
  ]);
  const appendStudioLog = useCallback((msg: string) => {
    const stamp = new Date().toLocaleTimeString('es-ES', { hour12: false });
    setStudioLogs((prev) => [`[${stamp}] ${msg}`, ...prev].slice(0, 60));
  }, []);
  const [pendingAiInsert, setPendingAiInsert] = useState<{
    title: string;
    defaultLayerName: string;
    sequenceGrids: (string | null)[][][];
    groupName?: string;
    groupColor?: string;
    insertAtBottom?: boolean;
    hitboxes?: Hitbox[];
  } | null>(null);

  // Local Autosave Recovery State
  const AUTOSAVE_STORAGE_KEY = 'pixelclash_autosave_pcs_v1';
  const [hasAutosave, setHasAutosave] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem('pixelclash_autosave_pcs_v1'));
    } catch {
      return false;
    }
  });

  const openLayoutModal = useCallback((tab: 'layout' | 'style' | 'selections' | 'minipreview' = 'layout') => {
    setLayoutModalTab(tab);
    setLayoutModalOpen(true);
  }, []);

  const handleUpdateMiniPreviewState = useCallback(
    (patch: {
      showMiniPlayer?: boolean;
      miniPreviewCollapsed?: boolean;
      miniPreviewWidth?: number;
      miniPreviewHeight?: number;
      miniPreviewPosition?: { x: number; y: number } | null;
    }) => {
      setWorkspaceLayout((prev) => ({
        ...prev,
        ...patch,
        templateId: 'custom',
      }));
    },
    []
  );

  const handleDockMiniPreviewToSidebar = useCallback(() => {
    setWorkspaceLayout((prev) => ({
      ...prev,
      showMiniPlayer: false,
      rightPanels: prev.rightPanels.map((p) =>
        p.id === 'preview' ? { ...p, visible: true, expanded: true } : p
      ),
      templateId: 'custom',
    }));
    setRightSidebarOpen(true);
  }, []);

  const handleFloatMiniPreviewToCanvas = useCallback(() => {
    setWorkspaceLayout((prev) => ({
      ...prev,
      showMiniPlayer: true,
      miniPreviewCollapsed: false,
      rightPanels: prev.rightPanels.map((p) =>
        p.id === 'preview' ? { ...p, visible: false } : p
      ),
      templateId: 'custom',
    }));
  }, []);

  // Persist workspace layout
  useEffect(() => {
    saveWorkspaceLayout(workspaceLayout);
  }, [workspaceLayout]);

  // Persist custom layouts
  useEffect(() => {
    saveCustomLayouts(savedCustomLayouts);
  }, [savedCustomLayouts]);

  // Persist & apply CSS theme variables, custom colors, gradients, density, corners & icons
  useEffect(() => {
    saveStudioStyle(studioStyle);
    const theme = STUDIO_THEMES.find((t) => t.id === studioStyle.themeId) || STUDIO_THEMES[0];
    const uiFont = STUDIO_UI_FONTS.find((f) => f.id === studioStyle.uiFontId) || STUDIO_UI_FONTS[0];
    const monoFont = STUDIO_MONO_FONTS.find((f) => f.id === studioStyle.monoFontId) || STUDIO_MONO_FONTS[0];
    const cc = studioStyle.customColors || {};

    let radius = '0.75rem';
    let btnRadius = '0.5rem';
    switch (studioStyle.cornerStyle) {
      case 'straight':
        radius = '0px';
        btnRadius = '0px';
        break;
      case 'sharp':
        radius = '0.25rem';
        btnRadius = '0.25rem';
        break;
      case 'slightly_rounded':
        radius = '0.375rem';
        btnRadius = '0.25rem';
        break;
      case 'very_rounded':
      case 'soft':
        radius = '1.125rem';
        btnRadius = '0.875rem';
        break;
      case 'rounded':
      default:
        radius = '0.75rem';
        btnRadius = '0.5rem';
        break;
    }

    const bgApp = cc.mainBg || theme.vars.bgApp;
    const bgCanvas = cc.mainBg || theme.vars.bgCanvas;
    const bgBar = cc.barsBg || theme.vars.bgBar;
    const bgHeader = cc.barsBg || theme.vars.bgHeader;
    const bgPanel = cc.panelsBg || theme.vars.bgPanel;
    const bgCard = cc.panelsBg || theme.vars.bgCard;
    const bgBtn = cc.buttonsBg || theme.vars.bgElevated;
    const bgHover = cc.hoverBg || theme.vars.borderStrong;
    const bgSelection = cc.selectionBg || 'rgba(251, 191, 36, 0.16)';
    const textMain = cc.textColor || theme.vars.text;
    const iconColor = cc.iconColor || theme.vars.textMuted;

    const root = document.documentElement;
    root.style.setProperty('--studio-bg-app', bgApp);
    root.style.setProperty('--studio-bg-canvas', bgCanvas);
    root.style.setProperty('--studio-bg-bar', bgBar);
    root.style.setProperty('--studio-bg-header', bgHeader);
    root.style.setProperty('--studio-bg-panel', bgPanel);
    root.style.setProperty('--studio-bg-card', bgCard);
    root.style.setProperty('--studio-bg-elevated', bgBtn);
    root.style.setProperty('--studio-bg-btn', bgBtn);
    root.style.setProperty('--studio-bg-hover', bgHover);
    root.style.setProperty('--studio-bg-selection', bgSelection);
    root.style.setProperty('--studio-border', theme.vars.border);
    root.style.setProperty('--studio-border-strong', theme.vars.borderStrong);
    root.style.setProperty('--studio-text', textMain);
    root.style.setProperty('--studio-text-muted', theme.vars.textMuted);
    root.style.setProperty('--studio-icon-color', iconColor);
    root.style.setProperty('--studio-accent', studioStyle.customAccent || theme.vars.accent);
    root.style.setProperty('--studio-accent-text', theme.vars.accentText);
    root.style.setProperty('--font-ui', uiFont.family);
    root.style.setProperty('--font-mono', monoFont.family);
    root.style.setProperty('--studio-radius', radius);
    root.style.setProperty('--studio-btn-radius', btnRadius);
    root.style.setProperty('--studio-control-radius', btnRadius);

    const grads = studioStyle.gradients || {
      useGradients: true,
      windows: true,
      buttons: false,
      panels: false,
      headers: true,
    };
    const gradOn = Boolean(grads.useGradients);
    root.dataset.gradientsWindows = gradOn && grads.windows ? 'true' : 'false';
    root.dataset.gradientsPanels = gradOn && grads.panels ? 'true' : 'false';
    root.dataset.gradientsHeaders = gradOn && grads.headers ? 'true' : 'false';
    root.dataset.gradientsButtons = gradOn && grads.buttons ? 'true' : 'false';
    root.dataset.buttonStyle = studioStyle.buttonStyle || 'rounded_rect';
    root.dataset.density = studioStyle.density || 'normal';
    root.dataset.iconStyle = studioStyle.iconStyle || 'modern';
    root.dataset.iconSize = studioStyle.iconSize || 'md';

    if (theme.isLight) {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
    document.body.style.fontFamily = uiFont.family;
    document.body.style.backgroundColor = bgApp;
    document.body.style.color = textMain;
  }, [studioStyle]);

  const handleSaveCustomLayout = (name: string) => {
    const newEntry: SavedCustomLayout = {
      id: `custom-${Date.now()}`,
      name,
      createdAt: new Date().toLocaleDateString('es-ES'),
      layout: JSON.parse(JSON.stringify(workspaceLayout)),
    };
    setSavedCustomLayouts((prev) => [newEntry, ...prev]);
    setImportNotification(`¡Organización "${name}" guardada en tus presets!`);
    setTimeout(() => setImportNotification(null), 3500);
  };

  const handleLoadCustomLayout = (saved: SavedCustomLayout) => {
    const cloned = JSON.parse(JSON.stringify(saved.layout));
    setWorkspaceLayout((prev) => ({
      ...cloned,
      showMiniPlayer: prev.miniPreviewPrefs?.neverAutoOpen !== false ? prev.showMiniPlayer : Boolean(cloned.showMiniPlayer),
      miniPreviewCollapsed: prev.miniPreviewPrefs?.startCollapsed !== false ? true : Boolean(cloned.miniPreviewCollapsed),
      miniPreviewPrefs: prev.miniPreviewPrefs || cloned.miniPreviewPrefs,
    }));
    if (saved.layout.sidebarPosition !== 'hidden') {
      setRightSidebarOpen(true);
    }
    setImportNotification(`Organización "${saved.name}" aplicada.`);
    setTimeout(() => setImportNotification(null), 3000);
  };

  const handleDeleteCustomLayout = (id: string) => {
    setSavedCustomLayouts((prev) => prev.filter((item) => item.id !== id));
  };

  const handleDuplicateCustomLayout = (saved: SavedCustomLayout) => {
    const copyEntry: SavedCustomLayout = {
      id: `custom-${Date.now()}`,
      name: `${saved.name} (Copia)`,
      createdAt: new Date().toLocaleDateString('es-ES'),
      layout: JSON.parse(JSON.stringify(saved.layout)),
    };
    setSavedCustomLayouts((prev) => [copyEntry, ...prev]);
    appendStudioLog(`Espacio "${saved.name}" duplicado.`);
  };

  const handleMergePanelsToTabGroup = useCallback(
    (draggedId: RightPanelId, targetId: RightPanelId, zone: PanelDockZone) => {
      if (draggedId === targetId) return;
      setWorkspaceLayout((prev) => {
        const cleanedGroups = (prev.tabGroups || [])
          .map((g) => ({
            ...g,
            panelIds: g.panelIds.filter((pid) => pid !== draggedId),
          }))
          .filter((g) => g.panelIds.length >= 2);

        const existingIdx = cleanedGroups.findIndex((g) => g.panelIds.includes(targetId));
        let nextGroups: DockTabGroupConfig[];
        if (existingIdx >= 0) {
          nextGroups = cleanedGroups.map((g, idx) =>
            idx === existingIdx
              ? {
                  ...g,
                  zone,
                  panelIds: [...g.panelIds, draggedId],
                  activePanelId: draggedId,
                }
              : g
          );
        } else {
          nextGroups = [
            ...cleanedGroups,
            {
              id: `tabgrp-${Date.now()}`,
              zone,
              panelIds: [targetId, draggedId],
              activePanelId: draggedId,
            },
          ];
        }

        const nextPanels = prev.rightPanels.map((p) =>
          p.id === draggedId || p.id === targetId
            ? { ...p, dock: zone, visible: true, expanded: true }
            : p
        );

        return {
          ...prev,
          templateId: 'custom',
          rightPanels: nextPanels,
          tabGroups: nextGroups,
        };
      });
      setRightSidebarOpen(true);
      appendStudioLog(`Panel "${draggedId}" agrupado en pestañas con "${targetId}".`);
    },
    [appendStudioLog]
  );

  const handleDropPanelToDock = useCallback(
    (panelId: RightPanelId, targetZone: PanelDockZone, targetIndex: number = 0) => {
      setWorkspaceLayout((prev) => {
        const defaultMain: PanelDockZone = prev.sidebarPosition === 'left' ? 'left-main' : 'right-main';
        const target = prev.rightPanels.find((p) => p.id === panelId);
        if (!target) return prev;
        const without = prev.rightPanels.filter((p) => p.id !== panelId);
        const zoneItems = without.filter((p) => (p.dock || defaultMain) === targetZone);
        const clampedIdx = Math.max(0, Math.min(targetIndex, zoneItems.length));
        const anchorPanel = zoneItems[clampedIdx];
        const updated: RightPanelConfig = {
          ...target,
          dock: targetZone,
          visible: true,
          expanded: targetZone.endsWith('main') ? true : target.expanded,
        };
        let nextPanels: RightPanelConfig[];
        if (!anchorPanel) {
          nextPanels = [...without, updated];
        } else {
          const globalIdx = without.findIndex((p) => p.id === anchorPanel.id);
          nextPanels = [...without];
          nextPanels.splice(globalIdx, 0, updated);
        }
        return {
          ...prev,
          templateId: 'custom',
          sidebarPosition: prev.sidebarPosition === 'hidden' ? 'right' : prev.sidebarPosition,
          rightPanels: nextPanels,
        };
      });
      setRightSidebarOpen(true);
    },
    []
  );

  const handleTogglePanelMini = useCallback((id: RightPanelId) => {
    setWorkspaceLayout((prev) => {
      const defaultMain: PanelDockZone = prev.sidebarPosition === 'left' ? 'left-main' : 'right-main';
      return {
        ...prev,
        templateId: 'custom',
        rightPanels: prev.rightPanels.map((p) => {
          if (p.id !== id) return p;
          const curDock = p.dock || defaultMain;
          let nextDock: PanelDockZone;
          if (curDock === 'right-mini') nextDock = 'right-main';
          else if (curDock === 'left-mini') nextDock = 'left-main';
          else if (curDock === 'left-main') nextDock = 'left-mini';
          else nextDock = 'right-mini';
          return {
            ...p,
            dock: nextDock,
            visible: true,
            expanded: nextDock.endsWith('main') ? true : p.expanded,
          };
        }),
      };
    });
    setRightSidebarOpen(true);
  }, []);

  const handleToggleRightPanelExpanded = (id: RightPanelId) => {
    setWorkspaceLayout((prev) => ({
      ...prev,
      rightPanels: prev.rightPanels.map((p) => (p.id === id ? { ...p, expanded: !p.expanded } : p)),
    }));
  };

  const handleToggleRightPanelVisible = (id: RightPanelId) => {
    setWorkspaceLayout((prev) => ({
      ...prev,
      templateId: 'custom',
      rightPanels: prev.rightPanels.map((p) => (p.id === id ? { ...p, visible: !p.visible } : p)),
    }));
  };

  const handleResetDefaultLayout = useCallback(() => {
    setWorkspaceLayout(JSON.parse(JSON.stringify(DEFAULT_WORKSPACE_LAYOUT)));
    setRightSidebarOpen(true);
    setImportNotification('Interfaz restablecida al orden predeterminado (Arcade Pro + Minipaneles).');
    setTimeout(() => setImportNotification(null), 3000);
  }, []);

  const handleApplyWorkspacePreset = useCallback((templateId: string) => {
    const tpl = WORKSPACE_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    const cloned = JSON.parse(JSON.stringify(tpl.layout));
    setWorkspaceLayout((prev) => ({
      ...cloned,
      showMiniPlayer: prev.miniPreviewPrefs?.neverAutoOpen !== false ? prev.showMiniPlayer : false,
      miniPreviewCollapsed: prev.miniPreviewPrefs?.startCollapsed !== false ? true : prev.miniPreviewCollapsed,
      miniPreviewPrefs: prev.miniPreviewPrefs || cloned.miniPreviewPrefs,
    }));
    if (tpl.layout.sidebarPosition !== 'hidden') {
      setRightSidebarOpen(true);
    }
    setImportNotification(`Preset de estudio "${tpl.name}" aplicado.`);
    setTimeout(() => setImportNotification(null), 3000);
  }, []);

  const handleResetFloatingWindows = useCallback(() => {
    setWorkspaceLayout((prev) => ({
      ...prev,
      floatingPanels: {},
    }));
    setImportNotification('Ventanas flotantes re-acopladas al espacio lateral.');
    setTimeout(() => setImportNotification(null), 2500);
  }, []);

  const handleApplyLospecPalette = (colors: string[], name: string) => {
    setActivePaletteColors(colors);
    if (colors.length > 0) {
      setPrimaryColor(colors[0]);
      if (colors.length > 1) {
        setSecondaryColor(colors[1]);
      }
    }
    setImportNotification(`¡Paleta "${name}" (${colors.length} colores Lospec) aplicada al muestrario!`);
    setTimeout(() => setImportNotification(null), 4000);
  };

  const handleApplySpriteSheetTemplate = (data: {
    width: number;
    height: number;
    frames: Frame[];
    layerGroups: LayerGroup[];
  }) => {
    setCanvasWidth(data.width);
    setCanvasHeight(data.height);
    setFrames(data.frames);
    setLayerGroups(data.layerGroups);
    setCurrentFrameIndex(0);
    setCurrentLayerIndex(0);
    pushHistory(data.frames);
    setImportNotification(`¡Plantilla base de movimientos cargada (${data.frames.length} fotogramas)!`);
    setTimeout(() => setImportNotification(null), 4000);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Deterministic Undo / Redo History Stacks across ALL editable/deletable project state
  type HistorySnapshot = {
    frames: Frame[];
    layerGroups: LayerGroup[];
    references: ReferenceItem[];
    referenceGroups: ReferenceGroup[];
    userLibraryItems: AssetLibraryItem[];
    savedDummiePoses: DummiePose[];
    timelineMarkers: TimelineMarker[];
    cameraKeyframes: CameraKeyframe[];
    actionTags: ActionTag[];
    dummiePose: DummiePose;
    symmetryConfig: SymmetryConfig;
    guides: CanvasGuide[];
    showPivot: boolean;
    currentFrameIndex: number;
    currentLayerIndex: number;
    selectedVectorPathId: string | null;
    selectedVectorNodeIds: string[];
    canvasWidth?: number;
    canvasHeight?: number;
  };

  const canvasWidthRef = useRef<number>(canvasWidth);
  canvasWidthRef.current = canvasWidth;
  const canvasHeightRef = useRef<number>(canvasHeight);
  canvasHeightRef.current = canvasHeight;
  const framesRef = useRef<Frame[]>(frames);
  framesRef.current = frames;
  const layerGroupsRef = useRef<LayerGroup[]>(layerGroups);
  layerGroupsRef.current = layerGroups;
  const referencesRef = useRef<ReferenceItem[]>(references);
  referencesRef.current = references;
  const referenceGroupsRef = useRef<ReferenceGroup[]>(referenceGroups);
  referenceGroupsRef.current = referenceGroups;
  const userLibraryItemsRef = useRef<AssetLibraryItem[]>(userLibraryItems);
  userLibraryItemsRef.current = userLibraryItems;
  const savedDummiePosesRef = useRef<DummiePose[]>(savedDummiePoses);
  savedDummiePosesRef.current = savedDummiePoses;
  const timelineMarkersRef = useRef<TimelineMarker[]>(timelineMarkers);
  timelineMarkersRef.current = timelineMarkers;
  const cameraKeyframesRef = useRef<CameraKeyframe[]>(cameraKeyframes);
  cameraKeyframesRef.current = cameraKeyframes;
  const actionTagsRef = useRef<ActionTag[]>(actionTags);
  actionTagsRef.current = actionTags;
  const dummiePoseRef = useRef<DummiePose>(dummiePose);
  dummiePoseRef.current = dummiePose;
  const symmetryConfigRef = useRef<SymmetryConfig>(symmetryConfig);
  symmetryConfigRef.current = symmetryConfig;
  const guidesRef = useRef<CanvasGuide[]>(guides);
  guidesRef.current = guides;
  const showPivotRef = useRef<boolean>(showPivot);
  showPivotRef.current = showPivot;
  const currentFrameIndexRef = useRef<number>(currentFrameIndex);
  currentFrameIndexRef.current = currentFrameIndex;
  const currentLayerIndexRef = useRef<number>(currentLayerIndex);
  currentLayerIndexRef.current = currentLayerIndex;
  const activeTrackKeyRef = useRef<string | null>(activeTrackKey);
  activeTrackKeyRef.current = activeTrackKey;
  const selectedVectorPathIdRef = useRef<string | null>(selectedVectorPathId);
  selectedVectorPathIdRef.current = selectedVectorPathId;
  const selectedVectorNodeIdsRef = useRef<string[]>(selectedVectorNodeIds);
  selectedVectorNodeIdsRef.current = selectedVectorNodeIds;

  const historyRef = useRef<HistorySnapshot[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const hasInitializedHistoryRef = useRef<boolean>(false);
  const [historyIndexState, setHistoryIndexState] = useState<number>(0);
  const [historyLengthState, setHistoryLengthState] = useState<number>(1);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  const pushHistorySnapshot = useCallback((override?: Partial<HistorySnapshot>) => {
    const snap: HistorySnapshot = {
      frames: JSON.parse(JSON.stringify(override?.frames ?? framesRef.current)),
      layerGroups: JSON.parse(JSON.stringify(override?.layerGroups ?? layerGroupsRef.current)),
      references: JSON.parse(JSON.stringify(override?.references ?? referencesRef.current)),
      referenceGroups: JSON.parse(JSON.stringify(override?.referenceGroups ?? referenceGroupsRef.current)),
      userLibraryItems: JSON.parse(JSON.stringify(override?.userLibraryItems ?? userLibraryItemsRef.current)),
      savedDummiePoses: JSON.parse(JSON.stringify(override?.savedDummiePoses ?? savedDummiePosesRef.current)),
      timelineMarkers: JSON.parse(JSON.stringify(override?.timelineMarkers ?? timelineMarkersRef.current)),
      cameraKeyframes: JSON.parse(JSON.stringify(override?.cameraKeyframes ?? cameraKeyframesRef.current)),
      actionTags: JSON.parse(JSON.stringify(override?.actionTags ?? actionTagsRef.current)),
      dummiePose: JSON.parse(JSON.stringify(override?.dummiePose ?? dummiePoseRef.current)),
      symmetryConfig: JSON.parse(JSON.stringify(override?.symmetryConfig ?? symmetryConfigRef.current)),
      guides: JSON.parse(JSON.stringify(override?.guides ?? guidesRef.current)),
      showPivot: override?.showPivot ?? showPivotRef.current,
      currentFrameIndex: override?.currentFrameIndex ?? currentFrameIndexRef.current,
      currentLayerIndex: override?.currentLayerIndex ?? currentLayerIndexRef.current,
      selectedVectorPathId:
        override?.selectedVectorPathId !== undefined
          ? override.selectedVectorPathId
          : selectedVectorPathIdRef.current,
      selectedVectorNodeIds:
        override?.selectedVectorNodeIds !== undefined
          ? [...override.selectedVectorNodeIds]
          : [...selectedVectorNodeIdsRef.current],
      canvasWidth: override?.canvasWidth ?? canvasWidthRef.current,
      canvasHeight: override?.canvasHeight ?? canvasHeightRef.current,
    };
    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    nextHistory.push(snap);
    if (nextHistory.length > 40) nextHistory.shift();
    historyRef.current = nextHistory;
    historyIndexRef.current = nextHistory.length - 1;
    setHistoryIndexState(historyIndexRef.current);
    setHistoryLengthState(nextHistory.length);
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
    if (!suppressDirtyMarkRef.current) {
      const curDocId = activeDocumentIdRef.current;
      setOpenDocuments((prev) =>
        prev.some((d) => d.id === curDocId && !d.isDirty)
          ? prev.map((d) => (d.id === curDocId ? { ...d, isDirty: true } : d))
          : prev
      );
    }
  }, []);

  const markDocumentSaved = useCallback(
    (docId: string, format: SaveAsFormatId, updatedName?: string) => {
      setOpenDocuments((prev) =>
        prev.map((d) =>
          d.id === docId
            ? {
                ...d,
                name: updatedName ? updatedName : d.name,
                isDirty: false,
                isNewUnsaved: false,
                hasSavedLocation: true,
                savedFormat: format,
              }
            : d
        )
      );
      if (updatedName && docId === activeDocumentIdRef.current) {
        setProjectName(updatedName);
      }
    },
    []
  );

  const pushHistory = useCallback(
    (newFrames: Frame[]) => {
      pushHistorySnapshot({ frames: newFrames });
    },
    [pushHistorySnapshot]
  );

  useEffect(() => {
    if (!hasInitializedHistoryRef.current) {
      hasInitializedHistoryRef.current = true;
      suppressDirtyMarkRef.current = true;
      pushHistorySnapshot();
      suppressDirtyMarkRef.current = false;
    }
  }, [pushHistorySnapshot]);

  const applyHistorySnapshot = useCallback((snap: HistorySnapshot, targetIndex: number) => {
    const restoredFrames: Frame[] = JSON.parse(JSON.stringify(snap.frames));
    const restoredGroups: LayerGroup[] = JSON.parse(JSON.stringify(snap.layerGroups));
    const restoredRefs: ReferenceItem[] = JSON.parse(JSON.stringify(snap.references));
    const restoredRefGroups: ReferenceGroup[] = JSON.parse(JSON.stringify(snap.referenceGroups || []));
    const restoredAssets: AssetLibraryItem[] = JSON.parse(JSON.stringify(snap.userLibraryItems || []));
    const restoredPoses: DummiePose[] = JSON.parse(JSON.stringify(snap.savedDummiePoses || []));
    const restoredMarkers: TimelineMarker[] = JSON.parse(JSON.stringify(snap.timelineMarkers || []));
    const restoredCamKfs: CameraKeyframe[] = JSON.parse(JSON.stringify(snap.cameraKeyframes || []));
    const restoredTags: ActionTag[] = JSON.parse(JSON.stringify(snap.actionTags || []));
    const restoredPose: DummiePose = JSON.parse(JSON.stringify(snap.dummiePose));
    const restoredSym: SymmetryConfig = JSON.parse(JSON.stringify(snap.symmetryConfig));
    const restoredGuides: CanvasGuide[] = JSON.parse(JSON.stringify(snap.guides || []));
    const safeFrameIdx = Math.max(0, Math.min(restoredFrames.length - 1, snap.currentFrameIndex));
    const maxLayerIdx = Math.max(0, (restoredFrames[safeFrameIdx]?.layers.length || 1) - 1);
    const safeLayerIdx = Math.max(0, Math.min(maxLayerIdx, snap.currentLayerIndex));

    framesRef.current = restoredFrames;
    layerGroupsRef.current = restoredGroups;
    referencesRef.current = restoredRefs;
    referenceGroupsRef.current = restoredRefGroups;
    userLibraryItemsRef.current = restoredAssets;
    savedDummiePosesRef.current = restoredPoses;
    timelineMarkersRef.current = restoredMarkers;
    cameraKeyframesRef.current = restoredCamKfs;
    actionTagsRef.current = restoredTags;
    dummiePoseRef.current = restoredPose;
    symmetryConfigRef.current = restoredSym;
    guidesRef.current = restoredGuides;
    showPivotRef.current = Boolean(snap.showPivot);
    currentFrameIndexRef.current = safeFrameIdx;
    currentLayerIndexRef.current = safeLayerIdx;
    selectedVectorPathIdRef.current = snap.selectedVectorPathId || null;
    selectedVectorNodeIdsRef.current = [...(snap.selectedVectorNodeIds || [])];

    if (typeof snap.canvasWidth === 'number' && snap.canvasWidth > 0) {
      canvasWidthRef.current = snap.canvasWidth;
      setCanvasWidth(snap.canvasWidth);
    }
    if (typeof snap.canvasHeight === 'number' && snap.canvasHeight > 0) {
      canvasHeightRef.current = snap.canvasHeight;
      setCanvasHeight(snap.canvasHeight);
    }
    setFrames(restoredFrames);
    setLayerGroups(restoredGroups);
    setReferences(restoredRefs);
    setReferenceGroups(restoredRefGroups);
    setUserLibraryItems(restoredAssets);
    setSavedDummiePoses(restoredPoses);
    setTimelineMarkers(restoredMarkers);
    setCameraKeyframes(restoredCamKfs);
    setActionTags(restoredTags);
    setDummiePose(restoredPose);
    setSymmetryConfig(restoredSym);
    setSymmetryEnabled(Boolean(restoredSym.enabled && restoredSym.mode !== 'none'));
    setGuides(restoredGuides);
    setShowPivot(Boolean(snap.showPivot));
    setCurrentFrameIndex(safeFrameIdx);
    setCurrentLayerIndex(safeLayerIdx);
    setSelectedLayerIndices([safeLayerIdx]);
    setSelectedFrameIndices([safeFrameIdx]);
    setSelectedVectorPathId(snap.selectedVectorPathId || null);
    setSelectedVectorNodeIds([...(snap.selectedVectorNodeIds || [])]);
    setLiveCanvasPreview(null);
    setTransformSession(null);

    setHistoryIndexState(targetIndex);
    setCanUndo(targetIndex > 0);
    setCanRedo(targetIndex < historyRef.current.length - 1);
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const snap = historyRef.current[historyIndexRef.current];
      if (snap) applyHistorySnapshot(snap, historyIndexRef.current);
    }
  }, [applyHistorySnapshot]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const snap = historyRef.current[historyIndexRef.current];
      if (snap) applyHistorySnapshot(snap, historyIndexRef.current);
    }
  }, [applyHistorySnapshot]);

  const handleJumpToHistory = useCallback(
    (targetIdx: number) => {
      if (targetIdx < 0 || targetIdx >= historyRef.current.length) return;
      historyIndexRef.current = targetIdx;
      const snap = historyRef.current[targetIdx];
      if (snap) applyHistorySnapshot(snap, targetIdx);
    },
    [applyHistorySnapshot]
  );

  // Global Layer Sync Helper: keeps layers marked with isGlobal=true shared dynamically across all frames
  const syncGlobalLayerAcrossFrames = useCallback(
    (allFramesList: Frame[], editedLayer: Layer): Frame[] => {
      if (!editedLayer.isGlobal) return allFramesList;
      return allFramesList.map((fr) => {
        const existingIdx = fr.layers.findIndex((l) => l.id === editedLayer.id);
        const syncedCopy: Layer = JSON.parse(JSON.stringify(editedLayer));
        if (existingIdx >= 0) {
          return {
            ...fr,
            layers: fr.layers.map((l, idx) => (idx === existingIdx ? syncedCopy : l)),
          };
        }
        return {
          ...fr,
          layers: [...fr.layers, syncedCopy],
        };
      });
    },
    []
  );

  const handlePickColorWithHistory = useCallback(
    (hex: string) => {
      setPrimaryColor(hex);
      const norm = hex.toLowerCase();
      setColorHistory((prev) => {
        const deduped = [hex, ...prev.filter((c) => c.toLowerCase() !== norm)];
        return deduped.slice(0, eyedropperConfig.historyLimit || 20);
      });
    },
    [eyedropperConfig.historyLimit]
  );

  const currentFrame = frames[currentFrameIndex] || frames[0];
  const currentLayer = currentFrame?.layers[currentLayerIndex] || currentFrame?.layers[0];
  const prevFrame = currentFrameIndex > 0 ? frames[currentFrameIndex - 1] : null;
  const nextFrame = currentFrameIndex < frames.length - 1 ? frames[currentFrameIndex + 1] : null;

  useEffect(() => {
    setLiveCanvasPreview(null);
  }, [currentFrameIndex, currentLayerIndex]);

  // Keep active persistent layer track synchronized when switching frames or playing animations
  useEffect(() => {
    const fr = frames[currentFrameIndex];
    if (!fr || !fr.layers || fr.layers.length === 0) return;
    const keys = computeFrameLayerTrackKeys(fr.layers);
    const desiredTrackKey = activeTrackKeyRef.current;
    if (desiredTrackKey) {
      const matchIdx = keys.indexOf(desiredTrackKey);
      if (matchIdx >= 0) {
        if (matchIdx !== currentLayerIndexRef.current) {
          currentLayerIndexRef.current = matchIdx;
          setCurrentLayerIndex(matchIdx);
          setSelectedLayerIndices([matchIdx]);
        }
        return;
      }
    } else if (keys[currentLayerIndexRef.current]) {
      setActiveTrackKey(keys[currentLayerIndexRef.current]);
      return;
    }
    if (currentLayerIndexRef.current >= fr.layers.length) {
      const clamped = Math.max(0, fr.layers.length - 1);
      currentLayerIndexRef.current = clamped;
      setCurrentLayerIndex(clamped);
      setSelectedLayerIndices([clamped]);
    }
  }, [currentFrameIndex, frames]);

  useEffect(() => {
    if (editingMask && !currentLayer?.mask) {
      setEditingMask(false);
    }
  }, [editingMask, currentLayer?.mask]);

  // Update current layer pixels (auto-syncs if layer isGlobal, preserves off-canvas buffer if enabled)
  const handleUpdateLayerPixels = useCallback(
    (newPixels: (string | null)[][], offCanvasPixels?: Record<string, string>) => {
      const prevFrames = framesRef.current;
      let editedLayer: Layer | null = null;
      let updated = prevFrames.map((f, fIdx) => {
        if (fIdx !== currentFrameIndex) return f;
        return {
          ...f,
          layers: f.layers.map((l, lIdx) => {
            if (lIdx !== currentLayerIndex) return l;
            editedLayer = {
              ...l,
              pixels: newPixels,
              offCanvasPixels: clipOutsideCanvas
                ? undefined
                : offCanvasPixels !== undefined
                ? offCanvasPixels
                : l.offCanvasPixels,
            };
            return editedLayer;
          }),
        };
      });
      if (editedLayer && (editedLayer as Layer).isGlobal) {
        updated = syncGlobalLayerAcrossFrames(updated, editedLayer);
      }
      framesRef.current = updated;
      setFrames(updated);
      pushHistorySnapshot({ frames: updated });
    },
    [currentFrameIndex, currentLayerIndex, clipOutsideCanvas, pushHistorySnapshot, syncGlobalLayerAcrossFrames]
  );

  // Commit tiled high-resolution layer edit (O(1) sparse tile update, zero dense arrays)
  const handleCommitTiledLayerEdit = useCallback(
    (layerId: string, newTiledStoreId: string) => {
      const prevFrames = framesRef.current;
      let editedLayer: Layer | null = null;
      let updated = prevFrames.map((f, fIdx) => {
        if (fIdx !== currentFrameIndex) return f;
        return {
          ...f,
          layers: f.layers.map((l) => {
            if (l.id !== layerId) return l;
            editedLayer = {
              ...l,
              tiledStoreId: newTiledStoreId,
              tiledRevision: (l.tiledRevision || 0) + 1,
            };
            return editedLayer;
          }),
        };
      });
      if (editedLayer && (editedLayer as Layer).isGlobal) {
        updated = syncGlobalLayerAcrossFrames(updated, editedLayer);
      }
      framesRef.current = updated;
      setFrames(updated);
      pushHistorySnapshot({ frames: updated });
    },
    [currentFrameIndex, pushHistorySnapshot, syncGlobalLayerAcrossFrames]
  );

  // Commit Tiles tool paint / erase / replace / autotile edit atomically (pixels + tileMapData)
  const handleCommitTileLayerEdit = useCallback(
    (newPixels: (string | null)[][], tileMapData: Record<string, string>) => {
      const prevFrames = framesRef.current;
      let editedLayer: Layer | null = null;
      let updated = prevFrames.map((f, fIdx) => {
        if (fIdx !== currentFrameIndex) return f;
        return {
          ...f,
          layers: f.layers.map((l, lIdx) => {
            if (lIdx !== currentLayerIndex) return l;
            editedLayer = {
              ...l,
              pixels: newPixels,
              tileMapData,
            };
            return editedLayer;
          }),
        };
      });
      if (editedLayer && (editedLayer as Layer).isGlobal) {
        updated = syncGlobalLayerAcrossFrames(updated, editedLayer);
      }
      framesRef.current = updated;
      setFrames(updated);
      pushHistorySnapshot({ frames: updated });
    },
    [currentFrameIndex, currentLayerIndex, pushHistorySnapshot, syncGlobalLayerAcrossFrames]
  );

  // Update hitboxes of current frame
  const handleUpdateHitboxes = useCallback(
    (newHitboxes: Hitbox[]) => {
      const updated = framesRef.current.map((f, fIdx) =>
        fIdx !== currentFrameIndex ? f : { ...f, hitboxes: newHitboxes }
      );
      framesRef.current = updated;
      setFrames(updated);
      pushHistorySnapshot({ frames: updated });
    },
    [currentFrameIndex, pushHistorySnapshot]
  );

  // Shift active layer pixels across ALL frames (including current frame) atomically by (dx, dy) when Move All Frames is linked
  const handleShiftAllFramesLayer = useCallback(
    (dx: number, dy: number) => {
      if (dx === 0 && dy === 0) return;
      const prevFrames = framesRef.current;
      const activeLayerName = prevFrames[currentFrameIndex]?.layers[currentLayerIndex]?.name;
      const updated = prevFrames.map((f, fIdx) => {
        let targetLayerIdx =
          fIdx === currentFrameIndex
            ? currentLayerIndex
            : f.layers.findIndex((l) => l.name === activeLayerName);
        if (targetLayerIdx === -1) {
          targetLayerIdx = Math.min(currentLayerIndex, f.layers.length - 1);
        }
        return {
          ...f,
          layers: f.layers.map((l, lIdx) => {
            if (lIdx !== targetLayerIdx || l.locked) return l;
            const res = shiftLayerPixelsNonDestructive(
              l.pixels,
              l.offCanvasPixels,
              dx,
              dy,
              canvasWidth,
              canvasHeight,
              clipOutsideCanvas
            );
            return { ...l, pixels: res.pixels, offCanvasPixels: res.offCanvasPixels };
          }),
        };
      });
      framesRef.current = updated;
      setFrames(updated);
      pushHistorySnapshot({ frames: updated });
      setImportNotification(
        `Desplazamiento enlazado aplicado a todos los fotogramas (${dx >= 0 ? `+${dx}` : dx}, ${dy >= 0 ? `+${dy}` : dy}px)`
      );
      setTimeout(() => setImportNotification(null), 2500);
    },
    [currentFrameIndex, currentLayerIndex, canvasWidth, canvasHeight, clipOutsideCanvas, pushHistorySnapshot]
  );

  // Clear current frame (handles both dense grids and massive tiled layers)
  const handleClearFrame = () => {
    const activeLayer = framesRef.current[currentFrameIndex]?.layers[currentLayerIndex];
    if (activeLayer && isLayerTiled(activeLayer)) {
      const emptyStore = new TiledLayerStore(canvasWidth, canvasHeight);
      const newStoreId = registerTiledStore(emptyStore);
      handleCommitTiledLayerEdit(activeLayer.id, newStoreId);
      return;
    }
    const emptyGrid = createEmptyGrid(canvasWidth, canvasHeight);
    handleUpdateLayerPixels(emptyGrid);
  };

  // Canvas Size with Anchor (unlimited dimensions & tiled-aware)
  const handleApplyCanvasSize = (newW: number, newH: number, anchor: AnchorPosition) => {
    const resized = resizeCanvasGrid(frames, canvasWidth, canvasHeight, newW, newH, anchor);
    canvasWidthRef.current = newW;
    canvasHeightRef.current = newH;
    setCanvasWidth(newW);
    setCanvasHeight(newH);
    framesRef.current = resized;
    setFrames(resized);
    setGlobalPivot({ x: Math.floor(newW / 2), y: Math.floor(newH * 0.8) });
    pushHistorySnapshot({ frames: resized, canvasWidth: newW, canvasHeight: newH });
  };

  // Visual Canvas Edit Tool (Editar Lienzo) helpers & commit
  const hasOffCanvasContent = useMemo(() => {
    for (const f of frames) {
      for (const l of f.layers) {
        if (l.offCanvasPixels && Object.keys(l.offCanvasPixels).length > 0) {
          return true;
        }
      }
    }
    return false;
  }, [frames]);

  const handleResetCanvasEdit = useCallback(() => {
    setCanvasEditRect({ left: 0, top: 0, width: canvasWidth, height: canvasHeight });
  }, [canvasWidth, canvasHeight]);

  const handleCancelCanvasEdit = useCallback(() => {
    setCanvasEditRect({ left: 0, top: 0, width: canvasWidth, height: canvasHeight });
    const prevTool = previousToolBeforeCanvasEditRef.current;
    setActiveTool(prevTool && prevTool !== 'canvas_edit' ? prevTool : 'pencil');
  }, [canvasWidth, canvasHeight]);

  const handleFitCanvasEditToContent = useCallback(() => {
    const bounds = computeAllFramesContentBounds(framesRef.current, canvasWidth, canvasHeight);
    if (!bounds.hasContent) {
      setImportNotification('El lienzo no contiene píxeles para ajustar');
      setTimeout(() => setImportNotification(null), 2200);
      return;
    }
    const nextRect: CanvasEditRect = {
      left: bounds.minX,
      top: bounds.minY,
      width: Math.max(1, bounds.maxX - bounds.minX + 1),
      height: Math.max(1, bounds.maxY - bounds.minY + 1),
    };
    setCanvasEditRect(nextRect);
    setImportNotification(
      `Límites ajustados al contenido: ${nextRect.width}×${nextRect.height} px`
    );
    setTimeout(() => setImportNotification(null), 2400);
  }, [canvasWidth, canvasHeight]);

  const handleApplyCanvasEdit = useCallback(() => {
    const isNoop =
      canvasEditRect.left === 0 &&
      canvasEditRect.top === 0 &&
      canvasEditRect.width === canvasWidth &&
      canvasEditRect.height === canvasHeight &&
      canvasEditConfig.overflowMode !== 'auto_expand';

    if (isNoop) {
      handleCancelCanvasEdit();
      return;
    }

    const oldW = canvasWidth;
    const oldH = canvasHeight;
    const result = applyCanvasRectTransform(
      framesRef.current,
      oldW,
      oldH,
      canvasEditRect,
      canvasEditConfig.overflowMode
    );

    const nextGuides =
      result.offsetX !== 0 || result.offsetY !== 0
        ? guidesRef.current.map((g) => ({
            ...g,
            position:
              g.orientation === 'vertical'
                ? g.position + result.offsetX
                : g.position + result.offsetY,
          }))
        : guidesRef.current;

    const nextSym =
      result.offsetX !== 0 || result.offsetY !== 0
        ? {
            ...symmetryConfigRef.current,
            axisX: symmetryConfigRef.current.axisX + result.offsetX,
            axisY: symmetryConfigRef.current.axisY + result.offsetY,
            lineP1: {
              x: symmetryConfigRef.current.lineP1.x + result.offsetX,
              y: symmetryConfigRef.current.lineP1.y + result.offsetY,
            },
            lineP2: {
              x: symmetryConfigRef.current.lineP2.x + result.offsetX,
              y: symmetryConfigRef.current.lineP2.y + result.offsetY,
            },
          }
        : symmetryConfigRef.current;

    canvasWidthRef.current = result.width;
    canvasHeightRef.current = result.height;
    setCanvasWidth(result.width);
    setCanvasHeight(result.height);
    framesRef.current = result.frames;
    setFrames(result.frames);
    setGlobalPivot((prev) => ({
      x: Math.max(0, Math.min(result.width, prev.x + result.offsetX)),
      y: Math.max(0, Math.min(result.height, prev.y + result.offsetY)),
    }));
    if (result.offsetX !== 0 || result.offsetY !== 0) {
      guidesRef.current = nextGuides;
      setGuides(nextGuides);
      symmetryConfigRef.current = nextSym;
      setSymmetryConfig(nextSym);
    }
    setCanvasEditRect({ left: 0, top: 0, width: result.width, height: result.height });
    pushHistorySnapshot({
      frames: result.frames,
      canvasWidth: result.width,
      canvasHeight: result.height,
      guides: nextGuides,
      symmetryConfig: nextSym,
    });

    const modeLabel =
      canvasEditConfig.overflowMode === 'keep'
        ? 'contenido fuera conservado'
        : canvasEditConfig.overflowMode === 'crop'
        ? 'recorte limpio'
        : 'auto-expandido al contenido';
    setImportNotification(
      `Lienzo actualizado: ${oldW}×${oldH} → ${result.width}×${result.height} px (${modeLabel})`
    );
    setTimeout(() => setImportNotification(null), 3000);
  }, [
    canvasEditRect,
    canvasEditConfig.overflowMode,
    canvasWidth,
    canvasHeight,
    handleCancelCanvasEdit,
    pushHistorySnapshot,
  ]);

  // Image Size / Rescale (Nearest Neighbor default; Bilinear/Bicubic only if explicitly chosen)
  const handleApplyImageSize = (
    newW: number,
    newH: number,
    interpolation: InterpolationMode = 'nearest'
  ) => {
    const rescaled = rescaleSpriteGrid(
      frames,
      canvasWidth,
      canvasHeight,
      newW,
      newH,
      interpolation
    );
    canvasWidthRef.current = newW;
    canvasHeightRef.current = newH;
    setCanvasWidth(newW);
    setCanvasHeight(newH);
    framesRef.current = rescaled;
    setFrames(rescaled);
    setGlobalPivot({ x: Math.floor(newW / 2), y: Math.floor(newH * 0.8) });
    pushHistorySnapshot({ frames: rescaled, canvasWidth: newW, canvasHeight: newH });
  };

  // Flip Horizontal
  const handleFlipCanvasHorizontal = () => {
    const flipped = flipCanvasHorizontal(frames, canvasWidth, canvasHeight);
    setFrames(flipped);
    pushHistory(flipped);
  };

  // Flip Vertical
  const handleFlipCanvasVertical = () => {
    const flipped = flipCanvasVertical(frames, canvasWidth, canvasHeight);
    setFrames(flipped);
    pushHistory(flipped);
  };

  // Rotate Clockwise
  const handleRotateCanvasClockwise = () => {
    const rotated = rotateCanvasClockwise(frames, canvasWidth, canvasHeight);
    setCanvasWidth(rotated.newWidth);
    setCanvasHeight(rotated.newHeight);
    setFrames(rotated.frames);
    setGlobalPivot({ x: Math.floor(rotated.newWidth / 2), y: Math.floor(rotated.newHeight * 0.8) });
    pushHistory(rotated.frames);
  };

  // =========================================================
  // TRANSFORM SYSTEM HANDLERS (Edición > Transformar)
  // =========================================================
  const startTransformSession = useCallback(
    (mode: TransformMode = 'free', extraPatch?: Partial<TransformParameters>) => {
      if (!currentLayer || currentLayer.locked) return;
      const basePixels =
        currentLayer.nonDestructiveTransform && currentLayer.transformSourcePixels
          ? currentLayer.transformSourcePixels.map((r) => [...r])
          : currentLayer.pixels.map((r) => [...r]);

      const pixelBounds =
        selectedLayerIndices.length > 1
          ? computeMultiLayerBounds(
              selectedLayerIndices
                .map((i) => currentFrame.layers[i])
                .filter(Boolean),
              canvasWidth,
              canvasHeight,
              selection
            )
          : computeGridContentBounds(basePixels, selection);
      const vecBounds = computeVectorPathsBounds(currentLayer.vectorPaths);
      const effectiveBounds =
        pixelBounds.empty && vecBounds ? vecBounds : pixelBounds;

      const initParams = createInitialTransformParams(
        effectiveBounds,
        mode,
        currentLayer.nonDestructiveTransform || undefined
      );
      if (selection && selection.active) {
        initParams.targetScope = 'selection';
      } else if (selectedLayerIndices.length > 1) {
        initParams.targetScope = 'selected_layers';
      }
      if (extraPatch) {
        Object.assign(initParams, extraPatch);
      }

      setTransformSession({
        params: initParams,
        sourceGrid: basePixels,
        sourceVectorPaths: currentLayer.vectorPaths
          ? currentLayer.vectorPaths.map((vp) => ({
              ...vp,
              nodes: vp.nodes.map((n) => ({ ...n })),
            }))
          : undefined,
      });
    },
    [currentLayer, currentFrame.layers, canvasWidth, canvasHeight, selection, selectedLayerIndices]
  );

  const handleCancelTransform = useCallback(() => {
    setTransformSession(null);
  }, []);

  const handleCommitTransform = useCallback(() => {
    if (!transformSession) return;
    const { params } = transformSession;
    const prevFrames = framesRef.current;

    const targetFrameSet = new Set<number>();
    if (params.frameScope === 'all_frames') {
      prevFrames.forEach((_, i) => targetFrameSet.add(i));
    } else if (params.frameScope === 'selected_frames' && selectedFrameIndices.length > 0) {
      selectedFrameIndices.forEach((i) => targetFrameSet.add(i));
    } else {
      targetFrameSet.add(currentFrameIndex);
    }

    const activeLayerRef = prevFrames[currentFrameIndex]?.layers[currentLayerIndex];
    const targetGroupId = activeLayerRef?.groupId || activeGroupId;
    const selectedLayerIdSet = new Set(
      selectedLayerIndices
        .map((idx) => prevFrames[currentFrameIndex]?.layers[idx]?.id)
        .filter(Boolean)
    );

    const updatedFrames = prevFrames.map((frame, fIdx) => {
      if (!targetFrameSet.has(fIdx)) return frame;
      return {
        ...frame,
        layers: frame.layers.map((layer, lIdx) => {
          if (layer.locked) return layer;

          let matchesTarget = false;
          if (params.targetScope === 'group' && targetGroupId) {
            matchesTarget = layer.groupId === targetGroupId;
          } else if (params.targetScope === 'selected_layers') {
            matchesTarget =
              fIdx === currentFrameIndex
                ? selectedLayerIndices.includes(lIdx)
                : selectedLayerIdSet.has(layer.id) || layer.name === activeLayerRef?.name;
          } else {
            matchesTarget =
              fIdx === currentFrameIndex
                ? lIdx === currentLayerIndex
                : layer.name === activeLayerRef?.name;
          }
          if (!matchesTarget) return layer;

          const isPrimaryEditingLayer =
            fIdx === currentFrameIndex && lIdx === currentLayerIndex;
          const srcPixels = isPrimaryEditingLayer
            ? transformSession.sourceGrid
            : layer.nonDestructiveTransform && layer.transformSourcePixels
            ? layer.transformSourcePixels
            : layer.pixels;

          const res = applyTransformWithOffCanvas(
            srcPixels,
            layer.offCanvasPixels,
            params,
            canvasWidth,
            canvasHeight,
            clipOutsideCanvas,
            params.targetScope === 'selection' ? selection : null
          );

          const nextVectorPaths =
            layer.vectorPaths && layer.vectorPaths.length > 0
              ? (isPrimaryEditingLayer && transformSession.sourceVectorPaths
                  ? transformSession.sourceVectorPaths
                  : layer.vectorPaths
                ).map((vp) => transformVectorPath(vp, params))
              : layer.vectorPaths;

          return {
            ...layer,
            pixels: res.pixels,
            offCanvasPixels: res.offCanvasPixels,
            vectorPaths: nextVectorPaths,
            nonDestructiveTransform: params.nonDestructive ? { ...params } : null,
            transformSourcePixels: params.nonDestructive
              ? srcPixels.map((r) => [...r])
              : null,
          };
        }),
      };
    });

    framesRef.current = updatedFrames;
    setFrames(updatedFrames);
    pushHistorySnapshot({ frames: updatedFrames });
    setLastTransformParams({ ...params });
    setTransformSession(null);
  }, [
    transformSession,
    selectedFrameIndices,
    currentFrameIndex,
    currentLayerIndex,
    activeGroupId,
    selectedLayerIndices,
    canvasWidth,
    canvasHeight,
    clipOutsideCanvas,
    selection,
    pushHistorySnapshot,
  ]);

  const applyInstantLayerGridTransform = useCallback(
    (transformer: (grid: (string | null)[][]) => (string | null)[][]) => {
      if (!currentLayer || currentLayer.locked) return;
      if (transformSession) {
        const nextSource = transformer(transformSession.sourceGrid);
        const bounds = computeGridContentBounds(nextSource, selection);
        setTransformSession({
          ...transformSession,
          sourceGrid: nextSource,
          params: createInitialTransformParams(bounds, transformSession.params.mode),
        });
        return;
      }
      const nextGrid = transformer(currentLayer.pixels);
      handleUpdateLayerPixels(nextGrid);
    },
    [currentLayer, transformSession, selection, handleUpdateLayerPixels]
  );

  const handleTransformAction = useCallback(
    (action: TransformActionId) => {
      switch (action) {
        case 'free':
        case 'scale':
        case 'rotate':
        case 'skew':
        case 'distort':
        case 'perspective':
        case 'warp':
          startTransformSession(action);
          break;
        case 'pp_rotate':
          startTransformSession('rotate', { pixelPerfectRotate: true, pixelPerfect: true, interpolation: 'nearest' });
          break;
        case 'pp_resize':
          startTransformSession('scale', { pixelPerfect: true, integerScale: true, interpolation: 'nearest' });
          break;
        case 'tile_mode':
          startTransformSession('free', { tileWrap: true });
          break;
        case 'spritesheet_mode':
          startTransformSession('free', { frameScope: 'all_frames', snapToGrid: true });
          break;
        case 'sym_h':
          startTransformSession('free', { symmetryMode: 'horizontal' });
          break;
        case 'sym_v':
          startTransformSession('free', { symmetryMode: 'vertical' });
          break;
        case 'sym_radial':
          startTransformSession('free', { symmetryMode: 'radial' });
          break;
        case 'flip_h':
          applyInstantLayerGridTransform((g) => flipGridH(g, selection));
          break;
        case 'flip_v':
          applyInstantLayerGridTransform((g) => flipGridV(g, selection));
          break;
        case 'rot_90_cw':
          applyInstantLayerGridTransform((g) => rotateGridOrthogonal(g, 90, selection));
          break;
        case 'rot_90_ccw':
          applyInstantLayerGridTransform((g) => rotateGridOrthogonal(g, -90, selection));
          break;
        case 'rot_180':
          applyInstantLayerGridTransform((g) => rotateGridOrthogonal(g, 180, selection));
          break;
        case 'snap_grid':
          applyInstantLayerGridTransform((g) => snapGridContentToGrid(g, 4));
          break;
        case 'center_canvas':
          applyInstantLayerGridTransform((g) => centerGridInCanvas(g));
          break;
        case 'scale_2x_hq':
          applyInstantLayerGridTransform((g) => applyHQScaleInCanvas(g, 2, selection));
          break;
        case 'scale_3x_hq':
          applyInstantLayerGridTransform((g) => applyHQScaleInCanvas(g, 3, selection));
          break;
        case 'scale_4x_hq':
          applyInstantLayerGridTransform((g) => applyHQScaleInCanvas(g, 4, selection));
          break;
        case 'reset':
          if (currentLayer?.transformSourcePixels) {
            const restored = currentLayer.transformSourcePixels.map((r) => [...r]);
            const updated = framesRef.current.map((f, fIdx) =>
              fIdx !== currentFrameIndex
                ? f
                : {
                    ...f,
                    layers: f.layers.map((l, lIdx) =>
                      lIdx === currentLayerIndex
                        ? {
                            ...l,
                            pixels: restored,
                            nonDestructiveTransform: null,
                            transformSourcePixels: null,
                          }
                        : l
                    ),
                  }
            );
            framesRef.current = updated;
            setFrames(updated);
            pushHistorySnapshot({ frames: updated });
          }
          if (transformSession) {
            const bounds = computeGridContentBounds(transformSession.sourceGrid, selection);
            setTransformSession({
              ...transformSession,
              params: createInitialTransformParams(bounds, transformSession.params.mode),
            });
          }
          break;
        case 'repeat':
          if (lastTransformParams && currentLayer && !currentLayer.locked) {
            const repeated = applyTransformToGrid(
              currentLayer.pixels,
              lastTransformParams,
              canvasWidth,
              canvasHeight,
              selection
            );
            handleUpdateLayerPixels(repeated);
          }
          break;
      }
    },
    [
      startTransformSession,
      applyInstantLayerGridTransform,
      selection,
      currentLayer,
      currentFrameIndex,
      currentLayerIndex,
      transformSession,
      lastTransformParams,
      canvasWidth,
      canvasHeight,
      handleUpdateLayerPixels,
      pushHistory,
    ]
  );

  // =========================================================
  // VECTOR LINE & SMART PIXEL CURVE HANDLERS
  // =========================================================
  const handleUpdateLayerVectorPaths = useCallback(
    (paths: VectorPath[], createVectorLayerIfEmpty: boolean = false) => {
      if (!currentLayer || currentLayer.locked) return;
      const layerHasRasterPixels =
        currentLayer.layerType !== 'vector' &&
        !currentLayer.vectorPaths?.length &&
        currentLayer.pixels.some((row) => row.some((c) => c !== null));

      if (createVectorLayerIfEmpty && layerHasRasterPixels) {
        const nextIdx = framesRef.current[currentFrameIndex]?.layers.length || 0;
        const newVecLayer: Layer = {
          id: `layer-vec-${Date.now()}`,
          name: `Vectores ${nextIdx + 1}`,
          visible: true,
          locked: false,
          opacity: 1,
          fillOpacity: 1,
          blendMode: 'normal',
          layerType: 'vector',
          pixels: createEmptyGrid(canvasWidth, canvasHeight),
          vectorPaths: paths,
        };
        const updated = framesRef.current.map((f, idx) =>
          idx === currentFrameIndex
            ? { ...f, layers: [...f.layers, newVecLayer] }
            : f
        );
        framesRef.current = updated;
        currentLayerIndexRef.current = nextIdx;
        setFrames(updated);
        setCurrentLayerIndex(nextIdx);
        pushHistorySnapshot({ frames: updated, currentLayerIndex: nextIdx });
        return;
      }

      const updated = framesRef.current.map((f, fIdx) =>
        fIdx !== currentFrameIndex
          ? f
          : {
              ...f,
              layers: f.layers.map((l, lIdx) =>
                lIdx === currentLayerIndex
                  ? {
                      ...l,
                      layerType:
                        l.layerType === 'raster' && createVectorLayerIfEmpty && !layerHasRasterPixels
                          ? 'vector'
                          : l.layerType,
                      vectorPaths: paths,
                    }
                  : l
              ),
            }
      );
      framesRef.current = updated;
      setFrames(updated);
      pushHistorySnapshot({ frames: updated });
    },
    [currentLayer, currentFrameIndex, currentLayerIndex, canvasWidth, canvasHeight, pushHistorySnapshot]
  );

  const handleBakeVectorPath = useCallback(
    (path: VectorPath, rasterizedPixels: (string | null)[][]) => {
      if (!currentLayer || currentLayer.locked) return;
      const updated = framesRef.current.map((f, fIdx) =>
        fIdx !== currentFrameIndex
          ? f
          : {
              ...f,
              layers: f.layers.map((l, lIdx) =>
                lIdx === currentLayerIndex
                  ? {
                      ...l,
                      pixels: rasterizedPixels,
                      vectorPaths: (l.vectorPaths || []).filter((p) => p.id !== path.id),
                    }
                  : l
              ),
            }
      );
      framesRef.current = updated;
      selectedVectorPathIdRef.current = null;
      selectedVectorNodeIdsRef.current = [];
      setFrames(updated);
      setSelectedVectorPathId(null);
      setSelectedVectorNodeIds([]);
      pushHistorySnapshot({ frames: updated, selectedVectorPathId: null, selectedVectorNodeIds: [] });
    },
    [currentLayer, currentFrameIndex, currentLayerIndex, pushHistorySnapshot]
  );

  const handleSetCameraKeyframe = useCallback(
    (kf: CameraKeyframe) => {
      const nextKfs = [
        ...cameraKeyframesRef.current.filter((item) => item.frameIndex !== kf.frameIndex),
        kf,
      ].sort((a, b) => a.frameIndex - b.frameIndex);
      cameraKeyframesRef.current = nextKfs;
      setCameraKeyframes(nextKfs);
      pushHistorySnapshot({ cameraKeyframes: nextKfs });
    },
    [pushHistorySnapshot]
  );

  const handleRemoveCameraKeyframe = useCallback(
    (frameIdx: number) => {
      const nextKfs = cameraKeyframesRef.current.filter((item) => item.frameIndex !== frameIdx);
      cameraKeyframesRef.current = nextKfs;
      setCameraKeyframes(nextKfs);
      pushHistorySnapshot({ cameraKeyframes: nextKfs });
    },
    [pushHistorySnapshot]
  );

  const handleConvertVectorPath = useCallback(
    (
      path: VectorPath,
      target: 'to_selection' | 'to_shape' | 'to_raster' | 'to_brush' | 'to_route'
    ) => {
      if (!currentLayer) return;
      if (target === 'to_selection') {
        const sel = pathToSelectionArea(path, canvasWidth, canvasHeight);
        if (sel) {
          setSelection(sel);
          setActiveTool('select');
        }
      } else if (target === 'to_shape') {
        const nextPaths = (currentLayer.vectorPaths || []).map((p) =>
          p.id === path.id ? { ...p, closed: true, fillColor: p.fillColor ? null : primaryColor } : p
        );
        handleUpdateLayerVectorPaths(nextPaths);
      } else if (target === 'to_raster') {
        const rasterized = rasterizeVectorPathsToGrid(
          currentLayer.vectorPaths || [path],
          canvasWidth,
          canvasHeight,
          currentLayer.layerType === 'vector' ? null : currentLayer.pixels
        );
        const updated: Frame[] = framesRef.current.map((f, fIdx) =>
          fIdx !== currentFrameIndex
            ? f
            : {
                ...f,
                layers: f.layers.map((l, lIdx) =>
                  lIdx === currentLayerIndex
                    ? { ...l, layerType: 'raster' as LayerType, pixels: rasterized, vectorPaths: [] as VectorPath[] }
                    : l
                ),
              }
        );
        framesRef.current = updated;
        setFrames(updated);
        pushHistorySnapshot({ frames: updated });
        setSelectedVectorPathId(null);
        setSelectedVectorNodeIds([]);
      } else if (target === 'to_brush') {
        const mappedShape =
          path.profile === 'round'
            ? 'circle'
            : path.profile === 'calligraphic'
            ? 'slash_right'
            : 'square';
        handleChangeBrushSettings({
          ...brushSettings,
          size: Math.max(1, Math.min(2048, Math.round(path.strokeWidth))),
          shape: mappedShape,
          pixelPerfect: path.pixelPerfect || path.smartPixelCurve,
        });
        setActiveTool('pencil');
      } else if (target === 'to_route') {
        const nextPaths = (currentLayer.vectorPaths || []).map((p) =>
          p.id === path.id ? { ...p, closed: false, fillColor: null, mode: 'open' as const } : p
        );
        handleUpdateLayerVectorPaths(nextPaths);
      }
      setImportNotification(`Vectores convertidos (${target}).`);
      setTimeout(() => setImportNotification(null), 2000);
    },
    [
      currentLayer,
      canvasWidth,
      canvasHeight,
      primaryColor,
      handleUpdateLayerVectorPaths,
      currentFrameIndex,
      currentLayerIndex,
      pushHistory,
      brushSettings,
      handleChangeBrushSettings,
    ]
  );

  // System 2: Vector Selection Actions for PropertiesPanel (Black / White Pointer)
  const handleVectorSelectionAction = useCallback(
    (
      action:
        | 'duplicate_object'
        | 'bring_front'
        | 'send_back'
        | 'flip_h'
        | 'flip_v'
        | 'rot_15_cw'
        | 'rot_15_ccw'
        | 'scale_up'
        | 'scale_down'
        | 'join_nodes'
        | 'split_node'
        | 'node_corner'
        | 'node_smooth'
        | 'node_symmetric'
        | 'break_handles'
        | 'restore_handles'
        | 'align_h'
        | 'align_v'
        | 'distribute_h'
    ) => {
      if (!currentLayer?.vectorPaths?.length || !selectedVectorPathId) return;
      const paths = [...currentLayer.vectorPaths];
      const idx = paths.findIndex((p) => p.id === selectedVectorPathId);
      if (idx === -1) return;
      const target = paths[idx];

      if (action === 'duplicate_object') {
        const copyId = `vpath-dup-${Date.now()}`;
        const cloned: VectorPath = {
          ...JSON.parse(JSON.stringify(target)),
          id: copyId,
          name: `${target.name} (Copia)`,
          nodes: target.nodes.map((n, i) => ({
            ...n,
            id: `${n.id}-c${i}`,
            x: n.x + 3,
            y: n.y + 3,
            inHandleX: n.inHandleX !== undefined ? n.inHandleX + 3 : undefined,
            inHandleY: n.inHandleY !== undefined ? n.inHandleY + 3 : undefined,
            outHandleX: n.outHandleX !== undefined ? n.outHandleX + 3 : undefined,
            outHandleY: n.outHandleY !== undefined ? n.outHandleY + 3 : undefined,
          })),
        };
        handleUpdateLayerVectorPaths([...paths, cloned]);
        setSelectedVectorPathId(copyId);
      } else if (action === 'bring_front') {
        const next = paths.filter((p) => p.id !== selectedVectorPathId);
        next.push(target);
        handleUpdateLayerVectorPaths(next);
      } else if (action === 'send_back') {
        const next = paths.filter((p) => p.id !== selectedVectorPathId);
        next.unshift(target);
        handleUpdateLayerVectorPaths(next);
      } else if (action === 'flip_h' || action === 'flip_v') {
        const xs = target.nodes.map((n) => n.x);
        const ys = target.nodes.map((n) => n.y);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        const flipped: VectorPath = {
          ...target,
          nodes: target.nodes.map((n) => ({
            ...n,
            x: action === 'flip_h' ? 2 * cx - n.x : n.x,
            y: action === 'flip_v' ? 2 * cy - n.y : n.y,
            inHandleX: n.inHandleX !== undefined ? (action === 'flip_h' ? 2 * cx - n.inHandleX : n.inHandleX) : undefined,
            inHandleY: n.inHandleY !== undefined ? (action === 'flip_v' ? 2 * cy - n.inHandleY : n.inHandleY) : undefined,
            outHandleX: n.outHandleX !== undefined ? (action === 'flip_h' ? 2 * cx - n.outHandleX : n.outHandleX) : undefined,
            outHandleY: n.outHandleY !== undefined ? (action === 'flip_v' ? 2 * cy - n.outHandleY : n.outHandleY) : undefined,
          })),
        };
        handleUpdateLayerVectorPaths(paths.map((p) => (p.id === target.id ? flipped : p)));
      } else if (action === 'rot_15_cw' || action === 'rot_15_ccw') {
        const angle = (action === 'rot_15_cw' ? 15 : -15) * (Math.PI / 180);
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const xs = target.nodes.map((n) => n.x);
        const ys = target.nodes.map((n) => n.y);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        const rotPt = (px: number, py: number) => ({
          x: cx + (px - cx) * cosA - (py - cy) * sinA,
          y: cy + (px - cx) * sinA + (py - cy) * cosA,
        });
        const rotated: VectorPath = {
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
        handleUpdateLayerVectorPaths(paths.map((p) => (p.id === target.id ? rotated : p)));
      } else if (action === 'scale_up' || action === 'scale_down') {
        const s = action === 'scale_up' ? 1.15 : 0.85;
        const xs = target.nodes.map((n) => n.x);
        const ys = target.nodes.map((n) => n.y);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        const scaled: VectorPath = {
          ...target,
          nodes: target.nodes.map((n) => ({
            ...n,
            x: cx + (n.x - cx) * s,
            y: cy + (n.y - cy) * s,
            inHandleX: n.inHandleX !== undefined ? cx + (n.inHandleX - cx) * s : undefined,
            inHandleY: n.inHandleY !== undefined ? cy + (n.inHandleY - cy) * s : undefined,
            outHandleX: n.outHandleX !== undefined ? cx + (n.outHandleX - cx) * s : undefined,
            outHandleY: n.outHandleY !== undefined ? cy + (n.outHandleY - cy) * s : undefined,
          })),
        };
        handleUpdateLayerVectorPaths(paths.map((p) => (p.id === target.id ? scaled : p)));
      } else if (action === 'node_corner' || action === 'node_smooth' || action === 'node_symmetric') {
        const nextType = action === 'node_corner' ? 'corner' : action === 'node_smooth' ? 'smooth' : 'symmetric';
        const updated: VectorPath = {
          ...target,
          nodes: target.nodes.map((n, i) => {
            if (!selectedVectorNodeIds.includes(n.id)) return n;
            if (nextType === 'corner') {
              return { ...n, nodeType: 'corner' };
            }
            const prev = target.nodes[Math.max(0, i - 1)];
            const next = target.nodes[Math.min(target.nodes.length - 1, i + 1)];
            const dx = (next.x - prev.x) * 0.2;
            const dy = (next.y - prev.y) * 0.2;
            return {
              ...n,
              nodeType: nextType,
              inHandleX: n.inHandleX ?? n.x - dx,
              inHandleY: n.inHandleY ?? n.y - dy,
              outHandleX: n.outHandleX ?? n.x + dx,
              outHandleY: n.outHandleY ?? n.y + dy,
            };
          }),
        };
        handleUpdateLayerVectorPaths(paths.map((p) => (p.id === target.id ? updated : p)));
      } else if (action === 'break_handles') {
        const updated: VectorPath = {
          ...target,
          nodes: target.nodes.map((n) =>
            selectedVectorNodeIds.includes(n.id)
              ? { ...n, nodeType: 'corner', inHandleX: undefined, inHandleY: undefined, outHandleX: undefined, outHandleY: undefined }
              : n
          ),
        };
        handleUpdateLayerVectorPaths(paths.map((p) => (p.id === target.id ? updated : p)));
      } else if (action === 'restore_handles') {
        const updated: VectorPath = {
          ...target,
          nodes: target.nodes.map((n, i) => {
            if (!selectedVectorNodeIds.includes(n.id)) return n;
            const prev = target.nodes[Math.max(0, i - 1)];
            const next = target.nodes[Math.min(target.nodes.length - 1, i + 1)];
            const dx = (next.x - prev.x) * 0.22 || 2;
            const dy = (next.y - prev.y) * 0.22 || 0;
            return {
              ...n,
              nodeType: 'smooth',
              inHandleX: n.x - dx,
              inHandleY: n.y - dy,
              outHandleX: n.x + dx,
              outHandleY: n.y + dy,
            };
          }),
        };
        handleUpdateLayerVectorPaths(paths.map((p) => (p.id === target.id ? updated : p)));
      } else if (action === 'join_nodes') {
        if (selectedVectorNodeIds.length >= 2) {
          const sel = target.nodes.filter((n) => selectedVectorNodeIds.includes(n.id));
          const avgX = sel.reduce((a, b) => a + b.x, 0) / sel.length;
          const avgY = sel.reduce((a, b) => a + b.y, 0) / sel.length;
          let kept = false;
          const nextNodes = target.nodes.filter((n) => {
            if (!selectedVectorNodeIds.includes(n.id)) return true;
            if (!kept) {
              kept = true;
              return true;
            }
            return false;
          }).map((n) => (selectedVectorNodeIds.includes(n.id) ? { ...n, x: avgX, y: avgY } : n));
          handleUpdateLayerVectorPaths(paths.map((p) => (p.id === target.id ? { ...target, nodes: nextNodes } : p)));
          setSelectedVectorNodeIds(nextNodes.length > 0 ? [nextNodes[0].id] : []);
        }
      } else if (action === 'split_node') {
        if (selectedVectorNodeIds.length > 0 && target.nodes.length >= 2) {
          const splitIdx = target.nodes.findIndex((n) => selectedVectorNodeIds.includes(n.id));
          if (splitIdx > 0 && splitIdx < target.nodes.length - 1) {
            const firstHalf: VectorPath = {
              ...target,
              id: `${target.id}-a`,
              closed: false,
              nodes: target.nodes.slice(0, splitIdx + 1),
            };
            const secondHalf: VectorPath = {
              ...target,
              id: `${target.id}-b-${Date.now()}`,
              name: `${target.name} (Parte 2)`,
              closed: false,
              nodes: target.nodes.slice(splitIdx).map((n) => ({ ...n, id: `${n.id}-s`, x: n.x + 1, y: n.y + 1 })),
            };
            const nextPaths = paths.flatMap((p) => (p.id === target.id ? [firstHalf, secondHalf] : [p]));
            handleUpdateLayerVectorPaths(nextPaths);
          }
        }
      } else if (action === 'align_h' || action === 'align_v') {
        const sel = target.nodes.filter((n) => selectedVectorNodeIds.includes(n.id));
        if (sel.length >= 2) {
          const avgX = sel.reduce((a, b) => a + b.x, 0) / sel.length;
          const avgY = sel.reduce((a, b) => a + b.y, 0) / sel.length;
          const updated: VectorPath = {
            ...target,
            nodes: target.nodes.map((n) =>
              selectedVectorNodeIds.includes(n.id)
                ? { ...n, x: action === 'align_h' ? avgX : n.x, y: action === 'align_v' ? avgY : n.y }
                : n
            ),
          };
          handleUpdateLayerVectorPaths(paths.map((p) => (p.id === target.id ? updated : p)));
        }
      } else if (action === 'distribute_h') {
        const sel = target.nodes
          .filter((n) => selectedVectorNodeIds.includes(n.id))
          .sort((a, b) => a.x - b.x);
        if (sel.length >= 3) {
          const minX = sel[0].x;
          const maxX = sel[sel.length - 1].x;
          const step = (maxX - minX) / (sel.length - 1);
          const targetXMap = new Map(sel.map((n, i) => [n.id, minX + step * i]));
          const updated: VectorPath = {
            ...target,
            nodes: target.nodes.map((n) => (targetXMap.has(n.id) ? { ...n, x: targetXMap.get(n.id)! } : n)),
          };
          handleUpdateLayerVectorPaths(paths.map((p) => (p.id === target.id ? updated : p)));
        }
      }
    },
    [currentLayer, selectedVectorPathId, selectedVectorNodeIds, handleUpdateLayerVectorPaths]
  );

  // Create New Project (unlimited canvas resolution + sparse TiledLayerStore for huge canvases)
  const handleCreateProjectConfig = useCallback(
    (cfg: NewProjectConfig) => {
      const scale = Math.max(1, Math.round(cfg.pixelScale || 1));
      const newW = Math.max(1, Math.round(cfg.width * scale));
      const newH = Math.max(1, Math.round(cfg.height * scale));
      const nextDpi = Math.max(1, Math.round(cfg.dpi || 72));
      const finalName = (cfg.name || '').trim() || 'Nuevo Proyecto';

      const effectiveWorkMode: ProjectWorkMode = cfg.workMode || workMode;
      const profileId = cfg.fightingProfileId;
      const profileSpec =
        profileId && profileId !== 'custom' ? FIGHTING_GAME_PROFILES[profileId] : null;
      const nextFps = profileSpec ? profileSpec.fighterLayout.recommendedFps : animationFps;

      if (profileId) {
        setActiveFightingProfile(profileId);
      }
      if (profileSpec) {
        setAnimationFps(nextFps);
      }

      const resolvedPaletteId = cfg.initialPaletteId || profileSpec?.paletteId;
      let nextPaletteColors = activePaletteColors;
      if (resolvedPaletteId) {
        const pal = FIGHTING_GAME_PALETTES.find((p) => p.id === resolvedPaletteId);
        if (pal && pal.colors.length > 0) {
          nextPaletteColors = pal.colors;
          setActivePaletteColors(pal.colors);
          setPrimaryColor(pal.colors[0]);
          if (pal.colors[1]) setSecondaryColor(pal.colors[1]);
        }
      }

      const useTiled = shouldUseTiledStorage(newW, newH);
      let initialPixels: (string | null)[][] = [];
      let initialTiledStoreId: string | undefined;

      if (useTiled) {
        const bgFill = cfg.backgroundMode === 'solid' && cfg.backgroundColor ? cfg.backgroundColor : null;
        const store = new TiledLayerStore(newW, newH, undefined, bgFill);
        initialTiledStoreId = registerTiledStore(store);
      } else {
        initialPixels = createEmptyGrid(newW, newH);
        if (cfg.backgroundMode === 'solid' && cfg.backgroundColor) {
          for (let y = 0; y < newH; y++) {
            for (let x = 0; x < newW; x++) {
              initialPixels[y][x] = cfg.backgroundColor;
            }
          }
        }
      }

      const nextGroups: LayerGroup[] = cfg.createInitialGroup
        ? [
            {
              id: 'group-main',
              name: 'Grupo Principal',
              color: '#3b82f6',
              category: 'Idle',
              frameIndices: [0],
              collapsed: false,
              visible: true,
              locked: false,
              playbackMode: 'loop',
              fps: nextFps,
            },
          ]
        : [];

      let layers: Layer[];
      if (effectiveWorkMode === 'stage' && cfg.createInitialLayer) {
        const stageSpecs = WORK_MODES_REGISTRY.stage.suggestedLayers;
        layers = stageSpecs.map((spec, idx) => {
          const isSkyLayer = idx === 0;
          const layerStoreId = useTiled
            ? isSkyLayer && initialTiledStoreId
              ? initialTiledStoreId
              : registerTiledStore(new TiledLayerStore(newW, newH))
            : undefined;
          return {
            id: `layer-stage-${Date.now()}-${idx}`,
            name: spec.name,
            visible: true,
            locked: false,
            opacity: spec.opacity ?? 1,
            fillOpacity: 1,
            blendMode: spec.blendMode || 'normal',
            pixels: useTiled ? [] : isSkyLayer ? initialPixels : createEmptyGrid(newW, newH),
            tiledStoreId: layerStoreId,
            tiledRevision: layerStoreId ? 1 : undefined,
            groupId: cfg.createInitialGroup ? 'group-main' : undefined,
            colorTag: spec.colorTag,
            parallaxSpeed: spec.parallaxSpeed,
            stagePlane: spec.stagePlane,
            stageRole: spec.stageRole,
          };
        });
      } else {
        layers = cfg.createInitialLayer
          ? [
              {
                id: 'layer-base',
                name: cfg.backgroundMode === 'solid' ? 'Fondo Sólido' : 'Capa 1',
                visible: true,
                locked: false,
                opacity: 1,
                pixels: initialPixels,
                tiledStoreId: initialTiledStoreId,
                tiledRevision: initialTiledStoreId ? 1 : undefined,
                groupId: cfg.createInitialGroup ? 'group-main' : undefined,
              },
            ]
          : [
              {
                id: 'layer-base',
                name: 'Capa 1',
                visible: true,
                locked: false,
                opacity: 1,
                pixels: useTiled ? [] : createEmptyGrid(newW, newH),
                tiledStoreId: useTiled ? registerTiledStore(new TiledLayerStore(newW, newH)) : undefined,
                tiledRevision: useTiled ? 1 : undefined,
              },
            ];
      }

      const initialGuides: CanvasGuide[] = profileSpec
        ? buildFightingProfileGuides(profileSpec.id, newW, newH)
        : [];

      const newFrames: Frame[] = [
        {
          id: 'frame-1',
          name: 'Frame 1 (Inicio)',
          durationTicks: 4,
          durationMs: 67,
          phase: 'neutral',
          groupId: cfg.createInitialGroup ? 'group-main' : undefined,
          layers,
          hitboxes: [],
        },
      ];

      // Never overwrite an active non-blank document when creating a new project: open in a fresh tab!
      const curDocFrames = framesRef.current;
      const curTabIsBlank =
        openDocumentsRef.current.length === 1 &&
        curDocFrames.length === 1 &&
        curDocFrames[0]?.layers.length === 1 &&
        !curDocFrames[0].layers[0].tiledStoreId &&
        curDocFrames[0].layers[0].pixels.every((row) => row.every((cell) => !cell));

      if (!curTabIsBlank) {
        const prevSnap: OpenDocumentSnapshot = {
          name: projectName,
          width: canvasWidth,
          height: canvasHeight,
          frames: JSON.parse(JSON.stringify(framesRef.current)),
          currentFrameIndex: currentFrameIndexRef.current,
          currentLayerIndex: currentLayerIndexRef.current,
          layerGroups: JSON.parse(JSON.stringify(layerGroupsRef.current)),
          globalPivot: { ...globalPivot },
          actionTags: JSON.parse(JSON.stringify(actionTagsRef.current)),
          playbackMode,
          fps: animationFps,
          references: JSON.parse(JSON.stringify(referencesRef.current)),
          referenceGroups: JSON.parse(JSON.stringify(referenceGroupsRef.current)),
          timelineMarkers: JSON.parse(JSON.stringify(timelineMarkersRef.current)),
          cameraShake: { ...cameraShake },
          cameraKeyframes: JSON.parse(JSON.stringify(cameraKeyframesRef.current)),
          activePaletteColors: [...activePaletteColors],
          guides: JSON.parse(JSON.stringify(guidesRef.current)),
          workMode,
        };
        const newDocId = `doc-new-${Date.now()}`;
        setOpenDocuments((prev) => [
          ...prev.map((d) =>
            d.id === activeDocumentIdRef.current
              ? {
                  ...d,
                  name: prevSnap.name,
                  width: prevSnap.width,
                  height: prevSnap.height,
                  snapshot: prevSnap,
                }
              : d
          ),
          {
            id: newDocId,
            name: finalName,
            width: newW,
            height: newH,
            snapshot: null,
            isDirty: false,
            isNewUnsaved: true,
            hasSavedLocation: false,
          },
        ]);
        activeDocumentIdRef.current = newDocId;
        setActiveDocumentId(newDocId);
      } else {
        setOpenDocuments((prev) =>
          prev.map((d) =>
            d.id === activeDocumentIdRef.current
              ? {
                  ...d,
                  name: finalName,
                  width: newW,
                  height: newH,
                  snapshot: null,
                  isDirty: false,
                  isNewUnsaved: true,
                  hasSavedLocation: false,
                }
              : d
          )
        );
      }

      setProjectName(finalName);
      setCanvasWidth(newW);
      setCanvasHeight(newH);
      setDocumentDpi(nextDpi);
      setWorkMode(effectiveWorkMode);
      if (effectiveWorkMode === 'stage') {
        setStageParallaxConfig((prev) => ({
          ...prev,
          enabled: true,
          horizonPct: profileSpec ? profileSpec.stageLayout.horizonPct : prev.horizonPct,
          playableFloorPct: profileSpec ? profileSpec.stageLayout.floorPct : prev.playableFloorPct,
          jumpHeightPct: profileSpec ? profileSpec.stageLayout.jumpHeightPct : prev.jumpHeightPct,
        }));
        setGuidesConfig((prev) => ({
          ...prev,
          showRulers: true,
          showGuides: true,
          stageDepth: {
            ...prev.stageDepth,
            enabled: true,
          },
        }));
      }
      if (initialGuides.length > 0) {
        guidesRef.current = initialGuides;
        setGuides(initialGuides);
        setGuidesConfig((prev) => ({ ...prev, showGuides: true, showRulers: true }));
      }
      setHomeScreenOpen(false);
      setNewProjectModalOpen(false);
      layerGroupsRef.current = nextGroups;
      setLayerGroups(nextGroups);
      framesRef.current = newFrames;
      setFrames(newFrames);
      currentFrameIndexRef.current = 0;
      setCurrentFrameIndex(0);
      currentLayerIndexRef.current = 0;
      setCurrentLayerIndex(0);
      setSelectedFrameIndices([0]);
      setSelectedLayerIndices([0]);
      setGlobalPivot({ x: Math.floor(newW / 2), y: Math.floor(newH * 0.8) });
      setShowGrid(cfg.enableGrid);
      setPixelPerfect(cfg.enablePixelPerfect);
      setBrushSettings((prev) => ({ ...prev, pixelPerfect: cfg.enablePixelPerfect }));
      setSymmetryConfig((prev) => ({
        ...prev,
        axisX: newW / 2 - 0.5,
        axisY: newH / 2 - 0.5,
        lineP1: { x: Math.max(1, Math.round(newW * 0.15)), y: Math.max(1, Math.round(newH * 0.15)) },
        lineP2: { x: Math.min(newW - 1, Math.round(newW * 0.85)), y: Math.min(newH - 1, Math.round(newH * 0.85)) },
      }));

      setWorkspaceLayout((prev) => ({
        ...prev,
        rightPanels: prev.rightPanels.map((p) =>
          p.id === 'timeline'
            ? { ...p, visible: cfg.enableAnimationMode ? true : p.visible, expanded: cfg.enableAnimationMode }
            : p
        ),
      }));

      suppressDirtyMarkRef.current = true;
      pushHistorySnapshot({
        frames: newFrames,
        layerGroups: nextGroups,
        currentFrameIndex: 0,
        currentLayerIndex: 0,
        ...(initialGuides.length > 0 ? { guides: initialGuides } : {}),
      });
      suppressDirtyMarkRef.current = false;

      const safeSlug = finalName.replace(/\s+/g, '_');
      const thumbUrl = renderProjectThumbnailDataUrl(newFrames, newW, newH, nextGroups);
      const nowMs = Date.now();
      const formattedNow = formatRecentDate(nowMs);
      const entryId = `recent-${nowMs}`;
      const createdSnapshot: OpenDocumentSnapshot = {
        name: finalName,
        width: newW,
        height: newH,
        frames: JSON.parse(JSON.stringify(newFrames)),
        currentFrameIndex: 0,
        currentLayerIndex: 0,
        layerGroups: JSON.parse(JSON.stringify(nextGroups)),
        globalPivot: { x: Math.floor(newW / 2), y: Math.floor(newH * 0.8) },
        actionTags: [],
        playbackMode: 'loop',
        fps: nextFps,
        references: [],
        referenceGroups: [],
        timelineMarkers: [],
        cameraShake: { ...cameraShake },
        cameraKeyframes: [],
        activePaletteColors: [...nextPaletteColors],
        guides: initialGuides,
        workMode: effectiveWorkMode,
      };
      const entry: RecentProjectEntry = {
        id: entryId,
        name: finalName,
        width: newW,
        height: newH,
        category: cfg.category || 'Personalizado',
        openedAt: formattedNow,
        modifiedAt: formattedNow,
        modifiedTimestamp: nowMs,
        frameCount: newFrames.length,
        layerCount: newFrames[0]?.layers.length || 1,
        templateId: cfg.templateId,
        backgroundMode: cfg.backgroundMode,
        backgroundColor: cfg.backgroundColor,
        path: `Proyectos/${safeSlug}.pcs`,
        fileFormat: 'pcs',
        sourceKind: 'project_snapshot',
        hasStoredContent: true,
        thumbnailDataUrl: thumbUrl,
      };
      setRecentProjects((prev) => {
        const existing = prev.find(
          (r) => r.name === entry.name && r.width === entry.width && r.height === entry.height
        );
        const mergedEntry: RecentProjectEntry = {
          ...entry,
          id: existing?.id || entry.id,
          pinned: existing?.pinned || false,
        };
        const rest = prev.filter((r) => r.id !== mergedEntry.id);
        const combined = [mergedEntry, ...rest];
        const pinnedItems = combined.filter((r) => r.pinned);
        const unpinnedItems = combined.filter((r) => !r.pinned).slice(0, Math.max(0, 16 - pinnedItems.length));
        const finalList = [...pinnedItems, ...unpinnedItems];
        writeRecentSnapshot(
          mergedEntry.id,
          createdSnapshot,
          finalList.map((item) => item.id)
        );
        void saveRecentProjectPayload({
          id: mergedEntry.id,
          snapshot: createdSnapshot,
          updatedAt: nowMs,
        }).then(() => pruneRecentProjectPayloads(finalList.map((item) => item.id)));
        return finalList;
      });

      setImportNotification(
        `¡Proyecto "${finalName}" (${newW}×${newH} px · ${nextDpi} DPI${useTiled ? ' · Motor por Bloques' : ''}) creado!`
      );
      setTimeout(() => setImportNotification(null), 3200);
    },
    [
      pushHistorySnapshot,
      projectName,
      canvasWidth,
      canvasHeight,
      globalPivot,
      playbackMode,
      animationFps,
      cameraShake,
      activePaletteColors,
      workMode,
    ]
  );

  const handleCreateNewProject = (name: string, newW: number, newH: number) => {
    handleCreateProjectConfig({
      name,
      width: newW,
      height: newH,
      pixelScale: 1,
      backgroundMode: 'transparent',
      backgroundColor: '#111524',
      enableGrid: true,
      enablePixelPerfect: pixelPerfect,
      createInitialLayer: true,
      createInitialGroup: false,
      enableAnimationMode: true,
    });
  };

  // Helper to record any opened or saved project into "Archivo -> Abrir Recientes"
  // Persists full snapshot + raw file Blob / FileHandle / diskPath in IndexedDB so opening ALWAYS restores real content
  const recordRecentProject = useCallback(
    (opts: {
      name: string;
      width: number;
      height: number;
      frames: Frame[];
      layerGroups?: LayerGroup[];
      category?: string;
      path?: string;
      diskPath?: string;
      fileFormat?: RecentProjectFileFormat;
      modifiedTimestamp?: number;
      fileSize?: number;
      snapshot?: OpenDocumentSnapshot;
      fileBlob?: Blob;
      fileName?: string;
      fileHandle?: FileSystemFileHandle;
      replaceRecentId?: string;
    }) => {
      const ext = opts.fileFormat || 'pcs';
      const safeSlug = (opts.name || 'proyecto').replace(/\s+/g, '_');
      const thumbUrl = renderProjectThumbnailDataUrl(
        opts.frames,
        opts.width,
        opts.height,
        opts.layerGroups || []
      );
      const nowMs = Date.now();
      const modTs =
        typeof opts.modifiedTimestamp === 'number' && opts.modifiedTimestamp > 0
          ? opts.modifiedTimestamp
          : nowMs;
      const openedAt = formatRecentDate(nowMs);
      const modifiedAt = formatRecentDate(modTs);
      const layerCount = opts.frames.reduce((max, f) => Math.max(max, f.layers?.length || 0), 1);

      const sourceKind: RecentProjectEntry['sourceKind'] = opts.diskPath
        ? 'disk_path'
        : opts.fileHandle
        ? 'file_handle'
        : opts.fileBlob
        ? 'cached_blob'
        : 'project_snapshot';

      let resolvedId = opts.replaceRecentId || `recent-${nowMs}`;
      setRecentProjects((prev) => {
        const existingById = opts.replaceRecentId
          ? prev.find((r) => r.id === opts.replaceRecentId)
          : undefined;
        const existingByPath = opts.diskPath
          ? prev.find((r) => r.diskPath && r.diskPath.toLowerCase() === opts.diskPath!.toLowerCase())
          : undefined;
        const existingByName = prev.find(
          (r) =>
            r.name.toLowerCase() === opts.name.toLowerCase() &&
            r.width === opts.width &&
            r.height === opts.height &&
            (r.fileFormat || 'pcs') === ext
        );
        const existing = existingById || existingByPath || existingByName;
        resolvedId = existing?.id || resolvedId;

        const nextEntry: RecentProjectEntry = {
          id: resolvedId,
          name: opts.name,
          width: opts.width,
          height: opts.height,
          category: opts.category || 'Proyecto PixelClash',
          openedAt,
          modifiedAt,
          modifiedTimestamp: modTs,
          fileSize: opts.fileSize ?? existing?.fileSize,
          frameCount: opts.frames.length,
          layerCount,
          path: opts.diskPath || opts.path || existing?.path || `Proyectos/${safeSlug}.${ext}`,
          diskPath: opts.diskPath || existing?.diskPath,
          fileFormat: ext,
          sourceKind,
          hasStoredContent: Boolean(opts.snapshot || opts.fileBlob || opts.fileHandle || opts.diskPath),
          pinned: existing?.pinned || false,
          thumbnailDataUrl: thumbUrl || existing?.thumbnailDataUrl,
        };
        const rest = prev.filter((r) => r.id !== resolvedId);
        const combined = [nextEntry, ...rest];
        const pinnedItems = combined.filter((r) => r.pinned);
        const unpinnedItems = combined
          .filter((r) => !r.pinned)
          .slice(0, Math.max(0, 16 - pinnedItems.length));
        const finalList = [...pinnedItems, ...unpinnedItems];
        const keepIds = finalList.map((item) => item.id);

        if (opts.snapshot) {
          writeRecentSnapshot(resolvedId, opts.snapshot, keepIds);
        }
        if (opts.snapshot || opts.fileBlob || opts.fileHandle || opts.diskPath) {
          void saveRecentProjectPayload({
            id: resolvedId,
            snapshot: opts.snapshot,
            fileBlob: opts.fileBlob,
            fileName: opts.fileName || `${safeSlug}.${ext}`,
            fileMime: opts.fileBlob?.type,
            fileLastModified: modTs,
            fileHandle: opts.fileHandle,
            diskPath: opts.diskPath,
            updatedAt: nowMs,
          }).then(() => pruneRecentProjectPayloads(keepIds));
        }
        return finalList;
      });
    },
    []
  );

  // Seed initial starter project into Recents once with its real full snapshot if list is empty
  const hasSeededInitialRecentRef = useRef<boolean>(false);
  useEffect(() => {
    if (hasSeededInitialRecentRef.current) return;
    hasSeededInitialRecentRef.current = true;
    if (recentProjects.length === 0 && framesRef.current.length > 0) {
      const initialSnap: OpenDocumentSnapshot = {
        name: projectName,
        width: canvasWidth,
        height: canvasHeight,
        frames: JSON.parse(JSON.stringify(framesRef.current)),
        currentFrameIndex: 0,
        currentLayerIndex: 0,
        layerGroups: JSON.parse(JSON.stringify(layerGroupsRef.current)),
        globalPivot: { ...globalPivot },
        actionTags: JSON.parse(JSON.stringify(actionTags)),
        playbackMode,
        fps: animationFps,
        references: JSON.parse(JSON.stringify(referencesRef.current)),
        referenceGroups: JSON.parse(JSON.stringify(referenceGroupsRef.current)),
        timelineMarkers: JSON.parse(JSON.stringify(timelineMarkersRef.current)),
        cameraShake: { ...cameraShake },
        cameraKeyframes: JSON.parse(JSON.stringify(cameraKeyframesRef.current)),
        activePaletteColors: [...activePaletteColors],
        guides: JSON.parse(JSON.stringify(guidesRef.current)),
        workMode,
      };
      recordRecentProject({
        name: projectName,
        width: canvasWidth,
        height: canvasHeight,
        frames: framesRef.current,
        layerGroups: layerGroupsRef.current,
        category: 'Sprite Luchador',
        path: `Proyectos/${projectName.replace(/\s+/g, '_')}.pcs`,
        fileFormat: 'pcs',
        snapshot: initialSnap,
      });
    }
  }, [
    recentProjects.length,
    projectName,
    canvasWidth,
    canvasHeight,
    globalPivot,
    actionTags,
    playbackMode,
    animationFps,
    cameraShake,
    activePaletteColors,
    workMode,
    recordRecentProject,
  ]);

  const handleTogglePinRecentProject = useCallback((id: string) => {
    setRecentProjects((prev) =>
      prev.map((item) => (item.id === id ? { ...item, pinned: !item.pinned } : item))
    );
  }, []);

  const handleRemoveRecentProject = useCallback((id: string) => {
    setRecentProjects((prev) => prev.filter((item) => item.id !== id));
    removeRecentSnapshot(id);
  }, []);

  const handleClearRecentProjects = useCallback(() => {
    setRecentProjects((prev) => {
      const hasUnpinned = prev.some((r) => !r.pinned);
      if (hasUnpinned) {
        prev.filter((r) => !r.pinned).forEach((r) => removeRecentSnapshot(r.id));
        return prev.filter((r) => r.pinned);
      }
      prev.forEach((r) => removeRecentSnapshot(r.id));
      void clearAllRecentProjectPayloads();
      return [];
    });
    setImportNotification('Lista de archivos recientes actualizada.');
    setTimeout(() => setImportNotification(null), 2400);
  }, []);

  // Guides CRUD & Presets Handlers
  const handleChangeGuidesConfig = useCallback((next: GuidesConfig) => {
    setGuidesConfig(next);
    setTransformSnapConfig((prev) => ({
      ...prev,
      guides: next.snapToGuides,
      grid: next.snapToGrid,
    }));
  }, []);

  const handleAddGuide = useCallback(
    (guide: CanvasGuide) => {
      const next = [...guidesRef.current, guide];
      guidesRef.current = next;
      setGuides(next);
      setSelectedGuideId(guide.id);
      pushHistorySnapshot({ guides: next });
    },
    [pushHistorySnapshot]
  );

  const handleUpdateGuide = useCallback((id: string, patch: Partial<CanvasGuide>) => {
    const next = guidesRef.current.map((g) => (g.id === id ? { ...g, ...patch } : g));
    guidesRef.current = next;
    setGuides(next);
  }, []);

  const handleDuplicateGuide = useCallback(
    (id: string) => {
      const src = guidesRef.current.find((g) => g.id === id);
      if (!src) return;
      const copy: CanvasGuide = {
        ...src,
        id: `guide-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        position: src.position + 8,
        locked: false,
        label: src.label ? `${src.label} (copia)` : undefined,
      };
      const next = [...guidesRef.current, copy];
      guidesRef.current = next;
      setGuides(next);
      setSelectedGuideId(copy.id);
      pushHistorySnapshot({ guides: next });
      setImportNotification(`Guía duplicada en ${copy.orientation === 'vertical' ? 'X' : 'Y'} = ${copy.position} px.`);
      setTimeout(() => setImportNotification(null), 2200);
    },
    [pushHistorySnapshot]
  );

  const handleDeleteGuide = useCallback(
    (id: string) => {
      const next = guidesRef.current.filter((g) => g.id !== id);
      guidesRef.current = next;
      setGuides(next);
      setSelectedGuideId((cur) => (cur === id ? null : cur));
      pushHistorySnapshot({ guides: next });
    },
    [pushHistorySnapshot]
  );

  const handleApplyGuidePreset = useCallback(
    (kind: GuidePresetKind, replaceExisting: boolean = false) => {
      const generated = createGuidePreset(kind, canvasWidth, canvasHeight);
      const next = replaceExisting ? generated : [...guidesRef.current, ...generated];
      guidesRef.current = next;
      setGuides(next);
      setGuidesConfig((prev) => ({ ...prev, showGuides: true, showRulers: true }));
      pushHistorySnapshot({ guides: next });
      const labels: Record<GuidePresetKind, string> = {
        horizon: 'Línea de Horizonte',
        hud: 'Guías para HUD',
        character: 'Guías para Personajes',
        stage: 'Guías para Escenarios',
      };
      setImportNotification(`${labels[kind]} aplicadas (${generated.length} guías).`);
      setTimeout(() => setImportNotification(null), 2800);
    },
    [canvasWidth, canvasHeight, pushHistorySnapshot]
  );

  const handleClearAllGuides = useCallback(() => {
    if (guidesRef.current.length === 0) return;
    guidesRef.current = [];
    setGuides([]);
    setSelectedGuideId(null);
    pushHistorySnapshot({ guides: [] });
    setImportNotification('Todas las guías han sido eliminadas.');
    setTimeout(() => setImportNotification(null), 2200);
  }, [pushHistorySnapshot]);

  // Save Project as native PixelClash Studio (.pcs)
  const handleSaveProjectPcs = useCallback(async () => {
    try {
      const pcsProject: ProjectState = {
        name: projectName,
        width: canvasWidth,
        height: canvasHeight,
        frames,
        clips,
        actionTags,
        layerGroups,
        activeClipId,
        activeActionTagId,
        currentFrameIndex,
        currentLayerIndex,
        primaryColor,
        primaryAlpha,
        secondaryColor,
        secondaryAlpha,
        activeTool,
        brushSize,
        pixelPerfect,
        ditherPattern,
        activeHitboxType,
        symmetryEnabled,
        symmetryAxis,
        showGrid,
        showHitboxes,
        showPivot,
        globalPivot,
        stageType,
        stageOpacity,
        groundConfig,
        dummyOpponent,
        combatFx,
        cameraShake,
        cameraKeyframes,
        onionSkinEnabled,
        onionSkinPrev,
        onionSkinNext,
        onionSkinOpacity,
        playbackMode,
        activeGroupId,
        isolateActiveGroup,
        brushSettings,
        activePaletteColors,
        fps: animationFps,
        references,
        referenceGroups,
        timelineMarkers,
      };
      const bytes = await exportProjectAsPcs(pcsProject);
      const baseName = projectName.toLowerCase().replace(/\s+/g, '_') || 'fighter_project';
      downloadUint8Array(bytes, `${baseName}.pcs`, 'application/octet-stream');
      const pcsBlobCopy = new Uint8Array(bytes.byteLength);
      pcsBlobCopy.set(bytes);
      const pcsBlob = new Blob([pcsBlobCopy.buffer], { type: 'application/octet-stream' });
      const snapToStore: OpenDocumentSnapshot = {
        name: projectName,
        width: canvasWidth,
        height: canvasHeight,
        frames: JSON.parse(JSON.stringify(frames)),
        currentFrameIndex,
        currentLayerIndex,
        layerGroups: JSON.parse(JSON.stringify(layerGroups)),
        globalPivot: { ...globalPivot },
        actionTags: JSON.parse(JSON.stringify(actionTags)),
        playbackMode,
        fps: animationFps,
        references: JSON.parse(JSON.stringify(references)),
        referenceGroups: JSON.parse(JSON.stringify(referenceGroups)),
        timelineMarkers: JSON.parse(JSON.stringify(timelineMarkers)),
        cameraShake: { ...cameraShake },
        cameraKeyframes: JSON.parse(JSON.stringify(cameraKeyframes)),
        activePaletteColors: [...activePaletteColors],
        guides: JSON.parse(JSON.stringify(guidesRef.current)),
        workMode,
      };
      recordRecentProject({
        name: projectName,
        width: canvasWidth,
        height: canvasHeight,
        frames,
        layerGroups,
        category: 'Proyecto .PCS',
        path: `Proyectos/${baseName}.pcs`,
        fileFormat: 'pcs',
        fileSize: bytes.byteLength,
        snapshot: snapToStore,
        fileBlob: pcsBlob,
        fileName: `${baseName}.pcs`,
      });
      markDocumentSaved(activeDocumentIdRef.current, 'pcs');
      setImportNotification(`Proyecto PixelClash guardado: ${baseName}.pcs`);
      setTimeout(() => setImportNotification(null), 4000);
    } catch (err: any) {
      setImportNotification(`Error al guardar .pcs: ${err.message}`);
      setTimeout(() => setImportNotification(null), 5000);
    }
  }, [
    projectName, canvasWidth, canvasHeight, frames, clips, actionTags, layerGroups,
    activeClipId, activeActionTagId, currentFrameIndex, currentLayerIndex,
    primaryColor, primaryAlpha, secondaryColor, secondaryAlpha, activeTool,
    brushSize, pixelPerfect, ditherPattern, activeHitboxType, symmetryEnabled,
    symmetryAxis, showGrid, showHitboxes, showPivot, globalPivot, stageType,
    stageOpacity, groundConfig, dummyOpponent, combatFx, cameraShake, cameraKeyframes, onionSkinEnabled,
    onionSkinPrev, onionSkinNext, onionSkinOpacity, playbackMode, activeGroupId,
    isolateActiveGroup, brushSettings, activePaletteColors, animationFps,
    references, referenceGroups, timelineMarkers, workMode, recordRecentProject, markDocumentSaved,
  ]);

  // Periodic debounced + idle-scheduled local autosave (respects Performance Mode to avoid main-thread stalls)
  useEffect(() => {
    const autosaveDelayMs =
      performanceMode === 'performance' ? 10000 : performanceMode === 'balanced' ? 5000 : 3500;
    const timer = window.setTimeout(() => {
      scheduleIdleTask(() => {
        try {
          const snapshot = {
            name: projectName,
            width: canvasWidth,
            height: canvasHeight,
            frames,
            clips,
            actionTags,
            layerGroups,
            globalPivot,
            stageType,
            groundConfig,
            dummyOpponent,
            combatFx,
            cameraShake,
            cameraKeyframes,
            playbackMode,
            brushSettings,
            activePaletteColors,
            fps: animationFps,
            savedAt: new Date().toISOString(),
          };
          localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(snapshot));
          setHasAutosave(true);
        } catch {
          // Ignore quota errors on very large projects
        }
      }, 2500);
    }, autosaveDelayMs);
    return () => window.clearTimeout(timer);
  }, [
    projectName, canvasWidth, canvasHeight, frames, clips, actionTags, layerGroups,
    globalPivot, stageType, groundConfig, dummyOpponent, combatFx, cameraShake, cameraKeyframes, playbackMode,
    brushSettings, activePaletteColors, animationFps, performanceMode,
  ]);

  const handleRestoreAutosave = useCallback(() => {
    try {
      const raw = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
      if (!raw) {
        setImportNotification('No hay respaldo automático local guardado.');
        setTimeout(() => setImportNotification(null), 3500);
        return;
      }
      const saved = JSON.parse(raw);
      if (!saved || !Array.isArray(saved.frames) || !saved.width || !saved.height) return;
      setProjectName(saved.name || 'Proyecto Recuperado');
      setCanvasWidth(saved.width);
      setCanvasHeight(saved.height);
      setFrames(saved.frames);
      setCurrentFrameIndex(0);
      setCurrentLayerIndex(0);
      if (Array.isArray(saved.layerGroups)) setLayerGroups(saved.layerGroups);
      if (Array.isArray(saved.actionTags)) setActionTags(saved.actionTags);
      if (Array.isArray(saved.clips)) setClips(saved.clips);
      if (saved.globalPivot) setGlobalPivot(saved.globalPivot);
      if (saved.stageType) setStageType(saved.stageType);
      if (saved.groundConfig) setGroundConfig(saved.groundConfig);
      if (saved.dummyOpponent) setDummyOpponent(saved.dummyOpponent);
      if (saved.combatFx) setCombatFx(saved.combatFx);
      if (saved.cameraShake) setCameraShake(saved.cameraShake);
      if (Array.isArray(saved.cameraKeyframes)) setCameraKeyframes(saved.cameraKeyframes);
      if (saved.playbackMode) setPlaybackMode(saved.playbackMode);
      if (saved.brushSettings) handleChangeBrushSettings({ ...DEFAULT_BRUSH_SETTINGS, ...saved.brushSettings });
      if (Array.isArray(saved.activePaletteColors)) setActivePaletteColors(saved.activePaletteColors);
      if (typeof saved.fps === 'number') setAnimationFps(saved.fps);
      pushHistory(saved.frames);
      setImportNotification(`¡Autoguardado local restaurado (${saved.frames.length} fotogramas)!`);
      setTimeout(() => setImportNotification(null), 4000);
    } catch (err: any) {
      setImportNotification(`No se pudo restaurar autoguardado: ${err.message}`);
      setTimeout(() => setImportNotification(null), 4000);
    }
  }, [handleChangeBrushSettings, pushHistory]);

  // Save Project JSON
  const handleSaveProjectJson = () => {
    const projectData = {
      name: projectName,
      width: canvasWidth,
      height: canvasHeight,
      frames,
      clips,
      actionTags,
      layerGroups,
      globalPivot,
      playbackMode,
      brushSettings,
      activePaletteColors,
      fps: animationFps,
      references,
      referenceGroups,
      timelineMarkers,
      cameraShake,
      cameraKeyframes,
      version: '2.0'
    };
    const jsonStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fileName = `${projectName.toLowerCase().replace(/\s+/g, '_')}.pixelclash.json`;
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    recordRecentProject({
      name: projectName,
      width: canvasWidth,
      height: canvasHeight,
      frames,
      layerGroups,
      category: 'Proyecto JSON',
      path: `Proyectos/${fileName}`,
      fileFormat: 'json',
      fileSize: blob.size,
      fileBlob: blob,
      fileName,
      snapshot: {
        name: projectName,
        width: canvasWidth,
        height: canvasHeight,
        frames: JSON.parse(JSON.stringify(frames)),
        currentFrameIndex,
        currentLayerIndex,
        layerGroups: JSON.parse(JSON.stringify(layerGroups)),
        globalPivot: { ...globalPivot },
        actionTags: JSON.parse(JSON.stringify(actionTags)),
        playbackMode,
        fps: animationFps,
        references: JSON.parse(JSON.stringify(references)),
        referenceGroups: JSON.parse(JSON.stringify(referenceGroups)),
        timelineMarkers: JSON.parse(JSON.stringify(timelineMarkers)),
        cameraShake: { ...cameraShake },
        cameraKeyframes: JSON.parse(JSON.stringify(cameraKeyframes)),
        activePaletteColors: [...activePaletteColors],
        guides: JSON.parse(JSON.stringify(guidesRef.current)),
        workMode,
      },
    });
    markDocumentSaved(activeDocumentIdRef.current, 'json');
    setImportNotification(`Proyecto guardado en JSON: ${fileName}`);
    setTimeout(() => setImportNotification(null), 3500);
  };

  // Save Project as Aseprite (.ase)
  const handleSaveProjectAse = () => {
    try {
      const bytes = exportProjectAsAse(currentProjectState);
      const baseName = projectName.toLowerCase().replace(/\s+/g, '_');
      downloadUint8Array(bytes, `${baseName}.ase`, 'application/octet-stream');
      const aseCopy = new Uint8Array(bytes.byteLength);
      aseCopy.set(bytes);
      const aseBlob = new Blob([aseCopy.buffer], { type: 'application/octet-stream' });
      recordRecentProject({
        name: projectName,
        width: canvasWidth,
        height: canvasHeight,
        frames,
        layerGroups,
        category: 'Aseprite (.ase)',
        path: `Proyectos/${baseName}.ase`,
        fileFormat: 'ase',
        fileSize: bytes.byteLength,
        fileBlob: aseBlob,
        fileName: `${baseName}.ase`,
        snapshot: {
          name: projectName,
          width: canvasWidth,
          height: canvasHeight,
          frames: JSON.parse(JSON.stringify(frames)),
          currentFrameIndex,
          currentLayerIndex,
          layerGroups: JSON.parse(JSON.stringify(layerGroups)),
          globalPivot: { ...globalPivot },
          actionTags: JSON.parse(JSON.stringify(actionTags)),
          playbackMode,
          fps: animationFps,
          references: JSON.parse(JSON.stringify(references)),
          referenceGroups: JSON.parse(JSON.stringify(referenceGroups)),
          timelineMarkers: JSON.parse(JSON.stringify(timelineMarkers)),
          cameraShake: { ...cameraShake },
          cameraKeyframes: JSON.parse(JSON.stringify(cameraKeyframes)),
          activePaletteColors: [...activePaletteColors],
          guides: JSON.parse(JSON.stringify(guidesRef.current)),
          workMode,
        },
      });
      markDocumentSaved(activeDocumentIdRef.current, 'ase');
      setImportNotification(`Proyecto guardado en formato Aseprite: ${baseName}.ase`);
      setTimeout(() => setImportNotification(null), 4000);
    } catch (err: any) {
      setImportNotification(`Error al guardar .ase: ${err.message}`);
      setTimeout(() => setImportNotification(null), 5000);
    }
  };

  // Save Project as Adobe Photoshop (.psd)
  const handleSaveProjectPsd = () => {
    try {
      const bytes = exportProjectAsPsd(currentProjectState, currentFrameIndex);
      const baseName = projectName.toLowerCase().replace(/\s+/g, '_');
      downloadUint8Array(bytes, `${baseName}.psd`, 'image/vnd.adobe.photoshop');
      const psdCopy = new Uint8Array(bytes.byteLength);
      psdCopy.set(bytes);
      const psdBlob = new Blob([psdCopy.buffer], { type: 'image/vnd.adobe.photoshop' });
      recordRecentProject({
        name: projectName,
        width: canvasWidth,
        height: canvasHeight,
        frames,
        layerGroups,
        category: 'Photoshop (.psd)',
        path: `Proyectos/${baseName}.psd`,
        fileFormat: 'psd',
        fileSize: bytes.byteLength,
        fileBlob: psdBlob,
        fileName: `${baseName}.psd`,
        snapshot: {
          name: projectName,
          width: canvasWidth,
          height: canvasHeight,
          frames: JSON.parse(JSON.stringify(frames)),
          currentFrameIndex,
          currentLayerIndex,
          layerGroups: JSON.parse(JSON.stringify(layerGroups)),
          globalPivot: { ...globalPivot },
          actionTags: JSON.parse(JSON.stringify(actionTags)),
          playbackMode,
          fps: animationFps,
          references: JSON.parse(JSON.stringify(references)),
          referenceGroups: JSON.parse(JSON.stringify(referenceGroups)),
          timelineMarkers: JSON.parse(JSON.stringify(timelineMarkers)),
          cameraShake: { ...cameraShake },
          cameraKeyframes: JSON.parse(JSON.stringify(cameraKeyframes)),
          activePaletteColors: [...activePaletteColors],
          guides: JSON.parse(JSON.stringify(guidesRef.current)),
          workMode,
        },
      });
      markDocumentSaved(activeDocumentIdRef.current, 'psd');
      setImportNotification(`Proyecto guardado en formato Photoshop: ${baseName}.psd`);
      setTimeout(() => setImportNotification(null), 4000);
    } catch (err: any) {
      setImportNotification(`Error al guardar .psd: ${err.message}`);
      setTimeout(() => setImportNotification(null), 5000);
    }
  };

  // Add new frame (automatically preserves isGlobal layers across the project)
  const handleAddFrame = () => {
    const newFrameId = `frame-${Date.now()}`;
    const newFrame: Frame = {
      id: newFrameId,
      name: `Fotograma ${frames.length + 1}`,
      durationTicks: 4,
      phase: 'neutral',
      hitboxes: [],
      layers: currentFrame.layers.map((l) =>
        l.isGlobal
          ? JSON.parse(JSON.stringify(l))
          : {
              ...l,
              id: `layer-${Date.now()}-${Math.random()}`,
              pixels: createEmptyGrid(canvasWidth, canvasHeight),
            }
      ),
    };
    const nextFrames = [...frames, newFrame];
    setFrames(nextFrames);
    setCurrentFrameIndex(nextFrames.length - 1);
    pushHistory(nextFrames);
  };

  // Duplicate frame
  const handleDuplicateFrame = (index: number = currentFrameIndex) => {
    const target = frames[index];
    if (!target) return;
    const duplicated: Frame = {
      ...JSON.parse(JSON.stringify(target)),
      id: `frame-${Date.now()}`,
      name: `${target.name} (Copia)`,
    };
    const nextFrames = [...frames];
    nextFrames.splice(index + 1, 0, duplicated);
    setFrames(nextFrames);
    setCurrentFrameIndex(index + 1);
    pushHistory(nextFrames);
  };

  // Delete frame (safe ref + full undo snapshot)
  const handleDeleteFrame = (index: number = currentFrameIndex) => {
    const curFrames = framesRef.current;
    if (curFrames.length <= 1) return;
    const nextFrames = curFrames.filter((_, i) => i !== index);
    const nextIdx = Math.max(0, Math.min(currentFrameIndexRef.current, nextFrames.length - 1));
    framesRef.current = nextFrames;
    currentFrameIndexRef.current = nextIdx;
    setFrames(nextFrames);
    setCurrentFrameIndex(nextIdx);
    setSelectedFrameIndices([nextIdx]);
    pushHistorySnapshot({ frames: nextFrames, currentFrameIndex: nextIdx });
  };

  // Reorder frames via drag & drop while keeping groups, clips, markers, and selection synced
  const handleReorderFrame = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        fromIndex >= frames.length ||
        toIndex < 0 ||
        toIndex >= frames.length
      ) {
        return;
      }

      const indexed = frames.map((frame, idx) => ({ frame, oldIdx: idx }));
      const [moved] = indexed.splice(fromIndex, 1);
      indexed.splice(toIndex, 0, moved);

      const oldToNew = new Map<number, number>();
      indexed.forEach((item, newIdx) => {
        oldToNew.set(item.oldIdx, newIdx);
      });

      const nextFrames = indexed.map((item) => item.frame);
      setFrames(nextFrames);
      pushHistory(nextFrames);

      setLayerGroups((prev) =>
        prev.map((g) => ({
          ...g,
          frameIndices: (g.frameIndices || [])
            .map((idx) => oldToNew.get(idx))
            .filter((idx): idx is number => idx !== undefined)
            .sort((a, b) => a - b),
        }))
      );

      setClips((prev) =>
        prev.map((c) => ({
          ...c,
          frameIndices: (c.frameIndices || [])
            .map((idx) => oldToNew.get(idx))
            .filter((idx): idx is number => idx !== undefined),
        }))
      );

      setTimelineMarkers((prev) =>
        prev.map((m) => ({
          ...m,
          frameIndex: oldToNew.get(m.frameIndex) ?? m.frameIndex,
        }))
      );

      setCurrentFrameIndex((prev) => oldToNew.get(prev) ?? prev);
      setSelectedFrameIndices((prev) =>
        prev
          .map((idx) => oldToNew.get(idx))
          .filter((idx): idx is number => idx !== undefined)
      );
    },
    [frames, pushHistory]
  );

  const handleChangeFrameDuration = (index: number, durationTicks: number, durationMs?: number) => {
    setFrames((prev) =>
      prev.map((f, i) =>
        i === index
          ? {
              ...f,
              durationTicks,
              durationMs: durationMs ?? Math.round((durationTicks / 60) * 1000),
            }
          : f
      )
    );
  };

  const handleChangeFramePhase = (index: number, phase: FramePhase) => {
    setFrames((prev) =>
      prev.map((f, i) => (i === index ? { ...f, phase } : f))
    );
  };

  const handleReplaceColor = (targetColor: string, newColor: string) => {
    const updatedGrid = currentLayer.pixels.map((r) => [...r]);
    for (let y = 0; y < canvasHeight; y++) {
      for (let x = 0; x < canvasWidth; x++) {
        if (updatedGrid[y][x]?.toLowerCase() === targetColor.toLowerCase()) {
          updatedGrid[y][x] = newColor;
        }
      }
    }
    handleUpdateLayerPixels(updatedGrid);
  };

  const handleAddLayer = (layerType: LayerType = 'raster') => {
    const prevFrames = framesRef.current;
    const curFrame = prevFrames[currentFrameIndex] || prevFrames[0];
    const n = curFrame.layers.length + 1;
    const defaultName =
      layerType === 'reference'
        ? `Referencia ${n}`
        : layerType === 'smart'
        ? `Inteligente ${n}`
        : layerType === 'temp'
        ? `Borrador Temp ${n}`
        : layerType === 'adjustment'
        ? `Ajuste ${n}`
        : layerType === 'empty'
        ? `Vacía ${n}`
        : layerType === 'text'
        ? `Texto ${n}`
        : layerType === 'vector'
        ? `Vector ${n}`
        : layerType === 'ai'
        ? `Capa IA ${n}`
        : layerType === 'animation'
        ? `Animación ${n}`
        : `Capa ${n}`;
    const trackId = `trk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newLayer: Layer = {
      id: `layer-${Date.now()}`,
      trackId,
      name: defaultName,
      visible: true,
      locked: layerType === 'reference',
      opacity: layerType === 'temp' ? 0.65 : 1,
      fillOpacity: 1,
      blendMode: 'normal',
      layerType,
      adjustment: layerType === 'adjustment' ? { ...DEFAULT_ADJUSTMENT_CONFIG } : undefined,
      pixels: createEmptyGrid(canvasWidth, canvasHeight),
    };
    const nextIdx = curFrame.layers.length;
    const updated = prevFrames.map((f, i) =>
      i === currentFrameIndex ? { ...f, layers: [...f.layers, newLayer] } : f
    );
    const nextTrackKey = `trk:${trackId}`;
    framesRef.current = updated;
    currentLayerIndexRef.current = nextIdx;
    activeTrackKeyRef.current = nextTrackKey;
    setFrames(updated);
    setCurrentLayerIndex(nextIdx);
    setSelectedLayerIndices([nextIdx]);
    setActiveTrackKey(nextTrackKey);
    setEditingMask(false);
    pushHistorySnapshot({ frames: updated, currentLayerIndex: nextIdx });
  };

  const handleSelectLayerWithTrack = useCallback((index: number) => {
    const curFr = framesRef.current[currentFrameIndexRef.current] || framesRef.current[0];
    if (!curFr || curFr.layers.length === 0) return;
    const safeIdx = Math.max(0, Math.min(curFr.layers.length - 1, index));
    const keys = computeFrameLayerTrackKeys(curFr.layers);
    const nextKey = keys[safeIdx] || null;
    currentLayerIndexRef.current = safeIdx;
    activeTrackKeyRef.current = nextKey;
    setCurrentLayerIndex(safeIdx);
    setSelectedLayerIndices([safeIdx]);
    if (nextKey) setActiveTrackKey(nextKey);
  }, []);

  const handleUpdateLayerMeta = useCallback(
    (index: number, patch: Partial<Layer>) => {
      const prev = framesRef.current;
      let updatedGlobalLayer: Layer | null = null;
      let wasTurnedOffId: string | null = null;
      let updated = prev.map((f, fIdx) => {
        if (fIdx !== currentFrameIndex) return f;
        return {
          ...f,
          layers: f.layers.map((l, lIdx) => {
            if (lIdx !== index) return l;
            const nextL = { ...l, ...patch };
            if (patch.isGlobal === false && l.isGlobal) {
              wasTurnedOffId = l.id;
            }
            if (nextL.isGlobal) {
              updatedGlobalLayer = nextL;
            }
            return nextL;
          }),
        };
      });
      if (updatedGlobalLayer) {
        updated = syncGlobalLayerAcrossFrames(updated, updatedGlobalLayer);
      } else if (wasTurnedOffId) {
        updated = updated.map((f, fIdx) =>
          fIdx === currentFrameIndex
            ? f
            : {
                ...f,
                layers: f.layers.map((l) =>
                  l.id === wasTurnedOffId
                    ? { ...l, isGlobal: false, id: `layer-local-${Date.now()}-${Math.random().toString(36).slice(2, 5)}` }
                    : l
                ),
              }
        );
      }
      framesRef.current = updated;
      setFrames(updated);
      pushHistorySnapshot({ frames: updated });
    },
    [currentFrameIndex, pushHistorySnapshot, syncGlobalLayerAcrossFrames]
  );

  const handleReorderLayer = useCallback(
    (fromIndex: number, toIndex: number, targetGroupId?: string | null) => {
      const updated = framesRef.current.map((f, fIdx) => {
        if (fIdx !== currentFrameIndex) return f;
        const nextLayers = [...f.layers];
        if (
          fromIndex < 0 ||
          fromIndex >= nextLayers.length ||
          toIndex < 0 ||
          toIndex >= nextLayers.length
        ) {
          return f;
        }
        const [moved] = nextLayers.splice(fromIndex, 1);
        const updatedMoved: Layer =
          targetGroupId !== undefined ? { ...moved, groupId: targetGroupId } : moved;
        nextLayers.splice(toIndex, 0, updatedMoved);
        return { ...f, layers: nextLayers };
      });
      framesRef.current = updated;
      currentLayerIndexRef.current = toIndex;
      setFrames(updated);
      setCurrentLayerIndex(toIndex);
      setSelectedLayerIndices([toIndex]);
      pushHistorySnapshot({ frames: updated, currentLayerIndex: toIndex });
    },
    [currentFrameIndex, pushHistorySnapshot]
  );

  const handleToggleLayerVisibility = (index: number) => {
    const prev = framesRef.current;
    const curFr = prev[currentFrameIndex];
    const targetLayer = curFr?.layers[index];
    if (!targetLayer) return;
    const curKeys = computeFrameLayerTrackKeys(curFr.layers);
    const trackKey = curKeys[index];
    const nextVisible = !targetLayer.visible;

    const updated = prev.map((f, fIdx) => {
      const fKeys = trackKey ? computeFrameLayerTrackKeys(f.layers) : [];
      return {
        ...f,
        layers: f.layers.map((l, lIdx) => {
          const matches = trackKey
            ? fKeys[lIdx] === trackKey
            : fIdx === currentFrameIndex && lIdx === index;
          return matches ? { ...l, visible: nextVisible } : l;
        }),
      };
    });
    framesRef.current = updated;
    setFrames(updated);
  };

  const handleToggleLayerLock = (index: number) => {
    const prev = framesRef.current;
    const curFr = prev[currentFrameIndex];
    const targetLayer = curFr?.layers[index];
    if (!targetLayer) return;
    const curKeys = computeFrameLayerTrackKeys(curFr.layers);
    const trackKey = curKeys[index];
    const nextLocked = !targetLayer.locked;

    const updated = prev.map((f, fIdx) => {
      const fKeys = trackKey ? computeFrameLayerTrackKeys(f.layers) : [];
      return {
        ...f,
        layers: f.layers.map((l, lIdx) => {
          const matches = trackKey
            ? fKeys[lIdx] === trackKey
            : fIdx === currentFrameIndex && lIdx === index;
          return matches ? { ...l, locked: nextLocked } : l;
        }),
      };
    });
    framesRef.current = updated;
    setFrames(updated);
  };

  const handleDeleteLayer = (index: number) => {
    if (currentFrame.layers.length <= 1) return;
    const updated = framesRef.current.map((f, i) =>
      i !== currentFrameIndex
        ? f
        : { ...f, layers: f.layers.filter((_, lIdx) => lIdx !== index) }
    );
    const nextCur = updated[currentFrameIndex];
    const nextIdx = Math.max(0, Math.min(index, (nextCur?.layers.length || 1) - 1));
    const nextKeys = nextCur ? computeFrameLayerTrackKeys(nextCur.layers) : [];
    const nextTrack = nextKeys[nextIdx] || null;
    framesRef.current = updated;
    currentLayerIndexRef.current = nextIdx;
    activeTrackKeyRef.current = nextTrack;
    setFrames(updated);
    setCurrentLayerIndex(nextIdx);
    setSelectedLayerIndices([nextIdx]);
    setActiveTrackKey(nextTrack);
    pushHistorySnapshot({ frames: updated, currentLayerIndex: nextIdx });
  };

  // Persistent Project Layer Track Handlers (Video/Animation-style unified layers)
  const handleSelectLayerTrack = useCallback(
    (trackKey: string, frameLayerIndex: number) => {
      activeTrackKeyRef.current = trackKey;
      setActiveTrackKey(trackKey);
      if (frameLayerIndex >= 0) {
        currentLayerIndexRef.current = frameLayerIndex;
        setCurrentLayerIndex(frameLayerIndex);
        setSelectedLayerIndices([frameLayerIndex]);
        setEditingMask(false);
        return;
      }

      // Layer does not yet have a cel in the current frame; materialize an empty matching cel when paused so the artist can draw immediately
      if (isPlaying) return;

      const prev = framesRef.current;
      const curIdx = currentFrameIndexRef.current;
      const curFrameTarget = prev[curIdx];
      if (!curFrameTarget) return;

      let templateLayer: Layer | null = null;
      let templateIndex = curFrameTarget.layers.length;
      for (let fIdx = 0; fIdx < prev.length; fIdx++) {
        const fKeys = computeFrameLayerTrackKeys(prev[fIdx].layers);
        const foundIdx = fKeys.indexOf(trackKey);
        if (foundIdx >= 0) {
          templateLayer = prev[fIdx].layers[foundIdx];
          templateIndex = foundIdx;
          break;
        }
      }
      if (!templateLayer) return;

      const insertIdx = Math.max(0, Math.min(curFrameTarget.layers.length, templateIndex));
      const newCel: Layer = {
        id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        trackId: templateLayer.trackId,
        name: templateLayer.name,
        visible: templateLayer.visible,
        locked: templateLayer.locked,
        lockPixels: templateLayer.lockPixels,
        lockPosition: templateLayer.lockPosition,
        lockTransparency: templateLayer.lockTransparency,
        opacity: templateLayer.opacity,
        fillOpacity: templateLayer.fillOpacity ?? 1,
        blendMode: templateLayer.blendMode,
        layerType: templateLayer.layerType || 'raster',
        groupId: templateLayer.groupId ?? null,
        colorTag: templateLayer.colorTag,
        adjustment: templateLayer.adjustment ? { ...templateLayer.adjustment } : undefined,
        pixels: createEmptyGrid(canvasWidthRef.current, canvasHeightRef.current),
      };

      const updated = prev.map((f, fIdx) => {
        if (fIdx !== curIdx) return f;
        const nextLayers = [...f.layers];
        nextLayers.splice(insertIdx, 0, newCel);
        return { ...f, layers: nextLayers };
      });

      framesRef.current = updated;
      currentLayerIndexRef.current = insertIdx;
      setFrames(updated);
      setCurrentLayerIndex(insertIdx);
      setSelectedLayerIndices([insertIdx]);
      setEditingMask(false);
      pushHistorySnapshot({ frames: updated, currentLayerIndex: insertIdx });
    },
    [isPlaying, pushHistorySnapshot]
  );

  const handleToggleTrackVisibility = useCallback(
    (trackKey: string, frameLayerIndex: number) => {
      const prev = framesRef.current;
      const curFr = prev[currentFrameIndexRef.current];
      let currentVisible = true;
      if (frameLayerIndex >= 0 && curFr?.layers[frameLayerIndex]) {
        currentVisible = curFr.layers[frameLayerIndex].visible;
      } else {
        for (const f of prev) {
          const fKeys = computeFrameLayerTrackKeys(f.layers);
          const idx = fKeys.indexOf(trackKey);
          if (idx >= 0) {
            currentVisible = f.layers[idx].visible;
            break;
          }
        }
      }
      const nextVisible = !currentVisible;
      const updated = prev.map((f) => {
        const fKeys = computeFrameLayerTrackKeys(f.layers);
        return {
          ...f,
          layers: f.layers.map((l, lIdx) =>
            fKeys[lIdx] === trackKey ? { ...l, visible: nextVisible } : l
          ),
        };
      });
      framesRef.current = updated;
      setFrames(updated);
    },
    []
  );

  const handleToggleTrackLock = useCallback(
    (trackKey: string, frameLayerIndex: number) => {
      const prev = framesRef.current;
      const curFr = prev[currentFrameIndexRef.current];
      let currentLocked = false;
      if (frameLayerIndex >= 0 && curFr?.layers[frameLayerIndex]) {
        currentLocked = curFr.layers[frameLayerIndex].locked;
      } else {
        for (const f of prev) {
          const fKeys = computeFrameLayerTrackKeys(f.layers);
          const idx = fKeys.indexOf(trackKey);
          if (idx >= 0) {
            currentLocked = f.layers[idx].locked;
            break;
          }
        }
      }
      const nextLocked = !currentLocked;
      const updated = prev.map((f) => {
        const fKeys = computeFrameLayerTrackKeys(f.layers);
        return {
          ...f,
          layers: f.layers.map((l, lIdx) =>
            fKeys[lIdx] === trackKey ? { ...l, locked: nextLocked } : l
          ),
        };
      });
      framesRef.current = updated;
      setFrames(updated);
    },
    []
  );

  const handleUpdateTrackMeta = useCallback(
    (trackKey: string, frameLayerIndex: number, patch: Partial<Layer>) => {
      if (patch.isGlobal !== undefined && frameLayerIndex >= 0) {
        handleUpdateLayerMeta(frameLayerIndex, patch);
        return;
      }
      const prev = framesRef.current;
      const updated = prev.map((f) => {
        const fKeys = computeFrameLayerTrackKeys(f.layers);
        return {
          ...f,
          layers: f.layers.map((l, lIdx) =>
            fKeys[lIdx] === trackKey ? { ...l, ...patch } : l
          ),
        };
      });
      framesRef.current = updated;
      setFrames(updated);
      pushHistorySnapshot({ frames: updated });
    },
    [handleUpdateLayerMeta, pushHistorySnapshot]
  );

  const handleAssignTrackToGroup = useCallback(
    (trackKey: string, _frameLayerIndex: number, groupId: string | null) => {
      const prev = framesRef.current;
      const updated = prev.map((f) => {
        const fKeys = computeFrameLayerTrackKeys(f.layers);
        return {
          ...f,
          layers: f.layers.map((l, lIdx) =>
            fKeys[lIdx] === trackKey ? { ...l, groupId } : l
          ),
        };
      });
      framesRef.current = updated;
      setFrames(updated);
      pushHistorySnapshot({ frames: updated });
    },
    [pushHistorySnapshot]
  );

  const handleDeleteTrack = useCallback(
    (trackKey: string, _frameLayerIndex: number) => {
      const prev = framesRef.current;
      const updated = prev.map((f) => {
        if (f.layers.length <= 1) return f;
        const fKeys = computeFrameLayerTrackKeys(f.layers);
        const remaining = f.layers.filter((_, lIdx) => fKeys[lIdx] !== trackKey);
        return remaining.length > 0 ? { ...f, layers: remaining } : f;
      });
      const curFr = updated[currentFrameIndexRef.current] || updated[0];
      const nextIdx = Math.max(
        0,
        Math.min(currentLayerIndexRef.current, (curFr?.layers.length || 1) - 1)
      );
      const nextKeys = curFr ? computeFrameLayerTrackKeys(curFr.layers) : [];
      const nextTrack = nextKeys[nextIdx] || null;
      framesRef.current = updated;
      currentLayerIndexRef.current = nextIdx;
      activeTrackKeyRef.current = nextTrack;
      setFrames(updated);
      setCurrentLayerIndex(nextIdx);
      setSelectedLayerIndices([nextIdx]);
      setActiveTrackKey(nextTrack);
      pushHistorySnapshot({ frames: updated, currentLayerIndex: nextIdx });
    },
    [pushHistorySnapshot]
  );

  const handleClearTrackInCurrentFrame = useCallback(
    (trackKey: string) => {
      const prev = framesRef.current;
      const curIdx = currentFrameIndexRef.current;
      const curFr = prev[curIdx];
      if (!curFr) return;
      const fKeys = computeFrameLayerTrackKeys(curFr.layers);
      const targetIdx = fKeys.indexOf(trackKey);
      if (targetIdx < 0) return;

      const updated = prev.map((f, fIdx) => {
        if (fIdx !== curIdx) return f;
        return {
          ...f,
          layers: f.layers.map((l, lIdx) =>
            lIdx === targetIdx
              ? {
                  ...l,
                  pixels: createEmptyGrid(canvasWidthRef.current, canvasHeightRef.current),
                  vectorPaths: [],
                  parametricShapes: [],
                }
              : l
          ),
        };
      });
      framesRef.current = updated;
      setFrames(updated);
      pushHistorySnapshot({ frames: updated });
    },
    [pushHistorySnapshot]
  );

  // Layer / Movement Groups & Nested Folders Handlers
  const handleCreateLayerGroup = (
    name: string,
    color: string,
    categoryOrParentId?: string | null
  ) => {
    const isParentRef =
      typeof categoryOrParentId === 'string' &&
      layerGroups.some((g) => g.id === categoryOrParentId);
    const movementCategories = new Set(['Idle', 'Movement', 'Normal', 'Reaction', 'Special', 'VFX']);
    const isMovementGroup =
      typeof categoryOrParentId === 'string' &&
      !isParentRef &&
      movementCategories.has(categoryOrParentId);

    const newGroup: LayerGroup = {
      id: `group-${Date.now()}`,
      name,
      color,
      category: isMovementGroup ? (categoryOrParentId as LayerGroup['category']) : 'Normal',
      parentGroupId: isParentRef ? categoryOrParentId : null,
      frameIndices: isMovementGroup ? [currentFrameIndex] : [],
      collapsed: false,
      visible: true,
      locked: false,
      playbackMode: 'loop',
      fps: animationFps,
    };
    const nextGroups = [...layerGroupsRef.current, newGroup];
    const updatedFrames = isMovementGroup
      ? framesRef.current.map((f, idx) =>
          idx === currentFrameIndex ? { ...f, groupId: newGroup.id } : f
        )
      : framesRef.current;
    layerGroupsRef.current = nextGroups;
    framesRef.current = updatedFrames;
    setLayerGroups(nextGroups);
    if (isMovementGroup) setFrames(updatedFrames);
    pushHistorySnapshot({ frames: updatedFrames, layerGroups: nextGroups });
  };

  const handleRenameLayerGroup = (groupId: string, name: string) => {
    setLayerGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, name } : g)));
  };

  const handleMoveLayerGroupParent = (groupId: string, parentGroupId: string | null) => {
    if (groupId === parentGroupId) return;
    setLayerGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, parentGroupId } : g))
    );
  };

  const handleMergeLayers = useCallback(
    (indices: number[]) => {
      const sorted = [...new Set(indices)].sort((a, b) => a - b);
      if (sorted.length < 2) return;
      const lowestIdx = sorted[0];
      const mergedSet = new Set(sorted);
      const updated = framesRef.current.map((f, fIdx) => {
        if (fIdx !== currentFrameIndex) return f;
        const composed = createEmptyGrid(canvasWidth, canvasHeight);
        for (const idx of sorted) {
          const l = f.layers[idx];
          if (!l || l.layerType === 'adjustment') continue;
          const op = (l.opacity ?? 1) * (l.fillOpacity ?? 1);
          const bm = l.blendMode || 'normal';
          for (let y = 0; y < canvasHeight; y++) {
            for (let x = 0; x < canvasWidth; x++) {
              const c = l.pixels[y]?.[x];
              if (c) {
                const ma = resolveMaskAlpha(l.mask, x, y);
                const eff = op * ma;
                if (eff <= 0.001) continue;
                composed[y][x] =
                  eff < 0.99 || bm !== 'normal'
                    ? blendHexColors(composed[y][x], c, eff, bm)
                    : c;
              }
            }
          }
        }
        const baseLayer = f.layers[lowestIdx];
        const nextLayers = f.layers
          .map((l, lIdx) =>
            lIdx === lowestIdx
              ? {
                  ...baseLayer,
                  name: `${baseLayer.name} (Fusionada)`,
                  opacity: 1,
                  fillOpacity: 1,
                  blendMode: 'normal' as const,
                  mask: undefined,
                  pixels: composed,
                }
              : l
          )
          .filter((_, lIdx) => lIdx === lowestIdx || !mergedSet.has(lIdx));
        return { ...f, layers: nextLayers };
      });
      framesRef.current = updated;
      currentLayerIndexRef.current = lowestIdx;
      setFrames(updated);
      setCurrentLayerIndex(lowestIdx);
      setSelectedLayerIndices([lowestIdx]);
      setEditingMask(false);
      pushHistorySnapshot({ frames: updated, currentLayerIndex: lowestIdx });
      setImportNotification(`${sorted.length} capas fusionadas en orden visual.`);
      setTimeout(() => setImportNotification(null), 2500);
    },
    [currentFrameIndex, canvasWidth, canvasHeight, pushHistorySnapshot]
  );

  const handleMergeVisibleLayers = useCallback(() => {
    const visibleIndices = currentFrame.layers
      .map((l, idx) => (l.visible && l.layerType !== 'adjustment' ? idx : -1))
      .filter((idx) => idx >= 0);
    if (visibleIndices.length < 2) return;
    handleMergeLayers(visibleIndices);
  }, [currentFrame.layers, handleMergeLayers]);

  const handleMassDuplicateLayers = useCallback(
    (indices: number[]) => {
      const sorted = [...new Set(indices)].sort((a, b) => a - b);
      if (sorted.length === 0) return;
      const updated = framesRef.current.map((f, fIdx) => {
        if (fIdx !== currentFrameIndex) return f;
        const clones: Layer[] = sorted
          .map((idx) => f.layers[idx])
          .filter(Boolean)
          .map((l) => ({
            ...JSON.parse(JSON.stringify(l)),
            id: `layer-dup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: `${l.name} (Copia)`,
          }));
        const insertAt = sorted[sorted.length - 1] + 1;
        const nextLayers = [...f.layers];
        nextLayers.splice(insertAt, 0, ...clones);
        return { ...f, layers: nextLayers };
      });
      framesRef.current = updated;
      setFrames(updated);
      pushHistorySnapshot({ frames: updated });
      setImportNotification(`${sorted.length} capas duplicadas.`);
      setTimeout(() => setImportNotification(null), 2500);
    },
    [currentFrameIndex, pushHistorySnapshot]
  );

  const handleConvertLayersToGroup = useCallback(
    (indices: number[], name: string, color: string) => {
      const newGroupId = `group-${Date.now()}`;
      const newGroup: LayerGroup = {
        id: newGroupId,
        name: name || 'Nueva Carpeta',
        color: color || '#3b82f6',
        category: 'Normal',
        parentGroupId: null,
        frameIndices: [currentFrameIndex],
        collapsed: false,
        visible: true,
        locked: false,
        playbackMode: 'loop',
        fps: animationFps,
      };
      const nextGroups = [...layerGroupsRef.current, newGroup];
      const updated = framesRef.current.map((f, fIdx) => {
        if (fIdx !== currentFrameIndex) return f;
        return {
          ...f,
          layers: f.layers.map((l, lIdx) =>
            indices.includes(lIdx) ? { ...l, groupId: newGroupId } : l
          ),
        };
      });
      layerGroupsRef.current = nextGroups;
      framesRef.current = updated;
      setLayerGroups(nextGroups);
      setFrames(updated);
      pushHistorySnapshot({ frames: updated, layerGroups: nextGroups });
      setImportNotification(`Carpeta "${newGroup.name}" creada con ${indices.length} capas.`);
      setTimeout(() => setImportNotification(null), 2500);
    },
    [currentFrameIndex, animationFps, pushHistorySnapshot]
  );

  // Photoshop Layer Mask, Rasterize & Smart Object Handlers
  const handleUpdateLayerMaskPixels = useCallback(
    (maskPixels: number[][]) => {
      const updated = framesRef.current.map((f, fIdx) => {
        if (fIdx !== currentFrameIndex) return f;
        return {
          ...f,
          layers: f.layers.map((l, lIdx) =>
            lIdx === currentLayerIndex && l.mask
              ? { ...l, mask: { ...l.mask, pixels: maskPixels } }
              : l
          ),
        };
      });
      framesRef.current = updated;
      setFrames(updated);
      pushHistorySnapshot({ frames: updated });
    },
    [currentFrameIndex, currentLayerIndex, pushHistorySnapshot]
  );

  const handleCreateLayerMask = useCallback(
    (
      index: number,
      mode: 'reveal' | 'hide' | 'selection' | 'vector',
      maskType: LayerMaskType = 'layer'
    ) => {
      let maskPixels = createMaskGrid(canvasWidth, canvasHeight, mode === 'hide' ? 0 : 255);
      if (mode === 'selection' && selection && selection.active) {
        const minX = Math.min(selection.startX, selection.endX);
        const maxX = Math.max(selection.startX, selection.endX);
        const minY = Math.min(selection.startY, selection.endY);
        const maxY = Math.max(selection.startY, selection.endY);
        maskPixels = createMaskGrid(canvasWidth, canvasHeight, 0);
        for (let y = Math.max(0, minY); y <= Math.min(canvasHeight - 1, maxY); y++) {
          for (let x = Math.max(0, minX); x <= Math.min(canvasWidth - 1, maxX); x++) {
            maskPixels[y][x] = 255;
          }
        }
      } else if (mode === 'vector') {
        maskPixels = createMaskGrid(canvasWidth, canvasHeight, 255);
      }
      const updated = framesRef.current.map((f, fIdx) => {
        if (fIdx !== currentFrameIndex) return f;
        return {
          ...f,
          layers: f.layers.map((l, lIdx) =>
            lIdx === index
              ? {
                  ...l,
                  mask: {
                    type: maskType,
                    pixels: maskPixels,
                    disabled: false,
                    inverted: false,
                    linked: true,
                    quickPreview: false,
                  },
                }
              : l
          ),
        };
      });
      framesRef.current = updated;
      currentLayerIndexRef.current = index;
      setFrames(updated);
      setCurrentLayerIndex(index);
      setEditingMask(true);
      pushHistorySnapshot({ frames: updated, currentLayerIndex: index });
    },
    [canvasWidth, canvasHeight, selection, currentFrameIndex, pushHistorySnapshot]
  );

  const handleDeleteLayerMask = useCallback(
    (index: number) => {
      const updated = framesRef.current.map((f, fIdx) => {
        if (fIdx !== currentFrameIndex) return f;
        return {
          ...f,
          layers: f.layers.map((l, lIdx) => (lIdx === index ? { ...l, mask: undefined } : l)),
        };
      });
      framesRef.current = updated;
      setFrames(updated);
      setEditingMask(false);
      pushHistorySnapshot({ frames: updated });
    },
    [currentFrameIndex, pushHistorySnapshot]
  );

  const handleApplyLayerMask = useCallback(
    (index: number) => {
      const updated = framesRef.current.map((f, fIdx) => {
        if (fIdx !== currentFrameIndex) return f;
        return {
          ...f,
          layers: f.layers.map((l, lIdx) => {
            if (lIdx !== index || !l.mask) return l;
            const nextPixels = l.pixels.map((row, y) =>
              row.map((col, x) => {
                if (!col) return null;
                const ma = resolveMaskAlpha(l.mask, x, y);
                if (ma <= 0.02) return null;
                if (ma >= 0.99) return col;
                return blendHexColors(null, col, ma);
              })
            );
            return { ...l, pixels: nextPixels, mask: undefined };
          }),
        };
      });
      framesRef.current = updated;
      setFrames(updated);
      setEditingMask(false);
      pushHistorySnapshot({ frames: updated });
    },
    [currentFrameIndex, pushHistorySnapshot]
  );

  const handleInvertLayerMask = useCallback(
    (index: number) => {
      const updated = framesRef.current.map((f, fIdx) => {
        if (fIdx !== currentFrameIndex) return f;
        return {
          ...f,
          layers: f.layers.map((l, lIdx) =>
            lIdx === index && l.mask
              ? { ...l, mask: { ...l.mask, inverted: !l.mask.inverted } }
              : l
          ),
        };
      });
      framesRef.current = updated;
      setFrames(updated);
      pushHistorySnapshot({ frames: updated });
    },
    [currentFrameIndex, pushHistorySnapshot]
  );

  const handleToggleMaskDisabled = useCallback(
    (index: number) => {
      setFrames((prev) =>
        prev.map((f, fIdx) =>
          fIdx !== currentFrameIndex
            ? f
            : {
                ...f,
                layers: f.layers.map((l, lIdx) =>
                  lIdx === index && l.mask
                    ? { ...l, mask: { ...l.mask, disabled: !l.mask.disabled } }
                    : l
                ),
              }
        )
      );
    },
    [currentFrameIndex]
  );

  const handleToggleMaskLinked = useCallback(
    (index: number) => {
      setFrames((prev) =>
        prev.map((f, fIdx) =>
          fIdx !== currentFrameIndex
            ? f
            : {
                ...f,
                layers: f.layers.map((l, lIdx) =>
                  lIdx === index && l.mask
                    ? { ...l, mask: { ...l.mask, linked: l.mask.linked === false } }
                    : l
                ),
              }
        )
      );
    },
    [currentFrameIndex]
  );

  const handleToggleMaskQuickPreview = useCallback(
    (index: number) => {
      setFrames((prev) =>
        prev.map((f, fIdx) =>
          fIdx !== currentFrameIndex
            ? f
            : {
                ...f,
                layers: f.layers.map((l, lIdx) =>
                  lIdx === index && l.mask
                    ? { ...l, mask: { ...l.mask, quickPreview: !l.mask.quickPreview } }
                    : l
                ),
              }
        )
      );
    },
    [currentFrameIndex]
  );

  const handleRasterizeLayer = useCallback(
    (index: number) => {
      const updated = framesRef.current.map((f, fIdx) => {
        if (fIdx !== currentFrameIndex) return f;
        return {
          ...f,
          layers: f.layers.map((l, lIdx) => {
            if (lIdx !== index) return l;
            const nextPixels = l.mask
              ? l.pixels.map((row, y) =>
                  row.map((col, x) => {
                    if (!col) return null;
                    const ma = resolveMaskAlpha(l.mask, x, y);
                    if (ma <= 0.02) return null;
                    return ma >= 0.99 ? col : blendHexColors(null, col, ma);
                  })
                )
              : l.pixels;
            return {
              ...l,
              layerType: 'raster' as LayerType,
              pixels: nextPixels,
              mask: undefined,
              locked: false,
            };
          }),
        };
      });
      framesRef.current = updated;
      setFrames(updated);
      pushHistorySnapshot({ frames: updated });
      setImportNotification('Capa rasterizada.');
      setTimeout(() => setImportNotification(null), 2000);
    },
    [currentFrameIndex, pushHistorySnapshot]
  );

  const handleConvertToSmartObject = useCallback(
    (index: number) => {
      const updated = framesRef.current.map((f, fIdx) => {
        if (fIdx !== currentFrameIndex) return f;
        return {
          ...f,
          layers: f.layers.map((l, lIdx) =>
            lIdx === index
              ? {
                  ...l,
                  layerType: 'smart' as LayerType,
                  smartSourceName: l.smartSourceName || l.name,
                }
              : l
          ),
        };
      });
      framesRef.current = updated;
      setFrames(updated);
      pushHistorySnapshot({ frames: updated });
      setImportNotification('Convertida a objeto inteligente.');
      setTimeout(() => setImportNotification(null), 2000);
    },
    [currentFrameIndex, pushHistorySnapshot]
  );

  const handleAssignFrameToGroup = (frameIndex: number, groupId: string | null) => {
    setFrames((prev) =>
      prev.map((f, i) => (i === frameIndex ? { ...f, groupId } : f))
    );
    setLayerGroups((prev) =>
      prev.map((g) => {
        const filtered = (g.frameIndices || []).filter((idx) => idx !== frameIndex);
        if (groupId && g.id === groupId) {
          return {
            ...g,
            frameIndices: [...filtered, frameIndex].sort((a, b) => a - b),
          };
        }
        return { ...g, frameIndices: filtered };
      })
    );
  };

  const handleDeleteLayerGroup = (groupId: string, deleteContent: boolean) => {
    const updated = framesRef.current.map((f) => {
      if (!deleteContent) {
        return {
          ...f,
          layers: f.layers.map((l) => (l.groupId === groupId ? { ...l, groupId: null } : l)),
        };
      } else {
        const remaining = f.layers.filter((l) => l.groupId !== groupId);
        const safeLayers =
          remaining.length > 0
            ? remaining
            : [
                {
                  id: `layer-${Date.now()}`,
                  name: 'Capa 1',
                  visible: true,
                  locked: false,
                  opacity: 1,
                  pixels: createEmptyGrid(canvasWidth, canvasHeight),
                },
              ];
        return { ...f, layers: safeLayers };
      }
    });
    const nextGroups = layerGroupsRef.current.filter((g) => g.id !== groupId);
    framesRef.current = updated;
    layerGroupsRef.current = nextGroups;
    currentLayerIndexRef.current = 0;
    setFrames(updated);
    setLayerGroups(nextGroups);
    setCurrentLayerIndex(0);
    pushHistorySnapshot({ frames: updated, layerGroups: nextGroups, currentLayerIndex: 0 });
  };

  const handleToggleGroupCollapse = (groupId: string) => {
    setLayerGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, collapsed: !g.collapsed } : g))
    );
  };

  const handleToggleGroupVisibility = (groupId: string) => {
    const targetGroup = layerGroups.find((g) => g.id === groupId);
    const nextVis = targetGroup?.visible === false;

    setLayerGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, visible: nextVis } : g))
    );

    setFrames((prev) =>
      prev.map((f, i) => {
        if (i !== currentFrameIndex) return f;
        return {
          ...f,
          layers: f.layers.map((l) =>
            l.groupId === groupId ? { ...l, visible: nextVis } : l
          ),
        };
      })
    );
  };

  const handleToggleGroupLock = (groupId: string) => {
    const targetGroup = layerGroups.find((g) => g.id === groupId);
    const nextLocked = !targetGroup?.locked;

    setLayerGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, locked: nextLocked } : g))
    );

    setFrames((prev) =>
      prev.map((f, i) => {
        if (i !== currentFrameIndex) return f;
        return {
          ...f,
          layers: f.layers.map((l) =>
            l.groupId === groupId ? { ...l, locked: nextLocked } : l
          ),
        };
      })
    );
  };

  const handleChangeGroupOpacity = (groupId: string, opacity: number) => {
    const clamped = Math.max(0, Math.min(1, opacity));
    setLayerGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, opacity: clamped } : g))
    );
  };

  const handleChangeGroupColor = (groupId: string, color: string) => {
    setLayerGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, color } : g))
    );
  };

  const handleAssignLayerToGroup = (layerIndex: number, groupId: string | null) => {
    setFrames((prev) =>
      prev.map((f, i) => {
        if (i !== currentFrameIndex) return f;
        return {
          ...f,
          layers: f.layers.map((l, lIdx) =>
            lIdx === layerIndex ? { ...l, groupId } : l
          ),
        };
      })
    );
  };

  const handleBatchAssignLayersToGroup = (indices: number[], groupId: string | null) => {
    setFrames((prev) =>
      prev.map((f, i) => {
        if (i !== currentFrameIndex) return f;
        return {
          ...f,
          layers: f.layers.map((l, lIdx) =>
            indices.includes(lIdx) ? { ...l, groupId } : l
          ),
        };
      })
    );
  };

  const handleBatchToggleLayerVisibility = (indices: number[]) => {
    setFrames((prev) =>
      prev.map((f, i) => {
        if (i !== currentFrameIndex) return f;
        const anyVisible = indices.some((idx) => f.layers[idx]?.visible);
        return {
          ...f,
          layers: f.layers.map((l, lIdx) =>
            indices.includes(lIdx) ? { ...l, visible: !anyVisible } : l
          ),
        };
      })
    );
  };

  const handleBatchToggleLayerLock = (indices: number[]) => {
    setFrames((prev) =>
      prev.map((f, i) => {
        if (i !== currentFrameIndex) return f;
        const anyLocked = indices.some((idx) => f.layers[idx]?.locked);
        return {
          ...f,
          layers: f.layers.map((l, lIdx) =>
            indices.includes(lIdx) ? { ...l, locked: !anyLocked } : l
          ),
        };
      })
    );
  };

  const handleBatchDeleteLayers = (indices: number[]) => {
    if (currentFrame.layers.length <= indices.length) return;
    const updated = framesRef.current.map((f, i) =>
      i !== currentFrameIndex
        ? f
        : { ...f, layers: f.layers.filter((_, lIdx) => !indices.includes(lIdx)) }
    );
    framesRef.current = updated;
    currentLayerIndexRef.current = 0;
    setFrames(updated);
    setCurrentLayerIndex(0);
    setSelectedLayerIndices([0]);
    pushHistorySnapshot({ frames: updated, currentLayerIndex: 0 });
  };

  // Batch Frame Handlers
  const handleBatchChangeFrameDuration = (indices: number[], durationTicks: number, durationMs?: number) => {
    setFrames((prev) =>
      prev.map((f, i) =>
        indices.includes(i)
          ? {
              ...f,
              durationTicks,
              durationMs: durationMs ?? Math.round((durationTicks / 60) * 1000),
            }
          : f
      )
    );
  };

  const handleBatchChangeFramePhase = (indices: number[], phase: FramePhase) => {
    setFrames((prev) =>
      prev.map((f, i) => (indices.includes(i) ? { ...f, phase } : f))
    );
  };

  const handleBatchDuplicateFrames = (indices: number[]) => {
    const toDuplicate = indices.map((idx) => frames[idx]).filter(Boolean);
    if (toDuplicate.length === 0) return;

    const clonedFrames: Frame[] = toDuplicate.map((f) => ({
      ...JSON.parse(JSON.stringify(f)),
      id: `frame-${Date.now()}-${Math.random()}`,
      name: `${f.name} (Copia)`,
    }));

    const lastIdx = Math.max(...indices);
    const nextFrames = [...frames];
    nextFrames.splice(lastIdx + 1, 0, ...clonedFrames);
    setFrames(nextFrames);
    pushHistory(nextFrames);
  };

  const handleBatchDeleteFrames = (indices: number[]) => {
    const curFrames = framesRef.current;
    if (curFrames.length <= indices.length) return;
    const nextFrames = curFrames.filter((_, i) => !indices.includes(i));
    framesRef.current = nextFrames;
    currentFrameIndexRef.current = 0;
    setFrames(nextFrames);
    setCurrentFrameIndex(0);
    setSelectedFrameIndices([0]);
    pushHistorySnapshot({ frames: nextFrames, currentFrameIndex: 0 });
  };

  // System 6: Helper to apply AI / Pose / Generated content non-destructively to chosen frame scopes
  const applyAiInsertConfig = useCallback(
    (
      config: AiInsertConfig,
      sequenceGrids: (string | null)[][][],
      fallbackHitboxes?: Hitbox[]
    ) => {
      const targetFramesSet = new Set<number>();
      if (config.destination === 'current_frame') {
        targetFramesSet.add(currentFrameIndex);
      } else if (config.destination === 'all_frames' || config.destination === 'global_layer') {
        frames.forEach((_, idx) => targetFramesSet.add(idx));
      } else if (config.destination === 'selected_frames') {
        const sel = selectedFrameIndices.length > 0 ? selectedFrameIndices : [currentFrameIndex];
        sel.forEach((idx) => targetFramesSet.add(idx));
      } else if (config.destination === 'range') {
        const s = Math.max(0, Math.min(frames.length - 1, config.rangeStart - 1));
        const e = Math.max(s, Math.min(frames.length - 1, config.rangeEnd - 1));
        for (let i = s; i <= e; i++) targetFramesSet.add(i);
      }

      let nextGroups = layerGroupsRef.current;
      let targetGroupId: string | null = activeGroupId || currentLayer?.groupId || null;
      if (config.wrapInGroup && config.groupName) {
        const existingGroup = nextGroups.find(
          (g) => g.name.toLowerCase() === config.groupName!.toLowerCase()
        );
        if (existingGroup) {
          targetGroupId = existingGroup.id;
        } else {
          const newGId = `group-ai-${Date.now()}`;
          const newGroup: LayerGroup = {
            id: newGId,
            name: config.groupName,
            color: config.groupColor || '#a855f7',
            category: 'VFX',
            frameIndices: [...targetFramesSet],
            collapsed: false,
            visible: true,
            locked: false,
            playbackMode: 'loop',
            fps: animationFps,
          };
          nextGroups = [...nextGroups, newGroup];
          layerGroupsRef.current = nextGroups;
          setLayerGroups(nextGroups);
          targetGroupId = newGId;
        }
      }

      const sharedGlobalId = config.destination === 'global_layer' ? `layer-global-ai-${Date.now()}` : null;
      const nextFrames = [...framesRef.current];
      let finalFrames: Frame[];

      if (config.destination === 'global_layer') {
        const baseGrid = sequenceGrids[0] || createEmptyGrid(canvasWidth, canvasHeight);
        const globalLayer: Layer = {
          id: sharedGlobalId!,
          name: config.layerName || 'Capa Global IA',
          visible: true,
          locked: false,
          opacity: 1,
          fillOpacity: 1,
          blendMode: 'normal',
          layerType: 'ai',
          isGlobal: true,
          groupId: targetGroupId,
          pixels: baseGrid.map((r) => [...r]),
        };
        finalFrames = syncGlobalLayerAcrossFrames(nextFrames, globalLayer);
      } else if (sequenceGrids.length > 1) {
        sequenceGrids.forEach((grid, stepIdx) => {
          const targetIdx = currentFrameIndex + stepIdx;
          if (targetIdx >= nextFrames.length) {
            const basePrev = nextFrames[targetIdx - 1] || nextFrames[0];
            nextFrames.push({
              id: `frame-vfx-${Date.now()}-${stepIdx}`,
              name: `${basePrev.name} (IA #${stepIdx + 1})`,
              durationTicks: 6,
              durationMs: 100,
              phase: 'neutral',
              hitboxes: [],
              layers: basePrev.layers.map((l) =>
                l.isGlobal
                  ? JSON.parse(JSON.stringify(l))
                  : { ...JSON.parse(JSON.stringify(l)), id: `layer-${Date.now()}-${Math.random()}` }
              ),
            });
          }
          const tf = nextFrames[targetIdx];
          const newLayer: Layer = {
            id: `layer-ai-${Date.now()}-${stepIdx}`,
            name: `${config.layerName} #${stepIdx + 1}`,
            visible: true,
            locked: false,
            opacity: 1,
            fillOpacity: 1,
            blendMode: 'normal',
            layerType: 'ai',
            groupId: targetGroupId,
            pixels: grid.map((r) => [...r]),
          };
          const nextHbs = [...(tf.hitboxes || [])];
          if (fallbackHitboxes?.length && (stepIdx === 1 || stepIdx === 2)) {
            nextHbs.push(...fallbackHitboxes.map((h) => ({ ...h, id: `hb-ai-${Date.now()}-${stepIdx}` })));
          }
          nextFrames[targetIdx] = {
            ...tf,
            layers: config.insertAtBottom ? [newLayer, ...tf.layers] : [...tf.layers, newLayer],
            hitboxes: nextHbs,
          };
        });
        finalFrames = nextFrames;
      } else {
        const singleGrid = sequenceGrids[0] || createEmptyGrid(canvasWidth, canvasHeight);
        finalFrames = nextFrames.map((tf, fIdx) => {
          if (!targetFramesSet.has(fIdx)) return tf;
          const newLayer: Layer = {
            id: `layer-ai-${Date.now()}-${fIdx}-${Math.random().toString(36).slice(2, 5)}`,
            name: config.layerName || 'Resultado IA',
            visible: true,
            locked: false,
            opacity: 1,
            fillOpacity: 1,
            blendMode: 'normal',
            layerType: 'ai',
            groupId: targetGroupId,
            colorTag: config.insertAtBottom ? '#10b981' : undefined,
            pixels: singleGrid.map((r) => [...r]),
          };
          const nextHbs =
            fIdx === currentFrameIndex && fallbackHitboxes?.length
              ? [...(tf.hitboxes || []), ...fallbackHitboxes]
              : tf.hitboxes || [];
          return {
            ...tf,
            layers: config.insertAtBottom ? [newLayer, ...tf.layers] : [...tf.layers, newLayer],
            hitboxes: nextHbs,
          };
        });
      }

      framesRef.current = finalFrames;
      setFrames(finalFrames);
      pushHistorySnapshot({ frames: finalFrames, layerGroups: nextGroups });

      setImportNotification(
        `¡"${config.layerName}" añadido sin sobrescribir capas (${config.destination === 'global_layer' ? 'Capa Global' : `${targetFramesSet.size} frame(s)`})!`
      );
      setTimeout(() => setImportNotification(null), 3500);
    },
    [
      currentFrameIndex,
      frames,
      selectedFrameIndices,
      activeGroupId,
      currentLayer?.groupId,
      animationFps,
      canvasWidth,
      canvasHeight,
      syncGlobalLayerAcrossFrames,
      pushHistorySnapshot,
    ]
  );

  // Inject AI VFX (Always creates new independent layers, respects destination choice)
  const handleInjectAiVfx = (
    pixelsOrFrames: { x: number; y: number; color: string }[] | { x: number; y: number; color: string }[][],
    vfxName: string,
    hitbox?: { x: number; y: number; width: number; height: number },
    _targetMode: 'modify' | 'new_layer' = 'new_layer',
    wrapInGroup: boolean = true,
    groupName?: string,
    groupColor?: string
  ) => {
    const isSequence = Array.isArray(pixelsOrFrames[0]);
    const rawSeq: { x: number; y: number; color: string }[][] = isSequence
      ? (pixelsOrFrames as { x: number; y: number; color: string }[][])
      : [pixelsOrFrames as { x: number; y: number; color: string }[]];

    const sequenceGrids = rawSeq.map((pts) => {
      const g = createEmptyGrid(canvasWidth, canvasHeight);
      pts.forEach((p) => {
        if (p.x >= 0 && p.x < canvasWidth && p.y >= 0 && p.y < canvasHeight) {
          g[p.y][p.x] = p.color;
        }
      });
      return g;
    });

    const hbList: Hitbox[] | undefined = hitbox
      ? [
          {
            id: `hb-vfx-${Date.now()}`,
            type: 'hitbox',
            x: Math.max(0, hitbox.x),
            y: Math.max(0, hitbox.y),
            w: Math.min(canvasWidth - hitbox.x, hitbox.width || 8),
            h: Math.min(canvasHeight - hitbox.y, hitbox.height || 6),
            name: `${vfxName} Hitbox`,
          },
        ]
      : undefined;

    if (autoApplyAiAllFrames || sequenceGrids.length > 1) {
      applyAiInsertConfig(
        {
          destination: sequenceGrids.length > 1 ? 'current_frame' : 'all_frames',
          rangeStart: 1,
          rangeEnd: frames.length,
          selectedFrameIndices,
          layerName: vfxName,
          wrapInGroup,
          groupName: groupName || `[FX] ${vfxName}`,
          groupColor: groupColor || '#a855f7',
        },
        sequenceGrids,
        hbList
      );
      return;
    }

    setPendingAiInsert({
      title: `Insertar VFX IA: ${vfxName}`,
      defaultLayerName: vfxName,
      sequenceGrids,
      groupName: groupName || `[FX] ${vfxName}`,
      groupColor: groupColor || '#a855f7',
      hitboxes: hbList,
    });
  };

  // Apply Multimodal Frame Remix (Non-destructive: always creates independent layer via destination modal)
  const handleApplyFrameRemix = (
    pixels: { x: number; y: number; color: string }[],
    newHitboxes?: any[],
    _targetMode: 'modify' | 'new_layer' = 'new_layer',
    wrapInGroup: boolean = false
  ) => {
    const grid = createEmptyGrid(canvasWidth, canvasHeight);
    pixels.forEach((p) => {
      if (p.x >= 0 && p.x < canvasWidth && p.y >= 0 && p.y < canvasHeight) {
        grid[p.y][p.x] = p.color;
      }
    });

    const hbList: Hitbox[] | undefined = newHitboxes?.map((hb, i) => ({
      id: `hb-remix-${Date.now()}-${i}`,
      type: hb.type || 'hitbox',
      x: Math.max(0, hb.x),
      y: Math.max(0, hb.y),
      w: Math.min(canvasWidth - hb.x, hb.width || 8),
      h: Math.min(canvasHeight - hb.y, hb.height || 8),
      name: hb.name || 'Remix Hitbox',
    }));

    if (autoApplyAiAllFrames) {
      applyAiInsertConfig(
        {
          destination: 'all_frames',
          rangeStart: 1,
          rangeEnd: frames.length,
          selectedFrameIndices,
          layerName: 'Remix IA',
          wrapInGroup,
          groupName: wrapInGroup ? '[IA] Remix' : undefined,
        },
        [grid],
        hbList
      );
      return;
    }

    setPendingAiInsert({
      title: 'Insertar Resultado Remix IA',
      defaultLayerName: 'Remix IA',
      sequenceGrids: [grid],
      groupName: wrapInGroup ? '[IA] Remix' : undefined,
      hitboxes: hbList,
    });
  };

  // AI In-Between Frame Interpolator
  const handleGenerateInBetween = async (frameAIndex: number, frameBIndex: number) => {
    const frameA = frames[frameAIndex];
    const frameB = frames[frameBIndex];
    if (!frameA || !frameB) return;

    setImportNotification(`Interpolando movimiento entre Frame #${frameAIndex + 1} y Frame #${frameBIndex + 1}...`);

    const canvasA = frameToCanvas(frameA, canvasWidth, canvasHeight, 1);
    const canvasB = frameToCanvas(frameB, canvasWidth, canvasHeight, 1);
    const frameABase64 = canvasA.toDataURL('image/png');
    const frameBBase64 = canvasB.toDataURL('image/png');

    try {
      const res = await fetch('/api/ai/tween-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frameABase64,
          frameBBase64,
          moveName: projectName,
          width: canvasWidth,
          height: canvasHeight,
        }),
      });
      const data = await res.json();

      let newPixels = createEmptyGrid(canvasWidth, canvasHeight);
      if (data.pixels && Array.isArray(data.pixels)) {
        newPixels = pixelsToGrid(data.pixels, canvasWidth, canvasHeight);
      } else {
        // Smart motion blend fallback
        const gridA = frameA.layers[0]?.pixels;
        const gridB = frameB.layers[0]?.pixels;
        for (let y = 0; y < canvasHeight; y++) {
          for (let x = 0; x < canvasWidth; x++) {
            const colA = gridA?.[y]?.[x];
            const colB = gridB?.[y]?.[x];
            if (colA && colB) newPixels[y][x] = colA;
            else if (colA) newPixels[y][x] = colA;
            else if (colB) newPixels[y][x] = colB;
          }
        }
      }
      newPixels = validateAndCleanAiPixelGrid(newPixels, 'sprite', {
        targetPalette: activePaletteColors,
        coherenceLevel: 'high',
        repairOutlines: true,
      }).grid;

      const newFrame: Frame = {
        id: `frame-inbetween-${Date.now()}`,
        name: `In-Between (${frameAIndex + 1} ➔ ${frameBIndex + 1})`,
        durationTicks: 3,
        phase: 'active',
        hitboxes: data.hitbox ? [
          {
            id: `hb-tween-${Date.now()}`,
            type: 'hitbox',
            x: data.hitbox.x || 10,
            y: data.hitbox.y || 10,
            w: data.hitbox.width || 12,
            h: data.hitbox.height || 10,
            name: 'In-Between Hitbox'
          }
        ] : (frameA.hitboxes || []),
        layers: [
          {
            id: `layer-tween-${Date.now()}`,
            name: 'Capa In-Between',
            visible: true,
            locked: false,
            opacity: 1,
            pixels: newPixels,
          }
        ]
      };

      const insertIndex = Math.min(frameAIndex, frameBIndex) + 1;
      const nextFrames = [...frames];
      nextFrames.splice(insertIndex, 0, newFrame);
      setFrames(nextFrames);
      setCurrentFrameIndex(insertIndex);
      pushHistory(nextFrames);
      setImportNotification(`¡Fotograma intermedio (In-Between) insertado con éxito en #${insertIndex + 1}!`);
      setTimeout(() => setImportNotification(null), 4000);
    } catch (err: any) {
      console.error('Error generating in-between:', err);
      setImportNotification('Interpolación completada con fallback local.');
      setTimeout(() => setImportNotification(null), 4000);
    }
  };

  const handleInsertInBetweenSequence = (
    insertAfterIndex: number,
    grids: (string | null)[][][],
    labelPrefix: string = 'In-Between'
  ) => {
    if (!grids || grids.length === 0) return;
    const baseInsert = Math.max(0, Math.min(frames.length, insertAfterIndex + 1));
    const ts = Date.now();
    const newFrames: Frame[] = grids.map((grid, idx) => ({
      id: `frame-inbetween-${ts}-${idx}`,
      name: `${labelPrefix} #${idx + 1}`,
      durationTicks: 3,
      phase: 'active',
      hitboxes: frames[insertAfterIndex]?.hitboxes ? [...frames[insertAfterIndex].hitboxes] : [],
      layers: [
        {
          id: `layer-tween-${ts}-${idx}`,
          name: `${labelPrefix} ${idx + 1}`,
          visible: true,
          locked: false,
          opacity: 1,
          pixels: grid,
        },
      ],
    }));

    const nextFrames = [...frames];
    nextFrames.splice(baseInsert, 0, ...newFrames);
    setFrames(nextFrames);
    setCurrentFrameIndex(baseInsert);
    pushHistory(nextFrames);
    setImportNotification(`¡${newFrames.length} fotograma(s) intermedio(s) insertado(s) en la línea de tiempo!`);
    setTimeout(() => setImportNotification(null), 4000);
  };

  const handleInsertAnimationFrames = (
    grids: (string | null)[][][],
    labelPrefix: string,
    insertMode: 'append_frames' | 'overlay_layers'
  ) => {
    if (!grids || grids.length === 0) return;
    const ts = Date.now();
    if (insertMode === 'overlay_layers') {
      const nextFrames = frames.map((f, fIdx) => {
        const grid = grids[fIdx % grids.length];
        if (!grid) return f;
        return {
          ...f,
          layers: [
            ...f.layers,
            {
              id: `layer-ai-anim-${ts}-${fIdx}`,
              name: `${labelPrefix} #${(fIdx % grids.length) + 1}`,
              visible: true,
              locked: false,
              opacity: 1,
              pixels: grid,
            },
          ],
        };
      });
      setFrames(nextFrames);
      pushHistory(nextFrames);
      setImportNotification(`Secuencia IA añadida como capas sobre ${nextFrames.length} frames.`);
      setTimeout(() => setImportNotification(null), 4000);
      return;
    }

    const insertPos = Math.min(frames.length, currentFrameIndex + 1);
    const createdFrames: Frame[] = grids.map((grid, idx) => ({
      id: `frame-ai-anim-${ts}-${idx}`,
      name: `${labelPrefix} ${idx + 1}`,
      durationTicks: 4,
      phase: idx === 0 ? 'startup' : idx === grids.length - 1 ? 'recovery' : 'active',
      hitboxes: [],
      layers: [
        {
          id: `layer-ai-anim-${ts}-${idx}`,
          name: `${labelPrefix} #${idx + 1}`,
          visible: true,
          locked: false,
          opacity: 1,
          pixels: grid,
        },
      ],
    }));
    const nextFrames = [...frames];
    nextFrames.splice(insertPos, 0, ...createdFrames);
    setFrames(nextFrames);
    setCurrentFrameIndex(insertPos);
    pushHistory(nextFrames);
    setImportNotification(`¡${createdFrames.length} fotogramas de "${labelPrefix}" insertados en la secuencia!`);
    setTimeout(() => setImportNotification(null), 4000);
  };

  // Action Tags Handlers
  const handleCreateActionTag = (name: string, category: any, color: string) => {
    const newTag: ActionTag = {
      id: `tag-${Date.now()}`,
      name,
      color,
      frameIndices: [currentFrameIndex],
      playbackMode: 'loop',
      category: category || 'Normal'
    };
    setActionTags((prev) => [...prev, newTag]);
  };

  const handleDeleteActionTag = (tagId: string) => {
    const nextTags = actionTagsRef.current.filter((t) => t.id !== tagId);
    actionTagsRef.current = nextTags;
    setActionTags(nextTags);
    if (activeActionTagId === tagId) setActiveActionTagId(null);
    pushHistorySnapshot({ actionTags: nextTags });
  };

  const handleAssignFrameToActionTag = (tagId: string, frameIndex: number) => {
    setActionTags((prev) =>
      prev.map((t) => {
        if (t.id !== tagId) return t;
        const exists = t.frameIndices.includes(frameIndex);
        return {
          ...t,
          frameIndices: exists
            ? t.frameIndices.filter((idx) => idx !== frameIndex)
            : [...t.frameIndices, frameIndex].sort((a, b) => a - b),
        };
      })
    );
  };

  // Focus & Reveal a specific modular panel (auto-expands, switches active tab, un-minimizes float)
  const handleFocusPanel = useCallback((panelId: RightPanelId) => {
    setWorkspaceLayout((prev) => {
      const targetDock: PanelDockZone = prev.sidebarPosition === 'left' ? 'left-main' : 'right-main';
      const nextFloating = { ...(prev.floatingPanels || {}) };
      if (nextFloating[panelId]) {
        nextFloating[panelId] = { ...nextFloating[panelId], minimized: false };
      }
      return {
        ...prev,
        sidebarPosition: prev.sidebarPosition === 'hidden' ? 'right' : prev.sidebarPosition,
        floatingPanels: nextFloating,
        tabGroups: (prev.tabGroups || []).map((g) =>
          g.panelIds.includes(panelId) ? { ...g, activePanelId: panelId } : g
        ),
        rightPanels: prev.rightPanels.map((p) =>
          p.id === panelId
            ? {
                ...p,
                visible: true,
                expanded: true,
                dock: p.dock && p.dock.endsWith('mini') ? targetDock : p.dock || targetDock,
              }
            : p
        ),
      };
    });
    setRightSidebarOpen(true);
  }, []);

  const handleToggleFloatToolbar = useCallback(() => {
    setWorkspaceLayout((prev) => {
      const nextFloating = { ...(prev.floatingPanels || {}) };
      const isFloating = Boolean(nextFloating.toolbar?.isFloating);
      if (isFloating) {
        delete nextFloating.toolbar;
      } else {
        nextFloating.toolbar = {
          panelId: 'toolbar',
          isFloating: true,
          x: 72,
          y: 112,
          width: Math.max(152, prev.toolbarWidth || 152),
          height: Math.max(360, prev.toolbarHeight || 480),
        };
      }
      return {
        ...prev,
        floatingPanels: nextFloating,
        rightPanels: prev.rightPanels.map((p) =>
          p.id === 'toolbar' ? { ...p, visible: true, expanded: true } : p
        ),
        templateId: 'custom',
      };
    });
  }, []);

  const handleLocateHelpItem = useCallback(
    (item: HelpCatalogItem) => {
      setToolGuideModalOpen(false);
      setWhatIsThisActive(false);

      if (item.toolId) {
        handleSelectTool(item.toolId);
      }
      if (item.panelId) {
        if (item.panelId === 'toolbar') {
          setWorkspaceLayout((prev) => ({
            ...prev,
            toolbarPosition: prev.toolbarPosition === 'hidden' ? 'left' : prev.toolbarPosition,
            rightPanels: prev.rightPanels.map((p) =>
              p.id === 'toolbar' ? { ...p, visible: true, expanded: true } : p
            ),
          }));
        } else {
          handleFocusPanel(item.panelId);
        }
      }
      if (item.actionId) {
        switch (item.actionId) {
          case 'open_transform':
            startTransformSession('free');
            handleFocusPanel('properties');
            break;
          case 'open_appearance':
            openLayoutModal('style');
            break;
          case 'open_new_project':
            setNewProjectModalOpen(true);
            break;
          case 'open_workspace':
            openLayoutModal('layout');
            break;
          case 'toggle_ui_edit':
            setWorkspaceLayout((prev) => ({ ...prev, uiEditMode: true, totalFreedomMode: true }));
            break;
          case 'open_camera_shake':
            handleFocusPanel('animation');
            break;
          case 'open_timeline_curves':
            setForceOpenCurvesNonce((n) => n + 1);
            break;
        }
      }

      window.setTimeout(() => {
        setSpotlightTarget({
          helpId: item.id,
          label: item.name,
          hint: item.howToAccess,
        });
      }, 150);
    },
    [handleFocusPanel, handleSelectTool, openLayoutModal, startTransformSession]
  );

  // =========================================================
  // SMART UNIVERSAL DELETE ENGINE (Suprimir + Historial Undo)
  // =========================================================
  const collectSmartDeleteCandidates = useCallback((): SmartDeleteCandidate[] => {
    const candidates: SmartDeleteCandidate[] = [];
    const activeF = framesRef.current[currentFrameIndex];
    const activeL = activeF?.layers[currentLayerIndex];

    // 1. Active Vector Nodes or Active Vector Path
    if (selectedVectorPathId && activeL?.vectorPaths?.length) {
      const vp = activeL.vectorPaths.find((p) => p.id === selectedVectorPathId);
      if (vp) {
        if (selectedVectorNodeIds.length > 0 && vp.nodes.length - selectedVectorNodeIds.length >= 1) {
          candidates.push({
            id: 'vec_nodes',
            kind: 'vector_nodes',
            label: `Nodos vectoriales (${selectedVectorNodeIds.length})`,
            detail: `Eliminar ${selectedVectorNodeIds.length} nodo(s) seleccionado(s) del trazo "${vp.name}".`,
            affectedCount: selectedVectorNodeIds.length,
            requiresConfirmation: false,
          });
        } else {
          candidates.push({
            id: 'vec_path',
            kind: 'vector_path',
            label: `Trazo vectorial: ${vp.name}`,
            detail: `Eliminar el trazo vectorial "${vp.name}" (${vp.nodes.length} nodos) de la capa "${activeL.name}".`,
            affectedCount: 1,
            requiresConfirmation: false,
          });
        }
      }
    }

    // 1.5. Selected Interactive Parametric Shape
    if (selectedParametricShapeId && activeL?.parametricShapes?.length) {
      const sh = activeL.parametricShapes.find((s) => s.id === selectedParametricShapeId);
      if (sh) {
        candidates.push({
          id: `pshape_${sh.id}`,
          kind: 'parametric_shape',
          label: `Forma interactiva: ${SHAPE_KIND_LABELS[sh.kind]}`,
          detail: `Eliminar la forma paramétrica (${Math.round(sh.width)}×${Math.round(sh.height)}px) de "${activeL.name}".`,
          affectedCount: 1,
          requiresConfirmation: false,
        });
      }
    }

    // 2. Selected Hitbox / Hurtbox
    if (selectedHitboxId && showHitboxes && activeF?.hitboxes?.length) {
      const hb = activeF.hitboxes.find((h) => h.id === selectedHitboxId);
      if (hb) {
        candidates.push({
          id: `hb_${hb.id}`,
          kind: 'hitbox',
          label: `Caja de colisión: ${hb.name || hb.type.toUpperCase()}`,
          detail: `Eliminar ${hb.type} (${hb.w}×${hb.h}) del fotograma #${currentFrameIndex + 1}.`,
          affectedCount: 1,
          requiresConfirmation: false,
        });
      }
    }

    // 3. Active Pixel Selection
    if (selection && selection.active && activeL && !activeL.locked) {
      const w = Math.abs(selection.endX - selection.startX) + 1;
      const h = Math.abs(selection.endY - selection.startY) + 1;
      candidates.push({
        id: 'pixel_sel',
        kind: 'pixel_selection',
        label: `Selección activa de píxeles (${w}×${h}px)`,
        detail: `Borrar los píxeles dentro del área seleccionada en la capa "${activeL.name}".`,
        affectedCount: 1,
        requiresConfirmation: false,
      });
    }

    // 4. Active Reference Image
    if (activeReferenceId) {
      const refObj = referencesRef.current.find((r) => r.id === activeReferenceId);
      if (refObj) {
        candidates.push({
          id: `ref_${refObj.id}`,
          kind: 'reference',
          label: `Referencia: ${refObj.name}`,
          detail: `Quitar la imagen de referencia "${refObj.name}" (${refObj.anchor === 'camera' ? 'Cámara PureRef' : 'Lienzo'}).`,
          affectedCount: 1,
          requiresConfirmation: false,
        });
      }
    }

    // 5. Layer Mask / Adjustment Effect / AI Element
    if (editingMask && activeL?.mask) {
      candidates.push({
        id: 'layer_mask',
        kind: 'layer_mask',
        label: `Máscara de capa (${activeL.name})`,
        detail: `Eliminar la máscara vinculada a la capa "${activeL.name}".`,
        affectedCount: 1,
        requiresConfirmation: false,
      });
    }

    // Panel-specific contexts
    if (lastActiveUiContext === 'keyframes' || lastActiveUiContext === 'timeline') {
      const camKf = cameraKeyframesRef.current.find((k) => k.frameIndex === currentFrameIndex);
      if (camKf) {
        candidates.push({
          id: 'cam_kf',
          kind: 'camera_keyframe',
          label: `Keyframe de Cámara (F#${currentFrameIndex + 1})`,
          detail: `Eliminar keyframe de cámara X:${camKf.x} Y:${camKf.y} Zoom:${camKf.zoom}×.`,
          affectedCount: 1,
          requiresConfirmation: false,
        });
      }
      const layerKf = activeL?.keyframes?.find((k) => k.frameIndex === currentFrameIndex);
      if (layerKf) {
        candidates.push({
          id: 'layer_kf',
          kind: 'layer_keyframe',
          label: `Keyframe de capa "${activeL?.name}" (F#${currentFrameIndex + 1})`,
          detail: `Quitar keyframe de transformación/opacidad en el fotograma #${currentFrameIndex + 1}.`,
          affectedCount: 1,
          requiresConfirmation: false,
        });
      }
      const marker = timelineMarkersRef.current.find((m) => m.frameIndex === currentFrameIndex);
      if (marker) {
        candidates.push({
          id: `marker_${marker.id}`,
          kind: 'marker',
          label: `Marcador temporal: ${marker.label}`,
          detail: `Eliminar marcador del fotograma #${currentFrameIndex + 1}.`,
          affectedCount: 1,
          requiresConfirmation: false,
        });
      }
    }

    if (lastActiveUiContext === 'layers') {
      if (activeL?.layerType === 'adjustment') {
        candidates.push({
          id: `adj_${activeL.id}`,
          kind: 'adjustment_effect',
          label: `Efecto / Capa de ajuste: ${activeL.name}`,
          detail: `Eliminar la capa de ajuste "${activeL.name}".`,
          affectedCount: 1,
          requiresConfirmation: false,
        });
      }
      if (selectedLayerIndices.length > 1 && activeF && activeF.layers.length > selectedLayerIndices.length) {
        candidates.push({
          id: 'layers_multi',
          kind: 'layers_multi',
          label: `${selectedLayerIndices.length} capas seleccionadas`,
          detail: `Eliminar permanentemente ${selectedLayerIndices.length} capas del fotograma #${currentFrameIndex + 1}.`,
          affectedCount: selectedLayerIndices.length,
          requiresConfirmation: true,
        });
      } else if (activeGroupId) {
        const grp = layerGroupsRef.current.find((g) => g.id === activeGroupId);
        if (grp) {
          const inGroup = activeF?.layers.filter((l) => l.groupId === grp.id).length || 0;
          candidates.push({
            id: `grp_${grp.id}`,
            kind: 'layer_group',
            label: `Grupo de capas: ${grp.name}`,
            detail: `Eliminar carpeta "${grp.name}" (${inGroup} capa(s) vinculadas se desvincularán de la carpeta).`,
            affectedCount: Math.max(1, inGroup),
            requiresConfirmation: inGroup > 0,
          });
        }
      } else if (activeF && activeF.layers.length > 1 && activeL) {
        const isAi = /ia|ai|vfx/i.test(activeL.name);
        candidates.push({
          id: `layer_${activeL.id}`,
          kind: isAi ? 'ai_element' : 'layer_single',
          label: `${isAi ? 'Elemento IA' : 'Capa'}: ${activeL.name}`,
          detail: `Eliminar la capa "${activeL.name}" del fotograma actual.`,
          affectedCount: 1,
          requiresConfirmation: false,
        });
      }
    }

    if (lastActiveUiContext === 'timeline') {
      if (selectedFrameIndices.length > 1 && framesRef.current.length > selectedFrameIndices.length) {
        candidates.push({
          id: 'frames_multi',
          kind: 'frames_multi',
          label: `${selectedFrameIndices.length} fotogramas seleccionados`,
          detail: `Eliminar ${selectedFrameIndices.length} fotogramas de la línea temporal.`,
          affectedCount: selectedFrameIndices.length,
          requiresConfirmation: true,
        });
      } else if (framesRef.current.length > 1 && candidates.length === 0) {
        candidates.push({
          id: `frame_${currentFrameIndex}`,
          kind: 'frame_single',
          label: `Fotograma #${currentFrameIndex + 1} (${activeF?.name || ''})`,
          detail: `Eliminar el fotograma #${currentFrameIndex + 1} completo con sus capas.`,
          affectedCount: 1,
          requiresConfirmation: false,
        });
      }
    }

    if (lastActiveUiContext === 'poses' && savedDummiePosesRef.current.length > 0) {
      const targetPose = savedDummiePosesRef.current[0];
      candidates.push({
        id: `pose_${targetPose.id}`,
        kind: 'pose',
        label: `Pose guardada: ${targetPose.name}`,
        detail: `Eliminar la pose guardada "${targetPose.name}" de tu colección Dummie.`,
        affectedCount: 1,
        requiresConfirmation: false,
      });
    }

    if (lastActiveUiContext === 'library' && userLibraryItemsRef.current.length > 0) {
      const targetAsset = userLibraryItemsRef.current[0];
      candidates.push({
        id: `asset_${targetAsset.id}`,
        kind: 'asset',
        label: `Asset de usuario: ${targetAsset.name}`,
        detail: `Eliminar el recurso "${targetAsset.name}" de la biblioteca de usuario.`,
        affectedCount: 1,
        requiresConfirmation: true,
      });
    }

    const selectedGuide = selectedGuideId
      ? guidesRef.current.find((g) => g.id === selectedGuideId) || null
      : null;
    if (selectedGuide) {
      candidates.unshift({
        id: `guide_${selectedGuide.id}`,
        kind: 'guide',
        label: `Guía ${selectedGuide.orientation === 'vertical' ? 'Vertical' : 'Horizontal'} (${selectedGuide.orientation === 'vertical' ? 'X' : 'Y'} = ${selectedGuide.position} px)`,
        detail: selectedGuide.label
          ? `Eliminar la guía "${selectedGuide.label}" del lienzo.`
          : 'Eliminar la guía seleccionada del lienzo.',
        affectedCount: 1,
        requiresConfirmation: false,
      });
    } else if (lastActiveUiContext === 'guides' && (symmetryConfig.enabled || showPivot)) {
      candidates.push({
        id: 'guide_sym',
        kind: 'guide',
        label: symmetryConfig.enabled ? 'Guía de Simetría activa' : 'Pivote / Guía visible',
        detail: symmetryConfig.enabled
          ? 'Desactivar guía de simetría en el lienzo.'
          : 'Ocultar marcador de pivote / guía del lienzo.',
        affectedCount: 1,
        requiresConfirmation: false,
      });
    }

    // Prioritise explicit panel context if focused on references
    if (
      (pureRefConfig.enabled || moveSubTool === 'move_reference' || lastActiveUiContext === 'references') &&
      candidates.some((c) => c.kind === 'reference')
    ) {
      const refOnly = candidates.filter((c) => c.kind === 'reference');
      if (refOnly.length > 0) return refOnly;
    }

    return candidates;
  }, [
    currentFrameIndex,
    currentLayerIndex,
    selectedVectorPathId,
    selectedVectorNodeIds,
    selectedParametricShapeId,
    selectedHitboxId,
    selectedGuideId,
    showHitboxes,
    selection,
    activeReferenceId,
    editingMask,
    lastActiveUiContext,
    selectedLayerIndices,
    activeGroupId,
    selectedFrameIndices,
    symmetryConfig.enabled,
    showPivot,
    pureRefConfig.enabled,
    moveSubTool,
  ]);

  const executeSmartDeleteCandidate = useCallback(
    (cand: SmartDeleteCandidate) => {
      const activeF = framesRef.current[currentFrameIndex];
      const activeL = activeF?.layers[currentLayerIndex];

      switch (cand.kind) {
        case 'vector_nodes': {
          if (!selectedVectorPathId || !activeL?.vectorPaths) break;
          const delSet = new Set(selectedVectorNodeIds);
          const nextPaths = activeL.vectorPaths
            .map((p) =>
              p.id === selectedVectorPathId
                ? { ...p, nodes: p.nodes.filter((n) => !delSet.has(n.id)) }
                : p
            )
            .filter((p) => p.nodes.length >= 1);
          handleUpdateLayerVectorPaths(nextPaths);
          setSelectedVectorNodeIds([]);
          break;
        }
        case 'vector_path': {
          if (!selectedVectorPathId || !activeL?.vectorPaths) break;
          const nextPaths = activeL.vectorPaths.filter((p) => p.id !== selectedVectorPathId);
          handleUpdateLayerVectorPaths(nextPaths);
          setSelectedVectorPathId(null);
          setSelectedVectorNodeIds([]);
          break;
        }
        case 'parametric_shape': {
          if (!selectedParametricShapeId || !activeL?.parametricShapes) break;
          const nextShapes = activeL.parametricShapes.filter((s) => s.id !== selectedParametricShapeId);
          const updated = framesRef.current.map((f, fIdx) =>
            fIdx !== currentFrameIndex
              ? f
              : {
                  ...f,
                  layers: f.layers.map((l, lIdx) =>
                    lIdx === currentLayerIndex ? { ...l, parametricShapes: nextShapes } : l
                  ),
                }
          );
          framesRef.current = updated;
          setFrames(updated);
          setSelectedParametricShapeId(null);
          pushHistorySnapshot({ frames: updated });
          break;
        }
        case 'hitbox': {
          if (!selectedHitboxId || !activeF) break;
          handleUpdateHitboxes((activeF.hitboxes || []).filter((h) => h.id !== selectedHitboxId));
          setSelectedHitboxId(null);
          break;
        }
        case 'pixel_selection': {
          if (!selection || !selection.active || !activeL || activeL.locked) break;
          const minX = Math.max(0, Math.min(selection.startX, selection.endX));
          const maxX = Math.min(canvasWidth - 1, Math.max(selection.startX, selection.endX));
          const minY = Math.max(0, Math.min(selection.startY, selection.endY));
          const maxY = Math.min(canvasHeight - 1, Math.max(selection.startY, selection.endY));
          const cleared = activeL.pixels.map((r) => [...r]);
          for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
              if (!selection.mask || selection.mask[y]?.[x]) {
                cleared[y][x] = null;
              }
            }
          }
          handleUpdateLayerPixels(cleared, activeL.offCanvasPixels);
          break;
        }
        case 'reference': {
          if (!activeReferenceId) break;
          const nextRefs = referencesRef.current.filter((r) => r.id !== activeReferenceId);
          referencesRef.current = nextRefs;
          setReferences(nextRefs);
          setActiveReferenceId(null);
          pushHistorySnapshot({ references: nextRefs });
          break;
        }
        case 'layer_mask': {
          handleDeleteLayerMask(currentLayerIndex);
          break;
        }
        case 'layer_keyframe': {
          handleRemoveLayerKeyframe(currentLayerIndex, currentFrameIndex);
          break;
        }
        case 'camera_keyframe': {
          handleRemoveCameraKeyframe(currentFrameIndex);
          break;
        }
        case 'marker': {
          const targetM = timelineMarkersRef.current.find((m) => m.frameIndex === currentFrameIndex);
          if (targetM) {
            const nextMarkers = timelineMarkersRef.current.filter((m) => m.id !== targetM.id);
            timelineMarkersRef.current = nextMarkers;
            setTimelineMarkers(nextMarkers);
            pushHistorySnapshot({ timelineMarkers: nextMarkers });
          }
          break;
        }
        case 'adjustment_effect':
        case 'ai_element':
        case 'layer_single': {
          handleDeleteLayer(currentLayerIndex);
          break;
        }
        case 'layers_multi': {
          handleBatchDeleteLayers(selectedLayerIndices);
          break;
        }
        case 'layer_group': {
          if (activeGroupId) {
            handleDeleteLayerGroup(activeGroupId, false);
            setActiveGroupId(null);
          }
          break;
        }
        case 'frames_multi': {
          handleBatchDeleteFrames(selectedFrameIndices);
          break;
        }
        case 'frame_single': {
          handleDeleteFrame(currentFrameIndex);
          break;
        }
        case 'pose': {
          const targetPose = savedDummiePosesRef.current[0];
          if (targetPose) {
            const nextPoses = savedDummiePosesRef.current.filter((p) => p.id !== targetPose.id);
            savedDummiePosesRef.current = nextPoses;
            setSavedDummiePoses(nextPoses);
            pushHistorySnapshot({ savedDummiePoses: nextPoses });
          }
          break;
        }
        case 'asset': {
          const targetAsset = userLibraryItemsRef.current[0];
          if (targetAsset) {
            const nextAssets = userLibraryItemsRef.current.filter((a) => a.id !== targetAsset.id);
            userLibraryItemsRef.current = nextAssets;
            setUserLibraryItems(nextAssets);
            pushHistorySnapshot({ userLibraryItems: nextAssets });
          }
          break;
        }
        case 'guide': {
          if (selectedGuideId && guidesRef.current.some((g) => g.id === selectedGuideId)) {
            const nextGuides = guidesRef.current.filter((g) => g.id !== selectedGuideId);
            guidesRef.current = nextGuides;
            setGuides(nextGuides);
            setSelectedGuideId(null);
            pushHistorySnapshot({ guides: nextGuides });
          } else if (symmetryConfig.enabled) {
            const nextSym: SymmetryConfig = { ...symmetryConfig, enabled: false };
            symmetryConfigRef.current = nextSym;
            setSymmetryConfig(nextSym);
            setSymmetryEnabled(false);
            pushHistorySnapshot({ symmetryConfig: nextSym });
          } else {
            showPivotRef.current = false;
            setShowPivot(false);
            pushHistorySnapshot({ showPivot: false });
          }
          break;
        }
      }

      setSmartDeleteModalState(null);
      appendStudioLog(`Eliminado (${cand.label}) · Ctrl+Z para deshacer.`);
      setImportNotification(`Eliminado: ${cand.label} · Ctrl+Z para deshacer`);
      setTimeout(() => setImportNotification(null), 2600);
    },
    [
      currentFrameIndex,
      currentLayerIndex,
      selectedVectorPathId,
      selectedVectorNodeIds,
      selectedParametricShapeId,
      selectedHitboxId,
      selectedGuideId,
      selection,
      canvasWidth,
      canvasHeight,
      activeReferenceId,
      selectedLayerIndices,
      activeGroupId,
      selectedFrameIndices,
      symmetryConfig,
      handleUpdateLayerVectorPaths,
      handleUpdateHitboxes,
      handleUpdateLayerPixels,
      pushHistorySnapshot,
      handleDeleteLayerMask,
      handleRemoveCameraKeyframe,
      appendStudioLog,
    ]
  );

  const handleSmartDelete = useCallback(() => {
    const candidates = collectSmartDeleteCandidates();
    if (candidates.length === 0) {
      setImportNotification('No hay ningún elemento seleccionable activo para eliminar.');
      setTimeout(() => setImportNotification(null), 2000);
      return;
    }
    if (candidates.length === 1 && !candidates[0].requiresConfirmation) {
      executeSmartDeleteCandidate(candidates[0]);
      return;
    }
    setSmartDeleteModalState({ candidates });
  }, [collectSmartDeleteCandidates, executeSmartDeleteCandidate]);

  // =========================================================
  // LAYER & SELECTION CLIPBOARD (Copy / Cut / Paste / In-Place)
  // =========================================================
  const handleCopyLayerOrSelection = useCallback((): ClipboardData | null => {
    const f = frames[currentFrameIndex];
    const l = f?.layers[currentLayerIndex];
    if (!l) return null;

    if (selection && selection.active) {
      const minX = Math.max(0, Math.min(selection.startX, selection.endX));
      const maxX = Math.min(canvasWidth - 1, Math.max(selection.startX, selection.endX));
      const minY = Math.max(0, Math.min(selection.startY, selection.endY));
      const maxY = Math.min(canvasHeight - 1, Math.max(selection.startY, selection.endY));
      const w = maxX - minX + 1;
      const h = maxY - minY + 1;
      if (w > 0 && h > 0) {
        const sub: (string | null)[][] = [];
        for (let y = minY; y <= maxY; y++) {
          const row: (string | null)[] = [];
          for (let x = minX; x <= maxX; x++) {
            row.push(l.pixels[y]?.[x] ?? null);
          }
          sub.push(row);
        }
        const clip: ClipboardData = {
          kind: 'selection',
          sourceName: l.name,
          sourceFrameIndex: currentFrameIndex,
          originX: minX,
          originY: minY,
          width: w,
          height: h,
          pixels: sub,
        };
        setClipboard(clip);
        lastInternalCopySigRef.current = computePixelGridQuickSignature(sub, w, h);
        void writePixelGridToSystemClipboard(sub, w, h);
        setImportNotification(`Selección (${w}×${h}) copiada de "${l.name}" (Frame #${currentFrameIndex + 1})`);
        setTimeout(() => setImportNotification(null), 2500);
        return clip;
      }
    }

    const copiedPixels = l.pixels.map((r) => [...r]);
    const clip: ClipboardData = {
      kind: 'layer',
      sourceName: l.name,
      sourceFrameIndex: currentFrameIndex,
      originX: 0,
      originY: 0,
      width: canvasWidth,
      height: canvasHeight,
      pixels: copiedPixels,
    };
    setClipboard(clip);
    lastInternalCopySigRef.current = computePixelGridQuickSignature(copiedPixels, canvasWidth, canvasHeight);
    void writePixelGridToSystemClipboard(copiedPixels, canvasWidth, canvasHeight);
    setImportNotification(`Capa "${l.name}" copiada (Frame #${currentFrameIndex + 1})`);
    setTimeout(() => setImportNotification(null), 2500);
    return clip;
  }, [frames, currentFrameIndex, currentLayerIndex, selection, canvasWidth, canvasHeight]);

  const handleCutLayerOrSelection = useCallback(() => {
    const f = frames[currentFrameIndex];
    const l = f?.layers[currentLayerIndex];
    if (!l) return;
    if (l.locked) {
      setImportNotification('La capa activa está bloqueada.');
      setTimeout(() => setImportNotification(null), 2500);
      return;
    }
    const copied = handleCopyLayerOrSelection();
    if (!copied) return;

    if (copied.kind === 'selection') {
      const nextGrid = l.pixels.map((r) => [...r]);
      for (let dy = 0; dy < copied.height; dy++) {
        for (let dx = 0; dx < copied.width; dx++) {
          const y = copied.originY + dy;
          const x = copied.originX + dx;
          if (y >= 0 && y < canvasHeight && x >= 0 && x < canvasWidth) {
            nextGrid[y][x] = null;
          }
        }
      }
      handleUpdateLayerPixels(nextGrid);
      setImportNotification(`Selección cortada de "${l.name}"`);
    } else {
      handleUpdateLayerPixels(createEmptyGrid(canvasWidth, canvasHeight));
      setImportNotification(`Capa "${l.name}" cortada al portapapeles`);
    }
    setTimeout(() => setImportNotification(null), 2500);
  }, [frames, currentFrameIndex, currentLayerIndex, handleCopyLayerOrSelection, canvasWidth, canvasHeight, handleUpdateLayerPixels]);

  const handlePasteClipboard = useCallback(
    (inPlace: boolean = false, _asNewLayer: boolean = false) => {
      if (!clipboard) {
        setImportNotification('El portapapeles está vacío. Usa Copiar primero.');
        setTimeout(() => setImportNotification(null), 2500);
        return;
      }

      const targetX = inPlace
        ? clipboard.originX
        : clipboard.kind === 'layer'
        ? 0
        : Math.max(0, Math.floor((canvasWidth - clipboard.width) / 2));
      const targetY = inPlace
        ? clipboard.originY
        : clipboard.kind === 'layer'
        ? 0
        : Math.max(0, Math.floor((canvasHeight - clipboard.height) / 2));

      const f = frames[currentFrameIndex];
      const activeL = f?.layers[currentLayerIndex];
      // GLOBAL SAFETY RULE: Paste ALWAYS creates a brand-new independent layer inside the active folder/group
      const targetGroupId = activeL?.groupId ?? activeGroupId ?? null;

      const updated = framesRef.current.map((fr, fIdx) => {
        if (fIdx !== currentFrameIndex) return fr;
        const newGrid = createEmptyGrid(canvasWidth, canvasHeight);
        for (let dy = 0; dy < clipboard.height; dy++) {
          for (let dx = 0; dx < clipboard.width; dx++) {
            const col = clipboard.pixels[dy]?.[dx];
            const nx = targetX + dx;
            const ny = targetY + dy;
            if (col && nx >= 0 && nx < canvasWidth && ny >= 0 && ny < canvasHeight) {
              newGrid[ny][nx] = col;
            }
          }
        }
          const pastedLayer: Layer = {
            id: `layer-paste-${Date.now()}`,
            name: `${clipboard.sourceName} (Pegado)`,
            visible: true,
            locked: false,
            opacity: 1,
            fillOpacity: 1,
            blendMode: 'normal',
            groupId: targetGroupId,
            pixels: newGrid,
          };
          return { ...fr, layers: [...fr.layers, pastedLayer] };
        });
      framesRef.current = updated;
      setFrames(updated);
      const nextLayerIdx = f ? f.layers.length : currentLayerIndex;
      if (f) {
        currentLayerIndexRef.current = nextLayerIdx;
        setCurrentLayerIndex(nextLayerIdx);
        setSelectedLayerIndices([nextLayerIdx]);
      }
      pushHistorySnapshot({ frames: updated, currentLayerIndex: nextLayerIdx });

      setImportNotification(
        inPlace
          ? `Pegado en nueva capa segura en sitio (${targetX}, ${targetY}) · Frame #${currentFrameIndex + 1}`
          : `Pegado en nueva capa segura · Frame #${currentFrameIndex + 1}`
      );
      setTimeout(() => setImportNotification(null), 2500);
    },
    [clipboard, frames, currentFrameIndex, currentLayerIndex, activeGroupId, canvasWidth, canvasHeight, pushHistorySnapshot]
  );

  // System 6: Multi-frame Layer & Group Duplication
  const handleDuplicateLayerToNextFrame = useCallback(
    (layerIdx: number) => {
      const prevFrames = framesRef.current;
      const src = prevFrames[currentFrameIndex]?.layers[layerIdx];
      if (!src) return;
      const nextIdx = (currentFrameIndex + 1) % prevFrames.length;
      const updated = prevFrames.map((f, idx) => {
        if (idx !== nextIdx) return f;
        const clone: Layer = {
          ...JSON.parse(JSON.stringify(src)),
          id: `layer-dup-next-${Date.now()}`,
          isGlobal: false,
        };
        return { ...f, layers: [...f.layers, clone] };
      });
      framesRef.current = updated;
      setFrames(updated);
      pushHistorySnapshot({ frames: updated });
      setImportNotification(`"${src.name}" duplicada al Frame #${nextIdx + 1}.`);
      setTimeout(() => setImportNotification(null), 2500);
    },
    [currentFrameIndex, pushHistorySnapshot]
  );

  const handleDuplicateLayerToSelectedFrames = useCallback(
    (layerIdx: number) => {
      const prevFrames = framesRef.current;
      const src = prevFrames[currentFrameIndex]?.layers[layerIdx];
      if (!src) return;
      const targets = new Set(
        selectedFrameIndices.length > 0 ? selectedFrameIndices : [currentFrameIndex]
      );
      const updated = prevFrames.map((f, idx) => {
        if (!targets.has(idx) || idx === currentFrameIndex) return f;
        const clone: Layer = {
          ...JSON.parse(JSON.stringify(src)),
          id: `layer-dup-sel-${Date.now()}-${idx}`,
          isGlobal: false,
        };
        return { ...f, layers: [...f.layers, clone] };
      });
      framesRef.current = updated;
      setFrames(updated);
      pushHistorySnapshot({ frames: updated });
      setImportNotification(`"${src.name}" duplicada a ${targets.size} fotograma(s).`);
      setTimeout(() => setImportNotification(null), 2500);
    },
    [currentFrameIndex, selectedFrameIndices, pushHistorySnapshot]
  );

  const handleDuplicateLayerToAllFrames = useCallback(
    (layerIdx: number) => {
      const prevFrames = framesRef.current;
      const src = prevFrames[currentFrameIndex]?.layers[layerIdx];
      if (!src) return;
      const updated = prevFrames.map((f, idx) => {
        if (idx === currentFrameIndex) return f;
        const clone: Layer = {
          ...JSON.parse(JSON.stringify(src)),
          id: `layer-dup-all-${Date.now()}-${idx}`,
          isGlobal: false,
        };
        return { ...f, layers: [...f.layers, clone] };
      });
      framesRef.current = updated;
      setFrames(updated);
      pushHistorySnapshot({ frames: updated });
      setImportNotification(`"${src.name}" replicada en los ${prevFrames.length} fotogramas.`);
      setTimeout(() => setImportNotification(null), 2500);
    },
    [currentFrameIndex, pushHistorySnapshot]
  );

  const handleDuplicateGroupToAllFrames = useCallback(
    (groupId: string) => {
      const prevFrames = framesRef.current;
      const srcLayers = prevFrames[currentFrameIndex]?.layers.filter((l) => l.groupId === groupId) || [];
      if (srcLayers.length === 0) return;
      const updated = prevFrames.map((f, idx) => {
        if (idx === currentFrameIndex) return f;
        const clones: Layer[] = srcLayers.map((l, j) => ({
          ...JSON.parse(JSON.stringify(l)),
          id: `layer-grp-all-${Date.now()}-${idx}-${j}`,
          isGlobal: false,
        }));
        return { ...f, layers: [...f.layers, ...clones] };
      });
      framesRef.current = updated;
      setFrames(updated);
      pushHistorySnapshot({ frames: updated });
      setImportNotification(`Carpeta (${srcLayers.length} capas) duplicada en todos los fotogramas.`);
      setTimeout(() => setImportNotification(null), 2500);
    },
    [currentFrameIndex, pushHistorySnapshot]
  );

  // System 5: Apply Intelligent 2D Pose Dummie Non-Destructive Result
  const handleApplyDummiePoseResult = useCallback(
    (resultGrid: (string | null)[][], config: DummieApplyConfig) => {
      const prevFrames = framesRef.current;
      const targetFramesSet = new Set<number>();
      if (config.frameScope === 'current_frame') {
        targetFramesSet.add(currentFrameIndex);
      } else if (config.frameScope === 'specific_frame') {
        targetFramesSet.add(Math.max(0, Math.min(prevFrames.length - 1, config.specificFrameIndex)));
      } else if (config.frameScope === 'multiple_frames') {
        const sel = config.selectedFrameIndices.length > 0 ? config.selectedFrameIndices : [currentFrameIndex];
        sel.forEach((i) => targetFramesSet.add(i));
      } else if (config.frameScope === 'all_frames') {
        prevFrames.forEach((_, i) => targetFramesSet.add(i));
      }

      const activeGrp = currentLayer?.groupId ?? activeGroupId ?? null;

      let nextFrames = prevFrames.map((f, fIdx) => {
        if (!targetFramesSet.has(fIdx)) return f;
        const newLayer: Layer = {
          id: `layer-pose-${Date.now()}-${fIdx}`,
          name: config.layerBaseName || `Pose ${dummiePose.name}`,
          visible: true,
          locked: false,
          opacity: 1,
          fillOpacity: 1,
          blendMode: 'normal',
          layerType: config.useAiRetarget ? 'ai' : 'raster',
          groupId: activeGrp,
          pixels: resultGrid.map((r) => [...r]),
          keyframes: config.markAsKeyframes
            ? [{ frameIndex: fIdx, offsetX: 0, offsetY: 0, scale: 1, opacity: 1, easing: 'ease-in-out', note: `Pose: ${dummiePose.name}` }]
            : undefined,
        };
        return { ...f, layers: [...f.layers, newLayer] };
      });

      if (config.generateInBetweens && config.inBetweenCount > 0) {
        const neutralPose = applyPresetToDummiePose(dummiePose.rigType, 'idle');
        const sourceBaseGrid = currentLayer?.pixels || resultGrid;
        const extraFrames: Frame[] = [];
        for (let k = 1; k <= config.inBetweenCount; k++) {
          const t = k / (config.inBetweenCount + 1);
          const tweenPose = interpolateDummiePoses(neutralPose, dummiePose, t);
          const tweenGrid = retargetSpriteGridToPose(
            sourceBaseGrid,
            tweenPose,
            canvasWidth,
            canvasHeight,
            (config.aiAdaptationIntensity || 85) / 100,
            config.pixelPerfectOutlines,
            config.poseFidelity || 'high'
          );
          extraFrames.push({
            id: `frame-pose-tween-${Date.now()}-${k}`,
            name: `${dummiePose.name} Tween ${k}`,
            durationTicks: 4,
            durationMs: 66,
            phase: 'neutral',
            hitboxes: [],
            layers: [
              {
                id: `layer-pose-tween-${Date.now()}-${k}`,
                name: `${config.layerBaseName} (${Math.round(t * 100)}%)`,
                visible: true,
                locked: false,
                opacity: 1,
                fillOpacity: 1,
                blendMode: 'normal',
                groupId: activeGrp,
                pixels: tweenGrid,
              },
            ],
          });
        }
        nextFrames = [
          ...nextFrames.slice(0, currentFrameIndex + 1),
          ...extraFrames,
          ...nextFrames.slice(currentFrameIndex + 1),
        ];
      }

      framesRef.current = nextFrames;
      setFrames(nextFrames);
      pushHistorySnapshot({ frames: nextFrames });

      setImportNotification(
        `¡Pose "${dummiePose.name}" aplicada como nueva capa independiente sin alterar las originales!`
      );
      setTimeout(() => setImportNotification(null), 3500);
    },
    [
      currentFrameIndex,
      currentLayer,
      activeGroupId,
      dummiePose,
      canvasWidth,
      canvasHeight,
      pushHistorySnapshot,
    ]
  );

  // =========================================================
  // FILTERS & NON-DESTRUCTIVE ADJUSTMENT LAYERS
  // =========================================================
  const handleApplyDirectAdjustment = useCallback(
    (cfg: LayerAdjustmentConfig, intensity01: number = 1) => {
      if (!currentLayer || currentLayer.locked || currentLayer.layerType === 'adjustment') return;
      const adjusted = applyAdjustmentToGrid(currentLayer.pixels, cfg, intensity01);
      setLiveCanvasPreview(null);
      handleUpdateLayerPixels(adjusted);
      setImportNotification(`Ajuste aplicado directamente a "${currentLayer.name}"`);
      setTimeout(() => setImportNotification(null), 2500);
    },
    [currentLayer, handleUpdateLayerPixels]
  );

  const handleCreateAdjustmentLayer = useCallback(
    (cfg: LayerAdjustmentConfig, name: string = 'Ajuste Color') => {
      const nextIdx = framesRef.current[currentFrameIndex]?.layers.length || 0;
      const newLayer: Layer = {
        id: `layer-adj-${Date.now()}`,
        name,
        visible: true,
        locked: false,
        opacity: 1,
        pixels: createEmptyGrid(canvasWidth, canvasHeight),
        layerType: 'adjustment',
        adjustment: { ...cfg },
      };
      const updated = framesRef.current.map((f, fIdx) =>
        fIdx === currentFrameIndex ? { ...f, layers: [...f.layers, newLayer] } : f
      );
      framesRef.current = updated;
      currentLayerIndexRef.current = nextIdx;
      setFrames(updated);
      setCurrentLayerIndex(nextIdx);
      pushHistorySnapshot({ frames: updated, currentLayerIndex: nextIdx });
      setImportNotification(`Capa de ajuste "${name}" creada (no destructiva)`);
      setTimeout(() => setImportNotification(null), 2500);
    },
    [canvasWidth, canvasHeight, currentFrameIndex, pushHistorySnapshot]
  );

  const handleUpdateAdjustmentLayer = useCallback(
    (cfg: LayerAdjustmentConfig) => {
      setFrames((prev) =>
        prev.map((f, fIdx) => {
          if (fIdx !== currentFrameIndex) return f;
          return {
            ...f,
            layers: f.layers.map((l, lIdx) =>
              lIdx === currentLayerIndex && l.layerType === 'adjustment'
                ? { ...l, adjustment: { ...cfg } }
                : l
            ),
          };
        })
      );
    },
    [currentFrameIndex, currentLayerIndex]
  );

  const handleBakeAdjustmentLayer = useCallback(() => {
    if (!currentLayer || currentLayer.layerType !== 'adjustment' || !currentLayer.adjustment) return;
    const adjCfg = currentLayer.adjustment;
    const updated = framesRef.current.map((f, fIdx) => {
      if (fIdx !== currentFrameIndex) return f;
      const nextLayers = f.layers
        .map((l, lIdx) => {
          if (lIdx < currentLayerIndex && l.layerType !== 'adjustment' && l.visible && !l.locked) {
            return { ...l, pixels: applyAdjustmentToGrid(l.pixels, adjCfg) };
          }
          return l;
        })
        .filter((_, lIdx) => lIdx !== currentLayerIndex);
      return {
        ...f,
        layers:
          nextLayers.length > 0
            ? nextLayers
            : [
                {
                  id: `layer-${Date.now()}`,
                  name: 'Capa 1',
                  visible: true,
                  locked: false,
                  opacity: 1,
                  pixels: createEmptyGrid(canvasWidth, canvasHeight),
                },
              ],
      };
    });
    const nextIdx = Math.max(0, currentLayerIndex - 1);
    framesRef.current = updated;
    currentLayerIndexRef.current = nextIdx;
    setFrames(updated);
    setCurrentLayerIndex(nextIdx);
    pushHistorySnapshot({ frames: updated, currentLayerIndex: nextIdx });
    setImportNotification('Capa de ajuste fusionada sobre las capas inferiores.');
    setTimeout(() => setImportNotification(null), 3000);
  }, [currentLayer, currentFrameIndex, currentLayerIndex, canvasWidth, canvasHeight, pushHistorySnapshot]);

  const handleApplyQuickFilter = useCallback(
    (filterId: FilterGalleryPresetId, intensity01: number = 1) => {
      if (!currentLayer || currentLayer.locked || currentLayer.layerType === 'adjustment') return;
      const nextGrid = applyGalleryFilterToGrid(currentLayer.pixels, filterId, intensity01, primaryColor);
      setLiveCanvasPreview(null);
      setActiveFilterSession(null);
      handleUpdateLayerPixels(nextGrid);
      setImportNotification(`Filtro "${filterId}" aplicado a "${currentLayer.name}"`);
      setTimeout(() => setImportNotification(null), 2500);
    },
    [currentLayer, primaryColor, handleUpdateLayerPixels]
  );

  // Contextual Filter Quick Session (Live preview + Antes/Después + Confirmar/Cancelar/Restablecer)
  const startFilterQuickSession = useCallback(
    (filterId: FilterGalleryPresetId, label?: string, defaultIntensity: number = 85) => {
      if (!currentLayer || currentLayer.locked || currentLayer.layerType === 'adjustment') return;
      const preset = FILTER_GALLERY_PRESETS.find((f) => f.id === filterId);
      setActiveFilterSession({
        filterId,
        name: label || preset?.name || filterId,
        intensity: defaultIntensity,
        previewEnabled: true,
        beforeAfterSplit: false,
        splitPct: 50,
      });
    },
    [currentLayer]
  );

  useEffect(() => {
    if (!activeFilterSession || !currentLayer || currentLayer.layerType === 'adjustment') {
      return;
    }
    if (!activeFilterSession.previewEnabled) {
      setLiveCanvasPreview(null);
      return;
    }
    const previewGrid = applyGalleryFilterToGrid(
      currentLayer.pixels,
      activeFilterSession.filterId as FilterGalleryPresetId,
      Math.max(0, Math.min(1, activeFilterSession.intensity / 100)),
      primaryColor
    );
    setLiveCanvasPreview({
      layerId: currentLayer.id,
      grid: previewGrid,
      beforeAfterSplit: activeFilterSession.beforeAfterSplit
        ? activeFilterSession.splitPct / 100
        : null,
    });
  }, [activeFilterSession, currentLayer, primaryColor]);

  const handleConfirmFilterSession = useCallback(() => {
    if (!activeFilterSession) return;
    handleApplyQuickFilter(
      activeFilterSession.filterId as FilterGalleryPresetId,
      Math.max(0, Math.min(1, activeFilterSession.intensity / 100))
    );
  }, [activeFilterSession, handleApplyQuickFilter]);

  const handleCancelFilterSession = useCallback(() => {
    setActiveFilterSession(null);
    setLiveCanvasPreview(null);
  }, []);

  const handleResetFilterSession = useCallback(() => {
    setActiveFilterSession((prev) =>
      prev ? { ...prev, intensity: 85, previewEnabled: true, beforeAfterSplit: false, splitPct: 50 } : null
    );
  }, []);

  // =========================================================
  // PARAMETRIC INTERACTIVE SHAPES & CONTEXTUAL TOOL ACTIONS
  // =========================================================
  const selectedParametricShape = useMemo<ParametricShapeObject | null>(() => {
    if (!selectedParametricShapeId || !currentLayer?.parametricShapes?.length) return null;
    return currentLayer.parametricShapes.find((s) => s.id === selectedParametricShapeId) || null;
  }, [selectedParametricShapeId, currentLayer]);

  const handleUpdateLayerParametricShapes = useCallback(
    (nextShapes: ParametricShapeObject[]) => {
      const updated = framesRef.current.map((f, fIdx) =>
        fIdx !== currentFrameIndex
          ? f
          : {
              ...f,
              layers: f.layers.map((l, lIdx) =>
                lIdx === currentLayerIndex ? { ...l, parametricShapes: nextShapes } : l
              ),
            }
      );
      framesRef.current = updated;
      setFrames(updated);
      pushHistorySnapshot({ frames: updated });
    },
    [currentFrameIndex, currentLayerIndex, pushHistorySnapshot]
  );

  const handleUpdateSelectedShape = useCallback(
    (patch: Partial<ParametricShapeObject>) => {
      if (!selectedParametricShapeId || !currentLayer?.parametricShapes?.length) return;
      let patchedObj: ParametricShapeObject | null = null;
      const nextShapes = currentLayer.parametricShapes.map((s) => {
        if (s.id !== selectedParametricShapeId) return s;
        patchedObj = { ...s, ...patch };
        return patchedObj;
      });
      handleUpdateLayerParametricShapes(nextShapes);
      if (patchedObj) {
        setShapeConfig((prev) => syncShapeConfigFromObject(prev, patchedObj!));
      }
    },
    [selectedParametricShapeId, currentLayer, handleUpdateLayerParametricShapes]
  );

  const handleRasterizeParametricShape = useCallback(
    (shapeId: string) => {
      const activeF = framesRef.current[currentFrameIndex];
      const activeL = activeF?.layers[currentLayerIndex];
      if (!activeL?.parametricShapes?.length) return;
      const target = activeL.parametricShapes.find((s) => s.id === shapeId);
      if (!target) return;
      const nextPixels = activeL.pixels.map((r) => [...r]);
      rasterizeParametricShapeToGrid(
        target,
        nextPixels,
        activeL.pixels,
        ditherConfig,
        gradientConfig,
        activePaletteColors
      );
      const remaining = activeL.parametricShapes.filter((s) => s.id !== shapeId);
      const updated = framesRef.current.map((f, fIdx) =>
        fIdx !== currentFrameIndex
          ? f
          : {
              ...f,
              layers: f.layers.map((l, lIdx) =>
                lIdx === currentLayerIndex
                  ? { ...l, pixels: nextPixels, parametricShapes: remaining }
                  : l
              ),
            }
      );
      framesRef.current = updated;
      setFrames(updated);
      if (selectedParametricShapeId === shapeId) setSelectedParametricShapeId(null);
      pushHistorySnapshot({ frames: updated });
      setImportNotification(`${SHAPE_KIND_LABELS[target.kind]} convertida en píxeles en "${activeL.name}"`);
      setTimeout(() => setImportNotification(null), 2400);
    },
    [
      currentFrameIndex,
      currentLayerIndex,
      ditherConfig,
      gradientConfig,
      activePaletteColors,
      selectedParametricShapeId,
      pushHistorySnapshot,
    ]
  );

  const handleDeleteSelectedShape = useCallback(() => {
    if (!selectedParametricShapeId || !currentLayer?.parametricShapes?.length) return;
    const nextShapes = currentLayer.parametricShapes.filter((s) => s.id !== selectedParametricShapeId);
    handleUpdateLayerParametricShapes(nextShapes);
    setSelectedParametricShapeId(null);
  }, [selectedParametricShapeId, currentLayer, handleUpdateLayerParametricShapes]);

  const handleMorphSelection = useCallback(
    (deltaPx: number) => {
      if (!selection || !selection.active) return;
      const morphed = morphSelectionMask(selection, canvasWidth, canvasHeight, deltaPx);
      setSelection(morphed);
    },
    [selection, canvasWidth, canvasHeight]
  );

  const handleToolOptionsVectorNodeAction = useCallback(
    (
      action:
        | 'add_node'
        | 'delete_node'
        | 'convert_corner'
        | 'convert_smooth'
        | 'convert_symmetric'
        | 'break_tangents'
        | 'join_tangents'
    ) => {
      if (!currentLayer?.vectorPaths?.length || !selectedVectorPathId) return;
      const paths = currentLayer.vectorPaths;
      const target = paths.find((p) => p.id === selectedVectorPathId);
      if (!target) return;

      if (action === 'add_node') {
        if (target.nodes.length < 2) return;
        const selIdx = target.nodes.findIndex((n) => selectedVectorNodeIds.includes(n.id));
        const idxA = selIdx >= 0 && selIdx < target.nodes.length - 1 ? selIdx : 0;
        const a = target.nodes[idxA];
        const b = target.nodes[idxA + 1];
        const midNode = {
          id: `vnode-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          x: Math.round(((a.x + b.x) / 2) * 10) / 10,
          y: Math.round(((a.y + b.y) / 2) * 10) / 10,
          nodeType: 'smooth' as const,
        };
        const nextNodes = [...target.nodes];
        nextNodes.splice(idxA + 1, 0, midNode);
        handleUpdateLayerVectorPaths(
          paths.map((p) => (p.id === target.id ? { ...p, nodes: nextNodes } : p))
        );
        setSelectedVectorNodeIds([midNode.id]);
        return;
      }

      if (action === 'delete_node') {
        if (selectedVectorNodeIds.length === 0) return;
        const delSet = new Set(selectedVectorNodeIds);
        const nextPaths = paths
          .map((p) =>
            p.id === target.id ? { ...p, nodes: p.nodes.filter((n) => !delSet.has(n.id)) } : p
          )
          .filter((p) => p.nodes.length >= 1);
        handleUpdateLayerVectorPaths(nextPaths);
        setSelectedVectorNodeIds([]);
        return;
      }

      const mapAction: Record<
        'convert_corner' | 'convert_smooth' | 'convert_symmetric' | 'break_tangents' | 'join_tangents',
        'node_corner' | 'node_smooth' | 'node_symmetric' | 'break_handles' | 'restore_handles'
      > = {
        convert_corner: 'node_corner',
        convert_smooth: 'node_smooth',
        convert_symmetric: 'node_symmetric',
        break_tangents: 'break_handles',
        join_tangents: 'restore_handles',
      };
      handleVectorSelectionAction(mapAction[action]);
    },
    [
      currentLayer,
      selectedVectorPathId,
      selectedVectorNodeIds,
      handleUpdateLayerVectorPaths,
      handleVectorSelectionAction,
    ]
  );

  // =========================================================
  // TEXT TOOL LAYER CREATION & GENERATED GRID INSERTION
  // =========================================================
  const handleCreateTextLayer = useCallback(
    (name: string, pixels: (string | null)[][]) => {
      const nextIdx = framesRef.current[currentFrameIndex]?.layers.length || 0;
      const newLayer: Layer = {
        id: `layer-txt-${Date.now()}`,
        name,
        visible: true,
        locked: false,
        opacity: 1,
        layerType: 'text',
        pixels,
      };
      const updated = framesRef.current.map((f, fIdx) =>
        fIdx === currentFrameIndex ? { ...f, layers: [...f.layers, newLayer] } : f
      );
      framesRef.current = updated;
      currentLayerIndexRef.current = nextIdx;
      setFrames(updated);
      setCurrentLayerIndex(nextIdx);
      pushHistorySnapshot({ frames: updated, currentLayerIndex: nextIdx });
      setImportNotification(`Texto añadido como "${name}"`);
      setTimeout(() => setImportNotification(null), 2500);
    },
    [currentFrameIndex, pushHistorySnapshot]
  );

  const handleInsertGeneratedGrid = useCallback(
    (
      grid: (string | null)[][],
      _mode: 'current_layer' | 'new_layer',
      name: string,
      groupName?: string,
      groupColor?: string,
      insertAtBottom: boolean = false,
      dropX?: number,
      dropY?: number
    ) => {
      const fitted = createEmptyGrid(canvasWidth, canvasHeight);
      const gh = grid.length;
      const gw = grid[0]?.length || 0;
      const offsetX =
        dropX !== undefined ? Math.round(dropX - gw / 2) : Math.floor((canvasWidth - gw) / 2);
      const offsetY =
        dropY !== undefined ? Math.round(dropY - gh / 2) : Math.floor((canvasHeight - gh) / 2);
      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          const col = grid[y]?.[x];
          const nx = x + offsetX;
          const ny = y + offsetY;
          if (col && nx >= 0 && nx < canvasWidth && ny >= 0 && ny < canvasHeight) {
            fitted[ny][nx] = col;
          }
        }
      }

      if (dropX === undefined && dropY === undefined && groupName) {
        if (autoApplyAiAllFrames) {
          applyAiInsertConfig(
            {
              destination: 'all_frames',
              rangeStart: 1,
              rangeEnd: frames.length,
              selectedFrameIndices,
              layerName: name,
              wrapInGroup: Boolean(groupName),
              groupName,
              groupColor,
              insertAtBottom,
            },
            [fitted]
          );
          return;
        }
        setPendingAiInsert({
          title: `Destino para "${name}"`,
          defaultLayerName: name,
          sequenceGrids: [fitted],
          groupName,
          groupColor,
          insertAtBottom,
        });
        return;
      }

      const targetGroupId: string | null = activeGroupId ?? currentLayer?.groupId ?? null;
      const newLayer: Layer = {
        id: `layer-gen-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        name,
        visible: true,
        locked: false,
        opacity: 1,
        fillOpacity: 1,
        blendMode: 'normal',
        pixels: fitted,
        groupId: targetGroupId,
        colorTag: insertAtBottom ? '#10b981' : undefined,
      };
      const curFrameLen = framesRef.current[currentFrameIndex]?.layers.length || 0;
      const updated = framesRef.current.map((f, fIdx) =>
        fIdx === currentFrameIndex
          ? {
              ...f,
              layers: insertAtBottom ? [newLayer, ...f.layers] : [...f.layers, newLayer],
            }
          : f
      );
      const nextIdx = insertAtBottom ? 0 : curFrameLen;
      framesRef.current = updated;
      currentLayerIndexRef.current = nextIdx;
      setFrames(updated);
      setCurrentLayerIndex(nextIdx);
      setSelectedLayerIndices([nextIdx]);
      pushHistorySnapshot({ frames: updated, currentLayerIndex: nextIdx });
      setImportNotification(`"${name}" añadido como nueva capa independiente (sin sobrescribir).`);
      setTimeout(() => setImportNotification(null), 3000);
    },
    [
      canvasWidth,
      canvasHeight,
      autoApplyAiAllFrames,
      applyAiInsertConfig,
      frames.length,
      selectedFrameIndices,
      activeGroupId,
      currentLayer?.groupId,
      currentFrameIndex,
      pushHistorySnapshot,
    ]
  );

  // =========================================================
  // ASSET BROWSER, PC UPLOAD, CANVAS DROP & REFERENCES SYSTEM
  // =========================================================
  const handleCreateAssetFolder = useCallback((folderName: string) => {
    const clean = folderName.trim();
    if (!clean) return;
    setAssetFolders((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
  }, []);

  const handleInsertLibraryItem = useCallback(
    (item: AssetLibraryItem, mode: 'stamp' | 'new_layer', dropX?: number, dropY?: number) => {
      if (item.category === 'sounds' && item.mediaDataUrl) {
        const audio = new Audio(item.mediaDataUrl);
        audio.play().catch(() => {});
        setImportNotification(`Reproduciendo audio "${item.name}".`);
        setTimeout(() => setImportNotification(null), 2000);
        return;
      }
      const insertAtBottom = item.category === 'stage';
      handleInsertGeneratedGrid(
        item.pixels,
        mode === 'stamp' ? 'current_layer' : 'new_layer',
        item.name,
        undefined,
        undefined,
        insertAtBottom,
        dropX,
        dropY
      );
    },
    [handleInsertGeneratedGrid]
  );

  const handleDropLibraryAssetAt = useCallback(
    (item: AssetLibraryItem, x: number, y: number) => {
      handleInsertLibraryItem(item, 'new_layer', x, y);
    },
    [handleInsertLibraryItem]
  );

  const handleSaveGridToLibrary = useCallback(
    (
      name: string,
      grid: (string | null)[][],
      width: number,
      height: number,
      category: AssetCategory = 'vfx',
      origin: 'ai' | 'user' = 'user',
      folder: string = 'General',
      tags: string[] = []
    ) => {
      const paletteSet = new Set<string>();
      for (const r of grid) {
        for (const c of r) if (c) paletteSet.add(c);
      }
      const newItem: AssetLibraryItem = {
        id: `lib-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        category,
        origin,
        folder,
        tags,
        favorite: false,
        width,
        height,
        pixels: grid.map((r) => [...r]),
        createdAt: new Date().toLocaleDateString('es-ES'),
        metadata: {
          author: origin === 'ai' ? 'IA PixelClash' : 'Usuario',
          createdAt: new Date().toLocaleDateString('es-ES'),
          palette: [...paletteSet].slice(0, 12),
          resolution: `${width}×${height}`,
          sourceProject: projectName,
        },
      };
      setUserLibraryItems((prev) => [newItem, ...prev]);
      setImportNotification(`"${name}" guardado en Asset Browser.`);
      setTimeout(() => setImportNotification(null), 3000);
    },
    [projectName]
  );

  const handleSaveCurrentLayerToLibrary = useCallback(
    (name: string, category: AssetCategory, folder: string = 'Personajes / Propios', tags: string[] = []) => {
      if (!currentLayer) return;
      let minX = canvasWidth;
      let minY = canvasHeight;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < canvasHeight; y++) {
        for (let x = 0; x < canvasWidth; x++) {
          if (currentLayer.pixels[y]?.[x]) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX < minX || maxY < minY) {
        handleSaveGridToLibrary(name, currentLayer.pixels, canvasWidth, canvasHeight, category, 'user', folder, tags);
        return;
      }
      const w = maxX - minX + 1;
      const h = maxY - minY + 1;
      const cropped: (string | null)[][] = [];
      for (let y = minY; y <= maxY; y++) {
        const row: (string | null)[] = [];
        for (let x = minX; x <= maxX; x++) {
          row.push(currentLayer.pixels[y]?.[x] ?? null);
        }
        cropped.push(row);
      }
      handleSaveGridToLibrary(name, cropped, w, h, category, 'user', folder, tags);
    },
    [currentLayer, canvasWidth, canvasHeight, handleSaveGridToLibrary]
  );

  const handleSaveSelectionToLibrary = useCallback(
    (name: string, category: AssetCategory, folder: string = 'General', tags: string[] = []) => {
      if (!currentLayer || !selection || !selection.active) return;
      const minX = Math.max(0, Math.min(selection.startX, selection.endX));
      const maxX = Math.min(canvasWidth - 1, Math.max(selection.startX, selection.endX));
      const minY = Math.max(0, Math.min(selection.startY, selection.endY));
      const maxY = Math.min(canvasHeight - 1, Math.max(selection.startY, selection.endY));
      const w = maxX - minX + 1;
      const h = maxY - minY + 1;
      if (w <= 0 || h <= 0) return;
      const cropped: (string | null)[][] = [];
      for (let y = minY; y <= maxY; y++) {
        const row: (string | null)[] = [];
        for (let x = minX; x <= maxX; x++) {
          row.push(currentLayer.pixels[y]?.[x] ?? null);
        }
        cropped.push(row);
      }
      handleSaveGridToLibrary(name, cropped, w, h, category, 'user', folder, tags);
    },
    [currentLayer, selection, canvasWidth, canvasHeight, handleSaveGridToLibrary]
  );

  const handleAddAiLibraryItem = useCallback((item: AssetLibraryItem) => {
    setUserLibraryItems((prev) => [item, ...prev]);
    setImportNotification(`Elemento IA "${item.name}" guardado en tu librería.`);
    setTimeout(() => setImportNotification(null), 3000);
  }, []);

  const handleAddUploadedLibraryItem = useCallback((item: AssetLibraryItem) => {
    setUserLibraryItems((prev) => [item, ...prev]);
    setImportNotification(`Archivo propio "${item.name}" importado al Asset Browser.`);
    setTimeout(() => setImportNotification(null), 3000);
  }, []);

  const handleUpdateLibraryItem = useCallback((id: string, patch: Partial<AssetLibraryItem>) => {
    setUserLibraryItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const handleDeleteLibraryItem = useCallback(
    (id: string) => {
      const nextAssets = userLibraryItemsRef.current.filter((item) => item.id !== id);
      userLibraryItemsRef.current = nextAssets;
      setUserLibraryItems(nextAssets);
      pushHistorySnapshot({ userLibraryItems: nextAssets });
    },
    [pushHistorySnapshot]
  );

  // References Panel Handlers
  const handleAddReferencesFromFiles = useCallback(
    (files: FileList | File[], groupId: string | null = null) => {
      const list = Array.from(files).filter((f) =>
        /\.(png|jpe?g|webp|gif)$/i.test(f.name) || f.type.startsWith('image/')
      );
      if (list.length === 0) return;
      list.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = typeof reader.result === 'string' ? reader.result : '';
          if (!dataUrl) return;
          const img = new Image();
          img.onload = () => {
            const newRef: ReferenceItem = {
              id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: file.name.replace(/\.[^.]+$/, ''),
              dataUrl,
              naturalWidth: img.naturalWidth || 64,
              naturalHeight: img.naturalHeight || 64,
              groupId,
              visible: true,
              locked: true, // Non-editable by default
              opacity: 0.7,
              blendMode: 'normal',
              scale: 1,
              rotation: 0,
              flipX: false,
              flipY: false,
              x: 0,
              y: 0,
              anchor: 'canvas',
              useAsAiGuide: false,
            };
            setReferences((prev) => [newRef, ...prev]);
            setActiveReferenceId(newRef.id);
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      });
      setImportNotification(`${list.length} referencia(s) importada(s) (bloqueadas por defecto).`);
      setTimeout(() => setImportNotification(null), 2500);
    },
    []
  );

  const handleUpdateReference = useCallback((id: string, patch: Partial<ReferenceItem>) => {
    setReferences((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        // When switching to camera anchor for the first time at (0,0), offset cleanly into visible margin
        if (patch.anchor === 'camera' && r.anchor !== 'camera' && r.x === 0 && r.y === 0 && patch.x === undefined) {
          return { ...r, ...patch, x: 240, y: -40 };
        }
        return { ...r, ...patch };
      })
    );
  }, []);

  const handleBringReferenceToFront = useCallback((id: string) => {
    setReferences((prev) => {
      const maxZ = prev.reduce((m, r) => Math.max(m, r.zOrder ?? 0), 0);
      return prev.map((r) => (r.id === id ? { ...r, zOrder: maxZ + 1 } : r));
    });
  }, []);

  const handleCenterAllReferences = useCallback(() => {
    setPureRefConfig((prev) => ({ ...prev, panX: 0, panY: 0, zoom: 1 }));
    setReferences((prev) => {
      const camRefs = prev.filter((r) => r.visible && r.anchor === 'camera');
      const cols = Math.max(1, Math.ceil(Math.sqrt(camRefs.length)));
      let camIdx = 0;
      return prev.map((r) => {
        if (!r.visible) return r;
        if (r.anchor === 'camera') {
          const col = camIdx % cols;
          const row = Math.floor(camIdx / cols);
          const cx = (col - (cols - 1) / 2) * 230;
          const cy = (row - (Math.ceil(camRefs.length / cols) - 1) / 2) * 190;
          camIdx++;
          return { ...r, x: Math.round(cx), y: Math.round(cy) };
        }
        if (Math.abs(r.x) > canvasWidth * 2 || Math.abs(r.y) > canvasHeight * 2) {
          return { ...r, x: 0, y: 0 };
        }
        return r;
      });
    });
    setImportNotification('Referencias centradas en el área visible.');
    setTimeout(() => setImportNotification(null), 2000);
  }, [canvasWidth, canvasHeight]);

  const handleDeleteReference = useCallback(
    (id: string) => {
      const nextRefs = referencesRef.current.filter((r) => r.id !== id);
      referencesRef.current = nextRefs;
      setReferences(nextRefs);
      setActiveReferenceId((cur) => (cur === id ? null : cur));
      pushHistorySnapshot({ references: nextRefs });
    },
    [pushHistorySnapshot]
  );

  const handleCreateReferenceGroup = useCallback((name: string, color: string) => {
    const newGrp: ReferenceGroup = {
      id: `refgrp-${Date.now()}`,
      name,
      color,
      visible: true,
      collapsed: false,
    };
    setReferenceGroups((prev) => [...prev, newGrp]);
  }, []);

  const handleUpdateReferenceGroup = useCallback((id: string, patch: Partial<ReferenceGroup>) => {
    setReferenceGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }, []);

  const handleDeleteReferenceGroup = useCallback(
    (id: string) => {
      const nextGroups = referenceGroupsRef.current.filter((g) => g.id !== id);
      const nextRefs = referencesRef.current.map((r) =>
        r.groupId === id ? { ...r, groupId: null } : r
      );
      referenceGroupsRef.current = nextGroups;
      referencesRef.current = nextRefs;
      setReferenceGroups(nextGroups);
      setReferences(nextRefs);
      pushHistorySnapshot({ referenceGroups: nextGroups, references: nextRefs });
    },
    [pushHistorySnapshot]
  );

  const handleReorderReferenceGroup = useCallback((dragGroupId: string, targetGroupId: string) => {
    if (dragGroupId === targetGroupId) return;
    setReferenceGroups((prev) => {
      const from = prev.findIndex((g) => g.id === dragGroupId);
      const to = prev.findIndex((g) => g.id === targetGroupId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const handleGenerateDummieFromReference = useCallback(
    async (ref: ReferenceItem) => {
      setImportNotification(`Analizando silueta de "${ref.name}" para Dummie...`);
      const nextPose = await generateDummiePoseFromImageDataUrl(
        ref.dataUrl,
        dummiePoseRef.current.rigType,
        ref.name
      );
      const visiblePose: DummiePose = { ...nextPose, overlayMode: 'canvas' };
      dummiePoseRef.current = visiblePose;
      setDummiePose(visiblePose);
      handleFocusPanel('dummie');
      pushHistorySnapshot({ dummiePose: visiblePose });
      setImportNotification(`¡Pose Dummie generada desde "${ref.name}"!`);
      setTimeout(() => setImportNotification(null), 3000);
    },
    [handleFocusPanel, pushHistorySnapshot]
  );

  // Hybrid Timeline (After Effects Keyframes, Markers, Retiming, Copy Full Anim) & Fighting Studio Handlers
  const handleAddMarker = useCallback((frameIndex: number, label: string, color: string) => {
    const marker: TimelineMarker = {
      id: `m-${Date.now()}`,
      frameIndex,
      label: label || `M${frameIndex + 1}`,
      color: color || '#fbbf24',
    };
    setTimelineMarkers((prev) => [...prev, marker]);
  }, []);

  const handleDeleteMarker = useCallback(
    (markerId: string) => {
      const nextMarkers = timelineMarkersRef.current.filter((m) => m.id !== markerId);
      timelineMarkersRef.current = nextMarkers;
      setTimelineMarkers(nextMarkers);
      pushHistorySnapshot({ timelineMarkers: nextMarkers });
    },
    [pushHistorySnapshot]
  );

  const handleSetLayerKeyframe = useCallback(
    (layerIndex: number, keyframe: LayerKeyframe) => {
      const updated = framesRef.current.map((f, fIdx) => {
        if (fIdx !== currentFrameIndex) return f;
        return {
          ...f,
          layers: f.layers.map((l, lIdx) => {
            if (lIdx !== layerIndex) return l;
            const existing = (l.keyframes || []).filter(
              (k) => k.frameIndex !== keyframe.frameIndex
            );
            return {
              ...l,
              keyframes: [...existing, keyframe].sort((a, b) => a.frameIndex - b.frameIndex),
            };
          }),
        };
      });
      framesRef.current = updated;
      setFrames(updated);
      pushHistorySnapshot({ frames: updated });
    },
    [currentFrameIndex, pushHistorySnapshot]
  );

  const handleRemoveLayerKeyframe = useCallback(
    (layerIndex: number, frameIndex: number) => {
      const updated = framesRef.current.map((f, fIdx) => {
        if (fIdx !== currentFrameIndex) return f;
        return {
          ...f,
          layers: f.layers.map((l, lIdx) => {
            if (lIdx !== layerIndex) return l;
            return {
              ...l,
              keyframes: (l.keyframes || []).filter((k) => k.frameIndex !== frameIndex),
            };
          }),
        };
      });
      framesRef.current = updated;
      setFrames(updated);
      pushHistorySnapshot({ frames: updated });
    },
    [currentFrameIndex, pushHistorySnapshot]
  );

  const handleUpdateFrameMeta = useCallback(
    (
      frameIndex: number,
      patch: Partial<Pick<Frame, 'colorLabel' | 'note' | 'events'>>
    ) => {
      setFrames((prev) =>
        prev.map((f, idx) => (idx === frameIndex ? { ...f, ...patch } : f))
      );
    },
    []
  );

  const handleUpdateFrameAdvantage = useCallback(
    (onHitAdvantage: number, onBlockAdvantage: number) => {
      setFrames((prev) =>
        prev.map((f, idx) =>
          idx === currentFrameIndex ? { ...f, onHitAdvantage, onBlockAdvantage } : f
        )
      );
    },
    [currentFrameIndex]
  );

  const handleScaleTimelineDurations = useCallback(
    (factor: number) => {
      const updated = framesRef.current.map((f) => {
        const baseMs = getFrameDurationMs(f);
        if (baseMs === 0) return { ...f, durationMs: 0, durationTicks: 0 };
        const nextMs = Math.max(10, Math.round(baseMs * factor));
        const nextTicks = Math.max(1, Math.round((nextMs / 1000) * 60));
        return { ...f, durationMs: nextMs, durationTicks: nextTicks };
      });
      framesRef.current = updated;
      setFrames(updated);
      pushHistorySnapshot({ frames: updated });
      setImportNotification(`Escalado temporal ×${factor} aplicado a todos los fotogramas.`);
      setTimeout(() => setImportNotification(null), 2500);
    },
    [pushHistorySnapshot]
  );

  const handleRetimeFrames = useCallback(
    (targetFps: number) => {
      const safeFps = Math.max(1, Math.min(60, targetFps));
      const nextMs = Math.max(16, Math.round(1000 / safeFps));
      const nextTicks = Math.max(1, Math.round(60 / safeFps));
      setAnimationFps(safeFps);
      const updated = framesRef.current.map((f) => ({
        ...f,
        durationMs: nextMs,
        durationTicks: nextTicks,
      }));
      framesRef.current = updated;
      setFrames(updated);
      pushHistorySnapshot({ frames: updated });
      setImportNotification(`Retiming uniforme a ${safeFps} FPS aplicado.`);
      setTimeout(() => setImportNotification(null), 2500);
    },
    [pushHistorySnapshot]
  );

  const handleCopyFullAnimation = useCallback(() => {
    const prev = framesRef.current;
    const cloned: Frame[] = prev.map((f, i) => ({
      ...JSON.parse(JSON.stringify(f)),
      id: `frame-seq-${Date.now()}-${i}`,
      name: `${f.name} (Seq)`,
    }));
    const updated = [...prev, ...cloned];
    framesRef.current = updated;
    setFrames(updated);
    pushHistorySnapshot({ frames: updated });
    setImportNotification('Animación completa duplicada al final de la línea temporal.');
    setTimeout(() => setImportNotification(null), 2500);
  }, [pushHistorySnapshot]);

  // Keep active document tab title/dimensions synced
  useEffect(() => {
    setOpenDocuments((prev) =>
      prev.map((doc) =>
        doc.id === activeDocumentId
          ? { ...doc, name: projectName, width: canvasWidth, height: canvasHeight, snapshot: null }
          : doc
      )
    );
  }, [activeDocumentId, projectName, canvasWidth, canvasHeight]);

  const buildCurrentDocumentSnapshot = useCallback((): OpenDocumentSnapshot => ({
    name: projectName,
    width: canvasWidth,
    height: canvasHeight,
    frames: JSON.parse(JSON.stringify(framesRef.current)),
    currentFrameIndex,
    currentLayerIndex,
    layerGroups: JSON.parse(JSON.stringify(layerGroupsRef.current)),
    globalPivot: { ...globalPivot },
    actionTags: JSON.parse(JSON.stringify(actionTags)),
    playbackMode,
    fps: animationFps,
    references: JSON.parse(JSON.stringify(referencesRef.current)),
    referenceGroups: JSON.parse(JSON.stringify(referenceGroupsRef.current)),
    timelineMarkers: JSON.parse(JSON.stringify(timelineMarkersRef.current)),
    cameraShake: { ...cameraShake },
    cameraKeyframes: JSON.parse(JSON.stringify(cameraKeyframesRef.current)),
    activePaletteColors: [...activePaletteColors],
    guides: JSON.parse(JSON.stringify(guidesRef.current)),
    workMode,
  }), [
    projectName,
    canvasWidth,
    canvasHeight,
    currentFrameIndex,
    currentLayerIndex,
    globalPivot,
    actionTags,
    playbackMode,
    animationFps,
    cameraShake,
    activePaletteColors,
    workMode,
  ]);

  const applyDocumentSnapshot = useCallback(
    (snap: OpenDocumentSnapshot) => {
      setIsPlaying(false);
      setProjectName(snap.name);
      setCanvasWidth(snap.width);
      setCanvasHeight(snap.height);
      const nextFrames: Frame[] = JSON.parse(JSON.stringify(snap.frames));
      framesRef.current = nextFrames;
      setFrames(nextFrames);
      setCurrentFrameIndex(Math.max(0, Math.min(nextFrames.length - 1, snap.currentFrameIndex || 0)));
      const safeLayerCount = nextFrames[0]?.layers.length || 1;
      setCurrentLayerIndex(Math.max(0, Math.min(safeLayerCount - 1, snap.currentLayerIndex || 0)));
      const nextGroups: LayerGroup[] = JSON.parse(JSON.stringify(snap.layerGroups || []));
      layerGroupsRef.current = nextGroups;
      setLayerGroups(nextGroups);
      setGlobalPivot(snap.globalPivot || { x: Math.floor(snap.width / 2), y: Math.floor(snap.height * 0.8) });
      setActionTags(snap.actionTags || []);
      setPlaybackMode(snap.playbackMode || 'loop');
      setAnimationFps(snap.fps || 12);
      referencesRef.current = snap.references || [];
      setReferences(snap.references || []);
      referenceGroupsRef.current = snap.referenceGroups || [];
      setReferenceGroups(snap.referenceGroups || []);
      timelineMarkersRef.current = snap.timelineMarkers || [];
      setTimelineMarkers(snap.timelineMarkers || []);
      if (snap.cameraShake) setCameraShake(snap.cameraShake);
      cameraKeyframesRef.current = snap.cameraKeyframes || [];
      setCameraKeyframes(snap.cameraKeyframes || []);
      setActivePaletteColors(snap.activePaletteColors || []);
      const nextGuides: CanvasGuide[] = JSON.parse(JSON.stringify(snap.guides || []));
      guidesRef.current = nextGuides;
      setGuides(nextGuides);
      setWorkMode(snap.workMode || 'fighter');
      setSelectedGuideId(null);
      setSelection(null);
      suppressDirtyMarkRef.current = true;
      pushHistorySnapshot({ frames: nextFrames, guides: nextGuides, layerGroups: nextGroups });
      suppressDirtyMarkRef.current = false;
    },
    [pushHistorySnapshot]
  );

  // =========================================================================
  // PROJECT WORK MODES (STAGE PARALLAX, HUD, FX, TILESET, PORTRAIT, CUTSCENE)
  // & ADVANCED FX STUDIO / FX LAB HANDLERS (100% NON-DESTRUCTIVE)
  // =========================================================================

  // Live Stage Parallax Auto-Scroll loop
  useEffect(() => {
    if (
      workMode !== 'stage' ||
      !stageParallaxConfig.enabled ||
      !stageParallaxConfig.autoScroll ||
      isPlaying
    ) {
      return;
    }
    let rafId = 0;
    let lastTime = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      setStageParallaxConfig((prev) => {
        if (!prev.enabled || !prev.autoScroll) return prev;
        const wrapLimit = Math.max(256, canvasWidth * 4);
        const nextOffset = (prev.scrollOffset + prev.autoScrollSpeed * dt) % wrapLimit;
        return { ...prev, scrollOffset: nextOffset };
      });
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [workMode, stageParallaxConfig.enabled, stageParallaxConfig.autoScroll, isPlaying, canvasWidth]);

  const handleOpenFxStudio = useCallback(
    (tab: 'generator' | 'lab' | 'library' = 'generator', recipe: EditableFxRecipe | null = null) => {
      setFxStudioTab(tab);
      setFxStudioInitialRecipe(recipe);
      setFxStudioModalOpen(true);
    },
    []
  );

  const handleChangeWorkMode = useCallback(
    (mode: ProjectWorkMode) => {
      const def = WORK_MODES_REGISTRY[mode] || WORK_MODES_REGISTRY.fighter;
      setWorkMode(mode);
      // Gentle non-destructive workspace adaptation (NEVER deletes or mutates user pixels/frames)
      if (mode === 'tileset') {
        setShowGrid(true);
      } else if (mode === 'stage') {
        handleChangeGuidesConfig({
          ...guidesConfig,
          showRulers: true,
          showGuides: true,
          stageDepth: {
            ...guidesConfig.stageDepth,
            enabled: guidesConfig.stageDepth.autoShowInStageMode ? true : guidesConfig.stageDepth.enabled,
          },
        });
      } else if (mode === 'hud_ui') {
        handleChangeGuidesConfig({ ...guidesConfig, showRulers: true, showGuides: true });
      }
      if (mode !== 'fighter') {
        handleFocusPanel('workmode');
      }
      setImportNotification(`Modo de trabajo: ${def.label} (no destructivo · tus píxeles están intactos).`);
      setTimeout(() => setImportNotification(null), 3000);
    },
    [guidesConfig, handleChangeGuidesConfig, handleFocusPanel]
  );

  const handleSelectPerspectiveType = useCallback(
    (type: PerspectiveGuideType) => {
      const horizonY = guidesConfig.perspective.horizonY || Math.round(canvasHeight * 0.54);
      const angles = getDefaultAxonometricAngles(type);
      const nextVps = createVanishingPointsForType(type, canvasWidth, canvasHeight, horizonY);
      handleChangeGuidesConfig({
        ...guidesConfig,
        showGuides: true,
        perspective: {
          ...guidesConfig.perspective,
          enabled: true,
          type,
          vanishingPoints: nextVps,
          isoAngleLeft: angles.isoAngleLeft,
          isoAngleRight: angles.isoAngleRight,
        },
      });
      const meta = PERSPECTIVE_TYPE_META.find((m) => m.id === type);
      setImportNotification(`Guía activada: ${meta?.label || type} (arrastra los puntos de fuga en el visor).`);
      setTimeout(() => setImportNotification(null), 3000);
    },
    [guidesConfig, canvasWidth, canvasHeight, handleChangeGuidesConfig]
  );

  const handleApplyScenarioGuidePreset = useCallback(
    (presetId: ScenarioGuidePresetId) => {
      const def = SCENARIO_GUIDE_PRESETS.find((p) => p.id === presetId);
      if (!def) return;
      const built = def.build(canvasWidth, canvasHeight);
      handleChangeGuidesConfig({
        ...guidesConfig,
        showRulers: true,
        showGuides: true,
        perspective: built.perspective,
        cameraGuides: built.cameraGuides,
        stageDepth: built.stageDepth,
      });
      setImportNotification(`Preset de escenario aplicado: ${def.label}.`);
      setTimeout(() => setImportNotification(null), 2800);
    },
    [guidesConfig, canvasWidth, canvasHeight, handleChangeGuidesConfig]
  );

  const handleCreateSuggestedModeLayers = useCallback(
    (mode: ProjectWorkMode) => {
      const def = WORK_MODES_REGISTRY[mode];
      if (!def || def.suggestedLayers.length === 0) return;
      const curFrame = framesRef.current[currentFrameIndex];
      if (!curFrame) return;
      const existingNames = new Set(curFrame.layers.map((l) => l.name.toLowerCase()));
      const layersToAdd: Layer[] = [];
      def.suggestedLayers.forEach((spec, idx) => {
        if (existingNames.has(spec.name.toLowerCase())) return;
        layersToAdd.push({
          id: `layer-mode-${mode}-${Date.now()}-${idx}`,
          name: spec.name,
          visible: true,
          locked: false,
          opacity: spec.opacity ?? 1,
          fillOpacity: 1,
          blendMode: spec.blendMode || 'normal',
          pixels: createEmptyGrid(canvasWidth, canvasHeight),
          groupId: null,
          colorTag: spec.colorTag,
          parallaxSpeed: spec.parallaxSpeed,
          stagePlane: spec.stagePlane,
          stageRole: spec.stageRole,
        });
      });
      if (layersToAdd.length === 0) {
        setImportNotification(`Las capas sugeridas de ${def.shortLabel} ya existen en este fotograma.`);
        setTimeout(() => setImportNotification(null), 2600);
        return;
      }
      const updated = framesRef.current.map((f, fIdx) =>
        fIdx === currentFrameIndex ? { ...f, layers: [...f.layers, ...layersToAdd] } : f
      );
      framesRef.current = updated;
      setFrames(updated);
      setCurrentLayerIndex(updated[currentFrameIndex].layers.length - 1);
      pushHistorySnapshot({ frames: updated });
      setImportNotification(`Añadidas ${layersToAdd.length} capas sugeridas para ${def.label}.`);
      setTimeout(() => setImportNotification(null), 2600);
    },
    [canvasWidth, canvasHeight, currentFrameIndex, pushHistorySnapshot]
  );

  const handleApplyModeGuides = useCallback(
    (mode: ProjectWorkMode) => {
      const generated = generateModeGuides(mode, canvasWidth, canvasHeight);
      if (generated.length === 0) return;
      const nextGuides = [...guidesRef.current, ...generated];
      guidesRef.current = nextGuides;
      setGuides(nextGuides);
      handleChangeGuidesConfig({ ...guidesConfig, showGuides: true, showRulers: true });
      pushHistorySnapshot({ guides: nextGuides });
      const def = WORK_MODES_REGISTRY[mode];
      setImportNotification(`Aplicadas ${generated.length} guías de composición (${def.shortLabel}).`);
      setTimeout(() => setImportNotification(null), 2600);
    },
    [canvasWidth, canvasHeight, guidesConfig, handleChangeGuidesConfig, pushHistorySnapshot]
  );

  const handleInsertModeTemplate = useCallback(
    (templateId: string) => {
      const built = buildModeTemplateLayers(templateId, canvasWidth, canvasHeight);
      if (!built || built.layers.length === 0) return;
      const stamp = Date.now();
      const mapPlaneToRole = (plane?: string): StageBuilderRole | undefined => {
        if (plane === 'sky') return 'fondo';
        if (plane === 'far' || plane === 'mid') return 'parallax';
        if (plane === 'near') return 'objetos';
        if (plane === 'ground') return 'tiles';
        if (plane === 'fg') return 'decoracion';
        if (plane === 'fx') return 'fx';
        return undefined;
      };
      const newLayers: Layer[] = built.layers.map((spec, idx) => ({
        id: `layer-tpl-${stamp}-${idx}`,
        name: spec.name,
        visible: true,
        locked: false,
        opacity: spec.opacity ?? 1,
        fillOpacity: 1,
        blendMode: spec.blendMode || 'normal',
        pixels: spec.pixels,
        groupId: null,
        colorTag: spec.colorTag,
        parallaxSpeed: spec.parallaxSpeed,
        stagePlane: spec.stagePlane,
        stageRole: mapPlaneToRole(spec.stagePlane),
      }));
      const updated = framesRef.current.map((f, fIdx) =>
        fIdx === currentFrameIndex ? { ...f, layers: [...f.layers, ...newLayers] } : f
      );
      framesRef.current = updated;
      setFrames(updated);
      setCurrentLayerIndex(updated[currentFrameIndex].layers.length - 1);
      pushHistorySnapshot({ frames: updated });
      setImportNotification(
        `Plantilla "${built.title}" insertada (${newLayers.length} ${newLayers.length === 1 ? 'capa' : 'capas'}).`
      );
      setTimeout(() => setImportNotification(null), 2600);
    },
    [canvasWidth, canvasHeight, currentFrameIndex, pushHistorySnapshot]
  );

  const handleUpdateLayerParallaxSpeed = useCallback(
    (layerIdx: number, speed: number) => {
      const clamped = Math.max(0, Math.min(3, Math.round(speed * 20) / 20));
      const updated = framesRef.current.map((f, fIdx) =>
        fIdx !== currentFrameIndex
          ? f
          : {
              ...f,
              layers: f.layers.map((l, lIdx) =>
                lIdx === layerIdx ? { ...l, parallaxSpeed: clamped } : l
              ),
            }
      );
      framesRef.current = updated;
      setFrames(updated);
    },
    [currentFrameIndex]
  );

  const handleAddStageRoleLayer = useCallback(
    (role: StageBuilderRole) => {
      const roleSpec: Record<
        StageBuilderRole,
        {
          label: string;
          parallaxSpeed: number;
          stagePlane: string;
          colorTag: string;
          blendMode?: 'normal' | 'screen';
          opacity?: number;
        }
      > = {
        fondo: { label: 'Fondo', parallaxSpeed: 0.15, stagePlane: 'sky', colorTag: '#38bdf8' },
        parallax: { label: 'Parallax', parallaxSpeed: 0.45, stagePlane: 'mid', colorTag: '#6366f1' },
        objetos: { label: 'Objetos', parallaxSpeed: 0.75, stagePlane: 'near', colorTag: '#14b8a6' },
        tiles: { label: 'Tiles', parallaxSpeed: 1.0, stagePlane: 'ground', colorTag: '#10b981' },
        decoracion: { label: 'Decoración', parallaxSpeed: 1.35, stagePlane: 'fg', colorTag: '#f43f5e' },
        fx: {
          label: 'Efectos ambientales',
          parallaxSpeed: 1.15,
          stagePlane: 'fx',
          colorTag: '#22d3ee',
          blendMode: 'screen',
          opacity: 0.85,
        },
      };
      const meta = roleSpec[role];
      const curFrame = framesRef.current[currentFrameIndex];
      if (!curFrame) return;
      const sameRoleCount = curFrame.layers.filter((l) => l.stageRole === role).length;
      const newLayer: Layer = {
        id: `layer-stage-role-${role}-${Date.now()}`,
        name: sameRoleCount > 0 ? `${meta.label} #${sameRoleCount + 1}` : meta.label,
        visible: true,
        locked: false,
        opacity: meta.opacity ?? 1,
        fillOpacity: 1,
        blendMode: meta.blendMode || 'normal',
        pixels: createEmptyGrid(canvasWidth, canvasHeight),
        groupId: null,
        colorTag: meta.colorTag,
        parallaxSpeed: meta.parallaxSpeed,
        stagePlane: meta.stagePlane,
        stageRole: role,
      };
      const updated = framesRef.current.map((f, fIdx) =>
        fIdx === currentFrameIndex ? { ...f, layers: [...f.layers, newLayer] } : f
      );
      framesRef.current = updated;
      setFrames(updated);
      setCurrentLayerIndex(updated[currentFrameIndex].layers.length - 1);
      pushHistorySnapshot({ frames: updated });
      if (role === 'tiles') {
        handleSelectTool('tile');
      }
      setImportNotification(`Capa Stage Builder añadida: ${newLayer.name} (${meta.parallaxSpeed.toFixed(2)}×).`);
      setTimeout(() => setImportNotification(null), 2400);
    },
    [canvasWidth, canvasHeight, currentFrameIndex, pushHistorySnapshot, handleSelectTool]
  );

  const handleApplyFightingProfile = useCallback(
    (profileId: FightingGameProfileId) => {
      setActiveFightingProfile(profileId);
      const spec = FIGHTING_GAME_PROFILES[profileId] || FIGHTING_GAME_PROFILES.custom;
      const pal = FIGHTING_GAME_PALETTES.find((p) => p.id === spec.paletteId);
      if (pal && pal.colors.length > 0) {
        setActivePaletteColors(pal.colors);
        setPrimaryColor(pal.colors[0]);
        if (pal.colors[1]) setSecondaryColor(pal.colors[1]);
      }
      setAnimationFps(spec.fighterLayout.recommendedFps);
      setPixelPerfect(spec.fighterLayout.pixelPerfect);
      setBrushSettings((prev) => ({ ...prev, pixelPerfect: spec.fighterLayout.pixelPerfect }));

      const nextGuides = buildFightingProfileGuides(profileId, canvasWidth, canvasHeight);
      const filteredOld = guidesRef.current.filter((g) => !g.id.startsWith('fg-guide-'));
      const mergedGuides = [...filteredOld, ...nextGuides];
      guidesRef.current = mergedGuides;
      setGuides(mergedGuides);
      handleChangeGuidesConfig({
        ...guidesConfig,
        showGuides: true,
        showRulers: true,
        stageDepth: {
          ...guidesConfig.stageDepth,
          enabled: workMode === 'stage' ? true : guidesConfig.stageDepth.enabled,
        },
      });
      if (workMode === 'stage') {
        setStageParallaxConfig((prev) => ({
          ...prev,
          enabled: true,
          horizonPct: spec.stageLayout.horizonPct,
          playableFloorPct: spec.stageLayout.floorPct,
          jumpHeightPct: spec.stageLayout.jumpHeightPct,
        }));
      }
      pushHistorySnapshot({ guides: mergedGuides });
      setImportNotification(`Perfil aplicado: ${spec.name} (${spec.fighterLayout.recommendedFps} FPS · ${nextGuides.length} guías).`);
      setTimeout(() => setImportNotification(null), 2800);
    },
    [canvasWidth, canvasHeight, workMode, guidesConfig, handleChangeGuidesConfig, pushHistorySnapshot]
  );

  const handleCaptureTileFromCanvas = useCallback(
    (tileSize: number): (string | null)[][] | null => {
      const layer = framesRef.current[currentFrameIndex]?.layers[currentLayerIndex];
      if (!layer || !layer.pixels || layer.pixels.length === 0) return null;
      const startX =
        selection && selection.active ? Math.min(selection.startX, selection.endX) : 0;
      const startY =
        selection && selection.active ? Math.min(selection.startY, selection.endY) : 0;
      const captured = captureTilePixelsFromGrid(layer.pixels, startX, startY, tileSize);
      const hasAnyPixel = captured.some((row) => row.some((c) => Boolean(c)));
      return hasAnyPixel ? captured : null;
    },
    [currentFrameIndex, currentLayerIndex, selection]
  );

  const handleTriggerModeAi = useCallback(
    async (kind: 'stage' | 'hud' | 'fx', promptHint: string, categoryLabel: string) => {
      if (kind === 'fx') {
        handleOpenFxStudio('generator');
        return;
      }
      setImportNotification(`Generando ${categoryLabel} con IA...`);
      try {
        const ctxAnalysis = analyzeProjectContext(
          framesRef.current,
          canvasWidth,
          canvasHeight,
          activePaletteColors,
          layerGroups,
          currentFrameIndex
        );
        const endpoint = kind === 'stage' ? '/api/ai/stage-generate' : '/api/ai/hud-generate';
        const body =
          kind === 'stage'
            ? {
                prompt: promptHint,
                biome: categoryLabel,
                width: canvasWidth,
                height: canvasHeight,
                styleMode: 'keep',
                styleProfile: ctxAnalysis.detectedProfileId,
                style: ctxAnalysis.detectedProfileId,
                palette: ctxAnalysis.activePalette,
                contextAnalysis: ctxAnalysis,
              }
            : {
                prompt: promptHint,
                elementCategory: categoryLabel,
                width: canvasWidth,
                height: canvasHeight,
                styleMode: 'keep',
                styleProfile: ctxAnalysis.detectedProfileId,
                style: ctxAnalysis.detectedProfileId,
                palette: ctxAnalysis.activePalette,
                contextAnalysis: ctxAnalysis,
              };
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || 'Error del servidor IA');
        }
        const rawPixels: { x: number; y: number; color: string }[] = Array.isArray(data.pixels)
          ? data.pixels
          : [];
        if (rawPixels.length === 0) {
          throw new Error('La IA no devolvió píxeles válidos.');
        }
        const grid = validateAndCleanAiPixelGrid(
          pixelsToGrid(rawPixels, canvasWidth, canvasHeight),
          kind,
          { targetPalette: ctxAnalysis.activePalette, coherenceLevel: 'high' }
        ).grid;
        const newLayer: Layer = {
          id: `layer-ai-mode-${Date.now()}`,
          name: `${kind === 'stage' ? '[Stage IA]' : '[HUD IA]'} ${categoryLabel}`,
          visible: true,
          locked: false,
          opacity: 1,
          fillOpacity: 1,
          blendMode: 'normal',
          pixels: grid,
          groupId: null,
          colorTag: kind === 'stage' ? '#10b981' : '#38bdf8',
          parallaxSpeed: kind === 'stage' ? 0.5 : undefined,
        };
        const updated = framesRef.current.map((f, fIdx) =>
          fIdx === currentFrameIndex ? { ...f, layers: [...f.layers, newLayer] } : f
        );
        framesRef.current = updated;
        setFrames(updated);
        setCurrentLayerIndex(updated[currentFrameIndex].layers.length - 1);
        pushHistorySnapshot({ frames: updated });
        setImportNotification(`${categoryLabel} insertado en nueva capa.`);
        setTimeout(() => setImportNotification(null), 2800);
      } catch (err: any) {
        setImportNotification(
          `No se pudo generar con IA (${err?.message || 'clave de servidor no configurada'}). Usa las plantillas instantáneas del panel.`
        );
        setTimeout(() => setImportNotification(null), 4200);
      }
    },
    [canvasWidth, canvasHeight, currentFrameIndex, handleOpenFxStudio, pushHistorySnapshot]
  );

  const handleInjectFxStudioResult = useCallback(
    (payload: FxInjectionPayload) => {
      if (!payload.frames || payload.frames.length === 0) return;
      const clonedFrames: Frame[] = JSON.parse(JSON.stringify(framesRef.current));
      const targetCount = payload.animated ? payload.frames.length : 1;
      const neededTotal = currentFrameIndex + targetCount;

      while (clonedFrames.length < neededTotal) {
        const templateFrame = clonedFrames[clonedFrames.length - 1] || clonedFrames[0];
        clonedFrames.push({
          id: `frame-fx-${Date.now()}-${clonedFrames.length}`,
          name: `Frame ${clonedFrames.length + 1}`,
          durationTicks: templateFrame?.durationTicks ?? 6,
          durationMs: templateFrame?.durationMs ?? Math.round(1000 / Math.max(1, animationFps)),
          phase: templateFrame?.phase ?? 'neutral',
          hitboxes: [],
          layers: (templateFrame?.layers || []).map((l, idx) => ({
            ...l,
            id: `layer-empty-${Date.now()}-${clonedFrames.length}-${idx}`,
            pixels: createEmptyGrid(canvasWidth, canvasHeight),
            vectorPaths: [],
            parametricShapes: [],
          })),
        });
      }

      const stamp = Date.now();
      for (let i = 0; i < targetCount; i++) {
        const frameIdx = currentFrameIndex + i;
        const fxFrame = payload.frames[Math.min(i, payload.frames.length - 1)];
        const newLayers: Layer[] = [];

        if (payload.layerMode === 'per_component' && fxFrame.components.length > 0) {
          fxFrame.components.forEach((comp, cIdx) => {
            newLayers.push({
              id: `layer-fx-${stamp}-${i}-${cIdx}`,
              name: `[FX] ${payload.name} · ${comp.name}`,
              visible: true,
              locked: false,
              opacity: comp.opacity ?? 1,
              fillOpacity: 1,
              blendMode: comp.blendMode || 'screen',
              pixels: comp.pixels,
              groupId: null,
              colorTag: comp.colorTag || '#a855f7',
              fxRecipe: payload.recipe,
            });
          });
        } else {
          newLayers.push({
            id: `layer-fx-${stamp}-${i}`,
            name: `[FX] ${payload.name}`,
            visible: true,
            locked: false,
            opacity: 1,
            fillOpacity: 1,
            blendMode: payload.singleBlendMode || 'normal',
            pixels: fxFrame.merged,
            groupId: null,
            colorTag: '#a855f7',
            fxRecipe: payload.recipe,
          });
        }

        clonedFrames[frameIdx] = {
          ...clonedFrames[frameIdx],
          layers: [...clonedFrames[frameIdx].layers, ...newLayers],
        };
      }

      framesRef.current = clonedFrames;
      setFrames(clonedFrames);
      setCurrentLayerIndex(clonedFrames[currentFrameIndex].layers.length - 1);
      setLastGeneratedFxRecipe(payload.recipe);
      pushHistorySnapshot({ frames: clonedFrames });
      setFxStudioModalOpen(false);
      setImportNotification(
        `Efecto "${payload.name}" insertado (${targetCount} ${targetCount === 1 ? 'frame' : 'frames'} · ${
          payload.layerMode === 'per_component' ? 'capas por componente' : 'capa única'
        }).`
      );
      setTimeout(() => setImportNotification(null), 3200);
    },
    [animationFps, canvasWidth, canvasHeight, currentFrameIndex, pushHistorySnapshot]
  );

  // =========================================================================
  // SISTEMA UNIFICADO DE HIDRATACIÓN Y APERTURA DE DOCUMENTOS
  // Usado por: Archivo -> Abrir, Abrir Recientes, Spritesheets y Drag & Drop
  // =========================================================================
  const reportFileLoadFailure = useCallback(
    (
      fileName: string,
      err: unknown,
      fallbackFormat: string = 'Archivo',
      ctx?: {
        file?: File;
        moduleName?: string;
        errorCode?: string;
        incompatibleElement?: string;
        attemptedRecoveryMode?: PsdRecoveryMode;
      }
    ) => {
      const isStructured = err instanceof FileLoadError;
      const message = isStructured
        ? err.message
        : err instanceof Error
        ? err.message
        : 'El archivo está dañado o no tiene un formato compatible.';
      const formatLabel = isStructured ? err.formatLabel : fallbackFormat;
      const technicalDetails = isStructured
        ? err.technicalDetails
        : err instanceof Error
        ? err.stack || err.message
        : String(err);
      const errorCode = (isStructured ? err.errorCode : undefined) || ctx?.errorCode || 'FILE_LOAD_ERR';
      const moduleName = (isStructured ? err.moduleName : undefined) || ctx?.moduleName || 'File Loader';
      const fileSizeBytes = (isStructured ? err.fileSizeBytes : undefined) ?? ctx?.file?.size;
      const psdVersion = isStructured ? err.psdVersion : undefined;
      const incompatibleElement =
        (isStructured ? err.incompatibleElement : undefined) || ctx?.incompatibleElement;
      const canRecoverPsd = isStructured
        ? err.canOfferPsdRecovery
        : /\.ps[db]$/i.test(fileName) || formatLabel.toLowerCase().includes('psd');

      const diagEntry = recordFileFailureDiagnostic({
        fileName,
        fileSizeBytes,
        formatLabel,
        psdVersion,
        incompatibleElement,
        moduleName,
        errorCode,
        message,
        technicalDetails,
        recoveryModeAttempted: ctx?.attemptedRecoveryMode,
      });

      console.error(`[PixelClash FileLoader] Error al abrir "${fileName}" [${errorCode}]:`, err);
      appendStudioLog(`Error al abrir "${fileName}" (${formatLabel} · ${errorCode}): ${message}`);
      setImportNotification(`Error al abrir "${fileName}": ${message}`);
      setTimeout(() => setImportNotification(null), 5000);
      setFileLoadError({
        fileName,
        formatLabel,
        message,
        technicalDetails,
        file: ctx?.file,
        fileSizeBytes,
        moduleName,
        errorCode,
        psdVersion,
        incompatibleElement,
        canRecoverPsd,
        attemptedRecoveryMode: ctx?.attemptedRecoveryMode,
        timestamp: diagEntry.timestamp,
      });
    },
    [appendStudioLog]
  );

  const isCurrentDocumentBlank = useCallback((): boolean => {
    if (openDocuments.length > 1) return false;
    const curFrames = framesRef.current;
    if (curFrames.length > 1) return false;
    const f0 = curFrames[0];
    if (!f0 || f0.layers.length > 1) return false;
    if (f0.layers[0]?.tiledStoreId) return false;
    const grid = f0.layers[0]?.pixels;
    if (!grid) return true;
    for (const row of grid) {
      for (const cell of row) {
        if (cell) return false;
      }
    }
    return true;
  }, [openDocuments.length]);

  const hydrateOpenedDocumentSnapshot = useCallback(
    (
      snapshot: OpenDocumentSnapshot,
      formatLabel: string,
      tabMeta?: {
        isDirty?: boolean;
        isNewUnsaved?: boolean;
        hasSavedLocation?: boolean;
        savedFormat?: SaveAsFormatId;
        filePath?: string;
      }
    ): boolean => {
      const validated = validateDocumentFramesIntegrity(
        snapshot.width,
        snapshot.height,
        snapshot.frames,
        snapshot.name,
        formatLabel
      );
      const safeSnapshot: OpenDocumentSnapshot = {
        ...snapshot,
        frames: validated.normalizedFrames,
      };

      const resolvedMeta = {
        isDirty: tabMeta?.isDirty ?? false,
        isNewUnsaved: tabMeta?.isNewUnsaved ?? false,
        hasSavedLocation: tabMeta?.hasSavedLocation ?? true,
        savedFormat: tabMeta?.savedFormat,
        filePath: tabMeta?.filePath,
      };

      const shouldCreateNewTab = !isCurrentDocumentBlank();
      if (shouldCreateNewTab) {
        const currentSnap = buildCurrentDocumentSnapshot();
        const newDocId = `doc-${Date.now()}`;
        setOpenDocuments((prev) => [
          ...prev.map((d) =>
            d.id === activeDocumentId
              ? {
                  ...d,
                  name: currentSnap.name,
                  width: currentSnap.width,
                  height: currentSnap.height,
                  snapshot: currentSnap,
                }
              : d
          ),
          {
            id: newDocId,
            name: safeSnapshot.name,
            width: safeSnapshot.width,
            height: safeSnapshot.height,
            snapshot: null,
            ...resolvedMeta,
          },
        ]);
        activeDocumentIdRef.current = newDocId;
        setActiveDocumentId(newDocId);
      } else {
        setOpenDocuments((prev) =>
          prev.map((d) =>
            d.id === activeDocumentId
              ? {
                  ...d,
                  name: safeSnapshot.name,
                  width: safeSnapshot.width,
                  height: safeSnapshot.height,
                  snapshot: null,
                  ...resolvedMeta,
                }
              : d
          )
        );
      }

      applyDocumentSnapshot(safeSnapshot);
      return shouldCreateNewTab;
    },
    [activeDocumentId, applyDocumentSnapshot, buildCurrentDocumentSnapshot, isCurrentDocumentBlank]
  );

  const hydrateImportResultAsDocument = useCallback(
    (
      res: ImportResult,
      file: File,
      opts?: {
        diskPath?: string;
        fileHandle?: FileSystemFileHandle;
        replaceRecentId?: string;
        overrideFormat?: RecentProjectFileFormat;
      }
    ) => {
      let nextGroups: LayerGroup[] = Array.isArray(res.layerGroups) ? res.layerGroups : [];
      let nextPivot = res.projectState?.globalPivot || {
        x: Math.floor(res.width / 2),
        y: Math.floor(res.height * 0.8),
      };
      let nextActionTags: ActionTag[] = Array.isArray(res.actionTags) ? res.actionTags : [];
      let nextPlaybackMode: 'loop' | 'pingpong' | 'once' = 'loop';
      let nextFps = typeof res.fps === 'number' ? res.fps : 12;
      let nextRefs: ReferenceItem[] = [];
      let nextRefGroups: ReferenceGroup[] = [];
      let nextMarkers: TimelineMarker[] = [];
      let nextShake = cameraShake;
      let nextCamKf: CameraKeyframe[] = [];
      let nextPalette: string[] = [];
      let nextGuides: CanvasGuide[] = [];
      let nextWorkMode: ProjectWorkMode = 'fighter';

      if (res.projectState) {
        const ps = res.projectState;
        if (Array.isArray(ps.layerGroups) && ps.layerGroups.length > 0) nextGroups = ps.layerGroups;
        if (Array.isArray(ps.clips)) setClips(ps.clips);
        if (ps.activeClipId) setActiveClipId(ps.activeClipId);
        if (ps.stageType) setStageType(ps.stageType);
        if (typeof ps.stageOpacity === 'number') setStageOpacity(ps.stageOpacity);
        if (ps.groundConfig) setGroundConfig(ps.groundConfig);
        if (ps.dummyOpponent) setDummyOpponent(ps.dummyOpponent);
        if (ps.combatFx) setCombatFx(ps.combatFx);
        if (ps.cameraShake) nextShake = ps.cameraShake;
        if (Array.isArray(ps.cameraKeyframes)) nextCamKf = ps.cameraKeyframes;
        if (ps.playbackMode) nextPlaybackMode = ps.playbackMode;
        if (ps.brushSettings) handleChangeBrushSettings({ ...DEFAULT_BRUSH_SETTINGS, ...ps.brushSettings });
        if (Array.isArray(ps.activePaletteColors)) nextPalette = ps.activePaletteColors;
        if (typeof ps.fps === 'number') nextFps = ps.fps;
        if (ps.primaryColor) setPrimaryColor(ps.primaryColor);
        if (ps.secondaryColor) setSecondaryColor(ps.secondaryColor);
        if (Array.isArray(ps.references)) nextRefs = ps.references;
        if (Array.isArray(ps.referenceGroups)) nextRefGroups = ps.referenceGroups;
        if (Array.isArray(ps.timelineMarkers)) nextMarkers = ps.timelineMarkers;
        if (Array.isArray(ps.guides)) nextGuides = ps.guides;
        if (ps.workMode) nextWorkMode = ps.workMode;
      }

      const openedSnapshot: OpenDocumentSnapshot = {
        name: res.name,
        width: res.width,
        height: res.height,
        frames: res.frames,
        currentFrameIndex: res.projectState?.currentFrameIndex ?? 0,
        currentLayerIndex: res.projectState?.currentLayerIndex ?? 0,
        layerGroups: nextGroups,
        globalPivot: nextPivot,
        actionTags: nextActionTags,
        playbackMode: nextPlaybackMode,
        fps: nextFps,
        references: nextRefs,
        referenceGroups: nextRefGroups,
        timelineMarkers: nextMarkers,
        cameraShake: nextShake,
        cameraKeyframes: nextCamKf,
        activePaletteColors: nextPalette,
        guides: nextGuides,
        workMode: nextWorkMode,
      };

      const fmt: RecentProjectFileFormat =
        opts?.overrideFormat || res.stats.fileFormat || normalizeFileFormatTag(file.name);
      const displayPath =
        opts?.diskPath ||
        (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
        `Documentos/${file.name}`;
      const mappedSaveFormat: SaveAsFormatId =
        fmt === 'pcs' || fmt === 'json' || fmt === 'ase' || fmt === 'psd' || fmt === 'png' || fmt === 'jpg' || fmt === 'webp' || fmt === 'gif'
          ? fmt
          : fmt === 'jpeg'
          ? 'jpg'
          : 'pcs';
      const openedInNewTab = hydrateOpenedDocumentSnapshot(openedSnapshot, res.stats.formatLabel, {
        isDirty: false,
        isNewUnsaved: false,
        hasSavedLocation: true,
        savedFormat: mappedSaveFormat,
        filePath: displayPath,
      });

      recordRecentProject({
        name: res.name,
        width: res.width,
        height: res.height,
        frames: res.frames,
        layerGroups: nextGroups,
        category: res.stats.formatLabel,
        path: displayPath,
        diskPath: opts?.diskPath,
        fileFormat: fmt,
        modifiedTimestamp: file.lastModified || Date.now(),
        fileSize: file.size,
        snapshot: openedSnapshot,
        fileBlob: file,
        fileName: file.name,
        fileHandle: opts?.fileHandle,
        replaceRecentId: opts?.replaceRecentId,
      });

      setNewProjectModalOpen(false);
      setHomeScreenOpen(false);
      setDocumentDpi(res.dpi || 72);
      const dpiNote = res.dpi ? ` · ${res.dpi} DPI` : '';
      const tiledNote = res.stats.usesTiledEngine ? ' · Bloques 1:1' : '';
      const frameNote =
        res.frames.length > 1
          ? ` · ${res.frames.length} fotogramas`
          : res.stats.layerCount > 1
          ? ` · ${res.stats.layerCount} capas`
          : '';
      setImportNotification(
        `${res.stats.formatLabel} abierto${openedInNewTab ? ' en nueva pestaña' : ''}: ${file.name} (${res.width}×${res.height} px${dpiNote}${frameNote}${tiledNote} · 1:1 exacto)`
      );
      setTimeout(() => setImportNotification(null), 4000);
      if (res.psdCompatibilityReport && res.psdCompatibilityReport.hasWarnings) {
        setPsdCompatibilityReport(res.psdCompatibilityReport);
      }
    },
    [cameraShake, handleChangeBrushSettings, hydrateOpenedDocumentSnapshot, recordRecentProject]
  );

  // =========================================================================
  // ABRIR DOCUMENTO UNIFICADO (Ctrl+O, Recientes, Drag & Drop, Spritesheets)
  // =========================================================================
  const handleOpenDocumentFile = useCallback(
    async (
      file: File,
      opts?: {
        diskPath?: string;
        fileHandle?: FileSystemFileHandle;
        replaceRecentId?: string;
        skipSpritesheetPrompt?: boolean;
        forceSpritesheetSlicer?: boolean;
        psdRecoveryMode?: PsdRecoveryMode;
      }
    ) => {
      try {
        setImportNotification(
          opts?.psdRecoveryMode && opts.psdRecoveryMode !== 'normal'
            ? `Recuperando "${file.name}"...`
            : `Abriendo "${file.name}"...`
        );

        if (opts?.forceSpritesheetSlicer) {
          const rawRaster = await decodeAnyRasterFileToRgba(file);
          const candidate = detectSpritesheetCandidate(file.name, rawRaster.width, rawRaster.height);
          setImportNotification(null);
          setPendingSpritesheetOpen({
            file,
            fileName: file.name,
            rawRaster,
            candidate,
            fallbackSingleResult: null,
            diskPath: opts.diskPath,
            fileHandle: opts.fileHandle,
            replaceRecentId: opts.replaceRecentId,
            allowOpenAsSingleImage: true,
          });
          return;
        }

        const res = await importGraphicFile(file, {
          psdRecoveryMode: opts?.psdRecoveryMode,
        });

        // Ask user explicitly before treating a detected image as a spritesheet!
        // "Se ha detectado una posible hoja de sprites. ¿Desea abrirla como spritesheet?"
        // Sí -> interactive Slicer | No -> open intact 1:1 without any resize
        if (
          res.spritesheetCandidate?.isCandidate &&
          res.rawRaster &&
          !opts?.skipSpritesheetPrompt
        ) {
          setImportNotification(null);
          setPendingSpritesheetPrompt({
            file,
            fileName: file.name,
            rawRaster: res.rawRaster,
            candidate: res.spritesheetCandidate,
            fallbackSingleResult: res,
            diskPath: opts?.diskPath,
            fileHandle: opts?.fileHandle,
            replaceRecentId: opts?.replaceRecentId,
            allowOpenAsSingleImage: true,
          });
          return;
        }

        hydrateImportResultAsDocument(res, file, opts);
      } catch (err) {
        reportFileLoadFailure(file.name, err, 'Archivo', {
          file,
          attemptedRecoveryMode: opts?.psdRecoveryMode,
        });
      }
    },
    [hydrateImportResultAsDocument, reportFileLoadFailure]
  );

  const handleConfirmSpritesheetDetectedYes = useCallback(() => {
    if (!pendingSpritesheetPrompt) return;
    const pending = pendingSpritesheetPrompt;
    setPendingSpritesheetPrompt(null);
    setPendingSpritesheetOpen(pending);
  }, [pendingSpritesheetPrompt]);

  const handleConfirmSpritesheetDetectedNo = useCallback(async () => {
    if (!pendingSpritesheetPrompt) return;
    const pending = pendingSpritesheetPrompt;
    setPendingSpritesheetPrompt(null);
    try {
      const res = pending.fallbackSingleResult || (await importGraphicFile(pending.file));
      hydrateImportResultAsDocument(res, pending.file, {
        diskPath: pending.diskPath,
        fileHandle: pending.fileHandle,
        replaceRecentId: pending.replaceRecentId,
      });
    } catch (err) {
      reportFileLoadFailure(pending.fileName, err);
    }
  }, [pendingSpritesheetPrompt, hydrateImportResultAsDocument, reportFileLoadFailure]);

  const handleConfirmSpritesheetSlice = useCallback(
    (options: SpritesheetSliceOptions) => {
      if (!pendingSpritesheetOpen) return;
      const pending = pendingSpritesheetOpen;
      setPendingSpritesheetOpen(null);
      try {
        const sliced = sliceRgbaToSpritesheetResult(pending.rawRaster, options);
        hydrateImportResultAsDocument(sliced, pending.file, {
          diskPath: pending.diskPath,
          fileHandle: pending.fileHandle,
          replaceRecentId: pending.replaceRecentId,
          overrideFormat: 'spritesheet',
        });
      } catch (err) {
        reportFileLoadFailure(pending.fileName, err, 'Spritesheet');
      }
    },
    [pendingSpritesheetOpen, hydrateImportResultAsDocument, reportFileLoadFailure]
  );

  const handleOpenSpritesheetAsSingleImage = useCallback(async () => {
    if (!pendingSpritesheetOpen) return;
    const pending = pendingSpritesheetOpen;
    setPendingSpritesheetOpen(null);
    try {
      const res = pending.fallbackSingleResult || (await importGraphicFile(pending.file));
      hydrateImportResultAsDocument(res, pending.file, {
        diskPath: pending.diskPath,
        fileHandle: pending.fileHandle,
        replaceRecentId: pending.replaceRecentId,
      });
    } catch (err) {
      reportFileLoadFailure(pending.fileName, err);
    }
  }, [pendingSpritesheetOpen, hydrateImportResultAsDocument, reportFileLoadFailure]);

  // Unified File Picker (Rust/Tauri native dialog -> Chromium FileSystemFileHandle -> <input>)
  const handleOpenFilePicker = useCallback(
    async (replaceRecentId?: string) => {
      const desktop = getDesktopBridge();
      if (desktop?.openFileDialog) {
        try {
          const dialogRes = await desktop.openFileDialog({
            title: replaceRecentId
              ? 'Ubicar archivo movido o renombrado'
              : 'Abrir archivo en PixelClash Studio',
          });
          if (dialogRes.canceled || !dialogRes.files || dialogRes.files.length === 0) {
            if (dialogRes.error) {
              reportFileLoadFailure('Archivo local', new Error(dialogRes.error));
            }
            return;
          }
          const picked = dialogRes.files[0];
          const copy = new Uint8Array(picked.bytes.byteLength);
          copy.set(picked.bytes);
          const file = new File([copy.buffer], picked.name, {
            lastModified: picked.lastModified || Date.now(),
          });
          await handleOpenDocumentFile(file, {
            diskPath: picked.filePath,
            replaceRecentId,
          });
          return;
        } catch (err) {
          console.warn('[PixelClash Desktop] Fallback a selector estándar:', err);
        }
      }

      // Top-level Chromium File System Access API (persists live FileSystemFileHandle in IndexedDB)
      const isTopLevelWindow = (() => {
        try {
          return window.self === window.top;
        } catch {
          return false;
        }
      })();
      const winPicker = (
        window as unknown as {
          showOpenFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle[]>;
        }
      ).showOpenFilePicker;

      if (isTopLevelWindow && typeof winPicker === 'function') {
        try {
          const handles = await winPicker({
            multiple: false,
            types: [
              {
                description: 'PixelClash Studio · Imágenes, Animaciones y Proyectos',
                accept: {
                  'image/*': [
                    '.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tif', '.tiff', '.tga', '.ico',
                  ],
                  'application/octet-stream': ['.pcs', '.ase', '.aseprite', '.psd', '.psb'],
                  'application/json': ['.json'],
                },
              },
            ],
            excludeAcceptAllOption: false,
          });
          const handle = handles?.[0];
          if (handle) {
            const file = await handle.getFile();
            await handleOpenDocumentFile(file, {
              fileHandle: handle,
              replaceRecentId,
            });
          }
          return;
        } catch (err: any) {
          if (err?.name === 'AbortError') return;
          // Fall through cleanly to <input type="file"> on SecurityError or unsupported filters
        }
      }

      relocatingRecentIdRef.current = replaceRecentId || null;
      fileInputRef.current?.click();
    },
    [handleOpenDocumentFile, reportFileLoadFailure]
  );

  // =========================================================================
  // ABRIR RECIENTES — Carga completa y verificación real de ruta / contenido
  // Jamás crea un lienzo vacío cuando falta el archivo o falla la carga
  // =========================================================================
  const handleOpenRecentProject = useCallback(
    async (entry: RecentProjectEntry) => {
      try {
        setImportNotification(`Cargando reciente "${entry.name}"...`);

        // 1. Rust/Tauri Desktop: verify real disk path directly before loading
        const desktop = getDesktopBridge();
        if (entry.diskPath && desktop?.readFileAtPath) {
          const diskRes = await desktop.readFileAtPath(entry.diskPath);
          if (!diskRes.exists || !diskRes.bytes) {
            setImportNotification(null);
            setNewProjectModalOpen(false);
            appendStudioLog(`Archivo reciente no encontrado en disco: ${entry.diskPath}`);
            setMissingRecentEntry(entry);
            return;
          }
          const copy = new Uint8Array(diskRes.bytes.byteLength);
          copy.set(diskRes.bytes);
          const diskFile = new File([copy.buffer], diskRes.name || `${entry.name}.${entry.fileFormat || 'pcs'}`, {
            lastModified: diskRes.lastModified || entry.modifiedTimestamp || Date.now(),
          });
          await handleOpenDocumentFile(diskFile, {
            diskPath: diskRes.filePath || entry.diskPath,
            replaceRecentId: entry.id,
            skipSpritesheetPrompt: entry.fileFormat !== 'spritesheet',
          });
          return;
        }

        // 2. IndexedDB persistent payload lookup (handles FileSystemFileHandle, raw File Blob & full Snapshot)
        const payload = await getRecentProjectPayload<OpenDocumentSnapshot>(entry.id);

        // 2a. Live FileSystemFileHandle (verifies file still exists in original location!)
        if (payload?.fileHandle) {
          try {
            const fh = payload.fileHandle as FileSystemFileHandle & {
              queryPermission?: (opts: { mode: string }) => Promise<string>;
              requestPermission?: (opts: { mode: string }) => Promise<string>;
            };
            if (typeof fh.queryPermission === 'function') {
              const perm = await fh.queryPermission({ mode: 'read' });
              if (perm !== 'granted' && typeof fh.requestPermission === 'function') {
                await fh.requestPermission({ mode: 'read' });
              }
            }
            const liveFile = await payload.fileHandle.getFile();
            await handleOpenDocumentFile(liveFile, {
              fileHandle: payload.fileHandle,
              replaceRecentId: entry.id,
              skipSpritesheetPrompt: entry.fileFormat !== 'spritesheet',
            });
            return;
          } catch (handleErr: any) {
            if (handleErr?.name === 'NotFoundError') {
              // File was moved or deleted from its original location!
              setImportNotification(null);
              setNewProjectModalOpen(false);
              appendStudioLog(`Archivo reciente movido o eliminado: ${entry.path || entry.name}`);
              setMissingRecentEntry(entry);
              return;
            }
            // If permission was denied or handle expired, fall through to stored snapshot/blob
          }
        }

        // 2b. Full validated snapshot persisted in IndexedDB (exact layers, frames, guides, palettes & settings)
        if (payload?.snapshot && Array.isArray(payload.snapshot.frames) && payload.snapshot.frames.length > 0) {
          const openedInNewTab = hydrateOpenedDocumentSnapshot(
            payload.snapshot,
            entry.category || 'Proyecto Reciente'
          );
          recordRecentProject({
            name: payload.snapshot.name,
            width: payload.snapshot.width,
            height: payload.snapshot.height,
            frames: payload.snapshot.frames,
            layerGroups: payload.snapshot.layerGroups,
            category: entry.category,
            path: entry.path,
            diskPath: entry.diskPath,
            fileFormat: entry.fileFormat,
            modifiedTimestamp: entry.modifiedTimestamp || payload.fileLastModified || payload.updatedAt,
            fileSize: entry.fileSize,
            snapshot: payload.snapshot,
            fileBlob: payload.fileBlob,
            fileName: payload.fileName,
            fileHandle: payload.fileHandle,
            replaceRecentId: entry.id,
          });
          setNewProjectModalOpen(false);
          setHomeScreenOpen(false);
          setImportNotification(
            `Proyecto reciente abierto${openedInNewTab ? ' en nueva pestaña' : ''}: "${payload.snapshot.name}" (${payload.snapshot.width}×${payload.snapshot.height} px · ${payload.snapshot.frames.length} fotograma(s))`
          );
          setTimeout(() => setImportNotification(null), 3600);
          return;
        }

        // 2c. Original File Blob persisted in IndexedDB -> execute exact same unified open pipeline!
        if (payload?.fileBlob) {
          const reconstructedFile = new File(
            [payload.fileBlob],
            payload.fileName || `${entry.name}.${entry.fileFormat || 'png'}`,
            {
              type: payload.fileMime || payload.fileBlob.type,
              lastModified: payload.fileLastModified || entry.modifiedTimestamp || Date.now(),
            }
          );
          await handleOpenDocumentFile(reconstructedFile, {
            replaceRecentId: entry.id,
            skipSpritesheetPrompt: entry.fileFormat !== 'spritesheet',
          });
          return;
        }

        // 2d. Legacy localStorage snapshot fallback (auto-migrates to IndexedDB)
        const snapsMap = readRecentSnapshotsMap();
        const legacySnap = snapsMap[entry.id];
        if (legacySnap && Array.isArray(legacySnap.frames) && legacySnap.frames.length > 0) {
          const openedInNewTab = hydrateOpenedDocumentSnapshot(
            legacySnap,
            entry.category || 'Proyecto Reciente'
          );
          recordRecentProject({
            name: legacySnap.name,
            width: legacySnap.width,
            height: legacySnap.height,
            frames: legacySnap.frames,
            layerGroups: legacySnap.layerGroups,
            category: entry.category,
            path: entry.path,
            fileFormat: entry.fileFormat,
            modifiedTimestamp: entry.modifiedTimestamp || Date.now(),
            snapshot: legacySnap,
            replaceRecentId: entry.id,
          });
          setNewProjectModalOpen(false);
          setHomeScreenOpen(false);
          setImportNotification(
            `Proyecto reciente restaurado${openedInNewTab ? ' en nueva pestaña' : ''}: "${legacySnap.name}" (${legacySnap.width}×${legacySnap.height} px)`
          );
          setTimeout(() => setImportNotification(null), 3500);
          return;
        }

        // 3. File content not found in original location or storage -> NEVER create an empty canvas!
        setImportNotification(null);
        setNewProjectModalOpen(false);
        appendStudioLog(
          `El archivo reciente "${entry.name}" (${entry.path || 'sin ruta'}) no se encuentra en su ubicación original.`
        );
        setMissingRecentEntry(entry);
      } catch (err) {
        reportFileLoadFailure(entry.name, err, entry.category || 'Archivo Reciente');
      }
    },
    [
      appendStudioLog,
      handleOpenDocumentFile,
      hydrateOpenedDocumentSnapshot,
      recordRecentProject,
      reportFileLoadFailure,
    ]
  );

  const handleSwitchDocumentTab = useCallback(
    (targetDocId: string) => {
      if (targetDocId === activeDocumentId) return;
      const targetDoc = openDocuments.find((d) => d.id === targetDocId);
      if (!targetDoc || !targetDoc.snapshot) return;
      const currentSnap = buildCurrentDocumentSnapshot();
      const snapToLoad = targetDoc.snapshot;
      setOpenDocuments((prev) =>
        prev.map((d) => {
          if (d.id === activeDocumentId) {
            return { ...d, name: currentSnap.name, width: currentSnap.width, height: currentSnap.height, snapshot: currentSnap };
          }
          if (d.id === targetDocId) {
            return { ...d, snapshot: null };
          }
          return d;
        })
      );
      setActiveDocumentId(targetDocId);
      applyDocumentSnapshot(snapToLoad);
    },
    [activeDocumentId, openDocuments, buildCurrentDocumentSnapshot, applyDocumentSnapshot]
  );

  const createFreshBlankDocumentSnapshot = useCallback(
    (name: string = 'Nuevo Proyecto', w: number = 64, h: number = 64): OpenDocumentSnapshot => ({
      name,
      width: w,
      height: h,
      frames: [
        {
          id: `frame-blank-${Date.now()}`,
          name: 'Frame 1',
          durationTicks: 4,
          durationMs: 83,
          phase: 'neutral',
          layers: [
            {
              id: `layer-blank-${Date.now()}`,
              name: 'Capa 1',
              visible: true,
              locked: false,
              opacity: 1,
              fillOpacity: 1,
              blendMode: 'normal',
              pixels: createEmptyGrid(w, h),
            },
          ],
          hitboxes: [],
        },
      ],
      currentFrameIndex: 0,
      currentLayerIndex: 0,
      layerGroups: [],
      globalPivot: { x: Math.floor(w / 2), y: Math.floor(h * 0.8) },
      actionTags: [],
      playbackMode: 'loop',
      fps: 12,
      references: [],
      referenceGroups: [],
      timelineMarkers: [],
      cameraShake: { ...cameraShake },
      cameraKeyframes: [],
      activePaletteColors: [...activePaletteColors],
      guides: [],
      workMode: 'fighter',
    }),
    [cameraShake, activePaletteColors]
  );

  const forceCloseDocumentTab = useCallback(
    (docId: string) => {
      const docs = openDocumentsRef.current;
      const idx = docs.findIndex((d) => d.id === docId);
      if (idx < 0) return;

      if (docs.length <= 1) {
        // Closing the final open tab resets workspace cleanly to a fresh blank document tab
        const blankSnap = createFreshBlankDocumentSnapshot('Proyecto 1', 64, 64);
        const freshId = `doc-blank-${Date.now()}`;
        setOpenDocuments([
          {
            id: freshId,
            name: blankSnap.name,
            width: blankSnap.width,
            height: blankSnap.height,
            snapshot: null,
            isDirty: false,
            isNewUnsaved: true,
            hasSavedLocation: false,
          },
        ]);
        activeDocumentIdRef.current = freshId;
        setActiveDocumentId(freshId);
        applyDocumentSnapshot(blankSnap);
        return;
      }

      const remaining = docs.filter((d) => d.id !== docId);
      if (docId === activeDocumentIdRef.current) {
        const nextActive = remaining[Math.max(0, idx - 1)] || remaining[0];
        if (nextActive?.snapshot) {
          applyDocumentSnapshot(nextActive.snapshot);
        }
        activeDocumentIdRef.current = nextActive.id;
        setActiveDocumentId(nextActive.id);
        setOpenDocuments(
          remaining.map((d) => (d.id === nextActive.id ? { ...d, snapshot: null } : d))
        );
      } else {
        setOpenDocuments(remaining);
      }
    },
    [applyDocumentSnapshot, createFreshBlankDocumentSnapshot]
  );

  const handleRequestCloseDocumentTab = useCallback(
    (docId: string) => {
      const doc = openDocumentsRef.current.find((d) => d.id === docId);
      if (!doc) return;
      if (doc.isDirty) {
        setPendingCloseDocId(docId);
      } else {
        forceCloseDocumentTab(docId);
      }
    },
    [forceCloseDocumentTab]
  );

  const handleCloseDocumentTab = handleRequestCloseDocumentTab;

  const handleReorderDocumentTabs = useCallback((draggedId: string, targetId: string) => {
    if (!draggedId || !targetId || draggedId === targetId) return;
    setOpenDocuments((prev) => {
      const fromIdx = prev.findIndex((d) => d.id === draggedId);
      const toIdx = prev.findIndex((d) => d.id === targetId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  const buildProjectStateForDocument = useCallback(
    (doc: DocumentTabEntry, overrideName?: string): ProjectState => {
      const isLive = doc.id === activeDocumentIdRef.current || !doc.snapshot;
      const snap = isLive ? null : doc.snapshot;
      return {
        name: overrideName || (isLive ? projectName : snap!.name),
        width: isLive ? canvasWidth : snap!.width,
        height: isLive ? canvasHeight : snap!.height,
        frames: isLive ? framesRef.current : snap!.frames,
        clips,
        actionTags: isLive ? actionTagsRef.current : snap!.actionTags || [],
        layerGroups: isLive ? layerGroupsRef.current : snap!.layerGroups || [],
        activeClipId,
        activeActionTagId,
        currentFrameIndex: isLive ? currentFrameIndexRef.current : snap!.currentFrameIndex || 0,
        currentLayerIndex: isLive ? currentLayerIndexRef.current : snap!.currentLayerIndex || 0,
        primaryColor,
        primaryAlpha,
        secondaryColor,
        secondaryAlpha,
        activeTool,
        brushSize,
        pixelPerfect,
        ditherPattern,
        activeHitboxType,
        symmetryEnabled,
        symmetryAxis,
        showGrid,
        showHitboxes,
        showPivot,
        globalPivot: isLive ? globalPivot : snap!.globalPivot,
        stageType,
        stageOpacity,
        groundConfig,
        dummyOpponent,
        combatFx,
        cameraShake: isLive ? cameraShake : snap!.cameraShake || cameraShake,
        cameraKeyframes: isLive ? cameraKeyframesRef.current : snap!.cameraKeyframes || [],
        onionSkinEnabled,
        onionSkinPrev,
        onionSkinNext,
        onionSkinOpacity,
        playbackMode: isLive ? playbackMode : snap!.playbackMode || 'loop',
        activeGroupId,
        isolateActiveGroup,
        brushSettings,
        activePaletteColors: isLive ? activePaletteColors : snap!.activePaletteColors || activePaletteColors,
        fps: isLive ? animationFps : snap!.fps || 12,
        references: isLive ? referencesRef.current : snap!.references || [],
        referenceGroups: isLive ? referenceGroupsRef.current : snap!.referenceGroups || [],
        timelineMarkers: isLive ? timelineMarkersRef.current : snap!.timelineMarkers || [],
        guides: isLive ? guidesRef.current : snap!.guides || [],
        workMode: isLive ? workMode : snap!.workMode || 'fighter',
      };
    },
    [
      projectName, canvasWidth, canvasHeight, clips, activeClipId, activeActionTagId,
      primaryColor, primaryAlpha, secondaryColor, secondaryAlpha, activeTool, brushSize,
      pixelPerfect, ditherPattern, activeHitboxType, symmetryEnabled, symmetryAxis,
      showGrid, showHitboxes, showPivot, globalPivot, stageType, stageOpacity,
      groundConfig, dummyOpponent, combatFx, cameraShake, onionSkinEnabled, onionSkinPrev,
      onionSkinNext, onionSkinOpacity, playbackMode, activeGroupId, isolateActiveGroup,
      brushSettings, activePaletteColors, animationFps, workMode,
    ]
  );

  const handleSaveDocumentInFormat = useCallback(
    async (
      docId: string,
      format: SaveAsFormatId,
      opts?: { fileName?: string; scale?: number; jpgBackgroundColor?: string; silent?: boolean }
    ): Promise<boolean> => {
      const doc = openDocumentsRef.current.find((d) => d.id === docId);
      if (!doc) return false;
      try {
        const cleanTitle = (opts?.fileName || doc.name || 'Proyecto').trim();
        const projectObj = buildProjectStateForDocument(doc, cleanTitle);
        const exported = await exportProjectToFormat(projectObj, format, {
          fileName: cleanTitle,
          scale: opts?.scale ?? 1,
          jpgBackgroundColor: opts?.jpgBackgroundColor,
          currentFrameIndex: projectObj.currentFrameIndex,
        });
        downloadBlob(exported.blob, exported.filename);
        markDocumentSaved(docId, format, cleanTitle);

        const recFmt: RecentProjectFileFormat =
          format === 'spritesheet' ? 'png' : format === 'animation' ? 'json' : format;
        const snapForRec: OpenDocumentSnapshot =
          doc.id === activeDocumentIdRef.current
            ? { ...buildCurrentDocumentSnapshot(), name: cleanTitle }
            : { ...(doc.snapshot || buildCurrentDocumentSnapshot()), name: cleanTitle };
        recordRecentProject({
          name: cleanTitle,
          width: projectObj.width,
          height: projectObj.height,
          frames: projectObj.frames,
          layerGroups: projectObj.layerGroups,
          category: format.toUpperCase(),
          path: `Proyectos/${exported.filename}`,
          fileFormat: recFmt,
          fileSize: exported.blob.size,
          snapshot: snapForRec,
          fileBlob: exported.blob,
          fileName: exported.filename,
        });

        if (!opts?.silent) {
          setImportNotification(`Guardado correctamente: ${exported.filename}`);
          setTimeout(() => setImportNotification(null), 3500);
        }
        return true;
      } catch (err: any) {
        setImportNotification(`Error al guardar documento: ${err?.message || 'Error desconocido'}`);
        setTimeout(() => setImportNotification(null), 4500);
        return false;
      }
    },
    [buildProjectStateForDocument, buildCurrentDocumentSnapshot, markDocumentSaved, recordRecentProject]
  );

  const handleOpenSaveAsModal = useCallback(
    (
      docId?: string,
      afterSaveAction: 'close_doc' | 'batch_close_queue' | 'review_next' | null = null,
      queueLabel: string | null = null
    ) => {
      const targetId = docId || activeDocumentIdRef.current;
      const doc = openDocumentsRef.current.find((d) => d.id === targetId);
      const nameToUse = doc ? doc.name : projectName;
      const fmtToUse: SaveAsFormatId = doc?.savedFormat || 'pcs';
      setSaveAsModalState({
        docId: targetId,
        initialName: nameToUse,
        initialFormat: fmtToUse,
        afterSaveAction,
        queueLabel,
      });
    },
    [projectName]
  );

  // Smart Save (Ctrl+S): If document has no saved location yet, opens "Guardar como..." format dialog;
  // otherwise saves directly in its saved format and clears the dirty indicator (*).
  const handleSmartSave = useCallback(async () => {
    const activeId = activeDocumentIdRef.current;
    const doc = openDocumentsRef.current.find((d) => d.id === activeId);
    if (!doc || !doc.hasSavedLocation) {
      handleOpenSaveAsModal(activeId, null);
      return;
    }
    const fmt: SaveAsFormatId = doc.savedFormat || 'pcs';
    if (fmt === 'pcs') {
      await handleSaveProjectPcs();
    } else {
      await handleSaveDocumentInFormat(activeId, fmt);
    }
  }, [handleOpenSaveAsModal, handleSaveProjectPcs, handleSaveDocumentInFormat]);

  const completeAllDocumentsClose = useCallback(
    (overrideDesktopExit?: boolean) => {
      setUnsavedAppCloseModalOpen(false);
      setReviewCloseSession(null);
      setBatchSaveAsQueue(null);
      const useDesktopExit =
        typeof overrideDesktopExit === 'boolean'
          ? overrideDesktopExit
          : isAppClosingFromDesktop;
      setIsAppClosingFromDesktop(false);

      const bridge = getDesktopBridge();
      if (useDesktopExit && bridge?.confirmAppClose) {
        void bridge.confirmAppClose();
        return;
      }

      const blankSnap = createFreshBlankDocumentSnapshot('Proyecto 1', 64, 64);
      const freshId = `doc-blank-${Date.now()}`;
      setOpenDocuments([
        {
          id: freshId,
          name: blankSnap.name,
          width: blankSnap.width,
          height: blankSnap.height,
          snapshot: null,
          isDirty: false,
          isNewUnsaved: true,
          hasSavedLocation: false,
        },
      ]);
      activeDocumentIdRef.current = freshId;
      setActiveDocumentId(freshId);
      applyDocumentSnapshot(blankSnap);
      setHomeScreenOpen(true);
      setImportNotification('Todos los documentos cerrados de forma segura.');
      setTimeout(() => setImportNotification(null), 2800);
    },
    [isAppClosingFromDesktop, applyDocumentSnapshot, createFreshBlankDocumentSnapshot]
  );

  const handleRequestCloseAllDocuments = useCallback(
    (fromDesktopExit: boolean = Boolean(getDesktopBridge()?.isNativeDesktop)) => {
      const dirtyDocs = openDocumentsRef.current.filter((d) => d.isDirty);
      if (dirtyDocs.length === 0) {
        completeAllDocumentsClose(fromDesktopExit);
        return;
      }
      setIsAppClosingFromDesktop(fromDesktopExit);
      setUnsavedAppCloseModalOpen(true);
    },
    [completeAllDocumentsClose]
  );

  const handleStartReviewOneByOne = useCallback(
    (docIds: string[]) => {
      const cleanIds = docIds.filter((id) =>
        openDocumentsRef.current.some((d) => d.id === id && d.isDirty)
      );
      setUnsavedAppCloseModalOpen(false);
      if (cleanIds.length === 0) {
        completeAllDocumentsClose();
        return;
      }
      setReviewCloseSession({
        docIds: cleanIds,
        currentIndex: 0,
        fromDesktopExit: isAppClosingFromDesktop,
      });
    },
    [completeAllDocumentsClose, isAppClosingFromDesktop]
  );

  const handleBatchSaveSelectedAndClose = useCallback(
    async (selectedIds: string[]) => {
      if (selectedIds.length === 0) {
        completeAllDocumentsClose();
        return;
      }
      setIsBatchSavingDocs(true);
      try {
        const docsWithLoc: string[] = [];
        const docsWithoutLoc: string[] = [];
        for (const docId of selectedIds) {
          const doc = openDocumentsRef.current.find((d) => d.id === docId);
          if (!doc) continue;
          if (doc.hasSavedLocation) docsWithLoc.push(docId);
          else docsWithoutLoc.push(docId);
        }

        let savedNow = 0;
        for (const docId of docsWithLoc) {
          const doc = openDocumentsRef.current.find((d) => d.id === docId);
          if (!doc) continue;
          const ok = await handleSaveDocumentInFormat(docId, doc.savedFormat || 'pcs', {
            silent: true,
          });
          if (ok) savedNow++;
        }

        if (docsWithoutLoc.length === 0) {
          setImportNotification(`${savedNow} documento(s) guardados antes de cerrar.`);
          setTimeout(() => setImportNotification(null), 3200);
          completeAllDocumentsClose();
          return;
        }

        // Documents without path/location -> open Guardar Como... automatically one by one
        const firstId = docsWithoutLoc[0];
        const firstDoc = openDocumentsRef.current.find((d) => d.id === firstId);
        setUnsavedAppCloseModalOpen(false);
        setBatchSaveAsQueue({
          remainingDocIds: docsWithoutLoc.slice(1),
          savedCount: savedNow,
          totalNewLocationCount: docsWithoutLoc.length,
          fromDesktopExit: isAppClosingFromDesktop,
        });
        handleOpenSaveAsModal(
          firstId,
          'batch_close_queue',
          `${firstDoc?.name || 'Documento'} (1 de ${docsWithoutLoc.length})`
        );
      } finally {
        setIsBatchSavingDocs(false);
      }
    },
    [
      handleSaveDocumentInFormat,
      completeAllDocumentsClose,
      handleOpenSaveAsModal,
      isAppClosingFromDesktop,
    ]
  );

  const handleMinimizeWindow = useCallback(() => {
    const bridge = getDesktopBridge();
    if (bridge?.windowMinimize) {
      void bridge.windowMinimize();
      return;
    }
    setIsWindowMinimized(true);
  }, []);

  const handleToggleMaximizeWindow = useCallback(() => {
    const bridge = getDesktopBridge();
    if (bridge?.windowToggleMaximize) {
      void Promise.resolve(bridge.windowToggleMaximize())
        .then((res) => {
          if (typeof res?.maximized === 'boolean') {
            setIsWindowMaximized(res.maximized);
          }
        })
        .catch(() => {
          // Keep current state if native maximize failed
        });
      return;
    }

    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitFullscreenEnabled?: boolean;
      webkitExitFullscreen?: () => Promise<void> | void;
    };
    const rootEl = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };
    const currentFullscreen = Boolean(document.fullscreenElement || doc.webkitFullscreenElement);

    if (!currentFullscreen) {
      const canRequest = Boolean(rootEl.requestFullscreen || rootEl.webkitRequestFullscreen);
      const allowed = document.fullscreenEnabled ?? doc.webkitFullscreenEnabled ?? canRequest;
      if (!canRequest || !allowed) {
        setIsWindowMaximized(false);
        setImportNotification('El navegador bloqueó pantalla completa en este visor; usa F11 o abre en una pestaña independiente.');
        setTimeout(() => setImportNotification(null), 3500);
        return;
      }
      const reqPromise = rootEl.requestFullscreen
        ? rootEl.requestFullscreen()
        : Promise.resolve(rootEl.webkitRequestFullscreen?.());
      Promise.resolve(reqPromise)
        .then(() => {
          setIsWindowMaximized(true);
        })
        .catch(() => {
          setIsWindowMaximized(Boolean(document.fullscreenElement || doc.webkitFullscreenElement));
          setImportNotification('No se pudo activar pantalla completa automáticamente; prueba pulsar F11.');
          setTimeout(() => setImportNotification(null), 3200);
        });
    } else {
      const exitPromise = document.exitFullscreen
        ? document.exitFullscreen()
        : Promise.resolve(doc.webkitExitFullscreen?.());
      Promise.resolve(exitPromise)
        .then(() => {
          setIsWindowMaximized(false);
        })
        .catch(() => {
          setIsWindowMaximized(Boolean(document.fullscreenElement || doc.webkitFullscreenElement));
        });
    }
  }, []);

  const handleCloseApplicationWindow = useCallback(() => {
    const bridge = getDesktopBridge();
    handleRequestCloseAllDocuments(Boolean(bridge?.isNativeDesktop));
  }, [handleRequestCloseAllDocuments]);

  useEffect(() => {
    const bridge = getDesktopBridge();
    let unsubMax: (() => void) | undefined;
    if (bridge?.isWindowMaximized) {
      void Promise.resolve(bridge.isWindowMaximized()).then((res) => {
        if (typeof res?.maximized === 'boolean') {
          setIsWindowMaximized(res.maximized);
          if (!res.maximized && loadStartupPreferences().startMaximized && bridge.windowToggleMaximize) {
            void Promise.resolve(bridge.windowToggleMaximize()).then((maxRes) => {
              if (typeof maxRes?.maximized === 'boolean') {
                setIsWindowMaximized(maxRes.maximized);
              }
            });
          }
        }
      });
    }
    if (bridge?.onWindowMaximizeChange) {
      unsubMax = bridge.onWindowMaximizeChange((val) => setIsWindowMaximized(val));
    }
    const onFullscreenChange = () => {
      if (!bridge?.isNativeDesktop) {
        const doc = document as Document & { webkitFullscreenElement?: Element | null };
        setIsWindowMaximized(Boolean(document.fullscreenElement || doc.webkitFullscreenElement));
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    return () => {
      if (typeof unsubMax === 'function') unsubMax();
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    };
  }, []);

  // Sync unsaved dirty state to Rust/Tauri window + browser beforeunload + desktop exit listener
  const hasAnyDirtyDocument = useMemo(
    () => openDocuments.some((d) => d.isDirty),
    [openDocuments]
  );

  useEffect(() => {
    void getDesktopBridge()?.setUnsavedState?.(hasAnyDirtyDocument);
  }, [hasAnyDirtyDocument]);

  useEffect(() => {
    if (!hasAnyDirtyDocument) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasAnyDirtyDocument]);

  useEffect(() => {
    const bridge = getDesktopBridge();
    if (!bridge?.onRequestAppClose) return;
    const unsub = bridge.onRequestAppClose(() => {
      handleRequestCloseAllDocuments(true);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [handleRequestCloseAllDocuments]);

  // =========================================================================
  // GLOBAL OS CLIPBOARD INTEGRATION (Transparent RGBA Paste, Auto-Checkerboard,
  // Smart Paste Modal / Quick Paste, Paste as Reference, New from Clipboard)
  // =========================================================================
  const applyAutoCheckerboardIfTransparent = useCallback(
    (pastedHasTransparency: boolean) => {
      if (!pastedHasTransparency || stageType === 'checkerboard') return;
      const curFrame = framesRef.current[currentFrameIndexRef.current];
      if (!curFrame) return;
      const composed = compositeFrame(
        curFrame,
        canvasWidth,
        canvasHeight,
        currentFrameIndexRef.current,
        false,
        layerGroupsRef.current
      );
      if (gridHasTransparency(composed, canvasWidth, canvasHeight)) {
        setStageType('checkerboard');
      }
    },
    [stageType, canvasWidth, canvasHeight]
  );

  const executeClipboardImagePaste = useCallback(
    (
      payload: ClipboardImagePayload,
      destination: ClipboardPasteDestination,
      fitMode: ClipboardFitMode
    ) => {
      const now = Date.now();
      const labelBase = `Portapapeles ${payload.formatLabel}`;

      if (destination === 'new_document') {
        const w = payload.width;
        const h = payload.height;
        const exactGrid = rgbaBufferToPixelGrid(payload.rgba.data, w, h).grid;
        const newSnap: OpenDocumentSnapshot = {
          name: `Portapapeles ${w}×${h}`,
          width: w,
          height: h,
          frames: [
            {
              id: `frame-clip-${now}`,
              name: 'Frame 1',
              durationTicks: 4,
              durationMs: 83,
              phase: 'neutral',
              layers: [
                {
                  id: `layer-clip-${now}`,
                  name: labelBase,
                  visible: true,
                  locked: false,
                  opacity: 1,
                  fillOpacity: 1,
                  blendMode: 'normal',
                  pixels: exactGrid,
                },
              ],
              hitboxes: [],
            },
          ],
          currentFrameIndex: 0,
          currentLayerIndex: 0,
          layerGroups: [],
          globalPivot: { x: Math.floor(w / 2), y: Math.floor(h * 0.8) },
          actionTags: [],
          playbackMode: 'loop',
          fps: 12,
          references: [],
          referenceGroups: [],
          timelineMarkers: [],
          cameraShake: { ...cameraShake },
          cameraKeyframes: [],
          activePaletteColors: [...activePaletteColors],
          guides: [],
          workMode: 'fighter',
        };
        hydrateOpenedDocumentSnapshot(newSnap, payload.formatLabel, {
          isDirty: true,
          isNewUnsaved: true,
          hasSavedLocation: false,
        });
        if (payload.hasTransparency) {
          setStageType('checkerboard');
        }
        setImportNotification(
          `Nuevo documento creado desde portapapeles (${w}×${h} px${payload.hasTransparency ? ' · RGBA transparente' : ''}).`
        );
        setTimeout(() => setImportNotification(null), 3500);
        return;
      }

      if (destination === 'reference_canvas' || destination === 'reference_panel') {
        const anchorMode = destination === 'reference_panel' ? 'camera' : 'canvas';
        const newRef: ReferenceItem = {
          id: `ref-clip-${now}-${Math.random().toString(36).slice(2, 5)}`,
          name: `${labelBase} (${payload.width}×${payload.height})`,
          dataUrl: payload.dataUrl,
          naturalWidth: payload.width,
          naturalHeight: payload.height,
          groupId: null,
          visible: true,
          locked: false,
          opacity: destination === 'reference_panel' ? 1 : 0.78,
          blendMode: 'normal',
          scale: 1,
          rotation: 0,
          flipX: false,
          flipY: false,
          x: anchorMode === 'camera' ? 200 : 0,
          y: anchorMode === 'camera' ? -20 : 0,
          boardX: 30,
          boardY: 28,
          boardScale: 1,
          boardRotation: 0,
          anchor: anchorMode,
          useAsAiGuide: false,
        };
        const nextRefs = [newRef, ...referencesRef.current];
        referencesRef.current = nextRefs;
        setReferences(nextRefs);
        setActiveReferenceId(newRef.id);
        pushHistorySnapshot({ references: nextRefs });
        if (destination === 'reference_panel') {
          handleFocusPanel('references');
        }
        setImportNotification(
          destination === 'reference_panel'
            ? `Imagen pegada en el Panel de Referencias (${payload.width}×${payload.height} px).`
            : `Imagen pegada como Referencia sobre el lienzo (${payload.width}×${payload.height} px).`
        );
        setTimeout(() => setImportNotification(null), 3200);
        return;
      }

      if (destination === 'asset_library') {
        const assetGrid = rasterizeClipboardImageToGrid(payload, canvasWidth, canvasHeight, fitMode);
        const newAsset: AssetLibraryItem = {
          id: `asset-clip-${now}`,
          name: `${labelBase} ${payload.width}×${payload.height}`,
          category: 'character',
          origin: 'user',
          width: canvasWidth,
          height: canvasHeight,
          pixels: assetGrid,
          createdAt: new Date().toISOString(),
          folder: 'Mis Uploads',
          tags: ['portapapeles'],
          mediaDataUrl: payload.dataUrl,
        };
        const nextAssets = [newAsset, ...userLibraryItemsRef.current];
        userLibraryItemsRef.current = nextAssets;
        setUserLibraryItems(nextAssets);
        pushHistorySnapshot({ userLibraryItems: nextAssets });
        handleFocusPanel('library');
        setImportNotification(`Imagen pegada como Asset en la librería (${payload.width}×${payload.height} px).`);
        setTimeout(() => setImportNotification(null), 3200);
        return;
      }

      // Layer-based destinations ('new_layer', 'selected_group', 'current_frame', 'all_frames')
      // STRICT SAFETY: NEVER overwrite existing layers, strictly preserve alpha transparency.
      const grid = rasterizeClipboardImageToGrid(payload, canvasWidth, canvasHeight, fitMode);
      const curFIdx = currentFrameIndexRef.current;
      const curLIdx = currentLayerIndexRef.current;
      const activeFrame = framesRef.current[curFIdx];
      const activeLayer = activeFrame?.layers[curLIdx];
      const targetGroupId =
        destination === 'selected_group'
          ? activeLayer?.groupId ?? activeGroupId ?? null
          : destination === 'new_layer'
          ? null
          : activeLayer?.groupId ?? activeGroupId ?? null;

      applyAutoCheckerboardIfTransparent(payload.hasTransparency);

      if (destination === 'all_frames') {
        const updatedFrames = framesRef.current.map((fr, idx) => ({
          ...fr,
          layers: [
            ...fr.layers,
            {
              id: `layer-clip-all-${now}-${idx}`,
              name: `${labelBase}`,
              visible: true,
              locked: false,
              opacity: 1,
              fillOpacity: 1,
              blendMode: 'normal' as const,
              groupId: targetGroupId,
              pixels: grid.map((r) => [...r]),
            },
          ],
        }));
        const nextLayerIdx = updatedFrames[curFIdx].layers.length - 1;
        framesRef.current = updatedFrames;
        setFrames(updatedFrames);
        currentLayerIndexRef.current = nextLayerIdx;
        setCurrentLayerIndex(nextLayerIdx);
        setSelectedLayerIndices([nextLayerIdx]);
        pushHistorySnapshot({ frames: updatedFrames, currentLayerIndex: nextLayerIdx });
        setImportNotification(
          `Imagen pegada en nueva capa en los ${updatedFrames.length} frames (${payload.width}×${payload.height} px).`
        );
        setTimeout(() => setImportNotification(null), 3200);
        return;
      }

      // 'new_layer' | 'selected_group' | 'current_frame'
      const insertAt = Math.min(
        (activeFrame?.layers.length ?? 0),
        curLIdx + 1
      );
      const updatedFrames = framesRef.current.map((fr, fIdx) => {
        if (fIdx !== curFIdx) return fr;
        const newLayer: Layer = {
          id: `layer-clip-${now}`,
          name: `${labelBase}`,
          visible: true,
          locked: false,
          opacity: 1,
          fillOpacity: 1,
          blendMode: 'normal',
          groupId: targetGroupId,
          pixels: grid,
        };
        const nextLayers = [...fr.layers];
        nextLayers.splice(insertAt, 0, newLayer);
        return { ...fr, layers: nextLayers };
      });
      framesRef.current = updatedFrames;
      setFrames(updatedFrames);
      currentLayerIndexRef.current = insertAt;
      setCurrentLayerIndex(insertAt);
      setSelectedLayerIndices([insertAt]);
      pushHistorySnapshot({ frames: updatedFrames, currentLayerIndex: insertAt });
      const groupInfo = targetGroupId
        ? ` en grupo "${layerGroupsRef.current.find((g) => g.id === targetGroupId)?.name || 'Carpeta'}"`
        : '';
      setImportNotification(
        `Imagen pegada en nueva capa${groupInfo} (${payload.width}×${payload.height} px${payload.hasTransparency ? ' · RGBA' : ''}).`
      );
      setTimeout(() => setImportNotification(null), 3200);
    },
    [
      canvasWidth,
      canvasHeight,
      activeGroupId,
      cameraShake,
      activePaletteColors,
      hydrateOpenedDocumentSnapshot,
      applyAutoCheckerboardIfTransparent,
      pushHistorySnapshot,
      handleFocusPanel,
    ]
  );

  const handleIncomingClipboardImage = useCallback(
    (payload: ClipboardImagePayload) => {
      if (quickPasteMode) {
        const autoFit: ClipboardFitMode =
          payload.width <= canvasWidth && payload.height <= canvasHeight ? 'original' : 'fit';
        executeClipboardImagePaste(payload, 'selected_group', autoFit);
      } else {
        setPendingClipboardImage(payload);
      }
    },
    [quickPasteMode, canvasWidth, canvasHeight, executeClipboardImagePaste]
  );

  const handleSmartGlobalPaste = useCallback(
    async (inPlace: boolean = false) => {
      if (inPlace && clipboard) {
        handlePasteClipboard(true, true);
        return;
      }
      const osImage = await readImageFromGlobalClipboard();
      if (osImage) {
        const sig = computeRgbaQuickSignature(osImage.rgba.data, osImage.width, osImage.height);
        if (clipboard && lastInternalCopySigRef.current && sig === lastInternalCopySigRef.current) {
          handlePasteClipboard(inPlace, true);
        } else {
          handleIncomingClipboardImage(osImage);
        }
        return;
      }
      if (clipboard) {
        handlePasteClipboard(inPlace, true);
      } else {
        setImportNotification('El portapapeles no contiene ninguna imagen ni capa copiada.');
        setTimeout(() => setImportNotification(null), 2800);
      }
    },
    [clipboard, handlePasteClipboard, handleIncomingClipboardImage]
  );

  const handlePasteAsReference = useCallback(async () => {
    const osImage = await readImageFromGlobalClipboard();
    if (osImage) {
      executeClipboardImagePaste(osImage, 'reference_canvas', 'original');
      return;
    }
    setImportNotification('No se detectó ninguna imagen en el portapapeles del sistema.');
    setTimeout(() => setImportNotification(null), 2800);
  }, [executeClipboardImagePaste]);

  const handleNewDocumentFromClipboard = useCallback(async () => {
    const osImage = await readImageFromGlobalClipboard();
    if (osImage) {
      executeClipboardImagePaste(osImage, 'new_document', 'original');
      return;
    }
    setImportNotification('No se detectó ninguna imagen en el portapapeles del sistema.');
    setTimeout(() => setImportNotification(null), 2800);
  }, [executeClipboardImagePaste]);

  // Global OS native 'paste' event listener (Ctrl+V from Chrome, Photoshop, Aseprite, Krita,
  // File Explorer, Screenshots, Discord, WhatsApp, etc.)
  useEffect(() => {
    const onGlobalPaste = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const eventImage = await readImageFromClipboardEvent(e);
      if (eventImage) {
        e.preventDefault();
        const sig = computeRgbaQuickSignature(eventImage.rgba.data, eventImage.width, eventImage.height);
        if (clipboard && lastInternalCopySigRef.current && sig === lastInternalCopySigRef.current) {
          handlePasteClipboard(false, true);
        } else {
          handleIncomingClipboardImage(eventImage);
        }
        return;
      }

      // If Rust/Tauri native clipboard holds an image that Chromium didn't expose in ClipboardEvent
      const desktopImg = await readImageFromGlobalClipboard();
      if (desktopImg) {
        e.preventDefault();
        const sig = computeRgbaQuickSignature(desktopImg.rgba.data, desktopImg.width, desktopImg.height);
        if (clipboard && lastInternalCopySigRef.current && sig === lastInternalCopySigRef.current) {
          handlePasteClipboard(false, true);
        } else {
          handleIncomingClipboardImage(desktopImg);
        }
        return;
      }

      // Fallback to internal PixelClash layer/selection clipboard
      if (clipboard) {
        e.preventDefault();
        handlePasteClipboard(false, true);
      }
    };

    window.addEventListener('paste', onGlobalPaste);
    return () => window.removeEventListener('paste', onGlobalPaste);
  }, [clipboard, handlePasteClipboard, handleIncomingClipboardImage]);

  // =========================================================================
  // IMPORTAR AL PROYECTO ACTUAL (1:1 exacto + control de resolución distinta)
  // =========================================================================
  const executeImportIntoProject = useCallback(
    async (
      files: File[],
      mode: ImportMenuMode,
      fitMode: SmartImportFitMode = 'original',
      interpolation: InterpolationMode = 'nearest',
      skipMismatchPrompt: boolean = false,
      overrideTargetSize?: { width: number; height: number }
    ) => {
      if (!files || files.length === 0) return;

      if (mode === 'spritesheet') {
        await handleOpenDocumentFile(files[0], { forceSpritesheetSlicer: true });
        return;
      }

      if (mode === 'smart') {
        const imageFiles = files.filter((f) => isSupportedImageFile(f));
        if (imageFiles.length > 0) {
          setSmartImportFiles(imageFiles);
        } else {
          reportFileLoadFailure(
            files[0].name,
            new Error(
              'Selecciona imágenes compatibles (PNG, JPG, JPEG, WEBP, GIF, BMP, TIFF, TGA, ICO) para Importación Inteligente.'
            )
          );
        }
        return;
      }

      const targetW = overrideTargetSize?.width ?? canvasWidth;
      const targetH = overrideTargetSize?.height ?? canvasHeight;

      // Resolution mismatch control: never silently resize an imported image!
      if (
        !skipMismatchPrompt &&
        (mode === 'new_layer' ||
          mode === 'selected_group' ||
          mode === 'current_frame' ||
          mode === 'all_frames')
      ) {
        try {
          const probe = await decodeFilePreviewDataUrl(files[0]);
          if (
            probe.width > 0 &&
            probe.height > 0 &&
            (probe.width !== targetW || probe.height !== targetH)
          ) {
            setPendingResolutionMismatch({
              files,
              mode,
              fileName: files[0].name,
              sourceWidth: probe.width,
              sourceHeight: probe.height,
              sourceDpi: probe.dpi || 72,
              previewDataUrl: probe.dataUrl || null,
            });
            return;
          }
        } catch {
          // Proceed normally; downstream decoder reports descriptive errors if corrupted
        }
      }

      try {
        if (mode === 'new_layer' || mode === 'selected_group') {
          let targetGroupId: string | null = null;
          if (mode === 'selected_group') {
            const curL = framesRef.current[currentFrameIndex]?.layers[currentLayerIndex];
            if (curL?.groupId && layerGroupsRef.current.some((g) => g.id === curL.groupId)) {
              targetGroupId = curL.groupId;
            } else if (activeGroupId && layerGroupsRef.current.some((g) => g.id === activeGroupId)) {
              targetGroupId = activeGroupId;
            } else if (layerGroupsRef.current.length > 0) {
              targetGroupId = layerGroupsRef.current[0].id;
            } else {
              const newGrp: LayerGroup = {
                id: `group-imp-${Date.now()}`,
                name: 'Grupo Importado',
                color: '#38bdf8',
                frameIndices: [currentFrameIndex],
                collapsed: false,
                visible: true,
                locked: false,
              };
              const nextGroups = [...layerGroupsRef.current, newGrp];
              layerGroupsRef.current = nextGroups;
              setLayerGroups(nextGroups);
              targetGroupId = newGrp.id;
            }
          }

          const createdLayers: Layer[] = [];
          for (const file of files) {
            const { grid, tiledStoreId } = await rasterizeImageFileToGrid(
              file,
              targetW,
              targetH,
              fitMode,
              interpolation
            );
            createdLayers.push({
              id: `layer-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: file.name.replace(/\.[^.]+$/, ''),
              visible: true,
              locked: false,
              opacity: 1,
              fillOpacity: 1,
              blendMode: 'normal',
              layerType: 'raster',
              groupId: targetGroupId,
              pixels: grid,
              tiledStoreId,
              tiledRevision: tiledStoreId ? 1 : undefined,
            });
          }
          if (createdLayers.length === 0) return;

          const updatedFrames = framesRef.current.map((f, idx) =>
            idx === currentFrameIndex
              ? { ...f, layers: [...f.layers, ...createdLayers] }
              : f
          );
          const newActiveLayerIdx = updatedFrames[currentFrameIndex].layers.length - 1;
          framesRef.current = updatedFrames;
          setFrames(updatedFrames);
          setCurrentLayerIndex(newActiveLayerIdx);
          pushHistorySnapshot({ frames: updatedFrames, layerGroups: layerGroupsRef.current, currentLayerIndex: newActiveLayerIdx });
          setImportNotification(
            mode === 'selected_group'
              ? `${createdLayers.length} imagen(es) importada(s) al grupo seleccionado.`
              : `${createdLayers.length} imagen(es) importada(s) como nueva capa.`
          );
          setTimeout(() => setImportNotification(null), 3200);
          return;
        }

        if (mode === 'current_frame') {
          const { grid, tiledStoreId } = await rasterizeImageFileToGrid(
            files[0],
            targetW,
            targetH,
            fitMode,
            interpolation
          );
          const targetFrame = framesRef.current[currentFrameIndex];
          const targetLayer = targetFrame?.layers[currentLayerIndex];
          const canComposite =
            !tiledStoreId &&
            targetLayer &&
            !isLayerTiled(targetLayer) &&
            !targetLayer.locked &&
            targetLayer.layerType !== 'adjustment';

          const updatedFrames = framesRef.current.map((f, idx) => {
            if (idx !== currentFrameIndex) return f;
            if (canComposite) {
              return {
                ...f,
                layers: f.layers.map((l, lIdx) => {
                  if (lIdx !== currentLayerIndex) return l;
                  const merged = l.pixels.map((row, y) =>
                    row.map((cell, x) => grid[y]?.[x] ?? cell)
                  );
                  return { ...l, pixels: merged };
                }),
              };
            }
            return {
              ...f,
              layers: [
                ...f.layers,
                {
                  id: `layer-imp-cf-${Date.now()}`,
                  name: files[0].name.replace(/\.[^.]+$/, ''),
                  visible: true,
                  locked: false,
                  opacity: 1,
                  fillOpacity: 1,
                  blendMode: 'normal' as const,
                  layerType: 'raster' as const,
                  pixels: grid,
                  tiledStoreId,
                  tiledRevision: tiledStoreId ? 1 : undefined,
                },
              ],
            };
          });
          framesRef.current = updatedFrames;
          setFrames(updatedFrames);
          pushHistorySnapshot({ frames: updatedFrames });
          setImportNotification(`"${files[0].name}" importado al frame actual (#${currentFrameIndex + 1}).`);
          setTimeout(() => setImportNotification(null), 3000);
          return;
        }

        if (mode === 'all_frames') {
          const { grid, tiledStoreId } = await rasterizeImageFileToGrid(
            files[0],
            targetW,
            targetH,
            fitMode,
            interpolation
          );
          const baseName = files[0].name.replace(/\.[^.]+$/, '');
          const updatedFrames = framesRef.current.map((f, idx) => ({
            ...f,
            layers: [
              ...f.layers,
              {
                id: `layer-imp-all-${Date.now()}-${idx}`,
                name: baseName,
                visible: true,
                locked: false,
                opacity: 1,
                fillOpacity: 1,
                blendMode: 'normal' as const,
                layerType: 'raster' as const,
                pixels: tiledStoreId ? [] : grid.map((row) => [...row]),
                tiledStoreId,
                tiledRevision: tiledStoreId ? 1 : undefined,
              },
            ],
          }));
          const newIdx = updatedFrames[currentFrameIndex].layers.length - 1;
          framesRef.current = updatedFrames;
          setFrames(updatedFrames);
          setCurrentLayerIndex(newIdx);
          pushHistorySnapshot({ frames: updatedFrames, currentLayerIndex: newIdx });
          setImportNotification(`"${baseName}" importado en los ${updatedFrames.length} frames del proyecto.`);
          setTimeout(() => setImportNotification(null), 3200);
          return;
        }

        if (mode === 'reference' || mode === 'references_panel') {
          const anchorMode = mode === 'references_panel' ? 'camera' : 'canvas';
          const newRefs: ReferenceItem[] = [];
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const { dataUrl, naturalWidth, naturalHeight } = await rasterizeImageFileToGrid(file, 32, 32, 'fit');
            newRefs.push({
              id: `ref-imp-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
              name: file.name.replace(/\.[^.]+$/, ''),
              dataUrl,
              naturalWidth,
              naturalHeight,
              groupId: null,
              visible: true,
              locked: false,
              opacity: mode === 'references_panel' ? 1 : 0.72,
              blendMode: 'normal',
              scale: 1,
              rotation: 0,
              flipX: false,
              flipY: false,
              x: anchorMode === 'camera' ? 220 + i * 36 : 0,
              y: anchorMode === 'camera' ? -30 + i * 24 : 0,
              boardX: 30 + i * 130,
              boardY: 28 + Math.floor(i / 3) * 110,
              boardScale: 1,
              boardRotation: 0,
              anchor: anchorMode,
              useAsAiGuide: false,
            });
          }
          if (newRefs.length > 0) {
            const nextRefs = [...newRefs, ...referencesRef.current];
            referencesRef.current = nextRefs;
            setReferences(nextRefs);
            setActiveReferenceId(newRefs[0].id);
            pushHistorySnapshot({ references: nextRefs });
            if (mode === 'references_panel') {
              handleFocusPanel('references');
            }
            setImportNotification(
              mode === 'references_panel'
                ? `${newRefs.length} referencia(s) enviada(s) al Panel de Referencias.`
                : `${newRefs.length} referencia(s) importada(s) sobre el lienzo.`
            );
            setTimeout(() => setImportNotification(null), 3200);
          }
          return;
        }

        if (mode === 'asset') {
          const createdAssets: AssetLibraryItem[] = [];
          for (const file of files) {
            const { grid, dataUrl } = await rasterizeImageFileToGrid(file, canvasWidth, canvasHeight, fitMode);
            createdAssets.push({
              id: `asset-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: file.name.replace(/\.[^.]+$/, ''),
              category: 'character',
              origin: 'user',
              width: canvasWidth,
              height: canvasHeight,
              pixels: grid,
              createdAt: new Date().toISOString(),
              folder: 'Mis Uploads',
              tags: ['importado'],
              mediaDataUrl: dataUrl,
            });
          }
          if (createdAssets.length > 0) {
            const nextAssets = [...createdAssets, ...userLibraryItemsRef.current];
            userLibraryItemsRef.current = nextAssets;
            setUserLibraryItems(nextAssets);
            pushHistorySnapshot({ userLibraryItems: nextAssets });
            handleFocusPanel('library');
            setImportNotification(`${createdAssets.length} asset(s) añadido(s) a la Librería de Assets.`);
            setTimeout(() => setImportNotification(null), 3200);
          }
          return;
        }

        if (mode === 'brush') {
          const imported: CustomBrushPreset[] = [];
          for (const file of files) {
            const preset = await parseBrushFromFile(file);
            imported.push(preset);
          }
          if (imported.length > 0) {
            setCustomBrushes((prev) => [...imported, ...prev]);
            handleChangeBrushSettings({ ...brushSettings, ...imported[0].settings });
            handleSelectTool('pencil');
            handleFocusPanel('brushes');
            setImportNotification(`Pincel importado y activado: "${imported[0].name}".`);
            setTimeout(() => setImportNotification(null), 3200);
          }
          return;
        }

        if (mode === 'palette') {
          const file = files[0];
          let colors: string[] = [];
          if (isSupportedImageFile(file)) {
            colors = await extractPaletteFromImageFile(file, 32);
          } else {
            const text = await file.text();
            const parsed = parseAnyLospecText(text, file.name.replace(/\.[^.]+$/, ''));
            colors = parsed.colors;
          }
          if (colors.length === 0) {
            throw new Error('No se encontraron colores válidos en el archivo.');
          }
          setActivePaletteColors(colors);
          if (colors[0]) setPrimaryColor(colors[0]);
          if (colors[1]) setSecondaryColor(colors[1]);
          setImportNotification(`Paleta importada (${colors.length} colores) desde "${file.name}".`);
          setTimeout(() => setImportNotification(null), 3200);
          return;
        }

        if (mode === 'config') {
          const file = files[0];
          const text = await file.text();
          const parsedLayout = parsePcsLayoutFile(text);
          if (parsedLayout) {
            setWorkspaceLayout(parsedLayout.layout);
            saveWorkspaceLayout(parsedLayout.layout);
            setImportNotification(`Distribución importada: "${parsedLayout.name}".`);
            setTimeout(() => setImportNotification(null), 3200);
            return;
          }
          const json = JSON.parse(text);
          if (Array.isArray(json.bindings) || Array.isArray(json.shortcutBindings)) {
            const list = (json.bindings || json.shortcutBindings) as ShortcutBinding[];
            setShortcutBindings(list);
            setShortcutProfileId('custom');
            setImportNotification(`Atajos importados desde "${file.name}" (${list.length} comandos).`);
            setTimeout(() => setImportNotification(null), 3200);
            return;
          }
          if (Array.isArray(json.macros)) {
            setRecordedMacros(json.macros);
            setImportNotification(`Macros importados desde "${file.name}".`);
            setTimeout(() => setImportNotification(null), 3200);
            return;
          }
          throw new Error('Archivo de configuración no reconocido (.pcslayout o JSON de atajos).');
        }

        if (mode === 'external_project') {
          const file = files[0];
          const res = await importGraphicFile(file);
          const extW = res.width;
          const extH = res.height;
          const extFrames = res.frames;
          const extName = res.name || file.name.replace(/\.[^.]+$/, '');

          if (extFrames.length === 0) throw new Error('El proyecto externo no contiene fotogramas.');
          const normalizedFrames =
            extW === canvasWidth && extH === canvasHeight
              ? extFrames
              : rescaleSpriteGrid(extFrames, extW, extH, canvasWidth, canvasHeight);

          if (normalizedFrames.length === 1) {
            const groupId = `group-ext-${Date.now()}`;
            const importedGroup: LayerGroup = {
              id: groupId,
              name: `Importado: ${extName}`,
              color: '#a855f7',
              frameIndices: [currentFrameIndex],
              collapsed: false,
              visible: true,
              locked: false,
            };
            const nextGroups = [...layerGroupsRef.current, importedGroup];
            layerGroupsRef.current = nextGroups;
            setLayerGroups(nextGroups);

            const importedLayers: Layer[] = normalizedFrames[0].layers.map((l, idx) => ({
              ...l,
              id: `layer-ext-${Date.now()}-${idx}`,
              groupId,
            }));
            const updatedFrames = framesRef.current.map((f, idx) =>
              idx === currentFrameIndex ? { ...f, layers: [...f.layers, ...importedLayers] } : f
            );
            const newLayerIdx = updatedFrames[currentFrameIndex].layers.length - 1;
            framesRef.current = updatedFrames;
            setFrames(updatedFrames);
            setCurrentLayerIndex(newLayerIdx);
            pushHistorySnapshot({ frames: updatedFrames, layerGroups: nextGroups, currentLayerIndex: newLayerIdx });
            setImportNotification(
              `Proyecto "${extName}" incorporado como grupo (${importedLayers.length} capas) sin cerrar el actual.`
            );
          } else {
            const appendedFrames: Frame[] = normalizedFrames.map((f, i) => ({
              ...f,
              id: `frame-ext-${Date.now()}-${i}`,
              name: `${extName} #${i + 1}`,
              layers: f.layers.map((l, li) => ({ ...l, id: `layer-ext-${Date.now()}-${i}-${li}` })),
            }));
            const updatedFrames = [...framesRef.current, ...appendedFrames];
            framesRef.current = updatedFrames;
            setFrames(updatedFrames);
            pushHistorySnapshot({ frames: updatedFrames });
            setImportNotification(
              `Proyecto "${extName}" incorporado (+${appendedFrames.length} frames añadidos al proyecto actual).`
            );
          }
          setTimeout(() => setImportNotification(null), 3800);
        }
      } catch (err: any) {
        reportFileLoadFailure(files[0]?.name || 'Archivo', err, 'Importación', {
          file: files[0],
        });
      }
    },
    [
      currentFrameIndex,
      currentLayerIndex,
      activeGroupId,
      canvasWidth,
      canvasHeight,
      brushSettings,
      handleChangeBrushSettings,
      handleSelectTool,
      handleFocusPanel,
      handleOpenDocumentFile,
      reportFileLoadFailure,
      pushHistorySnapshot,
    ]
  );

  const handleTriggerImport = useCallback((mode: ImportMenuMode) => {
    setPendingImportMode(mode);
    window.setTimeout(() => {
      importFileInputRef.current?.click();
    }, 0);
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelection({
      active: true,
      startX: 0,
      startY: 0,
      endX: canvasWidth - 1,
      endY: canvasHeight - 1,
      shape: 'rect',
    });
  }, [canvasWidth, canvasHeight]);

  const handleClearSelection = useCallback(() => {
    setSelection(null);
  }, []);

  const handleInvertSelection = useCallback(() => {
    setSelection((prev) => {
      if (!prev || !prev.active) {
        return {
          active: true,
          startX: 0,
          startY: 0,
          endX: canvasWidth - 1,
          endY: canvasHeight - 1,
          shape: 'rect',
        };
      }
      const minX = Math.max(0, Math.min(prev.startX, prev.endX));
      const maxX = Math.min(canvasWidth - 1, Math.max(prev.startX, prev.endX));
      const minY = Math.max(0, Math.min(prev.startY, prev.endY));
      const maxY = Math.min(canvasHeight - 1, Math.max(prev.startY, prev.endY));
      const nextMask: boolean[][] = Array.from({ length: canvasHeight }, (_, y) =>
        Array.from({ length: canvasWidth }, (_, x) => {
          const wasInside = prev.mask
            ? Boolean(prev.mask[y]?.[x])
            : x >= minX && x <= maxX && y >= minY && y <= maxY;
          return !wasInside;
        })
      );
      return {
        active: true,
        startX: 0,
        startY: 0,
        endX: canvasWidth - 1,
        endY: canvasHeight - 1,
        shape: 'lasso',
        mask: nextMask,
      };
    });
  }, [canvasWidth, canvasHeight]);

  const handleRootExternalDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsExternalFileDragOver(true);
  }, []);

  const handleRootExternalDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setIsExternalFileDragOver(false);
    }
  }, []);

  const handleRootExternalDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
      e.preventDefault();
      setIsExternalFileDragOver(false);
      const dropped = Array.from(e.dataTransfer.files);
      const images = dropped.filter((f) => isSupportedImageFile(f));
      if (images.length > 0) {
        setSmartImportFiles(images);
        return;
      }
      const first = dropped[0];
      const lower = first.name.toLowerCase();
      if (/\.(hex|gpl|pal)$/.test(lower)) {
        executeImportIntoProject(dropped, 'palette');
      } else if (/\.(pcslayout|pcsshortcuts)$/.test(lower)) {
        executeImportIntoProject(dropped, 'config');
      } else if (lower.endsWith('.pcsbrush')) {
        executeImportIntoProject(dropped, 'brush');
      } else if (/\.(pcs|ase|aseprite|psd|psb|json)$/.test(lower)) {
        void handleOpenDocumentFile(first);
      } else {
        reportFileLoadFailure(
          first.name,
          new Error(
            `Formato no reconocido al arrastrar "${first.name}". Usa PNG, JPG, JPEG, WEBP, GIF, BMP, TIFF, TGA, ICO, ASE, ASEPRITE, PSD, PSB, PCS o JSON.`
          ),
          'Archivo',
          { file: first, errorCode: 'FORMAT_UNSUPPORTED_415', moduleName: 'Drag & Drop Loader' }
        );
      }
    },
    [executeImportIntoProject, handleOpenDocumentFile, reportFileLoadFailure]
  );

  // System 3: Unified Command Dispatcher & Macro Recorder / Runner
  const executeCommandById = useCallback(
    (commandId: string, recordStep: boolean = true) => {
      if (recordStep && isRecordingMacro && commandId !== 'cmd.shortcuts_editor') {
        const meta = shortcutBindings.find((b) => b.id === commandId);
        setRecordedMacroSteps((prev) => [
          ...prev,
          { id: `step-${Date.now()}-${prev.length}`, actionId: commandId, label: meta?.label || commandId },
        ]);
      }

      switch (commandId) {
        case 'cmd.command_palette':
          setCommandPaletteOpen((v) => !v);
          break;
        case 'cmd.what_is_this_mode':
          setWhatIsThisActive((v) => !v);
          break;
        case 'cmd.where_is_tool':
          setToolGuideFocusSearchNonce((n) => n + 1);
          setToolGuideModalOpen(true);
          break;
        case 'cmd.shortcuts_editor':
          setShortcutsModalOpen(true);
          break;
        case 'cmd.save_pcs':
          void handleSmartSave();
          break;
        case 'cmd.open_file':
          void handleOpenFilePicker();
          break;
        case 'cmd.smart_import':
          handleTriggerImport('smart');
          break;
        case 'cmd.new_project':
          setNewProjectModalOpen(true);
          break;
        case 'cmd.workspace_modal':
          openLayoutModal('layout');
          break;
        case 'cmd.toggle_ui_edit_mode':
        case 'cmd.toggle_total_freedom':
          setWorkspaceLayout((prev) => {
            const nextEditMode = !prev.uiEditMode;
            if (nextEditMode) {
              appendStudioLog('Modo Edición Libre: ACTIVADO (TopBar, Herramientas, Paneles y Orden de Herramientas desbloqueados)');
              return {
                ...prev,
                uiEditMode: true,
                totalFreedomMode: true,
                rightPanels: prev.rightPanels.map((p) =>
                  p.id === 'toolbar'
                    ? { ...p, visible: prev.toolbarPosition !== 'hidden' }
                    : p.id === 'topbar'
                    ? { ...p, visible: prev.showTopBar }
                    : p
                ),
              };
            }
            const toolbarPanel = prev.rightPanels.find((p) => p.id === 'toolbar');
            const topbarPanel = prev.rightPanels.find((p) => p.id === 'topbar');
            const hasCustomBarDock =
              Boolean(prev.floatingPanels?.toolbar?.isFloating) ||
              Boolean(prev.floatingPanels?.topbar?.isFloating) ||
              (toolbarPanel && (toolbarPanel.dock || 'left-main') !== 'left-main') ||
              (topbarPanel && (topbarPanel.dock || 'top') !== 'top') ||
              Boolean(
                prev.tabGroups?.some(
                  (g) => g.panelIds.includes('toolbar') || g.panelIds.includes('topbar')
                )
              );
            appendStudioLog('Modo Edición Libre: DESACTIVADO');
            return {
              ...prev,
              uiEditMode: false,
              totalFreedomMode: hasCustomBarDock,
            };
          });
          setRightSidebarOpen(true);
          break;
        case 'cmd.compact_mode':
          setWorkspaceLayout((prev) => ({
            ...prev,
            compactMode: !prev.compactMode,
            templateId: 'custom',
          }));
          break;
        case 'cmd.export_modal':
          setExportModalTab('advanced');
          setExportModalOpen(true);
          break;
        case 'edit.undo':
          handleUndo();
          break;
        case 'edit.redo':
          handleRedo();
          break;
        case 'edit.copy':
          handleCopyLayerOrSelection();
          break;
        case 'edit.cut':
          handleCutLayerOrSelection();
          break;
        case 'edit.paste':
          void handleSmartGlobalPaste(false);
          break;
        case 'edit.paste_in_place':
          handlePasteClipboard(true, true);
          break;
        case 'edit.swap_colors':
          setPrimaryColor(secondaryColor);
          setSecondaryColor(primaryColor);
          break;
        case 'edit.smart_delete':
          handleSmartDelete();
          break;
        case 'edit.clear_frame':
          handleClearFrame();
          break;
        case 'layer.new':
          handleAddLayer('raster');
          break;
        case 'layer.duplicate':
          handleMassDuplicateLayers(
            selectedLayerIndices.length > 0 ? selectedLayerIndices : [currentLayerIndex]
          );
          break;
        case 'layer.toggle_global':
          if (currentLayer) {
            handleUpdateLayerMeta(currentLayerIndex, { isGlobal: !currentLayer.isGlobal });
          }
          break;
        case 'layer.new_adjustment':
          handleCreateAdjustmentLayer(DEFAULT_ADJUSTMENT_CONFIG, 'Ajuste Color');
          break;
        case 'layer.new_group':
          handleCreateLayerGroup(`Carpeta ${layerGroups.length + 1}`, '#3b82f6');
          break;
        case 'layer.merge':
          if (selectedLayerIndices.length >= 2) handleMergeLayers(selectedLayerIndices);
          break;
        case 'layer.rename_shadow':
          handleUpdateLayerMeta(currentLayerIndex, { name: 'Sombras' });
          break;
        case 'layer.blend_multiply':
          handleUpdateLayerMeta(currentLayerIndex, { blendMode: 'multiply', opacity: 0.65 });
          break;
        case 'sel.deselect':
          setSelection(null);
          break;
        case 'transform.free':
          startTransformSession('free');
          break;
        case 'transform.flip_h':
          handleTransformAction('flip_h');
          break;
        case 'transform.flip_v':
          handleTransformAction('flip_v');
          break;
        case 'transform.rot_90_cw':
          handleTransformAction('rot_90_cw');
          break;
        case 'transform.rot_90_ccw':
          handleTransformAction('rot_90_ccw');
          break;
        case 'transform.center':
          handleTransformAction('center_canvas');
          break;
        case 'anim.play_pause':
          setIsPlaying((p) => !p);
          break;
        case 'anim.add_frame':
          handleAddFrame();
          break;
        case 'anim.prev_frame':
          setCurrentFrameIndex((prev) => (prev > 0 ? prev - 1 : frames.length - 1));
          break;
        case 'anim.next_frame':
          setCurrentFrameIndex((prev) => (prev < frames.length - 1 ? prev + 1 : 0));
          break;
        case 'anim.onion_skin':
          setOnionSkinEnabled((v) => !v);
          break;
        case 'anim.camera_shake_test':
          setCameraShakeTestNonce((n) => n + 1);
          break;
        case 'vector.pixel_preview_toggle':
          setShowPixelPerfectVectorPreview((v) => !v);
          break;
        case 'pixel.brush_dec':
          handleChangeBrushSizeSynced(brushSize - 1);
          break;
        case 'pixel.brush_inc':
          handleChangeBrushSizeSynced(brushSize + 1);
          break;
        case 'view.grid':
          setShowGrid((v) => !v);
          break;
        case 'view.toggle_fullscreen':
          handleToggleMaximizeWindow();
          break;
        case 'view.zoom_in':
          triggerZoomAction('in');
          break;
        case 'view.zoom_out':
          triggerZoomAction('out');
          break;
        case 'view.zoom_fit':
          triggerZoomAction('fit');
          break;
        case 'view.zoom_100':
          triggerZoomAction('percent', 100);
          break;
        case 'prefs.selection_display':
          openLayoutModal('selections');
          break;
        case 'ai.open_panel':
          handleFocusPanel('ai');
          break;
        case 'ai.dummie_apply':
          handleFocusPanel('references');
          setApplyPoseModalOpen(true);
          break;
        case 'fg.toggle_hitboxes':
          setShowHitboxes((v) => !v);
          break;
        case 'fg.combat_test':
          setCombatTestActive((v) => !v);
          break;
        case 'cmd.pure_ref_toggle':
          setPureRefConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
          break;
        case 'cmd.center_references':
          handleCenterAllReferences();
          break;
        case 'tool.move_object':
          setActiveTool('move');
          setMoveSubTool('move_object');
          break;
        case 'tool.move_layer':
          setActiveTool('move');
          setMoveSubTool('move_layer');
          break;
        case 'tool.move_selection':
          setActiveTool('move');
          setMoveSubTool('move_selection');
          break;
        case 'tool.move_reference':
          setActiveTool('move');
          setMoveSubTool('move_reference');
          break;
        case 'tool.direct_select':
          setActiveTool('move');
          setMoveSubTool('direct_select');
          break;
        case 'tool.lasso_magnetic':
          setLassoMode('magnetic');
          setActiveTool('lasso');
          break;
        case 'tool.bucket_gradient':
          setBucketSubTool('gradient');
          setActiveTool('bucket');
          break;
        case 'tool.bucket_dither_gradient':
          setBucketSubTool('dither_gradient');
          setActiveTool('bucket');
          break;
        case 'tool.zoom':
          handleSelectTool('zoom');
          break;
        default:
          if (commandId.startsWith('tool.')) {
            const toolId = commandId.slice(5) as ToolType;
            handleSelectTool(toolId);
          }
          break;
      }
    },
    [
      isRecordingMacro,
      shortcutBindings,
      handleSmartSave,
      handleOpenFilePicker,
      openLayoutModal,
      handleUndo,
      handleRedo,
      handleCopyLayerOrSelection,
      handleCutLayerOrSelection,
      handleSmartGlobalPaste,
      handlePasteClipboard,
      handleSmartDelete,
      secondaryColor,
      primaryColor,
      handleMassDuplicateLayers,
      selectedLayerIndices,
      currentLayerIndex,
      currentLayer,
      handleUpdateLayerMeta,
      handleCreateAdjustmentLayer,
      layerGroups.length,
      handleMergeLayers,
      startTransformSession,
      handleTransformAction,
      frames.length,
      handleChangeBrushSizeSynced,
      brushSize,
      handleFocusPanel,
      appendStudioLog,
      handleCenterAllReferences,
      handleSelectTool,
      triggerZoomAction,
    ]
  );

  const handleRunMacro = useCallback(
    (macro: RecordedMacro) => {
      for (const step of macro.steps) {
        executeCommandById(step.actionId, false);
      }
      setImportNotification(`Macro "${macro.name}" ejecutado (${macro.steps.length} pasos).`);
      setTimeout(() => setImportNotification(null), 2500);
    },
    [executeCommandById]
  );

  const handleRunConsoleCommand = useCallback(
    (rawCmd: string) => {
      const cmd = rawCmd.trim().toLowerCase();
      appendStudioLog(`> ${rawCmd}`);
      if (cmd === 'help') {
        appendStudioLog('Comandos: help | add-frame | add-layer | edit-ui | freedom | reset-layout | save | clear');
      } else if (cmd === 'add-frame') {
        executeCommandById('anim.add_frame', false);
        appendStudioLog('Nuevo fotograma añadido.');
      } else if (cmd === 'add-layer') {
        executeCommandById('layer.new', false);
        appendStudioLog('Nueva capa creada.');
      } else if (cmd === 'edit-ui' || cmd === 'freedom') {
        executeCommandById('cmd.toggle_ui_edit_mode', false);
      } else if (cmd === 'reset-layout') {
        handleResetDefaultLayout();
        appendStudioLog('Disposición predeterminada restaurada.');
      } else if (cmd === 'save') {
        void handleSmartSave();
        appendStudioLog('Guardando proyecto...');
      } else if (cmd === 'clear') {
        setStudioLogs([]);
      } else {
        appendStudioLog(`Comando no reconocido: "${rawCmd}". Escribe "help".`);
      }
    },
    [appendStudioLog, executeCommandById, handleResetDefaultLayout, handleSmartSave]
  );

  // Dynamic Keyboard Shortcuts Dispatcher + Command Palette (F1) + Hold-Alt Cheat Sheet
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt' && !e.repeat) {
        setAltKeyHeld(true);
      }
      if (e.key === 'F1') {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) {
          setWhatIsThisActive((v) => !v);
        } else {
          setCommandPaletteOpen((v) => !v);
        }
        return;
      }
      if (e.key === 'F11') {
        const bridge = getDesktopBridge();
        if (bridge?.isNativeDesktop || document.fullscreenEnabled) {
          e.preventDefault();
          e.stopPropagation();
          handleToggleMaximizeWindow();
        }
        return;
      }
      if (combatTestActive) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'Escape') {
        if (whatIsThisActive || spotlightTarget) {
          e.preventDefault();
          setWhatIsThisActive(false);
          setSpotlightTarget(null);
          return;
        }
        if (liveCanvasPreview) {
          e.preventDefault();
          setLiveCanvasPreview(null);
          return;
        }
        if (transformSession) {
          e.preventDefault();
          setTransformSession(null);
          return;
        }
        if (activeTool === 'canvas_edit') {
          e.preventDefault();
          handleCancelCanvasEdit();
          return;
        }
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setGuidesConfig((prev) => {
          const nextShow = !prev.showRulers;
          setImportNotification(nextShow ? 'Reglas activadas (Ctrl+R)' : 'Reglas ocultadas (Ctrl+R)');
          setTimeout(() => setImportNotification(null), 2000);
          return { ...prev, showRulers: nextShow };
        });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === ';' || e.code === 'Semicolon')) {
        e.preventDefault();
        setGuidesConfig((prev) => {
          const nextShow = !prev.showGuides;
          setImportNotification(nextShow ? 'Guías visibles (Ctrl+;)' : 'Guías ocultadas (Ctrl+;)');
          setTimeout(() => setImportNotification(null), 2000);
          return { ...prev, showGuides: nextShow };
        });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleOpenSaveAsModal();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        handleRequestCloseDocumentTab(activeDocumentIdRef.current);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        handleRequestCloseAllDocuments(Boolean(getDesktopBridge()?.isNativeDesktop));
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        handleTriggerImport('smart');
        return;
      }
      if (e.key === 'Enter' && transformSession) {
        e.preventDefault();
        handleCommitTransform();
        return;
      }
      if (e.key === 'Enter' && activeTool === 'canvas_edit') {
        e.preventDefault();
        handleApplyCanvasEdit();
        return;
      }
      if (e.key === ' ') {
        e.preventDefault();
        return;
      }

      // Check Recorded Macros first
      for (const m of recordedMacros) {
        if (m.shortcut && matchesShortcutEvent(e, m.shortcut)) {
          e.preventDefault();
          handleRunMacro(m);
          return;
        }
      }

      // Check Dynamic Shortcut Bindings
      for (const b of shortcutBindings) {
        if (
          matchesShortcutEvent(e, b.primary) ||
          (b.secondary && matchesShortcutEvent(e, b.secondary))
        ) {
          // Let native Ctrl+V / Cmd+V reach window 'paste' event so browser delivers full OS ClipboardEvent
          if (
            b.id === 'edit.paste' &&
            (e.ctrlKey || e.metaKey) &&
            !e.shiftKey &&
            !e.altKey &&
            e.key.toLowerCase() === 'v'
          ) {
            return;
          }
          e.preventDefault();
          setAltKeyHeld(false);
          executeCommandById(b.id);
          return;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        setAltKeyHeld(false);
      }
    };
    const handleBlur = () => setAltKeyHeld(false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [
    combatTestActive,
    whatIsThisActive,
    spotlightTarget,
    liveCanvasPreview,
    transformSession,
    handleCommitTransform,
    activeTool,
    selectedVectorPathId,
    recordedMacros,
    handleRunMacro,
    shortcutBindings,
    executeCommandById,
    handleOpenSaveAsModal,
    handleRequestCloseDocumentTab,
    handleRequestCloseAllDocuments,
    handleApplyCanvasEdit,
    handleCancelCanvasEdit,
    handleToggleMaximizeWindow,
  ]);

  const currentProjectState: ProjectState = {
    name: projectName,
    width: canvasWidth,
    height: canvasHeight,
    frames,
    clips,
    actionTags,
    layerGroups,
    activeClipId,
    activeActionTagId,
    currentFrameIndex,
    currentLayerIndex,
    primaryColor,
    primaryAlpha,
    secondaryColor,
    secondaryAlpha,
    activeTool,
    brushSize,
    pixelPerfect,
    ditherPattern,
    activeHitboxType,
    symmetryEnabled,
    symmetryAxis,
    showGrid,
    showHitboxes,
    showPivot,
    globalPivot,
    stageType,
    stageOpacity,
    groundConfig,
    dummyOpponent,
    combatFx,
    cameraShake,
    cameraKeyframes,
    onionSkinEnabled,
    onionSkinPrev,
    onionSkinNext,
    onionSkinOpacity,
    playbackMode,
    activeGroupId,
    isolateActiveGroup,
    brushSettings,
    activePaletteColors,
    fps: animationFps,
    references,
    referenceGroups,
    timelineMarkers,
    workMode,
  };

  const renderToolbarInstance = (orientation: 'vertical' | 'horizontal', embedded: boolean) => (
    <Toolbar
      activeTool={activeTool}
      onSelectTool={handleSelectTool}
      moveSubTool={moveSubTool}
      onChangeMoveSubTool={setMoveSubTool}
      selectionSubTool={selectionSubTool}
      onChangeSelectionSubTool={setSelectionSubTool}
      bucketSubTool={bucketSubTool}
      onChangeBucketSubTool={setBucketSubTool}
      shapeConfig={shapeConfig}
      onChangeShapeConfig={handleChangeShapeConfig}
      zoomToolMode={zoomToolMode}
      onChangeZoomToolMode={setZoomToolMode}
      onTriggerZoomAction={triggerZoomAction}
      brushSettings={brushSettings}
      onChangeBrushSettings={handleChangeBrushSettings}
      onCenterAllReferences={handleCenterAllReferences}
      brushSize={brushSize}
      onChangeBrushSize={handleChangeBrushSizeSynced}
      pixelPerfect={pixelPerfect}
      onTogglePixelPerfect={handleTogglePixelPerfectSynced}
      ditherPattern={ditherPattern}
      onChangeDitherPattern={setDitherPattern}
      ditherConfig={ditherConfig}
      onChangeDitherConfig={setDitherConfig}
      marqueeShape={marqueeShape}
      onChangeMarqueeShape={setMarqueeShape}
      lassoMode={lassoMode}
      onChangeLassoMode={setLassoMode}
      toolbarColumns="auto"
      toolbarWidth={workspaceLayout.toolbarWidth}
      toolbarHeight={workspaceLayout.toolbarHeight}
      onChangeToolbarSize={(dims) =>
        setWorkspaceLayout((prev) => ({
          ...prev,
          toolbarColumns: 'auto',
          toolbarWidth: dims.width !== undefined ? dims.width : prev.toolbarWidth,
          toolbarHeight: dims.height !== undefined ? dims.height : prev.toolbarHeight,
          templateId: 'custom',
        }))
      }
      onFloatToolbar={handleToggleFloatToolbar}
      isFloatingToolbar={Boolean(workspaceLayout.floatingPanels?.toolbar?.isFloating)}
      activeHitboxType={activeHitboxType}
      onChangeHitboxType={setActiveHitboxType}
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
      onSwapColors={() => {
        setPrimaryColor(secondaryColor);
        setSecondaryColor(primaryColor);
      }}
      onSelectPrimaryColor={setPrimaryColor}
      onSelectSecondaryColor={setSecondaryColor}
      dockPosition={workspaceLayout.toolbarPosition === 'right' ? 'right' : 'left'}
      orientation={orientation}
      embeddedInDock={embedded}
      linkMoveAllFrames={linkMoveAllFrames}
      onToggleLinkMoveAllFrames={() => setLinkMoveAllFrames((v) => !v)}
      onOpenBrushSettings={handleOpenBrushSettings}
      toolOrder={workspaceLayout.toolOrder}
      onChangeToolOrder={(nextOrder) =>
        setWorkspaceLayout((prev) => ({
          ...prev,
          toolOrder: nextOrder,
          templateId: 'custom',
        }))
      }
      uiEditMode={Boolean(workspaceLayout.uiEditMode)}
      onToggleUiEditMode={() => executeCommandById('cmd.toggle_ui_edit_mode', false)}
    />
  );

  const toolbarNode =
    workspaceLayout.toolbarPosition !== 'hidden' ? renderToolbarInstance('vertical', false) : null;

  const leftToolbarNode = workspaceLayout.toolbarPosition === 'left' ? toolbarNode : null;
  const rightToolbarNode = workspaceLayout.toolbarPosition === 'right' ? toolbarNode : null;

  const renderTimelineSlotNode = (dockZone: PanelDockZone | 'floating') => (
    <Timeline
      embeddedInDock
      dockZone={dockZone === 'floating' ? 'bottom' : dockZone}
      performanceMode={performanceMode}
      frames={frames}
      currentFrameIndex={currentFrameIndex}
      onSelectFrame={setCurrentFrameIndex}
      selectedFrameIndices={selectedFrameIndices}
      onSelectFrameIndices={setSelectedFrameIndices}
      onBatchChangeDuration={handleBatchChangeFrameDuration}
      onBatchChangePhase={handleBatchChangeFramePhase}
      onBatchDuplicate={handleBatchDuplicateFrames}
      onBatchDelete={handleBatchDeleteFrames}
      onAddFrame={handleAddFrame}
      onDuplicateFrame={handleDuplicateFrame}
      onDeleteFrame={handleDeleteFrame}
      onReorderFrame={handleReorderFrame}
      onChangeFrameDuration={handleChangeFrameDuration}
      onChangeFramePhase={handleChangeFramePhase}
      isPlaying={isPlaying}
      onTogglePlay={() => setIsPlaying((v) => !v)}
      onPrevFrame={() =>
        setCurrentFrameIndex((prev) => (prev > 0 ? prev - 1 : frames.length - 1))
      }
      onNextFrame={() =>
        setCurrentFrameIndex((prev) => (prev < frames.length - 1 ? prev + 1 : 0))
      }
      clips={clips}
      activeClipId={activeClipId}
      onSelectClip={setActiveClipId}
      onCreateClip={() => {
        const newClip: AnimationClip = {
          id: `clip-${Date.now()}`,
          name: `Combo #${clips.length + 1}`,
          frameIndices: frames.map((_, i) => i),
          loop: true,
          fps: 12
        };
        setClips((prev) => [...prev, newClip]);
        setActiveClipId(newClip.id);
      }}
      canvasWidth={canvasWidth}
      canvasHeight={canvasHeight}
      onionSkinEnabled={onionSkinEnabled}
      onToggleOnionSkin={() => setOnionSkinEnabled((v) => !v)}
      onSetOnionSkinEnabled={setOnionSkinEnabled}
      onionSkinOpacity={onionSkinOpacity}
      onChangeOnionSkinOpacity={setOnionSkinOpacity}
      onionSkinPrev={onionSkinPrev}
      onChangeOnionSkinPrev={setOnionSkinPrev}
      onionSkinNext={onionSkinNext}
      onChangeOnionSkinNext={setOnionSkinNext}
      fps={animationFps}
      onChangeFps={setAnimationFps}
      showGrid={showGrid}
      onToggleGrid={() => setShowGrid((v) => !v)}
      showHitboxes={showHitboxes}
      onToggleHitboxes={() => setShowHitboxes((v) => !v)}
      showPivot={showPivot}
      onTogglePivot={() => setShowPivot((v) => !v)}
      playbackMode={playbackMode}
      onChangePlaybackMode={setPlaybackMode}
      layerGroups={layerGroups}
      activeGroupId={activeGroupId}
      onSelectGroup={(groupId) => {
        setActiveGroupId(groupId);
        if (groupId) {
          const grp = layerGroups.find((g) => g.id === groupId);
          if (grp && grp.frameIndices && grp.frameIndices.length > 0) {
            const firstValid = grp.frameIndices.find((idx) => idx >= 0 && idx < frames.length);
            if (firstValid !== undefined) setCurrentFrameIndex(firstValid);
          }
        }
      }}
      isolateActiveGroup={isolateActiveGroup}
      onToggleIsolateGroup={() => setIsolateActiveGroup((v) => !v)}
      onCreateMovementGroup={(name, color, cat) => handleCreateLayerGroup(name, color, cat)}
      onAssignFrameToGroup={handleAssignFrameToGroup}
      onOpenSpriteSheetModal={() => setSpriteSheetModalOpen(true)}
      layers={currentFrame.layers}
      currentLayerIndex={currentLayerIndex}
      onSelectLayer={handleSelectLayerWithTrack}
      onToggleLayerVisibility={handleToggleLayerVisibility}
      onToggleLayerLock={handleToggleLayerLock}
      activeTrackKey={activeTrackKey}
      onSelectLayerTrack={handleSelectLayerTrack}
      onToggleTrackVisibility={handleToggleTrackVisibility}
      onToggleTrackLock={handleToggleTrackLock}
      sectionOrder={workspaceLayout.timelineSectionOrder}
      timelinePosition={dockZone === 'top' ? 'top' : 'bottom'}
      linkMoveAllFrames={linkMoveAllFrames}
      onToggleLinkMoveAllFrames={() => setLinkMoveAllFrames((v) => !v)}
      actionTags={actionTags}
      activeActionTagId={activeActionTagId}
      onSelectActionTag={(tagId) => {
        setActiveActionTagId(tagId);
        if (tagId) {
          const found = actionTags.find((t) => t.id === tagId);
          if (found && found.frameIndices.length > 0) {
            setCurrentFrameIndex(found.frameIndices[0]);
            setPlaybackMode(found.playbackMode || 'loop');
          }
        }
      }}
      timelineMarkers={timelineMarkers}
      onAddMarker={handleAddMarker}
      onDeleteMarker={handleDeleteMarker}
      onSetLayerKeyframe={handleSetLayerKeyframe}
      onRemoveLayerKeyframe={handleRemoveLayerKeyframe}
      onUpdateFrameMeta={handleUpdateFrameMeta}
      onScaleTimelineDurations={handleScaleTimelineDurations}
      onRetimeFrames={handleRetimeFrames}
      onCopyFullAnimation={handleCopyFullAnimation}
      timelineHeight={workspaceLayout.timelineHeight}
      onChangeTimelineHeight={(h) =>
        setWorkspaceLayout((prev) => ({
          ...prev,
          timelineHeight: h,
          bottomDockHeight: h,
          templateId: 'custom',
        }))
      }
      onResetTimelineHeight={() =>
        setWorkspaceLayout((prev) => ({
          ...prev,
          timelineHeight: DEFAULT_WORKSPACE_LAYOUT.timelineHeight,
          bottomDockHeight: DEFAULT_WORKSPACE_LAYOUT.bottomDockHeight,
          templateId: 'custom',
        }))
      }
      forceOpenCurvesNonce={forceOpenCurvesNonce}
      onUiContextFocus={() => setLastActiveUiContext('timeline')}
      onOpenCameraShakeControls={() => handleFocusPanel('animation')}
      cameraKeyframes={cameraKeyframes}
    />
  );

  const showIntegratedTabsInTopBar =
    workspaceLayout.showTopBar &&
    !(workspaceLayout.uiEditMode || workspaceLayout.totalFreedomMode) &&
    workspaceLayout.integratedTitlebarTabs !== false;

  const topBarNode = (
    <TopBar
      embeddedInDock={Boolean(workspaceLayout.uiEditMode || workspaceLayout.totalFreedomMode)}
      projectName={projectName}
      canvasWidth={canvasWidth}
      canvasHeight={canvasHeight}
      onOpenCanvasSizeModal={() => setCanvasSizeModalOpen(true)}
      canUndo={canUndo}
      canRedo={canRedo}
      onUndo={handleUndo}
      onRedo={handleRedo}
      onOpenCommandSearch={() => setCommandPaletteOpen(true)}
      onGoToHomeScreen={() => handleOpenHomeScreen('inicio')}
      openDocumentsCount={openDocuments.length}
      openDocuments={openDocuments}
      activeDocumentId={activeDocumentId}
      showIntegratedTabs={workspaceLayout.integratedTitlebarTabs !== false}
      onSelectDocumentTab={handleSwitchDocumentTab}
      onCloseDocumentTab={handleRequestCloseDocumentTab}
      onReorderDocumentTabs={handleReorderDocumentTabs}
      onNewDocument={() => setNewProjectModalOpen(true)}
      dragEmptySpace={true}
      isWindowMaximized={isWindowMaximized}
      onMinimizeWindow={handleMinimizeWindow}
      onToggleMaximizeWindow={handleToggleMaximizeWindow}
      onCloseApplicationWindow={handleCloseApplicationWindow}
      onOpenExport={() => {
        setExportModalTab('gif');
        setExportModalOpen(true);
      }}
    />
  );

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden relative"
      style={{
        backgroundColor: 'var(--studio-bg-app)',
        color: 'var(--studio-text)',
        fontFamily: 'var(--font-ui)',
      }}
      onDragOver={handleRootExternalDragOver}
      onDragLeave={handleRootExternalDragLeave}
      onDrop={handleRootExternalDrop}
    >
      {/* Hidden Global File Input for ABRIR DOCUMENTO (todos los formatos compatibles) */}
      <input
        ref={fileInputRef}
        type="file"
        accept={SUPPORTED_OPEN_ACCEPT}
        onChange={(e) => {
          const file = e.target.files?.[0];
          const replaceId = relocatingRecentIdRef.current || undefined;
          relocatingRecentIdRef.current = null;
          if (file) {
            void handleOpenDocumentFile(file, { replaceRecentId: replaceId });
            e.target.value = '';
          }
        }}
        className="sr-only"
      />

      {/* Hidden File Input exclusively for IMPORTAR AL PROYECTO (nunca reemplaza el documento activo) */}
      <input
        ref={importFileInputRef}
        type="file"
        multiple={
          pendingImportMode === 'smart' ||
          pendingImportMode === 'new_layer' ||
          pendingImportMode === 'selected_group' ||
          pendingImportMode === 'reference' ||
          pendingImportMode === 'references_panel' ||
          pendingImportMode === 'asset' ||
          pendingImportMode === 'brush'
        }
        accept={getAcceptForImportMode(pendingImportMode)}
        onChange={(e) => {
          const files = e.target.files ? Array.from(e.target.files) : [];
          const mode = pendingImportMode || 'smart';
          if (files.length > 0) {
            void executeImportIntoProject(files, mode);
          }
          e.target.value = '';
        }}
        className="sr-only"
      />

      {/* External OS File Drag & Drop Overlay — Global Top UI Layer */}
      <StudioTopLayerPortal isOpen={isExternalFileDragOver} tier="overlay" pointerEventsNone>
        <div
          className="fixed inset-0 pointer-events-none flex items-center justify-center p-6"
          style={{ backgroundColor: 'rgba(8, 10, 18, 0.72)', backdropFilter: 'blur(3px)' }}
        >
          <div
            className="px-6 py-5 rounded-2xl border-2 border-dashed flex flex-col items-center gap-2 text-center shadow-2xl"
            style={{
              backgroundColor: 'var(--studio-bg-panel)',
              borderColor: 'var(--studio-accent)',
              color: 'var(--studio-text)',
            }}
          >
            <Upload className="w-8 h-8" style={{ color: 'var(--studio-accent)' }} />
            <div className="text-sm font-bold">Suelta archivos aquí para Abrir o Importar</div>
            <div className="text-[11px]" style={{ color: 'var(--studio-text-muted)' }}>
              Imágenes (PNG, JPG, WEBP, GIF, BMP, TIFF, TGA, ICO) · Animación (ASE, ASEPRITE, Spritesheets) · Proyectos (PCS, PSD, JSON)
            </div>
          </div>
        </div>
      </StudioTopLayerPortal>

      {/* Global Top-Priority Alerts & Notifications Host (z-index 250000) */}
      <StudioAlertNotificationHost
        notifications={studioNotifications}
        onDismiss={handleDismissStudioNotification}
      />

      {/* Top Bar Header (fixed at top normally, or movable panel in Total Freedom Mode) */}
      {workspaceLayout.showTopBar && !(workspaceLayout.uiEditMode || workspaceLayout.totalFreedomMode) && topBarNode}

      {/* Classic Menu Bar (Archivo, Edición, Imagen, Capa, Animación, Ver, Interfaz, Ayuda) */}
      <MenuBar
        onNewProject={() => setNewProjectModalOpen(true)}
        onNewDocumentFromClipboard={() => void handleNewDocumentFromClipboard()}
        onOpenFilePicker={() => void handleOpenFilePicker()}
        onImportAction={handleTriggerImport}
        onSaveProjectPcs={() => void handleSmartSave()}
        onOpenSaveAsModal={() => handleOpenSaveAsModal()}
        onSaveProjectJson={handleSaveProjectJson}
        onSaveProjectAse={handleSaveProjectAse}
        onSaveProjectPsd={handleSaveProjectPsd}
        onCloseActiveDocument={() => handleRequestCloseDocumentTab(activeDocumentIdRef.current)}
        onRequestCloseAllDocuments={() =>
          handleRequestCloseAllDocuments(Boolean(getDesktopBridge()?.isNativeDesktop))
        }
        dragEmptySpace={workspaceLayout.windowDragZones !== 'topbar_only'}
        isWindowMaximized={isWindowMaximized}
        onToggleMaximizeWindow={handleToggleMaximizeWindow}
        onRestoreAutosave={handleRestoreAutosave}
        hasAutosave={hasAutosave}
        onOpenCanvasSizeModal={() => setCanvasSizeModalOpen(true)}
        onOpenImageSizeModal={() => setImageSizeModalOpen(true)}
        onFlipHorizontal={handleFlipCanvasHorizontal}
        onFlipVertical={handleFlipCanvasVertical}
        onRotateClockwise={handleRotateCanvasClockwise}
        onOpenExportModal={(tab = 'gif') => {
          setExportModalTab(tab);
          setExportModalOpen(true);
        }}
        onOpenLocalInstaller={() => setLocalInstallerModalOpen(true)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onClearFrame={handleClearFrame}
        onAddLayer={handleAddLayer}
        onAddGroup={() => handleCreateLayerGroup(`Carpeta ${layerGroups.length + 1}`, '#3b82f6')}
        onDuplicateActiveLayer={() =>
          handleMassDuplicateLayers(
            selectedLayerIndices.length > 0 ? selectedLayerIndices : [currentLayerIndex]
          )
        }
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onInvertSelection={handleInvertSelection}
        onSelectVectorTool={(tool) => {
          if (tool === 'vector_line') {
            handleSelectTool('line');
          } else {
            setActiveTool('move');
            setMoveSubTool('direct_select');
          }
        }}
        onAddFrame={handleAddFrame}
        onDuplicateFrame={() => handleDuplicateFrame(currentFrameIndex)}
        onDeleteFrame={() => handleDeleteFrame(currentFrameIndex)}
        onTogglePlay={() => setIsPlaying((v) => !v)}
        isPlaying={isPlaying}
        playbackMode={playbackMode}
        onTogglePingPong={() =>
          setPlaybackMode((m) => (m === 'pingpong' ? 'loop' : 'pingpong'))
        }
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid((v) => !v)}
        showHitboxes={showHitboxes}
        onToggleHitboxes={() => setShowHitboxes((v) => !v)}
        dummyEnabled={dummyOpponent.enabled}
        onToggleDummy={() =>
          setDummyOpponent((prev) => ({ ...prev, enabled: !prev.enabled }))
        }
        showPivot={showPivot}
        onTogglePivot={() => setShowPivot((v) => !v)}
        onionSkinEnabled={onionSkinEnabled}
        onToggleOnionSkin={() => setOnionSkinEnabled((v) => !v)}
        clipOutsideCanvas={clipOutsideCanvas}
        onToggleClipOutsideCanvas={() => setClipOutsideCanvas((v) => !v)}
        onOpenShortcuts={() => setShortcutsModalOpen(true)}
        onOpenLospecModal={() => setLospecModalOpen(true)}
        onOpenToolGuide={() => setToolGuideModalOpen(true)}
        onOpenToolLocator={() => {
          setToolGuideFocusSearchNonce((n) => n + 1);
          setToolGuideModalOpen(true);
        }}
        onOpenSpriteSheetTemplate={() => setSpriteSheetModalOpen(true)}
        onOpenLayoutModal={openLayoutModal}
        onTriggerZoomAction={triggerZoomAction}
        workspaceLayout={workspaceLayout}
        onUpdateWorkspaceLayout={(updater) => {
          setWorkspaceLayout((prev) => {
            const next = updater(prev);
            if (next.sidebarPosition !== 'hidden') {
              queueMicrotask(() => setRightSidebarOpen(true));
            }
            return next;
          });
        }}
        onTogglePanelVisible={handleToggleRightPanelVisible}
        onTogglePanelMini={handleTogglePanelMini}
        onResetDefaultLayout={handleResetDefaultLayout}
        hasClipboard={Boolean(clipboard)}
        onCopy={handleCopyLayerOrSelection}
        onCut={handleCutLayerOrSelection}
        onPaste={() => void handleSmartGlobalPaste(false)}
        onPasteInPlace={() => handlePasteClipboard(true, true)}
        onPasteAsReference={() => void handlePasteAsReference()}
        quickPasteMode={quickPasteMode}
        onToggleQuickPasteMode={() => {
          setQuickPasteMode((prev) => {
            const next = !prev;
            setImportNotification(
              next
                ? 'Pegado rápido activado: las imágenes se pegan en nueva capa del grupo seleccionado.'
                : 'Pegado inteligente activado: se mostrará el selector de destino al pegar.'
            );
            setTimeout(() => setImportNotification(null), 3000);
            return next;
          });
        }}
        onAddAdjustmentLayer={() => handleCreateAdjustmentLayer(DEFAULT_ADJUSTMENT_CONFIG, 'Ajuste Color')}
        onFocusPanel={handleFocusPanel}
        onTransformAction={handleTransformAction}
        hasLastTransform={Boolean(lastTransformParams)}
        shortcutLabels={Object.fromEntries(shortcutBindings.map((b) => [b.id, b.primary]))}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onApplyWorkspacePreset={handleApplyWorkspacePreset}
        onResetFloatingWindows={handleResetFloatingWindows}
        onToggleUiEditMode={() => executeCommandById('cmd.toggle_ui_edit_mode', false)}
        onOpenWhatIsThisMode={() => setWhatIsThisActive((v) => !v)}
        whatIsThisActive={whatIsThisActive}
        showOptionsBar={optionsBarState.visible}
        onToggleOptionsBar={() =>
          setOptionsBarState((prev) => ({ ...prev, visible: !prev.visible }))
        }
        recentProjects={recentProjects}
        onOpenRecentProject={handleOpenRecentProject}
        onTogglePinRecentProject={handleTogglePinRecentProject}
        onRemoveRecentProject={handleRemoveRecentProject}
        onClearRecentProjects={handleClearRecentProjects}
        guidesConfig={guidesConfig}
        guidesCount={guides.length}
        onToggleRulers={() =>
          handleChangeGuidesConfig({ ...guidesConfig, showRulers: !guidesConfig.showRulers })
        }
        onToggleGuidesVisible={() =>
          handleChangeGuidesConfig({ ...guidesConfig, showGuides: !guidesConfig.showGuides })
        }
        onToggleLockGuides={() =>
          handleChangeGuidesConfig({ ...guidesConfig, lockGuides: !guidesConfig.lockGuides })
        }
        onChangeRulerUnit={(unit: RulerUnit) =>
          handleChangeGuidesConfig({ ...guidesConfig, unit })
        }
        onToggleSnapOption={(key) =>
          handleChangeGuidesConfig({ ...guidesConfig, [key]: !guidesConfig[key] })
        }
        onOpenGuidesModal={(tab: GuidesModalTab = 'perspective') => {
          setGuidesModalTab(tab);
          setGuidesModalOpen(true);
        }}
        onApplyGuidePreset={(preset) => handleApplyGuidePreset(preset, false)}
        onClearAllGuides={handleClearAllGuides}
        onChangeGuidesConfig={handleChangeGuidesConfig}
        onSelectPerspectiveType={handleSelectPerspectiveType}
        onApplyScenarioGuidePreset={handleApplyScenarioGuidePreset}
        wheelNavMode={wheelNavMode}
        onToggleWheelNavMode={() => {
          setWheelNavMode((prev) => {
            const next: WheelNavigationMode = prev === 'pan' ? 'zoom' : 'pan';
            setImportNotification(
              next === 'pan'
                ? 'Rueda: desplazamiento vertical · Shift+Rueda: horizontal · Ctrl+Rueda: zoom'
                : 'Rueda: zoom directo · Shift+Rueda: horizontal'
            );
            setTimeout(() => setImportNotification(null), 2800);
            return next;
          });
        }}
        performanceMode={performanceMode}
        onChangePerformanceMode={(mode) => {
          setPerformanceMode(mode);
          const label =
            mode === 'quality'
              ? 'Calidad máxima'
              : mode === 'performance'
              ? 'Rendimiento (prioriza FPS)'
              : 'Equilibrado';
          setImportNotification(`Modo de rendimiento: ${label}`);
          setTimeout(() => setImportNotification(null), 2600);
        }}
        workMode={workMode}
        onChangeWorkMode={handleChangeWorkMode}
        onOpenFxStudio={(tab) => handleOpenFxStudio(tab || 'generator')}
        onCreateSuggestedModeLayers={handleCreateSuggestedModeLayers}
        onApplyModeGuides={handleApplyModeGuides}
        onOpenHomeScreen={handleOpenHomeScreen}
        onTestSplashAnimation={handleTestSplashAnimation}
        onActivateCanvasEditTool={() => handleSelectTool('canvas_edit')}
      />

      {/* Contextual Tool Options Bar (Photoshop / Clip Studio / Aseprite / Krita style) */}
      <ToolOptionsBar
        barState={optionsBarState}
        onChangeBarState={setOptionsBarState}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        activeTool={activeTool}
        onSelectTool={handleSelectTool}
        pencilSubMode={pencilSubMode}
        onChangePencilSubMode={setPencilSubMode}
        brushSettings={brushSettings}
        onChangeBrushSettings={handleChangeBrushSettings}
        brushSize={brushSize}
        onChangeBrushSize={handleChangeBrushSizeSynced}
        pixelPerfect={pixelPerfect}
        onTogglePixelPerfect={() => {
          setPixelPerfect((v) => {
            const next = !v;
            setBrushSettings((bs) => ({ ...bs, pixelPerfect: next }));
            return next;
          });
        }}
        ditherConfig={ditherConfig}
        onChangeDitherConfig={setDitherConfig}
        eraserOptions={eraserOptions}
        onChangeEraserOptions={setEraserOptions}
        bucketSubTool={bucketSubTool}
        onChangeBucketSubTool={setBucketSubTool}
        bucketOptions={bucketOptions}
        onChangeBucketOptions={setBucketOptions}
        gradientConfig={gradientConfig}
        onChangeGradientConfig={setGradientConfig}
        magicWandOptions={magicWandOptions}
        onChangeMagicWandOptions={handleChangeMagicWandOptions}
        onMorphSelection={handleMorphSelection}
        hasActiveSelection={Boolean(selection && selection.active)}
        selectionSubTool={selectionSubTool}
        onChangeSelectionSubTool={setSelectionSubTool}
        marqueeShape={marqueeShape}
        onChangeMarqueeShape={setMarqueeShape}
        selectionOptions={selectionOptions}
        onChangeSelectionOptions={handleChangeSelectionOptions}
        lassoMode={lassoMode}
        onChangeLassoMode={setLassoMode}
        moveSubTool={moveSubTool}
        onChangeMoveSubTool={setMoveSubTool}
        moveOptions={moveOptions}
        onChangeMoveOptions={setMoveOptions}
        linkMoveAllFrames={linkMoveAllFrames}
        onToggleLinkMoveAllFrames={() => setLinkMoveAllFrames((v) => !v)}
        onCenterAllReferences={handleCenterAllReferences}
        primaryColor={primaryColor}
        onSelectPrimaryColor={setPrimaryColor}
        vectorConfig={vectorConfig}
        onChangeVectorConfig={setVectorConfig}
        vectorConfirmPolicy={vectorConfirmPolicy}
        onChangeVectorConfirmPolicy={setVectorConfirmPolicy}
        onVectorNodeAction={handleToolOptionsVectorNodeAction}
        shapeConfig={shapeConfig}
        onChangeShapeConfig={handleChangeShapeConfig}
        selectedShape={selectedParametricShape}
        onUpdateSelectedShape={handleUpdateSelectedShape}
        onRasterizeSelectedShape={() => {
          if (selectedParametricShapeId) {
            handleRasterizeParametricShape(selectedParametricShapeId);
          }
        }}
        onDeleteSelectedShape={handleDeleteSelectedShape}
        shapeRasterPolicy={shapeRasterPolicy}
        onChangeShapeRasterPolicy={setShapeRasterPolicy}
        symmetryConfig={symmetryConfig}
        onChangeSymmetryConfig={handleChangeSymmetryConfig}
        symmetryBarActive={symmetryBarActive}
        onToggleSymmetryBar={() => {
          setSymmetryBarActive((v) => !v);
          setAiBarActive(false);
        }}
        zoomToolMode={zoomToolMode}
        onChangeZoomToolMode={setZoomToolMode}
        onTriggerZoomAction={triggerZoomAction}
        zoomPercent={zoomPercent}
        eyedropperConfig={eyedropperConfig}
        onChangeEyedropperConfig={setEyedropperConfig}
        activeHitboxType={activeHitboxType}
        onChangeHitboxType={setActiveHitboxType}
        activeFilterSession={activeFilterSession}
        onUpdateFilterSession={(patch) =>
          setActiveFilterSession((prev) => (prev ? { ...prev, ...patch } : null))
        }
        onConfirmFilterSession={handleConfirmFilterSession}
        onCancelFilterSession={handleCancelFilterSession}
        onResetFilterSession={handleResetFilterSession}
        aiBarActive={aiBarActive}
        onToggleAiBar={() => {
          setAiBarActive((v) => !v);
          setSymmetryBarActive(false);
        }}
        quickAiOptions={quickAiOptions}
        onChangeQuickAiOptions={setQuickAiOptions}
        isGeneratingQuickAi={isGeneratingQuickAi}
        onGenerateQuickAi={() => {
          setIsGeneratingQuickAi(true);
          setTimeout(() => {
            const count = Math.max(1, Math.min(4, quickAiOptions.variations || 1));
            for (let i = 0; i < count; i++) {
              const grid = generateQuickAiSpriteGrid(
                canvasWidth,
                canvasHeight,
                quickAiOptions,
                primaryColor,
                secondaryColor,
                activePaletteColors,
                i
              );
              const baseLabel = (quickAiOptions.prompt || 'IA Rápida').trim().slice(0, 18);
              handleInsertGeneratedGrid(
                grid,
                'new_layer',
                count > 1 ? `${baseLabel} #${i + 1}` : baseLabel,
                'IA Rápida',
                '#a855f7'
              );
            }
            setIsGeneratingQuickAi(false);
          }, 60);
        }}
        canvasEditRect={canvasEditRect}
        canvasEditConfig={canvasEditConfig}
        hasOffCanvasContent={hasOffCanvasContent}
        onChangeCanvasEditRect={setCanvasEditRect}
        onChangeCanvasEditConfig={setCanvasEditConfig}
        onApplyCanvasEdit={handleApplyCanvasEdit}
        onResetCanvasEdit={handleResetCanvasEdit}
        onCancelCanvasEdit={handleCancelCanvasEdit}
        onFitCanvasEditToContent={handleFitCanvasEditToContent}
        tileToolConfig={tileToolConfig}
        onChangeTileToolConfig={setTileToolConfig}
        tilesets={tilesets}
        onOpenTilesetsPanel={() => handleFocusPanel('tilesets')}
      />

      {/* Fallback Standalone Document Tabs Strip (only shown if TopBar is hidden/floating or integrated tabs disabled) */}
      {!showIntegratedTabsInTopBar && (
        <div
          className="h-[28px] border-b flex items-center gap-1 px-2 overflow-x-auto shrink-0 select-none text-[11px]"
          style={{
            backgroundColor: 'var(--studio-bg-bar)',
            borderColor: 'var(--studio-border)',
          }}
        >
          {openDocuments.map((doc) => {
            const isActive = doc.id === activeDocumentId;
            return (
              <div
                key={doc.id}
                draggable={openDocuments.length > 1}
                onDragStart={() => setDraggedDocTabId(doc.id)}
                onDragOver={(e) => {
                  if (draggedDocTabId && draggedDocTabId !== doc.id) {
                    e.preventDefault();
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedDocTabId && draggedDocTabId !== doc.id) {
                    handleReorderDocumentTabs(draggedDocTabId, doc.id);
                  }
                  setDraggedDocTabId(null);
                }}
                onDragEnd={() => setDraggedDocTabId(null)}
                onClick={() => handleSwitchDocumentTab(doc.id)}
                title={`${doc.name}${doc.isDirty ? ' · Cambios sin guardar' : ' · Guardado'} (${doc.width}×${doc.height} px)`}
                className="flex items-center gap-1.5 px-2.5 h-[23px] rounded-t border cursor-pointer transition-colors shrink-0 whitespace-nowrap"
                style={{
                  backgroundColor: isActive ? 'var(--studio-bg-panel)' : 'transparent',
                  borderColor: isActive ? 'var(--studio-accent)' : 'var(--studio-border)',
                  borderBottomColor: isActive ? 'var(--studio-bg-panel)' : 'var(--studio-border)',
                  color: isActive ? 'var(--studio-text)' : 'var(--studio-text-muted)',
                  opacity: draggedDocTabId === doc.id ? 0.5 : 1,
                }}
              >
                <FileText
                  className="w-3 h-3 shrink-0"
                  style={{ color: isActive ? 'var(--studio-accent)' : undefined }}
                />
                <span className="font-medium truncate max-w-[150px]">{doc.name}</span>
                {doc.isDirty && (
                  <span
                    className="text-amber-400 font-bold text-xs leading-none shrink-0"
                    title="Cambios sin guardar"
                  >
                    *
                  </span>
                )}
                <span className="text-[9px] font-mono tabular-nums opacity-60 shrink-0">
                  {doc.width}×{doc.height}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRequestCloseDocumentTab(doc.id);
                  }}
                  title={doc.isDirty ? 'Cerrar documento (hay cambios sin guardar)' : 'Cerrar documento'}
                  className="p-0.5 rounded hover:bg-rose-500/20 hover:text-rose-400 transition-colors shrink-0"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => setNewProjectModalOpen(true)}
            title="Nuevo documento (Ctrl+N)"
            className="p-1 rounded hover:bg-white/10 transition-colors ml-0.5 shrink-0"
            style={{ color: 'var(--studio-text-muted)' }}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main 6-Zone Modular Dock Workspace Area */}
      <RightSidebar
        performanceMode={performanceMode}
        primaryColor={primaryColor}
        primaryAlpha={primaryAlpha}
        secondaryColor={secondaryColor}
        onSelectPrimaryColor={setPrimaryColor}
        onChangePrimaryAlpha={setPrimaryAlpha}
        onSelectSecondaryColor={setSecondaryColor}
        onReplaceColor={handleReplaceColor}
        layers={currentFrame.layers}
        currentLayerIndex={currentLayerIndex}
        onSelectLayer={handleSelectLayerWithTrack}
        onToggleLayerVisibility={handleToggleLayerVisibility}
        onToggleLayerLock={handleToggleLayerLock}
        activeTrackKey={activeTrackKey}
        onSelectLayerTrack={handleSelectLayerTrack}
        onToggleTrackVisibility={handleToggleTrackVisibility}
        onToggleTrackLock={handleToggleTrackLock}
        onUpdateTrackMeta={handleUpdateTrackMeta}
        onDeleteTrack={handleDeleteTrack}
        onAssignTrackToGroup={handleAssignTrackToGroup}
        onClearTrackInCurrentFrame={handleClearTrackInCurrentFrame}
        onAddLayer={handleAddLayer}
        onDeleteLayer={handleDeleteLayer}
        onChangeLayerOpacity={(idx, op) => {
          setFrames((prev) =>
            prev.map((f, fIdx) => {
              if (fIdx !== currentFrameIndex) return f;
              return {
                ...f,
                layers: f.layers.map((l, lIdx) =>
                  lIdx === idx ? { ...l, opacity: op } : l
                ),
              };
            })
          );
        }}
        layerGroups={layerGroups}
        onCreateLayerGroup={handleCreateLayerGroup}
        onRenameLayerGroup={handleRenameLayerGroup}
        onMoveLayerGroupParent={handleMoveLayerGroupParent}
        onDeleteLayerGroup={handleDeleteLayerGroup}
        onToggleGroupCollapse={handleToggleGroupCollapse}
        onToggleGroupVisibility={handleToggleGroupVisibility}
        onToggleGroupLock={handleToggleGroupLock}
        onChangeGroupOpacity={handleChangeGroupOpacity}
        onChangeGroupColor={handleChangeGroupColor}
        onAssignLayerToGroup={handleAssignLayerToGroup}
        onUpdateLayerMeta={handleUpdateLayerMeta}
        onReorderLayer={handleReorderLayer}
        onMergeLayers={handleMergeLayers}
        onMergeVisibleLayers={handleMergeVisibleLayers}
        onMassDuplicateLayers={handleMassDuplicateLayers}
        onConvertLayersToGroup={handleConvertLayersToGroup}
        editingMask={editingMask}
        onSetEditingMask={setEditingMask}
        onCreateLayerMask={handleCreateLayerMask}
        onDeleteLayerMask={handleDeleteLayerMask}
        onApplyLayerMask={handleApplyLayerMask}
        onInvertLayerMask={handleInvertLayerMask}
        onToggleMaskDisabled={handleToggleMaskDisabled}
        onToggleMaskLinked={handleToggleMaskLinked}
        onToggleMaskQuickPreview={handleToggleMaskQuickPreview}
        onRasterizeLayer={handleRasterizeLayer}
        onConvertToSmartObject={handleConvertToSmartObject}
        selectedLayerIndices={selectedLayerIndices}
        onSelectLayerIndices={setSelectedLayerIndices}
        onBatchToggleLayerVisibility={handleBatchToggleLayerVisibility}
        onBatchToggleLayerLock={handleBatchToggleLayerLock}
        onBatchAssignLayersToGroup={handleBatchAssignLayersToGroup}
        onBatchDeleteLayers={handleBatchDeleteLayers}
        hitboxes={currentFrame.hitboxes || []}
        activeHitboxType={activeHitboxType}
        onUpdateHitboxes={handleUpdateHitboxes}
        onSelectHitboxType={setActiveHitboxType}
        onSelectHitboxTool={() => setActiveTool('hitbox')}
        onUpdateFrameAdvantage={handleUpdateFrameAdvantage}
        combatTestActive={combatTestActive}
        onToggleCombatTest={() => setCombatTestActive((v) => !v)}
        currentFrame={currentFrame}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        onInjectAiVfx={handleInjectAiVfx}
        onApplyFrameRemix={handleApplyFrameRemix}
        onApplyPaletteSwap={(colors) => {
          if (colors[0]) setPrimaryColor(colors[0]);
          if (colors[1]) setSecondaryColor(colors[1]);
        }}
        actionTags={actionTags}
        onCreateActionTag={handleCreateActionTag}
        onDeleteActionTag={handleDeleteActionTag}
        onAssignFrameToActionTag={handleAssignFrameToActionTag}
        currentFrameIndex={currentFrameIndex}
        frames={frames}
        stageType={stageType}
        onChangeStageType={setStageType}
        stageOpacity={stageOpacity}
        onChangeStageOpacity={setStageOpacity}
        groundConfig={groundConfig}
        onChangeGroundConfig={setGroundConfig}
        dummyOpponent={dummyOpponent}
        onChangeDummyOpponent={setDummyOpponent}
        combatFx={combatFx}
        onChangeCombatFx={handleChangeCombatFxSynced}
        cameraShake={cameraShake}
        onChangeCameraShake={handleChangeCameraShakeSynced}
        onTriggerCameraShakeTest={() => setCameraShakeTestNonce((n) => n + 1)}
        cameraKeyframes={cameraKeyframes}
        onSetCameraKeyframe={handleSetCameraKeyframe}
        onRemoveCameraKeyframe={handleRemoveCameraKeyframe}
        onUiContextFocus={(ctx) => setLastActiveUiContext(ctx)}
        onGenerateInBetween={handleGenerateInBetween}
        onInsertInBetweenSequence={handleInsertInBetweenSequence}
        onInsertAnimationFrames={handleInsertAnimationFrames}
        activePaletteColors={activePaletteColors}
        onUpdateActivePalette={(colors) => {
          setActivePaletteColors(colors);
          if (colors[0]) setPrimaryColor(colors[0]);
          if (colors[1]) setSecondaryColor(colors[1]);
          setImportNotification('Paleta variada aplicada.');
          setTimeout(() => setImportNotification(null), 2500);
        }}
        onOpenLospecModal={() => setLospecModalOpen(true)}
        isOpen={rightSidebarOpen && workspaceLayout.sidebarPosition !== 'hidden'}
        panels={workspaceLayout.rightPanels}
        onTogglePanelExpanded={handleToggleRightPanelExpanded}
        onTogglePanelVisible={handleToggleRightPanelVisible}
        onDropPanelToDock={handleDropPanelToDock}
        onTogglePanelMini={handleTogglePanelMini}
        dockPosition={workspaceLayout.sidebarPosition === 'left' ? 'left' : 'right'}
        sidebarWidth={workspaceLayout.sidebarWidth}
        brushSettings={brushSettings}
        onChangeBrushSettings={handleChangeBrushSettings}
        customBrushes={customBrushes}
        onDeleteCustomBrush={(id) => setCustomBrushes((prev) => prev.filter((b) => b.id !== id))}
        leftToolbar={leftToolbarNode}
        rightToolbar={rightToolbarNode}
        hasClipboard={Boolean(clipboard)}
        clipboardLabel={clipboard ? `${clipboard.kind === 'selection' ? 'Sel.' : 'Capa'}: ${clipboard.sourceName} (F#${clipboard.sourceFrameIndex + 1})` : undefined}
        hasActiveSelection={Boolean(selection && selection.active)}
        onCopyLayerOrSelection={handleCopyLayerOrSelection}
        onCutLayerOrSelection={handleCutLayerOrSelection}
        onPasteClipboard={handlePasteClipboard}
        onApplyDirectAdjustment={handleApplyDirectAdjustment}
        onCreateAdjustmentLayer={handleCreateAdjustmentLayer}
        onUpdateAdjustmentLayer={handleUpdateAdjustmentLayer}
        onBakeAdjustmentLayer={handleBakeAdjustmentLayer}
        onApplyQuickFilter={handleApplyQuickFilter}
        onLiveCanvasPreview={setLiveCanvasPreview}
        onGenerateDummieFromReference={handleGenerateDummieFromReference}
        libraryItems={allLibraryItems}
        assetFolders={assetFolders}
        onCreateAssetFolder={handleCreateAssetFolder}
        onInsertLibraryItem={handleInsertLibraryItem}
        onSaveCurrentLayerToLibrary={handleSaveCurrentLayerToLibrary}
        onSaveSelectionToLibrary={handleSaveSelectionToLibrary}
        onAddAiLibraryItem={handleAddAiLibraryItem}
        onAddUploadedLibraryItem={handleAddUploadedLibraryItem}
        onUpdateLibraryItem={handleUpdateLibraryItem}
        onDeleteLibraryItem={handleDeleteLibraryItem}
        onSaveGridToLibrary={handleSaveGridToLibrary}
        onInsertGeneratedGrid={handleInsertGeneratedGrid}
        references={references}
        referenceGroups={referenceGroups}
        activeReferenceId={activeReferenceId}
        onSelectReference={setActiveReferenceId}
        onAddReferencesFromFiles={handleAddReferencesFromFiles}
        onUpdateReference={handleUpdateReference}
        onDeleteReference={handleDeleteReference}
        onCreateReferenceGroup={handleCreateReferenceGroup}
        onUpdateReferenceGroup={handleUpdateReferenceGroup}
        onDeleteReferenceGroup={handleDeleteReferenceGroup}
        onReorderReferenceGroup={handleReorderReferenceGroup}
        pureRefConfig={pureRefConfig}
        onChangePureRefConfig={setPureRefConfig}
        onCenterAllReferences={handleCenterAllReferences}
        onBringReferenceToFront={handleBringReferenceToFront}
        onActivateMoveReferenceTool={handleActivateMoveReferenceTool}
        project={currentProjectState}
        leftMainWidth={workspaceLayout.leftMainWidth}
        rightMainWidth={workspaceLayout.rightMainWidth}
        leftMiniWidth={workspaceLayout.leftMiniWidth}
        rightMiniWidth={workspaceLayout.rightMiniWidth}
        leftMiniMode={workspaceLayout.leftMiniMode}
        rightMiniMode={workspaceLayout.rightMiniMode}
        miniFlyoutWidth={workspaceLayout.miniFlyoutWidth}
        onResizeLeftMain={(w) =>
          setWorkspaceLayout((prev) => ({ ...prev, leftMainWidth: w, templateId: 'custom' }))
        }
        onResizeRightMain={(w) =>
          setWorkspaceLayout((prev) => ({ ...prev, rightMainWidth: w, templateId: 'custom' }))
        }
        onResizeLeftMini={(w) =>
          setWorkspaceLayout((prev) => ({
            ...prev,
            leftMiniWidth: w,
            leftMiniMode: w >= 96 ? 'expanded' : 'compact',
            templateId: 'custom',
          }))
        }
        onResizeRightMini={(w) =>
          setWorkspaceLayout((prev) => ({
            ...prev,
            rightMiniWidth: w,
            rightMiniMode: w >= 96 ? 'expanded' : 'compact',
            templateId: 'custom',
          }))
        }
        onToggleMiniMode={(zone) =>
          setWorkspaceLayout((prev) => {
            if (zone === 'left-mini') {
              const isExp = (prev.leftMiniWidth ?? 56) >= 96;
              return {
                ...prev,
                leftMiniMode: isExp ? 'compact' : 'expanded',
                leftMiniWidth: isExp ? 56 : 176,
                templateId: 'custom',
              };
            }
            const isExp = (prev.rightMiniWidth ?? 56) >= 96;
            return {
              ...prev,
              rightMiniMode: isExp ? 'compact' : 'expanded',
              rightMiniWidth: isExp ? 56 : 176,
              templateId: 'custom',
            };
          })
        }
        onResizeMiniFlyout={(w) =>
          setWorkspaceLayout((prev) => ({ ...prev, miniFlyoutWidth: w, templateId: 'custom' }))
        }
        onResetDockWidths={() =>
          setWorkspaceLayout((prev) => ({
            ...prev,
            leftMainWidth: DEFAULT_WORKSPACE_LAYOUT.leftMainWidth,
            rightMainWidth: DEFAULT_WORKSPACE_LAYOUT.rightMainWidth,
            leftMiniWidth: DEFAULT_WORKSPACE_LAYOUT.leftMiniWidth,
            rightMiniWidth: DEFAULT_WORKSPACE_LAYOUT.rightMiniWidth,
            leftMiniMode: 'compact',
            rightMiniMode: 'compact',
            miniFlyoutWidth: DEFAULT_WORKSPACE_LAYOUT.miniFlyoutWidth,
            templateId: 'custom',
          }))
        }
        compactMode={workspaceLayout.compactMode}
        autoCollapseSidebars={workspaceLayout.autoCollapseSidebars}
        tabGroups={workspaceLayout.tabGroups}
        onChangeTabGroups={(tabGroups) =>
          setWorkspaceLayout((prev) => ({ ...prev, tabGroups, templateId: 'custom' }))
        }
        floatingPanels={workspaceLayout.floatingPanels as Record<string, FloatingPanelState>}
        onChangeFloatingPanels={(floatingPanels) =>
          setWorkspaceLayout((prev) => ({ ...prev, floatingPanels, templateId: 'custom' }))
        }
        collapsedSections={workspaceLayout.collapsedSections}
        onToggleCollapsedSection={(key) =>
          setWorkspaceLayout((prev) => ({
            ...prev,
            collapsedSections: {
              ...(prev.collapsedSections || {}),
              [key]: !prev.collapsedSections?.[key],
            },
          }))
        }
        onDuplicateLayerToNextFrame={handleDuplicateLayerToNextFrame}
        onDuplicateLayerToSelectedFrames={handleDuplicateLayerToSelectedFrames}
        onDuplicateLayerToAllFrames={handleDuplicateLayerToAllFrames}
        onDuplicateGroupToAllFrames={handleDuplicateGroupToAllFrames}
        onFloatMiniPreviewToCanvas={handleFloatMiniPreviewToCanvas}
        activeTool={activeTool}
        transformParams={transformSession?.params || null}
        onChangeTransformParams={(nextParams) =>
          setTransformSession((prev) => (prev ? { ...prev, params: nextParams } : null))
        }
        onCommitTransform={handleCommitTransform}
        onCancelTransform={handleCancelTransform}
        onTriggerTransformAction={handleTransformAction}
        vectorConfig={vectorConfig}
        onChangeVectorConfig={setVectorConfig}
        selectedVectorPathId={selectedVectorPathId}
        selectedVectorNodeIds={selectedVectorNodeIds}
        onVectorSelectionAction={handleVectorSelectionAction}
        eyedropperConfig={eyedropperConfig}
        onChangeEyedropperConfig={setEyedropperConfig}
        lastSampledColor={lastSampledColor}
        colorHistory={colorHistory}
        historyLength={historyLengthState}
        historyIndex={historyIndexState}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onJumpToHistory={handleJumpToHistory}
        dummiePose={dummiePose}
        onChangeDummiePose={setDummiePose}
        savedDummiePoses={savedDummiePoses}
        onSaveDummiePose={(p) => {
          const nextPoses = [{ ...p, id: `pose-saved-${Date.now()}` }, ...savedDummiePosesRef.current];
          savedDummiePosesRef.current = nextPoses;
          setSavedDummiePoses(nextPoses);
          pushHistorySnapshot({ savedDummiePoses: nextPoses });
        }}
        onDeleteSavedDummiePose={(id) => {
          const nextPoses = savedDummiePosesRef.current.filter((p) => p.id !== id);
          savedDummiePosesRef.current = nextPoses;
          setSavedDummiePoses(nextPoses);
          pushHistorySnapshot({ savedDummiePoses: nextPoses });
        }}
        onOpenApplyPoseModal={() => setApplyPoseModalOpen(true)}
        uiEditMode={Boolean(workspaceLayout.uiEditMode)}
        onToggleUiEditMode={() => executeCommandById('cmd.toggle_ui_edit_mode', false)}
        totalFreedomMode={Boolean(workspaceLayout.totalFreedomMode)}
        onToggleTotalFreedomMode={() => {
          setWorkspaceLayout((prev) => {
            const nextFloating = { ...(prev.floatingPanels || {}) };
            delete nextFloating.toolbar;
            delete nextFloating.topbar;
            return {
              ...prev,
              totalFreedomMode: false,
              floatingPanels: nextFloating,
              rightPanels: prev.rightPanels.map((p) =>
                p.id === 'toolbar'
                  ? { ...p, dock: 'left-main' }
                  : p.id === 'topbar'
                  ? { ...p, dock: 'top' }
                  : p
              ),
              tabGroups: (prev.tabGroups || [])
                .map((g) => ({
                  ...g,
                  panelIds: g.panelIds.filter((id) => id !== 'toolbar' && id !== 'topbar'),
                }))
                .filter((g) => g.panelIds.length >= 2),
              templateId: 'custom',
            };
          });
          appendStudioLog('Barra Superior y Herramientas devueltas a bordes fijos.');
        }}
        collapseDisplayMode={(workspaceLayout.collapseDisplayMode || 'both') as PanelCollapseDisplayMode}
        dockOrientations={workspaceLayout.dockOrientations}
        onChangeDockOrientation={(zone, ori: DockOrientation) =>
          setWorkspaceLayout((prev) => ({
            ...prev,
            dockOrientations: { ...(prev.dockOrientations || {}), [zone]: ori },
            templateId: 'custom',
          }))
        }
        topDockHeight={workspaceLayout.topDockHeight}
        bottomDockHeight={workspaceLayout.bottomDockHeight}
        onResizeTopDock={(h) =>
          setWorkspaceLayout((prev) => ({ ...prev, topDockHeight: h, templateId: 'custom' }))
        }
        onResizeBottomDock={(h) =>
          setWorkspaceLayout((prev) => ({
            ...prev,
            bottomDockHeight: h,
            timelineHeight: h,
            templateId: 'custom',
          }))
        }
        panelHeights={workspaceLayout.panelHeights}
        panelWidths={workspaceLayout.panelWidths}
        onChangePanelDimensions={(panelId, dims) =>
          setWorkspaceLayout((prev) => {
            let nextWidths = prev.panelWidths;
            if (dims.width !== undefined) {
              nextWidths = { ...(prev.panelWidths || {}) };
              if (dims.width === null) delete nextWidths[panelId];
              else nextWidths[panelId] = dims.width;
            }
            let nextHeights = prev.panelHeights;
            if (dims.height !== undefined) {
              nextHeights = { ...(prev.panelHeights || {}) };
              if (dims.height === null) delete nextHeights[panelId];
              else nextHeights[panelId] = dims.height;
            }
            return {
              ...prev,
              panelWidths: nextWidths,
              panelHeights: nextHeights,
              templateId: 'custom',
            };
          })
        }
        compactPanels={workspaceLayout.compactPanels}
        onTogglePanelCompact={(panelId) =>
          setWorkspaceLayout((prev) => ({
            ...prev,
            compactPanels: {
              ...(prev.compactPanels || {}),
              [panelId]: !prev.compactPanels?.[panelId],
            },
            templateId: 'custom',
          }))
        }
        onMergePanelsToTabGroup={handleMergePanelsToTabGroup}
        renderTimelineSlot={renderTimelineSlotNode}
        renderTotalFreedomToolbarSlot={renderToolbarInstance}
        totalFreedomTopBarSlot={topBarNode}
        onSelectTool={handleSelectTool}
        ditherPattern={ditherPattern}
        onChangeDitherPattern={setDitherPattern}
        ditherConfig={ditherConfig}
        onChangeDitherConfig={setDitherConfig}
        shapeConfig={shapeConfig}
        onChangeShapeConfig={handleChangeShapeConfig}
        bucketSubTool={bucketSubTool}
        onChangeBucketSubTool={setBucketSubTool}
        gradientConfig={gradientConfig}
        onChangeGradientConfig={setGradientConfig}
        fps={animationFps}
        onChangeFps={setAnimationFps}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((v) => !v)}
        onSelectFrame={setCurrentFrameIndex}
        playbackMode={playbackMode}
        onChangePlaybackMode={setPlaybackMode}
        onionSkinEnabled={onionSkinEnabled}
        onToggleOnionSkin={() => setOnionSkinEnabled((v) => !v)}
        onionSkinPrev={onionSkinPrev}
        onChangeOnionSkinPrev={setOnionSkinPrev}
        onionSkinNext={onionSkinNext}
        onChangeOnionSkinNext={setOnionSkinNext}
        onionSkinOpacity={onionSkinOpacity}
        onChangeOnionSkinOpacity={setOnionSkinOpacity}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid((v) => !v)}
        showHitboxes={showHitboxes}
        onToggleHitboxes={() => setShowHitboxes((v) => !v)}
        onSetLayerKeyframe={(layerIdx, _frameIdx, kf) => handleSetLayerKeyframe(layerIdx, kf)}
        onRemoveLayerKeyframe={handleRemoveLayerKeyframe}
        onSaveProjectPcs={() => void handleSmartSave()}
        studioLogs={studioLogs}
        onRunConsoleCommand={handleRunConsoleCommand}
        autoApplyAllFrames={autoApplyAiAllFrames}
        onToggleAutoApplyAllFrames={() => setAutoApplyAiAllFrames((v) => !v)}
        symmetryConfig={symmetryConfig}
        onChangeSymmetryConfig={handleChangeSymmetryConfig}
        workMode={workMode}
        onChangeWorkMode={handleChangeWorkMode}
        stageParallaxConfig={stageParallaxConfig}
        onChangeStageParallaxConfig={setStageParallaxConfig}
        onUpdateLayerParallaxSpeed={handleUpdateLayerParallaxSpeed}
        tilesetConfig={tilesetConfig}
        onChangeTilesetConfig={setTilesetConfig}
        onCreateSuggestedModeLayers={handleCreateSuggestedModeLayers}
        onApplyModeGuides={handleApplyModeGuides}
        onInsertModeTemplate={handleInsertModeTemplate}
        onTriggerModeAi={handleTriggerModeAi}
        onOpenFxStudio={handleOpenFxStudio}
        lastGeneratedFxRecipe={lastGeneratedFxRecipe}
        onOpenModeExportModal={() => {
          setExportModalTab('mode_export');
          setExportModalOpen(true);
        }}
        guidesConfig={guidesConfig}
        onChangeGuidesConfig={handleChangeGuidesConfig}
        onOpenGuidesModal={(tab: GuidesModalTab = 'perspective') => {
          setGuidesModalTab(tab);
          setGuidesModalOpen(true);
        }}
        tilesets={tilesets}
        onChangeTilesets={setTilesets}
        tileToolConfig={tileToolConfig}
        onChangeTileToolConfig={setTileToolConfig}
        onCaptureTileFromCanvas={handleCaptureTileFromCanvas}
        activeFightingProfile={activeFightingProfile}
        onApplyFightingProfile={handleApplyFightingProfile}
        onAddStageRoleLayer={handleAddStageRoleLayer}
        onFocusTilesetsPanel={() => handleFocusPanel('tilesets')}
        onStudioNotify={(msg) => {
          setImportNotification(msg);
          setTimeout(() => setImportNotification(null), 2600);
        }}
        centerCanvas={
          <CanvasViewport
            width={canvasWidth}
            height={canvasHeight}
            currentFrame={currentFrame}
            currentLayer={currentLayer}
            layerGroups={layerGroups}
            previousFrame={prevFrame}
            nextFrame={nextFrame}
            onionSkinEnabled={onionSkinEnabled}
            onionSkinOpacity={onionSkinOpacity}
            onionSkinPrev={onionSkinPrev}
            onionSkinNext={onionSkinNext}
            showGrid={showGrid}
            showHitboxes={showHitboxes}
            showPivot={showPivot}
            globalPivot={globalPivot}
            onUpdatePivot={setGlobalPivot}
            stageType={stageType}
            stageOpacity={stageOpacity}
            groundConfig={groundConfig}
            dummyOpponent={dummyOpponent}
            combatFx={combatFx}
            symmetryEnabled={symmetryEnabled}
            symmetryAxis={symmetryAxis}
            symmetryConfig={symmetryConfig}
            onChangeSymmetryConfig={handleChangeSymmetryConfig}
            activeTool={activeTool}
            moveSubTool={moveSubTool}
            onChangeMoveSubTool={setMoveSubTool}
            selectionSubTool={selectionSubTool}
            onSelectLayerIndex={setCurrentLayerIndex}
            bucketSubTool={bucketSubTool}
            onChangeBucketSubTool={setBucketSubTool}
            gradientConfig={gradientConfig}
            onChangeGradientConfig={setGradientConfig}
            shapeConfig={shapeConfig}
            onChangeShapeConfig={handleChangeShapeConfig}
            selectionDisplayConfig={selectionDisplayConfig}
            zoomToolMode={zoomToolMode}
            onChangeZoomToolMode={setZoomToolMode}
            zoomCommand={zoomCommand}
            brushSize={brushSize}
            pixelPerfect={pixelPerfect}
            ditherPattern={ditherPattern}
            ditherConfig={ditherConfig}
            marqueeShape={marqueeShape}
            lassoMode={lassoMode}
            clipOutsideCanvas={clipOutsideCanvas}
            liveCanvasPreview={liveCanvasPreview}
            activeHitboxType={activeHitboxType}
            primaryColor={primaryColor}
            primaryAlpha={primaryAlpha}
            secondaryColor={secondaryColor}
            onUpdateLayerPixels={handleUpdateLayerPixels}
            onCommitTiledLayerEdit={handleCommitTiledLayerEdit}
            onUpdateHitboxes={handleUpdateHitboxes}
            onPickColor={handlePickColorWithHistory}
            allFrames={frames}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying((v) => !v)}
            playbackMode={playbackMode}
            fps={animationFps}
            currentFrameIndex={currentFrameIndex}
            onSelectFrame={setCurrentFrameIndex}
            linkMoveAllFrames={linkMoveAllFrames}
            onShiftAllFramesLayer={handleShiftAllFramesLayer}
            showMiniPlayerProp={workspaceLayout.showMiniPlayer}
            miniPreviewCollapsedProp={workspaceLayout.miniPreviewCollapsed ?? true}
            miniPreviewWidthProp={workspaceLayout.miniPreviewWidth ?? 176}
            miniPreviewHeightProp={workspaceLayout.miniPreviewHeight ?? 140}
            miniPreviewPositionProp={workspaceLayout.miniPreviewPosition ?? null}
            onUpdateMiniPreviewState={handleUpdateMiniPreviewState}
            onDockMiniPreviewToSidebar={handleDockMiniPreviewToSidebar}
            brushSettings={brushSettings}
            selection={selection}
            onChangeSelection={setSelection}
            onCreateTextLayer={handleCreateTextLayer}
            references={references}
            referenceGroups={referenceGroups}
            activeReferenceId={activeReferenceId}
            onSelectReference={setActiveReferenceId}
            onUpdateReference={handleUpdateReference}
            onBringReferenceToFront={handleBringReferenceToFront}
            pureRefConfig={pureRefConfig}
            onChangePureRefConfig={setPureRefConfig}
            onCenterAllReferences={handleCenterAllReferences}
            onDropLibraryAssetAt={handleDropLibraryAssetAt}
            combatTestActive={combatTestActive}
            onExitCombatTest={() => setCombatTestActive(false)}
            editingMask={editingMask}
            onUpdateLayerMaskPixels={handleUpdateLayerMaskPixels}
            transformSession={transformSession}
            transformSnapConfig={transformSnapConfig}
            onChangeTransformParams={(nextParams) =>
              setTransformSession((prev) => (prev ? { ...prev, params: nextParams } : null))
            }
            onChangeTransformSnapConfig={setTransformSnapConfig}
            onCommitTransform={handleCommitTransform}
            onCancelTransform={handleCancelTransform}
            onTriggerTransformAction={handleTransformAction}
            selectedLayersCount={selectedLayerIndices.length}
            selectedFramesCount={selectedFrameIndices.length}
            hasActiveGroup={Boolean(activeGroupId)}
            vectorConfig={vectorConfig}
            onChangeVectorConfig={setVectorConfig}
            selectedVectorPathId={selectedVectorPathId}
            onSelectVectorPathId={setSelectedVectorPathId}
            selectedVectorNodeIds={selectedVectorNodeIds}
            onSelectVectorNodeIds={setSelectedVectorNodeIds}
            onUpdateLayerVectorPaths={handleUpdateLayerVectorPaths}
            onConvertVectorPath={handleConvertVectorPath}
            eyedropperConfig={eyedropperConfig}
            activePaletteColors={activePaletteColors}
            colorHistory={colorHistory}
            onSampledColorUpdate={setLastSampledColor}
            dummiePose={dummiePose}
            onChangeDummiePose={setDummiePose}
            cameraShake={cameraShake}
            cameraKeyframes={cameraKeyframes}
            cameraShakeTestNonce={cameraShakeTestNonce}
            selectedHitboxId={selectedHitboxId}
            onSelectHitboxId={setSelectedHitboxId}
            vectorConfirmPolicy={vectorConfirmPolicy}
            onChangeVectorConfirmPolicy={setVectorConfirmPolicy}
            showPixelPerfectVectorPreview={showPixelPerfectVectorPreview}
            onTogglePixelPerfectVectorPreview={() => setShowPixelPerfectVectorPreview((v) => !v)}
            onBakeVectorPath={handleBakeVectorPath}
            onUiContextFocus={() => setLastActiveUiContext('canvas')}
            onSmartDelete={handleSmartDelete}
            eraserOptions={eraserOptions}
            bucketOptions={bucketOptions}
            magicWandOptions={magicWandOptions}
            selectionOptions={selectionOptions}
            moveOptions={moveOptions}
            selectedParametricShapeId={selectedParametricShapeId}
            onSelectParametricShapeId={setSelectedParametricShapeId}
            onUpdateLayerParametricShapes={handleUpdateLayerParametricShapes}
            onRasterizeParametricShape={handleRasterizeParametricShape}
            shapeRasterPolicy={shapeRasterPolicy}
            guides={guides}
            guidesConfig={guidesConfig}
            selectedGuideId={selectedGuideId}
            onSelectGuide={setSelectedGuideId}
            onAddGuide={handleAddGuide}
            onUpdateGuide={handleUpdateGuide}
            onDuplicateGuide={handleDuplicateGuide}
            onDeleteGuide={handleDeleteGuide}
            onChangeGuidesConfig={handleChangeGuidesConfig}
            onOpenGuidesModal={(tab: GuidesModalTab = 'perspective') => {
              setGuidesModalTab(tab);
              setGuidesModalOpen(true);
            }}
            onFocusGuidesContext={() => setLastActiveUiContext('guides')}
            wheelNavMode={wheelNavMode}
            workMode={workMode}
            stageParallaxConfig={stageParallaxConfig}
            tilesetConfig={tilesetConfig}
            performanceMode={performanceMode}
            canvasEditRect={canvasEditRect}
            canvasEditConfig={canvasEditConfig}
            hasOffCanvasContent={hasOffCanvasContent}
            onChangeCanvasEditRect={setCanvasEditRect}
            onApplyCanvasEdit={handleApplyCanvasEdit}
            onResetCanvasEdit={handleResetCanvasEdit}
            onCancelCanvasEdit={handleCancelCanvasEdit}
            tileToolConfig={tileToolConfig}
            tilesets={tilesets}
            onChangeTileToolConfig={setTileToolConfig}
            onCommitTileLayerEdit={handleCommitTileLayerEdit}
          />
        }
      />

      {/* Export Modal with Animated GIF, Spritesheet, PNG Sequence ZIP, Single Frame & Work Mode Export */}
      <StudioTopLayerPortal isOpen={exportModalOpen} tier="modal" autoFocus ariaRole="dialog">
        <ExportModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          project={currentProjectState}
          currentFrame={currentFrame}
          initialTab={exportModalTab}
          workMode={workMode}
        />
      </StudioTopLayerPortal>

      {/* Advanced FX Studio & Modular FX Lab Modal */}
      <StudioTopLayerPortal isOpen={fxStudioModalOpen} tier="modal" autoFocus ariaRole="dialog">
        <FxStudioModal
          isOpen={fxStudioModalOpen}
          onClose={() => setFxStudioModalOpen(false)}
          initialTab={fxStudioTab}
          initialRecipe={fxStudioInitialRecipe}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          activePaletteColors={activePaletteColors}
          activeCanvasGrid={currentFrame?.layers[currentLayerIndex]?.pixels || null}
          activeCanvasLayerName={currentFrame?.layers[currentLayerIndex]?.name}
          performanceMode={performanceMode}
          onInjectResult={handleInjectFxStudioResult}
          onShowToast={(msg) => setImportNotification(msg)}
        />
      </StudioTopLayerPortal>

      {/* Local Standalone Windows .EXE Installer Builder Modal */}
      <StudioTopLayerPortal isOpen={localInstallerModalOpen} tier="modal" autoFocus ariaRole="dialog">
        <LocalInstallerModal
          isOpen={localInstallerModalOpen}
          onClose={() => setLocalInstallerModalOpen(false)}
          project={currentProjectState}
        />
      </StudioTopLayerPortal>

      {/* Smart Import Destination Modal (triggered from Menu or External File Drop) */}
      <StudioTopLayerPortal isOpen={smartImportFiles.length > 0} tier="modal" autoFocus ariaRole="dialog">
        <SmartImportModal
          isOpen={smartImportFiles.length > 0}
          files={smartImportFiles}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          activeGroupName={
            layerGroups.find(
              (g) => g.id === (currentFrame.layers[currentLayerIndex]?.groupId || activeGroupId)
            )?.name || null
          }
          activeFrameName={currentFrame.name || `Frame ${currentFrameIndex + 1}`}
          totalFrames={frames.length}
          onConfirm={(
            destination: SmartImportDestination,
            fitMode: SmartImportFitMode,
            interpolation: InterpolationMode = 'nearest'
          ) => {
            const filesToImport = [...smartImportFiles];
            setSmartImportFiles([]);
            void executeImportIntoProject(filesToImport, destination, fitMode, interpolation, true);
          }}
          onOpenAsNewDocument={(file: File) => {
            setSmartImportFiles([]);
            void handleOpenDocumentFile(file);
          }}
          onCancel={() => setSmartImportFiles([])}
        />
      </StudioTopLayerPortal>

      {/* Missing Recent File Recovery Modal ("El archivo no se encuentra en su ubicación original.") */}
      <StudioTopLayerPortal isOpen={missingRecentEntry !== null} tier="modal" autoFocus ariaRole="alertdialog">
        <MissingRecentFileModal
          isOpen={missingRecentEntry !== null}
          entry={missingRecentEntry}
          onLocateFile={(entry) => {
            setMissingRecentEntry(null);
            void handleOpenFilePicker(entry.id);
          }}
          onRemoveFromRecents={(entry) => {
            handleRemoveRecentProject(entry.id);
            setMissingRecentEntry(null);
            setImportNotification(`"${entry.name}" eliminado de archivos recientes.`);
            setTimeout(() => setImportNotification(null), 2600);
          }}
          onCancel={() => setMissingRecentEntry(null)}
        />
      </StudioTopLayerPortal>

      {/* Descriptive File Load & Post-Validation Error Modal (never creates empty canvas) */}
      <StudioTopLayerPortal isOpen={fileLoadError !== null} tier="modal" autoFocus ariaRole="alertdialog">
        <FileLoadErrorModal
          isOpen={fileLoadError !== null}
          error={fileLoadError}
          onRetryPickFile={() => {
            setFileLoadError(null);
            void handleOpenFilePicker();
          }}
          onRetryFile={(file) => {
            setFileLoadError(null);
            void handleOpenDocumentFile(file);
          }}
          onRecoverPsdWithMode={(file, mode) => {
            setFileLoadError(null);
            void handleOpenDocumentFile(file, { psdRecoveryMode: mode });
          }}
          onClose={() => setFileLoadError(null)}
        />
      </StudioTopLayerPortal>

      {/* PSD Compatibility Breakdown Modal (shown when warnings or recovery conversion occurred) */}
      <StudioTopLayerPortal isOpen={psdCompatibilityReport !== null} tier="modal" autoFocus ariaRole="dialog">
        <PsdCompatibilityReportModal
          isOpen={psdCompatibilityReport !== null}
          report={psdCompatibilityReport}
          onClose={() => setPsdCompatibilityReport(null)}
        />
      </StudioTopLayerPortal>

      {/* Optional Spritesheet Detection Prompt ("Se ha detectado una posible hoja de sprites. ¿Desea abrirla como spritesheet?") */}
      <StudioTopLayerPortal isOpen={pendingSpritesheetPrompt !== null} tier="modal" autoFocus ariaRole="dialog">
        <SpritesheetDetectedPromptModal
          isOpen={pendingSpritesheetPrompt !== null}
          fileName={pendingSpritesheetPrompt?.fileName || ''}
          rawRaster={pendingSpritesheetPrompt?.rawRaster || null}
          candidate={pendingSpritesheetPrompt?.candidate || null}
          onConfirmSpritesheet={handleConfirmSpritesheetDetectedYes}
          onOpenIntactImage={() => void handleConfirmSpritesheetDetectedNo()}
          onCancel={() => setPendingSpritesheetPrompt(null)}
        />
      </StudioTopLayerPortal>

      {/* Import Resolution Mismatch Prompt ("¿Cómo desea abrir este archivo?") */}
      <StudioTopLayerPortal isOpen={pendingResolutionMismatch !== null} tier="modal" autoFocus ariaRole="dialog">
        <ImportResolutionMismatchModal
          isOpen={pendingResolutionMismatch !== null}
          fileName={pendingResolutionMismatch?.fileName || ''}
          sourceWidth={pendingResolutionMismatch?.sourceWidth || canvasWidth}
          sourceHeight={pendingResolutionMismatch?.sourceHeight || canvasHeight}
          sourceDpi={pendingResolutionMismatch?.sourceDpi || 72}
          previewDataUrl={pendingResolutionMismatch?.previewDataUrl || null}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          onConfirm={(action: ResolutionMismatchAction, interpolation: InterpolationMode) => {
            if (!pendingResolutionMismatch) return;
            const pending = pendingResolutionMismatch;
            setPendingResolutionMismatch(null);
            if (action === 'new_document') {
              void handleOpenDocumentFile(pending.files[0]);
              return;
            }
            if (action === 'original_size') {
              const resized = resizeCanvasGrid(
                framesRef.current,
                canvasWidth,
                canvasHeight,
                pending.sourceWidth,
                pending.sourceHeight,
                'top-left'
              );
              setCanvasWidth(pending.sourceWidth);
              setCanvasHeight(pending.sourceHeight);
              setDocumentDpi(pending.sourceDpi || 72);
              framesRef.current = resized;
              setFrames(resized);
              setGlobalPivot({
                x: Math.floor(pending.sourceWidth / 2),
                y: Math.floor(pending.sourceHeight * 0.8),
              });
              void executeImportIntoProject(
                pending.files,
                pending.mode,
                'original',
                'nearest',
                true,
                { width: pending.sourceWidth, height: pending.sourceHeight }
              );
              return;
            }
            if (action === 'center_no_resize') {
              void executeImportIntoProject(
                pending.files,
                pending.mode,
                'center_no_resize',
                'nearest',
                true
              );
              return;
            }
            // 'fit_canvas'
            void executeImportIntoProject(
              pending.files,
              pending.mode,
              'fit',
              interpolation,
              true
            );
          }}
          onCancel={() => setPendingResolutionMismatch(null)}
        />
      </StudioTopLayerPortal>

      {/* Interactive Spritesheet Slicer Modal */}
      <StudioTopLayerPortal isOpen={pendingSpritesheetOpen !== null} tier="modal" autoFocus ariaRole="dialog">
        <SpritesheetSlicerModal
          isOpen={pendingSpritesheetOpen !== null}
          fileName={pendingSpritesheetOpen?.fileName || ''}
          rawRaster={pendingSpritesheetOpen?.rawRaster || null}
          candidate={pendingSpritesheetOpen?.candidate || null}
          allowOpenAsSingleImage={pendingSpritesheetOpen?.allowOpenAsSingleImage !== false}
          onConfirmSlice={handleConfirmSpritesheetSlice}
          onOpenAsSingleImage={handleOpenSpritesheetAsSingleImage}
          onCancel={() => setPendingSpritesheetOpen(null)}
        />
      </StudioTopLayerPortal>

      {/* Global OS Clipboard Smart Paste Destination Modal */}
      <StudioTopLayerPortal isOpen={pendingClipboardImage !== null} tier="modal" autoFocus ariaRole="dialog">
        <SmartPasteModal
          isOpen={pendingClipboardImage !== null}
          payload={pendingClipboardImage}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          activeGroupName={
            layerGroups.find(
              (g) => g.id === (currentFrame.layers[currentLayerIndex]?.groupId || activeGroupId)
            )?.name || null
          }
          initialDontAskAgain={quickPasteMode}
          onConfirm={({ destination, fitMode, dontAskAgain }) => {
            const payload = pendingClipboardImage;
            setPendingClipboardImage(null);
            if (dontAskAgain !== quickPasteMode) {
              setQuickPasteMode(dontAskAgain);
            }
            if (payload) {
              executeClipboardImagePaste(payload, destination, fitMode);
            }
          }}
          onCancel={() => setPendingClipboardImage(null)}
        />
      </StudioTopLayerPortal>

      {/* Single Modified Document Close Protection & Sequential One-by-One Review Dialog */}
      {(() => {
        const activeReviewDocId =
          reviewCloseSession && saveAsModalState === null
            ? reviewCloseSession.docIds[reviewCloseSession.currentIndex] || null
            : null;
        const modalDocId = pendingCloseDocId || activeReviewDocId;
        const pendingDoc = modalDocId
          ? openDocuments.find((d) => d.id === modalDocId) || null
          : null;
        const isReview = Boolean(!pendingCloseDocId && reviewCloseSession && pendingDoc);

        const advanceReviewOrFinish = () => {
          if (!reviewCloseSession) return;
          const nextIdx = reviewCloseSession.currentIndex + 1;
          if (nextIdx >= reviewCloseSession.docIds.length) {
            const exitFlag = reviewCloseSession.fromDesktopExit;
            setReviewCloseSession(null);
            completeAllDocumentsClose(exitFlag);
          } else {
            setReviewCloseSession({ ...reviewCloseSession, currentIndex: nextIdx });
          }
        };

        return (
          <StudioTopLayerPortal isOpen={pendingDoc !== null} tier="critical" autoFocus ariaRole="alertdialog">
            <UnsavedDocumentCloseModal
              isOpen={pendingDoc !== null}
              documentName={pendingDoc?.name || ''}
              width={pendingDoc?.width || canvasWidth}
              height={pendingDoc?.height || canvasHeight}
              isNewUnsaved={Boolean(pendingDoc?.isNewUnsaved)}
              hasSavedLocation={Boolean(pendingDoc?.hasSavedLocation)}
              reviewProgress={
                isReview && reviewCloseSession
                  ? {
                      index: reviewCloseSession.currentIndex,
                      total: reviewCloseSession.docIds.length,
                    }
                  : null
              }
              onSave={async () => {
                if (!pendingDoc) return;
                const docId = pendingDoc.id;
                if (isReview) {
                  if (!pendingDoc.hasSavedLocation) {
                    handleOpenSaveAsModal(
                      docId,
                      'review_next',
                      `${pendingDoc.name} (${reviewCloseSession!.currentIndex + 1} de ${reviewCloseSession!.docIds.length})`
                    );
                  } else {
                    const ok = await handleSaveDocumentInFormat(
                      docId,
                      pendingDoc.savedFormat || 'pcs'
                    );
                    if (ok) advanceReviewOrFinish();
                  }
                  return;
                }

                setPendingCloseDocId(null);
                if (!pendingDoc.hasSavedLocation) {
                  handleOpenSaveAsModal(docId, 'close_doc');
                } else {
                  const ok = await handleSaveDocumentInFormat(
                    docId,
                    pendingDoc.savedFormat || 'pcs'
                  );
                  if (ok) forceCloseDocumentTab(docId);
                }
              }}
              onDiscard={() => {
                if (!pendingDoc) return;
                if (isReview) {
                  advanceReviewOrFinish();
                  return;
                }
                const docId = pendingDoc.id;
                setPendingCloseDocId(null);
                forceCloseDocumentTab(docId);
              }}
              onCancel={() => {
                setPendingCloseDocId(null);
                if (isReview) {
                  setReviewCloseSession(null);
                  setIsAppClosingFromDesktop(false);
                }
              }}
            />
          </StudioTopLayerPortal>
        );
      })()}

      {/* Multi-Document Safe Close / Application Exit Checklist Dialog */}
      <StudioTopLayerPortal isOpen={unsavedAppCloseModalOpen} tier="critical" autoFocus ariaRole="alertdialog">
        <UnsavedAppCloseModal
          isOpen={unsavedAppCloseModalOpen}
          modifiedDocuments={openDocuments
            .filter((d) => d.isDirty)
            .map(
              (d): ModifiedDocumentSummary => ({
                id: d.id,
                name: d.name,
                width: d.width,
                height: d.height,
                isNewUnsaved: d.isNewUnsaved,
                hasSavedLocation: d.hasSavedLocation,
              })
            )}
          isProcessing={isBatchSavingDocs}
          onSaveSelected={(ids) => void handleBatchSaveSelectedAndClose(ids)}
          onReviewOneByOne={(ids) => handleStartReviewOneByOne(ids)}
          onDiscardAll={() => completeAllDocumentsClose()}
          onCancel={() => {
            setUnsavedAppCloseModalOpen(false);
            setIsAppClosingFromDesktop(false);
          }}
        />
      </StudioTopLayerPortal>

      {/* "Guardar como..." Format Selector Dialog (.pcs, Proyecto de animación, PNG, JPG, WEBP, GIF, Spritesheet, ASE, PSD, JSON) */}
      <StudioTopLayerPortal isOpen={saveAsModalState !== null} tier="modal" autoFocus ariaRole="dialog">
        {(() => {
          const targetDoc = saveAsModalState
            ? openDocuments.find((d) => d.id === saveAsModalState.docId) || null
            : null;
          const isLiveDoc = !targetDoc || targetDoc.id === activeDocumentId || !targetDoc.snapshot;
          const targetW = isLiveDoc ? canvasWidth : targetDoc.snapshot!.width;
          const targetH = isLiveDoc ? canvasHeight : targetDoc.snapshot!.height;
          const targetFramesCount = isLiveDoc ? frames.length : targetDoc.snapshot!.frames.length;
          return (
            <SaveAsFormatModal
              isOpen={saveAsModalState !== null}
              initialName={saveAsModalState?.initialName || projectName}
              initialFormat={saveAsModalState?.initialFormat || 'pcs'}
              width={targetW}
              height={targetH}
              framesCount={targetFramesCount}
              isSaving={isSavingAs}
              queueLabel={saveAsModalState?.queueLabel || null}
              onConfirm={async ({ fileName, format, scale, jpgBackgroundColor }) => {
                if (!saveAsModalState) return;
                const { docId, afterSaveAction } = saveAsModalState;
                setIsSavingAs(true);
                try {
                  const ok = await handleSaveDocumentInFormat(docId, format, {
                    fileName,
                    scale,
                    jpgBackgroundColor,
                  });
                  if (!ok) return;

                  setSaveAsModalState(null);

                  if (afterSaveAction === 'close_doc') {
                    forceCloseDocumentTab(docId);
                  } else if (afterSaveAction === 'batch_close_queue' && batchSaveAsQueue) {
                    const nextSavedCount = batchSaveAsQueue.savedCount + 1;
                    if (batchSaveAsQueue.remainingDocIds.length === 0) {
                      const exitFlag = batchSaveAsQueue.fromDesktopExit;
                      setBatchSaveAsQueue(null);
                      setImportNotification(`${nextSavedCount} documento(s) guardados antes de cerrar.`);
                      setTimeout(() => setImportNotification(null), 3200);
                      completeAllDocumentsClose(exitFlag);
                    } else {
                      const nextDocId = batchSaveAsQueue.remainingDocIds[0];
                      const nextDoc = openDocumentsRef.current.find((d) => d.id === nextDocId);
                      const completedIdx =
                        batchSaveAsQueue.totalNewLocationCount -
                        batchSaveAsQueue.remainingDocIds.length +
                        1;
                      setBatchSaveAsQueue({
                        ...batchSaveAsQueue,
                        remainingDocIds: batchSaveAsQueue.remainingDocIds.slice(1),
                        savedCount: nextSavedCount,
                      });
                      handleOpenSaveAsModal(
                        nextDocId,
                        'batch_close_queue',
                        `${nextDoc?.name || 'Documento'} (${completedIdx} de ${batchSaveAsQueue.totalNewLocationCount})`
                      );
                    }
                  } else if (afterSaveAction === 'review_next' && reviewCloseSession) {
                    const nextIdx = reviewCloseSession.currentIndex + 1;
                    if (nextIdx >= reviewCloseSession.docIds.length) {
                      const exitFlag = reviewCloseSession.fromDesktopExit;
                      setReviewCloseSession(null);
                      completeAllDocumentsClose(exitFlag);
                    } else {
                      setReviewCloseSession({
                        ...reviewCloseSession,
                        currentIndex: nextIdx,
                      });
                    }
                  }
                } finally {
                  setIsSavingAs(false);
                }
              }}
              onCancel={() => {
                const action = saveAsModalState?.afterSaveAction;
                setSaveAsModalState(null);
                if (action === 'batch_close_queue') {
                  setBatchSaveAsQueue(null);
                  setIsAppClosingFromDesktop(false);
                } else if (action === 'review_next') {
                  setReviewCloseSession(null);
                  setIsAppClosingFromDesktop(false);
                }
              }}
            />
          );
        })()}
      </StudioTopLayerPortal>

      {/* Web Preview Window Minimize Restore Bar (renders cleanly above HomeScreen & Workspace) */}
      <StudioTopLayerPortal isOpen={isWindowMinimized} tier="critical">
        <div
          className="fixed inset-0 flex items-end justify-center p-6 pointer-events-auto"
          style={{ backgroundColor: 'rgba(10, 9, 18, 0.94)' }}
        >
          <div
            className="w-full max-w-xl rounded-lg border px-4 py-3 flex items-center justify-between gap-4 shadow-2xl"
            style={{
              backgroundColor: 'var(--studio-bg-header)',
              borderColor: 'var(--studio-accent)',
              color: 'var(--studio-text)',
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <PixelClashLogoIcon size={28} className="shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">
                  PixelClash Studio (Minimizado)
                </div>
                <div className="text-[11px] truncate" style={{ color: 'var(--studio-text-muted)' }}>
                  {openDocuments.length} documento(s) abierto(s) · Activo: {projectName}
                  {hasAnyDirtyDocument ? ' *' : ''}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsWindowMinimized(false)}
                className="px-3.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-opacity hover:opacity-90 whitespace-nowrap"
                style={{
                  backgroundColor: 'var(--studio-accent)',
                  color: 'var(--studio-accent-text)',
                }}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Restaurar ventana</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsWindowMinimized(false);
                  handleCloseApplicationWindow();
                }}
                title="Cerrar aplicación"
                className="p-1.5 rounded border hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                style={{ borderColor: 'var(--studio-border-strong)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </StudioTopLayerPortal>

      {/* Canvas Size Modal */}
      <StudioTopLayerPortal isOpen={canvasSizeModalOpen} tier="modal" autoFocus ariaRole="dialog">
        <CanvasSizeModal
          isOpen={canvasSizeModalOpen}
          onClose={() => setCanvasSizeModalOpen(false)}
          currentWidth={canvasWidth}
          currentHeight={canvasHeight}
          layersCount={currentFrame?.layers.length || 1}
          framesCount={frames.length}
          onApply={handleApplyCanvasSize}
        />
      </StudioTopLayerPortal>

      {/* Image Size / Rescale Modal */}
      <StudioTopLayerPortal isOpen={imageSizeModalOpen} tier="modal" autoFocus ariaRole="dialog">
        <ImageSizeModal
          isOpen={imageSizeModalOpen}
          onClose={() => setImageSizeModalOpen(false)}
          currentWidth={canvasWidth}
          currentHeight={canvasHeight}
          layersCount={currentFrame?.layers.length || 1}
          framesCount={frames.length}
          onApply={handleApplyImageSize}
        />
      </StudioTopLayerPortal>

      {/* New Project Modal */}
      <StudioTopLayerPortal isOpen={newProjectModalOpen} tier="modal" autoFocus ariaRole="dialog">
        <NewProjectModal
          isOpen={newProjectModalOpen}
          initialCategory={newProjectInitialCategory}
          initialFightingProfileId={newProjectInitialFightingProfileId}
          onClose={() => {
            setNewProjectModalOpen(false);
            setNewProjectInitialCategory('Todas');
            setNewProjectInitialFightingProfileId('custom');
          }}
          onCreateProject={handleCreateNewProject}
          onCreateProjectConfig={handleCreateProjectConfig}
          recentProjects={recentProjects}
          onOpenRecentProject={handleOpenRecentProject}
          onClearRecentProjects={handleClearRecentProjects}
        />
      </StudioTopLayerPortal>

      {/* Rulers, Exact Guides & Fighting/Animation Presets Manager Modal */}
      <StudioTopLayerPortal isOpen={guidesModalOpen} tier="modal" autoFocus ariaRole="dialog">
        <GuidesManagerModal
          isOpen={guidesModalOpen}
          initialTab={guidesModalTab}
          onClose={() => setGuidesModalOpen(false)}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          guides={guides}
          guidesConfig={guidesConfig}
          onChangeGuidesConfig={handleChangeGuidesConfig}
          onAddGuide={handleAddGuide}
          onUpdateGuide={handleUpdateGuide}
          onDuplicateGuide={handleDuplicateGuide}
          onDeleteGuide={handleDeleteGuide}
          onApplyPreset={handleApplyGuidePreset}
          onClearAllGuides={handleClearAllGuides}
          onSyncDummiePerspective={(enabled) =>
            setDummiePose((prev) => ({ ...prev, respectPerspective: enabled }))
          }
        />
      </StudioTopLayerPortal>

      {/* Keyboard Shortcuts, Profiles & Macros Modal */}
      <StudioTopLayerPortal isOpen={shortcutsModalOpen} tier="modal" autoFocus ariaRole="dialog">
        <ShortcutsModal
          isOpen={shortcutsModalOpen}
          onClose={() => setShortcutsModalOpen(false)}
          bindings={shortcutBindings}
          onChangeBindings={(next) => {
            setShortcutBindings(next);
            setShortcutProfileId('custom');
          }}
          activeProfile={shortcutProfileId}
          onSelectProfile={(profile) => {
            setShortcutProfileId(profile);
            if (profile !== 'custom') {
              setShortcutBindings(buildProfileBindings(profile));
            }
          }}
          macros={recordedMacros}
          onChangeMacros={setRecordedMacros}
          isRecordingMacro={isRecordingMacro}
          recordedStepsCount={recordedMacroSteps.length}
          onToggleRecordMacro={() => {
            setIsRecordingMacro((prev) => {
              if (!prev) setRecordedMacroSteps([]);
              return !prev;
            });
          }}
          onSaveRecordedMacro={(name) => {
            if (recordedMacroSteps.length === 0) return;
            const newMacro: RecordedMacro = {
              id: `macro-${Date.now()}`,
              name: name || `Macro #${recordedMacros.length + 1}`,
              createdAt: new Date().toISOString(),
              steps: recordedMacroSteps,
            };
            setRecordedMacros((prev) => [newMacro, ...prev]);
            setIsRecordingMacro(false);
            setRecordedMacroSteps([]);
          }}
          onRunMacro={handleRunMacro}
        />
      </StudioTopLayerPortal>

      {/* Universal Action Search Modal (F1 / Ctrl+Shift+P) — Top Command Palette Tier */}
      <StudioTopLayerPortal isOpen={commandPaletteOpen} tier="command" autoFocus ariaRole="dialog">
        <CommandPaletteModal
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          bindings={shortcutBindings}
          macros={recordedMacros}
        universalItems={[
          // 0. Project Work Modes & FX Studio / FX Lab
          {
            id: 'fx.studio_generator',
            title: 'Generar Efecto (Estudio FX Avanzado)',
            subtitle: '17 tipos · 12 estilos · 9 sliders · preview en tiempo real y multi-capa',
            category: 'IA',
            keywords: 'fx efecto fuego rayo energia explosion particulas slash aura ia',
            onExecute: () => handleOpenFxStudio('generator'),
          },
          {
            id: 'fx.lab_modular',
            title: 'FX Lab (Editor Visual Modular de Efectos)',
            subtitle: 'Combina Partículas, Brillos, Rayos, Humo, Chispas y Ondas por capas',
            category: 'IA',
            keywords: 'fx lab modular particulas brillos rayos humo chispas ondas',
            onExecute: () => handleOpenFxStudio('lab'),
          },
          ...WORK_MODE_ORDER.map((modeId): UniversalSearchItem => {
            const def = WORK_MODES_REGISTRY[modeId];
            return {
              id: `workmode.${modeId}`,
              title: `Modo de Trabajo: ${def.label}`,
              subtitle: def.description,
              category: 'Interfaz',
              keywords: `modo trabajo proyecto ${def.label} ${def.shortLabel} ${def.badge} ${def.description}`,
              onExecute: () => handleChangeWorkMode(modeId),
            };
          }),
          // 1. Move Subtools & Reference Actions
          {
            id: 'sub.move_object',
            title: 'Mover Objeto (Capas / Hitboxes / Vectores / Pivote)',
            subtitle: 'Subherramienta de Mover · Predeterminada',
            category: 'Herramientas',
            shortcut: 'V',
            keywords: 'mover objeto seleccionar capas vector hitbox pivote',
            onExecute: () => {
              setActiveTool('move');
              setMoveSubTool('move_object');
            },
          },
          {
            id: 'sub.move_layer',
            title: 'Mover Capa (Solo píxeles de capa activa)',
            subtitle: 'Subherramienta de Mover',
            category: 'Herramientas',
            keywords: 'mover capa layer pixeles desplazar',
            onExecute: () => {
              setActiveTool('move');
              setMoveSubTool('move_layer');
            },
          },
          {
            id: 'sub.move_selection',
            title: 'Mover Selección (Contenido y marco de selección)',
            subtitle: 'Subherramienta de Mover',
            category: 'Herramientas',
            keywords: 'mover seleccion marquee lazo varita',
            onExecute: () => {
              setActiveTool('move');
              setMoveSubTool('move_selection');
            },
          },
          {
            id: 'sub.move_reference',
            title: 'Mover Referencia (Solo referencias, no afecta capas)',
            subtitle: 'Subherramienta de Mover · PureRef / Lienzo',
            category: 'Referencias',
            shortcut: 'Shift+R',
            keywords: 'mover referencia pureref camara escalar rotar',
            onExecute: () => {
              setActiveTool('move');
              setMoveSubTool('move_reference');
            },
          },
          {
            id: 'sub.direct_select',
            title: 'Selección Directa (Flecha Blanca · Nodos y Tangentes)',
            subtitle: 'Subherramienta de Mover · También Ctrl temporal en Línea',
            category: 'Herramientas',
            shortcut: 'A',
            keywords: 'seleccion directa flecha blanca nodos bezier tangentes curva vector',
            onExecute: () => {
              setActiveTool('move');
              setMoveSubTool('direct_select');
            },
          },
          {
            id: 'sub.lasso_magnetic',
            title: 'Lazo Magnético (Ajuste inteligente a contornos)',
            subtitle: 'Subherramienta de Lazo · Detección de bordes',
            category: 'Herramientas',
            shortcut: 'Shift+Q',
            keywords: 'lazo magnetico contorno bordes seleccion inteligente',
            onExecute: () => {
              setLassoMode('magnetic');
              setActiveTool('lasso');
            },
          },
          {
            id: 'sub.bucket_gradient',
            title: 'Degradado (Lineal, Radial, Angular, Reflejado, Diamante)',
            subtitle: 'Subherramienta de Bote de Pintura',
            category: 'Herramientas',
            keywords: 'degradado gradient bote pintura lineal radial diamante',
            onExecute: () => {
              setBucketSubTool('gradient');
              setActiveTool('bucket');
            },
          },
          {
            id: 'sub.bucket_dither_gradient',
            title: 'Degradado con Dithering (Bayer / Ordenado / Ruido / Matriz)',
            subtitle: 'Subherramienta de Bote de Pintura · Pixel Art',
            category: 'Herramientas',
            keywords: 'degradado dithering bayer tramado pixel art bote',
            onExecute: () => {
              setBucketSubTool('dither_gradient');
              setActiveTool('bucket');
            },
          },
          {
            id: 'tool.lupa_zoom',
            title: 'Herramienta Lupa (Zoom por Clic y Zoom por Región)',
            subtitle: 'Clic acerca, Alt+Clic aleja, Arrastrar encuadra zona',
            category: 'Herramientas',
            shortcut: 'Z',
            keywords: 'lupa zoom acercar alejar region vista 100 200 400 800',
            onExecute: () => handleSelectTool('zoom'),
          },
          {
            id: 'view.zoom_fit_action',
            title: 'Zoom: Ajustar Lienzo a la Ventana',
            subtitle: 'Ver > Ajustar a pantalla',
            category: 'Interfaz',
            shortcut: 'Ctrl+0',
            keywords: 'zoom ajustar ventana pantalla fit encuadrar',
            onExecute: () => triggerZoomAction('fit'),
          },
          {
            id: 'view.zoom_100_action',
            title: 'Zoom: 100% Real',
            subtitle: 'Ver > Zoom 100%',
            category: 'Interfaz',
            shortcut: 'Ctrl+1',
            keywords: 'zoom 100 real escala',
            onExecute: () => triggerZoomAction('percent', 100),
          },
          {
            id: 'view.toggle_fullscreen_action',
            title: isWindowMaximized
              ? 'Ventana: Restaurar Tamaño Normal'
              : 'Ventana: Maximizar / Pantalla Completa',
            subtitle: 'Inicio / Barra Superior / Ver > Maximizar',
            category: 'Interfaz',
            shortcut: 'F11',
            keywords: 'maximizar pantalla completa fullscreen restaurar ventana',
            onExecute: handleToggleMaximizeWindow,
          },
          {
            id: 'prefs.selection_display_open',
            title: 'Preferencias de Visualización de Selecciones',
            subtitle: 'Interfaz > Selecciones (Hormigas, Relleno, Velocidad, Color)',
            category: 'Interfaz',
            keywords: 'preferencias seleccion hormigas relleno contorno grosor velocidad opacidad',
            onExecute: () => openLayoutModal('selections'),
          },
          {
            id: 'prefs.mini_preview_open',
            title: 'Preferencias → Interfaz → Mini Preview',
            subtitle: 'Recordar último estado, Iniciar contraída, No abrir automáticamente, Solo bajo demanda',
            category: 'Interfaz',
            keywords: 'preferencias mini preview reproductor flotante contraida tamaño automatico',
            onExecute: () => openLayoutModal('minipreview'),
          },
          {
            id: 'ref.pureref_toggle',
            title: pureRefConfig.enabled
              ? 'Desactivar Modo PureRef (Volver a dibujar en lienzo)'
              : 'Activar Modo PureRef (Organizar referencias sin dibujar por error)',
            subtitle: 'Referencias en Cámara y Mesa',
            category: 'Referencias',
            shortcut: 'Ctrl+Alt+R',
            keywords: 'pureref referencias camara bloquear lienzo opacidad',
            onExecute: () => setPureRefConfig((p) => ({ ...p, enabled: !p.enabled })),
          },
          {
            id: 'ref.always_on_top',
            title: pureRefConfig.alwaysOnTop
              ? 'Referencias: Desactivar "Siempre visible"'
              : 'Referencias: Activar "Siempre visible" (Por encima de guías)',
            subtitle: 'Referencias en Modo Cámara',
            category: 'Referencias',
            keywords: 'siempre visible pin fija pureref camara',
            onExecute: () => setPureRefConfig((p) => ({ ...p, alwaysOnTop: !p.alwaysOnTop })),
          },
          {
            id: 'ref.center_all',
            title: 'Centrar Todas las Referencias en Pantalla',
            subtitle: 'Recuperar referencias perdidas o fuera de vista',
            category: 'Referencias',
            shortcut: 'Ctrl+Alt+0',
            keywords: 'centrar referencias encuadrar mesa pureref camara',
            onExecute: handleCenterAllReferences,
          },
          // 2. All 29 Modular Panels
          ...PANEL_REGISTRY.map((p): UniversalSearchItem => ({
            id: `panel:${p.id}`,
            title: `Panel: ${p.title}`,
            subtitle: `Abrir / Enfocar panel (${p.description})`,
            category: 'Paneles',
            keywords: `panel ventana dock ${p.shortLabel} ${p.title} ${p.id}`,
            onExecute: () => handleFocusPanel(p.id),
          })),
          // 2.5. Parametric Shapes & Contextual Options Bar Shortcuts
          ...(
            [
              ['rectangle', 'Forma Paramétrica: Rectángulo', 'Esquinas redondeadas independientes y transformación directa'],
              ['ellipse', 'Forma Paramétrica: Elipse / Arco', 'Elipse interactiva con apertura de arco en vivo'],
              ['polygon', 'Forma Paramétrica: Polígono', '3–24 lados, radio interno y redondeado de vértices'],
              ['star', 'Forma Paramétrica: Estrella', 'Puntas, profundidad y simetría ajustables en lienzo'],
              ['arrow', 'Forma Paramétrica: Flecha', 'Punta personalizable, grosor de cuerpo y curvatura'],
              ['custom', 'Forma Paramétrica: Personalizada', 'Presets (corazón, escudo, rayo, nube, bocadillo, cruz)'],
            ] as const
          ).map(([kind, title, subtitle]): UniversalSearchItem => ({
            id: `shape:${kind}`,
            title,
            subtitle,
            category: 'Herramientas',
            keywords: `forma parametrica ${kind} ${title} ${subtitle}`,
            onExecute: () => {
              handleChangeShapeConfig({ ...shapeConfig, shapeKind: kind });
              setActiveTool(kind === 'ellipse' ? 'circle' : 'rectangle');
            },
          })),
          {
            id: 'ui.toggle_options_bar',
            title: optionsBarState.visible
              ? 'Ocultar Barra de Opciones Contextual'
              : 'Mostrar Barra de Opciones Contextual',
            subtitle: 'Interfaz > Barra de Opciones bajo el menú principal',
            category: 'Interfaz',
            keywords: 'barra opciones contextual herramientas flotar acoplar',
            onExecute: () => setOptionsBarState((prev) => ({ ...prev, visible: !prev.visible })),
          },
          {
            id: 'ui.options_bar_ai',
            title: 'Barra Contextual: Modo Rápido de IA',
            subtitle: 'Prompt, estilo, intensidad y variaciones directamente arriba del lienzo',
            category: 'IA',
            keywords: 'ia rapida barra opciones prompt generar variaciones',
            onExecute: () => {
              setOptionsBarState((prev) => ({ ...prev, visible: true, collapsed: false }));
              setAiBarActive(true);
              setSymmetryBarActive(false);
            },
          },
          // 3. All Gallery Filters & Adjustments (Opens live preview bar with Antes/Después & Intensidad)
          ...FILTER_GALLERY_PRESETS.map((f): UniversalSearchItem => ({
            id: `filter:${f.id}`,
            title: `Filtro: ${f.name}`,
            subtitle: `${f.category} · Previsualización en Barra de Opciones`,
            category: 'Filtros y Ajustes',
            keywords: `filtro color ajuste pixel art ${f.name} ${f.category}`,
            onExecute: () => {
              setOptionsBarState((prev) => ({ ...prev, visible: true, collapsed: false }));
              startFilterQuickSession(f.id, f.name, 85);
            },
          })),
          {
            id: 'filter:panel',
            title: 'Abrir Panel de Filtros y Ajustes Color',
            subtitle: 'Tono, saturación, brillo, contraste, posterizar, curva',
            category: 'Filtros y Ajustes',
            keywords: 'filtros tono saturacion brillo contraste',
            onExecute: () => handleFocusPanel('filters'),
          },
          // 4. Universal Dithering Presets (applies as modifier on Lápiz/Pincel)
          ...(
            [
              ['checkered', 'Dithering Universal: Tablero Clásico 2×2'],
              ['bayer4', 'Dithering Universal: Matriz Bayer 4×4'],
              ['sparse', 'Dithering Universal: Trama Suave'],
              ['dense', 'Dithering Universal: Trama Densa'],
              ['horizontal', 'Dithering Universal: Líneas Horizontales'],
              ['diagonal', 'Dithering Universal: Trama Diagonal'],
            ] as const
          ).map(([pat, label]): UniversalSearchItem => ({
            id: `dither:${pat}`,
            title: label,
            subtitle: 'Activa el modificador Dithering Universal en Lápiz / Pinceles',
            category: 'Dithering',
            keywords: `dither trama patron degradado pixel art modificador pincel ${pat}`,
            onExecute: () => {
              setActiveTool('pencil');
              setDitherConfig((d) => ({ ...d, enabled: true, pattern: pat }));
              if (pat === 'checkered' || pat === 'sparse' || pat === 'dense' || pat === 'horizontal') {
                setDitherPattern(pat);
              }
            },
          })),
          // 5. Symmetry Modes (10 modes)
          ...(
            [
              ['none', 'Simetría: Desactivar'],
              ['vertical', 'Simetría: Espejo Vertical'],
              ['horizontal', 'Simetría: Espejo Horizontal'],
              ['quad', 'Simetría: Cuádruple (4 ejes)'],
              ['octal', 'Simetría: Octal (8 ejes)'],
              ['radial', 'Simetría: Radial / Mandala'],
              ['double_mirror', 'Simetría: Doble Espejo'],
              ['custom_angle', 'Simetría: Ángulo Personalizado'],
              ['point', 'Simetría: Punto Central'],
              ['custom_line', 'Simetría: Línea Libre Arrastrable'],
            ] as const
          ).map(([mode, title]): UniversalSearchItem => ({
            id: `sym:${mode}`,
            title,
            subtitle: 'Cambiar modo de simetría del lienzo',
            category: 'Simetría',
            keywords: `simetria espejo radial mandala eje ${mode}`,
            onExecute: () => {
              const next: SymmetryConfig = {
                ...symmetryConfig,
                enabled: mode !== 'none',
                mode,
              };
              handleChangeSymmetryConfig(next);
            },
          })),
          // 6. UI Style Presets & Layout Actions
          ...UI_STYLE_PRESETS.map((st): UniversalSearchItem => ({
            id: `style:${st.id}`,
            title: `Apariencia UI: ${st.name}`,
            subtitle: st.description,
            category: 'Interfaz',
            keywords: `tema estilo apariencia colores ui ${st.name}`,
            onExecute: () => setStudioStyle((prev) => ({ ...prev, ...st.patch })),
          })),
          {
            id: 'ui:appearance_modal',
            title: 'Abrir Personalización de Apariencia y Temas',
            subtitle: 'Interfaz > Personalizar apariencia...',
            category: 'Interfaz',
            keywords: 'temas colores bordes fuente degradados apariencia',
            onExecute: () => openLayoutModal('style'),
          },
          {
            id: 'ui:reset_layout',
            title: 'Restaurar Disposición Predeterminada de Paneles',
            subtitle: 'Interfaz > Restaurar disposición predeterminada',
            category: 'Interfaz',
            keywords: 'resetear layout paneles orden restaurar',
            onExecute: handleResetDefaultLayout,
          },
          // 7. Transform Modes & Project / Settings Features
          ...(
            [
              ['free', 'Transformar: Libre (Ctrl+T)'],
              ['scale', 'Transformar: Escala'],
              ['rotate', 'Transformar: Rotación'],
              ['skew', 'Transformar: Inclinar (Skew)'],
              ['distort', 'Transformar: Distorsionar'],
              ['perspective', 'Transformar: Perspectiva'],
              ['warp', 'Transformar: Deformación (Warp)'],
              ['rot_180', 'Transformar: Rotar 180°'],
            ] as const
          ).map(([act, title]): UniversalSearchItem => ({
            id: `xf:${act}`,
            title,
            subtitle: 'Edición > Transformar',
            category: 'Herramientas',
            keywords: `transformar escala rotar skew warp perspectiva ${act}`,
            onExecute: () => handleTransformAction(act),
          })),
          {
            id: 'set:canvas_size',
            title: 'Tamaño del Lienzo (Canvas Size)',
            subtitle: 'Imagen > Tamaño del lienzo...',
            category: 'Ajustes',
            keywords: 'tamano lienzo canvas resize ancla',
            onExecute: () => setCanvasSizeModalOpen(true),
          },
          {
            id: 'set:image_size',
            title: 'Escalar Imagen / Pixel Art (Image Size)',
            subtitle: 'Imagen > Escalar imagen...',
            category: 'Ajustes',
            keywords: 'escalar imagen pixel art resolucion',
            onExecute: () => setImageSizeModalOpen(true),
          },
          {
            id: 'set:lospec',
            title: 'Importar Paleta Comunitaria Lospec',
            subtitle: 'Paletas > Importar desde Lospec',
            category: 'Ajustes',
            keywords: 'lospec paleta retro colores importar',
            onExecute: () => setLospecModalOpen(true),
          },
          {
            id: 'set:spritesheet_tpl',
            title: 'Planificador / Plantilla Sprite Sheet Lucha',
            subtitle: 'Fighting Studio > Plantilla de Movimiento',
            category: 'Ajustes',
            keywords: 'spritesheet plantilla idle walk attack fighter',
            onExecute: () => setSpriteSheetModalOpen(true),
          },
          {
            id: 'file:open_document',
            title: 'Abrir Documento Independiente (Ctrl+O)',
            subtitle: 'Archivo > Abrir Documento... (PNG, JPG, WEBP, GIF, BMP, TIFF, TGA, ICO, ASE, PSD, PCS, JSON)',
            category: 'Ajustes',
            shortcut: 'Ctrl+O',
            keywords: 'abrir documento archivo nuevo proyecto pestana png jpg webp gif bmp tiff tga ico psd ase pcs spritesheet',
            onExecute: () => void handleOpenFilePicker(),
          },
          {
            id: 'file:smart_import',
            title: 'Importación Inteligente al Proyecto Actual',
            subtitle: 'Archivo > Importar al Proyecto > Importación Inteligente...',
            category: 'Ajustes',
            shortcut: 'Ctrl+Shift+I',
            keywords: 'importar imagen capa grupo referencia asset pincel frame',
            onExecute: () => handleTriggerImport('smart'),
          },
          {
            id: 'file:import_external_project',
            title: 'Importar Proyecto Externo en el Actual',
            subtitle: 'Archivo > Importar al Proyecto > Importar Proyecto Externo...',
            category: 'Ajustes',
            keywords: 'importar proyecto fusionar capas frames pcs psd ase',
            onExecute: () => handleTriggerImport('external_project'),
          },
          {
            id: 'view:toggle_rulers',
            title: guidesConfig.showRulers ? 'Ocultar Reglas (Ctrl+R)' : 'Mostrar Reglas (Ctrl+R)',
            subtitle: 'Ver > Reglas · Unidades en px, % o personalizadas',
            category: 'Interfaz',
            shortcut: 'Ctrl+R',
            keywords: 'reglas ruler medidas pixeles porcentaje unidades',
            onExecute: () =>
              handleChangeGuidesConfig({ ...guidesConfig, showRulers: !guidesConfig.showRulers }),
          },
          {
            id: 'view:toggle_guides',
            title: guidesConfig.showGuides ? 'Ocultar Guías (Ctrl+;)' : 'Mostrar Guías (Ctrl+;)',
            subtitle: 'Ver > Guías y Reglas > Mostrar Guías',
            category: 'Interfaz',
            shortcut: 'Ctrl+;',
            keywords: 'guias mostrar ocultar composicion snap',
            onExecute: () =>
              handleChangeGuidesConfig({ ...guidesConfig, showGuides: !guidesConfig.showGuides }),
          },
          {
            id: 'view:guides_exact_modal',
            title: 'Crear Guía en Posición Exacta / Administrar Guías...',
            subtitle: 'Ver > Guías y Reglas · Coordenadas exactas, snap y presets',
            category: 'Interfaz',
            keywords: 'guia exacta x y px reglas snap bloquear duplicar',
            onExecute: () => {
              setGuidesModalTab('exact');
              setGuidesModalOpen(true);
            },
          },
          {
            id: 'view:guides_presets',
            title: 'Guías de Animación y Lucha (Horizonte, HUD, Personajes, Escenarios)',
            subtitle: 'Ver > Guías y Reglas > Guías de Animación / Lucha',
            category: 'Animación',
            keywords: 'guias horizonte hud personajes escenarios composicion lucha',
            onExecute: () => {
              setGuidesModalTab('presets');
              setGuidesModalOpen(true);
            },
          },
          {
            id: 'view:wheel_nav_mode',
            title: `Navegación con Rueda: ${wheelNavMode === 'pan' ? 'Cambiar a Zoom' : 'Cambiar a Desplazamiento'}`,
            subtitle: 'Rueda=Vertical · Shift+Rueda=Horizontal · Ctrl+Rueda=Zoom',
            category: 'Interfaz',
            keywords: 'rueda raton scroll zoom paneo mano navegacion',
            onExecute: () => setWheelNavMode((m) => (m === 'pan' ? 'zoom' : 'pan')),
          },
          {
            id: 'set:installer',
            title: 'Instalador Windows (.exe) — Paquete de Escritorio',
            subtitle: 'Archivo > Instalador Windows (.exe)',
            category: 'Ajustes',
            keywords: 'instalador windows exe nsis inno rust tauri escritorio descargar',
            onExecute: () => setLocalInstallerModalOpen(true),
          },
          {
            id: 'help:what_is_this',
            title: 'Modo "¿Dónde está?" (Inspector Visual con Cursor)',
            subtitle: 'Ayuda > Modo "¿Dónde está?" (Shift+F1)',
            category: 'Ajustes',
            shortcut: 'Shift+F1',
            keywords: 'ayuda donde esta inspector cursor tooltip',
            onExecute: () => setWhatIsThisActive(true),
          },
          {
            id: 'help:tool_guide',
            title: 'Manual Interactivo y Guía de Herramientas',
            subtitle: 'Ayuda > Manual Interactivo',
            category: 'Ajustes',
            keywords: 'manual guia tutorial ayuda',
            onExecute: () => setToolGuideModalOpen(true),
          },
          {
            id: 'help:where_is_tool',
            title: '¿Dónde está esta herramienta? (Localizador jerárquico)',
            subtitle: 'Ayuda > ¿Dónde está esta herramienta? (Ctrl+Alt+H)',
            category: 'Ajustes',
            shortcut: 'Ctrl+Alt+H',
            keywords: 'donde esta herramienta buscar localizar panel menu controles shake curvas',
            onExecute: () => {
              setToolGuideFocusSearchNonce((n) => n + 1);
              setToolGuideModalOpen(true);
            },
          },
          {
            id: 'edit:smart_delete',
            title: 'Eliminación Inteligente Contextual (Suprimir)',
            subtitle: 'Detecta capa, grupo, vector, hitbox, keyframe o referencia activa',
            category: 'Herramientas',
            shortcut: 'Delete',
            keywords: 'suprimir delete eliminar borrar capa vector hitbox referencia keyframe',
            onExecute: handleSmartDelete,
          },
          {
            id: 'anim:camera_shake',
            title: 'Temblor de Cámara (Camera Shake) y Keyframes de Cámara',
            subtitle: 'Panel Animación > Controladores de Cámara',
            category: 'Animación',
            shortcut: 'Ctrl+Alt+T',
            keywords: 'temblor camara screen shake camera keyframes zoom paneo hitstop',
            onExecute: () => handleFocusPanel('animation'),
          },
          {
            id: 'anim:camera_shake_test',
            title: 'Probar Temblor de Cámara en Lienzo (Preview)',
            subtitle: 'Ejecuta una prueba instantánea del temblor configurado',
            category: 'Animación',
            shortcut: 'Ctrl+Alt+T',
            keywords: 'probar test temblor shake camara',
            onExecute: () => setCameraShakeTestNonce((n) => n + 1),
          },
          {
            id: 'anim:timeline_curves',
            title: 'Timeline: Curvas de Animación, Interpolación y Eventos',
            subtitle: 'Línea de Tiempo > Barra Curvas / Interpolación / Eventos',
            category: 'Animación',
            keywords: 'timeline curvas animacion interpolacion easing eventos keyframes camara',
            onExecute: () => setForceOpenCurvesNonce((n) => n + 1),
          },
          {
            id: 'vec:pixel_preview',
            title: showPixelPerfectVectorPreview
              ? 'Vista Pixel-Perfect Vectorial: Desactivar'
              : 'Vista Pixel-Perfect Vectorial: Activar (Simultánea)',
            subtitle: 'Inspector Vectorial > Vista Pixel-Perfect (Shift+P)',
            category: 'Herramientas',
            shortcut: 'Shift+P',
            keywords: 'linea vectorial vista previa pixel perfect tiempo real confirmar cancelar',
            onExecute: () => setShowPixelPerfectVectorPreview((v) => !v),
          },
        ]}
        onExecuteCommand={(id) => executeCommandById(id)}
        onRunMacro={handleRunMacro}
        onActivateWhatIsThis={() => setWhatIsThisActive(true)}
      />
      </StudioTopLayerPortal>

      {/* Hold-Alt Shortcuts Cheat Sheet Overlay — Top Overlay Tier */}
      <StudioTopLayerPortal
        isOpen={altKeyHeld && !shortcutsModalOpen && !commandPaletteOpen}
        tier="overlay"
        pointerEventsNone
      >
        <AltShortcutsOverlay visible={altKeyHeld && !shortcutsModalOpen && !commandPaletteOpen} bindings={shortcutBindings} />
      </StudioTopLayerPortal>

      {/* AI Safe Destination Modal */}
      <StudioTopLayerPortal isOpen={Boolean(pendingAiInsert)} tier="modal" autoFocus ariaRole="dialog">
        <AiInsertDestinationModal
          isOpen={Boolean(pendingAiInsert)}
          title={pendingAiInsert?.title || 'Insertar Contenido IA'}
          defaultLayerName={pendingAiInsert?.defaultLayerName || 'Capa IA'}
          totalFrames={frames.length}
          currentFrameIndex={currentFrameIndex}
          selectedFrameIndices={selectedFrameIndices}
          activeGroupName={
            layerGroups.find((g) => g.id === (activeGroupId || currentLayer?.groupId))?.name || null
          }
          onCancel={() => setPendingAiInsert(null)}
          onConfirm={(cfg) => {
            if (!pendingAiInsert) return;
            if (cfg.autoApplyAllFrames) setAutoApplyAiAllFrames(true);
            applyAiInsertConfig(
              {
                ...cfg,
                wrapInGroup: Boolean(pendingAiInsert.groupName),
                groupName: pendingAiInsert.groupName,
                groupColor: pendingAiInsert.groupColor,
                insertAtBottom: pendingAiInsert.insertAtBottom,
              },
              pendingAiInsert.sequenceGrids,
              pendingAiInsert.hitboxes
            );
            setPendingAiInsert(null);
          }}
        />
      </StudioTopLayerPortal>

      {/* Intelligent 2D Pose Dummie Apply Modal */}
      <StudioTopLayerPortal isOpen={applyPoseModalOpen} tier="modal" autoFocus ariaRole="dialog">
        <ApplyPoseModal
          isOpen={applyPoseModalOpen}
          onClose={() => setApplyPoseModalOpen(false)}
          pose={dummiePose}
          currentFrame={currentFrame}
          currentFrameIndex={currentFrameIndex}
          frames={frames}
          currentLayerIndex={currentLayerIndex}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          activePaletteColors={activePaletteColors}
          onApplyPoseResult={handleApplyDummiePoseResult}
        />
      </StudioTopLayerPortal>

      {/* Floating 2D Pose Dummie Window when overlayMode === 'floating' */}
      {dummiePose.overlayMode === 'floating' && (
        <div
          className="fixed bottom-16 right-6 z-50 w-72 max-h-[68vh] overflow-y-auto rounded-xl border shadow-2xl p-2 backdrop-blur-md"
          style={{
            backgroundColor: 'var(--studio-bg-panel)',
            borderColor: 'var(--studio-accent)',
            color: 'var(--studio-text)',
          }}
        >
          <div className="flex items-center justify-between px-1 pb-1 mb-1 border-b" style={{ borderColor: 'var(--studio-border)' }}>
            <span className="text-[11px] font-bold">Dummie 2D Flotante</span>
            <button
              type="button"
              onClick={() => setDummiePose((p) => ({ ...p, overlayMode: 'panel' }))}
              className="text-[10px] px-1.5 py-0.5 rounded border hover:opacity-80"
              style={{ borderColor: 'var(--studio-border-strong)' }}
            >
              Volver a Panel
            </button>
          </div>
          <DummiePosePanel
            pose={dummiePose}
            onChangePose={setDummiePose}
            savedPoses={savedDummiePoses}
            onSavePose={(p) =>
              setSavedDummiePoses((prev) => [{ ...p, id: `pose-saved-${Date.now()}` }, ...prev])
            }
            onDeleteSavedPose={(id) =>
              setSavedDummiePoses((prev) => prev.filter((p) => p.id !== id))
            }
            onOpenApplyModal={() => setApplyPoseModalOpen(true)}
            references={references}
            guidesConfig={guidesConfig}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            onChangeGuidesConfig={handleChangeGuidesConfig}
          />
        </div>
      )}

      {/* Complete Tools Guide, Tutorials & Locator Modal */}
      <StudioTopLayerPortal isOpen={toolGuideModalOpen} tier="modal" autoFocus ariaRole="dialog">
        <ToolGuideModal
          isOpen={toolGuideModalOpen}
          onClose={() => {
            setToolGuideModalOpen(false);
            setHelpInitialFocusId(null);
          }}
          initialFocusHelpId={helpInitialFocusId}
          focusSearchNonce={toolGuideFocusSearchNonce}
          onLocateEntry={handleLocateHelpItem}
          onActivateWhatIsThis={() => {
            setToolGuideModalOpen(false);
            setWhatIsThisActive(true);
          }}
        />
      </StudioTopLayerPortal>

      {/* Smart Universal Delete Confirmation & Conflict Modal — Critical Dialog Tier */}
      <StudioTopLayerPortal
        isOpen={Boolean(smartDeleteModalState)}
        tier="critical"
        autoFocus
        ariaRole="alertdialog"
      >
        <SmartDeleteModal
          isOpen={Boolean(smartDeleteModalState)}
          candidates={smartDeleteModalState?.candidates || []}
          onConfirm={executeSmartDeleteCandidate}
          onCancel={() => setSmartDeleteModalState(null)}
        />
      </StudioTopLayerPortal>

      {/* Live "¿Dónde está?" Inspector & Spotlight Overlay */}
      <StudioTopLayerPortal
        isOpen={whatIsThisActive || Boolean(spotlightTarget)}
        tier="critical"
        pointerEventsNone
      >
        <WhatIsThisOverlay
          active={whatIsThisActive}
          onClose={() => setWhatIsThisActive(false)}
          onOpenHelpItem={(item) => {
            setWhatIsThisActive(false);
            setHelpInitialFocusId(item.id);
            setToolGuideModalOpen(true);
          }}
          spotlightTarget={spotlightTarget}
          onClearSpotlight={() => setSpotlightTarget(null)}
        />
      </StudioTopLayerPortal>

      {/* Lospec Community Palette Importer & Explorer Modal */}
      <StudioTopLayerPortal isOpen={lospecModalOpen} tier="modal" autoFocus ariaRole="dialog">
        <LospecPaletteModal
          isOpen={lospecModalOpen}
          onClose={() => setLospecModalOpen(false)}
          onApplyPalette={handleApplyLospecPalette}
          currentColor={primaryColor}
        />
      </StudioTopLayerPortal>

      {/* Retro Fighting Game Sprite Sheet & Movement Base Planner Modal */}
      <StudioTopLayerPortal isOpen={spriteSheetModalOpen} tier="modal" autoFocus ariaRole="dialog">
        <SpriteSheetTemplateModal
          isOpen={spriteSheetModalOpen}
          onClose={() => setSpriteSheetModalOpen(false)}
          project={currentProjectState}
          onApplyTemplateToProject={(groups, newFrames) =>
            handleApplySpriteSheetTemplate({
              width: canvasWidth,
              height: canvasHeight,
              frames: newFrames,
              layerGroups: groups,
            })
          }
        />
      </StudioTopLayerPortal>

      {/* Modular Workspace Organization & Studio Style Modal */}
      <StudioTopLayerPortal isOpen={layoutModalOpen} tier="modal" autoFocus ariaRole="dialog">
        <WorkspaceLayoutModal
          isOpen={layoutModalOpen}
          initialTab={layoutModalTab}
          onClose={() => setLayoutModalOpen(false)}
          layout={workspaceLayout}
          onChangeLayout={(next) => {
            setWorkspaceLayout(next);
            if (next.sidebarPosition !== 'hidden') {
              setRightSidebarOpen(true);
            }
          }}
          savedLayouts={savedCustomLayouts}
          onSaveCustomLayout={handleSaveCustomLayout}
          onLoadCustomLayout={handleLoadCustomLayout}
          onDuplicateCustomLayout={handleDuplicateCustomLayout}
          onDeleteCustomLayout={handleDeleteCustomLayout}
          styleConfig={studioStyle}
          onChangeStyleConfig={setStudioStyle}
          onToggleUiEditMode={() => executeCommandById('cmd.toggle_ui_edit_mode', false)}
          selectionDisplayConfig={selectionDisplayConfig}
          onChangeSelectionDisplayConfig={setSelectionDisplayConfig}
        />
      </StudioTopLayerPortal>

      {/* Professional Studio Home Screen (Startup Hub, Recent Projects, Quick Templates & Startup Preferences) */}
      <StudioTopLayerPortal isOpen={homeScreenOpen} tier="overlay">
        <HomeScreen
          isOpen={homeScreenOpen}
          initialSection={homeScreenSection}
          hasActiveDocument={openDocuments.length > 0}
          activeDocumentName={`${projectName} (${canvasWidth}×${canvasHeight} px · ${documentDpi} DPI)`}
          openDocumentsCount={openDocuments.length}
          activeFightingProfile={activeFightingProfile}
          onChangeFightingProfile={setActiveFightingProfile}
          recentProjects={recentProjects}
          startupPreferences={startupPreferences}
          onUpdateStartupPreferences={handleUpdateStartupPreferences}
          onTestSplashAnimation={handleTestSplashAnimation}
          onReturnToCanvas={() => setHomeScreenOpen(false)}
          onNewProject={(category?: NewProjectTemplateCategory, profileId?: FightingGameProfileId) => {
            setNewProjectInitialCategory(category || 'Todas');
            setNewProjectInitialFightingProfileId(profileId || 'custom');
            setNewProjectModalOpen(true);
          }}
          onQuickCreatePreset={handleCreateProjectConfig}
          onOpenProjectFile={() => void handleOpenFilePicker()}
          onOpenRecentProject={(entry) => void handleOpenRecentProject(entry)}
          onTogglePinRecent={handleTogglePinRecentProject}
          onRemoveRecent={handleRemoveRecentProject}
          onClearRecents={handleClearRecentProjects}
          onOpenToolsGuide={() => setToolGuideModalOpen(true)}
          onOpenShortcutsModal={() => setShortcutsModalOpen(true)}
          onOpenInstallerGuide={() => setLocalInstallerModalOpen(true)}
          isWindowMaximized={isWindowMaximized}
          onMinimizeWindow={handleMinimizeWindow}
          onToggleMaximizeWindow={handleToggleMaximizeWindow}
          onCloseApplicationWindow={handleCloseApplicationWindow}
        />
      </StudioTopLayerPortal>

      {/* Animated Startup Splash / Loading Screen with Official PixelClash Studio Mascot */}
      <StudioTopLayerPortal isOpen={splashOpen} tier="critical">
        <SplashLoadingScreen
          isOpen={splashOpen}
          preferences={startupPreferences}
          versionLabel="v2.4"
          onInitTask={handleSplashInitTask}
          onComplete={handleSplashComplete}
        />
      </StudioTopLayerPortal>
    </div>
  );
}
