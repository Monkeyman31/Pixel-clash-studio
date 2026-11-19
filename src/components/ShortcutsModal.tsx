import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Circle,
  Download,
  Keyboard,
  Play,
  RotateCcw,
  Search,
  Square,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  RecordedMacro,
  ShortcutBinding,
  ShortcutCategory,
  ShortcutProfileId,
} from '../types';
import {
  DEFAULT_SHORTCUT_BINDINGS,
  SHORTCUT_PROFILE_PRESETS,
  buildProfileBindings,
  findShortcutConflicts,
  formatKeyboardEventToShortcut,
  parseShortcutsImport,
  serializeShortcutsExport,
} from '../utils/shortcutsRegistry';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bindings: ShortcutBinding[];
  onChangeBindings: (next: ShortcutBinding[]) => void;
  activeProfile: ShortcutProfileId;
  onSelectProfile: (profile: ShortcutProfileId) => void;
  macros: RecordedMacro[];
  onChangeMacros: (next: RecordedMacro[]) => void;
  isRecordingMacro: boolean;
  recordedStepsCount: number;
  onToggleRecordMacro: () => void;
  onSaveRecordedMacro: (name: string) => void;
  onRunMacro: (macro: RecordedMacro) => void;
}

const CATEGORIES: ('Todas' | ShortcutCategory)[] = [
  'Todas',
  'General',
  'Edición',
  'Capas',
  'Selección',
  'Transformación',
  'Animación',
  'Pixel Art',
  'Vectores',
  'IA',
  'Fighting Game',
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose,
  bindings,
  onChangeBindings,
  activeProfile,
  onSelectProfile,
  macros,
  onChangeMacros,
  isRecordingMacro,
  recordedStepsCount,
  onToggleRecordMacro,
  onSaveRecordedMacro,
  onRunMacro,
}) => {
  const [tab, setTab] = useState<'shortcuts' | 'macros'>('shortcuts');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'Todas' | ShortcutCategory>('Todas');
  const [capturingTarget, setCapturingTarget] = useState<{
    kind: 'primary' | 'secondary' | 'macro';
    id: string;
  } | null>(null);
  const [autoReplaceConflicts, setAutoReplaceConflicts] = useState(true);
  const [macroName, setMacroName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const conflicts = useMemo(
    () => findShortcutConflicts(bindings, macros),
    [bindings, macros]
  );

  useEffect(() => {
    if (!isOpen || !capturingTarget) return;
    const handleKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        setCapturingTarget(null);
        return;
      }
      const combo = formatKeyboardEventToShortcut(e);
      if (!combo) return;

      if (capturingTarget.kind === 'macro') {
        onChangeMacros(
          macros.map((m) => (m.id === capturingTarget.id ? { ...m, shortcut: combo } : m))
        );
      } else {
        const lower = combo.toLowerCase();
        onChangeBindings(
          bindings.map((b) => {
            if (b.id === capturingTarget.id) {
              return capturingTarget.kind === 'primary'
                ? { ...b, primary: combo }
                : { ...b, secondary: combo };
            }
            if (autoReplaceConflicts) {
              return {
                ...b,
                primary: b.primary?.toLowerCase() === lower ? '' : b.primary,
                secondary: b.secondary?.toLowerCase() === lower ? undefined : b.secondary,
              };
            }
            return b;
          })
        );
      }
      setCapturingTarget(null);
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [isOpen, capturingTarget, bindings, macros, autoReplaceConflicts, onChangeBindings, onChangeMacros]);

  if (!isOpen) return null;

  const filtered = bindings.filter((b) => {
    if (category !== 'Todas' && b.category !== category) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      b.label.toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q) ||
      b.primary.toLowerCase().includes(q) ||
      (b.secondary || '').toLowerCase().includes(q)
    );
  });

  const handleExport = (format: 'json' | 'pcsshortcuts') => {
    const content = serializeShortcutsExport(activeProfile, bindings, macros, format);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = format === 'json' ? 'pixelclash_shortcuts.json' : 'pixelclash_shortcuts.pcsshortcuts';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseShortcutsImport(String(ev.target?.result || ''));
      if (parsed?.bindings) onChangeBindings(parsed.bindings);
      if (parsed?.macros) onChangeMacros(parsed.macros);
      if (parsed?.profile) onSelectProfile(parsed.profile);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-[105] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <input ref={fileInputRef} type="file" accept=".json,.pcsshortcuts" className="hidden" onChange={handleImport} />
      <div
        className="w-full max-w-4xl max-h-[88vh] rounded-xl border shadow-2xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--studio-bg-panel)',
          borderColor: 'var(--studio-border-strong)',
          color: 'var(--studio-text)',
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2"
          style={{ backgroundColor: 'var(--studio-bg-bar)', borderColor: 'var(--studio-border)' }}
        >
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" style={{ color: 'var(--studio-accent)' }} />
            <div>
              <h2 className="text-sm font-bold">Editor de Atajos de Teclado, Perfiles y Macros</h2>
              <p className="text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>
                Personaliza atajos primarios/secundarios, detecta conflictos y graba macros automáticos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTab('shortcuts')}
              className="px-3 py-1 rounded-lg text-xs font-bold border"
              style={{
                backgroundColor: tab === 'shortcuts' ? 'var(--studio-accent)' : 'var(--studio-bg-card)',
                color: tab === 'shortcuts' ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                borderColor: 'var(--studio-border-strong)',
              }}
            >
              Atajos ({bindings.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('macros')}
              className="px-3 py-1 rounded-lg text-xs font-bold border"
              style={{
                backgroundColor: tab === 'macros' ? 'var(--studio-accent)' : 'var(--studio-bg-card)',
                color: tab === 'macros' ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                borderColor: 'var(--studio-border-strong)',
              }}
            >
              Macros ({macros.length})
            </button>
            <button type="button" onClick={onClose} className="p-1.5 opacity-70 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {tab === 'shortcuts' ? (
          <>
            {/* Controls Bar */}
            <div className="p-3 border-b flex flex-col gap-2" style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 opacity-60" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar comando o combinación..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs focus:outline-none"
                    style={{
                      backgroundColor: 'var(--studio-bg-elevated)',
                      borderColor: 'var(--studio-border-strong)',
                      color: 'var(--studio-text)',
                    }}
                  />
                </div>

                <select
                  value={activeProfile}
                  onChange={(e) => {
                    const prof = e.target.value as ShortcutProfileId;
                    onSelectProfile(prof);
                    if (prof !== 'custom') {
                      onChangeBindings(buildProfileBindings(prof));
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-lg border text-xs font-semibold"
                  style={{
                    backgroundColor: 'var(--studio-bg-elevated)',
                    borderColor: 'var(--studio-border-strong)',
                    color: 'var(--studio-text)',
                  }}
                >
                  {Object.entries(SHORTCUT_PROFILE_PRESETS).map(([id, meta]) => (
                    <option key={id} value={id}>
                      Perfil: {meta.name}
                    </option>
                  ))}
                  <option value="custom">Perfil: Personalizado</option>
                </select>

                <button
                  type="button"
                  onClick={() => handleExport('json')}
                  className="px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center gap-1"
                  style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
                  title="Exportar pixelclash_shortcuts.json"
                >
                  <Download className="w-3 h-3" /> .JSON
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('pcsshortcuts')}
                  className="px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center gap-1"
                  style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
                  title="Exportar .pcsshortcuts"
                >
                  <Download className="w-3 h-3" /> .PCSSHORTCUTS
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center gap-1"
                  style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
                >
                  <Upload className="w-3 h-3" /> Importar
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex flex-wrap gap-1">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className="px-2 py-0.5 rounded border text-[10px]"
                      style={{
                        backgroundColor: category === cat ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                        color: category === cat ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                        borderColor: 'var(--studio-border-strong)',
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 cursor-pointer text-[10px]">
                    <input
                      type="checkbox"
                      checked={autoReplaceConflicts}
                      onChange={(e) => setAutoReplaceConflicts(e.target.checked)}
                      className="accent-amber-400"
                    />
                    <span>Reemplazar conflictos automáticamente</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectProfile('pixelclash');
                      onChangeBindings(DEFAULT_SHORTCUT_BINDINGS);
                    }}
                    className="text-[10px] flex items-center gap-1 hover:underline"
                    style={{ color: 'var(--studio-accent)' }}
                  >
                    <RotateCcw className="w-3 h-3" /> Restablecer fábrica
                  </button>
                </div>
              </div>

              {conflicts.size > 0 && (
                <div className="px-2.5 py-1.5 rounded border border-amber-500/50 bg-amber-500/10 text-amber-300 text-[10px] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {conflicts.size} atajo(s) duplicado(s) detectado(s). Haz clic en cualquier tecla para reasignar.
                  </span>
                </div>
              )}
            </div>

            {/* Bindings Table */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
              {filtered.map((b) => {
                const def = DEFAULT_SHORTCUT_BINDINGS.find((d) => d.id === b.id);
                const pConflict = b.primary && (conflicts.get(b.primary.toLowerCase())?.length || 0) > 1;
                const sConflict = b.secondary && (conflicts.get(b.secondary.toLowerCase())?.length || 0) > 1;
                const capP = capturingTarget?.kind === 'primary' && capturingTarget.id === b.id;
                const capS = capturingTarget?.kind === 'secondary' && capturingTarget.id === b.id;

                return (
                  <div
                    key={b.id}
                    className="px-3 py-1.5 rounded-lg border flex items-center justify-between gap-2 text-xs"
                    style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-semibold truncate">{b.label}</span>
                      <span className="text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>
                        {b.category} · {b.location}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setCapturingTarget({ kind: 'primary', id: b.id })}
                        className="min-w-[92px] px-2 py-1 rounded border text-[11px] font-mono text-center"
                        style={{
                          backgroundColor: capP ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                          color: capP ? 'var(--studio-accent-text)' : pConflict ? '#fbbf24' : 'var(--studio-text)',
                          borderColor: pConflict ? '#f59e0b' : 'var(--studio-border-strong)',
                        }}
                      >
                        {capP ? 'Pulsa tecla...' : b.primary || 'Sin asignar'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setCapturingTarget({ kind: 'secondary', id: b.id })}
                        className="min-w-[82px] px-2 py-1 rounded border text-[10px] font-mono text-center"
                        style={{
                          backgroundColor: capS ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                          color: capS ? 'var(--studio-accent-text)' : sConflict ? '#fbbf24' : 'var(--studio-text-muted)',
                          borderColor: sConflict ? '#f59e0b' : 'var(--studio-border)',
                        }}
                      >
                        {capS ? 'Pulsa...' : b.secondary || '+ Alt.'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!def) return;
                          onChangeBindings(bindings.map((x) => (x.id === b.id ? def : x)));
                        }}
                        title="Restablecer comando"
                        className="p-1 opacity-60 hover:opacity-100"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Macros Tab */
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            <div
              className="p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2"
              style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
            >
              <div>
                <h3 className="text-xs font-bold">Grabadora de Macros Automáticos</h3>
                <p className="text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>
                  Graba acciones repetitivas (crear capa, modo Multiplicar, duplicar, etc.) y asígnales un atajo.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleRecordMacro}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border"
                  style={{
                    backgroundColor: isRecordingMacro ? '#ef4444' : 'var(--studio-bg-elevated)',
                    color: isRecordingMacro ? '#ffffff' : 'var(--studio-text)',
                    borderColor: isRecordingMacro ? '#ef4444' : 'var(--studio-border-strong)',
                  }}
                >
                  {isRecordingMacro ? <Square className="w-3.5 h-3.5 fill-current" /> : <Circle className="w-3.5 h-3.5 fill-red-500 text-red-500" />}
                  <span>{isRecordingMacro ? `Grabando (${recordedStepsCount} pasos)` : 'Grabar Macro'}</span>
                </button>

                {recordedStepsCount > 0 && (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={macroName}
                      onChange={(e) => setMacroName(e.target.value)}
                      placeholder="Nombre del macro..."
                      className="px-2 py-1 rounded border text-xs w-40"
                      style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
                    />
                    <button
                      type="button"
                      disabled={!macroName.trim()}
                      onClick={() => {
                        onSaveRecordedMacro(macroName.trim());
                        setMacroName('');
                      }}
                      className="px-2.5 py-1 rounded text-xs font-bold disabled:opacity-40"
                      style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
                    >
                      Guardar
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {macros.map((m) => {
                const capM = capturingTarget?.kind === 'macro' && capturingTarget.id === m.id;
                return (
                  <div
                    key={m.id}
                    className="p-3 rounded-lg border flex items-center justify-between gap-3"
                    style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold">{m.name}</span>
                      <span className="text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>
                        {m.steps.map((s) => s.label).join(' → ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setCapturingTarget({ kind: 'macro', id: m.id })}
                        className="px-2 py-1 rounded border text-[10px] font-mono"
                        style={{
                          backgroundColor: capM ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                          color: capM ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                          borderColor: 'var(--studio-border-strong)',
                        }}
                      >
                        {capM ? 'Pulsa tecla...' : m.shortcut || '+ Atajo'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onRunMacro(m);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1"
                        style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
                      >
                        <Play className="w-3 h-3 fill-current" /> Ejecutar
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeMacros(macros.filter((x) => x.id !== m.id))}
                        className="p-1 text-rose-400 hover:opacity-80"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
