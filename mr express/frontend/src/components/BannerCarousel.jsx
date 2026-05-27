import { useEffect, useRef, useState } from 'react';
import { resolveUrl } from '../utils/resolveUrl';

export default function BannerCarousel({ banners }) {
  const [active, setActive] = useState(0);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const isDragging = useRef(false);
  const autoPlayRef = useRef(null);

  const count = banners?.length || 0;

  const goTo = (idx) => {
    setActive(((idx % count) + count) % count);
  };

  const prev = () => goTo(active - 1);
  const next = () => goTo(active + 1);

  const resetAutoPlay = () => {
    clearInterval(autoPlayRef.current);
    if (count > 1) {
      autoPlayRef.current = setInterval(() => {
        setActive((i) => (i + 1) % count);
      }, 4500);
    }
  };

  useEffect(() => {
    if (!count) return;
    resetAutoPlay();
    return () => clearInterval(autoPlayRef.current);
  }, [count]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = false;
  };

  const handleTouchMove = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy)) {
      isDragging.current = true;
    }
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (isDragging.current && Math.abs(dx) > 40) {
      if (dx < 0) next();
      else prev();
      resetAutoPlay();
    }
    touchStartX.current = null;
    touchStartY.current = null;
    isDragging.current = false;
  };

  if (!count) return null;

  return (
    <div
      className="glass relative overflow-hidden rounded-squircle-lg shadow-glass-lg select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex transition-fluid duration-500"
        style={{ transform: `translateX(-${active * 100}%)` }}
      >
        {banners.map((b) => (
          <div key={b.id} className="relative min-w-full aspect-[2.15/1]">
            <img
              src={resolveUrl(b.image_url)}
              alt={b.title}
              className="h-full w-full object-cover"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 text-white">
              <h3 className="text-lg font-bold tracking-tight">{b.title}</h3>
              {b.subtitle && (
                <p className="mt-0.5 text-sm font-medium text-white/85">{b.subtitle}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-3 right-4 flex gap-1.5">
        {banners.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => { goTo(i); resetAutoPlay(); }}
            className={`press-fluid h-1.5 rounded-full transition-fluid ${
              i === active ? 'w-5 bg-white' : 'w-1.5 bg-white/45'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
