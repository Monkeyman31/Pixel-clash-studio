import React, { useMemo, useRef, useState } from 'react';
import {
  ImagePlus,
  FolderPlus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  ChevronDown,
  ChevronRight,
  FlipHorizontal,
  FlipVertical,
  Sparkles,
  Anchor,
  Camera,
  Folder,
  FolderOpen,
  GripVertical,
  Edit3,
  Check,
  RotateCcw,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Focus,
  UserCheck,
  Hand,
  MousePointer2,
  Map as MapIcon,
  Scan,
  RotateCw,
  ArrowUpToLine,
  Pin,
  Move,
} from 'lucide-react';
import {
  DummiePose,
  GuidesConfig,
  PureRefConfig,
  ReferenceAnchorMode,
  ReferenceBlendMode,
  ReferenceGroup,
  ReferenceItem,
} from '../types';
import { DummiePosePanel } from './DummiePosePanel';
import { StudioSlider } from './StudioSlider';

interface ReferencesPanelProps {
  references: ReferenceItem[];
  referenceGroups: ReferenceGroup[];
  activeReferenceId: string | null;
  onSelectReference: (id: string | null) => void;
  onAddReferencesFromFiles: (files: FileList | File[], groupId?: string | null) => void;
  onUpdateReference: (id: string, patch: Partial<ReferenceItem>) => void;
  onDeleteReference: (id: string) => void;
  onCreateGroup: (name: string, color: string) => void;
  onUpdateGroup: (id: string, patch: Partial<ReferenceGroup>) => void;
  onDeleteGroup: (id: string) => void;
  onReorderGroup: (dragGroupId: string, targetGroupId: string) => void;
  dummiePose?: DummiePose;
  onChangeDummiePose?: (next: DummiePose) => void;
  savedDummiePoses?: DummiePose[];
  onSaveDummiePose?: (pose: DummiePose) => void;
  onDeleteSavedDummiePose?: (id: string) => void;
  onOpenApplyPoseModal?: () => void;
  onGenerateDummieFromReference?: (ref: ReferenceItem) => void;
  pureRefConfig?: PureRefConfig;
  onChangePureRefConfig?: (next: PureRefConfig) => void;
  onCenterAllReferences?: () => void;
  onBringReferenceToFront?: (id: string) => void;
  onActivateMoveReferenceTool?: () => void;
  guidesConfig?: GuidesConfig;
  canvasWidth?: number;
  canvasHeight?: number;
  onChangeGuidesConfig?: (next: GuidesConfig) => void;
}

const BLEND_MODES: { id: ReferenceBlendMode; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'multiply', label: 'Multiplicar' },
  { id: 'overlay', label: 'Superponer' },
  { id: 'screen', label: 'Pantalla' },
  { id: 'difference', label: 'Diferencia' },
];

const GROUP_COLORS = ['#38bdf8', '#f59e0b', '#10b981', '#a855f7', '#ef4444', '#ec4899'];

export const ReferencesPanel: React.FC<ReferencesPanelProps> = ({
  references,
  referenceGroups,
  activeReferenceId,
  onSelectReference,
  onAddReferencesFromFiles,
  onUpdateReference,
  onDeleteReference,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onReorderGroup,
  dummiePose,
  onChangeDummiePose,
  savedDummiePoses = [],
  onSaveDummiePose,
  onDeleteSavedDummiePose,
  onOpenApplyPoseModal,
  onGenerateDummieFromReference,
  pureRefConfig = { enabled: false, alwaysOnTop: true, globalOpacity: 1, panX: 0, panY: 0, zoom: 1 },
  onChangePureRefConfig,
  onCenterAllReferences,
  onBringReferenceToFront,
  onActivateMoveReferenceTool,
  guidesConfig,
  canvasWidth,
  canvasHeight,
  onChangeGuidesConfig,
}) => {
  const [subTab, setSubTab] = useState<'board' | 'images' | 'groups' | 'ai_refs' | 'dummie'>('board');
  const [boardExpanded, setBoardExpanded] = useState(false);
  const [boardPan, setBoardPan] = useState({ x: 40, y: 24 });
  const [boardZoom, setBoardZoom] = useState(1);
  const [boardTool, setBoardTool] = useState<'select' | 'pan'>('select');
  const [showMinimap, setShowMinimap] = useState(true);
  const boardSurfaceRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOsFiles, setIsDraggingOsFiles] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#38bdf8');
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [dragGroupId, setDragGroupId] = useState<string | null>(null);
  const [dragRefId, setDragRefId] = useState<string | null>(null);

  const dragBoardStateRef = useRef<{
    type: 'pan' | 'item' | 'scale' | 'rotate' | 'minimap';
    refId?: string;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
    origScale?: number;
    origRotation?: number;
    centerClientX?: number;
    centerClientY?: number;
  } | null>(null);

  const activeRef = references.find((r) => r.id === activeReferenceId) || null;
  const aiGuideCount = references.filter((r) => r.useAsAiGuide).length;

  const visibleBoardRefs = useMemo(() => {
    const groupMap = new Map(referenceGroups.map((g) => [g.id, g]));
    return references.filter((r) => {
      if (!r.visible) return false;
      if (r.groupId) {
        const g = groupMap.get(r.groupId);
        if (g && !g.visible) return false;
      }
      return true;
    });
  }, [references, referenceGroups]);

  const getBoardItemMetrics = (refItem: ReferenceItem, idx: number) => {
    const bx = refItem.boardX ?? 20 + (idx % 3) * 140;
    const by = refItem.boardY ?? 18 + Math.floor(idx / 3) * 130;
    const bScale = refItem.boardScale ?? 1;
    const baseW = Math.max(64, Math.min(180, refItem.naturalWidth || 110));
    const aspect =
      refItem.naturalWidth && refItem.naturalHeight
        ? refItem.naturalHeight / refItem.naturalWidth
        : 1;
    const w = baseW * bScale;
    const h = w * aspect + 18;
    return { bx, by, bScale, bRot: refItem.boardRotation ?? 0, w, h };
  };

  const fitAllBoardRefs = () => {
    const surf = boardSurfaceRef.current;
    if (!surf || visibleBoardRefs.length === 0) {
      setBoardPan({ x: 40, y: 24 });
      setBoardZoom(1);
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    visibleBoardRefs.forEach((r, idx) => {
      const m = getBoardItemMetrics(r, idx);
      minX = Math.min(minX, m.bx);
      minY = Math.min(minY, m.by);
      maxX = Math.max(maxX, m.bx + m.w);
      maxY = Math.max(maxY, m.by + m.h);
    });
    const rect = surf.getBoundingClientRect();
    const spanW = Math.max(80, maxX - minX);
    const spanH = Math.max(80, maxY - minY);
    const nextZoom = Math.max(0.1, Math.min(2.5, Math.min((rect.width - 32) / spanW, (rect.height - 32) / spanH)));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    setBoardZoom(Number(nextZoom.toFixed(2)));
    setBoardPan({
      x: Math.round(rect.width / 2 - centerX * nextZoom),
      y: Math.round(rect.height / 2 - centerY * nextZoom),
    });
  };

  const zoomBoardAroundCenter = (factor: number, clientX?: number, clientY?: number) => {
    const surf = boardSurfaceRef.current;
    const nextZoom = Math.max(0.1, Math.min(8, Number((boardZoom * factor).toFixed(3))));
    if (!surf) {
      setBoardZoom(nextZoom);
      return;
    }
    const rect = surf.getBoundingClientRect();
    const px = clientX !== undefined ? clientX - rect.left : rect.width / 2;
    const py = clientY !== undefined ? clientY - rect.top : rect.height / 2;
    const worldX = (px - boardPan.x) / boardZoom;
    const worldY = (py - boardPan.y) / boardZoom;
    setBoardZoom(nextZoom);
    setBoardPan({
      x: px - worldX * nextZoom,
      y: py - worldY * nextZoom,
    });
  };

  const handlePanelDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setIsDraggingOsFiles(true);
    }
  };

  const handlePanelDragLeave = () => {
    setIsDraggingOsFiles(false);
  };

  const handlePanelDrop = (e: React.DragEvent<HTMLDivElement>, targetGroupId: string | null = null) => {
    setIsDraggingOsFiles(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      onAddReferencesFromFiles(e.dataTransfer.files, targetGroupId);
      return;
    }
    if (dragRefId) {
      e.preventDefault();
      e.stopPropagation();
      onUpdateReference(dragRefId, { groupId: targetGroupId });
      setDragRefId(null);
    }
  };

  const handleBoardPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button === 1 || e.button === 0 || e.button === 2) {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragBoardStateRef.current = {
        type: 'pan',
        startClientX: e.clientX,
        startClientY: e.clientY,
        origX: boardPan.x,
        origY: boardPan.y,
      };
    }
  };

  const handleBoardItemPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    refItem: ReferenceItem,
    indexFallback: number
  ) => {
    if (boardTool === 'pan' || e.button === 1) {
      return;
    }
    e.stopPropagation();
    onSelectReference(refItem.id);
    if (refItem.locked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { bx, by } = getBoardItemMetrics(refItem, indexFallback);
    dragBoardStateRef.current = {
      type: 'item',
      refId: refItem.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: bx,
      origY: by,
    };
  };

  const handleBoardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = dragBoardStateRef.current;
    if (!st) return;
    const dx = e.clientX - st.startClientX;
    const dy = e.clientY - st.startClientY;
    if (st.type === 'pan') {
      setBoardPan({ x: st.origX + dx, y: st.origY + dy });
    } else if (st.type === 'item' && st.refId) {
      onUpdateReference(st.refId, {
        boardX: Math.round(st.origX + dx / boardZoom),
        boardY: Math.round(st.origY + dy / boardZoom),
      });
    } else if (st.type === 'scale' && st.refId) {
      const nextScale = Math.max(0.15, Math.min(6, Number(((st.origScale || 1) + dx / 120).toFixed(2))));
      onUpdateReference(st.refId, { boardScale: nextScale });
    } else if (st.type === 'rotate' && st.refId && st.centerClientX !== undefined && st.centerClientY !== undefined) {
      const a0 = Math.atan2(st.startClientY - st.centerClientY, st.startClientX - st.centerClientX);
      const a1 = Math.atan2(e.clientY - st.centerClientY, e.clientX - st.centerClientX);
      let deg = Math.round((st.origRotation || 0) + ((a1 - a0) * 180) / Math.PI);
      if (e.shiftKey) deg = Math.round(deg / 15) * 15;
      while (deg > 180) deg -= 360;
      while (deg < -180) deg += 360;
      onUpdateReference(st.refId, { boardRotation: deg });
    }
  };

  const handleBoardPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragBoardStateRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      dragBoardStateRef.current = null;
    }
  };

  const renderRefBoard = (isModal: boolean) => {
    // Minimap bounds computation across all references + current viewport
    let mmMinX = -400;
    let mmMinY = -300;
    let mmMaxX = 800;
    let mmMaxY = 600;
    visibleBoardRefs.forEach((r, idx) => {
      const m = getBoardItemMetrics(r, idx);
      mmMinX = Math.min(mmMinX, m.bx - 120);
      mmMinY = Math.min(mmMinY, m.by - 120);
      mmMaxX = Math.max(mmMaxX, m.bx + m.w + 120);
      mmMaxY = Math.max(mmMaxY, m.by + m.h + 120);
    });
    const mmW = Math.max(400, mmMaxX - mmMinX);
    const mmH = Math.max(300, mmMaxY - mmMinY);
    const surfW = boardSurfaceRef.current?.clientWidth || (isModal ? 900 : 280);
    const surfH = boardSurfaceRef.current?.clientHeight || (isModal ? 600 : 240);
    const viewWorldX = -boardPan.x / boardZoom;
    const viewWorldY = -boardPan.y / boardZoom;
    const viewWorldW = surfW / boardZoom;
    const viewWorldH = surfH / boardZoom;

    return (
      <div
        data-help-id="panel.references"
        className={`rounded-xl border relative overflow-hidden select-none flex flex-col ${
          isModal ? 'w-full h-full' : 'w-full h-72'
        }`}
        style={{
          backgroundColor: '#090d16',
          borderColor: isDraggingOsFiles ? 'var(--studio-accent)' : 'var(--studio-border-strong)',
        }}
        onDragOver={handlePanelDragOver}
        onDrop={(e) => handlePanelDrop(e, null)}
      >
        {/* Board Top Controls */}
        <div
          className="px-2 py-1 border-b flex items-center justify-between gap-1 z-10 shrink-0 flex-wrap"
          style={{
            backgroundColor: 'var(--studio-bg-bar)',
            borderColor: 'var(--studio-border)',
          }}
        >
          <div className="flex items-center gap-1 min-w-0">
            <button
              type="button"
              onClick={() => setBoardTool('select')}
              title="Modo Mover y Editar referencias en la mesa infinita"
              className="p-1 rounded border"
              style={{
                backgroundColor: boardTool === 'select' ? 'var(--studio-accent)' : 'transparent',
                color: boardTool === 'select' ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                borderColor: 'var(--studio-border)',
              }}
            >
              <MousePointer2 className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setBoardTool('pan')}
              title="Modo Mano (Desplazar tablero infinito)"
              className="p-1 rounded border"
              style={{
                backgroundColor: boardTool === 'pan' ? 'var(--studio-accent)' : 'transparent',
                color: boardTool === 'pan' ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                borderColor: 'var(--studio-border)',
              }}
            >
              <Hand className="w-3 h-3" />
            </button>
            <span className="text-[10px] font-mono font-bold truncate tabular-nums ml-1" style={{ color: 'var(--studio-text)' }}>
              Mesa Infinita ({visibleBoardRefs.length}) · {Math.round(boardZoom * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Importar referencia"
              className="p-1 rounded hover:opacity-80"
              style={{ color: 'var(--studio-accent)' }}
            >
              <ImagePlus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => zoomBoardAroundCenter(0.82)}
              title="Alejar mesa (hasta 10%)"
              className="p-1 rounded hover:opacity-80"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => zoomBoardAroundCenter(1.22)}
              title="Acercar mesa (hasta 800%)"
              className="p-1 rounded hover:opacity-80"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                fitAllBoardRefs();
                onCenterAllReferences?.();
              }}
              title="Centrar todas las referencias (en mesa y en vista de cámara)"
              className="p-1 rounded hover:opacity-80"
            >
              <Scan className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setBoardPan({ x: 40, y: 24 });
                setBoardZoom(1);
              }}
              title="Volver al origen (0, 0)"
              className="p-1 rounded hover:opacity-80"
            >
              <Focus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setShowMinimap((v) => !v)}
              title={showMinimap ? 'Ocultar Minimapa' : 'Mostrar Minimapa interactivo'}
              className="p-1 rounded hover:opacity-80"
              style={{ color: showMinimap ? 'var(--studio-accent)' : 'var(--studio-text-muted)' }}
            >
              <MapIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setBoardExpanded((v) => !v)}
              title={isModal ? 'Volver al panel lateral' : 'Expandir mesa infinita en pantalla completa'}
              className="p-1 rounded hover:opacity-80"
              style={{ color: 'var(--studio-accent)' }}
            >
              {isModal ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Infinite Workspace Surface */}
        <div
          ref={boardSurfaceRef}
          className={`flex-1 relative overflow-hidden touch-none ${
            boardTool === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
          }`}
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(148,163,184,0.18) 1px, transparent 1px)',
            backgroundSize: `${Math.max(10, 22 * boardZoom)}px ${Math.max(10, 22 * boardZoom)}px`,
            backgroundPosition: `${boardPan.x}px ${boardPan.y}px`,
          }}
          onPointerDown={handleBoardPointerDown}
          onPointerMove={handleBoardPointerMove}
          onPointerUp={handleBoardPointerUp}
          onWheel={(e) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.12 : 0.89;
            zoomBoardAroundCenter(factor, e.clientX, e.clientY);
          }}
        >
          {/* Live World Coordinate Indicator */}
          <div className="absolute bottom-1.5 left-1.5 z-20 px-1.5 py-0.5 rounded bg-slate-950/85 border border-slate-700/70 font-mono text-[9px] text-slate-300 tabular-nums pointer-events-none">
            X:{Math.round(viewWorldX)} · Y:{Math.round(viewWorldY)}
          </div>

          {visibleBoardRefs.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center pointer-events-none gap-1">
              <ImagePlus className="w-6 h-6 opacity-45" style={{ color: 'var(--studio-accent)' }} />
              <span className="text-[11px] font-semibold" style={{ color: 'var(--studio-text)' }}>
                Mesa Infinita de Referencias
              </span>
              <span className="text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>
                Arrastra imágenes aquí. Paneo libre y zoom 10%–800% independiente del lienzo.
              </span>
            </div>
          )}

          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              transform: `translate(${boardPan.x}px, ${boardPan.y}px) scale(${boardZoom})`,
            }}
          >
            {/* Subtle Origin Crosshair */}
            <div
              className="absolute pointer-events-none"
              style={{ left: -12, top: 0, width: 24, height: 1, backgroundColor: 'rgba(251,191,36,0.28)' }}
            />
            <div
              className="absolute pointer-events-none"
              style={{ left: 0, top: -12, width: 1, height: 24, backgroundColor: 'rgba(251,191,36,0.28)' }}
            />

            {visibleBoardRefs.map((refItem, idx) => {
              const isSel = refItem.id === activeReferenceId;
              const { bx, by, bRot, w } = getBoardItemMetrics(refItem, idx);
              const grp = referenceGroups.find((g) => g.id === refItem.groupId);
              return (
                <div
                  key={refItem.id}
                  onPointerDown={(e) => handleBoardItemPointerDown(e, refItem, idx)}
                  onPointerMove={handleBoardPointerMove}
                  onPointerUp={handleBoardPointerUp}
                  style={{
                    position: 'absolute',
                    left: bx,
                    top: by,
                    width: w,
                    transform: `rotate(${bRot}deg)`,
                    opacity: refItem.opacity,
                    zIndex: isSel ? 900 : 10 + (refItem.zOrder ?? idx),
                    borderColor: isSel ? 'var(--studio-accent)' : grp ? grp.color : 'rgba(148,163,184,0.35)',
                  }}
                  className={`rounded-lg border-2 shadow-lg bg-[#060911] transition-shadow relative ${
                    boardTool === 'pan'
                      ? 'cursor-grab'
                      : refItem.locked
                      ? 'cursor-pointer'
                      : 'cursor-move'
                  }`}
                >
                  {/* Top Rotate Handle when Selected & Unlocked */}
                  {isSel && !refItem.locked && boardTool === 'select' && (
                    <div
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.currentTarget.setPointerCapture(e.pointerId);
                        const parentRect = e.currentTarget.parentElement?.getBoundingClientRect();
                        dragBoardStateRef.current = {
                          type: 'rotate',
                          refId: refItem.id,
                          startClientX: e.clientX,
                          startClientY: e.clientY,
                          origX: bx,
                          origY: by,
                          origRotation: bRot,
                          centerClientX: parentRect ? parentRect.left + parentRect.width / 2 : e.clientX,
                          centerClientY: parentRect ? parentRect.top + parentRect.height / 2 : e.clientY,
                        };
                      }}
                      title="Arrastra para rotar esta referencia (Shift = 15°)"
                      className="absolute -top-6 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow cursor-grab active:cursor-grabbing z-30"
                    >
                      <RotateCw className="w-3 h-3" />
                    </div>
                  )}

                  <div className="overflow-hidden rounded-[6px]">
                    <img
                      src={refItem.dataUrl}
                      alt={refItem.name}
                      draggable={false}
                      className="w-full h-auto block pointer-events-none select-none"
                      style={{
                        transform: `scale(${refItem.flipX ? -1 : 1}, ${refItem.flipY ? -1 : 1})`,
                      }}
                    />
                    <div className="px-1 py-0.5 bg-black/80 flex items-center justify-between gap-1 text-[8px] font-mono text-slate-200">
                      <span className="truncate flex items-center gap-1">
                        {grp && (
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: grp.color }}
                          />
                        )}
                        {refItem.name}
                      </span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {refItem.useAsAiGuide && <Sparkles className="w-2.5 h-2.5 text-purple-400" />}
                        {refItem.locked && <Lock className="w-2.5 h-2.5 text-amber-400" />}
                      </div>
                    </div>
                  </div>

                  {/* Bottom-right Scale Handle when Selected & Unlocked */}
                  {isSel && !refItem.locked && boardTool === 'select' && (
                    <div
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.currentTarget.setPointerCapture(e.pointerId);
                        dragBoardStateRef.current = {
                          type: 'scale',
                          refId: refItem.id,
                          startClientX: e.clientX,
                          startClientY: e.clientY,
                          origX: bx,
                          origY: by,
                          origScale: refItem.boardScale ?? 1,
                        };
                      }}
                      title="Arrastra para escalar esta referencia"
                      className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 rounded-sm bg-amber-400 border border-slate-950 cursor-nwse-resize z-30 shadow"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Interactive Toggleable Minimap */}
          {showMinimap && visibleBoardRefs.length > 0 && (
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                const relX = (e.clientX - rect.left) / rect.width;
                const relY = (e.clientY - rect.top) / rect.height;
                const targetWorldX = mmMinX + relX * mmW;
                const targetWorldY = mmMinY + relY * mmH;
                setBoardPan({
                  x: surfW / 2 - targetWorldX * boardZoom,
                  y: surfH / 2 - targetWorldY * boardZoom,
                });
              }}
              title="Minimapa de Mesa Infinita (clic para saltar directamente a una referencia)"
              className={`absolute bottom-1.5 right-1.5 z-25 rounded-md border border-slate-600/80 bg-slate-950/90 overflow-hidden cursor-crosshair shadow-xl ${
                isModal ? 'w-44 h-32' : 'w-28 h-20'
              }`}
            >
              {visibleBoardRefs.map((r, idx) => {
                const m = getBoardItemMetrics(r, idx);
                const leftPct = ((m.bx - mmMinX) / mmW) * 100;
                const topPct = ((m.by - mmMinY) / mmH) * 100;
                const wPct = Math.max(4, (m.w / mmW) * 100);
                const hPct = Math.max(4, (m.h / mmH) * 100);
                const isSel = r.id === activeReferenceId;
                return (
                  <div
                    key={`mm-${r.id}`}
                    className="absolute rounded-[1px]"
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: `${wPct}%`,
                      height: `${hPct}%`,
                      backgroundColor: isSel ? 'rgba(251,191,36,0.75)' : 'rgba(56,189,248,0.45)',
                      border: '1px solid rgba(255,255,255,0.35)',
                    }}
                  />
                );
              })}
              {/* Current Viewport Indicator Box */}
              <div
                className="absolute border border-amber-400 bg-amber-400/10 pointer-events-none"
                style={{
                  left: `${((viewWorldX - mmMinX) / mmW) * 100}%`,
                  top: `${((viewWorldY - mmMinY) / mmH) * 100}%`,
                  width: `${Math.max(6, (viewWorldW / mmW) * 100)}%`,
                  height: `${Math.max(6, (viewWorldH / mmH) * 100)}%`,
                }}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderRefRow = (ref: ReferenceItem) => {
    const isSelected = ref.id === activeReferenceId;
    return (
      <div
        key={ref.id}
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          setDragRefId(ref.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragEnd={() => setDragRefId(null)}
        onClick={() => onSelectReference(ref.id)}
        className="p-1.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-colors"
        style={{
          backgroundColor: isSelected
            ? 'color-mix(in srgb, var(--studio-accent) 14%, var(--studio-bg-card))'
            : 'var(--studio-bg-card)',
          borderColor: isSelected ? 'var(--studio-accent)' : 'var(--studio-border)',
        }}
      >
        <GripVertical className="w-3 h-3 shrink-0 opacity-45 cursor-grab" />
        <div
          className="w-9 h-9 rounded border overflow-hidden shrink-0 canvas-checkerboard flex items-center justify-center"
          style={{ borderColor: 'var(--studio-border-strong)' }}
        >
          <img src={ref.dataUrl} alt={ref.name} className="w-full h-full object-contain" />
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold truncate" style={{ color: 'var(--studio-text)' }}>
              {ref.name}
            </span>
          </div>
          <span className="text-[9px] font-mono tabular-nums" style={{ color: 'var(--studio-text-muted)' }}>
            {ref.naturalWidth}×{ref.naturalHeight} · {Math.round(ref.opacity * 100)}% ·{' '}
            {ref.anchor === 'camera' ? 'Cámara' : 'Lienzo'}
          </span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {onBringReferenceToFront && (
            <button
              type="button"
              onClick={() => onBringReferenceToFront(ref.id)}
              title="Traer referencia al frente (superposición)"
              className="p-1 rounded transition-colors hover:opacity-90"
              style={{ color: 'var(--studio-text-muted)' }}
            >
              <ArrowUpToLine className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onUpdateReference(ref.id, { useAsAiGuide: !ref.useAsAiGuide })}
            title="Usar esta referencia como guía visual para los generadores IA"
            className="p-1 rounded transition-colors"
            style={{
              color: ref.useAsAiGuide ? '#a855f7' : 'var(--studio-text-muted)',
              backgroundColor: ref.useAsAiGuide ? 'rgba(168, 85, 247, 0.16)' : 'transparent',
            }}
          >
            <Sparkles className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onUpdateReference(ref.id, { visible: !ref.visible })}
            title={ref.visible ? 'Ocultar referencia' : 'Mostrar referencia'}
            className="p-1 rounded"
            style={{ color: ref.visible ? '#10b981' : 'var(--studio-text-muted)' }}
          >
            {ref.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 opacity-45" />}
          </button>
          <button
            type="button"
            onClick={() => onUpdateReference(ref.id, { locked: !ref.locked })}
            title={ref.locked ? 'Bloqueada (no editable por defecto). Clic para desbloquear y mover' : 'Desbloqueada (arrastrable en mesa y lienzo)'}
            className="p-1 rounded"
            style={{ color: ref.locked ? 'var(--studio-accent)' : 'var(--studio-text-muted)' }}
          >
            {ref.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          </button>
          <button
            type="button"
            onClick={() => onDeleteReference(ref.id)}
            title="Eliminar referencia"
            className="p-1 rounded text-rose-400/75 hover:text-rose-400"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  const unassignedRefs = references.filter(
    (r) => !r.groupId || !referenceGroups.some((g) => g.id === r.groupId)
  );

  return (
    <div
      className="flex flex-col gap-2.5 text-xs"
      onDragOver={handlePanelDragOver}
      onDragLeave={handlePanelDragLeave}
      onDrop={(e) => handlePanelDrop(e, null)}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onAddReferencesFromFiles(e.target.files, null);
            e.target.value = '';
          }
        }}
      />

      {/* PureRef Mode & Quick Camera Workspace Bar */}
      <div
        className="p-1.5 rounded-lg border flex flex-col gap-1.5"
        style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: pureRefConfig.enabled ? 'var(--studio-accent)' : 'var(--studio-border)' }}
      >
        <div className="flex items-center justify-between gap-1 flex-wrap">
          {onChangePureRefConfig && (
            <button
              type="button"
              onClick={() =>
                onChangePureRefConfig({
                  ...pureRefConfig,
                  enabled: !pureRefConfig.enabled,
                })
              }
              title="Activa Modo PureRef: bloquea trazos accidentales sobre el lienzo y permite organizar, escalar, rotar y superponer referencias libremente"
              className="px-2 py-1 rounded border text-[10px] font-bold flex items-center gap-1 transition-colors"
              style={{
                backgroundColor: pureRefConfig.enabled ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                color: pureRefConfig.enabled ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                borderColor: pureRefConfig.enabled ? 'var(--studio-accent)' : 'var(--studio-border-strong)',
              }}
            >
              <Camera className="w-3 h-3" />
              <span>{pureRefConfig.enabled ? 'PureRef ACTIVO' : 'Modo PureRef'}</span>
            </button>
          )}

          <div className="flex items-center gap-1">
            {onChangePureRefConfig && (
              <button
                type="button"
                onClick={() =>
                  onChangePureRefConfig({
                    ...pureRefConfig,
                    alwaysOnTop: !pureRefConfig.alwaysOnTop,
                  })
                }
                title="Siempre visible: mantiene las referencias de cámara por encima de guías y HUD del lienzo"
                className="px-1.5 py-1 rounded border text-[9px] font-semibold flex items-center gap-1"
                style={{
                  backgroundColor: pureRefConfig.alwaysOnTop ? 'color-mix(in srgb, var(--studio-accent) 18%, var(--studio-bg-elevated))' : 'var(--studio-bg-elevated)',
                  color: pureRefConfig.alwaysOnTop ? 'var(--studio-accent)' : 'var(--studio-text-muted)',
                  borderColor: pureRefConfig.alwaysOnTop ? 'var(--studio-accent)' : 'var(--studio-border)',
                }}
              >
                <Pin className="w-2.5 h-2.5" />
                <span>Fija</span>
              </button>
            )}

            {onActivateMoveReferenceTool && (
              <button
                type="button"
                onClick={onActivateMoveReferenceTool}
                title="Activar subherramienta Mover Referencia (Shift+R): mueve solo referencias sin afectar capas"
                className="px-1.5 py-1 rounded border text-[9px] font-semibold flex items-center gap-1 hover:opacity-90"
                style={{
                  backgroundColor: 'var(--studio-bg-elevated)',
                  color: 'var(--studio-text)',
                  borderColor: 'var(--studio-border)',
                }}
              >
                <Move className="w-2.5 h-2.5" />
                <span>Mover Ref</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                fitAllBoardRefs();
                onCenterAllReferences?.();
              }}
              title="Centrar todas las referencias en pantalla"
              className="px-1.5 py-1 rounded border text-[9px] font-semibold flex items-center gap-1 hover:opacity-90"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                color: 'var(--studio-accent)',
                borderColor: 'var(--studio-border)',
              }}
            >
              <Focus className="w-2.5 h-2.5" />
              <span>Centrar</span>
            </button>
          </div>
        </div>

        {pureRefConfig.enabled && onChangePureRefConfig && (
          <div className="flex items-center gap-1.5 pt-1 border-t" style={{ borderColor: 'var(--studio-border)' }}>
            <div className="flex-1 min-w-0">
              <StudioSlider
                variant="compact"
                label="Opac"
                value={Math.round(pureRefConfig.globalOpacity * 100)}
                min={15}
                max={100}
                step={1}
                defaultValue={100}
                unit="%"
                onChange={(v) => onChangePureRefConfig({ ...pureRefConfig, globalOpacity: v / 100 })}
              />
            </div>
            {[0.35, 0.7, 1].map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => onChangePureRefConfig({ ...pureRefConfig, globalOpacity: op })}
                className="px-1 py-0.5 rounded border text-[8px] font-mono tabular-nums"
                style={{
                  backgroundColor:
                    Math.abs(pureRefConfig.globalOpacity - op) < 0.04
                      ? 'var(--studio-accent)'
                      : 'var(--studio-bg-elevated)',
                  color:
                    Math.abs(pureRefConfig.globalOpacity - op) < 0.04
                      ? 'var(--studio-accent-text)'
                      : 'var(--studio-text-muted)',
                  borderColor: 'var(--studio-border)',
                }}
              >
                {Math.round(op * 100)}%
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sub-Tabs inside Referencias: Mesa | Lista | Grupos | Refs IA | Dummie */}
      <div
        className="grid grid-cols-5 gap-0.5 p-0.5 rounded-lg border"
        style={{ backgroundColor: 'var(--studio-bg-bar)', borderColor: 'var(--studio-border)' }}
      >
        {(
          [
            ['board', 'Mesa'],
            ['images', 'Lista'],
            ['groups', 'Grupos'],
            ['ai_refs', 'Refs IA'],
            ['dummie', 'Dummie'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubTab(id)}
            className="py-1 px-0.5 rounded text-[10px] font-bold transition-colors truncate"
            style={{
              backgroundColor: subTab === id ? 'var(--studio-accent)' : 'transparent',
              color: subTab === id ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === 'dummie' && dummiePose && onChangeDummiePose ? (
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
      ) : subTab === 'ai_refs' ? (
        <div className="flex flex-col gap-2">
          <p className="text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>
            Referencias marcadas como guía visual para IA ({aiGuideCount}). Activa el ícono ✨ en cualquier imagen.
          </p>
          {references.filter((r) => r.useAsAiGuide).length === 0 ? (
            <div className="p-4 rounded-lg border text-center text-[11px]" style={{ borderColor: 'var(--studio-border)', color: 'var(--studio-text-muted)' }}>
              Aún no hay imágenes marcadas como Guía IA.
            </div>
          ) : (
            references.filter((r) => r.useAsAiGuide).map((ref) => renderRefRow(ref))
          )}
        </div>
      ) : (
        <>
          {subTab === 'board' && renderRefBoard(false)}

          {subTab !== 'board' && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center gap-1 text-center"
              style={{
                backgroundColor: isDraggingOsFiles
                  ? 'color-mix(in srgb, var(--studio-accent) 18%, var(--studio-bg-card))'
                  : 'var(--studio-bg-card)',
                borderColor: isDraggingOsFiles ? 'var(--studio-accent)' : 'var(--studio-border-strong)',
              }}
            >
              <div className="flex items-center gap-1.5 font-semibold" style={{ color: 'var(--studio-text)' }}>
                <ImagePlus className="w-4 h-4" style={{ color: 'var(--studio-accent)' }} />
                <span>Importar o Arrastrar Referencias</span>
              </div>
              <span className="text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>
                PNG, JPG, WEBP o GIF directo desde tu explorador
              </span>
            </div>
          )}

          {/* Top Action Bar */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--studio-text-muted)' }}>
              {references.length} Refs · {aiGuideCount} Guía IA
            </span>
            <button
              type="button"
              onClick={() => setShowNewGroup((v) => !v)}
              className="px-2 py-1 rounded-lg border text-[10px] font-semibold flex items-center gap-1"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            >
              <FolderPlus className="w-3 h-3" style={{ color: 'var(--studio-accent)' }} />
              <span>+ Grupo Refs</span>
            </button>
          </div>

          {showNewGroup && (
            <div
              className="p-2 rounded-xl border flex flex-col gap-2"
              style={{
                backgroundColor: 'var(--studio-bg-card)',
                borderColor: 'var(--studio-accent)',
              }}
            >
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Nombre del grupo (ej. Poses KOF)"
                className="w-full px-2 py-1 rounded border text-xs focus:outline-none"
                style={{
                  backgroundColor: 'var(--studio-bg-elevated)',
                  borderColor: 'var(--studio-border-strong)',
                  color: 'var(--studio-text)',
                }}
              />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  {GROUP_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setNewGroupColor(col)}
                      className="w-4 h-4 rounded-full border"
                      style={{
                        backgroundColor: col,
                        borderColor: newGroupColor === col ? '#ffffff' : 'transparent',
                      }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowNewGroup(false)}
                    className="px-2 py-0.5 text-[10px]"
                    style={{ color: 'var(--studio-text-muted)' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (newGroupName.trim()) {
                        onCreateGroup(newGroupName.trim(), newGroupColor);
                        setNewGroupName('');
                        setShowNewGroup(false);
                      }
                    }}
                    className="px-2.5 py-0.5 rounded font-bold text-[10px]"
                    style={{
                      backgroundColor: 'var(--studio-accent)',
                      color: 'var(--studio-accent-text)',
                    }}
                  >
                    Crear
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Groups + References Tree */}
          {(subTab === 'images' || subTab === 'groups') && (
            <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-0.5">
              {referenceGroups.map((group) => {
                const groupRefs = references.filter((r) => r.groupId === group.id);
                return (
                  <div
                    key={group.id}
                    draggable
                    onDragStart={() => setDragGroupId(group.id)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        onAddReferencesFromFiles(e.dataTransfer.files, group.id);
                        return;
                      }
                      if (dragRefId) {
                        onUpdateReference(dragRefId, { groupId: group.id });
                        setDragRefId(null);
                        return;
                      }
                      if (dragGroupId && dragGroupId !== group.id) {
                        onReorderGroup(dragGroupId, group.id);
                        setDragGroupId(null);
                      }
                    }}
                    className="rounded-xl border overflow-hidden"
                    style={{
                      backgroundColor: 'var(--studio-bg-card)',
                      borderColor: `${group.color}55`,
                    }}
                  >
                    <div
                      className="px-2 py-1.5 flex items-center justify-between gap-1.5 cursor-pointer"
                      style={{ backgroundColor: `${group.color}18` }}
                      onClick={() => onUpdateGroup(group.id, { collapsed: !group.collapsed })}
                    >
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {group.collapsed ? <ChevronRight className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
                        {group.collapsed ? (
                          <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: group.color }} />
                        ) : (
                          <FolderOpen className="w-3.5 h-3.5 shrink-0" style={{ color: group.color }} />
                        )}
                        {renamingGroupId === group.id ? (
                          <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={renameDraft}
                              onChange={(e) => setRenameDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && renameDraft.trim()) {
                                  onUpdateGroup(group.id, { name: renameDraft.trim() });
                                  setRenamingGroupId(null);
                                }
                              }}
                              className="w-full px-1.5 py-0.5 rounded border text-[11px]"
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
                                if (renameDraft.trim()) {
                                  onUpdateGroup(group.id, { name: renameDraft.trim() });
                                }
                                setRenamingGroupId(null);
                              }}
                              className="p-0.5 text-emerald-400"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="font-bold text-[11px] truncate" style={{ color: 'var(--studio-text)' }}>
                            {group.name} ({groupRefs.length})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="color"
                          value={group.color}
                          onChange={(e) => onUpdateGroup(group.id, { color: e.target.value })}
                          title="Color del grupo"
                          className="w-4 h-4 rounded border-0 bg-transparent cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingGroupId(group.id);
                            setRenameDraft(group.name);
                          }}
                          title="Renombrar grupo"
                          className="p-0.5 opacity-70 hover:opacity-100"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateGroup(group.id, { visible: !group.visible })}
                          title="Activar / Desactivar grupo completo"
                          className="p-0.5"
                          style={{ color: group.visible ? '#10b981' : 'var(--studio-text-muted)' }}
                        >
                          {group.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 opacity-45" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteGroup(group.id)}
                          title="Eliminar grupo (las referencias pasan a raíz)"
                          className="p-0.5 text-rose-400/75 hover:text-rose-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {!group.collapsed && (
                      <div className="p-1.5 flex flex-col gap-1">
                        {groupRefs.length === 0 ? (
                          <span className="text-[10px] px-1 py-1 italic" style={{ color: 'var(--studio-text-muted)' }}>
                            Arrastra una referencia aquí
                          </span>
                        ) : (
                          groupRefs.map(renderRefRow)
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {unassignedRefs.length > 0 && (
                <div className="flex flex-col gap-1">
                  {unassignedRefs.map(renderRefRow)}
                </div>
              )}

              {references.length === 0 && (
                <div className="text-center py-4 text-[11px]" style={{ color: 'var(--studio-text-muted)' }}>
                  Sin referencias cargadas. Importa hojas de modelo, poses o escenarios de guía.
                </div>
              )}
            </div>
          )}

          {/* Selected Reference Inspector */}
          {activeRef && (
            <div
              className="p-2.5 rounded-xl border flex flex-col gap-2"
              style={{
                backgroundColor: 'var(--studio-bg-card)',
                borderColor: 'var(--studio-border-strong)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-[11px] truncate" style={{ color: 'var(--studio-accent)' }}>
                  {activeRef.name}
                </span>
                <div className="flex items-center gap-1.5">
                  {onGenerateDummieFromReference && (
                    <button
                      type="button"
                      onClick={() => onGenerateDummieFromReference(activeRef)}
                      title="Extraer pose de silueta al Dummie 2.5D"
                      className="px-1.5 py-0.5 rounded border text-[9px] font-bold flex items-center gap-1 hover:opacity-90"
                      style={{
                        borderColor: 'var(--studio-accent)',
                        color: 'var(--studio-accent)',
                      }}
                    >
                      <UserCheck className="w-3 h-3" />
                      <span>Pose Dummie</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateReference(activeRef.id, {
                        scale: 1,
                        rotation: 0,
                        flipX: false,
                        flipY: false,
                        x: 0,
                        y: 0,
                        boardScale: 1,
                        boardRotation: 0,
                      })
                    }
                    title="Restablecer transformación"
                    className="text-[10px] flex items-center gap-1 hover:opacity-80"
                    style={{ color: 'var(--studio-text-muted)' }}
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Opacity & Blend Mode */}
              <div className="grid grid-cols-2 gap-2">
                <StudioSlider
                  variant="panel"
                  label="Opacidad"
                  value={Math.round(activeRef.opacity * 100)}
                  min={5}
                  max={100}
                  step={1}
                  defaultValue={100}
                  unit="%"
                  onChange={(v) => onUpdateReference(activeRef.id, { opacity: v / 100 })}
                />

                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-mono" style={{ color: 'var(--studio-text-muted)' }}>
                    Modo Mezcla
                  </span>
                  <select
                    value={activeRef.blendMode}
                    onChange={(e) =>
                      onUpdateReference(activeRef.id, { blendMode: e.target.value as ReferenceBlendMode })
                    }
                    className="px-1.5 py-0.5 rounded border text-[10px] font-mono"
                    style={{
                      backgroundColor: 'var(--studio-bg-elevated)',
                      borderColor: 'var(--studio-border-strong)',
                      color: 'var(--studio-text)',
                    }}
                  >
                    {BLEND_MODES.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Scale & Rotation (both Canvas & Board when on Mesa) */}
              <div className="grid grid-cols-2 gap-2">
                <StudioSlider
                  variant="panel"
                  label={subTab === 'board' ? 'Escala Mesa' : 'Escala Lienzo'}
                  value={subTab === 'board' ? (activeRef.boardScale ?? 1) : activeRef.scale}
                  min={0.2}
                  max={3}
                  step={0.01}
                  defaultValue={1}
                  formatValue={(v) => `${v.toFixed(2)}x`}
                  onChange={(val) =>
                    onUpdateReference(
                      activeRef.id,
                      subTab === 'board' ? { boardScale: val } : { scale: val }
                    )
                  }
                />

                <StudioSlider
                  variant="panel"
                  label={subTab === 'board' ? 'Rotación Mesa' : 'Rotación'}
                  value={subTab === 'board' ? (activeRef.boardRotation ?? 0) : activeRef.rotation}
                  min={-180}
                  max={180}
                  step={1}
                  defaultValue={0}
                  unit="°"
                  onChange={(val) =>
                    onUpdateReference(
                      activeRef.id,
                      subTab === 'board' ? { boardRotation: val } : { rotation: val }
                    )
                  }
                />
              </div>

              {/* Flip H / V & Anchor */}
              <div className="grid grid-cols-2 gap-1.5">
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => onUpdateReference(activeRef.id, { flipX: !activeRef.flipX })}
                    className="py-1 px-1.5 rounded border text-[10px] flex items-center justify-center gap-1 font-semibold"
                    style={{
                      backgroundColor: activeRef.flipX ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                      color: activeRef.flipX ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                      borderColor: 'var(--studio-border-strong)',
                    }}
                  >
                    <FlipHorizontal className="w-3 h-3" />
                    <span>Voltear H</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateReference(activeRef.id, { flipY: !activeRef.flipY })}
                    className="py-1 px-1.5 rounded border text-[10px] flex items-center justify-center gap-1 font-semibold"
                    style={{
                      backgroundColor: activeRef.flipY ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                      color: activeRef.flipY ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                      borderColor: 'var(--studio-border-strong)',
                    }}
                  >
                    <FlipVertical className="w-3 h-3" />
                    <span>Voltear V</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1">
                  {(['canvas', 'camera'] as ReferenceAnchorMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => onUpdateReference(activeRef.id, { anchor: mode })}
                      className="py-1 px-1.5 rounded border text-[10px] flex items-center justify-center gap-1 font-semibold"
                      style={{
                        backgroundColor:
                          activeRef.anchor === mode ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                        color:
                          activeRef.anchor === mode ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                        borderColor: 'var(--studio-border-strong)',
                      }}
                    >
                      {mode === 'canvas' ? <Anchor className="w-3 h-3" /> : <Camera className="w-3 h-3" />}
                      <span>{mode === 'canvas' ? 'Lienzo' : 'Cámara'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Lock & Use As AI Guide */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onUpdateReference(activeRef.id, { locked: !activeRef.locked })}
                  className="py-1.5 px-2 rounded-lg border text-[10px] font-semibold flex items-center justify-center gap-1"
                  style={{
                    backgroundColor: activeRef.locked ? 'var(--studio-bg-elevated)' : 'rgba(16,185,129,0.16)',
                    borderColor: activeRef.locked ? 'var(--studio-border-strong)' : '#10b981',
                    color: activeRef.locked ? 'var(--studio-text)' : '#34d399',
                  }}
                >
                  {activeRef.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  <span>{activeRef.locked ? 'Bloqueada (Fija)' : 'Libre (Mover)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateReference(activeRef.id, { useAsAiGuide: !activeRef.useAsAiGuide })}
                  className="py-1.5 px-2 rounded-lg border text-[10px] font-bold flex items-center justify-center gap-1"
                  style={{
                    backgroundColor: activeRef.useAsAiGuide
                      ? 'rgba(168, 85, 247, 0.22)'
                      : 'var(--studio-bg-elevated)',
                    borderColor: activeRef.useAsAiGuide ? '#a855f7' : 'var(--studio-border-strong)',
                    color: activeRef.useAsAiGuide ? '#d8b4fe' : 'var(--studio-text-muted)',
                  }}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Usar como guía IA</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Expanded Full-Screen Reference Board Modal */}
      {boardExpanded && (
        <div
          className="fixed inset-6 z-[10020] rounded-2xl border shadow-2xl overflow-hidden flex flex-col"
          style={{
            backgroundColor: 'var(--studio-bg-panel)',
            borderColor: 'var(--studio-accent)',
          }}
        >
          {renderRefBoard(true)}
        </div>
      )}
    </div>
  );
};
