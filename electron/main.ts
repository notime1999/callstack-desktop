import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let autoUpdater: any = null;

// Logging setup
const logPath = path.join(app.getPath('userData'), 'logs');
if (!fs.existsSync(logPath)) {
  fs.mkdirSync(logPath, { recursive: true });
}
const logFile = path.join(logPath, `app-${new Date().toISOString().split('T')[0]}.log`);

function log(message: string) {
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
    const resourcesPath = process.resourcesPath || path.dirname(app.getAppPath());
    log(`[AutoUpdater] Resources path: ${resourcesPath}`);
    
    const possiblePaths = [
      'electron-updater',
      path.join(resourcesPath, 'node_modules', 'electron-updater'),
      path.join(resourcesPath, 'node_modules', 'electron-updater', 'out', 'main.js'),
      path.join(__dirname, '..', 'node_modules', 'electron-updater'),
      path.join(app.getAppPath(), '..', 'node_modules', 'electron-updater')
    ];
    
    for (const modulePath of possiblePaths) {
      try {
        updaterModule = require(modulePath);
        log(`[AutoUpdater] Module loaded from: ${modulePath}`);
        break;
      } catch (e: any) {
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

    autoUpdater.on('update-available', (info: any) => {
      log(`[AutoUpdater] Update available: ${info.version}`);
      if (mainWindow) {
        dialog.showMessageBox(mainWindow, {
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

    autoUpdater.on('download-progress', (progress: any) => {
      log(`[AutoUpdater] Download progress: ${progress.percent.toFixed(1)}%`);
    });

    autoUpdater.on('update-downloaded', (info: any) => {
      log(`[AutoUpdater] Update downloaded: ${info.version}`);
      if (mainWindow) {
        dialog.showMessageBox(mainWindow, {
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

    autoUpdater.on('error', (error: any) => {
      log(`[AutoUpdater] Error: ${error.message}`);
    });

    return true;
  } catch (err: any) {
    log(`[AutoUpdater] Module not available: ${err.message}`);
    return false;
  }
}

function createWindow() {
  log('Creating main window...');
  
  mainWindow = new BrowserWindow({
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

  const isDev = !app.isPackaged;
  
  if (isDev) {
    log('Running in development mode');
    mainWindow.loadURL('http://localhost:4200');
    mainWindow.webContents.openDevTools();
  } else {
    log('Running in production mode');
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    log(`Loading: ${indexPath}`);
    mainWindow.loadFile(indexPath);
    
    // Check for updates after 3 seconds
    if (autoUpdater) {
      setTimeout(() => {
        log('Checking for updates...');
        log('[AutoUpdater] Checking for updates...');
        autoUpdater.checkForUpdates().then((result: any) => {
          log(`[AutoUpdater] Check result: ${JSON.stringify(result?.updateInfo || 'no info')}`);
        }).catch((err: any) => {
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
ipcMain.on('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window-close', () => {
  mainWindow?.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow?.isMaximized() || false;
});

// App lifecycle
app.whenReady().then(() => {
  log('App ready');
  initAutoUpdater();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  log('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  log('App quitting...');
});
