import React from 'react';
import {
  Activity,
  Flame,
  Layers,
  Loader2,
  Paintbrush,
  RotateCcw,
  Shapes,
  Sparkles,
  Wand2,
  Waves,
  Wind,
} from 'lucide-react';
import {
  FxAuraConfig,
  FxBaseGuideConfig,
  FxDeformerConfig,
  FxDetailLevel,
  FxEffectType,
  FxGeneratorConfig,
  FxMorphologyConfig,
  FxVisualStyle,
} from '../types';
import { FX_DETAIL_LEVELS, FX_EFFECT_TYPES, FX_VISUAL_STYLES } from '../utils/fxGeneratorEngine';
import {
  AURA_TYPE_META,
  DEFAULT_FX_DEFORMERS,
  DEFAULT_FX_MORPHOLOGY,
  ENERGY_LESS_POWER_AURA,
  FX_BASE_TYPES,
} from '../utils/fxWorkshopEngine';
import { StudioSlider } from './StudioSlider';

// =========================================================
// 1. FX BASE GUIDE PANEL (12 BASES + DRAW / IA / PARTICLES)
// =========================================================
interface FxBaseGuidePanelProps {
  baseGuide: FxBaseGuideConfig;
  onChange: (next: FxBaseGuideConfig) => void;
  onDrawOverBase: () => void;
  onBakeBaseToFrame: () => void;
  onAddParticlesOverBase: () => void;
  onSendBaseToAi: () => void;
}

export const FxBaseGuidePanel: React.FC<FxBaseGuidePanelProps> = ({
  baseGuide,
  onChange,
  onDrawOverBase,
  onBakeBaseToFrame,
  onAddParticlesOverBase,
  onSendBaseToAi,
}) => {
  const update = <K extends keyof FxBaseGuideConfig>(key: K, val: FxBaseGuideConfig[K]) => {
    onChange({ ...baseGuide, [key]: val });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="p-3 rounded-xl border border-sky-500/35 bg-[#121828] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Shapes className="w-4 h-4 text-sky-300 shrink-0" />
          <div>
            <h3 className="text-xs font-bold text-slate-100">Sistema de Bases (FX Base)</h3>
            <p className="text-[10px] text-slate-400">
              Genera siluetas guía para dibujar encima, aplicar IA, agregar partículas, deformadores o animación.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => update('enabled', !baseGuide.enabled)}
            className={`px-2.5 py-1 rounded-md border text-[11px] font-bold cursor-pointer ${
              baseGuide.enabled
                ? 'bg-sky-500/25 border-sky-400 text-sky-100'
                : 'bg-[#1a2135] border-[#2e3a59] text-slate-400'
            }`}
          >
            Guía Base: {baseGuide.enabled ? 'ACTIVA' : 'DESACTIVADA'}
          </button>
          <input
            type="color"
            value={baseGuide.guideColor}
            onChange={(e) => update('guideColor', e.target.value)}
            title="Color de la guía base"
            className="w-7 h-7 rounded border border-[#2f3b5b] bg-transparent cursor-pointer"
          />
        </div>
      </div>

      {/* 12 Base Types Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {FX_BASE_TYPES.map((bt) => {
          const active = baseGuide.type === bt.id && baseGuide.enabled;
          return (
            <button
              key={bt.id}
              type="button"
              onClick={() => onChange({ ...baseGuide, enabled: true, type: bt.id })}
              className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                active
                  ? 'border-sky-400 bg-sky-500/15 text-sky-100'
                  : 'border-[#252f49] bg-[#131827] hover:border-[#394870] text-slate-300'
              }`}
            >
              <div className="text-[11px] font-bold truncate">{bt.label}</div>
              <div className="text-[9px] text-slate-400 mt-0.5 line-clamp-2">{bt.desc}</div>
            </button>
          );
        })}
      </div>

      {/* Base Geometry Controls */}
      <div className="p-3 rounded-xl border border-[#242e47] bg-[#121726] grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StudioSlider
          label="Escala Base"
          value={baseGuide.scale}
          min={25}
          max={180}
          variant="compact"
            unit="%"
          onChange={(v) => update('scale', v)}
        />
        <StudioSlider
          label="Grosor Contorno"
          value={baseGuide.thickness}
          min={1}
          max={6}
          variant="compact"
            unit="px"
          onChange={(v) => update('thickness', v)}
        />
        <StudioSlider
          label="Rotación"
          value={baseGuide.rotationDeg}
          min={0}
          max={360}
          variant="compact"
            unit="°"
          onChange={(v) => update('rotationDeg', v)}
        />
        <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={baseGuide.showAsOverlay}
            onChange={(e) => update('showAsOverlay', e.target.checked)}
          />
          <span>Mostrar como contorno guía hueco</span>
        </label>
        <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer sm:col-span-2">
          <input
            type="checkbox"
            checked={baseGuide.includeInExport}
            onChange={(e) => update('includeInExport', e.target.checked)}
          />
          <span>Incluir la Base como capa al insertar en el lienzo</span>
        </label>
      </div>

      {/* Action workflow buttons */}
      <div className="p-3 rounded-xl border border-[#26324f] bg-[#101524] flex flex-col gap-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
          Construir a partir de esta Base
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={onDrawOverBase}
            className="px-2.5 py-2 rounded-lg border border-cyan-500/40 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-100 text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span>Dibujar Encima</span>
          </button>
          <button
            type="button"
            onClick={onBakeBaseToFrame}
            className="px-2.5 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-100 text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Hornear Base a Frame</span>
          </button>
          <button
            type="button"
            onClick={onAddParticlesOverBase}
            className="px-2.5 py-2 rounded-lg border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 text-amber-100 text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Agregar Módulos/Partículas</span>
          </button>
          <button
            type="button"
            onClick={onSendBaseToAi}
            className="px-2.5 py-2 rounded-lg border border-purple-500/40 bg-purple-500/15 hover:bg-purple-500/25 text-purple-100 text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Usar Guía con IA</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// =========================================================
// 2. SPECIALIZED AURA EDITOR PANEL (SUPPORTS ENERGY-LESS AURAS!)
// =========================================================
interface FxAuraEditorPanelProps {
  auraConfig: FxAuraConfig;
  onChange: (next: FxAuraConfig) => void;
}

const AURA_COMPONENT_META: {
  key: keyof FxAuraConfig['components'];
  label: string;
  desc: string;
}[] = [
  { key: 'wind', label: 'Viento / Corrientes de Aire', desc: 'Ráfagas ascendentes envolventes' },
  { key: 'rocks', label: 'Rocas Suspendidas', desc: 'Piedras levitando por presión de poder' },
  { key: 'sparks', label: 'Chispas', desc: 'Descargas rápidas y destellos' },
  { key: 'smoke', label: 'Humo / Polvo', desc: 'Nube ascendente o niebla densa' },
  { key: 'particles', label: 'Partículas', desc: 'Motas, brasas o energía flotante' },
  { key: 'fragments', label: 'Fragmentos', desc: 'Esquirlas desintegrándose al subir' },
  { key: 'waves', label: 'Ondas de Presión', desc: 'Anillos concéntricos en el suelo' },
  { key: 'ambientDistortion', label: 'Distorsión Ambiental', desc: 'Ondas de calor y vibración del aire' },
];

export const FxAuraEditorPanel: React.FC<FxAuraEditorPanelProps> = ({ auraConfig, onChange }) => {
  const update = <K extends keyof FxAuraConfig>(key: K, val: FxAuraConfig[K]) => {
    onChange({ ...auraConfig, [key]: val });
  };

  const updateComp = (
    key: keyof FxAuraConfig['components'],
    patch: Partial<FxAuraConfig['components'][keyof FxAuraConfig['components']]>
  ) => {
    onChange({
      ...auraConfig,
      components: {
        ...auraConfig.components,
        [key]: { ...auraConfig.components[key], ...patch },
      },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header + 1-Click Energy-Less Power Aura Preset */}
      <div className="p-3 rounded-xl border border-amber-500/35 bg-[#141827] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-300 shrink-0" />
          <div>
            <h3 className="text-xs font-bold text-slate-100">Editor Especializado de Auras</h3>
            <p className="text-[10px] text-slate-400">
              Crea auras de Ki, Chakra, Espiritual, Elemental o auras sin energía visible (solo aire, polvo, rocas y fragmentos).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onChange({ ...ENERGY_LESS_POWER_AURA, seed: Date.now() % 10000 })}
          className="px-2.5 py-1.5 rounded-lg border border-cyan-400/50 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-100 text-[10px] font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <Wind className="w-3.5 h-3.5" />
          <span>Preset: Aura Sin Energía Visible (Aire + Polvo + Rocas + Fragmentos)</span>
        </button>
      </div>

      {/* Aura Types */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
        {AURA_TYPE_META.map((at) => {
          const active = auraConfig.auraType === at.id;
          return (
            <button
              key={at.id}
              type="button"
              onClick={() =>
                onChange({
                  ...auraConfig,
                  auraType: at.id,
                  coreStyle: at.coreStyle,
                  colorCore: at.colors[0],
                  colorMid: at.colors[1],
                  colorEdge: at.colors[2],
                })
              }
              className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                active
                  ? 'border-amber-400 bg-amber-500/15 text-amber-100'
                  : 'border-[#252f49] bg-[#131827] hover:border-[#394870] text-slate-300'
              }`}
            >
              <div className="text-[11px] font-bold truncate">{at.label}</div>
              <div className="text-[9px] text-slate-400 mt-0.5 line-clamp-2">{at.desc}</div>
            </button>
          );
        })}
      </div>

      {/* Core Energy Toggle + Shape & Colors */}
      <div className="p-3 rounded-xl border border-[#252f49] bg-[#111625] flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={auraConfig.showCoreEnergy}
              onChange={(e) => update('showCoreEnergy', e.target.checked)}
              className="accent-amber-400"
            />
            <span className="text-xs font-bold text-slate-100">
              Mostrar Energía Principal Visible
            </span>
            <span className="text-[10px] text-slate-400">
              (desactívalo para crear presión pura sin energía visible)
            </span>
          </label>

          {auraConfig.showCoreEnergy && (
            <div className="flex items-center gap-1.5">
              {(
                [
                  ['flames', 'Flamas'],
                  ['spiral', 'Espiral'],
                  ['pillar', 'Pilar'],
                  ['mist', 'Niebla'],
                  ['rays', 'Rayos'],
                ] as [FxAuraConfig['coreStyle'], string][]
              ).map(([st, lbl]) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => update('coreStyle', st)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border cursor-pointer ${
                    auraConfig.coreStyle === st
                      ? 'bg-amber-500/25 border-amber-400 text-amber-100'
                      : 'bg-[#181f33] border-[#2b3754] text-slate-400'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Independent Aura Width / Height / Turbulence */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StudioSlider
            label="Anchura Superior"
            value={auraConfig.topWidth}
            min={20}
            max={200}
            variant="compact"
            unit="%"
            onChange={(v) => update('topWidth', v)}
          />
          <StudioSlider
            label="Anchura Central"
            value={auraConfig.midWidth}
            min={20}
            max={200}
            variant="compact"
            unit="%"
            onChange={(v) => update('midWidth', v)}
          />
          <StudioSlider
            label="Anchura Inferior"
            value={auraConfig.bottomWidth}
            min={20}
            max={200}
            variant="compact"
            unit="%"
            onChange={(v) => update('bottomWidth', v)}
          />
          <StudioSlider
            label="Altura del Aura"
            value={auraConfig.height}
            min={40}
            max={180}
            variant="compact"
            unit="%"
            onChange={(v) => update('height', v)}
          />
          <StudioSlider
            label="Turbulencia"
            value={auraConfig.turbulence}
            min={0}
            max={100}
            variant="compact"
            unit="%"
            onChange={(v) => update('turbulence', v)}
          />
          <StudioSlider
            label="Velocidad Visual"
            value={auraConfig.speed}
            min={20}
            max={200}
            variant="compact"
            unit="%"
            onChange={(v) => update('speed', v)}
          />
        </div>

        {auraConfig.showCoreEnergy && (
          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-[#1e263d]">
            <span className="text-[10px] font-mono uppercase text-slate-400">Colores del Aura:</span>
            {(
              [
                ['colorCore', 'Núcleo'],
                ['colorMid', 'Cuerpo'],
                ['colorEdge', 'Borde'],
              ] as const
            ).map(([field, lbl]) => (
              <label key={field} className="flex items-center gap-1.5 text-[10px] text-slate-300">
                <input
                  type="color"
                  value={auraConfig[field]}
                  onChange={(e) => update(field, e.target.value)}
                  className="w-6 h-6 rounded border border-[#2c3857] bg-transparent cursor-pointer"
                />
                <span>{lbl}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* 8 Individual Toggleable Aura Components */}
      <div className="p-3 rounded-xl border border-[#252f49] bg-[#111625] flex flex-col gap-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-semibold">
          Componentes de Aura (Activables Individualmente)
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {AURA_COMPONENT_META.map((meta) => {
            const comp = auraConfig.components[meta.key];
            return (
              <div
                key={meta.key}
                className={`p-2.5 rounded-lg border flex flex-col gap-1.5 transition-colors ${
                  comp.enabled
                    ? 'border-cyan-500/45 bg-[#161f34]'
                    : 'border-[#232c44] bg-[#0f1320] opacity-75'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 cursor-pointer min-w-0">
                    <input
                      type="checkbox"
                      checked={comp.enabled}
                      onChange={(e) => updateComp(meta.key, { enabled: e.target.checked })}
                      className="accent-cyan-400"
                    />
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-slate-100 truncate">{meta.label}</div>
                      <div className="text-[9px] text-slate-400 truncate">{meta.desc}</div>
                    </div>
                  </label>
                  <input
                    type="color"
                    value={comp.color}
                    onChange={(e) => updateComp(meta.key, { color: e.target.value })}
                    className="w-6 h-6 rounded border border-[#2f3c5c] bg-transparent cursor-pointer shrink-0"
                  />
                </div>
                {comp.enabled && (
                  <StudioSlider
                    label="Intensidad"
                    value={comp.intensity}
                    min={10}
                    max={100}
                    variant="compact"
            unit="%"
                    onChange={(v) => updateComp(meta.key, { intensity: v })}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// =========================================================
// 3. MORPHOLOGY + 9 DEFORMERS + VISUAL VELOCITY PANEL
// =========================================================
interface FxMorphologyDeformersPanelProps {
  morphology: FxMorphologyConfig;
  deformers: FxDeformerConfig;
  onChangeMorphology: (next: FxMorphologyConfig) => void;
  onChangeDeformers: (next: FxDeformerConfig) => void;
}

export const FxMorphologyDeformersPanel: React.FC<FxMorphologyDeformersPanelProps> = ({
  morphology,
  deformers,
  onChangeMorphology,
  onChangeDeformers,
}) => {
  const updM = <K extends keyof FxMorphologyConfig>(k: K, v: FxMorphologyConfig[K]) =>
    onChangeMorphology({ ...morphology, enabled: true, [k]: v });

  const updD = <K extends keyof FxDeformerConfig>(k: K, v: FxDeformerConfig[K]) =>
    onChangeDeformers({ ...deformers, enabled: true, [k]: v });

  return (
    <div className="flex flex-col gap-3">
      {/* SECTION A: MORPHOLOGY */}
      <div className="p-3 rounded-xl border border-cyan-500/35 bg-[#121726] flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-300" />
            <div>
              <h3 className="text-xs font-bold text-slate-100">Editor de Morfología FX (Global e Independiente)</h3>
              <p className="text-[10px] text-slate-400">
                Esculpe en vivo cualquier efecto activo (auras, flamas, columnas, ondas de Ki, tornados o rocas).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onChangeMorphology({ ...morphology, enabled: !morphology.enabled })}
              className={`px-2.5 py-1 rounded border text-[10px] font-bold cursor-pointer ${
                morphology.enabled
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100'
                  : 'bg-[#1a2135] border-[#2d3957] text-slate-400'
              }`}
            >
              Morfología: {morphology.enabled ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              onClick={() => onChangeMorphology(DEFAULT_FX_MORPHOLOGY)}
              className="px-2 py-1 rounded border border-[#2d3957] bg-[#181f32] hover:bg-[#212b45] text-[10px] text-slate-300 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Quick Silhouette Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono text-slate-400">Perfiles rápidos:</span>
          {[
            { label: 'Flama / Aura Cónica', patch: { enabled: true, topWidth: 55, midWidth: 105, bottomWidth: 135, overallHeight: 118 } },
            { label: 'Embudo / Tornado', patch: { enabled: true, topWidth: 168, midWidth: 96, bottomWidth: 42, overallHeight: 120 } },
            { label: 'Columna Alta', patch: { enabled: true, width: 72, topWidth: 95, midWidth: 85, bottomWidth: 115, overallHeight: 155 } },
            { label: 'Onda Suelo Ancha', patch: { enabled: true, width: 150, height: 65, bottomWidth: 155, topWidth: 95 } },
          ].map((pr) => (
            <button
              key={pr.label}
              type="button"
              onClick={() => onChangeMorphology({ ...DEFAULT_FX_MORPHOLOGY, ...pr.patch })}
              className="px-2 py-0.5 rounded bg-[#1a2238] hover:bg-[#232f4d] border border-[#2f3d61] text-[10px] text-cyan-200 cursor-pointer"
            >
              {pr.label}
            </button>
          ))}
        </div>

        {/* Global Morphology */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <StudioSlider label="Anchura" value={morphology.width} min={30} max={200} variant="compact"
            unit="%" onChange={(v) => updM('width', v)} />
          <StudioSlider label="Altura" value={morphology.height} min={30} max={200} variant="compact"
            unit="%" onChange={(v) => updM('height', v)} />
          <StudioSlider label="Longitud" value={morphology.length} min={30} max={200} variant="compact"
            unit="%" onChange={(v) => updM('length', v)} />
          <StudioSlider label="Volumen Visual" value={morphology.volume} min={0} max={100} variant="compact"
            unit="%" onChange={(v) => updM('volume', v)} />
          <StudioSlider label="Grosor" value={morphology.thickness} min={20} max={200} variant="compact"
            unit="%" onChange={(v) => updM('thickness', v)} />
          <StudioSlider label="Intensidad" value={morphology.intensity} min={20} max={150} variant="compact"
            unit="%" onChange={(v) => updM('intensity', v)} />
        </div>

        {/* Independent Top / Mid / Bottom Controls */}
        <div className="p-2.5 rounded-lg border border-[#263250] bg-[#0e1320] flex flex-col gap-2">
          <span className="text-[10px] font-mono uppercase text-amber-300 font-semibold">
            Control Independiente (Auras, Flamas, Columnas y Energía)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <StudioSlider label="Anchura Superior" value={morphology.topWidth} min={15} max={220} variant="compact"
            unit="%" onChange={(v) => updM('topWidth', v)} />
            <StudioSlider label="Anchura Central" value={morphology.midWidth} min={15} max={220} variant="compact"
            unit="%" onChange={(v) => updM('midWidth', v)} />
            <StudioSlider label="Anchura Inferior" value={morphology.bottomWidth} min={15} max={220} variant="compact"
            unit="%" onChange={(v) => updM('bottomWidth', v)} />
            <StudioSlider label="Altura Superior" value={morphology.topHeight} min={20} max={200} variant="compact"
            unit="%" onChange={(v) => updM('topHeight', v)} />
            <StudioSlider label="Altura Inferior" value={morphology.bottomHeight} min={20} max={200} variant="compact"
            unit="%" onChange={(v) => updM('bottomHeight', v)} />
            <StudioSlider label="Altura General" value={morphology.overallHeight} min={30} max={200} variant="compact"
            unit="%" onChange={(v) => updM('overallHeight', v)} />
          </div>
        </div>
      </div>

      {/* SECTION B: 9 DEFORMERS */}
      <div className="p-3 rounded-xl border border-purple-500/35 bg-[#121726] flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Waves className="w-4 h-4 text-purple-300" />
            <div>
              <h3 className="text-xs font-bold text-slate-100">Deformadores FX (9 Modificadores Visuales)</h3>
              <p className="text-[10px] text-slate-400">
                Ondulación, curvatura, torsión, ruido, turbulencia, distorsión, vórtice, expansión y contracción en tiempo real.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onChangeDeformers({ ...deformers, enabled: !deformers.enabled })}
              className={`px-2.5 py-1 rounded border text-[10px] font-bold cursor-pointer ${
                deformers.enabled
                  ? 'bg-purple-500/25 border-purple-400 text-purple-100'
                  : 'bg-[#1a2135] border-[#2d3957] text-slate-400'
              }`}
            >
              Deformadores: {deformers.enabled ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              onClick={() => onChangeDeformers(DEFAULT_FX_DEFORMERS)}
              className="px-2 py-1 rounded border border-[#2d3957] bg-[#181f32] hover:bg-[#212b45] text-[10px] text-slate-300 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <StudioSlider label="Ondulación" value={deformers.wave} min={0} max={100} variant="compact"
            unit="%" onChange={(v) => updD('wave', v)} />
          <StudioSlider label="Curvatura" value={deformers.curvature} min={-100} max={100} variant="compact"
            unit="%" onChange={(v) => updD('curvature', v)} />
          <StudioSlider label="Torsión" value={deformers.twist} min={-100} max={100} variant="compact"
            unit="%" onChange={(v) => updD('twist', v)} />
          <StudioSlider label="Ruido" value={deformers.noise} min={0} max={100} variant="compact"
            unit="%" onChange={(v) => updD('noise', v)} />
          <StudioSlider label="Turbulencia" value={deformers.turbulence} min={0} max={100} variant="compact"
            unit="%" onChange={(v) => updD('turbulence', v)} />
          <StudioSlider label="Distorsión" value={deformers.distortion} min={0} max={100} variant="compact"
            unit="%" onChange={(v) => updD('distortion', v)} />
          <StudioSlider label="Vórtice" value={deformers.vortex} min={-100} max={100} variant="compact"
            unit="%" onChange={(v) => updD('vortex', v)} />
          <StudioSlider label="Expansión" value={deformers.expansion} min={0} max={100} variant="compact"
            unit="%" onChange={(v) => updD('expansion', v)} />
          <StudioSlider label="Contracción" value={deformers.contraction} min={0} max={100} variant="compact"
            unit="%" onChange={(v) => updD('contraction', v)} />
        </div>

        {/* SECTION C: VELOCIDAD VISUAL */}
        <div className="p-2.5 rounded-lg border border-[#263250] bg-[#0e1320] flex flex-col gap-2">
          <span className="text-[10px] font-mono uppercase text-cyan-300 font-semibold">
            Velocidad Visual (Movimiento Estilizado No Físico)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <StudioSlider label="Velocidad" value={deformers.visualSpeed} min={10} max={250} variant="compact"
            unit="%" onChange={(v) => updD('visualSpeed', v)} />
            <StudioSlider label="Agitación" value={deformers.agitation} min={0} max={100} variant="compact"
            unit="%" onChange={(v) => updD('agitation', v)} />
            <StudioSlider label="Intensidad" value={deformers.intensity} min={0} max={150} variant="compact"
            unit="%" onChange={(v) => updD('intensity', v)} />
            <StudioSlider label="Dirección" value={deformers.directionDeg} min={0} max={360} variant="compact"
            unit="°" onChange={(v) => updD('directionDeg', v)} />
            <StudioSlider label="Flujo" value={deformers.flow} min={0} max={100} variant="compact"
            unit="%" onChange={(v) => updD('flow', v)} />
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================================
// 4. GUIDED AI ASSISTANT PANEL (OPTIONAL + ALWAYS EDITABLE)
// =========================================================
export interface GuidedAiFormState {
  effectType: FxEffectType;
  detailLevel: FxDetailLevel;
  visualStyle: FxVisualStyle;
  resolution: number;
  animated: boolean;
  frameCount: number;
  particleAmount: 'none' | 'low' | 'medium' | 'high' | 'explosive';
  complexity: 'simple' | 'medium' | 'complex' | 'hybrid';
  prompt: string;
}

interface FxGuidedAiPanelProps {
  form: GuidedAiFormState;
  canvasWidth: number;
  isBusy: boolean;
  statusMsg: string | null;
  onChangeForm: (next: GuidedAiFormState) => void;
  onGenerateModularRecipe: () => void;
  onRunPixelAssist: (
    action:
      | 'generate'
      | 'variations'
      | 'clean'
      | 'add_detail'
      | 'simplify'
      | 'adapt_style'
      | 'recolor'
      | 'animate'
  ) => void;
}

const PROMPT_SUGGESTIONS = [
  'Aura de ki basada en viento',
  'Electricidad suave',
  'Humo mágico',
  'Explosión con escombros grandes',
  'Chakra oscuro con fragmentación',
  'Ataque de púas de roca con polvo dorado',
];

export const FxGuidedAiPanel: React.FC<FxGuidedAiPanelProps> = ({
  form,
  canvasWidth,
  isBusy,
  statusMsg,
  onChangeForm,
  onGenerateModularRecipe,
  onRunPixelAssist,
}) => {
  const upd = <K extends keyof GuidedAiFormState>(k: K, v: GuidedAiFormState[K]) =>
    onChangeForm({ ...form, [k]: v });

  return (
    <div className="flex flex-col gap-3">
      <div className="p-3 rounded-xl border border-purple-500/35 bg-[#15162b] flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-purple-300" />
            <h3 className="text-xs font-bold text-purple-100">
              IA Asistida & Generación Guiada (100% Opcional · Nunca Bloquea Edición Manual)
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/35 text-emerald-300">
            Modo Manual siempre desbloqueado
          </span>
        </div>
        <p className="text-[10px] text-slate-300">
          Configura las 7 preguntas de generación guiada y escribe tu instrucción libre. Puedes pedir que la IA arme una <strong>Receta Modular Editable</strong> (capas + morfología + deformadores) o píxeles Frame-by-Frame editables.
        </p>
      </div>

      {/* Guided 7-Field Questionnaire */}
      <div className="p-3 rounded-xl border border-[#26304b] bg-[#111625] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-[11px]">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-slate-400">1. Tipo de efecto</span>
          <select
            value={form.effectType}
            onChange={(e) => upd('effectType', e.target.value as FxEffectType)}
            className="h-7 px-2 rounded border border-[#2d3958] bg-[#0c101b] text-slate-100 text-[11px]"
          >
            {FX_EFFECT_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-slate-400">2. Nivel de detalle</span>
          <select
            value={form.detailLevel}
            onChange={(e) => upd('detailLevel', e.target.value as FxDetailLevel)}
            className="h-7 px-2 rounded border border-[#2d3958] bg-[#0c101b] text-slate-100 text-[11px]"
          >
            {FX_DETAIL_LEVELS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-slate-400">3. Estilo visual</span>
          <select
            value={form.visualStyle}
            onChange={(e) => upd('visualStyle', e.target.value as FxVisualStyle)}
            className="h-7 px-2 rounded border border-[#2d3958] bg-[#0c101b] text-slate-100 text-[11px]"
          >
            {FX_VISUAL_STYLES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-slate-400">4. Resolución</span>
          <select
            value={form.resolution}
            onChange={(e) => upd('resolution', Number(e.target.value))}
            className="h-7 px-2 rounded border border-[#2d3958] bg-[#0c101b] text-slate-100 text-[11px]"
          >
            {[24, 32, 48, 64, 96, 128].map((sz) => (
              <option key={sz} value={sz}>
                {sz}×{sz} px{sz === canvasWidth ? ' (Lienzo)' : ''}
              </option>
            ))}
            {![24, 32, 48, 64, 96, 128].includes(canvasWidth) && (
              <option value={canvasWidth}>
                {canvasWidth}×{canvasWidth} px (Lienzo)
              </option>
            )}
          </select>
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-slate-400">5. Animado o Estático</span>
          <div className="flex items-center gap-1.5 h-7">
            <button
              type="button"
              onClick={() => upd('animated', true)}
              className={`flex-1 h-full rounded border text-[10px] font-semibold cursor-pointer ${
                form.animated
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100'
                  : 'bg-[#0c101b] border-[#2d3958] text-slate-400'
              }`}
            >
              Animado ({form.frameCount}f)
            </button>
            <button
              type="button"
              onClick={() => upd('animated', false)}
              className={`flex-1 h-full rounded border text-[10px] font-semibold cursor-pointer ${
                !form.animated
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100'
                  : 'bg-[#0c101b] border-[#2d3958] text-slate-400'
              }`}
            >
              Estático (1f)
            </button>
          </div>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-slate-400">6. Cantidad de partículas</span>
          <select
            value={form.particleAmount}
            onChange={(e) => upd('particleAmount', e.target.value as GuidedAiFormState['particleAmount'])}
            className="h-7 px-2 rounded border border-[#2d3958] bg-[#0c101b] text-slate-100 text-[11px]"
          >
            <option value="none">Ninguna</option>
            <option value="low">Baja (sutil)</option>
            <option value="medium">Media (equilibrada)</option>
            <option value="high">Alta (densa)</option>
            <option value="explosive">Explosiva (máxima)</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-slate-400">7. Nivel de complejidad</span>
          <select
            value={form.complexity}
            onChange={(e) => upd('complexity', e.target.value as GuidedAiFormState['complexity'])}
            className="h-7 px-2 rounded border border-[#2d3958] bg-[#0c101b] text-slate-100 text-[11px]"
          >
            <option value="simple">Simple (1–2 capas)</option>
            <option value="medium">Media (3 capas)</option>
            <option value="complex">Compleja (4–5 capas)</option>
            <option value="hybrid">Híbrida Multicapa (5–6 capas)</option>
          </select>
        </label>

        {form.animated && (
          <div className="flex flex-col justify-end">
            <StudioSlider
              label="Fotogramas"
              value={form.frameCount}
              min={2}
              max={16}
              variant="compact"
            unit="f"
              onChange={(v) => upd('frameCount', v)}
            />
          </div>
        )}
      </div>

      {/* Natural Language Instruction + Example Chips */}
      <div className="p-3 rounded-xl border border-[#26304b] bg-[#111625] flex flex-col gap-2">
        <span className="text-[10px] font-mono uppercase text-purple-300 font-semibold">
          Instrucción Creativa (lenguaje natural)
        </span>
        <textarea
          value={form.prompt}
          onChange={(e) => upd('prompt', e.target.value)}
          rows={2}
          placeholder='Ej: "Aura de ki basada en viento", "Electricidad suave", "Humo mágico", "Explosión con escombros grandes", "Chakra oscuro con fragmentación"...'
          className="w-full p-2 rounded-lg border border-[#2d3958] bg-[#0c101b] text-xs text-slate-100 outline-none focus:border-purple-400 resize-none"
        />
        <div className="flex flex-wrap gap-1.5">
          {PROMPT_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => upd('prompt', s)}
              className="px-2 py-0.5 rounded bg-[#1b2238] hover:bg-[#263050] border border-[#303d61] text-[10px] text-purple-200 cursor-pointer"
            >
              “{s}”
            </button>
          ))}
        </div>

        {/* Two Primary Generation Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            disabled={isBusy}
            onClick={onGenerateModularRecipe}
            className="px-3 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-500 hover:opacity-95 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
            <span>Construir Receta Modular Editable (IA)</span>
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onRunPixelAssist('generate')}
            className="px-3 py-2 rounded-lg border border-purple-400/60 bg-purple-500/20 hover:bg-purple-500/30 text-purple-100 font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            <span>Generar Píxeles Frame-by-Frame (IA)</span>
          </button>
        </div>
      </div>

      {/* Assist Actions on Existing FX */}
      <div className="p-3 rounded-xl border border-[#26304b] bg-[#111625] flex flex-col gap-2">
        <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
          Asistencia IA sobre el Efecto Actual (sin reemplazar tus herramientas manuales)
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {(
            [
              ['variations', 'Crear Variaciones'],
              ['clean', 'Limpiar Píxeles'],
              ['add_detail', 'Añadir Detalle'],
              ['simplify', 'Simplificar Retro'],
              ['adapt_style', 'Adaptar Estilo'],
              ['recolor', 'Recolorear Paleta'],
              ['animate', 'Animar Estático'],
            ] as const
          ).map(([act, lbl]) => (
            <button
              key={act}
              type="button"
              disabled={isBusy}
              onClick={() => onRunPixelAssist(act)}
              className="px-2.5 py-1.5 rounded-md border border-[#2c3857] bg-[#171e32] hover:bg-[#222c49] text-[11px] font-semibold text-slate-200 disabled:opacity-45 cursor-pointer"
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {statusMsg && (
        <div className="p-2.5 rounded-lg border border-purple-500/35 bg-purple-500/10 text-[11px] text-purple-100">
          {statusMsg}
        </div>
      )}
    </div>
  );
};
