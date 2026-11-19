import { Hitbox, ProjectState } from '../types';

export type EngineExportPreset = 'universal' | 'unity' | 'godot' | 'mugen';

export interface CsvExportOptions {
  engine: EngineExportPreset;
  includeEmptyFrames: boolean;
  delimiter: ',' | ';';
  ppu: number; // Pixels Per Unit (Unity/Godot)
  scale: number;
  columnMapping?: Record<string, string>;
  disabledColumns?: string[];
}

export interface CsvGenerationResult {
  defaultHeaders: string[];
  headers: string[];
  rows: string[][];
  csvText: string;
  frameCount: number;
  hitboxRowCount: number;
}

export function getDefaultCsvHeaders(engine: EngineExportPreset): string[] {
  if (engine === 'universal') {
    return [
      'FrameIndex',
      'FrameName',
      'MovementGroup',
      'Phase',
      'DurationSec',
      'DurationMs',
      'DurationTicks60FPS',
      'StartTimeSec',
      'EndTimeSec',
      'CanvasWidthPx',
      'CanvasHeightPx',
      'PivotXPx',
      'PivotYPx',
      'BoxIndex',
      'BoxType',
      'BoxName',
      'BoxXPx',
      'BoxYPx',
      'BoxWidthPx',
      'BoxHeightPx',
      'NormX',
      'NormY',
      'NormW',
      'NormH',
    ];
  }
  if (engine === 'unity') {
    return [
      'FrameIndex',
      'FrameName',
      'AnimationClip',
      'CombatPhase',
      'DurationSec',
      'DurationMs',
      'SampleTicks60Hz',
      'StartTimeSec',
      'PPU',
      'BoxIndex',
      'ColliderRole',
      'BoxName',
      'UnityOffsetX_Units',
      'UnityOffsetY_Units',
      'UnitySizeX_Units',
      'UnitySizeY_Units',
      'PixelX',
      'PixelY',
      'PixelW',
      'PixelH',
    ];
  }
  if (engine === 'godot') {
    return [
      'frame_index',
      'frame_name',
      'anim_name',
      'phase',
      'duration_sec',
      'duration_ms',
      'track_time_sec',
      'box_index',
      'box_type',
      'shape_name',
      'godot_center_x_px',
      'godot_center_y_px',
      'godot_extent_x_px',
      'godot_extent_y_px',
      'rect_x_px',
      'rect_y_px',
      'rect_w_px',
      'rect_h_px',
    ];
  }
  // M.U.G.E.N / IKEMEN GO
  return [
    'ActionGroup',
    'SpriteGroup',
    'SpriteIndex',
    'FrameName',
    'Phase',
    'AirTicks60Hz',
    'DurationSec',
    'DurationMs',
    'ClsnCategory',
    'BoxIndex',
    'ClsnLeft_RelPivot',
    'ClsnTop_RelPivot',
    'ClsnRight_RelPivot',
    'ClsnBottom_RelPivot',
    'MugenAirLineHint',
  ];
}

function escapeCsvCell(value: string | number, delimiter: string): string {
  const str = String(value ?? '');
  if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCombatCsv(
  project: ProjectState,
  options: CsvExportOptions
): CsvGenerationResult {
  const {
    engine,
    includeEmptyFrames,
    delimiter,
    ppu,
    scale,
    columnMapping = {},
    disabledColumns = [],
  } = options;
  const groups = project.layerGroups || [];
  const pivotX = (project.globalPivot?.x ?? Math.floor(project.width / 2)) * scale;
  const pivotY = (project.globalPivot?.y ?? project.height - 4) * scale;
  const scaledW = project.width * scale;
  const scaledH = project.height * scale;

  const defaultHeaders = getDefaultCsvHeaders(engine);
  const disabledSet = new Set(disabledColumns);
  const activeIndices = defaultHeaders
    .map((h, idx) => (!disabledSet.has(h) ? idx : -1))
    .filter((idx) => idx !== -1);

  const safeIndices = activeIndices.length > 0 ? activeIndices : [0];
  const mappedHeaders = safeIndices.map((idx) => {
    const original = defaultHeaders[idx];
    const custom = columnMapping[original]?.trim();
    return custom && custom.length > 0 ? custom : original;
  });

  const rawRows: string[][] = [];
  let cumulativeMs = 0;
  let hitboxRowCount = 0;

  project.frames.forEach((frame, fIdx) => {
    const durationMs =
      frame.durationMs || Math.round(((frame.durationTicks || 4) / 60) * 1000);
    const durationSec = (durationMs / 1000).toFixed(4);
    const durationTicks =
      frame.durationTicks || Math.max(1, Math.round((durationMs / 1000) * 60));

    const startTimeSec = (cumulativeMs / 1000).toFixed(4);
    const endTimeSec = ((cumulativeMs + durationMs) / 1000).toFixed(4);
    cumulativeMs += durationMs;

    const groupObj = groups.find((g) => g.id === frame.groupId);
    const groupName = groupObj?.name || 'Default';
    const hitboxes: Hitbox[] = frame.hitboxes || [];

    const buildRowForBox = (hb: Hitbox | null, boxIdx: number): string[] => {
      if (hb) hitboxRowCount++;

      const bx = (hb?.x ?? 0) * scale;
      const by = (hb?.y ?? 0) * scale;
      const bw = (hb?.w ?? 0) * scale;
      const bh = (hb?.h ?? 0) * scale;
      const bType = hb ? hb.type : 'none';
      const bName = hb ? hb.name || hb.type.toUpperCase() : 'NO_BOX';

      if (engine === 'universal') {
        return [
          String(fIdx),
          frame.name,
          groupName,
          frame.phase || 'neutral',
          durationSec,
          String(durationMs),
          String(durationTicks),
          startTimeSec,
          endTimeSec,
          String(scaledW),
          String(scaledH),
          String(pivotX),
          String(pivotY),
          hb ? String(boxIdx) : '-1',
          bType,
          bName,
          String(bx),
          String(by),
          String(bw),
          String(bh),
          (bx / Math.max(1, scaledW)).toFixed(4),
          (by / Math.max(1, scaledH)).toFixed(4),
          (bw / Math.max(1, scaledW)).toFixed(4),
          (bh / Math.max(1, scaledH)).toFixed(4),
        ];
      }

      if (engine === 'unity') {
        const centerXPx = bx + bw / 2;
        const centerYPx = by + bh / 2;
        const offsetXUnits = hb ? ((centerXPx - pivotX) / Math.max(1, ppu)).toFixed(4) : '0';
        const offsetYUnits = hb ? ((pivotY - centerYPx) / Math.max(1, ppu)).toFixed(4) : '0';
        const sizeXUnits = hb ? (bw / Math.max(1, ppu)).toFixed(4) : '0';
        const sizeYUnits = hb ? (bh / Math.max(1, ppu)).toFixed(4) : '0';

        return [
          String(fIdx),
          frame.name,
          groupName,
          frame.phase || 'neutral',
          durationSec,
          String(durationMs),
          String(durationTicks),
          startTimeSec,
          String(ppu),
          hb ? String(boxIdx) : '-1',
          bType === 'hitbox'
            ? 'AttackHitbox'
            : bType === 'hurtbox'
            ? 'HurtboxTrigger'
            : bType === 'pushbox'
            ? 'PhysicsPushbox'
            : bType === 'throwbox'
            ? 'ThrowCollider'
            : bType === 'counterbox'
            ? 'CounterTrigger'
            : bType === 'clashbox'
            ? 'ClashCollider'
            : bType === 'armorbox'
            ? 'ArmorTrigger'
            : 'None',
          bName,
          offsetXUnits,
          offsetYUnits,
          sizeXUnits,
          sizeYUnits,
          String(bx),
          String(by),
          String(bw),
          String(bh),
        ];
      }

      if (engine === 'godot') {
        const centerX = hb ? (bx + bw / 2 - pivotX).toFixed(2) : '0';
        const centerY = hb ? (by + bh / 2 - pivotY).toFixed(2) : '0';
        const extentX = hb ? (bw / 2).toFixed(2) : '0';
        const extentY = hb ? (bh / 2).toFixed(2) : '0';

        return [
          String(fIdx),
          frame.name,
          groupName,
          frame.phase || 'neutral',
          durationSec,
          String(durationMs),
          startTimeSec,
          hb ? String(boxIdx) : '-1',
          bType,
          bName,
          centerX,
          centerY,
          extentX,
          extentY,
          String(bx),
          String(by),
          String(bw),
          String(bh),
        ];
      }

      const left = hb ? bx - pivotX : 0;
      const top = hb ? by - pivotY : 0;
      const right = hb ? bx + bw - pivotX : 0;
      const bottom = hb ? by + bh - pivotY : 0;
      const clsnType =
        bType === 'hitbox' || bType === 'throwbox' || bType === 'clashbox'
          ? `Clsn1_${bType}`
          : bType === 'hurtbox' || bType === 'pushbox' || bType === 'counterbox' || bType === 'armorbox'
          ? `Clsn2_${bType}`
          : 'None';
      const airHint = hb
        ? `${bType === 'hitbox' || bType === 'throwbox' || bType === 'clashbox' ? 'Clsn1' : 'Clsn2'}[${boxIdx}] = ${left}, ${top}, ${right}, ${bottom}`
        : `0,${fIdx}, 0,0, ${durationTicks}`;

      return [
        groupName,
        '0',
        String(fIdx),
        frame.name,
        frame.phase || 'neutral',
        String(durationTicks),
        durationSec,
        String(durationMs),
        clsnType,
        hb ? String(boxIdx) : '-1',
        String(left),
        String(top),
        String(right),
        String(bottom),
        airHint,
      ];
    };

    if (hitboxes.length === 0) {
      if (includeEmptyFrames) {
        rawRows.push(buildRowForBox(null, -1));
      }
    } else {
      hitboxes.forEach((hb, boxIdx) => {
        rawRows.push(buildRowForBox(hb, boxIdx));
      });
    }
  });

  const rows = rawRows.map((row) => safeIndices.map((idx) => row[idx]));

  const csvLines = [
    mappedHeaders.map((h) => escapeCsvCell(h, delimiter)).join(delimiter),
    ...rows.map((row) =>
      row.map((cell) => escapeCsvCell(cell, delimiter)).join(delimiter)
    ),
  ];

  return {
    defaultHeaders,
    headers: mappedHeaders,
    rows,
    csvText: csvLines.join('\n'),
    frameCount: project.frames.length,
    hitboxRowCount,
  };
}
