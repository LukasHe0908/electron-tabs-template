'use client';

import { CircularProgress } from '@mui/material';
import { CloseOutlined, PublicOutlined } from '@mui/icons-material';
import { MouseEvent } from 'react';

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

  return (
    <div
      className={`group flex items-center px-1 py-1 h-full rounded-md text-sm cursor-pointer select-none transition-colors
        ${active ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}
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
        ) : favicon ? (
          <img
            src={favicon}
            alt='favicon'
            className='w-4 h-4'
            onError={e => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <PublicOutlined style={{ fontSize: '1.25em' }} />
        )}
      </div>

      {/* 标题 + 遮罩 */}
      <div className='relative flex-1 min-w-0'>
        <span className='block text-clip overflow-hidden whitespace-nowrap text-black text-sm'>
          {title || '新标签页'}
        </span>
      </div>

      {/* 关闭按钮 */}
      {showClose && (
        <div
          className={`text-gray-600 hover:bg-[rgba(0,0,0,0.1)] rounded-md transition-colors p-1 aspect-square flex items-center justify-center shrink-0  ${
            width > 140 && 'ml-1'
          }`}
          onClick={e => {
            e.stopPropagation();
            onClose?.(e);
          }}>
          <CloseOutlined fontSize='small' />
        </div>
      )}
    </div>
  );
}
