'use client';
import React, { useState } from 'react';
import { Button, Input } from '@heroui/react';
import { CloseOutlined, AddOutlined, SendOutlined } from '@mui/icons-material';

type Tab = { id: string; title: string; url: string };

export default function App() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');

  const addTab = () => {
    const id = `tab-${Date.now()}`;
    const url = 'https://example.com';
    setTabs(t => [...t, { id, title: 'New Tab', url }]);
    setActiveTab(id);
    setUrlInput(url);
    window.electronAPI.createTab(id, url);
  };

  const switchTab = (id: string) => {
    const tab = tabs.find(t => t.id === id);
    if (tab) {
      setActiveTab(id);
      setUrlInput(tab.url);
      window.electronAPI.switchTab(id);
    }
  };

  const closeTab = (id: string) => {
    setTabs(t => t.filter(tab => tab.id !== id));
    window.electronAPI.closeTab(id);
    if (activeTab === id && tabs.length > 1) {
      const next = tabs.find(t => t.id !== id);
      if (next) {
        switchTab(next.id);
      }
    }
  };

  const goToURL = () => {
    if (activeTab) {
      setTabs(tabs => tabs.map(t => (t.id === activeTab ? { ...t, url: urlInput } : t)));
      window.electronAPI.loadURL(activeTab, urlInput);
    }
  };

  return (
    <div className='w-full flex flex-col px-1 bg-gray-900'>
      {/* 标签栏 */}
      <div
        id='tab-bar'
        className='flex text-white py-1 h-10 items-center space-x-2 overflow-x-auto scrollbar-hide scroll-smooth rounded-lg'
        onWheel={event => {
          const ele = document.getElementById('tab-bar');
          if (event.deltaY !== 0) {
            event.preventDefault();
            ele?.scrollBy({ left: event.deltaY });
          }
        }}>
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`flex items-center px-3 py-1 rounded-lg cursor-pointer whitespace-nowrap max-w-[160px] select-none transition-colors duration-200 ${
              tab.id === activeTab ? 'bg-gray-900 border border-gray-700 shadow-sm' : 'bg-gray-700 hover:bg-gray-600'
            }`}
            onClick={() => switchTab(tab.id)}>
            <span className='truncate'>{tab.title}</span>
            <CloseOutlined
              className='ml-2 text-red-400 hover:text-red-500 cursor-pointer'
              fontSize='small'
              onClick={e => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
            />
          </div>
        ))}
        <button
          onClick={addTab}
          className='bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-lg transition-colors flex items-center'>
          <AddOutlined fontSize='small' />
        </button>
      </div>

      {/* 地址栏 */}
      <div className='flex h-10 items-center gap-2 pb-1 rounded-lg'>
        <Input
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          className='flex-grow h-full rounded-md text-black placeholder-gray-400'
          placeholder='Enter URL'
          size='sm'
        />
        <Button
          onPress={goToURL}
          className='bg-green-600 hover:bg-green-700 h-full rounded-md text-white transition-colors'
          isIconOnly>
          <SendOutlined></SendOutlined>
        </Button>
      </div>
    </div>
  );
}
