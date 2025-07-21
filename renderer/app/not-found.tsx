'use client';
import { Button } from '@heroui/react';

export default function NotFound() {
  return (
    <div className='flex h-full items-center justify-center flex-col gap-2'>
      <span className='text-2xl font-bold'>Page Not Found</span>
      <Button
        onPress={() => {
          window.location.href = '/home';
        }}>
        返回首页
      </Button>
    </div>
  );
}
