import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { autoUpdater } from 'electron-updater';

let mainWindow: BrowserWindow | null = null;

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

// Auto-updater configuration
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('checking-for-update', () => {
  log('[AutoUpdater] Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  log(`[AutoUpdater] Update available: ${info.version}`);
  if (mainWindow) {
    const { dialog } = require('electron');
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Aggiornamento disponibile',
      message: `È disponibile una nuova versione (${info.version}). Vuoi scaricarla?`,
      buttons: ['Scarica', 'Più tardi']
    }).then((result: { response: number }) => {
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
    const { dialog } = require('electron');
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Aggiornamento pronto',
      message: 'L\'aggiornamento è stato scaricato. L\'app si riavvierà per installarlo.',
      buttons: ['Riavvia ora', 'Più tardi']
    }).then((result: { response: number }) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  }
});

autoUpdater.on('error', (error) => {
  log(`[AutoUpdater] Error: ${error.message}`);
});

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

  // Load the app
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
    setTimeout(() => {
      log('Checking for updates...');
      autoUpdater.checkForUpdates().catch((err) => {
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
