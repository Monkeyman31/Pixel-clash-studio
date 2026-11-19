import React, { useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Grid,
  PenTool,
  RotateCcw,
  RotateCw,
  Sparkle,
  SunMoon,
  Trash2,
  Wind,
} from 'lucide-react';
import {
  BrushSettings,
  BrushShape,
  BrushTextureType,
  DitherConfig,
  DitherPatternType,
} from '../types';
import { computeDynamicBrushParams, DEFAULT_DITHER_CONFIG } from '../utils/pixelMath';
import { computeUniversalDitherPixel, evaluateBrushTextureFactor } from '../utils/toolEngines';
import { CustomBrushPreset } from '../utils/customBrushStorage';
import { StudioSlider } from './StudioSlider';

export const DEFAULT_BRUSH_SETTINGS: BrushSettings = {
  size: 1,
  shape: 'square',
  spacing: 1,
  hardness: 1,
  opacity: 1,
  flow: 1,
  texture: 'none',
  textureStrength: 50,
  airbrushMode: false,
  smearEnabled: false,
  smearStrength: 65,
  celShadeEnabled: false,
  celShadeMode: 'darken',
  celShadeIntensity: 24,
  penPressureEnabled: true,
  pressureAffectsSize: true,
  pressureAffectsOpacity: false,
  pressureMinSize: 1,
  pressureCurve: 'linear',
  taperEnds: false,
  jitterPosition: 0,
  pixelPerfect: true,
  stabilizer: 0,
};

export const BRUSH_PRESETS: {
  id: string;
  name: string;
  desc: string;
  settings: Partial<BrushSettings>;
  enableDither?: boolean;
}[] = [
  {
    id: 'pixel_fine',
    name: 'Pixel Fino 1px',
    desc: 'Contorno preciso sin esquinas dobles',
    settings: {
      size: 1,
      shape: 'square',
      spacing: 1,
      hardness: 1,
      opacity: 1,
      flow: 1,
      texture: 'none',
      airbrushMode: false,
      smearEnabled: false,
      celShadeEnabled: false,
      pixelPerfect: true,
      taperEnds: false,
      jitterPosition: 0,
      stabilizer: 0,
    },
    enableDither: false,
  },
  {
    id: 'stylus_pen',
    name: 'Pluma Presión',
    desc: 'Varía finura según presión del lápiz',
    settings: {
      size: 4,
      shape: 'circle',
      spacing: 1,
      hardness: 1,
      opacity: 1,
      flow: 1,
      texture: 'none',
      smearEnabled: false,
      celShadeEnabled: false,
      penPressureEnabled: true,
      pressureAffectsSize: true,
      pressureAffectsOpacity: true,
      pressureMinSize: 1,
      pressureCurve: 'soft',
      taperEnds: true,
      jitterPosition: 0,
      pixelPerfect: false,
      stabilizer: 2,
    },
    enableDither: false,
  },
  {
    id: 'airbrush_soft',
    name: 'Aerógrafo',
    desc: 'Rociado suave con flujo acumulativo',
    settings: {
      size: 6,
      shape: 'spray',
      spacing: 1,
      hardness: 0.4,
      opacity: 0.65,
      flow: 0.45,
      airbrushMode: true,
      texture: 'noise',
      textureStrength: 45,
      smearEnabled: false,
      celShadeEnabled: false,
      jitterPosition: 1,
      pixelPerfect: false,
    },
  },
  {
    id: 'chisel_ink',
    name: 'Cincel Arcade',
    desc: 'Punta diagonal caligráfica tipo SNK',
    settings: {
      size: 4,
      shape: 'slash_right',
      spacing: 1,
      hardness: 1,
      opacity: 1,
      flow: 1,
      smearEnabled: false,
      celShadeEnabled: false,
      taperEnds: true,
      jitterPosition: 0,
      pixelPerfect: false,
      stabilizer: 1,
    },
    enableDither: false,
  },
  {
    id: 'cel_shade_pro',
    name: 'Cel Shading',
    desc: 'Sombra/Luz arcade sobre píxeles',
    settings: {
      size: 3,
      shape: 'circle',
      spacing: 1,
      hardness: 0.9,
      opacity: 1,
      flow: 1,
      smearEnabled: false,
      celShadeEnabled: true,
      celShadeMode: 'darken',
      celShadeIntensity: 24,
      pixelPerfect: false,
    },
  },
  {
    id: 'smear_fx',
    name: 'Smear / Motion',
    desc: 'Barrido direccional para impactos',
    settings: {
      size: 3,
      shape: 'circle',
      spacing: 1,
      hardness: 1,
      opacity: 1,
      flow: 1,
      smearEnabled: true,
      smearStrength: 75,
      celShadeEnabled: false,
      pixelPerfect: false,
    },
  },
  {
    id: 'dither_retro',
    name: 'Dither Retro',
    desc: 'Tramado Bayer 4×4 universal',
    settings: {
      size: 4,
      shape: 'circle',
      spacing: 1,
      hardness: 1,
      opacity: 1,
      flow: 1,
      smearEnabled: false,
      celShadeEnabled: false,
      pixelPerfect: false,
    },
    enableDither: true,
  },
  {
    id: 'stipple_dots',
    name: 'Punteado',
    desc: 'Trazo espaciado para costuras y FX',
    settings: {
      size: 2,
      shape: 'diamond',
      spacing: 3,
      hardness: 1,
      opacity: 1,
      flow: 1,
      smearEnabled: false,
      celShadeEnabled: false,
      jitterPosition: 0,
      taperEnds: false,
      pixelPerfect: false,
    },
  },
];

const SHAPE_OPTIONS: { id: BrushShape; label: string; glyph: string }[] = [
  { id: 'square', label: 'Cuadrado', glyph: '■' },
  { id: 'circle', label: 'Redondo', glyph: '●' },
  { id: 'diamond', label: 'Rombo', glyph: '◆' },
  { id: 'slash_right', label: 'Cincel /', glyph: '╱' },
  { id: 'slash_left', label: 'Cincel \\', glyph: '╲' },
  { id: 'spray', label: 'Aerógrafo', glyph: '░' },
];

const TEXTURE_OPTIONS: { id: BrushTextureType; label: string }[] = [
  { id: 'none', label: 'Ninguna' },
  { id: 'noise', label: 'Ruido' },
  { id: 'paper', label: 'Papel' },
  { id: 'canvas', label: 'Lienzo' },
  { id: 'dots', label: 'Puntos' },
  { id: 'crosshatch', label: 'Trama' },
];

type SectionKey =
  | 'forma'
  | 'tamano'
  | 'opacidad'
  | 'flujo'
  | 'estabilizacion'
  | 'textura'
  | 'smear'
  | 'celshading'
  | 'dithering'
  | 'presion';

interface BrushSettingsPanelProps {
  brushSettings: BrushSettings;
  onChangeBrushSettings: (next: BrushSettings) => void;
  primaryColor: string;
  secondaryColor?: string;
  ditherConfig?: DitherConfig;
  onChangeDitherConfig?: (next: DitherConfig) => void;
  livePressure?: number;
  livePointerType?: string;
  customBrushes?: CustomBrushPreset[];
  onDeleteCustomBrush?: (id: string) => void;
  canvasWidth?: number;
  canvasHeight?: number;
}

export const BrushSettingsPanel: React.FC<BrushSettingsPanelProps> = ({
  brushSettings,
  onChangeBrushSettings,
  primaryColor,
  secondaryColor = '#0f172a',
  ditherConfig = DEFAULT_DITHER_CONFIG,
  onChangeDitherConfig,
  livePressure = 1,
  livePointerType = 'mouse',
  customBrushes = [],
  onDeleteCustomBrush,
  canvasWidth = 48,
  canvasHeight = 48,
}) => {
  const scratchCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isTestDrawing, setIsTestDrawing] = useState<boolean>(false);
  const [padPressure, setPadPressure] = useState<number>(livePressure);
  const [padPointerType, setPadPointerType] = useState<string>(livePointerType);
  const lastPadPtRef = useRef<{ x: number; y: number } | null>(null);
  const strokeCountRef = useRef<number>(0);

  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    forma: true,
    tamano: true,
    opacidad: true,
    flujo: false,
    estabilizacion: false,
    textura: false,
    smear: Boolean(brushSettings.smearEnabled),
    celshading: Boolean(brushSettings.celShadeEnabled),
    dithering: true,
    presion: false,
  });

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const effDither: DitherConfig = {
    ...DEFAULT_DITHER_CONFIG,
    scale: 1,
    contrast: 50,
    randomness: 0,
    blendMode: 'replace',
    ...ditherConfig,
  };

  const update = (patch: Partial<BrushSettings>) => {
    onChangeBrushSettings({ ...brushSettings, ...patch });
  };

  const updateDither = (patch: Partial<DitherConfig>) => {
    onChangeDitherConfig?.({ ...effDither, ...patch });
  };

  const applyPreset = (preset: (typeof BRUSH_PRESETS)[number]) => {
    onChangeBrushSettings({ ...brushSettings, ...preset.settings });
    if (typeof preset.enableDither === 'boolean' && onChangeDitherConfig) {
      onChangeDitherConfig({ ...effDither, enabled: preset.enableDither });
    }
  };

  const clearScratchpad = () => {
    const canvas = scratchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const paintPadPoint = (e: React.PointerEvent<HTMLCanvasElement>, isStart: boolean) => {
    const canvas = scratchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const px = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width);
    const py = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height);

    const rawP = e.pointerType === 'pen' ? Math.max(0.05, e.pressure || 0.5) : 1;
    setPadPressure(rawP);
    setPadPointerType(e.pointerType);

    strokeCountRef.current = isStart ? 1 : strokeCountRef.current + 1;
    const { effectiveSize, effectiveOpacity } = computeDynamicBrushParams(
      brushSettings,
      rawP,
      strokeCountRef.current
    );
    const flowMul = brushSettings.flow ?? 1;

    const drawStamp = (cx: number, cy: number) => {
      // Scale large brush stamps inside the compact test scratchpad so 128-256px stays fluid
      const s = Math.max(1, Math.min(40, effectiveSize));
      const half = Math.floor(s / 2);

      const jx =
        brushSettings.jitterPosition > 0
          ? Math.round((Math.random() - 0.5) * 2 * brushSettings.jitterPosition)
          : 0;
      const jy =
        brushSettings.jitterPosition > 0
          ? Math.round((Math.random() - 0.5) * 2 * brushSettings.jitterPosition)
          : 0;

      for (let dy = -half; dy < -half + s; dy++) {
        for (let dx = -half; dx < -half + s; dx++) {
          const dist = Math.hypot(dx, dy);
          if (brushSettings.shape === 'circle' && dist > s / 2 + 0.2) continue;
          if (brushSettings.shape === 'diamond' && Math.abs(dx) + Math.abs(dy) > s / 2 + 0.25) continue;
          if (brushSettings.shape === 'slash_right' && Math.abs(dx + dy) > Math.max(0.7, s * 0.35)) continue;
          if (brushSettings.shape === 'slash_left' && Math.abs(dx - dy) > Math.max(0.7, s * 0.35)) continue;
          if ((brushSettings.shape === 'spray' || brushSettings.airbrushMode) && Math.random() > 0.42) continue;

          const tx = cx + dx + jx;
          const ty = cy + dy + jy;
          const texMul = evaluateBrushTextureFactor(
            tx,
            ty,
            brushSettings.texture,
            brushSettings.textureStrength ?? 50
          );

          let drawCol: string | null = primaryColor;
          if (effDither.enabled) {
            drawCol = computeUniversalDitherPixel(
              tx,
              ty,
              effDither,
              primaryColor,
              secondaryColor,
              null,
              1
            );
          }
          if (!drawCol) continue;

          ctx.fillStyle = drawCol;
          ctx.globalAlpha = Math.max(0.05, Math.min(1, effectiveOpacity * flowMul * texMul));
          ctx.fillRect(tx, ty, 1, 1);
        }
      }
      ctx.globalAlpha = 1;
    };

    if (isStart || !lastPadPtRef.current) {
      drawStamp(px, py);
    } else {
      const x0 = lastPadPtRef.current.x;
      const y0 = lastPadPtRef.current.y;
      const steps = Math.max(1, Math.hypot(px - x0, py - y0));
      const stepSpace = Math.max(1, brushSettings.spacing);
      for (let i = 0; i <= steps; i += stepSpace) {
        const t = i / steps;
        drawStamp(Math.round(x0 + (px - x0) * t), Math.round(y0 + (py - y0) * t));
      }
    }
    lastPadPtRef.current = { x: px, y: py };
  };

  const renderSectionHeader = (
    key: SectionKey,
    title: string,
    rightBadge?: React.ReactNode
  ) => {
    const isOpen = openSections[key];
    return (
      <button
        type="button"
        onClick={() => toggleSection(key)}
        className="w-full flex items-center justify-between py-1 px-1.5 rounded-md text-left hover:bg-white/5 transition-colors"
        style={{ color: 'var(--studio-text)' }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-75" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-75" />
          )}
          <span className="text-[11px] font-semibold tracking-tight truncate">{title}</span>
        </div>
        {rightBadge}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-2 text-xs">
      {/* 1. Presets rápidos */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span style={{ color: 'var(--studio-text-muted)' }}>Panel Pinceles / Lápiz</span>
          <button
            type="button"
            onClick={() => {
              onChangeBrushSettings(DEFAULT_BRUSH_SETTINGS);
              onChangeDitherConfig?.({ ...DEFAULT_DITHER_CONFIG, enabled: false });
            }}
            className="text-[10px] hover:underline flex items-center gap-1 whitespace-nowrap"
            style={{ color: 'var(--studio-accent)' }}
            title="Restaurar configuración predeterminada"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Resetear</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1">
          {BRUSH_PRESETS.map((preset) => {
            const isMatch =
              brushSettings.size === (preset.settings.size ?? brushSettings.size) &&
              brushSettings.shape === (preset.settings.shape ?? brushSettings.shape) &&
              Boolean(brushSettings.smearEnabled) === Boolean(preset.settings.smearEnabled) &&
              Boolean(brushSettings.celShadeEnabled) === Boolean(preset.settings.celShadeEnabled) &&
              (preset.enableDither === undefined || Boolean(effDither.enabled) === preset.enableDither);
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                title={preset.desc}
                className="px-2 py-1 rounded-md border text-left transition-colors"
                style={{
                  backgroundColor: isMatch ? 'var(--studio-accent)' : 'var(--studio-bg-card)',
                  borderColor: isMatch ? 'var(--studio-accent)' : 'var(--studio-border)',
                  color: isMatch ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                }}
              >
                <div className="text-[10px] font-semibold truncate">{preset.name}</div>
                <div className="text-[9px] opacity-75 truncate">{preset.desc}</div>
              </button>
            );
          })}
        </div>

        {customBrushes.length > 0 && (
          <div className="mt-1 flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase tracking-wider opacity-70">
              Pinceles Importados ({customBrushes.length})
            </span>
            <div className="grid grid-cols-2 gap-1">
              {customBrushes.map((cb) => (
                <div
                  key={cb.id}
                  className="px-1.5 py-1 rounded-md border flex items-center gap-1.5"
                  style={{
                    backgroundColor: 'var(--studio-bg-card)',
                    borderColor: 'var(--studio-border)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => applyPreset(cb)}
                    className="flex items-center gap-1.5 min-w-0 flex-1 text-left cursor-pointer"
                    title={cb.desc}
                  >
                    {cb.previewDataUrl && (
                      <img
                        src={cb.previewDataUrl}
                        alt={cb.name}
                        className="w-5 h-5 rounded border object-contain pixel-canvas shrink-0 canvas-checkerboard"
                        style={{ borderColor: 'var(--studio-border-strong)' }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-semibold truncate">{cb.name}</div>
                      <div className="text-[9px] opacity-70 truncate">{cb.desc}</div>
                    </div>
                  </button>
                  {onDeleteCustomBrush && (
                    <button
                      type="button"
                      onClick={() => onDeleteCustomBrush(cb.id)}
                      title="Eliminar pincel importado"
                      className="p-0.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ▼ Forma */}
      <div className="border-t pt-1" style={{ borderColor: 'var(--studio-border)' }}>
        {renderSectionHeader(
          'forma',
          'Forma',
          <span className="text-[10px] font-mono opacity-75">
            {SHAPE_OPTIONS.find((s) => s.id === brushSettings.shape)?.label}
          </span>
        )}
        {openSections.forma && (
          <div className="mt-1.5 flex flex-col gap-1.5 px-1">
            <div className="grid grid-cols-3 gap-1">
              {SHAPE_OPTIONS.map((opt) => {
                const active = brushSettings.shape === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      update({
                        shape: opt.id,
                        airbrushMode: opt.id === 'spray' ? true : brushSettings.airbrushMode,
                      })
                    }
                    className="px-1.5 py-1 rounded border text-[10px] font-mono flex items-center justify-center gap-1 transition-colors whitespace-nowrap"
                    style={{
                      backgroundColor: active ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                      borderColor: active ? 'var(--studio-accent)' : 'var(--studio-border)',
                      color: active ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                      fontWeight: active ? 700 : 500,
                    }}
                  >
                    <span className="text-[11px] leading-none">{opt.glyph}</span>
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
            <label className="flex items-center justify-between text-[10px] cursor-pointer px-1">
              <span style={{ color: 'var(--studio-text-muted)' }}>Modo Aerógrafo continuo</span>
              <input
                type="checkbox"
                checked={Boolean(brushSettings.airbrushMode)}
                onChange={(e) => update({ airbrushMode: e.target.checked })}
                style={{ accentColor: 'var(--studio-accent)' }}
              />
            </label>
          </div>
        )}
      </div>

      {/* ▼ Tamaño */}
      <div className="border-t pt-1" style={{ borderColor: 'var(--studio-border)' }}>
        {renderSectionHeader(
          'tamano',
          'Tamaño',
          <span className="text-[10px] font-mono font-bold tabular-nums" style={{ color: 'var(--studio-accent)' }}>
            {brushSettings.size} px
          </span>
        )}
        {openSections.tamano && (
          <div className="mt-1.5 px-1 flex flex-col gap-1.5">
            <StudioSlider
              variant="panel"
              label="Tamaño de punta"
              value={brushSettings.size}
              min={1}
              max={Math.max(256, Math.ceil(Math.max(canvasWidth, canvasHeight) * 1.25), brushSettings.size)}
              step={1}
              unit=" px"
              defaultValue={1}
              allowManualOverflow
              hardMax={2048}
              onChange={(nextSize) =>
                update({
                  size: nextSize,
                  pressureMinSize: Math.min(brushSettings.pressureMinSize, nextSize),
                })
              }
            />
            <div className="flex flex-wrap gap-1">
              {[1, 2, 4, 8, 16, 32, 64, 128, 256].map((presetPx) => {
                const isSel = brushSettings.size === presetPx;
                return (
                  <button
                    key={presetPx}
                    type="button"
                    onClick={() =>
                      update({
                        size: presetPx,
                        pressureMinSize: Math.min(brushSettings.pressureMinSize, presetPx),
                      })
                    }
                    className="px-1.5 py-0.5 rounded border text-[9px] font-mono tabular-nums transition-colors"
                    style={{
                      backgroundColor: isSel ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                      borderColor: isSel ? 'var(--studio-accent)' : 'var(--studio-border)',
                      color: isSel ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                    }}
                  >
                    {presetPx}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ▼ Opacidad */}
      <div className="border-t pt-1" style={{ borderColor: 'var(--studio-border)' }}>
        {renderSectionHeader(
          'opacidad',
          'Opacidad y Dureza',
          <span className="text-[10px] font-mono tabular-nums opacity-85">
            {Math.round(brushSettings.opacity * 100)}%
          </span>
        )}
        {openSections.opacidad && (
          <div className="mt-1.5 grid grid-cols-2 gap-2.5 px-1">
            <StudioSlider
              variant="panel"
              label="Opacidad"
              value={Math.round(brushSettings.opacity * 100)}
              min={1}
              max={100}
              step={1}
              unit="%"
              defaultValue={100}
              onChange={(v) => update({ opacity: v / 100 })}
            />
            <StudioSlider
              variant="panel"
              label="Dureza"
              value={Math.round(brushSettings.hardness * 100)}
              min={1}
              max={100}
              step={1}
              unit="%"
              defaultValue={100}
              onChange={(v) => update({ hardness: v / 100 })}
            />
          </div>
        )}
      </div>

      {/* ▼ Flujo */}
      <div className="border-t pt-1" style={{ borderColor: 'var(--studio-border)' }}>
        {renderSectionHeader(
          'flujo',
          'Flujo',
          <span className="text-[10px] font-mono tabular-nums opacity-85">
            {Math.round((brushSettings.flow ?? 1) * 100)}%
          </span>
        )}
        {openSections.flujo && (
          <div className="mt-1.5 flex flex-col gap-1 px-1">
            <StudioSlider
              variant="panel"
              label="Flujo de pintura"
              value={Math.round((brushSettings.flow ?? 1) * 100)}
              min={1}
              max={100}
              step={1}
              unit="%"
              defaultValue={100}
              onChange={(v) => update({ flow: v / 100 })}
            />
            <span className="text-[9px]" style={{ color: 'var(--studio-text-muted)' }}>
              Controla cuánta pintura deposita cada muestra del trazo (ideal para aerógrafo y sombreado suave).
            </span>
          </div>
        )}
      </div>

      {/* ▼ Estabilización */}
      <div className="border-t pt-1" style={{ borderColor: 'var(--studio-border)' }}>
        {renderSectionHeader(
          'estabilizacion',
          'Estabilización',
          <span className="text-[10px] font-mono tabular-nums opacity-80">
            Nv.{brushSettings.stabilizer}
          </span>
        )}
        {openSections.estabilizacion && (
          <div className="mt-1.5 flex flex-col gap-2 px-1">
            <div className="grid grid-cols-2 gap-2.5">
              <StudioSlider
                variant="panel"
                label="Estabilizador"
                value={brushSettings.stabilizer}
                min={0}
                max={10}
                step={1}
                defaultValue={0}
                onChange={(v) => update({ stabilizer: v })}
              />
              <StudioSlider
                variant="panel"
                label="Espaciado"
                value={brushSettings.spacing}
                min={1}
                max={64}
                step={1}
                unit="px"
                defaultValue={1}
                allowManualOverflow
                hardMax={512}
                onChange={(v) => update({ spacing: v })}
              />
            </div>
            <StudioSlider
              variant="panel"
              label="Dispersión (Jitter)"
              value={brushSettings.jitterPosition}
              min={0}
              max={64}
              step={1}
              unit="px"
              defaultValue={0}
              allowManualOverflow
              hardMax={512}
              onChange={(v) => update({ jitterPosition: v })}
            />
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => update({ pixelPerfect: !brushSettings.pixelPerfect })}
                className="py-1 px-2 rounded border text-[10px] flex items-center justify-center gap-1 transition-colors whitespace-nowrap"
                style={{
                  backgroundColor: brushSettings.pixelPerfect ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                  borderColor: brushSettings.pixelPerfect ? 'var(--studio-accent)' : 'var(--studio-border)',
                  color: brushSettings.pixelPerfect ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                }}
              >
                <Sparkle className="w-3 h-3" />
                <span>Pixel-Perfect</span>
              </button>
              <button
                type="button"
                onClick={() => update({ taperEnds: !brushSettings.taperEnds })}
                className="py-1 px-2 rounded border text-[10px] flex items-center justify-center gap-1 transition-colors whitespace-nowrap"
                style={{
                  backgroundColor: brushSettings.taperEnds ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                  borderColor: brushSettings.taperEnds ? 'var(--studio-accent)' : 'var(--studio-border)',
                  color: brushSettings.taperEnds ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                }}
              >
                <Wind className="w-3 h-3" />
                <span>Afinar Puntas</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ▼ Textura */}
      <div className="border-t pt-1" style={{ borderColor: 'var(--studio-border)' }}>
        {renderSectionHeader(
          'textura',
          'Textura',
          <span className="text-[10px] font-mono opacity-80">
            {TEXTURE_OPTIONS.find((t) => t.id === (brushSettings.texture || 'none'))?.label}
          </span>
        )}
        {openSections.textura && (
          <div className="mt-1.5 flex flex-col gap-1.5 px-1 font-mono">
            <div className="grid grid-cols-3 gap-1">
              {TEXTURE_OPTIONS.map((tex) => {
                const active = (brushSettings.texture || 'none') === tex.id;
                return (
                  <button
                    key={tex.id}
                    type="button"
                    onClick={() => update({ texture: tex.id })}
                    className="py-1 rounded border text-[10px] transition-colors whitespace-nowrap"
                    style={{
                      backgroundColor: active ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                      borderColor: active ? 'var(--studio-accent)' : 'var(--studio-border)',
                      color: active ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                    }}
                  >
                    {tex.label}
                  </button>
                );
              })}
            </div>
            {(brushSettings.texture || 'none') !== 'none' && (
              <StudioSlider
                variant="panel"
                label="Intensidad textura"
                value={brushSettings.textureStrength ?? 50}
                min={1}
                max={100}
                step={1}
                unit="%"
                defaultValue={50}
                onChange={(v) => update({ textureStrength: v })}
              />
            )}
          </div>
        )}
      </div>

      {/* ▼ Smear (Integrado en Panel Pinceles) */}
      <div className="border-t pt-1" style={{ borderColor: 'var(--studio-border)' }}>
        {renderSectionHeader(
          'smear',
          'Smear (Barrido)',
          <span
            className="text-[10px] font-mono font-bold"
            style={{ color: brushSettings.smearEnabled ? 'var(--studio-accent)' : 'var(--studio-text-muted)' }}
          >
            {brushSettings.smearEnabled ? 'ON' : 'OFF'}
          </span>
        )}
        {openSections.smear && (
          <div className="mt-1.5 flex flex-col gap-1.5 px-1 font-mono">
            <label className="flex items-center justify-between text-[10px] cursor-pointer">
              <span className="flex items-center gap-1.5">
                <Wind className="w-3 h-3" style={{ color: 'var(--studio-accent)' }} />
                <span>Activar Smear en Pincel [S]</span>
              </span>
              <input
                type="checkbox"
                checked={Boolean(brushSettings.smearEnabled)}
                onChange={(e) =>
                  update({
                    smearEnabled: e.target.checked,
                    celShadeEnabled: e.target.checked ? false : brushSettings.celShadeEnabled,
                  })
                }
                style={{ accentColor: 'var(--studio-accent)' }}
              />
            </label>
            <StudioSlider
              variant="panel"
              label="Fuerza de arrastre"
              value={brushSettings.smearStrength ?? 65}
              min={1}
              max={100}
              step={1}
              unit="%"
              defaultValue={65}
              onChange={(v) => update({ smearStrength: v })}
            />
            <span className="text-[9px]" style={{ color: 'var(--studio-text-muted)' }}>
              Compatible con Dithering universal para estelas de impacto con tramado retro.
            </span>
          </div>
        )}
      </div>

      {/* ▼ Cel Shading (Integrado en Panel Pinceles) */}
      <div className="border-t pt-1" style={{ borderColor: 'var(--studio-border)' }}>
        {renderSectionHeader(
          'celshading',
          'Cel Shading',
          <span
            className="text-[10px] font-mono font-bold"
            style={{ color: brushSettings.celShadeEnabled ? 'var(--studio-accent)' : 'var(--studio-text-muted)' }}
          >
            {brushSettings.celShadeEnabled ? 'ON' : 'OFF'}
          </span>
        )}
        {openSections.celshading && (
          <div className="mt-1.5 flex flex-col gap-1.5 px-1 font-mono">
            <label className="flex items-center justify-between text-[10px] cursor-pointer">
              <span className="flex items-center gap-1.5">
                <SunMoon className="w-3 h-3" style={{ color: 'var(--studio-accent)' }} />
                <span>Activar Cel Shading [J]</span>
              </span>
              <input
                type="checkbox"
                checked={Boolean(brushSettings.celShadeEnabled)}
                onChange={(e) =>
                  update({
                    celShadeEnabled: e.target.checked,
                    smearEnabled: e.target.checked ? false : brushSettings.smearEnabled,
                  })
                }
                style={{ accentColor: 'var(--studio-accent)' }}
              />
            </label>
            <div className="grid grid-cols-2 gap-1">
              {(
                [
                  ['darken', 'Sombra'],
                  ['lighten', 'Luz (o Shift)'],
                ] as const
              ).map(([mode, lbl]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => update({ celShadeMode: mode })}
                  className="py-1 rounded border text-[10px] whitespace-nowrap"
                  style={{
                    backgroundColor:
                      (brushSettings.celShadeMode || 'darken') === mode
                        ? 'var(--studio-accent)'
                        : 'var(--studio-bg-elevated)',
                    borderColor:
                      (brushSettings.celShadeMode || 'darken') === mode
                        ? 'var(--studio-accent)'
                        : 'var(--studio-border)',
                    color:
                      (brushSettings.celShadeMode || 'darken') === mode
                        ? 'var(--studio-accent-text)'
                        : 'var(--studio-text)',
                  }}
                >
                  {lbl}
                </button>
              ))}
            </div>
            <StudioSlider
              variant="panel"
              label="Intensidad"
              value={brushSettings.celShadeIntensity ?? 24}
              min={1}
              max={60}
              step={1}
              unit="%"
              defaultValue={24}
              onChange={(v) => update({ celShadeIntensity: v })}
            />
          </div>
        )}
      </div>

      {/* ▼ Dithering (Modificador Universal para Lápiz, Pincel, Aerógrafo, Smear y Cel Shade) */}
      <div className="border-t pt-1" style={{ borderColor: 'var(--studio-border)' }}>
        {renderSectionHeader(
          'dithering',
          'Dithering Universal',
          <span
            className="text-[10px] font-mono font-bold"
            style={{ color: effDither.enabled ? 'var(--studio-accent)' : 'var(--studio-text-muted)' }}
          >
            {effDither.enabled ? 'ACTIVO' : 'OFF'}
          </span>
        )}
        {openSections.dithering && (
          <div className="mt-1.5 flex flex-col gap-2 px-1 font-mono">
            <label
              className="flex items-center justify-between px-2 py-1.5 rounded-md border cursor-pointer"
              style={{
                backgroundColor: effDither.enabled
                  ? 'color-mix(in srgb, var(--studio-accent) 16%, var(--studio-bg-card))'
                  : 'var(--studio-bg-card)',
                borderColor: effDither.enabled ? 'var(--studio-accent)' : 'var(--studio-border)',
              }}
            >
              <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                <Grid className="w-3.5 h-3.5" style={{ color: 'var(--studio-accent)' }} />
                <span>Activar Dithering [D]</span>
              </span>
              <input
                type="checkbox"
                checked={Boolean(effDither.enabled)}
                onChange={(e) => updateDither({ enabled: e.target.checked })}
                style={{ accentColor: 'var(--studio-accent)' }}
              />
            </label>

            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px]" style={{ color: 'var(--studio-text-muted)' }}>
                  Patrón
                </span>
                <select
                  value={effDither.pattern}
                  onChange={(e) => updateDither({ pattern: e.target.value as DitherPatternType })}
                  className="px-1.5 py-1 rounded border text-[10px]"
                  style={{
                    backgroundColor: 'var(--studio-bg-card)',
                    borderColor: 'var(--studio-border-strong)',
                    color: 'var(--studio-text)',
                  }}
                >
                  <option value="bayer4">Bayer 4×4</option>
                  <option value="checkered">Tablero 2×2</option>
                  <option value="sparse">Disperso</option>
                  <option value="dense">Denso</option>
                  <option value="horizontal">Líneas H</option>
                  <option value="diagonal">Diagonal</option>
                  <option value="custom">Personalizado 4×4</option>
                </select>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px]" style={{ color: 'var(--studio-text-muted)' }}>
                  Mezcla
                </span>
                <select
                  value={effDither.blendMode || 'replace'}
                  onChange={(e) =>
                    updateDither({
                      blendMode: e.target.value as NonNullable<DitherConfig['blendMode']>,
                    })
                  }
                  className="px-1.5 py-1 rounded border text-[10px]"
                  style={{
                    backgroundColor: 'var(--studio-bg-card)',
                    borderColor: 'var(--studio-border-strong)',
                    color: 'var(--studio-text)',
                  }}
                >
                  <option value="replace">Transparente</option>
                  <option value="secondary">Primario + Sec.</option>
                  <option value="mix">Mezcla Suave</option>
                  <option value="overlay">Superponer</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <StudioSlider
                variant="panel"
                label="Densidad"
                value={effDither.density}
                min={1}
                max={100}
                step={1}
                unit="%"
                defaultValue={50}
                onChange={(v) => updateDither({ density: v })}
              />
              <StudioSlider
                variant="panel"
                label="Escala"
                value={effDither.scale ?? 1}
                min={1}
                max={8}
                step={1}
                unit="×"
                defaultValue={1}
                onChange={(v) => updateDither({ scale: v })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <StudioSlider
                variant="panel"
                label="Contraste"
                value={effDither.contrast ?? 50}
                min={0}
                max={100}
                step={1}
                unit="%"
                defaultValue={50}
                onChange={(v) => updateDither({ contrast: v })}
              />
              <StudioSlider
                variant="panel"
                label="Aleatoriedad"
                value={effDither.randomness ?? 0}
                min={0}
                max={100}
                step={1}
                unit="%"
                defaultValue={0}
                onChange={(v) => updateDither({ randomness: v })}
              />
            </div>

            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() =>
                  updateDither({
                    rotation: (((effDither.rotation + 90) % 360) as 0 | 90 | 180 | 270),
                  })
                }
                className="py-1 rounded border text-[10px] flex items-center justify-center gap-1 whitespace-nowrap"
                style={{
                  backgroundColor: 'var(--studio-bg-elevated)',
                  borderColor: 'var(--studio-border)',
                  color: 'var(--studio-text)',
                }}
              >
                <RotateCw className="w-3 h-3" />
                <span>{effDither.rotation}°</span>
              </button>
              <button
                type="button"
                onClick={() => updateDither({ invert: !effDither.invert })}
                className="py-1 rounded border text-[10px] whitespace-nowrap"
                style={{
                  backgroundColor: effDither.invert ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                  borderColor: effDither.invert ? 'var(--studio-accent)' : 'var(--studio-border)',
                  color: effDither.invert ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                }}
              >
                Invertir
              </button>
              <button
                type="button"
                onClick={() => updateDither({ smartLuminance: !effDither.smartLuminance })}
                className="py-1 rounded border text-[10px] whitespace-nowrap"
                style={{
                  backgroundColor: effDither.smartLuminance ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                  borderColor: effDither.smartLuminance ? 'var(--studio-accent)' : 'var(--studio-border)',
                  color: effDither.smartLuminance ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                }}
              >
                Lumin.
              </button>
            </div>

            {effDither.pattern === 'custom' && (
              <div className="flex flex-col gap-1">
                <span className="text-[9px]" style={{ color: 'var(--studio-text-muted)' }}>
                  Matriz personalizada 4×4 (clic para editar)
                </span>
                <div
                  className="p-1.5 rounded-lg border grid grid-cols-4 gap-1 w-24"
                  style={{
                    backgroundColor: 'var(--studio-bg-bar)',
                    borderColor: 'var(--studio-border-strong)',
                  }}
                >
                  {(
                    effDither.customMatrix || [
                      [1, 0, 1, 0],
                      [0, 1, 0, 1],
                      [1, 0, 1, 0],
                      [0, 1, 0, 1],
                    ]
                  ).map((row, ry) =>
                    row.map((val, rx) => (
                      <button
                        key={`${rx}-${ry}`}
                        type="button"
                        onClick={() => {
                          const base = effDither.customMatrix || [
                            [1, 0, 1, 0],
                            [0, 1, 0, 1],
                            [1, 0, 1, 0],
                            [0, 1, 0, 1],
                          ];
                          const next = base.map((r, yi) =>
                            r.map((cell, xi) => (xi === rx && yi === ry ? (cell === 1 ? 0 : 1) : cell))
                          );
                          updateDither({ customMatrix: next });
                        }}
                        className="w-4 h-4 rounded-[2px] border"
                        style={{
                          backgroundColor: val === 1 ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                          borderColor: 'var(--studio-border)',
                        }}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ▼ Presión de Pluma */}
      <div className="border-t pt-1" style={{ borderColor: 'var(--studio-border)' }}>
        {renderSectionHeader(
          'presion',
          'Presión de Pluma',
          <span className="text-[10px] font-mono opacity-80">
            {brushSettings.penPressureEnabled ? 'ON' : 'OFF'}
          </span>
        )}
        {openSections.presion && (
          <div className="mt-1.5 flex flex-col gap-2 px-1 font-mono">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5" style={{ color: 'var(--studio-accent)' }} />
                <span className="text-[10px]">Detección tableta/lápiz</span>
              </div>
              <button
                type="button"
                onClick={() => update({ penPressureEnabled: !brushSettings.penPressureEnabled })}
                className="px-2 py-0.5 rounded border text-[10px] font-bold"
                style={{
                  backgroundColor: brushSettings.penPressureEnabled ? 'var(--studio-accent)' : 'var(--studio-bg-card)',
                  borderColor: brushSettings.penPressureEnabled ? 'var(--studio-accent)' : 'var(--studio-border)',
                  color: brushSettings.penPressureEnabled ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                }}
              >
                {brushSettings.penPressureEnabled ? 'ACTIVA' : 'OFF'}
              </button>
            </div>
            {brushSettings.penPressureEnabled && (
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  <label
                    className="flex items-center gap-1.5 px-2 py-1 rounded border cursor-pointer text-[10px]"
                    style={{
                      backgroundColor: 'var(--studio-bg-card)',
                      borderColor: brushSettings.pressureAffectsSize ? 'var(--studio-accent)' : 'var(--studio-border)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={brushSettings.pressureAffectsSize}
                      onChange={(e) => update({ pressureAffectsSize: e.target.checked })}
                      style={{ accentColor: 'var(--studio-accent)' }}
                    />
                    <span>Tamaño</span>
                  </label>
                  <label
                    className="flex items-center gap-1.5 px-2 py-1 rounded border cursor-pointer text-[10px]"
                    style={{
                      backgroundColor: 'var(--studio-bg-card)',
                      borderColor: brushSettings.pressureAffectsOpacity ? 'var(--studio-accent)' : 'var(--studio-border)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={brushSettings.pressureAffectsOpacity}
                      onChange={(e) => update({ pressureAffectsOpacity: e.target.checked })}
                      style={{ accentColor: 'var(--studio-accent)' }}
                    />
                    <span>Opacidad</span>
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      ['soft', 'Suave'],
                      ['linear', 'Lineal'],
                      ['firm', 'Firme'],
                    ] as const
                  ).map(([curve, lbl]) => (
                    <button
                      key={curve}
                      type="button"
                      onClick={() => update({ pressureCurve: curve })}
                      className="py-1 rounded border text-[10px]"
                      style={{
                        backgroundColor:
                          brushSettings.pressureCurve === curve ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                        borderColor:
                          brushSettings.pressureCurve === curve ? 'var(--studio-accent)' : 'var(--studio-border)',
                        color:
                          brushSettings.pressureCurve === curve ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                      }}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Zona de Prueba en Vivo */}
      <div
        className="flex flex-col gap-1 pt-2 border-t font-mono"
        style={{ borderColor: 'var(--studio-border)' }}
      >
        <div className="flex items-center justify-between text-[10px]">
          <span style={{ color: 'var(--studio-text-muted)' }}>
            Prueba en vivo ({padPointerType === 'pen' ? `Lápiz ${Math.round(padPressure * 100)}%` : 'Ratón'})
          </span>
          <button
            type="button"
            onClick={clearScratchpad}
            className="text-[10px] hover:underline"
            style={{ color: 'var(--studio-accent)' }}
          >
            Limpiar
          </button>
        </div>
        <canvas
          ref={scratchCanvasRef}
          width={140}
          height={44}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setIsTestDrawing(true);
            paintPadPoint(e, true);
          }}
          onPointerMove={(e) => {
            if (!isTestDrawing) return;
            paintPadPoint(e, false);
          }}
          onPointerUp={() => {
            setIsTestDrawing(false);
            lastPadPtRef.current = null;
          }}
          onPointerLeave={() => {
            setIsTestDrawing(false);
            lastPadPtRef.current = null;
          }}
          className="w-full h-16 rounded-md border pixel-canvas canvas-checkerboard cursor-crosshair touch-none"
          style={{ borderColor: 'var(--studio-border-strong)' }}
        />
      </div>
    </div>
  );
};
