import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckSquare,
  FileArchive,
  FileCode2,
  Film,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Save,
  Square,
  X,
} from 'lucide-react';
import { SaveAsFormatId } from '../types';

// =============================================================================
// 1. SINGLE MODIFIED DOCUMENT CLOSE / REPLACE DIALOG
// =============================================================================
interface UnsavedDocumentCloseModalProps {
  isOpen: boolean;
  documentName: string;
  width: number;
  height: number;
  isNewUnsaved: boolean;
  actionContext?: 'close' | 'replace';
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export const UnsavedDocumentCloseModal: React.FC<UnsavedDocumentCloseModalProps> = ({
  isOpen,
  documentName,
  width,
  height,
  isNewUnsaved,
  actionContext = 'close',
  onSave,
  onDiscard,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const title = isNewUnsaved
    ? '¿Desea guardar este documento?'
    : actionContext === 'replace'
    ? 'Cambios sin guardar en el proyecto actual'
    : 'Este proyecto contiene cambios sin guardar.';

  const subtitle = isNewUnsaved
    ? `"${documentName}" es un documento nuevo sin ubicación de guardado. Si cierra sin guardar, perderá el contenido actual.`
    : actionContext === 'replace'
    ? `"${documentName}" tiene modificaciones pendientes. ¿Desea guardar antes de continuar?`
    : '¿Desea guardar antes de cerrar?';

  return (
    <div
      className="fixed inset-0 z-[10100] flex items-center justify-center bg-black/75 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-slate-700/80 bg-[#12161f] text-slate-100 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[#0d1017]">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <h2 className="text-sm font-semibold text-slate-100">Confirmar cierre</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Cancelar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="text-sm font-medium text-slate-100 leading-snug">{title}</div>
          <p className="text-xs text-slate-300 leading-relaxed">{subtitle}</p>
          <div className="px-3 py-2 rounded border border-slate-800 bg-[#0d1017] text-xs text-slate-300 flex items-center justify-between gap-2">
            <span className="font-medium text-slate-100 truncate">{documentName} *</span>
            <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
              {width} × {height} px
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-800 bg-[#0d1017]">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded text-xs font-medium text-slate-300 border border-slate-700 hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="px-3 py-1.5 rounded text-xs font-medium text-rose-300 border border-rose-500/40 bg-rose-950/30 hover:bg-rose-900/50 transition-colors"
          >
            No Guardar
          </button>
          <button
            type="button"
            onClick={onSave}
            className="px-4 py-1.5 rounded text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// 2. MULTI-DOCUMENT APPLICATION CLOSE / EXIT CHECKLIST MODAL
// =============================================================================
export interface ModifiedDocumentSummary {
  id: string;
  name: string;
  width: number;
  height: number;
  isNewUnsaved: boolean;
}

interface UnsavedAppCloseModalProps {
  isOpen: boolean;
  modifiedDocuments: ModifiedDocumentSummary[];
  isProcessing?: boolean;
  onSaveSelected: (selectedIds: string[]) => void;
  onDiscardAll: () => void;
  onCancel: () => void;
}

export const UnsavedAppCloseModal: React.FC<UnsavedAppCloseModalProps> = ({
  isOpen,
  modifiedDocuments,
  isProcessing = false,
  onSaveSelected,
  onDiscardAll,
  onCancel,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(modifiedDocuments.map((d) => d.id));
    }
  }, [isOpen, modifiedDocuments]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isProcessing, onCancel]);

  if (!isOpen) return null;

  const allSelected =
    modifiedDocuments.length > 0 && selectedIds.length === modifiedDocuments.length;

  const toggleDoc = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div
      className="fixed inset-0 z-[10120] flex items-center justify-center bg-black/80 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onCancel();
      }}
    >
      <div className="w-full max-w-lg rounded-lg border border-slate-700/80 bg-[#12161f] text-slate-100 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[#0d1017]">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <h2 className="text-sm font-semibold text-slate-100">
              Documentos con cambios sin guardar
            </h2>
          </div>
          <button
            type="button"
            disabled={isProcessing}
            onClick={onCancel}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-40 transition-colors"
            title="Cancelar cierre"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-300 leading-relaxed">
            Los siguientes proyectos contienen cambios sin guardar. Seleccione los que desea guardar antes de cerrar:
          </p>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>{modifiedDocuments.length} documento(s) modificados</span>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() =>
                setSelectedIds(allSelected ? [] : modifiedDocuments.map((d) => d.id))
              }
              className="text-amber-400 hover:text-amber-300 transition-colors"
            >
              {allSelected ? 'Desmarcar todos' : 'Seleccionar todos'}
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/80 rounded-md border border-slate-800 bg-[#0d1017]">
            {modifiedDocuments.map((doc) => {
              const checked = selectedIds.includes(doc.id);
              return (
                <button
                  key={doc.id}
                  type="button"
                  disabled={isProcessing}
                  onClick={() => toggleDoc(doc.id)}
                  className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-100 truncate">
                        {doc.name} <span className="text-amber-400">*</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {doc.isNewUnsaved ? 'Documento nuevo sin guardar' : 'Modificaciones pendientes'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
                    {doc.width} × {doc.height} px
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-3 border-t border-slate-800 bg-[#0d1017]">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onCancel}
            className="px-3 py-1.5 rounded text-xs font-medium text-slate-300 border border-slate-700 hover:bg-slate-800 disabled:opacity-40 transition-colors"
          >
            Cancelar cierre
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={onDiscardAll}
            className="px-3 py-1.5 rounded text-xs font-medium text-rose-300 border border-rose-500/40 bg-rose-950/30 hover:bg-rose-900/50 disabled:opacity-40 transition-colors"
          >
            No guardar
          </button>
          <button
            type="button"
            disabled={isProcessing || selectedIds.length === 0}
            onClick={() => onSaveSelected(selectedIds)}
            className="px-4 py-1.5 rounded text-xs font-semibold bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 transition-colors"
          >
            {isProcessing ? 'Guardando...' : `Guardar seleccionados (${selectedIds.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// 3. "GUARDAR COMO..." FORMAT SELECTOR MODAL
// =============================================================================
interface SaveFormatEntry {
  id: SaveAsFormatId;
  label: string;
  extension: string;
  description: string;
  supportsScale: boolean;
  icon: React.ReactNode;
}

const SAVE_FORMAT_ENTRIES: SaveFormatEntry[] = [
  {
    id: 'pcs',
    label: 'Proyecto PixelClash',
    extension: '.pcs',
    description: 'Formato nativo completo: conserva capas, grupos, frames, hitboxes y vectores.',
    supportsScale: false,
    icon: <FileArchive className="w-4 h-4 text-amber-400" />,
  },
  {
    id: 'png',
    label: 'PNG (Imagen sin pérdida)',
    extension: '.png',
    description: 'Imagen del fotograma actual conservando canal alfa transparente.',
    supportsScale: true,
    icon: <ImageIcon className="w-4 h-4 text-emerald-400" />,
  },
  {
    id: 'jpg',
    label: 'JPG (Comprimido)',
    extension: '.jpg',
    description: 'Imagen ligera compatible con cualquier visor (usa color de fondo).',
    supportsScale: true,
    icon: <ImageIcon className="w-4 h-4 text-sky-400" />,
  },
  {
    id: 'webp',
    label: 'WEBP',
    extension: '.webp',
    description: 'Formato web moderno con transparencia y compresión eficiente.',
    supportsScale: true,
    icon: <ImageIcon className="w-4 h-4 text-cyan-400" />,
  },
  {
    id: 'gif',
    label: 'GIF Animado',
    extension: '.gif',
    description: 'Exporta todos los fotogramas de la animación con transparencia.',
    supportsScale: true,
    icon: <Film className="w-4 h-4 text-violet-400" />,
  },
  {
    id: 'spritesheet',
    label: 'Spritesheet PNG',
    extension: '_spritesheet.png',
    description: 'Hoja de sprites horizontal con todos los fotogramas para motores 2D.',
    supportsScale: true,
    icon: <LayoutGrid className="w-4 h-4 text-orange-400" />,
  },
  {
    id: 'ase',
    label: 'Aseprite',
    extension: '.ase',
    description: 'Compatible con Aseprite (capas, frames, tiempos y etiquetas).',
    supportsScale: false,
    icon: <Layers className="w-4 h-4 text-teal-400" />,
  },
  {
    id: 'psd',
    label: 'Adobe Photoshop',
    extension: '.psd',
    description: 'Documento por capas con opacidad y transparencia.',
    supportsScale: false,
    icon: <Layers className="w-4 h-4 text-blue-400" />,
  },
  {
    id: 'json',
    label: 'Proyecto JSON',
    extension: '.json',
    description: 'Respaldo editable de datos del proyecto en texto estructurado.',
    supportsScale: false,
    icon: <FileCode2 className="w-4 h-4 text-slate-400" />,
  },
];

interface SaveAsFormatModalProps {
  isOpen: boolean;
  initialName: string;
  initialFormat?: SaveAsFormatId;
  width: number;
  height: number;
  framesCount: number;
  isSaving?: boolean;
  onConfirm: (options: {
    fileName: string;
    format: SaveAsFormatId;
    scale: number;
    jpgBackgroundColor: string;
  }) => void;
  onCancel: () => void;
}

export const SaveAsFormatModal: React.FC<SaveAsFormatModalProps> = ({
  isOpen,
  initialName,
  initialFormat = 'pcs',
  width,
  height,
  framesCount,
  isSaving = false,
  onConfirm,
  onCancel,
}) => {
  const [fileName, setFileName] = useState(initialName);
  const [format, setFormat] = useState<SaveAsFormatId>(initialFormat);
  const [scale, setScale] = useState<number>(1);
  const [jpgBg, setJpgBg] = useState<string>('#11141c');

  useEffect(() => {
    if (!isOpen) return;
    setFileName(initialName || 'Proyecto');
    setFormat(initialFormat || 'pcs');
    setScale(1);
  }, [isOpen, initialName, initialFormat]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isSaving, onCancel]);

  if (!isOpen) return null;

  const activeEntry =
    SAVE_FORMAT_ENTRIES.find((item) => item.id === format) || SAVE_FORMAT_ENTRIES[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    onConfirm({
      fileName: fileName.trim() || 'Proyecto',
      format,
      scale,
      jpgBackgroundColor: jpgBg,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[10130] flex items-center justify-center bg-black/80 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSaving) onCancel();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl rounded-lg border border-slate-700/80 bg-[#12161f] text-slate-100 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[#0d1017]">
          <div className="flex items-center gap-2.5">
            <Save className="w-4 h-4 text-amber-400 shrink-0" />
            <h2 className="text-sm font-semibold text-slate-100">Guardar como...</h2>
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={onCancel}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-40 transition-colors"
            title="Cancelar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* File name row */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="pcs-save-as-name" className="text-slate-300 font-medium">
                Nombre del archivo
              </label>
              <span className="text-[11px] text-slate-400 tabular-nums">
                {width} × {height} px · {framesCount} frame{framesCount === 1 ? '' : 's'}
              </span>
            </div>
            <div className="flex items-center rounded-md border border-slate-700 bg-[#0d1017] focus-within:border-amber-500/80 overflow-hidden">
              <input
                id="pcs-save-as-name"
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                autoFocus
                placeholder="Nombre del proyecto"
                className="flex-1 bg-transparent px-3 py-2 text-xs text-slate-100 focus:outline-none"
              />
              <span className="px-3 py-2 text-xs font-mono text-amber-400 border-l border-slate-800 bg-[#151a25]">
                {activeEntry.extension}
              </span>
            </div>
          </div>

          {/* Format selector grid */}
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium mb-2">
              Formato de salida
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {SAVE_FORMAT_ENTRIES.map((entry) => {
                const selected = entry.id === format;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setFormat(entry.id)}
                    className={`flex items-start gap-2.5 text-left px-3 py-2.5 rounded-md border transition-colors ${
                      selected
                        ? 'border-amber-500/80 bg-amber-500/10'
                        : 'border-slate-800 bg-[#0f131b] hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">{entry.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-slate-100 truncate">
                          {entry.label}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 shrink-0">
                          {entry.extension}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                        {entry.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Format-specific export controls */}
          {(activeEntry.supportsScale || format === 'jpg') && (
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-3 text-xs">
              {activeEntry.supportsScale && (
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-300">Escala de exportación</span>
                  <div className="inline-flex rounded border border-slate-700 overflow-hidden">
                    {[1, 2, 4].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setScale(s)}
                        className={`px-2.5 py-1 text-xs tabular-nums transition-colors ${
                          scale === s
                            ? 'bg-amber-500 text-slate-950 font-semibold'
                            : 'bg-[#0d1017] text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {s}×
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    ({width * scale} × {height * scale} px)
                  </span>
                </div>
              )}

              {format === 'jpg' && (
                <label className="flex items-center gap-2 text-slate-300">
                  <span>Fondo JPG</span>
                  <input
                    type="color"
                    value={jpgBg}
                    onChange={(e) => setJpgBg(e.target.value)}
                    className="h-6 w-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                </label>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-800 bg-[#0d1017]">
          <button
            type="button"
            disabled={isSaving}
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded text-xs font-medium text-slate-300 border border-slate-700 hover:bg-slate-800 disabled:opacity-40 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-1.5 rounded text-xs font-semibold bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 transition-colors"
          >
            {isSaving ? 'Guardando...' : `Guardar (${activeEntry.extension})`}
          </button>
        </div>
      </form>
    </div>
  );
};
