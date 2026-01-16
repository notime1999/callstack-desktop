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
// Setup logging - use exe directory for portable app
const logPath = electron_1.app.isPackaged
    ? path.join(path.dirname(process.execPath), 'app.log')
    : path.join(__dirname, '..', 'app.log');
let logStream = null;
function initLog() {
    try {
        logStream = fs.createWriteStream(logPath, { flags: 'a' });
        log(`Log initialized at: ${logPath}`);
    }
    catch (err) {
        console.error('Failed to create log file:', err);
    }
}
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    if (logStream) {
        logStream.write(logMessage);
    }
    console.log(logMessage.trim());
}
// Initialize log immediately
initLog();
// Configure auto-updater
electron_updater_1.autoUpdater.logger = {
    info: (msg) => log(`[AutoUpdater] INFO: ${msg}`),
    warn: (msg) => log(`[AutoUpdater] WARN: ${msg}`),
    error: (msg) => log(`[AutoUpdater] ERROR: ${msg}`),
    debug: (msg) => log(`[AutoUpdater] DEBUG: ${msg}`)
};
electron_updater_1.autoUpdater.autoDownload = false;
electron_updater_1.autoUpdater.autoInstallOnAppQuit = true;
// Catch uncaught exceptions
process.on('uncaughtException', (error) => {
    log(`UNCAUGHT EXCEPTION: ${error.message}\n${error.stack}`);
});
process.on('unhandledRejection', (reason) => {
    log(`UNHANDLED REJECTION: ${reason}`);
});
let mainWindow = null;
let overlayWindow = null;
const isDev = !electron_1.app.isPackaged;
log(`App starting - isDev: ${isDev}`);
log(`Exec path: ${process.execPath}`);
log(`__dirname: ${__dirname}`);
function createMainWindow() {
    log('Creating main window...');
    const { width, height } = electron_1.screen.getPrimaryDisplay().workAreaSize;
    log(`Screen size: ${width}x${height}`);
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        frame: false,
        titleBarStyle: 'hidden',
        backgroundColor: '#1a1a2e',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: true
        }
    });
    // Remove CSP restrictions for development
    if (isDev) {
        electron_1.session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
            callback({
                responseHeaders: {
                    ...details.responseHeaders,
                    'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' ws://localhost:* http://localhost:*; img-src 'self' data:;"]
                }
            });
        });
    }
    if (isDev) {
        log('Loading dev URL: http://localhost:4200');
        mainWindow.loadURL('http://localhost:4200');
        mainWindow.webContents.openDevTools();
    }
    else {
        const indexPath = path.join(__dirname, '../dist/index.html');
        log(`Loading production file: ${indexPath}`);
        log(`File exists: ${fs.existsSync(indexPath)}`);
        mainWindow.loadFile(indexPath);
    }
    mainWindow.webContents.on('did-finish-load', () => {
        log('Main window finished loading');
    });
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        log(`Main window failed to load: ${errorCode} - ${errorDescription}`);
    });
    mainWindow.on('closed', () => {
        log('Main window closed');
        mainWindow = null;
        overlayWindow?.close();
    });
}
function createOverlayWindow() {
    const { width } = electron_1.screen.getPrimaryDisplay().workAreaSize;
    overlayWindow = new electron_1.BrowserWindow({
        width: 300,
        height: 200,
        x: width - 320,
        y: 20,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        focusable: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });
    overlayWindow.setIgnoreMouseEvents(true);
    if (isDev) {
        overlayWindow.loadURL('http://localhost:4200/overlay');
    }
    else {
        overlayWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
            hash: '/overlay'
        });
    }
}
function registerGlobalHotkeys() {
    electron_1.globalShortcut.register('F1', () => {
        mainWindow?.webContents.send('hotkey', 'default-mode');
    });
    electron_1.globalShortcut.register('F2', () => {
        mainWindow?.webContents.send('hotkey', 'clutch-mode');
    });
    electron_1.globalShortcut.register('F3', () => {
        mainWindow?.webContents.send('hotkey', 'prep-mode');
    });
    // Push-to-talk (use Ctrl+Space to avoid blocking normal typing)
    electron_1.globalShortcut.register('Ctrl+Space', () => {
        mainWindow?.webContents.send('hotkey', 'ptt-start');
    });
    electron_1.globalShortcut.register('Ctrl+M', () => {
        mainWindow?.webContents.send('hotkey', 'toggle-mute');
    });
    electron_1.globalShortcut.register('Ctrl+D', () => {
        mainWindow?.webContents.send('hotkey', 'mark-dead');
    });
}
function unregisterGlobalHotkeys() {
    electron_1.globalShortcut.unregisterAll();
}
// IPC handlers
electron_1.ipcMain.handle('window-minimize', () => {
    mainWindow?.minimize();
});
electron_1.ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize();
    }
    else {
        mainWindow?.maximize();
    }
});
electron_1.ipcMain.handle('window-close', () => {
    mainWindow?.close();
});
electron_1.ipcMain.handle('overlay-toggle', (_, show) => {
    if (show && !overlayWindow) {
        createOverlayWindow();
    }
    else if (!show && overlayWindow) {
        overlayWindow.close();
        overlayWindow = null;
    }
});
electron_1.ipcMain.handle('overlay-update', (_, data) => {
    overlayWindow?.webContents.send('overlay-data', data);
});
// Auto-updater functions
function setupAutoUpdater() {
    log('[AutoUpdater] Setting up auto-updater');
    electron_updater_1.autoUpdater.on('checking-for-update', () => {
        log('[AutoUpdater] Checking for updates...');
    });
    electron_updater_1.autoUpdater.on('update-available', (info) => {
        log(`[AutoUpdater] Update available: ${info.version}`);
        electron_1.dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Aggiornamento Disponibile',
            message: `È disponibile una nuova versione (${info.version}).\n\nVuoi scaricarla e installarla?`,
            buttons: ['Sì, aggiorna', 'No, più tardi'],
            defaultId: 0,
            cancelId: 1
        }).then((result) => {
            if (result.response === 0) {
                log('[AutoUpdater] User accepted update, downloading...');
                electron_updater_1.autoUpdater.downloadUpdate();
            }
            else {
                log('[AutoUpdater] User declined update');
            }
        });
    });
    electron_updater_1.autoUpdater.on('update-not-available', () => {
        log('[AutoUpdater] No updates available');
    });
    electron_updater_1.autoUpdater.on('download-progress', (progress) => {
        log(`[AutoUpdater] Download progress: ${Math.round(progress.percent)}%`);
        mainWindow?.webContents.send('update-progress', progress.percent);
    });
    electron_updater_1.autoUpdater.on('update-downloaded', (info) => {
        log(`[AutoUpdater] Update downloaded: ${info.version}`);
        electron_1.dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Aggiornamento Pronto',
            message: `L'aggiornamento alla versione ${info.version} è stato scaricato.\n\nL'applicazione verrà riavviata per completare l'installazione.`,
            buttons: ['Riavvia ora', 'Riavvia più tardi'],
            defaultId: 0,
            cancelId: 1
        }).then((result) => {
            if (result.response === 0) {
                log('[AutoUpdater] User accepted restart, quitting and installing...');
                electron_updater_1.autoUpdater.quitAndInstall();
            }
        });
    });
    electron_updater_1.autoUpdater.on('error', (error) => {
        log(`[AutoUpdater] Error: ${error.message}`);
    });
}
function checkForUpdates() {
    if (!isDev) {
        log('[AutoUpdater] Checking for updates...');
        electron_updater_1.autoUpdater.checkForUpdates().catch((err) => {
            log(`[AutoUpdater] Failed to check for updates: ${err.message}`);
        });
    }
    else {
        log('[AutoUpdater] Skipping update check in dev mode');
    }
}
// App lifecycle
electron_1.app.whenReady().then(() => {
    log('App ready, creating main window');
    createMainWindow();
    registerGlobalHotkeys();
    // Setup and check for updates
    setupAutoUpdater();
    // Check for updates after 3 seconds (let the app start first)
    setTimeout(() => {
        checkForUpdates();
    }, 3000);
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    unregisterGlobalHotkeys();
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('will-quit', () => {
    unregisterGlobalHotkeys();
});
