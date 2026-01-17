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
let mainWindow = null;
let autoUpdater = null;
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
// Try to load electron-updater
function initAutoUpdater() {
    try {
        // Try multiple paths for electron-updater
        let updaterModule;
        // Get the resources path (where extraResources are copied)
        const resourcesPath = process.resourcesPath || path.dirname(electron_1.app.getAppPath());
        log(`[AutoUpdater] Resources path: ${resourcesPath}`);
        const possiblePaths = [
            'electron-updater',
            path.join(resourcesPath, 'node_modules', 'electron-updater'),
            path.join(resourcesPath, 'node_modules', 'electron-updater', 'out', 'main.js'),
            path.join(__dirname, '..', 'node_modules', 'electron-updater'),
            path.join(electron_1.app.getAppPath(), '..', 'node_modules', 'electron-updater')
        ];
        for (const modulePath of possiblePaths) {
            try {
                updaterModule = require(modulePath);
                log(`[AutoUpdater] Module loaded from: ${modulePath}`);
                break;
            }
            catch (e) {
                log(`[AutoUpdater] Not found at: ${modulePath} - ${e.message}`);
            }
        }
        if (!updaterModule) {
            throw new Error('electron-updater not found in any path');
        }
        autoUpdater = updaterModule.autoUpdater;
        log('[AutoUpdater] Module loaded successfully');
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = true;
        autoUpdater.on('checking-for-update', () => {
            log('[AutoUpdater] Checking for updates...');
        });
        autoUpdater.on('update-available', (info) => {
            log(`[AutoUpdater] Update available: ${info.version}`);
            if (mainWindow) {
                electron_1.dialog.showMessageBox(mainWindow, {
                    type: 'info',
                    title: 'Aggiornamento disponibile',
                    message: `È disponibile una nuova versione (${info.version}). Vuoi scaricarla?`,
                    buttons: ['Scarica', 'Più tardi']
                }).then((result) => {
                    if (result.response === 0) {
                        autoUpdater.downloadUpdate();
                    }
                });
            }
        });
        autoUpdater.on('update-not-available', () => {
            log('[AutoUpdater] No updates available');
        });
        autoUpdater.on('download-progress', (progress) => {
            log(`[AutoUpdater] Download progress: ${progress.percent.toFixed(1)}%`);
        });
        autoUpdater.on('update-downloaded', (info) => {
            log(`[AutoUpdater] Update downloaded: ${info.version}`);
            if (mainWindow) {
                electron_1.dialog.showMessageBox(mainWindow, {
                    type: 'info',
                    title: 'Aggiornamento pronto',
                    message: 'L\'aggiornamento è stato scaricato. L\'app si riavvierà per installarlo.',
                    buttons: ['Riavvia ora', 'Più tardi']
                }).then((result) => {
                    if (result.response === 0) {
                        autoUpdater.quitAndInstall();
                    }
                });
            }
        });
        autoUpdater.on('error', (error) => {
            log(`[AutoUpdater] Error: ${error.message}`);
        });
        return true;
    }
    catch (err) {
        log(`[AutoUpdater] Module not available: ${err.message}`);
        return false;
    }
}
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
        if (autoUpdater) {
            setTimeout(() => {
                log('Checking for updates...');
                log('[AutoUpdater] Checking for updates...');
                autoUpdater.checkForUpdates().then((result) => {
                    log(`[AutoUpdater] Check result: ${JSON.stringify(result?.updateInfo || 'no info')}`);
                }).catch((err) => {
                    log(`[AutoUpdater] Check failed: ${err.message}`);
                });
            }, 3000);
        }
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
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
electron_1.ipcMain.handle('check-for-updates', async () => {
    if (!autoUpdater) {
        return { available: false, error: 'AutoUpdater not available' };
    }
    try {
        const result = await autoUpdater.checkForUpdates();
        return {
            available: result?.updateInfo?.version !== electron_1.app.getVersion(),
            version: result?.updateInfo?.version,
            currentVersion: electron_1.app.getVersion()
        };
    }
    catch (err) {
        return { available: false, error: err.message };
    }
});
// App lifecycle
electron_1.app.whenReady().then(() => {
    log('App ready');
    initAutoUpdater();
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
