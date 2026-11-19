import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Info,
  Sparkles,
  X,
} from 'lucide-react';

/**
 * Global 4-Tier UI Layer ("Capa UI Superior") z-index hierarchy:
 * 1. Topmost: Alerts (250000), Drag HUD (245000), Critical Dialogs (220000), Command Palette F1 (210000), Modals (200000)
 * 2. Menus: Context Menus (182000), Submenus (181000), Dropdown Menus (180000), MenuBar (170000)
 *    — strictly above ALL floating panels, timeline, references, mini panels & contextual bars
 * 3. Floating Panels (60)
 * 4. Base Workspace (10)
 */
export const STUDIO_Z = {
  WORKSPACE: 10,
  FLOATING_PANEL: 60,
  MENU_BAR: 170000,
  MENU: 180000,
  SUBMENU: 181000,
  CONTEXT_MENU: 182000,
  OVERLAY: 190000,
  MODAL: 200000,
  COMMAND_PALETTE: 210000,
  CRITICAL_DIALOG: 220000,
  DRAG_HUD: 245000,
  ALERT_TOAST: 250000,
} as const;

export type StudioTopLayerTier =
  | 'menu'
  | 'context_menu'
  | 'overlay'
  | 'modal'
  | 'command'
  | 'critical'
  | 'alert';

const TIER_Z_MAP: Record<StudioTopLayerTier, number> = {
  menu: STUDIO_Z.MENU,
  context_menu: STUDIO_Z.CONTEXT_MENU,
  overlay: STUDIO_Z.OVERLAY,
  modal: STUDIO_Z.MODAL,
  command: STUDIO_Z.COMMAND_PALETTE,
  critical: STUDIO_Z.CRITICAL_DIALOG,
  alert: STUDIO_Z.ALERT_TOAST,
};

interface StudioTopLayerPortalProps {
  isOpen: boolean;
  tier?: StudioTopLayerTier;
  autoFocus?: boolean;
  ariaRole?: 'dialog' | 'alertdialog';
  pointerEventsNone?: boolean;
  children: React.ReactNode;
}

/**
 * Mounts modals, dialogs, command palette, and system overlays directly into
 * document.body inside an isolated top-tier stacking context so NO panel, menu,
 * floating window, or canvas layer can ever overlap them.
 */
export const StudioTopLayerPortal: React.FC<StudioTopLayerPortalProps> = ({
  isOpen,
  tier = 'modal',
  autoFocus = false,
  ariaRole,
  pointerEventsNone = false,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !autoFocus) return;
    const prevActive = document.activeElement as HTMLElement | null;

    const rafId = window.requestAnimationFrame(() => {
      const root = containerRef.current;
      if (!root) return;
      // Preserve focus if a child already auto-focused itself (e.g. search input)
      if (root.contains(document.activeElement) && document.activeElement !== root) {
        return;
      }
      const focusable = root.querySelector<HTMLElement>(
        'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable) {
        focusable.focus({ preventScroll: true });
      } else {
        root.focus({ preventScroll: true });
      }
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      if (prevActive && prevActive.isConnected && typeof prevActive.focus === 'function') {
        try {
          prevActive.focus({ preventScroll: true });
        } catch {
          // Ignore focus restoration errors
        }
      }
    };
  }, [isOpen, autoFocus]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={containerRef}
      data-studio-top-layer={tier}
      role={ariaRole}
      aria-modal={ariaRole ? true : undefined}
      tabIndex={autoFocus ? -1 : undefined}
      className={`fixed inset-0 outline-none ${pointerEventsNone ? 'pointer-events-none' : ''}`}
      style={{ zIndex: TIER_Z_MAP[tier] }}
    >
      {children}
    </div>,
    document.body
  );
};

export type StudioNotificationSeverity = 'error' | 'warning' | 'success' | 'ai' | 'info';

export interface StudioNotificationItem {
  id: string;
  message: string;
  severity: StudioNotificationSeverity;
  createdAt: number;
  durationMs?: number;
}

/**
 * Automatically classifies any studio message into a semantic alert severity
 * so errors, warnings, AI updates, confirmations, and saves are visually distinct.
 */
export function classifyNotificationSeverity(message: string): StudioNotificationSeverity {
  const lower = message.toLowerCase();
  if (
    lower.includes('error') ||
    lower.includes('falló') ||
    lower.includes('fallo') ||
    lower.includes('no se pudo') ||
    lower.includes('inválid') ||
    lower.includes('failed') ||
    lower.includes('bloquead')
  ) {
    return 'error';
  }
  if (
    lower.includes('advertencia') ||
    lower.includes('aviso') ||
    lower.includes('cuidado') ||
    lower.includes('no hay') ||
    lower.includes('vací') ||
    lower.includes('cancelad') ||
    lower.includes('eliminad') ||
    lower.includes('borrad') ||
    lower.includes('límite')
  ) {
    return 'warning';
  }
  if (
    lower.includes(' ia') ||
    lower.startsWith('ia ') ||
    lower.includes('fx ') ||
    lower.includes('generad') ||
    lower.includes('sparkles')
  ) {
    return 'ai';
  }
  if (
    lower.includes('guardad') ||
    lower.includes('exportad') ||
    lower.includes('importad') ||
    lower.includes('aplicad') ||
    lower.includes('cread') ||
    lower.includes('cargad') ||
    lower.includes('restaurad') ||
    lower.includes('duplicad') ||
    lower.includes('¡')
  ) {
    return 'success';
  }
  return 'info';
}

const SEVERITY_META: Record<
  StudioNotificationSeverity,
  {
    label: string;
    borderColor: string;
    accentColor: string;
    bgTint: string;
    defaultDurationMs: number;
    Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  }
> = {
  error: {
    label: 'Error',
    borderColor: 'rgba(244, 63, 94, 0.85)',
    accentColor: '#fb7185',
    bgTint: 'rgba(69, 10, 24, 0.96)',
    defaultDurationMs: 6500,
    Icon: AlertOctagon,
  },
  warning: {
    label: 'Aviso',
    borderColor: 'rgba(245, 158, 11, 0.85)',
    accentColor: '#fbbf24',
    bgTint: 'rgba(46, 30, 8, 0.96)',
    defaultDurationMs: 4800,
    Icon: AlertTriangle,
  },
  success: {
    label: 'Listo',
    borderColor: 'rgba(16, 185, 129, 0.78)',
    accentColor: '#34d399',
    bgTint: 'rgba(10, 34, 28, 0.95)',
    defaultDurationMs: 3600,
    Icon: CheckCircle2,
  },
  ai: {
    label: 'IA / FX',
    borderColor: 'rgba(167, 139, 250, 0.82)',
    accentColor: '#c4b5fd',
    bgTint: 'rgba(28, 18, 52, 0.95)',
    defaultDurationMs: 4000,
    Icon: Sparkles,
  },
  info: {
    label: 'Estudio',
    borderColor: 'rgba(56, 189, 248, 0.72)',
    accentColor: '#38bdf8',
    bgTint: 'rgba(14, 22, 36, 0.95)',
    defaultDurationMs: 3400,
    Icon: Info,
  },
};

interface NotificationCardProps {
  item: StudioNotificationItem;
  onDismiss: (id: string) => void;
}

const NotificationCard: React.FC<NotificationCardProps> = ({ item, onDismiss }) => {
  const meta = SEVERITY_META[item.severity];
  const Icon = meta.Icon;
  const pausedRef = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const duration = item.durationMs ?? meta.defaultDurationMs;

  useEffect(() => {
    let remaining = duration;
    let lastTick = Date.now();
    const interval = window.setInterval(() => {
      const now = Date.now();
      if (!pausedRef.current) {
        remaining -= now - lastTick;
        if (remaining <= 0) {
          window.clearInterval(interval);
          onDismiss(item.id);
        }
      }
      lastTick = now;
    }, 120);
    return () => window.clearInterval(interval);
  }, [item.id, duration, onDismiss]);

  // Auto-focus critical error alerts so keyboard users can immediately inspect/dismiss with Escape
  useEffect(() => {
    if (item.severity === 'error' && cardRef.current) {
      cardRef.current.focus({ preventScroll: true });
    }
  }, [item.severity]);

  return (
    <div
      ref={cardRef}
      role={item.severity === 'error' || item.severity === 'warning' ? 'alert' : 'status'}
      aria-live={item.severity === 'error' || item.severity === 'warning' ? 'assertive' : 'polite'}
      tabIndex={item.severity === 'error' ? -1 : undefined}
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onDismiss(item.id);
        }
      }}
      className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border shadow-[0_14px_38px_rgba(0,0,0,0.68)] backdrop-blur-md text-xs font-mono max-w-[min(92vw,560px)] transition-all outline-none focus:ring-2 focus:ring-white/40"
      style={{
        backgroundColor: meta.bgTint,
        borderColor: meta.borderColor,
        color: '#f8fafc',
      }}
    >
      <Icon className="w-4 h-4 shrink-0" style={{ color: meta.accentColor }} />
      <span
        className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
        style={{
          backgroundColor: 'rgba(255,255,255,0.08)',
          color: meta.accentColor,
        }}
      >
        {meta.label}
      </span>
      <span className="leading-snug break-words flex-1">{item.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        title="Cerrar notificación"
        aria-label="Cerrar notificación"
        className="p-1 rounded-md hover:bg-white/15 text-slate-300 hover:text-white transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

interface StudioAlertNotificationHostProps {
  notifications: StudioNotificationItem[];
  onDismiss: (id: string) => void;
}

/**
 * Unbeatable top-most Global Alerts & Notifications Layer (z-index 250000).
 * Always renders above menus, toolbars, floating windows, panels, timeline,
 * references, AI panels, context menus, and modal dialogs.
 */
export const StudioAlertNotificationHost: React.FC<StudioAlertNotificationHostProps> = ({
  notifications,
  onDismiss,
}) => {
  if (notifications.length === 0 || typeof document === 'undefined') return null;

  return createPortal(
    <div
      data-studio-top-layer="alert-host"
      className="fixed top-3 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center gap-2 px-3 w-full max-w-[600px]"
      style={{ zIndex: STUDIO_Z.ALERT_TOAST }}
    >
      {notifications.map((item) => (
        <NotificationCard key={item.id} item={item} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  );
};
