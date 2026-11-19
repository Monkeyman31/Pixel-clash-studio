import JSZip from 'jszip';
import { Frame, Layer, ProjectState } from '../types';
import { frameToCanvas } from './pixelMath';
import { layerToCanvas } from './fileExporter';

export interface SpineExportOptions {
  scale: number;
  splitBonesByLayer: boolean;
  includeHitboxSlots: boolean;
  trackBoneMotion: boolean;
  spineVersion?: string;
}

export interface SpineExportSummary {
  jsonText: string;
  boneCount: number;
  slotCount: number;
  animationCount: number;
  attachmentCount: number;
}

function sanitizeSpineName(name: string, fallback: string): string {
  const clean = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return clean || fallback;
}

function computeLayerCentroid(
  layer: Layer,
  width: number,
  height: number
): { cx: number; cy: number; minX: number; minY: number; maxX: number; maxY: number; hasPixels: boolean } {
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    const row = layer.pixels[y];
    if (!row) continue;
    for (let x = 0; x < width; x++) {
      if (row[x]) {
        sumX += x;
        sumY += y;
        count++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (count === 0) {
    return {
      cx: Math.floor(width / 2),
      cy: Math.floor(height / 2),
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      hasPixels: false,
    };
  }

  return {
    cx: sumX / count,
    cy: sumY / count,
    minX,
    minY,
    maxX,
    maxY,
    hasPixels: true,
  };
}

export function buildSpineSkeletonJson(
  project: ProjectState,
  options: SpineExportOptions
): SpineExportSummary {
  const {
    scale,
    splitBonesByLayer,
    includeHitboxSlots,
    trackBoneMotion,
    spineVersion = '4.1.24',
  } = options;

  const w = project.width * scale;
  const h = project.height * scale;
  const pivotX = (project.globalPivot?.x ?? Math.floor(project.width / 2)) * scale;
  const pivotY = (project.globalPivot?.y ?? project.height - 4) * scale;

  // Convert top-down canvas coords to Spine Y-up centered on globalPivot
  const toSpineX = (px: number) => Number((px - pivotX).toFixed(2));
  const toSpineY = (py: number) => Number((pivotY - py).toFixed(2));

  const frames = project.frames || [];
  const firstFrame: Frame | undefined = frames[0];

  const uniqueLayerNames: string[] = [];
  if (splitBonesByLayer && firstFrame) {
    firstFrame.layers.forEach((layer, idx) => {
      const base = sanitizeSpineName(layer.name, `layer_${idx + 1}`);
      if (!uniqueLayerNames.includes(base)) {
        uniqueLayerNames.push(base);
      } else {
        uniqueLayerNames.push(`${base}_${idx + 1}`);
      }
    });
  } else {
    uniqueLayerNames.push('sprite_composite');
  }

  // 1. Skeleton metadata
  const skeleton = {
    hash: `pcs_${project.width}x${project.height}_${frames.length}`,
    spine: spineVersion,
    x: Number((-pivotX).toFixed(2)),
    y: Number((pivotY - h).toFixed(2)),
    width: w,
    height: h,
    images: './images/',
    audio: '',
  };

  // 2. Bones hierarchy
  const bones: Record<string, any>[] = [
    { name: 'root', x: 0, y: 0 },
    {
      name: 'fighter_body',
      parent: 'root',
      x: 0,
      y: Number((h * 0.25).toFixed(2)),
      length: Math.max(8, Math.round(h * 0.45)),
    },
  ];

  const layerBaseOffsets: Record<string, { x: number; y: number }> = {};

  uniqueLayerNames.forEach((layerKey, lIdx) => {
    const boneName = `bone_${layerKey}`;
    let baseX = 0;
    let baseY = 0;

    if (splitBonesByLayer && firstFrame?.layers[lIdx]) {
      const c = computeLayerCentroid(firstFrame.layers[lIdx], project.width, project.height);
      if (c.hasPixels) {
        baseX = toSpineX(c.cx * scale);
        baseY = toSpineY(c.cy * scale) - Number((h * 0.25).toFixed(2));
      }
    }

    layerBaseOffsets[layerKey] = { x: baseX, y: baseY };
    bones.push({
      name: boneName,
      parent: 'fighter_body',
      length: Math.max(6, Math.round(Math.min(w, h) * 0.22)),
      x: Number(baseX.toFixed(2)),
      y: Number(baseY.toFixed(2)),
    });
  });

  if (includeHitboxSlots) {
    bones.push({
      name: 'combat_boxes',
      parent: 'root',
      x: 0,
      y: 0,
    });
  }

  // 3. Slots & Default Skin Attachments
  const slots: Record<string, any>[] = [];
  const defaultAttachments: Record<string, Record<string, any>> = {};
  let attachmentCount = 0;

  uniqueLayerNames.forEach((layerKey) => {
    const slotName = `slot_${layerKey}`;
    const boneName = `bone_${layerKey}`;
    const firstAttachment = `${layerKey}_f0`;

    slots.push({
      name: slotName,
      bone: boneName,
      attachment: firstAttachment,
    });

    defaultAttachments[slotName] = {};
    const offset = layerBaseOffsets[layerKey] || { x: 0, y: 0 };
    const spriteCenterOffsetX = toSpineX(w / 2) - offset.x;
    const spriteCenterOffsetY = toSpineY(h / 2) - Number((h * 0.25).toFixed(2)) - offset.y;

    frames.forEach((_, fIdx) => {
      const attName = `${layerKey}_f${fIdx}`;
      defaultAttachments[slotName][attName] = {
        x: Number(spriteCenterOffsetX.toFixed(2)),
        y: Number(spriteCenterOffsetY.toFixed(2)),
        width: w,
        height: h,
      };
      attachmentCount++;
    });
  });

  if (includeHitboxSlots) {
    const hbTypes: { slot: string; color: string }[] = [
      { slot: 'slot_hurtbox', color: '22c55eff' },
      { slot: 'slot_hitbox', color: 'ef4444ff' },
      { slot: 'slot_pushbox', color: 'f59e0bff' },
    ];
    hbTypes.forEach(({ slot, color }) => {
      slots.push({
        name: slot,
        bone: 'combat_boxes',
        color,
      });
      defaultAttachments[slot] = {};
    });

    frames.forEach((frame, fIdx) => {
      (frame.hitboxes || []).forEach((hb, bIdx) => {
        const slotName =
          hb.type === 'hitbox'
            ? 'slot_hitbox'
            : hb.type === 'pushbox'
            ? 'slot_pushbox'
            : 'slot_hurtbox';
        const attName = `${hb.type}_f${fIdx}_${bIdx}`;
        const x1 = toSpineX(hb.x * scale);
        const y1 = toSpineY(hb.y * scale);
        const x2 = toSpineX((hb.x + hb.w) * scale);
        const y2 = toSpineY((hb.y + hb.h) * scale);
        defaultAttachments[slotName][attName] = {
          type: 'boundingbox',
          vertexCount: 4,
          vertices: [x1, y1, x2, y1, x2, y2, x1, y2],
        };
        attachmentCount++;
      });
    });
  }

  // 4. Animations (per LayerGroup + Full Sequence)
  const animations: Record<string, any> = {};

  const buildAnimationForIndices = (indices: number[]) => {
    const slotTimelines: Record<string, any> = {};
    const boneTimelines: Record<string, any> = {};

    uniqueLayerNames.forEach((layerKey) => {
      slotTimelines[`slot_${layerKey}`] = { attachment: [] };
      if (trackBoneMotion) {
        boneTimelines[`bone_${layerKey}`] = { translate: [] };
      }
    });

    if (includeHitboxSlots) {
      slotTimelines['slot_hurtbox'] = { attachment: [] };
      slotTimelines['slot_hitbox'] = { attachment: [] };
      slotTimelines['slot_pushbox'] = { attachment: [] };
    }

    let timeSec = 0;
    indices.forEach((fIdx) => {
      const frame = frames[fIdx];
      if (!frame) return;
      const t = Number(timeSec.toFixed(4));

      uniqueLayerNames.forEach((layerKey, lIdx) => {
        const attName = `${layerKey}_f${fIdx}`;
        slotTimelines[`slot_${layerKey}`].attachment.push({
          time: t,
          name: attName,
        });

        if (trackBoneMotion && splitBonesByLayer && frame.layers[lIdx]) {
          const c = computeLayerCentroid(frame.layers[lIdx], project.width, project.height);
          const base = layerBaseOffsets[layerKey] || { x: 0, y: 0 };
          const curX = c.hasPixels ? toSpineX(c.cx * scale) : base.x;
          const curY = c.hasPixels
            ? toSpineY(c.cy * scale) - Number((h * 0.25).toFixed(2))
            : base.y;
          boneTimelines[`bone_${layerKey}`].translate.push({
            time: t,
            x: Number((curX - base.x).toFixed(2)),
            y: Number((curY - base.y).toFixed(2)),
            curve: 'stepped',
          });
        }
      });

      if (includeHitboxSlots) {
        const hbs = frame.hitboxes || [];
        const firstHurt = hbs.findIndex((b) => b.type === 'hurtbox');
        const firstHit = hbs.findIndex((b) => b.type === 'hitbox');
        const firstPush = hbs.findIndex((b) => b.type === 'pushbox');

        slotTimelines['slot_hurtbox'].attachment.push({
          time: t,
          name: firstHurt >= 0 ? `hurtbox_f${fIdx}_${firstHurt}` : null,
        });
        slotTimelines['slot_hitbox'].attachment.push({
          time: t,
          name: firstHit >= 0 ? `hitbox_f${fIdx}_${firstHit}` : null,
        });
        slotTimelines['slot_pushbox'].attachment.push({
          time: t,
          name: firstPush >= 0 ? `pushbox_f${fIdx}_${firstPush}` : null,
        });
      }

      const durationMs =
        frame.durationMs || Math.round(((frame.durationTicks || 4) / 60) * 1000);
      timeSec += durationMs / 1000;
    });

    const cleanBones: Record<string, any> = {};
    Object.entries(boneTimelines).forEach(([k, val]) => {
      if (val.translate && val.translate.length > 0) {
        cleanBones[k] = val;
      }
    });

    return {
      slots: slotTimelines,
      ...(Object.keys(cleanBones).length > 0 ? { bones: cleanBones } : {}),
    };
  };

  // Full sequence animation
  if (frames.length > 0) {
    animations['all_frames'] = buildAnimationForIndices(frames.map((_, i) => i));
  }

  // Group-based combat move animations
  (project.layerGroups || []).forEach((group, gIdx) => {
    const valid = (group.frameIndices || []).filter((i) => i >= 0 && i < frames.length);
    if (valid.length > 0) {
      const animKey = sanitizeSpineName(group.name, `move_${gIdx + 1}`);
      animations[animKey] = buildAnimationForIndices(valid);
    }
  });

  const spineDocument = {
    skeleton,
    bones,
    slots,
    skins: [
      {
        name: 'default',
        attachments: defaultAttachments,
      },
    ],
    animations,
  };

  return {
    jsonText: JSON.stringify(spineDocument, null, 2),
    boneCount: bones.length,
    slotCount: slots.length,
    animationCount: Object.keys(animations).length,
    attachmentCount,
  };
}

export async function exportSpineBundleZip(
  project: ProjectState,
  options: SpineExportOptions
): Promise<Blob> {
  const zip = new JSZip();
  const baseName = sanitizeSpineName(project.name, 'fighter').toLowerCase();
  const summary = buildSpineSkeletonJson(project, options);

  zip.file(`${baseName}.spine`, summary.jsonText);
  zip.file(`${baseName}.spine.json`, summary.jsonText);

  const imgFolder = zip.folder('images');
  const atlasLines: string[] = [];

  const firstFrame = project.frames[0];
  const splitLayers = options.splitBonesByLayer && firstFrame;

  const scaleCanvas = (src: HTMLCanvasElement, scale: number): HTMLCanvasElement => {
    if (scale === 1) return src;
    const out = document.createElement('canvas');
    out.width = src.width * scale;
    out.height = src.height * scale;
    const ctx = out.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(src, 0, 0, out.width, out.height);
    }
    return out;
  };

  for (let fIdx = 0; fIdx < project.frames.length; fIdx++) {
    const frame = project.frames[fIdx];
    if (splitLayers) {
      for (let lIdx = 0; lIdx < frame.layers.length; lIdx++) {
        const layer = frame.layers[lIdx];
        const refLayer = firstFrame.layers[lIdx] || layer;
        const baseLayerName = sanitizeSpineName(refLayer.name, `layer_${lIdx + 1}`);
        const regionName = `${baseLayerName}_f${fIdx}`;
        const rawCanvas = layerToCanvas(layer, project.width, project.height);
        const scaled = scaleCanvas(rawCanvas, options.scale);
        const dataUrl = scaled.toDataURL('image/png');
        const b64 = dataUrl.split(',')[1];
        if (b64 && imgFolder) {
          imgFolder.file(`${regionName}.png`, b64, { base64: true });
          atlasLines.push(
            `images/${regionName}.png`,
            `size: ${scaled.width}, ${scaled.height}`,
            'format: RGBA8888',
            'filter: Nearest, Nearest',
            'repeat: none',
            regionName,
            '  rotate: false',
            '  xy: 0, 0',
            `  size: ${scaled.width}, ${scaled.height}`,
            `  orig: ${scaled.width}, ${scaled.height}`,
            '  offset: 0, 0',
            '  index: -1',
            ''
          );
        }
      }
    } else {
      const regionName = `sprite_composite_f${fIdx}`;
      const scaled = frameToCanvas(frame, project.width, project.height, options.scale);
      const dataUrl = scaled.toDataURL('image/png');
      const b64 = dataUrl.split(',')[1];
      if (b64 && imgFolder) {
        imgFolder.file(`${regionName}.png`, b64, { base64: true });
        atlasLines.push(
          `images/${regionName}.png`,
          `size: ${scaled.width}, ${scaled.height}`,
          'format: RGBA8888',
          'filter: Nearest, Nearest',
          'repeat: none',
          regionName,
          '  rotate: false',
          '  xy: 0, 0',
          `  size: ${scaled.width}, ${scaled.height}`,
          `  orig: ${scaled.width}, ${scaled.height}`,
          '  offset: 0, 0',
          '  index: -1',
          ''
        );
      }
    }
  }

  zip.file(`${baseName}.atlas`, atlasLines.join('\n'));
  return zip.generateAsync({ type: 'blob' });
}
