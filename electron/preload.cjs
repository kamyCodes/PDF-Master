const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile:    ()                      => ipcRenderer.invoke('dialog:openFile'),
  openFiles:   ()                      => ipcRenderer.invoke('dialog:openFiles'),
  openImages:  ()                      => ipcRenderer.invoke('dialog:openImages'),
  openOffice:  ()                      => ipcRenderer.invoke('dialog:openOffice'),
  saveFile:    (defaultName)           => ipcRenderer.invoke('dialog:saveFile', defaultName),
  readFile:    (filePath)              => ipcRenderer.invoke('file:read', filePath),
  copyFile:    (srcPath, destPath)     => ipcRenderer.invoke('file:copy', srcPath, destPath),
  getTempPath: (suffix)                => ipcRenderer.invoke('file:getTempPath', suffix),
  getPrinters: ()                      => ipcRenderer.invoke('os:getPrinters'),
  printSilent: (filePath, settings)    => ipcRenderer.invoke('os:printSilent', filePath, settings),
  runPython:   (action, args)          => ipcRenderer.invoke('python:run', action, args),
});
