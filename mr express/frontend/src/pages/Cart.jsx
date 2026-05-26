import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CreditCard, Lock } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { api, formatPrice } from '../api';
import { useApp } from '../context/AppContext';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { useTelegram } from '../hooks/useTelegram';
import { IconCart } from '../components/icons/TabIcons';
import {
  REGION_NAMES,
  getDistrictsByRegion,
} from '../data/uzbekistanRegions';

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

function formatCardNumber(val) {
  return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(val) {
  const digits = val.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits;
}

/** 3-bosqich — to'lov karta modali */
function PaymentModal({ open, onClose, onPay, submitting, total }) {
  const [entered, setEntered] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const { haptic, tg } = useTelegram();

  useEffect(() => {
    if (!open) { setEntered(false); return undefined; }
    setCardNumber(''); setExpiry(''); setCvv(''); setCardHolder('');
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const digits = cardNumber.replace(/\s/g, '');
    if (digits.length < 16) { tg?.showAlert?.('Karta raqamini to\'liq kiriting'); return; }
    if (expiry.length < 5) { tg?.showAlert?.('Amal qilish muddatini kiriting (OO/YY)'); return; }
    if (cvv.length < 3) { tg?.showAlert?.('CVV kodni kiriting'); return; }
    if (!cardHolder.trim()) { tg?.showAlert?.('Karta egasining ismini kiriting'); return; }
    haptic('medium');
    onPay();
  };

  const lastFour = cardNumber.replace(/\s/g, '').slice(-4) || '••••';
  const displayNum = cardNumber || '•••• •••• •••• ••••';

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end">
      <button
        type="button"
        aria-label="Yopish"
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${entered ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className={`relative flex max-h-[94dvh] flex-col overflow-hidden rounded-t-[24px] bg-[#f2f2f7] shadow-[0_-8px_40px_rgba(0,0,0,0.18)] transition-transform duration-300 ease-in-out ${entered ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-neutral-300" />

        <div className="flex shrink-0 items-center gap-2 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="press-fluid flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-neutral-700 shadow-sm"
            aria-label="Orqaga"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
          </button>
          <div>
            <h2 className="text-[17px] font-semibold text-neutral-900">To'lov</h2>
            <p className="text-xs text-neutral-500">Karta ma'lumotlarini kiriting</p>
          </div>
          <div className="ml-auto flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1">
            <Lock className="h-3 w-3 text-green-600" />
            <span className="text-[11px] font-semibold text-green-700">Xavfsiz</span>
          </div>
        </div>

        {/* Virtual karta ko'rinishi */}
        <div className="mx-4 mb-4 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-5 shadow-xl">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-medium uppercase tracking-widest text-white/50">Bank kartasi</span>
            </div>
            <CreditCard className="h-8 w-8 text-white/60" />
          </div>
          <p className="mb-5 font-mono text-[18px] font-semibold tracking-[0.15em] text-white">
            {displayNum}
          </p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-white/40">Karta egasi</p>
              <p className="text-sm font-semibold uppercase tracking-wide text-white">
                {cardHolder.trim() || 'FULL NAME'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-wider text-white/40">Muddati</p>
              <p className="font-mono text-sm font-semibold text-white">{expiry || 'MM/YY'}</p>
            </div>
          </div>
        </div>

        <div className="scroll-area min-h-0 flex-1 space-y-3 px-4 pb-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Karta raqami</label>
            <input
              type="tel"
              inputMode="numeric"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="0000 0000 0000 0000"
              className={INPUT_CLASS + ' font-mono tracking-wider'}
              maxLength={19}
              autoComplete="cc-number"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Amal qilish muddati</label>
              <input
                type="tel"
                inputMode="numeric"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                placeholder="OO/YY"
                className={INPUT_CLASS + ' font-mono'}
                maxLength={5}
                autoComplete="cc-exp"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">CVV</label>
              <input
                type="tel"
                inputMode="numeric"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                placeholder="•••"
                className={INPUT_CLASS + ' font-mono'}
                maxLength={3}
                autoComplete="cc-csc"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Karta egasining ismi</label>
            <input
              type="text"
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
              placeholder="FULL NAME"
              className={INPUT_CLASS + ' uppercase tracking-wider'}
              autoComplete="cc-name"
            />
          </div>
        </div>

        <div className="shrink-0 px-4 pb-[calc(env(safe-area-inset-bottom,16px)+12px)] pt-3">
          <div className="mb-3 flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
            <span className="text-sm font-medium text-neutral-600">Jami to'lov</span>
            <span className="text-lg font-bold text-neutral-900">{formatPrice(total)}</span>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="press-fluid w-full rounded-xl bg-ios-blue py-3.5 text-[17px] font-semibold text-white shadow-glass disabled:opacity-50"
          >
            {submitting ? 'To\'lov amalga oshirilmoqda...' : `To'lash — ${formatPrice(total)}`}
          </button>
        </div>
      </form>
    </div>
  );
}

/** 2-bosqich — manzil va aloqa ma'lumotlari formasi */
function CheckoutFormModal({ open, onClose, onConfirm, initialContact }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [viloyat, setViloyat] = useState(REGION_NAMES[0]);
  const [tuman, setTuman] = useState(() => getDistrictsByRegion(REGION_NAMES[0])[0] ?? '');
  const [entered, setEntered] = useState(false);
  const { haptic, tg } = useTelegram();

  const tumanlar = useMemo(() => getDistrictsByRegion(viloyat), [viloyat]);

  useEffect(() => {
    if (!open) { setEntered(false); return undefined; }
    setFirstName(initialContact?.firstName || '');
    setLastName(initialContact?.lastName || '');
    setPhone(initialContact?.phone || '');
    const defaultViloyat = REGION_NAMES[0];
    setViloyat(defaultViloyat);
    setTuman(getDistrictsByRegion(defaultViloyat)[0] ?? '');
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
    onConfirm({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(), viloyat, tuman });
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <button
        type="button"
        aria-label="Orqaga"
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${entered ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className={`relative flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[20px] bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-in-out ${entered ? 'translate-y-0' : 'translate-y-full'}`}
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
          <div>
            <h2 className="text-[17px] font-semibold text-neutral-900">Yetkazib berish ma'lumotlari</h2>
            <p className="text-xs text-neutral-400">1-qadam: Manzil va aloqa</p>
          </div>
        </div>

        <div className="scroll-area min-h-0 flex-1 space-y-3.5 px-4 py-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Ism</label>
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ismingiz" className={INPUT_CLASS} autoComplete="given-name" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Familiya</label>
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Familiyangiz" className={INPUT_CLASS} autoComplete="family-name" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Telefon raqami</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 123 45 67" className={INPUT_CLASS} autoComplete="tel" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Viloyat</label>
            <select value={viloyat} onChange={(e) => handleViloyatChange(e.target.value)} className={INPUT_CLASS}>
              {REGION_NAMES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Tuman</label>
            <select value={tuman} onChange={(e) => setTuman(e.target.value)} className={INPUT_CLASS} disabled={!tumanlar.length}>
              {tumanlar.map((t) => <option key={`${viloyat}-${t}`} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="shrink-0 border-t border-neutral-100 px-4 pb-[calc(env(safe-area-inset-bottom,16px)+12px)] pt-3">
          <button
            type="submit"
            className="press-fluid w-full rounded-xl bg-ios-blue py-3.5 text-[17px] font-semibold text-white shadow-glass"
          >
            Keyingi: To'lov →
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Cart() {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [pendingForm, setPendingForm] = useState(null);
  const { refreshCart, user } = useApp();
  const { haptic, tg } = useTelegram();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    const data = await api.cart();
    setCart(data);
    await refreshCart();
  }, [refreshCart]);

  useEffect(() => { load().catch(console.error); }, [load]);
  useAutoRefresh(load, 20_000);

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

  /** Forma to'ldirilgandan so'ng — to'lov ekraniga o'tish */
  const handleFormConfirm = (form) => {
    setPendingForm(form);
    setCheckoutOpen(false);
    requestAnimationFrame(() => setPaymentOpen(true));
  };

  /** Orqaga: to'lovdan formaga qaytish */
  const handlePaymentBack = () => {
    setPaymentOpen(false);
    requestAnimationFrame(() => setCheckoutOpen(true));
  };

  /** To'lov tugmasi bosilganda buyurtmani yuborish */
  const handlePay = async () => {
    if (!pendingForm) return;
    setSubmitting(true);
    haptic('medium');

    try {
      const payload = buildOrderPayload(pendingForm, cart);
      const order = await submitOrderPayload(payload);

      haptic('success');
      setPaymentOpen(false);
      tg?.showAlert?.(`✅ Buyurtma #${order.order_id} qabul qilindi!`);
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
          <button type="button" onClick={() => navigate('/catalog')} className="press-fluid mt-6 rounded-squircle bg-ios-blue px-8 py-3.5 text-[15px] font-semibold text-white shadow-glass">
            Katalogga o&apos;tish
          </button>
        </div>
      </div>
    );
  }

  const anyModalOpen = checkoutOpen || paymentOpen;

  return (
    <>
      <div
        className={`scroll-area h-full px-4 pb-[calc(9.5rem+env(safe-area-inset-bottom,20px))] pt-3 ${anyModalOpen ? 'pointer-events-none opacity-0' : ''}`}
        aria-hidden={anyModalOpen}
      >
        <h1 className="mb-5 text-[28px] font-bold tracking-tight text-neutral-900">Savatcha</h1>
        <div className="space-y-3.5">
          {cart.items.map((item) => (
            <div key={item.cart_id} className="glass flex gap-3.5 rounded-squircle p-3.5 shadow-glass">
              <img src={item.product.image_url} alt="" className="h-[76px] w-[76px] rounded-squircle object-cover" />
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <h3 className="line-clamp-2 text-sm font-semibold text-neutral-800">{item.product.name}</h3>
                <p className="text-sm font-bold text-ios-blue">{formatPrice(item.product.price)}</p>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => updateQty(item.product.id, item.quantity - 1)} className="press-fluid glass-subtle flex h-8 w-8 items-center justify-center rounded-full text-lg font-medium text-neutral-700">−</button>
                  <span className="w-4 text-center text-sm font-semibold">{item.quantity}</span>
                  <button type="button" onClick={() => updateQty(item.product.id, item.quantity + 1)} className="press-fluid glass-subtle flex h-8 w-8 items-center justify-center rounded-full text-lg font-medium text-neutral-700">+</button>
                </div>
              </div>
              <p className="shrink-0 text-sm font-bold text-neutral-800">{formatPrice(item.subtotal)}</p>
            </div>
          ))}
        </div>
      </div>

      {!anyModalOpen && (
        <div className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom,20px))] left-0 right-0 mx-4 w-[calc(100%-32px)]">
          <div className="glass-float p-4">
            <div className="mb-3 flex justify-between">
              <span className="text-sm font-medium text-ios-muted">Jami</span>
              <span className="text-xl font-bold tracking-tight text-neutral-900">{formatPrice(cart.total)}</span>
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
        onConfirm={handleFormConfirm}
        initialContact={{ firstName: user?.first_name, lastName: user?.last_name, phone: user?.phone }}
      />

      <PaymentModal
        open={paymentOpen}
        onClose={handlePaymentBack}
        onPay={handlePay}
        submitting={submitting}
        total={cart.total}
      />
    </>
  );
}
