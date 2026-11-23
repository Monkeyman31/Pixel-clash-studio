import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Palette, 
  Layers, 
  Sparkles, 
  ShieldAlert, 
  EyeOff, 
  Plus, 
  Wand2, 
  ChevronDown,
  ChevronUp,
  Flame,
  Swords,
  PenTool,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  GripVertical,
  Minimize2,
  Maximize2,
  X,
  SlidersHorizontal,
  FolderHeart,
  Image as ImageIcon,
  ImagePlus,
  Check,
  History,
  Sliders,
  Pin,
  PinOff,
  ExternalLink,
  Columns,
  ArrowDownToLine,
  Film,
  Wrench,
  PanelTop,
  User,
  Paintbrush,
  Grid,
  Box,
  Compass,
  Play,
  Terminal,
  Activity,
  Diamond,
  FolderTree,
  Shield,
  Unlock,
  Rows3,
  LayoutGrid,
  Move,
  RotateCcw,
  FlipHorizontal,
} from 'lucide-react';
import { 
  ActionTag, 
  AssetCategory,
  AssetLibraryItem,
  BrushSettings,
  BucketSubTool,
  CameraKeyframe,
  CameraShakeConfig,
  CombatFxConfig,
  DitherConfig,
  DummyOpponent,
  DummiePose,
  EditableFxRecipe,
  EyedropperConfig,
  FightingGameProfileId,
  Frame,
  GradientConfig,
  GroundConfig,
  GuidesConfig,
  GuidesModalTab,
  Hitbox,
  HitboxType,
  Layer,
  LayerAdjustmentConfig,
  LayerBlendMode,
  LayerGroup,
  LayerKeyframe,
  LayerMaskType,
  LayerType,
  PalettePreset,
  PerformanceMode,
  ProjectState,
  ProjectWorkMode,
  PureRefConfig,
  ReferenceGroup,
  ReferenceItem,
  SampledColorInfo,
  ShapeToolConfig,
  StageBuilderRole,
  StageParallaxConfig,
  StageType,
  SymmetryConfig,
  TilesetCollection,
  TilesetWorkspaceConfig,
  TileToolConfig,
  ToolType,
  TransformActionId,
  TransformParameters,
  VectorPath,
  VectorToolConfig
} from '../types';
import {
  DEFAULT_RIGHT_PANELS,
  DockOrientation,
  DockTabGroupConfig,
  FloatingPanelState,
  PANEL_REGISTRY,
  PanelCollapseDisplayMode,
  PanelDockZone,
  RightPanelConfig,
  RightPanelId,
  SidebarAutoCollapseMode,
} from '../constants/workspaceThemes';
import { PhotoshopColorWheel } from './PhotoshopColorWheel';
import { BrushSettingsPanel, DEFAULT_BRUSH_SETTINGS } from './BrushSettingsPanel';
import { FIGHTING_GAME_PALETTES } from '../constants/palettes';
import { compositeFrame, createEmptyGrid, DEFAULT_SYMMETRY_CONFIG } from '../utils/pixelMath';
import { DeleteGroupModal } from './DeleteGroupModal';
import { StudioTopLayerPortal } from './StudioTopLayer';
import { FiltersAdjustmentPanel } from './FiltersAdjustmentPanel';
import { AssetLibraryPanel } from './AssetLibraryPanel';
import { ReferencesPanel } from './ReferencesPanel';
import { PhotoshopLayersPanel } from './PhotoshopLayersPanel';
import { FightingStudioPanel } from './FightingStudioPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { HistoryPanel } from './HistoryPanel';
import { DummiePosePanel } from './DummiePosePanel';
import { SymmetryPanel } from './SymmetryPanel';
import { WorkModeHubPanel } from './WorkModeHubPanel';
import { TilesetEditorPanel } from './TilesetEditorPanel';
import { DEFAULT_STAGE_PARALLAX_CONFIG, DEFAULT_TILESET_CONFIG } from '../utils/workModesEngine';
import { DEFAULT_TILE_TOOL_CONFIG } from '../utils/tilesetEngine';
import {
  AiConfigPanel,
  AnimationControlPanel,
  BrushManagerPanel,
  KeyframesPanel,
  LivePreviewPanel,
  MasksStudioPanel,
  MaterialsPanel,
  NavigatorPanel,
  PalettePanel,
  ProjectExplorerPanel,
  StudioConsolePanel,
  TexturesPanel,
  VectorEditorPanel,
} from './ModularStudioPanels';
import { DEFAULT_ADJUSTMENT_CONFIG, FilterGalleryPresetId } from '../utils/colorFilters';
import { DEFAULT_EYEDROPPER_CONFIG } from '../utils/eyedropperEngine';
import { StudioSlider } from './StudioSlider';
import { CustomBrushPreset } from '../utils/customBrushStorage';
import { AiStudioHub } from './AiStudioHub';

interface RightSidebarProps {
  // Palettes & Color
  primaryColor: string;
  primaryAlpha: number;
  secondaryColor: string;
  onSelectPrimaryColor: (color: string) => void;
  onChangePrimaryAlpha: (alpha: number) => void;
  onSelectSecondaryColor: (color: string) => void;
  onReplaceColor: (targetColor: string, newColor: string) => void;
  // Layers & Groups
  layers: Layer[];
  currentLayerIndex: number;
  onSelectLayer: (index: number) => void;
  onToggleLayerVisibility: (index: number) => void;
  onToggleLayerLock: (index: number) => void;
  activeTrackKey?: string | null;
  onSelectLayerTrack?: (trackKey: string, frameLayerIndex: number) => void;
  onToggleTrackVisibility?: (trackKey: string, frameLayerIndex: number) => void;
  onToggleTrackLock?: (trackKey: string, frameLayerIndex: number) => void;
  onUpdateTrackMeta?: (
    trackKey: string,
    frameLayerIndex: number,
    patch: Partial<Layer>
  ) => void;
  onDeleteTrack?: (trackKey: string, frameLayerIndex: number) => void;
  onAssignTrackToGroup?: (
    trackKey: string,
    frameLayerIndex: number,
    groupId: string | null
  ) => void;
  onClearTrackInCurrentFrame?: (trackKey: string) => void;
  onAddLayer: (layerType?: LayerType) => void;
  onDeleteLayer: (index: number) => void;
  onChangeLayerOpacity: (index: number, opacity: number) => void;
  onUpdateLayerMeta?: (index: number, patch: Partial<Layer>) => void;
  onReorderLayer?: (fromIndex: number, toIndex: number, targetGroupId?: string | null) => void;
  layerGroups: LayerGroup[];
  onCreateLayerGroup: (name: string, color: string, parentGroupId?: string | null) => void;
  onRenameLayerGroup?: (groupId: string, name: string) => void;
  onMoveLayerGroupParent?: (groupId: string, parentGroupId: string | null) => void;
  onDeleteLayerGroup: (groupId: string, deleteContent: boolean) => void;
  onToggleGroupCollapse: (groupId: string) => void;
  onToggleGroupVisibility: (groupId: string) => void;
  onToggleGroupLock: (groupId: string) => void;
  onChangeGroupOpacity?: (groupId: string, opacity: number) => void;
  onChangeGroupColor?: (groupId: string, color: string) => void;
  onAssignLayerToGroup: (layerIndex: number, groupId: string | null) => void;
  onMergeLayers?: (indices: number[]) => void;
  onMergeVisibleLayers?: () => void;
  onMassDuplicateLayers?: (indices: number[]) => void;
  onConvertLayersToGroup?: (indices: number[], name: string, color: string) => void;
  editingMask?: boolean;
  onSetEditingMask?: (editing: boolean) => void;
  onCreateLayerMask?: (
    index: number,
    mode: 'reveal' | 'hide' | 'selection' | 'vector',
    maskType?: LayerMaskType
  ) => void;
  onDeleteLayerMask?: (index: number) => void;
  onApplyLayerMask?: (index: number) => void;
  onInvertLayerMask?: (index: number) => void;
  onToggleMaskDisabled?: (index: number) => void;
  onToggleMaskLinked?: (index: number) => void;
  onToggleMaskQuickPreview?: (index: number) => void;
  onRasterizeLayer?: (index: number) => void;
  onConvertToSmartObject?: (index: number) => void;
  // Multi-layer selection
  selectedLayerIndices?: number[];
  onSelectLayerIndices?: (indices: number[]) => void;
  onBatchToggleLayerVisibility?: (indices: number[]) => void;
  onBatchToggleLayerLock?: (indices: number[]) => void;
  onBatchAssignLayersToGroup?: (indices: number[], groupId: string | null) => void;
  onBatchDeleteLayers?: (indices: number[]) => void;
  // Hitboxes & Fighting Studio
  hitboxes: Hitbox[];
  activeHitboxType?: HitboxType;
  onUpdateHitboxes: (hitboxes: Hitbox[]) => void;
  onSelectHitboxType: (type: HitboxType) => void;
  onSelectHitboxTool?: () => void;
  onUpdateFrameAdvantage?: (onHit: number, onBlock: number) => void;
  combatTestActive?: boolean;
  onToggleCombatTest?: () => void;
  // AI assistant & Frame remix
  currentFrame: Frame;
  canvasWidth: number;
  canvasHeight: number;
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
  onApplyPaletteSwap: (newPalette: string[]) => void;
  // Action Tags (kept optional for legacy file load compatibility)
  actionTags?: ActionTag[];
  onCreateActionTag?: (name: string, category: any, color: string) => void;
  onDeleteActionTag?: (tagId: string) => void;
  onAssignFrameToActionTag?: (tagId: string, frameIndex: number) => void;
  currentFrameIndex: number;
  frames: Frame[];
  stageType: StageType;
  onChangeStageType: (type: StageType) => void;
  stageOpacity: number;
  onChangeStageOpacity: (op: number) => void;
  groundConfig: GroundConfig;
  onChangeGroundConfig: (cfg: GroundConfig) => void;
  dummyOpponent: DummyOpponent;
  onChangeDummyOpponent: (dummy: DummyOpponent) => void;
  combatFx: CombatFxConfig;
  onChangeCombatFx: (fx: CombatFxConfig) => void;
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
  activePaletteColors?: string[];
  onUpdateActivePalette?: (colors: string[]) => void;
  onOpenLospecModal?: () => void;
  // Global visibility & modular layout props
  isOpen: boolean;
  panels?: RightPanelConfig[];
  onTogglePanelExpanded?: (id: RightPanelId) => void;
  onTogglePanelVisible?: (id: RightPanelId) => void;
  onDropPanelToDock?: (panelId: RightPanelId, targetZone: PanelDockZone, targetIndex?: number) => void;
  onTogglePanelMini?: (id: RightPanelId) => void;
  dockPosition?: 'left' | 'right';
  sidebarWidth?: 'compact' | 'normal' | 'wide';
  brushSettings?: BrushSettings;
  onChangeBrushSettings?: (next: BrushSettings) => void;
  customBrushes?: CustomBrushPreset[];
  onDeleteCustomBrush?: (id: string) => void;
  // Dock Workspace wrapper slots (Photoshop 4-zone dock around central canvas)
  centerCanvas?: React.ReactNode;
  leftToolbar?: React.ReactNode;
  rightToolbar?: React.ReactNode;
  // Clipboard (kept for menu/shortcuts compatibility)
  hasClipboard?: boolean;
  clipboardLabel?: string;
  hasActiveSelection?: boolean;
  onCopyLayerOrSelection?: () => void;
  onCutLayerOrSelection?: () => void;
  onPasteClipboard?: (inPlace: boolean, asNewLayer?: boolean) => void;
  // Filters & Non-Destructive Adjustment Layers
  onApplyDirectAdjustment?: (cfg: LayerAdjustmentConfig, intensity01?: number) => void;
  onCreateAdjustmentLayer?: (cfg: LayerAdjustmentConfig, name?: string) => void;
  onUpdateAdjustmentLayer?: (cfg: LayerAdjustmentConfig) => void;
  onBakeAdjustmentLayer?: () => void;
  onApplyQuickFilter?: (filterId: FilterGalleryPresetId, intensity01?: number) => void;
  onLiveCanvasPreview?: (
    preview: { layerId?: string; grid: (string | null)[][]; beforeAfterSplit?: number | null } | null
  ) => void;
  onGenerateDummieFromReference?: (ref: ReferenceItem) => void;
  // Asset Library & Image-to-PixelArt / Stage & HUD AI
  libraryItems?: AssetLibraryItem[];
  assetFolders?: string[];
  onCreateAssetFolder?: (folderName: string) => void;
  onInsertLibraryItem?: (item: AssetLibraryItem, mode: 'stamp' | 'new_layer', dropX?: number, dropY?: number) => void;
  onSaveCurrentLayerToLibrary?: (name: string, category: AssetCategory, folder?: string, tags?: string[]) => void;
  onSaveSelectionToLibrary?: (name: string, category: AssetCategory, folder?: string, tags?: string[]) => void;
  onAddAiLibraryItem?: (item: AssetLibraryItem) => void;
  onAddUploadedLibraryItem?: (item: AssetLibraryItem) => void;
  onUpdateLibraryItem?: (id: string, patch: Partial<AssetLibraryItem>) => void;
  onDeleteLibraryItem?: (id: string) => void;
  onSaveGridToLibrary?: (
    name: string,
    grid: (string | null)[][],
    width: number,
    height: number,
    category?: AssetCategory,
    origin?: 'ai' | 'user'
  ) => void;
  onInsertGeneratedGrid?: (
    grid: (string | null)[][],
    mode: 'current_layer' | 'new_layer',
    name: string,
    groupName?: string,
    groupColor?: string,
    insertAtBottom?: boolean
  ) => void;
  // References System
  references?: ReferenceItem[];
  referenceGroups?: ReferenceGroup[];
  activeReferenceId?: string | null;
  onSelectReference?: (id: string | null) => void;
  onAddReferencesFromFiles?: (files: FileList | File[], groupId?: string | null) => void;
  onUpdateReference?: (id: string, patch: Partial<ReferenceItem>) => void;
  onDeleteReference?: (id: string) => void;
  onCreateReferenceGroup?: (name: string, color: string) => void;
  onUpdateReferenceGroup?: (id: string, patch: Partial<ReferenceGroup>) => void;
  onDeleteReferenceGroup?: (id: string) => void;
  onReorderReferenceGroup?: (dragGroupId: string, targetGroupId: string) => void;
  pureRefConfig?: PureRefConfig;
  onChangePureRefConfig?: (next: PureRefConfig) => void;
  onCenterAllReferences?: () => void;
  onBringReferenceToFront?: (id: string) => void;
  onActivateMoveReferenceTool?: () => void;
  // Contextual AI Project Info
  project?: ProjectState;
  // System 1: Resizable Splitters, Tabbed Groups, Floating Windows & Workspace Options
  leftMainWidth?: number;
  rightMainWidth?: number;
  leftMiniWidth?: number;
  rightMiniWidth?: number;
  leftMiniMode?: 'compact' | 'expanded';
  rightMiniMode?: 'compact' | 'expanded';
  miniFlyoutWidth?: number;
  onResizeLeftMain?: (width: number) => void;
  onResizeRightMain?: (width: number) => void;
  onResizeLeftMini?: (width: number) => void;
  onResizeRightMini?: (width: number) => void;
  onToggleMiniMode?: (zone: 'left-mini' | 'right-mini') => void;
  onResizeMiniFlyout?: (width: number) => void;
  onResetDockWidths?: () => void;
  compactMode?: boolean;
  autoCollapseSidebars?: SidebarAutoCollapseMode;
  tabGroups?: DockTabGroupConfig[];
  onChangeTabGroups?: (groups: DockTabGroupConfig[]) => void;
  floatingPanels?: Record<string, FloatingPanelState>;
  onChangeFloatingPanels?: (next: Record<string, FloatingPanelState>) => void;
  collapsedSections?: Record<string, boolean>;
  onToggleCollapsedSection?: (key: string) => void;
  // System 6: Multi-frame layer duplication
  onDuplicateLayerToNextFrame?: (index: number) => void;
  onDuplicateLayerToSelectedFrames?: (index: number) => void;
  onDuplicateLayerToAllFrames?: (index: number) => void;
  onDuplicateGroupToAllFrames?: (groupId: string) => void;
  // System 2 & 4: PropertiesPanel (Transform / Vectors / Eyedropper / Layer Appearance)
  activeTool?: ToolType;
  transformParams?: TransformParameters | null;
  onChangeTransformParams?: (next: TransformParameters) => void;
  onCommitTransform?: () => void;
  onCancelTransform?: () => void;
  onTriggerTransformAction?: (action: TransformActionId) => void;
  vectorConfig?: VectorToolConfig;
  onChangeVectorConfig?: (next: VectorToolConfig) => void;
  selectedVectorPathId?: string | null;
  selectedVectorNodeIds?: string[];
  onVectorSelectionAction?: (
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
  ) => void;
  eyedropperConfig?: EyedropperConfig;
  onChangeEyedropperConfig?: (cfg: EyedropperConfig) => void;
  lastSampledColor?: SampledColorInfo | null;
  colorHistory?: string[];
  // HistoryPanel
  historyLength?: number;
  historyIndex?: number;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onJumpToHistory?: (idx: number) => void;
  // System 5: Dummie 2D Pose props inside ReferencesPanel & Dummie Panel
  dummiePose?: DummiePose;
  onChangeDummiePose?: (pose: DummiePose) => void;
  savedDummiePoses?: DummiePose[];
  onSaveDummiePose?: (pose: DummiePose) => void;
  onDeleteSavedDummiePose?: (id: string) => void;
  onOpenApplyPoseModal?: () => void;
  // Advanced Drag & Drop Edit Mode, Total Freedom, 6-Zone Docking & Modular Panels
  uiEditMode?: boolean;
  onToggleUiEditMode?: () => void;
  totalFreedomMode?: boolean;
  onToggleTotalFreedomMode?: () => void;
  collapseDisplayMode?: PanelCollapseDisplayMode;
  dockOrientations?: Partial<Record<PanelDockZone, DockOrientation>>;
  onChangeDockOrientation?: (zone: PanelDockZone, orientation: DockOrientation) => void;
  topDockHeight?: number;
  bottomDockHeight?: number;
  onResizeTopDock?: (height: number) => void;
  onResizeBottomDock?: (height: number) => void;
  panelHeights?: Record<string, number>;
  panelWidths?: Record<string, number>;
  onChangePanelDimensions?: (panelId: RightPanelId, dims: { width?: number | null; height?: number | null }) => void;
  compactPanels?: Record<string, boolean>;
  onTogglePanelCompact?: (panelId: RightPanelId) => void;
  onMergePanelsToTabGroup?: (draggedId: RightPanelId, targetId: RightPanelId, zone: PanelDockZone) => void;
  renderTimelineSlot?: (dockZone: PanelDockZone | 'floating') => React.ReactNode;
  renderTotalFreedomToolbarSlot?: (orientation: 'vertical' | 'horizontal', embedded: boolean) => React.ReactNode;
  totalFreedomTopBarSlot?: React.ReactNode;
  // Extra callbacks for ModularStudioPanels
  onSelectTool?: (tool: ToolType) => void;
  ditherPattern?: 'checkered' | 'sparse' | 'dense' | 'horizontal';
  onChangeDitherPattern?: (pattern: 'checkered' | 'sparse' | 'dense' | 'horizontal') => void;
  ditherConfig?: DitherConfig;
  onChangeDitherConfig?: (next: DitherConfig) => void;
  shapeConfig?: ShapeToolConfig;
  onChangeShapeConfig?: (next: ShapeToolConfig) => void;
  bucketSubTool?: BucketSubTool;
  onChangeBucketSubTool?: (sub: BucketSubTool) => void;
  gradientConfig?: GradientConfig;
  onChangeGradientConfig?: (next: GradientConfig) => void;
  fps?: number;
  onChangeFps?: (fps: number) => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onSelectFrame?: (index: number) => void;
  playbackMode?: 'loop' | 'pingpong' | 'once';
  onChangePlaybackMode?: (m: 'loop' | 'pingpong' | 'once') => void;
  onionSkinEnabled?: boolean;
  onToggleOnionSkin?: () => void;
  onionSkinPrev?: number;
  onChangeOnionSkinPrev?: (n: number) => void;
  onionSkinNext?: number;
  onChangeOnionSkinNext?: (n: number) => void;
  onionSkinOpacity?: number;
  onChangeOnionSkinOpacity?: (op: number) => void;
  showGrid?: boolean;
  onToggleGrid?: () => void;
  showHitboxes?: boolean;
  onToggleHitboxes?: () => void;
  onSetLayerKeyframe?: (layerIndex: number, frameIndex: number, kf: LayerKeyframe) => void;
  onRemoveLayerKeyframe?: (layerIndex: number, frameIndex: number) => void;
  onSaveProjectPcs?: () => void;
  studioLogs?: string[];
  onRunConsoleCommand?: (cmd: string) => void;
  autoApplyAllFrames?: boolean;
  onToggleAutoApplyAllFrames?: () => void;
  onFloatMiniPreviewToCanvas?: () => void;
  symmetryConfig?: SymmetryConfig;
  onChangeSymmetryConfig?: (next: SymmetryConfig) => void;
  // Camera Shake & Camera Keyframes
  cameraShake?: CameraShakeConfig;
  onChangeCameraShake?: (next: CameraShakeConfig) => void;
  onTriggerCameraShakeTest?: () => void;
  cameraKeyframes?: CameraKeyframe[];
  onSetCameraKeyframe?: (kf: CameraKeyframe) => void;
  onRemoveCameraKeyframe?: (frameIndex: number) => void;
  // Smart Universal Delete context tracking
  onUiContextFocus?: (
    ctx: 'canvas' | 'layers' | 'timeline' | 'references' | 'library' | 'poses' | 'keyframes' | 'guides'
  ) => void;
  // Project Work Modes & FX Studio
  workMode?: ProjectWorkMode;
  onChangeWorkMode?: (mode: ProjectWorkMode) => void;
  stageParallaxConfig?: StageParallaxConfig;
  onChangeStageParallaxConfig?: (next: StageParallaxConfig) => void;
  onUpdateLayerParallaxSpeed?: (layerIndex: number, speed: number) => void;
  tilesetConfig?: TilesetWorkspaceConfig;
  onChangeTilesetConfig?: (next: TilesetWorkspaceConfig) => void;
  onCreateSuggestedModeLayers?: (mode: ProjectWorkMode) => void;
  onApplyModeGuides?: (mode: ProjectWorkMode) => void;
  onInsertModeTemplate?: (templateId: string) => void;
  onTriggerModeAi?: (kind: 'stage' | 'hud' | 'fx', promptHint: string, categoryLabel: string) => void;
  onOpenFxStudio?: (tab?: 'generator' | 'lab' | 'library', recipe?: EditableFxRecipe | null) => void;
  lastGeneratedFxRecipe?: EditableFxRecipe | null;
  onOpenModeExportModal?: () => void;
  // Perspective & Guides sync for Stage Mode and Dummie
  guidesConfig?: GuidesConfig;
  onChangeGuidesConfig?: (next: GuidesConfig) => void;
  onOpenGuidesModal?: (tab?: GuidesModalTab) => void;
  performanceMode?: PerformanceMode;
  // Tilesets Panel, Stage Builder Roles & Fighting Profile
  tilesets?: TilesetCollection[];
  onChangeTilesets?: (next: TilesetCollection[]) => void;
  tileToolConfig?: TileToolConfig;
  onChangeTileToolConfig?: (next: TileToolConfig) => void;
  onCaptureTileFromCanvas?: (tileSize: number) => (string | null)[][] | null;
  activeFightingProfile?: FightingGameProfileId;
  onApplyFightingProfile?: (id: FightingGameProfileId) => void;
  onAddStageRoleLayer?: (role: StageBuilderRole) => void;
  onFocusTilesetsPanel?: () => void;
  onStudioNotify?: (msg: string) => void;
}

const PANEL_ICONS: Record<RightPanelId, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
  stage: Swords,
  workmode: Compass,
  brushes: PenTool,
  colorwheel: Palette,
  symmetry: FlipHorizontal,
  layers: Layers,
  references: ImagePlus,
  filters: SlidersHorizontal,
  library: FolderHeart,
  ai: Sparkles,
  combat: ShieldAlert,
  properties: Sliders,
  history: History,
  timeline: Film,
  toolbar: Wrench,
  topbar: PanelTop,
  dummie: User,
  palette: Palette,
  brush_manager: Paintbrush,
  textures: Grid,
  materials: Box,
  ai_config: SlidersHorizontal,
  preview: Play,
  navigator: Compass,
  console: Terminal,
  animation: Activity,
  keyframes: Diamond,
  vector_editor: PenTool,
  masks: Shield,
  project_explorer: FolderTree,
  tilesets: LayoutGrid,
};

const PANEL_SHORT_LABELS: Record<RightPanelId, string> = Object.fromEntries(
  PANEL_REGISTRY.map((p) => [p.id, p.shortLabel])
) as Record<RightPanelId, string>;

interface PanelDragState {
  panelId: RightPanelId;
  title: string;
  startX: number;
  startY: number;
  pointerX: number;
  pointerY: number;
  isDragging: boolean;
  targetZone: PanelDockZone | 'float-canvas' | null;
  targetIndex: number;
  mergeTargetId: RightPanelId | null;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  primaryColor,
  primaryAlpha,
  secondaryColor,
  onSelectPrimaryColor,
  onChangePrimaryAlpha,
  onSelectSecondaryColor,
  onReplaceColor,
  layers,
  currentLayerIndex,
  onSelectLayer,
  onToggleLayerVisibility,
  onToggleLayerLock,
  activeTrackKey = null,
  onSelectLayerTrack,
  onToggleTrackVisibility,
  onToggleTrackLock,
  onUpdateTrackMeta,
  onDeleteTrack,
  onAssignTrackToGroup,
  onClearTrackInCurrentFrame,
  onAddLayer,
  onDeleteLayer,
  onChangeLayerOpacity,
  onUpdateLayerMeta,
  onReorderLayer,
  layerGroups,
  onCreateLayerGroup,
  onRenameLayerGroup,
  onMoveLayerGroupParent,
  onDeleteLayerGroup,
  onToggleGroupCollapse,
  onToggleGroupVisibility,
  onToggleGroupLock,
  onChangeGroupOpacity,
  onChangeGroupColor,
  onAssignLayerToGroup,
  onMergeLayers,
  onMergeVisibleLayers,
  onMassDuplicateLayers,
  onConvertLayersToGroup,
  editingMask = false,
  onSetEditingMask,
  onCreateLayerMask,
  onDeleteLayerMask,
  onApplyLayerMask,
  onInvertLayerMask,
  onToggleMaskDisabled,
  onToggleMaskLinked,
  onToggleMaskQuickPreview,
  onRasterizeLayer,
  onConvertToSmartObject,
  selectedLayerIndices,
  onSelectLayerIndices,
  onBatchToggleLayerVisibility,
  onBatchToggleLayerLock,
  onBatchAssignLayersToGroup,
  onBatchDeleteLayers,
  hitboxes,
  activeHitboxType = 'hitbox',
  onUpdateHitboxes,
  onSelectHitboxType,
  onSelectHitboxTool,
  onUpdateFrameAdvantage,
  combatTestActive = false,
  onToggleCombatTest,
  currentFrame,
  canvasWidth,
  canvasHeight,
  onInjectAiVfx,
  onApplyFrameRemix,
  actionTags = [],
  currentFrameIndex,
  frames,
  stageType,
  onChangeStageType,
  stageOpacity,
  onChangeStageOpacity,
  groundConfig,
  onChangeGroundConfig,
  dummyOpponent,
  onChangeDummyOpponent,
  combatFx,
  onChangeCombatFx,
  onGenerateInBetween,
  onInsertInBetweenSequence,
  onInsertAnimationFrames,
  activePaletteColors,
  onUpdateActivePalette,
  onOpenLospecModal,
  isOpen,
  panels,
  onTogglePanelExpanded,
  onTogglePanelVisible,
  onDropPanelToDock,
  onTogglePanelMini,
  dockPosition = 'right',
  sidebarWidth = 'normal',
  brushSettings = DEFAULT_BRUSH_SETTINGS,
  onChangeBrushSettings,
  customBrushes = [],
  onDeleteCustomBrush,
  centerCanvas,
  leftToolbar,
  rightToolbar,
  hasActiveSelection = false,
  onApplyDirectAdjustment,
  onCreateAdjustmentLayer,
  onUpdateAdjustmentLayer,
  onBakeAdjustmentLayer,
  onApplyQuickFilter,
  onLiveCanvasPreview,
  onGenerateDummieFromReference,
  libraryItems = [],
  assetFolders = ['General', 'Mis Uploads', 'Generados IA', 'Sonidos'],
  onCreateAssetFolder,
  onInsertLibraryItem,
  onSaveCurrentLayerToLibrary,
  onSaveSelectionToLibrary,
  onAddAiLibraryItem,
  onAddUploadedLibraryItem,
  onUpdateLibraryItem,
  onDeleteLibraryItem,
  onSaveGridToLibrary,
  onInsertGeneratedGrid,
  references = [],
  referenceGroups = [],
  activeReferenceId = null,
  onSelectReference,
  onAddReferencesFromFiles,
  onUpdateReference,
  onDeleteReference,
  onCreateReferenceGroup,
  onUpdateReferenceGroup,
  onDeleteReferenceGroup,
  onReorderReferenceGroup,
  pureRefConfig,
  onChangePureRefConfig,
  onCenterAllReferences,
  onBringReferenceToFront,
  onActivateMoveReferenceTool,
  project,
  leftMainWidth = 296,
  rightMainWidth = 332,
  leftMiniWidth = 56,
  rightMiniWidth = 56,
  leftMiniMode = 'compact',
  rightMiniMode = 'compact',
  miniFlyoutWidth = 320,
  onResizeLeftMain,
  onResizeRightMain,
  onResizeLeftMini,
  onResizeRightMini,
  onToggleMiniMode,
  onResizeMiniFlyout,
  onResetDockWidths,
  compactMode = false,
  autoCollapseSidebars = 'pinned',
  tabGroups = [],
  onChangeTabGroups,
  floatingPanels = {},
  onChangeFloatingPanels,
  collapsedSections = {},
  onToggleCollapsedSection,
  onDuplicateLayerToNextFrame,
  onDuplicateLayerToSelectedFrames,
  onDuplicateLayerToAllFrames,
  onDuplicateGroupToAllFrames,
  activeTool = 'pencil',
  transformParams = null,
  onChangeTransformParams,
  onCommitTransform,
  onCancelTransform,
  onTriggerTransformAction,
  vectorConfig,
  onChangeVectorConfig,
  selectedVectorPathId = null,
  selectedVectorNodeIds = [],
  onVectorSelectionAction,
  eyedropperConfig,
  onChangeEyedropperConfig,
  lastSampledColor = null,
  colorHistory = [],
  historyLength = 1,
  historyIndex = 0,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onJumpToHistory,
  dummiePose,
  onChangeDummiePose,
  savedDummiePoses = [],
  onSaveDummiePose,
  onDeleteSavedDummiePose,
  onOpenApplyPoseModal,
  uiEditMode = false,
  onToggleUiEditMode,
  totalFreedomMode = false,
  onToggleTotalFreedomMode,
  collapseDisplayMode = 'both',
  dockOrientations = {},
  onChangeDockOrientation,
  topDockHeight = 168,
  bottomDockHeight = 204,
  onResizeTopDock,
  onResizeBottomDock,
  panelHeights = {},
  panelWidths = {},
  onChangePanelDimensions,
  compactPanels = {},
  onTogglePanelCompact,
  onMergePanelsToTabGroup,
  renderTimelineSlot,
  renderTotalFreedomToolbarSlot,
  totalFreedomTopBarSlot,
  onSelectTool,
  ditherPattern = 'checkered',
  onChangeDitherPattern,
  ditherConfig,
  onChangeDitherConfig,
  shapeConfig,
  onChangeShapeConfig,
  bucketSubTool,
  onChangeBucketSubTool,
  gradientConfig,
  onChangeGradientConfig,
  fps = 12,
  onChangeFps,
  isPlaying = false,
  onTogglePlay,
  onSelectFrame,
  playbackMode = 'loop',
  onChangePlaybackMode,
  onionSkinEnabled = false,
  onToggleOnionSkin,
  onionSkinPrev = 1,
  onChangeOnionSkinPrev,
  onionSkinNext = 0,
  onChangeOnionSkinNext,
  onionSkinOpacity = 0.35,
  onChangeOnionSkinOpacity,
  showGrid = true,
  onToggleGrid,
  showHitboxes = true,
  onToggleHitboxes,
  onSetLayerKeyframe,
  onRemoveLayerKeyframe,
  onSaveProjectPcs,
  studioLogs = [],
  onRunConsoleCommand,
  autoApplyAllFrames = false,
  onToggleAutoApplyAllFrames,
  onFloatMiniPreviewToCanvas,
  symmetryConfig,
  onChangeSymmetryConfig,
  cameraShake,
  onChangeCameraShake,
  onTriggerCameraShakeTest,
  cameraKeyframes = [],
  onSetCameraKeyframe,
  onRemoveCameraKeyframe,
  onUiContextFocus,
  workMode = 'fighter',
  onChangeWorkMode,
  stageParallaxConfig = DEFAULT_STAGE_PARALLAX_CONFIG,
  onChangeStageParallaxConfig,
  onUpdateLayerParallaxSpeed,
  tilesetConfig = DEFAULT_TILESET_CONFIG,
  onChangeTilesetConfig,
  onCreateSuggestedModeLayers,
  onApplyModeGuides,
  onInsertModeTemplate,
  onTriggerModeAi,
  onOpenFxStudio,
  lastGeneratedFxRecipe = null,
  onOpenModeExportModal,
  guidesConfig,
  onChangeGuidesConfig,
  onOpenGuidesModal,
  performanceMode = 'balanced',
  tilesets = [],
  onChangeTilesets,
  tileToolConfig = DEFAULT_TILE_TOOL_CONFIG,
  onChangeTileToolConfig,
  onCaptureTileFromCanvas,
  activeFightingProfile = 'custom',
  onApplyFightingProfile,
  onAddStageRoleLayer,
  onFocusTilesetsPanel,
  onStudioNotify,
}) => {
  const workModeCompositeGrid = useMemo(
    () =>
      workMode === 'tileset'
        ? compositeFrame(currentFrame, canvasWidth, canvasHeight)
        : createEmptyGrid(canvasWidth, canvasHeight),
    [workMode, currentFrame, canvasWidth, canvasHeight]
  );

  // Stacked, reorderable, collapsible panels configuration (fallback if uncontrolled)
  const [localPanelOrder, setLocalPanelOrder] = useState<RightPanelConfig[]>(DEFAULT_RIGHT_PANELS);
  const panelOrder = panels && panels.length > 0 ? panels : localPanelOrder;
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [openMiniFlyoutId, setOpenMiniFlyoutId] = useState<RightPanelId | null>(null);
  const [dragState, setDragState] = useState<PanelDragState | null>(null);
  const dragStateRef = useRef<PanelDragState | null>(null);
  dragStateRef.current = dragState;
  const suppressNextClickRef = useRef<boolean>(false);

  // Horizontal & Vertical Dock splitter drag state + 2D Panel Resize state + Floating Window drag/resize state
  const [resizingDock, setResizingDock] = useState<
    | 'left-main'
    | 'right-main'
    | 'left-mini'
    | 'right-mini'
    | 'mini-flyout-left'
    | 'mini-flyout-right'
    | 'top'
    | 'bottom'
    | null
  >(null);
  const [dockResizeHud, setDockResizeHud] = useState<{
    label: string;
    pointerX: number;
    pointerY: number;
  } | null>(null);
  const dockResizeStartRef = useRef<{ x: number; y: number; size: number } | null>(null);
  type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';
  const [panelResizeState, setPanelResizeState] = useState<{
    panelId: RightPanelId;
    zone: PanelDockZone;
    edge: ResizeEdge;
    isSoleInHorizontalDock: boolean;
    startX: number;
    startY: number;
    origW: number;
    origH: number;
    origDockSize: number;
    curW: number;
    curH: number;
    pointerX: number;
    pointerY: number;
  } | null>(null);
  const panelResizeRef = useRef(panelResizeState);
  panelResizeRef.current = panelResizeState;

  const [maximizedDockedPanels, setMaximizedDockedPanels] = useState<
    Record<string, { prevDockHeight?: number; prevPanelHeight?: number | null }>
  >({});

  const [hoverRevealedZone, setHoverRevealedZone] = useState<'left-main' | 'right-main' | null>(null);
  const [topFloatingId, setTopFloatingId] = useState<string | null>(null);
  const floatingActionRef = useRef<
    | { kind: 'move'; id: string; startX: number; startY: number; origX: number; origY: number }
    | {
        kind: 'resize';
        id: string;
        edge: ResizeEdge;
        startX: number;
        startY: number;
        origX: number;
        origY: number;
        origW: number;
        origH: number;
      }
    | null
  >(null);

  const [workspaceHeight, setWorkspaceHeight] = useState<number>(() =>
    typeof window !== 'undefined' ? Math.max(420, window.innerHeight - 132) : 640
  );

  useEffect(() => {
    const el = workspaceRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const syncSize = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      if (h > 0) {
        setWorkspaceHeight((prev) => (Math.abs(prev - h) > 1 ? h : prev));
      }
    };
    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const getMaxHorizontalDockHeight = useCallback(
    (zone: 'top' | 'bottom') => {
      const liveWsH =
        workspaceRef.current?.getBoundingClientRect().height ||
        workspaceHeight ||
        Math.max(360, window.innerHeight - 132);
      const oppositeZone: 'top' | 'bottom' = zone === 'top' ? 'bottom' : 'top';
      const oppositePanels = panelOrder.filter(
        (p) => p.visible && !floatingPanels[p.id]?.isFloating && p.dock === oppositeZone
      );
      const oppositeExpanded = oppositePanels.some((p) => p.expanded);
      const oppositeReserved =
        oppositePanels.length === 0
          ? 0
          : oppositeExpanded
          ? zone === 'top'
            ? bottomDockHeight
            : topDockHeight
          : 44;
      // Guarantee at least 120px visible central canvas and never push the bottom bar off-screen
      return Math.max(136, Math.floor(liveWsH - oppositeReserved - 120));
    },
    [workspaceHeight, panelOrder, floatingPanels, topDockHeight, bottomDockHeight]
  );

  useEffect(() => {
    if (!resizingDock) return;
    const onMove = (e: PointerEvent) => {
      if (!dockResizeStartRef.current) return;
      const dx = e.clientX - dockResizeStartRef.current.x;
      const dy = e.clientY - dockResizeStartRef.current.y;
      if (resizingDock === 'left-main') {
        const nextW = Math.max(200, Math.min(720, Math.round(dockResizeStartRef.current.size + dx)));
        onResizeLeftMain?.(nextW);
      } else if (resizingDock === 'right-main') {
        const nextW = Math.max(200, Math.min(720, Math.round(dockResizeStartRef.current.size - dx)));
        onResizeRightMain?.(nextW);
      } else if (resizingDock === 'left-mini') {
        const nextW = Math.max(44, Math.min(320, Math.round(dockResizeStartRef.current.size + dx)));
        onResizeLeftMini?.(nextW);
        setDockResizeHud({
          label: `${nextW} px · ${nextW >= 96 ? 'Expandido' : 'Compacto'}`,
          pointerX: e.clientX,
          pointerY: e.clientY,
        });
      } else if (resizingDock === 'right-mini') {
        const nextW = Math.max(44, Math.min(320, Math.round(dockResizeStartRef.current.size - dx)));
        onResizeRightMini?.(nextW);
        setDockResizeHud({
          label: `${nextW} px · ${nextW >= 96 ? 'Expandido' : 'Compacto'}`,
          pointerX: e.clientX,
          pointerY: e.clientY,
        });
      } else if (resizingDock === 'mini-flyout-left') {
        const nextW = Math.max(220, Math.min(640, Math.round(dockResizeStartRef.current.size + dx)));
        onResizeMiniFlyout?.(nextW);
        setDockResizeHud({
          label: `Minipanel ${nextW} px`,
          pointerX: e.clientX,
          pointerY: e.clientY,
        });
      } else if (resizingDock === 'mini-flyout-right') {
        const nextW = Math.max(220, Math.min(640, Math.round(dockResizeStartRef.current.size - dx)));
        onResizeMiniFlyout?.(nextW);
        setDockResizeHud({
          label: `Minipanel ${nextW} px`,
          pointerX: e.clientX,
          pointerY: e.clientY,
        });
      } else if (resizingDock === 'top') {
        const maxTopH = getMaxHorizontalDockHeight('top');
        const nextH = Math.max(128, Math.min(maxTopH, Math.round(dockResizeStartRef.current.size + dy)));
        onResizeTopDock?.(nextH);
        setDockResizeHud({
          label: `Alto ${nextH} px`,
          pointerX: e.clientX,
          pointerY: e.clientY,
        });
      } else if (resizingDock === 'bottom') {
        const maxBottomH = getMaxHorizontalDockHeight('bottom');
        const nextH = Math.max(128, Math.min(maxBottomH, Math.round(dockResizeStartRef.current.size - dy)));
        onResizeBottomDock?.(nextH);
        setDockResizeHud({
          label: `Alto ${nextH} px`,
          pointerX: e.clientX,
          pointerY: e.clientY,
        });
      }
    };
    const onUp = () => {
      setResizingDock(null);
      setDockResizeHud(null);
      dockResizeStartRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [
    resizingDock,
    getMaxHorizontalDockHeight,
    onResizeLeftMain,
    onResizeRightMain,
    onResizeLeftMini,
    onResizeRightMini,
    onResizeMiniFlyout,
    onResizeTopDock,
    onResizeBottomDock,
  ]);

  // 4-Edge & 4-Corner Resize per Individual Docked Panel Card (available for ALL panels without uiEditMode)
  useEffect(() => {
    if (!panelResizeState) return;
    const onMove = (e: PointerEvent) => {
      const cur = panelResizeRef.current;
      if (!cur) return;
      const dx = e.clientX - cur.startX;
      const dy = e.clientY - cur.startY;
      const maxH =
        cur.zone === 'bottom'
          ? getMaxHorizontalDockHeight('bottom')
          : cur.zone === 'top'
          ? getMaxHorizontalDockHeight('top')
          : Math.max(240, Math.round(workspaceHeight - 40));
      const maxW = Math.max(480, Math.round(window.innerWidth - 40));

      const hasN = cur.edge.includes('n');
      const hasS = cur.edge.includes('s');
      const hasE = cur.edge.includes('e');
      const hasW = cur.edge.includes('w');

      let nextW = cur.origW;
      let nextH = cur.origH;
      const dimPatch: { width?: number | null; height?: number | null } = {};

      // Horizontal axis (Left / Right edges)
      if (hasE) {
        if (cur.zone === 'left-main' && onResizeLeftMain) {
          nextW = Math.max(200, Math.min(720, Math.round(cur.origDockSize + dx)));
          onResizeLeftMain(nextW);
        } else {
          nextW = Math.max(180, Math.min(maxW, Math.round(cur.origW + dx)));
          dimPatch.width = nextW;
        }
      } else if (hasW) {
        if (cur.zone === 'right-main' && onResizeRightMain) {
          nextW = Math.max(200, Math.min(720, Math.round(cur.origDockSize - dx)));
          onResizeRightMain(nextW);
        } else {
          nextW = Math.max(180, Math.min(maxW, Math.round(cur.origW - dx)));
          dimPatch.width = nextW;
        }
      }

      // Vertical axis (Top / Bottom edges)
      if (hasN) {
        if (cur.zone === 'bottom' && onResizeBottomDock) {
          nextH = Math.max(128, Math.min(maxH, Math.round(cur.origDockSize - dy)));
          onResizeBottomDock(nextH);
          if (cur.isSoleInHorizontalDock) {
            dimPatch.height = null;
          }
        } else {
          nextH = Math.max(110, Math.min(maxH, Math.round(cur.origH - dy)));
          dimPatch.height = nextH;
        }
      } else if (hasS) {
        if (cur.zone === 'top' && onResizeTopDock) {
          nextH = Math.max(128, Math.min(maxH, Math.round(cur.origDockSize + dy)));
          onResizeTopDock(nextH);
          if (cur.isSoleInHorizontalDock) {
            dimPatch.height = null;
          }
        } else if (cur.zone === 'bottom' && cur.isSoleInHorizontalDock && onResizeBottomDock) {
          nextH = Math.max(128, Math.min(maxH, Math.round(cur.origDockSize + dy)));
          onResizeBottomDock(nextH);
          dimPatch.height = null;
        } else {
          nextH = Math.max(110, Math.min(maxH, Math.round(cur.origH + dy)));
          dimPatch.height = nextH;
        }
      }

      setPanelResizeState((prev) =>
        prev
          ? {
              ...prev,
              curW: nextW,
              curH: nextH,
              pointerX: e.clientX,
              pointerY: e.clientY,
            }
          : null
      );

      if (dimPatch.width !== undefined || dimPatch.height !== undefined) {
        onChangePanelDimensions?.(cur.panelId, dimPatch);
      }
    };
    const onUp = () => setPanelResizeState(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [
    Boolean(panelResizeState),
    workspaceHeight,
    getMaxHorizontalDockHeight,
    onChangePanelDimensions,
    onResizeLeftMain,
    onResizeRightMain,
    onResizeTopDock,
    onResizeBottomDock,
  ]);

  // Floating Window Move + Full 4-Edge & 4-Corner Resize
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const act = floatingActionRef.current;
      if (!act || !onChangeFloatingPanels) return;
      const cur = floatingPanels[act.id];
      if (!cur) return;
      const dx = e.clientX - act.startX;
      const dy = e.clientY - act.startY;
      if (act.kind === 'move') {
        onChangeFloatingPanels({
          ...floatingPanels,
          [act.id]: {
            ...cur,
            x: Math.max(8, Math.min(window.innerWidth - 180, act.origX + dx)),
            y: Math.max(36, Math.min(window.innerHeight - 64, act.origY + dy)),
          },
        });
      } else {
        const minW = act.id === 'timeline' ? 280 : 220;
        const minH = act.id === 'timeline' ? 120 : 140;
        const maxW = Math.max(minW, window.innerWidth - 16);
        const maxH = Math.max(minH, window.innerHeight - 44);
        let nextX = act.origX;
        let nextY = act.origY;
        let nextW = act.origW;
        let nextH = act.origH;

        if (act.edge.includes('e')) {
          nextW = Math.max(minW, Math.min(maxW - act.origX, Math.round(act.origW + dx)));
        }
        if (act.edge.includes('s')) {
          nextH = Math.max(minH, Math.min(window.innerHeight - act.origY - 8, Math.round(act.origH + dy)));
        }
        if (act.edge.includes('w')) {
          const proposedW = Math.max(minW, Math.min(act.origX + act.origW - 8, Math.round(act.origW - dx)));
          nextX = Math.max(8, act.origX + (act.origW - proposedW));
          nextW = proposedW;
        }
        if (act.edge.includes('n')) {
          const proposedH = Math.max(minH, Math.min(act.origY + act.origH - 36, Math.round(act.origH - dy)));
          nextY = Math.max(36, act.origY + (act.origH - proposedH));
          nextH = proposedH;
        }

        onChangeFloatingPanels({
          ...floatingPanels,
          [act.id]: {
            ...cur,
            x: nextX,
            y: nextY,
            width: Math.min(maxW, nextW),
            height: Math.min(maxH, nextH),
          },
        });
      }
    };
    const onUp = () => {
      floatingActionRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [floatingPanels, onChangeFloatingPanels]);

  const handleFloatPanel = useCallback(
    (panelId: RightPanelId) => {
      if (!onChangeFloatingPanels) return;
      const existing = floatingPanels[panelId];
      const isTimeline = panelId === 'timeline';
      const defaultW = isTimeline ? Math.min(880, Math.max(460, window.innerWidth - 96)) : 330;
      const defaultH = isTimeline ? 290 : 440;
      const next: FloatingPanelState = existing
        ? { ...existing, isFloating: !existing.isFloating, minimized: false }
        : {
            panelId,
            isFloating: true,
            x: Math.max(24, Math.round((window.innerWidth - defaultW) / 2)),
            y: isTimeline ? Math.max(72, window.innerHeight - defaultH - 32) : 96,
            width: defaultW,
            height: defaultH,
            pinned: true,
            minimized: false,
            maximized: false,
          };
      onChangeFloatingPanels({ ...floatingPanels, [panelId]: next });
      setTopFloatingId(panelId);
      if (openMiniFlyoutId === panelId) setOpenMiniFlyoutId(null);
    },
    [floatingPanels, onChangeFloatingPanels, openMiniFlyoutId]
  );

  const handleToggleMaximizeDockedPanel = useCallback(
    (panel: RightPanelConfig, zone: PanelDockZone) => {
      const existing = maximizedDockedPanels[panel.id];
      if (existing) {
        // Restore previous size
        if (zone === 'top' && onResizeTopDock) {
          onResizeTopDock(existing.prevDockHeight ?? 196);
        } else if (zone === 'bottom' && onResizeBottomDock) {
          onResizeBottomDock(existing.prevDockHeight ?? 236);
        } else if (onChangePanelDimensions) {
          onChangePanelDimensions(panel.id, { height: existing.prevPanelHeight ?? null });
        }
        setMaximizedDockedPanels((prev) => {
          const next = { ...prev };
          delete next[panel.id];
          return next;
        });
        return;
      }

      // Ensure expanded when maximizing
      if (!panel.expanded) {
        togglePanelExpanded(panel.id);
      }
      if (zone === 'top' && onResizeTopDock) {
        setMaximizedDockedPanels((prev) => ({
          ...prev,
          [panel.id]: { prevDockHeight: topDockHeight },
        }));
        onChangePanelDimensions?.(panel.id, { height: null });
        const maxSafe = getMaxHorizontalDockHeight('top');
        onResizeTopDock(Math.min(maxSafe, Math.max(300, Math.round(workspaceHeight * 0.65))));
      } else if (zone === 'bottom' && onResizeBottomDock) {
        setMaximizedDockedPanels((prev) => ({
          ...prev,
          [panel.id]: { prevDockHeight: bottomDockHeight },
        }));
        onChangePanelDimensions?.(panel.id, { height: null });
        const maxSafe = getMaxHorizontalDockHeight('bottom');
        onResizeBottomDock(Math.min(maxSafe, Math.max(320, Math.round(workspaceHeight * 0.68))));
      } else if (onChangePanelDimensions) {
        setMaximizedDockedPanels((prev) => ({
          ...prev,
          [panel.id]: { prevPanelHeight: panelHeights[panel.id] ?? null },
        }));
        onChangePanelDimensions(panel.id, {
          height: Math.max(320, Math.round(workspaceHeight - 48)),
        });
      }
    },
    [
      maximizedDockedPanels,
      topDockHeight,
      bottomDockHeight,
      panelHeights,
      workspaceHeight,
      getMaxHorizontalDockHeight,
      onResizeTopDock,
      onResizeBottomDock,
      onChangePanelDimensions,
    ]
  );

  const handleSetTabGroupActive = useCallback(
    (groupId: string, panelId: RightPanelId) => {
      if (!onChangeTabGroups) return;
      onChangeTabGroups(
        tabGroups.map((tg) => (tg.id === groupId ? { ...tg, activePanelId: panelId } : tg))
      );
    },
    [tabGroups, onChangeTabGroups]
  );

  const handleUngroupTabPanel = useCallback(
    (groupId: string, panelId: RightPanelId) => {
      if (!onChangeTabGroups) return;
      onChangeTabGroups(
        tabGroups
          .map((tg) => {
            if (tg.id !== groupId) return tg;
            const remaining = tg.panelIds.filter((id) => id !== panelId);
            return {
              ...tg,
              panelIds: remaining,
              activePanelId: remaining.includes(tg.activePanelId) ? tg.activePanelId : remaining[0] || panelId,
            };
          })
          .filter((tg) => tg.panelIds.length >= 2)
      );
    },
    [tabGroups, onChangeTabGroups]
  );

  // Group deletion state
  const [deletingGroup, setDeletingGroup] = useState<LayerGroup | null>(null);

  // Multi-layer selection state
  const selectedLayers = selectedLayerIndices && selectedLayerIndices.length > 0
    ? selectedLayerIndices
    : [currentLayerIndex];

  // Toggle Panel Expanded
  const togglePanelExpanded = (id: RightPanelId) => {
    if (onTogglePanelExpanded) {
      onTogglePanelExpanded(id);
      return;
    }
    setLocalPanelOrder((prev) =>
      prev.map((p) => (p.id === id ? { ...p, expanded: !p.expanded } : p))
    );
  };

  // Toggle Panel Visible
  const togglePanelVisible = (id: RightPanelId) => {
    if (onTogglePanelVisible) {
      onTogglePanelVisible(id);
      return;
    }
    setLocalPanelOrder((prev) =>
      prev.map((p) => (p.id === id ? { ...p, visible: !p.visible } : p))
    );
  };

  // Resolve effective dock zone for any panel (backwards-compatible with older saved layouts)
  const defaultMainZone: PanelDockZone = dockPosition === 'left' ? 'left-main' : 'right-main';
  const getPanelDockZone = useCallback(
    (panel: RightPanelConfig): PanelDockZone => panel.dock || defaultMainZone,
    [defaultMainZone]
  );

  // Close open mini-panel flyout on outside click or Escape
  useEffect(() => {
    if (!openMiniFlyoutId) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-mini-flyout]') || target.closest('[data-mini-trigger]')) return;
      setOpenMiniFlyoutId(null);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMiniFlyoutId(null);
    };
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [openMiniFlyoutId]);

  // Pointer-based Photoshop-style Drag & Drop with Live Colored Target Shadow Preview + Tab Merge + Float on Canvas
  const hitTestDockTarget = useCallback(
    (
      clientX: number,
      clientY: number,
      draggedId: RightPanelId
    ): { zone: PanelDockZone | 'float-canvas' | null; index: number; mergeTargetId: RightPanelId | null } => {
      const root = workspaceRef.current;
      if (!root) return { zone: null, index: 0, mergeTargetId: null };

      // Check central float-canvas drop badge if hovering over center canvas
      const floatDropEl = root.querySelector<HTMLElement>('[data-float-canvas-drop]');
      if (floatDropEl) {
        const fRect = floatDropEl.getBoundingClientRect();
        if (
          clientX >= fRect.left &&
          clientX <= fRect.right &&
          clientY >= fRect.top &&
          clientY <= fRect.bottom
        ) {
          return { zone: 'float-canvas', index: 0, mergeTargetId: null };
        }
      }

      const zoneEls = Array.from(root.querySelectorAll<HTMLElement>('[data-dock-zone]'));
      for (const el of zoneEls) {
        const rect = el.getBoundingClientRect();
        const pad = 8;
        if (
          clientX >= rect.left - pad &&
          clientX <= rect.right + pad &&
          clientY >= rect.top - pad &&
          clientY <= rect.bottom + pad
        ) {
          const zone = el.dataset.dockZone as PanelDockZone;
          const isHorizontalZone = zone === 'top' || zone === 'bottom' || el.dataset.dockOrientation === 'horizontal';
          const cards = Array.from(el.querySelectorAll<HTMLElement>('[data-dock-card]'));

          // Check if pointer is inside top tab-merge strip of another card in main/top/bottom zones
          if (!zone.endsWith('mini')) {
            for (const card of cards) {
              const cardId = card.dataset.dockCard as RightPanelId | undefined;
              if (!cardId || cardId === draggedId) continue;
              const cRect = card.getBoundingClientRect();
              if (
                clientX >= cRect.left + 8 &&
                clientX <= cRect.right - 8 &&
                clientY >= cRect.top &&
                clientY <= cRect.top + 32
              ) {
                return { zone, index: 0, mergeTargetId: cardId };
              }
            }
          }

          let insertIdx = cards.length;
          for (let i = 0; i < cards.length; i++) {
            const cRect = cards[i].getBoundingClientRect();
            if (isHorizontalZone) {
              const midX = cRect.left + cRect.width / 2;
              if (clientX < midX) {
                insertIdx = i;
                break;
              }
            } else {
              const midY = cRect.top + cRect.height / 2;
              if (clientY < midY) {
                insertIdx = i;
                break;
              }
            }
          }
          return { zone, index: insertIdx, mergeTargetId: null };
        }
      }
      return { zone: null, index: 0, mergeTargetId: null };
    },
    []
  );

  const commitLocalDrop = useCallback(
    (panelId: RightPanelId, targetZone: PanelDockZone, targetIndex: number) => {
      if (onDropPanelToDock) {
        onDropPanelToDock(panelId, targetZone, targetIndex);
        return;
      }
      setLocalPanelOrder((prev) => {
        const target = prev.find((p) => p.id === panelId);
        if (!target) return prev;
        const without = prev.filter((p) => p.id !== panelId);
        const zoneItems = without.filter((p) => (p.dock || defaultMainZone) === targetZone);
        const clampedIdx = Math.max(0, Math.min(targetIndex, zoneItems.length));
        const anchorPanel = zoneItems[clampedIdx];
        const updated: RightPanelConfig = {
          ...target,
          dock: targetZone,
          visible: true,
          expanded: targetZone.endsWith('mini') ? target.expanded : true,
        };
        if (!anchorPanel) return [...without, updated];
        const globalIdx = without.findIndex((p) => p.id === anchorPanel.id);
        const next = [...without];
        next.splice(globalIdx, 0, updated);
        return next;
      });
    },
    [onDropPanelToDock, defaultMainZone]
  );

  const startPanelDrag = (e: React.PointerEvent, panel: RightPanelConfig) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const initial: PanelDragState = {
      panelId: panel.id,
      title: panel.title,
      startX: e.clientX,
      startY: e.clientY,
      pointerX: e.clientX,
      pointerY: e.clientY,
      isDragging: false,
      targetZone: null,
      targetIndex: 0,
      mergeTargetId: null,
    };
    setDragState(initial);
    dragStateRef.current = initial;
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const cur = dragStateRef.current;
      if (!cur) return;
      const dist = Math.hypot(e.clientX - cur.startX, e.clientY - cur.startY);
      const nowDragging = cur.isDragging || dist > 6;
      if (!nowDragging) return;

      const hit = hitTestDockTarget(e.clientX, e.clientY, cur.panelId);
      const next: PanelDragState = {
        ...cur,
        isDragging: true,
        pointerX: e.clientX,
        pointerY: e.clientY,
        targetZone: hit.zone,
        targetIndex: hit.index,
        mergeTargetId: hit.mergeTargetId,
      };
      setDragState(next);
      dragStateRef.current = next;
    };

    const handlePointerUp = () => {
      const cur = dragStateRef.current;
      if (!cur) return;
      if (cur.isDragging) {
        suppressNextClickRef.current = true;
        window.setTimeout(() => {
          suppressNextClickRef.current = false;
        }, 120);
        if (cur.targetZone === 'float-canvas') {
          if (onChangeFloatingPanels) {
            onChangeFloatingPanels({
              ...floatingPanels,
              [cur.panelId]: {
                panelId: cur.panelId,
                isFloating: true,
                x: Math.max(80, Math.min(window.innerWidth - 360, cur.pointerX - 160)),
                y: Math.max(60, Math.min(window.innerHeight - 280, cur.pointerY - 24)),
                width: panelWidths[cur.panelId] || (cur.panelId === 'timeline' ? 680 : 340),
                height: panelHeights[cur.panelId] || (cur.panelId === 'timeline' ? 230 : 420),
                pinned: true,
                minimized: false,
                maximized: false,
              },
            });
            setTopFloatingId(cur.panelId);
          }
        } else if (cur.mergeTargetId && cur.targetZone) {
          if (onMergePanelsToTabGroup) {
            onMergePanelsToTabGroup(cur.panelId, cur.mergeTargetId, cur.targetZone);
          } else {
            commitLocalDrop(cur.panelId, cur.targetZone, cur.targetIndex);
          }
        } else if (cur.targetZone) {
          commitLocalDrop(cur.panelId, cur.targetZone, cur.targetIndex);
          if (!cur.targetZone.endsWith('mini') && openMiniFlyoutId === cur.panelId) {
            setOpenMiniFlyoutId(null);
          }
        }
      }
      setDragState(null);
      dragStateRef.current = null;
    };

    const handleKeyCancel = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dragStateRef.current?.isDragging) {
        setDragState(null);
        dragStateRef.current = null;
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('keydown', handleKeyCancel);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('keydown', handleKeyCancel);
    };
  }, [hitTestDockTarget, commitLocalDrop, openMiniFlyoutId, onChangeFloatingPanels, floatingPanels, onMergePanelsToTabGroup, panelWidths, panelHeights]);

  const isActivelyDragging = Boolean(dragState?.isDragging);

  const floatingIdSet = useMemo(
    () =>
      new Set(
        Object.values(floatingPanels)
          .filter((fp) => fp.isFloating)
          .map((fp) => fp.panelId)
      ),
    [floatingPanels]
  );

  const registryMetaById = useMemo(() => {
    const m = new Map<RightPanelId, (typeof PANEL_REGISTRY)[number]>();
    PANEL_REGISTRY.forEach((meta) => m.set(meta.id, meta));
    return m;
  }, []);

  const toolbarPanel = panelOrder.find((p) => p.id === 'toolbar');
  const toolbarDockZone = toolbarPanel ? getPanelDockZone(toolbarPanel) : 'left-main';
  const toolbarUseModularSlot = Boolean(
    totalFreedomMode ||
      uiEditMode ||
      floatingIdSet.has('toolbar') ||
      (toolbarDockZone !== 'left-main' && toolbarDockZone !== 'right-main')
  );

  const visiblePanels = panelOrder.filter((p) => {
    if (!p.visible || floatingIdSet.has(p.id)) return false;
    const meta = registryMetaById.get(p.id);
    if (meta?.requiresTotalFreedom && !(totalFreedomMode || uiEditMode)) return false;
    if (p.id === 'toolbar' && !toolbarUseModularSlot) return false;
    return true;
  });

  const panelsByZone: Record<PanelDockZone, RightPanelConfig[]> = {
    top: visiblePanels.filter((p) => getPanelDockZone(p) === 'top'),
    bottom: visiblePanels.filter((p) => getPanelDockZone(p) === 'bottom'),
    'left-main': visiblePanels.filter((p) => getPanelDockZone(p) === 'left-main'),
    'left-mini': visiblePanels.filter((p) => getPanelDockZone(p) === 'left-mini'),
    'right-mini': visiblePanels.filter((p) => getPanelDockZone(p) === 'right-mini'),
    'right-main': visiblePanels.filter((p) => getPanelDockZone(p) === 'right-main'),
  };

  const renderPanelInnerContent = (panel: RightPanelConfig, zone: PanelDockZone | 'floating' = 'right-main') => {
    const isPanelCompact = Boolean(compactMode || compactPanels[panel.id] || panel.compact);
    const activeLayer = layers[currentLayerIndex] || layers[0];
    const isHorizontalSlot =
      zone === 'top' || zone === 'bottom' || (zone !== 'floating' && dockOrientations[zone] === 'horizontal');
    return (
      <div
        className={
          panel.id === 'layers' ||
          panel.id === 'properties' ||
          panel.id === 'history' ||
          panel.id === 'timeline' ||
          panel.id === 'topbar'
            ? 'p-0 flex flex-col'
            : isPanelCompact
            ? 'p-2 flex flex-col gap-2 text-[11px]'
            : 'p-3 flex flex-col gap-3'
        }
        style={{ backgroundColor: 'var(--studio-bg-panel)' }}
      >
                  {/* ========================================================= */}
                  {/* PANEL 0: PINCELES, FINURA & PRESIÓN DE PLUMA              */}
                  {/* ========================================================= */}
                  {panel.id === 'brushes' && (
                    <BrushSettingsPanel
                      brushSettings={brushSettings}
                      onChangeBrushSettings={(next) => onChangeBrushSettings?.(next)}
                      primaryColor={primaryColor}
                      secondaryColor={secondaryColor}
                      canvasWidth={canvasWidth}
                      canvasHeight={canvasHeight}
                      ditherConfig={ditherConfig}
                      onChangeDitherConfig={onChangeDitherConfig}
                      customBrushes={customBrushes}
                      onDeleteCustomBrush={onDeleteCustomBrush}
                    />
                  )}

                  {/* ========================================================= */}
                  {/* PANEL 1B: SIMETRÍA AVANZADA EN VIVO                        */}
                  {/* ========================================================= */}
                  {panel.id === 'symmetry' && (
                    <SymmetryPanel
                      config={symmetryConfig || DEFAULT_SYMMETRY_CONFIG}
                      canvasWidth={canvasWidth}
                      canvasHeight={canvasHeight}
                      onChange={(next) => onChangeSymmetryConfig?.(next)}
                    />
                  )}

                  {/* ========================================================= */}
                  {/* PANEL 1: RUEDA DE COLOR & MUESTRARIO PHOTOSHOP            */}
                  {/* ========================================================= */}
                  {panel.id === 'colorwheel' && (
                    <div className="flex flex-col gap-2.5">
                      <PhotoshopColorWheel
                        color={primaryColor}
                        alpha={primaryAlpha}
                        onChangeColor={onSelectPrimaryColor}
                        onChangeAlpha={onChangePrimaryAlpha}
                        presetColors={activePaletteColors && activePaletteColors.length > 0 ? activePaletteColors : FIGHTING_GAME_PALETTES[0].colors}
                        onApplyPalette={(cols) => onUpdateActivePalette?.(cols)}
                      />

                      {onOpenLospecModal && (
                        <button
                          onClick={onOpenLospecModal}
                          className="w-full py-2 px-3 rounded-xl bg-[#1c2233] hover:bg-[#252e45] text-amber-300 border border-amber-400/30 text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs"
                        >
                          <Palette className="w-3.5 h-3.5 text-amber-400" />
                          <span>Importar Paleta Lospec (.hex / .gpl)...</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* ========================================================= */}
                  {/* PANEL 2: CAPAS & CARPETAS ESTILO PHOTOSHOP                */}
                  {/* ========================================================= */}
                  {panel.id === 'layers' && (
                    <div onMouseDownCapture={() => onUiContextFocus?.('layers')}>
                    <PhotoshopLayersPanel
                      layers={layers}
                      allFrames={frames}
                      currentFrameIndex={currentFrameIndex}
                      layerGroups={layerGroups}
                      currentLayerIndex={currentLayerIndex}
                      selectedLayerIndices={selectedLayers}
                      canvasWidth={canvasWidth}
                      canvasHeight={canvasHeight}
                      hasActiveSelection={hasActiveSelection}
                      editingMask={editingMask}
                      onSetEditingMask={onSetEditingMask}
                      onSelectLayer={onSelectLayer}
                      onSelectLayerIndices={(next) => onSelectLayerIndices?.(next)}
                      activeTrackKey={activeTrackKey}
                      onSelectLayerTrack={onSelectLayerTrack}
                      onToggleTrackVisibility={onToggleTrackVisibility}
                      onToggleTrackLock={onToggleTrackLock}
                      onUpdateTrackMeta={onUpdateTrackMeta}
                      onDeleteTrack={onDeleteTrack}
                      onAssignTrackToGroup={onAssignTrackToGroup}
                      onClearTrackInCurrentFrame={onClearTrackInCurrentFrame}
                      onAddLayer={(lt) => onAddLayer(lt)}
                      onCreateAdjustmentLayer={(cfg, name) => onCreateAdjustmentLayer?.(cfg, name)}
                      onDeleteLayer={onDeleteLayer}
                      onToggleLayerVisibility={onToggleLayerVisibility}
                      onToggleLayerLock={onToggleLayerLock}
                      onChangeLayerOpacity={onChangeLayerOpacity}
                      onUpdateLayerMeta={(idx, patch) => onUpdateLayerMeta?.(idx, patch)}
                      onReorderLayer={(from, to, grpId) => onReorderLayer?.(from, to, grpId)}
                      onAssignLayerToGroup={onAssignLayerToGroup}
                      onCreateLayerGroup={(name, color, parentId) =>
                        onCreateLayerGroup(name, color, parentId)
                      }
                      onRenameLayerGroup={(gId, name) => onRenameLayerGroup?.(gId, name)}
                      onMoveLayerGroupParent={(gId, pId) => onMoveLayerGroupParent?.(gId, pId)}
                      onToggleGroupCollapse={onToggleGroupCollapse}
                      onToggleGroupVisibility={onToggleGroupVisibility}
                      onToggleGroupLock={onToggleGroupLock}
                      onChangeGroupOpacity={onChangeGroupOpacity}
                      onChangeGroupColor={onChangeGroupColor}
                      onRequestDeleteGroup={(g) => setDeletingGroup(g)}
                      onMergeLayers={(indices) => onMergeLayers?.(indices)}
                      onMergeVisibleLayers={() => onMergeVisibleLayers?.()}
                      onMassDuplicateLayers={(indices) => onMassDuplicateLayers?.(indices)}
                      onConvertLayersToGroup={(indices, name, color) =>
                        onConvertLayersToGroup?.(indices, name, color)
                      }
                      onBatchToggleLayerVisibility={(indices) =>
                        onBatchToggleLayerVisibility?.(indices)
                      }
                      onBatchToggleLayerLock={(indices) => onBatchToggleLayerLock?.(indices)}
                      onBatchDeleteLayers={(indices) => onBatchDeleteLayers?.(indices)}
                      onCreateLayerMask={onCreateLayerMask}
                      onDeleteLayerMask={onDeleteLayerMask}
                      onApplyLayerMask={onApplyLayerMask}
                      onInvertLayerMask={onInvertLayerMask}
                      onToggleMaskDisabled={onToggleMaskDisabled}
                      onToggleMaskLinked={onToggleMaskLinked}
                      onToggleMaskQuickPreview={onToggleMaskQuickPreview}
                      onRasterizeLayer={onRasterizeLayer}
                      onConvertToSmartObject={onConvertToSmartObject}
                      onDuplicateLayerToNextFrame={onDuplicateLayerToNextFrame}
                      onDuplicateLayerToSelectedFrames={onDuplicateLayerToSelectedFrames}
                      onDuplicateLayerToAllFrames={onDuplicateLayerToAllFrames}
                      onDuplicateGroupToAllFrames={onDuplicateGroupToAllFrames}
                      performanceMode={performanceMode}
                    />
                    </div>
                  )}

                  {/* ========================================================= */}
                  {/* PANEL 2B: REFERENCIAS VISUALES & DUMMIE 2D MASTER         */}
                  {/* ========================================================= */}
                  {panel.id === 'references' && (
                    <div onMouseDownCapture={() => onUiContextFocus?.('references')}>
                      <ReferencesPanel
                        references={references}
                        referenceGroups={referenceGroups}
                        activeReferenceId={activeReferenceId}
                        onSelectReference={(id) => {
                          onSelectReference?.(id);
                          onUiContextFocus?.('references');
                        }}
                        onAddReferencesFromFiles={(files, gId) =>
                          onAddReferencesFromFiles?.(files, gId)
                        }
                        onUpdateReference={(id, patch) => onUpdateReference?.(id, patch)}
                        onDeleteReference={(id) => onDeleteReference?.(id)}
                        onCreateGroup={(name, color) => onCreateReferenceGroup?.(name, color)}
                        onUpdateGroup={(id, patch) => onUpdateReferenceGroup?.(id, patch)}
                        onDeleteGroup={(id) => onDeleteReferenceGroup?.(id)}
                        onReorderGroup={(dId, tId) => onReorderReferenceGroup?.(dId, tId)}
                        dummiePose={dummiePose}
                        onChangeDummiePose={onChangeDummiePose}
                        savedDummiePoses={savedDummiePoses}
                        onSaveDummiePose={onSaveDummiePose}
                        onDeleteSavedDummiePose={onDeleteSavedDummiePose}
                        onOpenApplyPoseModal={onOpenApplyPoseModal}
                        onGenerateDummieFromReference={onGenerateDummieFromReference}
                        pureRefConfig={pureRefConfig}
                        onChangePureRefConfig={onChangePureRefConfig}
                        onCenterAllReferences={onCenterAllReferences}
                        onBringReferenceToFront={onBringReferenceToFront}
                        onActivateMoveReferenceTool={onActivateMoveReferenceTool}
                        guidesConfig={guidesConfig}
                        canvasWidth={canvasWidth}
                        canvasHeight={canvasHeight}
                        onChangeGuidesConfig={onChangeGuidesConfig}
                      />
                    </div>
                  )}

                  {/* ========================================================= */}
                  {/* PANEL 2C: PROPIEDADES DINÁMICAS (TRANSFORM / VECTORES / CUENTAGOTAS) */}
                  {/* ========================================================= */}
                  {panel.id === 'properties' && (
                    <PropertiesPanel
                      activeTool={activeTool}
                      currentLayer={layers[currentLayerIndex] || layers[0]}
                      currentLayerIndex={currentLayerIndex}
                      layerGroups={layerGroups}
                      canvasWidth={canvasWidth}
                      canvasHeight={canvasHeight}
                      collapsedSections={collapsedSections}
                      onToggleSection={(k) => onToggleCollapsedSection?.(k)}
                      onUpdateLayerMeta={(idx, patch) => onUpdateLayerMeta?.(idx, patch)}
                      onChangeLayerOpacity={onChangeLayerOpacity}
                      onOpenTransform={() => onTriggerTransformAction?.('free')}
                      transformParams={transformParams}
                      vectorConfig={
                        vectorConfig || {
                          mode: 'bezier',
                          widthMode: 'uniform',
                          strokeWidth: 1,
                          profile: 'uniform',
                          customProfileStops: [0.35, 1, 0.35],
                          capStyle: 'round',
                          joinStyle: 'round',
                          tension: 0.4,
                          smoothing: 0.5,
                          curveRadius: 0,
                          pixelPerfect: true,
                          smartPixelCurve: true,
                          penPressureEnabled: true,
                          symmetryMode: 'none',
                          customSymmetryX: Math.floor(canvasWidth / 2),
                          customSymmetryY: Math.floor(canvasHeight / 2),
                          snap: { grid: false, pixel: true, guides: true, nodes: true, objects: true },
                          display: {
                            showNodes: true,
                            showGuides: true,
                            showTangents: true,
                            showControlCurves: true,
                            showThickness: false,
                          },
                          storeOnVectorLayer: true,
                        }
                      }
                      onChangeVectorConfig={(v) => onChangeVectorConfig?.(v)}
                      selectedVectorPath={
                        (layers[currentLayerIndex]?.vectorPaths || []).find(
                          (vp) => vp.id === selectedVectorPathId
                        ) || null
                      }
                      selectedVectorNodeIds={selectedVectorNodeIds}
                      onVectorSelectionAction={(a) => onVectorSelectionAction?.(a)}
                      eyedropperConfig={eyedropperConfig || DEFAULT_EYEDROPPER_CONFIG}
                      onChangeEyedropperConfig={(c) => onChangeEyedropperConfig?.(c)}
                      colorHistory={colorHistory}
                      primaryColor={primaryColor}
                      onSelectPrimaryColor={onSelectPrimaryColor}
                      onCreateLayerMask={(idx, mode) => onCreateLayerMask?.(idx, mode)}
                      onDeleteLayerMask={(idx) => onDeleteLayerMask?.(idx)}
                      shapeConfig={shapeConfig}
                      onChangeShapeConfig={onChangeShapeConfig}
                      bucketSubTool={bucketSubTool}
                      onChangeBucketSubTool={onChangeBucketSubTool}
                      gradientConfig={gradientConfig}
                      onChangeGradientConfig={onChangeGradientConfig}
                    />
                  )}

                  {/* ========================================================= */}
                  {/* PANEL 2D: HISTORIAL DE ACCIONES (UNDO / REDO INTERACTIVO) */}
                  {/* ========================================================= */}
                  {panel.id === 'history' && (
                    <HistoryPanel
                      historyCount={historyLength}
                      historyIndex={historyIndex}
                      canUndo={canUndo}
                      canRedo={canRedo}
                      onUndo={() => onUndo?.()}
                      onRedo={() => onRedo?.()}
                      onJumpToHistory={(idx) => onJumpToHistory?.(idx)}
                    />
                  )}

                  {/* ========================================================= */}
                  {/* PANEL 4: SISTEMA IA MODULAR ESPECIALIZADO (10 ÁREAS)       */}
                  {/* ========================================================= */}
                  {panel.id === 'ai' && (
                    <AiStudioHub
                      canvasWidth={canvasWidth}
                      canvasHeight={canvasHeight}
                      currentFrame={currentFrame}
                      currentFrameIndex={currentFrameIndex}
                      frames={frames}
                      layers={layers}
                      currentLayerIndex={currentLayerIndex}
                      layerGroups={layerGroups}
                      primaryColor={primaryColor}
                      primaryAlpha={primaryAlpha}
                      secondaryColor={secondaryColor}
                      activePaletteColors={activePaletteColors}
                      project={project}
                      stageType={stageType}
                      stageOpacity={stageOpacity}
                      groundConfig={groundConfig}
                      dummyOpponent={dummyOpponent}
                      combatFx={combatFx}
                      performanceMode={performanceMode}
                      references={references}
                      libraryItems={libraryItems}
                      dummiePose={dummiePose}
                      onChangeDummiePose={onChangeDummiePose}
                      savedDummiePoses={savedDummiePoses}
                      onSaveDummiePose={onSaveDummiePose}
                      onDeleteSavedDummiePose={onDeleteSavedDummiePose}
                      onOpenApplyPoseModal={onOpenApplyPoseModal}
                      onGenerateDummieFromReference={onGenerateDummieFromReference}
                      guidesConfig={guidesConfig}
                      onChangeGuidesConfig={onChangeGuidesConfig}
                      onOpenFxStudio={(initialTab, recipeToEdit) => onOpenFxStudio?.(initialTab, recipeToEdit)}
                      lastGeneratedFxRecipe={lastGeneratedFxRecipe}
                      onInjectAiVfx={onInjectAiVfx}
                      onApplyFrameRemix={onApplyFrameRemix}
                      onGenerateInBetween={onGenerateInBetween}
                      onInsertInBetweenSequence={onInsertInBetweenSequence}
                      onInsertAnimationFrames={onInsertAnimationFrames}
                      onInsertGeneratedGrid={onInsertGeneratedGrid}
                      onSaveGridToLibrary={onSaveGridToLibrary}
                      onInsertLibraryItem={onInsertLibraryItem}
                      onLiveCanvasPreview={onLiveCanvasPreview}
                    />
                  )}

                  {/* ========================================================= */}
                  {/* PANEL 4B: MODO DE TRABAJO & ESTUDIO (8 MODOS)             */}
                  {/* ========================================================= */}
                  {panel.id === 'workmode' && (
                    <WorkModeHubPanel
                      workMode={workMode}
                      onChangeWorkMode={(m) => onChangeWorkMode?.(m)}
                      canvasWidth={canvasWidth}
                      canvasHeight={canvasHeight}
                      layers={layers}
                      compositeGrid={workModeCompositeGrid}
                      stageParallaxConfig={stageParallaxConfig}
                      onChangeStageParallaxConfig={(next) => onChangeStageParallaxConfig?.(next)}
                      onUpdateLayerParallaxSpeed={(idx, speed) => onUpdateLayerParallaxSpeed?.(idx, speed)}
                      tilesetConfig={tilesetConfig}
                      onChangeTilesetConfig={(next) => onChangeTilesetConfig?.(next)}
                      onCreateSuggestedLayers={(m) => onCreateSuggestedModeLayers?.(m)}
                      onApplyModeGuides={(m) => onApplyModeGuides?.(m)}
                      onInsertTemplate={(tid) => onInsertModeTemplate?.(tid)}
                      onTriggerModeAi={(kind, hint, cat) => onTriggerModeAi?.(kind, hint, cat)}
                      onOpenFxStudio={(tab, recipe) => onOpenFxStudio?.(tab, recipe)}
                      lastGeneratedFxRecipe={lastGeneratedFxRecipe}
                      activeLayerFxRecipe={layers[currentLayerIndex]?.fxRecipe || null}
                      onOpenExportModal={() => onOpenModeExportModal?.()}
                      guidesConfig={guidesConfig}
                      onChangeGuidesConfig={onChangeGuidesConfig}
                      onOpenGuidesModal={onOpenGuidesModal}
                      activeFightingProfile={activeFightingProfile}
                      onApplyFightingProfile={onApplyFightingProfile}
                      onAddStageRoleLayer={onAddStageRoleLayer}
                      onSelectTool={onSelectTool}
                      onFocusTilesetsPanel={onFocusTilesetsPanel}
                      dummyOpponent={dummyOpponent}
                      onChangeDummyOpponent={onChangeDummyOpponent}
                    />
                  )}

                  {/* ========================================================= */}
                  {/* PANEL 4C: EDITOR DEDICADO DE TILESETS & AUTOTILE          */}
                  {/* ========================================================= */}
                  {panel.id === 'tilesets' && onChangeTilesets && onChangeTileToolConfig && (
                    <TilesetEditorPanel
                      tilesets={tilesets}
                      onChangeTilesets={onChangeTilesets}
                      tileToolConfig={tileToolConfig}
                      onChangeTileToolConfig={onChangeTileToolConfig}
                      onSelectTool={onSelectTool}
                      onCaptureTileFromCanvas={onCaptureTileFromCanvas}
                      onNotify={onStudioNotify}
                    />
                  )}

                  {/* ========================================================= */}
                  {/* PANEL 5: ESCENARIOS RETRO & DUMMY SPARRING                */}
                  {/* ========================================================= */}
                  {panel.id === 'stage' && (
                    <div className="flex flex-col gap-3 text-xs">
                      {/* Stage Selector */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-bold text-slate-300">Escenario de Fondo</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { id: 'training_grid', label: 'Cuadrícula Dojo' },
                            { id: 'dojo', label: 'Tatami Clásico' },
                            { id: 'cyberpunk', label: 'Cyberpunk Neon' },
                            { id: 'dark_arena', label: 'Arena Torneo' },
                            { id: 'checkerboard', label: 'Tablero Aseprite' },
                          ].map((s) => (
                            <button
                              key={s.id}
                              onClick={() => onChangeStageType(s.id as StageType)}
                              className={`p-2 rounded-lg text-left font-semibold text-[11px] border transition-colors ${
                                stageType === s.id
                                  ? 'bg-[#232b3f] border-amber-400 text-amber-300'
                                  : 'bg-[#151926] border-[#252c3f] text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Stage Opacity */}
                      <div className="bg-[#12141c] p-2.5 rounded-xl border border-[#232a3d]">
                        <StudioSlider
                          variant="panel"
                          label="Opacidad de Escenario"
                          value={Math.round(stageOpacity * 100)}
                          min={0}
                          max={100}
                          step={1}
                          defaultValue={100}
                          unit="%"
                          onChange={(v) => onChangeStageOpacity(v / 100)}
                        />
                      </div>

                      {/* Ground Line & Foot Shadow */}
                      <div className="flex flex-col gap-2 bg-[#12141c] p-2.5 rounded-xl border border-[#232a3d]">
                        <span className="text-[11px] font-bold text-slate-300">Nivel de Suelo & Sombra de Pies</span>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-[11px]">
                            <input
                              type="checkbox"
                              checked={groundConfig.visible}
                              onChange={(e) =>
                                onChangeGroundConfig({ ...groundConfig, visible: e.target.checked })
                              }
                              className="accent-amber-400 rounded"
                            />
                            <span>Línea de Suelo (Ground Level)</span>
                          </label>
                        </div>

                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-[11px]">
                            <input
                              type="checkbox"
                              checked={groundConfig.showShadow}
                              onChange={(e) =>
                                onChangeGroundConfig({ ...groundConfig, showShadow: e.target.checked })
                              }
                              className="accent-amber-400 rounded"
                            />
                            <span>Sombra Proyectada de Pies</span>
                          </label>
                        </div>

                        <div className="mt-1">
                          <StudioSlider
                            variant="panel"
                            label="Posición Vertical (Y)"
                            value={groundConfig.groundY}
                            min={10}
                            max={canvasHeight}
                            step={1}
                            defaultValue={Math.round(canvasHeight * 0.85)}
                            unit="px"
                            onChange={(v) => onChangeGroundConfig({ ...groundConfig, groundY: v })}
                          />
                        </div>
                      </div>

                      {/* Dummy Sparring Partner */}
                      <div className="flex flex-col gap-2 bg-[#12141c] p-2.5 rounded-xl border border-[#232a3d]">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-200">Oponente Dummy (P2 Sparring)</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 font-mono">
                            Live Collision
                          </span>
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-[11px]">
                          <input
                            type="checkbox"
                            checked={dummyOpponent.enabled}
                            onChange={(e) =>
                              onChangeDummyOpponent({ ...dummyOpponent, enabled: e.target.checked })
                            }
                            className="accent-indigo-400 rounded"
                          />
                          <span>Activar Sparring Partner (P2)</span>
                        </label>

                        {dummyOpponent.enabled && (
                          <>
                            <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-[11px]">
                              <input
                                type="checkbox"
                                checked={dummyOpponent.showHurtbox}
                                onChange={(e) =>
                                  onChangeDummyOpponent({ ...dummyOpponent, showHurtbox: e.target.checked })
                                }
                                className="accent-emerald-400 rounded"
                              />
                              <span>Mostrar Hurtbox P2</span>
                            </label>

                            <StudioSlider
                              variant="panel"
                              label="Distancia de Combate"
                              value={dummyOpponent.distance}
                              min={10}
                              max={Math.max(12, canvasWidth - 10)}
                              step={1}
                              defaultValue={Math.round(canvasWidth * 0.6)}
                              unit="px"
                              accentColor="#818cf8"
                              onChange={(v) => onChangeDummyOpponent({ ...dummyOpponent, distance: v })}
                            />

                            <p className="text-[10px] text-slate-400 italic bg-[#171b28] p-2 rounded border border-[#262f45]">
                              Chispas e impacto Street Fighter: Cuando tu Hitbox rojo toque al Dummy se generará un destello "HIT!".
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ========================================================= */}
                  {/* PANEL 6: FIGHTING GAME STUDIO                             */}
                  {/* ========================================================= */}
                  {panel.id === 'combat' && (
                    <FightingStudioPanel
                      activeHitboxType={activeHitboxType}
                      onChangeHitboxType={onSelectHitboxType}
                      onSelectHitboxTool={() => onSelectHitboxTool?.()}
                      currentFrame={currentFrame}
                      onDeleteHitbox={(id) => onUpdateHitboxes(hitboxes.filter((h) => h.id !== id))}
                      onUpdateHitboxes={onUpdateHitboxes}
                      onUpdateFrameAdvantage={(onHit, onBlock) =>
                        onUpdateFrameAdvantage?.(onHit, onBlock)
                      }
                      dummyOpponent={dummyOpponent}
                      onChangeDummy={onChangeDummyOpponent}
                      combatFx={combatFx}
                      onChangeCombatFx={onChangeCombatFx}
                      combatTestActive={combatTestActive}
                      onToggleCombatTest={() => onToggleCombatTest?.()}
                      canvasWidth={canvasWidth}
                      canvasHeight={canvasHeight}
                      frames={frames}
                      currentFrameIndex={currentFrameIndex}
                      cameraShake={cameraShake}
                      onChangeCameraShake={onChangeCameraShake}
                      onTriggerCameraShakeTest={onTriggerCameraShakeTest}
                    />
                  )}

                  {/* ========================================================= */}
                  {/* PANEL 7: FILTROS & CAPAS DE AJUSTE                        */}
                  {/* ========================================================= */}
                  {panel.id === 'filters' && (
                    <FiltersAdjustmentPanel
                      currentLayer={layers[currentLayerIndex] || layers[0]}
                      primaryColor={primaryColor}
                      onApplyDirectAdjustment={(cfg, intensity) => onApplyDirectAdjustment?.(cfg, intensity)}
                      onCreateAdjustmentLayer={(cfg, name) => onCreateAdjustmentLayer?.(cfg, name)}
                      onUpdateAdjustmentLayer={(cfg) => onUpdateAdjustmentLayer?.(cfg)}
                      onBakeAdjustmentLayer={() => onBakeAdjustmentLayer?.()}
                      onApplyQuickFilter={(fid, intensity) => onApplyQuickFilter?.(fid, intensity)}
                      onLivePreviewChange={(p) => onLiveCanvasPreview?.(p)}
                    />
                  )}

                  {/* ========================================================= */}
                  {/* PANEL 8: ASSET BROWSER / LIBRERÍA                         */}
                  {/* ========================================================= */}
                  {panel.id === 'library' && (
                    <div onMouseDownCapture={() => onUiContextFocus?.('library')}>
                    <AssetLibraryPanel
                      libraryItems={libraryItems}
                      assetFolders={assetFolders}
                      onCreateAssetFolder={(f) => onCreateAssetFolder?.(f)}
                      onInsertLibraryItem={(item, mode, dx, dy) =>
                        onInsertLibraryItem?.(item, mode, dx, dy)
                      }
                      onSaveCurrentLayerToLibrary={(name, cat, folder, tags) =>
                        onSaveCurrentLayerToLibrary?.(name, cat, folder, tags)
                      }
                      onSaveSelectionToLibrary={(name, cat, folder, tags) =>
                        onSaveSelectionToLibrary?.(name, cat, folder, tags)
                      }
                      hasActiveSelection={hasActiveSelection}
                      onAddAiLibraryItem={(item) => onAddAiLibraryItem?.(item)}
                      onAddUploadedLibraryItem={(item) => onAddUploadedLibraryItem?.(item)}
                      onUpdateLibraryItem={(id, patch) => onUpdateLibraryItem?.(id, patch)}
                      onDeleteLibraryItem={(id) => onDeleteLibraryItem?.(id)}
                      activePaletteColors={
                        activePaletteColors && activePaletteColors.length > 0
                          ? activePaletteColors
                          : FIGHTING_GAME_PALETTES[0].colors
                      }
                      projectName={project?.name || 'PixelClash'}
                    />
                    </div>
                  )}

                  {/* ========================================================= */}
                  {/* PANELES MODULARES ADICIONALES & MODO LIBERTAD TOTAL       */}
                  {/* ========================================================= */}
                  {panel.id === 'timeline' && (
                    <div className="min-w-0 w-full h-full flex-1 flex flex-col min-h-0">
                      {renderTimelineSlot ? (
                        renderTimelineSlot(zone)
                      ) : (
                        <div className="p-3 text-[11px]" style={{ color: 'var(--studio-text-muted)' }}>
                          Línea de Tiempo ({frames.length} fotogramas)
                        </div>
                      )}
                    </div>
                  )}

                  {panel.id === 'toolbar' && (
                    <div className="p-1.5 flex items-center justify-center">
                      {renderTotalFreedomToolbarSlot ? (
                        renderTotalFreedomToolbarSlot(isHorizontalSlot ? 'horizontal' : 'vertical', true)
                      ) : (
                        <div className="text-[11px]" style={{ color: 'var(--studio-text-muted)' }}>
                          Herramientas modulares
                        </div>
                      )}
                    </div>
                  )}

                  {panel.id === 'topbar' && (
                    <div className="min-w-0 w-full">
                      {totalFreedomTopBarSlot || (
                        <div className="p-2 text-[11px]" style={{ color: 'var(--studio-text-muted)' }}>
                          Barra rápida superior
                        </div>
                      )}
                    </div>
                  )}

                  {panel.id === 'dummie' && (
                    dummiePose && onChangeDummiePose ? (
                      <div onMouseDownCapture={() => onUiContextFocus?.('poses')}>
                        <DummiePosePanel
                          pose={dummiePose}
                          onChangePose={onChangeDummiePose}
                          savedPoses={savedDummiePoses}
                          onSavePose={(p) => onSaveDummiePose?.(p)}
                          onDeleteSavedPose={(id) => onDeleteSavedDummiePose?.(id)}
                          onOpenApplyModal={() => onOpenApplyPoseModal?.()}
                          references={references}
                          guidesConfig={guidesConfig}
                          canvasWidth={canvasWidth}
                          canvasHeight={canvasHeight}
                          onChangeGuidesConfig={onChangeGuidesConfig}
                        />
                      </div>
                    ) : (
                      <div className="p-3 text-[11px]" style={{ color: 'var(--studio-text-muted)' }}>
                        Activa el esqueleto Dummie 2D desde Referencias o Menú.
                      </div>
                    )
                  )}

                  {panel.id === 'palette' && (
                    <PalettePanel
                      primaryColor={primaryColor}
                      secondaryColor={secondaryColor}
                      activePaletteColors={activePaletteColors || FIGHTING_GAME_PALETTES[0].colors}
                      onSelectPrimaryColor={onSelectPrimaryColor}
                      onSelectSecondaryColor={onSelectSecondaryColor}
                      onUpdateActivePalette={(cols) => onUpdateActivePalette?.(cols)}
                      onOpenLospecModal={onOpenLospecModal}
                    />
                  )}

                  {panel.id === 'brush_manager' && (
                    <BrushManagerPanel
                      brushSettings={brushSettings}
                      onChangeBrushSettings={(next) => onChangeBrushSettings?.(next)}
                      onSelectPencil={() => onSelectTool?.('pencil')}
                    />
                  )}

                  {panel.id === 'textures' && (
                    <TexturesPanel
                      activeDither={ditherPattern}
                      onSelectDither={(d) => onChangeDitherPattern?.(d)}
                      onSelectDitherTool={() => onSelectTool?.('dither')}
                    />
                  )}

                  {panel.id === 'materials' && (
                    <MaterialsPanel
                      onSelectPrimaryColor={onSelectPrimaryColor}
                      onSelectSecondaryColor={onSelectSecondaryColor}
                      onUpdateActivePalette={(cols) => onUpdateActivePalette?.(cols)}
                    />
                  )}

                  {panel.id === 'ai_config' && (
                    <AiConfigPanel
                      autoApplyAllFrames={autoApplyAllFrames}
                      onToggleAutoApplyAllFrames={() => onToggleAutoApplyAllFrames?.()}
                      references={references}
                      onToggleRefAiGuide={(id, next) => onUpdateReference?.(id, { useAsAiGuide: next })}
                      onOpenAiPanel={() => {
                        const aiP = panelOrder.find((p) => p.id === 'ai');
                        if (aiP && !aiP.visible) togglePanelVisible('ai');
                        if (aiP && !aiP.expanded) togglePanelExpanded('ai');
                      }}
                    />
                  )}

                  {panel.id === 'preview' && (
                    <LivePreviewPanel
                      frames={frames}
                      currentFrameIndex={currentFrameIndex}
                      canvasWidth={canvasWidth}
                      canvasHeight={canvasHeight}
                      fps={fps}
                      isPlaying={isPlaying}
                      onTogglePlay={() => onTogglePlay?.()}
                      onSelectFrame={(idx) => onSelectFrame?.(idx)}
                      onFloatToCanvas={onFloatMiniPreviewToCanvas}
                    />
                  )}

                  {panel.id === 'navigator' && (
                    <NavigatorPanel
                      currentFrame={currentFrame}
                      currentFrameIndex={currentFrameIndex}
                      canvasWidth={canvasWidth}
                      canvasHeight={canvasHeight}
                      showGrid={showGrid}
                      onToggleGrid={() => onToggleGrid?.()}
                      showHitboxes={showHitboxes}
                      onToggleHitboxes={() => onToggleHitboxes?.()}
                    />
                  )}

                  {panel.id === 'console' && (
                    <StudioConsolePanel
                      logs={studioLogs}
                      onExecuteQuickCommand={(cmd) => onRunConsoleCommand?.(cmd)}
                    />
                  )}

                  {panel.id === 'animation' && (
                    <AnimationControlPanel
                      fps={fps}
                      onChangeFps={(v) => onChangeFps?.(v)}
                      playbackMode={playbackMode}
                      onChangePlaybackMode={(m) => onChangePlaybackMode?.(m)}
                      onionSkinEnabled={onionSkinEnabled}
                      onToggleOnionSkin={() => onToggleOnionSkin?.()}
                      onionSkinPrev={onionSkinPrev}
                      onChangeOnionSkinPrev={(n) => onChangeOnionSkinPrev?.(n)}
                      onionSkinNext={onionSkinNext}
                      onChangeOnionSkinNext={(n) => onChangeOnionSkinNext?.(n)}
                      onionSkinOpacity={onionSkinOpacity}
                      onChangeOnionSkinOpacity={(op) => onChangeOnionSkinOpacity?.(op)}
                      cameraShake={cameraShake}
                      onChangeCameraShake={onChangeCameraShake}
                      onTriggerCameraShakeTest={onTriggerCameraShakeTest}
                      cameraKeyframes={cameraKeyframes}
                      currentFrameIndex={currentFrameIndex}
                      onSetCameraKeyframe={onSetCameraKeyframe}
                      onRemoveCameraKeyframe={onRemoveCameraKeyframe}
                    />
                  )}

                  {panel.id === 'keyframes' && activeLayer && (
                    <div onMouseDownCapture={() => onUiContextFocus?.('keyframes')}>
                      <KeyframesPanel
                        currentLayer={activeLayer}
                        currentLayerIndex={currentLayerIndex}
                        currentFrameIndex={currentFrameIndex}
                        onSetLayerKeyframe={onSetLayerKeyframe}
                        onRemoveLayerKeyframe={onRemoveLayerKeyframe}
                      />
                    </div>
                  )}

                  {panel.id === 'vector_editor' && activeLayer && (
                    <VectorEditorPanel
                      activeTool={activeTool}
                      onSelectTool={(t) => onSelectTool?.(t)}
                      vectorConfig={
                        vectorConfig || {
                          mode: 'bezier',
                          widthMode: 'uniform',
                          strokeWidth: 1,
                          profile: 'uniform',
                          customProfileStops: [0.35, 1, 0.35],
                          capStyle: 'round',
                          joinStyle: 'round',
                          tension: 0.4,
                          smoothing: 0.5,
                          curveRadius: 0,
                          pixelPerfect: true,
                          smartPixelCurve: true,
                          penPressureEnabled: true,
                          symmetryMode: 'none',
                          customSymmetryX: Math.floor(canvasWidth / 2),
                          customSymmetryY: Math.floor(canvasHeight / 2),
                          snap: { grid: false, pixel: true, guides: true, nodes: true, objects: true },
                          display: {
                            showNodes: true,
                            showGuides: true,
                            showTangents: true,
                            showControlCurves: true,
                            showThickness: false,
                          },
                          storeOnVectorLayer: true,
                        }
                      }
                      onChangeVectorConfig={(v) => onChangeVectorConfig?.(v)}
                      currentLayer={activeLayer}
                    />
                  )}

                  {panel.id === 'masks' && activeLayer && (
                    <MasksStudioPanel
                      currentLayer={activeLayer}
                      currentLayerIndex={currentLayerIndex}
                      editingMask={editingMask}
                      onSetEditingMask={onSetEditingMask}
                      onCreateLayerMask={onCreateLayerMask}
                      onInvertLayerMask={onInvertLayerMask}
                      onApplyLayerMask={onApplyLayerMask}
                      onDeleteLayerMask={onDeleteLayerMask}
                    />
                  )}

                  {panel.id === 'project_explorer' && (
                    <ProjectExplorerPanel
                      projectName={project?.name || 'PixelClash'}
                      frames={frames}
                      layerGroups={layerGroups}
                      currentFrameIndex={currentFrameIndex}
                      onSelectFrame={(idx) => onSelectFrame?.(idx)}
                      onSaveProjectPcs={onSaveProjectPcs}
                    />
                  )}
      </div>
    );
  };

  const renderDropShadowSlot = (label: string = 'Soltar panel aquí') => (
    <div
      className="h-14 rounded-xl border-2 border-dashed flex items-center justify-center text-[11px] font-semibold transition-all duration-100 pointer-events-none shrink-0"
      style={{
        borderColor: 'var(--studio-accent)',
        backgroundColor: 'color-mix(in srgb, var(--studio-accent) 22%, transparent)',
        color: 'var(--studio-accent)',
        boxShadow: '0 0 24px color-mix(in srgb, var(--studio-accent) 55%, transparent), inset 0 0 14px color-mix(in srgb, var(--studio-accent) 25%, transparent)',
      }}
    >
      {label}
    </div>
  );

  const renderPanelHeaderTitle = (panel: RightPanelConfig) => {
    const Icon = PANEL_ICONS[panel.id] || Layers;
    const showIcon = collapseDisplayMode !== 'name';
    const showName = collapseDisplayMode !== 'icon';
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <GripVertical
          className="w-3.5 h-3.5 shrink-0 opacity-60"
          style={{ color: 'var(--studio-text-muted)' }}
        />
        {showIcon && <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--studio-accent)' }} />}
        {showName && (
          <span className="text-xs font-bold truncate" style={{ color: 'var(--studio-text)' }}>
            {panel.title}
          </span>
        )}
      </div>
    );
  };

  const renderDockedResizeHandles = (
    panel: RightPanelConfig,
    zone: PanelDockZone,
    isSoleInHorizontalDock: boolean
  ) => {
    if (!panel.expanded) return null;
    const customW = panelWidths[panel.id];
    const customH = panelHeights[panel.id];
    const startEdgeResize = (edge: ResizeEdge) => (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const card = e.currentTarget.parentElement;
      const rect = card?.getBoundingClientRect();
      const origW = customW || Math.round(rect?.width || 280);
      const origH = customH || Math.round(rect?.height || 220);
      const origDockSize =
        zone === 'top'
          ? topDockHeight
          : zone === 'bottom'
          ? bottomDockHeight
          : zone === 'left-main'
          ? leftMainWidth
          : rightMainWidth;
      setPanelResizeState({
        panelId: panel.id,
        zone,
        edge,
        isSoleInHorizontalDock,
        startX: e.clientX,
        startY: e.clientY,
        origW,
        origH,
        origDockSize,
        curW: origW,
        curH: origH,
        pointerX: e.clientX,
        pointerY: e.clientY,
      });
    };
    const handleResetDims = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChangePanelDimensions?.(panel.id, { width: null, height: null });
    };

    const edgeHighlight = uiEditMode
      ? 'bg-amber-400/20 hover:bg-amber-400/75'
      : 'hover:bg-amber-400/50';

    const skipTopEdge = zone === 'bottom' && isSoleInHorizontalDock;
    const skipBottomEdge = zone === 'top' && isSoleInHorizontalDock;

    return (
      <>
        {/* Top Edge (skip when bottom-dock rowSplitter already sits flush on top border) */}
        {!skipTopEdge && (
          <div
            onPointerDown={startEdgeResize('n')}
            onDoubleClick={handleResetDims}
            title="Arrastra el borde superior para ajustar altura · Doble clic para restablecer"
            className={`absolute top-0 left-3 right-3 h-1.5 cursor-row-resize z-20 transition-colors ${edgeHighlight}`}
          />
        )}
        {/* Bottom Edge (skip when top-dock rowSplitter already sits flush on bottom border) */}
        {!skipBottomEdge && (
          <div
            onPointerDown={startEdgeResize('s')}
            onDoubleClick={handleResetDims}
            title="Arrastra el borde inferior para ajustar altura · Doble clic para restablecer"
            className={`absolute bottom-0 left-3 right-3 h-1.5 cursor-row-resize z-20 transition-colors ${edgeHighlight}`}
          />
        )}
        {/* Left Edge */}
        <div
          onPointerDown={startEdgeResize('w')}
          onDoubleClick={handleResetDims}
          title="Arrastra el borde izquierdo para ajustar ancho · Doble clic para restablecer"
          className={`absolute top-3 bottom-3 left-0 w-1.5 cursor-col-resize z-20 transition-colors ${edgeHighlight}`}
        />
        {/* Right Edge */}
        <div
          onPointerDown={startEdgeResize('e')}
          onDoubleClick={handleResetDims}
          title="Arrastra el borde derecho para ajustar ancho · Doble clic para restablecer"
          className={`absolute top-3 bottom-3 right-0 w-1.5 cursor-col-resize z-20 transition-colors ${edgeHighlight}`}
        />
        {/* 4 Corner Handles */}
        {!skipTopEdge && (
          <div
            onPointerDown={startEdgeResize('nw')}
            onDoubleClick={handleResetDims}
            title="Redimensionar desde esquina superior izquierda"
            className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize z-30 hover:bg-amber-400/50"
          />
        )}
        {!skipTopEdge && (
          <div
            onPointerDown={startEdgeResize('ne')}
            onDoubleClick={handleResetDims}
            title="Redimensionar desde esquina superior derecha"
            className="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize z-30 hover:bg-amber-400/50"
          />
        )}
        {!skipBottomEdge && (
          <div
            onPointerDown={startEdgeResize('sw')}
            onDoubleClick={handleResetDims}
            title="Redimensionar desde esquina inferior izquierda"
            className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize z-30 hover:bg-amber-400/50"
          />
        )}
        {!skipBottomEdge && (
          <div
            onPointerDown={startEdgeResize('se')}
            onDoubleClick={handleResetDims}
            title="Redimensionar ancho y alto simultáneamente · Doble clic para restablecer"
            className="absolute bottom-0 right-0 w-3.5 h-3.5 cursor-nwse-resize z-30 opacity-60 hover:opacity-100"
            style={{
              background: 'linear-gradient(135deg, transparent 50%, var(--studio-accent) 50%)',
            }}
          />
        )}
      </>
    );
  };

  const renderDockPanelCard = (
    panel: RightPanelConfig,
    zone: PanelDockZone,
    isSoleInHorizontalDock = false
  ) => {
    const isBeingDragged = isActivelyDragging && dragState?.panelId === panel.id;
    const isMergeTarget = isActivelyDragging && dragState?.mergeTargetId === panel.id;
    const isPanelCompact = Boolean(compactMode || compactPanels[panel.id] || panel.compact);
    const isMaximizedDocked = Boolean(maximizedDockedPanels[panel.id]);
    const customW = panelWidths[panel.id];
    const customH = panelHeights[panel.id];
    const isHorizontalOrientation =
      zone === 'top' || zone === 'bottom' || dockOrientations[zone] === 'horizontal';
    const isMixedOrientation = dockOrientations[zone] === 'mixed';
    const fillsHorizontalDock =
      isSoleInHorizontalDock && (zone === 'top' || zone === 'bottom') && panel.expanded;
    const isTimelineCard = panel.id === 'timeline';

    const cardStyle: React.CSSProperties = {
      backgroundColor: 'var(--studio-bg-card)',
      borderColor: isMergeTarget
        ? 'var(--studio-accent)'
        : uiEditMode
        ? 'color-mix(in srgb, var(--studio-accent) 55%, var(--studio-border))'
        : 'var(--studio-border)',
      borderRadius: fillsHorizontalDock ? 0 : 'var(--studio-radius)',
      boxShadow: isMergeTarget
        ? '0 0 0 2px var(--studio-accent), 0 0 20px color-mix(in srgb, var(--studio-accent) 45%, transparent)'
        : undefined,
      ...(fillsHorizontalDock
        ? {
            width: customW ? customW : '100%',
            minWidth: 0,
            flex: '1 1 0%',
            height: '100%',
            minHeight: 0,
          }
        : {
            ...(customW ? { width: customW, minWidth: customW, flexShrink: 0 } : {}),
            ...(isHorizontalOrientation && !customW
              ? {
                  minWidth: isTimelineCard || panel.id === 'topbar' ? 280 : 250,
                  flex: isTimelineCard || panel.id === 'topbar' ? '1 1 420px' : '0 1 280px',
                }
              : {}),
            ...(isMixedOrientation && !customW ? { minWidth: 180, flex: '1 1 220px' } : {}),
            ...(customH && panel.expanded
              ? { height: customH }
              : isTimelineCard && panel.expanded
              ? { height: 340, minHeight: 200 }
              : {}),
          }),
    };

    return (
      <div
        data-dock-card={panel.id}
        data-panel-id={panel.id}
        data-help-id={`panel.${panel.id}`}
        className={`relative overflow-hidden flex flex-col transition-opacity duration-150 ${
          fillsHorizontalDock
            ? 'flex-1 h-full min-h-0'
            : 'border shadow-sm'
        } ${isBeingDragged ? 'opacity-35' : 'opacity-100'} ${uiEditMode ? 'border border-dashed' : ''}`}
        style={cardStyle}
      >
        {/* Draggable Panel Title Bar (works immediately without requiring UI Edit Mode) */}
        <div
          onPointerDown={(e) => startPanelDrag(e, panel)}
          onClick={() => {
            if (suppressNextClickRef.current) return;
            togglePanelExpanded(panel.id);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            handleToggleMaximizeDockedPanel(panel, zone);
          }}
          title={
            isMergeTarget
              ? 'Suelta para agrupar como pestaña'
              : 'Arrastra el título para acoplar libremente, soltar sobre otro panel para agrupar o al centro para flotar · Doble clic para maximizar'
          }
          className={`${isPanelCompact ? 'px-2 py-1' : 'px-2.5 py-1.5'} border-b flex items-center justify-between gap-1.5 cursor-grab active:cursor-grabbing transition-colors hover:opacity-95 select-none shrink-0`}
          style={{
            backgroundColor: isMergeTarget
              ? 'color-mix(in srgb, var(--studio-accent) 22%, var(--studio-bg-elevated))'
              : 'var(--studio-bg-elevated)',
            borderColor: 'var(--studio-border)',
          }}
        >
          {renderPanelHeaderTitle(panel)}

          <div
            className="flex items-center gap-0.5 shrink-0"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {uiEditMode && (
              <select
                value={zone}
                onChange={(e) => commitLocalDrop(panel.id, e.target.value as PanelDockZone, 99)}
                title="Mover rápidamente a otra zona"
                className="px-1 py-0.5 rounded border text-[9px] font-mono mr-0.5"
                style={{
                  backgroundColor: 'var(--studio-bg-panel)',
                  borderColor: 'var(--studio-border-strong)',
                  color: 'var(--studio-text)',
                }}
              >
                <option value="top">Arriba</option>
                <option value="bottom">Abajo</option>
                <option value="left-main">Izq</option>
                <option value="left-mini">Mini Izq</option>
                <option value="right-mini">Mini Der</option>
                <option value="right-main">Der</option>
              </select>
            )}
            {onTogglePanelCompact && (
              <button
                type="button"
                onClick={() => onTogglePanelCompact(panel.id)}
                title={isPanelCompact ? 'Vista normal del panel' : 'Modo compacto del panel'}
                className="p-1 rounded hover:opacity-80"
                style={{ color: isPanelCompact ? 'var(--studio-accent)' : 'var(--studio-text-muted)' }}
              >
                <Rows3 className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => handleToggleMaximizeDockedPanel(panel, zone)}
              title={isMaximizedDocked ? 'Restaurar tamaño del panel' : 'Maximizar panel'}
              className="p-1 rounded hover:opacity-80"
              style={{ color: isMaximizedDocked ? 'var(--studio-accent)' : 'var(--studio-text-muted)' }}
            >
              <Maximize2 className="w-3 h-3" />
            </button>
            {onChangeFloatingPanels && (
              <button
                type="button"
                onClick={() => handleFloatPanel(panel.id)}
                title="Desacoplar como ventana flotante móvil"
                className="p-1 rounded hover:opacity-80"
                style={{ color: 'var(--studio-text-muted)' }}
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
            {!zone.endsWith('mini') && (
              <button
                type="button"
                onClick={() => {
                  if (onTogglePanelMini) {
                    onTogglePanelMini(panel.id);
                  } else {
                    commitLocalDrop(
                      panel.id,
                      zone === 'left-main' ? 'left-mini' : 'right-mini',
                      99
                    );
                  }
                }}
                title="Minimizar a Minipanel lateral"
                className="p-1 rounded hover:opacity-80"
                style={{ color: 'var(--studio-text-muted)' }}
              >
                <Minimize2 className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => togglePanelVisible(panel.id)}
              title="Ocultar panel (restaurable en menú Interfaz)"
              className="p-1 rounded hover:opacity-80"
              style={{ color: 'var(--studio-text-muted)' }}
            >
              <EyeOff className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => togglePanelExpanded(panel.id)}
              title={panel.expanded ? 'Contraer' : 'Expandir'}
              className="p-1 rounded hover:opacity-80"
              style={{ color: 'var(--studio-text-muted)' }}
            >
              {panel.expanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {panel.expanded && (
          <div
            className={
              isTimelineCard
                ? 'flex-1 min-h-0 flex flex-col overflow-hidden'
                : customH || fillsHorizontalDock
                ? 'flex-1 min-h-0 overflow-y-auto overflow-x-auto'
                : 'min-h-0 overflow-y-auto overflow-x-auto'
            }
          >
            {renderPanelInnerContent(panel, zone)}
          </div>
        )}

        {/* Full 4-Edge & 4-Corner Resize Handles (active for ALL panels without needing uiEditMode) */}
        {renderDockedResizeHandles(panel, zone, isSoleInHorizontalDock)}
      </div>
    );
  };

  const renderZoneOrientationToolbar = (zone: PanelDockZone) => {
    if (!uiEditMode || !onChangeDockOrientation || zone.endsWith('mini')) return null;
    const curOri: DockOrientation =
      dockOrientations[zone] || (zone === 'top' ? 'horizontal' : 'vertical');
    return (
      <div
        className="px-2 py-1 border-b flex items-center justify-between gap-1 text-[9px] font-mono shrink-0"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--studio-accent) 10%, var(--studio-bg-bar))',
          borderColor: 'var(--studio-border)',
        }}
      >
        <span className="uppercase tracking-wider" style={{ color: 'var(--studio-accent)' }}>
          {zone}
        </span>
        <div className="flex items-center gap-0.5">
          {(
            [
              ['vertical', 'V'],
              ['horizontal', 'H'],
              ['mixed', 'M'],
            ] as const
          ).map(([ori, lbl]) => (
            <button
              key={ori}
              type="button"
              onClick={() => onChangeDockOrientation(zone, ori)}
              title={`Orientación ${ori}`}
              className="px-1.5 py-0.5 rounded border font-bold"
              style={{
                backgroundColor: curOri === ori ? 'var(--studio-accent)' : 'var(--studio-bg-card)',
                color: curOri === ori ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                borderColor: 'var(--studio-border-strong)',
              }}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderTabGroupCard = (
    group: DockTabGroupConfig,
    tgPanels: RightPanelConfig[],
    zone: PanelDockZone,
    isSoleInHorizontalDock = false
  ) => {
    const activeTab = tgPanels.find((p) => p.id === group.activePanelId) || tgPanels[0];
    const isMergeTarget = isActivelyDragging && dragState?.mergeTargetId === activeTab.id;
    const isMaximizedDocked = Boolean(maximizedDockedPanels[activeTab.id]);
    const customW = panelWidths[activeTab.id];
    const customH = panelHeights[activeTab.id];
    const fillsHorizontalDock =
      isSoleInHorizontalDock && (zone === 'top' || zone === 'bottom') && activeTab.expanded;
    const isTimelineActive = activeTab.id === 'timeline';

    return (
      <div
        data-dock-card={activeTab.id}
        className={`overflow-hidden flex flex-col relative ${
          fillsHorizontalDock ? 'flex-1 h-full min-h-0' : 'border shadow-sm'
        }`}
        style={{
          backgroundColor: 'var(--studio-bg-card)',
          borderColor: isMergeTarget ? 'var(--studio-accent)' : 'var(--studio-border)',
          borderRadius: fillsHorizontalDock ? 0 : 'var(--studio-radius)',
          ...(fillsHorizontalDock
            ? {
                width: customW ? customW : '100%',
                flex: '1 1 0%',
                height: '100%',
                minHeight: 0,
              }
            : {
                ...(customW ? { width: customW, minWidth: customW, flexShrink: 0 } : {}),
                ...(customH && activeTab.expanded
                  ? { height: customH }
                  : isTimelineActive && activeTab.expanded
                  ? { height: 340, minHeight: 200 }
                  : {}),
              }),
        }}
      >
        {/* Tabbed Group Header Bar (Photoshop / Blender style tabs) */}
        <div
          className="flex items-center justify-between border-b px-1 pt-1 gap-1 shrink-0"
          style={{
            backgroundColor: isMergeTarget
              ? 'color-mix(in srgb, var(--studio-accent) 20%, var(--studio-bg-elevated))'
              : 'var(--studio-bg-elevated)',
            borderColor: 'var(--studio-border)',
          }}
        >
          <div className="flex items-center gap-0.5 overflow-x-auto min-w-0 flex-1">
            {tgPanels.map((tp) => {
              const TpIcon = PANEL_ICONS[tp.id] || Layers;
              const isActiveTab = tp.id === activeTab.id;
              return (
                <button
                  key={tp.id}
                  type="button"
                  onPointerDown={(e) => startPanelDrag(e, tp)}
                  onClick={() => {
                    if (suppressNextClickRef.current) return;
                    handleSetTabGroupActive(group.id, tp.id);
                  }}
                  title={`${tp.title} · Clic para ver pestaña o arrastra para desacoplar`}
                  className={`px-2 py-1.5 rounded-t-md text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors cursor-grab active:cursor-grabbing ${
                    isActiveTab ? 'border-t-2' : 'opacity-65 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: isActiveTab ? 'var(--studio-bg-panel)' : 'transparent',
                    borderColor: isActiveTab ? 'var(--studio-accent)' : 'transparent',
                    color: isActiveTab ? 'var(--studio-text)' : 'var(--studio-text-muted)',
                  }}
                >
                  {collapseDisplayMode !== 'name' && (
                    <TpIcon className="w-3 h-3 shrink-0" style={isActiveTab ? { color: 'var(--studio-accent)' } : undefined} />
                  )}
                  {collapseDisplayMode !== 'icon' && (
                    <span className="truncate max-w-[96px]">{PANEL_SHORT_LABELS[tp.id] || tp.title}</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-0.5 shrink-0 pb-1">
            <button
              type="button"
              onClick={() => handleToggleMaximizeDockedPanel(activeTab, zone)}
              title={isMaximizedDocked ? 'Restaurar tamaño' : 'Maximizar panel'}
              className="p-1 rounded hover:opacity-80"
              style={{ color: isMaximizedDocked ? 'var(--studio-accent)' : 'var(--studio-text-muted)' }}
            >
              <Maximize2 className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => handleFloatPanel(activeTab.id)}
              title="Desacoplar pestaña como ventana flotante"
              className="p-1 rounded hover:opacity-80"
              style={{ color: 'var(--studio-text-muted)' }}
            >
              <ExternalLink className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => handleUngroupTabPanel(group.id, activeTab.id)}
              title="Separar pestaña de grupo"
              className="p-1 rounded hover:opacity-80"
              style={{ color: 'var(--studio-text-muted)' }}
            >
              <Columns className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => togglePanelExpanded(activeTab.id)}
              title={activeTab.expanded ? 'Contraer' : 'Expandir'}
              className="p-1 rounded hover:opacity-80"
              style={{ color: 'var(--studio-text-muted)' }}
            >
              {activeTab.expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
        {activeTab.expanded && (
          <div
            className={
              isTimelineActive
                ? 'flex-1 min-h-0 flex flex-col overflow-hidden'
                : 'flex-1 min-h-0 overflow-y-auto overflow-x-auto'
            }
          >
            {renderPanelInnerContent(activeTab, zone)}
          </div>
        )}
        {renderDockedResizeHandles(activeTab, zone, isSoleInHorizontalDock)}
      </div>
    );
  };

  const renderMainDockColumn = (zone: 'left-main' | 'right-main') => {
    const zonePanels = panelsByZone[zone];
    const isTargeted = isActivelyDragging && dragState?.targetZone === zone && !dragState?.mergeTargetId;
    const isEmpty = zonePanels.length === 0;

    if (!isOpen && !isActivelyDragging && !uiEditMode) return null;
    if (isEmpty && !isActivelyDragging && !uiEditMode) return null;

    // Auto-collapse edge trigger when sidebar auto-hide / hover-reveal is enabled
    const isCollapsedByMode =
      autoCollapseSidebars !== 'pinned' &&
      autoCollapseSidebars !== 'visible' &&
      !isActivelyDragging &&
      !uiEditMode &&
      !isEmpty &&
      hoverRevealedZone !== zone;

    if (isCollapsedByMode) {
      return (
        <div
          onMouseEnter={() => {
            if (autoCollapseSidebars === 'hover_reveal') setHoverRevealedZone(zone);
          }}
          onClick={() => setHoverRevealedZone(zone)}
          title={`Mostrar dock ${zone === 'left-main' ? 'izquierdo' : 'derecho'} (${zonePanels.length} paneles)`}
          className={`w-3.5 h-full shrink-0 flex flex-col items-center justify-center cursor-pointer transition-colors hover:w-5 z-20 ${
            zone === 'left-main' ? 'border-r' : 'border-l'
          }`}
          style={{
            backgroundColor: 'var(--studio-bg-bar)',
            borderColor: 'var(--studio-border-strong)',
            color: 'var(--studio-accent)',
          }}
        >
          <span className="[writing-mode:vertical-rl] text-[9px] font-mono uppercase tracking-widest opacity-80">
            {zonePanels.length} Paneles
          </span>
        </div>
      );
    }

    const borderClass = zone === 'left-main' ? 'border-r' : 'border-l';
    const rawDockWidth = zone === 'left-main' ? leftMainWidth : rightMainWidth;
    const zoneOri: DockOrientation = dockOrientations[zone] || 'vertical';
    const baseWidth =
      zoneOri === 'horizontal'
        ? Math.max(rawDockWidth, 420)
        : compactMode
        ? Math.max(220, Math.round(rawDockWidth * 0.88))
        : rawDockWidth;

    const consumedPanelIds = new Set<RightPanelId>();
    type DockRenderUnit =
      | { kind: 'single'; panel: RightPanelConfig; idx: number }
      | { kind: 'tabgroup'; group: DockTabGroupConfig; panels: RightPanelConfig[]; idx: number };
    const units: DockRenderUnit[] = [];

    zonePanels.forEach((panel, idx) => {
      if (consumedPanelIds.has(panel.id)) return;
      const matchedTg = tabGroups.find(
        (tg) => tg.panelIds.includes(panel.id) && tg.panelIds.filter((pid) => zonePanels.some((zp) => zp.id === pid)).length >= 2
      );
      if (matchedTg) {
        const tgPanels = matchedTg.panelIds
          .map((pid) => zonePanels.find((zp) => zp.id === pid))
          .filter((zp): zp is RightPanelConfig => Boolean(zp));
        tgPanels.forEach((p) => consumedPanelIds.add(p.id));
        units.push({ kind: 'tabgroup', group: matchedTg, panels: tgPanels, idx });
      } else {
        consumedPanelIds.add(panel.id);
        units.push({ kind: 'single', panel, idx });
      }
    });

    const dockSplitter = !isEmpty && (
      <div
        onPointerDown={(e) => {
          e.preventDefault();
          dockResizeStartRef.current = { x: e.clientX, y: e.clientY, size: rawDockWidth };
          setResizingDock(zone);
        }}
        onDoubleClick={() => onResetDockWidths?.()}
        title="Arrastra para redimensionar ancho del panel · Doble clic para restablecer"
        className={`w-1.5 h-full cursor-col-resize shrink-0 flex items-center justify-center transition-colors group z-30 ${
          resizingDock === zone ? 'bg-amber-400/50' : 'hover:bg-amber-400/30'
        }`}
      >
        <div
          className={`w-[2px] h-16 rounded-full transition-all ${
            resizingDock === zone
              ? 'h-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]'
              : 'bg-slate-600/60 group-hover:bg-amber-400 group-hover:h-28'
          }`}
        />
      </div>
    );

    return (
      <div
        className="flex h-full shrink-0"
        onMouseLeave={() => {
          if (autoCollapseSidebars === 'hover_reveal' && hoverRevealedZone === zone && !resizingDock) {
            setHoverRevealedZone(null);
          }
        }}
      >
        {zone === 'right-main' && dockSplitter}
        <aside
          data-dock-zone={zone}
          data-dock-orientation={zoneOri}
          className={`${borderClass} flex flex-col h-full select-none z-20 shrink-0 overflow-y-auto overflow-x-auto transition-colors duration-150`}
          style={{
            width: isEmpty ? 64 : baseWidth,
            backgroundColor: isTargeted
              ? 'color-mix(in srgb, var(--studio-accent) 10%, var(--studio-bg-panel))'
              : 'var(--studio-bg-panel)',
            borderColor: isTargeted || resizingDock === zone ? 'var(--studio-accent)' : 'var(--studio-border)',
            color: 'var(--studio-text)',
            boxShadow: isTargeted
              ? 'inset 0 0 24px color-mix(in srgb, var(--studio-accent) 32%, transparent)'
              : undefined,
          }}
        >
          {renderZoneOrientationToolbar(zone)}
          {isEmpty ? (
            <div className="flex-1 p-1.5 flex flex-col items-center justify-center">
              <div
                className="w-full h-full rounded-xl border-2 border-dashed flex items-center justify-center text-center px-1 text-[10px] font-semibold"
                style={{
                  borderColor: isTargeted ? 'var(--studio-accent)' : 'var(--studio-border-strong)',
                  backgroundColor: isTargeted
                    ? 'color-mix(in srgb, var(--studio-accent) 22%, transparent)'
                    : 'transparent',
                  color: isTargeted ? 'var(--studio-accent)' : 'var(--studio-text-muted)',
                  boxShadow: isTargeted
                    ? '0 0 24px color-mix(in srgb, var(--studio-accent) 55%, transparent)'
                    : undefined,
                }}
              >
                <span className="[writing-mode:vertical-rl] rotate-180 tracking-wider">
                  {zone === 'left-main' ? 'Acoplar Izquierda' : 'Acoplar Derecha'}
                </span>
              </div>
            </div>
          ) : (
            <div
              className={`${
                zoneOri === 'horizontal'
                  ? 'flex flex-row overflow-x-auto items-start'
                  : zoneOri === 'mixed'
                  ? 'flex flex-row flex-wrap items-start'
                  : 'flex flex-col'
              } ${compactMode ? 'gap-1.5 p-1.5' : 'gap-2 p-2.5'}`}
            >
              {units.map((unit) => {
                const showShadowBefore = isTargeted && dragState?.targetIndex === unit.idx;
                if (unit.kind === 'tabgroup') {
                  return (
                    <React.Fragment key={unit.group.id}>
                      {showShadowBefore && renderDropShadowSlot(`Mover "${dragState?.title}" aquí`)}
                      {renderTabGroupCard(unit.group, unit.panels, zone)}
                    </React.Fragment>
                  );
                }
                return (
                  <React.Fragment key={unit.panel.id}>
                    {showShadowBefore && renderDropShadowSlot(`Mover "${dragState?.title}" aquí`)}
                    {renderDockPanelCard(unit.panel, zone)}
                  </React.Fragment>
                );
              })}
              {isTargeted &&
                dragState?.targetIndex === zonePanels.length &&
                renderDropShadowSlot(`Mover "${dragState?.title}" al final`)}
            </div>
          )}
        </aside>
        {zone === 'left-main' && dockSplitter}
      </div>
    );
  };

  const renderHorizontalDockBar = (zone: 'top' | 'bottom') => {
    const zonePanels = panelsByZone[zone];
    const isTargeted = isActivelyDragging && dragState?.targetZone === zone && !dragState?.mergeTargetId;
    const isEmpty = zonePanels.length === 0;

    if (isEmpty && !isActivelyDragging && !uiEditMode) return null;

    const zoneOri: DockOrientation =
      dockOrientations[zone] || (zone === 'top' ? 'horizontal' : 'vertical');
    const barHeight = zone === 'top' ? topDockHeight : bottomDockHeight;
    const maxSafeBarH = getMaxHorizontalDockHeight(zone);
    const effectiveBarHeight = Math.max(128, Math.min(barHeight, maxSafeBarH));

    const consumedPanelIds = new Set<RightPanelId>();
    type DockRenderUnit =
      | { kind: 'single'; panel: RightPanelConfig; idx: number }
      | { kind: 'tabgroup'; group: DockTabGroupConfig; panels: RightPanelConfig[]; idx: number };
    const units: DockRenderUnit[] = [];

    zonePanels.forEach((panel, idx) => {
      if (consumedPanelIds.has(panel.id)) return;
      const matchedTg = tabGroups.find(
        (tg) => tg.panelIds.includes(panel.id) && tg.panelIds.filter((pid) => zonePanels.some((zp) => zp.id === pid)).length >= 2
      );
      if (matchedTg) {
        const tgPanels = matchedTg.panelIds
          .map((pid) => zonePanels.find((zp) => zp.id === pid))
          .filter((zp): zp is RightPanelConfig => Boolean(zp));
        tgPanels.forEach((p) => consumedPanelIds.add(p.id));
        units.push({ kind: 'tabgroup', group: matchedTg, panels: tgPanels, idx });
      } else {
        consumedPanelIds.add(panel.id);
        units.push({ kind: 'single', panel, idx });
      }
    });

    const anyExpandedInZone = units.some((u) =>
      u.kind === 'single' ? u.panel.expanded : u.panels.some((p) => p.expanded)
    );
    const isSoleUnit = units.length === 1;
    const onlyRawTimeline =
      !isEmpty &&
      !uiEditMode &&
      !isActivelyDragging &&
      units.length === 1 &&
      units[0].kind === 'single' &&
      units[0].panel.id === 'timeline' &&
      units[0].panel.expanded &&
      Boolean(renderTimelineSlot);

    const rowSplitter = !isEmpty && anyExpandedInZone && (
      <div
        onPointerDown={(e) => {
          e.preventDefault();
          dockResizeStartRef.current = { x: e.clientX, y: e.clientY, size: effectiveBarHeight };
          setResizingDock(zone);
        }}
        onDoubleClick={() => {
          if (zone === 'top') onResizeTopDock?.(196);
          else onResizeBottomDock?.(236);
        }}
        title={`Arrastra para redimensionar altura de la zona ${zone === 'top' ? 'superior' : 'inferior'} · Doble clic para restablecer`}
        className={`h-1.5 w-full cursor-row-resize shrink-0 flex items-center justify-center transition-colors group z-30 ${
          resizingDock === zone ? 'bg-amber-400/50' : 'hover:bg-amber-400/35'
        }`}
      >
        <div
          className={`h-[2px] w-20 rounded-full transition-all ${
            resizingDock === zone
              ? 'w-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]'
              : 'bg-slate-600/60 group-hover:bg-amber-400 group-hover:w-36'
          }`}
        />
      </div>
    );

    return (
      <div className="flex flex-col shrink-0 w-full z-20">
        {zone === 'bottom' && rowSplitter}
        <section
          data-dock-zone={zone}
          data-dock-orientation={zoneOri}
          className={`w-full shrink-0 flex flex-col transition-colors duration-150 ${
            zone === 'top' ? 'border-b' : 'border-t'
          } ${isEmpty ? 'h-11' : anyExpandedInZone ? (isSoleUnit ? 'overflow-hidden' : 'overflow-auto') : 'overflow-hidden'}`}
          style={{
            height: isEmpty ? undefined : anyExpandedInZone ? effectiveBarHeight : 'auto',
            backgroundColor: isTargeted
              ? 'color-mix(in srgb, var(--studio-accent) 12%, var(--studio-bg-panel))'
              : 'var(--studio-bg-panel)',
            borderColor: isTargeted || resizingDock === zone ? 'var(--studio-accent)' : 'var(--studio-border)',
            boxShadow: isTargeted
              ? 'inset 0 0 24px color-mix(in srgb, var(--studio-accent) 32%, transparent)'
              : undefined,
          }}
        >
          {renderZoneOrientationToolbar(zone)}
          {isEmpty ? (
            <div className="h-full px-3 py-1.5 flex items-center justify-center">
              <div
                className="w-full h-full rounded-lg border-2 border-dashed flex items-center justify-center text-[10px] font-semibold"
                style={{
                  borderColor: isTargeted ? 'var(--studio-accent)' : 'var(--studio-border-strong)',
                  backgroundColor: isTargeted
                    ? 'color-mix(in srgb, var(--studio-accent) 20%, transparent)'
                    : 'transparent',
                  color: isTargeted ? 'var(--studio-accent)' : 'var(--studio-text-muted)',
                }}
              >
                {zone === 'top' ? 'Acoplar Zona Superior (Arriba)' : 'Acoplar Zona Inferior (Abajo)'}
              </div>
            </div>
          ) : onlyRawTimeline ? (
            <div className="flex-1 min-h-0 flex flex-col h-full w-full overflow-hidden">
              {renderTimelineSlot?.(zone)}
            </div>
          ) : (
            <div
              className={`flex-1 min-h-0 ${
                isSoleUnit && anyExpandedInZone
                  ? 'flex flex-col h-full p-0'
                  : zoneOri === 'horizontal'
                  ? 'flex flex-row items-stretch overflow-x-auto'
                  : zoneOri === 'mixed'
                  ? 'flex flex-row flex-wrap items-start'
                  : 'flex flex-col'
              } ${isSoleUnit && anyExpandedInZone ? '' : compactMode ? 'gap-1.5 p-1' : 'gap-2 p-1.5'}`}
            >
              {units.map((unit) => {
                const showShadowBefore = isTargeted && dragState?.targetIndex === unit.idx;
                if (unit.kind === 'tabgroup') {
                  return (
                    <React.Fragment key={unit.group.id}>
                      {showShadowBefore && renderDropShadowSlot(`Mover "${dragState?.title}" aquí`)}
                      {renderTabGroupCard(unit.group, unit.panels, zone, isSoleUnit)}
                    </React.Fragment>
                  );
                }
                return (
                  <React.Fragment key={unit.panel.id}>
                    {showShadowBefore && renderDropShadowSlot(`Mover "${dragState?.title}" aquí`)}
                    {renderDockPanelCard(unit.panel, zone, isSoleUnit)}
                  </React.Fragment>
                );
              })}
              {isTargeted &&
                dragState?.targetIndex === zonePanels.length &&
                renderDropShadowSlot(`Mover "${dragState?.title}" al final`)}
            </div>
          )}
        </section>
        {zone === 'top' && rowSplitter}
      </div>
    );
  };

  const renderMiniDockRail = (zone: 'left-mini' | 'right-mini') => {
    const miniPanels = panelsByZone[zone];
    const isTargeted = isActivelyDragging && dragState?.targetZone === zone;
    const isEmpty = miniPanels.length === 0;

    if (!isOpen && !isActivelyDragging && !uiEditMode) return null;
    if (isEmpty && !isActivelyDragging && !uiEditMode) return null;

    const activeFlyoutPanel = miniPanels.find((p) => p.id === openMiniFlyoutId) || null;
    const isRightSide = zone === 'right-mini';
    const rawMiniWidth = isRightSide ? rightMiniWidth : leftMiniWidth;
    const rawMiniMode = isRightSide ? rightMiniMode : leftMiniMode;
    const effectiveMiniWidth = isEmpty
      ? 48
      : Math.max(44, Math.min(320, rawMiniWidth || (rawMiniMode === 'expanded' ? 176 : 56)));
    const isExpandedRail = effectiveMiniWidth >= 96;
    const isWideRail = effectiveMiniWidth >= 184;
    const isResizingThisMini = resizingDock === zone;
    const flyoutResizeId = isRightSide ? 'mini-flyout-right' : 'mini-flyout-left';
    const isResizingFlyout = resizingDock === flyoutResizeId;

    const handleResetMiniWidth = () => {
      if (isRightSide) onResizeRightMini?.(56);
      else onResizeLeftMini?.(56);
    };

    const miniRailSplitter = !isEmpty && (
      <div
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          dockResizeStartRef.current = { x: e.clientX, y: e.clientY, size: effectiveMiniWidth };
          setResizingDock(zone);
        }}
        onDoubleClick={handleResetMiniWidth}
        title="Arrastra para redimensionar ancho de la barra de minipaneles (44–320 px) · Doble clic para modo compacto"
        className={`w-1.5 h-full cursor-col-resize shrink-0 flex items-center justify-center transition-colors group z-30 ${
          isResizingThisMini ? 'bg-amber-400/50' : 'hover:bg-amber-400/30'
        }`}
      >
        <div
          className={`w-[2px] h-14 rounded-full transition-all ${
            isResizingThisMini
              ? 'h-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]'
              : 'bg-slate-600/50 group-hover:bg-amber-400 group-hover:h-24'
          }`}
        />
      </div>
    );

    return (
      <div className="flex h-full shrink-0 relative z-30">
        {isRightSide && miniRailSplitter}
        <div
          data-dock-zone={zone}
          className={`flex flex-col py-1.5 px-1 gap-1.5 h-full shrink-0 relative select-none transition-colors duration-150 ${
            isRightSide ? 'border-l' : 'border-r'
          }`}
          style={{
            width: effectiveMiniWidth,
            backgroundColor: isTargeted
              ? 'color-mix(in srgb, var(--studio-accent) 20%, var(--studio-bg-bar))'
              : 'var(--studio-bg-bar)',
            borderColor:
              isTargeted || isResizingThisMini ? 'var(--studio-accent)' : 'var(--studio-border)',
            boxShadow: isTargeted
              ? 'inset 0 0 22px color-mix(in srgb, var(--studio-accent) 55%, transparent), 0 0 22px color-mix(in srgb, var(--studio-accent) 45%, transparent)'
              : undefined,
          }}
        >
          {/* Compact / Expanded Mini-Panel Mode Header Control */}
          {!isEmpty && (
            <div
              className={`flex items-center shrink-0 pb-1 border-b ${
                isExpandedRail ? 'justify-between px-1 gap-1' : 'justify-center'
              }`}
              style={{ borderColor: 'var(--studio-border)' }}
            >
              {isExpandedRail && (
                <span
                  className="text-[9px] font-mono uppercase tracking-wider truncate"
                  style={{ color: 'var(--studio-text-muted)' }}
                >
                  Minipaneles ({miniPanels.length})
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  if (onToggleMiniMode) {
                    onToggleMiniMode(zone);
                  } else if (isRightSide) {
                    onResizeRightMini?.(isExpandedRail ? 56 : 176);
                  } else {
                    onResizeLeftMini?.(isExpandedRail ? 56 : 176);
                  }
                }}
                title={
                  isExpandedRail
                    ? 'Cambiar minipaneles a Modo Compacto (iconos)'
                    : 'Expandir minipaneles a Modo Expandido (títulos completos)'
                }
                className="p-1 rounded border flex items-center justify-center transition-colors hover:opacity-90 cursor-pointer shrink-0"
                style={{
                  backgroundColor: 'var(--studio-bg-card)',
                  borderColor: 'var(--studio-border)',
                  color: 'var(--studio-text-muted)',
                }}
              >
                {isRightSide ? (
                  isExpandedRail ? (
                    <ChevronsRight className="w-3 h-3" />
                  ) : (
                    <ChevronsLeft className="w-3 h-3" />
                  )
                ) : isExpandedRail ? (
                  <ChevronsLeft className="w-3 h-3" />
                ) : (
                  <ChevronsRight className="w-3 h-3" />
                )}
              </button>
            </div>
          )}

          {isEmpty ? (
            <div
              className="flex-1 w-full rounded-lg border-2 border-dashed flex items-center justify-center text-[9px] font-semibold text-center"
              style={{
                borderColor: isTargeted ? 'var(--studio-accent)' : 'var(--studio-border-strong)',
                color: isTargeted ? 'var(--studio-accent)' : 'var(--studio-text-muted)',
              }}
            >
              <span className="[writing-mode:vertical-rl] rotate-180">Minipanel</span>
            </div>
          ) : (
            <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-auto flex flex-col items-stretch gap-1.5 pr-0.5">
              {miniPanels.map((panel) => {
                const Icon = PANEL_ICONS[panel.id] || Layers;
                const isActiveFlyout = openMiniFlyoutId === panel.id;
                const isBeingDragged = isActivelyDragging && dragState?.panelId === panel.id;
                const shortLabel = PANEL_SHORT_LABELS[panel.id] || panel.title;

                return (
                  <div
                    key={panel.id}
                    className={`w-full shrink-0 flex items-center gap-0.5 ${
                      isExpandedRail ? 'min-w-max' : ''
                    }`}
                  >
                    <button
                      type="button"
                      data-mini-trigger="true"
                      data-dock-card={panel.id}
                      data-panel-id={panel.id}
                      data-help-id={`panel.${panel.id}`}
                      onPointerDown={(e) => startPanelDrag(e, panel)}
                      onClick={() => {
                        if (suppressNextClickRef.current) return;
                        setOpenMiniFlyoutId((prev) => (prev === panel.id ? null : panel.id));
                      }}
                      title={`${panel.title} · Clic para abrir o arrastra a cualquier costado`}
                      className={`studio-btn-shape studio-icon-scalable flex-1 rounded-lg border flex transition-all cursor-grab active:cursor-grabbing ${
                        isExpandedRail
                          ? 'flex-row items-center justify-start px-2 py-1.5 gap-2 text-left'
                          : 'flex-col items-center justify-center py-2 px-1 gap-1'
                      } ${isBeingDragged ? 'opacity-35' : 'opacity-100'}`}
                      style={{
                        backgroundColor: isActiveFlyout
                          ? 'color-mix(in srgb, var(--studio-accent) 20%, var(--studio-bg-card))'
                          : 'var(--studio-bg-card)',
                        borderColor: isActiveFlyout ? 'var(--studio-accent)' : 'var(--studio-border)',
                        color: isActiveFlyout ? 'var(--studio-accent)' : 'var(--studio-text-muted)',
                      }}
                    >
                      {(isExpandedRail || collapseDisplayMode !== 'name') && (
                        <Icon className="w-4 h-4 shrink-0" />
                      )}
                      {isExpandedRail ? (
                        <span className="text-[11px] font-semibold leading-tight whitespace-nowrap">
                          {panel.title}
                        </span>
                      ) : (
                        collapseDisplayMode !== 'icon' && (
                          <span className="text-[9px] font-semibold leading-none truncate max-w-full">
                            {shortLabel}
                          </span>
                        )
                      )}
                    </button>

                    {isWideRail && (
                      <button
                        type="button"
                        onClick={() => {
                          commitLocalDrop(
                            panel.id,
                            isRightSide ? 'right-main' : 'left-main',
                            0
                          );
                          if (openMiniFlyoutId === panel.id) setOpenMiniFlyoutId(null);
                        }}
                        title="Expandir y fijar como panel principal"
                        className="p-1.5 rounded-lg border shrink-0 hover:opacity-90 cursor-pointer"
                        style={{
                          backgroundColor: 'var(--studio-bg-card)',
                          borderColor: 'var(--studio-border)',
                          color: 'var(--studio-text-muted)',
                        }}
                      >
                        <Maximize2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}

              {isTargeted && (
                <div
                  className="w-full py-2 rounded-lg border-2 border-dashed text-[9px] font-bold text-center shrink-0"
                  style={{
                    borderColor: 'var(--studio-accent)',
                    color: 'var(--studio-accent)',
                    backgroundColor: 'color-mix(in srgb, var(--studio-accent) 20%, transparent)',
                  }}
                >
                  + Mini
                </div>
              )}
            </div>
          )}

          {/* Photoshop-style Horizontally-Resizable Floating Flyout Drawer adjacent to Mini-Panel Rail */}
          {activeFlyoutPanel && !isActivelyDragging && (
            <div
              data-mini-flyout="true"
              className={`absolute top-2 ${
                isRightSide ? 'right-full mr-1.5' : 'left-full ml-1.5'
              } max-h-[calc(100%-16px)] flex flex-col border shadow-2xl overflow-hidden z-[70]`}
              style={{
                width: Math.max(220, Math.min(600, miniFlyoutWidth)),
                backgroundColor: 'var(--studio-bg-panel)',
                borderColor: isResizingFlyout ? 'var(--studio-accent)' : 'var(--studio-border-strong)',
                borderRadius: 'var(--studio-radius)',
                color: 'var(--studio-text)',
              }}
            >
              {/* Draggable Flyout Header */}
              <div
                onPointerDown={(e) => startPanelDrag(e, activeFlyoutPanel)}
                title="Arrastra este título para acoplar como panel completo en cualquier costado"
                className="px-3 py-2 border-b flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing shrink-0 select-none"
                style={{
                  backgroundColor: 'var(--studio-bg-elevated)',
                  borderColor: 'var(--studio-border)',
                }}
              >
                {renderPanelHeaderTitle(activeFlyoutPanel)}

                <div
                  className="flex items-center gap-1 shrink-0"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      commitLocalDrop(
                        activeFlyoutPanel.id,
                        isRightSide ? 'right-main' : 'left-main',
                        0
                      );
                      setOpenMiniFlyoutId(null);
                    }}
                    title="Expandir y fijar como panel principal"
                    className="p-1 rounded hover:opacity-80"
                    style={{ color: 'var(--studio-accent)' }}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenMiniFlyoutId(null)}
                    title="Contraer minipanel"
                    className="p-1 rounded hover:opacity-80"
                    style={{ color: 'var(--studio-text-muted)' }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Smart Vertical & Horizontal Scroll Content Container */}
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
                {renderPanelInnerContent(activeFlyoutPanel, zone)}
              </div>

              {/* Outer Edge Horizontal Resize Handle for Opened Mini-Panel Flyout */}
              <div
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dockResizeStartRef.current = {
                    x: e.clientX,
                    y: e.clientY,
                    size: Math.max(220, Math.min(600, miniFlyoutWidth)),
                  };
                  setResizingDock(flyoutResizeId);
                }}
                onDoubleClick={() => onResizeMiniFlyout?.(320)}
                title="Arrastra para ajustar ancho del minipanel (220–600 px) · Doble clic para restablecer"
                className={`absolute top-0 bottom-0 ${
                  isRightSide ? 'left-0' : 'right-0'
                } w-1.5 cursor-col-resize z-30 transition-colors ${
                  isResizingFlyout ? 'bg-amber-400/65' : 'hover:bg-amber-400/35'
                }`}
              />
            </div>
          )}
        </div>
        {!isRightSide && miniRailSplitter}
      </div>
    );
  };

  return (
    <div ref={workspaceRef} className="flex flex-col flex-1 overflow-hidden relative min-h-0">
      {/* UI Free Edit Mode Top Banner */}
      {uiEditMode && (
        <div
          className="px-3 py-1 border-b flex flex-wrap items-center justify-between gap-2 text-[11px] shrink-0 z-40"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--studio-accent) 16%, var(--studio-bg-bar))',
            borderColor: 'var(--studio-accent)',
            color: 'var(--studio-text)',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Unlock className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--studio-accent)' }} />
            <span className="font-bold truncate">
              Modo Edición Libre Activo · Arrastra Barra Superior, Herramientas o paneles a las 6 zonas, pestañas o flotantes · También puedes reordenar iconos de herramientas
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {totalFreedomMode && onToggleTotalFreedomMode && (
              <button
                type="button"
                onClick={onToggleTotalFreedomMode}
                title="Devuelve la Barra Superior y la Barra de Herramientas a sus posiciones fijas exteriores"
                className="px-2 py-0.5 rounded border text-[10px] font-bold flex items-center gap-1 hover:opacity-90"
                style={{
                  backgroundColor: 'var(--studio-bg-card)',
                  color: 'var(--studio-text)',
                  borderColor: 'var(--studio-border-strong)',
                }}
              >
                <RotateCcw className="w-3 h-3" />
                <span>Fijar barras en bordes</span>
              </button>
            )}
            {onToggleUiEditMode && (
              <button
                type="button"
                onClick={onToggleUiEditMode}
                className="px-2.5 py-0.5 rounded font-bold text-[10px]"
                style={{
                  backgroundColor: 'var(--studio-accent)',
                  color: 'var(--studio-accent-text)',
                }}
              >
                Finalizar Edición Libre (Ctrl+Alt+Shift+D)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Horizontal Dock Zone (Arriba) */}
      {renderHorizontalDockBar('top')}

      {/* Middle Columns: Left Toolbar + Left Docks + Center Canvas + Right Docks + Right Toolbar */}
      <div className="flex flex-1 overflow-hidden relative min-h-0">
        {!toolbarUseModularSlot && toolbarPanel?.visible !== false && leftToolbar}
        {renderMainDockColumn('left-main')}
        {renderMiniDockRail('left-mini')}

        <div className="flex-1 flex flex-col min-w-0 min-h-0 relative overflow-hidden">
          {centerCanvas}
          {isActivelyDragging && (
            <div
              data-float-canvas-drop="true"
              className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl border-2 border-dashed text-xs font-bold flex items-center gap-2 z-50 transition-all shadow-xl"
              style={{
                backgroundColor:
                  dragState?.targetZone === 'float-canvas'
                    ? 'color-mix(in srgb, var(--studio-accent) 28%, var(--studio-bg-panel))'
                    : 'color-mix(in srgb, var(--studio-bg-panel) 88%, transparent)',
                borderColor: 'var(--studio-accent)',
                color: 'var(--studio-accent)',
                boxShadow:
                  dragState?.targetZone === 'float-canvas'
                    ? '0 0 24px color-mix(in srgb, var(--studio-accent) 55%, transparent)'
                    : undefined,
              }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Soltar aquí para convertir en Ventana Flotante</span>
            </div>
          )}
        </div>

        {renderMiniDockRail('right-mini')}
        {renderMainDockColumn('right-main')}
        {!toolbarUseModularSlot && toolbarPanel?.visible !== false && rightToolbar}
      </div>

      {/* Bottom Horizontal Dock Zone (Abajo) */}
      {renderHorizontalDockBar('bottom')}

      {/* Live 2D Panel Resize Dimensions HUD */}
      {panelResizeState && (
        <div
          className="fixed pointer-events-none z-[95] px-2.5 py-1 rounded-lg border font-mono text-[11px] font-bold shadow-xl tabular-nums"
          style={{
            left: Math.max(8, Math.min(window.innerWidth - 132, panelResizeState.pointerX + 14)),
            top: Math.max(8, Math.min(window.innerHeight - 36, panelResizeState.pointerY + 14)),
            backgroundColor: 'var(--studio-bg-elevated)',
            borderColor: 'var(--studio-accent)',
            color: 'var(--studio-accent)',
          }}
        >
          {panelResizeState.curW} × {panelResizeState.curH} px
        </div>
      )}

      {/* Live Mini-Panel / Flyout Width Resize HUD */}
      {dockResizeHud && (
        <div
          className="fixed pointer-events-none z-[95] px-2.5 py-1 rounded-lg border font-mono text-[11px] font-bold shadow-xl tabular-nums"
          style={{
            left: Math.min(window.innerWidth - 160, dockResizeHud.pointerX + 14),
            top: dockResizeHud.pointerY + 14,
            backgroundColor: 'var(--studio-bg-elevated)',
            borderColor: 'var(--studio-accent)',
            color: 'var(--studio-accent)',
          }}
        >
          {dockResizeHud.label}
        </div>
      )}

      {/* Floating Cursor Ghost while dragging panel title */}
      {dragState?.isDragging && (
        <div
          className="fixed pointer-events-none z-[90] px-3 py-2 rounded-xl border-2 shadow-2xl flex items-center gap-2 backdrop-blur-md"
          style={{
            left: dragState.pointerX + 14,
            top: dragState.pointerY + 12,
            backgroundColor: 'color-mix(in srgb, var(--studio-bg-elevated) 92%, transparent)',
            borderColor: dragState.targetZone ? 'var(--studio-accent)' : 'var(--studio-border-strong)',
            color: 'var(--studio-text)',
            boxShadow: dragState.targetZone
              ? '0 10px 30px color-mix(in srgb, var(--studio-accent) 45%, transparent)'
              : '0 10px 25px rgba(0,0,0,0.55)',
          }}
        >
          <GripVertical className="w-3.5 h-3.5 opacity-70" style={{ color: 'var(--studio-accent)' }} />
          <div className="flex flex-col">
            <span className="text-xs font-bold leading-tight">{dragState.title}</span>
            <span className="text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>
              {dragState.targetZone === 'float-canvas'
                ? 'Suelta para abrir como Ventana Flotante'
                : dragState.mergeTargetId
                ? 'Suelta para agrupar en pestañas'
                : dragState.targetZone
                ? dragState.targetZone.endsWith('mini')
                  ? 'Suelta para fijar como Minipanel'
                  : dragState.targetZone === 'top' || dragState.targetZone === 'bottom'
                  ? `Suelta para acoplar ${dragState.targetZone === 'top' ? 'arriba' : 'abajo'}`
                  : 'Suelta para acoplar aquí'
                : 'Arrastra sobre una de las 6 zonas, otro panel o al centro'}
            </span>
          </div>
        </div>
      )}

      {/* Floating Detachable Movable/Resizable/Pinnable Windows */}
      {Object.values(floatingPanels)
        .filter((fp) => fp.isFloating)
        .map((fp) => {
          const panel = panelOrder.find((p) => p.id === fp.panelId);
          if (!panel || !panel.visible) return null;
          const isTop = topFloatingId === fp.panelId;
          return (
            <div
              key={`float-${fp.panelId}`}
              onPointerDown={() => setTopFloatingId(fp.panelId)}
              className="fixed border shadow-2xl flex flex-col overflow-hidden backdrop-blur-md"
              style={{
                left: fp.maximized ? 32 : fp.x,
                top: fp.maximized ? 52 : fp.y,
                width: fp.maximized ? 'calc(100vw - 64px)' : fp.width,
                height: fp.minimized ? 'auto' : fp.maximized ? 'calc(100vh - 104px)' : fp.height,
                zIndex: isTop ? 65 : 58,
                backgroundColor: 'var(--studio-bg-panel)',
                borderColor: isTop ? 'var(--studio-accent)' : 'var(--studio-border-strong)',
                borderRadius: 'var(--studio-radius)',
                color: 'var(--studio-text)',
              }}
            >
              {/* Draggable Floating Window Header */}
              <div
                onPointerDown={(e) => {
                  if (e.button !== 0 || fp.maximized) return;
                  e.stopPropagation();
                  floatingActionRef.current = {
                    kind: 'move',
                    id: fp.panelId,
                    startX: e.clientX,
                    startY: e.clientY,
                    origX: fp.x,
                    origY: fp.y,
                  };
                }}
                className="px-2.5 py-1.5 border-b flex items-center justify-between gap-2 cursor-move select-none shrink-0"
                style={{
                  backgroundColor: 'var(--studio-bg-elevated)',
                  borderColor: 'var(--studio-border)',
                }}
              >
                {renderPanelHeaderTitle(panel)}
                <div
                  className="flex items-center gap-0.5 shrink-0"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() =>
                      onChangeFloatingPanels?.({
                        ...floatingPanels,
                        [fp.panelId]: { ...fp, pinned: !fp.pinned },
                      })
                    }
                    title={fp.pinned ? 'Desfijar siempre visible' : 'Fijar siempre visible'}
                    className="p-1 rounded hover:opacity-80"
                    style={{ color: fp.pinned ? 'var(--studio-accent)' : 'var(--studio-text-muted)' }}
                  >
                    {fp.pinned ? <Pin className="w-3 h-3" /> : <PinOff className="w-3 h-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeFloatingPanels?.({
                        ...floatingPanels,
                        [fp.panelId]: { ...fp, minimized: !fp.minimized },
                      })
                    }
                    title={fp.minimized ? 'Restaurar' : 'Minimizar'}
                    className="p-1 rounded hover:opacity-80"
                    style={{ color: 'var(--studio-text-muted)' }}
                  >
                    <Minimize2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeFloatingPanels?.({
                        ...floatingPanels,
                        [fp.panelId]: { ...fp, maximized: !fp.maximized, minimized: false },
                      })
                    }
                    title={fp.maximized ? 'Restaurar tamaño' : 'Maximizar'}
                    className="p-1 rounded hover:opacity-80"
                    style={{ color: 'var(--studio-text-muted)' }}
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFloatPanel(fp.panelId)}
                    title="Re-acoplar al Dock"
                    className="p-1 rounded hover:opacity-80"
                    style={{ color: 'var(--studio-accent)' }}
                  >
                    <ArrowDownToLine className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {!fp.minimized && (
                <div
                  className={
                    panel.id === 'timeline'
                      ? 'flex-1 min-h-0 flex flex-col overflow-hidden relative'
                      : 'flex-1 min-h-0 overflow-y-auto overflow-x-auto relative'
                  }
                >
                  {renderPanelInnerContent(panel, 'floating')}
                </div>
              )}

              {/* Full 4-Edge & 4-Corner Resize Handles for Floating Window */}
              {!fp.minimized && !fp.maximized && (() => {
                const startFloatResize = (edge: ResizeEdge) => (e: React.PointerEvent<HTMLDivElement>) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTopFloatingId(fp.panelId);
                  floatingActionRef.current = {
                    kind: 'resize',
                    id: fp.panelId,
                    edge,
                    startX: e.clientX,
                    startY: e.clientY,
                    origX: fp.x,
                    origY: fp.y,
                    origW: fp.width,
                    origH: fp.height,
                  };
                };
                return (
                  <>
                    <div
                      onPointerDown={startFloatResize('n')}
                      title="Redimensionar borde superior"
                      className="absolute top-0 left-3 right-3 h-1.5 cursor-ns-resize hover:bg-amber-400/45 z-20"
                    />
                    <div
                      onPointerDown={startFloatResize('s')}
                      title="Redimensionar borde inferior"
                      className="absolute bottom-0 left-3 right-3 h-1.5 cursor-ns-resize hover:bg-amber-400/45 z-20"
                    />
                    <div
                      onPointerDown={startFloatResize('w')}
                      title="Redimensionar borde izquierdo"
                      className="absolute top-3 bottom-3 left-0 w-1.5 cursor-ew-resize hover:bg-amber-400/45 z-20"
                    />
                    <div
                      onPointerDown={startFloatResize('e')}
                      title="Redimensionar borde derecho"
                      className="absolute top-3 bottom-3 right-0 w-1.5 cursor-ew-resize hover:bg-amber-400/45 z-20"
                    />
                    <div
                      onPointerDown={startFloatResize('nw')}
                      title="Redimensionar esquina superior izquierda"
                      className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize hover:bg-amber-400/50 z-30"
                    />
                    <div
                      onPointerDown={startFloatResize('ne')}
                      title="Redimensionar esquina superior derecha"
                      className="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize hover:bg-amber-400/50 z-30"
                    />
                    <div
                      onPointerDown={startFloatResize('sw')}
                      title="Redimensionar esquina inferior izquierda"
                      className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize hover:bg-amber-400/50 z-30"
                    />
                    <div
                      onPointerDown={startFloatResize('se')}
                      title="Arrastra para redimensionar ventana flotante"
                      className="absolute bottom-0 right-0 w-3.5 h-3.5 cursor-nwse-resize opacity-65 hover:opacity-100 z-30"
                      style={{
                        background:
                          'linear-gradient(135deg, transparent 50%, var(--studio-accent) 50%)',
                      }}
                    />
                  </>
                );
              })()}
            </div>
          );
        })}

      {/* Delete Group Modal on Global Top UI Layer (Critical Dialog) */}
      <StudioTopLayerPortal
        isOpen={deletingGroup !== null}
        tier="critical"
        autoFocus
        ariaRole="alertdialog"
      >
        <DeleteGroupModal
          isOpen={deletingGroup !== null}
          group={deletingGroup}
          layerCount={deletingGroup ? layers.filter((l) => l.groupId === deletingGroup.id).length : 0}
          onClose={() => setDeletingGroup(null)}
          onUngroupOnly={() => {
            if (deletingGroup) {
              onDeleteLayerGroup(deletingGroup.id, false);
              setDeletingGroup(null);
            }
          }}
          onDeleteGroupAndContent={() => {
            if (deletingGroup) {
              onDeleteLayerGroup(deletingGroup.id, true);
              setDeletingGroup(null);
            }
          }}
        />
      </StudioTopLayerPortal>
    </div>
  );
};
