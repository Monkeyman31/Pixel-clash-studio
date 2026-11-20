const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

function registerDesktopFileIpc() {
  ipcMain.handle('desktop:open-file-dialog', async (_event, options = {}) => {
    const res = await dialog.showOpenDialog(mainWindow || undefined, {
      title: options.title || 'Abrir archivo en PixelClash Studio',
      properties: options.multiple ? ['openFile', 'multiSelections'] : ['openFile'],
      filters: options.filters || [
        {
          name: 'Todos los formatos compatibles',
          extensions: [
            'pcs', 'ase', 'aseprite', 'psd', 'json',
            'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tif', 'tiff', 'tga', 'ico',
          ],
        },
        {
          name: 'Imágenes (PNG, JPG, WEBP, GIF, BMP, TIFF, TGA, ICO)',
          extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tif', 'tiff', 'tga', 'ico'],
        },
        {
          name: 'Pixel Art y Proyectos (PCS, ASE, ASEPRITE, PSD, JSON)',
          extensions: ['pcs', 'ase', 'aseprite', 'psd', 'json'],
        },
        { name: 'Todos los archivos', extensions: ['*'] },
      ],
    });

    if (res.canceled || !res.filePaths || res.filePaths.length === 0) {
      return { canceled: true, files: [] };
    }

    const files = [];
    for (const filePath of res.filePaths) {
      try {
        const stat = fs.statSync(filePath);
        const buf = fs.readFileSync(filePath);
        files.push({
          filePath,
          name: path.basename(filePath),
          size: stat.size,
          lastModified: stat.mtimeMs,
          bytes: new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength),
        });
      } catch (err) {
        return {
          canceled: false,
          error: `No se pudo leer "${filePath}": ${err.message}`,
          files: [],
        };
      }
    }
    return { canceled: false, files };
  });

  ipcMain.handle('desktop:check-file-exists', async (_event, filePath) => {
    if (!filePath || typeof filePath !== 'string') {
      return { exists: false };
    }
    try {
      const exists = fs.existsSync(filePath);
      if (!exists) return { exists: false };
      const stat = fs.statSync(filePath);
      return {
        exists: stat.isFile(),
        size: stat.size,
        lastModified: stat.mtimeMs,
      };
    } catch {
      return { exists: false };
    }
  });

  ipcMain.handle('desktop:read-file-at-path', async (_event, filePath) => {
    if (!filePath || typeof filePath !== 'string') {
      return { exists: false, error: 'Ruta de archivo inválida.' };
    }
    try {
      if (!fs.existsSync(filePath)) {
        return { exists: false };
      }
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) {
        return { exists: false, error: 'La ruta no corresponde a un archivo válido.' };
      }
      const buf = fs.readFileSync(filePath);
      return {
        exists: true,
        filePath,
        name: path.basename(filePath),
        size: stat.size,
        lastModified: stat.mtimeMs,
        bytes: new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength),
      };
    } catch (err) {
      return { exists: false, error: err.message };
    }
  });
}

function createWindow() {
  const icoCandidate = path.join(__dirname, '..', 'assets', 'pixelclash.ico');
  const pngCandidate = path.join(__dirname, '..', 'assets', 'pixelclash.png');
  const resolvedIcon =
    process.platform === 'win32'
      ? fs.existsSync(icoCandidate)
        ? icoCandidate
        : pngCandidate
      : fs.existsSync(pngCandidate)
      ? pngCandidate
      : icoCandidate;

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 680,
    title: 'PixelClash Studio',
    backgroundColor: '#0d0f14',
    icon: resolvedIcon,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

if (process.platform === 'win32') {
  app.setAppUserModelId('com.pixelclash.studio');
}

app.whenReady().then(() => {
  registerDesktopFileIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
