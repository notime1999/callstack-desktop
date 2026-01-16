"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Window controls
    minimizeWindow: () => electron_1.ipcRenderer.send('window-minimize'),
    maximizeWindow: () => electron_1.ipcRenderer.send('window-maximize'),
    closeWindow: () => electron_1.ipcRenderer.send('window-close'),
    isMaximized: () => electron_1.ipcRenderer.invoke('window-is-maximized'),
    // Platform info
    platform: process.platform,
    // Event listeners
    onMaximizeChange: (callback) => {
        electron_1.ipcRenderer.on('maximize-change', (_, isMaximized) => callback(isMaximized));
    }
});
