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
  Mousetrap.bind(['ctrl+r', 'f5'], e => {
    e.preventDefault();
    ipcRenderer.send('hotkey', 'ctrl+r');
  });
  Mousetrap.bind('ctrl+pageup', e => {
    e.preventDefault();
    ipcRenderer.send('hotkey', 'ctrl+pageup');
  });
  Mousetrap.bind('ctrl+pagedown', e => {
    e.preventDefault();
    ipcRenderer.send('hotkey', 'ctrl+pagedown');
  });
  Mousetrap.bind('alt+left', e => {
    e.preventDefault();
    ipcRenderer.send('hotkey', 'alt+left');
  });
  Mousetrap.bind('alt+right', e => {
    e.preventDefault();
    ipcRenderer.send('hotkey', 'alt+right');
  });

  Mousetrap.bind('f6', e => {
    e.preventDefault();
    ipcRenderer.send('hotkey', 'f6');
  });
  Mousetrap.bind('f11', e => {
    e.preventDefault();
    ipcRenderer.send('hotkey', 'f11');
  });
  Mousetrap.bind('f12', e => {
    e.preventDefault();
    ipcRenderer.send('hotkey', 'f12');
  });
});
