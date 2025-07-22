// hooks/useContainerWidth.ts
import { useEffect, useRef, useState } from 'react';

export function useContainerWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    console.log('useContainerWidth', ref.current);

    if (!ref.current) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect) {
        setWidth(entry.contentRect.width);
      }
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
