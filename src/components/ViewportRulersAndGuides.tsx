import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { STUDIO_Z } from './StudioTopLayer';
import {
  Copy,
  EyeOff,
  Lock,
  SlidersHorizontal,
  Trash2,
  Unlock,
} from 'lucide-react';
import {
  CanvasGuide,
  GuideOrientation,
  GuidesConfig,
  GuidesModalTab,
  ProjectWorkMode,
  RulerUnit,
} from '../types';
import {
  computeAutoFloorGridSegments,
  computePerspectiveGeometry,
  computeRulerStepPx,
  formatRulerCoordinate,
  isGuideLockedInGroups,
  isGuideVisibleInGroups,
} from '../utils/guidesEngine';

export const RULER_THICKNESS = 22;

interface ViewportRulersAndGuidesProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  width: number;
  height: number;
  zoom: number;
  pan: { x: number; y: number };
  cameraTransform: { camX: number; camY: number; camZoom: number };
  guides: CanvasGuide[];
  guidesConfig: GuidesConfig;
  workMode?: ProjectWorkMode;
  selectedGuideId: string | null;
  snappedGuideIds?: { xId: string | null; yId: string | null };
  cursorClientPos: { x: number; y: number } | null;
  isPanInteractionActive: boolean;
  onSelectGuide?: (id: string | null) => void;
  onAddGuide?: (guide: CanvasGuide) => void;
  onUpdateGuide?: (id: string, patch: Partial<CanvasGuide>) => void;
  onDuplicateGuide?: (id: string) => void;
  onDeleteGuide?: (id: string) => void;
  onChangeGuidesConfig?: (next: GuidesConfig) => void;
  onOpenGuidesModal?: (tab?: GuidesModalTab) => void;
  onFocusGuidesContext?: () => void;
}

interface GuideDragState {
  mode: 'create' | 'move' | 'duplicate';
  orientation: GuideOrientation;
  guideId?: string;
  positionPx: number;
  overRulerToDelete: boolean;
  color: string;
  label?: string;
}

interface PerspectiveDragState {
  kind: 'vp' | 'horizon';
  vpId?: string;
}

interface GuideContextMenuState {
  guide: CanvasGuide;
  clientX: number;
  clientY: number;
}

export const ViewportRulersAndGuides: React.FC<ViewportRulersAndGuidesProps> = ({
  containerRef,
  canvasRef,
  width,
  height,
  zoom,
  pan,
  cameraTransform,
  guides,
  guidesConfig,
  workMode = 'fighter',
  selectedGuideId,
  snappedGuideIds,
  cursorClientPos,
  isPanInteractionActive,
  onSelectGuide,
  onAddGuide,
  onUpdateGuide,
  onDuplicateGuide,
  onDeleteGuide,
  onChangeGuidesConfig,
  onOpenGuidesModal,
  onFocusGuidesContext,
}) => {
  const hRulerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const vRulerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [viewportMetrics, setViewportMetrics] = useState<{
    vw: number;
    vh: number;
    originX: number;
    originY: number;
    effZoom: number;
  }>({ vw: 800, vh: 600, originX: 100, originY: 100, effZoom: zoom });

  const [dragState, setDragState] = useState<GuideDragState | null>(null);
  const [perspDrag, setPerspDrag] = useState<PerspectiveDragState | null>(null);
  const [hoveredGuideId, setHoveredGuideId] = useState<string | null>(null);
  const [hoveredVpId, setHoveredVpId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<GuideContextMenuState | null>(null);

  const measureGeometry = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    const canvasEl = canvasRef.current;
    let originX = pan.x + cameraTransform.camX * zoom;
    let originY = pan.y + cameraTransform.camY * zoom;
    let effZoom = Math.max(0.25, zoom * (cameraTransform.camZoom || 1));

    if (canvasEl) {
      const r = canvasEl.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        originX = r.left - cRect.left;
        originY = r.top - cRect.top;
        effZoom = r.width / Math.max(1, width);
      }
    }

    setViewportMetrics((prev) => {
      if (
        Math.abs(prev.vw - cRect.width) < 0.5 &&
        Math.abs(prev.vh - cRect.height) < 0.5 &&
        Math.abs(prev.originX - originX) < 0.25 &&
        Math.abs(prev.originY - originY) < 0.25 &&
        Math.abs(prev.effZoom - effZoom) < 0.005
      ) {
        return prev;
      }
      return { vw: cRect.width, vh: cRect.height, originX, originY, effZoom };
    });
  }, [
    containerRef,
    canvasRef,
    pan.x,
    pan.y,
    zoom,
    width,
    cameraTransform.camX,
    cameraTransform.camY,
    cameraTransform.camZoom,
  ]);

  useEffect(() => {
    measureGeometry();
    const rafId = window.requestAnimationFrame(measureGeometry);
    const container = containerRef.current;
    let ro: ResizeObserver | null = null;
    if (container && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => measureGeometry());
      ro.observe(container);
    }
    return () => {
      window.cancelAnimationFrame(rafId);
      ro?.disconnect();
    };
  }, [
    measureGeometry,
    containerRef,
    guidesConfig.showRulers,
    guidesConfig.showGuides,
    guidesConfig.perspective.enabled,
    width,
    height,
  ]);

  // Draw Top Horizontal & Left Vertical Rulers
  useEffect(() => {
    if (!guidesConfig.showRulers) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const { vw, vh, originX, originY, effZoom } = viewportMetrics;
    const containerRect = containerRef.current?.getBoundingClientRect();
    const cursorLocalX =
      cursorClientPos && containerRect ? cursorClientPos.x - containerRect.left : null;
    const cursorLocalY =
      cursorClientPos && containerRect ? cursorClientPos.y - containerRect.top : null;

    // 1. Horizontal Ruler
    const hCanvas = hRulerCanvasRef.current;
    if (hCanvas && vw > RULER_THICKNESS) {
      const rw = Math.max(1, Math.floor(vw - RULER_THICKNESS));
      const rh = RULER_THICKNESS;
      if (hCanvas.width !== Math.round(rw * dpr) || hCanvas.height !== Math.round(rh * dpr)) {
        hCanvas.width = Math.round(rw * dpr);
        hCanvas.height = Math.round(rh * dpr);
      }
      const ctx = hCanvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.fillStyle = '#111522';
        ctx.fillRect(0, 0, rw, rh);

        const canvasStartX = originX - RULER_THICKNESS;
        const canvasEndX = canvasStartX + width * effZoom;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.fillRect(
          Math.max(0, canvasStartX),
          0,
          Math.max(0, Math.min(rw, canvasEndX) - Math.max(0, canvasStartX)),
          rh
        );

        const { majorStepPx, minorDivisions } = computeRulerStepPx(
          effZoom,
          guidesConfig.unit,
          width,
          guidesConfig.customScale
        );
        const minCanvasX = (0 - canvasStartX) / effZoom;
        const maxCanvasX = (rw - canvasStartX) / effZoom;
        const startMajor = Math.floor(minCanvasX / majorStepPx) * majorStepPx;

        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textBaseline = 'top';

        const minorStep = majorStepPx / Math.max(1, minorDivisions);
        for (let val = startMajor; val <= maxCanvasX + majorStepPx; val += majorStepPx) {
          const sx = canvasStartX + val * effZoom;
          if (sx >= -40 && sx <= rw + 40) {
            ctx.beginPath();
            ctx.moveTo(Math.round(sx) + 0.5, 0);
            ctx.lineTo(Math.round(sx) + 0.5, rh);
            ctx.stroke();

            const labelText = formatRulerCoordinate(
              val,
              guidesConfig.unit,
              width,
              guidesConfig.customScale,
              guidesConfig.customLabel,
              false
            );
            ctx.fillText(labelText, Math.round(sx) + 3, 2);
          }
          if (minorDivisions > 1) {
            for (let m = 1; m < minorDivisions; m++) {
              const mx = canvasStartX + (val + m * minorStep) * effZoom;
              if (mx >= 0 && mx <= rw) {
                const tickH = m * 2 === minorDivisions ? 8 : 5;
                ctx.beginPath();
                ctx.moveTo(Math.round(mx) + 0.5, rh - tickH);
                ctx.lineTo(Math.round(mx) + 0.5, rh);
                ctx.stroke();
              }
            }
          }
        }

        ctx.strokeStyle = 'rgba(71, 85, 105, 0.65)';
        ctx.beginPath();
        ctx.moveTo(0, rh - 0.5);
        ctx.lineTo(rw, rh - 0.5);
        ctx.stroke();

        if (cursorLocalX !== null) {
          const cx = cursorLocalX - RULER_THICKNESS;
          if (cx >= 0 && cx <= rw) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx, 0);
            ctx.lineTo(cx, rh);
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    }

    // 2. Vertical Ruler
    const vCanvas = vRulerCanvasRef.current;
    if (vCanvas && vh > RULER_THICKNESS) {
      const rw = RULER_THICKNESS;
      const rh = Math.max(1, Math.floor(vh - RULER_THICKNESS));
      if (vCanvas.width !== Math.round(rw * dpr) || vCanvas.height !== Math.round(rh * dpr)) {
        vCanvas.width = Math.round(rw * dpr);
        vCanvas.height = Math.round(rh * dpr);
      }
      const ctx = vCanvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.fillStyle = '#111522';
        ctx.fillRect(0, 0, rw, rh);

        const canvasStartY = originY - RULER_THICKNESS;
        const canvasEndY = canvasStartY + height * effZoom;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.fillRect(
          0,
          Math.max(0, canvasStartY),
          rw,
          Math.max(0, Math.min(rh, canvasEndY) - Math.max(0, canvasStartY))
        );

        const { majorStepPx, minorDivisions } = computeRulerStepPx(
          effZoom,
          guidesConfig.unit,
          height,
          guidesConfig.customScale
        );
        const minCanvasY = (0 - canvasStartY) / effZoom;
        const maxCanvasY = (rh - canvasStartY) / effZoom;
        const startMajor = Math.floor(minCanvasY / majorStepPx) * majorStepPx;

        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textBaseline = 'top';

        const minorStep = majorStepPx / Math.max(1, minorDivisions);
        for (let val = startMajor; val <= maxCanvasY + majorStepPx; val += majorStepPx) {
          const sy = canvasStartY + val * effZoom;
          if (sy >= -40 && sy <= rh + 40) {
            ctx.beginPath();
            ctx.moveTo(0, Math.round(sy) + 0.5);
            ctx.lineTo(rw, Math.round(sy) + 0.5);
            ctx.stroke();

            const labelText = formatRulerCoordinate(
              val,
              guidesConfig.unit,
              height,
              guidesConfig.customScale,
              guidesConfig.customLabel,
              false
            );
            ctx.save();
            ctx.translate(2, Math.round(sy) + 3);
            ctx.rotate(-Math.PI / 2);
            ctx.textAlign = 'right';
            ctx.fillText(labelText, 0, 0);
            ctx.restore();
          }
          if (minorDivisions > 1) {
            for (let m = 1; m < minorDivisions; m++) {
              const my = canvasStartY + (val + m * minorStep) * effZoom;
              if (my >= 0 && my <= rh) {
                const tickW = m * 2 === minorDivisions ? 8 : 5;
                ctx.beginPath();
                ctx.moveTo(rw - tickW, Math.round(my) + 0.5);
                ctx.lineTo(rw, Math.round(my) + 0.5);
                ctx.stroke();
              }
            }
          }
        }

        ctx.strokeStyle = 'rgba(71, 85, 105, 0.65)';
        ctx.beginPath();
        ctx.moveTo(rw - 0.5, 0);
        ctx.lineTo(rw - 0.5, rh);
        ctx.stroke();

        if (cursorLocalY !== null) {
          const cy = cursorLocalY - RULER_THICKNESS;
          if (cy >= 0 && cy <= rh) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, cy);
            ctx.lineTo(rw, cy);
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    }
  }, [
    guidesConfig.showRulers,
    guidesConfig.unit,
    guidesConfig.customScale,
    guidesConfig.customLabel,
    viewportMetrics,
    width,
    height,
    cursorClientPos,
    containerRef,
  ]);

  // Global Pointer Listeners while dragging/creating/duplicating a linear guide
  useEffect(() => {
    if (!dragState) return;

    const handleMove = (ev: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const cRect = container.getBoundingClientRect();
      const localX = ev.clientX - cRect.left;
      const localY = ev.clientY - cRect.top;
      const { originX, originY, effZoom } = viewportMetrics;

      const rawPos =
        dragState.orientation === 'vertical'
          ? (localX - originX) / effZoom
          : (localY - originY) / effZoom;

      const pos = ev.shiftKey ? Math.round(rawPos / 4) * 4 : Math.round(rawPos);
      const overRuler =
        dragState.orientation === 'vertical'
          ? localX < RULER_THICKNESS + 4
          : localY < RULER_THICKNESS + 4;

      setDragState((prev) =>
        prev ? { ...prev, positionPx: pos, overRulerToDelete: overRuler } : null
      );

      if (dragState.mode === 'move' && dragState.guideId && !overRuler) {
        onUpdateGuide?.(dragState.guideId, { position: pos });
      }
    };

    const handleUp = () => {
      setDragState((cur) => {
        if (!cur) return null;
        if (cur.overRulerToDelete) {
          if (cur.mode === 'move' && cur.guideId) {
            onDeleteGuide?.(cur.guideId);
          }
        } else if (cur.mode === 'create' || cur.mode === 'duplicate') {
          const newId = `guide-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const activeGroup = guidesConfig.groups?.find((gr) => gr.id === guidesConfig.activeGroupId);
          onAddGuide?.({
            id: newId,
            orientation: cur.orientation,
            position: cur.positionPx,
            color: cur.color || activeGroup?.color || guidesConfig.defaultGuideColor || '#38bdf8',
            thickness: activeGroup?.thickness ?? guidesConfig.defaultGuideThickness ?? 1,
            opacity: activeGroup?.opacity ?? guidesConfig.defaultGuideOpacity ?? 0.8,
            groupId: guidesConfig.activeGroupId || 'grp-stage',
            label: cur.label,
            locked: false,
          });
          onSelectGuide?.(newId);
          onFocusGuidesContext?.();
          if (!guidesConfig.showGuides && onChangeGuidesConfig) {
            onChangeGuidesConfig({ ...guidesConfig, showGuides: true });
          }
        }
        return null;
      });
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [
    dragState,
    containerRef,
    viewportMetrics,
    onAddGuide,
    onUpdateGuide,
    onDeleteGuide,
    onSelectGuide,
    onFocusGuidesContext,
    guidesConfig,
    onChangeGuidesConfig,
  ]);

  // Global Pointer Listeners while dragging a Vanishing Point or Horizon line (allows outside-canvas coordinates!)
  useEffect(() => {
    if (!perspDrag || !onChangeGuidesConfig) return;

    const handleMove = (ev: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const cRect = container.getBoundingClientRect();
      const localX = ev.clientX - cRect.left;
      const localY = ev.clientY - cRect.top;
      const { originX, originY, effZoom } = viewportMetrics;

      const rawX = (localX - originX) / effZoom;
      const rawY = (localY - originY) / effZoom;
      const cx = ev.shiftKey ? Math.round(rawX / 4) * 4 : Math.round(rawX);
      const cy = ev.shiftKey ? Math.round(rawY / 4) * 4 : Math.round(rawY);

      const persp = guidesConfig.perspective;
      if (perspDrag.kind === 'horizon') {
        if (persp.horizonLocked) return;
        const deltaY = cy - persp.horizonY;
        // Keep horizon-aligned VPs synced with the horizon line while leaving zenith/nadir independent
        const nextVps = persp.vanishingPoints.map((vp) => {
          if (vp.locked) return vp;
          if (Math.abs(vp.y - persp.horizonY) <= 4) {
            return { ...vp, y: vp.y + deltaY };
          }
          return vp;
        });
        onChangeGuidesConfig({
          ...guidesConfig,
          perspective: {
            ...persp,
            horizonY: cy,
            vanishingPoints: nextVps,
          },
        });
      } else if (perspDrag.kind === 'vp' && perspDrag.vpId) {
        const target = persp.vanishingPoints.find((vp) => vp.id === perspDrag.vpId);
        if (!target || target.locked) return;
        // Shift locks horizon-aligned VPs onto horizonY while dragging horizontally
        const lockToHorizon =
          ev.shiftKey &&
          persp.type !== '3point' &&
          !target.id.includes('vertical') &&
          !target.id.includes('top') &&
          !target.id.includes('bottom');
        const nextY = lockToHorizon ? persp.horizonY : cy;
        const nextVps = persp.vanishingPoints.map((vp) =>
          vp.id === perspDrag.vpId ? { ...vp, x: cx, y: nextY } : vp
        );
        // For 1-point perspective, moving the sole VP updates horizonY cleanly unless horizonLocked
        const nextHorizonY =
          persp.type === '1point' && !persp.horizonLocked ? nextY : persp.horizonY;
        onChangeGuidesConfig({
          ...guidesConfig,
          perspective: {
            ...persp,
            horizonY: nextHorizonY,
            vanishingPoints: nextVps,
          },
        });
      }
    };

    const handleUp = () => setPerspDrag(null);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [perspDrag, containerRef, viewportMetrics, guidesConfig, onChangeGuidesConfig]);

  // Close guide context menu on outside click / Esc
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [contextMenu]);

  const cycleUnit = () => {
    if (!onChangeGuidesConfig) return;
    const order: RulerUnit[] = ['px', 'percent', 'custom'];
    const nextUnit = order[(order.indexOf(guidesConfig.unit) + 1) % order.length];
    onChangeGuidesConfig({ ...guidesConfig, unit: nextUnit });
  };

  const startCreateFromRuler = (
    orientation: GuideOrientation,
    e: React.PointerEvent
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    const { originX, originY, effZoom } = viewportMetrics;
    const localX = e.clientX - cRect.left;
    const localY = e.clientY - cRect.top;
    const pos =
      orientation === 'vertical'
        ? Math.round((localX - originX) / effZoom)
        : Math.round((localY - originY) / effZoom);
    const activeGroup = guidesConfig.groups?.find((gr) => gr.id === guidesConfig.activeGroupId);
    setDragState({
      mode: 'create',
      orientation,
      positionPx: pos,
      overRulerToDelete: false,
      color: activeGroup?.color || guidesConfig.defaultGuideColor || '#38bdf8',
    });
  };

  const { originX, originY, effZoom, vw, vh } = viewportMetrics;
  const toScreenX = useCallback((cx: number) => originX + cx * effZoom, [originX, effZoom]);
  const toScreenY = useCallback((cy: number) => originY + cy * effZoom, [originY, effZoom]);

  const persp = guidesConfig.perspective;
  const camG = guidesConfig.cameraGuides;
  const stageD = guidesConfig.stageDepth;
  const showStageDepthNow = Boolean(
    guidesConfig.showGuides &&
      (stageD?.enabled || (workMode === 'stage' && stageD?.autoShowInStageMode))
  );

  const perspectiveGeom = useMemo(() => {
    if (!guidesConfig.showGuides || !persp?.enabled) {
      return { segments: [], arcs: [] };
    }
    return computePerspectiveGeometry(persp, width, height);
  }, [guidesConfig.showGuides, persp, width, height]);

  const floorGridSegments = useMemo(() => {
    if (!guidesConfig.showGuides || !persp?.enabled || !persp?.floorGrid?.enabled) {
      return [];
    }
    return computeAutoFloorGridSegments(persp, width, height);
  }, [guidesConfig.showGuides, persp, width, height]);

  const visibleGuides = useMemo(
    () => guides.filter((g) => isGuideVisibleInGroups(g, guidesConfig)),
    [guides, guidesConfig]
  );

  const unitBadge =
    guidesConfig.unit === 'px'
      ? 'px'
      : guidesConfig.unit === 'percent'
      ? '%'
      : (guidesConfig.customLabel || 'u').slice(0, 3);

  const rulerOffset = guidesConfig.showRulers ? RULER_THICKNESS : 0;

  return (
    <>
      {/* Perspective Guides, Auto Floor Grid, Camera Guides & Stage Depth Layer (full viewport so VPs work OUTSIDE canvas!) */}
      {guidesConfig.showGuides && (persp?.enabled || camG?.enabled || showStageDepthNow) && (
        <div
          className="absolute inset-0 pointer-events-none z-[31] overflow-hidden"
          style={{ left: `${rulerOffset}px`, top: `${rulerOffset}px` }}
        >
          <svg
            width={Math.max(1, vw - rulerOffset)}
            height={Math.max(1, vh - rulerOffset)}
            className="w-full h-full block"
          >
            <g transform={`translate(${-rulerOffset}, ${-rulerOffset})`}>
              {/* 1. Perspective Rays, Construction Grids & Curvilinear Arcs */}
              {persp?.enabled && (
                <g opacity={persp.opacity}>
                  {perspectiveGeom.segments.map((seg, i) => (
                    <line
                      key={`pseg-${i}`}
                      x1={toScreenX(seg.x1)}
                      y1={toScreenY(seg.y1)}
                      x2={toScreenX(seg.x2)}
                      y2={toScreenY(seg.y2)}
                      stroke={seg.color || persp.color}
                      strokeWidth={seg.kind === 'grid' ? Math.max(0.75, persp.thickness * 0.8) : persp.thickness}
                      strokeDasharray={seg.kind === 'grid' ? '4 4' : undefined}
                      opacity={seg.kind === 'grid' ? 0.65 : 0.9}
                    />
                  ))}
                  {perspectiveGeom.arcs.map((arc, i) => (
                    <path
                      key={`parc-${i}`}
                      d={`M ${toScreenX(arc.x1)} ${toScreenY(arc.y1)} Q ${toScreenX(arc.cx)} ${toScreenY(arc.cy)} ${toScreenX(arc.x2)} ${toScreenY(arc.y2)}`}
                      fill="none"
                      stroke={arc.color || persp.color}
                      strokeWidth={persp.thickness}
                      opacity={0.78}
                    />
                  ))}
                </g>
              )}

              {/* 2. Automatic Perspective Floor Grid */}
              {persp?.enabled && persp.floorGrid?.enabled && floorGridSegments.length > 0 && (
                <g opacity={persp.floorGrid.opacity}>
                  {floorGridSegments.map((seg, i) => (
                    <line
                      key={`fgrid-${i}`}
                      x1={toScreenX(seg.x1)}
                      y1={toScreenY(seg.y1)}
                      x2={toScreenX(seg.x2)}
                      y2={toScreenY(seg.y2)}
                      stroke={seg.color || persp.floorGrid.color}
                      strokeWidth={seg.kind === 'floor_depth' ? Math.max(1, persp.thickness) : Math.max(0.85, persp.thickness * 0.9)}
                      strokeDasharray={seg.kind === 'floor_depth' ? undefined : '2 2'}
                    />
                  ))}
                </g>
              )}

              {/* 3. Perspective Horizon Line */}
              {persp?.enabled && persp.showHorizon && (
                <g>
                  <line
                    x1={0}
                    y1={toScreenY(persp.horizonY)}
                    x2={vw}
                    y2={toScreenY(persp.horizonY)}
                    stroke="#f59e0b"
                    strokeWidth={Math.max(1.5, persp.thickness + 0.5)}
                    strokeDasharray="8 4"
                    opacity={Math.min(1, persp.opacity + 0.25)}
                  />
                  {/* Interactive Hit Strip for Dragging Horizon Line */}
                  {!persp.horizonLocked && !isPanInteractionActive && (
                    <line
                      x1={0}
                      y1={toScreenY(persp.horizonY)}
                      x2={vw}
                      y2={toScreenY(persp.horizonY)}
                      stroke="transparent"
                      strokeWidth={10}
                      style={{ pointerEvents: 'stroke', cursor: 'ns-resize' }}
                      onPointerDown={(e) => {
                        if (e.button !== 0) return;
                        e.stopPropagation();
                        setPerspDrag({ kind: 'horizon' });
                      }}
                    />
                  )}
                  <g transform={`translate(${Math.max(rulerOffset + 8, toScreenX(2))}, ${toScreenY(persp.horizonY) - 16})`}>
                    <rect
                      x={0}
                      y={0}
                      width={118}
                      height={14}
                      rx={3}
                      fill="rgba(15, 19, 32, 0.88)"
                      stroke="#f59e0b"
                      strokeWidth={0.8}
                    />
                    <text
                      x={5}
                      y={10}
                      fill="#fde68a"
                      fontSize={9}
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    >
                      Horizonte Y:{Math.round(persp.horizonY)}px{persp.horizonLocked ? ' · Bloq' : ''}
                    </text>
                  </g>
                </g>
              )}

              {/* 4. Stage Mode Depth Planes (Horizon, Ground Plane, Far BG, Mid BG, Foreground, Visual Depth) */}
              {showStageDepthNow && stageD && (() => {
                const cLeft = toScreenX(0);
                const cRight = toScreenX(width);
                const cW = cRight - cLeft;
                const planes: { show: boolean; pct: number; label: string; color: string; dash?: string }[] = [
                  { show: stageD.showFarBackground, pct: stageD.farBgPct, label: 'Fondo Lejano', color: '#38bdf8', dash: '5 4' },
                  { show: stageD.showHorizon, pct: stageD.horizonPct, label: 'Horizonte Escenario', color: '#f59e0b', dash: '7 3' },
                  { show: stageD.showMidBackground, pct: stageD.midBgPct, label: 'Fondo Medio', color: '#a855f7', dash: '4 4' },
                  { show: stageD.showGroundPlane, pct: stageD.groundPlanePct, label: 'Plano del Suelo', color: '#10b981' },
                  { show: stageD.showForeground, pct: stageD.foregroundPct, label: 'Primer Plano', color: '#f43f5e', dash: '3 3' },
                ];
                const horY = toScreenY((stageD.horizonPct / 100) * height);
                const gndY = toScreenY((stageD.groundPlanePct / 100) * height);
                const midX = toScreenX(width * 0.5);

                return (
                  <g opacity={stageD.opacity}>
                    {/* Visual Depth Convergence Corridor */}
                    {stageD.showVisualDepth && (
                      <g opacity={0.45}>
                        <line x1={midX} y1={horY} x2={cLeft} y2={gndY} stroke={stageD.color} strokeWidth={stageD.thickness} strokeDasharray="3 4" />
                        <line x1={midX} y1={horY} x2={cRight} y2={gndY} stroke={stageD.color} strokeWidth={stageD.thickness} strokeDasharray="3 4" />
                        <line x1={midX} y1={horY} x2={cLeft + cW * 0.25} y2={toScreenY(height)} stroke={stageD.color} strokeWidth={stageD.thickness} strokeDasharray="2 5" />
                        <line x1={midX} y1={horY} x2={cLeft + cW * 0.75} y2={toScreenY(height)} stroke={stageD.color} strokeWidth={stageD.thickness} strokeDasharray="2 5" />
                      </g>
                    )}
                    {planes
                      .filter((p) => p.show)
                      .map((p) => {
                        const sy = toScreenY((p.pct / 100) * height);
                        return (
                          <g key={p.label}>
                            <line
                              x1={cLeft}
                              y1={sy}
                              x2={cRight}
                              y2={sy}
                              stroke={p.color}
                              strokeWidth={stageD.thickness}
                              strokeDasharray={p.dash}
                            />
                            <text
                              x={cRight - 4}
                              y={sy - 3}
                              textAnchor="end"
                              fill={p.color}
                              fontSize={9}
                              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                            >
                              {p.label} ({p.pct}%)
                            </text>
                          </g>
                        );
                      })}
                  </g>
                );
              })()}

              {/* 5. Camera Guides (Visible Area, Safe Margins, Combat Zone, Scroll Limits, Camera Center) */}
              {camG?.enabled && (() => {
                const cLeft = toScreenX(0);
                const cTop = toScreenY(0);
                const cW = width * effZoom;
                const cH = height * effZoom;
                const visX = cLeft + (camG.visibleAreaInsetPct / 100) * cW;
                const visY = cTop + (camG.visibleAreaInsetPct / 100) * cH;
                const visW = Math.max(2, cW * (1 - (camG.visibleAreaInsetPct * 2) / 100));
                const visH = Math.max(2, cH * (1 - (camG.visibleAreaInsetPct * 2) / 100));

                const safeX = cLeft + (camG.safeMarginPct / 100) * cW;
                const safeY = cTop + (camG.safeMarginPct / 100) * cH;
                const safeW = Math.max(2, cW * (1 - (camG.safeMarginPct * 2) / 100));
                const safeH = Math.max(2, cH * (1 - (camG.safeMarginPct * 2) / 100));

                const combatX = cLeft + (camG.combatZoneInsetXPct / 100) * cW;
                const combatW = Math.max(2, cW * (1 - (camG.combatZoneInsetXPct * 2) / 100));
                const combatY = cTop + (camG.combatZoneTopPct / 100) * cH;
                const combatH = Math.max(2, ((camG.combatZoneFloorPct - camG.combatZoneTopPct) / 100) * cH);

                const scrollLeft = cLeft + (camG.scrollLimitInsetPct / 100) * cW;
                const scrollRight = cLeft + cW - (camG.scrollLimitInsetPct / 100) * cW;
                const centerX = cLeft + cW * 0.5;
                const centerY = cTop + cH * 0.5;

                return (
                  <g opacity={camG.opacity}>
                    {camG.showVisibleArea && (
                      <g>
                        <rect
                          x={visX}
                          y={visY}
                          width={visW}
                          height={visH}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth={camG.thickness}
                        />
                        <text
                          x={visX + 4}
                          y={visY + 11}
                          fill="#7dd3fc"
                          fontSize={9}
                          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                        >
                          Área visible
                        </text>
                      </g>
                    )}

                    {camG.showSafeMargins && (
                      <g>
                        <rect
                          x={safeX}
                          y={safeY}
                          width={safeW}
                          height={safeH}
                          fill="none"
                          stroke={camG.color}
                          strokeWidth={camG.thickness}
                          strokeDasharray="6 4"
                        />
                        <text
                          x={safeX + 4}
                          y={safeY + 11}
                          fill="#fde68a"
                          fontSize={9}
                          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                        >
                          Margen seguro ({camG.safeMarginPct}%)
                        </text>
                      </g>
                    )}

                    {camG.showCombatZone && (
                      <g>
                        <rect
                          x={combatX}
                          y={combatY}
                          width={combatW}
                          height={combatH}
                          fill="rgba(244, 63, 94, 0.05)"
                          stroke="#f43f5e"
                          strokeWidth={Math.max(1.2, camG.thickness)}
                          strokeDasharray="4 3"
                        />
                        <text
                          x={combatX + 4}
                          y={combatY + 11}
                          fill="#fda4af"
                          fontSize={9}
                          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                        >
                          Zona de combate
                        </text>
                      </g>
                    )}

                    {camG.showScrollLimits && (
                      <g>
                        <line
                          x1={scrollLeft}
                          y1={cTop}
                          x2={scrollLeft}
                          y2={cTop + cH}
                          stroke="#10b981"
                          strokeWidth={Math.max(1.2, camG.thickness)}
                          strokeDasharray="8 3 2 3"
                        />
                        <line
                          x1={scrollRight}
                          y1={cTop}
                          x2={scrollRight}
                          y2={cTop + cH}
                          stroke="#10b981"
                          strokeWidth={Math.max(1.2, camG.thickness)}
                          strokeDasharray="8 3 2 3"
                        />
                        <text
                          x={scrollLeft + 4}
                          y={cTop + cH - 5}
                          fill="#6ee7b7"
                          fontSize={9}
                          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                        >
                          Límite scroll
                        </text>
                      </g>
                    )}

                    {camG.showCameraCenter && (
                      <g>
                        <line x1={centerX - 10} y1={centerY} x2={centerX + 10} y2={centerY} stroke={camG.color} strokeWidth={1.3} />
                        <line x1={centerX} y1={centerY - 10} x2={centerX} y2={centerY + 10} stroke={camG.color} strokeWidth={1.3} />
                        <circle cx={centerX} cy={centerY} r={4} fill="none" stroke={camG.color} strokeWidth={1.2} />
                      </g>
                    )}
                  </g>
                );
              })()}

              {/* 6. Interactive Draggable Vanishing Point Handles (work BOTH inside & outside canvas!) */}
              {persp?.enabled &&
                persp.vanishingPoints
                  .filter((vp) => vp.visible)
                  .map((vp) => {
                    const sx = toScreenX(vp.x);
                    const sy = toScreenY(vp.y);
                    const isOutOfCanvas = vp.x < 0 || vp.x > width || vp.y < 0 || vp.y > height;
                    const isHovered = hoveredVpId === vp.id || (perspDrag?.kind === 'vp' && perspDrag.vpId === vp.id);
                    const col = vp.locked ? '#94a3b8' : vp.color || persp.color || '#38bdf8';

                    return (
                      <g
                        key={vp.id}
                        transform={`translate(${sx}, ${sy})`}
                        style={{
                          pointerEvents: isPanInteractionActive ? 'none' : 'all',
                          cursor: vp.locked ? 'not-allowed' : 'move',
                        }}
                        onPointerEnter={() => setHoveredVpId(vp.id)}
                        onPointerLeave={() => setHoveredVpId((cur) => (cur === vp.id ? null : cur))}
                        onPointerDown={(e) => {
                          if (isPanInteractionActive || e.button !== 0 || vp.locked) return;
                          e.stopPropagation();
                          setPerspDrag({ kind: 'vp', vpId: vp.id });
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          onOpenGuidesModal?.('perspective');
                        }}
                      >
                        {/* Outer target ring */}
                        <circle
                          r={isHovered ? 11 : 8.5}
                          fill="rgba(9, 13, 22, 0.82)"
                          stroke={col}
                          strokeWidth={isHovered ? 2 : 1.5}
                        />
                        <line x1={-12} y1={0} x2={12} y2={0} stroke={col} strokeWidth={1.1} />
                        <line x1={0} y1={-12} x2={0} y2={12} stroke={col} strokeWidth={1.1} />
                        <circle r={2.5} fill={col} />
                        {/* Label badge */}
                        <g transform="translate(12, -12)">
                          <rect
                            x={0}
                            y={0}
                            width={Math.max(88, (vp.label.length + 14) * 5.2)}
                            height={16}
                            rx={3}
                            fill="rgba(15, 19, 32, 0.92)"
                            stroke={col}
                            strokeWidth={0.9}
                          />
                          <text
                            x={5}
                            y={11}
                            fill="#f8fafc"
                            fontSize={9}
                            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                          >
                            {vp.label} ({Math.round(vp.x)},{Math.round(vp.y)}){isOutOfCanvas ? ' ext' : ''}{vp.locked ? ' 🔒' : ''}
                          </text>
                        </g>
                      </g>
                    );
                  })}
            </g>
          </svg>
        </div>
      )}

      {/* Interactive Linear Guide Lines Layer */}
      {guidesConfig.showGuides && (
        <div className="absolute inset-0 pointer-events-none z-[32] overflow-hidden">
          {visibleGuides.map((g) => {
            const isVertical = g.orientation === 'vertical';
            const screenCoord = isVertical
              ? originX + g.position * effZoom
              : originY + g.position * effZoom;
            if (isVertical && (screenCoord < -20 || screenCoord > vw + 20)) return null;
            if (!isVertical && (screenCoord < -20 || screenCoord > vh + 20)) return null;

            const grp = g.groupId ? guidesConfig.groups?.find((gr) => gr.id === g.groupId) : undefined;
            const isSelected = selectedGuideId === g.id;
            const isHovered = hoveredGuideId === g.id;
            const isSnapped =
              (isVertical && snappedGuideIds?.xId === g.id) ||
              (!isVertical && snappedGuideIds?.yId === g.id);
            const isBeingDragged = dragState?.mode === 'move' && dragState.guideId === g.id;
            const isDeleting = isBeingDragged && dragState.overRulerToDelete;
            const isLocked = isGuideLockedInGroups(g, guidesConfig);
            const baseColor = isDeleting
              ? '#f43f5e'
              : isSnapped
              ? '#fbbf24'
              : g.color || grp?.color || guidesConfig.defaultGuideColor || '#38bdf8';
            const baseThickness = Math.max(
              1,
              Math.min(4, g.thickness ?? grp?.thickness ?? guidesConfig.defaultGuideThickness ?? 1)
            );
            const baseOpacity = Math.max(
              0.15,
              Math.min(1, g.opacity ?? grp?.opacity ?? guidesConfig.defaultGuideOpacity ?? 0.8)
            );

            const axisLen = isVertical ? width : height;
            const coordLabel = formatRulerCoordinate(
              g.position,
              guidesConfig.unit,
              axisLen,
              guidesConfig.customScale,
              guidesConfig.customLabel
            );

            return (
              <div
                key={g.id}
                onPointerEnter={() => setHoveredGuideId(g.id)}
                onPointerLeave={() => setHoveredGuideId((cur) => (cur === g.id ? null : cur))}
                onPointerDown={(e) => {
                  if (isPanInteractionActive || e.button === 1) return;
                  if (e.button === 2) {
                    e.stopPropagation();
                    onSelectGuide?.(g.id);
                    onFocusGuidesContext?.();
                    setContextMenu({ guide: g, clientX: e.clientX, clientY: e.clientY });
                    return;
                  }
                  if (e.button !== 0) return;
                  e.stopPropagation();
                  onSelectGuide?.(g.id);
                  onFocusGuidesContext?.();
                  if (isLocked && !e.altKey) return;
                  setDragState({
                    mode: e.altKey ? 'duplicate' : 'move',
                    orientation: g.orientation,
                    guideId: g.id,
                    positionPx: g.position,
                    overRulerToDelete: false,
                    color: baseColor,
                    label: g.label,
                  });
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelectGuide?.(g.id);
                  onFocusGuidesContext?.();
                  setContextMenu({ guide: g, clientX: e.clientX, clientY: e.clientY });
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onSelectGuide?.(g.id);
                  onOpenGuidesModal?.('groups');
                }}
                style={{
                  position: 'absolute',
                  left: isVertical ? `${screenCoord - 4}px` : `${rulerOffset}px`,
                  top: isVertical ? `${rulerOffset}px` : `${screenCoord - 4}px`,
                  width: isVertical ? '9px' : `calc(100% - ${rulerOffset}px)`,
                  height: isVertical ? `calc(100% - ${rulerOffset}px)` : '9px',
                  pointerEvents: isPanInteractionActive ? 'none' : 'auto',
                  cursor: isLocked
                    ? 'pointer'
                    : isVertical
                    ? 'ew-resize'
                    : 'ns-resize',
                }}
                title={`${g.label ? `${g.label} · ` : ''}${grp ? `[${grp.name}] · ` : ''}${isVertical ? 'X' : 'Y'} = ${coordLabel}${isLocked ? ' (Bloqueada)' : ' · Arrastrar mover · Alt+Arrastrar duplicar · Clic derecho opciones'}`}
              >
                {/* Visual Line */}
                <div
                  style={{
                    position: 'absolute',
                    left: isVertical ? '4px' : 0,
                    top: isVertical ? 0 : '4px',
                    width: isVertical
                      ? `${isSelected || isSnapped || isHovered ? Math.max(2, baseThickness + 1) : baseThickness}px`
                      : '100%',
                    height: isVertical
                      ? '100%'
                      : `${isSelected || isSnapped || isHovered ? Math.max(2, baseThickness + 1) : baseThickness}px`,
                    backgroundColor: baseColor,
                    opacity: isSelected || isSnapped || isHovered ? Math.min(1, baseOpacity + 0.2) : baseOpacity,
                    boxShadow: isSnapped ? `0 0 8px ${baseColor}` : undefined,
                  }}
                />

                {/* Compact Coordinate Tag on Hover / Selection / Drag */}
                {(isHovered || isSelected || isBeingDragged || isSnapped) && (
                  <div
                    className="pointer-events-none absolute px-1.5 py-0.5 rounded text-[9px] font-mono tabular-nums whitespace-nowrap shadow-md border"
                    style={{
                      left: isVertical ? '8px' : '6px',
                      top: isVertical ? '6px' : '8px',
                      backgroundColor: isDeleting ? '#7f1d1d' : '#0f1320',
                      borderColor: baseColor,
                      color: isDeleting ? '#fecdd3' : '#f8fafc',
                    }}
                  >
                    {isDeleting
                      ? 'Soltar sobre regla para eliminar'
                      : `${g.label ? `${g.label} · ` : ''}${isVertical ? 'X' : 'Y'}: ${coordLabel}${isLocked ? ' (Bloq.)' : ''}`}
                  </div>
                )}
              </div>
            );
          })}

          {/* Live Preview Line while creating from ruler or Alt+Duplicating */}
          {dragState && (dragState.mode === 'create' || dragState.mode === 'duplicate') && (() => {
            const isVertical = dragState.orientation === 'vertical';
            const screenCoord = isVertical
              ? originX + dragState.positionPx * effZoom
              : originY + dragState.positionPx * effZoom;
            const axisLen = isVertical ? width : height;
            const coordText = formatRulerCoordinate(
              dragState.positionPx,
              guidesConfig.unit,
              axisLen,
              guidesConfig.customScale,
              guidesConfig.customLabel
            );
            const stroke = dragState.overRulerToDelete
              ? '#f43f5e'
              : dragState.mode === 'duplicate'
              ? '#10b981'
              : '#fbbf24';
            return (
              <div
                className="pointer-events-none absolute"
                style={{
                  left: isVertical ? `${screenCoord}px` : 0,
                  top: isVertical ? 0 : `${screenCoord}px`,
                  width: isVertical ? '2px' : '100%',
                  height: isVertical ? '100%' : '2px',
                  backgroundColor: stroke,
                  boxShadow: `0 0 8px ${stroke}`,
                }}
              >
                <div
                  className="absolute px-2 py-0.5 rounded text-[10px] font-mono tabular-nums whitespace-nowrap shadow-lg border"
                  style={{
                    left: isVertical ? '8px' : `${RULER_THICKNESS + 10}px`,
                    top: isVertical ? `${RULER_THICKNESS + 10}px` : '8px',
                    backgroundColor: '#0f1320',
                    borderColor: stroke,
                    color: '#f8fafc',
                  }}
                >
                  {dragState.overRulerToDelete
                    ? 'Cancelar guía'
                    : `${dragState.mode === 'duplicate' ? '+ Duplicar · ' : '+ Guía · '}${isVertical ? 'X' : 'Y'}: ${coordText}`}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Rulers Overlay (Top Horizontal + Left Vertical + Top-Left Unit Corner) */}
      {guidesConfig.showRulers && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              cycleUnit();
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onOpenGuidesModal?.('perspective');
            }}
            title={`Unidad de regla actual: ${guidesConfig.unit === 'px' ? 'Píxeles (px)' : guidesConfig.unit === 'percent' ? 'Porcentaje (%)' : `Personalizado (${guidesConfig.customScale}px = 1 ${guidesConfig.customLabel})`}. Clic para cambiar · Doble clic para administrar guías y perspectiva.`}
            className="absolute top-0 left-0 z-[36] flex items-center justify-center text-[9px] font-mono font-bold text-amber-300 hover:text-amber-200 hover:bg-[#1b2236] border-r border-b border-slate-700/80 select-none cursor-pointer transition-colors"
            style={{
              width: `${RULER_THICKNESS}px`,
              height: `${RULER_THICKNESS}px`,
              backgroundColor: '#0d111d',
            }}
          >
            {unitBadge}
          </button>

          <canvas
            ref={hRulerCanvasRef}
            onPointerDown={(e) => startCreateFromRuler('horizontal', e)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onOpenGuidesModal?.('exact');
            }}
            title="Arrastra hacia abajo para crear una guía horizontal · Doble clic para crear guía exacta"
            className="absolute top-0 right-0 z-[35] select-none cursor-ns-resize"
            style={{
              left: `${RULER_THICKNESS}px`,
              width: `calc(100% - ${RULER_THICKNESS}px)`,
              height: `${RULER_THICKNESS}px`,
            }}
          />

          <canvas
            ref={vRulerCanvasRef}
            onPointerDown={(e) => startCreateFromRuler('vertical', e)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onOpenGuidesModal?.('exact');
            }}
            title="Arrastra hacia la derecha para crear una guía vertical · Doble clic para crear guía exacta"
            className="absolute left-0 bottom-0 z-[35] select-none cursor-ew-resize"
            style={{
              top: `${RULER_THICKNESS}px`,
              width: `${RULER_THICKNESS}px`,
              height: `calc(100% - ${RULER_THICKNESS}px)`,
            }}
          />
        </>
      )}

      {/* Right-Click Context Menu for Active Guide */}
      {contextMenu &&
        createPortal(
          <div
            className="fixed w-56 rounded-xl border shadow-2xl py-1 flex flex-col text-xs font-sans text-slate-200 bg-[#141724] border-[#2b334a]"
            style={{
              zIndex: STUDIO_Z.CONTEXT_MENU,
              left: Math.min(window.innerWidth - 235, Math.max(8, contextMenu.clientX + 4)),
              top: Math.min(window.innerHeight - 210, Math.max(8, contextMenu.clientY + 4)),
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1 border-b border-[#22283a] text-[10px] font-mono text-slate-400 flex items-center justify-between">
              <span>
                Guía {contextMenu.guide.orientation === 'vertical' ? 'Vertical (X)' : 'Horizontal (Y)'}
              </span>
              <span className="text-amber-300 tabular-nums">{contextMenu.guide.position} px</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onOpenGuidesModal?.('groups');
                setContextMenu(null);
              }}
              className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] text-left"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>Editar posición, grupo y color...</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onDuplicateGuide?.(contextMenu.guide.id);
                setContextMenu(null);
              }}
              className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] text-left"
            >
              <Copy className="w-3.5 h-3.5 text-sky-400" />
              <span>Duplicar guía</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdateGuide?.(contextMenu.guide.id, { locked: !contextMenu.guide.locked });
                setContextMenu(null);
              }}
              className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] text-left"
            >
              {contextMenu.guide.locked ? (
                <Unlock className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{contextMenu.guide.locked ? 'Desbloquear guía' : 'Bloquear guía'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (onChangeGuidesConfig) {
                  onChangeGuidesConfig({ ...guidesConfig, showGuides: false });
                }
                setContextMenu(null);
              }}
              className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] text-left"
            >
              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
              <span>Ocultar todas las guías</span>
            </button>
            <div className="h-[1px] bg-[#22283a] my-1" />
            <button
              type="button"
              onClick={() => {
                onDeleteGuide?.(contextMenu.guide.id);
                setContextMenu(null);
              }}
              className="px-3 py-1.5 flex items-center gap-2 hover:bg-rose-500/15 text-rose-400 text-left"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar guía</span>
            </button>
          </div>,
          document.body
        )}
    </>
  );
};
