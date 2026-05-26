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

async function request(path, options = {}) {
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

export const api = {
  auth: () => request('/api/auth', { method: 'POST' }),
  register: (data) =>
    request('/api/register', { method: 'POST', body: JSON.stringify(data) }),
  login: () => request('/api/login', { method: 'POST' }),
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
  updateCart: (product_id, quantity) =>
    request('/api/cart', {
      method: 'POST',
      body: JSON.stringify({ product_id, quantity }),
    }),
  favorites: () => request('/api/favorites'),
  favoriteIds: () => request('/api/favorites/ids'),
  toggleFavorite: (id) => request(`/api/favorites/${id}`, { method: 'POST' }),
  profile: () => request('/api/profile'),
  updateProfile: (data) =>
    request('/api/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  createOrder: (data) =>
    request('/api/orders', { method: 'POST', body: JSON.stringify(data) }),
  getOrders: () => request('/api/orders'),

  // Bildirishnomalar
  getNotifications: () => request('/api/notifications'),

  // Promokod qo'llash
  applyPromoCode: (code) =>
    request('/api/promo/apply', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  // Sharhlar (Reviews)
  getReviews: (productId) => request(`/api/products/${productId}/reviews`),
  canReview: (productId) => request(`/api/products/${productId}/can_review`),
  createReview: (productId, data) =>
    request(`/api/products/${productId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
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

  // Hikoyalar (Stories)
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
};

export function formatPrice(n) {
  return new Intl.NumberFormat('uz-UZ').format(n) + " so'm";
}
