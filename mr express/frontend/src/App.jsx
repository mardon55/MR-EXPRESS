import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import LiquidBackground from './components/LiquidBackground';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import ReelsPage from './pages/ReelsPage';
import CatalogPage from './pages/CatalogPage';
import Cart from './pages/Cart';
import Favorites from './pages/Favorites';
import Profile from './pages/Profile';
import ProductDetail from './pages/ProductDetail';
import { syncTelegramTopInset } from './utils/telegramSafeArea';

/** Telegram header/body fon — gradient chekka rangi */
export const APP_THEME_COLOR = '#eef2ff';

function initTelegramFullscreen() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return null;

  tg.ready();
  tg.expand();

  if (typeof tg.requestFullscreen === 'function') {
    tg.requestFullscreen();
  }

  if (tg.setHeaderColor) {
    tg.setHeaderColor(APP_THEME_COLOR);
  }
  if (tg.setBackgroundColor) {
    tg.setBackgroundColor(APP_THEME_COLOR);
  }

  if (typeof tg.disableVerticalSwipes === 'function') {
    tg.disableVerticalSwipes();
  }

  return tg;
}

/** Telegram orqa tugmasi — bosh sahifada yashirin, boshqalarda ko'rinadi */
function TelegramBackButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.BackButton) return;

    if (isHome) {
      tg.BackButton.hide();
    } else {
      tg.BackButton.show();
    }

    const handleBack = () => {
      navigate(-1);
    };

    tg.BackButton.onClick(handleBack);
    return () => {
      tg.BackButton.offClick(handleBack);
    };
  }, [isHome, navigate]);

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

  // Registratsiya va AuthGate cheklovlari butunlay o'chirildi. Ilova srazu asosiy qismga o'tadi.
  return (
    <div className={`relative flex min-h-0 flex-1 flex-col ${isReels ? 'bg-black' : ''}`}>
      <TelegramBackButton />
      <main className={`app-main ${isReels ? 'bg-black' : ''}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/reels" element={<ReelsPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/product/:id" element={<ProductDetail />} />
        </Routes>
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}

/** Reels sahifasida gradient fon yashirinadi */
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

export default function App() {
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

    return () => {
      tg?.offEvent?.('safeAreaChanged', syncTelegramTopInset);
      tg?.offEvent?.('contentSafeAreaChanged', syncTelegramTopInset);
      tg?.offEvent?.('viewportChanged', onViewportChanged);
    };
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
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