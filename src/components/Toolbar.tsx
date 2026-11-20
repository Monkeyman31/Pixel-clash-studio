import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { STUDIO_Z } from './StudioTopLayer';
import {
  Pencil,
  Eraser,
  PaintBucket,
  Pipette,
  Slash,
  Square,
  Grid,
  Scan,
  ShieldAlert,
  ArrowLeftRight,
  Hand,
  Circle,
  Wand2,
  Lasso,
  Type,
  MousePointer2,
  MousePointer,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  RotateCcw,
  ExternalLink,
  Layers,
  Image as ImageIcon,
  Check,
  ZoomIn,
  ZoomOut,
  Magnet,
  Blend,
  BoxSelect,
  Spline,
  GitCommitHorizontal,
  Hexagon,
  Star,
  ArrowRight,
  Shapes,
} from 'lucide-react';
import {
  BrushSettings,
  BucketSubTool,
  DitherConfig,
  HitboxType,
  LassoMode,
  MoveSubTool,
  SelectionSubTool,
  ShapeToolConfig,
  ShapeToolKind,
  ToolbarColumnsMode,
  ToolType,
  ZoomToolMode,
} from '../types';
import { DEFAULT_TOOL_ORDER } from '../constants/workspaceThemes';
import { DEFAULT_DITHER_CONFIG } from '../utils/pixelMath';
import { DEFAULT_SHAPE_CONFIG } from '../utils/toolEngines';

// Fallback icon for Polygon if missing from lucide version
const PolygonIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12 3 21 9 18 20 6 20 3 9 12 3" />
  </svg>
);

// Official Editar Lienzo icon: crop frame with manipulable corner handles
const CanvasEditFrameIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Dashed inner/original frame guide */}
    <rect x="6" y="6" width="12" height="12" strokeDasharray="2.5 2" opacity="0.65" />
    {/* Corner L-brackets */}
    <path d="M4 9V4h5" />
    <path d="M20 9V4h-5" />
    <path d="M4 15v5h5" />
    <path d="M20 15v5h-5" />
    {/* Manipulable corner squares */}
    <rect x="2.5" y="2.5" width="3.2" height="3.2" fill="currentColor" stroke="none" />
    <rect x="18.3" y="2.5" width="3.2" height="3.2" fill="currentColor" stroke="none" />
    <rect x="2.5" y="18.3" width="3.2" height="3.2" fill="currentColor" stroke="none" />
    <rect x="18.3" y="18.3" width="3.2" height="3.2" fill="currentColor" stroke="none" />
  </svg>
);

type FlyoutGroupId = 'move' | 'select' | 'lasso' | 'bucket' | 'shape';

interface ToolbarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  moveSubTool?: MoveSubTool;
  onChangeMoveSubTool?: (sub: MoveSubTool) => void;
  selectionSubTool?: SelectionSubTool;
  onChangeSelectionSubTool?: (sub: SelectionSubTool) => void;
  bucketSubTool?: BucketSubTool;
  onChangeBucketSubTool?: (sub: BucketSubTool) => void;
  shapeConfig?: ShapeToolConfig;
  onChangeShapeConfig?: (next: ShapeToolConfig) => void;
  zoomToolMode?: ZoomToolMode;
  onChangeZoomToolMode?: (mode: ZoomToolMode) => void;
  onTriggerZoomAction?: (type: 'in' | 'out' | 'fit' | 'percent', percent?: number) => void;
  brushSettings?: BrushSettings;
  onChangeBrushSettings?: (next: BrushSettings) => void;
  onCenterAllReferences?: () => void;
  brushSize: number;
  onChangeBrushSize: (size: number) => void;
  pixelPerfect: boolean;
  onTogglePixelPerfect: () => void;
  ditherPattern: 'checkered' | 'sparse' | 'dense' | 'horizontal';
  onChangeDitherPattern: (pattern: 'checkered' | 'sparse' | 'dense' | 'horizontal') => void;
  ditherConfig?: DitherConfig;
  onChangeDitherConfig?: (next: DitherConfig) => void;
  marqueeShape?: 'rect' | 'ellipse';
  onChangeMarqueeShape?: (shape: 'rect' | 'ellipse') => void;
  lassoMode?: LassoMode;
  onChangeLassoMode?: (mode: LassoMode) => void;
  activeHitboxType: HitboxType;
  onChangeHitboxType: (type: HitboxType) => void;
  primaryColor: string;
  secondaryColor: string;
  onSwapColors: () => void;
  onSelectPrimaryColor: (color: string) => void;
  onSelectSecondaryColor: (color: string) => void;
  dockPosition?: 'left' | 'right';
  orientation?: 'vertical' | 'horizontal';
  embeddedInDock?: boolean;
  toolbarColumns?: ToolbarColumnsMode;
  onChangeToolbarColumns?: (cols: ToolbarColumnsMode) => void;
  toolbarWidth?: number;
  toolbarHeight?: number;
  onChangeToolbarSize?: (dims: { width?: number; height?: number }) => void;
  onFloatToolbar?: () => void;
  isFloatingToolbar?: boolean;
  linkMoveAllFrames?: boolean;
  onToggleLinkMoveAllFrames?: () => void;
  onOpenBrushSettings?: () => void;
  shortcutLabels?: Partial<Record<ToolType, string>>;
  toolOrder?: ToolType[];
  onChangeToolOrder?: (next: ToolType[]) => void;
  uiEditMode?: boolean;
  onToggleUiEditMode?: () => void;
}

const TOOLS: {
  id: ToolType;
  label: string;
  icon: React.FC<{ className?: string }>;
  hotkey: string;
  flyoutGroup?: FlyoutGroupId;
}[] = [
  { id: 'move', label: 'Mover (Inteligente / Capa / Referencia / Selección / Directa)', icon: MousePointer2, hotkey: 'V', flyoutGroup: 'move' },
  { id: 'select', label: 'Selección (General / Objetos / Capas / Referencias / Vectores / Nodos)', icon: Scan, hotkey: 'M', flyoutGroup: 'select' },
  { id: 'lasso', label: 'Lazo (Libre / Poligonal / Magnético)', icon: Lasso, hotkey: 'Q', flyoutGroup: 'lasso' },
  { id: 'magic_wand', label: 'Varita Mágica de Selección', icon: Wand2, hotkey: 'W' },
  { id: 'canvas_edit', label: 'Editar Lienzo (Ampliar / Recortar / Spritesheet Visual)', icon: CanvasEditFrameIcon, hotkey: 'Shift+C' },
  { id: 'pencil', label: 'Lápiz / Pincel Universal (Dithering · Smear · Cel Shade en Pinceles)', icon: Pencil, hotkey: 'B' },
  { id: 'eraser', label: 'Borrador Pixel', icon: Eraser, hotkey: 'E' },
  { id: 'bucket', label: 'Bote de Pintura (Relleno / Degradado / Degradado con Dithering)', icon: PaintBucket, hotkey: 'G', flyoutGroup: 'bucket' },
  { id: 'line', label: 'Línea / Curva Vectorial (Mantén Ctrl → Selección Directa)', icon: Slash, hotkey: 'L' },
  { id: 'rectangle', label: 'Forma Paramétrica (Rectángulo / Elipse / Polígono / Estrella / Flecha / Personalizada)', icon: Square, hotkey: 'U', flyoutGroup: 'shape' },
  { id: 'text', label: 'Texto Pixel / Arcade', icon: Type, hotkey: 'T' },
  { id: 'eyedropper', label: 'Cuentagotas Pro + Lupa', icon: Pipette, hotkey: 'I' },
  { id: 'hitbox', label: 'Cajas Hitbox / Hurtbox', icon: ShieldAlert, hotkey: 'K' },
  { id: 'hand', label: 'Mano para Mover Lienzo', icon: Hand, hotkey: 'H / Espacio' },
  { id: 'zoom', label: 'Lupa (Zoom / Región / 100%-800%)', icon: ZoomIn, hotkey: 'Z' },
];

const MOVE_SUBTOOLS: {
  id: MoveSubTool;
  label: string;
  shortLabel: string;
  desc: string;
  icon: React.FC<{ className?: string }>;
  hotkey?: string;
}[] = [
  { id: 'move_object', label: 'Mover General', shortLabel: 'Gen', desc: 'Selección inteligente + menú si hay solapamiento', icon: MousePointer2, hotkey: 'V' },
  { id: 'move_layer', label: 'Mover Capa', shortLabel: 'Cap', desc: 'Solo desplaza píxeles de la capa activa', icon: Layers },
  { id: 'move_reference', label: 'Mover Referencia', shortLabel: 'Ref', desc: 'Actúa solo sobre referencias (PureRef/Lienzo)', icon: ImageIcon, hotkey: 'Shift+R' },
  { id: 'move_selection', label: 'Mover Selección', shortLabel: 'Sel', desc: 'Desplaza el área o contenido seleccionado', icon: Scan },
  { id: 'direct_select', label: 'Selección Directa (Flecha Blanca)', shortLabel: 'Nod', desc: 'Editar nodos, tangentes y curvas vectoriales', icon: MousePointer, hotkey: 'A' },
];

const SELECTION_SUBTOOLS: {
  id: SelectionSubTool;
  label: string;
  shortLabel: string;
  desc: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'general', label: 'Selección General', shortLabel: 'Gen', desc: 'Marco rectangular o elíptico clásico', icon: Scan },
  { id: 'objects', label: 'Selección de Objetos', shortLabel: 'Obj', desc: 'Selecciona islas de píxeles, sprites o hitboxes', icon: BoxSelect },
  { id: 'layers', label: 'Selección de Capas', shortLabel: 'Cap', desc: 'Detecta y selecciona la capa visible bajo el clic', icon: Layers },
  { id: 'references', label: 'Selección de Referencias', shortLabel: 'Ref', desc: 'Selecciona referencias en lienzo o cámara', icon: ImageIcon },
  { id: 'vectors', label: 'Selección de Vectores', shortLabel: 'Vec', desc: 'Selecciona trazados vectoriales completos', icon: Spline },
  { id: 'nodes', label: 'Selección de Nodos', shortLabel: 'Nod', desc: 'Selecciona nodos y tangentes de curvas', icon: GitCommitHorizontal },
];

const LASSO_SUBTOOLS: {
  id: LassoMode;
  label: string;
  shortLabel: string;
  desc: string;
  icon: React.FC<{ className?: string }>;
  hotkey?: string;
}[] = [
  { id: 'free', label: 'Lazo Libre', shortLabel: 'Lib', desc: 'Selección fluida a mano alzada', icon: Lasso, hotkey: 'Q' },
  { id: 'polygon', label: 'Lazo Poligonal', shortLabel: 'Pol', desc: 'Segmentos rectos clic a clic', icon: PolygonIcon },
  { id: 'magnetic', label: 'Lazo Magnético', shortLabel: 'Mag', desc: 'Ajuste automático a bordes y contornos', icon: Magnet, hotkey: 'Shift+Q' },
];

const BUCKET_SUBTOOLS: {
  id: BucketSubTool;
  label: string;
  shortLabel: string;
  desc: string;
  icon: React.FC<{ className?: string }>;
  hotkey?: string;
}[] = [
  { id: 'solid', label: 'Relleno Sólido', shortLabel: 'Sól', desc: 'Bote de pintura contiguo clásico', icon: PaintBucket, hotkey: 'G' },
  { id: 'gradient', label: 'Degradado', shortLabel: 'Deg', desc: 'Lineal, radial, angular, reflejado y diamante', icon: Blend },
  { id: 'dither_gradient', label: 'Degradado con Dithering', shortLabel: 'Dit', desc: 'Degradado pixel art (Bayer, Ordered, Custom, Noise)', icon: Grid },
];

const SHAPE_SUBTOOLS: {
  id: ShapeToolKind;
  label: string;
  shortLabel: string;
  desc: string;
  icon: React.FC<{ className?: string }>;
  hotkey?: string;
}[] = [
  { id: 'rectangle', label: 'Rectángulo', shortLabel: 'Rec', desc: 'Esquinas redondeadas independientes, bisel y relleno', icon: Square, hotkey: 'U' },
  { id: 'ellipse', label: 'Elipse / Círculo', shortLabel: 'Elp', desc: 'Arco/apertura editable, pixel-perfect y antialiasing', icon: Circle, hotkey: 'C' },
  { id: 'polygon', label: 'Polígono', shortLabel: 'Pol', desc: 'Lados editables, radio interno y redondeado de vértices', icon: Hexagon },
  { id: 'star', label: 'Estrella', shortLabel: 'Est', desc: 'Puntas, profundidad, simetría y rotación directa', icon: Star },
  { id: 'arrow', label: 'Flecha', shortLabel: 'Fle', desc: 'Longitud, cuerpo, 5 tipos de punta y curvatura en vivo', icon: ArrowRight },
  { id: 'custom', label: 'Forma Personalizada', shortLabel: 'Per', desc: 'Corazón, escudo, rayo, nube, bocadillo, cruz y más', icon: Shapes },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onSelectTool,
  moveSubTool = 'move_object',
  onChangeMoveSubTool,
  selectionSubTool = 'general',
  onChangeSelectionSubTool,
  bucketSubTool = 'solid',
  onChangeBucketSubTool,
  shapeConfig = DEFAULT_SHAPE_CONFIG,
  onChangeShapeConfig,
  zoomToolMode = 'in',
  onChangeZoomToolMode,
  onTriggerZoomAction,
  brushSettings,
  onChangeBrushSettings,
  onCenterAllReferences,
  brushSize,
  onChangeBrushSize,
  pixelPerfect,
  onTogglePixelPerfect,
  ditherPattern,
  onChangeDitherPattern,
  ditherConfig = DEFAULT_DITHER_CONFIG,
  onChangeDitherConfig,
  marqueeShape = 'rect',
  onChangeMarqueeShape,
  lassoMode = 'free',
  onChangeLassoMode,
  activeHitboxType,
  onChangeHitboxType,
  primaryColor,
  secondaryColor,
  onSwapColors,
  onSelectPrimaryColor,
  onSelectSecondaryColor,
  dockPosition = 'left',
  orientation = 'vertical',
  embeddedInDock = false,
  toolbarColumns = 1,
  onChangeToolbarColumns,
  toolbarWidth,
  toolbarHeight,
  onChangeToolbarSize,
  onFloatToolbar,
  isFloatingToolbar = false,
  linkMoveAllFrames = false,
  onToggleLinkMoveAllFrames,
  onOpenBrushSettings,
  shortcutLabels,
  toolOrder,
  onChangeToolOrder,
  uiEditMode = false,
  onToggleUiEditMode,
}) => {
  void ditherPattern;
  void onChangeDitherPattern;
  void onChangeZoomToolMode;
  void onTriggerZoomAction;
  void onChangeBrushSettings;
  void onCenterAllReferences;
  void brushSize;
  void onChangeBrushSize;
  void pixelPerfect;
  void onTogglePixelPerfect;
  void onChangeDitherConfig;
  void marqueeShape;
  void onChangeMarqueeShape;
  void activeHitboxType;
  void onChangeHitboxType;
  void toolbarColumns;
  void onChangeToolbarColumns;
  void linkMoveAllFrames;
  void onToggleLinkMoveAllFrames;
  void onOpenBrushSettings;
  const isRightDock = dockPosition === 'right';
  const isHorizontal = orientation === 'horizontal';
  const effectiveDither = ditherConfig || DEFAULT_DITHER_CONFIG;

  const asideRef = useRef<HTMLElement>(null);
  const [containerDims, setContainerDims] = useState<{ w: number; h: number }>({ w: 60, h: 600 });
  const [resizingAxis, setResizingAxis] = useState<'w' | 'h' | null>(null);
  const resizeStartRef = useRef<{ x: number; y: number; origW: number; origH: number }>({
    x: 0,
    y: 0,
    origW: 60,
    origH: 600,
  });

  const [localReorderActive, setLocalReorderActive] = useState(false);
  const isReorderActive = Boolean(uiEditMode || localReorderActive);
  const [flyoutState, setFlyoutState] = useState<{
    group: FlyoutGroupId;
    left: number;
    top: number;
  } | null>(null);
  const holdTimerRef = useRef<number | null>(null);

  const openFlyoutFromEl = (group: FlyoutGroupId, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const flyW = 264;
    const itemCount =
      group === 'select' ? 6 : group === 'move' ? 5 : group === 'shape' ? 2 : 3;
    const flyH = 44 + itemCount * 42;
    let left = isRightDock ? r.left - flyW - 6 : r.right + 6;
    if (isHorizontal) {
      left = Math.min(window.innerWidth - flyW - 8, Math.max(8, r.left));
    }
    if (left < 8) left = r.right + 6;
    if (left + flyW > window.innerWidth - 8) left = Math.max(8, window.innerWidth - flyW - 8);
    const top = isHorizontal
      ? Math.min(window.innerHeight - flyH - 8, r.bottom + 6)
      : Math.min(window.innerHeight - flyH - 8, Math.max(8, r.top));
    setFlyoutState({ group, left, top });
  };

  useEffect(() => {
    if (!flyoutState) return;
    const onDown = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      if (target?.closest('[data-tool-flyout="true"]')) return;
      setFlyoutState(null);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setFlyoutState(null);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [flyoutState]);

  useEffect(() => {
    const el = asideRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerDims({
          w: Math.round(entry.contentRect.width),
          h: Math.round(entry.contentRect.height),
        });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!resizingAxis) return;
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - resizeStartRef.current.x;
      const dy = e.clientY - resizeStartRef.current.y;
      if (resizingAxis === 'w') {
        const nextW = Math.max(
          56,
          Math.min(280, Math.round(resizeStartRef.current.origW + (isRightDock ? -dx : dx)))
        );
        onChangeToolbarSize?.({ width: nextW });
      } else if (resizingAxis === 'h') {
        const nextH = Math.max(160, Math.min(900, Math.round(resizeStartRef.current.origH + dy)));
        onChangeToolbarSize?.({ height: nextH });
      }
    };
    const onUp = () => setResizingAxis(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [resizingAxis, isRightDock, onChangeToolbarSize]);

  const computedStandaloneWidth = toolbarWidth
    ? Math.max(56, Math.min(280, toolbarWidth))
    : 58;

  // Dynamic column reflow driven purely by actual toolbar width/height (eliminates fixed 1/2/3/Auto buttons)
  const resolvedColumns = useMemo(() => {
    if (isHorizontal) return 0;
    const effectiveW = embeddedInDock ? containerDims.w : computedStandaloneWidth;
    const byWidth = Math.max(1, Math.min(6, Math.floor(Math.max(52, effectiveW - 10) / 38)));
    if (containerDims.h > 0 && containerDims.h < 380 && byWidth < 2) return 2;
    return byWidth;
  }, [isHorizontal, embeddedInDock, containerDims.w, containerDims.h, computedStandaloneWidth]);

  const orderedTools = useMemo(() => {
    const map = new Map(TOOLS.map((t) => [t.id, t]));
    const base = toolOrder && toolOrder.length > 0 ? toolOrder : DEFAULT_TOOL_ORDER;
    const seen = new Set<ToolType>();
    const result: typeof TOOLS = [];
    for (const id of base) {
      const item = map.get(id);
      if (item && !seen.has(id)) {
        seen.add(id);
        result.push(item);
      }
    }
    for (const item of TOOLS) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        result.push(item);
      }
    }
    return result;
  }, [toolOrder]);

  const orderedIds = useMemo(() => orderedTools.map((t) => t.id), [orderedTools]);

  // Pointer-based Drag & Drop state for reordering tools reliably
  const [dragToolState, setDragToolState] = useState<{
    id: ToolType;
    label: string;
    startX: number;
    startY: number;
    pointerX: number;
    pointerY: number;
    isDragging: boolean;
    overIndex: number | null;
  } | null>(null);
  const suppressClickRef = useRef<number>(0);
  const toolsContainerRef = useRef<HTMLDivElement>(null);

  const moveToolByAction = (toolId: ToolType, action: 'top' | 'up' | 'down' | 'bottom') => {
    if (!onChangeToolOrder) return;
    const list = [...orderedIds];
    const idx = list.indexOf(toolId);
    if (idx === -1) return;
    list.splice(idx, 1);
    if (action === 'top') {
      list.unshift(toolId);
    } else if (action === 'bottom') {
      list.push(toolId);
    } else if (action === 'up') {
      list.splice(Math.max(0, idx - 1), 0, toolId);
    } else if (action === 'down') {
      list.splice(Math.min(list.length, idx + 1), 0, toolId);
    }
    onChangeToolOrder(list);
  };

  useEffect(() => {
    if (!dragToolState) return;

    const handlePointerMove = (e: PointerEvent) => {
      const dx = e.clientX - dragToolState.startX;
      const dy = e.clientY - dragToolState.startY;
      const isDraggingNow = dragToolState.isDragging || Math.hypot(dx, dy) > 4;

      let overIndex: number | null = dragToolState.overIndex;
      if (isDraggingNow && toolsContainerRef.current) {
        const items = Array.from(
          toolsContainerRef.current.querySelectorAll<HTMLElement>('[data-tool-index]')
        );
        let bestIdx: number | null = null;
        let bestDist = Infinity;
        for (const el of items) {
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
          if (dist < bestDist) {
            bestDist = dist;
            const rawIdx = Number(el.dataset.toolIndex);
            if (!Number.isNaN(rawIdx)) bestIdx = rawIdx;
          }
        }
        overIndex = bestIdx;
      }

      setDragToolState((prev) =>
        prev
          ? {
              ...prev,
              pointerX: e.clientX,
              pointerY: e.clientY,
              isDragging: isDraggingNow,
              overIndex,
            }
          : null
      );
    };

    const handlePointerUp = () => {
      if (dragToolState.isDragging && dragToolState.overIndex !== null && onChangeToolOrder) {
        const list = [...orderedIds];
        const fromIdx = list.indexOf(dragToolState.id);
        const toIdx = Math.max(0, Math.min(list.length - 1, dragToolState.overIndex));
        if (fromIdx !== -1 && fromIdx !== toIdx) {
          const [moved] = list.splice(fromIdx, 1);
          list.splice(toIdx, 0, moved);
          onChangeToolOrder(list);
        }
        suppressClickRef.current = Date.now() + 140;
      }
      setDragToolState(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [dragToolState, orderedIds, onChangeToolOrder]);

  const activeToolIndex = orderedIds.indexOf(activeTool);

  return (
    <aside
      ref={asideRef}
      data-help-id="panel.toolbar"
      data-panel-id="toolbar"
      className={`${
        embeddedInDock
          ? isHorizontal
            ? 'w-full flex flex-row flex-wrap items-center gap-2 p-2 select-none justify-between'
            : 'w-full flex flex-col items-center py-2 px-1.5 select-none justify-between gap-2 min-h-0'
          : `flex flex-col items-center py-2 select-none z-20 shrink-0 justify-between overflow-y-auto overflow-x-hidden relative ${
              isRightDock ? 'border-l' : 'border-r'
            }`
      }`}
      style={{
        width: embeddedInDock ? undefined : computedStandaloneWidth,
        height: !embeddedInDock && toolbarHeight ? toolbarHeight : undefined,
        maxHeight: !embeddedInDock ? '100%' : undefined,
        backgroundColor: 'var(--studio-bg-panel)',
        borderColor: resizingAxis ? 'var(--studio-accent)' : 'var(--studio-border)',
        color: 'var(--studio-text)',
      }}
    >
      {/* Tool Reorder Activation & Float Action */}
      <div
        className={
          isHorizontal
            ? 'flex items-center gap-1 shrink-0'
            : 'flex flex-col items-center gap-1 w-full px-1.5 pb-1.5 border-b shrink-0'
        }
        style={{ borderColor: 'var(--studio-border)' }}
      >
        <div className={isHorizontal ? 'flex items-center gap-1' : 'flex items-center gap-1 w-full'}>
          <button
            type="button"
            onClick={() => {
              if (uiEditMode && onToggleUiEditMode && !localReorderActive) {
                onToggleUiEditMode();
              } else {
                setLocalReorderActive((v) => !v);
              }
            }}
            title={
              isReorderActive
                ? 'Ordenar Herramientas ACTIVO: arrastra cualquier herramienta o selecciona una y usa ⤒ ↑ ↓ ⤓'
                : 'Activar orden libre de herramientas'
            }
            className={`studio-btn-shape rounded-md border flex items-center justify-center gap-1 transition-colors ${
              isHorizontal ? 'px-2 py-1 text-[10px] font-bold' : 'flex-1 py-1 text-[9px] font-mono font-bold'
            }`}
            style={{
              backgroundColor: isReorderActive ? 'var(--studio-accent)' : 'var(--studio-bg-card)',
              color: isReorderActive ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
              borderColor: isReorderActive ? 'var(--studio-accent)' : 'var(--studio-border-strong)',
            }}
          >
            <ArrowUpDown className="w-3 h-3 shrink-0" />
            <span>{isHorizontal ? (isReorderActive ? 'Orden Libre ON' : 'Ordenar') : 'ORD'}</span>
          </button>

          {!embeddedInDock && onFloatToolbar && (
            <button
              type="button"
              onClick={onFloatToolbar}
              title={isFloatingToolbar ? 'Acoplar barra de herramientas' : 'Convertir barra en panel flotante'}
              className="studio-btn-shape p-1 rounded-md border flex items-center justify-center shrink-0 hover:opacity-90"
              style={{
                backgroundColor: isFloatingToolbar ? 'var(--studio-accent)' : 'var(--studio-bg-card)',
                color: isFloatingToolbar ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                borderColor: 'var(--studio-border-strong)',
              }}
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>

        {isReorderActive && onChangeToolOrder && (
          <div
            className={
              isHorizontal
                ? 'flex items-center gap-0.5 px-1 py-0.5 rounded border'
                : 'grid grid-cols-2 gap-0.5 w-full p-0.5 rounded border'
            }
            style={{
              backgroundColor: 'var(--studio-bg-card)',
              borderColor: 'var(--studio-accent)',
            }}
          >
            <button
              type="button"
              disabled={activeToolIndex <= 0}
              onClick={() => moveToolByAction(activeTool, 'top')}
              title="Mover herramienta seleccionada al inicio (arriba del todo)"
              className="p-0.5 rounded flex items-center justify-center hover:bg-amber-400/20 disabled:opacity-30"
            >
              <ChevronsUp className="w-3 h-3" />
            </button>
            <button
              type="button"
              disabled={activeToolIndex <= 0}
              onClick={() => moveToolByAction(activeTool, 'up')}
              title="Subir 1 posición"
              className="p-0.5 rounded flex items-center justify-center hover:bg-amber-400/20 disabled:opacity-30"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <button
              type="button"
              disabled={activeToolIndex === -1 || activeToolIndex >= orderedIds.length - 1}
              onClick={() => moveToolByAction(activeTool, 'down')}
              title="Bajar 1 posición"
              className="p-0.5 rounded flex items-center justify-center hover:bg-amber-400/20 disabled:opacity-30"
            >
              <ArrowDown className="w-3 h-3" />
            </button>
            <button
              type="button"
              disabled={activeToolIndex === -1 || activeToolIndex >= orderedIds.length - 1}
              onClick={() => moveToolByAction(activeTool, 'bottom')}
              title="Mover herramienta seleccionada al final (debajo de todo)"
              className="p-0.5 rounded flex items-center justify-center hover:bg-amber-400/20 disabled:opacity-30"
            >
              <ChevronsDown className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onChangeToolOrder([...DEFAULT_TOOL_ORDER])}
              title="Restaurar orden predeterminado de herramientas"
              className={`${isHorizontal ? 'p-0.5' : 'col-span-2 py-0.5'} rounded flex items-center justify-center hover:bg-rose-500/20 text-[8px] font-mono`}
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          </div>
        )}
      </div>

      {/* Tool Buttons Grid / Flex */}
      <div
        ref={toolsContainerRef}
        className={
          isHorizontal
            ? 'flex flex-row flex-wrap items-center gap-1 flex-1'
            : resolvedColumns >= 2
            ? 'grid gap-1 w-full px-1.5 place-items-center overflow-y-auto min-h-0 flex-1 content-start'
            : embeddedInDock
            ? 'flex flex-row flex-wrap items-center justify-center gap-1 w-full overflow-y-auto min-h-0 flex-1'
            : 'flex flex-col items-center gap-1 w-full px-1.5 overflow-y-auto min-h-0 flex-1'
        }
        style={
          !isHorizontal && resolvedColumns >= 2
            ? { gridTemplateColumns: `repeat(${resolvedColumns}, minmax(0, 1fr))` }
            : undefined
        }
      >
        {orderedTools.map((t, idx) => {
          const flyoutGroup = t.flyoutGroup;
          let Icon = t.icon;
          let displayLabel = t.label;
          let isActive = activeTool === t.id;

          if (t.id === 'move') {
            const meta = MOVE_SUBTOOLS.find((m) => m.id === moveSubTool) || MOVE_SUBTOOLS[0];
            Icon = meta.icon;
            displayLabel = `${meta.label} (${meta.desc})`;
            isActive = activeTool === 'move' || activeTool === 'direct_select' || activeTool === 'vector_select';
          } else if (t.id === 'select') {
            const meta = SELECTION_SUBTOOLS.find((s) => s.id === selectionSubTool) || SELECTION_SUBTOOLS[0];
            Icon = meta.icon;
            displayLabel = `${meta.label} (${meta.desc})`;
          } else if (t.id === 'lasso') {
            const meta = LASSO_SUBTOOLS.find((l) => l.id === lassoMode) || LASSO_SUBTOOLS[0];
            Icon = meta.icon;
            displayLabel = `${meta.label} (${meta.desc})`;
          } else if (t.id === 'bucket') {
            const meta = BUCKET_SUBTOOLS.find((b) => b.id === bucketSubTool) || BUCKET_SUBTOOLS[0];
            Icon = meta.icon;
            displayLabel = `${meta.label} (${meta.desc})`;
          } else if (t.id === 'rectangle') {
            const kind = activeTool === 'circle' ? 'ellipse' : shapeConfig.shapeKind;
            const meta = SHAPE_SUBTOOLS.find((s) => s.id === kind) || SHAPE_SUBTOOLS[0];
            Icon = meta.icon;
            displayLabel = `Forma · ${meta.label} (${meta.desc})`;
            isActive = activeTool === 'rectangle' || activeTool === 'circle';
          } else if (t.id === 'pencil') {
            isActive =
              activeTool === 'pencil' ||
              activeTool === 'dither' ||
              activeTool === 'smear' ||
              activeTool === 'shading';
          } else if (t.id === 'zoom') {
            Icon = zoomToolMode === 'out' ? ZoomOut : ZoomIn;
          }

          const hotkey = shortcutLabels?.[t.id] || t.hotkey;
          const isBeingDragged = dragToolState?.isDragging && dragToolState.id === t.id;
          const isDropTarget = dragToolState?.isDragging && dragToolState.overIndex === idx && dragToolState.id !== t.id;

          // Active modifier badge dot for Pencil (Dithering / Smear / Cel-Shade)
          const hasPencilModifier =
            t.id === 'pencil' &&
            Boolean(effectiveDither.enabled || brushSettings?.smearEnabled || brushSettings?.celShadeEnabled);

          return (
            <button
              key={t.id}
              data-tool-id={t.id}
              data-tool-index={idx}
              data-help-id={`tool.${t.id}`}
              onPointerDown={(e) => {
                if (isReorderActive && e.button === 0) {
                  e.stopPropagation();
                  setDragToolState({
                    id: t.id,
                    label: t.label.split(' (')[0],
                    startX: e.clientX,
                    startY: e.clientY,
                    pointerX: e.clientX,
                    pointerY: e.clientY,
                    isDragging: false,
                    overIndex: idx,
                  });
                  return;
                }
                if (flyoutGroup && e.button === 0) {
                  const targetEl = e.currentTarget;
                  if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
                  holdTimerRef.current = window.setTimeout(() => {
                    suppressClickRef.current = Date.now() + 260;
                    openFlyoutFromEl(flyoutGroup, targetEl);
                  }, 220);
                }
              }}
              onPointerUp={() => {
                if (holdTimerRef.current) {
                  window.clearTimeout(holdTimerRef.current);
                  holdTimerRef.current = null;
                }
              }}
              onPointerCancel={() => {
                if (holdTimerRef.current) {
                  window.clearTimeout(holdTimerRef.current);
                  holdTimerRef.current = null;
                }
              }}
              onContextMenu={(e) => {
                if (flyoutGroup && !isReorderActive) {
                  e.preventDefault();
                  e.stopPropagation();
                  openFlyoutFromEl(flyoutGroup, e.currentTarget);
                }
              }}
              onClick={() => {
                if (Date.now() < suppressClickRef.current) return;
                if (t.id === 'rectangle') {
                  onSelectTool(shapeConfig.shapeKind === 'ellipse' ? 'circle' : 'rectangle');
                } else {
                  onSelectTool(t.id);
                }
              }}
              title={
                isReorderActive
                  ? `Arrastra para reordenar: ${t.label}`
                  : flyoutGroup
                  ? `${displayLabel} (${hotkey}) · Mantén clic o clic derecho para subherramientas`
                  : `${displayLabel} (${hotkey})`
              }
              className={`studio-btn-shape studio-icon-scalable ${
                embeddedInDock || resolvedColumns >= 2 ? 'w-8 h-8' : 'w-9 h-9'
              } rounded-lg flex items-center justify-center transition-all relative group shrink-0 ${
                isReorderActive ? 'cursor-grab active:cursor-grabbing ring-1 ring-amber-400/40' : 'cursor-pointer'
              } ${isBeingDragged ? 'opacity-35 scale-90' : ''} ${
                isDropTarget ? 'ring-2 ring-amber-400 scale-105' : ''
              }`}
              style={{
                backgroundColor: isActive ? 'var(--studio-accent)' : 'transparent',
                color: isActive ? 'var(--studio-accent-text)' : 'var(--studio-icon-color)',
                fontWeight: isActive ? 700 : 500,
              }}
            >
              <Icon className="w-4 h-4" />
              {hasPencilModifier && (
                <span
                  className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-300 ring-1 ring-black/60"
                  title="Modificador de pincel activo (Dithering / Smear / Cel Shading)"
                />
              )}
              {/* Photoshop-style corner triangle for grouped tools */}
              {flyoutGroup && !isReorderActive && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    const btn = e.currentTarget.parentElement;
                    if (btn) openFlyoutFromEl(flyoutGroup, btn);
                  }}
                  title="Desplegar subherramientas"
                  className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 flex items-end justify-end opacity-85 hover:opacity-100"
                >
                  <svg viewBox="0 0 6 6" className="w-1.5 h-1.5 fill-current">
                    <path d="M6 0v6H0z" />
                  </svg>
                </span>
              )}
              {/* Tooltip */}
              {!embeddedInDock && !dragToolState?.isDragging && !flyoutState && (
                <span
                  className={`absolute ${
                    isRightDock ? 'right-12' : 'left-12'
                  } text-xs px-2 py-1 rounded shadow-lg border whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50`}
                  style={{
                    backgroundColor: 'var(--studio-bg-bar)',
                    color: 'var(--studio-text)',
                    borderColor: 'var(--studio-border-strong)',
                  }}
                >
                  {isReorderActive ? 'Arrastra para reordenar · ' : ''}
                  {displayLabel}{' '}
                  <span className="font-mono text-[10px]" style={{ color: 'var(--studio-accent)' }}>
                    [{hotkey}]
                  </span>
                </span>
              )}
            </button>
          );
        })}

        {/* Unified Photoshop-style Portal Flyout Menu for Grouped Tools */}
        {flyoutState &&
          createPortal(
            <div
              data-tool-flyout="true"
              className="fixed w-64 rounded-xl border shadow-2xl p-1.5 flex flex-col gap-0.5 backdrop-blur-md"
              style={{
                zIndex: STUDIO_Z.CONTEXT_MENU,
                left: flyoutState.left,
                top: flyoutState.top,
                backgroundColor: 'var(--studio-bg-panel)',
                borderColor: 'var(--studio-accent)',
                color: 'var(--studio-text)',
              }}
            >
              <div
                className="px-2 py-1 text-[9px] font-mono uppercase tracking-wider border-b mb-0.5 flex items-center justify-between"
                style={{ borderColor: 'var(--studio-border)', color: 'var(--studio-text-muted)' }}
              >
                <span>
                  {flyoutState.group === 'move' && 'Subherramientas Mover'}
                  {flyoutState.group === 'select' && 'Subherramientas Selección'}
                  {flyoutState.group === 'lasso' && 'Subherramientas Lazo'}
                  {flyoutState.group === 'bucket' && 'Bote de Pintura y Degradado'}
                  {flyoutState.group === 'shape' && 'Herramienta Forma'}
                </span>
                <span>
                  {flyoutState.group === 'move' && 'V'}
                  {flyoutState.group === 'select' && 'M'}
                  {flyoutState.group === 'lasso' && 'Q'}
                  {flyoutState.group === 'bucket' && 'G'}
                  {flyoutState.group === 'shape' && 'U / C'}
                </span>
              </div>

              {flyoutState.group === 'move' &&
                MOVE_SUBTOOLS.map((sub) => {
                  const SubIcon = sub.icon;
                  const selected =
                    (activeTool === 'move' && moveSubTool === sub.id) ||
                    (activeTool === 'direct_select' && sub.id === 'direct_select');
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        onChangeMoveSubTool?.(sub.id);
                        onSelectTool('move');
                        setFlyoutState(null);
                      }}
                      className="px-2 py-1.5 rounded-lg text-left flex items-center justify-between gap-2 transition-colors hover:bg-white/5"
                      style={{
                        backgroundColor: selected
                          ? 'color-mix(in srgb, var(--studio-accent) 18%, var(--studio-bg-elevated))'
                          : 'transparent',
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <SubIcon className="w-3.5 h-3.5 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-semibold truncate">{sub.label}</span>
                          <span className="text-[9px] truncate" style={{ color: 'var(--studio-text-muted)' }}>
                            {sub.desc}
                          </span>
                        </div>
                      </div>
                      {selected ? (
                        <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--studio-accent)' }} />
                      ) : sub.hotkey ? (
                        <span className="text-[9px] font-mono opacity-60 shrink-0">{sub.hotkey}</span>
                      ) : null}
                    </button>
                  );
                })}

              {flyoutState.group === 'select' &&
                SELECTION_SUBTOOLS.map((sub) => {
                  const SubIcon = sub.icon;
                  const selected = activeTool === 'select' && selectionSubTool === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        onChangeSelectionSubTool?.(sub.id);
                        onSelectTool('select');
                        setFlyoutState(null);
                      }}
                      className="px-2 py-1.5 rounded-lg text-left flex items-center justify-between gap-2 transition-colors hover:bg-white/5"
                      style={{
                        backgroundColor: selected
                          ? 'color-mix(in srgb, var(--studio-accent) 18%, var(--studio-bg-elevated))'
                          : 'transparent',
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <SubIcon className="w-3.5 h-3.5 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-semibold truncate">{sub.label}</span>
                          <span className="text-[9px] truncate" style={{ color: 'var(--studio-text-muted)' }}>
                            {sub.desc}
                          </span>
                        </div>
                      </div>
                      {selected && (
                        <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--studio-accent)' }} />
                      )}
                    </button>
                  );
                })}

              {flyoutState.group === 'lasso' &&
                LASSO_SUBTOOLS.map((sub) => {
                  const SubIcon = sub.icon;
                  const selected = activeTool === 'lasso' && lassoMode === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        onChangeLassoMode?.(sub.id);
                        onSelectTool('lasso');
                        setFlyoutState(null);
                      }}
                      className="px-2 py-1.5 rounded-lg text-left flex items-center justify-between gap-2 transition-colors hover:bg-white/5"
                      style={{
                        backgroundColor: selected
                          ? 'color-mix(in srgb, var(--studio-accent) 18%, var(--studio-bg-elevated))'
                          : 'transparent',
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <SubIcon className="w-3.5 h-3.5 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-semibold truncate">{sub.label}</span>
                          <span className="text-[9px] truncate" style={{ color: 'var(--studio-text-muted)' }}>
                            {sub.desc}
                          </span>
                        </div>
                      </div>
                      {selected ? (
                        <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--studio-accent)' }} />
                      ) : sub.hotkey ? (
                        <span className="text-[9px] font-mono opacity-60 shrink-0">{sub.hotkey}</span>
                      ) : null}
                    </button>
                  );
                })}

              {flyoutState.group === 'bucket' &&
                BUCKET_SUBTOOLS.map((sub) => {
                  const SubIcon = sub.icon;
                  const selected = activeTool === 'bucket' && bucketSubTool === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        onChangeBucketSubTool?.(sub.id);
                        onSelectTool('bucket');
                        setFlyoutState(null);
                      }}
                      className="px-2 py-1.5 rounded-lg text-left flex items-center justify-between gap-2 transition-colors hover:bg-white/5"
                      style={{
                        backgroundColor: selected
                          ? 'color-mix(in srgb, var(--studio-accent) 18%, var(--studio-bg-elevated))'
                          : 'transparent',
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <SubIcon className="w-3.5 h-3.5 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-semibold truncate">{sub.label}</span>
                          <span className="text-[9px] truncate" style={{ color: 'var(--studio-text-muted)' }}>
                            {sub.desc}
                          </span>
                        </div>
                      </div>
                      {selected ? (
                        <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--studio-accent)' }} />
                      ) : sub.hotkey ? (
                        <span className="text-[9px] font-mono opacity-60 shrink-0">{sub.hotkey}</span>
                      ) : null}
                    </button>
                  );
                })}

              {flyoutState.group === 'shape' &&
                SHAPE_SUBTOOLS.map((sub) => {
                  const SubIcon = sub.icon;
                  const selected =
                    (activeTool === 'rectangle' && shapeConfig.shapeKind === sub.id) ||
                    (activeTool === 'circle' && sub.id === 'ellipse');
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        onSelectTool(sub.id === 'ellipse' ? 'circle' : 'rectangle');
                        onChangeShapeConfig?.({ ...shapeConfig, shapeKind: sub.id });
                        setFlyoutState(null);
                      }}
                      className="px-2 py-1.5 rounded-lg text-left flex items-center justify-between gap-2 transition-colors hover:bg-white/5"
                      style={{
                        backgroundColor: selected
                          ? 'color-mix(in srgb, var(--studio-accent) 18%, var(--studio-bg-elevated))'
                          : 'transparent',
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <SubIcon className="w-3.5 h-3.5 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-semibold truncate">{sub.label}</span>
                          <span className="text-[9px] truncate" style={{ color: 'var(--studio-text-muted)' }}>
                            {sub.desc}
                          </span>
                        </div>
                      </div>
                      {selected ? (
                        <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--studio-accent)' }} />
                      ) : sub.hotkey ? (
                        <span className="text-[9px] font-mono opacity-60 shrink-0">{sub.hotkey}</span>
                      ) : null}
                    </button>
                  );
                })}
            </div>,
            document.body
          )}

        {/* Floating drag ghost */}
        {dragToolState?.isDragging && (
          <div
            className="fixed z-[9999] pointer-events-none px-2 py-1 rounded-lg border shadow-xl text-[10px] font-mono font-bold"
            style={{
              left: dragToolState.pointerX + 12,
              top: dragToolState.pointerY + 12,
              backgroundColor: 'var(--studio-bg-bar)',
              borderColor: 'var(--studio-accent)',
              color: 'var(--studio-accent)',
            }}
          >
            ↕ {dragToolState.label}
          </div>
        )}

      </div>

      {/* Primary & Secondary Color Swatches */}
      <div
        className={
          isHorizontal
            ? 'flex flex-row items-center gap-2 pl-2 border-l shrink-0'
            : 'flex flex-col items-center gap-2 pt-2 border-t w-full px-2 shrink-0'
        }
        style={{ borderColor: 'var(--studio-border)' }}
      >
        <div className="relative w-8 h-8">
          {/* Secondary Color Swatch */}
          <div
            onClick={() => {
              const input = document.getElementById('secondary-color-picker');
              input?.click();
            }}
            title={`Color secundario: ${secondaryColor} (Clic para cambiar)`}
            className="absolute bottom-0 right-0 w-5 h-5 rounded border cursor-pointer shadow-xs"
            style={{ backgroundColor: secondaryColor, borderColor: 'var(--studio-border-strong)' }}
          />
          {/* Primary Color Swatch */}
          <div
            onClick={() => {
              const input = document.getElementById('primary-color-picker');
              input?.click();
            }}
            title={`Color principal: ${primaryColor} (Clic para cambiar)`}
            className="absolute top-0 left-0 w-5 h-5 rounded border-2 border-white cursor-pointer shadow-md z-10"
            style={{ backgroundColor: primaryColor }}
          />
          {/* Hidden inputs */}
          <input
            id="primary-color-picker"
            type="color"
            value={primaryColor}
            onChange={(e) => onSelectPrimaryColor(e.target.value)}
            className="sr-only"
          />
          <input
            id="secondary-color-picker"
            type="color"
            value={secondaryColor}
            onChange={(e) => onSelectSecondaryColor(e.target.value)}
            className="sr-only"
          />
        </div>

        {/* Color Swap Button */}
        <button
          onClick={onSwapColors}
          title="Alternar colores [X]"
          className="p-1 rounded transition-colors hover:opacity-80 cursor-pointer"
          style={{ color: 'var(--studio-text-muted)' }}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* H & V Edge Resize Handles for standalone Toolbar */}
      {!embeddedInDock && onChangeToolbarSize && (
        <>
          <div
            onPointerDown={(e) => {
              e.preventDefault();
              const rect = asideRef.current?.getBoundingClientRect();
              resizeStartRef.current = {
                x: e.clientX,
                y: e.clientY,
                origW: Math.round(rect?.width || computedStandaloneWidth),
                origH: Math.round(rect?.height || 600),
              };
              setResizingAxis('w');
            }}
            onDoubleClick={() => onChangeToolbarSize({ width: 58 })}
            title="Arrastra para redimensionar ancho (las columnas se adaptan automáticamente · doble clic para restablecer)"
            className={`absolute top-0 bottom-2 ${
              isRightDock ? 'left-0' : 'right-0'
            } w-1.5 cursor-col-resize z-30 transition-colors ${
              resizingAxis === 'w' ? 'bg-amber-400/60' : 'hover:bg-amber-400/35'
            }`}
          />
          <div
            onPointerDown={(e) => {
              e.preventDefault();
              const rect = asideRef.current?.getBoundingClientRect();
              resizeStartRef.current = {
                x: e.clientX,
                y: e.clientY,
                origW: Math.round(rect?.width || computedStandaloneWidth),
                origH: Math.round(rect?.height || 600),
              };
              setResizingAxis('h');
            }}
            title="Arrastra para redimensionar altura de la barra de herramientas"
            className={`h-1.5 w-full cursor-row-resize shrink-0 transition-colors ${
              resizingAxis === 'h' ? 'bg-amber-400/60' : 'hover:bg-amber-400/35'
            }`}
          />
        </>
      )}
    </aside>
  );
};
