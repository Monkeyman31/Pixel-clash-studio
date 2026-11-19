import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, Grid, Palette, Sparkles, Layers, Check, BookmarkPlus, RotateCcw } from 'lucide-react';
import {
  PixelPaletteMode,
  convertImageElementToPixelArt,
  loadHtmlImage,
} from '../utils/imageToPixelArt';
import { StudioSlider } from './StudioSlider';

interface ImageToPixelPanelProps {
  canvasWidth: number;
  canvasHeight: number;
  activePaletteColors: string[];
  onApplyPixelGrid: (
    grid: (string | null)[][],
    mode: 'current_layer' | 'new_layer',
    name?: string
  ) => void;
  onSaveToLibrary?: (
    name: string,
    grid: (string | null)[][],
    width: number,
    height: number
  ) => void;
  onLivePreviewChange?: (
    preview: { grid: (string | null)[][]; beforeAfterSplit?: number | null } | null
  ) => void;
}

export const ImageToPixelPanel: React.FC<ImageToPixelPanelProps> = ({
  canvasWidth,
  canvasHeight,
  activePaletteColors,
  onApplyPixelGrid,
  onSaveToLibrary,
  onLivePreviewChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const [sourceDataUrl, setSourceDataUrl] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState<string>('Sprite Convertido');
  const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(null);

  // Conversion Controls
  const [pixelSizeMode, setPixelSizeMode] = useState<'canvas' | 'custom'>('canvas');
  const [customResolution, setCustomResolution] = useState<number>(48);
  const [fidelity, setFidelity] = useState<number>(78);
  const [paletteMode, setPaletteMode] = useState<PixelPaletteMode>('original');
  const [colorCount, setColorCount] = useState<number>(12);
  const [dither, setDither] = useState<boolean>(false);
  const [paletteOverrides, setPaletteOverrides] = useState<Record<string, string>>({});
  const [liveOnCanvas, setLiveOnCanvas] = useState<boolean>(true);

  const targetW = pixelSizeMode === 'canvas' ? canvasWidth : customResolution;
  const targetH = pixelSizeMode === 'canvas' ? canvasHeight : customResolution;

  const handleUploadFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result;
      if (typeof dataUrl === 'string') {
        try {
          const img = await loadHtmlImage(dataUrl);
          setSourceDataUrl(dataUrl);
          setSourceName(file.name.replace(/\.[^.]+$/, '') || 'Imagen PixelArt');
          setLoadedImg(img);
          setPaletteOverrides({});
        } catch {
          // ignore invalid image
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Compute live pixel-art conversion whenever controls or color overrides change
  const converted = useMemo(() => {
    if (!loadedImg) return null;
    return convertImageElementToPixelArt(loadedImg, {
      targetWidth: targetW,
      targetHeight: targetH,
      fidelity,
      colorCount,
      paletteMode,
      activePalette: activePaletteColors,
      dither,
      paletteOverrides,
    });
  }, [
    loadedImg,
    targetW,
    targetH,
    fidelity,
    colorCount,
    paletteMode,
    activePaletteColors,
    dither,
    paletteOverrides,
  ]);

  // Draw converted pixel art on preview canvas
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !converted) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const previewBox = 128;
    canvas.width = previewBox;
    canvas.height = previewBox;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, previewBox, previewBox);

    const scaleX = previewBox / converted.width;
    const scaleY = previewBox / converted.height;
    const cell = Math.min(scaleX, scaleY);
    const offX = (previewBox - converted.width * cell) / 2;
    const offY = (previewBox - converted.height * cell) / 2;

    for (let y = 0; y < converted.height; y++) {
      for (let x = 0; x < converted.width; x++) {
        const col = converted.grid[y]?.[x];
        if (col) {
          ctx.fillStyle = col;
          ctx.fillRect(
            Math.floor(offX + x * cell),
            Math.floor(offY + y * cell),
            Math.ceil(cell),
            Math.ceil(cell)
          );
        }
      }
    }
  }, [converted]);

  // Helper to resize converted grid to current canvas dimensions when stamping
  const fitGridToCanvas = useMemo(
    () =>
      (srcGrid: (string | null)[][], srcW: number, srcH: number): (string | null)[][] => {
        const out: (string | null)[][] = Array.from({ length: canvasHeight }, () =>
          Array(canvasWidth).fill(null)
        );
        if (srcW === canvasWidth && srcH === canvasHeight) {
          return srcGrid.map((r) => [...r]);
        }
        for (let y = 0; y < canvasHeight; y++) {
          const sy = Math.min(srcH - 1, Math.floor((y / canvasHeight) * srcH));
          for (let x = 0; x < canvasWidth; x++) {
            const sx = Math.min(srcW - 1, Math.floor((x / canvasWidth) * srcW));
            out[y][x] = srcGrid[sy]?.[sx] ?? null;
          }
        }
        return out;
      },
    [canvasWidth, canvasHeight]
  );

  useEffect(() => {
    if (!onLivePreviewChange) return;
    if (converted && liveOnCanvas) {
      onLivePreviewChange({
        grid: fitGridToCanvas(converted.grid, converted.width, converted.height),
        beforeAfterSplit: null,
      });
    } else {
      onLivePreviewChange(null);
    }
  }, [converted, liveOnCanvas, fitGridToCanvas, onLivePreviewChange]);

  useEffect(() => {
    return () => onLivePreviewChange?.(null);
  }, [onLivePreviewChange]);

  return (
    <div className="flex flex-col gap-2.5 text-xs">
      {/* Upload Zone */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUploadFile(f);
          e.target.value = '';
        }}
        className="sr-only"
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 font-semibold transition-colors hover:opacity-90"
        style={{
          borderColor: 'var(--studio-border-strong)',
          backgroundColor: 'var(--studio-bg-card)',
          color: 'var(--studio-accent)',
        }}
      >
        <Upload className="w-4 h-4" />
        <span>{sourceDataUrl ? 'Cambiar Imagen de Origen...' : 'Subir Imagen para Convertir a Pixel Art'}</span>
      </button>

      {sourceDataUrl && converted && (
        <>
          {/* Side-by-Side Original vs PixelArt Comparison */}
          <div className="grid grid-cols-2 gap-2">
            <div
              className="p-1.5 rounded-xl border flex flex-col items-center gap-1"
              style={{
                backgroundColor: 'var(--studio-bg-card)',
                borderColor: 'var(--studio-border)',
              }}
            >
              <span className="text-[9px] font-mono uppercase" style={{ color: 'var(--studio-text-muted)' }}>
                Original
              </span>
              <div className="w-full aspect-square rounded overflow-hidden bg-black/40 flex items-center justify-center">
                <img
                  src={sourceDataUrl}
                  alt="Original"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>

            <div
              className="p-1.5 rounded-xl border flex flex-col items-center gap-1"
              style={{
                backgroundColor: 'var(--studio-bg-card)',
                borderColor: 'var(--studio-accent)',
              }}
            >
              <span className="text-[9px] font-mono uppercase font-bold" style={{ color: 'var(--studio-accent)' }}>
                PixelArt ({converted.width}×{converted.height})
              </span>
              <div className="w-full aspect-square rounded overflow-hidden canvas-checkerboard flex items-center justify-center">
                <canvas
                  ref={previewCanvasRef}
                  className="pixel-canvas w-full h-full object-contain"
                />
              </div>
            </div>
          </div>

          {/* Pixel Grid Resolution & Fidelity Controls */}
          <div
            className="p-2.5 rounded-xl border flex flex-col gap-2"
            style={{
              backgroundColor: 'var(--studio-bg-card)',
              borderColor: 'var(--studio-border)',
            }}
          >
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="flex items-center gap-1 font-semibold">
                <Grid className="w-3.5 h-3.5 text-sky-400" />
                <span>Cantidad de Píxeles:</span>
              </span>
              <span className="font-bold tabular-nums" style={{ color: 'var(--studio-accent)' }}>
                {targetW}×{targetH} px
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => setPixelSizeMode('canvas')}
                className="py-1 rounded border text-[10px] font-mono font-semibold"
                style={{
                  backgroundColor: pixelSizeMode === 'canvas' ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                  color: pixelSizeMode === 'canvas' ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                  borderColor: 'var(--studio-border)',
                }}
              >
                Lienzo ({canvasWidth}px)
              </button>
              {[16, 24, 32, 48, 64, 96].slice(0, 5).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => {
                    setPixelSizeMode('custom');
                    setCustomResolution(sz);
                  }}
                  className="py-1 rounded border text-[10px] font-mono font-semibold"
                  style={{
                    backgroundColor:
                      pixelSizeMode === 'custom' && customResolution === sz
                        ? 'var(--studio-accent)'
                        : 'var(--studio-bg-elevated)',
                    color:
                      pixelSizeMode === 'custom' && customResolution === sz
                        ? 'var(--studio-accent-text)'
                        : 'var(--studio-text-muted)',
                    borderColor: 'var(--studio-border)',
                  }}
                >
                  {sz}×{sz}
                </button>
              ))}
            </div>

            {pixelSizeMode === 'custom' && (
              <StudioSlider
                variant="panel"
                label="Resolución personalizada"
                value={customResolution}
                min={12}
                max={512}
                step={2}
                unit=" px"
                defaultValue={48}
                allowManualOverflow
                hardMax={1024}
                accentColor="#38bdf8"
                onChange={setCustomResolution}
              />
            )}

            {/* Fidelity Control */}
            <div className="flex flex-col gap-1 pt-1 border-t" style={{ borderColor: 'var(--studio-border)' }}>
              <StudioSlider
                variant="panel"
                label="Fidelidad vs Original"
                value={fidelity}
                min={0}
                max={100}
                step={1}
                unit="%"
                defaultValue={75}
                accentColor="#34d399"
                onChange={setFidelity}
              />
              <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>
                <span>Estilizado suave</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={dither}
                    onChange={(e) => setDither(e.target.checked)}
                    className="accent-amber-400 rounded"
                  />
                  <span>Tramado Dither Retro</span>
                </label>
                <span>Nitidez alta</span>
              </div>
            </div>
          </div>

          {/* Palette Selection & Per-Color Editing */}
          <div
            className="p-2.5 rounded-xl border flex flex-col gap-2"
            style={{
              backgroundColor: 'var(--studio-bg-card)',
              borderColor: 'var(--studio-border)',
            }}
          >
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="flex items-center gap-1 font-semibold">
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                <span>Paleta Resultante</span>
              </span>
              {Object.keys(paletteOverrides).length > 0 && (
                <button
                  type="button"
                  onClick={() => setPaletteOverrides({})}
                  className="text-[10px] flex items-center gap-1 text-amber-400 hover:underline"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Original</span>
                </button>
              )}
            </div>

            <select
              value={paletteMode}
              onChange={(e) => {
                setPaletteMode(e.target.value as PixelPaletteMode);
                setPaletteOverrides({});
              }}
              className="w-full rounded-lg border px-2 py-1 text-[11px] font-mono"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            >
              <option value="original">Paleta Original Extraída (Median-Cut)</option>
              <option value="active">Paleta Activa / Lospec del Estudio</option>
              <option value="cps2">Capcom CPS-2 Arcade</option>
              <option value="kof">SNK Neo-Geo / KOF</option>
              <option value="nes">Retro 8-Bit NES</option>
              <option value="gameboy">GameBoy DMG 4-Tonos</option>
            </select>

            {paletteMode === 'original' && (
              <StudioSlider
                variant="panel"
                label="Máximo de Colores"
                value={colorCount}
                min={2}
                max={128}
                step={1}
                unit=" col."
                defaultValue={16}
                onChange={(v) => {
                  setColorCount(v);
                  setPaletteOverrides({});
                }}
              />
            )}

            {/* Editable Color Swatches */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-mono" style={{ color: 'var(--studio-text-muted)' }}>
                Clic en cualquier color para modificarlo en tiempo real:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {converted.extractedPalette.map((origHex) => {
                  const mappedHex = paletteOverrides[origHex] || origHex;
                  const isEdited = Boolean(paletteOverrides[origHex]);
                  return (
                    <label
                      key={origHex}
                      title={`Original ${origHex} → Actual ${mappedHex} (Clic para cambiar)`}
                      className={`relative w-6 h-6 rounded border cursor-pointer overflow-hidden shadow-xs transition-transform hover:scale-110 ${
                        isEdited ? 'ring-2 ring-amber-400 border-white' : 'border-white/30'
                      }`}
                      style={{ backgroundColor: mappedHex }}
                    >
                      <input
                        type="color"
                        value={mappedHex}
                        onChange={(e) =>
                          setPaletteOverrides((prev) => ({
                            ...prev,
                            [origHex]: e.target.value,
                          }))
                        }
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Live on Canvas toggle & Apply / Cancel */}
          <div className="flex items-center justify-between gap-2 text-[10px]">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={liveOnCanvas}
                onChange={(e) => setLiveOnCanvas(e.target.checked)}
                className="accent-amber-400"
              />
              <span>Previsualizar en vivo sobre lienzo</span>
            </label>
            <button
              type="button"
              onClick={() => {
                setSourceDataUrl(null);
                setLoadedImg(null);
                onLivePreviewChange?.(null);
              }}
              className="text-rose-400 hover:underline font-semibold"
            >
              Cancelar
            </button>
          </div>

          {/* Apply / Save Actions */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => {
                onApplyPixelGrid(
                  fitGridToCanvas(converted.grid, converted.width, converted.height),
                  'current_layer',
                  sourceName
                );
                onLivePreviewChange?.(null);
              }}
              className="py-2 px-2 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1 hover:opacity-90"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Aplicar en Capa</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onApplyPixelGrid(
                  fitGridToCanvas(converted.grid, converted.width, converted.height),
                  'new_layer',
                  sourceName
                );
                onLivePreviewChange?.(null);
              }}
              className="py-2 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 hover:opacity-90"
              style={{
                backgroundColor: 'var(--studio-accent)',
                color: 'var(--studio-accent-text)',
              }}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Aplicar Nueva Capa</span>
            </button>
          </div>

          {onSaveToLibrary && (
            <button
              type="button"
              onClick={() =>
                onSaveToLibrary(sourceName, converted.grid, converted.width, converted.height)
              }
              className="w-full py-1.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1.5 hover:opacity-90"
              style={{
                backgroundColor: 'var(--studio-bg-card)',
                borderColor: 'var(--studio-border)',
                color: 'var(--studio-text)',
              }}
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-amber-400" />
              <span>Guardar en Mi Librería</span>
            </button>
          )}
        </>
      )}
    </div>
  );
};
