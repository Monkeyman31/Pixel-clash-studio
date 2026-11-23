import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  FolderOpen,
  FileInput,
  Save,
  Download,
  Crop,
  Undo2,
  Redo2,
  Trash2,
  Maximize2,
  Scaling,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  Layers,
  Play,
  ArrowRightLeft,
  Grid3X3,
  ShieldAlert,
  Target,
  Film,
  FolderArchive,
  Keyboard,
  Monitor,
  Palette,
  HelpCircle,
  FileSpreadsheet,
  LayoutTemplate,
  Minimize2,
  Maximize2 as MaximizePanelIcon,
  RotateCcw,
  Eye,
  EyeOff,
  Copy,
  Scissors,
  ClipboardPaste,
  MapPin,
  SlidersHorizontal,
  FolderHeart,
  Image as ImageIcon,
  Columns2,
  Move,
  Unlock,
  ZoomIn,
  ZoomOut,
  Scan,
  FolderPlus,
  Paintbrush,
  Sparkles,
  PenTool,
  Sliders,
  LayoutGrid,
  Repeat,
  Folder,
  Upload,
  Clock,
  Pin,
  PinOff,
  Search,
  X,
  Ruler,
  Magnet,
  Lock,
  Plus,
  Hand,
  Check,
  Compass,
  FlaskConical,
  Wand2,
  Camera,
  Gauge,
  LogOut,
  FilePlus2,
  Zap,
} from 'lucide-react';
import { ExportModalTab } from './ExportModal';
import {
  PANEL_REGISTRY,
  PanelCollapseDisplayMode,
  RightPanelId,
  WORKSPACE_TEMPLATES,
  WorkspaceLayoutConfig,
} from '../constants/workspaceThemes';
import {
  GuidePresetKind,
  GuidesConfig,
  GuidesModalTab,
  PerformanceMode,
  PerspectiveGuideType,
  ProjectWorkMode,
  RecentProjectEntry,
  RulerUnit,
  ScenarioGuidePresetId,
  TransformActionId,
  WheelNavigationMode,
} from '../types';
import { PERSPECTIVE_TYPE_META, SCENARIO_GUIDE_PRESETS } from '../utils/guidesEngine';
import { WORK_MODES_REGISTRY, WORK_MODE_ORDER } from '../utils/workModesEngine';
import { STUDIO_Z } from './StudioTopLayer';
import {
  STUDIO_MENU_PORTAL_ATTR,
  StudioDropdownPortal,
  StudioVerticalSubMenu,
} from './StudioMenu';
import { getDesktopBridge } from '../utils/desktopBridge';

export type ImportMenuMode =
  | 'smart'
  | 'new_layer'
  | 'selected_group'
  | 'current_frame'
  | 'all_frames'
  | 'spritesheet'
  | 'reference'
  | 'references_panel'
  | 'asset'
  | 'brush'
  | 'palette'
  | 'config'
  | 'external_project';

interface MenuBarProps {
  onNewProject: () => void;
  /** Opens a file as a new/independent document (Ctrl+O) */
  onOpenFilePicker: () => void;
  /** Strictly imports content into the active project without replacing the document */
  onImportAction?: (mode: ImportMenuMode) => void;
  onSaveProjectPcs?: () => void;
  onSaveProjectJson: () => void;
  onSaveProjectAse?: () => void;
  onSaveProjectPsd?: () => void;
  onRestoreAutosave?: () => void;
  hasAutosave?: boolean;
  onOpenCanvasSizeModal: () => void;
  onOpenImageSizeModal: () => void;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onRotateClockwise: () => void;
  onOpenExportModal: (tab?: ExportModalTab) => void;
  onOpenLocalInstaller: () => void;
  onOpenLospecModal: () => void;
  onOpenToolGuide: () => void;
  onOpenToolLocator?: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onClearFrame: () => void;
  onAddLayer: () => void;
  onAddGroup?: () => void;
  onDuplicateActiveLayer?: () => void;
  onAddFrame: () => void;
  onDuplicateFrame: () => void;
  onDeleteFrame: () => void;
  onTogglePlay: () => void;
  isPlaying: boolean;
  playbackMode: 'loop' | 'pingpong' | 'once';
  onTogglePingPong: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showHitboxes: boolean;
  onToggleHitboxes: () => void;
  showPivot: boolean;
  onTogglePivot: () => void;
  onionSkinEnabled: boolean;
  onToggleOnionSkin: () => void;
  clipOutsideCanvas?: boolean;
  onToggleClipOutsideCanvas?: () => void;
  onOpenShortcuts: () => void;
  onOpenSpriteSheetTemplate?: () => void;
  onOpenLayoutModal?: (tab?: 'layout' | 'style' | 'selections' | 'minipreview') => void;
  onTriggerZoomAction?: (type: 'in' | 'out' | 'fit' | 'percent', percent?: number) => void;
  showOptionsBar?: boolean;
  onToggleOptionsBar?: () => void;
  workspaceLayout?: WorkspaceLayoutConfig;
  onUpdateWorkspaceLayout?: (updater: (prev: WorkspaceLayoutConfig) => WorkspaceLayoutConfig) => void;
  onTogglePanelVisible?: (id: RightPanelId) => void;
  onTogglePanelMini?: (id: RightPanelId) => void;
  onResetDefaultLayout?: () => void;
  hasClipboard?: boolean;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onPasteInPlace?: () => void;
  onAddAdjustmentLayer?: () => void;
  onFocusPanel?: (id: RightPanelId) => void;
  onTransformAction?: (action: TransformActionId) => void;
  hasLastTransform?: boolean;
  // Selection & Vector helpers
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  onInvertSelection?: () => void;
  onSelectVectorTool?: (tool: 'vector_line' | 'direct_select') => void;
  // Command Palette, Dynamic Shortcuts, Presets & Floating Windows
  shortcutLabels?: Partial<Record<string, string>>;
  onOpenCommandPalette?: () => void;
  onApplyWorkspacePreset?: (templateId: string) => void;
  onResetFloatingWindows?: () => void;
  onToggleUiEditMode?: () => void;
  onOpenWhatIsThisMode?: () => void;
  whatIsThisActive?: boolean;
  // Recent Projects (Archivo > Abrir Recientes)
  recentProjects?: RecentProjectEntry[];
  onOpenRecentProject?: (entry: RecentProjectEntry) => void;
  onTogglePinRecentProject?: (id: string) => void;
  onRemoveRecentProject?: (id: string) => void;
  onClearRecentProjects?: () => void;
  // Rulers, Guides, Perspective, Snapping & Wheel Navigation (Ver)
  guidesConfig?: GuidesConfig;
  guidesCount?: number;
  onToggleRulers?: () => void;
  onToggleGuidesVisible?: () => void;
  onToggleLockGuides?: () => void;
  onChangeRulerUnit?: (unit: RulerUnit) => void;
  onToggleSnapOption?: (key: 'snapToGuides' | 'snapToRulers' | 'snapToGrid' | 'snapToPerspective') => void;
  onOpenGuidesModal?: (tab?: GuidesModalTab) => void;
  onApplyGuidePreset?: (preset: GuidePresetKind) => void;
  onClearAllGuides?: () => void;
  onChangeGuidesConfig?: (next: GuidesConfig) => void;
  onSelectPerspectiveType?: (type: PerspectiveGuideType) => void;
  onApplyScenarioGuidePreset?: (preset: ScenarioGuidePresetId) => void;
  wheelNavMode?: WheelNavigationMode;
  onToggleWheelNavMode?: () => void;
  // Work Modes & FX Studio (Proyecto)
  workMode?: ProjectWorkMode;
  onChangeWorkMode?: (mode: ProjectWorkMode) => void;
  onOpenFxStudio?: (tab?: 'generator' | 'lab' | 'library') => void;
  onCreateSuggestedModeLayers?: (mode: ProjectWorkMode) => void;
  onApplyModeGuides?: (mode: ProjectWorkMode) => void;
  dummyEnabled?: boolean;
  onToggleDummy?: () => void;
  // Performance Mode, Save As / Close Documents & Global Clipboard
  performanceMode?: PerformanceMode;
  onChangePerformanceMode?: (mode: PerformanceMode) => void;
  onOpenSaveAsModal?: () => void;
  onCloseActiveDocument?: () => void;
  onRequestCloseAllDocuments?: () => void;
  onNewDocumentFromClipboard?: () => void;
  onPasteAsReference?: () => void;
  quickPasteMode?: boolean;
  onToggleQuickPasteMode?: () => void;
  // Home Screen & Startup Splash Controls
  onOpenHomeScreen?: (section?: 'inicio' | 'recientes' | 'configuracion' | 'ayuda' | 'novedades') => void;
  onTestSplashAnimation?: () => void;
  onActivateCanvasEditTool?: () => void;
  dragEmptySpace?: boolean;
  isWindowMaximized?: boolean;
  onToggleMaximizeWindow?: () => void;
}

// Strictly vertical submenu alias (zero horizontal flyouts, preserves main menu structure)
const SubMenu = StudioVerticalSubMenu;

interface TopMenuGroupProps {
  id: string;
  label: string;
  activeMenu: string | null;
  onToggle: (id: string) => void;
  onHover: (id: string) => void;
  btnClass: string;
  widthClass?: string;
  children: React.ReactNode;
}

const TopMenuGroup: React.FC<TopMenuGroupProps> = ({
  id,
  label,
  activeMenu,
  onToggle,
  onHover,
  btnClass,
  widthClass = 'w-64',
  children,
}) => {
  const triggerRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={triggerRef} className="relative" onMouseEnter={() => onHover(id)}>
      <button type="button" onClick={() => onToggle(id)} className={btnClass}>
        {label}
      </button>
      <StudioDropdownPortal
        isOpen={activeMenu === id}
        anchorRef={triggerRef}
        widthClass={widthClass}
      >
        {children}
      </StudioDropdownPortal>
    </div>
  );
};

export const MenuBar: React.FC<MenuBarProps> = ({
  onNewProject,
  onOpenFilePicker,
  onImportAction,
  onSaveProjectPcs,
  onSaveProjectJson,
  onSaveProjectAse,
  onSaveProjectPsd,
  onRestoreAutosave,
  hasAutosave = false,
  onOpenCanvasSizeModal,
  onOpenImageSizeModal,
  onFlipHorizontal,
  onFlipVertical,
  onRotateClockwise,
  onOpenExportModal,
  onOpenLocalInstaller,
  onOpenLospecModal,
  onOpenToolGuide,
  onOpenToolLocator,
  onOpenSpriteSheetTemplate,
  onOpenLayoutModal,
  onTriggerZoomAction,
  showOptionsBar = true,
  onToggleOptionsBar,
  workspaceLayout,
  onUpdateWorkspaceLayout,
  onTogglePanelVisible,
  onTogglePanelMini,
  onResetDefaultLayout,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClearFrame,
  onAddLayer,
  onAddGroup,
  onDuplicateActiveLayer,
  onAddFrame,
  onDuplicateFrame,
  onDeleteFrame,
  onTogglePlay,
  isPlaying,
  playbackMode,
  onTogglePingPong,
  showGrid,
  onToggleGrid,
  showHitboxes,
  onToggleHitboxes,
  showPivot,
  onTogglePivot,
  onionSkinEnabled,
  onToggleOnionSkin,
  clipOutsideCanvas = false,
  onToggleClipOutsideCanvas,
  onOpenShortcuts,
  hasClipboard = false,
  onCopy,
  onCut,
  onPaste,
  onPasteInPlace,
  onAddAdjustmentLayer,
  onFocusPanel,
  onTransformAction,
  hasLastTransform = false,
  onSelectAll,
  onClearSelection,
  onInvertSelection,
  onSelectVectorTool,
  shortcutLabels = {},
  onOpenCommandPalette,
  onApplyWorkspacePreset,
  onResetFloatingWindows,
  onToggleUiEditMode,
  onOpenWhatIsThisMode,
  whatIsThisActive = false,
  recentProjects = [],
  onOpenRecentProject,
  onTogglePinRecentProject,
  onRemoveRecentProject,
  onClearRecentProjects,
  guidesConfig,
  guidesCount = 0,
  onToggleRulers,
  onToggleGuidesVisible,
  onToggleLockGuides,
  onChangeRulerUnit,
  onToggleSnapOption,
  onOpenGuidesModal,
  onApplyGuidePreset,
  onClearAllGuides,
  onChangeGuidesConfig,
  onSelectPerspectiveType,
  onApplyScenarioGuidePreset,
  wheelNavMode = 'pan',
  onToggleWheelNavMode,
  workMode = 'fighter',
  onChangeWorkMode,
  onOpenFxStudio,
  onCreateSuggestedModeLayers,
  onApplyModeGuides,
  dummyEnabled = false,
  onToggleDummy,
  performanceMode = 'balanced',
  onChangePerformanceMode,
  onOpenSaveAsModal,
  onCloseActiveDocument,
  onRequestCloseAllDocuments,
  onNewDocumentFromClipboard,
  onPasteAsReference,
  quickPasteMode = false,
  onToggleQuickPasteMode,
  onOpenHomeScreen,
  onTestSplashAnimation,
  onActivateCanvasEditTool,
  dragEmptySpace = false,
  isWindowMaximized = false,
  onToggleMaximizeWindow,
}) => {
  const activeWorkModeDef = WORK_MODES_REGISTRY[workMode] || WORK_MODES_REGISTRY.fighter;
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [recentSearchQuery, setRecentSearchQuery] = useState<string>('');
  const menuBarRef = useRef<HTMLDivElement>(null);

  const filteredRecentProjects = React.useMemo(() => {
    const q = recentSearchQuery.trim().toLowerCase();
    const sorted = [...recentProjects].sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
      return 0;
    });
    if (!q) return sorted;
    return sorted.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.path || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q)
    );
  }, [recentProjects, recentSearchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest(`[${STUDIO_MENU_PORTAL_ATTR}]`)) {
        return;
      }
      if (menuBarRef.current && !menuBarRef.current.contains(target as Node)) {
        setActiveMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveMenu(null);
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleMenuClick = (menu: string) => {
    setActiveMenu((prev) => (prev === menu ? null : menu));
  };

  const handleMenuHover = (menu: string) => {
    if (activeMenu && activeMenu !== menu) {
      setActiveMenu(menu);
    }
  };

  const handleItemClick = (action: () => void) => {
    action();
    setActiveMenu(null);
  };

  const menuBtnClass = (id: string) =>
    `px-2.5 py-1 rounded transition-colors cursor-pointer ${
      activeMenu === id
        ? 'bg-[#252c3f] text-white font-bold'
        : 'text-slate-300 hover:text-white hover:bg-[#1a1e2b]'
    }`;

  const floatingCount = Object.values(workspaceLayout?.floatingPanels || {}).filter(
    (f) => f?.isFloating
  ).length;

  const visiblePanelsList = (workspaceLayout?.rightPanels || []).filter((p) => {
    const meta = PANEL_REGISTRY.find((m) => m.id === p.id);
    return (
      !meta?.requiresTotalFreedom ||
      workspaceLayout?.uiEditMode ||
      workspaceLayout?.totalFreedomMode
    );
  });

  const panelGroups: { label: string; ids: RightPanelId[] }[] = [
    { label: 'Dibujo y Color', ids: ['colorwheel', 'brushes', 'symmetry', 'filters'] },
    { label: 'Capas y Escena', ids: ['layers', 'properties', 'references', 'library'] },
    { label: 'Animación e IA', ids: ['timeline', 'combat', 'workmode', 'ai', 'toolbar', 'topbar'] },
  ];

  const renderPanelToggleRow = (p: WorkspaceLayoutConfig['rightPanels'][number]) => {
    const isMini = p.dock === 'left-mini' || p.dock === 'right-mini';
    return (
      <div
        key={p.id}
        className="px-3 py-1 flex items-center justify-between gap-2 hover:bg-[#1c2234]"
      >
        <button
          type="button"
          onClick={() => onTogglePanelVisible?.(p.id)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer"
        >
          {p.visible ? (
            <Eye className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <EyeOff className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          )}
          <span className={`truncate ${p.visible ? 'text-slate-200' : 'text-slate-500'}`}>
            {p.title}
          </span>
        </button>

        {onTogglePanelMini && p.visible && (
          <button
            type="button"
            onClick={() => onTogglePanelMini(p.id)}
            title={isMini ? 'Expandir a panel principal' : 'Convertir en minipanel lateral'}
            className={`px-1.5 py-0.5 rounded text-[9px] font-mono border flex items-center gap-1 shrink-0 cursor-pointer ${
              isMini
                ? 'bg-sky-500/20 border-sky-400/60 text-sky-300'
                : 'bg-[#1b2030] border-[#2b344d] text-slate-400 hover:text-white'
            }`}
          >
            {isMini ? (
              <>
                <MaximizePanelIcon className="w-2.5 h-2.5" />
                <span>Mini</span>
              </>
            ) : (
              <>
                <Minimize2 className="w-2.5 h-2.5" />
                <span>Principal</span>
              </>
            )}
          </button>
        )}
      </div>
    );
  };

  return (
    <div
      ref={menuBarRef}
      className="h-7 border-b px-3 flex items-center gap-1 select-none relative text-xs font-mono"
      style={{
        zIndex: STUDIO_Z.MENU_BAR,
        backgroundColor: 'var(--studio-bg-bar)',
        borderColor: 'var(--studio-border)',
        color: 'var(--studio-text)',
      }}
    >
      {/* ========================================================= */}
      {/* 1. ARCHIVO                                                */}
      {/* ========================================================= */}
      <TopMenuGroup
        id="archivo"
        label="Archivo"
        activeMenu={activeMenu}
        onToggle={handleMenuClick}
        onHover={handleMenuHover}
        btnClass={menuBtnClass('archivo')}
        widthClass="w-72"
      >
            {onOpenHomeScreen && (
              <>
                <button
                  type="button"
                  onClick={() => handleItemClick(() => onOpenHomeScreen('inicio'))}
                  className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left font-bold text-amber-300"
                >
                  <span className="flex items-center gap-2">
                    <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pantalla de Inicio...</span>
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono">Hub</span>
                </button>
                <div className="h-[1px] bg-[#22283a] my-1" />
              </>
            )}

            <button
              type="button"
              data-help-id="action.new_project"
              onClick={() => handleItemClick(onNewProject)}
              className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Nuevo Proyecto...</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Ctrl+N</span>
            </button>

            {onNewDocumentFromClipboard && (
              <button
                type="button"
                onClick={() => handleItemClick(onNewDocumentFromClipboard)}
                title="Crea un nuevo documento exacto con el tamaño y transparencia de la imagen en el portapapeles"
                className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left text-emerald-300"
              >
                <span className="flex items-center gap-2">
                  <FilePlus2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Nuevo desde Portapapeles</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">RGBA</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleItemClick(onOpenFilePicker)}
              title="Abre PNG, JPG, JPEG, WEBP, GIF animado, BMP, TIFF, TGA, ICO, ASE/ASEPRITE, PSD, PCS, JSON y Spritesheets"
              className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Abrir Documento...</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Ctrl+O</span>
            </button>

            <SubMenu
              label={`Abrir Recientes${recentProjects.length > 0 ? ` (${recentProjects.length})` : ''}`}
              icon={<Clock className="w-3.5 h-3.5 text-sky-400" />}
              widthClass="w-96"
            >
              <div
                className="px-2.5 pt-1.5 pb-1.5 border-b border-[#22283a]"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="relative flex items-center">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2 pointer-events-none" />
                  <input
                    type="text"
                    value={recentSearchQuery}
                    onChange={(e) => setRecentSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre o ruta..."
                    className="w-full pl-6 pr-6 py-1 rounded-md bg-[#0e111b] border border-[#283148] text-[11px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  {recentSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setRecentSearchQuery('')}
                      className="absolute right-1.5 text-slate-400 hover:text-white"
                      title="Limpiar búsqueda"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {filteredRecentProjects.length === 0 ? (
                <div className="px-3 py-5 text-center text-[11px] text-slate-400">
                  {recentProjects.length === 0
                    ? 'Aún no hay proyectos recientes registrados.'
                    : 'No se encontraron proyectos con ese filtro.'}
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto divide-y divide-[#1e2436]">
                  {filteredRecentProjects.map((entry) => {
                    const ext = entry.fileFormat || 'pcs';
                    const displayPath =
                      entry.diskPath ||
                      entry.path ||
                      `Proyectos/${entry.name.replace(/\s+/g, '_')}.${ext}`;
                    const modDate = entry.modifiedAt || entry.openedAt;
                    return (
                      <div
                        key={entry.id}
                        className="px-2.5 py-2 hover:bg-[#1e2538] transition-colors flex items-center gap-2 group"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenRecentProject) {
                              handleItemClick(() => onOpenRecentProject(entry));
                            }
                          }}
                          title={`${entry.name}\nRuta: ${displayPath}\nModificado: ${modDate}`}
                          className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-md border border-[#2d3650] canvas-checkerboard shrink-0 overflow-hidden flex items-center justify-center">
                            {entry.thumbnailDataUrl ? (
                              <img
                                src={entry.thumbnailDataUrl}
                                alt={entry.name}
                                className="w-full h-full object-contain pixel-canvas"
                              />
                            ) : (
                              <FileText className="w-4 h-4 text-slate-500" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              {entry.pinned && (
                                <Pin className="w-3 h-3 text-amber-400 shrink-0" />
                              )}
                              <span className="text-xs font-semibold text-slate-100 truncate">
                                {entry.name}
                              </span>
                            </div>
                            <div
                              className="text-[10px] text-slate-400 truncate font-mono"
                              title={displayPath}
                            >
                              {displayPath}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono tabular-nums flex items-center gap-1.5">
                              <span>{entry.width}×{entry.height} px</span>
                              {entry.frameCount && entry.frameCount > 1 && (
                                <>
                                  <span>·</span>
                                  <span>{entry.frameCount} fr</span>
                                </>
                              )}
                              <span>·</span>
                              <span className="truncate">Mod: {modDate}</span>
                            </div>
                          </div>
                        </button>

                        <div className="flex items-center gap-0.5 shrink-0">
                          {onTogglePinRecentProject && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onTogglePinRecentProject(entry.id);
                              }}
                              title={entry.pinned ? 'Desanclar proyecto' : 'Anclar proyecto'}
                              className={`p-1 rounded hover:bg-white/10 transition-colors ${
                                entry.pinned ? 'text-amber-400' : 'text-slate-500 hover:text-slate-200'
                              }`}
                            >
                              {entry.pinned ? (
                                <PinOff className="w-3.5 h-3.5" />
                              ) : (
                                <Pin className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                          {onRemoveRecentProject && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveRecentProject(entry.id);
                              }}
                              title="Eliminar de recientes"
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {recentProjects.length > 0 && onClearRecentProjects && (
                <div className="border-t border-[#22283a] mt-1 pt-1 px-2 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">
                    {recentProjects.filter((r) => r.pinned).length} anclado(s)
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearRecentProjects();
                    }}
                    className="px-2 py-1 rounded text-[11px] text-rose-400 hover:bg-rose-500/10 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Limpiar lista</span>
                  </button>
                </div>
              )}
            </SubMenu>

            {onImportAction && (
              <SubMenu
                label="Importar al Proyecto"
                icon={<FileInput className="w-3.5 h-3.5 text-emerald-400" />}
                accent
                widthClass="w-68"
              >
                <button
                  type="button"
                  onClick={() => handleItemClick(() => onImportAction('smart'))}
                  className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left font-bold text-amber-300"
                >
                  <span className="flex items-center gap-2">
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>Importación Inteligente...</span>
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono">Ctrl+Shift+I</span>
                </button>

                <div className="h-[1px] bg-[#22283a] my-1" />

                <button
                  type="button"
                  onClick={() => handleItemClick(() => onImportAction('new_layer'))}
                  className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] transition-colors text-left"
                >
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  <span>Importar a Nueva Capa...</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleItemClick(() => onImportAction('selected_group'))}
                  className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] transition-colors text-left"
                >
                  <Folder className="w-3.5 h-3.5 text-sky-400" />
                  <span>Importar a Grupo Seleccionado...</span>
                </button>

                <SubMenu
                  label="Importar en Fotogramas"
                  icon={<Film className="w-3.5 h-3.5 text-indigo-400" />}
                  widthClass="w-60"
                >
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onImportAction('current_frame'))}
                    className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] transition-colors text-left"
                  >
                    <Film className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Importar a Frame Actual...</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onImportAction('all_frames'))}
                    className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] transition-colors text-left"
                  >
                    <Repeat className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Importar a Todos los Frames...</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onImportAction('spritesheet'))}
                    className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] transition-colors text-left"
                  >
                    <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                    <span>Abrir / Cortar Spritesheet...</span>
                  </button>
                </SubMenu>

                <SubMenu
                  label="Importar Referencias"
                  icon={<LayoutGrid className="w-3.5 h-3.5 text-amber-400" />}
                  widthClass="w-64"
                >
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onImportAction('reference'))}
                    className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] transition-colors text-left"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span>Importar como Referencia...</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onImportAction('references_panel'))}
                    className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] transition-colors text-left"
                  >
                    <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                    <span>Importar al Panel de Referencias...</span>
                  </button>
                </SubMenu>

                <div className="h-[1px] bg-[#22283a] my-1" />

                <button
                  type="button"
                  onClick={() => handleItemClick(() => onImportAction('asset'))}
                  className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] transition-colors text-left"
                >
                  <FolderHeart className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Importar como Asset...</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleItemClick(() => onImportAction('brush'))}
                  className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] transition-colors text-left"
                >
                  <Paintbrush className="w-3.5 h-3.5 text-rose-400" />
                  <span>Importar como Pincel...</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleItemClick(() => onImportAction('palette'))}
                  className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
                >
                  <span className="flex items-center gap-2">
                    <Palette className="w-3.5 h-3.5 text-amber-400" />
                    <span>Importar Paleta...</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">.hex/.gpl</span>
                </button>

                <SubMenu
                  label="Configuración y Proyectos"
                  icon={<Sliders className="w-3.5 h-3.5 text-slate-400" />}
                  widthClass="w-68"
                >
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onImportAction('config'))}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
                  >
                    <span>Importar Configuración...</span>
                    <span className="text-[10px] text-slate-500 font-mono">.pcslayout</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onImportAction('external_project'))}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
                  >
                    <span>Importar Proyecto Externo...</span>
                    <span className="text-[10px] text-slate-500 font-mono">.pcs/.psd/.ase</span>
                  </button>
                </SubMenu>
              </SubMenu>
            )}

            {onRestoreAutosave && hasAutosave && (
              <button
                type="button"
                onClick={() => handleItemClick(onRestoreAutosave)}
                className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left text-emerald-300"
              >
                <span className="flex items-center gap-2">
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Restaurar Autoguardado</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">Local</span>
              </button>
            )}

            <div className="h-[1px] bg-[#22283a] my-1" />

            {onSaveProjectPcs && (
              <button
                type="button"
                onClick={() => handleItemClick(onSaveProjectPcs)}
                className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left font-bold text-amber-300"
              >
                <span className="flex items-center gap-2">
                  <Save className="w-3.5 h-3.5 text-amber-400" />
                  <span>Guardar</span>
                </span>
                <span className="text-[10px] text-amber-400 font-mono">Ctrl+S</span>
              </button>
            )}

            {onOpenSaveAsModal && (
              <button
                type="button"
                onClick={() => handleItemClick(onOpenSaveAsModal)}
                className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left text-slate-200"
              >
                <span className="flex items-center gap-2">
                  <Save className="w-3.5 h-3.5 text-sky-400" />
                  <span>Guardar como...</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Ctrl+Shift+S</span>
              </button>
            )}

            <SubMenu
              label="Guardar rápido en formato"
              icon={<Save className="w-3.5 h-3.5 text-slate-400" />}
              widthClass="w-60"
            >
              <button
                type="button"
                onClick={() => handleItemClick(onSaveProjectJson)}
                className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
              >
                <span>Proyecto JSON</span>
                <span className="text-[10px] text-slate-500 font-mono">.json</span>
              </button>
              {onSaveProjectAse && (
                <button
                  type="button"
                  onClick={() => handleItemClick(onSaveProjectAse)}
                  className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
                >
                  <span>Aseprite</span>
                  <span className="text-[10px] text-sky-400 font-mono">.ase</span>
                </button>
              )}
              {onSaveProjectPsd && (
                <button
                  type="button"
                  onClick={() => handleItemClick(onSaveProjectPsd)}
                  className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
                >
                  <span>Adobe Photoshop</span>
                  <span className="text-[10px] text-indigo-400 font-mono">.psd</span>
                </button>
              )}
            </SubMenu>

            <SubMenu
              label="Exportar"
              icon={<Download className="w-3.5 h-3.5 text-amber-400" />}
              widthClass="w-68"
            >
              <button
                type="button"
                onClick={() => handleItemClick(() => onOpenExportModal('gif'))}
                className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left font-semibold text-amber-300"
              >
                <span className="flex items-center gap-2">
                  <Film className="w-3.5 h-3.5 text-amber-400" />
                  <span>GIF Animado...</span>
                </span>
                <span className="text-[10px] font-mono text-amber-400">.gif</span>
              </button>

              <button
                type="button"
                onClick={() => handleItemClick(() => onOpenExportModal('spritesheet'))}
                className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
              >
                <span className="flex items-center gap-2">
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Spritesheet PNG...</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">.png</span>
              </button>

              {onOpenSpriteSheetTemplate && (
                <button
                  type="button"
                  onClick={() => handleItemClick(onOpenSpriteSheetTemplate)}
                  className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left text-indigo-300"
                >
                  <span className="flex items-center gap-2">
                    <Grid3X3 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Plantilla Sprite Sheet...</span>
                  </span>
                  <span className="text-[10px] font-mono text-indigo-400">Atlas</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleItemClick(() => onOpenExportModal('sequence'))}
                className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
              >
                <span className="flex items-center gap-2">
                  <FolderArchive className="w-3.5 h-3.5 text-slate-400" />
                  <span>Secuencia PNG (ZIP)...</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">.zip</span>
              </button>

              <button
                type="button"
                onClick={() => handleItemClick(() => onOpenExportModal('single'))}
                className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
              >
                <span className="flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Fotograma Actual...</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">.png</span>
              </button>

              <button
                type="button"
                onClick={() => handleItemClick(() => onOpenExportModal('advanced'))}
                className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left text-emerald-300"
              >
                <span className="flex items-center gap-2">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Exportación Avanzada...</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400">.csv/.spine</span>
              </button>
            </SubMenu>

            <div className="h-[1px] bg-[#22283a] my-1" />

            <button
              type="button"
              onClick={() => handleItemClick(onOpenLocalInstaller)}
              className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left font-bold text-amber-300"
            >
              <span className="flex items-center gap-2">
                <Monitor className="w-3.5 h-3.5 text-amber-400" />
                <span>Instalador Windows (.exe / .msi)...</span>
              </span>
              <span className="text-[10px] font-mono text-amber-400">EXE/MSI</span>
            </button>

            {(onCloseActiveDocument || onRequestCloseAllDocuments) && (
              <>
                <div className="h-[1px] bg-[#22283a] my-1" />
                {onCloseActiveDocument && (
                  <button
                    type="button"
                    onClick={() => handleItemClick(onCloseActiveDocument)}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left text-slate-200"
                  >
                    <span className="flex items-center gap-2">
                      <X className="w-3.5 h-3.5 text-slate-400" />
                      <span>Cerrar Documento</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Ctrl+W</span>
                  </button>
                )}
                {onRequestCloseAllDocuments && (
                  <button
                    type="button"
                    onClick={() => handleItemClick(onRequestCloseAllDocuments)}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left text-rose-300"
                  >
                    <span className="flex items-center gap-2">
                      <LogOut className="w-3.5 h-3.5 text-rose-400" />
                      <span>Salir / Cerrar aplicación</span>
                    </span>
                    <span className="text-[10px] text-rose-400 font-mono">Ctrl+Q</span>
                  </button>
                )}
              </>
            )}
      </TopMenuGroup>

      {/* ========================================================= */}
      {/* 1B. PROYECTO — MODO DE TRABAJO & FX LAB                   */}
      {/* ========================================================= */}
      <TopMenuGroup
        id="proyecto"
        label="Proyecto"
        activeMenu={activeMenu}
        onToggle={handleMenuClick}
        onHover={handleMenuHover}
        btnClass={menuBtnClass('proyecto')}
        widthClass="w-72"
      >
            <SubMenu
              label={`Modo de Trabajo (${activeWorkModeDef.shortLabel})`}
              icon={<Compass className="w-3.5 h-3.5 text-amber-400" />}
              accent
              widthClass="w-72"
            >
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-[#22283a]">
                No destructivo · conserva todos tus píxeles
              </div>
              {WORK_MODE_ORDER.map((modeId) => {
                const def = WORK_MODES_REGISTRY[modeId];
                const isSelected = modeId === workMode;
                return (
                  <button
                    key={modeId}
                    type="button"
                    onClick={() => handleItemClick(() => onChangeWorkMode?.(modeId))}
                    className={`px-3 py-1.5 flex items-center justify-between gap-2 hover:bg-[#20273a] transition-colors text-left ${
                      isSelected ? 'bg-[#1c2336] text-amber-200 font-semibold' : 'text-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: def.accentColor }}
                      />
                      <span className="flex flex-col min-w-0">
                        <span className="truncate">{def.label}</span>
                        <span className="text-[10px] text-slate-500 truncate">{def.description}</span>
                      </span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  </button>
                );
              })}
            </SubMenu>

            <div className="h-[1px] bg-[#22283a] my-1" />

            <button
              type="button"
              onClick={() => handleItemClick(() => onOpenFxStudio?.('generator'))}
              className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left text-violet-200 font-semibold"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                <span>Generar Efecto (IA FX)...</span>
              </span>
              <span className="text-[10px] font-mono text-violet-400">17 FX</span>
            </button>

            <button
              type="button"
              onClick={() => handleItemClick(() => onOpenFxStudio?.('lab'))}
              className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left text-cyan-200"
            >
              <span className="flex items-center gap-2">
                <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
                <span>FX Lab (Editor Modular)...</span>
              </span>
              <span className="text-[10px] font-mono text-cyan-400">LAB</span>
            </button>

            <div className="h-[1px] bg-[#22283a] my-1" />

            <button
              type="button"
              onClick={() => handleItemClick(() => onCreateSuggestedModeLayers?.(workMode))}
              className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>Crear Capas Sugeridas ({activeWorkModeDef.shortLabel})</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleItemClick(() => onApplyModeGuides?.(workMode))}
              className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <Ruler className="w-3.5 h-3.5 text-sky-400" />
                <span>Aplicar Guías del Modo</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleItemClick(() => onOpenExportModal('mode_export'))}
              className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left text-amber-200"
            >
              <span className="flex items-center gap-2">
                <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Exportación Especializada...</span>
              </span>
              <span className="text-[10px] font-mono text-amber-400">{activeWorkModeDef.shortLabel}</span>
            </button>

            {onToggleDummy && (
              <>
                <div className="h-[1px] bg-[#22283a] my-1" />
                <SubMenu
                  label="Fighter Mode · Herramientas"
                  icon={<ShieldAlert className="w-3.5 h-3.5 text-rose-400" />}
                  widthClass="w-64"
                >
                  <button
                    type="button"
                    onClick={() => handleItemClick(onToggleDummy)}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
                  >
                    <span className="flex items-center gap-2">
                      <Target className="w-3.5 h-3.5 text-rose-400" />
                      <span>Dummy de Práctica (Sparring)</span>
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono">
                      {dummyEnabled ? '✓ Activo' : 'Oculto'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleItemClick(onToggleHitboxes)}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
                  >
                    <span className="flex items-center gap-2">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                      <span>Cajas Hitbox / Hurtbox</span>
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono">
                      {showHitboxes ? '✓' : ''}
                    </span>
                  </button>
                </SubMenu>
              </>
            )}
      </TopMenuGroup>

      {/* ========================================================= */}
      {/* 2. EDICIÓN                                                */}
      {/* ========================================================= */}
      <TopMenuGroup
        id="edicion"
        label="Edición"
        activeMenu={activeMenu}
        onToggle={handleMenuClick}
        onHover={handleMenuHover}
        btnClass={menuBtnClass('edicion')}
        widthClass="w-68"
      >
            <button
              type="button"
              disabled={!canUndo}
              onClick={() => handleItemClick(onUndo)}
              className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left disabled:opacity-40"
            >
              <span className="flex items-center gap-2">
                <Undo2 className="w-3.5 h-3.5" />
                <span>Deshacer</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {shortcutLabels['edit.undo'] || 'Ctrl+Z'}
              </span>
            </button>

            <button
              type="button"
              disabled={!canRedo}
              onClick={() => handleItemClick(onRedo)}
              className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left disabled:opacity-40"
            >
              <span className="flex items-center gap-2">
                <Redo2 className="w-3.5 h-3.5" />
                <span>Rehacer</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {shortcutLabels['edit.redo'] || 'Ctrl+Shift+Z'}
              </span>
            </button>

            <div className="h-[1px] bg-[#22283a] my-1" />

            {(onCopy || onCut || onPaste) && (
              <SubMenu
                label="Portapapeles"
                icon={<Copy className="w-3.5 h-3.5 text-sky-400" />}
                widthClass="w-64"
              >
                {onCopy && (
                  <button
                    type="button"
                    onClick={() => handleItemClick(onCopy)}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
                  >
                    <span className="flex items-center gap-2">
                      <Copy className="w-3.5 h-3.5 text-sky-400" />
                      <span>Copiar</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {shortcutLabels['edit.copy'] || 'Ctrl+C'}
                    </span>
                  </button>
                )}
                {onCut && (
                  <button
                    type="button"
                    onClick={() => handleItemClick(onCut)}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
                  >
                    <span className="flex items-center gap-2">
                      <Scissors className="w-3.5 h-3.5 text-rose-400" />
                      <span>Cortar</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {shortcutLabels['edit.cut'] || 'Ctrl+X'}
                    </span>
                  </button>
                )}
                {onPaste && (
                  <button
                    type="button"
                    onClick={() => handleItemClick(onPaste)}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
                    title="Pega capas internas o imágenes copiadas desde cualquier aplicación del sistema"
                  >
                    <span className="flex items-center gap-2">
                      <ClipboardPaste className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Pegar</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {shortcutLabels['edit.paste'] || 'Ctrl+V'}
                    </span>
                  </button>
                )}
                {onPasteInPlace && (
                  <button
                    type="button"
                    disabled={!hasClipboard}
                    onClick={() => handleItemClick(onPasteInPlace)}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left disabled:opacity-40 text-amber-300"
                  >
                    <span className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>Pegar en el mismo sitio</span>
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono">
                      {shortcutLabels['edit.paste_in_place'] || 'Ctrl+Shift+V'}
                    </span>
                  </button>
                )}
                {onPasteAsReference && (
                  <button
                    type="button"
                    onClick={() => handleItemClick(onPasteAsReference)}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left text-sky-300"
                    title="Pega la imagen del portapapeles del sistema directamente como referencia flotante"
                  >
                    <span className="flex items-center gap-2">
                      <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                      <span>Pegar como Referencia</span>
                    </span>
                    <span className="text-[10px] text-sky-400 font-mono">Ref</span>
                  </button>
                )}
                {onToggleQuickPasteMode && (
                  <>
                    <div className="h-[1px] bg-[#22283a] my-1" />
                    <button
                      type="button"
                      onClick={() => onToggleQuickPasteMode()}
                      className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
                      title="Al pegar imágenes externas, las coloca automáticamente en una nueva capa del grupo seleccionado sin mostrar el diálogo"
                    >
                      <span className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>Pegado rápido (sin preguntar)</span>
                      </span>
                      <span className="text-[10px] text-amber-400 font-mono">
                        {quickPasteMode ? '✓' : ''}
                      </span>
                    </button>
                  </>
                )}
              </SubMenu>
            )}

            {onTransformAction && (
              <SubMenu
                label="Transformar"
                icon={<Scaling className="w-3.5 h-3.5 text-amber-400" />}
                accent
                widthClass="w-60"
              >
                <button
                  type="button"
                  onClick={() => handleItemClick(() => onTransformAction('free'))}
                  className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left font-semibold text-amber-300"
                >
                  <span>Transformación Libre</span>
                  <span className="text-[10px] text-amber-400 font-mono">
                    {shortcutLabels['transform.free'] || 'Ctrl+T'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleItemClick(() => onTransformAction('scale'))}
                  className="px-3 py-1.5 hover:bg-[#20273a] transition-colors text-left"
                >
                  Escalar
                </button>
                <button
                  type="button"
                  onClick={() => handleItemClick(() => onTransformAction('rotate'))}
                  className="px-3 py-1.5 hover:bg-[#20273a] transition-colors text-left"
                >
                  Rotar Libre
                </button>

                <SubMenu label="Deformación Libre" widthClass="w-56">
                  {(
                    [
                      ['skew', 'Inclinar (Skew)'],
                      ['distort', 'Distorsionar'],
                      ['perspective', 'Perspectiva'],
                      ['warp', 'Deformación (Warp)'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleItemClick(() => onTransformAction(id))}
                      className="px-3 py-1.5 hover:bg-[#20273a] transition-colors text-left"
                    >
                      {label}
                    </button>
                  ))}
                </SubMenu>

                <SubMenu label="Rotar y Voltear" widthClass="w-56">
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onTransformAction('rot_90_ccw'))}
                    className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] text-left"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Rotar 90° Izquierda</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onTransformAction('rot_90_cw'))}
                    className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] text-left"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Rotar 90° Derecha</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onTransformAction('rot_180'))}
                    className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] text-left"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Rotar 180°</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onTransformAction('flip_h'))}
                    className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] text-left"
                  >
                    <FlipHorizontal className="w-3.5 h-3.5 text-slate-400" />
                    <span>Voltear Horizontal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onTransformAction('flip_v'))}
                    className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] text-left"
                  >
                    <FlipVertical className="w-3.5 h-3.5 text-slate-400" />
                    <span>Voltear Vertical</span>
                  </button>
                </SubMenu>

                <SubMenu label="Alineación y Simetría" widthClass="w-56">
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onTransformAction('snap_grid'))}
                    className="px-3 py-1.5 hover:bg-[#20273a] text-left"
                  >
                    Ajustar a Cuadrícula
                  </button>
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onTransformAction('center_canvas'))}
                    className="px-3 py-1.5 hover:bg-[#20273a] text-left"
                  >
                    Centrar en Lienzo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onTransformAction('sym_h'))}
                    className="px-3 py-1.5 hover:bg-[#20273a] text-left"
                  >
                    Simetría Horizontal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onTransformAction('sym_v'))}
                    className="px-3 py-1.5 hover:bg-[#20273a] text-left"
                  >
                    Simetría Vertical
                  </button>
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onTransformAction('sym_radial'))}
                    className="px-3 py-1.5 hover:bg-[#20273a] text-left"
                  >
                    Simetría Radial
                  </button>
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onTransformAction('reset'))}
                    className="px-3 py-1.5 hover:bg-[#20273a] text-left text-sky-300"
                  >
                    Restablecer Transformación
                  </button>
                </SubMenu>

                <SubMenu label="Pixel Art HQ y Tiles" widthClass="w-60">
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onTransformAction('scale_2x_hq'))}
                    className="px-3 py-1.5 hover:bg-[#20273a] text-left"
                  >
                    Escala x2 HQ (EPX)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onTransformAction('scale_3x_hq'))}
                    className="px-3 py-1.5 hover:bg-[#20273a] text-left"
                  >
                    Escala x3 HQ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onTransformAction('scale_4x_hq'))}
                    className="px-3 py-1.5 hover:bg-[#20273a] text-left"
                  >
                    Escala x4 HQ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onTransformAction('pp_rotate'))}
                    className="px-3 py-1.5 hover:bg-[#20273a] text-left"
                  >
                    Pixel Perfect Rotate
                  </button>
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onTransformAction('pp_resize'))}
                    className="px-3 py-1.5 hover:bg-[#20273a] text-left"
                  >
                    Pixel Perfect Resize
                  </button>
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onTransformAction('tile_mode'))}
                    className="px-3 py-1.5 hover:bg-[#20273a] text-left"
                  >
                    Transformación por Tiles
                  </button>
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onTransformAction('spritesheet_mode'))}
                    className="px-3 py-1.5 hover:bg-[#20273a] text-left"
                  >
                    Transformación por Spritesheet
                  </button>
                </SubMenu>

                <button
                  type="button"
                  disabled={!hasLastTransform}
                  onClick={() => handleItemClick(() => onTransformAction('repeat'))}
                  className="px-3 py-1.5 hover:bg-[#20273a] transition-colors text-left disabled:opacity-40"
                >
                  Repetir Última Transformación
                </button>
              </SubMenu>
            )}

            <SubMenu
              label="Selección"
              icon={<Scan className="w-3.5 h-3.5 text-emerald-400" />}
              widthClass="w-60"
            >
              {onSelectAll && (
                <button
                  type="button"
                  onClick={() => handleItemClick(onSelectAll)}
                  className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] text-left"
                >
                  <span>Seleccionar Todo</span>
                  <span className="text-[10px] text-slate-500 font-mono">Ctrl+A</span>
                </button>
              )}
              {onClearSelection && (
                <button
                  type="button"
                  onClick={() => handleItemClick(onClearSelection)}
                  className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] text-left"
                >
                  <span>Deseleccionar</span>
                  <span className="text-[10px] text-slate-500 font-mono">Esc</span>
                </button>
              )}
              {onInvertSelection && (
                <button
                  type="button"
                  onClick={() => handleItemClick(onInvertSelection)}
                  className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] text-left"
                >
                  <span>Invertir Selección</span>
                </button>
              )}
              {onOpenLayoutModal && (
                <button
                  type="button"
                  onClick={() => handleItemClick(() => onOpenLayoutModal('selections'))}
                  className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] text-left text-emerald-300"
                >
                  <span>Visualización de Selecciones...</span>
                </button>
              )}
            </SubMenu>

            {onSelectVectorTool && (
              <SubMenu
                label="Vectores"
                icon={<PenTool className="w-3.5 h-3.5 text-sky-400" />}
                widthClass="w-60"
              >
                <button
                  type="button"
                  onClick={() => handleItemClick(() => onSelectVectorTool('vector_line'))}
                  className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] text-left"
                >
                  <span>Línea Vectorial Editable</span>
                  <span className="text-[10px] text-slate-500 font-mono">L</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleItemClick(() => onSelectVectorTool('direct_select'))}
                  className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] text-left"
                >
                  <span>Selección Directa (Nodos)</span>
                  <span className="text-[10px] text-slate-500 font-mono">A</span>
                </button>
              </SubMenu>
            )}

            {onFocusPanel && (
              <SubMenu
                label="IA"
                icon={<Sparkles className="w-3.5 h-3.5 text-purple-400" />}
                widthClass="w-60"
              >
                <button
                  type="button"
                  onClick={() => handleItemClick(() => onFocusPanel('ai'))}
                  className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] text-left text-purple-200"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Abrir Suite IA (Escenarios / Img→Px)</span>
                </button>
              </SubMenu>
            )}

            <SubMenu
              label="Preferencias"
              icon={<Sliders className="w-3.5 h-3.5 text-amber-400" />}
              widthClass="w-64"
            >
              <button
                type="button"
                onClick={() => handleItemClick(onOpenShortcuts)}
                className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] text-left"
              >
                <span className="flex items-center gap-2">
                  <Keyboard className="w-3.5 h-3.5 text-amber-400" />
                  <span>Atajos de Teclado y Macros...</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {shortcutLabels['cmd.shortcuts_editor'] || 'Ctrl+Alt+K'}
                </span>
              </button>

              {onOpenLayoutModal && (
                <>
                  <button
                    type="button"
                    data-help-id="panel.appearance"
                    onClick={() => handleItemClick(() => onOpenLayoutModal('style'))}
                    className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] text-left text-sky-300"
                  >
                    <Palette className="w-3.5 h-3.5 text-sky-400" />
                    <span>Apariencia y Colores UI...</span>
                  </button>
                  <button
                    type="button"
                    data-help-id="prefs.selection_display"
                    onClick={() => handleItemClick(() => onOpenLayoutModal('selections'))}
                    className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] text-left text-emerald-300"
                  >
                    <Scan className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Selecciones y Guías...</span>
                  </button>
                </>
              )}
            </SubMenu>

            <div className="h-[1px] bg-[#22283a] my-1" />

            <button
              type="button"
              onClick={() => handleItemClick(onClearFrame)}
              className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] transition-colors text-left text-rose-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpiar Fotograma Actual</span>
            </button>
      </TopMenuGroup>

      {/* ========================================================= */}
      {/* 3. IMAGEN                                                 */}
      {/* ========================================================= */}
      <TopMenuGroup
        id="imagen"
        label="Imagen"
        activeMenu={activeMenu}
        onToggle={handleMenuClick}
        onHover={handleMenuHover}
        btnClass={menuBtnClass('imagen')}
        widthClass="w-68"
      >
            {onActivateCanvasEditTool && (
              <button
                type="button"
                onClick={() => handleItemClick(onActivateCanvasEditTool)}
                className="px-3 py-1.5 flex items-center justify-between gap-2 hover:bg-[#20273a] transition-colors text-left"
              >
                <span className="flex items-center gap-2">
                  <Crop className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="font-medium text-yellow-200">Editar Lienzo (Visual)</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {shortcutLabels['tool.canvas_edit'] || 'Shift+C'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleItemClick(onOpenCanvasSizeModal)}
              className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] transition-colors text-left"
            >
              <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Tamaño de Lienzo...</span>
            </button>

            <button
              type="button"
              onClick={() => handleItemClick(onOpenImageSizeModal)}
              className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] transition-colors text-left"
            >
              <Scaling className="w-3.5 h-3.5 text-sky-400" />
              <span>Tamaño de Imagen (Escalar)...</span>
            </button>

            <SubMenu
              label="Orientación del Lienzo"
              icon={<RotateCw className="w-3.5 h-3.5 text-slate-400" />}
              widthClass="w-56"
            >
              <button
                type="button"
                onClick={() => handleItemClick(onFlipHorizontal)}
                className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] text-left"
              >
                <FlipHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <span>Voltear Horizontal</span>
              </button>
              <button
                type="button"
                onClick={() => handleItemClick(onFlipVertical)}
                className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] text-left"
              >
                <FlipVertical className="w-3.5 h-3.5 text-slate-400" />
                <span>Voltear Vertical</span>
              </button>
              <button
                type="button"
                onClick={() => handleItemClick(onRotateClockwise)}
                className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] text-left"
              >
                <RotateCw className="w-3.5 h-3.5 text-slate-400" />
                <span>Rotar 90° Horario</span>
              </button>
            </SubMenu>

            {onToggleClipOutsideCanvas && (
              <button
                type="button"
                onClick={() => handleItemClick(onToggleClipOutsideCanvas)}
                className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
              >
                <span className="flex items-center gap-2">
                  <Crop className="w-3.5 h-3.5 text-amber-400" />
                  <span>Recortar fuera del lienzo</span>
                </span>
                <span className="text-[10px] text-amber-400 font-mono">
                  {clipOutsideCanvas ? '✓' : ''}
                </span>
              </button>
            )}

            <div className="h-[1px] bg-[#22283a] my-1" />

            <button
              type="button"
              onClick={() => handleItemClick(onOpenLospecModal)}
              className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left font-semibold text-amber-300"
            >
              <span className="flex items-center gap-2">
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                <span>Paletas Lospec...</span>
              </span>
              <span className="text-[10px] font-mono text-amber-400">.hex/.gpl</span>
            </button>

            {onFocusPanel && (
              <>
                <button
                  type="button"
                  onClick={() => handleItemClick(() => onFocusPanel('filters'))}
                  className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] transition-colors text-left"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
                  <span>Filtros y Ajustes de Color...</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleItemClick(() => onFocusPanel('library'))}
                  className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] transition-colors text-left"
                >
                  <FolderHeart className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Librería de Assets...</span>
                </button>
              </>
            )}
      </TopMenuGroup>

      {/* ========================================================= */}
      {/* 4. CAPA                                                   */}
      {/* ========================================================= */}
      <TopMenuGroup
        id="capa"
        label="Capa"
        activeMenu={activeMenu}
        onToggle={handleMenuClick}
        onHover={handleMenuHover}
        btnClass={menuBtnClass('capa')}
        widthClass="w-64"
      >
            <button
              type="button"
              onClick={() => handleItemClick(onAddLayer)}
              className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Nueva Capa</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Shift+N</span>
            </button>

            {onAddAdjustmentLayer && (
              <button
                type="button"
                onClick={() => handleItemClick(onAddAdjustmentLayer)}
                className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] transition-colors text-left text-purple-300"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
                <span>Nueva Capa de Ajuste</span>
              </button>
            )}

            {onAddGroup && (
              <button
                type="button"
                onClick={() => handleItemClick(onAddGroup)}
                className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] transition-colors text-left"
              >
                <FolderPlus className="w-3.5 h-3.5 text-sky-400" />
                <span>Nuevo Grupo / Carpeta</span>
              </button>
            )}

            {onDuplicateActiveLayer && (
              <button
                type="button"
                onClick={() => handleItemClick(onDuplicateActiveLayer)}
                className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] transition-colors text-left"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Duplicar Capa Activa</span>
              </button>
            )}

            {onFocusPanel && (
              <>
                <div className="h-[1px] bg-[#22283a] my-1" />
                <button
                  type="button"
                  onClick={() => handleItemClick(() => onFocusPanel('layers'))}
                  className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] transition-colors text-left text-slate-300"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>Mostrar Panel de Capas</span>
                </button>
              </>
            )}
      </TopMenuGroup>

      {/* ========================================================= */}
      {/* 5. ANIMACIÓN                                              */}
      {/* ========================================================= */}
      <TopMenuGroup
        id="animacion"
        label="Animación"
        activeMenu={activeMenu}
        onToggle={handleMenuClick}
        onHover={handleMenuHover}
        btnClass={menuBtnClass('animacion')}
        widthClass="w-64"
      >
            <button
              type="button"
              onClick={() => handleItemClick(onTogglePlay)}
              className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <Play className="w-3.5 h-3.5 text-amber-400" />
                <span>{isPlaying ? 'Pausar Reproducción' : 'Reproducir'}</span>
              </span>
              <span className="text-[10px] text-amber-400 font-mono">Enter / P</span>
            </button>

            <button
              type="button"
              onClick={() => handleItemClick(onTogglePingPong)}
              className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <ArrowRightLeft className="w-3.5 h-3.5 text-sky-400" />
                <span>Modo Ping-Pong</span>
              </span>
              <span className="text-[10px] text-sky-400 font-mono">
                {playbackMode === 'pingpong' ? '✓' : ''}
              </span>
            </button>

            <div className="h-[1px] bg-[#22283a] my-1" />

            <button
              type="button"
              onClick={() => handleItemClick(onAddFrame)}
              className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
            >
              <span>Nuevo Fotograma</span>
              <span className="text-[10px] text-slate-500 font-mono">N</span>
            </button>

            <button
              type="button"
              onClick={() => handleItemClick(onDuplicateFrame)}
              className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
            >
              <span>Duplicar Fotograma</span>
              <span className="text-[10px] text-slate-500 font-mono">Ctrl+D</span>
            </button>

            <button
              type="button"
              onClick={() => handleItemClick(onDeleteFrame)}
              className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] transition-colors text-left text-rose-400"
            >
              <span>Eliminar Fotograma Actual</span>
            </button>

            {onFocusPanel && (
              <>
                <div className="h-[1px] bg-[#22283a] my-1" />
                <button
                  type="button"
                  onClick={() => handleItemClick(() => onFocusPanel('timeline'))}
                  className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] transition-colors text-left text-amber-200"
                >
                  <Film className="w-3.5 h-3.5 text-amber-400" />
                  <span>Abrir Línea de Tiempo y Cámara</span>
                </button>
              </>
            )}
      </TopMenuGroup>

      {/* ========================================================= */}
      {/* 6. VER                                                    */}
      {/* ========================================================= */}
      <TopMenuGroup
        id="ver"
        label="Ver"
        activeMenu={activeMenu}
        onToggle={handleMenuClick}
        onHover={handleMenuHover}
        btnClass={menuBtnClass('ver')}
        widthClass="w-72"
      >
            <button
              type="button"
              onClick={() => handleItemClick(onToggleGrid)}
              className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <Grid3X3 className="w-3.5 h-3.5 text-slate-400" />
                <span>Rejilla de Píxeles</span>
              </span>
              <span className="text-[10px] text-amber-400 font-mono">{showGrid ? '✓' : ''}</span>
            </button>

            {onToggleRulers && (
              <button
                type="button"
                onClick={() => handleItemClick(onToggleRulers)}
                className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
              >
                <span className="flex items-center gap-2">
                  <Ruler className="w-3.5 h-3.5 text-amber-400" />
                  <span>Reglas</span>
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-mono">
                  <span className="text-slate-500">Ctrl+R</span>
                  <span className="text-amber-400 w-3 text-right">
                    {guidesConfig?.showRulers ? '✓' : ''}
                  </span>
                </span>
              </button>
            )}

            {guidesConfig && (
              <SubMenu
                label={`Guías y Reglas${guidesCount > 0 ? ` (${guidesCount})` : ''}`}
                icon={<Magnet className="w-3.5 h-3.5 text-sky-400" />}
                widthClass="w-64"
              >
                {onToggleGuidesVisible && (
                  <button
                    type="button"
                    onClick={() => handleItemClick(onToggleGuidesVisible)}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] text-left"
                  >
                    <span className="flex items-center gap-2">
                      {guidesConfig.showGuides ? (
                        <Eye className="w-3.5 h-3.5 text-sky-400" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span>Mostrar Guías</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-mono">
                      <span className="text-slate-500">Ctrl+;</span>
                      <span className="text-amber-400 w-3 text-right">
                        {guidesConfig.showGuides ? '✓' : ''}
                      </span>
                    </span>
                  </button>
                )}

                {onToggleLockGuides && (
                  <button
                    type="button"
                    onClick={() => handleItemClick(onToggleLockGuides)}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] text-left"
                  >
                    <span className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Bloquear Guías</span>
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono">
                      {guidesConfig.lockGuides ? '✓' : ''}
                    </span>
                  </button>
                )}

                {onOpenGuidesModal && (
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onOpenGuidesModal('exact'))}
                    className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] text-left font-medium text-amber-200"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Crear Guía en Posición Exacta...</span>
                  </button>
                )}

                {onApplyGuidePreset && (
                  <SubMenu
                    label="Guías de Animación / Lucha"
                    icon={<LayoutGrid className="w-3.5 h-3.5 text-emerald-400" />}
                    widthClass="w-56"
                  >
                    <button
                      type="button"
                      onClick={() => handleItemClick(() => onApplyGuidePreset('horizon'))}
                      className="px-3 py-1.5 hover:bg-[#20273a] text-left"
                    >
                      Línea de Horizonte
                    </button>
                    <button
                      type="button"
                      onClick={() => handleItemClick(() => onApplyGuidePreset('hud'))}
                      className="px-3 py-1.5 hover:bg-[#20273a] text-left"
                    >
                      Guías para HUD
                    </button>
                    <button
                      type="button"
                      onClick={() => handleItemClick(() => onApplyGuidePreset('character'))}
                      className="px-3 py-1.5 hover:bg-[#20273a] text-left"
                    >
                      Guías para Personajes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleItemClick(() => onApplyGuidePreset('stage'))}
                      className="px-3 py-1.5 hover:bg-[#20273a] text-left"
                    >
                      Guías para Escenarios
                    </button>
                  </SubMenu>
                )}

                {onChangeRulerUnit && (
                  <SubMenu
                    label="Unidades de Regla"
                    icon={<Ruler className="w-3.5 h-3.5 text-slate-400" />}
                    widthClass="w-52"
                  >
                    {(
                      [
                        ['px', 'Píxeles (px)'],
                        ['percent', 'Porcentaje (%)'],
                        ['custom', `Personalizado (${guidesConfig.customLabel || 'tile'})`],
                      ] as [RulerUnit, string][]
                    ).map(([unitKey, unitLabel]) => (
                      <button
                        key={unitKey}
                        type="button"
                        onClick={() => handleItemClick(() => onChangeRulerUnit(unitKey))}
                        className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] text-left"
                      >
                        <span>{unitLabel}</span>
                        <span className="text-[10px] text-amber-400 font-mono">
                          {guidesConfig.unit === unitKey ? '✓' : ''}
                        </span>
                      </button>
                    ))}
                  </SubMenu>
                )}

                {onToggleSnapOption && (
                  <SubMenu
                    label="Ajustar (Snap)"
                    icon={<Magnet className="w-3.5 h-3.5 text-amber-400" />}
                    widthClass="w-52"
                  >
                    <button
                      type="button"
                      onClick={() => onToggleSnapOption('snapToGuides')}
                      className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] text-left"
                    >
                      <span>Ajustar a Guías</span>
                      <span className="text-[10px] text-amber-400 font-mono">
                        {guidesConfig.snapToGuides ? '✓' : ''}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleSnapOption('snapToRulers')}
                      className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] text-left"
                    >
                      <span>Ajustar a Reglas</span>
                      <span className="text-[10px] text-amber-400 font-mono">
                        {guidesConfig.snapToRulers ? '✓' : ''}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleSnapOption('snapToGrid')}
                      className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] text-left"
                    >
                      <span>Ajustar a Cuadrícula</span>
                      <span className="text-[10px] text-amber-400 font-mono">
                        {guidesConfig.snapToGrid ? '✓' : ''}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleSnapOption('snapToPerspective')}
                      className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] text-left"
                    >
                      <span>Ajustar a Perspectiva</span>
                      <span className="text-[10px] text-amber-400 font-mono">
                        {guidesConfig.snapToPerspective ? '✓' : ''}
                      </span>
                    </button>
                  </SubMenu>
                )}

                {onOpenGuidesModal && (
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onOpenGuidesModal('list'))}
                    className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] text-left text-slate-300"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                    <span>Administrar Guías y Grupos...</span>
                  </button>
                )}

                {onClearAllGuides && guidesCount > 0 && (
                  <>
                    <div className="h-[1px] bg-[#22283a] my-1" />
                    <button
                      type="button"
                      onClick={() => handleItemClick(onClearAllGuides)}
                      className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] text-left text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar Todas las Guías</span>
                    </button>
                  </>
                )}
              </SubMenu>
            )}

            {guidesConfig && (
              <SubMenu
                label={`Guías de Perspectiva${guidesConfig.perspective?.enabled ? ' (ON)' : ''}`}
                icon={<Compass className="w-3.5 h-3.5 text-sky-400" />}
                widthClass="w-72"
              >
                {onChangeGuidesConfig && (
                  <button
                    type="button"
                    onClick={() =>
                      onChangeGuidesConfig({
                        ...guidesConfig,
                        showGuides: true,
                        perspective: {
                          ...guidesConfig.perspective,
                          enabled: !guidesConfig.perspective.enabled,
                        },
                      })
                    }
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] text-left font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <Compass className="w-3.5 h-3.5 text-sky-400" />
                      <span>Mostrar Guías de Perspectiva</span>
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono">
                      {guidesConfig.perspective.enabled ? '✓' : ''}
                    </span>
                  </button>
                )}

                <div className="h-[1px] bg-[#22283a] my-1" />

                {onSelectPerspectiveType &&
                  PERSPECTIVE_TYPE_META.map((pm) => {
                    const isActive =
                      guidesConfig.perspective.enabled && guidesConfig.perspective.type === pm.id;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => handleItemClick(() => onSelectPerspectiveType(pm.id))}
                        className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] text-left"
                      >
                        <span>{pm.label}</span>
                        <span className="text-[10px] text-sky-400 font-mono">
                          {isActive ? '✓' : ''}
                        </span>
                      </button>
                    );
                  })}

                <div className="h-[1px] bg-[#22283a] my-1" />

                {onChangeGuidesConfig && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        onChangeGuidesConfig({
                          ...guidesConfig,
                          showGuides: true,
                          perspective: {
                            ...guidesConfig.perspective,
                            enabled: true,
                            floorGrid: {
                              ...guidesConfig.perspective.floorGrid,
                              enabled: !guidesConfig.perspective.floorGrid.enabled,
                            },
                          },
                        })
                      }
                      className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] text-left"
                    >
                      <span className="flex items-center gap-2">
                        <Grid3X3 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Guía de Piso Automática</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        {guidesConfig.perspective.floorGrid.enabled ? '✓' : ''}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onChangeGuidesConfig({
                          ...guidesConfig,
                          showGuides: true,
                          cameraGuides: {
                            ...guidesConfig.cameraGuides,
                            enabled: !guidesConfig.cameraGuides.enabled,
                          },
                        })
                      }
                      className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] text-left"
                    >
                      <span className="flex items-center gap-2">
                        <Camera className="w-3.5 h-3.5 text-amber-400" />
                        <span>Guías de Cámara</span>
                      </span>
                      <span className="text-[10px] text-amber-400 font-mono">
                        {guidesConfig.cameraGuides.enabled ? '✓' : ''}
                      </span>
                    </button>
                  </>
                )}

                {onToggleSnapOption && (
                  <button
                    type="button"
                    onClick={() => onToggleSnapOption('snapToPerspective')}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] text-left"
                  >
                    <span className="flex items-center gap-2">
                      <Magnet className="w-3.5 h-3.5 text-purple-400" />
                      <span>Ajustar a Perspectiva</span>
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono">
                      {guidesConfig.snapToPerspective ? '✓' : ''}
                    </span>
                  </button>
                )}

                {onApplyScenarioGuidePreset && (
                  <SubMenu
                    label="Presets para Escenarios"
                    icon={<LayoutGrid className="w-3.5 h-3.5 text-emerald-400" />}
                    widthClass="w-60"
                  >
                    {SCENARIO_GUIDE_PRESETS.map((sp) => (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => handleItemClick(() => onApplyScenarioGuidePreset(sp.id))}
                        className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] text-left"
                      >
                        <span>{sp.label}</span>
                        <span className="text-[10px] text-emerald-400 font-mono">
                          {guidesConfig.perspective.activeScenarioPreset === sp.id ? '✓' : ''}
                        </span>
                      </button>
                    ))}
                  </SubMenu>
                )}

                {onOpenGuidesModal && (
                  <>
                    <div className="h-[1px] bg-[#22283a] my-1" />
                    <button
                      type="button"
                      onClick={() => handleItemClick(() => onOpenGuidesModal('perspective'))}
                      className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] text-left font-medium text-sky-300"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
                      <span>Puntos de Fuga y Perspectiva...</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleItemClick(() => onOpenGuidesModal('camera'))}
                      className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] text-left text-slate-300"
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-400" />
                      <span>Configurar Guías de Cámara...</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleItemClick(() => onOpenGuidesModal('presets'))}
                      className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] text-left text-slate-300"
                    >
                      <Save className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Guardar / Exportar Configuraciones...</span>
                    </button>
                  </>
                )}
              </SubMenu>
            )}

            <button
              type="button"
              onClick={() => handleItemClick(onToggleOnionSkin)}
              className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Papel Cebolla</span>
              </span>
              <span className="text-[10px] text-amber-400 font-mono">
                {onionSkinEnabled ? '✓' : ''}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleItemClick(onToggleHitboxes)}
              className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                <span>Cajas Hitbox / Hurtbox</span>
              </span>
              <span className="text-[10px] text-amber-400 font-mono">
                {showHitboxes ? '✓' : ''}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleItemClick(onTogglePivot)}
              className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-slate-400" />
                <span>Punto de Pivote</span>
              </span>
              <span className="text-[10px] text-amber-400 font-mono">{showPivot ? '✓' : ''}</span>
            </button>

            {onTriggerZoomAction && (
              <>
                <div className="h-[1px] bg-[#22283a] my-1" />
                <SubMenu
                  label="Zoom"
                  icon={<ZoomIn className="w-3.5 h-3.5 text-sky-400" />}
                  widthClass="w-56"
                >
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onTriggerZoomAction('in'))}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] text-left"
                  >
                    <span className="flex items-center gap-2">
                      <ZoomIn className="w-3.5 h-3.5 text-sky-400" />
                      <span>Acercar Zoom</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Ctrl++</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onTriggerZoomAction('out'))}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] text-left"
                  >
                    <span className="flex items-center gap-2">
                      <ZoomOut className="w-3.5 h-3.5 text-sky-400" />
                      <span>Alejar Zoom</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Ctrl+-</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onTriggerZoomAction('fit'))}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] text-left"
                  >
                    <span className="flex items-center gap-2">
                      <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Ajustar a Pantalla</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Ctrl+0</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onTriggerZoomAction('percent', 100))}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] text-left"
                  >
                    <span className="flex items-center gap-2">
                      <Scan className="w-3.5 h-3.5 text-amber-400" />
                      <span>Zoom 100% Real</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Ctrl+1</span>
                  </button>
                </SubMenu>
              </>
            )}

            {onToggleWheelNavMode && (
              <button
                type="button"
                onClick={() => handleItemClick(onToggleWheelNavMode)}
                title="Rueda: desplazamiento vertical · Shift+Rueda: horizontal · Ctrl+Rueda: zoom"
                className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
              >
                <span className="flex items-center gap-2">
                  <Hand className="w-3.5 h-3.5 text-slate-400" />
                  <span>Rueda: {wheelNavMode === 'pan' ? 'Desplazar' : 'Zoom'}</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {wheelNavMode === 'pan' ? 'Shift=H · Ctrl=Z' : 'Ctrl=Z'}
                </span>
              </button>
            )}

            {onChangePerformanceMode && (
              <>
                <div className="h-[1px] bg-[#22283a] my-1" />
                <SubMenu
                  label={`Rendimiento (${
                    performanceMode === 'quality'
                      ? 'Calidad máxima'
                      : performanceMode === 'performance'
                      ? 'Rendimiento'
                      : 'Equilibrado'
                  })`}
                  icon={<Gauge className="w-3.5 h-3.5 text-emerald-400" />}
                  widthClass="w-64"
                >
                  {(
                    [
                      {
                        id: 'quality' as PerformanceMode,
                        label: 'Calidad máxima',
                        desc: 'Todas las vistas previas y miniaturas en tiempo real',
                      },
                      {
                        id: 'balanced' as PerformanceMode,
                        label: 'Equilibrado',
                        desc: 'Caché inteligente de capas y miniaturas en segundo plano',
                      },
                      {
                        id: 'performance' as PerformanceMode,
                        label: 'Rendimiento',
                        desc: 'Prioriza FPS y fluidez en proyectos medianos o grandes',
                      },
                    ]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleItemClick(() => onChangePerformanceMode(opt.id))}
                      className={`px-3 py-1.5 flex items-center justify-between gap-2 hover:bg-[#20273a] transition-colors text-left ${
                        performanceMode === opt.id ? 'bg-[#1c2336] text-emerald-300 font-semibold' : 'text-slate-200'
                      }`}
                    >
                      <span className="flex flex-col min-w-0">
                        <span className="truncate">{opt.label}</span>
                        <span className="text-[10px] text-slate-500 truncate">{opt.desc}</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono shrink-0">
                        {performanceMode === opt.id ? '✓' : ''}
                      </span>
                    </button>
                  ))}
                </SubMenu>
              </>
            )}

            {(onOpenHomeScreen || onTestSplashAnimation || onToggleMaximizeWindow) && (
              <>
                <div className="h-[1px] bg-[#22283a] my-1" />
                {onToggleMaximizeWindow && (
                  <button
                    type="button"
                    onClick={() => handleItemClick(onToggleMaximizeWindow)}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left text-slate-200"
                  >
                    <span className="flex items-center gap-2">
                      <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        {isWindowMaximized
                          ? '✓ Restaurar Pantalla / Ventana'
                          : 'Maximizar / Pantalla Completa'}
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {shortcutLabels['view.toggle_fullscreen'] || 'F11'}
                    </span>
                  </button>
                )}
                {onOpenHomeScreen && (
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onOpenHomeScreen('configuracion'))}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left text-slate-200"
                  >
                    <span className="flex items-center gap-2">
                      <Sliders className="w-3.5 h-3.5 text-amber-400" />
                      <span>Preferencias de Inicio y Mascota...</span>
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono">Inicio</span>
                  </button>
                )}
                {onTestSplashAnimation && (
                  <button
                    type="button"
                    onClick={() => handleItemClick(onTestSplashAnimation)}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left text-slate-300"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                      <span>Ver Animación de Carga</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Splash</span>
                  </button>
                )}
              </>
            )}
      </TopMenuGroup>

      {/* ========================================================= */}
      {/* 6B. VENTANA — PANELES, MINI PANELES Y VENTANAS FLOTANTES  */}
      {/* ========================================================= */}
      <TopMenuGroup
        id="ventana"
        label="Ventana"
        activeMenu={activeMenu}
        onToggle={handleMenuClick}
        onHover={handleMenuHover}
        btnClass={menuBtnClass('ventana')}
        widthClass="w-72"
      >
        {workspaceLayout && visiblePanelsList.length > 0 && (
          <SubMenu
            label="Paneles"
            icon={<Columns2 className="w-3.5 h-3.5 text-emerald-400" />}
            badge={`${visiblePanelsList.filter((p) => p.visible).length}/${visiblePanelsList.length}`}
            accent
          >
            {/* Ventana -> Paneles -> Mini Paneles (strictly vertical deep nesting) */}
            <SubMenu
              label="Mini Paneles"
              icon={<Minimize2 className="w-3.5 h-3.5 text-sky-400" />}
              badge={`${visiblePanelsList.filter((p) => p.dock === 'left-mini' || p.dock === 'right-mini').length}`}
              depth={1}
            >
              {visiblePanelsList.map((p) => {
                const isMini = p.dock === 'left-mini' || p.dock === 'right-mini';
                return (
                  <button
                    key={`mini-${p.id}`}
                    type="button"
                    onClick={() => {
                      if (!p.visible) onTogglePanelVisible?.(p.id);
                      onTogglePanelMini?.(p.id);
                    }}
                    className="px-2.5 py-1.5 flex items-center justify-between gap-2 hover:bg-[#20273a] transition-colors text-left rounded"
                  >
                    <span className="flex items-center gap-2 min-w-0 truncate">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          isMini ? 'bg-sky-400' : 'bg-slate-600'
                        }`}
                      />
                      <span className={`truncate ${isMini ? 'text-sky-200 font-semibold' : 'text-slate-300'}`}>
                        {p.title}
                      </span>
                    </span>
                    <span className="text-[10px] font-mono shrink-0 text-sky-400">
                      {isMini ? 'Mini ✓' : 'A Mini'}
                    </span>
                  </button>
                );
              })}

              {onUpdateWorkspaceLayout && (
                <>
                  <div className="h-[1px] bg-[#22283a] my-1" />
                  <button
                    type="button"
                    onClick={() =>
                      handleItemClick(() =>
                        onUpdateWorkspaceLayout((prev) => ({
                          ...prev,
                          rightPanels: prev.rightPanels.map((p) =>
                            p.dock === 'left-mini'
                              ? { ...p, dock: 'left-main' as const }
                              : p.dock === 'right-mini'
                                ? { ...p, dock: 'right-main' as const }
                                : p
                          ),
                          templateId: 'custom',
                        }))
                      )
                    }
                    className="px-2.5 py-1.5 flex items-center gap-2 hover:bg-[#20273a] text-left text-amber-300 rounded"
                  >
                    <MaximizePanelIcon className="w-3 h-3" />
                    <span>Expandir todos a Panel Principal</span>
                  </button>
                </>
              )}
            </SubMenu>

            {panelGroups.map((group) => {
              const items = visiblePanelsList.filter((p) => group.ids.includes(p.id));
              if (items.length === 0) return null;
              return (
                <SubMenu key={`win-${group.label}`} label={group.label} depth={1}>
                  {items.map(renderPanelToggleRow)}
                </SubMenu>
              );
            })}
          </SubMenu>
        )}

        <SubMenu
          label="Ventanas Flotantes"
          icon={<LayoutTemplate className="w-3.5 h-3.5 text-amber-400" />}
          badge={floatingCount > 0 ? `${floatingCount}` : undefined}
        >
          {onResetFloatingWindows && (
            <button
              type="button"
              disabled={floatingCount === 0}
              onClick={() => handleItemClick(onResetFloatingWindows)}
              className="px-2.5 py-1.5 flex items-center gap-2 hover:bg-[#20273a] text-left text-sky-300 disabled:opacity-40 rounded"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Re-acoplar todas ({floatingCount})</span>
            </button>
          )}
          {onOpenLayoutModal && (
            <button
              type="button"
              onClick={() => handleItemClick(() => onOpenLayoutModal('layout'))}
              className="px-2.5 py-1.5 flex items-center gap-2 hover:bg-[#20273a] text-left rounded"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
              <span>Administrar Espacios de Trabajo...</span>
            </button>
          )}
        </SubMenu>

        <div className="h-[1px] bg-[#22283a] my-1" />

        {onOpenFxStudio && (
          <button
            type="button"
            onClick={() => handleItemClick(() => onOpenFxStudio('lab'))}
            className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] text-left text-cyan-200 font-semibold"
          >
            <span className="flex items-center gap-2">
              <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
              <span>Abrir FX Lab (Suite VFX)...</span>
            </span>
            <span className="text-[10px] font-mono text-cyan-400">FX</span>
          </button>
        )}

        {onFocusPanel && (
          <>
            <button
              type="button"
              onClick={() => handleItemClick(() => onFocusPanel('references'))}
              className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] text-left"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Panel de Referencias</span>
            </button>
            <button
              type="button"
              onClick={() => handleItemClick(() => onFocusPanel('timeline'))}
              className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] text-left"
            >
              <Film className="w-3.5 h-3.5 text-sky-400" />
              <span>Línea de Tiempo</span>
            </button>
            <button
              type="button"
              onClick={() => handleItemClick(() => onFocusPanel('layers'))}
              className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] text-left"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Panel de Capas</span>
            </button>
          </>
        )}
      </TopMenuGroup>

      {/* ========================================================= */}
      {/* 7. INTERFAZ                                               */}
      {/* ========================================================= */}
      <TopMenuGroup
        id="interfaz"
        label="Interfaz"
        activeMenu={activeMenu}
        onToggle={handleMenuClick}
        onHover={handleMenuHover}
        btnClass={menuBtnClass('interfaz')}
        widthClass="w-72"
      >
            {workspaceLayout && onUpdateWorkspaceLayout && (
              <button
                type="button"
                onClick={() =>
                  handleItemClick(() => {
                    if (onToggleUiEditMode) {
                      onToggleUiEditMode();
                    } else {
                      onUpdateWorkspaceLayout((prev) => {
                        const next = !prev.uiEditMode;
                        return {
                          ...prev,
                          uiEditMode: next,
                          totalFreedomMode: next ? true : prev.totalFreedomMode,
                        };
                      });
                    }
                  })
                }
                className={`px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left font-bold text-amber-300 ${
                  workspaceLayout.uiEditMode ? 'bg-amber-400/10' : ''
                }`}
              >
                <span className="flex items-center gap-2">
                  {workspaceLayout.uiEditMode ? (
                    <Unlock className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Move className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>
                    {workspaceLayout.uiEditMode
                      ? '✓ Desactivar Modo Libre UI'
                      : 'Activar Modo Libre UI'}
                  </span>
                </span>
                <span className="text-[9px] font-mono text-amber-400/90">
                  {shortcutLabels['cmd.toggle_ui_edit_mode'] || 'Ctrl+Alt+Shift+D'}
                </span>
              </button>
            )}

            {onOpenLayoutModal && (
              <>
                <button
                  type="button"
                  onClick={() => handleItemClick(() => onOpenLayoutModal('layout'))}
                  className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] transition-colors text-left"
                >
                  <LayoutTemplate className="w-3.5 h-3.5 text-amber-400" />
                  <span>Administrar Espacios de Trabajo...</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleItemClick(() => onOpenLayoutModal('minipreview'))}
                  className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] transition-colors text-left"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Preferencias de Mini Preview...</span>
                </button>
              </>
            )}

            {workspaceLayout && onApplyWorkspacePreset && (
              <SubMenu
                label="Presets de Interfaz"
                icon={<LayoutGrid className="w-3.5 h-3.5 text-sky-400" />}
                widthClass="w-60"
              >
                {WORKSPACE_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleItemClick(() => onApplyWorkspacePreset(tpl.id))}
                    className={`px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] text-left ${
                      workspaceLayout.templateId === tpl.id ? 'text-amber-300 font-bold' : ''
                    }`}
                    title={tpl.description}
                  >
                    <span className="truncate">{tpl.name}</span>
                    <span className="text-[10px] font-mono text-amber-400">
                      {workspaceLayout.templateId === tpl.id ? '✓' : ''}
                    </span>
                  </button>
                ))}
              </SubMenu>
            )}

            {workspaceLayout && onUpdateWorkspaceLayout && (
              <SubMenu
                label="Elementos de Pantalla"
                icon={<Columns2 className="w-3.5 h-3.5 text-amber-400" />}
                widthClass="w-72"
              >
                <button
                  type="button"
                  onClick={() =>
                    onUpdateWorkspaceLayout((prev) => ({
                      ...prev,
                      showTopBar: !prev.showTopBar,
                      rightPanels: prev.rightPanels.map((p) =>
                        p.id === 'topbar' ? { ...p, visible: !prev.showTopBar } : p
                      ),
                      templateId: 'custom',
                    }))
                  }
                  className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] text-left"
                >
                  <span>Mostrar Barra Superior</span>
                  <span className="text-[10px] text-amber-400 font-mono">
                    {workspaceLayout.showTopBar ? '✓' : ''}
                  </span>
                </button>

                {onToggleOptionsBar && (
                  <button
                    type="button"
                    onClick={() => handleItemClick(onToggleOptionsBar)}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] text-left"
                  >
                    <span>Barra de Opciones Contextual</span>
                    <span className="text-[10px] text-amber-400 font-mono">
                      {showOptionsBar ? '✓' : ''}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    onUpdateWorkspaceLayout((prev) => {
                      const nextShow = !prev.showMiniPlayer;
                      const startCollapsed = prev.miniPreviewPrefs?.startCollapsed ?? true;
                      return {
                        ...prev,
                        showMiniPlayer: nextShow,
                        miniPreviewCollapsed: nextShow ? startCollapsed : prev.miniPreviewCollapsed ?? true,
                        templateId: 'custom',
                      };
                    })
                  }
                  className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] text-left"
                >
                  <span>Mini-Reproductor sobre Lienzo</span>
                  <span className="text-[10px] text-amber-400 font-mono">
                    {workspaceLayout.showMiniPlayer ? '✓' : ''}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateWorkspaceLayout((prev) => ({
                      ...prev,
                      compactMode: !prev.compactMode,
                      templateId: 'custom',
                    }))
                  }
                  className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] text-left"
                >
                  <span>Modo Compacto (Más Lienzo)</span>
                  <span className="text-[10px] text-amber-400 font-mono">
                    {workspaceLayout.compactMode ? '✓' : ''}
                  </span>
                </button>

                <div className="h-[1px] bg-[#22283a] my-1" />

                <div className="px-3 py-1.5 flex items-center justify-between gap-2">
                  <span className="text-slate-300">Herramientas:</span>
                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    {(['left', 'right', 'hidden'] as const).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() =>
                          onUpdateWorkspaceLayout((prev) => ({
                            ...prev,
                            toolbarPosition: pos,
                            templateId: 'custom',
                          }))
                        }
                        className={`px-1.5 py-0.5 rounded border cursor-pointer ${
                          workspaceLayout.toolbarPosition === pos
                            ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-bold'
                            : 'bg-[#1a1f2e] border-[#29324a] text-slate-400 hover:text-white'
                        }`}
                      >
                        {pos === 'left' ? 'Izq' : pos === 'right' ? 'Der' : 'Oculta'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="px-3 py-1.5 flex items-center justify-between gap-2">
                  <span className="text-slate-300">Línea de Tiempo:</span>
                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    {(['bottom', 'top'] as const).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() =>
                          onUpdateWorkspaceLayout((prev) => ({
                            ...prev,
                            timelinePosition: pos,
                            rightPanels: prev.rightPanels.map((p) =>
                              p.id === 'timeline' ? { ...p, dock: pos, visible: true } : p
                            ),
                            templateId: 'custom',
                          }))
                        }
                        className={`px-1.5 py-0.5 rounded border cursor-pointer ${
                          workspaceLayout.timelinePosition === pos
                            ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-bold'
                            : 'bg-[#1a1f2e] border-[#29324a] text-slate-400 hover:text-white'
                        }`}
                      >
                        {pos === 'bottom' ? 'Abajo' : 'Arriba'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="px-3 py-1.5 flex items-center justify-between gap-2">
                  <span className="text-slate-300">Colapsado:</span>
                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    {(
                      [
                        ['both', 'Ambos'],
                        ['icon', 'Icono'],
                        ['name', 'Nombre'],
                      ] as [PanelCollapseDisplayMode, string][]
                    ).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() =>
                          onUpdateWorkspaceLayout((prev) => ({
                            ...prev,
                            collapseDisplayMode: mode,
                            templateId: 'custom',
                          }))
                        }
                        className={`px-1.5 py-0.5 rounded border cursor-pointer ${
                          (workspaceLayout.collapseDisplayMode || 'both') === mode
                            ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-bold'
                            : 'bg-[#1a1f2e] border-[#29324a] text-slate-400 hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="px-3 py-1.5 flex items-center justify-between gap-2">
                  <span className="text-slate-300">Auto-ocultar:</span>
                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    {(
                      [
                        ['pinned', 'Fijos'],
                        ['hover_reveal', 'Hover'],
                        ['auto_hide', 'Ocultar'],
                      ] as const
                    ).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() =>
                          onUpdateWorkspaceLayout((prev) => ({
                            ...prev,
                            autoCollapseSidebars: mode,
                            templateId: 'custom',
                          }))
                        }
                        className={`px-1.5 py-0.5 rounded border cursor-pointer ${
                          (workspaceLayout.autoCollapseSidebars || 'pinned') === mode
                            ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-bold'
                            : 'bg-[#1a1f2e] border-[#29324a] text-slate-400 hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </SubMenu>
            )}

            {workspaceLayout && visiblePanelsList.length > 0 && (
              <SubMenu
                label="Paneles y Minipaneles"
                icon={<Eye className="w-3.5 h-3.5 text-emerald-400" />}
                widthClass="w-56"
              >
                {panelGroups.map((group) => {
                  const items = visiblePanelsList.filter((p) => group.ids.includes(p.id));
                  if (items.length === 0) return null;
                  return (
                    <SubMenu key={group.label} label={group.label} widthClass="w-64">
                      {items.map(renderPanelToggleRow)}
                    </SubMenu>
                  );
                })}
              </SubMenu>
            )}

            {onResetFloatingWindows && floatingCount > 0 && (
              <button
                type="button"
                onClick={() => handleItemClick(onResetFloatingWindows)}
                className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] transition-colors text-left text-sky-300"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Re-acoplar Flotantes ({floatingCount})</span>
              </button>
            )}

            {onResetDefaultLayout && (
              <>
                <div className="h-[1px] bg-[#22283a] my-1" />
                <button
                  type="button"
                  onClick={() => handleItemClick(onResetDefaultLayout)}
                  className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#20273a] transition-colors text-left text-amber-300"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar Predeterminado</span>
                </button>
              </>
            )}
      </TopMenuGroup>

      {/* ========================================================= */}
      {/* 8. AYUDA                                                  */}
      {/* ========================================================= */}
      <TopMenuGroup
        id="ayuda"
        label="Ayuda"
        activeMenu={activeMenu}
        onToggle={handleMenuClick}
        onHover={handleMenuHover}
        btnClass={menuBtnClass('ayuda')}
        widthClass="w-72"
      >
            {onOpenCommandPalette && (
              <button
                type="button"
                onClick={() => handleItemClick(onOpenCommandPalette)}
                className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left font-bold text-amber-300"
              >
                <span className="flex items-center gap-2">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Buscador Universal</span>
                </span>
                <span className="text-[10px] text-amber-400 font-mono">
                  {shortcutLabels['cmd.command_palette'] || 'F1'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleItemClick(onOpenToolLocator || onOpenToolGuide)}
              className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left font-semibold text-amber-200"
            >
              <span className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>¿Dónde está esta herramienta?</span>
              </span>
              <span className="text-[10px] text-amber-400 font-mono">
                {shortcutLabels['cmd.where_is_tool'] || 'Ctrl+Alt+H'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleItemClick(onOpenToolGuide)}
              className="px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>Manual Interactivo...</span>
              </span>
            </button>

            {onOpenWhatIsThisMode && (
              <button
                type="button"
                onClick={() => handleItemClick(onOpenWhatIsThisMode)}
                className={`px-3 py-1.5 flex items-center justify-between hover:bg-[#20273a] transition-colors text-left ${
                  whatIsThisActive ? 'text-sky-200 bg-sky-500/15 font-semibold' : 'text-sky-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
                  <span>{whatIsThisActive ? '✓ Salir de Modo Inspeccionar' : 'Modo Inspeccionar UI'}</span>
                </span>
                <span className="text-[10px] text-sky-400 font-mono">
                  {shortcutLabels['cmd.what_is_this_mode'] || 'Shift+F1'}
                </span>
              </button>
            )}
      </TopMenuGroup>

      {/* Flexible empty bar drag region when enabled */}
      <div
        data-tauri-drag-region={dragEmptySpace ? 'true' : undefined}
        className={`flex-1 h-full min-w-[16px] ${dragEmptySpace ? 'studio-window-drag' : ''}`}
        onMouseDown={(e) => {
          if (!dragEmptySpace || e.button !== 0 || e.detail >= 2) return;
          void getDesktopBridge()?.startWindowDragging?.();
        }}
        onDoubleClick={dragEmptySpace ? onToggleMaximizeWindow : undefined}
      />

      {/* Right-side compact active Work Mode badge + UI Free Mode exit control */}
      <div className="flex items-center gap-1.5 studio-window-no-drag">
        <button
          type="button"
          onClick={() => onFocusPanel?.('workmode')}
          title={`Modo de trabajo activo: ${activeWorkModeDef.label}. Haz clic para abrir el panel de Modo de Trabajo & Estudio.`}
          className="px-2 py-0.5 rounded border text-[11px] font-semibold flex items-center gap-1.5 transition-colors bg-[#181c2b] hover:bg-[#22283d] border-[#2c344d] text-slate-200 cursor-pointer"
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: activeWorkModeDef.accentColor }}
          />
          <span className="text-slate-400 font-normal">Modo:</span>
          <span>{activeWorkModeDef.shortLabel}</span>
        </button>

        {workspaceLayout?.uiEditMode && (onToggleUiEditMode || onUpdateWorkspaceLayout) && (
          <button
            type="button"
            onClick={() => {
              if (onToggleUiEditMode) {
                onToggleUiEditMode();
              } else if (onUpdateWorkspaceLayout) {
                onUpdateWorkspaceLayout((prev) => ({
                  ...prev,
                  uiEditMode: false,
                }));
              }
            }}
            title="Salir del Modo Libre de Edición UI (Ctrl+Alt+Shift+D)"
            className="px-2.5 py-0.5 rounded border text-[11px] font-bold flex items-center gap-1.5 transition-colors bg-amber-400 text-slate-950 border-amber-300 shadow-sm cursor-pointer"
          >
            <Unlock className="w-3 h-3" />
            <span>Modo Libre ACTIVO · Salir</span>
          </button>
        )}
      </div>
    </div>
  );
};
