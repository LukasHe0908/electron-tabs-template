'use client';
import { useState, useEffect, useRef } from 'react';
import { Button, Input, ScrollShadow } from '@heroui/react';
import { AddOutlined, RefreshOutlined, ArrowBackOutlined, ArrowForwardOutlined } from '@mui/icons-material';
import Mousetrap from 'mousetrap';
import TabItem from '../components/TabItem';
import { useContainerWidth } from '../components/hooks/useContainerWidth';

type Tab = {
  id: string;
  title: string;
  url: string;
  currentUrl?: string;
  loading: boolean;
  favicon?: string | null;
};

export default function App() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const tabsRef = useRef<Tab[]>([]);
  const activeTabRef = useRef<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const webviewsRef = useRef(new Map<string, Electron.WebviewTag>());
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  useEffect(() => {
    activeTabRef.current = activeTab;
    const webview = webviewsRef.current.get(activeTab);
    if (!webview) return;
    const updateNavState = () => {
      setCanGoBack(webview.canGoBack());
      setCanGoForward(webview.canGoForward());
    };

    webview.addEventListener('did-navigate', updateNavState);
    webview.addEventListener('did-navigate-in-page', updateNavState);

    return () => {
      webview.removeEventListener('did-navigate', updateNavState);
      webview.removeEventListener('did-navigate-in-page', updateNavState);
    };
  }, [activeTab]);

  const goBack = () => {
    const webview = document.querySelector(`webview[data-id="${activeTab}"]`) as Electron.WebviewTag;
    if (webview?.canGoBack()) webview.goBack();
  };

  const goForward = () => {
    const webview = document.querySelector(`webview[data-id="${activeTab}"]`) as Electron.WebviewTag;
    if (webview?.canGoForward()) webview.goForward();
  };

  const reloadPage = () => {
    const webview = document.querySelector(`webview[data-id="${activeTab}"]`) as Electron.WebviewTag;
    webview?.reload();
  };

  const addTab = (url = 'https://example.com') => {
    console.log('addTab');
    const id = `tab-${Date.now()}`;
    setTabs(t => [...t, { id, title: '', url, loading: true }]);
    setActiveTab(id);
    setUrlInput(url);
  };

  const switchTab = (id: string) => {
    console.log('switchTab', id);

    const tab = tabs.find(t => t.id === id);
    if (tab) {
      setActiveTab(id);
      setUrlInput(tab.currentUrl);
    }
  };

  const closeTab = (id: string) => {
    const currentTabs = tabsRef.current;
    const currentActive = activeTabRef.current;

    const index = currentTabs.findIndex(t => t.id === id);
    const newTabs = currentTabs.filter(tab => tab.id !== id);

    setTabs(newTabs);

    // 如果关闭的是当前激活 tab，激活左边一个（或最右一个）
    if (currentActive === id) {
      if (newTabs.length > 0) {
        const nextIndex = index > 0 ? index - 1 : 0;
        const nextTab = newTabs[nextIndex];
        setActiveTab(nextTab.id);
        setUrlInput(nextTab.currentUrl);
      } else {
        setActiveTab(null);
        setUrlInput('');
        setCanGoBack(false);
        setCanGoForward(false);
      }
    }
  };

  const goToURL = () => {
    console.log('goToURL', activeTab, urlInput);
    if (activeTab) {
      setTabs(tabs => tabs.map(t => (t.id === activeTab ? { ...t, url: urlInput, currentUrl: urlInput } : t)));
    } else {
      addTab(urlInput);
    }
  };

  const closeActiveTab = () => {
    const currentActive = activeTabRef.current;
    if (currentActive) {
      closeTab(currentActive);
    }
  };
  const focusUrlInput = () => {
    const input = document.getElementById('url-input') as HTMLInputElement;
    if (input) input.focus();
  };

  // 主页面快捷键
  useEffect(() => {
    Mousetrap.bind('ctrl+w', e => {
      e.preventDefault();
      closeActiveTab(); // 关闭当前标签
    });
    Mousetrap.bind('ctrl+t', e => {
      e.preventDefault();
      addTab(); // 添加新标签
    });
    Mousetrap.bind('f6', e => {
      e.preventDefault();
      focusUrlInput(); // 聚焦地址栏
    });

    return () => {
      Mousetrap.unbind(['ctrl+w', 'ctrl+t', 'f6']);
    };
  }, []);

  const [__dirname, setDirname] = useState('');
  useEffect(() => {
    (async () => {
      setDirname(await window.electronAPI.getDirname());
    })();
  });

  const buttonGroupRef = useRef<HTMLDivElement>(null);
  const { ref: containerRef, width: containerWidth } = useContainerWidth<HTMLDivElement>([buttonGroupRef]);
  const totalGap = Math.max(0, (tabs.length - 1) * 4);
  const tabWidth = Math.max(72, Math.min(220, (containerWidth - totalGap - 8) / tabs.length));

  return (
    <div className='w-full h-screen flex flex-col bg-[#eaeaed] dark:bg-[#1f1e25]'>
      {/* 窗口标题栏 */}
      <div className='flex flex-row w-full'>
        <div className='min-w-8 [app-region:drag]'></div>
        {/* 标签栏 */}
        <div
          id='tab-bar'
          ref={containerRef}
          className='grow flex items-center h-[42px] px-[4px] py-1 overflow-x-auto scrollbar-hide gap-[4px]'
          onWheel={event => {
            const ele = document.getElementById('tab-bar');
            if (event.deltaY !== 0) {
              event.preventDefault();
              ele?.scrollBy({ left: event.deltaY });
            }
          }}>
          {tabs.map(tab => {
            // console.log(containerWidth);

            return (
              <div key={tab.id} style={{ width: `${tabWidth}px`, height: '100%' }}>
                <TabItem
                  id={tab.id}
                  title={tab.title}
                  favicon={tab.favicon}
                  loading={tab.loading}
                  active={tab.id === activeTab}
                  width={tabWidth}
                  onClick={() => switchTab(tab.id)}
                  onClose={() => closeTab(tab.id)}
                />
              </div>
            );
          })}
          <div ref={buttonGroupRef} className='flex gap-1 h-full'>
            {/* 添加新标签按钮 */}
            <button
              onClick={() => {
                addTab();
              }}
              className='h-full aspect-square flex items-center justify-center rounded-md cursor-pointer hover:bg-[rgba(0,0,0,0.1)] dark:hover:bg-[rgba(255,255,255,0.1)] transition-colors text-gray-800 dark:text-gray-200 focus-visible:outline-0 focus-visible:ring-2 ring-blue-400'>
              <AddOutlined style={{ fontSize: '20px' }} />
            </button>
            {/* Debug Refresh Button */}
            <button
              onClick={() => {
                location.reload();
              }}
              className='h-full aspect-square flex items-center justify-center rounded-md cursor-pointer hover:bg-[rgba(0,0,0,0.1)] dark:hover:bg-[rgba(255,255,255,0.1)] transition-colors text-gray-800 dark:text-gray-200 focus-visible:outline-0 focus-visible:ring-2 ring-blue-400'>
              <RefreshOutlined style={{ fontSize: '20px' }} />
            </button>
          </div>

          <div className='h-full grow-1 [app-region:drag]'></div>
        </div>
        {/* 窗口控制菜单 */}
        <div className='min-w-[138px]'></div>
      </div>

      {/* 地址栏 */}
      <div className='flex flex-row items-center px-2 py-1 border-b-1 border-gray-300 dark:border-gray-800'>
        {/* 控制按钮 */}
        <div className='flex gap-1 h-full'>
          <button
            onClick={() => {
              goBack();
            }}
            disabled={!canGoBack}
            className='h-full aspect-square flex items-center justify-center rounded-md cursor-pointer hover:bg-[rgba(0,0,0,0.1)] dark:hover:bg-[rgba(255,255,255,0.1)] transition-colors text-[#5b5b66] dark:text-white disabled:text-[#c8c8ce] dark:disabled:text-[#5b5a60] focus-visible:outline-0 focus-visible:ring-2 ring-blue-400'>
            <ArrowBackOutlined fontSize='small' />
          </button>
          <button
            onClick={() => {
              goForward();
            }}
            disabled={!canGoForward}
            className='h-full aspect-square flex items-center justify-center rounded-md cursor-pointer hover:bg-[rgba(0,0,0,0.1)] dark:hover:bg-[rgba(255,255,255,0.1)] transition-colors text-[#5b5b66] dark:text-white disabled:text-[#c8c8ce] dark:disabled:text-[#5b5a60] focus-visible:outline-0 focus-visible:ring-2 ring-blue-400'>
            <ArrowForwardOutlined fontSize='small' />
          </button>
          <button
            onClick={() => {
              reloadPage();
            }}
            className='h-full aspect-square flex items-center justify-center rounded-md cursor-pointer hover:bg-[rgba(0,0,0,0.1)] dark:hover:bg-[rgba(255,255,255,0.1)] transition-colors text-[#5b5b66] dark:text-white focus-visible:outline-0 focus-visible:ring-2 ring-blue-400'>
            <RefreshOutlined fontSize='small' />
          </button>
        </div>
        <div className='min-w-8'></div>
        <Input
          id='url-input'
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          className='flex-1 text-sm'
          classNames={{
            inputWrapper: [
              '!bg-[rgba(0,0,0,0.03)]',
              'dark:!bg-[rgba(255,255,255,0.03)]',
              'group-data-[focus=true]:!bg-white',
              'dark:group-data-[focus=true]:!bg-[rgba(255,255,255,0.2)]',
              'group-data-[focus=true]:shadow-md',
            ],
          }}
          placeholder='Search or enter address'
          size='sm'
          onKeyDown={e => {
            let event: KeyboardEvent = e;
            if (event.key === 'Enter') {
              goToURL();
            }
          }}
        />
      </div>

      {/* Webview 区域 */}
      <div className='flex-grow bg-white dark:bg-black'>
        {tabs.map(tab => (
          <webview
            key={tab.id}
            data-id={tab.id}
            ref={(el: Electron.WebviewTag) => {
              if (el && !webviewsRef.current.get(tab.id)) {
                webviewsRef.current.set(tab.id, el);

                // 添加 ipc-message 监听
                const handler = (e: any) => {
                  if (e.channel === 'hotkey') {
                    const key = e.args[0];
                    console.log(`[Tab ${tab.id}] Received hotkey from webview:`, key);

                    if (key === 'ctrl+w') closeTab(tab.id);
                    if (key === 'ctrl+t') addTab();
                    if (key === 'f6') focusUrlInput();
                  }
                };
                el.addEventListener('ipc-message', handler);

                // 清理
                el.addEventListener('destroyed', () => {
                  el.removeEventListener('ipc-message', handler);
                });

                (async () => {
                  const errorPage = await window.electronAPI?.getProviderPath('/error/');
                  el.addEventListener('did-fail-load', async (e: any) => {
                    if (e.errorCode === -3) return; // 忽略 ERR_ABORTED

                    console.error('pageLoadFail', e);

                    el.loadURL(errorPage + `?url=${encodeURIComponent(el.getURL())}`);
                    setTabs(tabs => tabs.map(t => (t.id === tab.id ? { ...t, title: '页面加载失败' } : t)));
                  });

                  // 标题更新
                  el.addEventListener('page-title-updated', e => {
                    const currentUrl = el.getURL();
                    if (currentUrl.startsWith(errorPage)) return;

                    const title = (e as any).title;
                    console.log('pageTitleUpdated', tab.id, el.getURL(), title);

                    setTabs(tabs => tabs.map(t => (t.id === tab.id ? { ...t, title } : t)));
                  });

                  // URL 更新
                  const updateUrl = () => {
                    const currentUrl = el.getURL();
                    if (currentUrl.startsWith(errorPage)) return;

                    console.log('updateUrl', tab.id, el.getURL(), el.getTitle());

                    setTabs(tabs =>
                      tabs.map(t => (t.id === tab.id ? { ...t, title: el.getTitle(), currentUrl: currentUrl } : t))
                    );
                    if (tab.id === activeTab) setUrlInput(currentUrl);
                  };

                  el.addEventListener('did-navigate', updateUrl);
                  el.addEventListener('did-navigate-in-page', updateUrl);
                })();

                // loading 状态
                el.addEventListener('did-start-loading', () => {
                  console.log('startLoading', tab.id, webviewsRef.current.get(tab.id).src);
                  setTabs(tabs => tabs.map(t => (t.id === tab.id ? { ...t, loading: true } : t)));
                });
                el.addEventListener('did-stop-loading', () => {
                  // 更新 loading 状态
                  console.log('stopLoading', tab.id, el.getURL());
                  setTabs(tabs => tabs.map(t => (t.id === tab.id ? { ...t, loading: false } : t)));
                });

                // favicon
                el.addEventListener('page-favicon-updated', (e: any) => {
                  const favicons = e.favicons as string[];
                  console.log('page-favicon-updated', favicons);

                  const faviconUrl = favicons[0];
                  if (!faviconUrl) return;

                  fetch(faviconUrl)
                    .then(res => {
                      if (!res.ok || (!res.headers.get('content-type')?.includes('/image') && false)) return null;
                      return res.blob();
                    })
                    .then(blob => {
                      if (!blob) return;
                      const objectURL = URL.createObjectURL(blob);
                      setTabs(tabs => tabs.map(t => (t.id === tab.id ? { ...t, favicon: objectURL } : t)));
                    })
                    .catch(err => {
                      console.warn('Failed to fetch favicon:', err);
                    });
                });
              }
            }}
            preload={`file://${__dirname}/preloadWebview.js`}
            src={tab.url}
            style={{ display: tab.id === activeTab ? 'flex' : 'none', width: '100%', height: '100%' }}
            className='w-full h-full select-none'
          />
        ))}
      </div>
    </div>
  );
}
