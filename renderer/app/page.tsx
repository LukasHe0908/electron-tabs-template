'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Button, Input, ScrollShadow } from '@heroui/react';
import { AddOutlined, RefreshOutlined, ArrowBackOutlined, ArrowForwardOutlined } from '@mui/icons-material';
import Mousetrap from 'mousetrap';
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToHorizontalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import TabItem from '../components/TabItem';
import { useContainerWidth } from '../components/hooks/useContainerWidth';

type Tab = {
  id: string;
  title: string;
  url: string;
  loading: boolean;
  favicon?: string | null;
  canGoBack: boolean;
  canGoForward: boolean;
};

export default function App() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const tabsRef = useRef<Tab[]>([]);
  const activeTabRef = useRef<string | null>(null);

  const activeTabState = activeTab == null ? null : (tabs.find(t => t.id === activeTab) ?? null);
  const canGoBack = activeTabState?.canGoBack ?? false;
  const canGoForward = activeTabState?.canGoForward ?? false;

  const [urlInput, setUrlInput] = useState('');
  const urlInputRef = useRef('');
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);
  useEffect(() => {
    urlInputRef.current = urlInput;
  }, [urlInput]);

  // Clean Previous Views
  useEffect(() => {
    window.ipc?.invoke('clear-active-view');
  }, []);

  // IPC event listener
  useEffect(() => {
    activeTabRef.current = activeTab;
    if (!activeTab) {
      setTitle(null, true);
      return;
    }
    const tab = tabsRef.current.find(t => t.id === activeTab);
    setTitle(tab.title);
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
              updated.url = normalizeDisplayUrl(data.url);
              updated.canGoBack = data.canGoBack;
              updated.canGoForward = data.canGoForward;

              if (tab.id === activeTabRef.current) {
                setUrlInput(updated.url);
              }
            }
            if (type === 'fail_load') {
              setTabs(tabs => tabs.map(t => (t.id === tab.id ? { ...t, title: '页面加载失败' } : t)));
            }
            return updated;
          }),
        );
      }

      if (id === activeTabRef.current && type === 'title') {
        setTitle(data.title);
      }
    };

    window.ipc?.on('tabEvent', handler);
    return () => {
      window.ipc?.removeListener('tabEvent', handler);
    };
  }, []);
  useEffect(() => {
    const handler = (message: any) => {
      const currentActive = activeTabRef.current;

      const { id, hotkey } = message;
      if (id) {
        switch (hotkey) {
          case 'ctrl+w':
            closeTab(id);
            break;
          case 'ctrl+t':
            addTab('');
            break;
          case 'ctrl+r':
            if (currentActive) reloadPage(currentActive);
            break;
          case 'ctrl+pageup':
            switchTabRelative(-1);
            break;
          case 'ctrl+pagedown':
            switchTabRelative(1);
            break;
          case 'alt+left':
            if (currentActive) goBack(currentActive);
            break;
          case 'alt+right':
            if (currentActive) goForward(currentActive);
            break;
          case 'f6':
            focusURLInput(true);
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

  async function addTab(url = 'about:blank', fromId?: string, setActive = true) {
    const isBlank = url === 'about:blank' || !url;
    const id = `tab-${Date.now()}`;
    await send('create-tab', id, url, setActive);

    if (fromId) {
      setTabs(prevTabs => {
        const index = prevTabs.findIndex(t => t.id === fromId);
        const newTab: Tab = {
          id,
          title: '',
          url: isBlank ? '' : url,
          loading: !isBlank,
          canGoBack: false,
          canGoForward: false,
        };

        if (index >= 0) {
          const newTabs = [...prevTabs];
          newTabs.splice(index + 1, 0, newTab);
          return newTabs;
        } else {
          return [...prevTabs, newTab]; // fallback
        }
      });
    } else {
      setTabs(t => [
        ...t,
        { id, title: '', url: isBlank ? '' : url, loading: !isBlank, canGoBack: false, canGoForward: false },
      ]);
    }
    if (setActive) {
      setActiveTab(id);
      setUrlInput(normalizeDisplayUrl(url));
    }
  }

  async function switchTab(id: string) {
    const currentTabs = tabsRef.current;
    await send('switch-tab', id);
    const tab = currentTabs.find(t => t.id === id);
    if (tab) {
      setActiveTab(id);
      setUrlInput(normalizeDisplayUrl(tab.url));
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
        setUrlInput(normalizeDisplayUrl(nextTab.url));
      } else {
        await switchTab(null);
        setActiveTab(null);
        setUrlInput('');
      }
    }
  }

  async function switchTabRelative(offset: number) {
    const currentTabs = tabsRef.current;
    const currentActive = activeTabRef.current;
    const index = currentTabs.findIndex(t => t.id === currentActive);
    if (index === -1) return;
    const newIndex = (index + offset + currentTabs.length) % currentTabs.length;
    const newTab = currentTabs[newIndex];
    if (newTab) {
      await switchTab(newTab.id);
    }
  }

  function goBack(tabId?: string) {
    send('navigate-tab-action', tabId, 'BACK');
  }
  function goForward(tabId: string) {
    send('navigate-tab-action', tabId, 'FORWARD');
  }
  function reloadPage(tabId: string) {
    send('navigate-tab', tabId, urlInputRef.current);
  }
  function goToURL(tabId: string, url?: string) {
    let finalUrl = urlInputRef.current;
    if (url) finalUrl = url;
    finalUrl = finalUrl.trim();
    if (!finalUrl) return;
    // 简单检测是否为 URL（包含 . 或以 http(s):// 开头）
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

    if (tabId) {
      setTabs(tabs => tabs.map(t => (t.id === tabId ? { ...t, url: finalUrl } : t)));
      send('navigate-tab', tabId, finalUrl);
    } else {
      addTab(finalUrl);
    }
  }
  function focusURLInput(select: boolean = false) {
    const input = document.getElementById('url-input') as HTMLInputElement | null;
    if (input) {
      input.focus();
      if (select) input.select();
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
      addTab('about:blank');
    });
    Mousetrap.bind(['ctrl+r', 'f5'], e => {
      e.preventDefault();
      reloadPage(activeTab);
    });
    Mousetrap.bind('ctrl+pageup', e => {
      e.preventDefault();
      switchTabRelative(-1);
    });
    Mousetrap.bind('ctrl+pagedown', e => {
      e.preventDefault();
      switchTabRelative(1);
    });
    Mousetrap.bind('alt+left', e => {
      e.preventDefault();
      goBack(activeTab);
    });
    Mousetrap.bind('alt+right', e => {
      e.preventDefault();
      goForward(activeTab);
    });
    Mousetrap.bind('f6', e => {
      e.preventDefault();
      focusURLInput(true);
    });
    return () => {
      Mousetrap.unbind([
        'ctrl+w',
        'ctrl+t',
        'ctrl+r',
        'f5',
        'ctrl+pageup',
        'ctrl+pagedown',
        'alt+left',
        'alt+right',
        'f6',
      ]);
    };
  }, [activeTab, tabs]);

  // Initialize
  useEffect(() => {
    addTab('https://example.com');
  }, []);

  const buttonGroupRef = useRef<HTMLDivElement>(null);
  const { ref: containerRef, width: containerWidth } = useContainerWidth<HTMLDivElement>([buttonGroupRef]);
  const totalGap = Math.max(0, (tabs.length - 1) * 4);
  const tabWidth = Math.max(72, Math.min(220, (containerWidth - totalGap - 8) / (tabs.length || 1)));

  return (
    <div className='w-full h-screen flex flex-col bg-[#eaeaed] dark:bg-[#1f1e25]'>
      {/* 窗口标题栏 */}
      <div className='flex flex-row pl-[env(titlebar-area-x,0px)] w-[env(titlebar-area-width,calc(100%-140px))] h-[env(titlebar-area-height,42px)]'>
        <div className='min-w-8 [app-region:drag]'></div>
        {/* 标签栏 */}
        <ScrollShadow
          id='tab-bar'
          ref={containerRef}
          className='grow flex items-center px-1 py-1 overflow-x-auto overflow-y-hidden scrollbar-hide'
          onWheel={event => {
            const ele = document.getElementById('tab-bar');
            if (event.deltaY !== 0) {
              event.preventDefault();
              ele?.scrollBy({ left: event.deltaY });
            }
          }}
          size={16}
          orientation='horizontal'>
          <div className='flex flex-row gap-1 h-full'>
            <DndContext
              sensors={sensors}
              modifiers={[
                restrictToHorizontalAxis, // 仅允许左右拖动
                restrictToParentElement, // 仅允许在 tab 区域内拖动
              ]}
              collisionDetection={closestCenter}
              onDragStart={({ active }) => {
                setActiveId(active.id as string);
              }}
              onDragCancel={() => setActiveId(null)}
              onDragEnd={({ active, over }) => {
                setActiveId(null);
                if (active.id !== over?.id) {
                  const oldIndex = tabs.findIndex(t => t.id === active.id);
                  const newIndex = tabs.findIndex(t => t.id === over?.id);
                  if (oldIndex !== -1 && newIndex !== -1) {
                    setTabs(tabs => arrayMove(tabs, oldIndex, newIndex));
                  }
                }
              }}>
              <SortableContext items={tabs.map(t => t.id)} strategy={horizontalListSortingStrategy}>
                {tabs.map(tab => (
                  <SortableTab
                    key={tab.id}
                    tab={tab}
                    isDragging={tab.id === activeId}
                    width={tabWidth}
                    isActive={tab.id === activeTab}
                    onClick={() => switchTab(tab.id)}
                    onClose={() => closeTab(tab.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
          <div ref={buttonGroupRef} className='flex gap-1 h-full pl-1'>
            {/* 添加新标签按钮 */}
            <button
              onClick={() => {
                addTab('');
              }}
              className='h-full aspect-square flex items-center justify-center rounded-md hover:bg-[rgba(0,0,0,0.1)] dark:hover:bg-[rgba(255,255,255,0.1)] transition-colors text-gray-800 dark:text-gray-200 focus-visible:outline-0 focus-visible:ring-2 ring-blue-400'>
              <AddOutlined style={{ fontSize: '20px' }} />
            </button>
            {/* Debug Refresh Button */}
            <button
              onClick={() => {
                location.reload();
              }}
              className='h-full aspect-square flex items-center justify-center rounded-md hover:bg-[rgba(0,0,0,0.1)] dark:hover:bg-[rgba(255,255,255,0.1)] transition-colors text-gray-800 dark:text-gray-200 focus-visible:outline-0 focus-visible:ring-2 ring-blue-400'>
              <RefreshOutlined style={{ fontSize: '20px' }} />
            </button>
          </div>
          <div className='h-full grow [app-region:drag]'></div>
        </ScrollShadow>
      </div>

      {/* 地址栏 */}
      <div className='flex flex-row items-center px-2 py-1 border-b-1 border-gray-300 dark:border-gray-800'>
        {/* 控制按钮 */}
        <div className='flex gap-1 h-full'>
          <button
            onClick={() => {
              goBack(activeTab);
            }}
            disabled={!canGoBack}
            className='h-full aspect-square flex items-center justify-center rounded-md not-disabled:hover:bg-[rgba(0,0,0,0.1)] dark:not-disabled:hover:bg-[rgba(255,255,255,0.1)] transition-colors text-[#5b5b66] dark:text-white disabled:text-[#c8c8ce] dark:disabled:text-[#5b5a60] focus-visible:outline-0 focus-visible:ring-2 ring-blue-400'>
            <ArrowBackOutlined fontSize='small' />
          </button>
          <button
            onClick={() => {
              goForward(activeTab);
            }}
            disabled={!canGoForward}
            className='h-full aspect-square flex items-center justify-center rounded-md not-disabled:hover:bg-[rgba(0,0,0,0.1)] dark:not-disabled:hover:bg-[rgba(255,255,255,0.1)] transition-colors text-[#5b5b66] dark:text-white disabled:text-[#c8c8ce] dark:disabled:text-[#5b5a60] focus-visible:outline-0 focus-visible:ring-2 ring-blue-400'>
            <ArrowForwardOutlined fontSize='small' />
          </button>
          <button
            onClick={() => {
              reloadPage(activeTab);
            }}
            className='h-full aspect-square flex items-center justify-center rounded-md hover:bg-[rgba(0,0,0,0.1)] dark:hover:bg-[rgba(255,255,255,0.1)] transition-colors text-[#5b5b66] dark:text-white focus-visible:outline-0 focus-visible:ring-2 ring-blue-400'>
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
              '!text-black',
              'dark:!text-white',
            ],
          }}
          placeholder='Search or enter address'
          size='sm'
          spellCheck='false'
          onKeyDown={e => {
            let event: KeyboardEvent = e;
            if (event.key === 'Enter') {
              goToURL(activeTab);
            }
          }}
        />
      </div>

      {/* 内容 区域 */}
      <div className='grow bg-white dark:bg-[#2b2a33]'></div>
    </div>
  );
}

function setTitle(title: string | null, raw = false) {
  let productName = 'Electron Tabs Template';
  document.title = (raw ? '' : `${title || '新标签页'} - `) + productName;
}

function normalizeDisplayUrl(url?: string) {
  if (!url) return '';
  if (url === 'about:blank') return '';
  return url;
}

function SortableTab({
  tab,
  width,
  isActive,
  onClick,
  onClose,
  isDragging,
}: {
  tab: Tab;
  width: number;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
  isDragging: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: tab.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: `${width}px`,
    height: '100%',
    zIndex: isDragging ? 999999 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TabItem
        id={tab.id}
        title={tab.title}
        favicon={tab.favicon}
        loading={tab.loading}
        active={isActive}
        width={width}
        onClick={onClick}
        onClose={onClose}
      />
    </div>
  );
}
