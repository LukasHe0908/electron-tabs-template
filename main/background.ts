import path from 'path';
import { app, BrowserWindow, ipcMain, Menu, Rectangle, WebContentsView } from 'electron';
import serve from 'electron-serve';
import contextMenu from 'electron-context-menu';
import os from 'os';
import { createWindow } from './helpers';

const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
  serve({ directory: 'app' });
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

let mainWindow: BrowserWindow;
const tabViews = new Map<string, WebContentsView>();
let currentTabId: string | null = null;

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

  mainWindow = createWindow('main', {
    width: 1200,
    height: 800,
    show: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#eaeaed',
      symbolColor: '#000',
      height: 42,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
      webviewTag: true,
    },
  });

  mainWindow.loadURL(getProviderPath('/'));
  // mainWindow.loadURL(getProviderPath('/tabs.html'));

  mainWindow.webContents.on('did-fail-load', err => {
    console.log(err);
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
  mainWindow.on('resize', () => {
    if (currentTabId) {
      resizeContentView(currentTabId);
    }
  });
  mainWindow.webContents.on('did-attach-webview', (_event, webviewWebContents) => {
    contextMenu({
      ...contextMenuOptions,
      window: webviewWebContents, // 注入 webview 的 webContents
    });
  });
})();

// 计算内容区域位置（下方，排除地址栏高度）
function getContentBounds(): Rectangle {
  const [width, height] = mainWindow.getContentSize();
  return {
    x: 0,
    y: 80, // 地址栏高度
    width,
    height: height - 80,
  };
}

// 内容区域自动调整大小
function resizeContentView(id: string) {
  const view = tabViews.get(id);
  if (view) {
    view.setBounds(getContentBounds());
  }
}

function contentBounds(): Rectangle {
  const [w, h] = mainWindow.getContentSize();
  return { x: 0, y: 80, width: w, height: h - 80 }; // 上方 80px 留给 navbar
}

ipcMain.handle('getProviderPath', (e, path: string) => {
  return getProviderPath(path);
});

ipcMain.on('create-tab', (e, id: string, url: string) => {
  const view = new WebContentsView();
  view.webContents.loadURL(url);
  view.setBounds(contentBounds());
  mainWindow.contentView.addChildView(view); // ✅ 添加到主窗体
  tabViews.set(id, view);

  if (!currentTabId) {
    currentTabId = id;
    view.setBounds(contentBounds());
  }
});

ipcMain.on('switch-tab', (e, id: string) => {
  const view = tabViews.get(id);
  if (view) {
    mainWindow.contentView.removeChildView(view); // 确保层级正确
    mainWindow.contentView.addChildView(view); // 抬到顶部
    view.setBounds(contentBounds());
    currentTabId = id;
  }
});

ipcMain.on('close-tab', (e, id: string) => {
  const view = tabViews.get(id);
  if (view) {
    mainWindow.contentView.removeChildView(view);
    (view.webContents as any).destroy();
    tabViews.delete(id);
    if (currentTabId === id) {
      const next = tabViews.keys().next().value;
      if (next) ipcMain.emit('switch-tab', e, next);
      else currentTabId = null;
    }
  }
});

ipcMain.on('load-url', (e, id: string, url: string) => {
  const view = tabViews.get(id);
  view?.webContents.loadURL(url);
});

app.on('window-all-closed', () => {
  app.quit();
});
