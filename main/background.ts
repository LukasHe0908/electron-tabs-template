/* background.ts */
import path from 'path';
import { app, BrowserWindow, ipcMain, Menu, nativeTheme, webContents, WebContentsView } from 'electron';
import serve from 'electron-serve';
import contextMenu, { Options as MenuOptions } from 'electron-context-menu';
import log from 'electron-log';
import { createWindow } from './helpers';

const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
  serve({ directory: 'build/app' });
} else {
  app.setPath('userData', path.join(process.cwd(), '.data'));
}

Menu.setApplicationMenu(null);
const contextMenuOptions: MenuOptions = {
  showSearchWithGoogle: false,
  showCopyLink: true,
  showCopyImage: true,
  showCopyImageAddress: true,
  showCopyVideoAddress: true,
  showSaveImageAs: true,
  showSaveVideoAs: true,
  showSelectAll: true,
  showInspectElement: true,
  labels: {
    cut: '剪切',
    copy: '复制',
    paste: '粘贴',
    selectAll: '全选',
    copyLink: '复制链接',
    copyImage: '复制图像',
    copyImageAddress: '复制图像链接',
    copyVideoAddress: '复制视频链接',
    saveImageAs: '保存图像为',
    saveVideoAs: '保存视频为',
    inspect: '检查',
  },
};

let mainWindow: BrowserWindow;
const tabMap = new Map<string, { view: WebContentsView }>();
let activeView: WebContentsView | null = null;

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

function resizeView(view: WebContentsView) {
  if (!mainWindow) return;
  const { width, height } = mainWindow.getContentBounds();
  // x:0, y: title+address bar height = 42 + 41 = 83
  view.setBounds({ x: 0, y: 83, width, height: height - 83 });
}

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
    },
  });

  // 响应主题变化，更新 overlay 样式
  nativeTheme.on('updated', () => {
    mainWindow?.setTitleBarOverlay(getOverlayStyle());
  });
  // load your main page
  mainWindow.loadURL(getProviderPath('/'));

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.log('💥 did-fail-load:');
    console.log('  URL:', validatedURL);
    console.log('  Error Code:', errorCode);
    console.log('  Description:', errorDescription);
    console.log('  Is Main Frame:', isMainFrame);

    log.error('mainWindow load fail', {
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

  mainWindow.on('resize', () => {
    tabMap.forEach(tab => {
      resizeView(tab.view);
    });
  });

  // IPC handlers for tab management
  ipcMain.handle('clear-active-view', () => {
    tabMap.forEach(tab => {
      mainWindow.contentView.removeChildView(tab.view);
    });
    if (activeView) activeView = null;
  });

  ipcMain.handle('create-tab', async (_e, id: string, url: string) => {
    if (!url) {
      tabMap.forEach(tab => {
        mainWindow.contentView.removeChildView(tab.view);
      });
      mainWindow.webContents.focus();
      return;
    }
    const view = new WebContentsView({
      webPreferences: {
        preload: path.join(__dirname, 'preloadWebview.js'),
      },
    });
    view.webContents.loadURL(url);
    tabMap.forEach(tab => {
      mainWindow.contentView.removeChildView(tab.view);
    });
    tabMap.set(id, { view });
    mainWindow.contentView.addChildView(view);
    resizeView(view);

    // attach contextMenu
    view.webContents.on('context-menu', contextMenu({ ...contextMenuOptions, window: view }));
    // 标题 / favicon 更新
    view.webContents.on('page-title-updated', (_ev, title, explicitSet) => {
      console.log('title', { id, title, explicitSet });
      mainWindow.webContents.send('tabEvent', { type: 'title', id, title, explicitSet });
    });
    view.webContents.on('page-favicon-updated', (_ev, favicons) => {
      console.log('favicon', { id, favicons });
      mainWindow.webContents.send('tabEvent', { type: 'favicon', id, favicons });
    });
    // 加载状态
    view.webContents.on('did-start-loading', () => {
      mainWindow.webContents.send('tabEvent', { type: 'loading', id, loading: true });
    });
    view.webContents.on('did-stop-loading', () => {
      mainWindow.webContents.send('tabEvent', { type: 'loading', id, loading: false });
    });
    // 导航
    view.webContents.on('did-navigate', (event, url, httpResponseCode, httpStatusText) => {
      if (url.startsWith(getProviderPath('/error/'))) return;
      console.log('navigate', { url });
      const canGoBack = view.webContents.navigationHistory.canGoBack();
      const canGoForward = view.webContents.navigationHistory.canGoForward();
      mainWindow.webContents.send('tabEvent', {
        type: 'navigate',
        id,
        url,
        httpResponseCode,
        httpStatusText,
        canGoBack,
        canGoForward,
      });
    });
    view.webContents.on('did-navigate-in-page', (event, url, isMainFrame, frameProcessId, frameRoutingId) => {
      if (url.startsWith(getProviderPath('/error/'))) return;
      console.log('navigate_in_page', { url });
      const canGoBack = view.webContents.navigationHistory.canGoBack();
      const canGoForward = view.webContents.navigationHistory.canGoForward();
      mainWindow.webContents.send('tabEvent', {
        type: 'navigate_in_page',
        id,
        url,
        isMainFrame,
        frameProcessId,
        frameRoutingId,
        canGoBack,
        canGoForward,
      });
    });
    view.webContents.setWindowOpenHandler(({ url, features, disposition }) => {
      console.log('Intercepted window.open for URL:', url);
      mainWindow.webContents.send('tabEvent', {
        type: 'new_tab',
        fromId: id,
        url,
        disposition,
      });

      return { action: 'deny' }; // 阻止默认新窗口打开
    });
    // 加载失败
    view.webContents.on(
      'did-fail-load',
      (event, errorCode, errorDescription, validatedURL, isMainFrame, frameProcessId, frameRoutingId) => {
        // The full list of error codes: https://source.chromium.org/chromium/chromium/src/+/main:net/base/net_error_list.h
        console.log('fail_load', {
          errorCode,
          errorDescription,
          validatedURL,
        });

        if (errorCode === -3) return;

        // 加载错误页
        const errorPageUrl = getProviderPath('/error/');
        view.webContents.loadURL(
          errorPageUrl +
            `?url=${encodeURIComponent(validatedURL)}&description=${encodeURIComponent(
              `${errorCode}${errorDescription && ' ' + errorDescription}`
            )}`
        );

        mainWindow.webContents.send('tabEvent', {
          type: 'fail_load',
          id,
          errorCode,
          errorDescription,
          validatedURL,
          isMainFrame,
          frameProcessId,
          frameRoutingId,
        });
      }
    );
    return true;
  });

  ipcMain.handle('switch-tab', (_e, id: string) => {
    if (activeView) {
      mainWindow.contentView.removeChildView(activeView);
      activeView = null;
    }

    const tab = tabMap.get(id);
    if (tab) {
      mainWindow.contentView.addChildView(tab.view);
      activeView = tab.view;
      resizeView(tab.view);
      tab.view.webContents.focus();
      return true;
    }

    return false;
  });

  ipcMain.handle('close-tab', (_e, id: string) => {
    const tab = tabMap.get(id);
    if (!tab) return false;
    tab.view.webContents.close({ waitForBeforeUnload: false });
    mainWindow.contentView.removeChildView(tab.view);

    if (activeView === tab.view) {
      activeView = null;
    }
    tabMap.delete(id);
    if (tabMap.size === 0) {
      mainWindow.webContents.focus();
    }
    return true;
  });

  ipcMain.handle('navigate-tab', (_e, id: string, url: string) => {
    const tab = tabMap.get(id);
    if (tab) tab.view.webContents.loadURL(url);
  });
  ipcMain.handle('navigate-tab-action', (_e, id: string, action: string) => {
    const tab = tabMap.get(id);
    if (tab) {
      const navigationHistory = tab.view.webContents.navigationHistory;
      if (action === 'BACK') {
        if (navigationHistory.canGoBack()) navigationHistory.goBack();
      } else if (action === 'FORWARD') {
        if (navigationHistory.canGoForward()) navigationHistory.goForward();
      }
    }
  });
  ipcMain.on('hotkey', (event, hotkey) => {
    // Like 2,3,...
    const senderId = event.sender.id;

    // 找到对应 tab 的 id
    let matchedTabId: string | null = null;
    for (const [id, { view }] of tabMap.entries()) {
      if (view.webContents.id === senderId) {
        matchedTabId = id;
        break;
      }
    }

    if (matchedTabId) {
      console.log(`[hotkey] From tab ${matchedTabId}: ${hotkey}`);
      if (hotkey === 'f6') {
        mainWindow.webContents.focus();
      }
      mainWindow.webContents.send('hotkeyFromMain', {
        id: matchedTabId,
        hotkey,
      });
    }
  });
})();

app.on('window-all-closed', () => {
  app.quit();
});
