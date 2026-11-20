import React, { useId } from 'react';

export const OFFICIAL_ICON_SIZES = [16, 32, 48, 64, 128, 256] as const;

interface PixelClashLogoIconProps {
  size?: number;
  className?: string;
  title?: string;
}

/**
 * Official PixelClash Studio brand icon:
 * - Square geometric composition crisp at 16px through 256px
 * - Defined yellow outer frame (#FACC15 / #FEF08A / #EAB308)
 * - Smooth inner purple gradient (#1E0B38 -> #4B1D8C -> #7C2AE8)
 * - Centered solid yellow square styled as an enlarged 8-bit pixel block
 */
export const PixelClashLogoIcon: React.FC<PixelClashLogoIconProps> = ({
  size = 28,
  className = '',
  title = 'PixelClash Studio',
}) => {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const bgGradId = `pc-purple-grad-${uid}`;
  const frameGradId = `pc-yellow-frame-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      className={`shrink-0 select-none ${className}`}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={bgGradId} x1="1" y1="1" x2="15" y2="15" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E0B38" />
          <stop offset="52%" stopColor="#4B1D8C" />
          <stop offset="100%" stopColor="#7C2AE8" />
        </linearGradient>
        <linearGradient id={frameGradId} x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="35%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#EAB308" />
        </linearGradient>
      </defs>

      {/* Outer crisp yellow frame */}
      <rect x="0" y="0" width="16" height="16" fill={`url(#${frameGradId})`} />
      {/* Top & left bright 8-bit frame rim */}
      <rect x="0" y="0" width="16" height="0.5" fill="#FEF9C3" fillOpacity="0.85" />
      <rect x="0" y="0" width="0.5" height="16" fill="#FEF9C3" fillOpacity="0.85" />
      {/* Bottom & right warm amber frame rim */}
      <rect x="0" y="15.5" width="16" height="0.5" fill="#CA8A04" />
      <rect x="15.5" y="0" width="0.5" height="16" fill="#CA8A04" />

      {/* Inner dark-to-intense purple gradient background */}
      <rect x="1.5" y="1.5" width="13" height="13" fill={`url(#${bgGradId})`} />
      {/* Hairline inner dark recess framing the yellow border */}
      <rect
        x="1.5"
        y="1.5"
        width="13"
        height="13"
        stroke="#120526"
        strokeWidth="0.4"
        strokeOpacity="0.65"
        fill="none"
      />

      {/* Subtle 8-bit pixel grid hint inside the purple field */}
      {size >= 32 && (
        <g stroke="#FFFFFF" strokeOpacity="0.06" strokeWidth="0.25">
          <line x1="4" y1="1.5" x2="4" y2="14.5" />
          <line x1="8" y1="1.5" x2="8" y2="14.5" />
          <line x1="12" y1="1.5" x2="12" y2="14.5" />
          <line x1="1.5" y1="4" x2="14.5" y2="4" />
          <line x1="1.5" y1="8" x2="14.5" y2="8" />
          <line x1="1.5" y1="12" x2="14.5" y2="12" />
        </g>
      )}

      {/* Crisp 8-bit drop shadow behind central pixel block */}
      <rect x="5.75" y="5.75" width="6" height="6" fill="#120426" fillOpacity="0.58" />

      {/* Central solid yellow square with enlarged 8-bit pixel-block bevel */}
      <rect x="5" y="5" width="6" height="6" fill="#FACC15" />
      {/* Bright inner core */}
      <rect x="5.75" y="5.75" width="4.5" height="4.5" fill="#FDE047" />
      {/* 8-bit top & left highlight bevel */}
      <rect x="5" y="5" width="6" height="0.75" fill="#FEF9C3" />
      <rect x="5" y="5" width="0.75" height="6" fill="#FEF9C3" />
      {/* Bright top-left pixel glint */}
      <rect x="5.75" y="5.75" width="1" height="1" fill="#FFFFFF" fillOpacity="0.72" />
      {/* 8-bit bottom & right shaded bevel */}
      <rect x="5" y="10.25" width="6" height="0.75" fill="#CA8A04" />
      <rect x="10.25" y="5" width="0.75" height="6" fill="#CA8A04" />
      {/* Crisp bottom-right corner notch shadow */}
      <rect x="10.25" y="10.25" width="0.75" height="0.75" fill="#A16207" />
    </svg>
  );
};

/**
 * Renders the exact official PixelClash Studio icon to an HTML5 Canvas at any size
 * (16, 32, 48, 64, 128, 256) with pixel-aligned crispness for Windows .ICO & previews.
 */
export function renderOfficialPixelClashIconToCanvas(size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = false;

  // Compute integer pixel-aligned proportions on a 16-unit master grid
  const u = size / 16;
  const framePx = Math.max(1, Math.round(size >= 32 ? u * 1.5 : 1));
  const innerStart = framePx;
  const innerSize = size - framePx * 2;

  // 1. Crisp Yellow Outer Frame
  const frameGrad = ctx.createLinearGradient(0, 0, size, size);
  frameGrad.addColorStop(0, '#FEF08A');
  frameGrad.addColorStop(0.35, '#FACC15');
  frameGrad.addColorStop(1, '#EAB308');
  ctx.fillStyle = frameGrad;
  ctx.fillRect(0, 0, size, size);

  if (size >= 32) {
    const rim = Math.max(1, Math.round(u * 0.45));
    ctx.fillStyle = 'rgba(254, 249, 195, 0.85)';
    ctx.fillRect(0, 0, size, rim);
    ctx.fillRect(0, 0, rim, size);
    ctx.fillStyle = '#CA8A04';
    ctx.fillRect(0, size - rim, size, rim);
    ctx.fillRect(size - rim, 0, rim, size);
  }

  // 2. Smooth Inner Purple Gradient Field (#1E0B38 -> #4B1D8C -> #7C2AE8)
  const bgGrad = ctx.createLinearGradient(innerStart, innerStart, size - innerStart, size - innerStart);
  bgGrad.addColorStop(0, '#1E0B38');
  bgGrad.addColorStop(0.52, '#4B1D8C');
  bgGrad.addColorStop(1, '#7C2AE8');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(innerStart, innerStart, innerSize, innerSize);

  // Inner dark recess hairline
  if (size >= 32) {
    const recess = Math.max(1, Math.round(u * 0.25));
    ctx.fillStyle = 'rgba(18, 5, 38, 0.55)';
    ctx.fillRect(innerStart, innerStart, innerSize, recess);
    ctx.fillRect(innerStart, innerStart, recess, innerSize);
    ctx.fillRect(innerStart, innerStart + innerSize - recess, innerSize, recess);
    ctx.fillRect(innerStart + innerSize - recess, innerStart, recess, innerSize);
  }

  // Subtle 8-bit pixel grid texture inside the purple field at >= 48px
  if (size >= 48) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    const gridW = Math.max(1, Math.round(size / 64));
    for (const unitPos of [4, 8, 12]) {
      const p = Math.round(unitPos * u);
      if (p > innerStart && p < innerStart + innerSize) {
        ctx.fillRect(p, innerStart, gridW, innerSize);
        ctx.fillRect(innerStart, p, innerSize, gridW);
      }
    }
  }

  // 3. Central Solid Yellow 8-Bit Enlarged Pixel Block
  const blockSize = Math.max(6, Math.round(u * 6));
  const bx = Math.round((size - blockSize) / 2);
  const by = Math.round((size - blockSize) / 2);

  // Crisp 8-bit drop shadow
  const shadowOff = Math.max(1, Math.round(u * 0.7));
  ctx.fillStyle = 'rgba(18, 4, 38, 0.58)';
  ctx.fillRect(bx + shadowOff, by + shadowOff, blockSize, blockSize);

  // Solid yellow base block
  ctx.fillStyle = '#FACC15';
  ctx.fillRect(bx, by, blockSize, blockSize);

  // 8-bit beveled pixel edges & luminous pixel core
  const bevel = Math.max(1, Math.round(u * 0.75));
  if (blockSize > bevel * 2) {
    ctx.fillStyle = '#FDE047';
    ctx.fillRect(bx + bevel, by + bevel, blockSize - bevel * 2, blockSize - bevel * 2);
  }

  // Top & Left pale yellow pixel highlight
  ctx.fillStyle = '#FEF9C3';
  ctx.fillRect(bx, by, blockSize, bevel);
  ctx.fillRect(bx, by, bevel, blockSize);

  // Bottom & Right warm gold pixel bevel
  ctx.fillStyle = '#CA8A04';
  ctx.fillRect(bx, by + blockSize - bevel, blockSize, bevel);
  ctx.fillRect(bx + blockSize - bevel, by, bevel, blockSize);

  // Deep bottom-right corner notch
  ctx.fillStyle = '#A16207';
  ctx.fillRect(bx + blockSize - bevel, by + blockSize - bevel, bevel, bevel);

  // Crisp top-left 8-bit specular pixel glint
  if (size >= 32) {
    const glint = Math.max(1, Math.round(u * 0.9));
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.fillRect(bx + bevel, by + bevel, glint, glint);
  }

  return canvas;
}
