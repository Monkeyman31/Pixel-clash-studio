import React, { useEffect, useState } from 'react';
import {
  Check,
  Film,
  Folder,
  FolderHeart,
  FolderOpen,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Paintbrush,
  Repeat,
  X,
} from 'lucide-react';
import { decodeFilePreviewDataUrl } from '../utils/fileImporter';

export type SmartImportDestination =
  | 'new_layer'
  | 'selected_group'
  | 'reference'
  | 'references_panel'
  | 'asset'
  | 'current_frame'
  | 'all_frames'
  | 'brush';

export type SmartImportFitMode = 'fit' | 'original' | 'stretch';

interface SmartImportModalProps {
  isOpen: boolean;
  files: File[];
  canvasWidth: number;
  canvasHeight: number;
  activeGroupName: string | null;
  activeFrameName: string;
  totalFrames: number;
  onConfirm: (destination: SmartImportDestination, fitMode: SmartImportFitMode) => void;
  onOpenAsNewDocument?: (file: File) => void;
  onCancel: () => void;
}

const DESTINATION_OPTIONS: {
  id: SmartImportDestination;
  title: string;
  description: string;
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
}[] = [
  {
    id: 'new_layer',
    title: 'Nueva capa',
    description: 'Inserta la imagen como una capa independiente en el fotograma actual.',
    icon: Layers,
  },
  {
    id: 'selected_group',
    title: 'Grupo actual',
    description: 'Coloca la imagen dentro de la carpeta o grupo seleccionado.',
    icon: Folder,
  },
  {
    id: 'reference',
    title: 'Referencia',
    description: 'Añade como guía visual no destructiva sobre el lienzo.',
    icon: ImageIcon,
  },
  {
    id: 'references_panel',
    title: 'Panel de Referencias',
    description: 'Envía a la mesa infinita de referencias (estilo PureRef).',
    icon: LayoutGrid,
  },
  {
    id: 'asset',
    title: 'Asset',
    description: 'Guarda como elemento reutilizable en la Librería de Assets.',
    icon: FolderHeart,
  },
  {
    id: 'current_frame',
    title: 'Frame actual',
    description: 'Combina la imagen directamente sobre la capa activa de este fotograma.',
    icon: Film,
  },
  {
    id: 'all_frames',
    title: 'Todos los frames',
    description: 'Inserta como nueva capa replicada en todos los fotogramas del proyecto.',
    icon: Repeat,
  },
  {
    id: 'brush',
    title: 'Pincel personalizado',
    description: 'Registra la imagen como nuevo preset en el Panel de Pinceles.',
    icon: Paintbrush,
  },
];

export const SmartImportModal: React.FC<SmartImportModalProps> = ({
  isOpen,
  files,
  canvasWidth,
  canvasHeight,
  activeGroupName,
  activeFrameName,
  totalFrames,
  onConfirm,
  onOpenAsNewDocument,
  onCancel,
}) => {
  const [destination, setDestination] = useState<SmartImportDestination>('new_layer');
  const [fitMode, setFitMode] = useState<SmartImportFitMode>('fit');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number; frames?: number } | null>(null);

  const primaryFile = files[0] || null;

  useEffect(() => {
    if (!isOpen || !primaryFile) {
      setPreviewUrl(null);
      setNaturalSize(null);
      return;
    }

    let cancelled = false;
    decodeFilePreviewDataUrl(primaryFile)
      .then((info) => {
        if (cancelled) return;
        setPreviewUrl(info.dataUrl || null);
        setNaturalSize({ w: info.width, h: info.height, frames: info.frameCount });
      })
      .catch(() => {
        if (cancelled) return;
        setPreviewUrl(null);
        setNaturalSize(null);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, primaryFile]);

  if (!isOpen || files.length === 0) return null;

  const showsFitMode =
    destination === 'new_layer' ||
    destination === 'selected_group' ||
    destination === 'current_frame' ||
    destination === 'all_frames';

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="w-full max-w-2xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{
          backgroundColor: 'var(--studio-bg-panel)',
          borderColor: 'var(--studio-border-strong)',
          color: 'var(--studio-text)',
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-3.5 border-b flex items-center justify-between gap-3"
          style={{
            backgroundColor: 'var(--studio-bg-header)',
            borderColor: 'var(--studio-border)',
          }}
        >
          <div>
            <h3 className="text-sm font-bold tracking-tight">
              Importación Inteligente · ¿Dónde desea importar este archivo?
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--studio-text-muted)' }}>
              El contenido se incorporará al proyecto activo sin cerrar ni reemplazar tu documento actual.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: 'var(--studio-text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex flex-col gap-4">
          {/* File Summary & Preview */}
          <div
            className="p-3 rounded-lg border flex items-center gap-3.5"
            style={{
              backgroundColor: 'var(--studio-bg-card)',
              borderColor: 'var(--studio-border)',
            }}
          >
            <div
              className="w-16 h-16 rounded-lg border canvas-checkerboard flex items-center justify-center overflow-hidden shrink-0"
              style={{ borderColor: 'var(--studio-border-strong)' }}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={primaryFile?.name || 'Vista previa'}
                  className="max-w-full max-h-full object-contain pixel-canvas"
                />
              ) : (
                <ImageIcon className="w-6 h-6 opacity-40" />
              )}
            </div>

            <div className="min-w-0 flex-1 flex flex-col gap-1">
              <div className="text-xs font-bold truncate">
                {files.length === 1
                  ? primaryFile?.name
                  : `${files.length} archivos seleccionados (${primaryFile?.name} y ${files.length - 1} más)`}
              </div>
              <div
                className="text-[11px] font-mono tabular-nums flex flex-wrap items-center gap-x-2 gap-y-0.5"
                style={{ color: 'var(--studio-text-muted)' }}
              >
                {naturalSize && (
                  <span>
                    Origen: {naturalSize.w}×{naturalSize.h} px
                    {naturalSize.frames && naturalSize.frames > 1 ? ` (${naturalSize.frames} frames)` : ''}
                  </span>
                )}
                <span aria-hidden="true">·</span>
                <span>
                  Lienzo activo: {canvasWidth}×{canvasHeight} px
                </span>
                <span aria-hidden="true">·</span>
                <span>{totalFrames} fotograma(s)</span>
              </div>
            </div>
          </div>

          {/* Destination Radio Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DESTINATION_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = destination === opt.id;
              const extraHint =
                opt.id === 'selected_group'
                  ? activeGroupName
                    ? `Destino: "${activeGroupName}"`
                    : 'Creará carpeta "Grupo Importado"'
                  : opt.id === 'current_frame'
                  ? `Fotograma: ${activeFrameName}`
                  : opt.id === 'all_frames'
                  ? `Se añadirá a ${totalFrames} fotograma(s)`
                  : null;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDestination(opt.id)}
                  className="p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition-colors cursor-pointer"
                  style={{
                    backgroundColor: selected
                      ? 'color-mix(in srgb, var(--studio-accent) 14%, var(--studio-bg-card))'
                      : 'var(--studio-bg-card)',
                    borderColor: selected ? 'var(--studio-accent)' : 'var(--studio-border)',
                  }}
                >
                  <div
                    className="w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center shrink-0"
                    style={{
                      borderColor: selected ? 'var(--studio-accent)' : 'var(--studio-border-strong)',
                    }}
                  >
                    {selected && (
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: 'var(--studio-accent)' }}
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <Icon
                        className="w-3.5 h-3.5 shrink-0"
                        style={{ color: selected ? 'var(--studio-accent)' : 'var(--studio-text-muted)' }}
                      />
                      <span className="truncate">{opt.title}</span>
                    </div>
                    <p
                      className="text-[10px] mt-0.5 leading-snug"
                      style={{ color: 'var(--studio-text-muted)' }}
                    >
                      {opt.description}
                    </p>
                    {extraHint && (
                      <div
                        className="text-[10px] font-mono mt-1 truncate"
                        style={{ color: selected ? 'var(--studio-accent)' : 'var(--studio-text-muted)' }}
                      >
                        {extraHint}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pixel Fit Policy when importing into canvas layers */}
          {showsFitMode && (
            <div
              className="p-2.5 rounded-lg border flex flex-wrap items-center justify-between gap-2 text-xs"
              style={{
                backgroundColor: 'var(--studio-bg-card)',
                borderColor: 'var(--studio-border)',
              }}
            >
              <span className="text-[11px] font-medium" style={{ color: 'var(--studio-text-muted)' }}>
                Ajuste al tamaño del lienzo ({canvasWidth}×{canvasHeight} px):
              </span>
              <div className="flex items-center gap-1">
                {(
                  [
                    ['fit', 'Ajustar proporcional'],
                    ['original', '1:1 Centrado'],
                    ['stretch', 'Rellenar lienzo'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFitMode(id)}
                    className="px-2.5 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer whitespace-nowrap"
                    style={{
                      backgroundColor: fitMode === id ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                      color: fitMode === id ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                      borderColor: fitMode === id ? 'var(--studio-accent)' : 'var(--studio-border)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 border-t flex flex-wrap items-center justify-between gap-2"
          style={{
            backgroundColor: 'var(--studio-bg-bar)',
            borderColor: 'var(--studio-border)',
          }}
        >
          {onOpenAsNewDocument && primaryFile ? (
            <button
              type="button"
              onClick={() => onOpenAsNewDocument(primaryFile)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border hover:bg-white/5 transition-colors flex items-center gap-1.5 cursor-pointer"
              style={{
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Abrir como documento nuevo</span>
            </button>
          ) : (
            <span className="text-[11px]" style={{ color: 'var(--studio-text-muted)' }}>
              Para abrir como documento nuevo independiente usa Archivo → Abrir (Ctrl+O)
            </span>
          )}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium border hover:bg-white/5 transition-colors cursor-pointer"
              style={{
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text-muted)',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onConfirm(destination, fitMode)}
              className="px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-opacity hover:opacity-90 cursor-pointer"
              style={{
                backgroundColor: 'var(--studio-accent)',
                color: 'var(--studio-accent-text)',
              }}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Importar al Proyecto</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
