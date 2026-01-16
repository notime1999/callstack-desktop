import { contextBridge, ipcRenderer } from 'electron';

export type HotkeyAction =
  | 'default-mode'
  | 'clutch-mode'
  | 'prep-mode'
  | 'ptt-start'
  | 'ptt-stop'
  | 'toggle-mute'
  | 'mark-dead';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  // Window controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),

  // Overlay
  toggleOverlay: (show: boolean) => ipcRenderer.invoke('overlay-toggle', show),
  updateOverlay: (data: unknown) => ipcRenderer.invoke('overlay-update', data),

  // Hotkey listeners
  onHotkey: (callback: (action: HotkeyAction) => void) => {
    ipcRenderer.on('hotkey', (_, action) => callback(action));
  },

  removeHotkeyListener: () => {
    ipcRenderer.removeAllListeners('hotkey');
  },

  // Overlay data receiver
  onOverlayData: (callback: (data: unknown) => void) => {
    ipcRenderer.on('overlay-data', (_, data) => callback(data));
  }
});

// Type declaration for window
declare global {
  interface Window {
    electronAPI: {
      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      close: () => Promise<void>;
      toggleOverlay: (show: boolean) => Promise<void>;
      updateOverlay: (data: unknown) => Promise<void>;
      onHotkey: (callback: (action: HotkeyAction) => void) => void;
      removeHotkeyListener: () => void;
      onOverlayData: (callback: (data: unknown) => void) => void;
    };
  }
}
