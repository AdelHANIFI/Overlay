const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('adhanAPI', {
    onStateChange: (callback) => ipcRenderer.on('adhan-state', (_event, data) => callback(data))
});
