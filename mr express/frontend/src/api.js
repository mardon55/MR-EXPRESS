import WebApp from '@twa-dev/sdk';

function getApiBase() {
  const env = import.meta.env.VITE_API_URL;
  if (env && env !== 'same' && env !== '') {
    return env.replace(/\/$/, '');
  }
  return '';
}

const API_BASE = getApiBase();

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const user = WebApp.initDataUnsafe?.user;

  if (user?.id) {
    headers['X-Telegram-User-Id'] = String(user.id);
    if (user.username) headers['X-Telegram-Username'] = user.username;
    if (user.first_name) headers['X-Telegram-First-Name'] = user.first_name;
    if (user.last_name) headers['X-Telegram-Last-Name'] = user.last_name;
  } else if (!WebApp.initData) {
    headers['X-Telegram-User-Id'] = '123456789';
    headers['X-Telegram-First-Name'] = 'Test';
    headers['X-Telegram-Username'] = 'testuser';
  }

  return headers;
}

function getTelegramHeaders() {
  const headers = {};
  const user = WebApp.initDataUnsafe?.user;
  if (user?.id) {
    headers['X-Telegram-User-Id'] = String(user.id);
    if (user.username) headers['X-Telegram-Username'] = user.username;
    if (user.first_name) headers['X-Telegram-First-Name'] = user.first_name;
    if (user.last_name) headers['X-Telegram-Last-Name'] = user.last_name;
  } else if (!WebApp.initData) {
    headers['X-Telegram-User-Id'] = '123456789';
    headers['X-Telegram-First-Name'] = 'Test';
    headers['X-Telegram-Username'] = 'testuser';
  }
  return headers;
}

// ─── SWR Cache ────────────────────────────────────────────────────────────────
const _cache = new Map();
const CACHE_TTL = 120_000; // 2 daqiqa (SSE cache invalidation bilan yangilanadi)

function _cacheGet(path) {
  const e = _cache.get(path);
  if (!e) return undefined;
  if (Date.now() - e.ts > CACHE_TTL) { _cache.delete(path); return undefined; }
  return e.data;
}

function _cacheSet(path, data) {
  _cache.set(path, { data, ts: Date.now() });
}

export function cacheInvalidate(...prefixes) {
  for (const k of _cache.keys()) {
    if (prefixes.some(p => k === p || k.startsWith(p + '?') || k.startsWith(p + '/'))) {
      _cache.delete(k);
    }
  }
}
// ─────────────────────────────────────────────────────────────────────────────

async function _fetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...getHeaders(), ...options.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || res.statusText || `HTTP ${res.status}`);
  }
  return res.json();
}

async function request(path, options = {}) {
  const isGet = !options.method || options.method === 'GET';

  if (isGet) {
    const hit = _cacheGet(path);
    if (hit !== undefined) {
      // Stale-while-revalidate: agar kesh yarim muddatdan o'tgan bo'lsa fonda yangilash
      const entry = _cache.get(path);
      if (entry && Date.now() - entry.ts > CACHE_TTL / 2) {
        _fetch(path, options).then(d => _cacheSet(path, d)).catch(() => {});
      }
      return hit;
    }
  }

  const data = await _fetch(path, options);
  if (isGet) _cacheSet(path, data);
  return data;
}

export const api = {
  auth: () => _fetch('/api/auth', { method: 'POST' }),
  register: (data) =>
    _fetch('/api/register', { method: 'POST', body: JSON.stringify(data) }),
  login: () => _fetch('/api/login', { method: 'POST' }),

  banners: () => request('/api/banners'),
  categories: () => request('/api/categories'),
  products: (params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, v);
    });
    return request(`/api/products?${q}`);
  },
  product: (id) => request(`/api/products/${id}`),
  reels: () => request('/api/reels'),

  cart: () => request('/api/cart'),
  updateCart: async (product_id, quantity, selected_variants = null) => {
    cacheInvalidate('/api/cart');
    return _fetch('/api/cart', {
      method: 'POST',
      body: JSON.stringify({ product_id, quantity, selected_variants }),
    });
  },

  favorites: () => request('/api/favorites'),
  favoriteIds: () => request('/api/favorites/ids'),
  toggleFavorite: async (id) => {
    cacheInvalidate('/api/favorites');
    return _fetch(`/api/favorites/${id}`, { method: 'POST' });
  },

  profile: () => request('/api/profile'),
  updateProfile: async (data) => {
    cacheInvalidate('/api/profile');
    return _fetch('/api/profile', { method: 'PATCH', body: JSON.stringify(data) });
  },

  createOrder: async (data) => {
    cacheInvalidate('/api/orders', '/api/cart');
    return _fetch('/api/orders', { method: 'POST', body: JSON.stringify(data) });
  },
  getOrders: () => request('/api/orders'),

  getNotifications: () => request('/api/notifications'),

  buyNightMarketItem: async (item_id) => {
    cacheInvalidate('/api/night-market', '/api/cart');
    return _fetch(`/api/night-market/${item_id}/buy`, { method: 'POST' });
  },

  applyPromoCode: (code) =>
    _fetch('/api/promo/apply', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  getReviews: (productId) => request(`/api/products/${productId}/reviews`),
  canReview: (productId) => request(`/api/products/${productId}/can_review`),
  createReview: async (productId, data) => {
    cacheInvalidate(`/api/products/${productId}`);
    return _fetch(`/api/products/${productId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  uploadReviewPhotos: (files) => {
    const url = `${API_BASE}/api/review-photos`;
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return fetch(url, {
      method: 'POST',
      headers: getTelegramHeaders(),
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      return res.json();
    });
  },

  promoCodes: () => request('/api/promo-codes'),

  groupBuys: () => request('/api/group-buys'),
  joinGroupBuy: async (id) => {
    cacheInvalidate('/api/group-buys');
    return _fetch(`/api/group-buys/${id}/join`, { method: 'POST' });
  },
  leaveGroupBuy: async (id) => {
    cacheInvalidate('/api/group-buys');
    return _fetch(`/api/group-buys/${id}/leave`, { method: 'DELETE' });
  },

  getStories: () => request('/api/stories'),
  uploadStory: (formData) => {
    const url = `${API_BASE}/api/stories/upload`;
    return fetch(url, {
      method: 'POST',
      headers: getTelegramHeaders(),
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      return res.json();
    });
  },

  nightMarket: () => request('/api/night-market'),
};

export function formatPrice(n) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(n)) + " so'm";
}
