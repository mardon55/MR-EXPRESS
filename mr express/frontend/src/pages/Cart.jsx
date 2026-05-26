import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { api, formatPrice } from '../api';
import { useApp } from '../context/AppContext';
import { useTelegram } from '../hooks/useTelegram';
import { IconCart } from '../components/icons/TabIcons';
import {
  REGION_NAMES,
  getDistrictsByRegion,
} from '../data/uzbekistanRegions';

/** Light mode input — rasmiylashtirish formasi uchun */
const INPUT_CLASS =
  'w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-[15px] text-neutral-900 outline-none transition-fluid placeholder:text-neutral-400 focus:ring-2 focus:ring-ios-blue/25';

const CHECKOUT_SYSTEM_ERROR =
  "Tizimda vaqtincha uzilish, qayta urinib ko'ring";

function getApiBase() {
  const env = import.meta.env.VITE_API_URL;
  if (env && env !== 'same' && env !== '') {
    return env.replace(/\/$/, '');
  }
  return '';
}

function getCheckoutHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const tgUser = WebApp.initDataUnsafe?.user;

  if (tgUser?.id) {
    headers['X-Telegram-User-Id'] = String(tgUser.id);
    if (tgUser.username) headers['X-Telegram-Username'] = tgUser.username;
    if (tgUser.first_name) headers['X-Telegram-First-Name'] = tgUser.first_name;
    if (tgUser.last_name) headers['X-Telegram-Last-Name'] = tgUser.last_name;
  } else if (!WebApp.initData) {
    headers['X-Telegram-User-Id'] = '123456789';
    headers['X-Telegram-First-Name'] = 'Test';
    headers['X-Telegram-Username'] = 'testuser';
  }

  return headers;
}

/** PostgreSQL / backend kutgan buyurtma payload (snake_case kalitlar) */
function buildOrderPayload(form, cartState) {
  return {
    user_name: `${form.firstName} ${form.lastName}`.trim(),
    phone_number: form.phone.trim(),
    region: form.viloyat,
    district: form.tuman,
    cart_items: cartState.items.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
      price: Number(item.product.price),
    })),
    total_price: Math.round(Number(cartState.total) || 0),
  };
}

async function submitOrderPayload(payload) {
  const body = JSON.stringify(payload);
  if (!body || body === 'undefined') {
    throw new Error('Buyurtma maʼlumotlari notoʻgʻri');
  }

  const res = await fetch(`${getApiBase()}/api/orders`, {
    method: 'POST',
    headers: getCheckoutHeaders(),
    body,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err.detail || res.statusText || `HTTP ${res.status}`;
    const error = new Error(detail);
    error.status = res.status;
    throw error;
  }

  return res.json();
}

function getCheckoutErrorMessage(error) {
  const status = error?.status;
  if (status >= 500 || status === 0) return CHECKOUT_SYSTEM_ERROR;
  if (typeof error?.message === 'string' && /HTTP 5\d\d/i.test(error.message)) {
    return CHECKOUT_SYSTEM_ERROR;
  }
  return error?.message || CHECKOUT_SYSTEM_ERROR;
}

/**
 * 2-bosqich — buyurtmani rasmiylashtirish formasi (modal).
 * Foydalanuvchi manzil va aloqa ma'lumotlarini kiritadi.
 */
/** Profildan faqat boshlang'ich qiymat sifatida o'qiladi; buyurtma formasi alohida local state */
function CheckoutFormModal({ open, onClose, onConfirm, submitting, initialContact }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [viloyat, setViloyat] = useState(REGION_NAMES[0]);
  const [tuman, setTuman] = useState(() => getDistrictsByRegion(REGION_NAMES[0])[0] ?? '');
  const [entered, setEntered] = useState(false);
  const { haptic, tg } = useTelegram();

  /** Tanlangan viloyatga bog'liq tumanlar — faqat shu ro'yxat ikkinchi selectda ko'rinadi */
  const tumanlar = useMemo(() => getDistrictsByRegion(viloyat), [viloyat]);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return undefined;
    }
    setFirstName(initialContact?.firstName || '');
    setLastName(initialContact?.lastName || '');
    setPhone(initialContact?.phone || '');
    const defaultViloyat = REGION_NAMES[0];
    setViloyat(defaultViloyat);
    setTuman(getDistrictsByRegion(defaultViloyat)[0] ?? '');
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
    // Faqat modal ochilganda profildan boshlang'ich qiymat — yozish paytida qayta tiklanmaydi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /** Viloyat o'zgarganda tuman avtomatik yangi ro'yxatning birinchi elementiga o'tadi */
  const handleViloyatChange = (yangiViloyat) => {
    setViloyat(yangiViloyat);
    const yangiTumanlar = getDistrictsByRegion(yangiViloyat);
    setTuman(yangiTumanlar[0] ?? '');
  };

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !viloyat || !tuman) {
      tg?.showAlert?.("Barcha maydonlarni to'ldiring");
      return;
    }
    haptic('medium');
    onConfirm({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      viloyat,
      tuman,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <button
        type="button"
        aria-label="Orqaga"
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
          entered ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className={`relative flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[20px] bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-in-out ${
          entered ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-neutral-200" />
        <div className="flex shrink-0 items-center gap-2 border-b border-neutral-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="press-fluid flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-700"
            aria-label="Savatchaga qaytish"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
          </button>
          <h2 className="text-[17px] font-semibold text-neutral-900">Buyurtmani rasmiylashtirish</h2>
        </div>

        <div className="scroll-area min-h-0 flex-1 space-y-3.5 px-4 py-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Ism</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ismingiz"
              className={INPUT_CLASS}
              autoComplete="given-name"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Familiya</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Familiyangiz"
              className={INPUT_CLASS}
              autoComplete="family-name"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Telefon raqami</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+998 90 123 45 67"
              className={INPUT_CLASS}
              autoComplete="tel"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Viloyat</label>
            <select
              value={viloyat}
              onChange={(e) => handleViloyatChange(e.target.value)}
              className={INPUT_CLASS}
            >
              {REGION_NAMES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Tuman</label>
            <select
              value={tuman}
              onChange={(e) => setTuman(e.target.value)}
              className={INPUT_CLASS}
              disabled={!tumanlar.length}
            >
              {tumanlar.map((t) => (
                <option key={`${viloyat}-${t}`} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="shrink-0 border-t border-neutral-100 px-4 pb-[calc(env(safe-area-inset-bottom,16px)+12px)] pt-3">
          <button
            type="submit"
            disabled={submitting}
            className="press-fluid w-full rounded-xl bg-ios-blue py-3.5 text-[17px] font-semibold text-white shadow-glass disabled:opacity-50"
          >
            {submitting ? 'Saqlanmoqda...' : 'Buyurtmani tasdiqlash'}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Savatcha sahifasi — 1-bosqich: mahsulotlar ro'yxati;
 * 2-bosqich: rasmiylashtirish formasi (modal).
 */
export default function Cart() {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { refreshCart, user } = useApp();
  const { haptic, tg } = useTelegram();
  const navigate = useNavigate();

  const load = async () => {
    const data = await api.cart();
    setCart(data);
    await refreshCart();
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const updateQty = async (productId, qty) => {
    haptic('light');
    await api.updateCart(productId, qty);
    await load();
  };

  const openCheckout = () => {
    if (!cart.items.length) return;
    haptic('light');
    setCheckoutOpen(true);
  };

  const confirmCheckout = async (form) => {
    setSubmitting(true);
    haptic('medium');

    try {
      const payload = buildOrderPayload(form, cart);
      const order = await submitOrderPayload(payload);

      haptic('success');
      tg?.showAlert?.(`Buyurtma #${order.order_id} qabul qilindi!`);
      setCheckoutOpen(false);
      await load();

      navigate('/profile', { state: { openSection: 'orders' } });
    } catch (e) {
      haptic('error');
      tg?.showAlert?.(getCheckoutErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (!cart.items.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 pb-nav-safe">
        <div className="glass rounded-squircle-lg px-10 py-8 text-center shadow-glass-lg">
          <IconCart active={false} />
          <h2 className="mt-4 text-xl font-bold text-neutral-900">Savatcha bo&apos;sh</h2>
          <p className="mt-2 text-sm text-ios-muted">Katalogdan mahsulot qo&apos;shing</p>
          <button
            type="button"
            onClick={() => navigate('/catalog')}
            className="press-fluid mt-6 rounded-squircle bg-ios-blue px-8 py-3.5 text-[15px] font-semibold text-white shadow-glass"
          >
            Katalogga o&apos;tish
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`scroll-area h-full px-4 pb-[calc(9.5rem+env(safe-area-inset-bottom,20px))] pt-3 ${
          checkoutOpen ? 'pointer-events-none opacity-0' : ''
        }`}
        aria-hidden={checkoutOpen}
      >
        <h1 className="mb-5 text-[28px] font-bold tracking-tight text-neutral-900">Savatcha</h1>

        <div className="space-y-3.5">
          {cart.items.map((item) => (
            <div
              key={item.cart_id}
              className="glass flex gap-3.5 rounded-squircle p-3.5 shadow-glass"
            >
              <img
                src={item.product.image_url}
                alt=""
                className="h-[76px] w-[76px] rounded-squircle object-cover"
              />
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <h3 className="line-clamp-2 text-sm font-semibold text-neutral-800">
                  {item.product.name}
                </h3>
                <p className="text-sm font-bold text-ios-blue">
                  {formatPrice(item.product.price)}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateQty(item.product.id, item.quantity - 1)}
                    className="press-fluid glass-subtle flex h-8 w-8 items-center justify-center rounded-full text-lg font-medium text-neutral-700"
                  >
                    −
                  </button>
                  <span className="w-4 text-center text-sm font-semibold">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQty(item.product.id, item.quantity + 1)}
                    className="press-fluid glass-subtle flex h-8 w-8 items-center justify-center rounded-full text-lg font-medium text-neutral-700"
                  >
                    +
                  </button>
                </div>
              </div>
              <p className="shrink-0 text-sm font-bold text-neutral-800">
                {formatPrice(item.subtotal)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {!checkoutOpen && (
        <div className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom,20px))] left-0 right-0 mx-4 w-[calc(100%-32px)]">
          <div className="glass-float p-4">
            <div className="mb-3 flex justify-between">
              <span className="text-sm font-medium text-ios-muted">Jami</span>
              <span className="text-xl font-bold tracking-tight text-neutral-900">
                {formatPrice(cart.total)}
              </span>
            </div>
            <button
              type="button"
              disabled={submitting}
              onClick={openCheckout}
              className="press-fluid w-full rounded-squircle bg-ios-blue py-3.5 text-[17px] font-semibold text-white shadow-glass disabled:opacity-50"
            >
              Buyurtmani rasmiylashtirish
            </button>
          </div>
        </div>
      )}

      <CheckoutFormModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onConfirm={confirmCheckout}
        submitting={submitting}
        initialContact={{
          firstName: user?.first_name,
          lastName: user?.last_name,
          phone: user?.phone,
        }}
      />
    </>
  );
}
