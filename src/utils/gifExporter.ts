import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { Frame, LayerGroup } from '../types';
import { compositeFrame } from './pixelMath';

export interface GifExportOptions {
  scale: number;
  fps: number;
  pingpong: boolean;
  transparent: boolean;
  loop: number; // 0 for infinite
  layerGroups?: LayerGroup[];
}

export function generateAnimatedGif(
  frames: Frame[],
  width: number,
  height: number,
  options: GifExportOptions
): Uint8Array {
  const { scale = 2, fps = 12, pingpong = false, transparent = true, loop = 0 } = options;
  const targetW = width * scale;
  const targetH = height * scale;

  const gif = GIFEncoder();

  // Create sequence of frames (ping-pong or forward)
  let sequence: Frame[] = [...frames];
  if (pingpong && frames.length > 2) {
    const reversed = [...frames.slice(1, -1)].reverse();
    sequence = [...frames, ...reversed];
  }

  // Temporary canvas to render each frame scaled
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('No se pudo inicializar el contexto 2D para GIF');
  }
  ctx.imageSmoothingEnabled = false;

  const baseDelayMs = Math.round(1000 / fps);

  sequence.forEach((frame, fIdx) => {
    ctx.clearRect(0, 0, targetW, targetH);

    // If not transparent, fill with dark background
    if (!transparent) {
      ctx.fillStyle = '#11141c';
      ctx.fillRect(0, 0, targetW, targetH);
    }

    const composited = compositeFrame(frame, width, height, fIdx, true, options.layerGroups);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const col = composited[y]?.[x];
        if (col) {
          ctx.fillStyle = col;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }

    const { data } = ctx.getImageData(0, 0, targetW, targetH);
    
    // Convert RGBA to indexed palette using gifenc
    // format 'rgba4444' or quantize max 256 colors
    const palette = quantize(data, 256, {
      format: 'rgba4444',
      oneBitAlpha: transparent
    });

    const index = applyPalette(data, palette, 'rgba4444');

    // Calculate delay based on frame duration ticks (e.g. 4 ticks = (4/60)*1000 ms)
    const frameDelayMs = frame.durationTicks
      ? Math.max(20, Math.round((frame.durationTicks / 60) * 1000))
      : baseDelayMs;

    gif.writeFrame(index, targetW, targetH, {
      palette,
      delay: frameDelayMs,
      repeat: loop,
      transparent: transparent,
      transparentIndex: transparent ? palette.findIndex((p: number[]) => p[3] === 0) : -1
    });
  });

  gif.finish();
  return gif.bytes();
}

export function downloadGif(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as any], { type: 'image/gif' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.gif') ? filename : `${filename}.gif`;
  a.click();
  URL.revokeObjectURL(url);
}
