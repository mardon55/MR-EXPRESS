import { useMemo } from 'react';
import WebApp from '@twa-dev/sdk';

export function useTelegram() {
  const user = WebApp.initDataUnsafe?.user;

  return useMemo(
    () => ({
      tg: WebApp,
      user,
      botUsername: import.meta.env.VITE_BOT_USERNAME || 'MR_EXPRESSBOT',
      isTelegram: Boolean(WebApp.initData),
      haptic: (type = 'light') => {
        if (type === 'success' || type === 'error' || type === 'warning') {
          WebApp.HapticFeedback.notificationOccurred(type);
        } else {
          WebApp.HapticFeedback.impactOccurred(type);
        }
      },
    }),
    [user]
  );
}
