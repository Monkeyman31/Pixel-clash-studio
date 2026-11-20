import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Cpu, Lock, Scaling, Unlock, X } from 'lucide-react';
import { InterpolationMode } from '../types';
import { estimateCanvasResources } from '../utils/canvasMemoryEstimator';

interface ImageSizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWidth: number;
  currentHeight: number;
  layersCount?: number;
  framesCount?: number;
  onApply: (newWidth: number, newHeight: number, interpolation?: InterpolationMode) => void;
}

export const ImageSizeModal: React.FC<ImageSizeModalProps> = ({
  isOpen,
  onClose,
  currentWidth,
  currentHeight,
  layersCount = 1,
  framesCount = 1,
  onApply,
}) => {
  const [width, setWidth] = useState<number>(currentWidth);
  const [height, setHeight] = useState<number>(currentHeight);
  const [keepAspect, setKeepAspect] = useState<boolean>(true);
  const [interpolation, setInterpolation] = useState<InterpolationMode>('nearest');

  useEffect(() => {
    if (isOpen) {
      setWidth(currentWidth);
      setHeight(currentHeight);
      setInterpolation('nearest');
    }
  }, [isOpen, currentWidth, currentHeight]);

  const estimate = useMemo(
    () =>
      estimateCanvasResources({
        width: Math.max(1, width),
        height: Math.max(1, height),
        layersCount,
        framesCount,
      }),
    [width, height, layersCount, framesCount]
  );

  if (!isOpen) return null;

  const handleWidthChange = (val: number) => {
    const safe = Math.max(1, val);
    setWidth(safe);
    if (keepAspect && currentWidth > 0) {
      const ratio = currentHeight / currentWidth;
      setHeight(Math.max(1, Math.round(safe * ratio)));
    }
  };

  const handleHeightChange = (val: number) => {
    const safe = Math.max(1, val);
    setHeight(safe);
    if (keepAspect && currentHeight > 0) {
      const ratio = currentWidth / currentHeight;
      setWidth(Math.max(1, Math.round(safe * ratio)));
    }
  };

  const handleMultiplier = (factor: number) => {
    setWidth(Math.max(1, Math.round(currentWidth * factor)));
    setHeight(Math.max(1, Math.round(currentHeight * factor)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const safeW = Math.max(1, Math.round(width));
    const safeH = Math.max(1, Math.round(height));
    if (safeW > 0 && safeH > 0) {
      onApply(safeW, safeH, interpolation);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[170] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#141724] border border-[#2b334a] rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#252c3f] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scaling className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-slate-100">Tamaño de Imagen (Escalar Píxeles)</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Quick Multipliers */}
          <div className="flex items-center justify-between bg-[#191e2b] p-2.5 rounded-lg border border-[#273247]">
            <span className="text-xs text-slate-400 font-mono">Multiplicador:</span>
            <div className="flex items-center gap-1.5">
              {[0.5, 2, 3, 4].map((factor) => (
                <button
                  key={factor}
                  type="button"
                  onClick={() => handleMultiplier(factor)}
                  className="px-2.5 py-1 text-xs font-mono tabular-nums rounded bg-[#22293b] text-slate-200 hover:bg-[#2e374f] hover:text-amber-400 cursor-pointer"
                >
                  {factor}x
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 font-mono block mb-1">Nuevo Ancho (px)</label>
              <input
                type="number"
                min={1}
                value={width}
                onChange={(e) => handleWidthChange(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-[#1b1f2e] border border-[#2c354a] rounded p-2 text-slate-200 font-mono tabular-nums focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 font-mono block mb-1">Nuevo Alto (px)</label>
              <input
                type="number"
                min={1}
                value={height}
                onChange={(e) => handleHeightChange(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-[#1b1f2e] border border-[#2c354a] rounded p-2 text-slate-200 font-mono tabular-nums focus:border-sky-400 focus:outline-none"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={keepAspect}
              onChange={(e) => setKeepAspect(e.target.checked)}
              className="rounded accent-sky-400"
            />
            <span className="flex items-center gap-1">
              {keepAspect ? <Lock className="w-3 h-3 text-sky-400" /> : <Unlock className="w-3 h-3 text-slate-500" />}
              Mantener proporción de aspecto
            </span>
          </label>

          {/* Interpolation Selector (Default strictly Nearest Neighbor) */}
          <div className="bg-[#11131c] p-2.5 rounded-lg border border-[#222736] space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300 font-semibold">Interpolación</span>
              <span className="text-[10px] font-mono text-sky-300">Predeterminado: Nearest Neighbor</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  ['nearest', 'Nearest Neighbor'],
                  ['bilinear', 'Bilinear'],
                  ['bicubic', 'Bicubic'],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setInterpolation(mode)}
                  className={`px-2 py-1.5 rounded text-[11px] font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                    interpolation === mode
                      ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold'
                      : 'bg-[#1a1f30] text-slate-300 border-[#283148] hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 leading-snug">
              Nearest Neighbor conserva bordes exactos de Pixel Art sin desenfoque. El suavizado solo se aplica si seleccionas Bilinear o Bicubic.
            </p>
          </div>

          {/* Dynamic Resource & Memory Estimator */}
          <div className="p-3 rounded-lg bg-[#10131e] border border-[#252d43] space-y-2 text-[11px]">
            <div className="flex items-center justify-between text-slate-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-sky-400" />
                Estimador de Memoria &amp; Recursos
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                Carga: {estimate.severityLabel}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono tabular-nums text-[10px]">
              <div className="p-1.5 rounded bg-[#161a28] border border-[#232b40]">
                <div className="text-slate-400">RAM est.</div>
                <div className="text-slate-100 font-bold mt-0.5">{estimate.ramFormatted}</div>
              </div>
              <div className="p-1.5 rounded bg-[#161a28] border border-[#232b40]">
                <div className="text-slate-400">VRAM est.</div>
                <div className="text-slate-100 font-bold mt-0.5">{estimate.vramFormatted}</div>
              </div>
              <div className="p-1.5 rounded bg-[#161a28] border border-[#232b40]">
                <div className="text-slate-400">Proyecto</div>
                <div className="text-slate-100 font-bold mt-0.5">{estimate.projectFormatted}</div>
              </div>
            </div>
            {estimate.warningMessage && (
              <div className="p-2 rounded border border-amber-500/40 bg-amber-500/10 text-amber-200 flex items-start gap-2 text-[10px] leading-snug">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>{estimate.warningMessage}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#252c3f]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold shadow cursor-pointer"
            >
              Escalar Sprite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

