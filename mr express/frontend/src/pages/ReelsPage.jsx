import { useCallback, useEffect, useRef, useState } from 'react';
import { Clapperboard, Heart, ShoppingCart } from 'lucide-react';
import { api } from '../api';
import { resolveUrl } from '../utils/resolveUrl';
import { useApp } from '../context/AppContext';
import { useTelegram } from '../hooks/useTelegram';

function mediaUrl(url) {
  return resolveUrl(url);
}

function ReelSlide({ item, isMuted, onToggleMute, onAddToCart, adding }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [added, setAdded] = useState(false);

  const product = item.product;
  const displayPrice = item.price ?? product?.price ?? 0;

  useEffect(() => {
    const root = containerRef.current;
    const video = videoRef.current;
    if (!root || !video) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: [0, 0.55, 0.85, 1] }
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = isMuted;
  }, [isMuted]);

  const handleLike = () => {
    setLiked((prev) => {
      setLikeCount((c) => (prev ? Math.max(0, c - 1) : c + 1));
      return !prev;
    });
  };

  const handleCart = async () => {
    if (adding || added || !product) return;
    await onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <section
      ref={containerRef}
      className="relative h-full w-full shrink-0 snap-start snap-always bg-black"
      aria-label={product?.name}
    >
      {/* Video */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        src={mediaUrl(item.video_url)}
        loop
        playsInline
        muted={isMuted}
        preload="metadata"
        poster={resolveUrl(product?.image_url)}
        onClick={onToggleMute}
      />

      {/* Gradient */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/85 via-black/30 to-transparent"
        aria-hidden
      />

      {/* O'ng tomon — faqat yurakcha va savatcha */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom,20px)+5.5rem)] right-3 z-10 flex flex-col items-center gap-3">
        {/* Yurakcha tugmasi */}
        <button
          type="button"
          onClick={handleLike}
          className="press-fluid flex flex-col items-center gap-0.5 rounded-full bg-black/40 p-2 backdrop-blur-sm"
          aria-label="Layk"
        >
          <Heart
            className={`h-6 w-6 transition-colors ${liked ? 'fill-red-500 text-red-500' : 'text-white'}`}
            strokeWidth={2}
          />
          {likeCount > 0 && (
            <span className="text-[10px] font-semibold text-white">
              {likeCount > 999 ? `${(likeCount / 1000).toFixed(1)}k` : likeCount}
            </span>
          )}
        </button>

        {/* Savatcha tugmasi */}
        <button
          type="button"
          onClick={handleCart}
          disabled={adding || !product}
          className={`press-fluid flex flex-col items-center gap-0.5 rounded-full p-2 backdrop-blur-sm transition-colors ${
            added
              ? 'bg-emerald-500/80'
              : 'bg-black/40'
          } disabled:opacity-50`}
          aria-label="Savatchaga qo'shish"
        >
          <ShoppingCart
            className="h-6 w-6 text-white"
            strokeWidth={2}
          />
          <span className="text-[10px] font-semibold text-white">
            {adding ? '...' : added ? '✓' : 'Savat'}
          </span>
        </button>
      </div>

      {/* Pastki — ixcham mahsulot nomi va narxi */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom,20px)+4.75rem)] left-3 right-[5rem] z-10">
        <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/50 p-2 backdrop-blur-md">
          {product?.image_url ? (
            <img
              src={resolveUrl(product.image_url)}
              alt=""
              className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-white/20"
            />
          ) : (
            <div className="h-9 w-9 shrink-0 rounded-lg bg-white/10" />
          )}
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-[12px] font-semibold text-white">
              {product?.name || 'Mahsulot'}
            </p>
            <p className="text-[12px] font-bold text-emerald-400">
              {displayPrice.toLocaleString('uz-UZ')} so&apos;m
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ReelsPage() {
  const { refreshCart } = useApp();
  const { haptic } = useTelegram();
  const [isMuted, setIsMuted] = useState(true);
  const [addingId, setAddingId] = useState(null);
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api
      .reels()
      .then(setReels)
      .catch(() => {
        setReels([]);
        setError("Reels yuklab bo'lmadi");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAddToCart = useCallback(
    async (product) => {
      if (!product) return;
      setAddingId(product.id);
      try {
        const cart = await api.cart().catch(() => ({ items: [] }));
        const existing = cart.items?.find((i) => i.product.id === product.id);
        const qty = (existing?.quantity || 0) + 1;
        await api.updateCart(product.id, qty);
        await refreshCart();
        haptic('success');
      } catch (e) {
        console.error(e);
        haptic('error');
      } finally {
        setAddingId(null);
      }
    },
    [refreshCart, haptic]
  );

  return (
    <div className="relative h-full w-full bg-black">
      {/* Sarlavha */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-center gap-2 bg-gradient-to-b from-black/60 to-transparent px-4 pb-5 pt-3">
        <Clapperboard className="h-5 w-5 text-white" strokeWidth={2} />
        <span className="text-sm font-semibold text-white">Reels</span>
      </div>

      {loading && (
        <div className="flex h-full items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      )}

      {!loading && reels.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-white/70">
          <Clapperboard className="h-12 w-12 opacity-40" />
          <p className="text-sm">
            {error || "Hozircha reel yo'q. Admin paneldan video qo'shing."}
          </p>
        </div>
      )}

      {!loading && reels.length > 0 && (
        <div
          className="hide-scrollbar h-full w-full overflow-y-scroll overscroll-y-contain"
          style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch' }}
        >
          {reels.map((item) => (
            <ReelSlide
              key={item.id}
              item={item}
              isMuted={isMuted}
              onToggleMute={() => setIsMuted((m) => !m)}
              onAddToCart={handleAddToCart}
              adding={addingId === item.product?.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
