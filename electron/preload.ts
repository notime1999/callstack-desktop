import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  
  // Platform info
  platform: process.platform,
  
  // Event listeners
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
    ipcRenderer.on('maximize-change', (_, isMaximized) => callback(isMaximized));
  }
});
