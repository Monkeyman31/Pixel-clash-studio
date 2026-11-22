import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Compass,
  Download,
  Eye,
  Film,
  FolderTree,
  Grid,
  Layers,
  Paintbrush,
  Palette,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Shield,
  Sliders,
  Sparkles,
  SquareDashed,
  Terminal,
  Trash2,
  Wand2,
} from 'lucide-react';
import {
  AiContextualMode,
  AiExternalProfileId,
  BrushSettings,
  Frame,
  KeyframeEasing,
  Layer,
  LayerGroup,
  LayerKeyframe,
  LayerMaskType,
  ReferenceItem,
  ToolType,
  VectorToolConfig,
} from '../types';
import { FIGHTING_GAME_PALETTES } from '../constants/palettes';
import { renderFramePreviewToTargetCanvas } from '../utils/pixelMath';
import { AI_EXTERNAL_PROFILES } from '../utils/projectContextAi';
import { StudioSlider } from './StudioSlider';

// =========================================================
// 1. NAVEGADOR DE LIENZO (NAVIGATOR)
// =========================================================
export const NavigatorPanel: React.FC<{
  currentFrame: Frame;
  currentFrameIndex: number;
  canvasWidth: number;
  canvasHeight: number;
  showGrid: boolean;
  onToggleGrid: () => void;
  showHitboxes: boolean;
  onToggleHitboxes: () => void;
}> = ({
  currentFrame,
  currentFrameIndex,
  canvasWidth,
  canvasHeight,
  showGrid,
  onToggleGrid,
  showHitboxes,
  onToggleHitboxes,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const maxDim = 128;
    const ratio = Math.min(maxDim / Math.max(1, canvasWidth), maxDim / Math.max(1, canvasHeight), 1);
    const targetW = canvasWidth <= maxDim && canvasHeight <= maxDim
      ? canvasWidth
      : Math.max(1, Math.round(canvasWidth * ratio));
    const targetH = canvasWidth <= maxDim && canvasHeight <= maxDim
      ? canvasHeight
      : Math.max(1, Math.round(canvasHeight * ratio));
    renderFramePreviewToTargetCanvas(
      currentFrame,
      canvasWidth,
      canvasHeight,
      c,
      targetW,
      targetH,
      currentFrameIndex
    );
  }, [currentFrame, currentFrameIndex, canvasWidth, canvasHeight]);

  return (
    <div className="p-2.5 flex flex-col gap-2 text-[11px]">
      <div
        className="rounded-lg border p-2 flex items-center justify-center canvas-checkerboard"
        style={{ borderColor: 'var(--studio-border-strong)' }}
      >
        <canvas ref={canvasRef} className="w-32 h-32 object-contain pixel-canvas" />
      </div>
      <div className="flex items-center justify-between font-mono text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>
        <span className="flex items-center gap-1">
          <Compass className="w-3 h-3" style={{ color: 'var(--studio-accent)' }} />
          {canvasWidth}×{canvasHeight}px
        </span>
        <span>F#{currentFrameIndex + 1}</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={onToggleGrid}
          className="px-2 py-1 rounded border text-[10px] font-semibold"
          style={{
            backgroundColor: showGrid ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
            color: showGrid ? 'var(--studio-accent-text)' : 'var(--studio-text)',
            borderColor: 'var(--studio-border-strong)',
          }}
        >
          Cuadrícula {showGrid ? 'ON' : 'OFF'}
        </button>
        <button
          type="button"
          onClick={onToggleHitboxes}
          className="px-2 py-1 rounded border text-[10px] font-semibold"
          style={{
            backgroundColor: showHitboxes ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
            color: showHitboxes ? 'var(--studio-accent-text)' : 'var(--studio-text)',
            borderColor: 'var(--studio-border-strong)',
          }}
        >
          Hitboxes {showHitboxes ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
};

// =========================================================
// 2. VISTA PREVIA ANIMADA (PREVIEW)
// =========================================================
export const LivePreviewPanel: React.FC<{
  frames: Frame[];
  currentFrameIndex: number;
  canvasWidth: number;
  canvasHeight: number;
  fps: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSelectFrame: (idx: number) => void;
  onFloatToCanvas?: () => void;
}> = ({
  frames,
  currentFrameIndex,
  canvasWidth,
  canvasHeight,
  fps,
  isPlaying,
  onTogglePlay,
  onSelectFrame,
  onFloatToCanvas,
}) => {
  const [localPlay, setLocalPlay] = useState(false);
  const [idx, setIdx] = useState(currentFrameIndex);
  const [scale, setScale] = useState<'auto' | 1 | 2 | 3>('auto');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const previewDimensions = useMemo(() => {
    const boxW = 200;
    const boxH = 132;
    const srcW = Math.max(1, canvasWidth);
    const srcH = Math.max(1, canvasHeight);
    const fitScale = Math.min(boxW / srcW, boxH / srcH);
    const effectiveScale =
      scale === 'auto'
        ? fitScale >= 1
          ? Math.max(1, Math.floor(fitScale))
          : fitScale
        : Math.min(scale, fitScale);
    return {
      drawW: Math.max(1, Math.min(boxW, Math.round(srcW * effectiveScale))),
      drawH: Math.max(1, Math.min(boxH, Math.round(srcH * effectiveScale))),
    };
  }, [canvasWidth, canvasHeight, scale]);

  useEffect(() => {
    if (!localPlay || frames.length <= 1) {
      setIdx(currentFrameIndex);
      return;
    }
    const ms = Math.max(40, Math.round(1000 / Math.max(1, fps)));
    const timer = window.setInterval(() => {
      setIdx((p) => (p + 1) % frames.length);
    }, ms);
    return () => window.clearInterval(timer);
  }, [localPlay, frames.length, fps, currentFrameIndex]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const safeIdx = Math.min(frames.length - 1, Math.max(0, idx));
    const frame = frames[safeIdx];
    if (!frame) return;
    renderFramePreviewToTargetCanvas(
      frame,
      canvasWidth,
      canvasHeight,
      c,
      previewDimensions.drawW,
      previewDimensions.drawH,
      safeIdx
    );
  }, [frames, idx, canvasWidth, canvasHeight, previewDimensions.drawW, previewDimensions.drawH]);

  return (
    <div className="p-2.5 flex flex-col gap-2 text-[11px]">
      <div
        className="rounded-lg border h-36 flex items-center justify-center overflow-hidden canvas-checkerboard relative"
        style={{ borderColor: 'var(--studio-border-strong)' }}
      >
        <canvas
          ref={canvasRef}
          className="pixel-canvas block"
          style={{ width: previewDimensions.drawW, height: previewDimensions.drawH }}
        />
        <span
          className="absolute bottom-1 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono"
          style={{ backgroundColor: 'rgba(10,12,18,0.8)', color: '#e2e8f0' }}
        >
          F{idx + 1}/{frames.length} · {fps}FPS
        </span>
      </div>
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => setLocalPlay((v) => !v)}
          className="px-2 py-1 rounded border font-bold text-[10px] flex items-center gap-1"
          style={{
            backgroundColor: localPlay ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
            color: localPlay ? 'var(--studio-accent-text)' : 'var(--studio-text)',
            borderColor: 'var(--studio-border-strong)',
          }}
        >
          {localPlay ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          <span>{localPlay ? 'Pausa Loop' : 'Play Loop'}</span>
        </button>
        <button
          type="button"
          onClick={onTogglePlay}
          className="px-2 py-1 rounded border text-[10px]"
          style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
        >
          {isPlaying ? 'Detener Lienzo' : 'Play Lienzo'}
        </button>
        <button
          type="button"
          onClick={() => setScale((s) => (s === 'auto' ? 1 : s === 1 ? 2 : s === 2 ? 3 : 'auto'))}
          className="px-2 py-1 rounded border font-mono text-[10px]"
          style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
        >
          {scale === 'auto' ? 'Auto' : `${scale}×`}
        </button>
      </div>
      <div className="flex items-center justify-between text-[10px] gap-1">
        <button
          type="button"
          onClick={() => onSelectFrame((currentFrameIndex - 1 + frames.length) % frames.length)}
          className="px-1.5 py-0.5 rounded border flex items-center gap-0.5"
          style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
        >
          <ChevronLeft className="w-3 h-3" /> Ant
        </button>
        {onFloatToCanvas && (
          <button
            type="button"
            onClick={onFloatToCanvas}
            className="px-2 py-0.5 rounded border text-[10px] font-medium hover:opacity-90"
            style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border-strong)' }}
            title="Mostrar Mini Preview flotante sobre el lienzo"
          >
            Flotar en Lienzo
          </button>
        )}
        <button
          type="button"
          onClick={() => onSelectFrame((currentFrameIndex + 1) % frames.length)}
          className="px-1.5 py-0.5 rounded border flex items-center gap-0.5"
          style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
        >
          Sig <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

// =========================================================
// 3. PALETA DE COLORES (PALETTE)
// =========================================================
export const PalettePanel: React.FC<{
  primaryColor: string;
  secondaryColor: string;
  activePaletteColors: string[];
  onSelectPrimaryColor: (hex: string) => void;
  onSelectSecondaryColor: (hex: string) => void;
  onUpdateActivePalette: (colors: string[]) => void;
  onOpenLospecModal?: () => void;
}> = ({
  primaryColor,
  secondaryColor,
  activePaletteColors,
  onSelectPrimaryColor,
  onSelectSecondaryColor,
  onUpdateActivePalette,
  onOpenLospecModal,
}) => {
  const colors = activePaletteColors.length > 0 ? activePaletteColors : FIGHTING_GAME_PALETTES[0].colors;

  return (
    <div className="p-2.5 flex flex-col gap-2 text-[11px]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded border border-white/40" style={{ backgroundColor: primaryColor }} title={`Primario: ${primaryColor}`} />
          <div className="w-4 h-4 rounded border border-white/30" style={{ backgroundColor: secondaryColor }} title={`Secundario: ${secondaryColor}`} />
          <span className="font-mono text-[10px]">{primaryColor.toUpperCase()}</span>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!colors.includes(primaryColor)) {
              onUpdateActivePalette([...colors, primaryColor]);
            }
          }}
          className="px-2 py-0.5 rounded border text-[10px] font-semibold flex items-center gap-1"
          style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
        >
          <Plus className="w-3 h-3" /> Añadir
        </button>
      </div>

      <select
        onChange={(e) => {
          const found = FIGHTING_GAME_PALETTES.find((p) => p.id === e.target.value);
          if (found) onUpdateActivePalette(found.colors);
        }}
        className="px-2 py-1 rounded border text-[10px]"
        style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)', color: 'var(--studio-text)' }}
      >
        <option value="">Cargar preset de paleta arcade...</option>
        {FIGHTING_GAME_PALETTES.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.colors.length} col.)
          </option>
        ))}
      </select>

      <div className="grid grid-cols-8 gap-1">
        {colors.map((hex, i) => (
          <button
            key={`${hex}-${i}`}
            type="button"
            onClick={() => onSelectPrimaryColor(hex)}
            onContextMenu={(e) => {
              e.preventDefault();
              onSelectSecondaryColor(hex);
            }}
            title={`${hex} (Clic izq: primario · Clic der: secundario)`}
            className="h-5 rounded border transition-transform hover:scale-110"
            style={{
              backgroundColor: hex,
              borderColor: hex.toLowerCase() === primaryColor.toLowerCase() ? '#ffffff' : 'rgba(0,0,0,0.4)',
            }}
          />
        ))}
      </div>

      {onOpenLospecModal && (
        <button
          type="button"
          onClick={onOpenLospecModal}
          className="w-full py-1 rounded border text-[10px] font-semibold flex items-center justify-center gap-1"
          style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)', color: 'var(--studio-accent)' }}
        >
          <Palette className="w-3 h-3" /> Explorador Lospec...
        </button>
      )}
    </div>
  );
};

// =========================================================
// 4. BRUSH MANAGER
// =========================================================
const BUILTIN_BRUSH_PRESETS: { id: string; name: string; tag: string; patch: Partial<BrushSettings> }[] = [
  { id: 'px-hard', name: 'Pixel Duro 1px', tag: 'Lineart', patch: { size: 1, shape: 'square', hardness: 1, pixelPerfect: true, opacity: 1, penPressureEnabled: false } },
  { id: 'px-ink', name: 'Tinta Presión Fina', tag: 'Ink', patch: { size: 3, shape: 'circle', hardness: 1, penPressureEnabled: true, pressureAffectsSize: true, pressureMinSize: 1, taperEnds: true } },
  { id: 'px-shade', name: 'Cel-Shade Bloque', tag: 'Shade', patch: { size: 4, shape: 'square', hardness: 0.9, opacity: 0.75, penPressureEnabled: true, pressureAffectsOpacity: true } },
  { id: 'px-spray', name: 'Aerógrafo / Textura', tag: 'FX', patch: { size: 5, shape: 'spray', spacing: 0.35, jitterPosition: 0.4, opacity: 0.65 } },
  { id: 'px-cal', name: 'Caligráfico Arcade', tag: 'Slash', patch: { size: 3, shape: 'slash_right', hardness: 1, pixelPerfect: false, taperEnds: true } },
];

export const BrushManagerPanel: React.FC<{
  brushSettings: BrushSettings;
  onChangeBrushSettings: (next: BrushSettings) => void;
  onSelectPencil: () => void;
}> = ({ brushSettings, onChangeBrushSettings, onSelectPencil }) => {
  const [customPresets, setCustomPresets] = useState<{ id: string; name: string; tag: string; patch: Partial<BrushSettings> }[]>([]);
  const [newName, setNewName] = useState('');

  const allPresets = [...BUILTIN_BRUSH_PRESETS, ...customPresets];

  return (
    <div className="p-2.5 flex flex-col gap-2 text-[11px]">
      <div className="flex gap-1">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Guardar pincel actual..."
          className="flex-1 px-2 py-1 rounded border text-[10px]"
          style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)', color: 'var(--studio-text)' }}
        />
        <button
          type="button"
          disabled={!newName.trim()}
          onClick={() => {
            setCustomPresets((prev) => [
              { id: `cb-${Date.now()}`, name: newName.trim(), tag: `${brushSettings.size}px`, patch: { ...brushSettings } },
              ...prev,
            ]);
            setNewName('');
          }}
          className="px-2 py-1 rounded border font-bold text-[10px] disabled:opacity-40"
          style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)', borderColor: 'var(--studio-accent)' }}
        >
          +
        </button>
      </div>

      <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
        {allPresets.map((bp) => (
          <button
            key={bp.id}
            type="button"
            onClick={() => {
              onChangeBrushSettings({ ...brushSettings, ...bp.patch });
              onSelectPencil();
            }}
            className="px-2 py-1.5 rounded border text-left flex items-center justify-between hover:opacity-90"
            style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
          >
            <span className="flex items-center gap-1.5 font-medium truncate">
              <Paintbrush className="w-3 h-3 shrink-0" style={{ color: 'var(--studio-accent)' }} />
              {bp.name}
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--studio-bg-elevated)', color: 'var(--studio-text-muted)' }}>
              {bp.tag}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

// =========================================================
// 5. TEXTURAS Y MATERIALES (TEXTURES & MATERIALS)
// =========================================================
export const TexturesPanel: React.FC<{
  activeDither: 'checkered' | 'sparse' | 'dense' | 'horizontal';
  onSelectDither: (d: 'checkered' | 'sparse' | 'dense' | 'horizontal') => void;
  onSelectDitherTool: () => void;
}> = ({ activeDither, onSelectDither, onSelectDitherTool }) => {
  const textures: { id: 'checkered' | 'sparse' | 'dense' | 'horizontal'; name: string; desc: string }[] = [
    { id: 'checkered', name: 'Bayer 2×2 Clásico', desc: 'Ajedrez pixel-art 50%' },
    { id: 'sparse', name: 'Grano Disperso', desc: 'Roca, tierra y tela suave' },
    { id: 'dense', name: 'Trama Densa', desc: 'Sombra metálica / asfalto' },
    { id: 'horizontal', name: 'Scanlines Arcade', desc: 'Tubo CRT / energía HUD' },
  ];

  return (
    <div className="p-2.5 flex flex-col gap-1.5 text-[11px]">
      {textures.map((t) => {
        const active = activeDither === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              onSelectDither(t.id);
              onSelectDitherTool();
            }}
            className="px-2 py-1.5 rounded border text-left flex items-center justify-between"
            style={{
              backgroundColor: active ? 'color-mix(in srgb, var(--studio-accent) 18%, var(--studio-bg-card))' : 'var(--studio-bg-card)',
              borderColor: active ? 'var(--studio-accent)' : 'var(--studio-border)',
            }}
          >
            <div>
              <div className="font-semibold">{t.name}</div>
              <div className="text-[9px]" style={{ color: 'var(--studio-text-muted)' }}>{t.desc}</div>
            </div>
            <Grid className="w-3.5 h-3.5" style={{ color: active ? 'var(--studio-accent)' : 'var(--studio-text-muted)' }} />
          </button>
        );
      })}
    </div>
  );
};

const MATERIAL_RAMPS = [
  { id: 'skin', name: 'Piel Luchador', colors: ['#fef08a', '#f6c28b', '#d98a5f', '#9a4d3b'] },
  { id: 'steel', name: 'Acero / Armadura', colors: ['#f8fafc', '#cbd5e1', '#64748b', '#1e293b'] },
  { id: 'gi', name: 'Tela Gi Roja', colors: ['#fca5a5', '#ef4444', '#b91c1c', '#450a0a'] },
  { id: 'plasma', name: 'Energía Hadoken', colors: ['#ffffff', '#7dd3fc', '#0284c7', '#1e3a8a'] },
  { id: 'gold', name: 'Oro / Campeón', colors: ['#fef9c3', '#fde047', '#ca8a04', '#713f12'] },
];

export const MaterialsPanel: React.FC<{
  onSelectPrimaryColor: (hex: string) => void;
  onSelectSecondaryColor: (hex: string) => void;
  onUpdateActivePalette: (colors: string[]) => void;
}> = ({ onSelectPrimaryColor, onSelectSecondaryColor, onUpdateActivePalette }) => (
  <div className="p-2.5 flex flex-col gap-2 text-[11px]">
    {MATERIAL_RAMPS.map((mat) => (
      <div
        key={mat.id}
        className="p-2 rounded border flex flex-col gap-1.5"
        style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
      >
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[10px]">{mat.name}</span>
          <button
            type="button"
            onClick={() => {
              onSelectPrimaryColor(mat.colors[1]);
              onSelectSecondaryColor(mat.colors[2]);
            }}
            className="text-[9px] px-1.5 py-0.5 rounded border"
            style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)', color: 'var(--studio-accent)' }}
          >
            Aplicar
          </button>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {mat.colors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onSelectPrimaryColor(c)}
              className="h-4 rounded border border-black/40 hover:scale-105 transition-transform"
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      </div>
    ))}
    <button
      type="button"
      onClick={() => onUpdateActivePalette(MATERIAL_RAMPS.flatMap((m) => m.colors))}
      className="py-1 rounded border text-[10px] font-semibold"
      style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
    >
      Cargar todos los materiales en Paleta
    </button>
  </div>
);

// =========================================================
// 6. CONFIGURACIÓN IA (AI_CONFIG)
// =========================================================
export const AiConfigPanel: React.FC<{
  autoApplyAllFrames: boolean;
  onToggleAutoApplyAllFrames: () => void;
  references: ReferenceItem[];
  onToggleRefAiGuide: (id: string, next: boolean) => void;
  onOpenAiPanel: () => void;
}> = ({ autoApplyAllFrames, onToggleAutoApplyAllFrames, references, onToggleRefAiGuide, onOpenAiPanel }) => {
  const [aiMode, setAiMode] = useState<AiContextualMode>('keep');
  const [aiProfile, setAiProfile] = useState<AiExternalProfileId>('kof');
  const guideRefs = references.filter((r) => r.useAsAiGuide);

  return (
    <div className="p-2.5 flex flex-col gap-2 text-[11px]">
      <div className="flex flex-col gap-1">
        <span className="text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>Estilo Objetivo:</span>
        <select
          value={aiMode}
          onChange={(e) => setAiMode(e.target.value as AiContextualMode)}
          className="px-2 py-1 rounded border text-[10px]"
          style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)', color: 'var(--studio-text)' }}
        >
          <option value="keep">Mantener estilo actual</option>
          <option value="auto_detect">Detectar automáticamente</option>
          <option value="custom">Personalizado (Elegir perfil)</option>
          <option value="blend">Mezclar estilo (50%)</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>Perfil de Estilo (16 estilos):</span>
        <select
          value={aiProfile}
          onChange={(e) => setAiProfile(e.target.value as AiExternalProfileId)}
          className="px-2 py-1 rounded border text-[10px]"
          style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)', color: 'var(--studio-text)' }}
        >
          {AI_EXTERNAL_PROFILES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.era})
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center justify-between gap-2 p-2 rounded border cursor-pointer" style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}>
        <span className="text-[10px]">Aplicar IA directo a todos los frames</span>
        <input
          type="checkbox"
          checked={autoApplyAllFrames}
          onChange={onToggleAutoApplyAllFrames}
          className="accent-amber-400"
        />
      </label>
      <div className="text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>
        Guías IA activas: <strong style={{ color: 'var(--studio-accent)' }}>{guideRefs.length}</strong> / {references.length}
      </div>
      {references.slice(0, 4).map((r) => (
        <label key={r.id} className="flex items-center justify-between text-[10px] px-1">
          <span className="truncate">{r.name}</span>
          <input
            type="checkbox"
            checked={Boolean(r.useAsAiGuide)}
            onChange={(e) => onToggleRefAiGuide(r.id, e.target.checked)}
            className="accent-amber-400"
          />
        </label>
      ))}
      <button
        type="button"
        onClick={onOpenAiPanel}
        className="w-full py-1.5 rounded border font-bold text-[10px] flex items-center justify-center gap-1"
        style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)', borderColor: 'var(--studio-accent)' }}
      >
        <Sparkles className="w-3.5 h-3.5" /> Abrir Generador IA
      </button>
    </div>
  );
};

// =========================================================
// 7. CONSOLA DE ESTUDIO (CONSOLE)
// =========================================================
export const StudioConsolePanel: React.FC<{
  logs: string[];
  onExecuteQuickCommand: (cmd: string) => void;
}> = ({ logs, onExecuteQuickCommand }) => {
  const [input, setInput] = useState('');

  return (
    <div className="p-2.5 flex flex-col gap-2 text-[10px] font-mono">
      <div
        className="rounded border p-2 h-28 overflow-y-auto flex flex-col gap-1"
        style={{ backgroundColor: 'var(--studio-bg-canvas)', borderColor: 'var(--studio-border)' }}
      >
        {logs.length === 0 ? (
          <span style={{ color: 'var(--studio-text-muted)' }}>
            PixelClash Console lista. Escribe &quot;help&quot;, &quot;add-frame&quot;, &quot;add-layer&quot;, &quot;edit-ui&quot; o &quot;save&quot;.
          </span>
        ) : (
          logs.map((line, i) => (
            <div key={i} className="leading-tight" style={{ color: i === 0 ? 'var(--studio-accent)' : 'var(--studio-text)' }}>
              &gt; {line}
            </div>
          ))
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          onExecuteQuickCommand(input.trim());
          setInput('');
        }}
        className="flex gap-1"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Comando rápido (help, add-frame, edit-ui...)"
          className="flex-1 px-2 py-1 rounded border text-[10px]"
          style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)', color: 'var(--studio-text)' }}
        />
        <button
          type="submit"
          className="px-2 py-1 rounded border font-bold"
          style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)', borderColor: 'var(--studio-accent)' }}
        >
          <Terminal className="w-3 h-3" />
        </button>
      </form>
    </div>
  );
};

// =========================================================
// 8. ANIMACIÓN & PAPEL CEBOLLA (ANIMATION)
// =========================================================
export const AnimationControlPanel: React.FC<{
  fps: number;
  onChangeFps: (fps: number) => void;
  playbackMode: 'loop' | 'pingpong' | 'once';
  onChangePlaybackMode: (m: 'loop' | 'pingpong' | 'once') => void;
  onionSkinEnabled: boolean;
  onToggleOnionSkin: () => void;
  onionSkinPrev: number;
  onChangeOnionSkinPrev: (n: number) => void;
  onionSkinNext: number;
  onChangeOnionSkinNext: (n: number) => void;
  onionSkinOpacity: number;
  onChangeOnionSkinOpacity: (op: number) => void;
  cameraShake?: import('../types').CameraShakeConfig;
  onChangeCameraShake?: (next: import('../types').CameraShakeConfig) => void;
  onTriggerCameraShakeTest?: () => void;
  cameraKeyframes?: import('../types').CameraKeyframe[];
  currentFrameIndex?: number;
  onSetCameraKeyframe?: (kf: import('../types').CameraKeyframe) => void;
  onRemoveCameraKeyframe?: (frameIdx: number) => void;
}> = ({
  fps,
  onChangeFps,
  playbackMode,
  onChangePlaybackMode,
  onionSkinEnabled,
  onToggleOnionSkin,
  onionSkinPrev,
  onChangeOnionSkinPrev,
  onionSkinNext,
  onChangeOnionSkinNext,
  onionSkinOpacity,
  onChangeOnionSkinOpacity,
  cameraShake,
  onChangeCameraShake,
  onTriggerCameraShakeTest,
  cameraKeyframes = [],
  currentFrameIndex = 0,
  onSetCameraKeyframe,
  onRemoveCameraKeyframe,
}) => {
  const shakeCfg = cameraShake || {
    enabled: false,
    intensity: 6,
    durationMs: 220,
    frequencyHz: 28,
    direction: 'both' as const,
  };
  const activeCamKf = cameraKeyframes.find((k) => k.frameIndex === currentFrameIndex) || null;
  const effectiveCamKf: import('../types').CameraKeyframe = activeCamKf || {
    frameIndex: currentFrameIndex,
    x: 0,
    y: 0,
    zoom: 1,
    shakeTrigger: false,
    easing: 'ease-out',
  };

  return (
    <div className="p-2.5 flex flex-col gap-2.5 text-[11px]" data-help-id="anim.controllers">
      <div className="flex items-center justify-between gap-2">
        <span style={{ color: 'var(--studio-text-muted)' }}>FPS:</span>
        <div className="flex gap-1 font-mono text-[10px] tabular-nums">
          {[8, 12, 24, 60].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChangeFps(v)}
              className="px-1.5 py-0.5 rounded border"
              style={{
                backgroundColor: fps === v ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                color: fps === v ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                borderColor: 'var(--studio-border-strong)',
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span style={{ color: 'var(--studio-text-muted)' }}>Ciclo:</span>
        <select
          value={playbackMode}
          onChange={(e) => onChangePlaybackMode(e.target.value as 'loop' | 'pingpong' | 'once')}
          className="px-2 py-0.5 rounded border text-[10px]"
          style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)', color: 'var(--studio-text)' }}
        >
          <option value="loop">Loop Continuo</option>
          <option value="pingpong">Ping-Pong</option>
          <option value="once">Una Sola Vez</option>
        </select>
      </div>

      <div
        data-help-id="anim.onion_skin"
        className="flex flex-col gap-1.5 pt-2 border-t"
        style={{ borderColor: 'var(--studio-border)' }}
      >
        <label className="flex items-center justify-between cursor-pointer">
          <span className="font-semibold">Papel Cebolla (Onion Skin)</span>
          <input type="checkbox" checked={onionSkinEnabled} onChange={onToggleOnionSkin} className="accent-amber-400" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <StudioSlider
            variant="panel"
            label="Frames Ant."
            value={onionSkinPrev}
            min={0}
            max={4}
            step={1}
            defaultValue={1}
            formatValue={(v) => `-${v}`}
            onChange={(v) => onChangeOnionSkinPrev(v)}
          />
          <StudioSlider
            variant="panel"
            label="Frames Sig."
            value={onionSkinNext}
            min={0}
            max={4}
            step={1}
            defaultValue={0}
            formatValue={(v) => `+${v}`}
            onChange={(v) => onChangeOnionSkinNext(v)}
          />
        </div>
        <StudioSlider
          variant="panel"
          label="Opacidad Cebolla"
          value={Math.round(onionSkinOpacity * 100)}
          min={10}
          max={90}
          step={1}
          defaultValue={35}
          unit="%"
          onChange={(v) => onChangeOnionSkinOpacity(v / 100)}
        />
      </div>

      {/* Controladores de Cámara y Temblor (Camera Shake) */}
      {onChangeCameraShake && (
        <div
          data-help-id="anim.camera_shake"
          className="rounded-lg border p-2 flex flex-col gap-2"
          style={{
            backgroundColor: 'var(--studio-bg-card)',
            borderColor: shakeCfg.enabled ? 'var(--studio-accent)' : 'var(--studio-border)',
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-[11px]">Temblor de Cámara (Shake)</span>
            <input
              type="checkbox"
              checked={shakeCfg.enabled}
              onChange={(e) => onChangeCameraShake({ ...shakeCfg, enabled: e.target.checked })}
              className="accent-amber-400 cursor-pointer"
              title="Activar/Desactivar Temblor de Cámara"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <StudioSlider
              variant="panel"
              label="Intensidad"
              value={shakeCfg.intensity}
              min={1}
              max={24}
              step={1}
              defaultValue={6}
              unit="px"
              onChange={(v) => onChangeCameraShake({ ...shakeCfg, intensity: v })}
            />
            <StudioSlider
              variant="panel"
              label="Duración"
              value={shakeCfg.durationMs}
              min={60}
              max={1200}
              step={10}
              defaultValue={220}
              unit="ms"
              onChange={(v) => onChangeCameraShake({ ...shakeCfg, durationMs: v })}
            />
            <div className="col-span-2">
              <StudioSlider
                variant="panel"
                label="Frecuencia"
                value={shakeCfg.frequencyHz}
                min={5}
                max={60}
                step={1}
                defaultValue={28}
                unit=" Hz"
                onChange={(v) => onChangeCameraShake({ ...shakeCfg, frequencyHz: v })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>Dirección:</span>
            <div className="flex gap-1 text-[10px] font-mono">
              {(
                [
                  ['both', 'Ambos'],
                  ['horizontal', 'Horiz'],
                  ['vertical', 'Vert'],
                ] as const
              ).map(([dir, lbl]) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => onChangeCameraShake({ ...shakeCfg, direction: dir })}
                  className="px-1.5 py-0.5 rounded border"
                  style={{
                    backgroundColor: shakeCfg.direction === dir ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                    color: shakeCfg.direction === dir ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                    borderColor: 'var(--studio-border-strong)',
                  }}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {onTriggerCameraShakeTest && (
            <button
              type="button"
              onClick={onTriggerCameraShakeTest}
              className="w-full py-1 rounded-md font-bold text-[10px] border transition-colors cursor-pointer"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: 'var(--studio-accent)',
                color: 'var(--studio-accent)',
              }}
            >
              Probar Temblor en Lienzo (Ctrl+Alt+T)
            </button>
          )}
        </div>
      )}

      {/* Keyframes de Cámara */}
      {onSetCameraKeyframe && (
        <div
          data-help-id="anim.camera_keyframes"
          className="rounded-lg border p-2 flex flex-col gap-1.5"
          style={{
            backgroundColor: 'var(--studio-bg-card)',
            borderColor: activeCamKf ? 'var(--studio-accent)' : 'var(--studio-border)',
          }}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="font-bold text-[10px]">
              Keyframes de Cámara (F#{currentFrameIndex + 1})
            </span>
            {activeCamKf ? (
              <button
                type="button"
                onClick={() => onRemoveCameraKeyframe?.(currentFrameIndex)}
                className="px-1.5 py-0.5 rounded border border-rose-500/40 text-rose-400 text-[9px]"
              >
                Quitar Cam KF
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSetCameraKeyframe(effectiveCamKf)}
                className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
              >
                + Fijar Cam KF
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1 text-[10px] font-mono tabular-nums">
            <label className="flex flex-col gap-0.5">
              <span style={{ color: 'var(--studio-text-muted)' }}>Cam X</span>
              <input
                type="number"
                value={effectiveCamKf.x}
                onChange={(e) => onSetCameraKeyframe({ ...effectiveCamKf, x: Number(e.target.value) || 0 })}
                className="px-1 py-0.5 rounded border text-center"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
              />
            </label>
            <label className="flex flex-col gap-0.5">
              <span style={{ color: 'var(--studio-text-muted)' }}>Cam Y</span>
              <input
                type="number"
                value={effectiveCamKf.y}
                onChange={(e) => onSetCameraKeyframe({ ...effectiveCamKf, y: Number(e.target.value) || 0 })}
                className="px-1 py-0.5 rounded border text-center"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
              />
            </label>
            <label className="flex flex-col gap-0.5">
              <span style={{ color: 'var(--studio-text-muted)' }}>Zoom</span>
              <input
                type="number"
                step={0.1}
                min={0.5}
                max={2.5}
                value={effectiveCamKf.zoom}
                onChange={(e) => onSetCameraKeyframe({ ...effectiveCamKf, zoom: Math.max(0.5, Math.min(2.5, Number(e.target.value) || 1)) })}
                className="px-1 py-0.5 rounded border text-center"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
              />
            </label>
          </div>

          <label className="flex items-center justify-between text-[10px] cursor-pointer">
            <span style={{ color: 'var(--studio-text-muted)' }}>Disparar Temblor en este frame</span>
            <input
              type="checkbox"
              checked={Boolean(effectiveCamKf.shakeTrigger)}
              onChange={(e) => onSetCameraKeyframe({ ...effectiveCamKf, shakeTrigger: e.target.checked })}
              className="accent-amber-400"
            />
          </label>
        </div>
      )}
    </div>
  );
};

// =========================================================
// 9. KEYFRAMES & CURVAS (KEYFRAMES)
// =========================================================
export const KeyframesPanel: React.FC<{
  currentLayer: Layer;
  currentLayerIndex: number;
  currentFrameIndex: number;
  onSetLayerKeyframe?: (layerIndex: number, frameIndex: number, kf: LayerKeyframe) => void;
  onRemoveLayerKeyframe?: (layerIndex: number, frameIndex: number) => void;
}> = ({ currentLayer, currentLayerIndex, currentFrameIndex, onSetLayerKeyframe, onRemoveLayerKeyframe }) => {
  const kfs = currentLayer.keyframes || [];
  const activeKf = kfs.find((k) => k.frameIndex === currentFrameIndex);

  return (
    <div className="p-2.5 flex flex-col gap-2 text-[11px]" data-help-id="anim.keyframes">
      <div className="flex items-center justify-between">
        <span className="text-[10px] truncate" style={{ color: 'var(--studio-text-muted)' }}>
          Capa: <strong style={{ color: 'var(--studio-text)' }}>{currentLayer.name}</strong>
        </span>
        {activeKf ? (
          <button
            type="button"
            onClick={() => onRemoveLayerKeyframe?.(currentLayerIndex, currentFrameIndex)}
            className="px-2 py-0.5 rounded border text-[10px] text-rose-400 border-rose-500/40"
          >
            Quitar F{currentFrameIndex + 1}
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              onSetLayerKeyframe?.(currentLayerIndex, currentFrameIndex, {
                frameIndex: currentFrameIndex,
                offsetX: 0,
                offsetY: 0,
                scale: 1,
                opacity: 1,
                easing: 'ease-in-out',
              })
            }
            className="px-2 py-0.5 rounded border text-[10px] font-bold"
            style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)', borderColor: 'var(--studio-accent)' }}
          >
            + Keyframe F{currentFrameIndex + 1}
          </button>
        )}
      </div>

      {activeKf ? (
        <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono tabular-nums" data-help-id="anim.curves">
          <label className="flex items-center justify-between px-2 py-1 rounded border" style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}>
            <span>X:</span>
            <input
              type="number"
              value={activeKf.offsetX}
              onChange={(e) => onSetLayerKeyframe?.(currentLayerIndex, currentFrameIndex, { ...activeKf, offsetX: Number(e.target.value) || 0 })}
              className="w-12 text-right bg-transparent"
            />
          </label>
          <label className="flex items-center justify-between px-2 py-1 rounded border" style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}>
            <span>Y:</span>
            <input
              type="number"
              value={activeKf.offsetY}
              onChange={(e) => onSetLayerKeyframe?.(currentLayerIndex, currentFrameIndex, { ...activeKf, offsetY: Number(e.target.value) || 0 })}
              className="w-12 text-right bg-transparent"
            />
          </label>
          <select
            data-help-id="anim.interpolation"
            value={activeKf.easing}
            onChange={(e) => onSetLayerKeyframe?.(currentLayerIndex, currentFrameIndex, { ...activeKf, easing: e.target.value as KeyframeEasing })}
            className="col-span-2 px-2 py-1 rounded border"
            style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)', color: 'var(--studio-text)' }}
          >
            <option value="linear">Interpolación: Linear</option>
            <option value="ease-in">Ease-In</option>
            <option value="ease-out">Ease-Out</option>
            <option value="ease-in-out">Ease-In-Out</option>
            <option value="hold">Hold (Stepped)</option>
          </select>
        </div>
      ) : (
        <div className="text-[10px] text-center py-2" style={{ color: 'var(--studio-text-muted)' }}>
          Sin keyframe en este frame ({kfs.length} totales en la capa).
        </div>
      )}
    </div>
  );
};

// =========================================================
// 10. EDITOR VECTORIAL (VECTOR_EDITOR)
// =========================================================
export const VectorEditorPanel: React.FC<{
  activeTool: ToolType;
  onSelectTool: (t: ToolType) => void;
  vectorConfig: VectorToolConfig;
  onChangeVectorConfig: (v: VectorToolConfig) => void;
  currentLayer: Layer;
}> = ({ activeTool, onSelectTool, vectorConfig, onChangeVectorConfig, currentLayer }) => (
  <div className="p-2.5 flex flex-col gap-2 text-[11px]">
    <div className="grid grid-cols-3 gap-1">
      {(
        [
          ['line', 'Pluma / Línea'],
          ['move', 'Selección (Obj)'],
          ['direct_select', 'Nodos (Blanco)'],
        ] as [ToolType, string][]
      ).map(([t, lbl]) => (
        <button
          key={t}
          type="button"
          onClick={() => onSelectTool(t)}
          className="px-1.5 py-1 rounded border text-[10px] font-semibold truncate"
          style={{
            backgroundColor: activeTool === t ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
            color: activeTool === t ? 'var(--studio-accent-text)' : 'var(--studio-text)',
            borderColor: 'var(--studio-border-strong)',
          }}
        >
          {lbl}
        </button>
      ))}
    </div>
    <label className="flex items-center justify-between text-[10px]">
      <span>Smart Pixel Curve</span>
      <input
        type="checkbox"
        checked={vectorConfig.smartPixelCurve}
        onChange={(e) => onChangeVectorConfig({ ...vectorConfig, smartPixelCurve: e.target.checked })}
        className="accent-amber-400"
      />
    </label>
    <div className="text-[10px] font-mono" style={{ color: 'var(--studio-text-muted)' }}>
      Rutas en capa: <strong style={{ color: 'var(--studio-text)' }}>{currentLayer.vectorPaths?.length || 0}</strong>
    </div>
  </div>
);

// =========================================================
// 11. MÁSCARAS DE CAPA (MASKS)
// =========================================================
export const MasksStudioPanel: React.FC<{
  currentLayer: Layer;
  currentLayerIndex: number;
  editingMask: boolean;
  onSetEditingMask?: (b: boolean) => void;
  onCreateLayerMask?: (idx: number, mode: 'reveal' | 'hide' | 'selection' | 'vector', type?: LayerMaskType) => void;
  onInvertLayerMask?: (idx: number) => void;
  onApplyLayerMask?: (idx: number) => void;
  onDeleteLayerMask?: (idx: number) => void;
}> = ({
  currentLayer,
  currentLayerIndex,
  editingMask,
  onSetEditingMask,
  onCreateLayerMask,
  onInvertLayerMask,
  onApplyLayerMask,
  onDeleteLayerMask,
}) => (
  <div className="p-2.5 flex flex-col gap-2 text-[11px]">
    {currentLayer.mask ? (
      <>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-emerald-400">Máscara Activa ({currentLayer.mask.type})</span>
          <button
            type="button"
            onClick={() => onSetEditingMask?.(!editingMask)}
            className="px-2 py-0.5 rounded border text-[10px] font-semibold"
            style={{
              backgroundColor: editingMask ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
              color: editingMask ? 'var(--studio-accent-text)' : 'var(--studio-text)',
              borderColor: 'var(--studio-border-strong)',
            }}
          >
            {editingMask ? 'Editando Máscara' : 'Pintar Máscara'}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1 text-[10px]">
          <button type="button" onClick={() => onInvertLayerMask?.(currentLayerIndex)} className="py-1 rounded border" style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}>
            Invertir
          </button>
          <button type="button" onClick={() => onApplyLayerMask?.(currentLayerIndex)} className="py-1 rounded border" style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}>
            Aplicar
          </button>
          <button type="button" onClick={() => onDeleteLayerMask?.(currentLayerIndex)} className="py-1 rounded border text-rose-400" style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}>
            Eliminar
          </button>
        </div>
      </>
    ) : (
      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        <button
          type="button"
          onClick={() => onCreateLayerMask?.(currentLayerIndex, 'reveal', 'layer')}
          className="px-2 py-1.5 rounded border font-semibold"
          style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
        >
          + Revelar Todo
        </button>
        <button
          type="button"
          onClick={() => onCreateLayerMask?.(currentLayerIndex, 'hide', 'layer')}
          className="px-2 py-1.5 rounded border font-semibold"
          style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
        >
          + Ocultar Todo
        </button>
      </div>
    )}
  </div>
);

// =========================================================
// 12. EXPLORADOR DE PROYECTOS (PROJECT_EXPLORER)
// =========================================================
export const ProjectExplorerPanel: React.FC<{
  projectName: string;
  frames: Frame[];
  layerGroups: LayerGroup[];
  currentFrameIndex: number;
  onSelectFrame: (idx: number) => void;
  onSaveProjectPcs?: () => void;
}> = ({ projectName, frames, layerGroups, currentFrameIndex, onSelectFrame, onSaveProjectPcs }) => (
  <div className="p-2.5 flex flex-col gap-2 text-[11px]">
    <div className="flex items-center justify-between">
      <span className="font-bold flex items-center gap-1.5 truncate">
        <FolderTree className="w-3.5 h-3.5" style={{ color: 'var(--studio-accent)' }} />
        {projectName}.pcs
      </span>
      {onSaveProjectPcs && (
        <button
          type="button"
          onClick={onSaveProjectPcs}
          className="px-2 py-0.5 rounded border text-[10px] flex items-center gap-1"
          style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)', color: 'var(--studio-accent)' }}
        >
          <Download className="w-3 h-3" /> .PCS
        </button>
      )}
    </div>
    <div className="text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>
      {frames.length} frames · {layerGroups.length} carpetas/acciones
    </div>
    <div className="flex flex-col gap-1 max-h-44 overflow-y-auto">
      {frames.map((f, idx) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onSelectFrame(idx)}
          className="px-2 py-1 rounded border text-left flex items-center justify-between text-[10px]"
          style={{
            backgroundColor: idx === currentFrameIndex ? 'color-mix(in srgb, var(--studio-accent) 18%, var(--studio-bg-card))' : 'var(--studio-bg-card)',
            borderColor: idx === currentFrameIndex ? 'var(--studio-accent)' : 'var(--studio-border)',
          }}
        >
          <span className="truncate font-mono">F{idx + 1}: {f.name}</span>
          <span style={{ color: 'var(--studio-text-muted)' }}>{f.layers.length} capas</span>
        </button>
      ))}
    </div>
  </div>
);
