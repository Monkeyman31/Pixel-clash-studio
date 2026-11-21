/**
 * Persistent IndexedDB storage for Recent Projects in PixelClash Studio.
 * Replaces size-limited localStorage snapshot caching so multi-frame pixel art,
 * layers, palettes, raw opened files (Blob), and FileSystemFileHandles persist reliably
 * across reloads and sessions without QuotaExceededError truncation.
 */

const DB_NAME = 'pixelclash_recent_projects_db_v2';
const DB_VERSION = 1;
const STORE_NAME = 'recent_payloads';

export interface StoredRecentPayload<TSnapshot = unknown> {
  id: string;
  snapshot?: TSnapshot;
  fileBlob?: Blob;
  fileName?: string;
  fileMime?: string;
  fileLastModified?: number;
  /** Chromium FileSystemFileHandle (structured-cloneable in IndexedDB) */
  fileHandle?: FileSystemFileHandle;
  /** Real OS disk path when running inside native Rust/Tauri desktop app */
  diskPath?: string;
  updatedAt: number;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openRecentDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('[PixelClash RecentDB] No se pudo abrir IndexedDB:', request.error);
        resolve(null);
      };
    } catch (err) {
      console.warn('[PixelClash RecentDB] IndexedDB no disponible:', err);
      resolve(null);
    }
  });

  return dbPromise;
}

export async function saveRecentProjectPayload<TSnapshot = unknown>(
  payload: StoredRecentPayload<TSnapshot>
): Promise<boolean> {
  const db = await openRecentDb();
  if (!db) return false;

  return new Promise<boolean>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record: StoredRecentPayload<TSnapshot> = {
        ...payload,
        updatedAt: payload.updatedAt || Date.now(),
      };
      store.put(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => {
        console.warn('[PixelClash RecentDB] Error guardando proyecto reciente:', tx.error);
        resolve(false);
      };
    } catch (err) {
      // Fallback: if fileHandle cannot be structured-cloned in some browser, retry without it
      if (payload.fileHandle) {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const { fileHandle: _ignored, ...rest } = payload;
          store.put({ ...rest, updatedAt: rest.updatedAt || Date.now() });
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
          return;
        } catch {
          resolve(false);
          return;
        }
      }
      console.warn('[PixelClash RecentDB] Error inesperado al guardar:', err);
      resolve(false);
    }
  });
}

export async function getRecentProjectPayload<TSnapshot = unknown>(
  id: string
): Promise<StoredRecentPayload<TSnapshot> | null> {
  const db = await openRecentDb();
  if (!db) return null;

  return new Promise<StoredRecentPayload<TSnapshot> | null>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        resolve((req.result as StoredRecentPayload<TSnapshot> | undefined) || null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function deleteRecentProjectPayload(id: string): Promise<void> {
  const db = await openRecentDb();
  if (!db) return;

  return new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function pruneRecentProjectPayloads(keepIds: string[]): Promise<void> {
  const db = await openRecentDb();
  if (!db) return;
  const keepSet = new Set(keepIds);

  return new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const keysReq = store.getAllKeys();
      keysReq.onsuccess = () => {
        const keys = keysReq.result || [];
        for (const key of keys) {
          if (typeof key === 'string' && !keepSet.has(key)) {
            store.delete(key);
          }
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function clearAllRecentProjectPayloads(): Promise<void> {
  const db = await openRecentDb();
  if (!db) return;

  return new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
