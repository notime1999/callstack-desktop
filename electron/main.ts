import { app, BrowserWindow, globalShortcut, ipcMain, screen, session, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { autoUpdater } from 'electron-updater';

// Setup logging - use exe directory for portable app
const logPath = app.isPackaged 
  ? path.join(path.dirname(process.execPath), 'app.log')
  : path.join(__dirname, '..', 'app.log');

let logStream: fs.WriteStream | null = null;

function initLog(): void {
  try {
    logStream = fs.createWriteStream(logPath, { flags: 'a' });
    log(`Log initialized at: ${logPath}`);
  } catch (err) {
    console.error('Failed to create log file:', err);
  }
}

function log(message: string): void {
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
autoUpdater.logger = {
  info: (msg: unknown) => log(`[AutoUpdater] INFO: ${msg}`),
  warn: (msg: unknown) => log(`[AutoUpdater] WARN: ${msg}`),
  error: (msg: unknown) => log(`[AutoUpdater] ERROR: ${msg}`),
  debug: (msg: unknown) => log(`[AutoUpdater] DEBUG: ${msg}`)
};
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Catch uncaught exceptions
process.on('uncaughtException', (error) => {
  log(`UNCAUGHT EXCEPTION: ${error.message}\n${error.stack}`);
});

process.on('unhandledRejection', (reason) => {
  log(`UNHANDLED REJECTION: ${reason}`);
});

let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;

log(`App starting - isDev: ${isDev}`);
log(`Exec path: ${process.execPath}`);
log(`__dirname: ${__dirname}`);

function createMainWindow(): void {
  log('Creating main window...');
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  log(`Screen size: ${width}x${height}`);

  mainWindow = new BrowserWindow({
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
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
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
  } else {
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

function createOverlayWindow(): void {
  const { width } = screen.getPrimaryDisplay().workAreaSize;

  overlayWindow = new BrowserWindow({
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
  } else {
    overlayWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
      hash: '/overlay'
    });
  }
}

function registerGlobalHotkeys(): void {
  globalShortcut.register('F1', () => {
    mainWindow?.webContents.send('hotkey', 'default-mode');
  });

  globalShortcut.register('F2', () => {
    mainWindow?.webContents.send('hotkey', 'clutch-mode');
  });

  globalShortcut.register('F3', () => {
    mainWindow?.webContents.send('hotkey', 'prep-mode');
  });

  // Push-to-talk (use Ctrl+Space to avoid blocking normal typing)
  globalShortcut.register('Ctrl+Space', () => {
    mainWindow?.webContents.send('hotkey', 'ptt-start');
  });

  globalShortcut.register('Ctrl+M', () => {
    mainWindow?.webContents.send('hotkey', 'toggle-mute');
  });

  globalShortcut.register('Ctrl+D', () => {
    mainWindow?.webContents.send('hotkey', 'mark-dead');
  });
}

function unregisterGlobalHotkeys(): void {
  globalShortcut.unregisterAll();
}

// IPC handlers
ipcMain.handle('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window-close', () => {
  mainWindow?.close();
});

ipcMain.handle('overlay-toggle', (_, show: boolean) => {
  if (show && !overlayWindow) {
    createOverlayWindow();
  } else if (!show && overlayWindow) {
    overlayWindow.close();
    overlayWindow = null;
  }
});

ipcMain.handle('overlay-update', (_, data: unknown) => {
  overlayWindow?.webContents.send('overlay-data', data);
});

// Auto-updater functions
function setupAutoUpdater(): void {
  log('[AutoUpdater] Setting up auto-updater');

  autoUpdater.on('checking-for-update', () => {
    log('[AutoUpdater] Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    log(`[AutoUpdater] Update available: ${info.version}`);
    
    dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title: 'Aggiornamento Disponibile',
      message: `È disponibile una nuova versione (${info.version}).\n\nVuoi scaricarla e installarla?`,
      buttons: ['Sì, aggiorna', 'No, più tardi'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        log('[AutoUpdater] User accepted update, downloading...');
        autoUpdater.downloadUpdate();
      } else {
        log('[AutoUpdater] User declined update');
      }
    });
  });

  autoUpdater.on('update-not-available', () => {
    log('[AutoUpdater] No updates available');
  });

  autoUpdater.on('download-progress', (progress) => {
    log(`[AutoUpdater] Download progress: ${Math.round(progress.percent)}%`);
    mainWindow?.webContents.send('update-progress', progress.percent);
  });

  autoUpdater.on('update-downloaded', (info) => {
    log(`[AutoUpdater] Update downloaded: ${info.version}`);
    
    dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title: 'Aggiornamento Pronto',
      message: `L'aggiornamento alla versione ${info.version} è stato scaricato.\n\nL'applicazione verrà riavviata per completare l'installazione.`,
      buttons: ['Riavvia ora', 'Riavvia più tardi'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        log('[AutoUpdater] User accepted restart, quitting and installing...');
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.on('error', (error) => {
    log(`[AutoUpdater] Error: ${error.message}`);
  });
}

function checkForUpdates(): void {
  if (!isDev) {
    log('[AutoUpdater] Checking for updates...');
    autoUpdater.checkForUpdates().catch((err) => {
      log(`[AutoUpdater] Failed to check for updates: ${err.message}`);
    });
  } else {
    log('[AutoUpdater] Skipping update check in dev mode');
  }
}

// App lifecycle
app.whenReady().then(() => {
  log('App ready, creating main window');
  createMainWindow();
  registerGlobalHotkeys();
  
  // Setup and check for updates
  setupAutoUpdater();
  
  // Check for updates after 3 seconds (let the app start first)
  setTimeout(() => {
    checkForUpdates();
  }, 3000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  unregisterGlobalHotkeys();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  unregisterGlobalHotkeys();
});
