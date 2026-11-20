import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Film,
  FolderOpen,
  FolderSearch,
  Grid3X3,
  Image as ImageIcon,
  Maximize2,
  Move,
  Play,
  Pause,
  Scaling,
  Trash2,
  X,
  FileWarning,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  InterpolationMode,
  RecentProjectEntry,
  ResolutionMismatchAction,
} from '../types';
import {
  DecodedRgbaImage,
  SpritesheetCandidateInfo,
  SpritesheetSliceOptions,
} from '../utils/fileImporter';
import { getTiledStore } from '../utils/tiledImageEngine';

// Helper to draw either standard DecodedRgbaImage or TiledLayerStore preview into a canvas
function paintDecodedPreviewToCanvas(
  canvas: HTMLCanvasElement,
  rawRaster: DecodedRgbaImage,
  maxW: number,
  maxH: number
): { scale: number; drawW: number; drawH: number } | null {
  const scale = Math.min(maxW / rawRaster.width, maxH / rawRaster.height, 4);
  const drawW = Math.max(1, Math.round(rawRaster.width * scale));
  const drawH = Math.max(1, Math.round(rawRaster.height * scale));
  canvas.width = drawW;
  canvas.height = drawH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, drawW, drawH);

  if (rawRaster.tiledStoreId) {
    const store = getTiledStore(rawRaster.tiledStoreId);
    if (store) {
      store.renderScaledPreviewToContext(ctx, drawW, drawH, 0);
      return { scale, drawW, drawH };
    }
  }

  if (rawRaster.data && rawRaster.data.length === rawRaster.width * rawRaster.height * 4) {
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = rawRaster.width;
    srcCanvas.height = rawRaster.height;
    const sctx = srcCanvas.getContext('2d');
    if (!sctx) return null;
    sctx.putImageData(
      new ImageData(new Uint8ClampedArray(rawRaster.data), rawRaster.width, rawRaster.height),
      0,
      0
    );
    ctx.drawImage(srcCanvas, 0, 0, drawW, drawH);
    return { scale, drawW, drawH };
  }

  return null;
}

// =========================================================================
// 1. MISSING RECENT FILE RECOVERY MODAL
// Exact required message: "El archivo no se encuentra en su ubicación original."
// Exact required actions: Buscar archivo · Eliminar de recientes · Cancelar
// =========================================================================
interface MissingRecentFileModalProps {
  isOpen: boolean;
  entry: RecentProjectEntry | null;
  onLocateFile: (entry: RecentProjectEntry) => void;
  onRemoveFromRecents: (entry: RecentProjectEntry) => void;
  onCancel: () => void;
}

export const MissingRecentFileModal: React.FC<MissingRecentFileModalProps> = ({
  isOpen,
  entry,
  onLocateFile,
  onRemoveFromRecents,
  onCancel,
}) => {
  if (!isOpen || !entry) return null;

  const displayPath =
    entry.diskPath || entry.path || `${entry.name}.${entry.fileFormat || 'pcs'}`;
  const displayDate = entry.modifiedAt || entry.openedAt;

  return (
    <div
      className="fixed inset-0 z-[180] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="w-full max-w-md rounded-xl border shadow-2xl overflow-hidden flex flex-col"
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
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <h3 className="text-sm font-bold tracking-tight truncate">
              Archivo reciente no disponible
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
            style={{ color: 'var(--studio-text-muted)' }}
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <p className="text-sm font-medium leading-relaxed">
            El archivo no se encuentra en su ubicación original.
          </p>

          <div
            className="p-3 rounded-lg border flex items-start gap-3"
            style={{
              backgroundColor: 'var(--studio-bg-card)',
              borderColor: 'var(--studio-border)',
            }}
          >
            <div
              className="w-11 h-11 rounded-md border canvas-checkerboard shrink-0 overflow-hidden flex items-center justify-center"
              style={{ borderColor: 'var(--studio-border-strong)' }}
            >
              {entry.thumbnailDataUrl ? (
                <img
                  src={entry.thumbnailDataUrl}
                  alt={entry.name}
                  className="w-full h-full object-contain pixel-canvas"
                />
              ) : (
                <FileWarning className="w-5 h-5 text-amber-400/70" />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="text-xs font-bold truncate">{entry.name}</div>
              <div
                className="text-[11px] font-mono break-all leading-snug"
                style={{ color: 'var(--studio-text-muted)' }}
              >
                {displayPath}
              </div>
              <div
                className="text-[10px] font-mono tabular-nums"
                style={{ color: 'var(--studio-text-muted)' }}
              >
                {entry.width}×{entry.height} px · Modificado: {displayDate}
              </div>
            </div>
          </div>

          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--studio-text-muted)' }}>
            El documento actual no ha sido modificado. Puedes ubicar el archivo manualmente en tu equipo para abrirlo y actualizar su ruta, o eliminarlo de la lista de recientes.
          </p>
        </div>

        {/* Actions */}
        <div
          className="px-5 py-3.5 border-t flex flex-wrap items-center justify-between gap-2"
          style={{
            backgroundColor: 'var(--studio-bg-bar)',
            borderColor: 'var(--studio-border)',
          }}
        >
          <button
            type="button"
            onClick={() => onRemoveFromRecents(entry)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-500/35 text-rose-400 hover:bg-rose-500/12 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar de recientes</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border hover:bg-white/5 transition-colors cursor-pointer"
              style={{
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text-muted)',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onLocateFile(entry)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
              style={{
                backgroundColor: 'var(--studio-accent)',
                color: 'var(--studio-accent-text)',
              }}
            >
              <FolderSearch className="w-3.5 h-3.5" />
              <span>Buscar archivo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 2. DESCRIPTIVE FILE LOAD ERROR MODAL
// Guarantees failed or corrupted loads NEVER silently create an empty canvas
// =========================================================================
export interface FileLoadErrorPayload {
  fileName: string;
  formatLabel: string;
  message: string;
  technicalDetails?: string;
}

interface FileLoadErrorModalProps {
  isOpen: boolean;
  error: FileLoadErrorPayload | null;
  onRetryPickFile: () => void;
  onClose: () => void;
}

export const FileLoadErrorModal: React.FC<FileLoadErrorModalProps> = ({
  isOpen,
  error,
  onRetryPickFile,
  onClose,
}) => {
  const [showTech, setShowTech] = useState(false);

  useEffect(() => {
    setShowTech(false);
  }, [error]);

  if (!isOpen || !error) return null;

  return (
    <div
      className="fixed inset-0 z-[180] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-xl border shadow-2xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--studio-bg-panel)',
          borderColor: 'var(--studio-border-strong)',
          color: 'var(--studio-text)',
        }}
      >
        <div
          className="px-5 py-3.5 border-b flex items-center justify-between gap-3"
          style={{
            backgroundColor: 'var(--studio-bg-header)',
            borderColor: 'var(--studio-border)',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <FileWarning className="w-4 h-4 text-rose-400 shrink-0" />
            <h3 className="text-sm font-bold tracking-tight truncate">
              No se pudo abrir el archivo
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
            style={{ color: 'var(--studio-text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3.5">
          <div
            className="p-3 rounded-lg border space-y-1"
            style={{
              backgroundColor: 'var(--studio-bg-card)',
              borderColor: 'var(--studio-border)',
            }}
          >
            <div className="text-xs font-bold font-mono truncate">{error.fileName}</div>
            <div className="text-[11px]" style={{ color: 'var(--studio-text-muted)' }}>
              Formato detectado: <span className="font-mono">{error.formatLabel}</span>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-rose-300">
            {error.message}
          </p>

          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--studio-text-muted)' }}>
            Para proteger tu trabajo, no se creó ningún lienzo vacío. Formatos compatibles: PNG, JPG, JPEG, WEBP, GIF animado, BMP, TIFF, TGA, ICO, ASE, ASEPRITE, PSD, PCS y JSON.
          </p>

          {error.technicalDetails && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowTech((v) => !v)}
                className="flex items-center gap-1 text-[11px] font-mono cursor-pointer hover:underline"
                style={{ color: 'var(--studio-text-muted)' }}
              >
                {showTech ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                <span>Detalles técnicos del registro</span>
              </button>
              {showTech && (
                <pre
                  className="mt-2 p-2.5 rounded-md border text-[10px] font-mono overflow-x-auto max-h-28 whitespace-pre-wrap break-all"
                  style={{
                    backgroundColor: 'var(--studio-bg-app)',
                    borderColor: 'var(--studio-border)',
                    color: 'var(--studio-text-muted)',
                  }}
                >
                  {error.technicalDetails}
                </pre>
              )}
            </div>
          )}
        </div>

        <div
          className="px-5 py-3 border-t flex items-center justify-end gap-2"
          style={{
            backgroundColor: 'var(--studio-bg-bar)',
            borderColor: 'var(--studio-border)',
          }}
        >
          <button
            type="button"
            onClick={onRetryPickFile}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium border hover:bg-white/5 transition-colors flex items-center gap-1.5 cursor-pointer"
            style={{
              borderColor: 'var(--studio-border-strong)',
              color: 'var(--studio-text)',
            }}
          >
            <FolderSearch className="w-3.5 h-3.5" />
            <span>Elegir otro archivo</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
            style={{
              backgroundColor: 'var(--studio-accent)',
              color: 'var(--studio-accent-text)',
            }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 3. SPRITESHEET DETECTION CONFIRMATION MODAL
// Exact required prompt:
// "Se ha detectado una posible hoja de sprites. ¿Desea abrirla como spritesheet?"
// Sí -> Opens Spritesheet Slicer | No -> Opens intact 1:1 without resizing
// =========================================================================
interface SpritesheetDetectedPromptModalProps {
  isOpen: boolean;
  fileName: string;
  rawRaster: DecodedRgbaImage | null;
  candidate: SpritesheetCandidateInfo | null;
  onConfirmSpritesheet: () => void;
  onOpenIntactImage: () => void;
  onCancel: () => void;
}

export const SpritesheetDetectedPromptModal: React.FC<SpritesheetDetectedPromptModalProps> = ({
  isOpen,
  fileName,
  rawRaster,
  candidate,
  onConfirmSpritesheet,
  onOpenIntactImage,
  onCancel,
}) => {
  const previewRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isOpen || !rawRaster || !previewRef.current) return;
    paintDecodedPreviewToCanvas(previewRef.current, rawRaster, 420, 150);
  }, [isOpen, rawRaster]);

  if (!isOpen || !rawRaster || !candidate) return null;

  const dpi = rawRaster.dpi || 72;

  return (
    <div
      className="fixed inset-0 z-[185] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="w-full max-w-lg rounded-xl border shadow-2xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--studio-bg-panel)',
          borderColor: 'var(--studio-border-strong)',
          color: 'var(--studio-text)',
        }}
      >
        <div
          className="px-5 py-3.5 border-b flex items-center justify-between gap-3"
          style={{
            backgroundColor: 'var(--studio-bg-header)',
            borderColor: 'var(--studio-border)',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Grid3X3 className="w-4 h-4 text-amber-400 shrink-0" />
            <h3 className="text-sm font-bold tracking-tight truncate">
              Detección de Hoja de Sprites
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
            style={{ color: 'var(--studio-text-muted)' }}
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold leading-snug">
            Se ha detectado una posible hoja de sprites. ¿Desea abrirla como spritesheet?
          </p>

          <div
            className="rounded-lg border p-3 canvas-checkerboard flex items-center justify-center min-h-[120px] max-h-[180px] overflow-hidden"
            style={{ borderColor: 'var(--studio-border)' }}
          >
            <canvas ref={previewRef} className="pixel-canvas max-w-full max-h-[150px]" />
          </div>

          <div
            className="p-3 rounded-lg border space-y-1.5 text-xs"
            style={{
              backgroundColor: 'var(--studio-bg-card)',
              borderColor: 'var(--studio-border)',
            }}
          >
            <div className="font-bold truncate">{fileName}</div>
            <div
              className="text-[11px] font-mono tabular-nums flex flex-wrap items-center gap-x-2.5 gap-y-1"
              style={{ color: 'var(--studio-text-muted)' }}
            >
              <span>
                Resolución original:{' '}
                <strong className="text-slate-100">
                  {rawRaster.width}×{rawRaster.height} px
                </strong>
              </span>
              <span>·</span>
              <span>{dpi} DPI</span>
              <span>·</span>
              <span>Transparencia: {rawRaster.hasTransparency ? 'Sí' : 'No'}</span>
            </div>
            <div className="text-[11px] font-mono tabular-nums text-amber-300">
              Rejilla sugerida: {candidate.suggestedCols}×{candidate.suggestedRows} ({candidate.suggestedFrameWidth}×{candidate.suggestedFrameHeight} px por celda)
            </div>
          </div>

          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--studio-text-muted)' }}>
            Si eliges <strong className="text-slate-200">No</strong>, el archivo se abrirá intacto a su resolución original exacta ({rawRaster.width}×{rawRaster.height} px, escala 1:1 Nearest Neighbor) sin ningún redimensionamiento automático.
          </p>
        </div>

        <div
          className="px-5 py-3.5 border-t flex flex-wrap items-center justify-between gap-2"
          style={{
            backgroundColor: 'var(--studio-bg-bar)',
            borderColor: 'var(--studio-border)',
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border hover:bg-white/5 transition-colors cursor-pointer"
            style={{
              borderColor: 'var(--studio-border-strong)',
              color: 'var(--studio-text-muted)',
            }}
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenIntactImage}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border hover:bg-white/5 transition-colors flex items-center gap-1.5 cursor-pointer"
              style={{
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            >
              <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
              <span>No, abrir intacta (1:1)</span>
            </button>
            <button
              type="button"
              onClick={onConfirmSpritesheet}
              className="px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
              style={{
                backgroundColor: 'var(--studio-accent)',
                color: 'var(--studio-accent-text)',
              }}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>Sí, abrir como spritesheet</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 4. IMPORT RESOLUTION MISMATCH CONTROL MODAL
// Exact required prompt: "¿Cómo desea abrir este archivo?"
// Options:
//   ○ Tamaño Original
//   ○ Ajustar al lienzo (with Nearest Neighbor default interpolation)
//   ○ Centrar sin redimensionar
//   ○ Abrir como nuevo documento
// =========================================================================
interface ImportResolutionMismatchModalProps {
  isOpen: boolean;
  fileName: string;
  sourceWidth: number;
  sourceHeight: number;
  sourceDpi?: number;
  previewDataUrl?: string | null;
  canvasWidth: number;
  canvasHeight: number;
  onConfirm: (action: ResolutionMismatchAction, interpolation: InterpolationMode) => void;
  onCancel: () => void;
}

export const ImportResolutionMismatchModal: React.FC<ImportResolutionMismatchModalProps> = ({
  isOpen,
  fileName,
  sourceWidth,
  sourceHeight,
  sourceDpi = 72,
  previewDataUrl,
  canvasWidth,
  canvasHeight,
  onConfirm,
  onCancel,
}) => {
  const [selectedAction, setSelectedAction] = useState<ResolutionMismatchAction>('original_size');
  const [interpolation, setInterpolation] = useState<InterpolationMode>('nearest');

  useEffect(() => {
    if (isOpen) {
      setSelectedAction('original_size');
      setInterpolation('nearest');
    }
  }, [isOpen, fileName]);

  if (!isOpen) return null;

  const options: {
    id: ResolutionMismatchAction;
    title: string;
    description: string;
    icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  }[] = [
    {
      id: 'original_size',
      title: 'Tamaño Original',
      description: `Adapta el lienzo del proyecto a ${sourceWidth}×${sourceHeight} px y coloca cada píxel 1:1 sin alterar la imagen.`,
      icon: Maximize2,
    },
    {
      id: 'fit_canvas',
      title: 'Ajustar al lienzo',
      description: `Escala proporcionalmente para encajar en ${canvasWidth}×${canvasHeight} px usando el método de interpolación elegido.`,
      icon: Scaling,
    },
    {
      id: 'center_no_resize',
      title: 'Centrar sin redimensionar',
      description: `Mantiene el lienzo actual (${canvasWidth}×${canvasHeight} px) y centra los píxeles exactos 1:1 sin reescalado.`,
      icon: Move,
    },
    {
      id: 'new_document',
      title: 'Abrir como nuevo documento',
      description: `Abre una pestaña independiente a ${sourceWidth}×${sourceHeight} px (${sourceDpi} DPI) manteniendo tu proyecto actual intacto.`,
      icon: FolderOpen,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[185] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="w-full max-w-lg rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        style={{
          backgroundColor: 'var(--studio-bg-panel)',
          borderColor: 'var(--studio-border-strong)',
          color: 'var(--studio-text)',
        }}
      >
        <div
          className="px-5 py-3.5 border-b flex items-center justify-between gap-3"
          style={{
            backgroundColor: 'var(--studio-bg-header)',
            borderColor: 'var(--studio-border)',
          }}
        >
          <div>
            <h3 className="text-sm font-bold tracking-tight">
              ¿Cómo desea abrir este archivo?
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--studio-text-muted)' }}>
              La resolución del archivo difiere del lienzo actual. Nunca se aplica redimensionamiento automático.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
            style={{ color: 'var(--studio-text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {/* Resolution comparison summary */}
          <div
            className="p-3 rounded-lg border flex items-center gap-3"
            style={{
              backgroundColor: 'var(--studio-bg-card)',
              borderColor: 'var(--studio-border)',
            }}
          >
            <div
              className="w-12 h-12 rounded-md border canvas-checkerboard shrink-0 overflow-hidden flex items-center justify-center"
              style={{ borderColor: 'var(--studio-border-strong)' }}
            >
              {previewDataUrl ? (
                <img
                  src={previewDataUrl}
                  alt={fileName}
                  className="max-w-full max-h-full object-contain pixel-canvas"
                />
              ) : (
                <ImageIcon className="w-5 h-5 opacity-50" />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="text-xs font-bold truncate">{fileName}</div>
              <div
                className="text-[11px] font-mono tabular-nums flex flex-wrap items-center gap-x-2 gap-y-0.5"
                style={{ color: 'var(--studio-text-muted)' }}
              >
                <span>
                  Archivo: <strong className="text-amber-300">{sourceWidth}×{sourceHeight} px</strong> ({sourceDpi} DPI)
                </span>
                <span>·</span>
                <span>
                  Lienzo actual: <strong className="text-slate-200">{canvasWidth}×{canvasHeight} px</strong>
                </span>
              </div>
            </div>
          </div>

          {/* 4 Radio choices */}
          <div className="space-y-2">
            {options.map((opt) => {
              const Icon = opt.icon;
              const selected = selectedAction === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedAction(opt.id)}
                  className="w-full p-3 rounded-lg border text-left flex items-start gap-3 transition-colors cursor-pointer"
                  style={{
                    backgroundColor: selected
                      ? 'color-mix(in srgb, var(--studio-accent) 13%, var(--studio-bg-card))'
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
                      <span>{opt.title}</span>
                    </div>
                    <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--studio-text-muted)' }}>
                      {opt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Interpolation control when scaling to canvas */}
          {selectedAction === 'fit_canvas' && (
            <div
              className="p-3 rounded-lg border space-y-2 text-xs"
              style={{
                backgroundColor: 'var(--studio-bg-card)',
                borderColor: 'var(--studio-border)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold">Método de interpolación</span>
                <span className="text-[10px] font-mono text-emerald-400">
                  Predeterminado: Nearest Neighbor
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    ['nearest', 'Nearest Neighbor'],
                    ['bilinear', 'Bilinear'],
                    ['bicubic', 'Bicubic'],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setInterpolation(mode)}
                    className="px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-colors cursor-pointer whitespace-nowrap"
                    style={{
                      backgroundColor:
                        interpolation === mode ? 'var(--studio-accent)' : 'var(--studio-bg-app)',
                      color:
                        interpolation === mode ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                      borderColor:
                        interpolation === mode ? 'var(--studio-accent)' : 'var(--studio-border)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>
                El suavizado (Bilinear / Bicubic) únicamente se aplica si lo seleccionas explícitamente.
              </p>
            </div>
          )}
        </div>

        <div
          className="px-5 py-3 border-t flex items-center justify-end gap-2"
          style={{
            backgroundColor: 'var(--studio-bg-bar)',
            borderColor: 'var(--studio-border)',
          }}
        >
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
            onClick={() => onConfirm(selectedAction, interpolation)}
            className="px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
            style={{
              backgroundColor: 'var(--studio-accent)',
              color: 'var(--studio-accent-text)',
            }}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Aplicar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 5. INTERACTIVE SPRITESHEET SLICER MODAL
// Triggered after user confirms Spritesheet or via Importar Spritesheet
// Supports standard RGBA AND massive TiledLayerStore spritesheets (zero resize!)
// =========================================================================
interface SpritesheetSlicerModalProps {
  isOpen: boolean;
  fileName: string;
  rawRaster: DecodedRgbaImage | null;
  candidate: SpritesheetCandidateInfo | null;
  allowOpenAsSingleImage?: boolean;
  onConfirmSlice: (options: SpritesheetSliceOptions) => void;
  onOpenAsSingleImage?: () => void;
  onCancel: () => void;
}

export const SpritesheetSlicerModal: React.FC<SpritesheetSlicerModalProps> = ({
  isOpen,
  fileName,
  rawRaster,
  candidate,
  allowOpenAsSingleImage = true,
  onConfirmSlice,
  onOpenAsSingleImage,
  onCancel,
}) => {
  const [cols, setCols] = useState(4);
  const [rows, setRows] = useState(1);
  const [marginX, setMarginX] = useState(0);
  const [marginY, setMarginY] = useState(0);
  const [spacingX, setSpacingX] = useState(0);
  const [spacingY, setSpacingY] = useState(0);
  const [fps, setFps] = useState(12);
  const [skipEmptyFrames, setSkipEmptyFrames] = useState(true);
  const [playingPreview, setPlayingPreview] = useState(true);
  const [previewIdx, setPreviewIdx] = useState(0);

  const sheetCanvasRef = useRef<HTMLCanvasElement>(null);
  const animCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isOpen || !rawRaster) return;
    setCols(Math.max(1, candidate?.suggestedCols || 4));
    setRows(Math.max(1, candidate?.suggestedRows || 1));
    setMarginX(0);
    setMarginY(0);
    setSpacingX(0);
    setSpacingY(0);
    setFps(12);
    setSkipEmptyFrames(true);
    setPreviewIdx(0);
  }, [isOpen, rawRaster, candidate]);

  const cellW = useMemo(() => {
    if (!rawRaster) return 1;
    const usableW = Math.max(1, rawRaster.width - marginX * 2 - spacingX * (cols - 1));
    return Math.max(1, Math.floor(usableW / Math.max(1, cols)));
  }, [rawRaster, cols, marginX, spacingX]);

  const cellH = useMemo(() => {
    if (!rawRaster) return 1;
    const usableH = Math.max(1, rawRaster.height - marginY * 2 - spacingY * (rows - 1));
    return Math.max(1, Math.floor(usableH / Math.max(1, rows)));
  }, [rawRaster, rows, marginY, spacingY]);

  const totalCells = cols * rows;

  // Draw full spritesheet with grid cut overlay (supports both standard & tiled sheets!)
  useEffect(() => {
    if (!isOpen || !rawRaster || !sheetCanvasRef.current) return;
    const canvas = sheetCanvasRef.current;
    const res = paintDecodedPreviewToCanvas(canvas, rawRaster, 460, 220);
    if (!res) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { scale } = res;
    // Only draw grid lines if cell count is reasonable to render crisply (< 4096 cells)
    if (totalCells <= 4096) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const x = (marginX + c * (cellW + spacingX)) * scale;
          const y = (marginY + r * (cellH + spacingY)) * scale;
          const w = cellW * scale;
          const h = cellH * scale;
          const isCurrent = idx === previewIdx % Math.max(1, totalCells);
          ctx.strokeStyle = isCurrent ? '#f59e0b' : 'rgba(56, 189, 248, 0.72)';
          ctx.lineWidth = isCurrent ? 2 : 1;
          ctx.strokeRect(x + 0.5, y + 0.5, Math.max(1, w - 1), Math.max(1, h - 1));
        }
      }
    }
  }, [isOpen, rawRaster, cols, rows, marginX, marginY, spacingX, spacingY, cellW, cellH, previewIdx, totalCells]);

  // Animate sliced frame preview loop
  useEffect(() => {
    if (!isOpen || !playingPreview || totalCells <= 1) return;
    const id = window.setInterval(() => {
      setPreviewIdx((prev) => (prev + 1) % totalCells);
    }, Math.max(25, Math.round(1000 / Math.max(1, fps))));
    return () => window.clearInterval(id);
  }, [isOpen, playingPreview, totalCells, fps]);

  // Paint single current cell into animation preview box (supports standard & tiled sheets)
  useEffect(() => {
    if (!isOpen || !rawRaster || !animCanvasRef.current) return;
    const canvas = animCanvasRef.current;
    const box = 96;
    canvas.width = box;
    canvas.height = box;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, box, box);

    const idx = previewIdx % Math.max(1, totalCells);
    const r = Math.floor(idx / cols);
    const c = idx % cols;
    const sx = marginX + c * (cellW + spacingX);
    const sy = marginY + r * (cellH + spacingY);

    const scale = Math.min((box - 8) / cellW, (box - 8) / cellH);
    const dw = Math.max(1, Math.round(cellW * scale));
    const dh = Math.max(1, Math.round(cellH * scale));
    const dx = Math.floor((box - dw) / 2);
    const dy = Math.floor((box - dh) / 2);
    ctx.imageSmoothingEnabled = false;

    if (rawRaster.tiledStoreId) {
      const store = getTiledStore(rawRaster.tiledStoreId);
      if (store) {
        if (cellW <= 2048 && cellH <= 2048) {
          const rgba = store.sliceRegionToRgba(sx, sy, cellW, cellH);
          const cellCanvas = document.createElement('canvas');
          cellCanvas.width = cellW;
          cellCanvas.height = cellH;
          const cctx = cellCanvas.getContext('2d');
          if (cctx) {
            cctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), cellW, cellH), 0, 0);
            ctx.drawImage(cellCanvas, 0, 0, cellW, cellH, dx, dy, dw, dh);
          }
        } else {
          // Ultra-large cell preview sampled directly onto the 96x96 box
          const stepX = cellW / dw;
          const stepY = cellH / dh;
          for (let py = 0; py < dh; py++) {
            const wy = sy + Math.floor(py * stepY);
            for (let px = 0; px < dw; px++) {
              const wx = sx + Math.floor(px * stepX);
              const col = store.getPixel(wx, wy);
              if (col) {
                ctx.fillStyle = col;
                ctx.fillRect(dx + px, dy + py, 1, 1);
              }
            }
          }
        }
        return;
      }
    }

    if (rawRaster.data && rawRaster.data.length === rawRaster.width * rawRaster.height * 4) {
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = rawRaster.width;
      srcCanvas.height = rawRaster.height;
      const sctx = srcCanvas.getContext('2d');
      if (!sctx) return;
      sctx.putImageData(
        new ImageData(new Uint8ClampedArray(rawRaster.data), rawRaster.width, rawRaster.height),
        0,
        0
      );
      ctx.drawImage(srcCanvas, sx, sy, cellW, cellH, dx, dy, dw, dh);
    }
  }, [isOpen, rawRaster, previewIdx, totalCells, cols, marginX, marginY, spacingX, spacingY, cellW, cellH]);

  if (!isOpen || !rawRaster) return null;

  const baseName = fileName.replace(/\.[^/.]+$/, '');
  const dpi = rawRaster.dpi || 72;

  return (
    <div
      className="fixed inset-0 z-[185] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="w-full max-w-2xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
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
          <div className="min-w-0">
            <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
              <Grid3X3 className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">Dividir Spritesheet en Fotogramas (1:1 Exacto)</span>
            </h3>
            <p className="text-[11px] mt-0.5 truncate font-mono tabular-nums" style={{ color: 'var(--studio-text-muted)' }}>
              {fileName} · {rawRaster.width}×{rawRaster.height} px · {dpi} DPI · Nearest Neighbor 1:1
              {candidate?.reason ? ` · ${candidate.reason}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
            style={{ color: 'var(--studio-text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Preview Grid + Live Animated Cell */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_132px] gap-3">
            <div
              className="rounded-lg border p-3 flex items-center justify-center canvas-checkerboard min-h-[160px] overflow-auto"
              style={{ borderColor: 'var(--studio-border)' }}
            >
              <canvas ref={sheetCanvasRef} className="pixel-canvas max-w-full" />
            </div>

            <div
              className="rounded-lg border p-2.5 flex flex-col items-center justify-between gap-2"
              style={{
                backgroundColor: 'var(--studio-bg-card)',
                borderColor: 'var(--studio-border)',
              }}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                Animación
              </div>
              <div
                className="w-24 h-24 rounded-md border canvas-checkerboard flex items-center justify-center overflow-hidden"
                style={{ borderColor: 'var(--studio-border-strong)' }}
              >
                <canvas ref={animCanvasRef} className="pixel-canvas" />
              </div>
              <div className="w-full flex items-center justify-between text-[10px] font-mono tabular-nums">
                <span style={{ color: 'var(--studio-text-muted)' }}>
                  #{(previewIdx % Math.max(1, totalCells)) + 1}/{totalCells}
                </span>
                <button
                  type="button"
                  onClick={() => setPlayingPreview((v) => !v)}
                  className="p-1 rounded border hover:bg-white/10 cursor-pointer"
                  style={{ borderColor: 'var(--studio-border)' }}
                  title={playingPreview ? 'Pausar vista previa' : 'Reproducir vista previa'}
                >
                  {playingPreview ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          {/* Grid Controls */}
          <div
            className="p-3.5 rounded-lg border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs"
            style={{
              backgroundColor: 'var(--studio-bg-card)',
              borderColor: 'var(--studio-border)',
            }}
          >
            <label className="space-y-1">
              <span className="text-[11px] font-medium block" style={{ color: 'var(--studio-text-muted)' }}>
                Columnas
              </span>
              <input
                type="number"
                min={1}
                max={512}
                value={cols}
                onChange={(e) => setCols(Math.max(1, Math.min(512, parseInt(e.target.value, 10) || 1)))}
                className="w-full px-2.5 py-1.5 rounded-md border font-mono tabular-nums text-xs"
                style={{
                  backgroundColor: 'var(--studio-bg-app)',
                  borderColor: 'var(--studio-border-strong)',
                  color: 'var(--studio-text)',
                }}
              />
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-medium block" style={{ color: 'var(--studio-text-muted)' }}>
                Filas
              </span>
              <input
                type="number"
                min={1}
                max={512}
                value={rows}
                onChange={(e) => setRows(Math.max(1, Math.min(512, parseInt(e.target.value, 10) || 1)))}
                className="w-full px-2.5 py-1.5 rounded-md border font-mono tabular-nums text-xs"
                style={{
                  backgroundColor: 'var(--studio-bg-app)',
                  borderColor: 'var(--studio-border-strong)',
                  color: 'var(--studio-text)',
                }}
              />
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-medium block" style={{ color: 'var(--studio-text-muted)' }}>
                Velocidad (FPS)
              </span>
              <input
                type="number"
                min={1}
                max={60}
                value={fps}
                onChange={(e) => setFps(Math.max(1, Math.min(60, parseInt(e.target.value, 10) || 12)))}
                className="w-full px-2.5 py-1.5 rounded-md border font-mono tabular-nums text-xs"
                style={{
                  backgroundColor: 'var(--studio-bg-app)',
                  borderColor: 'var(--studio-border-strong)',
                  color: 'var(--studio-text)',
                }}
              />
            </label>

            <div className="space-y-1">
              <span className="text-[11px] font-medium block" style={{ color: 'var(--studio-text-muted)' }}>
                Tamaño por frame
              </span>
              <div
                className="px-2.5 py-1.5 rounded-md border font-mono tabular-nums text-xs text-amber-300"
                style={{
                  backgroundColor: 'var(--studio-bg-app)',
                  borderColor: 'var(--studio-border)',
                }}
              >
                {cellW}×{cellH} px
              </div>
            </div>

            <label className="space-y-1">
              <span className="text-[11px] font-medium block" style={{ color: 'var(--studio-text-muted)' }}>
                Margen X (px)
              </span>
              <input
                type="number"
                min={0}
                value={marginX}
                onChange={(e) => setMarginX(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full px-2.5 py-1 rounded-md border font-mono tabular-nums text-xs"
                style={{
                  backgroundColor: 'var(--studio-bg-app)',
                  borderColor: 'var(--studio-border-strong)',
                  color: 'var(--studio-text)',
                }}
              />
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-medium block" style={{ color: 'var(--studio-text-muted)' }}>
                Margen Y (px)
              </span>
              <input
                type="number"
                min={0}
                value={marginY}
                onChange={(e) => setMarginY(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full px-2.5 py-1 rounded-md border font-mono tabular-nums text-xs"
                style={{
                  backgroundColor: 'var(--studio-bg-app)',
                  borderColor: 'var(--studio-border-strong)',
                  color: 'var(--studio-text)',
                }}
              />
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-medium block" style={{ color: 'var(--studio-text-muted)' }}>
                Espaciado X (px)
              </span>
              <input
                type="number"
                min={0}
                value={spacingX}
                onChange={(e) => setSpacingX(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full px-2.5 py-1 rounded-md border font-mono tabular-nums text-xs"
                style={{
                  backgroundColor: 'var(--studio-bg-app)',
                  borderColor: 'var(--studio-border-strong)',
                  color: 'var(--studio-text)',
                }}
              />
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-medium block" style={{ color: 'var(--studio-text-muted)' }}>
                Espaciado Y (px)
              </span>
              <input
                type="number"
                min={0}
                value={spacingY}
                onChange={(e) => setSpacingY(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full px-2.5 py-1 rounded-md border font-mono tabular-nums text-xs"
                style={{
                  backgroundColor: 'var(--studio-bg-app)',
                  borderColor: 'var(--studio-border-strong)',
                  color: 'var(--studio-text)',
                }}
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={skipEmptyFrames}
              onChange={(e) => setSkipEmptyFrames(e.target.checked)}
              className="rounded accent-amber-400"
            />
            <span>Omitir celdas completamente vacías al generar la animación</span>
          </label>
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3.5 border-t flex flex-wrap items-center justify-between gap-2"
          style={{
            backgroundColor: 'var(--studio-bg-bar)',
            borderColor: 'var(--studio-border)',
          }}
        >
          {allowOpenAsSingleImage && onOpenAsSingleImage ? (
            <button
              type="button"
              onClick={onOpenAsSingleImage}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border hover:bg-white/5 transition-colors flex items-center gap-1.5 cursor-pointer"
              style={{
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            >
              <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
              <span>Abrir como imagen completa (1:1)</span>
            </button>
          ) : (
            <span className="text-[11px] font-mono tabular-nums" style={{ color: 'var(--studio-text-muted)' }}>
              {totalCells} celda(s) · {cellW}×{cellH} px
            </span>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border hover:bg-white/5 transition-colors cursor-pointer"
              style={{
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text-muted)',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() =>
                onConfirmSlice({
                  cols,
                  rows,
                  marginX,
                  marginY,
                  spacingX,
                  spacingY,
                  skipEmptyFrames,
                  fps,
                  baseName,
                })
              }
              className="px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
              style={{
                backgroundColor: 'var(--studio-accent)',
                color: 'var(--studio-accent-text)',
              }}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Abrir como Spritesheet ({totalCells} celdas)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

