import {
  TileCategoryId,
  TileGroup,
  TileItem,
  TilesetCollection,
  TileToolConfig,
} from '../types';

export interface TileCategoryMeta {
  id: TileCategoryId;
  label: string;
  accent: string;
  baseColors: [string, string, string, string]; // highlight, base, mid-shadow, deep/outline
}

export const TILE_CATEGORIES: TileCategoryMeta[] = [
  { id: 'suelo', label: 'Suelo', accent: '#64748b', baseColors: ['#cbd5e1', '#64748b', '#475569', '#1e293b'] },
  { id: 'cesped', label: 'Césped', accent: '#22c55e', baseColors: ['#86efac', '#22c55e', '#15803d', '#14532d'] },
  { id: 'tierra', label: 'Tierra', accent: '#a16207', baseColors: ['#d97706', '#92400e', '#78350f', '#451a03'] },
  { id: 'roca', label: 'Roca', accent: '#94a3b8', baseColors: ['#e2e8f0', '#94a3b8', '#475569', '#0f172a'] },
  { id: 'arena', label: 'Arena', accent: '#eab308', baseColors: ['#fef08a', '#facc15', '#ca8a04', '#854d0e'] },
  { id: 'agua', label: 'Agua', accent: '#0ea5e9', baseColors: ['#bae6fd', '#38bdf8', '#0284c7', '#0c4a6e'] },
  { id: 'lava', label: 'Lava', accent: '#f97316', baseColors: ['#fef08a', '#f97316', '#dc2626', '#7f1d1d'] },
  { id: 'cielo', label: 'Cielo', accent: '#38bdf8', baseColors: ['#e0f2fe', '#7dd3fc', '#38bdf8', '#0369a1'] },
  { id: 'nubes', label: 'Nubes', accent: '#f1f5f9', baseColors: ['#ffffff', '#e2e8f0', '#cbd5e1', '#94a3b8'] },
  { id: 'edificios', label: 'Edificios', accent: '#6366f1', baseColors: ['#a5b4fc', '#4f46e5', '#312e81', '#1e1b4b'] },
  { id: 'decoracion', label: 'Decoración', accent: '#f43f5e', baseColors: ['#fda4af', '#f43f5e', '#9f1239', '#4c0519'] },
];

export const DEFAULT_TILE_TOOL_CONFIG: TileToolConfig = {
  mode: 'draw',
  paintMode: 'single',
  autotile: true,
  continuousDraw: true,
  autoRepeat: false,
  tileSize: 16,
  activeTilesetId: 'ts-stage-arcade',
  activeTileId: 'tile-cesped-0',
};

/**
 * Generates a crisp procedural pixel-art tile for a given category and 4-bit autotile neighbor mask.
 * Mask bits: 1 = North, 2 = East, 4 = South, 8 = West (neighbor has same tile).
 * When mask === 15 (or autotile disabled), produces an interior seamless tile.
 */
export function generateCategoryTilePixels(
  category: TileCategoryId,
  tileSize: number,
  mask: number = 15
): (string | null)[][] {
  const sz = Math.max(4, Math.min(128, Math.round(tileSize || 16)));
  const meta = TILE_CATEGORIES.find((c) => c.id === category) || TILE_CATEGORIES[0];
  const [hi, base, sh, deep] = meta.baseColors;
  const grid: (string | null)[][] = Array.from({ length: sz }, () =>
    Array.from({ length: sz }, () => null)
  );

  const hasN = (mask & 1) !== 0;
  const hasE = (mask & 2) !== 0;
  const hasS = (mask & 4) !== 0;
  const hasW = (mask & 8) !== 0;
  const edge = Math.max(1, Math.round(sz / 8));

  for (let y = 0; y < sz; y++) {
    for (let x = 0; x < sz; x++) {
      const h = ((x * 73 + y * 139 + category.length * 37) ^ (x * y + 17)) & 31;

      if (category === 'nubes') {
        const nx = (x + 0.5) / sz - 0.5;
        const ny = (y + 0.5) / sz - 0.5;
        const d = Math.hypot(nx * 1.15, ny * 1.35);
        if (d > 0.52 && mask === 15) {
          grid[y][x] = null;
          continue;
        }
        grid[y][x] = ny < -0.05 ? hi : ny < 0.2 ? base : sh;
        continue;
      }

      if (category === 'decoracion') {
        // Stylized lantern / crystal pillar ornament with transparent corners
        const cx = Math.floor(sz / 2);
        const dx = Math.abs(x - cx);
        if (dx <= Math.max(1, Math.floor(sz * 0.28)) && y >= 1 && y < sz - 1) {
          if (y < Math.floor(sz * 0.3) || y > Math.floor(sz * 0.78)) {
            grid[y][x] = deep;
          } else {
            grid[y][x] = dx <= 1 ? hi : base;
          }
        }
        continue;
      }

      if (category === 'cielo') {
        const band = Math.floor((y / sz) * 4);
        grid[y][x] = band === 0 ? deep : band === 1 ? sh : band === 2 ? base : h < 3 ? hi : base;
        continue;
      }

      if (category === 'edificios') {
        const winW = Math.max(2, Math.floor(sz / 4));
        const inWinX = x % Math.max(4, Math.floor(sz / 2)) >= 1 && x % Math.max(4, Math.floor(sz / 2)) < winW + 1;
        const inWinY = y % Math.max(4, Math.floor(sz / 2)) >= 1 && y % Math.max(4, Math.floor(sz / 2)) < winW + 1;
        if (inWinX && inWinY) {
          grid[y][x] = (x + y) % 3 === 0 ? '#fde047' : hi;
        } else {
          grid[y][x] = x === 0 || y === 0 ? deep : base;
        }
        continue;
      }

      // Terrain & liquid base texture
      let color = base;
      if (category === 'suelo' || category === 'roca') {
        const brickH = Math.max(4, Math.floor(sz / 2));
        const brickW = Math.max(4, Math.floor(sz / 2));
        const row = Math.floor(y / brickH);
        const bx = (x + (row % 2) * Math.floor(brickW / 2)) % brickW;
        const by = y % brickH;
        if (bx === 0 || by === 0) color = deep;
        else if (by === 1) color = hi;
        else color = h < 5 ? sh : base;
      } else if (category === 'cesped') {
        color = h < 4 ? hi : h > 25 ? sh : base;
      } else if (category === 'tierra' || category === 'arena') {
        color = h < 4 ? hi : h < 10 ? sh : h === 15 ? deep : base;
      } else if (category === 'agua' || category === 'lava') {
        const wave = Math.sin((x / sz) * Math.PI * 2 + (y / sz) * Math.PI);
        color = wave > 0.62 ? hi : wave < -0.55 ? deep : h < 4 ? sh : base;
      }

      // Apply 4-bit Autotile edges/borders cleanly when neighbor doesn't match
      if (!hasN && y < edge) {
        color = y === 0 ? (category === 'agua' || category === 'lava' ? hi : deep) : hi;
      } else if (!hasS && y >= sz - edge) {
        color = deep;
      } else if (!hasW && x < edge) {
        color = x === 0 ? deep : sh;
      } else if (!hasE && x >= sz - edge) {
        color = x === sz - 1 ? deep : sh;
      }

      // Optional turf rim on exposed top for ground/grass
      if (category === 'cesped' && !hasN && y < Math.max(2, Math.round(sz * 0.24))) {
        color = y === 0 ? '#bbf7d0' : y === Math.round(sz * 0.24) - 1 ? deep : hi;
      }

      grid[y][x] = color;
    }
  }

  return grid;
}

export function createDefaultTilesetLibrary(tileSize: number = 16): TilesetCollection[] {
  const sz = Math.max(8, Math.min(64, tileSize));
  const groups: TileGroup[] = [
    { id: 'grp-terrain', name: 'Terrenos y Suelo', color: '#22c55e' },
    { id: 'grp-elements', name: 'Agua, Lava y Cielo', color: '#38bdf8' },
    { id: 'grp-urban', name: 'Estructuras y Decoración', color: '#f43f5e' },
  ];

  const categoryToGroup: Record<TileCategoryId, string> = {
    suelo: 'grp-terrain',
    cesped: 'grp-terrain',
    tierra: 'grp-terrain',
    roca: 'grp-terrain',
    arena: 'grp-terrain',
    agua: 'grp-elements',
    lava: 'grp-elements',
    cielo: 'grp-elements',
    nubes: 'grp-elements',
    edificios: 'grp-urban',
    decoracion: 'grp-urban',
  };

  const tiles: TileItem[] = TILE_CATEGORIES.map((cat, idx) => ({
    id: `tile-${cat.id}-${idx}`,
    name: cat.label,
    category: cat.id,
    groupId: categoryToGroup[cat.id],
    width: sz,
    height: sz,
    pixels: generateCategoryTilePixels(cat.id, sz, 15),
    autotileSupported: true,
    tags: [cat.id, cat.label.toLowerCase()],
  }));

  return [
    {
      id: 'ts-stage-arcade',
      name: 'Stage Pack Arcade',
      tileSize: sz,
      description: 'Colección base para escenarios de lucha, plataformas y tilesets autotile.',
      createdAt: new Date().toISOString(),
      groups,
      tiles,
    },
  ];
}

export function stampTilePixelsOntoGrid(
  grid: (string | null)[][],
  tileX: number,
  tileY: number,
  tileSize: number,
  tilePixels: (string | null)[][],
  canvasWidth: number,
  canvasHeight: number
): void {
  const startX = tileX * tileSize;
  const startY = tileY * tileSize;
  const tw = tilePixels[0]?.length || tileSize;
  const th = tilePixels.length || tileSize;

  for (let py = 0; py < tileSize; py++) {
    const gy = startY + py;
    if (gy < 0 || gy >= canvasHeight) continue;
    const row = grid[gy];
    if (!row) continue;
    const srcRow = tilePixels[py % th];
    if (!srcRow) continue;
    for (let px = 0; px < tileSize; px++) {
      const gx = startX + px;
      if (gx < 0 || gx >= canvasWidth) continue;
      row[gx] = srcRow[px % tw] ?? null;
    }
  }
}

export function clearTileCellOnGrid(
  grid: (string | null)[][],
  tileX: number,
  tileY: number,
  tileSize: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  const startX = tileX * tileSize;
  const startY = tileY * tileSize;
  for (let py = 0; py < tileSize; py++) {
    const gy = startY + py;
    if (gy < 0 || gy >= canvasHeight) continue;
    const row = grid[gy];
    if (!row) continue;
    for (let px = 0; px < tileSize; px++) {
      const gx = startX + px;
      if (gx < 0 || gx >= canvasWidth) continue;
      row[gx] = null;
    }
  }
}

export function computeTileBitmask(
  tileMapData: Record<string, string>,
  tx: number,
  ty: number,
  targetKey: string
): number {
  let mask = 0;
  if (tileMapData[`${tx},${ty - 1}`] === targetKey) mask |= 1; // North
  if (tileMapData[`${tx + 1},${ty}`] === targetKey) mask |= 2; // East
  if (tileMapData[`${tx},${ty + 1}`] === targetKey) mask |= 4; // South
  if (tileMapData[`${tx - 1},${ty}`] === targetKey) mask |= 8; // West
  return mask;
}

export function updateAutotileAroundCell(
  grid: (string | null)[][],
  tileMapData: Record<string, string>,
  tx: number,
  ty: number,
  tileSize: number,
  canvasWidth: number,
  canvasHeight: number,
  findTileByKey: (key: string) => TileItem | undefined
): void {
  const neighbors: [number, number][] = [
    [tx, ty],
    [tx, ty - 1],
    [tx + 1, ty],
    [tx, ty + 1],
    [tx - 1, ty],
  ];
  for (const [cx, cy] of neighbors) {
    const key = tileMapData[`${cx},${cy}`];
    if (!key) continue;
    const tile = findTileByKey(key);
    if (!tile) continue;
    const mask = computeTileBitmask(tileMapData, cx, cy, key);
    const resolvedPixels = tile.autotileSupported
      ? generateCategoryTilePixels(tile.category, tileSize, mask)
      : tile.pixels;
    stampTilePixelsOntoGrid(grid, cx, cy, tileSize, resolvedPixels, canvasWidth, canvasHeight);
  }
}

export function smartFillTilesOnGrid(
  grid: (string | null)[][],
  tileMapData: Record<string, string>,
  startTx: number,
  startTy: number,
  newTileKey: string,
  tile: TileItem,
  tileSize: number,
  canvasWidth: number,
  canvasHeight: number,
  autotile: boolean,
  findTileByKey: (key: string) => TileItem | undefined
): number {
  const cols = Math.max(1, Math.ceil(canvasWidth / tileSize));
  const rows = Math.max(1, Math.ceil(canvasHeight / tileSize));
  if (startTx < 0 || startTy < 0 || startTx >= cols || startTy >= rows) return 0;

  const targetKey = tileMapData[`${startTx},${startTy}`] || '';
  if (targetKey === newTileKey) return 0;

  const queue: [number, number][] = [[startTx, startTy]];
  const visited = new Set<string>();
  const changed: [number, number][] = [];
  const maxCells = Math.min(cols * rows, 4096);

  while (queue.length > 0 && changed.length < maxCells) {
    const [cx, cy] = queue.pop()!;
    const coord = `${cx},${cy}`;
    if (visited.has(coord)) continue;
    visited.add(coord);
    const curKey = tileMapData[coord] || '';
    if (curKey !== targetKey) continue;

    tileMapData[coord] = newTileKey;
    changed.push([cx, cy]);

    if (cx + 1 < cols) queue.push([cx + 1, cy]);
    if (cx - 1 >= 0) queue.push([cx - 1, cy]);
    if (cy + 1 < rows) queue.push([cx, cy + 1]);
    if (cy - 1 >= 0) queue.push([cx, cy - 1]);
  }

  for (const [cx, cy] of changed) {
    if (autotile) {
      updateAutotileAroundCell(grid, tileMapData, cx, cy, tileSize, canvasWidth, canvasHeight, findTileByKey);
    } else {
      stampTilePixelsOntoGrid(grid, cx, cy, tileSize, tile.pixels, canvasWidth, canvasHeight);
    }
  }
  return changed.length;
}

export function replaceMatchingTilesOnGrid(
  grid: (string | null)[][],
  tileMapData: Record<string, string>,
  targetKey: string,
  replacementKey: string,
  replacementTile: TileItem,
  tileSize: number,
  canvasWidth: number,
  canvasHeight: number,
  autotile: boolean,
  findTileByKey: (key: string) => TileItem | undefined
): number {
  if (!targetKey || targetKey === replacementKey) return 0;
  const coordsToUpdate: [number, number][] = [];
  for (const [coord, key] of Object.entries(tileMapData)) {
    if (key === targetKey) {
      const [xs, ys] = coord.split(',');
      const cx = parseInt(xs, 10);
      const cy = parseInt(ys, 10);
      if (Number.isFinite(cx) && Number.isFinite(cy)) {
        tileMapData[coord] = replacementKey;
        coordsToUpdate.push([cx, cy]);
      }
    }
  }
  for (const [cx, cy] of coordsToUpdate) {
    if (autotile) {
      updateAutotileAroundCell(grid, tileMapData, cx, cy, tileSize, canvasWidth, canvasHeight, findTileByKey);
    } else {
      stampTilePixelsOntoGrid(grid, cx, cy, tileSize, replacementTile.pixels, canvasWidth, canvasHeight);
    }
  }
  return coordsToUpdate.length;
}

export function captureTilePixelsFromGrid(
  grid: (string | null)[][],
  startX: number,
  startY: number,
  tileSize: number
): (string | null)[][] {
  const out: (string | null)[][] = [];
  for (let y = 0; y < tileSize; y++) {
    const row: (string | null)[] = [];
    const srcRow = grid[startY + y];
    for (let x = 0; x < tileSize; x++) {
      row.push(srcRow?.[startX + x] ?? null);
    }
    out.push(row);
  }
  return out;
}

export function renderTileThumbnailDataUrl(tile: TileItem, outSize: number = 32): string {
  const canvas = document.createElement('canvas');
  canvas.width = outSize;
  canvas.height = outSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.imageSmoothingEnabled = false;
  const tw = Math.max(1, tile.width);
  const th = Math.max(1, tile.height);
  const scaleX = outSize / tw;
  const scaleY = outSize / th;
  for (let y = 0; y < th; y++) {
    const row = tile.pixels[y];
    if (!row) continue;
    for (let x = 0; x < tw; x++) {
      const c = row[x];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(Math.floor(x * scaleX), Math.floor(y * scaleY), Math.ceil(scaleX), Math.ceil(scaleY));
    }
  }
  return canvas.toDataURL('image/png');
}

export async function sliceImageFileToTileset(
  file: File,
  tileSize: number
): Promise<TilesetCollection> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const ctx = off.getContext('2d');
    if (!ctx) throw new Error('No 2D context');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, w, h).data;

    const cols = Math.max(1, Math.floor(w / tileSize));
    const rows = Math.max(1, Math.floor(h / tileSize));
    const tiles: TileItem[] = [];
    const baseName = file.name.replace(/\.[^/.]+$/, '');

    for (let ty = 0; ty < rows; ty++) {
      for (let tx = 0; tx < cols; tx++) {
        const pixels: (string | null)[][] = [];
        let hasOpaque = false;
        for (let py = 0; py < tileSize; py++) {
          const row: (string | null)[] = [];
          for (let px = 0; px < tileSize; px++) {
            const idx = ((ty * tileSize + py) * w + (tx * tileSize + px)) * 4;
            const a = imgData[idx + 3];
            if (a < 8) {
              row.push(null);
            } else {
              hasOpaque = true;
              const r = imgData[idx].toString(16).padStart(2, '0');
              const g = imgData[idx + 1].toString(16).padStart(2, '0');
              const b = imgData[idx + 2].toString(16).padStart(2, '0');
              row.push(`#${r}${g}${b}`);
            }
          }
          pixels.push(row);
        }
        if (hasOpaque || tiles.length < 4) {
          const idxNum = tiles.length + 1;
          tiles.push({
            id: `imp-${Date.now()}-${ty}-${tx}`,
            name: `${baseName} #${idxNum}`,
            category: 'suelo',
            groupId: 'grp-imported',
            width: tileSize,
            height: tileSize,
            pixels,
            autotileSupported: false,
          });
        }
      }
    }

    return {
      id: `ts-${Date.now()}`,
      name: baseName || 'Tileset Importado',
      tileSize,
      description: `Importado (${cols}×${rows} celdas de ${tileSize}px)`,
      createdAt: new Date().toISOString(),
      groups: [{ id: 'grp-imported', name: 'Tiles Importados', color: '#38bdf8' }],
      tiles,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function exportTilesetCollectionToPngAndJson(collection: TilesetCollection): Promise<void> {
  const count = Math.max(1, collection.tiles.length);
  const cols = Math.min(8, Math.max(1, Math.ceil(Math.sqrt(count))));
  const rows = Math.max(1, Math.ceil(count / cols));
  const sz = collection.tileSize;
  const canvas = document.createElement('canvas');
  canvas.width = cols * sz;
  canvas.height = rows * sz;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  collection.tiles.forEach((tile, index) => {
    const cx = (index % cols) * sz;
    const cy = Math.floor(index / cols) * sz;
    for (let y = 0; y < Math.min(sz, tile.pixels.length); y++) {
      const row = tile.pixels[y];
      if (!row) continue;
      for (let x = 0; x < Math.min(sz, row.length); x++) {
        const col = row[x];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(cx + x, cy + y, 1, 1);
      }
    }
  });

  const slug = collection.name.replace(/\s+/g, '_').toLowerCase() || 'tileset';
  const pngUrl = canvas.toDataURL('image/png');
  const aPng = document.createElement('a');
  aPng.href = pngUrl;
  aPng.download = `${slug}.png`;
  aPng.click();

  const metaJson = JSON.stringify(
    {
      name: collection.name,
      tileSize: collection.tileSize,
      columns: cols,
      rows,
      groups: collection.groups,
      tiles: collection.tiles.map((t, idx) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        groupId: t.groupId || null,
        col: idx % cols,
        row: Math.floor(idx / cols),
      })),
    },
    null,
    2
  );
  const jsonBlob = new Blob([metaJson], { type: 'application/json' });
  const jsonUrl = URL.createObjectURL(jsonBlob);
  const aJson = document.createElement('a');
  aJson.href = jsonUrl;
  aJson.download = `${slug}.tileset.json`;
  aJson.click();
  setTimeout(() => URL.revokeObjectURL(jsonUrl), 2500);
}
