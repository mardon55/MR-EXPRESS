import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Minus, Plus, Star, ImagePlus, X } from 'lucide-react';
import { api, formatPrice } from '../api';
import { resolveUrl } from '../utils/resolveUrl';
import { useApp } from '../context/AppContext';
import { useTelegram } from '../hooks/useTelegram';
import { IconChevronLeft, IconHeartFilled } from '../components/icons/TabIcons';

const ATTR_LABELS = {
  brand: 'Brend',
  material: 'Material',
  warranty: 'Kafolat',
  volume: 'Hajm',
  skin_type: 'Teri turi',
  age_range: 'Yosh',
  dimensions: "O'lchamlari",
  storage: 'Xotira',
  ram: 'RAM',
  sizes: "O'lchamlar",
  colors: 'Ranglar',
};

const VARIANT_KEYS = ['sizes', 'colors', 'storage', 'ram'];
const SPEC_KEYS = ['brand', 'material', 'warranty', 'volume', 'skin_type', 'age_range', 'dimensions'];

function getVariantGroups(product) {
  if (!product?.attributes) return [];
  const groups = [];
  for (const key of VARIANT_KEYS) {
    const val = product.attributes[key];
    if (Array.isArray(val) && val.length > 0) {
      groups.push({ key, label: ATTR_LABELS[key] || key, options: val });
    }
  }
  if (groups.length === 0 && product.category_id === 2) {
    groups.push({ key: 'sizes', label: "O'lchamlar", options: ['S', 'M', 'L', 'XL'] });
  }
  return groups;
}

function getSpecs(product) {
  if (!product?.attributes) return [];
  const specs = [];
  for (const key of SPEC_KEYS) {
    const val = product.attributes[key];
    if (!val) continue;
    const label = ATTR_LABELS[key] || key;
    specs.push({ label, value: Array.isArray(val) ? val.join(', ') : val });
  }
  return specs;
}

function StarRow({ value, onChange, size = 28 }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange?.(s)}
          className="press-fluid"
          aria-label={`${s} yulduz`}
        >
          <Star
            size={size}
            strokeWidth={1.5}
            className={s <= value ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review }) {
  const [lightbox, setLightbox] = useState(null);
  const date = review.created_at
    ? new Date(review.created_at).toLocaleDateString('uz-UZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '';

  return (
    <div className="rounded-2xl bg-neutral-50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ios-blue/10 text-[14px] font-bold text-ios-blue">
            {review.user_name?.[0]?.toUpperCase() || 'M'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-neutral-800">
              {review.user_name}
            </p>
            <div className="mt-0.5 flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={13}
                  strokeWidth={1.5}
                  className={
                    s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'
                  }
                />
              ))}
            </div>
          </div>
        </div>
        {date && <span className="shrink-0 text-[12px] text-neutral-400">{date}</span>}
      </div>

      {review.comment && (
        <p className="mt-3 text-[14px] leading-relaxed text-neutral-600">{review.comment}</p>
      )}

      {review.photos?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {review.photos.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setLightbox(url)}
              className="press-fluid h-16 w-16 overflow-hidden rounded-xl border border-neutral-200"
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-2xl object-contain" />
        </div>
      )}
    </div>
  );
}

function ProductReviews({ productId }) {
  const { haptic } = useTelegram();
  const fileInputRef = useRef(null);

  const [reviews, setReviews] = useState([]);
  const [canReview, setCanReview] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const loadReviews = useCallback(() => {
    api.getReviews(productId).then(setReviews).catch(() => {});
  }, [productId]);

  useEffect(() => {
    loadReviews();
    api.canReview(productId).then((res) => setCanReview(res.can_review)).catch(() => {});
  }, [productId, loadReviews]);

  useEffect(() => {
    const handler = () => loadReviews();
    window.addEventListener('mrexpress:refresh', handler);
    return () => window.removeEventListener('mrexpress:refresh', handler);
  }, [loadReviews]);

  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p));
  }, [previews]);

  const handlePhotoChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (photos.length + selected.length > 6) {
      setError('Maksimal 6 ta rasm tanlash mumkin');
      return;
    }
    const newFiles = [...photos, ...selected].slice(0, 6);
    setPhotos(newFiles);
    setPreviews(newFiles.map((f) => URL.createObjectURL(f)));
    setError('');
    e.target.value = '';
  };

  const removePhoto = (idx) => {
    const newFiles = photos.filter((_, i) => i !== idx);
    setPhotos(newFiles);
    setPreviews(newFiles.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      let photoUrls = [];
      if (photos.length > 0) {
        const res = await api.uploadReviewPhotos(photos);
        photoUrls = res.urls || [];
      }
      await api.createReview(productId, { rating, comment: comment.trim() || null, photos: photoUrls });
      haptic('success');
      setSubmitted(true);
      setShowForm(false);
      setCanReview(false);
      setPhotos([]);
      setPreviews([]);
      setComment('');
      setRating(5);
      loadReviews();
    } catch (e) {
      haptic('error');
      setError(e.message || 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  return (
    <section className="mt-7">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-neutral-800">
          Sharhlar
          {reviews.length > 0 && (
            <span className="ml-2 text-[13px] font-normal text-neutral-400">
              ({reviews.length})
            </span>
          )}
        </h2>
        {avgRating && (
          <div className="flex items-center gap-1">
            <Star size={14} className="fill-amber-400 text-amber-400" strokeWidth={1.5} />
            <span className="text-[14px] font-bold text-neutral-700">{avgRating}</span>
          </div>
        )}
      </div>

      {submitted && (
        <div className="mb-3 rounded-xl bg-green-50 px-4 py-3 text-[13px] font-medium text-green-700">
          ✅ Sharhingiz qo&apos;shildi, rahmat!
        </div>
      )}

      {canReview && !showForm && (
        <button
          type="button"
          onClick={() => { setShowForm(true); haptic('light'); }}
          className="press-fluid mb-4 w-full rounded-2xl border-2 border-dashed border-ios-blue/40 bg-ios-blue/5 py-3.5 text-[14px] font-semibold text-ios-blue"
        >
          ✍️ Sharh yozish
        </button>
      )}

      {showForm && (
        <div className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-[14px] font-semibold text-neutral-800">Bahoyingiz</p>
          <StarRow value={rating} onChange={(v) => { setRating(v); haptic('light'); }} />

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Fikr-mulohazangizni yozing (ixtiyoriy)..."
            rows={3}
            maxLength={500}
            className="mt-3 w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[14px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
          />

          <div className="mt-3">
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoChange} />
            <div className="flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative h-16 w-16">
                  <img src={src} alt="" className="h-full w-full rounded-xl border border-neutral-200 object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-700 text-white shadow"
                  >
                    <X size={10} strokeWidth={3} />
                  </button>
                </div>
              ))}
              {photos.length < 6 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="press-fluid flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 text-neutral-400"
                >
                  <ImagePlus size={18} strokeWidth={1.5} />
                  <span className="text-[10px]">{photos.length}/6</span>
                </button>
              )}
            </div>
          </div>

          {error && <p className="mt-2 text-[12px] font-medium text-red-500">{error}</p>}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); setPhotos([]); setPreviews([]); setComment(''); setRating(5); setError(''); haptic('light'); }}
              className="press-fluid flex-1 rounded-xl border border-neutral-200 py-2.5 text-[14px] font-semibold text-neutral-600"
            >
              Bekor
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="press-fluid flex-1 rounded-xl bg-ios-blue py-2.5 text-[14px] font-semibold text-white disabled:opacity-60"
            >
              {submitting ? 'Yuborilmoqda...' : 'Yuborish'}
            </button>
          </div>
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="rounded-2xl bg-neutral-50 px-4 py-5 text-center text-[14px] text-neutral-400">
          Hali sharhlar yo&apos;q.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [activeImage, setActiveImage] = useState(0);
  const { isFavorite, toggleFavorite, refreshCart } = useApp();
  const { haptic, tg } = useTelegram();
  const navigate = useNavigate();

  useEffect(() => {
    api.product(id).then((p) => {
      setProduct(p);
      setActiveImage(0);
    }).catch(() => navigate(-1));
  }, [id, navigate]);

  useEffect(() => {
    if (!product) return;
    const groups = getVariantGroups(product);
    const defaults = {};
    groups.forEach((g) => { defaults[g.key] = g.options[0]; });
    setSelectedVariants(defaults);
  }, [product?.id]);

  if (!product) {
    return (
      <div className="flex h-full items-center justify-center bg-theme-bg">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-ios-blue border-t-transparent" />
      </div>
    );
  }

  const variantGroups = getVariantGroups(product);
  const specs = getSpecs(product);
  const images = product.images?.length ? product.images : (product.image_url ? [product.image_url] : []);
  const discount =
    product.old_price && product.old_price > product.price
      ? Math.round((1 - product.price / product.old_price) * 100)
      : null;

  const rawDescription = product.description?.trim() || '';
  const isHtml = rawDescription.includes('<') && rawDescription.includes('>');

  const addToCart = async () => {
    const cart = await api.cart().catch(() => ({ items: [] }));
    const existing = cart.items?.find((i) => i.product.id === product.id);
    await api.updateCart(product.id, (existing?.quantity || 0) + qty);
    await refreshCart();
    haptic('success');
    const variantText = Object.entries(selectedVariants)
      .filter(([, v]) => v)
      .map(([k, v]) => `${ATTR_LABELS[k] || k}: ${v}`)
      .join(', ');
    tg?.showAlert?.(`Savatchaga qo'shildi!${variantText ? '\n' + variantText : ''}`);
  };

  const toggleFav = async () => {
    await toggleFavorite(product.id);
    haptic('light');
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto overflow-x-hidden bg-theme-bg">
      <div className="relative w-full shrink-0">
        <img
          src={resolveUrl(images[activeImage] || product.image_url)}
          alt={product.name}
          className="h-80 w-full object-cover"
        />
        {discount != null && (
          <span className="absolute left-3 bottom-3 rounded-xl bg-ios-red/90 px-2.5 py-1 text-[12px] font-bold text-white backdrop-blur-sm">
            -{discount}%
          </span>
        )}
        <div className="pointer-events-none absolute inset-x-0 top-3 flex items-center justify-between px-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Ortga qaytish"
            className="pointer-events-auto press-fluid flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-neutral-800 shadow-md backdrop-blur-sm"
          >
            <IconChevronLeft />
          </button>
          <button
            type="button"
            onClick={toggleFav}
            aria-label="Sevimlilar"
            className="pointer-events-auto press-fluid flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm"
          >
            <IconHeartFilled filled={isFavorite(product.id)} />
          </button>
        </div>

        {images.length > 1 && (
          <div className="absolute bottom-3 right-3 flex gap-1.5">
            {images.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveImage(i)}
                className={`h-10 w-10 overflow-hidden rounded-xl border-2 transition-all ${
                  activeImage === i ? 'border-ios-blue' : 'border-white/60'
                }`}
              >
                <img src={resolveUrl(img)} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 bg-white px-4 pb-28 pt-4">
        <div className="flex flex-wrap items-start gap-2">
          <h1 className="min-w-0 flex-1 text-[22px] font-bold leading-tight tracking-tight text-neutral-900">
            {product.name}
          </h1>
        </div>

        <p className="mt-1 text-[13px] text-neutral-400">
          Omborda: <span className="font-semibold text-neutral-600">{product.stock} ta</span>
        </p>

        <div className="mt-3 flex flex-wrap items-baseline gap-3">
          <span className="text-[26px] font-bold tracking-tight text-ios-blue">
            {formatPrice(product.price)}
          </span>
          {product.old_price != null && product.old_price > product.price && (
            <span className="text-[15px] font-medium text-neutral-400 line-through">
              {formatPrice(product.old_price)}
            </span>
          )}
        </div>

        {variantGroups.map((group) => (
          <section key={group.key} className="mt-5" aria-label={group.label}>
            <h2 className="mb-2.5 text-[15px] font-semibold text-neutral-800">{group.label}</h2>
            <div className="flex flex-row gap-2 overflow-x-auto hide-scrollbar pb-0.5">
              {group.options.map((opt) => {
                const active = selectedVariants[group.key] === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setSelectedVariants((prev) => ({ ...prev, [group.key]: opt }));
                      haptic('light');
                    }}
                    className={`press-fluid shrink-0 rounded-lg border-2 px-4 py-2.5 text-[14px] font-semibold transition-colors ${
                      active
                        ? 'border-ios-blue bg-ios-blue/8 text-ios-blue'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        {specs.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2.5 text-[15px] font-semibold text-neutral-800">Xususiyatlar</h2>
            <div className="overflow-hidden rounded-2xl border border-neutral-100">
              {specs.map((s, i) => (
                <div
                  key={s.label}
                  className={`flex items-center justify-between gap-4 px-4 py-3 text-[14px] ${
                    i % 2 === 0 ? 'bg-neutral-50' : 'bg-white'
                  }`}
                >
                  <span className="font-medium text-neutral-500">{s.label}</span>
                  <span className="text-right font-semibold text-neutral-800">{s.value}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {rawDescription ? (
          <section className="mt-7">
            <h2 className="mb-2.5 text-[15px] font-semibold text-neutral-800">Mahsulot tavsifi</h2>
            {isHtml ? (
              <div
                className="product-description text-[14px] leading-relaxed text-neutral-600"
                dangerouslySetInnerHTML={{ __html: rawDescription }}
              />
            ) : (
              <p className="whitespace-pre-line text-[14px] leading-relaxed text-neutral-600">
                {rawDescription}
              </p>
            )}
          </section>
        ) : null}

        <ProductReviews productId={Number(id)} />
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200/80 bg-white/95 px-4 py-3 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur-md"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}
      >
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-1 py-1">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Kamaytirish"
              className="press-fluid flex h-10 w-10 items-center justify-center rounded-lg text-neutral-700"
            >
              <Minus className="h-5 w-5" strokeWidth={2.25} />
            </button>
            <span className="min-w-[2rem] text-center text-[16px] font-bold tabular-nums text-neutral-900">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
              aria-label="Oshirish"
              className="press-fluid flex h-10 w-10 items-center justify-center rounded-lg text-neutral-700"
            >
              <Plus className="h-5 w-5" strokeWidth={2.25} />
            </button>
          </div>

          <button
            type="button"
            onClick={addToCart}
            disabled={product.stock < 1}
            className="press-fluid flex-1 rounded-xl bg-ios-blue py-3.5 text-[16px] font-semibold text-white shadow-md disabled:opacity-50"
          >
            Savatchaga qo&apos;shish
          </button>
        </div>
      </div>
    </div>
  );
}
