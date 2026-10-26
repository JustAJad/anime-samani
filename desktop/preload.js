// SPDX-License-Identifier: MPL-2.0
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('samani', {
  bootstrap: () => ipcRenderer.invoke('samani:bootstrap'),
  navigate: route => ipcRenderer.invoke('samani:navigate', route),
  action: action => ipcRenderer.invoke('samani:action', action),
  panel: visible => ipcRenderer.invoke('samani:panel', visible),
  preferences: patch => ipcRenderer.invoke('samani:preferences', patch),
  update: action => ipcRenderer.invoke('samani:update', action),
  media: kind => ipcRenderer.invoke('samani:media', kind),
  domain: value => ipcRenderer.invoke('samani:domain', value),
  domains: () => ipcRenderer.invoke('samani:domains'),
  library: (action, url) => ipcRenderer.invoke('samani:library', action, url),
  bounds: bounds => ipcRenderer.send('samani:bounds', bounds),
  onCommand: callback => {
    const listener = (_event, command) => callback(command);
    ipcRenderer.on('samani:command', listener);
    return () => ipcRenderer.removeListener('samani:command', listener);
  },
  onState: callback => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('samani:state', listener);
    return () => ipcRenderer.removeListener('samani:state', listener);
  },
});
