import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Magnet,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import {
  TransformActionId,
  TransformFrameScope,
  TransformInterpolation,
  TransformMode,
  TransformParameters,
  TransformPivotPreset,
  TransformSnapConfig,
  TransformTargetScope,
} from '../types';
import { computeDefaultCorners, resolvePivotCoords } from '../utils/transformEngine';
import { StudioSlider } from './StudioSlider';

interface TransformPropertiesBarProps {
  params: TransformParameters;
  snapConfig: TransformSnapConfig;
  selectedLayersCount: number;
  selectedFramesCount: number;
  hasActiveGroup: boolean;
  hasSelection: boolean;
  onChangeParams: (next: TransformParameters) => void;
  onChangeSnapConfig: (next: TransformSnapConfig) => void;
  onTriggerQuickAction: (action: TransformActionId) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const MODE_LABELS: { id: TransformMode; label: string }[] = [
  { id: 'free', label: 'Libre' },
  { id: 'scale', label: 'Escalar' },
  { id: 'rotate', label: 'Rotar' },
  { id: 'skew', label: 'Sesgar' },
  { id: 'distort', label: 'Distorsionar' },
  { id: 'perspective', label: 'Perspectiva' },
  { id: 'warp', label: 'Deformar' },
];

const PIVOT_GRID: TransformPivotPreset[] = [
  'top-left',
  'top',
  'top-right',
  'left',
  'center',
  'right',
  'bottom-left',
  'bottom',
  'bottom-right',
];

export const TransformPropertiesBar: React.FC<TransformPropertiesBarProps> = ({
  params,
  snapConfig,
  selectedLayersCount,
  selectedFramesCount,
  hasActiveGroup,
  hasSelection,
  onChangeParams,
  onChangeSnapConfig,
  onTriggerQuickAction,
  onConfirm,
  onCancel,
}) => {
  const [showAdvancedDrawer, setShowAdvancedDrawer] = useState(false);

  const patchParams = (patch: Partial<TransformParameters>) => {
    onChangeParams({ ...params, ...patch });
  };

  const handleScaleChange = (axis: 'x' | 'y', pct: number) => {
    const clamped = Math.max(5, Math.min(1000, pct));
    const nextW = axis === 'x' ? Math.max(1, Math.round((params.baseWidth * clamped) / 100)) : params.width;
    const nextH = axis === 'y' ? Math.max(1, Math.round((params.baseHeight * clamped) / 100)) : params.height;
    patchParams({
      scaleX: axis === 'x' ? clamped : params.scaleX,
      scaleY: axis === 'y' ? clamped : params.scaleY,
      width: nextW,
      height: nextH,
    });
  };

  const handleDimChange = (axis: 'w' | 'h', pxVal: number) => {
    const safeVal = Math.max(1, pxVal);
    if (axis === 'w') {
      const pct = Math.round((safeVal / Math.max(1, params.baseWidth)) * 1000) / 10;
      patchParams({ width: safeVal, scaleX: pct });
    } else {
      const pct = Math.round((safeVal / Math.max(1, params.baseHeight)) * 1000) / 10;
      patchParams({ height: safeVal, scaleY: pct });
    }
  };

  const handleSelectPivot = (preset: TransformPivotPreset) => {
    const { pivotX, pivotY } = resolvePivotCoords(
      preset,
      params.x,
      params.y,
      params.width,
      params.height,
      params.pivotX,
      params.pivotY
    );
    patchParams({ pivotPreset: preset, pivotX, pivotY });
  };

  const showMultiFrameWarning =
    params.frameScope === 'selected_frames' || params.frameScope === 'all_frames';

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 border rounded-lg shadow-2xl px-2.5 py-2 flex flex-col gap-1.5 max-w-[96%] w-[min(920px,96%)] text-[11px] font-sans backdrop-blur-md"
      style={{
        backgroundColor: 'var(--studio-bg-panel)',
        borderColor: 'var(--studio-border-strong)',
        color: 'var(--studio-text)',
      }}
    >
      {/* Row 1: Mode Selector + Primary Transform Numerics + Pivot + Confirm/Cancel */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Transform Mode */}
          <select
            value={params.mode}
            onChange={(e) => {
              const nextMode = e.target.value as TransformMode;
              patchParams({
                mode: nextMode,
                corners:
                  nextMode === 'distort' || nextMode === 'perspective' || nextMode === 'warp'
                    ? params.corners
                    : computeDefaultCorners(params.x, params.y, params.width, params.height),
              });
            }}
            className="px-2 py-1 rounded border font-semibold text-[11px]"
            style={{
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: 'var(--studio-accent)',
              color: 'var(--studio-accent)',
            }}
          >
            {MODE_LABELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>

          {/* 9-Point Visual Pivot Grid */}
          <div
            title="Punto de pivote (ancla)"
            className="grid grid-cols-3 gap-[2px] p-1 rounded border shrink-0"
            style={{
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: 'var(--studio-border)',
            }}
          >
            {PIVOT_GRID.map((preset) => {
              const active = params.pivotPreset === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSelectPivot(preset)}
                  className="w-2.5 h-2.5 rounded-[1px] transition-colors"
                  style={{
                    backgroundColor: active ? 'var(--studio-accent)' : 'var(--studio-border-strong)',
                  }}
                />
              );
            })}
          </div>

          {/* Numeric Properties */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] tabular-nums">
            <label className="flex items-center gap-1" title="Posición X">
              <span style={{ color: 'var(--studio-text-muted)' }}>X</span>
              <input
                type="number"
                value={Math.round(params.x)}
                onChange={(e) => patchParams({ x: parseFloat(e.target.value) || 0 })}
                className="w-12 px-1 py-0.5 rounded border text-center"
                style={{
                  backgroundColor: 'var(--studio-bg-elevated)',
                  borderColor: 'var(--studio-border)',
                  color: 'var(--studio-text)',
                }}
              />
            </label>
            <label className="flex items-center gap-1" title="Posición Y">
              <span style={{ color: 'var(--studio-text-muted)' }}>Y</span>
              <input
                type="number"
                value={Math.round(params.y)}
                onChange={(e) => patchParams({ y: parseFloat(e.target.value) || 0 })}
                className="w-12 px-1 py-0.5 rounded border text-center"
                style={{
                  backgroundColor: 'var(--studio-bg-elevated)',
                  borderColor: 'var(--studio-border)',
                  color: 'var(--studio-text)',
                }}
              />
            </label>
            <label className="flex items-center gap-1" title="Ancho en píxeles">
              <span style={{ color: 'var(--studio-text-muted)' }}>An</span>
              <input
                type="number"
                min={1}
                value={Math.round(params.width)}
                onChange={(e) => handleDimChange('w', parseFloat(e.target.value) || 1)}
                className="w-12 px-1 py-0.5 rounded border text-center"
                style={{
                  backgroundColor: 'var(--studio-bg-elevated)',
                  borderColor: 'var(--studio-border)',
                  color: 'var(--studio-text)',
                }}
              />
            </label>
            <label className="flex items-center gap-1" title="Alto en píxeles">
              <span style={{ color: 'var(--studio-text-muted)' }}>Al</span>
              <input
                type="number"
                min={1}
                value={Math.round(params.height)}
                onChange={(e) => handleDimChange('h', parseFloat(e.target.value) || 1)}
                className="w-12 px-1 py-0.5 rounded border text-center"
                style={{
                  backgroundColor: 'var(--studio-bg-elevated)',
                  borderColor: 'var(--studio-border)',
                  color: 'var(--studio-text)',
                }}
              />
            </label>
            <label className="flex items-center gap-1" title="Escala horizontal (%)">
              <span style={{ color: 'var(--studio-text-muted)' }}>EscX%</span>
              <input
                type="number"
                step={params.integerScale ? 100 : 1}
                value={Math.round(params.scaleX)}
                onChange={(e) => handleScaleChange('x', parseFloat(e.target.value) || 100)}
                className="w-12 px-1 py-0.5 rounded border text-center"
                style={{
                  backgroundColor: 'var(--studio-bg-elevated)',
                  borderColor: 'var(--studio-border)',
                  color: 'var(--studio-text)',
                }}
              />
            </label>
            <label className="flex items-center gap-1" title="Escala vertical (%)">
              <span style={{ color: 'var(--studio-text-muted)' }}>EscY%</span>
              <input
                type="number"
                step={params.integerScale ? 100 : 1}
                value={Math.round(params.scaleY)}
                onChange={(e) => handleScaleChange('y', parseFloat(e.target.value) || 100)}
                className="w-12 px-1 py-0.5 rounded border text-center"
                style={{
                  backgroundColor: 'var(--studio-bg-elevated)',
                  borderColor: 'var(--studio-border)',
                  color: 'var(--studio-text)',
                }}
              />
            </label>
            <label className="flex items-center gap-1" title="Rotación en grados">
              <span style={{ color: 'var(--studio-text-muted)' }}>Rot°</span>
              <input
                type="number"
                step={1}
                value={Math.round(params.rotation * 10) / 10}
                onChange={(e) => patchParams({ rotation: parseFloat(e.target.value) || 0 })}
                className="w-12 px-1 py-0.5 rounded border text-center"
                style={{
                  backgroundColor: 'var(--studio-bg-elevated)',
                  borderColor: 'var(--studio-border)',
                  color: 'var(--studio-text)',
                }}
              />
            </label>
            <label className="flex items-center gap-1" title="Sesgado Horizontal (°)">
              <span style={{ color: 'var(--studio-text-muted)' }}>SesH°</span>
              <input
                type="number"
                min={-75}
                max={75}
                value={Math.round(params.skewX)}
                onChange={(e) => patchParams({ skewX: parseFloat(e.target.value) || 0 })}
                className="w-11 px-1 py-0.5 rounded border text-center"
                style={{
                  backgroundColor: 'var(--studio-bg-elevated)',
                  borderColor: 'var(--studio-border)',
                  color: 'var(--studio-text)',
                }}
              />
            </label>
            <label className="flex items-center gap-1" title="Sesgado Vertical (°)">
              <span style={{ color: 'var(--studio-text-muted)' }}>SesV°</span>
              <input
                type="number"
                min={-75}
                max={75}
                value={Math.round(params.skewY)}
                onChange={(e) => patchParams({ skewY: parseFloat(e.target.value) || 0 })}
                className="w-11 px-1 py-0.5 rounded border text-center"
                style={{
                  backgroundColor: 'var(--studio-bg-elevated)',
                  borderColor: 'var(--studio-border)',
                  color: 'var(--studio-text)',
                }}
              />
            </label>
          </div>
        </div>

        {/* Confirm / Cancel / Advanced Drawer Toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowAdvancedDrawer((v) => !v)}
            className="px-2 py-1 rounded border flex items-center gap-1 text-[10px] font-medium hover:opacity-90"
            style={{
              backgroundColor: showAdvancedDrawer ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
              borderColor: showAdvancedDrawer ? 'var(--studio-accent)' : 'var(--studio-border)',
              color: showAdvancedDrawer ? 'var(--studio-accent-text)' : 'var(--studio-text)',
            }}
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Opciones</span>
          </button>

          <button
            type="button"
            onClick={() => onTriggerQuickAction('reset')}
            title="Restablecer transformación"
            className="p-1.5 rounded border hover:opacity-90"
            style={{
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: 'var(--studio-border)',
              color: 'var(--studio-text-muted)',
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onCancel}
            title="Cancelar (Esc)"
            className="px-2 py-1 rounded border flex items-center gap-1 text-[10px] font-medium hover:bg-rose-500/20"
            style={{
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: 'var(--studio-border)',
              color: 'var(--studio-text)',
            }}
          >
            <X className="w-3.5 h-3.5 text-rose-400" />
            <span>Cancelar</span>
          </button>

          <button
            type="button"
            onClick={onConfirm}
            title="Confirmar transformación (Enter)"
            className="px-2.5 py-1 rounded font-semibold flex items-center gap-1 text-[10px]"
            style={{
              backgroundColor: 'var(--studio-accent)',
              color: 'var(--studio-accent-text)',
            }}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Confirmar</span>
          </button>
        </div>
      </div>

      {/* Row 2: Pixel Art Options + Interpolation + Target/Animation Scope + Warp/Pivot X,Y */}
      {showAdvancedDrawer && (
        <div
          className="pt-1.5 border-t flex flex-col gap-2 text-[10px]"
          style={{ borderColor: 'var(--studio-border)' }}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {/* Pixel Art Toggles */}
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={params.pixelPerfect}
                onChange={(e) =>
                  patchParams({
                    pixelPerfect: e.target.checked,
                    interpolation: e.target.checked && !params.antiAlias ? 'nearest' : params.interpolation,
                  })
                }
              />
              <span>Píxeles perfectos</span>
            </label>

            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={params.integerScale}
                onChange={(e) => patchParams({ integerScale: e.target.checked })}
              />
              <span>Escala por enteros</span>
            </label>

            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={params.pixelPerfectRotate}
                onChange={(e) => patchParams({ pixelPerfectRotate: e.target.checked })}
              />
              <span>Rotación pixel perfect</span>
            </label>

            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={params.snapToGrid}
                onChange={(e) => patchParams({ snapToGrid: e.target.checked })}
              />
              <span>Alinear a cuadrícula</span>
            </label>

            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={params.antiAlias}
                onChange={(e) =>
                  patchParams({
                    antiAlias: e.target.checked,
                    interpolation: e.target.checked ? 'bilinear' : 'nearest',
                  })
                }
              />
              <span>Anti-alias</span>
            </label>

            <label className="flex items-center gap-1 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={params.nonDestructive}
                onChange={(e) => patchParams({ nonDestructive: e.target.checked })}
              />
              <span>Transformación editable (no destructiva)</span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Interpolation */}
            <label className="flex items-center gap-1">
              <span style={{ color: 'var(--studio-text-muted)' }}>Interpolación:</span>
              <select
                value={params.interpolation}
                onChange={(e) => patchParams({ interpolation: e.target.value as TransformInterpolation })}
                className="px-1.5 py-0.5 rounded border"
                style={{
                  backgroundColor: 'var(--studio-bg-elevated)',
                  borderColor: 'var(--studio-border)',
                  color: 'var(--studio-text)',
                }}
              >
                <option value="nearest">Vecino más cercano (Pixel Art)</option>
                <option value="bilinear">Bilinear</option>
                <option value="bicubic">Bicúbico</option>
                <option value="auto">Automático</option>
              </select>
            </label>

            {/* Target Scope */}
            <label className="flex items-center gap-1">
              <span style={{ color: 'var(--studio-text-muted)' }}>Aplicar a:</span>
              <select
                value={params.targetScope}
                onChange={(e) => patchParams({ targetScope: e.target.value as TransformTargetScope })}
                className="px-1.5 py-0.5 rounded border"
                style={{
                  backgroundColor: 'var(--studio-bg-elevated)',
                  borderColor: 'var(--studio-border)',
                  color: 'var(--studio-text)',
                }}
              >
                <option value="active_layer">Capa completa</option>
                <option value="selected_layers" disabled={selectedLayersCount <= 1}>
                  Capas seleccionadas ({selectedLayersCount})
                </option>
                <option value="group" disabled={!hasActiveGroup}>
                  Grupo completo
                </option>
                <option value="selection" disabled={!hasSelection}>
                  Selección activa
                </option>
              </select>
            </label>

            {/* Animation Frame Scope */}
            <label className="flex items-center gap-1">
              <span style={{ color: 'var(--studio-text-muted)' }}>Animación:</span>
              <select
                value={params.frameScope}
                onChange={(e) => patchParams({ frameScope: e.target.value as TransformFrameScope })}
                className="px-1.5 py-0.5 rounded border"
                style={{
                  backgroundColor: 'var(--studio-bg-elevated)',
                  borderColor: 'var(--studio-border)',
                  color: 'var(--studio-text)',
                }}
              >
                <option value="current_frame">Solo frame actual</option>
                <option value="selected_frames">
                  Frames seleccionados ({Math.max(1, selectedFramesCount)})
                </option>
                <option value="all_frames">Toda la animación</option>
              </select>
            </label>

            {/* Custom Pivot Coordinates */}
            <div className="flex items-center gap-1 font-mono tabular-nums">
              <span style={{ color: 'var(--studio-text-muted)' }}>Pivote:</span>
              <input
                type="number"
                value={Math.round(params.pivotX)}
                onChange={(e) =>
                  patchParams({ pivotPreset: 'custom', pivotX: parseFloat(e.target.value) || 0 })
                }
                className="w-11 px-1 py-0.5 rounded border text-center"
                style={{
                  backgroundColor: 'var(--studio-bg-elevated)',
                  borderColor: 'var(--studio-border)',
                  color: 'var(--studio-text)',
                }}
              />
              <input
                type="number"
                value={Math.round(params.pivotY)}
                onChange={(e) =>
                  patchParams({ pivotPreset: 'custom', pivotY: parseFloat(e.target.value) || 0 })
                }
                className="w-11 px-1 py-0.5 rounded border text-center"
                style={{
                  backgroundColor: 'var(--studio-bg-elevated)',
                  borderColor: 'var(--studio-border)',
                  color: 'var(--studio-text)',
                }}
              />
            </div>
          </div>

          {/* Warp sliders when Warp mode active */}
          {params.mode === 'warp' && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-40">
                <StudioSlider
                  variant="compact"
                  label="Abultar"
                  value={Math.round(params.warpBulge * 100)}
                  min={-100}
                  max={100}
                  step={1}
                  defaultValue={0}
                  unit="%"
                  onChange={(v) => patchParams({ warpBulge: v / 100 })}
                />
              </div>
              <div className="w-40">
                <StudioSlider
                  variant="compact"
                  label="Curvar X"
                  value={Math.round(params.warpBendX * 100)}
                  min={-100}
                  max={100}
                  step={1}
                  defaultValue={0}
                  unit="%"
                  onChange={(v) => patchParams({ warpBendX: v / 100 })}
                />
              </div>
              <div className="w-40">
                <StudioSlider
                  variant="compact"
                  label="Curvar Y"
                  value={Math.round(params.warpBendY * 100)}
                  min={-100}
                  max={100}
                  step={1}
                  defaultValue={0}
                  unit="%"
                  onChange={(v) => patchParams({ warpBendY: v / 100 })}
                />
              </div>
            </div>
          )}

          {/* Snap Preferences + Advanced Pixel-Art Tools */}
          <div
            className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t"
            style={{ borderColor: 'var(--studio-border)' }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 font-medium" style={{ color: 'var(--studio-text-muted)' }}>
                <Magnet className="w-3 h-3" /> Snap:
              </span>
              {(
                [
                  ['grid', 'Cuadrícula'],
                  ['pixel', 'Píxel'],
                  ['guides', 'Guías'],
                  ['edges', 'Bordes'],
                  ['objects', 'Objetos'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={snapConfig[key]}
                    onChange={(e) =>
                      onChangeSnapConfig({ ...snapConfig, [key]: e.target.checked })
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => onTriggerQuickAction('scale_2x_hq')}
                className="px-1.5 py-0.5 rounded border hover:opacity-90"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
              >
                x2 HQ
              </button>
              <button
                type="button"
                onClick={() => onTriggerQuickAction('scale_3x_hq')}
                className="px-1.5 py-0.5 rounded border hover:opacity-90"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
              >
                x3 HQ
              </button>
              <button
                type="button"
                onClick={() => onTriggerQuickAction('scale_4x_hq')}
                className="px-1.5 py-0.5 rounded border hover:opacity-90"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
              >
                x4 HQ
              </button>
              <label className="flex items-center gap-1 px-1.5 py-0.5 rounded border cursor-pointer" style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}>
                <input
                  type="checkbox"
                  checked={params.tileWrap}
                  onChange={(e) => patchParams({ tileWrap: e.target.checked })}
                />
                <span>Tiles</span>
              </label>
              <select
                value={params.symmetryMode}
                onChange={(e) =>
                  patchParams({
                    symmetryMode: e.target.value as TransformParameters['symmetryMode'],
                  })
                }
                className="px-1.5 py-0.5 rounded border"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
              >
                <option value="none">Sin simetría</option>
                <option value="horizontal">Simetría H</option>
                <option value="vertical">Simetría V</option>
                <option value="radial">Simetría Radial</option>
              </select>
            </div>
          </div>

          {showMultiFrameWarning && (
            <div className="flex items-center gap-1.5 text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span>
                Advertencia: Al confirmar se modificará la capa correspondiente en{' '}
                {params.frameScope === 'all_frames'
                  ? 'todos los fotogramas de la animación'
                  : `${Math.max(1, selectedFramesCount)} fotogramas seleccionados`}
                . Podrás revertirlo con Deshacer (Ctrl+Z).
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>
            <span>
              <Sparkles className="w-3 h-3 inline mr-1" />
              Atajos: Shift (proporción / 15°) · Alt (desde centro) · Ctrl (esquina libre)
            </span>
            <span className="font-mono tabular-nums">
              Pivote ({Math.round(params.pivotX)}, {Math.round(params.pivotY)})
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
