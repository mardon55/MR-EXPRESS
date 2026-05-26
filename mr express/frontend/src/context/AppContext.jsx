import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);

  const refreshCart = useCallback(async () => {
    try {
      const data = await api.cart();
      setCartCount(data.count || 0);
    } catch {
      setCartCount(0);
    }
  }, []);

  const refreshFavorites = useCallback(async () => {
    try {
      const ids = await api.favoriteIds();
      setFavoriteIds(new Set(ids));
    } catch {
      setFavoriteIds(new Set());
    }
  }, []);

  const loadSession = useCallback(async () => {
    const authUser = await api.auth();
    setUser(authUser);
    setIsRegistered(!!authUser.is_registered);
    return authUser;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const authUser = await loadSession();
        if (authUser.is_registered) {
          await Promise.all([refreshCart(), refreshFavorites()]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [loadSession, refreshCart, refreshFavorites]);

  const register = async (data) => {
    const u = await api.register(data);
    setUser(u);
    setIsRegistered(true);
    await Promise.all([refreshCart(), refreshFavorites()]);
    return u;
  };

  const login = async () => {
    const u = await api.login();
    setUser(u);
    setIsRegistered(true);
    await Promise.all([refreshCart(), refreshFavorites()]);
    return u;
  };

  const toggleFavorite = async (productId) => {
    const res = await api.toggleFavorite(productId);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (res.favorited) next.add(productId);
      else next.delete(productId);
      return next;
    });
    return res.favorited;
  };

  const updateUser = (partial) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : prev));
  };

  return (
    <AppContext.Provider
      value={{
        favoriteIds,
        cartCount,
        loading,
        user,
        isRegistered,
        register,
        login,
        updateUser,
        refreshCart,
        refreshFavorites,
        toggleFavorite,
        isFavorite: (id) => favoriteIds.has(id),
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
