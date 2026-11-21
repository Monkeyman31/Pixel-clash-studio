import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckSquare,
  Clock,
  Cpu,
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
import {
  FightingGameProfileId,
  NewProjectConfig,
  ProjectWorkMode,
  RecentProjectEntry,
} from '../types';
import { estimateCanvasResources } from '../utils/canvasMemoryEstimator';
import {
  FIGHTING_GAME_PROFILE_ORDER,
  FIGHTING_GAME_PROFILES,
  MODE_SIZE_PRESETS,
} from '../utils/fightingGameProfiles';

export type NewProjectTemplateCategory =
  | 'Todas'
  | 'Personaje'
  | 'Stage'
  | 'HUD'
  | 'FX'
  | 'Portrait'
  | 'Cutscene'
  | 'Tileset'
  | 'Personalizado';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: NewProjectTemplateCategory | string;
  initialFightingProfileId?: FightingGameProfileId;
  onCreateProject?: (name: string, width: number, height: number) => void;
  onCreateProjectConfig?: (config: NewProjectConfig) => void;
  recentProjects?: RecentProjectEntry[];
  onOpenRecentProject?: (entry: RecentProjectEntry) => void;
  onClearRecentProjects?: () => void;
}

interface ProjectTemplateItem {
  id: string;
  category: Exclude<NewProjectTemplateCategory, 'Todas'>;
  workMode: ProjectWorkMode;
  name: string;
  width: number;
  height: number;
  pixelScale: number;
  desc: string;
  animationMode: boolean;
  grid: boolean;
  pixelPerfect: boolean;
}

const PROJECT_TEMPLATES: ProjectTemplateItem[] = MODE_SIZE_PRESETS.map((p) => ({
  id: p.id,
  category: p.categoryLabel as Exclude<NewProjectTemplateCategory, 'Todas'>,
  workMode: p.mode,
  name: p.name,
  width: p.width,
  height: p.height,
  pixelScale: 1,
  desc: p.desc,
  animationMode: p.animationMode,
  grid: p.grid,
  pixelPerfect: p.pixelPerfect,
}));

const CATEGORIES: NewProjectTemplateCategory[] = [
  'Todas',
  'Personaje',
  'Stage',
  'HUD',
  'FX',
  'Portrait',
  'Cutscene',
  'Tileset',
  'Personalizado',
];

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  initialCategory,
  initialFightingProfileId = 'custom',
  onCreateProject,
  onCreateProjectConfig,
  recentProjects = [],
  onOpenRecentProject,
  onClearRecentProjects,
}) => {
  const [name, setName] = useState<string>('Nuevo Proyecto');
  const [category, setCategory] = useState<NewProjectTemplateCategory>('Todas');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('fighter-64');
  const [fightingProfileId, setFightingProfileId] = useState<FightingGameProfileId>(initialFightingProfileId);
  const [width, setWidth] = useState<number>(64);
  const [height, setHeight] = useState<number>(64);
  const [pixelScale, setPixelScale] = useState<number>(1);
  const [dpi, setDpi] = useState<number>(72);
  const [backgroundMode, setBackgroundMode] = useState<'transparent' | 'solid'>('transparent');
  const [backgroundColor, setBackgroundColor] = useState<string>('#111524');
  const [initialPaletteId, setInitialPaletteId] = useState<string>(FIGHTING_GAME_PALETTES[0]?.id || 'capcom-cps2');
  const [enableGrid, setEnableGrid] = useState<boolean>(true);
  const [enablePixelPerfect, setEnablePixelPerfect] = useState<boolean>(true);
  const [createInitialLayer, setCreateInitialLayer] = useState<boolean>(true);
  const [createInitialGroup, setCreateInitialGroup] = useState<boolean>(false);
  const [enableAnimationMode, setEnableAnimationMode] = useState<boolean>(true);

  const selectedFightingProfile = FIGHTING_GAME_PROFILES[fightingProfileId] || FIGHTING_GAME_PROFILES.custom;

  const applyProfileToCategory = (pid: FightingGameProfileId, cat: NewProjectTemplateCategory) => {
    setFightingProfileId(pid);
    if (pid === 'custom') return;
    const spec = FIGHTING_GAME_PROFILES[pid];
    setInitialPaletteId(spec.paletteId);
    setEnablePixelPerfect(spec.fighterLayout.pixelPerfect);
    if (cat === 'Personaje') {
      setWidth(spec.resolutions.fighter.w);
      setHeight(spec.resolutions.fighter.h);
    } else if (cat === 'Stage') {
      setWidth(spec.resolutions.stage.w);
      setHeight(spec.resolutions.stage.h);
    } else if (cat === 'HUD') {
      setWidth(spec.resolutions.hud.w);
      setHeight(spec.resolutions.hud.h);
    } else if (cat === 'FX') {
      setWidth(spec.resolutions.fx.w);
      setHeight(spec.resolutions.fx.h);
    } else if (cat === 'Portrait') {
      setWidth(spec.resolutions.portrait.w);
      setHeight(spec.resolutions.portrait.h);
    } else if (cat === 'Cutscene') {
      setWidth(spec.resolutions.cutscene.w);
      setHeight(spec.resolutions.cutscene.h);
    }
  };

  // Sync category & first template when launched from Home Screen quick templates
  useEffect(() => {
    if (!isOpen) return;
    setFightingProfileId(initialFightingProfileId);
    if (initialCategory && CATEGORIES.includes(initialCategory as NewProjectTemplateCategory)) {
      const targetCat = initialCategory as NewProjectTemplateCategory;
      setCategory(targetCat);
      if (targetCat !== 'Todas') {
        const match = PROJECT_TEMPLATES.find((t) => t.category === targetCat);
        if (match) {
          setSelectedTemplateId(match.id);
          setWidth(match.width);
          setHeight(match.height);
          setPixelScale(match.pixelScale);
          setEnableAnimationMode(match.animationMode);
          setEnableGrid(match.grid);
          setEnablePixelPerfect(match.pixelPerfect);
          setName(`Nuevo ${targetCat}`);
        }
        if (initialFightingProfileId && initialFightingProfileId !== 'custom') {
          applyProfileToCategory(initialFightingProfileId, targetCat);
        }
      }
    }
  }, [isOpen, initialCategory, initialFightingProfileId]);

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

  // ZERO artificial upper caps! Any positive resolution allowed (e.g. 100×100, 10000×10000, 32000×32000+)
  const effWidth = Math.max(1, Math.round(width * pixelScale));
  const effHeight = Math.max(1, Math.round(height * pixelScale));

  const resourceEstimate = useMemo(
    () =>
      estimateCanvasResources({
        width: effWidth,
        height: effHeight,
        layersCount: 1,
        framesCount: 1,
        isSparseBlank: true,
      }),
    [effWidth, effHeight]
  );

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
      const inferredMode: ProjectWorkMode =
        tpl?.workMode ||
        (category === 'Personaje'
          ? 'fighter'
          : category === 'Stage'
          ? 'stage'
          : category === 'HUD'
          ? 'hud_ui'
          : category === 'FX'
          ? 'fx'
          : category === 'Portrait'
          ? 'portrait'
          : category === 'Cutscene'
          ? 'cutscene'
          : category === 'Tileset'
          ? 'tileset'
          : 'custom');
      onCreateProjectConfig({
        name: safeName,
        width: effWidth,
        height: effHeight,
        pixelScale,
        dpi: Math.max(1, Math.round(dpi || 72)),
        category: tpl?.category || (category === 'Todas' ? 'Personalizado' : category),
        templateId: selectedTemplateId,
        backgroundMode,
        backgroundColor,
        initialPaletteId,
        enableGrid,
        enablePixelPerfect,
        createInitialLayer,
        createInitialGroup,
        enableAnimationMode,
        workMode: inferredMode,
        fightingProfileId,
      });
    } else if (onCreateProject) {
      onCreateProject(safeName, effWidth, effHeight);
    }
    onClose();
  };

  // Live aspect box dimensions inside preview area
  const aspectRatio = effWidth / Math.max(1, effHeight);
  const maxPreviewW = 148;
  const maxPreviewH = 100;
  let prevW = maxPreviewW;
  let prevH = prevW / aspectRatio;
  if (prevH > maxPreviewH) {
    prevH = maxPreviewH;
    prevW = prevH * aspectRatio;
  }

  return (
    <div
      className="fixed inset-0 z-[170] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
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
                Sin límites artificiales de resolución · Motor Tiled 256×256 automático para alta resolución
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] overflow-hidden">
          {/* Left Column: Templates & Unlimited Dimensions */}
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

            {/* Optional Fighting Game Profile Selector */}
            <div className="p-2.5 rounded-lg bg-[#161a28] border border-[#252d43] space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300">
                  Perfil Juego de Pelea (Opcional)
                </span>
                <select
                  value={fightingProfileId}
                  onChange={(e) => applyProfileToCategory(e.target.value as FightingGameProfileId, category)}
                  className="bg-[#10131e] border border-[#2c354a] rounded px-2 py-1 text-xs text-slate-100 focus:outline-none"
                >
                  {FIGHTING_GAME_PROFILE_ORDER.map((pid) => (
                    <option key={pid} value={pid}>
                      {FIGHTING_GAME_PROFILES[pid].name}
                    </option>
                  ))}
                </select>
              </div>
              {fightingProfileId !== 'custom' && (
                <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono">
                  <span>Fighter: <strong className="text-amber-300">{selectedFightingProfile.resolutions.fighter.label}</strong></span>
                  <span>Stage: <strong className="text-emerald-300">{selectedFightingProfile.resolutions.stage.label}</strong></span>
                  <span>FX: <strong className="text-orange-300">{selectedFightingProfile.fxStyle}</strong></span>
                  <span>{selectedFightingProfile.fighterLayout.recommendedFps} FPS</span>
                </div>
              )}
            </div>

            {/* Category Tabs + Templates Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
                  Plantillas de Estudio
                </span>
                <div className="flex flex-wrap gap-1">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-2 py-0.5 rounded text-[10px] border cursor-pointer transition-colors ${
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

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-0.5">
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

            {/* Custom Unlimited Dimensions, DPI & Pixel Scale */}
            <div className="p-3 rounded-lg bg-[#161a28] border border-[#252d43] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Resolución Libre, DPI y Escala
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Ej.: 100×100, 1024×1024, 10000×10000+
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Ancho (px)</label>
                  <input
                    type="number"
                    min={1}
                    value={width}
                    onChange={(e) => {
                      setSelectedTemplateId('custom');
                      setWidth(Math.max(1, parseInt(e.target.value, 10) || 1));
                    }}
                    className="w-full bg-[#10131e] border border-[#2c354a] rounded px-2.5 py-1.5 text-slate-100 font-mono tabular-nums focus:border-emerald-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Alto (px)</label>
                  <input
                    type="number"
                    min={1}
                    value={height}
                    onChange={(e) => {
                      setSelectedTemplateId('custom');
                      setHeight(Math.max(1, parseInt(e.target.value, 10) || 1));
                    }}
                    className="w-full bg-[#10131e] border border-[#2c354a] rounded px-2.5 py-1.5 text-slate-100 font-mono tabular-nums focus:border-emerald-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">DPI</label>
                  <input
                    type="number"
                    min={1}
                    max={2400}
                    value={dpi}
                    onChange={(e) => setDpi(Math.max(1, parseInt(e.target.value, 10) || 72))}
                    className="w-full bg-[#10131e] border border-[#2c354a] rounded px-2.5 py-1.5 text-slate-100 font-mono tabular-nums focus:border-emerald-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Escala</label>
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
                <span>Resolución final del lienzo ({dpi} DPI):</span>
                <span className="text-emerald-300 font-bold tabular-nums">
                  {effWidth.toLocaleString()} × {effHeight.toLocaleString()} px
                </span>
              </div>
            </div>

            {/* Hardware-Aware Memory, VRAM & Project Size Estimator (Non-blocking) */}
            <div className="p-3 rounded-lg bg-[#111522] border border-[#252d43] space-y-2 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-sky-400" />
                  Estimador de Recursos del Sistema
                </span>
                <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                  Estado: <strong className="text-slate-200">{resourceEstimate.severityLabel}</strong>
                  {resourceEstimate.usesTiledEngine ? ' · Motor Tiled 256×256' : ''}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono tabular-nums text-[10px]">
                <div className="p-2 rounded bg-[#161a28] border border-[#232b40]">
                  <div className="text-slate-400">RAM estimada</div>
                  <div className="text-slate-100 font-bold mt-0.5">{resourceEstimate.ramFormatted}</div>
                </div>
                <div className="p-2 rounded bg-[#161a28] border border-[#232b40]">
                  <div className="text-slate-400">VRAM estimada</div>
                  <div className="text-slate-100 font-bold mt-0.5">{resourceEstimate.vramFormatted}</div>
                </div>
                <div className="p-2 rounded bg-[#161a28] border border-[#232b40]">
                  <div className="text-slate-400">Tamaño proyecto</div>
                  <div className="text-slate-100 font-bold mt-0.5">{resourceEstimate.projectFormatted}</div>
                </div>
              </div>

              {resourceEstimate.warningMessage && (
                <div className="p-2 rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-200 flex items-start gap-2 text-[10px] leading-snug">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{resourceEstimate.warningMessage}</span>
                </div>
              )}

              {resourceEstimate.recommendationNote && (
                <p className="text-[10px] text-slate-400 leading-snug">
                  {resourceEstimate.recommendationNote}
                </p>
              )}
            </div>

            {/* Initial Palette */}
            <div className="p-3 rounded-lg bg-[#161a28] border border-[#252d43] space-y-2">
              <div className="flex items-center justify-between gap-2">
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
              <div className="w-full h-28 rounded-lg bg-[#090c14] border border-[#20273b] flex items-center justify-center overflow-hidden">
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
                      className="text-emerald-400 cursor-pointer"
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
                    .map((rp) => {
                      const displayPath = rp.diskPath || rp.path || rp.category;
                      const displayDate = rp.modifiedAt || rp.openedAt;
                      return (
                        <button
                          key={rp.id}
                          type="button"
                          onClick={() => {
                            if (onOpenRecentProject) {
                              onOpenRecentProject(rp);
                            } else {
                              setName(rp.name);
                              setWidth(rp.width);
                              setHeight(rp.height);
                              setPixelScale(1);
                              if (rp.backgroundMode) setBackgroundMode(rp.backgroundMode);
                              if (rp.backgroundColor) setBackgroundColor(rp.backgroundColor);
                            }
                          }}
                          title={`${rp.name}\nRuta: ${displayPath}\nModificado: ${displayDate}`}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#10131e] hover:bg-[#1a2033] border border-[#242c42] flex items-center justify-between gap-2 text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded border border-[#2a334d] canvas-checkerboard flex items-center justify-center overflow-hidden shrink-0">
                              {rp.thumbnailDataUrl ? (
                                <img
                                  src={rp.thumbnailDataUrl}
                                  alt={rp.name}
                                  className="w-full h-full object-contain pixel-canvas"
                                />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-slate-500" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[11px] font-semibold text-slate-200 truncate">
                                {rp.pinned ? '★ ' : ''}
                                {rp.name}
                              </div>
                              <div className="text-[9px] text-slate-400 truncate font-mono">
                                {displayPath}
                              </div>
                              <div className="text-[9px] text-slate-500 truncate font-mono tabular-nums">
                                Mod: {displayDate}
                                {rp.frameCount && rp.frameCount > 1 ? ` · ${rp.frameCount} fr` : ''}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-amber-300 tabular-nums shrink-0 ml-1">
                            {rp.width}×{rp.height}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar spans full width */}
          <div className="lg:col-span-2 px-5 py-3 border-t border-[#242b40] bg-[#0f121d] flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
              Lienzo: {effWidth}×{effHeight} px · {dpi} DPI · Fondo:{' '}
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

