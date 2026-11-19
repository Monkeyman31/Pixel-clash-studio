import React, { useEffect, useMemo, useState } from 'react';
import {
  SlidersHorizontal,
  Sparkles,
  Layers,
  Check,
  RotateCcw,
  Droplets,
  Wand2,
  X,
  SplitSquareHorizontal,
} from 'lucide-react';
import { Layer, LayerAdjustmentConfig } from '../types';
import {
  DEFAULT_ADJUSTMENT_CONFIG,
  FILTER_GALLERY_PRESETS,
  FilterGalleryPresetId,
  applyAdjustmentToGrid,
  applyGalleryFilterToGrid,
} from '../utils/colorFilters';
import { StudioSlider } from './StudioSlider';

interface FiltersAdjustmentPanelProps {
  currentLayer: Layer;
  primaryColor: string;
  onApplyDirectAdjustment: (cfg: LayerAdjustmentConfig, intensity01?: number) => void;
  onCreateAdjustmentLayer: (cfg: LayerAdjustmentConfig, name?: string) => void;
  onUpdateAdjustmentLayer: (cfg: LayerAdjustmentConfig) => void;
  onBakeAdjustmentLayer: () => void;
  onApplyQuickFilter: (
    filterId: FilterGalleryPresetId,
    intensity01?: number
  ) => void;
  onLivePreviewChange?: (
    preview: {
      layerId: string;
      grid: (string | null)[][];
      beforeAfterSplit?: number | null;
    } | null
  ) => void;
}

export const FiltersAdjustmentPanel: React.FC<FiltersAdjustmentPanelProps> = ({
  currentLayer,
  primaryColor,
  onApplyDirectAdjustment,
  onCreateAdjustmentLayer,
  onUpdateAdjustmentLayer,
  onBakeAdjustmentLayer,
  onApplyQuickFilter,
  onLivePreviewChange,
}) => {
  const isEditingAdjustmentLayer = currentLayer.layerType === 'adjustment';
  const [draftCfg, setDraftCfg] = useState<LayerAdjustmentConfig>(
    currentLayer.adjustment || DEFAULT_ADJUSTMENT_CONFIG
  );
  const [activeGalleryPreset, setActiveGalleryPreset] = useState<FilterGalleryPresetId | null>(null);
  const [intensityPct, setIntensityPct] = useState<number>(100);
  const [compareBeforeAfter, setCompareBeforeAfter] = useState<boolean>(false);
  const [splitPct, setSplitPct] = useState<number>(50);
  const [galleryCategory, setGalleryCategory] = useState<'Todos' | 'Pixel Art' | 'Arcade' | 'Estilizado' | 'Color'>('Todos');

  useEffect(() => {
    if (currentLayer.layerType === 'adjustment' && currentLayer.adjustment) {
      setDraftCfg(currentLayer.adjustment);
    }
  }, [currentLayer.id, currentLayer.layerType, currentLayer.adjustment]);

  const hasAdjustmentChanges =
    draftCfg.hue !== 0 ||
    draftCfg.saturation !== 0 ||
    draftCfg.brightness !== 0 ||
    draftCfg.contrast !== 0 ||
    draftCfg.posterize >= 2 ||
    draftCfg.tintAmount > 0 ||
    draftCfg.invert ||
    draftCfg.grayscale ||
    draftCfg.sepia;

  const hasPendingPreview = !isEditingAdjustmentLayer && (Boolean(activeGalleryPreset) || hasAdjustmentChanges);

  const previewGrid = useMemo(() => {
    if (isEditingAdjustmentLayer || !hasPendingPreview) return null;
    const strength = Math.max(0, Math.min(1, intensityPct / 100));
    if (activeGalleryPreset) {
      const filtered = applyGalleryFilterToGrid(
        currentLayer.pixels,
        activeGalleryPreset,
        strength,
        primaryColor
      );
      return hasAdjustmentChanges ? applyAdjustmentToGrid(filtered, draftCfg, strength) : filtered;
    }
    return applyAdjustmentToGrid(currentLayer.pixels, draftCfg, strength);
  }, [
    isEditingAdjustmentLayer,
    hasPendingPreview,
    activeGalleryPreset,
    currentLayer.pixels,
    draftCfg,
    intensityPct,
    primaryColor,
    hasAdjustmentChanges,
  ]);

  useEffect(() => {
    if (!onLivePreviewChange) return;
    if (previewGrid) {
      onLivePreviewChange({
        layerId: currentLayer.id,
        grid: previewGrid,
        beforeAfterSplit: compareBeforeAfter ? splitPct / 100 : null,
      });
    } else {
      onLivePreviewChange(null);
    }
  }, [previewGrid, compareBeforeAfter, splitPct, currentLayer.id, onLivePreviewChange]);

  // Clear preview if component unmounts
  useEffect(() => {
    return () => {
      onLivePreviewChange?.(null);
    };
  }, [onLivePreviewChange]);

  const updateField = <K extends keyof LayerAdjustmentConfig>(
    key: K,
    value: LayerAdjustmentConfig[K]
  ) => {
    const next = { ...draftCfg, [key]: value };
    setDraftCfg(next);
    if (isEditingAdjustmentLayer) {
      onUpdateAdjustmentLayer(next);
    }
  };

  const resetAll = () => {
    setDraftCfg(DEFAULT_ADJUSTMENT_CONFIG);
    setActiveGalleryPreset(null);
    setIntensityPct(100);
    setCompareBeforeAfter(false);
    onLivePreviewChange?.(null);
    if (isEditingAdjustmentLayer) {
      onUpdateAdjustmentLayer(DEFAULT_ADJUSTMENT_CONFIG);
    }
  };

  const handleApplyPending = () => {
    const strength = Math.max(0, Math.min(1, intensityPct / 100));
    if (activeGalleryPreset && !hasAdjustmentChanges) {
      onApplyQuickFilter(activeGalleryPreset, strength);
    } else if (activeGalleryPreset && hasAdjustmentChanges) {
      // Apply preset + color adjustments sequentially cleanly
      onApplyQuickFilter(activeGalleryPreset, strength);
      onApplyDirectAdjustment(draftCfg, strength);
    } else if (hasAdjustmentChanges) {
      onApplyDirectAdjustment(draftCfg, strength);
    }
    setActiveGalleryPreset(null);
    setDraftCfg(DEFAULT_ADJUSTMENT_CONFIG);
    onLivePreviewChange?.(null);
  };

  const visiblePresets = useMemo(
    () =>
      galleryCategory === 'Todos'
        ? FILTER_GALLERY_PRESETS
        : FILTER_GALLERY_PRESETS.filter((p) => p.category === galleryCategory),
    [galleryCategory]
  );

  return (
    <div className="flex flex-col gap-2.5 text-xs">
      {/* Context Banner */}
      <div
        className="p-2 rounded-xl border flex items-center justify-between gap-2"
        style={{
          backgroundColor: isEditingAdjustmentLayer
            ? 'color-mix(in srgb, var(--studio-accent) 14%, var(--studio-bg-card))'
            : 'var(--studio-bg-card)',
          borderColor: hasPendingPreview || isEditingAdjustmentLayer
            ? 'var(--studio-accent)'
            : 'var(--studio-border)',
        }}
      >
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-mono uppercase font-semibold" style={{ color: 'var(--studio-text-muted)' }}>
            {isEditingAdjustmentLayer
              ? 'Capa de Ajuste en Vivo'
              : hasPendingPreview
              ? 'Previsualización en Vivo en Lienzo'
              : 'Capa Destino'}
          </span>
          <span className="font-bold truncate" style={{ color: isEditingAdjustmentLayer || hasPendingPreview ? 'var(--studio-accent)' : 'var(--studio-text)' }}>
            {currentLayer.name}
          </span>
        </div>

        <button
          type="button"
          onClick={resetAll}
          title="Restaurar original"
          className="px-2 py-1 rounded border text-[10px] font-mono flex items-center gap-1 hover:opacity-85 shrink-0"
          style={{
            borderColor: 'var(--studio-border-strong)',
            color: 'var(--studio-text-muted)',
          }}
        >
          <RotateCcw className="w-3 h-3" />
          <span>Restaurar Original</span>
        </button>
      </div>

      {/* Global Intensity & Before / After Comparison Bar */}
      {!isEditingAdjustmentLayer && (
        <div
          className="p-2 rounded-xl border flex flex-col gap-1.5"
          style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
        >
          <StudioSlider
            variant="panel"
            label="Intensidad del Efecto"
            value={intensityPct}
            min={0}
            max={100}
            step={1}
            unit="%"
            defaultValue={100}
            onChange={setIntensityPct}
          />
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => setCompareBeforeAfter((v) => !v)}
              className="px-2 py-1 rounded border text-[10px] font-semibold flex items-center gap-1 shrink-0"
              style={{
                backgroundColor: compareBeforeAfter ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                color: compareBeforeAfter ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                borderColor: compareBeforeAfter ? 'var(--studio-accent)' : 'var(--studio-border-strong)',
              }}
            >
              <SplitSquareHorizontal className="w-3 h-3" />
              <span>Antes / Después</span>
            </button>
            {compareBeforeAfter && (
              <StudioSlider
                variant="compact"
                showLabel={false}
                value={splitPct}
                min={10}
                max={90}
                step={1}
                unit="%"
                defaultValue={50}
                onChange={setSplitPct}
                className="flex-1"
              />
            )}
          </div>
        </div>
      )}

      {/* Filter Gallery with Live Preview */}
      {!isEditingAdjustmentLayer && (
        <div
          className="p-2.5 rounded-xl border flex flex-col gap-2"
          style={{
            backgroundColor: 'var(--studio-bg-card)',
            borderColor: 'var(--studio-border)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-semibold flex items-center gap-1.5" style={{ color: 'var(--studio-text-muted)' }}>
              <Wand2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Galería de Filtros en Vivo</span>
            </span>
          </div>

          <div className="flex flex-wrap gap-1">
            {(['Todos', 'Pixel Art', 'Arcade', 'Estilizado', 'Color'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setGalleryCategory(cat)}
                className="px-1.5 py-0.5 rounded border text-[9px] font-semibold"
                style={{
                  backgroundColor: galleryCategory === cat ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                  color: galleryCategory === cat ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                  borderColor: galleryCategory === cat ? 'var(--studio-accent)' : 'var(--studio-border)',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
            {visiblePresets.map((preset) => {
              const selected = activeGalleryPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  disabled={currentLayer.locked}
                  onClick={() => setActiveGalleryPreset(selected ? null : preset.id)}
                  className="p-1.5 rounded-lg border text-left flex flex-col gap-1 transition-all disabled:opacity-40"
                  style={{
                    backgroundColor: selected
                      ? 'color-mix(in srgb, var(--studio-accent) 16%, var(--studio-bg-elevated))'
                      : 'var(--studio-bg-elevated)',
                    borderColor: selected ? 'var(--studio-accent)' : 'var(--studio-border)',
                    color: 'var(--studio-text)',
                  }}
                  title={preset.description}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold truncate">{preset.name}</span>
                    <div className="flex -space-x-0.5 shrink-0">
                      {preset.swatch.map((s, idx) => (
                        <span
                          key={idx}
                          className="w-2.5 h-2.5 rounded-full border border-black/60"
                          style={{ backgroundColor: s }}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-[9px] leading-tight line-clamp-1" style={{ color: 'var(--studio-text-muted)' }}>
                    {preset.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sliders Section */}
      <div
        className="p-2.5 rounded-xl border flex flex-col gap-2"
        style={{
          backgroundColor: 'var(--studio-bg-card)',
          borderColor: 'var(--studio-border)',
        }}
      >
        <span className="text-[10px] font-mono uppercase font-semibold flex items-center gap-1.5" style={{ color: 'var(--studio-text-muted)' }}>
          <SlidersHorizontal className="w-3.5 h-3.5" style={{ color: 'var(--studio-accent)' }} />
          <span>Ajustes de Color, Tono y Luz</span>
        </span>

        {/* Hue */}
        <StudioSlider
          variant="panel"
          label="Tono (Hue)"
          value={draftCfg.hue}
          min={-180}
          max={180}
          step={1}
          unit="°"
          defaultValue={0}
          formatValue={(v) => (v > 0 ? `+${Math.round(v)}` : String(Math.round(v)))}
          onChange={(v) => updateField('hue', v)}
        />

        {/* Saturation */}
        <StudioSlider
          variant="panel"
          label="Saturación"
          value={draftCfg.saturation}
          min={-100}
          max={100}
          step={1}
          unit="%"
          defaultValue={0}
          formatValue={(v) => (v > 0 ? `+${Math.round(v)}` : String(Math.round(v)))}
          onChange={(v) => updateField('saturation', v)}
        />

        {/* Brightness */}
        <StudioSlider
          variant="panel"
          label="Brillo"
          value={draftCfg.brightness}
          min={-100}
          max={100}
          step={1}
          unit="%"
          defaultValue={0}
          formatValue={(v) => (v > 0 ? `+${Math.round(v)}` : String(Math.round(v)))}
          onChange={(v) => updateField('brightness', v)}
        />

        {/* Contrast */}
        <StudioSlider
          variant="panel"
          label="Contraste"
          value={draftCfg.contrast}
          min={-100}
          max={100}
          step={1}
          unit="%"
          defaultValue={0}
          formatValue={(v) => (v > 0 ? `+${Math.round(v)}` : String(Math.round(v)))}
          onChange={(v) => updateField('contrast', v)}
        />

        {/* Posterize */}
        <StudioSlider
          variant="panel"
          label="Posterizar (Niveles)"
          value={draftCfg.posterize}
          min={0}
          max={12}
          step={1}
          defaultValue={0}
          formatValue={(v) => (v >= 2 ? `${Math.round(v)} niv.` : 'Off')}
          onChange={(v) => updateField('posterize', v === 1 ? 2 : v)}
        />

        {/* Tint */}
        <div className="flex flex-col gap-1 pt-1 border-t" style={{ borderColor: 'var(--studio-border)' }}>
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="flex items-center gap-1.5">
              <Droplets className="w-3 h-3 text-sky-400" />
              <span>Color de Tinte</span>
            </span>
            <input
              type="color"
              value={draftCfg.tintColor}
              onChange={(e) => updateField('tintColor', e.target.value)}
              className="w-5 h-5 rounded border border-slate-600 cursor-pointer"
            />
          </div>
          <StudioSlider
            variant="panel"
            label="Intensidad Tinte"
            value={draftCfg.tintAmount}
            min={0}
            max={100}
            step={1}
            unit="%"
            defaultValue={0}
            accentColor="#38bdf8"
            onChange={(v) => updateField('tintAmount', v)}
          />
        </div>

        {/* Flags */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {[
            { key: 'grayscale' as const, label: 'Grises' },
            { key: 'sepia' as const, label: 'Sepia' },
            { key: 'invert' as const, label: 'Invertir' },
          ].map((flag) => {
            const active = draftCfg[flag.key];
            return (
              <button
                key={flag.key}
                type="button"
                onClick={() => updateField(flag.key, !active)}
                className="py-1 rounded-lg border text-[11px] font-semibold transition-colors"
                style={{
                  backgroundColor: active ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                  color: active ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                  borderColor: active ? 'var(--studio-accent)' : 'var(--studio-border)',
                }}
              >
                {flag.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Explicit Apply / Cancel / Adjustment Layer Bar */}
      {isEditingAdjustmentLayer ? (
        <button
          type="button"
          onClick={onBakeAdjustmentLayer}
          className="w-full py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
          style={{
            backgroundColor: 'var(--studio-accent)',
            color: 'var(--studio-accent-text)',
          }}
        >
          <Check className="w-3.5 h-3.5" />
          <span>Fusionar Ajuste en Capas Inferiores</span>
        </button>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              disabled={!hasPendingPreview}
              onClick={resetAll}
              className="py-2 px-2 rounded-lg font-semibold text-[11px] border flex items-center justify-center gap-1 disabled:opacity-40"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            >
              <X className="w-3.5 h-3.5 text-rose-400" />
              <span>Cancelar</span>
            </button>

            <button
              type="button"
              disabled={!hasPendingPreview || currentLayer.locked}
              onClick={handleApplyPending}
              className="py-2 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 disabled:opacity-40"
              style={{
                backgroundColor: 'var(--studio-accent)',
                color: 'var(--studio-accent-text)',
              }}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Aplicar</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              onCreateAdjustmentLayer(
                draftCfg,
                `Ajuste Color (${draftCfg.hue >= 0 ? `+${draftCfg.hue}` : draftCfg.hue}°)`
              )
            }
            className="w-full py-1.5 px-2 rounded-lg font-semibold text-[11px] border flex items-center justify-center gap-1.5 hover:opacity-90"
            style={{
              backgroundColor: 'var(--studio-bg-card)',
              borderColor: 'var(--studio-border-strong)',
              color: 'var(--studio-text)',
            }}
          >
            <Layers className="w-3.5 h-3.5" style={{ color: 'var(--studio-accent)' }} />
            <span>Crear Capa de Ajuste No Destructiva</span>
          </button>
        </div>
      )}
    </div>
  );
};
