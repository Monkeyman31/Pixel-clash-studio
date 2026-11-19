/**
 * PixelClash Studio - Fighting Game Sprite Sheet Generator & Base Template Builder
 * Layouts combat animations vertically (un movimiento sobre otro) with printed pixel art labels,
 * cell boundaries, ground baselines, and pivot alignment marks.
 */

import { Frame, LayerGroup } from '../types';
import { compositeFrame } from './pixelMath';

export interface SpriteSheetOptions {
  scale?: number;
  includeLabels?: boolean;
  includeGuides?: boolean;
  includeHitboxes?: boolean;
  backgroundColor?: string; // 'transparent' or hex e.g. '#0e111a'
  padding?: number;
  labelHeight?: number;
  groundY?: number;
  globalPivot?: { x: number; y: number };
  templateOnly?: boolean; // When true, renders blank planning cells
  blankFramesPerGroup?: number;
}

export interface SpriteSheetResult {
  canvas: HTMLCanvasElement;
  metadata: any;
  totalWidth: number;
  totalHeight: number;
}

export function generateMovementSpriteSheet(
  groups: LayerGroup[],
  allFrames: Frame[],
  frameWidth: number,
  frameHeight: number,
  options: SpriteSheetOptions = {}
): SpriteSheetResult {
  const {
    scale = 2,
    includeLabels = true,
    includeGuides = true,
    includeHitboxes = false,
    backgroundColor = 'transparent',
    padding = 6 * scale,
    labelHeight = 22 * scale,
    groundY = Math.round(frameHeight * 0.88),
    globalPivot = { x: Math.round(frameWidth / 2), y: Math.round(frameHeight * 0.88) },
    templateOnly = false,
    blankFramesPerGroup = 4,
  } = options;

  // Filter groups or create default if empty
  const activeGroups: LayerGroup[] = groups.length > 0
    ? groups
    : [
        { id: 'group-idle', name: 'Idle Stand', color: '#3b82f6', category: 'Idle', frameIndices: [0, 1, 2, 3] },
        { id: 'group-walk', name: 'Walk Forward', color: '#10b981', category: 'Movement', frameIndices: [4, 5, 6, 7] },
        { id: 'group-attack', name: 'Light Punch', color: '#ef4444', category: 'Normal', frameIndices: [8, 9, 10] },
      ];

  const scaledFrameW = frameWidth * scale;
  const scaledFrameH = frameHeight * scale;

  // Calculate layout dimensions
  // Priority is HEIGHT: each movement occupies a stacked horizontal row!
  let maxFramesInRow = 1;
  activeGroups.forEach((grp) => {
    const count = templateOnly ? (grp.frameIndices?.length || blankFramesPerGroup) : (grp.frameIndices?.length || 1);
    if (count > maxFramesInRow) maxFramesInRow = count;
  });

  const totalWidth = Math.max(300 * scale, maxFramesInRow * (scaledFrameW + padding) + padding * 2);

  const rowHeights: number[] = activeGroups.map(() => {
    return (includeLabels ? labelHeight : 0) + scaledFrameH + padding * 2;
  });

  const totalHeight = rowHeights.reduce((acc, h) => acc + h, padding);

  const canvas = document.createElement('canvas');
  canvas.width = totalWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { canvas, metadata: {}, totalWidth, totalHeight };
  }

  ctx.imageSmoothingEnabled = false;

  // Background fill
  if (backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, totalWidth, totalHeight);
  } else {
    ctx.clearRect(0, 0, totalWidth, totalHeight);
  }

  const animationMeta: Record<string, any> = {};
  let currentY = padding;

  activeGroups.forEach((group, groupIdx) => {
    const rowY = currentY;
    const frameIndices = group.frameIndices && group.frameIndices.length > 0
      ? group.frameIndices
      : (templateOnly ? Array.from({ length: blankFramesPerGroup }, (_, i) => i) : [0]);

    const groupColor = group.color || '#3b82f6';
    const groupName = group.name || `Movimiento ${groupIdx + 1}`;

    // 1. Draw Movement Header Banner (Printed on Sheet)
    let contentStartY = rowY;
    if (includeLabels) {
      // Header background strip
      ctx.fillStyle = '#141824';
      ctx.fillRect(padding, rowY, totalWidth - padding * 2, labelHeight - 2);

      // Accent color left pill
      ctx.fillStyle = groupColor;
      ctx.fillRect(padding, rowY, 6 * scale, labelHeight - 2);

      // Title Text (Free Group Name)
      ctx.font = `bold ${Math.max(10, 10 * scale)}px 'JetBrains Mono', monospace`;
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      const titleStr = `${groupName} (${frameIndices.length}F)`;
      ctx.fillText(titleStr, padding + 12 * scale, rowY + (labelHeight - 2) / 2);

      contentStartY = rowY + labelHeight;
    }

    const frameRects: { frame: number; x: number; y: number; w: number; h: number }[] = [];

    // 2. Draw Frames Row (Un fotograma al lado del otro dentro de la fila de este movimiento)
    frameIndices.forEach((fIdx, slotIdx) => {
      const cellX = padding + slotIdx * (scaledFrameW + padding);
      const cellY = contentStartY + padding / 2;

      // Cell frame background
      ctx.fillStyle = '#10131d';
      ctx.fillRect(cellX, cellY, scaledFrameW, scaledFrameH);

      // Cell border guide
      if (includeGuides) {
        ctx.strokeStyle = '#252e42';
        ctx.lineWidth = Math.max(1, 1 * scale);
        ctx.strokeRect(cellX, cellY, scaledFrameW, scaledFrameH);

        // Ground line guide (combate)
        ctx.strokeStyle = 'rgba(74, 222, 128, 0.4)'; // subtle green
        ctx.setLineDash([2 * scale, 2 * scale]);
        ctx.beginPath();
        const gy = cellY + groundY * scale;
        ctx.moveTo(cellX, gy);
        ctx.lineTo(cellX + scaledFrameW, gy);
        ctx.stroke();

        // Pivot cross guide
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)'; // subtle purple
        ctx.setLineDash([]);
        const px = cellX + globalPivot.x * scale;
        const py = cellY + globalPivot.y * scale;
        ctx.beginPath();
        ctx.moveTo(px - 3 * scale, py);
        ctx.lineTo(px + 3 * scale, py);
        ctx.moveTo(px, py - 3 * scale);
        ctx.lineTo(px, py + 3 * scale);
        ctx.stroke();
      }

      // Render Frame Pixels (if available and not templateOnly)
      const frame = allFrames[fIdx];
      if (frame && !templateOnly) {
        const composited = compositeFrame(frame, frameWidth, frameHeight);
        for (let y = 0; y < frameHeight; y++) {
          for (let x = 0; x < frameWidth; x++) {
            const col = composited[y]?.[x];
            if (col) {
              ctx.fillStyle = col;
              ctx.fillRect(cellX + x * scale, cellY + y * scale, scale, scale);
            }
          }
        }

        // Optional: Render Hitboxes / Hurtboxes
        if (includeHitboxes && frame.hitboxes && frame.hitboxes.length > 0) {
          frame.hitboxes.forEach((hb) => {
            const hx = cellX + hb.x * scale;
            const hy = cellY + hb.y * scale;
            const hw = hb.w * scale;
            const hh = hb.h * scale;

            if (hb.type === 'hitbox') {
              ctx.strokeStyle = '#ef4444';
              ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
            } else if (hb.type === 'hurtbox') {
              ctx.strokeStyle = '#22c55e';
              ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
            } else {
              ctx.strokeStyle = '#f59e0b';
              ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
            }
            ctx.lineWidth = 1 * scale;
            ctx.fillRect(hx, hy, hw, hh);
            ctx.strokeRect(hx, hy, hw, hh);
          });
        }
      }

      // Slot text indicator (F1, F2...)
      if (includeGuides) {
        ctx.font = `${Math.max(7, 7 * scale)}px 'JetBrains Mono', monospace`;
        ctx.fillStyle = '#64748b';
        ctx.textBaseline = 'top';
        ctx.fillText(`F${slotIdx + 1}`, cellX + 3 * scale, cellY + 3 * scale);
      }

      frameRects.push({
        frame: slotIdx,
        x: cellX,
        y: cellY,
        w: scaledFrameW,
        h: scaledFrameH,
      });
    });

    animationMeta[group.name] = {
      id: group.id,
      category: group.category || 'Combat',
      color: group.color,
      playbackMode: group.playbackMode || 'loop',
      framesCount: frameIndices.length,
      frames: frameRects,
    };

    currentY += rowHeights[groupIdx];
  });

  const metadata = {
    generator: 'PixelClash Studio - Fighting Game Sprite Sheet Atlas',
    version: '1.0',
    dimensions: { width: totalWidth, height: totalHeight },
    frameSize: { width: frameWidth, height: frameHeight, scale },
    totalMovements: activeGroups.length,
    animations: animationMeta,
  };

  return { canvas, metadata, totalWidth, totalHeight };
}

export function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

export function downloadJsonFile(data: any, filename: string): void {
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
