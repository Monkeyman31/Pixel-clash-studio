import React, { useMemo, useRef, useState } from 'react';
import { Check, Grid, Minus, Plus, RotateCcw, X } from 'lucide-react';
import { CanvasEditAnchor, CanvasEditConfig, CanvasEditRect } from '../types';

export interface CanvasEditOverlayProps {
  origWidth: number;
  origHeight: number;
  zoom: number;
  rect: CanvasEditRect;
  config: CanvasEditConfig;
  hasOffCanvasContent?: boolean;
  onChangeRect: (next: CanvasEditRect) => void;
  onApply: () => void;
  onReset: () => void;
  onCancel: () => void;
}

type HandleKind = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move';

interface SubRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Computes exact non-overlapping sub-rectangles of A \ B (area in A outside B).
 */
function subtractRect(a: SubRect, b: SubRect): SubRect[] {
  const ax1 = a.x;
  const ay1 = a.y;
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;

  const bx1 = b.x;
  const by1 = b.y;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;

  const ix1 = Math.max(ax1, bx1);
  const iy1 = Math.max(ay1, by1);
  const ix2 = Math.min(ax2, bx2);
  const iy2 = Math.min(ay2, by2);

  if (ix2 <= ix1 || iy2 <= iy1) {
    return a.w > 0 && a.h > 0 ? [a] : [];
  }

  const parts: SubRect[] = [];
  // Top strip
  if (iy1 > ay1) {
    parts.push({ x: ax1, y: ay1, w: ax2 - ax1, h: iy1 - ay1 });
  }
  // Bottom strip
  if (ay2 > iy2) {
    parts.push({ x: ax1, y: iy2, w: ax2 - ax1, h: ay2 - iy2 });
  }
  // Left strip (between iy1 and iy2)
  if (ix1 > ax1) {
    parts.push({ x: ax1, y: iy1, w: ix1 - ax1, h: iy2 - iy1 });
  }
  // Right strip (between iy1 and iy2)
  if (ax2 > ix2) {
    parts.push({ x: ix2, y: iy1, w: ax2 - ix2, h: iy2 - iy1 });
  }
  return parts.filter((r) => r.w > 0 && r.h > 0);
}

function getAnchorPoint(origW: number, origH: number, anchor: CanvasEditAnchor): { x: number; y: number } {
  let x = origW / 2;
  let y = origH / 2;
  if (anchor === 'left' || anchor === 'top-left' || anchor === 'bottom-left') x = 0;
  else if (anchor === 'right' || anchor === 'top-right' || anchor === 'bottom-right') x = origW;

  if (anchor === 'top' || anchor === 'top-left' || anchor === 'top-right') y = 0;
  else if (anchor === 'bottom' || anchor === 'bottom-left' || anchor === 'bottom-right') y = origH;
  return { x, y };
}

function snapCoord(value: number, step: number): number {
  if (step <= 1) return Math.round(value);
  return Math.round(value / step) * step;
}

const ADDED_PATTERN_BG =
  'repeating-linear-gradient(135deg, rgba(16,185,129,0.22) 0px, rgba(16,185,129,0.22) 6px, rgba(6,78,59,0.14) 6px, rgba(6,78,59,0.14) 12px)';
const REMOVED_CROP_BG =
  'repeating-linear-gradient(45deg, rgba(244,63,94,0.34) 0px, rgba(244,63,94,0.34) 6px, rgba(15,23,42,0.42) 6px, rgba(15,23,42,0.42) 12px)';
const REMOVED_KEEP_BG =
  'repeating-linear-gradient(45deg, rgba(245,158,11,0.26) 0px, rgba(245,158,11,0.26) 6px, rgba(15,23,42,0.32) 6px, rgba(15,23,42,0.32) 12px)';
const REMOVED_AUTO_BG =
  'repeating-linear-gradient(45deg, rgba(56,189,248,0.22) 0px, rgba(56,189,248,0.22) 6px, rgba(15,23,42,0.24) 6px, rgba(15,23,42,0.24) 12px)';

export const CanvasEditOverlay: React.FC<CanvasEditOverlayProps> = ({
  origWidth,
  origHeight,
  zoom,
  rect,
  config,
  hasOffCanvasContent = false,
  onChangeRect,
  onApply,
  onReset,
  onCancel,
}) => {
  const [activeHandle, setActiveHandle] = useState<HandleKind | null>(null);
  const dragRef = useRef<{
    handle: HandleKind;
    startClientX: number;
    startClientY: number;
    startRect: CanvasEditRect;
    aspectRatio: number;
  } | null>(null);

  const safeZoom = Math.max(0.05, zoom);
  const cellW = Math.max(1, Math.round(config.cellWidth || 32));
  const cellH = Math.max(1, Math.round(config.cellHeight || 32));

  const origSub: SubRect = useMemo(
    () => ({ x: 0, y: 0, w: origWidth, h: origHeight }),
    [origWidth, origHeight]
  );

  const newSub: SubRect = useMemo(
    () => ({ x: rect.left, y: rect.top, w: rect.width, h: rect.height }),
    [rect.left, rect.top, rect.width, rect.height]
  );

  // Added area (new \ orig) & Removed area (orig \ new)
  const addedRegions = useMemo(() => subtractRect(newSub, origSub), [newSub, origSub]);
  const removedRegions = useMemo(() => subtractRect(origSub, newSub), [origSub, newSub]);

  const addedAreaPx = useMemo(
    () => addedRegions.reduce((acc, r) => acc + r.w * r.h, 0),
    [addedRegions]
  );
  const removedAreaPx = useMemo(
    () => removedRegions.reduce((acc, r) => acc + r.w * r.h, 0),
    [removedRegions]
  );

  const isModified =
    rect.left !== 0 || rect.top !== 0 || rect.width !== origWidth || rect.height !== origHeight;

  const deltaW = rect.width - origWidth;
  const deltaH = rect.height - origHeight;

  const anchorPt = useMemo(
    () => getAnchorPoint(origWidth, origHeight, config.anchor),
    [origWidth, origHeight, config.anchor]
  );

  // Effective snapping step in X and Y
  const getSnapStepX = (altBypass: boolean) => {
    if (altBypass) return 1;
    if (config.spritesheetMode) return cellW;
    if (config.snapToGrid) return Math.max(1, Math.round(config.snapGridStep || 8));
    return config.snapToPixels ? 1 : 1;
  };
  const getSnapStepY = (altBypass: boolean) => {
    if (altBypass) return 1;
    if (config.spritesheetMode) return cellH;
    if (config.snapToGrid) return Math.max(1, Math.round(config.snapGridStep || 8));
    return config.snapToPixels ? 1 : 1;
  };

  const handlePointerDown = (e: React.PointerEvent, handle: HandleKind) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setActiveHandle(handle);
    dragRef.current = {
      handle,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startRect: { ...rect },
      aspectRatio: rect.width / Math.max(1, rect.height),
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    e.stopPropagation();

    const rawDx = (e.clientX - drag.startClientX) / safeZoom;
    const rawDy = (e.clientY - drag.startClientY) / safeZoom;

    const symmetric = config.symmetricGrowth || e.altKey;
    const lockAspect = config.lockAspectRatio || e.shiftKey;
    const stepX = getSnapStepX(false);
    const stepY = getSnapStepY(false);

    const s = drag.startRect;
    let left = s.left;
    let top = s.top;
    let right = s.left + s.width;
    let bottom = s.top + s.height;

    if (drag.handle === 'move') {
      const nextLeft = snapCoord(s.left + rawDx, stepX);
      const nextTop = snapCoord(s.top + rawDy, stepY);
      onChangeRect({
        left: nextLeft,
        top: nextTop,
        width: s.width,
        height: s.height,
      });
      return;
    }

    const dx = snapCoord(rawDx, stepX);
    const dy = snapCoord(rawDy, stepY);

    const hasW = drag.handle.includes('w');
    const hasE = drag.handle.includes('e');
    const hasN = drag.handle.includes('n');
    const hasS = drag.handle.includes('s');

    if (hasW) {
      left = Math.min(right - 1, s.left + dx);
      if (symmetric) {
        const applied = left - s.left;
        right = Math.max(left + 1, s.left + s.width - applied);
      }
    }
    if (hasE) {
      right = Math.max(left + 1, s.left + s.width + dx);
      if (symmetric) {
        const applied = right - (s.left + s.width);
        left = Math.min(right - 1, s.left - applied);
      }
    }
    if (hasN) {
      top = Math.min(bottom - 1, s.top + dy);
      if (symmetric) {
        const applied = top - s.top;
        bottom = Math.max(top + 1, s.top + s.height - applied);
      }
    }
    if (hasS) {
      bottom = Math.max(top + 1, s.top + s.height + dy);
      if (symmetric) {
        const applied = bottom - (s.top + s.height);
        top = Math.min(bottom - 1, s.top - applied);
      }
    }

    // Enforce locked aspect ratio cleanly
    if (lockAspect) {
      const ratio = drag.aspectRatio;
      let w = Math.max(1, right - left);
      let h = Math.max(1, bottom - top);
      const isCorner = (hasW || hasE) && (hasN || hasS);

      if (isCorner) {
        if (Math.abs(rawDx) >= Math.abs(rawDy)) {
          h = Math.max(1, Math.round(w / ratio));
          if (symmetric) {
            const cy = s.top + s.height / 2;
            top = Math.round(cy - h / 2);
            bottom = top + h;
          } else if (hasN) {
            top = bottom - h;
          } else {
            bottom = top + h;
          }
        } else {
          w = Math.max(1, Math.round(h * ratio));
          if (symmetric) {
            const cx = s.left + s.width / 2;
            left = Math.round(cx - w / 2);
            right = left + w;
          } else if (hasW) {
            left = right - w;
          } else {
            right = left + w;
          }
        }
      } else if (hasW || hasE) {
        h = Math.max(1, Math.round(w / ratio));
        const cy = s.top + s.height / 2;
        top = Math.round(cy - h / 2);
        bottom = top + h;
      } else if (hasN || hasS) {
        w = Math.max(1, Math.round(h * ratio));
        const cx = s.left + s.width / 2;
        left = Math.round(cx - w / 2);
        right = left + w;
      }
    }

    const finalW = Math.max(1, Math.round(right - left));
    const finalH = Math.max(1, Math.round(bottom - top));
    onChangeRect({
      left: Math.round(left),
      top: Math.round(top),
      width: finalW,
      height: finalH,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore if already released
    }
    dragRef.current = null;
    setActiveHandle(null);
  };

  // Spritesheet grid lines (capped safely for ultra-huge sheets)
  const spritesheetLines = useMemo(() => {
    if (!config.spritesheetMode) return { vLines: [] as number[], hLines: [] as number[], cols: 0, rows: 0 };
    const cols = Math.max(1, Math.ceil(rect.width / cellW));
    const rows = Math.max(1, Math.ceil(rect.height / cellH));
    const vLines: number[] = [];
    const hLines: number[] = [];
    if (cols <= 180) {
      for (let c = 1; c < cols; c++) {
        vLines.push(c * cellW);
      }
    }
    if (rows <= 180) {
      for (let r = 1; r < rows; r++) {
        hLines.push(r * cellH);
      }
    }
    return { vLines, hLines, cols, rows };
  }, [config.spritesheetMode, rect.width, rect.height, cellW, cellH]);

  // Quick Spritesheet row/column expand/shrink right on canvas
  const stepSpritesheetCols = (deltaCols: number) => {
    const nextW = Math.max(cellW, Math.round((Math.round(rect.width / cellW) + deltaCols) * cellW));
    onChangeRect({ ...rect, width: nextW });
  };
  const stepSpritesheetRows = (deltaRows: number) => {
    const nextH = Math.max(cellH, Math.round((Math.round(rect.height / cellH) + deltaRows) * cellH));
    onChangeRect({ ...rect, height: nextH });
  };

  const frameLeftPx = rect.left * safeZoom;
  const frameTopPx = rect.top * safeZoom;
  const frameWidthPx = Math.max(1, rect.width * safeZoom);
  const frameHeightPx = Math.max(1, rect.height * safeZoom);

  const removedBg =
    config.overflowMode === 'crop'
      ? REMOVED_CROP_BG
      : config.overflowMode === 'keep'
      ? REMOVED_KEEP_BG
      : REMOVED_AUTO_BG;

  const removedBorderColor =
    config.overflowMode === 'crop'
      ? 'rgba(244, 63, 94, 0.85)'
      : config.overflowMode === 'keep'
      ? 'rgba(245, 158, 11, 0.8)'
      : 'rgba(56, 189, 248, 0.75)';

  return (
    <div
      className="absolute left-0 top-0 pointer-events-none select-none z-[42]"
      style={{ width: 0, height: 0, overflow: 'visible' }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* 1. Original Canvas Dashed Reference Outline */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: 0,
          top: 0,
          width: Math.max(1, origWidth * safeZoom),
          height: Math.max(1, origHeight * safeZoom),
          border: '1px dashed rgba(226, 232, 240, 0.65)',
          boxShadow: 'inset 0 0 0 1px rgba(15, 23, 42, 0.55)',
        }}
      >
        {isModified && (
          <div
            className="absolute -top-5 left-0 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold whitespace-nowrap bg-slate-900/90 text-slate-300 border border-slate-600/70 shadow"
          >
            Original {origWidth}×{origHeight}
          </div>
        )}
      </div>

      {/* 2. Added / Expanded Area Previews (outside original canvas) */}
      {addedRegions.map((r, idx) => (
        <div
          key={`add-${idx}`}
          className="absolute pointer-events-none"
          style={{
            left: r.x * safeZoom,
            top: r.y * safeZoom,
            width: Math.max(1, r.w * safeZoom),
            height: Math.max(1, r.h * safeZoom),
            backgroundColor: 'rgba(15, 23, 42, 0.62)',
            backgroundImage: ADDED_PATTERN_BG,
            boxShadow: 'inset 0 0 0 1px rgba(16, 185, 129, 0.7)',
          }}
        >
          {r.w * safeZoom >= 42 && r.h * safeZoom >= 22 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-400/60 text-[9px] font-mono font-bold text-emerald-300 tabular-nums shadow">
                +{r.w}×{r.h}
              </span>
            </div>
          )}
        </div>
      ))}

      {/* 3. Removed / Cropped Area Previews (inside original canvas, outside proposed rect) */}
      {removedRegions.map((r, idx) => (
        <div
          key={`rem-${idx}`}
          className="absolute pointer-events-none"
          style={{
            left: r.x * safeZoom,
            top: r.y * safeZoom,
            width: Math.max(1, r.w * safeZoom),
            height: Math.max(1, r.h * safeZoom),
            backgroundImage: removedBg,
            boxShadow: `inset 0 0 0 1px ${removedBorderColor}`,
          }}
        >
          {r.w * safeZoom >= 46 && r.h * safeZoom >= 22 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tabular-nums shadow border ${
                  config.overflowMode === 'crop'
                    ? 'bg-rose-950/92 border-rose-400/70 text-rose-200'
                    : config.overflowMode === 'keep'
                    ? 'bg-amber-950/92 border-amber-400/70 text-amber-200'
                    : 'bg-sky-950/92 border-sky-400/70 text-sky-200'
                }`}
              >
                {config.overflowMode === 'crop'
                  ? `Recortar ${r.w}×${r.h}`
                  : config.overflowMode === 'keep'
                  ? `Ocultar ${r.w}×${r.h}`
                  : `Auto-proteger`}
              </span>
            </div>
          )}
        </div>
      ))}

      {/* 4. Proposed New Canvas Interactive Frame */}
      <div
        className="absolute pointer-events-auto"
        style={{
          left: frameLeftPx,
          top: frameTopPx,
          width: frameWidthPx,
          height: frameHeightPx,
          border: '2px solid #FACC15',
          boxShadow: '0 0 0 1px rgba(15, 23, 42, 0.92), 0 0 22px rgba(250, 204, 21, 0.16)',
          cursor: activeHandle === 'move' ? 'grabbing' : 'grab',
        }}
        onPointerDown={(e) => handlePointerDown(e, 'move')}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onApply();
        }}
        title="Arrastra el marco para reposicionar el área del lienzo · Doble clic o Enter para aplicar"
      >
        {/* Rule of thirds / composition center hairlines while dragging */}
        {activeHandle && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/3 top-0 bottom-0 w-px bg-yellow-300/25" />
            <div className="absolute left-2/3 top-0 bottom-0 w-px bg-yellow-300/25" />
            <div className="absolute top-1/3 left-0 right-0 h-px bg-yellow-300/25" />
            <div className="absolute top-2/3 left-0 right-0 h-px bg-yellow-300/25" />
          </div>
        )}

        {/* Spritesheet Mode Cell Division Grid */}
        {config.spritesheetMode && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {spritesheetLines.vLines.map((vx) => (
              <div
                key={`ss-v-${vx}`}
                className="absolute top-0 bottom-0"
                style={{
                  left: vx * safeZoom,
                  width: 1,
                  borderLeft: '1px dashed rgba(167, 139, 250, 0.75)',
                }}
              />
            ))}
            {spritesheetLines.hLines.map((hy) => (
              <div
                key={`ss-h-${hy}`}
                className="absolute left-0 right-0"
                style={{
                  top: hy * safeZoom,
                  height: 1,
                  borderTop: '1px dashed rgba(167, 139, 250, 0.75)',
                }}
              />
            ))}
            {/* Spritesheet grid badge inside top-left corner */}
            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-violet-950/90 border border-violet-400/70 text-[9px] font-mono font-bold text-violet-200 flex items-center gap-1 shadow whitespace-nowrap">
              <Grid className="w-2.5 h-2.5 text-violet-300" />
              <span>
                {spritesheetLines.cols}×{spritesheetLines.rows} celdas ({cellW}×{cellH})
              </span>
            </div>
          </div>
        )}

        {/* Active Anchor Point Crosshair (positioned in original canvas coords relative to frame) */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: (anchorPt.x - rect.left) * safeZoom - 6,
            top: (anchorPt.y - rect.top) * safeZoom - 6,
            width: 12,
            height: 12,
          }}
        >
          <div className="w-3 h-3 rounded-full border-2 border-yellow-300 bg-slate-950/85 shadow flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-yellow-300" />
          </div>
        </div>

        {/* === 4 CORNER HANDLES (NW, NE, SE, SW) === */}
        {(
          [
            { id: 'nw', cursor: 'nwse-resize', style: { left: -7, top: -7 } },
            { id: 'ne', cursor: 'nesw-resize', style: { right: -7, top: -7 } },
            { id: 'se', cursor: 'nwse-resize', style: { right: -7, bottom: -7 } },
            { id: 'sw', cursor: 'nesw-resize', style: { left: -7, bottom: -7 } },
          ] as { id: HandleKind; cursor: string; style: React.CSSProperties }[]
        ).map((h) => (
          <div
            key={h.id}
            onPointerDown={(e) => handlePointerDown(e, h.id)}
            className="absolute w-3.5 h-3.5 rounded-[2px] bg-yellow-400 border-2 border-slate-950 shadow-md hover:scale-125 transition-transform pointer-events-auto"
            style={{ ...h.style, cursor: h.cursor }}
            title="Arrastra esquina para redimensionar lienzo (Shift: bloquear relación · Alt: simétrico)"
          />
        ))}

        {/* === 4 SIDE HANDLES (N, E, S, W) === */}
        {(
          [
            {
              id: 'n',
              cursor: 'ns-resize',
              cls: 'w-7 h-2.5 -top-[6px] left-1/2 -translate-x-1/2',
            },
            {
              id: 's',
              cursor: 'ns-resize',
              cls: 'w-7 h-2.5 -bottom-[6px] left-1/2 -translate-x-1/2',
            },
            {
              id: 'w',
              cursor: 'ew-resize',
              cls: 'h-7 w-2.5 -left-[6px] top-1/2 -translate-y-1/2',
            },
            {
              id: 'e',
              cursor: 'ew-resize',
              cls: 'h-7 w-2.5 -right-[6px] top-1/2 -translate-y-1/2',
            },
          ] as { id: HandleKind; cursor: string; cls: string }[]
        ).map((h) => (
          <div
            key={h.id}
            onPointerDown={(e) => handlePointerDown(e, h.id)}
            className={`absolute ${h.cls} rounded-sm bg-yellow-300 border-2 border-slate-950 shadow-md hover:bg-yellow-200 transition-colors pointer-events-auto`}
            style={{ cursor: h.cursor }}
            title="Arrastra lado para ampliar o recortar esta zona (Alt: crecimiento simétrico)"
          />
        ))}

        {/* === SPRITESHEET DIRECT ON-CANVAS +/- COLUMN & ROW CONTROLS === */}
        {config.spritesheetMode && (
          <>
            {/* Right edge: +Col / -Col */}
            <div
              className="absolute top-1/2 -translate-y-1/2 flex flex-col gap-1 pointer-events-auto"
              style={{ left: frameWidthPx + 14 }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => stepSpritesheetCols(1)}
                title={`Añadir columna (+${cellW}px ancho)`}
                className="px-1.5 py-1 rounded bg-emerald-600/95 hover:bg-emerald-500 text-white border border-emerald-300/60 shadow text-[9px] font-bold flex items-center gap-0.5 whitespace-nowrap"
              >
                <Plus className="w-2.5 h-2.5" />
                <span>Col</span>
              </button>
              <button
                type="button"
                onClick={() => stepSpritesheetCols(-1)}
                disabled={rect.width <= cellW}
                title={`Quitar columna (-${cellW}px ancho)`}
                className="px-1.5 py-1 rounded bg-slate-900/95 hover:bg-rose-600/90 text-slate-200 hover:text-white disabled:opacity-35 border border-slate-600 shadow text-[9px] font-bold flex items-center gap-0.5 whitespace-nowrap"
              >
                <Minus className="w-2.5 h-2.5" />
                <span>Col</span>
              </button>
            </div>

            {/* Bottom edge: +Fila / -Fila */}
            <div
              className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 pointer-events-auto"
              style={{ top: frameHeightPx + 14 }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => stepSpritesheetRows(1)}
                title={`Añadir fila (+${cellH}px alto)`}
                className="px-1.5 py-1 rounded bg-emerald-600/95 hover:bg-emerald-500 text-white border border-emerald-300/60 shadow text-[9px] font-bold flex items-center gap-0.5 whitespace-nowrap"
              >
                <Plus className="w-2.5 h-2.5" />
                <span>Fila</span>
              </button>
              <button
                type="button"
                onClick={() => stepSpritesheetRows(-1)}
                disabled={rect.height <= cellH}
                title={`Quitar fila (-${cellH}px alto)`}
                className="px-1.5 py-1 rounded bg-slate-900/95 hover:bg-rose-600/90 text-slate-200 hover:text-white disabled:opacity-35 border border-slate-600 shadow text-[9px] font-bold flex items-center gap-0.5 whitespace-nowrap"
              >
                <Minus className="w-2.5 h-2.5" />
                <span>Fila</span>
              </button>
            </div>
          </>
        )}

        {/* === REAL-TIME FLOATING SIZE & ACTION HUD === */}
        <div
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-slate-600/90 bg-slate-950/95 text-slate-100 shadow-2xl pointer-events-auto whitespace-nowrap"
          style={{
            top: -46,
            backdropFilter: 'blur(8px)',
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Old vs New Size readout */}
          <div className="flex items-center gap-1.5 font-mono text-[10px] tabular-nums">
            <span className="text-slate-400">
              {origWidth}×{origHeight}
            </span>
            <span className="text-yellow-400 font-bold">→</span>
            <span className="text-yellow-300 font-bold text-[11px]">
              {rect.width}×{rect.height}
            </span>
            {(deltaW !== 0 || deltaH !== 0) && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-slate-800 border border-slate-700">
                <span className={deltaW > 0 ? 'text-emerald-400' : deltaW < 0 ? 'text-rose-400' : 'text-slate-400'}>
                  {deltaW >= 0 ? `+${deltaW}` : deltaW}W
                </span>
                {' · '}
                <span className={deltaH > 0 ? 'text-emerald-400' : deltaH < 0 ? 'text-rose-400' : 'text-slate-400'}>
                  {deltaH >= 0 ? `+${deltaH}` : deltaH}H
                </span>
              </span>
            )}
          </div>

          {/* Visual Area Indicators */}
          {(addedAreaPx > 0 || removedAreaPx > 0 || hasOffCanvasContent) && (
            <div className="flex items-center gap-1.5 text-[9px] font-medium border-l border-slate-700 pl-2">
              {addedAreaPx > 0 && (
                <span className="text-emerald-400 whitespace-nowrap">+Área añadida</span>
              )}
              {removedAreaPx > 0 && (
                <span
                  className={
                    config.overflowMode === 'crop'
                      ? 'text-rose-400 whitespace-nowrap'
                      : config.overflowMode === 'keep'
                      ? 'text-amber-300 whitespace-nowrap'
                      : 'text-sky-300 whitespace-nowrap'
                  }
                >
                  {config.overflowMode === 'crop'
                    ? '−Recorte'
                    : config.overflowMode === 'keep'
                    ? 'Fuera (conservado)'
                    : 'Auto-expandir'}
                </span>
              )}
              {hasOffCanvasContent && removedAreaPx === 0 && (
                <span className="text-amber-300 whitespace-nowrap">Con píxeles fuera</span>
              )}
            </div>
          )}

          {/* Direct Action Buttons */}
          <div className="flex items-center gap-1 border-l border-slate-700 pl-2">
            <button
              type="button"
              onClick={onApply}
              className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 transition-colors"
              title="Aplicar nuevo tamaño de lienzo (Enter)"
            >
              <Check className="w-3 h-3" />
              <span>Aplicar</span>
            </button>
            {isModified && (
              <button
                type="button"
                onClick={onReset}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                title="Restablecer límites originales"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="p-1 rounded bg-slate-800 hover:bg-rose-600/80 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              title="Cancelar edición de lienzo (Esc)"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
