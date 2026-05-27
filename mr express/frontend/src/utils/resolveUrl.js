const BASE = import.meta.env.BASE_URL;

export function resolveUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return BASE.replace(/\/$/, '') + url;
  return url;
}
