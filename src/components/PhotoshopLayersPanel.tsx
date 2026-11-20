import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  FolderPlus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Search,
  X,
  Grid3X3,
  Paintbrush,
  Move,
  Link2,
  Link2Off,
  Contrast,
  Image as ImageIcon,
  Type as TypeIcon,
  PenTool,
  Sparkles,
  Wand2,
  Film,
  Clock,
  Square,
  SquareDashed,
  CornerDownRight,
  FilePlus2,
  Copy,
  Combine,
  Layers,
  Check,
  ChevronUp,
  Palette,
  SlidersHorizontal,
  Globe,
  Scan,
  Maximize,
} from 'lucide-react';
import {
  Layer,
  LayerAdjustmentConfig,
  LayerBlendMode,
  LayerGroup,
  LayerMaskType,
  LayerType,
} from '../types';
import { DEFAULT_ADJUSTMENT_CONFIG } from '../utils/colorFilters';
import { renderPixelGridToCanvas, ThumbnailBoundsMode } from '../utils/pixelMath';
import { StudioSlider } from './StudioSlider';
import { STUDIO_Z } from './StudioTopLayer';

export interface PhotoshopLayersPanelProps {
  layers: Layer[];
  layerGroups: LayerGroup[];
  currentLayerIndex: number;
  selectedLayerIndices: number[];
  canvasWidth: number;
  canvasHeight: number;
  hasActiveSelection?: boolean;
  editingMask?: boolean;
  onSetEditingMask?: (editing: boolean) => void;
  onSelectLayer: (index: number) => void;
  onSelectLayerIndices: (indices: number[]) => void;
  onAddLayer: (layerType?: LayerType) => void;
  onCreateAdjustmentLayer: (config: LayerAdjustmentConfig, name: string) => void;
  onDeleteLayer: (index: number) => void;
  onToggleLayerVisibility: (index: number) => void;
  onToggleLayerLock: (index: number) => void;
  onChangeLayerOpacity?: (index: number, opacity: number) => void;
  onUpdateLayerMeta: (index: number, patch: Partial<Layer>) => void;
  onReorderLayer: (fromIndex: number, toIndex: number, targetGroupId?: string | null) => void;
  onAssignLayerToGroup: (layerIndex: number, groupId: string | null) => void;
  onCreateLayerGroup: (name: string, color: string, parentGroupId?: string | null) => void;
  onRenameLayerGroup: (groupId: string, name: string) => void;
  onMoveLayerGroupParent: (groupId: string, parentGroupId: string | null) => void;
  onToggleGroupCollapse: (groupId: string) => void;
  onToggleGroupVisibility: (groupId: string) => void;
  onToggleGroupLock: (groupId: string) => void;
  onChangeGroupOpacity?: (groupId: string, opacity: number) => void;
  onChangeGroupColor?: (groupId: string, color: string) => void;
  onRequestDeleteGroup: (group: LayerGroup) => void;
  onMergeLayers: (indices: number[]) => void;
  onMergeVisibleLayers?: () => void;
  onMassDuplicateLayers: (indices: number[]) => void;
  onConvertLayersToGroup: (indices: number[], name: string, color: string) => void;
  onBatchToggleLayerVisibility: (indices: number[]) => void;
  onBatchToggleLayerLock: (indices: number[]) => void;
  onBatchDeleteLayers: (indices: number[]) => void;
  // Mask & Photoshop actions
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
  onDuplicateLayerToNextFrame?: (index: number) => void;
  onDuplicateLayerToAllFrames?: (index: number) => void;
  onDuplicateLayerToSelectedFrames?: (index: number) => void;
  onDuplicateGroupToAllFrames?: (groupId: string) => void;
  listHeightPx?: number;
  onChangeListHeightPx?: (h: number) => void;
  thumbSizeMode?: 'sm' | 'md' | 'lg';
  onChangeThumbSizeMode?: (s: 'sm' | 'md' | 'lg') => void;
  performanceMode?: 'quality' | 'balanced' | 'performance';
}

const BLEND_MODE_OPTIONS: { value: LayerBlendMode; label: string; group?: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'darken', label: 'Oscurecer' },
  { value: 'multiply', label: 'Multiplicar' },
  { value: 'color-burn', label: 'Color Burn' },
  { value: 'lighten', label: 'Aclarar' },
  { value: 'screen', label: 'Trama' },
  { value: 'color-dodge', label: 'Color Dodge' },
  { value: 'overlay', label: 'Superponer' },
  { value: 'soft-light', label: 'Luz Suave' },
  { value: 'hard-light', label: 'Luz Fuerte' },
  { value: 'difference', label: 'Diferencia' },
  { value: 'exclusion', label: 'Exclusión' },
  { value: 'hue', label: 'Tono' },
  { value: 'saturation', label: 'Saturación' },
  { value: 'color', label: 'Color' },
  { value: 'luminosity', label: 'Luminosidad' },
];

const COLOR_MARK_PRESETS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

const LAYER_TYPE_INFO: Record<
  LayerType,
  { label: string; color: string; Icon: React.FC<{ className?: string; style?: React.CSSProperties }> }
> = {
  raster: { label: 'Capa de píxeles', color: '#94a3b8', Icon: Square },
  empty: { label: 'Capa vacía', color: '#cbd5e1', Icon: SquareDashed },
  reference: { label: 'Capa de referencia', color: '#38bdf8', Icon: ImageIcon },
  text: { label: 'Capa de texto', color: '#f472b6', Icon: TypeIcon },
  vector: { label: 'Capa vectorial', color: '#34d399', Icon: PenTool },
  adjustment: { label: 'Capa de ajuste', color: '#c084fc', Icon: Contrast },
  smart: { label: 'Objeto inteligente', color: '#fbbf24', Icon: Sparkles },
  ai: { label: 'Capa generada con IA', color: '#a78bfa', Icon: Wand2 },
  animation: { label: 'Capa de animación', color: '#fb923c', Icon: Film },
  temp: { label: 'Capa temporal', color: '#fb7185', Icon: Clock },
};

const ROW_HEIGHT = 44;
const OVERSCAN_ROWS = 6;

type FilterMode = 'all' | 'visible' | 'groups' | 'locked' | 'masks';

// =====================================================================
// ASYNC CACHED THUMBNAIL ENGINE (1000+ layers smooth 60fps scrolling)
// =====================================================================
interface ThumbnailCacheEntry {
  pixelsRef: unknown;
  boundsMode: ThumbnailBoundsMode;
  w: number;
  h: number;
  url: string;
}

const layerThumbCache = new Map<string, ThumbnailCacheEntry>();
const maskThumbCache = new Map<string, { pixelsRef: unknown; inverted: boolean; url: string }>();
const pendingRenderQueue: Array<() => void> = [];
let queueRafId: number | null = null;

let currentThumbPerfMode: 'quality' | 'balanced' | 'performance' = 'balanced';

function scheduleThumbWork(fn: () => void) {
  pendingRenderQueue.push(fn);
  if (queueRafId !== null) return;
  const flush = () => {
    const budget = currentThumbPerfMode === 'performance' ? 3 : currentThumbPerfMode === 'balanced' ? 8 : 14;
    for (let i = 0; i < budget && pendingRenderQueue.length > 0; i++) {
      const task = pendingRenderQueue.shift();
      task?.();
    }
    if (pendingRenderQueue.length > 0) {
      if (currentThumbPerfMode === 'performance') {
        queueRafId = window.setTimeout(() => {
          queueRafId = requestAnimationFrame(flush);
        }, 64) as unknown as number;
      } else {
        queueRafId = requestAnimationFrame(flush);
      }
    } else {
      queueRafId = null;
    }
  };
  queueRafId = requestAnimationFrame(flush);
}

function renderGridDataUrl(
  pixels: (string | null)[][],
  w: number,
  h: number,
  boundsMode: ThumbnailBoundsMode
): string {
  const thumbW = 56;
  const thumbH = 56;
  const canvas = document.createElement('canvas');
  canvas.width = thumbW;
  canvas.height = thumbH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  renderPixelGridToCanvas(ctx, pixels, w, h, thumbW, thumbH, boundsMode, 3, false);
  return canvas.toDataURL();
}

function renderMaskDataUrl(maskPixels: number[][], inverted: boolean, w: number, h: number): string {
  const thumbW = 24;
  const thumbH = 28;
  const canvas = document.createElement('canvas');
  canvas.width = thumbW;
  canvas.height = thumbH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const safeW = Math.max(1, w || maskPixels[0]?.length || 1);
  const safeH = Math.max(1, h || maskPixels.length || 1);
  const imgData = ctx.createImageData(thumbW, thumbH);
  const buf32 = new Uint32Array(imgData.data.buffer);
  for (let ty = 0; ty < thumbH; ty++) {
    const sy = Math.min(safeH - 1, Math.floor((ty / thumbH) * safeH));
    const row = maskPixels[sy];
    const rowOffset = ty * thumbW;
    for (let tx = 0; tx < thumbW; tx++) {
      const sx = Math.min(safeW - 1, Math.floor((tx / thumbW) * safeW));
      const raw = row?.[sx] ?? 255;
      const v = inverted ? 255 - raw : raw;
      buf32[rowOffset + tx] = ((255 << 24) | (v << 16) | (v << 8) | v) >>> 0;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL();
}

const AsyncLayerThumbnail: React.FC<{
  layer: Layer;
  canvasWidth: number;
  canvasHeight: number;
  boundsMode: ThumbnailBoundsMode;
  isActive: boolean;
  isEditingMask: boolean;
  onClick: (e: React.MouseEvent) => void;
}> = React.memo(({ layer, canvasWidth, canvasHeight, boundsMode, isActive, isEditingMask, onClick }) => {
  const cached = layerThumbCache.get(layer.id);
  const [dataUrl, setDataUrl] = useState<string>(() =>
    cached &&
    cached.pixelsRef === layer.pixels &&
    cached.boundsMode === boundsMode &&
    cached.w === canvasWidth &&
    cached.h === canvasHeight
      ? cached.url
      : ''
  );

  useEffect(() => {
    if (layer.layerType === 'adjustment') return;
    const cur = layerThumbCache.get(layer.id);
    if (
      cur &&
      cur.pixelsRef === layer.pixels &&
      cur.boundsMode === boundsMode &&
      cur.w === canvasWidth &&
      cur.h === canvasHeight
    ) {
      setDataUrl(cur.url);
      return;
    }
    let cancelled = false;
    scheduleThumbWork(() => {
      if (cancelled) return;
      const url = renderGridDataUrl(layer.pixels, canvasWidth, canvasHeight, boundsMode);
      layerThumbCache.set(layer.id, {
        pixelsRef: layer.pixels,
        boundsMode,
        w: canvasWidth,
        h: canvasHeight,
        url,
      });
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [layer.id, layer.pixels, layer.layerType, canvasWidth, canvasHeight, boundsMode]);

  if (layer.layerType === 'adjustment') {
    return (
      <button
        type="button"
        onClick={onClick}
        title="Capa de ajuste"
        className="w-7 h-7 rounded border flex items-center justify-center shrink-0"
        style={{
          backgroundColor: 'rgba(192, 132, 252, 0.14)',
          borderColor: isActive && !isEditingMask ? 'var(--studio-accent)' : 'var(--studio-border-strong)',
        }}
      >
        <Contrast className="w-3.5 h-3.5 text-purple-400" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title="Editar píxeles de la capa"
      className="w-7 h-7 rounded border overflow-hidden shrink-0 relative"
      style={{
        backgroundImage:
          'linear-gradient(45deg, #222633 25%, transparent 25%), linear-gradient(-45deg, #222633 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222633 75%), linear-gradient(-45deg, transparent 75%, #222633 75%)',
        backgroundSize: '8px 8px',
        backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
        backgroundColor: '#161924',
        borderColor: isActive && !isEditingMask ? 'var(--studio-accent)' : 'var(--studio-border-strong)',
        boxShadow: isActive && !isEditingMask ? '0 0 0 1px var(--studio-accent)' : undefined,
      }}
    >
      {dataUrl && (
        <img
          src={dataUrl}
          alt={layer.name}
          className="w-full h-full object-contain pointer-events-none"
          style={{ imageRendering: 'pixelated' }}
        />
      )}
    </button>
  );
});

const AsyncMaskThumbnail: React.FC<{
  layer: Layer;
  canvasWidth: number;
  canvasHeight: number;
  isActive: boolean;
  isEditingMask: boolean;
  onClick: (e: React.MouseEvent) => void;
}> = React.memo(({ layer, canvasWidth, canvasHeight, isActive, isEditingMask, onClick }) => {
  const mask = layer.mask;
  const cached = mask ? maskThumbCache.get(layer.id) : undefined;
  const [url, setUrl] = useState<string>(() =>
    cached && mask && cached.pixelsRef === mask.pixels && cached.inverted === Boolean(mask.inverted)
      ? cached.url
      : ''
  );

  useEffect(() => {
    if (!mask) return;
    const cur = maskThumbCache.get(layer.id);
    if (cur && cur.pixelsRef === mask.pixels && cur.inverted === Boolean(mask.inverted)) {
      setUrl(cur.url);
      return;
    }
    let cancelled = false;
    scheduleThumbWork(() => {
      if (cancelled) return;
      const rendered = renderMaskDataUrl(mask.pixels, Boolean(mask.inverted), canvasWidth, canvasHeight);
      maskThumbCache.set(layer.id, {
        pixelsRef: mask.pixels,
        inverted: Boolean(mask.inverted),
        url: rendered,
      });
      if (!cancelled) setUrl(rendered);
    });
    return () => {
      cancelled = true;
    };
  }, [layer.id, mask, canvasWidth, canvasHeight]);

  if (!mask) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      title={
        mask.disabled
          ? 'Máscara desactivada (clic para seleccionar)'
          : isEditingMask && isActive
          ? 'Editando máscara (pinta blanco para mostrar / negro o borrador para ocultar)'
          : 'Clic para editar máscara'
      }
      className="w-6 h-7 rounded border overflow-hidden shrink-0 relative"
      style={{
        backgroundColor: '#000',
        borderColor: isActive && isEditingMask ? '#f59e0b' : 'var(--studio-border-strong)',
        boxShadow: isActive && isEditingMask ? '0 0 0 1px #f59e0b' : undefined,
      }}
    >
      {url && (
        <img
          src={url}
          alt="Máscara"
          className="w-full h-full object-cover pointer-events-none"
          style={{ imageRendering: 'pixelated' }}
        />
      )}
      {mask.disabled && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-rose-400 text-[12px] font-bold">
          ×
        </span>
      )}
      {mask.quickPreview && !mask.disabled && (
        <span className="absolute bottom-0 right-0 w-2 h-2 bg-rose-500 rounded-tl-xs" />
      )}
    </button>
  );
});

// =====================================================================
// FLATTENED TREE ITEMS FOR VIRTUALIZED SCROLL
// =====================================================================
type FlatTreeRow =
  | { kind: 'layer'; layer: Layer; idx: number; depth: number }
  | { kind: 'group'; group: LayerGroup; depth: number; childLayerCount: number };

interface ContextMenuState {
  layerIdx: number;
  x: number;
  y: number;
}

export const PhotoshopLayersPanel: React.FC<PhotoshopLayersPanelProps> = ({
  layers,
  layerGroups,
  currentLayerIndex,
  selectedLayerIndices,
  canvasWidth,
  canvasHeight,
  hasActiveSelection = false,
  editingMask = false,
  onSetEditingMask,
  onSelectLayer,
  onSelectLayerIndices,
  onAddLayer,
  onCreateAdjustmentLayer,
  onDeleteLayer,
  onToggleLayerVisibility,
  onToggleLayerLock,
  onChangeLayerOpacity,
  onUpdateLayerMeta,
  onReorderLayer,
  onAssignLayerToGroup,
  onCreateLayerGroup,
  onRenameLayerGroup,
  onMoveLayerGroupParent,
  onToggleGroupCollapse,
  onToggleGroupVisibility,
  onToggleGroupLock,
  onChangeGroupOpacity,
  onChangeGroupColor,
  onRequestDeleteGroup,
  onMergeLayers,
  onMergeVisibleLayers,
  onMassDuplicateLayers,
  onConvertLayersToGroup,
  onBatchToggleLayerVisibility,
  onBatchToggleLayerLock,
  onBatchDeleteLayers,
  onCreateLayerMask,
  onDeleteLayerMask,
  onApplyLayerMask,
  onInvertLayerMask,
  onToggleMaskDisabled,
  onToggleMaskLinked,
  onToggleMaskQuickPreview,
  onRasterizeLayer,
  onConvertToSmartObject,
  onDuplicateLayerToNextFrame,
  onDuplicateLayerToAllFrames,
  onDuplicateLayerToSelectedFrames,
  onDuplicateGroupToAllFrames,
  performanceMode = 'balanced',
}) => {
  currentThumbPerfMode = performanceMode;
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [thumbnailBoundsMode, setThumbnailBoundsMode] = useState<ThumbnailBoundsMode>(() => {
    try {
      const saved = localStorage.getItem('pixelclash_layers_thumb_bounds_v1');
      if (saved === 'content' || saved === 'canvas') return saved;
    } catch {
      // ignore storage errors
    }
    return 'canvas';
  });
  const applyThumbnailBoundsMode = useCallback((mode: ThumbnailBoundsMode) => {
    setThumbnailBoundsMode(mode);
    try {
      localStorage.setItem('pixelclash_layers_thumb_bounds_v1', mode);
    } catch {
      // ignore storage errors
    }
  }, []);
  const [showNewFolderForm, setShowNewFolderForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#3b82f6');
  const [newFolderParentId, setNewFolderParentId] = useState<string>('');
  const [showSpecialLayerMenu, setShowSpecialLayerMenu] = useState(false);
  const [showMaskCreateMenu, setShowMaskCreateMenu] = useState(false);

  const [editingLayerIdx, setEditingLayerIdx] = useState<number | null>(null);
  const [editingLayerName, setEditingLayerName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const [draggedLayerIdx, setDraggedLayerIdx] = useState<number | null>(null);
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null);
  const [dropHighlight, setDropHighlight] = useState<string | null>(null);
  const [isSliderInteracting, setIsSliderInteracting] = useState(false);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [ctxSubmenu, setCtxSubmenu] = useState<'group' | 'mask' | 'lock' | 'color' | null>(null);
  const [maskMenuPos, setMaskMenuPos] = useState<{ left: number; top: number }>({ left: 100, top: 200 });
  const [specialMenuPos, setSpecialMenuPos] = useState<{ left: number; top: number }>({ left: 100, top: 200 });
  const [colorPopoverTarget, setColorPopoverTarget] = useState<
    | { kind: 'layer'; idx: number; x: number; y: number }
    | { kind: 'group'; id: string; x: number; y: number }
    | null
  >(null);

  // Virtualization scroll state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(280);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          setViewportHeight(entry.contentRect.height);
        }
      }
    });
    ro.observe(el);
    setViewportHeight(el.clientHeight || 280);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!isSliderInteracting) return;
    const release = () => setIsSliderInteracting(false);
    window.addEventListener('pointerup', release);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('blur', release);
    };
  }, [isSliderInteracting]);

  useEffect(() => {
    if (!contextMenu && !colorPopoverTarget && !showSpecialLayerMenu && !showMaskCreateMenu) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.closest('[data-ps-ctx-menu]') ||
        target?.closest('[data-ps-color-popover]') ||
        target?.closest('[data-ps-bottom-popover]')
      ) {
        return;
      }
      setContextMenu(null);
      setCtxSubmenu(null);
      setColorPopoverTarget(null);
      setShowSpecialLayerMenu(false);
      setShowMaskCreateMenu(false);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
        setCtxSubmenu(null);
        setColorPopoverTarget(null);
        setShowSpecialLayerMenu(false);
        setShowMaskCreateMenu(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [contextMenu, colorPopoverTarget, showSpecialLayerMenu, showMaskCreateMenu]);

  // Clear selectedGroupId if the group was deleted
  useEffect(() => {
    if (selectedGroupId && !layerGroups.some((g) => g.id === selectedGroupId)) {
      setSelectedGroupId(null);
    }
  }, [selectedGroupId, layerGroups]);

  const selectedGroup = useMemo(
    () => (selectedGroupId ? layerGroups.find((g) => g.id === selectedGroupId) || null : null),
    [selectedGroupId, layerGroups]
  );

  const activeLayer = layers[currentLayerIndex] || layers[0];
  const selectedSet = useMemo(
    () => new Set(selectedLayerIndices.length > 0 ? selectedLayerIndices : [currentLayerIndex]),
    [selectedLayerIndices, currentLayerIndex]
  );
  const selectedArray = useMemo(() => Array.from(selectedSet).sort((a, b) => a - b), [selectedSet]);

  const activeBlendMode: LayerBlendMode = activeLayer?.blendMode || 'normal';
  const activeOpacityPct = selectedGroup
    ? Math.round((selectedGroup.opacity ?? 1) * 100)
    : Math.round((activeLayer?.opacity ?? 1) * 100);
  const activeFillPct = Math.round((activeLayer?.fillOpacity ?? 1) * 100);

  const applyOpacityValue = useCallback(
    (pct: number) => {
      const clamped = Math.max(0, Math.min(100, Math.round(pct)));
      const nextOp = clamped / 100;
      if (selectedGroup && onChangeGroupOpacity) {
        onChangeGroupOpacity(selectedGroup.id, nextOp);
        return;
      }
      if (onChangeLayerOpacity) onChangeLayerOpacity(currentLayerIndex, nextOp);
      else onUpdateLayerMeta(currentLayerIndex, { opacity: nextOp });
    },
    [selectedGroup, onChangeGroupOpacity, currentLayerIndex, onChangeLayerOpacity, onUpdateLayerMeta]
  );

  const applyFillValue = useCallback(
    (pct: number) => {
      const clamped = Math.max(0, Math.min(100, Math.round(pct)));
      onUpdateLayerMeta(currentLayerIndex, { fillOpacity: clamped / 100 });
    },
    [currentLayerIndex, onUpdateLayerMeta]
  );

  const handleLayerRowClick = useCallback(
    (e: React.MouseEvent, idx: number, selectMask: boolean = false) => {
      setSelectedGroupId(null);
      if (e.shiftKey) {
        const min = Math.min(currentLayerIndex, idx);
        const max = Math.max(currentLayerIndex, idx);
        const range: number[] = [];
        for (let i = min; i <= max; i++) range.push(i);
        onSelectLayerIndices(range);
        onSelectLayer(idx);
        onSetEditingMask?.(false);
      } else if (e.ctrlKey || e.metaKey) {
        const next = selectedSet.has(idx)
          ? selectedArray.filter((i) => i !== idx)
          : [...selectedArray, idx].sort((a, b) => a - b);
        onSelectLayerIndices(next.length > 0 ? next : [idx]);
        onSelectLayer(idx);
        onSetEditingMask?.(false);
      } else {
        onSelectLayerIndices([idx]);
        onSelectLayer(idx);
        onSetEditingMask?.(selectMask && Boolean(layers[idx]?.mask));
      }
    },
    [
      currentLayerIndex,
      selectedSet,
      selectedArray,
      layers,
      onSelectLayerIndices,
      onSelectLayer,
      onSetEditingMask,
    ]
  );

  // Build virtualized flattened tree (respecting search, filter toggles, and nested groups)
  const flatRows: FlatTreeRow[] = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const isFiltering = query.length > 0 || filterMode !== 'all';

    const matchesLayer = (layer: Layer): boolean => {
      if (query && !layer.name.toLowerCase().includes(query)) return false;
      if (filterMode === 'visible' && !layer.visible) return false;
      if (filterMode === 'groups') return false;
      if (
        filterMode === 'locked' &&
        !layer.locked &&
        !layer.lockTransparency &&
        !layer.lockPixels &&
        !layer.lockPosition
      ) {
        return false;
      }
      if (filterMode === 'masks' && !layer.mask && !layer.clippingMask) return false;
      return true;
    };

    const matchesGroupDirect = (group: LayerGroup): boolean => {
      if (filterMode === 'visible' && group.visible === false) return false;
      if (filterMode === 'locked' && !group.locked) return false;
      if (filterMode === 'masks') return false;
      if (query && !group.name.toLowerCase().includes(query)) return false;
      return true;
    };

    // Map group children & layers in top-to-bottom stack order
    const layersByGroup = new Map<string, { layer: Layer; idx: number }[]>();
    const rootLayers: { layer: Layer; idx: number }[] = [];
    const validGroupIds = new Set(layerGroups.map((g) => g.id));

    for (let idx = layers.length - 1; idx >= 0; idx--) {
      const layer = layers[idx];
      if (layer.groupId && validGroupIds.has(layer.groupId)) {
        const list = layersByGroup.get(layer.groupId) || [];
        list.push({ layer, idx });
        layersByGroup.set(layer.groupId, list);
      } else {
        rootLayers.push({ layer, idx });
      }
    }

    const childGroupsMap = new Map<string, LayerGroup[]>();
    const rootGroups: LayerGroup[] = [];
    for (const grp of layerGroups) {
      if (grp.parentGroupId && validGroupIds.has(grp.parentGroupId) && grp.parentGroupId !== grp.id) {
        const arr = childGroupsMap.get(grp.parentGroupId) || [];
        arr.push(grp);
        childGroupsMap.set(grp.parentGroupId, arr);
      } else {
        rootGroups.push(grp);
      }
    }

    const countDescendants = (gid: string, visited = new Set<string>()): number => {
      if (visited.has(gid)) return 0;
      visited.add(gid);
      let total = (layersByGroup.get(gid) || []).length;
      for (const sub of childGroupsMap.get(gid) || []) {
        total += countDescendants(sub.id, visited);
      }
      return total;
    };

    const groupHasMatchingDescendant = (gid: string, visited = new Set<string>()): boolean => {
      if (visited.has(gid)) return false;
      visited.add(gid);
      const members = layersByGroup.get(gid) || [];
      if (members.some(({ layer }) => matchesLayer(layer))) return true;
      for (const sub of childGroupsMap.get(gid) || []) {
        if (matchesGroupDirect(sub) || groupHasMatchingDescendant(sub.id, visited)) return true;
      }
      return false;
    };

    const rows: FlatTreeRow[] = [];

    for (const { layer, idx } of rootLayers) {
      if (!isFiltering || matchesLayer(layer)) {
        rows.push({ kind: 'layer', layer, idx, depth: 0 });
      }
    }

    const pushGroupTree = (grp: LayerGroup, depth: number, visited = new Set<string>()) => {
      if (visited.has(grp.id)) return;
      visited.add(grp.id);

      const directMatch = matchesGroupDirect(grp);
      const descendantMatch = groupHasMatchingDescendant(grp.id);
      if (isFiltering && !directMatch && !descendantMatch) return;

      rows.push({
        kind: 'group',
        group: grp,
        depth,
        childLayerCount: countDescendants(grp.id),
      });

      const showChildren = isFiltering ? true : !grp.collapsed;
      if (!showChildren) return;

      const subGroups = childGroupsMap.get(grp.id) || [];
      for (const sub of subGroups) {
        pushGroupTree(sub, depth + 1, visited);
      }

      if (filterMode !== 'groups') {
        const members = layersByGroup.get(grp.id) || [];
        for (const { layer, idx } of members) {
          if (!isFiltering || matchesLayer(layer) || (query && grp.name.toLowerCase().includes(query))) {
            rows.push({ kind: 'layer', layer, idx, depth: depth + 1 });
          }
        }
      }
    };

    for (const grp of rootGroups) {
      pushGroupTree(grp, 0);
    }

    return rows;
  }, [layers, layerGroups, searchQuery, filterMode]);

  const totalHeight = flatRows.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS);
  const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN_ROWS * 2;
  const endIndex = Math.min(flatRows.length, startIndex + visibleCount);
  const visibleRows = flatRows.slice(startIndex, endIndex);

  const toggleActiveLockField = (field: 'locked' | 'lockTransparency' | 'lockPixels' | 'lockPosition') => {
    if (!activeLayer) return;
    if (field === 'locked') {
      onToggleLayerLock(currentLayerIndex);
      return;
    }
    onUpdateLayerMeta(currentLayerIndex, { [field]: !activeLayer[field] });
  };

  const openContextMenuAt = (e: React.MouseEvent, layerIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedSet.has(layerIdx)) {
      onSelectLayerIndices([layerIdx]);
      onSelectLayer(layerIdx);
    }
    const menuW = 232;
    const menuH = Math.min(440, window.innerHeight - 16);
    const x = Math.max(8, Math.min(e.clientX, window.innerWidth - menuW - 8));
    const y = Math.max(8, Math.min(e.clientY, window.innerHeight - menuH - 8));
    setCtxSubmenu(null);
    setContextMenu({ layerIdx, x, y });
  };

  const ctxLayer = contextMenu ? layers[contextMenu.layerIdx] : null;

  return (
    <div
      className="flex flex-col text-xs select-none"
      style={{ height: '490px', minHeight: '380px' }}
    >
      {/* ========================================================= */}
      {/* 1. TOP PHOTOSHOP CONTROLS: BLEND MODE, OPACITY & FILL      */}
      {/* ========================================================= */}
      <div
        className="px-2 py-2 border-b flex flex-col gap-1.5 shrink-0"
        style={{
          backgroundColor: 'var(--studio-bg-card)',
          borderColor: 'var(--studio-border)',
        }}
      >
        {/* Row 1: Blend Mode Dropdown + Opacity Slider & Numeric Input */}
        <div className="flex items-center gap-1.5">
          <select
            value={activeBlendMode}
            onChange={(e) =>
              onUpdateLayerMeta(currentLayerIndex, {
                blendMode: e.target.value as LayerBlendMode,
              })
            }
            title="Modo de fusión de capa"
            className="flex-1 min-w-0 px-1.5 py-1 rounded border text-[11px] font-medium focus:outline-none"
            style={{
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: 'var(--studio-border-strong)',
              color: 'var(--studio-text)',
            }}
          >
            {BLEND_MODE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <div className="shrink-0 w-[144px]">
            <StudioSlider
              variant="compact"
              label={selectedGroup ? 'Opac. Grp' : 'Opac.'}
              value={activeOpacityPct}
              min={0}
              max={100}
              step={1}
              defaultValue={100}
              unit="%"
              accentColor={selectedGroup ? selectedGroup.color : undefined}
              title={
                selectedGroup
                  ? `Opacidad del grupo "${selectedGroup.name}" (${activeOpacityPct}%) · Afecta a todas las capas contenidas`
                  : 'Opacidad de capa (0% - 100%) · Arrastra, rueda o haz clic para escribir'
              }
              onChange={(v) => applyOpacityValue(v)}
            />
          </div>
        </div>

        {/* Row 2: Advanced Locks Strip + Independent Fill (Relleno) */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-0.5 shrink-0">
            <span
              className="text-[10px] mr-0.5"
              style={{ color: 'var(--studio-text-muted)' }}
            >
              Bloq:
            </span>
            <button
              type="button"
              onClick={() => toggleActiveLockField('lockTransparency')}
              title="Bloquear píxeles transparentes"
              className="p-1 rounded border transition-colors"
              style={{
                backgroundColor: activeLayer?.lockTransparency
                  ? 'color-mix(in srgb, var(--studio-accent) 22%, var(--studio-bg-elevated))'
                  : 'var(--studio-bg-elevated)',
                borderColor: activeLayer?.lockTransparency
                  ? 'var(--studio-accent)'
                  : 'var(--studio-border)',
                color: activeLayer?.lockTransparency ? 'var(--studio-accent)' : 'var(--studio-text-muted)',
              }}
            >
              <Grid3X3 className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => toggleActiveLockField('lockPixels')}
              title="Bloquear píxeles de imagen (impide pintar)"
              className="p-1 rounded border transition-colors"
              style={{
                backgroundColor: activeLayer?.lockPixels
                  ? 'color-mix(in srgb, var(--studio-accent) 22%, var(--studio-bg-elevated))'
                  : 'var(--studio-bg-elevated)',
                borderColor: activeLayer?.lockPixels
                  ? 'var(--studio-accent)'
                  : 'var(--studio-border)',
                color: activeLayer?.lockPixels ? 'var(--studio-accent)' : 'var(--studio-text-muted)',
              }}
            >
              <Paintbrush className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => toggleActiveLockField('lockPosition')}
              title="Bloquear posición (impide mover)"
              className="p-1 rounded border transition-colors"
              style={{
                backgroundColor: activeLayer?.lockPosition
                  ? 'color-mix(in srgb, var(--studio-accent) 22%, var(--studio-bg-elevated))'
                  : 'var(--studio-bg-elevated)',
                borderColor: activeLayer?.lockPosition
                  ? 'var(--studio-accent)'
                  : 'var(--studio-border)',
                color: activeLayer?.lockPosition ? 'var(--studio-accent)' : 'var(--studio-text-muted)',
              }}
            >
              <Move className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => toggleActiveLockField('locked')}
              title="Bloqueo total"
              className="p-1 rounded border transition-colors"
              style={{
                backgroundColor: activeLayer?.locked
                  ? 'rgba(244, 63, 94, 0.18)'
                  : 'var(--studio-bg-elevated)',
                borderColor: activeLayer?.locked ? '#f43f5e' : 'var(--studio-border)',
                color: activeLayer?.locked ? '#fb7185' : 'var(--studio-text-muted)',
              }}
            >
              <Lock className="w-3 h-3" />
            </button>
          </div>

          <div className="shrink-0 w-[138px]">
            <StudioSlider
              variant="compact"
              label="Rell."
              value={activeFillPct}
              min={0}
              max={100}
              step={1}
              defaultValue={100}
              unit="%"
              accentColor="#38bdf8"
              title="Relleno independiente de opacidad (0% - 100%) · Arrastra, rueda o haz clic para escribir"
              onChange={(v) => applyFillValue(v)}
            />
          </div>
        </div>

        {/* Row 3: Instant Search + Quick Filter Toggles */}
        <div className="flex items-center gap-1">
          <div className="relative flex-1 min-w-0">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Buscar en ${layers.length} capas...`}
              className="w-full pl-6 pr-5 py-1 rounded border text-[10px] focus:outline-none"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: searchQuery ? 'var(--studio-accent)' : 'var(--studio-border)',
                color: 'var(--studio-text)',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          <div
            className="flex items-center rounded border overflow-hidden shrink-0"
            style={{ borderColor: 'var(--studio-border)' }}
          >
            {(
              [
                { id: 'visible', icon: Eye, title: 'Solo visibles' },
                { id: 'groups', icon: Folder, title: 'Solo grupos' },
                { id: 'locked', icon: Lock, title: 'Solo bloqueadas' },
                { id: 'masks', icon: Contrast, title: 'Solo con máscaras' },
              ] as const
            ).map((f) => {
              const active = filterMode === f.id;
              const Icon = f.icon;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterMode(active ? 'all' : f.id)}
                  title={active ? `${f.title} (clic para quitar filtro)` : f.title}
                  className="p-1 transition-colors"
                  style={{
                    backgroundColor: active
                      ? 'var(--studio-accent)'
                      : 'var(--studio-bg-elevated)',
                    color: active ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                  }}
                >
                  <Icon className="w-3 h-3" />
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() =>
              applyThumbnailBoundsMode(thumbnailBoundsMode === 'canvas' ? 'content' : 'canvas')
            }
            title={
              thumbnailBoundsMode === 'content'
                ? 'Miniaturas de capas: Ajustadas al contenido (clic para ver lienzo completo)'
                : 'Miniaturas de capas: Lienzo completo (clic para ajustar al contenido)'
            }
            className="p-1 rounded border shrink-0 transition-colors"
            style={{
              backgroundColor:
                thumbnailBoundsMode === 'content'
                  ? 'color-mix(in srgb, var(--studio-accent) 22%, var(--studio-bg-elevated))'
                  : 'var(--studio-bg-elevated)',
              borderColor:
                thumbnailBoundsMode === 'content'
                  ? 'var(--studio-accent)'
                  : 'var(--studio-border)',
              color:
                thumbnailBoundsMode === 'content'
                  ? 'var(--studio-accent)'
                  : 'var(--studio-text-muted)',
            }}
          >
            {thumbnailBoundsMode === 'content' ? (
              <Scan className="w-3 h-3" />
            ) : (
              <Maximize className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Active Editing Mask Indicator Banner (only shown when editing mask) */}
        {editingMask && activeLayer?.mask && (
          <div
            className="px-2 py-1 rounded border flex items-center justify-between gap-1 text-[10px]"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              borderColor: 'rgba(245, 158, 11, 0.4)',
              color: '#fcd34d',
            }}
          >
            <span className="truncate font-medium">
              Editando máscara · Pincel=Mostrar · Borrador/Negro=Ocultar
            </span>
            <button
              type="button"
              onClick={() => onSetEditingMask?.(false)}
              className="underline shrink-0 text-[10px] hover:text-white"
            >
              Volver a píxeles
            </button>
          </div>
        )}
      </div>

      {/* Inline New Nested Folder Creator Drawer */}
      {showNewFolderForm && (
        <div
          className="p-2 border-b flex flex-col gap-1.5 shrink-0"
          style={{
            backgroundColor: 'var(--studio-bg-elevated)',
            borderColor: 'var(--studio-accent)',
          }}
        >
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newFolderName.trim()) {
                  onCreateLayerGroup(newFolderName.trim(), newFolderColor, newFolderParentId || null);
                  setNewFolderName('');
                  setNewFolderParentId('');
                  setShowNewFolderForm(false);
                } else if (e.key === 'Escape') {
                  setShowNewFolderForm(false);
                }
              }}
              placeholder="Nombre carpeta (ej. Personaje / VFX)"
              className="flex-1 px-2 py-1 rounded border text-[11px] focus:outline-none"
              style={{
                backgroundColor: 'var(--studio-bg-card)',
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
              autoFocus
            />
            <input
              type="color"
              value={newFolderColor}
              onChange={(e) => setNewFolderColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
            />
          </div>
          {layerGroups.length > 0 && (
            <select
              value={newFolderParentId}
              onChange={(e) => setNewFolderParentId(e.target.value)}
              className="px-2 py-1 rounded border text-[10px]"
              style={{
                backgroundColor: 'var(--studio-bg-card)',
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            >
              <option value="">Carpeta en raíz (nivel superior)</option>
              {layerGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  Dentro de: {g.name}
                </option>
              ))}
            </select>
          )}
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setShowNewFolderForm(false)}
              className="px-2 py-0.5 text-[10px]"
              style={{ color: 'var(--studio-text-muted)' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                if (newFolderName.trim()) {
                  onCreateLayerGroup(newFolderName.trim(), newFolderColor, newFolderParentId || null);
                  setNewFolderName('');
                  setNewFolderParentId('');
                  setShowNewFolderForm(false);
                }
              }}
              className="px-2.5 py-0.5 rounded text-[10px] font-semibold"
              style={{
                backgroundColor: 'var(--studio-accent)',
                color: 'var(--studio-accent-text)',
              }}
            >
              Crear carpeta
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. VIRTUALIZED LAYER & FOLDER STACK (1000+ LAYERS 60FPS)  */}
      {/* ========================================================= */}
      <div
        ref={scrollContainerRef}
        onScroll={(e) => setScrollTop((e.currentTarget as HTMLDivElement).scrollTop)}
        onDragOver={(e) => {
          e.preventDefault();
          setDropHighlight('root-zone');
        }}
        onDragLeave={() => {
          if (dropHighlight === 'root-zone') setDropHighlight(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDropHighlight(null);
          if (draggedLayerIdx !== null) {
            onAssignLayerToGroup(draggedLayerIdx, null);
            setDraggedLayerIdx(null);
          } else if (draggedGroupId) {
            onMoveLayerGroupParent(draggedGroupId, null);
            setDraggedGroupId(null);
          }
        }}
        className="flex-1 overflow-y-auto overflow-x-hidden relative"
        style={{
          backgroundColor: 'var(--studio-bg-panel)',
          outline: dropHighlight === 'root-zone' ? '1px dashed var(--studio-accent)' : undefined,
        }}
      >
        {flatRows.length === 0 ? (
          <div
            className="h-full flex flex-col items-center justify-center p-4 text-center text-[11px]"
            style={{ color: 'var(--studio-text-muted)' }}
          >
            <span>Sin capas coincidentes con el filtro actual.</span>
            {filterMode !== 'all' || searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilterMode('all');
                }}
                className="mt-1.5 underline text-[10px]"
                style={{ color: 'var(--studio-accent)' }}
              >
                Restablecer filtros
              </button>
            ) : null}
          </div>
        ) : (
          <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
            {visibleRows.map((row, offset) => {
              const virtualIdx = startIndex + offset;
              const topPx = virtualIdx * ROW_HEIGHT;

              if (row.kind === 'group') {
                const { group, depth, childLayerCount } = row;
                const isDropTarget = dropHighlight === `group-${group.id}`;
                const isGroupSelected = selectedGroupId === group.id;
                const groupOpacityPct = Math.round((group.opacity ?? 1) * 100);

                return (
                  <div
                    key={`grp-${group.id}`}
                    draggable={!isSliderInteracting && editingGroupId !== group.id}
                    onDragStart={(e) => {
                      if (
                        isSliderInteracting ||
                        (e.target as HTMLElement | null)?.closest('input, select, button')
                      ) {
                        e.preventDefault();
                        return;
                      }
                      e.stopPropagation();
                      setDraggedGroupId(group.id);
                      setDraggedLayerIdx(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDropHighlight(`group-${group.id}`);
                    }}
                    onDragLeave={() => {
                      if (dropHighlight === `group-${group.id}`) setDropHighlight(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDropHighlight(null);
                      if (draggedLayerIdx !== null) {
                        onAssignLayerToGroup(draggedLayerIdx, group.id);
                        setDraggedLayerIdx(null);
                      } else if (draggedGroupId && draggedGroupId !== group.id) {
                        onMoveLayerGroupParent(draggedGroupId, group.id);
                        setDraggedGroupId(null);
                      }
                    }}
                    onClick={() => setSelectedGroupId(group.id)}
                    onDoubleClick={() => onToggleGroupCollapse(group.id)}
                    style={{
                      position: 'absolute',
                      top: `${topPx}px`,
                      left: 0,
                      right: 0,
                      height: `${ROW_HEIGHT}px`,
                      paddingLeft: `${8 + depth * 12}px`,
                      paddingRight: '8px',
                      backgroundColor: isDropTarget
                        ? 'color-mix(in srgb, var(--studio-accent) 22%, var(--studio-bg-card))'
                        : isGroupSelected
                        ? 'color-mix(in srgb, var(--studio-accent) 18%, var(--studio-bg-card))'
                        : 'var(--studio-bg-card)',
                      borderBottom: '1px solid var(--studio-border)',
                      boxShadow: isGroupSelected ? `inset 3px 0 0 ${group.color || 'var(--studio-accent)'}` : undefined,
                      opacity: group.locked ? 0.72 : group.visible === false ? 0.55 : 1,
                    }}
                    className="flex items-center gap-1.5 cursor-pointer hover:brightness-110 transition-colors"
                  >
                    {/* Eye */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleGroupVisibility(group.id);
                      }}
                      title="Ocultar / Mostrar grupo completo"
                      className="p-0.5 shrink-0"
                      style={{ color: group.visible !== false ? 'var(--studio-text)' : 'var(--studio-text-muted)' }}
                    >
                      {group.visible !== false ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 opacity-35" />
                      )}
                    </button>

                    {/* Collapse chevron button + Open/Closed Folder Icon */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleGroupCollapse(group.id);
                      }}
                      title={group.collapsed ? 'Expandir grupo' : 'Contraer grupo'}
                      className="p-0.5 shrink-0 opacity-75 hover:opacity-100 rounded hover:bg-white/10"
                    >
                      {group.collapsed ? (
                        <ChevronRight className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {group.collapsed ? (
                      <Folder className="w-4 h-4 shrink-0" style={{ color: group.color }} />
                    ) : (
                      <FolderOpen className="w-4 h-4 shrink-0" style={{ color: group.color }} />
                    )}

                    {/* Clickable color tag dot */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setColorPopoverTarget({
                          kind: 'group',
                          id: group.id,
                          x: Math.min(rect.left, window.innerWidth - 200),
                          y: Math.min(rect.bottom + 4, window.innerHeight - 80),
                        });
                      }}
                      title="Cambiar color identificativo del grupo"
                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/40"
                      style={{ backgroundColor: group.color }}
                    />

                    {/* Name */}
                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                      {editingGroupId === group.id ? (
                        <input
                          type="text"
                          value={editingGroupName}
                          onChange={(e) => setEditingGroupName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && editingGroupName.trim()) {
                              onRenameLayerGroup(group.id, editingGroupName.trim());
                              setEditingGroupId(null);
                            } else if (e.key === 'Escape') {
                              setEditingGroupId(null);
                            }
                          }}
                          onBlur={() => {
                            if (editingGroupName.trim()) {
                              onRenameLayerGroup(group.id, editingGroupName.trim());
                            }
                            setEditingGroupId(null);
                          }}
                          className="w-full px-1 py-0.5 rounded border text-[11px]"
                          style={{
                            backgroundColor: 'var(--studio-bg-elevated)',
                            borderColor: 'var(--studio-accent)',
                            color: 'var(--studio-text)',
                          }}
                          autoFocus
                        />
                      ) : (
                        <span
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingGroupId(group.id);
                            setEditingGroupName(group.name);
                          }}
                          className="text-[11px] font-semibold truncate"
                          style={{ color: 'var(--studio-text)' }}
                          title="Clic para seleccionar y ajustar opacidad global · Doble clic para renombrar"
                        >
                          {group.name}
                        </span>
                      )}
                      <span
                        className="text-[9px] font-mono tabular-nums opacity-50 shrink-0"
                        title={`${childLayerCount} capas en grupo`}
                      >
                        {childLayerCount}
                      </span>
                      {groupOpacityPct < 100 && (
                        <span
                          className="text-[9px] font-mono tabular-nums px-1 py-0.25 rounded bg-white/8 text-slate-300 shrink-0"
                          title={`Opacidad actual del grupo: ${groupOpacityPct}% (ajusta en el slider global superior)`}
                        >
                          {groupOpacityPct}%
                        </span>
                      )}
                    </div>

                    {/* Lock + Delete (global Opacidad slider above handles opacity when group is selected) */}
                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => onToggleGroupLock(group.id)}
                        title="Bloquear grupo completo"
                        className="p-0.5"
                        style={{ color: group.locked ? '#fb7185' : 'var(--studio-text-muted)' }}
                      >
                        {group.locked ? (
                          <Lock className="w-3 h-3" />
                        ) : (
                          <Unlock className="w-3 h-3 opacity-35" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onRequestDeleteGroup(group)}
                        title="Eliminar / Desagrupar carpeta"
                        className="p-0.5 text-rose-400/70 hover:text-rose-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              }

              // LAYER ROW
              const { layer, idx, depth } = row;
              const isActive = idx === currentLayerIndex;
              const isMultiSelected = selectedSet.has(idx);
              const lType: LayerType = layer.layerType || 'raster';
              const typeInfo = LAYER_TYPE_INFO[lType] || LAYER_TYPE_INFO.raster;
              const TypeIconComp = typeInfo.Icon;
              const isDragOver = dropHighlight === `layer-${idx}`;
              const hasAnyLock =
                layer.locked ||
                layer.lockTransparency ||
                layer.lockPixels ||
                layer.lockPosition;

              return (
                <div
                  key={layer.id}
                  draggable={!isSliderInteracting && editingLayerIdx !== idx}
                  onDragStart={(e) => {
                    if (
                      isSliderInteracting ||
                      (e.target as HTMLElement | null)?.closest('input, select, button')
                    ) {
                      e.preventDefault();
                      return;
                    }
                    e.stopPropagation();
                    setDraggedLayerIdx(idx);
                    setDraggedGroupId(null);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDropHighlight(`layer-${idx}`);
                  }}
                  onDragLeave={() => {
                    if (dropHighlight === `layer-${idx}`) setDropHighlight(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDropHighlight(null);
                    if (draggedLayerIdx !== null && draggedLayerIdx !== idx) {
                      onReorderLayer(draggedLayerIdx, idx, layer.groupId ?? null);
                    }
                    setDraggedLayerIdx(null);
                  }}
                  onDragEnd={() => {
                    setDraggedLayerIdx(null);
                    setDropHighlight(null);
                  }}
                  onClick={(e) => handleLayerRowClick(e, idx, false)}
                  onContextMenu={(e) => openContextMenuAt(e, idx)}
                  style={{
                    position: 'absolute',
                    top: `${topPx}px`,
                    left: 0,
                    right: 0,
                    height: `${ROW_HEIGHT}px`,
                    paddingLeft: `${8 + depth * 12}px`,
                    paddingRight: '8px',
                    backgroundColor: isActive
                      ? 'color-mix(in srgb, var(--studio-accent) 18%, var(--studio-bg-card))'
                      : isMultiSelected
                      ? 'color-mix(in srgb, #6366f1 16%, var(--studio-bg-card))'
                      : 'var(--studio-bg-panel)',
                    borderBottom: '1px solid var(--studio-border)',
                    boxShadow: isDragOver ? 'inset 0 2px 0 #38bdf8' : undefined,
                    opacity: layer.locked ? 0.62 : layer.visible ? 1 : 0.55,
                  }}
                  className="flex items-center gap-1.5 cursor-pointer hover:brightness-110 transition-colors"
                >
                  {/* Visibility Eye */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLayerVisibility(idx);
                    }}
                    title="Mostrar / Ocultar capa"
                    className="p-0.5 shrink-0"
                    style={{
                      color: layer.visible ? 'var(--studio-text)' : 'var(--studio-text-muted)',
                    }}
                  >
                    {layer.visible ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 opacity-35" />
                    )}
                  </button>

                  {/* Clipping Mask Arrow */}
                  {layer.clippingMask && (
                    <span title="Máscara de recorte vinculada a la capa inferior" className="shrink-0">
                      <CornerDownRight className="w-3 h-3 text-sky-400" />
                    </span>
                  )}

                  {/* Color Identification Dot */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setColorPopoverTarget({
                        kind: 'layer',
                        idx,
                        x: Math.min(rect.left, window.innerWidth - 200),
                        y: Math.min(rect.bottom + 4, window.innerHeight - 80),
                      });
                    }}
                    title="Color identificativo"
                    className="w-2 h-2 rounded-full shrink-0 border"
                    style={{
                      backgroundColor: layer.colorTag || 'transparent',
                      borderColor: layer.colorTag ? '#ffffffaa' : 'var(--studio-border-strong)',
                    }}
                  />

                  {/* Layer Thumbnail */}
                  <AsyncLayerThumbnail
                    layer={layer}
                    canvasWidth={canvasWidth}
                    canvasHeight={canvasHeight}
                    boundsMode={thumbnailBoundsMode}
                    isActive={isActive}
                    isEditingMask={editingMask}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLayerRowClick(e, idx, false);
                    }}
                  />

                  {/* Optional Link Icon & Mask Thumbnail */}
                  {layer.mask && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleMaskLinked?.(idx);
                        }}
                        title={
                          layer.mask.linked !== false
                            ? 'Máscara vinculada a la capa (clic para desvincular)'
                            : 'Máscara desvinculada (clic para vincular)'
                        }
                        className="p-0.5 opacity-70 hover:opacity-100"
                      >
                        {layer.mask.linked !== false ? (
                          <Link2 className="w-2.5 h-2.5 text-sky-400" />
                        ) : (
                          <Link2Off className="w-2.5 h-2.5 opacity-45" />
                        )}
                      </button>
                      <AsyncMaskThumbnail
                        layer={layer}
                        canvasWidth={canvasWidth}
                        canvasHeight={canvasHeight}
                        isActive={isActive}
                        isEditingMask={editingMask}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLayerRowClick(e, idx, true);
                        }}
                      />
                    </div>
                  )}

                  {/* Layer Type Icon + Editable Name */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-1 min-w-0">
                      <span title={typeInfo.label} className="shrink-0">
                        <TypeIconComp className="w-3 h-3" style={{ color: typeInfo.color }} />
                      </span>
                      {editingLayerIdx === idx ? (
                        <div
                          className="flex items-center gap-1 flex-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editingLayerName}
                            onChange={(e) => setEditingLayerName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && editingLayerName.trim()) {
                                onUpdateLayerMeta(idx, { name: editingLayerName.trim() });
                                setEditingLayerIdx(null);
                              } else if (e.key === 'Escape') {
                                setEditingLayerIdx(null);
                              }
                            }}
                            onBlur={() => {
                              if (editingLayerName.trim()) {
                                onUpdateLayerMeta(idx, { name: editingLayerName.trim() });
                              }
                              setEditingLayerIdx(null);
                            }}
                            className="w-full px-1 py-0.5 rounded border text-[11px]"
                            style={{
                              backgroundColor: 'var(--studio-bg-elevated)',
                              borderColor: 'var(--studio-accent)',
                              color: 'var(--studio-text)',
                            }}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (editingLayerName.trim()) {
                                onUpdateLayerMeta(idx, { name: editingLayerName.trim() });
                              }
                              setEditingLayerIdx(null);
                            }}
                            className="p-0.5 text-emerald-400"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingLayerIdx(idx);
                            setEditingLayerName(layer.name);
                          }}
                          className="text-[11px] font-medium truncate"
                          style={{
                            color: isActive ? 'var(--studio-accent)' : 'var(--studio-text)',
                          }}
                          title={`${layer.name}${layer.isGlobal ? ' (Capa Global compartida)' : ''} · Doble clic para renombrar · Clic derecho para opciones`}
                        >
                          {layer.isGlobal && (
                            <Globe
                              className="w-3 h-3 inline mr-1 text-sky-400"
                              aria-label="Capa Global"
                            />
                          )}
                          {layer.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Independent Lock Indicators on Right */}
                  <div
                    className="flex items-center gap-0.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {layer.lockTransparency && (
                      <span title="Transparencia bloqueada">
                        <Grid3X3 className="w-2.5 h-2.5 text-amber-400" />
                      </span>
                    )}
                    {layer.lockPixels && (
                      <span title="Píxeles bloqueados">
                        <Paintbrush className="w-2.5 h-2.5 text-sky-400" />
                      </span>
                    )}
                    {layer.lockPosition && (
                      <span title="Posición bloqueada">
                        <Move className="w-2.5 h-2.5 text-indigo-400" />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onToggleLayerLock(idx)}
                      title={layer.locked ? 'Desbloquear capa' : 'Bloquear capa'}
                      className="p-0.5"
                      style={{
                        color: layer.locked
                          ? '#fb7185'
                          : hasAnyLock
                          ? 'var(--studio-accent)'
                          : 'var(--studio-text-muted)',
                      }}
                    >
                      {layer.locked ? (
                        <Lock className="w-3 h-3" />
                      ) : (
                        <Unlock className="w-3 h-3 opacity-25 hover:opacity-75" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 3. PERMANENT PHOTOSHOP BOTTOM ACTION BAR                  */}
      {/* ========================================================= */}
      <div
        className="px-2 py-1.5 border-t flex items-center justify-between gap-1 shrink-0 relative"
        style={{
          backgroundColor: 'var(--studio-bg-card)',
          borderColor: 'var(--studio-border)',
        }}
      >
        <div className="flex items-center gap-1 text-[10px] font-mono tabular-nums opacity-65">
          <span>
            {selectedArray.length > 1
              ? `${selectedArray.length} sel.`
              : `${currentLayerIndex + 1}/${layers.length}`}
          </span>
        </div>

        <div className="flex items-center gap-0.5">
          {/* 1. Crear nueva capa */}
          <button
            type="button"
            onClick={() => onAddLayer('raster')}
            title="Crear nueva capa"
            className="p-1.5 rounded hover:brightness-125 transition-colors"
            style={{ color: 'var(--studio-text)' }}
          >
            <FilePlus2 className="w-3.5 h-3.5" />
          </button>

          {/* 2. Crear nuevo grupo */}
          <button
            type="button"
            onClick={() => {
              if (selectedArray.length > 1) {
                onConvertLayersToGroup(selectedArray, `Grupo (${selectedArray.length})`, '#3b82f6');
              } else {
                setShowNewFolderForm((v) => !v);
              }
            }}
            title={
              selectedArray.length > 1
                ? 'Crear grupo con capas seleccionadas'
                : 'Crear nuevo grupo / carpeta'
            }
            className="p-1.5 rounded hover:brightness-125 transition-colors"
            style={{ color: '#93c5fd' }}
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>

          {/* 3. Crear / Gestionar máscara de capa */}
          <div className="relative" data-ps-bottom-popover>
            <button
              type="button"
              onClick={(e) => {
                if (!activeLayer?.mask) {
                  onCreateLayerMask?.(
                    currentLayerIndex,
                    hasActiveSelection ? 'selection' : 'reveal',
                    hasActiveSelection ? 'selection' : 'layer'
                  );
                } else {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setMaskMenuPos({
                    left: Math.max(8, Math.min(rect.right - 176, window.innerWidth - 184)),
                    top: Math.max(8, rect.top - 6),
                  });
                  setShowMaskCreateMenu((v) => !v);
                }
              }}
              title={
                activeLayer?.mask
                  ? 'Opciones de máscara de capa'
                  : hasActiveSelection
                  ? 'Crear máscara desde selección'
                  : 'Crear máscara de capa'
              }
              className="p-1.5 rounded hover:brightness-125 transition-colors"
              style={{
                color: activeLayer?.mask ? '#fbbf24' : 'var(--studio-text)',
              }}
            >
              {/* Classic Photoshop circle-inside-rectangle mask icon */}
              <svg
                viewBox="0 0 16 16"
                className="w-3.5 h-3.5 fill-none stroke-current"
                strokeWidth="1.4"
              >
                <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
                <circle cx="8" cy="8" r="3.1" className="fill-current" />
              </svg>
            </button>

            {showMaskCreateMenu &&
              activeLayer?.mask &&
              typeof document !== 'undefined' &&
              createPortal(
                <div
                  data-ps-bottom-popover
                  className="fixed w-44 rounded-lg border shadow-2xl py-1 text-[11px]"
                  style={{
                    zIndex: STUDIO_Z.CONTEXT_MENU,
                    left: `${maskMenuPos.left}px`,
                    top: `${maskMenuPos.top}px`,
                    transform: 'translateY(-100%)',
                    backgroundColor: 'var(--studio-bg-elevated)',
                    borderColor: 'var(--studio-border-strong)',
                    color: 'var(--studio-text)',
                  }}
                >
                <button
                  type="button"
                  onClick={() => {
                    onSetEditingMask?.(!editingMask);
                    setShowMaskCreateMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1 hover:bg-white/10"
                >
                  {editingMask ? 'Editar píxeles de capa' : 'Editar máscara'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onInvertLayerMask?.(currentLayerIndex);
                    setShowMaskCreateMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1 hover:bg-white/10"
                >
                  Invertir máscara
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onToggleMaskDisabled?.(currentLayerIndex);
                    setShowMaskCreateMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1 hover:bg-white/10"
                >
                  {activeLayer.mask.disabled ? 'Habilitar máscara' : 'Deshabilitar máscara'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onToggleMaskQuickPreview?.(currentLayerIndex);
                    setShowMaskCreateMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1 hover:bg-white/10"
                >
                  {activeLayer.mask.quickPreview ? 'Ocultar vista rápida (rubí)' : 'Vista previa rápida (rubí)'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onApplyLayerMask?.(currentLayerIndex);
                    setShowMaskCreateMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1 hover:bg-white/10"
                >
                  Aplicar máscara
                </button>
                <div className="my-1 border-t" style={{ borderColor: 'var(--studio-border)' }} />
                <button
                  type="button"
                  onClick={() => {
                    onDeleteLayerMask?.(currentLayerIndex);
                    setShowMaskCreateMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1 text-rose-400 hover:bg-rose-500/15"
                >
                  Eliminar máscara
                </button>
              </div>,
                document.body
              )}
          </div>

          {/* 4. Crear capa de ajuste */}
          <button
            type="button"
            onClick={() => onCreateAdjustmentLayer(DEFAULT_ADJUSTMENT_CONFIG, 'Ajuste Color')}
            title="Crear capa de ajuste no destructiva"
            className="p-1.5 rounded hover:brightness-125 transition-colors text-purple-400"
          >
            <Contrast className="w-3.5 h-3.5" />
          </button>

          {/* 5. Crear capa de referencia */}
          <button
            type="button"
            onClick={() => onAddLayer('reference')}
            title="Crear capa de referencia"
            className="p-1.5 rounded hover:brightness-125 transition-colors text-sky-400"
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </button>

          {/* 6. Menú de tipos especiales (Vacía, Texto, Vector, IA, Animación, Inteligente, Temp) */}
          <div className="relative" data-ps-bottom-popover>
            <button
              type="button"
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setSpecialMenuPos({
                  left: Math.max(8, Math.min(rect.right - 192, window.innerWidth - 200)),
                  top: Math.max(8, rect.top - 6),
                });
                setShowSpecialLayerMenu((v) => !v);
              }}
              title="Crear capa especial (Vacía, Texto, Vector, IA, Animación, Inteligente)"
              className="p-1.5 rounded hover:brightness-125 transition-colors"
              style={{ color: 'var(--studio-text-muted)' }}
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            {showSpecialLayerMenu &&
              typeof document !== 'undefined' &&
              createPortal(
                <div
                  data-ps-bottom-popover
                  className="fixed w-48 rounded-lg border shadow-2xl py-1 text-[11px]"
                  style={{
                    zIndex: STUDIO_Z.CONTEXT_MENU,
                    left: `${specialMenuPos.left}px`,
                    top: `${specialMenuPos.top}px`,
                    transform: 'translateY(-100%)',
                    backgroundColor: 'var(--studio-bg-elevated)',
                    borderColor: 'var(--studio-border-strong)',
                    color: 'var(--studio-text)',
                  }}
                >
                  {(
                    [
                      'empty',
                      'text',
                      'vector',
                      'smart',
                      'ai',
                      'animation',
                      'temp',
                    ] as LayerType[]
                  ).map((lt) => {
                    const info = LAYER_TYPE_INFO[lt];
                    const Icon = info.Icon;
                    return (
                      <button
                        key={lt}
                        type="button"
                        onClick={() => {
                          onAddLayer(lt);
                          setShowSpecialLayerMenu(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-white/10 flex items-center gap-2"
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: info.color }} />
                        <span>{info.label}</span>
                      </button>
                    );
                  })}
                </div>,
                document.body
              )}
          </div>

          {/* 7. Eliminar capa */}
          <button
            type="button"
            disabled={layers.length <= selectedArray.length}
            onClick={() => {
              if (selectedArray.length > 1) {
                onBatchDeleteLayers(selectedArray);
              } else if (layers.length > 1) {
                onDeleteLayer(currentLayerIndex);
              }
            }}
            title="Eliminar capa(s) seleccionada(s)"
            className="p-1.5 rounded text-rose-400 hover:bg-rose-500/15 disabled:opacity-30 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. FLOATING COLOR TAG POPOVER (Portaled above everything) */}
      {/* ========================================================= */}
      {colorPopoverTarget &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            data-ps-color-popover
            className="fixed p-2 rounded-lg border shadow-2xl flex items-center gap-1.5"
            style={{
              zIndex: STUDIO_Z.CONTEXT_MENU,
              left: `${Math.max(8, Math.min(colorPopoverTarget.x, window.innerWidth - 230))}px`,
              top: `${Math.max(8, Math.min(colorPopoverTarget.y, window.innerHeight - 48))}px`,
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: 'var(--studio-border-strong)',
            }}
          >
            {colorPopoverTarget.kind === 'layer' && (
              <button
                type="button"
                onClick={() => {
                  onUpdateLayerMeta(colorPopoverTarget.idx, { colorTag: undefined });
                  setColorPopoverTarget(null);
                }}
                title="Quitar color"
                className="w-4 h-4 rounded-full border text-[9px] flex items-center justify-center"
                style={{ borderColor: 'var(--studio-border-strong)', color: 'var(--studio-text-muted)' }}
              >
                ✕
              </button>
            )}
            {COLOR_MARK_PRESETS.map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => {
                  if (colorPopoverTarget.kind === 'layer') {
                    onUpdateLayerMeta(colorPopoverTarget.idx, { colorTag: col });
                  } else {
                    onChangeGroupColor?.(colorPopoverTarget.id, col);
                  }
                  setColorPopoverTarget(null);
                }}
                className="w-4 h-4 rounded-full border border-white/30 hover:scale-110 transition-transform"
                style={{ backgroundColor: col }}
              />
            ))}
            <input
              type="color"
              value={
                colorPopoverTarget.kind === 'layer'
                  ? layers[colorPopoverTarget.idx]?.colorTag || '#3b82f6'
                  : layerGroups.find((g) => g.id === colorPopoverTarget.id)?.color || '#3b82f6'
              }
              onChange={(e) => {
                if (colorPopoverTarget.kind === 'layer') {
                  onUpdateLayerMeta(colorPopoverTarget.idx, { colorTag: e.target.value });
                } else {
                  onChangeGroupColor?.(colorPopoverTarget.id, e.target.value);
                }
              }}
              className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
            />
          </div>,
          document.body
        )}

      {/* ========================================================= */}
      {/* 5. RIGHT-CLICK PHOTOSHOP CONTEXT MENU (Portaled above all) */}
      {/* ========================================================= */}
      {contextMenu &&
        ctxLayer &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            data-ps-ctx-menu
            className="fixed w-58 max-h-[calc(100vh-16px)] overflow-y-auto rounded-lg border shadow-2xl py-1 text-[11px]"
            style={{
              zIndex: STUDIO_Z.CONTEXT_MENU,
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: 'var(--studio-border-strong)',
              color: 'var(--studio-text)',
            }}
          >
          <button
            type="button"
            onClick={() => {
              onMassDuplicateLayers(selectedArray.length > 1 ? selectedArray : [contextMenu.layerIdx]);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1 hover:bg-white/10 flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <Copy className="w-3.5 h-3.5 opacity-70" />
              Duplicar capa
            </span>
            <span className="text-[9px] opacity-45 font-mono">Ctrl+J</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onConvertToSmartObject?.(contextMenu.layerIdx);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1 hover:bg-white/10 flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Convertir en objeto inteligente</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onConvertLayersToGroup(
                selectedArray.length > 1 ? selectedArray : [contextMenu.layerIdx],
                `Grupo (${selectedArray.length > 1 ? selectedArray.length : 1})`,
                '#3b82f6'
              );
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1 hover:bg-white/10 flex items-center gap-2"
          >
            <FolderPlus className="w-3.5 h-3.5 text-sky-400" />
            <span>Crear grupo</span>
          </button>

          {/* Mover a grupo */}
          <div>
            <button
              type="button"
              onClick={() => setCtxSubmenu(ctxSubmenu === 'group' ? null : 'group')}
              className="w-full text-left px-3 py-1 hover:bg-white/10 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <FolderOpen className="w-3.5 h-3.5 opacity-70" />
                Mover a grupo
              </span>
              <ChevronRight className="w-3 h-3 opacity-60" />
            </button>
            {ctxSubmenu === 'group' && (
              <div
                className="mx-2 my-1 rounded border py-1 max-h-32 overflow-y-auto"
                style={{
                  backgroundColor: 'var(--studio-bg-card)',
                  borderColor: 'var(--studio-border)',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    onAssignLayerToGroup(contextMenu.layerIdx, null);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1 text-[10px] hover:bg-white/10"
                >
                  Raíz (Sin grupo)
                </button>
                {layerGroups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      onAssignLayerToGroup(contextMenu.layerIdx, g.id);
                      setContextMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 text-[10px] hover:bg-white/10 flex items-center gap-1.5"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />
                    <span className="truncate">{g.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="my-1 border-t" style={{ borderColor: 'var(--studio-border)' }} />

          <button
            type="button"
            onClick={() => {
              onUpdateLayerMeta(contextMenu.layerIdx, { isGlobal: !ctxLayer.isGlobal });
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1 hover:bg-white/10 flex items-center gap-2"
          >
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span>{ctxLayer.isGlobal ? 'Quitar de Capa Global' : 'Convertir en Capa Global (Todos los frames)'}</span>
          </button>

          {onDuplicateLayerToNextFrame && (
            <button
              type="button"
              onClick={() => {
                onDuplicateLayerToNextFrame(contextMenu.layerIdx);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1 hover:bg-white/10 flex items-center gap-2"
            >
              <Copy className="w-3.5 h-3.5 text-emerald-400" />
              <span>Duplicar capa al siguiente frame</span>
            </button>
          )}

          {onDuplicateLayerToSelectedFrames && (
            <button
              type="button"
              onClick={() => {
                onDuplicateLayerToSelectedFrames(contextMenu.layerIdx);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1 hover:bg-white/10 flex items-center gap-2"
            >
              <Copy className="w-3.5 h-3.5 text-sky-400" />
              <span>Duplicar capa a varios frames</span>
            </button>
          )}

          {onDuplicateLayerToAllFrames && (
            <button
              type="button"
              onClick={() => {
                onDuplicateLayerToAllFrames(contextMenu.layerIdx);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1 hover:bg-white/10 flex items-center gap-2"
            >
              <Copy className="w-3.5 h-3.5 text-amber-400" />
              <span>Duplicar capa a toda la animación</span>
            </button>
          )}

          {ctxLayer.groupId && onDuplicateGroupToAllFrames && (
            <button
              type="button"
              onClick={() => {
                if (ctxLayer.groupId) onDuplicateGroupToAllFrames(ctxLayer.groupId);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1 hover:bg-white/10 flex items-center gap-2"
            >
              <Folder className="w-3.5 h-3.5 text-purple-400" />
              <span>Duplicar grupo a toda la animación</span>
            </button>
          )}

          <div className="my-1 border-t" style={{ borderColor: 'var(--studio-border)' }} />

          <button
            type="button"
            disabled={contextMenu.layerIdx <= 0}
            onClick={() => {
              if (contextMenu.layerIdx > 0) {
                onMergeLayers([contextMenu.layerIdx - 1, contextMenu.layerIdx]);
              }
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1 hover:bg-white/10 disabled:opacity-35 flex items-center gap-2"
          >
            <Combine className="w-3.5 h-3.5 text-amber-400" />
            <span>Fusionar hacia abajo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onMergeVisibleLayers?.();
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1 hover:bg-white/10 flex items-center gap-2"
          >
            <Layers className="w-3.5 h-3.5 opacity-70" />
            <span>Fusionar visibles</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onRasterizeLayer?.(contextMenu.layerIdx);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1 hover:bg-white/10 flex items-center gap-2"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 opacity-70" />
            <span>Rasterizar capa</span>
          </button>

          <div className="my-1 border-t" style={{ borderColor: 'var(--studio-border)' }} />

          {/* Máscaras */}
          <div>
            <button
              type="button"
              onClick={() => setCtxSubmenu(ctxSubmenu === 'mask' ? null : 'mask')}
              className="w-full text-left px-3 py-1 hover:bg-white/10 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Contrast className="w-3.5 h-3.5 text-amber-400" />
                {ctxLayer.mask ? 'Opciones de máscara' : 'Crear máscara'}
              </span>
              <ChevronRight className="w-3 h-3 opacity-60" />
            </button>
            {ctxSubmenu === 'mask' && (
              <div
                className="mx-2 my-1 rounded border py-1"
                style={{
                  backgroundColor: 'var(--studio-bg-card)',
                  borderColor: 'var(--studio-border)',
                }}
              >
                {!ctxLayer.mask ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onCreateLayerMask?.(contextMenu.layerIdx, 'reveal', 'layer');
                        setContextMenu(null);
                      }}
                      className="w-full text-left px-2.5 py-1 text-[10px] hover:bg-white/10"
                    >
                      Máscara de capa (Mostrar todo)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onCreateLayerMask?.(contextMenu.layerIdx, 'hide', 'layer');
                        setContextMenu(null);
                      }}
                      className="w-full text-left px-2.5 py-1 text-[10px] hover:bg-white/10"
                    >
                      Máscara de capa (Ocultar todo)
                    </button>
                    <button
                      type="button"
                      disabled={!hasActiveSelection}
                      onClick={() => {
                        onCreateLayerMask?.(contextMenu.layerIdx, 'selection', 'selection');
                        setContextMenu(null);
                      }}
                      className="w-full text-left px-2.5 py-1 text-[10px] hover:bg-white/10 disabled:opacity-40"
                    >
                      Máscara por selección
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onCreateLayerMask?.(contextMenu.layerIdx, 'vector', 'vector');
                        setContextMenu(null);
                      }}
                      className="w-full text-left px-2.5 py-1 text-[10px] hover:bg-white/10"
                    >
                      Máscara vectorial
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onInvertLayerMask?.(contextMenu.layerIdx);
                        setContextMenu(null);
                      }}
                      className="w-full text-left px-2.5 py-1 text-[10px] hover:bg-white/10"
                    >
                      Invertir máscara
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onToggleMaskDisabled?.(contextMenu.layerIdx);
                        setContextMenu(null);
                      }}
                      className="w-full text-left px-2.5 py-1 text-[10px] hover:bg-white/10"
                    >
                      {ctxLayer.mask.disabled ? 'Activar máscara' : 'Desactivar máscara'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onApplyLayerMask?.(contextMenu.layerIdx);
                        setContextMenu(null);
                      }}
                      className="w-full text-left px-2.5 py-1 text-[10px] hover:bg-white/10"
                    >
                      Aplicar máscara
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteLayerMask?.(contextMenu.layerIdx);
                        setContextMenu(null);
                      }}
                      className="w-full text-left px-2.5 py-1 text-[10px] text-rose-400 hover:bg-rose-500/15"
                    >
                      Eliminar máscara
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={contextMenu.layerIdx <= 0}
            onClick={() => {
              onUpdateLayerMeta(contextMenu.layerIdx, {
                clippingMask: !ctxLayer.clippingMask,
              });
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1 hover:bg-white/10 disabled:opacity-35 flex items-center gap-2"
          >
            <CornerDownRight className="w-3.5 h-3.5 text-sky-400" />
            <span>
              {ctxLayer.clippingMask
                ? 'Soltar máscara de recorte'
                : 'Crear máscara de recorte'}
            </span>
          </button>

          <div className="my-1 border-t" style={{ borderColor: 'var(--studio-border)' }} />

          <button
            type="button"
            onClick={() => {
              onToggleLayerLock(contextMenu.layerIdx);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1 hover:bg-white/10 flex items-center gap-2"
          >
            <Lock className="w-3.5 h-3.5 opacity-70" />
            <span>{ctxLayer.locked ? 'Desbloquear' : 'Bloquear'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onToggleLayerVisibility(contextMenu.layerIdx);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1 hover:bg-white/10 flex items-center gap-2"
          >
            {ctxLayer.visible ? (
              <EyeOff className="w-3.5 h-3.5 opacity-70" />
            ) : (
              <Eye className="w-3.5 h-3.5 opacity-70" />
            )}
            <span>{ctxLayer.visible ? 'Ocultar' : 'Mostrar'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingLayerIdx(contextMenu.layerIdx);
              setEditingLayerName(ctxLayer.name);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1 hover:bg-white/10 flex items-center gap-2"
          >
            <TypeIcon className="w-3.5 h-3.5 opacity-70" />
            <span>Renombrar</span>
          </button>

          <div>
            <button
              type="button"
              onClick={() => setCtxSubmenu(ctxSubmenu === 'color' ? null : 'color')}
              className="w-full text-left px-3 py-1 hover:bg-white/10 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Palette className="w-3.5 h-3.5 opacity-70" />
                Cambiar color
              </span>
              <ChevronRight className="w-3 h-3 opacity-60" />
            </button>
            {ctxSubmenu === 'color' && (
              <div
                className="mx-2 my-1 p-1.5 rounded border flex items-center gap-1 flex-wrap"
                style={{
                  backgroundColor: 'var(--studio-bg-card)',
                  borderColor: 'var(--studio-border)',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    onUpdateLayerMeta(contextMenu.layerIdx, { colorTag: undefined });
                    setContextMenu(null);
                  }}
                  className="w-3.5 h-3.5 rounded-full border text-[8px] flex items-center justify-center"
                >
                  ✕
                </button>
                {COLOR_MARK_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      onUpdateLayerMeta(contextMenu.layerIdx, { colorTag: c });
                      setContextMenu(null);
                    }}
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="my-1 border-t" style={{ borderColor: 'var(--studio-border)' }} />

          {/* Thumbnail Framing Options (Photoshop style) */}
          <button
            type="button"
            onClick={() => {
              applyThumbnailBoundsMode('canvas');
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1 hover:bg-white/10 flex items-center justify-between gap-2"
          >
            <span className="flex items-center gap-2">
              <Maximize className="w-3.5 h-3.5 opacity-70" />
              <span>Miniaturas: Lienzo completo</span>
            </span>
            {thumbnailBoundsMode === 'canvas' && <Check className="w-3 h-3 text-amber-400" />}
          </button>

          <button
            type="button"
            onClick={() => {
              applyThumbnailBoundsMode('content');
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1 hover:bg-white/10 flex items-center justify-between gap-2"
          >
            <span className="flex items-center gap-2">
              <Scan className="w-3.5 h-3.5 opacity-70" />
              <span>Miniaturas: Ajustar al contenido</span>
            </span>
            {thumbnailBoundsMode === 'content' && <Check className="w-3 h-3 text-amber-400" />}
          </button>

          <div className="my-1 border-t" style={{ borderColor: 'var(--studio-border)' }} />

          <button
            type="button"
            disabled={layers.length <= 1}
            onClick={() => {
              if (selectedArray.length > 1 && layers.length > selectedArray.length) {
                onBatchDeleteLayers(selectedArray);
              } else if (layers.length > 1) {
                onDeleteLayer(contextMenu.layerIdx);
              }
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1 text-rose-400 hover:bg-rose-500/15 disabled:opacity-35 flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar capa</span>
          </button>
        </div>,
          document.body
        )}
    </div>
  );
};
