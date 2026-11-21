import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckSquare,
  Clapperboard,
  FileArchive,
  FileCode2,
  Film,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  ListChecks,
  Save,
  Square,
  X,
} from 'lucide-react';
import { SaveAsFormatId } from '../types';

// =============================================================================
// 1. SINGLE / SEQUENTIAL MODIFIED DOCUMENT CLOSE / REPLACE DIALOG
// =============================================================================
interface UnsavedDocumentCloseModalProps {
  isOpen: boolean;
  documentName: string;
  width: number;
  height: number;
  isNewUnsaved: boolean;
  hasSavedLocation?: boolean;
  actionContext?: 'close' | 'replace';
  reviewProgress?: { index: number; total: number } | null;
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
  hasSavedLocation = false,
  actionContext = 'close',
  reviewProgress = null,
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

  const isReviewMode = Boolean(reviewProgress);

  const title = isReviewMode
    ? isNewUnsaved
      ? '¿Desea guardar este documento antes de cerrarlo?'
      : `¿Desea guardar: ${documentName}?`
    : isNewUnsaved
    ? '¿Desea guardar este documento?'
    : actionContext === 'replace'
    ? 'Cambios sin guardar en el proyecto actual'
    : 'Este proyecto contiene cambios sin guardar.';

  const subtitle = isReviewMode
    ? isNewUnsaved
      ? `"${documentName}" es un documento nuevo sin guardar. Si elige Guardar se abrirá Guardar como... para elegir nombre y formato.`
      : `"${documentName}" tiene cambios sin guardar antes de cerrar la aplicación.`
    : isNewUnsaved
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
      <div
        className="w-full max-w-md rounded-lg border shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--studio-bg-panel, #141224)',
          borderColor: 'var(--studio-border-strong, #332e54)',
          color: 'var(--studio-text, #f1f5f9)',
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b"
          style={{
            backgroundColor: 'var(--studio-bg-header, #100e1d)',
            borderColor: 'var(--studio-border, #262242)',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <h2 className="text-sm font-semibold truncate">
              {reviewProgress
                ? `Revisión de documento (${reviewProgress.index + 1} de ${reviewProgress.total})`
                : 'Confirmar cierre'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded hover:bg-white/10 transition-colors shrink-0"
            style={{ color: 'var(--studio-text-muted, #94a3b8)' }}
            title="Cancelar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="text-sm font-semibold leading-snug">{title}</div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--studio-text-muted, #cbd5e1)' }}>
            {subtitle}
          </p>
          <div
            className="px-3 py-2 rounded border text-xs flex items-center justify-between gap-2"
            style={{
              backgroundColor: 'var(--studio-bg-bar, #0e0c1a)',
              borderColor: 'var(--studio-border, #262242)',
            }}
          >
            <div className="min-w-0">
              <div className="font-medium truncate">
                {documentName} <span className="text-amber-400 font-bold">*</span>
              </div>
              <div className="text-[11px]" style={{ color: 'var(--studio-text-muted, #94a3b8)' }}>
                {!hasSavedLocation
                  ? 'Sin ubicación · Al guardar se abrirá Guardar como...'
                  : 'Modificado · Listo para guardar'}
              </div>
            </div>
            <span
              className="text-[11px] tabular-nums shrink-0"
              style={{ color: 'var(--studio-text-muted, #94a3b8)' }}
            >
              {width} × {height} px
            </span>
          </div>
        </div>

        <div
          className="flex items-center justify-end gap-2 px-5 py-3 border-t"
          style={{
            backgroundColor: 'var(--studio-bg-header, #100e1d)',
            borderColor: 'var(--studio-border, #262242)',
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded text-xs font-medium border hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
            style={{
              borderColor: 'var(--studio-border-strong, #332e54)',
              color: 'var(--studio-text, #e2e8f0)',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="px-3 py-1.5 rounded text-xs font-medium text-rose-300 border border-rose-500/40 bg-rose-950/35 hover:bg-rose-900/50 transition-colors whitespace-nowrap shrink-0"
          >
            No Guardar
          </button>
          <button
            type="button"
            onClick={onSave}
            className="px-4 py-1.5 rounded text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            style={{
              backgroundColor: 'var(--studio-accent, #fbbf24)',
              color: 'var(--studio-accent-text, #0f172a)',
            }}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// 2. MULTI-DOCUMENT GLOBAL APPLICATION CLOSE / EXIT CHECKLIST MODAL
// =============================================================================
export interface ModifiedDocumentSummary {
  id: string;
  name: string;
  width: number;
  height: number;
  isNewUnsaved: boolean;
  hasSavedLocation?: boolean;
}

interface UnsavedAppCloseModalProps {
  isOpen: boolean;
  modifiedDocuments: ModifiedDocumentSummary[];
  isProcessing?: boolean;
  onSaveSelected: (selectedIds: string[]) => void;
  onReviewOneByOne: (docIds: string[]) => void;
  onDiscardAll: () => void;
  onCancel: () => void;
}

export const UnsavedAppCloseModal: React.FC<UnsavedAppCloseModalProps> = ({
  isOpen,
  modifiedDocuments,
  isProcessing = false,
  onSaveSelected,
  onReviewOneByOne,
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

  const docsWithoutLocationCount = modifiedDocuments.filter(
    (d) => selectedIds.includes(d.id) && !d.hasSavedLocation
  ).length;

  return (
    <div
      className="fixed inset-0 z-[10120] flex items-center justify-center bg-black/80 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onCancel();
      }}
    >
      <div
        className="w-full max-w-xl rounded-lg border shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--studio-bg-panel, #141224)',
          borderColor: 'var(--studio-border-strong, #332e54)',
          color: 'var(--studio-text, #f1f5f9)',
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b"
          style={{
            backgroundColor: 'var(--studio-bg-header, #100e1d)',
            borderColor: 'var(--studio-border, #262242)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <h2 className="text-sm font-semibold">Se han detectado documentos sin guardar.</h2>
          </div>
          <button
            type="button"
            disabled={isProcessing}
            onClick={onCancel}
            className="p-1 rounded hover:bg-white/10 disabled:opacity-40 transition-colors"
            style={{ color: 'var(--studio-text-muted, #94a3b8)' }}
            title="Cancelar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold">Documentos pendientes:</span>
            <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--studio-text-muted, #94a3b8)' }}>
              <span className="tabular-nums">{modifiedDocuments.length} pendiente(s)</span>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() =>
                  setSelectedIds(allSelected ? [] : modifiedDocuments.map((d) => d.id))
                }
                className="text-amber-400 hover:text-amber-300 transition-colors whitespace-nowrap"
              >
                {allSelected ? 'Desmarcar todos' : 'Seleccionar todos'}
              </button>
            </div>
          </div>

          <div
            className="max-h-60 overflow-y-auto divide-y rounded-md border"
            style={{
              backgroundColor: 'var(--studio-bg-bar, #0e0c1a)',
              borderColor: 'var(--studio-border, #262242)',
            }}
          >
            {modifiedDocuments.map((doc) => {
              const checked = selectedIds.includes(doc.id);
              return (
                <button
                  key={doc.id}
                  type="button"
                  disabled={isProcessing}
                  onClick={() => toggleDoc(doc.id)}
                  className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-white/5 transition-colors border-b last:border-b-0"
                  style={{ borderColor: 'var(--studio-border, #262242)' }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">
                        {doc.name} <span className="text-amber-400 font-bold">*</span>
                      </div>
                      <div className="text-[11px]" style={{ color: 'var(--studio-text-muted, #94a3b8)' }}>
                        {doc.isNewUnsaved
                          ? 'Documento nuevo sin guardar'
                          : !doc.hasSavedLocation
                          ? 'Modificado · Sin archivo asignado'
                          : 'Modificado · Cambios pendientes'}
                      </div>
                    </div>
                  </div>
                  <span
                    className="text-[11px] tabular-nums shrink-0"
                    style={{ color: 'var(--studio-text-muted, #94a3b8)' }}
                  >
                    {doc.width} × {doc.height} px
                  </span>
                </button>
              );
            })}
          </div>

          {docsWithoutLocationCount > 0 && (
            <p className="text-[11px] text-amber-300/90 leading-snug">
              {docsWithoutLocationCount === 1
                ? '1 documento aún no tiene ruta ni formato asignado: al guardar se abrirá "Guardar como...".'
                : `${docsWithoutLocationCount} documentos aún no tienen ruta ni formato asignado: al guardar se abrirá "Guardar como..." para cada uno.`}
            </p>
          )}
        </div>

        <div
          className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-t"
          style={{
            backgroundColor: 'var(--studio-bg-header, #100e1d)',
            borderColor: 'var(--studio-border, #262242)',
          }}
        >
          <button
            type="button"
            disabled={isProcessing}
            onClick={() =>
              onReviewOneByOne(
                selectedIds.length > 0 ? selectedIds : modifiedDocuments.map((d) => d.id)
              )
            }
            className="px-3 py-1.5 rounded text-xs font-medium border hover:bg-white/10 disabled:opacity-40 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            style={{
              borderColor: 'var(--studio-border-strong, #332e54)',
              color: 'var(--studio-text, #e2e8f0)',
            }}
          >
            <ListChecks className="w-3.5 h-3.5 text-amber-400" />
            <span>Revisar Uno a Uno</span>
          </button>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={onCancel}
              className="px-3 py-1.5 rounded text-xs font-medium border hover:bg-white/10 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
              style={{
                borderColor: 'var(--studio-border-strong, #332e54)',
                color: 'var(--studio-text, #e2e8f0)',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={onDiscardAll}
              className="px-3 py-1.5 rounded text-xs font-medium text-rose-300 border border-rose-500/40 bg-rose-950/35 hover:bg-rose-900/50 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
            >
              No Guardar
            </button>
            <button
              type="button"
              disabled={isProcessing || selectedIds.length === 0}
              onClick={() => onSaveSelected(selectedIds)}
              className="px-4 py-1.5 rounded text-xs font-semibold disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
              style={{
                backgroundColor: 'var(--studio-accent, #fbbf24)',
                color: 'var(--studio-accent-text, #0f172a)',
              }}
            >
              {isProcessing
                ? 'Guardando...'
                : allSelected
                ? 'Guardar Todo'
                : `Guardar (${selectedIds.length})`}
            </button>
          </div>
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
    id: 'animation',
    label: 'Proyecto de animación',
    extension: '.pcsanim.json',
    description: 'Proyecto completo de animación 2D: fotogramas, tiempos, clips, etiquetas y cámara.',
    supportsScale: false,
    icon: <Clapperboard className="w-4 h-4 text-fuchsia-400" />,
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
  queueLabel?: string | null;
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
  queueLabel = null,
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
        className="w-full max-w-2xl rounded-lg border shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--studio-bg-panel, #141224)',
          borderColor: 'var(--studio-border-strong, #332e54)',
          color: 'var(--studio-text, #f1f5f9)',
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b"
          style={{
            backgroundColor: 'var(--studio-bg-header, #100e1d)',
            borderColor: 'var(--studio-border, #262242)',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Save className="w-4 h-4 text-amber-400 shrink-0" />
            <h2 className="text-sm font-semibold truncate">
              {queueLabel ? `Guardar como... · ${queueLabel}` : 'Guardar como...'}
            </h2>
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={onCancel}
            className="p-1 rounded hover:bg-white/10 disabled:opacity-40 transition-colors shrink-0"
            style={{ color: 'var(--studio-text-muted, #94a3b8)' }}
            title="Cancelar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* File name row */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="pcs-save-as-name" className="font-medium">
                Nombre del archivo
              </label>
              <span
                className="text-[11px] tabular-nums"
                style={{ color: 'var(--studio-text-muted, #94a3b8)' }}
              >
                {width} × {height} px · {framesCount} frame{framesCount === 1 ? '' : 's'}
              </span>
            </div>
            <div
              className="flex items-center rounded-md border focus-within:border-amber-400 overflow-hidden"
              style={{
                backgroundColor: 'var(--studio-bg-bar, #0e0c1a)',
                borderColor: 'var(--studio-border-strong, #332e54)',
              }}
            >
              <input
                id="pcs-save-as-name"
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                autoFocus
                placeholder="Nombre del proyecto"
                className="flex-1 bg-transparent px-3 py-2 text-xs focus:outline-none"
              />
              <span
                className="px-3 py-2 text-xs font-mono text-amber-400 border-l shrink-0"
                style={{
                  backgroundColor: 'var(--studio-bg-card, #19162e)',
                  borderColor: 'var(--studio-border, #262242)',
                }}
              >
                {activeEntry.extension}
              </span>
            </div>
          </div>

          {/* Format selector grid */}
          <div>
            <div
              className="text-[11px] uppercase tracking-wider font-medium mb-2"
              style={{ color: 'var(--studio-text-muted, #94a3b8)' }}
            >
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
                    className="flex items-start gap-2.5 text-left px-3 py-2.5 rounded-md border transition-colors"
                    style={{
                      backgroundColor: selected
                        ? 'var(--studio-bg-selection, rgba(251, 191, 36, 0.14))'
                        : 'var(--studio-bg-bar, #0e0c1a)',
                      borderColor: selected
                        ? 'var(--studio-accent, #fbbf24)'
                        : 'var(--studio-border, #262242)',
                    }}
                  >
                    <div className="mt-0.5 shrink-0">{entry.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium truncate">{entry.label}</span>
                        <span
                          className="text-[11px] font-mono shrink-0"
                          style={{ color: 'var(--studio-text-muted, #94a3b8)' }}
                        >
                          {entry.extension}
                        </span>
                      </div>
                      <p
                        className="text-[11px] leading-snug mt-0.5"
                        style={{ color: 'var(--studio-text-muted, #94a3b8)' }}
                      >
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
            <div
              className="flex flex-wrap items-center justify-between gap-4 border-t pt-3 text-xs"
              style={{ borderColor: 'var(--studio-border, #262242)' }}
            >
              {activeEntry.supportsScale && (
                <div className="flex items-center gap-2.5">
                  <span style={{ color: 'var(--studio-text-muted, #cbd5e1)' }}>
                    Escala de exportación
                  </span>
                  <div
                    className="inline-flex rounded border overflow-hidden"
                    style={{ borderColor: 'var(--studio-border-strong, #332e54)' }}
                  >
                    {[1, 2, 4].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setScale(s)}
                        className="px-2.5 py-1 text-xs tabular-nums transition-colors"
                        style={{
                          backgroundColor:
                            scale === s
                              ? 'var(--studio-accent, #fbbf24)'
                              : 'var(--studio-bg-bar, #0e0c1a)',
                          color:
                            scale === s
                              ? 'var(--studio-accent-text, #0f172a)'
                              : 'var(--studio-text, #e2e8f0)',
                          fontWeight: scale === s ? 600 : 400,
                        }}
                      >
                        {s}×
                      </button>
                    ))}
                  </div>
                  <span
                    className="text-[11px] tabular-nums"
                    style={{ color: 'var(--studio-text-muted, #94a3b8)' }}
                  >
                    ({width * scale} × {height * scale} px)
                  </span>
                </div>
              )}

              {format === 'jpg' && (
                <label className="flex items-center gap-2">
                  <span>Fondo JPG</span>
                  <input
                    type="color"
                    value={jpgBg}
                    onChange={(e) => setJpgBg(e.target.value)}
                    className="h-6 w-8 rounded border bg-transparent cursor-pointer"
                    style={{ borderColor: 'var(--studio-border-strong, #332e54)' }}
                  />
                </label>
              )}
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-2 px-5 py-3 border-t"
          style={{
            backgroundColor: 'var(--studio-bg-header, #100e1d)',
            borderColor: 'var(--studio-border, #262242)',
          }}
        >
          <button
            type="button"
            disabled={isSaving}
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded text-xs font-medium border hover:bg-white/10 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
            style={{
              borderColor: 'var(--studio-border-strong, #332e54)',
              color: 'var(--studio-text, #e2e8f0)',
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-1.5 rounded text-xs font-semibold disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
            style={{
              backgroundColor: 'var(--studio-accent, #fbbf24)',
              color: 'var(--studio-accent-text, #0f172a)',
            }}
          >
            {isSaving ? 'Guardando...' : `Guardar (${activeEntry.extension})`}
          </button>
        </div>
      </form>
    </div>
  );
};
