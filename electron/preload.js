"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,
    // Window controls
    minimize: () => electron_1.ipcRenderer.invoke('window-minimize'),
    maximize: () => electron_1.ipcRenderer.invoke('window-maximize'),
    close: () => electron_1.ipcRenderer.invoke('window-close'),
    // Overlay
    toggleOverlay: (show) => electron_1.ipcRenderer.invoke('overlay-toggle', show),
    updateOverlay: (data) => electron_1.ipcRenderer.invoke('overlay-update', data),
    // Hotkey listeners
    onHotkey: (callback) => {
        electron_1.ipcRenderer.on('hotkey', (_, action) => callback(action));
    },
    removeHotkeyListener: () => {
        electron_1.ipcRenderer.removeAllListeners('hotkey');
    },
    // Overlay data receiver
    onOverlayData: (callback) => {
        electron_1.ipcRenderer.on('overlay-data', (_, data) => callback(data));
    }
});
