import { useEffect, useState } from 'react';
import { api } from '../api';
import { useApp } from '../context/AppContext';
import { useTelegram } from '../hooks/useTelegram';
import ProductGrid from '../components/ProductGrid';

export default function Favorites() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { refreshCart } = useApp();
  const { haptic } = useTelegram();

  useEffect(() => {
    setLoading(true);
    api
      .favorites()
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const handleAddCart = async (product) => {
    const cart = await api.cart().catch(() => ({ items: [] }));
    const existing = cart.items?.find((i) => i.product.id === product.id);
    await api.updateCart(product.id, (existing?.quantity || 0) + 1);
    await refreshCart();
    haptic('success');
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
      <h1 className="mb-5 text-[28px] font-bold tracking-tight text-neutral-900">Sevimlilar</h1>
      <ProductGrid
        products={products}
        onAddCart={handleAddCart}
        emptyMessage="Sevimlilar ro'yxati bo'sh"
      />
    </div>
  );
}
