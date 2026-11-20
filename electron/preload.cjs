const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pixelClashDesktop', {
  platform: process.platform,
  version: '2.0.0',
  isNativeDesktop: true,
  openFileDialog: (options) => ipcRenderer.invoke('desktop:open-file-dialog', options),
  checkFileExists: (filePath) => ipcRenderer.invoke('desktop:check-file-exists', filePath),
  readFileAtPath: (filePath) => ipcRenderer.invoke('desktop:read-file-at-path', filePath),
});
