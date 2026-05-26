import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useApp } from '../context/AppContext';
import { useTelegram } from '../hooks/useTelegram';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import ProductGrid from '../components/ProductGrid';

export default function Favorites() {
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { refreshCart, favoriteIds } = useApp();
  const { haptic } = useTelegram();

  const loadData = useCallback(async () => {
    try {
      const data = await api.favorites();
      setAllProducts(data);
    } catch {
      setAllProducts([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  useAutoRefresh(loadData, 20_000);

  // Sevimlilardan o'chirilgan mahsulotlar darhol ro'yxatdan tushadi
  const products = useMemo(
    () => allProducts.filter((p) => favoriteIds.has(p.id)),
    [allProducts, favoriteIds],
  );

  const handleAddCart = async (product) => {
    try {
      const cart = await api.cart().catch(() => ({ items: [] }));
      const existing = cart.items?.find((i) => i.product.id === product.id);
      await api.updateCart(product.id, (existing?.quantity || 0) + 1);
      await refreshCart();
      haptic('success');
    } catch {
      haptic('error');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center pb-nav-safe">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-ios-blue border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="scroll-area h-full px-4 pb-nav-safe pt-3">
      <div className="mb-5 flex items-baseline gap-2">
        <h1 className="text-[28px] font-bold tracking-tight text-neutral-900">Sevimlilar</h1>
        {products.length > 0 && (
          <span className="rounded-full bg-ios-blue/10 px-2.5 py-0.5 text-xs font-semibold text-ios-blue">
            {products.length}
          </span>
        )}
      </div>
      <ProductGrid
        products={products}
        onAddCart={handleAddCart}
        emptyMessage="Sevimlilar ro'yxati bo'sh"
      />
    </div>
  );
}
