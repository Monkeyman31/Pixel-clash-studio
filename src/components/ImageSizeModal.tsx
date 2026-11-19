import React, { useState } from 'react';
import { X, Scaling, Lock, Unlock } from 'lucide-react';

interface ImageSizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWidth: number;
  currentHeight: number;
  onApply: (newWidth: number, newHeight: number) => void;
}

export const ImageSizeModal: React.FC<ImageSizeModalProps> = ({
  isOpen,
  onClose,
  currentWidth,
  currentHeight,
  onApply,
}) => {
  const [width, setWidth] = useState<number>(currentWidth);
  const [height, setHeight] = useState<number>(currentHeight);
  const [keepAspect, setKeepAspect] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (keepAspect && currentWidth > 0) {
      const ratio = currentHeight / currentWidth;
      setHeight(Math.round(val * ratio));
    }
  };

  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (keepAspect && currentHeight > 0) {
      const ratio = currentWidth / currentHeight;
      setWidth(Math.round(val * ratio));
    }
  };

  const handleMultiplier = (factor: number) => {
    setWidth(Math.round(currentWidth * factor));
    setHeight(Math.round(currentHeight * factor));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (width > 0 && height > 0) {
      onApply(width, height);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#141724] border border-[#2b334a] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#252c3f] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scaling className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-slate-100">Tamaño de Imagen (Escalar Píxeles)</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Quick Multipliers */}
          <div className="flex items-center justify-between bg-[#191e2b] p-2.5 rounded-xl border border-[#273247]">
            <span className="text-xs text-slate-400 font-mono">Multiplicador:</span>
            <div className="flex items-center gap-1.5">
              {[0.5, 2, 3, 4].map((factor) => (
                <button
                  key={factor}
                  type="button"
                  onClick={() => handleMultiplier(factor)}
                  className="px-2.5 py-1 text-xs font-mono rounded bg-[#22293b] text-slate-200 hover:bg-[#2e374f] hover:text-amber-400"
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
                min="8"
                max="1024"
                value={width}
                onChange={(e) => handleWidthChange(parseInt(e.target.value, 10) || 8)}
                className="w-full bg-[#1b1f2e] border border-[#2c354a] rounded p-2 text-slate-200 font-mono focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 font-mono block mb-1">Nuevo Alto (px)</label>
              <input
                type="number"
                min="8"
                max="1024"
                value={height}
                onChange={(e) => handleHeightChange(parseInt(e.target.value, 10) || 8)}
                className="w-full bg-[#1b1f2e] border border-[#2c354a] rounded p-2 text-slate-200 font-mono focus:border-sky-400 focus:outline-none"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
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

          <p className="text-[10px] text-slate-400 italic bg-[#11131c] p-2 rounded-lg border border-[#222736]">
            Muestreo: <span className="text-sky-300 font-semibold font-mono">Nearest Neighbor</span> (Conserva la nitidez perfecta del Pixel Art sin desenfoque bilineal).
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#252c3f]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold shadow"
            >
              Escalar Sprite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
