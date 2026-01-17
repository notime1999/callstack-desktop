"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Window controls
    minimize: () => electron_1.ipcRenderer.send('window-minimize'),
    maximize: () => electron_1.ipcRenderer.send('window-maximize'),
    close: () => electron_1.ipcRenderer.send('window-close'),
    isMaximized: () => electron_1.ipcRenderer.invoke('window-is-maximized'),
    checkForUpdates: () => electron_1.ipcRenderer.invoke('check-for-updates'),
    // Platform info
    platform: process.platform,
    // Overlay controls
    toggleOverlay: (show) => {
        console.log('[Preload] Toggle overlay:', show);
        // Overlay is handled in-app, no IPC needed for now
        return Promise.resolve();
    },
    updateOverlay: (data) => {
        console.log('[Preload] Update overlay:', data);
        return Promise.resolve();
    },
    // Event listeners
    onMaximizeChange: (callback) => {
        electron_1.ipcRenderer.on('maximize-change', (_, isMaximized) => callback(isMaximized));
    },
    // Hotkey listeners (placeholder)
    onHotkey: (callback) => {
        electron_1.ipcRenderer.on('hotkey', (_, action) => callback(action));
    },
    removeHotkeyListener: () => {
        electron_1.ipcRenderer.removeAllListeners('hotkey');
    }
});
