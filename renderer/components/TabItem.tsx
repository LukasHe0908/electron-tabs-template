'use client';
import { CircularProgress } from '@mui/material';
import { CloseOutlined, PublicOutlined } from '@mui/icons-material';
import { useState, MouseEvent } from 'react';

export interface TabItemProps {
  id: string;
  title?: string;
  favicon?: string;
  loading?: boolean;
  active?: boolean;
  width?: number; // 当前分配宽度，用于控制关闭按钮显示
  onClick?: () => void;
  onClose?: (e: MouseEvent) => void;
}

export default function TabItem({
  id,
  title,
  favicon,
  loading = false,
  active = false,
  width = 220,
  onClick,
  onClose,
}: TabItemProps) {
  const showClose = active || width >= 140;
  const [faviconLoadFail, setFaviconLoadFail] = useState(false);

  return (
    <div
      className={`group flex items-center px-1 py-1 h-full rounded-md text-sm select-none transition-colors text-black dark:text-white ${
        active
          ? 'bg-white shadow-sm dark:bg-[#53535f]'
          : 'bg-[#eaeaed] dark:bg-[#1f1e25] hover:bg-gray-200 dark:hover:bg-[#38373d]'
      }
      `}
      style={{
        flex: '1 1 0',
        minWidth: '72px',
        maxWidth: '220px',
        width: '100%',
      }}
      onClick={onClick}>
      {/* 图标 */}
      <div className={`w-4 h-4 flex items-center justify-center shrink-0 ${width < 140 ? 'mr-1' : 'mr-2 ml-1'}`}>
        {loading ? (
          <CircularProgress size={14} thickness={5} />
        ) : favicon && !faviconLoadFail ? (
          <img
            src={favicon}
            alt='favicon'
            className='w-4 h-4'
            onError={e => {
              setFaviconLoadFail(true);
              // e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <PublicOutlined style={{ fontSize: '1.25em' }} />
        )}
      </div>

      {/* 标题 + 遮罩 */}
      <div className='relative flex-1 min-w-0 overflow-hidden'>
        <span className='block text-clip overflow-hidden whitespace-nowrap text-sm [mask-image:linear-gradient(to_right,#000_calc(100%_-_16px),transparent)]'>
          {title || '新标签页'}
        </span>
      </div>

      {/* 关闭按钮 */}
      <div
        className={`h-full aspect-square flex items-center justify-center shrink-0 text-gray-800 dark:text-white hover:bg-[rgba(0,0,0,0.1)] dark:hover:bg-[rgba(255,255,255,0.1)] rounded-md transition-colors p-1  ${
          width > 140 && 'ml-1'
        } ${!showClose && 'hidden group-hover:flex'}`}
        onClick={e => {
          e.stopPropagation();
          onClose?.(e);
        }}>
        <CloseOutlined style={{ fontSize: '14px' }} />
      </div>
    </div>
  );
}
