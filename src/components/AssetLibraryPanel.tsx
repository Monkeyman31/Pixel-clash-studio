import React, { useEffect, useRef, useState } from 'react';
import {
  BookmarkPlus,
  Sparkles,
  Plus,
  Trash2,
  Layers,
  Check,
  FolderHeart,
  Upload,
  Search,
  Star,
  FolderPlus,
  Volume2,
  Square,
  Info,
  Tag,
  X,
} from 'lucide-react';
import {
  AssetCategory,
  AssetLibraryItem,
  AssetOrigin,
} from '../types';
import { createEmptyGrid } from '../utils/pixelMath';
import { ASSET_CATEGORIES } from '../utils/assetLibraryPresets';

interface AssetLibraryPanelProps {
  libraryItems: AssetLibraryItem[];
  assetFolders: string[];
  onCreateAssetFolder: (folderName: string) => void;
  onInsertLibraryItem: (
    item: AssetLibraryItem,
    mode: 'stamp' | 'new_layer',
    dropX?: number,
    dropY?: number
  ) => void;
  onSaveCurrentLayerToLibrary: (name: string, category: AssetCategory, folder?: string, tags?: string[]) => void;
  onSaveSelectionToLibrary?: (name: string, category: AssetCategory, folder?: string, tags?: string[]) => void;
  hasActiveSelection?: boolean;
  onAddAiLibraryItem: (item: AssetLibraryItem) => void;
  onAddUploadedLibraryItem: (item: AssetLibraryItem) => void;
  onUpdateLibraryItem: (id: string, patch: Partial<AssetLibraryItem>) => void;
  onDeleteLibraryItem: (id: string) => void;
  activePaletteColors: string[];
  projectName: string;
}

const AssetThumb: React.FC<{
  item: AssetLibraryItem;
  isPlayingSound: boolean;
  onTogglePlaySound: () => void;
}> = ({ item, isPlayingSound, onTogglePlaySound }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (item.category === 'sounds' && !item.pixels?.some((r) => r.some(Boolean))) return;
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    const box = 44;
    c.width = box;
    c.height = box;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, box, box);

    const cell = Math.min(box / Math.max(1, item.width), box / Math.max(1, item.height));
    const ox = (box - item.width * cell) / 2;
    const oy = (box - item.height * cell) / 2;

    for (let y = 0; y < item.height; y++) {
      for (let x = 0; x < item.width; x++) {
        const col = item.pixels[y]?.[x];
        if (col) {
          ctx.fillStyle = col;
          ctx.fillRect(
            Math.floor(ox + x * cell),
            Math.floor(oy + y * cell),
            Math.ceil(cell),
            Math.ceil(cell)
          );
        }
      }
    }
  }, [item]);

  if (item.category === 'sounds') {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onTogglePlaySound();
        }}
        title={isPlayingSound ? 'Detener sonido' : 'Reproducir sonido'}
        className="w-11 h-11 rounded border shrink-0 flex flex-col items-center justify-center gap-0.5 transition-colors"
        style={{
          backgroundColor: isPlayingSound ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
          borderColor: 'var(--studio-border-strong)',
          color: isPlayingSound ? 'var(--studio-accent-text)' : 'var(--studio-accent)',
        }}
      >
        {isPlayingSound ? <Square className="w-3.5 h-3.5 fill-current" /> : <Volume2 className="w-4 h-4" />}
        <span className="text-[8px] font-mono font-bold">AUDIO</span>
      </button>
    );
  }

  return (
    <canvas
      ref={ref}
      className="w-11 h-11 rounded border canvas-checkerboard shrink-0 pixel-canvas"
      style={{ borderColor: 'var(--studio-border)' }}
    />
  );
};

async function imageFileToPixelGrid(
  file: File,
  targetSize: number
): Promise<{ width: number; height: number; pixels: (string | null)[][]; palette: string[]; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new Image();
      img.onerror = () => reject(new Error('Imagen no válida.'));
      img.onload = () => {
        const aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
        let w = targetSize;
        let h = targetSize;
        if (aspect > 1) {
          h = Math.max(8, Math.round(targetSize / aspect));
        } else if (aspect < 1) {
          w = Math.max(8, Math.round(targetSize * aspect));
        }
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        if (!ctx) {
          reject(new Error('Contexto canvas no disponible'));
          return;
        }
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);
        const grid = createEmptyGrid(w, h);
        const colorSet = new Set<string>();
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            if (data[idx + 3] < 64) continue;
            const hex = `#${((1 << 24) + (data[idx] << 16) + (data[idx + 1] << 8) + data[idx + 2])
              .toString(16)
              .slice(1)}`;
            grid[y][x] = hex;
            if (colorSet.size < 16) colorSet.add(hex);
          }
        }
        resolve({ width: w, height: h, pixels: grid, palette: Array.from(colorSet), dataUrl });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

function readAudioAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el audio.'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });
}

function generateProceduralElement(
  prompt: string,
  category: AssetCategory,
  size: number,
  palette: string[]
): (string | null)[][] {
  const g = createEmptyGrid(size, size);
  const c1 = palette[0] || '#facc15';
  const c2 = palette[1] || '#ef4444';
  const c3 = palette[2] || '#38bdf8';
  const mid = Math.floor(size / 2);

  if (category === 'hud' || category === 'ui') {
    for (let x = 2; x < size - 2; x++) {
      g[mid - 3][x] = '#0f172a';
      g[mid + 2][x] = '#0f172a';
    }
    for (let y = mid - 2; y <= mid + 1; y++) {
      for (let x = 3; x < size - 3; x++) {
        g[y][x] = x < mid + 2 ? c1 : c2;
      }
    }
  } else if (category === 'stage') {
    for (let y = size - 5; y < size; y++) {
      for (let x = 0; x < size; x++) {
        g[y][x] = (x + y) % 2 === 0 ? '#334155' : '#1e293b';
      }
    }
    for (let y = 3; y < size - 5; y++) {
      g[y][mid - 1] = c3;
      g[y][mid] = c1;
    }
  } else if (category === 'character') {
    for (let y = 4; y < size - 4; y++) {
      for (let x = mid - 3; x <= mid + 3; x++) {
        if (Math.hypot(x - mid, y - mid) < 6) {
          g[y][x] = y < mid ? c2 : c1;
        }
      }
    }
  } else {
    const seedOffset = prompt.length % 3;
    for (let a = 0; a < 16; a++) {
      const angle = (a / 16) * Math.PI * 2;
      for (let r = 1; r <= Math.floor(size * 0.36); r++) {
        const px = Math.round(mid + Math.cos(angle) * r);
        const py = Math.round(mid + Math.sin(angle) * r);
        if (px >= 0 && px < size && py >= 0 && py < size) {
          g[py][px] = r < 3 ? '#ffffff' : (r + seedOffset) % 2 === 0 ? c1 : c3;
        }
      }
    }
  }
  return g;
}

export const AssetLibraryPanel: React.FC<AssetLibraryPanelProps> = ({
  libraryItems,
  assetFolders,
  onCreateAssetFolder,
  onInsertLibraryItem,
  onSaveCurrentLayerToLibrary,
  onSaveSelectionToLibrary,
  hasActiveSelection = false,
  onAddAiLibraryItem,
  onAddUploadedLibraryItem,
  onUpdateLibraryItem,
  onDeleteLibraryItem,
  activePaletteColors,
  projectName,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [originFilter, setOriginFilter] = useState<'all' | AssetOrigin>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | AssetCategory>('all');
  const [folderFilter, setFolderFilter] = useState<string>('all');
  const [favoritesOnly, setFavoritesOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [uploadCategory, setUploadCategory] = useState<AssetCategory>('character');
  const [uploadResolution, setUploadResolution] = useState<number>(32);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  const [newAssetName, setNewAssetName] = useState<string>('');
  const [newAssetCategory, setNewAssetCategory] = useState<AssetCategory>('character');

  const [aiPrompt, setAiPrompt] = useState<string>('Espada de energía plasma azul');
  const [aiCategory, setAiCategory] = useState<AssetCategory>('vfx');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const [showNewFolder, setShowNewFolder] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');

  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
  const [expandedMetaId, setExpandedMetaId] = useState<string | null>(null);
  const [tagDraftById, setTagDraftById] = useState<Record<string, string>>({});

  const togglePlaySound = (item: AssetLibraryItem) => {
    if (!item.mediaDataUrl) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (playingSoundId === item.id) {
      setPlayingSoundId(null);
      return;
    }
    const audio = new Audio(item.mediaDataUrl);
    audioRef.current = audio;
    setPlayingSoundId(item.id);
    audio.onended = () => setPlayingSoundId(null);
    audio.onerror = () => setPlayingSoundId(null);
    audio.play().catch(() => setPlayingSoundId(null));
  };

  const handleUploadFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    for (const file of arr) {
      const cleanName = file.name.replace(/\.[^.]+$/, '').slice(0, 28) || 'Recurso PC';
      if (file.type.startsWith('audio/') || /\.(wav|mp3|ogg)$/i.test(file.name)) {
        try {
          const dataUrl = await readAudioAsDataUrl(file);
          onAddUploadedLibraryItem({
            id: `lib-snd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: cleanName,
            category: 'sounds',
            origin: 'user',
            width: 16,
            height: 16,
            pixels: createEmptyGrid(16, 16),
            createdAt: new Date().toLocaleDateString('es-ES'),
            description: `Audio importado (${file.name})`,
            folder: folderFilter !== 'all' ? folderFilter : 'Sonidos',
            tags: ['audio', 'sfx', 'usuario'],
            favorite: false,
            mediaDataUrl: dataUrl,
            metadata: {
              author: 'Usuario (PC)',
              createdAt: new Date().toISOString().slice(0, 10),
              palette: [],
              resolution: 'Audio',
              sourceProject: projectName,
              mimeType: file.type || 'audio/wav',
            },
          });
        } catch {
          // ignore broken audio
        }
      } else if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(file.name)) {
        try {
          const parsed = await imageFileToPixelGrid(file, uploadResolution);
          onAddUploadedLibraryItem({
            id: `lib-pc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: cleanName,
            category: uploadCategory,
            origin: 'user',
            width: parsed.width,
            height: parsed.height,
            pixels: parsed.pixels,
            createdAt: new Date().toLocaleDateString('es-ES'),
            description: `Importado desde PC (${parsed.width}×${parsed.height})`,
            folder: folderFilter !== 'all' ? folderFilter : 'Mis Uploads',
            tags: [uploadCategory, 'pc', 'importado'],
            favorite: false,
            mediaDataUrl: uploadCategory === 'references' ? parsed.dataUrl : undefined,
            metadata: {
              author: 'Usuario (PC)',
              createdAt: new Date().toISOString().slice(0, 10),
              palette: parsed.palette,
              resolution: `${parsed.width}x${parsed.height}`,
              sourceProject: projectName,
              mimeType: file.type || 'image/png',
            },
          });
        } catch {
          // ignore unreadable image
        }
      }
    }
    setOriginFilter('all');
  };

  const handleGenerateAiElement = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    const size = 24;
    try {
      const res = await fetch('/api/ai/element-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          category: aiCategory,
          size,
          palette: activePaletteColors,
        }),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.pixels)) {
        throw new Error(data.error || 'Fallback procedural');
      }

      const grid = createEmptyGrid(size, size);
      const palSet = new Set<string>();
      for (const p of data.pixels) {
        if (p.x >= 0 && p.x < size && p.y >= 0 && p.y < size && p.color) {
          grid[p.y][p.x] = p.color;
          if (palSet.size < 12) palSet.add(p.color);
        }
      }

      onAddAiLibraryItem({
        id: `lib-ai-${Date.now()}`,
        name: data.name || aiPrompt.slice(0, 22),
        category: data.category || aiCategory,
        origin: 'ai',
        width: size,
        height: size,
        pixels: grid,
        createdAt: new Date().toLocaleDateString('es-ES'),
        description: data.description || aiPrompt,
        folder: folderFilter !== 'all' ? folderFilter : 'Generados IA',
        tags: [aiCategory, 'ia'],
        favorite: false,
        metadata: {
          author: 'IA Contextual',
          createdAt: new Date().toISOString().slice(0, 10),
          palette: Array.from(palSet),
          resolution: `${size}x${size}`,
          sourceProject: projectName,
        },
      });
      setOriginFilter('all');
    } catch {
      const fallbackGrid = generateProceduralElement(
        aiPrompt,
        aiCategory,
        size,
        activePaletteColors
      );
      onAddAiLibraryItem({
        id: `lib-ai-${Date.now()}`,
        name: aiPrompt.slice(0, 22),
        category: aiCategory,
        origin: 'ai',
        width: size,
        height: size,
        pixels: fallbackGrid,
        createdAt: new Date().toLocaleDateString('es-ES'),
        description: `Elemento IA (${aiCategory})`,
        folder: folderFilter !== 'all' ? folderFilter : 'Generados IA',
        tags: [aiCategory, 'ia'],
        favorite: false,
        metadata: {
          author: 'Motor Pixel Local',
          createdAt: new Date().toISOString().slice(0, 10),
          palette: activePaletteColors.slice(0, 6),
          resolution: `${size}x${size}`,
          sourceProject: projectName,
        },
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredItems = libraryItems.filter((item) => {
    if (originFilter !== 'all' && item.origin !== originFilter) return false;
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    if (folderFilter !== 'all' && (item.folder || 'General') !== folderFilter) return false;
    if (favoritesOnly && !item.favorite) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const hay = [
        item.name,
        item.category,
        item.description || '',
        item.folder || '',
        item.metadata?.author || '',
        ...(item.tags || []),
      ]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div
      className="flex flex-col gap-2.5 text-xs"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setIsDraggingFiles(true);
        }
      }}
      onDragLeave={() => setIsDraggingFiles(false)}
      onDrop={(e) => {
        setIsDraggingFiles(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          e.preventDefault();
          handleUploadFiles(e.dataTransfer.files);
        }
      }}
    >
      {/* 1. Direct PC File Upload & OS Dropzone */}
      <div
        className="p-2.5 rounded-xl border flex flex-col gap-2"
        style={{
          backgroundColor: isDraggingFiles
            ? 'color-mix(in srgb, var(--studio-accent) 16%, var(--studio-bg-card))'
            : 'var(--studio-bg-card)',
          borderColor: isDraggingFiles ? 'var(--studio-accent)' : 'var(--studio-border)',
        }}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] font-mono uppercase font-semibold flex items-center gap-1" style={{ color: 'var(--studio-text-muted)' }}>
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span>Subir desde PC (Img / Audio)</span>
          </span>
          <select
            value={uploadResolution}
            onChange={(e) => setUploadResolution(parseInt(e.target.value, 10))}
            title="Resolución destino para imágenes subidas"
            className="rounded border px-1 py-0.5 text-[9px] font-mono"
            style={{
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: 'var(--studio-border-strong)',
              color: 'var(--studio-text)',
            }}
          >
            <option value={16}>16px</option>
            <option value={24}>24px</option>
            <option value={32}>32px</option>
            <option value={48}>48px</option>
            <option value={64}>64px</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <select
            value={uploadCategory}
            onChange={(e) => setUploadCategory(e.target.value as AssetCategory)}
            className="rounded-lg border px-1.5 py-1 text-[10px] font-mono flex-1"
            style={{
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: 'var(--studio-border-strong)',
              color: 'var(--studio-text)',
            }}
          >
            {ASSET_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1"
            style={{
              backgroundColor: 'var(--studio-accent)',
              color: 'var(--studio-accent-text)',
            }}
          >
            <Upload className="w-3 h-3" />
            <span>Elegir Archivos</span>
          </button>
        </div>
        <span className="text-[9px]" style={{ color: 'var(--studio-text-muted)' }}>
          Arrastra PNG, JPG, GIF o WAV/MP3/OGG aquí. Luego arrastra un recurso al lienzo para colocarlo.
        </span>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/gif,audio/wav,audio/mpeg,audio/ogg"
          className="sr-only"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleUploadFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />
      </div>

      {/* 2. Save Active Layer / Selection to Library */}
      <div
        className="p-2 rounded-xl border flex flex-col gap-1.5"
        style={{
          backgroundColor: 'var(--studio-bg-card)',
          borderColor: 'var(--studio-border)',
        }}
      >
        <span className="text-[10px] font-mono uppercase font-semibold flex items-center gap-1" style={{ color: 'var(--studio-text-muted)' }}>
          <BookmarkPlus className="w-3.5 h-3.5 text-emerald-400" />
          <span>Guardar Capa o Selección en Librería</span>
        </span>
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={newAssetName}
            onChange={(e) => setNewAssetName(e.target.value)}
            placeholder="Nombre..."
            className="flex-1 min-w-0 rounded-lg border px-2 py-1 text-xs focus:outline-none"
            style={{
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: 'var(--studio-border-strong)',
              color: 'var(--studio-text)',
            }}
          />
          <select
            value={newAssetCategory}
            onChange={(e) => setNewAssetCategory(e.target.value as AssetCategory)}
            className="rounded-lg border px-1.5 py-1 text-[10px] font-mono"
            style={{
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: 'var(--studio-border-strong)',
              color: 'var(--studio-text)',
            }}
          >
            {ASSET_CATEGORIES.filter((c) => c.id !== 'sounds').map((c) => (
              <option key={c.id} value={c.id}>
                {c.short}
              </option>
            ))}
          </select>
        </div>
        <div className={`grid ${hasActiveSelection && onSaveSelectionToLibrary ? 'grid-cols-2' : 'grid-cols-1'} gap-1`}>
          <button
            type="button"
            onClick={() => {
              onSaveCurrentLayerToLibrary(
                newAssetName.trim() || 'Mi Elemento',
                newAssetCategory,
                folderFilter !== 'all' ? folderFilter : 'General'
              );
              setNewAssetName('');
            }}
            className="py-1 px-2 rounded-lg border font-semibold text-[10px] flex items-center justify-center gap-1"
            style={{
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: 'var(--studio-border-strong)',
              color: 'var(--studio-text)',
            }}
          >
            <Plus className="w-3 h-3 text-emerald-400" />
            <span>Guardar Capa</span>
          </button>
          {hasActiveSelection && onSaveSelectionToLibrary && (
            <button
              type="button"
              onClick={() => {
                onSaveSelectionToLibrary(
                  newAssetName.trim() || 'Recorte',
                  newAssetCategory,
                  folderFilter !== 'all' ? folderFilter : 'General'
                );
                setNewAssetName('');
              }}
              className="py-1 px-2 rounded-lg border font-semibold text-[10px] flex items-center justify-center gap-1"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            >
              <Check className="w-3 h-3 text-sky-400" />
              <span>Guardar Recorte</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Quick AI Asset Generator */}
      <div
        className="p-2 rounded-xl border flex flex-col gap-1.5"
        style={{
          backgroundColor: 'color-mix(in srgb, #6366f1 10%, var(--studio-bg-card))',
          borderColor: 'color-mix(in srgb, #6366f1 35%, var(--studio-border))',
        }}
      >
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Prompt recurso IA..."
            className="flex-1 min-w-0 rounded-lg border px-2 py-1 text-xs focus:outline-none"
            style={{
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: 'var(--studio-border-strong)',
              color: 'var(--studio-text)',
            }}
          />
          <select
            value={aiCategory}
            onChange={(e) => setAiCategory(e.target.value as AssetCategory)}
            className="rounded-lg border px-1.5 py-1 text-[10px] font-mono"
            style={{
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: 'var(--studio-border-strong)',
              color: 'var(--studio-text)',
            }}
          >
            {ASSET_CATEGORIES.filter((c) => c.id !== 'sounds').map((c) => (
              <option key={c.id} value={c.id}>
                {c.short}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleGenerateAiElement}
          disabled={isGenerating}
          className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <Sparkles className="w-3 h-3" />
          <span>{isGenerating ? 'Generando...' : 'Generar Recurso IA para Browser'}</span>
        </button>
      </div>

      {/* 4. Search, Folders, Favorites, Origin & 9 Categories */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] font-mono uppercase font-semibold flex items-center gap-1" style={{ color: 'var(--studio-text-muted)' }}>
            <FolderHeart className="w-3.5 h-3.5" style={{ color: 'var(--studio-accent)' }} />
            <span>Asset Browser ({filteredItems.length})</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFavoritesOnly((v) => !v)}
              title="Solo favoritos"
              className="px-1.5 py-0.5 rounded border text-[10px] flex items-center gap-1"
              style={{
                backgroundColor: favoritesOnly ? 'rgba(245, 158, 11, 0.2)' : 'var(--studio-bg-card)',
                borderColor: favoritesOnly ? '#f59e0b' : 'var(--studio-border)',
                color: favoritesOnly ? '#fbbf24' : 'var(--studio-text-muted)',
              }}
            >
              <Star className={`w-3 h-3 ${favoritesOnly ? 'fill-amber-400' : ''}`} />
              <span>Fav</span>
            </button>
            <button
              type="button"
              onClick={() => setShowNewFolder((v) => !v)}
              title="Crear carpeta en librería"
              className="p-1 rounded border"
              style={{
                backgroundColor: 'var(--studio-bg-card)',
                borderColor: 'var(--studio-border)',
                color: 'var(--studio-text-muted)',
              }}
            >
              <FolderPlus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {showNewFolder && (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nueva carpeta..."
              className="flex-1 px-2 py-1 rounded border text-[11px]"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: 'var(--studio-accent)',
                color: 'var(--studio-text)',
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (newFolderName.trim()) {
                  onCreateAssetFolder(newFolderName.trim());
                  setFolderFilter(newFolderName.trim());
                  setNewFolderName('');
                  setShowNewFolder(false);
                }
              }}
              className="px-2 py-1 rounded text-[10px] font-bold"
              style={{
                backgroundColor: 'var(--studio-accent)',
                color: 'var(--studio-accent-text)',
              }}
            >
              Crear
            </button>
          </div>
        )}

        {/* Search & Folder Select */}
        <div className="flex items-center gap-1">
          <div
            className="flex-1 flex items-center gap-1 px-2 py-1 rounded-lg border"
            style={{
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: 'var(--studio-border)',
            }}
          >
            <Search className="w-3 h-3 shrink-0 opacity-55" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o tag..."
              className="w-full bg-transparent text-[11px] focus:outline-none"
              style={{ color: 'var(--studio-text)' }}
            />
          </div>
          <select
            value={folderFilter}
            onChange={(e) => setFolderFilter(e.target.value)}
            className="rounded-lg border px-1.5 py-1 text-[10px] font-mono max-w-28"
            style={{
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: 'var(--studio-border)',
              color: 'var(--studio-text)',
            }}
          >
            <option value="all">Todas Carpetas</option>
            {assetFolders.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {/* Origin Filter */}
        <div className="grid grid-cols-4 gap-1 text-[10px] font-mono">
          {(
            [
              { id: 'all', label: 'Todos' },
              { id: 'user', label: 'Míos' },
              { id: 'ai', label: 'IA' },
              { id: 'preset', label: 'Presets' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setOriginFilter(tab.id)}
              className="py-0.5 rounded border font-semibold"
              style={{
                backgroundColor: originFilter === tab.id ? 'var(--studio-accent)' : 'var(--studio-bg-card)',
                color: originFilter === tab.id ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                borderColor: originFilter === tab.id ? 'var(--studio-accent)' : 'var(--studio-border)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 9 Categories Scrollable Strip */}
        <div className="flex flex-wrap gap-1 text-[9px] font-mono">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className="px-1.5 py-0.5 rounded border"
            style={{
              backgroundColor: categoryFilter === 'all' ? 'var(--studio-bg-elevated)' : 'transparent',
              color: categoryFilter === 'all' ? 'var(--studio-text)' : 'var(--studio-text-muted)',
              borderColor: categoryFilter === 'all' ? 'var(--studio-border-strong)' : 'var(--studio-border)',
            }}
          >
            Todo
          </button>
          {ASSET_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className="px-1.5 py-0.5 rounded border"
              style={{
                backgroundColor: categoryFilter === cat.id ? 'var(--studio-bg-elevated)' : 'transparent',
                color: categoryFilter === cat.id ? 'var(--studio-text)' : 'var(--studio-text-muted)',
                borderColor: categoryFilter === cat.id ? 'var(--studio-border-strong)' : 'var(--studio-border)',
              }}
            >
              {cat.short}
            </button>
          ))}
        </div>

        {/* Items List (Draggable onto CanvasViewport!) */}
        <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-0.5">
          {filteredItems.map((item) => {
            const metaOpen = expandedMetaId === item.id;
            return (
              <div
                key={item.id}
                draggable={item.category !== 'sounds'}
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-pixelclash-asset', JSON.stringify(item));
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                className="p-2 rounded-xl border flex flex-col gap-1.5"
                style={{
                  backgroundColor: 'var(--studio-bg-card)',
                  borderColor: 'var(--studio-border)',
                }}
                title={item.category !== 'sounds' ? 'Arrastra al lienzo para colocar en coordenadas exactas' : 'Haz clic en Audio para reproducir'}
              >
                <div className="flex items-center gap-2">
                  <AssetThumb
                    item={item}
                    isPlayingSound={playingSoundId === item.id}
                    onTogglePlaySound={() => togglePlaySound(item)}
                  />

                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold truncate text-[11px]" style={{ color: 'var(--studio-text)' }}>
                        {item.name}
                      </span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onUpdateLibraryItem(item.id, { favorite: !item.favorite })}
                          title="Marcar favorito"
                          className="p-0.5"
                        >
                          <Star
                            className={`w-3 h-3 ${
                              item.favorite ? 'fill-amber-400 text-amber-400' : 'text-slate-500'
                            }`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedMetaId(metaOpen ? null : item.id)}
                          title="Metadatos y etiquetas"
                          className="p-0.5 text-slate-400 hover:text-white"
                        >
                          <Info className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <span className="text-[9px] font-mono tabular-nums" style={{ color: 'var(--studio-text-muted)' }}>
                      {item.category.toUpperCase()} · {item.category === 'sounds' ? 'SFX WAV' : `${item.width}×${item.height}px`} · {item.folder || 'General'}
                    </span>

                    <div className="flex items-center gap-1 pt-0.5">
                      {item.category !== 'sounds' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onInsertLibraryItem(item, 'stamp')}
                            className="px-1.5 py-0.5 rounded border text-[10px] font-semibold"
                            style={{
                              backgroundColor: 'var(--studio-bg-elevated)',
                              borderColor: 'var(--studio-border-strong)',
                              color: 'var(--studio-text)',
                            }}
                          >
                            Estampar
                          </button>
                          <button
                            type="button"
                            onClick={() => onInsertLibraryItem(item, 'new_layer')}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"
                            style={{
                              backgroundColor: 'var(--studio-accent)',
                              color: 'var(--studio-accent-text)',
                            }}
                          >
                            <Layers className="w-2.5 h-2.5" />
                            <span>+ Capa</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => togglePlaySound(item)}
                          className="px-2 py-0.5 rounded border text-[10px] font-semibold"
                          style={{
                            backgroundColor: 'var(--studio-bg-elevated)',
                            borderColor: 'var(--studio-border-strong)',
                            color: 'var(--studio-accent)',
                          }}
                        >
                          {playingSoundId === item.id ? 'Detener' : 'Reproducir SFX'}
                        </button>
                      )}

                      {item.origin !== 'preset' && (
                        <button
                          type="button"
                          onClick={() => onDeleteLibraryItem(item.id)}
                          title="Eliminar de librería"
                          className="ml-auto p-1 rounded text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Metadata & Tags Drawer */}
                {metaOpen && (
                  <div
                    className="p-1.5 rounded-lg border flex flex-col gap-1 text-[10px]"
                    style={{
                      backgroundColor: 'var(--studio-bg-elevated)',
                      borderColor: 'var(--studio-border)',
                    }}
                  >
                    <div className="flex justify-between font-mono">
                      <span style={{ color: 'var(--studio-text-muted)' }}>
                        Autor: {item.metadata?.author || item.origin}
                      </span>
                      <span style={{ color: 'var(--studio-text-muted)' }}>
                        {item.metadata?.createdAt || item.createdAt}
                      </span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span style={{ color: 'var(--studio-text-muted)' }}>
                        Proyecto: {item.metadata?.sourceProject || 'PixelClash'}
                      </span>
                      <span style={{ color: 'var(--studio-text-muted)' }}>
                        Res: {item.metadata?.resolution || `${item.width}x${item.height}`}
                      </span>
                    </div>
                    {item.metadata?.palette && item.metadata.palette.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-[9px]" style={{ color: 'var(--studio-text-muted)' }}>
                          Paleta:
                        </span>
                        {item.metadata.palette.slice(0, 8).map((c, idx) => (
                          <span
                            key={`${c}-${idx}`}
                            className="w-3 h-3 rounded-sm border border-white/20"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                      {(item.tags || []).map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.2 rounded border text-[9px] font-mono flex items-center gap-0.5"
                          style={{
                            borderColor: 'var(--studio-border-strong)',
                            color: 'var(--studio-text)',
                          }}
                        >
                          <Tag className="w-2 h-2" />
                          <span>{t}</span>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateLibraryItem(item.id, {
                                tags: (item.tags || []).filter((x) => x !== t),
                              })
                            }
                            className="opacity-60 hover:opacity-100"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        value={tagDraftById[item.id] || ''}
                        onChange={(e) =>
                          setTagDraftById((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (tagDraftById[item.id] || '').trim()) {
                            const nextTag = tagDraftById[item.id].trim();
                            onUpdateLibraryItem(item.id, {
                              tags: Array.from(new Set([...(item.tags || []), nextTag])),
                            });
                            setTagDraftById((prev) => ({ ...prev, [item.id]: '' }));
                          }
                        }}
                        placeholder="+ tag (Enter)"
                        className="w-20 px-1 py-0.2 rounded border bg-transparent text-[9px] font-mono focus:outline-none"
                        style={{ borderColor: 'var(--studio-border-strong)' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <p className="text-center py-4 text-[11px]" style={{ color: 'var(--studio-text-muted)' }}>
              Sin resultados con estos filtros.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
