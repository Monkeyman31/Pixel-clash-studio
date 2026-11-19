import React from 'react';
import {
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  Layers,
  PenTool,
  Pipette,
  Shield,
  Sparkles,
  Info,
  MousePointer2,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  FlipHorizontal,
  FlipVertical,
  Copy,
  Combine,
  Scissors,
  Eye,
  EyeOff,
  Magnet,
  Maximize2,
  Square,
  Blend,
} from 'lucide-react';
import {
  BucketSubTool,
  EyedropperConfig,
  GradientConfig,
  GradientPaletteMode,
  Layer,
  LayerBlendMode,
  LayerGroup,
  ShapeFillMode,
  ShapePatternType,
  ShapeToolConfig,
  ToolType,
  TransformParameters,
  VectorNode,
  VectorPath,
  VectorToolConfig,
} from '../types';
import { DEFAULT_GRADIENT_CONFIG, DEFAULT_SHAPE_CONFIG } from '../utils/toolEngines';
import { StudioSlider } from './StudioSlider';

interface PropertiesPanelProps {
  activeTool: ToolType;
  currentLayer: Layer;
  currentLayerIndex: number;
  layerGroups: LayerGroup[];
  canvasWidth: number;
  canvasHeight: number;
  collapsedSections: Record<string, boolean>;
  onToggleSection: (sectionId: string) => void;
  onUpdateLayerMeta: (index: number, patch: Partial<Layer>) => void;
  onChangeLayerOpacity: (index: number, opacity: number) => void;
  onOpenTransform: () => void;
  transformParams?: TransformParameters | null;
  // Vector & Selection tools
  vectorConfig: VectorToolConfig;
  onChangeVectorConfig: (next: VectorToolConfig) => void;
  selectedVectorPath: VectorPath | null;
  selectedVectorNodeIds: string[];
  onVectorSelectionAction: (
    action:
      | 'duplicate_object'
      | 'bring_front'
      | 'send_back'
      | 'flip_h'
      | 'flip_v'
      | 'rot_15_cw'
      | 'rot_15_ccw'
      | 'scale_up'
      | 'scale_down'
      | 'join_nodes'
      | 'split_node'
      | 'node_corner'
      | 'node_smooth'
      | 'node_symmetric'
      | 'break_handles'
      | 'restore_handles'
      | 'align_h'
      | 'align_v'
      | 'distribute_h'
  ) => void;
  // Eyedropper
  eyedropperConfig: EyedropperConfig;
  onChangeEyedropperConfig: (next: EyedropperConfig) => void;
  colorHistory: string[];
  primaryColor: string;
  onSelectPrimaryColor: (hex: string) => void;
  // Masks
  onCreateLayerMask?: (index: number, mode: 'reveal' | 'hide') => void;
  onDeleteLayerMask?: (index: number) => void;
  // Shapes & Gradient / Bucket
  shapeConfig?: ShapeToolConfig;
  onChangeShapeConfig?: (next: ShapeToolConfig) => void;
  bucketSubTool?: BucketSubTool;
  onChangeBucketSubTool?: (sub: BucketSubTool) => void;
  gradientConfig?: GradientConfig;
  onChangeGradientConfig?: (next: GradientConfig) => void;
}

const BLEND_MODES: { value: LayerBlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiplicar' },
  { value: 'screen', label: 'Trama' },
  { value: 'overlay', label: 'Superponer' },
  { value: 'soft-light', label: 'Luz Suave' },
  { value: 'hard-light', label: 'Luz Fuerte' },
  { value: 'darken', label: 'Oscurecer' },
  { value: 'lighten', label: 'Aclarar' },
  { value: 'difference', label: 'Diferencia' },
  { value: 'hue', label: 'Tono' },
  { value: 'saturation', label: 'Saturación' },
  { value: 'color', label: 'Color' },
  { value: 'luminosity', label: 'Luminosidad' },
];

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  activeTool,
  currentLayer,
  currentLayerIndex,
  layerGroups,
  canvasWidth,
  canvasHeight,
  collapsedSections,
  onToggleSection,
  onUpdateLayerMeta,
  onChangeLayerOpacity,
  onOpenTransform,
  transformParams,
  vectorConfig,
  onChangeVectorConfig,
  selectedVectorPath,
  selectedVectorNodeIds,
  onVectorSelectionAction,
  eyedropperConfig,
  onChangeEyedropperConfig,
  colorHistory,
  primaryColor,
  onSelectPrimaryColor,
  onCreateLayerMask,
  onDeleteLayerMask,
  shapeConfig = DEFAULT_SHAPE_CONFIG,
  onChangeShapeConfig,
  bucketSubTool = 'solid',
  onChangeBucketSubTool,
  gradientConfig = DEFAULT_GRADIENT_CONFIG,
  onChangeGradientConfig,
}) => {
  const isCollapsed = (id: string, defaultCollapsed = false) =>
    collapsedSections[id] !== undefined ? collapsedSections[id] : defaultCollapsed;

  const renderSection = (
    id: string,
    title: string,
    Icon: React.FC<{ className?: string; style?: React.CSSProperties }>,
    children: React.ReactNode,
    defaultCollapsed = false
  ) => {
    const collapsed = isCollapsed(`prop_${id}`, defaultCollapsed);
    return (
      <div
        className="border rounded-lg overflow-hidden"
        style={{
          backgroundColor: 'var(--studio-bg-card)',
          borderColor: 'var(--studio-border)',
        }}
      >
        <button
          type="button"
          onClick={() => onToggleSection(`prop_${id}`)}
          className="w-full px-2.5 py-1.5 flex items-center justify-between text-[11px] font-bold border-b transition-colors hover:opacity-90"
          style={{
            backgroundColor: 'var(--studio-bg-elevated)',
            borderColor: collapsed ? 'transparent' : 'var(--studio-border)',
            color: 'var(--studio-text)',
          }}
        >
          <span className="flex items-center gap-1.5">
            {collapsed ? <ChevronRight className="w-3.5 h-3.5 opacity-70" /> : <ChevronDown className="w-3.5 h-3.5 opacity-70" />}
            <Icon className="w-3.5 h-3.5" style={{ color: 'var(--studio-accent)' }} />
            <span>{title}</span>
          </span>
        </button>
        {!collapsed && <div className="p-2.5 flex flex-col gap-2 text-[11px]">{children}</div>}
      </div>
    );
  };

  const activeGroup = layerGroups.find((g) => g.id === currentLayer.groupId);
  const pixelCount = React.useMemo(() => {
    let count = 0;
    for (const row of currentLayer.pixels) {
      for (const cell of row) {
        if (cell) count++;
      }
    }
    return count;
  }, [currentLayer.pixels]);

  const isVectorContext =
    activeTool === 'line' || activeTool === 'move' || activeTool === 'direct_select' || Boolean(selectedVectorPath);

  return (
    <div className="p-2.5 flex flex-col gap-2 select-none">
      {/* 1. Transformación */}
      {renderSection(
        'transform',
        'Transformación',
        Maximize2,
        <>
          <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px] tabular-nums">
            <div className="px-2 py-1 rounded border flex justify-between" style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}>
              <span style={{ color: 'var(--studio-text-muted)' }}>X</span>
              <span>{Math.round(transformParams?.x ?? 0)}px</span>
            </div>
            <div className="px-2 py-1 rounded border flex justify-between" style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}>
              <span style={{ color: 'var(--studio-text-muted)' }}>Y</span>
              <span>{Math.round(transformParams?.y ?? 0)}px</span>
            </div>
            <div className="px-2 py-1 rounded border flex justify-between" style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}>
              <span style={{ color: 'var(--studio-text-muted)' }}>W</span>
              <span>{Math.round(transformParams?.width ?? canvasWidth)}px</span>
            </div>
            <div className="px-2 py-1 rounded border flex justify-between" style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}>
              <span style={{ color: 'var(--studio-text-muted)' }}>H</span>
              <span>{Math.round(transformParams?.height ?? canvasHeight)}px</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenTransform}
            className="w-full py-1.5 rounded-lg text-[11px] font-bold border transition-opacity hover:opacity-90"
            style={{
              backgroundColor: 'var(--studio-accent)',
              color: 'var(--studio-accent-text)',
              borderColor: 'var(--studio-accent)',
            }}
          >
            Transformación Libre (Ctrl+T)
          </button>
        </>
      )}

      {/* 2. Apariencia */}
      {renderSection(
        'appearance',
        'Apariencia y Fusión',
        Layers,
        <>
          <div className="flex items-center justify-between gap-2">
            <span style={{ color: 'var(--studio-text-muted)' }}>Fusión:</span>
            <select
              value={currentLayer.blendMode || 'normal'}
              onChange={(e) =>
                onUpdateLayerMeta(currentLayerIndex, { blendMode: e.target.value as LayerBlendMode })
              }
              className="flex-1 px-2 py-1 rounded border text-[11px]"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            >
              {BLEND_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <StudioSlider
            variant="panel"
            label="Opacidad"
            value={Math.round((currentLayer.opacity ?? 1) * 100)}
            min={0}
            max={100}
            step={1}
            unit="%"
            defaultValue={100}
            onChange={(v) => onChangeLayerOpacity(currentLayerIndex, v / 100)}
          />
          <StudioSlider
            variant="panel"
            label="Relleno (Fill)"
            value={Math.round((currentLayer.fillOpacity ?? 1) * 100)}
            min={0}
            max={100}
            step={1}
            unit="%"
            defaultValue={100}
            onChange={(v) => onUpdateLayerMeta(currentLayerIndex, { fillOpacity: v / 100 })}
          />
        </>
      )}

      {/* 3. Selección Vectorial & Directa (Contextual collapsible inside Propiedades) */}
      {renderSection(
        'vector',
        activeTool === 'direct_select'
          ? 'Selección Directa (Nodos / Curvas)'
          : activeTool === 'move' && selectedVectorPath
          ? 'Selección (Objetos Vectoriales)'
          : 'Herramientas Vectoriales & Snap',
        activeTool === 'move' || activeTool === 'direct_select' ? MousePointer2 : PenTool,
        <>
          <div className="text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>
            {selectedVectorPath
              ? `Objeto: "${selectedVectorPath.name}" · ${selectedVectorPath.nodes.length} nodos (${selectedVectorNodeIds.length} sel.)`
              : 'Haz clic en un objeto o trazo vectorial con Selección [V] o Selección Directa [A].'}
          </div>

          {/* Object operations */}
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => onVectorSelectionAction('duplicate_object')}
              disabled={!selectedVectorPath}
              className="px-1.5 py-1 rounded border text-[10px] flex items-center justify-center gap-1 disabled:opacity-40"
              style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
              title="Duplicar objeto vectorial"
            >
              <Copy className="w-3 h-3" /> Dupl.
            </button>
            <button
              type="button"
              onClick={() => onVectorSelectionAction('flip_h')}
              disabled={!selectedVectorPath}
              className="px-1.5 py-1 rounded border text-[10px] flex items-center justify-center gap-1 disabled:opacity-40"
              style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
            >
              <FlipHorizontal className="w-3 h-3" /> Vol.H
            </button>
            <button
              type="button"
              onClick={() => onVectorSelectionAction('flip_v')}
              disabled={!selectedVectorPath}
              className="px-1.5 py-1 rounded border text-[10px] flex items-center justify-center gap-1 disabled:opacity-40"
              style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
            >
              <FlipVertical className="w-3 h-3" /> Vol.V
            </button>
            <button
              type="button"
              onClick={() => onVectorSelectionAction('bring_front')}
              disabled={!selectedVectorPath}
              className="px-1.5 py-1 rounded border text-[10px] disabled:opacity-40"
              style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
            >
              Al frente
            </button>
            <button
              type="button"
              onClick={() => onVectorSelectionAction('send_back')}
              disabled={!selectedVectorPath}
              className="px-1.5 py-1 rounded border text-[10px] disabled:opacity-40"
              style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
            >
              Al fondo
            </button>
            <button
              type="button"
              onClick={() => onVectorSelectionAction('rot_15_cw')}
              disabled={!selectedVectorPath}
              className="px-1.5 py-1 rounded border text-[10px] disabled:opacity-40"
              style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
            >
              +15°
            </button>
          </div>

          {/* Direct Node & Tangent Editing */}
          <div className="pt-1.5 border-t flex flex-col gap-1.5" style={{ borderColor: 'var(--studio-border)' }}>
            <span className="text-[10px] font-semibold" style={{ color: 'var(--studio-text-muted)' }}>
              Nodos y Tangentes (Selección Directa):
            </span>
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => onVectorSelectionAction('node_corner')}
                disabled={selectedVectorNodeIds.length === 0}
                className="px-1.5 py-1 rounded border text-[10px] disabled:opacity-40"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
              >
                Esquina
              </button>
              <button
                type="button"
                onClick={() => onVectorSelectionAction('node_smooth')}
                disabled={selectedVectorNodeIds.length === 0}
                className="px-1.5 py-1 rounded border text-[10px] disabled:opacity-40"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
              >
                Suave
              </button>
              <button
                type="button"
                onClick={() => onVectorSelectionAction('node_symmetric')}
                disabled={selectedVectorNodeIds.length === 0}
                className="px-1.5 py-1 rounded border text-[10px] disabled:opacity-40"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
              >
                Simétrico
              </button>
              <button
                type="button"
                onClick={() => onVectorSelectionAction('join_nodes')}
                disabled={selectedVectorNodeIds.length < 2}
                className="px-1.5 py-1 rounded border text-[10px] flex items-center justify-center gap-1 disabled:opacity-40"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
              >
                <Combine className="w-3 h-3" /> Unir
              </button>
              <button
                type="button"
                onClick={() => onVectorSelectionAction('split_node')}
                disabled={selectedVectorNodeIds.length === 0}
                className="px-1.5 py-1 rounded border text-[10px] flex items-center justify-center gap-1 disabled:opacity-40"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
              >
                <Scissors className="w-3 h-3" /> Separar
              </button>
              <button
                type="button"
                onClick={() => onVectorSelectionAction('break_handles')}
                disabled={selectedVectorNodeIds.length === 0}
                className="px-1.5 py-1 rounded border text-[10px] disabled:opacity-40"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
              >
                Romper Tg.
              </button>
              <button
                type="button"
                onClick={() => onVectorSelectionAction('align_h')}
                disabled={selectedVectorNodeIds.length < 2}
                className="px-1.5 py-1 rounded border text-[10px] flex items-center justify-center gap-1 disabled:opacity-40"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
              >
                <AlignHorizontalJustifyCenter className="w-3 h-3" /> Alin. H
              </button>
              <button
                type="button"
                onClick={() => onVectorSelectionAction('align_v')}
                disabled={selectedVectorNodeIds.length < 2}
                className="px-1.5 py-1 rounded border text-[10px] flex items-center justify-center gap-1 disabled:opacity-40"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
              >
                <AlignVerticalJustifyCenter className="w-3 h-3" /> Alin. V
              </button>
              <button
                type="button"
                onClick={() => onVectorSelectionAction('distribute_h')}
                disabled={selectedVectorNodeIds.length < 3}
                className="px-1.5 py-1 rounded border text-[10px] disabled:opacity-40"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
              >
                Distrib.
              </button>
            </div>
          </div>

          {/* Snap & Display Toggles */}
          <div className="pt-1.5 border-t flex flex-wrap gap-2 text-[10px]" style={{ borderColor: 'var(--studio-border)' }}>
            {(
              [
                ['pixel', 'Snap Píxel'],
                ['grid', 'Snap Cuadrícula'],
                ['guides', 'Snap Guías'],
                ['nodes', 'Snap Nodos'],
                ['objects', 'Snap Objetos'],
              ] as const
            ).map(([k, lbl]) => (
              <label key={k} className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={vectorConfig.snap[k]}
                  onChange={(e) =>
                    onChangeVectorConfig({
                      ...vectorConfig,
                      snap: { ...vectorConfig.snap, [k]: e.target.checked },
                    })
                  }
                  className="accent-amber-400"
                />
                <span>{lbl}</span>
              </label>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 text-[10px]">
            {(
              [
                ['showNodes', 'Ver Nodos'],
                ['showTangents', 'Ver Tangentes'],
                ['showControlCurves', 'Ver Curvas Ctrl'],
              ] as const
            ).map(([k, lbl]) => (
              <label key={k} className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={vectorConfig.display[k]}
                  onChange={(e) =>
                    onChangeVectorConfig({
                      ...vectorConfig,
                      display: { ...vectorConfig.display, [k]: e.target.checked },
                    })
                  }
                  className="accent-amber-400"
                />
                <span>{lbl}</span>
              </label>
            ))}
          </div>
        </>,
        !isVectorContext
      )}

      {/* 4. Cuentagotas · Ajustes Avanzados (muestreo/lupa/origen en Barra Contextual) */}
      {renderSection(
        'eyedropper',
        'Cuentagotas · Avanzado',
        Pipette,
        <>
          <label className="flex items-center gap-1.5 text-[10px] cursor-pointer">
            <input
              type="checkbox"
              checked={eyedropperConfig.ignoreLocked}
              onChange={(e) =>
                onChangeEyedropperConfig({ ...eyedropperConfig, ignoreLocked: e.target.checked })
              }
              className="accent-amber-400"
            />
            <span>Ignorar capas bloqueadas al muestrear</span>
          </label>

          {colorHistory.length > 0 ? (
            <div className="flex flex-col gap-1 pt-1 border-t" style={{ borderColor: 'var(--studio-border)' }}>
              <span className="text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>
                Historial Cuentagotas ({colorHistory.length}/{eyedropperConfig.historyLimit}):
              </span>
              <div className="flex flex-wrap gap-1">
                {colorHistory.slice(0, eyedropperConfig.historyLimit).map((hex, i) => (
                  <button
                    key={`${hex}-${i}`}
                    type="button"
                    onClick={() => onSelectPrimaryColor(hex)}
                    title={hex}
                    className="w-4 h-4 rounded border transition-transform hover:scale-110"
                    style={{
                      backgroundColor: hex,
                      borderColor:
                        hex.toLowerCase() === primaryColor.toLowerCase() ? '#ffffff' : 'var(--studio-border-strong)',
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-[10px] italic" style={{ color: 'var(--studio-text-muted)' }}>
              Muestrea colores con [I] para llenar el historial.
            </div>
          )}
        </>,
        activeTool !== 'eyedropper'
      )}

      {/* 5. Máscaras */}
      {renderSection(
        'masks',
        'Máscaras',
        Shield,
        <>
          {currentLayer.mask ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px]">
                Máscara activa ({currentLayer.mask.inverted ? 'Invertida' : 'Normal'})
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateLayerMeta(currentLayerIndex, {
                      mask: currentLayer.mask
                        ? { ...currentLayer.mask, disabled: !currentLayer.mask.disabled }
                        : null,
                    })
                  }
                  className="px-2 py-0.5 rounded border text-[10px]"
                  style={{ borderColor: 'var(--studio-border-strong)' }}
                >
                  {currentLayer.mask.disabled ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
                {onDeleteLayerMask && (
                  <button
                    type="button"
                    onClick={() => onDeleteLayerMask(currentLayerIndex)}
                    className="px-2 py-0.5 rounded border text-[10px] text-rose-400"
                    style={{ borderColor: 'var(--studio-border-strong)' }}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex gap-1.5">
              {onCreateLayerMask && (
                <>
                  <button
                    type="button"
                    onClick={() => onCreateLayerMask(currentLayerIndex, 'reveal')}
                    className="flex-1 py-1 rounded border text-[10px]"
                    style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
                  >
                    + Máscara Blanca
                  </button>
                  <button
                    type="button"
                    onClick={() => onCreateLayerMask(currentLayerIndex, 'hide')}
                    className="flex-1 py-1 rounded border text-[10px]"
                    style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
                  >
                    + Máscara Negra
                  </button>
                </>
              )}
            </div>
          )}
        </>,
        true
      )}

      {/* 5B. Forma · Ajustes Avanzados (los controles principales viven en la Barra Contextual) */}
      {(activeTool === 'rectangle' || activeTool === 'circle') && onChangeShapeConfig &&
        renderSection(
          'shape_modifiers',
          'Forma · Ajustes Avanzados',
          Square,
          <div className="flex flex-col gap-2 text-[10px] font-mono">
            <div className="grid grid-cols-2 gap-1.5">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shapeConfig.innerStroke}
                  onChange={(e) => onChangeShapeConfig({ ...shapeConfig, innerStroke: e.target.checked })}
                  style={{ accentColor: 'var(--studio-accent)' }}
                />
                <span>Contorno int.</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shapeConfig.outerStroke}
                  onChange={(e) => onChangeShapeConfig({ ...shapeConfig, outerStroke: e.target.checked })}
                  style={{ accentColor: 'var(--studio-accent)' }}
                />
                <span>Contorno ext.</span>
              </label>
            </div>

            {shapeConfig.shapeKind === 'rectangle' && (
              <StudioSlider
                variant="panel"
                label="Bisel de esquinas"
                value={shapeConfig.bevel}
                min={0}
                max={64}
                step={1}
                unit="px"
                defaultValue={0}
                allowManualOverflow
                hardMax={512}
                onChange={(v) =>
                  onChangeShapeConfig({
                    ...shapeConfig,
                    bevel: v,
                    roundedCorners: v > 0 ? false : shapeConfig.roundedCorners,
                  })
                }
              />
            )}

            <div>
              <span style={{ color: 'var(--studio-text-muted)' }}>Modo de Relleno</span>
              <select
                value={shapeConfig.fillMode}
                onChange={(e) =>
                  onChangeShapeConfig({
                    ...shapeConfig,
                    filled: e.target.value !== 'none',
                    fillMode: e.target.value as ShapeFillMode,
                  })
                }
                className="w-full mt-0.5 px-1.5 py-0.5 rounded border text-[10px]"
                style={{
                  backgroundColor: 'var(--studio-bg-card)',
                  borderColor: 'var(--studio-border-strong)',
                  color: 'var(--studio-text)',
                }}
              >
                <option value="solid">Sólido</option>
                <option value="pattern">Patrón</option>
                <option value="dither">Dithering</option>
                <option value="gradient">Degradado</option>
                <option value="none">Sin relleno</option>
              </select>
            </div>

            {shapeConfig.fillMode === 'pattern' && (
              <div>
                <span style={{ color: 'var(--studio-text-muted)' }}>Patrón de relleno</span>
                <select
                  value={shapeConfig.pattern}
                  onChange={(e) =>
                    onChangeShapeConfig({ ...shapeConfig, pattern: e.target.value as ShapePatternType })
                  }
                  className="w-full mt-0.5 px-1.5 py-0.5 rounded border text-[10px]"
                  style={{
                    backgroundColor: 'var(--studio-bg-card)',
                    borderColor: 'var(--studio-border-strong)',
                    color: 'var(--studio-text)',
                  }}
                >
                  <option value="checker">Tablero</option>
                  <option value="dots">Puntos</option>
                  <option value="hlines">Líneas H</option>
                  <option value="vlines">Líneas V</option>
                  <option value="diagonal">Diagonal</option>
                  <option value="bricks">Ladrillos</option>
                </select>
              </div>
            )}
          </div>,
          false
        )}

      {/* 5C. Degradado · Ajustes Avanzados (los modos básicos viven en la Barra Contextual) */}
      {activeTool === 'bucket' && bucketSubTool !== 'solid' && onChangeGradientConfig &&
        renderSection(
          'bucket_gradient',
          'Degradado · Ajustes Avanzados',
          Blend,
          <div className="flex flex-col gap-2 text-[10px] font-mono">
            <div>
              <span style={{ color: 'var(--studio-text-muted)' }}>Paleta del degradado</span>
              <select
                value={gradientConfig.paletteMode}
                onChange={(e) =>
                  onChangeGradientConfig({
                    ...gradientConfig,
                    paletteMode: e.target.value as GradientPaletteMode,
                  })
                }
                className="w-full mt-0.5 px-1.5 py-0.5 rounded border text-[10px]"
                style={{
                  backgroundColor: 'var(--studio-bg-card)',
                  borderColor: 'var(--studio-border-strong)',
                  color: 'var(--studio-text)',
                }}
              >
                <option value="primary_secondary">Primario → Secundario</option>
                <option value="active_palette">Paleta Activa</option>
                <option value="monochrome">Monocromo</option>
              </select>
            </div>

            {bucketSubTool === 'dither_gradient' && (
              <div className="grid grid-cols-2 gap-2.5">
                <StudioSlider
                  variant="panel"
                  label="Intensidad"
                  value={gradientConfig.intensity}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  defaultValue={50}
                  onChange={(v) => onChangeGradientConfig({ ...gradientConfig, intensity: v })}
                />
                <StudioSlider
                  variant="panel"
                  label="Escala trama"
                  value={gradientConfig.scale}
                  min={1}
                  max={8}
                  step={1}
                  unit="×"
                  defaultValue={1}
                  onChange={(v) => onChangeGradientConfig({ ...gradientConfig, scale: v })}
                />
              </div>
            )}

            <StudioSlider
              variant="panel"
              label="Contraste"
              value={gradientConfig.contrast}
              min={0}
              max={100}
              step={1}
              unit="%"
              defaultValue={50}
              onChange={(v) => onChangeGradientConfig({ ...gradientConfig, contrast: v })}
            />
          </div>,
          false
        )}

      {/* 6. Información */}
      {renderSection(
        'info',
        'Información',
        Info,
        <div className="grid grid-cols-2 gap-1 text-[10px] font-mono tabular-nums">
          <span style={{ color: 'var(--studio-text-muted)' }}>Capa:</span>
          <span className="truncate text-right">{currentLayer.name}</span>
          <span style={{ color: 'var(--studio-text-muted)' }}>Tipo:</span>
          <span className="text-right">{currentLayer.layerType || 'raster'}{currentLayer.isGlobal ? ' (Global)' : ''}</span>
          <span style={{ color: 'var(--studio-text-muted)' }}>Grupo:</span>
          <span className="truncate text-right">{activeGroup ? activeGroup.name : 'Ninguno'}</span>
          <span style={{ color: 'var(--studio-text-muted)' }}>Píxeles activos:</span>
          <span className="text-right">{pixelCount}</span>
        </div>,
        false
      )}
    </div>
  );
};
