import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  Home,
  Shirt,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { api } from '../api';
import { useApp } from '../context/AppContext';
import { useTelegram } from '../hooks/useTelegram';
import ProductGrid from '../components/ProductGrid';

/**
 * Katalog daraxti — Xitoydan import tovarlar uchun asosiy va sub-kategoriyalar.
 * apiCategoryId: backend products jadvalidagi category_id bilan bog'lanadi.
 */
const CATALOG_TREE = [
  {
    id: 'elektronika',
    name: 'Elektronika',
    icon: Smartphone,
    apiCategoryId: 1,
    subcategories: [
      {
        id: 'phones',
        name: 'Telefonlar',
        image:
          'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&h=200&fit=crop',
        searchHint: 'telefon',
      },
      {
        id: 'earphones',
        name: 'Quloqchinlar',
        image:
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop',
        searchHint: 'quloqchin AirPods',
      },
      {
        id: 'smartwatch',
        name: 'Smart soatlar',
        image:
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop',
        searchHint: 'soat',
      },
      {
        id: 'powerbank',
        name: 'Powerbank',
        image:
          'https://images.unsplash.com/photo-1609091839311-d5365f9ff1e5?w=200&h=200&fit=crop',
        searchHint: 'powerbank',
      },
    ],
  },
  {
    id: 'kiyim',
    name: 'Kiyim-kechak',
    icon: Shirt,
    apiCategoryId: 2,
    subcategories: [
      {
        id: 'men',
        name: "Erkaklar kiyimi",
        image:
          'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=200&h=200&fit=crop',
        searchHint: "erkak ko'ylak",
      },
      {
        id: 'women',
        name: 'Ayollar kiyimi',
        image:
          'https://images.unsplash.com/photo-1483985988350-763728e3685b?w=200&h=200&fit=crop',
        searchHint: 'ayol sumka kiyim',
      },
      {
        id: 'shoes',
        name: 'Oyoq kiyimlar',
        image:
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop',
        searchHint: 'oyoq kiyim',
      },
      {
        id: 'hats',
        name: 'Shapkalar',
        image:
          'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=200&h=200&fit=crop',
        searchHint: 'shapka',
      },
    ],
  },
  {
    id: 'uy',
    name: 'Uy va Oshxona',
    icon: Home,
    apiCategoryId: 3,
    subcategories: [
      {
        id: 'kitchen',
        name: 'Oshxona jihozlari',
        image:
          'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=200&h=200&fit=crop',
        searchHint: 'kofe mashina oshxona',
      },
      {
        id: 'lights',
        name: 'Chiroqlar',
        image:
          'https://images.unsplash.com/photo-1565814636192-845e4d4d1b0e?w=200&h=200&fit=crop',
        searchHint: 'chiroq lampa',
      },
      {
        id: 'decor',
        name: 'Uy bezaklari',
        image:
          'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&h=200&fit=crop',
        searchHint: 'bezak uy',
      },
    ],
  },
  {
    id: 'gozallik',
    name: "Go'zallik",
    icon: Sparkles,
    apiCategoryId: 4,
    subcategories: [
      {
        id: 'perfume',
        name: 'Parfyumeriya',
        image:
          'https://images.unsplash.com/photo-1541643600914-78b084683601?w=200&h=200&fit=crop',
        searchHint: 'parfyum',
      },
      {
        id: 'makeup',
        name: 'Kosmetika',
        image:
          'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop',
        searchHint: 'kosmetika',
      },
      {
        id: 'skincare',
        name: 'Terini parvarishlash',
        image:
          'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=200&h=200&fit=crop',
        searchHint: 'terini krem',
      },
    ],
  },
];

const GLASS_INDICATOR_STYLE = {
  background: 'rgba(0, 122, 255, 0.1)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
};

/** Chap panel — bitta asosiy kategoriya tugmasi (fon indikator alohida siljiydi) */
function MainCategoryItem({ category, active, onSelect }) {
  const Icon = category.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative z-10 flex w-full flex-col items-center gap-1.5 px-2 py-3.5 transition-all duration-300 ease-in-out ${
        active ? 'opacity-100' : 'opacity-45 hover:opacity-65'
      }`}
    >
      <span
        className={`flex h-9 w-9 items-center justify-center transition-all duration-300 ease-in-out ${
          active
            ? 'scale-105 text-[#007AFF]'
            : 'scale-100 text-neutral-500'
        }`}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 2} />
      </span>
      <span
        className={`max-w-[72px] text-center text-[10px] font-semibold leading-tight transition-all duration-300 ease-in-out ${
          active
            ? 'scale-105 text-[#007AFF]'
            : 'scale-100 text-neutral-600'
        }`}
      >
        {category.name}
      </span>
    </button>
  );
}

/** Chap panel — suyuq shisha indikator va kategoriya ro'yxati */
function CategorySidebar({ activeMainId, onSelect }) {
  const containerRef = useRef(null);
  const itemRefs = useRef({});
  const [indicator, setIndicator] = useState({ top: 0, height: 0 });

  const updateIndicator = useCallback(() => {
    const container = containerRef.current;
    const item = itemRefs.current[activeMainId];
    if (!container || !item) return;

    const containerRect = container.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    setIndicator({
      top: itemRect.top - containerRect.top + container.scrollTop,
      height: itemRect.height,
    });
  }, [activeMainId]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

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
        style={{
          ...GLASS_INDICATOR_STYLE,
          top: indicator.top,
          height: indicator.height,
        }}
        aria-hidden
      />
      {CATALOG_TREE.map((cat) => (
        <div
          key={cat.id}
          ref={(el) => {
            itemRefs.current[cat.id] = el;
          }}
        >
          <MainCategoryItem
            category={cat}
            active={cat.id === activeMainId}
            onSelect={() => onSelect(cat.id)}
          />
        </div>
      ))}
    </aside>
  );
}

/** O'ng panel — sub-kategoriya kartochkasi */
function SubCategoryCard({ sub, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="press-fluid flex flex-col items-center gap-2 text-center"
    >
      <div className="aspect-square w-full overflow-hidden rounded-2xl bg-neutral-100 ring-1 ring-neutral-200/80">
        <img
          src={sub.image}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <span className="line-clamp-2 px-0.5 text-[12px] font-medium leading-snug text-neutral-800">
        {sub.name}
      </span>
    </button>
  );
}

/** Sub-kategoriya mahsulotlari ro'yxati */
function SubCategoryProducts({ sub, mainCategory, onBack }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { refreshCart } = useApp();
  const { haptic } = useTelegram();

  useEffect(() => {
    setLoading(true);
    const params = { category_id: mainCategory.apiCategoryId };
    if (sub.searchHint) params.q = sub.searchHint;
    api
      .products(params)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [sub.id, mainCategory.apiCategoryId, sub.searchHint]);

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
          <p className="truncate text-[11px] text-neutral-500">{mainCategory.name}</p>
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

/**
 * Katalog — Uzum/Xitoy uslubidagi split-layout (chap sidebar + o'ng grid).
 */
export default function CatalogPage() {
  const [activeMainId, setActiveMainId] = useState(CATALOG_TREE[0].id);
  const [selectedSub, setSelectedSub] = useState(null);
  const { haptic } = useTelegram();

  const activeMain = useMemo(
    () => CATALOG_TREE.find((c) => c.id === activeMainId) ?? CATALOG_TREE[0],
    [activeMainId]
  );

  const openSub = (sub) => {
    haptic('light');
    setSelectedSub(sub);
  };

  const backToGrid = () => {
    haptic('light');
    setSelectedSub(null);
  };

  if (selectedSub) {
    return (
      <div className="flex h-full flex-col bg-white">
        <SubCategoryProducts
          sub={selectedSub}
          mainCategory={activeMain}
          onBack={backToGrid}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-neutral-100">
      <div className="flex min-h-0 flex-1">
        <CategorySidebar
          activeMainId={activeMainId}
          onSelect={(id) => {
            haptic('light');
            setActiveMainId(id);
          }}
        />

        {/* O'ng panel — tanlangan kategoriyaning sub-kategoriyalari */}
        <main
          className="min-w-0 flex-1 overflow-y-auto bg-white px-3 pb-nav-safe pt-3"
          aria-label="Sub-kategoriyalar"
        >
          <h1 className="mb-3 text-[17px] font-bold text-neutral-900">{activeMain.name}</h1>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
            {activeMain.subcategories.map((sub) => (
              <SubCategoryCard key={sub.id} sub={sub} onOpen={() => openSub(sub)} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
