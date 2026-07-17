const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile:    ()                      => ipcRenderer.invoke('dialog:openFile'),
  openFiles:   ()                      => ipcRenderer.invoke('dialog:openFiles'),
  saveFile:    (defaultName)           => ipcRenderer.invoke('dialog:saveFile', defaultName),
  readFile:    (filePath)              => ipcRenderer.invoke('file:read', filePath),
  copyFile:    (srcPath, destPath)     => ipcRenderer.invoke('file:copy', srcPath, destPath),
  getTempPath: (suffix)                => ipcRenderer.invoke('file:getTempPath', suffix),
  runPython:   (action, args)          => ipcRenderer.invoke('python:run', action, args),
});
