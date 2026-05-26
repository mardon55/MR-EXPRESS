import { useEffect, useState } from 'react';
import { api } from '../api';
import { useApp } from '../context/AppContext';
import { useTelegram } from '../hooks/useTelegram';
import SearchBar from '../components/SearchBar';
import ProductGrid from '../components/ProductGrid';

export default function Catalog() {
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { refreshCart } = useApp();
  const { haptic } = useTelegram();

  useEffect(() => {
    api.categories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (activeCategory) params.category_id = activeCategory;
    if (search.trim()) params.q = search.trim();
    api
      .products(params)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [activeCategory, search]);

  const handleAddCart = async (product) => {
    const cart = await api.cart().catch(() => ({ items: [] }));
    const existing = cart.items?.find((i) => i.product.id === product.id);
    await api.updateCart(product.id, (existing?.quantity || 0) + 1);
    await refreshCart();
    haptic('success');
  };

  const chipClass = (active) =>
    `press-fluid shrink-0 rounded-squircle px-4 py-2.5 text-sm font-semibold transition-fluid ${
      active
        ? 'bg-ios-blue text-white shadow-glass'
        : 'glass text-neutral-600 shadow-glass'
    }`;

  return (
    <div className="scroll-area h-full px-4 pb-nav-safe pt-3">
      <h1 className="mb-5 text-[28px] font-bold tracking-tight text-neutral-900">Katalog</h1>
      <SearchBar value={search} onChange={setSearch} />

      <div className="mt-4 flex gap-2.5 overflow-x-auto hide-scrollbar pb-1">
        <button type="button" onClick={() => { haptic('light'); setActiveCategory(null); }} className={chipClass(activeCategory === null)}>
          Barchasi
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => { haptic('light'); setActiveCategory(c.id); }}
            className={chipClass(activeCategory === c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      <section className="mt-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-ios-blue border-t-transparent" />
          </div>
        ) : (
          <ProductGrid products={products} onAddCart={handleAddCart} />
        )}
      </section>
    </div>
  );
}
