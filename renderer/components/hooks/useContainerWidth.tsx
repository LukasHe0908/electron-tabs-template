import { useEffect, useRef, useState } from 'react';

export function useContainerWidth<T extends HTMLElement>(excludeRefs: React.RefObject<HTMLElement>[] = []) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!ref.current) return;

    const updateWidth = () => {
      let containerWidth = ref.current?.clientWidth || 0;
      const excludeWidth = excludeRefs.reduce((sum, r) => sum + (r.current?.clientWidth || 0), 0);
      setWidth(containerWidth - excludeWidth);
    };

    const observer = new ResizeObserver(updateWidth);
    observer.observe(ref.current);

    // 监听窗口 resize（应对 layout 问题）
    window.addEventListener('resize', updateWidth);

    updateWidth(); // 初始化

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [excludeRefs]);

  return { ref, width };
}
