import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../context/AppContext';
import { useTelegram } from '../hooks/useTelegram';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import ProductGrid from '../components/ProductGrid';
import { resolveUrl } from '../utils/resolveUrl';

const BASE = import.meta.env.BASE_URL;

const SIDEBAR_IMAGES = {
  'elektronika':  `${BASE}categories/sidebar-elektronika.png`,
  'kiyimlar':     `${BASE}categories/sidebar-kiyimlar.png`,
  'uy-rozgor':    `${BASE}categories/sidebar-uy-rozgor.png`,
  'gozallik':     `${BASE}categories/sidebar-gozallik.png`,
  'oyinchoqlar':  `${BASE}categories/sidebar-oyinchoqlar.png`,
};

const HAMMASI_IMAGES = {
  'elektronika':  `${BASE}categories/hammasi-elektronika.png`,
  'kiyimlar':     `${BASE}categories/hammasi-kiyimlar.png`,
  'uy-rozgor':    `${BASE}categories/hammasi-uy-rozgor.png`,
  'gozallik':     `${BASE}categories/hammasi-gozallik.png`,
  'oyinchoqlar':  `${BASE}categories/hammasi-oyinchoqlar.png`,
};

const GLASS_INDICATOR_STYLE = {
  background: 'rgba(0, 122, 255, 0.1)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
};

const SUB_GRADIENTS = [
  'from-blue-400 to-blue-600',
  'from-purple-400 to-purple-600',
  'from-emerald-400 to-emerald-600',
  'from-orange-400 to-orange-600',
  'from-pink-400 to-pink-600',
  'from-cyan-400 to-cyan-600',
  'from-rose-400 to-rose-600',
  'from-amber-400 to-amber-600',
  'from-indigo-400 to-indigo-600',
  'from-teal-400 to-teal-600',
];

function gradientForIndex(i) {
  return SUB_GRADIENTS[i % SUB_GRADIENTS.length];
}

function MainCategoryItem({ category, active, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative z-10 flex w-full flex-col items-center gap-1.5 px-2 py-3.5 transition-all duration-300 ease-in-out ${
        active ? 'opacity-100' : 'opacity-45 hover:opacity-65'
      }`}
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl text-xl transition-all duration-300 ease-in-out overflow-hidden ${
          active ? 'scale-105' : 'scale-100'
        }`}
      >
        {SIDEBAR_IMAGES[category.slug] ? (
          <img
            src={SIDEBAR_IMAGES[category.slug]}
            alt={category.name}
            className="h-full w-full object-cover rounded-xl"
          />
        ) : (
          category.icon || '📦'
        )}
      </span>
      <span
        className={`max-w-[72px] text-center text-[10px] font-semibold leading-tight transition-all duration-300 ease-in-out ${
          active ? 'scale-105 text-[#007AFF]' : 'scale-100 text-neutral-600'
        }`}
      >
        {category.name}
      </span>
    </button>
  );
}

function CategorySidebar({ categories, activeId, onSelect }) {
  const containerRef = useRef(null);
  const itemRefs = useRef({});
  const [indicator, setIndicator] = useState({ top: 0, height: 0 });

  const updateIndicator = useCallback(() => {
    const container = containerRef.current;
    const item = itemRefs.current[activeId];
    if (!container || !item) return;
    const containerRect = container.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    setIndicator({
      top: itemRect.top - containerRect.top + container.scrollTop,
      height: itemRect.height,
    });
  }, [activeId]);

  useLayoutEffect(() => { updateIndicator(); }, [updateIndicator]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const ro = new ResizeObserver(updateIndicator);
    ro.observe(container);
    window.addEventListener('resize', updateIndicator);
    container.addEventListener('scroll', updateIndicator, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateIndicator);
      container.removeEventListener('scroll', updateIndicator);
    };
  }, [updateIndicator]);

  return (
    <aside
      ref={containerRef}
      className="hide-scrollbar relative w-[88px] shrink-0 overflow-y-auto border-r border-neutral-200/80 bg-neutral-100 py-1"
      aria-label="Asosiy kategoriyalar"
    >
      <span
        className="pointer-events-none absolute left-1.5 right-1.5 rounded-2xl transition-all duration-300 ease-in-out"
        style={{ ...GLASS_INDICATOR_STYLE, top: indicator.top, height: indicator.height }}
        aria-hidden
      />
      {categories.map((cat) => (
        <div
          key={cat.id}
          ref={(el) => { itemRefs.current[cat.id] = el; }}
        >
          <MainCategoryItem
            category={cat}
            active={cat.id === activeId}
            onSelect={() => onSelect(cat.id)}
          />
        </div>
      ))}
    </aside>
  );
}

function SubCategoryCard({ sub, index, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="press-fluid flex flex-col items-center gap-2 text-center"
    >
      <div
        className={`aspect-square w-full overflow-hidden rounded-2xl ring-1 ring-white/20 ${
          sub.image_url
            ? 'bg-neutral-100'
            : `bg-gradient-to-br ${gradientForIndex(index)} flex items-center justify-center`
        }`}
      >
        {sub.image_url ? (
          <img
            src={resolveUrl(sub.image_url)}
            alt={sub.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-3xl drop-shadow">{sub.icon || '📦'}</span>
        )}
      </div>
      <span className="line-clamp-2 px-0.5 text-[12px] font-medium leading-snug text-neutral-800">
        {sub.name}
      </span>
    </button>
  );
}

function SubCategoryProducts({ sub, onBack }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { refreshCart } = useApp();
  const { haptic } = useTelegram();

  const loadProducts = useCallback(() => {
    api
      .products({ category_id: sub.id })
      .then(setProducts)
      .catch(() => setProducts([]));
  }, [sub.id]);

  useEffect(() => {
    setLoading(true);
    loadProducts();
    setLoading(false);
  }, [loadProducts]);

  useAutoRefresh(loadProducts, 120_000);

  const handleAddCart = async (product) => {
    const cart = await api.cart().catch(() => ({ items: [] }));
    const existing = cart.items?.find((i) => i.product.id === product.id);
    await api.updateCart(product.id, (existing?.quantity || 0) + 1);
    await refreshCart();
    haptic('success');
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <header className="flex shrink-0 items-center gap-2 border-b border-neutral-100 px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          className="press-fluid flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-700"
          aria-label="Katalogga qaytish"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-neutral-900">{sub.name}</p>
          {sub.parentName && (
            <p className="truncate text-[11px] text-neutral-500">{sub.parentName}</p>
          )}
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 pb-nav-safe">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-ios-blue border-t-transparent" />
          </div>
        ) : (
          <ProductGrid
            products={products}
            onAddCart={handleAddCart}
            emptyMessage="Bu bo'limda hozircha mahsulot yo'q"
          />
        )}
      </div>
    </div>
  );
}

export default function CatalogPage() {
  const [categories, setCategories] = useState([]);
  const [allFlat, setAllFlat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMainId, setActiveMainId] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);
  const { haptic } = useTelegram();

  useEffect(() => {
    api
      .categories()
      .then((data) => {
        const flat = Array.isArray(data) ? data : [];
        const parents = flat
          .filter((c) => !c.parent_id)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        setAllFlat(flat);
        setCategories(parents);
        if (parents.length > 0) setActiveMainId(parents[0].id);
      })
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  const activeMain = useMemo(
    () => categories.find((c) => c.id === activeMainId) ?? null,
    [categories, activeMainId]
  );

  const subcategories = useMemo(() => {
    if (!activeMainId) return [];
    return allFlat
      .filter((c) => c.parent_id === activeMainId)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [allFlat, activeMainId]);

  const backToGrid = useCallback(() => {
    haptic('light');
    setSelectedSub(null);
  }, [haptic]);

  useEffect(() => {
    if (selectedSub) {
      window.__tgBackHandler = backToGrid;
      return () => { window.__tgBackHandler = null; };
    }
  }, [selectedSub, backToGrid]);

  const openSub = (sub) => {
    haptic('light');
    setSelectedSub({ ...sub, parentName: activeMain?.name });
  };

  const openAll = () => {
    haptic('light');
    setSelectedSub({
      id: activeMainId,
      name: `${activeMain?.name} — Hammasi`,
      icon: activeMain?.icon,
      parentName: null,
    });
  };

  if (selectedSub) {
    return (
      <div className="flex h-full flex-col bg-white">
        <SubCategoryProducts sub={selectedSub} onBack={backToGrid} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-neutral-100">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-ios-blue border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-neutral-100">
      <div className="flex min-h-0 flex-1">
        <CategorySidebar
          categories={categories}
          activeId={activeMainId}
          onSelect={(id) => {
            haptic('light');
            setActiveMainId(id);
          }}
        />

        <main
          className="min-w-0 flex-1 overflow-y-auto bg-white px-3 pb-nav-safe pt-3"
          aria-label="Sub-kategoriyalar"
        >
          <h1 className="mb-3 text-[17px] font-bold text-neutral-900">
            {activeMain?.name ?? ''}
          </h1>

          {subcategories.length === 0 ? (
            <div
              className="press-fluid flex flex-col items-center gap-2 text-center"
              role="button"
              tabIndex={0}
              onClick={openAll}
              onKeyDown={(e) => e.key === 'Enter' && openAll()}
            >
              <div
                className={`aspect-square w-full overflow-hidden rounded-2xl bg-gradient-to-br ${gradientForIndex(
                  0
                )} flex items-center justify-center ring-1 ring-white/20`}
              >
                <span className="text-3xl drop-shadow">{activeMain?.icon || '📦'}</span>
              </div>
              <span className="line-clamp-2 px-0.5 text-[12px] font-medium leading-snug text-neutral-800">
                Hammasi
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={openAll}
                className="press-fluid flex flex-col items-center gap-2 text-center"
              >
                <div className="aspect-square w-full overflow-hidden rounded-2xl ring-1 ring-white/20">
                  {HAMMASI_IMAGES[activeMain?.slug] ? (
                    <img
                      src={HAMMASI_IMAGES[activeMain?.slug]}
                      alt="Hammasi"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                      <span className="text-2xl drop-shadow">🗂️</span>
                    </div>
                  )}
                </div>
                <span className="line-clamp-2 px-0.5 text-[12px] font-medium leading-snug text-neutral-800">
                  Hammasi
                </span>
              </button>

              {subcategories.map((sub, i) => (
                <SubCategoryCard
                  key={sub.id}
                  sub={sub}
                  index={i}
                  onOpen={() => openSub(sub)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
