'use client';
import { Button, Input } from '@heroui/react';
import React, { useState } from 'react';

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
    <div className='w-full h-[80px] flex flex-col'>
      {/* 标签栏 */}
      <div
        id='tab-bar'
        className='flex bg-gray-800 text-white px-2 h-[40px] items-center space-x-2 overflow-x-auto scrollbar-hide'
        onWheel={event => {
          const ele = document.getElementById('tab-bar');
          if (event.deltaY !== 0) {
            console.log(event.deltaY);
            event.preventDefault();
            ele.scrollBy({
              left: event.deltaY,
            });
          }
        }}>
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`flex items-center px-3 py-1 rounded cursor-pointer whitespace-nowrap max-w-[160px] select-none ${
              tab.id === activeTab ? 'bg-gray-900' : 'bg-gray-600'
            }`}
            onClick={() => switchTab(tab.id)}>
            {tab.title}
            <button
              className='ml-2 text-red-400 cursor-pointer'
              onClick={e => {
                e.stopPropagation();
                closeTab(tab.id);
              }}>
              ×
            </button>
          </div>
        ))}
        <button onClick={addTab} className='bg-blue-500 px-2 rounded cursor-pointer'>
          +
        </button>
      </div>

      {/* 地址栏 */}
      <div className='flex bg-gray-900 text-white px-2 h-[40px] items-center gap-1'>
        <Input
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          className='flex-grow  px-3 rounded text-black'
          placeholder='Enter URL'
        />
        <Button onClick={goToURL} className=' bg-green-600 px-4 rounded'>
          Go
        </Button>
      </div>
    </div>
  );
}
