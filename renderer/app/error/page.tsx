'use client';
import { useState, useEffect } from 'react';

export default function ErrorPage() {
  const [failedUrl, setFailedUrl] = useState('');
  const [failedDescription, setFailedDescription] = useState('');
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const url = params.get('url') ?? '';
    setFailedUrl(url);
    const description = params.get('description') ?? '';
    setFailedDescription(description);
  }, []);

  // 设置暗色 favicon
  useEffect(() => {
    const setFavicon = (dark: boolean) => {
      const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
      link.setAttribute('rel', 'icon');
      link.setAttribute('type', 'image/svg+xml');
      link.setAttribute('href', dark ? '/error-dark.svg' : '/error.svg');
      document.head.appendChild(link);
    };

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setFavicon(mediaQuery.matches); // 初始化

    const listener = (e: MediaQueryListEvent) => {
      setFavicon(e.matches);
    };

    mediaQuery.addEventListener('change', listener);
    return () => {
      mediaQuery.removeEventListener('change', listener);
    };
  }, []);

  const hostname = failedUrl
    ? (() => {
        try {
          return new URL(failedUrl).hostname;
        } catch {
          return '';
        }
      })()
    : '';

  const handleRetry = () => {
    setClicked(true);
    // window.history.back();
    if (failedUrl) {
      window.location.href = failedUrl;
    } else {
      window.location.reload();
    }
  };

  return (
    <>
      <title>页面加载失败</title>
      <div className='w-screen h-screen flex items-center justify-center px-4 dark:bg-[#1c1b22] dark:text-white'>
        <div className=''>
          <h1 className='text-3xl font-bold mb-6'>页面加载失败。</h1>
          <p className='text-xl'>
            我们无法连接至<span className={'break-all' + (hostname && ' px-2')}>{hostname || '该网站'}</span>的服务器。
          </p>
          <p className='mt-4'>若您确认输入的是正确网址，可以：</p>
          <ul className='list-disc list-inside space-y-1 mt-2'>
            <li>稍后再试</li>
            <li>检查您的网络连接</li>
            <li>检查是否有联网权限（可能已接入网络，但被防火墙阻止）</li>
          </ul>
          {failedDescription && <p className='mt-4'>原因：{failedDescription}</p>}
          <div className='flex justify-end mt-6'>
            <button
              onClick={handleRetry}
              className='bg-[#0062fa] hover:bg-[#0053cb] text-white font-semibold px-8 py-1 transition-colors rounded disabled:bg-[#99c0fd]'
              disabled={clicked}>
              重试
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
