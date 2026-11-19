import React, { useMemo, useState } from 'react';
import {
  CheckSquare,
  Clock,
  FilePlus,
  Film,
  Gamepad2,
  Grid,
  Layers,
  Layout,
  Palette,
  Sparkles,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { FIGHTING_GAME_PALETTES } from '../constants/palettes';
import { NewProjectConfig, RecentProjectEntry } from '../types';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject?: (name: string, width: number, height: number) => void;
  onCreateProjectConfig?: (config: NewProjectConfig) => void;
  recentProjects?: RecentProjectEntry[];
  onOpenRecentProject?: (entry: RecentProjectEntry) => void;
  onClearRecentProjects?: () => void;
}

interface ProjectTemplateItem {
  id: string;
  category: 'Lucha' | 'Pixel Art' | 'Spritesheets' | 'UI / HUD' | 'Concepto';
  name: string;
  width: number;
  height: number;
  pixelScale: number;
  desc: string;
  animationMode: boolean;
  grid: boolean;
  pixelPerfect: boolean;
}

const PROJECT_TEMPLATES: ProjectTemplateItem[] = [
  { id: 'fg-16bit', category: 'Lucha', name: 'Fighter 16-Bit', width: 48, height: 48, pixelScale: 1, desc: 'Estándar arcade ágil', animationMode: true, grid: true, pixelPerfect: true },
  { id: 'fg-cps2', category: 'Lucha', name: 'CPS-2 Luchador', width: 64, height: 64, pixelScale: 1, desc: 'Sprite medio detallado', animationMode: true, grid: true, pixelPerfect: true },
  { id: 'fg-boss', category: 'Lucha', name: 'Jefe SNK Boss', width: 96, height: 96, pixelScale: 1, desc: 'Personaje gran escala', animationMode: true, grid: true, pixelPerfect: false },
  { id: 'pa-micro', category: 'Pixel Art', name: 'Icono / Ítem 16×16', width: 16, height: 16, pixelScale: 2, desc: 'Objetos RPG / HUD', animationMode: false, grid: true, pixelPerfect: true },
  { id: 'pa-tile', category: 'Pixel Art', name: 'Tile 32×32', width: 32, height: 32, pixelScale: 1, desc: 'Mosaico / Chibi', animationMode: false, grid: true, pixelPerfect: true },
  { id: 'pa-portrait', category: 'Pixel Art', name: 'Retrato 64×80', width: 64, height: 80, pixelScale: 1, desc: 'Diálogo y selección', animationMode: false, grid: false, pixelPerfect: true },
  { id: 'ss-combo', category: 'Spritesheets', name: 'Tira Acción 80×80', width: 80, height: 80, pixelScale: 1, desc: 'Ataques largos / VFX', animationMode: true, grid: true, pixelPerfect: true },
  { id: 'ss-vfx', category: 'Spritesheets', name: 'Proyectil / Aura', width: 64, height: 48, pixelScale: 1, desc: 'Bolas de fuego e impactos', animationMode: true, grid: true, pixelPerfect: false },
  { id: 'ui-hud', category: 'UI / HUD', name: 'Barra Vida / HUD', width: 192, height: 48, pixelScale: 1, desc: 'Barras arcade K.O.', animationMode: false, grid: true, pixelPerfect: true },
  { id: 'ui-card', category: 'UI / HUD', name: 'Tarjeta / Marco UI', width: 128, height: 96, pixelScale: 1, desc: 'Ventanas de menú retro', animationMode: false, grid: true, pixelPerfect: true },
  { id: 'co-stage', category: 'Concepto', name: 'Escenario 256×144', width: 256, height: 144, pixelScale: 1, desc: 'Fondo panorámico 16:9', animationMode: false, grid: false, pixelPerfect: false },
  { id: 'co-sketch', category: 'Concepto', name: 'Concepto Amplio', width: 160, height: 120, pixelScale: 1, desc: 'Boceto o composición libre', animationMode: false, grid: false, pixelPerfect: false },
];

const CATEGORIES: ('Todas' | ProjectTemplateItem['category'])[] = [
  'Todas',
  'Lucha',
  'Pixel Art',
  'Spritesheets',
  'UI / HUD',
  'Concepto',
];

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
  onCreateProjectConfig,
  recentProjects = [],
  onOpenRecentProject,
  onClearRecentProjects,
}) => {
  const [name, setName] = useState<string>('Nuevo Fighter');
  const [category, setCategory] = useState<'Todas' | ProjectTemplateItem['category']>('Todas');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('fg-16bit');
  const [width, setWidth] = useState<number>(48);
  const [height, setHeight] = useState<number>(48);
  const [pixelScale, setPixelScale] = useState<number>(1);
  const [backgroundMode, setBackgroundMode] = useState<'transparent' | 'solid'>('transparent');
  const [backgroundColor, setBackgroundColor] = useState<string>('#111524');
  const [initialPaletteId, setInitialPaletteId] = useState<string>(FIGHTING_GAME_PALETTES[0]?.id || 'capcom-cps2');
  const [enableGrid, setEnableGrid] = useState<boolean>(true);
  const [enablePixelPerfect, setEnablePixelPerfect] = useState<boolean>(true);
  const [createInitialLayer, setCreateInitialLayer] = useState<boolean>(true);
  const [createInitialGroup, setCreateInitialGroup] = useState<boolean>(false);
  const [enableAnimationMode, setEnableAnimationMode] = useState<boolean>(true);

  const visibleTemplates = useMemo(
    () =>
      category === 'Todas'
        ? PROJECT_TEMPLATES
        : PROJECT_TEMPLATES.filter((t) => t.category === category),
    [category]
  );

  const selectedPalette = useMemo(
    () => FIGHTING_GAME_PALETTES.find((p) => p.id === initialPaletteId) || FIGHTING_GAME_PALETTES[0],
    [initialPaletteId]
  );

  const effWidth = Math.max(8, Math.min(512, Math.round(width * pixelScale)));
  const effHeight = Math.max(8, Math.min(512, Math.round(height * pixelScale)));

  if (!isOpen) return null;

  const applyTemplate = (tpl: ProjectTemplateItem) => {
    setSelectedTemplateId(tpl.id);
    setWidth(tpl.width);
    setHeight(tpl.height);
    setPixelScale(tpl.pixelScale);
    setEnableAnimationMode(tpl.animationMode);
    setEnableGrid(tpl.grid);
    setEnablePixelPerfect(tpl.pixelPerfect);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const safeName = name.trim() || 'Proyecto PixelArt';
    if (effWidth <= 0 || effHeight <= 0) return;

    if (onCreateProjectConfig) {
      const tpl = PROJECT_TEMPLATES.find((t) => t.id === selectedTemplateId);
      onCreateProjectConfig({
        name: safeName,
        width: effWidth,
        height: effHeight,
        pixelScale,
        category: tpl?.category || 'Personalizado',
        templateId: selectedTemplateId,
        backgroundMode,
        backgroundColor,
        initialPaletteId,
        enableGrid,
        enablePixelPerfect,
        createInitialLayer,
        createInitialGroup,
        enableAnimationMode,
      });
    } else if (onCreateProject) {
      onCreateProject(safeName, effWidth, effHeight);
    }
    onClose();
  };

  // Live aspect box dimensions inside preview area
  const aspectRatio = effWidth / Math.max(1, effHeight);
  const maxPreviewW = 148;
  const maxPreviewH = 112;
  let prevW = maxPreviewW;
  let prevH = prevW / aspectRatio;
  if (prevH > maxPreviewH) {
    prevH = maxPreviewH;
    prevW = prevH * aspectRatio;
  }

  return (
    <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#121521] border border-[#2a334a] rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#242b40] bg-[#0f121d] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-400/40 text-emerald-400">
              <FilePlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Nuevo Archivo &amp; Plantillas de Estudio</h3>
              <p className="text-[11px] text-slate-400">
                Configura lienzo, fondo inicial, paleta y espacio de trabajo listo para crear
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] overflow-hidden">
          {/* Left Column: Templates & Dimensions */}
          <div className="p-5 overflow-y-auto space-y-4 border-b lg:border-b-0 lg:border-r border-[#21273b]">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Nombre del Proyecto
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#171b2a] border border-[#2c354a] rounded-lg px-3 py-2 text-xs text-slate-100 font-semibold focus:border-emerald-400 focus:outline-none"
              />
            </div>

            {/* Category Tabs + Templates Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
                  Plantillas Visuales
                </span>
                <div className="flex flex-wrap gap-1">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-2 py-0.5 rounded text-[10px] border cursor-pointer ${
                        category === cat
                          ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                          : 'bg-[#171b2a] border-[#29324a] text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {visibleTemplates.map((tpl) => {
                  const isSel = selectedTemplateId === tpl.id && width === tpl.width && height === tpl.height;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                        isSel
                          ? 'bg-emerald-500/15 border-emerald-400 text-emerald-100'
                          : 'bg-[#171b2a] border-[#283148] text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-bold truncate">{tpl.name}</span>
                      </div>
                      <div className="text-[10px] font-mono text-amber-300 tabular-nums mt-0.5">
                        {tpl.width} × {tpl.height} px
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">{tpl.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Dimensions & Pixel Scale */}
            <div className="p-3 rounded-lg bg-[#161a28] border border-[#252d43] space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Resolución y Escala Base
              </div>
              <div className="grid grid-cols-3 gap-2.5 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Ancho base (px)</label>
                  <input
                    type="number"
                    min={8}
                    max={512}
                    value={width}
                    onChange={(e) => {
                      setSelectedTemplateId('custom');
                      setWidth(Math.max(8, Math.min(512, parseInt(e.target.value, 10) || 8)));
                    }}
                    className="w-full bg-[#10131e] border border-[#2c354a] rounded px-2.5 py-1.5 text-slate-100 font-mono tabular-nums focus:border-emerald-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Alto base (px)</label>
                  <input
                    type="number"
                    min={8}
                    max={512}
                    value={height}
                    onChange={(e) => {
                      setSelectedTemplateId('custom');
                      setHeight(Math.max(8, Math.min(512, parseInt(e.target.value, 10) || 8)));
                    }}
                    className="w-full bg-[#10131e] border border-[#2c354a] rounded px-2.5 py-1.5 text-slate-100 font-mono tabular-nums focus:border-emerald-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Escala de píxel</label>
                  <div className="grid grid-cols-4 gap-1">
                    {[1, 2, 3, 4].map((sc) => (
                      <button
                        key={sc}
                        type="button"
                        onClick={() => setPixelScale(sc)}
                        className={`py-1.5 rounded border font-mono text-[10px] font-bold cursor-pointer ${
                          pixelScale === sc
                            ? 'bg-amber-400 text-slate-950 border-amber-300'
                            : 'bg-[#10131e] border-[#2c354a] text-slate-300 hover:text-white'
                        }`}
                      >
                        {sc}×
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between pt-1 border-t border-[#22293d]">
                <span>Resolución final del lienzo:</span>
                <span className="text-emerald-300 font-bold tabular-nums">
                  {effWidth} × {effHeight} px
                </span>
              </div>
            </div>

            {/* Initial Palette */}
            <div className="p-3 rounded-lg bg-[#161a28] border border-[#252d43] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-sky-400" />
                  Paleta Inicial
                </span>
                <select
                  value={initialPaletteId}
                  onChange={(e) => setInitialPaletteId(e.target.value)}
                  className="bg-[#10131e] border border-[#2c354a] rounded px-2 py-1 text-xs text-slate-100 focus:outline-none"
                >
                  {FIGHTING_GAME_PALETTES.map((pal) => (
                    <option key={pal.id} value={pal.id}>
                      {pal.name} ({pal.colors.length} colores)
                    </option>
                  ))}
                </select>
              </div>
              {selectedPalette && (
                <div className="flex flex-wrap gap-1">
                  {selectedPalette.colors.slice(0, 18).map((hex, i) => (
                    <span
                      key={i}
                      className="w-4 h-3 rounded-[2px] border border-black/30"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Canvas Preview, Background, Quick Options & Recents */}
          <div className="p-5 overflow-y-auto space-y-4 bg-[#0f121d]">
            {/* Live Canvas Preview */}
            <div className="p-3 rounded-xl border border-[#252d43] bg-[#141826] flex flex-col items-center gap-2">
              <div className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span>Vista Previa Proporcional</span>
                <span className="font-mono text-amber-300 tabular-nums">
                  {effWidth}×{effHeight}
                </span>
              </div>
              <div className="w-full h-32 rounded-lg bg-[#090c14] border border-[#20273b] flex items-center justify-center overflow-hidden">
                <div
                  className={`relative border border-amber-400/70 shadow-lg ${
                    backgroundMode === 'transparent' ? 'canvas-checkerboard' : ''
                  }`}
                  style={{
                    width: Math.max(24, Math.round(prevW)),
                    height: Math.max(24, Math.round(prevH)),
                    backgroundColor: backgroundMode === 'solid' ? backgroundColor : undefined,
                  }}
                >
                  {enableGrid && (
                    <div
                      className="absolute inset-0 pointer-events-none opacity-30"
                      style={{
                        backgroundImage:
                          'linear-gradient(to right, rgba(255,255,255,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.25) 1px, transparent 1px)',
                        backgroundSize: '8px 8px',
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Background Mode */}
            <div className="p-3 rounded-xl border border-[#252d43] bg-[#141826] space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Fondo Inicial
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setBackgroundMode('transparent')}
                  className={`py-1.5 rounded-lg border font-semibold cursor-pointer ${
                    backgroundMode === 'transparent'
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                      : 'bg-[#10131e] border-[#283148] text-slate-400 hover:text-white'
                  }`}
                >
                  Transparente
                </button>
                <button
                  type="button"
                  onClick={() => setBackgroundMode('solid')}
                  className={`py-1.5 rounded-lg border font-semibold cursor-pointer ${
                    backgroundMode === 'solid'
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                      : 'bg-[#10131e] border-[#283148] text-slate-400 hover:text-white'
                  }`}
                >
                  Color sólido
                </button>
              </div>
              {backgroundMode === 'solid' && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5">
                    {['#0d101b', '#1e293b', '#ffffff', '#000000', '#1d4ed8'].map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setBackgroundColor(hex)}
                        className="w-5 h-5 rounded border border-slate-500 cursor-pointer"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-8 h-6 rounded cursor-pointer bg-transparent"
                  />
                </div>
              )}
            </div>

            {/* 5 Quick Start Options */}
            <div className="p-3 rounded-xl border border-[#252d43] bg-[#141826] space-y-1.5 text-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Opciones Rápidas de Inicio
              </div>
              {[
                { label: 'Activar cuadrícula de píxeles', val: enableGrid, set: setEnableGrid, icon: Grid },
                { label: 'Activar Pixel Perfect al dibujar', val: enablePixelPerfect, set: setEnablePixelPerfect, icon: Sparkles },
                { label: 'Crear capa inicial', val: createInitialLayer, set: setCreateInitialLayer, icon: Layers },
                { label: 'Crear grupo / carpeta inicial', val: createInitialGroup, set: setCreateInitialGroup, icon: Layout },
                { label: 'Activar modo animación (Timeline)', val: enableAnimationMode, set: setEnableAnimationMode, icon: Film },
              ].map((opt, idx) => {
                const Icon = opt.icon;
                return (
                  <label
                    key={idx}
                    className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-[#1a1f31] cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-slate-200">
                      <Icon className="w-3.5 h-3.5 text-amber-400" />
                      <span>{opt.label}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => opt.set(!opt.val)}
                      className="text-emerald-400"
                    >
                      {opt.val ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-500" />}
                    </button>
                  </label>
                );
              })}
            </div>

            {/* Recent Projects */}
            {recentProjects.length > 0 && (
              <div className="p-3 rounded-xl border border-[#252d43] bg-[#141826] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    Proyectos Recientes ({recentProjects.length})
                  </span>
                  {onClearRecentProjects && (
                    <button
                      type="button"
                      onClick={onClearRecentProjects}
                      className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Limpiar
                    </button>
                  )}
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {[...recentProjects]
                    .sort((a, b) => (Boolean(a.pinned) === Boolean(b.pinned) ? 0 : a.pinned ? -1 : 1))
                    .map((rp) => (
                      <button
                        key={rp.id}
                        type="button"
                        onClick={() => {
                          if (onOpenRecentProject) {
                            onOpenRecentProject(rp);
                            onClose();
                          } else {
                            setName(rp.name);
                            setWidth(rp.width);
                            setHeight(rp.height);
                            setPixelScale(1);
                            if (rp.backgroundMode) setBackgroundMode(rp.backgroundMode);
                            if (rp.backgroundColor) setBackgroundColor(rp.backgroundColor);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#10131e] hover:bg-[#1a2033] border border-[#242c42] flex items-center justify-between gap-2 text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {rp.thumbnailDataUrl && (
                            <img
                              src={rp.thumbnailDataUrl}
                              alt={rp.name}
                              className="w-7 h-7 rounded border border-[#2a334d] bg-[#0b0e17] object-contain pixel-canvas shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-slate-200 truncate">
                              {rp.pinned ? '★ ' : ''}
                              {rp.name}
                            </div>
                            <div className="text-[9px] text-slate-500 truncate font-mono">
                              {rp.path || rp.category} · {rp.openedAt}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-amber-300 tabular-nums shrink-0 ml-1">
                          {rp.width}×{rp.height}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar spans full width */}
          <div className="lg:col-span-2 px-5 py-3 border-t border-[#242b40] bg-[#0f121d] flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
              Lienzo: {effWidth}×{effHeight} · Fondo:{' '}
              {backgroundMode === 'transparent' ? 'Transparente' : backgroundColor}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow cursor-pointer"
              >
                Crear Proyecto
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
