import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

const handler = {
  send(channel: string, ...value: unknown[]) {
    ipcRenderer.send(channel, ...value);
  },
  on(channel: string, callback: (...args: unknown[]) => void) {
    const subscription = (_event: IpcRendererEvent, ...args: unknown[]) => callback(...args);
    ipcRenderer.on(channel, subscription);

    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },
  once(channel: string, callback: (...args: unknown[]) => void) {
    const subscription = (_event: IpcRendererEvent, ...args: unknown[]) => {
      ipcRenderer.removeListener(channel, subscription);
      callback(...args);
    };
    ipcRenderer.once(channel, subscription);
  },
  invoke(channel: string, ...args: unknown[]) {
    return ipcRenderer.invoke(channel, ...args);
  },
  removeAllListeners(channel: string) {
    ipcRenderer.removeAllListeners(channel);
  },
  removeListener(channel: string, listener: any) {
    ipcRenderer.removeListener(channel, listener);
  },
};

contextBridge.exposeInMainWorld('ipc', handler);

export type IpcHandler = typeof handler;

const electronAPIHandler = {
  createTab: (id: string, url: string) => ipcRenderer.send('create-tab', id, url),
  switchTab: (id: string) => ipcRenderer.send('switch-tab', id),
  loadURL: (id: string, url: string) => ipcRenderer.send('load-url', id, url),
  closeTab: (id: string) => ipcRenderer.send('close-tab', id),
};
contextBridge.exposeInMainWorld('electronAPI', electronAPIHandler);
export type electronAPI = typeof electronAPIHandler;
