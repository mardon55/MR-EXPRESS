import { useEffect, useState } from 'react';

export default function BannerCarousel({ banners }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!banners?.length) return;
    const t = setInterval(() => setActive((i) => (i + 1) % banners.length), 4500);
    return () => clearInterval(t);
  }, [banners?.length]);

  if (!banners?.length) return null;

  return (
    <div className="glass relative overflow-hidden rounded-squircle-lg shadow-glass-lg">
      <div
        className="flex transition-fluid duration-500"
        style={{ transform: `translateX(-${active * 100}%)` }}
      >
        {banners.map((b) => (
          <div key={b.id} className="relative min-w-full aspect-[2.15/1]">
            <img
              src={b.image_url}
              alt={b.title}
              className="h-full w-full object-cover"
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
            onClick={() => setActive(i)}
            className={`press-fluid h-1.5 rounded-full transition-fluid ${
              i === active ? 'w-5 bg-white' : 'w-1.5 bg-white/45'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
