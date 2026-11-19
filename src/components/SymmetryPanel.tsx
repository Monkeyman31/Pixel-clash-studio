import React from 'react';
import {
  Crosshair,
  Eye,
  FlipHorizontal,
  FlipVertical,
  Grid,
  Move,
  RotateCw,
  Sliders,
  Sparkles,
  Target,
} from 'lucide-react';
import { SymmetryConfig, SymmetryMode } from '../types';
import { StudioSlider } from './StudioSlider';

interface SymmetryPanelProps {
  config: SymmetryConfig;
  canvasWidth: number;
  canvasHeight: number;
  onChange: (next: SymmetryConfig) => void;
}

const SYMMETRY_MODES: {
  id: SymmetryMode;
  label: string;
  short: string;
  desc: string;
}[] = [
  { id: 'none', label: 'Desactivada', short: 'Off', desc: 'Dibujo normal sin réplica.' },
  { id: 'vertical', label: 'Vertical', short: 'Vert |', desc: 'Espejo izquierda ↔ derecha.' },
  { id: 'horizontal', label: 'Horizontal', short: 'Horiz —', desc: 'Espejo arriba ↕ abajo.' },
  { id: 'quad', label: 'Cuatro ejes', short: '4 Ejes +', desc: 'Cuadrantes X e Y simultáneos.' },
  { id: 'octal', label: 'Ocho ejes', short: '8 Ejes ✳', desc: 'Mandala octagonal de 8 réplicas.' },
  { id: 'radial', label: 'Radial', short: 'Radial', desc: 'N repeticiones rotacionales.' },
  { id: 'double_mirror', label: 'Espejo doble', short: 'Doble ✕', desc: 'Doble eje cruzado con ángulo.' },
  { id: 'custom_angle', label: 'Ángulo libre', short: 'Ángulo ∠', desc: 'Eje inclinado a cualquier grado.' },
  { id: 'point', label: 'Punto central', short: 'Punto •', desc: 'Inversión central 180° por punto.' },
  { id: 'custom_line', label: 'Línea libre', short: 'Línea /', desc: 'Segmento P1–P2 arrastrable.' },
];

const RADIAL_PRESETS = [2, 4, 6, 8, 12, 16];

export const SymmetryPanel: React.FC<SymmetryPanelProps> = ({
  config,
  canvasWidth,
  canvasHeight,
  onChange,
}) => {
  const selectMode = (mode: SymmetryMode) => {
    if (mode === 'none') {
      onChange({ ...config, enabled: false, mode: 'none' });
    } else {
      onChange({ ...config, enabled: true, mode });
    }
  };

  const centerAxes = () => {
    onChange({
      ...config,
      axisX: Number(((canvasWidth - 1) / 2).toFixed(1)),
      axisY: Number(((canvasHeight - 1) / 2).toFixed(1)),
      lineP1: { x: Math.round(canvasWidth * 0.15), y: Math.round(canvasHeight * 0.15) },
      lineP2: { x: Math.round(canvasWidth * 0.85), y: Math.round(canvasHeight * 0.85) },
    });
  };

  const currentModeMeta = SYMMETRY_MODES.find((m) => m.id === (config.enabled ? config.mode : 'none'));

  return (
    <div className="space-y-3 text-xs text-slate-200">
      {/* Master Toggle */}
      <div className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-700/70 bg-slate-900/70">
        <div className="flex items-center gap-2 min-w-0">
          <FlipHorizontal className={`w-4 h-4 shrink-0 ${config.enabled ? 'text-amber-400' : 'text-slate-500'}`} />
          <div className="min-w-0">
            <div className="font-bold text-[11px] truncate">
              {config.enabled ? `Activa · ${currentModeMeta?.label || config.mode}` : 'Simetría Desactivada'}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {currentModeMeta?.desc || 'Activa un modo abajo para replicar trazos.'}
            </div>
          </div>
        </div>
        <button
          onClick={() =>
            onChange({
              ...config,
              enabled: !config.enabled,
              mode: !config.enabled && config.mode === 'none' ? 'vertical' : config.mode,
            })
          }
          className={`px-2.5 py-1 rounded font-bold text-[10px] border transition-colors cursor-pointer shrink-0 ${
            config.enabled
              ? 'bg-amber-400 text-slate-950 border-amber-300'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
        >
          {config.enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Mode Grid */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Modo de Simetría (10 modos)
          </span>
          <button
            onClick={centerAxes}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] cursor-pointer"
            title="Centrar ejes al medio exacto del lienzo"
          >
            <Crosshair className="w-3 h-3 text-amber-400" />
            Centrar
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {SYMMETRY_MODES.map((m) => {
            const isActive =
              m.id === 'none' ? !config.enabled || config.mode === 'none' : config.enabled && config.mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => selectMode(m.id)}
                className={`px-2 py-1.5 rounded-md border text-left transition-colors cursor-pointer flex items-center justify-between gap-1 ${
                  isActive
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-semibold'
                    : 'bg-slate-900/60 border-slate-700/70 text-slate-300 hover:bg-slate-800/80'
                }`}
                title={m.desc}
              >
                <span className="text-[11px] truncate">{m.label}</span>
                <span className="text-[9px] font-mono text-slate-400 shrink-0">{m.short.split(' ')[1] || ''}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Radial Controls */}
      {config.enabled && config.mode === 'radial' && (
        <div className="p-2 rounded-lg border border-slate-700/70 bg-slate-900/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Repeticiones Radiales
            </span>
            <span className="font-mono text-[11px] font-bold text-amber-300 tabular-nums">
              {config.radialPoints} puntas
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {RADIAL_PRESETS.map((n) => (
              <button
                key={n}
                onClick={() => onChange({ ...config, radialPoints: n })}
                className={`px-2 py-1 rounded text-[10px] font-mono font-bold border cursor-pointer ${
                  config.radialPoints === n
                    ? 'bg-amber-400 text-slate-950 border-amber-300'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <StudioSlider
            variant="panel"
            label="Personalizado"
            value={config.radialPoints}
            min={2}
            max={32}
            step={1}
            unit=" pts"
            defaultValue={6}
            onChange={(v) => onChange({ ...config, radialPoints: v })}
          />
        </div>
      )}

      {/* Custom Angle Controls */}
      {config.enabled && (config.mode === 'custom_angle' || config.mode === 'double_mirror') && (
        <div className="p-2 rounded-lg border border-slate-700/70 bg-slate-900/60 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <RotateCw className="w-3 h-3 text-amber-400" />
              Ángulo del Eje
            </span>
          </div>
          <StudioSlider
            variant="panel"
            label="Ángulo"
            value={config.customAngleDeg}
            min={-180}
            max={180}
            step={1}
            unit="°"
            defaultValue={0}
            onChange={(v) => onChange({ ...config, customAngleDeg: v })}
          />
          <div className="flex gap-1">
            {[0, 30, 45, 60, 90, 135].map((deg) => (
              <button
                key={deg}
                onClick={() => onChange({ ...config, customAngleDeg: deg })}
                className="flex-1 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 font-mono text-[10px] cursor-pointer"
              >
                {deg}°
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Line Endpoints */}
      {config.enabled && config.mode === 'custom_line' && (
        <div className="p-2 rounded-lg border border-slate-700/70 bg-slate-900/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Move className="w-3 h-3 text-amber-400" />
              Línea Personalizada (P1 ➔ P2)
            </span>
            <span className="text-[9px] text-amber-300">Arrastrable en el canvas</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="space-y-1">
              <div className="text-slate-400 font-semibold">Punto 1</div>
              <div className="flex gap-1">
                <label className="flex-1 flex items-center gap-1 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5">
                  <span className="text-slate-500">X</span>
                  <input
                    type="number"
                    value={config.lineP1.x}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        lineP1: { ...config.lineP1, x: Number(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-transparent text-right font-mono outline-none tabular-nums"
                  />
                </label>
                <label className="flex-1 flex items-center gap-1 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5">
                  <span className="text-slate-500">Y</span>
                  <input
                    type="number"
                    value={config.lineP1.y}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        lineP1: { ...config.lineP1, y: Number(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-transparent text-right font-mono outline-none tabular-nums"
                  />
                </label>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-slate-400 font-semibold">Punto 2</div>
              <div className="flex gap-1">
                <label className="flex-1 flex items-center gap-1 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5">
                  <span className="text-slate-500">X</span>
                  <input
                    type="number"
                    value={config.lineP2.x}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        lineP2: { ...config.lineP2, x: Number(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-transparent text-right font-mono outline-none tabular-nums"
                  />
                </label>
                <label className="flex-1 flex items-center gap-1 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5">
                  <span className="text-slate-500">Y</span>
                  <input
                    type="number"
                    value={config.lineP2.y}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        lineP2: { ...config.lineP2, y: Number(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-transparent text-right font-mono outline-none tabular-nums"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Axis Position Controls */}
      {config.enabled && config.mode !== 'custom_line' && (
        <div className="p-2 rounded-lg border border-slate-700/70 bg-slate-900/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Target className="w-3 h-3 text-amber-400" />
              Posición del Eje / Centro
            </span>
            <span className="text-[9px] text-slate-400">Paso 0.5 px (entre píxeles)</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <StudioSlider
              variant="panel"
              label="Eje X"
              value={config.axisX}
              min={0}
              max={Math.max(1, canvasWidth - 1)}
              step={0.5}
              unit="px"
              defaultValue={Number(((canvasWidth - 1) / 2).toFixed(1))}
              onChange={(v) => onChange({ ...config, axisX: v })}
            />
            <StudioSlider
              variant="panel"
              label="Eje Y"
              value={config.axisY}
              min={0}
              max={Math.max(1, canvasHeight - 1)}
              step={0.5}
              unit="px"
              defaultValue={Number(((canvasHeight - 1) / 2).toFixed(1))}
              onChange={(v) => onChange({ ...config, axisY: v })}
            />
          </div>
        </div>
      )}

      {/* Live Preview Options */}
      <div className="p-2 rounded-lg border border-slate-700/70 bg-slate-900/60 space-y-1.5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <Eye className="w-3 h-3 text-amber-400" />
          Vista Previa en Tiempo Real
        </div>
        <label className="flex items-center justify-between gap-2 py-0.5 cursor-pointer">
          <span className="text-[11px] text-slate-200 flex items-center gap-1.5">
            <Sliders className="w-3 h-3 text-slate-400" />
            Mostrar ejes y manijas en lienzo
          </span>
          <input
            type="checkbox"
            checked={config.showAxes}
            onChange={(e) => onChange({ ...config, showAxes: e.target.checked })}
            className="accent-amber-400 cursor-pointer"
          />
        </label>
        <label className="flex items-center justify-between gap-2 py-0.5 cursor-pointer">
          <span className="text-[11px] text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-slate-400" />
            Puntos de réplica antes de dibujar
          </span>
          <input
            type="checkbox"
            checked={config.showReplicaPoints}
            onChange={(e) => onChange({ ...config, showReplicaPoints: e.target.checked })}
            className="accent-amber-400 cursor-pointer"
          />
        </label>
        <label className="flex items-center justify-between gap-2 py-0.5 cursor-pointer">
          <span className="text-[11px] text-slate-200 flex items-center gap-1.5">
            <Grid className="w-3 h-3 text-slate-400" />
            Resaltar área afectada
          </span>
          <input
            type="checkbox"
            checked={config.showAffectedArea}
            onChange={(e) => onChange({ ...config, showAffectedArea: e.target.checked })}
            className="accent-amber-400 cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
};
