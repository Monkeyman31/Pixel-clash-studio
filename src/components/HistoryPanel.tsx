import React from 'react';
import { History, Undo2, Redo2, RotateCcw } from 'lucide-react';

interface HistoryPanelProps {
  historyCount: number;
  historyIndex: number;
  onJumpToHistory: (targetIndex: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  historyCount,
  historyIndex,
  onJumpToHistory,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => {
  const indices = Array.from({ length: historyCount }, (_, i) => historyCount - 1 - i);

  return (
    <div className="p-2.5 flex flex-col gap-2 select-none">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold flex items-center gap-1.5">
          <History className="w-3.5 h-3.5" style={{ color: 'var(--studio-accent)' }} />
          <span>Estados ({historyIndex + 1}/{historyCount})</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            title="Deshacer (Ctrl+Z)"
            className="p-1 rounded border disabled:opacity-35"
            style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={onRedo}
            title="Rehacer (Ctrl+Shift+Z)"
            className="p-1 rounded border disabled:opacity-35"
            style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-0.5">
        {indices.map((idx) => {
          const isCurrent = idx === historyIndex;
          const isFuture = idx > historyIndex;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onJumpToHistory(idx)}
              className="px-2 py-1.5 rounded border text-left text-[11px] font-mono flex items-center justify-between transition-colors"
              style={{
                backgroundColor: isCurrent
                  ? 'color-mix(in srgb, var(--studio-accent) 18%, var(--studio-bg-card))'
                  : 'var(--studio-bg-card)',
                borderColor: isCurrent ? 'var(--studio-accent)' : 'var(--studio-border)',
                color: isFuture ? 'var(--studio-text-muted)' : 'var(--studio-text)',
                opacity: isFuture ? 0.55 : 1,
              }}
            >
              <span className="flex items-center gap-1.5">
                <RotateCcw className="w-3 h-3 opacity-60" />
                <span>{idx === 0 ? 'Estado Inicial' : `Paso de Edición #${idx}`}</span>
              </span>
              {isCurrent && (
                <span className="text-[9px] font-bold" style={{ color: 'var(--studio-accent)' }}>
                  ACTIVO
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
