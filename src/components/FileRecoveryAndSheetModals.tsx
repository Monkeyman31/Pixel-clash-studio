import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Film,
  FolderSearch,
  Grid3X3,
  Image as ImageIcon,
  Play,
  Pause,
  Trash2,
  X,
  FileWarning,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { RecentProjectEntry } from '../types';
import {
  DecodedRgbaImage,
  SpritesheetCandidateInfo,
  SpritesheetSliceOptions,
} from '../utils/fileImporter';

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
      className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
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
      className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
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
// 3. INTERACTIVE SPRITESHEET SLICER MODAL
// Triggered when opening a spritesheet candidate or via Importar Spritesheet
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

  // Draw full spritesheet with red/amber grid cut overlay
  useEffect(() => {
    if (!isOpen || !rawRaster || !sheetCanvasRef.current) return;
    const canvas = sheetCanvasRef.current;
    const maxW = 460;
    const maxH = 220;
    const scale = Math.min(maxW / rawRaster.width, maxH / rawRaster.height, 4);
    const drawW = Math.max(1, Math.round(rawRaster.width * scale));
    const drawH = Math.max(1, Math.round(rawRaster.height * scale));
    canvas.width = drawW;
    canvas.height = drawH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, drawW, drawH);
    ctx.drawImage(srcCanvas, 0, 0, drawW, drawH);

    // Draw cut cells
    ctx.lineWidth = 1;
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
  }, [isOpen, rawRaster, cols, rows, marginX, marginY, spacingX, spacingY, cellW, cellH, previewIdx, totalCells]);

  // Animate sliced frame preview loop
  useEffect(() => {
    if (!isOpen || !playingPreview || totalCells <= 1) return;
    const id = window.setInterval(() => {
      setPreviewIdx((prev) => (prev + 1) % totalCells);
    }, Math.max(25, Math.round(1000 / Math.max(1, fps))));
    return () => window.clearInterval(id);
  }, [isOpen, playingPreview, totalCells, fps]);

  // Paint single current cell into animation preview box
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

    const scale = Math.min((box - 8) / cellW, (box - 8) / cellH);
    const dw = Math.max(1, Math.round(cellW * scale));
    const dh = Math.max(1, Math.round(cellH * scale));
    const dx = Math.floor((box - dw) / 2);
    const dy = Math.floor((box - dh) / 2);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(srcCanvas, sx, sy, cellW, cellH, dx, dy, dw, dh);
  }, [isOpen, rawRaster, previewIdx, totalCells, cols, marginX, marginY, spacingX, spacingY, cellW, cellH]);

  if (!isOpen || !rawRaster) return null;

  const baseName = fileName.replace(/\.[^/.]+$/, '');

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
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
              <span className="truncate">Dividir Spritesheet en Fotogramas</span>
            </h3>
            <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--studio-text-muted)' }}>
              {fileName} ({rawRaster.width}×{rawRaster.height} px)
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
                max={64}
                value={cols}
                onChange={(e) => setCols(Math.max(1, Math.min(64, parseInt(e.target.value, 10) || 1)))}
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
                max={64}
                value={rows}
                onChange={(e) => setRows(Math.max(1, Math.min(64, parseInt(e.target.value, 10) || 1)))}
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
                max={256}
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
                max={256}
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
                max={128}
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
                max={128}
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
              <span>Abrir como imagen completa (1 fotograma)</span>
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
