'use client';
import { useState, useEffect, useRef } from 'react';
import { Button, Input, ScrollShadow } from '@heroui/react';
import { CloseOutlined, AddOutlined, SendOutlined, PublicOutlined, RefreshOutlined } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import TabItem from '../components/TabItem';
import { useContainerWidth } from '../components/hooks/useContainerWidth';

type Tab = {
  id: string;
  title: string;
  url: string;
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

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const addTab = () => {
    console.log('addTab');
    const id = `tab-${Date.now()}`;
    const url = 'https://example.com';
    setTabs(t => [...t, { id, title: '', url, loading: true }]);
    setActiveTab(id);
    setUrlInput(url);
  };

  const switchTab = (id: string) => {
    console.log('switchTab', id);

    const tab = tabs.find(t => t.id === id);
    if (tab) {
      setActiveTab(id);
      setUrlInput(tab.url);
    }
  };

  const closeTab = (id: string) => {
    const currentTabs = tabsRef.current;
    const currentActive = activeTabRef.current;

    const index = currentTabs.findIndex(t => t.id === id);
    const newTabs = currentTabs.filter(tab => tab.id !== id);

    setTabs(newTabs);

    // 如果关闭的是当前激活 tab，激活左边一个（或最右一个）
    if (currentActive === id && newTabs.length > 0) {
      const nextIndex = index > 0 ? index - 1 : 0;
      const nextTab = newTabs[nextIndex];
      setActiveTab(nextTab.id);
      setUrlInput(nextTab.url);
    }
  };

  const goToURL = () => {
    console.log('goToURL', activeTab, urlInput);
    if (activeTab) {
      setTabs(tabs => tabs.map(t => (t.id === activeTab ? { ...t, url: urlInput } : t)));
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        closeActiveTab(); // 关闭当前标签
      } else if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        addTab(); // 添加新标签
      } else if (e.key === 'F6') {
        e.preventDefault();
        focusUrlInput(); // 聚焦地址栏
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        closeActiveTab();
      } else if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        addTab();
      } else if (e.key === 'F6') {
        e.preventDefault();
        focusUrlInput();
      }
    };

    const current = webviewsRef.current.get(activeTab ?? '');
    current?.addEventListener('dom-ready', () => {
      console.log('webviewsRef dom-ready', current);
    });

    current?.addEventListener('keydown', handleKey);
    return () => current?.removeEventListener('keydown', handleKey);
  }, [activeTab]);

  const { ref: containerRef, width: containerWidth } = useContainerWidth<HTMLDivElement>();
  const tabWidth = Math.max(72, Math.min(220, (containerWidth - 8) / tabs.length));

  return (
    <div className='w-full h-screen flex flex-col bg-[#eaeaed]'>
      {/* 窗口标题栏 */}
      <div className='flex flex-row w-full'>
        {/* 标签栏 */}
        <div
          id='tab-bar'
          ref={containerRef}
          className='grow flex items-center h-[42px] px-1 py-1 overflow-x-auto scrollbar-hide gap-1'
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
          {/* 添加新标签按钮 */}
          <button
            onClick={addTab}
            className='ml-2 h-full aspect-square flex items-center justify-center rounded-md cursor-pointer hover:bg-[rgba(0,0,0,0.1)] transition-colors text-gray-600 focus-visible:outline-0 focus-visible:ring-2 ring-blue-400'>
            <AddOutlined fontSize='small' />
          </button>
          {/* Debug Refresh Button */}
          <button
            onClick={() => {
              location.reload();
            }}
            className='h-full aspect-square flex items-center justify-center rounded-md cursor-pointer hover:bg-[rgba(0,0,0,0.1)] transition-colors text-gray-600 focus-visible:outline-0 focus-visible:ring-2 ring-blue-400'>
            <RefreshOutlined fontSize='small' />
          </button>
          <div className='h-full grow-1 [app-region:drag]'></div>
        </div>
        {/* 窗口控制菜单 */}
        <div className='w-[138px]'></div>
      </div>

      {/* 地址栏 */}
      <div className='flex flex-row items-center px-2 py-1 space-x-2 border-b-1 border-gray-300'>
        <Input
          id='url-input'
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          className='flex-1 text-sm  text-black '
          classNames={{
            inputWrapper: ['!bg-[rgba(0,0,0,0.03)]', 'group-data-[focus=true]:!bg-white', 'group-data-[focus=true]:shadow-md'],
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
      <div className='flex-grow bg-white'>
        {tabs.map(tab => (
          <webview
            key={tab.id}
            ref={(el: Electron.WebviewTag) => {
              if (el && !webviewsRef.current.get(tab.id)) {
                webviewsRef.current.set(tab.id, el);
                (async () => {
                  const errorPage = await window.electronAPI?.getProviderPath('/error/');
                  el.addEventListener('did-fail-load', async (e: any) => {
                    if (e.errorCode === -3) return; // 忽略 ERR_ABORTED

                    console.error('pageLoadFail', e);

                    el.loadURL(errorPage + `?url=${encodeURIComponent(el.getURL())}`);
                    setTabs(tabs => tabs.map(t => (t.id === tab.id ? { ...t, title: '页面加载失败' } : t)));
                  });

                  // 1. 标题更新
                  el.addEventListener('page-title-updated', e => {
                    const currentUrl = el.getURL();
                    if (currentUrl.startsWith(errorPage)) return;

                    const title = (e as any).title;
                    console.log('pageTitleUpdated', tab.id, el.getURL(), title);

                    setTabs(tabs => tabs.map(t => (t.id === tab.id ? { ...t, title } : t)));
                  });

                  // 2. URL 更新
                  const updateUrl = () => {
                    const currentUrl = el.getURL();
                    if (currentUrl.startsWith(errorPage)) return;

                    console.log('updateUrl', tab.id, el.getURL(), el.getTitle());

                    setTabs(tabs => tabs.map(t => (t.id === tab.id ? { ...t, title: el.getTitle(), url: currentUrl } : t)));
                    if (tab.id === activeTab) setUrlInput(currentUrl);
                  };

                  el.addEventListener('did-navigate', updateUrl);
                  el.addEventListener('did-navigate-in-page', updateUrl);
                })();

                // 3. favicon 和 loading 状态
                el.addEventListener('did-start-loading', () => {
                  console.log('startLoading', tab.id, webviewsRef.current.get(tab.id).src);
                  setTabs(tabs => tabs.map(t => (t.id === tab.id ? { ...t, loading: true } : t)));
                });

                el.addEventListener('did-stop-loading', () => {
                  // 更新 loading 状态
                  console.log('stopLoading', tab.id, el.getURL());
                  setTabs(tabs => tabs.map(t => (t.id === tab.id ? { ...t, loading: false } : t)));

                  // 尝试提取 favicon
                  el.executeJavaScript(
                    `(() => {
  const link = document.querySelector('link[rel~="icon"]');
  const href = link && link.getAttribute('href');
  const url = new URL(href || '/favicon.ico', document.baseURI);
  return url.href;
})()`
                  )
                    .then(async (faviconUrl: string | null) => {
                      console.log('faviconUrl', faviconUrl);

                      if (!faviconUrl) return;

                      try {
                        const res = await fetch(faviconUrl);
                        const contentType = res.headers.get('content-type') || '';

                        if (contentType.includes('image/')) {
                          // 转换为 blob 对象 URL
                          const blob = await res.blob();
                          const objectURL = URL.createObjectURL(blob);
                          setTabs(tabs => tabs.map(t => (t.id === tab.id ? { ...t, favicon: objectURL } : t)));
                        } else {
                          // 非格式，不使用
                        }
                      } catch (error) {
                        // console.warn('获取 favicon 失败:', error);
                      }
                    })
                    .catch(() => {
                      // 忽略 JS 注入错误
                    });
                });
              }
            }}
            src={tab.url}
            style={{ display: tab.id === activeTab ? 'flex' : 'none', width: '100%', height: '100%' }}
            className='w-full h-full select-none'
          />
        ))}
      </div>
    </div>
  );
}
