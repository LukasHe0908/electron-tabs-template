'use client';
import { useEffect, useLayoutEffect, useState } from 'react';
import '../styles/globals.css';
import { HeroUIProvider, addToast } from '@heroui/react';
import { ToastProvider } from '@heroui/toast';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [themeClass, setThemeClass] = useState(''); // '' | 'dark'

  useLayoutEffect(() => {
    const matchDark = window.matchMedia('(prefers-color-scheme: dark)');
    const updateTheme = () => {
      setThemeClass(matchDark.matches ? 'dark' : '');
    };
    updateTheme();
    matchDark.addEventListener('change', updateTheme);
    return () => {
      matchDark.removeEventListener('change', updateTheme);
    };
  }, []);

  useEffect(() => {
    window.alert = function (...args: any[1]) {
      console.log('[Alert]', args[0]);
      addToast({
        hideIcon: false,
        color: 'primary',
        description: args[0],
        classNames: {
          description: 'whitespace-pre-wrap',
        },
      });
      return true;
    };
  }, []);
  useEffect(() => {
    const handleDragStart = event => {
      event.preventDefault();
    };
    document.body.addEventListener('drop', handleDragStart);
    return () => {
      document.body.removeEventListener('drop', handleDragStart);
    };
  }, []);
  return (
    <>
      <html lang='en' className='h-full overflow-hidden'>
        <head>
          <title>Electron Tabs Template</title>
          <meta charSet='UTF-8' />
          <meta name='viewport' content='width=device-width, initial-scale=1.0' />
        </head>
        <body className='h-full scrollbar-hide!'>
          <ToastProvider />
          <HeroUIProvider className={`h-full scrollbar-hide! ${themeClass}`}>{children}</HeroUIProvider>
        </body>
      </html>
    </>
  );
}
