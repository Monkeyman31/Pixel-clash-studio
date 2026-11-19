import React, { useState } from 'react';
import { Globe, Layers, ShieldCheck, Sparkles, X } from 'lucide-react';
import { AiInsertConfig, InsertFrameDestination } from '../types';

interface AiInsertDestinationModalProps {
  isOpen: boolean;
  title: string;
  defaultLayerName: string;
  totalFrames: number;
  currentFrameIndex: number;
  selectedFrameIndices: number[];
  activeGroupName?: string | null;
  onCancel: () => void;
  onConfirm: (config: AiInsertConfig) => void;
}

export const AiInsertDestinationModal: React.FC<AiInsertDestinationModalProps> = ({
  isOpen,
  title,
  defaultLayerName,
  totalFrames,
  currentFrameIndex,
  selectedFrameIndices,
  activeGroupName,
  onCancel,
  onConfirm,
}) => {
  const [destination, setDestination] = useState<InsertFrameDestination>('current_frame');
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(Math.max(1, totalFrames));
  const [layerName, setLayerName] = useState(defaultLayerName);
  const [autoApplyAllFrames, setAutoApplyAllFrames] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setLayerName(defaultLayerName);
      setRangeStart(1);
      setRangeEnd(Math.max(1, totalFrames));
    }
  }, [isOpen, defaultLayerName, totalFrames]);

  if (!isOpen) return null;

  const options: { id: InsertFrameDestination; label: string; desc: string }[] = [
    {
      id: 'current_frame',
      label: `Solo en el fotograma actual (Frame #${currentFrameIndex + 1})`,
      desc: 'Inserta una nueva capa independiente únicamente en este fotograma.',
    },
    {
      id: 'all_frames',
      label: `En todos los fotogramas de la animación (${totalFrames} frames)`,
      desc: 'Crea una nueva capa independiente dentro de cada fotograma.',
    },
    {
      id: 'range',
      label: 'En un rango de fotogramas específico',
      desc: 'Elige desde qué fotograma inicial hasta qué fotograma final aplicar.',
    },
    {
      id: 'selected_frames',
      label: `En fotogramas seleccionados (${Math.max(1, selectedFrameIndices.length)} selec.)`,
      desc: 'Aplica solo en los fotogramas marcados en la línea de tiempo.',
    },
    {
      id: 'global_layer',
      label: 'Crear como Capa Global compartida',
      desc: 'Se muestra dinámicamente en todos los fotogramas sin duplicar datos ni alterar capas previas.',
    },
  ];

  return (
    <div className="fixed inset-0 z-[105] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div
        className="w-full max-w-lg rounded-xl border shadow-2xl overflow-hidden flex flex-col"
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
            <Sparkles className="w-4 h-4" style={{ color: 'var(--studio-accent)' }} />
            <div>
              <h3 className="text-xs font-bold">{title}</h3>
              <p className="text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>
                Inserción 100% no destructiva · Nunca sobrescribe tus capas existentes
              </p>
            </div>
          </div>
          <button type="button" onClick={onCancel} className="p-1 opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          <div className="px-2.5 py-2 rounded-lg border flex items-center gap-2 text-[11px]"
            style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}>
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Se creará siempre una <strong>nueva capa independiente</strong>
              {activeGroupName ? ` dentro del grupo "${activeGroupName}"` : ''}.
            </span>
          </div>

          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-[11px]" style={{ color: 'var(--studio-text-muted)' }}>
              Nombre de la nueva capa:
            </span>
            <input
              type="text"
              value={layerName}
              onChange={(e) => setLayerName(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border text-xs"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            />
          </label>

          <div className="flex flex-col gap-1.5">
            {options.map((opt) => {
              const active = destination === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDestination(opt.id)}
                  className="p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition-colors"
                  style={{
                    backgroundColor: active
                      ? 'color-mix(in srgb, var(--studio-accent) 14%, var(--studio-bg-card))'
                      : 'var(--studio-bg-card)',
                    borderColor: active ? 'var(--studio-accent)' : 'var(--studio-border)',
                  }}
                >
                  {opt.id === 'global_layer' ? (
                    <Globe className="w-4 h-4 mt-0.5 shrink-0 text-sky-400" />
                  ) : (
                    <Layers className="w-4 h-4 mt-0.5 shrink-0" style={{ color: active ? 'var(--studio-accent)' : 'var(--studio-text-muted)' }} />
                  )}
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold">{opt.label}</span>
                    <span className="text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>
                      {opt.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {destination === 'range' && (
            <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg border text-xs tabular-nums"
              style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}>
              <label className="flex flex-col gap-1">
                <span className="text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>Fotograma inicial:</span>
                <input
                  type="number"
                  min={1}
                  max={totalFrames}
                  value={rangeStart}
                  onChange={(e) => setRangeStart(Math.max(1, Math.min(totalFrames, parseInt(e.target.value, 10) || 1)))}
                  className="px-2 py-1 rounded border font-mono"
                  style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>Fotograma final:</span>
                <input
                  type="number"
                  min={1}
                  max={totalFrames}
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(Math.max(rangeStart, Math.min(totalFrames, parseInt(e.target.value, 10) || totalFrames)))}
                  className="px-2 py-1 rounded border font-mono"
                  style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
                />
              </label>
            </div>
          )}

          <label className="flex items-center gap-2 text-[11px] cursor-pointer">
            <input
              type="checkbox"
              checked={autoApplyAllFrames}
              onChange={(e) => setAutoApplyAllFrames(e.target.checked)}
              className="accent-amber-400"
            />
            <span>Aplicar automáticamente a todos los fotogramas en futuras inserciones rápidas</span>
          </label>
        </div>

        <div
          className="px-4 py-3 border-t flex justify-end gap-2"
          style={{ backgroundColor: 'var(--studio-bg-bar)', borderColor: 'var(--studio-border)' }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg border text-xs font-semibold"
            style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() =>
              onConfirm({
                destination,
                rangeStart: Math.max(0, rangeStart - 1),
                rangeEnd: Math.max(0, rangeEnd - 1),
                selectedFrameIndices: selectedFrameIndices.length > 0 ? selectedFrameIndices : [currentFrameIndex],
                layerName: layerName.trim() || defaultLayerName,
                wrapInGroup: false,
                autoApplyAllFrames,
              })
            }
            className="px-4 py-1.5 rounded-lg text-xs font-bold"
            style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
          >
            Insertar en Nueva Capa
          </button>
        </div>
      </div>
    </div>
  );
};
