const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
const scratchDir = path.join(__dirname, '../scratch');

// Prepare scratch directory
function setupScratchDir() {
  try {
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    } else {
      // Clean up old pdfs in scratch
      const files = fs.readdirSync(scratchDir);
      for (const file of files) {
        if (file.endsWith('.pdf')) {
          try {
            fs.unlinkSync(path.join(scratchDir, file));
          } catch (e) {
            console.error('Could not delete old temp file:', file);
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to setup scratch dir:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'PDF Master 1.0',
    icon: path.join(__dirname, '../src/assets/logo.png'),
    titleBarStyle: 'hidden', // Allows custom title bar (Vite dev server or React will style)
    titleBarOverlay: {
      color: '#1e1e24',
      symbolColor: '#ffffff',
      height: 48,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  // Open devtools in development mode
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools if needed:
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  setupScratchDir();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- IPC Handlers ---

// Open File dialog
ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    defaultPath: app.getPath('documents'),
    filters: [{ name: 'PDFs', extensions: ['pdf'] }]
  });
  if (canceled || !filePaths[0]) return null;

  const filePath = filePaths[0];
  try {
    const data = fs.readFileSync(filePath);
    // Create working copy in scratch dir
    const workingName = `active_${Date.now()}.pdf`;
    const workingPath = path.join(scratchDir, workingName);
    fs.writeFileSync(workingPath, data);

    return { 
      path: filePath, 
      workingPath: workingPath, 
      data: Array.from(data) 
    };
  } catch (err) {
    console.error('Error reading PDF file:', err);
    return { path: filePath, data: null, error: err.message };
  }
});

// Open multiple files (for merge)
ipcMain.handle('dialog:openFiles', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    defaultPath: app.getPath('documents'),
    filters: [{ name: 'PDFs', extensions: ['pdf'] }]
  });
  if (canceled || filePaths.length === 0) return null;
  return filePaths;
});

// Save As dialog
ipcMain.handle('dialog:saveFile', async (event, defaultName) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: path.join(app.getPath('documents'), defaultName || 'output.pdf'),
    filters: [{ name: 'PDFs', extensions: ['pdf'] }]
  });
  if (canceled || !filePath) return null;
  return filePath;
});

// Read file directly (e.g. after edit or merge to update view)
ipcMain.handle('file:read', async (event, filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    return { path: filePath, data: Array.from(data) };
  } catch (err) {
    console.error('Error reading PDF file directly:', err);
    return { path: filePath, data: null, error: err.message };
  }
});

// Copy file (to commit scratch temp file back to original file for Save/Save As)
ipcMain.handle('file:copy', async (event, srcPath, destPath) => {
  try {
    // Ensure parent dir of destination exists
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(srcPath, destPath);
    return { status: 'success' };
  } catch (err) {
    console.error('Error copying file:', err);
    return { status: 'error', message: err.message };
  }
});

// Get temp path in scratch folder
ipcMain.handle('file:getTempPath', async (event, suffix) => {
  const tempName = `temp_${Date.now()}_${suffix || 'output'}.pdf`;
  return path.join(scratchDir, tempName);
});

// Generic handler for python backend commands
ipcMain.handle('python:run', async (event, action, args) => {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '../python_engine/main.py');
    const processArgs = [pythonScript, action, ...args];
    
    const py = spawn('python', processArgs);
    let output = '';
    let errorOutput = '';

    py.stdout.on('data', (data) => {
      output += data.toString();
    });

    py.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    py.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python process exited with code ${code}: ${errorOutput}`);
        resolve({ status: 'error', message: errorOutput });
      } else {
        try {
          const result = JSON.parse(output);
          resolve(result);
        } catch (e) {
          resolve({ status: 'error', message: 'Failed to parse python output: ' + output });
        }
      }
    });
  });
});
