export type ToolType = 
  | 'pencil' 
  | 'eraser' 
  | 'bucket' 
  | 'eyedropper' 
  | 'line' 
  | 'vector_select'
  | 'direct_select'
  | 'rectangle' 
  | 'circle'
  | 'text'
  | 'dither' 
  | 'select' 
  | 'lasso'
  | 'magic_wand'
  | 'move'
  | 'canvas_edit'
  | 'smear'
  | 'hitbox'
  | 'hand'
  | 'zoom'
  | 'shading'
  | 'tile';

export type CanvasEditAnchor =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export type CanvasEditOverflowMode = 'keep' | 'crop' | 'auto_expand';

export interface CanvasEditRect {
  /** Left offset in original canvas pixel coordinates (negative = expand left) */
  left: number;
  /** Top offset in original canvas pixel coordinates (negative = expand top) */
  top: number;
  /** Proposed canvas width in pixels (>= 1) */
  width: number;
  /** Proposed canvas height in pixels (>= 1) */
  height: number;
}

export interface CanvasEditConfig {
  anchor: CanvasEditAnchor;
  overflowMode: CanvasEditOverflowMode;
  snapToGrid: boolean;
  snapGridStep: number;
  snapToPixels: boolean;
  lockAspectRatio: boolean;
  symmetricGrowth: boolean;
  spritesheetMode: boolean;
  cellWidth: number;
  cellHeight: number;
}

export type MoveSubTool =
  | 'move_object'
  | 'move_layer'
  | 'move_selection'
  | 'move_reference'
  | 'direct_select';

export type SelectionSubTool =
  | 'general'
  | 'objects'
  | 'layers'
  | 'references'
  | 'vectors'
  | 'nodes';

export type LassoMode = 'free' | 'polygon' | 'magnetic';

export type BucketSubTool = 'solid' | 'gradient' | 'dither_gradient';

export type GradientType = 'linear' | 'radial' | 'angular' | 'reflected' | 'diamond';

export type GradientDitherAlgorithm = 'bayer' | 'ordered' | 'custom' | 'noise';

export type GradientPaletteMode = 'primary_secondary' | 'active_palette' | 'monochrome';

export interface GradientConfig {
  type: GradientType;
  ditherAlgorithm: GradientDitherAlgorithm;
  intensity: number; // 0..100
  scale: number; // 1..8
  contrast: number; // 0..100
  paletteMode: GradientPaletteMode;
  reverse: boolean;
  opacity: number; // 0.05..1
}

export type ShapeToolKind = 'rectangle' | 'ellipse' | 'polygon' | 'star' | 'arrow' | 'custom';

export type CustomShapePresetId =
  | 'heart'
  | 'shield'
  | 'bolt'
  | 'cloud'
  | 'speech'
  | 'cross'
  | 'diamond'
  | 'capsule';

export type EllipseArcType = 'full' | 'pie' | 'chord' | 'open';

export type ArrowHeadType = 'triangle' | 'stealth' | 'diamond' | 'double' | 'open';

export type ShapeRasterConfirmMode = 'keep_editable' | 'rasterize' | 'ask';

export type ShapeFillMode = 'none' | 'solid' | 'pattern' | 'dither' | 'gradient';

export type ShapePatternType = 'checker' | 'dots' | 'hlines' | 'vlines' | 'diagonal' | 'bricks';

export interface ShapeToolConfig {
  shapeKind: ShapeToolKind;
  roundedCorners: boolean;
  cornerRadius: number; // 0..24
  independentCorners?: boolean;
  cornerRadii?: [number, number, number, number]; // TL, TR, BR, BL
  bevel: number; // 0..12
  filled: boolean;
  fillMode: ShapeFillMode;
  strokeEnabled: boolean;
  strokeWidth: number; // 1..8
  innerStroke: boolean;
  innerStrokeWidth: number; // 1..4
  outerStroke: boolean;
  outerStrokeWidth: number; // 1..4
  antiAlias: boolean;
  pixelPerfect: boolean;
  pattern: ShapePatternType;
  useDither: boolean;
  useGradient: boolean;
  opacity?: number; // 0.05..1
  // Ellipse arc controls
  arcStartDeg?: number; // 0..360
  arcSweepPct?: number; // 5..100
  arcType?: EllipseArcType;
  // Polygon controls
  sides?: number; // 3..24
  innerRadiusRatio?: number; // 0.15..1
  vertexRoundness?: number; // 0..1
  // Star controls
  starPoints?: number; // 3..24
  starDepth?: number; // 0.15..0.95
  starSymmetry?: number; // -0.5..0.5
  // Arrow controls
  arrowShaftWidth?: number; // 0.1..0.9
  arrowHeadSize?: number; // 0.15..0.85
  arrowHeadType?: ArrowHeadType;
  arrowCurvature?: number; // -1..1
  // Custom preset
  customPreset?: CustomShapePresetId;
  // Parametric rasterization policy
  rasterPolicy?: ShapeRasterConfirmMode;
}

export interface ParametricShapeObject {
  id: string;
  name: string;
  kind: ShapeToolKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // degrees
  skewX: number; // degrees -60..60
  skewY: number; // degrees -60..60
  pivotX: number; // normalized 0..1
  pivotY: number; // normalized 0..1
  cornerOffsets?: [
    { dx: number; dy: number },
    { dx: number; dy: number },
    { dx: number; dy: number },
    { dx: number; dy: number }
  ];
  // Rectangle
  cornerRadius: number;
  independentCorners: boolean;
  cornerRadii: [number, number, number, number];
  bevel: number;
  // Ellipse
  arcStartDeg: number;
  arcSweepPct: number;
  arcType: EllipseArcType;
  // Polygon
  sides: number;
  innerRadiusRatio: number;
  vertexRoundness: number;
  // Star
  starPoints: number;
  starDepth: number;
  starSymmetry: number;
  // Arrow
  arrowShaftWidth: number;
  arrowHeadSize: number;
  arrowHeadType: ArrowHeadType;
  arrowCurvature: number;
  // Custom
  customPreset: CustomShapePresetId;
  // Styling
  fillColor: string;
  secondaryColor: string;
  strokeColor: string;
  filled: boolean;
  fillMode: ShapeFillMode;
  strokeEnabled: boolean;
  strokeWidth: number;
  innerStroke: boolean;
  innerStrokeWidth: number;
  outerStroke: boolean;
  outerStrokeWidth: number;
  opacity: number;
  antiAlias: boolean;
  pixelPerfect: boolean;
  pattern: ShapePatternType;
  useDither: boolean;
  useGradient: boolean;
  gradientType?: GradientType;
}

export type PencilBrushSubMode = 'pencil' | 'brush';

export interface EraserToolOptions {
  hardness: number; // 0..100
  opacity: number; // 0.05..1
  flow: number; // 0.05..1
  antiAlias: boolean;
  pixelPerfect: boolean;
  shape: BrushShape;
}

export interface BucketToolOptions {
  tolerance: number; // 0..255
  contiguous: boolean;
  allLayers: boolean;
  ignoreTransparency: boolean;
  expandPx: number; // 0..4
  globalFill: boolean;
}

export interface MagicWandOptions {
  tolerance: number; // 0..255
  contiguous: boolean;
  allLayers: boolean;
  continuousSelection: boolean;
  smooth: boolean;
}

export type SelectionBooleanMode = 'replace' | 'add' | 'subtract' | 'intersect';

export interface SelectionToolOptions {
  opMode: SelectionBooleanMode;
  fixedRatio: boolean;
  ratioW: number;
  ratioH: number;
  roundedCorners: boolean;
  cornerRadius: number;
  perfectCircle: boolean;
  smooth: boolean;
}

export interface MoveToolOptions {
  autoSelect: boolean;
  showControls: boolean;
  snapToGrid: boolean;
  snapToGuides: boolean;
}

export type OptionsBarDisplayMode = 'icon_text' | 'icon_only' | 'text_only';

export interface OptionsBarState {
  visible: boolean;
  displayMode: OptionsBarDisplayMode;
  collapsed: boolean;
  floating: boolean;
  floatX: number;
  floatY: number;
  floatWidth: number;
}

export interface ActiveFilterBarSession {
  filterId: string;
  name: string;
  intensity: number; // 0..100
  previewEnabled: boolean;
  beforeAfterSplit: boolean;
  splitPct: number; // 10..90
}

export type QuickAiStyleId = 'retro_16bit' | 'arcade_cps2' | 'cyberpunk' | 'anime_cel' | 'dark_fantasy';

export interface QuickAiBarOptions {
  prompt: string;
  intensity: number; // 10..100
  style: QuickAiStyleId;
  useReference: boolean;
  adaptToCanvas: boolean;
  variations: number; // 1..4
}

export type SelectionDisplayMode = 'marching_ants' | 'fill_only' | 'both' | 'outline_only';

export interface SelectionDisplayConfig {
  mode: SelectionDisplayMode;
  animationSpeed: number; // 0..100 (0 = static)
  borderColor: string;
  opacity: number; // 0.05..1
  thickness: number; // 1..4
}

export type ZoomToolMode = 'in' | 'out' | 'region';

export interface ZoomCommand {
  type: 'in' | 'out' | 'fit' | 'percent';
  percent?: number;
  nonce: number;
}

export type HitboxType =
  | 'hurtbox'
  | 'hitbox'
  | 'pushbox'
  | 'throwbox'
  | 'counterbox'
  | 'clashbox'
  | 'armorbox';

export type StageType = 'checkerboard' | 'training_grid' | 'dojo' | 'cyberpunk' | 'dark_arena';

export interface Hitbox {
  id: string;
  type: HitboxType;
  x: number;
  y: number;
  w: number;
  h: number;
  name?: string;
}

export interface LayerGroup {
  id: string;
  name: string; // Movement / Action / Folder name
  color: string;
  category?: 'Idle' | 'Movement' | 'Normal' | 'Special' | 'Reaction' | 'VFX';
  frameIndices: number[];
  parentGroupId?: string | null; // Nested folder support
  collapsed?: boolean;
  visible?: boolean;
  locked?: boolean;
  opacity?: number; // Group opacity multiplier (0..1)
  blendMode?: LayerBlendMode;
  playbackMode?: 'loop' | 'pingpong' | 'once';
  fps?: number;
}

export interface LayerAdjustmentConfig {
  hue: number; // -180 to 180
  saturation: number; // -100 to 100
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  posterize: number; // 0 (off) or 2..16 levels
  invert: boolean;
  grayscale: boolean;
  sepia: boolean;
  tintColor: string;
  tintAmount: number; // 0 to 100
}

export type LayerType =
  | 'raster'
  | 'empty'
  | 'reference'
  | 'text'
  | 'vector'
  | 'adjustment'
  | 'smart'
  | 'ai'
  | 'animation'
  | 'temp';

export type LayerBlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'soft-light'
  | 'hard-light'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export type LayerMaskType = 'layer' | 'vector' | 'selection';

export interface LayerMask {
  type: LayerMaskType;
  pixels: number[][]; // 0..255 alpha mask per canvas pixel (255 = revealed, 0 = hidden)
  disabled?: boolean;
  inverted?: boolean;
  linked?: boolean;
  quickPreview?: boolean;
}

export type KeyframeEasing = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'hold';

export interface LayerKeyframe {
  frameIndex: number;
  offsetX: number;
  offsetY: number;
  scale: number; // 0.25 .. 3.0
  opacity: number; // 0 .. 1
  easing: KeyframeEasing;
  note?: string;
}

export type TransformMode =
  | 'free'
  | 'scale'
  | 'rotate'
  | 'skew'
  | 'distort'
  | 'perspective'
  | 'warp';

export type TransformInterpolation = 'nearest' | 'bilinear' | 'bicubic' | 'auto';

export type TransformPivotPreset =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'custom';

export type TransformTargetScope = 'active_layer' | 'selected_layers' | 'group' | 'selection';
export type TransformFrameScope = 'current_frame' | 'selected_frames' | 'all_frames';

export interface TransformPoint {
  x: number;
  y: number;
}

export interface TransformSnapConfig {
  grid: boolean;
  pixel: boolean;
  guides: boolean;
  edges: boolean;
  objects: boolean;
}

export interface TransformParameters {
  mode: TransformMode;
  x: number;
  y: number;
  width: number;
  height: number;
  baseWidth: number;
  baseHeight: number;
  baseX: number;
  baseY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  skewX: number;
  skewY: number;
  pivotPreset: TransformPivotPreset;
  pivotX: number;
  pivotY: number;
  interpolation: TransformInterpolation;
  pixelPerfect: boolean;
  integerScale: boolean;
  pixelPerfectRotate: boolean;
  snapToGrid: boolean;
  antiAlias: boolean;
  nonDestructive: boolean;
  targetScope: TransformTargetScope;
  frameScope: TransformFrameScope;
  corners: [TransformPoint, TransformPoint, TransformPoint, TransformPoint];
  warpBulge: number;
  warpBendX: number;
  warpBendY: number;
  tileWrap: boolean;
  spritesheetStepX?: number;
  spritesheetStepY?: number;
  symmetryMode: 'none' | 'horizontal' | 'vertical' | 'radial';
}

export type TransformActionId =
  | 'free'
  | 'scale'
  | 'rotate'
  | 'skew'
  | 'distort'
  | 'perspective'
  | 'warp'
  | 'flip_h'
  | 'flip_v'
  | 'rot_90_ccw'
  | 'rot_90_cw'
  | 'rot_180'
  | 'snap_grid'
  | 'center_canvas'
  | 'reset'
  | 'scale_2x_hq'
  | 'scale_3x_hq'
  | 'scale_4x_hq'
  | 'pp_rotate'
  | 'pp_resize'
  | 'sym_h'
  | 'sym_v'
  | 'sym_radial'
  | 'repeat'
  | 'tile_mode'
  | 'spritesheet_mode';

export type VectorCreationMode =
  | 'straight'
  | 'polyline'
  | 'bezier'
  | 'spline'
  | 'smooth'
  | 'freehand'
  | 'closed'
  | 'open';

export type VectorNodeType = 'corner' | 'smooth' | 'symmetric';

export type VectorStrokeProfile =
  | 'uniform'
  | 'tapered'
  | 'round'
  | 'square'
  | 'pixel_perfect'
  | 'calligraphic'
  | 'custom';

export type VectorCapStyle = 'butt' | 'square' | 'round';
export type VectorJoinStyle = 'miter' | 'round' | 'bevel';
export type VectorWidthMode = 'uniform' | 'variable' | 'per_node' | 'per_segment';
export type VectorSymmetryMode = 'none' | 'horizontal' | 'vertical' | 'radial' | 'custom';

export interface VectorSnapPrefs {
  grid: boolean;
  pixel: boolean;
  guides: boolean;
  nodes: boolean;
  objects: boolean;
}

export interface VectorDisplayPrefs {
  showNodes: boolean;
  showGuides: boolean;
  showTangents: boolean;
  showControlCurves: boolean;
  showThickness: boolean;
}

export interface VectorNode {
  id: string;
  x: number;
  y: number;
  inHandleX?: number;
  inHandleY?: number;
  outHandleX?: number;
  outHandleY?: number;
  nodeType: VectorNodeType;
  handlesBroken?: boolean;
  width?: number;
}

export interface VectorPath {
  id: string;
  name: string;
  mode: VectorCreationMode;
  closed: boolean;
  nodes: VectorNode[];
  color: string;
  widthMode: VectorWidthMode;
  strokeWidth: number;
  segmentWidths?: number[];
  profile: VectorStrokeProfile;
  customProfileStops?: number[];
  capStyle: VectorCapStyle;
  joinStyle: VectorJoinStyle;
  tension: number;
  smoothing: number;
  curveRadius: number;
  pixelPerfect: boolean;
  smartPixelCurve: boolean;
  penPressureEnabled: boolean;
  fillColor?: string | null;
}

export interface VectorToolConfig {
  mode: VectorCreationMode;
  widthMode: VectorWidthMode;
  strokeWidth: number;
  profile: VectorStrokeProfile;
  customProfileStops: number[];
  capStyle: VectorCapStyle;
  joinStyle: VectorJoinStyle;
  tension: number;
  smoothing: number;
  curveRadius: number;
  pixelPerfect: boolean;
  smartPixelCurve: boolean;
  penPressureEnabled: boolean;
  symmetryMode: VectorSymmetryMode;
  customSymmetryX: number;
  customSymmetryY: number;
  snap: VectorSnapPrefs;
  display: VectorDisplayPrefs;
  storeOnVectorLayer: boolean;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  lockTransparency?: boolean;
  lockPixels?: boolean;
  lockPosition?: boolean;
  opacity: number;
  fillOpacity?: number; // 0 .. 1 independent Fill opacity (Photoshop Fill)
  blendMode?: LayerBlendMode;
  mask?: LayerMask | null;
  clippingMask?: boolean;
  pixels: (string | null)[][];
  groupId?: string | null;
  colorTag?: string; // Photoshop-style layer identification color
  layerType?: LayerType;
  adjustment?: LayerAdjustmentConfig;
  smartSourceName?: string; // Preserved metadata for smart layers
  keyframes?: LayerKeyframe[]; // Per-layer hybrid After Effects keyframes
  nonDestructiveTransform?: Partial<TransformParameters> | null;
  transformSourcePixels?: (string | null)[][] | null;
  vectorPaths?: VectorPath[];
  parametricShapes?: ParametricShapeObject[];
  isGlobal?: boolean; // Global layer shared dynamically across all frames
  offCanvasPixels?: Record<string, string>; // Non-destructive off-canvas pixel cache ("x,y" -> color)
  parallaxSpeed?: number; // Stage work-mode horizontal parallax scroll multiplier (e.g. 0.2, 0.5, 1.0, 1.35)
  stagePlane?: string; // Semantic plane tag for Stage mode (e.g. 'sky', 'far', 'mid', 'near', 'ground', 'fg', 'fx')
  stageRole?: StageBuilderRole; // Modular Stage Builder role ('fondo' | 'tiles' | 'objetos' | 'decoracion' | 'parallax' | 'fx')
  tileMapData?: Record<string, string>; // "tileX,tileY" -> "tilesetId:tileId" metadata for autotiling & replace
  fxRecipe?: EditableFxRecipe | null; // Editable FX metadata so generated FX layers can be reopened and regenerated
  /** ID referencing an on-demand 256×256 sparse RGBA TiledLayerStore for large canvases/spritesheets */
  tiledStoreId?: string;
  /** Lightweight bump counter so React re-renders tiled viewport canvases without deep-cloning giant grids */
  tiledRevision?: number;
}

export interface ClipboardData {
  kind: 'layer' | 'selection';
  sourceName: string;
  sourceFrameIndex: number;
  originX: number;
  originY: number;
  width: number;
  height: number;
  pixels: (string | null)[][];
}

export type AssetCategory =
  | 'character'
  | 'stage'
  | 'hud'
  | 'vfx'
  | 'particles'
  | 'projectiles'
  | 'sounds'
  | 'ui'
  | 'references';

export type AssetOrigin = 'preset' | 'ai' | 'user';

export interface AssetMetadata {
  author: string;
  createdAt: string;
  palette: string[];
  resolution: string;
  sourceProject: string;
  durationSec?: number;
  mimeType?: string;
}

export interface AssetLibraryItem {
  id: string;
  name: string;
  category: AssetCategory;
  origin: AssetOrigin;
  width: number;
  height: number;
  pixels: (string | null)[][];
  createdAt: string;
  description?: string;
  folder?: string;
  tags?: string[];
  favorite?: boolean;
  mediaDataUrl?: string; // For sounds (.wav/.mp3/.ogg) or reference high-res media
  metadata?: AssetMetadata;
}

export type ReferenceBlendMode = 'normal' | 'multiply' | 'overlay' | 'screen' | 'difference';
export type ReferenceAnchorMode = 'canvas' | 'camera';

export interface ReferenceGroup {
  id: string;
  name: string;
  color: string;
  collapsed: boolean;
  visible: boolean;
}

export interface ReferenceItem {
  id: string;
  name: string;
  dataUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  groupId: string | null;
  visible: boolean;
  locked: boolean; // Non-editable by default (true)
  opacity: number; // 0..1
  blendMode: ReferenceBlendMode;
  scale: number; // 0.1..4.0
  rotation: number; // -180..180 deg
  flipX: boolean;
  flipY: boolean;
  x: number; // pixel or viewport offset
  y: number;
  anchor: ReferenceAnchorMode; // 'canvas' | 'camera'
  useAsAiGuide: boolean;
  colorTag?: string;
  zOrder?: number;
  alwaysOnTop?: boolean;
  boardX?: number;
  boardY?: number;
  boardScale?: number;
  boardRotation?: number;
}

export interface PureRefConfig {
  enabled: boolean;
  alwaysOnTop: boolean;
  globalOpacity: number; // 0.1..1
  panX: number;
  panY: number;
  zoom: number;
}

export type UniversalSearchCategory =
  | 'Herramientas'
  | 'Paneles'
  | 'Animación'
  | 'Filtros y Ajustes'
  | 'Dithering'
  | 'IA'
  | 'Simetría'
  | 'Referencias'
  | 'Interfaz'
  | 'Atajos'
  | 'Ajustes';

export interface UniversalSearchItem {
  id: string;
  title: string;
  subtitle: string;
  category: UniversalSearchCategory;
  shortcut?: string;
  keywords?: string;
  onExecute: () => void;
}

export type FramePhase = 'startup' | 'active' | 'recovery' | 'neutral';

export interface TimelineEvent {
  id: string;
  type: 'sfx' | 'vfx' | 'camera' | 'hitbox' | 'custom';
  label: string;
}

export interface TimelineMarker {
  id: string;
  frameIndex: number;
  label: string;
  color: string;
}

export interface Frame {
  id: string;
  name: string;
  durationTicks: number; // in 60fps ticks
  durationMs?: number; // duration in milliseconds
  phase: FramePhase;
  layers: Layer[];
  hitboxes: Hitbox[];
  pivot?: { x: number; y: number };
  groupId?: string | null;
  colorLabel?: string; // Timeline frame label color
  note?: string; // Frame animator note
  events?: TimelineEvent[]; // Timeline triggers on this frame
  onHitAdvantage?: number; // Fighting game frame advantage override
  onBlockAdvantage?: number;
}

export interface AnimationClip {
  id: string;
  name: string;
  frameIndices: number[];
  loop: boolean;
  fps: number;
  playbackMode?: 'loop' | 'pingpong' | 'once';
}

export type ActionTag = LayerGroup;

export interface PalettePreset {
  id: string;
  name: string;
  description: string;
  colors: string[];
}

export interface SelectionArea {
  active: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  shape?: 'rect' | 'ellipse' | 'lasso' | 'polygon' | 'magic_wand';
  mask?: boolean[][];
  pixels?: (string | null)[][];
  isFloating?: boolean;
}

export type DummyBehaviorState =
  | 'idle'
  | 'walk'
  | 'jump'
  | 'block'
  | 'counter_hit'
  | 'guard_cancel';

export interface DummyOpponent {
  enabled: boolean;
  distance: number; // in pixels from center/P1
  showHurtbox: boolean;
  state?: DummyBehaviorState;
}

export interface GroundConfig {
  visible: boolean;
  groundY: number; // pixel row of ground line
  showShadow: boolean;
}

export interface CombatFxConfig {
  hitstop: boolean;
  screenShake: boolean;
}

export type CameraShakeDirection = 'both' | 'horizontal' | 'vertical';

export interface CameraShakeConfig {
  enabled: boolean;
  intensity: number; // 1..24 px
  durationMs: number; // 60..1200 ms
  frequencyHz: number; // 5..60 Hz
  direction: CameraShakeDirection;
}

export interface CameraKeyframe {
  frameIndex: number;
  x: number;
  y: number;
  zoom: number; // 0.5..2.5
  shakeTrigger?: boolean;
  easing: KeyframeEasing;
}

export type VectorRasterConfirmMode = 'keep' | 'rasterize' | 'ask';

export interface SmartDeleteCandidate {
  id: string;
  kind:
    | 'vector_nodes'
    | 'vector_path'
    | 'parametric_shape'
    | 'hitbox'
    | 'pixel_selection'
    | 'reference'
    | 'reference_group'
    | 'layer_single'
    | 'layers_multi'
    | 'layer_group'
    | 'frame_single'
    | 'frames_multi'
    | 'layer_keyframe'
    | 'camera_keyframe'
    | 'marker'
    | 'pose'
    | 'asset'
    | 'layer_mask'
    | 'adjustment_effect'
    | 'ai_element'
    | 'guide';
  label: string;
  detail: string;
  affectedCount: number;
  requiresConfirmation: boolean;
}

export type AiContextualMode = 'keep' | 'adapt' | 'blend';

export type AiExternalProfileId =
  | 'kof'
  | 'sf_alpha'
  | 'darkstalkers'
  | 'guilty_gear'
  | 'blazblue'
  | 'snk_neogeo'
  | 'cps2'
  | 'pixel_fantasy'
  | 'pixel_cyberpunk';

export interface ProjectContextAnalysis {
  visualStyle: string;
  activePalette: string[];
  resolution: string;
  uniqueColors: number;
  animationType: string;
  gameGenre: string;
  lineThickness: number;
  shadingType: 'flat' | 'cel' | 'gradient_dither';
  characterBounds?: { w: number; h: number } | null;
}

export type DitherPatternType =
  | 'checkered'
  | 'sparse'
  | 'dense'
  | 'horizontal'
  | 'bayer4'
  | 'diagonal'
  | 'custom';

export interface DitherConfig {
  enabled?: boolean;
  pattern: DitherPatternType;
  density: number; // 0..100
  scale?: number; // 1..8
  contrast?: number; // 0..100
  rotation: 0 | 90 | 180 | 270;
  randomness?: number; // 0..100
  blendMode?: 'replace' | 'mix' | 'secondary' | 'overlay';
  invert: boolean;
  smartLuminance: boolean;
  customMatrix?: number[][]; // 4x4 matrix of 0 | 1
}

export type BrushShape = 'square' | 'circle' | 'diamond' | 'slash_right' | 'slash_left' | 'spray';

export type BrushTextureType = 'none' | 'noise' | 'paper' | 'canvas' | 'dots' | 'crosshatch';

export interface BrushSettings {
  size: number;
  shape: BrushShape;
  spacing: number;
  hardness: number;
  opacity: number;
  flow?: number; // 0.05..1
  rotation?: number; // 0..360 deg
  texture?: BrushTextureType;
  textureStrength?: number; // 0..100
  airbrushMode?: boolean;
  smearEnabled?: boolean;
  smearStrength?: number; // 10..100
  celShadeEnabled?: boolean;
  celShadeMode?: 'darken' | 'lighten';
  celShadeIntensity?: number; // 5..60
  penPressureEnabled: boolean;
  pressureAffectsSize: boolean;
  pressureAffectsOpacity: boolean;
  pressureMinSize: number;
  pressureCurve: 'linear' | 'soft' | 'firm';
  taperEnds: boolean;
  jitterPosition: number;
  pixelPerfect: boolean;
  stabilizer: number;
}

export interface ProjectState {
  name: string;
  width: number;
  height: number;
  dpi?: number;
  frames: Frame[];
  layerGroups?: LayerGroup[];
  activeGroupId?: string | null;
  isolateActiveGroup?: boolean;
  clips: AnimationClip[];
  actionTags: ActionTag[];
  activeClipId: string;
  activeActionTagId: string | null;
  currentFrameIndex: number;
  currentLayerIndex: number;
  primaryColor: string;
  primaryAlpha: number;
  secondaryColor: string;
  secondaryAlpha: number;
  activeTool: ToolType;
  brushSize: number;
  brushSettings?: BrushSettings;
  activePaletteColors?: string[];
  fps?: number;
  pixelPerfect: boolean;
  ditherPattern: 'checkered' | 'sparse' | 'dense' | 'horizontal';
  activeHitboxType: HitboxType;
  symmetryEnabled: boolean;
  symmetryAxis: number;
  showGrid: boolean;
  showHitboxes: boolean;
  showPivot: boolean;
  globalPivot: { x: number; y: number };
  stageType: StageType;
  stageOpacity: number;
  groundConfig: GroundConfig;
  dummyOpponent: DummyOpponent;
  combatFx: CombatFxConfig;
  cameraShake?: CameraShakeConfig;
  cameraKeyframes?: CameraKeyframe[];
  onionSkinEnabled: boolean;
  onionSkinPrev: number;
  onionSkinNext: number;
  onionSkinOpacity: number;
  playbackMode: 'loop' | 'pingpong' | 'once';
  timelineMarkers?: TimelineMarker[];
  references?: ReferenceItem[];
  referenceGroups?: ReferenceGroup[];
  guides?: CanvasGuide[];
  workMode?: ProjectWorkMode;
}

// =========================================================
// SYSTEM 3: CUSTOM SHORTCUTS, PROFILES, COMMAND PALETTE & MACROS
// =========================================================
export type ShortcutCategory =
  | 'General'
  | 'Edición'
  | 'Capas'
  | 'Selección'
  | 'Transformación'
  | 'Animación'
  | 'Pixel Art'
  | 'Vectores'
  | 'IA'
  | 'Fighting Game';

export type ShortcutProfileId =
  | 'pixelclash'
  | 'photoshop'
  | 'aseprite'
  | 'krita'
  | 'blender'
  | 'clipstudio'
  | 'custom';

export interface ShortcutBinding {
  id: string;
  label: string;
  category: ShortcutCategory;
  location: string;
  primary: string;
  secondary?: string;
}

export interface MacroStep {
  id: string;
  actionId: string;
  label: string;
  payload?: Record<string, unknown>;
}

export interface RecordedMacro {
  id: string;
  name: string;
  createdAt: string;
  steps: MacroStep[];
  shortcut?: string;
}

// =========================================================
// SYSTEM 4: PRO EYEDROPPER, LOUPE & SMART PALETTE
// =========================================================
export type EyedropperSampleMode = 'point' | 'avg3' | 'avg5' | 'custom';
export type EyedropperLayerScope = 'current' | 'visible' | 'all';

export interface EyedropperConfig {
  loupeZoom: 4 | 8 | 16 | 32;
  sampleMode: EyedropperSampleMode;
  customSampleRadius: number;
  layerScope: EyedropperLayerScope;
  ignoreLocked: boolean;
  ignoreHidden: boolean;
  pixelArtMode: boolean;
  historyLimit: 10 | 20 | 50;
}

export interface SampledColorInfo {
  hex: string;
  r: number;
  g: number;
  b: number;
  alpha: number; // 0..1
  h: number; // 0..360
  s: number; // 0..100
  v: number; // 0..100
  hslL: number; // 0..100
  paletteIndex: number; // -1 if not in active palette
  shadesDarker: [string, string];
  shadesLighter: [string, string];
  paletteRelated: string[];
}

// =========================================================
// SYSTEM 5: INTELLIGENT 2D POSE DUMMIE & DUMMIE MASTER
// =========================================================
export type DummieRigType =
  | 'male'
  | 'female'
  | 'child'
  | 'chibi'
  | 'anime'
  | 'muscular'
  | 'slim'
  | 'quadruped'
  | 'bird'
  | 'dragon'
  | 'custom';

export type DummieOverlayMode = 'panel' | 'canvas' | 'floating';
export type DummieDisplayMode =
  | 'joints_only'
  | 'volumes_only'
  | 'joints_and_volumes'
  | 'simple_silhouette'
  | 'solid_silhouette';
export type DummiePerspectiveMode = 'off' | 'light' | 'dynamic';

export type DummieAnchorSection =
  | 'head_neck'
  | 'arm_left'
  | 'arm_right'
  | 'torso'
  | 'leg_left'
  | 'leg_right'
  | 'tail';

export interface DummieJointAnchor {
  anchored: boolean;
  linkPosition: boolean;
  linkRotation: boolean;
  linkScale: boolean;
}

export type DummieAnchorVisualState = 'anchored' | 'partial' | 'independent' | 'locked';

export type DummieChainMoveScope =
  | 'piece'
  | 'branch'
  | 'upper_body'
  | 'lower_body'
  | 'full_body';

export interface DummieAnchorProfile {
  id: string;
  name: string;
  rigType: DummieRigType;
  description: string;
  builtIn?: boolean;
  sectionAnchors: Record<DummieAnchorSection, boolean>;
  jointAnchors: Record<string, DummieJointAnchor>;
  createdAt?: string;
}

export interface DummieJoint {
  id: string;
  label: string;
  parentId: string | null;
  x: number; // normalized 0..1 space inside rig canvas
  y: number; // normalized 0..1 space inside rig canvas
  rx?: number; // pitch (-90..90 deg)
  ry?: number; // yaw (-90..90 deg)
  rz?: number; // roll (-180..180 deg)
  depth?: number; // Z depth offset (-1..1)
  scale?: number; // per-joint local scale multiplier (0.5..1.8)
  locked?: boolean;
  anchor?: DummieJointAnchor;
  mirrorId?: string;
  radius?: number;
  group: 'head' | 'torso' | 'arm_l' | 'arm_r' | 'leg_l' | 'leg_r' | 'extra';
}

export interface DummiePostureModifiers {
  bodyLean: number; // -35..35 deg
  centerOfGravityX: number; // -0.25..0.25
  weightBalance: number; // -1 (left) .. 1 (right)
  gazeAngle: number; // -45..45
  headTilt: number; // -35..35
  armSpread: number; // 0.4..1.8
  legSpread: number; // 0.4..1.8
  limbLengthScale: number; // 0.7..1.4
  autoSymmetry: boolean;
  skeletonMode: boolean;
  showBalanceLine: boolean;
  perspectiveMode?: DummiePerspectiveMode;
  pixelArtSimplified?: boolean;
  displayMode?: DummieDisplayMode;
  showTail?: boolean;
  showEars?: boolean;
  showWings?: boolean;
  showHorns?: boolean;
}

export interface DummiePose {
  id: string;
  name: string;
  category: string;
  rigType: DummieRigType;
  joints: DummieJoint[];
  modifiers: DummiePostureModifiers;
  overlayMode: DummieOverlayMode;
  overlayOpacity: number;
  overlayColor: string;
  lineWidth: number;
  canvasX: number; // offset over main canvas
  canvasY: number;
  canvasScale: number;
  /** Contextual chain move scope (piece / branch / upper_body / lower_body / full_body) */
  chainMoveScope?: DummieChainMoveScope;
  /** Visual Rig hierarchy tree mode */
  rigViewEnabled?: boolean;
  /** Respect active perspective guides (auto-scale & ground depth alignment) */
  respectPerspective?: boolean;
  /** Section-level anchor toggles */
  sectionAnchors?: Record<DummieAnchorSection, boolean>;
  /** Currently active anchor profile ID */
  activeAnchorProfileId?: string;
}

export type DummieApplyTarget =
  | 'current_character'
  | 'selected_layer'
  | 'selected_group'
  | 'current_frame'
  | 'manual_sprite';

export type DummieFrameScope =
  | 'current_frame'
  | 'specific_frame'
  | 'multiple_frames'
  | 'all_frames';

export interface DummieApplyConfig {
  target: DummieApplyTarget;
  frameScope: DummieFrameScope;
  specificFrameIndex: number;
  selectedFrameIndices: number[];
  generateInBetweens: boolean;
  inBetweenCount: number;
  markAsKeyframes: boolean;
  preserveOriginalResolution: boolean;
  preserveOriginalPalette: boolean;
  pixelPerfectOutlines: boolean;
  useAiRetarget: boolean;
  aiAdaptationIntensity: number; // 0..100
  layerBaseName: string;
}

// =========================================================
// SYSTEM 6: SAFE NON-DESTRUCTIVE MULTI-FRAME AI & PASTE
// =========================================================
export type InsertFrameDestination =
  | 'current_frame'
  | 'all_frames'
  | 'range'
  | 'selected_frames'
  | 'global_layer';

export interface AiInsertConfig {
  destination: InsertFrameDestination;
  rangeStart: number;
  rangeEnd: number;
  selectedFrameIndices: number[];
  layerName: string;
  wrapInGroup: boolean;
  groupName?: string;
  groupColor?: string;
  insertAtBottom?: boolean;
  autoApplyAllFrames?: boolean;
}

export interface PasteOptionsConfig {
  mode: 'new_layer' | 'active_layer' | 'selected_group';
  positionMode: 'original' | 'center';
  keepName: boolean;
  destination: InsertFrameDestination;
  rangeStart: number;
  rangeEnd: number;
}

// =========================================================
// SYSTEM 7: ADVANCED SYMMETRY, TOOLBAR MODES & NEW PROJECT
// =========================================================
export type SymmetryMode =
  | 'none'
  | 'vertical'
  | 'horizontal'
  | 'quad'
  | 'octal'
  | 'radial'
  | 'double_mirror'
  | 'custom_angle'
  | 'point'
  | 'custom_line';

export interface SymmetryConfig {
  enabled: boolean;
  mode: SymmetryMode;
  axisX: number; // Canvas coordinate (can be .5 for even pixel seam)
  axisY: number; // Canvas coordinate (can be .5 for even pixel seam)
  radialPoints: number; // 2..32 (2,4,6,8,12,16 or custom)
  customAngleDeg: number; // -180..180 for custom_angle
  lineP1: { x: number; y: number };
  lineP2: { x: number; y: number };
  showAxes: boolean;
  showReplicaPoints: boolean;
  showAffectedArea: boolean;
}

export type ToolbarColumnsMode = 1 | 2 | 3 | 'auto';

export type NewProjectBackgroundMode = 'transparent' | 'solid';

export interface NewProjectConfig {
  name: string;
  width: number;
  height: number;
  dpi?: number;
  pixelScale?: number;
  category?: string;
  templateId?: string;
  backgroundMode: NewProjectBackgroundMode;
  backgroundColor: string;
  initialPaletteId?: string;
  enableGrid: boolean;
  enablePixelPerfect: boolean;
  createInitialLayer: boolean;
  createInitialGroup: boolean;
  enableAnimationMode: boolean;
  workMode?: ProjectWorkMode;
  fightingProfileId?: FightingGameProfileId;
  stagePresetId?: string;
}

export type RecentProjectFileFormat =
  | 'pcs'
  | 'json'
  | 'psd'
  | 'ase'
  | 'png'
  | 'jpg'
  | 'jpeg'
  | 'webp'
  | 'gif'
  | 'bmp'
  | 'tiff'
  | 'tga'
  | 'ico'
  | 'spritesheet';

export interface RecentProjectEntry {
  id: string;
  name: string;
  width: number;
  height: number;
  category: string;
  openedAt: string;
  modifiedAt?: string;
  modifiedTimestamp?: number;
  fileSize?: number;
  frameCount?: number;
  layerCount?: number;
  templateId?: string;
  backgroundMode?: NewProjectBackgroundMode;
  backgroundColor?: string;
  path?: string;
  diskPath?: string;
  sourceKind?: 'disk_path' | 'file_handle' | 'cached_blob' | 'project_snapshot';
  hasStoredContent?: boolean;
  pinned?: boolean;
  thumbnailDataUrl?: string;
  fileFormat?: RecentProjectFileFormat;
}

export type RulerUnit = 'px' | 'percent' | 'custom';

export type GuideOrientation = 'horizontal' | 'vertical';

export type GuidePresetKind = 'horizon' | 'hud' | 'character' | 'stage';

export type GuidesModalTab =
  | 'perspective'
  | 'floor_stage'
  | 'camera'
  | 'groups'
  | 'presets'
  | 'exact'
  | 'list';

export type PerspectiveGuideType =
  | '1point'
  | '2point'
  | '3point'
  | 'curvilinear'
  | 'isometric'
  | 'dimetric'
  | 'trimetric';

export type ScenarioGuidePresetId =
  | 'fighting'
  | 'beatemup'
  | 'platformer'
  | 'rpg'
  | 'visual_novel';

export interface VanishingPoint {
  id: string;
  label: string;
  /** Canvas pixel coordinates — may be negative or exceed canvas dimensions (outside canvas) */
  x: number;
  y: number;
  locked: boolean;
  visible: boolean;
  color?: string;
}

export interface AutoFloorGridConfig {
  enabled: boolean;
  /** Spacing in canvas pixels along ground baseline */
  spacing: number;
  /** Radial/column subdivisions (3..28) */
  density: number;
  color: string;
  opacity: number; // 0.1..1
  /** Floor plane bottom reference as fraction of canvas height (0.6..1.05) */
  floorYRatio: number;
  /** Horizontal receding depth subdivisions */
  depthRows: number;
}

export interface PerspectiveGuidesConfig {
  enabled: boolean;
  type: PerspectiveGuideType;
  vanishingPoints: VanishingPoint[];
  /** Horizon line Y in canvas pixels (can sit outside canvas) */
  horizonY: number;
  horizonLocked: boolean;
  showHorizon: boolean;
  showRays: boolean;
  rayDensity: number; // 4..32 rays per VP
  showConstructionGrid: boolean;
  color: string;
  thickness: number; // 1..4
  opacity: number; // 0.1..1
  /** Angles in degrees for isometric/dimetric/trimetric grids */
  isoAngleLeft: number;
  isoAngleRight: number;
  isoCellSize: number;
  floorGrid: AutoFloorGridConfig;
  activeScenarioPreset?: ScenarioGuidePresetId | null;
  configName?: string;
}

export interface CameraGuidesConfig {
  enabled: boolean;
  showVisibleArea: boolean;
  visibleAreaInsetPct: number;
  showSafeMargins: boolean;
  safeMarginPct: number;
  showCombatZone: boolean;
  combatZoneInsetXPct: number;
  combatZoneTopPct: number;
  combatZoneFloorPct: number;
  showScrollLimits: boolean;
  scrollLimitInsetPct: number;
  showCameraCenter: boolean;
  color: string;
  thickness: number;
  opacity: number;
}

export interface StageDepthGuidesConfig {
  enabled: boolean;
  autoShowInStageMode: boolean;
  showHorizon: boolean;
  horizonPct: number;
  showGroundPlane: boolean;
  groundPlanePct: number;
  showVisualDepth: boolean;
  showFarBackground: boolean;
  farBgPct: number;
  showMidBackground: boolean;
  midBgPct: number;
  showForeground: boolean;
  foregroundPct: number;
  color: string;
  thickness: number;
  opacity: number;
}

export interface GuideGroup {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  color: string;
  thickness: number;
  opacity: number;
}

export interface SavedPerspectiveConfiguration {
  id: string;
  name: string;
  category: string;
  description?: string;
  builtIn?: boolean;
  createdAt: string;
  perspective: PerspectiveGuidesConfig;
  cameraGuides?: CameraGuidesConfig;
  stageDepth?: StageDepthGuidesConfig;
}

export interface CanvasGuide {
  id: string;
  orientation: GuideOrientation;
  /** Position in canvas pixels (can be fractional or negative/outside canvas) */
  position: number;
  label?: string;
  color?: string;
  thickness?: number;
  opacity?: number;
  groupId?: string;
  locked?: boolean;
  preset?: GuidePresetKind;
}

export interface GuidesConfig {
  showRulers: boolean;
  showGuides: boolean;
  lockGuides: boolean;
  unit: RulerUnit;
  /** Pixels per 1 custom unit (e.g. 16 px = 1 tile) */
  customScale: number;
  /** Display suffix for custom units (e.g. 'tile', 'u', 'm') */
  customLabel: string;
  snapToGuides: boolean;
  snapToRulers: boolean;
  snapToGrid: boolean;
  /** Snap lines, shapes, vectors, selections & objects to active perspective rays/grids */
  snapToPerspective: boolean;
  /** Allow Pose Dummie to follow active perspective scale & depth plane */
  dummieFollowPerspective: boolean;
  /** Snap radius in canvas pixels */
  snapThresholdPx: number;
  /** Grid snap step in canvas pixels (e.g. 1, 4, 8, 16) */
  gridStep: number;
  /** Global default guide styling */
  defaultGuideColor: string;
  defaultGuideThickness: number;
  defaultGuideOpacity: number;
  /** Named guide groups (Escenario, Personajes, HUD, Cámara, etc.) */
  groups: GuideGroup[];
  activeGroupId: string;
  /** 7-Mode Perspective, Vanishing Points & Auto Floor Grid */
  perspective: PerspectiveGuidesConfig;
  /** Fighting/Stage Camera Guides */
  cameraGuides: CameraGuidesConfig;
  /** Stage Mode Depth Layers Guides */
  stageDepth: StageDepthGuidesConfig;
}

export type WheelNavigationMode = 'pan' | 'zoom';

// =========================================================
// SYSTEM 8: PROJECT WORK MODES, STAGE PARALLAX & TILESET STUDIO
// =========================================================
export type ProjectWorkMode =
  | 'fighter'
  | 'stage'
  | 'hud_ui'
  | 'fx'
  | 'tileset'
  | 'portrait'
  | 'cutscene'
  | 'custom';

export interface StageGuidesVisibility {
  horizon: boolean;
  playableArea: boolean;
  sideBounds: boolean;
  jumpHeight: boolean;
  cameraZone: boolean;
}

export interface StageParallaxConfig {
  enabled: boolean;
  scrollOffset: number; // horizontal camera offset in pixels
  autoScroll: boolean;
  autoScrollSpeed: number; // pixels per second
  horizonPct: number; // 0..100
  playableFloorPct: number; // 0..100
  jumpHeightPct: number; // 0..100
  guides: StageGuidesVisibility;
}

export interface TilesetWorkspaceConfig {
  tileSize: number; // 8, 16, 24, 32, 48, 64
  showBlockGrid: boolean;
  showRepeat3x3: boolean;
  showSeamChecker: boolean;
  showAutotilePreview: boolean;
}

// =========================================================
// SYSTEM 9: ADVANCED FX STUDIO GENERATOR & VISUAL FX LAB
// =========================================================
export type FxEffectType =
  | 'aura'
  | 'ki'
  | 'chakra'
  | 'mana'
  | 'energy'
  | 'electricity'
  | 'fire'
  | 'ice'
  | 'water'
  | 'smoke'
  | 'wind'
  | 'sand'
  | 'plasma'
  | 'magic'
  | 'darkness'
  | 'light'
  | 'blood_stylized'
  | 'dust'
  | 'shockwave'
  | 'impact'
  | 'smear_fx'
  | 'rocks_fx'
  | 'fragments_fx'
  | 'debris_fx'
  | 'earth'
  | 'explosion'
  | 'sparks'
  | 'custom';

export type FxDetailLevel =
  | 'very_simple'
  | 'simple'
  | 'medium'
  | 'high'
  | 'very_high'
  | 'professional';

export type FxVisualStyle =
  | 'pixel_retro'
  | 'snes'
  | 'neo_geo'
  | 'cps2'
  | 'kof'
  | 'sf_alpha'
  | 'guilty_gear'
  | 'anime'
  | 'pixel_fantasy'
  | 'pixel_scifi'
  | 'pixel_dark_fantasy'
  | 'custom';

export type FxShapeType =
  | 'circular'
  | 'linear'
  | 'conical'
  | 'radial'
  | 'spiral'
  | 'custom';

export type FxDirectionType =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'diagonal'
  | 'custom';

export interface FxModifiers {
  intensity: number; // 10..100
  scale: number; // 15..200 (%)
  brightness: number; // 20..150 (%)
  saturation: number; // 0..150 (%)
  opacity: number; // 10..100 (%)
  chaos: number; // 0..100
  visualSpeed: number; // 10..200 (%)
  density: number; // 10..100
  length: number; // 20..200 (%)
}

export type FxLayerOutputMode = 'single' | 'per_component';

export interface FxGeneratorConfig {
  effectType: FxEffectType;
  customTypeLabel?: string;
  detailLevel: FxDetailLevel;
  visualStyle: FxVisualStyle;
  customStyleLabel?: string;
  prompt?: string;
  modifiers: FxModifiers;
  shape: FxShapeType;
  direction: FxDirectionType;
  customAngleDeg: number; // 0..360
  layerMode: FxLayerOutputMode;
  animated: boolean;
  frameCount: number; // 4, 8, 12, 16, or custom 2..32
  seed: number;
  customPrimaryColor?: string;
  customSecondaryColor?: string;
  useCustomColors?: boolean;
}

export type FxOriginTag = 'preset' | 'manual' | 'imported' | 'ai' | 'modified';

export type FxVisualizerBackdrop = 'dark' | 'light' | 'checker' | 'custom';

export type FxStudioWorkspaceTab =
  | 'examples'
  | 'builder'
  | 'base'
  | 'aura'
  | 'deformers'
  | 'editor'
  | 'particles'
  | 'rocks'
  | 'smears'
  | 'fluids'
  | 'materials'
  | 'import'
  | 'library'
  | 'ai';

// FX Base guide silhouettes
export type FxBaseGuideType =
  | 'empty_silhouette'
  | 'solid_silhouette'
  | 'radial_shape'
  | 'linear_shape'
  | 'explosion_base'
  | 'aura_base'
  | 'projectile_base'
  | 'column_base'
  | 'wave_base'
  | 'rock_base'
  | 'fragment_base'
  | 'cloud_base';

export interface FxBaseGuideConfig {
  enabled: boolean;
  type: FxBaseGuideType;
  showAsOverlay: boolean;
  includeInExport: boolean;
  guideColor: string;
  scale: number; // 25..180%
  thickness: number; // 1..8 px
  rotationDeg: number; // 0..360
  seed: number;
}

// Morphology Editor (Global + Independent Top/Mid/Bottom & Height profiles)
export interface FxMorphologyConfig {
  enabled: boolean;
  width: number; // 30..200 (%)
  height: number; // 30..200 (%)
  length: number; // 30..200 (%)
  volume: number; // 0..100 (dilate/fatten silhouette)
  thickness: number; // 20..200 (%)
  intensity: number; // 20..150 (%)
  // Independent control (especially useful for auras, flames, columns, energy beams)
  topWidth: number; // 15..220 (%)
  midWidth: number; // 15..220 (%)
  bottomWidth: number; // 15..220 (%)
  topHeight: number; // 20..200 (%)
  bottomHeight: number; // 20..200 (%)
  overallHeight: number; // 30..200 (%)
}

// 9 Deformers + Visual Velocity (non-physical visual motion)
export interface FxDeformerConfig {
  enabled: boolean;
  wave: number; // 0..100 (Ondulación)
  curvature: number; // -100..100 (Curvatura)
  twist: number; // -100..100 (Torsión)
  noise: number; // 0..100 (Ruido)
  turbulence: number; // 0..100 (Turbulencia)
  distortion: number; // 0..100 (Distorsión)
  vortex: number; // -100..100 (Vórtice)
  expansion: number; // 0..100 (Expansión)
  contraction: number; // 0..100 (Contracción)
  // Visual Velocity
  visualSpeed: number; // 10..250 (%)
  agitation: number; // 0..100
  intensity: number; // 0..150 (%)
  directionDeg: number; // 0..360
  flow: number; // 0..100
  seed: number;
}

// Specialized Aura Editor (supports energy-less pure wind/dust/rocks/fragments auras!)
export type FxAuraType = 'ki' | 'chakra' | 'spiritual' | 'elemental' | 'custom';

export interface FxAuraComponentToggle {
  enabled: boolean;
  intensity: number; // 10..100
  color: string;
}

export interface FxAuraConfig {
  auraType: FxAuraType;
  showCoreEnergy: boolean; // Can be FALSE for "Aura sin energía visible"
  coreStyle: 'flames' | 'spiral' | 'pillar' | 'mist' | 'rays';
  colorCore: string;
  colorMid: string;
  colorEdge: string;
  topWidth: number; // 20..200 (%)
  midWidth: number; // 20..200 (%)
  bottomWidth: number; // 20..200 (%)
  height: number; // 40..180 (%)
  turbulence: number; // 0..100
  speed: number; // 20..200 (%)
  components: {
    wind: FxAuraComponentToggle;
    rocks: FxAuraComponentToggle;
    sparks: FxAuraComponentToggle;
    smoke: FxAuraComponentToggle;
    particles: FxAuraComponentToggle;
    fragments: FxAuraComponentToggle;
    waves: FxAuraComponentToggle;
    ambientDistortion: FxAuraComponentToggle;
  };
  seed: number;
}

export type FxLayerRole =
  | 'base'
  | 'particles'
  | 'rocks'
  | 'smoke'
  | 'sparks'
  | 'distortion'
  | 'glow'
  | 'extras';

export type FxComponentExplorerCategory =
  | 'energy'
  | 'aura'
  | 'rocks'
  | 'debris'
  | 'smoke'
  | 'electricity'
  | 'water'
  | 'lava'
  | 'air'
  | 'dust'
  | 'sparks'
  | 'particles'
  | 'smears'
  | 'waves'
  | 'distortion'
  | 'custom';

export type FxComponentLibraryCategory =
  | 'rocks'
  | 'dust'
  | 'sparks'
  | 'smoke'
  | 'auras'
  | 'waves'
  | 'smears'
  | 'fluids'
  | 'fragments';

export interface FxComponentLibraryItem {
  id: string;
  name: string;
  category: FxComponentLibraryCategory;
  description: string;
  module: FxLabModule;
  createdAt: string;
}

export type FxParticleTemplateId =
  | 'sparks'
  | 'ash'
  | 'rocks'
  | 'fragments'
  | 'metal_shards'
  | 'leaves'
  | 'sand'
  | 'crystals'
  | 'energy'
  | 'smoke';

export interface FxParticleEmitterConfig {
  enabled: boolean;
  template: FxParticleTemplateId;
  count: number; // 4..120
  size: number; // 1..10 px
  sizeVariance: number; // 0..100%
  speed: number; // 5..200
  directionDeg: number; // 0..360
  spreadDeg: number; // 0..360
  gravity: number; // -100..100
  lifetime: number; // 20..100%
  originX: number; // 0..100%
  originY: number; // 0..100%
  colors: [string, string, string];
  seed: number;
}

export type FxRockPieceKind =
  | 'rock'
  | 'debris'
  | 'ground_chunk'
  | 'brick'
  | 'block'
  | 'crystal_chunk'
  | 'spike'
  | 'pillar'
  | 'fragment'
  | 'ground_crack';

export interface FxRockPiece {
  id: string;
  name: string;
  kind: FxRockPieceKind;
  x: number; // 0..100 (%)
  y: number; // 0..100 (%)
  size: number; // 3..34 px
  aspect: number; // 0.3..2.6
  rotationDeg: number; // 0..360
  deform: number; // 0..100
  colorPrimary: string;
  colorHighlight: string;
  colorShadow: string;
  outline: boolean;
  clusterId: string | null;
  emergeOrder?: number; // 0..1 stagger order for emerging spikes/pillars
  curvature?: number; // -60..60 bend for spikes/pillars
  seed: number;
}

export interface FxRockCluster {
  id: string;
  name: string;
  offsetX: number; // -50..50 (%)
  offsetY: number; // -50..50 (%)
  scale: number; // 30..200 (%)
  rotationDeg: number; // -180..180
  burstSpeed: number; // 0..100
  gravity: number; // -50..100
  emergeMode?: boolean; // Rise from ground upward cleanly
}

export type FxSmearMode = 'linear' | 'curved' | 'radial' | 'multiple';

export interface FxSmearConfig {
  enabled: boolean;
  mode: FxSmearMode;
  thickness: number; // 1..20 px
  length: number; // 15..100%
  directionDeg: number; // 0..360
  curvature: number; // -100..100
  intensity: number; // 10..100
  strokeCount: number; // 1..12
  taper: boolean;
  colors: [string, string, string];
  seed: number;
}

export type FxFluidType =
  | 'water'
  | 'lava'
  | 'blood'
  | 'liquid_energy'
  | 'mud'
  | 'acid'
  | 'custom';

export type FxFluidEmitterMode = 'splash' | 'stream' | 'wave' | 'geyser' | 'pool';

export interface FxFluidConfig {
  fluidType: FxFluidType;
  emitterMode: FxFluidEmitterMode;
  density: number; // 15..100
  viscosity: number; // 5..100
  pressure: number; // 10..100
  turbulence: number; // 0..100
  speed: number; // 10..200
  directionDeg: number; // 0..360
  foam: number; // 0..100
  ripple: number; // 0..100
  colors: [string, string, string, string]; // foam/core, light, body, deep
  seed: number;
}

export type FxMaterialPresetId =
  | 'smoke'
  | 'fire'
  | 'electricity'
  | 'water'
  | 'stone'
  | 'metal'
  | 'crystal';

export interface FxMaterialProfile {
  id: FxMaterialPresetId | string;
  name: string;
  baseType: FxMaterialPresetId;
  palette: [string, string, string, string]; // highlight, mid, shadow, deep/outline
  ditherStrength: number; // 0..100
  useOutline: boolean;
  outlineColor: string;
  glowIntensity: number; // 0..100
  roughness: number; // 0..100
  blendMode: LayerBlendMode;
}

export type FxLabModuleType =
  | 'particles'
  | 'glow'
  | 'lightning'
  | 'smoke'
  | 'sparks'
  | 'waves'
  | 'fire_core'
  | 'fragments'
  | 'smear'
  | 'fluid'
  | 'aura_shell'
  | 'wind_streams'
  | 'distortion'
  | 'ground_spikes'
  | 'dust_cloud';

export interface FxLabModule {
  id: string;
  name: string;
  type: FxLabModuleType;
  layerRole?: FxLayerRole;
  enabled: boolean;
  blendMode: LayerBlendMode;
  colorCore: string;
  colorMid: string;
  colorEdge: string;
  scale: number; // 15..200
  density: number; // 10..100
  intensity: number; // 10..100
  speed: number; // 10..200
  opacity: number; // 10..100
  chaos: number; // 0..100
  angleDeg: number; // 0..360
  offsetX: number; // -50..50 (%)
  offsetY: number; // -50..50 (%)
  seed: number;
}

export interface EditableFxRecipe {
  id: string;
  name: string;
  source: 'generator' | 'lab' | 'aura' | 'particles' | 'rocks' | 'smears' | 'fluids' | 'imported' | 'manual';
  origin?: FxOriginTag;
  createdAt: string;
  generatorConfig?: FxGeneratorConfig;
  labModules?: FxLabModule[];
  labAnimated?: boolean;
  labFrameCount?: number;
  labLayerMode?: FxLayerOutputMode;
  auraConfig?: FxAuraConfig;
  baseGuide?: FxBaseGuideConfig;
  morphology?: FxMorphologyConfig;
  deformers?: FxDeformerConfig;
  particleConfig?: FxParticleEmitterConfig;
  rockPieces?: FxRockPiece[];
  rockClusters?: FxRockCluster[];
  smearConfig?: FxSmearConfig;
  fluidConfig?: FxFluidConfig;
  materialProfile?: FxMaterialProfile;
  customFrames?: (string | null)[][][];
}

export interface FxLibraryPreset {
  id: string;
  name: string;
  category: FxEffectType | 'lab' | 'aura' | 'particles' | 'rocks' | 'smears' | 'fluids' | 'imported' | 'manual';
  origin?: FxOriginTag;
  createdAt: string;
  recipe: EditableFxRecipe;
}

export type FxExampleCategory = 'auras' | 'attacks' | 'fighting';

export interface FxExampleEntry {
  id: string;
  name: string;
  category: FxExampleCategory;
  shortDesc: string;
  inspiration?: string;
  howBuilt: string;
  componentsUsed: string[];
  layersUsed: string[];
  particlesSummary: string;
  modifiersUsed: string[];
  keyParamsToTweak: string[];
  generationMethod: string;
  recipe: EditableFxRecipe;
}

// =========================================================
// SYSTEM 10: PERFORMANCE MODE, SAVE-AS FORMATS & CLIPBOARD
// =========================================================
export type PerformanceMode = 'quality' | 'balanced' | 'performance';

export type SaveAsFormatId =
  | 'pcs'
  | 'animation'
  | 'png'
  | 'jpg'
  | 'webp'
  | 'gif'
  | 'spritesheet'
  | 'ase'
  | 'psd'
  | 'json';

export type ClipboardPasteDestination =
  | 'new_layer'
  | 'selected_group'
  | 'current_frame'
  | 'all_frames'
  | 'reference_canvas'
  | 'reference_panel'
  | 'asset_library'
  | 'new_document';

export type ClipboardFitMode = 'original' | 'fit' | 'fill';

// =========================================================
// SYSTEM 11: PIXEL-EXACT IMPORT, INTERPOLATION & STARTUP FLOW
// =========================================================
export type InterpolationMode = 'nearest' | 'bilinear' | 'bicubic';

export type ResolutionMismatchAction =
  | 'original_size'
  | 'fit_canvas'
  | 'center_no_resize'
  | 'new_document';

export type StartupMascotMode = 'builtin' | 'custom_gif_webp' | 'custom_spritesheet';

export interface StartupPreferences {
  showHomeScreen: boolean;
  showSplashAnimation: boolean;
  showSplashTips: boolean;
  splashMinDurationMs: number;
  mascotMode: StartupMascotMode;
  mascotCustomName?: string;
  mascotSheetCols?: number;
  mascotSheetRows?: number;
  mascotSheetFps?: number;
}

// =========================================================
// SYSTEM 12: STAGE BUILDER, TILES TOOL, TILESETS & FIGHTING PROFILES
// =========================================================
export type StageBuilderRole =
  | 'fondo'
  | 'tiles'
  | 'objetos'
  | 'decoracion'
  | 'parallax'
  | 'fx';

export type TileCategoryId =
  | 'suelo'
  | 'cesped'
  | 'tierra'
  | 'roca'
  | 'arena'
  | 'agua'
  | 'lava'
  | 'cielo'
  | 'nubes'
  | 'edificios'
  | 'decoracion';

export type TileToolMode = 'draw' | 'place' | 'replace' | 'erase' | 'select';

export type TilePaintPatternMode = 'single' | 'area' | 'repeat' | 'smart_fill';

export interface TileItem {
  id: string;
  name: string;
  category: TileCategoryId;
  groupId?: string | null;
  width: number;
  height: number;
  pixels: (string | null)[][];
  autotileSupported?: boolean;
  tags?: string[];
}

export interface TileGroup {
  id: string;
  name: string;
  color: string;
  collapsed?: boolean;
}

export interface TilesetCollection {
  id: string;
  name: string;
  tileSize: number;
  description?: string;
  createdAt: string;
  groups: TileGroup[];
  tiles: TileItem[];
}

export interface TileToolConfig {
  mode: TileToolMode;
  paintMode: TilePaintPatternMode;
  autotile: boolean;
  continuousDraw: boolean;
  autoRepeat: boolean;
  tileSize: number; // 8, 16, 24, 32, 48, 64
  activeTilesetId: string;
  activeTileId: string;
}

export type FightingGameProfileId =
  | 'custom'
  | 'kof'
  | 'sfa'
  | 'darkstalkers'
  | 'garou'
  | 'guilty_gear'
  | 'blazblue'
  | 'mvc'
  | 'skullgirls'
  | 'dbfz';

