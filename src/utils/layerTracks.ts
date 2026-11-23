import { Frame, Layer, LayerGroup } from '../types';

export interface ProjectLayerTrack {
  trackKey: string;
  layer: Layer;
  currentFrameLayerIndex: number;
  existsInCurrentFrame: boolean;
  hasContentInCurrentFrame: boolean;
  hasKeyframeAtCurrentFrame: boolean;
  totalKeyframesCount: number;
  isLocked: boolean;
  presentFrameCount: number;
  frameLayerIndices: number[];
}

export function getLayerBaseSignature(layer: Layer): string {
  if (layer.trackId) return `trk:${layer.trackId}`;
  if (layer.isGlobal) return `glb:${layer.id}`;
  const normName = (layer.name || 'capa').trim().toLowerCase();
  const lType = layer.layerType || 'raster';
  return `name:${normName}::${lType}`;
}

export function computeFrameLayerTrackKeys(layers: Layer[]): string[] {
  const counts = new Map<string, number>();
  return layers.map((l) => {
    const base = getLayerBaseSignature(l);
    const idx = counts.get(base) || 0;
    counts.set(base, idx + 1);
    return idx === 0 ? base : `${base}#${idx}`;
  });
}

export function layerHasVisibleContent(layer?: Layer | null): boolean {
  if (!layer) return false;
  if (layer.layerType === 'adjustment') return true;
  if (layer.tiledStoreId) return true;
  if (layer.vectorPaths && layer.vectorPaths.length > 0) return true;
  if (layer.parametricShapes && layer.parametricShapes.length > 0) return true;
  const rows = layer.pixels;
  if (!rows || rows.length === 0) return false;
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    if (!row) continue;
    for (let x = 0; x < row.length; x++) {
      if (row[x]) return true;
    }
  }
  return false;
}

export function isLayerLockedAny(layer?: Layer | null): boolean {
  if (!layer) return false;
  return Boolean(
    layer.locked || layer.lockPixels || layer.lockPosition || layer.lockTransparency
  );
}

/**
 * Builds a unified video/animation-style project layer list across all frames.
 * Layers never disappear when switching frames or playing animations; instead they
 * expose current-frame state (`existsInCurrentFrame`, `hasContentInCurrentFrame`,
 * `hasKeyframeAtCurrentFrame`, `isLocked`).
 */
export function buildProjectLayerTracks(
  frames: Frame[],
  currentFrameIndex: number
): ProjectLayerTrack[] {
  if (!frames || frames.length === 0) return [];
  const safeCurIdx = Math.max(0, Math.min(frames.length - 1, currentFrameIndex));

  const perFrameKeys = frames.map((f) => computeFrameLayerTrackKeys(f.layers || []));
  const orderedKeys: string[] = [];
  const orderedKeySet = new Set<string>();

  // Seed order from currentFrame first so active stack order matches the canvas 1:1
  const curKeys = perFrameKeys[safeCurIdx] || [];
  for (const key of curKeys) {
    if (!orderedKeySet.has(key)) {
      orderedKeySet.add(key);
      orderedKeys.push(key);
    }
  }

  // Merge tracks that only exist in other frames at their nearest relative z-order position
  for (let fIdx = 0; fIdx < frames.length; fIdx++) {
    const keys = perFrameKeys[fIdx];
    for (let lIdx = 0; lIdx < keys.length; lIdx++) {
      const key = keys[lIdx];
      if (orderedKeySet.has(key)) continue;

      let insertPos = orderedKeys.length;
      // Prefer placing just above the closest preceding neighbor that is already ordered
      let placed = false;
      for (let prev = lIdx - 1; prev >= 0; prev--) {
        const prevPos = orderedKeys.indexOf(keys[prev]);
        if (prevPos >= 0) {
          insertPos = prevPos + 1;
          placed = true;
          break;
        }
      }
      if (!placed) {
        // Otherwise place just below the closest following neighbor
        for (let next = lIdx + 1; next < keys.length; next++) {
          const nextPos = orderedKeys.indexOf(keys[next]);
          if (nextPos >= 0) {
            insertPos = nextPos;
            break;
          }
        }
      }
      orderedKeySet.add(key);
      orderedKeys.splice(insertPos, 0, key);
    }
  }

  // Build track summaries
  const tracks: ProjectLayerTrack[] = [];
  for (const trackKey of orderedKeys) {
    const frameLayerIndices = new Array<number>(frames.length).fill(-1);
    let representativeLayer: Layer | null = null;
    let presentFrameCount = 0;
    let hasKeyframeAtCurrentFrame = false;
    let totalKeyframesCount = 0;

    for (let fIdx = 0; fIdx < frames.length; fIdx++) {
      const idxInFrame = perFrameKeys[fIdx].indexOf(trackKey);
      frameLayerIndices[fIdx] = idxInFrame;
      if (idxInFrame >= 0) {
        presentFrameCount += 1;
        const lyr = frames[fIdx].layers[idxInFrame];
        if (!representativeLayer || fIdx === safeCurIdx) {
          representativeLayer = lyr;
        }
        const kfs = lyr.keyframes || [];
        totalKeyframesCount += kfs.length;
        if (kfs.some((k) => k.frameIndex === safeCurIdx)) {
          hasKeyframeAtCurrentFrame = true;
        }
      }
    }

    if (!representativeLayer) continue;

    const currentFrameLayerIndex = frameLayerIndices[safeCurIdx];
    const currentFrameLayer =
      currentFrameLayerIndex >= 0
        ? frames[safeCurIdx]?.layers[currentFrameLayerIndex]
        : null;

    tracks.push({
      trackKey,
      layer: currentFrameLayer || representativeLayer,
      currentFrameLayerIndex,
      existsInCurrentFrame: currentFrameLayerIndex >= 0,
      hasContentInCurrentFrame: layerHasVisibleContent(currentFrameLayer),
      hasKeyframeAtCurrentFrame,
      totalKeyframesCount,
      isLocked: isLayerLockedAny(currentFrameLayer || representativeLayer),
      presentFrameCount,
      frameLayerIndices,
    });
  }

  return tracks;
}

/**
 * Distinguishes pure timeline frame-movement tags (`frameIndices.length > 0` with no layers)
 * from layer organization folders so movement tags don't appear as empty layer folders.
 */
export function isTimelineMovementOnlyGroup(
  group: LayerGroup,
  tracks: ProjectLayerTrack[]
): boolean {
  const hasFrameTags = Boolean(group.frameIndices && group.frameIndices.length > 0);
  if (!hasFrameTags) return false;
  return !tracks.some((t) => t.layer.groupId === group.id);
}
