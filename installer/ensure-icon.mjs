// Pure Node.js script (zero external deps) that generates PixelClash Studio's
// official multi-resolution icon assets (16, 32, 48, 64, 128, 256px):
// - assets/pixelclash.ico (Windows EXE, installer, taskbar, window, file associations)
// - assets/pixelclash.png (256x256 PNG)
// - public/favicon.ico & public/favicon.svg & public/icon-256.png
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const forceRegen = process.argv.includes('--force');
const assetsDir = path.resolve(process.cwd(), 'assets');
const publicDir = path.resolve(process.cwd(), 'public');
const icoPath = path.join(assetsDir, 'pixelclash.ico');
const pngPath = path.join(assetsDir, 'pixelclash.png');
const publicIcoPath = path.join(publicDir, 'favicon.ico');
const publicSvgPath = path.join(publicDir, 'favicon.svg');
const publicPngPath = path.join(publicDir, 'icon-256.png');

if (!forceRegen && fs.existsSync(icoPath) && fs.statSync(icoPath).size > 2048 && fs.existsSync(pngPath)) {
  console.log('[ensure-icon] Official assets/pixelclash.ico already exists.');
  process.exit(0);
}

fs.mkdirSync(assetsDir, { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function blendPixel(buf, idx, r, g, b, a) {
  if (a >= 1) {
    buf[idx] = Math.round(r);
    buf[idx + 1] = Math.round(g);
    buf[idx + 2] = Math.round(b);
    buf[idx + 3] = 255;
    return;
  }
  const inv = 1 - a;
  buf[idx] = Math.round(r * a + buf[idx] * inv);
  buf[idx + 1] = Math.round(g * a + buf[idx + 1] * inv);
  buf[idx + 2] = Math.round(b * a + buf[idx + 2] * inv);
  buf[idx + 3] = 255;
}

function sampleGradient3(t, c0, c1, c2, mid = 0.52) {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped <= mid) {
    const k = clamped / mid;
    return [lerp(c0[0], c1[0], k), lerp(c0[1], c1[1], k), lerp(c0[2], c1[2], k)];
  }
  const k = (clamped - mid) / (1 - mid);
  return [lerp(c1[0], c2[0], k), lerp(c1[1], c2[1], k), lerp(c1[2], c2[2], k)];
}

/**
 * Renders PixelClash Studio's official icon onto raw RGBA PNG bytes:
 * - Square yellow outer frame (#FEF08A -> #FACC15 -> #EAB308) with crisp 8-bit rims
 * - Smooth diagonal purple inner gradient (#1E0B38 -> #4B1D8C -> #7C2AE8)
 * - Centered solid yellow square styled as an enlarged 8-bit pixel block with bevel & shadow
 */
function createOfficialStudioPng(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const u = size / 16;
  const framePx = Math.max(1, Math.round(size >= 32 ? u * 1.5 : 1));
  const rimPx = size >= 32 ? Math.max(1, Math.round(u * 0.45)) : 0;
  const recessPx = size >= 32 ? Math.max(1, Math.round(u * 0.25)) : 0;

  const innerStart = framePx;
  const innerEnd = size - framePx;
  const innerSpan = Math.max(1, innerEnd - innerStart);

  const blockSize = Math.max(6, Math.round(u * 6));
  const bx = Math.round((size - blockSize) / 2);
  const by = Math.round((size - blockSize) / 2);
  const bevel = Math.max(1, Math.round(u * 0.75));
  const shadowOff = Math.max(1, Math.round(u * 0.7));
  const glint = size >= 32 ? Math.max(1, Math.round(u * 0.9)) : 0;

  const gridLines = size >= 48 ? [4, 8, 12].map((p) => Math.round(p * u)) : [];
  const gridThickness = Math.max(1, Math.round(size / 64));

  // Palette RGB tuples
  const Y_LIGHT = [254, 240, 138]; // #FEF08A
  const Y_MAIN = [250, 204, 21];   // #FACC15
  const Y_DEEP = [234, 179, 8];    // #EAB308
  const Y_HI = [254, 249, 195];    // #FEF9C3
  const Y_CORE = [253, 224, 71];   // #FDE047
  const Y_SHADE = [202, 138, 4];   // #CA8A04
  const Y_CORNER = [161, 98, 7];   // #A16207

  const P_DARK = [30, 11, 56];     // #1E0B38 (Morado oscuro)
  const P_MID = [75, 29, 140];     // #4B1D8C (Morado medio)
  const P_VIVID = [124, 42, 232];  // #7C2AE8 (Púrpura intenso)

  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // PNG filter none
    for (let x = 0; x < size; x++) {
      const idx = rowStart + 1 + x * 4;
      const inOuterFrame = x < innerStart || y < innerStart || x >= innerEnd || y >= innerEnd;

      if (inOuterFrame) {
        const t = (x + y) / Math.max(1, (size - 1) * 2);
        const [r, g, b] = sampleGradient3(t, Y_LIGHT, Y_MAIN, Y_DEEP, 0.35);
        blendPixel(raw, idx, r, g, b, 1);

        if (rimPx > 0) {
          if (x < rimPx || y < rimPx) {
            blendPixel(raw, idx, Y_HI[0], Y_HI[1], Y_HI[2], 0.85);
          } else if (x >= size - rimPx || y >= size - rimPx) {
            blendPixel(raw, idx, Y_SHADE[0], Y_SHADE[1], Y_SHADE[2], 1);
          }
        }
        continue;
      }

      // Inner purple gradient
      const tx = (x - innerStart) / innerSpan;
      const ty = (y - innerStart) / innerSpan;
      const diag = (tx + ty) * 0.5;
      const [pr, pg, pb] = sampleGradient3(diag, P_DARK, P_MID, P_VIVID, 0.52);
      blendPixel(raw, idx, pr, pg, pb, 1);

      // Subtle inner recess border
      if (
        recessPx > 0 &&
        (x < innerStart + recessPx ||
          y < innerStart + recessPx ||
          x >= innerEnd - recessPx ||
          y >= innerEnd - recessPx)
      ) {
        blendPixel(raw, idx, 18, 5, 38, 0.55);
      }

      // Subtle 8-bit grid texture at >= 48px
      if (gridLines.length > 0) {
        const onGrid = gridLines.some(
          (gl) => (x >= gl && x < gl + gridThickness) || (y >= gl && y < gl + gridThickness)
        );
        if (onGrid) {
          blendPixel(raw, idx, 255, 255, 255, 0.05);
        }
      }

      // Drop shadow behind central yellow pixel block
      const inShadow =
        x >= bx + shadowOff &&
        x < bx + shadowOff + blockSize &&
        y >= by + shadowOff &&
        y < by + shadowOff + blockSize;
      const inBlock = x >= bx && x < bx + blockSize && y >= by && y < by + blockSize;

      if (inShadow && !inBlock) {
        blendPixel(raw, idx, 18, 4, 38, 0.58);
      }

      // Central solid yellow 8-bit pixel block
      if (inBlock) {
        const lx = x - bx;
        const ly = y - by;
        const isTop = ly < bevel;
        const isLeft = lx < bevel;
        const isBottom = ly >= blockSize - bevel;
        const isRight = lx >= blockSize - bevel;

        if (isBottom && isRight) {
          blendPixel(raw, idx, Y_CORNER[0], Y_CORNER[1], Y_CORNER[2], 1);
        } else if (isBottom || isRight) {
          blendPixel(raw, idx, Y_SHADE[0], Y_SHADE[1], Y_SHADE[2], 1);
        } else if (isTop || isLeft) {
          blendPixel(raw, idx, Y_HI[0], Y_HI[1], Y_HI[2], 1);
        } else {
          blendPixel(raw, idx, Y_CORE[0], Y_CORE[1], Y_CORE[2], 1);
          if (glint > 0 && lx >= bevel && lx < bevel + glint && ly >= bevel && ly < bevel + glint) {
            blendPixel(raw, idx, 255, 255, 255, 0.72);
          }
        }
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))]);
}

// Multi-resolution Windows ICO containing all 6 required sizes: 16, 32, 48, 64, 128, 256
const sizes = [16, 32, 48, 64, 128, 256];
const frames = sizes.map((size) => ({ size, bytes: createOfficialStudioPng(size) }));
const headerSize = 6;
const dirSize = 16 * frames.length;
const totalPayload = frames.reduce((acc, f) => acc + f.bytes.length, 0);
const out = Buffer.alloc(headerSize + dirSize + totalPayload);

out.writeUInt16LE(0, 0);
out.writeUInt16LE(1, 2);
out.writeUInt16LE(frames.length, 4);

let offset = headerSize + dirSize;
frames.forEach((frame, idx) => {
  const pos = headerSize + idx * 16;
  out[pos] = frame.size >= 256 ? 0 : frame.size;
  out[pos + 1] = frame.size >= 256 ? 0 : frame.size;
  out[pos + 2] = 0;
  out[pos + 3] = 0;
  out.writeUInt16LE(1, pos + 4);
  out.writeUInt16LE(32, pos + 6);
  out.writeUInt32LE(frame.bytes.length, pos + 8);
  out.writeUInt32LE(offset, pos + 12);
  frame.bytes.copy(out, offset);
  offset += frame.bytes.length;
});

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
  <defs>
    <linearGradient id="bg" x1="1" y1="1" x2="15" y2="15" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1E0B38"/>
      <stop offset="52%" stop-color="#4B1D8C"/>
      <stop offset="100%" stop-color="#7C2AE8"/>
    </linearGradient>
    <linearGradient id="frame" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="35%" stop-color="#FACC15"/>
      <stop offset="100%" stop-color="#EAB308"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="16" height="16" fill="url(#frame)"/>
  <rect x="0" y="0" width="16" height="0.5" fill="#FEF9C3" fill-opacity="0.85"/>
  <rect x="0" y="0" width="0.5" height="16" fill="#FEF9C3" fill-opacity="0.85"/>
  <rect x="0" y="15.5" width="16" height="0.5" fill="#CA8A04"/>
  <rect x="15.5" y="0" width="0.5" height="16" fill="#CA8A04"/>
  <rect x="1.5" y="1.5" width="13" height="13" fill="url(#bg)"/>
  <rect x="5.75" y="5.75" width="6" height="6" fill="#120426" fill-opacity="0.58"/>
  <rect x="5" y="5" width="6" height="6" fill="#FACC15"/>
  <rect x="5.75" y="5.75" width="4.5" height="4.5" fill="#FDE047"/>
  <rect x="5" y="5" width="6" height="0.75" fill="#FEF9C3"/>
  <rect x="5" y="5" width="0.75" height="6" fill="#FEF9C3"/>
  <rect x="5.75" y="5.75" width="1" height="1" fill="#FFFFFF" fill-opacity="0.72"/>
  <rect x="5" y="10.25" width="6" height="0.75" fill="#CA8A04"/>
  <rect x="10.25" y="5" width="0.75" height="6" fill="#CA8A04"/>
  <rect x="10.25" y="10.25" width="0.75" height="0.75" fill="#A16207"/>
</svg>
`;

const png256 = frames[frames.length - 1].bytes;

fs.writeFileSync(icoPath, out);
fs.writeFileSync(pngPath, png256);
fs.writeFileSync(publicIcoPath, out);
fs.writeFileSync(publicSvgPath, svgContent, 'utf8');
fs.writeFileSync(publicPngPath, png256);

console.log(
  `[ensure-icon] Generated official PixelClash Studio icons (${sizes.join(', ')}px): assets/pixelclash.ico (${out.length} bytes), assets/pixelclash.png, public/favicon.ico, public/favicon.svg.`
);
