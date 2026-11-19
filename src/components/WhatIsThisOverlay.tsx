import React, { useEffect, useState } from 'react';
import { BookOpen, Compass, HelpCircle, Keyboard, MapPin, X } from 'lucide-react';
import { findHelpItemById, HELP_CATALOG_ITEMS, HelpCatalogItem } from '../utils/helpCatalog';

interface WhatIsThisOverlayProps {
  active: boolean;
  onClose: () => void;
  onOpenHelpItem: (item: HelpCatalogItem) => void;
  spotlightTarget: { helpId: string; label: string; hint?: string } | null;
  onClearSpotlight: () => void;
}

export const WhatIsThisOverlay: React.FC<WhatIsThisOverlayProps> = ({
  active,
  onClose,
  onOpenHelpItem,
  spotlightTarget,
  onClearSpotlight,
}) => {
  const [hoveredItem, setHoveredItem] = useState<HelpCatalogItem | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 24, y: 72 });
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);

  // F1 Inspector hover tracking
  useEffect(() => {
    if (!active) {
      setHoveredItem(null);
      return;
    }

    const resolveHelpItemFromElement = (target: EventTarget | null): HelpCatalogItem | null => {
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
              location: el.closest('[data-dock-zone]')?.getAttribute('data-dock-zone') || 'Espacio de trabajo',
              howToAccess: 'Haz clic directamente en este control.',
              hotkey: '—',
              description: customTitle,
              useCases: ['Control interactivo del estudio.'],
              demoType: 'workspace_ui',
            };
          }
        }
        // Fallback: check title or aria-label on interactive elements
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
              // Fuzzy match with catalog
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
      return null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
      const elUnder = document.elementFromPoint(e.clientX, e.clientY);
      if (elUnder && elUnder.closest('[data-what-is-this-ui]')) {
        return;
      }
      const item = resolveHelpItemFromElement(elUnder);
      setHoveredItem(item);
    };

    const handleClickCapture = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-what-is-this-ui]')) return;
      const item = resolveHelpItemFromElement(target);
      if (item) {
        e.preventDefault();
        e.stopPropagation();
        onOpenHelpItem(item);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('mousemove', handleMouseMove, true);
    window.addEventListener('click', handleClickCapture, true);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove, true);
      window.removeEventListener('click', handleClickCapture, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [active, onClose, onOpenHelpItem]);

  // "Mostrar ubicación" spotlight target tracking
  useEffect(() => {
    if (!spotlightTarget) {
      setSpotlightRect(null);
      return;
    }

    const locate = () => {
      const selectors = [
        `[data-help-id="${spotlightTarget.helpId}"]`,
        spotlightTarget.helpId.startsWith('panel.')
          ? `[data-panel-id="${spotlightTarget.helpId.replace('panel.', '')}"]`
          : '',
        spotlightTarget.helpId.startsWith('anim.')
          ? `[data-panel-id="animation"]`
          : '',
      ].filter(Boolean);

      let el: HTMLElement | null = null;
      for (const sel of selectors) {
        const matches = Array.from(document.querySelectorAll(sel)) as HTMLElement[];
        el = matches.find((m) => {
          const r = m.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        }) || matches[0] || null;
        if (el) break;
      }

      if (el) {
        el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setSpotlightRect(rect);
        }
      }
    };

    const timer1 = window.setTimeout(locate, 70);
    const timer2 = window.setTimeout(locate, 280);
    const timer3 = window.setTimeout(locate, 520);
    const autoDismiss = window.setTimeout(onClearSpotlight, 7000);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClearSpotlight();
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      window.clearTimeout(timer1);
      window.clearTimeout(timer2);
      window.clearTimeout(timer3);
      window.clearTimeout(autoDismiss);
      window.removeEventListener('keydown', handleKey);
    };
  }, [spotlightTarget, onClearSpotlight]);

  // Compute safe card coordinates inside viewport
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
              onClick={onClose}
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/35 text-amber-200 border border-amber-400/50 transition-colors cursor-pointer"
            >
              Salir (F1)
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

      {/* "Llévame a esta herramienta" Spotlight Highlight */}
      {spotlightTarget && spotlightRect && (
        <div
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
            className="pointer-events-auto fixed flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-400 bg-slate-950/95 text-slate-100 shadow-2xl"
            style={{
              left: Math.min(
                typeof window !== 'undefined' ? window.innerWidth - 290 : 300,
                Math.max(12, spotlightRect.left)
              ),
              top:
                spotlightRect.bottom + 54 < (typeof window !== 'undefined' ? window.innerHeight : 800)
                  ? spotlightRect.bottom + 12
                  : Math.max(12, spotlightRect.top - 48),
            }}
          >
            <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <div className="text-[11px] leading-tight">
              <span className="font-bold text-amber-300">{spotlightTarget.label}</span>
              {spotlightTarget.hint && (
                <span className="text-slate-300 ml-1.5">{spotlightTarget.hint}</span>
              )}
            </div>
            <button
              onClick={onClearSpotlight}
              className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              title="Cerrar indicador"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
