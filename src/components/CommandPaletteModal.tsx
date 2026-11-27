import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Command,
  HelpCircle,
  Layers,
  Palette,
  Play,
  Search,
  Sliders,
  Sparkles,
  Wrench,
  X,
  Image as ImageIcon,
  LayoutGrid,
  Keyboard,
} from 'lucide-react';
import {
  RecordedMacro,
  ShortcutBinding,
  UniversalSearchCategory,
  UniversalSearchItem,
} from '../types';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  bindings: ShortcutBinding[];
  macros: RecordedMacro[];
  universalItems?: UniversalSearchItem[];
  onExecuteCommand: (commandId: string) => void;
  onRunMacro: (macro: RecordedMacro) => void;
  onActivateWhatIsThis?: () => void;
  onExecutionError?: (context: { action: string; selectedResult?: string; panelId?: string; error: unknown }) => void;
}

interface PaletteEntry {
  kind: 'universal' | 'cmd' | 'macro';
  id: string;
  title: string;
  subtitle: string;
  category: UniversalSearchCategory | 'Macros';
  shortcut?: string;
  keywords?: string;
  onRun: () => void;
}

const CATEGORY_TABS: ('Todo' | UniversalSearchCategory | 'Macros')[] = [
  'Todo',
  'Herramientas',
  'Paneles',
  'Animación',
  'Filtros y Ajustes',
  'Dithering',
  'IA',
  'Referencias',
  'Simetría',
  'Interfaz',
  'Atajos',
  'Ajustes',
  'Macros',
];

function getCategoryIcon(cat: PaletteEntry['category']) {
  switch (cat) {
    case 'Herramientas':
      return Wrench;
    case 'Paneles':
      return LayoutGrid;
    case 'Animación':
      return Play;
    case 'Filtros y Ajustes':
      return Palette;
    case 'Dithering':
      return Layers;
    case 'IA':
      return Sparkles;
    case 'Referencias':
      return ImageIcon;
    case 'Simetría':
      return Sliders;
    case 'Interfaz':
      return LayoutGrid;
    case 'Atajos':
      return Keyboard;
    case 'Macros':
      return Play;
    default:
      return Command;
  }
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  bindings,
  macros,
  universalItems = [],
  onExecuteCommand,
  onRunMacro,
  onActivateWhatIsThis,
  onExecutionError,
}) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<
    'Todo' | UniversalSearchCategory | 'Macros'
  >('Todo');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Keep latest callbacks in refs so indexing never churns on parent re-renders
  const onExecuteCommandRef = useRef(onExecuteCommand);
  const onRunMacroRef = useRef(onRunMacro);
  const onExecutionErrorRef = useRef(onExecutionError);
  useEffect(() => {
    onExecuteCommandRef.current = onExecuteCommand;
    onRunMacroRef.current = onRunMacro;
    onExecutionErrorRef.current = onExecutionError;
  });

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setActiveIdx(0);
    setActiveCategory('Todo');
    const raf = requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
    const timer = window.setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true });
    }, 25);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [isOpen]);

  const allEntries = useMemo<PaletteEntry[]>(() => {
    if (!isOpen) return [];
    const entries: PaletteEntry[] = [];
    const seenIds = new Set<string>();

    for (const u of universalItems) {
      entries.push({
        kind: 'universal',
        id: u.id,
        title: u.title,
        subtitle: u.subtitle,
        category: u.category,
        shortcut: u.shortcut,
        keywords: u.keywords,
        onRun: u.onExecute,
      });
      seenIds.add(u.id);
    }

    for (const b of bindings) {
      if (seenIds.has(b.id) || seenIds.has(`cmd:${b.id}`)) continue;
      entries.push({
        kind: 'cmd',
        id: b.id,
        title: b.label,
        subtitle: `${b.category} · ${b.location}`,
        category:
          b.id.startsWith('tool.')
            ? 'Herramientas'
            : b.category === 'IA'
            ? 'IA'
            : b.id.includes('ui_edit') || b.id.includes('workspace') || b.id.includes('compact')
            ? 'Interfaz'
            : 'Atajos',
        shortcut: b.primary,
        keywords: `${b.category} ${b.location} ${b.id}`,
        onRun: () => onExecuteCommandRef.current(b.id),
      });
    }

    for (const m of macros) {
      entries.push({
        kind: 'macro',
        id: m.id,
        title: `Macro: ${m.name}`,
        subtitle: `Secuencia grabada de ${m.steps.length} pasos`,
        category: 'Macros',
        shortcut: m.shortcut || '',
        keywords: m.steps.map((s) => s.label).join(' '),
        onRun: () => onRunMacroRef.current(m),
      });
    }

    return entries;
  }, [isOpen, bindings, macros, universalItems]);

  const results = useMemo(() => {
    if (!isOpen) return [];
    const byCat =
      activeCategory === 'Todo'
        ? allEntries
        : allEntries.filter((e) => e.category === activeCategory);

    const q = query.trim().toLowerCase();
    if (!q) return byCat.slice(0, 60);

    const scored: { entry: PaletteEntry; score: number }[] = [];
    const tokens = q.split(/\s+/).filter(Boolean);

    for (const entry of byCat) {
      const tLow = entry.title.toLowerCase();
      const sLow = entry.subtitle.toLowerCase();
      const kLow = (entry.keywords || '').toLowerCase();
      const cLow = entry.category.toLowerCase();
      const shLow = (entry.shortcut || '').toLowerCase();
      const fullText = `${tLow} ${sLow} ${kLow} ${cLow} ${shLow}`;

      if (!tokens.every((tok) => fullText.includes(tok))) continue;

      let score = 0;
      if (tLow === q) score += 120;
      else if (tLow.startsWith(q)) score += 80;
      else if (tLow.includes(q)) score += 50;
      if (cLow.includes(q)) score += 20;
      if (shLow === q) score += 40;
      if (sLow.includes(q)) score += 15;
      scored.push({ entry, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 60).map((s) => s.entry);
  }, [isOpen, allEntries, activeCategory, query]);

  useEffect(() => {
    setActiveIdx((prev) => Math.max(0, Math.min(prev, Math.max(0, results.length - 1))));
  }, [results.length]);

  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const activeEl = container.querySelector(`[data-result-index="${activeIdx}"]`) as HTMLElement | null;
    if (activeEl) {
      const top = activeEl.offsetTop;
      const bottom = top + activeEl.offsetHeight;
      if (top < container.scrollTop) {
        container.scrollTop = top;
      } else if (bottom > container.scrollTop + container.clientHeight) {
        container.scrollTop = bottom - container.clientHeight;
      }
    }
  }, [activeIdx]);

  if (!isOpen) return null;

  const triggerSelected = (idx: number) => {
    const item = results[idx];
    if (!item) return;
    onClose();
    // Defer execution by 1 animation frame so palette unmounts cleanly before opening/focusing targets
    window.requestAnimationFrame(() => {
      try {
        item.onRun();
      } catch (err) {
        onExecutionErrorRef.current?.({
          action: 'command_palette_execute',
          selectedResult: `${item.id} (${item.title})`,
          panelId: item.id.startsWith('panel:') ? item.id.slice(6) : undefined,
          error: err,
        });
      }
    });
  };

  return (
    <div
      data-what-is-this-ui="true"
      className="fixed inset-0 bg-black/65 backdrop-blur-sm flex items-start justify-center pt-14 p-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl border shadow-2xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--studio-bg-panel)',
          borderColor: 'var(--studio-accent)',
          color: 'var(--studio-text)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Top Search Input Row */}
        <div
          className="px-3.5 py-2.5 border-b flex items-center gap-2.5"
          style={{ backgroundColor: 'var(--studio-bg-bar)', borderColor: 'var(--studio-border)' }}
        >
          <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--studio-accent)' }} />
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIdx((i) => Math.min(Math.max(0, results.length - 1), i + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIdx((i) => Math.max(0, i - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                triggerSelected(activeIdx);
              }
            }}
            placeholder="Buscar herramientas, paneles, filtros, dithering, IA, referencias, simetría, ajustes..."
            className="flex-1 bg-transparent text-xs font-medium focus:outline-none placeholder:opacity-60"
          />
          {onActivateWhatIsThis && (
            <button
              type="button"
              onClick={() => {
                onClose();
                window.requestAnimationFrame(() => {
                  try {
                    onActivateWhatIsThis();
                  } catch (err) {
                    onExecutionErrorRef.current?.({ action: 'activate_what_is_this', error: err });
                  }
                });
              }}
              title="Activar Modo Inspector Visual ¿Dónde está? (Shift+F1)"
              className="px-2 py-1 rounded border text-[10px] font-semibold flex items-center gap-1 hover:opacity-90 shrink-0 whitespace-nowrap"
              style={{
                backgroundColor: 'var(--studio-bg-card)',
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-accent)',
              }}
            >
              <HelpCircle className="w-3 h-3" />
              <span>¿Dónde está?</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 opacity-65 hover:opacity-100 shrink-0"
            title="Cerrar buscador (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div
          className="px-2.5 py-1.5 border-b flex items-center gap-1 overflow-x-auto"
          style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
        >
          {CATEGORY_TABS.map((cat) => {
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setActiveCategory(cat);
                  setActiveIdx(0);
                  inputRef.current?.focus({ preventScroll: true });
                }}
                className="px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap transition-colors shrink-0 border"
                style={{
                  backgroundColor: active ? 'var(--studio-accent)' : 'transparent',
                  color: active ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                  borderColor: active ? 'var(--studio-accent)' : 'transparent',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto p-1.5 flex flex-col gap-0.5">
          {results.length === 0 && (
            <div className="py-10 text-center text-xs" style={{ color: 'var(--studio-text-muted)' }}>
              No se encontraron acciones para &quot;{query}&quot;.
            </div>
          )}
          {results.map((item, idx) => {
            const active = idx === activeIdx;
            const Icon = getCategoryIcon(item.category);
            return (
              <button
                key={`${item.kind}-${item.id}`}
                data-result-index={idx}
                type="button"
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => triggerSelected(idx)}
                className="px-3 py-2 rounded-lg text-left flex items-center justify-between gap-3 transition-colors"
                style={{
                  backgroundColor: active
                    ? 'color-mix(in srgb, var(--studio-accent) 18%, var(--studio-bg-elevated))'
                    : 'transparent',
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: active ? 'var(--studio-accent)' : 'var(--studio-text-muted)' }}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold truncate">{item.title}</span>
                    <span className="text-[10px] truncate" style={{ color: 'var(--studio-text-muted)' }}>
                      {item.category} · {item.subtitle}
                    </span>
                  </div>
                </div>
                {item.shortcut && (
                  <kbd
                    className="px-2 py-0.5 rounded border text-[10px] font-mono shrink-0"
                    style={{
                      backgroundColor: 'var(--studio-bg-card)',
                      borderColor: 'var(--studio-border-strong)',
                      color: 'var(--studio-accent)',
                    }}
                  >
                    {item.shortcut}
                  </kbd>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Hints */}
        <div
          className="px-3.5 py-1.5 border-t flex items-center justify-between text-[10px] font-mono tabular-nums"
          style={{
            backgroundColor: 'var(--studio-bg-bar)',
            borderColor: 'var(--studio-border)',
            color: 'var(--studio-text-muted)',
          }}
        >
          <span>↑↓ Navegar · Enter Ejecutar · Esc Cerrar</span>
          <span>{results.length} resultados · F1</span>
        </div>
      </div>
    </div>
  );
};
