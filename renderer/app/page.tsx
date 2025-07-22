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
  const [urlInput, setUrlInput] = useState('');
  const webviewsRef = useRef(new Map<string, Electron.WebviewTag>());

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
    console.log('closeTab', id);

    setTabs(t => t.filter(tab => tab.id !== id));
    if (activeTab === id && tabs.length > 1) {
      const next = tabs.find(t => t.id !== id);
      if (next) {
        switchTab(next.id);
      }
    }
  };

  const goToURL = () => {
    console.log('goToURL', activeTab, urlInput);
    if (activeTab) {
      setTabs(tabs => tabs.map(t => (t.id === activeTab ? { ...t, url: urlInput } : t)));
    }
  };

  const { ref: containerRef, width: containerWidth } = useContainerWidth<HTMLDivElement>();
  const tabWidth = Math.max(72, Math.min(220, (containerWidth - 8) / tabs.length));

  return (
    <div className='w-full h-screen flex flex-col '>
      {/* 标签栏 */}
      <div
        id='tab-bar'
        ref={containerRef}
        className='flex items-center h-[42px] px-1 py-1 overflow-x-auto scrollbar-hide bg-[#eaeaed] gap-1'
        onWheel={event => {
          const ele = document.getElementById('tab-bar');
          if (event.deltaY !== 0) {
            event.preventDefault();
            ele?.scrollBy({ left: event.deltaY });
          }
        }}>
        {tabs.map(tab => {
          console.log(containerWidth);

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
      </div>

      {/* 地址栏 */}
      <div className='flex flex-row items-center px-2 py-1 space-x-2 bg-[#eaeaed] border-b-1 border-gray-300'>
        <Input
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          className='flex-1 text-sm  text-black '
          classNames={{
            inputWrapper: ['!bg-[rgba(0,0,0,0.03)]', 'group-data-[focus=true]:!bg-white'],
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

                el.addEventListener('did-fail-load', async (e: any) => {
                  if (e.errorCode === -3) return; // 忽略 ERR_ABORTED

                  console.error(e);
                  if (!tab.url.includes('error.html')) {
                    const errorPage = await window.electronAPI?.getProviderPath('/error.html');
                    el.src = errorPage;
                    return;
                    setTabs(tabs =>
                      tabs.map(t => (t.id === tab.id ? { ...t, url: errorPage, title: '页面加载失败' } : t))
                    );
                  }
                });

                // 1. 标题更新
                el.addEventListener('page-title-updated', e => {
                  const title = (e as any).title;
                  console.log('pageTitleUpdated', tab.id, el.getURL(), title);

                  setTabs(tabs => tabs.map(t => (t.id === tab.id ? { ...t, title } : t)));
                });

                // 2. URL 更新
                const updateUrl = () => {
                  const currentUrl = el.getURL();
                  console.log('updateUrl', tab.id, el.getURL(), el.getTitle());

                  setTabs(tabs =>
                    tabs.map(t => (t.id === tab.id ? { ...t, title: el.getTitle(), url: currentUrl } : t))
                  );
                  if (tab.id === activeTab) setUrlInput(currentUrl);
                };

                el.addEventListener('did-navigate', updateUrl);
                el.addEventListener('did-navigate-in-page', updateUrl);

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
            className='w-full h-full'
          />
        ))}
      </div>
    </div>
  );
}
