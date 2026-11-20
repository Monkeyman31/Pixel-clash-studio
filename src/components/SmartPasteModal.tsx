import React, { useEffect, useState } from 'react';
import {
  ClipboardPaste,
  FilePlus2,
  Film,
  FolderPlus,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  PackagePlus,
  Sparkles,
  X,
} from 'lucide-react';
import { ClipboardFitMode, ClipboardPasteDestination } from '../types';
import { ClipboardImagePayload, formatClipboardBytes } from '../utils/systemClipboard';

interface SmartPasteModalProps {
  isOpen: boolean;
  payload: ClipboardImagePayload | null;
  canvasWidth: number;
  canvasHeight: number;
  activeGroupName?: string | null;
  initialDontAskAgain?: boolean;
  onConfirm: (options: {
    destination: ClipboardPasteDestination;
    fitMode: ClipboardFitMode;
    dontAskAgain: boolean;
  }) => void;
  onCancel: () => void;
}

interface DestinationOption {
  id: ClipboardPasteDestination;
  label: string;
  description: string;
  usesCanvasFit: boolean;
  icon: React.ReactNode;
}

export const SmartPasteModal: React.FC<SmartPasteModalProps> = ({
  isOpen,
  payload,
  canvasWidth,
  canvasHeight,
  activeGroupName,
  initialDontAskAgain = false,
  onConfirm,
  onCancel,
}) => {
  const [destination, setDestination] = useState<ClipboardPasteDestination>(
    activeGroupName ? 'selected_group' : 'new_layer'
  );
  const [fitMode, setFitMode] = useState<ClipboardFitMode>('original');
  const [dontAskAgain, setDontAskAgain] = useState<boolean>(initialDontAskAgain);

  useEffect(() => {
    if (!isOpen || !payload) return;
    setDestination(activeGroupName ? 'selected_group' : 'new_layer');
    // Default to original 1:1 when image fits in canvas, otherwise fit proportionally
    setFitMode(payload.width <= canvasWidth && payload.height <= canvasHeight ? 'original' : 'fit');
    setDontAskAgain(initialDontAskAgain);
  }, [isOpen, payload, canvasWidth, canvasHeight, activeGroupName, initialDontAskAgain]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm({ destination, fitMode, dontAskAgain });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, destination, fitMode, dontAskAgain, onConfirm, onCancel]);

  if (!isOpen || !payload) return null;

  const options: DestinationOption[] = [
    {
      id: 'new_layer',
      label: 'Nueva capa',
      description: 'Crea una capa independiente encima de la actual sin sobrescribir.',
      usesCanvasFit: true,
      icon: <Layers className="w-4 h-4 text-amber-400" />,
    },
    {
      id: 'selected_group',
      label: activeGroupName ? `Grupo: ${activeGroupName}` : 'Grupo seleccionado',
      description: activeGroupName
        ? `Inserta una capa nueva dentro del grupo "${activeGroupName}".`
        : 'Crea una nueva capa organizada dentro del grupo activo.',
      usesCanvasFit: true,
      icon: <FolderPlus className="w-4 h-4 text-sky-400" />,
    },
    {
      id: 'current_frame',
      label: 'Frame actual',
      description: 'Coloca la imagen como capa dedicada en el fotograma visible.',
      usesCanvasFit: true,
      icon: <Sparkles className="w-4 h-4 text-emerald-400" />,
    },
    {
      id: 'all_frames',
      label: 'Todos los frames',
      description: 'Añade la imagen como capa sincronizada en toda la línea de tiempo.',
      usesCanvasFit: true,
      icon: <Film className="w-4 h-4 text-violet-400" />,
    },
    {
      id: 'reference_canvas',
      label: 'Referencia sobre lienzo',
      description: 'Coloca la imagen como referencia libre con transparencia intacta.',
      usesCanvasFit: false,
      icon: <ImageIcon className="w-4 h-4 text-cyan-400" />,
    },
    {
      id: 'reference_panel',
      label: 'Panel de referencias',
      description: 'Importa directamente a la mesa visual del panel de referencias.',
      usesCanvasFit: false,
      icon: <LayoutGrid className="w-4 h-4 text-teal-400" />,
    },
    {
      id: 'asset_library',
      label: 'Asset del proyecto',
      description: 'Guarda la imagen reutilizable en la librería de Assets.',
      usesCanvasFit: false,
      icon: <PackagePlus className="w-4 h-4 text-orange-400" />,
    },
    {
      id: 'new_document',
      label: 'Nuevo documento',
      description: `Abre una pestaña nueva con tamaño exacto (${payload.width}×${payload.height} px).`,
      usesCanvasFit: false,
      icon: <FilePlus2 className="w-4 h-4 text-indigo-400" />,
    },
  ];

  const selectedOption = options.find((o) => o.id === destination) || options[0];
  const exceedsCanvas = payload.width > canvasWidth || payload.height > canvasHeight;

  return (
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/75 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-2xl rounded-lg border border-slate-700/80 bg-[#12161f] text-slate-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[#0d1017]">
          <div className="flex items-center gap-2.5">
            <ClipboardPaste className="w-4 h-4 text-amber-400 shrink-0" />
            <h2 className="text-sm font-semibold tracking-tight text-slate-100">
              ¿Dónde desea colocar la imagen?
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
            title="Cancelar (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Preview + Metadata Strip */}
          <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-stretch border border-slate-800 bg-[#0d1017] rounded-md p-3">
            <div className="w-32 h-24 shrink-0 rounded border border-slate-700/70 canvas-checkerboard flex items-center justify-center overflow-hidden p-1">
              <img
                src={payload.dataUrl}
                alt="Vista previa del portapapeles"
                className="max-w-full max-h-full object-contain"
                style={{ imageRendering: payload.width <= 160 && payload.height <= 160 ? 'pixelated' : 'auto' }}
              />
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-between gap-2 text-xs">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                  Imagen detectada en el portapapeles del sistema
                </div>
                <div className="mt-1 text-slate-100 font-medium tabular-nums">
                  {payload.width} × {payload.height} px · {payload.formatLabel} ·{' '}
                  {formatClipboardBytes(payload.sizeBytes)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-300 border-t border-slate-800/80 pt-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Canal alfa</span>
                  <span className={payload.hasTransparency ? 'text-emerald-400 font-medium' : 'text-slate-300'}>
                    {payload.hasTransparency ? 'Transparencia conservada' : 'Opaca'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Lienzo activo</span>
                  <span className="tabular-nums text-slate-200">
                    {canvasWidth} × {canvasHeight} px
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Destination Options */}
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium mb-2">
              Destino de inserción
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {options.map((opt) => {
                const active = opt.id === destination;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDestination(opt.id)}
                    onDoubleClick={() =>
                      onConfirm({ destination: opt.id, fitMode, dontAskAgain })
                    }
                    className={`flex items-start gap-2.5 text-left px-3 py-2.5 rounded-md border transition-colors ${
                      active
                        ? 'border-amber-500/80 bg-amber-500/10 text-slate-100'
                        : 'border-slate-800 bg-[#0f131b] text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">{opt.icon}</div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-100 truncate">
                        {opt.label}
                      </div>
                      <div className="text-[11px] text-slate-400 leading-snug mt-0.5">
                        {opt.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Canvas fit mode selector */}
          {selectedOption.usesCanvasFit && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3">
              <div className="text-xs text-slate-300">
                Ajuste en el lienzo
                {exceedsCanvas && fitMode === 'original' && (
                  <span className="ml-2 text-[11px] text-amber-400">
                    (La imagen supera el lienzo; se ajustará proporcionalmente)
                  </span>
                )}
              </div>
              <div className="inline-flex rounded border border-slate-700/80 overflow-hidden text-xs">
                {(
                  [
                    { id: 'original', label: 'Original 1:1' },
                    { id: 'fit', label: 'Ajustar proporcional' },
                    { id: 'fill', label: 'Rellenar lienzo' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setFitMode(m.id)}
                    className={`px-2.5 py-1 transition-colors ${
                      fitMode === m.id
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'bg-[#0d1017] text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick paste toggle */}
          <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none text-xs text-slate-300">
            <input
              type="checkbox"
              checked={dontAskAgain}
              onChange={(e) => setDontAskAgain(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 accent-amber-500"
            />
            <span>
              No volver a preguntar <span className="text-slate-400">(Pegado rápido en nueva capa dentro del grupo seleccionado)</span>
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-800 bg-[#0d1017]">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded text-xs font-medium text-slate-300 border border-slate-700 hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ destination, fitMode, dontAskAgain })}
            className="px-4 py-1.5 rounded text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
          >
            Colocar imagen
          </button>
        </div>
      </div>
    </div>
  );
};
