import React, { useState } from 'react';
import {
  Download,
  Undo2,
  Redo2,
  Search,
  Maximize2,
  Home,
  FileText,
  Plus,
  X,
  Minus,
  Square,
  Copy,
} from 'lucide-react';
import { PixelClashLogoIcon } from './PixelClashLogoIcon';
import { getDesktopBridge } from '../utils/desktopBridge';

export interface TopBarDocumentTab {
  id: string;
  name: string;
  width: number;
  height: number;
  isDirty: boolean;
  isNewUnsaved: boolean;
  hasSavedLocation: boolean;
}

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
  onGoToHomeScreen?: () => void;
  openDocumentsCount?: number;
  embeddedInDock?: boolean;
  // Integrated Custom Window Frame props
  openDocuments?: TopBarDocumentTab[];
  activeDocumentId?: string;
  showIntegratedTabs?: boolean;
  onSelectDocumentTab?: (docId: string) => void;
  onCloseDocumentTab?: (docId: string) => void;
  onReorderDocumentTabs?: (draggedId: string, targetId: string) => void;
  onNewDocument?: () => void;
  dragEmptySpace?: boolean;
  isWindowMaximized?: boolean;
  onMinimizeWindow?: () => void;
  onToggleMaximizeWindow?: () => void;
  onCloseApplicationWindow?: () => void;
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
  onGoToHomeScreen,
  openDocumentsCount = 1,
  embeddedInDock = false,
  openDocuments = [],
  activeDocumentId,
  showIntegratedTabs = true,
  onSelectDocumentTab,
  onCloseDocumentTab,
  onReorderDocumentTabs,
  onNewDocument,
  dragEmptySpace = true,
  isWindowMaximized = false,
  onMinimizeWindow,
  onToggleMaximizeWindow,
  onCloseApplicationWindow,
}) => {
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const activeDoc =
    openDocuments.find((d) => d.id === activeDocumentId) || openDocuments[0] || null;

  const dragClass = !embeddedInDock && dragEmptySpace ? 'studio-window-drag' : '';
  const canDragHeader = !embeddedInDock && dragEmptySpace;

  return (
    <header
      data-tauri-drag-region={canDragHeader ? 'true' : undefined}
      onMouseDown={(e) => {
        if (!canDragHeader || e.button !== 0 || e.detail >= 2) return;
        const target = e.target as HTMLElement;
        if (target.closest('button, input, select, textarea, a, [role="button"], [data-tab-item="true"], .studio-window-no-drag')) {
          return;
        }
        void getDesktopBridge()?.startWindowDragging?.();
      }}
      onDoubleClick={(e) => {
        if (embeddedInDock || !onToggleMaximizeWindow) return;
        const target = e.target as HTMLElement;
        if (target.closest('button, input, select, a, [data-tab-item="true"]')) return;
        onToggleMaximizeWindow();
      }}
      className={
        embeddedInDock
          ? 'px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2 select-none'
          : `h-10 border-b px-2.5 flex items-center justify-between gap-2 shrink-0 z-30 select-none ${dragClass}`
      }
      style={{
        backgroundColor: 'var(--studio-bg-header)',
        borderColor: 'var(--studio-border)',
        color: 'var(--studio-text)',
      }}
    >
      {/* Zone 1: PixelClash Brand + Inicio + Active Project Status */}
      <div className="flex items-center gap-2 shrink-0 min-w-0 studio-window-no-drag">
        <div className="flex items-center gap-1.5 shrink-0">
          <PixelClashLogoIcon size={24} className="shadow-sm shrink-0" />
          <span
            className="text-xs font-bold tracking-tight whitespace-nowrap hidden sm:inline"
            style={{ color: 'var(--studio-text)' }}
          >
            PixelClash Studio
          </span>
        </div>

        {onGoToHomeScreen && (
          <button
            type="button"
            onClick={onGoToHomeScreen}
            title={`Ir al Menú Principal sin cerrar tus proyectos (${openDocumentsCount} abierto${openDocumentsCount === 1 ? '' : 's'})`}
            className="px-2 py-1 rounded border text-[11px] font-semibold flex items-center gap-1.5 transition-colors hover:bg-white/10 cursor-pointer shrink-0 whitespace-nowrap"
            style={{
              backgroundColor: 'var(--studio-bg-card)',
              borderColor: 'var(--studio-border-strong)',
              color: 'var(--studio-text)',
            }}
          >
            <Home className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Inicio</span>
          </button>
        )}

        {activeDoc ? (
          <div
            className="hidden lg:flex items-center gap-1.5 text-xs min-w-0 max-w-[200px] pl-1 border-l"
            style={{ borderColor: 'var(--studio-border)' }}
            title={`${activeDoc.name}${
              activeDoc.isDirty
                ? ' · Modificado sin guardar'
                : activeDoc.isNewUnsaved
                ? ' · Nuevo documento'
                : ' · Guardado'
            }`}
          >
            <span className="font-semibold truncate">{activeDoc.name}</span>
            {activeDoc.isDirty && (
              <span className="text-amber-400 font-bold leading-none shrink-0">*</span>
            )}
            <span
              className="text-[10px] shrink-0 whitespace-nowrap"
              style={{ color: 'var(--studio-text-muted)' }}
            >
              {activeDoc.isDirty
                ? '· Sin guardar'
                : activeDoc.isNewUnsaved
                ? '· Nuevo'
                : '· Guardado'}
            </span>
          </div>
        ) : (
          projectName && (
            <span
              className="hidden lg:inline text-xs truncate max-w-[160px]"
              style={{ color: 'var(--studio-text-muted)' }}
              title={projectName}
            >
              / {projectName}
            </span>
          )
        )}
      </div>

      {/* Zone 2: Integrated Document Tabs + Draggable Spacer */}
      {showIntegratedTabs && openDocuments.length > 0 && onSelectDocumentTab ? (
        <div className="flex-1 min-w-0 flex items-end h-full gap-1 px-1 overflow-x-auto">
          <div className="flex items-end gap-1 h-full pt-1.5 studio-window-no-drag">
            {openDocuments.map((doc) => {
              const isActive = doc.id === activeDocumentId;
              const statusText = doc.isDirty
                ? 'Modificado · Cambios sin guardar'
                : doc.isNewUnsaved
                ? 'Nuevo sin guardar'
                : 'Guardado';
              return (
                <div
                  key={doc.id}
                  data-tab-item="true"
                  draggable={openDocuments.length > 1}
                  onDragStart={() => setDraggedTabId(doc.id)}
                  onDragOver={(e) => {
                    if (draggedTabId && draggedTabId !== doc.id) {
                      e.preventDefault();
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedTabId && draggedTabId !== doc.id) {
                      onReorderDocumentTabs?.(draggedTabId, doc.id);
                    }
                    setDraggedTabId(null);
                  }}
                  onDragEnd={() => setDraggedTabId(null)}
                  onClick={() => onSelectDocumentTab(doc.id)}
                  title={`${doc.name} · ${statusText} (${doc.width}×${doc.height} px)`}
                  className="flex items-center gap-1.5 px-2.5 h-[28px] rounded-t-md border border-b-0 cursor-pointer transition-colors shrink-0 whitespace-nowrap text-[11px]"
                  style={{
                    backgroundColor: isActive
                      ? 'var(--studio-bg-bar)'
                      : 'rgba(255, 255, 255, 0.03)',
                    borderColor: isActive
                      ? 'var(--studio-accent)'
                      : 'var(--studio-border)',
                    color: isActive ? 'var(--studio-text)' : 'var(--studio-text-muted)',
                    opacity: draggedTabId === doc.id ? 0.5 : 1,
                  }}
                >
                  <FileText
                    className="w-3 h-3 shrink-0"
                    style={{ color: isActive ? 'var(--studio-accent)' : undefined }}
                  />
                  <span className="font-medium truncate max-w-[125px]">{doc.name}</span>
                  {doc.isDirty && (
                    <span
                      className="text-amber-400 font-bold text-xs leading-none shrink-0"
                      title="Cambios sin guardar"
                    >
                      *
                    </span>
                  )}
                  <span className="text-[9px] font-mono tabular-nums opacity-60 hidden md:inline shrink-0">
                    {doc.width}×{doc.height}
                  </span>
                  {onCloseDocumentTab && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseDocumentTab(doc.id);
                      }}
                      title={
                        doc.isDirty
                          ? 'Cerrar documento (hay cambios sin guardar)'
                          : 'Cerrar documento'
                      }
                      className="p-0.5 rounded hover:bg-rose-500/20 hover:text-rose-400 transition-colors shrink-0"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              );
            })}
            {onNewDocument && (
              <button
                type="button"
                onClick={onNewDocument}
                title="Nuevo documento (Ctrl+N)"
                className="p-1.5 mb-0.5 rounded hover:bg-white/10 transition-colors shrink-0"
                style={{ color: 'var(--studio-text-muted)' }}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {/* Empty flexible region to grab & drag window */}
          <div
            className={`flex-1 min-w-[28px] h-full ${dragClass}`}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onToggleMaximizeWindow?.();
            }}
            title="Arrastra para mover la ventana · Doble clic para maximizar o restaurar"
          />
        </div>
      ) : (
        <div
          className={`flex-1 min-w-[28px] h-full ${dragClass}`}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onToggleMaximizeWindow?.();
          }}
        />
      )}

      {/* Zone 3: Quick Canvas Dimensions + History + Search + Export + Custom Window Controls */}
      <div className="flex items-center gap-1.5 shrink-0 studio-window-no-drag">
        <button
          type="button"
          onClick={onOpenCanvasSizeModal}
          title="Cambiar dimensiones del lienzo (Imagen → Tamaño de Lienzo)"
          className="px-2 py-1 rounded text-[11px] font-mono tabular-nums hidden xl:flex items-center gap-1 border transition-colors hover:opacity-90 cursor-pointer shrink-0 whitespace-nowrap"
          style={{
            backgroundColor: 'var(--studio-bg-card)',
            borderColor: 'var(--studio-border)',
            color: 'var(--studio-text)',
          }}
        >
          <Maximize2 className="w-3 h-3 opacity-70" />
          <span>
            {canvasWidth}×{canvasHeight}
          </span>
        </button>

        <div className="hidden md:flex items-center gap-0.5">
          <button
            type="button"
            data-help-id="action.undo"
            onClick={onUndo}
            disabled={!canUndo}
            title="Deshacer (Ctrl+Z)"
            className={`p-1.5 rounded text-xs transition-colors ${
              canUndo
                ? 'text-slate-200 hover:text-white hover:bg-white/10 cursor-pointer'
                : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            data-help-id="action.redo"
            onClick={onRedo}
            disabled={!canRedo}
            title="Rehacer (Ctrl+Y)"
            className={`p-1.5 rounded text-xs transition-colors ${
              canRedo
                ? 'text-slate-200 hover:text-white hover:bg-white/10 cursor-pointer'
                : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {onOpenCommandSearch && (
          <button
            type="button"
            onClick={onOpenCommandSearch}
            title="Buscar herramientas, paneles o comandos (F1)"
            className="px-2 py-1 rounded text-xs flex items-center gap-1 border transition-colors hover:opacity-90 cursor-pointer shrink-0 whitespace-nowrap"
            style={{
              backgroundColor: 'var(--studio-bg-card)',
              borderColor: 'var(--studio-border)',
              color: 'var(--studio-text-muted)',
            }}
          >
            <Search className="w-3.5 h-3.5" />
            <kbd
              className="hidden lg:inline px-1 rounded text-[9px] font-mono border"
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
          className="px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm hover:opacity-90 cursor-pointer shrink-0 whitespace-nowrap"
          style={{
            backgroundColor: 'var(--studio-accent)',
            color: 'var(--studio-accent-text)',
          }}
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Exportar</span>
        </button>

        {/* Integrated Native-Style Window Frame Controls */}
        {!embeddedInDock && (onMinimizeWindow || onToggleMaximizeWindow || onCloseApplicationWindow) && (
          <div
            className="flex items-center pl-1.5 ml-1 border-l gap-0.5 shrink-0"
            style={{ borderColor: 'var(--studio-border)' }}
          >
            {onMinimizeWindow && (
              <button
                type="button"
                onClick={onMinimizeWindow}
                title="Minimizar ventana"
                aria-label="Minimizar ventana"
                className="w-8 h-7 rounded flex items-center justify-center transition-colors hover:bg-white/10 cursor-pointer"
                style={{ color: 'var(--studio-text-muted)' }}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            )}
            {onToggleMaximizeWindow && (
              <button
                type="button"
                onClick={onToggleMaximizeWindow}
                title={isWindowMaximized ? 'Restaurar tamaño de ventana' : 'Maximizar ventana'}
                aria-label={isWindowMaximized ? 'Restaurar ventana' : 'Maximizar ventana'}
                className="w-8 h-7 rounded flex items-center justify-center transition-colors hover:bg-white/10 cursor-pointer"
                style={{ color: 'var(--studio-text-muted)' }}
              >
                {isWindowMaximized ? (
                  <Copy className="w-3 h-3" />
                ) : (
                  <Square className="w-3 h-3" />
                )}
              </button>
            )}
            {onCloseApplicationWindow && (
              <button
                type="button"
                onClick={onCloseApplicationWindow}
                title="Cerrar aplicación (verifica documentos sin guardar)"
                aria-label="Cerrar aplicación"
                className="w-8 h-7 rounded flex items-center justify-center transition-colors hover:bg-rose-600 hover:text-white cursor-pointer"
                style={{ color: 'var(--studio-text-muted)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
