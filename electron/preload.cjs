const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile:   ()                      => ipcRenderer.invoke('dialog:openFile'),
  openFiles:  ()                      => ipcRenderer.invoke('dialog:openFiles'),
  saveFile:   (defaultName)           => ipcRenderer.invoke('dialog:saveFile', defaultName),
  readFile:   (filePath)              => ipcRenderer.invoke('file:read', filePath),
  runPython:  (action, args)          => ipcRenderer.invoke('python:run', action, args),
});
