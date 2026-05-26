import { useEffect, useRef } from 'react';

/**
 * Admin har qanday o'zgarish kiritganda mini-app real vaqtda yangilanadi.
 * - Har INTERVAL ms da so'rov yuboriladi (fon rejimida emas)
 * - Foydalanuvchi boshqa dasturdan qaytganda darhol yangilanadi
 * - Vite HMR bilan mos ishlaydi
 *
 * @param {() => void} callback - yangilanish funksiyasi
 * @param {number} interval - ms da polling oraliq (default 20_000 = 20 sek)
 */
export function useAutoRefresh(callback, interval = 20_000) {
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

    const timer = setInterval(run, interval);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
      clearInterval(timer);
    };
  }, [interval]);
}
