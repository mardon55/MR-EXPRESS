import { Link } from 'react-router-dom';
import { formatPrice } from '../api';
import { useApp } from '../context/AppContext';
import { useTelegram } from '../hooks/useTelegram';
import { IconHeartFilled, IconPlus } from './icons/TabIcons';

export default function ProductCard({ product, onAddCart }) {
  const { isFavorite, toggleFavorite } = useApp();
  const { haptic } = useTelegram();
  const fav = isFavorite(product.id);
  const discount =
    product.old_price && product.old_price > product.price
      ? Math.round((1 - product.price / product.old_price) * 100)
      : null;

  const handleFav = async (e) => {
    e.preventDefault();
    haptic('light');
    await toggleFavorite(product.id);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    haptic('medium');
    onAddCart?.(product);
  };

  return (
    <Link
      to={`/product/${product.id}`}
      className="press-fluid glass block overflow-hidden rounded-squircle shadow-glass"
    >
      <div className="relative aspect-square overflow-hidden rounded-t-squircle bg-white/20">
        <img
          src={product.image_url}
          alt={product.name}
          className="h-full w-full object-cover transition-fluid duration-500 hover:scale-[1.03]"
          loading="lazy"
        />
        {discount && (
          <span className="absolute left-3 top-3 rounded-squircle bg-ios-red/90 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            -{discount}%
          </span>
        )}
        <button
          type="button"
          onClick={handleFav}
          className="press-fluid glass-subtle absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full shadow-glass"
        >
          <IconHeartFilled filled={fav} />
        </button>
      </div>
      <div className="p-3.5">
        <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-neutral-800">
          {product.name}
        </h3>
        <div className="mt-2 flex items-end justify-between gap-2">
          <div>
            <p className="text-[15px] font-bold tracking-tight text-ios-blue">
              {formatPrice(product.price)}
            </p>
            {product.old_price && (
              <p className="text-[11px] text-neutral-400 line-through">
                {formatPrice(product.old_price)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="press-fluid flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ios-blue text-white shadow-glass"
          >
            <IconPlus />
          </button>
        </div>
      </div>
    </Link>
  );
}
