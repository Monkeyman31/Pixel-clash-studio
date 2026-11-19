export type PixelTextFont = 'pixel_5x7' | 'pixel_3x5' | 'arcade_bold' | 'impact_hd';
export type PixelTextAlign = 'left' | 'center' | 'right';

export interface PixelTextOptions {
  text: string;
  font: PixelTextFont;
  scale: number; // 1 to 10
  color: string;
  secondaryColor?: string;
  gradient?: boolean;
  outline?: boolean;
  outlineColor?: string;
  shadow?: boolean;
  letterSpacing?: number; // -1 to 6
  lineHeight?: number; // extra vertical px between lines (0 to 16)
  maxWidth?: number; // optional wrap width in canvas px
  maxHeight?: number; // optional clip height in canvas px
  align?: PixelTextAlign;
}

export interface PixelTextResult {
  pixels: { x: number; y: number; color: string }[];
  width: number;
  height: number;
}

// Crisp 5x7 pixel-art bitmap glyphs for fighting games
const FONT_5X7: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01110'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  Ñ: ['01110', '00000', '10001', '11001', '10101', '10011', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10011', '10101', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['01110', '10000', '11110', '10001', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00110', '00100', '00000', '00100'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '00000', '00100'],
  ',': ['00000', '00000', '00000', '00000', '00000', '00100', '01000'],
  ':': ['00000', '00100', '00000', '00000', '00100', '00000', '00000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

// Compact 3x5 pixel font for micro HUD labels & frame tags
const FONT_3X5: Record<string, string[]> = {
  A: ['010', '101', '111', '101', '101'],
  B: ['110', '101', '110', '101', '110'],
  C: ['011', '100', '100', '100', '011'],
  D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'],
  F: ['111', '100', '110', '100', '100'],
  G: ['011', '100', '101', '101', '011'],
  H: ['101', '101', '111', '101', '101'],
  I: ['111', '010', '010', '010', '111'],
  J: ['001', '001', '001', '101', '010'],
  K: ['101', '101', '110', '101', '101'],
  L: ['100', '100', '100', '100', '111'],
  M: ['101', '111', '101', '101', '101'],
  N: ['101', '111', '111', '101', '101'],
  O: ['111', '101', '101', '101', '111'],
  P: ['111', '101', '111', '100', '100'],
  Q: ['111', '101', '101', '111', '001'],
  R: ['110', '101', '110', '101', '101'],
  S: ['011', '100', '010', '001', '110'],
  T: ['111', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '111'],
  V: ['101', '101', '101', '101', '010'],
  W: ['101', '101', '101', '111', '101'],
  X: ['101', '101', '010', '101', '101'],
  Y: ['101', '101', '010', '010', '010'],
  Z: ['111', '001', '010', '100', '111'],
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '001', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
  '!': ['010', '010', '010', '000', '010'],
  '.': ['000', '000', '000', '000', '010'],
  '-': ['000', '000', '111', '000', '000'],
  '+': ['000', '010', '111', '010', '000'],
  ':': ['000', '010', '000', '010', '000'],
  ' ': ['000', '000', '000', '000', '000'],
};

function interpolateHex(c1: string, c2: string, t: number): string {
  const parse = (h: string) => {
    const cl = h.replace('#', '').padEnd(6, '0').slice(0, 6);
    return [parseInt(cl.slice(0, 2), 16), parseInt(cl.slice(2, 4), 16), parseInt(cl.slice(4, 6), 16)];
  };
  const [r1, g1, b1] = parse(c1);
  const [r2, g2, b2] = parse(c2);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function normalizeChar(ch: string): string {
  const map: Record<string, string> = {
    Á: 'A',
    É: 'E',
    Í: 'I',
    Ó: 'O',
    Ú: 'U',
  };
  const up = ch.toUpperCase();
  return map[up] || up;
}

function wrapLines(rawText: string, maxWidth: number | undefined, measureFn: (s: string) => number): string[] {
  const paragraphs = rawText.split('\n');
  if (!maxWidth || maxWidth <= 0) return paragraphs;

  const result: string[] = [];
  for (const para of paragraphs) {
    if (!para) {
      result.push('');
      continue;
    }
    const words = para.split(' ');
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (measureFn(candidate) <= maxWidth) {
        current = candidate;
      } else {
        if (current) result.push(current);
        // Break ultra-long word char-by-char if needed
        if (measureFn(word) > maxWidth) {
          let chunk = '';
          for (const ch of word) {
            if (chunk && measureFn(chunk + ch) > maxWidth) {
              result.push(chunk);
              chunk = ch;
            } else {
              chunk += ch;
            }
          }
          current = chunk;
        } else {
          current = word;
        }
      }
    }
    if (current || para === '') result.push(current);
  }
  return result;
}

export function rasterizePixelText(options: PixelTextOptions): PixelTextResult {
  const rawText = options.text || '';
  if (!rawText.trim()) {
    return { pixels: [], width: 0, height: 0 };
  }

  const scale = Math.max(1, Math.min(24, Math.round(options.scale || 1)));
  const spacing = Math.max(-2, Math.min(32, Math.round(options.letterSpacing ?? 1)));
  const extraLineGap = Math.max(0, Math.min(128, Math.round(options.lineHeight ?? 2)));
  const align: PixelTextAlign = options.align || 'left';
  const maxWidth = options.maxWidth && options.maxWidth > 0 ? Math.round(options.maxWidth) : undefined;
  const maxHeight = options.maxHeight && options.maxHeight > 0 ? Math.round(options.maxHeight) : undefined;

  const fgMap = new Map<string, string>();
  let maxX = 0;
  let maxY = 0;

  if (options.font === 'arcade_bold' || options.font === 'impact_hd') {
    const fontSize = (options.font === 'impact_hd' ? 12 : 10) * scale;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const fontSpec =
        options.font === 'impact_hd'
          ? `900 ${fontSize}px Impact, "Chakra Petch", sans-serif`
          : `bold ${fontSize}px "Silkscreen", monospace`;
      ctx.font = fontSpec;

      const measureLine = (str: string) => {
        if (!str) return 0;
        const baseW = ctx.measureText(str).width;
        return Math.ceil(baseW + Math.max(0, str.length - 1) * spacing);
      };
      const lines = wrapLines(rawText, maxWidth, measureLine);
      const lineMetrics = lines.map((l) => measureLine(l));
      const boxW = Math.max(8, maxWidth || Math.max(...lineMetrics, 8) + 4);
      const stepY = Math.max(6, Math.round(fontSize * 1.15) + extraLineGap);
      const totalH = Math.max(8, lines.length * stepY + 4);

      canvas.width = boxW;
      canvas.height = totalH;
      ctx.font = fontSpec;
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#ffffff';

      lines.forEach((line, lIdx) => {
        const lw = lineMetrics[lIdx];
        const startX =
          align === 'center'
            ? Math.max(0, Math.floor((boxW - lw) / 2))
            : align === 'right'
            ? Math.max(0, boxW - lw - 1)
            : 1;
        const baseY = 1 + lIdx * stepY;

        if (spacing !== 0) {
          let cx = startX;
          for (const ch of line) {
            ctx.fillText(ch, cx, baseY);
            cx += ctx.measureText(ch).width + spacing;
          }
        } else {
          ctx.fillText(line, startX, baseY);
        }
      });

      const img = ctx.getImageData(0, 0, boxW, totalH).data;
      const litCoords: { x: number; y: number }[] = [];
      let minRow = totalH;
      let maxRow = 0;
      for (let y = 0; y < totalH; y++) {
        if (maxHeight && y >= maxHeight) break;
        for (let x = 0; x < boxW; x++) {
          if (maxWidth && x >= maxWidth) break;
          const a = img[(y * boxW + x) * 4 + 3];
          if (a >= 110) {
            litCoords.push({ x, y });
            if (y < minRow) minRow = y;
            if (y > maxRow) maxRow = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }
      const span = Math.max(1, maxRow - minRow);
      for (const pt of litCoords) {
        const t = (pt.y - minRow) / span;
        const col =
          options.gradient && options.secondaryColor
            ? interpolateHex(options.color, options.secondaryColor, t)
            : options.color;
        fgMap.set(`${pt.x},${pt.y}`, col);
      }
    }
  } else {
    const isMini = options.font === 'pixel_3x5';
    const fontDict = isMini ? FONT_3X5 : FONT_5X7;
    const charW = isMini ? 3 : 5;
    const charH = isMini ? 5 : 7;

    const measureBitmapLine = (str: string) => {
      if (!str.length) return 0;
      return str.length * (charW * scale) + Math.max(0, str.length - 1) * (spacing * scale);
    };

    const lines = wrapLines(rawText, maxWidth, measureBitmapLine);
    const lineWidths = lines.map((l) => measureBitmapLine(l));
    const boxW = maxWidth || Math.max(...lineWidths, charW * scale);
    const lineHeight = charH * scale + extraLineGap * scale;

    lines.forEach((line, lineIdx) => {
      const lw = lineWidths[lineIdx];
      let cursorX =
        align === 'center'
          ? Math.max(0, Math.floor((boxW - lw) / 2))
          : align === 'right'
          ? Math.max(0, boxW - lw)
          : 0;
      const baseY = lineIdx * lineHeight;
      for (let i = 0; i < line.length; i++) {
        const key = normalizeChar(line[i]);
        const glyph = fontDict[key] || fontDict[' '];
        for (let gy = 0; gy < glyph.length; gy++) {
          for (let gx = 0; gx < glyph[gy].length; gx++) {
            if (glyph[gy][gx] === '1') {
              const t = gy / Math.max(1, charH - 1);
              const col =
                options.gradient && options.secondaryColor
                  ? interpolateHex(options.color, options.secondaryColor, t)
                  : options.color;
              for (let sy = 0; sy < scale; sy++) {
                for (let sx = 0; sx < scale; sx++) {
                  const px = cursorX + gx * scale + sx;
                  const py = baseY + gy * scale + sy;
                  if (maxWidth && px >= maxWidth) continue;
                  if (maxHeight && py >= maxHeight) continue;
                  fgMap.set(`${px},${py}`, col);
                  if (px > maxX) maxX = px;
                  if (py > maxY) maxY = py;
                }
              }
            }
          }
        }
        cursorX += (charW + spacing) * scale;
      }
    });
  }

  if (fgMap.size === 0) {
    return { pixels: [], width: 0, height: 0 };
  }

  const outMap = new Map<string, string>();
  const padX = options.outline ? 1 : 0;
  const padY = options.outline ? 1 : 0;

  const canPlace = (x: number, y: number) =>
    (!maxWidth || x < maxWidth) && (!maxHeight || y < maxHeight);

  // 1. Optional Shadow (+1,+1)
  if (options.shadow) {
    const shadowCol = options.outlineColor || '#090b10';
    for (const key of fgMap.keys()) {
      const [xs, ys] = key.split(',').map(Number);
      const sx = xs + padX + 1;
      const sy = ys + padY + 1;
      if (!canPlace(sx, sy)) continue;
      outMap.set(`${sx},${sy}`, shadowCol);
      if (sx > maxX) maxX = sx;
      if (sy > maxY) maxY = sy;
    }
  }

  // 2. Optional 1px Outline
  if (options.outline) {
    const outlineCol = options.outlineColor || '#090b10';
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const key of fgMap.keys()) {
      const [xs, ys] = key.split(',').map(Number);
      for (const [dx, dy] of dirs) {
        const ox = xs + padX + dx;
        const oy = ys + padY + dy;
        if (!canPlace(ox, oy)) continue;
        outMap.set(`${ox},${oy}`, outlineCol);
        if (ox > maxX) maxX = ox;
        if (oy > maxY) maxY = oy;
      }
    }
  }

  // 3. Foreground Glyphs
  for (const [key, col] of fgMap.entries()) {
    const [xs, ys] = key.split(',').map(Number);
    const fx = xs + padX;
    const fy = ys + padY;
    if (!canPlace(fx, fy)) continue;
    outMap.set(`${fx},${fy}`, col);
    if (fx > maxX) maxX = fx;
    if (fy > maxY) maxY = fy;
  }

  const pixels: { x: number; y: number; color: string }[] = [];
  for (const [key, color] of outMap.entries()) {
    const [x, y] = key.split(',').map(Number);
    pixels.push({ x, y, color });
  }

  return {
    pixels,
    width: maxX + 1,
    height: maxY + 1,
  };
}
