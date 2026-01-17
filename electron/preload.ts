import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  
  // Platform info
  platform: process.platform,
  
  // Overlay controls
  toggleOverlay: (show: boolean) => {
    console.log('[Preload] Toggle overlay:', show);
    // Overlay is handled in-app, no IPC needed for now
    return Promise.resolve();
  },
  updateOverlay: (data: unknown) => {
    console.log('[Preload] Update overlay:', data);
    return Promise.resolve();
  },
  
  // Event listeners
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
    ipcRenderer.on('maximize-change', (_, isMaximized) => callback(isMaximized));
  },
  
  // Hotkey listeners (placeholder)
  onHotkey: (callback: (action: string) => void) => {
    ipcRenderer.on('hotkey', (_, action) => callback(action));
  },
  removeHotkeyListener: () => {
    ipcRenderer.removeAllListeners('hotkey');
  }
});
