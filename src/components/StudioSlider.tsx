import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { STUDIO_Z } from './StudioTopLayer';

export interface StudioSliderProps {
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  defaultValue?: number;
  onChange: (value: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  variant?: 'compact' | 'panel' | 'inline';
  widthClass?: string;
  accentColor?: string;
  /** Optional custom CSS background for the track rail (e.g. RGB/HSL/Alpha gradients) */
  trackBackground?: string;
  /** Show checkerboard behind trackBackground (for Alpha/Opacity sliders) */
  checkerboard?: boolean;
  /** Hide solid accent progress fill (useful with gradient trackBackground) */
  hideFill?: boolean;
  disabled?: boolean;
  title?: string;
  formatValue?: (val: number) => string;
  className?: string;
  showLabel?: boolean;
  showValue?: boolean;
  /** Fixed width class for inline label (e.g. 'w-14') */
  labelWidthClass?: string;
  /** Fixed width class for inline value readout (e.g. 'w-10') */
  valueWidthClass?: string;
  /** Allow manually typed values beyond visual slider max (and auto-expand track scale) */
  allowManualOverflow?: boolean;
  /** Hard minimum when typing manually (defaults to min) */
  hardMin?: number;
  /** Hard maximum when typing manually when allowManualOverflow is true (defaults to 2048) */
  hardMax?: number;
}

function getStepPrecision(step: number): number {
  const str = String(step);
  const dot = str.indexOf('.');
  return dot === -1 ? 0 : str.length - dot - 1;
}

function roundToStep(val: number, min: number, max: number, step: number): number {
  if (max <= min) return min;
  const clamped = Math.max(min, Math.min(max, val));
  const safeStep = step > 0 ? step : 1;
  const snapped = min + Math.round((clamped - min) / safeStep) * safeStep;
  const finalVal = Math.max(min, Math.min(max, snapped));
  const prec = getStepPrecision(safeStep);
  return prec > 0 ? Number(finalVal.toFixed(prec)) : Math.round(finalVal);
}

interface DragSession {
  pointerId: number;
  grabOffsetX: number;
  wasShift: boolean;
  fineAnchorX: number | null;
  fineAnchorVal: number;
  lastEmittedVal: number;
  prevBodyCursor: string;
}

export const StudioSlider: React.FC<StudioSliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  defaultValue,
  onChange,
  onDragStart,
  onDragEnd,
  variant = 'panel',
  widthClass,
  accentColor = 'var(--studio-accent)',
  trackBackground,
  checkerboard = false,
  hideFill = false,
  disabled = false,
  title,
  formatValue,
  className = '',
  showLabel = true,
  showValue = true,
  labelWidthClass,
  valueWidthClass,
  allowManualOverflow = false,
  hardMin,
  hardMax,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isShiftFine, setIsShiftFine] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [hudPos, setHudPos] = useState<{ x: number; y: number } | null>(null);

  const effectiveMin = allowManualOverflow ? Math.min(min, value) : min;
  const effectiveMax = allowManualOverflow ? Math.max(max, value) : max;
  const manualMin = hardMin !== undefined ? hardMin : min;
  const manualMax =
    hardMax !== undefined
      ? hardMax
      : allowManualOverflow
      ? Math.max(2048, max, value)
      : max;

  // Keep latest props in refs so native window drag & wheel listeners never use stale closures
  const latestRef = useRef({
    value,
    min: effectiveMin,
    max: effectiveMax,
    manualMin,
    manualMax,
    step,
    disabled,
    onChange,
    onDragStart,
    onDragEnd,
  });
  latestRef.current = {
    value,
    min: effectiveMin,
    max: effectiveMax,
    manualMin,
    manualMax,
    step,
    disabled,
    onChange,
    onDragStart,
    onDragEnd,
  };

  const isDraggingRef = useRef(false);
  const dragSessionRef = useRef<DragSession | null>(null);
  const windowCleanupRef = useRef<(() => void) | null>(null);

  const safeRange = Math.max(1e-6, effectiveMax - effectiveMin);
  const clampedValue =
    effectiveMax <= effectiveMin
      ? effectiveMin
      : Math.max(effectiveMin, Math.min(effectiveMax, value));
  const ratio =
    effectiveMax <= effectiveMin
      ? 0
      : Math.max(0, Math.min(1, (clampedValue - effectiveMin) / safeRange));
  const isBipolar = effectiveMin < 0 && effectiveMax > 0;
  const zeroRatio = isBipolar ? Math.max(0, Math.min(1, (0 - effectiveMin) / safeRange)) : 0;

  const precision = getStepPrecision(step);
  const formattedNumber = formatValue
    ? formatValue(clampedValue)
    : precision > 0
    ? clampedValue.toFixed(precision)
    : String(Math.round(clampedValue));

  const commitValue = useCallback(
    (next: number, useManualBounds: boolean = false) => {
      const cur = latestRef.current;
      if (cur.disabled) return;
      const lo = useManualBounds ? cur.manualMin : cur.min;
      const hi = useManualBounds ? cur.manualMax : cur.max;
      const quantized = roundToStep(next, lo, hi, cur.step);
      if (quantized !== cur.value) {
        cur.onChange(quantized);
      }
    },
    []
  );

  // Clean up any active global drag listeners if unmounted mid-drag
  useEffect(() => {
    return () => {
      if (windowCleanupRef.current) {
        windowCleanupRef.current();
        windowCleanupRef.current = null;
      }
    };
  }, []);

  // Non-passive mouse wheel adjustment so hovering & scrolling adjusts smoothly without scrolling panels
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      const cur = latestRef.current;
      if (cur.disabled || cur.max <= cur.min) return;
      if (document.activeElement === inputRef.current) return;
      e.preventDefault();
      e.stopPropagation();

      const direction = e.deltaY < 0 || e.deltaX > 0 ? 1 : -1;
      const span = cur.max - cur.min;
      const coarseMul = e.shiftKey ? (span >= 100 ? 10 : 5) : 1;
      const delta = cur.step * coarseMul * direction;
      const next = roundToStep(cur.value + delta, cur.min, cur.max, cur.step);
      if (next !== cur.value) {
        cur.onChange(next);
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const updateHudAnchor = useCallback((rect: DOMRect, nextRatio: number) => {
    const rawX = rect.left + Math.max(0, Math.min(1, nextRatio)) * rect.width;
    const clampedX = Math.max(44, Math.min(window.innerWidth - 44, rawX));
    const y = rect.top > 38 ? rect.top - 8 : rect.bottom + 30;
    setHudPos({ x: clampedX, y });
  }, []);

  const finishDrag = useCallback(() => {
    const session = dragSessionRef.current;
    if (windowCleanupRef.current) {
      windowCleanupRef.current();
      windowCleanupRef.current = null;
    }
    if (session) {
      const track = trackRef.current;
      if (track) {
        try {
          if (track.hasPointerCapture(session.pointerId)) {
            track.releasePointerCapture(session.pointerId);
          }
        } catch {
          // Ignore if capture was already released
        }
      }
      document.body.style.cursor = session.prevBodyCursor;
    }
    dragSessionRef.current = null;
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
      setIsShiftFine(false);
      setHudPos(null);
      latestRef.current.onDragEnd?.();
    }
  }, []);

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const cur = latestRef.current;
    if (cur.disabled || cur.max <= cur.min || e.button !== 0 || isEditing) return;

    e.preventDefault();
    e.stopPropagation();

    const track = trackRef.current;
    if (!track) return;

    // Clean any stale drag session defensively
    if (isDraggingRef.current) {
      finishDrag();
    }

    try {
      track.setPointerCapture(e.pointerId);
    } catch {
      // Fallback handled by window listeners below
    }
    track.focus({ preventScroll: true });

    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return;

    const currentRatio = Math.max(0, Math.min(1, (cur.value - cur.min) / Math.max(1e-6, cur.max - cur.min)));
    const thumbCenterX = rect.left + currentRatio * rect.width;
    const grabbedThumbDirectly = Math.abs(e.clientX - thumbCenterX) <= 10;

    let initialVal = cur.value;
    let grabOffsetX = 0;

    if (grabbedThumbDirectly) {
      // Smoothly grab the thumb without sudden value jump on click
      grabOffsetX = e.clientX - thumbCenterX;
    } else {
      // Direct click on track: jump immediately to clicked position AND stay captured for continuous drag
      const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      initialVal = roundToStep(cur.min + t * (cur.max - cur.min), cur.min, cur.max, cur.step);
      if (initialVal !== cur.value) {
        cur.onChange(initialVal);
      }
    }

    const prevBodyCursor = document.body.style.cursor;
    document.body.style.cursor = 'grabbing';

    dragSessionRef.current = {
      pointerId: e.pointerId,
      grabOffsetX,
      wasShift: e.shiftKey,
      fineAnchorX: e.shiftKey ? e.clientX : null,
      fineAnchorVal: initialVal,
      lastEmittedVal: initialVal,
      prevBodyCursor,
    };
    isDraggingRef.current = true;
    setIsDragging(true);
    setIsShiftFine(e.shiftKey);
    const initRatio = Math.max(0, Math.min(1, (initialVal - cur.min) / Math.max(1e-6, cur.max - cur.min)));
    updateHudAnchor(rect, initRatio);
    cur.onDragStart?.();

    const handleWindowPointerMove = (ev: PointerEvent) => {
      const session = dragSessionRef.current;
      if (!isDraggingRef.current || !session) return;
      if (ev.pointerId !== session.pointerId) return;

      // Safety release if primary mouse button was released outside iframe/window
      if (ev.pointerType === 'mouse' && (ev.buttons & 1) === 0) {
        finishDrag();
        return;
      }

      const live = latestRef.current;
      if (live.disabled || live.max <= live.min) {
        finishDrag();
        return;
      }

      const liveTrack = trackRef.current;
      if (!liveTrack) return;
      const liveRect = liveTrack.getBoundingClientRect();
      if (liveRect.width <= 0) return;

      ev.preventDefault();

      let rawNext: number;
      if (ev.shiftKey) {
        // Shift = precision fine scrubbing (0.2x speed)
        if (!session.wasShift || session.fineAnchorX === null) {
          session.wasShift = true;
          session.fineAnchorX = ev.clientX;
          session.fineAnchorVal = session.lastEmittedVal;
          setIsShiftFine(true);
        }
        const dx = ev.clientX - session.fineAnchorX;
        const fineDelta = (dx / Math.max(1, liveRect.width)) * (live.max - live.min) * 0.2;
        rawNext = session.fineAnchorVal + fineDelta;
      } else {
        if (session.wasShift) {
          session.wasShift = false;
          session.fineAnchorX = null;
          session.grabOffsetX = 0;
          setIsShiftFine(false);
        }
        const effectiveX = ev.clientX - session.grabOffsetX;
        const t = Math.max(0, Math.min(1, (effectiveX - liveRect.left) / liveRect.width));
        rawNext = live.min + t * (live.max - live.min);
      }

      const quantized = roundToStep(rawNext, live.min, live.max, live.step);
      const nextRatio = Math.max(0, Math.min(1, (quantized - live.min) / Math.max(1e-6, live.max - live.min)));
      updateHudAnchor(liveRect, nextRatio);

      if (quantized !== session.lastEmittedVal) {
        session.lastEmittedVal = quantized;
        live.onChange(quantized);
      }
    };

    const handleWindowPointerUp = (ev: PointerEvent) => {
      const session = dragSessionRef.current;
      if (!session || ev.pointerId !== session.pointerId) return;
      finishDrag();
    };

    const handleWindowBlur = () => {
      finishDrag();
    };

    window.addEventListener('pointermove', handleWindowPointerMove, { passive: false });
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
    window.addEventListener('blur', handleWindowBlur);

    windowCleanupRef.current = () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  };

  const handleTrackDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || defaultValue === undefined) return;
    commitValue(defaultValue);
  };

  const startManualEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    setDraft(precision > 0 ? clampedValue.toFixed(precision) : String(Math.round(clampedValue)));
    setIsEditing(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  };

  const commitManualEdit = () => {
    const normalized = draft.replace(',', '.').trim();
    const parsed = parseFloat(normalized);
    if (!Number.isNaN(parsed)) {
      commitValue(parsed, true);
    }
    setIsEditing(false);
  };

  const handleSliderKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || isEditing) return;
    const span = effectiveMax - effectiveMin;
    const largeStep = Math.max(
      step * 5,
      roundToStep(effectiveMin + span * 0.1, effectiveMin, effectiveMax, step) - effectiveMin
    );

    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      commitValue(clampedValue + (e.shiftKey ? Math.max(step * 10, largeStep) : step));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      commitValue(clampedValue - (e.shiftKey ? Math.max(step * 10, largeStep) : step));
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      commitValue(clampedValue + largeStep);
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      commitValue(clampedValue - largeStep);
    } else if (e.key === 'Home') {
      e.preventDefault();
      commitValue(effectiveMin);
    } else if (e.key === 'End') {
      e.preventDefault();
      commitValue(effectiveMax);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setDraft(precision > 0 ? clampedValue.toFixed(precision) : String(Math.round(clampedValue)));
      setIsEditing(true);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  };

  const fillLeftPct = isBipolar ? Math.min(zeroRatio, ratio) * 100 : 0;
  const fillWidthPct = isBipolar ? Math.abs(ratio - zeroRatio) * 100 : ratio * 100;

  const tooltipText = `${title || label || 'Ajustar'}: ${formattedNumber}${unit} · Arrastra el indicador, haz clic en la barra, usa la rueda, flechas o clic en el número${
    defaultValue !== undefined ? ' · Doble clic restablece' : ''
  }`;

  const floatingDragHud =
    isDragging && hudPos && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed pointer-events-none -translate-x-1/2 -translate-y-full px-2 py-0.5 rounded-md border shadow-xl font-mono tabular-nums text-[10px] flex items-center gap-1.5 whitespace-nowrap"
            style={{
              zIndex: STUDIO_Z.DRAG_HUD,
              left: `${hudPos.x}px`,
              top: `${hudPos.y}px`,
              backgroundColor: 'var(--studio-bg-card)',
              borderColor: accentColor,
              color: 'var(--studio-text)',
              boxShadow: `0 6px 18px rgba(0, 0, 0, 0.45), 0 0 0 1px color-mix(in srgb, ${accentColor} 35%, transparent)`,
            }}
          >
            {label && <span className="opacity-70">{label}</span>}
            <span className="font-bold" style={{ color: accentColor }}>
              {formattedNumber}
              {unit}
            </span>
            {isShiftFine && (
              <span className="text-[9px] opacity-80 border-l pl-1" style={{ borderColor: 'var(--studio-border-strong)' }}>
                Fino
              </span>
            )}
          </div>,
          document.body
        )
      : null;

  const renderTrackRail = (isCompact: boolean) => {
    const isGradientBar = Boolean(trackBackground);
    const railHeightClass = isGradientBar ? 'h-3.5 rounded-md border border-black/35' : 'h-1.5 rounded-full';

    return (
      <>
        {/* Rail */}
        <div
          className={`w-full relative overflow-hidden ${railHeightClass} ${checkerboard ? 'canvas-checkerboard' : ''}`}
          style={{
            backgroundColor: isGradientBar ? undefined : 'rgba(148, 163, 184, 0.24)',
          }}
        >
          {isGradientBar && (
            <div className="absolute inset-0 pointer-events-none" style={{ background: trackBackground }} />
          )}
          {!isGradientBar && isBipolar && (
            <div
              className="absolute top-0 bottom-0 w-px bg-slate-400/75 pointer-events-none"
              style={{ left: `${zeroRatio * 100}%` }}
            />
          )}
          {!hideFill && !isGradientBar && (
            <div
              className="absolute top-0 bottom-0 rounded-full pointer-events-none"
              style={{
                left: `${fillLeftPct}%`,
                width: `${fillWidthPct}%`,
                backgroundColor: accentColor,
              }}
            />
          )}
        </div>

        {/* Draggable Thumb Indicator */}
        {isGradientBar ? (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-sm border shadow-md pointer-events-none"
            style={{
              left: `${ratio * 100}%`,
              width: isDragging ? 9 : 7,
              height: isDragging ? 18 : 16,
              backgroundColor: '#ffffff',
              borderColor: isDragging ? accentColor : '#0f172a',
              boxShadow: isDragging
                ? `0 0 0 2px color-mix(in srgb, ${accentColor} 55%, transparent)`
                : '0 1px 3px rgba(0,0,0,0.6)',
            }}
          />
        ) : (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 shadow pointer-events-none"
            style={{
              left: `${ratio * 100}%`,
              width: isCompact ? (isDragging ? 13 : isHovered ? 11 : 10) : isDragging ? 14 : isHovered ? 13 : 11,
              height: isCompact ? (isDragging ? 13 : isHovered ? 11 : 10) : isDragging ? 14 : isHovered ? 13 : 11,
              backgroundColor: '#ffffff',
              borderColor: accentColor,
              boxShadow: isDragging
                ? `0 0 0 4px color-mix(in srgb, ${accentColor} 36%, transparent)`
                : isHovered
                ? `0 0 0 2px color-mix(in srgb, ${accentColor} 22%, transparent)`
                : '0 1px 3px rgba(0,0,0,0.45)',
            }}
          />
        )}
      </>
    );
  };

  // =========================================================================
  // COMPACT VARIANT — Contextual Options Bar / Floating Inspector / Header
  // =========================================================================
  if (variant === 'compact') {
    return (
      <>
        <div
          ref={containerRef}
          data-no-pan="true"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          title={tooltipText}
          className={`h-6 px-1.5 rounded border flex items-center gap-1.5 text-[10px] select-none shrink-0 transition-colors ${
            disabled ? 'opacity-45 pointer-events-none' : ''
          } ${widthClass || ''} ${className}`}
          style={{
            backgroundColor: isDragging
              ? 'color-mix(in srgb, var(--studio-bg-elevated) 85%, var(--studio-accent) 15%)'
              : 'var(--studio-bg-elevated)',
            borderColor:
              isDragging || isEditing
                ? accentColor
                : isHovered
                ? 'var(--studio-border-strong)'
                : 'var(--studio-border)',
            boxShadow: isDragging
              ? `0 0 0 1px color-mix(in srgb, ${accentColor} 45%, transparent)`
              : undefined,
            color: 'var(--studio-text)',
          }}
        >
          {showLabel && label && (
            <span
              onDoubleClick={handleTrackDoubleClick}
              className="opacity-80 whitespace-nowrap shrink-0 cursor-default"
            >
              {label}
            </span>
          )}

          {/* Interactive Track + Captured Thumb */}
          <div
            ref={trackRef}
            role="slider"
            tabIndex={disabled ? -1 : 0}
            aria-label={label || title || 'Slider'}
            aria-valuemin={effectiveMin}
            aria-valuemax={effectiveMax}
            aria-valuenow={clampedValue}
            onPointerDown={handleTrackPointerDown}
            onDoubleClick={handleTrackDoubleClick}
            onKeyDown={handleSliderKeyDown}
            className={`relative flex-1 min-w-[60px] h-5 flex items-center outline-none focus-visible:ring-1 focus-visible:ring-amber-400 rounded-sm touch-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-pointer'
            }`}
          >
            {renderTrackRail(true)}
          </div>

          {/* Click-to-edit Numeric Value */}
          {showValue &&
            (isEditing ? (
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitManualEdit}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') {
                    commitManualEdit();
                  } else if (e.key === 'Escape') {
                    setIsEditing(false);
                  }
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="w-11 h-4 px-1 rounded text-right font-mono tabular-nums text-[10px] outline-none border"
                style={{
                  backgroundColor: 'var(--studio-bg-card)',
                  borderColor: accentColor,
                  color: 'var(--studio-text)',
                }}
              />
            ) : (
              <button
                type="button"
                onClick={startManualEdit}
                onPointerDown={(e) => e.stopPropagation()}
                title="Haz clic para escribir un valor exacto"
                className="font-mono tabular-nums text-[10px] min-w-[30px] text-right px-0.5 rounded hover:bg-white/10 transition-colors cursor-text shrink-0"
                style={{ color: isDragging ? accentColor : 'var(--studio-text)', fontWeight: isDragging ? 700 : 500 }}
              >
                {formattedNumber}
                {unit && <span className="opacity-65">{unit}</span>}
              </button>
            ))}
        </div>
        {floatingDragHud}
      </>
    );
  }

  // =========================================================================
  // INLINE VARIANT — Single-row Color Channels (RGB/HSL), Palette Lab, Timeline
  // =========================================================================
  if (variant === 'inline') {
    return (
      <>
        <div
          ref={containerRef}
          data-no-pan="true"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          title={tooltipText}
          className={`flex items-center gap-2 text-[10px] font-mono select-none ${
            disabled ? 'opacity-45 pointer-events-none' : ''
          } ${widthClass || ''} ${className}`}
        >
          {showLabel && label && (
            <span
              onDoubleClick={handleTrackDoubleClick}
              className={`shrink-0 truncate cursor-default font-semibold ${labelWidthClass || ''}`}
              style={{ color: isDragging ? accentColor : 'var(--studio-text-muted)' }}
            >
              {label}
            </span>
          )}

          <div
            ref={trackRef}
            role="slider"
            tabIndex={disabled ? -1 : 0}
            aria-label={label || title || 'Slider'}
            aria-valuemin={effectiveMin}
            aria-valuemax={effectiveMax}
            aria-valuenow={clampedValue}
            onPointerDown={handleTrackPointerDown}
            onDoubleClick={handleTrackDoubleClick}
            onKeyDown={handleSliderKeyDown}
            className={`relative flex-1 min-w-[56px] h-5 flex items-center outline-none focus-visible:ring-1 focus-visible:ring-amber-400 rounded touch-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-pointer'
            }`}
          >
            {renderTrackRail(false)}
          </div>

          {showValue &&
            (isEditing ? (
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitManualEdit}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') {
                    commitManualEdit();
                  } else if (e.key === 'Escape') {
                    setIsEditing(false);
                  }
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className={`${valueWidthClass || 'w-11'} h-4 px-1 rounded text-right font-mono tabular-nums text-[10px] outline-none border`}
                style={{
                  backgroundColor: 'var(--studio-bg-elevated)',
                  borderColor: accentColor,
                  color: 'var(--studio-text)',
                }}
              />
            ) : (
              <button
                type="button"
                onClick={startManualEdit}
                onPointerDown={(e) => e.stopPropagation()}
                title="Clic para ingresar valor manualmente"
                className={`${valueWidthClass || 'min-w-[36px]'} px-0.5 rounded text-right font-semibold tabular-nums hover:bg-white/10 transition-colors cursor-text shrink-0`}
                style={{ color: isDragging || isHovered ? accentColor : 'var(--studio-text)' }}
              >
                {formattedNumber}
                {unit}
              </button>
            ))}
        </div>
        {floatingDragHud}
      </>
    );
  }

  // =========================================================================
  // PANEL VARIANT — Inspector / Brush / Filters / Symmetry / Layers / AI / Pose
  // =========================================================================
  return (
    <>
      <div
        ref={containerRef}
        data-no-pan="true"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={tooltipText}
        className={`flex flex-col gap-1 select-none rounded-md transition-colors ${
          disabled ? 'opacity-45 pointer-events-none' : ''
        } ${widthClass || ''} ${className}`}
      >
        {(showLabel && label) || showValue ? (
          <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
            {showLabel && label ? (
              <span
                onDoubleClick={handleTrackDoubleClick}
                className="truncate cursor-default transition-colors"
                style={{ color: isDragging ? accentColor : 'var(--studio-text-muted)' }}
              >
                {label}
              </span>
            ) : (
              <span />
            )}

            {showValue &&
              (isEditing ? (
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="decimal"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commitManualEdit}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') {
                      commitManualEdit();
                    } else if (e.key === 'Escape') {
                      setIsEditing(false);
                    }
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="w-14 px-1.5 py-0 rounded text-right font-mono tabular-nums text-[10px] outline-none border"
                  style={{
                    backgroundColor: 'var(--studio-bg-elevated)',
                    borderColor: accentColor,
                    color: 'var(--studio-text)',
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={startManualEdit}
                  onPointerDown={(e) => e.stopPropagation()}
                  title="Clic para ingresar valor manualmente"
                  className="px-1 rounded font-semibold tabular-nums hover:bg-white/10 transition-colors cursor-text shrink-0"
                  style={{ color: isDragging || isHovered ? accentColor : 'var(--studio-text)' }}
                >
                  {formattedNumber}
                  {unit}
                </button>
              ))}
          </div>
        ) : null}

        {/* Full-width Fluid Interactive Bar with Captured Thumb */}
        <div
          ref={trackRef}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={label || title || 'Slider'}
          aria-valuemin={effectiveMin}
          aria-valuemax={effectiveMax}
          aria-valuenow={clampedValue}
          onPointerDown={handleTrackPointerDown}
          onDoubleClick={handleTrackDoubleClick}
          onKeyDown={handleSliderKeyDown}
          className={`relative w-full h-5 flex items-center outline-none focus-visible:ring-1 focus-visible:ring-amber-400 rounded touch-none ${
            isDragging ? 'cursor-grabbing' : 'cursor-pointer'
          }`}
        >
          {renderTrackRail(false)}
        </div>
      </div>
      {floatingDragHud}
    </>
  );
};
