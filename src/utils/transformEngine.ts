import {
  Layer,
  SelectionArea,
  TransformMode,
  TransformParameters,
  TransformPivotPreset,
  TransformPoint,
  VectorNode,
  VectorPath,
} from '../types';

export interface ContentBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  empty: boolean;
}

function createEmpty(width: number, height: number): (string | null)[][] {
  return Array.from({ length: height }, () => new Array(width).fill(null));
}

function parseColorRgba(color: string | null): [number, number, number, number] {
  if (!color) return [0, 0, 0, 0];
  const trimmed = color.trim();
  const m = trimmed.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (m) {
    return [
      Math.max(0, Math.min(255, Math.round(parseFloat(m[1])))),
      Math.max(0, Math.min(255, Math.round(parseFloat(m[2])))),
      Math.max(0, Math.min(255, Math.round(parseFloat(m[3])))),
      m[4] !== undefined ? Math.max(0, Math.min(1, parseFloat(m[4]))) : 1,
    ];
  }
  const clean = trimmed.replace('#', '');
  const full =
    clean.length === 3
      ? `${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`
      : clean.padEnd(6, '0').slice(0, 6);
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
    1,
  ];
}

function formatRgba(r: number, g: number, b: number, a: number): string | null {
  if (a <= 0.04) return null;
  const rr = Math.max(0, Math.min(255, Math.round(r)));
  const gg = Math.max(0, Math.min(255, Math.round(g)));
  const bb = Math.max(0, Math.min(255, Math.round(b)));
  if (a >= 0.96) {
    return `#${((1 << 24) + (rr << 16) + (gg << 8) + bb).toString(16).slice(1)}`;
  }
  return `rgba(${rr}, ${gg}, ${bb}, ${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}

export function computeGridContentBounds(
  grid: (string | null)[][],
  selection?: SelectionArea | null
): ContentBounds {
  const h = grid.length;
  const w = grid[0]?.length || 0;
  if (selection && selection.active) {
    const minX = Math.max(0, Math.min(selection.startX, selection.endX));
    const maxX = Math.min(w - 1, Math.max(selection.startX, selection.endX));
    const minY = Math.max(0, Math.min(selection.startY, selection.endY));
    const maxY = Math.min(h - 1, Math.max(selection.startY, selection.endY));
    return {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(1, maxX - minX + 1),
      height: Math.max(1, maxY - minY + 1),
      empty: false,
    };
  }

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (grid[y]?.[x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return {
      minX: 0,
      minY: 0,
      maxX: Math.max(0, w - 1),
      maxY: Math.max(0, h - 1),
      width: Math.max(1, w),
      height: Math.max(1, h),
      empty: true,
    };
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    empty: false,
  };
}

export function computeVectorPathsBounds(paths: VectorPath[] | undefined): ContentBounds | null {
  if (!paths || paths.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let count = 0;
  for (const p of paths) {
    for (const n of p.nodes) {
      count++;
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x);
      maxY = Math.max(maxY, n.y);
    }
  }
  if (count === 0) return null;
  const rMinX = Math.floor(minX);
  const rMinY = Math.floor(minY);
  const rMaxX = Math.ceil(maxX);
  const rMaxY = Math.ceil(maxY);
  return {
    minX: rMinX,
    minY: rMinY,
    maxX: rMaxX,
    maxY: rMaxY,
    width: Math.max(1, rMaxX - rMinX + 1),
    height: Math.max(1, rMaxY - rMinY + 1),
    empty: false,
  };
}

export function computeMultiLayerBounds(
  layers: Layer[],
  width: number,
  height: number,
  selection?: SelectionArea | null
): ContentBounds {
  if (selection && selection.active) {
    const minX = Math.max(0, Math.min(selection.startX, selection.endX));
    const maxX = Math.min(width - 1, Math.max(selection.startX, selection.endX));
    const minY = Math.max(0, Math.min(selection.startY, selection.endY));
    const maxY = Math.min(height - 1, Math.max(selection.startY, selection.endY));
    return {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(1, maxX - minX + 1),
      height: Math.max(1, maxY - minY + 1),
      empty: false,
    };
  }

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (const layer of layers) {
    const b = computeGridContentBounds(layer.pixels);
    if (!b.empty) {
      minX = Math.min(minX, b.minX);
      minY = Math.min(minY, b.minY);
      maxX = Math.max(maxX, b.maxX);
      maxY = Math.max(maxY, b.maxY);
    }
    const vb = computeVectorPathsBounds(layer.vectorPaths);
    if (vb && !vb.empty) {
      minX = Math.min(minX, vb.minX);
      minY = Math.min(minY, vb.minY);
      maxX = Math.max(maxX, vb.maxX);
      maxY = Math.max(maxY, vb.maxY);
    }
  }

  if (maxX < minX || maxY < minY) {
    return {
      minX: 0,
      minY: 0,
      maxX: Math.max(0, width - 1),
      maxY: Math.max(0, height - 1),
      width: Math.max(1, width),
      height: Math.max(1, height),
      empty: true,
    };
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    empty: false,
  };
}

export function resolvePivotCoords(
  preset: TransformPivotPreset,
  x: number,
  y: number,
  w: number,
  h: number,
  currentPivotX?: number,
  currentPivotY?: number
): { pivotX: number; pivotY: number } {
  switch (preset) {
    case 'top-left':
      return { pivotX: x, pivotY: y };
    case 'top':
      return { pivotX: x + w / 2, pivotY: y };
    case 'top-right':
      return { pivotX: x + w, pivotY: y };
    case 'left':
      return { pivotX: x, pivotY: y + h / 2 };
    case 'center':
      return { pivotX: x + w / 2, pivotY: y + h / 2 };
    case 'right':
      return { pivotX: x + w, pivotY: y + h / 2 };
    case 'bottom-left':
      return { pivotX: x, pivotY: y + h };
    case 'bottom':
      return { pivotX: x + w / 2, pivotY: y + h };
    case 'bottom-right':
      return { pivotX: x + w, pivotY: y + h };
    case 'custom':
    default:
      return {
        pivotX: currentPivotX ?? x + w / 2,
        pivotY: currentPivotY ?? y + h / 2,
      };
  }
}

export function computeDefaultCorners(
  x: number,
  y: number,
  w: number,
  h: number
): [TransformPoint, TransformPoint, TransformPoint, TransformPoint] {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
}

export function createInitialTransformParams(
  bounds: ContentBounds,
  mode: TransformMode = 'free',
  existing?: Partial<TransformParameters> | null
): TransformParameters {
  const bx = bounds.minX;
  const by = bounds.minY;
  const bw = Math.max(1, bounds.width);
  const bh = Math.max(1, bounds.height);

  const base: TransformParameters = {
    mode,
    x: bx,
    y: by,
    width: bw,
    height: bh,
    baseWidth: bw,
    baseHeight: bh,
    baseX: bx,
    baseY: by,
    scaleX: 100,
    scaleY: 100,
    rotation: 0,
    skewX: 0,
    skewY: 0,
    pivotPreset: 'center',
    pivotX: bx + bw / 2,
    pivotY: by + bh / 2,
    interpolation: 'nearest',
    pixelPerfect: true,
    integerScale: false,
    pixelPerfectRotate: true,
    snapToGrid: true,
    antiAlias: false,
    nonDestructive: true,
    targetScope: 'active_layer',
    frameScope: 'current_frame',
    corners: computeDefaultCorners(bx, by, bw, bh),
    warpBulge: 0,
    warpBendX: 0,
    warpBendY: 0,
    tileWrap: false,
    symmetryMode: 'none',
  };

  if (existing) {
    return {
      ...base,
      ...existing,
      mode,
      corners: existing.corners
        ? (existing.corners.map((c) => ({ ...c })) as [
            TransformPoint,
            TransformPoint,
            TransformPoint,
            TransformPoint,
          ])
        : base.corners,
    };
  }
  return base;
}

/**
 * Compute world positions of the 4 transformed bounding corners for UI overlay & distort/perspective handles.
 */
export function getTransformedQuadCorners(
  params: TransformParameters
): [TransformPoint, TransformPoint, TransformPoint, TransformPoint] {
  if (params.mode === 'distort' || params.mode === 'perspective' || params.mode === 'warp') {
    return params.corners;
  }

  const sx = (params.scaleX / 100);
  const sy = (params.scaleY / 100);
  const rad = (params.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const tanSkewX = Math.tan((params.skewX * Math.PI) / 180);
  const tanSkewY = Math.tan((params.skewY * Math.PI) / 180);

  const tx = params.x - params.baseX;
  const ty = params.y - params.baseY;
  const px = params.pivotX;
  const py = params.pivotY;

  const basePts: TransformPoint[] = [
    { x: params.baseX, y: params.baseY },
    { x: params.baseX + params.baseWidth, y: params.baseY },
    { x: params.baseX + params.baseWidth, y: params.baseY + params.baseHeight },
    { x: params.baseX, y: params.baseY + params.baseHeight },
  ];

  const transformed = basePts.map((pt) => {
    const lx = (pt.x - px) * sx;
    const ly = (pt.y - py) * sy;
    const skx = lx + ly * tanSkewX;
    const sky = ly + lx * tanSkewY;
    const rx = skx * cos - sky * sin;
    const ry = skx * sin + sky * cos;
    return {
      x: px + rx + tx,
      y: py + ry + ty,
    };
  });

  return [transformed[0], transformed[1], transformed[2], transformed[3]];
}

// =========================================================
// PIXEL SAMPLING & HQ PIXEL ART ALGORITHMS
// =========================================================

function sampleNearest(
  grid: (string | null)[][],
  fx: number,
  fy: number,
  clipBounds?: { minX: number; minY: number; maxX: number; maxY: number } | null
): string | null {
  const x = Math.round(fx - 0.5);
  const y = Math.round(fy - 0.5);
  const h = grid.length;
  const w = grid[0]?.length || 0;
  if (x < 0 || x >= w || y < 0 || y >= h) return null;
  if (clipBounds && (x < clipBounds.minX || x > clipBounds.maxX || y < clipBounds.minY || y > clipBounds.maxY)) {
    return null;
  }
  return grid[y][x];
}

function sampleBilinear(
  grid: (string | null)[][],
  fx: number,
  fy: number,
  clipBounds?: { minX: number; minY: number; maxX: number; maxY: number } | null
): string | null {
  const h = grid.length;
  const w = grid[0]?.length || 0;
  const gx = fx - 0.5;
  const gy = fy - 0.5;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const tx = gx - x0;
  const ty = gy - y0;

  const getPx = (px: number, py: number): [number, number, number, number] => {
    if (px < 0 || px >= w || py < 0 || py >= h) return [0, 0, 0, 0];
    if (clipBounds && (px < clipBounds.minX || px > clipBounds.maxX || py < clipBounds.minY || py > clipBounds.maxY)) {
      return [0, 0, 0, 0];
    }
    return parseColorRgba(grid[py][px]);
  };

  const c00 = getPx(x0, y0);
  const c10 = getPx(x0 + 1, y0);
  const c01 = getPx(x0, y0 + 1);
  const c11 = getPx(x0 + 1, y0 + 1);

  const w00 = (1 - tx) * (1 - ty);
  const w10 = tx * (1 - ty);
  const w01 = (1 - tx) * ty;
  const w11 = tx * ty;

  const a = c00[3] * w00 + c10[3] * w10 + c01[3] * w01 + c11[3] * w11;
  if (a <= 0.04) return null;

  const r = (c00[0] * c00[3] * w00 + c10[0] * c10[3] * w10 + c01[0] * c01[3] * w01 + c11[0] * c11[3] * w11) / a;
  const g = (c00[1] * c00[3] * w00 + c10[1] * c10[3] * w10 + c01[1] * c01[3] * w01 + c11[1] * c11[3] * w11) / a;
  const b = (c00[2] * c00[3] * w00 + c10[2] * c10[3] * w10 + c01[2] * c01[3] * w01 + c11[2] * c11[3] * w11) / a;
  return formatRgba(r, g, b, a);
}

function cubicWeight(x: number): number {
  const ax = Math.abs(x);
  if (ax <= 1) return 1.5 * ax * ax * ax - 2.5 * ax * ax + 1;
  if (ax < 2) return -0.5 * ax * ax * ax + 2.5 * ax * ax - 4 * ax + 2;
  return 0;
}

function sampleBicubic(
  grid: (string | null)[][],
  fx: number,
  fy: number,
  clipBounds?: { minX: number; minY: number; maxX: number; maxY: number } | null
): string | null {
  const h = grid.length;
  const w = grid[0]?.length || 0;
  const gx = fx - 0.5;
  const gy = fy - 0.5;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  const dx = gx - ix;
  const dy = gy - iy;

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let aSum = 0;

  for (let m = -1; m <= 2; m++) {
    const wy = cubicWeight(m - dy);
    const py = iy + m;
    for (let n = -1; n <= 2; n++) {
      const wx = cubicWeight(n - dx);
      const px = ix + n;
      const weight = wx * wy;
      if (weight === 0) continue;
      if (px < 0 || px >= w || py < 0 || py >= h) continue;
      if (clipBounds && (px < clipBounds.minX || px > clipBounds.maxX || py < clipBounds.minY || py > clipBounds.maxY)) {
        continue;
      }
      const c = parseColorRgba(grid[py][px]);
      if (c[3] > 0) {
        rSum += c[0] * c[3] * weight;
        gSum += c[1] * c[3] * weight;
        bSum += c[2] * c[3] * weight;
        aSum += c[3] * weight;
      }
    }
  }

  if (aSum <= 0.04) return null;
  return formatRgba(rSum / aSum, gSum / aSum, bSum / aSum, Math.max(0, Math.min(1, aSum)));
}

/**
 * 3x3 Homography matrix solver mapping unit square (0,0)-(1,0)-(1,1)-(0,1) to quad corners.
 */
function computeUnitToQuadHomography(
  c0: TransformPoint,
  c1: TransformPoint,
  c2: TransformPoint,
  c3: TransformPoint
): number[] {
  const x0 = c0.x, y0 = c0.y;
  const x1 = c1.x, y1 = c1.y;
  const x2 = c2.x, y2 = c2.y;
  const x3 = c3.x, y3 = c3.y;

  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const dy3 = y0 - y1 + y2 - y3;

  const det = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(det) < 1e-6) {
    return [x1 - x0, x3 - x0, x0, y1 - y0, y3 - y0, y0, 0, 0, 1];
  }

  const g = (dx3 * dy2 - dx2 * dy3) / det;
  const h = (dx1 * dy3 - dx3 * dy1) / det;
  const a = x1 - x0 + g * x1;
  const b = x3 - x0 + h * x3;
  const c = x0;
  const d = y1 - y0 + g * y1;
  const e = y3 - y0 + h * y3;
  const f = y0;
  return [a, b, c, d, e, f, g, h, 1];
}

function invert3x3(m: number[]): number[] | null {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const D = -(b * i - c * h);
  const E = a * i - c * g;
  const F = -(a * h - b * g);
  const G = b * f - c * e;
  const H = -(a * f - c * d);
  const I = a * e - b * d;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-9) return null;
  const inv = 1 / det;
  return [A * inv, D * inv, G * inv, B * inv, E * inv, H * inv, C * inv, F * inv, I * inv];
}

/**
 * Invert bilinear quad (TL, TR, BR, BL) to normalized UV in [0,1]^2 for Distort & Warp modes.
 */
function invertBilinearQuad(
  px: number,
  py: number,
  c0: TransformPoint,
  c1: TransformPoint,
  c2: TransformPoint,
  c3: TransformPoint
): { u: number; v: number } | null {
  // Newton-Raphson 5 iterations from center (0.5, 0.5)
  let u = 0.5;
  let v = 0.5;
  for (let iter = 0; iter < 6; iter++) {
    const oneU = 1 - u;
    const oneV = 1 - v;
    const x = oneU * oneV * c0.x + u * oneV * c1.x + u * v * c2.x + oneU * v * c3.x;
    const y = oneU * oneV * c0.y + u * oneV * c1.y + u * v * c2.y + oneU * v * c3.y;
    const rx = x - px;
    const ry = y - py;
    if (Math.abs(rx) < 0.001 && Math.abs(ry) < 0.001) break;

    const dxdu = oneV * (c1.x - c0.x) + v * (c2.x - c3.x);
    const dxdv = oneU * (c3.x - c0.x) + u * (c2.x - c1.x);
    const dydu = oneV * (c1.y - c0.y) + v * (c2.y - c3.y);
    const dydv = oneU * (c3.y - c0.y) + u * (c2.y - c1.y);

    const det = dxdu * dydv - dxdv * dydu;
    if (Math.abs(det) < 1e-6) return null;
    u -= (rx * dydv - ry * dxdv) / det;
    v -= (dxdu * ry - dydu * rx) / det;
  }
  if (u < -0.02 || u > 1.02 || v < -0.02 || v > 1.02) return null;
  return { u: Math.max(0, Math.min(1, u)), v: Math.max(0, Math.min(1, v)) };
}

/**
 * Pixel-art EPX (Scale2x) single pass on a grid inside canvas bounds.
 */
export function scaleGridEPX2x(src: (string | null)[][]): (string | null)[][] {
  const h = src.length;
  const w = src[0]?.length || 0;
  const out = createEmpty(w * 2, h * 2);
  const at = (x: number, y: number) =>
    x >= 0 && x < w && y >= 0 && y < h ? src[y][x] : null;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const P = at(x, y);
      const A = at(x, y - 1);
      const B = at(x + 1, y);
      const C = at(x - 1, y);
      const D = at(x, y + 1);

      let p1 = P;
      let p2 = P;
      let p3 = P;
      let p4 = P;

      if (C === A && C !== D && A !== B) p1 = A;
      if (A === B && A !== C && B !== D) p2 = B;
      if (D === C && D !== B && C !== A) p3 = C;
      if (B === D && B !== A && D !== C) p4 = D;

      out[y * 2][x * 2] = p1;
      out[y * 2][x * 2 + 1] = p2;
      out[y * 2 + 1][x * 2] = p3;
      out[y * 2 + 1][x * 2 + 1] = p4;
    }
  }
  return out;
}

/**
 * Scale3x HQ algorithm for crisp pixel-art enlargement without blur.
 */
export function scaleGrid3xHQ(src: (string | null)[][]): (string | null)[][] {
  const h = src.length;
  const w = src[0]?.length || 0;
  const out = createEmpty(w * 3, h * 3);
  const at = (x: number, y: number) =>
    x >= 0 && x < w && y >= 0 && y < h ? src[y][x] : null;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const A = at(x - 1, y - 1);
      const B = at(x, y - 1);
      const C = at(x + 1, y - 1);
      const D = at(x - 1, y);
      const E = at(x, y);
      const F = at(x + 1, y);
      const G = at(x - 1, y + 1);
      const H = at(x, y + 1);
      const I = at(x + 1, y + 1);

      let e0 = E, e1 = E, e2 = E, e3 = E, e4 = E, e5 = E, e6 = E, e7 = E, e8 = E;
      if (B !== H && D !== F) {
        e0 = D === B ? D : E;
        e1 = (D === B && E !== C) || (B === F && E !== A) ? B : E;
        e2 = B === F ? F : E;
        e3 = (D === B && E !== G) || (D === H && E !== A) ? D : E;
        e5 = (B === F && E !== I) || (H === F && E !== C) ? F : E;
        e6 = D === H ? D : E;
        e7 = (D === H && E !== I) || (H === F && E !== G) ? H : E;
        e8 = H === F ? F : E;
      }

      const oy = y * 3;
      const ox = x * 3;
      out[oy][ox] = e0;
      out[oy][ox + 1] = e1;
      out[oy][ox + 2] = e2;
      out[oy + 1][ox] = e3;
      out[oy + 1][ox + 1] = e4;
      out[oy + 1][ox + 2] = e5;
      out[oy + 2][ox] = e6;
      out[oy + 2][ox + 1] = e7;
      out[oy + 2][ox + 2] = e8;
    }
  }
  return out;
}

/**
 * Apply x2 / x3 / x4 HQ scale centered inside the canvas bounds around content bounds.
 */
export function applyHQScaleInCanvas(
  sourceGrid: (string | null)[][],
  factor: 2 | 3 | 4,
  selection?: SelectionArea | null
): (string | null)[][] {
  const canvasH = sourceGrid.length;
  const canvasW = sourceGrid[0]?.length || 0;
  const bounds = computeGridContentBounds(sourceGrid, selection);
  if (bounds.empty) return sourceGrid.map((r) => [...r]);

  const crop = createEmpty(bounds.width, bounds.height);
  for (let y = 0; y < bounds.height; y++) {
    for (let x = 0; x < bounds.width; x++) {
      crop[y][x] = sourceGrid[bounds.minY + y]?.[bounds.minX + x] ?? null;
    }
  }

  let scaled = crop;
  if (factor === 2) {
    scaled = scaleGridEPX2x(crop);
  } else if (factor === 3) {
    scaled = scaleGrid3xHQ(crop);
  } else {
    scaled = scaleGridEPX2x(scaleGridEPX2x(crop));
  }

  const out = selection && selection.active
    ? sourceGrid.map((row, y) =>
        row.map((c, x) =>
          x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY ? null : c
        )
      )
    : createEmpty(canvasW, canvasH);

  const cx = bounds.minX + bounds.width / 2;
  const cy = bounds.minY + bounds.height / 2;
  const sw = scaled[0]?.length || 0;
  const sh = scaled.length;
  const startX = Math.round(cx - sw / 2);
  const startY = Math.round(cy - sh / 2);

  for (let y = 0; y < sh; y++) {
    const dy = startY + y;
    if (dy < 0 || dy >= canvasH) continue;
    for (let x = 0; x < sw; x++) {
      const dx = startX + x;
      if (dx < 0 || dx >= canvasW) continue;
      const col = scaled[y][x];
      if (col) out[dy][dx] = col;
    }
  }
  return out;
}

/**
 * Clean isolated jagged stray spikes produced during non-90 pixel rotation (Pixel-Perfect Rotate cleanup).
 */
function cleanupRotatedPixelArt(grid: (string | null)[][], originalGrid: (string | null)[][]): (string | null)[][] {
  const h = grid.length;
  const w = grid[0]?.length || 0;
  const out = grid.map((r) => [...r]);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (!grid[y][x]) {
        const up = grid[y - 1][x];
        const down = grid[y + 1][x];
        const left = grid[y][x - 1];
        const right = grid[y][x + 1];
        // Fill 1px pinholes completely surrounded by 4 solid neighbors
        if (up && down && left && right) {
          out[y][x] = up;
        }
      }
    }
  }
  void originalGrid;
  return out;
}

/**
 * Full inverse-mapped transform supporting Free, Scale, Rotate, Skew, Distort, Perspective, Warp,
 * Pixel-Perfect Rotation, Integer Scale, Tile Wrap, Symmetry, and Nearest/Bilinear/Bicubic/Auto.
 */
export function applyTransformToGrid(
  sourceGrid: (string | null)[][],
  params: TransformParameters,
  canvasWidth: number,
  canvasHeight: number,
  selection?: SelectionArea | null
): (string | null)[][] {
  const clipBounds =
    selection && selection.active
      ? {
          minX: Math.max(0, Math.min(selection.startX, selection.endX)),
          minY: Math.max(0, Math.min(selection.startY, selection.endY)),
          maxX: Math.min(canvasWidth - 1, Math.max(selection.startX, selection.endX)),
          maxY: Math.min(canvasHeight - 1, Math.max(selection.startY, selection.endY)),
        }
      : null;

  const out = clipBounds
    ? sourceGrid.map((row, y) =>
        row.map((col, x) =>
          x >= clipBounds.minX && x <= clipBounds.maxX && y >= clipBounds.minY && y <= clipBounds.maxY
            ? null
            : col
        )
      )
    : createEmpty(canvasWidth, canvasHeight);

  // Determine effective interpolation
  let effInterp = params.interpolation;
  if (effInterp === 'auto') {
    effInterp = params.antiAlias && !params.pixelPerfect ? 'bilinear' : 'nearest';
  }
  if (params.pixelPerfect && !params.antiAlias) {
    effInterp = 'nearest';
  }

  const sampleFn = (fx: number, fy: number): string | null => {
    let sx = fx;
    let sy = fy;
    if (params.tileWrap) {
      sx = ((sx % canvasWidth) + canvasWidth) % canvasWidth;
      sy = ((sy % canvasHeight) + canvasHeight) % canvasHeight;
    }
    if (effInterp === 'bicubic') return sampleBicubic(sourceGrid, sx, sy, clipBounds);
    if (effInterp === 'bilinear') return sampleBilinear(sourceGrid, sx, sy, clipBounds);
    return sampleNearest(sourceGrid, sx, sy, clipBounds);
  };

  // For Pixel Perfect Rotate, pre-upscale source 2x via EPX when angle is non-90deg so edges stay razor-clean
  const isNonOrthogonalAngle = Math.abs(params.rotation % 90) > 0.5;
  const useRotSpritePass =
    params.pixelPerfectRotate &&
    isNonOrthogonalAngle &&
    params.mode !== 'perspective' &&
    params.mode !== 'distort' &&
    params.mode !== 'warp';

  const upscaledForRotSprite = useRotSpritePass ? scaleGridEPX2x(sourceGrid) : null;

  // Perspective inverse homography
  const perspInv =
    params.mode === 'perspective'
      ? invert3x3(
          computeUnitToQuadHomography(
            params.corners[0],
            params.corners[1],
            params.corners[2],
            params.corners[3]
          )
        )
      : null;

  // Standard affine inverse matrix parameters
  const sx = (params.integerScale
    ? Math.max(1, Math.round(params.scaleX / 100))
    : params.scaleX / 100) || 0.01;
  const sy = (params.integerScale
    ? Math.max(1, Math.round(params.scaleY / 100))
    : params.scaleY / 100) || 0.01;
  const rad = (params.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const tanSkewX = Math.tan((params.skewX * Math.PI) / 180);
  const tanSkewY = Math.tan((params.skewY * Math.PI) / 180);
  const skewDet = 1 - tanSkewX * tanSkewY;

  const tx = params.x - params.baseX;
  const ty = params.y - params.baseY;
  const px = params.pivotX;
  const py = params.pivotY;

  for (let y = 0; y < canvasHeight; y++) {
    for (let x = 0; x < canvasWidth; x++) {
      const dstX = x + 0.5;
      const dstY = y + 0.5;
      let srcX = -9999;
      let srcY = -9999;

      if (params.mode === 'perspective' && perspInv) {
        const wDenom = perspInv[6] * dstX + perspInv[7] * dstY + perspInv[8];
        if (Math.abs(wDenom) < 1e-6) continue;
        const u = (perspInv[0] * dstX + perspInv[1] * dstY + perspInv[2]) / wDenom;
        const v = (perspInv[3] * dstX + perspInv[4] * dstY + perspInv[5]) / wDenom;
        if (u < 0 || u > 1 || v < 0 || v > 1) continue;
        srcX = params.baseX + u * params.baseWidth;
        srcY = params.baseY + v * params.baseHeight;
      } else if (params.mode === 'distort' || params.mode === 'warp') {
        const uv = invertBilinearQuad(
          dstX,
          dstY,
          params.corners[0],
          params.corners[1],
          params.corners[2],
          params.corners[3]
        );
        if (!uv) continue;
        let { u, v } = uv;
        if (params.mode === 'warp') {
          const cu = u - 0.5;
          const cv = v - 0.5;
          const dist2 = cu * cu + cv * cv;
          const bulgeFactor = 1 - params.warpBulge * (0.6 - dist2 * 1.4);
          u = 0.5 + cu * bulgeFactor + params.warpBendX * (0.25 - cv * cv);
          v = 0.5 + cv * bulgeFactor + params.warpBendY * (0.25 - cu * cu);
        }
        if (u < 0 || u > 1 || v < 0 || v > 1) continue;
        srcX = params.baseX + u * params.baseWidth;
        srcY = params.baseY + v * params.baseHeight;
      } else {
        // Inverse of translate -> rotate -> skew -> scale around pivot
        const rx = dstX - tx - px;
        const ry = dstY - ty - py;
        const unrotX = rx * cos + ry * sin;
        const unrotY = -rx * sin + ry * cos;

        let unskewX = unrotX;
        let unskewY = unrotY;
        if (Math.abs(skewDet) > 1e-5) {
          unskewX = (unrotX - tanSkewX * unrotY) / skewDet;
          unskewY = (unrotY - tanSkewY * unrotX) / skewDet;
        }
        srcX = px + unskewX / sx;
        srcY = py + unskewY / sy;
      }

      let sampled: string | null = null;
      if (upscaledForRotSprite) {
        const ux = Math.round(srcX * 2 - 0.5);
        const uy = Math.round(srcY * 2 - 0.5);
        if (ux >= 0 && ux < canvasWidth * 2 && uy >= 0 && uy < canvasHeight * 2) {
          const origPxX = Math.floor(ux / 2);
          const origPxY = Math.floor(uy / 2);
          if (
            !clipBounds ||
            (origPxX >= clipBounds.minX &&
              origPxX <= clipBounds.maxX &&
              origPxY >= clipBounds.minY &&
              origPxY <= clipBounds.maxY)
          ) {
            sampled = upscaledForRotSprite[uy]?.[ux] ?? null;
          }
        }
      } else {
        sampled = sampleFn(srcX, srcY);
      }

      if (sampled) {
        out[y][x] = sampled;
      }
    }
  }

  let finalOut = useRotSpritePass ? cleanupRotatedPixelArt(out, sourceGrid) : out;

  // Optional Symmetry Transform mirroring
  if (params.symmetryMode !== 'none') {
    const symOut = finalOut.map((r) => [...r]);
    for (let y = 0; y < canvasHeight; y++) {
      for (let x = 0; x < canvasWidth; x++) {
        const col = finalOut[y][x];
        if (!col) continue;
        if (params.symmetryMode === 'horizontal' || params.symmetryMode === 'radial') {
          const mx = canvasWidth - 1 - x;
          if (mx >= 0 && mx < canvasWidth && !symOut[y][mx]) symOut[y][mx] = col;
        }
        if (params.symmetryMode === 'vertical' || params.symmetryMode === 'radial') {
          const my = canvasHeight - 1 - y;
          if (my >= 0 && my < canvasHeight && !symOut[my][x]) symOut[my][x] = col;
        }
        if (params.symmetryMode === 'radial') {
          const mx = canvasWidth - 1 - x;
          const my = canvasHeight - 1 - y;
          if (mx >= 0 && mx < canvasWidth && my >= 0 && my < canvasHeight && !symOut[my][mx]) {
            symOut[my][mx] = col;
          }
        }
      }
    }
    finalOut = symOut;
  }

  return finalOut;
}

/**
 * Off-canvas aware wrapper around applyTransformToGrid:
 * when clipOutsideCanvas is false, also records pixels mapped outside [0..w-1, 0..h-1]
 * into offCanvasPixels ("x,y" -> color) so moving content back restores them intact.
 */
export function applyTransformWithOffCanvas(
  sourceGrid: (string | null)[][],
  sourceOffCanvas: Record<string, string> | undefined,
  params: TransformParameters,
  canvasWidth: number,
  canvasHeight: number,
  clipOutsideCanvas: boolean,
  selection?: SelectionArea | null
): { pixels: (string | null)[][]; offCanvasPixels?: Record<string, string> } {
  // Build extended bounds grid if we have off-canvas pixels and clipping is disabled
  const hasOff = !clipOutsideCanvas && sourceOffCanvas && Object.keys(sourceOffCanvas).length > 0;
  if (clipOutsideCanvas || (selection && selection.active)) {
    return {
      pixels: applyTransformToGrid(sourceGrid, params, canvasWidth, canvasHeight, selection),
      offCanvasPixels: clipOutsideCanvas ? undefined : sourceOffCanvas,
    };
  }

  // Forward-map pixels (including off-canvas pixels) when simple affine/translation or inverse-map clipped + offCanvas
  const isPureTranslate =
    Math.abs(params.scaleX - 100) < 0.01 &&
    Math.abs(params.scaleY - 100) < 0.01 &&
    Math.abs(params.rotation) < 0.01 &&
    Math.abs(params.skewX) < 0.01 &&
    Math.abs(params.skewY) < 0.01 &&
    params.mode !== 'distort' &&
    params.mode !== 'perspective' &&
    params.mode !== 'warp';

  if (isPureTranslate || hasOff) {
    const dx = Math.round(params.x - params.baseX);
    const dy = Math.round(params.y - params.baseY);
    if (isPureTranslate) {
      const out = createEmpty(canvasWidth, canvasHeight);
      const nextOff: Record<string, string> = {};
      for (let y = 0; y < canvasHeight; y++) {
        for (let x = 0; x < canvasWidth; x++) {
          const c = sourceGrid[y]?.[x];
          if (!c) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < canvasWidth && ny >= 0 && ny < canvasHeight) out[ny][nx] = c;
          else nextOff[`${nx},${ny}`] = c;
        }
      }
      if (sourceOffCanvas) {
        for (const [k, c] of Object.entries(sourceOffCanvas)) {
          const [ox, oy] = k.split(',').map(Number);
          const nx = ox + dx;
          const ny = oy + dy;
          if (nx >= 0 && nx < canvasWidth && ny >= 0 && ny < canvasHeight) out[ny][nx] = c;
          else nextOff[`${nx},${ny}`] = c;
        }
      }
      return {
        pixels: out,
        offCanvasPixels: Object.keys(nextOff).length > 0 ? nextOff : undefined,
      };
    }
  }

  // General non-clipped transform: capture pixels landing in extended margin [-w..2w, -h..2h]
  const pixels = applyTransformToGrid(sourceGrid, params, canvasWidth, canvasHeight, null);
  const nextOff: Record<string, string> = {};
  for (let y = 0; y < canvasHeight; y++) {
    for (let x = 0; x < canvasWidth; x++) {
      const c = sourceGrid[y]?.[x];
      if (!c) continue;
      const pt = transformPointWithParams({ x: x + 0.5, y: y + 0.5 }, params);
      const nx = Math.floor(pt.x);
      const ny = Math.floor(pt.y);
      if (nx < 0 || nx >= canvasWidth || ny < 0 || ny >= canvasHeight) {
        nextOff[`${nx},${ny}`] = c;
      }
    }
  }
  return {
    pixels,
    offCanvasPixels: Object.keys(nextOff).length > 0 ? nextOff : undefined,
  };
}

/**
 * Transform an editable VectorPath through all transform parameters non-destructively!
 */
export function transformPointWithParams(
  pt: TransformPoint,
  params: TransformParameters
): TransformPoint {
  if (params.mode === 'perspective' || params.mode === 'distort' || params.mode === 'warp') {
    const u = (pt.x - params.baseX) / Math.max(1, params.baseWidth);
    const v = (pt.y - params.baseY) / Math.max(1, params.baseHeight);
    if (params.mode === 'perspective') {
      const H = computeUnitToQuadHomography(
        params.corners[0],
        params.corners[1],
        params.corners[2],
        params.corners[3]
      );
      const den = H[6] * u + H[7] * v + H[8];
      if (Math.abs(den) > 1e-6) {
        return {
          x: (H[0] * u + H[1] * v + H[2]) / den,
          y: (H[3] * u + H[4] * v + H[5]) / den,
        };
      }
    }
    // Bilinear quad
    const [c0, c1, c2, c3] = params.corners;
    const oneU = 1 - u;
    const oneV = 1 - v;
    return {
      x: oneU * oneV * c0.x + u * oneV * c1.x + u * v * c2.x + oneU * v * c3.x,
      y: oneU * oneV * c0.y + u * oneV * c1.y + u * v * c2.y + oneU * v * c3.y,
    };
  }

  const sx = params.scaleX / 100;
  const sy = params.scaleY / 100;
  const rad = (params.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const tanSkewX = Math.tan((params.skewX * Math.PI) / 180);
  const tanSkewY = Math.tan((params.skewY * Math.PI) / 180);
  const tx = params.x - params.baseX;
  const ty = params.y - params.baseY;

  const lx = (pt.x - params.pivotX) * sx;
  const ly = (pt.y - params.pivotY) * sy;
  const skx = lx + ly * tanSkewX;
  const sky = ly + lx * tanSkewY;
  return {
    x: params.pivotX + (skx * cos - sky * sin) + tx,
    y: params.pivotY + (skx * sin + sky * cos) + ty,
  };
}

export function transformVectorPath(
  path: VectorPath,
  params: TransformParameters
): VectorPath {
  const newNodes: VectorNode[] = path.nodes.map((node) => {
    const p = transformPointWithParams({ x: node.x, y: node.y }, params);
    const out: VectorNode = { ...node, x: p.x, y: p.y };
    if (node.inHandleX !== undefined && node.inHandleY !== undefined) {
      const ih = transformPointWithParams({ x: node.inHandleX, y: node.inHandleY }, params);
      out.inHandleX = ih.x;
      out.inHandleY = ih.y;
    }
    if (node.outHandleX !== undefined && node.outHandleY !== undefined) {
      const oh = transformPointWithParams({ x: node.outHandleX, y: node.outHandleY }, params);
      out.outHandleX = oh.x;
      out.outHandleY = oh.y;
    }
    return out;
  });
  return { ...path, nodes: newNodes };
}

// =========================================================
// ONE-CLICK QUICK TRANSFORMS (90°, 180°, Flip, Center, Snap)
// =========================================================

export function flipGridH(grid: (string | null)[][], selection?: SelectionArea | null): (string | null)[][] {
  const h = grid.length;
  const w = grid[0]?.length || 0;
  const b = computeGridContentBounds(grid, selection);
  if (b.empty) return grid.map((r) => [...r]);

  const out = grid.map((r) => [...r]);
  for (let y = b.minY; y <= b.maxY; y++) {
    for (let x = b.minX; x <= b.maxX; x++) {
      const mirrorX = b.minX + (b.maxX - x);
      if (mirrorX >= 0 && mirrorX < w && y >= 0 && y < h) {
        out[y][mirrorX] = grid[y][x];
      }
    }
  }
  return out;
}

export function flipGridV(grid: (string | null)[][], selection?: SelectionArea | null): (string | null)[][] {
  const h = grid.length;
  const w = grid[0]?.length || 0;
  const b = computeGridContentBounds(grid, selection);
  if (b.empty) return grid.map((r) => [...r]);

  const out = grid.map((r) => [...r]);
  for (let y = b.minY; y <= b.maxY; y++) {
    const mirrorY = b.minY + (b.maxY - y);
    for (let x = b.minX; x <= b.maxX; x++) {
      if (x >= 0 && x < w && mirrorY >= 0 && mirrorY < h) {
        out[mirrorY][x] = grid[y][x];
      }
    }
  }
  return out;
}

export function rotateGridOrthogonal(
  grid: (string | null)[][],
  angle: 90 | -90 | 180,
  selection?: SelectionArea | null
): (string | null)[][] {
  const h = grid.length;
  const w = grid[0]?.length || 0;
  const b = computeGridContentBounds(grid, selection);
  if (b.empty) return grid.map((r) => [...r]);

  const out = selection && selection.active
    ? grid.map((row, y) =>
        row.map((c, x) =>
          x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY ? null : c
        )
      )
    : createEmpty(w, h);

  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;

  for (let y = b.minY; y <= b.maxY; y++) {
    for (let x = b.minX; x <= b.maxX; x++) {
      const col = grid[y]?.[x];
      if (!col) continue;
      const rx = x - cx;
      const ry = y - cy;
      let nx = x;
      let ny = y;
      if (angle === 90) {
        nx = Math.round(cx - ry);
        ny = Math.round(cy + rx);
      } else if (angle === -90) {
        nx = Math.round(cx + ry);
        ny = Math.round(cy - rx);
      } else {
        nx = Math.round(cx - rx);
        ny = Math.round(cy - ry);
      }
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        out[ny][nx] = col;
      }
    }
  }
  return out;
}

export function centerGridInCanvas(grid: (string | null)[][]): (string | null)[][] {
  const h = grid.length;
  const w = grid[0]?.length || 0;
  const b = computeGridContentBounds(grid);
  if (b.empty) return grid.map((r) => [...r]);

  const targetMinX = Math.floor((w - b.width) / 2);
  const targetMinY = Math.floor((h - b.height) / 2);
  const dx = targetMinX - b.minX;
  const dy = targetMinY - b.minY;
  if (dx === 0 && dy === 0) return grid.map((r) => [...r]);

  const out = createEmpty(w, h);
  for (let y = b.minY; y <= b.maxY; y++) {
    for (let x = b.minX; x <= b.maxX; x++) {
      const col = grid[y][x];
      if (col) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          out[ny][nx] = col;
        }
      }
    }
  }
  return out;
}

export function snapGridContentToGrid(grid: (string | null)[][], step: number = 4): (string | null)[][] {
  const h = grid.length;
  const w = grid[0]?.length || 0;
  const b = computeGridContentBounds(grid);
  if (b.empty) return grid.map((r) => [...r]);
  const snappedX = Math.round(b.minX / step) * step;
  const snappedY = Math.round(b.minY / step) * step;
  const dx = snappedX - b.minX;
  const dy = snappedY - b.minY;
  if (dx === 0 && dy === 0) return grid.map((r) => [...r]);
  const out = createEmpty(w, h);
  for (let y = b.minY; y <= b.maxY; y++) {
    for (let x = b.minX; x <= b.maxX; x++) {
      const col = grid[y][x];
      if (col) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) out[ny][nx] = col;
      }
    }
  }
  return out;
}
