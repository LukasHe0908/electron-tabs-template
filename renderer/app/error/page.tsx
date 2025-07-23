'use client';
import { useEffect, useState } from 'react';
import { Button } from '@heroui/react';

export default function ErrorPage() {
  const params = new URLSearchParams(location.search);
  const failedUrl = params.get('url') ?? '';
  const decUrl = new URL(failedUrl);
  const [clicked, setClicked] = useState(false);

  const handleRetry = () => {
    setClicked(true);
    // window.history.back();
    if (failedUrl) {
      location.href = failedUrl;
    } else {
      location.reload();
    }
  };

  return (
    <>
      <title>页面加载失败</title>
      <div className='w-screen h-screen flex items-center justify-center px-4'>
        <div className=''>
          <h1 className='text-3xl font-bold mb-4'>页面加载失败。</h1>
          <p className='mb-2 text-xl'>
            我们无法连接至 <span className='px-2 break-all'>{decUrl.hostname || '该网站'}</span>的服务器。
          </p>
          <p className='mb-4'>若您确认输入的是正确网址，可以：</p>
          <ul className='list-disc list-inside space-y-1 mb-6'>
            <li>稍后再试</li>
            <li>检查您的网络连接</li>
            <li>检查是否有联网权限（可能已接入网络，但被防火墙阻止）</li>
          </ul>
          <div className='flex justify-end'>
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
