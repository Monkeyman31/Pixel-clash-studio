import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Camera,
  Download,
  FolderPlus,
  Grid,
  LayoutGrid,
  Paintbrush,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  TileCategoryId,
  TileGroup,
  TileItem,
  TilesetCollection,
  TileToolConfig,
  ToolType,
} from '../types';
import {
  exportTilesetCollectionToPngAndJson,
  generateCategoryTilePixels,
  renderTileThumbnailDataUrl,
  sliceImageFileToTileset,
  TILE_CATEGORIES,
} from '../utils/tilesetEngine';

interface TilesetEditorPanelProps {
  tilesets: TilesetCollection[];
  onChangeTilesets: (next: TilesetCollection[]) => void;
  tileToolConfig: TileToolConfig;
  onChangeTileToolConfig: (next: TileToolConfig) => void;
  onSelectTool?: (tool: ToolType) => void;
  onCaptureTileFromCanvas?: (tileSize: number) => (string | null)[][] | null;
  onNotify?: (msg: string) => void;
}

const TILE_SIZES = [8, 16, 24, 32, 48, 64];

export const TilesetEditorPanel: React.FC<TilesetEditorPanelProps> = ({
  tilesets,
  onChangeTilesets,
  tileToolConfig,
  onChangeTileToolConfig,
  onSelectTool,
  onCaptureTileFromCanvas,
  onNotify,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<TileCategoryId | 'all'>('all');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [showNewTilesetForm, setShowNewTilesetForm] = useState(false);
  const [newTilesetName, setNewTilesetName] = useState('');
  const [newTilesetSize, setNewTilesetSize] = useState<number>(tileToolConfig.tileSize || 16);
  const [showNewGroupForm, setShowNewGroupForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newTileCategory, setNewTileCategory] = useState<TileCategoryId>('cesped');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeTileset = useMemo(
    () =>
      tilesets.find((ts) => ts.id === tileToolConfig.activeTilesetId) ||
      tilesets[0] ||
      null,
    [tilesets, tileToolConfig.activeTilesetId]
  );

  const activeTile = useMemo(
    () =>
      activeTileset?.tiles.find((t) => t.id === tileToolConfig.activeTileId) ||
      activeTileset?.tiles[0] ||
      null,
    [activeTileset, tileToolConfig.activeTileId]
  );

  const thumbCache = useMemo(() => {
    const map = new Map<string, string>();
    if (!activeTileset) return map;
    for (const tile of activeTileset.tiles) {
      map.set(tile.id, renderTileThumbnailDataUrl(tile, 36));
    }
    return map;
  }, [activeTileset]);

  const filteredTiles = useMemo(() => {
    if (!activeTileset) return [];
    return activeTileset.tiles.filter((tile) => {
      if (selectedCategory !== 'all' && tile.category !== selectedCategory) return false;
      if (selectedGroupId !== 'all' && tile.groupId !== selectedGroupId) return false;
      return true;
    });
  }, [activeTileset, selectedCategory, selectedGroupId]);

  const updateActiveTileset = (updater: (ts: TilesetCollection) => TilesetCollection) => {
    if (!activeTileset) return;
    onChangeTilesets(
      tilesets.map((ts) => (ts.id === activeTileset.id ? updater(ts) : ts))
    );
  };

  const handleSelectTile = (tile: TileItem) => {
    if (!activeTileset) return;
    onChangeTileToolConfig({
      ...tileToolConfig,
      activeTilesetId: activeTileset.id,
      activeTileId: tile.id,
      tileSize: activeTileset.tileSize,
      mode: tileToolConfig.mode === 'erase' ? 'draw' : tileToolConfig.mode,
    });
    onSelectTool?.('tile');
  };

  const handleCreateTileset = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newTilesetName.trim() || `Tileset ${tilesets.length + 1}`;
    const sz = Math.max(8, Math.min(64, newTilesetSize));
    const starterTile: TileItem = {
      id: `tile-${Date.now()}-0`,
      name: `${TILE_CATEGORIES.find((c) => c.id === newTileCategory)?.label || 'Tile'} Base`,
      category: newTileCategory,
      groupId: 'grp-base',
      width: sz,
      height: sz,
      pixels: generateCategoryTilePixels(newTileCategory, sz, 15),
      autotileSupported: true,
    };
    const created: TilesetCollection = {
      id: `ts-${Date.now()}`,
      name: cleanName,
      tileSize: sz,
      createdAt: new Date().toISOString(),
      groups: [{ id: 'grp-base', name: 'Base', color: '#10b981' }],
      tiles: [starterTile],
    };
    onChangeTilesets([created, ...tilesets]);
    onChangeTileToolConfig({
      ...tileToolConfig,
      activeTilesetId: created.id,
      activeTileId: starterTile.id,
      tileSize: sz,
    });
    setNewTilesetName('');
    setShowNewTilesetForm(false);
    setSelectedCategory('all');
    setSelectedGroupId('all');
    onNotify?.(`Tileset "${created.name}" (${sz}×${sz}px) creado.`);
  };

  const handleImportTilesetFile = async (file: File) => {
    try {
      const sz = tileToolConfig.tileSize || 16;
      const imported = await sliceImageFileToTileset(file, sz);
      onChangeTilesets([imported, ...tilesets]);
      const firstTile = imported.tiles[0];
      if (firstTile) {
        onChangeTileToolConfig({
          ...tileToolConfig,
          activeTilesetId: imported.id,
          activeTileId: firstTile.id,
          tileSize: imported.tileSize,
        });
      }
      setSelectedCategory('all');
      setSelectedGroupId('all');
      onNotify?.(`Tileset importado: ${imported.name} (${imported.tiles.length} tiles de ${sz}×${sz}px).`);
    } catch {
      onNotify?.('No se pudo importar la hoja de tileset seleccionada.');
    }
  };

  const handleExportTileset = async () => {
    if (!activeTileset) return;
    await exportTilesetCollectionToPngAndJson(activeTileset);
    onNotify?.(`Exportado "${activeTileset.name}" (.png + .tileset.json).`);
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTileset) return;
    const clean = newGroupName.trim();
    if (!clean) return;
    const palette = ['#22c55e', '#38bdf8', '#f59e0b', '#a855f7', '#f43f5e'];
    const grp: TileGroup = {
      id: `grp-${Date.now()}`,
      name: clean,
      color: palette[activeTileset.groups.length % palette.length],
    };
    updateActiveTileset((ts) => ({ ...ts, groups: [...ts.groups, grp] }));
    setSelectedGroupId(grp.id);
    setNewGroupName('');
    setShowNewGroupForm(false);
  };

  const handleAddGeneratedTile = (cat: TileCategoryId) => {
    if (!activeTileset) return;
    const meta = TILE_CATEGORIES.find((c) => c.id === cat) || TILE_CATEGORIES[0];
    const sz = activeTileset.tileSize;
    const newTile: TileItem = {
      id: `tile-${cat}-${Date.now()}`,
      name: `${meta.label} #${activeTileset.tiles.length + 1}`,
      category: cat,
      groupId: selectedGroupId !== 'all' ? selectedGroupId : activeTileset.groups[0]?.id || null,
      width: sz,
      height: sz,
      pixels: generateCategoryTilePixels(cat, sz, 15),
      autotileSupported: true,
    };
    updateActiveTileset((ts) => ({ ...ts, tiles: [...ts.tiles, newTile] }));
    onChangeTileToolConfig({
      ...tileToolConfig,
      activeTilesetId: activeTileset.id,
      activeTileId: newTile.id,
      tileSize: sz,
    });
  };

  const handleCaptureFromCanvas = () => {
    if (!activeTileset || !onCaptureTileFromCanvas) return;
    const sz = activeTileset.tileSize;
    const captured = onCaptureTileFromCanvas(sz);
    if (!captured) {
      onNotify?.('No hay contenido en el lienzo para capturar como tile.');
      return;
    }
    const cat: TileCategoryId = selectedCategory === 'all' ? newTileCategory : selectedCategory;
    const newTile: TileItem = {
      id: `tile-cap-${Date.now()}`,
      name: `Captura ${sz}×${sz} #${activeTileset.tiles.length + 1}`,
      category: cat,
      groupId: selectedGroupId !== 'all' ? selectedGroupId : activeTileset.groups[0]?.id || null,
      width: sz,
      height: sz,
      pixels: captured,
      autotileSupported: false,
    };
    updateActiveTileset((ts) => ({ ...ts, tiles: [...ts.tiles, newTile] }));
    onChangeTileToolConfig({
      ...tileToolConfig,
      activeTilesetId: activeTileset.id,
      activeTileId: newTile.id,
      tileSize: sz,
    });
    onSelectTool?.('tile');
    onNotify?.(`Tile de ${sz}×${sz}px capturado desde la capa activa.`);
  };

  const handleMoveTile = (tileId: string, dir: -1 | 1) => {
    if (!activeTileset) return;
    const idx = activeTileset.tiles.findIndex((t) => t.id === tileId);
    if (idx < 0) return;
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= activeTileset.tiles.length) return;
    updateActiveTileset((ts) => {
      const next = [...ts.tiles];
      const [item] = next.splice(idx, 1);
      next.splice(targetIdx, 0, item);
      return { ...ts, tiles: next };
    });
  };

  const handleAssignActiveTileCategory = (cat: TileCategoryId) => {
    if (!activeTileset || !activeTile) return;
    updateActiveTileset((ts) => ({
      ...ts,
      tiles: ts.tiles.map((t) => (t.id === activeTile.id ? { ...t, category: cat } : t)),
    }));
  };

  const handleAssignActiveTileGroup = (groupId: string) => {
    if (!activeTileset || !activeTile) return;
    updateActiveTileset((ts) => ({
      ...ts,
      tiles: ts.tiles.map((t) =>
        t.id === activeTile.id ? { ...t, groupId: groupId === 'none' ? null : groupId } : t
      ),
    }));
  };

  const handleDeleteTile = (tileId: string) => {
    if (!activeTileset || activeTileset.tiles.length <= 1) return;
    const remaining = activeTileset.tiles.filter((t) => t.id !== tileId);
    updateActiveTileset((ts) => ({ ...ts, tiles: remaining }));
    if (tileToolConfig.activeTileId === tileId && remaining[0]) {
      onChangeTileToolConfig({ ...tileToolConfig, activeTileId: remaining[0].id });
    }
  };

  return (
    <div className="flex flex-col gap-3 text-[11px]" style={{ color: 'var(--studio-text)' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/webp,image/gif,image/jpeg"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleImportTilesetFile(f);
          e.target.value = '';
        }}
      />

      {/* Active Tileset Collection Bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider opacity-75">
            Colección Tileset
          </span>
          <span className="text-[10px] font-mono tabular-nums opacity-70">
            {activeTileset ? `${activeTileset.tiles.length} tiles · ${activeTileset.tileSize}px` : '0 tiles'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <select
            value={activeTileset?.id || ''}
            onChange={(e) => {
              const target = tilesets.find((ts) => ts.id === e.target.value);
              if (!target) return;
              onChangeTileToolConfig({
                ...tileToolConfig,
                activeTilesetId: target.id,
                activeTileId: target.tiles[0]?.id || '',
                tileSize: target.tileSize,
              });
            }}
            className="flex-1 h-7 px-2 rounded border text-[11px] font-medium outline-none min-w-0"
            style={{
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: 'var(--studio-border-strong)',
              color: 'var(--studio-text)',
            }}
          >
            {tilesets.map((ts) => (
              <option key={ts.id} value={ts.id} style={{ backgroundColor: '#131722' }}>
                {ts.name} ({ts.tileSize}×{ts.tileSize})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowNewTilesetForm((v) => !v)}
            title="Crear nuevo Tileset"
            className="h-7 px-2 rounded border text-[10px] font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 hover:bg-white/5"
            style={{
              backgroundColor: showNewTilesetForm ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
              color: showNewTilesetForm ? 'var(--studio-accent-text)' : 'var(--studio-text)',
              borderColor: showNewTilesetForm ? 'var(--studio-accent)' : 'var(--studio-border)',
            }}
          >
            <Plus className="w-3 h-3" />
            <span>Crear</span>
          </button>
        </div>

        {/* Import / Export / Activate Tool */}
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-7 px-1.5 rounded border text-[10px] font-medium flex items-center justify-center gap-1 whitespace-nowrap hover:bg-white/5"
            style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
            title="Importar hoja de tiles (PNG/WEBP/GIF)"
          >
            <Upload className="w-3 h-3 text-sky-400" />
            <span>Importar</span>
          </button>
          <button
            type="button"
            onClick={() => void handleExportTileset()}
            disabled={!activeTileset}
            className="h-7 px-1.5 rounded border text-[10px] font-medium flex items-center justify-center gap-1 whitespace-nowrap hover:bg-white/5 disabled:opacity-40"
            style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
            title="Exportar Tileset (.png + .tileset.json)"
          >
            <Download className="w-3 h-3 text-emerald-400" />
            <span>Exportar</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectTool?.('tile')}
            className="h-7 px-1.5 rounded border text-[10px] font-semibold flex items-center justify-center gap-1 whitespace-nowrap"
            style={{
              backgroundColor: 'rgba(16,185,129,0.16)',
              borderColor: 'rgba(16,185,129,0.45)',
              color: '#6ee7b7',
            }}
            title="Activar Herramienta Tiles en el lienzo (Shift+T)"
          >
            <Paintbrush className="w-3 h-3" />
            <span>Pintar</span>
          </button>
        </div>
      </div>

      {/* Inline Create Tileset Form */}
      {showNewTilesetForm && (
        <form
          onSubmit={handleCreateTileset}
          className="p-2.5 rounded-lg border flex flex-col gap-2"
          style={{
            backgroundColor: 'var(--studio-bg-elevated)',
            borderColor: 'var(--studio-border-strong)',
          }}
        >
          <div className="text-[10px] font-semibold">Nuevo Tileset</div>
          <input
            type="text"
            value={newTilesetName}
            onChange={(e) => setNewTilesetName(e.target.value)}
            placeholder="Nombre (ej. Templo Piedra)"
            className="h-7 px-2 rounded border text-[11px] outline-none"
            style={{
              backgroundColor: 'var(--studio-bg-card)',
              borderColor: 'var(--studio-border)',
              color: 'var(--studio-text)',
            }}
          />
          <div className="flex items-center gap-1.5">
            <select
              value={newTilesetSize}
              onChange={(e) => setNewTilesetSize(Number(e.target.value) || 16)}
              className="h-7 px-2 rounded border text-[10px] font-mono outline-none"
              style={{
                backgroundColor: 'var(--studio-bg-card)',
                borderColor: 'var(--studio-border)',
                color: 'var(--studio-text)',
              }}
            >
              {TILE_SIZES.map((sz) => (
                <option key={sz} value={sz} style={{ backgroundColor: '#131722' }}>
                  {sz}×{sz} px
                </option>
              ))}
            </select>
            <select
              value={newTileCategory}
              onChange={(e) => setNewTileCategory(e.target.value as TileCategoryId)}
              className="flex-1 h-7 px-2 rounded border text-[10px] outline-none"
              style={{
                backgroundColor: 'var(--studio-bg-card)',
                borderColor: 'var(--studio-border)',
                color: 'var(--studio-text)',
              }}
            >
              {TILE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id} style={{ backgroundColor: '#131722' }}>
                  {c.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-7 px-2.5 rounded text-[10px] font-semibold whitespace-nowrap"
              style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
            >
              Crear
            </button>
          </div>
        </form>
      )}

      {/* Tile Groups Filter & Creation */}
      {activeTileset && (
        <div className="flex flex-col gap-1.5 pt-2 border-t" style={{ borderColor: 'var(--studio-border)' }}>
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider opacity-75">
              Grupos de Tiles
            </span>
            <button
              type="button"
              onClick={() => setShowNewGroupForm((v) => !v)}
              className="text-[10px] font-medium flex items-center gap-1 opacity-80 hover:opacity-100 whitespace-nowrap"
            >
              <FolderPlus className="w-3 h-3 text-amber-400" />
              <span>Nuevo Grupo</span>
            </button>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
            <button
              type="button"
              onClick={() => setSelectedGroupId('all')}
              className="h-6 px-2 rounded text-[10px] font-medium whitespace-nowrap shrink-0 border"
              style={{
                backgroundColor: selectedGroupId === 'all' ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                color: selectedGroupId === 'all' ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                borderColor: selectedGroupId === 'all' ? 'var(--studio-accent)' : 'var(--studio-border)',
              }}
            >
              Todos
            </button>
            {activeTileset.groups.map((grp) => {
              const active = selectedGroupId === grp.id;
              return (
                <button
                  key={grp.id}
                  type="button"
                  onClick={() => setSelectedGroupId(grp.id)}
                  className="h-6 px-2 rounded text-[10px] font-medium whitespace-nowrap shrink-0 border"
                  style={{
                    backgroundColor: active ? 'var(--studio-bg-card)' : 'var(--studio-bg-elevated)',
                    color: active ? 'var(--studio-text)' : 'var(--studio-text-muted)',
                    borderColor: active ? grp.color : 'var(--studio-border)',
                  }}
                >
                  {grp.name}
                </button>
              );
            })}
          </div>

          {showNewGroupForm && (
            <form onSubmit={handleCreateGroup} className="flex items-center gap-1">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Nombre del grupo..."
                className="flex-1 h-6 px-2 rounded border text-[10px] outline-none"
                style={{
                  backgroundColor: 'var(--studio-bg-elevated)',
                  borderColor: 'var(--studio-border-strong)',
                  color: 'var(--studio-text)',
                }}
              />
              <button
                type="submit"
                className="h-6 px-2 rounded text-[10px] font-semibold whitespace-nowrap"
                style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
              >
                Añadir
              </button>
            </form>
          )}
        </div>
      )}

      {/* 11 Tile Categories Filter Bar */}
      <div className="flex flex-col gap-1 pt-2 border-t" style={{ borderColor: 'var(--studio-border)' }}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider opacity-75">
            Categorías (11)
          </span>
          {onCaptureTileFromCanvas && (
            <button
              type="button"
              onClick={handleCaptureFromCanvas}
              className="text-[10px] font-medium flex items-center gap-1 text-sky-300 hover:text-sky-200 whitespace-nowrap"
              title={`Captura ${activeTileset?.tileSize || 16}×${activeTileset?.tileSize || 16}px desde la capa actual`}
            >
              <Camera className="w-3 h-3" />
              <span>Capturar Capa</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className="h-6 px-2 rounded border text-[10px] font-medium whitespace-nowrap"
            style={{
              backgroundColor: selectedCategory === 'all' ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
              color: selectedCategory === 'all' ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
              borderColor: selectedCategory === 'all' ? 'var(--studio-accent)' : 'var(--studio-border)',
            }}
          >
            Todas
          </button>
          {TILE_CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className="h-6 px-2 rounded border text-[10px] font-medium whitespace-nowrap"
                style={{
                  backgroundColor: active ? `color-mix(in srgb, ${cat.accent} 24%, var(--studio-bg-elevated))` : 'var(--studio-bg-elevated)',
                  color: active ? 'var(--studio-text)' : 'var(--studio-text-muted)',
                  borderColor: active ? cat.accent : 'var(--studio-border)',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tile Palette Grid */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider opacity-75">
            Paleta de Tiles
          </span>
          <button
            type="button"
            onClick={() =>
              handleAddGeneratedTile(selectedCategory === 'all' ? newTileCategory : selectedCategory)
            }
            className="text-[10px] font-medium flex items-center gap-1 text-emerald-300 hover:text-emerald-200 whitespace-nowrap"
          >
            <Plus className="w-3 h-3" />
            <span>Añadir Tile</span>
          </button>
        </div>

        {filteredTiles.length === 0 ? (
          <div
            className="p-3 rounded-lg border text-center flex flex-col items-center gap-1.5"
            style={{ borderColor: 'var(--studio-border)', backgroundColor: 'var(--studio-bg-elevated)' }}
          >
            <LayoutGrid className="w-5 h-5 opacity-40" />
            <span className="text-[10px] opacity-70">No hay tiles en esta categoría o grupo.</span>
            <button
              type="button"
              onClick={() =>
                handleAddGeneratedTile(selectedCategory === 'all' ? 'suelo' : selectedCategory)
              }
              className="h-6 px-2.5 rounded text-[10px] font-semibold"
              style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
            >
              Generar Tile
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-1.5 max-h-56 overflow-y-auto pr-0.5">
            {filteredTiles.map((tile) => {
              const isSelected = activeTile?.id === tile.id;
              const thumb = thumbCache.get(tile.id);
              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => handleSelectTile(tile)}
                  title={`${tile.name} (${tile.width}×${tile.height}) · ${
                    TILE_CATEGORIES.find((c) => c.id === tile.category)?.label || tile.category
                  }`}
                  className="aspect-square rounded border p-1 flex items-center justify-center relative transition-colors"
                  style={{
                    backgroundColor: 'var(--studio-bg-card)',
                    borderColor: isSelected ? '#10b981' : 'var(--studio-border)',
                    boxShadow: isSelected ? 'inset 0 0 0 1px #10b981' : undefined,
                  }}
                >
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={tile.name}
                      className="w-full h-full object-contain"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  ) : (
                    <Grid className="w-4 h-4 opacity-40" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Tile Inspector & Organization */}
      {activeTile && activeTileset && (
        <div
          className="p-2.5 rounded-lg border flex flex-col gap-2"
          style={{ borderColor: 'var(--studio-border)', backgroundColor: 'var(--studio-bg-elevated)' }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded border p-0.5 shrink-0 flex items-center justify-center"
              style={{ borderColor: 'var(--studio-border-strong)', backgroundColor: 'var(--studio-bg-card)' }}
            >
              {thumbCache.get(activeTile.id) && (
                <img
                  src={thumbCache.get(activeTile.id)}
                  alt={activeTile.name}
                  className="w-full h-full object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold truncate">{activeTile.name}</div>
              <div className="text-[10px] opacity-70 font-mono tabular-nums">
                {activeTile.width}×{activeTile.height}px ·{' '}
                {activeTile.autotileSupported ? 'Autotile 4-bit' : 'Estático'}
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => handleMoveTile(activeTile.id, -1)}
                title="Subir en orden"
                className="w-6 h-6 rounded border flex items-center justify-center hover:bg-white/5"
                style={{ borderColor: 'var(--studio-border)' }}
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => handleMoveTile(activeTile.id, 1)}
                title="Bajar en orden"
                className="w-6 h-6 rounded border flex items-center justify-center hover:bg-white/5"
                style={{ borderColor: 'var(--studio-border)' }}
              >
                <ArrowDown className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTile(activeTile.id)}
                disabled={activeTileset.tiles.length <= 1}
                title="Eliminar tile"
                className="w-6 h-6 rounded border flex items-center justify-center hover:bg-rose-500/20 disabled:opacity-35"
                style={{ borderColor: 'var(--studio-border)' }}
              >
                <Trash2 className="w-3 h-3 text-rose-400" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <label className="flex flex-col gap-0.5 text-[10px]">
              <span className="opacity-70">Categoría</span>
              <select
                value={activeTile.category}
                onChange={(e) => handleAssignActiveTileCategory(e.target.value as TileCategoryId)}
                className="h-6 px-1.5 rounded border text-[10px] outline-none"
                style={{
                  backgroundColor: 'var(--studio-bg-card)',
                  borderColor: 'var(--studio-border)',
                  color: 'var(--studio-text)',
                }}
              >
                {TILE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id} style={{ backgroundColor: '#131722' }}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-0.5 text-[10px]">
              <span className="opacity-70">Grupo</span>
              <select
                value={activeTile.groupId || 'none'}
                onChange={(e) => handleAssignActiveTileGroup(e.target.value)}
                className="h-6 px-1.5 rounded border text-[10px] outline-none"
                style={{
                  backgroundColor: 'var(--studio-bg-card)',
                  borderColor: 'var(--studio-border)',
                  color: 'var(--studio-text)',
                }}
              >
                <option value="none" style={{ backgroundColor: '#131722' }}>
                  Sin grupo
                </option>
                {activeTileset.groups.map((g) => (
                  <option key={g.id} value={g.id} style={{ backgroundColor: '#131722' }}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
