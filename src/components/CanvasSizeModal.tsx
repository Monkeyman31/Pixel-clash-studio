import React, { useState } from 'react';
import { X, Maximize2 } from 'lucide-react';
import { AnchorPosition } from '../utils/imageTransforms';

interface CanvasSizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWidth: number;
  currentHeight: number;
  onApply: (newWidth: number, newHeight: number, anchor: AnchorPosition) => void;
}

export const CanvasSizeModal: React.FC<CanvasSizeModalProps> = ({
  isOpen,
  onClose,
  currentWidth,
  currentHeight,
  onApply,
}) => {
  const [width, setWidth] = useState<number>(currentWidth);
  const [height, setHeight] = useState<number>(currentHeight);
  const [anchor, setAnchor] = useState<AnchorPosition>('center');

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
    if (width > 0 && height > 0) {
      onApply(width, height, anchor);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#141724] border border-[#2b334a] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#252c3f] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-100">Tamaño de Lienzo (Canvas Size)</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 font-mono block mb-1">Ancho (px)</label>
              <input
                type="number"
                min="8"
                max="512"
                value={width}
                onChange={(e) => setWidth(parseInt(e.target.value, 10) || 8)}
                className="w-full bg-[#1b1f2e] border border-[#2c354a] rounded p-2 text-slate-200 font-mono focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 font-mono block mb-1">Alto (px)</label>
              <input
                type="number"
                min="8"
                max="512"
                value={height}
                onChange={(e) => setHeight(parseInt(e.target.value, 10) || 8)}
                className="w-full bg-[#1b1f2e] border border-[#2c354a] rounded p-2 text-slate-200 font-mono focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Anchor 3x3 Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-mono">
              Punto de Anclaje / Expansión
            </label>
            <div className="grid grid-cols-3 gap-1.5 w-36 mx-auto bg-[#11131c] p-2 rounded-xl border border-[#252c3e]">
              {anchorButtons.map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setAnchor(btn.id)}
                  className={`h-9 rounded font-mono text-sm flex items-center justify-center transition-colors ${
                    anchor === btn.id
                      ? 'bg-amber-400 text-slate-950 font-bold shadow'
                      : 'bg-[#1b1f2e] text-slate-300 hover:bg-[#252c3d]'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-center text-slate-500 italic mt-1">
              Añade margen o recorta el lienzo sin alterar la escala del dibujo.
            </p>
          </div>

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
              className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow"
            >
              Aplicar Redimensión
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
