import React, { useState } from 'react';
import {
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  Layers,
  MousePointerClick,
  Plus,
  Scissors,
  Sparkles,
  Spline,
  Trash2,
  X,
} from 'lucide-react';
import {
  Layer,
  VectorCapStyle,
  VectorCreationMode,
  VectorJoinStyle,
  VectorNodeType,
  VectorPath,
  VectorRasterConfirmMode,
  VectorStrokeProfile,
  VectorSymmetryMode,
  VectorToolConfig,
  VectorWidthMode,
} from '../types';
import { StudioSlider } from './StudioSlider';

interface VectorLineInspectorProps {
  config: VectorToolConfig;
  currentLayer: Layer;
  activePath: VectorPath | null;
  selectedNodeIds: string[];
  onChangeConfig: (next: VectorToolConfig) => void;
  onSelectPath: (id: string | null) => void;
  onStartNewPath: () => void;
  onDeleteActivePath: () => void;
  onUpdateActivePath: (patch: Partial<VectorPath>) => void;
  onNodeAction: (
    action:
      | 'add_midpoint'
      | 'duplicate_selected'
      | 'delete_selected'
      | 'convert_corner'
      | 'convert_smooth'
      | 'convert_symmetric'
      | 'break_tangents'
      | 'join_tangents'
      | 'toggle_straight_curve'
      | 'align_x'
      | 'align_y'
      | 'distribute_h'
      | 'distribute_v'
      | 'scale_nodes_up'
      | 'scale_nodes_down'
      | 'rotate_nodes_15'
  ) => void;
  onConvertPath: (target: 'to_selection' | 'to_shape' | 'to_raster' | 'to_brush' | 'to_route') => void;
  isDraftActive?: boolean;
  draftPhase?: 'placing' | 'editing' | null;
  draftMetrics?: {
    lengthPx: number;
    angleDeg: number;
    directionLabel: string;
    nodeCount: number;
  } | null;
  confirmPolicy?: VectorRasterConfirmMode;
  onChangeConfirmPolicy?: (mode: VectorRasterConfirmMode) => void;
  showPixelPerfectPreview?: boolean;
  onTogglePixelPerfectPreview?: () => void;
  onConfirmVector?: () => void;
  onCancelVector?: () => void;
}

const CREATION_MODES: { id: VectorCreationMode; label: string }[] = [
  { id: 'straight', label: 'Línea recta' },
  { id: 'polyline', label: 'Polilínea' },
  { id: 'bezier', label: 'Curva Bézier' },
  { id: 'spline', label: 'Curva spline' },
  { id: 'smooth', label: 'Curva suave' },
  { id: 'freehand', label: 'Curva libre' },
  { id: 'open', label: 'Ruta abierta' },
  { id: 'closed', label: 'Ruta cerrada' },
];

const PROFILES: { id: VectorStrokeProfile; label: string }[] = [
  { id: 'uniform', label: 'Uniforme' },
  { id: 'tapered', label: 'Cónico' },
  { id: 'round', label: 'Pincel redondo' },
  { id: 'square', label: 'Pincel cuadrado' },
  { id: 'pixel_perfect', label: 'Pixel Perfect' },
  { id: 'calligraphic', label: 'Caligráfico' },
  { id: 'custom', label: 'Personalizado' },
];

export const VectorLineInspector: React.FC<VectorLineInspectorProps> = ({
  config,
  currentLayer,
  activePath,
  selectedNodeIds,
  onChangeConfig,
  onSelectPath,
  onStartNewPath,
  onDeleteActivePath,
  onUpdateActivePath,
  onNodeAction,
  onConvertPath,
  isDraftActive = false,
  draftPhase = null,
  draftMetrics = null,
  confirmPolicy = 'keep',
  onChangeConfirmPolicy,
  showPixelPerfectPreview = true,
  onTogglePixelPerfectPreview,
  onConfirmVector,
  onCancelVector,
}) => {
  const [tab, setTab] = useState<'stroke' | 'nodes' | 'view'>('stroke');
  const [collapsed, setCollapsed] = useState(false);

  const paths = currentLayer.vectorPaths || [];
  const effectiveMode = activePath?.mode ?? config.mode;
  const effectiveWidth = activePath?.strokeWidth ?? config.strokeWidth;
  const effectiveWidthMode = activePath?.widthMode ?? config.widthMode;
  const effectiveProfile = activePath?.profile ?? config.profile;
  const effectiveCap = activePath?.capStyle ?? config.capStyle;
  const effectiveJoin = activePath?.joinStyle ?? config.joinStyle;
  const effectiveTension = activePath?.tension ?? config.tension;
  const effectiveSmoothing = activePath?.smoothing ?? config.smoothing;
  const effectiveRadius = activePath?.curveRadius ?? config.curveRadius;
  const effectivePP = activePath?.pixelPerfect ?? config.pixelPerfect;
  const effectiveSmart = activePath?.smartPixelCurve ?? config.smartPixelCurve;
  const effectivePressure = activePath?.penPressureEnabled ?? config.penPressureEnabled;
  const effectiveClosed = activePath?.closed ?? (config.mode === 'closed');

  const updateBoth = (cfgPatch: Partial<VectorToolConfig>, pathPatch?: Partial<VectorPath>) => {
    onChangeConfig({ ...config, ...cfgPatch });
    if (activePath) {
      onUpdateActivePath(pathPatch ?? (cfgPatch as Partial<VectorPath>));
    }
  };

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute bottom-14 left-1/2 -translate-x-1/2 z-30 border rounded-lg shadow-2xl px-2.5 py-2 flex flex-col gap-1.5 max-w-[96%] w-[min(780px,96%)] text-[11px] font-sans backdrop-blur-md"
      style={{
        backgroundColor: 'var(--studio-bg-panel)',
        borderColor: 'var(--studio-border-strong)',
        color: 'var(--studio-text)',
      }}
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Spline className="w-3.5 h-3.5" style={{ color: 'var(--studio-accent)' }} />
          <span className="font-semibold text-[11px]">Líneas y Curvas Editables</span>

          {/* Path selector */}
          <select
            value={activePath?.id || ''}
            onChange={(e) => onSelectPath(e.target.value || null)}
            className="px-1.5 py-0.5 rounded border text-[10px]"
            style={{
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: 'var(--studio-border)',
              color: 'var(--studio-text)',
            }}
          >
            <option value="">Nueva ruta ({paths.length})</option>
            {paths.map((p, idx) => (
              <option key={p.id} value={p.id}>
                {p.name || `Ruta #${idx + 1}`} ({p.nodes.length} nodos)
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onStartNewPath}
            title="Iniciar nueva ruta sin rasterizar las anteriores"
            className="px-1.5 py-0.5 rounded border flex items-center gap-1 text-[10px] hover:opacity-90"
            style={{
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: 'var(--studio-border)',
            }}
          >
            <Plus className="w-3 h-3" />
            <span>Nueva</span>
          </button>

          {activePath && (
            <button
              type="button"
              onClick={onDeleteActivePath}
              title="Eliminar ruta activa"
              className="p-1 rounded border text-rose-400 hover:bg-rose-500/15"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: 'var(--studio-border)',
              }}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Sub-tabs & Smart Pixel Curve quick toggle */}
        <div className="flex items-center gap-1.5">
          <label
            className="flex items-center gap-1 px-1.5 py-0.5 rounded border cursor-pointer text-[10px] font-medium"
            style={{
              backgroundColor: effectiveSmart ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
              borderColor: effectiveSmart ? 'var(--studio-accent)' : 'var(--studio-border)',
              color: effectiveSmart ? 'var(--studio-accent-text)' : 'var(--studio-text)',
            }}
            title="Curva vectorial interna rasterizada en tiempo real con Pixel Perfect"
          >
            <input
              type="checkbox"
              checked={effectiveSmart}
              onChange={(e) =>
                updateBoth({ smartPixelCurve: e.target.checked, pixelPerfect: true }, { smartPixelCurve: e.target.checked, pixelPerfect: true })
              }
              className="hidden"
            />
            <Sparkles className="w-3 h-3" />
            <span>Smart Pixel Curve</span>
          </label>

          {(['stroke', 'nodes', 'view'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setCollapsed(false);
              }}
              className="px-2 py-0.5 rounded border text-[10px] font-medium"
              style={{
                backgroundColor: tab === t && !collapsed ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                borderColor: tab === t && !collapsed ? 'var(--studio-accent)' : 'var(--studio-border)',
                color: tab === t && !collapsed ? 'var(--studio-accent-text)' : 'var(--studio-text)',
              }}
            >
              {t === 'stroke' ? 'Trazo y Perfil' : t === 'nodes' ? 'Nodos y Curva' : 'Simetría / Conv.'}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="p-1 rounded border"
            style={{
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: 'var(--studio-border)',
            }}
          >
            {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Non-Destructive Preview Action Bar: Live Metrics, Pixel-Perfect Toggle, Policy, Confirm/Cancel */}
      <div
        data-help-id="tool.line_preview"
        className="flex flex-wrap items-center justify-between gap-2 px-2 py-1 rounded-md border text-[10px]"
        style={{
          backgroundColor: isDraftActive
            ? 'color-mix(in srgb, var(--studio-accent) 12%, var(--studio-bg-elevated))'
            : 'var(--studio-bg-card)',
          borderColor: isDraftActive ? 'var(--studio-accent)' : 'var(--studio-border)',
        }}
      >
        <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums">
          <span
            className="px-1.5 py-0.5 rounded font-bold uppercase text-[9px]"
            style={{
              backgroundColor: isDraftActive ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
              color: isDraftActive ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
            }}
          >
            {draftPhase === 'placing'
              ? 'Vista Previa · 2.º clic coloca nodo'
              : draftPhase === 'editing' || activePath
              ? 'Edición Libre · Ajusta nodos/curva'
              : 'Listo · Clic en lienzo para iniciar'}
          </span>
          {draftMetrics && (
            <span style={{ color: 'var(--studio-text)' }}>
              Lon: <b>{draftMetrics.lengthPx.toFixed(1)}px</b> · Áng:{' '}
              <b>{Math.round(draftMetrics.angleDeg)}°</b> ({draftMetrics.directionLabel}) ·{' '}
              <b>{draftMetrics.nodeCount}</b> nodos
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {onTogglePixelPerfectPreview && (
            <button
              type="button"
              onClick={onTogglePixelPerfectPreview}
              title="Vista simultánea Pixel-Perfect: muestra el resultado exacto en píxeles mientras editas el vector (Shift+P)"
              className="px-2 py-0.5 rounded border flex items-center gap-1 font-medium transition-colors"
              style={{
                backgroundColor: showPixelPerfectPreview
                  ? 'rgba(16, 185, 129, 0.22)'
                  : 'var(--studio-bg-elevated)',
                borderColor: showPixelPerfectPreview ? '#10b981' : 'var(--studio-border)',
                color: showPixelPerfectPreview ? '#6ee7b7' : 'var(--studio-text-muted)',
              }}
            >
              <Eye className="w-3 h-3" />
              <span>Vista Pixel-Perfect: {showPixelPerfectPreview ? 'ON' : 'OFF'}</span>
            </button>
          )}

          {onChangeConfirmPolicy && (
            <label className="flex items-center gap-1">
              <span className="text-[9px]" style={{ color: 'var(--studio-text-muted)' }}>
                Al confirmar:
              </span>
              <select
                value={confirmPolicy}
                onChange={(e) => onChangeConfirmPolicy(e.target.value as VectorRasterConfirmMode)}
                className="px-1.5 py-0.5 rounded border text-[10px]"
                style={{
                  backgroundColor: 'var(--studio-bg-elevated)',
                  borderColor: 'var(--studio-border)',
                  color: 'var(--studio-text)',
                }}
              >
                <option value="keep">Mantener vector</option>
                <option value="rasterize">Rasterizar en capa</option>
                <option value="ask">Preguntar siempre</option>
              </select>
            </label>
          )}

          {(isDraftActive || Boolean(activePath)) && (
            <>
              {onCancelVector && (
                <button
                  type="button"
                  onClick={onCancelVector}
                  title="Cancelar y descartar cambios de la línea actual (Esc)"
                  className="px-2 py-0.5 rounded border flex items-center gap-1 font-semibold text-rose-300 hover:bg-rose-500/20"
                  style={{
                    backgroundColor: 'var(--studio-bg-elevated)',
                    borderColor: 'rgba(244, 63, 94, 0.45)',
                  }}
                >
                  <X className="w-3 h-3" />
                  <span>Cancelar</span>
                </button>
              )}
              {onConfirmVector && (
                <button
                  type="button"
                  onClick={onConfirmVector}
                  title="Confirmar línea o curva vectorial (Enter)"
                  className="px-2.5 py-0.5 rounded border flex items-center gap-1 font-bold"
                  style={{
                    backgroundColor: 'var(--studio-accent)',
                    borderColor: 'var(--studio-accent)',
                    color: 'var(--studio-accent-text)',
                  }}
                >
                  <Check className="w-3 h-3" />
                  <span>Confirmar</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {!collapsed && tab === 'stroke' && (
        <div className="flex flex-col gap-1.5 pt-1 border-t text-[10px]" style={{ borderColor: 'var(--studio-border)' }}>
          <div className="flex flex-wrap items-center gap-2">
            {/* Creation Mode */}
            <label className="flex items-center gap-1">
              <span style={{ color: 'var(--studio-text-muted)' }}>Modo:</span>
              <select
                value={effectiveMode}
                onChange={(e) => {
                  const m = e.target.value as VectorCreationMode;
                  updateBoth(
                    { mode: m },
                    { mode: m, closed: m === 'closed' ? true : m === 'open' ? false : effectiveClosed }
                  );
                }}
                className="px-1.5 py-0.5 rounded border"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
              >
                {CREATION_MODES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={effectiveClosed}
                onChange={(e) => updateBoth({}, { closed: e.target.checked })}
              />
              <span>Cerrada</span>
            </label>

            {/* Universal Continuous Thickness Slider + Editable Input */}
            <StudioSlider
              variant="compact"
              label="Grosor"
              value={effectiveWidth}
              min={1}
              max={256}
              step={1}
              unit="px"
              defaultValue={1}
              allowManualOverflow
              hardMax={1024}
              widthClass="min-w-[140px]"
              onChange={(w) => updateBoth({ strokeWidth: w }, { strokeWidth: w })}
            />

            <select
              value={effectiveWidthMode}
              onChange={(e) =>
                updateBoth(
                  { widthMode: e.target.value as VectorWidthMode },
                  { widthMode: e.target.value as VectorWidthMode }
                )
              }
              title="Modo de grosor"
              className="px-1.5 py-0.5 rounded border"
              style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
            >
              <option value="uniform">Grosor Uniforme</option>
              <option value="variable">Grosor Variable</option>
              <option value="per_node">Por Nodo</option>
              <option value="per_segment">Por Segmento</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1">
              <span style={{ color: 'var(--studio-text-muted)' }}>Perfil:</span>
              <select
                value={effectiveProfile}
                onChange={(e) =>
                  updateBoth(
                    { profile: e.target.value as VectorStrokeProfile },
                    { profile: e.target.value as VectorStrokeProfile }
                  )
                }
                className="px-1.5 py-0.5 rounded border"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
              >
                {PROFILES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-1">
              <span style={{ color: 'var(--studio-text-muted)' }}>Extremo:</span>
              <select
                value={effectiveCap}
                onChange={(e) =>
                  updateBoth({ capStyle: e.target.value as VectorCapStyle }, { capStyle: e.target.value as VectorCapStyle })
                }
                className="px-1.5 py-0.5 rounded border"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
              >
                <option value="butt">Plano</option>
                <option value="square">Cuadrado</option>
                <option value="round">Redondeado</option>
              </select>
            </label>

            <label className="flex items-center gap-1">
              <span style={{ color: 'var(--studio-text-muted)' }}>Unión:</span>
              <select
                value={effectiveJoin}
                onChange={(e) =>
                  updateBoth({ joinStyle: e.target.value as VectorJoinStyle }, { joinStyle: e.target.value as VectorJoinStyle })
                }
                className="px-1.5 py-0.5 rounded border"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
              >
                <option value="miter">Miter</option>
                <option value="round">Round</option>
                <option value="bevel">Bevel</option>
              </select>
            </label>

            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={effectivePP}
                onChange={(e) => updateBoth({ pixelPerfect: e.target.checked }, { pixelPerfect: e.target.checked })}
              />
              <span>Pixel Perfect</span>
            </label>

            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={effectivePressure}
                onChange={(e) =>
                  updateBoth({ penPressureEnabled: e.target.checked }, { penPressureEnabled: e.target.checked })
                }
              />
              <span>Presión lápiz</span>
            </label>

            {effectiveProfile === 'custom' && (
              <div className="flex items-center gap-1 font-mono tabular-nums">
                <span style={{ color: 'var(--studio-text-muted)' }}>Curva perfil:</span>
                {(activePath?.customProfileStops || config.customProfileStops).map((st, idx) => (
                  <input
                    key={idx}
                    type="number"
                    min={0.1}
                    max={2.5}
                    step={0.1}
                    value={st}
                    onChange={(e) => {
                      const val = Math.max(0.1, Math.min(2.5, parseFloat(e.target.value) || 1));
                      const nextStops = [...(activePath?.customProfileStops || config.customProfileStops)];
                      nextStops[idx] = val;
                      updateBoth({ customProfileStops: nextStops }, { customProfileStops: nextStops });
                    }}
                    className="w-10 px-1 py-0.5 rounded border text-center"
                    style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!collapsed && tab === 'nodes' && (
        <div className="flex flex-col gap-1.5 pt-1 border-t text-[10px]" style={{ borderColor: 'var(--studio-border)' }}>
          {/* Node Operations */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span style={{ color: 'var(--studio-text-muted)' }}>
              Nodos ({selectedNodeIds.length} sel.):
            </span>
            {(
              [
                ['convert_corner', 'Esquina'],
                ['convert_smooth', 'Suave'],
                ['convert_symmetric', 'Simétrico'],
                ['break_tangents', 'Romper tangentes'],
                ['join_tangents', 'Unir tangentes'],
                ['toggle_straight_curve', 'Recta ↔ Curva'],
              ] as const
            ).map(([act, lbl]) => (
              <button
                key={act}
                type="button"
                disabled={!activePath}
                onClick={() => onNodeAction(act)}
                className="px-1.5 py-0.5 rounded border disabled:opacity-40 hover:opacity-90"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
              >
                {lbl}
              </button>
            ))}

            <button
              type="button"
              disabled={!activePath}
              onClick={() => onNodeAction('add_midpoint')}
              className="px-1.5 py-0.5 rounded border disabled:opacity-40 flex items-center gap-0.5"
              style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
            >
              <Plus className="w-3 h-3" /> Nodo
            </button>
            <button
              type="button"
              disabled={!activePath || selectedNodeIds.length === 0}
              onClick={() => onNodeAction('duplicate_selected')}
              className="px-1.5 py-0.5 rounded border disabled:opacity-40 flex items-center gap-0.5"
              style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
            >
              <Copy className="w-3 h-3" /> Duplicar
            </button>
            <button
              type="button"
              disabled={!activePath || selectedNodeIds.length === 0}
              onClick={() => onNodeAction('delete_selected')}
              className="px-1.5 py-0.5 rounded border disabled:opacity-40 text-rose-400"
              style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
            >
              Eliminar nodo
            </button>
          </div>

          {/* Curvature Sliders + Multi-Node Align/Distribute */}
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono tabular-nums">
            <div className="flex flex-wrap items-center gap-2 font-sans">
              <StudioSlider
                variant="compact"
                label="Tensión"
                value={Math.round(effectiveTension * 100)}
                min={0}
                max={100}
                step={1}
                unit="%"
                defaultValue={50}
                widthClass="min-w-[132px]"
                onChange={(v) => updateBoth({ tension: v / 100 }, { tension: v / 100 })}
              />

              <StudioSlider
                variant="compact"
                label="Suavizado"
                value={Math.round(effectiveSmoothing * 100)}
                min={0}
                max={100}
                step={1}
                unit="%"
                defaultValue={50}
                widthClass="min-w-[138px]"
                onChange={(v) => updateBoth({ smoothing: v / 100 }, { smoothing: v / 100 })}
              />

              <StudioSlider
                variant="compact"
                label="Radio"
                value={effectiveRadius}
                min={0}
                max={128}
                step={1}
                unit="px"
                defaultValue={0}
                allowManualOverflow
                hardMax={1024}
                widthClass="min-w-[120px]"
                onChange={(v) => updateBoth({ curveRadius: v }, { curveRadius: v })}
              />
            </div>

            <div className="flex items-center gap-1 font-sans">
              <button
                type="button"
                disabled={selectedNodeIds.length < 2}
                onClick={() => onNodeAction('align_x')}
                title="Alinear nodos horizontalmente"
                className="px-1.5 py-0.5 rounded border disabled:opacity-40 flex items-center gap-0.5"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
              >
                <AlignHorizontalJustifyCenter className="w-3 h-3" /> Alin. X
              </button>
              <button
                type="button"
                disabled={selectedNodeIds.length < 2}
                onClick={() => onNodeAction('align_y')}
                title="Alinear nodos verticalmente"
                className="px-1.5 py-0.5 rounded border disabled:opacity-40 flex items-center gap-0.5"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
              >
                <AlignVerticalJustifyCenter className="w-3 h-3" /> Alin. Y
              </button>
              <button
                type="button"
                disabled={selectedNodeIds.length < 3}
                onClick={() => onNodeAction('distribute_h')}
                className="px-1.5 py-0.5 rounded border disabled:opacity-40"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
              >
                Dist. H
              </button>
              <button
                type="button"
                disabled={selectedNodeIds.length < 3}
                onClick={() => onNodeAction('distribute_v')}
                className="px-1.5 py-0.5 rounded border disabled:opacity-40"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
              >
                Dist. V
              </button>
              <button
                type="button"
                disabled={!activePath || activePath.nodes.length < 2}
                onClick={() => onNodeAction('rotate_nodes_15')}
                className="px-1.5 py-0.5 rounded border disabled:opacity-40"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
              >
                Rotar +15°
              </button>
            </div>
          </div>
        </div>
      )}

      {!collapsed && tab === 'view' && (
        <div className="flex flex-col gap-1.5 pt-1 border-t text-[10px]" style={{ borderColor: 'var(--studio-border)' }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Symmetry + Storage Layer Type */}
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1">
                <span style={{ color: 'var(--studio-text-muted)' }}>Simetría:</span>
                <select
                  value={config.symmetryMode}
                  onChange={(e) =>
                    onChangeConfig({ ...config, symmetryMode: e.target.value as VectorSymmetryMode })
                  }
                  className="px-1.5 py-0.5 rounded border"
                  style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
                >
                  <option value="none">Ninguna</option>
                  <option value="horizontal">Horizontal</option>
                  <option value="vertical">Vertical</option>
                  <option value="radial">Radial</option>
                  <option value="custom">Personalizada</option>
                </select>
              </label>

              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.storeOnVectorLayer}
                  onChange={(e) =>
                    onChangeConfig({ ...config, storeOnVectorLayer: e.target.checked })
                  }
                />
                <span>Usar Capa Vectorial automática</span>
              </label>
            </div>

            {/* Conversions */}
            <div className="flex flex-wrap items-center gap-1">
              <span style={{ color: 'var(--studio-text-muted)' }}>Convertir:</span>
              <button
                type="button"
                disabled={!activePath}
                onClick={() => onConvertPath('to_selection')}
                className="px-1.5 py-0.5 rounded border disabled:opacity-40 flex items-center gap-0.5"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
              >
                <MousePointerClick className="w-3 h-3" /> A Selección
              </button>
              <button
                type="button"
                disabled={!activePath}
                onClick={() => onConvertPath('to_shape')}
                className="px-1.5 py-0.5 rounded border disabled:opacity-40"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
              >
                A Forma
              </button>
              <button
                type="button"
                disabled={!activePath}
                onClick={() => onConvertPath('to_raster')}
                className="px-1.5 py-0.5 rounded border disabled:opacity-40 flex items-center gap-0.5"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
              >
                <Layers className="w-3 h-3" /> A Capa Raster
              </button>
              <button
                type="button"
                disabled={!activePath}
                onClick={() => onConvertPath('to_brush')}
                className="px-1.5 py-0.5 rounded border disabled:opacity-40"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
              >
                A Pincel
              </button>
              <button
                type="button"
                disabled={!activePath}
                onClick={() => onConvertPath('to_route')}
                className="px-1.5 py-0.5 rounded border disabled:opacity-40 flex items-center gap-0.5"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
              >
                <Scissors className="w-3 h-3" /> A Ruta
              </button>
            </div>
          </div>

          {/* Snap & Visual Display Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span style={{ color: 'var(--studio-text-muted)' }}>Snap:</span>
              {(
                [
                  ['grid', 'Cuadrícula'],
                  ['pixel', 'Píxel'],
                  ['guides', 'Guías'],
                  ['nodes', 'Nodos'],
                  ['objects', 'Objetos'],
                ] as const
              ).map(([k, lbl]) => (
                <label key={k} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.snap[k]}
                    onChange={(e) =>
                      onChangeConfig({ ...config, snap: { ...config.snap, [k]: e.target.checked } })
                    }
                  />
                  <span>{lbl}</span>
                </label>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span style={{ color: 'var(--studio-text-muted)' }}>Visualización:</span>
              {(
                [
                  ['showNodes', 'Nodos'],
                  ['showGuides', 'Guías'],
                  ['showTangents', 'Tangentes'],
                  ['showControlCurves', 'Curvas control'],
                  ['showThickness', 'Grosor'],
                ] as const
              ).map(([k, lbl]) => (
                <label key={k} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.display[k]}
                    onChange={(e) =>
                      onChangeConfig({
                        ...config,
                        display: { ...config.display, [k]: e.target.checked },
                      })
                    }
                  />
                  <span>{lbl}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
