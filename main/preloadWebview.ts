import { contextBridge, ipcRenderer } from 'electron';

console.log('Preload Webview Loaded');

window.addEventListener('DOMContentLoaded', () => {
  const Mousetrap = require('mousetrap');

  Mousetrap.bind('ctrl+w', e => {
    e.preventDefault();
    ipcRenderer.send('hotkey', 'ctrl+w');
  });

  Mousetrap.bind('ctrl+t', e => {
    e.preventDefault();
    ipcRenderer.send('hotkey', 'ctrl+t');
  });

  Mousetrap.bind('f6', e => {
    e.preventDefault();
    ipcRenderer.send('hotkey', 'f6');
  });
});
