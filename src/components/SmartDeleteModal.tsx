import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Check, Trash2, Undo2, X } from 'lucide-react';
import { SmartDeleteCandidate } from '../types';
import { STUDIO_Z } from './StudioTopLayer';

interface SmartDeleteModalProps {
  isOpen: boolean;
  candidates: SmartDeleteCandidate[];
  onConfirm: (candidate: SmartDeleteCandidate) => void;
  onCancel: () => void;
}

export const SmartDeleteModal: React.FC<SmartDeleteModalProps> = ({
  isOpen,
  candidates,
  onConfirm,
  onCancel,
}) => {
  const [selectedId, setSelectedId] = useState<string>('');

  useEffect(() => {
    if (isOpen && candidates.length > 0) {
      setSelectedId(candidates[0].id);
    }
  }, [isOpen, candidates]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const chosen = candidates.find((c) => c.id === selectedId) || candidates[0];
        if (chosen) onConfirm(chosen);
      } else if (e.key === 'ArrowDown' && candidates.length > 1) {
        e.preventDefault();
        const idx = candidates.findIndex((c) => c.id === selectedId);
        const next = candidates[(idx + 1) % candidates.length];
        if (next) setSelectedId(next.id);
      } else if (e.key === 'ArrowUp' && candidates.length > 1) {
        e.preventDefault();
        const idx = candidates.findIndex((c) => c.id === selectedId);
        const prev = candidates[(idx - 1 + candidates.length) % candidates.length];
        if (prev) setSelectedId(prev.id);
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [isOpen, candidates, selectedId, onConfirm, onCancel]);

  if (!isOpen || candidates.length === 0) return null;

  const isConflict = candidates.length > 1;
  const activeCandidate = candidates.find((c) => c.id === selectedId) || candidates[0];

  const modalNode = (
    <div
      className="fixed inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: STUDIO_Z.CRITICAL_DIALOG }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--studio-bg-panel)',
          borderColor: 'var(--studio-border-strong)',
          color: 'var(--studio-text)',
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 border-b flex items-center justify-between gap-2"
          style={{
            backgroundColor: 'var(--studio-bg-bar)',
            borderColor: 'var(--studio-border)',
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              {isConflict ? <AlertTriangle className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">
                {isConflict ? '¿Desea eliminar?' : 'Confirmar eliminación'}
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--studio-text-muted)' }}>
                {isConflict
                  ? 'Hay varios elementos seleccionados. Elige el destino exacto:'
                  : 'Acción sobre elemento crítico o múltiple'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: 'var(--studio-text-muted)' }}
            title="Cancelar (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto">
          {isConflict ? (
            <div className="flex flex-col gap-1.5">
              {candidates.map((cand) => {
                const selected = cand.id === activeCandidate.id;
                return (
                  <button
                    key={cand.id}
                    type="button"
                    onClick={() => setSelectedId(cand.id)}
                    onDoubleClick={() => onConfirm(cand)}
                    className="w-full px-3 py-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-colors cursor-pointer"
                    style={{
                      backgroundColor: selected
                        ? 'rgba(244, 63, 94, 0.14)'
                        : 'var(--studio-bg-card)',
                      borderColor: selected ? '#fb7185' : 'var(--studio-border)',
                    }}
                  >
                    <span
                      className="mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0"
                      style={{
                        borderColor: selected ? '#fb7185' : 'var(--studio-border-strong)',
                        backgroundColor: selected ? '#fb7185' : 'transparent',
                      }}
                    >
                      {selected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold truncate">{cand.label}</span>
                        <span
                          className="text-[10px] font-mono tabular-nums shrink-0"
                          style={{ color: selected ? '#fda4af' : 'var(--studio-text-muted)' }}
                        >
                          {cand.affectedCount} {cand.affectedCount === 1 ? 'elemento' : 'elementos'}
                        </span>
                      </div>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--studio-text-muted)' }}>
                        {cand.detail}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div
              className="rounded-xl border p-3 flex flex-col gap-2"
              style={{
                backgroundColor: 'var(--studio-bg-card)',
                borderColor: 'var(--studio-border)',
              }}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span style={{ color: 'var(--studio-text-muted)' }}>Elemento activo:</span>
                <span className="font-bold text-rose-300">{activeCandidate.label}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span style={{ color: 'var(--studio-text-muted)' }}>Cantidad afectada:</span>
                <span className="font-mono font-bold tabular-nums text-amber-300">
                  {activeCandidate.affectedCount}{' '}
                  {activeCandidate.affectedCount === 1 ? 'elemento' : 'elementos'}
                </span>
              </div>
              <div
                className="pt-2 border-t text-[11px] leading-relaxed"
                style={{ borderColor: 'var(--studio-border)', color: 'var(--studio-text-muted)' }}
              >
                {activeCandidate.detail}
              </div>
            </div>
          )}

          <div
            className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1.5 rounded-lg border"
            style={{
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: 'var(--studio-border)',
              color: 'var(--studio-text-muted)',
            }}
          >
            <Undo2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>Esta eliminación se registra en el historial: puedes revertirla con Ctrl+Z.</span>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-4 py-2.5 border-t flex items-center justify-between gap-2"
          style={{
            backgroundColor: 'var(--studio-bg-bar)',
            borderColor: 'var(--studio-border)',
          }}
        >
          <span className="text-[10px] font-mono" style={{ color: 'var(--studio-text-muted)' }}>
            {isConflict ? '↑↓ Elegir · Enter Eliminar · Esc Cancelar' : 'Enter Confirmar · Esc Cancelar'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-white/5 transition-colors cursor-pointer"
              style={{
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onConfirm(activeCandidate)}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Eliminar ({activeCandidate.affectedCount})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalNode, document.body);
  }
  return modalNode;
};
