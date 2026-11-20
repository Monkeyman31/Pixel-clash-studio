// =============================================================================
// HARDWARE-AWARE MEMORY, VRAM & PROJECT SIZE ESTIMATOR (NO ARTIFICIAL LIMITS)
// =============================================================================
// Dynamically inspects host hardware capabilities and computes estimated RAM,
// VRAM, and .pcs project file size for any arbitrary canvas resolution
// (from 1×1 up to 10000×10000, 32000×32000, or higher) without hard caps.

export type ResourceLoadSeverity = 'optimal' | 'moderate' | 'high' | 'extreme';

export interface HardwareCapabilities {
  deviceMemoryGb: number; // navigator.deviceMemory (fallback 8 GB)
  cpuCores: number; // navigator.hardwareConcurrency (fallback 4)
  maxTextureSize: number; // WebGL MAX_TEXTURE_SIZE (fallback 8192)
}

export interface CanvasResourceEstimate {
  width: number;
  height: number;
  totalPixels: number;
  ramBytes: number;
  vramBytes: number;
  projectBytes: number;
  ramFormatted: string;
  vramFormatted: string;
  projectFormatted: string;
  usesTiledEngine: boolean;
  exceedsGpuTexture: boolean;
  severity: ResourceLoadSeverity;
  severityLabel: string;
  warningMessage: string | null;
  recommendationNote: string | null;
  hardware: HardwareCapabilities;
}

let cachedHardware: HardwareCapabilities | null = null;

export function detectHardwareCapabilities(): HardwareCapabilities {
  if (cachedHardware) return cachedHardware;

  let deviceMemoryGb = 8;
  let cpuCores = 4;
  let maxTextureSize = 8192;

  if (typeof navigator !== 'undefined') {
    const nav = navigator as Navigator & { deviceMemory?: number };
    if (typeof nav.deviceMemory === 'number' && nav.deviceMemory > 0) {
      deviceMemoryGb = nav.deviceMemory;
    }
    if (typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency > 0) {
      cpuCores = navigator.hardwareConcurrency;
    }
  }

  if (typeof document !== 'undefined') {
    try {
      const glCanvas = document.createElement('canvas');
      const gl =
        glCanvas.getContext('webgl2') ||
        glCanvas.getContext('webgl') ||
        (glCanvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
      if (gl) {
        const tex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        if (typeof tex === 'number' && tex >= 1024) {
          maxTextureSize = tex;
        }
      }
    } catch {
      // Ignore WebGL probe failures in headless environments
    }
  }

  cachedHardware = { deviceMemoryGb, cpuCores, maxTextureSize };
  return cachedHardware;
}

export function formatBytesCompact(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function estimateCanvasResources(params: {
  width: number;
  height: number;
  layersCount?: number;
  framesCount?: number;
  isSparseBlank?: boolean;
}): CanvasResourceEstimate {
  const width = Math.max(1, Math.round(params.width || 1));
  const height = Math.max(1, Math.round(params.height || 1));
  const layersCount = Math.max(1, Math.round(params.layersCount || 1));
  const framesCount = Math.max(1, Math.round(params.framesCount || 1));
  const hardware = detectHardwareCapabilities();

  const totalPixels = width * height;
  const usesTiledEngine = width > 1024 || height > 1024 || totalPixels > 1024 * 1024;
  const exceedsGpuTexture = width > hardware.maxTextureSize || height > hardware.maxTextureSize;

  // Dense RGBA buffer = 4 bytes/pixel.
  // In standard pixel-grid mode (<= 1024×1024), JS pixel matrix + render cache ≈ 14 bytes/pixel/layer.
  // In Tiled/Chunked mode (> 1024px), tiles are 256×256 RGBA Uint8ClampedArray allocated on demand:
  //   - When creating a blank/solid canvas, initial memory is sparse (~10% populated estimate for active working set)
  //   - When opening a full dense spritesheet/image, active RGBA tile memory is ~4 bytes/pixel/layer + bounded viewport VRAM cache.
  const denseRgbaBytes = totalPixels * 4 * layersCount * framesCount;
  const ramBytes = usesTiledEngine
    ? params.isSparseBlank
      ? Math.max(256 * 1024, Math.round(denseRgbaBytes * 0.15))
      : Math.round(denseRgbaBytes * 1.15)
    : Math.round(totalPixels * 14 * layersCount * framesCount);

  // VRAM: standard mode uploads full frame canvas; tiled mode bounds GPU tile cache to ~128 visible tiles (~32 MB max)
  const vramBytes = usesTiledEngine
    ? Math.min(36 * 1024 * 1024, Math.max(4 * 1024 * 1024, totalPixels * 4))
    : Math.max(64 * 1024, totalPixels * 4 * Math.min(4, layersCount + 1));

  // Compressed .pcs (ZIP) project estimate (~18% of dense RGBA for pixel art / ~35% for dense raster)
  const projectBytes = Math.max(
    4096,
    Math.round(denseRgbaBytes * (params.isSparseBlank ? 0.04 : 0.28))
  );

  // Determine load severity relative to host device RAM (never blocks creation!)
  const hostRamBytes = hardware.deviceMemoryGb * 1024 * 1024 * 1024;
  const ramRatio = ramBytes / Math.max(1, hostRamBytes);

  let severity: ResourceLoadSeverity = 'optimal';
  let severityLabel = 'Óptimo';
  let warningMessage: string | null = null;
  let recommendationNote: string | null = null;

  if (totalPixels >= 64_000_000 || ramRatio >= 0.28 || width >= 12000 || height >= 12000) {
    severity = 'extreme';
    severityLabel = 'Muy elevado';
    warningMessage =
      'Este documento puede consumir una cantidad elevada de memoria y afectar al rendimiento.';
    recommendationNote =
      'Se activará automáticamente el motor por bloques (Tiled 256×256) bajo demanda para mantener la fluidez sin limitar tu resolución.';
  } else if (totalPixels >= 16_000_000 || ramRatio >= 0.1 || width > 4096 || height > 4096) {
    severity = 'high';
    severityLabel = 'Elevado';
    warningMessage =
      'Este documento puede consumir una cantidad elevada de memoria y afectar al rendimiento.';
    recommendationNote =
      'Renderizado por bloques (Tiled) activo: solo se procesan los bloques visibles en pantalla.';
  } else if (usesTiledEngine) {
    severity = 'moderate';
    severityLabel = 'Moderado';
    warningMessage = null;
    recommendationNote =
      'Motor por bloques (Tiled 256×256) activo para conservar píxeles 1:1 a alta resolución sin redimensionamiento.';
  }

  return {
    width,
    height,
    totalPixels,
    ramBytes,
    vramBytes,
    projectBytes,
    ramFormatted: formatBytesCompact(ramBytes),
    vramFormatted: formatBytesCompact(vramBytes),
    projectFormatted: formatBytesCompact(projectBytes),
    usesTiledEngine,
    exceedsGpuTexture,
    severity,
    severityLabel,
    warningMessage,
    recommendationNote,
    hardware,
  };
}
