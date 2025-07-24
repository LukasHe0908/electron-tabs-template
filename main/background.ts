import path from 'path';
import { app, BrowserWindow, ipcMain, Menu, nativeTheme } from 'electron';
import serve from 'electron-serve';
import contextMenu from 'electron-context-menu';
import os from 'os';
import log from 'electron-log';
import { createWindow } from './helpers';

const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
  serve({ directory: 'build/app' });
} else {
  app.setPath('userData', path.join(process.cwd(), '.data'));
}

Menu.setApplicationMenu(null);
const contextMenuOptions = {
  showSearchWithGoogle: false,
  showCopyLink: true,
  showLearnSpelling: true,
  showLookUpSelection: true,
  labels: {
    cut: '剪切',
    copy: '复制',
    paste: '粘贴',
    selectAll: '全选',
    copyImage: '复制图像',
    inspect: '检查',
  },
};

function getProviderPath(params: string) {
  if (isProd) {
    return `app://-${params}`;
  } else {
    const port = process.argv[2];
    return `http://localhost:${port}${params}`;
  }
}
function getOverlayStyle() {
  const isDark = nativeTheme.shouldUseDarkColors;
  return {
    color: isDark ? '#1f1e25' : '#eaeaed',
    symbolColor: isDark ? '#fff' : '#000',
    height: 42,
  };
}

let mainWindow: BrowserWindow;

(async () => {
  await app.whenReady();

  contextMenu(contextMenuOptions);

  // 创建 splash 窗口
  let splashWindow = new BrowserWindow({
    width: 400,
    height: 200,
    alwaysOnTop: true,
    transparent: true,
  });

  splashWindow.loadURL(getProviderPath('/splashScreen.html'));
  splashWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.log('💥 did-fail-load:');
    console.log('  URL:', validatedURL);
    console.log('  Error Code:', errorCode);
    console.log('  Description:', errorDescription);
    console.log('  Is Main Frame:', isMainFrame);

    log.error('splashWindow load fail', {
      url: validatedURL,
      code: errorCode,
      message: errorDescription,
      mainFrame: isMainFrame,
    });
  });

  mainWindow = createWindow('main', {
    width: 1200,
    height: 800,
    show: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: getOverlayStyle(),
    roundedCorners: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
      webviewTag: true,
    },
  });

  // 响应主题变化，更新 overlay 样式
  nativeTheme.on('updated', () => {
    mainWindow?.setTitleBarOverlay(getOverlayStyle());
  });

  mainWindow.loadURL(getProviderPath('/'));

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.log('💥 did-fail-load:');
    console.log('  URL:', validatedURL);
    console.log('  Error Code:', errorCode);
    console.log('  Description:', errorDescription);
    console.log('  Is Main Frame:', isMainFrame);

    log.error('splashWindow load fail', {
      url: validatedURL,
      code: errorCode,
      message: errorDescription,
      mainFrame: isMainFrame,
    });
  });

  // 页面加载完成后关闭 splash，显示主窗口
  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
    if (!isProd) {
      // mainWindow.webContents.openDevTools();
    }
  });
  mainWindow.webContents.on('did-attach-webview', (_event, webviewWebContents) => {
    contextMenu({
      ...contextMenuOptions,
      window: webviewWebContents, // 注入 webview 的 webContents
    });
  });
})();

ipcMain.handle('getProviderPath', (e, path: string) => {
  return getProviderPath(path);
});
ipcMain.handle('getDirname', e => {
  return __dirname;
});

app.on('window-all-closed', () => {
  app.quit();
});
