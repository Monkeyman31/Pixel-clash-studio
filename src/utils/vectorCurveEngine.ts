import {
  SelectionArea,
  VectorNode,
  VectorNodeType,
  VectorPath,
  VectorSnapPrefs,
  VectorSymmetryMode,
} from '../types';

export interface SampledCurvePoint {
  x: number;
  y: number;
  t: number; // 0..1 normalized along whole path
  segIndex: number;
  segT: number;
  nx: number; // unit normal X
  ny: number; // unit normal Y
  width: number;
}

// =========================================================
// GEOMETRY & CURVE EVALUATION
// =========================================================

export function getEffectiveHandlesForSegment(
  path: VectorPath,
  segIdx: number
): { p0: VectorNode; c1: { x: number; y: number }; c2: { x: number; y: number }; p1: VectorNode } | null {
  const n = path.nodes.length;
  if (n < 2) return null;
  const p0 = path.nodes[segIdx];
  const p1 = path.nodes[(segIdx + 1) % n];
  if (!p0 || !p1) return null;

  // Straight / polyline unless explicitly bent with handles or spline/smooth mode
  const isCurvedMode =
    path.mode === 'bezier' ||
    path.mode === 'spline' ||
    path.mode === 'smooth' ||
    path.mode === 'freehand' ||
    path.smartPixelCurve;

  const hasExplicitOut = p0.outHandleX !== undefined && p0.outHandleY !== undefined;
  const hasExplicitIn = p1.inHandleX !== undefined && p1.inHandleY !== undefined;

  if (hasExplicitOut || hasExplicitIn) {
    return {
      p0,
      c1: {
        x: p0.outHandleX ?? p0.x + (p1.x - p0.x) * 0.33,
        y: p0.outHandleY ?? p0.y + (p1.y - p0.y) * 0.33,
      },
      c2: {
        x: p1.inHandleX ?? p0.x + (p1.x - p0.x) * 0.66,
        y: p1.inHandleY ?? p0.y + (p1.y - p0.y) * 0.66,
      },
      p1,
    };
  }

  if (!isCurvedMode || (path.tension === 0 && path.smoothing === 0)) {
    return {
      p0,
      c1: { x: p0.x + (p1.x - p0.x) / 3, y: p0.y + (p1.y - p0.y) / 3 },
      c2: { x: p0.x + ((p1.x - p0.x) * 2) / 3, y: p0.y + ((p1.y - p0.y) * 2) / 3 },
      p1,
    };
  }

  // Catmull-Rom / Smooth tangent synthesis from neighboring nodes
  const prevIdx = segIdx === 0 ? (path.closed ? n - 1 : 0) : segIdx - 1;
  const nextIdx = (segIdx + 2) % n;
  const prevNode = path.nodes[prevIdx] || p0;
  const nextNode = segIdx + 2 >= n && !path.closed ? p1 : path.nodes[nextIdx] || p1;

  const factor = Math.max(0.05, Math.min(0.65, 0.16 + path.smoothing * 0.22 + (1 - path.tension) * 0.14));
  const c1x = p0.x + (p1.x - prevNode.x) * factor;
  const c1y = p0.y + (p1.y - prevNode.y) * factor;
  const c2x = p1.x - (nextNode.x - p0.x) * factor;
  const c2y = p1.y - (nextNode.y - p0.y) * factor;

  return {
    p0,
    c1: { x: c1x, y: c1y },
    c2: { x: c2x, y: c2y },
    p1,
  };
}

export function evaluateCubicBezier(
  p0: { x: number; y: number },
  c1: { x: number; y: number },
  c2: { x: number; y: number },
  p1: { x: number; y: number },
  t: number
): { x: number; y: number; dx: number; dy: number } {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  const x = mt2 * mt * p0.x + 3 * mt2 * t * c1.x + 3 * mt * t2 * c2.x + t2 * t * p1.x;
  const y = mt2 * mt * p0.y + 3 * mt2 * t * c1.y + 3 * mt * t2 * c2.y + t2 * t * p1.y;
  const dx =
    3 * mt2 * (c1.x - p0.x) + 6 * mt * t * (c2.x - c1.x) + 3 * t2 * (p1.x - c2.x);
  const dy =
    3 * mt2 * (c1.y - p0.y) + 6 * mt * t * (c2.y - c1.y) + 3 * t2 * (p1.y - c2.y);
  return { x, y, dx, dy };
}

/**
 * Sample a VectorPath densely along all segments, computing width profile & normals.
 */
export function sampleVectorPath(path: VectorPath): SampledCurvePoint[] {
  const n = path.nodes.length;
  if (n === 0) return [];
  if (n === 1) {
    return [
      {
        x: path.nodes[0].x,
        y: path.nodes[0].y,
        t: 0,
        segIndex: 0,
        segT: 0,
        nx: 0,
        ny: -1,
        width: path.nodes[0].width ?? path.strokeWidth,
      },
    ];
  }

  const segCount = path.closed ? n : n - 1;
  const rawPts: Omit<SampledCurvePoint, 't'>[] = [];

  for (let s = 0; s < segCount; s++) {
    const seg = getEffectiveHandlesForSegment(path, s);
    if (!seg) continue;
    const approxLen =
      Math.hypot(seg.c1.x - seg.p0.x, seg.c1.y - seg.p0.y) +
      Math.hypot(seg.c2.x - seg.c1.x, seg.c2.y - seg.c1.y) +
      Math.hypot(seg.p1.x - seg.c2.x, seg.p1.y - seg.c2.y);

    const isStraight =
      path.mode === 'straight' ||
      (path.mode === 'polyline' &&
        !path.smartPixelCurve &&
        seg.p0.outHandleX === undefined &&
        seg.p1.inHandleX === undefined);

    const steps = Math.max(isStraight ? Math.ceil(approxLen * 2) : Math.ceil(approxLen * 4), 12);

    // Optional rounded corner radius adjustment when polyline has curveRadius > 0
    for (let i = 0; i <= steps; i++) {
      if (s > 0 && i === 0) continue;
      const t = i / steps;
      const evalPt = evaluateCubicBezier(seg.p0, seg.c1, seg.c2, seg.p1, t);
      const len = Math.hypot(evalPt.dx, evalPt.dy) || 1;
      const nx = -evalPt.dy / len;
      const ny = evalPt.dx / len;

      let w = path.strokeWidth;
      if (path.widthMode === 'per_segment' && path.segmentWidths && path.segmentWidths[s] !== undefined) {
        w = path.segmentWidths[s];
      } else if (path.widthMode === 'per_node' || path.widthMode === 'variable') {
        const w0 = seg.p0.width ?? path.strokeWidth;
        const w1 = seg.p1.width ?? path.strokeWidth;
        w = w0 + (w1 - w0) * t;
      }

      rawPts.push({
        x: evalPt.x,
        y: evalPt.y,
        segIndex: s,
        segT: t,
        nx,
        ny,
        width: w,
      });
    }
  }

  // Apply corner rounding smoothing pass when curveRadius > 0
  let processed = rawPts;
  if (path.curveRadius > 0 && processed.length > 4) {
    const passes = Math.min(8, Math.ceil(path.curveRadius));
    let cur = processed.map((p) => ({ ...p }));
    for (let pass = 0; pass < passes; pass++) {
      const next = cur.map((p) => ({ ...p }));
      for (let i = 1; i < cur.length - 1; i++) {
        next[i].x = cur[i - 1].x * 0.25 + cur[i].x * 0.5 + cur[i + 1].x * 0.25;
        next[i].y = cur[i - 1].y * 0.25 + cur[i].y * 0.5 + cur[i + 1].y * 0.25;
      }
      cur = next;
    }
    processed = cur;
  }

  const total = Math.max(1, processed.length - 1);
  return processed.map((pt, idx) => {
    const t = idx / total;
    const mult = getProfileWidthMultiplier(path, t, pt.nx, pt.ny);
    return {
      ...pt,
      t,
      width: Math.max(0.5, pt.width * mult),
    };
  });
}

function getProfileWidthMultiplier(path: VectorPath, t: number, nx: number, ny: number): number {
  switch (path.profile) {
    case 'tapered': {
      // Smooth sine taper from 0.2 -> 1.0 -> 0.2
      return 0.2 + 0.8 * Math.sin(Math.PI * t);
    }
    case 'calligraphic': {
      // Nib angled at 45 deg
      const angleFactor = Math.abs(nx * 0.707 + ny * 0.707);
      return 0.45 + 0.85 * angleFactor;
    }
    case 'custom': {
      const stops = path.customProfileStops && path.customProfileStops.length >= 2
        ? path.customProfileStops
        : [0.3, 1.0, 0.3];
      const scaled = t * (stops.length - 1);
      const i0 = Math.floor(scaled);
      const i1 = Math.min(stops.length - 1, i0 + 1);
      const f = scaled - i0;
      return stops[i0] + (stops[i1] - stops[i0]) * f;
    }
    default:
      return 1;
  }
}

/**
 * Clean diagonal 1px pixel-art points by stripping accidental L-corner doubles (Pixel Perfect).
 */
function stripPixelPerfectDoubles(pts: { x: number; y: number; width: number; nx: number; ny: number }[]) {
  if (pts.length < 3) return pts;
  const deduped: typeof pts = [];
  for (const p of pts) {
    const last = deduped[deduped.length - 1];
    if (!last || last.x !== p.x || last.y !== p.y) {
      deduped.push(p);
    }
  }
  if (deduped.length < 3) return deduped;

  const cleaned: typeof pts = [deduped[0]];
  for (let i = 1; i < deduped.length - 1; i++) {
    const prev = cleaned[cleaned.length - 1];
    const curr = deduped[i];
    const next = deduped[i + 1];

    const isOrthogonalCorner =
      prev.x !== next.x &&
      prev.y !== next.y &&
      ((prev.x === curr.x && next.y === curr.y) || (prev.y === curr.y && next.x === curr.x));

    if (!isOrthogonalCorner) {
      cleaned.push(curr);
    }
  }
  cleaned.push(deduped[deduped.length - 1]);
  return cleaned;
}

/**
 * Rasterize a VectorPath cleanly onto an existing pixel grid (supports Pixel Perfect, Smart Pixel Curve,
 * Uniform/Variable/Per-node/Per-segment thickness, Profiles, Caps, Joins, and Symmetry).
 */
export function rasterizeVectorPath(
  path: VectorPath,
  width: number,
  height: number,
  grid: (string | null)[][],
  symmetry: VectorSymmetryMode = 'none',
  customAxis?: { x: number; y: number }
): void {
  const samples = sampleVectorPath(path);
  if (samples.length === 0) return;

  // Optional filled closed shape mode
  if (path.closed && path.fillColor) {
    fillSampledPolygon(samples, path.fillColor, width, height, grid);
  }

  const stampPixel = (px: number, py: number, col: string) => {
    const paintSingle = (gx: number, gy: number) => {
      if (gx >= 0 && gx < width && gy >= 0 && gy < height) {
        grid[gy][gx] = col;
      }
    };
    paintSingle(px, py);

    const axX = customAxis?.x ?? Math.floor(width / 2);
    const axY = customAxis?.y ?? Math.floor(height / 2);

    if (symmetry === 'horizontal' || symmetry === 'radial' || symmetry === 'custom') {
      paintSingle(Math.round(2 * axX - px), py);
    }
    if (symmetry === 'vertical' || symmetry === 'radial') {
      paintSingle(px, Math.round(2 * axY - py));
    }
    if (symmetry === 'radial') {
      paintSingle(Math.round(2 * axX - px), Math.round(2 * axY - py));
    }
  };

  const stampNib = (cx: number, cy: number, strokeW: number, idx: number, totalPts: number) => {
    const size = Math.max(1, Math.round(strokeW));
    if (size === 1) {
      stampPixel(cx, cy, path.color);
      return;
    }

    const isEndpoint = !path.closed && (idx === 0 || idx === totalPts - 1);
    const half = (size - 1) / 2;
    const minOff = -Math.floor(half);
    const maxOff = Math.ceil(half);

    // Round/square/butt cap & profile shaping
    const useCircleShape =
      path.profile === 'round' ||
      (isEndpoint && path.capStyle === 'round') ||
      path.joinStyle === 'round';

    const radius = size / 2;

    for (let dy = minOff; dy <= maxOff; dy++) {
      for (let dx = minOff; dx <= maxOff; dx++) {
        if (path.profile === 'calligraphic') {
          if (Math.abs(dx + dy) > Math.max(0.7, size * 0.36)) continue;
        } else if (useCircleShape) {
          if (Math.hypot(dx, dy) > radius + 0.15) continue;
        } else if (path.joinStyle === 'bevel' && Math.abs(dx) + Math.abs(dy) > size * 0.78) {
          continue;
        }
        stampPixel(cx + dx, cy + dy, path.color);
      }
    }
  };

  // Convert dense samples into integer pixel trace
  const intTrace: { x: number; y: number; width: number; nx: number; ny: number }[] = [];
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const gx = Math.round(s.x);
    const gy = Math.round(s.y);
    if (intTrace.length === 0) {
      intTrace.push({ x: gx, y: gy, width: s.width, nx: s.nx, ny: s.ny });
    } else {
      const prev = intTrace[intTrace.length - 1];
      // Fill any gaps with Bresenham steps so continuous lines have zero holes
      let cx = prev.x;
      let cy = prev.y;
      const dx = Math.abs(gx - cx);
      const dy = Math.abs(gy - cy);
      const sx = cx < gx ? 1 : -1;
      const sy = cy < gy ? 1 : -1;
      let err = dx - dy;
      while (cx !== gx || cy !== gy) {
        const e2 = 2 * err;
        if (e2 > -dy) {
          err -= dy;
          cx += sx;
        }
        if (e2 < dx) {
          err += dx;
          cy += sy;
        }
        intTrace.push({ x: cx, y: cy, width: s.width, nx: s.nx, ny: s.ny });
      }
    }
  }

  const finalPts =
    path.pixelPerfect || path.smartPixelCurve || path.profile === 'pixel_perfect'
      ? stripPixelPerfectDoubles(intTrace)
      : intTrace;

  for (let i = 0; i < finalPts.length; i++) {
    const pt = finalPts[i];
    // Butt cap slightly trims exact 1px end cap protrusion on thick strokes
    if (
      path.capStyle === 'butt' &&
      !path.closed &&
      pt.width >= 3 &&
      (i === 0 || i === finalPts.length - 1)
    ) {
      continue;
    }
    stampNib(pt.x, pt.y, pt.width, i, finalPts.length);
  }
}

export function rasterizeVectorPathsToGrid(
  paths: VectorPath[],
  width: number,
  height: number,
  baseGrid?: (string | null)[][] | null
): (string | null)[][] {
  const out = baseGrid
    ? baseGrid.map((r) => [...r])
    : Array.from({ length: height }, () => new Array(width).fill(null));
  for (const p of paths) {
    rasterizeVectorPath(p, width, height, out);
  }
  return out;
}

function fillSampledPolygon(
  samples: SampledCurvePoint[],
  fillColor: string,
  width: number,
  height: number,
  grid: (string | null)[][]
) {
  if (samples.length < 3) return;
  let minY = height;
  let maxY = 0;
  for (const p of samples) {
    const y = Math.floor(p.y);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  minY = Math.max(0, minY);
  maxY = Math.min(height - 1, maxY);

  for (let y = minY; y <= maxY; y++) {
    const sy = y + 0.5;
    const intersections: number[] = [];
    for (let i = 0; i < samples.length; i++) {
      const a = samples[i];
      const b = samples[(i + 1) % samples.length];
      if ((a.y <= sy && b.y > sy) || (b.y <= sy && a.y > sy)) {
        const xInt = a.x + ((sy - a.y) * (b.x - a.x)) / (b.y - a.y);
        intersections.push(xInt);
      }
    }
    intersections.sort((a, b) => a - b);
    for (let k = 0; k + 1 < intersections.length; k += 2) {
      const xStart = Math.max(0, Math.ceil(intersections[k] - 0.5));
      const xEnd = Math.min(width - 1, Math.floor(intersections[k + 1] - 0.5));
      for (let x = xStart; x <= xEnd; x++) {
        grid[y][x] = fillColor;
      }
    }
  }
}

// =========================================================
// INTERACTIVE NODE & SEGMENT MANIPULATION
// =========================================================

export function snapVectorCoord(
  pt: { x: number; y: number },
  snap: VectorSnapPrefs,
  width: number,
  height: number,
  existingNodes: VectorNode[],
  gridStep: number = 4
): { x: number; y: number } {
  let x = pt.x;
  let y = pt.y;

  if (snap.nodes) {
    let bestD = 2.0;
    for (const node of existingNodes) {
      const d = Math.hypot(node.x - x, node.y - y);
      if (d < bestD) {
        bestD = d;
        x = node.x;
        y = node.y;
      }
    }
  }

  if (snap.guides) {
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    if (Math.abs(x - cx) <= 1.2) x = cx;
    if (Math.abs(y - cy) <= 1.2) y = cy;
  }

  if (snap.grid) {
    x = Math.round(x / gridStep) * gridStep;
    y = Math.round(y / gridStep) * gridStep;
  } else if (snap.pixel) {
    x = Math.round(x);
    y = Math.round(y);
  }

  return { x, y };
}

export function hitTestVectorNode(
  path: VectorPath,
  gx: number,
  gy: number,
  radius: number = 1.6
): VectorNode | null {
  for (let i = path.nodes.length - 1; i >= 0; i--) {
    const n = path.nodes[i];
    if (Math.hypot(n.x - gx, n.y - gy) <= radius) return n;
  }
  return null;
}

export function hitTestVectorHandle(
  path: VectorPath,
  gx: number,
  gy: number,
  radius: number = 1.6
): { nodeId: string; kind: 'in' | 'out' } | null {
  for (const n of path.nodes) {
    if (n.inHandleX !== undefined && n.inHandleY !== undefined) {
      if (Math.hypot(n.inHandleX - gx, n.inHandleY - gy) <= radius) {
        return { nodeId: n.id, kind: 'in' };
      }
    }
    if (n.outHandleX !== undefined && n.outHandleY !== undefined) {
      if (Math.hypot(n.outHandleX - gx, n.outHandleY - gy) <= radius) {
        return { nodeId: n.id, kind: 'out' };
      }
    }
  }
  return null;
}

export function hitTestVectorSegment(
  path: VectorPath,
  gx: number,
  gy: number,
  tolerance: number = 1.5
): { segIndex: number; t: number; point: { x: number; y: number } } | null {
  const samples = sampleVectorPath(path);
  let bestDist = tolerance;
  let best: { segIndex: number; t: number; point: { x: number; y: number } } | null = null;
  for (const s of samples) {
    const d = Math.hypot(s.x - gx, s.y - gy);
    if (d < bestDist) {
      bestDist = d;
      best = { segIndex: s.segIndex, t: s.segT, point: { x: s.x, y: s.y } };
    }
  }
  return best;
}

/**
 * Split a segment using De Casteljau's algorithm so adding a node preserves curve shape!
 */
export function splitSegmentAt(path: VectorPath, segIndex: number, t: number): VectorPath {
  const seg = getEffectiveHandlesForSegment(path, segIndex);
  if (!seg) return path;

  const lerp = (a: { x: number; y: number }, b: { x: number; y: number }, u: number) => ({
    x: a.x + (b.x - a.x) * u,
    y: a.y + (b.y - a.y) * u,
  });

  const q0 = lerp(seg.p0, seg.c1, t);
  const q1 = lerp(seg.c1, seg.c2, t);
  const q2 = lerp(seg.c2, seg.p1, t);
  const r0 = lerp(q0, q1, t);
  const r1 = lerp(q1, q2, t);
  const pt = lerp(r0, r1, t);

  const newNode: VectorNode = {
    id: `vnode-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    x: Math.round(pt.x * 10) / 10,
    y: Math.round(pt.y * 10) / 10,
    inHandleX: r0.x,
    inHandleY: r0.y,
    outHandleX: r1.x,
    outHandleY: r1.y,
    nodeType: 'smooth',
    width: path.strokeWidth,
  };

  const nextNodes = path.nodes.map((node, idx) => {
    if (idx === segIndex) {
      return { ...node, outHandleX: q0.x, outHandleY: q0.y };
    }
    if (idx === (segIndex + 1) % path.nodes.length) {
      return { ...node, inHandleX: q2.x, inHandleY: q2.y };
    }
    return node;
  });
  nextNodes.splice(segIndex + 1, 0, newNode);

  return { ...path, nodes: nextNodes };
}

/**
 * Direct curvature pull: bend a segment by pulling a point along its curve.
 */
export function bendSegmentByDelta(
  path: VectorPath,
  segIndex: number,
  dx: number,
  dy: number
): VectorPath {
  const seg = getEffectiveHandlesForSegment(path, segIndex);
  if (!seg) return path;
  const nLen = path.nodes.length;
  const p1Idx = (segIndex + 1) % nLen;
  const nextNodes = path.nodes.map((node, idx) => {
    if (idx === segIndex) {
      return {
        ...node,
        outHandleX: seg.c1.x + dx,
        outHandleY: seg.c1.y + dy,
      };
    }
    if (idx === p1Idx) {
      return {
        ...node,
        inHandleX: seg.c2.x + dx,
        inHandleY: seg.c2.y + dy,
      };
    }
    return node;
  });
  return { ...path, mode: path.mode === 'straight' ? 'bezier' : path.mode, nodes: nextNodes };
}

export function convertNodeType(
  path: VectorPath,
  nodeIds: string[],
  nodeType: VectorNodeType
): VectorPath {
  const idSet = new Set(nodeIds);
  const nextNodes = path.nodes.map((node, i) => {
    if (!idSet.has(node.id)) return node;
    const prev = path.nodes[(i - 1 + path.nodes.length) % path.nodes.length];
    const next = path.nodes[(i + 1) % path.nodes.length];
    if (nodeType === 'corner') {
      return {
        ...node,
        nodeType: 'corner' as VectorNodeType,
        handlesBroken: true,
        inHandleX: undefined,
        inHandleY: undefined,
        outHandleX: undefined,
        outHandleY: undefined,
      };
    }
    const dirX = (next?.x ?? node.x) - (prev?.x ?? node.x);
    const dirY = (next?.y ?? node.y) - (prev?.y ?? node.y);
    const len = Math.hypot(dirX, dirY) || 1;
    const span = Math.max(3, len * 0.22);
    const ux = dirX / len;
    const uy = dirY / len;
    return {
      ...node,
      nodeType,
      handlesBroken: false,
      inHandleX: node.x - ux * span,
      inHandleY: node.y - uy * span,
      outHandleX: node.x + ux * span,
      outHandleY: node.y + uy * span,
    };
  });
  return { ...path, nodes: nextNodes };
}

export function moveHandleWithConstraint(
  node: VectorNode,
  kind: 'in' | 'out',
  hx: number,
  hy: number,
  breakSymmetry: boolean
): VectorNode {
  const updated = { ...node };
  if (kind === 'in') {
    updated.inHandleX = hx;
    updated.inHandleY = hy;
    if (!breakSymmetry && !node.handlesBroken && node.nodeType !== 'corner') {
      const dx = node.x - hx;
      const dy = node.y - hy;
      if (node.nodeType === 'symmetric') {
        updated.outHandleX = node.x + dx;
        updated.outHandleY = node.y + dy;
      } else {
        const curOutLen =
          node.outHandleX !== undefined && node.outHandleY !== undefined
            ? Math.hypot(node.outHandleX - node.x, node.outHandleY - node.y)
            : Math.hypot(dx, dy);
        const inLen = Math.hypot(dx, dy) || 1;
        updated.outHandleX = node.x + (dx / inLen) * curOutLen;
        updated.outHandleY = node.y + (dy / inLen) * curOutLen;
      }
    }
  } else {
    updated.outHandleX = hx;
    updated.outHandleY = hy;
    if (!breakSymmetry && !node.handlesBroken && node.nodeType !== 'corner') {
      const dx = node.x - hx;
      const dy = node.y - hy;
      if (node.nodeType === 'symmetric') {
        updated.inHandleX = node.x + dx;
        updated.inHandleY = node.y + dy;
      } else {
        const curInLen =
          node.inHandleX !== undefined && node.inHandleY !== undefined
            ? Math.hypot(node.inHandleX - node.x, node.inHandleY - node.y)
            : Math.hypot(dx, dy);
        const outLen = Math.hypot(dx, dy) || 1;
        updated.inHandleX = node.x + (dx / outLen) * curInLen;
        updated.inHandleY = node.y + (dy / outLen) * curInLen;
      }
    }
  }
  if (breakSymmetry) {
    updated.handlesBroken = true;
  }
  return updated;
}

export function alignSelectedNodes(
  path: VectorPath,
  selectedNodeIds: string[],
  axis: 'left' | 'right' | 'centerX' | 'top' | 'bottom' | 'centerY'
): VectorPath {
  const targetNodes = path.nodes.filter((n) => selectedNodeIds.includes(n.id));
  if (targetNodes.length < 2) return path;

  let refVal = 0;
  if (axis === 'left') refVal = Math.min(...targetNodes.map((n) => n.x));
  if (axis === 'right') refVal = Math.max(...targetNodes.map((n) => n.x));
  if (axis === 'centerX') {
    refVal = (Math.min(...targetNodes.map((n) => n.x)) + Math.max(...targetNodes.map((n) => n.x))) / 2;
  }
  if (axis === 'top') refVal = Math.min(...targetNodes.map((n) => n.y));
  if (axis === 'bottom') refVal = Math.max(...targetNodes.map((n) => n.y));
  if (axis === 'centerY') {
    refVal = (Math.min(...targetNodes.map((n) => n.y)) + Math.max(...targetNodes.map((n) => n.y))) / 2;
  }

  const isX = axis === 'left' || axis === 'right' || axis === 'centerX';
  const idSet = new Set(selectedNodeIds);

  return {
    ...path,
    nodes: path.nodes.map((node) => {
      if (!idSet.has(node.id)) return node;
      const dx = isX ? refVal - node.x : 0;
      const dy = !isX ? refVal - node.y : 0;
      return {
        ...node,
        x: node.x + dx,
        y: node.y + dy,
        inHandleX: node.inHandleX !== undefined ? node.inHandleX + dx : undefined,
        inHandleY: node.inHandleY !== undefined ? node.inHandleY + dy : undefined,
        outHandleX: node.outHandleX !== undefined ? node.outHandleX + dx : undefined,
        outHandleY: node.outHandleY !== undefined ? node.outHandleY + dy : undefined,
      };
    }),
  };
}

export function distributeSelectedNodes(
  path: VectorPath,
  selectedNodeIds: string[],
  axis: 'horizontal' | 'vertical'
): VectorPath {
  const targetNodes = path.nodes.filter((n) => selectedNodeIds.includes(n.id));
  if (targetNodes.length < 3) return path;

  const sorted = [...targetNodes].sort((a, b) => (axis === 'horizontal' ? a.x - b.x : a.y - b.y));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const startVal = axis === 'horizontal' ? first.x : first.y;
  const endVal = axis === 'horizontal' ? last.x : last.y;

  const targetById = new Map<string, number>();
  sorted.forEach((n, idx) => {
    const v = startVal + ((endVal - startVal) * idx) / (sorted.length - 1);
    targetById.set(n.id, v);
  });

  return {
    ...path,
    nodes: path.nodes.map((node) => {
      const nextVal = targetById.get(node.id);
      if (nextVal === undefined) return node;
      const dx = axis === 'horizontal' ? nextVal - node.x : 0;
      const dy = axis === 'vertical' ? nextVal - node.y : 0;
      return {
        ...node,
        x: node.x + dx,
        y: node.y + dy,
        inHandleX: node.inHandleX !== undefined ? node.inHandleX + dx : undefined,
        inHandleY: node.inHandleY !== undefined ? node.inHandleY + dy : undefined,
        outHandleX: node.outHandleX !== undefined ? node.outHandleX + dx : undefined,
        outHandleY: node.outHandleY !== undefined ? node.outHandleY + dy : undefined,
      };
    }),
  };
}

export function pathToSelectionArea(
  path: VectorPath,
  width: number,
  height: number
): SelectionArea | null {
  const samples = sampleVectorPath(path);
  if (samples.length === 0) return null;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (const s of samples) {
    const x = Math.max(0, Math.min(width - 1, Math.round(s.x)));
    const y = Math.max(0, Math.min(height - 1, Math.round(s.y)));
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return {
    active: true,
    startX: minX,
    startY: minY,
    endX: maxX,
    endY: maxY,
  };
}

export interface VectorSegmentMetrics {
  dx: number;
  dy: number;
  lengthPx: number;
  angleDeg: number;
  directionLabel: string;
}

export function computeVectorSegmentMetrics(
  p0: { x: number; y: number },
  p1: { x: number; y: number }
): VectorSegmentMetrics {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const lengthPx = Number(Math.hypot(dx, dy).toFixed(1));
  const rawDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const angleDeg = Number(rawDeg.toFixed(1));
  const dirs = ['E', 'SE', 'S', 'SO', 'O', 'NO', 'N', 'NE'];
  const idx = ((Math.round(rawDeg / 45) % 8) + 8) % 8;
  return {
    dx: Number(dx.toFixed(1)),
    dy: Number(dy.toFixed(1)),
    lengthPx,
    angleDeg,
    directionLabel: lengthPx < 0.1 ? '•' : dirs[idx],
  };
}

export function rasterizeVectorPathPreviewCells(
  path: VectorPath,
  width: number,
  height: number
): { x: number; y: number; color: string }[] {
  const target: (string | null)[][] = Array.from({ length: height }, () =>
    Array(width).fill(null)
  );
  rasterizeVectorPath(path, width, height, target);
  const cells: { x: number; y: number; color: string }[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const col = target[y][x];
      if (col) cells.push({ x, y, color: col });
    }
  }
  return cells;
}

