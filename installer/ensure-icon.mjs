// Pure Node.js script (zero external deps) that guarantees assets/pixelclash.ico exists
// before running electron-builder on Windows or GitHub Actions.
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const assetsDir = path.resolve(process.cwd(), 'assets');
const icoPath = path.join(assetsDir, 'pixelclash.ico');

if (fs.existsSync(icoPath) && fs.statSync(icoPath).size > 256) {
  console.log('[ensure-icon] assets/pixelclash.ico already exists.');
  process.exit(0);
}

fs.mkdirSync(assetsDir, { recursive: true });

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

function createStudioPng(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const pad = Math.max(1, Math.round(size * 0.1));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // filter none
    for (let x = 0; x < size; x++) {
      const idx = rowStart + 1 + x * 4;
      const inBorder = x < pad || y < pad || x >= size - pad || y >= size - pad;
      if (inBorder) {
        // Amber-to-indigo gradient border
        const t = (x + y) / (size * 2);
        raw[idx] = Math.round(245 * (1 - t) + 79 * t);
        raw[idx + 1] = Math.round(158 * (1 - t) + 70 * t);
        raw[idx + 2] = Math.round(11 * (1 - t) + 229 * t);
        raw[idx + 3] = 255;
      } else {
        // Inner dark surface with bright amber emblem pixel block
        const nx = (x - size / 2) / (size * 0.35);
        const ny = (y - size / 2) / (size * 0.35);
        const isGlyph =
          (Math.abs(nx + 0.35) < 0.22 && Math.abs(ny) < 0.55) ||
          (Math.abs(nx - 0.35) < 0.35 && Math.abs(ny) < 0.55 && Math.hypot((nx - 0.35) * 1.4, ny) > 0.25);
        if (isGlyph) {
          raw[idx] = 251;
          raw[idx + 1] = 191;
          raw[idx + 2] = 36;
          raw[idx + 3] = 255;
        } else {
          raw[idx] = 15;
          raw[idx + 1] = 19;
          raw[idx + 2] = 31;
          raw[idx + 3] = 255;
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

const sizes = [16, 32, 48, 256];
const frames = sizes.map((size) => ({ size, bytes: createStudioPng(size) }));
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

fs.writeFileSync(icoPath, out);
console.log('[ensure-icon] Generated assets/pixelclash.ico (' + out.length + ' bytes).');
