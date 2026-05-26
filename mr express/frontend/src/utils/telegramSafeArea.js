import WebApp from '@twa-dev/sdk';

/** Telegram "X" va menyu tugmalari ostida qolishi uchun minimal tepa bo'shliq */
export const TG_HEADER_MIN_PX = 55;

/**
 * --tg-header-offset CSS o'zgaruvchisini Telegram safe area + minimal 55px ga moslaydi.
 */
export function syncTelegramTopInset() {
  const tg = WebApp;
  const safeTop = tg?.safeAreaInset?.top ?? 0;
  const contentTop = tg?.contentSafeAreaInset?.top ?? 0;
  const fromTelegram = safeTop + contentTop;
  const offset = Math.max(TG_HEADER_MIN_PX, fromTelegram || TG_HEADER_MIN_PX);

  document.documentElement.style.setProperty('--tg-header-offset', `${offset}px`);
  return offset;
}
