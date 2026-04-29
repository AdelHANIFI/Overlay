const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('adhanAPI', {
    onStateChange: (callback) => ipcRenderer.on('adhan-state', (_event, data) => callback(data)),
    onOpenPrompt: (callback) => ipcRenderer.on('open-city-prompt', callback),
    onForceHide: (callback) => ipcRenderer.on('force-hide-frame', callback),
    submitCity: (city) => ipcRenderer.invoke('submit-city', city),
    closePrompt: () => ipcRenderer.send('close-prompt')
});
