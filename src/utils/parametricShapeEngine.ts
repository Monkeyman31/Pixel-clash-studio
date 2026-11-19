import {
  CustomShapePresetId,
  DitherConfig,
  GradientConfig,
  ParametricShapeObject,
  ShapePatternType,
  ShapeToolConfig,
  ShapeToolKind,
} from '../types';
import { blendHexColors } from './pixelMath';
import {
  DEFAULT_GRADIENT_CONFIG,
  DEFAULT_SHAPE_CONFIG,
  evaluateDitherThreshold,
  sampleGradientColorAt,
} from './toolEngines';

export type ParametricHandleKind =
  | 'move'
  | 'tl'
  | 'tr'
  | 'br'
  | 'bl'
  | 't'
  | 'r'
  | 'b'
  | 'l'
  | 'rotate'
  | 'pivot'
  | 'cr_tl'
  | 'cr_tr'
  | 'cr_br'
  | 'cr_bl'
  | 'arc_start'
  | 'arc_end'
  | 'poly_inner'
  | 'poly_round'
  | 'star_depth'
  | 'star_twist'
  | 'arrow_head'
  | 'arrow_curve';

export interface ParametricHandlePoint {
  kind: ParametricHandleKind;
  x: number; // canvas coords
  y: number;
  label: string;
  accent?: 'primary' | 'amber' | 'cyan' | 'emerald' | 'rose';
}

export const SHAPE_KIND_LABELS: Record<ShapeToolKind, string> = {
  rectangle: 'Rectángulo',
  ellipse: 'Elipse',
  polygon: 'Polígono',
  star: 'Estrella',
  arrow: 'Flecha',
  custom: 'Forma Personalizada',
};

export const CUSTOM_SHAPE_PRESETS: { id: CustomShapePresetId; label: string }[] = [
  { id: 'heart', label: 'Corazón' },
  { id: 'shield', label: 'Escudo' },
  { id: 'bolt', label: 'Rayo' },
  { id: 'cloud', label: 'Nube' },
  { id: 'speech', label: 'Bocadillo' },
  { id: 'cross', label: 'Cruz' },
  { id: 'diamond', label: 'Rombo' },
  { id: 'capsule', label: 'Cápsula' },
];

export function createParametricShapeFromDrag(
  kind: ShapeToolKind,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  cfg: ShapeToolConfig,
  primaryColor: string,
  secondaryColor: string,
  opacity: number = 1
): ParametricShapeObject {
  const minX = Math.min(x0, x1);
  const minY = Math.min(y0, y1);
  const w = Math.max(2, Math.abs(x1 - x0) + 1);
  const h = Math.max(2, Math.abs(y1 - y0) + 1);
  const baseRadius = cfg.roundedCorners ? Math.max(0, cfg.cornerRadius || 0) : 0;
  const radii: [number, number, number, number] =
    cfg.independentCorners && cfg.cornerRadii
      ? [...cfg.cornerRadii]
      : [baseRadius, baseRadius, baseRadius, baseRadius];

  return {
    id: `shape-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: SHAPE_KIND_LABELS[kind],
    kind,
    x: cfg.pixelPerfect ? Math.round(minX) : minX,
    y: cfg.pixelPerfect ? Math.round(minY) : minY,
    width: cfg.pixelPerfect ? Math.max(2, Math.round(w)) : w,
    height: cfg.pixelPerfect ? Math.max(2, Math.round(h)) : h,
    rotation: 0,
    skewX: 0,
    skewY: 0,
    pivotX: 0.5,
    pivotY: 0.5,
    cornerRadius: baseRadius,
    independentCorners: Boolean(cfg.independentCorners),
    cornerRadii: radii,
    bevel: cfg.bevel ?? 0,
    arcStartDeg: cfg.arcStartDeg ?? 0,
    arcSweepPct: cfg.arcSweepPct ?? 100,
    arcType: cfg.arcType ?? 'full',
    sides: Math.max(3, Math.min(24, cfg.sides ?? 6)),
    innerRadiusRatio: Math.max(0.15, Math.min(1, cfg.innerRadiusRatio ?? 1)),
    vertexRoundness: Math.max(0, Math.min(1, cfg.vertexRoundness ?? 0)),
    starPoints: Math.max(3, Math.min(24, cfg.starPoints ?? 5)),
    starDepth: Math.max(0.15, Math.min(0.95, cfg.starDepth ?? 0.45)),
    starSymmetry: Math.max(-0.5, Math.min(0.5, cfg.starSymmetry ?? 0)),
    arrowShaftWidth: Math.max(0.1, Math.min(0.9, cfg.arrowShaftWidth ?? 0.38)),
    arrowHeadSize: Math.max(0.15, Math.min(0.85, cfg.arrowHeadSize ?? 0.36)),
    arrowHeadType: cfg.arrowHeadType ?? 'triangle',
    arrowCurvature: Math.max(-1, Math.min(1, cfg.arrowCurvature ?? 0)),
    customPreset: cfg.customPreset ?? 'heart',
    fillColor: primaryColor,
    secondaryColor,
    strokeColor: primaryColor,
    filled: cfg.filled,
    fillMode: cfg.fillMode,
    strokeEnabled: cfg.strokeEnabled,
    strokeWidth: Math.max(1, cfg.strokeWidth ?? 1),
    innerStroke: cfg.innerStroke,
    innerStrokeWidth: Math.max(1, cfg.innerStrokeWidth ?? 1),
    outerStroke: cfg.outerStroke,
    outerStrokeWidth: Math.max(1, cfg.outerStrokeWidth ?? 1),
    opacity: Math.max(0.05, Math.min(1, cfg.opacity ?? opacity)),
    antiAlias: cfg.antiAlias,
    pixelPerfect: cfg.pixelPerfect,
    pattern: cfg.pattern,
    useDither: cfg.useDither,
    useGradient: cfg.useGradient,
  };
}

// =========================================================================
// 1. COORDINATE TRANSFORMS (Scale, Rotate, Skew, Distort)
// =========================================================================

function applyCornerDistortNorm(
  u: number,
  v: number,
  w: number,
  h: number,
  offsets?: ParametricShapeObject['cornerOffsets']
): { x: number; y: number } {
  const baseX = u * w;
  const baseY = v * h;
  if (!offsets) return { x: baseX, y: baseY };
  const [tl, tr, br, bl] = offsets;
  const dx =
    (1 - u) * (1 - v) * tl.dx +
    u * (1 - v) * tr.dx +
    u * v * br.dx +
    (1 - u) * v * bl.dx;
  const dy =
    (1 - u) * (1 - v) * tl.dy +
    u * (1 - v) * tr.dy +
    u * v * br.dy +
    (1 - u) * v * bl.dy;
  return { x: baseX + dx, y: baseY + dy };
}

/**
 * Transforms normalized shape coordinates u,v in [0..1] into canvas space.
 */
export function shapeNormToCanvas(
  shape: ParametricShapeObject,
  u: number,
  v: number
): { x: number; y: number } {
  const w = Math.max(1, shape.width);
  const h = Math.max(1, shape.height);
  const distorted = applyCornerDistortNorm(u, v, w, h, shape.cornerOffsets);

  const px = shape.pivotX * w;
  const py = shape.pivotY * h;
  let lx = distorted.x - px;
  let ly = distorted.y - py;

  // Apply skew (degrees)
  const tanX = Math.tan(((shape.skewX || 0) * Math.PI) / 180);
  const tanY = Math.tan(((shape.skewY || 0) * Math.PI) / 180);
  const sx = lx + tanX * ly;
  const sy = ly + tanY * lx;

  // Apply rotation
  const rad = ((shape.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rx = sx * cos - sy * sin;
  const ry = sx * sin + sy * cos;

  return {
    x: shape.x + px + rx,
    y: shape.y + py + ry,
  };
}

/**
 * Inverse maps a canvas pixel (cx, cy) back to shape-local pixel space (lx in [0..w], ly in [0..h]).
 * Uses Newton refinement when cornerOffsets are present for exact bilinear distort inversion.
 */
export function canvasToShapeLocal(
  shape: ParametricShapeObject,
  cx: number,
  cy: number
): { lx: number; ly: number } {
  const w = Math.max(1, shape.width);
  const h = Math.max(1, shape.height);
  const px = shape.pivotX * w;
  const py = shape.pivotY * h;

  const dx = cx - (shape.x + px);
  const dy = cy - (shape.y + py);

  // Inverse rotation
  const rad = -((shape.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rx = dx * cos - dy * sin;
  const ry = dx * sin + dy * cos;

  // Inverse skew: [1, tanX; tanY, 1]
  const tanX = Math.tan(((shape.skewX || 0) * Math.PI) / 180);
  const tanY = Math.tan(((shape.skewY || 0) * Math.PI) / 180);
  const det = 1 - tanX * tanY;
  const invDet = Math.abs(det) < 0.001 ? 1 : 1 / det;
  const ux = (rx - tanX * ry) * invDet + px;
  const uy = (ry - tanY * rx) * invDet + py;

  if (!shape.cornerOffsets) {
    return { lx: ux, ly: uy };
  }

  // Check if any offset is non-zero
  const hasDistort = shape.cornerOffsets.some(
    (o) => Math.abs(o.dx) > 0.01 || Math.abs(o.dy) > 0.01
  );
  if (!hasDistort) return { lx: ux, ly: uy };

  // 4 iterations of Newton-Raphson for exact bilinear inverse
  let u = ux / w;
  let v = uy / h;
  const [tl, tr, br, bl] = shape.cornerOffsets;
  for (let iter = 0; iter < 5; iter++) {
    const p = applyCornerDistortNorm(u, v, w, h, shape.cornerOffsets);
    const ex = p.x - ux;
    const ey = p.y - uy;
    if (Math.abs(ex) < 0.01 && Math.abs(ey) < 0.01) break;
    const dxdU = w + (1 - v) * (tr.dx - tl.dx) + v * (br.dx - bl.dx);
    const dxdV = (1 - u) * (bl.dx - tl.dx) + u * (br.dx - tr.dx);
    const dydU = (1 - v) * (tr.dy - tl.dy) + v * (br.dy - bl.dy);
    const dydV = h + (1 - u) * (bl.dy - tl.dy) + u * (br.dy - tr.dy);
    const jDet = dxdU * dydV - dxdV * dydU;
    if (Math.abs(jDet) < 0.0001) break;
    u -= (ex * dydV - ey * dxdV) / jDet;
    v -= (dxdU * ey - dydU * ex) / jDet;
  }
  return { lx: u * w, ly: v * h };
}

// =========================================================================
// 2. 2D SIGNED DISTANCE FUNCTIONS (All 6 Parametric Shape Families)
// =========================================================================

function distToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const lenSq = vx * vx + vy * vy;
  const t = lenSq < 1e-6 ? 0 : Math.max(0, Math.min(1, (wx * vx + wy * vy) / lenSq));
  const dx = px - (ax + t * vx);
  const dy = py - (ay + t * vy);
  return Math.hypot(dx, dy);
}

function sdPolygon(px: number, py: number, verts: { x: number; y: number }[]): number {
  const n = verts.length;
  if (n < 3) return 9999;
  let minDistSq = Infinity;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = verts[i].x;
    const yi = verts[i].y;
    const xj = verts[j].x;
    const yj = verts[j].y;

    const d = distToSegment(px, py, xj, yj, xi, yi);
    if (d * d < minDistSq) minDistSq = d * d;

    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  const dist = Math.sqrt(minDistSq);
  return inside ? -dist : dist;
}

function sdRoundedRect(
  px: number,
  py: number,
  hw: number,
  hh: number,
  radii: [number, number, number, number],
  bevel: number
): number {
  // Quadrant corner radius selection: TL (-,-), TR (+,-), BR (+,+), BL (-,+)
  const rawR =
    px < 0
      ? py < 0
        ? radii[0]
        : radii[3]
      : py < 0
      ? radii[1]
      : radii[2];
  const r = Math.max(0, Math.min(rawR, hw, hh));

  if (bevel > 0 && r <= 0.1) {
    const b = Math.min(bevel, hw, hh);
    const ax = Math.abs(px);
    const ay = Math.abs(py);
    const boxD = Math.max(ax - hw, ay - hh);
    const bevelD = (ax - (hw - b) + (ay - (hh - b)) - b) / Math.SQRT2;
    return Math.max(boxD, bevelD);
  }

  const qx = Math.abs(px) - (hw - r);
  const qy = Math.abs(py) - (hh - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

function sdEllipseWithArc(
  px: number,
  py: number,
  rx: number,
  ry: number,
  arcStartDeg: number,
  arcSweepPct: number,
  arcType: ParametricShapeObject['arcType']
): number {
  const safeRx = Math.max(0.5, rx);
  const safeRy = Math.max(0.5, ry);
  const nx = px / safeRx;
  const ny = py / safeRy;
  const normDist = Math.hypot(nx, ny);
  // Pixel-scaled approximate ellipse SDF
  const ellipseD = (normDist - 1) * Math.min(safeRx, safeRy);

  if (arcType === 'full' || arcSweepPct >= 99.5) {
    return ellipseD;
  }

  const sweepRad = (Math.max(5, Math.min(100, arcSweepPct)) / 100) * Math.PI * 2;
  const startRad = ((arcStartDeg - 90) * Math.PI) / 180;
  let angle = Math.atan2(ny, nx) - startRad;
  while (angle < 0) angle += Math.PI * 2;
  while (angle >= Math.PI * 2) angle -= Math.PI * 2;

  const endRad = startRad + sweepRad;
  const ax = Math.cos(startRad) * safeRx;
  const ay = Math.sin(startRad) * safeRy;
  const bx = Math.cos(endRad) * safeRx;
  const by = Math.sin(endRad) * safeRy;

  if (arcType === 'open') {
    if (angle <= sweepRad) {
      return Math.abs(ellipseD);
    }
    return Math.min(Math.hypot(px - ax, py - ay), Math.hypot(px - bx, py - by));
  }

  if (arcType === 'pie') {
    const insideWedge = angle <= sweepRad;
    if (insideWedge && ellipseD <= 0) {
      const d1 = distToSegment(px, py, 0, 0, ax, ay);
      const d2 = distToSegment(px, py, 0, 0, bx, by);
      return -Math.min(-ellipseD, d1, d2);
    }
    if (insideWedge) {
      return ellipseD;
    }
    const d1 = distToSegment(px, py, 0, 0, ax, ay);
    const d2 = distToSegment(px, py, 0, 0, bx, by);
    return Math.min(d1, d2);
  }

  // Chord
  const chordCross = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
  const dChord = distToSegment(px, py, ax, ay, bx, by);
  const insideChordSide = sweepRad <= Math.PI ? chordCross >= 0 : chordCross >= 0 || angle <= sweepRad;
  if (ellipseD <= 0 && insideChordSide) {
    return -Math.min(-ellipseD, dChord);
  }
  if (insideChordSide) return ellipseD;
  return Math.max(dChord, ellipseD);
}

function buildPolygonOrStarVertices(
  shape: ParametricShapeObject,
  rx: number,
  ry: number
): { x: number; y: number }[] {
  const verts: { x: number; y: number }[] = [];
  if (shape.kind === 'polygon') {
    const sides = Math.max(3, Math.min(24, Math.round(shape.sides || 6)));
    const inner = Math.max(0.15, Math.min(1, shape.innerRadiusRatio ?? 1));
    if (inner < 0.99) {
      const total = sides * 2;
      for (let i = 0; i < total; i++) {
        const angle = -Math.PI / 2 + (i * Math.PI * 2) / total;
        const mult = i % 2 === 0 ? 1 : inner;
        verts.push({
          x: Math.cos(angle) * rx * mult,
          y: Math.sin(angle) * ry * mult,
        });
      }
    } else {
      for (let i = 0; i < sides; i++) {
        const angle = -Math.PI / 2 + (i * Math.PI * 2) / sides;
        verts.push({
          x: Math.cos(angle) * rx,
          y: Math.sin(angle) * ry,
        });
      }
    }
    return verts;
  }

  // Star
  const pts = Math.max(3, Math.min(24, Math.round(shape.starPoints || 5)));
  const depth = Math.max(0.15, Math.min(0.95, shape.starDepth ?? 0.45));
  const twist = Math.max(-0.5, Math.min(0.5, shape.starSymmetry ?? 0)) * (Math.PI / pts);
  for (let i = 0; i < pts * 2; i++) {
    const baseAngle = -Math.PI / 2 + (i * Math.PI) / pts;
    const isOuter = i % 2 === 0;
    const angle = isOuter ? baseAngle : baseAngle + twist;
    const mult = isOuter ? 1 : depth;
    verts.push({
      x: Math.cos(angle) * rx * mult,
      y: Math.sin(angle) * ry * mult,
    });
  }
  return verts;
}

function sdArrow(
  px: number,
  py: number,
  hw: number,
  hh: number,
  shape: ParametricShapeObject
): number {
  const length = Math.max(2, hw * 2);
  const headLen = Math.max(1.5, Math.min(length * 0.85, length * (shape.arrowHeadSize ?? 0.36)));
  const halfShaft = Math.max(0.6, hh * (shape.arrowShaftWidth ?? 0.38));
  const curve = Math.max(-1, Math.min(1, shape.arrowCurvature ?? 0));
  const headType = shape.arrowHeadType || 'triangle';

  // Apply gentle parabolic curvature offset along Y as a function of X
  const t = Math.max(-1, Math.min(1, px / Math.max(1, hw)));
  const bendOffset = curve * hh * 0.65 * (1 - t * t);
  const cy = py - bendOffset;

  if (headType === 'open') {
    const dShaft = distToSegment(px, cy, -hw, 0, hw - 0.5, 0) - Math.max(0.5, halfShaft * 0.45);
    const dTop = distToSegment(px, cy, hw - headLen, -hh, hw, 0) - Math.max(0.5, halfShaft * 0.45);
    const dBot = distToSegment(px, cy, hw - headLen, hh, hw, 0) - Math.max(0.5, halfShaft * 0.45);
    return Math.min(dShaft, dTop, dBot);
  }

  if (headType === 'double') {
    const hL = Math.min(headLen, hw * 0.72);
    const verts = [
      { x: -hw, y: 0 },
      { x: -hw + hL, y: -hh },
      { x: -hw + hL, y: -halfShaft },
      { x: hw - hL, y: -halfShaft },
      { x: hw - hL, y: -hh },
      { x: hw, y: 0 },
      { x: hw - hL, y: hh },
      { x: hw - hL, y: halfShaft },
      { x: -hw + hL, y: halfShaft },
      { x: -hw + hL, y: hh },
    ];
    return sdPolygon(px, cy, verts);
  }

  if (headType === 'diamond') {
    const neckX = hw - headLen;
    const midX = hw - headLen * 0.48;
    const verts = [
      { x: -hw, y: -halfShaft },
      { x: neckX, y: -halfShaft },
      { x: midX, y: -hh },
      { x: hw, y: 0 },
      { x: midX, y: hh },
      { x: neckX, y: halfShaft },
      { x: -hw, y: halfShaft },
    ];
    return sdPolygon(px, cy, verts);
  }

  if (headType === 'stealth') {
    const neckX = hw - headLen * 0.72;
    const wingX = hw - headLen;
    const verts = [
      { x: -hw, y: -halfShaft },
      { x: neckX, y: -halfShaft },
      { x: wingX, y: -hh },
      { x: hw, y: 0 },
      { x: wingX, y: hh },
      { x: neckX, y: halfShaft },
      { x: -hw, y: halfShaft },
    ];
    return sdPolygon(px, cy, verts);
  }

  // Standard triangle head
  const neckX = hw - headLen;
  const verts = [
    { x: -hw, y: -halfShaft },
    { x: neckX, y: -halfShaft },
    { x: neckX, y: -hh },
    { x: hw, y: 0 },
    { x: neckX, y: hh },
    { x: neckX, y: halfShaft },
    { x: -hw, y: halfShaft },
  ];
  return sdPolygon(px, cy, verts);
}

function sdCustomPreset(
  px: number,
  py: number,
  hw: number,
  hh: number,
  preset: CustomShapePresetId
): number {
  const s = Math.min(hw, hh);
  const nx = px / Math.max(0.5, hw);
  const ny = py / Math.max(0.5, hh);

  switch (preset) {
    case 'diamond':
      return sdPolygon(px, py, [
        { x: 0, y: -hh },
        { x: hw, y: 0 },
        { x: 0, y: hh },
        { x: -hw, y: 0 },
      ]);
    case 'cross': {
      const armW = hw * 0.36;
      const armH = hh * 0.36;
      const dV = sdRoundedRect(px, py, armW, hh, [0, 0, 0, 0], 0);
      const dH = sdRoundedRect(px, py, hw, armH, [0, 0, 0, 0], 0);
      return Math.min(dV, dH);
    }
    case 'capsule': {
      const r = Math.min(hw, hh);
      return sdRoundedRect(px, py, hw, hh, [r, r, r, r], 0);
    }
    case 'shield':
      return sdPolygon(px, py, [
        { x: 0, y: -hh },
        { x: hw * 0.92, y: -hh * 0.68 },
        { x: hw * 0.85, y: hh * 0.18 },
        { x: hw * 0.45, y: hh * 0.72 },
        { x: 0, y: hh },
        { x: -hw * 0.45, y: hh * 0.72 },
        { x: -hw * 0.85, y: hh * 0.18 },
        { x: -hw * 0.92, y: -hh * 0.68 },
      ]);
    case 'bolt':
      return sdPolygon(px, py, [
        { x: hw * 0.18, y: -hh },
        { x: -hw * 0.65, y: hh * 0.08 },
        { x: -hw * 0.05, y: hh * 0.08 },
        { x: -hw * 0.28, y: hh },
        { x: hw * 0.68, y: -hh * 0.12 },
        { x: hw * 0.08, y: -hh * 0.12 },
      ]);
    case 'speech': {
      const bubbleH = hh * 0.72;
      const dBox = sdRoundedRect(
        px,
        py + hh * 0.2,
        hw,
        bubbleH,
        [s * 0.35, s * 0.35, s * 0.35, s * 0.35],
        0
      );
      const dTail = sdPolygon(px, py, [
        { x: -hw * 0.35, y: hh * 0.45 },
        { x: -hw * 0.05, y: hh * 0.45 },
        { x: -hw * 0.55, y: hh },
      ]);
      return Math.min(dBox, dTail);
    }
    case 'cloud': {
      const c1 = Math.hypot((nx + 0.42) * hw, (ny - 0.12) * hh) - s * 0.46;
      const c2 = Math.hypot((nx - 0.42) * hw, (ny - 0.12) * hh) - s * 0.46;
      const c3 = Math.hypot((nx - 0.05) * hw, (ny + 0.24) * hh) - s * 0.56;
      const base = sdRoundedRect(px, py - hh * 0.22, hw * 0.72, hh * 0.32, [s * 0.2, s * 0.2, s * 0.2, s * 0.2], 0);
      return Math.min(c1, c2, c3, base);
    }
    case 'heart':
    default: {
      // Smooth symmetric heart implicit field mapped to approximate pixel distance
      const hx = Math.abs(nx) * 1.15;
      const hy = (-ny + 0.15) * 1.15;
      const v = Math.pow(hx * hx + hy * hy - 0.72, 3) - hx * hx * hy * hy * hy * 1.15;
      const approx = Math.cbrt(v) * s * 0.75;
      return approx;
    }
  }
}

/**
 * Evaluates signed distance (negative = inside, 0 = contour, positive = outside)
 * at local shape coordinate (lx, ly) where center is (w/2, h/2).
 */
export function evaluateParametricShapeSDF(
  shape: ParametricShapeObject,
  lx: number,
  ly: number
): number {
  const hw = Math.max(0.5, shape.width / 2);
  const hh = Math.max(0.5, shape.height / 2);
  const px = lx - hw;
  const py = ly - hh;

  switch (shape.kind) {
    case 'rectangle': {
      const radii: [number, number, number, number] = shape.independentCorners
        ? shape.cornerRadii
        : [shape.cornerRadius, shape.cornerRadius, shape.cornerRadius, shape.cornerRadius];
      return sdRoundedRect(px, py, hw, hh, radii, shape.bevel || 0);
    }
    case 'ellipse':
      return sdEllipseWithArc(
        px,
        py,
        hw,
        hh,
        shape.arcStartDeg ?? 0,
        shape.arcSweepPct ?? 100,
        shape.arcType ?? 'full'
      );
    case 'polygon': {
      const roundAmt = Math.max(0, Math.min(1, shape.vertexRoundness || 0)) * Math.min(hw, hh) * 0.42;
      const verts = buildPolygonOrStarVertices(shape, Math.max(0.5, hw - roundAmt), Math.max(0.5, hh - roundAmt));
      return sdPolygon(px, py, verts) - roundAmt;
    }
    case 'star': {
      const verts = buildPolygonOrStarVertices(shape, hw, hh);
      return sdPolygon(px, py, verts);
    }
    case 'arrow':
      return sdArrow(px, py, hw, hh, shape);
    case 'custom':
    default:
      return sdCustomPreset(px, py, hw, hh, shape.customPreset || 'heart');
  }
}

// =========================================================================
// 3. INTERACTIVE ON-CANVAS MANIPULATOR HANDLES & HIT TESTING
// =========================================================================

export function getParametricShapeHandles(shape: ParametricShapeObject): ParametricHandlePoint[] {
  const handles: ParametricHandlePoint[] = [];
  const w = Math.max(1, shape.width);
  const h = Math.max(1, shape.height);

  // Unified Transform Handles (Corners, Sides, Rotate, Pivot)
  const tl = shapeNormToCanvas(shape, 0, 0);
  const tr = shapeNormToCanvas(shape, 1, 0);
  const br = shapeNormToCanvas(shape, 1, 1);
  const bl = shapeNormToCanvas(shape, 0, 1);
  const t = shapeNormToCanvas(shape, 0.5, 0);
  const r = shapeNormToCanvas(shape, 1, 0.5);
  const b = shapeNormToCanvas(shape, 0.5, 1);
  const l = shapeNormToCanvas(shape, 0, 0.5);
  const pivot = shapeNormToCanvas(shape, shape.pivotX, shape.pivotY);

  // Rotation handle slightly above top center along local -Y axis
  const topOut = shapeNormToCanvas(shape, 0.5, -Math.max(0.18, 4.5 / Math.max(6, h)));

  handles.push(
    { kind: 'tl', x: tl.x, y: tl.y, label: 'Escalar / Ctrl: Distorsionar' },
    { kind: 'tr', x: tr.x, y: tr.y, label: 'Escalar / Ctrl: Distorsionar' },
    { kind: 'br', x: br.x, y: br.y, label: 'Escalar / Ctrl: Distorsionar' },
    { kind: 'bl', x: bl.x, y: bl.y, label: 'Escalar / Ctrl: Distorsionar' },
    { kind: 't', x: t.x, y: t.y, label: 'Altura / Ctrl: Sesgar' },
    { kind: 'r', x: r.x, y: r.y, label: 'Anchura / Ctrl: Sesgar' },
    { kind: 'b', x: b.x, y: b.y, label: 'Altura / Ctrl: Sesgar' },
    { kind: 'l', x: l.x, y: l.y, label: 'Anchura / Ctrl: Sesgar' },
    { kind: 'rotate', x: topOut.x, y: topOut.y, label: 'Rotar (Shift: 15°)', accent: 'amber' },
    { kind: 'pivot', x: pivot.x, y: pivot.y, label: 'Pivote central', accent: 'emerald' }
  );

  // Shape-Specific Manipulator Handles
  if (shape.kind === 'rectangle') {
    const radii = shape.independentCorners
      ? shape.cornerRadii
      : [shape.cornerRadius, shape.cornerRadius, shape.cornerRadius, shape.cornerRadius];
    const maxR = Math.min(w, h) / 2;
    const minInset = Math.min(w, h) * 0.14;
    const insetFor = (val: number) => Math.max(minInset, Math.min(maxR, val + 1.2));

    const rTL = insetFor(radii[0]);
    const rTR = insetFor(radii[1]);
    const rBR = insetFor(radii[2]);
    const rBL = insetFor(radii[3]);

    const pTL = shapeNormToCanvas(shape, rTL / w, rTL / h);
    const pTR = shapeNormToCanvas(shape, 1 - rTR / w, rTR / h);
    const pBR = shapeNormToCanvas(shape, 1 - rBR / w, 1 - rBR / h);
    const pBL = shapeNormToCanvas(shape, rBL / w, 1 - rBL / h);

    handles.push(
      { kind: 'cr_tl', x: pTL.x, y: pTL.y, label: 'Radio esquina SI (Alt: indep.)', accent: 'cyan' },
      { kind: 'cr_tr', x: pTR.x, y: pTR.y, label: 'Radio esquina SD (Alt: indep.)', accent: 'cyan' },
      { kind: 'cr_br', x: pBR.x, y: pBR.y, label: 'Radio esquina ID (Alt: indep.)', accent: 'cyan' },
      { kind: 'cr_bl', x: pBL.x, y: pBL.y, label: 'Radio esquina II (Alt: indep.)', accent: 'cyan' }
    );
  } else if (shape.kind === 'ellipse') {
    const startRad = (((shape.arcStartDeg ?? 0) - 90) * Math.PI) / 180;
    const sweepRad = ((shape.arcSweepPct ?? 100) / 100) * Math.PI * 2;
    const endRad = startRad + sweepRad;
    const pStart = shapeNormToCanvas(shape, 0.5 + Math.cos(startRad) * 0.42, 0.5 + Math.sin(startRad) * 0.42);
    const pEnd = shapeNormToCanvas(shape, 0.5 + Math.cos(endRad) * 0.42, 0.5 + Math.sin(endRad) * 0.42);
    handles.push(
      { kind: 'arc_start', x: pStart.x, y: pStart.y, label: 'Inicio de arco', accent: 'cyan' },
      { kind: 'arc_end', x: pEnd.x, y: pEnd.y, label: 'Apertura de arco (%)', accent: 'rose' }
    );
  } else if (shape.kind === 'polygon') {
    const inner = Math.max(0.15, Math.min(1, shape.innerRadiusRatio ?? 1));
    const round = Math.max(0, Math.min(1, shape.vertexRoundness ?? 0));
    const pInner = shapeNormToCanvas(shape, 0.5 + inner * 0.45, 0.5);
    const pRound = shapeNormToCanvas(shape, 0.5, 0.08 + round * 0.32);
    handles.push(
      { kind: 'poly_inner', x: pInner.x, y: pInner.y, label: 'Radio interno del polígono', accent: 'cyan' },
      { kind: 'poly_round', x: pRound.x, y: pRound.y, label: 'Redondeado de vértices', accent: 'rose' }
    );
  } else if (shape.kind === 'star') {
    const depth = Math.max(0.15, Math.min(0.95, shape.starDepth ?? 0.45));
    const pts = Math.max(3, shape.starPoints || 5);
    const twist = (shape.starSymmetry ?? 0) * (Math.PI / pts);
    const angle = -Math.PI / 2 + Math.PI / pts + twist;
    const pDepth = shapeNormToCanvas(
      shape,
      0.5 + Math.cos(angle) * depth * 0.5,
      0.5 + Math.sin(angle) * depth * 0.5
    );
    const pTwist = shapeNormToCanvas(shape, 0.5 + (shape.starSymmetry ?? 0) * 0.6, 0.86);
    handles.push(
      { kind: 'star_depth', x: pDepth.x, y: pDepth.y, label: 'Profundidad de puntas', accent: 'cyan' },
      { kind: 'star_twist', x: pTwist.x, y: pTwist.y, label: 'Simetría / Giro de estrella', accent: 'rose' }
    );
  } else if (shape.kind === 'arrow') {
    const headFrac = Math.max(0.15, Math.min(0.85, shape.arrowHeadSize ?? 0.36));
    const shaftFrac = Math.max(0.1, Math.min(0.9, shape.arrowShaftWidth ?? 0.38));
    const curve = Math.max(-1, Math.min(1, shape.arrowCurvature ?? 0));
    const pHead = shapeNormToCanvas(shape, 1 - headFrac, 0.5 - shaftFrac * 0.5);
    const pCurve = shapeNormToCanvas(shape, 0.42, 0.5 + curve * 0.32);
    handles.push(
      { kind: 'arrow_head', x: pHead.x, y: pHead.y, label: 'Tamaño de punta / Grosor', accent: 'cyan' },
      { kind: 'arrow_curve', x: pCurve.x, y: pCurve.y, label: 'Curvatura de flecha', accent: 'rose' }
    );
  }

  return handles;
}

export function hitTestParametricShape(
  shape: ParametricShapeObject,
  cx: number,
  cy: number,
  marginPx: number = 1.8
): boolean {
  const { lx, ly } = canvasToShapeLocal(shape, cx, cy);
  if (lx < -marginPx || lx > shape.width + marginPx || ly < -marginPx || ly > shape.height + marginPx) {
    return false;
  }
  const sdf = evaluateParametricShapeSDF(shape, lx, ly);
  return sdf <= marginPx + (shape.outerStroke ? shape.outerStrokeWidth : 0);
}

// =========================================================================
// 4. PIXEL-ART & ANTI-ALIASED RASTERIZER FOR PARAMETRIC SHAPES
// =========================================================================

function evalPatternMask(x: number, y: number, pattern: ShapePatternType): boolean {
  switch (pattern) {
    case 'checker':
      return (x + y) % 2 === 0;
    case 'dots':
      return x % 3 === 0 && y % 3 === 0;
    case 'hlines':
      return y % 2 === 0;
    case 'vlines':
      return x % 2 === 0;
    case 'diagonal':
      return (x - y) % 3 === 0;
    case 'bricks':
      return y % 4 === 0 || (Math.floor(y / 4) % 2 === 0 ? x % 6 === 0 : (x + 3) % 6 === 0);
    default:
      return true;
  }
}

export function rasterizeParametricShapeToGrid(
  shape: ParametricShapeObject,
  targetGrid: (string | null)[][],
  baseGrid: (string | null)[][] | null,
  ditherConfig?: DitherConfig,
  gradientConfig?: GradientConfig,
  activePaletteColors?: string[]
): void {
  const height = targetGrid.length;
  const width = targetGrid[0]?.length || 0;
  if (width === 0 || height === 0) return;

  // Compute tight canvas AABB from transformed bounding corners
  const pad = Math.ceil(
    (shape.strokeEnabled ? shape.strokeWidth : 0) +
      (shape.outerStroke ? shape.outerStrokeWidth : 0) +
      3
  );
  const corners = [
    shapeNormToCanvas(shape, 0, 0),
    shapeNormToCanvas(shape, 1, 0),
    shapeNormToCanvas(shape, 1, 1),
    shapeNormToCanvas(shape, 0, 1),
  ];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const c of corners) {
    if (c.x < minX) minX = c.x;
    if (c.x > maxX) maxX = c.x;
    if (c.y < minY) minY = c.y;
    if (c.y > maxY) maxY = c.y;
  }

  const startX = Math.max(0, Math.floor(minX) - pad);
  const endX = Math.min(width - 1, Math.ceil(maxX) + pad);
  const startY = Math.max(0, Math.floor(minY) - pad);
  const endY = Math.min(height - 1, Math.ceil(maxY) + pad);

  const effGradCfg: GradientConfig = {
    ...(gradientConfig || DEFAULT_GRADIENT_CONFIG),
    type: shape.gradientType || gradientConfig?.type || 'linear',
  };
  const strokeW = shape.strokeEnabled ? Math.max(1, shape.strokeWidth) : 0;
  const innerW = shape.innerStroke ? Math.max(1, shape.innerStrokeWidth) : 0;
  const outerW = shape.outerStroke ? Math.max(1, shape.outerStrokeWidth) : 0;
  const baseOpacity = Math.max(0.05, Math.min(1, shape.opacity ?? 1));

  const gradP0 = shapeNormToCanvas(shape, 0, 0);
  const gradP1 = shapeNormToCanvas(shape, 1, 1);

  const paintCell = (x: number, y: number, col: string, alpha: number) => {
    const finalAlpha = Math.max(0, Math.min(1, alpha * baseOpacity));
    if (finalAlpha <= 0.01) return;
    const prev = targetGrid[y]?.[x] ?? baseGrid?.[y]?.[x] ?? null;
    targetGrid[y][x] = finalAlpha >= 0.995 ? col : blendHexColors(prev, col, finalAlpha);
  };

  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      const sampleX = shape.pixelPerfect ? x + 0.5 : x + 0.5;
      const sampleY = shape.pixelPerfect ? y + 0.5 : y + 0.5;
      const { lx, ly } = canvasToShapeLocal(shape, sampleX, sampleY);
      const d = evaluateParametricShapeSDF(shape, lx, ly);

      // 1. Outer stroke (outside contour: 0 < d <= outerW)
      if (outerW > 0 && d > 0 && d <= outerW + (shape.antiAlias ? 0.5 : 0)) {
        const cov = shape.antiAlias ? Math.max(0, Math.min(1, outerW + 0.5 - d)) : 1;
        paintCell(x, y, shape.secondaryColor || shape.strokeColor, cov);
        continue;
      }

      // 2. Open ellipse arc or standard contour stroke
      const isOpenArc = shape.kind === 'ellipse' && shape.arcType === 'open';
      if (isOpenArc) {
        const halfS = Math.max(0.55, strokeW * 0.55);
        if (d <= halfS + (shape.antiAlias ? 0.5 : 0)) {
          const cov = shape.antiAlias ? Math.max(0, Math.min(1, halfS + 0.5 - d)) : 1;
          paintCell(x, y, shape.strokeColor, cov);
        }
        continue;
      }

      // Main stroke band inside contour (-strokeW <= d <= 0)
      if (strokeW > 0 && d <= (shape.antiAlias ? 0.45 : 0.15) && d >= -strokeW) {
        let cov = 1;
        if (shape.antiAlias && d > -0.5) {
          cov = Math.max(0, Math.min(1, 0.5 - d));
        }
        if (shape.useDither && ditherConfig) {
          const thr = evaluateDitherThreshold(x, y, ditherConfig);
          const pass = ditherConfig.density / 100 >= thr;
          paintCell(x, y, pass ? shape.strokeColor : shape.secondaryColor, cov);
        } else {
          paintCell(x, y, shape.strokeColor, cov);
        }
        continue;
      }

      // 3. Inner stroke band (just inside main stroke)
      if (innerW > 0 && d < -strokeW && d >= -(strokeW + innerW)) {
        paintCell(x, y, shape.secondaryColor || shape.strokeColor, 1);
        continue;
      }

      // 4. Interior fill
      if (shape.filled && d <= (shape.antiAlias ? 0.45 : 0.1)) {
        let cov = 1;
        if (shape.antiAlias && d > -0.5) {
          cov = Math.max(0, Math.min(1, 0.5 - d));
        }

        if (shape.useGradient || shape.fillMode === 'gradient') {
          const col = sampleGradientColorAt(
            x,
            y,
            gradP0.x,
            gradP0.y,
            gradP1.x,
            gradP1.y,
            effGradCfg,
            shape.useDither,
            shape.fillColor,
            shape.secondaryColor,
            activePaletteColors,
            ditherConfig?.customMatrix
          );
          paintCell(x, y, col, cov);
        } else if (shape.fillMode === 'pattern') {
          const hit = evalPatternMask(x, y, shape.pattern);
          paintCell(x, y, hit ? shape.fillColor : shape.secondaryColor, cov);
        } else if (shape.useDither || shape.fillMode === 'dither') {
          const thr = ditherConfig
            ? evaluateDitherThreshold(x, y, ditherConfig)
            : ((x + y) & 1) === 0
            ? 0.25
            : 0.75;
          const density = (ditherConfig?.density ?? 50) / 100;
          const pass = ditherConfig?.invert ? density < thr : density >= thr;
          paintCell(x, y, pass ? shape.fillColor : shape.secondaryColor, cov);
        } else {
          paintCell(x, y, shape.fillColor, cov);
        }
      }
    }
  }
}

export function rasterizeParametricShapesList(
  shapes: ParametricShapeObject[],
  width: number,
  height: number,
  basePixels: (string | null)[][] | null,
  ditherConfig?: DitherConfig,
  gradientConfig?: GradientConfig,
  activePaletteColors?: string[]
): (string | null)[][] {
  const out: (string | null)[][] = basePixels
    ? basePixels.map((row) => [...row])
    : Array.from({ length: height }, () => Array(width).fill(null));
  for (const shape of shapes) {
    rasterizeParametricShapeToGrid(
      shape,
      out,
      basePixels,
      ditherConfig,
      gradientConfig,
      activePaletteColors
    );
  }
  return out;
}

export function syncShapeConfigFromObject(
  prev: ShapeToolConfig,
  shape: ParametricShapeObject
): ShapeToolConfig {
  return {
    ...prev,
    shapeKind: shape.kind,
    roundedCorners: shape.cornerRadius > 0 || shape.independentCorners,
    cornerRadius: shape.cornerRadius,
    independentCorners: shape.independentCorners,
    cornerRadii: [...shape.cornerRadii],
    bevel: shape.bevel,
    filled: shape.filled,
    fillMode: shape.fillMode,
    strokeEnabled: shape.strokeEnabled,
    strokeWidth: shape.strokeWidth,
    innerStroke: shape.innerStroke,
    innerStrokeWidth: shape.innerStrokeWidth,
    outerStroke: shape.outerStroke,
    outerStrokeWidth: shape.outerStrokeWidth,
    antiAlias: shape.antiAlias,
    pixelPerfect: shape.pixelPerfect,
    pattern: shape.pattern,
    useDither: shape.useDither,
    useGradient: shape.useGradient,
    opacity: shape.opacity,
    arcStartDeg: shape.arcStartDeg,
    arcSweepPct: shape.arcSweepPct,
    arcType: shape.arcType,
    sides: shape.sides,
    innerRadiusRatio: shape.innerRadiusRatio,
    vertexRoundness: shape.vertexRoundness,
    starPoints: shape.starPoints,
    starDepth: shape.starDepth,
    starSymmetry: shape.starSymmetry,
    arrowShaftWidth: shape.arrowShaftWidth,
    arrowHeadSize: shape.arrowHeadSize,
    arrowHeadType: shape.arrowHeadType,
    arrowCurvature: shape.arrowCurvature,
    customPreset: shape.customPreset,
  };
}

export function createDefaultShapeConfigPatch(): Partial<ShapeToolConfig> {
  return {
    ...DEFAULT_SHAPE_CONFIG,
    sides: 6,
    innerRadiusRatio: 1,
    vertexRoundness: 0,
    starPoints: 5,
    starDepth: 0.45,
    starSymmetry: 0,
    arcStartDeg: 0,
    arcSweepPct: 100,
    arcType: 'full',
    arrowShaftWidth: 0.38,
    arrowHeadSize: 0.36,
    arrowHeadType: 'triangle',
    arrowCurvature: 0,
    customPreset: 'heart',
    opacity: 1,
    rasterPolicy: 'keep_editable',
  };
}
