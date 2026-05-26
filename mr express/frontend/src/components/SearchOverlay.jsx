import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useApp } from '../context/AppContext';
import { useTelegram } from '../hooks/useTelegram';
import ProductCard from './ProductCard';
import { IconSearch } from './icons/TabIcons';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function SearchOverlay({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const { refreshCart } = useApp();
  const { haptic } = useTelegram();
  const debouncedQuery = useDebounce(query, 350);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults(null);
      setTimeout(() => inputRef.current?.focus(), 80);
      window.__tgBackHandler = () => {
        setQuery('');
        setResults(null);
        onClose();
      };
      return () => {
        window.__tgBackHandler = null;
      };
    }
  }, [open, onClose]);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    api
      .products({ q: debouncedQuery.trim() })
      .then((data) => setResults(data))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-theme-bg"
      style={{ paddingTop: 'var(--tg-header-offset)' }}
    >
      <div className="shrink-0 px-4 pt-3 pb-3 border-b border-theme bg-theme-bg">
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
            <IconSearch />
          </span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Mahsulot qidirish..."
            className="w-full rounded-xl border border-theme bg-theme-card py-3 pl-10 pr-4 text-[15px] font-medium text-theme outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--theme-accent)] placeholder:text-theme-muted"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3">
        {loading && (
          <div className="flex justify-center py-10">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--theme-accent)] border-t-transparent" />
          </div>
        )}

        {!loading && results === null && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-4xl">🔍</span>
            <p className="mt-3 text-[16px] font-semibold text-theme">Qidiruvni boshlang</p>
            <p className="mt-1.5 text-[13px] text-theme-muted">
              Mahsulot nomi yoki kategoriyasini yozing
            </p>
          </div>
        )}

        {!loading && results !== null && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-4xl">😕</span>
            <p className="mt-3 text-[16px] font-semibold text-theme">Hech narsa topilmadi</p>
            <p className="mt-1.5 text-[13px] text-theme-muted">
              &ldquo;{debouncedQuery}&rdquo; bo&apos;yicha natija yo&apos;q
            </p>
          </div>
        )}

        {!loading && results !== null && results.length > 0 && (
          <>
            <p className="mb-3 text-[12px] font-medium text-theme-muted">
              {results.length} ta natija topildi
            </p>
            <div className="grid grid-cols-2 gap-3">
              {results.map((product) => (
                <ProductCard key={product.id} product={product} onAddCart={handleAddCart} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
