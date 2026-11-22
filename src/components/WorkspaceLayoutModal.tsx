import React, { useRef, useState } from 'react';
import {
  X,
  LayoutTemplate,
  Palette,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Save,
  Trash2,
  RotateCcw,
  Check,
  Type,
  Sparkles,
  PanelLeft,
  PanelRight,
  PanelBottom,
  PanelTop,
  Download,
  Upload,
  Copy,
  Move,
  Unlock,
  Share2,
  Scan,
  Monitor,
} from 'lucide-react';
import { SelectionDisplayConfig, SelectionDisplayMode } from '../types';
import { DEFAULT_SELECTION_DISPLAY_CONFIG } from '../utils/toolEngines';
import { StudioSlider } from './StudioSlider';
import {
  AutoCollapseMode,
  ButtonStyleId,
  CornerStyleId,
  CustomUiColors,
  DEFAULT_MINI_PREVIEW_PREFS,
  DEFAULT_STUDIO_STYLE,
  DEFAULT_WORKSPACE_LAYOUT,
  DockOrientation,
  IconSizeId,
  IconStyleId,
  MINI_PREVIEW_DEFAULT_HEIGHT,
  MINI_PREVIEW_DEFAULT_WIDTH,
  MINI_PREVIEW_MAX_HEIGHT,
  MINI_PREVIEW_MAX_WIDTH,
  MINI_PREVIEW_MIN_HEIGHT,
  MINI_PREVIEW_MIN_WIDTH,
  PANEL_REGISTRY,
  PanelCollapseDisplayMode,
  PanelDockZone,
  STUDIO_MONO_FONTS,
  STUDIO_THEMES,
  STUDIO_UI_FONTS,
  SavedCustomLayout,
  SavedCustomTheme,
  StudioStyleConfig,
  TimelineSectionId,
  UI_STYLE_PRESETS,
  UiDensityId,
  WORKSPACE_TEMPLATES,
  WorkspaceLayoutConfig,
  loadSavedThemes,
  parsePcsLayoutFile,
  parseStudioThemeFile,
  saveSavedThemes,
  serializeStudioTheme,
  serializeWorkspaceToPcsLayout,
} from '../constants/workspaceThemes';

interface WorkspaceLayoutModalProps {
  isOpen: boolean;
  initialTab?: 'layout' | 'style' | 'selections' | 'minipreview';
  onClose: () => void;
  layout: WorkspaceLayoutConfig;
  onChangeLayout: (next: WorkspaceLayoutConfig) => void;
  savedLayouts: SavedCustomLayout[];
  onSaveCustomLayout: (name: string) => void;
  onLoadCustomLayout: (saved: SavedCustomLayout) => void;
  onDuplicateCustomLayout?: (saved: SavedCustomLayout) => void;
  onDeleteCustomLayout: (id: string) => void;
  styleConfig: StudioStyleConfig;
  onChangeStyleConfig: (next: StudioStyleConfig) => void;
  onToggleUiEditMode?: () => void;
  selectionDisplayConfig?: SelectionDisplayConfig;
  onChangeSelectionDisplayConfig?: (next: SelectionDisplayConfig) => void;
}

const TIMELINE_SECTION_LABELS: Record<TimelineSectionId, { title: string; subtitle: string }> = {
  tags: { title: 'Etiquetas de Movimientos', subtitle: 'Grupos de acciones y plantilla sprite sheet' },
  ruler: { title: 'Regla de Tiempo Completa', subtitle: 'Barra graduada en segundos con arrastre' },
  frames: { title: 'Cels / Pistas / Tabla', subtitle: 'Miniaturas, matriz de capas y frame data' },
  transport: { title: 'Play, FPS, Cebolla y Frame Data', subtitle: 'Controles de reproducción, Startup/Hit/Recov y vistas' },
};

const ACCENT_SWATCHES = ['#fbbf24', '#f43f5e', '#22d3ee', '#38bdf8', '#a855f7', '#84cc16', '#2563eb', '#f97316'];

const SelectionLivePreview: React.FC<{ config: SelectionDisplayConfig }> = ({ config }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    let rafId = 0;
    let offset = 0;
    let lastTick = performance.now();
    const draw = (now: number) => {
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext('2d');
      if (!ctx) return;

      const stepMs = config.animationSpeed <= 0 ? 999999 : Math.max(20, 220 - config.animationSpeed * 1.9);
      if (config.animationSpeed > 0 && now - lastTick >= stepMs) {
        lastTick = now;
        offset = (offset + 1) % 8;
      }

      ctx.clearRect(0, 0, c.width, c.height);
      // Checkerboard backdrop
      for (let y = 0; y < c.height; y += 8) {
        for (let x = 0; x < c.width; x += 8) {
          ctx.fillStyle = ((x / 8 + y / 8) % 2 === 0) ? '#171c2b' : '#1f2638';
          ctx.fillRect(x, y, 8, 8);
        }
      }
      // Sample sprite block
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(44, 24, 52, 36);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(54, 32, 32, 20);

      const rx = 28;
      const ry = 14;
      const rw = 84;
      const rh = 56;

      // Interior shading
      if (config.mode === 'fill_only' || config.mode === 'both') {
        ctx.save();
        ctx.fillStyle = config.borderColor;
        ctx.globalAlpha = Math.max(0.05, Math.min(0.85, config.opacity));
        ctx.fillRect(rx, ry, rw, rh);
        ctx.restore();
      }

      // Outline / Marching ants
      if (config.mode === 'marching_ants' || config.mode === 'both' || config.mode === 'outline_only') {
        ctx.save();
        ctx.lineWidth = config.thickness;
        ctx.strokeStyle = config.borderColor;
        ctx.setLineDash([]);
        ctx.strokeRect(rx + 0.5, ry + 0.5, rw, rh);
        if (config.mode !== 'outline_only') {
          ctx.strokeStyle = '#090d16';
          ctx.setLineDash([4, 4]);
          ctx.lineDashOffset = -offset;
          ctx.strokeRect(rx + 0.5, ry + 0.5, rw, rh);
        }
        ctx.restore();
      }

      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [config]);

  return (
    <canvas
      ref={canvasRef}
      width={140}
      height={84}
      className="rounded-lg border pixel-canvas shrink-0"
      style={{ borderColor: 'var(--studio-border-strong)' }}
    />
  );
};

export const WorkspaceLayoutModal: React.FC<WorkspaceLayoutModalProps> = ({
  isOpen,
  initialTab = 'layout',
  onClose,
  layout,
  onChangeLayout,
  savedLayouts,
  onSaveCustomLayout,
  onLoadCustomLayout,
  onDuplicateCustomLayout,
  onDeleteCustomLayout,
  styleConfig,
  onChangeStyleConfig,
  onToggleUiEditMode,
  selectionDisplayConfig = DEFAULT_SELECTION_DISPLAY_CONFIG,
  onChangeSelectionDisplayConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'layout' | 'style' | 'selections' | 'minipreview'>(initialTab);
  const [customLayoutName, setCustomLayoutName] = useState<string>('');
  const importLayoutRef = useRef<HTMLInputElement>(null);
  const importThemeRef = useRef<HTMLInputElement>(null);
  const [savedThemes, setSavedThemes] = useState<SavedCustomTheme[]>(() => loadSavedThemes());
  const [customThemeName, setCustomThemeName] = useState<string>('');
  const [copiedThemeStatus, setCopiedThemeStatus] = useState<boolean>(false);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const moveRightPanel = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= layout.rightPanels.length) return;
    const nextPanels = [...layout.rightPanels];
    const tmp = nextPanels[target];
    nextPanels[target] = nextPanels[index];
    nextPanels[index] = tmp;
    onChangeLayout({ ...layout, rightPanels: nextPanels, templateId: 'custom' });
  };

  const toggleRightPanelVisible = (id: string) => {
    onChangeLayout({
      ...layout,
      templateId: 'custom',
      rightPanels: layout.rightPanels.map((p) => (p.id === id ? { ...p, visible: !p.visible } : p)),
    });
  };

  const moveTimelineSection = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= layout.timelineSectionOrder.length) return;
    const nextOrder = [...layout.timelineSectionOrder];
    const tmp = nextOrder[target];
    nextOrder[target] = nextOrder[index];
    nextOrder[index] = tmp;
    onChangeLayout({ ...layout, timelineSectionOrder: nextOrder, templateId: 'custom' });
  };

  const handleSaveNamed = () => {
    const trimmed = customLayoutName.trim();
    if (!trimmed) return;
    onSaveCustomLayout(trimmed);
    setCustomLayoutName('');
  };

  const handleExportPcsLayout = () => {
    const activeTpl = WORKSPACE_TEMPLATES.find((t) => t.id === layout.templateId);
    const fname = activeTpl?.defaultFileName || `workspace_${layout.templateId || 'custom'}.pcslayout`;
    const json = serializeWorkspaceToPcsLayout(layout, activeTpl?.name || 'Custom');
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fname;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportPcsLayout = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parsePcsLayoutFile(String(ev.target?.result || ''));
      if (parsed) {
        onChangeLayout(parsed.layout);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <input
        ref={importLayoutRef}
        type="file"
        accept=".pcslayout,.json"
        className="hidden"
        onChange={handleImportPcsLayout}
      />
      <div
        className="w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl border"
        style={{
          backgroundColor: 'var(--studio-bg-panel)',
          borderColor: 'var(--studio-border-strong)',
          color: 'var(--studio-text)',
          borderRadius: 'var(--studio-radius)',
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-3"
          style={{
            backgroundColor: 'var(--studio-bg-bar)',
            borderColor: 'var(--studio-border)',
          }}
        >
          <div className="flex items-center gap-3">
            <LayoutTemplate className="w-5 h-5" style={{ color: 'var(--studio-accent)' }} />
            <div>
              <h2 className="text-sm font-bold">Editor de Espacios de Trabajo y Estilos</h2>
              <p className="text-[11px]" style={{ color: 'var(--studio-text-muted)' }}>
                Presets profesionales, pestañas acoplables, ventanas flotantes, modo compacto y archivos .pcslayout
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleExportPcsLayout}
              className="px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1"
              style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border-strong)' }}
              title="Exportar distribución como archivo .pcslayout"
            >
              <Download className="w-3.5 h-3.5" /> .pcslayout
            </button>
            <button
              type="button"
              onClick={() => importLayoutRef.current?.click()}
              className="px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1"
              style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border-strong)' }}
              title="Importar archivo .pcslayout"
            >
              <Upload className="w-3.5 h-3.5" /> Importar
            </button>
            <div
              className="flex items-center p-0.5 rounded-lg border"
              style={{
                backgroundColor: 'var(--studio-bg-card)',
                borderColor: 'var(--studio-border)',
              }}
            >
              <button
                onClick={() => setActiveTab('layout')}
                className="px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors"
                style={{
                  backgroundColor: activeTab === 'layout' ? 'var(--studio-accent)' : 'transparent',
                  color: activeTab === 'layout' ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                }}
              >
                <LayoutTemplate className="w-3.5 h-3.5" />
                <span>Espacios de Trabajo</span>
              </button>
              <button
                onClick={() => setActiveTab('style')}
                className="px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                style={{
                  backgroundColor: activeTab === 'style' ? 'var(--studio-accent)' : 'transparent',
                  color: activeTab === 'style' ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                }}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Estilos y Fuentes</span>
              </button>
              <button
                onClick={() => setActiveTab('selections')}
                className="px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                style={{
                  backgroundColor: activeTab === 'selections' ? 'var(--studio-accent)' : 'transparent',
                  color: activeTab === 'selections' ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                }}
              >
                <Scan className="w-3.5 h-3.5" />
                <span>Selecciones</span>
              </button>
              <button
                onClick={() => setActiveTab('minipreview')}
                className="px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                style={{
                  backgroundColor: activeTab === 'minipreview' ? 'var(--studio-accent)' : 'transparent',
                  color: activeTab === 'minipreview' ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                }}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Mini Preview</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:opacity-80 transition-opacity"
              style={{ color: 'var(--studio-text-muted)' }}
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
          {activeTab === 'layout' && (
            <>
              {/* 1. Templates Grid */}
              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                    Templates de Organización
                  </h3>
                  <button
                    onClick={() => onChangeLayout(DEFAULT_WORKSPACE_LAYOUT)}
                    className="text-[11px] flex items-center gap-1 hover:underline"
                    style={{ color: 'var(--studio-accent)' }}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restablecer predeterminado</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {WORKSPACE_TEMPLATES.map((tpl) => {
                    const isActive = layout.templateId === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => onChangeLayout(tpl.layout)}
                        className="p-3 rounded-xl border text-left flex flex-col gap-2 transition-all"
                        style={{
                          backgroundColor: 'var(--studio-bg-card)',
                          borderColor: isActive ? 'var(--studio-accent)' : 'var(--studio-border)',
                          boxShadow: isActive ? '0 0 0 1px var(--studio-accent)' : undefined,
                        }}
                      >
                        {/* Wireframe Mini Preview */}
                        <div
                          className="h-14 w-full rounded-lg border p-1 flex flex-col gap-1"
                          style={{
                            backgroundColor: 'var(--studio-bg-canvas)',
                            borderColor: 'var(--studio-border)',
                          }}
                        >
                          {tpl.layout.timelinePosition === 'top' && (
                            <div className="h-2.5 w-full rounded-sm opacity-80" style={{ backgroundColor: 'var(--studio-accent)' }} />
                          )}
                          <div className="flex-1 flex gap-1 min-h-0">
                            {tpl.layout.toolbarPosition === 'left' && (
                              <div className="w-2 h-full rounded-sm bg-slate-500/40" />
                            )}
                            {tpl.layout.sidebarPosition === 'left' && (
                              <div className="w-6 h-full rounded-sm bg-indigo-400/35" />
                            )}
                            <div className="flex-1 h-full rounded-sm border border-dashed border-slate-500/40" />
                            {tpl.layout.sidebarPosition === 'right' && (
                              <div className="w-6 h-full rounded-sm bg-indigo-400/35" />
                            )}
                            {tpl.layout.toolbarPosition === 'right' && (
                              <div className="w-2 h-full rounded-sm bg-slate-500/40" />
                            )}
                          </div>
                          {tpl.layout.timelinePosition === 'bottom' && (
                            <div className="h-2.5 w-full rounded-sm opacity-80" style={{ backgroundColor: 'var(--studio-accent)' }} />
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold">{tpl.name}</span>
                          <span className="text-[10px] font-mono" style={{ color: 'var(--studio-accent)' }}>
                            {tpl.badge}
                          </span>
                        </div>
                        <p className="text-[11px] leading-snug" style={{ color: 'var(--studio-text-muted)' }}>
                          {tpl.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* 2. Save / Load Custom User Layouts */}
              <section
                className="p-4 rounded-xl border flex flex-col gap-3"
                style={{
                  backgroundColor: 'var(--studio-bg-card)',
                  borderColor: 'var(--studio-border)',
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold">Mis Organizaciones Guardadas</h3>
                    <p className="text-[11px]" style={{ color: 'var(--studio-text-muted)' }}>
                      El orden actual se guarda automáticamente. También puedes guardar snapshots con nombre propio.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={customLayoutName}
                      onChange={(e) => setCustomLayoutName(e.target.value)}
                      placeholder="Nombre de tu setup..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveNamed();
                      }}
                      className="px-2.5 py-1.5 rounded-lg border text-xs w-44 focus:outline-none"
                      style={{
                        backgroundColor: 'var(--studio-bg-elevated)',
                        borderColor: 'var(--studio-border-strong)',
                        color: 'var(--studio-text)',
                      }}
                    />
                    <button
                      onClick={handleSaveNamed}
                      disabled={!customLayoutName.trim()}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 transition-opacity"
                      style={{
                        backgroundColor: 'var(--studio-accent)',
                        color: 'var(--studio-accent-text)',
                      }}
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Guardar</span>
                    </button>
                  </div>
                </div>

                {savedLayouts.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {savedLayouts.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs"
                        style={{
                          backgroundColor: 'var(--studio-bg-elevated)',
                          borderColor: 'var(--studio-border-strong)',
                        }}
                      >
                        <button
                          onClick={() => onLoadCustomLayout(item)}
                          className="font-semibold hover:underline"
                        >
                          {item.name}
                        </button>
                        {onDuplicateCustomLayout && (
                          <button
                            onClick={() => onDuplicateCustomLayout(item)}
                            title="Duplicar espacio guardado"
                            className="opacity-70 hover:opacity-100 text-sky-400"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteCustomLayout(item.id)}
                          title="Eliminar setup guardado"
                          className="opacity-60 hover:opacity-100 text-rose-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* 3. Zone Positioning Controls */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Main Zones */}
                <div
                  className="p-4 rounded-xl border flex flex-col gap-3"
                  style={{
                    backgroundColor: 'var(--studio-bg-card)',
                    borderColor: 'var(--studio-border)',
                  }}
                >
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                    Ubicación de Zonas
                  </h3>

                  {/* Toolbar Dock */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium">Barra de Herramientas</span>
                    <div className="flex items-center gap-1">
                      {(['left', 'right', 'hidden'] as const).map((pos) => (
                        <button
                          key={pos}
                          onClick={() => onChangeLayout({ ...layout, toolbarPosition: pos, templateId: 'custom' })}
                          className="px-2 py-1 rounded text-[11px] font-mono border flex items-center gap-1"
                          style={{
                            backgroundColor: layout.toolbarPosition === pos ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                            color: layout.toolbarPosition === pos ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                            borderColor: 'var(--studio-border-strong)',
                          }}
                        >
                          {pos === 'left' && <PanelLeft className="w-3 h-3" />}
                          {pos === 'right' && <PanelRight className="w-3 h-3" />}
                          <span>{pos === 'left' ? 'Izq' : pos === 'right' ? 'Der' : 'Oculta'}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right Sidebar Dock */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium">Paneles Modulares</span>
                    <div className="flex items-center gap-1">
                      {(['left', 'right', 'hidden'] as const).map((pos) => (
                        <button
                          key={pos}
                          onClick={() => {
                            if (pos === 'hidden') {
                              onChangeLayout({ ...layout, sidebarPosition: pos, templateId: 'custom' });
                              return;
                            }
                            const nextPanels = layout.rightPanels.map((p) => {
                              const isMini = p.dock?.endsWith('mini');
                              const nextDock: PanelDockZone = pos === 'left'
                                ? (isMini ? 'left-mini' : 'left-main')
                                : (isMini ? 'right-mini' : 'right-main');
                              return { ...p, dock: nextDock };
                            });
                            onChangeLayout({
                              ...layout,
                              sidebarPosition: pos,
                              rightPanels: nextPanels,
                              templateId: 'custom',
                            });
                          }}
                          className="px-2 py-1 rounded text-[11px] font-mono border flex items-center gap-1"
                          style={{
                            backgroundColor: layout.sidebarPosition === pos ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                            color: layout.sidebarPosition === pos ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                            borderColor: 'var(--studio-border-strong)',
                          }}
                        >
                          {pos === 'left' && <PanelLeft className="w-3 h-3" />}
                          {pos === 'right' && <PanelRight className="w-3 h-3" />}
                          <span>{pos === 'left' ? 'Izq' : pos === 'right' ? 'Der' : 'Ocultos'}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sidebar Width */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium">Ancho de Paneles</span>
                    <div className="flex items-center gap-1">
                      {(['compact', 'normal', 'wide'] as const).map((w) => (
                        <button
                          key={w}
                          onClick={() => onChangeLayout({ ...layout, sidebarWidth: w, templateId: 'custom' })}
                          className="px-2 py-1 rounded text-[11px] font-mono border"
                          style={{
                            backgroundColor: layout.sidebarWidth === w ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                            color: layout.sidebarWidth === w ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                            borderColor: 'var(--studio-border-strong)',
                          }}
                        >
                          {w === 'compact' ? 'Compacto' : w === 'normal' ? 'Normal' : 'Amplio'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Timeline Position (synced with modular timeline panel dock) */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium">Línea de Tiempo</span>
                    <div className="flex items-center gap-1">
                      {(['bottom', 'top'] as const).map((pos) => (
                        <button
                          key={pos}
                          onClick={() =>
                            onChangeLayout({
                              ...layout,
                              timelinePosition: pos,
                              rightPanels: layout.rightPanels.map((p) =>
                                p.id === 'timeline' ? { ...p, dock: pos, visible: true } : p
                              ),
                              templateId: 'custom',
                            })
                          }
                          className="px-2.5 py-1 rounded text-[11px] font-mono border flex items-center gap-1"
                          style={{
                            backgroundColor: layout.timelinePosition === pos ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                            color: layout.timelinePosition === pos ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                            borderColor: 'var(--studio-border-strong)',
                          }}
                        >
                          {pos === 'bottom' ? <PanelBottom className="w-3 h-3" /> : <PanelTop className="w-3 h-3" />}
                          <span>{pos === 'bottom' ? 'Abajo' : 'Arriba'}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Collapse Display Mode */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium">Visualización al Colapsar</span>
                    <div className="flex items-center gap-1">
                      {(
                        [
                          ['both', 'Ambos'],
                          ['icon', 'Solo Icono'],
                          ['name', 'Solo Nombre'],
                        ] as [PanelCollapseDisplayMode, string][]
                      ).map(([mode, lbl]) => (
                        <button
                          key={mode}
                          onClick={() =>
                            onChangeLayout({ ...layout, collapseDisplayMode: mode, templateId: 'custom' })
                          }
                          className="px-2 py-1 rounded text-[11px] font-mono border"
                          style={{
                            backgroundColor:
                              (layout.collapseDisplayMode || 'both') === mode
                                ? 'var(--studio-accent)'
                                : 'var(--studio-bg-elevated)',
                            color:
                              (layout.collapseDisplayMode || 'both') === mode
                                ? 'var(--studio-accent-text)'
                                : 'var(--studio-text)',
                            borderColor: 'var(--studio-border-strong)',
                          }}
                        >
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Auto-collapse Sidebars */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium">Ocultar Paneles Laterales</span>
                    <select
                      value={layout.autoCollapseSidebars || 'visible'}
                      onChange={(e) =>
                        onChangeLayout({
                          ...layout,
                          autoCollapseSidebars: e.target.value as AutoCollapseMode,
                          templateId: 'custom',
                        })
                      }
                      className="px-2 py-1 rounded text-[11px] font-mono border"
                      style={{
                        backgroundColor: 'var(--studio-bg-elevated)',
                        borderColor: 'var(--studio-border-strong)',
                        color: 'var(--studio-text)',
                      }}
                    >
                      <option value="visible">Mantener visibles</option>
                      <option value="auto_hide">Ocultar automáticamente</option>
                      <option value="hover_reveal">Mostrar al pasar el cursor</option>
                    </select>
                  </div>

                  {/* Per-zone Orientation */}
                  <div className="pt-2 border-t flex flex-col gap-1.5 text-xs" style={{ borderColor: 'var(--studio-border)' }}>
                    <span className="text-[11px] font-bold" style={{ color: 'var(--studio-text-muted)' }}>
                      Orientación por Zona (Vertical / Horizontal / Mixto)
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(
                        [
                          ['top', 'Arriba'],
                          ['bottom', 'Abajo'],
                          ['left-main', 'Izquierda'],
                          ['right-main', 'Derecha'],
                        ] as [PanelDockZone, string][]
                      ).map(([z, lbl]) => {
                        const cur = layout.dockOrientations?.[z] || (z === 'top' ? 'horizontal' : 'vertical');
                        return (
                          <div
                            key={z}
                            className="flex items-center justify-between px-2 py-1 rounded border text-[10px]"
                            style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
                          >
                            <span>{lbl}</span>
                            <select
                              value={cur}
                              onChange={(e) =>
                                onChangeLayout({
                                  ...layout,
                                  dockOrientations: {
                                    ...(layout.dockOrientations || {}),
                                    [z]: e.target.value as DockOrientation,
                                  },
                                  templateId: 'custom',
                                })
                              }
                              className="bg-transparent font-mono font-bold"
                            >
                              <option value="vertical">Vertical</option>
                              <option value="horizontal">Horizontal</option>
                              <option value="mixed">Mixto</option>
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Visibility checkboxes & Modes */}
                  <div className="pt-2 border-t flex flex-col gap-2 text-xs" style={{ borderColor: 'var(--studio-border)' }}>
                    <label className="flex items-center justify-between cursor-pointer font-semibold text-amber-300">
                      <span className="flex items-center gap-1.5">
                        <Unlock className="w-3.5 h-3.5" /> Modo Edición Libre de Interfaz (TopBar, Tools, Paneles y Orden de Herramientas)
                      </span>
                      <input
                        type="checkbox"
                        checked={Boolean(layout.uiEditMode)}
                        onChange={() => {
                          if (onToggleUiEditMode) {
                            onToggleUiEditMode();
                          } else {
                            const nextVal = !layout.uiEditMode;
                            onChangeLayout({
                              ...layout,
                              uiEditMode: nextVal,
                              totalFreedomMode: nextVal ? true : layout.totalFreedomMode,
                            });
                          }
                        }}
                        className="accent-amber-400"
                      />
                    </label>
                    <div className="flex items-center justify-between text-[11px] pl-5" style={{ color: 'var(--studio-text-muted)' }}>
                      <span>Orden de herramientas personalizado</span>
                      <button
                        type="button"
                        onClick={() =>
                          onChangeLayout({
                            ...layout,
                            toolOrder: DEFAULT_WORKSPACE_LAYOUT.toolOrder,
                            templateId: 'custom',
                          })
                        }
                        className="px-2 py-0.5 rounded border text-[10px] hover:opacity-90 flex items-center gap-1"
                        style={{
                          backgroundColor: 'var(--studio-bg-elevated)',
                          borderColor: 'var(--studio-border-strong)',
                          color: 'var(--studio-text)',
                        }}
                      >
                        <RotateCcw className="w-2.5 h-2.5" /> Restaurar orden
                      </button>
                    </div>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span>Modo Compacto (reduce padding e iconos para máxima densidad)</span>
                      <input
                        type="checkbox"
                        checked={Boolean(layout.compactMode)}
                        onChange={(e) => onChangeLayout({ ...layout, compactMode: e.target.checked, templateId: 'custom' })}
                        className="accent-amber-400"
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span>Mostrar Barra de Herramientas Rápida (TopBar)</span>
                      <input
                        type="checkbox"
                        checked={layout.showTopBar}
                        onChange={(e) => onChangeLayout({ ...layout, showTopBar: e.target.checked, templateId: 'custom' })}
                        className="accent-amber-400"
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span>Integrar pestañas de proyectos en la barra superior</span>
                      <input
                        type="checkbox"
                        checked={layout.integratedTitlebarTabs !== false}
                        onChange={(e) =>
                          onChangeLayout({
                            ...layout,
                            integratedTitlebarTabs: e.target.checked,
                            templateId: 'custom',
                          })
                        }
                        className="accent-amber-400"
                      />
                    </label>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium">Áreas de arrastre de ventana</span>
                      <select
                        value={layout.windowDragZones || 'topbar_and_empty_bars'}
                        onChange={(e) =>
                          onChangeLayout({
                            ...layout,
                            windowDragZones: e.target.value as 'topbar_only' | 'topbar_and_empty_bars',
                            templateId: 'custom',
                          })
                        }
                        className="px-2 py-1 rounded text-[11px] font-mono border"
                        style={{
                          backgroundColor: 'var(--studio-bg-elevated)',
                          borderColor: 'var(--studio-border-strong)',
                          color: 'var(--studio-text)',
                        }}
                      >
                        <option value="topbar_and_empty_bars">Barra superior + zonas vacías</option>
                        <option value="topbar_only">Solo barra superior</option>
                      </select>
                    </div>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span>Mostrar Ventana Mini Preview sobre el Lienzo</span>
                      <input
                        type="checkbox"
                        checked={layout.showMiniPlayer}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const startCollapsed = layout.miniPreviewPrefs?.startCollapsed ?? true;
                          onChangeLayout({
                            ...layout,
                            showMiniPlayer: checked,
                            miniPreviewCollapsed: checked ? startCollapsed : layout.miniPreviewCollapsed ?? true,
                            templateId: 'custom',
                          });
                        }}
                        className="accent-amber-400"
                      />
                    </label>
                  </div>
                </div>

                {/* Timeline Internal Block Order */}
                <div
                  className="p-4 rounded-xl border flex flex-col gap-2.5"
                  style={{
                    backgroundColor: 'var(--studio-bg-card)',
                    borderColor: 'var(--studio-border)',
                  }}
                >
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                    Orden de la Línea de Tiempo
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--studio-text-muted)' }}>
                    Coloca los controles de Play, FPS y Startup/Hit/Recovery arriba o abajo de los fotogramas.
                  </p>

                  <div className="flex flex-col gap-1.5">
                    {layout.timelineSectionOrder.map((secId, idx) => {
                      const meta = TIMELINE_SECTION_LABELS[secId];
                      return (
                        <div
                          key={secId}
                          className="px-3 py-2 rounded-lg border flex items-center justify-between gap-2"
                          style={{
                            backgroundColor: 'var(--studio-bg-elevated)',
                            borderColor: 'var(--studio-border-strong)',
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold">{meta.title}</span>
                            <span className="text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>
                              {meta.subtitle}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => moveTimelineSection(idx, -1)}
                              disabled={idx === 0}
                              className="p-1 rounded border disabled:opacity-30"
                              style={{ borderColor: 'var(--studio-border-strong)' }}
                              title="Subir sección"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => moveTimelineSection(idx, 1)}
                              disabled={idx === layout.timelineSectionOrder.length - 1}
                              className="p-1 rounded border disabled:opacity-30"
                              style={{ borderColor: 'var(--studio-border-strong)' }}
                              title="Bajar sección"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* 4. Modular Right Panels Order & Visibility */}
              <section
                className="p-4 rounded-xl border flex flex-col gap-3"
                style={{
                  backgroundColor: 'var(--studio-bg-card)',
                  borderColor: 'var(--studio-border)',
                }}
              >
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                  Orden y Visibilidad de Paneles Modulares
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {layout.rightPanels.map((panel, idx) => {
                    const meta = PANEL_REGISTRY.find((m) => m.id === panel.id);
                    const disabledFreedom = Boolean(
                      meta?.requiresTotalFreedom && !(layout.uiEditMode || layout.totalFreedomMode)
                    );
                    return (
                    <div
                      key={panel.id}
                      className="px-3 py-2 rounded-lg border flex items-center justify-between gap-2"
                      style={{
                        backgroundColor: 'var(--studio-bg-elevated)',
                        borderColor: 'var(--studio-border-strong)',
                        opacity: disabledFreedom ? 0.45 : panel.visible ? 1 : 0.55,
                      }}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold truncate">{panel.title}</span>
                        {meta && (
                          <span className="text-[9px] font-mono truncate" style={{ color: 'var(--studio-text-muted)' }}>
                            {meta.category}{disabledFreedom ? ' · Activa Modo Libre' : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <select
                          disabled={disabledFreedom}
                          value={panel.dock || (layout.sidebarPosition === 'left' ? 'left-main' : 'right-main')}
                          onChange={(e) => {
                            const nextDock = e.target.value as PanelDockZone;
                            onChangeLayout({
                              ...layout,
                              templateId: 'custom',
                              rightPanels: layout.rightPanels.map((p) =>
                                p.id === panel.id ? { ...p, dock: nextDock, visible: true } : p
                              ),
                            });
                          }}
                          className="px-1.5 py-0.5 rounded border text-[10px] font-mono"
                          style={{
                            backgroundColor: 'var(--studio-bg-panel)',
                            borderColor: 'var(--studio-border-strong)',
                            color: 'var(--studio-text)',
                          }}
                        >
                          <option value="top">Arriba (Top)</option>
                          <option value="bottom">Abajo (Bottom)</option>
                          <option value="right-main">Der Principal</option>
                          <option value="right-mini">Der Minipanel</option>
                          <option value="left-main">Izq Principal</option>
                          <option value="left-mini">Izq Minipanel</option>
                        </select>
                        <button
                          disabled={disabledFreedom}
                          onClick={() => toggleRightPanelVisible(panel.id)}
                          className="p-1 rounded border disabled:opacity-40"
                          style={{ borderColor: 'var(--studio-border-strong)' }}
                          title={panel.visible ? 'Ocultar panel' : 'Mostrar panel'}
                        >
                          {panel.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => moveRightPanel(idx, -1)}
                          disabled={idx === 0}
                          className="p-1 rounded border disabled:opacity-30"
                          style={{ borderColor: 'var(--studio-border-strong)' }}
                          title="Mover arriba"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveRightPanel(idx, 1)}
                          disabled={idx === layout.rightPanels.length - 1}
                          className="p-1 rounded border disabled:opacity-30"
                          style={{ borderColor: 'var(--studio-border-strong)' }}
                          title="Mover abajo"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          {activeTab === 'style' && (
            <>
              {/* 0. Presets de Estilo Visual de Interfaz */}
              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                      Presets de Estilo Visual (8 Modos)
                    </h3>
                    <p className="text-[11px]" style={{ color: 'var(--studio-text-muted)' }}>
                      Cambia el lenguaje visual completo de botones, esquinas, densidad, iconos y degradados en un clic.
                    </p>
                  </div>
                  <button
                    onClick={() => onChangeStyleConfig(DEFAULT_STUDIO_STYLE)}
                    className="text-[11px] flex items-center gap-1 hover:underline cursor-pointer"
                    style={{ color: 'var(--studio-accent)' }}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restablecer todo</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {UI_STYLE_PRESETS.map((preset) => {
                    const isActive = (styleConfig.uiPreset || 'modern') === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          onChangeStyleConfig({
                            ...styleConfig,
                            ...preset.patch,
                            uiPreset: preset.id,
                            customColors: preset.patch.customColors ? { ...preset.patch.customColors } : {},
                            gradients: preset.patch.gradients
                              ? { ...preset.patch.gradients }
                              : styleConfig.gradients,
                          })
                        }
                        className="p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer"
                        style={{
                          backgroundColor: isActive ? 'var(--studio-bg-elevated)' : 'var(--studio-bg-card)',
                          borderColor: isActive ? 'var(--studio-accent)' : 'var(--studio-border-strong)',
                          boxShadow: isActive ? '0 0 0 1px var(--studio-accent)' : undefined,
                        }}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold truncate">{preset.name}</span>
                          {isActive && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--studio-accent)' }} />}
                        </div>
                        <p className="text-[10px] leading-snug" style={{ color: 'var(--studio-text-muted)' }}>
                          {preset.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* 1. Paletas / Temas Base del Software */}
              <section className="flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                  Temas Base de Color
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {STUDIO_THEMES.map((theme) => {
                    const isActive = styleConfig.themeId === theme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() =>
                          onChangeStyleConfig({
                            ...styleConfig,
                            themeId: theme.id,
                            customAccent: undefined,
                          })
                        }
                        className="p-3 rounded-xl border text-left flex flex-col gap-2 transition-all cursor-pointer"
                        style={{
                          backgroundColor: theme.vars.bgPanel,
                          borderColor: isActive ? theme.vars.accent : theme.vars.borderStrong,
                          color: theme.vars.text,
                          boxShadow: isActive ? `0 0 0 1px ${theme.vars.accent}` : undefined,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{theme.name}</span>
                          {isActive && <Check className="w-4 h-4" style={{ color: theme.vars.accent }} />}
                        </div>
                        <p className="text-[11px]" style={{ color: theme.vars.textMuted }}>
                          {theme.subtitle}
                        </p>
                        <div className="flex items-center gap-1.5 pt-1">
                          {[theme.vars.bgApp, theme.vars.bgPanel, theme.vars.bgElevated, theme.vars.accent, theme.vars.text].map((hex, i) => (
                            <span
                              key={i}
                              className="w-5 h-3 rounded-sm border border-black/25"
                              style={{ backgroundColor: hex }}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* 2. Colores Personalizados por Elemento & Degradados */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div
                  className="p-4 rounded-xl border flex flex-col gap-3"
                  style={{
                    backgroundColor: 'var(--studio-bg-card)',
                    borderColor: 'var(--studio-border)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                      Paleta de Colores Personalizados (UI)
                    </h3>
                    <button
                      type="button"
                      onClick={() => onChangeStyleConfig({ ...styleConfig, customColors: {} })}
                      className="text-[10px] hover:underline cursor-pointer"
                      style={{ color: 'var(--studio-accent)' }}
                    >
                      Limpiar overrides
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {(
                      [
                        ['mainBg', 'Fondo principal', '#0d101b'],
                        ['panelsBg', 'Fondo de paneles', '#131724'],
                        ['barsBg', 'Barras y menús', '#0f121d'],
                        ['buttonsBg', 'Botones base', '#1a2033'],
                        ['hoverBg', 'Hover / realce', '#262f48'],
                        ['selectionBg', 'Selección activa', '#fbbf24'],
                        ['textColor', 'Color de texto', '#f1f5f9'],
                        ['iconColor', 'Color de iconos', '#cbd5e1'],
                      ] as [keyof CustomUiColors, string, string][]
                    ).map(([key, label, fallbackHex]) => {
                      const val = styleConfig.customColors?.[key];
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border"
                          style={{
                            backgroundColor: 'var(--studio-bg-elevated)',
                            borderColor: 'var(--studio-border-strong)',
                          }}
                        >
                          <span className="text-[11px] truncate">{label}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="color"
                              value={val || fallbackHex}
                              onChange={(e) =>
                                onChangeStyleConfig({
                                  ...styleConfig,
                                  customColors: {
                                    ...(styleConfig.customColors || {}),
                                    [key]: e.target.value,
                                  },
                                })
                              }
                              className="w-6 h-5 rounded cursor-pointer bg-transparent border-0"
                            />
                            {val && (
                              <button
                                type="button"
                                onClick={() => {
                                  const next = { ...(styleConfig.customColors || {}) };
                                  delete next[key];
                                  onChangeStyleConfig({ ...styleConfig, customColors: next });
                                }}
                                title="Restaurar color base del tema"
                                className="text-[10px] opacity-70 hover:opacity-100 cursor-pointer"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Forma, Botones, Densidad, Iconos y Degradados */}
                <div
                  className="p-4 rounded-xl border flex flex-col gap-3"
                  style={{
                    backgroundColor: 'var(--studio-bg-card)',
                    borderColor: 'var(--studio-border)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" style={{ color: 'var(--studio-accent)' }} />
                    <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                      Geometría, Densidad, Iconos y Degradados
                    </h3>
                  </div>

                  {/* Acento rápido */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs">Acento:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {ACCENT_SWATCHES.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => onChangeStyleConfig({ ...styleConfig, customAccent: hex })}
                          className="w-4 h-4 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer"
                          style={{
                            backgroundColor: hex,
                            borderColor: styleConfig.customAccent === hex ? '#ffffff' : 'transparent',
                          }}
                          title={hex}
                        />
                      ))}
                      <input
                        type="color"
                        value={styleConfig.customAccent || '#fbbf24'}
                        onChange={(e) => onChangeStyleConfig({ ...styleConfig, customAccent: e.target.value })}
                        className="w-6 h-5 rounded cursor-pointer bg-transparent"
                        title="Color de acento personalizado"
                      />
                    </div>
                  </div>

                  {/* Forma de esquinas */}
                  <div className="flex flex-col gap-1 text-xs">
                    <span className="text-[11px]" style={{ color: 'var(--studio-text-muted)' }}>
                      Esquinas de ventanas y paneles:
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {(
                        [
                          ['straight', 'Rectas'],
                          ['slightly_rounded', 'Poco red.'],
                          ['rounded', 'Redondas'],
                          ['very_rounded', 'Muy red.'],
                        ] as [CornerStyleId, string][]
                      ).map(([cs, label]) => (
                        <button
                          key={cs}
                          type="button"
                          onClick={() => onChangeStyleConfig({ ...styleConfig, cornerStyle: cs })}
                          className="px-2 py-1 rounded text-[10px] font-mono border cursor-pointer"
                          style={{
                            backgroundColor: styleConfig.cornerStyle === cs ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                            color: styleConfig.cornerStyle === cs ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                            borderColor: 'var(--studio-border-strong)',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Forma de botones */}
                  <div className="flex flex-col gap-1 text-xs">
                    <span className="text-[11px]" style={{ color: 'var(--studio-text-muted)' }}>
                      Forma de botones:
                    </span>
                    <div className="grid grid-cols-5 gap-1">
                      {(
                        [
                          ['rectangular', 'Rect'],
                          ['rounded_rect', 'Suave'],
                          ['square', 'Cuadro'],
                          ['circular', 'Círc.'],
                          ['pill', 'Cápsula'],
                        ] as [ButtonStyleId, string][]
                      ).map(([bs, label]) => (
                        <button
                          key={bs}
                          type="button"
                          onClick={() => onChangeStyleConfig({ ...styleConfig, buttonStyle: bs })}
                          className="px-1.5 py-1 rounded text-[10px] font-mono border cursor-pointer truncate"
                          style={{
                            backgroundColor: (styleConfig.buttonStyle || 'rounded_rect') === bs ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                            color: (styleConfig.buttonStyle || 'rounded_rect') === bs ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                            borderColor: 'var(--studio-border-strong)',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Densidad + Iconos */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px]" style={{ color: 'var(--studio-text-muted)' }}>
                        Densidad UI:
                      </span>
                      <div className="grid grid-cols-3 gap-1">
                        {(
                          [
                            ['compact', 'Comp'],
                            ['normal', 'Norm'],
                            ['spacious', 'Ampl'],
                          ] as [UiDensityId, string][]
                        ).map(([d, label]) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => onChangeStyleConfig({ ...styleConfig, density: d })}
                            className="py-1 rounded text-[10px] font-mono border cursor-pointer"
                            style={{
                              backgroundColor: (styleConfig.density || 'normal') === d ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                              color: (styleConfig.density || 'normal') === d ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                              borderColor: 'var(--studio-border-strong)',
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[11px]" style={{ color: 'var(--studio-text-muted)' }}>
                        Tamaño de iconos:
                      </span>
                      <div className="grid grid-cols-4 gap-1">
                        {(['sm', 'md', 'lg', 'xl'] as IconSizeId[]).map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => onChangeStyleConfig({ ...styleConfig, iconSize: sz })}
                            className="py-1 rounded text-[10px] font-mono border uppercase cursor-pointer"
                            style={{
                              backgroundColor: (styleConfig.iconSize || 'md') === sz ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                              color: (styleConfig.iconSize || 'md') === sz ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                              borderColor: 'var(--studio-border-strong)',
                            }}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 text-xs">
                    <span className="text-[11px]" style={{ color: 'var(--studio-text-muted)' }}>
                      Estilo visual de iconos:
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {(
                        [
                          ['modern', 'Moderno'],
                          ['minimal', 'Minimal'],
                          ['pixel', 'Pixel'],
                          ['classic', 'Clásico'],
                        ] as [IconStyleId, string][]
                      ).map(([isId, label]) => (
                        <button
                          key={isId}
                          type="button"
                          onClick={() => onChangeStyleConfig({ ...styleConfig, iconStyle: isId })}
                          className="py-1 rounded text-[10px] font-mono border cursor-pointer"
                          style={{
                            backgroundColor: (styleConfig.iconStyle || 'modern') === isId ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                            color: (styleConfig.iconStyle || 'modern') === isId ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                            borderColor: 'var(--studio-border-strong)',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Degradados */}
                  <div className="pt-2 border-t flex flex-col gap-2 text-xs" style={{ borderColor: 'var(--studio-border)' }}>
                    <label className="flex items-center justify-between cursor-pointer font-semibold">
                      <span>Usar degradados sutiles en la interfaz</span>
                      <input
                        type="checkbox"
                        checked={Boolean(styleConfig.gradients?.useGradients)}
                        onChange={(e) =>
                          onChangeStyleConfig({
                            ...styleConfig,
                            gradients: {
                              windows: styleConfig.gradients?.windows ?? true,
                              buttons: styleConfig.gradients?.buttons ?? false,
                              panels: styleConfig.gradients?.panels ?? false,
                              headers: styleConfig.gradients?.headers ?? true,
                              useGradients: e.target.checked,
                            },
                          })
                        }
                        className="accent-amber-400 cursor-pointer"
                      />
                    </label>
                    {styleConfig.gradients?.useGradients && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                        {(
                          [
                            ['windows', 'Ventanas'],
                            ['buttons', 'Botones'],
                            ['panels', 'Paneles'],
                            ['headers', 'Encabezados'],
                          ] as const
                        ).map(([gKey, gLabel]) => (
                          <label
                            key={gKey}
                            className="flex items-center gap-1.5 px-2 py-1 rounded border cursor-pointer"
                            style={{
                              backgroundColor: 'var(--studio-bg-elevated)',
                              borderColor: 'var(--studio-border-strong)',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(styleConfig.gradients?.[gKey])}
                              onChange={(e) =>
                                onChangeStyleConfig({
                                  ...styleConfig,
                                  gradients: {
                                    ...styleConfig.gradients!,
                                    [gKey]: e.target.checked,
                                  },
                                })
                              }
                              className="accent-amber-400"
                            />
                            <span>{gLabel}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* 3. Fonts & Typography */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className="p-4 rounded-xl border flex flex-col gap-3"
                  style={{
                    backgroundColor: 'var(--studio-bg-card)',
                    borderColor: 'var(--studio-border)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4" style={{ color: 'var(--studio-accent)' }} />
                    <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                      Tipografía de Interfaz
                    </h3>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {STUDIO_UI_FONTS.map((f) => {
                      const active = styleConfig.uiFontId === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() => onChangeStyleConfig({ ...styleConfig, uiFontId: f.id })}
                          className="px-3 py-2 rounded-lg border flex items-center justify-between text-left transition-colors cursor-pointer"
                          style={{
                            fontFamily: f.family,
                            backgroundColor: active ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                            color: active ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                            borderColor: 'var(--studio-border-strong)',
                          }}
                        >
                          <span className="text-xs font-bold">{f.name}</span>
                          <span className="text-[11px] opacity-80">{f.sample}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {/* Mono Font */}
                  <div
                    className="p-4 rounded-xl border flex flex-col gap-2.5"
                    style={{
                      backgroundColor: 'var(--studio-bg-card)',
                      borderColor: 'var(--studio-border)',
                    }}
                  >
                    <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                      Tipografía Numérica (Frame Data y Coordenadas)
                    </h3>

                    <div className="flex flex-col gap-1.5">
                      {STUDIO_MONO_FONTS.map((f) => {
                        const active = styleConfig.monoFontId === f.id;
                        return (
                          <button
                            key={f.id}
                            onClick={() => onChangeStyleConfig({ ...styleConfig, monoFontId: f.id })}
                            className="px-3 py-2 rounded-lg border flex items-center justify-between text-left transition-colors cursor-pointer"
                            style={{
                              fontFamily: f.family,
                              backgroundColor: active ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                              color: active ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                              borderColor: 'var(--studio-border-strong)',
                            }}
                          >
                            <span className="text-xs font-bold">{f.name}</span>
                            <span className="text-[11px] tabular-nums">0.10s · 6T · 48x48</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Guardar, Cargar, Exportar e Importar Temas */}
                  <div
                    className="p-4 rounded-xl border flex flex-col gap-3"
                    style={{
                      backgroundColor: 'var(--studio-bg-card)',
                      borderColor: 'var(--studio-border)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                        Temas Guardados y Compartibles (.pcstheme.json)
                      </h3>
                      <div className="flex items-center gap-1.5">
                        <input
                          ref={importThemeRef}
                          type="file"
                          accept=".json,.pcstheme"
                          className="sr-only"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            try {
                              const raw = await f.text();
                              const parsed = parseStudioThemeFile(raw);
                              if (parsed) {
                                onChangeStyleConfig(parsed.style);
                                const entry: SavedCustomTheme = {
                                  id: `theme-${Date.now()}`,
                                  name: parsed.name,
                                  createdAt: new Date().toISOString(),
                                  style: parsed.style,
                                };
                                const nextList = [entry, ...savedThemes].slice(0, 20);
                                setSavedThemes(nextList);
                                saveSavedThemes(nextList);
                              }
                            } catch {
                              // ignore invalid file
                            }
                            e.target.value = '';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => importThemeRef.current?.click()}
                          className="px-2 py-1 rounded border text-[10px] font-semibold flex items-center gap-1 hover:opacity-90 cursor-pointer"
                          style={{
                            backgroundColor: 'var(--studio-bg-elevated)',
                            borderColor: 'var(--studio-border-strong)',
                          }}
                        >
                          <Upload className="w-3 h-3" /> Importar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const payload = serializeStudioTheme(styleConfig, customThemeName || 'MiTemaPixelClash');
                            const blob = new Blob([payload], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${(customThemeName || 'pixelclash_theme').replace(/\s+/g, '_').toLowerCase()}.pcstheme.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="px-2 py-1 rounded border text-[10px] font-semibold flex items-center gap-1 hover:opacity-90 cursor-pointer"
                          style={{
                            backgroundColor: 'var(--studio-bg-elevated)',
                            borderColor: 'var(--studio-border-strong)',
                          }}
                        >
                          <Download className="w-3 h-3" /> Exportar
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(serializeStudioTheme(styleConfig, customThemeName || 'MiTema'));
                              setCopiedThemeStatus(true);
                              setTimeout(() => setCopiedThemeStatus(false), 1800);
                            } catch {
                              // ignore clipboard restrictions
                            }
                          }}
                          className="px-2 py-1 rounded border text-[10px] font-semibold flex items-center gap-1 hover:opacity-90 cursor-pointer"
                          style={{
                            backgroundColor: 'var(--studio-bg-elevated)',
                            borderColor: 'var(--studio-border-strong)',
                          }}
                        >
                          <Share2 className="w-3 h-3" /> {copiedThemeStatus ? 'Copiado!' : 'Compartir JSON'}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customThemeName}
                        onChange={(e) => setCustomThemeName(e.target.value)}
                        placeholder="Nombre del tema (ej. Arcade Neon)..."
                        className="flex-1 px-2.5 py-1.5 rounded-lg border text-xs bg-transparent focus:outline-none"
                        style={{
                          backgroundColor: 'var(--studio-bg-elevated)',
                          borderColor: 'var(--studio-border-strong)',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const entry: SavedCustomTheme = {
                            id: `theme-${Date.now()}`,
                            name: customThemeName.trim() || `Tema ${savedThemes.length + 1}`,
                            createdAt: new Date().toISOString(),
                            style: { ...styleConfig },
                          };
                          const next = [entry, ...savedThemes].slice(0, 20);
                          setSavedThemes(next);
                          saveSavedThemes(next);
                          setCustomThemeName('');
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        style={{
                          backgroundColor: 'var(--studio-accent)',
                          color: 'var(--studio-accent-text)',
                        }}
                      >
                        <Save className="w-3.5 h-3.5" />
                        Guardar Tema
                      </button>
                    </div>

                    {savedThemes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {savedThemes.map((st) => (
                          <div
                            key={st.id}
                            className="flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg border text-[11px]"
                            style={{
                              backgroundColor: 'var(--studio-bg-elevated)',
                              borderColor: 'var(--studio-border-strong)',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => onChangeStyleConfig(st.style)}
                              className="font-semibold hover:underline cursor-pointer"
                            >
                              {st.name}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const next = savedThemes.filter((x) => x.id !== st.id);
                                setSavedThemes(next);
                                saveSavedThemes(next);
                              }}
                              title="Eliminar tema guardado"
                              className="p-0.5 rounded hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </>
          )}

          {activeTab === 'selections' && (
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Scan className="w-4 h-4" style={{ color: 'var(--studio-accent)' }} />
                    <span>Preferencias → Interfaz → Selecciones</span>
                  </h3>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--studio-text-muted)' }}>
                    Personaliza cómo se visualizan los marcos, lazos y máscaras de selección sobre el lienzo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onChangeSelectionDisplayConfig?.(DEFAULT_SELECTION_DISPLAY_CONFIG)}
                  className="px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 hover:opacity-90 whitespace-nowrap"
                  style={{
                    backgroundColor: 'var(--studio-bg-card)',
                    borderColor: 'var(--studio-border-strong)',
                  }}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restaurar</span>
                </button>
              </div>

              <div
                className="p-4 rounded-xl border flex flex-wrap items-center gap-4"
                style={{
                  backgroundColor: 'var(--studio-bg-card)',
                  borderColor: 'var(--studio-border)',
                }}
              >
                <SelectionLivePreview config={selectionDisplayConfig} />
                <div className="flex-1 min-w-[220px] grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(
                    [
                      ['marching_ants', 'Mostrar línea punteada animada', 'Borde clásico animado sin sombreado'],
                      ['fill_only', 'Mostrar sombreado interior', 'Relleno translúcido limpio sin contorno'],
                      ['both', 'Mostrar ambos', 'Línea punteada animada + sombreado interior'],
                      ['outline_only', 'Mostrar solo contorno', 'Línea sólida estática para máxima claridad'],
                    ] as [SelectionDisplayMode, string, string][]
                  ).map(([mode, title, desc]) => {
                    const active = selectionDisplayConfig.mode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() =>
                          onChangeSelectionDisplayConfig?.({
                            ...selectionDisplayConfig,
                            mode,
                          })
                        }
                        className="p-2.5 rounded-lg border text-left transition-colors"
                        style={{
                          backgroundColor: active
                            ? 'color-mix(in srgb, var(--studio-accent) 18%, var(--studio-bg-elevated))'
                            : 'var(--studio-bg-elevated)',
                          borderColor: active ? 'var(--studio-accent)' : 'var(--studio-border)',
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold">{title}</span>
                          {active && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--studio-accent)' }} />}
                        </div>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--studio-text-muted)' }}>
                          {desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                className="p-4 rounded-xl border grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono"
                style={{
                  backgroundColor: 'var(--studio-bg-card)',
                  borderColor: 'var(--studio-border)',
                }}
              >
                <StudioSlider
                  variant="panel"
                  label="Velocidad de animación"
                  value={selectionDisplayConfig.animationSpeed}
                  min={0}
                  max={100}
                  step={5}
                  defaultValue={50}
                  formatValue={(v) => (v === 0 ? 'Estática' : `${Math.round(v)}%`)}
                  onChange={(v) =>
                    onChangeSelectionDisplayConfig?.({
                      ...selectionDisplayConfig,
                      animationSpeed: Math.round(v),
                    })
                  }
                />

                <StudioSlider
                  variant="panel"
                  label="Opacidad del sombreado"
                  value={Math.round(selectionDisplayConfig.opacity * 100)}
                  min={5}
                  max={80}
                  step={5}
                  unit="%"
                  defaultValue={25}
                  onChange={(v) =>
                    onChangeSelectionDisplayConfig?.({
                      ...selectionDisplayConfig,
                      opacity: Math.round(v) / 100,
                    })
                  }
                />

                <StudioSlider
                  variant="panel"
                  label="Grosor del borde"
                  value={selectionDisplayConfig.thickness}
                  min={1}
                  max={4}
                  step={0.5}
                  unit=" px"
                  defaultValue={1.5}
                  formatValue={(v) => v.toFixed(1)}
                  onChange={(v) =>
                    onChangeSelectionDisplayConfig?.({
                      ...selectionDisplayConfig,
                      thickness: v,
                    })
                  }
                />

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <span style={{ color: 'var(--studio-text-muted)' }}>Color del borde y sombreado</span>
                    <span className="font-bold uppercase">{selectionDisplayConfig.borderColor}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <input
                      type="color"
                      value={selectionDisplayConfig.borderColor}
                      onChange={(e) =>
                        onChangeSelectionDisplayConfig?.({
                          ...selectionDisplayConfig,
                          borderColor: e.target.value,
                        })
                      }
                      className="w-7 h-6 rounded border cursor-pointer bg-transparent"
                      style={{ borderColor: 'var(--studio-border-strong)' }}
                    />
                    {['#38bdf8', '#fbbf24', '#22c55e', '#f43f5e', '#a855f7', '#ffffff'].map((sw) => (
                      <button
                        key={sw}
                        type="button"
                        onClick={() =>
                          onChangeSelectionDisplayConfig?.({
                            ...selectionDisplayConfig,
                            borderColor: sw,
                          })
                        }
                        className="w-5 h-5 rounded border-2 transition-transform hover:scale-110"
                        style={{
                          backgroundColor: sw,
                          borderColor: selectionDisplayConfig.borderColor === sw ? '#ffffff' : 'transparent',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'minipreview' && (() => {
            const prefs = {
              ...DEFAULT_MINI_PREVIEW_PREFS,
              ...(layout.miniPreviewPrefs || {}),
            };
            const updatePrefs = (patch: Partial<typeof prefs>) => {
              onChangeLayout({
                ...layout,
                miniPreviewPrefs: { ...prefs, ...patch },
                templateId: 'custom',
              });
            };
            const curW = layout.miniPreviewWidth ?? MINI_PREVIEW_DEFAULT_WIDTH;
            const curH = layout.miniPreviewHeight ?? MINI_PREVIEW_DEFAULT_HEIGHT;
            return (
              <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <Monitor className="w-4 h-4" style={{ color: 'var(--studio-accent)' }} />
                      <span>Preferencias → Interfaz → Mini Preview</span>
                    </h3>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--studio-text-muted)' }}>
                      Controla cómo aparece, recuerda su estado y se dimensiona el panel de Mini Previsualización sin invadir tu área de dibujo.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeLayout({
                        ...layout,
                        showMiniPlayer: false,
                        miniPreviewCollapsed: true,
                        miniPreviewWidth: MINI_PREVIEW_DEFAULT_WIDTH,
                        miniPreviewHeight: MINI_PREVIEW_DEFAULT_HEIGHT,
                        miniPreviewPosition: null,
                        miniPreviewPrefs: { ...DEFAULT_MINI_PREVIEW_PREFS },
                        templateId: 'custom',
                      })
                    }
                    className="px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 hover:opacity-90 whitespace-nowrap"
                    style={{
                      backgroundColor: 'var(--studio-bg-card)',
                      borderColor: 'var(--studio-border-strong)',
                    }}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restaurar Predeterminado</span>
                  </button>
                </div>

                {/* Behavior & Persistence Checkboxes */}
                <div
                  className="p-4 rounded-xl border flex flex-col gap-3"
                  style={{
                    backgroundColor: 'var(--studio-bg-card)',
                    borderColor: 'var(--studio-border)',
                  }}
                >
                  <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                    Reglas de Apertura y Persistencia
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {[
                      {
                        key: 'rememberLastState' as const,
                        label: 'Recordar último estado',
                        hint: 'Guarda entre sesiones si quedó oculta, contraída o abierta con su último tamaño.',
                      },
                      {
                        key: 'startCollapsed' as const,
                        label: 'Iniciar contraída',
                        hint: 'Al abrirse o mostrarse por primera vez, inicia como barra compacta sin cubrir el lienzo.',
                      },
                      {
                        key: 'neverAutoOpen' as const,
                        label: 'No abrir automáticamente',
                        hint: 'Nunca se abre sola al cargar PSD, PNG, WEBP, GIF, Spritesheets o proyectos recientes.',
                      },
                      {
                        key: 'openOnDemandOnly' as const,
                        label: 'Abrir solo bajo demanda',
                        hint: 'Solo se muestra cuando el usuario la solicita explícitamente desde el menú o la interfaz.',
                      },
                    ].map((opt) => (
                      <label
                        key={opt.key}
                        className="p-3 rounded-lg border flex items-start justify-between gap-3 cursor-pointer"
                        style={{
                          backgroundColor: 'var(--studio-bg-elevated)',
                          borderColor: prefs[opt.key] ? 'var(--studio-accent)' : 'var(--studio-border)',
                        }}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-xs">{opt.label}</span>
                          <span className="text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>
                            {opt.hint}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={prefs[opt.key]}
                          onChange={(e) => updatePrefs({ [opt.key]: e.target.checked })}
                          className="accent-amber-400 mt-0.5 shrink-0"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Size Limits & Live State Controls */}
                <div
                  className="p-4 rounded-xl border flex flex-col gap-4"
                  style={{
                    backgroundColor: 'var(--studio-bg-card)',
                    borderColor: 'var(--studio-border)',
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                      Tamaño Inicial y Comportamiento de Panel
                    </h4>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-mono border"
                      style={{
                        backgroundColor: 'var(--studio-bg-elevated)',
                        borderColor: 'var(--studio-border-strong)',
                        color: 'var(--studio-accent)',
                      }}
                    >
                      Estado actual: {!layout.showMiniPlayer ? 'Oculta' : layout.miniPreviewCollapsed ? 'Contraída' : `Abierta (${curW}×${curH} px)`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
                    <StudioSlider
                      variant="panel"
                      label="Ancho de ventana (px)"
                      value={curW}
                      min={MINI_PREVIEW_MIN_WIDTH}
                      max={MINI_PREVIEW_MAX_WIDTH}
                      step={4}
                      unit=" px"
                      defaultValue={MINI_PREVIEW_DEFAULT_WIDTH}
                      onChange={(v) =>
                        onChangeLayout({
                          ...layout,
                          miniPreviewWidth: Math.round(v),
                          templateId: 'custom',
                        })
                      }
                    />
                    <StudioSlider
                      variant="panel"
                      label="Alto de ventana (px)"
                      value={curH}
                      min={MINI_PREVIEW_MIN_HEIGHT}
                      max={MINI_PREVIEW_MAX_HEIGHT}
                      step={4}
                      unit=" px"
                      defaultValue={MINI_PREVIEW_DEFAULT_HEIGHT}
                      onChange={(v) =>
                        onChangeLayout({
                          ...layout,
                          miniPreviewHeight: Math.round(v),
                          templateId: 'custom',
                        })
                      }
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        onChangeLayout({
                          ...layout,
                          showMiniPlayer: !layout.showMiniPlayer,
                          miniPreviewCollapsed: !layout.showMiniPlayer ? prefs.startCollapsed : layout.miniPreviewCollapsed,
                          templateId: 'custom',
                        })
                      }
                      className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5"
                      style={{
                        backgroundColor: layout.showMiniPlayer ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                        color: layout.showMiniPlayer ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                        borderColor: 'var(--studio-border-strong)',
                      }}
                    >
                      {layout.showMiniPlayer ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{layout.showMiniPlayer ? 'Ocultar Mini Preview' : 'Mostrar Mini Preview'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onChangeLayout({
                          ...layout,
                          showMiniPlayer: true,
                          miniPreviewCollapsed: !(layout.miniPreviewCollapsed ?? true),
                          templateId: 'custom',
                        })
                      }
                      className="px-3 py-1.5 rounded-lg border text-xs font-semibold"
                      style={{
                        backgroundColor: 'var(--studio-bg-elevated)',
                        borderColor: 'var(--studio-border-strong)',
                      }}
                    >
                      {layout.miniPreviewCollapsed ? 'Expandir sobre Lienzo' : 'Contraer'}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onChangeLayout({
                          ...layout,
                          showMiniPlayer: false,
                          rightPanels: layout.rightPanels.map((p) =>
                            p.id === 'preview' ? { ...p, visible: true, expanded: true } : p
                          ),
                          templateId: 'custom',
                        })
                      }
                      className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5"
                      style={{
                        backgroundColor: 'var(--studio-bg-elevated)',
                        borderColor: 'var(--studio-border-strong)',
                      }}
                    >
                      <PanelRight className="w-3.5 h-3.5" />
                      <span>Acoplar en Barra Lateral</span>
                    </button>

                    {layout.miniPreviewPosition && (
                      <button
                        type="button"
                        onClick={() =>
                          onChangeLayout({
                            ...layout,
                            miniPreviewPosition: null,
                            templateId: 'custom',
                          })
                        }
                        className="px-3 py-1.5 rounded-lg border text-xs font-mono"
                        style={{
                          backgroundColor: 'var(--studio-bg-elevated)',
                          borderColor: 'var(--studio-border-strong)',
                        }}
                      >
                        Restablecer posición
                      </button>
                    )}
                  </div>
                </div>
              </section>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
