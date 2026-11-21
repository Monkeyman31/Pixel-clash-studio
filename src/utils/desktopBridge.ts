export interface DesktopOpenFilePayload {
  filePath: string;
  name: string;
  size: number;
  lastModified: number;
  bytes: Uint8Array;
}

export interface PixelClashDesktopBridge {
  platform?: string;
  version?: string;
  runtime?: 'tauri-rust' | 'web';
  isNativeDesktop?: boolean;
  openFileDialog?: (options?: {
    title?: string;
    multiple?: boolean;
    filters?: Array<{ name: string; extensions: string[] }>;
  }) => Promise<{
    canceled: boolean;
    error?: string;
    files: DesktopOpenFilePayload[];
  }>;
  checkFileExists?: (filePath: string) => Promise<{
    exists: boolean;
    size?: number;
    lastModified?: number;
  }>;
  readFileAtPath?: (filePath: string) => Promise<{
    exists: boolean;
    filePath?: string;
    name?: string;
    size?: number;
    lastModified?: number;
    bytes?: Uint8Array;
    error?: string;
  }>;
  readClipboardImage?: () => Promise<{
    hasImage: boolean;
    pngBytes?: Uint8Array | number[];
    width?: number;
    height?: number;
    error?: string;
  }>;
  writeClipboardImage?: (pngBytes: Uint8Array) => Promise<{ ok: boolean; error?: string }>;
  setUnsavedState?: (hasUnsaved: boolean) => Promise<{ ok: boolean }> | void;
  onRequestAppClose?: (cb: () => void) => () => void;
  confirmAppClose?: () => Promise<{ ok: boolean }> | void;
  windowMinimize?: () => Promise<{ ok: boolean }>;
  windowToggleMaximize?: () => Promise<{ maximized: boolean }>;
  isWindowMaximized?: () => Promise<{ maximized: boolean }>;
  windowClose?: () => Promise<{ ok: boolean }>;
  startWindowDragging?: () => Promise<{ ok: boolean }> | void;
  onWindowMaximizeChange?: (cb: (isMax: boolean) => void) => () => void;
}

interface TauriGlobalLike {
  core?: {
    invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
  };
  event?: {
    listen: <T = unknown>(
      eventName: string,
      handler: (event: { payload: T }) => void
    ) => Promise<() => void>;
  };
  window?: {
    getCurrentWindow?: () => {
      startDragging?: () => Promise<void>;
    };
  };
}

interface TauriInternalsLike {
  invoke?: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
}

function getTauriGlobal(): TauriGlobalLike | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { __TAURI__?: TauriGlobalLike };
  return w.__TAURI__ || null;
}

function getTauriInternals(): TauriInternalsLike | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { __TAURI_INTERNALS__?: TauriInternalsLike };
  return w.__TAURI_INTERNALS__ || null;
}

export function isRustTauriRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(getTauriInternals()?.invoke || getTauriGlobal()?.core?.invoke);
}

async function tauriInvoke<T = unknown>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T> {
  const tauri = getTauriGlobal();
  if (tauri?.core?.invoke) {
    return tauri.core.invoke<T>(cmd, args);
  }
  const internals = getTauriInternals();
  if (internals?.invoke) {
    return internals.invoke<T>(cmd, args);
  }
  throw new Error('Runtime Rust/Tauri no disponible.');
}

function listenTauriEvent<T = unknown>(
  eventName: string,
  handler: (payload: T) => void
): () => void {
  const tauri = getTauriGlobal();
  if (!tauri?.event?.listen) {
    return () => {};
  }
  let disposed = false;
  let unlistenFn: (() => void) | null = null;
  void tauri.event
    .listen<T>(eventName, (evt) => {
      if (!disposed) handler(evt.payload);
    })
    .then((fn) => {
      if (disposed) {
        fn();
      } else {
        unlistenFn = fn;
      }
    })
    .catch(() => {
      // Event listener setup ignored outside Tauri
    });

  return () => {
    disposed = true;
    if (unlistenFn) {
      unlistenFn();
      unlistenFn = null;
    }
  };
}

function toUint8Array(raw: unknown): Uint8Array {
  if (raw instanceof Uint8Array) return raw;
  if (Array.isArray(raw)) return new Uint8Array(raw);
  if (raw instanceof ArrayBuffer) return new Uint8Array(raw);
  return new Uint8Array(0);
}

let cachedTauriBridge: PixelClashDesktopBridge | null = null;

export function createTauriRustDesktopBridge(): PixelClashDesktopBridge {
  if (cachedTauriBridge) return cachedTauriBridge;

  const platform =
    typeof navigator !== 'undefined' && /win/i.test(navigator.userAgent || '')
      ? 'win32'
      : typeof navigator !== 'undefined' && /mac/i.test(navigator.userAgent || '')
      ? 'darwin'
      : 'linux';

  cachedTauriBridge = {
    platform,
    version: '2.0.0',
    runtime: 'tauri-rust',
    isNativeDesktop: true,
    openFileDialog: async (options) => {
      const res = await tauriInvoke<{
        canceled: boolean;
        error?: string | null;
        files: Array<{
          filePath: string;
          name: string;
          size: number;
          lastModified: number;
          bytes: number[] | Uint8Array;
        }>;
      }>('open_file_dialog', { options: options || {} });

      return {
        canceled: Boolean(res?.canceled),
        error: res?.error || undefined,
        files: (res?.files || []).map((f) => ({
          filePath: f.filePath,
          name: f.name,
          size: f.size,
          lastModified: f.lastModified,
          bytes: toUint8Array(f.bytes),
        })),
      };
    },
    checkFileExists: async (filePath) => {
      return tauriInvoke<{ exists: boolean; size?: number; lastModified?: number }>(
        'check_file_exists',
        { filePath }
      );
    },
    readFileAtPath: async (filePath) => {
      const res = await tauriInvoke<{
        exists: boolean;
        filePath?: string | null;
        name?: string | null;
        size?: number | null;
        lastModified?: number | null;
        bytes?: number[] | Uint8Array | null;
        error?: string | null;
      }>('read_file_at_path', { filePath });

      return {
        exists: Boolean(res?.exists),
        filePath: res?.filePath || undefined,
        name: res?.name || undefined,
        size: typeof res?.size === 'number' ? res.size : undefined,
        lastModified: typeof res?.lastModified === 'number' ? res.lastModified : undefined,
        bytes: res?.bytes ? toUint8Array(res.bytes) : undefined,
        error: res?.error || undefined,
      };
    },
    readClipboardImage: async () => {
      const res = await tauriInvoke<{
        hasImage: boolean;
        pngBytes?: number[] | Uint8Array | null;
        width?: number | null;
        height?: number | null;
        error?: string | null;
      }>('read_clipboard_image');

      return {
        hasImage: Boolean(res?.hasImage),
        pngBytes: res?.pngBytes ? toUint8Array(res.pngBytes) : undefined,
        width: typeof res?.width === 'number' ? res.width : undefined,
        height: typeof res?.height === 'number' ? res.height : undefined,
        error: res?.error || undefined,
      };
    },
    writeClipboardImage: async (pngBytes) => {
      return tauriInvoke<{ ok: boolean; error?: string }>('write_clipboard_image', {
        pngBytes: Array.from(pngBytes),
      });
    },
    setUnsavedState: async (hasUnsaved) => {
      return tauriInvoke<{ ok: boolean }>('set_unsaved_state', {
        hasUnsaved: Boolean(hasUnsaved),
      });
    },
    onRequestAppClose: (cb) => {
      return listenTauriEvent('desktop:request-app-close', () => cb());
    },
    confirmAppClose: async () => {
      return tauriInvoke<{ ok: boolean }>('confirm_app_close');
    },
    windowMinimize: async () => {
      return tauriInvoke<{ ok: boolean }>('window_minimize');
    },
    windowToggleMaximize: async () => {
      return tauriInvoke<{ maximized: boolean }>('window_toggle_maximize');
    },
    isWindowMaximized: async () => {
      return tauriInvoke<{ maximized: boolean }>('window_is_maximized');
    },
    windowClose: async () => {
      return tauriInvoke<{ ok: boolean }>('window_close');
    },
    startWindowDragging: async () => {
      const tauriWin = getTauriGlobal()?.window?.getCurrentWindow?.();
      if (tauriWin?.startDragging) {
        await tauriWin.startDragging();
        return { ok: true };
      }
      return tauriInvoke<{ ok: boolean }>('window_start_dragging');
    },
    onWindowMaximizeChange: (cb) => {
      return listenTauriEvent<boolean>('desktop:window-maximize-change', (isMax) =>
        cb(Boolean(isMax))
      );
    },
  };

  return cachedTauriBridge;
}

export function initDesktopBridge(): PixelClashDesktopBridge | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { pixelClashDesktop?: PixelClashDesktopBridge };
  if (w.pixelClashDesktop) {
    return w.pixelClashDesktop;
  }
  if (isRustTauriRuntime()) {
    const bridge = createTauriRustDesktopBridge();
    w.pixelClashDesktop = bridge;
    return bridge;
  }
  return null;
}

export function getDesktopBridge(): PixelClashDesktopBridge | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { pixelClashDesktop?: PixelClashDesktopBridge };
  if (w.pixelClashDesktop) return w.pixelClashDesktop;
  if (isRustTauriRuntime()) {
    return initDesktopBridge();
  }
  return null;
}
