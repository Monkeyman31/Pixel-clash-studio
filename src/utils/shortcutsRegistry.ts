import { RecordedMacro, ShortcutBinding, ShortcutProfileId } from '../types';

export const DEFAULT_SHORTCUT_BINDINGS: ShortcutBinding[] = [
  // General
  { id: 'cmd.command_palette', label: 'Buscador Universal de Acciones (F1)', category: 'General', location: 'Global / Ayuda > Buscador Universal', primary: 'F1', secondary: 'Ctrl+Shift+P' },
  { id: 'cmd.what_is_this_mode', label: 'Modo "¿Dónde está?" (Inspector Visual de Ayuda)', category: 'General', location: 'Ayuda > Modo "¿Dónde está?"', primary: 'Shift+F1' },
  { id: 'cmd.where_is_tool', label: '¿Dónde está esta herramienta? (Localizador)', category: 'General', location: 'Ayuda > ¿Dónde está esta herramienta?', primary: 'Ctrl+Alt+H' },
  { id: 'cmd.shortcuts_editor', label: 'Abrir Editor de Atajos', category: 'General', location: 'Edición > Atajos de teclado...', primary: 'Ctrl+Alt+K' },
  { id: 'cmd.save_pcs', label: 'Guardar Proyecto (.PCS)', category: 'General', location: 'Archivo > Guardar (.PCS)', primary: 'Ctrl+S' },
  { id: 'cmd.open_file', label: 'Abrir Proyecto', category: 'General', location: 'Archivo > Abrir...', primary: 'Ctrl+O' },
  { id: 'cmd.new_project', label: 'Nuevo Proyecto', category: 'General', location: 'Archivo > Nuevo', primary: 'Ctrl+N' },
  { id: 'cmd.workspace_modal', label: 'Administrar Espacios de Trabajo', category: 'General', location: 'Interfaz > Administrar espacios', primary: 'Ctrl+Alt+W' },
  { id: 'cmd.toggle_ui_edit_mode', label: 'Activar / Desactivar Modo Edición Libre de Interfaz', category: 'General', location: 'Interfaz > Modo Edición Libre', primary: 'Ctrl+Alt+Shift+D' },
  { id: 'cmd.compact_mode', label: 'Alternar Modo Compacto', category: 'General', location: 'Interfaz > Modo Compacto', primary: 'Tab' },
  { id: 'cmd.export_modal', label: 'Exportación Avanzada / Sprite Sheet', category: 'General', location: 'Archivo > Exportar', primary: 'Ctrl+Shift+E' },
  { id: 'cmd.pure_ref_toggle', label: 'Activar / Desactivar Modo PureRef (Referencias en Cámara)', category: 'General', location: 'Referencias > Modo PureRef', primary: 'Ctrl+Alt+R' },
  { id: 'cmd.center_references', label: 'Centrar Todas las Referencias en Pantalla', category: 'General', location: 'Referencias > Centrar Todas', primary: 'Ctrl+Alt+0' },

  // Edición
  { id: 'edit.undo', label: 'Deshacer', category: 'Edición', location: 'Edición > Deshacer', primary: 'Ctrl+Z' },
  { id: 'edit.redo', label: 'Rehacer', category: 'Edición', location: 'Edición > Rehacer', primary: 'Ctrl+Shift+Z', secondary: 'Ctrl+Y' },
  { id: 'edit.copy', label: 'Copiar (Capa / Selección)', category: 'Edición', location: 'Edición > Copiar', primary: 'Ctrl+C' },
  { id: 'edit.cut', label: 'Cortar', category: 'Edición', location: 'Edición > Cortar', primary: 'Ctrl+X' },
  { id: 'edit.paste', label: 'Pegar (Nueva Capa Segura)', category: 'Edición', location: 'Edición > Pegar', primary: 'Ctrl+V' },
  { id: 'edit.paste_in_place', label: 'Pegar en el mismo sitio', category: 'Edición', location: 'Edición > Pegar en el mismo sitio', primary: 'Ctrl+Shift+V' },
  { id: 'edit.swap_colors', label: 'Intercambiar Color Primario/Secundario', category: 'Edición', location: 'Barra Herramientas', primary: 'X' },
  { id: 'edit.smart_delete', label: 'Eliminación Inteligente Contextual (Suprimir)', category: 'Edición', location: 'Global > Tecla Suprimir', primary: 'Delete' },
  { id: 'edit.clear_frame', label: 'Limpiar Capa Actual', category: 'Edición', location: 'Edición > Limpiar', primary: 'Ctrl+Delete' },

  // Capas
  { id: 'layer.new', label: 'Nueva Capa Raster', category: 'Capas', location: 'Capas > + Nueva Capa', primary: 'Ctrl+Shift+N' },
  { id: 'layer.duplicate', label: 'Duplicar Capa / Selección', category: 'Capas', location: 'Capas > Duplicar', primary: 'Ctrl+J' },
  { id: 'layer.toggle_global', label: 'Alternar Capa Global', category: 'Capas', location: 'Capas > Capa Global', primary: 'Ctrl+Alt+G' },
  { id: 'layer.new_adjustment', label: 'Nueva Capa de Ajuste', category: 'Capas', location: 'Capas > Ajuste Color', primary: 'Ctrl+Shift+U' },
  { id: 'layer.new_group', label: 'Crear Grupo / Carpeta', category: 'Capas', location: 'Capas > Nueva Carpeta', primary: 'Ctrl+G' },
  { id: 'layer.merge', label: 'Combinar Capas Seleccionadas', category: 'Capas', location: 'Capas > Combinar', primary: 'Ctrl+E' },

  // Selección
  { id: 'tool.select', label: 'Selección (General / Objetos / Capas / Referencias / Vectores / Nodos)', category: 'Selección', location: 'Barra Herramientas > Selección', primary: 'M' },
  { id: 'tool.lasso', label: 'Lazo (Libre / Poligonal / Magnético)', category: 'Selección', location: 'Barra Herramientas > Lazo', primary: 'Q' },
  { id: 'tool.lasso_magnetic', label: 'Subherramienta: Lazo Magnético', category: 'Selección', location: 'Barra Herramientas > Lazo', primary: 'Shift+Q' },
  { id: 'tool.magic_wand', label: 'Varita Mágica', category: 'Selección', location: 'Barra Herramientas', primary: 'W' },
  { id: 'sel.deselect', label: 'Deseleccionar Todo', category: 'Selección', location: 'Selección > Deseleccionar', primary: 'Ctrl+D' },
  { id: 'prefs.selection_display', label: 'Preferencias de Visualización de Selecciones', category: 'Selección', location: 'Interfaz > Preferencias de Selecciones', primary: '' },

  // Transformación
  { id: 'tool.canvas_edit', label: 'Editar Lienzo (Recorte, Expansión y Spritesheet Visual)', category: 'Transformación', location: 'Barra Herramientas > Editar Lienzo / Imagen > Editar Lienzo', primary: 'Shift+C' },
  { id: 'transform.free', label: 'Transformación Libre', category: 'Transformación', location: 'Edición > Transformar > Libre', primary: 'Ctrl+T' },
  { id: 'transform.flip_h', label: 'Voltear Horizontal', category: 'Transformación', location: 'Edición > Transformar', primary: 'Shift+H' },
  { id: 'transform.flip_v', label: 'Voltear Vertical', category: 'Transformación', location: 'Edición > Transformar', primary: 'Shift+V' },
  { id: 'transform.rot_90_cw', label: 'Rotar 90° Derecha', category: 'Transformación', location: 'Edición > Transformar', primary: 'Ctrl+]' },
  { id: 'transform.rot_90_ccw', label: 'Rotar 90° Izquierda', category: 'Transformación', location: 'Edición > Transformar', primary: 'Ctrl+[' },
  { id: 'transform.center', label: 'Centrar en Lienzo', category: 'Transformación', location: 'Edición > Transformar', primary: 'Ctrl+Alt+C' },

  // Animación
  { id: 'anim.play_pause', label: 'Reproducir / Pausar Animación', category: 'Animación', location: 'Línea de Tiempo', primary: 'P' },
  { id: 'anim.add_frame', label: 'Nuevo Fotograma', category: 'Animación', location: 'Línea de Tiempo > + Frame', primary: 'N' },
  { id: 'anim.prev_frame', label: 'Fotograma Anterior', category: 'Animación', location: 'Línea de Tiempo', primary: 'ArrowLeft' },
  { id: 'anim.next_frame', label: 'Siguiente Fotograma', category: 'Animación', location: 'Línea de Tiempo', primary: 'ArrowRight' },
  { id: 'anim.onion_skin', label: 'Alternar Papel Cebolla', category: 'Animación', location: 'Línea de Tiempo', primary: 'O' },
  { id: 'anim.camera_shake_test', label: 'Probar Temblor de Cámara (Camera Shake)', category: 'Animación', location: 'Animación > Controladores de Cámara', primary: 'Ctrl+Alt+T' },

  // Pixel Art
  { id: 'tool.pencil', label: 'Lápiz / Pincel Universal', category: 'Pixel Art', location: 'Barra Herramientas', primary: 'B' },
  { id: 'tool.eraser', label: 'Borrador', category: 'Pixel Art', location: 'Barra Herramientas', primary: 'E' },
  { id: 'tool.bucket', label: 'Bote de Pintura (Relleno / Degradado / Dithering)', category: 'Pixel Art', location: 'Barra Herramientas > Bote', primary: 'G' },
  { id: 'tool.bucket_gradient', label: 'Subherramienta: Degradado', category: 'Pixel Art', location: 'Barra Herramientas > Bote', primary: '' },
  { id: 'tool.bucket_dither_gradient', label: 'Subherramienta: Degradado con Dithering', category: 'Pixel Art', location: 'Barra Herramientas > Bote', primary: '' },
  { id: 'tool.eyedropper', label: 'Cuentagotas Pro + Lupa', category: 'Pixel Art', location: 'Barra Herramientas', primary: 'I' },
  { id: 'tool.shading', label: 'Alternar Modificador Cel Shading (Panel Pinceles)', category: 'Pixel Art', location: 'Panel Pinceles > Cel Shading', primary: 'J' },
  { id: 'tool.smear', label: 'Alternar Modificador Smear (Panel Pinceles)', category: 'Pixel Art', location: 'Panel Pinceles > Smear', primary: 'S' },
  { id: 'tool.dither', label: 'Alternar Modificador Universal Dithering (Panel Pinceles)', category: 'Pixel Art', location: 'Panel Pinceles > Dithering', primary: 'D' },
  { id: 'tool.move', label: 'Mover (General / Capa / Referencia / Selección / Directa)', category: 'Pixel Art', location: 'Barra Herramientas > Mover', primary: 'V' },
  { id: 'tool.move_object', label: 'Subherramienta: Mover General (Inteligente)', category: 'Pixel Art', location: 'Barra Herramientas > Mover', primary: '' },
  { id: 'tool.move_layer', label: 'Subherramienta: Mover Capa', category: 'Pixel Art', location: 'Barra Herramientas > Mover', primary: '' },
  { id: 'tool.move_selection', label: 'Subherramienta: Mover Selección', category: 'Pixel Art', location: 'Barra Herramientas > Mover', primary: '' },
  { id: 'tool.move_reference', label: 'Subherramienta: Mover Referencia', category: 'Pixel Art', location: 'Barra Herramientas > Mover', primary: 'Shift+R' },
  { id: 'tool.text', label: 'Texto Pixel / Arcade', category: 'Pixel Art', location: 'Barra Herramientas', primary: 'T' },
  { id: 'tool.tile', label: 'Tiles (Pintar / Colocar / Reemplazar / Autotile)', category: 'Pixel Art', location: 'Barra Herramientas > Tiles', primary: 'Shift+T' },
  { id: 'tool.hand', label: 'Mano (Mover Vista)', category: 'Pixel Art', location: 'Barra Herramientas', primary: 'H' },
  { id: 'tool.zoom', label: 'Lupa (Zoom / Región)', category: 'Pixel Art', location: 'Barra Herramientas > Lupa', primary: 'Z' },
  { id: 'view.zoom_in', label: 'Acercar Zoom', category: 'General', location: 'Ver > Acercar / Lupa', primary: 'Ctrl++', secondary: 'Ctrl+=' },
  { id: 'view.zoom_out', label: 'Alejar Zoom', category: 'General', location: 'Ver > Alejar / Lupa', primary: 'Ctrl+-' },
  { id: 'view.zoom_fit', label: 'Ajustar Lienzo a Pantalla', category: 'General', location: 'Ver > Ajustar pantalla / Lupa', primary: 'Ctrl+0' },
  { id: 'view.zoom_100', label: 'Zoom 100% Real', category: 'General', location: 'Ver > Zoom 100% / Lupa', primary: 'Ctrl+1' },
  { id: 'pixel.brush_dec', label: 'Reducir Tamaño Pincel', category: 'Pixel Art', location: 'Pinceles', primary: '[' },
  { id: 'pixel.brush_inc', label: 'Aumentar Tamaño Pincel', category: 'Pixel Art', location: 'Pinceles', primary: ']' },
  { id: 'view.grid', label: 'Mostrar / Ocultar Cuadrícula', category: 'Pixel Art', location: 'Ver > Cuadrícula', primary: "Ctrl+'" },
  { id: 'view.toggle_fullscreen', label: 'Maximizar Ventana / Pantalla Completa', category: 'General', location: 'Inicio / Barra Superior / Ver > Maximizar', primary: 'F11' },

  // Vectores
  { id: 'tool.line', label: 'Línea / Curva Vectorial (Ctrl = Selección Directa)', category: 'Vectores', location: 'Barra Herramientas', primary: 'L' },
  { id: 'tool.direct_select', label: 'Subherramienta: Selección Directa (Flecha Blanca)', category: 'Vectores', location: 'Barra Herramientas > Mover', primary: 'A' },
  { id: 'tool.rectangle', label: 'Forma: Rectángulo', category: 'Vectores', location: 'Barra Herramientas > Forma', primary: 'U' },
  { id: 'tool.circle', label: 'Forma: Elipse / Círculo', category: 'Vectores', location: 'Barra Herramientas > Forma', primary: 'C' },
  { id: 'vector.pixel_preview_toggle', label: 'Alternar Vista Pixel-Perfect Simultánea', category: 'Vectores', location: 'Inspector Vectorial > Vista Pixel-Perfect', primary: 'Shift+P' },

  // IA
  { id: 'ai.open_panel', label: 'Abrir Panel IA Contextual', category: 'IA', location: 'Paneles > IA Contextual', primary: 'Ctrl+Alt+A' },
  { id: 'ai.dummie_apply', label: 'Aplicar Pose Dummie 2D al Sprite', category: 'IA', location: 'Referencias > Dummie', primary: 'Ctrl+Alt+D' },

  // Fighting Game
  { id: 'tool.hitbox', label: 'Herramienta Hitbox / Hurtbox', category: 'Fighting Game', location: 'Barra Herramientas', primary: 'K' },
  { id: 'fg.toggle_hitboxes', label: 'Mostrar / Ocultar Hitboxes', category: 'Fighting Game', location: 'Ver > Hitboxes', primary: 'F8' },
  { id: 'fg.combat_test', label: 'Modo Prueba de Combate en Vivo', category: 'Fighting Game', location: 'Fighting Studio', primary: 'F9' },
];

export const SHORTCUT_PROFILE_PRESETS: Record<
  Exclude<ShortcutProfileId, 'custom'>,
  { name: string; description: string; overrides: Record<string, string> }
> = {
  pixelclash: {
    name: 'PixelClash Studio',
    description: 'Distribución nativa híbrida pixel art, vectores y animación arcade.',
    overrides: {},
  },
  photoshop: {
    name: 'Adobe Photoshop',
    description: 'Atajos clásicos de Adobe Photoshop (V Mover, B Pincel, A Directa, Alt+Rueda/Ctrl+T).',
    overrides: {
      'tool.move': 'V',
      'tool.pencil': 'B',
      'tool.eraser': 'E',
      'tool.bucket': 'G',
      'tool.eyedropper': 'I',
      'tool.select': 'M',
      'tool.lasso': 'L',
      'tool.line': 'P',
      'tool.direct_select': 'A',
      'tool.rectangle': 'U',
      'transform.free': 'Ctrl+T',
      'layer.new': 'Ctrl+Shift+N',
      'layer.duplicate': 'Ctrl+J',
      'anim.play_pause': 'Shift+Space',
    },
  },
  aseprite: {
    name: 'Aseprite',
    description: 'Flujo ultra rápido de Aseprite (Alt+N Frame, G Bote, I Cuentagotas, X Swap).',
    overrides: {
      'tool.pencil': 'B',
      'tool.eraser': 'E',
      'tool.bucket': 'G',
      'tool.eyedropper': 'I',
      'tool.move': 'V',
      'tool.select': 'M',
      'tool.lasso': 'Q',
      'tool.magic_wand': 'W',
      'tool.line': 'L',
      'tool.rectangle': 'U',
      'tool.circle': 'O',
      'anim.add_frame': 'Alt+N',
      'anim.play_pause': 'Enter',
      'edit.swap_colors': 'X',
    },
  },
  krita: {
    name: 'Krita',
    description: 'Inspirado en ilustración Krita (B Pincel, V Línea, Shift+B Lápiz, Ctrl+T Transform).',
    overrides: {
      'tool.pencil': 'B',
      'tool.eraser': 'E',
      'tool.bucket': 'F',
      'tool.eyedropper': 'P',
      'tool.move': 'T',
      'tool.select': 'R',
      'tool.line': 'V',
      'transform.free': 'Ctrl+T',
      'layer.new': 'Insert',
    },
  },
  blender: {
    name: 'Blender 2D Grease Pencil',
    description: 'Atajos orientados a Blender (G Mover, S Escala, R Rotar, F1 Paleta, Tab Compacto).',
    overrides: {
      'tool.move': 'G',
      'transform.free': 'S',
      'transform.rot_90_cw': 'R',
      'tool.pencil': 'D',
      'tool.direct_select': 'Ctrl+Tab',
      'cmd.command_palette': 'F3',
      'anim.play_pause': 'Space',
    },
  },
  clipstudio: {
    name: 'Clip Studio Paint',
    description: 'Atajos de dibujo Clip Studio (P Pluma, I Gotero, K Mover, O Subherramienta Vector).',
    overrides: {
      'tool.pencil': 'P',
      'tool.eraser': 'E',
      'tool.eyedropper': 'I',
      'tool.bucket': 'G',
      'tool.move': 'K',
      'tool.direct_select': 'O',
      'transform.free': 'Ctrl+T',
      'layer.new': 'Ctrl+Shift+N',
    },
  },
};

const STORAGE_SHORTCUTS_KEY = 'pixelclash_custom_shortcuts_v1';
const STORAGE_PROFILE_KEY = 'pixelclash_shortcut_profile_v1';
const STORAGE_MACROS_KEY = 'pixelclash_recorded_macros_v1';

export function buildProfileBindings(profile: ShortcutProfileId): ShortcutBinding[] {
  const overrides =
    profile !== 'custom' && SHORTCUT_PROFILE_PRESETS[profile]
      ? SHORTCUT_PROFILE_PRESETS[profile].overrides
      : {};
  return DEFAULT_SHORTCUT_BINDINGS.map((b) => ({
    ...b,
    primary: overrides[b.id] || b.primary,
  }));
}

export function loadShortcutProfile(): ShortcutProfileId {
  try {
    const raw = localStorage.getItem(STORAGE_PROFILE_KEY) as ShortcutProfileId | null;
    if (raw && (raw === 'custom' || raw in SHORTCUT_PROFILE_PRESETS)) return raw;
    return 'pixelclash';
  } catch {
    return 'pixelclash';
  }
}

export function saveShortcutProfile(profile: ShortcutProfileId): void {
  try {
    localStorage.setItem(STORAGE_PROFILE_KEY, profile);
  } catch {
    // ignore
  }
}

export function loadShortcutBindings(): ShortcutBinding[] {
  try {
    const raw = localStorage.getItem(STORAGE_SHORTCUTS_KEY);
    if (!raw) return DEFAULT_SHORTCUT_BINDINGS;
    const parsed = JSON.parse(raw) as ShortcutBinding[];
    if (!Array.isArray(parsed)) return DEFAULT_SHORTCUT_BINDINGS;
    const map = new Map(parsed.map((item) => [item.id, item]));
    const savedWhat = map.get('cmd.what_is_this_mode');
    const savedPal = map.get('cmd.command_palette');
    const needsF1Migration =
      savedWhat?.primary === 'F1' && (!savedPal || savedPal.primary === 'Ctrl+Shift+P');
    return DEFAULT_SHORTCUT_BINDINGS.map((def) => {
      const saved = map.get(def.id);
      if (!saved) return def;
      if (needsF1Migration && def.id === 'cmd.command_palette') {
        return { ...def, primary: 'F1', secondary: 'Ctrl+Shift+P' };
      }
      if (needsF1Migration && def.id === 'cmd.what_is_this_mode') {
        return { ...def, primary: 'Shift+F1' };
      }
      return {
        ...def,
        primary: saved.primary ?? def.primary,
        secondary: saved.secondary ?? def.secondary,
      };
    });
  } catch {
    return DEFAULT_SHORTCUT_BINDINGS;
  }
}

export function saveShortcutBindings(bindings: ShortcutBinding[]): void {
  try {
    localStorage.setItem(STORAGE_SHORTCUTS_KEY, JSON.stringify(bindings));
  } catch {
    // ignore
  }
}

export function loadRecordedMacros(): RecordedMacro[] {
  try {
    const raw = localStorage.getItem(STORAGE_MACROS_KEY);
    if (!raw) {
      return [
        {
          id: 'macro-prep-shading',
          name: 'Preparación de sombreado',
          createdAt: new Date().toISOString(),
          shortcut: 'Ctrl+Alt+S',
          steps: [
            { id: 's1', actionId: 'layer.new', label: 'Crear capa nueva' },
            { id: 's2', actionId: 'layer.rename_shadow', label: 'Renombrar a "Sombras"' },
            { id: 's3', actionId: 'layer.blend_multiply', label: 'Modo Multiplicar (65%)' },
          ],
        },
      ];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecordedMacros(macros: RecordedMacro[]): void {
  try {
    localStorage.setItem(STORAGE_MACROS_KEY, JSON.stringify(macros));
  } catch {
    // ignore
  }
}

export function normalizeShortcutString(raw: string): string {
  if (!raw) return '';
  // Preserve explicit '+' key (e.g. 'Ctrl++' or '+') before splitting on '+'
  const trimmed = raw.trim();
  const tokenized =
    trimmed === '+'
      ? '__PLUS__'
      : trimmed.replace(/\+\+$/g, '+__PLUS__').replace(/\+\+(?=\+)/g, '+__PLUS__');
  const parts = tokenized
    .split('+')
    .map((p) => p.trim())
    .filter(Boolean);
  const mods: string[] = [];
  let key = '';
  for (const p of parts) {
    const lower = p.toLowerCase();
    if (lower === 'ctrl' || lower === 'control' || lower === 'cmd' || lower === 'meta') {
      if (!mods.includes('Ctrl')) mods.push('Ctrl');
    } else if (lower === 'shift') {
      if (!mods.includes('Shift')) mods.push('Shift');
    } else if (lower === 'alt' || lower === 'option') {
      if (!mods.includes('Alt')) mods.push('Alt');
    } else {
      if (lower === '__plus__' || lower === 'plus') key = '+';
      else if (lower === ' ') key = 'Space';
      else if (lower === 'arrowleft') key = 'ArrowLeft';
      else if (lower === 'arrowright') key = 'ArrowRight';
      else if (lower === 'arrowup') key = 'ArrowUp';
      else if (lower === 'arrowdown') key = 'ArrowDown';
      else if (lower === 'delete' || lower === 'backspace') key = 'Delete';
      else if (lower === 'enter') key = 'Enter';
      else if (lower === 'tab') key = 'Tab';
      else if (/^f\d{1,2}$/i.test(p)) key = p.toUpperCase();
      else key = p.length === 1 ? p.toUpperCase() : p;
    }
  }
  const order = ['Ctrl', 'Shift', 'Alt'];
  mods.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return key ? [...mods, key].join('+') : mods.join('+');
}

export function formatKeyboardEventToShortcut(e: KeyboardEvent): string | null {
  const ignored = ['Control', 'Shift', 'Alt', 'Meta', 'CapsLock', 'NumLock'];
  if (ignored.includes(e.key)) return null;
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  // Avoid Shift noise when typing '+' on standard keyboards (Shift + '=')
  const isPlusKey = e.key === '+' || (e.code === 'NumpadAdd');
  if (e.shiftKey && !isPlusKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');

  let key = e.key;
  if (isPlusKey) key = '__PLUS__';
  else if (e.code === 'NumpadSubtract') key = '-';
  else if (key === ' ') key = 'Space';
  else if (key.length === 1) key = key.toUpperCase();
  parts.push(key);
  return normalizeShortcutString(parts.join('+'));
}

export function matchesShortcutEvent(e: KeyboardEvent, shortcut?: string): boolean {
  if (!shortcut) return false;
  const norm = normalizeShortcutString(shortcut);
  const eventStr = formatKeyboardEventToShortcut(e);
  if (!eventStr) return false;
  return norm.toLowerCase() === eventStr.toLowerCase();
}

export function findShortcutConflicts(
  bindings: ShortcutBinding[],
  macros: RecordedMacro[] = []
): Map<string, string[]> {
  const byCombo = new Map<string, string[]>();
  for (const b of bindings) {
    for (const combo of [b.primary, b.secondary]) {
      if (!combo) continue;
      const key = normalizeShortcutString(combo).toLowerCase();
      if (!key) continue;
      const list = byCombo.get(key) || [];
      list.push(b.id);
      byCombo.set(key, list);
    }
  }
  for (const m of macros) {
    if (!m.shortcut) continue;
    const key = normalizeShortcutString(m.shortcut).toLowerCase();
    const list = byCombo.get(key) || [];
    list.push(`macro:${m.id}`);
    byCombo.set(key, list);
  }
  const conflicts = new Map<string, string[]>();
  for (const [combo, ids] of byCombo.entries()) {
    if (ids.length > 1) conflicts.set(combo, ids);
  }
  return conflicts;
}

export function serializeShortcutsExport(
  profile: ShortcutProfileId,
  bindings: ShortcutBinding[],
  macros: RecordedMacro[],
  format: 'json' | 'pcsshortcuts'
): string {
  return JSON.stringify(
    {
      format: format === 'pcsshortcuts' ? 'PixelClashShortcuts' : 'PixelClashShortcutsJSON',
      version: 1,
      profile,
      exportedAt: new Date().toISOString(),
      bindings,
      macros,
    },
    null,
    2
  );
}

export function parseShortcutsImport(raw: string): {
  profile?: ShortcutProfileId;
  bindings?: ShortcutBinding[];
  macros?: RecordedMacro[];
} | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.bindings)) return null;
    return {
      profile: parsed.profile,
      bindings: parsed.bindings,
      macros: Array.isArray(parsed.macros) ? parsed.macros : undefined,
    };
  } catch {
    return null;
  }
}
