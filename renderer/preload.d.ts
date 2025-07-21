import { IpcHandler, electronAPI } from '../main/preload';

declare global {
  interface Window {
    ipc: IpcHandler;
    electronAPI: electronAPI;
  }
}
