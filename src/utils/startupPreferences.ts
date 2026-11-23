import { StartupPreferences } from '../types';

// =============================================================================
// STARTUP PREFERENCES, LOADING TIPS & CUSTOM MASCOT STORAGE (IndexedDB)
// =============================================================================

export const STARTUP_PREFS_STORAGE_KEY = 'pixelclash_startup_preferences_v1';

export const DEFAULT_STARTUP_PREFERENCES: StartupPreferences = {
  showHomeScreen: true,
  showSplashAnimation: true,
  showSplashTips: true,
  splashMinDurationMs: 1500,
  startMaximized: false,
  mascotMode: 'builtin',
  mascotCustomName: undefined,
  mascotSheetCols: 4,
  mascotSheetRows: 1,
  mascotSheetFps: 10,
};

export interface StudioLoadingTip {
  category: 'Atajo' | 'Pixel Art' | 'Novedad' | 'Flujo';
  text: string;
}

export const STUDIO_LOADING_TIPS: StudioLoadingTip[] = [
  {
    category: 'Atajo',
    text: 'Mantén Espacio + arrastrar para mover el lienzo libremente; Ctrl + Rueda aplica zoom exacto al cursor.',
  },
  {
    category: 'Pixel Art',
    text: 'PixelClash Studio siempre abre spritesheets e imágenes con Nearest Neighbor 1:1 para conservar cada píxel original.',
  },
  {
    category: 'Novedad',
    text: 'Sin límites artificiales de resolución: el motor Tiled 256×256 procesa lienzos de 10,000×10,000 px o más bajo demanda.',
  },
  {
    category: 'Atajo',
    text: 'Pulsa Ctrl + O para abrir cualquier formato (PNG, GIF animado, WEBP, PSD, ASEPRITE, TGA, TIFF, BMP, ICO o PCS).',
  },
  {
    category: 'Flujo',
    text: 'Fija tus proyectos más importantes en Archivos Recientes para mantenerlos siempre arriba en la pantalla de inicio.',
  },
  {
    category: 'Pixel Art',
    text: 'Activa Pixel Perfect en el pincel para eliminar píxeles dobles en trazos diagonales y curvas limpias.',
  },
  {
    category: 'Novedad',
    text: 'Puedes subir tu propia mascota animada (GIF, WEBP animado o secuencia de sprites) desde Inicio → Configuración.',
  },
  {
    category: 'Atajo',
    text: 'Usa Alt + clic con el pincel para tomar color al instante con el cuentagotas sin cambiar de herramienta.',
  },
  {
    category: 'Flujo',
    text: 'En Ver → Rendimiento puedes alternar entre Calidad Máxima, Equilibrado y Rendimiento para maximizar FPS.',
  },
];

export const SPLASH_LOADING_STAGES: string[] = [
  'Inicializando herramientas...',
  'Cargando motores gráficos...',
  'Preparando workspace...',
];

export function loadStartupPreferences(): StartupPreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_STARTUP_PREFERENCES };
  try {
    const raw = window.localStorage.getItem(STARTUP_PREFS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STARTUP_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<StartupPreferences>;
    return {
      ...DEFAULT_STARTUP_PREFERENCES,
      ...parsed,
      splashMinDurationMs: Math.max(
        600,
        Math.min(5000, Number(parsed.splashMinDurationMs) || DEFAULT_STARTUP_PREFERENCES.splashMinDurationMs)
      ),
    };
  } catch {
    return { ...DEFAULT_STARTUP_PREFERENCES };
  }
}

export function saveStartupPreferences(prefs: StartupPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STARTUP_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota errors
  }
}

// =============================================================================
// INDEXEDDB PERSISTENCE FOR USER-UPLOADED MASCOT GIF / ANIMATED WEBP / SPRITESHEET
// =============================================================================
const MASCOT_DB_NAME = 'pixelclash_mascot_assets_v1';
const MASCOT_STORE_NAME = 'mascot';
const MASCOT_RECORD_KEY = 'active_mascot';

interface StoredMascotRecord {
  blob: Blob;
  name: string;
  mime: string;
  updatedAt: number;
}

function openMascotDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no disponible'));
      return;
    }
    const req = indexedDB.open(MASCOT_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(MASCOT_STORE_NAME)) {
        db.createObjectStore(MASCOT_STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Error abriendo IndexedDB de mascota'));
  });
}

export async function saveCustomMascotFile(file: File): Promise<{ name: string; mime: string }> {
  const db = await openMascotDb();
  const record: StoredMascotRecord = {
    blob: file,
    name: file.name,
    mime: file.type || 'image/gif',
    updatedAt: Date.now(),
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(MASCOT_STORE_NAME, 'readwrite');
    tx.objectStore(MASCOT_STORE_NAME).put(record, MASCOT_RECORD_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Error guardando mascota'));
  });
  db.close();
  return { name: record.name, mime: record.mime };
}

export async function loadCustomMascotBlob(): Promise<StoredMascotRecord | null> {
  try {
    const db = await openMascotDb();
    const result = await new Promise<StoredMascotRecord | null>((resolve, reject) => {
      const tx = db.transaction(MASCOT_STORE_NAME, 'readonly');
      const req = tx.objectStore(MASCOT_STORE_NAME).get(MASCOT_RECORD_KEY);
      req.onsuccess = () => resolve((req.result as StoredMascotRecord) || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}

export async function clearCustomMascotFile(): Promise<void> {
  try {
    const db = await openMascotDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(MASCOT_STORE_NAME, 'readwrite');
      tx.objectStore(MASCOT_STORE_NAME).delete(MASCOT_RECORD_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Checks if a user placed a static mascot file in /public/mascot.gif or /public/mascot.webp.
 */
export async function probePublicMascotAsset(): Promise<string | null> {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') return null;
  const candidates = ['./mascot.gif', './mascot.webp'];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (res.ok && (ct.includes('image/gif') || ct.includes('image/webp') || ct.includes('image/png'))) {
        return url;
      }
    } catch {
      // ignore
    }
  }
  return null;
}
