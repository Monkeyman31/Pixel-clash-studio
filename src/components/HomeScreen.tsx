import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpDown,
  BookOpen,
  Clock,
  Cpu,
  FilePlus,
  Film,
  Flame,
  FolderOpen,
  Gamepad2,
  Grid,
  HelpCircle,
  Image as ImageIcon,
  Keyboard,
  LayoutGrid,
  LayoutPanelTop,
  List,
  Maximize2,
  Minimize2,
  Minus,
  Monitor,
  Pin,
  PinOff,
  Play,
  RotateCcw,
  Search,
  Settings,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
  UserSquare2,
  X,
  ArrowRight,
  Swords,
} from 'lucide-react';
import {
  FightingGameProfileId,
  NewProjectConfig,
  ProjectWorkMode,
  RecentProjectEntry,
  StartupPreferences,
} from '../types';
import { formatBytesCompact, detectHardwareCapabilities } from '../utils/canvasMemoryEstimator';
import {
  clearCustomMascotFile,
  saveCustomMascotFile,
} from '../utils/startupPreferences';
import {
  FIGHTING_GAME_PROFILE_ORDER,
  FIGHTING_GAME_PROFILES,
  MODE_SIZE_PRESETS,
} from '../utils/fightingGameProfiles';
import { MascotPreviewCanvas } from './SplashLoadingScreen';
import { NewProjectTemplateCategory } from './NewProjectModal';
import { PixelClashLogoIcon } from './PixelClashLogoIcon';
import { getDesktopBridge } from '../utils/desktopBridge';

export type HomeScreenSection = 'inicio' | 'recientes' | 'configuracion' | 'ayuda' | 'novedades';
type RecentSortKey = 'recientes' | 'nombre' | 'tamano' | 'tipo';
type RecentViewMode = 'grid' | 'list';

interface HomeScreenProps {
  isOpen: boolean;
  initialSection?: HomeScreenSection;
  hasActiveDocument: boolean;
  activeDocumentName?: string;
  openDocumentsCount?: number;
  activeFightingProfile?: FightingGameProfileId;
  onChangeFightingProfile?: (id: FightingGameProfileId) => void;
  recentProjects: RecentProjectEntry[];
  startupPreferences: StartupPreferences;
  onUpdateStartupPreferences: (next: StartupPreferences) => void;
  onTestSplashAnimation: () => void;
  onReturnToCanvas: () => void;
  onNewProject: (category?: NewProjectTemplateCategory, profileId?: FightingGameProfileId) => void;
  onQuickCreatePreset?: (config: NewProjectConfig) => void;
  onOpenProjectFile: () => void;
  onOpenRecentProject: (entry: RecentProjectEntry) => void;
  onTogglePinRecent: (id: string) => void;
  onRemoveRecent: (id: string) => void;
  onClearRecents: () => void;
  onOpenToolsGuide?: () => void;
  onOpenShortcutsModal?: () => void;
  onOpenInstallerGuide?: () => void;
  isWindowMaximized?: boolean;
  onMinimizeWindow?: () => void;
  onToggleMaximizeWindow?: () => void;
  onCloseApplicationWindow?: () => void;
}

// Indicative format accent colors per user specification:
// .pcs -> Blue, .png -> Green, .gif -> Yellow, .webp -> Turquoise, spritesheet -> Orange, .psd -> Purple
function getFormatMeta(entry: RecentProjectEntry): { label: string; color: string; sortKey: string } {
  const rawFmt = (entry.fileFormat || '').toLowerCase().trim();
  const nameLower = (entry.name || '').toLowerCase();
  const catLower = (entry.category || '').toLowerCase();

  if (
    rawFmt === 'spritesheet' ||
    catLower.includes('spritesheet') ||
    nameLower.includes('sheet') ||
    nameLower.includes('sprite_')
  ) {
    return { label: 'SPRITESHEET', color: '#fb923c', sortKey: 'spritesheet' };
  }

  switch (rawFmt) {
    case 'pcs':
      return { label: '.PCS', color: '#38bdf8', sortKey: 'pcs' };
    case 'png':
      return { label: '.PNG', color: '#34d399', sortKey: 'png' };
    case 'gif':
      return { label: '.GIF', color: '#fbbf24', sortKey: 'gif' };
    case 'webp':
      return { label: '.WEBP', color: '#2dd4bf', sortKey: 'webp' };
    case 'psd':
      return { label: '.PSD', color: '#a78bfa', sortKey: 'psd' };
    case 'ase':
    case 'aseprite':
      return { label: `.${rawFmt.toUpperCase()}`, color: '#f472b6', sortKey: rawFmt };
    case 'jpg':
    case 'jpeg':
    case 'bmp':
    case 'tiff':
    case 'tga':
    case 'ico':
    case 'json':
      return { label: `.${rawFmt.toUpperCase()}`, color: '#94a3b8', sortKey: rawFmt };
    default:
      return { label: '.PCS', color: '#38bdf8', sortKey: 'pcs' };
  }
}

  const QUICK_TEMPLATE_CARDS: {
  category: Exclude<NewProjectTemplateCategory, 'Todas'>;
  workMode: ProjectWorkMode;
  title: string;
  defaultSize: string;
  subtitle: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { category: 'Personaje', workMode: 'fighter', title: 'Fighter', defaultSize: '32..256 px', subtitle: 'Sprites de lucha y RPG', icon: Gamepad2 },
  { category: 'Stage', workMode: 'stage', title: 'Stage', defaultSize: '640..2560 px', subtitle: 'Escenarios multi-capa', icon: Monitor },
  { category: 'HUD', workMode: 'hud_ui', title: 'HUD', defaultSize: 'Barras / UI', subtitle: 'Vida, energía, timer', icon: LayoutPanelTop },
  { category: 'FX', workMode: 'fx', title: 'FX', defaultSize: 'Animado / Sheet', subtitle: 'Auras, partículas, VFX', icon: Flame },
  { category: 'Portrait', workMode: 'portrait', title: 'Portrait', defaultSize: 'VN / FG / RPG', subtitle: 'Retratos y diálogos', icon: UserSquare2 },
  { category: 'Cutscene', workMode: 'cutscene', title: 'Cutscene', defaultSize: 'Viñeta / 16:9', subtitle: 'Splash y cinemáticas', icon: Film },
  { category: 'Tileset', workMode: 'tileset', title: 'Tileset', defaultSize: '256×256+', subtitle: 'Tiles y autotiles', icon: Grid },
  { category: 'Personalizado', workMode: 'custom', title: 'Personalizado', defaultSize: 'Sin límites', subtitle: 'Cualquier resolución', icon: Sliders },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  isOpen,
  initialSection = 'inicio',
  hasActiveDocument,
  activeDocumentName,
  openDocumentsCount = 1,
  activeFightingProfile = 'kof',
  onChangeFightingProfile,
  recentProjects,
  startupPreferences,
  onUpdateStartupPreferences,
  onTestSplashAnimation,
  onReturnToCanvas,
  onNewProject,
  onQuickCreatePreset,
  onOpenProjectFile,
  onOpenRecentProject,
  onTogglePinRecent,
  onRemoveRecent,
  onClearRecents,
  onOpenToolsGuide,
  onOpenShortcutsModal,
  onOpenInstallerGuide,
  isWindowMaximized = false,
  onMinimizeWindow,
  onToggleMaximizeWindow,
  onCloseApplicationWindow,
}) => {
  const [section, setSection] = useState<HomeScreenSection>(initialSection);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<RecentSortKey>('recientes');
  const [viewMode, setViewMode] = useState<RecentViewMode>('grid');
  const [selectedQuickMode, setSelectedQuickMode] = useState<ProjectWorkMode>('fighter');
  const [localProfileId, setLocalProfileId] = useState<FightingGameProfileId>(activeFightingProfile);
  const [mascotRefreshToken, setMascotRefreshToken] = useState(0);
  const [mascotUploadError, setMascotUploadError] = useState<string | null>(null);
  const [mascotUploadNotice, setMascotUploadNotice] = useState<string | null>(null);

  const gifInputRef = useRef<HTMLInputElement>(null);
  const sheetInputRef = useRef<HTMLInputElement>(null);

  const hardware = useMemo(() => detectHardwareCapabilities(), []);
  const currentProfileId = onChangeFightingProfile ? activeFightingProfile : localProfileId;
  const setCurrentProfileId = (id: FightingGameProfileId) => {
    setLocalProfileId(id);
    onChangeFightingProfile?.(id);
  };
  const currentProfileSpec = FIGHTING_GAME_PROFILES[currentProfileId] || FIGHTING_GAME_PROFILES.kof;
  const modePresetsList = useMemo(
    () => MODE_SIZE_PRESETS.filter((p) => p.mode === selectedQuickMode),
    [selectedQuickMode]
  );

  // Sync external section jump (e.g. Ver -> Preferencias de Inicio)
  React.useEffect(() => {
    if (isOpen) {
      setSection(initialSection);
    }
  }, [isOpen, initialSection]);

  const { pinnedItems, regularItems } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = recentProjects.filter((entry) => {
      if (!q) return true;
      const haystack = `${entry.name} ${entry.diskPath || ''} ${entry.path || ''} ${entry.fileFormat || ''} ${entry.category || ''}`.toLowerCase();
      return haystack.includes(q);
    });

    const comparator = (a: RecentProjectEntry, b: RecentProjectEntry): number => {
      switch (sortBy) {
        case 'nombre':
          return a.name.localeCompare(b.name, 'es');
        case 'tamano': {
          const sa = a.fileSize ?? a.width * a.height;
          const sb = b.fileSize ?? b.width * b.height;
          return sb - sa;
        }
        case 'tipo':
          return getFormatMeta(a).sortKey.localeCompare(getFormatMeta(b).sortKey);
        case 'recientes':
        default: {
          const ta = a.modifiedTimestamp || 0;
          const tb = b.modifiedTimestamp || 0;
          return tb - ta;
        }
      }
    };

    const pinned = filtered.filter((r) => r.pinned).sort(comparator);
    const regular = filtered.filter((r) => !r.pinned).sort(comparator);
    return { pinnedItems: pinned, regularItems: regular };
  }, [recentProjects, searchQuery, sortBy]);

  if (!isOpen) return null;

  const handleUploadMascot = async (
    file: File | undefined,
    targetMode: 'custom_gif_webp' | 'custom_spritesheet'
  ) => {
    if (!file) return;
    setMascotUploadError(null);
    setMascotUploadNotice(null);
    try {
      const saved = await saveCustomMascotFile(file);
      onUpdateStartupPreferences({
        ...startupPreferences,
        mascotMode: targetMode,
        mascotCustomName: saved.name,
      });
      setMascotRefreshToken((n) => n + 1);
      setMascotUploadNotice(
        targetMode === 'custom_gif_webp'
          ? `Mascota animada "${saved.name}" guardada correctamente.`
          : `Secuencia de sprites "${saved.name}" guardada. Ajusta columnas, filas y FPS abajo.`
      );
    } catch (err) {
      setMascotUploadError(
        err instanceof Error ? err.message : 'No se pudo guardar la mascota en almacenamiento local.'
      );
    }
  };

  const handleResetMascot = async () => {
    await clearCustomMascotFile();
    onUpdateStartupPreferences({
      ...startupPreferences,
      mascotMode: 'builtin',
      mascotCustomName: undefined,
    });
    setMascotRefreshToken((n) => n + 1);
    setMascotUploadNotice('Mascota oficial de PixelClash Studio restaurada.');
    setMascotUploadError(null);
  };

  const renderRecentCardGrid = (entry: RecentProjectEntry) => {
    const fmt = getFormatMeta(entry);
    const displayPath = entry.diskPath || entry.path || entry.category || 'Proyecto local';
    const displayDate = entry.modifiedAt || entry.openedAt || 'Reciente';
    const sizeText = entry.fileSize
      ? formatBytesCompact(entry.fileSize)
      : `${entry.width}×${entry.height} px`;

    return (
      <div
        key={entry.id}
        className="group rounded-lg border border-[#22293e] bg-[#121624] hover:border-[#374366] transition-colors overflow-hidden flex flex-col"
      >
        {/* Subtle 2px format color accent bar */}
        <div className="h-[2px] w-full" style={{ backgroundColor: fmt.color }} />

        {/* Thumbnail */}
        <button
          type="button"
          onClick={() => onOpenRecentProject(entry)}
          className="relative h-28 w-full canvas-checkerboard border-b border-[#1d2336] flex items-center justify-center overflow-hidden cursor-pointer"
          title={`Abrir ${entry.name}\nRuta: ${displayPath}`}
        >
          {entry.thumbnailDataUrl ? (
            <img
              src={entry.thumbnailDataUrl}
              alt={entry.name}
              className="max-w-[88%] max-h-[88%] object-contain pixel-canvas"
            />
          ) : (
            <ImageIcon className="w-7 h-7 text-slate-600" />
          )}
        </button>

        {/* Card Metadata */}
        <div className="p-3 flex-1 flex flex-col justify-between gap-2">
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={() => onOpenRecentProject(entry)}
              className="min-w-0 text-left flex-1 cursor-pointer"
            >
              <div className="text-xs font-bold text-slate-100 truncate group-hover:text-amber-300 transition-colors">
                {entry.name}
              </div>
              <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5" title={displayPath}>
                {displayPath}
              </div>
            </button>

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => onTogglePinRecent(entry.id)}
                title={entry.pinned ? 'Desfijar proyecto' : 'Fijar proyecto arriba'}
                className={`p-1 rounded hover:bg-white/10 transition-colors cursor-pointer ${
                  entry.pinned ? 'text-amber-400' : 'text-slate-500 hover:text-slate-200'
                }`}
              >
                {entry.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => onRemoveRecent(entry.id)}
                title="Eliminar de recientes"
                className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[#1c2234] text-[10px] font-mono tabular-nums text-slate-400">
            <span className="font-bold" style={{ color: fmt.color }}>
              {fmt.label}
            </span>
            <span className="truncate">
              {entry.width}×{entry.height} · {sizeText} · {displayDate}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderRecentListTable = (items: RecentProjectEntry[]) => (
    <div className="rounded-lg border border-[#22293e] bg-[#111522] overflow-hidden">
      <div className="grid grid-cols-[minmax(180px,1.8fr)_minmax(140px,1.5fr)_96px_124px_92px_64px] gap-2 px-3.5 py-2 border-b border-[#1f263a] bg-[#0e121e] text-[10px] font-mono uppercase tracking-wider text-slate-400">
        <span>Nombre</span>
        <span>Ruta</span>
        <span>Tipo</span>
        <span>Fecha</span>
        <span className="text-right">Tamaño</span>
        <span className="text-right">Acciones</span>
      </div>
      <div className="divide-y divide-[#1b2133]">
        {items.map((entry) => {
          const fmt = getFormatMeta(entry);
          const displayPath = entry.diskPath || entry.path || entry.category || 'Proyecto local';
          const displayDate = entry.modifiedAt || entry.openedAt || '—';
          const sizeText = entry.fileSize
            ? formatBytesCompact(entry.fileSize)
            : `${entry.width}×${entry.height}`;

          return (
            <div
              key={entry.id}
              className="grid grid-cols-[minmax(180px,1.8fr)_minmax(140px,1.5fr)_96px_124px_92px_64px] gap-2 px-3.5 py-2 items-center hover:bg-[#171d2e] transition-colors text-xs"
            >
              <button
                type="button"
                onClick={() => onOpenRecentProject(entry)}
                className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
              >
                <div className="w-7 h-7 rounded border border-[#2a334d] canvas-checkerboard shrink-0 overflow-hidden flex items-center justify-center">
                  {entry.thumbnailDataUrl ? (
                    <img
                      src={entry.thumbnailDataUrl}
                      alt={entry.name}
                      className="w-full h-full object-contain pixel-canvas"
                    />
                  ) : (
                    <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </div>
                <span className="font-semibold text-slate-100 truncate hover:text-amber-300">
                  {entry.name}
                </span>
              </button>

              <span className="text-[11px] font-mono text-slate-400 truncate" title={displayPath}>
                {displayPath}
              </span>

              <span className="text-[11px] font-mono font-bold truncate" style={{ color: fmt.color }}>
                {fmt.label}
              </span>

              <span className="text-[11px] font-mono tabular-nums text-slate-400 truncate">
                {displayDate}
              </span>

              <span className="text-[11px] font-mono tabular-nums text-slate-300 text-right truncate">
                {sizeText}
              </span>

              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => onTogglePinRecent(entry.id)}
                  title={entry.pinned ? 'Desfijar' : 'Fijar arriba'}
                  className={`p-1 rounded hover:bg-white/10 cursor-pointer ${
                    entry.pinned ? 'text-amber-400' : 'text-slate-500 hover:text-slate-200'
                  }`}
                >
                  {entry.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveRecent(entry.id)}
                  title="Eliminar de recientes"
                  className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderRecentsArea = () => {
    const totalVisible = pinnedItems.length + regularItems.length;

    if (recentProjects.length === 0) {
      return (
        <div className="rounded-xl border border-[#22293e] bg-[#111522] p-10 text-center space-y-3">
          <Clock className="w-8 h-8 text-slate-500 mx-auto" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-200">Aún no hay archivos recientes</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Crea un nuevo proyecto desde una plantilla o abre un archivo local (.pcs, .png, .gif, .webp, .psd, .aseprite o spritesheet) para comenzar.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => onNewProject()}
              className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <FilePlus className="w-3.5 h-3.5" />
              <span>Nuevo Proyecto</span>
            </button>
            <button
              type="button"
              onClick={onOpenProjectFile}
              className="px-4 py-2 rounded-lg border border-[#2d3652] hover:bg-white/5 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
              <span>Abrir Proyecto</span>
            </button>
          </div>
        </div>
      );
    }

    if (totalVisible === 0) {
      return (
        <div className="rounded-xl border border-[#22293e] bg-[#111522] p-8 text-center space-y-2">
          <Search className="w-6 h-6 text-slate-500 mx-auto" />
          <p className="text-xs text-slate-300">
            No se encontraron proyectos que coincidan con &ldquo;{searchQuery}&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-xs text-amber-400 hover:underline cursor-pointer"
          >
            Limpiar búsqueda
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Pinned Projects always displayed on top */}
        {pinnedItems.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Pin className="w-3.5 h-3.5" />
                Proyectos Fijados ({pinnedItems.length})
              </h4>
            </div>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {pinnedItems.map(renderRecentCardGrid)}
              </div>
            ) : (
              renderRecentListTable(pinnedItems)
            )}
          </div>
        )}

        {/* Regular Recent Projects */}
        {regularItems.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                Archivos Recientes ({regularItems.length})
              </h4>
              <button
                type="button"
                onClick={onClearRecents}
                className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                Limpiar historial
              </button>
            </div>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {regularItems.map(renderRecentCardGrid)}
              </div>
            ) : (
              renderRecentListTable(regularItems)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[150] bg-[#0b0e16] text-slate-100 flex overflow-hidden select-none">
      {/* Hidden File Inputs for Custom Mascot Upload */}
      <input
        ref={gifInputRef}
        type="file"
        accept="image/gif,image/webp,.gif,.webp"
        className="hidden"
        onChange={(e) => {
          handleUploadMascot(e.target.files?.[0], 'custom_gif_webp');
          e.target.value = '';
        }}
      />
      <input
        ref={sheetInputRef}
        type="file"
        accept="image/png,image/webp,.png,.webp"
        className="hidden"
        onChange={(e) => {
          handleUploadMascot(e.target.files?.[0], 'custom_spritesheet');
          e.target.value = '';
        }}
      />

      {/* Left Studio Sidebar */}
      <aside className="w-64 shrink-0 border-r border-[#1e2538] bg-[#0e121d] flex flex-col justify-between">
        <div className="p-5 space-y-6">
          {/* Brand Header with Official PixelClash Studio Icon (draggable in frameless desktop) */}
          <div
            data-tauri-drag-region="true"
            onMouseDown={(e) => {
              if (e.button !== 0 || e.detail >= 2) return;
              const target = e.target as HTMLElement;
              if (target.closest('button, input, select, textarea, a, [role="button"]')) return;
              void getDesktopBridge()?.startWindowDragging?.();
            }}
            onDoubleClick={(e) => {
              if (!onToggleMaximizeWindow) return;
              const target = e.target as HTMLElement;
              if (target.closest('button, input, select, textarea, a, [role="button"]')) return;
              onToggleMaximizeWindow();
            }}
            className="flex items-center gap-3 studio-window-drag"
          >
            <PixelClashLogoIcon size={38} className="shadow-md" />
            <div className="min-w-0">
              <div className="text-sm font-extrabold tracking-tight text-slate-100 truncate">
                PixelClash Studio
              </div>
              <div className="text-[10px] font-mono text-slate-400 tabular-nums">
                Estudio Pixel Art · v2.4
              </div>
            </div>
          </div>

          {/* Primary Actions */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onNewProject()}
              className="w-full px-3.5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <FilePlus className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">Nuevo Proyecto</span>
            </button>

            <button
              type="button"
              onClick={onOpenProjectFile}
              className="w-full px-3.5 py-2 rounded-lg border border-[#2c3550] bg-[#141a2b] hover:bg-[#1a2238] text-slate-100 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <FolderOpen className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="whitespace-nowrap">Abrir Proyecto</span>
            </button>

            {hasActiveDocument && (
              <button
                type="button"
                onClick={onReturnToCanvas}
                className="w-full px-3.5 py-2 rounded-lg border border-emerald-500/45 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-100 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                title={activeDocumentName ? `Volver al Área de Trabajo (${activeDocumentName})` : 'Volver al Área de Trabajo'}
              >
                <ArrowRight className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span className="truncate whitespace-nowrap">Volver al Área de Trabajo</span>
              </button>
            )}
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1 pt-2 border-t border-[#1b2235]">
            {(
              [
                { id: 'inicio', label: 'Inicio', icon: LayoutGrid },
                { id: 'recientes', label: 'Archivos Recientes', icon: Clock },
                { id: 'configuracion', label: 'Configuración', icon: Settings },
                { id: 'ayuda', label: 'Ayuda', icon: HelpCircle },
                { id: 'novedades', label: 'Novedades', icon: Sparkles },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#1a2238] text-amber-300 border border-[#2b3757]'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {item.id === 'recientes' && recentProjects.length > 0 && (
                    <span className="text-[10px] font-mono tabular-nums text-slate-400">
                      {recentProjects.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Hardware & Engine Footer */}
        <div className="p-4 border-t border-[#1b2235] bg-[#0b0e18] space-y-1.5 text-[10px] font-mono text-slate-400 tabular-nums">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
            <Cpu className="w-3.5 h-3.5 text-sky-400" />
            <span>Motor Tiled 256×256 Activo</span>
          </div>
          <div>
            {hardware.cpuCores} hilos · ~{hardware.deviceMemoryGb} GB RAM · Tex {hardware.maxTextureSize}px
          </div>
          <div className="text-slate-500">1:1 Nearest Neighbor · Sin límites</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Top Utility Header (draggable + double-click to maximize, accessible without any canvas open) */}
        <header
          data-tauri-drag-region="true"
          onMouseDown={(e) => {
            if (e.button !== 0 || e.detail >= 2) return;
            const target = e.target as HTMLElement;
            if (target.closest('button, input, select, textarea, a, [role="button"], .studio-window-no-drag')) {
              return;
            }
            void getDesktopBridge()?.startWindowDragging?.();
          }}
          onDoubleClick={(e) => {
            if (!onToggleMaximizeWindow) return;
            const target = e.target as HTMLElement;
            if (target.closest('button, input, select, textarea, a, [role="button"], .studio-window-no-drag')) {
              return;
            }
            onToggleMaximizeWindow();
          }}
          className="h-14 shrink-0 px-5 border-b border-[#1e2538] bg-[#0e121d]/80 flex items-center justify-between gap-3 studio-window-drag"
        >
          <div className="min-w-0 flex items-center gap-3">
            <h2 className="text-sm font-bold tracking-tight text-slate-100 truncate">
              {section === 'inicio' && 'Inicio · Espacio de Trabajo'}
              {section === 'recientes' && 'Archivos Recientes'}
              {section === 'configuracion' && 'Configuración de Inicio & Mascota'}
              {section === 'ayuda' && 'Centro de Ayuda y Documentación'}
              {section === 'novedades' && 'Novedades de PixelClash Studio'}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0 studio-window-no-drag">
            {/* Search, Sort & View Mode Controls for Inicio / Recientes */}
            {(section === 'inicio' || section === 'recientes') && (
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar proyecto..."
                    className="w-36 md:w-44 xl:w-56 pl-8 pr-7 py-1.5 rounded-lg bg-[#141929] border border-[#26304b] text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#141929] border border-[#26304b] text-xs">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as RecentSortKey)}
                    className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="recientes" className="bg-[#121624]">Recientes</option>
                    <option value="nombre" className="bg-[#121624]">Nombre</option>
                    <option value="tamano" className="bg-[#121624]">Tamaño</option>
                    <option value="tipo" className="bg-[#121624]">Tipo</option>
                  </select>
                </div>

                <div className="flex items-center rounded-lg border border-[#26304b] bg-[#141929] p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    title="Vista en cuadrícula"
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    title="Vista en lista"
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {hasActiveDocument && (
              <button
                type="button"
                onClick={onReturnToCanvas}
                title={`Conserva tus paneles, zoom, herramientas y selección (${openDocumentsCount} abierto${openDocumentsCount === 1 ? '' : 's'})`}
                className="px-3 py-1.5 rounded-lg border border-emerald-500/45 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-100 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
              >
                <ArrowRight className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span>Volver al Lienzo</span>
              </button>
            )}

            {/* Window Maximize / Fullscreen & Native Frame Controls */}
            {(onToggleMaximizeWindow || onMinimizeWindow || onCloseApplicationWindow) && (
              <div className="flex items-center gap-1 pl-2 ml-0.5 border-l border-[#1e2538] shrink-0">
                {onMinimizeWindow && (
                  <button
                    type="button"
                    onClick={onMinimizeWindow}
                    title="Minimizar ventana"
                    aria-label="Minimizar ventana"
                    className="w-8 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                )}
                {onToggleMaximizeWindow && (
                  <button
                    type="button"
                    onClick={onToggleMaximizeWindow}
                    title={
                      isWindowMaximized
                        ? 'Restaurar tamaño de pantalla (F11 / Esc)'
                        : 'Maximizar pantalla completa (F11)'
                    }
                    aria-label={isWindowMaximized ? 'Restaurar pantalla' : 'Maximizar pantalla'}
                    aria-pressed={isWindowMaximized}
                    className={`h-7 px-2.5 rounded-md border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      isWindowMaximized
                        ? 'border-amber-400/60 bg-amber-400/15 text-amber-300 hover:bg-amber-400/25'
                        : 'border-[#2a3450] bg-[#141929] text-slate-200 hover:border-slate-500 hover:bg-[#1a2238]'
                    }`}
                  >
                    {isWindowMaximized ? (
                      <Minimize2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{isWindowMaximized ? 'Restaurar' : 'Maximizar'}</span>
                  </button>
                )}
                {onCloseApplicationWindow && (
                  <button
                    type="button"
                    onClick={onCloseApplicationWindow}
                    title="Cerrar aplicación"
                    aria-label="Cerrar aplicación"
                    className="w-8 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Scrollable Content Body */}
        <main className="flex-1 overflow-y-auto p-6 space-y-7">
          {/* SECTION: INICIO */}
          {section === 'inicio' && (
            <>
              {/* Quick Create Project Modes + Expanded Presets per Mode */}
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Crear Proyecto por Modo y Resolución
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Elige un modo para explorar sus formatos dedicados o abre la configuración avanzada.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNewProject('Personalizado', currentProfileId)}
                    className="text-xs font-semibold text-amber-400 hover:text-amber-300 cursor-pointer whitespace-nowrap"
                  >
                    Configuración avanzada →
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">
                  {QUICK_TEMPLATE_CARDS.map((tpl) => {
                    const Icon = tpl.icon;
                    const active = selectedQuickMode === tpl.workMode;
                    return (
                      <button
                        key={tpl.category}
                        type="button"
                        onClick={() => {
                          setSelectedQuickMode(tpl.workMode);
                        }}
                        onDoubleClick={() => onNewProject(tpl.category, currentProfileId)}
                        className={`p-2.5 rounded-lg border text-left transition-colors flex flex-col justify-between gap-1.5 cursor-pointer group ${
                          active
                            ? 'border-amber-400 bg-[#192036]'
                            : 'border-[#22293e] bg-[#111522] hover:border-amber-400/60 hover:bg-[#161c2e]'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-amber-400 group-hover:scale-105 transition-transform" />
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-slate-100 truncate">
                            {tpl.title}
                          </div>
                          <div className="text-[10px] font-mono tabular-nums text-sky-300 truncate">
                            {tpl.defaultSize}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {tpl.subtitle}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Presets list for the selected Mode */}
                {modePresetsList.length > 0 && (
                  <div className="p-3 rounded-lg border border-[#22293e] bg-[#0f1320] space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-200">
                        Formatos de {QUICK_TEMPLATE_CARDS.find((c) => c.workMode === selectedQuickMode)?.title}:
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onNewProject(
                            QUICK_TEMPLATE_CARDS.find((c) => c.workMode === selectedQuickMode)?.category || 'Todas',
                            currentProfileId
                          )
                        }
                        className="text-[11px] font-semibold text-sky-300 hover:text-sky-200 cursor-pointer whitespace-nowrap"
                      >
                        Personalizado / Opciones avanzadas →
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                      {modePresetsList.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            if (onQuickCreatePreset) {
                              onQuickCreatePreset({
                                name: `${preset.name}`,
                                width: preset.width,
                                height: preset.height,
                                dpi: 72,
                                pixelScale: 1,
                                category: preset.categoryLabel,
                                templateId: preset.id,
                                backgroundMode: 'transparent',
                                backgroundColor: '#111524',
                                initialPaletteId: currentProfileSpec.paletteId,
                                enableGrid: preset.grid,
                                enablePixelPerfect: preset.pixelPerfect,
                                createInitialLayer: true,
                                createInitialGroup: preset.animationMode,
                                enableAnimationMode: preset.animationMode,
                                workMode: preset.mode,
                                fightingProfileId: currentProfileId,
                              });
                            } else {
                              onNewProject(preset.categoryLabel as NewProjectTemplateCategory, currentProfileId);
                            }
                          }}
                          className="p-2 rounded border border-[#26304b] bg-[#141929] hover:border-emerald-400/70 hover:bg-[#192138] text-left transition-colors cursor-pointer"
                        >
                          <div className="text-[11px] font-bold text-slate-100 truncate">{preset.name}</div>
                          <div className="text-[10px] font-mono text-amber-300 tabular-nums mt-0.5">
                            {preset.width} × {preset.height}
                          </div>
                          <div className="text-[9px] text-slate-400 truncate mt-0.5">{preset.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Optional Fighting Game Profile System */}
              <section className="p-4 rounded-xl border border-[#22293e] bg-[#111522] space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Swords className="w-4 h-4 text-rose-400 shrink-0" />
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        Perfil de Juego de Pelea (Opcional)
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Aplica automáticamente resoluciones, layout de fighter/stage/FX, paleta y guías clásicas de cada saga.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onNewProject('Personaje', currentProfileId)}
                      className="px-2.5 py-1 rounded border border-[#2c3654] bg-[#161c2e] hover:border-amber-400 text-[11px] font-semibold text-slate-100 cursor-pointer whitespace-nowrap"
                    >
                      Nuevo Fighter ({currentProfileSpec.resolutions.fighter.w}×{currentProfileSpec.resolutions.fighter.h})
                    </button>
                    <button
                      type="button"
                      onClick={() => onNewProject('Stage', currentProfileId)}
                      className="px-2.5 py-1 rounded border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-[11px] font-semibold text-emerald-200 cursor-pointer whitespace-nowrap"
                    >
                      Nuevo Stage ({currentProfileSpec.resolutions.stage.w}×{currentProfileSpec.resolutions.stage.h})
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {FIGHTING_GAME_PROFILE_ORDER.map((pid) => {
                    const prof = FIGHTING_GAME_PROFILES[pid];
                    const active = currentProfileId === pid;
                    return (
                      <button
                        key={pid}
                        type="button"
                        onClick={() => setCurrentProfileId(pid)}
                        className={`px-2.5 py-1.5 rounded-md border text-left transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#1a2238] text-white'
                            : 'bg-[#0e121d] border-[#22293e] text-slate-400 hover:text-slate-100'
                        }`}
                        style={{
                          borderColor: active ? prof.accentColor : undefined,
                        }}
                      >
                        <div className="text-[11px] font-bold truncate">{prof.shortName}</div>
                        <div className="text-[9px] font-mono opacity-75 truncate">{prof.era}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Profile Layout & Guide Specs */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 pt-2 border-t border-[#1c2336] text-[11px]">
                  <div className="p-2.5 rounded-lg bg-[#0d111b] border border-[#1d2438]">
                    <div className="text-[10px] font-mono uppercase text-slate-400">Resoluciones Sugeridas</div>
                    <div className="mt-1 space-y-0.5 font-mono text-[10px] tabular-nums text-slate-200">
                      <div>Fighter: <strong className="text-amber-300">{currentProfileSpec.resolutions.fighter.label}</strong></div>
                      <div>Stage: <strong className="text-emerald-300">{currentProfileSpec.resolutions.stage.label}</strong></div>
                      <div>FX: <strong className="text-orange-300">{currentProfileSpec.resolutions.fx.label}</strong></div>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0d111b] border border-[#1d2438]">
                    <div className="text-[10px] font-mono uppercase text-slate-400">Layout Fighter</div>
                    <div className="mt-1 text-[10px] text-slate-300 space-y-0.5">
                      <div>{currentProfileSpec.fighterLayout.recommendedFps} FPS · Grid {currentProfileSpec.fighterLayout.gridStep}px</div>
                      <div className="text-slate-400 truncate">{currentProfileSpec.fighterLayout.layers.join(' · ')}</div>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0d111b] border border-[#1d2438]">
                    <div className="text-[10px] font-mono uppercase text-slate-400">Layout Stage &amp; FX</div>
                    <div className="mt-1 text-[10px] text-slate-300 space-y-0.5">
                      <div>{currentProfileSpec.stageLayout.parallaxPlanes} planos · Suelo {currentProfileSpec.stageLayout.floorPct}%</div>
                      <div className="text-slate-400 truncate">{currentProfileSpec.fxLayout.description}</div>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0d111b] border border-[#1d2438]">
                    <div className="text-[10px] font-mono uppercase text-slate-400">Guías Típicas</div>
                    <div className="mt-1 text-[10px] text-sky-300 space-y-0.5">
                      {currentProfileSpec.typicalGuides.slice(0, 3).map((g, gi) => (
                        <div key={gi} className="truncate">• {g}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Format Color Legend (subtle inline technical key, zero pills) */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono text-slate-400 border-y border-[#1b2235] py-2">
                <span className="uppercase tracking-wider text-slate-500">Formatos:</span>
                <span><strong style={{ color: '#38bdf8' }}>.PCS</strong> Proyecto</span>
                <span><strong style={{ color: '#34d399' }}>.PNG</strong> Imagen</span>
                <span><strong style={{ color: '#fbbf24' }}>.GIF</strong> Animado</span>
                <span><strong style={{ color: '#2dd4bf' }}>.WEBP</strong> WebP</span>
                <span><strong style={{ color: '#fb923c' }}>SPRITESHEET</strong> Hoja</span>
                <span><strong style={{ color: '#a78bfa' }}>.PSD</strong> Photoshop</span>
              </div>

              {/* Pinned & Recent Files */}
              <section>{renderRecentsArea()}</section>
            </>
          )}

          {/* SECTION: ARCHIVOS RECIENTES */}
          {section === 'recientes' && (
            <section className="space-y-4">{renderRecentsArea()}</section>
          )}

          {/* SECTION: CONFIGURACIÓN */}
          {section === 'configuracion' && (
            <div className="max-w-3xl space-y-6">
              {/* Startup Visibility Preferences */}
              <div className="rounded-xl border border-[#22293e] bg-[#111522] p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Preferencias de Inicio</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Controla el comportamiento de la pantalla principal y la animación de carga al abrir PixelClash Studio.
                  </p>
                </div>

                <div className="space-y-2.5 text-xs">
                  <label className="flex items-center justify-between p-3 rounded-lg border border-[#1f263a] bg-[#0e121e] cursor-pointer">
                    <div>
                      <div className="font-semibold text-slate-100">Mostrar pantalla de inicio</div>
                      <div className="text-[11px] text-slate-400">
                        Abre este centro de proyectos y plantillas antes de entrar al editor de lienzo.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={startupPreferences.showHomeScreen}
                      onChange={(e) =>
                        onUpdateStartupPreferences({
                          ...startupPreferences,
                          showHomeScreen: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-amber-400 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-lg border border-[#1f263a] bg-[#0e121e] cursor-pointer">
                    <div>
                      <div className="font-semibold text-slate-100">Mostrar animación de carga</div>
                      <div className="text-[11px] text-slate-400">
                        Muestra el logotipo, tu mascota animada y el progreso de carga al iniciar el programa.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={startupPreferences.showSplashAnimation}
                      onChange={(e) =>
                        onUpdateStartupPreferences({
                          ...startupPreferences,
                          showSplashAnimation: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-amber-400 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-lg border border-[#1f263a] bg-[#0e121e] cursor-pointer">
                    <div>
                      <div className="font-semibold text-slate-100">Mostrar consejos durante la carga</div>
                      <div className="text-[11px] text-slate-400">
                        Incluye atajos de teclado, consejos de Pixel Art y novedades en la animación de carga.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={startupPreferences.showSplashTips}
                      onChange={(e) =>
                        onUpdateStartupPreferences({
                          ...startupPreferences,
                          showSplashTips: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-amber-400 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-lg border border-[#1f263a] bg-[#0e121e] cursor-pointer">
                    <div>
                      <div className="font-semibold text-slate-100">Iniciar ventana maximizada (escritorio)</div>
                      <div className="text-[11px] text-slate-400">
                        Abre PixelClash Studio maximizado al arrancar en escritorio. También puedes pulsar F11 o usar el botón Maximizar en cualquier momento.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(startupPreferences.startMaximized)}
                      onChange={(e) =>
                        onUpdateStartupPreferences({
                          ...startupPreferences,
                          startMaximized: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-amber-400 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Duration & Live Test */}
                <div className="pt-2 border-t border-[#1e2538] flex flex-wrap items-center justify-between gap-4">
                  <div className="flex-1 min-w-[220px] space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">Duración mínima de la animación</span>
                      <span className="font-mono tabular-nums text-amber-300">
                        {(startupPreferences.splashMinDurationMs / 1000).toFixed(1)} s
                      </span>
                    </div>
                    <input
                      type="range"
                      min={600}
                      max={4000}
                      step={100}
                      value={startupPreferences.splashMinDurationMs}
                      onChange={(e) =>
                        onUpdateStartupPreferences({
                          ...startupPreferences,
                          splashMinDurationMs: parseInt(e.target.value, 10) || 1500,
                        })
                      }
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={onTestSplashAnimation}
                    className="px-3.5 py-2 rounded-lg border border-[#2f3a59] bg-[#161c2e] hover:bg-[#1e2640] text-slate-100 text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Play className="w-3.5 h-3.5 text-amber-400" />
                    <span>Probar Animación de Carga</span>
                  </button>
                </div>
              </div>

              {/* Mascot Customization Panel */}
              <div className="rounded-xl border border-[#22293e] bg-[#111522] p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    Mascota de Carga (GIF, WEBP Animado o Spritesheet)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Carga directamente tu archivo .gif o .webp animado desde tu equipo; quedará guardado localmente para cada inicio de PixelClash Studio.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-start gap-5">
                  <div className="w-36 h-36 rounded-lg border border-[#28324d] bg-[#0a0d16] flex items-center justify-center shrink-0 overflow-hidden">
                    <MascotPreviewCanvas
                      preferences={startupPreferences}
                      size={124}
                      refreshToken={mascotRefreshToken}
                    />
                  </div>

                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="text-xs font-mono text-slate-300">
                      Mascota activa:{' '}
                      <strong className="text-amber-300">
                        {startupPreferences.mascotMode === 'builtin'
                          ? 'Mascota Oficial PixelClash Studio'
                          : startupPreferences.mascotCustomName || 'Personalizada'}
                      </strong>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => gifInputRef.current?.click()}
                        className="px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Subir GIF / WEBP Animado</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => sheetInputRef.current?.click()}
                        className="px-3.5 py-2 rounded-lg border border-[#2d3754] bg-[#161c2e] hover:bg-[#1e2640] text-slate-100 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Grid className="w-3.5 h-3.5 text-sky-400" />
                        <span>Subir Spritesheet (PNG)</span>
                      </button>

                      {startupPreferences.mascotMode !== 'builtin' && (
                        <button
                          type="button"
                          onClick={handleResetMascot}
                          className="px-3 py-2 rounded-lg border border-[#2a334d] hover:bg-white/5 text-slate-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restaurar integrada</span>
                        </button>
                      )}
                    </div>

                    {startupPreferences.mascotMode === 'custom_spritesheet' && (
                      <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                        <label className="space-y-1">
                          <span className="text-[10px] text-slate-400 block">Columnas</span>
                          <input
                            type="number"
                            min={1}
                            max={64}
                            value={startupPreferences.mascotSheetCols}
                            onChange={(e) =>
                              onUpdateStartupPreferences({
                                ...startupPreferences,
                                mascotSheetCols: Math.max(1, parseInt(e.target.value, 10) || 1),
                              })
                            }
                            className="w-full px-2 py-1 rounded bg-[#0c101b] border border-[#29334d] font-mono tabular-nums text-slate-100"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[10px] text-slate-400 block">Filas</span>
                          <input
                            type="number"
                            min={1}
                            max={64}
                            value={startupPreferences.mascotSheetRows}
                            onChange={(e) =>
                              onUpdateStartupPreferences({
                                ...startupPreferences,
                                mascotSheetRows: Math.max(1, parseInt(e.target.value, 10) || 1),
                              })
                            }
                            className="w-full px-2 py-1 rounded bg-[#0c101b] border border-[#29334d] font-mono tabular-nums text-slate-100"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[10px] text-slate-400 block">FPS</span>
                          <input
                            type="number"
                            min={1}
                            max={60}
                            value={startupPreferences.mascotSheetFps}
                            onChange={(e) =>
                              onUpdateStartupPreferences({
                                ...startupPreferences,
                                mascotSheetFps: Math.max(1, Math.min(60, parseInt(e.target.value, 10) || 10)),
                              })
                            }
                            className="w-full px-2 py-1 rounded bg-[#0c101b] border border-[#29334d] font-mono tabular-nums text-slate-100"
                          />
                        </label>
                      </div>
                    )}

                    {mascotUploadNotice && (
                      <p className="text-[11px] text-emerald-400">{mascotUploadNotice}</p>
                    )}
                    {mascotUploadError && (
                      <p className="text-[11px] text-rose-400">{mascotUploadError}</p>
                    )}

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Para compilaciones de escritorio Windows (.exe), también puedes colocar directamente tu archivo en{' '}
                      <code className="font-mono text-slate-200">public/mascot.gif</code> o{' '}
                      <code className="font-mono text-slate-200">public/mascot.webp</code> y se cargará automáticamente al arrancar.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: AYUDA */}
          {section === 'ayuda' && (
            <div className="max-w-4xl space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {onOpenToolsGuide && (
                  <button
                    type="button"
                    onClick={onOpenToolsGuide}
                    className="p-4 rounded-xl border border-[#22293e] bg-[#111522] hover:border-amber-400/60 text-left space-y-2 transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-5 h-5 text-amber-400" />
                    <div className="text-xs font-bold text-slate-100">Guía de Herramientas</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Referencia interactiva de dibujo, capas, animación, FX Lab y perspectiva.
                    </p>
                  </button>
                )}
                {onOpenShortcutsModal && (
                  <button
                    type="button"
                    onClick={onOpenShortcutsModal}
                    className="p-4 rounded-xl border border-[#22293e] bg-[#111522] hover:border-sky-400/60 text-left space-y-2 transition-colors cursor-pointer"
                  >
                    <Keyboard className="w-5 h-5 text-sky-400" />
                    <div className="text-xs font-bold text-slate-100">Atajos de Teclado</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Personaliza atajos de herramientas, navegación, línea de tiempo y zoom.
                    </p>
                  </button>
                )}
                {onOpenInstallerGuide && (
                  <button
                    type="button"
                    onClick={onOpenInstallerGuide}
                    className="p-4 rounded-xl border border-[#22293e] bg-[#111522] hover:border-emerald-400/60 text-left space-y-2 transition-colors cursor-pointer"
                  >
                    <Monitor className="w-5 h-5 text-emerald-400" />
                    <div className="text-xs font-bold text-slate-100">Instalador de Escritorio</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Instrucciones paso a paso para compilar el ejecutable de Windows (.exe).
                    </p>
                  </button>
                )}
              </div>

              <div className="rounded-xl border border-[#22293e] bg-[#111522] p-5 space-y-3 text-xs">
                <h4 className="font-bold text-slate-100">Garantías del Motor PixelClash Studio</h4>
                <ul className="space-y-2 text-slate-300 leading-relaxed list-disc pl-4">
                  <li>
                    <strong>Conservación exacta de píxeles (1:1):</strong> Al abrir spritesheets o imágenes, nunca se aplica redimensionamiento automático ni suavizado. Se conservan anchura, altura, DPI y transparencias originales con Nearest Neighbor.
                  </li>
                  <li>
                    <strong>Sin límites artificiales de lienzo:</strong> Puedes crear o abrir documentos de 100×100, 1024×1024, 10000×10000 px o superiores. Los documentos grandes activan automáticamente almacenamiento por bloques (Tiled 256×256) y renderizado virtualizado.
                  </li>
                  <li>
                    <strong>Compatibilidad completa:</strong> Soporta .PCS, .PNG, .JPG, .WEBP, .GIF animado, .BMP, .TIFF, .TGA, .ICO, .ASE/.ASEPRITE, .PSD y Spritesheets.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* SECTION: NOVEDADES */}
          {section === 'novedades' && (
            <div className="max-w-3xl space-y-3.5">
              {[
                {
                  ver: 'v2.4',
                  title: 'Conservación 1:1 de Spritesheets, Motor Tiled Sin Límites y Pantalla de Inicio',
                  items: [
                    'Eliminados todos los límites artificiales de resolución (512 / 1024 / 4096 px) con estimador dinámico de RAM, VRAM y tamaño de proyecto.',
                    'Nuevo motor por bloques (Tiled 256×256) y viewport virtualizado para trabajar a 60 FPS con lienzos y spritesheets masivos.',
                    'Apertura exacta 1:1 conservando anchura, altura, DPI y transparencia con Nearest Neighbor predeterminado.',
                    'Diálogo de control de resolución al importar archivos distintos al lienzo y confirmación interactiva para hojas de sprites.',
                    'Pantalla Principal de Inicio con proyectos fijados, búsqueda, vista en cuadrícula/lista y animación de carga con soporte para tu mascota GIF/WEBP.',
                  ],
                },
                {
                  ver: 'v2.3',
                  title: 'Guías de Perspectiva, FX Lab Constructor y Soporte Multi-formato',
                  items: [
                    'Perspectiva de 1, 2 y 3 puntos, curvilínea, isométrica, dimétrica y trimétrica con puntos de fuga editables.',
                    'Constructor libre de efectos visuales (FX Lab) con bases, partículas, distorsión y modificadores.',
                    'Decodificadores nativos para Aseprite (.ase/.aseprite), GIF animado, TGA, TIFF, BMP, ICO, PSD y proyectos .pcs.',
                  ],
                },
              ].map((rel) => (
                <div
                  key={rel.ver}
                  className="rounded-xl border border-[#22293e] bg-[#111522] p-5 space-y-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-amber-400">{rel.ver}</span>
                    <h4 className="text-sm font-bold text-slate-100">{rel.title}</h4>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300 list-disc pl-4 leading-relaxed">
                    {rel.items.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
