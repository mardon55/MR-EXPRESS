import { useEffect, useRef } from 'react';

/**
 * Admin har qanday o'zgarish kiritganda mini-app real vaqtda yangilanadi.
 * - SSE orqali darhol (mrexpress:refresh eventi)
 * - Har INTERVAL ms da zapas polling (default 10 sek)
 * - Foydalanuvchi boshqa dasturdan qaytganda darhol yangilanadi
 */
export function useAutoRefresh(callback, interval = 10_000) {
  const cbRef = useRef(callback);

  useEffect(() => {
    cbRef.current = callback;
  });

  useEffect(() => {
    const run = () => {
      if (document.visibilityState === 'visible') {
        cbRef.current();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        cbRef.current();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);
    window.addEventListener('mrexpress:refresh', run);

    const timer = setInterval(run, interval);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
      window.removeEventListener('mrexpress:refresh', run);
      clearInterval(timer);
    };
  }, [interval]);
}
