import { useEffect, useState } from 'react';
import { api } from '../api';
import { useApp } from '../context/AppContext';
import { useTelegram } from '../hooks/useTelegram';
import BannerCarousel from '../components/BannerCarousel';
import ProductCard from '../components/ProductCard';
import ProductGrid from '../components/ProductGrid';
import SearchOverlay from '../components/SearchOverlay';
import { IconSearch } from '../components/icons/TabIcons';

export default function Home() {
  const [banners, setBanners] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const { refreshCart } = useApp();
  const { haptic } = useTelegram();

  useEffect(() => {
    api.banners().then(setBanners).catch(console.error);
    api.products({ discount_only: true, limit: 100 }).then(setDiscounts).catch(console.error);
    api.products({ limit: 100 }).then(setFeatured).catch(console.error);
  }, []);

  const handleAddCart = async (product) => {
    const cart = await api.cart().catch(() => ({ items: [] }));
    const existing = cart.items?.find((i) => i.product.id === product.id);
    const qty = (existing?.quantity || 0) + 1;
    await api.updateCart(product.id, qty);
    await refreshCart();
    haptic('success');
  };

  return (
    <div className="scroll-area h-full px-4 pb-nav-safe pt-1">
      <button
        type="button"
        onClick={() => { haptic('light'); setSearchOpen(true); }}
        className="glass-float relative w-full flex items-center gap-3 px-4 py-3.5 text-left"
        aria-label="Qidirish"
      >
        <span className="shrink-0">
          <IconSearch />
        </span>
        <span className="flex-1 text-[15px] font-medium text-neutral-400">
          Mahsulot qidirish...
        </span>
      </button>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      <section className="mt-5">
        <BannerCarousel banners={banners} />
      </section>

      <section className="mt-7">
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-theme">Chegirmalar</h2>
        </div>
        <div className="-mx-1 flex gap-3.5 overflow-x-auto hide-scrollbar px-1 pb-1">
          {discounts.map((p) => (
            <div key={p.id} className="w-[168px] shrink-0">
              <ProductCard product={p} onAddCart={handleAddCart} />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="mb-3.5 text-lg font-bold tracking-tight text-theme">
          Barcha tovarlar
        </h2>
        <ProductGrid products={featured} onAddCart={handleAddCart} />
      </section>
    </div>
  );
}
