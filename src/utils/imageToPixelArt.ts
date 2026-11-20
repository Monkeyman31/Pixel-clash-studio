import { hexToRgb, rgbToHex } from './colorFilters';

export type PixelPaletteMode = 'original' | 'active' | 'nes' | 'gameboy' | 'cps2' | 'kof';

export interface ImageToPixelArtOptions {
  targetWidth: number;
  targetHeight: number;
  fidelity: number; // 0 to 100 (higher = sharper edges + closer fidelity to source colors)
  colorCount: number; // 2 to 32 when paletteMode === 'original'
  paletteMode: PixelPaletteMode;
  activePalette?: string[];
  dither?: boolean;
  alphaThreshold?: number; // 0 to 255 (default 96)
  paletteOverrides?: Record<string, string>; // originalHex -> replacementHex
}

export interface ImageToPixelArtResult {
  grid: (string | null)[][];
  extractedPalette: string[];
  mappedPalette: string[];
  width: number;
  height: number;
}

const RETRO_PALETTE_PRESETS: Record<Exclude<PixelPaletteMode, 'original' | 'active'>, string[]> = {
  nes: ['#0c0c0c', '#fcfcfc', '#f83800', '#ffa044', '#0078f8', '#3cbcfc', '#00a800', '#d800cc'],
  gameboy: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
  cps2: [
    '#0d0f18', '#ffffff', '#f43f5e', '#fb923c', '#facc15', '#22c55e',
    '#06b6d4', '#3b82f6', '#8b5cf6', '#fca5a5', '#fed7aa', '#1e293b',
  ],
  kof: [
    '#08080c', '#f8fafc', '#dc2626', '#991b1b', '#f59e0b', '#fbbf24',
    '#1d4ed8', '#64748b', '#334155', '#fde047', '#e2b89b', '#8c5a3c',
  ],
};

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function colorDistSq(a: [number, number, number], b: [number, number, number]): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114;
}

function findNearestPaletteColor(
  rgb: [number, number, number],
  paletteRgb: { hex: string; rgb: [number, number, number] }[]
): string {
  if (paletteRgb.length === 0) return rgbToHex(rgb[0], rgb[1], rgb[2]);
  let best = paletteRgb[0].hex;
  let bestDist = Infinity;
  for (const item of paletteRgb) {
    const d = colorDistSq(rgb, item.rgb);
    if (d < bestDist) {
      bestDist = d;
      best = item.hex;
    }
  }
  return best;
}

// Median-Cut color quantization so original palette preserves prominent highlights, midtones & shadows
function quantizeMedianCut(
  samples: [number, number, number][],
  maxColors: number
): string[] {
  if (samples.length === 0) return ['#ffffff'];
  const target = Math.max(2, Math.min(128, Math.round(maxColors)));

  type Bucket = [number, number, number][];
  let buckets: Bucket[] = [samples];

  while (buckets.length < target) {
    // Pick bucket with largest RGB channel range
    let splitIdx = -1;
    let bestRange = -1;
    let bestChannel = 0;

    for (let i = 0; i < buckets.length; i++) {
      const b = buckets[i];
      if (b.length < 2) continue;
      for (let ch = 0; ch < 3; ch++) {
        let min = 255;
        let max = 0;
        for (const px of b) {
          if (px[ch] < min) min = px[ch];
          if (px[ch] > max) max = px[ch];
        }
        const range = max - min;
        if (range > bestRange) {
          bestRange = range;
          splitIdx = i;
          bestChannel = ch;
        }
      }
    }

    if (splitIdx === -1 || bestRange <= 4) break;
    const chosen = buckets.splice(splitIdx, 1)[0];
    chosen.sort((a, b) => a[bestChannel] - b[bestChannel]);
    const mid = Math.floor(chosen.length / 2);
    buckets.push(chosen.slice(0, mid), chosen.slice(mid));
  }

  const uniqueHex = new Set<string>();
  for (const b of buckets) {
    if (b.length === 0) continue;
    let sr = 0;
    let sg = 0;
    let sb = 0;
    for (const px of b) {
      sr += px[0];
      sg += px[1];
      sb += px[2];
    }
    const hex = rgbToHex(sr / b.length, sg / b.length, sb / b.length);
    uniqueHex.add(hex);
  }

  return Array.from(uniqueHex);
}

export async function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
    img.src = src;
  });
}

export function convertImageElementToPixelArt(
  img: HTMLImageElement,
  options: ImageToPixelArtOptions
): ImageToPixelArtResult {
  const targetWidth = Math.max(1, Math.round(options.targetWidth));
  const targetHeight = Math.max(1, Math.round(options.targetHeight));
  const fidelity = Math.max(0, Math.min(100, options.fidelity));
  const alphaCutoff = options.alphaThreshold ?? 96;

  // Step 1: Sample at supersampled resolution first if fidelity is high, then downsample crisply
  const workCanvas = document.createElement('canvas');
  workCanvas.width = targetWidth;
  workCanvas.height = targetHeight;
  const ctx = workCanvas.getContext('2d');
  if (!ctx) {
    return {
      grid: Array.from({ length: targetHeight }, () => Array(targetWidth).fill(null)),
      extractedPalette: [],
      mappedPalette: [],
      width: targetWidth,
      height: targetHeight,
    };
  }

  // Fit image preserving aspect ratio inside targetWidth x targetHeight
  const imgAspect = img.naturalWidth / Math.max(1, img.naturalHeight);
  const boxAspect = targetWidth / targetHeight;
  let drawW = targetWidth;
  let drawH = targetHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (imgAspect > boxAspect) {
    drawH = Math.max(1, Math.round(targetWidth / imgAspect));
    offsetY = Math.floor((targetHeight - drawH) / 2);
  } else {
    drawW = Math.max(1, Math.round(targetHeight * imgAspect));
    offsetX = Math.floor((targetWidth - drawW) / 2);
  }

  // Higher fidelity uses sharper sampling; lower fidelity smooths color blocks
  ctx.imageSmoothingEnabled = fidelity < 60;
  ctx.imageSmoothingQuality = fidelity < 35 ? 'low' : 'medium';
  ctx.clearRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

  const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight).data;

  // Step 2: Build raw RGB matrix with optional fidelity contrast & sharpening boost
  const contrastFactor = 1 + ((fidelity - 50) / 100) * 0.45;
  const rawSamples: [number, number, number][] = [];
  const rgbMatrix: ([number, number, number] | null)[][] = Array.from(
    { length: targetHeight },
    () => Array(targetWidth).fill(null)
  );

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const idx = (y * targetWidth + x) * 4;
      const a = imgData[idx + 3];
      if (a < alphaCutoff) continue;

      let r = imgData[idx];
      let g = imgData[idx + 1];
      let b = imgData[idx + 2];

      // Subtle fidelity contrast tuning
      if (Math.abs(fidelity - 50) > 4) {
        r = Math.max(0, Math.min(255, Math.round((r - 128) * contrastFactor + 128)));
        g = Math.max(0, Math.min(255, Math.round((g - 128) * contrastFactor + 128)));
        b = Math.max(0, Math.min(255, Math.round((b - 128) * contrastFactor + 128)));
      }

      const rgb: [number, number, number] = [r, g, b];
      rgbMatrix[y][x] = rgb;
      rawSamples.push(rgb);
    }
  }

  // Step 3: Resolve base palette
  let basePalette: string[];
  if (options.paletteMode === 'original') {
    // Fidelity subtly boosts effective color resolution unless user caps it explicitly
    const effectiveColors = Math.max(2, Math.min(32, options.colorCount));
    basePalette = quantizeMedianCut(rawSamples, effectiveColors);
  } else if (options.paletteMode === 'active') {
    basePalette =
      options.activePalette && options.activePalette.length > 0
        ? options.activePalette
        : RETRO_PALETTE_PRESETS.cps2;
  } else {
    basePalette = RETRO_PALETTE_PRESETS[options.paletteMode];
  }

  const paletteRgb = basePalette.map((hex) => ({
    hex: hex.toLowerCase(),
    rgb: hexToRgb(hex),
  }));

  // Step 4: Map every pixel using optional ordered Bayer dithering controlled by fidelity
  const overrides = options.paletteOverrides || {};
  const ditherStrength = options.dither ? Math.max(8, Math.round((100 - fidelity * 0.45) * 0.45)) : 0;

  const grid: (string | null)[][] = Array.from({ length: targetHeight }, () =>
    Array(targetWidth).fill(null)
  );

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const px = rgbMatrix[y][x];
      if (!px) continue;

      let sample = px;
      if (ditherStrength > 0) {
        const bayerVal = (BAYER_4X4[y % 4][x % 4] / 16 - 0.5) * ditherStrength * 2;
        sample = [
          Math.max(0, Math.min(255, px[0] + bayerVal)),
          Math.max(0, Math.min(255, px[1] + bayerVal)),
          Math.max(0, Math.min(255, px[2] + bayerVal)),
        ];
      }

      const nearest = findNearestPaletteColor(sample, paletteRgb);
      grid[y][x] = overrides[nearest] || nearest;
    }
  }

  const mappedPalette = basePalette.map((c) => {
    const lc = c.toLowerCase();
    return overrides[lc] || lc;
  });

  return {
    grid,
    extractedPalette: basePalette.map((c) => c.toLowerCase()),
    mappedPalette,
    width: targetWidth,
    height: targetHeight,
  };
}
