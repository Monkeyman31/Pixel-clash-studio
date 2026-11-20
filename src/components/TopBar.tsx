import React from 'react';
import {
  Download,
  Undo2,
  Redo2,
  Search,
  Maximize2,
} from 'lucide-react';
import { PixelClashLogoIcon } from './PixelClashLogoIcon';

interface TopBarProps {
  projectName?: string;
  canvasWidth: number;
  canvasHeight: number;
  onOpenCanvasSizeModal: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenExport: () => void;
  onOpenCommandSearch?: () => void;
  embeddedInDock?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  projectName,
  canvasWidth,
  canvasHeight,
  onOpenCanvasSizeModal,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenExport,
  onOpenCommandSearch,
  embeddedInDock = false,
}) => {
  return (
    <header
      className={
        embeddedInDock
          ? 'px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2 select-none'
          : 'h-11 border-b px-3.5 flex items-center justify-between gap-3 shrink-0 z-30 select-none'
      }
      style={{
        backgroundColor: 'var(--studio-bg-header)',
        borderColor: 'var(--studio-border)',
        color: 'var(--studio-text)',
      }}
    >
      {/* Zone 1: Brand + Active Document Name + Dimension Trigger */}
      <div className="flex items-center gap-2.5 shrink-0 min-w-0">
        <PixelClashLogoIcon size={28} className="shadow-sm" />
        <span
          className="text-sm font-bold tracking-tight whitespace-nowrap"
          style={{ color: 'var(--studio-text)' }}
        >
          PixelClash Studio
        </span>

        {projectName && (
          <span
            className="hidden lg:inline text-xs truncate max-w-[170px]"
            style={{ color: 'var(--studio-text-muted)' }}
            title={projectName}
          >
            / {projectName}
          </span>
        )}

        <div className="h-4 w-[1px] mx-0.5 shrink-0" style={{ backgroundColor: 'var(--studio-border)' }} />

        <button
          type="button"
          onClick={onOpenCanvasSizeModal}
          title="Cambiar dimensiones del lienzo (Imagen → Tamaño de Lienzo)"
          className="px-2 py-1 rounded text-xs font-mono tabular-nums flex items-center gap-1.5 border transition-colors hover:opacity-90 cursor-pointer shrink-0"
          style={{
            backgroundColor: 'var(--studio-bg-card)',
            borderColor: 'var(--studio-border)',
            color: 'var(--studio-text)',
          }}
        >
          <Maximize2 className="w-3 h-3 opacity-70" />
          <span>
            {canvasWidth}×{canvasHeight} px
          </span>
        </button>
      </div>

      {/* Zone 2: Essential History Actions */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          data-help-id="action.undo"
          onClick={onUndo}
          disabled={!canUndo}
          title="Deshacer (Ctrl+Z)"
          className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
            canUndo
              ? 'text-slate-200 hover:text-white hover:bg-[#23293a] cursor-pointer'
              : 'text-slate-600 cursor-not-allowed'
          }`}
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span className="hidden md:inline text-[11px] font-medium">Deshacer</span>
        </button>
        <button
          type="button"
          data-help-id="action.redo"
          onClick={onRedo}
          disabled={!canRedo}
          title="Rehacer (Ctrl+Y)"
          className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
            canRedo
              ? 'text-slate-200 hover:text-white hover:bg-[#23293a] cursor-pointer'
              : 'text-slate-600 cursor-not-allowed'
          }`}
        >
          <Redo2 className="w-3.5 h-3.5" />
          <span className="hidden md:inline text-[11px] font-medium">Rehacer</span>
        </button>
      </div>

      {/* Zone 3: Quick Command Search & Primary Export CTA */}
      <div className="flex items-center gap-2 shrink-0">
        {onOpenCommandSearch && (
          <button
            type="button"
            onClick={onOpenCommandSearch}
            title="Buscar herramientas, paneles o comandos (F1)"
            className="px-2.5 py-1 rounded-md text-xs flex items-center gap-1.5 border transition-colors hover:opacity-90 cursor-pointer"
            style={{
              backgroundColor: 'var(--studio-bg-card)',
              borderColor: 'var(--studio-border)',
              color: 'var(--studio-text-muted)',
            }}
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Buscar</span>
            <kbd
              className="hidden sm:inline px-1 py-0.2 rounded text-[9px] font-mono border"
              style={{
                backgroundColor: 'var(--studio-bg-bar)',
                borderColor: 'var(--studio-border)',
              }}
            >
              F1
            </kbd>
          </button>
        )}

        <button
          type="button"
          data-help-id="action.export"
          onClick={onOpenExport}
          className="px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm active:scale-98 hover:opacity-90 cursor-pointer"
          style={{
            backgroundColor: 'var(--studio-accent)',
            color: 'var(--studio-accent-text)',
          }}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar Assets</span>
        </button>
      </div>
    </header>
  );
};
