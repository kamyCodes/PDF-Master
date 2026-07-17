const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;
let pythonProcess;

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

function startPythonBackend() {
  const pythonScript = path.join(__dirname, '../python_engine/main.py');
  
  // In a real app, you'd want to check if python/python3 exists or use a bundled executable
  // We'll use 'python' for this MVP, assuming it's in the system PATH
  pythonProcess = spawn('python', [pythonScript, 'ping']); 
  // we just start it later per request or keep a server running. 
  // Actually, our CLI script is stateless. We just spawn it per request.
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'PDF Master 1.0',
    icon: path.join(__dirname, '../src/assets/logo.png'),
    titleBarStyle: 'hidden', // Allows customizing the title bar (which our Ribbon will cover)
    titleBarOverlay: {
      color: '#121214',
      symbolColor: '#ffffff',
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
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
    return { path: filePath, data: Array.from(data) };
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
