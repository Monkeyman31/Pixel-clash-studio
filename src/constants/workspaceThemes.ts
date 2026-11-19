import { ToolbarColumnsMode, ToolType } from '../types';

export type RightPanelId =
  | 'layers'
  | 'properties'
  | 'history'
  | 'brushes'
  | 'colorwheel'
  | 'symmetry'
  | 'ai'
  | 'references'
  | 'filters'
  | 'library'
  | 'combat'
  | 'stage'
  | 'timeline'
  | 'toolbar'
  | 'topbar'
  | 'dummie'
  | 'palette'
  | 'brush_manager'
  | 'textures'
  | 'materials'
  | 'ai_config'
  | 'preview'
  | 'navigator'
  | 'console'
  | 'animation'
  | 'keyframes'
  | 'vector_editor'
  | 'masks'
  | 'project_explorer'
  | 'workmode';

export type PanelDockZone = 'top' | 'bottom' | 'left-main' | 'left-mini' | 'right-mini' | 'right-main';
export type DockOrientation = 'vertical' | 'horizontal' | 'mixed';
export type PanelCollapseDisplayMode = 'both' | 'icon' | 'name';

export interface PanelRegistryMeta {
  id: RightPanelId;
  title: string;
  shortLabel: string;
  category: 'Core' | 'Dibujo y Color' | 'Animación' | 'IA y Referencias' | 'Producción' | 'Sistema';
  defaultVisible: boolean;
  defaultExpanded: boolean;
  defaultDock: PanelDockZone;
  requiresTotalFreedom?: boolean;
  minWidth?: number;
  minHeight?: number;
  description: string;
}

/**
 * MODO DESARROLLADOR: Registro central extensible de paneles.
 * Cualquier panel agregado aquí hereda automáticamente:
 * - Drag & Drop en modo edición
 * - Acoplamiento en las 6 zonas (Arriba, Abajo, Izq, Der, Mini Izq/Der)
 * - Redimensionamiento 2D (ancho, alto y esquina simultánea)
 * - Colapsado global (icono / nombre / ambos)
 * - Agrupación por pestañas y orientación (vertical / horizontal / mixto)
 * - Ventanas flotantes móviles y persistencia automática (.pcslayout)
 */
export const PANEL_REGISTRY: PanelRegistryMeta[] = [
  { id: 'layers', title: 'Capas & Carpetas (Photoshop)', shortLabel: 'Capas', category: 'Core', defaultVisible: true, defaultExpanded: true, defaultDock: 'right-main', description: 'Jerarquía, carpetas anidadas, modos de fusión y capas globales.' },
  { id: 'properties', title: 'Propiedades Contextuales', shortLabel: 'Props', category: 'Core', defaultVisible: true, defaultExpanded: true, defaultDock: 'right-main', description: 'Transformación, selección vectorial, cuentagotas y apariencia.' },
  { id: 'history', title: 'Historial de Acciones', shortLabel: 'Hist', category: 'Core', defaultVisible: true, defaultExpanded: false, defaultDock: 'right-main', description: 'Línea temporal de deshacer / rehacer con salto directo.' },
  { id: 'brushes', title: 'Pinceles & Presión de Pluma', shortLabel: 'Pincel', category: 'Dibujo y Color', defaultVisible: true, defaultExpanded: true, defaultDock: 'right-main', description: 'Tamaño, forma, curva de presión y estabilizador pixel-perfect.' },
  { id: 'colorwheel', title: 'Selector de Color & Rueda', shortLabel: 'Color', category: 'Dibujo y Color', defaultVisible: true, defaultExpanded: true, defaultDock: 'right-main', description: 'Rueda cromática estilo Photoshop y alfa.' },
  { id: 'symmetry', title: 'Simetría Avanzada', shortLabel: 'Simetr', category: 'Dibujo y Color', defaultVisible: true, defaultExpanded: false, defaultDock: 'right-mini', description: 'Simetría vertical, horizontal, 4/8 ejes, radial, espejo doble, punto central y línea libre.' },
  { id: 'palette', title: 'Paleta de Colores', shortLabel: 'Paleta', category: 'Dibujo y Color', defaultVisible: false, defaultExpanded: true, defaultDock: 'left-main', description: 'Muestras activas, ramps arcade y mezcla rápida.' },
  { id: 'brush_manager', title: 'Brush Manager', shortLabel: 'Brushes', category: 'Dibujo y Color', defaultVisible: false, defaultExpanded: true, defaultDock: 'left-mini', description: 'Biblioteca de pinceles personalizados y presets rápidos.' },
  { id: 'textures', title: 'Texturas Pixel', shortLabel: 'Texturas', category: 'Dibujo y Color', defaultVisible: false, defaultExpanded: true, defaultDock: 'right-mini', description: 'Patrones procedurales, tramas dither y rellenos de superficie.' },
  { id: 'materials', title: 'Materiales & Sombras', shortLabel: 'Material', category: 'Dibujo y Color', defaultVisible: false, defaultExpanded: true, defaultDock: 'right-mini', description: 'Ramps de piel, tela, metal, energía y oro listos para sombreado.' },
  { id: 'ai', title: 'IA (VFX, Escenarios, HUD & Img➔Px)', shortLabel: 'IA', category: 'IA y Referencias', defaultVisible: true, defaultExpanded: false, defaultDock: 'right-mini', description: 'Suite generativa contextual con inserción segura por frames.' },
  { id: 'ai_config', title: 'Configuración IA', shortLabel: 'Cfg IA', category: 'IA y Referencias', defaultVisible: false, defaultExpanded: true, defaultDock: 'right-mini', description: 'Fidelidad de estilo, perfiles externos y reglas de inserción.' },
  { id: 'references', title: 'Referencias Visuales', shortLabel: 'Ref', category: 'IA y Referencias', defaultVisible: true, defaultExpanded: true, defaultDock: 'right-mini', description: 'Tablero infinito de imágenes guía con grupos, opacidad y mezcla.' },
  { id: 'dummie', title: 'Dummie 2D & Poses', shortLabel: 'Dummie', category: 'IA y Referencias', defaultVisible: false, defaultExpanded: true, defaultDock: 'left-main', description: 'Esqueleto anatómico 2D independiente con 9 rigs y retargeting.' },
  { id: 'filters', title: 'Filtros & Capas de Ajuste', shortLabel: 'Filtros', category: 'Dibujo y Color', defaultVisible: true, defaultExpanded: false, defaultDock: 'right-mini', description: 'Tono, saturación, brillo, GameBoy y outline automático.' },
  { id: 'library', title: 'Biblioteca / Activos (Assets)', shortLabel: 'Assets', category: 'Producción', defaultVisible: true, defaultExpanded: false, defaultDock: 'right-mini', description: 'Stamps, props reutilizables y uploads del usuario.' },
  { id: 'combat', title: 'Fighting Game Studio', shortLabel: 'Combat', category: 'Producción', defaultVisible: true, defaultExpanded: false, defaultDock: 'right-mini', description: 'Hitboxes, hurtboxes, ventaja de frames y test de combate.' },
  { id: 'stage', title: 'Escenario & Sparring', shortLabel: 'Stage', category: 'Producción', defaultVisible: true, defaultExpanded: false, defaultDock: 'right-mini', description: 'Fondo de entrenamiento, suelo y dummy rival.' },
  { id: 'workmode', title: 'Modo de Trabajo & Estudio', shortLabel: 'Modo', category: 'Producción', defaultVisible: true, defaultExpanded: false, defaultDock: 'right-mini', description: 'Modos Fighter, Stage (Parallax), HUD/UI, FX Lab, Tileset 3×3, Portrait y Cutscene.' },
  { id: 'timeline', title: 'Línea de Tiempo', shortLabel: 'Timeline', category: 'Animación', defaultVisible: true, defaultExpanded: true, defaultDock: 'bottom', minWidth: 260, minHeight: 110, description: 'Línea de tiempo acoplable arriba, abajo, costados o flotante con redimensionamiento total.' },
  { id: 'preview', title: 'Vista Previa Animada', shortLabel: 'Preview', category: 'Animación', defaultVisible: false, defaultExpanded: true, defaultDock: 'left-main', description: 'Visor independiente de bucle animado y zoom.' },
  { id: 'navigator', title: 'Navegador de Lienzo', shortLabel: 'Nav', category: 'Core', defaultVisible: false, defaultExpanded: true, defaultDock: 'left-main', description: 'Minimapa general del sprite con control de zoom rápido.' },
  { id: 'animation', title: 'Animación & Papel Cebolla', shortLabel: 'Anim', category: 'Animación', defaultVisible: false, defaultExpanded: true, defaultDock: 'left-mini', description: 'Control de FPS, modo bucle, onion skin e interpolación.' },
  { id: 'keyframes', title: 'Keyframes & Curvas', shortLabel: 'Keyfrm', category: 'Animación', defaultVisible: false, defaultExpanded: true, defaultDock: 'right-mini', description: 'Inspector de desplazamiento, escala, opacidad y easing por capa.' },
  { id: 'vector_editor', title: 'Editor Vectorial', shortLabel: 'Vector', category: 'Dibujo y Color', defaultVisible: false, defaultExpanded: true, defaultDock: 'left-main', description: 'Trazos editables, Smart Pixel Curve y operaciones de nodos.' },
  { id: 'masks', title: 'Máscaras de Capa', shortLabel: 'Máscar', category: 'Core', defaultVisible: false, defaultExpanded: true, defaultDock: 'right-mini', description: 'Máscaras de recorte, vectoriales, inversión y aplicación.' },
  { id: 'project_explorer', title: 'Explorador de Proyectos', shortLabel: 'Proyec', category: 'Sistema', defaultVisible: false, defaultExpanded: true, defaultDock: 'left-mini', description: 'Árbol del proyecto .PCS, frames, grupos y exportación rápida.' },
  { id: 'console', title: 'Consola de Estudio', shortLabel: 'Consol', category: 'Sistema', defaultVisible: false, defaultExpanded: true, defaultDock: 'bottom', description: 'Registro de comandos y consola rápida de acciones.' },
  { id: 'toolbar', title: 'Herramientas', shortLabel: 'Tools', category: 'Core', defaultVisible: true, defaultExpanded: true, defaultDock: 'left-main', description: 'Barra de herramientas redimensionable dinámicamente (columnas automáticas según ancho, acoplable o flotante).' },
  { id: 'topbar', title: 'Barra Rápida Superior', shortLabel: 'TopBar', category: 'Sistema', defaultVisible: true, defaultExpanded: true, defaultDock: 'top', requiresTotalFreedom: true, description: 'Barra superior de acciones rápidas (desbloqueable en Libertad Total).' },
];

export interface RightPanelConfig {
  id: RightPanelId;
  title: string;
  visible: boolean;
  expanded: boolean;
  dock?: PanelDockZone;
  maximized?: boolean;
  heightPx?: number;
  widthPx?: number;
  compact?: boolean;
}

export interface TabbedPanelGroup {
  id: string;
  zone: PanelDockZone;
  panelIds: RightPanelId[];
  activePanelId: RightPanelId;
}

export type DockTabGroupConfig = TabbedPanelGroup;

export interface FloatingPanelWindow {
  panelId: RightPanelId;
  isFloating?: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  pinned?: boolean;
  minimized?: boolean;
  maximized?: boolean;
  screenWidth?: number;
  screenHeight?: number;
}

export type FloatingPanelState = FloatingPanelWindow;

export type AutoCollapseMode = 'pinned' | 'visible' | 'auto_hide' | 'hover_reveal';
export type SidebarAutoCollapseMode = AutoCollapseMode;

export type TimelineSectionId = 'tags' | 'ruler' | 'frames' | 'transport';

export interface WorkspaceLayoutConfig {
  templateId: string;
  toolbarPosition: 'left' | 'right' | 'hidden';
  sidebarPosition: 'right' | 'left' | 'hidden';
  sidebarWidth: 'compact' | 'normal' | 'wide';
  leftMainWidth?: number;
  rightMainWidth?: number;
  leftMiniWidth?: number;
  rightMiniWidth?: number;
  leftMiniMode?: 'compact' | 'expanded';
  rightMiniMode?: 'compact' | 'expanded';
  miniFlyoutWidth?: number;
  timelineHeight?: number;
  topDockHeight?: number;
  bottomDockHeight?: number;
  compactMode?: boolean;
  autoCollapseSidebars?: AutoCollapseMode;
  uiEditMode?: boolean;
  totalFreedomMode?: boolean;
  collapseDisplayMode?: PanelCollapseDisplayMode;
  dockOrientations?: Partial<Record<PanelDockZone, DockOrientation>>;
  panelHeights?: Record<string, number>;
  panelWidths?: Record<string, number>;
  compactPanels?: Record<string, boolean>;
  toolOrder?: ToolType[];
  toolbarColumns?: ToolbarColumnsMode;
  toolbarWidth?: number;
  toolbarHeight?: number;
  timelinePosition: 'bottom' | 'top';
  timelineSectionOrder: TimelineSectionId[];
  showTopBar: boolean;
  showMiniPlayer: boolean;
  rightPanels: RightPanelConfig[];
  tabGroups?: TabbedPanelGroup[];
  floatingPanels?: Record<string, FloatingPanelState>;
  collapsedSections?: Record<string, boolean>;
  layersSectionHeights?: {
    listHeight: number;
    filtersHeight: number;
    thumbSize: 'sm' | 'md' | 'lg';
  };
}

export interface SavedCustomLayout {
  id: string;
  name: string;
  createdAt: string;
  layout: WorkspaceLayoutConfig;
}

export interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string;
  badge: string;
  defaultFileName?: string;
  layout: WorkspaceLayoutConfig;
}

export type StudioThemeId =
  | 'cps2_dark'
  | 'neogeo_crimson'
  | 'aseprite_slate'
  | 'cyber_midnight'
  | 'gameboy_phosphor'
  | 'studio_light';

export type StudioUiFontId = 'jakarta' | 'chakra' | 'manrope' | 'dmsans' | 'silkscreen';
export type StudioMonoFontId = 'jetbrains' | 'ibmplex' | 'silkscreen';

export type UiStylePresetId =
  | 'modern'
  | 'minimalist'
  | 'photoshop'
  | 'aseprite'
  | 'retro'
  | 'flat'
  | 'professional'
  | 'pixel';

export type CornerStyleId = 'straight' | 'slightly_rounded' | 'rounded' | 'very_rounded' | 'sharp' | 'soft';
export type ButtonStyleId = 'rectangular' | 'rounded_rect' | 'square' | 'circular' | 'pill';
export type UiDensityId = 'compact' | 'normal' | 'spacious';
export type IconStyleId = 'modern' | 'minimal' | 'pixel' | 'classic';
export type IconSizeId = 'sm' | 'md' | 'lg' | 'xl';

export interface CustomUiColors {
  mainBg?: string;
  panelsBg?: string;
  barsBg?: string;
  buttonsBg?: string;
  hoverBg?: string;
  selectionBg?: string;
  textColor?: string;
  iconColor?: string;
}

export interface GradientTargetsConfig {
  useGradients: boolean;
  windows: boolean;
  buttons: boolean;
  panels: boolean;
  headers: boolean;
}

export interface StudioStyleConfig {
  themeId: StudioThemeId;
  uiFontId: StudioUiFontId;
  monoFontId: StudioMonoFontId;
  customAccent?: string;
  cornerStyle: CornerStyleId;
  uiPreset?: UiStylePresetId;
  buttonStyle?: ButtonStyleId;
  customColors?: CustomUiColors;
  gradients?: GradientTargetsConfig;
  density?: UiDensityId;
  iconStyle?: IconStyleId;
  iconSize?: IconSizeId;
}

export interface SavedCustomTheme {
  id: string;
  name: string;
  createdAt: string;
  style: StudioStyleConfig;
}

export interface StudioThemePreset {
  id: StudioThemeId;
  name: string;
  subtitle: string;
  isLight: boolean;
  vars: {
    bgApp: string;
    bgCanvas: string;
    bgBar: string;
    bgHeader: string;
    bgPanel: string;
    bgCard: string;
    bgElevated: string;
    border: string;
    borderStrong: string;
    text: string;
    textMuted: string;
    accent: string;
    accentText: string;
  };
}

export const DEFAULT_RIGHT_PANELS: RightPanelConfig[] = PANEL_REGISTRY.map((meta) => ({
  id: meta.id,
  title: meta.title,
  visible: meta.defaultVisible,
  expanded: meta.defaultExpanded,
  dock: meta.defaultDock,
}));

export const DEFAULT_TAB_GROUPS: TabbedPanelGroup[] = [
  {
    id: 'tabgrp-core-right',
    zone: 'right-main',
    panelIds: ['layers', 'properties', 'history'],
    activePanelId: 'layers',
  },
];

export const DEFAULT_TOOL_ORDER: ToolType[] = [
  'move',
  'select',
  'lasso',
  'magic_wand',
  'pencil',
  'eraser',
  'bucket',
  'line',
  'rectangle',
  'text',
  'eyedropper',
  'hitbox',
  'hand',
  'zoom',
];

export const DEFAULT_WORKSPACE_LAYOUT: WorkspaceLayoutConfig = {
  templateId: 'pixel_art',
  toolbarPosition: 'left',
  sidebarPosition: 'right',
  sidebarWidth: 'normal',
  leftMainWidth: 296,
  rightMainWidth: 332,
  leftMiniWidth: 56,
  rightMiniWidth: 56,
  leftMiniMode: 'compact',
  rightMiniMode: 'compact',
  miniFlyoutWidth: 320,
  timelineHeight: 236,
  topDockHeight: 196,
  bottomDockHeight: 236,
  compactMode: false,
  autoCollapseSidebars: 'pinned',
  uiEditMode: false,
  totalFreedomMode: false,
  collapseDisplayMode: 'both',
  dockOrientations: {
    top: 'horizontal',
    bottom: 'vertical',
    'left-main': 'vertical',
    'right-main': 'vertical',
    'left-mini': 'vertical',
    'right-mini': 'vertical',
  },
  panelHeights: {},
  panelWidths: {},
  compactPanels: {},
  toolOrder: DEFAULT_TOOL_ORDER,
  toolbarColumns: 'auto',
  timelinePosition: 'bottom',
  timelineSectionOrder: ['tags', 'ruler', 'frames', 'transport'],
  showTopBar: true,
  showMiniPlayer: true,
  rightPanels: DEFAULT_RIGHT_PANELS,
  tabGroups: DEFAULT_TAB_GROUPS,
  floatingPanels: {},
  collapsedSections: {},
  layersSectionHeights: {
    listHeight: 240,
    filtersHeight: 68,
    thumbSize: 'md',
  },
};

function mapPanelsWithOverrides(
  overrides: Partial<Record<RightPanelId, Partial<RightPanelConfig>>>
): RightPanelConfig[] {
  return DEFAULT_RIGHT_PANELS.map((base) => ({
    ...base,
    ...(overrides[base.id] || {}),
  }));
}

export const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
  {
    id: 'pixel_art',
    name: 'Pixel Art',
    description: 'Pinceles y paleta listos, Capas | Propiedades | Historial agrupados en pestañas y Timeline inferior.',
    badge: 'Pixel Art',
    defaultFileName: 'workspace_pixelart.pcslayout',
    layout: {
      ...DEFAULT_WORKSPACE_LAYOUT,
      templateId: 'pixel_art',
      rightPanels: mapPanelsWithOverrides({
        layers: { dock: 'right-main', expanded: true, visible: true },
        properties: { dock: 'right-main', expanded: true, visible: true },
        history: { dock: 'right-main', expanded: true, visible: true },
        colorwheel: { dock: 'right-main', expanded: true, visible: true },
        brushes: { dock: 'left-mini', expanded: true, visible: true },
        references: { dock: 'right-mini', expanded: true, visible: true },
        filters: { dock: 'right-mini', expanded: true, visible: true },
        library: { dock: 'right-mini', expanded: true, visible: true },
        ai: { dock: 'right-mini', expanded: false, visible: true },
        combat: { dock: 'right-mini', expanded: false, visible: true },
        stage: { dock: 'right-mini', expanded: false, visible: false },
        timeline: { dock: 'bottom', expanded: true, visible: true },
      }),
    },
  },
  {
    id: 'animacion',
    name: 'Animación',
    description: 'Timeline ampliada, Vista Previa Animada, Keyframes, Animación y Capas con Dummie.',
    badge: 'Animación',
    defaultFileName: 'workspace_animation.pcslayout',
    layout: {
      ...DEFAULT_WORKSPACE_LAYOUT,
      templateId: 'animacion',
      timelineHeight: 256,
      bottomDockHeight: 256,
      timelineSectionOrder: ['transport', 'tags', 'ruler', 'frames'],
      rightPanels: mapPanelsWithOverrides({
        preview: { dock: 'left-main', expanded: true, visible: true },
        animation: { dock: 'left-main', expanded: true, visible: true },
        keyframes: { dock: 'left-main', expanded: true, visible: true },
        layers: { dock: 'right-main', expanded: true, visible: true },
        properties: { dock: 'right-main', expanded: true, visible: true },
        history: { dock: 'right-main', expanded: true, visible: true },
        references: { dock: 'left-mini', expanded: true, visible: true },
        brushes: { dock: 'left-mini', expanded: true, visible: true },
        colorwheel: { dock: 'right-mini', expanded: true, visible: true },
        timeline: { dock: 'bottom', expanded: true, visible: true },
      }),
    },
  },
  {
    id: 'fighting_game',
    name: 'Fighting Game',
    description: 'Estudio arcade completo: Hitboxes, Escenario Sparring, Timeline Frame Data y Capas agrupadas.',
    badge: 'Fighting',
    defaultFileName: 'workspace_fightinggame.pcslayout',
    layout: {
      ...DEFAULT_WORKSPACE_LAYOUT,
      templateId: 'fighting_game',
      timelineHeight: 244,
      bottomDockHeight: 244,
      rightMainWidth: 348,
      rightPanels: mapPanelsWithOverrides({
        combat: { dock: 'left-main', expanded: true, visible: true },
        stage: { dock: 'left-main', expanded: true, visible: true },
        preview: { dock: 'left-main', expanded: true, visible: true },
        references: { dock: 'left-mini', expanded: true, visible: true },
        brushes: { dock: 'left-mini', expanded: true, visible: true },
        layers: { dock: 'right-main', expanded: true, visible: true },
        properties: { dock: 'right-main', expanded: true, visible: true },
        history: { dock: 'right-main', expanded: true, visible: true },
        ai: { dock: 'right-main', expanded: true, visible: true },
        colorwheel: { dock: 'right-mini', expanded: true, visible: true },
        filters: { dock: 'right-mini', expanded: true, visible: true },
        library: { dock: 'right-mini', expanded: true, visible: true },
        timeline: { dock: 'bottom', expanded: true, visible: true },
      }),
    },
  },
  {
    id: 'diseno_personajes',
    name: 'Diseño de Personajes',
    description: 'Dummie 2D independiente, Referencias, Paleta de colores, Materiales y Capas Photoshop.',
    badge: 'Personajes',
    defaultFileName: 'workspace_character_design.pcslayout',
    layout: {
      ...DEFAULT_WORKSPACE_LAYOUT,
      templateId: 'diseno_personajes',
      leftMainWidth: 312,
      rightPanels: mapPanelsWithOverrides({
        dummie: { dock: 'left-main', expanded: true, visible: true },
        references: { dock: 'left-main', expanded: true, visible: true },
        palette: { dock: 'left-main', expanded: true, visible: true },
        materials: { dock: 'left-mini', expanded: true, visible: true },
        brushes: { dock: 'left-mini', expanded: true, visible: true },
        layers: { dock: 'right-main', expanded: true, visible: true },
        properties: { dock: 'right-main', expanded: true, visible: true },
        history: { dock: 'right-main', expanded: true, visible: true },
        colorwheel: { dock: 'right-main', expanded: true, visible: true },
        timeline: { dock: 'bottom', expanded: true, visible: true },
      }),
    },
  },
  {
    id: 'vectorial',
    name: 'Vectorial',
    description: 'Editor Vectorial + Propiedades + Trazos + Máscaras + Navegador para dibujo limpio.',
    badge: 'Vectorial',
    defaultFileName: 'workspace_vectorial.pcslayout',
    layout: {
      ...DEFAULT_WORKSPACE_LAYOUT,
      templateId: 'vectorial',
      timelineHeight: 148,
      bottomDockHeight: 148,
      rightPanels: mapPanelsWithOverrides({
        vector_editor: { dock: 'left-main', expanded: true, visible: true },
        navigator: { dock: 'left-main', expanded: true, visible: true },
        palette: { dock: 'left-mini', expanded: true, visible: true },
        properties: { dock: 'right-main', expanded: true, visible: true },
        layers: { dock: 'right-main', expanded: true, visible: true },
        history: { dock: 'right-main', expanded: true, visible: true },
        masks: { dock: 'right-main', expanded: true, visible: true },
        colorwheel: { dock: 'right-mini', expanded: true, visible: true },
        timeline: { dock: 'bottom', expanded: true, visible: true },
      }),
      tabGroups: [
        {
          id: 'tabgrp-core-right',
          zone: 'right-main',
          panelIds: ['properties', 'layers', 'history'],
          activePanelId: 'properties',
        },
      ],
    },
  },
  {
    id: 'concept_art',
    name: 'Concept Art',
    description: 'Referencias visuales, Rueda de color, Brush Manager, Texturas y Materiales.',
    badge: 'Concept',
    defaultFileName: 'workspace_conceptart.pcslayout',
    layout: {
      ...DEFAULT_WORKSPACE_LAYOUT,
      templateId: 'concept_art',
      timelineHeight: 152,
      bottomDockHeight: 152,
      rightPanels: mapPanelsWithOverrides({
        references: { dock: 'left-main', expanded: true, visible: true },
        brushes: { dock: 'left-main', expanded: true, visible: true },
        brush_manager: { dock: 'left-mini', expanded: true, visible: true },
        textures: { dock: 'left-mini', expanded: true, visible: true },
        materials: { dock: 'left-mini', expanded: true, visible: true },
        colorwheel: { dock: 'right-main', expanded: true, visible: true },
        layers: { dock: 'right-main', expanded: true, visible: true },
        properties: { dock: 'right-main', expanded: true, visible: true },
        history: { dock: 'right-main', expanded: true, visible: true },
        filters: { dock: 'right-mini', expanded: true, visible: true },
        ai: { dock: 'right-mini', expanded: true, visible: true },
        timeline: { dock: 'bottom', expanded: true, visible: true },
      }),
    },
  },
  {
    id: 'ia_generativa',
    name: 'IA Generativa',
    description: 'Panel IA Contextual + Configuración IA + Referencias + Dummie + Capas no destructivas.',
    badge: 'IA Studio',
    defaultFileName: 'workspace_ai.pcslayout',
    layout: {
      ...DEFAULT_WORKSPACE_LAYOUT,
      templateId: 'ia_generativa',
      leftMainWidth: 320,
      rightMainWidth: 344,
      rightPanels: mapPanelsWithOverrides({
        ai: { dock: 'left-main', expanded: true, visible: true },
        ai_config: { dock: 'left-main', expanded: true, visible: true },
        references: { dock: 'left-main', expanded: true, visible: true },
        dummie: { dock: 'left-mini', expanded: true, visible: true },
        layers: { dock: 'right-main', expanded: true, visible: true },
        properties: { dock: 'right-main', expanded: true, visible: true },
        history: { dock: 'right-main', expanded: true, visible: true },
        filters: { dock: 'right-mini', expanded: true, visible: true },
        colorwheel: { dock: 'right-mini', expanded: true, visible: true },
        brushes: { dock: 'left-mini', expanded: true, visible: true },
        library: { dock: 'right-mini', expanded: true, visible: true },
        timeline: { dock: 'bottom', expanded: true, visible: true },
      }),
    },
  },
  {
    id: 'photoshop_style',
    name: 'Photoshop Style',
    description: 'Navegador, Color/Muestras, Capas, Máscaras, Propiedades e Historial acoplados al estilo Adobe.',
    badge: 'Photoshop',
    defaultFileName: 'workspace_photoshop.pcslayout',
    layout: {
      ...DEFAULT_WORKSPACE_LAYOUT,
      templateId: 'photoshop_style',
      rightMainWidth: 340,
      rightPanels: mapPanelsWithOverrides({
        navigator: { dock: 'right-main', expanded: true, visible: true },
        colorwheel: { dock: 'right-main', expanded: true, visible: true },
        layers: { dock: 'right-main', expanded: true, visible: true },
        properties: { dock: 'right-main', expanded: true, visible: true },
        history: { dock: 'right-main', expanded: true, visible: true },
        masks: { dock: 'right-main', expanded: true, visible: true },
        brushes: { dock: 'right-mini', expanded: true, visible: true },
        filters: { dock: 'right-mini', expanded: true, visible: true },
        references: { dock: 'right-mini', expanded: true, visible: true },
        timeline: { dock: 'bottom', expanded: true, visible: true },
      }),
      tabGroups: [
        {
          id: 'tabgrp-ps-top',
          zone: 'right-main',
          panelIds: ['colorwheel', 'brushes'],
          activePanelId: 'colorwheel',
        },
        {
          id: 'tabgrp-core-right',
          zone: 'right-main',
          panelIds: ['layers', 'masks', 'properties', 'history'],
          activePanelId: 'layers',
        },
      ],
    },
  },
  {
    id: 'aseprite_style',
    name: 'Aseprite Style',
    description: 'Paleta de colores a la izquierda, Vista Previa animada y Timeline arriba para pixel art clásico.',
    badge: 'Aseprite',
    defaultFileName: 'workspace_aseprite.pcslayout',
    layout: {
      ...DEFAULT_WORKSPACE_LAYOUT,
      templateId: 'aseprite_style',
      timelinePosition: 'top',
      topDockHeight: 190,
      leftMainWidth: 248,
      rightMainWidth: 280,
      compactMode: true,
      rightPanels: mapPanelsWithOverrides({
        palette: { dock: 'left-main', expanded: true, visible: true },
        preview: { dock: 'left-main', expanded: true, visible: true },
        brushes: { dock: 'left-mini', expanded: true, visible: true },
        layers: { dock: 'right-main', expanded: true, visible: true },
        properties: { dock: 'right-main', expanded: true, visible: true },
        history: { dock: 'right-main', expanded: true, visible: true },
        timeline: { dock: 'top', expanded: true, visible: true },
      }),
    },
  },
  {
    id: 'blender_style',
    name: 'Blender Style',
    description: 'Explorador de Proyectos, Propiedades, Dummie 2D, Consola inferior y Modo Libertad Total activado.',
    badge: 'Blender',
    defaultFileName: 'workspace_blender.pcslayout',
    layout: {
      ...DEFAULT_WORKSPACE_LAYOUT,
      templateId: 'blender_style',
      totalFreedomMode: true,
      leftMainWidth: 268,
      rightMainWidth: 336,
      bottomDockHeight: 224,
      dockOrientations: {
        top: 'horizontal',
        bottom: 'horizontal',
        'left-main': 'vertical',
        'right-main': 'vertical',
        'left-mini': 'vertical',
        'right-mini': 'vertical',
      },
      rightPanels: mapPanelsWithOverrides({
        toolbar: { dock: 'left-main', expanded: true, visible: true },
        project_explorer: { dock: 'right-main', expanded: true, visible: true },
        properties: { dock: 'right-main', expanded: true, visible: true },
        layers: { dock: 'right-main', expanded: true, visible: true },
        history: { dock: 'right-main', expanded: true, visible: true },
        dummie: { dock: 'left-main', expanded: true, visible: true },
        timeline: { dock: 'bottom', expanded: true, visible: true },
        console: { dock: 'bottom', expanded: true, visible: true },
        topbar: { dock: 'top', expanded: true, visible: true },
      }),
    },
  },
  {
    id: 'tilesets',
    name: 'Diseño de Tilesets',
    description: 'Asset Browser / Librería abierta para stamps y módulos de escenario junto a Texturas y Capas.',
    badge: 'Tilesets',
    defaultFileName: 'workspace_tilesets.pcslayout',
    layout: {
      ...DEFAULT_WORKSPACE_LAYOUT,
      templateId: 'tilesets',
      timelineHeight: 158,
      bottomDockHeight: 158,
      rightPanels: mapPanelsWithOverrides({
        library: { dock: 'left-main', expanded: true, visible: true },
        textures: { dock: 'left-main', expanded: true, visible: true },
        stage: { dock: 'left-mini', expanded: true, visible: true },
        brushes: { dock: 'left-mini', expanded: true, visible: true },
        layers: { dock: 'right-main', expanded: true, visible: true },
        properties: { dock: 'right-main', expanded: true, visible: true },
        history: { dock: 'right-main', expanded: true, visible: true },
        colorwheel: { dock: 'right-main', expanded: true, visible: true },
        timeline: { dock: 'bottom', expanded: true, visible: true },
      }),
    },
  },
  {
    id: 'spritesheets',
    name: 'Edición de Spritesheets',
    description: 'Timeline expandida para secuencias largas, Etiquetas de movimientos y Capas compactas.',
    badge: 'Spritesheets',
    defaultFileName: 'workspace_spritesheets.pcslayout',
    layout: {
      ...DEFAULT_WORKSPACE_LAYOUT,
      templateId: 'spritesheets',
      timelineHeight: 280,
      bottomDockHeight: 280,
      compactMode: true,
      timelineSectionOrder: ['tags', 'frames', 'ruler', 'transport'],
      rightPanels: mapPanelsWithOverrides({
        layers: { dock: 'right-main', expanded: true, visible: true },
        properties: { dock: 'right-main', expanded: true, visible: true },
        history: { dock: 'right-main', expanded: true, visible: true },
        library: { dock: 'right-mini', expanded: true, visible: true },
        combat: { dock: 'right-mini', expanded: true, visible: true },
        brushes: { dock: 'left-mini', expanded: true, visible: true },
        colorwheel: { dock: 'left-mini', expanded: true, visible: true },
        references: { dock: 'left-mini', expanded: true, visible: true },
        timeline: { dock: 'bottom', expanded: true, visible: true },
      }),
    },
  },
  {
    id: 'ui_hud',
    name: 'UI / HUD',
    description: 'Herramientas vectoriales, Propiedades numéricas, Filtros de color y Generador HUD al frente.',
    badge: 'UI / HUD',
    defaultFileName: 'workspace_uihud.pcslayout',
    layout: {
      ...DEFAULT_WORKSPACE_LAYOUT,
      templateId: 'ui_hud',
      timelineHeight: 156,
      bottomDockHeight: 156,
      rightPanels: mapPanelsWithOverrides({
        properties: { dock: 'right-main', expanded: true, visible: true },
        layers: { dock: 'right-main', expanded: true, visible: true },
        history: { dock: 'right-main', expanded: true, visible: true },
        ai: { dock: 'left-main', expanded: true, visible: true },
        vector_editor: { dock: 'left-main', expanded: true, visible: true },
        filters: { dock: 'right-mini', expanded: true, visible: true },
        colorwheel: { dock: 'right-mini', expanded: true, visible: true },
        library: { dock: 'right-mini', expanded: true, visible: true },
        timeline: { dock: 'bottom', expanded: true, visible: true },
      }),
      tabGroups: [
        {
          id: 'tabgrp-core-right',
          zone: 'right-main',
          panelIds: ['properties', 'layers', 'history'],
          activePanelId: 'properties',
        },
      ],
    },
  },
];

export const STUDIO_THEMES: StudioThemePreset[] = [
  {
    id: 'cps2_dark',
    name: 'CPS-2 Arcade Dark',
    subtitle: 'Carbón índigo profundo con acento ámbar dorado',
    isLight: false,
    vars: {
      bgApp: '#0d0f14',
      bgCanvas: '#0a0c12',
      bgBar: '#10121a',
      bgHeader: '#12141c',
      bgPanel: '#141622',
      bgCard: '#171a26',
      bgElevated: '#1d2232',
      border: '#222736',
      borderStrong: '#303952',
      text: '#e2e8f0',
      textMuted: '#94a3b8',
      accent: '#fbbf24',
      accentText: '#0f172a',
    },
  },
  {
    id: 'neogeo_crimson',
    name: 'SNK Neo-Geo Crimson',
    subtitle: 'Obsidiana oscura con energía carmesí arcade',
    isLight: false,
    vars: {
      bgApp: '#09090b',
      bgCanvas: '#070709',
      bgBar: '#100d10',
      bgHeader: '#141015',
      bgPanel: '#161117',
      bgCard: '#1c151e',
      bgElevated: '#261c29',
      border: '#2e2030',
      borderStrong: '#472f4a',
      text: '#f4f4f5',
      textMuted: '#a1a1aa',
      accent: '#f43f5e',
      accentText: '#ffffff',
    },
  },
  {
    id: 'aseprite_slate',
    name: 'Aseprite Pizarra Retro',
    subtitle: 'Gris violeta clásico de estudio pixel art',
    isLight: false,
    vars: {
      bgApp: '#222034',
      bgCanvas: '#191726',
      bgBar: '#28253d',
      bgHeader: '#2d2a44',
      bgPanel: '#2b2840',
      bgCard: '#34304d',
      bgElevated: '#3f3a5e',
      border: '#4a456b',
      borderStrong: '#635c8c',
      text: '#f2f0ff',
      textMuted: '#b8b2d8',
      accent: '#f59e0b',
      accentText: '#1a1625',
    },
  },
  {
    id: 'cyber_midnight',
    name: 'Cyber Arena Midnight',
    subtitle: 'Azul abisal con contraste eléctrico cian',
    isLight: false,
    vars: {
      bgApp: '#050b14',
      bgCanvas: '#03070d',
      bgBar: '#08111f',
      bgHeader: '#0b1628',
      bgPanel: '#0c182b',
      bgCard: '#102038',
      bgElevated: '#162c4d',
      border: '#1b355c',
      borderStrong: '#274d85',
      text: '#e0f2fe',
      textMuted: '#7dd3fc',
      accent: '#22d3ee',
      accentText: '#04121f',
    },
  },
  {
    id: 'gameboy_phosphor',
    name: 'GameBoy DMG Fósforo',
    subtitle: 'Oliva profundo monocromático y lima fósforo',
    isLight: false,
    vars: {
      bgApp: '#0d1a11',
      bgCanvas: '#08120b',
      bgBar: '#102116',
      bgHeader: '#13261a',
      bgPanel: '#14291b',
      bgCard: '#193322',
      bgElevated: '#21422c',
      border: '#264d33',
      borderStrong: '#38704a',
      text: '#ecfccb',
      textMuted: '#a3e635',
      accent: '#84cc16',
      accentText: '#071409',
    },
  },
  {
    id: 'studio_light',
    name: 'Studio Papel Claro',
    subtitle: 'Superficie clara de alto contraste para dibujo diurno',
    isLight: true,
    vars: {
      bgApp: '#e2e8f0',
      bgCanvas: '#cbd5e1',
      bgBar: '#f8fafc',
      bgHeader: '#ffffff',
      bgPanel: '#f1f5f9',
      bgCard: '#ffffff',
      bgElevated: '#e2e8f0',
      border: '#cbd5e1',
      borderStrong: '#94a3b8',
      text: '#0f172a',
      textMuted: '#475569',
      accent: '#2563eb',
      accentText: '#ffffff',
    },
  },
];

export const STUDIO_UI_FONTS: { id: StudioUiFontId; name: string; family: string; sample: string }[] = [
  { id: 'jakarta', name: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans', system-ui, sans-serif", sample: 'Limpia & Moderna' },
  { id: 'chakra', name: 'Chakra Petch', family: "'Chakra Petch', system-ui, sans-serif", sample: 'Arcade / Técnica' },
  { id: 'manrope', name: 'Manrope', family: "'Manrope', system-ui, sans-serif", sample: 'Geométrica Precisa' },
  { id: 'dmsans', name: 'DM Sans', family: "'DM Sans', system-ui, sans-serif", sample: 'Editorial Compacta' },
  { id: 'silkscreen', name: 'Silkscreen Pixel', family: "'Silkscreen', monospace", sample: 'Retro 8-Bit' },
];

export const STUDIO_MONO_FONTS: { id: StudioMonoFontId; name: string; family: string }[] = [
  { id: 'jetbrains', name: 'JetBrains Mono', family: "'JetBrains Mono', monospace" },
  { id: 'ibmplex', name: 'IBM Plex Mono', family: "'IBM Plex Mono', monospace" },
  { id: 'silkscreen', name: 'Silkscreen Pixel', family: "'Silkscreen', monospace" },
];

export interface UiStylePresetMeta {
  id: UiStylePresetId;
  name: string;
  description: string;
  patch: Partial<StudioStyleConfig>;
}

export const UI_STYLE_PRESETS: UiStylePresetMeta[] = [
  {
    id: 'modern',
    name: 'Moderna',
    description: 'Bordes equilibrados, degradados sutiles e iconos modernos.',
    patch: {
      themeId: 'cps2_dark',
      cornerStyle: 'rounded',
      buttonStyle: 'rounded_rect',
      density: 'normal',
      iconStyle: 'modern',
      iconSize: 'md',
      gradients: { useGradients: true, windows: true, buttons: true, panels: false, headers: true },
    },
  },
  {
    id: 'minimalist',
    name: 'Minimalista',
    description: 'Superficies limpias, colores planos e iconos finos.',
    patch: {
      themeId: 'cyber_midnight',
      cornerStyle: 'slightly_rounded',
      buttonStyle: 'rounded_rect',
      density: 'spacious',
      iconStyle: 'minimal',
      iconSize: 'sm',
      gradients: { useGradients: false, windows: false, buttons: false, panels: false, headers: false },
    },
  },
  {
    id: 'photoshop',
    name: 'Photoshop Style',
    description: 'Gris carbón técnico, esquinas ligeramente redondeadas y densidad compacta.',
    patch: {
      themeId: 'cps2_dark',
      cornerStyle: 'slightly_rounded',
      buttonStyle: 'rectangular',
      density: 'compact',
      iconStyle: 'classic',
      iconSize: 'md',
      customColors: {
        mainBg: '#1e1e1e',
        panelsBg: '#262626',
        barsBg: '#1b1b1b',
        buttonsBg: '#323232',
        hoverBg: '#3f3f3f',
        selectionBg: '#264f78',
        textColor: '#e5e5e5',
        iconColor: '#cfcfcf',
      },
      gradients: { useGradients: false, windows: false, buttons: false, panels: false, headers: false },
    },
  },
  {
    id: 'aseprite',
    name: 'Aseprite Style',
    description: 'Estética retro pizarra, bordes rectos y tipografía pixel.',
    patch: {
      themeId: 'aseprite_slate',
      cornerStyle: 'straight',
      buttonStyle: 'rectangular',
      density: 'compact',
      iconStyle: 'pixel',
      iconSize: 'md',
      gradients: { useGradients: false, windows: false, buttons: false, panels: false, headers: false },
    },
  },
  {
    id: 'retro',
    name: 'Retro',
    description: 'Paleta arcade CRT, botones marcados e iconos clásicos.',
    patch: {
      themeId: 'neogeo_crimson',
      cornerStyle: 'slightly_rounded',
      buttonStyle: 'square',
      density: 'normal',
      iconStyle: 'classic',
      iconSize: 'md',
      gradients: { useGradients: true, windows: true, buttons: true, panels: true, headers: true },
    },
  },
  {
    id: 'flat',
    name: 'Flat UI',
    description: 'Colores planos sin gradientes con cápsulas suaves.',
    patch: {
      themeId: 'studio_light',
      cornerStyle: 'very_rounded',
      buttonStyle: 'pill',
      density: 'normal',
      iconStyle: 'modern',
      iconSize: 'md',
      gradients: { useGradients: false, windows: false, buttons: false, panels: false, headers: false },
    },
  },
  {
    id: 'professional',
    name: 'Profesional',
    description: 'Contraste calibrado, degradados discretos y alta legibilidad.',
    patch: {
      themeId: 'cps2_dark',
      cornerStyle: 'slightly_rounded',
      buttonStyle: 'rounded_rect',
      density: 'normal',
      iconStyle: 'minimal',
      iconSize: 'md',
      gradients: { useGradients: true, windows: false, buttons: true, panels: false, headers: true },
    },
  },
  {
    id: 'pixel',
    name: 'Pixel UI',
    description: 'Esquinas rectas 0px, fuente pixelada y botones cuadrados nítidos.',
    patch: {
      themeId: 'gameboy_phosphor',
      uiFontId: 'silkscreen',
      monoFontId: 'silkscreen',
      cornerStyle: 'straight',
      buttonStyle: 'square',
      density: 'compact',
      iconStyle: 'pixel',
      iconSize: 'md',
      gradients: { useGradients: false, windows: false, buttons: false, panels: false, headers: false },
    },
  },
];

export const DEFAULT_STUDIO_STYLE: StudioStyleConfig = {
  themeId: 'cps2_dark',
  uiFontId: 'jakarta',
  monoFontId: 'jetbrains',
  cornerStyle: 'rounded',
  uiPreset: 'modern',
  buttonStyle: 'rounded_rect',
  customColors: {},
  gradients: {
    useGradients: true,
    windows: true,
    buttons: false,
    panels: false,
    headers: true,
  },
  density: 'normal',
  iconStyle: 'modern',
  iconSize: 'md',
};

const STORAGE_LAYOUT_KEY = 'pixelclash_workspace_layout_v3';
const STORAGE_SAVED_LAYOUTS_KEY = 'pixelclash_saved_layouts_v1';
const STORAGE_STYLE_KEY = 'pixelclash_studio_style_v1';
const STORAGE_SAVED_THEMES_KEY = 'pixelclash_saved_themes_v1';

export function sanitizeWorkspaceLayout(parsed: Partial<WorkspaceLayoutConfig>): WorkspaceLayoutConfig {
  let mergedPanels: RightPanelConfig[] = DEFAULT_RIGHT_PANELS;
  if (Array.isArray(parsed.rightPanels) && parsed.rightPanels.length > 0) {
    const validIds = new Set(DEFAULT_RIGHT_PANELS.map((dp) => dp.id));
    const filteredSaved = parsed.rightPanels
      .filter((p: RightPanelConfig) => validIds.has(p.id))
      .map((p: RightPanelConfig) =>
        p.id === 'timeline' ? { ...p, title: 'Línea de Tiempo' } : p
      );
    const existingIds = new Set(filteredSaved.map((p: RightPanelConfig) => p.id));
    const missingDefaults = DEFAULT_RIGHT_PANELS.filter((dp) => !existingIds.has(dp.id)).map((dp) => {
      if (dp.id === 'timeline' && parsed.timelinePosition === 'top') {
        return { ...dp, dock: 'top' as PanelDockZone };
      }
      return dp;
    });
    mergedPanels = [...filteredSaved, ...missingDefaults];
  }
  return {
    ...DEFAULT_WORKSPACE_LAYOUT,
    ...parsed,
    dockOrientations: {
      ...DEFAULT_WORKSPACE_LAYOUT.dockOrientations,
      ...(parsed.dockOrientations || {}),
    },
    panelHeights: parsed.panelHeights || {},
    panelWidths: parsed.panelWidths || {},
    compactPanels: parsed.compactPanels || {},
    toolOrder: Array.isArray(parsed.toolOrder) && parsed.toolOrder.length > 0
      ? (() => {
          const validSet = new Set(DEFAULT_TOOL_ORDER);
          const seen = new Set<ToolType>();
          const filtered: ToolType[] = [];
          for (const rawTool of parsed.toolOrder) {
            // Consolidate deprecated standalone icons into unified parent tools
            const normalized: ToolType =
              rawTool === 'vector_select' || rawTool === 'direct_select'
                ? 'move'
                : rawTool === 'circle'
                ? 'rectangle'
                : rawTool === 'dither' || rawTool === 'smear' || rawTool === 'shading'
                ? 'pencil'
                : rawTool;
            if (validSet.has(normalized) && !seen.has(normalized)) {
              seen.add(normalized);
              filtered.push(normalized);
            }
          }
          const missing = DEFAULT_TOOL_ORDER.filter((t) => !seen.has(t));
          return [...filtered, ...missing];
        })()
      : DEFAULT_TOOL_ORDER,
    toolbarColumns: 'auto',
    leftMiniWidth:
      typeof parsed.leftMiniWidth === 'number' && !Number.isNaN(parsed.leftMiniWidth)
        ? Math.max(44, Math.min(320, Math.round(parsed.leftMiniWidth)))
        : DEFAULT_WORKSPACE_LAYOUT.leftMiniWidth,
    rightMiniWidth:
      typeof parsed.rightMiniWidth === 'number' && !Number.isNaN(parsed.rightMiniWidth)
        ? Math.max(44, Math.min(320, Math.round(parsed.rightMiniWidth)))
        : DEFAULT_WORKSPACE_LAYOUT.rightMiniWidth,
    leftMiniMode: parsed.leftMiniMode === 'expanded' ? 'expanded' : 'compact',
    rightMiniMode: parsed.rightMiniMode === 'expanded' ? 'expanded' : 'compact',
    miniFlyoutWidth:
      typeof parsed.miniFlyoutWidth === 'number' && !Number.isNaN(parsed.miniFlyoutWidth)
        ? Math.max(220, Math.min(600, Math.round(parsed.miniFlyoutWidth)))
        : DEFAULT_WORKSPACE_LAYOUT.miniFlyoutWidth,
    rightPanels: mergedPanels,
    tabGroups: Array.isArray(parsed.tabGroups) && parsed.tabGroups.length > 0
      ? parsed.tabGroups
      : DEFAULT_WORKSPACE_LAYOUT.tabGroups,
    floatingPanels: parsed.floatingPanels || {},
    collapsedSections: parsed.collapsedSections || {},
    layersSectionHeights: {
      ...DEFAULT_WORKSPACE_LAYOUT.layersSectionHeights!,
      ...(parsed.layersSectionHeights || {}),
    },
    timelineSectionOrder:
      Array.isArray(parsed.timelineSectionOrder) && parsed.timelineSectionOrder.length === 4
        ? parsed.timelineSectionOrder
        : DEFAULT_WORKSPACE_LAYOUT.timelineSectionOrder,
  };
}

export function loadWorkspaceLayout(): WorkspaceLayoutConfig {
  try {
    const raw =
      localStorage.getItem(STORAGE_LAYOUT_KEY) ||
      localStorage.getItem('pixelclash_workspace_layout_v2') ||
      localStorage.getItem('pixelclash_workspace_layout_v1');
    if (!raw) return DEFAULT_WORKSPACE_LAYOUT;
    return sanitizeWorkspaceLayout(JSON.parse(raw));
  } catch {
    return DEFAULT_WORKSPACE_LAYOUT;
  }
}

export function saveWorkspaceLayout(layout: WorkspaceLayoutConfig): void {
  try {
    localStorage.setItem(STORAGE_LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    // ignore storage quota errors
  }
}

export function serializeWorkspaceToPcsLayout(
  layout: WorkspaceLayoutConfig,
  name: string = 'workspace_custom'
): string {
  return JSON.stringify(
    {
      format: 'PixelClashStudioLayout',
      version: 3,
      name,
      exportedAt: new Date().toISOString(),
      screen: {
        width: typeof window !== 'undefined' ? window.innerWidth : 1920,
        height: typeof window !== 'undefined' ? window.innerHeight : 1080,
      },
      layout,
    },
    null,
    2
  );
}

export function parsePcsLayoutFile(raw: string): { name: string; layout: WorkspaceLayoutConfig } | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.layout) {
      return {
        name: parsed.name || 'Workspace Importado',
        layout: sanitizeWorkspaceLayout(parsed.layout),
      };
    }
    if (parsed?.rightPanels) {
      return {
        name: parsed.templateId || 'Workspace Importado',
        layout: sanitizeWorkspaceLayout(parsed),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function loadSavedCustomLayouts(): SavedCustomLayout[] {
  try {
    const raw = localStorage.getItem(STORAGE_SAVED_LAYOUTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomLayouts(list: SavedCustomLayout[]): void {
  try {
    localStorage.setItem(STORAGE_SAVED_LAYOUTS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function loadStudioStyle(): StudioStyleConfig {
  try {
    const raw = localStorage.getItem(STORAGE_STYLE_KEY);
    if (!raw) return DEFAULT_STUDIO_STYLE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STUDIO_STYLE,
      ...parsed,
      customColors: { ...(parsed?.customColors || {}) },
      gradients: {
        ...DEFAULT_STUDIO_STYLE.gradients!,
        ...(parsed?.gradients || {}),
      },
    };
  } catch {
    return DEFAULT_STUDIO_STYLE;
  }
}

export function saveStudioStyle(style: StudioStyleConfig): void {
  try {
    localStorage.setItem(STORAGE_STYLE_KEY, JSON.stringify(style));
  } catch {
    // ignore
  }
}

export function loadSavedThemes(): SavedCustomTheme[] {
  try {
    const raw = localStorage.getItem(STORAGE_SAVED_THEMES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSavedThemes(themes: SavedCustomTheme[]): void {
  try {
    localStorage.setItem(STORAGE_SAVED_THEMES_KEY, JSON.stringify(themes));
  } catch {
    // ignore
  }
}

export function serializeStudioTheme(style: StudioStyleConfig, name: string = 'PixelClash Theme'): string {
  return JSON.stringify(
    {
      format: 'PixelClashStudioTheme',
      version: 1,
      name,
      exportedAt: new Date().toISOString(),
      style,
    },
    null,
    2
  );
}

export function parseStudioThemeFile(raw: string): { name: string; style: StudioStyleConfig } | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.style && parsed.style.themeId) {
      return {
        name: parsed.name || 'Tema Importado',
        style: {
          ...DEFAULT_STUDIO_STYLE,
          ...parsed.style,
          customColors: { ...(parsed.style.customColors || {}) },
          gradients: { ...DEFAULT_STUDIO_STYLE.gradients!, ...(parsed.style.gradients || {}) },
        },
      };
    }
    if (parsed?.themeId) {
      return {
        name: 'Tema Importado',
        style: {
          ...DEFAULT_STUDIO_STYLE,
          ...parsed,
          customColors: { ...(parsed.customColors || {}) },
          gradients: { ...DEFAULT_STUDIO_STYLE.gradients!, ...(parsed.gradients || {}) },
        },
      };
    }
    return null;
  } catch {
    return null;
  }
}

