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
  loading: boolean;
  favicon?: string | null;
};

export default function App() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const tabsRef = useRef<Tab[]>([]);
  const activeTabRef = useRef<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  // Clean Previous Views
  useEffect(() => {
    window.ipc?.invoke('clear-active-view');
  }, []);

  // IPC event listener
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);
  useEffect(() => {
    const handler = (message: any) => {
      const { type, id, ...data } = message;
      if (type === 'new_tab') {
        console.log('new_tab', data);
        const { url, fromId, disposition } = data;
        // 根据 disposition 判断是否激活
        const shouldActivate = disposition === 'foreground-tab' || disposition === 'default';

        addTab(url, fromId, shouldActivate);
      } else {
        setTabs(prevTabs =>
          prevTabs.map(tab => {
            if (tab.id !== id) return tab;
            const updated: Tab = { ...tab, ...data };
            if (type === 'title') {
              updated.title = data.title;
            }
            if (type === 'favicon') {
              updated.favicon = Array.isArray(data.favicons) ? data.favicons[0] : undefined;
            }
            if (type === 'loading') {
              updated.loading = data.loading;
            }
            if (type === 'navigate' || type === 'navigate_in_page') {
              updated.url = data.url;
              if (tab.id === activeTabRef.current) setUrlInput(data.url);
              setCanGoBack(data.canGoBack);
              setCanGoForward(data.canGoForward);
            }
            if (type === 'fail_load') {
              setTabs(tabs => tabs.map(t => (t.id === tab.id ? { ...t, title: '页面加载失败' } : t)));
            }
            return updated;
          })
        );
      }

      if (id === activeTabRef.current && type === 'title') {
        document.title = data.title || '新标签页';
      }
    };

    window.ipc?.on('tab-event', handler);
    return () => {
      window.ipc?.removeListener('tab-event', handler);
    };
  }, []);
  useEffect(() => {
    const handler = (message: any) => {
      const { id, hotkey } = message;
      if (id) {
        switch (hotkey) {
          case 'ctrl+w':
            closeTab(id);
            break;
          case 'ctrl+t':
            addTab();
            break;
          case 'f6':
            const input = document.getElementById('url-input') as HTMLInputElement | null;
            if (input) {
              input.focus();
              input.select();
            }
            break;

          default:
            break;
        }
      }
    };
    window.ipc?.on('hotkeyFromMain', handler);

    return () => {
      window.ipc?.removeListener('hotkeyFromMain', handler);
    };
  }, []);

  // Tab control functions
  async function send(channel: string, ...args: any[]) {
    return await window.ipc?.invoke(channel, ...args);
  }

  async function addTab(url = 'https://example.com', fromId?: string, setActive = true) {
    const id = `tab-${Date.now()}`;
    await send('create-tab', id, url);

    if (fromId) {
      setTabs(prevTabs => {
        const index = prevTabs.findIndex(t => t.id === fromId);
        const newTab: Tab = { id, title: '', url, loading: true };

        if (index >= 0) {
          const newTabs = [...prevTabs];
          newTabs.splice(index + 1, 0, newTab);
          return newTabs;
        } else {
          return [...prevTabs, newTab]; // fallback
        }
      });
    } else {
      setTabs(t => [...t, { id, title: '', url, loading: true }]);
    }
    if (setActive) {
      setActiveTab(id);
      setUrlInput(url);
    }
  }

  async function switchTab(id: string) {
    await send('switch-tab', id);
    const tab = tabs.find(t => t.id === id);
    if (tab) {
      setActiveTab(id);
      setUrlInput(tab.url);
    }
  }

  async function closeTab(id: string) {
    const currentTabs = tabsRef.current;
    const currentActive = activeTabRef.current;
    await send('close-tab', id);
    const index = currentTabs.findIndex(t => t.id === id);
    const newTabs = currentTabs.filter(tab => tab.id !== id);

    setTabs(newTabs);

    // 如果关闭的是当前激活 tab，激活左边一个
    if (currentActive === id) {
      if (newTabs.length > 0) {
        const nextIndex = index > 0 ? index - 1 : 0;
        const nextTab = newTabs[nextIndex];
        await switchTab(nextTab.id);
        setActiveTab(nextTab.id);
        setUrlInput(nextTab.url);
      } else {
        await switchTab(null);
        setActiveTab(null);
        setUrlInput('');
        setCanGoBack(false);
        setCanGoForward(false);
      }
    }
  }

  function goBack() {
    send('navigate-tab-action', activeTab, 'BACK');
  }
  function goForward() {
    send('navigate-tab-action', activeTab, 'FORWARD');
  }
  function reloadPage() {
    send('navigate-tab', activeTab, urlInput);
  }
  function goToURL() {
    if (!urlInput.trim()) return;
    // 简单检测是否为 URL（包含 . 或以 http(s):// 开头）
    let finalUrl = urlInput.trim();
    const hasProtocol = /^https?:\/\//i.test(finalUrl);
    const looksLikeDomain = /\./.test(finalUrl);

    if (!hasProtocol) {
      if (looksLikeDomain) {
        // 没写协议但像域名，加上 https://
        finalUrl = `https://${finalUrl}`;
      } else {
        // 否则当作搜索关键词
        const query = encodeURIComponent(finalUrl);
        finalUrl = `https://www.bing.com/search?q=${query}`;
      }
    }

    if (activeTab) {
      setTabs(tabs => tabs.map(t => (t.id === activeTab ? { ...t, url: finalUrl } : t)));
      send('navigate-tab', activeTab, finalUrl);
    } else {
      addTab(finalUrl);
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    Mousetrap.bind('ctrl+w', e => {
      e.preventDefault();
      closeTab(activeTab!);
    });
    Mousetrap.bind('ctrl+t', e => {
      e.preventDefault();
      addTab();
    });
    Mousetrap.bind('f6', e => {
      e.preventDefault();
      const input = document.getElementById('url-input') as HTMLInputElement | null;
      if (input) {
        input.focus();
        input.select();
      }
    });
    return () => {
      Mousetrap.unbind(['ctrl+w', 'ctrl+t', 'f6']);
    };
  }, [activeTab, tabs]);

  // Initialize
  useEffect(() => {
    addTab('https://example.com/');
  }, []);

  const buttonGroupRef = useRef<HTMLDivElement>(null);
  const { ref: containerRef, width: containerWidth } = useContainerWidth<HTMLDivElement>([buttonGroupRef]);
  const totalGap = Math.max(0, (tabs.length - 1) * 4);
  const tabWidth = Math.max(72, Math.min(220, (containerWidth - totalGap - 8) / (tabs.length || 1)));

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

      {/* 内容 区域 */}
      <div className='flex-grow bg-white dark:bg-black'></div>
    </div>
  );
}
