"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const electron_updater_1 = require("electron-updater");
let mainWindow = null;
// Logging setup
const logPath = path.join(electron_1.app.getPath('userData'), 'logs');
if (!fs.existsSync(logPath)) {
    fs.mkdirSync(logPath, { recursive: true });
}
const logFile = path.join(logPath, `app-${new Date().toISOString().split('T')[0]}.log`);
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(message);
    fs.appendFileSync(logFile, logMessage);
}
// Auto-updater configuration
electron_updater_1.autoUpdater.autoDownload = false;
electron_updater_1.autoUpdater.autoInstallOnAppQuit = true;
electron_updater_1.autoUpdater.on('checking-for-update', () => {
    log('[AutoUpdater] Checking for updates...');
});
electron_updater_1.autoUpdater.on('update-available', (info) => {
    log(`[AutoUpdater] Update available: ${info.version}`);
    if (mainWindow) {
        const { dialog } = require('electron');
        dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Aggiornamento disponibile',
            message: `È disponibile una nuova versione (${info.version}). Vuoi scaricarla?`,
            buttons: ['Scarica', 'Più tardi']
        }).then((result) => {
            if (result.response === 0) {
                electron_updater_1.autoUpdater.downloadUpdate();
            }
        });
    }
});
electron_updater_1.autoUpdater.on('update-not-available', () => {
    log('[AutoUpdater] No updates available');
});
electron_updater_1.autoUpdater.on('download-progress', (progress) => {
    log(`[AutoUpdater] Download progress: ${progress.percent.toFixed(1)}%`);
});
electron_updater_1.autoUpdater.on('update-downloaded', (info) => {
    log(`[AutoUpdater] Update downloaded: ${info.version}`);
    if (mainWindow) {
        const { dialog } = require('electron');
        dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Aggiornamento pronto',
            message: 'L\'aggiornamento è stato scaricato. L\'app si riavvierà per installarlo.',
            buttons: ['Riavvia ora', 'Più tardi']
        }).then((result) => {
            if (result.response === 0) {
                electron_updater_1.autoUpdater.quitAndInstall();
            }
        });
    }
});
electron_updater_1.autoUpdater.on('error', (error) => {
    log(`[AutoUpdater] Error: ${error.message}`);
});
function createWindow() {
    log('Creating main window...');
    mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        frame: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        backgroundColor: '#1a1a2e'
    });
    // Load the app
    const isDev = !electron_1.app.isPackaged;
    if (isDev) {
        log('Running in development mode');
        mainWindow.loadURL('http://localhost:4200');
        mainWindow.webContents.openDevTools();
    }
    else {
        log('Running in production mode');
        const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
        log(`Loading: ${indexPath}`);
        mainWindow.loadFile(indexPath);
        // Check for updates after 3 seconds
        setTimeout(() => {
            log('Checking for updates...');
            electron_updater_1.autoUpdater.checkForUpdates().catch((err) => {
                log(`[AutoUpdater] Check failed: ${err.message}`);
            });
        }, 3000);
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    // Log any load errors
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        log(`Failed to load: ${errorCode} - ${errorDescription}`);
    });
    mainWindow.webContents.on('did-finish-load', () => {
        log('Page loaded successfully');
    });
}
// IPC handlers for window controls
electron_1.ipcMain.on('window-minimize', () => {
    mainWindow?.minimize();
});
electron_1.ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize();
    }
    else {
        mainWindow?.maximize();
    }
});
electron_1.ipcMain.on('window-close', () => {
    mainWindow?.close();
});
electron_1.ipcMain.handle('window-is-maximized', () => {
    return mainWindow?.isMaximized() || false;
});
// App lifecycle
electron_1.app.whenReady().then(() => {
    log('App ready');
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    log('All windows closed');
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('before-quit', () => {
    log('App quitting...');
});
