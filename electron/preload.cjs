const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('pixelClashDesktop', {
  platform: process.platform,
  version: '2.0.0',
  isNativeDesktop: true,
});
