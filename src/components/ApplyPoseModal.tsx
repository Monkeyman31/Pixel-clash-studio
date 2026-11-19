import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Layers, ShieldCheck, Sparkles, Wand2, X } from 'lucide-react';
import {
  DummieApplyConfig,
  DummieApplyTarget,
  DummieFrameScope,
  DummiePose,
  Frame,
} from '../types';
import { compositeFrame, frameToCanvas } from '../utils/pixelMath';
import {
  detectCharacterSilhouetteRegions,
  getEffectivePoseJoints,
  retargetSpriteGridToPose,
} from '../utils/dummieRigEngine';
import { StudioSlider } from './StudioSlider';

interface ApplyPoseModalProps {
  isOpen: boolean;
  onClose: () => void;
  pose: DummiePose;
  currentFrame: Frame;
  currentFrameIndex: number;
  frames: Frame[];
  currentLayerIndex: number;
  canvasWidth: number;
  canvasHeight: number;
  activePaletteColors: string[];
  onApplyPoseResult: (
    resultGrid: (string | null)[][],
    config: DummieApplyConfig
  ) => void;
}

const GridPreviewCanvas: React.FC<{
  grid: (string | null)[][];
  width: number;
  height: number;
  diffAgainst?: (string | null)[][];
}> = ({ grid, width, height, diffAgainst }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    c.width = width;
    c.height = height;
    ctx.clearRect(0, 0, width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const col = grid[y]?.[x];
        if (diffAgainst) {
          const oldCol = diffAgainst[y]?.[x];
          if (col && !oldCol) ctx.fillStyle = '#34d399';
          else if (!col && oldCol) ctx.fillStyle = 'rgba(244,63,94,0.45)';
          else if (col && oldCol && col !== oldCol) ctx.fillStyle = '#fbbf24';
          else if (col) ctx.fillStyle = 'rgba(148,163,184,0.28)';
          else continue;
          ctx.fillRect(x, y, 1, 1);
        } else if (col) {
          ctx.fillStyle = col;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }, [grid, width, height, diffAgainst]);
  return <canvas ref={ref} className="w-28 h-28 pixel-canvas canvas-checkerboard rounded border" style={{ borderColor: 'var(--studio-border-strong)' }} />;
};

export const ApplyPoseModal: React.FC<ApplyPoseModalProps> = ({
  isOpen,
  onClose,
  pose,
  currentFrame,
  currentFrameIndex,
  frames,
  currentLayerIndex,
  canvasWidth,
  canvasHeight,
  activePaletteColors,
  onApplyPoseResult,
}) => {
  const [target, setTarget] = useState<DummieApplyTarget>('selected_layer');
  const [frameScope, setFrameScope] = useState<DummieFrameScope>('current_frame');
  const [specificFrameIndex, setSpecificFrameIndex] = useState(currentFrameIndex);
  const [generateInBetweens, setGenerateInBetweens] = useState(false);
  const [inBetweenCount, setInBetweenCount] = useState(2);
  const [markAsKeyframes, setMarkAsKeyframes] = useState(true);
  const [preserveOriginalResolution, setPreserveOriginalResolution] = useState(true);
  const [preserveOriginalPalette, setPreserveOriginalPalette] = useState(true);
  const [pixelPerfectOutlines, setPixelPerfectOutlines] = useState(true);
  const [useAiRetarget, setUseAiRetarget] = useState(false);
  const [aiIntensity, setAiIntensity] = useState(75);
  const [layerBaseName, setLayerBaseName] = useState(`Personaje_Pose_${pose.name}`);
  const [aiPreviewGrid, setAiPreviewGrid] = useState<(string | null)[][] | null>(null);
  const [isAiRunning, setIsAiRunning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLayerBaseName(`Personaje_Pose_${pose.name.replace(/\s+/g, '_')}`);
      setAiPreviewGrid(null);
      setSpecificFrameIndex(currentFrameIndex);
    }
  }, [isOpen, pose.name, currentFrameIndex]);

  const sourceGrid = useMemo(() => {
    if (target === 'selected_layer') {
      return currentFrame.layers[currentLayerIndex]?.pixels || compositeFrame(currentFrame, canvasWidth, canvasHeight);
    }
    return compositeFrame(currentFrame, canvasWidth, canvasHeight);
  }, [target, currentFrame, currentLayerIndex, canvasWidth, canvasHeight]);

  const detectedAnatomy = useMemo(() => detectCharacterSilhouetteRegions(sourceGrid), [sourceGrid]);

  const localAfterGrid = useMemo(
    () =>
      retargetSpriteGridToPose(
        sourceGrid,
        pose,
        canvasWidth,
        canvasHeight,
        aiIntensity / 100,
        pixelPerfectOutlines
      ),
    [sourceGrid, pose, canvasWidth, canvasHeight, aiIntensity, pixelPerfectOutlines]
  );

  const activeAfterGrid = aiPreviewGrid || localAfterGrid;

  if (!isOpen) return null;

  const handleRunAiRetarget = async () => {
    setIsAiRunning(true);
    try {
      const c = frameToCanvas(currentFrame, canvasWidth, canvasHeight, 1);
      const effectiveJoints = getEffectivePoseJoints(pose);
      const jointSummary = effectiveJoints
        .map((j) => `${j.id}:(${j.x.toFixed(2)},${j.y.toFixed(2)})`)
        .join(', ');

      const res = await fetch('/api/ai/pose-retarget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentFrameBase64: c.toDataURL('image/png'),
          poseName: pose.name,
          rigType: pose.rigType,
          jointSummary,
          width: canvasWidth,
          height: canvasHeight,
          palette: activePaletteColors,
          intensity: aiIntensity,
        }),
      });
      const data = await res.json();
      if (Array.isArray(data.pixels) && data.pixels.length > 0) {
        const g: (string | null)[][] = Array.from({ length: canvasHeight }, () =>
          new Array(canvasWidth).fill(null)
        );
        for (const p of data.pixels) {
          if (p.x >= 0 && p.x < canvasWidth && p.y >= 0 && p.y < canvasHeight && p.color) {
            g[p.y][p.x] = p.color;
          }
        }
        setAiPreviewGrid(g);
      } else {
        setAiPreviewGrid(localAfterGrid);
      }
    } catch {
      setAiPreviewGrid(localAfterGrid);
    } finally {
      setIsAiRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[105] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div
        className="w-full max-w-3xl max-h-[90vh] rounded-xl border shadow-2xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--studio-bg-panel)',
          borderColor: 'var(--studio-border-strong)',
          color: 'var(--studio-text)',
        }}
      >
        <div
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{ backgroundColor: 'var(--studio-bg-bar)', borderColor: 'var(--studio-border)' }}
        >
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4" style={{ color: 'var(--studio-accent)' }} />
            <div>
              <h3 className="text-xs font-bold">Aplicar Pose Dummie 2D — "{pose.name}"</h3>
              <p className="text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>
                Conserva el sprite original intacto y crea una nueva capa o grupo independiente
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Left Column: Config */}
          <div className="flex flex-col gap-3">
            <div className="px-2.5 py-2 rounded-lg border flex items-center gap-2 text-[11px]"
              style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}>
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Seguridad activa: se creará la capa <strong>{layerBaseName}</strong>.</span>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--studio-text-muted)' }}>1. Objetivo de Lectura</span>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value as DummieApplyTarget)}
                className="px-2 py-1.5 rounded border text-xs"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)', color: 'var(--studio-text)' }}
              >
                <option value="selected_layer">Capa seleccionada</option>
                <option value="current_character">Personaje actual (silueta compuesta)</option>
                <option value="selected_group">Grupo seleccionado</option>
                <option value="current_frame">Frame actual completo</option>
                <option value="manual_sprite">Sprite dibujado manualmente</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--studio-text-muted)' }}>2. Fotograma(s) de Destino</span>
              <select
                value={frameScope}
                onChange={(e) => setFrameScope(e.target.value as DummieFrameScope)}
                className="px-2 py-1.5 rounded border text-xs"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)', color: 'var(--studio-text)' }}
              >
                <option value="current_frame">Frame actual (Frame #{currentFrameIndex + 1})</option>
                <option value="specific_frame">Frame específico</option>
                <option value="multiple_frames">Múltiples frames</option>
                <option value="all_frames">Toda la animación ({frames.length} frames)</option>
              </select>
            </label>

            {frameScope === 'specific_frame' && (
              <label className="flex items-center justify-between text-[11px]">
                <span>Número de Frame (1..{frames.length}):</span>
                <input
                  type="number"
                  min={1}
                  max={frames.length}
                  value={specificFrameIndex + 1}
                  onChange={(e) => setSpecificFrameIndex(Math.max(0, Math.min(frames.length - 1, (parseInt(e.target.value, 10) || 1) - 1)))}
                  className="w-16 px-2 py-1 rounded border font-mono"
                  style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
                />
              </label>
            )}

            <div className="p-2.5 rounded-lg border flex flex-col gap-1.5 text-[11px]"
              style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}>
              <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--studio-text-muted)' }}>Opciones de Animación & Pixel Art</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={generateInBetweens} onChange={(e) => setGenerateInBetweens(e.target.checked)} className="accent-amber-400" />
                <span>Generar poses intermedias (In-betweens: {inBetweenCount})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={markAsKeyframes} onChange={(e) => setMarkAsKeyframes(e.target.checked)} className="accent-amber-400" />
                <span>Usar pose como keyframe</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={preserveOriginalResolution} onChange={(e) => setPreserveOriginalResolution(e.target.checked)} className="accent-amber-400" />
                <span>Mantener resolución original ({canvasWidth}×{canvasHeight})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={preserveOriginalPalette} onChange={(e) => setPreserveOriginalPalette(e.target.checked)} className="accent-amber-400" />
                <span>Mantener paleta de colores original</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={pixelPerfectOutlines} onChange={(e) => setPixelPerfectOutlines(e.target.checked)} className="accent-amber-400" />
                <span>Optimizar contornos Pixel Perfect</span>
              </label>
            </div>

            <div className="p-2.5 rounded-lg border flex flex-col gap-2 text-[11px]"
              style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}>
              <label className="flex items-center justify-between cursor-pointer font-semibold">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Usar IA para reinterpretar pose
                </span>
                <input type="checkbox" checked={useAiRetarget} onChange={(e) => setUseAiRetarget(e.target.checked)} className="accent-purple-400" />
              </label>
              <StudioSlider
                variant="panel"
                label="Intensidad de adaptación"
                value={aiIntensity}
                min={0}
                max={100}
                step={1}
                unit="%"
                defaultValue={70}
                accentColor="#a855f7"
                onChange={setAiIntensity}
              />
              {useAiRetarget && (
                <button
                  type="button"
                  disabled={isAiRunning}
                  onClick={handleRunAiRetarget}
                  className="py-1.5 rounded-lg font-bold text-[11px] bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50"
                >
                  {isAiRunning ? 'Reinterpretando sprite con IA...' : 'Previsualizar Retargeting IA'}
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Auto Detection + Comparative Preview */}
          <div className="flex flex-col gap-3">
            <div className="p-2.5 rounded-lg border text-[10px] font-mono tabular-nums"
              style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}>
              <div className="font-bold mb-1" style={{ color: 'var(--studio-accent)' }}>
                Detección Automática del Personaje
              </div>
              {detectedAnatomy ? (
                <div className="grid grid-cols-2 gap-1">
                  <span>Silueta: {detectedAnatomy.width}×{detectedAnatomy.height}px</span>
                  <span>Píxeles: {detectedAnatomy.pixelCount}</span>
                  <span>Cabeza Y: {detectedAnatomy.headBox.y}..{detectedAnatomy.headBox.y + detectedAnatomy.headBox.h}</span>
                  <span>Torso Y: {detectedAnatomy.torsoBox.y}..{detectedAnatomy.torsoBox.y + detectedAnatomy.torsoBox.h}</span>
                </div>
              ) : (
                <span style={{ color: 'var(--studio-text-muted)' }}>Capa sin píxeles visibles para detectar.</span>
              )}
            </div>

            <div className="p-3 rounded-lg border flex flex-col gap-2"
              style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}>
              <span className="text-[11px] font-bold">Vista Previa Comparativa (Antes / Después / Diferencias)</span>
              <div className="grid grid-cols-3 gap-2 place-items-center">
                <div className="flex flex-col items-center gap-1">
                  <GridPreviewCanvas grid={sourceGrid} width={canvasWidth} height={canvasHeight} />
                  <span className="text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>Antes</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <GridPreviewCanvas grid={activeAfterGrid} width={canvasWidth} height={canvasHeight} />
                  <span className="text-[10px]" style={{ color: 'var(--studio-accent)' }}>Después</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <GridPreviewCanvas grid={activeAfterGrid} width={canvasWidth} height={canvasHeight} diffAgainst={sourceGrid} />
                  <span className="text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>Diferencias</span>
                </div>
              </div>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--studio-text-muted)' }}>Nombre Nueva Capa Resultado</span>
              <input
                type="text"
                value={layerBaseName}
                onChange={(e) => setLayerBaseName(e.target.value)}
                className="px-2.5 py-1.5 rounded border text-xs font-mono"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)', color: 'var(--studio-text)' }}
              />
            </label>
          </div>
        </div>

        <div
          className="px-4 py-3 border-t flex items-center justify-end gap-2"
          style={{ backgroundColor: 'var(--studio-bg-bar)', borderColor: 'var(--studio-border)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border text-xs font-semibold"
            style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onApplyPoseResult(activeAfterGrid, {
                target,
                frameScope,
                specificFrameIndex,
                selectedFrameIndices: [currentFrameIndex],
                generateInBetweens,
                inBetweenCount,
                markAsKeyframes,
                preserveOriginalResolution,
                preserveOriginalPalette,
                pixelPerfectOutlines,
                useAiRetarget,
                aiAdaptationIntensity: aiIntensity,
                layerBaseName: layerBaseName.trim() || `Personaje_Pose_${pose.name}`,
              });
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
            style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
          >
            <Check className="w-4 h-4" />
            <span>Crear Nueva Capa con Pose</span>
          </button>
        </div>
      </div>
    </div>
  );
};
