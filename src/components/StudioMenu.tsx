import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { STUDIO_Z } from './StudioTopLayer';

export const STUDIO_MENU_PORTAL_ATTR = 'data-studio-menu-portal';

export interface StudioDropdownPortalProps {
  isOpen: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  widthClass?: string;
  minWidthPx?: number;
  maxWidthPx?: number;
  align?: 'left' | 'right';
  offsetY?: number;
  zIndex?: number;
  className?: string;
  children: React.ReactNode;
}

/**
 * Reusable viewport-aware dropdown portal.
 * - Renders directly into document.body at STUDIO_Z.MENU (strictly above all panels,
 *   timeline, references, mini panels and floating windows; strictly below modals & alerts).
 * - Automatically detects viewport edges and repositions left/right/up/down without clipping.
 * - Enforces maxHeight with vertical scroll so deep vertical submenus remain 100% reachable.
 */
export const StudioDropdownPortal: React.FC<StudioDropdownPortalProps> = ({
  isOpen,
  anchorRef,
  widthClass = 'w-64',
  minWidthPx = 220,
  maxWidthPx = 360,
  align = 'left',
  offsetY = 3,
  zIndex = STUDIO_Z.MENU,
  className = '',
  children,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ left: number; top: number; maxHeight: number }>({
    left: 8,
    top: 32,
    maxHeight: 560,
  });

  const recomputePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 8;

    const measuredW = menuRef.current?.offsetWidth || Math.max(minWidthPx, 256);
    const desiredW = Math.min(maxWidthPx, Math.max(minWidthPx, measuredW));
    const measuredH = menuRef.current?.scrollHeight || 320;

    let left = align === 'right' ? rect.right - desiredW : rect.left;
    if (left + desiredW > vw - pad) {
      left = Math.max(pad, vw - desiredW - pad);
    }
    if (left < pad) left = pad;

    const spaceBelow = vh - rect.bottom - offsetY - pad;
    const spaceAbove = rect.top - offsetY - pad;

    let top = rect.bottom + offsetY;
    let maxHeight = Math.max(180, spaceBelow);

    // Flip upward only if space below is very tight AND space above is substantially larger
    if (spaceBelow < Math.min(measuredH, 260) && spaceAbove > spaceBelow + 80) {
      maxHeight = Math.max(180, spaceAbove);
      const actualH = Math.min(measuredH, maxHeight);
      top = Math.max(pad, rect.top - offsetY - actualH);
    }

    setCoords({
      left: Math.round(left),
      top: Math.round(top),
      maxHeight: Math.round(Math.min(vh - pad * 2, maxHeight)),
    });
  }, [anchorRef, align, minWidthPx, maxWidthPx, offsetY]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    recomputePosition();
    const raf = requestAnimationFrame(recomputePosition);
    const onResize = () => recomputePosition();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [isOpen, recomputePosition]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={menuRef}
      {...{ [STUDIO_MENU_PORTAL_ATTR]: 'true' }}
      style={{
        position: 'fixed',
        left: `${coords.left}px`,
        top: `${coords.top}px`,
        maxHeight: `${coords.maxHeight}px`,
        zIndex,
      }}
      className={`${widthClass} overflow-y-auto overflow-x-hidden bg-[#141724] border border-[#2b334a] rounded-xl shadow-[0_18px_44px_rgba(0,0,0,0.68)] py-1 flex flex-col text-xs font-sans text-slate-200 ${className}`}
    >
      {children}
    </div>,
    document.body
  );
};

export interface StudioContextMenuPortalProps {
  isOpen: boolean;
  x: number;
  y: number;
  widthPx?: number;
  zIndex?: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/**
 * Reusable viewport-clamped context menu portal (always rendered at STUDIO_Z.CONTEXT_MENU).
 */
export const StudioContextMenuPortal: React.FC<StudioContextMenuPortalProps> = ({
  isOpen,
  x,
  y,
  widthPx = 236,
  zIndex = STUDIO_Z.CONTEXT_MENU,
  className = '',
  style,
  children,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; maxHeight: number }>({
    left: x,
    top: y,
    maxHeight: 520,
  });

  useLayoutEffect(() => {
    if (!isOpen) return;
    const pad = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const elW = ref.current?.offsetWidth || widthPx;
    const elH = ref.current?.scrollHeight || 320;

    let left = x;
    if (left + elW > vw - pad) {
      left = Math.max(pad, x - elW);
    }
    left = Math.max(pad, Math.min(left, vw - elW - pad));

    let top = y;
    const maxHeight = vh - pad * 2;
    const clampedH = Math.min(elH, maxHeight);
    if (top + clampedH > vh - pad) {
      top = Math.max(pad, vh - clampedH - pad);
    }

    setPos({ left: Math.round(left), top: Math.round(top), maxHeight });
  }, [isOpen, x, y, widthPx]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={ref}
      {...{ [STUDIO_MENU_PORTAL_ATTR]: 'true' }}
      style={{
        position: 'fixed',
        left: `${pos.left}px`,
        top: `${pos.top}px`,
        maxHeight: `${pos.maxHeight}px`,
        zIndex,
        ...style,
      }}
      className={`overflow-y-auto overflow-x-hidden rounded-xl border shadow-[0_18px_44px_rgba(0,0,0,0.68)] py-1 flex flex-col ${className}`}
    >
      {children}
    </div>,
    document.body
  );
};

export interface StudioVerticalSubMenuProps {
  label: string;
  icon?: React.ReactNode;
  badge?: string;
  accent?: boolean;
  defaultOpen?: boolean;
  /** Nesting depth for subtle vertical tree indentation (auto-clean up to any depth) */
  depth?: number;
  /** Keep legacy widthClass prop accepted so existing callers never break */
  widthClass?: string;
  children: React.ReactNode;
}

/**
 * Strictly VERTICAL nested submenu component.
 * - Opens inline downwards inside the parent menu without breaking layout or exploding horizontally off-screen.
 * - Keeps unlimited nesting levels (e.g. Ventana -> Paneles -> Mini Paneles -> ...) simultaneously visible.
 * - Active path highlighting + smart hover-intent with graceful close delay + click-to-pin toggle.
 * - Automatically scrolls nested items into view if expanded near the bottom edge.
 */
export const StudioVerticalSubMenu: React.FC<StudioVerticalSubMenuProps> = ({
  label,
  icon,
  badge,
  accent = false,
  defaultOpen = false,
  depth = 0,
  children,
}) => {
  const [open, setOpen] = useState<boolean>(defaultOpen);
  const [pinned, setPinned] = useState<boolean>(defaultOpen);
  const containerRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // Ensure newly expanded nested branch is visible within the scrollable menu
  useEffect(() => {
    if (!open || !containerRef.current) return;
    const raf = requestAnimationFrame(() => {
      containerRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const handleMouseEnter = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (!open) {
      openTimerRef.current = window.setTimeout(() => {
        setOpen(true);
      }, 165);
    }
  };

  const handleMouseLeave = () => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    // Never auto-collapse a menu branch that the user explicitly clicked open
    if (pinned) return;
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
    }, 340);
  };

  const handleClickToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearTimers();
    setOpen((prev) => {
      const next = !prev;
      setPinned(next);
      return next;
    });
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col transition-colors ${
        open ? 'bg-[#191f31]/75 my-0.5 rounded-lg mx-1 border border-[#2a3450]/80' : ''
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={handleClickToggle}
        aria-expanded={open}
        className={`w-full px-3 py-1.5 flex items-center justify-between gap-2 transition-colors text-left cursor-pointer ${
          open
            ? 'bg-amber-400/12 text-amber-200 font-semibold rounded-t-lg'
            : accent
            ? 'font-semibold text-amber-200 hover:bg-[#20273a]'
            : 'text-slate-200 hover:bg-[#20273a]'
        }`}
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          {icon}
          <span className="truncate">{label}</span>
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          {badge && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
              {badge}
            </span>
          )}
          {open ? (
            <ChevronDown className="w-3.5 h-3.5 text-amber-400 shrink-0 transition-transform" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform" />
          )}
        </span>
      </button>

      {open && (
        <div
          className="flex flex-col py-1 pl-2.5 pr-0.5 ml-2.5 border-l-2 border-amber-400/45 bg-[#101421]/85 rounded-b-lg"
          style={{
            marginLeft: depth > 0 ? '8px' : '10px',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export const StudioMenuDivider: React.FC = () => (
  <div className="h-[1px] bg-[#22283a] my-1 shrink-0" />
);

export const StudioMenuSectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 select-none">
    {children}
  </div>
);
