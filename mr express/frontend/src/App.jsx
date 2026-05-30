import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import SplashScreen from './components/SplashScreen';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import LiquidBackground from './components/LiquidBackground';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import BottomNav from './components/BottomNav';
import { syncTelegramTopInset } from './utils/telegramSafeArea';
import { api, cacheInvalidate } from './api';

// ─── Lazy pages (code splitting — har sahifa alohida chunk) ──────────────────
const Home          = lazy(() => import('./pages/Home'));
const ReelsPage     = lazy(() => import('./pages/ReelsPage'));
const CatalogPage   = lazy(() => import('./pages/CatalogPage'));
const Cart          = lazy(() => import('./pages/Cart'));
const Favorites     = lazy(() => import('./pages/Favorites'));
const Profile       = lazy(() => import('./pages/Profile'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
// ─────────────────────────────────────────────────────────────────────────────

export const APP_THEME_COLOR = '#eef2ff';

function PageSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-ios-blue border-t-transparent" />
    </div>
  );
}

function initTelegramFullscreen() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return null;

  try { tg.ready(); } catch {}
  try { tg.expand(); } catch {}

  if (typeof tg.requestFullscreen === 'function') {
    try { tg.requestFullscreen(); } catch {}
  }

  if (tg.setHeaderColor) {
    try { tg.setHeaderColor(APP_THEME_COLOR); } catch {}
  }
  if (tg.setBackgroundColor) {
    try { tg.setBackgroundColor(APP_THEME_COLOR); } catch {}
  }

  if (typeof tg.disableVerticalSwipes === 'function') {
    try { tg.disableVerticalSwipes(); } catch {}
  }

  return tg;
}

function TelegramBackButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  const isHome = location.pathname === '/';

  useEffect(() => {
    navigateRef.current = navigate;
  });

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.BackButton) return;

    if (isHome) {
      tg.BackButton.hide();
      return;
    }

    tg.BackButton.show();
    const handler = () => {
      if (typeof window.__tgBackHandler === 'function') {
        window.__tgBackHandler();
      } else {
        navigateRef.current(-1);
      }
    };
    tg.BackButton.onClick(handler);
    return () => tg.BackButton.offClick(handler);
  }, [isHome]);

  return null;
}

function Layout() {
  const { loading } = useApp();
  const location = useLocation();
  const hideNav = location.pathname.startsWith('/product/');
  const isReels = location.pathname === '/reels';

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="glass-float px-8 py-6 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-ios-blue border-t-transparent" />
          <p className="mt-4 text-sm font-medium text-ios-muted">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex min-h-0 flex-1 flex-col ${isReels ? 'bg-black' : ''}`}>
      <TelegramBackButton />
      <main className={`app-main ${isReels ? 'bg-black' : ''}`}>
        <Suspense fallback={<PageSpinner />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/reels" element={<ReelsPage />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/product/:id" element={<ProductDetail />} />
          </Routes>
        </Suspense>
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}

function AppChrome({ children }) {
  const location = useLocation();
  const isReels = location.pathname === '/reels';

  return (
    <>
      {!isReels && <LiquidBackground />}
      <div
        className={`app-shell fixed inset-0 z-10 flex w-full flex-col ${
          isReels ? 'bg-black' : ''
        }`}
      >
        {children}
      </div>
    </>
  );
}

function useMiniAppSSE() {
  useEffect(() => {
    let es = null;
    let retryTimer = null;

    function connect() {
      es = new EventSource('/api/events');

      es.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          if (event.type === 'refresh') {
            cacheInvalidate('/api/products', '/api/banners', '/api/categories', '/api/reels');
            window.dispatchEvent(new CustomEvent('mrexpress:refresh'));
          }
        } catch {}
      };

      es.onerror = () => {
        es.close();
        es = null;
        retryTimer = setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      if (es) es.close();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);
}

export default function App() {
  useMiniAppSSE();
  const [splash, setSplash] = useState(true);

  useEffect(() => {
    const tg = initTelegramFullscreen();
    syncTelegramTopInset();

    const onViewportChanged = () => {
      tg?.expand?.();
      syncTelegramTopInset();
    };

    tg?.onEvent?.('safeAreaChanged', syncTelegramTopInset);
    tg?.onEvent?.('contentSafeAreaChanged', syncTelegramTopInset);
    tg?.onEvent?.('viewportChanged', onViewportChanged);

    // Kesh isitish: bosh sahifa ochilganda katalog va reels ma'lumotlari yuklanadi
    const prefetch = setTimeout(() => {
      api.categories().catch(() => {});
      api.reels().catch(() => {});
      api.getStories().catch(() => {});
    }, 800);

    return () => {
      clearTimeout(prefetch);
      tg?.offEvent?.('safeAreaChanged', syncTelegramTopInset);
      tg?.offEvent?.('contentSafeAreaChanged', syncTelegramTopInset);
      tg?.offEvent?.('viewportChanged', onViewportChanged);
    };
  }, []);

  return (
    <ErrorBoundary>
      {splash && <SplashScreen onDone={() => setSplash(false)} />}
      <BrowserRouter basename="/shop">
        <ThemeProvider>
          <AppProvider>
            <AppChrome>
              <Layout />
            </AppChrome>
          </AppProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
