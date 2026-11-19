import { Frame, Hitbox, Layer } from '../types';
import { createEmptyGrid } from './pixelMath';

export type AnchorPosition = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

// Resize Canvas (Adds padding or crops pixels according to anchor)
export function resizeCanvasGrid(
  frames: Frame[],
  oldW: number,
  oldH: number,
  newW: number,
  newH: number,
  anchor: AnchorPosition = 'center'
): Frame[] {
  let offsetX = 0;
  let offsetY = 0;

  // Calculate X offset
  if (anchor.includes('left')) {
    offsetX = 0;
  } else if (anchor.includes('right')) {
    offsetX = newW - oldW;
  } else {
    offsetX = Math.floor((newW - oldW) / 2);
  }

  // Calculate Y offset
  if (anchor.includes('top')) {
    offsetY = 0;
  } else if (anchor.includes('bottom')) {
    offsetY = newH - oldH;
  } else {
    offsetY = Math.floor((newH - oldH) / 2);
  }

  return frames.map((frame) => {
    const nextLayers: Layer[] = frame.layers.map((layer) => {
      const newGrid = createEmptyGrid(newW, newH);
      for (let y = 0; y < oldH; y++) {
        for (let x = 0; x < oldW; x++) {
          const col = layer.pixels[y]?.[x];
          const destX = x + offsetX;
          const destY = y + offsetY;
          if (col && destX >= 0 && destX < newW && destY >= 0 && destY < newH) {
            newGrid[destY][destX] = col;
          }
        }
      }
      return { ...layer, pixels: newGrid };
    });

    const nextHitboxes: Hitbox[] = (frame.hitboxes || []).map((hb) => ({
      ...hb,
      x: Math.max(0, Math.min(newW - hb.w, hb.x + offsetX)),
      y: Math.max(0, Math.min(newH - hb.h, hb.y + offsetY)),
    }));

    return {
      ...frame,
      layers: nextLayers,
      hitboxes: nextHitboxes,
      pivot: frame.pivot
        ? { x: frame.pivot.x + offsetX, y: frame.pivot.y + offsetY }
        : undefined,
    };
  });
}

// Rescale Image / Sprite (Nearest Neighbor Pixel Art Resampling)
export function rescaleSpriteGrid(
  frames: Frame[],
  oldW: number,
  oldH: number,
  newW: number,
  newH: number
): Frame[] {
  const scaleX = newW / oldW;
  const scaleY = newH / oldH;

  return frames.map((frame) => {
    const nextLayers: Layer[] = frame.layers.map((layer) => {
      const newGrid = createEmptyGrid(newW, newH);
      for (let destY = 0; destY < newH; destY++) {
        for (let destX = 0; destX < newW; destX++) {
          const srcX = Math.floor(destX / scaleX);
          const srcY = Math.floor(destY / scaleY);
          const col = layer.pixels[srcY]?.[srcX];
          if (col) {
            newGrid[destY][destX] = col;
          }
        }
      }
      return { ...layer, pixels: newGrid };
    });

    const nextHitboxes: Hitbox[] = (frame.hitboxes || []).map((hb) => ({
      ...hb,
      x: Math.round(hb.x * scaleX),
      y: Math.round(hb.y * scaleY),
      w: Math.max(2, Math.round(hb.w * scaleX)),
      h: Math.max(2, Math.round(hb.h * scaleY)),
    }));

    return {
      ...frame,
      layers: nextLayers,
      hitboxes: nextHitboxes,
      pivot: frame.pivot
        ? { x: Math.round(frame.pivot.x * scaleX), y: Math.round(frame.pivot.y * scaleY) }
        : undefined,
    };
  });
}

// Flip Canvas Horizontally across all frames
export function flipCanvasHorizontal(frames: Frame[], width: number, height: number): Frame[] {
  return frames.map((frame) => {
    const nextLayers: Layer[] = frame.layers.map((layer) => {
      const newGrid = createEmptyGrid(width, height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          newGrid[y][width - 1 - x] = layer.pixels[y]?.[x] || null;
        }
      }
      return { ...layer, pixels: newGrid };
    });

    const nextHitboxes: Hitbox[] = (frame.hitboxes || []).map((hb) => ({
      ...hb,
      x: width - (hb.x + hb.w),
    }));

    return { ...frame, layers: nextLayers, hitboxes: nextHitboxes };
  });
}

// Flip Canvas Vertically across all frames
export function flipCanvasVertical(frames: Frame[], width: number, height: number): Frame[] {
  return frames.map((frame) => {
    const nextLayers: Layer[] = frame.layers.map((layer) => {
      const newGrid = createEmptyGrid(width, height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          newGrid[height - 1 - y][x] = layer.pixels[y]?.[x] || null;
        }
      }
      return { ...layer, pixels: newGrid };
    });

    const nextHitboxes: Hitbox[] = (frame.hitboxes || []).map((hb) => ({
      ...hb,
      y: height - (hb.y + hb.h),
    }));

    return { ...frame, layers: nextLayers, hitboxes: nextHitboxes };
  });
}

// Rotate Canvas 90° Clockwise
export function rotateCanvasClockwise(
  frames: Frame[],
  width: number,
  height: number
): { frames: Frame[]; newWidth: number; newHeight: number } {
  const newWidth = height;
  const newHeight = width;

  const nextFrames = frames.map((frame) => {
    const nextLayers: Layer[] = frame.layers.map((layer) => {
      const newGrid = createEmptyGrid(newWidth, newHeight);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const col = layer.pixels[y]?.[x];
          if (col) {
            newGrid[x][height - 1 - y] = col;
          }
        }
      }
      return { ...layer, pixels: newGrid };
    });

    const nextHitboxes: Hitbox[] = (frame.hitboxes || []).map((hb) => ({
      ...hb,
      x: height - (hb.y + hb.h),
      y: hb.x,
      w: hb.h,
      h: hb.w,
    }));

    return { ...frame, layers: nextLayers, hitboxes: nextHitboxes };
  });

  return { frames: nextFrames, newWidth, newHeight };
}
