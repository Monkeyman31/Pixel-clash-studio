import React, { createContext, useContext, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Blend,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  Columns2,
  Combine,
  CornerUpLeft,
  Crosshair,
  Diamond,
  Droplet,
  Eraser,
  Expand,
  ExternalLink,
  Eye,
  EyeOff,
  FlipHorizontal2,
  Focus,
  Grid,
  GripVertical,
  Hand,
  Hexagon,
  Image as ImageIcon,
  Lasso,
  Layers,
  Link2,
  Magnet,
  Maximize2,
  Minimize2,
  Minus,
  MousePointer,
  MousePointer2,
  PaintBucket,
  Paintbrush,
  Pencil,
  Pin,
  Pipette,
  Plus,
  RotateCcw,
  RotateCw,
  Scan,
  Search,
  Shapes,
  ShieldAlert,
  Shrink,
  Slash,
  SlidersHorizontal,
  Sparkles,
  Spline,
  SplitSquareHorizontal,
  Square,
  Star,
  SunMoon,
  Type,
  Unlink2,
  Wand2,
  Wind,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  ActiveFilterBarSession,
  ArrowHeadType,
  BrushSettings,
  BrushShape,
  BrushTextureType,
  BucketSubTool,
  BucketToolOptions,
  CanvasEditAnchor,
  CanvasEditConfig,
  CanvasEditOverflowMode,
  CanvasEditRect,
  CustomShapePresetId,
  DitherConfig,
  EllipseArcType,
  EraserToolOptions,
  EyedropperConfig,
  GradientConfig,
  GradientDitherAlgorithm,
  GradientType,
  HitboxType,
  LassoMode,
  MagicWandOptions,
  MoveSubTool,
  MoveToolOptions,
  OptionsBarDisplayMode,
  OptionsBarState,
  ParametricShapeObject,
  PencilBrushSubMode,
  QuickAiBarOptions,
  QuickAiStyleId,
  SelectionBooleanMode,
  SelectionSubTool,
  SelectionToolOptions,
  ShapeRasterConfirmMode,
  ShapeToolConfig,
  ShapeToolKind,
  SymmetryConfig,
  TilesetCollection,
  TileToolConfig,
  TileToolMode,
  TilePaintPatternMode,
  ToolType,
  VectorCreationMode,
  VectorRasterConfirmMode,
  VectorToolConfig,
  ZoomToolMode,
} from '../types';
import { renderTileThumbnailDataUrl } from '../utils/tilesetEngine';
import { CUSTOM_SHAPE_PRESETS, SHAPE_KIND_LABELS } from '../utils/parametricShapeEngine';
import { computeAnchoredCanvasRect } from '../utils/imageTransforms';
import { StudioSlider } from './StudioSlider';

// Extensible registry so any future tool automatically registers its primary contextual options
export interface RegisteredToolOptionProvider {
  toolId: string;
  label: string;
  render: (ctx: {
    displayMode: OptionsBarDisplayMode;
    searchQuery: string;
  }) => React.ReactNode;
}

const CUSTOM_TOOL_OPTIONS_REGISTRY = new Map<string, RegisteredToolOptionProvider>();

export function registerToolOptionsProvider(provider: RegisteredToolOptionProvider): void {
  CUSTOM_TOOL_OPTIONS_REGISTRY.set(provider.toolId, provider);
}

export interface ToolOptionsBarProps {
  barState: OptionsBarState;
  onChangeBarState: (next: OptionsBarState) => void;
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  canvasWidth?: number;
  canvasHeight?: number;
  // Pencil & Brush
  pencilSubMode: PencilBrushSubMode;
  onChangePencilSubMode: (mode: PencilBrushSubMode) => void;
  brushSettings: BrushSettings;
  onChangeBrushSettings: (next: BrushSettings) => void;
  brushSize: number;
  onChangeBrushSize: (size: number) => void;
  pixelPerfect: boolean;
  onTogglePixelPerfect: () => void;
  ditherConfig: DitherConfig;
  onChangeDitherConfig: (next: DitherConfig) => void;
  // Eraser
  eraserOptions: EraserToolOptions;
  onChangeEraserOptions: (next: EraserToolOptions) => void;
  // Bucket & Gradient
  bucketSubTool: BucketSubTool;
  onChangeBucketSubTool: (sub: BucketSubTool) => void;
  bucketOptions: BucketToolOptions;
  onChangeBucketOptions: (next: BucketToolOptions) => void;
  gradientConfig: GradientConfig;
  onChangeGradientConfig: (next: GradientConfig) => void;
  // Magic Wand
  magicWandOptions: MagicWandOptions;
  onChangeMagicWandOptions: (next: MagicWandOptions) => void;
  onMorphSelection: (deltaPx: number) => void;
  hasActiveSelection: boolean;
  // Selection & Lasso
  selectionSubTool: SelectionSubTool;
  onChangeSelectionSubTool: (sub: SelectionSubTool) => void;
  marqueeShape: 'rect' | 'ellipse';
  onChangeMarqueeShape: (shape: 'rect' | 'ellipse') => void;
  selectionOptions: SelectionToolOptions;
  onChangeSelectionOptions: (next: SelectionToolOptions) => void;
  lassoMode: LassoMode;
  onChangeLassoMode: (mode: LassoMode) => void;
  // Move & Direct Select
  moveSubTool: MoveSubTool;
  onChangeMoveSubTool: (sub: MoveSubTool) => void;
  moveOptions: MoveToolOptions;
  onChangeMoveOptions: (next: MoveToolOptions) => void;
  linkMoveAllFrames?: boolean;
  onToggleLinkMoveAllFrames?: () => void;
  onCenterAllReferences?: () => void;
  // Vector Line & Direct Select Node Actions
  primaryColor: string;
  onSelectPrimaryColor: (hex: string) => void;
  vectorConfig: VectorToolConfig;
  onChangeVectorConfig: (next: VectorToolConfig) => void;
  vectorConfirmPolicy: VectorRasterConfirmMode;
  onChangeVectorConfirmPolicy: (policy: VectorRasterConfirmMode) => void;
  onVectorNodeAction: (
    action: 'add_node' | 'delete_node' | 'convert_corner' | 'convert_smooth' | 'convert_symmetric' | 'break_tangents' | 'join_tangents'
  ) => void;
  // Parametric Shapes
  shapeConfig: ShapeToolConfig;
  onChangeShapeConfig: (next: ShapeToolConfig) => void;
  selectedShape: ParametricShapeObject | null;
  onUpdateSelectedShape: (patch: Partial<ParametricShapeObject>) => void;
  onRasterizeSelectedShape: () => void;
  onDeleteSelectedShape: () => void;
  shapeRasterPolicy: ShapeRasterConfirmMode;
  onChangeShapeRasterPolicy: (policy: ShapeRasterConfirmMode) => void;
  // Symmetry
  symmetryConfig: SymmetryConfig;
  onChangeSymmetryConfig: (next: SymmetryConfig) => void;
  symmetryBarActive: boolean;
  onToggleSymmetryBar: () => void;
  // Zoom
  zoomToolMode: ZoomToolMode;
  onChangeZoomToolMode: (mode: ZoomToolMode) => void;
  onTriggerZoomAction: (type: 'in' | 'out' | 'fit' | 'percent', percent?: number) => void;
  zoomPercent?: number;
  // Eyedropper & Hitbox
  eyedropperConfig: EyedropperConfig;
  onChangeEyedropperConfig: (next: EyedropperConfig) => void;
  activeHitboxType: HitboxType;
  onChangeHitboxType: (t: HitboxType) => void;
  // Active Filter Quick Mode
  activeFilterSession: ActiveFilterBarSession | null;
  onUpdateFilterSession: (patch: Partial<ActiveFilterBarSession>) => void;
  onConfirmFilterSession: () => void;
  onCancelFilterSession: () => void;
  onResetFilterSession: () => void;
  // Active AI Quick Mode
  aiBarActive: boolean;
  onToggleAiBar: () => void;
  quickAiOptions: QuickAiBarOptions;
  onChangeQuickAiOptions: (next: QuickAiBarOptions) => void;
  onGenerateQuickAi: () => void;
  isGeneratingQuickAi?: boolean;
  // Visual Canvas Edit Tool (Editar Lienzo)
  canvasEditRect?: CanvasEditRect;
  canvasEditConfig?: CanvasEditConfig;
  hasOffCanvasContent?: boolean;
  onChangeCanvasEditRect?: (next: CanvasEditRect) => void;
  onChangeCanvasEditConfig?: (next: CanvasEditConfig) => void;
  onApplyCanvasEdit?: () => void;
  onResetCanvasEdit?: () => void;
  onCancelCanvasEdit?: () => void;
  onFitCanvasEditToContent?: () => void;
  // Tiles Tool & Tileset Collection
  tileToolConfig?: TileToolConfig;
  onChangeTileToolConfig?: (next: TileToolConfig) => void;
  tilesets?: TilesetCollection[];
  onOpenTilesetsPanel?: () => void;
}

interface OptionsBarDisplayCtxValue {
  showIcon: boolean;
  showText: boolean;
  normalizedQuery: string;
}

const OptionsBarDisplayContext = createContext<OptionsBarDisplayCtxValue>({
  showIcon: true,
  showText: true,
  normalizedQuery: '',
});

const matchesCtxFilter = (normalizedQuery: string, keywords: string) => {
  if (!normalizedQuery) return true;
  return keywords.toLowerCase().includes(normalizedQuery);
};

// Module-scoped stable UI primitives so StudioSlider & inputs NEVER unmount/remount during drag re-renders
const ToggleBtn: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
  keywords?: string;
  icon?: React.FC<{ className?: string }>;
  title?: string;
  tone?: 'accent' | 'emerald' | 'amber' | 'rose';
}> = ({ active, onClick, label, keywords, icon: Icon, title, tone = 'accent' }) => {
  const { showIcon, showText, normalizedQuery } = useContext(OptionsBarDisplayContext);
  if (!matchesCtxFilter(normalizedQuery, `${label} ${keywords || ''}`)) return null;
  const activeBg =
    tone === 'emerald'
      ? '#10b981'
      : tone === 'amber'
      ? '#f59e0b'
      : tone === 'rose'
      ? '#ef4444'
      : 'var(--studio-accent)';
  const activeText = tone === 'accent' ? 'var(--studio-accent-text)' : '#0f172a';
  return (
    <button
      type="button"
      onClick={onClick}
      title={title || label}
      className="h-6 px-1.5 rounded border text-[10px] font-medium flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
      style={{
        backgroundColor: active ? activeBg : 'var(--studio-bg-elevated)',
        color: active ? activeText : 'var(--studio-text)',
        borderColor: active ? activeBg : 'var(--studio-border)',
      }}
    >
      {showIcon && Icon && <Icon className="w-3 h-3 shrink-0" />}
      {(showText || !Icon) && <span>{label}</span>}
    </button>
  );
};

const ActionBtn: React.FC<{
  onClick: () => void;
  label: string;
  keywords?: string;
  icon?: React.FC<{ className?: string }>;
  title?: string;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'danger';
}> = ({ onClick, label, keywords, icon: Icon, title, disabled, variant = 'default' }) => {
  const { showIcon, showText, normalizedQuery } = useContext(OptionsBarDisplayContext);
  if (!matchesCtxFilter(normalizedQuery, `${label} ${keywords || ''}`)) return null;
  const bg =
    variant === 'primary'
      ? 'var(--studio-accent)'
      : variant === 'danger'
      ? 'rgba(239,68,68,0.16)'
      : 'var(--studio-bg-elevated)';
  const color =
    variant === 'primary'
      ? 'var(--studio-accent-text)'
      : variant === 'danger'
      ? '#fca5a5'
      : 'var(--studio-text)';
  const borderColor =
    variant === 'primary'
      ? 'var(--studio-accent)'
      : variant === 'danger'
      ? 'rgba(239,68,68,0.45)'
      : 'var(--studio-border)';
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title || label}
      className="h-6 px-2 rounded border text-[10px] font-medium flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 disabled:opacity-40"
      style={{ backgroundColor: bg, color, borderColor }}
    >
      {showIcon && Icon && <Icon className="w-3 h-3 shrink-0" />}
      {(showText || !Icon) && <span>{label}</span>}
    </button>
  );
};

const SliderField: React.FC<{
  label: string;
  keywords?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  widthClass?: string;
  defaultValue?: number;
  allowManualOverflow?: boolean;
  hardMax?: number;
  onChange: (val: number) => void;
}> = ({
  label,
  keywords,
  value,
  min,
  max,
  step = 1,
  unit = '',
  defaultValue,
  allowManualOverflow = false,
  hardMax,
  onChange,
}) => {
  const { showText, normalizedQuery } = useContext(OptionsBarDisplayContext);
  if (!matchesCtxFilter(normalizedQuery, `${label} ${keywords || ''}`)) return null;
  return (
    <StudioSlider
      variant="compact"
      label={label}
      showLabel={showText}
      value={value}
      min={min}
      max={max}
      step={step}
      unit={unit}
      defaultValue={defaultValue}
      allowManualOverflow={allowManualOverflow}
      hardMax={hardMax}
      widthClass="min-w-[132px]"
      onChange={onChange}
    />
  );
};

const NumberField: React.FC<{
  label: string;
  keywords?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  defaultValue?: number;
  allowManualOverflow?: boolean;
  hardMax?: number;
  onChange: (val: number) => void;
}> = ({
  label,
  keywords,
  value,
  min,
  max,
  step = 1,
  unit = '',
  defaultValue,
  allowManualOverflow = false,
  hardMax,
  onChange,
}) => {
  const { showText, normalizedQuery } = useContext(OptionsBarDisplayContext);
  if (!matchesCtxFilter(normalizedQuery, `${label} ${keywords || ''}`)) return null;
  if (min !== undefined && max !== undefined) {
    return (
      <StudioSlider
        variant="compact"
        label={label}
        showLabel={showText}
        value={Math.round(value * 10) / 10}
        min={min}
        max={max}
        step={step}
        unit={unit}
        defaultValue={defaultValue}
        allowManualOverflow={allowManualOverflow}
        hardMax={hardMax}
        widthClass="min-w-[126px]"
        onChange={onChange}
      />
    );
  }
  return (
    <label
      className="h-6 px-1.5 rounded border flex items-center gap-1 text-[10px] whitespace-nowrap shrink-0"
      style={{
        backgroundColor: 'var(--studio-bg-elevated)',
        borderColor: 'var(--studio-border)',
        color: 'var(--studio-text)',
      }}
      title={label}
    >
      <span className="opacity-70">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={Math.round(value * 10) / 10}
        onChange={(e) => {
          const parsed = parseFloat(e.target.value);
          if (!Number.isNaN(parsed)) {
            const clamped =
              min !== undefined
                ? Math.max(min, parsed)
                : max !== undefined
                ? Math.min(max, parsed)
                : parsed;
            onChange(clamped);
          }
        }}
        className="w-11 bg-transparent text-right font-mono tabular-nums outline-none"
      />
      {unit && <span className="opacity-60">{unit}</span>}
    </label>
  );
};

const SelectField: React.FC<{
  label?: string;
  keywords?: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}> = ({ label, keywords, value, onChange, options }) => {
  const { showText, normalizedQuery } = useContext(OptionsBarDisplayContext);
  if (!matchesCtxFilter(normalizedQuery, `${label || ''} ${keywords || ''} ${options.map((o) => o.label).join(' ')}`)) {
    return null;
  }
  return (
    <label
      className="h-6 px-1.5 rounded border flex items-center gap-1 text-[10px] whitespace-nowrap shrink-0"
      style={{
        backgroundColor: 'var(--studio-bg-elevated)',
        borderColor: 'var(--studio-border)',
        color: 'var(--studio-text)',
      }}
    >
      {label && showText && <span className="opacity-75">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent outline-none cursor-pointer text-[10px] font-medium"
        style={{ color: 'var(--studio-text)' }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ backgroundColor: '#131722', color: '#f8fafc' }}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
};

const Sep: React.FC = () => (
  <div
    className="h-4 w-px shrink-0 mx-0.5"
    style={{ backgroundColor: 'var(--studio-border)' }}
    aria-hidden="true"
  />
);

export const ToolOptionsBar: React.FC<ToolOptionsBarProps> = ({
  barState,
  onChangeBarState,
  activeTool,
  onSelectTool,
  canvasWidth = 48,
  canvasHeight = 48,
  pencilSubMode,
  onChangePencilSubMode,
  brushSettings,
  onChangeBrushSettings,
  brushSize,
  onChangeBrushSize,
  pixelPerfect,
  onTogglePixelPerfect,
  ditherConfig,
  onChangeDitherConfig,
  eraserOptions,
  onChangeEraserOptions,
  bucketSubTool,
  onChangeBucketSubTool,
  bucketOptions,
  onChangeBucketOptions,
  gradientConfig,
  onChangeGradientConfig,
  magicWandOptions,
  onChangeMagicWandOptions,
  onMorphSelection,
  hasActiveSelection,
  selectionSubTool,
  onChangeSelectionSubTool,
  marqueeShape,
  onChangeMarqueeShape,
  selectionOptions,
  onChangeSelectionOptions,
  lassoMode,
  onChangeLassoMode,
  moveSubTool,
  onChangeMoveSubTool,
  moveOptions,
  onChangeMoveOptions,
  linkMoveAllFrames = false,
  onToggleLinkMoveAllFrames,
  onCenterAllReferences,
  primaryColor,
  onSelectPrimaryColor,
  vectorConfig,
  onChangeVectorConfig,
  vectorConfirmPolicy,
  onChangeVectorConfirmPolicy,
  onVectorNodeAction,
  shapeConfig,
  onChangeShapeConfig,
  selectedShape,
  onUpdateSelectedShape,
  onRasterizeSelectedShape,
  onDeleteSelectedShape,
  shapeRasterPolicy,
  onChangeShapeRasterPolicy,
  symmetryConfig,
  onChangeSymmetryConfig,
  symmetryBarActive,
  onToggleSymmetryBar,
  zoomToolMode,
  onChangeZoomToolMode,
  onTriggerZoomAction,
  zoomPercent = 100,
  eyedropperConfig,
  onChangeEyedropperConfig,
  activeHitboxType,
  onChangeHitboxType,
  activeFilterSession,
  onUpdateFilterSession,
  onConfirmFilterSession,
  onCancelFilterSession,
  onResetFilterSession,
  aiBarActive,
  onToggleAiBar,
  quickAiOptions,
  onChangeQuickAiOptions,
  onGenerateQuickAi,
  isGeneratingQuickAi = false,
  canvasEditRect,
  canvasEditConfig,
  hasOffCanvasContent = false,
  onChangeCanvasEditRect,
  onChangeCanvasEditConfig,
  onApplyCanvasEdit,
  onResetCanvasEdit,
  onCancelCanvasEdit,
  onFitCanvasEditToContent,
  tileToolConfig,
  onChangeTileToolConfig,
  tilesets,
  onOpenTilesetsPanel,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchFocused, setSearchFocused] = useState<boolean>(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchesFilter = (keywords: string) => {
    if (!normalizedQuery) return true;
    return keywords.toLowerCase().includes(normalizedQuery);
  };

  const showIcon = barState.displayMode !== 'text_only';
  const showText = barState.displayMode !== 'icon_only';

  const displayCtxValue = useMemo<OptionsBarDisplayCtxValue>(
    () => ({ showIcon, showText, normalizedQuery }),
    [showIcon, showText, normalizedQuery]
  );

  // Determine the active contextual section
  const activeContextMode = useMemo(() => {
    if (activeFilterSession) return 'filter';
    if (aiBarActive) return 'ai';
    if (symmetryBarActive) return 'symmetry';
    if (selectedShape) return 'parametric_shape';
    if (activeTool === 'rectangle' || activeTool === 'circle') return 'parametric_shape';
    if (activeTool === 'move' && moveSubTool === 'direct_select') return 'direct_select';
    if (activeTool === 'select' && marqueeShape === 'ellipse') return 'select_ellipse';
    if (activeTool === 'select') return 'select_rect';
    if (activeTool === 'pencil' && pencilSubMode === 'brush') return 'brush';
    return activeTool;
  }, [
    activeFilterSession,
    aiBarActive,
    symmetryBarActive,
    selectedShape,
    activeTool,
    moveSubTool,
    marqueeShape,
    pencilSubMode,
  ]);

  const contextHeaderInfo = useMemo(() => {
    switch (activeContextMode) {
      case 'filter':
        return { label: `Filtro: ${activeFilterSession?.name || 'Activo'}`, icon: SlidersHorizontal };
      case 'ai':
        return { label: 'IA Rápida', icon: Sparkles };
      case 'symmetry':
        return { label: 'Simetría', icon: FlipHorizontal2 };
      case 'parametric_shape': {
        const k = selectedShape?.kind || shapeConfig.shapeKind;
        const iconMap: Record<ShapeToolKind, React.FC<{ className?: string }>> = {
          rectangle: Square,
          ellipse: Circle,
          polygon: Hexagon,
          star: Star,
          arrow: ArrowRight,
          custom: Shapes,
        };
        return {
          label: selectedShape ? `${SHAPE_KIND_LABELS[k]} (Editable)` : `Forma: ${SHAPE_KIND_LABELS[k]}`,
          icon: iconMap[k] || Square,
        };
      }
      case 'pencil':
        return { label: 'Lápiz', icon: Pencil };
      case 'brush':
        return { label: 'Pincel', icon: Paintbrush };
      case 'eraser':
        return { label: 'Borrador', icon: Eraser };
      case 'bucket':
        return { label: 'Bote de Pintura', icon: PaintBucket };
      case 'magic_wand':
        return { label: 'Varita Mágica', icon: Wand2 };
      case 'select_rect':
        return { label: 'Selección Rect.', icon: Scan };
      case 'select_ellipse':
        return { label: 'Selección Elípt.', icon: Circle };
      case 'lasso':
        return { label: 'Lazo', icon: Lasso };
      case 'move':
        return { label: 'Mover', icon: MousePointer2 };
      case 'direct_select':
        return { label: 'Selección Directa', icon: MousePointer };
      case 'line':
        return { label: 'Línea Vectorial', icon: Slash };
      case 'zoom':
        return { label: 'Lupa', icon: ZoomIn };
      case 'eyedropper':
        return { label: 'Cuentagotas', icon: Pipette };
      case 'text':
        return { label: 'Texto', icon: Type };
      case 'hitbox':
        return { label: 'Hitboxes', icon: ShieldAlert };
      case 'hand':
        return { label: 'Mano', icon: Hand };
      case 'canvas_edit':
        return { label: 'Editar Lienzo', icon: Expand };
      case 'tile':
        return { label: 'Herramienta Tiles', icon: Grid };
      default: {
        const custom = CUSTOM_TOOL_OPTIONS_REGISTRY.get(activeContextMode);
        return { label: custom?.label || 'Herramienta', icon: SlidersHorizontal };
      }
    }
  }, [activeContextMode, activeFilterSession, selectedShape, shapeConfig.shapeKind]);

  if (!barState.visible) return null;

  const HeaderIcon = contextHeaderInfo.icon;

  // Floating bar drag handlers
  const handleStartFloatDrag = (e: React.PointerEvent) => {
    if (!barState.floating) return;
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: barState.floatX,
      origY: barState.floatY,
    };
    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      const nx = Math.max(8, Math.min(window.innerWidth - 260, dragRef.current.origX + (ev.clientX - dragRef.current.startX)));
      const ny = Math.max(8, Math.min(window.innerHeight - 56, dragRef.current.origY + (ev.clientY - dragRef.current.startY)));
      onChangeBarState({ ...barState, floatX: nx, floatY: ny });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Helper to update either selected parametric shape OR default shapeConfig seamlessly
  const patchShapeProp = (
    cfgPatch: Partial<ShapeToolConfig>,
    objPatch: Partial<ParametricShapeObject>
  ) => {
    onChangeShapeConfig({ ...shapeConfig, ...cfgPatch });
    if (selectedShape) {
      onUpdateSelectedShape(objPatch);
    }
  };

  // Active shape parameters (live selected shape takes priority over creation defaults)
  const activeShapeKind: ShapeToolKind = selectedShape?.kind || shapeConfig.shapeKind;
  const activeShapeFilled = selectedShape ? selectedShape.filled : shapeConfig.filled;
  const activeShapeStroke = selectedShape ? selectedShape.strokeEnabled : shapeConfig.strokeEnabled;
  const activeShapeStrokeW = selectedShape ? selectedShape.strokeWidth : shapeConfig.strokeWidth;
  const activeShapeRadius = selectedShape ? selectedShape.cornerRadius : shapeConfig.cornerRadius;
  const activeShapeIndep = selectedShape ? selectedShape.independentCorners : Boolean(shapeConfig.independentCorners);
  const activeShapeRadii = selectedShape
    ? selectedShape.cornerRadii
    : shapeConfig.cornerRadii || [activeShapeRadius, activeShapeRadius, activeShapeRadius, activeShapeRadius];
  const activeShapeAA = selectedShape ? selectedShape.antiAlias : shapeConfig.antiAlias;
  const activeShapePP = selectedShape ? selectedShape.pixelPerfect : shapeConfig.pixelPerfect;
  const activeShapeDither = selectedShape ? selectedShape.useDither : shapeConfig.useDither;
  const activeShapeGrad = selectedShape ? selectedShape.useGradient : shapeConfig.useGradient;
  const activeShapeOpacity = Math.round((selectedShape ? selectedShape.opacity : shapeConfig.opacity ?? 1) * 100);

  const renderContextualControls = () => {
    // 1. ACTIVE FILTER QUICK BAR
    if (activeContextMode === 'filter' && activeFilterSession) {
      return (
        <>
          <SliderField
            label="Intensidad"
            keywords="fuerza intensidad filtro"
            value={activeFilterSession.intensity}
            min={0}
            max={100}
            unit="%"
            widthClass="w-20"
            onChange={(v) => onUpdateFilterSession({ intensity: v })}
          />
          <ToggleBtn
            active={activeFilterSession.previewEnabled}
            onClick={() => onUpdateFilterSession({ previewEnabled: !activeFilterSession.previewEnabled })}
            label="Previsualización"
            keywords="vista previa preview filtro"
            icon={activeFilterSession.previewEnabled ? Eye : EyeOff}
          />
          <ToggleBtn
            active={activeFilterSession.beforeAfterSplit}
            onClick={() => onUpdateFilterSession({ beforeAfterSplit: !activeFilterSession.beforeAfterSplit })}
            label="Antes / Después"
            keywords="comparar antes despues split"
            icon={SplitSquareHorizontal}
          />
          {activeFilterSession.beforeAfterSplit && (
            <SliderField
              label="División"
              keywords="split divisor antes despues"
              value={activeFilterSession.splitPct}
              min={10}
              max={90}
              unit="%"
              onChange={(v) => onUpdateFilterSession({ splitPct: v })}
            />
          )}
          <Sep />
          <ActionBtn
            onClick={onConfirmFilterSession}
            label="Confirmar"
            keywords="aplicar aceptar ok"
            icon={Check}
            variant="primary"
          />
          <ActionBtn
            onClick={onResetFilterSession}
            label="Restablecer"
            keywords="reset reiniciar"
            icon={RotateCcw}
          />
          <ActionBtn
            onClick={onCancelFilterSession}
            label="Cancelar"
            keywords="cerrar descartar"
            icon={X}
            variant="danger"
          />
        </>
      );
    }

    // 2. AI QUICK BAR
    if (activeContextMode === 'ai') {
      return (
        <>
          {matchesFilter('prompt texto descripcion ia generar') && (
            <input
              type="text"
              value={quickAiOptions.prompt}
              onChange={(e) => onChangeQuickAiOptions({ ...quickAiOptions, prompt: e.target.value })}
              placeholder="Prompt IA (ej. slash fuego azul, escudo dorado...)"
              className="h-6 px-2 rounded border text-[10px] w-48 outline-none"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            />
          )}
          <SliderField
            label="Intensidad"
            keywords="intensidad fuerza peso ia"
            value={quickAiOptions.intensity}
            min={10}
            max={100}
            unit="%"
            onChange={(v) => onChangeQuickAiOptions({ ...quickAiOptions, intensity: v })}
          />
          <SelectField
            label="Estilo"
            keywords="estilo retro arcade cyberpunk anime fantasia"
            value={quickAiOptions.style}
            onChange={(v) => onChangeQuickAiOptions({ ...quickAiOptions, style: v as QuickAiStyleId })}
            options={[
              { value: 'arcade_cps2', label: 'Arcade CPS2' },
              { value: 'retro_16bit', label: 'Retro 16-bit' },
              { value: 'cyberpunk', label: 'Cyberpunk' },
              { value: 'anime_cel', label: 'Anime Cel' },
              { value: 'dark_fantasy', label: 'Fantasía Oscura' },
            ]}
          />
          <ToggleBtn
            active={quickAiOptions.useReference}
            onClick={() => onChangeQuickAiOptions({ ...quickAiOptions, useReference: !quickAiOptions.useReference })}
            label="Referencia"
            keywords="paleta guia referencia"
            icon={ImageIcon}
          />
          <ToggleBtn
            active={quickAiOptions.adaptToCanvas}
            onClick={() => onChangeQuickAiOptions({ ...quickAiOptions, adaptToCanvas: !quickAiOptions.adaptToCanvas })}
            label="Adaptar lienzo"
            keywords="adaptacion lienzo escala"
            icon={Maximize2}
          />
          <NumberField
            label="Var."
            keywords="variaciones cantidad"
            value={quickAiOptions.variations}
            min={1}
            max={4}
            onChange={(v) => onChangeQuickAiOptions({ ...quickAiOptions, variations: Math.round(v) })}
          />
          <ActionBtn
            onClick={onGenerateQuickAi}
            disabled={isGeneratingQuickAi}
            label={isGeneratingQuickAi ? 'Generando...' : 'Generar'}
            keywords="crear ejecutar generar ia"
            icon={Sparkles}
            variant="primary"
          />
          <ActionBtn
            onClick={onToggleAiBar}
            label="Volver"
            keywords="cerrar ia"
            icon={X}
          />
        </>
      );
    }

    // 3. SYMMETRY DEDICATED BAR
    if (activeContextMode === 'symmetry') {
      return (
        <>
          <ToggleBtn
            active={symmetryConfig.enabled}
            onClick={() =>
              onChangeSymmetryConfig({
                ...symmetryConfig,
                enabled: !symmetryConfig.enabled,
                mode: !symmetryConfig.enabled && symmetryConfig.mode === 'none' ? 'vertical' : symmetryConfig.mode,
              })
            }
            label="Activar"
            keywords="activar simetria encender"
            icon={FlipHorizontal2}
            tone="emerald"
          />
          <Sep />
          {(
            [
              ['vertical', 'Vertical'],
              ['horizontal', 'Horizontal'],
              ['quad', 'Cuatro ejes'],
              ['octal', 'Ocho ejes'],
              ['radial', 'Radial'],
            ] as const
          ).map(([mode, lbl]) => (
            <ToggleBtn
              key={mode}
              active={symmetryConfig.enabled && symmetryConfig.mode === mode}
              onClick={() => onChangeSymmetryConfig({ ...symmetryConfig, enabled: true, mode })}
              label={lbl}
              keywords={`simetria espejo eje ${lbl}`}
            />
          ))}
          <NumberField
            label="Puntos"
            keywords="cantidad puntos segmentos radial"
            value={symmetryConfig.radialPoints || 6}
            min={2}
            max={24}
            onChange={(v) =>
              onChangeSymmetryConfig({ ...symmetryConfig, enabled: true, mode: 'radial', radialPoints: Math.round(v) })
            }
          />
          <ToggleBtn
            active={symmetryConfig.showAxes}
            onClick={() => onChangeSymmetryConfig({ ...symmetryConfig, showAxes: !symmetryConfig.showAxes })}
            label="Mostrar ejes"
            keywords="mostrar ejes guias visible"
            icon={symmetryConfig.showAxes ? Eye : EyeOff}
          />
          <Sep />
          <ActionBtn onClick={onToggleSymmetryBar} label="Cerrar" icon={X} />
        </>
      );
    }

    const maxCanvasDim = Math.max(canvasWidth, canvasHeight);
    const dynamicBrushMax = Math.max(256, Math.ceil(maxCanvasDim * 1.25), brushSize);
    const dynamicRadiusMax = Math.max(64, Math.floor(Math.min(canvasWidth, canvasHeight) / 2));
    const dynamicStrokeMax = Math.max(128, Math.ceil(maxCanvasDim / 2));
    const quickBrushSizeOptions = [
      { value: '1', label: '1 px' },
      { value: '2', label: '2 px' },
      { value: '4', label: '4 px' },
      { value: '8', label: '8 px' },
      { value: '16', label: '16 px' },
      { value: '32', label: '32 px' },
      { value: '64', label: '64 px' },
      { value: '128', label: '128 px' },
      { value: '256', label: '256 px' },
    ];

    // 4. LÁPIZ (Pencil Mode)
    if (activeContextMode === 'pencil') {
      return (
        <>
          <ToggleBtn
            active={true}
            onClick={() => onChangePencilSubMode('pencil')}
            label="Lápiz"
            keywords="tipo pincel lapiz modo"
            icon={Pencil}
          />
          <ToggleBtn
            active={false}
            onClick={() => onChangePencilSubMode('brush')}
            label="Pincel"
            keywords="tipo pincel brocha cambiar"
            icon={Paintbrush}
          />
          <Sep />
          <SliderField
            label="Tamaño"
            keywords="tamano grosor px"
            value={brushSize}
            min={1}
            max={dynamicBrushMax}
            defaultValue={1}
            unit="px"
            allowManualOverflow
            hardMax={2048}
            onChange={onChangeBrushSize}
          />
          <SelectField
            keywords="preset tamano rapido pincel 1 2 4 8 16 32 64 128 256"
            value={quickBrushSizeOptions.some((o) => Number(o.value) === brushSize) ? String(brushSize) : 'custom'}
            onChange={(v) => {
              const parsed = parseInt(v, 10);
              if (!Number.isNaN(parsed)) onChangeBrushSize(parsed);
            }}
            options={[
              ...quickBrushSizeOptions,
              ...(!quickBrushSizeOptions.some((o) => Number(o.value) === brushSize)
                ? [{ value: 'custom', label: `${brushSize} px` }]
                : []),
            ]}
          />
          <SliderField
            label="Dureza"
            keywords="dureza borde"
            value={Math.round((brushSettings.hardness ?? 1) * 100)}
            min={0}
            max={100}
            defaultValue={100}
            unit="%"
            onChange={(v) => onChangeBrushSettings({ ...brushSettings, hardness: v / 100 })}
          />
          <SliderField
            label="Opacidad"
            keywords="opacidad transparencia"
            value={Math.round((brushSettings.opacity ?? 1) * 100)}
            min={5}
            max={100}
            defaultValue={100}
            unit="%"
            onChange={(v) => onChangeBrushSettings({ ...brushSettings, opacity: v / 100 })}
          />
          <SliderField
            label="Flujo"
            keywords="flujo caudal"
            value={Math.round((brushSettings.flow ?? 1) * 100)}
            min={5}
            max={100}
            defaultValue={100}
            unit="%"
            onChange={(v) => onChangeBrushSettings({ ...brushSettings, flow: v / 100 })}
          />
          <SliderField
            label="Estabilizador"
            keywords="suavizado estabilizacion pulso linea"
            value={brushSettings.stabilizer ?? 0}
            min={0}
            max={10}
            defaultValue={0}
            onChange={(v) => onChangeBrushSettings({ ...brushSettings, stabilizer: Math.round(v) })}
          />
          <ToggleBtn
            active={pixelPerfect}
            onClick={onTogglePixelPerfect}
            label="Pixel Perfect"
            keywords="pixel perfect nitido"
            icon={Grid}
          />
          <ToggleBtn
            active={symmetryConfig.enabled}
            onClick={() =>
              onChangeSymmetryConfig({
                ...symmetryConfig,
                enabled: !symmetryConfig.enabled,
                mode: !symmetryConfig.enabled && symmetryConfig.mode === 'none' ? 'vertical' : symmetryConfig.mode,
              })
            }
            label="Simetría"
            keywords="simetria espejo activa"
            icon={FlipHorizontal2}
            tone="emerald"
          />
          <ToggleBtn
            active={Boolean(ditherConfig.enabled)}
            onClick={() => onChangeDitherConfig({ ...ditherConfig, enabled: !ditherConfig.enabled })}
            label="Dithering"
            keywords="dither trama tramado"
            icon={Grid}
            tone="amber"
          />
          {ditherConfig.enabled && (
            <SliderField
              label="Dens."
              keywords="densidad dithering trama"
              value={Math.round((ditherConfig.density ?? 0.5) * 100)}
              min={5}
              max={100}
              defaultValue={50}
              unit="%"
              onChange={(v) => onChangeDitherConfig({ ...ditherConfig, density: v / 100 })}
            />
          )}
          <SelectField
            label="Tipo"
            keywords="tipo pincel aerografo lapiz solido"
            value={brushSettings.airbrushMode ? 'airbrush' : brushSettings.smearEnabled ? 'smear' : brushSettings.celShadeEnabled ? 'cel' : 'pixel'}
            onChange={(v) =>
              onChangeBrushSettings({
                ...brushSettings,
                airbrushMode: v === 'airbrush',
                smearEnabled: v === 'smear',
                celShadeEnabled: v === 'cel',
              })
            }
            options={[
              { value: 'pixel', label: 'Lápiz Pixel' },
              { value: 'airbrush', label: 'Aerógrafo' },
              { value: 'smear', label: 'Smear' },
              { value: 'cel', label: 'Cel Shading' },
            ]}
          />
          <SelectField
            label="Forma"
            keywords="forma punta cuadrado circulo diamante cruz spray"
            value={brushSettings.shape}
            onChange={(v) => onChangeBrushSettings({ ...brushSettings, shape: v as BrushShape })}
            options={[
              { value: 'square', label: 'Cuadrado' },
              { value: 'circle', label: 'Círculo' },
              { value: 'diamond', label: 'Diamante' },
              { value: 'slash_right', label: 'Trazo /' },
              { value: 'slash_left', label: 'Trazo \\' },
              { value: 'spray', label: 'Spray' },
            ]}
          />
        </>
      );
    }

    // 5. PINCEL (Brush Mode)
    if (activeContextMode === 'brush') {
      return (
        <>
          <ToggleBtn
            active={false}
            onClick={() => onChangePencilSubMode('pencil')}
            label="Lápiz"
            keywords="cambiar lapiz"
            icon={Pencil}
          />
          <ToggleBtn
            active={true}
            onClick={() => onChangePencilSubMode('brush')}
            label="Pincel"
            keywords="modo pincel"
            icon={Paintbrush}
          />
          <Sep />
          <SliderField
            label="Tamaño"
            keywords="tamano grosor"
            value={brushSize}
            min={1}
            max={dynamicBrushMax}
            defaultValue={1}
            unit="px"
            allowManualOverflow
            hardMax={2048}
            onChange={onChangeBrushSize}
          />
          <SelectField
            keywords="preset tamano rapido pincel 1 2 4 8 16 32 64 128 256"
            value={quickBrushSizeOptions.some((o) => Number(o.value) === brushSize) ? String(brushSize) : 'custom'}
            onChange={(v) => {
              const parsed = parseInt(v, 10);
              if (!Number.isNaN(parsed)) onChangeBrushSize(parsed);
            }}
            options={[
              ...quickBrushSizeOptions,
              ...(!quickBrushSizeOptions.some((o) => Number(o.value) === brushSize)
                ? [{ value: 'custom', label: `${brushSize} px` }]
                : []),
            ]}
          />
          <SliderField
            label="Opacidad"
            keywords="opacidad"
            value={Math.round((brushSettings.opacity ?? 1) * 100)}
            min={5}
            max={100}
            defaultValue={100}
            unit="%"
            onChange={(v) => onChangeBrushSettings({ ...brushSettings, opacity: v / 100 })}
          />
          <SliderField
            label="Flujo"
            keywords="flujo"
            value={Math.round((brushSettings.flow ?? 1) * 100)}
            min={5}
            max={100}
            defaultValue={100}
            unit="%"
            onChange={(v) => onChangeBrushSettings({ ...brushSettings, flow: v / 100 })}
          />
          <SliderField
            label="Espaciado"
            keywords="espaciado paso"
            value={Math.round((brushSettings.spacing ?? 1) * 10)}
            min={10}
            max={256}
            defaultValue={10}
            allowManualOverflow
            hardMax={1000}
            onChange={(v) => onChangeBrushSettings({ ...brushSettings, spacing: v / 10 })}
          />
          <SliderField
            label="Estabilizador"
            keywords="suavizado estabilizacion pulso"
            value={brushSettings.stabilizer ?? 0}
            min={0}
            max={10}
            defaultValue={0}
            onChange={(v) => onChangeBrushSettings({ ...brushSettings, stabilizer: Math.round(v) })}
          />
          <SelectField
            label="Textura"
            keywords="textura ruido papel lienzo trama"
            value={brushSettings.texture || 'none'}
            onChange={(v) => onChangeBrushSettings({ ...brushSettings, texture: v as BrushTextureType })}
            options={[
              { value: 'none', label: 'Ninguna' },
              { value: 'noise', label: 'Ruido' },
              { value: 'paper', label: 'Papel' },
              { value: 'canvas', label: 'Lienzo' },
              { value: 'dots', label: 'Puntos' },
              { value: 'crosshatch', label: 'Trama' },
            ]}
          />
          <NumberField
            label="Rot."
            keywords="rotacion angulo giro"
            value={brushSettings.rotation ?? 0}
            min={0}
            max={360}
            defaultValue={0}
            unit="°"
            onChange={(v) => onChangeBrushSettings({ ...brushSettings, rotation: v })}
          />
          <ToggleBtn
            active={Boolean(ditherConfig.enabled)}
            onClick={() => onChangeDitherConfig({ ...ditherConfig, enabled: !ditherConfig.enabled })}
            label="Dithering"
            keywords="dither"
            icon={Grid}
            tone="amber"
          />
          {ditherConfig.enabled && (
            <SliderField
              label="Dens."
              keywords="densidad dithering trama"
              value={Math.round((ditherConfig.density ?? 0.5) * 100)}
              min={5}
              max={100}
              defaultValue={50}
              unit="%"
              onChange={(v) => onChangeDitherConfig({ ...ditherConfig, density: v / 100 })}
            />
          )}
          <ToggleBtn
            active={Boolean(brushSettings.smearEnabled)}
            onClick={() =>
              onChangeBrushSettings({
                ...brushSettings,
                smearEnabled: !brushSettings.smearEnabled,
                celShadeEnabled: !brushSettings.smearEnabled ? false : brushSettings.celShadeEnabled,
              })
            }
            label="Smear"
            keywords="smear difuminar arrastre"
            icon={Wind}
            tone="emerald"
          />
          <ToggleBtn
            active={Boolean(brushSettings.celShadeEnabled)}
            onClick={() =>
              onChangeBrushSettings({
                ...brushSettings,
                celShadeEnabled: !brushSettings.celShadeEnabled,
                smearEnabled: !brushSettings.celShadeEnabled ? false : brushSettings.smearEnabled,
              })
            }
            label="Cel Shading"
            keywords="cel shading sombra brillo"
            icon={SunMoon}
            tone="amber"
          />
        </>
      );
    }

    // 6. BORRADOR (Eraser)
    if (activeContextMode === 'eraser') {
      return (
        <>
          <SliderField
            label="Tamaño"
            keywords="tamano borrador"
            value={brushSize}
            min={1}
            max={dynamicBrushMax}
            defaultValue={1}
            unit="px"
            allowManualOverflow
            hardMax={2048}
            onChange={onChangeBrushSize}
          />
          <SelectField
            keywords="preset tamano rapido borrador 1 2 4 8 16 32 64 128 256"
            value={quickBrushSizeOptions.some((o) => Number(o.value) === brushSize) ? String(brushSize) : 'custom'}
            onChange={(v) => {
              const parsed = parseInt(v, 10);
              if (!Number.isNaN(parsed)) onChangeBrushSize(parsed);
            }}
            options={[
              ...quickBrushSizeOptions,
              ...(!quickBrushSizeOptions.some((o) => Number(o.value) === brushSize)
                ? [{ value: 'custom', label: `${brushSize} px` }]
                : []),
            ]}
          />
          <SliderField
            label="Dureza"
            keywords="dureza borde"
            value={eraserOptions.hardness}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => onChangeEraserOptions({ ...eraserOptions, hardness: v })}
          />
          <SliderField
            label="Opacidad"
            keywords="opacidad"
            value={Math.round(eraserOptions.opacity * 100)}
            min={5}
            max={100}
            unit="%"
            onChange={(v) => onChangeEraserOptions({ ...eraserOptions, opacity: v / 100 })}
          />
          <SliderField
            label="Flujo"
            keywords="flujo"
            value={Math.round(eraserOptions.flow * 100)}
            min={5}
            max={100}
            unit="%"
            onChange={(v) => onChangeEraserOptions({ ...eraserOptions, flow: v / 100 })}
          />
          <ToggleBtn
            active={eraserOptions.antiAlias}
            onClick={() =>
              onChangeEraserOptions({
                ...eraserOptions,
                antiAlias: !eraserOptions.antiAlias,
                pixelPerfect: !eraserOptions.antiAlias ? false : eraserOptions.pixelPerfect,
              })
            }
            label="Antialiasing"
            keywords="antialiasing suavizado"
          />
          <ToggleBtn
            active={eraserOptions.pixelPerfect}
            onClick={() =>
              onChangeEraserOptions({
                ...eraserOptions,
                pixelPerfect: !eraserOptions.pixelPerfect,
                antiAlias: !eraserOptions.pixelPerfect ? false : eraserOptions.antiAlias,
              })
            }
            label="Pixel Perfect"
            keywords="pixel perfect"
            icon={Grid}
          />
          <SelectField
            label="Forma"
            keywords="forma borrador cuadrado circulo"
            value={eraserOptions.shape}
            onChange={(v) => onChangeEraserOptions({ ...eraserOptions, shape: v as BrushShape })}
            options={[
              { value: 'square', label: 'Cuadrado' },
              { value: 'circle', label: 'Círculo' },
              { value: 'diamond', label: 'Diamante' },
              { value: 'slash_right', label: 'Trazo /' },
              { value: 'slash_left', label: 'Trazo \\' },
              { value: 'spray', label: 'Spray' },
            ]}
          />
        </>
      );
    }

    // 7. BOTE DE PINTURA (Bucket + Gradient + Dithered Gradient)
    if (activeContextMode === 'bucket') {
      return (
        <>
          <SliderField
            label="Tolerancia"
            keywords="tolerancia umbral color"
            value={bucketOptions.tolerance}
            min={0}
            max={255}
            onChange={(v) => onChangeBucketOptions({ ...bucketOptions, tolerance: v })}
          />
          <ToggleBtn
            active={bucketOptions.contiguous && !bucketOptions.globalFill}
            onClick={() => {
              const nextContiguous = !(bucketOptions.contiguous && !bucketOptions.globalFill);
              onChangeBucketOptions({
                ...bucketOptions,
                contiguous: nextContiguous,
                globalFill: !nextContiguous,
              });
            }}
            label={bucketOptions.contiguous && !bucketOptions.globalFill ? 'Contiguo' : 'Global'}
            keywords="contiguo adyacente relleno global reemplazar color"
            icon={Droplet}
            title="Activo: rellena solo la región contigua · Desactivado: relleno global en toda la capa"
          />
          <ToggleBtn
            active={bucketOptions.allLayers}
            onClick={() => onChangeBucketOptions({ ...bucketOptions, allLayers: !bucketOptions.allLayers })}
            label="Todas las capas"
            keywords="todas capas muestra compuesta"
            icon={Layers}
          />
          <ToggleBtn
            active={bucketOptions.ignoreTransparency}
            onClick={() =>
              onChangeBucketOptions({ ...bucketOptions, ignoreTransparency: !bucketOptions.ignoreTransparency })
            }
            label="Ignorar transp."
            keywords="ignorar transparencia alfa"
          />
          <NumberField
            label="Expandir"
            keywords="expandir seleccion relleno px"
            value={bucketOptions.expandPx}
            min={0}
            max={32}
            unit="px"
            allowManualOverflow
            hardMax={256}
            onChange={(v) => onChangeBucketOptions({ ...bucketOptions, expandPx: Math.round(v) })}
          />
          <Sep />
          <ToggleBtn
            active={bucketSubTool === 'dither_gradient' || (bucketSubTool === 'solid' && Boolean(ditherConfig.enabled))}
            onClick={() => {
              if (bucketSubTool === 'gradient') onChangeBucketSubTool('dither_gradient');
              else if (bucketSubTool === 'dither_gradient') onChangeBucketSubTool('gradient');
              else onChangeDitherConfig({ ...ditherConfig, enabled: !ditherConfig.enabled });
            }}
            label="Dithering"
            keywords="dithering trama bayer"
            icon={Grid}
            tone="amber"
          />
          <ToggleBtn
            active={bucketSubTool !== 'solid'}
            onClick={() => onChangeBucketSubTool(bucketSubTool === 'solid' ? 'gradient' : 'solid')}
            label="Degradado"
            keywords="degradado gradient"
            icon={Blend}
          />
          {bucketSubTool !== 'solid' && (
            <>
              <SelectField
                label="Tipo"
                keywords="tipo degradado lineal radial angular reflejado diamante"
                value={gradientConfig.type}
                onChange={(v) => onChangeGradientConfig({ ...gradientConfig, type: v as GradientType })}
                options={[
                  { value: 'linear', label: 'Lineal' },
                  { value: 'radial', label: 'Radial' },
                  { value: 'angular', label: 'Angular' },
                  { value: 'reflected', label: 'Reflejado' },
                  { value: 'diamond', label: 'Diamante' },
                ]}
              />
              {bucketSubTool === 'dither_gradient' && (
                <SelectField
                  label="Alg."
                  keywords="algoritmo bayer ordenado ruido matriz"
                  value={gradientConfig.ditherAlgorithm}
                  onChange={(v) =>
                    onChangeGradientConfig({ ...gradientConfig, ditherAlgorithm: v as GradientDitherAlgorithm })
                  }
                  options={[
                    { value: 'bayer', label: 'Bayer' },
                    { value: 'ordered', label: 'Ordenado' },
                    { value: 'custom', label: 'Personalizado' },
                    { value: 'noise', label: 'Ruido' },
                  ]}
                />
              )}
              <SliderField
                label="Intens."
                keywords="intensidad degradado dithering"
                value={gradientConfig.intensity}
                min={0}
                max={100}
                defaultValue={100}
                unit="%"
                onChange={(v) => onChangeGradientConfig({ ...gradientConfig, intensity: v })}
              />
              <SliderField
                label="Contraste"
                keywords="contraste degradado transicion"
                value={gradientConfig.contrast}
                min={-50}
                max={50}
                defaultValue={0}
                unit="%"
                onChange={(v) => onChangeGradientConfig({ ...gradientConfig, contrast: v })}
              />
              <ToggleBtn
                active={gradientConfig.reverse}
                onClick={() => onChangeGradientConfig({ ...gradientConfig, reverse: !gradientConfig.reverse })}
                label="Invertir"
                keywords="invertir direccion degradado"
              />
            </>
          )}
        </>
      );
    }

    const renderSelectionBooleanControls = () => (
      <>
        {(
          [
            ['replace', 'Nueva selección', Scan, 'Nueva selección', 'accent'],
            ['add', 'Añadir selección', Plus, 'Añadir selección (Shift)', 'emerald'],
            ['subtract', 'Restar selección', Minus, 'Restar selección (Alt)', 'rose'],
            ['intersect', 'Intersecar selección', Combine, 'Intersecar selección (Shift + Alt)', 'amber'],
          ] as const
        ).map(([op, lbl, Ic, tip, tone]) => (
          <ToggleBtn
            key={op}
            active={selectionOptions.opMode === op}
            onClick={() =>
              onChangeSelectionOptions({ ...selectionOptions, opMode: op as SelectionBooleanMode })
            }
            label={lbl}
            title={tip}
            tone={tone}
            keywords={`booleano modo ${lbl} seleccion`}
            icon={Ic}
          />
        ))}
      </>
    );

    // 8. VARITA MÁGICA (Magic Wand)
    if (activeContextMode === 'magic_wand') {
      return (
        <>
          {renderSelectionBooleanControls()}
          <Sep />
          <SliderField
            label="Tolerancia"
            keywords="tolerancia color varita"
            value={magicWandOptions.tolerance}
            min={0}
            max={255}
            onChange={(v) => onChangeMagicWandOptions({ ...magicWandOptions, tolerance: v })}
          />
          <ToggleBtn
            active={magicWandOptions.contiguous}
            onClick={() => onChangeMagicWandOptions({ ...magicWandOptions, contiguous: !magicWandOptions.contiguous })}
            label="Contiguo"
            keywords="contiguo"
          />
          <ToggleBtn
            active={magicWandOptions.allLayers}
            onClick={() => onChangeMagicWandOptions({ ...magicWandOptions, allLayers: !magicWandOptions.allLayers })}
            label="Todas las capas"
            keywords="todas capas"
            icon={Layers}
          />
          <ToggleBtn
            active={magicWandOptions.smooth}
            onClick={() => onChangeMagicWandOptions({ ...magicWandOptions, smooth: !magicWandOptions.smooth })}
            label="Suavizado"
            keywords="suavizado bordes"
          />
          <Sep />
          <ActionBtn
            onClick={() => onMorphSelection(1)}
            disabled={!hasActiveSelection}
            label="Expandir +1px"
            keywords="expandir seleccion crecer"
            icon={Expand}
          />
          <ActionBtn
            onClick={() => onMorphSelection(-1)}
            disabled={!hasActiveSelection}
            label="Contraer -1px"
            keywords="contraer seleccion reducir"
            icon={Shrink}
          />
        </>
      );
    }

    // 9. SELECCIÓN RECTANGULAR
    if (activeContextMode === 'select_rect') {
      return (
        <>
          <SelectField
            label="Modo"
            keywords="modo seleccion general objetos capas referencias vectores nodos"
            value={selectionSubTool}
            onChange={(v) => onChangeSelectionSubTool(v as SelectionSubTool)}
            options={[
              { value: 'general', label: 'General' },
              { value: 'objects', label: 'Objetos' },
              { value: 'layers', label: 'Capas' },
              { value: 'references', label: 'Referencias' },
              { value: 'vectors', label: 'Vectores' },
              { value: 'nodes', label: 'Nodos' },
            ]}
          />
          <ToggleBtn
            active={true}
            onClick={() => onChangeMarqueeShape('rect')}
            label="Rect."
            keywords="rectangular"
            icon={Square}
          />
          <ToggleBtn
            active={false}
            onClick={() => onChangeMarqueeShape('ellipse')}
            label="Elipse"
            keywords="eliptica circulo"
            icon={Circle}
          />
          <Sep />
          {renderSelectionBooleanControls()}
          <Sep />
          <ToggleBtn
            active={selectionOptions.fixedRatio}
            onClick={() => onChangeSelectionOptions({ ...selectionOptions, fixedRatio: !selectionOptions.fixedRatio })}
            label="Proporción fija"
            keywords="proporcion fija ratio 1:1 cuadrado"
          />
          {selectionOptions.fixedRatio && (
            <SelectField
              keywords="ratio proporcion"
              value={`${selectionOptions.ratioW}:${selectionOptions.ratioH}`}
              onChange={(v) => {
                const [w, h] = v.split(':').map(Number);
                onChangeSelectionOptions({ ...selectionOptions, ratioW: w || 1, ratioH: h || 1 });
              }}
              options={[
                { value: '1:1', label: '1:1' },
                { value: '4:3', label: '4:3' },
                { value: '16:9', label: '16:9' },
                { value: '2:1', label: '2:1' },
              ]}
            />
          )}
          <ToggleBtn
            active={selectionOptions.roundedCorners}
            onClick={() =>
              onChangeSelectionOptions({ ...selectionOptions, roundedCorners: !selectionOptions.roundedCorners })
            }
            label="Esq. redondeadas"
            keywords="esquinas redondeadas radio"
          />
          {selectionOptions.roundedCorners && (
            <NumberField
              label="R"
              keywords="radio esquina"
              value={selectionOptions.cornerRadius}
              min={1}
              max={dynamicRadiusMax}
              unit="px"
              allowManualOverflow
              hardMax={1024}
              onChange={(v) => onChangeSelectionOptions({ ...selectionOptions, cornerRadius: Math.round(v) })}
            />
          )}
        </>
      );
    }

    // 10. SELECCIÓN ELÍPTICA
    if (activeContextMode === 'select_ellipse') {
      return (
        <>
          <ToggleBtn
            active={false}
            onClick={() => onChangeMarqueeShape('rect')}
            label="Rect."
            keywords="rectangular"
            icon={Square}
          />
          <ToggleBtn
            active={true}
            onClick={() => onChangeMarqueeShape('ellipse')}
            label="Elíptica"
            keywords="eliptica"
            icon={Circle}
          />
          <Sep />
          {renderSelectionBooleanControls()}
          <Sep />
          <ToggleBtn
            active={selectionOptions.perfectCircle}
            onClick={() =>
              onChangeSelectionOptions({ ...selectionOptions, perfectCircle: !selectionOptions.perfectCircle })
            }
            label="Círculo perfecto"
            keywords="circulo perfecto 1:1 proporcion"
            icon={Circle}
          />
          <ToggleBtn
            active={selectionOptions.smooth}
            onClick={() => onChangeSelectionOptions({ ...selectionOptions, smooth: !selectionOptions.smooth })}
            label="Suavizado"
            keywords="suavizado borde"
          />
        </>
      );
    }

    // 11. LAZO
    if (activeContextMode === 'lasso') {
      return (
        <>
          <ToggleBtn
            active={lassoMode === 'free'}
            onClick={() => onChangeLassoMode('free')}
            label="Lazo libre"
            keywords="lazo libre mano alzada"
            icon={Lasso}
          />
          <ToggleBtn
            active={lassoMode === 'polygon'}
            onClick={() => onChangeLassoMode('polygon')}
            label="Lazo poligonal"
            keywords="lazo poligonal recto"
            icon={Hexagon}
          />
          <ToggleBtn
            active={lassoMode === 'magnetic'}
            onClick={() => onChangeLassoMode('magnetic')}
            label="Lazo magnético"
            keywords="lazo magnetico bordes contorno"
            icon={Magnet}
          />
          <Sep />
          {renderSelectionBooleanControls()}
        </>
      );
    }

    // 12. MOVER
    if (activeContextMode === 'move') {
      return (
        <>
          <ToggleBtn
            active={moveSubTool === 'move_layer'}
            onClick={() => onChangeMoveSubTool('move_layer')}
            label="Mover capa"
            keywords="mover capa pixeles"
            icon={Layers}
          />
          <ToggleBtn
            active={moveSubTool === 'move_reference'}
            onClick={() => onChangeMoveSubTool('move_reference')}
            label="Mover referencia"
            keywords="mover referencia pureref"
            icon={ImageIcon}
          />
          <ToggleBtn
            active={moveSubTool === 'move_object'}
            onClick={() => onChangeMoveSubTool('move_object')}
            label="Mover objeto"
            keywords="mover objeto general inteligente"
            icon={MousePointer2}
          />
          <ToggleBtn
            active={moveSubTool === 'move_selection'}
            onClick={() => onChangeMoveSubTool('move_selection')}
            label="Mover sel."
            keywords="mover seleccion"
            icon={Scan}
          />
          <Sep />
          <ToggleBtn
            active={moveOptions.autoSelect}
            onClick={() => onChangeMoveOptions({ ...moveOptions, autoSelect: !moveOptions.autoSelect })}
            label="Auto seleccionar"
            keywords="auto seleccionar inteligente"
          />
          <ToggleBtn
            active={moveOptions.showControls}
            onClick={() => onChangeMoveOptions({ ...moveOptions, showControls: !moveOptions.showControls })}
            label="Mostrar controles"
            keywords="mostrar controles transformacion manejadores"
          />
          <ToggleBtn
            active={moveOptions.snapToGrid}
            onClick={() => onChangeMoveOptions({ ...moveOptions, snapToGrid: !moveOptions.snapToGrid })}
            label="Ajustar cuadrícula"
            keywords="ajustar snap cuadricula grid"
            icon={Grid}
          />
          <ToggleBtn
            active={moveOptions.snapToGuides}
            onClick={() => onChangeMoveOptions({ ...moveOptions, snapToGuides: !moveOptions.snapToGuides })}
            label="Ajustar guías"
            keywords="ajustar snap guias"
            icon={Magnet}
          />
          {moveSubTool !== 'move_reference' && onToggleLinkMoveAllFrames && (
            <>
              <Sep />
              <ToggleBtn
                active={linkMoveAllFrames}
                onClick={onToggleLinkMoveAllFrames}
                label="Todos los frames"
                keywords="mover todos fotogramas vinculados"
                icon={Link2}
                tone="emerald"
                title="Al desplazar este fotograma, mueve también todos los demás fotogramas"
              />
            </>
          )}
          {moveSubTool === 'move_reference' && onCenterAllReferences && (
            <>
              <Sep />
              <ActionBtn
                onClick={onCenterAllReferences}
                label="Centrar refs"
                keywords="centrar referencias camara lienzo"
                icon={Focus}
                variant="primary"
              />
            </>
          )}
        </>
      );
    }

    // 13. LÍNEA VECTORIAL
    if (activeContextMode === 'line') {
      return (
        <>
          <NumberField
            label="Grosor"
            keywords="grosor ancho trazo linea"
            value={vectorConfig.strokeWidth}
            min={1}
            max={dynamicStrokeMax}
            unit="px"
            allowManualOverflow
            hardMax={1024}
            onChange={(v) => onChangeVectorConfig({ ...vectorConfig, strokeWidth: Math.max(1, Math.round(v)) })}
          />
          {matchesFilter('color trazo linea') && (
            <label
              className="h-6 px-1.5 rounded border flex items-center gap-1 text-[10px] whitespace-nowrap shrink-0 cursor-pointer"
              style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
              title="Color de la línea vectorial"
            >
              {showText && <span className="opacity-75">Color</span>}
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => onSelectPrimaryColor(e.target.value)}
                className="w-4 h-4 rounded border-0 bg-transparent cursor-pointer p-0"
              />
            </label>
          )}
          <Sep />
          {(
            [
              ['straight', 'Recta'],
              ['bezier', 'Bézier'],
              ['polyline', 'Polilínea'],
              ['smooth', 'Curva'],
              ['spline', 'Spline'],
            ] as const
          ).map(([m, lbl]) => (
            <ToggleBtn
              key={m}
              active={vectorConfig.mode === m}
              onClick={() => onChangeVectorConfig({ ...vectorConfig, mode: m as VectorCreationMode })}
              label={lbl}
              keywords={`tipo linea ${lbl}`}
              icon={m === 'bezier' || m === 'smooth' ? Spline : Slash}
            />
          ))}
          <Sep />
          <ToggleBtn
            active={vectorConfig.pixelPerfect}
            onClick={() => onChangeVectorConfig({ ...vectorConfig, pixelPerfect: !vectorConfig.pixelPerfect })}
            label="Pixel Perfect"
            keywords="pixel perfect nitido"
            icon={Grid}
          />
          <ToggleBtn
            active={vectorConfirmPolicy === 'rasterize'}
            onClick={() => onChangeVectorConfirmPolicy('rasterize')}
            label="Rasterizar al confirmar"
            keywords="rasterizar pixeles confirmar"
          />
          <ToggleBtn
            active={vectorConfirmPolicy === 'keep'}
            onClick={() => onChangeVectorConfirmPolicy('keep')}
            label="Mantener vector"
            keywords="mantener vector editable"
          />
        </>
      );
    }

    // 14. SELECCIÓN DIRECTA (FLECHA BLANCA)
    if (activeContextMode === 'direct_select') {
      return (
        <>
          <ActionBtn
            onClick={() => onVectorNodeAction('add_node')}
            label="Añadir nodo"
            keywords="anadir insertar nodo punto"
            icon={Plus}
          />
          <ActionBtn
            onClick={() => onVectorNodeAction('delete_node')}
            label="Eliminar nodo"
            keywords="eliminar borrar nodo"
            icon={Minus}
            variant="danger"
          />
          <Sep />
          <ActionBtn
            onClick={() => onVectorNodeAction('convert_corner')}
            label="Convertir: Esquina"
            keywords="convertir nodo esquina vertice"
            icon={Diamond}
          />
          <ActionBtn
            onClick={() => onVectorNodeAction('convert_smooth')}
            label="Suavizar nodo"
            keywords="suavizar convertir nodo curva"
            icon={Spline}
          />
          <ActionBtn
            onClick={() => onVectorNodeAction('convert_symmetric')}
            label="Simétrico"
            keywords="convertir nodo simetrico"
            icon={Columns2}
          />
          <Sep />
          <ActionBtn
            onClick={() => onVectorNodeAction('break_tangents')}
            label="Romper tangentes"
            keywords="romper tangentes manejadores"
            icon={Unlink2}
          />
          <ActionBtn
            onClick={() => onVectorNodeAction('join_tangents')}
            label="Unir tangentes"
            keywords="unir enlazar tangentes"
            icon={Link2}
          />
        </>
      );
    }

    // 15. PARAMETRIC SHAPES (Rectángulo, Elipse, Polígono, Estrella, Flecha, Personalizada)
    if (activeContextMode === 'parametric_shape') {
      return (
        <>
          {/* Shape family selector */}
          <SelectField
            label="Forma"
            keywords="forma rectangulo elipse poligono estrella flecha personalizada"
            value={activeShapeKind}
            onChange={(v) => {
              const kind = v as ShapeToolKind;
              patchShapeProp({ shapeKind: kind }, { kind, name: SHAPE_KIND_LABELS[kind] });
              if (!selectedShape) {
                onSelectTool(kind === 'ellipse' ? 'circle' : 'rectangle');
              }
            }}
            options={[
              { value: 'rectangle', label: 'Rectángulo' },
              { value: 'ellipse', label: 'Elipse' },
              { value: 'polygon', label: 'Polígono' },
              { value: 'star', label: 'Estrella' },
              { value: 'arrow', label: 'Flecha' },
              { value: 'custom', label: 'Personalizada' },
            ]}
          />

          {/* Live geometry W / H / Rot when a shape is selected */}
          {selectedShape && (
            <>
              <NumberField
                label={activeShapeKind === 'arrow' ? 'Long.' : 'Ancho'}
                keywords="anchura longitud w width tamano"
                value={selectedShape.width}
                min={2}
                max={Math.max(512, maxCanvasDim * 2)}
                unit="px"
                allowManualOverflow
                hardMax={4096}
                onChange={(v) => onUpdateSelectedShape({ width: Math.max(2, v) })}
              />
              <NumberField
                label={activeShapeKind === 'arrow' ? 'Ancho' : 'Alto'}
                keywords="altura anchura h height tamano"
                value={selectedShape.height}
                min={2}
                max={Math.max(512, maxCanvasDim * 2)}
                unit="px"
                allowManualOverflow
                hardMax={4096}
                onChange={(v) => onUpdateSelectedShape({ height: Math.max(2, v) })}
              />
              <NumberField
                label="Rot."
                keywords="rotacion angulo giro"
                value={selectedShape.rotation}
                min={-180}
                max={180}
                unit="°"
                onChange={(v) => onUpdateSelectedShape({ rotation: v })}
              />
            </>
          )}

          <Sep />

          {/* Shape-specific parameters */}
          {activeShapeKind === 'rectangle' && (
            <>
              <ToggleBtn
                active={activeShapeRadius > 0 || shapeConfig.roundedCorners}
                onClick={() => {
                  const nextOn = !(activeShapeRadius > 0 || shapeConfig.roundedCorners);
                  const r = nextOn ? Math.max(2, activeShapeRadius || 4) : 0;
                  patchShapeProp(
                    { roundedCorners: nextOn, cornerRadius: r },
                    { cornerRadius: r, cornerRadii: [r, r, r, r], independentCorners: false }
                  );
                }}
                label="Redondeadas"
                keywords="esquinas redondeadas radio curvatura"
              />
              <NumberField
                label="Radio"
                keywords="radio esquina redondeado"
                value={activeShapeRadius}
                min={0}
                max={dynamicRadiusMax}
                unit="px"
                allowManualOverflow
                hardMax={1024}
                onChange={(v) =>
                  patchShapeProp(
                    { roundedCorners: v > 0, cornerRadius: v },
                    { cornerRadius: v, cornerRadii: [v, v, v, v], independentCorners: false }
                  )
                }
              />
              <ToggleBtn
                active={activeShapeIndep}
                onClick={() =>
                  patchShapeProp(
                    { independentCorners: !activeShapeIndep },
                    { independentCorners: !activeShapeIndep }
                  )
                }
                label="4 Esq."
                keywords="curvatura independiente por esquina"
                title="Radio independiente por cada esquina (también Alt+Arrastrar tirador)"
              />
              {activeShapeIndep && (
                <>
                  {(['SI', 'SD', 'ID', 'II'] as const).map((lbl, idx) => (
                    <NumberField
                      key={lbl}
                      label={lbl}
                      keywords={`esquina independiente ${lbl}`}
                      value={activeShapeRadii[idx] ?? 0}
                      min={0}
                      max={dynamicRadiusMax}
                      allowManualOverflow
                      hardMax={1024}
                      onChange={(v) => {
                        const next: [number, number, number, number] = [...activeShapeRadii];
                        next[idx] = v;
                        patchShapeProp({ independentCorners: true, cornerRadii: next }, { independentCorners: true, cornerRadii: next });
                      }}
                    />
                  ))}
                </>
              )}
            </>
          )}

          {activeShapeKind === 'ellipse' && (
            <>
              <SliderField
                label="Apertura"
                keywords="porcentaje apertura arco elipse"
                value={selectedShape ? selectedShape.arcSweepPct : shapeConfig.arcSweepPct ?? 100}
                min={5}
                max={100}
                unit="%"
                onChange={(v) =>
                  patchShapeProp(
                    { arcSweepPct: v, arcType: v < 100 && (shapeConfig.arcType || 'full') === 'full' ? 'pie' : shapeConfig.arcType },
                    {
                      arcSweepPct: v,
                      arcType: v < 100 && (selectedShape?.arcType || 'full') === 'full' ? 'pie' : selectedShape?.arcType,
                    }
                  )
                }
              />
              <SelectField
                label="Arco"
                keywords="tipo arco completo pastel cuerda abierto"
                value={selectedShape ? selectedShape.arcType : shapeConfig.arcType || 'full'}
                onChange={(v) => {
                  const t = v as EllipseArcType;
                  const sweep = t === 'full' ? 100 : (selectedShape?.arcSweepPct ?? shapeConfig.arcSweepPct ?? 75);
                  patchShapeProp(
                    { arcType: t, arcSweepPct: t === 'full' ? 100 : Math.min(95, sweep) },
                    { arcType: t, arcSweepPct: t === 'full' ? 100 : Math.min(95, sweep) }
                  );
                }}
                options={[
                  { value: 'full', label: 'Completo' },
                  { value: 'pie', label: 'Pastel' },
                  { value: 'chord', label: 'Cuerda' },
                  { value: 'open', label: 'Abierto' },
                ]}
              />
            </>
          )}

          {activeShapeKind === 'polygon' && (
            <>
              <NumberField
                label="Lados"
                keywords="numero lados poligono vertices"
                value={selectedShape ? selectedShape.sides : shapeConfig.sides ?? 6}
                min={3}
                max={24}
                onChange={(v) => patchShapeProp({ sides: Math.round(v) }, { sides: Math.round(v) })}
              />
              <SliderField
                label="R. Int."
                keywords="radio interno poligono"
                value={Math.round((selectedShape ? selectedShape.innerRadiusRatio : shapeConfig.innerRadiusRatio ?? 1) * 100)}
                min={15}
                max={100}
                unit="%"
                onChange={(v) => patchShapeProp({ innerRadiusRatio: v / 100 }, { innerRadiusRatio: v / 100 })}
              />
              <SliderField
                label="Redond."
                keywords="redondeado vertices poligono"
                value={Math.round((selectedShape ? selectedShape.vertexRoundness : shapeConfig.vertexRoundness ?? 0) * 100)}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => patchShapeProp({ vertexRoundness: v / 100 }, { vertexRoundness: v / 100 })}
              />
            </>
          )}

          {activeShapeKind === 'star' && (
            <>
              <NumberField
                label="Puntas"
                keywords="numero puntas estrella"
                value={selectedShape ? selectedShape.starPoints : shapeConfig.starPoints ?? 5}
                min={3}
                max={24}
                onChange={(v) => patchShapeProp({ starPoints: Math.round(v) }, { starPoints: Math.round(v) })}
              />
              <SliderField
                label="Profund."
                keywords="profundidad radio estrella"
                value={Math.round((selectedShape ? selectedShape.starDepth : shapeConfig.starDepth ?? 0.45) * 100)}
                min={15}
                max={95}
                unit="%"
                onChange={(v) => patchShapeProp({ starDepth: v / 100 }, { starDepth: v / 100 })}
              />
              <SliderField
                label="Simetría"
                keywords="simetria giro asimetria estrella"
                value={Math.round((selectedShape ? selectedShape.starSymmetry : shapeConfig.starSymmetry ?? 0) * 100)}
                min={-50}
                max={50}
                unit="%"
                onChange={(v) => patchShapeProp({ starSymmetry: v / 100 }, { starSymmetry: v / 100 })}
              />
            </>
          )}

          {activeShapeKind === 'arrow' && (
            <>
              <SliderField
                label="Cuerpo"
                keywords="anchura cuerpo flecha"
                value={Math.round((selectedShape ? selectedShape.arrowShaftWidth : shapeConfig.arrowShaftWidth ?? 0.38) * 100)}
                min={10}
                max={90}
                unit="%"
                onChange={(v) => patchShapeProp({ arrowShaftWidth: v / 100 }, { arrowShaftWidth: v / 100 })}
              />
              <SliderField
                label="Punta"
                keywords="tamano punta flecha"
                value={Math.round((selectedShape ? selectedShape.arrowHeadSize : shapeConfig.arrowHeadSize ?? 0.36) * 100)}
                min={15}
                max={85}
                unit="%"
                onChange={(v) => patchShapeProp({ arrowHeadSize: v / 100 }, { arrowHeadSize: v / 100 })}
              />
              <SelectField
                label="Tipo"
                keywords="tipo punta flecha triangulo diamante doble abierta"
                value={selectedShape ? selectedShape.arrowHeadType : shapeConfig.arrowHeadType || 'triangle'}
                onChange={(v) =>
                  patchShapeProp({ arrowHeadType: v as ArrowHeadType }, { arrowHeadType: v as ArrowHeadType })
                }
                options={[
                  { value: 'triangle', label: 'Triángulo' },
                  { value: 'stealth', label: 'Sigilo' },
                  { value: 'diamond', label: 'Diamante' },
                  { value: 'double', label: 'Doble' },
                  { value: 'open', label: 'Abierta' },
                ]}
              />
              <SliderField
                label="Curva"
                keywords="curvatura flecha doblar"
                value={Math.round((selectedShape ? selectedShape.arrowCurvature : shapeConfig.arrowCurvature ?? 0) * 100)}
                min={-100}
                max={100}
                unit="%"
                onChange={(v) => patchShapeProp({ arrowCurvature: v / 100 }, { arrowCurvature: v / 100 })}
              />
            </>
          )}

          {activeShapeKind === 'custom' && (
            <SelectField
              label="Preset"
              keywords="forma personalizada corazon escudo rayo nube bocadillo cruz rombo capsula"
              value={selectedShape ? selectedShape.customPreset : shapeConfig.customPreset || 'heart'}
              onChange={(v) =>
                patchShapeProp(
                  { customPreset: v as CustomShapePresetId },
                  { customPreset: v as CustomShapePresetId }
                )
              }
              options={CUSTOM_SHAPE_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
            />
          )}

          <Sep />

          {/* Common Fill / Stroke / Dither / Gradient / Opacity / Pixel Perfect */}
          <ToggleBtn
            active={activeShapeFilled}
            onClick={() => patchShapeProp({ filled: !activeShapeFilled }, { filled: !activeShapeFilled })}
            label="Relleno"
            keywords="relleno solido"
          />
          <ToggleBtn
            active={activeShapeStroke}
            onClick={() => patchShapeProp({ strokeEnabled: !activeShapeStroke }, { strokeEnabled: !activeShapeStroke })}
            label="Contorno"
            keywords="contorno borde trazo"
          />
          {activeShapeStroke && (
            <NumberField
              label="Gros."
              keywords="grosor contorno borde"
              value={activeShapeStrokeW}
              min={1}
              max={dynamicStrokeMax}
              unit="px"
              allowManualOverflow
              hardMax={1024}
              onChange={(v) => patchShapeProp({ strokeWidth: Math.max(1, Math.round(v)) }, { strokeWidth: Math.max(1, Math.round(v)) })}
            />
          )}
          <ToggleBtn
            active={activeShapeDither}
            onClick={() => patchShapeProp({ useDither: !activeShapeDither }, { useDither: !activeShapeDither })}
            label="Dithering"
            keywords="dithering trama"
            icon={Grid}
            tone="amber"
          />
          <ToggleBtn
            active={activeShapeGrad}
            onClick={() => patchShapeProp({ useGradient: !activeShapeGrad }, { useGradient: !activeShapeGrad })}
            label="Degradado"
            keywords="degradado gradient"
            icon={Blend}
          />
          <SliderField
            label="Opac."
            keywords="opacidad transparencia forma"
            value={activeShapeOpacity}
            min={5}
            max={100}
            unit="%"
            widthClass="w-12"
            onChange={(v) => patchShapeProp({ opacity: v / 100 }, { opacity: v / 100 })}
          />
          <ToggleBtn
            active={activeShapeAA}
            onClick={() =>
              patchShapeProp(
                { antiAlias: !activeShapeAA, pixelPerfect: !activeShapeAA ? false : activeShapePP },
                { antiAlias: !activeShapeAA, pixelPerfect: !activeShapeAA ? false : activeShapePP }
              )
            }
            label="AA"
            keywords="antialiasing suavizado"
          />
          <ToggleBtn
            active={activeShapePP}
            onClick={() =>
              patchShapeProp(
                { pixelPerfect: !activeShapePP, antiAlias: !activeShapePP ? false : activeShapeAA },
                { pixelPerfect: !activeShapePP, antiAlias: !activeShapePP ? false : activeShapeAA }
              )
            }
            label="PxPerf"
            keywords="pixel perfect nitido grid"
            icon={Grid}
          />

          <Sep />

          {/* Rasterization Policy + Live Convert Button */}
          <SelectField
            label="Modo"
            keywords="rasterizacion mantener editable convertir pixeles preguntar siempre"
            value={shapeRasterPolicy}
            onChange={(v) => onChangeShapeRasterPolicy(v as ShapeRasterConfirmMode)}
            options={[
              { value: 'keep_editable', label: 'Mantener editable' },
              { value: 'rasterize', label: 'Convertir en píxeles' },
              { value: 'ask', label: 'Preguntar siempre' },
            ]}
          />
          {selectedShape && (
            <>
              {(selectedShape.skewX !== 0 || selectedShape.skewY !== 0 || selectedShape.cornerOffsets) && (
                <ActionBtn
                  onClick={() =>
                    onUpdateSelectedShape({ skewX: 0, skewY: 0, rotation: 0, cornerOffsets: undefined })
                  }
                  label="Reset XF"
                  keywords="restablecer transformar sesgar distorsionar"
                  icon={RotateCcw}
                />
              )}
              <ActionBtn
                onClick={onRasterizeSelectedShape}
                label="Rasterizar"
                keywords="convertir en pixeles confirmar"
                icon={Check}
                variant="primary"
              />
              <ActionBtn
                onClick={onDeleteSelectedShape}
                label="Borrar"
                keywords="eliminar borrar forma"
                icon={X}
                variant="danger"
              />
            </>
          )}
        </>
      );
    }

    // 16. LUPA (Zoom)
    if (activeContextMode === 'zoom') {
      return (
        <>
          <ToggleBtn
            active={zoomToolMode === 'in'}
            onClick={() => {
              onChangeZoomToolMode('in');
              onTriggerZoomAction('in');
            }}
            label="Zoom +"
            keywords="acercar zoom mas"
            icon={ZoomIn}
          />
          <ToggleBtn
            active={zoomToolMode === 'out'}
            onClick={() => {
              onChangeZoomToolMode('out');
              onTriggerZoomAction('out');
            }}
            label="Zoom -"
            keywords="alejar zoom menos"
            icon={ZoomOut}
          />
          <ToggleBtn
            active={zoomToolMode === 'region'}
            onClick={() => onChangeZoomToolMode('region')}
            label="Región"
            keywords="zoom region area encuadre"
            icon={Scan}
          />
          <Sep />
          <ActionBtn
            onClick={() => onTriggerZoomAction('fit')}
            label="Ajustar a ventana"
            keywords="ajustar ventana pantalla fit"
            icon={Maximize2}
          />
          <NumberField
            label="Escala"
            keywords="zoom porcentaje escala exacto 100 200 400 800"
            value={Math.round(zoomPercent)}
            min={25}
            max={3200}
            step={25}
            unit="%"
            onChange={(v) => onTriggerZoomAction('percent', Math.max(25, Math.min(3200, Math.round(v))))}
          />
          <ActionBtn
            onClick={() => onTriggerZoomAction('percent', 100)}
            label="100% Real"
            keywords="zoom 100 real restablecer"
          />
        </>
      );
    }

    // 17. EYEDROPPER
    if (activeContextMode === 'eyedropper') {
      return (
        <>
          <SelectField
            label="Muestra"
            keywords="muestra radio pixeles cuentagotas"
            value={eyedropperConfig.sampleMode}
            onChange={(v) =>
              onChangeEyedropperConfig({
                ...eyedropperConfig,
                sampleMode: v as EyedropperConfig['sampleMode'],
              })
            }
            options={[
              { value: 'point', label: '1×1 px' },
              { value: 'avg3', label: '3×3 prom.' },
              { value: 'avg5', label: '5×5 prom.' },
              { value: 'custom', label: 'Personalizado' },
            ]}
          />
          <SelectField
            label="Origen"
            keywords="capa actual visibles todas capas"
            value={eyedropperConfig.layerScope}
            onChange={(v) =>
              onChangeEyedropperConfig({
                ...eyedropperConfig,
                layerScope: v as EyedropperConfig['layerScope'],
              })
            }
            options={[
              { value: 'visible', label: 'Capas visibles' },
              { value: 'current', label: 'Capa activa' },
              { value: 'all', label: 'Todas las capas' },
            ]}
          />
          <SelectField
            label="Lupa"
            keywords="lupa zoom anillo cuentagotas"
            value={String(eyedropperConfig.loupeZoom)}
            onChange={(v) =>
              onChangeEyedropperConfig({
                ...eyedropperConfig,
                loupeZoom: Number(v) as EyedropperConfig['loupeZoom'],
              })
            }
            options={[
              { value: '4', label: '4×' },
              { value: '8', label: '8×' },
              { value: '16', label: '16×' },
              { value: '32', label: '32×' },
            ]}
          />
          <ToggleBtn
            active={eyedropperConfig.pixelArtMode}
            onClick={() =>
              onChangeEyedropperConfig({ ...eyedropperConfig, pixelArtMode: !eyedropperConfig.pixelArtMode })
            }
            label="Modo Pixel Art"
            keywords="pixel art nitido paleta"
            icon={Crosshair}
          />
        </>
      );
    }

    // 18. HITBOX
    if (activeContextMode === 'hitbox') {
      return (
        <>
          {(
            [
              ['hurtbox', 'Hurtbox'],
              ['hitbox', 'Hitbox'],
              ['pushbox', 'Pushbox'],
              ['throwbox', 'Throwbox'],
              ['counterbox', 'Counter'],
              ['clashbox', 'Clash'],
              ['armorbox', 'Armor'],
            ] as const
          ).map(([id, lbl]) => (
            <ToggleBtn
              key={id}
              active={activeHitboxType === id}
              onClick={() => onChangeHitboxType(id)}
              label={lbl}
              keywords={`caja colision ${lbl}`}
              icon={ShieldAlert}
            />
          ))}
        </>
      );
    }

    // 18.5. EDITAR LIENZO (VISUAL CANVAS EDIT TOOL)
    if (
      activeContextMode === 'canvas_edit' &&
      canvasEditRect &&
      canvasEditConfig &&
      onChangeCanvasEditRect &&
      onChangeCanvasEditConfig
    ) {
      const origW = Math.max(1, canvasWidth || 64);
      const origH = Math.max(1, canvasHeight || 64);
      const cellW = Math.max(1, Math.round(canvasEditConfig.cellWidth || 32));
      const cellH = Math.max(1, Math.round(canvasEditConfig.cellHeight || 32));

      const applyNumericDimension = (nextW: number, nextH: number) => {
        const safeW = Math.max(1, Math.min(32768, Math.round(nextW)));
        const safeH = Math.max(1, Math.min(32768, Math.round(nextH)));
        const anchored = computeAnchoredCanvasRect(origW, origH, safeW, safeH, canvasEditConfig.anchor);
        onChangeCanvasEditRect(anchored);
      };

      const handleAnchorChange = (anchor: CanvasEditAnchor) => {
        onChangeCanvasEditConfig({ ...canvasEditConfig, anchor });
        const anchored = computeAnchoredCanvasRect(origW, origH, canvasEditRect.width, canvasEditRect.height, anchor);
        onChangeCanvasEditRect(anchored);
      };

      const stepSpritesheet = (dCols: number, dRows: number) => {
        const curCols = Math.max(1, Math.round(canvasEditRect.width / cellW));
        const curRows = Math.max(1, Math.round(canvasEditRect.height / cellH));
        const targetW = Math.max(cellW, (curCols + dCols) * cellW);
        const targetH = Math.max(cellH, (curRows + dRows) * cellH);
        const anchored = computeAnchoredCanvasRect(origW, origH, targetW, targetH, canvasEditConfig.anchor);
        onChangeCanvasEditRect(anchored);
      };

      const anchorCells: { id: CanvasEditAnchor; title: string }[] = [
        { id: 'top-left', title: 'Esquina Superior Izquierda' },
        { id: 'top', title: 'Superior' },
        { id: 'top-right', title: 'Esquina Superior Derecha' },
        { id: 'left', title: 'Izquierda' },
        { id: 'center', title: 'Centro' },
        { id: 'right', title: 'Derecha' },
        { id: 'bottom-left', title: 'Esquina Inferior Izquierda' },
        { id: 'bottom', title: 'Inferior' },
        { id: 'bottom-right', title: 'Esquina Inferior Derecha' },
      ];

      return (
        <>
          {/* Numeric Width × Height + Aspect Lock */}
          {matchesFilter('ancho alto dimensiones tamaño relacion bloqueada') && (
            <div className="flex items-center gap-1 shrink-0">
              <label className="flex items-center gap-0.5 text-[10px]">
                <span className="opacity-70 font-semibold">W</span>
                <input
                  type="number"
                  min={1}
                  max={32768}
                  value={canvasEditRect.width}
                  onChange={(e) => {
                    const nw = Math.max(1, parseInt(e.target.value, 10) || 1);
                    const nh = canvasEditConfig.lockAspectRatio
                      ? Math.max(1, Math.round((nw * canvasEditRect.height) / Math.max(1, canvasEditRect.width)))
                      : canvasEditRect.height;
                    applyNumericDimension(nw, nh);
                  }}
                  className="w-14 h-6 px-1.5 rounded border text-[10px] font-mono tabular-nums text-center outline-none"
                  style={{
                    backgroundColor: 'var(--studio-bg-elevated)',
                    borderColor: 'var(--studio-border-strong)',
                    color: 'var(--studio-text)',
                  }}
                  title="Nueva anchura del lienzo (px)"
                />
              </label>

              <button
                type="button"
                onClick={() =>
                  onChangeCanvasEditConfig({
                    ...canvasEditConfig,
                    lockAspectRatio: !canvasEditConfig.lockAspectRatio,
                  })
                }
                title="Relación de aspecto bloqueada (Shift al arrastrar)"
                className="h-6 w-6 rounded border flex items-center justify-center transition-colors shrink-0"
                style={{
                  backgroundColor: canvasEditConfig.lockAspectRatio
                    ? 'var(--studio-accent)'
                    : 'var(--studio-bg-elevated)',
                  color: canvasEditConfig.lockAspectRatio
                    ? 'var(--studio-accent-text)'
                    : 'var(--studio-text-muted)',
                  borderColor: canvasEditConfig.lockAspectRatio
                    ? 'var(--studio-accent)'
                    : 'var(--studio-border)',
                }}
              >
                {canvasEditConfig.lockAspectRatio ? (
                  <Link2 className="w-3 h-3" />
                ) : (
                  <Unlink2 className="w-3 h-3" />
                )}
              </button>

              <label className="flex items-center gap-0.5 text-[10px]">
                <span className="opacity-70 font-semibold">H</span>
                <input
                  type="number"
                  min={1}
                  max={32768}
                  value={canvasEditRect.height}
                  onChange={(e) => {
                    const nh = Math.max(1, parseInt(e.target.value, 10) || 1);
                    const nw = canvasEditConfig.lockAspectRatio
                      ? Math.max(1, Math.round((nh * canvasEditRect.width) / Math.max(1, canvasEditRect.height)))
                      : canvasEditRect.width;
                    applyNumericDimension(nw, nh);
                  }}
                  className="w-14 h-6 px-1.5 rounded border text-[10px] font-mono tabular-nums text-center outline-none"
                  style={{
                    backgroundColor: 'var(--studio-bg-elevated)',
                    borderColor: 'var(--studio-border-strong)',
                    color: 'var(--studio-text)',
                  }}
                  title="Nueva altura del lienzo (px)"
                />
              </label>
            </div>
          )}

          {/* Compact 3×3 Visual Anchor Selector */}
          {matchesFilter('anclaje centro superior inferior izquierda derecha esquina') && (
            <div
              className="flex items-center gap-1.5 pl-1.5 border-l shrink-0"
              style={{ borderColor: 'var(--studio-border)' }}
              title="Anclaje del lienzo: Centro, Superior, Inferior, Izquierda, Derecha o Esquina personalizada"
            >
              <span className="text-[9px] font-semibold opacity-70 whitespace-nowrap">Anclaje</span>
              <div className="grid grid-cols-3 gap-[2px] p-[2px] rounded border border-slate-700 bg-slate-900/90">
                {anchorCells.map((cell) => {
                  const active = canvasEditConfig.anchor === cell.id;
                  return (
                    <button
                      key={cell.id}
                      type="button"
                      onClick={() => handleAnchorChange(cell.id)}
                      title={`Anclaje: ${cell.title}`}
                      className="w-2 h-2 rounded-[1px] transition-colors"
                      style={{
                        backgroundColor: active ? '#FACC15' : 'rgba(148,163,184,0.35)',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Off-Canvas Content Handling Mode */}
          {matchesFilter('contenido fuera lienzo mantener recortar expandir automaticamente') && (
            <div
              className="flex items-center gap-1 pl-1.5 border-l shrink-0"
              style={{ borderColor: 'var(--studio-border)' }}
            >
              <select
                value={canvasEditConfig.overflowMode}
                onChange={(e) =>
                  onChangeCanvasEditConfig({
                    ...canvasEditConfig,
                    overflowMode: e.target.value as CanvasEditOverflowMode,
                  })
                }
                className="h-6 px-1.5 rounded border text-[10px] font-medium outline-none"
                style={{
                  backgroundColor: 'var(--studio-bg-elevated)',
                  borderColor: 'var(--studio-border-strong)',
                  color: 'var(--studio-text)',
                }}
                title="Comportamiento con el contenido fuera del lienzo"
              >
                <option value="keep">Mantener contenido</option>
                <option value="crop">Recortar contenido</option>
                <option value="auto_expand">Expandir automáticamente</option>
              </select>

              {onFitCanvasEditToContent && (
                <ActionBtn
                  onClick={onFitCanvasEditToContent}
                  label={hasOffCanvasContent ? 'Recuperar Todo' : 'Ajustar Contenido'}
                  keywords="ajustar contenido auto expandir recuperar"
                  icon={Maximize2}
                  title="Ajusta automáticamente los límites para abarcar todo el contenido (incluyendo píxeles fuera del lienzo)"
                />
              )}
            </div>
          )}

          {/* Advanced Snap & Symmetry Options */}
          <div
            className="flex items-center gap-1 pl-1.5 border-l shrink-0"
            style={{ borderColor: 'var(--studio-border)' }}
          >
            <ToggleBtn
              active={canvasEditConfig.snapToGrid}
              onClick={() =>
                onChangeCanvasEditConfig({
                  ...canvasEditConfig,
                  snapToGrid: !canvasEditConfig.snapToGrid,
                })
              }
              label={`Rejilla ${canvasEditConfig.snapGridStep}px`}
              keywords="ajuste cuadricula rejilla snap grid"
              icon={Grid}
              title="Ajuste a cuadrícula al arrastrar tiradores"
            />
            {canvasEditConfig.snapToGrid && (
              <input
                type="number"
                min={2}
                max={256}
                value={canvasEditConfig.snapGridStep}
                onChange={(e) =>
                  onChangeCanvasEditConfig({
                    ...canvasEditConfig,
                    snapGridStep: Math.max(2, Math.min(256, parseInt(e.target.value, 10) || 8)),
                  })
                }
                className="w-10 h-6 px-1 rounded border text-[10px] font-mono tabular-nums text-center outline-none"
                style={{
                  backgroundColor: 'var(--studio-bg-elevated)',
                  borderColor: 'var(--studio-border-strong)',
                  color: 'var(--studio-text)',
                }}
                title="Paso de cuadrícula (px)"
              />
            )}
            <ToggleBtn
              active={canvasEditConfig.snapToPixels}
              onClick={() =>
                onChangeCanvasEditConfig({
                  ...canvasEditConfig,
                  snapToPixels: !canvasEditConfig.snapToPixels,
                })
              }
              label="Píxeles"
              keywords="ajuste por pixeles enteros"
              icon={Crosshair}
              title="Ajuste exacto por píxeles enteros (sin subpíxeles)"
            />
            <ToggleBtn
              active={canvasEditConfig.symmetricGrowth}
              onClick={() =>
                onChangeCanvasEditConfig({
                  ...canvasEditConfig,
                  symmetricGrowth: !canvasEditConfig.symmetricGrowth,
                })
              }
              label="Simétrico"
              keywords="crecimiento simetrico alt"
              icon={FlipHorizontal2}
              tone="emerald"
              title="Crecimiento / recorte simétrico desde el centro (o mantén Alt)"
            />
          </div>

          {/* Spritesheet Mode Controls */}
          <div
            className="flex items-center gap-1 pl-1.5 border-l shrink-0"
            style={{ borderColor: 'var(--studio-border)' }}
          >
            <ToggleBtn
              active={canvasEditConfig.spritesheetMode}
              onClick={() =>
                onChangeCanvasEditConfig({
                  ...canvasEditConfig,
                  spritesheetMode: !canvasEditConfig.spritesheetMode,
                })
              }
              label="Spritesheet"
              keywords="spritesheet filas columnas celdas grid"
              icon={Columns2}
              tone="amber"
              title="Activa guías de celdas y expansión por filas, columnas y celdas"
            />
            {canvasEditConfig.spritesheetMode && (
              <>
                <input
                  type="number"
                  min={4}
                  max={2048}
                  value={cellW}
                  onChange={(e) =>
                    onChangeCanvasEditConfig({
                      ...canvasEditConfig,
                      cellWidth: Math.max(4, parseInt(e.target.value, 10) || 32),
                    })
                  }
                  className="w-11 h-6 px-1 rounded border text-[10px] font-mono tabular-nums text-center outline-none"
                  style={{
                    backgroundColor: 'var(--studio-bg-elevated)',
                    borderColor: 'var(--studio-border-strong)',
                    color: 'var(--studio-text)',
                  }}
                  title="Ancho de celda (px)"
                />
                <span className="text-[10px] opacity-60">×</span>
                <input
                  type="number"
                  min={4}
                  max={2048}
                  value={cellH}
                  onChange={(e) =>
                    onChangeCanvasEditConfig({
                      ...canvasEditConfig,
                      cellHeight: Math.max(4, parseInt(e.target.value, 10) || 32),
                    })
                  }
                  className="w-11 h-6 px-1 rounded border text-[10px] font-mono tabular-nums text-center outline-none"
                  style={{
                    backgroundColor: 'var(--studio-bg-elevated)',
                    borderColor: 'var(--studio-border-strong)',
                    color: 'var(--studio-text)',
                  }}
                  title="Alto de celda (px)"
                />
                <ActionBtn
                  onClick={() => stepSpritesheet(1, 0)}
                  label="+Col"
                  keywords="añadir columna spritesheet"
                  icon={Plus}
                  title={`Añadir 1 columna (+${cellW}px)`}
                />
                <ActionBtn
                  onClick={() => stepSpritesheet(-1, 0)}
                  label="-Col"
                  keywords="quitar columna spritesheet"
                  icon={Minus}
                  disabled={canvasEditRect.width <= cellW}
                  title={`Quitar 1 columna (-${cellW}px)`}
                />
                <ActionBtn
                  onClick={() => stepSpritesheet(0, 1)}
                  label="+Fila"
                  keywords="añadir fila spritesheet"
                  icon={Plus}
                  title={`Añadir 1 fila (+${cellH}px)`}
                />
                <ActionBtn
                  onClick={() => stepSpritesheet(0, -1)}
                  label="-Fila"
                  keywords="quitar fila spritesheet"
                  icon={Minus}
                  disabled={canvasEditRect.height <= cellH}
                  title={`Quitar 1 fila (-${cellH}px)`}
                />
                <ActionBtn
                  onClick={() => stepSpritesheet(1, 1)}
                  label="+Celda"
                  keywords="añadir celda fila columna spritesheet"
                  icon={Expand}
                  title={`Añadir 1 columna y 1 fila (+${cellW}×${cellH}px)`}
                />
              </>
            )}
          </div>

          {/* Apply / Reset / Cancel */}
          <div
            className="flex items-center gap-1 pl-1.5 border-l shrink-0"
            style={{ borderColor: 'var(--studio-border)' }}
          >
            {onApplyCanvasEdit && (
              <ActionBtn
                onClick={onApplyCanvasEdit}
                label="Aplicar"
                keywords="aplicar confirmar enter"
                icon={Check}
                variant="primary"
                title="Aplicar nuevo tamaño de lienzo (Enter)"
              />
            )}
            {onResetCanvasEdit && (
              <ActionBtn
                onClick={onResetCanvasEdit}
                label="Restablecer"
                keywords="restablecer reset original"
                icon={RotateCcw}
                title="Restablecer al tamaño actual del lienzo"
              />
            )}
            {onCancelCanvasEdit && (
              <ActionBtn
                onClick={onCancelCanvasEdit}
                label="Cancelar"
                keywords="cancelar salir esc"
                icon={X}
                variant="danger"
                title="Cancelar edición de lienzo (Esc)"
              />
            )}
          </div>
        </>
      );
    }

    // 18.75. HERRAMIENTA TILES (Dibujar / Colocar / Reemplazar / Borrar / Seleccionar + Autotile)
    if (activeContextMode === 'tile' && tileToolConfig && onChangeTileToolConfig) {
      const activeTs =
        tilesets?.find((ts) => ts.id === tileToolConfig.activeTilesetId) ||
        tilesets?.[0] ||
        null;
      const activeTile =
        activeTs?.tiles.find((t) => t.id === tileToolConfig.activeTileId) ||
        activeTs?.tiles[0] ||
        null;
      const thumbUrl = activeTile ? renderTileThumbnailDataUrl(activeTile, 20) : '';

      return (
        <>
          <SelectField
            label="Modo"
            keywords="dibujar colocar reemplazar borrar seleccionar tile"
            value={tileToolConfig.mode}
            onChange={(v) =>
              onChangeTileToolConfig({ ...tileToolConfig, mode: v as TileToolMode })
            }
            options={[
              { value: 'draw', label: 'Dibujar' },
              { value: 'place', label: 'Colocar' },
              { value: 'replace', label: 'Reemplazar' },
              { value: 'erase', label: 'Borrar' },
              { value: 'select', label: 'Seleccionar' },
            ]}
          />
          <SelectField
            label="Patrón"
            keywords="pintar areas repeticion relleno inteligente unico tile"
            value={tileToolConfig.paintMode}
            onChange={(v) =>
              onChangeTileToolConfig({
                ...tileToolConfig,
                paintMode: v as TilePaintPatternMode,
              })
            }
            options={[
              { value: 'single', label: 'Trazo / Celda' },
              { value: 'area', label: 'Pintar Área' },
              { value: 'repeat', label: 'Repetición' },
              { value: 'smart_fill', label: 'Relleno Inteligente' },
            ]}
          />
          <Sep />
          <ToggleBtn
            active={tileToolConfig.autotile}
            onClick={() =>
              onChangeTileToolConfig({ ...tileToolConfig, autotile: !tileToolConfig.autotile })
            }
            label="Autotile"
            keywords="autotile bordes esquinas uniones automatico"
            icon={Grid}
            tone="emerald"
            title="Detecta tiles vecinos y resuelve automáticamente bordes, esquinas y uniones"
          />
          <ToggleBtn
            active={tileToolConfig.continuousDraw}
            onClick={() =>
              onChangeTileToolConfig({
                ...tileToolConfig,
                continuousDraw: !tileToolConfig.continuousDraw,
              })
            }
            label="Continuo"
            keywords="dibujo continuo arrastrar tile"
            icon={Pencil}
            title="Pintado continuo de tiles mientras arrastras"
          />
          <ToggleBtn
            active={tileToolConfig.autoRepeat}
            onClick={() =>
              onChangeTileToolConfig({ ...tileToolConfig, autoRepeat: !tileToolConfig.autoRepeat })
            }
            label="Auto-Repetir"
            keywords="repeticion automatica patron tile"
            icon={Maximize2}
          />
          <Sep />
          <SelectField
            label="Tamaño"
            keywords="tamano celda tile 8 16 24 32 48 64"
            value={String(tileToolConfig.tileSize)}
            onChange={(v) =>
              onChangeTileToolConfig({ ...tileToolConfig, tileSize: parseInt(v, 10) || 16 })
            }
            options={[
              { value: '8', label: '8×8' },
              { value: '16', label: '16×16' },
              { value: '24', label: '24×24' },
              { value: '32', label: '32×32' },
              { value: '48', label: '48×48' },
              { value: '64', label: '64×64' },
            ]}
          />
          {activeTile && (
            <button
              type="button"
              onClick={onOpenTilesetsPanel}
              title={`Tile activo: ${activeTile.name} — Abrir Panel Tilesets`}
              className="h-6 px-1.5 rounded border text-[10px] font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 hover:bg-white/5"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            >
              {thumbUrl && (
                <img
                  src={thumbUrl}
                  alt={activeTile.name}
                  className="w-4 h-4 rounded-sm"
                  style={{ imageRendering: 'pixelated' }}
                />
              )}
              <span className="max-w-[110px] truncate">{activeTile.name}</span>
            </button>
          )}
          {onOpenTilesetsPanel && (
            <ActionBtn
              onClick={onOpenTilesetsPanel}
              label="Tilesets"
              keywords="panel tilesets biblioteca"
              icon={Layers}
            />
          )}
        </>
      );
    }

    // 19. CUSTOM REGISTERED FUTURE TOOL OR DEFAULT INFO
    const customProvider = CUSTOM_TOOL_OPTIONS_REGISTRY.get(activeContextMode);
    if (customProvider) {
      return customProvider.render({
        displayMode: barState.displayMode,
        searchQuery: normalizedQuery,
      });
    }

    return (
      <span className="text-[10px] opacity-75 px-1 whitespace-nowrap">
        {activeTool === 'hand'
          ? 'Arrastra para desplazar la vista · Rueda para zoom · Doble clic para encuadrar'
          : activeTool === 'text'
          ? 'Haz clic en el lienzo para colocar texto pixel art y edita la fuente en la caja activa'
          : 'Opciones rápidas listas para esta herramienta'}
      </span>
    );
  };

  const containerStyle: React.CSSProperties = barState.floating
    ? {
        position: 'fixed',
        left: `${barState.floatX}px`,
        top: `${barState.floatY}px`,
        width: `${barState.floatWidth}px`,
        maxWidth: 'calc(100vw - 24px)',
        zIndex: 8500,
        backgroundColor: 'var(--studio-bg-panel)',
        borderColor: 'var(--studio-accent)',
        color: 'var(--studio-text)',
      }
    : {
        backgroundColor: 'var(--studio-bg-panel)',
        borderColor: 'var(--studio-border)',
        color: 'var(--studio-text)',
      };

  const cycleDisplayMode = () => {
    const order: OptionsBarDisplayMode[] = ['icon_text', 'icon_only', 'text_only'];
    const idx = order.indexOf(barState.displayMode);
    onChangeBarState({ ...barState, displayMode: order[(idx + 1) % order.length] });
  };

  const displayModeLabel =
    barState.displayMode === 'icon_text'
      ? 'Ic+Tx'
      : barState.displayMode === 'icon_only'
      ? 'Iconos'
      : 'Texto';

  return (
    <OptionsBarDisplayContext.Provider value={displayCtxValue}>
      <div
        data-help-id="tool-options-bar"
      className={`${
        barState.floating
          ? 'rounded-xl border shadow-2xl backdrop-blur-md'
          : 'w-full border-b shrink-0 relative z-30'
      } flex items-center gap-1.5 px-2 transition-colors select-none`}
      style={{
        ...containerStyle,
        height: barState.collapsed ? '24px' : '34px',
      }}
    >
      {/* Floating Drag Grip */}
      {barState.floating && (
        <div
          onPointerDown={handleStartFloatDrag}
          className="cursor-grab active:cursor-grabbing p-0.5 opacity-70 hover:opacity-100 shrink-0"
          title="Arrastrar barra flotante"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
      )}

      {/* Active Tool Context Label */}
      <div
        className="flex items-center gap-1.5 pr-2 border-r shrink-0"
        style={{ borderColor: 'var(--studio-border)' }}
      >
        <HeaderIcon className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--studio-accent)' }} />
        <span className="text-[11px] font-semibold whitespace-nowrap">{contextHeaderInfo.label}</span>
      </div>

      {/* Main Contextual Controls Strip */}
      {!barState.collapsed ? (
        <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {renderContextualControls()}
        </div>
      ) : (
        <div className="flex-1 min-w-0 text-[10px] opacity-65 truncate">
          Barra de opciones contraída — haz clic en expandir para ver controles de {contextHeaderInfo.label}
        </div>
      )}

      {/* Right Utility Zone: Quick Context Switches + Quick Search + Display Mode + Collapse + Float/Dock */}
      <div
        className="flex items-center gap-1 pl-1.5 border-l shrink-0"
        style={{ borderColor: 'var(--studio-border)' }}
      >
        {/* Quick Symmetry & AI Context Switchers */}
        {!barState.collapsed && !activeFilterSession && (
          <>
            <button
              type="button"
              onClick={onToggleSymmetryBar}
              title="Abrir opciones de Simetría en esta barra"
              className="h-5 px-1.5 rounded border text-[9px] font-medium flex items-center gap-1 whitespace-nowrap"
              style={{
                backgroundColor:
                  symmetryBarActive || symmetryConfig.enabled
                    ? 'rgba(16,185,129,0.2)'
                    : 'var(--studio-bg-elevated)',
                borderColor:
                  symmetryBarActive || symmetryConfig.enabled ? '#10b981' : 'var(--studio-border)',
                color:
                  symmetryBarActive || symmetryConfig.enabled ? '#34d399' : 'var(--studio-text-muted)',
              }}
            >
              <FlipHorizontal2 className="w-3 h-3" />
              {showText && <span>Sim</span>}
            </button>
            <button
              type="button"
              onClick={onToggleAiBar}
              title="Abrir controles rápidos de IA en esta barra"
              className="h-5 px-1.5 rounded border text-[9px] font-medium flex items-center gap-1 whitespace-nowrap"
              style={{
                backgroundColor: aiBarActive ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                borderColor: aiBarActive ? 'var(--studio-accent)' : 'var(--studio-border)',
                color: aiBarActive ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
              }}
            >
              <Sparkles className="w-3 h-3" />
              {showText && <span>IA</span>}
            </button>
          </>
        )}

        {/* Internal Quick Search inside the Options Bar */}
        {!barState.collapsed && (
          <div
            className="h-6 px-1.5 rounded border flex items-center gap-1 transition-all"
            style={{
              width: searchFocused || searchQuery ? '128px' : '82px',
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: searchFocused ? 'var(--studio-accent)' : 'var(--studio-border)',
            }}
          >
            <Search className="w-3 h-3 opacity-60 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Buscar..."
              className="w-full bg-transparent text-[10px] outline-none"
              style={{ color: 'var(--studio-text)' }}
              title="Buscar ajustes de la herramienta activa"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="opacity-70 hover:opacity-100"
                title="Limpiar búsqueda"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        )}

        {/* Display Mode: Icon+Text / Icon Only / Text Only */}
        {!barState.collapsed && (
          <button
            type="button"
            onClick={cycleDisplayMode}
            title="Cambiar estilo de botones: Texto + Iconos / Solo Iconos / Solo Texto"
            className="h-6 px-1.5 rounded border text-[9px] font-mono whitespace-nowrap hover:opacity-90"
            style={{
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: 'var(--studio-border)',
              color: 'var(--studio-text-muted)',
            }}
          >
            {displayModeLabel}
          </button>
        )}

        {/* Collapse / Expand */}
        <button
          type="button"
          onClick={() => onChangeBarState({ ...barState, collapsed: !barState.collapsed })}
          title={barState.collapsed ? 'Expandir barra de opciones' : 'Contraer barra de opciones'}
          className="h-5 w-5 rounded border flex items-center justify-center hover:opacity-90"
          style={{
            backgroundColor: 'var(--studio-bg-elevated)',
            borderColor: 'var(--studio-border)',
            color: 'var(--studio-text-muted)',
          }}
        >
          {barState.collapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </button>

        {/* Float / Dock */}
        <button
          type="button"
          onClick={() => onChangeBarState({ ...barState, floating: !barState.floating })}
          title={barState.floating ? 'Acoplar debajo del menú principal' : 'Convertir en barra flotante'}
          className="h-5 w-5 rounded border flex items-center justify-center hover:opacity-90"
          style={{
            backgroundColor: barState.floating ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
            borderColor: barState.floating ? 'var(--studio-accent)' : 'var(--studio-border)',
            color: barState.floating ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
          }}
        >
          {barState.floating ? <Pin className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
        </button>
      </div>
      </div>
    </OptionsBarDisplayContext.Provider>
  );
};
