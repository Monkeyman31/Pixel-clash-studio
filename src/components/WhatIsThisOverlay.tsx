import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Compass, HelpCircle, Keyboard, MapPin, X } from 'lucide-react';
import { findHelpItemById, HELP_CATALOG_ITEMS, HelpCatalogItem } from '../utils/helpCatalog';

interface WhatIsThisOverlayProps {
  active: boolean;
  onClose: () => void;
  onOpenHelpItem: (item: HelpCatalogItem) => void;
  spotlightTarget: { helpId: string; label: string; hint?: string } | null;
  onClearSpotlight: () => void;
  onReportError?: (ctx: { action: string; selectedResult?: string; panelId?: string; error: unknown }) => void;
}

/**
 * Safely scrolls ONLY truly scrollable (overflow: auto | scroll) ancestor containers
 * so `overflow: hidden` application shells, `html`, or `body` are NEVER displaced off-screen.
 */
function scrollOnlyScrollableAncestors(el: HTMLElement): void {
  let parent = el.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    const overflowX = style.overflowX;
    const canScrollY =
      (overflowY === 'auto' || overflowY === 'scroll') &&
      parent.scrollHeight > parent.clientHeight + 2;
    const canScrollX =
      (overflowX === 'auto' || overflowX === 'scroll') &&
      parent.scrollWidth > parent.clientWidth + 2;

    if (canScrollY || canScrollX) {
      const parentRect = parent.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      if (canScrollY) {
        if (elRect.top < parentRect.top + 12 || elRect.bottom > parentRect.bottom - 12) {
          const deltaY =
            elRect.top - parentRect.top - (parentRect.height / 2 - elRect.height / 2);
          parent.scrollTop = Math.max(0, parent.scrollTop + deltaY);
        }
      }
      if (canScrollX) {
        if (elRect.left < parentRect.left + 12 || elRect.right > parentRect.right - 12) {
          const deltaX =
            elRect.left - parentRect.left - (parentRect.width / 2 - elRect.width / 2);
          parent.scrollLeft = Math.max(0, parent.scrollLeft + deltaX);
        }
      }
    }
    parent = parent.parentElement;
  }
}

function findVisibleHelpElement(helpId: string): HTMLElement | null {
  const selectors = [
    `[data-help-id="${helpId}"]`,
    helpId.startsWith('panel.') ? `[data-panel-id="${helpId.replace('panel.', '')}"]` : '',
    helpId.startsWith('anim.') ? `[data-panel-id="animation"]` : '',
    helpId === 'tool.shading' || helpId === 'tool.smear' || helpId === 'tool.dither'
      ? `[data-panel-id="brushes"]`
      : '',
    helpId === 'tool.move_reference' ? `[data-help-id="tool.move"]` : '',
    helpId === 'panel.pureref' ? `[data-panel-id="references"]` : '',
  ].filter(Boolean);

  for (const sel of selectors) {
    try {
      const matches = Array.from(document.querySelectorAll(sel)) as HTMLElement[];
      const visible = matches.find((m) => {
        const r = m.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      if (visible) return visible;
    } catch {
      // Ignore malformed selector
    }
  }
  return null;
}

export const WhatIsThisOverlay: React.FC<WhatIsThisOverlayProps> = ({
  active,
  onClose,
  onOpenHelpItem,
  spotlightTarget,
  onClearSpotlight,
  onReportError,
}) => {
  const [hoveredItem, setHoveredItem] = useState<HelpCatalogItem | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 24, y: 72 });
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [spotlightFallbackOnly, setSpotlightFallbackOnly] = useState<boolean>(false);

  const onCloseRef = useRef(onClose);
  const onOpenHelpItemRef = useRef(onOpenHelpItem);
  const onClearSpotlightRef = useRef(onClearSpotlight);
  const onReportErrorRef = useRef(onReportError);
  useEffect(() => {
    onCloseRef.current = onClose;
    onOpenHelpItemRef.current = onOpenHelpItem;
    onClearSpotlightRef.current = onClearSpotlight;
    onReportErrorRef.current = onReportError;
  });

  // Shift+F1 Inspector hover tracking
  useEffect(() => {
    if (!active) {
      setHoveredItem(null);
      return;
    }

    const resolveHelpItemFromElement = (target: EventTarget | null): HelpCatalogItem | null => {
      try {
        let el = target as HTMLElement | null;
        while (el && el !== document.body) {
          const helpId = el.getAttribute?.('data-help-id');
          if (helpId) {
            const found = findHelpItemById(helpId);
            if (found) return found;
            const customTitle = el.getAttribute('title') || el.getAttribute('aria-label');
            if (customTitle) {
              return {
                id: helpId,
                name: customTitle,
                category: 'Herramientas',
                location:
                  el.closest('[data-dock-zone]')?.getAttribute('data-dock-zone') ||
                  'Espacio de trabajo',
                howToAccess: 'Haz clic directamente en este control.',
                hotkey: '—',
                description: customTitle,
                useCases: ['Control interactivo del estudio.'],
                demoType: 'workspace_ui',
              };
            }
          }
          if (!el.hasAttribute('data-what-is-this-ignore')) {
            const roleMatch =
              el.tagName === 'BUTTON' ||
              el.getAttribute('role') === 'button' ||
              el.hasAttribute('data-panel-id');
            if (roleMatch) {
              const panelId = el.getAttribute('data-panel-id');
              if (panelId) {
                const panelItem = findHelpItemById(`panel.${panelId}`);
                if (panelItem) return panelItem;
              }
              const label = el.getAttribute('title') || el.getAttribute('aria-label');
              if (label && label.trim().length > 2) {
                const lower = label.toLowerCase();
                const matched = HELP_CATALOG_ITEMS.find(
                  (it) =>
                    lower.includes(it.name.toLowerCase()) ||
                    (it.toolId && lower.includes(it.toolId))
                );
                if (matched) return matched;
                return {
                  id: 'ui.control',
                  name: label.split('(')[0].trim(),
                  category: 'Interfaz y Proyecto',
                  location: 'Control de interfaz',
                  howToAccess: 'Haz clic directamente en el control resaltado.',
                  hotkey: label.match(/\(([^)]+)\)/)?.[1] || '—',
                  description: label,
                  useCases: ['Acción rápida de la interfaz de PixelClash Studio.'],
                  demoType: 'workspace_ui',
                };
              }
            }
          }
          el = el.parentElement;
        }
      } catch (err) {
        onReportErrorRef.current?.({ action: 'inspect_hover', error: err });
      }
      return null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
      const elUnder = document.elementFromPoint(e.clientX, e.clientY);
      if (
        elUnder &&
        (elUnder.closest('[data-what-is-this-ui]') ||
          elUnder.closest('[data-studio-top-layer="modal"]') ||
          elUnder.closest('[data-studio-top-layer="command"]'))
      ) {
        return;
      }
      const item = resolveHelpItemFromElement(elUnder);
      setHoveredItem(item);
    };

    const handleClickCapture = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        !target ||
        target.closest('[data-what-is-this-ui]') ||
        target.closest('[data-studio-top-layer="modal"]') ||
        target.closest('[data-studio-top-layer="command"]')
      ) {
        return;
      }
      const item = resolveHelpItemFromElement(target);
      if (item) {
        e.preventDefault();
        e.stopPropagation();
        try {
          onOpenHelpItemRef.current(item);
        } catch (err) {
          onReportErrorRef.current?.({
            action: 'open_help_item',
            selectedResult: item.id,
            panelId: item.panelId,
            error: err,
          });
          onCloseRef.current();
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
      }
    };

    window.addEventListener('mousemove', handleMouseMove, true);
    window.addEventListener('click', handleClickCapture, true);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove, true);
      window.removeEventListener('click', handleClickCapture, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [active]);

  // "Mostrar ubicación" spotlight target tracking (NEVER displaces overflow:hidden root containers)
  useEffect(() => {
    if (!spotlightTarget) {
      setSpotlightRect(null);
      setSpotlightFallbackOnly(false);
      return;
    }

    let scrolledOnce = false;
    const locate = () => {
      try {
        const el = findVisibleHelpElement(spotlightTarget.helpId);
        if (el) {
          if (!scrolledOnce) {
            scrollOnlyScrollableAncestors(el);
            scrolledOnce = true;
          }
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            setSpotlightRect(rect);
            setSpotlightFallbackOnly(false);
            return;
          }
        }
        setSpotlightRect(null);
        setSpotlightFallbackOnly(true);
      } catch (err) {
        onReportErrorRef.current?.({
          action: 'locate_spotlight',
          selectedResult: spotlightTarget.helpId,
          error: err,
        });
        setSpotlightRect(null);
        setSpotlightFallbackOnly(true);
      }
    };

    const timer1 = window.setTimeout(locate, 60);
    const timer2 = window.setTimeout(locate, 240);
    const timer3 = window.setTimeout(locate, 480);
    const autoDismiss = window.setTimeout(() => onClearSpotlightRef.current(), 6500);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClearSpotlightRef.current();
      }
    };
    const handleViewportChange = () => locate();
    window.addEventListener('keydown', handleKey);
    window.addEventListener('resize', handleViewportChange);

    return () => {
      window.clearTimeout(timer1);
      window.clearTimeout(timer2);
      window.clearTimeout(timer3);
      window.clearTimeout(autoDismiss);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [spotlightTarget]);

  const cardWidth = 310;
  const cardHeight = 205;
  const safeLeft =
    typeof window !== 'undefined'
      ? Math.min(window.innerWidth - cardWidth - 16, Math.max(12, cursorPos.x + 18))
      : cursorPos.x + 18;
  const safeTop =
    typeof window !== 'undefined'
      ? Math.min(window.innerHeight - cardHeight - 16, Math.max(52, cursorPos.y + 18))
      : cursorPos.y + 18;

  return (
    <>
      {/* Modo "¿Dónde está?" Banner & Floating Card */}
      {active && (
        <>
          <div
            data-what-is-this-ui="true"
            className="fixed top-11 left-1/2 -translate-x-1/2 z-[140] pointer-events-auto flex items-center gap-3 px-3.5 py-1.5 rounded-lg border border-amber-400/70 bg-slate-950/95 text-slate-100 shadow-2xl backdrop-blur-md"
          >
            <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="text-[11px] leading-tight">
              <span className="font-bold text-amber-300">Modo &quot;¿Dónde está?&quot; activo</span>
              <span className="text-slate-400 ml-2">
                Pasa el cursor sobre cualquier herramienta, botón o panel · Clic para abrir en el Manual ·{' '}
                <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[10px]">Esc</kbd> para salir
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/35 text-amber-200 border border-amber-400/50 transition-colors cursor-pointer whitespace-nowrap"
            >
              Salir (Shift+F1)
            </button>
          </div>

          {hoveredItem && (
            <div
              data-what-is-this-ui="true"
              style={{ left: safeLeft, top: safeTop, width: cardWidth }}
              className="fixed z-[145] pointer-events-auto rounded-lg border border-amber-400/65 bg-slate-950/96 text-slate-100 shadow-2xl p-3 space-y-2 backdrop-blur-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-amber-400">
                    {hoveredItem.category}
                  </div>
                  <div className="text-xs font-bold text-white truncate">{hoveredItem.name}</div>
                </div>
                {hoveredItem.hotkey && hoveredItem.hotkey !== '—' && (
                  <span className="shrink-0 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] font-bold text-amber-300 flex items-center gap-1">
                    <Keyboard className="w-2.5 h-2.5" />
                    {hoveredItem.hotkey}
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-3">
                {hoveredItem.description}
              </p>

              <div className="flex items-start gap-1.5 text-[10px] text-sky-300 bg-sky-500/10 border border-sky-500/25 rounded px-2 py-1">
                <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                <span>{hoveredItem.location}</span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <span className="text-[10px] text-slate-400">Haz clic para ver guía completa</span>
                <button
                  type="button"
                  onClick={() => onOpenHelpItem(hoveredItem)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[10px] cursor-pointer"
                >
                  <BookOpen className="w-3 h-3" />
                  Ver en Ayuda
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* "Mostrar ubicación" Spotlight Highlight */}
      {spotlightTarget && spotlightRect && (
        <div
          data-what-is-this-ui="true"
          className="fixed inset-0 z-[135] pointer-events-none"
          aria-live="polite"
        >
          <div
            onClick={onClearSpotlight}
            className="pointer-events-auto fixed rounded-lg border-2 border-amber-400 help-spotlight-ring cursor-pointer transition-all duration-200"
            style={{
              left: Math.max(4, spotlightRect.left - 5),
              top: Math.max(4, spotlightRect.top - 5),
              width: spotlightRect.width + 10,
              height: spotlightRect.height + 10,
            }}
          />
          <div
            className="pointer-events-auto fixed flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-400 bg-slate-950/95 text-slate-100 shadow-2xl max-w-[min(92vw,420px)]"
            style={{
              left: Math.min(
                typeof window !== 'undefined' ? Math.max(12, window.innerWidth - 430) : 300,
                Math.max(12, spotlightRect.left)
              ),
              top:
                spotlightRect.bottom + 54 < (typeof window !== 'undefined' ? window.innerHeight : 800)
                  ? spotlightRect.bottom + 12
                  : Math.max(12, spotlightRect.top - 48),
            }}
          >
            <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <div className="text-[11px] leading-tight min-w-0">
              <span className="font-bold text-amber-300">{spotlightTarget.label}</span>
              {spotlightTarget.hint && (
                <span className="text-slate-300 ml-1.5">{spotlightTarget.hint}</span>
              )}
            </div>
            <button
              type="button"
              onClick={onClearSpotlight}
              className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer shrink-0"
              title="Cerrar indicador"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Non-blocking location banner if target control is inside a menu/sub-dialog or hidden dock */}
      {spotlightTarget && spotlightFallbackOnly && !spotlightRect && (
        <div
          data-what-is-this-ui="true"
          className="pointer-events-auto fixed top-12 left-1/2 -translate-x-1/2 z-[136] flex items-center gap-2.5 px-3.5 py-2 rounded-lg border border-amber-400/80 bg-slate-950/96 text-slate-100 shadow-2xl max-w-[min(92vw,520px)]"
        >
          <Compass className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="text-[11px] leading-snug min-w-0">
            <div className="font-bold text-amber-300 truncate">{spotlightTarget.label}</div>
            {spotlightTarget.hint && (
              <div className="text-slate-300 line-clamp-2">{spotlightTarget.hint}</div>
            )}
          </div>
          <button
            type="button"
            onClick={onClearSpotlight}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer shrink-0"
            title="Cerrar indicador (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
};
