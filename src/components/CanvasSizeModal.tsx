import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Cpu, Maximize2, X } from 'lucide-react';
import { AnchorPosition } from '../utils/imageTransforms';
import { estimateCanvasResources } from '../utils/canvasMemoryEstimator';

interface CanvasSizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWidth: number;
  currentHeight: number;
  layersCount?: number;
  framesCount?: number;
  onApply: (newWidth: number, newHeight: number, anchor: AnchorPosition) => void;
}

export const CanvasSizeModal: React.FC<CanvasSizeModalProps> = ({
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
  const [anchor, setAnchor] = useState<AnchorPosition>('center');

  useEffect(() => {
    if (isOpen) {
      setWidth(currentWidth);
      setHeight(currentHeight);
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

  const anchorButtons: { id: AnchorPosition; label: string }[] = [
    { id: 'top-left', label: '↖' },
    { id: 'top-center', label: '↑' },
    { id: 'top-right', label: '↗' },
    { id: 'middle-left', label: '←' },
    { id: 'center', label: '•' },
    { id: 'middle-right', label: '→' },
    { id: 'bottom-left', label: '↙' },
    { id: 'bottom-center', label: '↓' },
    { id: 'bottom-right', label: '↘' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const safeW = Math.max(1, Math.round(width));
    const safeH = Math.max(1, Math.round(height));
    if (safeW > 0 && safeH > 0) {
      onApply(safeW, safeH, anchor);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[170] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#141724] border border-[#2b334a] rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#252c3f] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-100">Tamaño de Lienzo (Sin límite artificial)</h3>
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
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 font-mono block mb-1">Ancho (px)</label>
              <input
                type="number"
                min={1}
                value={width}
                onChange={(e) => setWidth(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full bg-[#1b1f2e] border border-[#2c354a] rounded p-2 text-slate-200 font-mono tabular-nums focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 font-mono block mb-1">Alto (px)</label>
              <input
                type="number"
                min={1}
                value={height}
                onChange={(e) => setHeight(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full bg-[#1b1f2e] border border-[#2c354a] rounded p-2 text-slate-200 font-mono tabular-nums focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Anchor 3x3 Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-mono">
              Punto de Anclaje / Expansión
            </label>
            <div className="grid grid-cols-3 gap-1.5 w-36 mx-auto bg-[#11131c] p-2 rounded-lg border border-[#252c3e]">
              {anchorButtons.map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setAnchor(btn.id)}
                  className={`h-9 rounded font-mono text-sm flex items-center justify-center transition-colors cursor-pointer ${
                    anchor === btn.id
                      ? 'bg-amber-400 text-slate-950 font-bold shadow'
                      : 'bg-[#1b1f2e] text-slate-300 hover:bg-[#252c3d]'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-center text-slate-400 mt-1">
              Añade margen o recorta el lienzo conservando cada píxel 1:1 sin alterar la escala.
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
            {estimate.recommendationNote && (
              <p className="text-[10px] text-slate-400 leading-snug">{estimate.recommendationNote}</p>
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
              className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow cursor-pointer"
            >
              Aplicar Redimensión
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

