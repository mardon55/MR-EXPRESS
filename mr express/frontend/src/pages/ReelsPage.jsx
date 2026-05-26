import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Clapperboard,
  Heart,
  MessageCircle,
  Share2,
  ShoppingBag,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { api } from '../api';
import { useApp } from '../context/AppContext';
import { useTelegram } from '../hooks/useTelegram';

function mediaUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return url.startsWith('/') ? url : `/${url}`;
}

/** Telegram orqali reels ulashish */
function shareReelViaTelegram() {
  const shareUrl = 'https://t.me';
  const webApp = window.Telegram?.WebApp;
  if (webApp?.shareToBot) {
    webApp.shareToBot(shareUrl);
    return;
  }
  window.Telegram?.WebApp?.shareToBot?.(shareUrl);
}

/** Bitta reel slaydi — video, overlay tugmalar va xarid kartasi */
function ReelSlide({
  item,
  isMuted,
  onToggleMute,
  onAddToCart,
  adding,
}) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const product = item.product;
  const displayPrice = item.price ?? product.price;

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

  return (
    <section
      ref={containerRef}
      className="relative h-full w-full shrink-0 snap-start snap-always bg-black"
      aria-label={product.name}
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        src={mediaUrl(item.video_url)}
        loop
        playsInline
        muted={isMuted}
        preload="metadata"
        poster={product.image_url || undefined}
      />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-black/90 via-black/40 to-transparent"
        aria-hidden
      />

      <div className="absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] right-3 z-10 flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={handleLike}
          className="press-fluid flex flex-col items-center gap-0.5 rounded-full bg-black/35 p-2 backdrop-blur-sm"
          aria-label="Layk"
        >
          <Heart
            className={`h-6 w-6 ${liked ? 'fill-red-500 text-red-500' : 'text-white'}`}
            strokeWidth={2}
          />
          <span className="text-[10px] font-semibold text-white">
            {likeCount > 999 ? `${(likeCount / 1000).toFixed(1)}k` : likeCount}
          </span>
        </button>

        <button
          type="button"
          className="press-fluid flex flex-col items-center gap-0.5 rounded-full bg-black/35 p-2 backdrop-blur-sm"
          aria-label="Izohlar"
        >
          <MessageCircle className="h-6 w-6 text-white" strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={shareReelViaTelegram}
          className="press-fluid flex flex-col items-center gap-0.5 rounded-full bg-black/35 p-2 backdrop-blur-sm"
          aria-label="Ulashish"
        >
          <Share2 className="h-6 w-6 text-white" strokeWidth={2} />
          <span className="text-[10px] font-semibold text-white">Ulash</span>
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          className="press-fluid rounded-full bg-black/35 p-2 backdrop-blur-sm"
          aria-label={isMuted ? 'Ovozni yoqish' : 'Ovozni o\'chirish'}
        >
          {isMuted ? (
            <VolumeX className="h-6 w-6 text-white" strokeWidth={2} />
          ) : (
            <Volume2 className="h-6 w-6 text-white" strokeWidth={2} />
          )}
        </button>
      </div>

      <div className="absolute bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] left-3 right-16 z-10">
        <div className="flex items-start gap-2.5 rounded-2xl border border-white/15 bg-black/45 p-2.5 backdrop-blur-md">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt=""
              className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-white/20"
            />
          ) : (
            <div className="h-12 w-12 shrink-0 rounded-xl bg-white/10" />
          )}
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-[13px] font-semibold leading-tight text-white">
              {product.name}
            </p>
            {product.description && (
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/75">
                {product.description}
              </p>
            )}
            <p className="mt-1 text-[15px] font-bold text-emerald-400">
              {displayPrice.toLocaleString('uz-UZ')} so&apos;m
            </p>
          </div>
          <button
            type="button"
            disabled={adding}
            onClick={() => onAddToCart(product)}
            className="press-fluid flex shrink-0 items-center gap-1 rounded-xl bg-ios-blue px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-60"
          >
            <ShoppingBag className="h-4 w-4" strokeWidth={2.25} />
            {adding ? '...' : "Savatga"}
          </button>
        </div>
      </div>
    </section>
  );
}

/** Reels asosiy sahifa — admin paneldan yuklangan videolar */
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
        setError('Reels yuklab bo\'lmadi');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAddToCart = useCallback(
    async (product) => {
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
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-center gap-2 bg-gradient-to-b from-black/70 to-transparent px-4 pb-6 pt-2">
        <Clapperboard className="h-5 w-5 text-white" strokeWidth={2} />
        <span className="text-sm font-semibold text-white">Reels</span>
        <span className="text-[11px] text-white/60">Xitoy tovarlari</span>
      </div>

      {loading && (
        <div className="flex h-full items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      )}

      {!loading && reels.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-white/70">
          <Clapperboard className="h-10 w-10 opacity-50" />
          <p className="text-sm">
            {error || 'Hozircha reel yo\'q. Admin paneldan video qo\'shing.'}
          </p>
        </div>
      )}

      {!loading && reels.length > 0 && (
        <div
          className="reels-scroll hide-scrollbar h-full w-full overflow-y-scroll overscroll-y-contain"
          style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch' }}
        >
          {reels.map((item) => (
            <ReelSlide
              key={item.id}
              item={item}
              isMuted={isMuted}
              onToggleMute={() => setIsMuted((m) => !m)}
              onAddToCart={handleAddToCart}
              adding={addingId === item.product.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
