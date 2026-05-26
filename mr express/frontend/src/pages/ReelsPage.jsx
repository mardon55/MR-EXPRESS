import { useCallback, useEffect, useRef, useState } from 'react';
import { Clapperboard, Heart, ShoppingBag, VolumeX, Volume2 } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../context/AppContext';
import { useTelegram } from '../hooks/useTelegram';

function mediaUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return url.startsWith('/') ? url : `/${url}`;
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
    if (adding || added) return;
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
        poster={product?.image_url || undefined}
        onClick={onToggleMute}
      />

      {/* Qorong'ilik gradient */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/85 via-black/30 to-transparent"
        aria-hidden
      />

      {/* Ovoz indikatori — ekran yuqori chap */}
      <div className="pointer-events-none absolute left-3 top-3 z-10">
        {isMuted ? (
          <div className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 backdrop-blur-sm">
            <VolumeX className="h-3.5 w-3.5 text-white/70" strokeWidth={2} />
            <span className="text-[10px] text-white/70">Ovoz o'chiq</span>
          </div>
        ) : null}
      </div>

      {/* O'ng tomonda — faqat yurakcha */}
      <div className="absolute bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] right-3 z-10 flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={handleLike}
          className="press-fluid flex flex-col items-center gap-1 rounded-full bg-black/40 p-2.5 backdrop-blur-sm"
          aria-label="Layk"
        >
          <Heart
            className={`h-7 w-7 transition-colors ${liked ? 'fill-red-500 text-red-500' : 'text-white'}`}
            strokeWidth={2}
          />
          {likeCount > 0 && (
            <span className="text-[11px] font-semibold text-white">
              {likeCount > 999 ? `${(likeCount / 1000).toFixed(1)}k` : likeCount}
            </span>
          )}
        </button>
      </div>

      {/* Pastki qism — mahsulot + savatcha */}
      <div className="absolute bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] left-3 right-14 z-10">
        <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/50 p-3 backdrop-blur-md">
          {product?.image_url ? (
            <img
              src={product.image_url}
              alt=""
              className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-white/20"
            />
          ) : (
            <div className="h-12 w-12 shrink-0 rounded-xl bg-white/10" />
          )}
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-[13px] font-semibold text-white">
              {product?.name}
            </p>
            <p className="mt-0.5 text-[14px] font-bold text-emerald-400">
              {displayPrice.toLocaleString('uz-UZ')} so&apos;m
            </p>
          </div>
          <button
            type="button"
            disabled={adding}
            onClick={handleCart}
            className={`press-fluid flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2.5 text-[12px] font-semibold text-white transition-colors ${
              added ? 'bg-emerald-500' : 'bg-ios-blue'
            } disabled:opacity-60`}
          >
            <ShoppingBag className="h-4 w-4" strokeWidth={2.25} />
            {adding ? '...' : added ? '✓' : 'Savat'}
          </button>
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
