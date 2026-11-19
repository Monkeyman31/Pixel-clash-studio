import React, { useState, useEffect } from 'react';
import { STUDIO_Z } from './StudioTopLayer';
import {
  Ruler,
  X,
  Plus,
  Lock,
  Unlock,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Magnet,
  Crosshair,
  LayoutGrid,
  User,
  Mountain,
  Monitor,
  Check,
} from 'lucide-react';
import {
  CanvasGuide,
  GuideOrientation,
  GuidePresetKind,
  GuidesConfig,
  RulerUnit,
} from '../types';
import {
  formatRulerCoordinate,
  parseUnitValueToPx,
  pxToUnitValue,
} from '../utils/guidesEngine';
import { StudioSlider } from './StudioSlider';

interface GuidesManagerModalProps {
  isOpen: boolean;
  initialTab?: 'exact' | 'presets' | 'list';
  onClose: () => void;
  canvasWidth: number;
  canvasHeight: number;
  guides: CanvasGuide[];
  guidesConfig: GuidesConfig;
  onChangeGuidesConfig: (next: GuidesConfig) => void;
  onAddGuide: (guide: CanvasGuide) => void;
  onUpdateGuide: (id: string, patch: Partial<CanvasGuide>) => void;
  onDuplicateGuide: (id: string) => void;
  onDeleteGuide: (id: string) => void;
  onApplyPreset: (kind: GuidePresetKind, replaceExisting: boolean) => void;
  onClearAllGuides: () => void;
}

const GUIDE_COLORS = ['#38bdf8', '#f59e0b', '#10b981', '#f43f5e', '#a855f7', '#e2e8f0'];

export const GuidesManagerModal: React.FC<GuidesManagerModalProps> = ({
  isOpen,
  initialTab = 'exact',
  onClose,
  canvasWidth,
  canvasHeight,
  guides,
  guidesConfig,
  onChangeGuidesConfig,
  onAddGuide,
  onUpdateGuide,
  onDuplicateGuide,
  onDeleteGuide,
  onApplyPreset,
  onClearAllGuides,
}) => {
  const [tab, setTab] = useState<'exact' | 'presets' | 'list'>(initialTab);
  const [orientation, setOrientation] = useState<GuideOrientation>('vertical');
  const [positionPx, setPositionPx] = useState<number>(Math.round(canvasWidth / 2));
  const [rawInput, setRawInput] = useState<string>('');
  const [label, setLabel] = useState<string>('');
  const [color, setColor] = useState<string>('#38bdf8');
  const [replaceOnPreset, setReplaceOnPreset] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      const axisLen = orientation === 'vertical' ? canvasWidth : canvasHeight;
      const defaultPos = Math.round(axisLen / 2);
      setPositionPx(defaultPos);
      setRawInput(
        String(pxToUnitValue(defaultPos, guidesConfig.unit, axisLen, guidesConfig.customScale))
      );
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    const axisLen = orientation === 'vertical' ? canvasWidth : canvasHeight;
    setRawInput(
      String(pxToUnitValue(positionPx, guidesConfig.unit, axisLen, guidesConfig.customScale))
    );
  }, [orientation, guidesConfig.unit, guidesConfig.customScale, positionPx, canvasWidth, canvasHeight]);

  if (!isOpen) return null;

  const axisLen = orientation === 'vertical' ? canvasWidth : canvasHeight;
  const unitSuffix =
    guidesConfig.unit === 'px'
      ? 'px'
      : guidesConfig.unit === 'percent'
      ? '%'
      : guidesConfig.customLabel || 'u';

  const handleAddExact = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number(rawInput.replace(',', '.'));
    const finalPx = Number.isFinite(numeric)
      ? parseUnitValueToPx(numeric, guidesConfig.unit, axisLen, guidesConfig.customScale)
      : positionPx;

    onAddGuide({
      id: `guide-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orientation,
      position: finalPx,
      label: label.trim() || undefined,
      color,
      locked: false,
    });
    if (!guidesConfig.showGuides) {
      onChangeGuidesConfig({ ...guidesConfig, showGuides: true });
    }
    setLabel('');
  };

  const presetCards: {
    kind: GuidePresetKind;
    title: string;
    desc: string;
    icon: React.FC<{ className?: string }>;
    accent: string;
  }[] = [
    {
      kind: 'horizon',
      title: 'Línea de horizonte',
      desc: 'Cielo lejano, horizonte principal y plano de suelo para fondos y escenarios.',
      icon: Mountain,
      accent: 'text-amber-400',
    },
    {
      kind: 'hud',
      title: 'Guías para HUD',
      desc: 'Márgenes seguros, zona de barras de vida, timer central y barra súper.',
      icon: Monitor,
      accent: 'text-rose-400',
    },
    {
      kind: 'character',
      title: 'Guías para personajes',
      desc: 'Eje central X, altura de cabeza, hombros, cadera y línea exacta de pies.',
      icon: User,
      accent: 'text-sky-400',
    },
    {
      kind: 'stage',
      title: 'Guías para escenarios',
      desc: 'Regla de tercios (spawns P1/P2), esquinas de cámara, horizonte y piso.',
      icon: LayoutGrid,
      accent: 'text-emerald-400',
    },
  ];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      style={{ zIndex: STUDIO_Z.MODAL }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[86vh]"
        style={{
          backgroundColor: 'var(--studio-bg-panel)',
          borderColor: 'var(--studio-border-strong)',
          color: 'var(--studio-text)',
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 border-b flex items-center justify-between gap-3"
          style={{
            backgroundColor: 'var(--studio-bg-header)',
            borderColor: 'var(--studio-border)',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Ruler className="w-4 h-4 shrink-0" style={{ color: 'var(--studio-accent)' }} />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold truncate">Sistema de Reglas y Guías</h2>
              <p className="text-[11px] truncate" style={{ color: 'var(--studio-text-muted)' }}>
                Lienzo {canvasWidth}×{canvasHeight} px · {guides.length} guía(s) activa(s)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Navigation */}
        <div
          className="px-4 pt-3 pb-2 border-b flex items-center gap-1"
          style={{ borderColor: 'var(--studio-border)' }}
        >
          {(
            [
              ['exact', 'Crear guía exacta'],
              ['presets', 'Guías de animación / lucha'],
              ['list', `Reglas, snap y lista (${guides.length})`],
            ] as const
          ).map(([id, text]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                tab === id
                  ? 'bg-amber-400 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              {text}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          {tab === 'exact' && (
            <form onSubmit={handleAddExact} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOrientation('vertical');
                    setPositionPx(Math.round(canvasWidth / 2));
                  }}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                    orientation === 'vertical'
                      ? 'border-amber-400 bg-amber-400/15 text-amber-200'
                      : 'border-white/10 hover:bg-white/5 text-slate-300'
                  }`}
                >
                  <span>Vertical (X)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOrientation('horizontal');
                    setPositionPx(Math.round(canvasHeight / 2));
                  }}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                    orientation === 'horizontal'
                      ? 'border-amber-400 bg-amber-400/15 text-amber-200'
                      : 'border-white/10 hover:bg-white/5 text-slate-300'
                  }`}
                >
                  <span>Horizontal (Y)</span>
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-medium text-slate-300">
                    Posición exacta ({orientation === 'vertical' ? 'X' : 'Y'})
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step={guidesConfig.unit === 'px' ? 1 : 0.5}
                      value={rawInput}
                      onChange={(e) => {
                        setRawInput(e.target.value);
                        const num = Number(e.target.value);
                        if (Number.isFinite(num)) {
                          setPositionPx(
                            parseUnitValueToPx(
                              num,
                              guidesConfig.unit,
                              axisLen,
                              guidesConfig.customScale
                            )
                          );
                        }
                      }}
                      className="w-24 px-2 py-1 rounded-md border bg-black/30 text-xs font-mono tabular-nums text-right focus:outline-none focus:border-amber-400"
                      style={{ borderColor: 'var(--studio-border-strong)' }}
                    />
                    <span className="text-xs font-mono text-slate-400 min-w-[28px]">
                      {unitSuffix}
                    </span>
                  </div>
                </div>

                <StudioSlider
                  label={orientation === 'vertical' ? 'Eje X en píxeles' : 'Eje Y en píxeles'}
                  value={Math.max(0, Math.min(axisLen, Math.round(positionPx)))}
                  min={0}
                  max={axisLen}
                  step={1}
                  unit=" px"
                  onChange={(v) => setPositionPx(v)}
                />

                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 mr-1">Rápidos:</span>
                  {[0, 0.25, 0.3333, 0.5, 0.6667, 0.75, 1].map((ratio) => {
                    const pxVal = Math.round(axisLen * ratio);
                    return (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => setPositionPx(pxVal)}
                        className="px-2 py-0.5 rounded border border-white/10 hover:border-amber-400/60 hover:bg-white/5 text-[11px] font-mono tabular-nums text-slate-300"
                      >
                        {Math.round(ratio * 100)}%
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Etiqueta opcional
                  </label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder={
                      orientation === 'vertical' ? 'Ej: Eje central' : 'Ej: Suelo / Horizonte'
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border bg-black/30 text-xs focus:outline-none focus:border-amber-400"
                    style={{ borderColor: 'var(--studio-border-strong)' }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Color de guía</label>
                  <div className="flex items-center gap-1.5 pt-1">
                    {GUIDE_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-6 h-6 rounded-md border flex items-center justify-center transition-transform ${
                          color === c ? 'border-white scale-110' : 'border-white/20 opacity-75 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c }}
                        title={c}
                      >
                        {color === c && <Check className="w-3.5 h-3.5 text-slate-950" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--studio-border)' }}>
                <span className="text-[11px] font-mono tabular-nums text-slate-400">
                  Equivale a {orientation === 'vertical' ? 'X' : 'Y'} ={' '}
                  {formatRulerCoordinate(
                    positionPx,
                    guidesConfig.unit,
                    axisLen,
                    guidesConfig.customScale,
                    guidesConfig.customLabel
                  )}{' '}
                  ({positionPx} px)
                </span>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear guía</span>
                </button>
              </div>
            </form>
          )}

          {tab === 'presets' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-300">
                <span>Selecciona un conjunto de composición adaptado a {canvasWidth}×{canvasHeight} px:</span>
                <label className="flex items-center gap-1.5 cursor-pointer shrink-0 text-[11px] text-slate-400">
                  <input
                    type="checkbox"
                    checked={replaceOnPreset}
                    onChange={(e) => setReplaceOnPreset(e.target.checked)}
                    className="accent-amber-400"
                  />
                  <span>Reemplazar guías actuales</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {presetCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={card.kind}
                      type="button"
                      onClick={() => onApplyPreset(card.kind, replaceOnPreset)}
                      className="p-3 rounded-lg border text-left hover:border-amber-400/70 hover:bg-white/5 transition-colors flex flex-col gap-1.5"
                      style={{ borderColor: 'var(--studio-border-strong)' }}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 shrink-0 ${card.accent}`} />
                        <span className="text-xs font-semibold text-slate-100">{card.title}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-400">{card.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'list' && (
            <div className="space-y-4">
              {/* Units & Snapping Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b" style={{ borderColor: 'var(--studio-border)' }}>
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5 text-amber-400" />
                    <span>Unidades de regla</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {(
                      [
                        ['px', 'Píxeles (px)'],
                        ['percent', 'Porcentaje (%)'],
                        ['custom', 'Personalizado'],
                      ] as [RulerUnit, string][]
                    ).map(([u, labelTxt]) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => onChangeGuidesConfig({ ...guidesConfig, unit: u })}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                          guidesConfig.unit === u
                            ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                            : 'border-white/10 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {labelTxt}
                      </button>
                    ))}
                  </div>
                  {guidesConfig.unit === 'custom' && (
                    <div className="flex items-center gap-2 pt-1">
                      <label className="text-[11px] text-slate-400">1 unidad =</label>
                      <input
                        type="number"
                        min={1}
                        max={256}
                        value={guidesConfig.customScale}
                        onChange={(e) =>
                          onChangeGuidesConfig({
                            ...guidesConfig,
                            customScale: Math.max(1, Number(e.target.value) || 16),
                          })
                        }
                        className="w-16 px-2 py-1 rounded border bg-black/30 text-xs font-mono tabular-nums"
                        style={{ borderColor: 'var(--studio-border-strong)' }}
                      />
                      <span className="text-[11px] text-slate-400">px · Etiqueta:</span>
                      <input
                        type="text"
                        value={guidesConfig.customLabel}
                        onChange={(e) =>
                          onChangeGuidesConfig({ ...guidesConfig, customLabel: e.target.value })
                        }
                        className="w-16 px-2 py-1 rounded border bg-black/30 text-xs"
                        style={{ borderColor: 'var(--studio-border-strong)' }}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Magnet className="w-3.5 h-3.5 text-sky-400" />
                    <span>Ajuste magnético (Snap)</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={guidesConfig.snapToGuides}
                        onChange={(e) =>
                          onChangeGuidesConfig({ ...guidesConfig, snapToGuides: e.target.checked })
                        }
                        className="accent-amber-400"
                      />
                      <span>Ajustar a guías</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={guidesConfig.snapToRulers}
                        onChange={(e) =>
                          onChangeGuidesConfig({ ...guidesConfig, snapToRulers: e.target.checked })
                        }
                        className="accent-amber-400"
                      />
                      <span>Ajustar a reglas</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={guidesConfig.snapToGrid}
                        onChange={(e) =>
                          onChangeGuidesConfig({ ...guidesConfig, snapToGrid: e.target.checked })
                        }
                        className="accent-amber-400"
                      />
                      <span>Ajustar a cuadrícula ({guidesConfig.gridStep} px)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Visibility / Lock Quick Row */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onChangeGuidesConfig({
                        ...guidesConfig,
                        showRulers: !guidesConfig.showRulers,
                      })
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-xs flex items-center gap-1.5"
                  >
                    <Ruler className="w-3.5 h-3.5 text-amber-400" />
                    <span>{guidesConfig.showRulers ? 'Ocultar reglas' : 'Mostrar reglas'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeGuidesConfig({
                        ...guidesConfig,
                        showGuides: !guidesConfig.showGuides,
                      })
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-xs flex items-center gap-1.5"
                  >
                    {guidesConfig.showGuides ? (
                      <Eye className="w-3.5 h-3.5 text-sky-400" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>{guidesConfig.showGuides ? 'Guías visibles' : 'Guías ocultas'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeGuidesConfig({
                        ...guidesConfig,
                        lockGuides: !guidesConfig.lockGuides,
                      })
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-xs flex items-center gap-1.5"
                  >
                    {guidesConfig.lockGuides ? (
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>{guidesConfig.lockGuides ? 'Todas bloqueadas' : 'Bloquear todas'}</span>
                  </button>
                </div>

                {guides.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearAllGuides}
                    className="px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar todas</span>
                  </button>
                )}
              </div>

              {/* Active Guides List */}
              {guides.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 border border-dashed rounded-lg border-white/10">
                  No hay guías activas. Arrastra desde una regla en el lienzo o crea una en la pestaña «Crear guía exacta».
                </div>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {guides.map((g) => {
                    const len = g.orientation === 'vertical' ? canvasWidth : canvasHeight;
                    return (
                      <div
                        key={g.id}
                        className="px-3 py-2 rounded-lg border flex items-center justify-between gap-2 text-xs"
                        style={{
                          borderColor: 'var(--studio-border)',
                          backgroundColor: 'rgba(0,0,0,0.2)',
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-xs shrink-0"
                            style={{ backgroundColor: g.color || '#38bdf8' }}
                          />
                          <span className="font-mono text-[11px] text-slate-400 shrink-0">
                            {g.orientation === 'vertical' ? 'X' : 'Y'}
                          </span>
                          <input
                            type="number"
                            step={1}
                            value={g.position}
                            disabled={Boolean(g.locked || guidesConfig.lockGuides)}
                            onChange={(e) =>
                              onUpdateGuide(g.id, { position: Number(e.target.value) || 0 })
                            }
                            className="w-16 px-1.5 py-0.5 rounded border bg-black/30 font-mono tabular-nums text-xs disabled:opacity-50"
                            style={{ borderColor: 'var(--studio-border-strong)' }}
                          />
                          <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                            ({formatRulerCoordinate(
                              g.position,
                              guidesConfig.unit,
                              len,
                              guidesConfig.customScale,
                              guidesConfig.customLabel
                            )})
                          </span>
                          {g.label && (
                            <span className="text-slate-300 truncate">{g.label}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onUpdateGuide(g.id, { locked: !g.locked })}
                            className="p-1 rounded hover:bg-white/10 text-slate-300"
                            title={g.locked ? 'Desbloquear guía' : 'Bloquear guía'}
                          >
                            {g.locked ? (
                              <Lock className="w-3.5 h-3.5 text-amber-400" />
                            ) : (
                              <Unlock className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDuplicateGuide(g.id)}
                            className="p-1 rounded hover:bg-white/10 text-slate-300"
                            title="Duplicar guía"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteGuide(g.id)}
                            className="p-1 rounded hover:bg-rose-500/20 text-rose-400"
                            title="Eliminar guía"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-2.5 border-t flex items-center justify-between text-[11px]"
          style={{
            borderColor: 'var(--studio-border)',
            backgroundColor: 'var(--studio-bg-header)',
            color: 'var(--studio-text-muted)',
          }}
        >
          <span className="flex items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5 text-amber-400" />
            <span>Arrastra desde la regla para crear · Alt+Arrastrar duplica · Suprimir elimina</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-md border border-white/10 hover:bg-white/10 text-slate-200 font-medium"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
